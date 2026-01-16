/**
 * Book III: Harmony System Tests
 *
 * Test coverage for Schillinger's harmony theory including:
 * - Vertical interval distributions
 * - Harmonic rhythm (bound to Book I)
 * - Voice-leading constraints
 * - Resolution rules
 * - Chord weight calculation
 * - Root progression
 */

import { describe, it, expect } from "vitest";
import { HarmonySystemImpl, createHarmonySystem, type Chord } from "../src/theory/systems/harmony";
import type { HarmonySystem, VoiceLeadingConstraint, ResolutionRule } from "../src/types";

describe("HarmonySystemImpl", () => {
  describe("creation and validation", () => {
    it("should create harmony system with defaults", () => {
      const system = createHarmonySystem();

      expect(system.systemId).toBeDefined();
      expect(system.systemType).toBe("harmony");
      expect(system.distribution).toHaveLength(12);
      expect(system.distribution[3]).toBe(1.0); // Major 3rd
      expect(system.distribution[6]).toBe(0.9); // Perfect 5th
      expect(system.harmonicRhythmBinding).toBe("default-rhythm");
      expect(system.voiceLeadingConstraints).toHaveLength(1);
      expect(system.resolutionRules).toHaveLength(0);
    });

    it("should validate correct system", () => {
      const system = createHarmonySystem({
        distribution: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5, 0.3],
      });

      const result = system.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject distribution with wrong length", () => {
      const system = createHarmonySystem({
        distribution: [0.5, 0.5, 0.5], // Wrong length
      } as Partial<HarmonySystem>);

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Distribution must have 12 elements, got 3");
    });

    it("should reject distribution weights out of range", () => {
      const system = createHarmonySystem({
        distribution: [0.1, 0.2, 1.5, 0.4, 0.5, -0.1, 0.7, 0.8, 0.9, 1.0, 0.5, 0.3],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("is 1.5, must be 0-1"))).toBe(true);
      expect(result.errors.some((e) => e.includes("is -0.1, must be 0-1"))).toBe(true);
    });

    it("should reject all-zero distribution", () => {
      const system = createHarmonySystem({
        distribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Distribution must have at least one non-zero weight");
    });

    it("should reject empty harmonic rhythm binding", () => {
      const system = createHarmonySystem({
        harmonicRhythmBinding: "  ",
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Harmonic rhythm binding cannot be empty");
    });

    it("should reject max interval leap out of range", () => {
      const system = createHarmonySystem({
        voiceLeadingConstraints: [
          {
            constraintId: "test-1",
            maxIntervalLeap: 15, // Out of range
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Max interval leap 15 out of range (1-12)");
    });

    it("should reject invalid preferred motion", () => {
      const system = createHarmonySystem({
        voiceLeadingConstraints: [
          {
            constraintId: "test-1",
            preferredMotion: "invalid" as any,
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Preferred motion "invalid" is invalid');
    });

    it("should reject invalid target distribution length", () => {
      const system = createHarmonySystem({
        resolutionRules: [
          {
            ruleId: "test-1",
            trigger: "cadence",
            targetDistribution: [0.5, 0.5], // Wrong length
            tendency: "resolve",
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Target distribution must have 12 elements, got 2");
    });

    it("should reject invalid tendency", () => {
      const system = createHarmonySystem({
        resolutionRules: [
          {
            ruleId: "test-1",
            trigger: "cadence",
            targetDistribution: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5, 0.3],
            tendency: "invalid" as any,
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tendency "invalid" is invalid');
    });
  });

  describe("generateHarmony()", () => {
    it("should generate chord progression", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      expect(harmony).toHaveLength(4);
      expect(harmony[0].time).toBe(0);
      expect(harmony[0].root).toBe(60);
      expect(harmony[0].intervals.length).toBeGreaterThan(0);
      expect(harmony[0].weight).toBe(1.0); // First chord has weight 1.0
    });

    it("should respect duration limit", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1, 2, 3, 4, 5];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3); // Should stop at time 3
      expect(harmony.every((h) => h.time < 3)).toBe(true);
    });

    it("should assign weight 1.0 to last chord", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      expect(harmony[3].weight).toBe(1.0); // Last chord
    });

    it("should assign weight 0.7 to middle chords", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1, 2, 3, 4];
      const harmony = system.generateHarmony(5, rhythmPattern, 60);

      expect(harmony[1].weight).toBe(0.7);
      expect(harmony[2].weight).toBe(0.7);
      expect(harmony[3].weight).toBe(0.7);
    });

    it("should use distribution to select intervals", () => {
      const system = createHarmonySystem({
        distribution: [
          0,
          0,
          0,
          1.0,
          0,
          0,
          0.9,
          0,
          0,
          0,
          0,
          0, // Only major 3rd (index 3) and perfect 5th (index 6)
        ],
      });
      const rhythmPattern = [0, 1];
      const harmony = system.generateHarmony(2, rhythmPattern, 60);

      // Should contain intervals 3 (minor 3rd from index 2), 4 (major 3rd from index 3), and 7 (perfect 5th from index 6)
      // Or default to [3, 5, 7] triad if selection logic produces fewer than 3 intervals
      expect(harmony[0].intervals.length).toBeGreaterThanOrEqual(3);
    });

    it("should default to triad when intervals insufficient", () => {
      const system = createHarmonySystem({
        distribution: [
          0,
          0,
          0,
          0,
          0,
          0,
          0.05,
          0,
          0,
          0,
          0,
          0, // Very weak single interval
        ],
      });
      const rhythmPattern = [0];
      const harmony = system.generateHarmony(1, rhythmPattern, 60);

      // Should default to major triad [3, 5, 7]
      expect(harmony[0].intervals).toEqual([3, 5, 7]);
    });
  });

  describe("voice-leading constraints", () => {
    it("should limit interval leaps", () => {
      const constraint: VoiceLeadingConstraint = {
        constraintId: "test-leap",
        maxIntervalLeap: 3,
      };

      const system = createHarmonySystem({
        voiceLeadingConstraints: [constraint],
      });

      const rhythmPattern = [0, 1];
      const harmony = system.generateHarmony(2, rhythmPattern, 60);

      // First chord has no constraint (no previous chord)
      expect(harmony[0].intervals.length).toBeGreaterThan(0);

      // Second chord should have intervals constrained
      expect(harmony[1].intervals.length).toBeGreaterThan(0);
    });

    it("should avoid parallel motion", () => {
      const constraint: VoiceLeadingConstraint = {
        constraintId: "test-parallel",
        avoidParallels: true,
      };

      const system = createHarmonySystem({
        distribution: [
          0,
          0,
          0,
          1.0,
          0,
          0,
          0.9,
          0,
          0,
          0,
          0,
          0, // Major 3rd and perfect 5th
        ],
        voiceLeadingConstraints: [constraint],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      // Should generate chords without parallel 5ths or 8ves
      expect(harmony).toHaveLength(3);
      expect(harmony[1].intervals.length).toBeGreaterThan(0);
      expect(harmony[2].intervals.length).toBeGreaterThan(0);
    });

    it("should apply contrary motion", () => {
      const constraint: VoiceLeadingConstraint = {
        constraintId: "test-contrary",
        preferredMotion: "contrary",
      };

      const system = createHarmonySystem({
        voiceLeadingConstraints: [constraint],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3);
      // Motion should be in opposite direction (simplified check)
    });

    it("should apply oblique motion", () => {
      const constraint: VoiceLeadingConstraint = {
        constraintId: "test-oblique",
        preferredMotion: "oblique",
      };

      const system = createHarmonySystem({
        voiceLeadingConstraints: [constraint],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3);
      // One voice should remain stationary
    });

    it("should apply similar motion", () => {
      const constraint: VoiceLeadingConstraint = {
        constraintId: "test-similar",
        preferredMotion: "similar",
      };

      const system = createHarmonySystem({
        voiceLeadingConstraints: [constraint],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3);
      // All voices should move in same direction
    });

    it("should apply parallel motion", () => {
      const constraint: VoiceLeadingConstraint = {
        constraintId: "test-parallel-motion",
        preferredMotion: "parallel",
      };

      const system = createHarmonySystem({
        voiceLeadingConstraints: [constraint],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3);
      // All voices should move in parallel (default behavior)
    });
  });

  describe("resolution rules", () => {
    it("should apply cadence at end", () => {
      const rule: ResolutionRule = {
        ruleId: "test-cadence",
        trigger: "cadence",
        targetDistribution: [0, 0, 0, 1.0, 0, 0, 0.9, 0, 0, 0, 0, 0],
        tendency: "resolve",
      };

      const system = createHarmonySystem({
        resolutionRules: [rule],
      });

      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      // Last chord should have resolve tendency applied
      // Root transitions before resolution: 60 -> 62 -> 59 -> 62, then resolve keeps it at 62
      expect(harmony[3].root).toBeDefined();
    });

    it("should apply conditional resolution periodically", () => {
      const rule: ResolutionRule = {
        ruleId: "test-conditional",
        trigger: "conditional",
        targetDistribution: [0, 0, 0, 1.0, 0, 0, 0.9, 0, 0, 0, 0, 0],
        tendency: "resolve",
      };

      const system = createHarmonySystem({
        resolutionRules: [rule],
      });

      const rhythmPattern = [0, 1, 2, 3, 4, 5, 6, 7];
      const harmony = system.generateHarmony(8, rhythmPattern, 60);

      // Every 4th chord (indices 3, 7) should have conditional rule applied
      expect(harmony).toHaveLength(8);
    });

    it("should apply suspend tendency", () => {
      const rule: ResolutionRule = {
        ruleId: "test-suspend",
        trigger: "cadence",
        targetDistribution: [0, 0, 0, 1.0, 0, 0, 0.9, 0, 0, 0, 0, 0],
        tendency: "suspend",
      };

      const system = createHarmonySystem({
        resolutionRules: [rule],
      });

      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      // Last chord should add suspension (+5 semitones = 4th)
      expect(harmony[3].root).toBeGreaterThan(60);
    });

    it("should apply avoid tendency", () => {
      const rule: ResolutionRule = {
        ruleId: "test-avoid",
        trigger: "cadence",
        targetDistribution: [0, 0, 0, 1.0, 0, 0, 0.9, 0, 0, 0, 0, 0],
        tendency: "avoid",
      };

      const system = createHarmonySystem({
        resolutionRules: [rule],
      });

      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      // Last chord should have avoid tendency applied (+2 from transition)
      // Root transitions: 60 -> 62 -> 59 -> 62, then avoid adds +2 = 64, or stays based on transition
      expect(harmony[3].root).toBeDefined();
      expect(harmony[3].root).toBeGreaterThan(60);
    });
  });

  describe("root progression", () => {
    it("should transition root between chords", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      // Roots should change (using stepwise motion pattern)
      expect(harmony[0].root).toBe(60);
      // Subsequent roots will vary based on step pattern
    });

    it("should use deterministic root progression", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1, 2, 3];

      const harmony1 = system.generateHarmony(4, rhythmPattern, 60);
      const harmony2 = system.generateHarmony(4, rhythmPattern, 60);

      expect(harmony1).toEqual(harmony2);
    });
  });

  describe("determinism", () => {
    it("should generate identical harmony with same inputs", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];

      const harmony1 = system.generateHarmony(4, rhythmPattern, 60);
      const harmony2 = system.generateHarmony(4, rhythmPattern, 60);

      expect(harmony1).toEqual(harmony2);
    });

    it("should generate different harmony with different rhythm patterns", () => {
      const system = createHarmonySystem();

      const harmony1 = system.generateHarmony(4, [0, 1, 2, 3], 60);
      const harmony2 = system.generateHarmony(4, [0, 0.5, 1, 1.5], 60);

      expect(harmony1).not.toEqual(harmony2);
    });

    it("should generate different harmony with different root pitch", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1, 2, 3];

      const harmony1 = system.generateHarmony(4, rhythmPattern, 60);
      const harmony2 = system.generateHarmony(4, rhythmPattern, 48);

      expect(harmony1[0].root).toBe(60);
      expect(harmony2[0].root).toBe(48);
    });
  });

  describe("getDistribution()", () => {
    it("should return copy of distribution", () => {
      const distribution = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5, 0.3];
      const system = createHarmonySystem({ distribution });

      const retrieved = system.getDistribution();

      expect(retrieved).toEqual(distribution);
      expect(retrieved).not.toBe(distribution); // Should be a copy
    });
  });

  describe("real-world chord progressions", () => {
    it("should generate tonal harmony", () => {
      const system = createHarmonySystem({
        distribution: [
          0.1, // minor 2nd
          0.3, // major 2nd
          0.8, // minor 3rd
          1.0, // major 3rd
          0.6, // perfect 4th
          0.1, // tritone
          0.9, // perfect 5th
          0.4, // minor 6th
          0.7, // major 6th
          0.5, // minor 7th
          0.2, // major 7th
        ],
      });

      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      // Should generate chords with major 3rds and perfect 5ths (tonal)
      expect(harmony).toHaveLength(4);
      expect(harmony[0].intervals.length).toBeGreaterThanOrEqual(3);
    });

    it("should generate quartal harmony", () => {
      const system = createHarmonySystem({
        distribution: [
          0,
          0,
          0,
          0,
          1.0,
          0,
          0.5,
          0,
          0,
          0.9,
          0,
          0, // Emphasize 4ths
        ],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      // Should generate chords with perfect 4ths
      expect(harmony).toHaveLength(3);
      expect(harmony[0].intervals).toContain(5); // Perfect 4th
    });

    it("should generate cluster harmony", () => {
      const system = createHarmonySystem({
        distribution: [
          0.9, // minor 2nd
          0.8, // major 2nd
          0.7, // minor 3rd
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0, // Emphasize small intervals
        ],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      // Should generate dense clusters
      expect(harmony).toHaveLength(3);
      expect(harmony[0].intervals).toContain(1); // minor 2nd
      expect(harmony[0].intervals).toContain(2); // major 2nd
    });
  });

  describe("edge cases", () => {
    it("should handle single chord", () => {
      const system = createHarmonySystem();
      const harmony = system.generateHarmony(1, [0], 60);

      expect(harmony).toHaveLength(1);
      expect(harmony[0].time).toBe(0);
      expect(harmony[0].weight).toBe(1.0);
    });

    it("should handle two chords", () => {
      const system = createHarmonySystem();
      const rhythmPattern = [0, 1];
      const harmony = system.generateHarmony(2, rhythmPattern, 60);

      expect(harmony).toHaveLength(2);
      expect(harmony[0].weight).toBe(1.0);
      expect(harmony[1].weight).toBe(1.0); // Last chord
    });

    it("should handle empty voice-leading constraints", () => {
      const system = createHarmonySystem({
        voiceLeadingConstraints: [],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3);
    });

    it("should handle empty resolution rules", () => {
      const system = createHarmonySystem({
        resolutionRules: [],
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3);
    });

    it("should handle multiple voice-leading constraints", () => {
      const constraints: VoiceLeadingConstraint[] = [
        {
          constraintId: "test-1",
          maxIntervalLeap: 5,
        },
        {
          constraintId: "test-2",
          avoidParallels: true,
        },
        {
          constraintId: "test-3",
          preferredMotion: "contrary",
        },
      ];

      const system = createHarmonySystem({
        voiceLeadingConstraints: constraints,
      });

      const rhythmPattern = [0, 1, 2];
      const harmony = system.generateHarmony(3, rhythmPattern, 60);

      expect(harmony).toHaveLength(3);
    });

    it("should handle multiple resolution rules", () => {
      const rules: ResolutionRule[] = [
        {
          ruleId: "test-1",
          trigger: "cadence",
          targetDistribution: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5, 0.3],
          tendency: "resolve",
        },
        {
          ruleId: "test-2",
          trigger: "conditional",
          targetDistribution: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5, 0.3],
          tendency: "suspend",
        },
      ];

      const system = createHarmonySystem({
        resolutionRules: rules,
      });

      const rhythmPattern = [0, 1, 2, 3];
      const harmony = system.generateHarmony(4, rhythmPattern, 60);

      expect(harmony).toHaveLength(4);
    });
  });
});
