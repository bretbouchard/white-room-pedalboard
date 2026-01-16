/**
 * CI Tests: StructuralTension Aggregation
 *
 * These tests enforce Schillinger correctness by verifying that:
 * 1. Tension aggregates across domains with proper weighting
 * 2. Tension is clamped to valid range
 * 3. All tension domains contribute meaningfully to total
 *
 * If any of these tests fail, the system is not Schillinger-compliant.
 */

import { describe, it, expect } from "vitest";
import {
  StructuralTension,
  zeroTension,
  totalTension,
  clampTension,
  copyTension,
  tensionEquals,
  interpolateTension,
} from "../../src/structure";

describe("StructuralTension", () => {
  describe("aggregation", () => {
    it("aggregates rhythmic, harmonic, and formal tension with correct weights", () => {
      const t: StructuralTension = {
        rhythmic: 0.5,
        harmonic: 0.5,
        formal: 0.5,
      };

      const total = totalTension(t);

      // Should be close to 0.5 (all domains equal)
      expect(total).toBeGreaterThan(0.45);
      expect(total).toBeLessThan(0.55);
    });

    it("weights rhythm and harmony equally (40% each)", () => {
      const onlyRhythm: StructuralTension = {
        rhythmic: 1.0,
        harmonic: 0,
        formal: 0,
      };

      const onlyHarmony: StructuralTension = {
        rhythmic: 0,
        harmonic: 1.0,
        formal: 0,
      };

      const rhythmTotal = totalTension(onlyRhythm);
      const harmonyTotal = totalTension(onlyHarmony);

      // Both should contribute 40%
      expect(rhythmTotal).toBe(0.4);
      expect(harmonyTotal).toBe(0.4);
    });

    it("weights form as 20%", () => {
      const onlyForm: StructuralTension = {
        rhythmic: 0,
        harmonic: 0,
        formal: 1.0,
      };

      const total = totalTension(onlyForm);

      expect(total).toBe(0.2);
    });

    it("calculates total tension correctly for mixed values", () => {
      const t: StructuralTension = {
        rhythmic: 0.8, // 0.32
        harmonic: 0.6, // 0.24
        formal: 0.4, // 0.08
      };

      const total = totalTension(t);

      // Expected: 0.32 + 0.24 + 0.08 = 0.64
      expect(total).toBeCloseTo(0.64, 2);
    });
  });

  describe("clamping", () => {
    it("clamps values above 1.0 to 1.0", () => {
      const t: StructuralTension = {
        rhythmic: 2.0,
        harmonic: 1.5,
        formal: 3.0,
      };

      const total = totalTension(t);

      expect(total).toBe(1.0);
    });

    it("clamps values below 0 to 0", () => {
      const t: StructuralTension = {
        rhythmic: -0.5,
        harmonic: -1.0,
        formal: 0.5,
      };

      const total = totalTension(t);

      // Only formal contributes (0.2 * 0.5 = 0.1)
      // Rhythm and harmony are clamped to 0
      expect(total).toBeCloseTo(0.1, 2);
    });

    it("provides clampTension utility function", () => {
      expect(clampTension(0.5)).toBe(0.5);
      expect(clampTension(1.5)).toBe(1.0);
      expect(clampTension(-0.2)).toBe(0.0);
      expect(clampTension(0.0)).toBe(0.0);
      expect(clampTension(1.0)).toBe(1.0);
    });
  });

  describe("zero tension", () => {
    it("creates zero tension state", () => {
      const zero = zeroTension();

      expect(zero.rhythmic).toBe(0);
      expect(zero.harmonic).toBe(0);
      expect(zero.formal).toBe(0);
    });

    it("zero tension has zero total", () => {
      const zero = zeroTension();
      const total = totalTension(zero);

      expect(total).toBe(0);
    });
  });

  describe("copying", () => {
    it("creates independent copy of tension state", () => {
      const original: StructuralTension = {
        rhythmic: 0.7,
        harmonic: 0.5,
        formal: 0.3,
      };

      const copy = copyTension(original);

      expect(copy).toEqual(original);

      // Mutating copy should not affect original
      copy.rhythmic = 0.9;
      expect(original.rhythmic).toBe(0.7);
    });
  });

  describe("equality", () => {
    it("returns true for equal tension states", () => {
      const a: StructuralTension = {
        rhythmic: 0.5,
        harmonic: 0.5,
        formal: 0.5,
      };

      const b: StructuralTension = {
        rhythmic: 0.5,
        harmonic: 0.5,
        formal: 0.5,
      };

      expect(tensionEquals(a, b)).toBe(true);
    });

    it("returns false for different tension states", () => {
      const a: StructuralTension = {
        rhythmic: 0.5,
        harmonic: 0.5,
        formal: 0.5,
      };

      const b: StructuralTension = {
        rhythmic: 0.6,
        harmonic: 0.5,
        formal: 0.5,
      };

      expect(tensionEquals(a, b)).toBe(false);
    });

    it("handles floating point comparison with epsilon", () => {
      const a: StructuralTension = {
        rhythmic: 0.5,
        harmonic: 0.5,
        formal: 0.5,
      };

      const b: StructuralTension = {
        rhythmic: 0.5000001, // Within epsilon
        harmonic: 0.5,
        formal: 0.5,
      };

      expect(tensionEquals(a, b)).toBe(true);
    });
  });

  describe("interpolation", () => {
    it("interpolates between two tension states at t=0", () => {
      const from: StructuralTension = {
        rhythmic: 0.2,
        harmonic: 0.3,
        formal: 0.4,
      };

      const to: StructuralTension = {
        rhythmic: 0.8,
        harmonic: 0.7,
        formal: 0.6,
      };

      const result = interpolateTension(from, to, 0);

      expect(result).toEqual(from);
    });

    it("interpolates between two tension states at t=1", () => {
      const from: StructuralTension = {
        rhythmic: 0.2,
        harmonic: 0.3,
        formal: 0.4,
      };

      const to: StructuralTension = {
        rhythmic: 0.8,
        harmonic: 0.7,
        formal: 0.6,
      };

      const result = interpolateTension(from, to, 1);

      expect(result).toEqual(to);
    });

    it("interpolates between two tension states at t=0.5", () => {
      const from: StructuralTension = {
        rhythmic: 0.2,
        harmonic: 0.3,
        formal: 0.4,
      };

      const to: StructuralTension = {
        rhythmic: 0.8,
        harmonic: 0.7,
        formal: 0.6,
      };

      const result = interpolateTension(from, to, 0.5);

      expect(result.rhythmic).toBeCloseTo(0.5, 2); // (0.2 + 0.8) / 2
      expect(result.harmonic).toBeCloseTo(0.5, 2); // (0.3 + 0.7) / 2
      expect(result.formal).toBeCloseTo(0.5, 2); // (0.4 + 0.6) / 2
    });
  });

  describe("Schillinger compliance", () => {
    it("never produces total tension outside [0, 1]", () => {
      // Test various edge cases
      const testCases: StructuralTension[] = [
        { rhythmic: 0, harmonic: 0, formal: 0 },
        { rhythmic: 1, harmonic: 1, formal: 1 },
        { rhythmic: -10, harmonic: -10, formal: -10 },
        { rhythmic: 100, harmonic: 100, formal: 100 },
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        { rhythmic: 1.5, harmonic: -0.5, formal: 0.5 },
      ];

      testCases.forEach((t) => {
        const total = totalTension(t);
        expect(total).toBeGreaterThanOrEqual(0);
        expect(total).toBeLessThanOrEqual(1);
      });
    });

    it("all domains contribute meaningfully to total tension", () => {
      // Verify that no domain is ignored
      const onlyRhythm = totalTension({ rhythmic: 1, harmonic: 0, formal: 0 });
      const onlyHarmony = totalTension({ rhythmic: 0, harmonic: 1, formal: 0 });
      const onlyForm = totalTension({ rhythmic: 0, harmonic: 0, formal: 1 });

      // All should contribute
      expect(onlyRhythm).toBeGreaterThan(0);
      expect(onlyHarmony).toBeGreaterThan(0);
      expect(onlyForm).toBeGreaterThan(0);

      // Rhythm and harmony should contribute more than form
      expect(onlyRhythm).toBeGreaterThan(onlyForm);
      expect(onlyHarmony).toBeGreaterThan(onlyForm);
    });
  });
});
