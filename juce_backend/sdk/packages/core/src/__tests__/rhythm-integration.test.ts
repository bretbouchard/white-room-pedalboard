/**
 * Integration tests for the Rhythm API
 * Tests the complete rhythm API functionality including offline mode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RhythmAPI } from '../rhythm';
import { SchillingerSDK } from '../client';

describe('RhythmAPI Integration', () => {
  let sdk: SchillingerSDK;
  let rhythmAPI: RhythmAPI;

  beforeEach(() => {
    // Create a real SDK instance in offline mode for testing
    sdk = new SchillingerSDK({
      offlineMode: true,
      cacheEnabled: true,
    });
    rhythmAPI = sdk.rhythm;
  });

  describe('Complete Rhythm Workflow', () => {
    it('should generate, analyze, and reverse-engineer rhythm patterns', async () => {
      // Step 1: Generate a rhythmic resultant
      const resultant = await rhythmAPI.generateResultant(3, 2);

      expect(resultant).toBeDefined();
      expect(resultant.durations).toBeInstanceOf(Array);
      expect(resultant.durations.length).toBeGreaterThan(0);
      expect(resultant.timeSignature).toEqual([4, 4]);
      expect(resultant.metadata?.generators).toEqual([3, 2]);

      // Step 2: Analyze the generated pattern
      const analysis = await rhythmAPI.analyzePattern(resultant);

      expect(analysis).toBeDefined();
      expect(typeof analysis.complexity).toBe('number');
      expect(typeof analysis.syncopation).toBe('number');
      expect(typeof analysis.density).toBe('number');
      expect(analysis.patterns).toBeInstanceOf(Array);
      expect(analysis.suggestions).toBeInstanceOf(Array);

      // Step 3: Create variations of the pattern
      const retrograde = await rhythmAPI.generateVariation(
        resultant,
        'retrograde'
      );
      expect(retrograde.durations).toEqual([...resultant.durations].reverse());

      const augmentation = await rhythmAPI.generateVariation(
        resultant,
        'augmentation',
        { factor: 2 }
      );
      // Augmentation should generally increase durations (but may include zeros for rests)
      expect(augmentation.durations.length).toBeGreaterThanOrEqual(
        resultant.durations.length
      );

      // Step 4: Reverse-engineer the original pattern
      const inference = await rhythmAPI.inferGenerators(resultant);

      expect(inference).toBeDefined();
      // Generators might be in different order, so check both possibilities
      expect(
        (inference.generators[0] === 3 && inference.generators[1] === 2) ||
          (inference.generators[0] === 2 && inference.generators[1] === 3)
      ).toBe(true);
      expect(inference.confidence).toBeGreaterThan(0);

      // Step 5: Encode the pattern into Schillinger parameters
      const encoding = await rhythmAPI.encodePattern(resultant);

      expect(encoding).toBeDefined();
      expect(encoding.type).toBe('rhythm');
      expect(encoding.confidence).toBeGreaterThan(0);
      // Generators might be in different order
      const [gen1, gen2] = encoding.parameters.generators;
      expect((gen1 === 3 && gen2 === 2) || (gen1 === 2 && gen2 === 3)).toBe(
        true
      );

      // Step 6: Find best fits for a target pattern
      const matches = await rhythmAPI.findBestFit(resultant, { maxResults: 3 });

      expect(matches).toBeInstanceOf(Array);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBeGreaterThan(0.5);
      // Generators might be in different order
      const [match1, match2] = matches[0].generators;
      expect(
        (match1 === 3 && match2 === 2) || (match1 === 2 && match2 === 3)
      ).toBe(true);
    });

    it('should handle complex rhythm generation and analysis', async () => {
      // Generate a complex rhythm pattern
      const complexPattern = await rhythmAPI.generateComplex({
        generators: [5, 3],
        tempo: 140,
        swing: 0.1,
        complexity: 0.7,
      });

      expect(complexPattern).toBeDefined();
      expect(complexPattern.tempo).toBe(140);
      expect(complexPattern.swing).toBe(0.1);

      // Analyze the complex pattern
      const complexAnalysis =
        await rhythmAPI.analyzeComplexRhythm(complexPattern);

      expect(complexAnalysis).toBeDefined();
      expect(complexAnalysis.primaryGenerators).toBeInstanceOf(Array);
      expect(complexAnalysis.primaryGenerators.length).toBeGreaterThan(0);
      expect(typeof complexAnalysis.complexityScore).toBe('number');
    });

    it('should validate patterns and provide helpful feedback', () => {
      // Test valid pattern
      const validPattern = {
        durations: [1, 0, 2, 1, 0, 3],
        timeSignature: [4, 4] as [number, number],
        tempo: 120,
      };

      const validResult = rhythmAPI.validatePattern(validPattern);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test invalid pattern
      const invalidPattern = {
        durations: [], // empty
        timeSignature: [4, 3] as [number, number], // invalid denominator
        tempo: 400, // too fast
      };

      const invalidResult = rhythmAPI.validatePattern(invalidPattern);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      // Suggestions may be empty if there are only errors, so just check they exist
      expect(invalidResult.suggestions).toBeInstanceOf(Array);
    });

    it('should calculate comprehensive pattern statistics', () => {
      const pattern = {
        durations: [3, 1, 0, 2, 1, 0, 3, 1],
        timeSignature: [4, 4] as [number, number],
      };

      const stats = rhythmAPI.getPatternStats(pattern);

      expect(stats.totalDuration).toBe(11);
      expect(stats.averageDuration).toBe(1.375);
      expect(stats.uniqueValues).toBe(4); // 0, 1, 2, 3
      expect(stats.density).toBe(0.75); // 6 non-zero out of 8
      expect(stats.complexity).toBeGreaterThan(0);
      expect(stats.syncopation).toBeGreaterThanOrEqual(0);
    });

    it('should handle different input formats for encoding', async () => {
      // Test with array input
      const arrayEncoding = await rhythmAPI.encodePattern([1, 0, 1, 2]);
      expect(arrayEncoding.type).toBe('rhythm');

      // Test with RhythmPattern input
      const patternEncoding = await rhythmAPI.encodePattern({
        durations: [1, 0, 1, 2],
        timeSignature: [4, 4],
      });
      expect(patternEncoding.type).toBe('rhythm');
    });

    it('should work with various rhythm variation types', async () => {
      const basePattern = {
        durations: [1, 2, 1, 2],
        timeSignature: [4, 4] as [number, number],
      };

      // Test all variation types
      const variations = await Promise.all([
        rhythmAPI.generateVariation(basePattern, 'retrograde'),
        rhythmAPI.generateVariation(basePattern, 'rotation', { steps: 1 }),
        rhythmAPI.generateVariation(basePattern, 'augmentation', { factor: 2 }),
        rhythmAPI.generateVariation(basePattern, 'diminution', { factor: 2 }),
        rhythmAPI.generateVariation(basePattern, 'fractioning', {
          divisions: 2,
        }),
      ]);

      variations.forEach((variation, _index) => {
        expect(variation).toBeDefined();
        expect(variation.durations).toBeInstanceOf(Array);
        expect(variation.durations.length).toBeGreaterThan(0);
      });

      // Verify retrograde is actually reversed
      expect(variations[0].durations).toEqual([2, 1, 2, 1]);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Test invalid generators
      await expect(rhythmAPI.generateResultant(0, 2)).rejects.toThrow();
      await expect(rhythmAPI.generateResultant(3, 3)).rejects.toThrow();
      await expect(rhythmAPI.generateResultant(40, 2)).rejects.toThrow();

      // Test invalid patterns
      const invalidPattern = {
        durations: [-1, 2, 3], // negative duration
        timeSignature: [4, 4] as [number, number],
      };

      await expect(rhythmAPI.analyzePattern(invalidPattern)).rejects.toThrow();
      await expect(rhythmAPI.inferGenerators(invalidPattern)).rejects.toThrow();
      await expect(rhythmAPI.encodePattern(invalidPattern)).rejects.toThrow();
      await expect(rhythmAPI.findBestFit(invalidPattern)).rejects.toThrow();
    });

    it('should handle edge cases', async () => {
      // Test with minimal valid pattern
      const minimalPattern = {
        durations: [1],
        timeSignature: [4, 4] as [number, number],
      };

      const analysis = await rhythmAPI.analyzePattern(minimalPattern);
      expect(analysis).toBeDefined();

      const stats = rhythmAPI.getPatternStats(minimalPattern);
      expect(stats.totalDuration).toBe(1);
      expect(stats.density).toBe(1);
    });
  });
});
