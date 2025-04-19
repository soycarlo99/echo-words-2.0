import { useState, useEffect } from "react";
import "./PlayerNameInput.css";

const PlayerNameInput = ({
  onSubmit,
  initialValue = "",
  maxLength = 20,
  minLength = 3,
}) => {
  const [playerName, setPlayerName] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);

  // Initialize from localStorage if available
  useEffect(() => {
    if (!initialValue) {
      const savedName = localStorage.getItem("username");
      if (savedName) {
        setPlayerName(savedName);
      }
    }
  }, [initialValue]);

  const handleNameChange = (e) => {
    const value = e.target.value;
    setPlayerName(value);
    setHasTyped(true);

    // Clear error if user is typing
    if (error) setError("");

    // Show animation if max length is reached
    if (value.length >= maxLength) {
      e.target.classList.add("shake-name");
      setTimeout(() => {
        e.target.classList.remove("shake-name");
      }, 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setError("Please enter a username.");
      return;
    }

    if (trimmedName.length < minLength) {
      setError(`Username must be at least ${minLength} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to save the username
      const response = await fetch("/new-player/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmedName }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Store in localStorage
      localStorage.setItem("username", trimmedName);

      // Call onSubmit prop with the name
      if (onSubmit) {
        onSubmit(trimmedName);
      }
    } catch (error) {
      console.error("Error saving player name:", error);
      setError("Could not save your name. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="player-name-input-container">
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            id="playerNameInput"
            className={`player-name-field ${error ? "input-error" : ""} ${hasTyped && playerName.trim().length >= minLength ? "input-valid" : ""}`}
            placeholder="Enter your name"
            value={playerName}
            onChange={handleNameChange}
            disabled={isSubmitting}
            maxLength={maxLength}
            minLength={minLength}
            required
          />

          <button
            type="submit"
            className="accept-button"
            disabled={
              isSubmitting ||
              !playerName.trim() ||
              playerName.trim().length < minLength
            }
          >
            {isSubmitting ? "Saving..." : "Accept"}
          </button>
        </div>

        {error && <p className="input-error-message">{error}</p>}
      </form>
    </div>
  );
};

export default PlayerNameInput;
