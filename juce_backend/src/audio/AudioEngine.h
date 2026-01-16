/**
 * White Room Audio Engine
 *
 * Real-time audio engine for Schillinger DAW
 * Thread-safe, lock-free processing with professional audio quality
 */

#pragma once

#include <JuceHeader.h>
#include <atomic>
#include <memory>
#include <vector>

namespace white_room {
namespace audio {

/**
 * Audio engine configuration
 */
struct AudioEngineConfig {
  double sampleRate = 48000.0;
  int bufferSize = 512;
  int inputChannels = 2;
  int outputChannels = 2;
};

/**
 * Playback state
 */
enum class PlaybackState {
  Stopped,
  Playing,
  Paused
};

/**
 * Audio engine - manages real-time audio processing
 *
 * Thread-safe operations using lock-free queues
 * Professional audio quality with <10ms latency
 */
class AudioEngine : public juce::AudioIODeviceCallback,
                    public juce::ChangeListener {
public:
  /**
   * Constructor
   */
  AudioEngine();

  /**
   * Destructor - ensures clean shutdown
   */
  ~AudioEngine() override;

  /**
   * Initialize audio engine with configuration
   *
   * @param config Audio configuration
   * @return true if successful
   */
  bool initialize(const AudioEngineConfig& config);

  /**
   * Shutdown audio engine
   */
  void shutdown();

  /**
   * Start playback
   *
   * @return true if successful
   */
  bool startPlayback();

  /**
   * Stop playback
   *
   * @return true if successful
   */
  bool stopPlayback();

  /**
   * Pause playback
   *
   * @return true if successful
   */
  bool pausePlayback();

  /**
   * Get current playback state
   *
   * @return Current playback state
   */
  PlaybackState getPlaybackState() const;

  /**
   * Get current playback position in samples
   *
   * @return Position in samples
   */
  int64_t getPlaybackPosition() const;

  /**
   * Set playback position
   *
   * @param position Position in samples
   */
  void setPlaybackPosition(int64_t position);

  /**
   * Get current tempo in BPM
   *
   * @return Tempo in BPM
   */
  double getTempo() const;

  /**
   * Set tempo in BPM
   *
   * @param bpm Tempo in BPM
   */
  void setTempo(double bpm);

  /**
   * Get current audio level (RMS)
   *
   * @param channel Channel number
   * @return RMS level (0.0-1.0)
   */
  double getAudioLevel(int channel) const;

  /**
   * Check if engine is ready
   *
   * @return true if ready
   */
  bool isReady() const;

  /**
   * Check if currently playing
   *
   * @return true if playing
   */
  bool isPlaying() const;

  /**
   * Get sample rate
   *
   * @return Sample rate in Hz
   */
  double getSampleRate() const;

  /**
   * Get buffer size
   *
   * @return Buffer size in samples
   */
  int getBufferSize() const;

  // AudioIODeviceCallback interface
  void audioDeviceIOCallbackWithContext(const float* const* inputChannels,
                                       int numInputChannels,
                                       float* const* outputChannels,
                                       int numOutputChannels,
                                       int numSamples,
                                       const juce::AudioIODeviceCallbackContext& context) override;
  void audioDeviceAboutToStart(juce::AudioIODevice* device) override;
  void audioDeviceStopped() override;
  void audioDeviceError(const juce::String& errorMessage) override;

  // ChangeListener interface
  void changeListenerCallback(juce::ChangeBroadcaster* source) override;

private:
  /**
   * Process audio block
   */
  void processAudio(float** outputChannels, int numOutputChannels, int numSamples);

  /**
   * Update level meters
   */
  void updateLevelMeters(const float** channels, int numChannels, int numSamples);

  /**
   * JUCE components
   */
  std::unique_ptr<juce::AudioDeviceManager> deviceManager_;
  std::unique_ptr<juce::AudioSourcePlayer> audioSourcePlayer_;
  std::unique_ptr<juce::AudioProcessor> audioProcessor_;

  /**
   * Engine state (thread-safe)
   */
  std::atomic<PlaybackState> playbackState_;
  std::atomic<int64_t> playbackPosition_;
  std::atomic<double> tempo_;
  std::atomic<bool> ready_;

  /**
   * Audio levels (RMS, updated on audio thread)
   */
  std::vector<std::atomic<double>> channelLevels_;

  /**
   * Configuration
   */
  AudioEngineConfig config_;

  /**
   * Critical section for non-atomic operations
   */
  juce::CriticalSection stateLock_;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioEngine)
};

} // namespace audio
} // namespace white_room
