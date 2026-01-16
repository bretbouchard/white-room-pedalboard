/**
 * AudioEngineUndo - Real-time state reconciliation for undo/redo
 *
 * Applies undo/redo diffs to the audio engine with glitch-free transitions.
 * Ensures real-time safety by applying changes at buffer boundaries.
 *
 * Core Features:
 * - Diff application to audio engine
 * - Smooth parameter transitions
 * - Bar-boundary state updates
 * - Audio glitch prevention
 *
 * Thread Safety:
 * - Audio thread: Non-blocking state reads
 * - UI thread: Schedules diff application
 * - Applies changes at safe boundaries
 *
 * Integration:
 * - Works with UndoState for state snapshots
 * - Integrates with PerformanceRenderer for transitions
 * - Provides smooth parameter interpolation
 */

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include "undo/UndoState.h"
#include <memory>
#include <functional>

// ============================================================================
// Forward Declarations
// ============================================================================

class PerformanceRenderer;

// ============================================================================
// Types
// ============================================================================

/**
 * Instrument change (for undo/redo)
 *
 * Represents a change to instrument configuration.
 */
struct InstrumentChange
{
    juce::String role;
    juce::String oldInstrumentId;
    juce::String newInstrumentId;
    juce::String oldPresetId;
    juce::String newPresetId;

    /**
     * Check if change is valid
     */
    bool isValid() const;
};

/**
 * Parameter change (for undo/redo)
 *
 * Represents a change to audio parameters.
 */
struct ParameterChange
{
    juce::String parameterPath; // e.g., "oscillator1.pitch"
    double oldValue;
    double newValue;
    double smoothTime; // Time in seconds for transition

    /**
     * Check if change is valid
     */
    bool isValid() const;
};

/**
 * Performance change (for undo/redo)
 *
 * Represents a change to performance configuration.
 */
struct PerformanceChange
{
    juce::String oldPerformanceId;
    juce::String newPerformanceId;
    double oldDensity;
    double newDensity;
    juce::String oldGrooveProfileId;
    juce::String newGrooveProfileId;
    juce::String oldConsoleXProfileId;
    juce::String newConsoleXProfileId;

    /**
     * Check if change is valid
     */
    bool isValid() const;
};

/**
 * Song diff (collection of changes)
 *
 * Represents all changes between two states.
 */
struct SongDiff
{
    juce::Array<InstrumentChange> instrumentChanges;
    juce::Array<ParameterChange> parameterChanges;
    juce::Array<PerformanceChange> performanceChanges;

    /**
     * Check if diff has any changes
     */
    bool hasChanges() const;

    /**
     * Count total changes
     */
    int countChanges() const;

    /**
     * Clear all changes
     */
    void clear();
};

// ============================================================================
// AudioEngineUndo
// ============================================================================

/**
 * Real-time undo/redo diff application
 *
 * Applies state changes to the audio engine with smooth transitions.
 * Ensures no audio glitches by applying changes at buffer boundaries.
 *
 * Usage:
 * ```cpp
 * // UI thread: Schedule diff application
 * SongDiff diff;
 * // ... populate diff ...
 * audioEngineUndo.applyDiff(diff, audioEngine);
 *
 * // Audio thread: Process pending changes
 * audioEngineUndo.processAtBufferBoundary(buffer);
 * ```
 */
class AudioEngineUndo
{
public:
    AudioEngineUndo();
    ~AudioEngineUndo();

    /**
     * Initialize with sample rate
     *
     * @param sampleRate Sample rate in Hz
     */
    void initialize(double sampleRate);

    /**
     * Reset state
     */
    void reset();

    /**
     * Apply diff to audio engine (UI thread)
     *
     * Schedules diff application for next buffer boundary.
     * Thread-safe, non-blocking.
     *
     * @param diff Diff to apply
     * @param performanceRenderer Performance renderer for state updates
     * @return true if scheduled successfully
     */
    bool applyDiff(
        const SongDiff& diff,
        PerformanceRenderer& performanceRenderer
    );

    /**
     * Apply changes at audio buffer boundary (audio thread)
     *
     * Called from audio thread at buffer boundaries.
     * Applies all scheduled changes smoothly.
     *
     * MUST be fast and non-blocking (real-time safe).
     *
     * @param buffer Audio buffer being processed
     * @param currentSamplePosition Current playback position
     */
    void processAtBufferBoundary(
        juce::AudioBuffer<float>& buffer,
        juce::int64 currentSamplePosition
    );

    /**
     * Check if changes are pending
     *
     * Thread-safe lock-free check.
     */
    bool hasPendingChanges() const;

    /**
     * Get number of pending changes
     *
     * Thread-safe lock-free read.
     */
    int getPendingChangeCount() const;

    /**
     * Cancel all pending changes
     *
     * Called from UI thread.
     */
    void cancelPendingChanges();

    /**
     * Compute diff between two states
     *
     * Utility for computing what changed between two states.
     *
     * @param before State before change
     * @param after State after change
     * @return Diff representing changes
     */
    static SongDiff computeDiff(
        const SongState& before,
        const SongState& after
    );

    /**
     * Apply instrument change
     *
     * Called at buffer boundary.
     *
     * @param change Instrument change to apply
     * @return true if applied successfully
     */
    bool applyInstrumentChange(const InstrumentChange& change);

    /**
     * Apply parameter change
     *
     * Called at buffer boundary with smoothing.
     *
     * @param change Parameter change to apply
     * @return true if applied successfully
     */
    bool applyParameterChange(const ParameterChange& change);

    /**
     * Apply performance change
     *
     * Called at buffer boundary.
     *
     * @param change Performance change to apply
     * @return true if applied successfully
     */
    bool applyPerformanceChange(const PerformanceChange& change);

    /**
     * Smooth parameter transition
     *
     * Interpolates parameter values over time to prevent clicks.
     *
     * @param oldValue Old parameter value
     * @param newValue New parameter value
     * @param transitionSamples Number of samples for transition
     * @return Array of interpolated values
     */
    static juce::Array<double> smoothTransition(
        double oldValue,
        double newValue,
        int transitionSamples
    );

private:
    /**
     * Schedule change for application
     *
     * Thread-safe queue of pending changes.
     */
    void scheduleChange(const SongDiff& diff);

    /**
     * Apply scheduled changes
     *
     * Called at buffer boundary.
     */
    void applyScheduledChanges();

    /**
     * Check if at bar boundary
     *
     * Determines if it's safe to apply changes.
     */
    bool isAtSafeBoundary(juce::int64 currentSamplePosition) const;

    // Sample rate
    double sampleRate;

    // Pending changes (lock-free queue)
    juce::AbstractFifo pendingChangesFifo;
    juce::Array<SongDiff> pendingChanges;

    // Performance renderer reference
    PerformanceRenderer* performanceRenderer;

    // Smoothing time (default: 50ms)
    double smoothingTimeSeconds;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioEngineUndo)
};

// ============================================================================
// Inline Helpers
// ============================================================================

/**
 * Create instrument change
 */
inline InstrumentChange makeInstrumentChange(
    const juce::String& role,
    const juce::String& oldInstrument,
    const juce::String& newInstrument,
    const juce::String& oldPreset = juce::String(),
    const juce::String& newPreset = juce::String()
)
{
    InstrumentChange change;
    change.role = role;
    change.oldInstrumentId = oldInstrument;
    change.newInstrumentId = newInstrument;
    change.oldPresetId = oldPreset;
    change.newPresetId = newPreset;
    return change;
}

/**
 * Create parameter change
 */
inline ParameterChange makeParameterChange(
    const juce::String& path,
    double oldValue,
    double newValue,
    double smoothTime = 0.05 // 50ms default
)
{
    ParameterChange change;
    change.parameterPath = path;
    change.oldValue = oldValue;
    change.newValue = newValue;
    change.smoothTime = smoothTime;
    return change;
}

/**
 * Create performance change
 */
inline PerformanceChange makePerformanceChange(
    const juce::String& oldPerformance,
    const juce::String& newPerformance,
    double oldDensity = 0.5,
    double newDensity = 0.5,
    const juce::String& oldGroove = juce::String(),
    const juce::String& newGroove = juce::String(),
    const juce::String& oldConsoleX = juce::String(),
    const juce::String& newConsoleX = juce::String()
)
{
    PerformanceChange change;
    change.oldPerformanceId = oldPerformance;
    change.newPerformanceId = newPerformance;
    change.oldDensity = oldDensity;
    change.newDensity = newDensity;
    change.oldGrooveProfileId = oldGroove;
    change.newGrooveProfileId = newGroove;
    change.oldConsoleXProfileId = oldConsoleX;
    change.newConsoleXProfileId = newConsoleX;
    return change;
}
