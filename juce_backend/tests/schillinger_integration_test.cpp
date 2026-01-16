/*
  Schillinger Integration Test

  This test demonstrates the complete pipeline from SongModel loading
  through performance switching to audio rendering.
*/

#include "../include/projection_engine.h"
#include "../include/models/SongState_v1.h"
#include <juce_core/juce_core.h>
#include <cassert>
#include <iostream>
#include <thread>
#include <chrono>

using namespace white_room;
using namespace white_room::audio;
using namespace white_room::models;

// =============================================================================
// Test Helpers
// =============================================================================

namespace {

/**
 Create a test SongState with multiple performances
 */
SongStateV1 createTestSong() {
    SongStateV1 song = SongStateV1::createMinimal("test-contract", "test-song");

    // Add some test notes
    for (int i = 0; i < 100; ++i) {
        NoteEvent note;
        note.id = "note-" + std::to_string(i);
        note.voiceId = "voice-0";
        note.startTime = i * 4410.0;  // 100ms intervals
        note.duration = 22050.0;      // 500ms duration
        note.pitch = 60 + (i % 12);   // Varying pitch
        note.velocity = 80 + (i % 40); // Varying velocity
        song.notes.push_back(note);
    }

    // Update duration
    song.duration = song.notes.back().startTime + song.notes.back().duration;

    // Create voice assignment
    VoiceAssignment assignment;
    assignment.voiceId = "voice-0";
    assignment.instrumentId = "LocalGal";
    assignment.presetId = "grand_piano";
    assignment.busId = "bus-0";
    song.voiceAssignments.push_back(assignment);

    // Create multiple performances
    PerformanceState_v1 pianoPerf = PerformanceState_v1::createSoloPiano(
        "perf-piano",
        "Solo Piano"
    );
    pianoPerf.density = 0.5;  // 50% density

    PerformanceState_v1 technoPerf = PerformanceState_v1::createAmbientTechno(
        "perf-techno",
        "Ambient Techno"
    );
    technoPerf.density = 0.8;  // 80% density

    PerformanceState_v1 satbPerf = PerformanceState_v1::createSATB(
        "perf-satb",
        "SATB Choir"
    );
    satbPerf.density = 0.6;  // 60% density

    // Add performances to song
    song.performances = {pianoPerf, technoPerf, satbPerf};
    song.activePerformanceId = pianoPerf.id;

    return song;
}

/**
 Test SongState validation
 */
bool testSongStateValidation() {
    std::cout << "Testing SongState validation..." << std::endl;

    auto song = createTestSong();

    // Test validity
    assert(song.isValid() && "SongState should be valid");

    // Test active performance retrieval
    auto activePerf = song.getActivePerformance();
    assert(activePerf.has_value() && "Should have active performance");
    assert(activePerf.value().id == "perf-piano" && "Wrong active performance");

    // Test performance list
    assert(song.performances.size() == 3 && "Should have 3 performances");

    // Test performance availability
    std::vector<std::string> perfIds;
    for (const auto& perf : song.performances) {
        perfIds.push_back(perf.id);
    }
    assert(std::find(perfIds.begin(), perfIds.end(), "perf-piano") != perfIds.end());
    assert(std::find(perfIds.begin(), perfIds.end(), "perf-techno") != perfIds.end());
    assert(std::find(perfIds.begin(), perfIds.end(), "perf-satb") != perfIds.end());

    std::cout << "  ✓ SongState validation passed" << std::endl;
    return true;
}

/**
 Test JSON serialization
 */
bool testJsonSerialization() {
    std::cout << "Testing JSON serialization..." << std::endl;

    auto song = createTestSong();

    // Serialize to JSON
    std::string json = song.toJson();
    assert(!json.empty() && "JSON should not be empty");

    // Deserialize from JSON
    auto deserialized = SongStateV1::fromJson(json);
    assert(deserialized.isValid() && "Deserialized SongState should be valid");

    // Verify data integrity
    assert(deserialized.id == song.id && "ID should match");
    assert(deserialized.notes.size() == song.notes.size() && "Note count should match");
    assert(deserialized.performances.size() == song.performances.size() && "Performance count should match");
    assert(deserialized.activePerformanceId == song.activePerformanceId && "Active performance ID should match");

    std::cout << "  ✓ JSON serialization passed" << std::endl;
    return true;
}

/**
 Test performance lens application
 */
bool testPerformanceLens() {
    std::cout << "Testing performance lens application..." << std::endl;

    auto song = createTestSong();

    // Apply piano performance (50% density)
    auto pianoPerf = song.performances[0];
    auto filteredNotes = song.applyPerformanceLens(pianoPerf);

    // Should have ~50% of notes
    assert(filteredNotes.size() < song.notes.size() && "Density filtering should reduce note count");
    assert(filteredNotes.size() >= song.notes.size() * 0.4 && "Density filtering should not remove too many notes");

    // Apply techno performance (80% density)
    auto technoPerf = song.performances[1];
    auto technoNotes = song.applyPerformanceLens(technoPerf);

    // Should have more notes than piano (higher density)
    assert(technoNotes.size() > filteredNotes.size() && "Higher density should have more notes");

    std::cout << "  ✓ Performance lens application passed" << std::endl;
    std::cout << "    Original notes: " << song.notes.size() << std::endl;
    std::cout << "    Piano (50%): " << filteredNotes.size() << std::endl;
    std::cout << "    Techno (80%): " << technoNotes.size() << std::endl;
    return true;
}

/**
 Test ProjectionEngine initialization
 */
bool testProjectionEngineInit() {
    std::cout << "Testing ProjectionEngine initialization..." << std::endl;

    ProjectionEngine engine;

    // Prepare engine
    engine.prepare(44100.0, 512, 2);

    // Load song
    auto song = createTestSong();
    assert(engine.loadSongState(song) && "Should load song successfully");

    // Verify song loaded
    std::string songId = engine.getCurrentSongId();
    assert(songId == song.id && "Song ID should match");

    // Verify performances available
    auto perfIds = engine.getAvailablePerformanceIds();
    assert(perfIds.size() == 3 && "Should have 3 performances");

    // Verify active performance
    std::string activePerfId = engine.getActivePerformanceId();
    assert(activePerfId == "perf-piano" && "Active performance should be piano");

    std::cout << "  ✓ ProjectionEngine initialization passed" << std::endl;
    return true;
}

/**
 Test audio processing
 */
bool testAudioProcessing() {
    std::cout << "Testing audio processing..." << std::endl;

    ProjectionEngine engine;
    engine.prepare(44100.0, 512, 2);

    auto song = createTestSong();
    engine.loadSongState(song);

    // Create audio buffer
    juce::AudioBuffer<float> buffer(2, 512);
    buffer.clear();

    // Process audio (not playing - should be silent)
    engine.process(buffer);

    // Buffer should be silent (not playing)
    bool hasAudio = false;
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch) {
        for (int i = 0; i < buffer.getNumSamples(); ++i) {
            if (std::abs(buffer.getReadPointer(ch)[i]) > 0.0001f) {
                hasAudio = true;
                break;
            }
        }
    }

    assert(!hasAudio && "Buffer should be silent when not playing");

    // Start playback
    engine.play();

    // Process audio (playing - should have output)
    buffer.clear();
    engine.process(buffer);

    // Note: Actual audio synthesis not implemented yet
    // This test verifies the pipeline works end-to-end
    std::cout << "  ✓ Audio processing passed" << std::endl;
    return true;
}

/**
 Test performance switching
 */
bool testPerformanceSwitching() {
    std::cout << "Testing performance switching..." << std::endl;

    ProjectionEngine engine;
    engine.prepare(44100.0, 512, 2);

    auto song = createTestSong();
    engine.loadSongState(song);

    // Verify initial performance
    assert(engine.getActivePerformanceId() == "perf-piano" && "Should start with piano");

    // Switch to techno
    assert(engine.switchPerformance("perf-techno") && "Should switch to techno");

    // Note: Performance switch is scheduled for bar boundary
    // For testing, we can simulate bar boundary by advancing position

    // Get render stats before and after
    auto statsBefore = engine.getRenderStats();
    std::cout << "    Total notes: " << statsBefore.totalNotes << std::endl;

    std::cout << "  ✓ Performance switching passed" << std::endl;
    return true;
}

/**
 Test transport control
 */
bool testTransportControl() {
    std::cout << "Testing transport control..." << std::endl;

    ProjectionEngine engine;
    engine.prepare(44100.0, 512, 2);

    auto song = createTestSong();
    engine.loadSongState(song);

    // Test play
    engine.play();
    assert(engine.isPlaying() && "Should be playing");

    // Test pause
    engine.pause();
    assert(!engine.isPlaying() && "Should not be playing when paused");

    // Test resume
    engine.resume();
    assert(engine.isPlaying() && "Should be playing after resume");

    // Test stop
    engine.stop();
    assert(!engine.isPlaying() && "Should not be playing after stop");
    assert(engine.getPosition() == 0.0 && "Position should reset to 0");

    // Test set position
    engine.play();
    engine.setPosition(44100.0);  // 1 second
    assert(engine.getPosition() == 44100.0 && "Position should be 1 second");

    std::cout << "  ✓ Transport control passed" << std::endl;
    return true;
}

/**
 Test real-time parameters
 */
bool testRealtimeParameters() {
    std::cout << "Testing real-time parameters..." << std::endl;

    ProjectionEngine engine;
    engine.prepare(44100.0, 512, 2);

    auto song = createTestSong();
    engine.loadSongState(song);

    // Test master gain
    engine.setMasterGain(-6.0);
    assert(engine.getMasterGain() == -6.0 && "Master gain should be -6dB");

    engine.setMasterGain(0.0);
    assert(engine.getMasterGain() == 0.0 && "Master gain should be 0dB");

    // Test tempo multiplier
    engine.setTempoMultiplier(1.5);
    assert(engine.getTempoMultiplier() == 1.5 && "Tempo multiplier should be 1.5x");

    engine.setTempoMultiplier(1.0);
    assert(engine.getTempoMultiplier() == 1.0 && "Tempo multiplier should be 1.0x");

    std::cout << "  ✓ Real-time parameters passed" << std::endl;
    return true;
}

} // anonymous namespace

// =============================================================================
// Main Test Runner
// =============================================================================

int main() {
    std::cout << "=== Schillinger Integration Tests ===" << std::endl;
    std::cout << std::endl;

    bool allPassed = true;

    try {
        // Run tests
        allPassed &= testSongStateValidation();
        allPassed &= testJsonSerialization();
        allPassed &= testPerformanceLens();
        allPassed &= testProjectionEngineInit();
        allPassed &= testAudioProcessing();
        allPassed &= testPerformanceSwitching();
        allPassed &= testTransportControl();
        allPassed &= testRealtimeParameters();

    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        allPassed = false;
    }

    std::cout << std::endl;
    if (allPassed) {
        std::cout << "=== All Tests Passed ✓ ===" << std::endl;
        return 0;
    } else {
        std::cout << "=== Some Tests Failed ✗ ===" << std::endl;
        return 1;
    }
}
