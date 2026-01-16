/**
 * PCG-Random Tests
 *
 * Comprehensive tests for deterministic PRNG behavior.
 * Tests validate cross-platform consistency and correctness.
 */

import { describe, it, expect } from "vitest";
import { PCGRandom, createPCG, SEED } from "../src/random/pcg";

describe("PCGRandom", () => {
  describe("construction", () => {
    it("should create generator with valid seed", () => {
      const rng = new PCGRandom(12345);

      expect(rng).toBeInstanceOf(PCGRandom);
    });

    it("should accept seed at bounds", () => {
      expect(() => new PCGRandom(0)).not.toThrow();
      expect(() => new PCGRandom(0xffffffff)).not.toThrow();
    });

    it("should reject negative seed", () => {
      expect(() => new PCGRandom(-1)).toThrow();
    });

    it("should reject seed > 32-bit", () => {
      expect(() => new PCGRandom(0x100000000)).toThrow();
    });

    it("should reject non-integer seed", () => {
      expect(() => new PCGRandom(1.5)).toThrow();
    });

    it("should accept stream parameter", () => {
      const rng1 = new PCGRandom(12345, 0);
      const rng2 = new PCGRandom(12345, 1);

      // Different streams should produce different outputs
      expect(rng1.nextInt()).not.toBe(rng2.nextInt());
    });
  });

  describe("nextInt()", () => {
    it("should generate 32-bit unsigned integers", () => {
      const rng = new PCGRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextInt();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffffff);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it("should be deterministic for same seed", () => {
      const rng1 = new PCGRandom(12345);
      const rng2 = new PCGRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1.nextInt()).toBe(rng2.nextInt());
      }
    });

    it("should produce different sequences for different seeds", () => {
      const rng1 = new PCGRandom(12345);
      const rng2 = new PCGRandom(54321);

      const values1 = Array.from({ length: 10 }, () => rng1.nextInt());
      const values2 = Array.from({ length: 10 }, () => rng2.nextInt());

      expect(values1).not.toEqual(values2);
    });

    it("should produce known test vectors", () => {
      // Test vectors from our PCG implementation
      const rng = new PCGRandom(42);

      // First 5 values with seed=42, stream=0
      const expected = [0x5f5fe751, 0x9cc9ca68, 0x53051ce9, 0x5bd3c734, 0xf0d89e51];

      for (let i = 0; i < expected.length; i++) {
        expect(rng.nextInt()).toBe(expected[i]);
      }
    });

    it("should handle zero seed", () => {
      const rng1 = new PCGRandom(0);
      const rng2 = new PCGRandom(0);

      for (let i = 0; i < 50; i++) {
        expect(rng1.nextInt()).toBe(rng2.nextInt());
      }
    });

    it("should handle max seed", () => {
      const rng = new PCGRandom(0xffffffff);

      // Should produce valid sequence
      for (let i = 0; i < 50; i++) {
        const value = rng.nextInt();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffffff);
      }
    });
  });

  describe("nextFloat()", () => {
    it("should generate floats in [0, 1)", () => {
      const rng = new PCGRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it("should be deterministic for same seed", () => {
      const rng1 = new PCGRandom(12345);
      const rng2 = new PCGRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1.nextFloat()).toBe(rng2.nextFloat());
      }
    });

    it("should have uniform distribution", () => {
      const rng = new PCGRandom(12345);
      const samples = 10000;
      const buckets = 10;
      const counts = new Array(buckets).fill(0);

      for (let i = 0; i < samples; i++) {
        const value = rng.nextFloat();
        const bucket = Math.floor(value * buckets);
        counts[bucket]++;
      }

      // Each bucket should have roughly 10% of samples
      // Chi-squared test would be better, but this is a simple check
      for (let i = 0; i < buckets; i++) {
        const expected = samples / buckets;
        const tolerance = expected * 0.15; // 15% tolerance
        expect(counts[i]).toBeGreaterThanOrEqual(expected - tolerance);
        expect(counts[i]).toBeLessThanOrEqual(expected + tolerance);
      }
    });
  });

  describe("range()", () => {
    it("should generate integers in [min, max]", () => {
      const rng = new PCGRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.range(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(20);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it("should handle min = max", () => {
      const rng = new PCGRandom(12345);

      for (let i = 0; i < 10; i++) {
        expect(rng.range(42, 42)).toBe(42);
      }
    });

    it("should handle negative ranges", () => {
      const rng = new PCGRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.range(-10, 10);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    it("should throw when min > max", () => {
      const rng = new PCGRandom(12345);

      expect(() => rng.range(20, 10)).toThrow();
    });

    it("should be deterministic", () => {
      const rng1 = new PCGRandom(12345);
      const rng2 = new PCGRandom(12345);

      for (let i = 0; i < 50; i++) {
        expect(rng1.range(0, 100)).toBe(rng2.range(0, 100));
      }
    });

    it("should have uniform distribution across range", () => {
      const rng = new PCGRandom(12345);
      const min = 0;
      const max = 9;
      const samples = 10000;
      const counts = new Array(max - min + 1).fill(0);

      for (let i = 0; i < samples; i++) {
        const value = rng.range(min, max);
        counts[value - min]++;
      }

      // Each value should appear roughly equally
      const expected = samples / (max - min + 1);
      for (let i = 0; i < counts.length; i++) {
        const tolerance = expected * 0.15;
        expect(counts[i]).toBeGreaterThanOrEqual(expected - tolerance);
        expect(counts[i]).toBeLessThanOrEqual(expected + tolerance);
      }
    });
  });

  describe("rangeFloat()", () => {
    it("should generate floats in [min, max)", () => {
      const rng = new PCGRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.rangeFloat(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
      }
    });

    it("should throw when min >= max", () => {
      const rng = new PCGRandom(12345);

      expect(() => rng.rangeFloat(20, 10)).toThrow();
      expect(() => rng.rangeFloat(10, 10)).toThrow();
    });

    it("should be deterministic", () => {
      const rng1 = new PCGRandom(12345);
      const rng2 = new PCGRandom(12345);

      for (let i = 0; i < 50; i++) {
        expect(rng1.rangeFloat(0, 100)).toBe(rng2.rangeFloat(0, 100));
      }
    });
  });

  describe("state management", () => {
    it("should get and set state", () => {
      const rng1 = new PCGRandom(12345);

      // Generate some values
      for (let i = 0; i < 10; i++) {
        rng1.nextInt();
      }

      // Save state
      const state = rng1.getState();

      // Create new generator and restore state
      const rng2 = new PCGRandom(0);
      rng2.setState(state);

      // Should continue sequence
      for (let i = 0; i < 10; i++) {
        expect(rng1.nextInt()).toBe(rng2.nextInt());
      }
    });

    it("should throw on invalid state", () => {
      const rng = new PCGRandom(12345);

      expect(() => rng.setState("invalid")).toThrow();
      expect(() => rng.setState("".padStart(17, "0"))).toThrow(); // Too long
    });

    it("should clone generator", () => {
      const rng1 = new PCGRandom(12345);

      // Generate some values
      for (let i = 0; i < 10; i++) {
        rng1.nextInt();
      }

      // Clone
      const rng2 = rng1.clone();

      // Both should produce same sequence
      for (let i = 0; i < 10; i++) {
        expect(rng1.nextInt()).toBe(rng2.nextInt());
      }
    });
  });

  describe("edge cases", () => {
    it("should handle large number of calls", () => {
      const rng = new PCGRandom(12345);

      // Generate 1 million values
      for (let i = 0; i < 1_000_000; i++) {
        rng.nextInt();
      }

      // Should still produce valid values
      const value = rng.nextInt();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    });

    it("should not repeat within reasonable timeframe", () => {
      const rng = new PCGRandom(12345);
      const values = new Set<number>();

      for (let i = 0; i < 10000; i++) {
        values.add(rng.nextInt());
      }

      expect(values.size).toBe(10000);
    });
  });

  describe("createPCG helper", () => {
    it("should create generator with seed", () => {
      const rng = createPCG(12345);

      expect(rng).toBeInstanceOf(PCGRandom);
      expect(rng.nextInt()).toBe(new PCGRandom(12345).nextInt());
    });

    it("should create generator with stream", () => {
      const rng = createPCG(12345, 1);

      expect(rng.nextInt()).toBe(new PCGRandom(12345, 1).nextInt());
    });
  });

  describe("SEED constants", () => {
    it("should provide ZERO constant", () => {
      expect(SEED.ZERO).toBe(0);
    });

    it("should provide MAX constant", () => {
      expect(SEED.MAX).toBe(0xffffffff);
    });

    it("should provide DEFAULT constant", () => {
      expect(SEED.DEFAULT).toBe(42);
    });
  });

  describe("cross-platform determinism", () => {
    it("should produce identical sequence across multiple instances", () => {
      const seed = 987654321;
      const instances = 10;
      const samples = 100;

      const sequences: number[][] = [];

      for (let i = 0; i < instances; i++) {
        const rng = new PCGRandom(seed);
        const sequence: number[] = [];

        for (let j = 0; j < samples; j++) {
          sequence.push(rng.nextInt());
        }

        sequences.push(sequence);
      }

      // All sequences should be identical
      for (let i = 1; i < instances; i++) {
        expect(sequences[i]).toEqual(sequences[0]);
      }
    });

    it("should handle state serialization round-trip", () => {
      const seed = 11111111;
      const rng1 = new PCGRandom(seed);
      const rng2 = new PCGRandom(seed);

      // Advance rng1
      const advanceCount = 100;
      for (let i = 0; i < advanceCount; i++) {
        rng1.nextInt();
      }

      // Save and restore state
      const state = rng1.getState();
      rng2.setState(state);

      // Both should produce same sequence
      for (let i = 0; i < 50; i++) {
        expect(rng1.nextInt()).toBe(rng2.nextInt());
      }
    });
  });

  describe("real-world scenarios", () => {
    it("should generate deterministic rhythm patterns", () => {
      const seed = 42;
      const rng1 = new PCGRandom(seed);
      const rng2 = new PCGRandom(seed);

      // Generate rhythm pattern (onsets in a measure)
      const pattern1: boolean[] = [];
      const pattern2: boolean[] = [];

      for (let i = 0; i < 16; i++) {
        pattern1.push(rng1.nextFloat() > 0.5);
        pattern2.push(rng2.nextFloat() > 0.5);
      }

      expect(pattern1).toEqual(pattern2);
    });

    it("should generate deterministic pitch sequences", () => {
      const seed = 123;
      const rng1 = new PCGRandom(seed);
      const rng2 = new PCGRandom(seed);

      // Generate pitch sequence (MIDI note numbers 60-72)
      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 20; i++) {
        sequence1.push(rng1.range(60, 72));
        sequence2.push(rng2.range(60, 72));
      }

      expect(sequence1).toEqual(sequence2);
    });

    it("should generate deterministic velocity values", () => {
      const seed = 456;
      const rng1 = new PCGRandom(seed);
      const rng2 = new PCGRandom(seed);

      // Generate velocities (0-127)
      const velocities1: number[] = [];
      const velocities2: number[] = [];

      for (let i = 0; i < 30; i++) {
        velocities1.push(rng1.range(0, 127));
        velocities2.push(rng2.range(0, 127));
      }

      expect(velocities1).toEqual(velocities2);
    });
  });
});
