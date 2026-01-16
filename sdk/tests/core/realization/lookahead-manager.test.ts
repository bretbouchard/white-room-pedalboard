/**
 * LookaheadManager Tests (TDD - RED Phase)
 *
 * Testing bounded lookahead calculation and enforcement
 */

import { describe, it, expect } from "vitest";
import { SongModel_v1 } from "../../../packages/shared/src/types/song-model";
import { LookaheadManager } from "../../../packages/core/src/realization/lookahead-manager";

describe("LookaheadManager", () => {
  describe("calculateLookahead", () => {
    it("should calculate lookahead requirements for simple model", () => {
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
        projections: [],
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

      const manager = new LookaheadManager();
      const requirements = manager.calculateLookahead(model);

      expect(requirements.minLookahead).toBeDefined();
      expect(requirements.maxLookahead).toBeDefined();
      expect(requirements.minLookahead).toBeGreaterThan(0);
      expect(requirements.maxLookahead).toBeLessThanOrEqual(10); // Reasonable upper bound
    });

    it("should enforce maximum lookahead bounds", () => {
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
          tracks: [],
          buses: [],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 100 }, // Excessive lookahead
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const manager = new LookaheadManager();
      const bounded = manager.enforceBoundaries(model, 5); // Max 5 seconds

      expect(bounded.lookaheadDuration).toBeDefined();
      expect(bounded.lookaheadDuration).toBeLessThanOrEqual(5);
    });

    it("should respect model realization policy", () => {
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

      const manager = new LookaheadManager();
      const requirements = manager.calculateLookahead(model);

      expect(requirements.recommendedLookahead).toBeCloseTo(2, 1);
    });
  });

  describe("enforceBoundaries", () => {
    it("should clamp lookahead to maximum", () => {
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
          tracks: [],
          buses: [],
          sends: [],
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 10 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const manager = new LookaheadManager();
      const bounded = manager.enforceBoundaries(model, 3); // Max 3 seconds

      expect(bounded.lookaheadDuration).toBeLessThanOrEqual(3);
      expect(bounded.wasClamped).toBe(true);
    });

    it("should not clamp when within bounds", () => {
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

      const manager = new LookaheadManager();
      const bounded = manager.enforceBoundaries(model, 5); // Max 5 seconds

      expect(bounded.lookaheadDuration).toBeCloseTo(2, 1);
      expect(bounded.wasClamped).toBe(false);
    });
  });

  describe("pregenerateEvents", () => {
    it("should pre-generate events within lookahead window", () => {
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

      const manager = new LookaheadManager();
      const currentTime = { seconds: 5 };
      const events = manager.pregenerateEvents(model, currentTime);

      // Events should be within [currentTime, currentTime + lookahead]
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);

      // Validate event times are within bounds
      for (const event of events) {
        expect(event.musicalTime?.seconds).toBeGreaterThanOrEqual(
          currentTime.seconds,
        );
        expect(event.musicalTime?.seconds).toBeLessThanOrEqual(
          currentTime.seconds +
            model.realizationPolicy.lookaheadDuration.seconds,
        );
      }
    });

    it("should respect loop boundaries when pre-generating", () => {
      const model: SongModel_v1 = {
        version: "1.0",
        id: "test-model",
        createdAt: Date.now(),
        metadata: { title: "Test" },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, numerator: 4, denominator: 4 }],
          loopPolicy: {
            enabled: true,
            start: 0,
            end: 10,
            count: 0, // Infinite loop
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
          master: { tempo: 120, timeSignature: [4, 4] },
        },
        realizationPolicy: {
          windowSize: { seconds: 1 },
          lookaheadDuration: { seconds: 2 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const manager = new LookaheadManager();
      const currentTime = { seconds: 9 }; // Near loop end
      const events = manager.pregenerateEvents(model, currentTime);

      // Should handle loop wraparound
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });
  });
});
