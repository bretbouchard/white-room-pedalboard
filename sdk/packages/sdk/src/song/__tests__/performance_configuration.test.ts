/**
 * Comprehensive PerformanceConfiguration Tests
 *
 * Tests for PerformanceConfiguration validation, creation, and serialization
 */

import { describe, it, expect } from 'vitest';
import {
  PerformanceConfiguration,
  validatePerformanceConfiguration,
  createMinimalPerformanceConfiguration,
  serializePerformanceConfiguration,
  deserializePerformanceConfiguration,
  clonePerformanceConfiguration,
  isPerformanceConfiguration,
  InstrumentType
} from '../performance_configuration.js';

describe('PerformanceConfiguration', () => {
  describe('Validation', () => {
    it('accepts valid minimal configuration', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test Performance',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const result = validatePerformanceConfiguration(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts valid configuration with all fields', () => {
      const config: PerformanceConfiguration = {
        version: '1.0',
        id: 'perf-full',
        name: 'Full Performance',
        description: 'Complete performance configuration',

        instrumentation: {
          assignments: [
            {
              roleId: 'primary',
              instrumentType: 'LocalGal',
              presetId: 'piano-1',
              busId: 'bus-primary'
            },
            {
              roleId: 'secondary',
              instrumentType: 'KaneMarco',
              presetId: 'synth-1',
              busId: 'bus-secondary'
            }
          ]
        },

        densityScale: 0.75,
        grooveProfile: {
          id: 'groove-1',
          name: 'Medium Swing',
          timingVariance: 0.1,
          velocityVariance: 0.15,
          swingAmount: 0.3,
          humanization: {
            microTimingDeviation: 10,
            velocityCurve: 'exponential',
            randomization: 0.2
          }
        },

        registerMap: {
          ranges: [
            {
              roleId: 'primary',
              minNote: 48,
              maxNote: 84,
              transposition: 0
            },
            {
              roleId: 'secondary',
              minNote: 36,
              maxNote: 72,
              transposition: -12
            }
          ]
        },

        consolexProfileId: 'console-1',
        busConfiguration: {
          voiceBusIds: ['bus-primary', 'bus-secondary'],
          mixBusIds: ['mix-1'],
          masterBusId: 'master',
          routing: [
            {
              roleId: 'primary',
              voiceBusId: 'bus-primary',
              mixBusIds: ['mix-1'],
              sendLevels: [0.5]
            },
            {
              roleId: 'secondary',
              voiceBusId: 'bus-secondary',
              mixBusIds: ['mix-1'],
              sendLevels: [0.3]
            }
          ]
        },

        targetCpuUsage: 0.3,
        maxVoices: 32,
        voiceStealing: true,

        createdAt: Date.now(),
        modifiedAt: Date.now()
      };

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid version', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, version: '2.0' };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'version')).toBe(true);
    });

    it('rejects missing ID', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, id: '' };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'id')).toBe(true);
    });

    it('rejects missing name', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, name: '' };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'name')).toBe(true);
    });

    it('rejects density scale out of range (negative)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, densityScale: -0.1 };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'densityScale')).toBe(true);
    });

    it('rejects density scale out of range (greater than 1)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, densityScale: 1.5 };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'densityScale')).toBe(true);
    });

    it('accepts density scale at bounds', () => {
      const values = [0.0, 0.5, 1.0];

      values.forEach(densityScale => {
        const config = createMinimalPerformanceConfiguration({
          name: 'Test',
          roleId: 'melody',
          instrumentType: 'LocalGal'
        });

        const validConfig = { ...config, densityScale };
        const result = validatePerformanceConfiguration(validConfig);

        expect(result.valid).toBe(true);
      });
    });

    it('rejects invalid groove profile (missing timing variance)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = {
        ...config,
        grooveProfile: {
          ...config.grooveProfile,
          timingVariance: 1.5
        }
      };

      const result = validatePerformanceConfiguration(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'grooveProfile')).toBe(true);
    });

    it('rejects invalid register map (invalid MIDI note)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = {
        ...config,
        registerMap: {
          ranges: [
            {
              roleId: 'melody',
              minNote: -1,
              maxNote: 128,
              transposition: 0
            }
          ]
        }
      };

      const result = validatePerformanceConfiguration(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'registerMap')).toBe(true);
    });

    it('rejects invalid CPU usage (negative)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, targetCpuUsage: -0.1 };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'targetCpuUsage')).toBe(true);
    });

    it('rejects invalid max voices (zero)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, maxVoices: 0 };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'maxVoices')).toBe(true);
    });

    it('rejects invalid max voices (too large)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, maxVoices: 2000 };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'maxVoices')).toBe(true);
    });

    it('rejects invalid voice stealing (not boolean)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const invalidConfig = { ...config, voiceStealing: 'true' as any };
      const result = validatePerformanceConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'voiceStealing')).toBe(true);
    });
  });

  describe('Instrumentation Map', () => {
    it('accepts all instrument types', () => {
      const instrumentTypes: InstrumentType[] = [
        'LocalGal',
        'KaneMarco',
        'KaneMarcoAether',
        'KaneMarcoAetherString',
        'NexSynth',
        'SamSampler',
        'DrumMachine'
      ];

      instrumentTypes.forEach(type => {
        const config = createMinimalPerformanceConfiguration({
          name: `Test ${type}`,
          roleId: 'melody',
          instrumentType: type
        });

        expect(config.instrumentation.assignments[0].instrumentType).toBe(type);

        const result = validatePerformanceConfiguration(config);
        expect(result.valid).toBe(true);
      });
    });

    it('accepts multiple instrument assignments', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Ensemble',
        roleId: 'primary',
        instrumentType: 'LocalGal'
      });

      const multiConfig: PerformanceConfiguration = {
        ...config,
        instrumentation: {
          assignments: [
            {
              roleId: 'primary',
              instrumentType: 'LocalGal',
              presetId: 'piano-1',
              busId: 'bus-primary'
            },
            {
              roleId: 'secondary',
              instrumentType: 'KaneMarco',
              presetId: 'synth-1',
              busId: 'bus-secondary'
            },
            {
              roleId: 'tertiary',
              instrumentType: 'SamSampler',
              presetId: 'strings-1',
              busId: 'bus-tertiary'
            }
          ]
        }
      };

      const result = validatePerformanceConfiguration(multiConfig);
      expect(result.valid).toBe(true);
      expect(multiConfig.instrumentation.assignments).toHaveLength(3);
    });
  });

  describe('Groove Profile', () => {
    it('accepts all variance values at bounds', () => {
      const variances = [0.0, 0.5, 1.0];

      variances.forEach(variance => {
        const config = createMinimalPerformanceConfiguration({
          name: 'Test',
          roleId: 'melody',
          instrumentType: 'LocalGal'
        });

        config.grooveProfile.timingVariance = variance;
        config.grooveProfile.velocityVariance = variance;
        config.grooveProfile.swingAmount = variance;

        const result = validatePerformanceConfiguration(config);
        expect(result.valid).toBe(true);
      });
    });

    it('accepts all velocity curve types', () => {
      const curves: Array<'linear' | 'logarithmic' | 'exponential'> = [
        'linear',
        'logarithmic',
        'exponential'
      ];

      curves.forEach(curve => {
        const config = createMinimalPerformanceConfiguration({
          name: 'Test',
          roleId: 'melody',
          instrumentType: 'LocalGal'
        });

        config.grooveProfile.humanization.velocityCurve = curve;

        const result = validatePerformanceConfiguration(config);
        expect(result.valid).toBe(true);
      });
    });

    it('accepts zero micro timing deviation', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.grooveProfile.humanization.microTimingDeviation = 0;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('accepts large micro timing deviation', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.grooveProfile.humanization.microTimingDeviation = 100;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Register Map', () => {
    it('accepts full MIDI range', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.registerMap.ranges = [
        {
          roleId: 'melody',
          minNote: 0,
          maxNote: 127,
          transposition: 0
        }
      ];

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('accepts negative transposition', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.registerMap.ranges = [
        {
          roleId: 'melody',
          minNote: 48,
          maxNote: 72,
          transposition: -12
        }
      ];

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('accepts positive transposition', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.registerMap.ranges = [
        {
          roleId: 'melody',
          minNote: 48,
          maxNote: 72,
          transposition: 12
        }
      ];

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('accepts multiple register ranges', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Ensemble',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.registerMap.ranges = [
        {
          roleId: 'primary',
          minNote: 48,
          maxNote: 84,
          transposition: 0
        },
        {
          roleId: 'secondary',
          minNote: 36,
          maxNote: 72,
          transposition: -12
        },
        {
          roleId: 'tertiary',
          minNote: 24,
          maxNote: 60,
          transposition: -24
        }
      ];

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Bus Configuration', () => {
    it('accepts simple routing (voice to master)', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.busConfiguration = {
        voiceBusIds: ['voice-1'],
        mixBusIds: [],
        masterBusId: 'master',
        routing: [
          {
            roleId: 'melody',
            voiceBusId: 'voice-1',
            mixBusIds: [],
            sendLevels: []
          }
        ]
      };

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('accepts routing with mix bus sends', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.busConfiguration = {
        voiceBusIds: ['voice-1'],
        mixBusIds: ['reverb', 'delay'],
        masterBusId: 'master',
        routing: [
          {
            roleId: 'melody',
            voiceBusId: 'voice-1',
            mixBusIds: ['reverb', 'delay'],
            sendLevels: [0.3, 0.2]
          }
        ]
      };

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('accepts complex routing with multiple voices', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Ensemble',
        roleId: 'primary',
        instrumentType: 'LocalGal'
      });

      config.busConfiguration = {
        voiceBusIds: ['voice-1', 'voice-2', 'voice-3', 'voice-4'],
        mixBusIds: ['reverb', 'delay', 'chorus'],
        masterBusId: 'master',
        routing: [
          {
            roleId: 'primary',
            voiceBusId: 'voice-1',
            mixBusIds: ['reverb', 'delay'],
            sendLevels: [0.4, 0.2]
          },
          {
            roleId: 'secondary',
            voiceBusId: 'voice-2',
            mixBusIds: ['reverb', 'chorus'],
            sendLevels: [0.3, 0.1]
          },
          {
            roleId: 'tertiary',
            voiceBusId: 'voice-3',
            mixBusIds: ['delay'],
            sendLevels: [0.3]
          },
          {
            roleId: 'quaternary',
            voiceBusId: 'voice-4',
            mixBusIds: ['reverb'],
            sendLevels: [0.5]
          }
        ]
      };

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    it('creates unique IDs for multiple configurations', () => {
      const config1 = createMinimalPerformanceConfiguration({
        name: 'Test 1',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const config2 = createMinimalPerformanceConfiguration({
        name: 'Test 2',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      expect(config1.id).not.toBe(config2.id);
    });

    it('creates configuration with reasonable defaults', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Piano',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      expect(config.version).toBe('1.0');
      expect(config.id).toBeDefined();
      expect(config.name).toBe('Piano');
      expect(config.densityScale).toBe(0.5);
      expect(config.targetCpuUsage).toBe(0.1);
      expect(config.maxVoices).toBe(16);
      expect(config.voiceStealing).toBe(true);
    });

    it('uses custom preset ID when provided', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal',
        presetId: 'custom-preset-123'
      });

      expect(config.instrumentation.assignments[0].presetId).toBe('custom-preset-123');
    });

    it('uses default preset ID when not provided', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      expect(config.instrumentation.assignments[0].presetId).toBe('default');
    });
  });

  describe('Serialization', () => {
    it('serializes to JSON', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const json = serializePerformanceConfiguration(config);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0');
      expect(parsed.name).toBe('Test');
    });

    it('deserializes from JSON', () => {
      const original = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const json = serializePerformanceConfiguration(original);
      const deserialized = deserializePerformanceConfiguration(json);

      expect(deserialized.version).toBe(original.version);
      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
    });

    it('throws error on invalid JSON during deserialization', () => {
      const invalidJson = '{ invalid json }';

      expect(() => {
        deserializePerformanceConfiguration(invalidJson);
      }).toThrow();
    });

    it('throws error on invalid configuration during deserialization', () => {
      const invalidConfig = {
        version: '1.0',
        id: 'test',
        name: '',
        // Missing required fields
      };

      const json = JSON.stringify(invalidConfig);

      expect(() => {
        deserializePerformanceConfiguration(json);
      }).toThrow();
    });

    it('preserves all fields through serialization', () => {
      const original: PerformanceConfiguration = {
        version: '1.0',
        id: 'test-full',
        name: 'Full Test',
        description: 'Description',

        instrumentation: {
          assignments: [
            {
              roleId: 'melody',
              instrumentType: 'LocalGal',
              presetId: 'piano-1',
              busId: 'bus-1'
            }
          ]
        },

        densityScale: 0.75,
        grooveProfile: {
          id: 'groove-1',
          name: 'Swing',
          timingVariance: 0.2,
          velocityVariance: 0.3,
          swingAmount: 0.5,
          humanization: {
            microTimingDeviation: 15,
            velocityCurve: 'exponential',
            randomization: 0.25
          }
        },

        registerMap: {
          ranges: [
            {
              roleId: 'melody',
              minNote: 48,
              maxNote: 84,
              transposition: 0
            }
          ]
        },

        consolexProfileId: 'console-1',
        busConfiguration: {
          voiceBusIds: ['bus-1'],
          mixBusIds: [],
          masterBusId: 'master',
          routing: [
            {
              roleId: 'melody',
              voiceBusId: 'bus-1',
              mixBusIds: [],
              sendLevels: []
            }
          ]
        },

        targetCpuUsage: 0.25,
        maxVoices: 24,
        voiceStealing: false,

        createdAt: 1234567890,
        modifiedAt: 1234567890
      };

      const json = serializePerformanceConfiguration(original);
      const deserialized = deserializePerformanceConfiguration(json);

      expect(deserialized).toEqual(original);
    });
  });

  describe('Cloning', () => {
    it('clones configuration with updates', () => {
      const original = createMinimalPerformanceConfiguration({
        name: 'Original',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      // Wait a bit to ensure different timestamp
      const originalModifiedAt = original.modifiedAt;

      const cloned = clonePerformanceConfiguration(original, {
        name: 'Cloned',
        densityScale: 0.8
      });

      expect(cloned.id).toBe(original.id);
      expect(cloned.name).toBe('Cloned');
      expect(cloned.densityScale).toBe(0.8);
      expect(cloned.modifiedAt).toBeGreaterThanOrEqual(originalModifiedAt);
    });

    it('updates modified timestamp on clone', () => {
      const original = createMinimalPerformanceConfiguration({
        name: 'Original',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      // Wait a bit to ensure timestamp difference
      const originalModifiedAt = original.modifiedAt;

      const cloned = clonePerformanceConfiguration(original, {
        name: 'Cloned'
      });

      expect(cloned.modifiedAt).toBeGreaterThanOrEqual(originalModifiedAt);
    });

    it('preserves ID when not provided in updates', () => {
      const original = createMinimalPerformanceConfiguration({
        name: 'Original',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const cloned = clonePerformanceConfiguration(original, {
        name: 'Cloned'
      });

      expect(cloned.id).toBe(original.id);
    });

    it('updates ID when provided in updates', () => {
      const original = createMinimalPerformanceConfiguration({
        name: 'Original',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      const cloned = clonePerformanceConfiguration(original, {
        id: 'new-id',
        name: 'Cloned'
      });

      expect(cloned.id).toBe('new-id');
    });
  });

  describe('Type Guard', () => {
    it('returns true for valid configuration', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      expect(isPerformanceConfiguration(config)).toBe(true);
    });

    it('returns false for invalid configuration', () => {
      const invalid = { name: 'Invalid' };

      expect(isPerformanceConfiguration(invalid)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isPerformanceConfiguration(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPerformanceConfiguration(undefined)).toBe(false);
    });

    it('returns false for primitive types', () => {
      expect(isPerformanceConfiguration('string')).toBe(false);
      expect(isPerformanceConfiguration(123)).toBe(false);
      expect(isPerformanceConfiguration(true)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles configuration with minimum CPU usage', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.targetCpuUsage = 0.0;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('handles configuration with maximum CPU usage', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.targetCpuUsage = 1.0;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('handles configuration with minimum voices', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.maxVoices = 1;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('handles configuration with maximum voices', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.maxVoices = 1000;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('handles configuration with voice stealing disabled', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.voiceStealing = false;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('handles configuration with empty description', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      config.description = '';

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('handles configuration with no description field', () => {
      const config = createMinimalPerformanceConfiguration({
        name: 'Test',
        roleId: 'melody',
        instrumentType: 'LocalGal'
      });

      delete (config as any).description;

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('handles full orchestra configuration', () => {
      const config: PerformanceConfiguration = {
        version: '1.0',
        id: 'orchestra-full',
        name: 'Full Orchestra',
        description: 'Complete orchestral configuration',

        instrumentation: {
          assignments: [
            {
              roleId: 'strings',
              instrumentType: 'SamSampler',
              presetId: 'strings-ensemble',
              busId: 'strings-bus'
            },
            {
              roleId: 'brass',
              instrumentType: 'NexSynth',
              presetId: 'brass-ensemble',
              busId: 'brass-bus'
            },
            {
              roleId: 'woodwinds',
              instrumentType: 'KaneMarco',
              presetId: 'woodwinds-ensemble',
              busId: 'woodwinds-bus'
            },
            {
              roleId: 'percussion',
              instrumentType: 'DrumMachine',
              presetId: 'orchestral-perc',
              busId: 'perc-bus'
            }
          ]
        },

        densityScale: 0.6,
        grooveProfile: {
          id: 'groove-orchestral',
          name: 'Orchestral',
          timingVariance: 0.05,
          velocityVariance: 0.1,
          swingAmount: 0.0,
          humanization: {
            microTimingDeviation: 5,
            velocityCurve: 'linear',
            randomization: 0.1
          }
        },

        registerMap: {
          ranges: [
            {
              roleId: 'strings',
              minNote: 36,
              maxNote: 96,
              transposition: 0
            },
            {
              roleId: 'brass',
              minNote: 42,
              maxNote: 84,
              transposition: 0
            },
            {
              roleId: 'woodwinds',
              minNote: 48,
              maxNote: 96,
              transposition: 0
            },
            {
              roleId: 'percussion',
              minNote: 24,
              maxNote: 72,
              transposition: 0
            }
          ]
        },

        consolexProfileId: 'orchestra-console',
        busConfiguration: {
          voiceBusIds: ['strings-bus', 'brass-bus', 'woodwinds-bus', 'perc-bus'],
          mixBusIds: ['reverb', 'delay'],
          masterBusId: 'master',
          routing: [
            {
              roleId: 'strings',
              voiceBusId: 'strings-bus',
              mixBusIds: ['reverb', 'delay'],
              sendLevels: [0.4, 0.1]
            },
            {
              roleId: 'brass',
              voiceBusId: 'brass-bus',
              mixBusIds: ['reverb'],
              sendLevels: [0.3]
            },
            {
              roleId: 'woodwinds',
              voiceBusId: 'woodwinds-bus',
              mixBusIds: ['reverb', 'delay'],
              sendLevels: [0.3, 0.15]
            },
            {
              roleId: 'percussion',
              voiceBusId: 'perc-bus',
              mixBusIds: ['reverb'],
              sendLevels: [0.5]
            }
          ]
        },

        targetCpuUsage: 0.5,
        maxVoices: 128,
        voiceStealing: true,

        createdAt: Date.now(),
        modifiedAt: Date.now()
      };

      const result = validatePerformanceConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });
});
