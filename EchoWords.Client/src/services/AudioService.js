/**
 * A service for managing game sound effects
 */
class AudioService {
  constructor() {
    this.sounds = {};
    this.isMuted = localStorage.getItem("soundMuted") === "true";
    this.volume = parseFloat(localStorage.getItem("soundVolume") || "0.5");

    // Pre-load common sound effects
    this.preloadSounds();
  }

  /**
   * Preload common sound effects
   */
  preloadSounds() {
    this.loadSound("correct", "/soundEffects/correct.wav");
    this.loadSound("wrong", "/soundEffects/wrong.mp3");
    this.loadSound("countdown", "/soundEffects/countdown.mp3");
    this.loadSound("gameOver", "/soundEffects/gameOver.mp3");
  }

  /**
   * Load a sound file
   * @param {string} name - Sound identifier
   * @param {string} path - Path to sound file
   */
  loadSound(name, path) {
    try {
      const audio = new Audio(path);
      audio.preload = "auto";
      this.sounds[name] = {
        audio,
        instances: [audio],
        currentIndex: 0,
      };

      // Apply volume setting
      audio.volume = this.isMuted ? 0 : this.volume;

      // Create sound promise to track loading
      this.sounds[name].loadPromise = new Promise((resolve, reject) => {
        audio.addEventListener("canplaythrough", resolve);
        audio.addEventListener("error", reject);
      });
    } catch (error) {
      console.error(`Failed to load sound "${name}" from ${path}:`, error);
    }
  }

  /**
   * Create multiple instances of a sound for overlapping playback
   * @param {string} name - Sound identifier
   * @param {number} count - Number of instances to create
   */
  createInstances(name, count = 3) {
    if (!this.sounds[name]) return;

    const sound = this.sounds[name];
    const audio = sound.audio;

    // Create additional instances
    for (let i = 1; i < count; i++) {
      const newInstance = new Audio(audio.src);
      newInstance.volume = this.isMuted ? 0 : this.volume;
      sound.instances.push(newInstance);
    }
  }

  /**
   * Play a sound effect
   * @param {string} name - Sound identifier
   * @param {number} volume - Optional volume override (0.0 to 1.0)
   * @returns {Promise} - Resolves when sound starts playing
   */
  async play(name, volume = null) {
    if (this.isMuted) return Promise.resolve();

    if (!this.sounds[name]) {
      console.warn(`Sound "${name}" not found`);
      return Promise.resolve();
    }

    try {
      // Wait for sound to load if it's still loading
      if (this.sounds[name].loadPromise) {
        await this.sounds[name].loadPromise;
      }

      const sound = this.sounds[name];
      const instance = sound.instances[sound.currentIndex];

      // Apply volume if specified
      if (volume !== null) {
        instance.volume = volume;
      } else {
        instance.volume = this.volume;
      }

      // Reset playback
      instance.currentTime = 0;

      // Play sound
      await instance.play();

      // Rotate to next instance for next play
      sound.currentIndex = (sound.currentIndex + 1) % sound.instances.length;

      return Promise.resolve();
    } catch (error) {
      console.error(`Error playing sound "${name}":`, error);
      return Promise.resolve(); // Still resolve to not break game flow
    }
  }

  /**
   * Toggle sound on/off
   * @returns {boolean} - New mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem("soundMuted", this.isMuted);

    // Update all sound instances
    Object.values(this.sounds).forEach((sound) => {
      sound.instances.forEach((instance) => {
        instance.volume = this.isMuted ? 0 : this.volume;
      });
    });

    return this.isMuted;
  }

  /**
   * Set volume level for all sounds
   * @param {number} level - Volume level (0.0 to 1.0)
   */
  setVolume(level) {
    if (level < 0 || level > 1) {
      console.warn("Volume must be between 0.0 and 1.0");
      return;
    }

    this.volume = level;
    localStorage.setItem("soundVolume", level);

    if (!this.isMuted) {
      // Update all sound instances
      Object.values(this.sounds).forEach((sound) => {
        sound.instances.forEach((instance) => {
          instance.volume = level;
        });
      });
    }
  }

  /**
   * Check if sound is muted
   * @returns {boolean} - Current mute state
   */
  isSoundMuted() {
    return this.isMuted;
  }

  /**
   * Get current volume level
   * @returns {number} - Volume level (0.0 to 1.0)
   */
  getVolume() {
    return this.volume;
  }
}

// Create and export a singleton instance
const audioService = new AudioService();
export default audioService;
