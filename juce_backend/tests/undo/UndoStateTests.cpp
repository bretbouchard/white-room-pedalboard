/**
 * UndoState Tests - Thread-safe undo state management tests
 */

#include <gtest/gtest.h>
#include "undo/UndoState.h"
#include <thread>
#include <vector>
#include <chrono>

// ============================================================================
// SongState Tests
// ============================================================================

TEST(SongStateTest, DefaultConstruction)
{
    SongState state;

    EXPECT_TRUE(state.id.isEmpty());
    EXPECT_TRUE(state.name.isEmpty());
    EXPECT_EQ(state.tempo, 120.0);
    EXPECT_EQ(state.timeSignatureNumerator, 4);
    EXPECT_EQ(state.timeSignatureDenominator, 4);
    EXPECT_TRUE(state.activePerformanceId.isEmpty());
}

TEST(SongStateTest, CloneCreatesCopy)
{
    SongState original;
    original.id = "test-song-1";
    original.name = "Test Song";
    original.tempo = 140.0;
    original.activePerformanceId = "piano";

    auto clone = original.clone();

    EXPECT_EQ(clone->id, original.id);
    EXPECT_EQ(clone->name, original.name);
    EXPECT_EQ(clone->tempo, original.tempo);
    EXPECT_EQ(clone->activePerformanceId, original.activePerformanceId);

    // Verify it's a true copy (not shared)
    clone->id = "modified";
    EXPECT_NE(original.id, clone->id);
}

TEST(SongStateTest, IsValidReturnsTrueWhenRequiredFieldsSet)
{
    SongState state;
    EXPECT_FALSE(state.isValid());

    state.id = "test-song";
    EXPECT_FALSE(state.isValid());

    state.activePerformanceId = "piano";
    EXPECT_TRUE(state.isValid());
}

// ============================================================================
// UndoState Tests
// ============================================================================

TEST(UndoStateTest, DefaultConstruction)
{
    UndoState undoState;

    EXPECT_FALSE(undoState.hasValidState());
}

TEST(UndoStateTest, SetAndGetState)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "test-song";
    state->activePerformanceId = "piano";
    state->tempo = 120.0;

    undoState.setCurrentState(state);

    auto retrieved = undoState.getCurrentState();
    EXPECT_EQ(retrieved->id, state->id);
    EXPECT_EQ(retrieved->activePerformanceId, state->activePerformanceId);
    EXPECT_EQ(retrieved->tempo, state->tempo);
}

TEST(UndoStateTest, SnapshotCreatesCopy)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "test-song";
    state->activePerformanceId = "piano";

    undoState.setCurrentState(state);

    auto snapshot = undoState.snapshot();

    EXPECT_EQ(snapshot->id, state->id);
    EXPECT_EQ(snapshot->activePerformanceId, state->activePerformanceId);

    // Modify snapshot
    snapshot->id = "modified";

    // Original should be unchanged
    auto current = undoState.getCurrentState();
    EXPECT_NE(current->id, snapshot->id);
    EXPECT_EQ(current->id, state->id);
}

TEST(UndoStateTest, RestoreUpdatesState)
{
    UndoState undoState;

    auto initialState = std::make_shared<SongState>();
    initialState->id = "initial";
    initialState->activePerformanceId = "piano";

    undoState.setCurrentState(initialState);

    // Create new state to restore
    auto restoredState = std::make_shared<SongState>();
    restoredState->id = "restored";
    restoredState->activePerformanceId = "techno";

    bool success = undoState.restore(restoredState);
    EXPECT_TRUE(success);

    auto current = undoState.getCurrentState();
    EXPECT_EQ(current->id, "restored");
    EXPECT_EQ(current->activePerformanceId, "techno");
}

TEST(UndoStateTest, ClearResetsState)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "test-song";
    state->activePerformanceId = "piano";

    undoState.setCurrentState(state);
    EXPECT_TRUE(undoState.hasValidState());

    undoState.clear();
    EXPECT_FALSE(undoState.hasValidState());
}

// ============================================================================
// Thread Safety Tests
// ============================================================================

TEST(UndoStateTest, ConcurrentReadsAreSafe)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "test-song";
    state->activePerformanceId = "piano";
    state->tempo = 120.0;

    undoState.setCurrentState(state);

    const int numThreads = 10;
    const int readsPerThread = 100;
    std::vector<std::thread> threads;

    for (int i = 0; i < numThreads; ++i)
    {
        threads.emplace_back([&undoState, readsPerThread]() {
            for (int j = 0; j < readsPerThread; ++j)
            {
                auto current = undoState.getCurrentState();
                EXPECT_FALSE(current->id.isEmpty());
                EXPECT_GT(current->tempo, 0);
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }
}

TEST(UndoStateTest, ConcurrentWritesAreSafe)
{
    UndoState undoState;

    const int numThreads = 10;
    const int writesPerThread = 100;
    std::vector<std::thread> threads;

    for (int i = 0; i < numThreads; ++i)
    {
        threads.emplace_back([&undoState, i, writesPerThread]() {
            for (int j = 0; j < writesPerThread; ++j)
            {
                auto state = std::make_shared<SongState>();
                state->id = "song-" + juce::String(i) + "-" + juce::String(j);
                state->activePerformanceId = "performance-" + juce::String(i);

                undoState.setCurrentState(state);
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    // Final state should be valid
    EXPECT_TRUE(undoState.hasValidState());
}

TEST(UndoStateTest, ConcurrentReadsAndWritesAreSafe)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "initial";
    state->activePerformanceId = "piano";

    undoState.setCurrentState(state);

    const int numReaderThreads = 5;
    const int numWriterThreads = 5;
    const int operationsPerThread = 50;
    std::vector<std::thread> threads;

    // Reader threads
    for (int i = 0; i < numReaderThreads; ++i)
    {
        threads.emplace_back([&undoState, operationsPerThread]() {
            for (int j = 0; j < operationsPerThread; ++j)
            {
                auto current = undoState.getCurrentState();
                EXPECT_TRUE(current->id.isNotEmpty());
            }
        });
    }

    // Writer threads
    for (int i = 0; i < numWriterThreads; ++i)
    {
        threads.emplace_back([&undoState, i, operationsPerThread]() {
            for (int j = 0; j < operationsPerThread; ++j)
            {
                auto newState = std::make_shared<SongState>();
                newState->id = "song-" + juce::String(i) + "-" + juce::String(j);
                newState->activePerformanceId = "performance";

                undoState.setCurrentState(newState);
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    // Final state should be valid
    EXPECT_TRUE(undoState.hasValidState());
}

TEST(UndoStateTest, SnapshotIsThreadSafe)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "test-song";
    state->activePerformanceId = "piano";

    undoState.setCurrentState(state);

    const int numThreads = 10;
    const int snapshotsPerThread = 50;
    std::vector<std::thread> threads;

    for (int i = 0; i < numThreads; ++i)
    {
        threads.emplace_back([&undoState, snapshotsPerThread]() {
            for (int j = 0; j < snapshotsPerThread; ++j)
            {
                auto snapshot = undoState.snapshot();
                EXPECT_TRUE(snapshot->id.isNotEmpty());
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }
}

// ============================================================================
// Performance Tests
// ============================================================================

TEST(UndoStateTest, GetCurrentStatePerformance)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "test-song";
    state->activePerformanceId = "piano";

    undoState.setCurrentState(state);

    const int iterations = 10000;
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < iterations; ++i)
    {
        auto current = undoState.getCurrentState();
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    // Should complete in less than 100ms for 10k iterations
    EXPECT_LT(duration.count(), 100000);
}

TEST(UndoStateTest, SetStatePerformance)
{
    UndoState undoState;

    auto state = std::make_shared<SongState>();
    state->id = "test-song";
    state->activePerformanceId = "piano";

    const int iterations = 10000;
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < iterations; ++i)
    {
        undoState.setCurrentState(state);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    // Should complete in less than 200ms for 10k iterations
    EXPECT_LT(duration.count(), 200000);
}

// ============================================================================
// SongContract Tests
// ============================================================================

TEST(SongContractTest, DefaultConstruction)
{
    SongContract contract;

    EXPECT_TRUE(contract.id.isEmpty());
    EXPECT_EQ(contract.version, "1.0");
    EXPECT_TRUE(contract.songStateId.isEmpty());
}

TEST(SongContractTest, IsValidReturnsTrueWhenRequiredFieldsSet)
{
    SongContract contract;
    EXPECT_FALSE(contract.isValid());

    contract.id = "test-contract";
    EXPECT_FALSE(contract.isValid());

    contract.songStateId = "test-state";
    EXPECT_TRUE(contract.isValid());
}
