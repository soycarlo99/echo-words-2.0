import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import PlayerNameInput from "../../components/PlayerNameInput/PlayerNameInput";
import "./Home.css";

const Home = ({ onUsernameSet }) => {
  const [playerName, setPlayerName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Check if a username is already set
  useEffect(() => {
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setPlayerName(savedUsername);
      // Redirect to join page if username exists
      navigate("/join");
    }
  }, [navigate]);

  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = playerName.trim();

    // Validate name
    if (!trimmedName) {
      setErrorMessage("Please enter a username.");
      return;
    }

    if (trimmedName.length < 3) {
      setErrorMessage("Username must be at least 3 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send username to server
      const response = await fetch("/new-player/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmedName }),
      });

      if (!response.ok) {
        throw new Error("Failed to save player name");
      }

      // Save username to localStorage
      localStorage.setItem("username", trimmedName);

      // Notify parent component
      if (onUsernameSet) onUsernameSet();

      // Navigate to join game page
      navigate("/join");
    } catch (error) {
      console.error("Error saving player name:", error);
      setErrorMessage("Could not save player name. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="home-page">
      <Navbar />

      <main className="home-content">
        <div className="name-input-container">
          <h3>
            You need to pick a player name before you can enter or create a
            lobby
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                id="playerNameInput"
                className={`player-name-input ${errorMessage ? "error-shake" : ""}`}
                placeholder="Enter your name"
                maxLength="20"
                minLength="3"
                value={playerName}
                onChange={handleNameChange}
                disabled={isSubmitting}
              />

              <button
                type="submit"
                className="button button-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Accept"}
              </button>
            </div>

            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </form>
        </div>
      </main>
    </div>
  );
};

export default Home;
