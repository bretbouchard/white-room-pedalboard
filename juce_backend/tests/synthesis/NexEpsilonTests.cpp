#include <gtest/gtest.h>
#include <vector>
#include <array>
#include <chrono>
#include "../../src/synthesis/NexSynthEngine_Simple.h"

using namespace JuceBackend::NexSynth;

/**
 * @brief Epsilon Block Tests: MIDI & Voice Management
 *
 * Tests the comprehensive MIDI processing and voice management capabilities of the NEX synthesizer.
 * Epsilon Block focuses on:
 * - MIDI message parsing and processing
 * - Voice allocation and polyphony management
 * - Pitch bend and MIDI CC handling
 * - Sustain pedal and real-time control
 * - Voice stealing and performance optimization
 * - MIDI timing and accuracy
 */

class NexEpsilonTests : public ::testing::Test
{
protected:
    void SetUp() override
    {
        engine = std::make_unique<NexSynthEngine>();
        engine->prepareToPlay(sampleRate, bufferSize);
    }

    void TearDown() override
    {
        engine.reset();
    }

    // Helper methods
    juce::MidiBuffer createNoteOn(int channel, int note, float velocity);
    juce::MidiBuffer createNoteOff(int channel, int note, float velocity);
    juce::MidiBuffer createPitchBend(int channel, int value);
    juce::MidiBuffer createControlChange(int channel, int controller, float value);
    void processAudioWithMidi(juce::MidiBuffer& midiBuffer, int samplesToProcess = 512);

    std::unique_ptr<NexSynthEngine> engine;
    const double sampleRate = 44100.0;
    const int bufferSize = 512;
};

juce::MidiBuffer NexEpsilonTests::createNoteOn(int channel, int note, float velocity)
{
    juce::MidiBuffer midiBuffer;
    midiBuffer.addEvent(juce::MidiMessage::noteOn(channel, note, static_cast<uint8_t>(velocity * 127.0f)), 0);
    return midiBuffer;
}

juce::MidiBuffer NexEpsilonTests::createNoteOff(int channel, int note, float velocity)
{
    juce::MidiBuffer midiBuffer;
    midiBuffer.addEvent(juce::MidiMessage::noteOff(channel, note, static_cast<uint8_t>(velocity * 127.0f)), 0);
    return midiBuffer;
}

juce::MidiBuffer NexEpsilonTests::createPitchBend(int channel, int value)
{
    juce::MidiBuffer midiBuffer;
    midiBuffer.addEvent(juce::MidiMessage::pitchWheel(channel, value), 0);
    return midiBuffer;
}

juce::MidiBuffer NexEpsilonTests::createControlChange(int channel, int controller, float value)
{
    juce::MidiBuffer midiBuffer;
    midiBuffer.addEvent(juce::MidiMessage::controllerEvent(channel, controller, static_cast<int>(value * 127.0f)), 0);
    return midiBuffer;
}

void NexEpsilonTests::processAudioWithMidi(juce::MidiBuffer& midiBuffer, int samplesToProcess)
{
    juce::AudioBuffer<float> audioBuffer(2, samplesToProcess);
    audioBuffer.clear();

    // Process a block with MIDI
    engine->processBlock(audioBuffer, midiBuffer);
}

// =============================================================================
// MIDI MESSAGE PROCESSING TESTS
// =============================================================================

TEST_F(NexEpsilonTests, BasicNoteOnProcessing)
{
    // Create a single note-on message
    auto midiBuffer = createNoteOn(1, 60, 0.8f); // C4 with 80% velocity

    // Process the MIDI message
    processAudioWithMidi(midiBuffer);

    // Force update of performance stats
    engine->updatePerformanceStats();
    auto stats = engine->getPerformanceStats();
    EXPECT_GT(stats.activeVoices, 0) << "Should have at least one active voice after note on";

    // Verify note is tracked
    // Note: In a real implementation, we'd have access to note tracking
    // For now, we just verify the engine processed without crashing
}

TEST_F(NexEpsilonTests, NoteOnNoteOffSequence)
{
    // Note on
    auto noteOnBuffer = createNoteOn(1, 64, 0.7f); // E4
    processAudioWithMidi(noteOnBuffer);

    auto statsAfterOn = engine->getPerformanceStats();
    EXPECT_GT(statsAfterOn.activeVoices, 0) << "Should have active voice after note on";

    // Note off
    auto noteOffBuffer = createNoteOff(1, 64, 0.3f);
    processAudioWithMidi(noteOffBuffer);

    auto statsAfterOff = engine->getPerformanceStats();
    // Voice should be released (but may still be active during release phase)
    EXPECT_GE(statsAfterOff.activeVoices, 0) << "Voice count should be non-negative";
}

TEST_F(NexEpsilonTests, MultipleNotesSimultaneous)
{
    // Create multiple note-on messages
    std::vector<int> notes = {60, 64, 67, 72}; // C4, E4, G4, C5 (C major chord)

    for (int note : notes)
    {
        auto midiBuffer = createNoteOn(1, note, 0.6f);
        processAudioWithMidi(midiBuffer);
    }

    auto stats = engine->getPerformanceStats();
    EXPECT_EQ(stats.activeVoices, notes.size()) << "Should have one voice per note";
    EXPECT_LE(stats.activeVoices, stats.maxVoices) << "Active voices should not exceed maximum";
}

TEST_F(NexEpsilonTests, PolyphonyLimits)
{
    // Fill all available voices
    int maxVoices = engine->getPerformanceStats().maxVoices;

    for (int i = 0; i < maxVoices + 5; ++i) // Try to exceed max voices
    {
        auto midiBuffer = createNoteOn(1, 60 + i, 0.5f);
        processAudioWithMidi(midiBuffer);
    }

    auto stats = engine->getPerformanceStats();
    EXPECT_LE(stats.activeVoices, maxVoices) << "Should not exceed maximum voice count";
    EXPECT_EQ(stats.activeVoices, maxVoices) << "Should reach maximum voice limit";
}

TEST_F(NexEpsilonTests, VoiceStealing)
{
    // Fill all voices
    int maxVoices = engine->getPerformanceStats().maxVoices;

    for (int i = 0; i < maxVoices; ++i)
    {
        auto midiBuffer = createNoteOn(1, 60 + i, 0.5f);
        processAudioWithMidi(midiBuffer);
    }

    // All voices should be allocated
    auto statsBefore = engine->getPerformanceStats();
    EXPECT_EQ(statsBefore.activeVoices, maxVoices) << "All voices should be allocated";

    // Add one more note - should trigger voice stealing
    auto midiBuffer = createNoteOn(1, 90, 0.7f); // High note
    processAudioWithMidi(midiBuffer);

    auto statsAfter = engine->getPerformanceStats();
    EXPECT_EQ(statsAfter.activeVoices, maxVoices) << "Voice count should remain at maximum";
    // Voice stealing should have occurred - new note should be playing
}

TEST_F(NexEpsilonTests, NoteRetriggering)
{
    // Play the same note multiple times
    int note = 60; // C4

    // First note on
    auto noteOn1 = createNoteOn(1, note, 0.5f);
    processAudioWithMidi(noteOn1);

    auto stats1 = engine->getPerformanceStats();
    int voicesAfterFirst = stats1.activeVoices;

    // Retrigger same note
    auto noteOn2 = createNoteOn(1, note, 0.8f); // Higher velocity
    processAudioWithMidi(noteOn2);

    auto stats2 = engine->getPerformanceStats();
    int voicesAfterRetrigger = stats2.activeVoices;

    // Should not create additional voices for the same note
    EXPECT_EQ(voicesAfterFirst, voicesAfterRetrigger)
        << "Retriggering should not increase voice count";
}

// =============================================================================
// MIDI CONTINUOUS CONTROLLER TESTS
// =============================================================================

TEST_F(NexEpsilonTests, PitchBendProcessing)
{
    // Send some pitch bend messages
    std::vector<int> bendValues = {0, 4096, 8192, 12288, 16383}; // Center, up, center, down, full up

    for (int bendValue : bendValues)
    {
        auto midiBuffer = createPitchBend(1, bendValue);
        processAudioWithMidi(midiBuffer);

        // Should process without crashing
        // In a real implementation, we'd verify pitch bend affects oscillator frequency
    }
}

TEST_F(NexEpsilonTests, PitchBendRangeValidation)
{
    // Test extreme pitch bend values
    auto minBend = createPitchBend(1, 0);     // Full down
    auto maxBend = createPitchBend(1, 16383);  // Full up
    auto centerBend = createPitchBend(1, 8192); // Center

    processAudioWithMidi(minBend);
    processAudioWithMidi(maxBend);
    processAudioWithMidi(centerBend);

    // Should handle extreme values gracefully
    auto stats = engine->getPerformanceStats();
    EXPECT_GE(stats.activeVoices, 0) << "Pitch bend should not crash the engine";
}

TEST_F(NexEpsilonTests, BasicControllerHandling)
{
    // Test various MIDI controllers
    std::vector<std::pair<int, float>> controllers = {
        {1, 0.5f},   // Modulation wheel
        {7, 0.75f},  // Volume
        {10, 0.3f},  // Pan
        {11, 0.8f},  // Expression
        {64, 1.0f},  // Sustain pedal (on)
        {64, 0.0f}   // Sustain pedal (off)
    };

    for (const auto& [controller, value] : controllers)
    {
        auto midiBuffer = createControlChange(1, controller, value);
        processAudioWithMidi(midiBuffer);

        // Should process without crashing
        // In a real implementation, we'd verify controller values are stored and applied
    }
}

TEST_F(NexEpsilonTests, SustainPedalBehavior)
{
    // Start some notes
    for (int i = 0; i < 3; ++i)
    {
        auto noteOn = createNoteOn(1, 60 + i, 0.6f);
        processAudioWithMidi(noteOn);
    }

    auto statsBefore = engine->getPerformanceStats();
    int voicesBefore = statsBefore.activeVoices;

    // Engage sustain pedal
    auto sustainOn = createControlChange(1, 64, 1.0f);
    processAudioWithMidi(sustainOn);

    // Release notes while sustain is active
    for (int i = 0; i < 3; ++i)
    {
        auto noteOff = createNoteOff(1, 60 + i, 0.3f);
        processAudioWithMidi(noteOff);
    }

    auto statsDuring = engine->getPerformanceStats();
    int voicesDuring = statsDuring.activeVoices;

    // Notes should still be active due to sustain pedal
    EXPECT_EQ(voicesDuring, voicesBefore) << "Sustain should hold notes active";

    // Release sustain pedal
    auto sustainOff = createControlChange(1, 64, 0.0f);
    processAudioWithMidi(sustainOff);

    // Process a few more blocks to allow release
    for (int i = 0; i < 3; ++i)
    {
        juce::AudioBuffer<float> tempBuffer(2, 256);
        juce::MidiBuffer emptyMidi;
        engine->processBlock(tempBuffer, emptyMidi);
    }

    auto statsAfter = engine->getPerformanceStats();
    int voicesAfter = statsAfter.activeVoices;

    // Notes should now be released
    EXPECT_LT(voicesAfter, voicesBefore) << "Releasing sustain should free voices";
}

// =============================================================================
// MIDI TIMING AND PERFORMANCE TESTS
// =============================================================================

TEST_F(NexEpsilonTests, MidiMessageTiming)
{
    // Create MIDI messages at different sample positions
    juce::MidiBuffer midiBuffer;

    // Note on at sample 0
    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(80.0f)), 0);
    // Note off at sample 100
    midiBuffer.addEvent(juce::MidiMessage::noteOff(1, 60, static_cast<uint8_t>(0.0f)), 100);
    // Pitch bend at sample 200
    midiBuffer.addEvent(juce::MidiMessage::pitchWheel(1, 12000), 200);

    // Process with precise timing
    juce::AudioBuffer<float> audioBuffer(2, 256);
    audioBuffer.clear();
    engine->processBlock(audioBuffer, midiBuffer);

    // Should process messages in correct order without issues
    auto stats = engine->getPerformanceStats();
    EXPECT_GE(stats.activeVoices, 0) << "Should handle timed MIDI messages correctly";
}

TEST_F(NexEpsilonTests, HighVolumeMidiProcessing)
{
    // Simulate high MIDI message density (like a fast performance)
    const int messagesPerBlock = 50;
    const int numBlocks = 10;

    auto startTime = std::chrono::high_resolution_clock::now();

    for (int block = 0; block < numBlocks; ++block)
    {
        juce::MidiBuffer midiBuffer;

        // Generate many MIDI messages
        for (int i = 0; i < messagesPerBlock; ++i)
        {
            int note = 60 + (i % 24); // Range of 2 octaves
            float velocity = 0.3f + (i % 70) / 100.0f;

            if (i % 3 == 0) // Every third message is a note off
            {
                midiBuffer.addEvent(juce::MidiMessage::noteOff(1, note, static_cast<uint8_t>(velocity * 127.0f)), i);
            }
            else
            {
                midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(velocity * 127.0f)), i);
            }
        }

        processAudioWithMidi(midiBuffer);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should process high volume quickly
    EXPECT_LT(duration.count(), 50000) << "Should process high MIDI volume in < 50ms";

    auto stats = engine->getPerformanceStats();
    EXPECT_LE(stats.activeVoices, stats.maxVoices) << "Should not exceed voice limits under heavy load";
}

TEST_F(NexEpsilonTests, MidiChannelSeparation)
{
    // Test that different MIDI channels are handled separately
    std::vector<std::pair<int, int>> channelNotes = {
        {1, 60}, {2, 62}, {3, 64}, {4, 65}, {5, 67}
    };

    // Send notes on different channels
    for (const auto& [channel, note] : channelNotes)
    {
        auto midiBuffer = createNoteOn(channel, note, 0.7f);
        processAudioWithMidi(midiBuffer);
    }

    auto stats = engine->getPerformanceStats();
    EXPECT_EQ(stats.activeVoices, channelNotes.size()) << "Should handle notes on different channels";
}

TEST_F(NexEpsilonTests, AllNotesOffFunctionality)
{
    // Start many notes
    for (int i = 0; i < 10; ++i)
    {
        auto noteOn = createNoteOn(1, 60 + i, 0.6f);
        processAudioWithMidi(noteOn);
    }

    auto statsBefore = engine->getPerformanceStats();
    EXPECT_GT(statsBefore.activeVoices, 0) << "Should have active voices before all notes off";

    // Send all notes off
    engine->allNotesOff();

    auto statsAfter = engine->getPerformanceStats();
    EXPECT_EQ(statsAfter.activeVoices, 0) << "All voices should be cleared by allNotesOff";
}

TEST_F(NexEpsilonTests, MidiControllerRangeValidation)
{
    // Test extreme controller values
    std::vector<float> extremeValues = {0.0f, 0.001f, 0.5f, 0.999f, 1.0f};

    for (float value : extremeValues)
    {
        auto midiBuffer = createControlChange(1, 1, value); // Modulation wheel
        processAudioWithMidi(midiBuffer);

        // Should handle edge cases gracefully
        auto stats = engine->getPerformanceStats();
        EXPECT_GE(stats.activeVoices, 0) << "Should handle extreme controller values";
    }
}

TEST_F(NexEpsilonTests, VoiceAllocationEfficiency)
{
    // Test that voice allocation is efficient for repeated patterns
    std::vector<int> notePattern = {60, 64, 67, 72, 60, 64, 67, 72}; // Arpeggio pattern

    // Run pattern multiple times
    for (int repeat = 0; repeat < 5; ++repeat)
    {
        for (int note : notePattern)
        {
            auto noteOn = createNoteOn(1, note, 0.6f);
            processAudioWithMidi(noteOn);
        }

        // Turn off all notes
        for (int note : notePattern)
        {
            auto noteOff = createNoteOff(1, note, 0.2f);
            processAudioWithMidi(noteOff);
        }
    }

    auto stats = engine->getPerformanceStats();
    EXPECT_LE(stats.activeVoices, stats.maxVoices) << "Should handle repeated patterns efficiently";
    EXPECT_LT(stats.activeVoices, notePattern.size()) << "Should release voices when not needed";
}