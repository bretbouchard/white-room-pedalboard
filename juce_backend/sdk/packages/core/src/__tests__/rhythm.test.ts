/**
 * Tests for the Rhythm API implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RhythmAPI } from '../rhythm';
import { SchillingerSDK } from '../client';
import { ValidationError as _ValidationError } from '@schillinger-sdk/shared';

// Mock the SDK client
const mockSDK = {
  isOfflineMode: vi.fn(() => true),
  getCachedOrExecute: vi.fn(),
  makeRequest: vi.fn(),
} as unknown as SchillingerSDK;

describe('RhythmAPI', () => {
  let rhythmAPI: RhythmAPI;

  beforeEach(() => {
    rhythmAPI = new RhythmAPI(mockSDK);
    vi.clearAllMocks();
  });

  describe('generateResultant', () => {
    it('should generate rhythmic resultant from two generators', async () => {
      const mockResult = {
        durations: [3, 1, 0, 1, 3, 1],
        timeSignature: [4, 4] as [number, number],
        tempo: 120,
        metadata: {
          generators: [3, 2] as [number, number],
          variationType: 'resultant',
          complexity: 0.5,
        },
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockResult);

      const result = await rhythmAPI.generateResultant(3, 2);

      expect(result).toEqual(mockResult);
      expect(mockSDK.getCachedOrExecute).toHaveBeenCalledWith(
        expect.stringContaining('rhythm:resultant'),
        expect.any(Function)
      );
    });

    it('should validate generator inputs', async () => {
      await expect(rhythmAPI.generateResultant(0, 2)).rejects.toThrow(
        _ValidationError
      );
      await expect(rhythmAPI.generateResultant(3, -1)).rejects.toThrow(
        _ValidationError
      );
      await expect(rhythmAPI.generateResultant(40, 2)).rejects.toThrow(
        _ValidationError
      );
      await expect(rhythmAPI.generateResultant(3, 3)).rejects.toThrow(
        _ValidationError
      );
    });
  });

  describe('generateVariation', () => {
    const mockPattern = {
      durations: [1, 2, 1, 2],
      timeSignature: [4, 4] as [number, number],
      tempo: 120,
    };

    it('should generate rhythm variations', async () => {
      const mockResult = {
        ...mockPattern,
        durations: [2, 1, 1, 2], // retrograde
        metadata: {
          variationType: 'retrograde',
          complexity: 0.4,
        },
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockResult);

      const result = await rhythmAPI.generateVariation(
        mockPattern,
        'retrograde'
      );

      expect(result).toEqual(mockResult);
      expect(mockSDK.getCachedOrExecute).toHaveBeenCalledWith(
        expect.stringContaining('rhythm:variation'),
        expect.any(Function)
      );
    });

    it('should validate pattern input', async () => {
      const invalidPattern = {
        durations: [],
        timeSignature: [4, 4] as [number, number],
      };

      await expect(
        rhythmAPI.generateVariation(invalidPattern, 'retrograde')
      ).rejects.toThrow(_ValidationError);
    });

    it('should validate variation type', async () => {
      await expect(
        rhythmAPI.generateVariation(mockPattern, 'invalid' as any)
      ).rejects.toThrow(_ValidationError);
    });
  });

  describe('generateComplex', () => {
    it('should generate complex rhythm patterns', async () => {
      const mockResult = {
        durations: [3, 1, 0, 1, 3, 1, 0, 1],
        timeSignature: [4, 4] as [number, number],
        tempo: 140,
        swing: 0.1,
        metadata: {
          generators: [3, 2] as [number, number],
          variationType: 'complex',
          complexity: 0.7,
        },
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockResult);

      const result = await rhythmAPI.generateComplex({
        generators: [3, 2],
        tempo: 140,
        swing: 0.1,
        complexity: 0.7,
      });

      expect(result).toEqual(mockResult);
    });

    it('should validate complex generation parameters', async () => {
      await expect(
        rhythmAPI.generateComplex({
          generators: [3, 3], // same generators
        })
      ).rejects.toThrow(_ValidationError);

      await expect(
        rhythmAPI.generateComplex({
          tempo: 400, // invalid tempo
        })
      ).rejects.toThrow(_ValidationError);

      await expect(
        rhythmAPI.generateComplex({
          swing: 1.5, // invalid swing
        })
      ).rejects.toThrow(_ValidationError);
    });
  });

  describe('analyzePattern', () => {
    const mockPattern = {
      durations: [1, 0, 1, 2, 1, 0, 2, 1],
      timeSignature: [4, 4] as [number, number],
      tempo: 120,
    };

    it('should analyze rhythm patterns', async () => {
      const mockAnalysis = {
        complexity: 0.6,
        syncopation: 0.4,
        density: 0.75,
        patterns: [
          {
            type: 'repetition',
            position: 0,
            length: 4,
            confidence: 0.8,
          },
        ],
        suggestions: [
          'Pattern has good complexity',
          'Moderate syncopation creates interest',
        ],
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockAnalysis);

      const result = await rhythmAPI.analyzePattern(mockPattern);

      expect(result).toEqual(mockAnalysis);
      expect(mockSDK.getCachedOrExecute).toHaveBeenCalledWith(
        expect.stringContaining('rhythm:analyze'),
        expect.any(Function)
      );
    });

    it('should validate pattern input for analysis', async () => {
      const invalidPattern = {
        durations: [-1, 2, 3], // negative duration
        timeSignature: [4, 4] as [number, number],
      };

      await expect(rhythmAPI.analyzePattern(invalidPattern)).rejects.toThrow(
        _ValidationError
      );
    });
  });

  describe('inferGenerators', () => {
    const mockPattern = {
      durations: [3, 1, 0, 1, 3, 1],
      timeSignature: [4, 4] as [number, number],
    };

    it('should infer generators from rhythm pattern', async () => {
      const mockInference = {
        generators: [3, 2] as [number, number],
        confidence: 0.85,
        alternatives: [
          {
            generators: [6, 4] as [number, number],
            confidence: 0.72,
          },
        ],
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockInference);

      const result = await rhythmAPI.inferGenerators(mockPattern);

      expect(result).toEqual(mockInference);
      expect(mockSDK.getCachedOrExecute).toHaveBeenCalledWith(
        expect.stringContaining('rhythm:infer-generators'),
        expect.any(Function)
      );
    });
  });

  describe('encodePattern', () => {
    it('should encode rhythm pattern into Schillinger parameters', async () => {
      const mockEncoding = {
        type: 'rhythm' as const,
        parameters: {
          generators: [3, 2],
          confidence: 0.85,
          analysis: {
            patternSimilarity: 0.9,
            lengthMatch: 1.0,
            accentMatch: 0.8,
            densityMatch: 0.85,
          },
        },
        confidence: 0.85,
        alternatives: [],
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockEncoding);

      const result = await rhythmAPI.encodePattern([3, 1, 0, 1, 3, 1]);

      expect(result).toEqual(mockEncoding);
    });

    it('should handle both array and RhythmPattern inputs', async () => {
      const mockEncoding = {
        type: 'rhythm' as const,
        parameters: { generators: [3, 2] },
        confidence: 0.85,
        alternatives: [],
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockEncoding);

      // Test with array input
      await rhythmAPI.encodePattern([1, 2, 1, 2]);
      expect(mockSDK.getCachedOrExecute).toHaveBeenCalled();

      // Test with RhythmPattern input
      const pattern = {
        durations: [1, 2, 1, 2],
        timeSignature: [4, 4] as [number, number],
      };
      await rhythmAPI.encodePattern(pattern);
      expect(mockSDK.getCachedOrExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('findBestFit', () => {
    const mockPattern = {
      durations: [1, 0, 1, 2, 1, 0, 2, 1],
      timeSignature: [4, 4] as [number, number],
    };

    it('should find best Schillinger matches', async () => {
      const mockMatches = [
        {
          generators: [3, 2] as [number, number],
          confidence: 0.85,
          pattern: {
            durations: [3, 1, 0, 1, 3, 1],
            timeSignature: [4, 4] as [number, number],
            metadata: {
              generators: [3, 2] as [number, number],
              complexity: 0.6,
            },
          },
          similarity: 0.9,
          analysis: {
            patternSimilarity: 0.9,
            lengthMatch: 0.8,
            accentMatch: 0.85,
            densityMatch: 0.9,
          },
        },
      ];

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockMatches);

      const result = await rhythmAPI.findBestFit(mockPattern);

      expect(result).toEqual(mockMatches);
      expect(mockSDK.getCachedOrExecute).toHaveBeenCalledWith(
        expect.stringContaining('rhythm:find-best-fit'),
        expect.any(Function)
      );
    });

    it('should use default options when none provided', async () => {
      (mockSDK.getCachedOrExecute as any).mockResolvedValue([]);

      await rhythmAPI.findBestFit(mockPattern);

      expect(mockSDK.getCachedOrExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );
    });
  });

  describe('validatePattern', () => {
    it('should validate valid patterns', () => {
      const validPattern = {
        durations: [1, 2, 1, 2],
        timeSignature: [4, 4] as [number, number],
        tempo: 120,
        swing: 0.1,
      };

      const result = rhythmAPI.validatePattern(validPattern);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid patterns', () => {
      const invalidPattern = {
        durations: [], // empty
        timeSignature: [4, 3] as [number, number], // invalid denominator
        tempo: 400, // too fast
        swing: 1.5, // out of range
      };

      const result = rhythmAPI.validatePattern(invalidPattern);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide warnings and suggestions', () => {
      const complexPattern = {
        durations: new Array(70).fill(1), // very long
        timeSignature: [15, 8] as [number, number], // complex time signature
        tempo: 50, // very slow
      };

      const result = rhythmAPI.validatePattern(complexPattern);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getPatternStats', () => {
    it('should calculate pattern statistics', () => {
      const pattern = {
        durations: [1, 2, 0, 1, 3, 0, 2, 1],
        timeSignature: [4, 4] as [number, number],
      };

      const stats = rhythmAPI.getPatternStats(pattern);

      expect(stats.totalDuration).toBe(10);
      expect(stats.averageDuration).toBe(1.25);
      expect(stats.uniqueValues).toBe(4); // 0, 1, 2, 3
      expect(stats.density).toBe(0.75); // 6 non-zero out of 8
      expect(stats.complexity).toBeGreaterThan(0);
      expect(stats.syncopation).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeComplexRhythm', () => {
    const mockPattern = {
      durations: [1, 0, 1, 2, 1, 0, 2, 1, 3, 0, 1, 2],
      timeSignature: [4, 4] as [number, number],
    };

    it('should analyze complex rhythms', async () => {
      const mockAnalysis = {
        primaryGenerators: [
          {
            generators: [3, 2] as [number, number],
            confidence: 0.8,
            alternatives: [],
          },
        ],
        secondaryGenerators: [
          {
            generators: [4, 3] as [number, number],
            confidence: 0.6,
            alternatives: [],
          },
        ],
        isPolyrhythmic: true,
        complexityScore: 0.75,
      };

      (mockSDK.getCachedOrExecute as any).mockResolvedValue(mockAnalysis);

      const result = await rhythmAPI.analyzeComplexRhythm(mockPattern);

      expect(result).toEqual(mockAnalysis);
      expect(result.isPolyrhythmic).toBe(true);
      expect(result.complexityScore).toBeGreaterThan(0.5);
    });
  });
});
