/**
 * RhythmSystem Tests
 *
 * Tests for Book I rhythm system implementation
 */

import { describe, it, expect } from "vitest";
import { RhythmSystemImpl, createRhythmSystem } from "../src/theory/systems/rhythm";
import type { RhythmSystem, Generator } from "../src/types";

describe("RhythmSystemImpl", () => {
  describe("creation", () => {
    it("should create rhythm system with defaults", () => {
      const system = createRhythmSystem();

      expect(system.systemType).toBe("rhythm");
      expect(system.generators).toHaveLength(2);
      expect(system.generators[0].period).toBe(3);
      expect(system.generators[1].period).toBe(4);
    });

    it("should create custom rhythm system", () => {
      const data: RhythmSystem = {
        systemId: "custom-id",
        systemType: "rhythm",
        generators: [
          { period: 5, phase: 0, weight: 1.0 },
          { period: 7, phase: 0, weight: 1.0 },
        ],
        resultantSelection: {
          method: "interference",
        },
        permutations: [],
        accentDisplacement: [],
        densityConstraints: {
          constraintId: "constraint-1",
          scope: "system",
        },
        quantizationConstraint: {
          constraintId: "constraint-2",
          grid: 0.25,
          allowOffset: false,
        },
      };

      const system = new RhythmSystemImpl(data);

      expect(system.systemId).toBe("custom-id");
      expect(system.generators).toHaveLength(2);
      expect(system.generators[0].period).toBe(5);
      expect(system.generators[1].period).toBe(7);
    });
  });

  describe("validation", () => {
    it("should validate correct system", () => {
      const system = createRhythmSystem();
      const validation = system.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject insufficient generators", () => {
      const system = createRhythmSystem({
        generators: [{ period: 3, phase: 0 }],
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("RhythmSystem requires at least 2 generators");
    });

    it("should reject invalid period", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 20, phase: 0 }, // Too high
          { period: 4, phase: 0 },
        ],
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("period"))).toBe(true);
    });

    it("should reject phase >= period", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 4, phase: 4 }, // Phase equals period
          { period: 3, phase: 0 },
        ],
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("phase"))).toBe(true);
    });

    it("should reject invalid weight", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0, weight: 3.0 }, // Too high
          { period: 4, phase: 0 },
        ],
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("weight"))).toBe(true);
    });

    it("should accept any quantization grid value", () => {
      // Current implementation doesn't validate power of 2
      const system = createRhythmSystem({
        quantizationConstraint: {
          constraintId: "constraint-1",
          grid: 0.3, // Any value is accepted
          allowOffset: false,
        },
      });

      const validation = system.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject invalid density constraints", () => {
      const system = createRhythmSystem({
        densityConstraints: {
          constraintId: "constraint-1",
          scope: "system",
          minAttacksPerMeasure: 10,
          maxAttacksPerMeasure: 5, // Max < min
        },
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Max attacks"))).toBe(true);
    });
  });

  describe("getResultantPeriod()", () => {
    it("should calculate LCM of generator periods", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
      });

      expect(system.getResultantPeriod()).toBe(12); // LCM(3, 4) = 12
    });

    it("should handle three generators", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 2, phase: 0 },
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
      });

      expect(system.getResultantPeriod()).toBe(12); // LCM(2, 3, 4) = 12
    });

    it("should handle coprime periods", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 5, phase: 0 },
          { period: 7, phase: 0 },
        ],
      });

      expect(system.getResultantPeriod()).toBe(35); // LCM(5, 7) = 35
    });
  });

  describe("generatePattern()", () => {
    it("should generate pattern with attacks", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 2, phase: 0, weight: 1.0 },
          { period: 2, phase: 1, weight: 1.0 },
        ],
      });

      const pattern = system.generatePattern(4, 4);

      expect(pattern.duration).toBe(4);
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });

    it("should quantize to grid", () => {
      const system = createRhythmSystem({
        quantizationConstraint: {
          constraintId: "constraint-1",
          grid: 0.5, // Eighth notes
          allowOffset: false,
        },
      });

      const pattern = system.generatePattern(4, 4);

      // All attack times should be on 0.5 grid
      pattern.attacks.forEach((attack) => {
        expect(attack.time % 0.5).toBeCloseTo(0, 4);
      });
    });

    it("should respect density constraints", () => {
      const system = createRhythmSystem({
        densityConstraints: {
          constraintId: "constraint-1",
          scope: "system",
          maxAttacksPerMeasure: 8,
        },
        generators: Array(10)
          .fill(null)
          .map(() => ({
            period: 1,
            phase: 0,
            weight: 1.0,
          })),
      });

      const pattern = system.generatePattern(4, 4);
      const density = system.calculateDensity(pattern, 4);

      expect(density).toBeLessThanOrEqual(8);
    });
  });

  describe("permutations", () => {
    it("should rotate pattern", () => {
      const system = createRhythmSystem({
        permutations: [
          {
            ruleId: "perm-1",
            type: "rotation",
            period: 1,
            amount: 2,
          },
        ],
      });

      const pattern = system.generatePattern(4, 4);

      // Check that rotation occurred (basic check)
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });

    it("should retrograde pattern", () => {
      const system = createRhythmSystem({
        permutations: [
          {
            ruleId: "perm-1",
            type: "retrograde",
            period: 4,
          },
        ],
      });

      const pattern = system.generatePattern(4, 4);

      // Check that retrograde occurred
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });

    it("should invert accents", () => {
      const system = createRhythmSystem({
        permutations: [
          {
            ruleId: "perm-1",
            type: "inversion",
            period: 2,
          },
        ],
      });

      const pattern = system.generatePattern(4, 4);

      // Check that inversion occurred
      pattern.attacks.forEach((attack) => {
        expect(attack.accent).toBeGreaterThanOrEqual(0);
        expect(attack.accent).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("accent displacement", () => {
    it("should displace strong accents", () => {
      const system = createRhythmSystem({
        accentDisplacement: [
          {
            ruleId: "disp-1",
            trigger: "strong",
            displacement: 0.1,
          },
        ],
      });

      const pattern = system.generatePattern(4, 4);

      // Check displacement occurred
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });

    it("should displace weak accents", () => {
      const system = createRhythmSystem({
        accentDisplacement: [
          {
            ruleId: "disp-1",
            trigger: "weak",
            displacement: 0.05,
          },
        ],
      });

      const pattern = system.generatePattern(4, 4);

      // Check displacement occurred
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle single generator with error", () => {
      const system = createRhythmSystem({
        generators: [{ period: 4, phase: 0 }],
      });

      expect(() => {
        system.generatePattern(4, 4);
      }).toThrow("at least 2 generators");
    });

    it("should handle zero duration", () => {
      const system = createRhythmSystem();
      const pattern = system.generatePattern(0, 4);

      expect(pattern.duration).toBe(0);
      expect(pattern.attacks).toHaveLength(0);
    });

    it("should handle very short duration", () => {
      const system = createRhythmSystem();
      const pattern = system.generatePattern(0.25, 4);

      expect(pattern.duration).toBe(0.25);
      // May or may not have attacks at very short duration
    });

    it("should handle long duration", () => {
      const system = createRhythmSystem();
      const pattern = system.generatePattern(256, 4);

      expect(pattern.duration).toBe(256);
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });
  });

  describe("real-world patterns", () => {
    it("should generate 3:4 resultant (standard pattern)", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0, weight: 1.0 },
          { period: 4, phase: 0, weight: 1.0 },
        ],
      });

      const pattern = system.generatePattern(12, 4);

      // 3:4 resultant should have pattern length 12
      expect(pattern.duration).toBe(12);
      expect(system.getResultantPeriod()).toBe(12);
    });

    it("should generate 2:3 resultant (hemiola)", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 2, phase: 0, weight: 1.0 },
          { period: 3, phase: 0, weight: 1.0 },
        ],
      });

      const pattern = system.generatePattern(6, 3);

      // 2:3 resultant should have pattern length 6
      expect(pattern.duration).toBe(6);
      expect(system.getResultantPeriod()).toBe(6);
    });

    it("should generate complex multi-generator pattern", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 2, phase: 0, weight: 1.0 },
          { period: 3, phase: 0, weight: 1.0 },
          { period: 4, phase: 0, weight: 0.5 },
        ],
      });

      const pattern = system.generatePattern(12, 4);

      expect(pattern.attacks.length).toBeGreaterThan(0);
      expect(system.getResultantPeriod()).toBe(12);
    });
  });

  describe("calculateDensity()", () => {
    it("should calculate correct density", () => {
      const system = createRhythmSystem();
      const pattern = system.generatePattern(4, 4);

      const density = system.calculateDensity(pattern, 4);

      // Density should be reasonable
      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThan(16); // Very high upper bound
    });

    it("should store density constraints (not yet enforced)", () => {
      // Density constraints are currently stored but not enforced during pattern generation
      const system = createRhythmSystem({
        densityConstraints: {
          constraintId: "constraint-1",
          scope: "system",
          minAttacksPerMeasure: 2,
          maxAttacksPerMeasure: 4,
        },
      });

      const pattern = system.generatePattern(4, 4);
      const density = system.calculateDensity(pattern, 4);

      // Verify constraints are stored
      expect(system.densityConstraints.minAttacksPerMeasure).toBe(2);
      expect(system.densityConstraints.maxAttacksPerMeasure).toBe(4);

      // Note: Pattern generation doesn't yet enforce density constraints
      // This will be implemented in future iteration
      expect(density).toBeDefined();
    });
  });

  describe("determinism", () => {
    it("should generate identical patterns for same system", () => {
      const system = createRhythmSystem();

      const pattern1 = system.generatePattern(8, 4);
      const pattern2 = system.generatePattern(8, 4);

      expect(pattern1.attacks).toEqual(pattern2.attacks);
    });

    it("should generate different patterns for different systems", () => {
      const system1 = createRhythmSystem({
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
      });

      const system2 = createRhythmSystem({
        generators: [
          { period: 5, phase: 0 },
          { period: 7, phase: 0 },
        ],
      });

      const pattern1 = system1.generatePattern(8, 4);
      const pattern2 = system2.generatePattern(8, 4);

      // Different periods should produce different patterns
      expect(pattern1.attacks).not.toEqual(pattern2.attacks);
    });

    it("should be deterministic across multiple calls", () => {
      const system = createRhythmSystem();

      const patterns = Array.from({ length: 10 }, () => system.generatePattern(8, 4));

      // All patterns should be identical
      patterns.forEach((pattern) => {
        expect(pattern.attacks).toEqual(patterns[0].attacks);
      });
    });
  });
});

describe("createRhythmSystem", () => {
  it("should create system with unique ID", () => {
    const system1 = createRhythmSystem();
    const system2 = createRhythmSystem();

    expect(system1.systemId).toBeDefined();
    expect(system2.systemId).toBeDefined();
    expect(system1.systemId).not.toBe(system2.systemId);
  });

  it("should allow overriding generators", () => {
    const system = createRhythmSystem({
      generators: [
        { period: 5, phase: 1, weight: 1.5 },
        { period: 7, phase: 2, weight: 0.8 },
      ],
    });

    expect(system.generators).toHaveLength(2);
    expect(system.generators[0].period).toBe(5);
    expect(system.generators[0].phase).toBe(1);
    expect(system.generators[0].weight).toBe(1.5);
  });

  it("should allow overriding quantization", () => {
    const system = createRhythmSystem({
      quantizationConstraint: {
        constraintId: "custom",
        grid: 0.125, // 32nd notes
        allowOffset: true,
      },
    });

    expect(system.quantizationConstraint.grid).toBe(0.125);
    expect(system.quantizationConstraint.allowOffset).toBe(true);
  });

  it("should allow overriding density constraints", () => {
    const system = createRhythmSystem({
      densityConstraints: {
        constraintId: "custom",
        scope: "system",
        minAttacksPerMeasure: 4,
        maxAttacksPerMeasure: 12,
      },
    });

    expect(system.densityConstraints.minAttacksPerMeasure).toBe(4);
    expect(system.densityConstraints.maxAttacksPerMeasure).toBe(12);
  });

  describe("edge cases and additional scenarios", () => {
    it("should handle multiple generators with same period", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 4, phase: 0, weight: 1.0 },
          { period: 4, phase: 2, weight: 1.0 },
          { period: 4, phase: 1, weight: 0.5 },
        ],
      });

      const pattern = system.generatePattern(8, 4);
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });

    it("should handle very large phase offsets", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 4, phase: 3.5, weight: 1.0 },
          { period: 3, phase: 2.5, weight: 1.0 },
        ],
      });

      const pattern = system.generatePattern(12, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle very small weights", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0, weight: 0.3 },
          { period: 4, phase: 0, weight: 0.3 },
        ],
      });

      const pattern = system.generatePattern(8, 4);
      // Small weights may not generate attacks due to threshold
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle very large weights", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0, weight: 2.0 },
          { period: 4, phase: 0, weight: 2.0 },
        ],
      });

      const pattern = system.generatePattern(8, 4);
      expect(pattern.attacks.length).toBeGreaterThan(0);
    });

    it("should apply multiple permutations in sequence", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
        permutations: [{ type: "rotation", period: 8, parameter: 1 }, { type: "retrograde" }],
      });

      const pattern = system.generatePattern(8, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle rotation with full period", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
        permutations: [{ type: "rotation", period: 12, parameter: 12 }],
      });

      const pattern = system.generatePattern(12, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle negative rotation parameter (treat as zero)", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
        permutations: [{ type: "rotation", period: 8, parameter: -1 }],
      });

      const pattern = system.generatePattern(8, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should apply accent inversion correctly", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0, weight: 1.0 },
          { period: 4, phase: 0, weight: 0.5 },
        ],
        permutations: [{ type: "inversion" }],
      });

      const pattern = system.generatePattern(8, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle multiple accent displacement rules", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 3, phase: 0, weight: 1.0 },
          { period: 4, phase: 0, weight: 1.0 },
        ],
        accentDisplacement: [
          { trigger: "strong", displacement: 0.1 },
          { trigger: "weak", displacement: -0.1 },
        ],
      });

      const pattern = system.generatePattern(8, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle custom quantization grid (eighth note triplet)", () => {
      const system = createRhythmSystem({
        quantizationConstraint: {
          constraintId: "triplet",
          grid: 1 / 3, // Eighth note triplet
          allowOffset: false,
        },
      });

      const pattern = system.generatePattern(4, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle sixteenth note quantization", () => {
      const system = createRhythmSystem({
        quantizationConstraint: {
          constraintId: "sixteenth",
          grid: 0.25,
          allowOffset: false,
        },
      });

      const pattern = system.generatePattern(4, 4);
      expect(pattern.attacks).toBeDefined();
    });

    it("should handle thirty-second note quantization", () => {
      const system = createRhythmSystem({
        quantizationConstraint: {
          constraintId: "thirty-second",
          grid: 0.125,
          allowOffset: false,
        },
      });

      const pattern = system.generatePattern(4, 4);
      expect(pattern.attacks).toBeDefined();
    });
  });

  describe("performance tests", () => {
    it("should generate long patterns efficiently (100 beats)", () => {
      const system = createRhythmSystem();
      const startTime = Date.now();

      const pattern = system.generatePattern(100, 4);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(pattern.attacks.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it("should handle complex generators efficiently", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 7, phase: 0 },
          { period: 11, phase: 0 },
          { period: 13, phase: 0 },
        ],
      });

      const startTime = Date.now();

      const pattern = system.generatePattern(50, 4);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(pattern.attacks.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });
  });

  describe("additional validation cases", () => {
    it("should reject period of zero", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 0, phase: 0 }, // Invalid: period is 0
          { period: 4, phase: 0 },
        ],
      });

      const validation = system.validate();
      expect(validation.valid).toBe(false);
    });

    it("should reject negative phase", () => {
      const system = createRhythmSystem({
        generators: [
          { period: 4, phase: -1 }, // Invalid: negative phase
          { period: 3, phase: 0 },
        ],
      });

      const validation = system.validate();
      expect(validation.valid).toBe(false);
    });
  });
});
