import { useState, useEffect, useRef } from "react";
import { useSignalR } from "../../contexts/SignalRContext";
import audioService from "../../services/AudioService";
import "./WordInput.css";

const WordInput = ({
  index,
  isExisting,
  expected,
  gameState,
  setGameState,
  players,
  lobbyId,
  onCorrect,
  onIncorrect,
  onAddNew,
  onInputChange,
  disabled = false,
  autoFocus = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [animation, setAnimation] = useState(null);
  const [isDisabled, setIsDisabled] = useState(disabled);
  const [firstKeystrokeTime, setFirstKeystrokeTime] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const inputRef = useRef(null);
  const { invoke, on } = useSignalR();

  // Listen for animations
  useEffect(() => {
    const unsubscribeAnimation = on(
      "ReceiveAnimation",
      (receivedIndex, animationType) => {
        if (receivedIndex === index) {
          setAnimation(animationType);

          // Remove animation after it completes
          setTimeout(() => {
            setAnimation(null);
          }, 1000);
        }
      },
    );

    return () => {
      unsubscribeAnimation();
    };
  }, [on, index]);

  // Auto-focus when needed
  useEffect(() => {
    if (autoFocus && inputRef.current && !isDisabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, isDisabled]);

  // Update disabled state when the disabled prop changes
  useEffect(() => {
    setIsDisabled(disabled);
  }, [disabled]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;

    // Record first keystroke time for scoring
    if (!firstKeystrokeTime && newValue.length === 1) {
      setFirstKeystrokeTime(Date.now());
    }

    setInputValue(newValue);

    // Adjust input width based on content
    if (inputRef.current) {
      inputRef.current.style.width = `${Math.max(newValue.length, 10)}ch`;
    }

    // Clear any error message
    if (errorMessage) {
      setErrorMessage("");
    }

    // Notify parent component of the change
    if (onInputChange) {
      onInputChange(index, newValue);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    const trimmedInput = inputValue.trim().toLowerCase();

    if (!trimmedInput) {
      return;
    }

    // Case 1: Existing word - check if it matches the expected word
    if (isExisting) {
      if (trimmedInput === expected.toLowerCase()) {
        markAsCorrect();
        if (onCorrect) onCorrect(index);
      } else {
        showIncorrectAnimation();
        if (onIncorrect) onIncorrect(index);
      }
      return;
    }

    // Case 2: New word - validate it
    if (isValidNewWord(trimmedInput)) {
      if (onAddNew) onAddNew(trimmedInput, calculateWordScore(trimmedInput));
      markAsCorrect();
    } else {
      showInvalidAnimation();
    }
  };

  // Validate a new word
  const isValidNewWord = (word) => {
    // Check if the word starts with the last letter of the previous word
    if (gameState.lastWord) {
      const lastLetter = gameState.lastWord.slice(-1).toLowerCase();
      const firstLetter = word.charAt(0).toLowerCase();

      if (firstLetter !== lastLetter) {
        setErrorMessage(`Word must start with the letter "${lastLetter}"`);
        return false;
      }
    }

    // Cannot be a duplicate
    if (
      gameState.wordList
        .map((w) => w.toLowerCase())
        .includes(word.toLowerCase())
    ) {
      setErrorMessage("This word has already been used.");
      return false;
    }

    // Must be alphabetic only
    if (
      !/^[a-zA-Z\u00E0-\u00FC\u00C0-\u00DC\u00D8-\u00F6\u00F8-\u02AF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]+$/.test(
        word,
      )
    ) {
      setErrorMessage("Please enter only alphabetic characters.");
      return false;
    }

    // Check for likely gibberish
    if (isLikelyGibberish(word)) {
      return false;
    }

    return true;
  };

  // Check if word is likely gibberish
  const isLikelyGibberish = (word) => {
    word = word.toLowerCase();

    // Too many repeated characters
    if (/(.)\1{2,}/.test(word)) {
      setErrorMessage("Too many repeated characters.");
      return true;
    }

    // Not enough vowels
    const vowels = (word.match(/[aeiou]/gi) || []).length;
    const consonants = word.length - vowels;
    if (consonants / word.length > 0.85) {
      setErrorMessage(
        "Too many consonants. This doesn't look like a real word.",
      );
      return true;
    }

    // Unlikely character combinations
    const unlikelyCombos = /[qwx]{2}|[jvk]{2}|[mqz]{2}/;
    if (unlikelyCombos.test(word)) {
      setErrorMessage("Invalid character combination.");
      return true;
    }

    return false;
  };

  // Calculate word score
  const calculateWordScore = (word) => {
    const lengthPoints = word.length * 100;

    // Typing speed bonus
    let speedMultiplier = 1;
    if (firstKeystrokeTime) {
      const timeElapsed = (Date.now() - firstKeystrokeTime) / 1000;
      const wordsPerMinute = word.length / 5 / (timeElapsed / 60);
      speedMultiplier = Math.min(wordsPerMinute / 30, 2);
    }

    // Time remaining bonus
    const timeRemainingMultiplier = 1 + gameState.remainingSeconds / 60;

    // Difficulty multiplier
    const difficulty = localStorage.getItem("gameDifficulty") || "medium";
    const difficultyMultipliers = {
      easy: 1,
      medium: 1.5,
      hard: 2,
      extreme: 3,
    };
    const difficultyMultiplier = difficultyMultipliers[difficulty] || 1.5;

    // Calculate final score
    const finalScore = Math.round(
      lengthPoints *
        speedMultiplier *
        timeRemainingMultiplier *
        difficultyMultiplier,
    );

    // Show score animation
    showScorePopup(finalScore);

    return finalScore;
  };

  // Mark input as correct
  const markAsCorrect = () => {
    setIsCorrect(true);
    setIsDisabled(true);
    audioService.play("correct");

    // Apply animation based on selected style
    const selectedAnimation =
      localStorage.getItem("selectedAnimation") || "default";
    let animationClass;

    switch (selectedAnimation) {
      case "confetti":
        animationClass = "confetti-burst";
        break;
      case "gradient":
        animationClass = "gradient-wave";
        break;
      case "wave":
        animationClass = "liquid-wave";
        break;
      case "neon":
        animationClass = "neon-glow";
        break;
      case "flip":
        animationClass = "flip-3d";
        break;
      default:
        animationClass = "default-animation";
    }

    setAnimation(animationClass);

    // Broadcast animation to other players
    invoke("BroadcastAnimation", lobbyId, index, animationClass).catch((err) =>
      console.error("Error broadcasting animation:", err),
    );
  };

  // Show incorrect animation
  const showIncorrectAnimation = () => {
    audioService.play("wrong");
    setAnimation("shake");

    // Broadcast animation
    invoke("BroadcastAnimation", lobbyId, index, "shake").catch((err) =>
      console.error("Error broadcasting animation:", err),
    );

    // Reset input after animation
    setTimeout(() => {
      setInputValue("");
      setAnimation(null);
      if (inputRef.current) {
        inputRef.current.focus();
      }

      // Also notify parent of the change to empty string
      if (onInputChange) {
        onInputChange(index, "");
      }
    }, 500);
  };

  // Show invalid word animation
  const showInvalidAnimation = () => {
    audioService.play("wrong");
    setAnimation("shake");

    // Broadcast animation
    invoke("BroadcastAnimation", lobbyId, index, "shake").catch((err) =>
      console.error("Error broadcasting animation:", err),
    );

    // Reset input after animation
    setTimeout(() => {
      setInputValue("");
      setAnimation(null);
      if (inputRef.current) {
        inputRef.current.focus();
      }

      // Also notify parent of the change to empty string
      if (onInputChange) {
        onInputChange(index, "");
      }
    }, 500);
  };

  // Show score popup
  const showScorePopup = (score) => {
    const popup = document.createElement("div");
    popup.className = "score-popup";
    popup.textContent = `+${score}`;

    if (inputRef.current && inputRef.current.parentElement) {
      inputRef.current.parentElement.appendChild(popup);

      setTimeout(() => {
        if (popup.parentElement) {
          popup.parentElement.removeChild(popup);
        }
      }, 1500);
    }
  };

  return (
    <div
      className={`word-card ${animation || ""} ${isCorrect ? "correct" : ""}`}
    >
      <input
        ref={inputRef}
        type="text"
        className={`word-input ${animation || ""} ${isCorrect ? "correct" : ""}`}
        placeholder={
          isExisting ? `Re-enter "${expected}"...` : "Enter new word..."
        }
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        disabled={isDisabled || isCorrect}
        maxLength={20}
        autoComplete="off"
        spellCheck="false"
      />

      {errorMessage && (
        <div className="notification">
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default WordInput;
