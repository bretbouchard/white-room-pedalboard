/**
 * MelodySystem Tests
 *
 * Tests for Book II melody system implementation
 */

import { describe, it, expect } from "vitest";
import { MelodySystemImpl, createMelodySystem } from "../src/theory/systems/melody";
import type { MelodySystem } from "../src/types";

describe("MelodySystemImpl", () => {
  describe("creation", () => {
    it("should create melody system with defaults", () => {
      const system = createMelodySystem();

      expect(system.systemType).toBe("melody");
      expect(system.cycleLength).toBe(7);
      expect(system.intervalSeed).toEqual([2, 2, 1, 2, 2, 2, 1]);
      expect(system.rotationRule.type).toBe("cyclic");
      expect(system.directionalBias).toBe(0);
    });

    it("should create custom melody system", () => {
      const data: MelodySystem = {
        systemId: "custom-id",
        systemType: "melody",
        cycleLength: 12,
        intervalSeed: [1, 2, 3, 4, 5],
        rotationRule: {
          ruleId: "rot-1",
          type: "cyclic",
          interval: 12,
          amount: 2,
        },
        expansionRules: [
          {
            ruleId: "exp-1",
            trigger: "periodic",
            multiplier: 2,
            period: 4,
          },
        ],
        contractionRules: [],
        contourConstraints: {
          constraintId: "contour-1",
          type: "ascending",
        },
        directionalBias: 0.5,
        registerConstraints: {
          constraintId: "reg-1",
          minPitch: 60,
          maxPitch: 84,
          allowTransposition: false,
        },
      };

      const system = new MelodySystemImpl(data);

      expect(system.systemId).toBe("custom-id");
      expect(system.cycleLength).toBe(12);
      expect(system.intervalSeed).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("validation", () => {
    it("should validate correct system", () => {
      const system = createMelodySystem();
      const validation = system.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject cycle length out of range", () => {
      const system = createMelodySystem({ cycleLength: 25 }); // Too high

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Cycle length"))).toBe(true);
    });

    it("should reject empty interval seed", () => {
      const system = createMelodySystem({ intervalSeed: [] });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Interval seed"))).toBe(true);
    });

    it("should reject interval out of range", () => {
      const system = createMelodySystem({ intervalSeed: [13] }); // Too high

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Interval"))).toBe(true);
    });

    it("should reject invalid rotation interval", () => {
      const system = createMelodySystem({
        rotationRule: {
          ruleId: "rot-1",
          type: "cyclic",
          interval: 0, // Invalid
        },
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Rotation interval"))).toBe(true);
    });

    it("should reject invalid expansion multiplier", () => {
      const system = createMelodySystem({
        expansionRules: [
          {
            ruleId: "exp-1",
            trigger: "periodic",
            multiplier: 5, // Too high
            period: 4,
          },
        ],
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Expansion multiplier"))).toBe(true);
    });

    it("should reject invalid contraction divisor", () => {
      const system = createMelodySystem({
        contractionRules: [
          {
            ruleId: "con-1",
            trigger: "periodic",
            divisor: 5, // Too high
            period: 4,
          },
        ],
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Contraction divisor"))).toBe(true);
    });

    it("should reject negative max interval leaps", () => {
      const system = createMelodySystem({
        contourConstraints: {
          constraintId: "contour-1",
          type: "ascending",
          maxIntervalLeaps: -1, // Invalid
        },
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Max interval leaps"))).toBe(true);
    });

    it("should reject directional bias out of range", () => {
      const system = createMelodySystem({ directionalBias: 1.5 }); // Too high

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Directional bias"))).toBe(true);
    });

    it("should reject pitch out of MIDI range", () => {
      const system = createMelodySystem({
        registerConstraints: {
          constraintId: "reg-1",
          minPitch: -1, // Invalid
          allowTransposition: false,
        },
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Min pitch"))).toBe(true);
    });

    it("should reject min pitch greater than max pitch", () => {
      const system = createMelodySystem({
        registerConstraints: {
          constraintId: "reg-1",
          minPitch: 84,
          maxPitch: 60, // Less than min
          allowTransposition: false,
        },
      });

      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Min pitch cannot be greater"))).toBe(true);
    });
  });

  describe("getCycleLength()", () => {
    it("should return cycle length", () => {
      const system = createMelodySystem({ cycleLength: 12 });

      expect(system.getCycleLength()).toBe(12);
    });
  });

  describe("getIntervalSeed()", () => {
    it("should return copy of interval seed", () => {
      const intervals = [2, 2, 1, 2, 2, 2, 1];
      const system = createMelodySystem({ intervalSeed: intervals });

      const seed = system.getIntervalSeed();

      expect(seed).toEqual(intervals);
      expect(seed).not.toBe(intervals); // Copy, not reference
    });
  });

  describe("generateMelody()", () => {
    it("should generate melody with pitches", () => {
      const system = createMelodySystem({
        intervalSeed: [2, 2, 1], // Simple pattern
        cycleLength: 3,
      });

      const rhythmPattern = [0, 1, 2, 3]; // Quarter notes
      const melody = system.generateMelody(4, rhythmPattern, 60);

      expect(melody).toHaveLength(4);
      expect(melody[0].pitch).toBe(60); // Root
      expect(melody[1].pitch).toBe(62); // Root + first interval
      expect(melody[0].time).toBe(0);
      expect(melody[0].duration).toBe(1);
    });

    it("should respect cycle length", () => {
      const system = createMelodySystem({
        intervalSeed: [2, 2, 1],
        cycleLength: 3,
      });

      const rhythmPattern = [0, 1, 2, 3, 4, 5]; // 6 notes
      const melody = system.generateMelody(6, rhythmPattern, 60);

      // Pattern should repeat after 3 intervals
      expect(melody).toHaveLength(6);
      expect(melody[0].pitch).toBe(60); // Root
      expect(melody[1].pitch).toBe(62); // Root + 2
      expect(melody[2].pitch).toBe(64); // 62 + 2
      expect(melody[3].pitch).toBe(65); // 64 + 1 (wrap to start of cycle)
    });

    it("should apply cyclic rotation", () => {
      const system = createMelodySystem({
        intervalSeed: [1, 2, 3],
        cycleLength: 3,
        rotationRule: {
          ruleId: "rot-1",
          type: "cyclic",
          interval: 3,
          amount: 1,
        },
      });

      const rhythmPattern = [0, 1, 2];
      const melody = system.generateMelody(3, rhythmPattern, 60);

      // After rotation, pattern should be [2, 3, 1]
      expect(melody[0].pitch).toBe(60); // Root
      expect(melody[1].pitch).toBe(62); // Root + 2 (first rotated interval)
    });

    it("should apply ascending contour constraint", () => {
      const system = createMelodySystem({
        intervalSeed: [-2, 2, -2, 2], // Mixed intervals
        cycleLength: 4,
        contourConstraints: {
          constraintId: "contour-1",
          type: "ascending",
        },
      });

      const rhythmPattern = [0, 1, 2, 3];
      const melody = system.generateMelody(4, rhythmPattern, 60);

      // All pitches should be >= previous
      for (let i = 1; i < melody.length; i++) {
        expect(melody[i].pitch).toBeGreaterThanOrEqual(melody[i - 1].pitch);
      }
    });

    it("should apply descending contour constraint", () => {
      const system = createMelodySystem({
        intervalSeed: [2, -2, 2, -2], // Mixed intervals
        cycleLength: 4,
        contourConstraints: {
          constraintId: "contour-1",
          type: "descending",
        },
      });

      const rhythmPattern = [0, 1, 2, 3];
      const melody = system.generateMelody(4, rhythmPattern, 72);

      // All pitches should be <= previous
      for (let i = 1; i < melody.length; i++) {
        expect(melody[i].pitch).toBeLessThanOrEqual(melody[i - 1].pitch);
      }
    });

    it("should apply directional bias", () => {
      const system = createMelodySystem({
        intervalSeed: [0, 0, 0], // Flat intervals
        cycleLength: 3,
        directionalBias: 0.5, // Ascending bias
      });

      const rhythmPattern = [0, 1, 2];
      const melody = system.generateMelody(3, rhythmPattern, 60);

      // Pitches should trend upward
      expect(melody[2].pitch).toBeGreaterThan(melody[0].pitch);
    });

    it("should clamp to register without transposition", () => {
      const system = createMelodySystem({
        intervalSeed: [12, 12, 12], // Large leaps
        cycleLength: 3,
        registerConstraints: {
          constraintId: "reg-1",
          minPitch: 60,
          maxPitch: 72,
          allowTransposition: false,
        },
      });

      const rhythmPattern = [0, 1, 2, 3];
      const melody = system.generateMelody(4, rhythmPattern, 60);

      // All pitches should be within [60, 72]
      melody.forEach((event) => {
        expect(event.pitch).toBeGreaterThanOrEqual(60);
        expect(event.pitch).toBeLessThanOrEqual(72);
      });
    });

    it("should transpose to fit register", () => {
      const system = createMelodySystem({
        intervalSeed: [0, 0, 0],
        cycleLength: 3,
        registerConstraints: {
          constraintId: "reg-1",
          minPitch: 72,
          maxPitch: 84,
          allowTransposition: true,
        },
      });

      const rhythmPattern = [0, 1];
      const melody = system.generateMelody(2, rhythmPattern, 60); // Start below register

      // First pitch should be transposed up by octave
      expect(melody[0].pitch).toBeGreaterThanOrEqual(72);
    });

    it("should respect max interval leaps", () => {
      const system = createMelodySystem({
        intervalSeed: [12, 12, 12], // Octave leaps
        cycleLength: 3,
        contourConstraints: {
          constraintId: "contour-1",
          type: "oscillating",
          maxIntervalLeaps: 5, // Max perfect 4th
        },
      });

      const rhythmPattern = [0, 1, 2];
      const melody = system.generateMelody(3, rhythmPattern, 60);

      // No interval should exceed 5 semitones
      for (let i = 1; i < melody.length; i++) {
        const interval = Math.abs(melody[i].pitch - melody[i - 1].pitch);
        expect(interval).toBeLessThanOrEqual(5);
      }
    });

    it("should calculate velocity based on contour", () => {
      const system = createMelodySystem({
        intervalSeed: [4, -4, 4], // Large intervals
        cycleLength: 3,
      });

      const rhythmPattern = [0, 1, 2];
      const melody = system.generateMelody(3, rhythmPattern, 60);

      // Ascending should be louder, descending softer
      // melody[0]: 60 (root), velocity based on no previous = 80
      // melody[1]: 64 (60 + 4), velocity based on +4 interval = 80 + 8 = 88
      // melody[2]: 60 (64 - 4), velocity based on -4 interval = 80 - 8 = 72
      expect(melody[0].velocity).toBe(80); // No previous interval
      expect(melody[1].velocity).toBeGreaterThan(80); // Ascending
      expect(melody[2].velocity).toBeLessThan(80); // Descending
    });
  });

  describe("expansion and contraction", () => {
    it("should apply expansion periodically", () => {
      const system = createMelodySystem({
        intervalSeed: [2, 2, 2],
        cycleLength: 3,
        expansionRules: [
          {
            ruleId: "exp-1",
            trigger: "periodic",
            multiplier: 2,
            period: 2, // Apply every 2 notes (at indices 1, 3, 5...)
          },
        ],
      });

      const rhythmPattern = [0, 1, 2, 3];
      const melody = system.generateMelody(4, rhythmPattern, 60);

      // melody[0]: 60 (root)
      // melody[1]: 62 (60 + 2) - no expansion (index 0, doesn't match period 2)
      // melody[2]: 64 (62 + 2*2) - expansion applied (index 1, matches period 2)
      // melody[3]: 66 (64 + 2) - no expansion (index 2, doesn't match period 2)
      expect(melody[1].pitch - melody[0].pitch).toBe(2); // No expansion
      expect(melody[2].pitch - melody[1].pitch).toBe(4); // 2 * 2
    });

    it("should apply contraction periodically", () => {
      const system = createMelodySystem({
        intervalSeed: [4, 4, 4],
        cycleLength: 3,
        contractionRules: [
          {
            ruleId: "con-1",
            trigger: "periodic",
            divisor: 2,
            period: 2, // Apply every 2 notes (at indices 1, 3, 5...)
          },
        ],
      });

      const rhythmPattern = [0, 1, 2, 3];
      const melody = system.generateMelody(4, rhythmPattern, 60);

      // melody[0]: 60 (root)
      // melody[1]: 64 (60 + 4) - no contraction (index 0)
      // melody[2]: 66 (64 + 4/2) - contraction applied (index 1)
      // melody[3]: 68 (66 + 4) - no contraction (index 2)
      expect(melody[1].pitch - melody[0].pitch).toBe(4); // No contraction
      expect(melody[2].pitch - melody[1].pitch).toBe(2); // 4 / 2
    });

    it("should apply both expansion and contraction", () => {
      const system = createMelodySystem({
        intervalSeed: [4, 4, 4],
        cycleLength: 3,
        expansionRules: [
          {
            ruleId: "exp-1",
            trigger: "periodic",
            multiplier: 2,
            period: 3, // Apply at indices 2, 5, 8...
          },
        ],
        contractionRules: [
          {
            ruleId: "con-1",
            trigger: "periodic",
            divisor: 2,
            period: 2, // Apply at indices 1, 3, 5...
          },
        ],
      });

      const rhythmPattern = [0, 1, 2, 3, 4, 5];
      const melody = system.generateMelody(6, rhythmPattern, 60);

      // Check that transformations are applied at the correct intervals
      // Some intervals should be transformed, some not
      const hasDifferentIntervals = melody.some((m, i) => {
        if (i === 0) return false;
        const interval = m.pitch - melody[i - 1].pitch;
        return interval !== 4; // Check if any interval is not the base 4
      });

      expect(hasDifferentIntervals).toBe(true); // At least some transformations occurred
    });
  });

  describe("calculateContour()", () => {
    it("should calculate ascending contour", () => {
      const system = createMelodySystem();
      const events = [
        { time: 0, pitch: 60, velocity: 80, duration: 1 },
        { time: 1, pitch: 62, velocity: 80, duration: 1 },
        { time: 2, pitch: 64, velocity: 80, duration: 1 },
        { time: 3, pitch: 65, velocity: 80, duration: 1 },
      ];

      const contour = system.calculateContour(events);

      expect(contour.direction).toBe("ascending");
      expect(contour.intervals).toEqual([2, 2, 1]);
    });

    it("should calculate descending contour", () => {
      const system = createMelodySystem();
      const events = [
        { time: 0, pitch: 72, velocity: 80, duration: 1 },
        { time: 1, pitch: 69, velocity: 80, duration: 1 },
        { time: 2, pitch: 67, velocity: 80, duration: 1 },
        { time: 3, pitch: 64, velocity: 80, duration: 1 },
      ];

      const contour = system.calculateContour(events);

      expect(contour.direction).toBe("descending");
    });

    it("should calculate oscillating contour", () => {
      const system = createMelodySystem();
      const events = [
        { time: 0, pitch: 60, velocity: 80, duration: 1 },
        { time: 1, pitch: 64, velocity: 80, duration: 1 },
        { time: 2, pitch: 62, velocity: 80, duration: 1 },
        { time: 3, pitch: 65, velocity: 80, duration: 1 },
      ];

      const contour = system.calculateContour(events);

      expect(contour.direction).toBe("oscillating");
    });

    it("should handle single note", () => {
      const system = createMelodySystem();
      const events = [{ time: 0, pitch: 60, velocity: 80, duration: 1 }];

      const contour = system.calculateContour(events);

      expect(contour.intervals).toHaveLength(0);
      expect(contour.direction).toBe("oscillating");
    });

    it("should handle empty melody", () => {
      const system = createMelodySystem();
      const events: any[] = [];

      const contour = system.calculateContour(events);

      expect(contour.intervals).toHaveLength(0);
      expect(contour.direction).toBe("oscillating");
    });
  });

  describe("edge cases", () => {
    it("should handle empty rhythm pattern", () => {
      const system = createMelodySystem();
      const melody = system.generateMelody(4, [], 60);

      expect(melody).toHaveLength(0);
    });

    it("should handle rhythm pattern beyond duration", () => {
      const system = createMelodySystem();
      const rhythmPattern = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const melody = system.generateMelody(4, rhythmPattern, 60);

      // Should stop at duration = 4
      expect(melody.length).toBeLessThan(rhythmPattern.length);
      melody.forEach((event) => {
        expect(event.time).toBeLessThan(4);
      });
    });

    it("should handle very high root pitch", () => {
      const system = createMelodySystem({
        registerConstraints: {
          constraintId: "reg-1",
          allowTransposition: false,
        },
      });

      const rhythmPattern = [0, 1];
      const melody = system.generateMelody(2, rhythmPattern, 120); // Very high

      // Should clamp to max MIDI
      melody.forEach((event) => {
        expect(event.pitch).toBeLessThanOrEqual(127);
      });
    });

    it("should handle very low root pitch", () => {
      const system = createMelodySystem({
        registerConstraints: {
          constraintId: "reg-1",
          allowTransposition: false,
        },
      });

      const rhythmPattern = [0, 1];
      const melody = system.generateMelody(2, rhythmPattern, 10); // Very low

      // Should clamp to min MIDI
      melody.forEach((event) => {
        expect(event.pitch).toBeGreaterThanOrEqual(0);
      });
    });

    it("should handle zero interval seed", () => {
      const system = createMelodySystem({
        intervalSeed: [0, 0, 0],
        cycleLength: 3,
      });

      const rhythmPattern = [0, 1, 2];
      const melody = system.generateMelody(3, rhythmPattern, 60);

      // All pitches should be same
      melody.forEach((event) => {
        expect(event.pitch).toBe(60);
      });
    });
  });

  describe("real-world melodies", () => {
    it("should generate diatonic major scale melody", () => {
      const system = createMelodySystem({
        intervalSeed: [2, 2, 1, 2, 2, 2, 1], // Major scale
        cycleLength: 7,
        contourConstraints: {
          constraintId: "contour-1",
          type: "ascending",
        },
        registerConstraints: {
          constraintId: "reg-1",
          minPitch: 60,
          maxPitch: 84,
          allowTransposition: true,
        },
      });

      const rhythmPattern = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
      const melody = system.generateMelody(4, rhythmPattern, 60);

      expect(melody).toHaveLength(8);
      // Should ascend through major scale
      expect(melody[0].pitch).toBe(60); // C
      expect(melody[1].pitch).toBe(62); // D
      expect(melody[2].pitch).toBe(64); // E
      expect(melody[7].pitch).toBeGreaterThanOrEqual(60); // Within register
    });

    it("should generate pentatonic melody", () => {
      const system = createMelodySystem({
        intervalSeed: [2, 3, 2, 2], // Minor pentatonic pattern
        cycleLength: 4,
        contourConstraints: {
          constraintId: "contour-1",
          type: "oscillating",
        },
      });

      const rhythmPattern = [0, 1, 2, 3, 4, 5, 6, 7];
      const melody = system.generateMelody(8, rhythmPattern, 60);

      expect(melody).toHaveLength(8);
      // Should use only pentatonic intervals
      for (let i = 1; i < melody.length; i++) {
        const interval = Math.abs(melody[i].pitch - melody[i - 1].pitch);
        expect([0, 2, 3, 4, 5, 7]).toContain(interval % 12);
      }
    });

    it("should generate arpeggiated melody", () => {
      const system = createMelodySystem({
        intervalSeed: [4, 3, 5], // Arpeggio pattern (major third, minor third, fourth)
        cycleLength: 3,
        expansionRules: [
          {
            ruleId: "exp-1",
            trigger: "periodic",
            multiplier: 2,
            period: 3,
          },
        ],
      });

      const rhythmPattern = [0, 1, 2, 3, 4, 5];
      const melody = system.generateMelody(6, rhythmPattern, 60);

      expect(melody).toHaveLength(6);
      expect(melody[0].pitch).toBe(60); // Root
      expect(melody[1].pitch).toBe(64); // Root + M3 (first interval)
    });
  });

  describe("determinism", () => {
    it("should generate identical melodies for same system", () => {
      const system = createMelodySystem();
      const rhythmPattern = [0, 1, 2, 3, 4, 5, 6, 7];

      const melody1 = system.generateMelody(8, rhythmPattern, 60);
      const melody2 = system.generateMelody(8, rhythmPattern, 60);

      expect(melody1).toEqual(melody2);
    });

    it("should generate different melodies for different systems", () => {
      const system1 = createMelodySystem({
        intervalSeed: [2, 2, 1],
        cycleLength: 3,
      });

      const system2 = createMelodySystem({
        intervalSeed: [1, 2, 2],
        cycleLength: 3,
      });

      const rhythmPattern = [0, 1, 2, 3];
      const melody1 = system1.generateMelody(4, rhythmPattern, 60);
      const melody2 = system2.generateMelody(4, rhythmPattern, 60);

      expect(melody1).not.toEqual(melody2);
    });
  });
});

describe("createMelodySystem", () => {
  it("should create system with unique ID", () => {
    const system1 = createMelodySystem();
    const system2 = createMelodySystem();

    expect(system1.systemId).toBeDefined();
    expect(system2.systemId).toBeDefined();
    expect(system1.systemId).not.toBe(system2.systemId);
  });

  it("should allow overriding interval seed", () => {
    const system = createMelodySystem({
      intervalSeed: [1, 2, 3, 4, 5],
    });

    expect(system.intervalSeed).toEqual([1, 2, 3, 4, 5]);
  });

  it("should allow overriding cycle length", () => {
    const system = createMelodySystem({
      cycleLength: 5,
    });

    expect(system.cycleLength).toBe(5);
  });

  it("should allow overriding rotation rule", () => {
    const system = createMelodySystem({
      rotationRule: {
        ruleId: "custom-rot",
        type: "random",
        interval: 5,
      },
    });

    expect(system.rotationRule.type).toBe("random");
    expect(system.rotationRule.interval).toBe(5);
  });

  it("should allow overriding contour constraints", () => {
    const system = createMelodySystem({
      contourConstraints: {
        constraintId: "custom-contour",
        type: "ascending",
        maxIntervalLeaps: 4,
      },
    });

    expect(system.contourConstraints.type).toBe("ascending");
    expect(system.contourConstraints.maxIntervalLeaps).toBe(4);
  });

  it("should allow overriding register constraints", () => {
    const system = createMelodySystem({
      registerConstraints: {
        constraintId: "custom-reg",
        minPitch: 48,
        maxPitch: 72,
        allowTransposition: false,
      },
    });

    expect(system.registerConstraints.minPitch).toBe(48);
    expect(system.registerConstraints.maxPitch).toBe(72);
    expect(system.registerConstraints.allowTransposition).toBe(false);
  });

  it("should allow overriding directional bias", () => {
    const system = createMelodySystem({
      directionalBias: 0.7,
    });

    expect(system.directionalBias).toBe(0.7);
  });
});
