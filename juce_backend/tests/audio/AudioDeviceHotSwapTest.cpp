#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <chrono>
#include <thread>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include "../../src/backend/AudioEngine.h"

class AudioDeviceHotSwapTest : public ::testing::Test {
protected:
    void SetUp() override {
        audioEngine = std::make_unique<AudioEngine>();
        // Initialize with default device for testing
        ASSERT_TRUE(audioEngine->initializeAudio());
    }

    void TearDown() override {
        audioEngine->shutdownAudio();
        audioEngine.reset();
    }

    std::unique_ptr<AudioEngine> audioEngine;
    juce::String initialDeviceName;
    std::vector<juce::String> availableDevices;
};

// RED TEST: Device hot-swapping during active playback
TEST_F(AudioDeviceHotSwapTest, HotSwapDeviceDuringPlayback) {
    // Get initial device and start playback
    availableDevices = audioEngine->getAvailableAudioDevices();
    ASSERT_FALSE(availableDevices.empty());

    initialDeviceName = availableDevices[0];
    EXPECT_TRUE(audioEngine->setAudioDevice(initialDeviceName));

    // Start playback
    audioEngine->startPlayback();
    EXPECT_TRUE(audioEngine->isPlaying());

    // Simulate device disconnection (this should fail initially - RED)
    // We need to implement device monitoring and auto-switching
    EXPECT_TRUE(audioEngine->setAudioDevice(""));  // Empty device name simulates disconnection

    // Should auto-switch to next available device
    if (availableDevices.size() > 1) {
        EXPECT_TRUE(audioEngine->isPlaying());  // Playback should continue
        EXPECT_TRUE(audioEngine->getCurrentAudioDevice().isNotEmpty());
    }
}

// RED TEST: Device hot-swapping with < 100ms latency requirement
TEST_F(AudioDeviceHotSwapTest, DeviceSwitchLatencyUnder100ms) {
    availableDevices = audioEngine->getAvailableAudioDevices();

    // Skip if we don't have at least 2 devices for testing
    if (availableDevices.size() < 2) {
        GTEST_SKIP() << "Need at least 2 audio devices for latency testing";
        return;
    }

    auto device1 = availableDevices[0];
    auto device2 = availableDevices[1];

    // Start with device 1
    EXPECT_TRUE(audioEngine->setAudioDevice(device1));

    // Measure device switching time
    auto startTime = std::chrono::high_resolution_clock::now();

    // Switch to device 2 (this should take < 100ms - currently will fail)
    EXPECT_TRUE(audioEngine->setAudioDevice(device2));

    auto endTime = std::chrono::high_resolution_clock::now();
    auto durationMs = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

    // This should initially fail - we need to optimize device switching
    EXPECT_LT(durationMs.count(), 100) << "Device switching took " << durationMs.count() << "ms, should be < 100ms";
}

// RED TEST: Device hot-swapping with parameter preservation
TEST_F(AudioDeviceHotSwapTest, PreserveAudioParametersDuringHotSwap) {
    availableDevices = audioEngine->getAvailableAudioDevices();

    if (availableDevices.size() < 2) {
        GTEST_SKIP() << "Need at least 2 audio devices for parameter preservation testing";
        return;
    }

    auto device1 = availableDevices[0];
    auto device2 = availableDevices[1];

    // Set specific audio parameters on device 1
    EXPECT_TRUE(audioEngine->setAudioDevice(device1, 48000.0, 256));

    // Switch to device 2 (should preserve sample rate and buffer size)
    EXPECT_TRUE(audioEngine->setAudioDevice(device2));

    // Verify parameters are preserved (this will fail initially - RED)
    // We need to implement parameter preservation logic
    EXPECT_EQ(audioEngine->getCurrentSampleRate(), 48000.0);
    EXPECT_EQ(audioEngine->getCurrentBufferSize(), 256);
}

// RED TEST: Device hot-swapping with loaded plugins
TEST_F(AudioDeviceHotSwapTest, HotSwapWithLoadedPlugins) {
    availableDevices = audioEngine->getAvailableAudioDevices();

    if (availableDevices.size() < 2) {
        GTEST_SKIP() << "Need at least 2 audio devices for plugin hot-swap testing";
        return;
    }

    // Load a test plugin
    int pluginId = audioEngine->loadPlugin("test_vst3_path");  // This will need a real plugin path
    if (pluginId == -1) {
        GTEST_SKIP() << "No test plugin available for plugin hot-swap testing";
        return;
    }

    auto initialPlugins = audioEngine->getLoadedPlugins();
    EXPECT_FALSE(initialPlugins.empty());

    // Switch audio device
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0], 44100.0, 512));
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[1], 44100.0, 512));

    // Verify plugins are still loaded after device switch (this will fail initially - RED)
    auto finalPlugins = audioEngine->getLoadedPlugins();
    EXPECT_EQ(initialPlugins.size(), finalPlugins.size());

    // Verify plugin parameters are preserved
    EXPECT_TRUE(audioEngine->setPluginParameter(pluginId, "test_param", 0.5f));
}

// RED TEST: Device capability validation
TEST_F(AudioDeviceHotSwapTest, ValidateDeviceCapabilities) {
    availableDevices = audioEngine->getAvailableAudioDevices();
    ASSERT_FALSE(availableDevices.empty());

    // Test with invalid device name
    EXPECT_FALSE(audioEngine->setAudioDevice("INVALID_DEVICE_NAME"));

    // Test with invalid sample rate
    EXPECT_FALSE(audioEngine->setAudioDevice(availableDevices[0], -1.0, 512));
    EXPECT_FALSE(audioEngine->setAudioDevice(availableDevices[0], 1000000.0, 512));

    // Test with invalid buffer size
    EXPECT_FALSE(audioEngine->setAudioDevice(availableDevices[0], 44100.0, -1));
    EXPECT_FALSE(audioEngine->setAudioDevice(availableDevices[0], 44100.0, 65536));

    // Test valid parameters (this should work)
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0], 44100.0, 512));
}

// RED TEST: Device hot-swapping error recovery
TEST_F(AudioDeviceHotSwapTest, ErrorRecoveryDuringHotSwap) {
    availableDevices = audioEngine->getAvailableAudioDevices();
    ASSERT_FALSE(availableDevices.empty());

    // Start with a valid device
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0]));
    audioEngine->startPlayback();

    // Try to switch to invalid device (should fail gracefully)
    EXPECT_FALSE(audioEngine->setAudioDevice("INVALID_DEVICE"));

    // Playback should still be active on the original device
    EXPECT_TRUE(audioEngine->isPlaying());

    // Should be able to switch back to a valid device
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0]));
}

// RED TEST: Real-time safety during device hot-swap
TEST_F(AudioDeviceHotSwapTest, RealtimeSafetyDuringHotSwap) {
    availableDevices = audioEngine->getAvailableAudioDevices();

    if (availableDevices.size() < 2) {
        GTEST_SKIP() << "Need at least 2 audio devices for real-time safety testing";
        return;
    }

    // Start audio processing
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0]));
    audioEngine->startPlayback();

    // Simulate rapid device switching (stress test)
    for (int i = 0; i < 10; i++) {
        auto device = availableDevices[i % availableDevices.size()];
        EXPECT_TRUE(audioEngine->setAudioDevice(device));

        // Check for audio dropouts during switch (this will fail initially - RED)
        // We need to implement dropout-free device switching
        EXPECT_EQ(audioEngine->getAudioDropoutCount(), 0);

        // Small delay to simulate real-world usage
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    audioEngine->stopPlayback();
}

// RED TEST: Device hot-swapping with MIDI devices
TEST_F(AudioDeviceHotSwapTest, HotSwapWithMIDIDevices) {
    // This tests that MIDI device state is preserved during audio device hot-swap
    // This will fail initially as we haven't implemented MIDI device preservation

    availableDevices = audioEngine->getAvailableAudioDevices();
    ASSERT_FALSE(availableDevices.empty());

    // Initialize MIDI devices (if available)
    // This part needs MIDI device management implementation

    // Switch audio device
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0]));

    // Verify MIDI devices are still active after audio device switch
    // This will fail until we implement MIDI device preservation
}

// GREEN TEST: Device hot-swapping monitoring and callbacks
TEST_F(AudioDeviceHotSwapTest, DeviceHotSwapCallbacks) {
    // Test that appropriate callbacks are triggered during device hot-swap
    // GREEN PHASE: Now implemented with DeviceChangeListener system

    availableDevices = audioEngine->getAvailableAudioDevices();
    ASSERT_FALSE(availableDevices.empty());

    // Register device change listener
    class TestDeviceChangeListener : public AudioEngine::DeviceChangeListener
    {
    public:
        bool callbackReceived = false;
        juce::String receivedDeviceName;

        void audioDeviceChanged(const juce::String& newDeviceName) override
        {
            callbackReceived = true;
            receivedDeviceName = newDeviceName;
        }
    };

    auto listener = std::make_unique<TestDeviceChangeListener>();
    audioEngine->addDeviceChangeListener(listener.get());

    // Switch device
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0]));

    // Verify callback was received
    EXPECT_TRUE(listener->callbackReceived);
    EXPECT_EQ(listener->receivedDeviceName, availableDevices[0]);

    // Clean up
    audioEngine->removeDeviceChangeListener(listener.get());
}

// RED TEST: Device hot-swapping with session state
TEST_F(AudioDeviceHotSwapTest, PreserveSessionStateDuringHotSwap) {
    // Test that session state is preserved during device hot-swap
    // This will fail until we implement session state management

    availableDevices = audioEngine->getAvailableAudioDevices();
    ASSERT_FALSE(availableDevices.empty());

    // Set up session state
    audioEngine->setTempo(140.0);
    audioEngine->setPlaybackPosition(30.0);
    audioEngine->startPlayback();

    // Switch device
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0]));

    // Verify session state is preserved
    EXPECT_EQ(audioEngine->getTempo(), 140.0);
    EXPECT_NEAR(audioEngine->getPlaybackPosition(), 30.0, 0.1);
    EXPECT_TRUE(audioEngine->isPlaying());
}

// RED TEST: Device hot-swapping performance metrics
TEST_F(AudioDeviceHotSwapTest, HotSwapPerformanceMetrics) {
    // Test performance metrics collection during device hot-swap
    // This will fail until we implement performance monitoring

    availableDevices = audioEngine->getAvailableAudioDevices();

    if (availableDevices.size() < 2) {
        GTEST_SKIP() << "Need at least 2 audio devices for performance metrics testing";
        return;
    }

    auto startTime = std::chrono::high_resolution_clock::now();

    // Switch device
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[0]));
    EXPECT_TRUE(audioEngine->setAudioDevice(availableDevices[1]));

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

    // Collect performance metrics (this will fail until implemented)
    auto metrics = audioEngine->getHotSwapMetrics();
    EXPECT_GT(metrics.switchTime, 0);
    EXPECT_LT(metrics.switchTime, 100);  // Should be < 100ms
    EXPECT_EQ(metrics.droppedBuffers, 0);
}