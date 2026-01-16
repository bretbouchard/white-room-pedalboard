/*
 * ProjectionEngine Critical Paths Tests
 *
 * Tests for critical paths, edge cases, and error handling
 * in the ProjectionEngine audio processing component.
 */

#include <gtest/gtest.h>
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "../../../include/audio/ProjectionEngine.h"
#include "../../../include/audio/BaseAnalyzer.h"

class ProjectionEngineCriticalPathsTest : public ::testing::Test {
protected:
    void SetUp() override {
        engine = std::make_unique<ProjectionEngine>();
        sampleRate = 48000.0;
        samplesPerBlock = 512;
    }

    void TearDown() override {
        engine.reset();
    }

    std::unique_ptr<ProjectionEngine> engine;
    double sampleRate;
    int samplesPerBlock;
};

// Boundary Conditions
TEST_F(ProjectionEngineCriticalPathsTest, HandlesZeroEvents) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    ProjectionResult result = engine->project({}, params, sampleRate);

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.projectedEvents.size(), 0);
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesSingleEvent) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.projectedEvents.size(), 1);
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesMaximumIntensity) {
    ProjectionParams params;
    params.intensity = 1.0f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
    EXPECT_GT(result.projectedEvents[0].velocity, 0);
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesMinimumIntensity) {
    ProjectionParams params;
    params.intensity = 0.0f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
    EXPECT_GE(result.projectedEvents[0].velocity, 0);
    EXPECT_LE(result.projectedEvents[0].velocity, 127);
}

// Error Handling
TEST_F(ProjectionEngineCriticalPathsTest, HandlesNegativeEventTime) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {-1.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_FALSE(result.success);
    EXPECT_FALSE(result.errorMessage.isEmpty());
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesNegativeDuration) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, -0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_FALSE(result.success);
    EXPECT_FALSE(result.errorMessage.isEmpty());
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesInvalidVelocity) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 128}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_FALSE(result.success);
    EXPECT_FALSE(result.errorMessage.isEmpty());
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesIntensityAboveOne) {
    ProjectionParams params;
    params.intensity = 1.5f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_FALSE(result.success);
    EXPECT_FALSE(result.errorMessage.isEmpty());
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesNegativeIntensity) {
    ProjectionParams params;
    params.intensity = -0.5f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_FALSE(result.success);
    EXPECT_FALSE(result.errorMessage.isEmpty());
}

// Sample Rate Handling
TEST_F(ProjectionEngineCriticalPathsTest, HandlesLowSampleRate) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, 8000.0);

    EXPECT_TRUE(result.success);
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesHighSampleRate) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result = engine->project(events, params, 192000.0);

    EXPECT_TRUE(result.success);
}

// Instrument Types
TEST_F(ProjectionEngineCriticalPathsTest, HandlesAllInstrumentTypes) {
    std::vector<ProjectionInstrument> instruments = {
        ProjectionInstrument::Piano,
        ProjectionInstrument::Guitar,
        ProjectionInstrument::Bass,
        ProjectionInstrument::Drums,
        ProjectionInstrument::Strings,
        ProjectionInstrument::Synth
    };

    ProjectionParams params;
    params.intensity = 0.7f;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    for (auto instrument : instruments) {
        params.targetInstrument = instrument;
        ProjectionResult result = engine->project(events, params, sampleRate);
        EXPECT_TRUE(result.success) << "Failed for instrument type: " << static_cast<int>(instrument);
    }
}

// Large Event Arrays
TEST_F(ProjectionEngineCriticalPathsTest, HandlesLargeEventArray) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events;
    for (int i = 0; i < 10000; i++) {
        events.push_back({i * 0.001, 0.5, 127});
    }

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.projectedEvents.size(), 10000);
}

// Rapid Successive Calls
TEST_F(ProjectionEngineCriticalPathsTest, HandlesRapidSuccessiveCalls) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    for (int i = 0; i < 1000; i++) {
        ProjectionResult result = engine->project(events, params, sampleRate);
        EXPECT_TRUE(result.success);
    }
}

// State Management
TEST_F(ProjectionEngineCriticalPathsTest, HandlesStateReset) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    ProjectionResult result1 = engine->project(events, params, sampleRate);
    EXPECT_TRUE(result1.success);

    engine->reset();

    ProjectionResult result2 = engine->project(events, params, sampleRate);
    EXPECT_TRUE(result2.success);
}

TEST_F(ProjectionEngineCriticalPathsTest, PreservesStateBetweenCalls) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events1 = {
        {0.0, 0.5, 127}
    };

    std::vector<RhythmEvent> events2 = {
        {0.5, 0.5, 100}
    };

    ProjectionResult result1 = engine->project(events1, params, sampleRate);
    EXPECT_TRUE(result1.success);

    ProjectionResult result2 = engine->project(events2, params, sampleRate);
    EXPECT_TRUE(result2.success);
}

// Edge Cases
TEST_F(ProjectionEngineCriticalPathsTest, HandlesOverlappingEvents) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 1.0, 127},
        {0.5, 1.0, 100}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.projectedEvents.size(), 2);
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesZeroVelocityEvent) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 0}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesVeryShortDuration) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.001, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
}

TEST_F(ProjectionEngineCriticalPathsTest, HandlesVeryLongDuration) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 100.0, 127}
    };

    ProjectionResult result = engine->project(events, params, sampleRate);

    EXPECT_TRUE(result.success);
}

// Performance Tests
TEST_F(ProjectionEngineCriticalPathsTest, PerformanceTestSingleEvent) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events = {
        {0.0, 0.5, 127}
    };

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 10000; i++) {
        ProjectionResult result = engine->project(events, params, sampleRate);
        ASSERT_TRUE(result.success);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    EXPECT_LT(duration.count(), 100); // Should complete 10k projections in < 100ms
}

TEST_F(ProjectionEngineCriticalPathsTest, PerformanceTestManyEvents) {
    ProjectionParams params;
    params.intensity = 0.7f;
    params.targetInstrument = ProjectionInstrument::Piano;

    std::vector<RhythmEvent> events;
    for (int i = 0; i < 1000; i++) {
        events.push_back({i * 0.001, 0.5, 127});
    }

    auto start = std::chrono::high_resolution_clock::now();

    ProjectionResult result = engine->project(events, params, sampleRate);

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    EXPECT_TRUE(result.success);
    EXPECT_LT(duration.count(), 50); // Should complete 1k event projection in < 50ms
}
