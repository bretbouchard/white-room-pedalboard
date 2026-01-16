/**
 * Comprehensive unit tests for rhythmic resultant generation
 * Includes property-based testing, edge cases, and performance benchmarks
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import {
  generateRhythmicResultant,
  generateMultipleResultants,
  generateCustomAccentResultant,
  generatePolyrhythmicResultant,
  generateSwingResultant,
  findOptimalResultant,
  type RhythmicResultant,
  type ResultantOptions,
} from "../rhythmic-resultants";
import { ValidationError as _ValidationError } from "../../errors";

describe("Rhythmic Resultants - Mathematical Functions", () => {
  beforeEach(() => {
    // Only enable if a specific test needs timers faked. Otherwise, skip this line.
    // vi.useFakeTimers();
  });

  afterEach(async () => {
    await Promise.resolve();
    try {
      // If fake timers are enabled, drain them
      if (vi.isFakeTimers()) {
        for (let i = 0; i < 10; i++) {
          const pending = vi.getTimerCount();
          if (!pending) break;
          await vi.runOnlyPendingTimersAsync();
        }
      }
    } finally {
      vi.clearAllTimers();
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  describe("generateRhythmicResultant - Core Algorithm", () => {
    describe("Property-Based Testing", () => {
      it("should generate patterns with correct mathematical properties", () => {
        // Test multiple generator pairs to verify mathematical correctness
        const testCases = [
          { a: 2, b: 3, expectedLength: 6 },
          { a: 3, b: 4, expectedLength: 12 },
          { a: 4, b: 5, expectedLength: 20 },
          { a: 5, b: 7, expectedLength: 35 },
        ];

        testCases.forEach(({ a, b, expectedLength }) => {
          const result = generateRhythmicResultant(a, b);

          // Property: Pattern length equals LCM of generators
          expect(result.length).toBe(expectedLength);
          expect(result.pattern.length).toBe(expectedLength);

          // Property: Generators are preserved
          expect(result.generators.a).toBe(a);
          expect(result.generators.b).toBe(b);

          // Property: Pattern contains only valid values
          result.pattern.forEach((value) => {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(value)).toBe(true);
          });

          // Property: Accents occur at generator intersections
          const expectedAccents = [];
          for (let i = 0; i < expectedLength; i++) {
            if (i % a === 0 && i % b === 0) {
              expectedAccents.push(i);
            }
          }
          expect(result.metadata.accents).toEqual(expectedAccents);
        });
      });

      it("should maintain mathematical invariants across different options", () => {
        const generators = [
          [2, 3],
          [3, 5],
          [4, 7],
          [5, 8],
        ];

        generators.forEach(([a, b]) => {
          const defaultResult = generateRhythmicResultant(a, b);
          const customResult = generateRhythmicResultant(a, b, {
            accentStrength: 5,
            normalStrength: 2,
            restValue: 0,
          });

          // Invariant: Pattern structure remains the same
          expect(defaultResult.length).toBe(customResult.length);
          expect(defaultResult.metadata.accents).toEqual(
            customResult.metadata.accents,
          );

          // Invariant: Only values change, not positions
          for (let i = 0; i < defaultResult.pattern.length; i++) {
            const defaultIsRest = defaultResult.pattern[i] === 0;
            const customIsRest = customResult.pattern[i] === 0;
            expect(defaultIsRest).toBe(customIsRest);
          }
        });
      });

      it("should generate symmetric patterns for symmetric generators", () => {
        // Test commutative property: (a,b) should be equivalent to (b,a)
        const testPairs = [
          [2, 3],
          [3, 5],
          [4, 7],
        ];

        testPairs.forEach(([a, b]) => {
          const result1 = generateRhythmicResultant(a, b);
          const result2 = generateRhythmicResultant(b, a);

          expect(result1.length).toBe(result2.length);
          expect(result1.metadata.accents).toEqual(result2.metadata.accents);
          expect(result1.complexity).toBeCloseTo(result2.complexity, 3);
        });
      });
    });

    describe("Edge Cases and Boundary Conditions", () => {
      it("should handle minimum valid generators", () => {
        const result = generateRhythmicResultant(1, 2);

        expect(result.length).toBe(2);
        expect(result.pattern).toEqual([3, 1]); // Default accent + normal
        expect(result.metadata.accents).toEqual([0]);
      });

      it("should handle maximum practical generators", () => {
        const result = generateRhythmicResultant(16, 17);

        expect(result.length).toBe(16 * 17); // 272
        expect(result.pattern.length).toBe(272);
        expect(result.generators.a).toBe(16);
        expect(result.generators.b).toBe(17);
      });

      it("should handle coprime generators correctly", () => {
        // Coprime generators should have LCM = a * b
        const coprimeTests = [
          [3, 5],
          [7, 11],
          [13, 17],
        ];

        coprimeTests.forEach(([a, b]) => {
          const result = generateRhythmicResultant(a, b);
          expect(result.length).toBe(a * b);
        });
      });

      it("should handle generators with common factors", () => {
        // Non-coprime generators should have LCM < a * b
        const nonCoprimeTests = [
          { a: 4, b: 6, expectedLCM: 12 },
          { a: 8, b: 12, expectedLCM: 24 },
          { a: 9, b: 15, expectedLCM: 45 },
        ];

        nonCoprimeTests.forEach(({ a, b, expectedLCM }) => {
          const result = generateRhythmicResultant(a, b);
          expect(result.length).toBe(expectedLCM);
        });
      });
    });

    describe("Error Handling", () => {
      it("should reject invalid generator values", () => {
        const invalidGenerators = [
          [0, 2],
          [-1, 3],
          [2, 0],
          [3, -1],
          [1.5, 2],
          [2, 2.5],
          [NaN, 2],
          [2, NaN],
          [Infinity, 2],
          [2, Infinity],
        ];

        invalidGenerators.forEach(([a, b]) => {
          expect(() => generateRhythmicResultant(a, b)).toThrow(
            _ValidationError,
          );
        });
      });

      it("should reject generators that are too large", () => {
        expect(() => generateRhythmicResultant(33, 2)).toThrow(
          _ValidationError,
        );
        expect(() => generateRhythmicResultant(2, 33)).toThrow(
          _ValidationError,
        );
        expect(() => generateRhythmicResultant(50, 60)).toThrow(
          _ValidationError,
        );
      });

      it("should provide meaningful error messages", () => {
        try {
          generateRhythmicResultant(0, 2);
          expect.fail("Should have thrown _ValidationError");
        } catch (error) {
          expect(error).toBeInstanceOf(_ValidationError);
          expect(error.message).toContain("generator");
          expect(error.details?.errors).toBeDefined();
        }
      });
    });

    // Performance benchmarks are moved to a dedicated performance test file
    // under tests/performance so they can be run separately from unit tests.

    describe("Metadata Accuracy", () => {
      it("should calculate complexity correctly", () => {
        // More complex generators should generally produce higher complexity
        const simple = generateRhythmicResultant(2, 3);
        const complex = generateRhythmicResultant(7, 11);
        // console.log('DEBUG complexity (2,3):', simple.complexity, ' (7,11):', complex.complexity);
        expect(complex.complexity).toBeGreaterThan(simple.complexity);
      });

      it("should calculate syncopation accurately", () => {
        const result = generateRhythmicResultant(3, 4);

        expect(result.metadata.syncopation).toBeGreaterThanOrEqual(0);
        expect(result.metadata.syncopation).toBeLessThanOrEqual(1);
        expect(typeof result.metadata.syncopation).toBe("number");
      });

      it("should calculate density correctly", () => {
        const result = generateRhythmicResultant(2, 3);

        const nonZeroCount = result.pattern.filter((v) => v > 0).length;
        const expectedDensity = nonZeroCount / result.pattern.length;

        expect(result.metadata.density).toBeCloseTo(expectedDensity, 3);
      });
    });
  });

  describe("generateMultipleResultants", () => {
    it("should generate multiple resultants correctly", () => {
      const generators = [
        { a: 2, b: 3 },
        { a: 3, b: 4 },
        { a: 4, b: 5 },
      ];

      const results = generateMultipleResultants(generators);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.generators).toEqual(generators[index]);
      });
    });

    it("should handle empty generator array", () => {
      const results = generateMultipleResultants([]);
      expect(results).toEqual([]);
    });

    it("should propagate options to all resultants", () => {
      const generators = [
        { a: 2, b: 3 },
        { a: 3, b: 4 },
      ];
      const options: ResultantOptions = {
        accentStrength: 5,
        normalStrength: 2,
      };

      const results = generateMultipleResultants(generators, options);

      results.forEach((result) => {
        // Check that custom accent strength was applied
        const hasAccents = result.pattern.some((v) => v === 5);
        const hasNormals = result.pattern.some((v) => v === 2);
        expect(hasAccents || hasNormals).toBe(true);
      });
    });
  });

  describe("generateCustomAccentResultant", () => {
    it("should apply custom accent pattern correctly", () => {
      const baseResult = generateRhythmicResultant(2, 3);
      const customAccents = [1, 2, 3, 1, 2, 3]; // Same length as base pattern

      const result = generateCustomAccentResultant(2, 3, customAccents);

      expect(result.pattern.length).toBe(baseResult.pattern.length);

      // Check that custom accents were applied where base pattern had non-zero values
      for (let i = 0; i < result.pattern.length; i++) {
        if (baseResult.pattern[i] > 0) {
          expect(result.pattern[i]).toBe(customAccents[i]);
        } else {
          expect(result.pattern[i]).toBe(0); // Rests remain rests
        }
      }
    });

    it("should reject mismatched accent pattern length", () => {
      const wrongLengthAccents = [1, 2, 3]; // Wrong length

      expect(() => {
        generateCustomAccentResultant(2, 3, wrongLengthAccents);
      }).toThrow(_ValidationError);
    });
  });

  describe("generatePolyrhythmicResultant", () => {
    it("should combine multiple generator pairs", () => {
      const generatorPairs = [
        { a: 2, b: 3 },
        { a: 3, b: 4 },
      ];

      const result = generatePolyrhythmicResultant(generatorPairs);

      // Length should be LCM of individual pattern lengths
      const individual1 = generateRhythmicResultant(2, 3); // length 6
      const individual2 = generateRhythmicResultant(3, 4); // length 12
      // LCM(6, 12) = 12
      expect(result.length).toBe(12);
    });

    it("should require at least 2 generator pairs", () => {
      expect(() => {
        generatePolyrhythmicResultant([{ a: 2, b: 3 }]);
      }).toThrow(_ValidationError);

      expect(() => {
        generatePolyrhythmicResultant([]);
      }).toThrow(_ValidationError);
    });

    it("should combine accents from all patterns", () => {
      const generatorPairs = [
        { a: 2, b: 3 },
        { a: 4, b: 5 },
      ];

      const result = generatePolyrhythmicResultant(generatorPairs);

      // Should have accents from both patterns
      expect(result.metadata.accents.length).toBeGreaterThan(0);

      // All accent positions should be valid
      result.metadata.accents.forEach((accent) => {
        expect(accent).toBeGreaterThanOrEqual(0);
        expect(accent).toBeLessThan(result.length);
      });
    });
  });

  describe("generateSwingResultant", () => {
    it("should apply swing feel to pattern", () => {
      const straightResult = generateRhythmicResultant(2, 3);
      const swingResult = generateSwingResultant(2, 3, 0.67);

      expect(swingResult.length).toBe(straightResult.length);
      expect(swingResult.generators).toEqual(straightResult.generators);

      // Swing should increase syncopation
      expect(swingResult.metadata.syncopation).toBeGreaterThanOrEqual(
        straightResult.metadata.syncopation,
      );
    });

    it("should validate swing ratio", () => {
      expect(() => generateSwingResultant(2, 3, 0.4)).toThrow(_ValidationError);
      expect(() => generateSwingResultant(2, 3, 1.1)).toThrow(_ValidationError);
      expect(() => generateSwingResultant(2, 3, -0.1)).toThrow(
        _ValidationError,
      );
    });

    it("should handle edge swing ratios", () => {
      const minSwing = generateSwingResultant(2, 3, 0.5);
      const maxSwing = generateSwingResultant(2, 3, 1.0);

      expect(minSwing.pattern.length).toBeGreaterThan(0);
      expect(maxSwing.pattern.length).toBeGreaterThan(0);
    });
  });

  describe("findOptimalResultant", () => {
    it("should find resultants matching target characteristics", () => {
      const targets = {
        length: 12,
        complexity: 0.5,
        density: 0.6,
      };

      const results = findOptimalResultant(targets, 8);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10); // Max 10 results

      // Results should be sorted by fitness (best first)
      for (let i = 1; i < results.length; i++) {
        // This is a heuristic check - better matches should come first
        // We can't easily verify the exact scoring, but we can check basic properties
        expect(results[i].length).toBeGreaterThan(0);
        expect(results[i].complexity).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle empty target characteristics", () => {
      const results = findOptimalResultant({}, 4);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should respect max generator limit", () => {
      const results = findOptimalResultant({ length: 6 }, 3);

      results.forEach((result) => {
        expect(result.generators.a).toBeLessThanOrEqual(3);
        expect(result.generators.b).toBeLessThanOrEqual(3);
      });
    });

    it("should handle impossible targets gracefully", () => {
      const impossibleTargets = {
        length: 1000, // Very large
        complexity: 0.1, // Very simple
        density: 0.9, // Very dense
      };

      const results = findOptimalResultant(impossibleTargets, 5);

      // Should still return some results, even if not perfect matches
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    it("should work with all options combinations", () => {
      const allOptions: ResultantOptions = {
        accentStrength: 4,
        normalStrength: 2,
        restValue: 0,
        includeMetadata: true,
      };

      const result = generateRhythmicResultant(3, 5, allOptions);

      expect(result.pattern.some((v) => v === 4)).toBe(true); // Has accents
      expect(result.pattern.some((v) => v === 2)).toBe(true); // Has normals
      expect(result.metadata).toBeDefined();
      expect(result.metadata.accents).toBeDefined();
    });

    it("should maintain consistency across multiple calls", () => {
      const results = Array.from({ length: 10 }, () =>
        generateRhythmicResultant(3, 4),
      );

      // All results should be identical (deterministic)
      results.forEach((result) => {
        expect(result.pattern).toEqual(results[0].pattern);
        expect(result.length).toBe(results[0].length);
        expect(result.complexity).toBeCloseTo(results[0].complexity, 5);
      });
    });
  });
});
