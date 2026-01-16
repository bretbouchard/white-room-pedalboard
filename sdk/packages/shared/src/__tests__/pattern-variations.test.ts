/**
 * Tests for pattern variation and transformation system
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  // Rhythm variations
  applyRhythmAugmentation,
  applyRhythmDiminution,
  applyRhythmRetrograde,
  applyRhythmRotation,
  applyRhythmPermutation,
  applyRhythmFractioning,

  // Harmonic variations
  applyHarmonicReharmonization,
  applyHarmonicSubstitution,
  optimizeVoiceLeading,

  // Melodic transformations
  applyMelodicInversion,
  applyMelodicRetrograde,
  applyMelodicAugmentation,
  applyMelodicTransposition,

  // Complexity analysis
  calculatePatternComplexity,
  determineDifficultyLevel,

  // Types
  RhythmVariation,
  HarmonicVariation,
  MelodicTransformation,
  PatternComplexity,
  DifficultyLevel,
} from "../math/pattern-variations";

import { generateRhythmicResultant } from "../math/rhythmic-resultants";
import { generateHarmonicProgression } from "../math/harmonic-progressions";
import { generateMelodicContour } from "../math/melodic-contours";

describe("Pattern Variations", () => {
  // ============================================================================
  // RHYTHM VARIATIONS TESTS
  // ============================================================================

  describe("Rhythm Variations", () => {
    let testRhythm: any;

    beforeEach(() => {
      testRhythm = generateRhythmicResultant(3, 2);
    });

    describe("applyRhythmAugmentation", () => {
      it("should augment rhythm pattern by specified factor", () => {
        const result = applyRhythmAugmentation(testRhythm, 2);

        expect(result.type).toBe("augmentation");
        expect(result.pattern.length).toBe(testRhythm.pattern.length);
        expect(result.metadata.transformation_ratio).toBe(2);

        // Check that non-zero values are doubled
        result.pattern.forEach((value, index) => {
          if (testRhythm.pattern[index] > 0) {
            expect(value).toBe(testRhythm.pattern[index] * 2);
          }
        });
      });

      it("should handle fractional augmentation factors", () => {
        const result = applyRhythmAugmentation(testRhythm, 1.5);

        expect(result.type).toBe("augmentation");
        expect(result.metadata.transformation_ratio).toBe(1.5);
      });

      it("should throw error for invalid factors", () => {
        expect(() => applyRhythmAugmentation(testRhythm, 0)).toThrow();
        expect(() => applyRhythmAugmentation(testRhythm, -1)).toThrow();
      });
    });

    describe("applyRhythmDiminution", () => {
      it("should diminish rhythm pattern by specified factor", () => {
        const result = applyRhythmDiminution(testRhythm, 2);

        expect(result.type).toBe("diminution");
        expect(result.pattern.length).toBe(testRhythm.pattern.length);
        expect(result.metadata.transformation_ratio).toBe(0.5);
      });

      it("should filter out values below threshold", () => {
        const result = applyRhythmDiminution(testRhythm, 4);

        // Values less than 0.5 after division should become 0
        result.pattern.forEach((value, index) => {
          const originalValue = testRhythm.pattern[index];
          if (originalValue / 4 < 0.5) {
            expect(value).toBe(0);
          }
        });
      });
    });

    describe("applyRhythmRetrograde", () => {
      it("should reverse the rhythm pattern", () => {
        const result = applyRhythmRetrograde(testRhythm);

        expect(result.type).toBe("retrograde");
        expect(result.pattern.length).toBe(testRhythm.pattern.length);
        expect(result.pattern).toEqual([...testRhythm.pattern].reverse());
      });
    });

    describe("applyRhythmRotation", () => {
      it("should rotate pattern by specified steps", () => {
        const result = applyRhythmRotation(testRhythm, 1);

        expect(result.type).toBe("rotation");
        expect(result.pattern.length).toBe(testRhythm.pattern.length);
        expect(result.metadata.rotation_steps).toBe(1);

        // Check rotation correctness
        expect(result.pattern[0]).toBe(testRhythm.pattern[1]);
        expect(result.pattern[result.pattern.length - 1]).toBe(
          testRhythm.pattern[0],
        );
      });

      it("should handle negative rotation steps", () => {
        const result = applyRhythmRotation(testRhythm, -1);

        expect(result.type).toBe("rotation");
        expect(result.metadata.rotation_steps).toBe(
          testRhythm.pattern.length - 1,
        );
      });

      it("should handle rotation steps larger than pattern length", () => {
        const steps = testRhythm.pattern.length + 2;
        const result = applyRhythmRotation(testRhythm, steps);

        expect(result.metadata.rotation_steps).toBe(2);
      });
    });

    describe("applyRhythmPermutation", () => {
      it("should permute pattern according to provided order", () => {
        // Create order array that matches the actual pattern length
        const order = Array.from(
          { length: testRhythm.pattern.length },
          (_, i) => i,
        );
        // Shuffle the order to create a permutation
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }

        const result = applyRhythmPermutation(testRhythm, order);

        expect(result.type).toBe("permutation");
        expect(result.pattern.length).toBe(testRhythm.pattern.length);
        expect(result.metadata.permutation_order).toEqual(order);

        // Check that permutation was applied correctly
        result.pattern.forEach((value, index) => {
          expect(value).toBe(testRhythm.pattern[order[index]]);
        });
      });

      it("should generate random permutation if none provided", () => {
        const result = applyRhythmPermutation(testRhythm);

        expect(result.type).toBe("permutation");
        expect(result.pattern.length).toBe(testRhythm.pattern.length);
        expect(result.metadata.permutation_order).toHaveLength(
          testRhythm.pattern.length,
        );
      });

      it("should throw error for invalid permutation order", () => {
        const invalidOrder = [0, 1]; // Too short
        expect(() =>
          applyRhythmPermutation(testRhythm, invalidOrder),
        ).toThrow();
      });
    });

    describe("applyRhythmFractioning", () => {
      it("should subdivide active beats", () => {
        const result = applyRhythmFractioning(testRhythm, 2);

        expect(result.type).toBe("fractioning");
        expect(result.metadata.fraction_divisions).toBe(2);

        // Pattern should be longer due to subdivisions
        expect(result.pattern.length).toBeGreaterThan(
          testRhythm.pattern.length,
        );
      });

      it("should preserve rest values", () => {
        const result = applyRhythmFractioning(testRhythm, 3);

        // Check that rests are not subdivided
        let originalIndex = 0;
        let resultIndex = 0;

        while (
          originalIndex < testRhythm.pattern.length &&
          resultIndex < result.pattern.length
        ) {
          if (testRhythm.pattern[originalIndex] === 0) {
            expect(result.pattern[resultIndex]).toBe(0);
            originalIndex++;
            resultIndex++;
          } else {
            // Active beat should be subdivided
            const subdivisionValue = testRhythm.pattern[originalIndex] / 3;
            for (let i = 0; i < 3; i++) {
              expect(result.pattern[resultIndex + i]).toBeCloseTo(
                subdivisionValue,
              );
            }
            originalIndex++;
            resultIndex += 3;
          }
        }
      });

      it("should throw error for invalid division count", () => {
        expect(() => applyRhythmFractioning(testRhythm, 1)).toThrow();
        expect(() => applyRhythmFractioning(testRhythm, 0)).toThrow();
      });
    });
  });

  // ============================================================================
  // HARMONIC VARIATIONS TESTS
  // ============================================================================

  describe("Harmonic Variations", () => {
    let testHarmony: any;

    beforeEach(() => {
      testHarmony = generateHarmonicProgression(4, 3, {
        key: "C",
        scale: "major",
        complexity: "moderate",
      });
    });

    describe("applyHarmonicReharmonization", () => {
      it("should reharmonize chord progression", () => {
        const result = applyHarmonicReharmonization(testHarmony, 0.5);

        expect(result.type).toBe("reharmonization");
        expect(result.progression.chords.length).toBe(
          testHarmony.chords.length,
        );
        expect(result.progression.key).toBe(testHarmony.key);
        expect(result.metadata.reharmonizations).toBeDefined();
        expect(result.voice_leading).toBeDefined();
        expect(result.functionalanalysis).toBeDefined();
      });

      it("should respect intensity parameter", () => {
        const lowIntensity = applyHarmonicReharmonization(testHarmony, 0.1);
        const highIntensity = applyHarmonicReharmonization(testHarmony, 0.9);

        // Higher intensity should generally result in more changes
        expect(
          highIntensity.metadata.reharmonizations?.length || 0,
        ).toBeGreaterThanOrEqual(
          lowIntensity.metadata.reharmonizations?.length || 0,
        );
      });
    });

    describe("applyHarmonicSubstitution", () => {
      it("should apply tritone substitutions to dominant chords", () => {
        const result = applyHarmonicSubstitution(testHarmony, "tritone");

        expect(result.type).toBe("substitution");
        expect(result.progression.chords.length).toBe(
          testHarmony.chords.length,
        );
        expect(result.metadata.substitutions).toBeDefined();

        // Check that substitutions were applied to dominant functions
        result.metadata.substitutions?.forEach((sub) => {
          expect(sub.type).toBe("tritone");
          expect(sub.voice_leading_quality).toBeGreaterThanOrEqual(0);
          expect(sub.voice_leading_quality).toBeLessThanOrEqual(1);
        });
      });

      it("should calculate voice leading quality for substitutions", () => {
        const result = applyHarmonicSubstitution(testHarmony, "tritone");

        result.metadata.substitutions?.forEach((sub) => {
          expect(typeof sub.voice_leading_quality).toBe("number");
          expect(sub.voice_leading_quality).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe("optimizeVoiceLeading", () => {
      it("should improve voice leading quality", () => {
        const result = optimizeVoiceLeading(testHarmony);

        expect(result.type).toBe("voice_leading_optimization");
        expect(result.progression.chords.length).toBe(
          testHarmony.chords.length,
        );
        expect(result.metadata.voice_leading_improvements).toBeDefined();

        // Check that improvements show better movement
        result.metadata.voice_leading_improvements?.forEach((improvement) => {
          expect(improvement.improved_movement).toBeLessThanOrEqual(
            improvement.original_movement,
          );
          expect([
            "contrary_motion",
            "stepwise_motion",
            "voice_exchange",
            "suspension",
          ]).toContain(improvement.technique);
        });
      });
    });
  });

  // ============================================================================
  // MELODIC TRANSFORMATIONS TESTS
  // ============================================================================

  describe("Melodic Transformations", () => {
    let testMelody: any;

    beforeEach(() => {
      testMelody = generateMelodicContour(3, 2, {
        key: "C",
        scale: "major",
        range: [60, 72],
        length: 8,
      });
    });

    describe("applyMelodicInversion", () => {
      it("should invert melody around specified axis", () => {
        const axis = 66; // F#4
        const result = applyMelodicInversion(testMelody, axis);

        expect(result.type).toBe("inversion");
        expect(result.contour.notes.length).toBe(testMelody.notes.length);
        expect(result.metadata.transformation_parameters?.axis).toBe(axis);

        // Check inversion correctness
        result.contour.notes.forEach((note, index) => {
          const expectedNote = Math.round(2 * axis - testMelody.notes[index]);
          expect(note).toBe(expectedNote);
        });
      });

      it("should use calculated axis if none provided", () => {
        const result = applyMelodicInversion(testMelody);

        expect(result.type).toBe("inversion");
        expect(result.metadata.transformation_parameters?.axis).toBeDefined();

        const expectedAxis =
          (Math.max(...testMelody.notes) + Math.min(...testMelody.notes)) / 2;
        expect(result.metadata.transformation_parameters?.axis).toBeCloseTo(
          expectedAxis,
        );
      });

      it("should calculate contour preservation", () => {
        const result = applyMelodicInversion(testMelody);

        expect(result.metadata.contour_preservation).toBeGreaterThanOrEqual(0);
        expect(result.metadata.contour_preservation).toBeLessThanOrEqual(1);
      });
    });

    describe("applyMelodicRetrograde", () => {
      it("should reverse melody notes", () => {
        const result = applyMelodicRetrograde(testMelody);

        expect(result.type).toBe("retrograde");
        expect(result.contour.notes.length).toBe(testMelody.notes.length);
        expect(result.contour.notes).toEqual([...testMelody.notes].reverse());
      });

      it("should recalculate intervals for reversed melody", () => {
        const result = applyMelodicRetrograde(testMelody);

        expect(result.contour.intervals.length).toBe(
          testMelody.intervals.length,
        );

        // Check that intervals are recalculated correctly
        for (let i = 0; i < result.contour.intervals.length; i++) {
          const expectedInterval =
            result.contour.notes[i + 1] - result.contour.notes[i];
          expect(result.contour.intervals[i]).toBe(expectedInterval);
        }
      });
    });

    describe("applyMelodicAugmentation", () => {
      it("should expand intervals by specified factor", () => {
        const factor = 2;
        const result = applyMelodicAugmentation(testMelody, factor);

        expect(result.type).toBe("augmentation");
        expect(result.contour.notes.length).toBe(testMelody.notes.length);
        expect(result.metadata.transformation_parameters?.factor).toBe(factor);

        // First note should remain the same
        expect(result.contour.notes[0]).toBe(testMelody.notes[0]);

        // Check interval expansion
        for (let i = 0; i < result.contour.intervals.length; i++) {
          const expectedInterval = Math.round(testMelody.intervals[i] * factor);
          expect(result.contour.intervals[i]).toBe(expectedInterval);
        }
      });

      it("should throw error for invalid factors", () => {
        expect(() => applyMelodicAugmentation(testMelody, 0)).toThrow();
        expect(() => applyMelodicAugmentation(testMelody, -1)).toThrow();
      });
    });

    describe("applyMelodicTransposition", () => {
      it("should transpose all notes by specified semitones", () => {
        const semitones = 5;
        const result = applyMelodicTransposition(testMelody, semitones);

        expect(result.type).toBe("transposition");
        expect(result.contour.notes.length).toBe(testMelody.notes.length);
        expect(result.metadata.transformation_parameters?.semitones).toBe(
          semitones,
        );

        // Check transposition correctness
        result.contour.notes.forEach((note, index) => {
          expect(note).toBe(testMelody.notes[index] + semitones);
        });

        // Intervals should remain the same
        expect(result.contour.intervals).toEqual(testMelody.intervals);

        // Contour preservation should be perfect
        expect(result.metadata.contour_preservation).toBe(1.0);
      });

      it("should handle negative transposition", () => {
        const semitones = -7;
        const result = applyMelodicTransposition(testMelody, semitones);

        result.contour.notes.forEach((note, index) => {
          expect(note).toBe(testMelody.notes[index] + semitones);
        });
      });
    });
  });

  // ============================================================================
  // COMPLEXITY ANALYSIS TESTS
  // ============================================================================

  describe("Pattern Complexity Analysis", () => {
    describe("calculatePatternComplexity", () => {
      it("should calculate complexity for rhythm-only pattern", () => {
        const rhythm = generateRhythmicResultant(3, 2);
        const complexity = calculatePatternComplexity({
          rhythm: { pattern: rhythm.pattern },
          harmony: null,
          melody: null,
        });

        expect(complexity.overall).toBeGreaterThanOrEqual(0);
        expect(complexity.overall).toBeLessThanOrEqual(1);
        expect(complexity.rhythmic).toBeGreaterThan(0);
        expect(complexity.harmonic).toBe(0);
        expect(complexity.melodic).toBe(0);
        expect(complexity.factors).toBeDefined();
        expect(["beginner", "intermediate", "advanced", "expert"]).toContain(
          complexity.difficulty,
        );
      });

      it("should calculate complexity for harmony-only pattern", () => {
        const harmony = generateHarmonicProgression(4, 3);
        const complexity = calculatePatternComplexity({
          rhythm: null,
          harmony,
          melody: null,
        });

        expect(complexity.overall).toBeGreaterThanOrEqual(0);
        expect(complexity.overall).toBeLessThanOrEqual(1);
        expect(complexity.rhythmic).toBe(0);
        expect(complexity.harmonic).toBeGreaterThan(0);
        expect(complexity.melodic).toBe(0);
      });

      it("should calculate complexity for melody-only pattern", () => {
        const melody = generateMelodicContour(3, 2);
        const complexity = calculatePatternComplexity({
          rhythm: null,
          harmony: null,
          melody,
        });

        expect(complexity.overall).toBeGreaterThanOrEqual(0);
        expect(complexity.overall).toBeLessThanOrEqual(1);
        expect(complexity.rhythmic).toBe(0);
        expect(complexity.harmonic).toBe(0);
        expect(complexity.melodic).toBeGreaterThan(0);
      });

      it("should calculate complexity for combined patterns", () => {
        const rhythm = generateRhythmicResultant(3, 2);
        const harmony = generateHarmonicProgression(4, 3);
        const melody = generateMelodicContour(3, 2);

        const complexity = calculatePatternComplexity({
          rhythm: { pattern: rhythm.pattern },
          harmony,
          melody,
        });

        expect(complexity.overall).toBeGreaterThanOrEqual(0);
        expect(complexity.overall).toBeLessThanOrEqual(1);
        expect(complexity.rhythmic).toBeGreaterThan(0);
        expect(complexity.harmonic).toBeGreaterThan(0);
        expect(complexity.melodic).toBeGreaterThan(0);

        // Overall should be average of components
        const expectedOverall =
          (complexity.rhythmic + complexity.harmonic + complexity.melodic) / 3;
        expect(complexity.overall).toBeCloseTo(expectedOverall);
      });

      it("should include all complexity factors", () => {
        const rhythm = generateRhythmicResultant(5, 3);
        const complexity = calculatePatternComplexity({
          rhythm: { pattern: rhythm.pattern },
          harmony: null,
          melody: null,
        });

        expect(complexity.factors.density).toBeGreaterThanOrEqual(0);
        expect(complexity.factors.density).toBeLessThanOrEqual(1);
        expect(complexity.factors.syncopation).toBeGreaterThanOrEqual(0);
        expect(complexity.factors.syncopation).toBeLessThanOrEqual(1);
        expect(complexity.factors.pattern_length).toBeGreaterThanOrEqual(0);
        expect(complexity.factors.pattern_length).toBeLessThanOrEqual(1);
        expect(complexity.factors.unique_elements).toBeGreaterThanOrEqual(0);
        expect(complexity.factors.unique_elements).toBeLessThanOrEqual(1);
      });
    });

    describe("determineDifficultyLevel", () => {
      it("should return beginner for low complexity", () => {
        const factors = {
          density: 0.2,
          syncopation: 0.1,
          intervallic: 0.1,
          harmonic_tension: 0.1,
          voice_leading: 0.8,
          pattern_length: 0.2,
          unique_elements: 0.2,
        };

        const difficulty = determineDifficultyLevel(0.2, factors);
        expect(difficulty).toBe("beginner");
      });

      it("should return expert for high complexity", () => {
        const factors = {
          density: 0.9,
          syncopation: 0.8,
          intervallic: 0.9,
          harmonic_tension: 0.8,
          voice_leading: 0.3,
          pattern_length: 0.9,
          unique_elements: 0.9,
        };

        const difficulty = determineDifficultyLevel(0.8, factors);
        expect(difficulty).toBe("expert");
      });

      it("should return intermediate for moderate complexity", () => {
        const factors = {
          density: 0.5,
          syncopation: 0.4,
          intervallic: 0.4,
          harmonic_tension: 0.4,
          voice_leading: 0.6,
          pattern_length: 0.5,
          unique_elements: 0.5,
        };

        const difficulty = determineDifficultyLevel(0.4, factors);
        expect(difficulty).toBe("intermediate");
      });
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe("Integration Tests", () => {
    it("should maintain pattern integrity through multiple transformations", () => {
      const originalRhythm = generateRhythmicResultant(3, 2);

      // Apply multiple transformations
      const augmented = applyRhythmAugmentation(originalRhythm, 2);
      const rotated = applyRhythmRotation(originalRhythm, 1);
      const retrograde = applyRhythmRetrograde(originalRhythm);

      // All should maintain original length
      expect(augmented.original_length).toBe(originalRhythm.length);
      expect(rotated.original_length).toBe(originalRhythm.length);
      expect(retrograde.original_length).toBe(originalRhythm.length);

      // All should have complexity analysis
      expect(augmented.complexity).toBeDefined();
      expect(rotated.complexity).toBeDefined();
      expect(retrograde.complexity).toBeDefined();
    });

    it("should handle edge cases gracefully", () => {
      // Test with minimal patterns
      const minimalRhythm = {
        pattern: [1],
        length: 1,
        generators: { a: 1, b: 1 },
        complexity: 0,
        metadata: { accents: [], strongBeats: [], syncopation: 0, density: 1 },
      };

      expect(() => applyRhythmRetrograde(minimalRhythm)).not.toThrow();
      expect(() => applyRhythmRotation(minimalRhythm, 1)).not.toThrow();

      const result = applyRhythmRetrograde(minimalRhythm);
      expect(result.pattern).toEqual([1]);
    });

    it("should preserve musical relationships in transformations", () => {
      const melody = generateMelodicContour(3, 2, { length: 6 });

      // Transposition should preserve intervals exactly
      const transposed = applyMelodicTransposition(melody, 7);
      expect(transposed.contour.intervals).toEqual(melody.intervals);

      // Retrograde should preserve interval magnitudes but reverse directions
      const retrograde = applyMelodicRetrograde(melody);
      expect(retrograde.contour.intervals.length).toBe(melody.intervals.length);

      // Inversion should preserve interval magnitudes but invert directions
      const inverted = applyMelodicInversion(melody);
      expect(inverted.contour.intervals.length).toBe(melody.intervals.length);
    });
  });
});
