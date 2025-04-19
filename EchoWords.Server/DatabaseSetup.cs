using Npgsql;

namespace EchoWords.Server;

public static class DatabaseSetup
{
    public static async Task InitializeDatabaseAsync(NpgsqlDataSource dataSource, ILogger logger)
    {
        try
        {
            // Create tables
            await CreateTablesAsync(dataSource, logger);
            logger.LogInformation("Database tables initialized successfully");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error initializing database");
            throw;
        }
    }

    private static async Task CreateTablesAsync(NpgsqlDataSource dataSource, ILogger logger)
    {
        // Create tables if they don't exist
        await using var cmd = dataSource.CreateCommand(
            @"
            -- Players table
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                clientid VARCHAR(100),
                lobbyid VARCHAR(10),
                avatarseed VARCHAR(100),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Player words table
            CREATE TABLE IF NOT EXISTS playerwords (
                id SERIAL PRIMARY KEY,
                wordinput VARCHAR(50) NOT NULL,
                clientid VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Game dictionary words
            CREATE TABLE IF NOT EXISTS words (
                id SERIAL PRIMARY KEY,
                word VARCHAR(50) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Player match results
            CREATE TABLE IF NOT EXISTS player_match_results (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id),
                score INTEGER DEFAULT 0,
                words_submitted INTEGER DEFAULT 0,
                accuracy INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_players_clientid ON players (clientid);
            CREATE INDEX IF NOT EXISTS idx_players_lobbyid ON players (lobbyid);
            CREATE INDEX IF NOT EXISTS idx_playerwords_clientid ON playerwords (clientid);
        "
        );

        await cmd.ExecuteNonQueryAsync();
    }

    // Optional: Seed the database with initial data
    public static async Task SeedDatabaseAsync(NpgsqlDataSource dataSource, ILogger logger)
    {
        try
        {
            // Check if words table is empty
            await using var checkCmd = dataSource.CreateCommand("SELECT COUNT(*) FROM words");
            var count = await checkCmd.ExecuteScalarAsync();

            if (count != null && Convert.ToInt32(count) == 0)
            {
                // Seed basic words
                var basicWords = new[]
                {
                    "apple",
                    "banana",
                    "carrot",
                    "dog",
                    "elephant",
                    "fish",
                    "giraffe",
                    "house",
                    "igloo",
                    "jacket",
                    "kite",
                    "lemon",
                    "monkey",
                    "notebook",
                    "orange",
                    "penguin",
                    "queen",
                    "rabbit",
                    "snake",
                    "tiger",
                    "umbrella",
                    "violin",
                    "watermelon",
                    "xylophone",
                    "yacht",
                    "zebra",
                };

                foreach (var word in basicWords)
                {
                    await using var insertCmd = dataSource.CreateCommand(
                        "INSERT INTO words (word) VALUES ($1) ON CONFLICT (word) DO NOTHING"
                    );
                    insertCmd.Parameters.AddWithValue(word);
                    await insertCmd.ExecuteNonQueryAsync();
                }

                logger.LogInformation("Database seeded with {Count} words", basicWords.Length);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error seeding database");
        }
    }
}
