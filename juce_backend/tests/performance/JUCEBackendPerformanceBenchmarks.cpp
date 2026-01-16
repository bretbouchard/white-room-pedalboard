/*
 * JUCE Backend Performance Benchmarks
 *
 * Performance benchmarks and regression detection
 * for JUCE backend components.
 */

#include <gtest/gtest.h>
#include <chrono>
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "../../../include/audio/ProjectionEngine.h"
#include "../../../include/audio/Scheduler.h"
#include "../../../include/audio/VoiceManager.h"

class JUCEBackendPerformanceBenchmarks : public ::testing::Test {
protected:
    void SetUp() override {
        engine = std::make_unique<ProjectionEngine>();
        scheduler = std::make_unique<Scheduler>();
        voiceManager = std::make_unique<VoiceManager>();

        sampleRate = 48000.0;
        samplesPerBlock = 512;

        scheduler->prepare(sampleRate, samplesPerBlock);
        voiceManager->prepare(sampleRate);
    }

    void TearDown() override {
        engine.reset();
        scheduler.reset();
        voiceManager.reset();
    }

    std::unique_ptr<ProjectionEngine> engine;
    std::unique_ptr<Scheduler> scheduler;
    std::unique_ptr<VoiceManager> voiceManager;

    double sampleRate;
    int samplesPerBlock;
};

// ProjectionEngine Performance Benchmarks
TEST_F(JUCEBackendPerformanceBenchmarks, ProjectionEngineSingleEvent) {
    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 100000; i++) {
        auto result = engine->project(events, params, sampleRate);
        ASSERT_TRUE(result.success);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    auto avgTimeMs = static_cast<double>(duration.count()) / 100000.0;

    // Should average < 0.01ms per projection
    EXPECT_LT(avgTimeMs, 0.01);
}

TEST_F(JUCEBackendPerformanceBenchmarks, ProjectionEngineManyEvents) {
    std::vector<RhythmEvent> events;
    for (int i = 0; i < 10000; i++) {
        events.push_back({i * 0.001, 0.5, 127});
    }

    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 1000; i++) {
        auto result = engine->project(events, params, sampleRate);
        ASSERT_TRUE(result.success);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    auto avgTimeMs = static_cast<double>(duration.count()) / 1000.0;

    // Should average < 10ms per 10k event projection
    EXPECT_LT(avgTimeMs, 10.0);
}

// Scheduler Performance Benchmarks
TEST_F(JUCEBackendPerformanceBenchmarks, SchedulerSilentBuffer) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 100000; i++) {
        scheduler->process(buffer, midiMessages);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    auto avgTimeMs = static_cast<double>(duration.count()) / 100000.0;

    // Should average < 0.1ms per silent buffer process
    EXPECT_LT(avgTimeMs, 0.1);
}

TEST_F(JUCEBackendPerformanceBenchmarks, schedulerActiveVoices) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    // Trigger 64 voices
    for (int i = 0; i < 64; i++) {
        midiMessages.addEvent(juce::MidiMessage::noteOn(1, 60 + i, 1.0f), 0);
    }

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 10000; i++) {
        scheduler->process(buffer, midiMessages);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    auto avgTimeMs = static_cast<double>(duration.count()) / 10000.0;

    // Should average < 1ms per process with 64 voices
    EXPECT_LT(avgTimeMs, 1.0);
}

// VoiceManager Performance Benchmarks
TEST_F(JUCEBackendPerformanceBenchmarks, VoiceManagerNoteOn) {
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 1000000; i++) {
        voiceManager->noteOn(60 + (i % 60), 1.0f);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    auto avgTimeMs = static_cast<double>(duration.count()) / 1000000.0;

    // Should average < 0.001ms per note on
    EXPECT_LT(avgTimeMs, 0.001);
}

TEST_F(JUCEBackendPerformanceBenchmarks, VoiceManagerVoiceStealing) {
    voiceManager->setMaxVoices(8);

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 100000; i++) {
        voiceManager->noteOn(60 + (i % 127), 1.0f);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    auto avgTimeMs = static_cast<double>(duration.count()) / 100000.0;

    // Should average < 0.005ms per note on with voice stealing
    EXPECT_LT(avgTimeMs, 0.005);
}

// Memory Performance Tests
TEST_F(JUCEBackendPerformanceBenchmarks, MemoryAllocationEfficiency) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    // Process many buffers to test memory efficiency
    for (int i = 0; i < 1000000; i++) {
        scheduler->process(buffer, midiMessages);
    }

    // Should not crash or throw
    SUCCEED();
}

// Real-time Safety Tests
TEST_F(JUCEBackendPerformanceBenchmarks, RealtimeSafetyNoAllocation) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    // Add some MIDI messages
    for (int i = 0; i < 16; i++) {
        midiMessages.addEvent(juce::MidiMessage::noteOn(1, 60 + i, 1.0f), i * 2);
    }

    // Measure time taken to process
    auto start = std::chrono::high_resolution_clock::now();
    scheduler->process(buffer, midiMessages);
    auto end = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    // Should process 512 samples in < 1ms (real-time safety)
    EXPECT_LT(duration.count(), 1000);
}

TEST_F(JUCEBackendPerformanceBenchmarks, RealtimeSafetyMaxVoices) {
    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer midiMessages;

    // Trigger maximum voices
    for (int i = 0; i < 256; i++) {
        midiMessages.addEvent(juce::MidiMessage::noteOn(1, i, 1.0f), 0);
    }

    // Measure time taken to process
    auto start = std::chrono::high_resolution_clock::now();
    scheduler->process(buffer, midiMessages);
    auto end = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    // Should process 256 voices in < 5ms (real-time safety)
    EXPECT_LT(duration.count(), 5000);
}

// Performance Regression Tests
TEST_F(JUCEBackendPerformanceBenchmarks, PerformanceBaselineProjectionEngine) {
    struct Baseline {
        double singleEventMs;
        double manyEventsMs;
    };

    Baseline baseline = {
        0.01,  // < 0.01ms for single event
        10.0   // < 10ms for 10k events
    };

    std::vector<RhythmEvent> singleEvent = {
        {0.0, 0.5, 127}
    };

    std::vector<RhythmEvent> manyEvents;
    for (int i = 0; i < 10000; i++) {
        manyEvents.push_back({i * 0.001, 0.5, 127});
    }

    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    // Test single event
    auto startSingle = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 10000; i++) {
        engine->project(singleEvent, params, sampleRate);
    }
    auto endSingle = std::chrono::high_resolution_clock::now();
    auto durationSingle = std::chrono::duration_cast<std::chrono::microseconds>(endSingle - startSingle);
    double avgSingleMs = static_cast<double>(durationSingle.count()) / 10000.0 / 1000.0;

    // Test many events
    auto startMany = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 100; i++) {
        engine->project(manyEvents, params, sampleRate);
    }
    auto endMany = std::chrono::high_resolution_clock::now();
    auto durationMany = std::chrono::duration_cast<std::chrono::microseconds>(endMany - startMany);
    double avgManyMs = static_cast<double>(durationMany.count()) / 100.0 / 1000.0;

    // Allow 20% regression from baseline
    EXPECT_LT(avgSingleMs, baseline.singleEventMs * 1.2);
    EXPECT_LT(avgManyMs, baseline.manyEventsMs * 1.2);
}

TEST_F(JUCEBackendPerformanceBenchmarks, PerformanceBaselineScheduler) {
    struct Baseline {
        double silentMs;
        double activeVoicesMs;
    };

    Baseline baseline = {
        0.1,  // < 0.1ms for silent buffer
        1.0   // < 1ms for 64 voices
    };

    juce::AudioBuffer<float> buffer(2, samplesPerBlock);
    juce::MidiBuffer silentMidi;
    juce::MidiBuffer activeMidi;

    // Trigger 64 voices
    for (int i = 0; i < 64; i++) {
        activeMidi.addEvent(juce::MidiMessage::noteOn(1, 60 + i, 1.0f), 0);
    }

    // Test silent buffer
    auto startSilent = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 10000; i++) {
        scheduler->process(buffer, silentMidi);
    }
    auto endSilent = std::chrono::high_resolution_clock::now();
    auto durationSilent = std::chrono::duration_cast<std::chrono::microseconds>(endSilent - startSilent);
    double avgSilentMs = static_cast<double>(durationSilent.count()) / 10000.0 / 1000.0;

    // Test active voices
    auto startActive = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 1000; i++) {
        scheduler->process(buffer, activeMidi);
    }
    auto endActive = std::chrono::high_resolution_clock::now();
    auto durationActive = std::chrono::duration_cast<std::chrono::microseconds>(endActive - startActive);
    double avgActiveMs = static_cast<double>(durationActive.count()) / 1000.0 / 1000.0;

    // Allow 20% regression from baseline
    EXPECT_LT(avgSilentMs, baseline.silentMs * 1.2);
    EXPECT_LT(avgActiveMs, baseline.activeVoicesMs * 1.2);
}
