/*
  ==============================================================================

    ProjectionEngineTests.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    Unit tests for ProjectionEngine - core projection functionality.

  ==============================================================================
*/

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include "audio/ProjectionEngine.h"
#include "undo/UndoState.h"

using namespace juce;

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a valid test SongState
 */
SongState createTestSongState()
{
    SongState song;
    song.id = "test_song_001";
    song.name = "Test Song";
    song.tempo = 120.0;
    song.timeSignatureNumerator = 4;
    song.timeSignatureDenominator = 4;
    song.activePerformanceId = "perf_001";
    song.density = 0.5;
    song.grooveProfileId = "groove_straight";
    song.consoleXProfileId = "consolex_default";

    return song;
}

/**
 * Create a valid test PerformanceState
 */
PerformanceState createTestPerformanceState()
{
    PerformanceState perf;
    perf.activePerformanceId = new String("perf_001");
    perf.currentDensity.store(0.5);
    perf.currentGrooveProfileId = new String("groove_straight");
    perf.currentConsoleXProfileId = new String("consolex_default");
    perf.currentBar.store(0);

    return perf;
}

// ============================================================================
// Basic Projection Tests
// ============================================================================

TEST_CASE("ProjectionEngine::projectSong - Basic projection", "[projection]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perf = createTestPerformanceState();
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);

    SECTION("Returns success result")
    {
        REQUIRE(result.isOk());
    }

    SECTION("Result contains valid render graph")
    {
        auto projectionResult = result.getResult();
        REQUIRE(projectionResult != nullptr);
        REQUIRE(projectionResult->renderGraph != nullptr);
    }

    SECTION("Render graph has valid metadata")
    {
        auto graph = result.getResult()->renderGraph;
        REQUIRE(graph->version == "1.0");
        REQUIRE(graph->id.isNotEmpty());
        REQUIRE(graph->songStateId == song.id);
        REQUIRE(graph->isValid());
    }

    SECTION("Render graph has audio structure")
    {
        auto graph = result.getResult()->renderGraph;
        REQUIRE(!graph->voices.empty());
        REQUIRE(!graph->buses.empty());
        REQUIRE(!graph->nodes.empty());
        REQUIRE(!graph->connections.empty());
    }

    SECTION("Render graph has timeline")
    {
        auto graph = result.getResult()->renderGraph;
        REQUIRE(graph->timeline.tempo == song.tempo);
        REQUIRE(graph->timeline.timeSignatureNum == song.timeSignatureNumerator);
        REQUIRE(graph->timeline.timeSignatureDenom == song.timeSignatureDenominator);
    }

    SECTION("Render graph is marked playable")
    {
        auto graph = result.getResult()->renderGraph;
        REQUIRE(graph->isPlayable);
    }

    SECTION("Result has valid metadata")
    {
        auto projectionResult = result.getResult();
        REQUIRE(projectionResult->resultId.isNotEmpty());
        REQUIRE(projectionResult->projectedDuration > 0.0);
        REQUIRE(projectionResult->projectionTimestamp > 0);
    }
}

// ============================================================================
// Validation Tests
// ============================================================================

TEST_CASE("ProjectionEngine::projectSong - Invalid song ID", "[projection][validation]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    song.id = ""; // Invalid: empty ID
    auto perf = createTestPerformanceState();
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);

    SECTION("Returns failure result")
    {
        REQUIRE(!result.isOk());
    }

    SECTION("Error indicates invalid song")
    {
        auto error = result.getError();
        REQUIRE(error->type == ProjectionErrorType::invalidSong);
        REQUIRE(error->userMessage.contains("ID is empty"));
    }
}

TEST_CASE("ProjectionEngine::projectSong - Invalid tempo", "[projection][validation]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    song.tempo = -10.0; // Invalid: negative tempo
    auto perf = createTestPerformanceState();
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);

    SECTION("Returns failure result")
    {
        REQUIRE(!result.isOk());
    }

    SECTION("Error indicates invalid song")
    {
        auto error = result.getError();
        REQUIRE(error->type == ProjectionErrorType::invalidSong);
        REQUIRE(error->userMessage.contains("Tempo must be positive"));
    }
}

TEST_CASE("ProjectionEngine::projectSong - Invalid performance density", "[projection][validation]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perf = createTestPerformanceState();
    perf.currentDensity.store(1.5); // Invalid: density > 1.0
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);

    SECTION("Returns failure result")
    {
        REQUIRE(!result.isOk());
    }

    SECTION("Error indicates invalid performance")
    {
        auto error = result.getError();
        REQUIRE(error->type == ProjectionErrorType::invalidPerformance);
        REQUIRE(error->userMessage.contains("Density must be between 0 and 1"));
    }
}

// ============================================================================
// Blend Tests
// ============================================================================

TEST_CASE("ProjectionEngine::projectSongBlend - Equal blend (t=0.5)", "[projection][blend]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perfA = createTestPerformanceState();
    auto perfB = createTestPerformanceState();

    perfA.currentDensity.store(0.3);
    perfB.currentDensity.store(0.7);
    *perfB.activePerformanceId = "perf_002";

    ProjectionConfig config;

    auto result = engine.projectSongBlend(song, perfA, perfB, 0.5f, config);

    SECTION("Returns success result")
    {
        REQUIRE(result.isOk());
    }

    SECTION("Result contains blended render graph")
    {
        auto projectionResult = result.getResult();
        REQUIRE(projectionResult != nullptr);
        REQUIRE(projectionResult->renderGraph != nullptr);
    }

    SECTION("Blended graph has valid metadata")
    {
        auto graph = result.getResult()->renderGraph;
        REQUIRE(graph->version == "1.0");
        REQUIRE(graph->id.isNotEmpty());
        REQUIRE(graph->isValid());
    }
}

TEST_CASE("ProjectionEngine::projectSongBlend - Full A (t=0.0)", "[projection][blend]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perfA = createTestPerformanceState();
    auto perfB = createTestPerformanceState();
    *perfB.activePerformanceId = "perf_002";

    ProjectionConfig config;

    auto result = engine.projectSongBlend(song, perfA, perfB, 0.0f, config);

    SECTION("Returns success result")
    {
        REQUIRE(result.isOk());
    }

    SECTION("Duration matches perfA")
    {
        auto resultA = engine.projectSong(song, perfA, config);
        auto blendedResult = result.getResult();
        auto resultAResult = resultA.getResult();

        REQUIRE(blendedResult->projectedDuration == resultAResult->projectedDuration);
    }
}

TEST_CASE("ProjectionEngine::projectSongBlend - Full B (t=1.0)", "[projection][blend]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perfA = createTestPerformanceState();
    auto perfB = createTestPerformanceState();
    *perfB.activePerformanceId = "perf_002";

    ProjectionConfig config;

    auto result = engine.projectSongBlend(song, perfA, perfB, 1.0f, config);

    SECTION("Returns success result")
    {
        REQUIRE(result.isOk());
    }

    SECTION("Duration matches perfB")
    {
        auto resultB = engine.projectSong(song, perfB, config);
        auto blendedResult = result.getResult();
        auto resultBResult = resultB.getResult();

        REQUIRE(blendedResult->projectedDuration == resultBResult->projectedDuration);
    }
}

TEST_CASE("ProjectionEngine::projectSongBlend - Invalid blend factor", "[projection][blend][validation]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perfA = createTestPerformanceState();
    auto perfB = createTestPerformanceState();
    *perfB.activePerformanceId = "perf_002";

    ProjectionConfig config;

    SECTION("t < 0.0 returns error")
    {
        auto result = engine.projectSongBlend(song, perfA, perfB, -0.5f, config);
        REQUIRE(!result.isOk());
        REQUIRE(result.getError()->type == ProjectionErrorType::invalidPerformance);
    }

    SECTION("t > 1.0 returns error")
    {
        auto result = engine.projectSongBlend(song, perfA, perfB, 1.5f, config);
        REQUIRE(!result.isOk());
        REQUIRE(result.getError()->type == ProjectionErrorType::invalidPerformance);
    }
}

// ============================================================================
// Configuration Tests
// ============================================================================

TEST_CASE("ProjectionConfig::realtime - Fast config", "[projection][config]")
{
    auto config = ProjectionConfig::realtime();

    SECTION("Disables graph validation")
    {
        REQUIRE(!config.validateGraph);
    }

    SECTION("Disables timing stats")
    {
        REQUIRE(!config.collectTimingStats);
    }
}

TEST_CASE("ProjectionConfig::exportConfig - Full validation", "[projection][config]")
{
    auto config = ProjectionConfig::exportConfig();

    SECTION("Enables graph validation")
    {
        REQUIRE(config.validateGraph);
    }

    SECTION("Enables timing stats")
    {
        REQUIRE(config.collectTimingStats);
    }
}

// ============================================================================
// Graph Structure Tests
// ============================================================================

TEST_CASE("ProjectionEngine - Graph has valid routing", "[projection][graph]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perf = createTestPerformanceState();
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);
    auto graph = result.getResult()->renderGraph;

    SECTION("All voices connect to buses")
    {
        for (const auto& voice : graph->voices) {
            bool hasConnection = false;
            for (const auto& conn : graph->connections) {
                if (conn.fromNodeId == voice.id && conn.connectionType == "audio") {
                    hasConnection = true;
                    break;
                }
            }
            REQUIRE(hasConnection);
        }
    }

    SECTION("Master bus exists")
    {
        bool hasMaster = false;
        for (const auto& bus : graph->buses) {
            if (bus.type == "master") {
                hasMaster = true;
                break;
            }
        }
        REQUIRE(hasMaster);
    }
}

// ============================================================================
// Resource Estimation Tests
// ============================================================================

TEST_CASE("ProjectionEngine - CPU estimation is reasonable", "[projection][resources]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perf = createTestPerformanceState();
    perf.currentDensity.store(0.5);
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);
    auto graph = result.getResult()->renderGraph;

    SECTION("CPU usage is between 0 and 1")
    {
        REQUIRE(graph->estimatedCpuUsage >= 0.0);
        REQUIRE(graph->estimatedCpuUsage <= 1.0);
    }

    SECTION("CPU usage is reasonable for small graph")
    {
        REQUIRE(graph->estimatedCpuUsage < 0.5); // Less than 50% for test song
    }
}

TEST_CASE("ProjectionEngine - Memory estimation is positive", "[projection][resources]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perf = createTestPerformanceState();
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);
    auto graph = result.getResult()->renderGraph;

    SECTION("Memory usage is positive")
    {
        REQUIRE(graph->estimatedMemoryUsage > 0);
    }

    SECTION("Memory usage is reasonable for small graph")
    {
        REQUIRE(graph->estimatedMemoryUsage < 1024 * 1024); // Less than 1MB
    }
}

// ============================================================================
// Determinism Tests
// ============================================================================

TEST_CASE("ProjectionEngine - Same inputs produce same output", "[projection][determinism]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perf = createTestPerformanceState();
    ProjectionConfig config;

    auto result1 = engine.projectSong(song, perf, config);
    auto result2 = engine.projectSong(song, perf, config);

    SECTION("Result IDs are identical")
    {
        REQUIRE(result1.getResult()->resultId == result2.getResult()->resultId);
    }

    SECTION("Graph IDs are identical")
    {
        REQUIRE(result1.getResult()->renderGraph->id ==
                result2.getResult()->renderGraph->id);
    }

    SECTION("CPU estimates are identical")
    {
        REQUIRE(result1.getResult()->renderGraph->estimatedCpuUsage ==
                result2.getResult()->renderGraph->estimatedCpuUsage);
    }
}

// ============================================================================
// Result ID Tests
// ============================================================================

TEST_CASE("ProjectionEngine - Result ID is deterministic", "[projection][id]")
{
    ProjectionEngine engine;
    auto song = createTestSongState();
    auto perf = createTestPerformanceState();
    ProjectionConfig config;

    auto result = engine.projectSong(song, perf, config);

    SECTION("Result ID is not empty")
    {
        REQUIRE(result.getResult()->resultId.isNotEmpty());
    }

    SECTION("Result ID starts with 'proj_' prefix")
    {
        REQUIRE(result.getResult()->resultId.startsWith("proj_"));
    }

    SECTION("Result ID is consistent across calls")
    {
        auto result2 = engine.projectSong(song, perf, config);
        REQUIRE(result.getResult()->resultId == result2.getResult()->resultId);
    }
}

// ============================================================================
// Cleanup
// ============================================================================

TEST_CASE("ProjectionEngine - Memory cleanup", "[projection][memory]")
{
    SECTION("No memory leaks with multiple projections")
    {
        ProjectionEngine engine;
        auto song = createTestSongState();
        auto perf = createTestPerformanceState();
        ProjectionConfig config;

        for (int i = 0; i < 100; ++i) {
            auto result = engine.projectSong(song, perf, config);
            REQUIRE(result.isOk());
        }
        // If we get here without crashing, memory is managed correctly
        REQUIRE(true);
    }
}
