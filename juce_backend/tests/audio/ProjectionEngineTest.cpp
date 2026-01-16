/*
  ==============================================================================

    ProjectionEngineTest.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    Tests for ProjectionEngine implementation

  ==============================================================================
*/

#include <juce_core/juce_core.h>
#include <catch2/catch_test_macros.hpp>
#include "../../include/audio/ProjectionEngine.h"
#include "../../include/undo/UndoState.h"

using namespace juce;

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal SongState for testing
 */
SongState createTestSong()
{
    SongState song;
    song.id = "test_song_1";
    song.name = "Test Song";
    song.tempo = 120.0;
    song.timeSignatureNumerator = 4;
    song.timeSignatureDenominator = 4;
    song.activePerformanceId = "test_perf_1";
    song.density = 0.7;
    song.grooveProfileId = "default";
    song.consoleXProfileId = "default";

    // Add some instruments
    song.instrumentIds.add("LocalGal");
    song.instrumentIds.add("NexSynth");
    song.instrumentIds.add("KaneMarcoAether");
    song.instrumentIds.add("DrumMachine");

    return song;
}

/**
 * Create a minimal PerformanceState for testing
 */
PerformanceState createTestPerformance()
{
    PerformanceState perf;
    perf.activePerformanceId = std::make_shared<juce::String>("test_perf_1");
    perf.currentDensity.store(0.8);
    perf.grooveProfileId = "default";
    perf.consoleXProfileId = "default";

    return perf;
}

// ============================================================================
// buildVoices() Tests
// ============================================================================

TEST_CASE("ProjectionEngine::buildVoices creates voices from song instruments", "[projection]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();
    PerformanceState perf = createTestPerformance();

    std::vector<VoiceAssignment> voices = engine.buildVoices(song, perf);

    // Should create 4 voices (one per instrument)
    REQUIRE(voices.size() == 4);

    // Check first voice (LocalGal)
    REQUIRE(voices[0].roleId == "role_0");
    REQUIRE(voices[0].instrumentType == "LocalGal");
    REQUIRE(voices[0].busId == "bus_primary");
    REQUIRE(voices[0].polyphony >= 4);
    REQUIRE(voices[0].polyphony <= 64);

    // Check drum voice
    REQUIRE(voices[3].instrumentType == "DrumMachine");
    REQUIRE(voices[3].busId == "bus_drums");
    REQUIRE(voices[3].polyphony >= 4);
    REQUIRE(voices[3].polyphony <= 64);
}

TEST_CASE("ProjectionEngine::buildVoices applies density scaling to polyphony", "[projection]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();

    // Test with low density
    PerformanceState lowPerf = createTestPerformance();
    lowPerf.currentDensity.store(0.3);

    std::vector<VoiceAssignment> lowVoices = engine.buildVoices(song, lowPerf);

    // Test with high density
    PerformanceState highPerf = createTestPerformance();
    highPerf.currentDensity.store(1.0);

    std::vector<VoiceAssignment> highVoices = engine.buildVoices(song, highPerf);

    // High density should result in higher polyphony
    REQUIRE(highVoices[0].polyphony > lowVoices[0].polyphony);
}

// ============================================================================
// buildBuses() Tests
// ============================================================================

TEST_CASE("ProjectionEngine::buildBuses creates instrument and master buses", "[projection]")
{
    ProjectionEngine engine;
    PerformanceState perf = createTestPerformance();

    std::vector<BusConfig> buses = engine.buildBuses(perf);

    // Should create 4 instrument buses + 1 master bus
    REQUIRE(buses.size() == 5);

    // Check master bus
    REQUIRE(buses[4].id == "master");
    REQUIRE(buses[4].type == "master");
    REQUIRE(buses[4].gain == 1.0f);
    REQUIRE(buses[4].pan == 0.0f);
    REQUIRE(buses[4].muted == false);
    REQUIRE(buses[4].solo == false);

    // Check instrument buses
    REQUIRE(buses[0].id == "bus_primary");
    REQUIRE(buses[1].id == "bus_secondary");
    REQUIRE(buses[2].id == "bus_bass");
    REQUIRE(buses[3].id == "bus_drums");
}

// ============================================================================
// assignNotes() Tests
// ============================================================================

TEST_CASE("ProjectionEngine::assignNotes generates notes for all roles", "[projection]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();
    PerformanceState perf = createTestPerformance();

    std::vector<AssignedNote> notes = engine.assignNotes(song, perf);

    // Should generate notes for all 4 roles
    REQUIRE(!notes.empty());

    // Check that notes have valid properties
    for (const auto& note : notes) {
        REQUIRE(note.id.isNotEmpty());
        REQUIRE(note.voiceId.isNotEmpty());
        REQUIRE(note.roleId.isNotEmpty());
        REQUIRE(note.startTime >= 0);
        REQUIRE(note.duration > 0);
        REQUIRE(note.pitch >= 0);
        REQUIRE(note.pitch <= 127);
        REQUIRE(note.velocity >= 0.0f);
        REQUIRE(note.velocity <= 1.0f);
    }
}

TEST_CASE("ProjectionEngine::assignNotes applies density filtering", "[projection]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();

    // Test with low density
    PerformanceState lowPerf = createTestPerformance();
    lowPerf.currentDensity.store(0.3);

    std::vector<AssignedNote> lowNotes = engine.assignNotes(song, lowPerf);

    // Test with high density
    PerformanceState highPerf = createTestPerformance();
    highPerf.currentDensity.store(1.0);

    std::vector<AssignedNote> highNotes = engine.assignNotes(song, highPerf);

    // High density should result in more notes
    REQUIRE(highNotes.size() > lowNotes.size());
}

// ============================================================================
// buildTimeline() Tests
// ============================================================================

TEST_CASE("ProjectionEngine::buildTimeline creates AABA form sections", "[projection]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();

    Timeline timeline = engine.buildTimeline(song);

    // Should create 4 sections (AABA form)
    REQUIRE(timeline.sections.size() == 4);

    // Check section names
    REQUIRE(timeline.sections[0].name == "A1");
    REQUIRE(timeline.sections[1].name == "A2");
    REQUIRE(timeline.sections[2].name == "B");
    REQUIRE(timeline.sections[3].name == "A3");

    // Check that sections are sequential
    REQUIRE(timeline.sections[0].startTime == 0);
    REQUIRE(timeline.sections[1].startTime > timeline.sections[0].startTime);
    REQUIRE(timeline.sections[2].startTime > timeline.sections[1].startTime);
    REQUIRE(timeline.sections[3].startTime > timeline.sections[2].startTime);

    // Check total duration
    REQUIRE(timeline.duration > 0);
    REQUIRE(timeline.duration == timeline.sections[3].startTime + timeline.sections[3].duration);
}

TEST_CASE("ProjectionEngine::buildTimeline respects song tempo", "[projection]")
{
    ProjectionEngine engine;

    SongState song = createTestSong();
    song.tempo = 60.0;  // Slower tempo = longer duration

    Timeline slowTimeline = engine.buildTimeline(song);

    song.tempo = 120.0;  // Faster tempo = shorter duration
    Timeline fastTimeline = engine.buildTimeline(song);

    // Slower tempo should result in longer duration
    REQUIRE(slowTimeline.duration > fastTimeline.duration);
}

// ============================================================================
// applyPerformanceToSong() Tests
// ============================================================================

TEST_CASE("ProjectionEngine::applyPerformanceToSong applies density", "[projection]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();
    PerformanceState perf = createTestPerformance();

    perf.currentDensity.store(0.6);

    SongState appliedSong = engine.applyPerformanceToSong(song, perf);

    // Density should be applied
    REQUIRE(appliedSong.density == 0.6);
}

TEST_CASE("ProjectionEngine::applyPerformanceToSong preserves song structure", "[projection]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();
    PerformanceState perf = createTestPerformance();

    SongState appliedSong = engine.applyPerformanceToSong(song, perf);

    // Core song properties should be preserved
    REQUIRE(appliedSong.id == song.id);
    REQUIRE(appliedSong.name == song.name);
    REQUIRE(appliedSong.tempo == song.tempo);
    REQUIRE(appliedSong.timeSignatureNumerator == song.timeSignatureNumerator);
    REQUIRE(appliedSong.timeSignatureDenominator == song.timeSignatureDenominator);
}

// ============================================================================
// Integration Tests
// ============================================================================

TEST_CASE("ProjectionEngine::projectSong generates valid render graph", "[projection][integration]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();
    PerformanceState perf = createTestPerformance();

    ProjectionConfig config;
    auto result = engine.projectSong(song, perf, config);

    // Should succeed
    REQUIRE(result.isOk());

    // Should have valid render graph
    auto projectionResult = result.getResult();
    REQUIRE(projectionResult != nullptr);
    REQUIRE(projectionResult->renderGraph != nullptr);
    REQUIRE(projectionResult->renderGraph->isValid());
}

TEST_CASE("ProjectionEngine::projectSong generates voices and notes", "[projection][integration]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();
    PerformanceState perf = createTestPerformance();

    auto result = engine.projectSong(song, perf, ProjectionConfig());

    REQUIRE(result.isOk());

    auto graph = result.getResult()->renderGraph;

    // Should have voices
    REQUIRE(!graph->voices.empty());

    // Should have assigned notes
    REQUIRE(!graph->assignedNotes.empty());

    // Should have timeline sections
    REQUIRE(!graph->timeline.sections.empty());

    // Should have buses
    REQUIRE(!graph->buses.empty());
}

TEST_CASE("ProjectionEngine::projectSong validates input", "[projection][integration]")
{
    ProjectionEngine engine;

    // Invalid song (empty ID)
    SongState invalidSong;
    invalidSong.id = "";
    invalidSong.tempo = 120.0;

    PerformanceState perf = createTestPerformance();

    auto result = engine.projectSong(invalidSong, perf, ProjectionConfig());

    // Should fail with validation error
    REQUIRE(!result.isOk());
    REQUIRE(result.getError()->type == ProjectionErrorType::invalidSong);
}

// ============================================================================
// Performance Tests
// ============================================================================

TEST_CASE("ProjectionEngine::projectSong performs efficiently", "[projection][performance]")
{
    ProjectionEngine engine;
    SongState song = createTestSong();
    PerformanceState perf = createTestPerformance();

    // Measure projection time
    auto startTime = juce::Time::getMillisecondCounter();
    auto result = engine.projectSong(song, perf, ProjectionConfig());
    auto endTime = juce::Time::getMillisecondCounter();

    REQUIRE(result.isOk());

    // Should complete in reasonable time (< 100ms for simple song)
    auto elapsedTime = endTime - startTime;
    REQUIRE(elapsedTime < 100);
}
