using Microsoft.AspNetCore.SignalR;
using Npgsql;

namespace EchoWords.Server;

public class GameService
{
    private readonly NpgsqlDataSource _db;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly ILogger<GameService> _logger;

    public GameService(
        NpgsqlDataSource dataSource,
        IHubContext<GameHub> hubContext,
        ILogger<GameService> logger
    )
    {
        _db = dataSource;
        _hubContext = hubContext;
        _logger = logger;
    }

    // Add a new word to the database
    public async Task<bool> AddWordAsync(string word, string clientId)
    {
        try
        {
            await using var cmd = _db.CreateCommand(
                "INSERT INTO playerwords (wordinput, clientid) VALUES ($1, $2)"
            );
            cmd.Parameters.AddWithValue(word.ToLower());
            cmd.Parameters.AddWithValue(clientId);

            int rowsAffected = await cmd.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding new word: {Word}", word);
            return false;
        }
    }

    // Add a new player or update existing player
    public async Task<bool> AddOrUpdatePlayerAsync(
        string username,
        string? clientId,
        string? lobbyId = null
    )
    {
        try
        {
            if (string.IsNullOrEmpty(clientId))
            {
                _logger.LogError("Client ID is null");
                return false;
            }

            string avatarSeed = Guid.NewGuid().ToString();

            await using var cmd = _db.CreateCommand(
                @"
                INSERT INTO players (username, clientid, lobbyid, avatarseed)
                VALUES ($1, $2, $3, $4)
                RETURNING id"
            );

            cmd.Parameters.AddWithValue(username.ToLower());
            cmd.Parameters.AddWithValue(clientId);
            cmd.Parameters.AddWithValue(lobbyId ?? "NONE");
            cmd.Parameters.AddWithValue(avatarSeed);

            var result = await cmd.ExecuteScalarAsync();
            if (result == null)
            {
                _logger.LogError("Failed to get new player ID");
                return false;
            }

            int newPlayerId = Convert.ToInt32(result);

            if (newPlayerId > 0 && !string.IsNullOrEmpty(lobbyId))
            {
                // Notify other players in the lobby
                var player = new Player
                {
                    Id = newPlayerId,
                    Username = username,
                    ClientId = clientId,
                    LobbyId = lobbyId,
                    AvatarSeed = avatarSeed,
                    JoinedAt = DateTime.UtcNow,
                };

                await _hubContext.Clients.Group(lobbyId).SendAsync("PlayerJoined", player);
                return true;
            }

            return newPlayerId > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding new player: {Username}", username);
            return false;
        }
    }

    // Update a player's lobby
    public async Task<Player?> UpdatePlayerLobbyAsync(string lobbyId, string clientId)
    {
        try
        {
            // First try to update existing player
            await using var cmd = _db.CreateCommand(
                @"
                UPDATE players 
                SET lobbyid = $1 
                WHERE id = (
                    SELECT id 
                    FROM players 
                    WHERE clientid = $2 
                    ORDER BY joined_at DESC 
                    LIMIT 1
                )
                RETURNING id, username, clientid, lobbyid, avatarseed, joined_at"
            );

            cmd.Parameters.AddWithValue(lobbyId);
            cmd.Parameters.AddWithValue(clientId);

            Player? updatedPlayer = null;
            await using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                updatedPlayer = new Player
                {
                    Id = reader.GetInt32(0),
                    Username = reader.GetString(1),
                    ClientId = reader.IsDBNull(2) ? null : reader.GetString(2),
                    LobbyId = reader.GetString(3),
                    AvatarSeed = reader.IsDBNull(4) ? null : reader.GetString(4),
                    JoinedAt = reader.GetDateTime(5),
                };

                await _hubContext.Clients.Group(lobbyId).SendAsync("PlayerJoined", updatedPlayer);
                return updatedPlayer;
            }

            // If no existing player, create a new one with the latest username
            await using var nameCmd = _db.CreateCommand(
                @"
                SELECT username, avatarseed 
                FROM players 
                WHERE clientid = $1 
                ORDER BY joined_at DESC 
                LIMIT 1"
            );

            nameCmd.Parameters.AddWithValue(clientId);
            string username = "DefaultPlayer";
            string? avatarSeed = null;

            await using var nameReader = await nameCmd.ExecuteReaderAsync();
            if (await nameReader.ReadAsync())
            {
                username = nameReader.GetString(0);
                avatarSeed = nameReader.IsDBNull(1) ? null : nameReader.GetString(1);
            }

            // Insert new player with existing username
            await using var insertCmd = _db.CreateCommand(
                @"
                INSERT INTO players (username, clientid, lobbyid, avatarseed) 
                VALUES ($1, $2, $3, $4)
                RETURNING id, username, clientid, lobbyid, avatarseed, joined_at"
            );

            insertCmd.Parameters.AddWithValue(username);
            insertCmd.Parameters.AddWithValue(clientId);
            insertCmd.Parameters.AddWithValue(lobbyId);
            insertCmd.Parameters.AddWithValue(avatarSeed ?? Guid.NewGuid().ToString());

            Player? newPlayer = null;
            await using var insertReader = await insertCmd.ExecuteReaderAsync();

            if (await insertReader.ReadAsync())
            {
                newPlayer = new Player
                {
                    Id = insertReader.GetInt32(0),
                    Username = insertReader.GetString(1),
                    ClientId = insertReader.IsDBNull(2) ? null : insertReader.GetString(2),
                    LobbyId = insertReader.GetString(3),
                    AvatarSeed = insertReader.IsDBNull(4) ? null : insertReader.GetString(4),
                    JoinedAt = insertReader.GetDateTime(5),
                };

                await _hubContext.Clients.Group(lobbyId).SendAsync("PlayerJoined", newPlayer);
                return newPlayer;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating player lobby");
            return null;
        }
    }

    // Get players by lobby
    public async Task<List<Player>> GetPlayersByLobbyAsync(string lobbyId)
    {
        var players = new List<Player>();

        try
        {
            await using var cmd = _db.CreateCommand(
                "SELECT id, username, clientid, lobbyid, avatarseed, joined_at FROM players WHERE lobbyid = $1"
            );

            cmd.Parameters.AddWithValue(lobbyId);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                players.Add(
                    new Player
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(1),
                        ClientId = reader.IsDBNull(2) ? null : reader.GetString(2),
                        LobbyId = reader.GetString(3),
                        AvatarSeed = reader.IsDBNull(4) ? null : reader.GetString(4),
                        JoinedAt = reader.GetDateTime(5),
                    }
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving players for lobby {LobbyId}", lobbyId);
        }

        return players;
    }

    // Submit match results
    public async Task<bool> SubmitMatchResultsAsync(string lobbyId, List<PlayerResult> results)
    {
        try
        {
            foreach (var result in results)
            {
                await using var cmd = _db.CreateCommand(
                    @"
                    INSERT INTO player_match_results (player_id, score, words_submitted, accuracy)
                    SELECT id, @score, @wordsSubmitted, @accuracy
                    FROM players 
                    WHERE username = @username AND lobbyid = @lobbyId"
                );

                cmd.Parameters.AddWithValue("@score", result.Score);
                cmd.Parameters.AddWithValue("@wordsSubmitted", result.WordsSubmitted);
                cmd.Parameters.AddWithValue("@accuracy", result.Accuracy);
                cmd.Parameters.AddWithValue("@username", result.Username);
                cmd.Parameters.AddWithValue("@lobbyId", lobbyId);

                await cmd.ExecuteNonQueryAsync();
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting match results for lobby {LobbyId}", lobbyId);
            return false;
        }
    }

    // Get match results
    public async Task<MatchResults?> GetMatchResultsAsync(string lobbyId)
    {
        try
        {
            var results = new MatchResults();

            await using var cmd = _db.CreateCommand(
                @"
                SELECT p.username, p.avatarseed, 
                    COALESCE(pw.score, 0) as score,
                    COALESCE(pw.words_submitted, 0) as words_submitted,
                    COALESCE(pw.accuracy, 0) as accuracy
                FROM players p
                LEFT JOIN player_match_results pw ON p.id = pw.player_id
                WHERE p.lobbyid = $1"
            );

            cmd.Parameters.AddWithValue(lobbyId);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                results.Players.Add(
                    new PlayerResult
                    {
                        Username = reader.GetString(0),
                        Score = reader.GetInt32(2),
                        WordsSubmitted = reader.GetInt32(3),
                        Accuracy = reader.GetInt32(4),
                    }
                );

                results.TotalWords += reader.GetInt32(3);
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching match results for lobby {LobbyId}", lobbyId);
            return null;
        }
    }

    // Get difficulty settings
    public GameSettings GetDifficultySettings(string difficulty)
    {
        return difficulty switch
        {
            "easy" => new GameSettings
            {
                InitialTime = 60,
                CorrectWordBonus = 3,
                RewriteWordBonus = 1.5,
            },
            "hard" => new GameSettings
            {
                InitialTime = 15,
                CorrectWordBonus = 1,
                RewriteWordBonus = 0.5,
            },
            "extreme" => new GameSettings
            {
                InitialTime = 10,
                CorrectWordBonus = 0.5,
                RewriteWordBonus = 0.25,
            },
            _ => new GameSettings
            {
                InitialTime = 30,
                CorrectWordBonus = 2,
                RewriteWordBonus = 1,
            }, // medium (default)
        };
    }
}
