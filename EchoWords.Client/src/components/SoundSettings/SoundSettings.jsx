import { useState, useEffect } from "react";
import audioService from "../../services/AudioService";
import "./SoundSettings.css";

const SoundSettings = () => {
  const [isMuted, setIsMuted] = useState(audioService.isSoundMuted());
  const [volume, setVolume] = useState(audioService.getVolume());
  const [isOpen, setIsOpen] = useState(false);

  // Play test sound
  const playTestSound = () => {
    if (!isMuted) {
      audioService.play("correct");
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMuteState = audioService.toggleMute();
    setIsMuted(newMuteState);
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioService.setVolume(newVolume);
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="sound-settings">
      <button
        className="sound-toggle-button"
        onClick={toggleSettings}
        aria-label="Sound settings"
        title="Sound settings"
      >
        {isMuted ? "🔇" : volume > 0.5 ? "🔊" : "🔉"}
      </button>

      {isOpen && (
        <div className="sound-panel">
          <div className="sound-controls">
            <div className="sound-control-row">
              <label className="sound-label">
                <input
                  type="checkbox"
                  checked={!isMuted}
                  onChange={toggleMute}
                />
                Sound {isMuted ? "Off" : "On"}
              </label>
            </div>

            <div className="sound-control-row">
              <label htmlFor="volume-slider" className="sound-label">
                Volume:
              </label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                disabled={isMuted}
                className="volume-slider"
              />
              <span className="volume-value">{Math.round(volume * 100)}%</span>
            </div>

            <button
              className="test-sound-button"
              onClick={playTestSound}
              disabled={isMuted}
            >
              Test Sound
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundSettings;
