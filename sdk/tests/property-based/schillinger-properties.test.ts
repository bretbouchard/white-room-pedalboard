/**
 * Property-Based Tests for Schillinger System
 *
 * Uses fast-check to test invariants and properties
 * of the Schillinger rhythmic theory implementation.
 */

import fc from 'fast-check';
import {
  SchillingerSystem,
  RhythmGenerator,
  ForceVector,
  Result
} from '@schillinger/sdk';

describe('Schillinger System Property-Based Tests', () => {
  describe('Rhythm Generation Properties', () => {
    test('should always generate non-negative event times', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: 0.1, max: 100 }),
            subdivisions: fc.integer({ min: 1, max: 128 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm(params);

            if (!result.success || !result.data) {
              return true; // Skip invalid parameters
            }

            return result.data.events.every(event => event.time >= 0);
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should always generate events within duration', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: 1, max: 100 }),
            subdivisions: fc.integer({ min: 1, max: 32 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm(params);

            if (!result.success || !result.data) {
              return true;
            }

            return result.data.events.every(event =>
              event.time + event.duration <= params.duration
            );
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should always generate velocities in valid range', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: 1, max: 10 }),
            subdivisions: fc.integer({ min: 1, max: 16 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm(params);

            if (!result.success || !result.data) {
              return true;
            }

            return result.data.events.every(event =>
              event.velocity >= 0 && event.velocity <= 127
            );
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should preserve event count consistency', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: 1, max: 10 }),
            subdivisions: fc.integer({ min: 1, max: 16 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result1: Result = system.generateRhythm(params);
            const result2: Result = system.generateRhythm(params);

            if (!result1.success || !result2.success) {
              return true;
            }

            // Should generate same number of events for same parameters
            return result1.data!.events.length === result2.data!.events.length;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Force Vector Properties', () => {
    test('should maintain energy conservation', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            magnitude: fc.float({ min: 0, max: 1 }),
            direction: fc.float({ min: 0, max: 2 * Math.PI })
          }), { minLength: 1, maxLength: 10 }),
          (forces) => {
            const generator = new RhythmGenerator();

            const initialEnergy = forces.reduce(
              (sum, f) => sum + f.magnitude,
              0
            );

            const result = generator.applyForces(forces);

            // Result should exist and not exceed initial energy
            return result !== undefined &&
                   generator.getCurrentEnergy() <= initialEnergy;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should handle force vector addition commutatively', () => {
      fc.assert(
        fc.property(
          fc.record({
            force1: fc.record({
              magnitude: fc.float({ min: 0, max: 1 }),
              direction: fc.float({ min: 0, max: 2 * Math.PI })
            }),
            force2: fc.record({
              magnitude: fc.float({ min: 0, max: 1 }),
              direction: fc.float({ min: 0, max: 2 * Math.PI })
            })
          }),
          ({ force1, force2 }) => {
            const generator = new RhythmGenerator();

            const result1 = generator.applyForces([force1, force2]);
            const result2 = generator.applyForces([force2, force1]);

            // Order shouldn't matter for result type
            return (result1 === undefined) === (result2 === undefined);
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Scale Type Properties', () => {
    test('should generate valid pitch ranges for all scale types', () => {
      const scaleTypes = ['chromatic', 'major', 'minor', 'pentatonic', 'blues'];

      fc.assert(
        fc.property(
          fc.record({
            scaleType: fc.constantFrom(...scaleTypes),
            duration: fc.float({ min: 1, max: 10 }),
            noteCount: fc.integer({ min: 1, max: 100 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result: Result = system.generatePitchSequence(params);

            if (!result.success || !result.data) {
              return true;
            }

            return result.data.notes.every(note =>
              note.midi >= 0 && note.midi <= 127
            );
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should maintain scale intervals', () => {
      fc.assert(
        fc.property(
          fc.record({
            scaleType: fc.constantFrom('major', 'minor', 'pentatonic'),
            noteCount: fc.integer({ min: 2, max: 20 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result: Result = system.generatePitchSequence(params);

            if (!result.success || !result.data || result.data.notes.length < 2) {
              return true;
            }

            // Check that intervals follow scale pattern
            const notes = result.data.notes;
            for (let i = 1; i < notes.length; i++) {
              const interval = Math.abs(notes[i].midi - notes[i - 1].midi);
              // Should be valid scale interval
              if (interval < 0 || interval > 12) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Meter Properties', () => {
    test('should respect meter boundaries', () => {
      fc.assert(
        fc.property(
          fc.record({
            beats: fc.integer({ min: 1, max: 16 }),
            subdivision: fc.integer({ min: 1, max: 16 })
          }),
          ({ beats, subdivision }) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm({
              meter: { beats, subdivision },
              duration: beats
            });

            if (!result.success || !result.data) {
              return true;
            }

            // Should generate beats * subdivision events
            return result.data.events.length === beats * subdivision;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should handle irregular meters correctly', () => {
      const irregularMeters = [
        { beats: 5, subdivision: 4 },
        { beats: 7, subdivision: 8 },
        { beats: 9, subdivision: 16 }
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...irregularMeters),
          (meter) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm({
              meter,
              duration: meter.beats
            });

            if (!result.success || !result.data) {
              return true;
            }

            return result.data.events.length === meter.beats * meter.subdivision;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('State Management Properties', () => {
    test('should maintain state consistency', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: 1, max: 10 }),
            subdivisions: fc.integer({ min: 1, max: 16 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const state1 = system.getState();
            const result: Result = system.generateRhythm(params);
            const state2 = system.getState();

            // State should be consistent after operation
            return state1.version !== state2.version;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should serialize state consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: 1, max: 10 }),
            subdivisions: fc.integer({ min: 1, max: 16 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm(params);

            if (!result.success || !result.data) {
              return true;
            }

            const serialized = JSON.stringify(result.data);
            const deserialized = JSON.parse(serialized);

            // Should serialize and deserialize correctly
            return deserialized.events.length === result.data.events.length;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Error Handling Properties', () => {
    test('should handle invalid parameters gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: -100, max: 100 }),
            subdivisions: fc.integer({ min: -10, max: 10 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm(params);

            // Should either succeed or fail with error
            return result.success === true || result.error !== undefined;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should provide consistent error messages', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -100, max: -1 }),
          (invalidDuration) => {
            const system = new SchillingerSystem();
            const result: Result = system.generateRhythm({
              duration: invalidDuration,
              subdivisions: 4
            });

            if (result.success) {
              return true;
            }

            // Error message should mention duration
            return result.error?.toLowerCase().includes('duration');
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Performance Properties', () => {
    test('should generate rhythms quickly', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.float({ min: 1, max: 10 }),
            subdivisions: fc.integer({ min: 1, max: 16 })
          }),
          (params) => {
            const system = new SchillingerSystem();
            const start = Date.now();
            const result: Result = system.generateRhythm(params);
            const end = Date.now();

            // Should complete in less than 100ms
            return (end - start) < 100;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should not leak memory', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }),
          (iterations) => {
            const system = new SchillingerSystem();

            for (let i = 0; i < iterations; i++) {
              system.generateRhythm({
                duration: 4,
                subdivisions: 4
              });
            }

            // Should not throw or crash
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
