using System.Security.Cryptography;
using EchoWords.Server;
using Microsoft.AspNetCore.SignalR;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure PostgreSQL connection
var host = builder.Configuration["ECHO_PG_HOST"] ?? "localhost";
var port = builder.Configuration["ECHO_PG_PORT"] ?? "5432";
var username = builder.Configuration["ECHO_PG_USER"] ?? "postgres";
var database = builder.Configuration["ECHO_DB_NAME"] ?? "echowords";
var password = builder.Configuration["ECHO_PG_PASSWORD"] ?? "postgres";

var connectionString =
    $"Host={host};Port={port};Username={username};Password={password};Database={database}";
var dataSource = NpgsqlDataSource.Create(connectionString);

builder.Services.AddSingleton(dataSource);

// Change from scoped to singleton to avoid the scope issue
builder.Services.AddSingleton<GameService>();

var app = builder.Build();

// Initialize database
await DatabaseSetup.InitializeDatabaseAsync(dataSource, app.Logger);
await DatabaseSetup.SeedDatabaseAsync(dataSource, app.Logger);

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.UseDefaultFiles(); // Serve default files like index.html
app.UseStaticFiles(); // Serve static files from wwwroot

// Client ID cookie middleware
app.Use(
    async (context, next) =>
    {
        const string clientIdCookieName = "ClientId";

        if (!context.Request.Cookies.TryGetValue(clientIdCookieName, out var clientId))
        {
            clientId = GenerateUniqueClientId();
            context.Response.Cookies.Append(
                clientIdCookieName,
                clientId,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = app.Environment.IsProduction(),
                    SameSite = SameSiteMode.Lax,
                    MaxAge = TimeSpan.FromDays(365),
                }
            );
        }

        await next();
    }
);

// Map endpoints
app.MapHub<GameHub>("/gameHub");
app.MapControllers();

// Add new word
app.MapPost(
    "/new-word",
    async (HttpContext context, GameService gameService) =>
    {
        var requestBody = await context.Request.ReadFromJsonAsync<WordRequest>();
        if (requestBody?.Word is null)
        {
            return Results.BadRequest("Word is required.");
        }

        string word = requestBody.Word.ToLower();
        string? clientId = context.Request.Cookies["ClientId"];

        if (clientId is null)
        {
            return Results.BadRequest("Client ID is required.");
        }

        bool success = await gameService.AddWordAsync(word, clientId);
        return success ? Results.Ok("Word added successfully.") : Results.StatusCode(500);
    }
);

// Add new player
app.MapPost(
    "/new-player",
    async (HttpContext context, GameService gameService) =>
    {
        var requestBody = await context.Request.ReadFromJsonAsync<WordRequest>();
        if (requestBody?.Word is null)
        {
            app.Logger.LogWarning("Bad request: Missing player name.");
            return Results.BadRequest("Player name is required.");
        }

        string newPlayer = requestBody.Word.ToLower();
        string? lobbyId = requestBody.LobbyId; // LobbyId can be null
        string? clientId = context.Request.Cookies["ClientId"];

        bool success = await gameService.AddOrUpdatePlayerAsync(newPlayer, clientId, lobbyId);
        return success ? Results.Ok("New player added successfully.") : Results.StatusCode(500);
    }
);

// Create new lobby
app.MapPost(
    "/create-lobby",
    () =>
    {
        string lobbyId = LobbyManager.GenerateLobbyCode();
        LobbyManager.AddLobby(lobbyId);
        return Results.Ok(new { lobbyId });
    }
);

// Get players in a lobby
app.MapGet(
    "/lobby/{lobbyId}/players",
    async (string lobbyId, GameService gameService) =>
    {
        var players = await gameService.GetPlayersByLobbyAsync(lobbyId);
        return Results.Ok(players);
    }
);

// Update player's lobby
app.MapPost(
    "/update-player-lobby",
    async (HttpContext context, GameService gameService) =>
    {
        var requestBody = await context.Request.ReadFromJsonAsync<WordRequest>();
        if (requestBody?.LobbyId is null)
        {
            return Results.BadRequest("Lobby ID is required.");
        }

        string lobbyId = requestBody.LobbyId;
        string? clientId = context.Request.Cookies["ClientId"];

        if (clientId is null)
        {
            return Results.BadRequest("Client ID missing.");
        }

        var player = await gameService.UpdatePlayerLobbyAsync(lobbyId, clientId);
        return player != null ? Results.Ok("Player lobby updated.") : Results.StatusCode(500);
    }
);

// Submit match results
app.MapPost(
    "/lobby/{lobbyId}/submit-results",
    async (string lobbyId, HttpContext context, GameService gameService) =>
    {
        try
        {
            var results = await context.Request.ReadFromJsonAsync<List<PlayerResult>>();
            if (results == null)
                return Results.BadRequest("No results provided");

            bool success = await gameService.SubmitMatchResultsAsync(lobbyId, results);
            return success ? Results.Ok() : Results.StatusCode(500);
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Error submitting match results");
            return Results.StatusCode(500);
        }
    }
);

// Get match results
app.MapGet(
    "/lobby/{lobbyId}/results",
    async (string lobbyId, GameService gameService) =>
    {
        try
        {
            var results = await gameService.GetMatchResultsAsync(lobbyId);
            return results != null ? Results.Ok(results) : Results.StatusCode(500);
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Error fetching match results");
            return Results.StatusCode(500);
        }
    }
);

// Database test endpoint
app.MapGet(
    "/api/test",
    async (NpgsqlDataSource dataSource) =>
    {
        try
        {
            var tables = new List<string>();
            await using var connection = await dataSource.OpenConnectionAsync();
            await using var command = connection.CreateCommand();
            command.CommandText =
                @"
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;";

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                tables.Add(reader.GetString(0));
            }

            return Results.Ok(new { tables, count = tables.Count });
        }
        catch (Exception ex)
        {
            return Results.Problem(detail: ex.ToString(), title: "Database Error", statusCode: 500);
        }
    }
);

// Fallback route for SPA
app.MapFallbackToFile("index.html");

// Helper function to generate unique client ID
static string GenerateUniqueClientId()
{
    using var rng = RandomNumberGenerator.Create();
    var bytes = new byte[16];
    rng.GetBytes(bytes);
    return Convert.ToBase64String(bytes);
}

try
{
    app.Run();
}
catch (Exception ex)
{
    app.Logger.LogCritical(ex, "Unhandled exception in application");
}
