/**
 * Example usage tests for Composition API
 * Demonstrates the key functionality implemented in task 4.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompositionAPI } from '../composition';
import type { SchillingerSDK } from '../client';

// Mock the SDK client with working implementations
const mockSDK = {
  rhythm: {
    generateResultant: vi.fn().mockResolvedValue({
      durations: [2, 1, 3],
      timeSignature: [4, 4] as [number, number],
      metadata: { complexity: 0.6 },
    }),
    generateVariation: vi.fn().mockResolvedValue({
      durations: [1, 2, 3],
      timeSignature: [4, 4] as [number, number],
      metadata: { complexity: 0.7 },
    }),
    analyzePattern: vi.fn().mockResolvedValue({
      complexity: 0.6,
      syncopation: 0.3,
      density: 0.7,
      patterns: [],
      suggestions: [],
    }),
  },
  harmony: {
    generateProgression: vi.fn().mockResolvedValue({
      chords: ['C', 'Am', 'F', 'G'],
      key: 'C',
      scale: 'major',
    }),
    generateVariations: vi.fn().mockResolvedValue([
      {
        chords: ['C', 'Dm', 'G', 'C'],
        key: 'C',
        scale: 'major',
      },
    ]),
    analyzeProgression: vi.fn().mockResolvedValue({
      key_stability: 0.8,
      tension_curve: [0.2, 0.5, 0.7, 0.3],
      functionalanalysis: ['I', 'vi', 'IV', 'V'],
      voice_leading_quality: 0.7,
      suggestions: [],
    }),
  },
  isOfflineMode: vi.fn(() => false),
  makeRequest: vi.fn(),
} as unknown as SchillingerSDK;

describe('Composition API Examples', () => {
  let compositionAPI: CompositionAPI;

  beforeEach(() => {
    compositionAPI = new CompositionAPI(mockSDK);
    vi.clearAllMocks();
  });

  describe('Task 4.4 Implementation Examples', () => {
    it('Example 1: Create a simple song composition', async () => {
      const composition = await compositionAPI.create({
        name: 'My First Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        complexity: 'simple',
      });

      expect(composition.name).toBe('My First Song');
      expect(composition.sections).toHaveLength(4); // verse-chorus-verse-chorus
      expect(composition.sections[0].type).toBe('verse');
      expect(composition.sections[1].type).toBe('chorus');

      // Each section should have rhythm and harmony
      composition.sections.forEach(section => {
        expect(section.rhythm).toBeDefined();
        expect(section.harmony).toBeDefined();
        expect(section.melody).toBeDefined(); // Non-instrumental sections get melody
      });
    });

    it('Example 2: Generate individual sections with custom generators', async () => {
      const verseSection = await compositionAPI.generateSection({
        type: 'verse',
        length: 8,
        position: 0,
        rhythmGenerators: [3, 4],
        harmonyGenerators: [4, 5],
      });

      expect(verseSection.type).toBe('verse');
      expect(verseSection.length).toBe(8);
      expect(verseSection.rhythm).toBeDefined();
      expect(verseSection.harmony).toBeDefined();
      expect(verseSection.melody).toBeDefined();
    });

    it('Example 3: Create arrangement from template', async () => {
      const popSongTemplate = {
        name: 'Pop Song Structure',
        structure: [
          { type: 'intro' as const, length: 4, characteristics: ['gentle'] },
          { type: 'verse' as const, length: 8, characteristics: ['melodic'] },
          {
            type: 'chorus' as const,
            length: 8,
            characteristics: ['energetic'],
          },
          { type: 'verse' as const, length: 8, characteristics: ['melodic'] },
          {
            type: 'chorus' as const,
            length: 8,
            characteristics: ['energetic'],
          },
          {
            type: 'bridge' as const,
            length: 6,
            characteristics: ['contrasting'],
          },
          {
            type: 'chorus' as const,
            length: 8,
            characteristics: ['energetic'],
          },
          { type: 'outro' as const, length: 4, characteristics: ['resolving'] },
        ],
        transitions: [],
        style: 'pop',
        complexity: 'moderate' as const,
      };

      const arrangement =
        await compositionAPI.generateArrangement(popSongTemplate);

      expect(arrangement.sections).toHaveLength(8);
      expect(arrangement.totalLength).toBe(54); // Sum of all section lengths
      expect(arrangement.sections[0].type).toBe('intro');
      expect(arrangement.sections[1].type).toBe('verse');
      expect(arrangement.sections[2].type).toBe('chorus');
    });

    it('Example 4: Apply rhythmic variation to composition', async () => {
      const originalComposition = await compositionAPI.create({
        name: 'Original Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
      });

      const rhythmicVariation = await compositionAPI.applyVariation(
        originalComposition,
        {
          type: 'rhythmic',
          intensity: 'moderate',
        }
      );

      expect(rhythmicVariation.name).toContain('rhythmic variation');
      expect(rhythmicVariation.sections).toHaveLength(
        originalComposition.sections.length
      );
      expect(mockSDK.rhythm.generateVariation).toHaveBeenCalled();
    });

    it('Example 5: Analyze composition structure', async () => {
      const composition = await compositionAPI.create({
        name: 'Test Song',
        key: 'D',
        scale: 'minor',
        tempo: 100,
        timeSignature: [4, 4],
        structure: ['intro', 'verse', 'chorus', 'bridge', 'outro'],
      });

      const analysis = await compositionAPI.analyzeComposition(composition);

      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.sections).toHaveLength(5);
      expect(analysis.structure.transitions).toHaveLength(4); // n-1 transitions
      expect(analysis.harmonic).toBeDefined();
      expect(analysis.rhythmic).toBeDefined();
      expect(analysis.overall_complexity).toBeGreaterThan(0);
    });

    it('Example 6: Infer structure from melody pattern', async () => {
      // A melody with clear A-B-A structure
      const melody = [
        // A phrase
        60, 62, 64, 65,
        // B phrase
        67, 69, 71, 72,
        // A phrase repeat
        60, 62, 64, 65,
      ];

      const structure = await compositionAPI.inferStructure(melody);

      expect(structure.detectedStructure).toBeDefined();
      expect(structure.analysis.repetitionPatterns.length).toBeGreaterThan(0);
      expect(structure.analysis.phraseStructure.length).toBeGreaterThan(0);
      expect(structure.confidence).toBeGreaterThan(0.5); // Should be confident with repetition
    });

    it('Example 7: Encode user input into Schillinger parameters', async () => {
      // Mock the unified encoding import
      vi.doMock(
        '@schillinger-sdk/analysis/reverse-analysis/unified-encoding',
        () => ({
          encodeMusicalPattern: vi.fn().mockReturnValue({
            confidence: 0.8,
            componentAnalyses: {
              rhythm: {
                bestMatch: { generators: { a: 3, b: 4 } },
              },
              harmony: {
                bestMatch: { generators: { a: 4, b: 5 } },
              },
              melody: {
                bestMatch: { generators: { a: 5, b: 7 } },
              },
            },
          }),
        })
      );

      const melody = [60, 62, 64, 65, 67, 65, 64, 62];
      const rhythm = [1, 1, 1, 1, 2, 1, 1, 2];
      const harmony = ['C', 'F', 'G', 'C'];

      const encoding = await compositionAPI.encodeUserInput(
        melody,
        rhythm,
        harmony
      );

      expect(encoding.originalInput.melody).toEqual(melody);
      expect(encoding.originalInput.rhythm).toEqual(rhythm);
      expect(encoding.originalInput.harmony).toEqual(harmony);
      expect(encoding.schillingerParameters.rhythmGenerators).toEqual([3, 4]);
      expect(encoding.schillingerParameters.harmonyGenerators).toEqual([4, 5]);
      expect(encoding.schillingerParameters.melodyGenerators).toEqual([5, 7]);
      expect(encoding.confidence).toBeGreaterThan(0);
    });

    it('Example 8: Generate instrumental section (no melody)', async () => {
      const instrumentalSection = await compositionAPI.generateSection({
        type: 'instrumental',
        length: 16,
        position: 32,
      });

      expect(instrumentalSection.type).toBe('instrumental');
      expect(instrumentalSection.melody).toBeUndefined(); // Instrumental sections have no melody
      expect(instrumentalSection.rhythm).toBeDefined();
      expect(instrumentalSection.harmony).toBeDefined();
    });

    it('Example 9: Apply variation to specific sections only', async () => {
      const composition = await compositionAPI.create({
        name: 'Multi-Section Song',
        key: 'G',
        scale: 'major',
        tempo: 140,
        timeSignature: [4, 4],
        structure: ['verse', 'chorus', 'verse', 'chorus'],
      });

      // Only vary the chorus sections
      const variation = await compositionAPI.applyVariation(composition, {
        type: 'harmonic',
        intensity: 'subtle',
        sections: ['chorus'],
      });

      expect(variation.sections).toHaveLength(4);
      // Harmony variations should have been applied
      expect(mockSDK.harmony.generateVariations).toHaveBeenCalled();
    });

    it('Example 10: Complex composition with custom structure', async () => {
      const complexComposition = await compositionAPI.create({
        name: 'Progressive Song',
        key: 'F#',
        scale: 'minor',
        tempo: 95,
        timeSignature: [7, 8], // Odd time signature
        structure: [
          'intro',
          'verse',
          'chorus',
          'verse',
          'chorus',
          'bridge',
          'instrumental',
          'chorus',
          'outro',
        ],
        complexity: 'complex',
        length: 64, // Longer composition
      });

      expect(complexComposition.sections).toHaveLength(9);
      expect(complexComposition.key).toBe('F#');
      expect(complexComposition.scale).toBe('minor');
      expect(complexComposition.tempo).toBe(95);
      expect(complexComposition.timeSignature).toEqual([7, 8]);

      // Should have an instrumental section without melody
      const instrumentalSection = complexComposition.sections.find(
        s => s.type === 'instrumental'
      );
      expect(instrumentalSection).toBeDefined();
      expect(instrumentalSection?.melody).toBeUndefined();
    });
  });

  describe('Task Requirements Verification', () => {
    it('Requirement 1.1: Core composition features accessible', async () => {
      // Verify pattern generation is accessible
      const composition = await compositionAPI.create({
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
      });

      expect(composition).toBeDefined();
      expect(mockSDK.rhythm.generateResultant).toHaveBeenCalled();
      expect(mockSDK.harmony.generateProgression).toHaveBeenCalled();
    });

    it('Requirement 1.3: Simple data structures returned', async () => {
      const composition = await compositionAPI.create({
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
      });

      // Verify composition has simple, standardized structure
      expect(composition).toHaveProperty('id');
      expect(composition).toHaveProperty('name');
      expect(composition).toHaveProperty('sections');
      expect(composition).toHaveProperty('key');
      expect(composition).toHaveProperty('scale');
      expect(composition).toHaveProperty('tempo');
      expect(composition).toHaveProperty('timeSignature');
      expect(composition).toHaveProperty('metadata');
    });

    it('Requirement 8.2: Melody structure inference', async () => {
      const melody = [60, 62, 64, 65, 67, 65, 64, 62];
      const structure = await compositionAPI.inferStructure(melody);

      expect(structure.detectedStructure).toBeDefined();
      expect(structure.analysis.phraseStructure).toBeDefined();
      expect(structure.confidence).toBeGreaterThan(0);
    });

    it('Requirement 8.5: Multi-interpretation ranking', async () => {
      vi.doMock(
        '@schillinger-sdk/analysis/reverse-analysis/unified-encoding',
        () => ({
          encodeMusicalPattern: vi.fn().mockReturnValue({
            confidence: 0.8,
            bestMatch: { confidence: 0.8 },
            alternatives: [{ confidence: 0.6 }, { confidence: 0.4 }],
            componentAnalyses: {
              rhythm: { bestMatch: { generators: { a: 3, b: 4 } } },
            },
          }),
        })
      );

      const encoding = await compositionAPI.encodeUserInput([60, 62, 64, 65]);

      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.recommendations).toBeDefined();
      expect(Array.isArray(encoding.recommendations)).toBe(true);
    });

    it('Requirement 8.6: Confidence scores and alternative suggestions', async () => {
      const structure = await compositionAPI.inferStructure([60, 62, 64, 65]);

      expect(structure.confidence).toBeGreaterThanOrEqual(0);
      expect(structure.confidence).toBeLessThanOrEqual(1);
      expect(structure.suggestions).toBeDefined();
      expect(Array.isArray(structure.suggestions)).toBe(true);
    });

    it('Requirement 8.7: Variations and transformations', async () => {
      const composition = await compositionAPI.create({
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
      });

      const variation = await compositionAPI.applyVariation(composition, {
        type: 'rhythmic',
        intensity: 'moderate',
      });

      expect(variation).toBeDefined();
      expect(variation.name).toContain('variation');
      expect(mockSDK.rhythm.generateVariation).toHaveBeenCalled();
    });
  });
});
