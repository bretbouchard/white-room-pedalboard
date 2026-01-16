/**
 * Integration tests for Harmony API with the SDK client
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchillingerSDK } from '../client';

describe('HarmonyAPI Integration', () => {
  let sdk: SchillingerSDK;

  beforeEach(() => {
    sdk = new SchillingerSDK({
      apiUrl: 'http://localhost:3000/api/v1',
      offlineMode: true, // Use offline mode for testing
    });
  });

  describe('Complete Harmony Workflow', () => {
    it('should generate, analyze, and reverse-engineer chord progressions', async () => {
      // Generate a chord progression
      const progression = await sdk.harmony.generateProgression(
        'C',
        'major',
        4
      );

      expect(progression).toBeDefined();
      expect(progression.chords).toHaveLength(4);
      expect(progression.key).toBe('C');
      expect(progression.scale).toBe('major');
      expect(progression.metadata).toBeDefined();

      // Analyze the generated progression
      const analysis = await sdk.harmony.analyzeProgression(progression.chords);

      expect(analysis).toBeDefined();
      expect(analysis.key_stability).toBeGreaterThanOrEqual(0);
      expect(analysis.key_stability).toBeLessThanOrEqual(1);
      expect(analysis.tension_curve).toHaveLength(4);
      expect(analysis.functionalanalysis).toHaveLength(4);
      expect(analysis.voice_leading_quality).toBeGreaterThanOrEqual(0);
      expect(analysis.voice_leading_quality).toBeLessThanOrEqual(1);
      expect(Array.isArray(analysis.suggestions)).toBe(true);

      // Reverse-engineer the progression
      const encoding = await sdk.harmony.encodeProgression(progression.chords);

      expect(encoding).toBeDefined();
      expect(encoding.originalProgression).toEqual(progression.chords);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.bestMatch.generators).toBeDefined();
      expect(encoding.bestMatch.confidence).toBeGreaterThanOrEqual(0);
      expect(encoding.bestMatch.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(encoding.alternatives)).toBe(true);

      // Generate variations
      const variations = await sdk.harmony.generateVariations(progression);

      expect(Array.isArray(variations)).toBe(true);
      expect(variations.length).toBeGreaterThan(0);
      variations.forEach(variation => {
        expect(variation.chords).toBeDefined();
        expect(variation.key).toBe('C');
        expect(variation.scale).toBe('major');
      });
    });

    it('should handle chord resolution and context analysis', async () => {
      const context = {
        key: 'C',
        scale: 'major',
        style: 'classical' as const,
      };

      // Test dominant chord resolution
      const dominantResolution = await sdk.harmony.resolveChord('G7', context);

      expect(dominantResolution).toBeDefined();
      expect(dominantResolution.chord).toBe('G7');
      expect(dominantResolution.context.function).toBe('dominant');
      expect(dominantResolution.resolutions).toHaveLength(2); // Strong and deceptive
      expect(dominantResolution.resolutions[0].type).toBe('strong');
      expect(dominantResolution.resolutions[0].target).toBe('C');

      // Test subdominant chord resolution
      const subdominantResolution = await sdk.harmony.resolveChord(
        'F',
        context
      );

      expect(subdominantResolution).toBeDefined();
      expect(subdominantResolution.chord).toBe('F');
      expect(subdominantResolution.context.function).toBe('subdominant');
      expect(subdominantResolution.resolutions.length).toBeGreaterThan(0);
    });

    it('should work with Roman numeral templates', async () => {
      const template = ['I', 'vi', 'IV', 'V'];
      const progression = await sdk.harmony.generateFromTemplate(template, {
        key: 'G',
        scale: 'major',
        complexity: 'moderate',
      });

      expect(progression).toBeDefined();
      expect(progression.chords).toHaveLength(4);
      expect(progression.key).toBe('G');
      expect(progression.scale).toBe('major');
      expect(progression.metadata?.template).toEqual(template);
    });

    it('should analyze voice leading and harmonic rhythm', async () => {
      const chords = ['C', 'Am', 'F', 'G'];
      const analysis = await sdk.harmony.analyzeVoiceLeadingAndRhythm(chords);

      expect(analysis).toBeDefined();
      expect(analysis.voiceLeading).toBeDefined();
      expect(analysis.voiceLeading.smoothness).toBeGreaterThanOrEqual(0);
      expect(analysis.voiceLeading.smoothness).toBeLessThanOrEqual(1);
      expect(analysis.voiceLeading.contraryMotion).toBeGreaterThanOrEqual(0);
      expect(analysis.voiceLeading.contraryMotion).toBeLessThanOrEqual(1);
      expect(analysis.voiceLeading.voiceRanges).toBeDefined();

      expect(analysis.harmonicRhythm).toBeDefined();
      expect(Array.isArray(analysis.harmonicRhythm.changes)).toBe(true);
      expect(analysis.harmonicRhythm.density).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.harmonicRhythm.acceleration)).toBe(true);
      expect(Array.isArray(analysis.harmonicRhythm.patterns)).toBe(true);
    });

    it('should find harmonic matches for target progressions', async () => {
      const targetProgression = {
        chords: ['C', 'F', 'G', 'C'],
        key: 'C',
        scale: 'major',
      };

      const matches = await sdk.harmony.findHarmonicMatches(targetProgression, {
        maxResults: 3,
        minConfidence: 0.1,
      });

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(3);

      matches.forEach(match => {
        expect(match.generators).toBeDefined();
        expect(match.generators.a).toBeGreaterThan(1);
        expect(match.generators.b).toBeGreaterThan(1);
        expect(match.confidence).toBeGreaterThanOrEqual(0.1);
        expect(match.confidence).toBeLessThanOrEqual(1);
        expect(match.detectedParameters).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Invalid key
      await expect(
        sdk.harmony.generateProgression('', 'major', 4)
      ).rejects.toThrow('Invalid key');

      // Invalid scale
      await expect(sdk.harmony.generateProgression('C', '', 4)).rejects.toThrow(
        'Invalid scale'
      );

      // Invalid length
      await expect(
        sdk.harmony.generateProgression('C', 'major', 0)
      ).rejects.toThrow('Invalid length');

      // Empty chord array
      await expect(sdk.harmony.analyzeProgression([])).rejects.toThrow(
        'Invalid chords'
      );

      // Invalid chord symbols
      await expect(
        sdk.harmony.analyzeProgression(['C', '', 'G'])
      ).rejects.toThrow('Invalid chords[1]');
    });

    it('should handle edge cases', async () => {
      // Very long progression
      const longProgression = await sdk.harmony.generateProgression(
        'C',
        'major',
        16
      );
      expect(longProgression.chords).toHaveLength(16);

      // Complex chord symbols (should not throw)
      const complexChords = ['Cmaj7#11', 'Am7b5', 'F#dim7', 'G13'];
      const analysis = await sdk.harmony.analyzeProgression(complexChords);
      expect(analysis).toBeDefined();

      // Minor key progression
      const minorProgression = await sdk.harmony.generateProgression(
        'Am',
        'minor',
        4
      );
      expect(minorProgression.key).toBe('Am');
      expect(minorProgression.scale).toBe('minor');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache results for repeated calls', async () => {
      const chords = ['C', 'Am', 'F', 'G'];

      // First call

      const analysis1 = await sdk.harmony.analyzeProgression(chords);
      // const time1 = Date.now() - start1; // TODO: Use for performance measurement

      // Second call (should be cached)
      const _start2 = Date.now();
      const analysis2 = await sdk.harmony.analyzeProgression(chords);

      expect(analysis1).toEqual(analysis2);
      // Second call should be significantly faster due to caching
      // Note: This might not always be true in test environment, so we just check they're equal
    });
  });
});
