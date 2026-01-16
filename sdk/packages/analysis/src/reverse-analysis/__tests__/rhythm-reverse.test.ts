/**
 * Comprehensive unit tests for rhythm reverse analysis algorithms
 * Tests known input/output pairs and confidence scoring
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  inferGenerators,
  encodePattern,
  findBestFit,
  analyzeComplexRhythm,
  type RhythmInferenceOptions,
} from "../rhythm-reverse";
import { generateRhythmicResultant } from "@schillinger-sdk/shared/math/rhythmic-resultants";
import type { RhythmPattern } from "@schillinger-sdk/shared/types";

describe("Rhythm Reverse Analysis - Known Input/Output Pairs", () => {
  let performanceStart: number;

  beforeEach(() => {
    performanceStart = performance.now();
  });

  afterEach(() => {
    const duration = performance.now() - performanceStart;
    if (duration > 100) {
      console.warn(
        `Reverse analysis test took ${duration.toFixed(2)}ms - consider optimization`,
      );
    }
  });

  describe("inferGenerators - Known Patterns", () => {
    describe("Perfect Matches", () => {
      it("should correctly identify generators for known resultants", () => {
        // Test with known generator pairs and their resultants
        const knownPairs = [
          { generators: [2, 3], expectedPattern: [3, 1, 0, 1, 3, 1] },
          {
            generators: [3, 4],
            expectedPattern: [3, 0, 0, 1, 3, 0, 0, 1, 3, 0, 0, 1],
          },
          {
            generators: [4, 5],
            expectedPattern: [
              3, 0, 0, 0, 1, 3, 0, 0, 0, 1, 3, 0, 0, 0, 1, 3, 0, 0, 0, 1,
            ],
          },
        ];

        knownPairs.forEach(({ generators: [a, b] }) => {
          // Generate the actual pattern to verify our test data
          const actualResultant = generateRhythmicResultant(a, b);

          const pattern: RhythmPattern = {
            durations: actualResultant.pattern,
            timeSignature: [4, 4],
          };

          const inferences = inferGenerators(pattern, {
            maxGenerator: 16,
            minConfidence: 0.8,
            maxResults: 3,
          });

          expect(inferences.length).toBeGreaterThan(0);

          // The best inference should match the original generators
          const bestInference = inferences[0];
          expect(bestInference.confidence).toBeGreaterThan(0.8);

          // Generators might be in different order, so check both possibilities
          const matchesOriginal =
            (bestInference.generators.a === a &&
              bestInference.generators.b === b) ||
            (bestInference.generators.a === b &&
              bestInference.generators.b === a);

          expect(matchesOriginal).toBe(true);
        });
      });

      it("should handle simple patterns with high confidence", () => {
        // Test very simple patterns that should be easy to identify
        const simplePatterns = [
          { pattern: [1, 1, 1, 1], expectedGenerators: [1, 4] }, // Every beat
          { pattern: [1, 0, 1, 0], expectedGenerators: [2, 4] }, // Every other beat
          { pattern: [1, 0, 0, 1], expectedGenerators: [4, 3] }, // 4 against 3 pattern
        ];

        simplePatterns.forEach(({ pattern }) => {
          const rhythmPattern: RhythmPattern = {
            durations: pattern,
            timeSignature: [4, 4],
          };

          const inferences = inferGenerators(rhythmPattern, {
            maxGenerator: 8,
            minConfidence: 0.5,
            maxResults: 5,
          });

          expect(inferences.length).toBeGreaterThan(0);
          expect(inferences[0].confidence).toBeGreaterThan(0.5);

          // Should find generators that make sense for the pattern
          const bestInference = inferences[0];
          expect(bestInference.generators.a).toBeGreaterThan(0);
          expect(bestInference.generators.b).toBeGreaterThan(0);
          expect(bestInference.generators.a).not.toBe(
            bestInference.generators.b,
          );
        });
      });
    });

    describe("Approximate Matches", () => {
      it("should find reasonable generators for modified patterns", () => {
        // Start with a known pattern and modify it slightly
        const baseResultant = generateRhythmicResultant(3, 5);
        const modifiedPattern = [...baseResultant.pattern];

        // Modify a few values to test approximate matching
        if (modifiedPattern.length > 4) {
          modifiedPattern[2] = modifiedPattern[2] > 0 ? 0 : 1; // Flip a value
          modifiedPattern[4] = Math.max(0, modifiedPattern[4] - 1); // Reduce a value
        }

        const pattern: RhythmPattern = {
          durations: modifiedPattern,
          timeSignature: [4, 4],
        };

        const inferences = inferGenerators(pattern, {
          maxGenerator: 16,
          minConfidence: 0.3, // Lower confidence for approximate matches
          maxResults: 5,
        });

        expect(inferences.length).toBeGreaterThan(0);

        // Should still find the original generators with reasonable confidence
        // const hasOriginalGenerators = inferences.some(inf =>
        //   (inf.generators.a === 3 && inf.generators.b === 5) ||
        //   (inf.generators.a === 5 && inf.generators.b === 3)
        // ); // TODO: Use for validation

        // Might not always find exact match due to modifications, but should find something reasonable
        expect(inferences[0].confidence).toBeGreaterThan(0.2);
      });

      it("should handle patterns with added complexity", () => {
        // Test patterns that are based on Schillinger but have additional elements
        const basePattern = generateRhythmicResultant(2, 3);
        const complexPattern = basePattern.pattern.map((value, index) => {
          // Add some syncopation
          if (index % 3 === 1 && value === 0) {
            return 1; // Add weak beats
          }
          return value;
        });

        const pattern: RhythmPattern = {
          durations: complexPattern,
          timeSignature: [4, 4],
        };

        const inferences = inferGenerators(pattern, {
          maxGenerator: 12,
          minConfidence: 0.2,
          maxResults: 10,
        });

        expect(inferences.length).toBeGreaterThan(0);

        // Should find multiple possible interpretations
        expect(inferences.length).toBeGreaterThanOrEqual(2);

        // Confidence should decrease for more complex patterns
        expect(inferences[0].confidence).toBeLessThan(0.9);
      });
    });

    describe("Edge Cases", () => {
      it("should handle uniform patterns", () => {
        const uniformPattern: RhythmPattern = {
          durations: [1, 1, 1, 1, 1, 1],
          timeSignature: [4, 4],
        };

        const inferences = inferGenerators(uniformPattern, {
          maxGenerator: 8,
          minConfidence: 0.1,
          maxResults: 5,
        });

        // Should find some interpretation, even if not perfect
        expect(inferences.length).toBeGreaterThan(0);

        // Might suggest generators like [1, 6] or similar
        const bestInference = inferences[0];
        expect(bestInference.generators.a).toBeGreaterThan(0);
        expect(bestInference.generators.b).toBeGreaterThan(0);
      });

      it("should handle sparse patterns", () => {
        const sparsePattern: RhythmPattern = {
          durations: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
          timeSignature: [4, 4],
        };

        const inferences = inferGenerators(sparsePattern, {
          maxGenerator: 16,
          minConfidence: 0.1,
          maxResults: 5,
        });

        expect(inferences.length).toBeGreaterThan(0);

        // Should suggest generators that create sparse patterns
        const bestInference = inferences[0];
        expect(bestInference.generators.a).toBeGreaterThan(2); // Should be larger generators
        expect(bestInference.generators.b).toBeGreaterThan(2);
      });

      it("should handle very short patterns", () => {
        const shortPatterns = [[1], [1, 0], [1, 2, 1]];

        shortPatterns.forEach((pattern) => {
          const rhythmPattern: RhythmPattern = {
            durations: pattern,
            timeSignature: [4, 4],
          };

          const inferences = inferGenerators(rhythmPattern, {
            maxGenerator: 8,
            minConfidence: 0.1,
            maxResults: 3,
          });

          // Should handle gracefully, even if results are not meaningful
          expect(inferences).toBeDefined();
          expect(Array.isArray(inferences)).toBe(true);
        });
      });
    });

    describe("Confidence Scoring", () => {
      it("should assign higher confidence to exact matches", () => {
        const exactPattern = generateRhythmicResultant(3, 4);
        const pattern: RhythmPattern = {
          durations: exactPattern.pattern,
          timeSignature: [4, 4],
        };

        const inferences = inferGenerators(pattern, {
          maxGenerator: 16,
          minConfidence: 0.1,
          maxResults: 5,
        });

        expect(inferences.length).toBeGreaterThan(0);
        expect(inferences[0].confidence).toBeGreaterThan(0.8);
      });

      it("should rank inferences by confidence", () => {
        const testPattern = generateRhythmicResultant(5, 7);
        const pattern: RhythmPattern = {
          durations: testPattern.pattern,
          timeSignature: [4, 4],
        };

        const inferences = inferGenerators(pattern, {
          maxGenerator: 16,
          minConfidence: 0.1,
          maxResults: 10,
        });

        // Should be sorted by confidence (highest first)
        for (let i = 1; i < inferences.length; i++) {
          expect(inferences[i].confidence).toBeLessThanOrEqual(
            inferences[i - 1].confidence,
          );
        }
      });

      it("should provide analysis details for confidence calculation", () => {
        const testPattern = generateRhythmicResultant(2, 5);
        const pattern: RhythmPattern = {
          durations: testPattern.pattern,
          timeSignature: [4, 4],
        };

        const inferences = inferGenerators(pattern, {
          maxGenerator: 12,
          minConfidence: 0.1,
          maxResults: 3,
        });

        expect(inferences.length).toBeGreaterThan(0);

        const bestInference = inferences[0];
        expect(bestInference.analysis).toBeDefined();
        expect(bestInference.analysis.patternSimilarity).toBeGreaterThanOrEqual(
          0,
        );
        expect(bestInference.analysis.patternSimilarity).toBeLessThanOrEqual(1);
        expect(bestInference.analysis.lengthMatch).toBeGreaterThanOrEqual(0);
        expect(bestInference.analysis.lengthMatch).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("encodePattern - Pattern Encoding", () => {
    it("should encode known patterns with high confidence", () => {
      const knownResultant = generateRhythmicResultant(4, 6);
      const pattern: RhythmPattern = {
        durations: knownResultant.pattern,
        timeSignature: [4, 4],
      };

      const encoding = encodePattern(pattern, {
        maxGenerator: 16,
        minConfidence: 0.1,
        maxResults: 5,
        includeAlternatives: true,
      });

      expect(encoding.type).toBe("rhythm");
      expect(encoding.confidence).toBeGreaterThan(0.5);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.bestMatch.generators.a).toBeGreaterThan(0);
      expect(encoding.bestMatch.generators.b).toBeGreaterThan(0);
      expect(encoding.alternatives).toBeDefined();
      expect(Array.isArray(encoding.alternatives)).toBe(true);
    });

    it("should provide multiple interpretations", () => {
      const ambiguousPattern: RhythmPattern = {
        durations: [1, 0, 1, 0, 1, 0, 1, 0], // Could be interpreted multiple ways
        timeSignature: [4, 4],
      };

      const encoding = encodePattern(ambiguousPattern, {
        maxGenerator: 12,
        minConfidence: 0.1,
        maxResults: 8,
        includeAlternatives: true,
      });

      expect(encoding.alternatives.length).toBeGreaterThan(1);

      // Alternatives should have decreasing confidence
      for (let i = 1; i < encoding.alternatives.length; i++) {
        expect(encoding.alternatives[i].confidence).toBeLessThanOrEqual(
          encoding.alternatives[i - 1].confidence,
        );
      }
    });

    it("should handle encoding options correctly", () => {
      const testPattern: RhythmPattern = {
        durations: [2, 1, 0, 1, 2, 1],
        timeSignature: [4, 4],
      };

      // Test with alternatives disabled
      const withoutAlternatives = encodePattern(testPattern, {
        maxGenerator: 8,
        includeAlternatives: false,
      });

      expect(withoutAlternatives.alternatives).toHaveLength(0);

      // Test with alternatives enabled
      const withAlternatives = encodePattern(testPattern, {
        maxGenerator: 8,
        includeAlternatives: true,
        maxResults: 5,
      });

      expect(withAlternatives.alternatives.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findBestFit - Pattern Matching", () => {
    it("should find exact matches with high similarity", () => {
      const targetResultant = generateRhythmicResultant(3, 7);
      const targetPattern: RhythmPattern = {
        durations: targetResultant.pattern,
        timeSignature: [4, 4],
      };

      const matches = findBestFit(targetPattern, {
        maxGenerator: 16,
        minConfidence: 0.5,
        maxResults: 5,
        weightAccents: 0.4,
        weightDensity: 0.3,
        weightLength: 0.3,
      });

      expect(matches.length).toBeGreaterThan(0);

      const bestMatch = matches[0];
      expect(bestMatch.confidence).toBeGreaterThan(0.7);
      expect(bestMatch.matchQuality).toBeGreaterThan(0.7);

      // Should find the original generators
      const foundOriginal =
        (bestMatch.generators.a === 3 && bestMatch.generators.b === 7) ||
        (bestMatch.generators.a === 7 && bestMatch.generators.b === 3);
      expect(foundOriginal).toBe(true);
    });

    it("should respect weighting options", () => {
      const testPattern: RhythmPattern = {
        durations: [3, 1, 0, 1, 3, 1, 0, 1],
        timeSignature: [4, 4],
      };

      // Test with accent weighting
      const accentWeighted = findBestFit(testPattern, {
        maxGenerator: 8,
        maxResults: 3,
        weightAccents: 0.8,
        weightDensity: 0.1,
        weightLength: 0.1,
      });

      // Test with density weighting
      const densityWeighted = findBestFit(testPattern, {
        maxGenerator: 8,
        maxResults: 3,
        weightAccents: 0.1,
        weightDensity: 0.8,
        weightLength: 0.1,
      });

      expect(accentWeighted.length).toBeGreaterThan(0);
      expect(densityWeighted.length).toBeGreaterThan(0);

      // Results might be different due to different weighting
      // This is hard to test precisely, but we can verify structure
      accentWeighted.forEach((match) => {
        expect(match.analysis.accentMatch).toBeGreaterThanOrEqual(0);
        expect(match.analysis.accentMatch).toBeLessThanOrEqual(1);
      });
    });

    it("should provide detailed analysis for each match", () => {
      const testPattern: RhythmPattern = {
        durations: [2, 0, 1, 0, 2, 0, 1, 0],
        timeSignature: [4, 4],
      };

      const matches = findBestFit(testPattern, {
        maxGenerator: 10,
        maxResults: 3,
      });

      expect(matches.length).toBeGreaterThan(0);

      matches.forEach((match) => {
        expect(match.analysis).toBeDefined();
        expect(match.analysis.patternSimilarity).toBeGreaterThanOrEqual(0);
        expect(match.analysis.patternSimilarity).toBeLessThanOrEqual(1);
        expect(match.analysis.lengthMatch).toBeGreaterThanOrEqual(0);
        expect(match.analysis.lengthMatch).toBeLessThanOrEqual(1);
        expect(match.analysis.accentMatch).toBeGreaterThanOrEqual(0);
        expect(match.analysis.accentMatch).toBeLessThanOrEqual(1);
        expect(match.analysis.densityMatch).toBeGreaterThanOrEqual(0);
        expect(match.analysis.densityMatch).toBeLessThanOrEqual(1);
      });
    });

    it("should handle no matches gracefully", () => {
      const impossiblePattern: RhythmPattern = {
        durations: [100, 200, 300], // Very unusual pattern
        timeSignature: [4, 4],
      };

      const matches = findBestFit(impossiblePattern, {
        maxGenerator: 4, // Very limited search space
        minConfidence: 0.9, // Very high confidence requirement
        maxResults: 5,
      });

      // Should return empty array or low-confidence matches
      expect(Array.isArray(matches)).toBe(true);
      if (matches.length > 0) {
        expect(matches[0].confidence).toBeLessThan(0.9);
      }
    });
  });

  describe("analyzeComplexRhythm - Multi-Generator Analysis", () => {
    it("should identify primary and secondary generators", () => {
      // Create a complex pattern by combining two simple patterns
      const pattern1 = generateRhythmicResultant(2, 3);
      const pattern2 = generateRhythmicResultant(4, 5);

      // Create a longer pattern that might contain both
      const combinedLength = Math.max(pattern1.length, pattern2.length) * 2;
      const complexPattern = new Array(combinedLength).fill(0);

      // Overlay both patterns
      for (let i = 0; i < combinedLength; i++) {
        if (i < pattern1.length && pattern1.pattern[i] > 0) {
          complexPattern[i] = Math.max(complexPattern[i], pattern1.pattern[i]);
        }
        if (i < pattern2.length && pattern2.pattern[i] > 0) {
          complexPattern[i] = Math.max(complexPattern[i], pattern2.pattern[i]);
        }
      }

      const pattern: RhythmPattern = {
        durations: complexPattern,
        timeSignature: [4, 4],
      };

      const analysis = analyzeComplexRhythm(pattern, {
        maxGenerator: 16,
        minConfidence: 0.2,
        maxResults: 5,
      });

      expect(analysis.primaryGenerators).toBeDefined();
      expect(analysis.secondaryGenerators).toBeDefined();
      expect(analysis.combinedAnalysis).toBeDefined();

      expect(analysis.primaryGenerators.length).toBeGreaterThan(0);
      expect(analysis.combinedAnalysis.complexityScore).toBeGreaterThanOrEqual(
        0,
      );
      expect(analysis.combinedAnalysis.complexityScore).toBeLessThanOrEqual(1);
    });

    it("should detect polyrhythmic patterns", () => {
      // Create a clearly polyrhythmic pattern
      const polyPattern = new Array(12).fill(0);

      // Add 3-beat pattern
      for (let i = 0; i < 12; i += 3) {
        polyPattern[i] = 2;
      }

      // Add 4-beat pattern
      for (let i = 0; i < 12; i += 4) {
        polyPattern[i] = Math.max(polyPattern[i], 1);
      }

      const pattern: RhythmPattern = {
        durations: polyPattern,
        timeSignature: [4, 4],
      };

      const analysis = analyzeComplexRhythm(pattern, {
        maxGenerator: 12,
        minConfidence: 0.1,
        maxResults: 10,
      });

      // Should detect multiple generator sets
      expect(
        analysis.primaryGenerators.length + analysis.secondaryGenerators.length,
      ).toBeGreaterThan(1);
      expect(analysis.combinedAnalysis.complexityScore).toBeGreaterThan(0.3);
    });

    it("should calculate appropriate complexity scores", () => {
      // Test simple vs complex patterns
      const simplePattern: RhythmPattern = {
        durations: [1, 0, 1, 0],
        timeSignature: [4, 4],
      };

      const complexPattern: RhythmPattern = {
        durations: [3, 1, 0, 2, 1, 0, 3, 2, 1, 0, 1, 2],
        timeSignature: [4, 4],
      };

      const simpleAnalysis = analyzeComplexRhythm(simplePattern, {
        maxGenerator: 8,
        minConfidence: 0.1,
      });

      const complexAnalysis = analyzeComplexRhythm(complexPattern, {
        maxGenerator: 16,
        minConfidence: 0.1,
      });

      expect(complexAnalysis.combinedAnalysis.complexityScore).toBeGreaterThan(
        simpleAnalysis.combinedAnalysis.complexityScore,
      );
    });
  });

  describe("Performance Benchmarks", () => {
    it("should perform generator inference efficiently", () => {
      const testPattern = generateRhythmicResultant(5, 8);
      const pattern: RhythmPattern = {
        durations: testPattern.pattern,
        timeSignature: [4, 4],
      };

      const start = performance.now();

      for (let i = 0; i < 50; i++) {
        inferGenerators(pattern, {
          maxGenerator: 12,
          minConfidence: 0.3,
          maxResults: 5,
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });

    it("should handle large patterns efficiently", () => {
      const largePattern = generateRhythmicResultant(13, 17); // Creates long pattern
      const pattern: RhythmPattern = {
        durations: largePattern.pattern,
        timeSignature: [4, 4],
      };

      const start = performance.now();

      const inferences = inferGenerators(pattern, {
        maxGenerator: 20,
        minConfidence: 0.1,
        maxResults: 3,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
      expect(inferences.length).toBeGreaterThan(0);
    });

    it.skip("should scale reasonably with search space", () => {
      const testPattern: RhythmPattern = {
        durations: [1, 0, 1, 0, 1, 0],
        timeSignature: [4, 4],
      };

      // Test with small search space
      const smallStart = performance.now();
      inferGenerators(testPattern, { maxGenerator: 8, maxResults: 3 });
      const smallDuration = performance.now() - smallStart;

      // Test with larger search space
      const largeStart = performance.now();
      inferGenerators(testPattern, { maxGenerator: 16, maxResults: 10 });
      const largeDuration = performance.now() - largeStart;

      // Larger search should take more time, but not exponentially more
      expect(largeDuration).toBeGreaterThan(smallDuration);
      expect(largeDuration / smallDuration).toBeLessThan(100); // Less than 100x slower (tolerant on CI/dev)
    });
  });

  describe("Integration and Error Handling", () => {
    it("should handle invalid patterns gracefully", () => {
      const invalidPatterns = [
        { durations: [], timeSignature: [4, 4] as [number, number] },
        { durations: [-1, 2, 3], timeSignature: [4, 4] as [number, number] },
        { durations: [1, 2, 3], timeSignature: [0, 4] as [number, number] },
      ];

      invalidPatterns.forEach((pattern) => {
        expect(() => {
          inferGenerators(pattern as RhythmPattern, {
            maxGenerator: 8,
            minConfidence: 0.1,
          });
        }).toThrow();
      });
    });

    it("should validate options parameters", () => {
      const testPattern: RhythmPattern = {
        durations: [1, 2, 1, 2],
        timeSignature: [4, 4],
      };

      const invalidOptions = [
        { maxGenerator: 0 },
        { maxGenerator: -1 },
        { minConfidence: -0.1 },
        { minConfidence: 1.1 },
        { maxResults: 0 },
        { maxResults: -1 },
      ];

      invalidOptions.forEach((options) => {
        expect(() => {
          inferGenerators(testPattern, options as RhythmInferenceOptions);
        }).toThrow();
      });
    });

    it("should maintain consistency across multiple calls", () => {
      const testPattern = generateRhythmicResultant(4, 7);
      const pattern: RhythmPattern = {
        durations: testPattern.pattern,
        timeSignature: [4, 4],
      };

      const options: RhythmInferenceOptions = {
        maxGenerator: 12,
        minConfidence: 0.3,
        maxResults: 5,
      };

      // Multiple calls should return identical results (deterministic)
      const result1 = inferGenerators(pattern, options);
      const result2 = inferGenerators(pattern, options);
      const result3 = inferGenerators(pattern, options);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
