/*
  ==============================================================================

    AudioPipelineTests.cpp
    Created: 15 Jan 2026
    Author:  White Room Project

    Comprehensive unit tests for audio pipeline components:
    - NoteEventGenerator
    - Scheduler
    - VoiceManager

  ==============================================================================
*/

#include "../include/audio_pipeline/NoteEventGenerator.h"
#include "../include/audio_pipeline/Scheduler.h"
#include "../include/audio_pipeline/VoiceManager.h"
#include <juce_core/juce_core.h>
#include <cassert>
#include <iostream>
#include <vector>

namespace Schillinger::AudioPipeline::Tests
{

    //==============================================================================
    // Test Utilities
    //==============================================================================

    /** Simple test result tracker */
    class TestRunner
    {
    public:
        int passed = 0;
        int failed = 0;

        void assertTrue(bool condition, const std::string& testName)
        {
            if (condition)
            {
                passed++;
                std::cout << "[PASS] " << testName << std::endl;
            }
            else
            {
                failed++;
                std::cout << "[FAIL] " << testName << std::endl;
            }
        }

        void assertFalse(bool condition, const std::string& testName)
        {
            assertTrue(!condition, testName);
        }

        void printSummary() const
        {
            std::cout << "\n=== Test Summary ===" << std::endl;
            std::cout << "Passed: " << passed << std::endl;
            std::cout << "Failed: " << failed << std::endl;
            std::cout << "Total:  " << (passed + failed) << std::endl;
            std::cout << "===================" << std::endl;
        }

        bool allPassed() const noexcept { return failed == 0; }
    };

    //==============================================================================
    // NoteEventGenerator Tests
    //==============================================================================

    void testNoteEventGenerator_BasicGeneration(TestRunner& runner)
    {
        NoteEventGenerator generator;

        // Create simple timeline
        TimelineIR timeline;
        timeline.tempo = 120.0f;
        timeline.timeSignatureNumerator = 4;
        timeline.timeSignatureDenominator = 4;
        timeline.startTime = 0.0f;
        timeline.endTime = 4.0f; // 1 bar
        timeline.sampleRate = 44100;

        // Create pitch data (middle C, quarter note)
        std::vector<PitchData> pitchData;
        pitchData.emplace_back(60, "derivation-1", 0.8f, 1.0f, 0);

        // Create rhythm data (4 quarter notes)
        RhythmData rhythmData;
        rhythmData.attackPoints = {0.0f, 1.0f, 2.0f, 3.0f};
        rhythmData.derivationId = "rhythm-1";

        // Generate events
        auto events = generator.generate(timeline, pitchData, rhythmData, 16);

        // Should have 4 note-on + 4 note-off = 8 events
        runner.assertTrue(events.size() == 8, "NoteEventGenerator: Generate 8 events (4 on, 4 off)");

        // First event should be note-on at time 0
        runner.assertTrue(events[0].isNoteOn, "NoteEventGenerator: First event is note-on");
        runner.assertTrue(events[0].sampleTime == 0, "NoteEventGenerator: First event at sample 0");
        runner.assertTrue(events[0].noteNumber == 60, "NoteEventGenerator: Correct note number");

        // Should have matching note-offs
        int noteOnCount = 0;
        int noteOffCount = 0;
        for (const auto& event : events)
        {
            if (event.isNoteOn) noteOnCount++;
            else noteOffCount++;
        }

        runner.assertTrue(noteOnCount == 4, "NoteEventGenerator: 4 note-on events");
        runner.assertTrue(noteOffCount == 4, "NoteEventGenerator: 4 note-off events");
    }

    void testNoteEventGenerator_VoiceAssignment(TestRunner& runner)
    {
        NoteEventGenerator generator;
        generator.setMaxVoices(8);

        TimelineIR timeline;
        timeline.tempo = 120.0f;
        timeline.timeSignatureNumerator = 4;
        timeline.timeSignatureDenominator = 4;
        timeline.startTime = 0.0f;
        timeline.endTime = 0.0f;
        timeline.sampleRate = 44100;

        std::vector<PitchData> pitchData;
        pitchData.emplace_back(60, "derivation-1", 0.8f, 1.0f, 0);

        RhythmData rhythmData;
        rhythmData.attackPoints = {0.0f, 0.5f, 1.0f, 1.5f}; // 4 attacks
        rhythmData.derivationId = "rhythm-1";

        auto events = generator.generate(timeline, pitchData, rhythmData, 8);

        // Check voice IDs are assigned
        bool allVoicesValid = true;
        for (const auto& event : events)
        {
            if (event.voiceId < 0 || event.voiceId >= 8)
            {
                allVoicesValid = false;
                break;
            }
        }

        runner.assertTrue(allVoicesValid, "NoteEventGenerator: All voice IDs valid");
    }

    void testNoteEventGenerator_TimingAccuracy(TestRunner& runner)
    {
        NoteEventGenerator generator;

        TimelineIR timeline;
        timeline.tempo = 120.0f; // 120 BPM = 2 beats per second
        timeline.timeSignatureNumerator = 4;
        timeline.timeSignatureDenominator = 4;
        timeline.startTime = 0.0f;
        timeline.endTime = 0.0f;
        timeline.sampleRate = 44100;

        std::vector<PitchData> pitchData;
        pitchData.emplace_back(60, "derivation-1", 0.8f, 1.0f, 0); // 1 beat duration

        RhythmData rhythmData;
        rhythmData.attackPoints = {0.0f, 1.0f}; // 2 attacks
        rhythmData.derivationId = "rhythm-1";

        auto events = generator.generate(timeline, pitchData, rhythmData);

        // At 120 BPM, 1 beat = 0.5 seconds = 22050 samples at 44100 Hz
        const int64_t expectedBeatSamples = 22050;

        runner.assertTrue(events[0].sampleTime == 0, "NoteEventGenerator: First event at 0");
        runner.assertTrue(events[1].sampleTime == expectedBeatSamples,
                         "NoteEventGenerator: Second event at correct time");
    }

    //==============================================================================
    // Scheduler Tests
    //==============================================================================

    void testScheduler_Lookahead(TestRunner& runner)
    {
        Scheduler scheduler;
        scheduler.prepare(44100.0, 512);

        // Check default lookahead
        runner.assertTrue(scheduler.getLookahead() == 200, "Scheduler: Default lookahead 200ms");

        // Check lookahead in samples
        const int64_t expectedLookaheadSamples = static_cast<int64_t>((200.0 / 1000.0) * 44100.0);
        runner.assertTrue(scheduler.getLookaheadSamples() == expectedLookaheadSamples,
                         "Scheduler: Lookahead samples calculated correctly");
    }

    void testScheduler_EventScheduling(TestRunner& runner)
    {
        Scheduler scheduler;
        scheduler.prepare(44100.0, 512);

        // Create timeline
        TimelineIR timeline;
        timeline.tempo = 120.0f;
        timeline.timeSignatureNumerator = 4;
        timeline.timeSignatureDenominator = 4;
        timeline.startTime = 0.0f;
        timeline.endTime = 0.0f;
        timeline.sampleRate = 44100;

        // Create events
        std::vector<NoteEvent> events;
        events.emplace_back(0, 60, 0.8f, 0, "derivation-1", 22050.0f); // Note-on at 0
        events.emplace_back(22050, 60, 0); // Note-off at 1 beat

        // Schedule events
        scheduler.schedule(timeline, events);

        runner.assertTrue(scheduler.getCurrentSample() == 0, "Scheduler: Current sample starts at 0");

        // Process 512 samples
        scheduler.process(512);
        runner.assertTrue(scheduler.getCurrentSample() == 512, "Scheduler: Current sample updated after process");
    }

    void testScheduler_LoopPoints(TestRunner& runner)
    {
        Scheduler scheduler;
        scheduler.prepare(44100.0, 512);

        // Set loop points
        const int64_t loopStart = 0;
        const int64_t loopEnd = 44100; // 1 second
        scheduler.setLoopPoints(loopStart, loopEnd);
        scheduler.setLooping(true);

        runner.assertTrue(scheduler.isLooping(), "Scheduler: Looping enabled");

        // Process beyond loop end
        scheduler.process(51200); // Process ~1.16 seconds

        // Should have wrapped around
        const int64_t currentSample = scheduler.getCurrentSample();
        const int64_t loopLength = loopEnd - loopStart;
        const int64_t expectedPosition = 51200 % loopLength;

        runner.assertTrue(currentSample == expectedPosition,
                         "Scheduler: Loop point wrapping works correctly");
    }

    void testScheduler_TempoChange(TestRunner& runner)
    {
        Scheduler scheduler;
        scheduler.prepare(44100.0, 512);

        // Set initial tempo
        scheduler.setTempo(120.0f);
        runner.assertTrue(scheduler.getTempo() == 120.0f, "Scheduler: Initial tempo set");

        // Change tempo
        scheduler.setTempo(140.0f);
        runner.assertTrue(scheduler.getTempo() == 140.0f, "Scheduler: Tempo changed");

        // Invalid tempo should be rejected
        scheduler.setTempo(-1.0f);
        runner.assertTrue(scheduler.getTempo() == 140.0f, "Scheduler: Invalid tempo rejected");
    }

    //==============================================================================
    // VoiceManager Tests
    //==============================================================================

    void testVoiceManager_BasicAllocation(TestRunner& runner)
    {
        VoiceManager manager(16);

        // Allocate voice
        int voiceId = manager.allocateVoice(60, VoicePriority::PRIMARY, 0, "derivation-1");

        runner.assertTrue(voiceId >= 0 && voiceId < 16, "VoiceManager: Valid voice ID allocated");
        runner.assertTrue(manager.getActiveVoiceCount() == 1, "VoiceManager: One active voice");

        // Check voice state
        const Voice* voice = manager.getVoice(voiceId);
        runner.assertTrue(voice != nullptr, "VoiceManager: Can retrieve allocated voice");
        runner.assertTrue(voice->active, "VoiceManager: Voice is active");
        runner.assertTrue(voice->noteNumber == 60, "VoiceManager: Correct note number");
    }

    void testVoiceManager_Deallocation(TestRunner& runner)
    {
        VoiceManager manager(16);

        // Allocate and deallocate
        int voiceId = manager.allocateVoice(60, VoicePriority::PRIMARY, 0, "derivation-1");
        runner.assertTrue(manager.getActiveVoiceCount() == 1, "VoiceManager: Voice allocated");

        manager.deallocateVoice(voiceId, 60);
        runner.assertTrue(manager.getActiveVoiceCount() == 0, "VoiceManager: Voice deallocated");

        const Voice* voice = manager.getVoice(voiceId);
        runner.assertTrue(voice != nullptr && !voice->active, "VoiceManager: Voice is inactive");
    }

    void testVoiceManager_VoiceStealing(TestRunner& runner)
    {
        VoiceManager manager(4); // Only 4 voices

        // Allocate all voices
        std::vector<int> voiceIds;
        for (int i = 0; i < 4; ++i)
        {
            int id = manager.allocateVoice(60 + i, VoicePriority::SECONDARY, i * 100);
            voiceIds.push_back(id);
        }

        runner.assertTrue(manager.getActiveVoiceCount() == 4, "VoiceManager: All voices allocated");
        runner.assertTrue(manager.isPolyphonyExceeded(), "VoiceManager: Polyphony exceeded");

        // Allocate one more - should steal
        int stolenVoice = manager.allocateVoice(64, VoicePriority::PRIMARY, 400);

        runner.assertTrue(stolenVoice >= 0, "VoiceManager: Voice stolen successfully");
        runner.assertTrue(manager.getActiveVoiceCount() == 4, "VoiceManager: Still 4 active voices");

        // Check stealing statistics
        const auto& stats = manager.getStealingStats();
        runner.assertTrue(stats.totalSteals == 1, "VoiceManager: One steal recorded");
    }

    void testVoiceManager_PriorityStealing(TestRunner& runner)
    {
        VoiceManager manager(4);

        // Allocate with different priorities
        manager.allocateVoice(60, VoicePriority::PRIMARY, 0);
        manager.allocateVoice(62, VoicePriority::SECONDARY, 100);
        manager.allocateVoice(64, VoicePriority::TERTIARY, 200);
        manager.allocateVoice(66, VoicePriority::TERTIARY, 300);

        // Allocate with PRIMARY priority - should steal from TERTIARY
        int stolenId = manager.allocateVoice(68, VoicePriority::PRIMARY, 400);

        const auto& stats = manager.getStealingStats();
        runner.assertTrue(stats.tertiarySteals > 0, "VoiceManager: Stole from tertiary priority");
    }

    void testVoiceManager_ActiveVoices(TestRunner& runner)
    {
        VoiceManager manager(16);

        // Allocate multiple voices
        std::vector<int> voiceIds;
        for (int i = 0; i < 5; ++i)
        {
            voiceIds.push_back(manager.allocateVoice(60 + i, VoicePriority::PRIMARY, i * 100));
        }

        auto activeVoices = manager.getActiveVoices();
        runner.assertTrue(activeVoices.size() == 5, "VoiceManager: Correct number of active voices");

        // Deallocate some
        manager.deallocateVoice(voiceIds[0], 60);
        manager.deallocateVoice(voiceIds[2], 62);

        activeVoices = manager.getActiveVoices();
        runner.assertTrue(activeVoices.size() == 3, "VoiceManager: Correct active voices after deallocation");
    }

    void testVoiceManager_VoiceUsage(TestRunner& runner)
    {
        VoiceManager manager(10);

        runner.assertTrue(manager.getVoiceUsage() == 0.0f, "VoiceManager: Zero usage when empty");

        // Allocate half the voices
        for (int i = 0; i < 5; ++i)
        {
            manager.allocateVoice(60 + i, VoicePriority::PRIMARY, i * 100);
        }

        float usage = manager.getVoiceUsage();
        runner.assertTrue(usage > 0.49f && usage < 0.51f, "VoiceManager: 50% voice usage reported");
    }

    //==============================================================================
    // Integration Tests
    //==============================================================================

    void testIntegration_FullPipeline(TestRunner& runner)
    {
        // Create all components
        NoteEventGenerator generator;
        Scheduler scheduler;
        VoiceManager voiceManager(16);

        // Prepare scheduler
        scheduler.prepare(44100.0, 512);

        // Create timeline
        TimelineIR timeline;
        timeline.tempo = 120.0f;
        timeline.timeSignatureNumerator = 4;
        timeline.timeSignatureDenominator = 4;
        timeline.startTime = 0.0f;
        timeline.endTime = 4.0f;
        timeline.sampleRate = 44100;

        // Create pitch data
        std::vector<PitchData> pitchData;
        pitchData.emplace_back(60, "derivation-1", 0.8f, 1.0f, 0);

        // Create rhythm data
        RhythmData rhythmData;
        rhythmData.attackPoints = {0.0f, 1.0f, 2.0f, 3.0f};
        rhythmData.derivationId = "rhythm-1";

        // Generate note events
        auto noteEvents = generator.generate(timeline, pitchData, rhythmData, 16);

        runner.assertTrue(!noteEvents.empty(), "Integration: Note events generated");

        // Schedule events
        scheduler.schedule(timeline, noteEvents);

        // Process audio blocks
        for (int i = 0; i < 10; ++i)
        {
            scheduler.process(512);
        }

        runner.assertTrue(scheduler.getCurrentSample() > 0, "Integration: Scheduler processed samples");
    }

    //==============================================================================
    // Main Test Runner
    //==============================================================================

    int runAllTests()
    {
        std::cout << "\n=== Audio Pipeline Unit Tests ===" << std::endl;
        std::cout << "Testing NoteEventGenerator, Scheduler, and VoiceManager\n" << std::endl;

        TestRunner runner;

        // NoteEventGenerator Tests
        std::cout << "\n--- NoteEventGenerator Tests ---" << std::endl;
        testNoteEventGenerator_BasicGeneration(runner);
        testNoteEventGenerator_VoiceAssignment(runner);
        testNoteEventGenerator_TimingAccuracy(runner);

        // Scheduler Tests
        std::cout << "\n--- Scheduler Tests ---" << std::endl;
        testScheduler_Lookahead(runner);
        testScheduler_EventScheduling(runner);
        testScheduler_LoopPoints(runner);
        testScheduler_TempoChange(runner);

        // VoiceManager Tests
        std::cout << "\n--- VoiceManager Tests ---" << std::endl;
        testVoiceManager_BasicAllocation(runner);
        testVoiceManager_Deallocation(runner);
        testVoiceManager_VoiceStealing(runner);
        testVoiceManager_PriorityStealing(runner);
        testVoiceManager_ActiveVoices(runner);
        testVoiceManager_VoiceUsage(runner);

        // Integration Tests
        std::cout << "\n--- Integration Tests ---" << std::endl;
        testIntegration_FullPipeline(runner);

        // Print summary
        runner.printSummary();

        return runner.allPassed() ? 0 : 1;
    }

} // namespace Schillinger::AudioPipeline::Tests

//==============================================================================
// Main Entry Point
//==============================================================================

int main(int argc, char* argv[])
{
    return Schillinger::AudioPipeline::Tests::runAllTests();
}
