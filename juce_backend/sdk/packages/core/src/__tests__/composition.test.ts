/**
 * Tests for Composition API implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompositionAPI } from '../composition';
import type { SchillingerSDK } from '../client';
import {
  ValidationError as _ValidationError,
  ProcessingError as _ProcessingError,
} from '@schillinger-sdk/shared';

// Mock the SDK client
const mockSDK = {
  rhythm: {
    generateResultant: vi.fn(),
    generateVariation: vi.fn(),
    analyzePattern: vi.fn(),
  },
  harmony: {
    generateProgression: vi.fn(),
    generateVariations: vi.fn(),
    analyzeProgression: vi.fn(),
  },
  isOfflineMode: vi.fn(() => false),
  makeRequest: vi.fn(),
} as unknown as SchillingerSDK;

describe('CompositionAPI', () => {
  let compositionAPI: CompositionAPI;

  beforeEach(() => {
    compositionAPI = new CompositionAPI(mockSDK);
    vi.clearAllMocks();

    // Setup default mock responses
    mockSDK.rhythm.generateResultant = vi.fn().mockResolvedValue({
      durations: [2, 1, 3],
      timeSignature: [4, 4] as [number, number],
      metadata: { complexity: 0.6 },
    });

    mockSDK.harmony.generateProgression = vi.fn().mockResolvedValue({
      chords: ['C', 'Am', 'F', 'G'],
      key: 'C',
      scale: 'major',
    });

    mockSDK.rhythm.generateVariation = vi.fn().mockResolvedValue({
      durations: [1, 2, 3],
      timeSignature: [4, 4] as [number, number],
      metadata: { complexity: 0.7 },
    });

    mockSDK.harmony.generateVariations = vi.fn().mockResolvedValue([
      {
        chords: ['C', 'Dm', 'G', 'C'],
        key: 'C',
        scale: 'major',
      },
    ]);

    mockSDK.rhythm.analyzePattern = vi.fn().mockResolvedValue({
      complexity: 0.6,
      syncopation: 0.3,
      density: 0.7,
      patterns: [],
      suggestions: [],
    });

    mockSDK.harmony.analyzeProgression = vi.fn().mockResolvedValue({
      key_stability: 0.8,
      tension_curve: [0.2, 0.5, 0.7, 0.3],
      functionalanalysis: ['I', 'vi', 'IV', 'V'],
      voice_leading_quality: 0.7,
      suggestions: [],
    });
  });

  describe('create', () => {
    it('should create a basic composition with valid parameters', async () => {
      const params = {
        name: 'Test Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
      };

      const composition = await compositionAPI.create(params);

      expect(composition).toBeDefined();
      expect(composition.name).toBe('Test Song');
      expect(composition.key).toBe('C');
      expect(composition.scale).toBe('major');
      expect(composition.tempo).toBe(120);
      expect(composition.timeSignature).toEqual([4, 4]);
      expect(composition.sections).toHaveLength(4); // Default moderate structure
      expect(composition.metadata).toBeDefined();
      expect(composition.metadata?.complexity).toBeGreaterThan(0);
    });

    it('should create composition with custom structure', async () => {
      const params = {
        name: 'Custom Song',
        key: 'G',
        scale: 'minor',
        tempo: 140,
        timeSignature: [3, 4] as [number, number],
        structure: ['intro', 'verse', 'chorus', 'outro'] as any[],
      };

      const composition = await compositionAPI.create(params);

      expect(composition.sections).toHaveLength(4);
      expect(composition.sections[0].type).toBe('intro');
      expect(composition.sections[1].type).toBe('verse');
      expect(composition.sections[2].type).toBe('chorus');
      expect(composition.sections[3].type).toBe('outro');
    });

    it('should validate composition parameters', async () => {
      const invalidParams = {
        name: '',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
      };

      await expect(compositionAPI.create(invalidParams)).rejects.toThrow(
        _ValidationError
      );
    });

    it('should validate tempo range', async () => {
      const invalidParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 300, // Too fast
        timeSignature: [4, 4] as [number, number],
      };

      await expect(compositionAPI.create(invalidParams)).rejects.toThrow(
        _ValidationError
      );
    });

    it('should call rhythm and harmony APIs for each section', async () => {
      const params = {
        name: 'Test Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        structure: ['verse', 'chorus'] as any[],
      };

      await compositionAPI.create(params);

      expect(mockSDK.rhythm.generateResultant).toHaveBeenCalledTimes(2);
      expect(mockSDK.harmony.generateProgression).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateSection', () => {
    it('should generate a section with specified parameters', async () => {
      const sectionParams = {
        type: 'verse' as any,
        length: 8,
        position: 0,
      };

      const section = await compositionAPI.generateSection(sectionParams);

      expect(section).toBeDefined();
      expect(section.type).toBe('verse');
      expect(section.length).toBe(8);
      expect(section.position).toBe(0);
      expect(section.rhythm).toBeDefined();
      expect(section.harmony).toBeDefined();
      expect(section.melody).toBeDefined(); // Non-instrumental sections get melody
    });

    it('should not generate melody for instrumental sections', async () => {
      const sectionParams = {
        type: 'instrumental' as any,
        length: 8,
        position: 0,
      };

      const section = await compositionAPI.generateSection(sectionParams);

      expect(section.melody).toBeUndefined();
    });

    it('should use custom generators when provided', async () => {
      const sectionParams = {
        type: 'verse' as any,
        length: 8,
        position: 0,
        rhythmGenerators: [5, 7] as [number, number],
      };

      await compositionAPI.generateSection(sectionParams);

      expect(mockSDK.rhythm.generateResultant).toHaveBeenCalledWith(5, 7);
    });
  });

  describe('generateArrangement', () => {
    it('should generate arrangement from template', async () => {
      const template = {
        name: 'Pop Song',
        structure: [
          { type: 'intro' as any, length: 4, characteristics: ['simple'] },
          { type: 'verse' as any, length: 8, characteristics: ['melodic'] },
          { type: 'chorus' as any, length: 8, characteristics: ['energetic'] },
        ],
        transitions: [
          { from: 'intro' as any, to: 'verse' as any, type: 'smooth' },
          { from: 'verse' as any, to: 'chorus' as any, type: 'building' },
        ],
        style: 'pop',
        complexity: 'moderate' as any,
      };

      const arrangement = await compositionAPI.generateArrangement(template);

      expect(arrangement).toBeDefined();
      expect(arrangement.template).toBe(template);
      expect(arrangement.sections).toHaveLength(3);
      expect(arrangement.totalLength).toBe(20); // 4 + 8 + 8
      expect(arrangement.estimatedDuration).toBeGreaterThan(0);
      expect(arrangement.metadata.generatedAt).toBeGreaterThan(0);
    });
  });

  describe('applyVariation', () => {
    it('should apply rhythmic variation to composition', async () => {
      const composition = {
        id: 'test-id',
        name: 'Original Song',
        sections: [
          {
            id: 'section-1',
            type: 'verse' as any,
            rhythm: {
              durations: [1, 2, 1],
              timeSignature: [4, 4] as [number, number],
            },
            harmony: { chords: ['C', 'F', 'G'], key: 'C', scale: 'major' },
            length: 8,
            position: 0,
          },
        ],
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        metadata: { complexity: 0.5 },
      };

      const variation = {
        type: 'rhythmic' as any,
        intensity: 'moderate' as any,
      };

      const result = await compositionAPI.applyVariation(
        composition,
        variation
      );

      expect(result.name).toContain('rhythmic variation');
      expect(mockSDK.rhythm.generateVariation).toHaveBeenCalled();
      expect(result.sections[0].rhythm).not.toEqual(
        composition.sections[0].rhythm
      );
    });

    it('should apply harmonic variation to composition', async () => {
      const composition = {
        id: 'test-id',
        name: 'Original Song',
        sections: [
          {
            id: 'section-1',
            type: 'verse' as any,
            rhythm: {
              durations: [1, 2, 1],
              timeSignature: [4, 4] as [number, number],
            },
            harmony: { chords: ['C', 'F', 'G'], key: 'C', scale: 'major' },
            length: 8,
            position: 0,
          },
        ],
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        metadata: { complexity: 0.5 },
      };

      const variation = {
        type: 'harmonic' as any,
        intensity: 'subtle' as any,
      };

      const result = await compositionAPI.applyVariation(
        composition,
        variation
      );

      expect(result.name).toContain('harmonic variation');
      expect(mockSDK.harmony.generateVariations).toHaveBeenCalled();
    });

    it('should apply variation only to specified sections', async () => {
      const composition = {
        id: 'test-id',
        name: 'Original Song',
        sections: [
          {
            id: 'section-1',
            type: 'verse' as any,
            rhythm: {
              durations: [1, 2, 1],
              timeSignature: [4, 4] as [number, number],
            },
            harmony: { chords: ['C', 'F', 'G'], key: 'C', scale: 'major' },
            length: 8,
            position: 0,
          },
          {
            id: 'section-2',
            type: 'chorus' as any,
            rhythm: {
              durations: [2, 1, 2],
              timeSignature: [4, 4] as [number, number],
            },
            harmony: { chords: ['Am', 'F', 'C'], key: 'C', scale: 'major' },
            length: 8,
            position: 8,
          },
        ],
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        metadata: { complexity: 0.5 },
      };

      const variation = {
        type: 'rhythmic' as any,
        intensity: 'moderate' as any,
        sections: ['verse' as any],
      };

      const result = await compositionAPI.applyVariation(
        composition,
        variation
      );

      // Only verse section should be varied
      expect(mockSDK.rhythm.generateVariation).toHaveBeenCalledTimes(1);
      expect(result.sections[0].rhythm).not.toEqual(
        composition.sections[0].rhythm
      );
      expect(result.sections[1].rhythm).toEqual(composition.sections[1].rhythm);
    });
  });

  describe('analyzeComposition', () => {
    it('should analyze composition structure and characteristics', async () => {
      const composition = {
        id: 'test-id',
        name: 'Test Song',
        sections: [
          {
            id: 'section-1',
            type: 'verse' as any,
            rhythm: {
              durations: [1, 2, 1],
              timeSignature: [4, 4] as [number, number],
              metadata: { complexity: 0.6 },
            },
            harmony: { chords: ['C', 'F', 'G'], key: 'C', scale: 'major' },
            length: 8,
            position: 0,
          },
          {
            id: 'section-2',
            type: 'chorus' as any,
            rhythm: {
              durations: [2, 1, 2],
              timeSignature: [4, 4] as [number, number],
              metadata: { complexity: 0.7 },
            },
            harmony: { chords: ['Am', 'F', 'C'], key: 'C', scale: 'major' },
            melody: {
              id: 'melody-1',
              notes: [60, 62, 64],
              durations: [1, 1, 2],
              key: 'C',
              scale: 'major',
            },
            length: 8,
            position: 8,
          },
        ],
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        metadata: { complexity: 0.5 },
      };

      const analysis = await compositionAPI.analyzeComposition(composition);

      expect(analysis).toBeDefined();
      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.form).toBeDefined();
      expect(analysis.structure.sections).toHaveLength(2);
      expect(analysis.structure.transitions).toHaveLength(1);
      expect(analysis.harmonic).toBeDefined();
      expect(analysis.rhythmic).toBeDefined();
      expect(analysis.melodic).toBeDefined(); // Should be defined since one section has melody
      expect(analysis.overall_complexity).toBeGreaterThan(0);
    });

    it('should call appropriate analysis APIs', async () => {
      const composition = {
        id: 'test-id',
        name: 'Test Song',
        sections: [
          {
            id: 'section-1',
            type: 'verse' as any,
            rhythm: {
              durations: [1, 2, 1],
              timeSignature: [4, 4] as [number, number],
            },
            harmony: { chords: ['C', 'F', 'G'], key: 'C', scale: 'major' },
            length: 8,
            position: 0,
          },
        ],
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        metadata: { complexity: 0.5 },
      };

      await compositionAPI.analyzeComposition(composition);

      expect(mockSDK.harmony.analyzeProgression).toHaveBeenCalled();
      expect(mockSDK.rhythm.analyzePattern).toHaveBeenCalled();
    });
  });

  describe('inferStructure', () => {
    it('should infer structure from melody input', async () => {
      const melody = [
        60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 65, 67, 65, 64, 62,
      ];
      const rhythm = [1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2];

      const result = await compositionAPI.inferStructure(melody, rhythm);

      expect(result).toBeDefined();
      expect(result.detectedStructure).toBeDefined();
      expect(result.detectedStructure.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.repetitionPatterns).toBeDefined();
      expect(result.analysis.phraseStructure).toBeDefined();
      expect(result.analysis.harmonicRhythm).toBeDefined();
      expect(result.analysis.cadencePoints).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should find repetition patterns in melody', async () => {
      // Melody with clear repetition: A-B-A-B pattern
      const melody = [
        60, 62, 64, 65, 67, 69, 71, 72, 60, 62, 64, 65, 67, 69, 71, 72,
      ];

      const result = await compositionAPI.inferStructure(melody);

      expect(result.analysis.repetitionPatterns.length).toBeGreaterThan(0);
      expect(result.analysis.repetitionPatterns[0].occurrences).toBeGreaterThan(
        1
      );
    });

    it('should validate melody input', async () => {
      await expect(compositionAPI.inferStructure([])).rejects.toThrow(
        _ValidationError
      );
      await expect(compositionAPI.inferStructure(null as any)).rejects.toThrow(
        _ValidationError
      );
    });

    it('should analyze phrase structure', async () => {
      const melody = [60, 62, 64, 65, 67, 65, 64, 62]; // 8-note melody

      const result = await compositionAPI.inferStructure(melody);

      expect(result.analysis.phraseStructure.length).toBeGreaterThan(0);
      expect(result.analysis.phraseStructure[0].type).toBe('antecedent');
    });
  });

  describe('encodeUserInput', () => {
    // Mock the unified encoding import
    beforeEach(() => {
      vi.doMock(
        '@schillinger-sdk/analysis/reverse-analysis/unified-encoding',
        () => ({
          encodeMusicalPattern: vi.fn().mockReturnValue({
            confidence: 0.8,
            componentAnalyses: {
              rhythm: {
                bestMatch: {
                  generators: { a: 3, b: 4 },
                },
              },
              harmony: {
                bestMatch: {
                  generators: { a: 4, b: 5 },
                },
              },
              melody: {
                bestMatch: {
                  generators: { a: 5, b: 7 },
                },
              },
            },
          }),
        })
      );
    });

    it('should encode melody, rhythm, and harmony input', async () => {
      const melody = [60, 62, 64, 65];
      const rhythm = [1, 1, 1, 2];
      const harmony = ['C', 'F', 'G', 'C'];

      const result = await compositionAPI.encodeUserInput(
        melody,
        rhythm,
        harmony
      );

      expect(result).toBeDefined();
      expect(result.originalInput.melody).toEqual(melody);
      expect(result.originalInput.rhythm).toEqual(rhythm);
      expect(result.originalInput.harmony).toEqual(harmony);
      expect(result.inferredStructure).toBeDefined();
      expect(result.schillingerParameters).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
    });

    it('should work with only melody input', async () => {
      const melody = [60, 62, 64, 65];

      const result = await compositionAPI.encodeUserInput(melody);

      expect(result.originalInput.melody).toEqual(melody);
      expect(result.originalInput.rhythm).toBeUndefined();
      expect(result.originalInput.harmony).toBeUndefined();
    });

    it('should validate that at least one input is provided', async () => {
      await expect(compositionAPI.encodeUserInput()).rejects.toThrow(
        _ValidationError
      );
    });

    it('should extract Schillinger parameters from encoding', async () => {
      const melody = [60, 62, 64, 65];

      const result = await compositionAPI.encodeUserInput(melody);

      expect(result.schillingerParameters.rhythmGenerators).toEqual([3, 4]);
      expect(result.schillingerParameters.harmonyGenerators).toEqual([4, 5]);
      expect(result.schillingerParameters.melodyGenerators).toEqual([5, 7]);
    });
  });

  describe('error handling', () => {
    it('should handle rhythm generation errors gracefully', async () => {
      mockSDK.rhythm.generateResultant = vi
        .fn()
        .mockRejectedValue(new Error('Rhythm generation failed'));

      const params = {
        name: 'Test Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
      };

      await expect(compositionAPI.create(params)).rejects.toThrow(
        _ProcessingError
      );
    });

    it('should handle harmony generation errors gracefully', async () => {
      mockSDK.harmony.generateProgression = vi
        .fn()
        .mockRejectedValue(new Error('Harmony generation failed'));

      const params = {
        name: 'Test Song',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
      };

      await expect(compositionAPI.create(params)).rejects.toThrow(
        _ProcessingError
      );
    });

    it('should handle analysis errors gracefully', async () => {
      mockSDK.rhythm.analyzePattern = vi
        .fn()
        .mockRejectedValue(new Error('Analysis failed'));

      const composition = {
        id: 'test-id',
        name: 'Test Song',
        sections: [
          {
            id: 'section-1',
            type: 'verse' as any,
            rhythm: {
              durations: [1, 2, 1],
              timeSignature: [4, 4] as [number, number],
            },
            harmony: { chords: ['C', 'F', 'G'], key: 'C', scale: 'major' },
            length: 8,
            position: 0,
          },
        ],
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
        metadata: { complexity: 0.5 },
      };

      await expect(
        compositionAPI.analyzeComposition(composition)
      ).rejects.toThrow(_ProcessingError);
    });
  });
});
