import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalR } from "../../contexts/SignalRContext";
import Navbar from "../../components/Navbar/Navbar";
import "./EnterLobbyCode.css";

const EnterLobbyCode = () => {
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lobbyCode, setLobbyCode] = useState(["", "", "", ""]);
  const inputRefs = useRef([]);

  const navigate = useNavigate();
  const { joinLobby, isConnected } = useSignalR();

  // Set up refs for the input fields
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 4);
  }, []);

  const handleInputChange = (index, e) => {
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // Update the state with the new value
    const newLobbyCode = [...lobbyCode];
    newLobbyCode[index] = value;
    setLobbyCode(newLobbyCode);

    // If there's a value and we're not at the last input, focus the next input
    if (value && index < 3) {
      inputRefs.current[index + 1].focus();
    }

    // If the last input is filled, submit the form automatically
    if (index === 3 && value && newLobbyCode.every((char) => char)) {
      handleJoinLobby();
    }

    // Clear any existing error
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !lobbyCode[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === "ArrowRight" && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleJoinLobby = async () => {
    // Get the full code
    const code = lobbyCode.join("").toUpperCase();

    // Validate
    if (code.length !== 4) {
      setErrorMessage("Please enter a complete 4-character lobby code.");
      return;
    }

    setIsJoining(true);

    try {
      // Update player's lobby on the server
      const updateResponse = await fetch("/update-player-lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ LobbyId: code }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Server error: ${updateResponse.statusText}`);
      }

      // Join the SignalR group for the lobby
      const joined = await joinLobby(code);

      if (!joined) {
        throw new Error("Failed to connect to lobby");
      }

      // Navigate to the pre-game screen
      navigate(`/pregame/${code}`);
    } catch (error) {
      console.error("Error joining lobby:", error);
      setErrorMessage(
        "Failed to join lobby. Please check the code and try again.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="enter-lobby-page">
      <Navbar showBackButton={true} />

      <main className="enter-lobby-content">
        <div className="enter-lobby-container">
          <div className="instructions">
            {isJoining && <div className="spinner"></div>}
            <h2 id="lobby">Enter lobby code</h2>

            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>

          <div className="pin-code-container">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                pattern="[A-Za-z0-9]"
                autoComplete="off"
                className="pin-input"
                value={lobbyCode[index]}
                onChange={(e) => handleInputChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isJoining}
              />
            ))}
          </div>

          <div>
            <button
              className="button button-secondary join-button"
              onClick={handleJoinLobby}
              disabled={
                lobbyCode.join("").length !== 4 || isJoining || !isConnected
              }
            >
              {isJoining ? "Joining..." : "Join Lobby"}
            </button>
          </div>

          {!isConnected && (
            <p className="connection-warning">
              Waiting for connection... You'll be able to join once connected.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default EnterLobbyCode;
