import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalR } from "../../contexts/SignalRContext";
import Navbar from "../../components/Navbar/Navbar";
import "./JoinGame.css";

const JoinGame = () => {
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const navigate = useNavigate();
  const { isConnected } = useSignalR();

  const handleCreateLobby = async () => {
    setIsCreatingLobby(true);

    try {
      const response = await fetch("/create-lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      const lobbyId = data.lobbyId;

      await updatePlayerLobby(lobbyId);
      navigate(`/pregame/${lobbyId}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      alert("Failed to create lobby. Please try again.");
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const updatePlayerLobby = async (lobbyId) => {
    try {
      const response = await fetch("/update-player-lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ LobbyId: lobbyId }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error updating player lobby:", error);
      return false;
    }
  };

  const navigateToJoinLobby = () => {
    navigate("/enter-lobby");
  };

  const navigateToSoloPlay = () => {
    // For now, just alert that this isn't implemented
    alert("Solo play is not implemented in this version.");
  };

  return (
    <div className="join-game-page">
      <Navbar showBackButton={true} />

      <main className="join-game-content">
        <div className="join-game-container">
          <div className="join-game-title">
            <h2>Play Echo Words with friends</h2>
          </div>

          <div className="join-game-instruction">
            <p>
              Need <span className="highlight">minimum 2</span> players in each
              lobby
              <span
                className="info-icon"
                title="The game becomes more challenging with more than 8 players, but it's still possible to play with larger groups!"
              >
                i
              </span>
            </p>

            <div className="join-button-group">
              <button className="button" onClick={navigateToSoloPlay}>
                Solo
              </button>

              <button
                className="button button-primary"
                onClick={handleCreateLobby}
                disabled={isCreatingLobby || !isConnected}
              >
                {isCreatingLobby ? (
                  <>
                    <span className="spinner-small"></span> Creating...
                  </>
                ) : (
                  "Create Lobby"
                )}
              </button>

              <button
                className="button button-secondary"
                onClick={navigateToJoinLobby}
              >
                Join Lobby
              </button>
            </div>

            {!isConnected && (
              <p className="connection-warning">
                Waiting for connection... You'll be able to create a lobby once
                connected.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default JoinGame;
