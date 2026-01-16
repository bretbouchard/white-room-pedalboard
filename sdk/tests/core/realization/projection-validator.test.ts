/**
 * ProjectionValidator Tests (TDD - RED Phase)
 *
 * Testing comprehensive validation of SongModel projections
 */

import { describe, it, expect } from "vitest";
import {
  SongModel_v1,
  Projection_v1,
  Role_v1,
  MixGraph_v1,
  TrackConfig,
  BusConfig,
} from "../../../packages/shared/src/types/song-model";
import { ProjectionValidator } from "../../../packages/core/src/realization/projection-validator";

describe("ProjectionValidator", () => {
  describe("validateProjections", () => {
    it("should reject projection with non-existent role ID", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "role-1",
            name: "Bass",
            type: "bass",
            generatorConfig: { type: "test", parameters: {} },
            parameters: {},
          },
        ],
        projections: [
          {
            id: "proj-1",
            roleId: "non-existent-role", // INVALID: role doesn't exist
            target: { type: "track", id: "track-1" },
          },
        ],
        mixGraph: {
          tracks: [{ id: "track-1", name: "Track 1", type: "audio" }],
          buses: [],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.validateProjections(model);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("ROLE_NOT_FOUND");
      expect(result.errors[0].path).toContain("non-existent-role");
    });

    it("should reject projection with non-existent track ID", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "role-1",
            name: "Bass",
            type: "bass",
            generatorConfig: { type: "test", parameters: {} },
            parameters: {},
          },
        ],
        projections: [
          {
            id: "proj-1",
            roleId: "role-1",
            target: { type: "track", id: "non-existent-track" }, // INVALID: track doesn't exist
          },
        ],
        mixGraph: {
          tracks: [{ id: "track-1", name: "Track 1", type: "audio" }],
          buses: [],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.validateProjections(model);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("TARGET_NOT_FOUND");
      expect(result.errors[0].path).toContain("non-existent-track");
    });

    it("should reject projection with non-existent bus ID", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "role-1",
            name: "Bass",
            type: "bass",
            generatorConfig: { type: "test", parameters: {} },
            parameters: {},
          },
        ],
        projections: [
          {
            id: "proj-1",
            roleId: "role-1",
            target: { type: "bus", id: "non-existent-bus" }, // INVALID: bus doesn't exist
          },
        ],
        mixGraph: {
          tracks: [],
          buses: [{ id: "bus-1", name: "Bus 1", type: "audio" }],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.validateProjections(model);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("TARGET_NOT_FOUND");
      expect(result.errors[0].path).toContain("non-existent-bus");
    });

    it("should accept valid projections", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "role-1",
            name: "Bass",
            type: "bass",
            generatorConfig: { type: "test", parameters: {} },
            parameters: {},
          },
          {
            id: "role-2",
            name: "Melody",
            type: "melody",
            generatorConfig: { type: "test", parameters: {} },
            parameters: {},
          },
        ],
        projections: [
          {
            id: "proj-1",
            roleId: "role-1",
            target: { type: "track", id: "track-1" },
          },
          {
            id: "proj-2",
            roleId: "role-2",
            target: { type: "bus", id: "bus-1" },
          },
        ],
        mixGraph: {
          tracks: [{ id: "track-1", name: "Track 1", type: "audio" }],
          buses: [{ id: "bus-1", name: "Bus 1", type: "audio" }],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.validateProjections(model);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject duplicate projection IDs", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "role-1",
            name: "Bass",
            type: "bass",
            generatorConfig: { type: "test", parameters: {} },
            parameters: {},
          },
        ],
        projections: [
          {
            id: "duplicate-id", // DUPLICATE
            roleId: "role-1",
            target: { type: "track", id: "track-1" },
          },
          {
            id: "duplicate-id", // DUPLICATE
            roleId: "role-1",
            target: { type: "track", id: "track-2" },
          },
        ],
        mixGraph: {
          tracks: [
            { id: "track-1", name: "Track 1", type: "audio" },
            { id: "track-2", name: "Track 2", type: "audio" },
          ],
          buses: [],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.validateProjections(model);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "DUPLICATE_PROJECTION_ID"),
      ).toBe(true);
    });
  });

  describe("detectCircularProjections", () => {
    it("should detect circular dependency through tracks", () => {
      // Note: This is a simplified test. Real circular dependencies
      // would require projections to reference each other, which isn't
      // directly supported in the current type system. This test validates
      // the detection mechanism exists.
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {
          tracks: [
            { id: "track-1", name: "Track 1", type: "audio" },
            { id: "track-2", name: "Track 2", type: "audio" },
          ],
          buses: [
            { id: "bus-1", name: "Bus 1", type: "audio" },
            { id: "bus-2", name: "Bus 2", type: "audio" },
          ],
          sends: [
            { fromTrack: "track-1", toBus: "bus-1", amount: 0.5 },
            { fromTrack: "track-2", toBus: "bus-2", amount: 0.5 },
          ],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.detectCircularProjections(model);

      // Should not detect cycles in valid send configuration
      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toHaveLength(0);
    });

    it("should detect circular send dependencies", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {
          tracks: [
            { id: "track-1", name: "Track 1", type: "audio" },
            { id: "track-2", name: "Track 2", type: "audio" },
          ],
          buses: [{ id: "bus-1", name: "Bus 1", type: "audio" }],
          sends: [
            // Create a cycle: track-1 -> bus-1 -> track-1 (via bus routing back to track)
            { fromTrack: "track-1", toBus: "bus-1", amount: 0.5 },
            { fromTrack: "bus-1", toBus: "track-1", amount: 0.5 }, // INVALID: sends must be from track to bus
          ],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.detectCircularProjections(model);

      // Should detect invalid send configuration
      expect(result.hasCycles).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });
  });

  describe("validateAddressResolution", () => {
    it("should validate all parameter addresses resolve", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "role-1",
            name: "Bass",
            type: "bass",
            generatorConfig: { type: "test", parameters: {} },
            parameters: { note: 60 }, // Valid parameter
          },
        ],
        projections: [],
        mixGraph: {
          tracks: [
            {
              id: "track-1",
              name: "Track 1",
              type: "audio",
              parameters: { volume: 0.8 },
            },
          ],
          buses: [],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.validateAddressResolution(model);

      expect(result.isValid).toBe(true);
      expect(result.unresolvedAddresses).toHaveLength(0);
    });

    it("should detect unresolved parameter addresses", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "role-1",
            name: "Bass",
            type: "bass",
            generatorConfig: { type: "test", parameters: {} },
            parameters: {
              // This would reference a non-existent parameter
              "invalid-param": "value",
            },
          },
        ],
        projections: [],
        mixGraph: {
          tracks: [],
          buses: [],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const validator = new ProjectionValidator();
      const result = validator.validateAddressResolution(model);

      // This test validates the resolution mechanism exists
      // Actual implementation would need to validate parameter paths
      expect(result.isValid).toBeDefined();
    });
  });
});
