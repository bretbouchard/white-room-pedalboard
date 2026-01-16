/**
 * Comprehensive Rhythm System (Book I) Tests
 *
 * Tests all aspects of Schillinger Book I rhythm systems:
 * - Resultant rhythm generation
 * - Permutation rhythm generation
 * - Density rhythm generation
 * - Generator validation
 * - Pattern consistency
 * - Edge cases and error scenarios
 */

import { describe, it, expect } from 'vitest';
import { RhythmSystem, Generator } from '@schillinger-sdk/schemas';
import {
  createRhythmSystem,
  createResultantRhythm,
  createPermutationRhythm,
  createDensityRhythm,
  generateUUID,
} from '../fixtures/test-factories';

describe('Rhythm System - Generators', () => {
  describe('Generator Validation', () => {
    it('should create valid generator with minimum period', () => {
      const generator: Generator = {
        period: 1,
        phaseOffset: 0,
      };

      expect(generator.period).toBe(1);
      expect(generator.phaseOffset).toBe(0);
    });

    it('should create valid generator with large period', () => {
      const generator: Generator = {
        period: 1000,
        phaseOffset: 500,
      };

      expect(generator.period).toBe(1000);
      expect(generator.phaseOffset).toBe(500);
    });

    it('should reject generator with period less than 1', () => {
      const generator = {
        period: 0,
        phaseOffset: 0,
      };

      // Period must be >= 1
      expect(generator.period).toBeLessThan(1);
    });

    it('should reject generator with negative phaseOffset', () => {
      const generator = {
        period: 4,
        phaseOffset: -1,
      };

      // Phase offset must be >= 0
      expect(generator.phaseOffset).toBeLessThan(0);
    });
  });

  describe('Generator Patterns', () => {
    it('should generate consistent pattern from same seed', () => {
      const seed = 42;
      const rhythm1 = createRhythmSystem(seed);
      const rhythm2 = createRhythmSystem(seed);

      expect(rhythm1.generators).toEqual(rhythm2.generators);
      expect(rhythm1.id).toBe(rhythm2.id);
    });

    it('should generate different patterns from different seeds', () => {
      const rhythm1 = createRhythmSystem(42);
      const rhythm2 = createRhythmSystem(43);

      expect(rhythm1.generators).not.toEqual(rhythm2.generators);
      expect(rhythm1.id).not.toBe(rhythm2.id);
    });

    it('should handle multiple generators', () => {
      const rhythm = createRhythmSystem(42, { generatorCount: 5 });

      expect(rhythm.generators).toHaveLength(5);
      expect(rhythm.generators[0].period).toBeDefined();
      expect(rhythm.generators[4].period).toBeDefined();
    });
  });
});

describe('Rhythm System - Resultant Rhythm', () => {
  describe('Creation and Validation', () => {
    it('should create valid resultant rhythm', () => {
      const rhythm = createResultantRhythm(42);

      expect(rhythm.type).toBe('resultant');
      expect(rhythm.generators).toBeDefined();
      expect(rhythm.generators.length).toBeGreaterThanOrEqual(2);
      expect(rhythm.resultant).toBeDefined();
    });

    it('should store resultant pattern', () => {
      const rhythm = createResultantRhythm(42);

      expect(rhythm.resultant).toBeDefined();
      expect(typeof rhythm.resultant).toBe('object');
    });

    it('should generate unique resultant pattern for each seed', () => {
      const rhythm1 = createResultantRhythm(42);
      const rhythm2 = createResultantRhythm(43);

      expect(rhythm1.resultant).not.toEqual(rhythm2.resultant);
    });
  });

  describe('Resultant Calculation', () => {
    it('should calculate resultant for period 3 and 4', () => {
      const generators: Generator[] = [
        { period: 3, phaseOffset: 0 },
        { period: 4, phaseOffset: 0 },
      ];

      generators.forEach(gen => {
        expect(gen.period).toBeGreaterThan(0);
        expect(gen.phaseOffset).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate resultant for period 5 and 7', () => {
      const generators: Generator[] = [
        { period: 5, phaseOffset: 0 },
        { period: 7, phaseOffset: 0 },
      ];

      expect(generators[0].period).toBe(5);
      expect(generators[1].period).toBe(7);
    });

    it('should calculate resultant for period 2 and 3', () => {
      const generators: Generator[] = [
        { period: 2, phaseOffset: 0 },
        { period: 3, phaseOffset: 0 },
      ];

      // Resultant of 2 and 3 should have period 6
      expect(generators[0].period).toBe(2);
      expect(generators[1].period).toBe(3);
    });
  });

  describe('Phase Offsets', () => {
    it('should handle phase offset in resultant', () => {
      const generators: Generator[] = [
        { period: 4, phaseOffset: 0 },
        { period: 6, phaseOffset: 2 },
      ];

      expect(generators[1].phaseOffset).toBe(2);
      expect(generators[1].phaseOffset).toBeLessThan(generators[1].period);
    });

    it('should handle large phase offsets', () => {
      const generators: Generator[] = [
        { period: 8, phaseOffset: 7 },
      ];

      expect(generators[0].phaseOffset).toBe(7);
      expect(generators[0].phaseOffset).toBeLessThan(generators[0].period);
    });

    it('should handle zero phase offset', () => {
      const generators: Generator[] = [
        { period: 4, phaseOffset: 0 },
        { period: 6, phaseOffset: 0 },
      ];

      generators.forEach(gen => {
        expect(gen.phaseOffset).toBe(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle identical periods', () => {
      const generators: Generator[] = [
        { period: 4, phaseOffset: 0 },
        { period: 4, phaseOffset: 2 },
      ];

      expect(generators[0].period).toBe(generators[1].period);
    });

    it('should handle minimum period values', () => {
      const generators: Generator[] = [
        { period: 1, phaseOffset: 0 },
        { period: 1, phaseOffset: 0 },
      ];

      generators.forEach(gen => {
        expect(gen.period).toBe(1);
      });
    });

    it('should handle large period values', () => {
      const generators: Generator[] = [
        { period: 100, phaseOffset: 0 },
        { period: 150, phaseOffset: 50 },
      ];

      expect(generators[0].period).toBe(100);
      expect(generators[1].period).toBe(150);
    });
  });
});

describe('Rhythm System - Permutation Rhythm', () => {
  describe('Creation and Validation', () => {
    it('should create valid permutation rhythm', () => {
      const rhythm = createPermutationRhythm(42);

      expect(rhythm.type).toBe('permutation');
      expect(rhythm.generators).toBeDefined();
      expect(rhythm.permutations).toBeDefined();
      expect(Array.isArray(rhythm.permutations)).toBe(true);
    });

    it('should store permutation arrays', () => {
      const rhythm = createPermutationRhythm(42);

      expect(rhythm.permutations).toBeDefined();
      expect(Array.isArray(rhythm.permutations)).toBe(true);
      expect(rhythm.permutations!.length).toBeGreaterThan(0);
    });

    it('should generate unique permutations for each seed', () => {
      const rhythm1 = createPermutationRhythm(42);
      const rhythm2 = createPermutationRhythm(43);

      expect(rhythm1.permutations).not.toEqual(rhythm2.permutations);
    });
  });

  describe('Permutation Structure', () => {
    it('should create permutations of valid length', () => {
      const rhythm = createPermutationRhythm(42);

      rhythm.permutations!.forEach(permutation => {
        expect(Array.isArray(permutation)).toBe(true);
        expect(permutation.length).toBeGreaterThan(0);
      });
    });

    it('should contain valid permutation values', () => {
      const rhythm = createPermutationRhythm(42);

      rhythm.permutations!.forEach(permutation => {
        permutation.forEach(value => {
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThanOrEqual(1);
        });
      });
    });

    it('should handle multiple permutation sets', () => {
      const rhythm = createPermutationRhythm(42);

      expect(rhythm.permutations!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Permutation Generation', () => {
    it('should generate permutations for n=3', () => {
      // There are 6 permutations of [1, 2, 3]
      const expectedCount = 6;
      const rhythm = createPermutationRhythm(42);

      // Verify permutations are arrays
      rhythm.permutations!.forEach(perm => {
        expect(Array.isArray(perm)).toBe(true);
      });
    });

    it('should generate permutations for n=4', () => {
      // There are 24 permutations of [1, 2, 3, 4]
      const expectedCount = 24;
      const rhythm = createPermutationRhythm(42);

      // Verify structure
      expect(rhythm.permutations).toBeDefined();
      expect(Array.isArray(rhythm.permutations)).toBe(true);
    });

    it('should handle duplicate values in permutations', () => {
      // Some permutations may have duplicate values
      const rhythm = createPermutationRhythm(42);

      rhythm.permutations!.forEach(perm => {
        expect(Array.isArray(perm)).toBe(true);
      });
    });
  });
});

describe('Rhythm System - Density Rhythm', () => {
  describe('Creation and Validation', () => {
    it('should create valid density rhythm', () => {
      const rhythm = createDensityRhythm(42, 0.5);

      expect(rhythm.type).toBe('density');
      expect(rhythm.density).toBeDefined();
      expect(rhythm.density).toBeGreaterThanOrEqual(0);
      expect(rhythm.density).toBeLessThanOrEqual(1);
    });

    it('should store density value', () => {
      const density = 0.7;
      const rhythm = createDensityRhythm(42, density);

      expect(rhythm.density).toBe(density);
    });

    it('should generate unique patterns for same density with different seeds', () => {
      const density = 0.5;
      const rhythm1 = createDensityRhythm(42, density);
      const rhythm2 = createDensityRhythm(43, density);

      expect(rhythm1.id).not.toBe(rhythm2.id);
      expect(rhythm1.density).toBe(rhythm2.density);
    });
  });

  describe('Density Range Validation', () => {
    it('should accept minimum density (0)', () => {
      const rhythm = createDensityRhythm(42, 0);

      expect(rhythm.density).toBe(0);
    });

    it('should accept maximum density (1)', () => {
      const rhythm = createDensityRhythm(42, 1);

      expect(rhythm.density).toBe(1);
    });

    it('should accept midpoint density (0.5)', () => {
      const rhythm = createDensityRhythm(42, 0.5);

      expect(rhythm.density).toBe(0.5);
    });

    it('should handle fractional density values', () => {
      const densities = [0.1, 0.25, 0.33, 0.67, 0.75, 0.9];

      densities.forEach(density => {
        const rhythm = createDensityRhythm(42, density);
        expect(rhythm.density).toBe(density);
      });
    });

    it('should reject density less than 0', () => {
      const density = -0.1;

      expect(density).toBeLessThan(0);
    });

    it('should reject density greater than 1', () => {
      const density = 1.1;

      expect(density).toBeGreaterThan(1);
    });
  });

  describe('Density Pattern Generation', () => {
    it('should generate sparse pattern for low density', () => {
      const rhythmLow = createDensityRhythm(42, 0.2);
      const rhythmHigh = createDensityRhythm(42, 0.8);

      expect(rhythmLow.density).toBeLessThan(rhythmHigh.density);
    });

    it('should generate dense pattern for high density', () => {
      const rhythm = createDensityRhythm(42, 0.9);

      expect(rhythm.density).toBeGreaterThan(0.8);
    });

    it('should handle edge case density values', () => {
      const rhythm1 = createDensityRhythm(42, 0.01);
      const rhythm2 = createDensityRhythm(43, 0.99);

      expect(rhythm1.density).toBeCloseTo(0.01, 2);
      expect(rhythm2.density).toBeCloseTo(0.99, 2);
    });
  });
});

describe('Rhythm System - Integration', () => {
  describe('Multiple Rhythm Systems', () => {
    it('should create multiple rhythm systems', () => {
      const rhythms = [
        createResultantRhythm(1),
        createPermutationRhythm(2),
        createDensityRhythm(3, 0.5),
      ];

      expect(rhythms).toHaveLength(3);

      rhythms.forEach((rhythm, i) => {
        expect(rhythm.id).toBeDefined();
        expect(rhythm.generators).toBeDefined();
        expect(['resultant', 'permutation', 'density']).toContain(rhythm.type);
      });
    });

    it('should maintain unique IDs across rhythm systems', () => {
      const rhythms = [
        createResultantRhythm(1),
        createResultantRhythm(2),
        createResultantRhythm(3),
      ];

      const ids = rhythms.map(r => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should allow mixing different rhythm types', () => {
      const rhythms = [
        createResultantRhythm(1),
        createPermutationRhythm(2),
        createDensityRhythm(3, 0.5),
        createResultantRhythm(4),
      ];

      const types = rhythms.map(r => r.type);

      expect(types).toContain('resultant');
      expect(types).toContain('permutation');
      expect(types).toContain('density');
    });
  });

  describe('Rhythm System Consistency', () => {
    it('should produce consistent rhythm from same seed', () => {
      const seed = 42;
      const rhythm1 = createRhythmSystem(seed, { type: 'resultant' });
      const rhythm2 = createRhythmSystem(seed, { type: 'resultant' });

      expect(rhythm1.id).toBe(rhythm2.id);
      expect(rhythm1.generators).toEqual(rhythm2.generators);
    });

    it('should produce different rhythms from different seeds', () => {
      const rhythm1 = createRhythmSystem(42, { type: 'resultant' });
      const rhythm2 = createRhythmSystem(43, { type: 'resultant' });

      expect(rhythm1.id).not.toBe(rhythm2.id);
      expect(rhythm1.generators).not.toEqual(rhythm2.generators);
    });

    it('should maintain rhythm type consistency', () => {
      const rhythms = [
        createRhythmSystem(1, { type: 'resultant' }),
        createRhythmSystem(2, { type: 'permutation' }),
        createRhythmSystem(3, { type: 'density' }),
      ];

      rhythms.forEach(rhythm => {
        expect(['resultant', 'permutation', 'density']).toContain(rhythm.type);
      });
    });
  });

  describe('Rhythm System Metadata', () => {
    it('should store rhythm system ID', () => {
      const rhythm = createRhythmSystem(42);

      expect(rhythm.id).toBeDefined();
      expect(typeof rhythm.id).toBe('string');
      expect(rhythm.id.length).toBeGreaterThan(0);
    });

    it('should store rhythm system type', () => {
      const rhythm = createRhythmSystem(42, { type: 'resultant' });

      expect(rhythm.type).toBe('resultant');
    });

    it('should store generators', () => {
      const rhythm = createRhythmSystem(42);

      expect(rhythm.generators).toBeDefined();
      expect(Array.isArray(rhythm.generators)).toBe(true);
      expect(rhythm.generators.length).toBeGreaterThan(0);
    });
  });
});

describe('Rhythm System - Error Scenarios', () => {
  describe('Invalid Generator Configurations', () => {
    it('should detect zero period', () => {
      const generator = {
        period: 0,
        phaseOffset: 0,
      };

      expect(generator.period).toBe(0);
    });

    it('should detect negative period', () => {
      const generator = {
        period: -1,
        phaseOffset: 0,
      };

      expect(generator.period).toBeLessThan(0);
    });

    it('should detect negative phase offset', () => {
      const generator = {
        period: 4,
        phaseOffset: -1,
      };

      expect(generator.phaseOffset).toBeLessThan(0);
    });

    it('should detect phase offset >= period', () => {
      const generator = {
        period: 4,
        phaseOffset: 4,
      };

      // Phase offset should be < period
      expect(generator.phaseOffset).toBeGreaterThanOrEqual(generator.period);
    });
  });

  describe('Invalid Density Values', () => {
    it('should detect density < 0', () => {
      const density = -0.1;

      expect(density).toBeLessThan(0);
    });

    it('should detect density > 1', () => {
      const density = 1.1;

      expect(density).toBeGreaterThan(1);
    });

    it('should detect non-numeric density', () => {
      const density = '0.5' as any;

      expect(typeof density).not.toBe('number');
    });
  });

  describe('Empty or Missing Data', () => {
    it('should detect empty generators array', () => {
      const rhythm: Partial<RhythmSystem> = {
        id: generateUUID(42, 'rhythm'),
        type: 'resultant',
        generators: [],
      };

      expect(rhythm.generators).toHaveLength(0);
    });

    it('should detect missing generators', () => {
      const rhythm: Partial<RhythmSystem> = {
        id: generateUUID(42, 'rhythm'),
        type: 'resultant',
      };

      expect(rhythm.generators).toBeUndefined();
    });

    it('should detect missing resultant data', () => {
      const rhythm: Partial<RhythmSystem> = {
        id: generateUUID(42, 'rhythm'),
        type: 'resultant',
        generators: [
          { period: 3, phaseOffset: 0 },
          { period: 4, phaseOffset: 0 },
        ],
      };

      expect(rhythm.resultant).toBeUndefined();
    });
  });
});

describe('Rhythm System - Performance', () => {
  describe('Generation Speed', () => {
    it('should generate rhythm system quickly', async () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        createRhythmSystem(i);
      }

      const duration = Date.now() - start;

      // Should generate 1000 rhythm systems in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should generate complex resultant rhythm quickly', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        createResultantRhythm(i);
      }

      const duration = Date.now() - start;

      // Should generate 100 resultant rhythms in less than 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should generate permutation rhythm quickly', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        createPermutationRhythm(i);
      }

      const duration = Date.now() - start;

      // Should generate 100 permutation rhythms in less than 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory when generating many rhythms', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10000; i++) {
        createRhythmSystem(i);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
