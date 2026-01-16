/**
 * Schillinger System Edge Cases Tests
 *
 * Tests for edge cases, boundary conditions, and error handling
 * in the Schillinger rhythmic theory implementation.
 */

import {
  SchillingerSystem,
  RhythmGenerator,
  ForceVector,
  Result,
  ScaleType,
  Meter
} from '@schillinger/sdk';

describe('Schillinger System Edge Cases', () => {
  describe('Boundary Conditions', () => {
    test('should handle zero duration correctly', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 0,
        subdivisions: 4
      });

      expect(result.success).toBe(true);
      expect(result.data?.events).toHaveLength(0);
    });

    test('should handle very large durations', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 10000,
        subdivisions: 4
      });

      expect(result.success).toBe(true);
      expect(result.data?.events.length).toBeGreaterThan(0);
    });

    test('should handle minimum subdivision', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 1
      });

      expect(result.success).toBe(true);
      expect(result.data?.events.length).toBe(1);
    });

    test('should handle maximum subdivision', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 128
      });

      expect(result.success).toBe(true);
      expect(result.data?.events.length).toBe(512);
    });
  });

  describe('Error Handling', () => {
    test('should reject negative duration', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: -4,
        subdivisions: 4
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('duration');
    });

    test('should reject zero subdivisions', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 0
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('subdivisions');
    });

    test('should reject negative subdivisions', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: -4
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('subdivisions');
    });

    test('should reject non-integer subdivisions', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 4.5
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('subdivisions');
    });
  });

  describe('Scale Type Edge Cases', () => {
    test('should handle all scale types', () => {
      const system = new SchillingerSystem();
      const scaleTypes: ScaleType[] = [
        'chromatic',
        'major',
        'minor',
        'pentatonic',
        'blues',
        'dorian',
        'phrygian',
        'lydian',
        'mixolydian',
        'locrian'
      ];

      scaleTypes.forEach(scaleType => {
        const result: Result = system.generatePitchSequence({
          scaleType,
          duration: 4,
          noteCount: 8
        });

        expect(result.success).toBe(true);
        expect(result.data?.notes).toHaveLength(8);
      });
    });

    test('should handle custom scale intervals', () => {
      const system = new SchillingerSystem();
      const customIntervals = [0, 2, 4, 5, 7, 9, 11]; // Major scale

      const result: Result = system.generatePitchSequence({
        customIntervals,
        duration: 4,
        noteCount: 8
      });

      expect(result.success).toBe(true);
      expect(result.data?.notes).toHaveLength(8);
    });
  });

  describe('Meter Edge Cases', () => {
    test('should handle irregular meters', () => {
      const system = new SchillingerSystem();
      const meters: Meter[] = [
        { beats: 5, subdivision: 4 },
        { beats: 7, subdivision: 8 },
        { beats: 9, subdivision: 16 },
        { beats: 11, subdivision: 4 }
      ];

      meters.forEach(meter => {
        const result: Result = system.generateRhythm({
          meter,
          duration: meter.beats
        });

        expect(result.success).toBe(true);
        expect(result.data?.events.length).toBeGreaterThan(0);
      });
    });

    test('should handle changing meters mid-stream', () => {
      const system = new SchillingerSystem();
      const result1: Result = system.generateRhythm({
        meter: { beats: 4, subdivision: 4 },
        duration: 4
      });

      const result2: Result = system.generateRhythm({
        meter: { beats: 3, subdivision: 4 },
        duration: 3
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.events).toHaveLength(16);
      expect(result2.data?.events).toHaveLength(12);
    });
  });

  describe('Force Vector Edge Cases', () => {
    test('should handle zero force', () => {
      const generator = new RhythmGenerator();
      const force: ForceVector = {
        magnitude: 0,
        direction: 0
      };

      const result = generator.applyForce(force);
      expect(result).toBeDefined();
    });

    test('should handle maximum force', () => {
      const generator = new RhythmGenerator();
      const force: ForceVector = {
        magnitude: 1,
        direction: 2 * Math.PI
      };

      const result = generator.applyForce(force);
      expect(result).toBeDefined();
    });

    test('should handle multiple simultaneous forces', () => {
      const generator = new RhythmGenerator();
      const forces: ForceVector[] = [
        { magnitude: 0.5, direction: 0 },
        { magnitude: 0.3, direction: Math.PI / 2 },
        { magnitude: 0.7, direction: Math.PI }
      ];

      const result = generator.applyForces(forces);
      expect(result).toBeDefined();
    });
  });

  describe('Integration Edge Cases', () => {
    test('should handle empty configuration', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({});

      // Should use defaults
      expect(result.success).toBe(true);
    });

    test('should handle conflicting parameters', () => {
      const system = new SchillingerSystem();
      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 4,
        meter: { beats: 3, subdivision: 4 }
      });

      // Should prioritize explicit meter
      expect(result.success).toBe(true);
    });

    test('should handle rapid successive calls', () => {
      const system = new SchillingerSystem();
      const results: Result[] = [];

      for (let i = 0; i < 100; i++) {
        results.push(system.generateRhythm({ duration: 4, subdivisions: 4 }));
      }

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
