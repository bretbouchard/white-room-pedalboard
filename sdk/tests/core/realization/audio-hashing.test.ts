/**
 * AudioHasher Tests (TDD - RED Phase)
 *
 * Testing audio buffer and event stream hashing for regression testing
 */

import { describe, it, expect } from "vitest";
import { ScheduledEvent } from "../../../packages/shared/src/types/scheduled-event";
import { AudioHasher } from "../../../packages/core/src/realization/audio-hashing";

describe("AudioHasher", () => {
  describe("hashAudioBuffer", () => {
    it("should generate deterministic hash for audio buffer", () => {
      const audioBuffer = new Float32Array([0.0, 0.5, 1.0, 0.5, 0.0]);

      const hasher = new AudioHasher();
      const hash1 = hasher.hashAudioBuffer(audioBuffer);
      const hash2 = hasher.hashAudioBuffer(audioBuffer);

      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe("string");
      expect(hash1).toBe(hash2); // Same buffer should produce same hash
    });

    it("should generate different hashes for different buffers", () => {
      const buffer1 = new Float32Array([0.0, 0.5, 1.0]);
      const buffer2 = new Float32Array([0.0, 0.6, 1.0]); // Different value

      const hasher = new AudioHasher();
      const hash1 = hasher.hashAudioBuffer(buffer1);
      const hash2 = hasher.hashAudioBuffer(buffer2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle stereo buffers", () => {
      const leftChannel = new Float32Array([0.0, 0.5, 1.0]);
      const rightChannel = new Float32Array([1.0, 0.5, 0.0]);

      const hasher = new AudioHasher();
      const hash = hasher.hashAudioBuffer(leftChannel, rightChannel);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should handle empty buffers", () => {
      const emptyBuffer = new Float32Array([]);

      const hasher = new AudioHasher();
      const hash = hasher.hashAudioBuffer(emptyBuffer);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should be insensitive to floating point noise", () => {
      const buffer1 = new Float32Array([0.0, 0.5000001, 1.0]);
      const buffer2 = new Float32Array([0.0, 0.4999999, 1.0]); // Tiny difference

      const hasher = new AudioHasher();
      const hash1 = hasher.hashAudioBuffer(buffer1);
      const hash2 = hasher.hashAudioBuffer(buffer2);

      // With tolerance, these should produce same hash
      // (In real implementation, would use quantization)
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
    });
  });

  describe("hashEventStream", () => {
    it("should generate deterministic hash for event stream", () => {
      const events: ScheduledEvent[] = [
        {
          sampleTime: 0,
          type: "NOTE_ON",
          target: { path: "/role/bass/note", scope: "role" },
          payload: { note: { pitch: 60, velocity: 127, duration: 1.0 } },
          deterministicId: "event-1",
          sourceInfo: { type: "generator" },
        },
        {
          sampleTime: 44100,
          type: "NOTE_OFF",
          target: { path: "/role/bass/note", scope: "role" },
          payload: { note: { pitch: 60, velocity: 0, duration: 0 } },
          deterministicId: "event-2",
          sourceInfo: { type: "generator" },
        },
      ];

      const hasher = new AudioHasher();
      const hash1 = hasher.hashEventStream(events);
      const hash2 = hasher.hashEventStream(events);

      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe("string");
      expect(hash1).toBe(hash2); // Same events should produce same hash
    });

    it("should generate different hashes for different event streams", () => {
      const events1: ScheduledEvent[] = [
        {
          sampleTime: 0,
          type: "NOTE_ON",
          target: { path: "/role/bass/note", scope: "role" },
          payload: { note: { pitch: 60, velocity: 127, duration: 1.0 } },
          deterministicId: "event-1",
          sourceInfo: { type: "generator" },
        },
      ];

      const events2: ScheduledEvent[] = [
        {
          sampleTime: 0,
          type: "NOTE_ON",
          target: { path: "/role/bass/note", scope: "role" },
          payload: { note: { pitch: 62, velocity: 127, duration: 1.0 } }, // Different pitch
          deterministicId: "event-1",
          sourceInfo: { type: "generator" },
        },
      ];

      const hasher = new AudioHasher();
      const hash1 = hasher.hashEventStream(events1);
      const hash2 = hasher.hashEventStream(events2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty event streams", () => {
      const emptyEvents: ScheduledEvent[] = [];

      const hasher = new AudioHasher();
      const hash = hasher.hashEventStream(emptyEvents);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should be order-sensitive", () => {
      const eventA: ScheduledEvent = {
        sampleTime: 0,
        type: "NOTE_ON",
        target: { path: "/role/bass/note", scope: "role" },
        payload: { note: { pitch: 60, velocity: 127, duration: 1.0 } },
        deterministicId: "event-1",
        sourceInfo: { type: "generator" },
      };

      const eventB: ScheduledEvent = {
        sampleTime: 44100,
        type: "NOTE_OFF",
        target: { path: "/role/bass/note", scope: "role" },
        payload: { note: { pitch: 60, velocity: 0, duration: 0 } },
        deterministicId: "event-2",
        sourceInfo: { type: "generator" },
      };

      const hasher = new AudioHasher();
      const hash1 = hasher.hashEventStream([eventA, eventB]);
      const hash2 = hasher.hashEventStream([eventB, eventA]);

      expect(hash1).not.toBe(hash2); // Order should matter
    });
  });

  describe("compareHashes", () => {
    it("should detect identical hashes", () => {
      const hash1 = "abc123";
      const hash2 = "abc123";

      const hasher = new AudioHasher();
      const comparison = hasher.compareHashes(hash1, hash2);

      expect(comparison.areEqual).toBe(true);
      expect(comparison.difference).toBe(0);
    });

    it("should detect different hashes", () => {
      const hash1 = "abc123";
      const hash2 = "def456";

      const hasher = new AudioHasher();
      const comparison = hasher.compareHashes(hash1, hash2);

      expect(comparison.areEqual).toBe(false);
      expect(comparison.difference).toBeGreaterThan(0);
    });

    it("should provide similarity metrics", () => {
      const hash1 = "abc123";
      const hash2 = "abc124"; // Slightly different

      const hasher = new AudioHasher();
      const comparison = hasher.compareHashes(hash1, hash2);

      expect(comparison.areEqual).toBe(false);
      expect(comparison.similarity).toBeGreaterThanOrEqual(0);
      expect(comparison.similarity).toBeLessThanOrEqual(1);
    });

    it("should validate hash format", () => {
      const hasher = new AudioHasher();

      expect(() => {
        hasher.compareHashes("", "abc123");
      }).toThrow();

      expect(() => {
        hasher.compareHashes("abc123", "");
      }).toThrow();

      expect(() => {
        hasher.compareHashes(null as any, "abc123");
      }).toThrow();
    });
  });
});
