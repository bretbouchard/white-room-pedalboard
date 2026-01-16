/**
 * Comprehensive unit tests for validation functions
 * Includes edge cases, error handling, and performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateKey,
  validateScale,
  validateTempo,
  validateTimeSignature,
  validateRange,
  validateDurations,
  validateChordProgression,
  validateMusicTheoryContext,
  validateSchillingerParameters,
  createValidationError,
  type ValidationResult,
  type MusicTheoryValidation,
} from '../validation';
import { ValidationError as _ValidationError } from '../../errors';

describe('Validation Functions - Input Validation', () => {
  let performanceStart: number;

  beforeEach(() => {
    performanceStart = performance.now();
  });

  afterEach(() => {
    const duration = performance.now() - performanceStart;
    if (duration > 10) {
      console.warn(
        `Validation test took ${duration.toFixed(2)}ms - consider optimization`
      );
    }
  });

  describe('validateKey', () => {
    describe('Valid Keys', () => {
      it('should accept all standard keys', () => {
        const validKeys = [
          'C',
          'C#',
          'Db',
          'D',
          'D#',
          'Eb',
          'E',
          'F',
          'F#',
          'Gb',
          'G',
          'G#',
          'Ab',
          'A',
          'A#',
          'Bb',
          'B',
        ];

        validKeys.forEach(key => {
          const result = validateKey(key);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should provide enharmonic warnings', () => {
        const enharmonicKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];

        enharmonicKeys.forEach(key => {
          const result = validateKey(key);
          expect(result.valid).toBe(true);
          expect(result.warnings.length).toBeGreaterThan(0);
          expect(result.warnings[0]).toContain('Consider using');
        });
      });
    });

    describe('Invalid Keys', () => {
      it('should reject non-string inputs', () => {
        const invalidInputs = [null, undefined, 123, [], {}, true];

        invalidInputs.forEach(input => {
          const result = validateKey(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Key must be a string');
        });
      });

      it('should reject invalid key names', () => {
        const invalidKeys = ['H', 'X', 'C##', 'Dbb', 'Z#', 'invalid'];

        invalidKeys.forEach(key => {
          const result = validateKey(key);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('Invalid key');
        });
      });

      it('should suggest closest matches for typos', () => {
        const typos = [
          { input: 'c', expected: 'C' },
          { input: 'f#', expected: 'F#' },
          { input: 'Bb', expected: 'Bb' }, // Should already be valid
        ];

        typos.forEach(({ input, expected }) => {
          const result = validateKey(input);
          if (input !== expected) {
            expect(result.valid).toBe(false);
            if (result.suggestions.length > 0) {
              expect(result.suggestions.some(s => s.includes(expected))).toBe(
                true
              );
            }
          }
        });
      });

      it('should handle unicode musical symbols', () => {
        const unicodeKeys = ['C♯', 'D♭', 'F♯'];

        unicodeKeys.forEach(key => {
          const result = validateKey(key);
          expect(result.valid).toBe(false);
          expect(result.suggestions.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('validateScale', () => {
    describe('Valid Scales', () => {
      it('should accept all standard scales', () => {
        const validScales = [
          'major',
          'minor',
          'dorian',
          'phrygian',
          'lydian',
          'mixolydian',
          'locrian',
          'harmonic_minor',
          'melodic_minor',
          'pentatonic_major',
          'pentatonic_minor',
          'blues',
          'chromatic',
        ];

        validScales.forEach(scale => {
          const result = validateScale(scale);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should warn about complex scales', () => {
        const complexScales = ['harmonic_minor', 'melodic_minor', 'locrian'];

        complexScales.forEach(scale => {
          const result = validateScale(scale);
          expect(result.valid).toBe(true);
          expect(result.warnings.length).toBeGreaterThan(0);
          expect(result.warnings[0]).toContain('complex scale');
        });
      });
    });

    describe('Invalid Scales', () => {
      it('should reject non-string inputs', () => {
        const invalidInputs = [null, undefined, 123, [], {}];

        invalidInputs.forEach(input => {
          const result = validateScale(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Scale must be a string');
        });
      });

      it('should suggest closest matches', () => {
        const typos = [
          { input: 'maj', expected: 'major' },
          { input: 'min', expected: 'minor' },
          { input: 'dor', expected: 'dorian' },
        ];

        typos.forEach(({ input, expected }) => {
          const result = validateScale(input);
          expect(result.valid).toBe(false);
          expect(result.suggestions.some(s => s.includes(expected))).toBe(true);
        });
      });
    });
  });

  describe('validateTempo', () => {
    describe('Valid Tempos', () => {
      it('should accept tempos in valid range', () => {
        const validTempos = [40, 60, 120, 140, 180, 200, 300];

        validTempos.forEach(tempo => {
          const result = validateTempo(tempo);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should provide warnings for extreme tempos', () => {
        const extremeTempos = [
          { tempo: 45, type: 'slow' },
          { tempo: 250, type: 'fast' },
        ];

        extremeTempos.forEach(({ tempo, type }) => {
          const result = validateTempo(tempo);
          expect(result.valid).toBe(true);
          expect(result.warnings.length).toBeGreaterThan(0);
          expect(result.warnings[0]).toContain(`Very ${type}`);
        });
      });

      it('should provide style suggestions', () => {
        const tempoRanges = [
          { tempo: 70, style: 'ballads' },
          { tempo: 130, style: 'moderate dance' },
          { tempo: 160, style: 'energetic dance' },
        ];

        tempoRanges.forEach(({ tempo, style }) => {
          const result = validateTempo(tempo);
          expect(result.valid).toBe(true);
          if (result.suggestions.length > 0) {
            expect(result.suggestions[0]).toContain(style);
          }
        });
      });
    });

    describe('Invalid Tempos', () => {
      it('should reject non-numeric inputs', () => {
        const invalidInputs = ['120', null, undefined, [], {}];

        invalidInputs.forEach(input => {
          const result = validateTempo(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Tempo must be a number');
        });
      });

      it('should reject infinite and NaN values', () => {
        const invalidNumbers = [NaN, Infinity, -Infinity];

        invalidNumbers.forEach(tempo => {
          const result = validateTempo(tempo);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('finite number');
        });
      });

      it('should reject out-of-range tempos', () => {
        const outOfRange = [
          { tempo: 30, error: 'too slow' },
          { tempo: 350, error: 'too fast' },
        ];

        outOfRange.forEach(({ tempo, error }) => {
          const result = validateTempo(tempo);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain(error);
        });
      });
    });
  });

  describe('validateTimeSignature', () => {
    describe('Valid Time Signatures', () => {
      it('should accept common time signatures', () => {
        const validSigs = [
          [4, 4],
          [3, 4],
          [2, 4],
          [6, 8],
          [9, 8],
          [12, 8],
          [2, 2],
          [3, 8],
        ];

        validSigs.forEach(sig => {
          const result = validateTimeSignature(sig);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should warn about unusual time signatures', () => {
        const unusualSigs = [
          [7, 8],
          [5, 4],
          [11, 8],
          [13, 16],
        ];

        unusualSigs.forEach(sig => {
          const result = validateTimeSignature(sig);
          expect(result.valid).toBe(true);
          expect(result.warnings.length).toBeGreaterThan(0);
          expect(result.warnings[0]).toContain('Unusual time signature');
        });
      });

      it('should suggest subdivisions for complex meters', () => {
        const complexSigs = [
          [15, 8],
          [21, 16],
        ];

        complexSigs.forEach(sig => {
          const result = validateTimeSignature(sig);
          expect(result.valid).toBe(true);
          if (result.suggestions.length > 0) {
            expect(result.suggestions[0]).toContain('subdivided');
          }
        });
      });
    });

    describe('Invalid Time Signatures', () => {
      it('should reject non-array inputs', () => {
        const invalidInputs = ['4/4', 4, null, undefined, {}];

        invalidInputs.forEach(input => {
          const result = validateTimeSignature(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('must be an array');
        });
      });

      it('should reject wrong array length', () => {
        const wrongLength = [[4], [4, 4, 4], []];

        wrongLength.forEach(sig => {
          const result = validateTimeSignature(sig);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('exactly 2 elements');
        });
      });

      it('should reject invalid numerators', () => {
        const invalidNumerators = [
          [0, 4],
          [-1, 4],
          [1.5, 4],
          [40, 4],
        ];

        invalidNumerators.forEach(sig => {
          const result = validateTimeSignature(sig);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('numerator');
        });
      });

      it('should reject invalid denominators', () => {
        const invalidDenominators = [
          [4, 0],
          [4, -1],
          [4, 3],
          [4, 5],
          [4, 64],
        ];

        invalidDenominators.forEach(sig => {
          const result = validateTimeSignature(sig);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('denominator');
        });
      });
    });
  });

  describe('validateRange', () => {
    describe('Valid Ranges', () => {
      it('should accept valid MIDI ranges', () => {
        const validRanges = [
          [60, 72], // C4-C5
          [21, 108], // A0-C8
          [36, 96], // C2-C7
          [48, 84], // C3-C6
        ];

        validRanges.forEach(range => {
          const result = validateRange(range);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should provide suggestions for common ranges', () => {
        const commonRanges = [
          { range: [60, 84], type: 'vocal' },
          { range: [40, 76], type: 'instrumental' },
        ];

        commonRanges.forEach(({ range, type }) => {
          const result = validateRange(range);
          expect(result.valid).toBe(true);
          if (result.suggestions.length > 0) {
            expect(result.suggestions[0]).toContain(type);
          }
        });
      });

      it('should warn about extreme ranges', () => {
        const extremeRanges = [
          { range: [10, 30], type: 'low' },
          { range: [100, 120], type: 'high' },
          { range: [60, 65], type: 'narrow' },
          { range: [20, 120], type: 'wide' },
        ];

        extremeRanges.forEach(({ range, type }) => {
          const result = validateRange(range);
          expect(result.valid).toBe(true);
          expect(result.warnings.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Invalid Ranges', () => {
      it('should reject non-array inputs', () => {
        const invalidInputs = ['60-72', 60, null, undefined];

        invalidInputs.forEach(input => {
          const result = validateRange(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('must be an array');
        });
      });

      it('should reject out-of-MIDI-range values', () => {
        const outOfRange = [
          [-1, 60],
          [60, 128],
          [-10, 150],
        ];

        outOfRange.forEach(range => {
          const result = validateRange(range);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('between 0 and 127');
        });
      });

      it('should reject inverted ranges', () => {
        const invertedRanges = [
          [72, 60],
          [100, 50],
        ];

        invertedRanges.forEach(range => {
          const result = validateRange(range);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('less than maximum');
        });
      });
    });
  });

  describe('validateDurations', () => {
    describe('Valid Durations', () => {
      it('should accept valid duration arrays', () => {
        const validDurations = [
          [1, 2, 1, 2],
          [0, 1, 0, 2, 3],
          [4, 0, 2, 1, 0, 3],
          [1],
        ];

        validDurations.forEach(durations => {
          const result = validateDurations(durations);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should warn about sparse patterns', () => {
        const sparseDurations = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0];

        const result = validateDurations(sparseDurations);
        expect(result.valid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('sparse');
      });

      it('should suggest improvements for repetitive patterns', () => {
        const repetitiveDurations = [2, 2, 2, 2, 2, 2];

        const result = validateDurations(repetitiveDurations);
        expect(result.valid).toBe(true);
        if (result.suggestions.length > 0) {
          expect(result.suggestions[0]).toContain('variety');
        }
      });

      it('should warn about very long patterns', () => {
        const longDurations = new Array(40).fill(1);

        const result = validateDurations(longDurations);
        expect(result.valid).toBe(true);
        if (result.suggestions.length > 0) {
          expect(result.suggestions[0]).toContain('smaller sections');
        }
      });
    });

    describe('Invalid Durations', () => {
      it('should reject non-array inputs', () => {
        const invalidInputs = ['1,2,3', 123, null, undefined];

        invalidInputs.forEach(input => {
          const result = validateDurations(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('must be an array');
        });
      });

      it('should reject empty arrays', () => {
        const result = validateDurations([]);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('cannot be empty');
      });

      it('should accept decimal values for musical durations', () => {
        const decimalDurations = [1, 2.5, 0.5, 4];

        const result = validateDurations(decimalDurations);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid numeric values', () => {
        const invalidDurations = [1, NaN, 3, Infinity];

        const result = validateDurations(invalidDurations);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('must be a finite number');
      });

      it('should reject negative values', () => {
        const negativeDurations = [1, -2, 3, 4];

        const result = validateDurations(negativeDurations);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('cannot be negative');
      });

      it('should warn about very long durations', () => {
        const longDurations = [1, 2, 100, 4];

        const result = validateDurations(longDurations);
        expect(result.valid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('Very long duration');
      });
    });
  });

  describe('validateChordProgression', () => {
    describe('Valid Progressions', () => {
      it('should accept standard chord progressions', () => {
        const validProgressions = [
          ['C', 'F', 'G', 'C'],
          ['Am', 'F', 'C', 'G'],
          ['Dm7', 'G7', 'Cmaj7'],
          ['C#m', 'F#', 'B', 'E'],
        ];

        validProgressions.forEach(chords => {
          const result = validateChordProgression(chords);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should warn about single chords', () => {
        const result = validateChordProgression(['C']);
        expect(result.valid).toBe(true);
        expect(result.warnings[0]).toContain('Single chord');
      });

      it('should warn about very long progressions', () => {
        const longProgression = new Array(20).fill('C');

        const result = validateChordProgression(longProgression);
        expect(result.valid).toBe(true);
        expect(result.warnings[0]).toContain('Very long progression');
      });

      it('should suggest variety for repetitive progressions', () => {
        const repetitive = ['C', 'C', 'C', 'C'];

        const result = validateChordProgression(repetitive);
        expect(result.valid).toBe(true);
        if (result.warnings.length > 0) {
          expect(result.warnings[0]).toContain('no harmonic movement');
        }
      });
    });

    describe('Invalid Progressions', () => {
      it('should reject non-array inputs', () => {
        const invalidInputs = ['C-F-G-C', null, undefined, 123];

        invalidInputs.forEach(input => {
          const result = validateChordProgression(input);
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('must be an array');
        });
      });

      it('should reject empty progressions', () => {
        const result = validateChordProgression([]);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('cannot be empty');
      });

      it('should reject non-string chord symbols', () => {
        const invalidChords = ['C', 123, 'F', null];

        const result = validateChordProgression(invalidChords);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('must be a string');
      });

      it('should reject empty chord symbols', () => {
        const emptyChords = ['C', '', 'F', 'G'];

        const result = validateChordProgression(emptyChords);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('cannot be empty');
      });

      it('should warn about invalid chord symbols', () => {
        const questionableChords = ['C', 'Xyz', 'F', 'G'];

        const result = validateChordProgression(questionableChords);
        expect(result.valid).toBe(true); // Valid structure, questionable content
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('may not be a valid chord symbol');
      });
    });
  });

  describe('validateMusicTheoryContext', () => {
    it('should validate complete context', () => {
      const context = {
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        range: [60, 72],
      };

      const result = validateMusicTheoryContext(context);

      expect(result.key.valid).toBe(true);
      expect(result.scale.valid).toBe(true);
      expect(result.tempo.valid).toBe(true);
      expect(result.timeSignature.valid).toBe(true);
      expect(result.range.valid).toBe(true);
    });

    it('should handle partial context', () => {
      const partialContext = {
        key: 'F#',
        tempo: 140,
      };

      const result = validateMusicTheoryContext(partialContext);

      expect(result.key.valid).toBe(true);
      expect(result.tempo.valid).toBe(true);
      expect(result.scale.valid).toBe(true); // Should be valid (empty)
      expect(result.timeSignature.valid).toBe(true); // Should be valid (empty)
      expect(result.range.valid).toBe(true); // Should be valid (empty)
    });

    it('should propagate validation errors', () => {
      const invalidContext = {
        key: 'invalid',
        scale: 'fake',
        tempo: 1000,
        timeSignature: [4, 3],
        range: [200, 300],
      };

      const result = validateMusicTheoryContext(invalidContext);

      expect(result.key.valid).toBe(false);
      expect(result.scale.valid).toBe(false);
      expect(result.tempo.valid).toBe(false);
      expect(result.timeSignature.valid).toBe(false);
      expect(result.range.valid).toBe(false);
    });
  });

  describe('validateSchillingerParameters', () => {
    describe('Valid Parameters', () => {
      it('should accept valid generator pairs', () => {
        const validParams = {
          generators: [3, 4],
          length: 12,
          complexity: 'moderate',
          style: 'jazz',
        };

        const result = validateSchillingerParameters(validParams);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should warn about large generators', () => {
        const largeGenerators = { generators: [20, 25] };

        const result = validateSchillingerParameters(largeGenerators);
        expect(result.valid).toBe(true);
        expect(result.warnings[0]).toContain('Large generators');
      });

      it('should warn about equal generators', () => {
        const equalGenerators = { generators: [5, 5] };

        const result = validateSchillingerParameters(equalGenerators);
        expect(result.valid).toBe(true);
        expect(result.warnings[0]).toContain('Equal generators');
      });
    });

    describe('Invalid Parameters', () => {
      it('should reject invalid generator format', () => {
        const invalidGenerators = [
          { generators: [3] }, // Too few
          { generators: [3, 4, 5] }, // Too many
          { generators: 'invalid' }, // Wrong type
        ];

        invalidGenerators.forEach(params => {
          const result = validateSchillingerParameters(params);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('Generators must be an array');
        });
      });

      it('should reject invalid generator values', () => {
        const invalidValues = [
          { generators: [0, 3] },
          { generators: [3, -1] },
          { generators: [1.5, 3] },
        ];

        invalidValues.forEach(params => {
          const result = validateSchillingerParameters(params);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('positive integers');
        });
      });

      it('should reject invalid length', () => {
        const invalidLengths = [{ length: 0 }, { length: -5 }, { length: 1.5 }];

        invalidLengths.forEach(params => {
          const result = validateSchillingerParameters(params);
          expect(result.valid).toBe(false);
          expect(result.errors[0]).toContain('positive integer');
        });
      });

      it('should reject invalid complexity', () => {
        const result = validateSchillingerParameters({ complexity: 'invalid' });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Complexity must be one of');
      });

      it('should warn about unusual styles', () => {
        const result = validateSchillingerParameters({ style: 'unusual' });
        expect(result.valid).toBe(true);
        expect(result.warnings[0]).toContain('Unusual style');
      });
    });
  });

  describe('createValidationError', () => {
    it('should create comprehensive validation error', () => {
      const validationResult: ValidationResult = {
        valid: false,
        errors: ['Invalid value'],
        warnings: ['Consider alternatives'],
        suggestions: ['Try this instead'],
      };

      const error = createValidationError(
        'testField',
        'testValue',
        validationResult,
        {
          additionalContext: 'test',
        }
      );

      expect(error).toBeInstanceOf(_ValidationError);
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
      expect(error.details?.errors).toEqual(['Invalid value']);
      expect(error.details?.warnings).toEqual(['Consider alternatives']);
      expect(error.details?.suggestions).toEqual(['Try this instead']);
      expect(error.details?.additionalContext).toBe('test');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should validate keys efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        validateKey('C');
        validateKey('F#');
        validateKey('invalid');
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });

    it('should validate complex objects efficiently', () => {
      const start = performance.now();

      const context = {
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        range: [60, 72],
      };

      for (let i = 0; i < 100; i++) {
        validateMusicTheoryContext(context);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should validate large arrays efficiently', () => {
      const start = performance.now();

      const largeDurations = new Array(1000).fill(1);
      const largeProgression = new Array(100).fill('C');

      for (let i = 0; i < 10; i++) {
        validateDurations(largeDurations);
        validateChordProgression(largeProgression);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle null and undefined gracefully', () => {
      const validators = [
        validateKey,
        validateScale,
        validateTempo,
        validateTimeSignature,
        validateRange,
        validateDurations,
        validateChordProgression,
      ];

      validators.forEach(validator => {
        expect(() => validator(null)).not.toThrow();
        expect(() => validator(undefined)).not.toThrow();

        const nullResult = validator(null);
        const undefinedResult = validator(undefined);

        expect(nullResult.valid).toBe(false);
        expect(undefinedResult.valid).toBe(false);
      });
    });

    it('should handle extreme values', () => {
      // Test boundary conditions
      expect(validateTempo(40).valid).toBe(true);
      expect(validateTempo(300).valid).toBe(true);
      expect(validateTempo(39).valid).toBe(false);
      expect(validateTempo(301).valid).toBe(false);

      expect(validateRange([0, 127]).valid).toBe(true);
      expect(validateRange([-1, 127]).valid).toBe(false);
      expect(validateRange([0, 128]).valid).toBe(false);
    });

    it('should provide consistent error messages', () => {
      const invalidKey = validateKey(123);
      const invalidScale = validateScale(123);
      const invalidTempo = validateTempo('120');

      // All should have clear, actionable error messages
      expect(invalidKey.errors[0]).toContain('must be');
      expect(invalidScale.errors[0]).toContain('must be');
      expect(invalidTempo.errors[0]).toContain('must be');
    });
  });
});
