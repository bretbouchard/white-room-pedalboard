/**
 * UndoState - Thread-safe undo state management for JUCE audio engine
 *
 * Provides thread-safe state snapshot and restoration for undo/redo operations.
 * Designed for real-time audio safety with lock-free operations where possible.
 *
 * Core Features:
 * - Thread-safe state snapshots using ReadWriteLock
 * - Lock-free atomic reads for audio thread
 * - Safe state restoration with glitch prevention
 * - Shared pointer management for efficient copying
 *
 * Thread Safety:
 * - Audio thread: Lock-free atomic reads (getCurrentState)
 * - UI thread: Uses ReadWriteLock for mutations (snapshot, restore)
 * - Never blocks in audio thread
 *
 * Integration:
 * - Used by AudioEngineUndo to capture state before changes
 * - Used by JUCE UndoManager for undo/redo operations
 * - Integrates with PerformanceRenderer for smooth transitions
 */

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include <memory>
#include <atomic>
#include <shared_mutex>

// ============================================================================
// Forward Declarations
// ============================================================================

struct SongState;
struct SongContract;

// ============================================================================
// Types
// ============================================================================

/**
 * Rhythm generator (simplified for audio engine)
 *
 * Represents a single rhythm generator from Schillinger Book I.
 */
struct RhythmGenerator
{
    double period;    // Period in beats (1-16)
    double phase;     // Phase offset in beats (0 to period-1)
    double weight;    // Relative weight (0.1-2.0)

    RhythmGenerator() : period(1.0), phase(0.0), weight(1.0) {}
    RhythmGenerator(double p, double ph, double w) : period(p), phase(ph), weight(w) {}
};

/**
 * Rhythm system (simplified for audio engine)
 *
 * Contains rhythm generators and resultant selection method.
 * This is a minimal representation for real-time rhythm generation.
 */
struct RhythmSystem
{
    juce::String systemId;
    juce::Array<RhythmGenerator> generators;
    juce::String resultantMethod;  // "interference", "modulo", "custom"

    RhythmSystem() = default;
};

/**
 * Song state snapshot (simplified for audio engine)
 *
 * Contains the essential state needed for undo/redo operations.
 * This is a lightweight representation optimized for real-time use.
 */
struct SongState
{
    juce::String id;
    juce::String name;
    double tempo;
    int timeSignatureNumerator;
    int timeSignatureDenominator;
    juce::String activePerformanceId;

    // Performance-specific state
    double density;
    juce::String grooveProfileId;
    juce::String consoleXProfileId;

    // Instrument configuration (simplified)
    juce::StringArray instrumentIds;
    juce::Array<double> mixGains;
    juce::Array<double> mixPans;

    // Rhythm systems (Schillinger Book I)
    juce::Array<RhythmSystem> rhythmSystems;

    /**
     * Create empty state
     */
    SongState();

    /**
     * Clone state (thread-safe)
     */
    std::shared_ptr<SongState> clone() const;

    /**
     * Check if state is valid
     */
    bool isValid() const;
};

/**
 * Song contract (minimal representation for undo)
 *
 * This is a simplified version of the full SongContractV1,
 * containing only the fields needed for undo/redo operations.
 */
struct SongContract
{
    juce::String id;
    juce::String version;
    juce::String songStateId;
    juce::String performanceStateId;

    /**
     * Create empty contract
     */
    SongContract();

    /**
     * Check if contract is valid
     */
    bool isValid() const;
};

// ============================================================================
// UndoState
// ============================================================================

/**
 * Thread-safe undo state management
 *
 * Manages state snapshots for undo/redo operations with:
 * - Thread-safe reads and writes
 * - Lock-free atomic access for audio thread
 * - Efficient shared pointer copying
 * - State validation
 *
 * Usage:
 * ```cpp
 * // UI thread: Capture state before change
 * auto snapshot = undoState.snapshot();
 *
 * // ... make changes ...
 *
 * // UI thread: Restore state on undo
 * undoState.restore(previousSnapshot);
 *
 * // Audio thread: Lock-free read
 * auto current = undoState.getCurrentState();
 * ```
 */
class UndoState
{
public:
    UndoState();
    ~UndoState();

    /**
     * Take a thread-safe snapshot of current state
     *
     * Called from UI thread before making changes.
     * Uses read lock for concurrent access.
     *
     * @return Shared pointer to state snapshot
     */
    std::shared_ptr<SongState> snapshot();

    /**
     * Restore state from snapshot
     *
     * Called from UI thread during undo/redo.
     * Uses write lock for exclusive access.
     *
     * Thread-safe with glitch prevention:
     * - Updates atomically at audio buffer boundary
     * - Smooth parameter transitions
     * - No audio artifacts
     *
     * @param state State to restore
     * @return true if restored successfully
     */
    bool restore(std::shared_ptr<SongState> state);

    /**
     * Get current state (lock-free, audio thread safe)
     *
     * Called from audio thread.
     * Uses atomic load for lock-free access.
     *
     * NEVER blocks, suitable for real-time audio.
     *
     * @return Shared pointer to current state
     */
    std::shared_ptr<SongState> getCurrentState() const;

    /**
     * Set current state (thread-safe, UI thread)
     *
     * Called from UI thread when state changes.
     * Uses write lock for exclusive access.
     *
     * @param state New state to set
     */
    void setCurrentState(std::shared_ptr<SongState> state);

    /**
     * Check if state is valid
     *
     * Thread-safe lock-free check.
     */
    bool hasValidState() const;

    /**
     * Clear state (reset to initial)
     *
     * Called from UI thread.
     */
    void clear();

    /**
     * Create state from SongContract
     *
     * Utility function to convert SongContract to SongState.
     *
     * @param contract Song contract to convert
     * @return Song state snapshot
     */
    static std::shared_ptr<SongState> fromContract(const SongContract& contract);

    /**
     * Create SongContract from state
     *
     * Utility function to convert SongState to SongContract.
     *
     * @param state Song state to convert
     * @return Song contract
     */
    static SongContract toContract(const SongState& state);

private:
    /**
     * Update atomic state pointer
     *
     * Internal method for atomic state updates.
     * Ensures memory ordering for thread safety.
     */
    void updateAtomicState(std::shared_ptr<SongState> state);

    // Current state (atomic for lock-free access)
    std::atomic<std::shared_ptr<SongState>*> atomicState;

    // Read-write lock for mutations (snapshot, restore)
    mutable std::shared_mutex stateLock;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(UndoState)
};

// ============================================================================
// Inline Helpers
// ============================================================================

/**
 * Create state snapshot from current values
 *
 * Utility for creating snapshots from performance renderer state.
 */
inline std::shared_ptr<SongState> makeSnapshot(
    const juce::String& id,
    const juce::String& name,
    double tempo,
    int timeSigNum,
    int timeSigDenom,
    const juce::String& performanceId,
    double density,
    const juce::String& grooveId,
    const juce::String& consoleXId
)
{
    auto state = std::make_shared<SongState>();
    state->id = id;
    state->name = name;
    state->tempo = tempo;
    state->timeSignatureNumerator = timeSigNum;
    state->timeSignatureDenominator = timeSigDenom;
    state->activePerformanceId = performanceId;
    state->density = density;
    state->grooveProfileId = grooveId;
    state->consoleXProfileId = consoleXId;
    return state;
}
