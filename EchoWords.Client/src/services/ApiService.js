/**
 * Centralized service for handling API requests
 */
class ApiService {
  /**
   * Create a new player
   * @param {string} username - The player's username
   * @param {string|null} lobbyId - Optional lobby ID
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async createPlayer(username, lobbyId = null) {
    try {
      const response = await fetch("/api/new-player/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: username,
          lobbyId: lobbyId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return {
        success: true,
        message: "Player created successfully",
      };
    } catch (error) {
      console.error("Error creating player:", error);
      return {
        success: false,
        message: error.message || "Failed to create player",
      };
    }
  }

  /**
   * Create a new lobby
   * @returns {Promise<{ success: boolean, lobbyId: string|null, message: string }>}
   */
  async createLobby() {
    try {
      const response = await fetch("/api/create-lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        lobbyId: data.lobbyId,
        message: "Lobby created successfully",
      };
    } catch (error) {
      console.error("Error creating lobby:", error);
      return {
        success: false,
        lobbyId: null,
        message: error.message || "Failed to create lobby",
      };
    }
  }

  /**
   * Update player's current lobby
   * @param {string} lobbyId - Lobby to join
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async updatePlayerLobby(lobbyId) {
    try {
      const response = await fetch("/api/update-player-lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ LobbyId: lobbyId }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return {
        success: true,
        message: "Player lobby updated successfully",
      };
    } catch (error) {
      console.error("Error updating player lobby:", error);
      return {
        success: false,
        message: error.message || "Failed to update player lobby",
      };
    }
  }

  /**
   * Get players in a lobby
   * @param {string} lobbyId - Lobby to fetch players from
   * @returns {Promise<{ success: boolean, players: Array|null, message: string }>}
   */
  async getLobbyPlayers(lobbyId) {
    try {
      const response = await fetch(`/api/lobby/${lobbyId}/players`);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const players = await response.json();
      return {
        success: true,
        players,
        message: "Players fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching lobby players:", error);
      return {
        success: false,
        players: null,
        message: error.message || "Failed to fetch players",
      };
    }
  }

  /**
   * Submit a new word
   * @param {string} word - Word to submit
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async submitWord(word) {
    try {
      const response = await fetch("/api/new-word/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return {
        success: true,
        message: "Word submitted successfully",
      };
    } catch (error) {
      console.error("Error submitting word:", error);
      return {
        success: false,
        message: error.message || "Failed to submit word",
      };
    }
  }

  /**
   * Submit match results
   * @param {string} lobbyId - Lobby ID
   * @param {Array} results - Array of player results
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async submitMatchResults(lobbyId, results) {
    try {
      const response = await fetch(`/api/lobby/${lobbyId}/submit-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return {
        success: true,
        message: "Results submitted successfully",
      };
    } catch (error) {
      console.error("Error submitting match results:", error);
      return {
        success: false,
        message: error.message || "Failed to submit results",
      };
    }
  }

  /**
   * Get match results
   * @param {string} lobbyId - Lobby ID
   * @returns {Promise<{ success: boolean, results: Object|null, message: string }>}
   */
  async getMatchResults(lobbyId) {
    try {
      const response = await fetch(`/api/lobby/${lobbyId}/results`);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const results = await response.json();
      return {
        success: true,
        results,
        message: "Results fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching match results:", error);
      return {
        success: false,
        results: null,
        message: error.message || "Failed to fetch results",
      };
    }
  }

  /**
   * Test server connection
   * @returns {Promise<{ success: boolean, data: Object|null, message: string }>}
   */
  async testConnection() {
    try {
      const response = await fetch("/api/test");

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        message: "Connection successful",
      };
    } catch (error) {
      console.error("Error testing connection:", error);
      return {
        success: false,
        data: null,
        message: error.message || "Connection failed",
      };
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
