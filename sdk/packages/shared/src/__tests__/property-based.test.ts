/**
 * Property-based tests for mathematical functions
 * Tests mathematical properties and invariants across random inputs
 */

import { describe, it, expect } from "vitest";
import {
  generateRhythmicResultant,
  generateMultipleResultants,
  type RhythmicResultant,
} from "../math/rhythmic-resultants";
import {
  applyRhythmAugmentation,
  applyRhythmDiminution,
  applyRhythmRetrograde,
  applyRhythmRotation,
  applyRhythmPermutation,
  calculatePatternComplexity,
} from "../math/pattern-variations";
import { validateGenerators, calculateLCM } from "../math/generators";

describe("Property-Based Tests - Mathematical Invariants", () => {
  /**
   * Generate random integer between min and max (inclusive)
   */
  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random generator pair
   */
  function randomGeneratorPair(): [number, number] {
    const a = randomInt(1, 16);
    let b = randomInt(1, 16);
    // Ensure generators are different
    while (b === a) {
      b = randomInt(1, 16);
    }
    return [a, b];
  }

  /**
   * Generate a random rhythmic resultant for property tests (module-scope)
   */
  function randomRhythm(): RhythmicResultant {
    const [a, b] = randomGeneratorPair();
    return generateRhythmicResultant(a, b);
  }

  /**
   * Run property test with multiple random inputs
   */
  function forAll<T>(
    generator: () => T,
    property: (input: T) => boolean | void,
    iterations: number = 100,
  ): void {
    for (let i = 0; i < iterations; i++) {
      const input = generator();
      try {
        const result = property(input);
        if (result === false) {
          throw new Error(
            `Property failed for input: ${JSON.stringify(input)}`,
          );
        }
      } catch (error) {
        throw new Error(
          `Property test failed on iteration ${i + 1} with input ${JSON.stringify(input)}: ${error}`,
        );
      }
    }
  }

  describe("Rhythmic Resultant Properties", () => {
    it("should always generate patterns with length equal to LCM of generators", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const result = generateRhythmicResultant(a, b);
          const expectedLength = calculateLCM(a, b);
          expect(result.length).toBe(expectedLength);
          expect(result.pattern.length).toBe(expectedLength);
        },
        50,
      );
    });

    it("should preserve generator information in metadata", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const result = generateRhythmicResultant(a, b);
          expect(result.generators.a).toBe(a);
          expect(result.generators.b).toBe(b);
        },
        50,
      );
    });

    it("should generate patterns with only non-negative integer values", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const result = generateRhythmicResultant(a, b);
          result.pattern.forEach((value, index) => {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(value)).toBe(true);
          });
        },
        50,
      );
    });

    it("should place accents at positions divisible by both generators", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const result = generateRhythmicResultant(a, b);

          // Check that accents occur at expected positions
          for (let i = 0; i < result.length; i++) {
            const shouldHaveAccent = i % a === 0 && i % b === 0;
            const hasAccent = result.metadata.accents.includes(i);

            if (shouldHaveAccent) {
              expect(hasAccent).toBe(true);
            }
          }
        },
        30,
      );
    });

    it("should have commutative property: (a,b) ≡ (b,a)", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const result1 = generateRhythmicResultant(a, b);
          const result2 = generateRhythmicResultant(b, a);

          expect(result1.length).toBe(result2.length);
          expect(result1.metadata.accents).toEqual(result2.metadata.accents);
          expect(result1.complexity).toBeCloseTo(result2.complexity, 3);
        },
        30,
      );
    });

    it("should have consistent density calculation", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const result = generateRhythmicResultant(a, b);
          const nonZeroCount = result.pattern.filter((v) => v > 0).length;
          const expectedDensity = nonZeroCount / result.pattern.length;

          expect(result.metadata.density).toBeCloseTo(expectedDensity, 5);
        },
        50,
      );
    });

    it("should generate deterministic results for same inputs", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const result1 = generateRhythmicResultant(a, b);
          const result2 = generateRhythmicResultant(a, b);

          expect(result1.pattern).toEqual(result2.pattern);
          expect(result1.length).toBe(result2.length);
          expect(result1.complexity).toBe(result2.complexity);
          expect(result1.metadata).toEqual(result2.metadata);
        },
        30,
      );
    });
  });

  describe("Pattern Variation Properties", () => {
    function randomRhythm(): RhythmicResultant {
      const [a, b] = randomGeneratorPair();
      return generateRhythmicResultant(a, b);
    }

    it("should preserve pattern length in retrograde", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const retrograde = applyRhythmRetrograde(rhythm);
          expect(retrograde.pattern.length).toBe(rhythm.pattern.length);
        },
        50,
      );
    });

    it("should preserve all elements in retrograde (just reversed)", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const retrograde = applyRhythmRetrograde(rhythm);
          expect(retrograde.pattern).toEqual([...rhythm.pattern].reverse());
        },
        50,
      );
    });

    it("should preserve pattern sum in retrograde", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const originalSum = rhythm.pattern.reduce((sum, val) => sum + val, 0);
          const retrograde = applyRhythmRetrograde(rhythm);
          const retrogradeSum = retrograde.pattern.reduce(
            (sum, val) => sum + val,
            0,
          );

          expect(retrogradeSum).toBe(originalSum);
        },
        50,
      );
    });

    it("should make retrograde its own inverse", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const retrograde1 = applyRhythmRetrograde(rhythm);
          const retrograde2 = applyRhythmRetrograde({
            ...rhythm,
            pattern: retrograde1.pattern,
          });

          expect(retrograde2.pattern).toEqual(rhythm.pattern);
        },
        30,
      );
    });

    it("should preserve pattern elements in rotation", () => {
      forAll(
        () => ({ rhythm: randomRhythm(), steps: randomInt(-10, 10) }),
        ({ rhythm, steps }) => {
          const rotated = applyRhythmRotation(rhythm, steps);

          // Should contain same elements, just reordered
          const originalSorted = [...rhythm.pattern].sort();
          const rotatedSorted = [...rotated.pattern].sort();

          expect(rotatedSorted).toEqual(originalSorted);
        },
        50,
      );
    });

    it("should handle rotation steps modulo pattern length", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const steps = randomInt(1, 20);
          const rotation1 = applyRhythmRotation(rhythm, steps);
          const rotation2 = applyRhythmRotation(
            rhythm,
            steps + rhythm.pattern.length,
          );

          expect(rotation1.pattern).toEqual(rotation2.pattern);
        },
        30,
      );
    });

    it("should preserve pattern elements in permutation", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const permuted = applyRhythmPermutation(rhythm);

          // Should contain same elements, just reordered
          const originalSorted = [...rhythm.pattern].sort();
          const permutedSorted = [...permuted.pattern].sort();

          expect(permutedSorted).toEqual(originalSorted);
        },
        50,
      );
    });

    it("should scale all durations in augmentation", () => {
      forAll(
        () => ({ rhythm: randomRhythm(), factor: randomInt(2, 5) }),
        ({ rhythm, factor }) => {
          const augmented = applyRhythmAugmentation(rhythm, factor);

          augmented.pattern.forEach((value, index) => {
            const originalValue = rhythm.pattern[index];
            const expectedValue = Math.round(originalValue * factor);
            expect(value).toBe(expectedValue);
          });
        },
        30,
      );
    });

    it("should preserve rest positions in augmentation", () => {
      forAll(
        () => ({ rhythm: randomRhythm(), factor: randomInt(2, 4) }),
        ({ rhythm, factor }) => {
          const augmented = applyRhythmAugmentation(rhythm, factor);

          rhythm.pattern.forEach((value, index) => {
            const isRest = value === 0;
            const augmentedIsRest = augmented.pattern[index] === 0;
            expect(isRest).toBe(augmentedIsRest);
          });
        },
        30,
      );
    });

    it("should maintain proportional relationships in augmentation", () => {
      forAll(
        () => ({ rhythm: randomRhythm(), factor: 2 }),
        ({ rhythm, factor }) => {
          const augmented = applyRhythmAugmentation(rhythm, factor);

          // Find non-zero values to compare ratios
          const nonZeroOriginal = rhythm.pattern.filter((v) => v > 0);
          const nonZeroAugmented = augmented.pattern.filter((v) => v > 0);

          if (nonZeroOriginal.length >= 2 && nonZeroAugmented.length >= 2) {
            const originalRatio = nonZeroOriginal[1] / nonZeroOriginal[0];
            const augmentedRatio = nonZeroAugmented[1] / nonZeroAugmented[0];

            expect(augmentedRatio).toBeCloseTo(originalRatio, 2);
          }
        },
        20,
      );
    });
  });

  describe("Complexity Calculation Properties", () => {
    it("should return complexity values between 0 and 1", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const complexity = calculatePatternComplexity({
            rhythm: { pattern: rhythm.pattern },
            harmony: null,
            melody: null,
          });

          expect(complexity.overall).toBeGreaterThanOrEqual(0);
          expect(complexity.overall).toBeLessThanOrEqual(1);
          expect(complexity.rhythmic).toBeGreaterThanOrEqual(0);
          expect(complexity.rhythmic).toBeLessThanOrEqual(1);
        },
        50,
      );
    });

    it("should assign higher complexity to more varied patterns", () => {
      // Create simple pattern
      const simplePattern = { pattern: [1, 1, 1, 1] };

      // Create complex pattern
      const complexPattern = { pattern: [3, 1, 0, 2, 1, 0, 3, 2] };

      const simpleComplexity = calculatePatternComplexity({
        rhythm: simplePattern,
        harmony: null,
        melody: null,
      });

      const complexComplexity = calculatePatternComplexity({
        rhythm: complexPattern,
        harmony: null,
        melody: null,
      });

      expect(complexComplexity.overall).toBeGreaterThan(
        simpleComplexity.overall,
      );
    });

    it("should be deterministic for same inputs", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const complexity1 = calculatePatternComplexity({
            rhythm: { pattern: rhythm.pattern },
            harmony: null,
            melody: null,
          });

          const complexity2 = calculatePatternComplexity({
            rhythm: { pattern: rhythm.pattern },
            harmony: null,
            melody: null,
          });

          expect(complexity1.overall).toBe(complexity2.overall);
          expect(complexity1.rhythmic).toBe(complexity2.rhythmic);
        },
        30,
      );
    });

    it("should have consistent factor calculations", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const complexity = calculatePatternComplexity({
            rhythm: { pattern: rhythm.pattern },
            harmony: null,
            melody: null,
          });

          // All factors should be between 0 and 1
          Object.values(complexity.factors).forEach((factor) => {
            expect(factor).toBeGreaterThanOrEqual(0);
            expect(factor).toBeLessThanOrEqual(1);
          });
        },
        50,
      );
    });
  });

  describe("Generator Validation Properties", () => {
    it("should accept all valid generator pairs", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const validation = validateGenerators(a, b);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        },
        100,
      );
    });

    it("should reject generators outside valid range", () => {
      const invalidGenerators = [
        [0, 5],
        [-1, 5],
        [5, 0],
        [5, -1],
        [33, 5],
        [5, 33],
        [100, 200],
      ];

      invalidGenerators.forEach(([a, b]) => {
        const validation = validateGenerators(a, b);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it("should calculate LCM correctly for all generator pairs", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const lcm = calculateLCM(a, b);

          // LCM should be divisible by both generators
          expect(lcm % a).toBe(0);
          expect(lcm % b).toBe(0);

          // LCM should be the smallest such number
          for (let i = 1; i < lcm; i++) {
            expect(i % a !== 0 || i % b !== 0).toBe(true);
          }
        },
        50,
      );
    });

    it("should have LCM properties: LCM(a,b) = LCM(b,a)", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const lcm1 = calculateLCM(a, b);
          const lcm2 = calculateLCM(b, a);
          expect(lcm1).toBe(lcm2);
        },
        50,
      );
    });

    it("should satisfy LCM bounds: max(a,b) ≤ LCM(a,b) ≤ a*b", () => {
      forAll(
        randomGeneratorPair,
        ([a, b]) => {
          const lcm = calculateLCM(a, b);
          const max = Math.max(a, b);
          const product = a * b;

          expect(lcm).toBeGreaterThanOrEqual(max);
          expect(lcm).toBeLessThanOrEqual(product);
        },
        50,
      );
    });
  });

  describe("Multiple Resultants Properties", () => {
    it("should generate correct number of resultants", () => {
      forAll(
        () => {
          const count = randomInt(1, 10);
          const generators = Array.from({ length: count }, () => {
            const [a, b] = randomGeneratorPair();
            return { a, b };
          });
          return generators;
        },
        (generators) => {
          const results = generateMultipleResultants(generators);
          expect(results).toHaveLength(generators.length);
        },
        30,
      );
    });

    it("should preserve individual resultant properties", () => {
      forAll(
        () => {
          const count = randomInt(2, 5);
          return Array.from({ length: count }, () => {
            const [a, b] = randomGeneratorPair();
            return { a, b };
          });
        },
        (generators) => {
          const results = generateMultipleResultants(generators);

          results.forEach((result, index) => {
            const { a, b } = generators[index];
            expect(result.generators.a).toBe(a);
            expect(result.generators.b).toBe(b);
            expect(result.length).toBe(calculateLCM(a, b));
          });
        },
        20,
      );
    });

    it("should handle empty generator array", () => {
      const results = generateMultipleResultants([]);
      expect(results).toEqual([]);
    });
  });

  describe("Edge Case Properties", () => {
    it("should handle minimum valid generators", () => {
      const minGenerators = [
        [1, 2],
        [1, 3],
        [2, 1],
      ];

      minGenerators.forEach(([a, b]) => {
        const result = generateRhythmicResultant(a, b);
        expect(result.pattern.length).toBeGreaterThan(0);
        expect(result.generators.a).toBe(a);
        expect(result.generators.b).toBe(b);
      });
    });

    it("should handle maximum practical generators", () => {
      const maxGenerators = [
        [16, 17],
        [15, 16],
        [17, 19],
      ];

      maxGenerators.forEach(([a, b]) => {
        const result = generateRhythmicResultant(a, b);
        expect(result.pattern.length).toBe(calculateLCM(a, b));
        expect(result.pattern.every((v) => v >= 0)).toBe(true);
      });
    });

    it("should handle coprime generators correctly", () => {
      const coprimeGenerators = [
        [3, 5],
        [7, 11],
        [13, 17],
      ];

      coprimeGenerators.forEach(([a, b]) => {
        const result = generateRhythmicResultant(a, b);
        expect(result.length).toBe(a * b); // LCM of coprimes is their product
      });
    });

    it("should handle generators with common factors", () => {
      const commonFactorGenerators = [
        { a: 4, b: 6, expectedLCM: 12 },
        { a: 8, b: 12, expectedLCM: 24 },
        { a: 9, b: 15, expectedLCM: 45 },
      ];

      commonFactorGenerators.forEach(({ a, b, expectedLCM }) => {
        const result = generateRhythmicResultant(a, b);
        expect(result.length).toBe(expectedLCM);
      });
    });
  });

  describe("Invariant Preservation Across Operations", () => {
    it("should preserve mathematical relationships through variations", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const variations = [
            applyRhythmRetrograde(rhythm),
            applyRhythmRotation(rhythm, randomInt(1, 5)),
            applyRhythmPermutation(rhythm),
          ];

          variations.forEach((variation) => {
            // Should preserve pattern length
            expect(variation.pattern.length).toBe(rhythm.pattern.length);

            // Should preserve element count
            const originalElements = rhythm.pattern.length;
            const variationElements = variation.pattern.length;
            expect(variationElements).toBe(originalElements);

            // Should contain only valid values
            variation.pattern.forEach((value) => {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(Number.isInteger(value)).toBe(true);
            });
          });
        },
        30,
      );
    });

    it("should maintain complexity bounds through variations", () => {
      forAll(
        randomRhythm,
        (rhythm) => {
          const originalComplexity = calculatePatternComplexity({
            rhythm: { pattern: rhythm.pattern },
            harmony: null,
            melody: null,
          });

          const retrograde = applyRhythmRetrograde(rhythm);
          const retrogradeComplexity = calculatePatternComplexity({
            rhythm: { pattern: retrograde.pattern },
            harmony: null,
            melody: null,
          });

          // Retrograde should have same complexity (just reversed)
          expect(retrogradeComplexity.overall).toBeCloseTo(
            originalComplexity.overall,
            3,
          );
        },
        20,
      );
    });
  });
});
