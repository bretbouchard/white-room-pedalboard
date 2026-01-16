/**
 * UndoCommands Implementation - FFI interface for undo/redo
 */

#include "undo/UndoCommands.h"
#include "undo/UndoState.h"
#include <sstream>

// ============================================================================
// FFIBoolResult Implementation
// ============================================================================

FFIBoolResult FFIBoolResult::ok()
{
    FFIBoolResult result;
    result.success = true;
    return result;
}

FFIBoolResult FFIBoolResult::err(const juce::String& message)
{
    FFIBoolResult result;
    result.success = false;
    result.error = message;
    return result;
}

juce::String FFIBoolResult::toJSON() const
{
    juce::String json;
    json += "{";
    json += "\"success\":";
    json += success ? "true" : "false";

    if (!error.isEmpty())
    {
        json += ",\"error\":\"";
        json += error.replace("\"", "\\\"");
        json += "\"";
    }

    json += "}";
    return json;
}

// ============================================================================
// FFIResult Implementation
// ============================================================================

template<typename T>
FFIResult<T> FFIResult<T>::ok(const T& value)
{
    FFIResult<T> result;
    result.success = true;
    result.data = value;
    return result;
}

template<typename T>
FFIResult<T> FFIResult<T>::err(const juce::String& message)
{
    FFIResult<T> result;
    result.success = false;
    result.error = message;
    return result;
}

template<typename T>
juce::String FFIResult<T>::toJSON() const
{
    juce::String json;
    json += "{";
    json += "\"success\":";
    json += success ? "true" : "false";

    if (success)
    {
        json += ",\"data\":";
        if constexpr (std::is_same_v<T, juce::String>)
        {
            json += "\"";
            json += data.replace("\"", "\\\"");
            json += "\"";
        }
        else if constexpr (std::is_same_v<T, bool>)
        {
            json += data ? "true" : "false";
        }
        else if constexpr (std::is_same_v<T, int>)
        {
            json += juce::String(data);
        }
    }
    else if (!error.isEmpty())
    {
        json += ",\"error\":\"";
        json += error.replace("\"", "\\\"");
        json += "\"";
    }

    json += "}";
    return json;
}

// Explicit instantiations
template struct FFIResult<bool>;
template struct FFIResult<int>;
template struct FFIResult<juce::String>;

// ============================================================================
// UndoManagerRegistry Implementation
// ============================================================================

UndoManagerRegistry::UndoManagerRegistry()
{
}

UndoManagerRegistry::~UndoManagerRegistry()
{
}

UndoManagerRegistry& UndoManagerRegistry::getInstance()
{
    static UndoManagerRegistry instance;
    return instance;
}

UndoManagerWrapper* UndoManagerRegistry::getUndoManager(const juce::String& songId)
{
    juce::ScopedLock lock(mutex);

    // Check if already exists
    auto it = undoManagers.find(songId);
    if (it != undoManagers.end())
    {
        return it->second.get();
    }

    // Create new undo manager
    auto wrapper = std::make_unique<UndoManagerWrapper>();

    // Initialize with undo state (if available)
    // Note: Full implementation would get UndoState from somewhere
    // For now, we'll initialize without it
    wrapper->initialize(nullptr);

    auto* ptr = wrapper.get();
    undoManagers[songId] = std::move(wrapper);

    return ptr;
}

void UndoManagerRegistry::removeUndoManager(const juce::String& songId)
{
    juce::ScopedLock lock(mutex);
    undoManagers.erase(songId);
}

bool UndoManagerRegistry::hasUndoManager(const juce::String& songId) const
{
    juce::ScopedLock lock(mutex);
    return undoManagers.find(songId) != undoManagers.end();
}

void UndoManagerRegistry::clear()
{
    juce::ScopedLock lock(mutex);
    undoManagers.clear();
}

// ============================================================================
// FFI Commands Implementation
// ============================================================================

FFIBoolResult undoCommand(const juce::String& songId)
{
    try
    {
        // Get undo manager for song
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIBoolResult::err("Undo manager not found for song: " + songId);
        }

        // Check if can undo
        if (!undoManager->canUndo())
        {
            return FFIBoolResult::err("Cannot undo: no undo history");
        }

        // Perform undo
        bool success = undoManager->undo();

        if (success)
        {
            return FFIBoolResult::ok();
        }
        else
        {
            return FFIBoolResult::err("Undo operation failed");
        }
    }
    catch (const std::exception& e)
    {
        return FFIBoolResult::err(juce::String("Exception during undo: ") + e.what());
    }
}

FFIBoolResult redoCommand(const juce::String& songId)
{
    try
    {
        // Get undo manager for song
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIBoolResult::err("Undo manager not found for song: " + songId);
        }

        // Check if can redo
        if (!undoManager->canRedo())
        {
            return FFIBoolResult::err("Cannot redo: no redo history");
        }

        // Perform redo
        bool success = undoManager->redo();

        if (success)
        {
            return FFIBoolResult::ok();
        }
        else
        {
            return FFIBoolResult::err("Redo operation failed");
        }
    }
    catch (const std::exception& e)
    {
        return FFIBoolResult::err(juce::String("Exception during redo: ") + e.what());
    }
}

FFIResult<bool> canUndoCommand(const juce::String& songId)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIResult<bool>::err("Undo manager not found for song: " + songId);
        }

        bool canUndo = undoManager->canUndo();
        return FFIResult<bool>::ok(canUndo);
    }
    catch (const std::exception& e)
    {
        return FFIResult<bool>::err(juce::String("Exception: ") + e.what());
    }
}

FFIResult<bool> canRedoCommand(const juce::String& songId)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIResult<bool>::err("Undo manager not found for song: " + songId);
        }

        bool canRedo = undoManager->canRedo();
        return FFIResult<bool>::ok(canRedo);
    }
    catch (const std::exception& e)
    {
        return FFIResult<bool>::err(juce::String("Exception: ") + e.what());
    }
}

FFIResult<juce::String> getUndoDescriptionCommand(const juce::String& songId)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIResult<juce::String>::err("Undo manager not found for song: " + songId);
        }

        juce::String description = undoManager->getUndoDescription();
        return FFIResult<juce::String>::ok(description);
    }
    catch (const std::exception& e)
    {
        return FFIResult<juce::String>::err(juce::String("Exception: ") + e.what());
    }
}

FFIResult<juce::String> getRedoDescriptionCommand(const juce::String& songId)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIResult<juce::String>::err("Undo manager not found for song: " + songId);
        }

        juce::String description = undoManager->getRedoDescription();
        return FFIResult<juce::String>::ok(description);
    }
    catch (const std::exception& e)
    {
        return FFIResult<juce::String>::err(juce::String("Exception: ") + e.what());
    }
}

FFIBoolResult beginUndoActionCommand(
    const juce::String& songId,
    const juce::String& actionDescription)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIBoolResult::err("Undo manager not found for song: " + songId);
        }

        undoManager->beginAction(actionDescription);
        return FFIBoolResult::ok();
    }
    catch (const std::exception& e)
    {
        return FFIBoolResult::err(juce::String("Exception: ") + e.what());
    }
}

FFIBoolResult endUndoActionCommand(
    const juce::String& songId,
    const juce::String& actionDescription)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIBoolResult::err("Undo manager not found for song: " + songId);
        }

        undoManager->endAction(actionDescription);
        return FFIBoolResult::ok();
    }
    catch (const std::exception& e)
    {
        return FFIBoolResult::err(juce::String("Exception: ") + e.what());
    }
}

FFIBoolResult clearUndoHistoryCommand(const juce::String& songId)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIBoolResult::err("Undo manager not found for song: " + songId);
        }

        undoManager->clearHistory();
        return FFIBoolResult::ok();
    }
    catch (const std::exception& e)
    {
        return FFIBoolResult::err(juce::String("Exception: ") + e.what());
    }
}

FFIResult<int> getUndoHistorySizeCommand(const juce::String& songId)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIResult<int>::err("Undo manager not found for song: " + songId);
        }

        int size = undoManager->getNumUndoActions();
        return FFIResult<int>::ok(size);
    }
    catch (const std::exception& e)
    {
        return FFIResult<int>::err(juce::String("Exception: ") + e.what());
    }
}

FFIResult<int> getRedoHistorySizeCommand(const juce::String& songId)
{
    try
    {
        auto& registry = UndoManagerRegistry::getInstance();
        auto* undoManager = registry.getUndoManager(songId);

        if (!undoManager)
        {
            return FFIResult<int>::err("Undo manager not found for song: " + songId);
        }

        int size = undoManager->getNumRedoActions();
        return FFIResult<int>::ok(size);
    }
    catch (const std::exception& e)
    {
        return FFIResult<int>::err(juce::String("Exception: ") + e.what());
    }
}

// ============================================================================
// C-Style FFI Exports
// ============================================================================

extern "C" {

bool undo_ffi(const char* songId, char* resultJson, int resultSize)
{
    if (!songId || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = undoCommand(juce::String::fromUTF8(songId));
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool redo_ffi(const char* songId, char* resultJson, int resultSize)
{
    if (!songId || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = redoCommand(juce::String::fromUTF8(songId));
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool canUndo_ffi(const char* songId, char* resultJson, int resultSize)
{
    if (!songId || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = canUndoCommand(juce::String::fromUTF8(songId));
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool canRedo_ffi(const char* songId, char* resultJson, int resultSize)
{
    if (!songId || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = canRedoCommand(juce::String::fromUTF8(songId));
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool getUndoDescription_ffi(const char* songId, char* resultJson, int resultSize)
{
    if (!songId || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = getUndoDescriptionCommand(juce::String::fromUTF8(songId));
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool getRedoDescription_ffi(const char* songId, char* resultJson, int resultSize)
{
    if (!songId || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = getRedoDescriptionCommand(juce::String::fromUTF8(songId));
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool beginUndoAction_ffi(
    const char* songId,
    const char* actionDescription,
    char* resultJson,
    int resultSize)
{
    if (!songId || !actionDescription || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = beginUndoActionCommand(
        juce::String::fromUTF8(songId),
        juce::String::fromUTF8(actionDescription)
    );
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool endUndoAction_ffi(
    const char* songId,
    const char* actionDescription,
    char* resultJson,
    int resultSize)
{
    if (!songId || !actionDescription || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = endUndoActionCommand(
        juce::String::fromUTF8(songId),
        juce::String::fromUTF8(actionDescription)
    );
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

bool clearUndoHistory_ffi(const char* songId, char* resultJson, int resultSize)
{
    if (!songId || !resultJson || resultSize <= 0)
    {
        return false;
    }

    auto result = clearUndoHistoryCommand(juce::String::fromUTF8(songId));
    juce::String json = result.toJSON();

    if (json.length() >= resultSize)
    {
        return false;
    }

    strncpy(resultJson, json.toUTF8(), resultSize - 1);
    resultJson[resultSize - 1] = '\0';

    return true;
}

} // extern "C"
