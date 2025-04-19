import { useState, useEffect } from "react";
import { useSignalR } from "../../contexts/SignalRContext";
import "./DifficultySelector.css";

const difficultySettings = {
  easy: {
    initialTime: 60,
    correctWordBonus: 3,
    rewriteWordBonus: 1.5,
  },
  medium: {
    initialTime: 30,
    correctWordBonus: 2,
    rewriteWordBonus: 1,
  },
  hard: {
    initialTime: 15,
    correctWordBonus: 1,
    rewriteWordBonus: 0.5,
  },
  extreme: {
    initialTime: 10,
    correctWordBonus: 0.5,
    rewriteWordBonus: 0.25,
  },
};

const DifficultySelector = ({ lobbyId }) => {
  const { on, invoke, isConnected } = useSignalR();
  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    return localStorage.getItem("gameDifficulty") || "medium";
  });

  // Listen for difficulty updates from other players
  useEffect(() => {
    if (!isConnected) return;

    const receiveDifficultyHandler = (difficulty) => {
      console.log("Received difficulty update:", difficulty);
      setSelectedDifficulty(difficulty);
      localStorage.setItem("gameDifficulty", difficulty);
    };

    const unsubscribe = on("ReceiveDifficultyUpdate", receiveDifficultyHandler);

    return () => {
      unsubscribe();
    };
  }, [on, isConnected]);

  const handleDifficultyChange = async (difficulty) => {
    if (!isConnected) return;

    setSelectedDifficulty(difficulty);
    localStorage.setItem("gameDifficulty", difficulty);

    try {
      await invoke("BroadcastDifficulty", lobbyId, difficulty);
    } catch (error) {
      console.error("Error broadcasting difficulty:", error);
    }
  };

  // Get current settings based on selected difficulty
  const settings = difficultySettings[selectedDifficulty];

  return (
    <div className="difficulty-selector">
      <h3>Select Game Difficulty</h3>

      <div className="difficulty-buttons">
        <button
          className={`difficulty-btn ${selectedDifficulty === "easy" ? "active" : ""}`}
          data-difficulty="easy"
          onClick={() => handleDifficultyChange("easy")}
          disabled={!isConnected}
        >
          Easy
        </button>

        <button
          className={`difficulty-btn ${selectedDifficulty === "medium" ? "active" : ""}`}
          data-difficulty="medium"
          onClick={() => handleDifficultyChange("medium")}
          disabled={!isConnected}
        >
          Medium
        </button>

        <button
          className={`difficulty-btn ${selectedDifficulty === "hard" ? "active" : ""}`}
          data-difficulty="hard"
          onClick={() => handleDifficultyChange("hard")}
          disabled={!isConnected}
        >
          Hard
        </button>

        <button
          className={`difficulty-btn ${selectedDifficulty === "extreme" ? "active" : ""}`}
          data-difficulty="extreme"
          onClick={() => handleDifficultyChange("extreme")}
          disabled={!isConnected}
        >
          Extreme
        </button>
      </div>

      <div className="difficulty-info">
        <p id="initialTime">Initial Time: {settings.initialTime} seconds</p>

        <p id="correctBonus">
          <span>New word time bonus:</span>
          <span id="correctBonusValue">
            +{settings.correctWordBonus} seconds
          </span>
          <span
            className="info-tooltip"
            title="Bonus time added when a new word is entered correctly. That means when the new word's first letter matches the previous word's last letter and when the new word is not already used in game."
          >
            i
          </span>
        </p>

        <p id="rewriteBonus">
          <span>Rewrite time bonus:</span>
          <span id="rewriteBonusValue">
            +{settings.rewriteWordBonus} seconds
          </span>
          <span
            className="info-tooltip"
            title="Bonus time added when a previously entered word is rewritten correctly."
          >
            i
          </span>
        </p>
      </div>
    </div>
  );
};

export default DifficultySelector;
