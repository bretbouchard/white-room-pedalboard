/**
 * UUID Utilities Tests
 *
 * Tests for UUID generation and validation
 */

import { describe, it, expect } from "vitest";
import {
  generateUUID,
  isValidUUID,
  assertUUID,
  generateUUIDs,
  areAllValidUUIDs,
  filterValidUUIDs,
  testUUID,
  nilUUID,
  isNilUUID,
} from "../src/utils/uuid";

describe("UUID Utilities", () => {
  describe("generateUUID", () => {
    it("should generate valid UUID v4", () => {
      const uuid = generateUUID();

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate unique UUIDs", () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
    });

    it("should generate lowercase UUIDs", () => {
      const uuid = generateUUID();

      expect(uuid).toBe(uuid.toLowerCase());
    });
  });

  describe("isValidUUID", () => {
    it("should validate correct UUIDs", () => {
      const validUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "00000000-0000-4000-8000-000000000000",
        "ffffffff-ffff-4fff-bfff-ffffffffffff",
        generateUUID(),
      ];

      validUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should reject invalid UUIDs", () => {
      const invalidUUIDs = [
        "",
        "not-a-uuid",
        "550e8400-e29b-41d4-a716", // Too short
        "550e8400-e29b-41d4-a716-446655440000-extra", // Too long
        "g50e8400-e29b-41d4-a716-446655440000", // Invalid character
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe("assertUUID", () => {
    it("should not throw for valid UUIDs", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";

      expect(() => assertUUID(validUUID)).not.toThrow();
      expect(() => assertUUID(validUUID, "songId")).not.toThrow();
    });

    it("should throw for invalid UUIDs", () => {
      const invalidUUID = "not-a-uuid";

      expect(() => assertUUID(invalidUUID)).toThrow("Invalid UUID");
      expect(() => assertUUID(invalidUUID, "songId")).toThrow("Invalid songId");
    });

    it("should include the invalid value in error message", () => {
      const invalidUUID = "my-invalid-id";

      expect(() => assertUUID(invalidUUID, "testId")).toThrow(/my-invalid-id/);
    });
  });

  describe("generateUUIDs", () => {
    it("should generate specified count of UUIDs", () => {
      const uuids = generateUUIDs(5);

      expect(uuids).toHaveLength(5);
    });

    it("should generate unique UUIDs in batch", () => {
      const uuids = generateUUIDs(10);

      const unique = new Set(uuids);
      expect(unique.size).toBe(10);
    });

    it("should return empty array for zero count", () => {
      const uuids = generateUUIDs(0);

      expect(uuids).toEqual([]);
    });

    it("should throw for negative count", () => {
      expect(() => generateUUIDs(-1)).toThrow();
    });
  });

  describe("areAllValidUUIDs", () => {
    it("should return true if all UUIDs are valid", () => {
      const uuids = [generateUUID(), generateUUID(), "550e8400-e29b-41d4-a716-446655440000"];

      expect(areAllValidUUIDs(uuids)).toBe(true);
    });

    it("should return false if any UUID is invalid", () => {
      const uuids = [generateUUID(), "not-a-uuid", generateUUID()];

      expect(areAllValidUUIDs(uuids)).toBe(false);
    });

    it("should return true for empty array", () => {
      expect(areAllValidUUIDs([])).toBe(true);
    });
  });

  describe("filterValidUUIDs", () => {
    it("should filter out invalid UUIDs", () => {
      const mixed = [generateUUID(), "invalid-1", generateUUID(), "invalid-2", generateUUID()];

      const valid = filterValidUUIDs(mixed);

      expect(valid).toHaveLength(3);
      expect(valid.every(isValidUUID)).toBe(true);
    });

    it("should return empty array if all invalid", () => {
      const invalid = ["invalid-1", "invalid-2", "invalid-3"];

      const valid = filterValidUUIDs(invalid);

      expect(valid).toEqual([]);
    });

    it("should return all if all valid", () => {
      const valid = [generateUUID(), generateUUID(), generateUUID()];

      const result = filterValidUUIDs(valid);

      expect(result).toEqual(valid);
    });
  });

  describe("special UUIDs", () => {
    it("should provide test UUID", () => {
      const uuid = testUUID();

      expect(uuid).toBe("00000000-0000-4000-8000-000000000000");
      expect(isValidUUID(uuid)).toBe(true);
    });

    it("should provide nil UUID", () => {
      const uuid = nilUUID();

      expect(uuid).toBe("00000000-0000-0000-0000-000000000000");
      expect(isValidUUID(uuid)).toBe(true);
    });

    it("should detect nil UUID", () => {
      expect(isNilUUID(nilUUID())).toBe(true);
      expect(isNilUUID(testUUID())).toBe(false);
      expect(isNilUUID(generateUUID())).toBe(false);
    });
  });

  describe("real-world scenarios", () => {
    it("should generate and validate song IDs", () => {
      const songId = generateUUID();

      expect(isValidUUID(songId)).toBe(true);
      expect(() => assertUUID(songId, "songId")).not.toThrow();
    });

    it("should validate array of note IDs", () => {
      const noteIds = generateUUIDs(100);

      expect(areAllValidUUIDs(noteIds)).toBe(true);
    });

    it("should filter out corrupted IDs", () => {
      const valid = generateUUIDs(5);
      const corrupted = [
        ...valid,
        "corrupted",
        null as unknown as string,
        undefined as unknown as string,
      ];

      const cleaned = filterValidUUIDs(corrupted as string[]);

      expect(cleaned).toEqual(valid);
    });
  });
});
