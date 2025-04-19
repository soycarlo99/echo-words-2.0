import { useState } from "react";
import { useSignalR } from "../../contexts/SignalRContext";
import "./PlayerCard.css";

const PlayerCard = ({
  username,
  avatarSeed,
  score,
  showScore = false,
  isHighlighted = false,
  lobbyId = null,
  accuracy = null,
  wordsSubmitted = null,
}) => {
  const { invoke } = useSignalR();
  const [isRandomizing, setIsRandomizing] = useState(false);

  // Default avatar seed if none provided
  const seed = avatarSeed || username;

  // Generate avatar URL using dicebear
  const avatarUrl = `https://api.dicebear.com/9.x/open-peeps/svg?seed=${encodeURIComponent(seed)}`;

  const handleRandomizeAvatar = async () => {
    if (!lobbyId || isRandomizing) return;

    setIsRandomizing(true);

    try {
      // Generate random seed
      const randomSeed = Math.random().toString(36).substring(2, 12);

      // Update avatar via SignalR
      await invoke("UpdateAvatar", lobbyId, username, randomSeed);
    } catch (error) {
      console.error("Error randomizing avatar:", error);
    } finally {
      setIsRandomizing(false);
    }
  };

  return (
    <div
      className={`player-card ${isHighlighted ? "highlighted" : ""} fade-in`}
    >
      <div className="avatar-container">
        <img
          src={avatarUrl}
          alt={`${username}'s avatar`}
          className="avatar-image"
        />
      </div>

      <div className="player-info">
        <h4 className="player-name">{username}</h4>

        {showScore && (
          <div className="player-score">
            <span>Score: {score || 0}</span>
          </div>
        )}

        {accuracy !== null && (
          <div className="player-stat">
            <span>Accuracy: {accuracy}%</span>
          </div>
        )}

        {wordsSubmitted !== null && (
          <div className="player-stat">
            <span>Words: {wordsSubmitted}</span>
          </div>
        )}

        {lobbyId && (
          <button
            className="randomize-button"
            onClick={handleRandomizeAvatar}
            disabled={isRandomizing}
          >
            {isRandomizing ? "Changing..." : "Randomize"}
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
