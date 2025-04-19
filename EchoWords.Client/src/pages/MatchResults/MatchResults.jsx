import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSignalR } from "../../contexts/SignalRContext";
import Navbar from "../../components/Navbar/Navbar";
import PlayerCard from "../../components/PlayerCard/PlayerCard";
import "./MatchResults.css";

const MatchResults = () => {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { joinLobby, isConnected } = useSignalR();

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch match results
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);

      try {
        // Join the SignalR group
        if (isConnected) {
          await joinLobby(lobbyId);
        }

        const response = await fetch(`/lobby/${lobbyId}/results`);

        if (!response.ok) {
          throw new Error(`Failed to fetch results: ${response.status}`);
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error("Error fetching match results:", err);
        setError("Failed to load match results. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (lobbyId) {
      fetchResults();
    }
  }, [lobbyId, joinLobby, isConnected]);

  // Sort players by score
  const getSortedPlayers = () => {
    if (!results || !results.players) return [];
    return [...results.players].sort((a, b) => b.score - a.score);
  };

  // Handle rematch
  const handleRematch = () => {
    navigate(`/game/${lobbyId}`);
  };

  // Return to lobby
  const handleReturnToLobby = () => {
    navigate(`/pregame/${lobbyId}`);
  };

  // Display podium (top 3 players)
  const renderPodium = (sortedPlayers) => {
    return (
      <div className="podium-container">
        {sortedPlayers.slice(0, 3).map((player, index) => (
          <div
            key={`podium-${index}`}
            className={`podium-position position-${index + 1}`}
          >
            <div className="medal">{["🥇", "🥈", "🥉"][index]}</div>
            <PlayerCard
              username={player.username}
              avatarSeed={player.avatarSeed}
              score={player.score}
              showScore={true}
              accuracy={player.accuracy}
              wordsSubmitted={player.wordsSubmitted}
            />
          </div>
        ))}
      </div>
    );
  };

  // Display other players (4th place onwards)
  const renderOtherPlayers = (sortedPlayers) => {
    if (sortedPlayers.length <= 3) return null;

    return (
      <div className="other-players-container">
        <h3>Other Players</h3>
        <div className="other-players-grid">
          {sortedPlayers.slice(3).map((player, index) => (
            <PlayerCard
              key={`other-${index}`}
              username={player.username}
              avatarSeed={player.avatarSeed}
              score={player.score}
              showScore={true}
              accuracy={player.accuracy}
              wordsSubmitted={player.wordsSubmitted}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="match-results-page">
      <Navbar lobbyId={lobbyId} showBackButton={true} />

      <main className="results-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading results...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button
              className="button button-secondary"
              onClick={handleReturnToLobby}
            >
              Back to Lobby
            </button>
          </div>
        ) : results ? (
          <div className="results-container">
            <div className="results-header">
              <h2>Match Results</h2>
              <div className="game-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Words:</span>
                  <span className="stat-value">{results.totalWords || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Game Duration:</span>
                  <span className="stat-value">
                    {results.gameDuration || 0}s
                  </span>
                </div>
              </div>
            </div>

            {renderPodium(getSortedPlayers())}
            {renderOtherPlayers(getSortedPlayers())}

            <div className="results-actions">
              <button
                className="button button-primary rematch-button"
                onClick={handleRematch}
              >
                Rematch
              </button>
              <button
                className="button return-button"
                onClick={handleReturnToLobby}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        ) : (
          <div className="error-container">
            <p>No results available.</p>
            <button
              className="button button-secondary"
              onClick={handleReturnToLobby}
            >
              Back to Lobby
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MatchResults;
