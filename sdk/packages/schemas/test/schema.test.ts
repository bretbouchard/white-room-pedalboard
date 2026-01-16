/**
 * Schillinger SDK 2.1 - Schema Validation Tests
 *
 * Test JSON schema validation for all SDK entities.
 */

import { describe, it, expect } from "vitest";
import {
  getValidator,
  validateSchillingerSong,
  validateSongModel,
} from "../src/validator";
import type { SchillingerSong, SongModel } from "../src/types";

describe("SchemaValidator", () => {
  describe("SchillingerSong_v1 validation", () => {
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
        voiceCount: 1,
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

    it("should validate a valid SchillingerSong", () => {
      const result = validateSchillingerSong(validSong);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validSong);
    });

    it("should reject song without required version field", () => {
      const song = { ...validSong };
      // @ts-expect-error - testing missing required field
      delete song.version;

      const result = validateSchillingerSong(song);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.message.includes("version"))).toBe(
        true,
      );
    });

    it("should reject song with invalid UUID", () => {
      const song = { ...validSong, id: "not-a-uuid" };
      const result = validateSchillingerSong(song);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.message.includes("format"))).toBe(
        true,
      );
    });

    it("should reject song with negative seed", () => {
      const song = { ...validSong, seed: -1 };
      const result = validateSchillingerSong(song);
      expect(result.valid).toBe(false);
    });

    it("should reject song with seed too large", () => {
      const song = { ...validSong, seed: 2 ** 32 };
      const result = validateSchillingerSong(song);
      expect(result.valid).toBe(false);
    });

    it("should reject song with voiceCount exceeding maximum", () => {
      const song = {
        ...validSong,
        ensemble: {
          ...validSong.ensemble,
          voiceCount: 101, // Maximum is 100
        },
      };
      const result = validateSchillingerSong(song);
      expect(result.valid).toBe(false);
    });

    it("should accept song with optional book systems", () => {
      const songWithBooks: SchillingerSong = {
        ...validSong,
        book1: [
          {
            id: "550e8400-e29b-41d4-a716-446655440005",
            type: "resultant",
            generators: [
              { period: 4, phaseOffset: 0 },
              { period: 3, phaseOffset: 0 },
            ],
          },
        ],
      };

      const result = validateSchillingerSong(songWithBooks);
      expect(result.valid).toBe(true);
    });
  });

  describe("SongModel_v1 validation", () => {
    const validSongModel: SongModel = {
      version: "1.0",
      id: "550e8400-e29b-41d4-a716-446655440000",
      sourceSongId: "550e8400-e29b-41d4-a716-446655440001",
      derivationId: "550e8400-e29b-41d4-a716-446655440002",
      timeline: {
        sections: [],
        tempo: 120,
        timeSignature: [4, 4],
      },
      notes: [],
      tempo: 120,
      timeSignature: [4, 4],
      sampleRate: 48000,
      duration: 0,
      voiceAssignments: [],
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
      derivedAt: Date.now(),
    };

    it("should validate a valid SongModel", () => {
      const result = validateSongModel(validSongModel);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validSongModel);
    });

    it("should reject SongModel with invalid sample rate", () => {
      const model = { ...validSongModel, sampleRate: 22050 };
      const result = validateSongModel(model);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should reject SongModel with tempo too high", () => {
      const model = { ...validSongModel, tempo: 501 };
      const result = validateSongModel(model);
      expect(result.valid).toBe(false);
    });

    it("should reject SongModel with negative tempo", () => {
      const model = { ...validSongModel, tempo: 0 };
      const result = validateSongModel(model);
      expect(result.valid).toBe(false);
    });

    it("should accept valid sample rates", () => {
      const validRates = [44100, 48000, 96000] as const;

      for (const rate of validRates) {
        const model = { ...validSongModel, sampleRate: rate };
        const result = validateSongModel(model);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("Validator class API", () => {
    it("should return singleton instance", () => {
      const validator1 = getValidator();
      const validator2 = getValidator();
      expect(validator1).toBe(validator2);
    });

    it("should list available schemas", () => {
      const validator = getValidator();
      const schemas = validator.getAvailableSchemas();
      expect(schemas).toContain("SchillingerSong_v1");
      expect(schemas).toContain("SongModel_v1");
    });
  });
});
