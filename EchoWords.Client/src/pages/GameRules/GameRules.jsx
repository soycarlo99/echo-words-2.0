import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import "./GameRules.css";

const GameRules = () => {
  const navigate = useNavigate();

  return (
    <div className="game-rules-page">
      <Navbar showBackButton={true} />

      <main className="rules-content">
        <div className="rules-container">
          <h1 id="title">Game Rules 📏</h1>

          <div className="rules-text">
            <h2>How to Play Echo Words</h2>

            <p className="rules-intro">
              Echo Words is a fast-paced word game where players take turns
              entering words that start with the last letter of the previous
              word, while also remembering and re-entering all previous words.
            </p>

            <h3>Basic Rules</h3>
            <ul>
              <li>
                Player 1 starts by entering a word and pressing "Enter" to
                submit.
              </li>
              <li>
                Once Player 1 submits their word, it disappears after a brief
                moment.
              </li>
              <li>
                Player 2 must now:
                <ul>
                  <li>Re-enter Player 1's word.</li>
                  <li>
                    Add their own new word, ensuring the first letter of their
                    word matches the last letter of Player 1's word.
                  </li>
                </ul>
              </li>
              <li>
                The game continues with each player:
                <ol>
                  <li>Re-entering all previous words in order</li>
                  <li>Adding their own new word that follows the pattern</li>
                </ol>
              </li>
              <li>Each player has a limited time to complete their turn.</li>
            </ul>

            <h3>Scoring</h3>
            <ul>
              <li>
                Points are awarded based on word length, typing speed, and time
                remaining.
              </li>
              <li>Longer words are worth more points.</li>
              <li>Fast typing gives you a speed bonus.</li>
              <li>
                The more time left on the clock, the higher your score
                multiplier.
              </li>
              <li>Difficulty settings affect score multipliers.</li>
            </ul>

            <h3>Timer & Bonuses</h3>
            <ul>
              <li>The game has a global timer that counts down.</li>
              <li>
                Correctly entering a new word adds bonus time to the clock.
              </li>
              <li>
                Correctly re-entering previous words also adds some bonus time.
              </li>
              <li>Time bonuses vary by difficulty level.</li>
              <li>The game ends when time runs out.</li>
            </ul>

            <h3>Difficulty Levels</h3>
            <ul>
              <li>
                <strong>Easy:</strong> 60 seconds start time, larger time
                bonuses.
              </li>
              <li>
                <strong>Medium:</strong> 30 seconds start time, moderate time
                bonuses.
              </li>
              <li>
                <strong>Hard:</strong> 15 seconds start time, smaller time
                bonuses.
              </li>
              <li>
                <strong>Extreme:</strong> 10 seconds start time, minimal time
                bonuses.
              </li>
            </ul>

            <h3>Tips for Success</h3>
            <ul>
              <li>Try to memorize the words as they appear.</li>
              <li>
                Watch for words ending with difficult letters like 'X' or 'Z'.
              </li>
              <li>Type quickly but accurately for higher scores.</li>
              <li>Coordinate with your team on difficulty level.</li>
              <li>
                Consider word length when adding new words - longer words are
                worth more points!
              </li>
            </ul>
          </div>

          <div className="rules-footer">
            <button
              className="button button-primary"
              onClick={() => navigate(-1)}
            >
              Back to Game
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GameRules;
