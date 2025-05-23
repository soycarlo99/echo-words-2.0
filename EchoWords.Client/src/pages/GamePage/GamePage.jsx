import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSignalR } from "../../contexts/SignalRContext";
import Navbar from "../../components/Navbar/Navbar";
import PlayerCard from "../../components/PlayerCard/PlayerCard";
import GameTimer from "../../components/GameTimer/GameTimer";
import WordInput from "../../components/WordInput/WordInput";
import GameOverModal from "../../components/GameOverModal/GameOverModal";
import audioService from "../../services/AudioService";
import "./GamePage.css";

const GamePage = () => {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { on, invoke, isConnected, joinLobby } = useSignalR();

  // Game state
  const [gameState, setGameState] = useState({
    wordList: [],
    currentPlayerIndex: 0,
    remainingSeconds: 0,
    lastWord: "",
    scores: {},
    correctWordBonus: 0,
    rewriteWordBonus: 0,
  });

  // UI state
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [currentInputs, setCurrentInputs] = useState([]);
  const [isInputsDisabled, setIsInputsDisabled] = useState(false);
  const [isTurnPhase, setIsTurnPhase] = useState(true); // true = entering words, false = viewing results
  const [completedInputs, setCompletedInputs] = useState(0);
  const [userInputs, setUserInputs] = useState({}); // Track all user inputs by index

  const timerIntervalRef = useRef(null);
  const previousWordListLengthRef = useRef(0);
  const username = localStorage.getItem("username");

  // Connect to SignalR and fetch initial data
  useEffect(() => {
    const setupGame = async () => {
      setIsLoading(true);

      try {
        // Join the SignalR group if connected
        if (isConnected) {
          await joinLobby(lobbyId);
        }

        // Fetch players
        const response = await fetch(`/api/lobby/${lobbyId}/players`);
        if (!response.ok) {
          throw new Error(`Failed to fetch players: ${response.statusText}`);
        }

        const playersData = await response.json();
        setPlayers(playersData);

        // Initialize game settings from localStorage
        const difficulty = localStorage.getItem("gameDifficulty") || "medium";
        const settings = getDifficultySettings(difficulty);

        setGameState((prev) => ({
          ...prev,
          remainingSeconds: settings.initialTime,
          correctWordBonus: settings.correctWordBonus,
          rewriteWordBonus: settings.rewriteWordBonus,
        }));

        // Set up initial input state - just one input for the first word
        setCurrentInputs([{ index: 0, isExisting: false, expected: "" }]);
      } catch (err) {
        console.error("Error setting up game:", err);
        setError("Failed to load the game. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (lobbyId) {
      setupGame();
    }

    return () => {
      // Clean up timer on unmount
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [lobbyId, isConnected, joinLobby]);

  // Set up SignalR event handlers
  useEffect(() => {
    if (!isConnected) return;

    // Handle game state updates
    const receiveGameStateHandler = (newState) => {
      previousWordListLengthRef.current = gameState.wordList.length;

      setGameState((prev) => ({ ...prev, ...newState }));

      // If wordlist has changed, we need to update the inputs
      if (
        newState.wordList &&
        newState.wordList.length !== prev.wordList.length
      ) {
        updateInputsForPlayer(newState.wordList, newState.currentPlayerIndex);
      }
    };

    // Handle user input updates
    const receiveUserInputHandler = (index, input) => {
      setUserInputs((prev) => ({
        ...prev,
        [index]: input,
      }));
    };

    // Handle timer events
    const receiveTimerStartHandler = (initialTime) => {
      setGameState((prev) => ({ ...prev, remainingSeconds: initialTime }));
      setIsTimerPaused(false);
      startTimerWithoutBroadcast();
    };

    const receiveTimerSyncHandler = (remainingTime) => {
      setGameState((prev) => ({ ...prev, remainingSeconds: remainingTime }));
    };

    const receiveTimerPauseHandler = () => {
      setIsTimerPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };

    const receiveTimerResumeHandler = (remainingTime) => {
      setGameState((prev) => ({ ...prev, remainingSeconds: remainingTime }));
      setIsTimerPaused(false);
      startTimerWithoutBroadcast();
    };

    // Handle game start
    const receiveGameStartHandler = () => {
      console.log("Game start received");
      audioService.play("countdown");
      startGameCountdown();
    };

    // Register all event handlers
    const unsubscribeGameState = on(
      "ReceiveGameState",
      receiveGameStateHandler,
    );
    const unsubscribeUserInput = on(
      "ReceiveUserInput",
      receiveUserInputHandler,
    );
    const unsubscribeTimerStart = on(
      "ReceiveTimerStart",
      receiveTimerStartHandler,
    );
    const unsubscribeTimerSync = on(
      "ReceiveTimerSync",
      receiveTimerSyncHandler,
    );
    const unsubscribeTimerPause = on(
      "ReceiveTimerPause",
      receiveTimerPauseHandler,
    );
    const unsubscribeTimerResume = on(
      "ReceiveTimerResume",
      receiveTimerResumeHandler,
    );
    const unsubscribeGameStart = on(
      "ReceiveGameStart",
      receiveGameStartHandler,
    );

    // Cleanup function to unsubscribe from all events
    return () => {
      unsubscribeGameState();
      unsubscribeUserInput();
      unsubscribeTimerStart();
      unsubscribeTimerSync();
      unsubscribeTimerPause();
      unsubscribeTimerResume();
      unsubscribeGameStart();
    };
  }, [on, isConnected, gameState.wordList.length]);

  // Update input values from received broadcasts
  useEffect(() => {
    // Update input values from userInputs state
    const inputs = document.querySelectorAll(".word-input");

    Object.entries(userInputs).forEach(([index, value]) => {
      const inputIndex = parseInt(index);
      if (inputs[inputIndex]) {
        // Only update if it's not the current player's turn or not the current input
        if (!isMyTurn() || inputIndex !== completedInputs) {
          inputs[inputIndex].value = value;
        }
      }
    });
  }, [userInputs]);

  // Update inputs when it's this player's turn
  const updateInputsForPlayer = (wordList, playerIndex) => {
    if (!username || !players.length) return;

    // Find our player index
    const myPlayerIndex = players.findIndex(
      (p) => p.username.toLowerCase() === username.toLowerCase(),
    );

    if (myPlayerIndex === -1) return;

    // Check if it's our turn
    const isMyTurnNow = playerIndex % players.length === myPlayerIndex;

    // Generate inputs for all existing words that need to be retyped
    const newInputs = wordList.map((word, idx) => ({
      index: idx,
      isExisting: true,
      expected: word,
      disabled: !isMyTurnNow || idx !== completedInputs, // Only enable the current input
    }));

    // Add an input for the new word
    if (isTurnPhase) {
      newInputs.push({
        index: wordList.length,
        isExisting: false,
        expected: "",
        disabled: !isMyTurnNow || completedInputs < wordList.length, // Enable only after all words are retyped
      });
    }

    setCurrentInputs(newInputs);
    
    if (isMyTurnNow) {
      setIsInputsDisabled(false);
    } else {
      setIsInputsDisabled(true);
    }
  };

  // Broadcast user input to other players
  const broadcastUserInput = (index, value) => {
    if (isConnected) {
      invoke("BroadcastUserInput", lobbyId, index, value).catch((err) =>
        console.error("Error broadcasting user input:", err),
      );
    }
  };

  // Start timer without broadcasting
  const startTimerWithoutBroadcast = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    let lastUpdate = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastUpdate) / 1000;
      lastUpdate = now;

      setGameState((prev) => {
        const previousSeconds = Math.floor(prev.remainingSeconds);
        const newRemainingSeconds = Math.max(0, prev.remainingSeconds - delta);
        const currentSeconds = Math.floor(newRemainingSeconds);

        // Broadcast timer update if seconds have changed
        if (previousSeconds !== currentSeconds && isConnected) {
          invoke("BroadcastTimerSync", lobbyId, newRemainingSeconds).catch(
            (err) => console.error("Error broadcasting timer sync:", err),
          );
        }

        // If timer reaches zero, handle game over
        if (newRemainingSeconds <= 0 && prev.remainingSeconds > 0) {
          clearInterval(timerIntervalRef.current);
          handleGameOver();
        }

        return { ...prev, remainingSeconds: newRemainingSeconds };
      });
    }, 100);
  };

  // Start game countdown
  const startGameCountdown = () => {
    setIsTimerPaused(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setTimeout(() => {
      setIsTimerPaused(false);
      initializeGameSettings();
      startTimerWithoutBroadcast();
    }, 3000); // 3 second countdown
  };

  // Initialize game settings based on difficulty
  const initializeGameSettings = () => {
    const difficulty = localStorage.getItem("gameDifficulty") || "medium";
    const settings = getDifficultySettings(difficulty);

    setGameState((prev) => ({
      ...prev,
      remainingSeconds: settings.initialTime,
      correctWordBonus: settings.correctWordBonus,
      rewriteWordBonus: settings.rewriteWordBonus,
    }));

    // Broadcast timer start
    invoke("BroadcastTimerStart", lobbyId, settings.initialTime).catch(
      (err) => console.error("Error broadcasting timer start:", err),
    );
  };

  // Get difficulty settings
  const getDifficultySettings = (difficulty) => {
    const settings = {
      easy: { initialTime: 60, correctWordBonus: 3, rewriteWordBonus: 1.5 },
      medium: { initialTime: 30, correctWordBonus: 2, rewriteWordBonus: 1 },
      hard: { initialTime: 15, correctWordBonus: 1, rewriteWordBonus: 0.5 },
      extreme: {
        initialTime: 10,
        correctWordBonus: 0.5,
        rewriteWordBonus: 0.25,
      },
    };

    return settings[difficulty] || settings.medium;
  };

  // Handle game over
  const handleGameOver = () => {
    audioService.play("gameOver");
    setShowGameOverModal(true);
  };

  // Handle when an existing word is correctly entered
  const handleCorrectWord = (index) => {
    // Add time bonus for rewriting word
    addTimeBonus(true);

    // Update completed inputs
    setCompletedInputs((prev) => prev + 1);

    // Update input states to enable the next one
    setCurrentInputs((prev) =>
      prev.map((input, idx) => ({
        ...input,
        disabled: idx !== completedInputs + 1,
      }))
    );

    // Focus the next input
    setTimeout(() => {
      const inputs = document.querySelectorAll(".word-input");
      if (inputs.length > completedInputs + 1) {
        inputs[completedInputs + 1].focus();
      }
    }, 100);
  };

  // Handle incorrect word entry
  const handleIncorrectWord = (index) => {
    // Reset our progress if we get something wrong
    setCompletedInputs(0);

    // Reset input states to only enable the first one
    setCurrentInputs((prev) =>
      prev.map((input, idx) => ({
        ...input,
        disabled: idx !== 0,
      }))
    );

    // Focus the first input
    setTimeout(() => {
      const inputs = document.querySelectorAll(".word-input");
      if (inputs.length > 0) {
        inputs[0].focus();
      }
    }, 100);
  };

  // Handle when user input changes
  const handleInputChange = (index, value) => {
    // Update local state
    setUserInputs((prev) => ({
      ...prev,
      [index]: value,
    }));

    // Broadcast to other players
    broadcastUserInput(index, value);
  };

  // Handle when a new word is added
  const handleAddNewWord = async (word, score) => {
    // Add score to current player
    const currentPlayer = gameState.currentPlayerIndex % players.length;

    // Get the initial time based on difficulty
    const difficulty = localStorage.getItem("gameDifficulty") || "medium";
    const settings = getDifficultySettings(difficulty);
    const initialTime = settings.initialTime;

    // Update game state
    const newGameState = {
      wordList: [...gameState.wordList, word],
      lastWord: word,
      currentPlayerIndex: gameState.currentPlayerIndex + 1,
      remainingSeconds: initialTime, // Reset timer for next player
      scores: {
        ...gameState.scores,
        [currentPlayer]: (gameState.scores[currentPlayer] || 0) + score,
      },
    };

    // Save word to server
    try {
      await fetch("/api/new-word/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
    } catch (error) {
      console.error("Error saving word:", error);
    }

    // Clear user input state for next turn
    setUserInputs({});
    setCompletedInputs(0);

    // Broadcast game state update
    try {
      await invoke("BroadcastGameState", lobbyId, newGameState);
    } catch (error) {
      console.error("Error broadcasting game state:", error);
    }

    // Pause briefly to show the word, then disable inputs during pause
    setIsInputsDisabled(true);
    setIsTurnPhase(false);

    // Pause timer
    pauseTimer();

    // Wait a bit to show the new word
    setTimeout(() => {
      // Resume timer with reset time
      setGameState((prev) => ({
        ...prev,
        ...newGameState
      }));
      resumeTimer();

      // Switch to next player's turn
      setIsTurnPhase(true);

      // Update inputs for the next player
      updateInputsForPlayer(
        newGameState.wordList,
        newGameState.currentPlayerIndex,
      );
    }, 1700); // Pause to show the new word
  };

  // Add time bonus
  const addTimeBonus = (isRewrite) => {
    const bonusTime = isRewrite
      ? gameState.rewriteWordBonus
      : gameState.correctWordBonus;

    // Update game state
    setGameState((prev) => ({
      ...prev,
      remainingSeconds: prev.remainingSeconds + bonusTime,
    }));

    // Broadcast timer sync
    invoke(
      "BroadcastTimerSync",
      lobbyId,
      gameState.remainingSeconds + bonusTime,
    ).catch((err) => console.error("Error broadcasting timer sync:", err));
  };

  // Pause timer
  const pauseTimer = () => {
    setIsTimerPaused(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Broadcast pause
    invoke("BroadcastTimerPause", lobbyId).catch((err) =>
      console.error("Error broadcasting timer pause:", err),
    );
  };

  // Resume timer
  const resumeTimer = () => {
    setIsTimerPaused(false);
    startTimerWithoutBroadcast();

    // Broadcast resume with current time
    invoke("BroadcastTimerResume", lobbyId, gameState.remainingSeconds).catch(
      (err) => console.error("Error broadcasting timer resume:", err),
    );
  };

  // Submit game results and navigate to results page
  const handleSubmitResults = async () => {
    try {
      const results = calculateGameResults();

      const response = await fetch(`/api/lobby/${lobbyId}/submit-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit results: ${response.status}`);
      }

      navigate(`/results/${lobbyId}`);
    } catch (error) {
      console.error("Error submitting game results:", error);
      setError("Failed to submit game results. Please try again.");
    }
  };

  // Calculate game results for each player
  const calculateGameResults = () => {
    return players.map((player, playerIndex) => {
      const wordsSubmitted = gameState.wordList.filter(
        (_, index) => index % players.length === playerIndex,
      ).length;

      // In a real implementation, accuracy would track attempts vs successes
      // Here we're simplifying
      const accuracy = 100; // placeholder

      return {
        username: player.username,
        score: gameState.scores[playerIndex] || 0,
        wordsSubmitted,
        accuracy,
      };
    });
  };

  // Current player index mod number of players
  const currentPlayerIndex =
    gameState.currentPlayerIndex % (players.length || 1);

  // Check if it's our turn
  const isMyTurn = () => {
    if (!username || !players.length) return false;

    const myPlayerIndex = players.findIndex(
      (p) => p.username.toLowerCase() === username.toLowerCase(),
    );

    if (myPlayerIndex === -1) return false;

    return currentPlayerIndex === myPlayerIndex;
  };

  return (
    <div className="game-page">
      <Navbar lobbyId={lobbyId} />

      <main className="game-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading game...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button
              className="button button-secondary"
              onClick={() => navigate(`/pregame/${lobbyId}`)}
            >
              Back to Lobby
            </button>
          </div>
        ) : (
          <>
            <GameTimer
              remainingSeconds={gameState.remainingSeconds}
              isPaused={isTimerPaused}
              lobbyId={lobbyId}
            />

            <div className="game-layout">
              <div className="word-container">
                {gameState.wordList.length === 0 && isMyTurn() ? (
                  // First word input for starting the game
                  <div className="first-word-prompt">
                    <p>You start! Enter the first word to begin the game.</p>
                    <WordInput
                      key="first-word"
                      index={0}
                      isExisting={false}
                      expected=""
                      gameState={gameState}
                      setGameState={setGameState}
                      players={players}
                      lobbyId={lobbyId}
                      onAddNew={handleAddNewWord}
                      onInputChange={handleInputChange}
                      disabled={false}
                      autoFocus={true}
                    />
                  </div>
                ) : gameState.wordList.length === 0 ? (
                  // Waiting for first player to start
                  <div className="waiting-prompt">
                    <p>
                      Waiting for {players[0]?.username} to start the game...
                    </p>
                    <WordInput
                      key="first-word-waiting"
                      index={0}
                      isExisting={false}
                      expected=""
                      gameState={gameState}
                      setGameState={setGameState}
                      players={players}
                      lobbyId={lobbyId}
                      onInputChange={handleInputChange}
                      disabled={true}
                    />
                  </div>
                ) : isMyTurn() ? (
                  // Our turn - show inputs
                  <div className="my-turn">
                    <p className="turn-instruction">
                      {isTurnPhase
                        ? "Your turn! Re-enter all previous words, then add a new one."
                        : "Great job! Next player's turn coming up..."}
                    </p>

                    <div className="word-input-container">
                      {/* Input for retyping previous words */}
                      {gameState.wordList.map((word, idx) => (
                        <WordInput
                          key={`retype-${idx}`}
                          index={idx}
                          isExisting={true}
                          expected={word}
                          gameState={gameState}
                          setGameState={setGameState}
                          players={players}
                          lobbyId={lobbyId}
                          onCorrect={handleCorrectWord}
                          onIncorrect={handleIncorrectWord}
                          onInputChange={handleInputChange}
                          disabled={idx !== completedInputs}
                          autoFocus={idx === completedInputs}
                        />
                      ))}

                      {/* Input for new word */}
                      {isTurnPhase && (
                        <WordInput
                          key="new-word"
                          index={gameState.wordList.length}
                          isExisting={false}
                          expected=""
                          gameState={gameState}
                          setGameState={setGameState}
                          players={players}
                          lobbyId={lobbyId}
                          onAddNew={handleAddNewWord}
                          onInputChange={handleInputChange}
                          disabled={completedInputs < gameState.wordList.length}
                          autoFocus={completedInputs === gameState.wordList.length}
                        />
                      )}
                    </div>

                    {!isTurnPhase && gameState.lastWord && (
                      <div className="last-word-display">
                        <p>
                          You added: <strong>{gameState.lastWord}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Not our turn - show whose turn it is
                  <div className="waiting-turn">
                    <p>
                      It's {players[currentPlayerIndex]?.username}'s turn...
                    </p>

                    {/* Display all existing inputs (disabled) */}
                    {currentInputs.map((input, idx) => (
                      <WordInput
                        key={`input-view-${idx}`}
                        index={idx}
                        isExisting={idx < gameState.wordList.length}
                        expected={gameState.wordList[idx] || ""}
                        gameState={gameState}
                        setGameState={setGameState}
                        players={players}
                        lobbyId={lobbyId}
                        onInputChange={handleInputChange}
                        disabled={true}
                      />
                    ))}

                    {!isTurnPhase && gameState.lastWord && (
                      <div className="last-word-display">
                        <p>
                          Last word added: <strong>{gameState.lastWord}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="players-container">
                {players.map((player, index) => (
                  <PlayerCard
                    key={player.id || index}
                    username={player.username}
                    avatarSeed={player.avatarSeed}
                    score={gameState.scores[index] || 0}
                    showScore={true}
                    isHighlighted={index === currentPlayerIndex}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {showGameOverModal && (
        <GameOverModal
          onViewResults={handleSubmitResults}
          onPlayAgain={() => navigate(`/pregame/${lobbyId}`)}
        />
      )}
    </div>
  );
};

export default GamePage;
