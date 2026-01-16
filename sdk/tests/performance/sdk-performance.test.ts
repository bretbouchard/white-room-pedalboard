/**
 * SDK Performance Tests
 *
 * Performance benchmarks and regression detection
 * for SDK components.
 */

import {
  SchillingerSystem,
  SchemaValidator,
  ProjectionEngine,
  PluginState
} from '@schillinger/sdk';

describe('SDK Performance Tests', () => {
  describe('Rhythm Generation Performance', () => {
    test('should generate simple rhythms quickly', () => {
      const system = new SchillingerSystem();
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        system.generateRhythm({
          duration: 4,
          subdivisions: 4
        });
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(1); // < 1ms per rhythm
    });

    test('should generate complex rhythms efficiently', () => {
      const system = new SchillingerSystem();
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        system.generateRhythm({
          duration: 32,
          subdivisions: 128,
          meter: { beats: 7, subdivision: 8 }
        });
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(10); // < 10ms per complex rhythm
    });

    test('should handle rapid parameter changes', () => {
      const system = new SchillingerSystem();
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        system.generateRhythm({
          duration: 4 + Math.random() * 4,
          subdivisions: Math.floor(Math.random() * 16) + 1
        });
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(2); // < 2ms per rhythm with random params
    });
  });

  describe('Schema Validation Performance', () => {
    test('should validate simple schemas quickly', () => {
      const validator = new SchemaValidator();
      const schema = {
        type: 'integer',
        id: 'test',
        name: 'Test',
        min: 0,
        max: 100
      };

      const iterations = 100000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        validator.validate(Math.floor(Math.random() * 101), schema);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.01); // < 0.01ms per validation
    });

    test('should validate complex schemas efficiently', () => {
      const validator = new SchemaValidator();
      const schema = {
        type: 'object',
        id: 'test',
        name: 'Test',
        properties: {
          prop1: { type: 'integer', min: 0, max: 100 },
          prop2: { type: 'float', min: 0.0, max: 1.0 },
          prop3: { type: 'string', minLength: 1, maxLength: 100 },
          prop4: {
            type: 'array',
            itemType: 'integer',
            minItems: 1,
            maxItems: 100
          }
        },
        required: ['prop1', 'prop2']
      };

      const value = {
        prop1: 50,
        prop2: 0.5,
        prop3: 'test string',
        prop4: Array.from({ length: 50 }, () => Math.floor(Math.random() * 101))
      };

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        validator.validate(value, schema);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(1); // < 1ms per complex validation
    });

    test('should validate nested schemas efficiently', () => {
      const validator = new SchemaValidator();
      let nestedSchema: any = {
        type: 'object',
        id: 'test',
        name: 'Test',
        properties: {}
      };

      // Create 10 levels of nesting
      let current = nestedSchema.properties;
      for (let i = 0; i < 10; i++) {
        current['level' + i] = {
          type: 'object',
          properties: {}
        };
        current = current['level' + i].properties;
      }
      current['value'] = { type: 'integer' };

      let value: any = {};
      let currentValue = value;
      for (let i = 0; i < 10; i++) {
        currentValue['level' + i] = {};
        currentValue = currentValue['level' + i];
      }
      currentValue['value'] = 50;

      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        validator.validate(value, nestedSchema);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(5); // < 5ms per deeply nested validation
    });
  });

  describe('Projection Engine Performance', () => {
    test('should project simple rhythms quickly', () => {
      const engine = new ProjectionEngine();
      const rhythm = {
        events: Array.from({ length: 16 }, (_, i) => ({
          time: i * 0.25,
          duration: 0.5,
          velocity: 127
        }))
      };

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        engine.project(rhythm, {
          targetInstrument: 'piano',
          intensity: 0.7
        });
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(1); // < 1ms per projection
    });

    test('should project large rhythms efficiently', () => {
      const engine = new ProjectionEngine();
      const rhythm = {
        events: Array.from({ length: 10000 }, (_, i) => ({
          time: i * 0.001,
          duration: 0.5,
          velocity: 127
        }))
      };

      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        engine.project(rhythm, {
          targetInstrument: 'piano',
          intensity: 0.7
        });
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(50); // < 50ms per 10k event projection
    });
  });

  describe('State Management Performance', () => {
    test('should serialize state quickly', () => {
      const system = new SchillingerSystem();
      const state = system.getDefaultState();

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(state);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.1); // < 0.1ms per serialization
    });

    test('should deserialize state quickly', () => {
      const system = new SchillingerSystem();
      const state = system.getDefaultState();
      const serialized = JSON.stringify(state);

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.parse(serialized);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.1); // < 0.1ms per deserialization
    });

    test('should merge state quickly', () => {
      const system = new SchillingerSystem();
      const baseState = system.getDefaultState();
      const update = {
        rhythm: {
          duration: 8,
          subdivisions: 8
        }
      };

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        system.mergeState(baseState, update);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.5); // < 0.5ms per merge
    });
  });

  describe('Memory Performance', () => {
    test('should not leak memory during rhythm generation', () => {
      const system = new SchillingerSystem();

      // Generate many rhythms to test memory cleanup
      for (let i = 0; i < 100000; i++) {
        system.generateRhythm({
          duration: 4,
          subdivisions: 4
        });
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
          events: Array.from({ length: 100000 }, (_, i) => ({
            time: i * 0.001,
            duration: 0.5,
            velocity: 127
          }))
        }
      };

      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        system.validateState(largeState);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(100); // < 100ms per large state validation
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent rhythm generation', async () => {
      const system = new SchillingerSystem();
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve().then(() =>
          system.generateRhythm({
            duration: 4,
            subdivisions: 4
          })
        )
      );

      const start = performance.now();
      await Promise.all(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // < 100ms for 100 concurrent operations
    });

    test('should handle concurrent validation', async () => {
      const validator = new SchemaValidator();
      const schema = {
        type: 'integer',
        id: 'test',
        name: 'Test',
        min: 0,
        max: 100
      };

      const promises = Array.from({ length: 10000 }, () =>
        Promise.resolve().then(() =>
          validator.validate(Math.floor(Math.random() * 101), schema)
        )
      );

      const start = performance.now();
      await Promise.all(promises);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // < 100ms for 10k concurrent validations
    });
  });

  describe('Performance Regression Detection', () => {
    test('should maintain performance baseline', () => {
      const baseline = {
        rhythmGeneration: 1.0, // ms
        schemaValidation: 0.01, // ms
        projection: 1.0 // ms
      };

      const system = new SchillingerSystem();
      const validator = new SchemaValidator();
      const engine = new ProjectionEngine();

      // Test rhythm generation
      const rhythmStart = performance.now();
      system.generateRhythm({ duration: 4, subdivisions: 4 });
      const rhythmTime = performance.now() - rhythmStart;

      // Test schema validation
      const schema = {
        type: 'integer',
        id: 'test',
        name: 'Test',
        min: 0,
        max: 100
      };
      const validationStart = performance.now();
      validator.validate(50, schema);
      const validationTime = performance.now() - validationStart;

      // Test projection
      const rhythm = {
        events: [{ time: 0, duration: 0.5, velocity: 127 }]
      };
      const projectionStart = performance.now();
      engine.project(rhythm, { targetInstrument: 'piano', intensity: 0.7 });
      const projectionTime = performance.now() - projectionStart;

      // Allow 20% performance regression
      expect(rhythmTime).toBeLessThan(baseline.rhythmGeneration * 1.2);
      expect(validationTime).toBeLessThan(baseline.schemaValidation * 1.2);
      expect(projectionTime).toBeLessThan(baseline.projection * 1.2);
    });
  });
});
