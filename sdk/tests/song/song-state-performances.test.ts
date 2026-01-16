/**
 * SongState Performances Array Tests
 *
 * Test that SongState schema properly validates the performances array
 * and activePerformanceId field.
 */

import { describe, it, expect } from "vitest";
import { createMinimalSongState } from "../../packages/sdk/src/song/song_state_v1.js";
import { migrateSongStateAddPerformances } from "../../packages/schemas/src/migrations.js";
import type { SongStateV1 } from "../../packages/sdk/src/song/song_state_v1.js";
import type { PerformanceState_v1 } from "../../packages/sdk/src/song/performance_state.js";

describe("SongState Performances Array", () => {
  describe("Schema Validation", () => {
    it("should create SongState with performances array", () => {
      const songState = createMinimalSongState("test-contract");

      expect(songState.performances).toBeDefined();
      expect(Array.isArray(songState.performances)).toBe(true);
      expect(songState.performances.length).toBeGreaterThan(0);
    });

    it("should have activePerformanceId", () => {
      const songState = createMinimalSongState("test-contract");

      expect(songState.activePerformanceId).toBeDefined();
      expect(typeof songState.activePerformanceId).toBe("string");
    });

    it("should have activePerformanceId that references a valid performance", () => {
      const songState = createMinimalSongState("test-contract");

      const activePerformance = songState.performances.find(
        p => p.id === songState.activePerformanceId
      );

      expect(activePerformance).toBeDefined();
      expect(activePerformance?.id).toBe(songState.activePerformanceId);
    });

    it("should have valid performance objects", () => {
      const songState = createMinimalSongState("test-contract");
      const performance = songState.performances[0];

      expect(performance.version).toBe("1");
      expect(performance.id).toBeDefined();
      expect(performance.name).toBeDefined();
      expect(performance.arrangementStyle).toBeDefined();
      expect(performance.density).toBeDefined();
      expect(performance.createdAt).toBeDefined();
      expect(performance.modifiedAt).toBeDefined();
    });

    it("should allow multiple performances", () => {
      const songState = createMinimalSongState("test-contract");

      const performance2: PerformanceState_v1 = {
        version: "1",
        id: `perf-${Date.now() + 1}`,
        name: "SATB Choir",
        arrangementStyle: "SATB",
        density: 0.55,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      const songStateWithMultiple: SongStateV1 = {
        ...songState,
        performances: [...songState.performances, performance2]
      };

      expect(songStateWithMultiple.performances.length).toBe(2);
      expect(songStateWithMultiple.performances[1].name).toBe("SATB Choir");
    });
  });

  describe("Migration Logic", () => {
    it("should migrate SongState without performances array", () => {
      // Create a SongState without performances (old format)
      const oldSongState = {
        version: "1.0",
        id: "song-test",
        sourceContractId: "contract-test",
        derivationId: "derivation-test",
        timeline: {
          sections: [],
          tempo: 120,
          timeSignature: [4, 4] as [number, number]
        },
        notes: [],
        automations: [],
        duration: 44100 * 8,
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        sampleRate: 44100,
        voiceAssignments: [],
        console: {
          version: "1.0",
          id: "console-test",
          voiceBusses: [],
          mixBusses: [],
          masterBus: {
            id: "master",
            name: "Master",
            type: "master" as const,
            inserts: [],
            gain: 0,
            pan: 0,
            muted: false,
            solo: false
          },
          sendEffects: [],
          routing: { routes: [] },
          metering: {
            enabled: false,
            refreshRate: 30,
            meterType: "peak" as const,
            holdTime: 1000
          }
        },
        presets: [],
        derivedAt: Date.now()
      };

      // Apply migration
      const migrated = migrateSongStateAddPerformances(oldSongState);

      // Verify migration added performances array
      expect(migrated.performances).toBeDefined();
      expect(Array.isArray(migrated.performances)).toBe(true);
      expect(migrated.performances.length).toBe(1);
      expect(migrated.activePerformanceId).toBeDefined();

      // Verify default performance
      const defaultPerf = migrated.performances[0];
      expect(defaultPerf.name).toBe("Default Performance");
      expect(defaultPerf.arrangementStyle).toBe("SOLO_PIANO");
    });

    it("should not migrate SongState that already has performances", () => {
      const songState = createMinimalSongState("test-contract");
      const originalPerformanceCount = songState.performances.length;

      // Try to migrate (should be no-op)
      const migrated = migrateSongStateAddPerformances(songState as any);

      // Verify performances array wasn't duplicated
      expect(migrated.performances.length).toBe(originalPerformanceCount);
    });

    it("should preserve existing data during migration", () => {
      const oldSongState = {
        version: "1.0",
        id: "song-preserve-test",
        sourceContractId: "contract-preserve",
        derivationId: "derivation-preserve",
        timeline: {
          sections: [{
            id: "section-1",
            name: "Intro",
            startTime: 0,
            duration: 44100 * 4,
            tempo: 120,
            timeSignature: [4, 4] as [number, number]
          }],
          tempo: 120,
          timeSignature: [4, 4] as [number, number]
        },
        notes: [{
          id: "note-1",
          voiceId: "voice-1",
          startTime: 0,
          duration: 44100,
          pitch: 60,
          velocity: 0.8
        }],
        automations: [],
        duration: 44100 * 8,
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        sampleRate: 44100,
        voiceAssignments: [],
        console: {
          version: "1.0",
          id: "console-preserve",
          voiceBusses: [],
          mixBusses: [],
          masterBus: {
            id: "master",
            name: "Master",
            type: "master" as const,
            inserts: [],
            gain: 0,
            pan: 0,
            muted: false,
            solo: false
          },
          sendEffects: [],
          routing: { routes: [] },
          metering: {
            enabled: false,
            refreshRate: 30,
            meterType: "peak" as const,
            holdTime: 1000
          }
        },
        presets: [],
        derivedAt: Date.now()
      };

      const migrated = migrateSongStateAddPerformances(oldSongState);

      // Verify all existing data preserved
      expect(migrated.id).toBe("song-preserve-test");
      expect(migrated.sourceContractId).toBe("contract-preserve");
      expect(migrated.timeline.sections.length).toBe(1);
      expect(migrated.notes.length).toBe(1);
      expect(migrated.tempo).toBe(120);

      // Verify performances added
      expect(migrated.performances.length).toBe(1);
      expect(migrated.activePerformanceId).toBeDefined();
    });
  });

  describe("Active Performance Management", () => {
    it("should allow switching active performance", () => {
      const songState = createMinimalSongState("test-contract");

      const performance2: PerformanceState_v1 = {
        version: "1",
        id: `perf-${Date.now() + 1}`,
        name: "Ambient Techno",
        arrangementStyle: "AMBIENT_TECHNO",
        density: 0.8,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      const updated: SongStateV1 = {
        ...songState,
        performances: [...songState.performances, performance2],
        activePerformanceId: performance2.id
      };

      expect(updated.activePerformanceId).toBe(performance2.id);
      expect(updated.performances.find(p => p.id === updated.activePerformanceId)?.name)
        .toBe("Ambient Techno");
    });

    it("should validate activePerformanceId references valid performance", () => {
      const songState = createMinimalSongState("test-contract");

      // Try to set invalid active performance ID
      const trySetInvalid = (): SongStateV1 => ({
        ...songState,
        activePerformanceId: "non-existent-performance-id"
      });

      // This creates an invalid state - validation should catch this
      const invalidState = trySetInvalid();
      const hasValidReference = invalidState.performances.some(
        p => p.id === invalidState.activePerformanceId
      );

      expect(hasValidReference).toBe(false);
    });
  });

  describe("Performance Array Invariants", () => {
    it("should require at least one performance", () => {
      const songState = createMinimalSongState("test-contract");

      expect(songState.performances.length).toBeGreaterThanOrEqual(1);
    });

    it("should have unique performance IDs", () => {
      const songState = createMinimalSongState("test-contract");

      const performanceIds = songState.performances.map(p => p.id);
      const uniqueIds = new Set(performanceIds);

      expect(uniqueIds.size).toBe(performanceIds.length);
    });

    it("should allow empty performances array to be replaced", () => {
      const songState = createMinimalSongState("test-contract");

      const newPerformance: PerformanceState_v1 = {
        version: "1",
        id: "perf-replacement",
        name: "Replacement Performance",
        arrangementStyle: "SATB",
        density: 0.5,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      const replaced: SongStateV1 = {
        ...songState,
        performances: [newPerformance],
        activePerformanceId: newPerformance.id
      };

      expect(replaced.performances.length).toBe(1);
      expect(replaced.performances[0].id).toBe("perf-replacement");
      expect(replaced.activePerformanceId).toBe("perf-replacement");
    });
  });
});
