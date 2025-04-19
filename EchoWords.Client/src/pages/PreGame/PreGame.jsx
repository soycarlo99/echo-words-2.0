import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSignalR } from "../../contexts/SignalRContext";
import Navbar from "../../components/Navbar/Navbar";
import PlayerCard from "../../components/PlayerCard/PlayerCard";
import DifficultySelector from "../../components/DifficultySelector/DifficultySelector";
import "./PreGame.css";

const PreGame = () => {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { on, invoke, isConnected, joinLobby } = useSignalR();

  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch players and set up SignalR on mount
  useEffect(() => {
    const setupLobby = async () => {
      setIsLoading(true);

      try {
        // Join the SignalR group
        if (isConnected) {
          await joinLobby(lobbyId);
        }

        // Fetch initial player list
        const response = await fetch(`/lobby/${lobbyId}/players`);
        if (!response.ok) {
          throw new Error(`Failed to fetch players: ${response.statusText}`);
        }

        const playersData = await response.json();
        setPlayers(playersData);
      } catch (err) {
        console.error("Error setting up lobby:", err);
        setError("Failed to load the lobby. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (lobbyId) {
      setupLobby();
    }
  }, [lobbyId, isConnected, joinLobby]);

  // Set up SignalR event handlers
  useEffect(() => {
    if (!isConnected) return;

    // When a new player joins
    const playerJoinedHandler = (newPlayer) => {
      setPlayers((currentPlayers) => {
        // Check if player already exists
        const exists = currentPlayers.some(
          (p) => p.username === newPlayer.username,
        );
        if (exists) {
          // Update existing player
          return currentPlayers.map((p) =>
            p.username === newPlayer.username ? newPlayer : p,
          );
        } else {
          // Add new player
          return [...currentPlayers, newPlayer];
        }
      });
    };

    // When an avatar is updated
    const avatarUpdatedHandler = (username, newSeed) => {
      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.username === username
            ? { ...player, avatarSeed: newSeed }
            : player,
        ),
      );
    };

    // When redirect to game occurs
    const redirectToGameHandler = () => {
      navigate(`/game/${lobbyId}`);
    };

    // Register event handlers
    const unsubscribePlayerJoined = on("PlayerJoined", playerJoinedHandler);
    const unsubscribeAvatarUpdated = on("AvatarUpdated", avatarUpdatedHandler);
    const unsubscribeRedirectToGame = on(
      "RedirectToGame",
      redirectToGameHandler,
    );

    // Cleanup function
    return () => {
      unsubscribePlayerJoined();
      unsubscribeAvatarUpdated();
      unsubscribeRedirectToGame();
    };
  }, [on, isConnected, lobbyId, navigate]);

  const handleStartGame = async () => {
    if (!isConnected || players.length < 2) return;

    try {
      await invoke("StartGame", lobbyId);
    } catch (error) {
      console.error("Error starting game:", error);
      setError("Failed to start the game. Please try again.");
    }
  };

  const handleRandomizeAllAvatars = () => {
    // This is just a visual effect - actual updates happen per player
    const randomSeed = Math.random().toString(36).substring(2, 12);
    console.log("Randomize all avatars (visual only):", randomSeed);
  };

  return (
    <div className="pregame-page">
      <Navbar lobbyId={lobbyId} showBackButton={true} />

      <main className="pregame-content">
        <div className="pregame-container">
          <div className="pregame-header">
            <h2>Invite friends to start 🎉</h2>
            <p className="instructions-text">
              Need <span className="highlight">minimum 2</span> players and max
              8 players in each lobby
            </p>
          </div>

          {isLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading players...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-message">{error}</p>
              <button
                className="button button-secondary"
                onClick={() => navigate("/join")}
              >
                Back to Join Page
              </button>
            </div>
          ) : (
            <>
              <div className="card-holder">
                {players.map((player, index) => (
                  <PlayerCard
                    key={player.id || index}
                    username={player.username}
                    avatarSeed={player.avatarSeed}
                    lobbyId={lobbyId}
                  />
                ))}
              </div>

              <div className="game-controls">
                <button
                  className="button button-primary start-game-button"
                  onClick={handleStartGame}
                  disabled={players.length < 2 || !isConnected}
                >
                  Start Game
                </button>
              </div>

              <DifficultySelector lobbyId={lobbyId} />
            </>
          )}

          {!isConnected && !isLoading && (
            <div className="connection-warning">
              <p>Reconnecting to server...</p>
              <div className="spinner-small"></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PreGame;
