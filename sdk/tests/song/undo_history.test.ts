/**
 * Undo History Tests
 *
 * Test-first (TDD) tests for undo history management system.
 *
 * These tests verify that:
 * 1. History records each edit operation
 * 2. History can be serialized to JSON
 * 3. History limits are enforced (max entries)
 * 4. History allows navigation to any point
 * 5. History can be cleared when requested
 * 6. History persists across sessions
 *
 * Architecture Context:
 * - Undo stack maintains history of operations
 * - Each history entry contains changes, timestamp, and metadata
 * - History is serializable for persistence
 * - Navigation allows jumping to any point in history
 * - Limits prevent unbounded memory growth
 *
 * @module tests/song/undo_history
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  UndoHistory,
  Change,
  HistoryEntry,
  SerializedHistory,
  createChange,
} from "../../packages/sdk/src/song/undo_history";

// =============================================================================
// TEST SUITE
// =============================================================================

describe("Undo History", () => {
  let history: UndoHistory;
  let testSong: any;

  beforeEach(() => {
    history = new UndoHistory("song-test-123", 100);

    // Create a minimal test song
    testSong = {
      id: "song-test-123",
      schemaVersion: "1.0",
      roles: [
        { id: "role:bass", name: "Bass" },
        { id: "role:melody", name: "Melody" },
      ],
      sections: [],
      projections: [],
      metadata: {
        createdAt: new Date().toISOString(),
        custom: {},
      },
    };
  });

  // ===========================================================================
  // History Recording
  // ===========================================================================

  describe("history recording", () => {
    it("should record each edit in history", () => {
      history.addEntry("Add bass role", createTestChanges(1), "test-user");
      history.addEntry("Add melody role", createTestChanges(2), "test-user");
      history.addEntry("Update section", createTestChanges(3), "test-user");

      const allEntries = history.getHistory();

      expect(allEntries).toHaveLength(3);
      expect(allEntries[0].description).toBe("Add bass role");
      expect(allEntries[1].description).toBe("Add melody role");
      expect(allEntries[2].description).toBe("Update section");
    });

    it("should maintain chronological order", () => {
      history.addEntry("Third", createTestChanges(3), "test-user");
      history.addEntry("First", createTestChanges(1), "test-user");
      history.addEntry("Second", createTestChanges(2), "test-user");

      const allEntries = history.getHistory();

      // Order should be insertion order
      expect(allEntries[0].description).toBe("Third");
      expect(allEntries[1].description).toBe("First");
      expect(allEntries[2].description).toBe("Second");
    });

    it("should trim history branch when adding after undo", () => {
      // Add 5 entries
      for (let i = 1; i <= 5; i++) {
        history.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      // Navigate back to index 1 (Entry 2)
      history.navigateTo(1);

      // Add new entry - should cut off entries after index 1
      history.addEntry("New branch", createTestChanges(6), "test-user");

      const allEntries = history.getHistory();

      // Should have 3 entries: Entry 1, Entry 2, New branch
      expect(allEntries).toHaveLength(3);
      expect(allEntries[0].description).toBe("Entry 1");
      expect(allEntries[1].description).toBe("Entry 2");
      expect(allEntries[2].description).toBe("New branch");
    });

    it("should track current index correctly", () => {
      expect(history.getCurrentIndex()).toBe(-1);

      history.addEntry("First", createTestChanges(1), "test-user");
      expect(history.getCurrentIndex()).toBe(0);

      history.addEntry("Second", createTestChanges(2), "test-user");
      expect(history.getCurrentIndex()).toBe(1);

      history.navigateTo(0);
      expect(history.getCurrentIndex()).toBe(0);
    });

    it("should store changes with metadata", () => {
      const changes = createTestChanges(1);
      history.addEntry("Test edit", changes, "composer-jane", { key: "value" });

      const retrieved = history.getHistory()[0];

      expect(retrieved.changes).toEqual(changes);
      expect(retrieved.author).toBe("composer-jane");
      expect(retrieved.context).toEqual({ key: "value" });
    });

    it("should generate unique IDs for each entry", () => {
      const id1 = history.addEntry("First", createTestChanges(1), "test-user");
      const id2 = history.addEntry("Second", createTestChanges(2), "test-user");

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it("should track timestamps for each entry", () => {
      history.addEntry("First", createTestChanges(1), "test-user");

      const entry = history.getHistory()[0];

      expect(entry.timestamp).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  // ===========================================================================
  // History Serialization
  // ===========================================================================

  describe("history serialization", () => {
    it("should serialize history to JSON", () => {
      history.addEntry("First edit", createTestChanges(1), "test-user");
      history.addEntry("Second edit", createTestChanges(2), "test-user");

      const serialized = history.serialize();

      expect(serialized).toHaveProperty("version", "1.0");
      expect(serialized).toHaveProperty("entries");
      expect(serialized).toHaveProperty("currentIndex");
      expect(serialized).toHaveProperty("maxEntries");

      expect(serialized.entries).toHaveLength(2);
      expect(serialized.currentIndex).toBe(1);
    });

    it("should include all entry data in serialized JSON", () => {
      const changes = createTestChanges(1);
      history.addEntry("Test edit", changes, "test-user", {
        projectId: "project-123",
      });

      const serialized = history.serialize();

      const serializedEntry = serialized.entries[0];
      expect(serializedEntry).toHaveProperty("id");
      expect(serializedEntry).toHaveProperty("timestamp");
      expect(serializedEntry).toHaveProperty("description", "Test edit");
      expect(serializedEntry).toHaveProperty("changes");
      expect(serializedEntry).toHaveProperty("author", "test-user");
      expect(serializedEntry.context).toEqual({ projectId: "project-123" });
    });

    it("should deserialize history from JSON", () => {
      const originalHistory = new UndoHistory("song-test-123", 50);
      originalHistory.addEntry("First", createTestChanges(1), "test-user");
      originalHistory.addEntry("Second", createTestChanges(2), "test-user");
      originalHistory.navigateTo(0);

      const serialized = originalHistory.serialize();
      const restored = UndoHistory.deserialize(serialized, "song-test-123");

      expect(restored.getHistory()).toHaveLength(2);
      expect(restored.getCurrentIndex()).toBe(0);
      expect(restored.getHistory()[0].description).toBe("First");
      expect(restored.getHistory()[1].description).toBe("Second");
    });

    it("should preserve max entries limit after deserialization", () => {
      const smallHistory = new UndoHistory("song-test-12345", 10);
      smallHistory.addEntry("Test", createTestChanges(1), "test-user");

      const serialized = smallHistory.serialize();
      const restored = UndoHistory.deserialize(serialized, "song-test-12345");

      // Add 20 entries
      for (let i = 2; i <= 20; i++) {
        restored.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      // Should limit to 10
      expect(restored.getHistory().length).toBeLessThanOrEqual(10);
    });

    it("should handle empty history serialization", () => {
      const emptyHistory = new UndoHistory("song-test-12345", 100);
      const serialized = emptyHistory.serialize();

      expect(serialized.entries).toHaveLength(0);
      expect(serialized.currentIndex).toBe(-1);

      const restored = UndoHistory.deserialize(serialized, "song-test-12345");
      expect(restored.getHistory()).toHaveLength(0);
      expect(restored.getCurrentIndex()).toBe(-1);
    });

    it("should serialize and deserialize complex changes", () => {
      const complexChanges = [
        createChange("roles", "add", null, { id: "new-role", name: "New" }),
        createChange("sections.0.tempo", "update", 120, 140),
        createChange("metadata.custom.key", "add", null, "value"),
      ];

      history.addEntry("Complex edit", complexChanges, "test-user");

      const serialized = history.serialize();
      const restored = UndoHistory.deserialize(serialized, "song-test-123");

      const restoredEntry = restored.getHistory()[0];
      expect(restoredEntry.changes).toEqual(complexChanges);
    });

    it("should validate version during deserialization", () => {
      const serialized: SerializedHistory = {
        version: "2.0",
        entries: [],
        maxEntries: 100,
        currentIndex: -1,
      };

      expect(() =>
        UndoHistory.deserialize(serialized, "song-test-12345")
      ).toThrow("Unsupported version");
    });
  });

  // ===========================================================================
  // History Limits
  // ===========================================================================

  describe("history limits", () => {
    it("should enforce max entries limit", () => {
      const smallHistory = new UndoHistory("song-test-12345", 5);

      // Add 10 entries
      for (let i = 1; i <= 10; i++) {
        smallHistory.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      const entries = smallHistory.getHistory();

      // Should only keep last 5 entries (6-10)
      expect(entries).toHaveLength(5);
      expect(entries[0].description).toBe("Entry 6");
      expect(entries[4].description).toBe("Entry 10");
    });

    it("should adjust current index when trimming oldest entry", () => {
      const smallHistory = new UndoHistory("song-test-12345", 3);

      smallHistory.addEntry("Entry 1", createTestChanges(1), "test-user");
      smallHistory.addEntry("Entry 2", createTestChanges(2), "test-user");
      smallHistory.addEntry("Entry 3", createTestChanges(3), "test-user");

      expect(smallHistory.getCurrentIndex()).toBe(2);

      // Add 4th entry - should trim first entry
      smallHistory.addEntry("Entry 4", createTestChanges(4), "test-user");

      // Current index should be adjusted
      expect(smallHistory.getHistory()).toHaveLength(3);
      expect(smallHistory.getCurrentIndex()).toBe(2);
    });

    it("should preserve newest entries when limit exceeded", () => {
      const history = new UndoHistory("song-test-12345", 100);

      // Add 150 entries
      for (let i = 1; i <= 150; i++) {
        history.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      const entries = history.getHistory();

      expect(entries).toHaveLength(100);
      expect(entries[0].description).toBe("Entry 51"); // First kept entry
      expect(entries[99].description).toBe("Entry 150"); // Last entry
    });

    it("should handle navigation within limited history", () => {
      const history = new UndoHistory("song-test-12345", 5);

      for (let i = 1; i <= 10; i++) {
        history.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      // Should have entries 6-10
      const entries = history.getHistory();
      expect(entries).toHaveLength(5);

      // Navigate to first available entry
      const result1 = history.navigateTo(0);
      expect(result1.success).toBe(true);
      expect(entries[0].description).toBe("Entry 6");

      // Navigate to last entry
      const result2 = history.navigateTo(4);
      expect(result2.success).toBe(true);
      expect(entries[4].description).toBe("Entry 10");
    });

    it("should use default max entries of 100", () => {
      const defaultHistory = new UndoHistory("song-test-12345");

      for (let i = 1; i <= 150; i++) {
        defaultHistory.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      expect(defaultHistory.getHistory().length).toBeLessThanOrEqual(100);
    });

    it("should allow changing max entries dynamically", () => {
      const history = new UndoHistory("song-test-12345", 100);

      for (let i = 1; i <= 50; i++) {
        history.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      expect(history.getHistory()).toHaveLength(50);

      // Reduce limit to 10
      history.setMaxEntries(10);

      expect(history.getHistory()).toHaveLength(10);
      expect(history.getMaxEntries()).toBe(10);
    });
  });

  // ===========================================================================
  // History Navigation
  // ===========================================================================

  describe("history navigation", () => {
    beforeEach(() => {
      // Add 5 entries for navigation tests
      for (let i = 1; i <= 5; i++) {
        history.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }
    });

    it("should allow navigation to any point in history", () => {
      const result1 = history.navigateTo(0);
      const result3 = history.navigateTo(2);
      const result5 = history.navigateTo(4);

      expect(result1.success).toBe(true);
      expect(result1.currentIndex).toBe(0);

      expect(result3.success).toBe(true);
      expect(result3.currentIndex).toBe(2);

      expect(result5.success).toBe(true);
      expect(result5.currentIndex).toBe(4);
    });

    it("should return error for invalid navigation indices", () => {
      const result1 = history.navigateTo(-2);
      const result2 = history.navigateTo(100);

      expect(result1.success).toBe(false);
      expect(result1.error).toContain("out of bounds");

      expect(result2.success).toBe(false);
      expect(result2.error).toContain("out of bounds");
    });

    it("should update current index after navigation", () => {
      expect(history.getCurrentIndex()).toBe(4); // Start at last entry

      history.navigateTo(2);
      expect(history.getCurrentIndex()).toBe(2);

      history.navigateTo(0);
      expect(history.getCurrentIndex()).toBe(0);
    });

    it("should support undo navigation (move back)", () => {
      expect(history.getCurrentIndex()).toBe(4);

      const result1 = history.undo();
      expect(result1.success).toBe(true);
      expect(result1.currentIndex).toBe(3);

      const result2 = history.undo();
      expect(result2.success).toBe(true);
      expect(result2.currentIndex).toBe(2);
    });

    it("should support redo navigation (move forward)", () => {
      history.navigateTo(1);

      const result1 = history.redo();
      expect(result1.success).toBe(true);
      expect(result1.currentIndex).toBe(2);

      const result2 = history.redo();
      expect(result2.success).toBe(true);
      expect(result2.currentIndex).toBe(3);
    });

    it("should check if can undo", () => {
      expect(history.canUndo()).toBe(true);

      // Navigate to first entry, then undo to go to "before history"
      history.navigateTo(0);
      history.undo();
      expect(history.canUndo()).toBe(false);
    });

    it("should check if can redo", () => {
      history.navigateTo(0);
      expect(history.canRedo()).toBe(true);

      history.navigateTo(4);
      expect(history.canRedo()).toBe(false);
    });

    it("should return error when undoing at beginning", () => {
      // Navigate to first entry, then undo to go to "before history"
      history.navigateTo(0);
      history.undo();

      // Now undo should fail
      const result = history.undo();
      expect(result.success).toBe(false);
      // Error message should indicate we're at the beginning
      expect(result.error).toBeDefined();
      expect(result.error).toContain("beginning");
    });

    it("should return error when redoing at end", () => {
      const result = history.redo();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Already at end of history");
    });

    it("should handle navigation on empty history", () => {
      const emptyHistory = new UndoHistory("song-test-12345", 100);

      const result = emptyHistory.navigateTo(0);
      expect(result.success).toBe(false);
      expect(result.error).toContain("out of bounds");
    });
  });

  // ===========================================================================
  // History Clearing
  // ===========================================================================

  describe("history clearing", () => {
    it("should clear all history entries", () => {
      history.addEntry("First", createTestChanges(1), "test-user");
      history.addEntry("Second", createTestChanges(2), "test-user");
      history.addEntry("Third", createTestChanges(3), "test-user");

      expect(history.getHistory()).toHaveLength(3);

      history.clear();

      expect(history.getHistory()).toHaveLength(0);
    });

    it("should reset current index after clear", () => {
      history.addEntry("First", createTestChanges(1), "test-user");
      history.addEntry("Second", createTestChanges(2), "test-user");

      expect(history.getCurrentIndex()).toBe(1);

      history.clear();

      expect(history.getCurrentIndex()).toBe(-1);
    });

    it("should allow adding entries after clear", () => {
      history.addEntry("First", createTestChanges(1), "test-user");
      history.clear();

      history.addEntry("New first", createTestChanges(2), "test-user");

      expect(history.getHistory()).toHaveLength(1);
      expect(history.getCurrentIndex()).toBe(0);
    });

    it("should handle multiple clears", () => {
      history.addEntry("First", createTestChanges(1), "test-user");
      history.clear();
      history.clear();

      expect(history.getHistory()).toHaveLength(0);
      expect(history.getCurrentIndex()).toBe(-1);
    });

    it("should reset canUndo and canRedo after clear", () => {
      history.addEntry("First", createTestChanges(1), "test-user");
      history.addEntry("Second", createTestChanges(2), "test-user");

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });
  });

  // ===========================================================================
  // History Persistence
  // ===========================================================================

  describe("history persistence", () => {
    it("should persist history across sessions", () => {
      // Session 1: Create and modify history
      const session1 = new UndoHistory("song-test-12345", 100);
      session1.addEntry("Session 1 - Edit 1", createTestChanges(1), "test-user");
      session1.addEntry("Session 1 - Edit 2", createTestChanges(2), "test-user");
      session1.navigateTo(0);

      // Simulate save to storage
      const savedJSON = session1.serialize();

      // Session 2: Load from storage
      const session2 = UndoHistory.deserialize(savedJSON, "song-test-12345");

      // Should have same state
      expect(session2.getHistory()).toHaveLength(2);
      expect(session2.getCurrentIndex()).toBe(0);
      expect(session2.getHistory()[0].description).toBe("Session 1 - Edit 1");
      expect(session2.getHistory()[1].description).toBe("Session 1 - Edit 2");
    });

    it("should preserve metadata across persistence", () => {
      history.addEntry(
        "Metadata test",
        createTestChanges(1),
        "composer-jane",
        { projectId: "project-123", sessionId: "session-abc" }
      );

      const json = history.serialize();
      const restored = UndoHistory.deserialize(json, "song-test-123");

      const restoredEntry = restored.getHistory()[0];
      expect(restoredEntry.author).toBe("composer-jane");
      expect(restoredEntry.context).toEqual({
        projectId: "project-123",
        sessionId: "session-abc",
      });
    });

    it("should persist navigation state", () => {
      for (let i = 1; i <= 5; i++) {
        history.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }
      history.navigateTo(2);

      const json = history.serialize();
      const restored = UndoHistory.deserialize(json, "song-test-123");

      expect(restored.getCurrentIndex()).toBe(2);
    });

    it("should persist max entries configuration", () => {
      const customHistory = new UndoHistory("song-test-12345", 250);
      customHistory.addEntry("Test", createTestChanges(1), "test-user");

      const json = customHistory.serialize();
      const restored = UndoHistory.deserialize(json, "song-test-12345");

      // Try to exceed the persisted limit
      for (let i = 2; i <= 300; i++) {
        restored.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      expect(restored.getHistory().length).toBeLessThanOrEqual(250);
    });

    it("should handle large history persistence", () => {
      const largeHistory = new UndoHistory("song-test-12345", 1000);

      // Add 500 entries
      for (let i = 1; i <= 500; i++) {
        largeHistory.addEntry(`Entry ${i}`, createTestChanges(i), "test-user");
      }

      const json = largeHistory.serialize();
      const restored = UndoHistory.deserialize(json, "song-test-12345");

      expect(restored.getHistory()).toHaveLength(500);
      expect(restored.getCurrentIndex()).toBe(499);
    });

    it("should maintain data integrity after round-trip", () => {
      const original = new UndoHistory("song-test-12345", 50);

      for (let i = 1; i <= 10; i++) {
        const changes = [
          createChange(`key${i}`, "update", i * 10, i * 100),
        ];
        original.addEntry(`Entry ${i}`, changes, "test-user", { index: i });
      }
      original.navigateTo(5);

      // Round-trip
      const json = original.serialize();
      const restored = UndoHistory.deserialize(json, "song-test-12345");

      // Verify all data
      expect(restored.getHistory()).toHaveLength(10);
      expect(restored.getCurrentIndex()).toBe(5);

      for (let i = 0; i < 10; i++) {
        const entry = restored.getHistory()[i];
        expect(entry.changes[0].oldValue).toBe((i + 1) * 10);
        expect(entry.changes[0].newValue).toBe((i + 1) * 100);
        expect(entry.context).toEqual({ index: i + 1 });
      }
    });
  });

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  describe("query methods", () => {
    beforeEach(() => {
      // Add entries by different authors
      history.addEntry("Entry by Alice", createTestChanges(1), "alice");
      history.addEntry("Entry by Bob", createTestChanges(2), "bob");
      history.addEntry("Another by Alice", createTestChanges(3), "alice");
    });

    it("should get entries by author", () => {
      const aliceEntries = history.getEntriesByAuthor("alice");
      const bobEntries = history.getEntriesByAuthor("bob");

      expect(aliceEntries).toHaveLength(2);
      expect(bobEntries).toHaveLength(1);
      expect(aliceEntries[0].description).toBe("Entry by Alice");
      expect(aliceEntries[1].description).toBe("Another by Alice");
    });

    it("should search entries by description", () => {
      const results = history.searchByDescription("Alice");

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.description.includes("Alice"))).toBe(
        true
      );
    });

    it("should get entry by ID", () => {
      const id = history.addEntry("Find me", createTestChanges(4), "test-user");

      const entry = history.getEntryById(id);

      expect(entry).toBeDefined();
      expect(entry!.description).toBe("Find me");
    });

    it("should get statistics", () => {
      const stats = history.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.currentIndex).toBe(2);
      expect(stats.canUndo).toBe(true);
      expect(stats.canRedo).toBe(false);
      expect(stats.maxEntries).toBe(100);
      expect(stats.targetId).toBe("song-test-123");
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it("should get entries in time range", () => {
      const now = Date.now();
      const startTime = now - 10000;
      const endTime = now + 10000;

      const entries = history.getEntriesInTimeRange(startTime, endTime);

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.length).toBeLessThanOrEqual(3);
    });
  });

  // ===========================================================================
  // Edge Cases and Error Handling
  // ===========================================================================

  describe("edge cases", () => {
    it("should throw error for empty description", () => {
      expect(() =>
        history.addEntry("", createTestChanges(1), "test-user")
      ).toThrow("Description cannot be empty");
    });

    it("should throw error for empty changes array", () => {
      expect(() =>
        history.addEntry("Test", [], "test-user")
      ).toThrow("Changes array cannot be empty");
    });

    it("should accept valid UUID as target ID", () => {
      // Test that valid UUIDs are accepted
      const validId = "123e4567-e89b-12d3-a456-426614174000";
      expect(() => new UndoHistory(validId, 10)).not.toThrow();
    });

    it("should throw error for invalid max entries", () => {
      expect(() => new UndoHistory("song-test-12345", 0)).toThrow(
        "maxEntries must be at least 1"
      );
    });

    it("should handle cloning history", () => {
      history.addEntry("First", createTestChanges(1), "alice");
      history.addEntry("Second", createTestChanges(2), "bob");

      const cloned = history.clone("new-target-1234");

      expect(cloned.getHistory()).toHaveLength(2);
      expect(cloned.targetId).toBe("new-target-1234");
      expect(cloned.getCurrentIndex()).toBe(1);

      // Modifying clone should not affect original
      cloned.clear();
      expect(history.getHistory()).toHaveLength(2);
    });

    it("should validate change paths", () => {
      // This test verifies that createChange validates paths
      // The error is thrown during createChange, not addEntry
      expect(() => {
        const invalidChange = createChange("", "update", 1, 2);
        history.addEntry("Test", [invalidChange], "test-user");
      }).toThrow("Path cannot be empty");
    });
  });
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create test changes for an entry
 */
function createTestChanges(id: number): Change[] {
  return [
    createChange("test", "update", id - 1, id),
    createChange("modified", "add", null, { value: id }),
  ];
}
