/**
 * UndoCommands Tests - FFI interface tests
 */

#include <gtest/gtest.h>
#include "undo/UndoCommands.h"

// ============================================================================
// FFIBoolResult Tests
// ============================================================================

TEST(FFIBoolResultTest, OkCreatesSuccessResult)
{
    auto result = FFIBoolResult::ok();

    EXPECT_TRUE(result.success);
    EXPECT_TRUE(result.error.isEmpty());
}

TEST(FFIBoolResultTest, ErrCreatesErrorResult)
{
    auto result = FFIBoolResult::err("Test error");

    EXPECT_FALSE(result.success);
    EXPECT_EQ(result.error, "Test error");
}

TEST(FFIBoolResultTest, ToJSONFormatsCorrectly)
{
    auto successResult = FFIBoolResult::ok();
    auto successJson = successResult.toJSON();

    EXPECT_TRUE(successJson.contains("\"success\":true"));

    auto errorResult = FFIBoolResult::err("Test error");
    auto errorJson = errorResult.toJSON();

    EXPECT_TRUE(errorJson.contains("\"success\":false"));
    EXPECT_TRUE(errorJson.contains("\"error\":\"Test error\""));
}

// ============================================================================
// FFIResult Tests
// ============================================================================

TEST(FFIResultTest, BoolOkCreatesSuccessResult)
{
    auto result = FFIResult<bool>::ok(true);

    EXPECT_TRUE(result.success);
    EXPECT_TRUE(result.data);
    EXPECT_TRUE(result.error.isEmpty());
}

TEST(FFIResultTest, BoolErrCreatesErrorResult)
{
    auto result = FFIResult<bool>::err("Test error");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.isNotEmpty());
}

TEST(FFIResultTest, IntOkCreatesSuccessResult)
{
    auto result = FFIResult<int>::ok(42);

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.data, 42);
    EXPECT_TRUE(result.error.isEmpty());
}

TEST(FFIResultTest, StringOkCreatesSuccessResult)
{
    auto result = FFIResult<juce::String>::ok("Test data");

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.data, "Test data");
    EXPECT_TRUE(result.error.isEmpty());
}

TEST(FFIResultTest, ToJSONFormatsBoolCorrectly)
{
    auto successResult = FFIResult<bool>::ok(true);
    auto successJson = successResult.toJSON();

    EXPECT_TRUE(successJson.contains("\"success\":true"));
    EXPECT_TRUE(successJson.contains("\"data\":true"));

    auto falseResult = FFIResult<bool>::ok(false);
    auto falseJson = falseResult.toJSON();

    EXPECT_TRUE(falseJson.contains("\"data\":false"));
}

TEST(FFIResultTest, ToJSONFormatsIntCorrectly)
{
    auto result = FFIResult<int>::ok(42);
    auto json = result.toJSON();

    EXPECT_TRUE(json.contains("\"success\":true"));
    EXPECT_TRUE(json.contains("\"data\":42"));
}

TEST(FFIResultTest, ToJSONFormatsStringCorrectly)
{
    auto result = FFIResult<juce::String>::ok("Test data");
    auto json = result.toJSON();

    EXPECT_TRUE(json.contains("\"success\":true"));
    EXPECT_TRUE(json.contains("\"data\":\"Test data\""));
}

TEST(FFIResultTest, ToJSONFormatsErrorCorrectly)
{
    auto result = FFIResult<int>::err("Test error");
    auto json = result.toJSON();

    EXPECT_TRUE(json.contains("\"success\":false"));
    EXPECT_TRUE(json.contains("\"error\":\"Test error\""));
}

// ============================================================================
// UndoManagerRegistry Tests
// ============================================================================

TEST(UndoManagerRegistryTest, GetInstanceReturnsSingleton)
{
    auto& registry1 = UndoManagerRegistry::getInstance();
    auto& registry2 = UndoManagerRegistry::getInstance();

    EXPECT_EQ(&registry1, &registry2);
}

TEST(UndoManagerRegistryTest, GetUndoManagerCreatesNewManager)
{
    auto& registry = UndoManagerRegistry::getInstance();

    auto* manager1 = registry.getUndoManager("song-1");
    auto* manager2 = registry.getUndoManager("song-2");

    EXPECT_NE(manager1, manager2);
}

TEST(UndoManagerRegistryTest, GetUndoManagerReturnsExistingManager)
{
    auto& registry = UndoManagerRegistry::getInstance();

    auto* manager1 = registry.getUndoManager("song-1");
    auto* manager2 = registry.getUndoManager("song-1");

    EXPECT_EQ(manager1, manager2);
}

TEST(UndoManagerRegistryTest, HasUndoManagerReturnsTrueForExisting)
{
    auto& registry = UndoManagerRegistry::getInstance();

    registry.getUndoManager("song-1");

    EXPECT_TRUE(registry.hasUndoManager("song-1"));
    EXPECT_FALSE(registry.hasUndoManager("song-2"));
}

TEST(UndoManagerRegistryTest, RemoveUndoManagerRemovesManager)
{
    auto& registry = UndoManagerRegistry::getInstance();

    registry.getUndoManager("song-1");
    EXPECT_TRUE(registry.hasUndoManager("song-1"));

    registry.removeUndoManager("song-1");
    EXPECT_FALSE(registry.hasUndoManager("song-1"));
}

TEST(UndoManagerRegistryTest, ClearRemovesAllManagers)
{
    auto& registry = UndoManagerRegistry::getInstance();

    registry.getUndoManager("song-1");
    registry.getUndoManager("song-2");
    registry.getUndoManager("song-3");

    EXPECT_TRUE(registry.hasUndoManager("song-1"));
    EXPECT_TRUE(registry.hasUndoManager("song-2"));
    EXPECT_TRUE(registry.hasUndoManager("song-3"));

    registry.clear();

    EXPECT_FALSE(registry.hasUndoManager("song-1"));
    EXPECT_FALSE(registry.hasUndoManager("song-2"));
    EXPECT_FALSE(registry.hasUndoManager("song-3"));
}

// ============================================================================
// FFI Command Tests
// ============================================================================

TEST(UndoCommandTest, UndoReturnsErrorForInvalidSong)
{
    auto result = undoCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(RedoCommandTest, RedoReturnsErrorForInvalidSong)
{
    auto result = redoCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(CanUndoCommandTest, CanUndoReturnsErrorForInvalidSong)
{
    auto result = canUndoCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(CanRedoCommandTest, CanRedoReturnsErrorForInvalidSong)
{
    auto result = canRedoCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(GetUndoDescriptionCommandTest, ReturnsErrorForInvalidSong)
{
    auto result = getUndoDescriptionCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(GetRedoDescriptionCommandTest, ReturnsErrorForInvalidSong)
{
    auto result = getRedoDescriptionCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(BeginUndoActionCommandTest, ReturnsErrorForInvalidSong)
{
    auto result = beginUndoActionCommand("nonexistent-song", "Test action");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(EndUndoActionCommandTest, ReturnsErrorForInvalidSong)
{
    auto result = endUndoActionCommand("nonexistent-song", "Test action");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(ClearUndoHistoryCommandTest, ReturnsErrorForInvalidSong)
{
    auto result = clearUndoHistoryCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(GetUndoHistorySizeCommandTest, ReturnsErrorForInvalidSong)
{
    auto result = getUndoHistorySizeCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

TEST(GetRedoHistorySizeCommandTest, ReturnsErrorForInvalidSong)
{
    auto result = getRedoHistorySizeCommand("nonexistent-song");

    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.error.contains("Undo manager not found"));
}

// ============================================================================
// C FFI Tests
// ============================================================================

TEST(CFFITest, UndoFFIHandlesNullInput)
{
    char buffer[1024];

    bool success = undo_ffi(nullptr, buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}

TEST(CFFITest, UndoFFIHandlesSmallBuffer)
{
    char buffer[10];

    bool success = undo_ffi("test-song", buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}

TEST(CFFITest, RedoFFIHandlesNullInput)
{
    char buffer[1024];

    bool success = redo_ffi(nullptr, buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}

TEST(CFFITest, CanUndoFFIHandlesNullInput)
{
    char buffer[1024];

    bool success = canUndo_ffi(nullptr, buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}

TEST(CFFITest, GetUndoDescriptionFFIHandlesNullInput)
{
    char buffer[1024];

    bool success = getUndoDescription_ffi(nullptr, buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}

TEST(CFFITest, BeginUndoActionFFIHandlesNullInput)
{
    char buffer[1024];

    bool success = beginUndoAction_ffi(nullptr, "Test action", buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}

TEST(CFFITest, EndUndoActionFFIHandlesNullInput)
{
    char buffer[1024];

    bool success = endUndoAction_ffi(nullptr, "Test action", buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}

TEST(CFFITest, ClearUndoHistoryFFIHandlesNullInput)
{
    char buffer[1024];

    bool success = clearUndoHistory_ffi(nullptr, buffer, sizeof(buffer));
    EXPECT_FALSE(success);
}
