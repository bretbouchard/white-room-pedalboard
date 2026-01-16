#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include "../../src/synthesis/NexSynthEngine_Simple.h"

using namespace JuceBackend::NexSynth;

class NexZetaOptimizedTests : public ::testing::Test {
protected:
    void SetUp() override {
        engine = std::make_unique<NexSynthEngine>();

        // Initialize for optimization testing
        engine->prepareToPlay(44100.0, 512);

        // Create test audio buffer
        testBuffer.setSize(2, 512);
        testBuffer.clear();

        // Enable optimization
        engine->optimizeVoiceAllocation();
    }

    void TearDown() override {
        engine.reset();
    }

    // Helper method to create a basic MIDI note on
    juce::MidiBuffer createNoteOn(int channel, int note, float velocity) {
        juce::MidiBuffer buffer;
        buffer.addEvent(juce::MidiMessage::noteOn(channel, note, static_cast<uint8_t>(velocity * 127.0f)), 0);
        return buffer;
    }

    std::unique_ptr<NexSynthEngine> engine;
    juce::AudioBuffer<float> testBuffer;
    juce::MidiBuffer midiBuffer;
};

// =============================================================================
// OPTIMIZED VOICE ALLOCATION TESTS
// =============================================================================

TEST_F(NexZetaOptimizedTests, VoiceUtilizationAfterOptimization) {
    // Test that voice utilization is properly tracked after optimization
    engine->setMaxVoices(16);  // Use smaller voice pool for higher utilization

    // Create notes to test allocation efficiency - allocate most voices
    std::vector<int> testNotes = {48, 52, 55, 60, 64, 67, 72, 76, 79, 83};  // 10 notes out of 16

    // Process notes
    for (int note : testNotes) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
        testBuffer.clear(); // Clear for next note
    }

    auto allocationStats = engine->getVoiceAllocationStats();
    float utilization = engine->getVoiceUtilization();

    // OPTIMIZED: Should have proper utilization tracking (10/16 = 62.5%)
    EXPECT_EQ(allocationStats.allocatedVoices, 10) << "Should allocate exactly 10 voices";
    EXPECT_GT(allocationStats.efficiency, 0.5f) << "Should have better than 50% efficiency after optimization";
    EXPECT_EQ(utilization, allocationStats.efficiency) << "Utilization should match allocation efficiency";
    EXPECT_NEAR(allocationStats.efficiency, 0.625f, 0.01f) << "Should have 62.5% efficiency (10/16 voices)";
}

TEST_F(NexZetaOptimizedTests, OptimizedAllocationPerformance) {
    // Test performance of optimized allocation - measure only allocation time
    engine->setMaxVoices(64);

    auto startTime = std::chrono::high_resolution_clock::now();

    // Create rapid note sequence to test pure allocation performance
    // Use direct noteOn calls to avoid audio processing overhead
    for (int i = 0; i < 100; ++i) {
        int note = 48 + (i % 24);  // 2 octave range
        engine->noteOn(note, 0.8f);  // Direct API call for allocation only
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // OPTIMIZED: Stack-based allocation should be very fast (under 5ms for 100 allocations)
    EXPECT_LT(duration.count(), 5000) << "Optimized allocation should be under 5ms for 100 direct allocations";

    // Also verify all voices were allocated correctly
    auto stats = engine->getVoiceAllocationStats();
    EXPECT_EQ(stats.allocatedVoices, 24) << "Should have 24 unique voices allocated (100 notes with 24-note range)";
}

TEST_F(NexZetaOptimizedTests, VoiceReuseAndRecycling) {
    // Test that voice recycling works correctly
    engine->setMaxVoices(16);

    // Play and release the same note multiple times
    int testNote = 60;  // C4

    for (int cycle = 0; cycle < 10; ++cycle) {
        // Note on
        juce::MidiBuffer noteOnBuffer;
        noteOnBuffer.addEvent(juce::MidiMessage::noteOn(1, testNote, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, noteOnBuffer);

        auto statsOn = engine->getVoiceAllocationStats();
        EXPECT_EQ(statsOn.allocatedVoices, 1) << "Should have 1 voice after note on";

        // Note off
        juce::MidiBuffer noteOffBuffer;
        noteOffBuffer.addEvent(juce::MidiMessage::noteOff(1, testNote, static_cast<uint8_t>(0.0f)), 0);
        engine->processBlock(testBuffer, noteOffBuffer);

        // Process some audio to allow voice cleanup
        engine->processBlock(testBuffer, noteOffBuffer);

        testBuffer.clear();
    }

    // Should still have 0 voices after all cycles
    auto finalStats = engine->getVoiceAllocationStats();
    EXPECT_EQ(finalStats.allocatedVoices, 0) << "Should have 0 voices after all cycles";
}

TEST_F(NexZetaOptimizedTests, VoiceStealingEfficiency) {
    // Test efficient voice stealing under load
    engine->setMaxVoices(8);  // Small voice pool to force stealing

    // Create more simultaneous notes than available voices
    std::vector<int> testNotes = {48, 50, 52, 53, 55, 57, 59, 60, 62, 64};  // 10 notes, only 8 voices

    for (int note : testNotes) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
        testBuffer.clear();
    }

    auto allocationStats = engine->getVoiceAllocationStats();

    // OPTIMIZED: Should maintain high utilization even with voice stealing
    EXPECT_EQ(allocationStats.allocatedVoices, 8) << "Should be using all available voices";
    EXPECT_EQ(allocationStats.efficiency, 1.0f) << "Should have 100% utilization under load";
}

TEST_F(NexZetaOptimizedTests, AllocationMetricsValidation) {
    // Test that allocation metrics provide useful information
    engine->setMaxVoices(16);

    // Create some voice activity
    for (int i = 0; i < 8; ++i) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 48 + i, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
        testBuffer.clear();
    }

    auto metrics = engine->getAllocationMetrics();

    // Should show realistic metrics
    EXPECT_GT(metrics.utilization, 0.4f) << "Should show reasonable utilization";
    EXPECT_LE(metrics.fragmentation, 1.0f) << "Fragmentation should be in valid range";
    EXPECT_GE(metrics.fragmentation, 0.0f) << "Fragmentation should be non-negative";
}

TEST_F(NexZetaOptimizedTests, StressTestWithOptimization) {
    // Stress test with optimization enabled
    engine->setMaxVoices(32);
    engine->enableAdvancedVoiceProcessing(true);

    // Rapid note cycling to stress the allocation system
    for (int cycle = 0; cycle < 5; ++cycle) {
        // Create dense chord
        std::vector<int> chord = {48, 52, 55, 59, 62, 67, 71, 76};  // C Major 7 + extensions

        for (int note : chord) {
            juce::MidiBuffer midiBuffer;
            midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(0.8f * 127.0f)), 0);
            engine->processBlock(testBuffer, midiBuffer);
        }

        auto stats = engine->getVoiceAllocationStats();
        EXPECT_EQ(stats.allocatedVoices, 8) << "Should allocate all chord notes";

        // Release some notes
        for (int i = 0; i < 4; ++i) {
            juce::MidiBuffer noteOffBuffer;
            noteOffBuffer.addEvent(juce::MidiMessage::noteOff(1, chord[i], static_cast<uint8_t>(0.0f)), 0);
            engine->processBlock(testBuffer, noteOffBuffer);
        }

        // Process to update states
        engine->processBlock(testBuffer, midiBuffer);

        testBuffer.clear();
    }

    auto finalMetrics = engine->getAllocationMetrics();

    // Should maintain good performance under stress
    EXPECT_GT(finalMetrics.utilization, 0.1f) << "Should maintain some voice activity";
    EXPECT_LT(finalMetrics.fragmentation, 0.8f) << "Should not have excessive fragmentation";
}

TEST_F(NexZetaOptimizedTests, OptimizeVoiceAllocationFunction) {
    // Test the explicit optimization function
    engine->setMaxVoices(16);

    // Create some scattered voice allocation
    std::vector<int> notes = {48, 60, 72};  // Widely spaced notes

    for (int note : notes) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
        testBuffer.clear();
    }

    // Call optimization
    engine->optimizeVoiceAllocation();

    // Should still work after optimization
    auto postOptStats = engine->getVoiceAllocationStats();
    EXPECT_EQ(postOptStats.allocatedVoices, 3) << "Should maintain allocated voices after optimization";
    EXPECT_GT(postOptStats.efficiency, 0.15f) << "Should maintain efficiency after optimization";
}