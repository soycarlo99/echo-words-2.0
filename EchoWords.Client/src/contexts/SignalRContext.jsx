import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  HubConnectionBuilder,
  LogLevel,
  HttpTransportType,
} from "@microsoft/signalr";

// Create context
const SignalRContext = createContext(null);

// Context provider component
export function SignalRProvider({ children }) {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Initialize connection
  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl("/gameHub", {
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    setConnection(newConnection);

    // Clean up function
    return () => {
      if (newConnection) {
        newConnection
          .stop()
          .catch((err) => console.error("Error stopping connection:", err));
      }
    };
  }, []);

  // Start the connection
  useEffect(() => {
    if (!connection) return;

    const startConnection = async () => {
      try {
        await connection.start();
        console.log("SignalR Connected");
        setIsConnected(true);
        setConnectionError(null);
      } catch (err) {
        console.error("SignalR Connection Error:", err);
        setConnectionError(
          "Failed to connect to game server. Please try again.",
        );
        setTimeout(startConnection, 5000);
      }
    };

    // Handle connection changes
    connection.onclose(async (error) => {
      console.log("SignalR connection closed", error);
      setIsConnected(false);
    });

    connection.onreconnecting((error) => {
      console.log("SignalR reconnecting...", error);
      setIsConnected(false);
    });

    connection.onreconnected((connectionId) => {
      console.log("SignalR reconnected", connectionId);
      setIsConnected(true);
    });

    if (connection.state !== "Connected") {
      startConnection();
    }
  }, [connection]);

  // Join a lobby
  const joinLobby = useCallback(
    async (lobbyId) => {
      if (!connection || !isConnected) return false;

      try {
        await connection.invoke("JoinLobby", lobbyId);
        console.log(`Joined lobby: ${lobbyId}`);
        return true;
      } catch (err) {
        console.error(`Error joining lobby ${lobbyId}:`, err);
        return false;
      }
    },
    [connection, isConnected],
  );

  // Leave a lobby
  const leaveLobby = useCallback(
    async (lobbyId) => {
      if (!connection || !isConnected) return false;

      try {
        await connection.invoke("LeaveLobby", lobbyId);
        console.log(`Left lobby: ${lobbyId}`);
        return true;
      } catch (err) {
        console.error(`Error leaving lobby ${lobbyId}:`, err);
        return false;
      }
    },
    [connection, isConnected],
  );

  // Register handler for SignalR events
  const on = useCallback(
    (eventName, handler) => {
      if (!connection) return () => {};

      connection.on(eventName, handler);

      // Return a function to unregister the handler
      return () => {
        connection.off(eventName, handler);
      };
    },
    [connection],
  );

  // Invoke a SignalR hub method
  const invoke = useCallback(
    async (methodName, ...args) => {
      if (!connection || !isConnected) {
        console.error(`Cannot invoke ${methodName}: not connected`);
        return null;
      }

      try {
        return await connection.invoke(methodName, ...args);
      } catch (err) {
        console.error(`Error invoking ${methodName}:`, err);
        return null;
      }
    },
    [connection, isConnected],
  );

  // Context value
  const contextValue = {
    connection,
    isConnected,
    connectionError,
    joinLobby,
    leaveLobby,
    on,
    invoke,
  };

  return (
    <SignalRContext.Provider value={contextValue}>
      {children}
    </SignalRContext.Provider>
  );
}

// Custom hook for using the SignalR context
export function useSignalR() {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error("useSignalR must be used within a SignalRProvider");
  }
  return context;
}

export default SignalRContext;
