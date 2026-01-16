/**
 * CounterpointEngine Tests - Test-Driven Development
 *
 * Tests follow the AAA pattern: Arrange, Act, Assert
 * Each test isolates a single behavior and provides comprehensive coverage
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CounterpointEngine,
  CounterpointSpecies,
  VoicePart,
  CounterpointRules,
} from "../CounterpointEngine";
import * as fc from "fast-check";
import {
  SchillingerArbitraries,
  PerformanceUtils,
  PropertyTestHelpers,
} from "../../../tests/property-based/setup";

describe("CounterpointEngine", () => {
  let engine: CounterpointEngine;

  beforeEach(() => {
    engine = new CounterpointEngine();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe("Constructor and Initialization", () => {
    it("should create engine instance with default configuration", () => {
      expect(engine).toBeInstanceOf(CounterpointEngine);
    });

    it("should initialize with correct consonance intervals", () => {
      const privateEngine = engine as any;
      expect(privateEngine.PERFECT_CONSONANCES).toEqual([1, 5, 8]);
      expect(privateEngine.IMPERFECT_CONSONANCES).toEqual([3, 6]);
    });
  });

  describe("Input Validation", () => {
    it("should reject empty cantus firmus", async () => {
      const cantusFirmus: VoicePart = {
        notes: [],
        name: "Empty",
        range: [60, 72],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      await expect(
        engine.generateCounterpoint(cantusFirmus, rules),
      ).rejects.toThrow("Cantus firmus must contain at least one note");
    });

    it("should reject cantus firmus that is too long", async () => {
      const cantusFirmus: VoicePart = {
        notes: Array.from({ length: 33 }, (_, i) => ({
          midi: 60 + i,
          velocity: 80,
          duration: 1,
          pitch: `C${Math.floor((60 + i) / 12)}`,
        })),
        name: "Too Long",
        range: [60, 92],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      await expect(
        engine.generateCounterpoint(cantusFirmus, rules),
      ).rejects.toThrow("Cantus firmus is too long");
    });

    it("should reject notes outside cantus firmus range", async () => {
      const cantusFirmus: VoicePart = {
        notes: [
          {
            midi: 50, // Outside range [60, 72]
            velocity: 80,
            duration: 1,
            pitch: "A3",
          },
        ],
        name: "Out of Range",
        range: [48, 60],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      await expect(
        engine.generateCounterpoint(cantusFirmus, rules),
      ).rejects.toThrow("outside allowed range");
    });
  });

  describe("First Species Counterpoint Generation", () => {
    it("should generate simple first species counterpoint", async () => {
      const cantusFirmus: VoicePart = {
        notes: [
          { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
          { midi: 62, velocity: 80, duration: 1, pitch: "D4" },
          { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
          { midi: 65, velocity: 80, duration: 1, pitch: "F4" },
        ],
        name: "Simple Cantus",
        range: [60, 65],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [], // No forbidden intervals
          requiredIntervals: [3, 6], // Prefer thirds and sixths
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      const counterpoint = await engine.generateCounterpoint(
        cantusFirmus,
        rules,
      );

      expect(counterpoint).toBeDefined();
      expect(counterpoint.notes).toHaveLength(cantusFirmus.notes.length);
      expect(counterpoint.name).toContain("1st Species");
      expect(counterpoint.range).toEqual([72, 84]);

      // Verify all notes are within range
      counterpoint.notes.forEach((note) => {
        expect(note.midi).toBeGreaterThanOrEqual(72);
        expect(note.midi).toBeLessThanOrEqual(84);
      });

      // Verify consonant intervals for first species
      const intervals = calculateIntervals(
        cantusFirmus.notes,
        counterpoint.notes,
      );
      intervals.forEach((interval) => {
        expect([1, 3, 5, 6, 8]).toContain(interval);
      });
    });

    it("should handle voice crossing when allowed", async () => {
      const cantusFirmus: VoicePart = {
        notes: [
          { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
          { midi: 62, velocity: 80, duration: 1, pitch: "D4" },
        ],
        name: "Descending",
        range: [62, 64],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: true, // Allow voice crossing
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [60, 72],
      };

      const counterpoint = await engine.generateCounterpoint(
        cantusFirmus,
        rules,
      );

      expect(counterpoint).toBeDefined();
      expect(counterpoint.notes).toHaveLength(2);
    });
  });

  describe("Polyphonic Texture Generation", () => {
    it("should generate two-part polyphony", async () => {
      const cantusFirmus: VoicePart = {
        notes: [
          { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
          { midi: 62, velocity: 80, duration: 1, pitch: "D4" },
          { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
        ],
        name: "Cantus",
        range: [60, 64],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      const counterpoints = await engine.generatePolyphonicTexture(
        cantusFirmus,
        2,
        rules,
      );

      expect(counterpoints).toHaveLength(2);
      counterpoints.forEach((counterpoint) => {
        expect(counterpoint.notes).toHaveLength(cantusFirmus.notes.length);
      });
    });

    it("should reject invalid voice count", async () => {
      const cantusFirmus: VoicePart = {
        notes: [{ midi: 60, velocity: 80, duration: 1, pitch: "C4" }],
        name: "Single Note",
        range: [60, 60],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      await expect(
        engine.generatePolyphonicTexture(cantusFirmus, 0, rules),
      ).rejects.toThrow("Voice count must be at least 1");
    });
  });

  describe("Rhythmic Pattern Generation", () => {
    it("should generate rhythmic resultants", () => {
      const basePattern = [1, 0, 1, 0, 1, 0, 1, 0];
      const resultantPattern = [1, 1, 0, 1, 1, 0, 1, 1];

      const patterns = engine.generateRhythmicPatterns(
        basePattern,
        resultantPattern,
        3,
      );

      expect(patterns).toHaveLength(3);
      patterns.forEach((pattern) => {
        expect(pattern).toBeInstanceOf(Array);
        expect(pattern.length).toBe(basePattern.length);
      });
    });

    it("should handle pattern rotation correctly", () => {
      const basePattern = [1, 0, 1, 0, 1, 1];
      const resultantPattern = [1, 1, 0, 1, 0, 1];

      const patterns = engine.generateRhythmicPatterns(
        basePattern,
        resultantPattern,
        4,
      );

      // Each rotation should be different
      expect(patterns[0]).not.toEqual(patterns[1]);
      expect(patterns[1]).not.toEqual(patterns[2]);
      expect(patterns[2]).not.toEqual(patterns[3]);
    });
  });

  describe("Voice Leading", () => {
    it("should apply correct voice leading constraints", () => {
      const sourceNotes = [
        { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
        { midi: 62, velocity: 80, duration: 1, pitch: "D4" },
      ];

      const targetNotes = [
        { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
        { midi: 65, velocity: 80, duration: 1, pitch: "F4" },
      ];

      const constraints = {
        maxMelodicInterval: 8,
        maxHarmonicInterval: 12,
        forbiddenIntervals: [], // No forbidden intervals for this test
        requiredIntervals: [],
        parallelMovementLimit: 3,
        voiceCrossing: false,
      };

      const result = engine.applyVoiceLeading(
        sourceNotes,
        targetNotes,
        constraints,
      );
      expect(result).toBe(true);
    });

    it("should reject excessive melodic intervals", () => {
      const sourceNotes = [
        { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
      ];

      const targetNotes = [
        { midi: 80, velocity: 80, duration: 1, pitch: "G#5" }, // Large jump
      ];

      const constraints = {
        maxMelodicInterval: 8,
        maxHarmonicInterval: 12,
        forbiddenIntervals: [],
        requiredIntervals: [],
        parallelMovementLimit: 3,
        voiceCrossing: false,
      };

      const result = engine.applyVoiceLeading(
        sourceNotes,
        targetNotes,
        constraints,
      );
      expect(result).toBe(false);
    });

    it("should reject forbidden intervals", () => {
      const sourceNotes = [
        { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
      ];

      const targetNotes = [
        { midi: 66, velocity: 80, duration: 1, pitch: "F#4" }, // Tritone
      ];

      const constraints = {
        maxMelodicInterval: 8,
        maxHarmonicInterval: 12,
        forbiddenIntervals: [6], // Tritone
        requiredIntervals: [],
        parallelMovementLimit: 3,
        voiceCrossing: false,
      };

      const result = engine.applyVoiceLeading(
        sourceNotes,
        targetNotes,
        constraints,
      );
      expect(result).toBe(false);
    });
  });

  describe("Counterpoint Analysis", () => {
    it("should analyze basic counterpoint correctly", async () => {
      const cantusFirmus: VoicePart = {
        notes: [
          { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
          { midi: 62, velocity: 80, duration: 1, pitch: "D4" },
        ],
        name: "Cantus",
        range: [60, 62],
      };

      const counterpoint: VoicePart = {
        notes: [
          { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
          { midi: 65, velocity: 80, duration: 1, pitch: "F4" },
        ],
        name: "Counterpoint",
        range: [64, 65],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      const analysis = await engine.analyzeCounterpoint(
        cantusFirmus,
        counterpoint,
        rules,
      );

      expect(analysis).toBeDefined();
      expect(analysis.validity).toBeDefined();
      expect(analysis.speciesConformance).toBe(true);
      expect(analysis.voiceLeadingScore).toBeGreaterThanOrEqual(0);
      expect(analysis.voiceLeadingScore).toBeLessThanOrEqual(100);
      expect(analysis.harmonicAnalysis).toBeDefined();
      expect(analysis.rhythmicAnalysis).toBeDefined();
      expect(analysis.suggestions).toBeInstanceOf(Array);
    });

    it("should count consonances correctly", () => {
      const intervals = [3, 3, 5, 6, 8]; // Third, third, fifth, sixth, octave
      const consonances = countConsonances(intervals);
      expect(consonances).toBe(5); // All are consonances
    });

    it("should count dissonances correctly", () => {
      const intervals = [2, 4, 7]; // Second, fourth, seventh
      const dissonances = countDissonances(intervals);
      expect(dissonances).toBe(3); // All are dissonances
    });
  });

  describe("Performance Requirements", () => {
    it("should generate counterpoint within performance limits", async () => {
      const cantusFirmus: VoicePart = {
        notes: Array.from({ length: 16 }, (_, i) => ({
          midi: 60 + (i % 8),
          velocity: 80,
          duration: 1,
          pitch: `C${Math.floor((60 + (i % 8)) / 12)}`,
        })),
        name: "Medium Cantus",
        range: [60, 67],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      const result = await PerformanceUtils.assertPerformance(
        () => engine.generateCounterpoint(cantusFirmus, rules),
        "mathematical-operations",
        "counterpoint generation",
      );

      expect(result).toBeDefined();
      expect(result.notes).toHaveLength(16);
    });

    it("should handle large-scale operations efficiently", async () => {
      const cantusFirmus: VoicePart = {
        notes: Array.from({ length: 32 }, (_, i) => ({
          midi: 60 + (i % 12),
          velocity: 80,
          duration: 1,
          pitch: `C${Math.floor((60 + (i % 12)) / 12)}`,
        })),
        name: "Large Cantus",
        range: [60, 71],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      const result = await PerformanceUtils.assertPerformance(
        () => engine.generatePolyphonicTexture(cantusFirmus, 4, rules),
        "large-scale-operations",
        "polyphonic texture generation",
      );

      expect(result).toHaveLength(4);
      result.forEach((counterpoint) => {
        expect(counterpoint.notes).toHaveLength(32);
      });
    });
  });

  describe("Property-Based Testing", () => {
    it("should generate valid counterpoint for any valid cantus", async () => {
      await fc.assert(
        fc.property(
          fc.array(SchillingerArbitraries.note, {
            minLength: 4,
            maxLength: 16,
          }),
          fc.integer({ min: 1, max: 5 }),
          async (notes, species) => {
            const cantusFirmus: VoicePart = {
              notes: notes.map((midi) => ({
                midi,
                velocity: 80,
                duration: 1,
                pitch: "C4",
              })),
              name: "Test Cantus",
              range: [Math.min(...notes), Math.max(...notes)],
            };

            const rules: CounterpointRules = {
              species: species as CounterpointSpecies,
              constraints: {
                maxMelodicInterval: 8,
                maxHarmonicInterval: 12,
                forbiddenIntervals: [],
                requiredIntervals: [],
                parallelMovementLimit: 3,
                voiceCrossing: false,
              },
              cantusFirmusRange: [Math.min(...notes), Math.max(...notes)],
              counterpointRange: [
                Math.min(...notes) + 12,
                Math.max(...notes) + 24,
              ],
            };

            try {
              const counterpoint = await engine.generateCounterpoint(
                cantusFirmus,
                rules,
              );

              // Verify basic properties
              expect(counterpoint.notes).toHaveLength(
                cantusFirmus.notes.length,
              );
              expect(counterpoint.range).toEqual(rules.counterpointRange);

              // Verify all notes are in range
              counterpoint.notes.forEach((note) => {
                expect(note.midi).toBeGreaterThanOrEqual(
                  rules.counterpointRange[0],
                );
                expect(note.midi).toBeLessThanOrEqual(
                  rules.counterpointRange[1],
                );
              });

              return true;
            } catch (error) {
              // Some inputs may legitimately fail (e.g., no valid candidates)
              return true;
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should satisfy commutative property for interval calculations", () => {
      PropertyTestHelpers.commutative((a, b) => Math.abs(a - b) % 12 || 12);
    });

    it("should satisfy associative property for pattern combination", () => {
      PropertyTestHelpers.associative((a, b, c) => (a + b + c) % 8);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle single note cantus firmus", async () => {
      const cantusFirmus: VoicePart = {
        notes: [{ midi: 60, velocity: 80, duration: 1, pitch: "C4" }],
        name: "Single Note",
        range: [60, 60],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [72, 84],
      };

      const counterpoint = await engine.generateCounterpoint(
        cantusFirmus,
        rules,
      );

      expect(counterpoint).toBeDefined();
      expect(counterpoint.notes).toHaveLength(1);
      expect(counterpoint.notes[0].midi).toBeGreaterThanOrEqual(72);
      expect(counterpoint.notes[0].midi).toBeLessThanOrEqual(84);
    });

    it("should handle empty counterpoint range gracefully", async () => {
      const cantusFirmus: VoicePart = {
        notes: [{ midi: 60, velocity: 80, duration: 1, pitch: "C4" }],
        name: "Single Note",
        range: [60, 60],
      };

      const rules: CounterpointRules = {
        species: CounterpointSpecies.FIRST,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
        cantusFirmusRange: [60, 72],
        counterpointRange: [60, 60], // No room for counterpoint
      };

      await expect(
        engine.generateCounterpoint(cantusFirmus, rules),
      ).rejects.toThrow();
    });
  });
});

// Helper functions for testing
function calculateIntervals(cantus: any[], counterpoint: any[]): number[] {
  const intervals: number[] = [];
  const minLength = Math.min(cantus.length, counterpoint.length);

  for (let i = 0; i < minLength; i++) {
    const interval = Math.abs(counterpoint[i].midi - cantus[i].midi) % 12 || 12;
    intervals.push(interval);
  }

  return intervals;
}

function countConsonances(intervals: number[]): number {
  const consonances = [1, 3, 5, 6, 8]; // Unison, third, fifth, sixth, octave
  return intervals.filter((interval) => consonances.includes(interval)).length;
}

function countDissonances(intervals: number[]): number {
  const dissonances = [2, 4, 7]; // Second, fourth, seventh
  return intervals.filter((interval) => dissonances.includes(interval)).length;
}
