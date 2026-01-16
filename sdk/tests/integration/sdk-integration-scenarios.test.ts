/**
 * SDK Integration Scenarios Tests
 *
 * End-to-end integration tests for SDK components
 * testing real-world usage patterns and workflows.
 */

import {
  SchillingerSystem,
  SchemaValidator,
  ParameterSchema,
  PluginState,
  Result,
  ProjectionEngine
} from '@schillinger/sdk';

describe('SDK Integration Scenarios', () => {
  describe('Plugin Initialization Workflow', () => {
    test('should initialize plugin with default state', () => {
      const system = new SchillingerSystem();
      const validator = new SchemaValidator();

      const initialState: PluginState = system.getDefaultState();
      const schema: ParameterSchema = system.getStateSchema();

      const validation = validator.validate(initialState, schema);
      expect(validation.valid).toBe(true);
    });

    test('should load and validate preset', () => {
      const system = new SchillingerSystem();
      const validator = new SchemaValidator();

      const preset = {
        rhythm: {
          duration: 4,
          subdivisions: 4
        },
        harmony: {
          scaleType: 'major',
          rootNote: 60
        },
        projection: {
          enabled: true,
          intensity: 0.7
        }
      };

      const schema: ParameterSchema = system.getStateSchema();
      const validation = validator.validate(preset, schema);

      expect(validation.valid).toBe(true);
    });

    test('should handle invalid preset gracefully', () => {
      const system = new SchillingerSystem();
      const validator = new SchemaValidator();

      const invalidPreset = {
        rhythm: {
          duration: -4,
          subdivisions: 0
        }
      };

      const schema: ParameterSchema = system.getStateSchema();
      const validation = validator.validate(invalidPreset, schema);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Rhythm Generation Workflow', () => {
    test('should generate rhythm from parameters', () => {
      const system = new SchillingerSystem();

      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 4,
        meter: { beats: 4, subdivision: 4 }
      });

      expect(result.success).toBe(true);
      expect(result.data?.events).toBeDefined();
      expect(result.data?.events.length).toBe(16);
    });

    test('should generate rhythm with force vectors', () => {
      const system = new SchillingerSystem();

      const result: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 4,
        forces: [
          { magnitude: 0.7, direction: 0 },
          { magnitude: 0.3, direction: Math.PI }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.events).toBeDefined();
    });

    test('should generate rhythm with custom scale', () => {
      const system = new SchillingerSystem();

      const result: Result = system.generatePitchSequence({
        customIntervals: [0, 2, 4, 5, 7, 9, 11],
        duration: 4,
        noteCount: 8
      });

      expect(result.success).toBe(true);
      expect(result.data?.notes).toHaveLength(8);
    });
  });

  describe('Projection Workflow', () => {
    test('should project rhythm onto instrument', () => {
      const engine = new ProjectionEngine();

      const rhythm = {
        events: [
          { time: 0, duration: 0.5, velocity: 127 },
          { time: 1, duration: 0.5, velocity: 100 },
          { time: 2, duration: 0.5, velocity: 80 },
          { time: 3, duration: 0.5, velocity: 60 }
        ]
      };

      const result = engine.project(rhythm, {
        targetInstrument: 'piano',
        intensity: 0.7
      });

      expect(result.success).toBe(true);
      expect(result.data?.projectedEvents).toBeDefined();
    });

    test('should handle projection errors gracefully', () => {
      const engine = new ProjectionEngine();

      const invalidRhythm = {
        events: [
          { time: -1, duration: 0.5, velocity: 127 }
        ]
      };

      const result = engine.project(invalidRhythm, {
        targetInstrument: 'piano',
        intensity: 0.7
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('State Management Workflow', () => {
    test('should serialize and deserialize state', () => {
      const system = new SchillingerSystem();

      const originalState = system.getDefaultState();
      const serialized = JSON.stringify(originalState);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(originalState);
    });

    test('should merge state updates', () => {
      const system = new SchillingerSystem();

      const baseState = system.getDefaultState();
      const update = {
        rhythm: {
          duration: 8,
          subdivisions: 8
        }
      };

      const mergedState = system.mergeState(baseState, update);

      expect(mergedState.rhythm.duration).toBe(8);
      expect(mergedState.rhythm.subdivisions).toBe(8);
    });

    test('should validate state after merge', () => {
      const system = new SchillingerSystem();
      const validator = new SchemaValidator();

      const baseState = system.getDefaultState();
      const update = {
        rhythm: {
          duration: -4
        }
      };

      const mergedState = system.mergeState(baseState, update);
      const schema = system.getStateSchema();
      const validation = validator.validate(mergedState, schema);

      expect(validation.valid).toBe(false);
    });
  });

  describe('Error Recovery Workflow', () => {
    test('should recover from invalid parameters', () => {
      const system = new SchillingerSystem();

      const invalidResult: Result = system.generateRhythm({
        duration: -4,
        subdivisions: 0
      });

      expect(invalidResult.success).toBe(false);

      const validResult: Result = system.generateRhythm({
        duration: 4,
        subdivisions: 4
      });

      expect(validResult.success).toBe(true);
    });

    test('should provide helpful error messages', () => {
      const system = new SchillingerSystem();

      const result: Result = system.generateRhythm({
        duration: -4
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('duration');
    });

    test('should log errors for debugging', () => {
      const system = new SchillingerSystem();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      system.generateRhythm({
        duration: -4
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Workflow', () => {
    test('should generate rhythms quickly', () => {
      const system = new SchillingerSystem();

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        system.generateRhythm({ duration: 4, subdivisions: 4 });
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // < 1 second for 1000 rhythms
    });

    test('should validate state quickly', () => {
      const system = new SchillingerSystem();
      const validator = new SchemaValidator();
      const state = system.getDefaultState();
      const schema = system.getStateSchema();

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        validator.validate(state, schema);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // < 500ms for 1000 validations
    });

    test('should handle large projections efficiently', () => {
      const engine = new ProjectionEngine();

      const largeRhythm = {
        events: Array.from({ length: 10000 }, (_, i) => ({
          time: i * 0.001,
          duration: 0.5,
          velocity: 127
        }))
      };

      const startTime = Date.now();
      const result = engine.project(largeRhythm, {
        targetInstrument: 'piano',
        intensity: 0.7
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // < 1 second for 10k events
    });
  });

  describe('Memory Management Workflow', () => {
    test('should clean up resources', () => {
      const system = new SchillingerSystem();

      // Generate many rhythms to test memory cleanup
      for (let i = 0; i < 10000; i++) {
        system.generateRhythm({ duration: 4, subdivisions: 4 });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Should not throw or crash
      expect(() => {
        system.generateRhythm({ duration: 4, subdivisions: 4 });
      }).not.toThrow();
    });

    test('should handle large state objects', () => {
      const system = new SchillingerSystem();

      const largeState = {
        ...system.getDefaultState(),
        rhythm: {
          duration: 1000,
          subdivisions: 128,
          events: Array.from({ length: 10000 }, (_, i) => ({
            time: i * 0.001,
            duration: 0.5,
            velocity: 127
          }))
        }
      };

      expect(() => {
        system.validateState(largeState);
      }).not.toThrow();
    });
  });

  describe('Real-World Usage Scenarios', () => {
    test('should handle typical DAW workflow', () => {
      const system = new SchillingerSystem();

      // 1. Initialize plugin
      const state = system.getDefaultState();

      // 2. Load preset
      const preset = {
        rhythm: { duration: 4, subdivisions: 4 },
        harmony: { scaleType: 'major', rootNote: 60 }
      };

      // 3. Generate rhythm
      const rhythmResult = system.generateRhythm(preset.rhythm);
      expect(rhythmResult.success).toBe(true);

      // 4. Generate harmony
      const harmonyResult = system.generatePitchSequence(preset.harmony);
      expect(harmonyResult.success).toBe(true);

      // 5. Project to instrument
      const engine = new ProjectionEngine();
      const projectionResult = engine.project(rhythmResult.data, {
        targetInstrument: 'piano'
      });
      expect(projectionResult.success).toBe(true);
    });

    test('should handle rapid parameter changes', () => {
      const system = new SchillingerSystem();

      for (let i = 0; i < 100; i++) {
        const result = system.generateRhythm({
          duration: 4 + Math.random() * 4,
          subdivisions: Math.floor(Math.random() * 16) + 1
        });

        expect(result.success).toBe(true);
      }
    });
  });
});
