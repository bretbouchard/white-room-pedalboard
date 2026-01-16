/**
 * Tests for Harmony API implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HarmonyAPI } from '../harmony';
import { SchillingerSDK } from '../client';

// Mock the dependencies
vi.mock('@schillinger-sdk/shared/math/harmonic-progressions', () => ({
  generateHarmonicProgression: vi.fn(),
  generateFromTemplate: vi.fn(),
  generateProgressionVariations: vi.fn(),
}));

vi.mock('@schillinger-sdk/analysis/reverse-analysis/harmony-reverse', () => ({
  analyzeProgression: vi.fn(),
  analyzeChord: vi.fn(),
  inferHarmonicGenerators: vi.fn(),
  encodeProgression: vi.fn(),
  analyzeVoiceLeadingAndRhythm: vi.fn(),
}));

describe('HarmonyAPI', () => {
  let harmonyAPI: HarmonyAPI;
  let mockSDK: Partial<SchillingerSDK>;

  beforeEach(() => {
    mockSDK = {
      cache: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        has: vi.fn().mockResolvedValue(false),
        keys: vi.fn().mockResolvedValue([]),
        size: vi.fn().mockResolvedValue(0),
      },
      isOfflineMode: vi.fn(() => false),
      makeRequest: vi.fn(),
    };
    harmonyAPI = new HarmonyAPI(mockSDK as SchillingerSDK);
  });

  describe('generateProgression', () => {
    it('should generate chord progression with valid parameters', async () => {
      const mockProgression = {
        chords: ['C', 'Am', 'F', 'G'],
        functions: ['tonic', 'tonic', 'subdominant', 'dominant'],
        tensions: [0.1, 0.2, 0.3, 0.4],
        generators: { a: 3, b: 2 },
        key: 'C',
        scale: 'major',
        metadata: {
          complexity: 0.5,
          stability: 0.7,
          movement: 0.6,
          voiceLeading: {
            smoothness: 0.8,
            contraryMotion: 0.3,
            parallelMotion: 0.2,
            stepwiseMotion: 0.7,
          },
        },
      };

      const { generateHarmonicProgression } = await import(
        '@schillinger-sdk/shared/math/harmonic-progressions'
      );
      vi.mocked(generateHarmonicProgression).mockReturnValue(mockProgression);

      const result = await harmonyAPI.generateProgression('C', 'major', 4);

      expect(result).toEqual({
        chords: ['C', 'Am', 'F', 'G'],
        key: 'C',
        scale: 'major',
        metadata: {
          generators: { a: 3, b: 2 },
          functions: ['tonic', 'tonic', 'subdominant', 'dominant'],
          tensions: [0.1, 0.2, 0.3, 0.4],
          complexity: 0.5,
          stability: 0.7,
          movement: 0.6,
          voiceLeading: {
            smoothness: 0.8,
            contraryMotion: 0.3,
            parallelMotion: 0.2,
            stepwiseMotion: 0.7,
          },
        },
      });

      expect(generateHarmonicProgression).toHaveBeenCalledWith(3, 2, {
        key: 'C',
        scale: 'major',
        length: 4,
        complexity: 'moderate',
        style: 'contemporary',
        allowExtensions: true,
        allowAlterations: false,
      });
    });

    it('should throw ValidationError for invalid key', async () => {
      await expect(
        harmonyAPI.generateProgression('', 'major', 4)
      ).rejects.toThrow('Invalid key: expected valid key string');
    });

    it('should throw ValidationError for invalid scale', async () => {
      await expect(harmonyAPI.generateProgression('C', '', 4)).rejects.toThrow(
        'Invalid scale: expected valid scale string'
      );
    });

    it('should throw ValidationError for invalid length', async () => {
      await expect(
        harmonyAPI.generateProgression('C', 'major', 0)
      ).rejects.toThrow('Invalid length: expected number between 1 and 32');

      await expect(
        harmonyAPI.generateProgression('C', 'major', 50)
      ).rejects.toThrow('Invalid length: expected number between 1 and 32');
    });

    it('should use cached result when available', async () => {
      const cachedResult = {
        chords: ['C', 'F', 'G', 'C'],
        key: 'C',
        scale: 'major',
        metadata: {},
      };

      vi.mocked(mockSDK.cache!.get).mockResolvedValue(cachedResult);

      const result = await harmonyAPI.generateProgression('C', 'major', 4);

      expect(result).toEqual(cachedResult);
      expect(mockSDK.cache!.get).toHaveBeenCalled();
    });
  });

  describe('analyzeProgression', () => {
    it('should analyze chord progression', async () => {
      const mockAnalysis = {
        chords: [],
        key: 'C',
        scale: 'major',
        functions: ['tonic', 'subdominant', 'dominant', 'tonic'],
        cadences: [],
        modulations: [],
        voiceLeading: {
          smoothness: 0.8,
          contraryMotion: 0.3,
          parallelMotion: 0.2,
          stepwiseMotion: 0.7,
        },
        harmonicRhythm: [1, 1, 1, 1],
        tensionCurve: [0.1, 0.3, 0.6, 0.1],
      };

      const { analyzeProgression } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(analyzeProgression).mockReturnValue(mockAnalysis);

      const chords = ['C', 'F', 'G', 'C'];
      const result = await harmonyAPI.analyzeProgression(chords);

      expect(result).toEqual({
        key_stability: 0.5, // 2 tonic chords out of 4
        tension_curve: [0.1, 0.3, 0.6, 0.1],
        functionalanalysis: ['tonic', 'subdominant', 'dominant', 'tonic'],
        voice_leading_quality: expect.any(Number),
        suggestions: expect.any(Array),
      });

      expect(analyzeProgression).toHaveBeenCalledWith(chords);
    });

    it('should throw ValidationError for empty chord array', async () => {
      await expect(harmonyAPI.analyzeProgression([])).rejects.toThrow(
        'Invalid chords: expected non-empty array of chord symbols'
      );
    });

    it('should throw ValidationError for invalid chord symbols', async () => {
      await expect(
        harmonyAPI.analyzeProgression(['C', '', 'G'])
      ).rejects.toThrow(
        'Invalid chords[1]: expected valid chord symbol string'
      );
    });
  });

  describe('generateVariations', () => {
    it('should generate progression variations', async () => {
      const inputProgression = {
        chords: ['C', 'Am', 'F', 'G'],
        key: 'C',
        scale: 'major',
        metadata: {
          functions: ['tonic', 'tonic', 'subdominant', 'dominant'],
          tensions: [0.1, 0.2, 0.3, 0.4],
          complexity: 0.5,
          stability: 0.7,
          movement: 0.6,
          voiceLeading: {
            smoothness: 0.8,
            contraryMotion: 0.3,
            parallelMotion: 0.2,
            stepwiseMotion: 0.7,
          },
        },
      };

      const mockVariations = [
        {
          chords: ['C', 'Am7', 'Fmaj7', 'G7'],
          functions: ['tonic', 'tonic', 'subdominant', 'dominant'],
          tensions: [0.1, 0.3, 0.4, 0.5],
          key: 'C',
          scale: 'major',
          metadata: {
            complexity: 0.6,
            stability: 0.7,
            movement: 0.6,
            voiceLeading: {
              smoothness: 0.8,
              contraryMotion: 0.3,
              parallelMotion: 0.2,
              stepwiseMotion: 0.7,
            },
          },
        },
      ];

      const { generateProgressionVariations } = await import(
        '@schillinger-sdk/shared/math/harmonic-progressions'
      );
      vi.mocked(generateProgressionVariations).mockReturnValue(mockVariations);

      const result = await harmonyAPI.generateVariations(inputProgression);

      expect(result).toHaveLength(1);
      expect(result[0].chords).toEqual(['C', 'Am7', 'Fmaj7', 'G7']);
      expect(generateProgressionVariations).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid progression', async () => {
      await expect(harmonyAPI.generateVariations({} as any)).rejects.toThrow(
        'Invalid progression: expected valid ChordProgression object'
      );
    });
  });

  describe('resolveChord', () => {
    it('should resolve chord to possible next chords', async () => {
      const mockChordAnalysis = {
        chord: 'G7',
        rootNote: 'G',
        quality: 'dominant' as const,
        extensions: ['7'],
        alterations: [],
        tensions: [0.4],
        function: 'dominant' as const,
        stability: 0.3,
        complexity: 0.4,
      };

      const { analyzeChord } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(analyzeChord).mockReturnValue(mockChordAnalysis);

      const context = {
        key: 'C',
        scale: 'major',
      };

      const result = await harmonyAPI.resolveChord('G7', context);

      expect(result.chord).toBe('G7');
      expect(result.context.function).toBe('dominant');
      expect(result.resolutions).toHaveLength(2); // Strong resolution to C, deceptive to Am
      expect(result.resolutions[0].target).toBe('C');
      expect(result.resolutions[0].type).toBe('strong');
      expect(analyzeChord).toHaveBeenCalledWith('G7', 'C', 'major');
    });

    it('should throw ValidationError for invalid chord', async () => {
      const context = { key: 'C', scale: 'major' };
      await expect(harmonyAPI.resolveChord('', context)).rejects.toThrow(
        'Invalid chord: expected valid chord symbol string'
      );
    });

    it('should throw ValidationError for invalid context', async () => {
      await expect(harmonyAPI.resolveChord('G7', {} as any)).rejects.toThrow(
        'Invalid context: expected HarmonicContext with key and scale'
      );
    });
  });

  describe('inferHarmonicStructure', () => {
    it('should infer Schillinger generators from progression', async () => {
      const mockInference = {
        generators: { a: 3, b: 2 },
        confidence: 0.8,
        matchQuality: 0.7,
        progression: {} as any,
        analysis: {
          functionalMatch: 0.7,
          tensionMatch: 0.6,
          movementMatch: 0.8,
          voiceLeadingMatch: 0.7,
        },
        detectedParameters: {
          key: 'C',
          scale: 'major',
          style: 'contemporary' as const,
          complexity: 'moderate' as const,
        },
      };

      const { inferHarmonicGenerators } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(inferHarmonicGenerators).mockReturnValue([mockInference]);

      const chords = ['C', 'Am', 'F', 'G'];
      const result = await harmonyAPI.inferHarmonicStructure(chords);

      expect(result).toEqual(mockInference);
      expect(inferHarmonicGenerators).toHaveBeenCalledWith(chords, {
        maxGenerator: 16,
        minConfidence: 0.1,
        maxResults: 1,
        includeAlternatives: false,
      });
    });

    it('should throw ValidationError for empty chord array', async () => {
      await expect(harmonyAPI.inferHarmonicStructure([])).rejects.toThrow(
        'Invalid chords: expected non-empty array of chord symbols'
      );
    });

    it('should throw ProcessingError when no generators found', async () => {
      const { inferHarmonicGenerators } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(inferHarmonicGenerators).mockReturnValue([]);

      await expect(
        harmonyAPI.inferHarmonicStructure(['C', 'F', 'G'])
      ).rejects.toThrow(
        'Failed to infer harmonic structure: No suitable Schillinger generators found'
      );
    });
  });

  describe('encodeProgression', () => {
    it('should encode chord progression into Schillinger parameters', async () => {
      const mockEncoding = {
        originalProgression: ['C', 'Am', 'F', 'G'],
        bestMatch: {} as any,
        alternatives: [],
        confidence: 0.8,
        progressionAnalysis: {} as any,
        metadata: {
          analysisTimestamp: Date.now(),
          progressionLength: 4,
          averageTension: 0.3,
          functionalComplexity: 0.5,
        },
      };

      const { encodeProgression } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(encodeProgression).mockReturnValue(mockEncoding);

      const chords = ['C', 'Am', 'F', 'G'];
      const result = await harmonyAPI.encodeProgression(chords);

      expect(result).toEqual(mockEncoding);
      expect(encodeProgression).toHaveBeenCalledWith(chords, {
        maxGenerator: 16,
        minConfidence: 0.1,
        maxResults: 5,
        includeAlternatives: true,
      });
    });

    it('should handle ChordProgression object input', async () => {
      const mockEncoding = {
        originalProgression: ['C', 'Am', 'F', 'G'],
        bestMatch: {} as any,
        alternatives: [],
        confidence: 0.8,
        progressionAnalysis: {} as any,
        metadata: {
          analysisTimestamp: Date.now(),
          progressionLength: 4,
          averageTension: 0.3,
          functionalComplexity: 0.5,
        },
      };

      const { encodeProgression } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(encodeProgression).mockReturnValue(mockEncoding);

      const progression = {
        chords: ['C', 'Am', 'F', 'G'],
        key: 'C',
        scale: 'major',
      };

      const result = await harmonyAPI.encodeProgression(progression);

      expect(result).toEqual(mockEncoding);
      expect(encodeProgression).toHaveBeenCalledWith(['C', 'Am', 'F', 'G'], {
        maxGenerator: 16,
        minConfidence: 0.1,
        maxResults: 5,
        includeAlternatives: true,
      });
    });

    it('should throw ValidationError for invalid input', async () => {
      await expect(harmonyAPI.encodeProgression([] as any)).rejects.toThrow(
        'Invalid inputChords: expected non-empty array of chord symbols or ChordProgression object'
      );
    });
  });

  describe('findHarmonicMatches', () => {
    it('should find harmonic matches for target progression', async () => {
      const targetProgression = {
        chords: ['C', 'Am', 'F', 'G'],
        key: 'C',
        scale: 'major',
      };

      const mockMatches = [
        {
          generators: { a: 3, b: 2 },
          confidence: 0.8,
          matchQuality: 0.7,
          progression: {} as any,
          analysis: {
            functionalMatch: 0.7,
            tensionMatch: 0.6,
            movementMatch: 0.8,
            voiceLeadingMatch: 0.7,
          },
          detectedParameters: {
            key: 'C',
            scale: 'major',
            style: 'contemporary' as const,
            complexity: 'moderate' as const,
          },
        },
      ];

      const { inferHarmonicGenerators } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(inferHarmonicGenerators).mockReturnValue(mockMatches);

      const result = await harmonyAPI.findHarmonicMatches(targetProgression);

      expect(result).toEqual(mockMatches);
      expect(inferHarmonicGenerators).toHaveBeenCalledWith(
        ['C', 'Am', 'F', 'G'],
        {
          maxGenerator: 16,
          minConfidence: 0.1,
          maxResults: 10,
          includeAlternatives: true,
        }
      );
    });

    it('should throw ValidationError for invalid progression', async () => {
      await expect(harmonyAPI.findHarmonicMatches({} as any)).rejects.toThrow(
        'Invalid targetProgression: expected valid ChordProgression object'
      );
    });
  });

  describe('generateFromTemplate', () => {
    it('should generate progression from Roman numeral template', async () => {
      const mockProgression = {
        chords: ['C', 'F', 'G', 'C'],
        functions: ['I', 'IV', 'V', 'I'],
        tensions: [0.1, 0.3, 0.6, 0.1],
        key: 'C',
        scale: 'major',
        metadata: {
          complexity: 0.4,
          stability: 0.8,
          movement: 0.5,
          voiceLeading: {
            smoothness: 0.8,
            contraryMotion: 0.3,
            parallelMotion: 0.2,
            stepwiseMotion: 0.7,
          },
        },
      };

      const { generateFromTemplate } = await import(
        '@schillinger-sdk/shared/math/harmonic-progressions'
      );
      vi.mocked(generateFromTemplate).mockReturnValue(mockProgression);

      const template = ['I', 'IV', 'V', 'I'];
      const result = await harmonyAPI.generateFromTemplate(template, {
        key: 'C',
        scale: 'major',
      });

      expect(result.chords).toEqual(['C', 'F', 'G', 'C']);
      expect(result.metadata?.template).toEqual(template);
      expect(generateFromTemplate).toHaveBeenCalledWith(template, {
        key: 'C',
        scale: 'major',
      });
    });

    it('should throw ValidationError for empty template', async () => {
      await expect(harmonyAPI.generateFromTemplate([])).rejects.toThrow(
        'Invalid template: expected non-empty array of Roman numeral strings'
      );
    });
  });

  describe('analyzeVoiceLeadingAndRhythm', () => {
    it('should analyze voice leading and harmonic rhythm', async () => {
      const mockAnalysis = {
        voiceLeading: {
          smoothness: 0.8,
          contraryMotion: 0.3,
          parallelMotion: 0.2,
          stepwiseMotion: 0.7,
          leapMotion: 0.3,
          voiceRanges: {
            bass: [40, 60] as [number, number],
            tenor: [48, 68] as [number, number],
            alto: [55, 75] as [number, number],
            soprano: [60, 80] as [number, number],
          },
        },
        harmonicRhythm: {
          changes: [1, 1, 1, 1],
          density: 1,
          acceleration: [0, 0, 0],
          patterns: [],
        },
      };

      const { analyzeVoiceLeadingAndRhythm } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(analyzeVoiceLeadingAndRhythm).mockReturnValue(mockAnalysis);

      const chords = ['C', 'Am', 'F', 'G'];
      const result = await harmonyAPI.analyzeVoiceLeadingAndRhythm(chords);

      expect(result).toEqual(mockAnalysis);
      expect(analyzeVoiceLeadingAndRhythm).toHaveBeenCalledWith(chords);
    });

    it('should handle ChordPattern input', async () => {
      const mockAnalysis = {
        voiceLeading: {
          smoothness: 0.8,
          contraryMotion: 0.3,
          parallelMotion: 0.2,
          stepwiseMotion: 0.7,
          leapMotion: 0.3,
          voiceRanges: {
            bass: [40, 60] as [number, number],
            tenor: [48, 68] as [number, number],
            alto: [55, 75] as [number, number],
            soprano: [60, 80] as [number, number],
          },
        },
        harmonicRhythm: {
          changes: [1, 1, 1, 1],
          density: 1,
          acceleration: [0, 0, 0],
          patterns: [],
        },
      };

      const { analyzeVoiceLeadingAndRhythm } = await import(
        '@schillinger-sdk/analysis/reverse-analysis/harmony-reverse'
      );
      vi.mocked(analyzeVoiceLeadingAndRhythm).mockReturnValue(mockAnalysis);

      const chordPattern = {
        chords: ['C', 'Am', 'F', 'G'],
        key: 'C',
        scale: 'major',
      };

      const result =
        await harmonyAPI.analyzeVoiceLeadingAndRhythm(chordPattern);

      expect(result).toEqual(mockAnalysis);
      expect(analyzeVoiceLeadingAndRhythm).toHaveBeenCalledWith(chordPattern);
    });

    it('should throw ValidationError for invalid input', async () => {
      await expect(
        harmonyAPI.analyzeVoiceLeadingAndRhythm([] as any)
      ).rejects.toThrow(
        'Invalid progression: expected non-empty array of chord symbols or ChordPattern object'
      );
    });
  });
});
