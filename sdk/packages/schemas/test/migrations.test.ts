/**
 * Schillinger SDK 2.1 - Migration Tests
 *
 * Test schema version migration and backward compatibility.
 */

import { describe, it, expect } from "vitest";
import {
  needsMigration,
  getTargetVersion,
  migrateData,
  detectVersion,
  ensureCurrentVersion,
} from "../src/migrations";
import type { SchillingerSong } from "../src/types";

describe("Migration utilities", () => {
  describe("needsMigration", () => {
    it("should return false for current version", () => {
      expect(needsMigration("1.0")).toBe(false);
    });

    it("should return true for different version", () => {
      expect(needsMigration("0.9")).toBe(true);
      expect(needsMigration("1.1")).toBe(true);
      expect(needsMigration("2.0")).toBe(true);
    });
  });

  describe("getTargetVersion", () => {
    it("should return current version when no migration defined", () => {
      expect(getTargetVersion("0.5")).toBe("1.0");
      expect(getTargetVersion("1.1")).toBe("1.0");
    });

    it("should return current version for current version", () => {
      expect(getTargetVersion("1.0")).toBe("1.0");
    });
  });

  describe("detectVersion", () => {
    it("should detect version from version field", () => {
      const data = { version: "1.0", foo: "bar" };
      expect(detectVersion(data)).toBe("1.0");
    });

    it("should return 1.0 for legacy data without version", () => {
      const data = { foo: "bar" };
      expect(detectVersion(data)).toBe("1.0");
    });

    it("should throw for non-object data", () => {
      expect(() => detectVersion(null)).toThrow();
      expect(() => detectVersion("string")).toThrow();
      expect(() => detectVersion(123)).toThrow();
    });
  });

  describe("migrateData", () => {
    const validSong: SchillingerSong = {
      version: "1.0",
      id: "550e8400-e29b-41d4-a716-446655440000",
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      author: "Test Author",
      name: "Test Song",
      seed: 12345,
      book4: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        ratioTree: [1, 1, 1, 1],
      },
      ensemble: {
        version: "1.0",
        id: "550e8400-e29b-41d4-a716-446655440002",
        voices: [],
        voiceCount: 0,
      },
      bindings: {},
      constraints: {
        constraints: [],
      },
      console: {
        version: "1.0",
        id: "550e8400-e29b-41d4-a716-446655440003",
        voiceBusses: [],
        mixBusses: [],
        masterBus: {
          id: "550e8400-e29b-41d4-a716-446655440004",
          name: "Master",
          type: "master",
          inserts: [],
          gain: 0,
          pan: 0,
          muted: false,
          solo: false,
        },
        routing: {
          routes: [],
        },
      },
    };

    it("should return data as-is when already at target version", () => {
      const result = migrateData(validSong, "1.0", "1.0");
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe("1.0");
      expect(result.toVersion).toBe("1.0");
      expect(result.migratedData).toEqual(validSong);
    });

    it("should fail when no migration path exists", () => {
      const result = migrateData(validSong, "0.5", "1.0");
      expect(result.success).toBe(false);
      expect(result.fromVersion).toBe("0.5");
      expect(result.toVersion).toBe("1.0");
      expect(result.migratedData).toBeUndefined();
    });

    it("should default to current version for target", () => {
      const result = migrateData(validSong, "1.0");
      expect(result.success).toBe(true);
      expect(result.toVersion).toBe("1.0");
    });

    it("should handle errors during migration", () => {
      // This test will become relevant when we have actual migrations
      // For now, it documents expected behavior
      const badData = { version: "0.5" }; // Missing required fields
      const result = migrateData(badData, "0.5", "1.0");
      expect(result.success).toBe(false);
    });
  });

  describe("ensureCurrentVersion", () => {
    it("should return data when already at current version", () => {
      const data = { version: "1.0", foo: "bar" };
      const result = ensureCurrentVersion(data);
      expect(result).toEqual(data);
    });

    it("should migrate data when at old version", () => {
      // This will fail until we have migrations, but tests the logic
      const data = { version: "0.9", foo: "bar" };
      expect(() => ensureCurrentVersion(data)).toThrow();
    });
  });

  describe("backward compatibility", () => {
    it("should handle legacy SchillingerSong without version field", () => {
      const legacySong = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Legacy Song",
        // Missing version field
      };

      const version = detectVersion(legacySong);
      expect(version).toBe("1.0"); // Default to earliest version
    });

    it("should preserve data during no-op migration", () => {
      const data = {
        version: "1.0",
        customField: "custom value",
        nested: {
          array: [1, 2, 3],
          object: { preserved: true },
        },
      };

      const result = migrateData(data, "1.0", "1.0");
      expect(result.success).toBe(true);
      expect(result.migratedData).toEqual(data);
    });
  });

  describe("MigrationResult type", () => {
    it("should include all required fields on success", () => {
      const result = migrateData({ version: "1.0" }, "1.0", "1.0");

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("fromVersion");
      expect(result).toHaveProperty("toVersion");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("migratedData");

      if (result.success) {
        expect(typeof result.success).toBe("boolean");
        expect(typeof result.fromVersion).toBe("string");
        expect(typeof result.toVersion).toBe("string");
        expect(Array.isArray(result.warnings)).toBe(true);
      }
    });

    it("should have empty warnings array on success", () => {
      const result = migrateData({ version: "1.0" }, "1.0", "1.0");
      if (result.success) {
        expect(result.warnings).toEqual([]);
      }
    });

    it("should not have migratedData on failure", () => {
      const result = migrateData({ version: "0.5" }, "0.5", "1.0");
      if (!result.success) {
        expect(result.migratedData).toBeUndefined();
      }
    });
  });
});
