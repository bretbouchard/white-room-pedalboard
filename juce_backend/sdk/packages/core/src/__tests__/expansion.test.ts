import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExpansionOperators,
  ExpansionAPI,
  ContourDirection,
  ExpansionOptions,
  ExpansionOperation,
  CoordinateTransformation
} from '../expansion';
import { SchillingerSDK } from '../client';
import { ValidationError as _ValidationError } from '@schillinger-sdk/shared';

describe('ExpansionOperators', () => {
  describe('Contour Expansion', () => {
    it('should generate permutation expansions for basic contours', () => {
      const contour: ContourDirection[] = ['up', 'down', 'up'];
      const expansions = ExpansionOperators.expandContour(contour);

      expect(expansions).toHaveLength.greaterThan(0);
      expect(expansions.every(e => e.originalContour === contour)).toBe(true);
      expect(expansions.every(e => e.expandedContour.length >= 3)).toBe(true);
    });

    it('should preserve contour integrity when requested', () => {
      const contour: ContourDirection[] = ['up', 'down', 'same', 'up'];
      const options: ExpansionOptions = {
        preserveContour: true,
        maintainIntegrity: true,
        allowDissonance: false
      };

      const expansions = ExpansionOperators.expandContour(contour, options);

      expansions.forEach(expansion => {
        expect(expansion.integrity).toBe.greaterThanOrEqual(0.3);
        if (expansion.operation === 'permutation' || expansion.operation === 'retrograde') {
          expect(expansion.expandedContour).toEqual(expect.arrayContaining(['up', 'down']));
        }
      });
    });

    it('should generate retrograde expansion correctly', () => {
      const contour: ContourDirection[] = ['up', 'down', 'same'];
      const expansions = ExpansionOperators.expandContour(contour);

      const retrograde = expansions.find(e => e.operation === 'retrograde');
      expect(retrograde).toBeDefined();
      expect(retrograde!.expandedContour).toEqual(['same', 'down', 'up']);
      expect(retrograde!.expansionRatio).toBe(1);
    });

    it('should generate inversion expansion correctly', () => {
      const contour: ContourDirection[] = ['up', 'down', 'same', 'up'];
      const expansions = ExpansionOperators.expandContour(contour);

      const inversion = expansions.find(e => e.operation === 'inversion');
      expect(inversion).toBeDefined();
      expect(inversion!.expandedContour).toEqual(['down', 'up', 'same', 'down']);
      expect(inversion!.expansionRatio).toBe(1);
    });

    it('should handle empty contour gracefully', () => {
      const expansions = ExpansionOperators.expandContour([]);

      expect(expansions).toEqual([]);
    });

    it('should handle single element contour', () => {
      const contour: ContourDirection[] = ['up'];
      const expansions = ExpansionOperators.expandContour(contour);

      expect(expansions.length).toBe.greaterThanOrEqual(0);
    });
  });

  describe('Interval Expansion', () => {
    it('should generate arithmetic expansions', () => {
      const intervals = [2, 3, 4];
      const options: ExpansionOptions = {
        preserveContour: true,
        maintainIntegrity: true,
        allowDissonance: false
      };

      const expansions = ExpansionOperators.expandIntervals(intervals, options);

      const arithmeticExp = expansions.find(e => e.operation === 'arithmetic');
      expect(arithmeticExp).toBeDefined();
      expect(arithmeticExp!.expandedIntervals.length).toBeGreaterThan(intervals.length);
      expect(arithmeticExp!.harmonicMean).toBe.greaterThan(0);
    });

    it('should generate geometric expansions', () => {
      const intervals = [1, 2, 4];
      const expansions = ExpansionOperators.expandIntervals(intervals);

      const geometricExp = expansions.find(e => e.operation === 'geometric');
      expect(geometricExp).toBeDefined();
      expect(geometricExp!.expandedIntervals.length).toBeGreaterThan(intervals.length);
    });

    it('should generate fibonacci expansions', () => {
      const intervals = [1, 2, 3];
      const expansions = ExpansionOperators.expandIntervals(intervals);

      const fibonacciExpansions = expansions.filter(e => e.operation.startsWith('fibonacci'));
      expect(fibonacciExpansions.length).toBeGreaterThan(0);

      fibonacciExpansions.forEach(exp => {
        expect(exp.expandedIntervals.length).toBe(2); // Original + expanded
      });
    });

    it('should generate harmonic series expansions', () => {
      const intervals = [2, 3];
      const expansions = ExpansionOperators.expandIntervals(intervals);

      const harmonicExpansions = expansions.filter(e => e.operation === 'harmonic-series');
      expect(harmonicExpansions.length).toBeGreaterThan(0);

      harmonicExpansions.forEach(exp => {
        expect(exp.expandedIntervals).toContain(2);
        expect(exp.expandedIntervals).toContain(4); // 2 * 2
        expect(exp.expandedIntervals).toContain(6); // 2 * 3
      });
    });

    it('should calculate consonance correctly', () => {
      const consonantIntervals = [3, 4, 5]; // Thirds, fourths, fifths
      const dissonantIntervals = [2, 6, 7]; // Seconds, tritones, sevenths

      const consonantExpansions = ExpansionOperators.expandIntervals(consonantIntervals);
      const dissonantExpansions = ExpansionOperators.expandIntervals(dissonantIntervals);

      const avgConsonantConsonance = consonantExpansions.reduce((sum, e) => sum + e.consonance, 0) / consonantExpansions.length;
      const avgDissonantConsonance = dissonantExpansions.reduce((sum, e) => sum + e.consonance, 0) / dissonantExpansions.length;

      expect(avgConsonantConsonance).toBeGreaterThan(avgDissonantConsonance);
    });

    it('should respect allowDissonance option', () => {
      const dissonantIntervals = [1, 2, 11]; // Minor second, major second, major seventh

      const withDissonance = ExpansionOperators.expandIntervals(dissonantIntervals, { allowDissonance: true });
      const withoutDissonance = ExpansionOperators.expandIntervals(dissonantIntervals, { allowDissonance: false });

      expect(withDissonance.length).toBe.greaterThanOrEqual(withoutDissonance.length);
    });
  });

  describe('Coordinate Transformation', () => {
    it('should apply basic transformations correctly', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 }
      ];

      const transform: CoordinateTransformation = {
        xCoefficients: [2, 0],
        yCoefficients: [0, 2],
        translation: { x: 1, y: 1 },
        determinant: 4
      };

      const transformed = ExpansionOperators.transformCoordinates(points, transform);

      expect(transformed).toEqual([
        { x: 1, y: 1 },     // (0*2 + 0 + 1, 0*2 + 0 + 1)
        { x: 3, y: 3 },     // (1*2 + 0 + 1, 1*2 + 0 + 1)
        { x: 5, y: 1 }      // (2*2 + 0 + 1, 0*2 + 0 + 1)
      ]);
    });

    it('should apply rotation transformations', () => {
      const points = [{ x: 1, y: 0 }];
      const angle = Math.PI / 2; // 90 degrees

      const transform: CoordinateTransformation = {
        xCoefficients: [Math.cos(angle), -Math.sin(angle)],
        yCoefficients: [Math.sin(angle), Math.cos(angle)],
        translation: { x: 0, y: 0 },
        determinant: 1
      };

      const transformed = ExpansionOperators.transformCoordinates(points, transform);

      expect(transformed[0].x).toBeCloseTo(0, 5);
      expect(transformed[0].y).toBeCloseTo(1, 5);
    });
  });

  describe('Interpolation', () => {
    it('should perform linear interpolation', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 4, y: 4 }
      ];

      const result = ExpansionOperators.interpolateContour(points, {
        method: 'linear',
        tension: 0.5,
        continuity: 0.5,
        bias: 0
      });

      expect(result.points.length).toBeGreaterThan(2);
      expect(result.points[0]).toEqual({ x: 0, y: 0 });
      expect(result.points[result.points.length - 1]).toEqual({ x: 4, y: 4 });
      expect(result.interpolationType).toBe('linear');
      expect(result.error).toBe(0);
    });

    it('should perform cubic interpolation', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ];

      const result = ExpansionOperators.interpolateContour(points, {
        method: 'cubic',
        tension: 0.5,
        continuity: 0.5,
        bias: 0
      });

      expect(result.points.length).toBeGreaterThan(points.length);
      expect(result.interpolationType).toBe('cubic');
    });

    it('should handle bezier interpolation', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 4, y: 0 }
      ];

      const result = ExpansionOperators.interpolateContour(points, {
        method: 'bezier',
        tension: 0.3,
        continuity: 0.5,
        bias: 0
      });

      expect(result.points.length).toBeGreaterThan(points.length);
      expect(result.interpolationType).toBe('bezier');
    });

    it('should handle catmull-rom interpolation', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: 3, y: 3 }
      ];

      const result = ExpansionOperators.interpolateContour(points, {
        method: 'catmull-rom',
        tension: 0.5,
        continuity: 0.7,
        bias: 0
      });

      expect(result.points.length).toBeGreaterThan(points.length);
      expect(result.interpolationType).toBe('catmull-rom');
    });
  });

  describe('Expansion Composition', () => {
    it('should compose multiple expansion operations', () => {
      const initialData = [1, 2, 3, 4];
      const operations: ExpansionOperation[] = [
        { type: 'expand', parameters: { ratio: 2, method: 'linear', preserveEndpoint: true } },
        { type: 'permute', parameters: { type: 'rotation', axis: 2 } }
      ];

      const sequence = ExpansionOperators.composeExpansions(initialData, operations);

      expect(sequence.operations).toEqual(operations);
      expect(sequence.finalResult).toBeDefined();
      expect(sequence.cumulativeTransform.determinant).toBe(2); // Scaling factor from expansion
      expect(sequence.metadata).toBeDefined();
    });

    it('should track cumulative transformation', () => {
      const operations: ExpansionOperation[] = [
        { type: 'expand', parameters: { ratio: 2, method: 'linear', preserveEndpoint: true } },
        { type: 'expand', parameters: { ratio: 1.5, method: 'linear', preserveEndpoint: true } }
      ];

      const sequence = ExpansionOperators.composeExpansions([1, 2, 3], operations);

      expect(sequence.cumulativeTransform.determinant).toBe(3); // 2 * 1.5
    });
  });

  describe('Expansion Analysis', () => {
    it('should analyze expansion properties correctly', () => {
      const original = [1, 2, 3];
      const expanded = [1, 1.5, 2, 2.5, 3];

      const analysis = ExpansionOperators.analyzeExpansion(original, expanded);

      expect(analysis.complexity).toBe.greaterThan(0);
      expect(analysis.integrity).toBe.greaterThan(0);
      expect(analysis.elegance).toBe.greaterThanOrEqual(0);
      expect(analysis.growth).toBe(expanded.length / original.length);
      expect(analysis.redundancy).toBe.greaterThanOrEqual(0);
    });

    it('should calculate growth ratio correctly', () => {
      const original = [1, 2, 3];
      const expanded = [1, 2, 3, 4, 5, 6]; // Double the size

      const analysis = ExpansionOperators.analyzeExpansion(original, expanded);

      expect(analysis.growth).toBe(2);
    });

    it('should detect redundancy in repeated patterns', () => {
      const original = [1, 2, 3];
      const expanded = [1, 1, 1, 2, 2, 2, 3, 3, 3]; // High redundancy

      const analysis = ExpansionOperators.analyzeExpansion(original, expanded);

      expect(analysis.redundancy).toBe.greaterThan(0.5);
    });
  });
});

describe('ExpansionAPI', () => {
  describe('Melodic Expansion Generation', () => {
    it('should generate melodic expansions', async () => {
      const melody = {
        notes: [
          { pitch: 60, time: 0, duration: 1 },
          { pitch: 62, time: 1, duration: 1 },
          { pitch: 64, time: 2, duration: 1 }
        ],
        contour: ['up', 'up']
      };

      const result = await ExpansionAPI.generateMelodicExpansions(melody);

      expect(result.expansions.length).toBeGreaterThan(0);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.complexity).toBe.greaterThanOrEqual(0);
      expect(result.analysis.integrity).toBe.greaterThanOrEqual(0);
      expect(result.analysis.elegance).toBe.greaterThanOrEqual(0);
    });

    it('should respect expansion options', async () => {
      const melody = {
        notes: [
          { pitch: 60, time: 0, duration: 1 },
          { pitch: 62, time: 1, duration: 1 },
          { pitch: 61, time: 2, duration: 1 }
        ],
        contour: ['up', 'down']
      };

      const options: ExpansionOptions = {
        preserveContour: true,
        maintainIntegrity: true,
        allowDissonance: false,
        expansionRatio: 1.5
      };

      const result = await ExpansionAPI.generateMelodicExpansions(melody, options);

      expect(result.expansions.length).toBeGreaterThan(0);
      result.expansions.forEach(exp => {
        if (options.preserveContour) {
          expect(exp.integrity).toBe.greaterThanOrEqual(0.3);
        }
      });
    });
  });

  describe('Harmonic Expansion Generation', () => {
    it('should generate harmonic expansions', async () => {
      const harmony = {
        intervals: [3, 4, 3], // Major thirds, perfect fourths
        rootProgression: [0, 3, 7, 10] // C major progression
      };

      const result = await ExpansionAPI.generateHarmonicExpansions(harmony);

      expect(result.expansions.length).toBeGreaterThan(0);
      expect(result.transform).toBeDefined();
      expect(result.transform.determinant).toBe(1); // No scaling by default
    });

    it('should handle dissonant intervals when allowed', async () => {
      const harmony = {
        intervals: [2, 6, 2], // Minor seconds, tritones
        rootProgression: [0, 2, 8, 10]
      };

      const withDissonance = await ExpansionAPI.generateHarmonicExpansions(harmony, { allowDissonance: true });
      const withoutDissonance = await ExpansionAPI.generateHarmonicExpansions(harmony, { allowDissonance: false });

      expect(withDissonance.expansions.length).toBe.greaterThanOrEqual(withoutDissonance.expansions.length);
    });
  });

  describe('Custom Transformation', () => {
    it('should apply custom transformation sequence', async () => {
      const data = [1, 2, 3, 4];
      const operations: ExpansionOperation[] = [
        { type: 'expand', parameters: { ratio: 2, method: 'linear', preserveEndpoint: true } },
        { type: 'permute', parameters: { type: 'reflection' } }
      ];

      const result = await ExpansionAPI.applyCustomTransformation(data, operations);

      expect(result.operations).toEqual(operations);
      expect(result.finalResult).toBeDefined();
      expect(result.cumulativeTransform).toBeDefined();
    });
  });

  describe('Expansion Quality Analysis', () => {
    it('should provide quality analysis', async () => {
      const original = [1, 2, 3, 4];
      const expanded = [1, 1.5, 2, 2.5, 3, 3.5, 4];

      const result = await ExpansionAPI.analyzeExpansionQuality(original, expanded);

      expect(result.quality).toBe.greaterThanOrEqual(0);
      expect(result.quality).toBe.lessThanOrEqual(1);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.complexity).toBe.greaterThanOrEqual(0);
      expect(result.metrics.integrity).toBe.greaterThanOrEqual(0);
      expect(result.metrics.elegance).toBe.greaterThanOrEqual(0);
      expect(result.recommendation).toBeDefined();
    });

    it('should give high quality for good expansions', async () => {
      const original = [1, 2, 3];
      const expanded = [1, 1.5, 2, 2.5, 3]; // Clean linear expansion

      const result = await ExpansionAPI.analyzeExpansionQuality(original, expanded);

      expect(result.quality).toBe.greaterThan(0.6);
      expect(result.recommendation).toContain('Good');
    });

    it('should give low quality for poor expansions', async () => {
      const original = [1, 2, 3];
      const expanded = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]; // High redundancy

      const result = await ExpansionAPI.analyzeExpansionQuality(original, expanded);

      expect(result.quality).toBe.lessThan(0.6);
      expect(result.metrics.redundancy).toBe.greaterThan(0.5);
    });
  });
});

describe('Property-Based Testing', () => {
  describe('Contour Expansion Properties', () => {
    it('should preserve contour direction relationships', async () => {
      await fc.assert(fc.property(
        fc.array(fc.constantFrom('up', 'down', 'same'), { minLength: 2, maxLength: 10 }),
        (contour) => {
          const expansions = ExpansionOperators.expandContour(contour);

          // All expansions should be valid
          expansions.forEach(exp => {
            expect(exp.originalContour).toEqual(contour);
            expect(exp.expandedContour.length).toBe.greaterThanOrEqual(contour.length);
            expect(exp.integrity).toBe.greaterThanOrEqual(0);
            expect(exp.integrity).toBe.lessThanOrEqual(1);
          });
        }
      ));
    });

    it('should handle permutation operations correctly', async () => {
      await fc.assert(fc.property(
        fc.array(fc.constantFrom('up', 'down', 'same'), { minLength: 3, maxLength: 8 }),
        (contour) => {
          const expansions = ExpansionOperators.expandContour(contour);
          const permutations = expansions.filter(e => e.operation === 'permutation');

          permutations.forEach(exp => {
            // Permutations should contain the same elements
            const originalCount = contour.reduce((acc, dir) => {
              acc[dir] = (acc[dir] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const expandedCount = exp.expandedContour.reduce((acc, dir) => {
              acc[dir] = (acc[dir] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            expect(originalCount.up + originalCount.down + originalCount.same)
              .toBe(expandedCount.up + expandedCount.down + expandedCount.same);
          });
        }
      ));
    });
  });

  describe('Interval Expansion Properties', () => {
    it('should maintain mathematical relationships in interval expansions', async () => {
      await fc.assert(fc.property(
        fc.array(fc.integer(-12, 12), { minLength: 2, maxLength: 8 }),
        (intervals) => {
          const expansions = ExpansionOperators.expandIntervals(intervals);

          expansions.forEach(exp => {
            expect(exp.originalIntervals).toEqual(intervals);
            expect(exp.harmonicMean).toBe.greaterThan(0);
            expect(exp.tension).toBe.greaterThanOrEqual(0);
            expect(exp.tension).toBe.lessThanOrEqual(1);
            expect(exp.consonance).toBe.greaterThanOrEqual(0);
            expect(exp.consonance).toBe.lessThanOrEqual(1);
          });
        }
      ));
    });

    it('should generate valid Fibonacci expansions', async () => {
      await fc.assert(fc.property(
        fc.array(fc.integer(1, 12), { minLength: 1, maxLength: 5 }),
        (intervals) => {
          const expansions = ExpansionOperators.expandIntervals(intervals);
          const fibonacciExpansions = expansions.filter(e => e.operation.startsWith('fibonacci'));

          fibonacciExpansions.forEach(exp => {
            // Each Fibonacci expansion should have 2 intervals per original
            expect(exp.expandedIntervals.length).toBe(intervals.length * 2);

            // Check if Fibonacci ratios are used
            const fibNumbers = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
            const usesValidFib = exp.expandedIntervals.every(interval =>
              intervals.some(original =>
                fibNumbers.some(fib => Math.abs(interval - original * fib) < 0.001)
              )
            );
            expect(usesValidFib).toBe(true);
          });
        }
      ));
    });
  });

  describe('Transformation Properties', () => {
    it('should compose transformations associatively', async () => {
      await fc.assert(fc.property(
        fc.array(fc.integer(-10, 10), { minLength: 2, maxLength: 6 }),
        fc.integer(2, 4), // First ratio
        fc.integer(2, 4), // Second ratio
        (data, ratio1, ratio2) => {
          const ops1: ExpansionOperation[] = [
            { type: 'expand', parameters: { ratio: ratio1, method: 'linear', preserveEndpoint: true } },
            { type: 'expand', parameters: { ratio: ratio2, method: 'linear', preserveEndpoint: true } }
          ];

          const ops2: ExpansionOperation[] = [
            { type: 'expand', parameters: { ratio: ratio1 * ratio2, method: 'linear', preserveEndpoint: true } }
          ];

          const sequence1 = ExpansionOperators.composeExpansions(data, ops1);
          const sequence2 = ExpansionOperators.composeExpansions(data, ops2);

          // Results should be similar (accounting for implementation differences)
          expect(Math.abs(sequence1.cumulativeTransform.determinant - sequence2.cumulativeTransform.determinant))
            .toBe.lessThan(0.001);
        }
      ));
    });
  });

  describe('Quality Metrics Properties', () => {
    it('should provide consistent quality scores', async () => {
      await fc.assert(fc.property(
        fc.array(fc.integer(1, 12), { minLength: 2, maxLength: 8 }),
        async (original) => {
          // Generate a simple expansion
          const expanded = [...original, ...original.map(x => x + 1)];

          const result = await ExpansionAPI.analyzeExpansionQuality(original, expanded);

          expect(result.quality).toBe.greaterThanOrEqual(0);
          expect(result.quality).toBe.lessThanOrEqual(1);
          expect(result.metrics.complexity).toBe.greaterThanOrEqual(0);
          expect(result.metrics.complexity).toBe.lessThanOrEqual(1);
          expect(result.metrics.integrity).toBe.greaterThanOrEqual(0);
          expect(result.metrics.integrity).toBe.lessThanOrEqual(1);
          expect(result.metrics.elegance).toBe.greaterThanOrEqual(0);
          expect(result.metrics.elegance).toBe.lessThanOrEqual(1);
          expect(result.metrics.growth).toBe.greaterThanOrEqual(0);
          expect(result.metrics.redundancy).toBe.greaterThanOrEqual(0);
          expect(result.redundancy).toBe.lessThanOrEqual(1);
        }
      ));
    });
  });
});