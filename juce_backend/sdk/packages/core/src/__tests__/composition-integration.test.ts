/**
 * Integration tests for Composition API
 * Tests the composition API with actual SDK integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchillingerSDK } from '../client';
import { CompositionAPI } from '../composition';

describe('CompositionAPI Integration', () => {
  let sdk: SchillingerSDK;
  let compositionAPI: CompositionAPI;

  beforeEach(() => {
    sdk = new SchillingerSDK({
      apiUrl: 'http://localhost:8000',
      offlineMode: true, // Use offline mode for testing
    });
    compositionAPI = sdk.composition;
  });

  describe('create composition', () => {
    it('should create a complete composition with all sections', async () => {
      const params = {
        name: 'Integration Test Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        complexity: 'simple' as const,
        length: 16,
      };

      const composition = await compositionAPI.create(params);

      expect(composition).toBeDefined();
      expect(composition.name).toBe('Integration Test Song');
      expect(composition.sections.length).toBeGreaterThan(0);

      // Verify each section has required components
      composition.sections.forEach(section => {
        expect(section.rhythm).toBeDefined();
        expect(section.rhythm.durations).toBeDefined();
        expect(section.rhythm.durations.length).toBeGreaterThan(0);

        expect(section.harmony).toBeDefined();
        expect(section.harmony.chords).toBeDefined();
        expect(section.harmony.chords.length).toBeGreaterThan(0);

        expect(section.length).toBeGreaterThan(0);
        expect(section.position).toBeGreaterThanOrEqual(0);
      });

      // Verify metadata
      expect(composition.metadata).toBeDefined();
      expect(composition.metadata?.complexity).toBeGreaterThan(0);
      expect(composition.metadata?.duration).toBeGreaterThan(0);
    });

    it('should create composition with custom structure', async () => {
      const params = {
        name: 'Custom Structure Song',
        key: 'G',
        scale: 'minor',
        tempo: 140,
        timeSignature: [3, 4] as [number, number],
        structure: [
          'intro',
          'verse',
          'chorus',
          'bridge',
          'chorus',
          'outro',
        ] as any[],
      };

      const composition = await compositionAPI.create(params);

      expect(composition.sections).toHaveLength(6);
      expect(composition.sections.map(s => s.type)).toEqual([
        'intro',
        'verse',
        'chorus',
        'bridge',
        'chorus',
        'outro',
      ]);

      // Verify sections are positioned correctly
      let expectedPosition = 0;
      composition.sections.forEach(section => {
        expect(section.position).toBe(expectedPosition);
        expectedPosition += section.length;
      });
    });
  });

  describe('section generation', () => {
    it('should generate different section types with appropriate characteristics', async () => {
      const sectionTypes = [
        'intro',
        'verse',
        'chorus',
        'bridge',
        'outro',
      ] as const;

      for (const type of sectionTypes) {
        const section = await compositionAPI.generateSection({
          type,
          length: 8,
          position: 0,
        });

        expect(section.type).toBe(type);
        expect(section.rhythm).toBeDefined();
        expect(section.harmony).toBeDefined();

        // Instrumental sections should not have melody
        if (type === 'instrumental') {
          expect(section.melody).toBeUndefined();
        } else {
          expect(section.melody).toBeDefined();
        }
      }
    });

    it('should use custom generators when provided', async () => {
      const section = await compositionAPI.generateSection({
        type: 'verse',
        length: 8,
        position: 0,
        rhythmGenerators: [5, 7],
        harmonyGenerators: [3, 5],
      });

      expect(section.rhythm).toBeDefined();
      expect(section.harmony).toBeDefined();

      // The generators should influence the generated patterns
      // This is verified by the underlying rhythm and harmony APIs
    });
  });

  describe('arrangement generation', () => {
    it('should generate arrangement from template', async () => {
      const template = {
        name: 'Pop Ballad',
        structure: [
          {
            type: 'intro' as const,
            length: 4,
            characteristics: ['gentle', 'sparse'],
          },
          {
            type: 'verse' as const,
            length: 8,
            characteristics: ['melodic', 'storytelling'],
          },
          {
            type: 'chorus' as const,
            length: 8,
            characteristics: ['powerful', 'memorable'],
          },
          {
            type: 'verse' as const,
            length: 8,
            characteristics: ['melodic', 'storytelling'],
          },
          {
            type: 'chorus' as const,
            length: 8,
            characteristics: ['powerful', 'memorable'],
          },
          {
            type: 'bridge' as const,
            length: 6,
            characteristics: ['contrasting', 'emotional'],
          },
          {
            type: 'chorus' as const,
            length: 8,
            characteristics: ['powerful', 'memorable'],
          },
          {
            type: 'outro' as const,
            length: 4,
            characteristics: ['resolving', 'fade'],
          },
        ],
        transitions: [
          { from: 'intro' as const, to: 'verse' as const, type: 'smooth' },
          { from: 'verse' as const, to: 'chorus' as const, type: 'building' },
          { from: 'chorus' as const, to: 'verse' as const, type: 'settling' },
          { from: 'bridge' as const, to: 'chorus' as const, type: 'climactic' },
          { from: 'chorus' as const, to: 'outro' as const, type: 'resolving' },
        ],
        style: 'ballad',
        complexity: 'moderate' as const,
      };

      const arrangement = await compositionAPI.generateArrangement(template);

      expect(arrangement).toBeDefined();
      expect(arrangement.sections).toHaveLength(8);
      expect(arrangement.totalLength).toBe(54); // Sum of all section lengths
      expect(arrangement.estimatedDuration).toBeGreaterThan(0);

      // Verify sections match template structure
      arrangement.sections.forEach((section, index) => {
        expect(section.type).toBe(template.structure[index].type);
        expect(section.length).toBe(template.structure[index].length);
      });

      expect(arrangement.metadata.generatedAt).toBeGreaterThan(0);
      expect(arrangement.metadata.complexity).toBeGreaterThan(0);
      expect(arrangement.metadata.coherence).toBeGreaterThan(0);
    });
  });

  describe('composition variations', () => {
    it('should apply rhythmic variations', async () => {
      // First create a base composition
      const baseComposition = await compositionAPI.create({
        name: 'Base Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        structure: ['verse', 'chorus'],
      });

      // Apply rhythmic variation
      const variation = await compositionAPI.applyVariation(baseComposition, {
        type: 'rhythmic',
        intensity: 'moderate',
      });

      expect(variation.name).toContain('rhythmic variation');
      expect(variation.sections).toHaveLength(baseComposition.sections.length);

      // Sections should have different rhythms but same structure
      variation.sections.forEach((section, index) => {
        expect(section.type).toBe(baseComposition.sections[index].type);
        expect(section.length).toBe(baseComposition.sections[index].length);
        // Rhythm should be different (this is probabilistic, but very likely)
        expect(section.rhythm.durations).not.toEqual(
          baseComposition.sections[index].rhythm.durations
        );
      });
    });

    it('should apply harmonic variations', async () => {
      const baseComposition = await compositionAPI.create({
        name: 'Base Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        structure: ['verse', 'chorus'],
      });

      const variation = await compositionAPI.applyVariation(baseComposition, {
        type: 'harmonic',
        intensity: 'subtle',
      });

      expect(variation.name).toContain('harmonic variation');

      // Harmony should be different while maintaining key relationships
      variation.sections.forEach((section, index) => {
        expect(section.harmony.key).toBe(
          baseComposition.sections[index].harmony.key
        );
        expect(section.harmony.scale).toBe(
          baseComposition.sections[index].harmony.scale
        );
      });
    });

    it('should apply variations to specific sections only', async () => {
      const baseComposition = await compositionAPI.create({
        name: 'Base Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        structure: ['verse', 'chorus', 'verse', 'chorus'],
      });

      const variation = await compositionAPI.applyVariation(baseComposition, {
        type: 'rhythmic',
        intensity: 'moderate',
        sections: ['chorus'], // Only vary chorus sections
      });

      // Verse sections should remain unchanged
      const verseIndices = [0, 2]; // First and third sections are verses
      const chorusIndices = [1, 3]; // Second and fourth sections are choruses

      verseIndices.forEach(index => {
        expect(variation.sections[index].rhythm.durations).toEqual(
          baseComposition.sections[index].rhythm.durations
        );
      });

      chorusIndices.forEach(index => {
        expect(variation.sections[index].rhythm.durations).not.toEqual(
          baseComposition.sections[index].rhythm.durations
        );
      });
    });
  });

  describe('composition analysis', () => {
    it('should analyze composition structure and characteristics', async () => {
      const composition = await compositionAPI.create({
        name: 'Analysis Test Song',
        key: 'D',
        scale: 'minor',
        tempo: 100,
        timeSignature: [4, 4] as [number, number],
        structure: [
          'intro',
          'verse',
          'chorus',
          'verse',
          'chorus',
          'bridge',
          'chorus',
          'outro',
        ],
        complexity: 'complex',
      });

      const analysis = await compositionAPI.analyzeComposition(composition);

      expect(analysis).toBeDefined();

      // Structure analysis
      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.form).toBeDefined();
      expect(analysis.structure.sections).toHaveLength(
        composition.sections.length
      );
      expect(analysis.structure.transitions).toHaveLength(
        composition.sections.length - 1
      );

      // Musical analysis
      expect(analysis.harmonic).toBeDefined();
      expect(analysis.harmonic.key_stability).toBeGreaterThan(0);
      expect(analysis.harmonic.tension_curve).toBeDefined();
      expect(analysis.harmonic.functionalanalysis).toBeDefined();

      expect(analysis.rhythmic).toBeDefined();
      expect(analysis.rhythmic.complexity).toBeGreaterThan(0);
      expect(analysis.rhythmic.syncopation).toBeGreaterThanOrEqual(0);
      expect(analysis.rhythmic.density).toBeGreaterThan(0);

      expect(analysis.melodic).toBeDefined(); // Should have melody analysis

      expect(analysis.overall_complexity).toBeGreaterThan(0);
    });

    it('should identify different structural forms', async () => {
      // Test verse-chorus form
      const verseChorusComposition = await compositionAPI.create({
        name: 'Verse-Chorus Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        structure: ['verse', 'chorus', 'verse', 'chorus'],
      });

      const verseChorusAnalysis = await compositionAPI.analyzeComposition(
        verseChorusComposition
      );
      expect(verseChorusAnalysis.structure.form).toBe('verse-chorus');

      // Test extended form
      const extendedComposition = await compositionAPI.create({
        name: 'Extended Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        structure: ['intro', 'verse', 'chorus', 'bridge', 'outro'],
      });

      const extendedAnalysis =
        await compositionAPI.analyzeComposition(extendedComposition);
      expect(extendedAnalysis.structure.form).toBe('extended song form');
    });
  });

  describe('structure inference', () => {
    it('should infer structure from repetitive melody', async () => {
      // Create a melody with clear A-B-A-B structure
      const melody = [
        // A section (4 notes)
        60, 62, 64, 65,
        // B section (4 notes)
        67, 69, 71, 72,
        // A section repeat
        60, 62, 64, 65,
        // B section repeat
        67, 69, 71, 72,
      ];

      const rhythm = [1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2];

      const structure = await compositionAPI.inferStructure(melody, rhythm);

      expect(structure).toBeDefined();
      expect(structure.detectedStructure).toBeDefined();
      expect(structure.detectedStructure.length).toBeGreaterThan(1);
      expect(structure.confidence).toBeGreaterThan(0.5); // Should be confident with clear repetition

      // Should detect repetition patterns
      expect(structure.analysis.repetitionPatterns.length).toBeGreaterThan(0);
      expect(
        structure.analysis.repetitionPatterns[0].occurrences
      ).toBeGreaterThan(1);

      // Should detect phrase structure
      expect(structure.analysis.phraseStructure.length).toBeGreaterThan(0);
      expect(structure.analysis.phraseStructure[0].type).toBe('antecedent');

      // Should provide suggestions
      expect(structure.suggestions).toBeDefined();
      expect(Array.isArray(structure.suggestions)).toBe(true);
    });

    it('should handle simple melodies with low repetition', async () => {
      // Simple ascending scale
      const melody = [60, 62, 64, 65, 67, 69, 71, 72];

      const structure = await compositionAPI.inferStructure(melody);

      expect(structure.detectedStructure).toBeDefined();
      expect(structure.confidence).toBeLessThan(0.8); // Lower confidence for simple patterns
      expect(structure.suggestions.length).toBeGreaterThan(0);
    });

    it('should find cadence points in melody', async () => {
      // Melody with clear cadential motion (descending to tonic)
      const melody = [72, 71, 69, 67, 65, 64, 62, 60]; // Descending scale
      const rhythm = [1, 1, 1, 1, 1, 1, 1, 4]; // Long final note

      const structure = await compositionAPI.inferStructure(melody, rhythm);

      expect(structure.analysis.cadencePoints.length).toBeGreaterThan(0);
      // Final note should be identified as cadence point
      expect(structure.analysis.cadencePoints).toContain(melody.length - 1);
    });
  });

  describe('user input encoding', () => {
    it('should encode complete musical input', async () => {
      const melody = [60, 62, 64, 65, 67, 65, 64, 62];
      const rhythm = [1, 1, 1, 1, 2, 1, 1, 2];
      const harmony = ['C', 'F', 'G', 'C'];

      const encoding = await compositionAPI.encodeUserInput(
        melody,
        rhythm,
        harmony
      );

      expect(encoding).toBeDefined();
      expect(encoding.originalInput.melody).toEqual(melody);
      expect(encoding.originalInput.rhythm).toEqual(rhythm);
      expect(encoding.originalInput.harmony).toEqual(harmony);

      expect(encoding.inferredStructure).toBeDefined();
      expect(
        encoding.inferredStructure.detectedStructure.length
      ).toBeGreaterThan(0);

      expect(encoding.schillingerParameters).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.recommendations).toBeDefined();
    });

    it('should work with partial input', async () => {
      // Test with only melody
      const melodyOnly = await compositionAPI.encodeUserInput([60, 62, 64, 65]);
      expect(melodyOnly.originalInput.melody).toBeDefined();
      expect(melodyOnly.originalInput.rhythm).toBeUndefined();
      expect(melodyOnly.originalInput.harmony).toBeUndefined();

      // Test with only rhythm
      const rhythmOnly = await compositionAPI.encodeUserInput(
        undefined,
        [1, 1, 2, 1]
      );
      expect(rhythmOnly.originalInput.melody).toBeUndefined();
      expect(rhythmOnly.originalInput.rhythm).toBeDefined();
      expect(rhythmOnly.originalInput.harmony).toBeUndefined();

      // Test with only harmony
      const harmonyOnly = await compositionAPI.encodeUserInput(
        undefined,
        undefined,
        ['C', 'F', 'G']
      );
      expect(harmonyOnly.originalInput.melody).toBeUndefined();
      expect(harmonyOnly.originalInput.rhythm).toBeUndefined();
      expect(harmonyOnly.originalInput.harmony).toBeDefined();
    });

    it('should provide meaningful recommendations', async () => {
      const melody = [60, 62, 64, 65]; // Simple melody

      const encoding = await compositionAPI.encodeUserInput(melody);

      expect(encoding.recommendations).toBeDefined();
      expect(encoding.recommendations.length).toBeGreaterThan(0);

      // Should suggest providing additional components
      const recommendationText = encoding.recommendations.join(' ');
      expect(recommendationText.toLowerCase()).toMatch(/rhythm|harmony/);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty melody gracefully', async () => {
      await expect(compositionAPI.inferStructure([])).rejects.toThrow();
    });

    it('should handle invalid composition parameters', async () => {
      await expect(
        compositionAPI.create({
          name: '',
          key: 'C',
          scale: 'major',
          tempo: 120,
          timeSignature: [4, 4] as [number, number],
        })
      ).rejects.toThrow();
    });

    it('should handle very short melodies', async () => {
      const shortMelody = [60, 62];

      const structure = await compositionAPI.inferStructure(shortMelody);
      expect(structure).toBeDefined();
      expect(structure.confidence).toBeLessThanOrEqual(0.5); // Low confidence for short input
    });

    it('should handle very long melodies', async () => {
      // Generate a long melody (100 notes)
      const longMelody = Array.from({ length: 100 }, (_, i) => 60 + (i % 12));

      const structure = await compositionAPI.inferStructure(longMelody);
      expect(structure).toBeDefined();
      expect(structure.analysis.repetitionPatterns.length).toBeGreaterThan(0);
    });
  });
});
