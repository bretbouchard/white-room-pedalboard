/**
 * Property-Based Tests: Mathematical Invariants
 *
 * These tests verify mathematical properties hold across random inputs.
 * Uses Vitest's repeated testing instead of fast-check to avoid dependency issues.
 *
 * @module tests/property-based
 */

import { describe, it, expect } from "vitest";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";
import { clampTension } from "../../src/structure/StructuralTension";
import { RhythmicResultantsGenerator } from "../../src/structure/RhythmicResultants";
import { RegisterMotionManager } from "../../src/structure/RegisterMotion";
import { DomainOrthogonalMotionManager } from "../../src/structure/DomainOrthogonalMotion";

describe("Property-Based Tests: Mathematical Invariants", () => {
  describe("Tension Accumulation", () => {
    it("should maintain weighted sum invariant (rhythmic 40%, harmonic 40%, formal 20%)", () => {
      // Test 100 random combinations
      for (let i = 0; i < 100; i++) {
        const rhythmic = Math.random();
        const harmonic = Math.random();
        const formal = Math.random();
        const cause = `test_${i}`;

        const accumulator = new TensionAccumulator();

        accumulator.writeRhythmicTension(rhythmic, cause);
        accumulator.writeHarmonicTension(harmonic, cause);
        accumulator.writeFormalTension(formal, cause);

        const current = accumulator.getCurrent();
        const total = accumulator.getTotal();

        // Weighted sum should equal total
        const expectedTotal =
          current.rhythmic * 0.4 +
          current.harmonic * 0.4 +
          current.formal * 0.2;

        expect(Math.abs(total - expectedTotal)).toBeLessThan(0.001);
      }
    });

    it("should clamp all tension values to [0, 1]", () => {
      // Test various values including edge cases
      const testValues = [
        ...Array.from({ length: 20 }, () => Math.random() * 2 - 1), // -1 to 1
        ...Array.from({ length: 10 }, () => Math.random() * 10), // 0 to 10
        ...Array.from({ length: 10 }, () => -Math.random() * 10), // -10 to 0
        0,
        1,
        -1,
        2,
        -2,
        0.5,
        1.5,
        -0.5,
      ];

      for (const value of testValues) {
        const clamped = clampTension(value);
        expect(clamped).toBeGreaterThanOrEqual(0);
        expect(clamped).toBeLessThanOrEqual(1);
      }
    });

    it("should preserve ordering when accumulating same domain", () => {
      // Test with arrays of various lengths
      for (let i = 0; i < 50; i++) {
        const arrayLength = Math.floor(Math.random() * 10) + 1;
        const values = Array.from({ length: arrayLength }, () => Math.random());
        const cause = `test_${i}`;

        const accumulator = new TensionAccumulator();

        // Write multiple rhythmic tension values
        for (const value of values) {
          accumulator.writeRhythmicTension(value, cause);
        }

        // Final value should be the last one written
        const current = accumulator.getCurrent();
        expect(
          Math.abs(current.rhythmic - values[values.length - 1]),
        ).toBeLessThan(0.001);
      }
    });
  });

  describe("StructuralTension Clamping", () => {
    it("should be idempotent for values in range [0, 1]", () => {
      // Test 100 random values in range
      for (let i = 0; i < 100; i++) {
        const value = Math.random();
        const clampedOnce = clampTension(value);
        const clampedTwice = clampTension(clampedOnce);
        expect(Math.abs(clampedOnce - clampedTwice)).toBeLessThan(0.0001);
      }
    });

    it("should map negative values to 0", () => {
      // Test various negative values
      const negativeValues = [
        ...Array.from({ length: 50 }, () => -Math.random() * 100),
        -0.0001,
        -0.001,
        -0.01,
        -0.1,
        -1,
        -10,
        -100,
      ];

      for (const value of negativeValues) {
        const clamped = clampTension(value);
        expect(clamped).toBe(0);
      }
    });

    it("should map values > 1 to 1", () => {
      // Test various large values
      const largeValues = [
        ...Array.from({ length: 50 }, () => 1 + Math.random() * 100),
        1.0001,
        1.001,
        1.01,
        1.1,
        2,
        10,
        100,
      ];

      for (const value of largeValues) {
        const clamped = clampTension(value);
        expect(clamped).toBe(1);
      }
    });
  });

  describe("Register Motion", () => {
    it("should maintain currentMin ≤ currentMax invariant", () => {
      // Test 100 random register configurations
      for (let i = 0; i < 100; i++) {
        const min = Math.floor(Math.random() * 60);
        const max = min + Math.floor(Math.random() * (60 - min));
        const currentMin = min + Math.floor(Math.random() * (max - min + 1));
        const currentMax =
          currentMin + Math.floor(Math.random() * (max - currentMin + 1));
        const role = `test_role_${i}`;

        const accumulator = new TensionAccumulator();
        const registerMotion = new RegisterMotionManager(accumulator);

        registerMotion.registerRole(role, "harmonic", {
          min,
          max,
          preferred: Math.floor((min + max) / 2),
        });

        registerMotion.updateRegister(
          role,
          {
            currentMin,
            currentMax,
          },
          "test",
        );

        const state = registerMotion.getRegisterState(role);
        expect(state).toBeDefined();
        expect(state!.currentMin).toBe(currentMin);
        expect(state!.currentMax).toBe(currentMax);
        expect(state!.currentMin).toBeLessThanOrEqual(state!.currentMax);
      }
    });

    it("should calculate center as average of currentMin and currentMax", () => {
      // Test 100 random configurations
      for (let i = 0; i < 100; i++) {
        const min = Math.floor(Math.random() * 100);
        const max = min + Math.floor(Math.random() * (100 - min));
        const role = `test_role_${i}`;

        const accumulator = new TensionAccumulator();
        const registerMotion = new RegisterMotionManager(accumulator);

        registerMotion.registerRole(role, "harmonic", {
          min,
          max,
          preferred: Math.floor((min + max) / 2),
        });

        registerMotion.updateRegister(
          role,
          {
            currentMin: min,
            currentMax: max,
          },
          "test",
        );

        const state = registerMotion.getRegisterState(role);
        expect(state).toBeDefined();

        const expectedCenter = (min + max) / 2;
        expect(
          Math.abs(state!.currentCenter - expectedCenter),
        ).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Rhythmic Resultants", () => {
    it("should generate cyclic patterns that repeat", () => {
      // Test various combinations
      const testCases = [
        [3, 4],
        [5, 7],
        [7, 8],
        [11, 13],
        [2, 3],
        [3, 5],
        [4, 5],
        [6, 7],
        [8, 9],
        [9, 10],
        [12, 13],
        [15, 16],
      ];

      for (const [generator, periodicity] of testCases) {
        const accumulator = new TensionAccumulator();
        const resultants = new RhythmicResultantsGenerator(accumulator, {
          autoWriteTension: false,
        });

        const resultant = resultants.generate(generator, periodicity);

        // Resultant pattern should have valid length
        expect(resultant.pattern.length).toBeGreaterThan(0);

        // All onset positions should be within bounds
        resultant.pattern.forEach((onset) => {
          expect(onset).toBeGreaterThanOrEqual(0);
          expect(onset).toBeLessThan(resultant.pattern.length);
        });
      }
    });

    it("should handle generator < periodicity", () => {
      // Test with smaller generator
      const testCases = [
        [3, 5],
        [4, 7],
        [5, 9],
        [2, 4],
      ];

      for (const [generator, periodicity] of testCases) {
        const accumulator = new TensionAccumulator();
        const resultants = new RhythmicResultantsGenerator(accumulator, {
          autoWriteTension: false,
        });

        const resultant = resultants.generate(generator, periodicity);

        // Should handle gracefully
        expect(resultant.pattern.length).toBeGreaterThan(0);
      }
    });

    it("should produce valid onset patterns", () => {
      // Test 50 random combinations
      for (let i = 0; i < 50; i++) {
        const generator = Math.floor(Math.random() * 12) + 2;
        const periodicity = Math.floor(Math.random() * 12) + 2;

        if (generator === periodicity) continue;

        const accumulator = new TensionAccumulator();
        const resultants = new RhythmicResultantsGenerator(accumulator, {
          autoWriteTension: false,
        });

        const resultant = resultants.generate(generator, periodicity);

        // All onsets should be in bounds (repeats are allowed)
        resultant.pattern.forEach((onset) => {
          expect(onset).toBeGreaterThanOrEqual(0);
          expect(onset).toBeLessThan(resultant.pattern.length);
        });

        // Pattern should have at least one onset
        expect(resultant.pattern.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Domain Orthogonal Motion", () => {
    it("should maintain domain complexity in [0, 1]", () => {
      // Test 100 random tension combinations
      for (let i = 0; i < 100; i++) {
        const rhythmic = Math.random();
        const harmonic = Math.random();
        const formal = Math.random();

        const accumulator = new TensionAccumulator();
        const manager = new DomainOrthogonalMotionManager(accumulator, {
          rhythmHarmony: true,
          harmonyOrchestration: false,
          smoothing: 1.0,
          minAdjustmentInterval: 0,
        });

        manager.updateDomains({ rhythmic, harmonic, formal }, "test");
        const levels = manager.getDomainLevels();

        // All domain complexities should be in [0, 1]
        expect(levels.rhythm.complexity).toBeGreaterThanOrEqual(0);
        expect(levels.rhythm.complexity).toBeLessThanOrEqual(1);
        expect(levels.harmony.complexity).toBeGreaterThanOrEqual(0);
        expect(levels.harmony.complexity).toBeLessThanOrEqual(1);
        expect(levels.orchestration.complexity).toBeGreaterThanOrEqual(0);
        expect(levels.orchestration.complexity).toBeLessThanOrEqual(1);
      }
    });

    it("should calculate balance score in [0, 1]", () => {
      // Test various tension combinations
      for (let i = 0; i < 100; i++) {
        const rhythmic = Math.random();
        const harmonic = Math.random();
        const formal = Math.random();

        const accumulator = new TensionAccumulator();
        const manager = new DomainOrthogonalMotionManager(accumulator, {
          rhythmHarmony: true,
          harmonyOrchestration: false,
          smoothing: 1.0,
          minAdjustmentInterval: 0,
        });

        manager.updateDomains({ rhythmic, harmonic, formal }, "test");
        const snapshot = manager.getSnapshot();

        // Balance should be in [0, 1]
        expect(snapshot.balance).toBeGreaterThanOrEqual(0);
        expect(snapshot.balance).toBeLessThanOrEqual(1);
      }
    });

    it("should have orthogonal tension in [0, 1]", () => {
      // Test 100 random combinations
      for (let i = 0; i < 100; i++) {
        const rhythmic = Math.random();
        const harmonic = Math.random();
        const formal = Math.random();

        const accumulator = new TensionAccumulator();
        const manager = new DomainOrthogonalMotionManager(accumulator, {
          rhythmHarmony: true,
          harmonyOrchestration: false,
          smoothing: 1.0,
          minAdjustmentInterval: 0,
        });

        manager.updateDomains({ rhythmic, harmonic, formal }, "test");
        const snapshot = manager.getSnapshot();

        // Orthogonal tension should be in [0, 1]
        expect(snapshot.orthogonalTension).toBeGreaterThanOrEqual(0);
        expect(snapshot.orthogonalTension).toBeLessThanOrEqual(1);
      }
    });
  });
});
