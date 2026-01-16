/**
 * JUCEUndoBridge - JUCE UndoManager integration for SongContract undo/redo
 *
 * Integrates JUCE's built-in UndoManager with our custom undo system.
 * Provides seamless undo/redo for SongContract changes.
 *
 * Core Features:
 * - JUCE UndoManager wrapper for SongContract
 * - Automatic diff computation
 * - Thread-safe state management
 * - Integration with audio engine
 *
 * Thread Safety:
 * - UI thread: All undo/redo operations
 * - Audio thread: Lock-free state reads
 * - Safe to use from any thread
 *
 * Integration:
 * - Works with JUCE UndoManager::perform()
 * - Integrates with UndoState for snapshots
 * - Uses AudioEngineUndo for glitch-free transitions
 */

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include "undo/UndoState.h"
#include "undo/AudioEngineUndo.h"
#include <memory>

// ============================================================================
// SongContractUndoableAction
// ============================================================================

/**
 * Undoable action for SongContract changes
 *
 * Integrates with JUCE UndoManager for standard undo/redo.
 * Captures before/after states and applies diffs to audio engine.
 */
class SongContractUndoableAction : public juce::UndoableAction
{
public:
    /**
     * Create undoable action
     *
     * @param beforeState State before change
     * @param afterState State after change
     * @param description Human-readable description
     * @param audioEngine Audio engine for applying changes (optional)
     */
    SongContractUndoableAction(
        std::shared_ptr<SongState> beforeState,
        std::shared_ptr<SongState> afterState,
        const juce::String& description,
        AudioEngineUndo* audioEngine = nullptr
    );

    /**
     * Perform redo (apply change)
     *
     * Called by JUCE UndoManager when redoing.
     *
     * @return true if successful
     */
    bool perform() override;

    /**
     * Perform undo (revert change)
     *
     * Called by JUCE UndoManager when undoing.
     *
     * @return true if successful
     */
    bool undo() override;

    /**
     * Get action size in bytes
     *
     * For memory management.
     */
    int getSizeInUnits() override;

    /**
     * Get description
     *
     * Returns human-readable description of the action.
     */
    juce::String getDescription() const;

private:
    /**
     * Apply state to audio engine
     */
    bool applyToAudioEngine(std::shared_ptr<SongState> state);

    // State snapshots
    std::shared_ptr<SongState> beforeState;
    std::shared_ptr<SongState> afterState;

    // Description for UI
    juce::String description;

    // Audio engine reference (optional, for glitch-free transitions)
    AudioEngineUndo* audioEngine;

    // Computed diff
    SongDiff diff;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SongContractUndoableAction)
};

// ============================================================================
// PerformanceStateUndoableAction
// ============================================================================

/**
 * Undoable action for PerformanceState changes
 *
 * Similar to SongContractUndoableAction but for performance-specific changes.
 */
class PerformanceStateUndoableAction : public juce::UndoableAction
{
public:
    /**
     * Create undoable action for performance change
     *
     * @param oldPerformanceId Previous performance ID
     * @param newPerformanceId New performance ID
     * @param description Human-readable description
     * @param audioEngine Audio engine for applying changes (optional)
     */
    PerformanceStateUndoableAction(
        const juce::String& oldPerformanceId,
        const juce::String& newPerformanceId,
        const juce::String& description,
        AudioEngineUndo* audioEngine = nullptr
    );

    /**
     * Perform redo (apply change)
     */
    bool perform() override;

    /**
     * Perform undo (revert change)
     */
    bool undo() override;

    /**
     * Get size in bytes
     */
    int getSizeInUnits() override;

    /**
     * Get description
     */
    juce::String getDescription() const;

private:
    juce::String oldPerformanceId;
    juce::String newPerformanceId;
    juce::String description;
    AudioEngineUndo* audioEngine;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PerformanceStateUndoableAction)
};

// ============================================================================
// UndoManagerWrapper
// ============================================================================

/**
 * Wrapper for JUCE UndoManager
 *
 * Provides convenient interface for undo/redo operations.
 * Manages undo state and action creation.
 */
class UndoManagerWrapper
{
public:
    UndoManagerWrapper();
    ~UndoManagerWrapper();

    /**
     * Initialize with undo state
     *
     * @param undoState Undo state manager
     * @param audioEngine Audio engine for applying changes (optional)
     */
    void initialize(
        UndoState* undoState,
        AudioEngineUndo* audioEngine = nullptr
    );

    /**
     * Begin new action (before state change)
     *
     * Captures current state as "before" snapshot.
     *
     * @param actionDescription Description of the action
     */
    void beginAction(const juce::String& actionDescription);

    /**
     * End new action (after state change)
     *
     * Captures new state as "after" snapshot and creates undoable action.
     *
     * @param actionDescription Description of the action
     */
    void endAction(const juce::String& actionDescription);

    /**
     * Perform undo
     *
     * @return true if successful
     */
    bool undo();

    /**
     * Perform redo
     *
     * @return true if successful
     */
    bool redo();

    /**
     * Check if undo is available
     */
    bool canUndo() const;

    /**
     * Check if redo is available
     */
    bool canRedo() const;

    /**
     * Get undo description
     */
    juce::String getUndoDescription() const;

    /**
     * Get redo description
     */
    juce::String getRedoDescription() const;

    /**
     * Clear undo history
     */
    void clearHistory();

    /**
     * Get number of undo actions
     */
    int getNumUndoActions() const;

    /**
     * Get number of redo actions
     */
    int getNumRedoActions() const;

    /**
     * Get maximum number of undo actions
     */
    int getMaxNumberOfActions() const;

    /**
     * Set maximum number of undo actions
     *
     * @param maxActions Maximum number of undo actions to keep
     */
    void setMaxNumberOfActions(int maxActions);

    /**
     * Get underlying JUCE UndoManager
     *
     * For advanced usage.
     */
    juce::UndoManager& getUndoManager();

private:
    /**
     * Create undoable action from snapshots
     */
    std::unique_ptr<juce::UndoableAction> createAction(
        std::shared_ptr<SongState> before,
        std::shared_ptr<SongState> after,
        const juce::String& description
    );

    // JUCE UndoManager
    std::unique_ptr<juce::UndoManager> undoManager;

    // Undo state manager
    UndoState* undoState;

    // Audio engine reference
    AudioEngineUndo* audioEngine;

    // Current action snapshots
    std::shared_ptr<SongState> currentBeforeSnapshot;
    juce::String currentActionDescription;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(UndoManagerWrapper)
};

// ============================================================================
// Inline Helpers
// ============================================================================

/**
 * Create SongContract undoable action
 */
inline std::unique_ptr<SongContractUndoableAction> makeSongContractAction(
    std::shared_ptr<SongState> before,
    std::shared_ptr<SongState> after,
    const juce::String& description,
    AudioEngineUndo* audioEngine = nullptr
)
{
    return std::make_unique<SongContractUndoableAction>(
        before,
        after,
        description,
        audioEngine
    );
}

/**
 * Create PerformanceState undoable action
 */
inline std::unique_ptr<PerformanceStateUndoableAction> makePerformanceAction(
    const juce::String& oldPerformance,
    const juce::String& newPerformance,
    const juce::String& description,
    AudioEngineUndo* audioEngine = nullptr
)
{
    return std::make_unique<PerformanceStateUndoableAction>(
        oldPerformance,
        newPerformance,
        description,
        audioEngine
    );
}
