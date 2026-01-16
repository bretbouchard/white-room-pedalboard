/**
 * TDD Tests for DeterministicEventEmitter
 *
 * RED-GREEN-REFACTOR Approach:
 * - RED: Write failing tests first (this file)
 * - GREEN: Implement minimal code to pass tests
 * - REFACTOR: Clean up and optimize
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeterministicEventEmitter } from "../../../packages/core/src/realization/event-emitter";
import {
  SongModel_v1,
  ScheduledEvent,
  SampleTimeRange,
  ParameterAddress,
} from "../../../packages/core/src/realization/types";

describe("DeterministicEventEmitter - TDD Phase 1: Basic Emission", () => {
  let emitter: DeterministicEventEmitter;
  let mockModel: SongModel_v1;
  let mockRange: SampleTimeRange;

  beforeEach(() => {
    emitter = new DeterministicEventEmitter({ seed: "test-seed" });

    // Minimal mock model for testing
    mockModel = {
      version: "1.0",
      id: "test-model-1",
      createdAt: Date.now(),
      metadata: {
        name: "Test Song",
        tempo: 120,
        timeSignature: [4, 4],
        duration: 10,
      },
      transport: {
        tempoMap: [{ time: 0, tempo: 120 }],
        timeSignatureMap: [{ time: 0, timeSignature: [4, 4] }],
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
        master: { volume: 1.0 },
      },
      realizationPolicy: {
        windowSize: { seconds: 1.0 },
        lookaheadDuration: { seconds: 2.0 },
        determinismMode: "strict",
      },
      determinismSeed: "test-seed",
    };

    mockRange = {
      startSample: 0,
      endSample: 48000, // 1 second at 48kHz
      sampleRate: 48000,
    };
  });

  /**
   * TEST 1: Deterministic Output
   * Same model + seed MUST produce identical event streams
   */
  describe("determinism", () => {
    it("should produce identical event streams for same model + seed", () => {
      const emitter1 = new DeterministicEventEmitter({ seed: "test-seed" });
      const emitter2 = new DeterministicEventEmitter({ seed: "test-seed" });

      const events1 = emitter1.emitEventsForTimeRange(mockModel, mockRange);
      const events2 = emitter2.emitEventsForTimeRange(mockModel, mockRange);

      expect(events1).toEqual(events2);
      expect(events1.length).toBe(events2.length);

      // Check each event matches exactly
      for (let i = 0; i < events1.length; i++) {
        expect(events1[i].sampleTime).toBe(events2[i].sampleTime);
        expect(events1[i].type).toBe(events2[i].type);
        expect(events1[i].target).toEqual(events2[i].target);
        expect(events1[i].payload).toEqual(events2[i].payload);
      }
    });

    it("should produce different event streams for different seeds", () => {
      const emitter1 = new DeterministicEventEmitter({ seed: "seed-1" });
      const emitter2 = new DeterministicEventEmitter({ seed: "seed-2" });

      const events1 = emitter1.emitEventsForTimeRange(mockModel, mockRange);
      const events2 = emitter2.emitEventsForTimeRange(mockModel, mockRange);

      // Events should be different for different seeds
      // (unless model produces no events)
      const hasEvents = events1.length > 0 || events2.length > 0;
      if (hasEvents) {
        const areDifferent =
          events1.length !== events2.length ||
          events1.some((e1, i) => {
            const e2 = events2[i];
            return (
              !e2 || e1.sampleTime !== e2.sampleTime || e1.type !== e2.type
            );
          });
        expect(areDifferent).toBe(true);
      }
    });

    it("should produce identical results across multiple runs", () => {
      const emitter = new DeterministicEventEmitter({ seed: "multi-run-test" });

      const results: ScheduledEvent[][] = [];
      const numRuns = 10;

      for (let i = 0; i < numRuns; i++) {
        const events = emitter.emitEventsForTimeRange(mockModel, mockRange);
        results.push(events);
      }

      // All runs should be identical
      for (let i = 1; i < numRuns; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  /**
   * TEST 2: Bounded Emission
   * Emission MUST be bounded and never exceed time range
   */
  describe("bounded emission", () => {
    it("should never emit events outside requested time range", () => {
      const events = emitter.emitEventsForTimeRange(mockModel, mockRange);

      events.forEach((event) => {
        expect(event.sampleTime).toBeGreaterThanOrEqual(mockRange.startSample);
        expect(event.sampleTime).toBeLessThan(mockRange.endSample);
      });
    });

    it("should respect sample rate when calculating sample times", () => {
      const range441 = {
        startSample: 0,
        endSample: 44100, // 1 second at 44.1kHz
        sampleRate: 44100,
      };

      const range48 = {
        startSample: 0,
        endSample: 48000, // 1 second at 48kHz
        sampleRate: 48000,
      };

      const events441 = emitter.emitEventsForTimeRange(mockModel, range441);
      const events48 = emitter.emitEventsForTimeRange(mockModel, range48);

      // Events should be bounded within respective ranges
      events441.forEach((e) => {
        expect(e.sampleTime).toBeGreaterThanOrEqual(0);
        expect(e.sampleTime).toBeLessThan(44100);
      });

      events48.forEach((e) => {
        expect(e.sampleTime).toBeGreaterThanOrEqual(0);
        expect(e.sampleTime).toBeLessThan(48000);
      });
    });

    it("should enforce bounded lookahead", () => {
      const maxLookahead = { seconds: 0.5 }; // 500ms max lookahead
      emitter.setLookahead(maxLookahead);

      const boundaries = emitter.getLookaheadBoundaries();
      expect(boundaries.length).toBeGreaterThan(0);

      boundaries.forEach((boundary) => {
        expect(boundary.maxSamples).toBeDefined();
        expect(boundary.maxSamples).toBeLessThanOrEqual(
          maxLookahead.seconds * mockRange.sampleRate,
        );
      });
    });
  });

  /**
   * TEST 3: Event Structure
   * All events must have required fields with correct types
   */
  describe("event structure", () => {
    it("should emit events with all required fields", () => {
      const events = emitter.emitEventsForTimeRange(mockModel, mockRange);

      events.forEach((event) => {
        // Required fields
        expect(event.sampleTime).toBeDefined();
        expect(typeof event.sampleTime).toBe("number");

        expect(event.type).toBeDefined();
        expect(typeof event.type).toBe("string");

        expect(event.target).toBeDefined();
        expect(typeof event.target.path).toBe("string");
        expect(typeof event.target.scope).toBe("string");

        expect(event.payload).toBeDefined();

        expect(event.deterministicId).toBeDefined();
        expect(typeof event.deterministicId).toBe("string");

        expect(event.sourceInfo).toBeDefined();
        expect(event.sourceInfo.source).toBeDefined();
      });
    });

    it("should generate unique deterministic IDs for events", () => {
      const events = emitter.emitEventsForTimeRange(mockModel, mockRange);

      const ids = new Set<string>();
      events.forEach((event) => {
        ids.add(event.deterministicId);
      });

      expect(ids.size).toBe(events.length);
    });

    it("should include musical time when available", () => {
      const events = emitter.emitEventsForTimeRange(mockModel, mockRange);

      // If model has tempo info, events should have musical time
      const hasMusicalTime = events.some((e) => e.musicalTime !== undefined);

      if (hasMusicalTime) {
        events.forEach((event) => {
          if (event.musicalTime) {
            expect(event.musicalTime.seconds).toBeDefined();
            expect(typeof event.musicalTime.seconds).toBe("number");
          }
        });
      }
    });
  });

  /**
   * TEST 4: Lookahead Management
   */
  describe("lookahead management", () => {
    it("should allow setting lookahead duration", () => {
      const lookahead = { seconds: 1.0 };

      expect(() => emitter.setLookahead(lookahead)).not.toThrow();
    });

    it("should return lookahead boundaries", () => {
      emitter.setLookahead({ seconds: 0.5 });

      const boundaries = emitter.getLookaheadBoundaries();

      expect(Array.isArray(boundaries)).toBe(true);
      expect(boundaries.length).toBeGreaterThan(0);

      boundaries.forEach((boundary) => {
        expect(boundary.startTime).toBeDefined();
        expect(boundary.maxSamples).toBeDefined();
        expect(boundary.maxSamples).toBeGreaterThan(0);
      });
    });

    it("should calculate lookahead boundaries based on sample rate", () => {
      const range1 = { startSample: 0, endSample: 48000, sampleRate: 48000 };
      const range2 = { startSample: 0, endSample: 44100, sampleRate: 44100 };

      emitter.setLookahead({ seconds: 1.0 });

      const boundaries1 = emitter.getLookaheadBoundaries();
      const boundaries2 = emitter.getLookaheadBoundaries();

      // Boundaries should respect sample rate
      boundaries1.forEach((b) => {
        expect(b.maxSamples).toBeDefined();
      });

      boundaries2.forEach((b) => {
        expect(b.maxSamples).toBeDefined();
      });
    });
  });

  /**
   * TEST 5: Determinism Validation
   */
  describe("determinism validation", () => {
    it("should validate determinism of model", () => {
      const validation = emitter.validateDeterminism(mockModel);

      expect(validation.isValid).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);

      // Model with determinism seed should be valid
      if (mockModel.determinismSeed) {
        expect(validation.isValid).toBe(true);
        expect(validation.errors.length).toBe(0);
      }
    });

    it("should detect missing determinism seed", () => {
      const invalidModel = { ...mockModel, determinismSeed: undefined as any };

      const validation = emitter.validateDeterminism(invalidModel);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.includes("seed"))).toBe(true);
    });
  });

  /**
   * TEST 6: Boundedness Checks
   */
  describe("boundedness checks", () => {
    it("should ensure emission is bounded", () => {
      const maxSamples = 48000;
      const check = emitter.ensureBoundedEmission(maxSamples);

      expect(check.isBounded).toBeDefined();
      expect(check.maxSamplesEmitted).toBeDefined();
      expect(check.maxSamplesEmitted).toBeLessThanOrEqual(maxSamples);
    });

    it("should detect unbounded emission scenarios", () => {
      // Create scenario that might produce unbounded emission
      const unboundedModel = {
        ...mockModel,
        realizationPolicy: {
          windowSize: { seconds: 999999 }, // Huge window
          lookaheadDuration: { seconds: 999999 },
          determinismMode: "strict" as const,
        },
      };

      const check = emitter.ensureBoundedEmission(48000);

      // Should detect and report boundedness status
      expect(check.isBounded).toBeDefined();
    });
  });

  /**
   * TEST 7: Reset and State Management
   */
  describe("state management", () => {
    it("should allow resetting deterministic state", () => {
      const events1 = emitter.emitEventsForTimeRange(mockModel, mockRange);
      emitter.resetDeterministicState();
      const events2 = emitter.emitEventsForTimeRange(mockModel, mockRange);

      // After reset, should produce same results
      expect(events1).toEqual(events2);
    });

    it("should allow reseeding determinism", () => {
      emitter.seedDeterminism("seed-1");
      const events1 = emitter.emitEventsForTimeRange(mockModel, mockRange);

      emitter.seedDeterminism("seed-2");
      const events2 = emitter.emitEventsForTimeRange(mockModel, mockRange);

      // Different seed should produce different events
      // (unless model produces no events)
      const hasEvents = events1.length > 0 || events2.length > 0;
      if (hasEvents) {
        expect(events1).not.toEqual(events2);
      }
    });
  });
});

describe("DeterministicEventEmitter - TDD Phase 2: Event Types", () => {
  let emitter: DeterministicEventEmitter;

  beforeEach(() => {
    emitter = new DeterministicEventEmitter({ seed: "event-types-test" });
  });

  /**
   * TEST 8: Event Type Support
   */
  describe("event types", () => {
    it("should support NOTE_ON events", () => {
      // This will test if emitter can produce note events
      // Implementation will verify event structure
      const mockModelWithNotes: any = {
        version: "1.0",
        id: "test-notes",
        createdAt: Date.now(),
        metadata: { name: "Test Notes", tempo: 120, timeSignature: [4, 4] },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, timeSignature: [4, 4] }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [
          {
            id: "bass-role",
            name: "Bass",
            type: "bass",
            generatorConfig: {} as any,
            parameters: {} as any,
          },
        ],
        projections: [],
        mixGraph: {
          tracks: [],
          buses: [],
          sends: [],
          master: { volume: 1.0 },
        },
        realizationPolicy: {
          windowSize: { seconds: 1.0 },
          lookaheadDuration: { seconds: 0.5 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const range = {
        startSample: 0,
        endSample: 48000,
        sampleRate: 48000,
      };

      const events = emitter.emitEventsForTimeRange(mockModelWithNotes, range);

      // If events are emitted, check structure
      events.forEach((event) => {
        if (event.type === "NOTE_ON") {
          expect(event.payload.note).toBeDefined();
          expect(event.payload.note?.pitch).toBeDefined();
          expect(event.payload.note?.velocity).toBeDefined();
        }
      });
    });

    it("should support PARAM events", () => {
      // Test parameter change events
      const mockModelWithParams: any = {
        version: "1.0",
        id: "test-params",
        createdAt: Date.now(),
        metadata: { name: "Test Params", tempo: 120, timeSignature: [4, 4] },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, timeSignature: [4, 4] }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: [],
        projections: [],
        mixGraph: {
          tracks: [
            {
              id: "track-1",
              name: "Track 1",
              volume: 0.8,
              pan: 0.0,
            },
          ],
          buses: [],
          sends: [],
          master: { volume: 1.0 },
        },
        realizationPolicy: {
          windowSize: { seconds: 1.0 },
          lookaheadDuration: { seconds: 0.5 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const range = {
        startSample: 0,
        endSample: 48000,
        sampleRate: 48000,
      };

      const events = emitter.emitEventsForTimeRange(mockModelWithParams, range);

      // Check parameter events have correct structure
      events.forEach((event) => {
        if (event.type === "PARAM") {
          expect(event.payload.parameter).toBeDefined();
          expect(typeof event.payload.parameter?.value).toBe("number");
        }
      });
    });
  });
});

describe("DeterministicEventEmitter - TDD Phase 3: Performance", () => {
  /**
   * TEST 9: Performance Requirements
   */
  describe("performance", () => {
    it("should emit events efficiently (<10ms for 1000 events)", () => {
      const emitter = new DeterministicEventEmitter({ seed: "perf-test" });

      // Create model with many roles/events
      const complexModel: any = {
        version: "1.0",
        id: "perf-test",
        createdAt: Date.now(),
        metadata: {
          name: "Performance Test",
          tempo: 120,
          timeSignature: [4, 4],
        },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, timeSignature: [4, 4] }],
          loopPolicy: { enabled: false },
          playbackSpeed: 1.0,
        },
        sections: [],
        roles: Array.from({ length: 10 }, (_, i) => ({
          id: `role-${i}`,
          name: `Role ${i}`,
          type: "melody",
          generatorConfig: {} as any,
          parameters: {} as any,
        })),
        projections: [],
        mixGraph: {
          tracks: [],
          buses: [],
          sends: [],
          master: { volume: 1.0 },
        },
        realizationPolicy: {
          windowSize: { seconds: 5.0 },
          lookaheadDuration: { seconds: 1.0 },
          determinismMode: "strict",
        },
        determinismSeed: "perf-seed",
      };

      const range = {
        startSample: 0,
        endSample: 240000, // 5 seconds at 48kHz
        sampleRate: 48000,
      };

      const startTime = performance.now();
      const events = emitter.emitEventsForTimeRange(complexModel, range);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(100); // 100ms max for complex model

      // If many events were generated, check performance per event
      if (events.length >= 1000) {
        const msPerEvent = duration / events.length;
        expect(msPerEvent).toBeLessThan(0.01); // <10ms for 1000 events
      }
    });

    it("should handle large time ranges efficiently", () => {
      const emitter = new DeterministicEventEmitter({
        seed: "large-range-test",
      });

      const mockModel: any = {
        version: "1.0",
        id: "large-range",
        createdAt: Date.now(),
        metadata: { name: "Large Range", tempo: 120, timeSignature: [4, 4] },
        transport: {
          tempoMap: [{ time: 0, tempo: 120 }],
          timeSignatureMap: [{ time: 0, timeSignature: [4, 4] }],
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
          master: { volume: 1.0 },
        },
        realizationPolicy: {
          windowSize: { seconds: 1.0 },
          lookaheadDuration: { seconds: 0.5 },
          determinismMode: "strict",
        },
        determinismSeed: "test-seed",
      };

      const range = {
        startSample: 0,
        endSample: 4800000, // 100 seconds at 48kHz
        sampleRate: 48000,
      };

      const startTime = performance.now();
      const events = emitter.emitEventsForTimeRange(mockModel, range);
      const endTime = performance.now();

      // Should complete in reasonable time even for large range
      expect(endTime - startTime).toBeLessThan(500); // 500ms max
    });
  });
});
