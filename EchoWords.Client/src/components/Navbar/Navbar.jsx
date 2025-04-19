import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import SoundSettings from "../SoundSettings/SoundSettings";
import "./Navbar.css";

const Navbar = ({ lobbyId, showBackButton = false }) => {
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();

  // Determine if we're on a game page that should show the lobby ID
  const showLobbyId =
    lobbyId &&
    (location.pathname.includes("/pregame") ||
      location.pathname.includes("/game") ||
      location.pathname.includes("/results"));

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {showBackButton ? (
          <Link
            to="/"
            className="navbar-back"
            onClick={(e) => {
              // If there's history, go back; otherwise, go home
              if (window.history.length > 2) {
                e.preventDefault();
                window.history.back();
              }
            }}
          >
            <h1>&lt; Echo Words</h1>
          </Link>
        ) : (
          <Link to="/">
            <h1>Echo Words</h1>
          </Link>
        )}
      </div>

      <div className="navbar-menu">
        {/* Show Game Rules button on most pages */}
        {!location.pathname.includes("/rules") && (
          <Link to="/rules" className="button">
            Game Rules
          </Link>
        )}

        {/* Sound settings */}
        <SoundSettings />

        {/* Dark mode toggle button */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Show lobby ID if available */}
      {showLobbyId && (
        <div className="lobby-id">
          <p>Room ID: {lobbyId}</p>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
