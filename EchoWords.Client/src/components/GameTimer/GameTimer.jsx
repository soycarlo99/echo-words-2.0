import { useState, useEffect, useRef } from "react";
import "./GameTimer.css";

const GameTimer = ({ remainingSeconds, isPaused, lobbyId }) => {
  const [isCountdown, setIsCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const progressRef = useRef(null);

  // Handle countdown animation
  useEffect(() => {
    let countdownTimer;

    if (isCountdown) {
      countdownTimer = setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            setIsCountdown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
    };
  }, [isCountdown]);

  // Update progress bar width based on remaining time
  useEffect(() => {
    if (progressRef.current) {
      const initialTime = getInitialTimeFromDifficulty();
      const progress = remainingSeconds / initialTime;
      progressRef.current.style.setProperty(
        "--transform",
        `scaleX(${progress})`,
      );
    }
  }, [remainingSeconds]);

  // Get initial time from currently selected difficulty
  const getInitialTimeFromDifficulty = () => {
    const difficulty = localStorage.getItem("gameDifficulty") || "medium";
    const difficultyTimes = {
      easy: 60,
      medium: 30,
      hard: 15,
      extreme: 10,
    };

    return difficultyTimes[difficulty] || 30;
  };

  // Start countdown animation
  const startCountdown = () => {
    setIsCountdown(true);
    setCountdownValue(3);
  };

  // Determine timer state and classes
  const getTimerClasses = () => {
    let classes = ["game-timer"];

    if (remainingSeconds <= 5) {
      classes.push("danger");
    } else if (remainingSeconds <= 10) {
      classes.push("warning");
    }

    return classes.join(" ");
  };

  // Determine what to display in the timer
  const getTimerDisplay = () => {
    if (isCountdown) {
      return (
        <div className="countdown-display">
          <span className="countdown-number">{countdownValue}</span>
        </div>
      );
    }

    if (isPaused) {
      return <span>Ready...</span>;
    }

    if (remainingSeconds <= 0) {
      return <span>Time's up!</span>;
    }

    return <span>{remainingSeconds.toFixed(1)}</span>;
  };

  return (
    <div className={getTimerClasses()} ref={progressRef}>
      {getTimerDisplay()}
    </div>
  );
};

export default GameTimer;
