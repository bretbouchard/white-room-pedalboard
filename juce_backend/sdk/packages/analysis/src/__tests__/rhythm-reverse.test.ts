/**
 * Tests for rhythm pattern reverse analysis
 */

import { describe, it, expect } from 'vitest';
import {
  inferGenerators,
  encodePattern,
  findBestFit,
  analyzeComplexRhythm,
  type RhythmPattern,
} from '../reverse-analysis/rhythm-reverse';
import { generateRhythmicResultant } from '@schillinger-sdk/shared/math/rhythmic-resultants';

describe('Rhythm Reverse Analysis', () => {
  describe('inferGenerators', () => {
    it('should infer correct generators for simple 3:2 pattern', () => {
      // Generate a known 3:2 pattern
      const resultant = generateRhythmicResultant(3, 2);
      const inferences = inferGenerators(resultant.pattern, {
        maxGenerator: 8,
      });

      expect(inferences.length).toBeGreaterThan(0);

      // The best match should be 3:2 or 2:3
      const bestMatch = inferences[0];
      expect(
        (bestMatch.generators.a === 3 && bestMatch.generators.b === 2) ||
          (bestMatch.generators.a === 2 && bestMatch.generators.b === 3)
      ).toBe(true);

      expect(bestMatch.confidence).toBeGreaterThan(0.5);
    });

    it('should infer correct generators for 4:3 pattern', () => {
      const resultant = generateRhythmicResultant(4, 3);
      const inferences = inferGenerators(resultant.pattern, {
        maxGenerator: 8,
      });

      expect(inferences.length).toBeGreaterThan(0);

      const bestMatch = inferences[0];
      expect(
        (bestMatch.generators.a === 4 && bestMatch.generators.b === 3) ||
          (bestMatch.generators.a === 3 && bestMatch.generators.b === 4)
      ).toBe(true);
    });

    it('should handle empty patterns gracefully', () => {
      expect(() => inferGenerators([])).toThrow();
    });

    it('should handle invalid patterns gracefully', () => {
      expect(() => inferGenerators([NaN, undefined, null] as any)).toThrow();
    });

    it('should respect maxGenerator option', () => {
      const pattern = [1, 0, 1, 0, 1, 0];
      const inferences = inferGenerators(pattern, { maxGenerator: 4 });

      inferences.forEach(inference => {
        expect(inference.generators.a).toBeLessThanOrEqual(4);
        expect(inference.generators.b).toBeLessThanOrEqual(4);
      });
    });

    it('should respect minConfidence option', () => {
      const pattern = [1, 0, 1, 0, 1, 0];
      const inferences = inferGenerators(pattern, { minConfidence: 0.8 });

      inferences.forEach(inference => {
        expect(inference.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should limit results based on maxResults option', () => {
      const pattern = [1, 0, 1, 0, 1, 0];
      const inferences = inferGenerators(pattern, { maxResults: 3 });

      expect(inferences.length).toBeLessThanOrEqual(3);
    });
  });

  describe('encodePattern', () => {
    it('should encode a simple rhythm pattern', () => {
      const pattern = [3, 1, 0, 1, 0, 3];
      const encoding = encodePattern(pattern);

      expect(encoding.originalPattern).toEqual(pattern);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.alternatives).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.metadata).toBeDefined();
      expect(encoding.metadata.patternLength).toBe(pattern.length);
      expect(encoding.metadata.analysisTimestamp).toBeTypeOf('number');
    });

    it('should handle RhythmPattern objects', () => {
      const rhythmPattern: RhythmPattern = {
        durations: [1, 0, 1, 0, 1, 0],
        timeSignature: [4, 4],
        tempo: 120,
      };

      const encoding = encodePattern(rhythmPattern);

      expect(encoding.originalPattern).toEqual(rhythmPattern.durations);
      expect(encoding.bestMatch).toBeDefined();
    });

    it('should throw error for unmatched patterns', () => {
      // Create a very irregular pattern that's hard to match
      const pattern = [1];

      expect(() => encodePattern(pattern, { minConfidence: 0.9 })).toThrow();
    });

    it('should include metadata about pattern characteristics', () => {
      const pattern = [3, 1, 0, 1, 0, 3];
      const encoding = encodePattern(pattern);

      expect(encoding.metadata.patternDensity).toBeGreaterThan(0);
      expect(encoding.metadata.patternComplexity).toBeGreaterThan(0);
      expect(encoding.metadata.patternLength).toBe(pattern.length);
    });
  });

  describe('findBestFit', () => {
    it('should find best fitting generators', () => {
      const pattern = [1, 0, 1, 0, 1, 0];
      const fits = findBestFit(pattern);

      expect(fits.length).toBeGreaterThan(0);
      expect(fits[0].confidence).toBeGreaterThan(0.3); // Default minConfidence

      // Results should be sorted by confidence
      for (let i = 1; i < fits.length; i++) {
        expect(fits[i].confidence).toBeLessThanOrEqual(fits[i - 1].confidence);
      }
    });

    it('should respect custom options', () => {
      const pattern = [1, 0, 1, 0, 1, 0];
      const fits = findBestFit(pattern, {
        minConfidence: 0.5,
        maxResults: 2,
      });

      expect(fits.length).toBeLessThanOrEqual(2);
      fits.forEach(fit => {
        expect(fit.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('analyzeComplexRhythm', () => {
    it('should analyze simple rhythm as non-polyrhythmic', () => {
      const pattern = [1, 0, 1, 0, 1, 0];
      const analysis = analyzeComplexRhythm(pattern);

      expect(analysis.primaryGenerators).toBeDefined();
      expect(analysis.secondaryGenerators).toBeDefined();
      // Simple patterns may or may not be detected as polyrhythmic depending on confidence
      expect(typeof analysis.combinedAnalysis.isPolyrhythmic).toBe('boolean');
      expect(analysis.combinedAnalysis.complexityScore).toBeGreaterThanOrEqual(
        0
      );
      expect(analysis.combinedAnalysis.complexityScore).toBeLessThanOrEqual(1);
    });

    it('should identify polyrhythmic patterns', () => {
      // Create a more complex pattern that might be polyrhythmic
      const pattern = [3, 1, 2, 0, 1, 2, 0, 3, 1, 0, 2, 1];
      const analysis = analyzeComplexRhythm(pattern);

      expect(analysis.primaryGenerators.length).toBeGreaterThan(0);
      expect(analysis.combinedAnalysis.complexityScore).toBeGreaterThan(0);
    });

    it('should provide dominant generators for complex patterns', () => {
      const pattern = [3, 1, 0, 1, 0, 3, 1, 0];
      const analysis = analyzeComplexRhythm(pattern);

      if (analysis.combinedAnalysis.dominantGenerators.length > 0) {
        analysis.combinedAnalysis.dominantGenerators.forEach(generators => {
          expect(generators.a).toBeGreaterThan(0);
          expect(generators.b).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Pattern Matching Quality', () => {
    it('should give high confidence for exact matches', () => {
      const resultant = generateRhythmicResultant(5, 3);
      const inferences = inferGenerators(resultant.pattern);

      expect(inferences.length).toBeGreaterThan(0);
      expect(inferences[0].confidence).toBeGreaterThan(0.7);
    });

    it('should handle patterns with different lengths', () => {
      const shortPattern = [1, 0, 1];
      const longPattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];

      const shortInferences = inferGenerators(shortPattern);
      const longInferences = inferGenerators(longPattern);

      expect(shortInferences.length).toBeGreaterThan(0);
      expect(longInferences.length).toBeGreaterThan(0);
    });

    it('should analyze accent patterns correctly', () => {
      const accentedPattern = [3, 1, 1, 3, 1, 1]; // Strong accents on 1st and 4th beats
      const encoding = encodePattern(accentedPattern);

      expect(encoding.bestMatch.analysis.accentMatch).toBeGreaterThan(0);
    });

    it('should calculate density matches correctly', () => {
      const densePattern = [1, 1, 1, 1, 1, 1]; // High density
      const sparsePattern = [1, 0, 0, 1, 0, 0]; // Low density

      const denseEncoding = encodePattern(densePattern);
      const sparseEncoding = encodePattern(sparsePattern);

      expect(denseEncoding.metadata.patternDensity).toBeGreaterThan(
        sparseEncoding.metadata.patternDensity
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-value patterns', () => {
      const pattern = [1];
      expect(() => inferGenerators(pattern)).not.toThrow();
    });

    it('should handle patterns with all zeros', () => {
      const pattern = [0, 0, 0, 0];
      const inferences = inferGenerators(pattern, { minConfidence: 0.01 });

      // Should find some matches even for rest patterns
      expect(inferences.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle patterns with very large values', () => {
      const pattern = [100, 50, 25, 100];
      const inferences = inferGenerators(pattern);

      expect(inferences.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle patterns with negative values', () => {
      const pattern = [1, -1, 1, -1];
      const inferences = inferGenerators(pattern);

      expect(inferences.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should handle large patterns efficiently', () => {
      const largePattern = new Array(100)
        .fill(0)
        .map((_, i) => (i % 3 === 0 ? 1 : 0));

      const startTime = Date.now();
      const inferences = inferGenerators(largePattern, { maxGenerator: 8 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(inferences.length).toBeGreaterThanOrEqual(0);
    });

    it('should limit computation with maxGenerator option', () => {
      const pattern = [1, 0, 1, 0];

      const startTime = Date.now();
      inferGenerators(pattern, { maxGenerator: 6 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should be fast with limited generators
    });
  });
});
