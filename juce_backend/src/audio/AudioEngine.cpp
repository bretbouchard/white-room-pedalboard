/**
 * White Room Audio Engine Implementation
 */

#include "AudioEngine.h"
#include <algorithm>
#include <cmath>

namespace white_room {
namespace audio {

AudioEngine::AudioEngine()
    : playbackState_(PlaybackState::Stopped),
      playbackPosition_(0),
      tempo_(120.0),
      ready_(false) {
  // Initialize channel levels
  channelLevels_.resize(2);  // Default to stereo
  channelLevels_[0].store(0.0);
  channelLevels_[1].store(0.0);
}

AudioEngine::~AudioEngine() {
  shutdown();
}

bool AudioEngine::initialize(const AudioEngineConfig& config) {
  // Store configuration
  config_ = config;

  // Initialize device manager
  deviceManager_ = std::make_unique<juce::AudioDeviceManager>();

  // Initialize audio device
  juce::AudioDeviceManager::AudioDeviceSetup setup;
  setup.sampleRate = config.sampleRate;
  setup.bufferSize = config.bufferSize;
  setup.inputChannels = config.inputChannels;
  setup.outputChannels = config.outputChannels;

  // Add change listener for device changes
  deviceManager_->addChangeListener(this);

  // Initialize default device
  auto error = deviceManager_->initialise(
      config.inputChannels,
      config.outputChannels,
      nullptr,  // No XML settings
      true     // Select default device
  );

  if (error.isNotEmpty()) {
    DBG("AudioEngine::initialize - Failed to initialize audio device: " << error);
    return false;
  }

  // Apply settings
  error = deviceManager_->setAudioDeviceSetup(setup, true);
  if (error.isNotEmpty()) {
    DBG("AudioEngine::initialize - Failed to set audio device setup: " << error);
    return false;
  }

  // Initialize channel levels based on actual output channels
  auto* device = deviceManager_->getCurrentAudioDevice();
  if (device) {
    auto numOutputChannels = device->getOutputChannelNames().size();
    channelLevels_.resize(numOutputChannels);
    for (auto& level : channelLevels_) {
      level.store(0.0);
    }
  }

  // Create audio processor
  audioProcessor_ = std::make_unique<juce::AudioProcessorGraph>();

  // Create audio source player
  audioSourcePlayer_ = std::make_unique<juce::AudioSourcePlayer>();

  // Set callback
  deviceManager_->addAudioCallback(this);

  // Mark as ready
  ready_.store(true);

  DBG("AudioEngine::initialize - Audio engine initialized successfully");
  DBG("  Sample rate: " << config.sampleRate);
  DBG("  Buffer size: " << config.bufferSize);
  DBG("  Input channels: " << config.inputChannels);
  DBG("  Output channels: " << config.outputChannels);

  return true;
}

void AudioEngine::shutdown() {
  // Stop playback if playing
  if (isPlaying()) {
    stopPlayback();
  }

  // Mark as not ready
  ready_.store(false);

  // Remove callback
  if (deviceManager_) {
    deviceManager_->removeAudioCallback(this);
    deviceManager_->removeChangeListener(this);
  }

  // Clean up components
  audioSourcePlayer_.reset();
  audioProcessor_.reset();
  deviceManager_.reset();

  DBG("AudioEngine::shutdown - Audio engine shut down");
}

bool AudioEngine::startPlayback() {
  juce::ScopedLock lock(stateLock_);

  if (!ready_.load()) {
    DBG("AudioEngine::startPlayback - Engine not ready");
    return false;
  }

  if (playbackState_.load() == PlaybackState::Playing) {
    DBG("AudioEngine::startPlayback - Already playing");
    return true;
  }

  // Start audio source player
  if (audioSourcePlayer_) {
    audioSourcePlayer_->startPlaying();
  }

  playbackState_.store(PlaybackState::Playing);
  DBG("AudioEngine::startPlayback - Playback started");

  return true;
}

bool AudioEngine::stopPlayback() {
  juce::ScopedLock lock(stateLock_);

  if (!ready_.load()) {
    DBG("AudioEngine::stopPlayback - Engine not ready");
    return false;
  }

  // Stop audio source player
  if (audioSourcePlayer_) {
    audioSourcePlayer_->stop();
  }

  playbackState_.store(PlaybackState::Stopped);
  playbackPosition_.store(0);
  DBG("AudioEngine::stopPlayback - Playback stopped");

  return true;
}

bool AudioEngine::pausePlayback() {
  juce::ScopedLock lock(stateLock_);

  if (!ready_.load()) {
    DBG("AudioEngine::pausePlayback - Engine not ready");
    return false;
  }

  if (playbackState_.load() != PlaybackState::Playing) {
    DBG("AudioEngine::pausePlayback - Not playing");
    return false;
  }

  // Pause audio source player
  if (audioSourcePlayer_) {
    audioSourcePlayer_->stop();
  }

  playbackState_.store(PlaybackState::Paused);
  DBG("AudioEngine::pausePlayback - Playback paused");

  return true;
}

PlaybackState AudioEngine::getPlaybackState() const {
  return playbackState_.load();
}

int64_t AudioEngine::getPlaybackPosition() const {
  return playbackPosition_.load();
}

void AudioEngine::setPlaybackPosition(int64_t position) {
  playbackPosition_.store(position);
}

double AudioEngine::getTempo() const {
  return tempo_.load();
}

void AudioEngine::setTempo(double bpm) {
  tempo_.store(bpm);
}

double AudioEngine::getAudioLevel(int channel) const {
  if (channel >= 0 && channel < static_cast<int>(channelLevels_.size())) {
    return channelLevels_[channel].load();
  }
  return 0.0;
}

bool AudioEngine::isReady() const {
  return ready_.load();
}

bool AudioEngine::isPlaying() const {
  return playbackState_.load() == PlaybackState::Playing;
}

double AudioEngine::getSampleRate() const {
  if (deviceManager_ && deviceManager_->getCurrentAudioDevice()) {
    return deviceManager_->getCurrentAudioDevice()->getCurrentSampleRate();
  }
  return config_.sampleRate;
}

int AudioEngine::getBufferSize() const {
  if (deviceManager_ && deviceManager_->getCurrentAudioDevice()) {
    return deviceManager_->getCurrentAudioDevice()->getCurrentBufferSizeSamples();
  }
  return config_.bufferSize;
}

void AudioEngine::audioDeviceIOCallbackWithContext(
    const float* const* inputChannels,
    int numInputChannels,
    float* const* outputChannels,
    int numOutputChannels,
    int numSamples,
    const juce::AudioIODeviceCallbackContext& context) {

  // Clear output buffers
  for (int i = 0; i < numOutputChannels; ++i) {
    juce::FloatVectorOperations::fill(outputChannels[i], 0.0f, numSamples);
  }

  // Only process if playing
  if (isPlaying()) {
    // Process audio
    processAudio(outputChannels, numOutputChannels, numSamples);

    // Update playback position
    playbackPosition_.fetch_add(numSamples);
  }

  // Update level meters (always update, even when not playing)
  updateLevelMeters(outputChannels, numOutputChannels, numSamples);

  juce::ignoreUnused(inputChannels, numInputChannels, context);
}

void AudioEngine::audioDeviceAboutToStart(juce::AudioIODevice* device) {
  DBG("AudioEngine::audioDeviceAboutToStart - Device: " << device->getName());
  juce::ignoreUnused(device);
}

void AudioEngine::audioDeviceStopped() {
  DBG("AudioEngine::audioDeviceStopped");
}

void AudioEngine::audioDeviceError(const juce::String& errorMessage) {
  DBG("AudioEngine::audioDeviceError - " << errorMessage);
}

void AudioEngine::changeListenerCallback(juce::ChangeBroadcaster* source) {
  DBG("AudioEngine::changeListenerCallback - Audio device changed");
  juce::ignoreUnused(source);

  // Re-initialize channel levels if device changed
  if (deviceManager_) {
    auto* device = deviceManager_->getCurrentAudioDevice();
    if (device) {
      auto numOutputChannels = device->getOutputChannelNames().size();
      juce::ScopedLock lock(stateLock_);
      channelLevels_.resize(numOutputChannels);
      for (auto& level : channelLevels_) {
        level.store(0.0);
      }
    }
  }
}

void AudioEngine::processAudio(float** outputChannels, int numOutputChannels, int numSamples) {
  // TODO: Implement actual audio processing
  // This is where we'll:
  // - Process voices/synths
  // - Apply effects
  // - Mix down to output channels

  // For now, generate silence (output is already cleared)

  juce::ignoreUnused(outputChannels, numOutputChannels, numSamples);
}

void AudioEngine::updateLevelMeters(const float** channels, int numChannels, int numSamples) {
  // Calculate RMS level for each channel
  for (int ch = 0; ch < numChannels && ch < static_cast<int>(channelLevels_.size()); ++ch) {
    if (channels[ch] == nullptr) continue;

    // Calculate RMS
    double sumSquares = 0.0;
    for (int i = 0; i < numSamples; ++i) {
      double sample = channels[ch][i];
      sumSquares += sample * sample;
    }

    double rms = std::sqrt(sumSquares / numSamples);

    // Update atomic level
    channelLevels_[ch].store(rms);
  }
}

} // namespace audio
} // namespace white_room
