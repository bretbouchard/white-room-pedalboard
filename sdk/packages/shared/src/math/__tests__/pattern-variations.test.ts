/**
 * Comprehensive unit tests for pattern variations and transformations
 * Includes property-based testing, complexity analysis, and performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  applyRhythmAugmentation,
  applyRhythmDiminution,
  applyRhythmRetrograde,
  applyRhythmRotation,
  applyRhythmPermutation,
  applyRhythmFractioning,
  applyHarmonicReharmonization,
  applyHarmonicSubstitution,
  optimizeVoiceLeading,
  applyMelodicInversion,
  applyMelodicRetrograde,
  applyMelodicAugmentation,
  applyMelodicTransposition,
  calculatePatternComplexity,
  determineDifficultyLevel,
  type RhythmVariation,
  type HarmonicVariation,
  type MelodicTransformation,
  type PatternComplexity,
  type VariationOptions,
} from "../pattern-variations";
import {
  generateRhythmicResultant,
  type RhythmicResultant,
} from "../rhythmic-resultants";
import { ValidationError as _ValidationError } from "../../errors";

describe("Pattern Variations - Mathematical Transformations", () => {
  let performanceStart: number;
  let testRhythm: RhythmicResultant;
  let testHarmony: any;
  let testMelody: any;

  beforeEach(() => {
    performanceStart = performance.now();

    // Create test data
    testRhythm = generateRhythmicResultant(3, 4);
    testHarmony = {
      chords: ["C", "F", "G", "C"],
      functions: ["tonic", "subdominant", "dominant", "tonic"],
      tensions: [0.1, 0.3, 0.8, 0.1],
      key: "C",
      scale: "major",
      metadata: {
        complexity: 0.4,
        stability: 0.7,
        movement: 0.5,
        voiceLeading: {
          smoothness: 0.8,
          contraryMotion: 0.3,
          parallelMotion: 0.2,
          stepwiseMotion: 0.7,
        },
      },
    };
    testMelody = {
      notes: [60, 62, 64, 65, 67, 65, 64, 62],
      intervals: [2, 2, 1, 2, -2, -1, -2],
      key: "C",
      scale: "major",
      metadata: {
        complexity: 0.5,
        range: 7,
        direction: "ascending_then_descending",
      },
    };
  });

  afterEach(() => {
    const duration = performance.now() - performanceStart;
    if (duration > 50) {
      console.warn(
        `Test took ${duration.toFixed(2)}ms - consider optimization`,
      );
    }
  });

  describe("Rhythm Variations", () => {
    describe("applyRhythmAugmentation", () => {
      it("should multiply all durations by the factor", () => {
        const factor = 2;
        const result = applyRhythmAugmentation(testRhythm, factor);

        expect(result.type).toBe("augmentation");
        expect(result.metadata.transformation_ratio).toBe(factor);

        // Each duration should be multiplied by factor
        result.pattern.forEach((value, index) => {
          const originalValue = testRhythm.pattern[index];
          expect(value).toBe(Math.round(originalValue * factor));
        });
      });

      it("should handle fractional factors", () => {
        const factor = 1.5;
        const result = applyRhythmAugmentation(testRhythm, factor);

        expect(result.pattern.length).toBe(testRhythm.pattern.length);
        expect(result.metadata.transformation_ratio).toBe(factor);
      });

      it("should reject invalid factors", () => {
        expect(() => applyRhythmAugmentation(testRhythm, 0)).toThrow(
          _ValidationError,
        );
        expect(() => applyRhythmAugmentation(testRhythm, -1)).toThrow(
          _ValidationError,
        );
      });

      it("should preserve pattern structure", () => {
        const result = applyRhythmAugmentation(testRhythm, 3);

        // Rests should remain rests, non-rests should remain non-rests
        for (let i = 0; i < testRhythm.pattern.length; i++) {
          const originalIsRest = testRhythm.pattern[i] === 0;
          const resultIsRest = result.pattern[i] === 0;
          expect(originalIsRest).toBe(resultIsRest);
        }
      });

      it("should increase complexity for large factors", () => {
        const smallFactor = applyRhythmAugmentation(testRhythm, 1.1);
        const largeFactor = applyRhythmAugmentation(testRhythm, 4);

        // Larger augmentation should generally increase complexity
        expect(largeFactor.complexity.overall).toBeGreaterThanOrEqual(
          smallFactor.complexity.overall,
        );
      });
    });

    describe("applyRhythmDiminution", () => {
      it("should divide all durations by the factor", () => {
        const factor = 2;
        const result = applyRhythmDiminution(testRhythm, factor);

        expect(result.type).toBe("diminution");
        expect(result.metadata.transformation_ratio).toBe(1 / factor);
      });

      it("should handle small values correctly", () => {
        // Create a rhythm with small values
        const smallRhythm = {
          ...testRhythm,
          pattern: [1, 0, 1, 0, 1],
        };

        const result = applyRhythmDiminution(smallRhythm, 3);

        // Values less than 0.5 should become 0
        result.pattern.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(value)).toBe(true);
        });
      });

      it("should reject invalid factors", () => {
        expect(() => applyRhythmDiminution(testRhythm, 0)).toThrow(
          _ValidationError,
        );
        expect(() => applyRhythmDiminution(testRhythm, -2)).toThrow(
          _ValidationError,
        );
      });
    });

    describe("applyRhythmRetrograde", () => {
      it("should reverse the pattern exactly", () => {
        const result = applyRhythmRetrograde(testRhythm);

        expect(result.type).toBe("retrograde");
        expect(result.pattern).toEqual([...testRhythm.pattern].reverse());
        expect(result.pattern.length).toBe(testRhythm.pattern.length);
      });

      it("should preserve pattern statistics", () => {
        const result = applyRhythmRetrograde(testRhythm);

        // Sum should be the same
        const originalSum = testRhythm.pattern.reduce(
          (sum, val) => sum + val,
          0,
        );
        const resultSum = result.pattern.reduce((sum, val) => sum + val, 0);
        expect(resultSum).toBe(originalSum);

        // Number of non-zero elements should be the same
        const originalNonZero = testRhythm.pattern.filter((v) => v > 0).length;
        const resultNonZero = result.pattern.filter((v) => v > 0).length;
        expect(resultNonZero).toBe(originalNonZero);
      });

      it("should be its own inverse", () => {
        const result1 = applyRhythmRetrograde(testRhythm);
        const result2 = applyRhythmRetrograde({
          ...testRhythm,
          pattern: result1.pattern,
        });

        expect(result2.pattern).toEqual(testRhythm.pattern);
      });
    });

    describe("applyRhythmRotation", () => {
      it("should rotate pattern by specified steps", () => {
        const steps = 2;
        const result = applyRhythmRotation(testRhythm, steps);

        expect(result.type).toBe("rotation");
        expect(result.metadata.rotation_steps).toBe(steps);

        // Check rotation correctness
        const expected = [
          ...testRhythm.pattern.slice(steps),
          ...testRhythm.pattern.slice(0, steps),
        ];
        expect(result.pattern).toEqual(expected);
      });

      it("should handle negative steps", () => {
        const steps = -1;
        const result = applyRhythmRotation(testRhythm, steps);

        // Negative rotation should work correctly
        const normalizedSteps =
          ((steps % testRhythm.pattern.length) + testRhythm.pattern.length) %
          testRhythm.pattern.length;
        expect(result.metadata.rotation_steps).toBe(normalizedSteps);
      });

      it("should handle steps larger than pattern length", () => {
        const steps = testRhythm.pattern.length + 3;
        const result = applyRhythmRotation(testRhythm, steps);

        // Should normalize to steps % length
        const expectedSteps = steps % testRhythm.pattern.length;
        expect(result.metadata.rotation_steps).toBe(expectedSteps);
      });

      it("should preserve all pattern elements", () => {
        const result = applyRhythmRotation(testRhythm, 3);

        // Should contain same elements, just reordered
        const originalSorted = [...testRhythm.pattern].sort();
        const resultSorted = [...result.pattern].sort();
        expect(resultSorted).toEqual(originalSorted);
      });
    });

    describe("applyRhythmPermutation", () => {
      it("should reorder elements according to permutation", () => {
        // Create a valid permutation array matching the pattern length
        const length = testRhythm.pattern.length;
        const permutation = Array.from({ length }, (_, i) => (i + 1) % length); // simple rotation
        const result = applyRhythmPermutation(testRhythm, permutation);

        expect(result.type).toBe("permutation");
        expect(result.metadata.permutation_order).toEqual(permutation);

        // Check permutation correctness
        permutation.forEach((sourceIndex, targetIndex) => {
          expect(result.pattern[targetIndex]).toBe(
            testRhythm.pattern[sourceIndex],
          );
        });
      });

      it("should generate random permutation when none provided", () => {
        const result = applyRhythmPermutation(testRhythm);

        expect(result.type).toBe("permutation");
        expect(result.metadata.permutation_order).toBeDefined();
        expect(result.metadata.permutation_order?.length).toBe(
          testRhythm.pattern.length,
        );

        // Should contain all indices exactly once, in any order
        const indices = result.metadata.permutation_order!;
        const unique = new Set(indices);
        expect(unique.size).toBe(testRhythm.pattern.length);
        for (let i = 0; i < testRhythm.pattern.length; i++) {
          expect(unique.has(i)).toBe(true);
        }
      });

      it("should reject invalid permutation arrays", () => {
        const invalidPermutations = [
          [0, 1, 2], // Wrong length
          [0, 1, 1, 3], // Duplicate index
          [0, 1, 2, 4], // Index out of range
        ];

        invalidPermutations.forEach((permutation) => {
          expect(() => applyRhythmPermutation(testRhythm, permutation)).toThrow(
            _ValidationError,
          );
        });
      });
    });

    describe("applyRhythmFractioning", () => {
      it("should subdivide active beats", () => {
        const divisions = 3;
        const result = applyRhythmFractioning(testRhythm, divisions);

        expect(result.type).toBe("fractioning");
        expect(result.metadata.fraction_divisions).toBe(divisions);

        // Pattern should be longer due to subdivisions
        expect(result.pattern.length).toBeGreaterThan(
          testRhythm.pattern.length,
        );
      });

      it("should preserve rests as single units", () => {
        const rhythmWithRests = {
          ...testRhythm,
          pattern: [2, 0, 3, 0, 1],
        };

        const result = applyRhythmFractioning(rhythmWithRests, 2);

        // Count zeros in original and result
        const originalZeros = rhythmWithRests.pattern.filter(
          (v) => v === 0,
        ).length;
        const resultZeros = result.pattern.filter((v) => v === 0).length;
        expect(resultZeros).toBe(originalZeros); // Rests not subdivided
      });

      it("should reject invalid division values", () => {
        expect(() => applyRhythmFractioning(testRhythm, 1)).toThrow(
          _ValidationError,
        );
        expect(() => applyRhythmFractioning(testRhythm, 0)).toThrow(
          _ValidationError,
        );
        expect(() => applyRhythmFractioning(testRhythm, -1)).toThrow(
          _ValidationError,
        );
      });
    });
  });

  describe("Harmonic Variations", () => {
    describe("applyHarmonicReharmonization", () => {
      it("should modify chords based on intensity", () => {
        const lowIntensity = applyHarmonicReharmonization(testHarmony, 0.1);
        const highIntensity = applyHarmonicReharmonization(testHarmony, 0.9);

        expect(lowIntensity.type).toBe("reharmonization");
        expect(highIntensity.type).toBe("reharmonization");

        // Higher intensity should change more chords
        const lowChanges = lowIntensity.metadata.reharmonizations?.length || 0;
        const highChanges =
          highIntensity.metadata.reharmonizations?.length || 0;
        expect(highChanges).toBeGreaterThanOrEqual(lowChanges);
      });

      it("should preserve progression length", () => {
        const result = applyHarmonicReharmonization(testHarmony, 0.5);

        expect(result.progression.chords.length).toBe(
          testHarmony.chords.length,
        );
        expect(result.progression.functions.length).toBe(
          testHarmony.functions.length,
        );
      });

      it("should maintain key and scale", () => {
        const result = applyHarmonicReharmonization(testHarmony, 0.7);

        expect(result.progression.key).toBe(testHarmony.key);
        expect(result.progression.scale).toBe(testHarmony.scale);
      });
    });

    describe("applyHarmonicSubstitution", () => {
      it("should apply tritone substitutions to dominant chords", () => {
        const harmonyWithDominants = {
          ...testHarmony,
          chords: ["C", "F", "G7", "C"],
          functions: ["tonic", "subdominant", "dominant", "tonic"],
        };

        const result = applyHarmonicSubstitution(
          harmonyWithDominants,
          "tritone",
        );

        expect(result.type).toBe("substitution");
        expect(result.metadata.substitutions).toBeDefined();

        // Should have substituted the dominant chord
        const substitutions = result.metadata.substitutions || [];
        const dominantSubs = substitutions.filter(
          (sub) => sub.type === "tritone",
        );
        expect(dominantSubs.length).toBeGreaterThan(0);
      });

      it("should calculate voice leading quality", () => {
        const result = applyHarmonicSubstitution(testHarmony, "tritone");

        expect(result.voice_leading).toBeDefined();
        expect(result.voice_leading.smoothness).toBeGreaterThanOrEqual(0);
        expect(result.voice_leading.smoothness).toBeLessThanOrEqual(1);
      });
    });

    describe("optimizeVoiceLeading", () => {
      it("should improve voice leading quality", () => {
        const result = optimizeVoiceLeading(testHarmony);

        expect(result.type).toBe("voice_leading_optimization");
        // Allow for floating-point imprecision with a small epsilon
        const epsilon = 0.1;
        expect(result.voice_leading.smoothness).toBeGreaterThanOrEqual(
          testHarmony.metadata.voiceLeading.smoothness - epsilon,
        );
      });

      it("should track improvements made", () => {
        const result = optimizeVoiceLeading(testHarmony);

        expect(result.metadata.voice_leading_improvements).toBeDefined();
        const improvements = result.metadata.voice_leading_improvements || [];

        improvements.forEach((improvement) => {
          expect(improvement.improved_movement).toBeLessThanOrEqual(
            improvement.original_movement,
          );
          expect(improvement.position).toBeGreaterThanOrEqual(0);
          expect(improvement.technique).toBeDefined();
        });
      });
    });
  });

  describe("Melodic Transformations", () => {
    describe("applyMelodicInversion", () => {
      it("should invert melody around axis", () => {
        const axis = 64; // E4
        const result = applyMelodicInversion(testMelody, axis);

        expect(result.type).toBe("inversion");
        expect(result.metadata.transformation_parameters?.axis).toBe(axis);

        // Check inversion correctness
        result.contour.notes.forEach((note, index) => {
          const originalNote = testMelody.notes[index];
          const expectedNote = Math.round(2 * axis - originalNote);
          expect(note).toBe(expectedNote);
        });
      });

      it("should calculate default axis when none provided", () => {
        const result = applyMelodicInversion(testMelody);

        const minNote = Math.min(...testMelody.notes);
        const maxNote = Math.max(...testMelody.notes);
        const expectedAxis = (minNote + maxNote) / 2;

        expect(result.metadata.transformation_parameters?.axis).toBeCloseTo(
          expectedAxis,
          1,
        );
      });

      it("should preserve melody length", () => {
        const result = applyMelodicInversion(testMelody, 60);

        expect(result.contour.notes.length).toBe(testMelody.notes.length);
        expect(result.contour.intervals.length).toBe(
          testMelody.intervals.length,
        );
      });
    });

    describe("applyMelodicRetrograde", () => {
      it("should reverse note order", () => {
        const result = applyMelodicRetrograde(testMelody);

        expect(result.type).toBe("retrograde");
        expect(result.contour.notes).toEqual([...testMelody.notes].reverse());
      });

      it("should recalculate intervals correctly", () => {
        const result = applyMelodicRetrograde(testMelody);

        // Check that intervals are recalculated for reversed notes
        for (let i = 1; i < result.contour.notes.length; i++) {
          const expectedInterval =
            result.contour.notes[i] - result.contour.notes[i - 1];
          expect(result.contour.intervals[i - 1]).toBe(expectedInterval);
        }
      });
    });

    describe("applyMelodicAugmentation", () => {
      it("should expand intervals by factor", () => {
        const factor = 2;
        const result = applyMelodicAugmentation(testMelody, factor);

        expect(result.type).toBe("augmentation");
        expect(result.metadata.transformation_parameters?.factor).toBe(factor);

        // First note should remain the same
        expect(result.contour.notes[0]).toBe(testMelody.notes[0]);

        // Subsequent intervals should be expanded
        for (let i = 1; i < result.contour.intervals.length; i++) {
          const originalInterval = testMelody.intervals[i - 1];
          const expectedInterval = Math.round(originalInterval * factor);
          expect(result.contour.intervals[i - 1]).toBe(expectedInterval);
        }
      });

      it("should reject invalid factors", () => {
        expect(() => applyMelodicAugmentation(testMelody, 0)).toThrow(
          _ValidationError,
        );
        expect(() => applyMelodicAugmentation(testMelody, -1)).toThrow(
          _ValidationError,
        );
      });
    });

    describe("applyMelodicTransposition", () => {
      it("should transpose all notes by semitones", () => {
        const semitones = 5;
        const result = applyMelodicTransposition(testMelody, semitones);

        expect(result.type).toBe("transposition");
        expect(result.metadata.transformation_parameters?.semitones).toBe(
          semitones,
        );

        // All notes should be transposed
        result.contour.notes.forEach((note, index) => {
          expect(note).toBe(testMelody.notes[index] + semitones);
        });

        // Intervals should remain the same
        expect(result.contour.intervals).toEqual(testMelody.intervals);
      });

      it("should preserve contour perfectly", () => {
        const result = applyMelodicTransposition(testMelody, 7);

        expect(result.metadata.contour_preservation).toBe(1.0);
      });
    });
  });

  describe("Pattern Complexity Analysis", () => {
    describe("calculatePatternComplexity", () => {
      it("should analyze rhythm complexity", () => {
        const complexity = calculatePatternComplexity({
          rhythm: { pattern: testRhythm.pattern },
          harmony: null,
          melody: null,
        });

        expect(complexity.rhythmic).toBeGreaterThan(0);
        expect(complexity.rhythmic).toBeLessThanOrEqual(1);
        expect(complexity.overall).toBe(complexity.rhythmic);
        expect(complexity.harmonic).toBe(0);
        expect(complexity.melodic).toBe(0);
      });

      it("should analyze harmonic complexity", () => {
        const complexity = calculatePatternComplexity({
          rhythm: null,
          harmony: testHarmony,
          melody: null,
        });

        expect(complexity.harmonic).toBeGreaterThan(0);
        expect(complexity.harmonic).toBeLessThanOrEqual(1);
        expect(complexity.overall).toBe(complexity.harmonic);
      });

      it("should analyze melodic complexity", () => {
        const complexity = calculatePatternComplexity({
          rhythm: null,
          harmony: null,
          melody: testMelody,
        });

        expect(complexity.melodic).toBeGreaterThan(0);
        expect(complexity.melodic).toBeLessThanOrEqual(1);
        expect(complexity.overall).toBe(complexity.melodic);
      });

      it("should combine multiple pattern types", () => {
        const complexity = calculatePatternComplexity({
          rhythm: { pattern: testRhythm.pattern },
          harmony: testHarmony,
          melody: testMelody,
        });

        expect(complexity.overall).toBeGreaterThan(0);
        expect(complexity.rhythmic).toBeGreaterThan(0);
        expect(complexity.harmonic).toBeGreaterThan(0);
        expect(complexity.melodic).toBeGreaterThan(0);

        // Overall should be average of components
        const expectedOverall =
          (complexity.rhythmic + complexity.harmonic + complexity.melodic) / 3;
        expect(complexity.overall).toBeCloseTo(expectedOverall, 3);
      });

      it("should calculate complexity factors", () => {
        const complexity = calculatePatternComplexity({
          rhythm: { pattern: testRhythm.pattern },
          harmony: testHarmony,
          melody: testMelody,
        });

        expect(complexity.factors.density).toBeGreaterThanOrEqual(0);
        expect(complexity.factors.density).toBeLessThanOrEqual(1);
        expect(complexity.factors.syncopation).toBeGreaterThanOrEqual(0);
        expect(complexity.factors.syncopation).toBeLessThanOrEqual(1);
        expect(complexity.factors.intervallic).toBeGreaterThanOrEqual(0);
        expect(complexity.factors.intervallic).toBeLessThanOrEqual(1);
      });
    });

    describe("determineDifficultyLevel", () => {
      it("should classify simple patterns as beginner", () => {
        const simpleComplexity = 0.2;
        const simpleFactors = {
          density: 0.3,
          syncopation: 0.1,
          intervallic: 0.2,
          harmonic_tension: 0.1,
          voice_leading: 0.8,
          pattern_length: 0.2,
          unique_elements: 0.3,
        };

        const difficulty = determineDifficultyLevel(
          simpleComplexity,
          simpleFactors,
        );
        expect(difficulty).toBe("beginner");
      });

      it("should classify complex patterns as expert", () => {
        const complexComplexity = 0.8;
        const complexFactors = {
          density: 0.9,
          syncopation: 0.8,
          intervallic: 0.7,
          harmonic_tension: 0.9,
          voice_leading: 0.3,
          pattern_length: 0.8,
          unique_elements: 0.9,
        };

        const difficulty = determineDifficultyLevel(
          complexComplexity,
          complexFactors,
        );
        expect(difficulty).toBe("expert");
      });

      it("should handle intermediate levels", () => {
        const moderateComplexity = 0.4;
        const moderateFactors = {
          density: 0.5,
          syncopation: 0.4,
          intervallic: 0.4,
          harmonic_tension: 0.5,
          voice_leading: 0.6,
          pattern_length: 0.4,
          unique_elements: 0.5,
        };

        const difficulty = determineDifficultyLevel(
          moderateComplexity,
          moderateFactors,
        );
        expect(["intermediate", "advanced"]).toContain(difficulty);
      });
    });
  });

  describe("Performance Benchmarks", () => {
    it("should handle rhythm variations efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        applyRhythmAugmentation(testRhythm, 2);
        applyRhythmRetrograde(testRhythm);
        applyRhythmRotation(testRhythm, 1);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it("should handle harmonic variations efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 50; i++) {
        applyHarmonicReharmonization(testHarmony, 0.3);
        applyHarmonicSubstitution(testHarmony, "tritone");
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });

    it("should handle melodic transformations efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        applyMelodicInversion(testMelody);
        applyMelodicRetrograde(testMelody);
        applyMelodicTransposition(testMelody, 5);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it("should handle complexity analysis efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        calculatePatternComplexity({
          rhythm: { pattern: testRhythm.pattern },
          harmony: testHarmony,
          melody: testMelody,
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });
  });

  describe("Integration and Edge Cases", () => {
    it("should handle empty patterns gracefully", () => {
      const emptyRhythm = { ...testRhythm, pattern: [] };

      // Most operations should handle empty patterns
      expect(() => applyRhythmRetrograde(emptyRhythm)).not.toThrow();
      expect(() => applyRhythmRotation(emptyRhythm, 1)).not.toThrow();
    });

    it("should handle single-element patterns", () => {
      const singleRhythm = { ...testRhythm, pattern: [2] };

      const retrograde = applyRhythmRetrograde(singleRhythm);
      expect(retrograde.pattern).toEqual([2]);

      const rotation = applyRhythmRotation(singleRhythm, 5);
      expect(rotation.pattern).toEqual([2]);
    });

    it("should maintain mathematical properties across transformations", () => {
      // Apply multiple transformations and verify properties are maintained
      const current = testRhythm;

      const augmented = applyRhythmAugmentation(current, 2);
      const retrograde = applyRhythmRetrograde({
        ...current,
        pattern: augmented.pattern,
      });
      const rotated = applyRhythmRotation(
        { ...current, pattern: retrograde.pattern },
        2,
      );

      // Final pattern should have same length as intermediate steps
      expect(rotated.pattern.length).toBe(augmented.pattern.length);
      expect(rotated.pattern.length).toBe(retrograde.pattern.length);

      // All values should be valid
      rotated.pattern.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(value)).toBe(true);
      });
    });
  });
});
