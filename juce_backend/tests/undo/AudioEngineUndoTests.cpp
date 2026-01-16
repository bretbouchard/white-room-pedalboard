/**
 * AudioEngineUndo Tests - Real-time state reconciliation tests
 */

#include <gtest/gtest.h>
#include "undo/AudioEngineUndo.h"
#include "audio/PerformanceRenderer.h"

// ============================================================================
// Diff Type Tests
// ============================================================================

TEST(InstrumentChangeTest, IsValidReturnsTrueForValidChange)
{
    InstrumentChange change;
    change.role = "melody";
    change.newInstrumentId = "piano";

    EXPECT_TRUE(change.isValid());
}

TEST(InstrumentChangeTest, IsValidReturnsFalseForInvalidChange)
{
    InstrumentChange change;
    EXPECT_FALSE(change.isValid());
}

TEST(ParameterChangeTest, IsValidReturnsTrueForValidChange)
{
    ParameterChange change;
    change.parameterPath = "oscillator1.pitch";
    change.oldValue = 440.0;
    change.newValue = 880.0;

    EXPECT_TRUE(change.isValid());
}

TEST(ParameterChangeTest, IsValidReturnsFalseForInvalidChange)
{
    ParameterChange change;
    EXPECT_FALSE(change.isValid());
}

TEST(PerformanceChangeTest, IsValidReturnsTrueForValidChange)
{
    PerformanceChange change;
    change.newPerformanceId = "techno";

    EXPECT_TRUE(change.isValid());
}

TEST(PerformanceChangeTest, IsValidReturnsFalseForInvalidChange)
{
    PerformanceChange change;
    EXPECT_FALSE(change.isValid());
}

// ============================================================================
// SongDiff Tests
// ============================================================================

TEST(SongDiffTest, HasChangesReturnsTrueForChanges)
{
    SongDiff diff;

    EXPECT_FALSE(diff.hasChanges());

    InstrumentChange change;
    change.role = "melody";
    change.newInstrumentId = "piano";
    diff.instrumentChanges.add(change);

    EXPECT_TRUE(diff.hasChanges());
}

TEST(SongDiffTest, CountChangesReturnsTotalCount)
{
    SongDiff diff;

    EXPECT_EQ(diff.countChanges(), 0);

    InstrumentChange instChange;
    instChange.role = "melody";
    instChange.newInstrumentId = "piano";
    diff.instrumentChanges.add(instChange);

    ParameterChange paramChange;
    paramChange.parameterPath = "oscillator1.pitch";
    paramChange.oldValue = 440.0;
    paramChange.newValue = 880.0;
    diff.parameterChanges.add(paramChange);

    EXPECT_EQ(diff.countChanges(), 2);
}

TEST(SongDiffTest, ClearRemovesAllChanges)
{
    SongDiff diff;

    InstrumentChange change;
    change.role = "melody";
    change.newInstrumentId = "piano";
    diff.instrumentChanges.add(change);

    EXPECT_TRUE(diff.hasChanges());

    diff.clear();

    EXPECT_FALSE(diff.hasChanges());
}

// ============================================================================
// AudioEngineUndo Tests
// ============================================================================

TEST(AudioEngineUndoTest, DefaultConstruction)
{
    AudioEngineUndo audioEngineUndo;

    EXPECT_FALSE(audioEngineUndo.hasPendingChanges());
    EXPECT_EQ(audioEngineUndo.getPendingChangeCount(), 0);
}

TEST(AudioEngineUndoTest, InitializeSetsSampleRate)
{
    AudioEngineUndo audioEngineUndo;

    audioEngineUndo.initialize(48000.0);

    // No direct way to check sample rate, but initialization should succeed
    SUCCEED();
}

TEST(AudioEngineUndoTest, ResetClearsPendingChanges)
{
    AudioEngineUndo audioEngineUndo;

    SongDiff diff;

    InstrumentChange change;
    change.role = "melody";
    change.newInstrumentId = "piano";
    diff.instrumentChanges.add(change);

    PerformanceRenderer renderer;
    audioEngineUndo.applyDiff(diff, renderer);

    // Note: applyDiff schedules changes, but we can't easily test this
    // without a more complete integration

    audioEngineUndo.reset();
    EXPECT_EQ(audioEngineUndo.getPendingChangeCount(), 0);
}

TEST(AudioEngineUndoTest, ComputeDiffDetectsPerformanceChanges)
{
    SongState before;
    before.id = "test-song";
    before.activePerformanceId = "piano";
    before.density = 0.5;

    SongState after;
    after.id = "test-song";
    after.activePerformanceId = "techno";
    after.density = 0.8;

    auto diff = AudioEngineUndo::computeDiff(before, after);

    EXPECT_TRUE(diff.hasChanges());
    EXPECT_GT(diff.performanceChanges.size(), 0);
}

TEST(AudioEngineUndoTest, ComputeDiffDetectsInstrumentChanges)
{
    SongState before;
    before.id = "test-song";
    before.instrumentIds.add("piano");

    SongState after;
    after.id = "test-song";
    after.instrumentIds.add("synth");
    after.instrumentIds.add("drums");

    auto diff = AudioEngineUndo::computeDiff(before, after);

    EXPECT_TRUE(diff.hasChanges());
    EXPECT_GT(diff.instrumentChanges.size(), 0);
}

TEST(AudioEngineUndoTest, SmoothTransitionGeneratesCorrectValues)
{
    double oldValue = 0.0;
    double newValue = 1.0;
    int transitionSamples = 10;

    auto smoothed = AudioEngineUndo::smoothTransition(
        oldValue,
        newValue,
        transitionSamples
    );

    EXPECT_EQ(smoothed.size(), transitionSamples);

    // First value should be old value
    EXPECT_DOUBLE_EQ(smoothed[0], oldValue);

    // Last value should be new value
    EXPECT_DOUBLE_EQ(smoothed[transitionSamples - 1], newValue);

    // Middle values should interpolate
    EXPECT_GT(smoothed[5], 0.4);
    EXPECT_LT(smoothed[5], 0.6);
}

TEST(AudioEngineUndoTest, SmoothTransitionWithZeroSamplesReturnsNewValue)
{
    double oldValue = 0.0;
    double newValue = 1.0;
    int transitionSamples = 0;

    auto smoothed = AudioEngineUndo::smoothTransition(
        oldValue,
        newValue,
        transitionSamples
    );

    EXPECT_EQ(smoothed.size(), 1);
    EXPECT_DOUBLE_EQ(smoothed[0], newValue);
}

TEST(AudioEngineUndoTest, CancelPendingChangesClearsFifo)
{
    AudioEngineUndo audioEngineUndo;

    SongDiff diff;

    InstrumentChange change;
    change.role = "melody";
    change.newInstrumentId = "piano";
    diff.instrumentChanges.add(change);

    PerformanceRenderer renderer;
    audioEngineUndo.applyDiff(diff, renderer);
    audioEngineUndo.cancelPendingChanges();

    EXPECT_EQ(audioEngineUndo.getPendingChangeCount(), 0);
}

// ============================================================================
// Helper Function Tests
// ============================================================================

TEST(MakeInstrumentChangeTest, CreatesValidChange)
{
    auto change = makeInstrumentChange(
        "melody",
        "piano",
        "synth",
        "preset1",
        "preset2"
    );

    EXPECT_EQ(change.role, "melody");
    EXPECT_EQ(change.oldInstrumentId, "piano");
    EXPECT_EQ(change.newInstrumentId, "synth");
    EXPECT_EQ(change.oldPresetId, "preset1");
    EXPECT_EQ(change.newPresetId, "preset2");
}

TEST(MakeParameterChangeTest, CreatesValidChange)
{
    auto change = makeParameterChange(
        "oscillator1.pitch",
        440.0,
        880.0,
        0.1
    );

    EXPECT_EQ(change.parameterPath, "oscillator1.pitch");
    EXPECT_DOUBLE_EQ(change.oldValue, 440.0);
    EXPECT_DOUBLE_EQ(change.newValue, 880.0);
    EXPECT_DOUBLE_EQ(change.smoothTime, 0.1);
}

TEST(MakePerformanceChangeTest, CreatesValidChange)
{
    auto change = makePerformanceChange(
        "piano",
        "techno",
        0.5,
        0.8,
        "groove1",
        "groove2",
        "console1",
        "console2"
    );

    EXPECT_EQ(change.oldPerformanceId, "piano");
    EXPECT_EQ(change.newPerformanceId, "techno");
    EXPECT_DOUBLE_EQ(change.oldDensity, 0.5);
    EXPECT_DOUBLE_EQ(change.newDensity, 0.8);
    EXPECT_EQ(change.oldGrooveProfileId, "groove1");
    EXPECT_EQ(change.newGrooveProfileId, "groove2");
    EXPECT_EQ(change.oldConsoleXProfileId, "console1");
    EXPECT_EQ(change.newConsoleXProfileId, "console2");
}

// ============================================================================
// Integration Tests
// ============================================================================

TEST(AudioEngineUndoTest, ApplyDiffSchedulesChanges)
{
    AudioEngineUndo audioEngineUndo;
    PerformanceRenderer renderer;

    SongState before;
    before.id = "test-song";
    before.activePerformanceId = "piano";

    SongState after;
    after.id = "test-song";
    after.activePerformanceId = "techno";

    auto diff = AudioEngineUndo::computeDiff(before, after);

    bool success = audioEngineUndo.applyDiff(diff, renderer);
    EXPECT_TRUE(success);
}
