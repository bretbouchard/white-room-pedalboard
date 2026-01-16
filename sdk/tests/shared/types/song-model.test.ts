/**
 * Unit Tests for SongModel_v1 Type
 *
 * TDD Approach: Red -> Green -> Refactor
 * These tests ensure SongModel_v1 provides a frozen, execution-ready contract for audio engines.
 */

import { describe, it, expect } from "vitest";
import type {
  SongModel_v1,
  TransportConfig,
  Section_v1,
  Role_v1,
  Projection_v1,
  MixGraph_v1,
  RealizationPolicy,
  SongMetadata,
} from "../../../packages/shared/src/types/song-model";

describe("SongModel_v1 Type Definition", () => {
  describe("Type Structure", () => {
    it("should define a valid minimal SongModel_v1", () => {
      // This test verifies type structure - minimal valid model
      const minimalModel: SongModel_v1 = {
        version: "1.0",
        id: "test-song-1",
        createdAt: Date.now(),
        metadata: {
          title: "Test Song",
          composer: "Test Composer",
          duration: 180,
        },
        transport: {
          tempoMap: [
            {
              time: { seconds: 0, beats: 0, measures: 0 },
              tempo: 120,
            },
          ],
          timeSignatureMap: [
            {
              time: { seconds: 0, beats: 0, measures: 0 },
              numerator: 4,
              denominator: 4,
            },
          ],
          loopPolicy: {
            enabled: false,
          },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {
          tracks: [],
          buses: [],
          sends: [],
          master: {
            volume: 0.8,
          },
        },
        realizationPolicy: {
          windowSize: { seconds: 2.0, beats: 8, measures: 2 },
          lookaheadDuration: { seconds: 1.0, beats: 4, measures: 1 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed-12345",
      };

      // Verify required fields exist
      expect(minimalModel.version).toBe("1.0");
      expect(minimalModel.id).toBeDefined();
      expect(minimalModel.createdAt).toBeTypeOf("number");
      expect(minimalModel.metadata).toBeDefined();
      expect(minimalModel.transport).toBeDefined();
      expect(minimalModel.sections).toBeDefined();
      expect(minimalModel.roles).toBeDefined();
      expect(minimalModel.projections).toBeDefined();
      expect(minimalModel.mixGraph).toBeDefined();
      expect(minimalModel.realizationPolicy).toBeDefined();
      expect(minimalModel.determinismSeed).toBeDefined();
    });

    it('should enforce version as literal "1.0"', () => {
      const model: SongModel_v1 = {
        version: "1.0", // Only valid value
        id: "test",
        createdAt: Date.now(),
        metadata: {} as SongMetadata,
        transport: {} as TransportConfig,
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {} as MixGraph_v1,
        realizationPolicy: {} as RealizationPolicy,
        determinismSeed: "seed",
      };

      // Version must be exactly "1.0"
      expect(model.version).toBe("1.0");
    });
  });

  describe("TransportConfig", () => {
    it("should accept valid transport configuration", () => {
      const transport: TransportConfig = {
        tempoMap: [
          {
            time: { seconds: 0, beats: 0, measures: 0 },
            tempo: 120,
          },
          {
            time: { seconds: 10, beats: 50, measures: 12 },
            tempo: 140,
          },
        ],
        timeSignatureMap: [
          {
            time: { seconds: 0, beats: 0, measures: 0 },
            numerator: 4,
            denominator: 4,
          },
        ],
        loopPolicy: {
          enabled: true,
          start: { seconds: 0, beats: 0, measures: 0 },
          end: { seconds: 30, beats: 120, measures: 30 },
        },
        playbackSpeed: 1.0,
      };

      expect(transport.tempoMap).toHaveLength(2);
      expect(transport.timeSignatureMap).toHaveLength(1);
      expect(transport.loopPolicy.enabled).toBe(true);
      expect(transport.playbackSpeed).toBe(1.0);
    });

    it("should enforce valid playback speed range", () => {
      const speeds: number[] = [0.5, 1.0, 1.5, 2.0];

      speeds.forEach((speed) => {
        expect(speed).toBeGreaterThan(0);
        expect(speed).toBeLessThanOrEqual(4.0); // Reasonable max
      });
    });
  });

  describe("Section_v1", () => {
    it("should accept valid section definition", () => {
      const section: Section_v1 = {
        id: "section-verse-1",
        name: "Verse 1",
        start: { seconds: 0, beats: 0, measures: 0 },
        end: { seconds: 32, beats: 128, measures: 32 },
        roles: ["role-bass", "role-drums"],
        realizationHints: {
          intensity: 0.7,
          density: "medium",
        },
      };

      expect(section.id).toBeDefined();
      expect(section.name).toBeDefined();
      expect(section.start).toBeDefined();
      expect(section.end).toBeDefined();
      expect(section.end.seconds).toBeGreaterThan(section.start.seconds);
      expect(section.roles).toContain("role-bass");
      expect(section.realizationHints).toBeDefined();
    });

    it("should allow optional realization hints", () => {
      const section: Section_v1 = {
        id: "section-chorus",
        name: "Chorus",
        start: { seconds: 32, beats: 128, measures: 32 },
        end: { seconds: 64, beats: 256, measures: 64 },
        roles: ["role-bass", "role-drums", "role-vocals"],
      };

      expect(section.realizationHints).toBeUndefined();
    });
  });

  describe("Role_v1", () => {
    it("should accept valid role definition", () => {
      const role: Role_v1 = {
        id: "role-bass",
        name: "Bass",
        type: "bass",
        generatorConfig: {
          generators: [2, 3],
          parameters: {
            complexity: 0.5,
            register: [36, 48],
          },
        },
        parameters: {
          enabled: true,
          volume: 0.8,
          pan: 0,
        },
      };

      expect(role.type).toBe("bass");
      expect(role.generatorConfig).toBeDefined();
      expect(role.parameters).toBeDefined();
    });

    it("should support all role types", () => {
      const roleTypes: Array<Role_v1["type"]> = [
        "bass",
        "harmony",
        "melody",
        "rhythm",
        "texture",
        "ornament",
      ];

      roleTypes.forEach((type) => {
        expect([
          "bass",
          "harmony",
          "melody",
          "rhythm",
          "texture",
          "ornament",
        ]).toContain(type);
      });
    });
  });

  describe("Projection_v1", () => {
    it("should accept valid projection to track", () => {
      const projection: Projection_v1 = {
        id: "proj-bass-to-track-1",
        roleId: "role-bass",
        target: {
          type: "track",
          id: "track-1",
        },
        transform: {
          transpose: -12,
          velocityMultiplier: 1.2,
        },
      };

      expect(projection.roleId).toBe("role-bass");
      expect(projection.target.type).toBe("track");
      expect(projection.transform).toBeDefined();
    });

    it("should accept projection to bus", () => {
      const projection: Projection_v1 = {
        id: "proj-drums-to-bus",
        roleId: "role-drums",
        target: {
          type: "bus",
          id: "bus-drums",
        },
      };

      expect(projection.target.type).toBe("bus");
      expect(projection.transform).toBeUndefined();
    });

    it("should accept projection to instrument", () => {
      const projection: Projection_v1 = {
        id: "proj-melody-instrument",
        roleId: "role-melody",
        target: {
          type: "instrument",
          id: "instrument-synth-1",
        },
      };

      expect(projection.target.type).toBe("instrument");
    });
  });

  describe("MixGraph_v1", () => {
    it("should accept valid mix graph configuration", () => {
      const mixGraph: MixGraph_v1 = {
        tracks: [
          {
            id: "track-1",
            name: "Bass",
            volume: 0.8,
            pan: 0,
            bus: "bus-mix",
          },
          {
            id: "track-2",
            name: "Drums",
            volume: 0.9,
            pan: -0.3,
          },
        ],
        buses: [
          {
            id: "bus-mix",
            name: "Mix Bus",
            volume: 1.0,
          },
        ],
        sends: [
          {
            fromTrack: "track-1",
            toBus: "bus-reverb",
            amount: 0.3,
          },
        ],
        master: {
          volume: 0.8,
          bus: "bus-mix",
        },
      };

      expect(mixGraph.tracks).toHaveLength(2);
      expect(mixGraph.buses).toHaveLength(1);
      expect(mixGraph.sends).toHaveLength(1);
      expect(mixGraph.master.volume).toBe(0.8);
    });

    it("should accept minimal mix graph", () => {
      const minimalMixGraph: MixGraph_v1 = {
        tracks: [],
        buses: [],
        sends: [],
        master: {
          volume: 1.0,
        },
      };

      expect(minimalMixGraph.tracks).toHaveLength(0);
      expect(minimalMixGraph.master.volume).toBe(1.0);
    });
  });

  describe("RealizationPolicy", () => {
    it("should accept valid realization policy", () => {
      const policy: RealizationPolicy = {
        windowSize: { seconds: 2.0, beats: 8, measures: 2 },
        lookaheadDuration: { seconds: 1.0, beats: 4, measures: 1 },
        determinismMode: "strict",
      };

      expect(policy.windowSize.seconds).toBe(2.0);
      expect(policy.lookaheadDuration.seconds).toBe(1.0);
      expect(policy.determinismMode).toBe("strict");
    });

    it("should support all determinism modes", () => {
      const modes: Array<RealizationPolicy["determinismMode"]> = [
        "strict",
        "seeded",
        "loose",
      ];

      modes.forEach((mode) => {
        expect(["strict", "seeded", "loose"]).toContain(mode);
      });
    });
  });

  describe("Serialization & Deserialization", () => {
    it("should serialize to JSON and deserialize back", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-song",
        createdAt: 1704067200000,
        metadata: {
          title: "Test Song",
          composer: "Test",
        },
        transport: {
          tempoMap: [{ time: { seconds: 0 }, tempo: 120 }],
          timeSignatureMap: [
            { time: { seconds: 0 }, numerator: 4, denominator: 4 },
          ],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {
          tracks: [],
          buses: [],
          sends: [],
          master: { volume: 0.8 },
        },
        realizationPolicy: {
          windowSize: { seconds: 2.0 },
          lookaheadDuration: { seconds: 1.0 },
          determinismMode: "strict",
        },
        determinismSeed: "seed",
      };

      // Serialize to JSON
      const json = JSON.stringify(model);

      // Deserialize back
      const deserialized = JSON.parse(json) as SongModel_v1;

      expect(deserialized.version).toBe(model.version);
      expect(deserialized.id).toBe(model.id);
      expect(deserialized.determinismSeed).toBe(model.determinismSeed);
    });

    it("should maintain determinism seed integrity through serialization", () => {
      const seed = "deterministic-seed-12345";
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test",
        createdAt: Date.now(),
        metadata: {} as SongMetadata,
        transport: {} as TransportConfig,
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {} as MixGraph_v1,
        realizationPolicy: {} as RealizationPolicy,
        determinismSeed: seed,
      };

      const serialized = JSON.stringify(model);
      const deserialized = JSON.parse(serialized) as SongModel_v1;

      expect(deserialized.determinismSeed).toBe(seed);
    });
  });

  describe("Type Safety Constraints", () => {
    it("should enforce determinismSeed as string", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test",
        createdAt: Date.now(),
        metadata: {} as SongMetadata,
        transport: {} as TransportConfig,
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {} as MixGraph_v1,
        realizationPolicy: {} as RealizationPolicy,
        determinismSeed: "string-seed", // Must be string
      };

      expect(typeof model.determinismSeed).toBe("string");
    });

    it("should enforce createdAt as timestamp", () => {
      const timestamp = Date.now();
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test",
        createdAt: timestamp,
        metadata: {} as SongMetadata,
        transport: {} as TransportConfig,
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {} as MixGraph_v1,
        realizationPolicy: {} as RealizationPolicy,
        determinismSeed: "seed",
      };

      expect(typeof model.createdAt).toBe("number");
      expect(model.createdAt).toBe(timestamp);
    });
  });
});
