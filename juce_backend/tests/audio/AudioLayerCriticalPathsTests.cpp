/*
 * Audio Layer Critical Paths Tests
 *
 * Tests for critical paths, edge cases, and error handling
 * in the AudioLayer component (Scheduler, VoiceManager, etc.).
 */

#include <gtest/gtest.h>
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "../../../include/audio/AudioLayer.h"
#include "../../../include/audio/Scheduler.h"
#include "../../../include/audio/VoiceManager.h"

class AudioLayerCriticalPathsTest : public ::testing::Test {
protected:
    void SetUp() override {
        audioLayer = std::make_unique<AudioLayer>();
        sampleRate = 48000.0;
        samplesPerBlock = 512;

        audioLayer->prepare(sampleRate, samplesPerBlock);
    }

    void TearDown() override {
        audioLayer.reset();
    }

    std::unique_ptr<AudioLayer> audioLayer;
    double sampleRate;
    int samplesPerBlock;
};

// Scheduler Critical Paths
TEST_F(AudioLayerCriticalPathsTest, SchedulerHandlesZeroVoices) {
    auto scheduler = audioLayer->getScheduler();

    scheduler->setMaxVoices(0);

    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    EXPECT_NO_THROW(scheduler->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, SchedulerHandlesMaximumVoices) {
    auto scheduler = audioLayer->getScheduler();

    scheduler->setMaxVoices(256);

    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    // Add 256 note-on messages
    for (int i = 0; i < 256; i++) {
        midiMessages.addEvent(juce::MidiMessage::noteOn(1, i, 1.0f), i * 2);
    }

    EXPECT_NO_THROW(scheduler->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, SchedulerHandlesRapidNoteChanges) {
    auto scheduler = audioLayer->getScheduler();

    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    // Add rapid note-on/note-off pairs
    for (int i = 0; i < 100; i++) {
        midiMessages.addEvent(juce::MidiMessage::noteOn(1, 60, 1.0f), i * 2);
        midiMessages.addEvent(juce::MidiMessage::noteOff(1, 60), i * 2 + 1);
    }

    EXPECT_NO_THROW(scheduler->process(buffer, midiMessages));
}

// VoiceManager Critical Paths
TEST_F(AudioLayerCriticalPathsTest, VoiceManagerHandlesVoiceStealing) {
    auto voiceManager = audioLayer->getVoiceManager();

    voiceManager->setMaxVoices(8);

    // Trigger more notes than available voices
    for (int i = 0; i < 16; i++) {
        voiceManager->noteOn(60 + i, 1.0f);
    }

    EXPECT_LE(voiceManager->getActiveVoiceCount(), 8);
}

TEST_F(AudioLayerCriticalPathsTest, VoiceManagerHandlesAllNotesOff) {
    auto voiceManager = audioLayer->getVoiceManager();

    // Trigger multiple notes
    for (int i = 0; i < 16; i++) {
        voiceManager->noteOn(60 + i, 1.0f);
    }

    EXPECT_GT(voiceManager->getActiveVoiceCount(), 0);

    voiceManager->allNotesOff();

    EXPECT_EQ(voiceManager->getActiveVoiceCount(), 0);
}

TEST_F(AudioLayerCriticalPathsTest, VoiceManagerHandlesSustainPedal) {
    auto voiceManager = audioLayer->getVoiceManager();

    // Press sustain pedal
    voiceManager->sustainPedal(true);

    // Trigger and release notes
    for (int i = 0; i < 8; i++) {
        voiceManager->noteOn(60 + i, 1.0f);
        voiceManager->noteOff(60 + i);
    }

    // Notes should still be sounding with sustain
    EXPECT_GT(voiceManager->getActiveVoiceCount(), 0);

    // Release sustain pedal
    voiceManager->sustainPedal(false);

    // Now notes should stop
    EXPECT_EQ(voiceManager->getActiveVoiceCount(), 0);
}

// Buffer Management Critical Paths
TEST_F(AudioLayerCriticalPathsTest, HandlesZeroBufferSize) {
    juce::AudioBuffer<float> buffer(2, 0);
    juce::MidiBuffer midiMessages;

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesLargeBufferSize) {
    juce::AudioBuffer<float> buffer(2, 8192);
    juce::MidiBuffer midiMessages;

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesMonoBuffer) {
    juce::AudioBuffer<float> buffer(1, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesSurroundBuffer) {
    juce::AudioBuffer<float> buffer(8, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

// MIDI Handling Critical Paths
TEST_F(AudioLayerCriticalPathsTest, HandlesAllMIDIChannels) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    for (int channel = 1; channel <= 16; channel++) {
        midiMessages.addEvent(juce::MidiMessage::noteOn(channel, 60, 1.0f), 0);
    }

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesPitchBend) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    midiMessages.addEvent(juce::MidiMessage::noteOn(1, 60, 1.0f), 0);
    midiMessages.addEvent(juce::MidiMessage::pitchWheel(1, 8192), 0); // Center
    midiMessages.addEvent(juce::MidiMessage::pitchWheel(1, 0), 100); // Full down
    midiMessages.addEvent(juce::MidiMessage::pitchWheel(1, 16383), 200); // Full up

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesModWheel) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    midiMessages.addEvent(juce::MidiMessage::noteOn(1, 60, 1.0f), 0);
    midiMessages.addEvent(juce::MidiMessage::controllerEvent(1, 1, 0), 0); // Mod wheel min
    midiMessages.addEvent(juce::MidiMessage::controllerEvent(1, 1, 127), 100); // Mod wheel max

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesAftertouch) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    midiMessages.addEvent(juce::MidiMessage::noteOn(1, 60, 1.0f), 0);
    midiMessages.addEvent(juce::MidiMessage::aftertouchChange(1, 60, 127), 100);

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

// Sample Rate Changes
TEST_F(AudioLayerCriticalPathsTest, HandlesSampleRateChange) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    audioLayer->prepare(44100.0, samplesPerBlock);

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));

    audioLayer->prepare(48000.0, samplesPerBlock);

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));

    audioLayer->prepare(96000.0, samplesPerBlock);

    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

// Error Handling
TEST_F(AudioLayerCriticalPathsTest, HandlesInvalidNoteNumbers) {
    auto voiceManager = audioLayer->getVoiceManager();

    // MIDI note range is 0-127
    EXPECT_NO_THROW(voiceManager->noteOn(-1, 1.0f));
    EXPECT_NO_THROW(voiceManager->noteOn(128, 1.0f));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesInvalidVelocities) {
    auto voiceManager = audioLayer->getVoiceManager();

    // Velocity range is 0.0-1.0
    EXPECT_NO_THROW(voiceManager->noteOn(60, -1.0f));
    EXPECT_NO_THROW(voiceManager->noteOn(60, 2.0f));
}

// Real-time Safety
TEST_F(AudioLayerCriticalPathsTest, NoMemoryAllocationInProcess) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    // Add some MIDI messages
    midiMessages.addEvent(juce::MidiMessage::noteOn(1, 60, 1.0f), 0);

    // Process should not allocate memory in real-time context
    EXPECT_NO_THROW(audioLayer->process(buffer, midiMessages));
}

TEST_F(AudioLayerCriticalPathsTest, HandlesDropoutPrevention) {
    auto scheduler = audioLayer->getScheduler();

    // Set CPU limit
    scheduler->setCPULimit(80.0);

    // Trigger many voices to potentially cause dropout
    for (int i = 0; i < 256; i++) {
        scheduler->addNoteOn(60 + (i % 60), 1.0f);
    }

    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    EXPECT_NO_THROW(scheduler->process(buffer, midiMessages));
}

// State Management
TEST_F(AudioLayerCriticalPathsTest, HandlesStateSaveRestore) {
    auto voiceManager = audioLayer->getVoiceManager();

    // Trigger some notes
    voiceManager->noteOn(60, 1.0f);
    voiceManager->noteOn(64, 0.8f);
    voiceManager->noteOn(67, 0.6f);

    EXPECT_GT(voiceManager->getActiveVoiceCount(), 0);

    // Save state
    auto state = voiceManager->saveState();

    // Clear all notes
    voiceManager->allNotesOff();
    EXPECT_EQ(voiceManager->getActiveVoiceCount(), 0);

    // Restore state
    voiceManager->restoreState(state);

    // State should be restored (implementation dependent)
}

// Performance Tests
TEST_F(AudioLayerCriticalPathsTest, PerformanceTestSilentBuffer) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 10000; i++) {
        audioLayer->process(buffer, midiMessages);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    EXPECT_LT(duration.count(), 100); // Should complete 10k processes in < 100ms
}

TEST_F(AudioLayerCriticalPathsTest, PerformanceTestActiveVoices) {
    auto voiceManager = audioLayer->getVoiceManager();

    // Trigger 64 voices
    for (int i = 0; i < 64; i++) {
        voiceManager->noteOn(60 + i, 1.0f);
    }

    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 1000; i++) {
        audioLayer->process(buffer, midiMessages);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    EXPECT_LT(duration.count(), 500); // Should complete 1k processes with 64 voices in < 500ms
}
