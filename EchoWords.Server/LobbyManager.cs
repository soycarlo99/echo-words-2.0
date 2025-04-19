namespace EchoWords.Server;

public static class LobbyManager
{
    private static readonly Dictionary<string, Lobby> _lobbies = new();
    private static readonly Random _random = new();
    
    // Check if a lobby exists
    public static bool Exists(string lobbyId) => _lobbies.ContainsKey(lobbyId);
    
    // Add a new lobby
    public static void AddLobby(string lobbyId)
    {
        if (!_lobbies.ContainsKey(lobbyId))
        {
            _lobbies[lobbyId] = new Lobby { LobbyId = lobbyId, LastActive = DateTime.UtcNow };
        }
    }
    
    // Get a specific lobby
    public static Lobby? GetLobby(string lobbyId)
    {
        _lobbies.TryGetValue(lobbyId, out var lobby);
        return lobby;
    }
    
    // Generate a unique lobby code
    public static string GenerateLobbyCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        string lobbyId;
        
        do
        {
            lobbyId = new string(
                Enumerable.Repeat(chars, 4)
                    .Select(s => s[_random.Next(s.Length)])
                    .ToArray()
            );
        } while (Exists(lobbyId));
        
        return lobbyId;
    }
    
    // Clean up inactive lobbies (can be called periodically)
    public static void CleanupInactiveLobbies(TimeSpan maxInactiveTime)
    {
        var cutoffTime = DateTime.UtcNow - maxInactiveTime;
        var inactiveLobbies = _lobbies.Where(l => l.Value.LastActive < cutoffTime)
            .Select(l => l.Key)
            .ToList();
            
        foreach (var lobbyId in inactiveLobbies)
        {
            _lobbies.Remove(lobbyId);
        }
    }
}
