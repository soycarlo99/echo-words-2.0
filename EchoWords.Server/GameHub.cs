using Microsoft.AspNetCore.SignalR;

namespace EchoWords.Server;

public class GameHub : Hub
{
    private readonly ILogger<GameHub> _logger;
    
    public GameHub(ILogger<GameHub> logger)
    {
        _logger = logger;
    }

    // Join a lobby
    public async Task JoinLobby(string lobbyId)
    {
        try
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, lobbyId);
            _logger.LogInformation("Client {ConnectionId} joined lobby {LobbyId}", Context.ConnectionId, lobbyId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining lobby {LobbyId}", lobbyId);
            throw;
        }
    }

    // Leave a lobby
    public async Task LeaveLobby(string lobbyId)
    {
        try
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, lobbyId);
            _logger.LogInformation("Client {ConnectionId} left lobby {LobbyId}", Context.ConnectionId, lobbyId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving lobby {LobbyId}", lobbyId);
            throw;
        }
    }

    // Update game difficulty settings
    public async Task BroadcastDifficulty(string roomId, string difficulty)
    {
        await Clients.Group(roomId).SendAsync("ReceiveDifficultyUpdate", difficulty);
    }

    // Update game state
    public async Task BroadcastGameState(string lobbyId, GameState gameState)
    {
        await Clients.Group(lobbyId).SendAsync("ReceiveGameState", gameState);
    }

    // Send a user's input to other players
    public async Task BroadcastUserInput(string lobbyId, int index, string input)
    {
        await Clients.OthersInGroup(lobbyId).SendAsync("ReceiveUserInput", index, input);
    }

    // Broadcast an animation effect
    public async Task BroadcastAnimation(string lobbyId, int index, string animationType)
    {
        await Clients.Group(lobbyId).SendAsync("ReceiveAnimation", index, animationType);
    }

    // Synchronize the game timer
    public async Task BroadcastTimerSync(string lobbyId, double remainingTime)
    {
        await Clients.Group(lobbyId).SendAsync("ReceiveTimerSync", remainingTime);
    }

    // Start the game timer
    public async Task BroadcastTimerStart(string lobbyId, double initialTime)
    {
        await Clients.Group(lobbyId).SendAsync("ReceiveTimerStart", initialTime);
    }

    // Pause the game timer
    public async Task BroadcastTimerPause(string lobbyId)
    {
        await Clients.Group(lobbyId).SendAsync("ReceiveTimerPause");
    }

    // Resume the game timer
    public async Task BroadcastTimerResume(string lobbyId, double remainingTime)
    {
        await Clients.Group(lobbyId).SendAsync("ReceiveTimerResume", remainingTime);
    }

    // Start the game
    public async Task BroadcastGameStart(string lobbyId)
    {
        await Clients.Group(lobbyId).SendAsync("ReceiveGameStart");
    }

    // Redirect players to the game page
    public async Task StartGame(string roomId)
    {
        await Clients.Group(roomId).SendAsync("RedirectToGame");
    }

    // Update a player's avatar
    public async Task UpdateAvatar(string lobbyId, string username, string newSeed)
    {
        await Clients.Group(lobbyId).SendAsync("AvatarUpdated", username, newSeed);
    }
    
    // Handle disconnection
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client {ConnectionId} disconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
