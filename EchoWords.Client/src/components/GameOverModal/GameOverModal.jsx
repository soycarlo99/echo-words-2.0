import { useEffect } from "react";
import "./GameOverModal.css";

const GameOverModal = ({ onViewResults, onPlayAgain }) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Handle click outside modal content
  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target.classList.contains("game-over-overlay")) {
      e.stopPropagation();
      // Do nothing - require user to make a choice
    }
  };

  return (
    <div className="game-over-overlay" onClick={handleBackdropClick}>
      <div className="game-over-modal">
        <h2>Game Over!</h2>
        <p>What would you like to do next?</p>

        <div className="modal-buttons">
          <button
            className="modal-button play-again-button"
            onClick={onPlayAgain}
          >
            Play Again
          </button>

          <button
            className="modal-button results-button"
            onClick={onViewResults}
          >
            View Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
