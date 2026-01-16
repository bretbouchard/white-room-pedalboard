/**
 * UndoCommands - FFI interface for undo/redo operations
 *
 * Provides foreign function interface for undo/redo commands.
 * Exports undo/redo functionality to Swift/TypeScript layers.
 *
 * Core Features:
 * - FFI-compatible undo/redo commands
 * - Error handling with result types
 * - Thread-safe operations
 * - Song-specific undo managers
 *
 * Thread Safety:
 * - All commands are thread-safe
 * - Can be called from Swift UI thread
 * - Safe for concurrent access
 *
 * Integration:
 * - Called from Swift frontend via NAPI
 * - Integrates with UndoManagerWrapper
 * - Provides JSON-based error handling
 */

#pragma once

#include <juce_core/juce_core.h>
#include "undo/JUCEUndoBridge.h"
#include <memory>
#include <unordered_map>

// ============================================================================
// FFI Result Types
// ============================================================================

/**
 * FFI result type for operations returning bool
 */
struct FFIBoolResult
{
    bool success;
    juce::String error;

    /**
     * Create success result
     */
    static FFIBoolResult ok();

    /**
     * Create error result
     */
    static FFIBoolResult err(const juce::String& message);

    /**
     * Convert to JSON
     */
    juce::String toJSON() const;
};

/**
 * FFI result type for operations with data
 */
template<typename T>
struct FFIResult
{
    bool success;
    T data;
    juce::String error;

    /**
     * Create success result
     */
    static FFIResult<T> ok(const T& value);

    /**
     * Create error result
     */
    static FFIResult<T> err(const juce::String& message);

    /**
     * Convert to JSON
     */
    juce::String toJSON() const;
};

// ============================================================================
// UndoManagerRegistry
// ============================================================================

/**
 * Registry for song-specific undo managers
 *
 * Manages undo managers for multiple songs.
 * Thread-safe singleton pattern.
 */
class UndoManagerRegistry
{
public:
    /**
     * Get singleton instance
     */
    static UndoManagerRegistry& getInstance();

    /**
     * Get or create undo manager for song
     *
     * @param songId Song ID
     * @return Undo manager wrapper for song
     */
    UndoManagerWrapper* getUndoManager(const juce::String& songId);

    /**
     * Remove undo manager for song
     *
     * @param songId Song ID
     */
    void removeUndoManager(const juce::String& songId);

    /**
     * Check if song has undo manager
     *
     * @param songId Song ID
     * @return true if exists
     */
    bool hasUndoManager(const juce::String& songId) const;

    /**
     * Clear all undo managers
     */
    void clear();

private:
    UndoManagerRegistry();
    ~UndoManagerRegistry();

    // Map of song ID to undo manager wrapper
    std::unordered_map<juce::String, std::unique_ptr<UndoManagerWrapper>> undoManagers;

    // Mutex for thread safety
    juce::CriticalSection mutex;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(UndoManagerRegistry)
};

// ============================================================================
// FFI Commands
// ============================================================================

/**
 * Undo command (FFI-compatible)
 *
 * Performs undo for a song.
 *
 * @param songId Song ID to undo
 * @return FFI result with success/error
 */
FFIBoolResult undoCommand(const juce::String& songId);

/**
 * Redo command (FFI-compatible)
 *
 * Performs redo for a song.
 *
 * @param songId Song ID to redo
 * @return FFI result with success/error
 */
FFIBoolResult redoCommand(const juce::String& songId);

/**
 * Can undo command (FFI-compatible)
 *
 * Checks if undo is available for a song.
 *
 * @param songId Song ID to check
 * @return FFI result with bool data
 */
FFIResult<bool> canUndoCommand(const juce::String& songId);

/**
 * Can redo command (FFI-compatible)
 *
 * Checks if redo is available for a song.
 *
 * @param songId Song ID to check
 * @return FFI result with bool data
 */
FFIResult<bool> canRedoCommand(const juce::String& songId);

/**
 * Get undo description (FFI-compatible)
 *
 * Gets description of next undo action.
 *
 * @param songId Song ID
 * @return FFI result with description string
 */
FFIResult<juce::String> getUndoDescriptionCommand(const juce::String& songId);

/**
 * Get redo description (FFI-compatible)
 *
 * Gets description of next redo action.
 *
 * @param songId Song ID
 * @return FFI result with description string
 */
FFIResult<juce::String> getRedoDescriptionCommand(const juce::String& songId);

/**
 * Begin undo action (FFI-compatible)
 *
 * Begins a new undo action (before state change).
 *
 * @param songId Song ID
 * @param actionDescription Description of the action
 * @return FFI result with success/error
 */
FFIBoolResult beginUndoActionCommand(
    const juce::String& songId,
    const juce::String& actionDescription
);

/**
 * End undo action (FFI-compatible)
 *
 * Ends an undo action (after state change).
 *
 * @param songId Song ID
 * @param actionDescription Description of the action
 * @return FFI result with success/error
 */
FFIBoolResult endUndoActionCommand(
    const juce::String& songId,
    const juce::String& actionDescription
);

/**
 * Clear undo history (FFI-compatible)
 *
 * Clears undo history for a song.
 *
 * @param songId Song ID
 * @return FFI result with success/error
 */
FFIBoolResult clearUndoHistoryCommand(const juce::String& songId);

/**
 * Get undo history size (FFI-compatible)
 *
 * Gets number of undo actions for a song.
 *
 * @param songId Song ID
 * @return FFI result with size data
 */
FFIResult<int> getUndoHistorySizeCommand(const juce::String& songId);

/**
 * Get redo history size (FFI-compatible)
 *
 * Gets number of redo actions for a song.
 *
 * @param songId Song ID
 * @return FFI result with size data
 */
FFIResult<int> getRedoHistorySizeCommand(const juce::String& songId);

// ============================================================================
// C-Style FFI Exports
// ============================================================================

extern "C" {

/**
 * C FFI: Undo
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool undo_ffi(const char* songId, char* resultJson, int resultSize);

/**
 * C FFI: Redo
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool redo_ffi(const char* songId, char* resultJson, int resultSize);

/**
 * C FFI: Can undo
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool canUndo_ffi(const char* songId, char* resultJson, int resultSize);

/**
 * C FFI: Can redo
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool canRedo_ffi(const char* songId, char* resultJson, int resultSize);

/**
 * C FFI: Get undo description
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool getUndoDescription_ffi(const char* songId, char* resultJson, int resultSize);

/**
 * C FFI: Get redo description
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool getRedoDescription_ffi(const char* songId, char* resultJson, int resultSize);

/**
 * C FFI: Begin undo action
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param actionDescription Action description (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool beginUndoAction_ffi(
    const char* songId,
    const char* actionDescription,
    char* resultJson,
    int resultSize
);

/**
 * C FFI: End undo action
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param actionDescription Action description (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool endUndoAction_ffi(
    const char* songId,
    const char* actionDescription,
    char* resultJson,
    int resultSize
);

/**
 * C FFI: Clear undo history
 *
 * @param songId Song ID (null-terminated UTF-8)
 * @param resultJson Output buffer for JSON result (must be pre-allocated)
 * @param resultSize Size of result buffer
 * @return true if successful
 */
bool clearUndoHistory_ffi(const char* songId, char* resultJson, int resultSize);

} // extern "C"
