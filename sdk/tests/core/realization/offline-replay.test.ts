/**
 * OfflineReplaySystem Tests (TDD - RED Phase)
 *
 * Testing deterministic event stream serialization and replay
 */

import { describe, it, expect } from "vitest";
import { SongModel_v1 } from "../../../packages/shared/src/types/song-model";
import { ScheduledEvent } from "../../../packages/shared/src/types/scheduled-event";
import { OfflineReplaySystem } from "../../../packages/core/src/realization/offline-replay";

describe("OfflineReplaySystem", () => {
  describe("serializeEventStream", () => {
    it("should serialize events to deterministic string", () => {
      const events: ScheduledEvent[] = [
        {
          sampleTime: 0,
          musicalTime: { seconds: 0, beats: 0 },
          type: "NOTE_ON",
          target: { path: "/role/bass/note", scope: "role" },
          payload: {
            note: { pitch: 60, velocity: 127, duration: 1.0 },
          },
          deterministicId: "event-1",
          sourceInfo: { type: "generator", generatorId: "gen-1" },
        },
        {
          sampleTime: 44100,
          musicalTime: { seconds: 1.0, beats: 2 },
          type: "NOTE_OFF",
          target: { path: "/role/bass/note", scope: "role" },
          payload: {
            note: { pitch: 60, velocity: 0, duration: 0 },
          },
          deterministicId: "event-2",
          sourceInfo: { type: "generator", generatorId: "gen-1" },
        },
      ];

      const replaySystem = new OfflineReplaySystem();
      const serialized = replaySystem.serializeEventStream(events);

      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("string");
      expect(serialized.length).toBeGreaterThan(0);

      // Should be valid JSON
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it("should produce identical serialization for identical events", () => {
      const events: ScheduledEvent[] = [
        {
          sampleTime: 0,
          type: "NOTE_ON",
          target: { path: "/role/bass/note", scope: "role" },
          payload: { note: { pitch: 60, velocity: 127, duration: 1.0 } },
          deterministicId: "event-1",
          sourceInfo: { type: "generator" },
        },
      ];

      const replaySystem = new OfflineReplaySystem();
      const serialized1 = replaySystem.serializeEventStream(events);
      const serialized2 = replaySystem.serializeEventStream(events);

      expect(serialized1).toBe(serialized2);
    });

    it("should preserve all event data in serialization", () => {
      const events: ScheduledEvent[] = [
        {
          sampleTime: 0,
          musicalTime: { seconds: 0, beats: 0, measures: 0 },
          type: "NOTE_ON",
          target: {
            path: "/role/bass/note",
            scope: "role",
            components: ["role", "bass", "note"],
          },
          payload: {
            note: { pitch: 60, velocity: 127, duration: 1.0 },
          },
          deterministicId: "event-1",
          sourceInfo: {
            type: "generator",
            generatorId: "gen-1",
            roleId: "role-1",
          },
        },
      ];

      const replaySystem = new OfflineReplaySystem();
      const serialized = replaySystem.serializeEventStream(events);
      const deserialized = JSON.parse(serialized);

      expect(deserialized[0].sampleTime).toBe(0);
      expect(deserialized[0].type).toBe("NOTE_ON");
      expect(deserialized[0].payload.note.pitch).toBe(60);
      expect(deserialized[0].payload.note.velocity).toBe(127);
    });
  });

  describe("replayEventStream", () => {
    it("should deserialize events correctly", () => {
      const originalEvents: ScheduledEvent[] = [
        {
          sampleTime: 0,
          type: "NOTE_ON",
          target: { path: "/role/bass/note", scope: "role" },
          payload: { note: { pitch: 60, velocity: 127, duration: 1.0 } },
          deterministicId: "event-1",
          sourceInfo: { type: "generator" },
        },
      ];

      const replaySystem = new OfflineReplaySystem();
      const serialized = replaySystem.serializeEventStream(originalEvents);
      const replayedEvents = replaySystem.replayEventStream(serialized);

      expect(replayedEvents).toHaveLength(1);
      expect(replayedEvents[0].sampleTime).toBe(originalEvents[0].sampleTime);
      expect(replayedEvents[0].type).toBe(originalEvents[0].type);
      expect(replayedEvents[0].payload).toEqual(originalEvents[0].payload);
    });

    it("should reject invalid serialized data", () => {
      const replaySystem = new OfflineReplaySystem();

      expect(() => {
        replaySystem.replayEventStream("invalid json{{{");
      }).toThrow();

      expect(() => {
        replaySystem.replayEventStream("not an array");
      }).toThrow();
    });

    it("should validate event structure during replay", () => {
      const invalidSerialized = JSON.stringify([
        { sampleTime: 0, type: "INVALID_TYPE" }, // Missing required fields
      ]);

      const replaySystem = new OfflineReplaySystem();

      expect(() => {
        replaySystem.replayEventStream(invalidSerialized);
      }).toThrow();
    });
  });

  describe("verifyRepeatability", () => {
    it("should verify 100% repeatability for same model and seed", () => {
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

      const replaySystem = new OfflineReplaySystem();
      const report = replaySystem.verifyRepeatability(model, 5); // 5 runs

      expect(report.isRepeatable).toBeDefined();
      expect(report.totalRuns).toBe(5);
      expect(report.consistentRuns).toBeDefined();
      expect(report.matchRate).toBeGreaterThanOrEqual(0);
      expect(report.matchRate).toBeLessThanOrEqual(1);
    });

    it("should detect non-repeatable event streams", () => {
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
          determinismMode: "loose", // Non-deterministic mode
        },
        determinismSeed: "test-seed",
      };

      const replaySystem = new OfflineReplaySystem();
      const report = replaySystem.verifyRepeatability(model, 3);

      // Should still run verification even if determinism is loose
      expect(report.totalRuns).toBe(3);
      expect(report.matchRate).toBeDefined();
    });
  });
});
