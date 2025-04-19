import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SignalRProvider } from "./contexts/SignalRContext";
import { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

// Import pages
import Home from "./pages/Home/Home";
import GameRules from "./pages/GameRules/GameRules";
import JoinGame from "./pages/JoinGame/JoinGame";
import PreGame from "./pages/PreGame/PreGame";
import GamePage from "./pages/GamePage/GamePage";
import MatchResults from "./pages/MatchResults/MatchResults";
import EnterLobbyCode from "./pages/EnterLobbyCode/EnterLobbyCode";

// Import styles
import "./styles/index.css";

function App() {
  const [hasUsername, setHasUsername] = useState(false);

  // Check if user has a username saved
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) {
      setHasUsername(true);
    }
  }, []);

  // Wrapper that redirects to home if no username
  const ProtectedRoute = ({ children }) => {
    if (!hasUsername) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <SignalRProvider>
            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={<Home onUsernameSet={() => setHasUsername(true)} />}
              />
              <Route path="/rules" element={<GameRules />} />

              {/* Protected routes - require username */}
              <Route
                path="/join"
                element={
                  <ProtectedRoute>
                    <JoinGame />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/enter-lobby"
                element={
                  <ProtectedRoute>
                    <EnterLobbyCode />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pregame/:lobbyId"
                element={
                  <ProtectedRoute>
                    <PreGame />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/game/:lobbyId"
                element={
                  <ProtectedRoute>
                    <GamePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/results/:lobbyId"
                element={
                  <ProtectedRoute>
                    <MatchResults />
                  </ProtectedRoute>
                }
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SignalRProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
