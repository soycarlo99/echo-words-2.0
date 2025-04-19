namespace EchoWords.Server;

// Player information
public class Player
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? ClientId { get; set; }
    public string? LobbyId { get; set; }
    public string? AvatarSeed { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

// Lobby information
public class Lobby
{
    public string LobbyId { get; set; } = string.Empty;
    public List<string> Players { get; set; } = new List<string>();
    public DateTime LastActive { get; set; } = DateTime.UtcNow;
}

// For word submissions
public class WordRequest
{
    public string Word { get; set; } = string.Empty;
    public string? LobbyId { get; set; }
}

// Game settings by difficulty
public class GameSettings
{
    public double InitialTime { get; set; }
    public double CorrectWordBonus { get; set; }
    public double RewriteWordBonus { get; set; }
}

// Game state
public class GameState
{
    public List<string> WordList { get; set; } = new List<string>();
    public int CurrentPlayerIndex { get; set; } = 0;
    public double RemainingSeconds { get; set; } = 0;
    public string LastWord { get; set; } = string.Empty;
    public Dictionary<int, int> Scores { get; set; } = new Dictionary<int, int>();
}

// Player match results
public class PlayerResult
{
    public string Username { get; set; } = string.Empty;
    public int Score { get; set; }
    public int WordsSubmitted { get; set; }
    public int Accuracy { get; set; }
}

// Game match results
public class MatchResults
{
    public List<PlayerResult> Players { get; set; } = new List<PlayerResult>();
    public int TotalWords { get; set; }
    public int GameDuration { get; set; } = 300;
}
