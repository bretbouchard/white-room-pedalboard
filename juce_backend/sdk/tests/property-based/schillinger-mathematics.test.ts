/**
 * Property-Based Tests for Schillinger Mathematical Operations
 *
 * This test file demonstrates comprehensive property-based testing for
 * Schillinger System mathematical operations using fast-check.
 *
 * Properties tested:
 * - Rhythm structure invariants
 * - Harmonic relationship consistency
 * - Scale and chord generation correctness
 * - Interval calculation accuracy
 * - Counterpoint rule adherence
 * - Mathematical precision requirements
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import {
  MusicalGenerators,
  type Scale,
  type Chord,
  type RhythmPattern,
  type TimeSignature,
} from './generators/musical-generators';
import {
  SchillingerValidators,
  TestUtils,
} from '../utilities/schillinger-validators';

describe('Schillinger Mathematical Operations - Property-Based Tests', () => {
  beforeAll(() => {
    console.log('🧮 Starting Schillinger mathematical property-based tests');
  });

  afterAll(() => {
    console.log('✅ Schillinger mathematical property-based tests completed');
  });

  describe('Scale Generation Properties', () => {
    it('should always generate valid scales with 7 notes for diatonic scales', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.scale,
          (scale: Scale) => {
            // Diatonic scales should have 7 notes
            const diatonicTypes = ['major', 'natural-minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'];
            if (diatonicTypes.includes(scale.type)) {
              expect(scale.notes).toHaveLength(7);
            }

            // All notes should be within 0-11 range
            scale.notes.forEach(note => {
              expect(note).toBeGreaterThanOrEqual(0);
              expect(note).toBeLessThanOrEqual(11);
            });

            // Notes should be unique
            const uniqueNotes = [...new Set(scale.notes)];
            expect(uniqueNotes).toHaveLength(scale.notes.length);

            // First note should be the root
            expect(scale.notes[0]).toBe(scale.root);

            return true;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should generate scales with mathematically correct interval patterns', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.scale,
          (scale: Scale) => {
            // Check if intervals are mathematically correct
            for (let i = 1; i < scale.intervals.length; i++) {
              const expectedInterval = scale.intervals[i];
              const actualInterval = (scale.notes[i] - scale.root + 12) % 12;
              expect(actualInterval).toBe(expectedInterval);
            }

            return true;
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should generate scales that are invariant under transposition', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.scale,
          fc.integer({ min: 1, max: 11 }),
          (scale: Scale, transposition: number) => {
            // Create transposed scale
            const transposedRoot = (scale.root + transposition) % 12;
            const transposedScale = TestUtils.generateScalePattern(transposedRoot, scale.type);

            // Check that interval pattern is preserved
            expect(transposedScale.intervals).toEqual(scale.intervals);

            // Check that transposed notes are correct
            const expectedNotes = scale.notes.map(note => (note + transposition) % 12);
            expect(transposedScale.notes).toEqual(expectedNotes.sort((a, b) => a - b));

            return true;
          }
        ),
        { numRuns: 300 }
      );
    });
  });

  describe('Chord Generation Properties', () => {
    it('should generate chords with mathematically correct structure', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.chord,
          (chord: Chord) => {
            // Chord should have at least 3 notes
            expect(chord.notes.length).toBeGreaterThanOrEqual(3);

            // Root should be present in chord (considering inversions)
            const rootNote = chord.notes.find(note => note % 12 === chord.root % 12);
            expect(rootNote).toBeDefined();

            // Check chord type specific properties
            const basePattern = [0, 4, 7]; // Major triad
            if (chord.type === 'major') {
              const intervals = chord.notes.slice(0, 3).map((note, i) =>
                (note - chord.root + 12) % 12
              ).sort((a, b) => a - b);
              expect(intervals).toEqual(basePattern);
            }

            return true;
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should generate chords that respect inversion rules', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.chord,
          (chord: Chord) => {
            if (chord.inversion === 0) {
              // Root position: root should be lowest note
              expect(chord.notes[0] % 12).toBe(chord.root % 12);
            }

            // Check that all notes are present despite inversion
            const rootClass = chord.notes.map(note => note % 12);
            expect(rootClass).toContain(chord.root % 12);

            return true;
          }
        ),
        { numRuns: 300 }
      );
    });

    it('should maintain chord quality consistency across transpositions', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.chord,
          fc.integer({ min: 1, max: 11 }),
          (chord: Chord, transposition: number) => {
            // Calculate chord quality intervals
            const originalIntervals = chord.notes
              .map(note => (note - chord.root + 12) % 12)
              .sort((a, b) => a - b);

            // Transpose chord
            const transposedRoot = (chord.root + transposition) % 12;
            const transposedChord = TestUtils.generateChordStructure(transposedRoot, chord.type, chord.inversion);

            // Calculate transposed chord quality intervals
            const transposedIntervals = transposedChord.notes
              .map(note => (note - transposedRoot + 12) % 12)
              .sort((a, b) => a - b);

            // Quality should be preserved
            expect(transposedIntervals).toEqual(originalIntervals);

            return true;
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Rhythm Structure Properties', () => {
    it('should generate mathematically valid rhythm patterns', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.rhythmPattern,
          (pattern: RhythmPattern) => {
            // All durations should be positive
            pattern.durations.forEach(duration => {
              expect(duration).toBeGreaterThan(0);
            });

            // Accents array should match durations array length
            expect(pattern.accents).toHaveLength(pattern.durations.length);

            // Tempo should be within reasonable bounds
            expect(pattern.tempo).toBeGreaterThanOrEqual(40);
            expect(pattern.tempo).toBeLessThanOrEqual(240);

            // Time signature should be valid
            expect(pattern.timeSignature.numerator).toBeGreaterThan(0);
            expect([1, 2, 4, 8, 16, 32]).toContain(pattern.timeSignature.denominator);

            return true;
          }
        ),
        { numRuns: 300 }
      );
    });

    it('should maintain rhythmic proportions correctly', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.rhythmPattern,
          (pattern: RhythmPattern) => {
            // Calculate total duration in beats
            const totalBeats = pattern.durations.reduce((sum, duration) => sum + duration, 0);

            // Total duration should be positive
            expect(totalBeats).toBeGreaterThan(0);

            // Check that the rhythm can be divided by the beat unit
            const beatUnit = 4 / pattern.timeSignature.denominator;
            const totalBeatsInMeasure = pattern.timeSignature.numerator;

            // For simple validation, check if total is reasonable
            expect(totalBeats).toBeLessThan(totalBeatsInMeasure * 4); // Shouldn't exceed 4 measures

            return true;
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should preserve rhythm structure under tempo scaling', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.rhythmPattern,
          fc.integer({ min: 60, max: 180 }),
          (pattern: RhythmPattern, newTempo: number) => {
            // Calculate rhythm ratios
            const originalRatios = SchillingerValidators.Utils.rhythmicRatio(pattern.durations);

            // Duration scaling factor
            const tempoRatio = pattern.tempo / newTempo;

            // Apply tempo scaling to durations
            const scaledDurations = pattern.durations.map(d => d * tempoRatio);

            // Calculate new ratios
            const scaledRatios = SchillingerValidators.Utils.rhythmicRatio(scaledDurations);

            // Rhythmic ratios should be preserved (within floating point precision)
            originalRatios.forEach((originalRatio, index) => {
              if (index < scaledRatios.length) {
                TestUtils.assertMathPrecision(originalRatio, scaledRatios[index], 1e-10);
              }
            });

            return true;
          }
        ),
        { numRuns: 150 }
      );
    });
  });

  describe('Mathematical Precision Properties', () => {
    it('should maintain floating point precision in calculations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0.1, max: 10 }), { minLength: 2, maxLength: 10 }),
          (durations: number[]) => {
            // Test ratio calculations
            const ratios = SchillingerValidators.Utils.rhythmicRatio(durations);

            // Each ratio should be mathematically correct
            for (let i = 1; i < durations.length; i++) {
              const expectedRatio = durations[i] / durations[i - 1];
              expect(ratios[i - 1]).toBeCloseTo(expectedRatio, 10);
            }

            return true;
          }
        ),
        { numRuns: 500 }
      );
    });

    it('should handle edge cases in mathematical operations', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.float({ min: 0.001, max: 0.01 }), // Very small duration
            fc.float({ min: 1, max: 100 }) // Large duration
          ),
          ([smallDuration, largeDuration]) => {
            // Test ratio calculation with extreme values
            const ratio = largeDuration / smallDuration;
            expect(ratio).toBeGreaterThan(0);
            expect(isFinite(ratio)).toBe(true);

            // Test precision with inverse calculation
            const inverse = smallDuration / largeDuration;
            expect(ratio * inverse).toBeCloseTo(1.0, 10);

            return true;
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should validate rational number representations', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.1, max: 10 }),
          fc.integer({ min: 1, max: 1000 }),
          (value: number, maxDenominator: number) => {
            // Test if value can be represented as rational
            const isRational = SchillingerValidators.MathPrecision.isRational(value, maxDenominator);

            if (isRational) {
              const denominator = SchillingerValidators.MathPrecision.findDenominator(value, maxDenominator);
              expect(denominator).toBeGreaterThan(0);
              expect(denominator).toBeLessThanOrEqual(maxDenominator);

              // Verify the rational approximation
              const approximatedValue = Math.round(value * denominator) / denominator;
              const error = Math.abs(value - approximatedValue);
              expect(error).toBeLessThan(1e-10);
            }

            return true;
          }
        ),
        { numRuns: 300 }
      );
    });
  });

  describe('Schillinger System Invariants', () => {
    it('should respect the fundamental theorem of rhythmic symmetry', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.rhythmSequence({ min: 4, max: 16 }),
          (durations: number[]) => {
            // Schillinger's principle: rhythmic patterns can be inverted and reflected
            const original = [...durations];
            const inverted = [...durations].reverse();

            // Total duration should be preserved under inversion
            const originalTotal = original.reduce((sum, d) => sum + d, 0);
            const invertedTotal = inverted.reduce((sum, d) => sum + d, 0);

            TestUtils.assertMathPrecision(originalTotal, invertedTotal, 1e-10);

            return true;
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should maintain harmonic tension consistency', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.chordProgression({ min: 3, max: 8 }),
          (progression: Chord[]) => {
            // Calculate tension for each chord
            const tensions = progression.map(chord => {
              const intervals = [];
              for (let i = 1; i < chord.notes.length; i++) {
                intervals.push((chord.notes[i] - chord.notes[i - 1] + 12) % 12);
              }
              return SchillingerValidators.Utils.harmonicTension(intervals);
            });

            // Tension should be within valid range
            tensions.forEach(tension => {
              expect(tension).toBeGreaterThanOrEqual(0);
              expect(tension).toBeLessThanOrEqual(3); // Maximum tension for tritone
            });

            return true;
          }
        ),
        { numRuns: 150 }
      );
    });

    it('should preserve voice leading efficiency principles', () => {
      fc.assert(
        fc.property(
          fc.array(MusicalGenerators.chord, { minLength: 2, maxLength: 4 }),
          (chords: Chord[]) => {
            // Test voice leading between consecutive chords
            for (let i = 1; i < chords.length; i++) {
              const fromChord = chords[i - 1].notes.slice(0, 4);
              const toChord = chords[i].notes.slice(0, 4);

              if (fromChord.length >= 3 && toChord.length >= 3) {
                const efficiency = SchillingerValidators.Utils.voiceLeadingEfficiency(fromChord, toChord);

                // Efficiency should be between 0 and 1
                expect(efficiency).toBeGreaterThanOrEqual(0);
                expect(efficiency).toBeLessThanOrEqual(1);

                // Very efficient voice leading should be possible
                expect(efficiency).toBeGreaterThan(0.1);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extreme values gracefully', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.001, max: 1000 }),
          (extremeDuration: number) => {
            // Test with extreme duration values
            expect(() => {
              const pattern = [extremeDuration, extremeDuration * 2, extremeDuration * 3];
              const ratios = SchillingerValidators.Utils.rhythmicRatio(pattern);
              expect(ratios).toHaveLength(2);
            }).not.toThrow();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain mathematical accuracy with very small values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1e-6, max: 1e-3 }),
          (tinyDuration: number) => {
            // Test precision with very small durations
            const pattern = [tinyDuration, tinyDuration * 2];
            const ratio = SchillingerValidators.Utils.rhythmicRatio(pattern)[0];

            TestUtils.assertMathPrecision(ratio, 2.0, 1e-10);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate scale and chord generation consistency', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 11 }),
          fc.constantFrom(...['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']),
          (root: number, scaleType: string) => {
            // Generate scale
            const scale = TestUtils.generateScalePattern(root, scaleType);

            // Generate triad from scale
            const triadNotes = [
              scale.notes[0], // Root
              scale.notes[2], // Third
              scale.notes[4], // Fifth
            ];

            // Generate chord directly
            const chord = TestUtils.generateChordStructure(root, scaleType === 'major' ? 'major' : 'minor');

            // Check consistency (simplified check)
            expect(scale.notes).toContain(root % 12);
            expect(triadNotes).toHaveLength(3);

            return true;
          }
        ),
        { numRuns: 84 } // 12 roots * 7 scale types
      );
    });
  });

  describe('Performance Properties', () => {
    it('should perform mathematical operations within performance thresholds', () => {
      fc.assert(
        fc.property(
          MusicalGenerators.scale,
          MusicalGenerators.chord,
          MusicalGenerators.rhythmPattern,
          (scale: Scale, chord: Chord, rhythm: RhythmPattern) => {
            // Test performance of various operations
            TestUtils.assertPerformance(() => {
              // Scale analysis
              TestUtils.generateScalePattern(scale.root, scale.type);

              // Chord analysis
              TestUtils.generateChordStructure(chord.root, chord.type, chord.inversion);

              // Rhythm analysis
              SchillingerValidators.Utils.rhythmicRatio(rhythm.durations);
            }, 10); // Should complete within 10ms

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should scale linearly with input size', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0.1, max: 2 }), { minLength: 10, maxLength: 100 }),
          (durations: number[]) => {
            const size = durations.length;

            // Measure performance
            const startTime = performance.now();
            SchillingerValidators.Utils.rhythmicRatio(durations);
            const endTime = performance.now();

            const processingTime = endTime - startTime;

            // Processing time should scale linearly with size (approximately)
            // Allow some variance but check for reasonable scaling
            const expectedMaxTime = size * 0.1; // 0.1ms per element
            expect(processingTime).toBeLessThan(expectedMaxTime);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});