/**
 * AudioEngine Unit Tests
 *
 * Comprehensive tests for real audio engine functionality
 */

#include <JuceHeader.h>
#include <audio/AudioEngine.h>
#include <gtest/gtest.h>

namespace white_room {
namespace audio {
namespace test {

class AudioEngineTest : public ::testing::Test {
protected:
  void SetUp() override {
    // Initialize with default config
    config_.sampleRate = 48000.0;
    config_.bufferSize = 512;
    config_.inputChannels = 2;
    config_.outputChannels = 2;

    engine_ = std::make_unique<AudioEngine>();
  }

  void TearDown() override {
    if (engine_) {
      engine_->shutdown();
      engine_.reset();
    }
  }

  AudioEngineConfig config_;
  std::unique_ptr<AudioEngine> engine_;
};

/**
 * Test initialization
 */
TEST_F(AudioEngineTest, InitializeSuccess) {
  ASSERT_TRUE(engine_->initialize(config_));
  EXPECT_TRUE(engine_->isReady());
  EXPECT_DOUBLE_EQ(engine_->getSampleRate(), 48000.0);
  EXPECT_EQ(engine_->getBufferSize(), 512);
}

/**
 * Test initialization with custom config
 */
TEST_F(AudioEngineTest, InitializeCustomConfig) {
  config_.sampleRate = 44100.0;
  config_.bufferSize = 256;
  config_.inputChannels = 1;
  config_.outputChannels = 2;

  ASSERT_TRUE(engine_->initialize(config_));
  EXPECT_DOUBLE_EQ(engine_->getSampleRate(), 44100.0);
  EXPECT_EQ(engine_->getBufferSize(), 256);
}

/**
 * Test shutdown
 */
TEST_F(AudioEngineTest, Shutdown) {
  ASSERT_TRUE(engine_->initialize(config_));
  EXPECT_TRUE(engine_->isReady());

  engine_->shutdown();
  EXPECT_FALSE(engine_->isReady());
}

/**
 * Test start playback
 */
TEST_F(AudioEngineTest, StartPlayback) {
  ASSERT_TRUE(engine_->initialize(config_));
  ASSERT_TRUE(engine_->startPlayback());

  EXPECT_TRUE(engine_->isPlaying());
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Playing);
}

/**
 * Test stop playback
 */
TEST_F(AudioEngineTest, StopPlayback) {
  ASSERT_TRUE(engine_->initialize(config_));
  ASSERT_TRUE(engine_->startPlayback());

  ASSERT_TRUE(engine_->stopPlayback());

  EXPECT_FALSE(engine_->isPlaying());
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Stopped);
  EXPECT_EQ(engine_->getPlaybackPosition(), 0);
}

/**
 * Test pause playback
 */
TEST_F(AudioEngineTest, PausePlayback) {
  ASSERT_TRUE(engine_->initialize(config_));
  ASSERT_TRUE(engine_->startPlayback());

  ASSERT_TRUE(engine_->pausePlayback());

  EXPECT_FALSE(engine_->isPlaying());
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Paused);
}

/**
 * Test playback position
 */
TEST_F(AudioEngineTest, PlaybackPosition) {
  ASSERT_TRUE(engine_->initialize(config_));

  // Initial position should be 0
  EXPECT_EQ(engine_->getPlaybackPosition(), 0);

  // Set position
  engine_->setPlaybackPosition(1000);
  EXPECT_EQ(engine_->getPlaybackPosition(), 1000);
}

/**
 * Test tempo
 */
TEST_F(AudioEngineTest, Tempo) {
  ASSERT_TRUE(engine_->initialize(config_));

  // Default tempo
  EXPECT_DOUBLE_EQ(engine_->getTempo(), 120.0);

  // Set tempo
  engine_->setTempo(140.0);
  EXPECT_DOUBLE_EQ(engine_->getTempo(), 140.0);
}

/**
 * Test audio level
 */
TEST_F(AudioEngineTest, AudioLevel) {
  ASSERT_TRUE(engine_->initialize(config_));

  // Initial levels should be 0
  EXPECT_DOUBLE_EQ(engine_->getAudioLevel(0), 0.0);
  EXPECT_DOUBLE_EQ(engine_->getAudioLevel(1), 0.0);

  // Invalid channel should return 0
  EXPECT_DOUBLE_EQ(engine_->getAudioLevel(999), 0.0);
}

/**
 * Test multiple start playback calls
 */
TEST_F(AudioEngineTest, MultipleStartPlayback) {
  ASSERT_TRUE(engine_->initialize(config_));
  ASSERT_TRUE(engine_->startPlayback());

  // Second start should return true but not change state
  EXPECT_TRUE(engine_->startPlayback());
  EXPECT_TRUE(engine_->isPlaying());
}

/**
 * Test stop when not playing
 */
TEST_F(AudioEngineTest, StopWhenNotPlaying) {
  ASSERT_TRUE(engine_->initialize(config_));

  // Stop when not playing should still return true
  EXPECT_TRUE(engine_->stopPlayback());
  EXPECT_FALSE(engine_->isPlaying());
}

/**
 * Test pause when not playing
 */
TEST_F(AudioEngineTest, PauseWhenNotPlaying) {
  ASSERT_TRUE(engine_->initialize(config_));

  // Pause when not playing should return false
  EXPECT_FALSE(engine_->pausePlayback());
}

/**
 * Test operations before initialization
 */
TEST_F(AudioEngineTest, OperationsBeforeInitialization) {
  // Should not be ready before initialization
  EXPECT_FALSE(engine_->isReady());

  // Start playback should fail
  EXPECT_FALSE(engine_->startPlayback());

  // Stop playback should fail
  EXPECT_FALSE(engine_->stopPlayback());

  // Pause should fail
  EXPECT_FALSE(engine_->pausePlayback());
}

/**
 * Test re-initialization
 */
TEST_F(AudioEngineTest, ReInitialization) {
  ASSERT_TRUE(engine_->initialize(config_));
  EXPECT_TRUE(engine_->isReady());

  // Shutdown
  engine_->shutdown();
  EXPECT_FALSE(engine_->isReady());

  // Re-initialize with different config
  config_.sampleRate = 44100.0;
  ASSERT_TRUE(engine_->initialize(config_));
  EXPECT_TRUE(engine_->isReady());
  EXPECT_DOUBLE_EQ(engine_->getSampleRate(), 44100.0);
}

/**
 * Test playback state transitions
 */
TEST_F(AudioEngineTest, PlaybackStateTransitions) {
  ASSERT_TRUE(engine_->initialize(config_));

  // Stopped -> Playing
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Stopped);
  ASSERT_TRUE(engine_->startPlayback());
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Playing);

  // Playing -> Paused
  ASSERT_TRUE(engine_->pausePlayback());
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Paused);

  // Paused -> Stopped
  ASSERT_TRUE(engine_->stopPlayback());
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Stopped);

  // Stopped -> Playing again
  ASSERT_TRUE(engine_->startPlayback());
  EXPECT_EQ(engine_->getPlaybackState(), PlaybackState::Playing);
}

/**
 * Test tempo change during playback
 */
TEST_F(AudioEngineTest, TempoChangeDuringPlayback) {
  ASSERT_TRUE(engine_->initialize(config_));
  ASSERT_TRUE(engine_->startPlayback());

  // Change tempo while playing
  engine_->setTempo(150.0);
  EXPECT_DOUBLE_EQ(engine_->getTempo(), 150.0);
  EXPECT_TRUE(engine_->isPlaying());
}

/**
 * Test position change during playback
 */
TEST_F(AudioEngineTest, PositionChangeDuringPlayback) {
  ASSERT_TRUE(engine_->initialize(config_));
  ASSERT_TRUE(engine_->startPlayback());

  // Change position while playing
  engine_->setPlaybackPosition(5000);
  EXPECT_EQ(engine_->getPlaybackPosition(), 5000);
  EXPECT_TRUE(engine_->isPlaying());
}

} // namespace test
} // namespace audio
} // namespace white_room
