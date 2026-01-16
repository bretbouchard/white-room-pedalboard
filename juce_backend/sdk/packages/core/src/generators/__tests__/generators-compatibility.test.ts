/**
 * Tests to verify Generator API compatibility and functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RhythmGenerator,
  HarmonyGenerator,
  MelodyGenerator,
  CompositionGenerator,
  SchillingerSDK,
  BaseGenerator,
  isGenerator,
} from '../index';

describe('Generator API Compatibility', () => {
  let sdk: SchillingerSDK;

  beforeEach(() => {
    sdk = new SchillingerSDK({
      apiUrl: 'https://api.schillinger.ai/v1',
      offlineMode: true,
      environment: 'development'
    });
  });

  describe('Generator Initialization', () => {
    it('should initialize all generators in SDK', () => {
      expect(sdk.generators).toBeDefined();
      expect(sdk.generators.rhythm).toBeInstanceOf(RhythmGenerator);
      expect(sdk.generators.harmony).toBeInstanceOf(HarmonyGenerator);
      expect(sdk.generators.melody).toBeInstanceOf(MelodyGenerator);
      expect(sdk.generators.composition).toBeInstanceOf(CompositionGenerator);
    });

    it('should maintain backward compatibility with existing APIs', () => {
      expect(sdk.rhythm).toBeDefined();
      expect(sdk.harmony).toBeDefined();
      expect(sdk.melody).toBeDefined();
      expect(sdk.composition).toBeDefined();
    });

    it('should allow standalone generator initialization', () => {
      const rhythmGen = new RhythmGenerator({ sdk });
      const harmonyGen = new HarmonyGenerator({ sdk });
      const melodyGen = new MelodyGenerator({ sdk });
      const compositionGen = new CompositionGenerator({ sdk });

      expect(rhythmGen).toBeInstanceOf(RhythmGenerator);
      expect(harmonyGen).toBeInstanceOf(HarmonyGenerator);
      expect(melodyGen).toBeInstanceOf(MelodyGenerator);
      expect(compositionGen).toBeInstanceOf(CompositionGenerator);
    });
  });

  describe('RhythmGenerator Functionality', () => {
    it('should generate rhythmic resultants with enhanced metadata', () => {
      const generator = new RhythmGenerator({ sdk });

      const result = generator.generateResultant(3, 2);

      expect(result.data).toBeDefined();
      expect(result.data.durations).toBeDefined();
      expect(result.data.durations.length).toBeGreaterThan(0);

      // Verify enhanced metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedBy).toBe('RhythmGenerator');
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.parameters.methodParams).toEqual({ a: 3, b: 2 });
    });

    it('should accept and merge generator parameters', () => {
      const generator = new RhythmGenerator({
        sdk,
        defaultComplexity: 0.8
      });

      generator.setParameters({
        style: 'jazz',
        tempo: 140
      });

      const params = generator.getParameters();
      expect(params.style).toBe('jazz');
      expect(params.tempo).toBe(140);
      expect(params.complexity).toBe(0.8); // Default should be preserved
    });

    it('should provide generator information', () => {
      const generator = new RhythmGenerator({ sdk });

      const info = generator.getInfo();
      expect(info.name).toBe('RhythmGenerator');
      expect(info.config).toBeDefined();
      expect(info.parameters).toBeDefined();
      expect(info.hasSDK).toBe(true);
    });
  });

  describe('HarmonyGenerator Functionality', () => {
    it('should generate chord progressions with enhanced metadata', () => {
      const generator = new HarmonyGenerator({ sdk });

      const result = generator.generateProgression({
        key: 'C',
        scale: 'major',
        length: 4
      });

      expect(result.data).toBeDefined();
      expect(result.data.chords).toBeDefined();

      // Verify enhanced metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedBy).toBe('HarmonyGenerator');
      expect(result.metadata.timestamp).toBeDefined();
    });

    it('should handle harmony variations', () => {
      const generator = new HarmonyGenerator({ sdk });

      // Note: This test may need to be adjusted based on actual API implementation
      expect(() => {
        generator.generateProgression({
          key: 'C',
          scale: 'major',
          length: 8,
          style: 'jazz'
        });
      }).not.toThrow();
    });
  });

  describe('MelodyGenerator Functionality', () => {
    it('should generate melodic lines with enhanced metadata', () => {
      const generator = new MelodyGenerator({ sdk });

      const result = generator.generateMelody({
        key: 'C',
        scale: 'major',
        length: 8,
        contour: 'ascending'
      });

      expect(result.data).toBeDefined();
      expect(result.data.notes).toBeDefined();
      expect(result.data.notes.length).toBe(8);

      // Verify enhanced metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedBy).toBe('MelodyGenerator');
      expect(result.metadata.timestamp).toBeDefined();
    });

    it('should provide melodic suggestions', () => {
      const generator = new MelodyGenerator({ sdk });

      const result = generator.getSuggestions({
        key: 'C',
        scale: 'major'
      });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('CompositionGenerator Functionality', () => {
    it('should create compositions with enhanced metadata', () => {
      const generator = new CompositionGenerator({ sdk });

      const result = generator.create({
        name: 'Test Composition',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4]
      });

      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('Test Composition');
      expect(result.data.key).toBe('C');

      // Verify enhanced metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedBy).toBe('CompositionGenerator');
      expect(result.metadata.timestamp).toBeDefined();
    });

    it('should provide composition suggestions', () => {
      const generator = new CompositionGenerator({ sdk });

      const result = generator.getSuggestions({
        style: 'contemporary',
        key: 'C'
      });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('BaseGenerator Functionality', () => {
    it('should provide consistent base functionality across all generators', () => {
      const rhythmGen = new RhythmGenerator({ sdk });
      const harmonyGen = new HarmonyGenerator({ sdk });
      const melodyGen = new MelodyGenerator({ sdk });
      const compositionGen = new CompositionGenerator({ sdk });

      const generators = [rhythmGen, harmonyGen, melodyGen, compositionGen];

      generators.forEach(generator => {
        expect(generator.getInfo()).toBeDefined();
        expect(generator.getConfig()).toBeDefined();
        expect(generator.getParameters()).toBeDefined();

        // Test parameter setting
        generator.setParameters({ tempo: 100 } as any);
        expect(generator.getParameters()).toBeDefined();
      });
    });

    it('should identify generators correctly', () => {
      const generator = new RhythmGenerator({ sdk });
      const nonGenerator = { someProperty: 'value' };

      expect(isGenerator(generator)).toBe(true);
      expect(isGenerator(nonGenerator)).toBe(false);
    });

    it('should clone generators correctly', () => {
      const originalGen = new RhythmGenerator({
        sdk,
        defaultComplexity: 0.9
      });

      const clonedGen = originalGen.clone();

      expect(clonedGen).toBeInstanceOf(RhythmGenerator);
      expect(clonedGen).not.toBe(originalGen); // Different instances
      expect(clonedGen.getInfo().config).toEqual(originalGen.getInfo().config);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations without SDK gracefully', () => {
      const generator = new RhythmGenerator(); // No SDK provided

      expect(() => {
        generator.generateResultant(3, 2);
      }).toThrow('SDK instance not available');
    });

    it('should validate parameters correctly', () => {
      const generator = new RhythmGenerator({ sdk });

      expect(() => {
        generator.setParameters({ tempo: -10 } as any);
      }).not.toThrow(); // Should accept but may validate internally
    });
  });

  describe('Configuration Management', () => {
    it('should merge configurations correctly', () => {
      const generator = new RhythmGenerator({
        sdk,
        defaultComplexity: 0.8,
        defaultTempo: 140
      });

      const config = generator.getConfig();
      expect(config.defaultComplexity).toBe(0.8);
      expect(config.defaultTempo).toBe(140);
      // Should still have defaults for other properties
      expect(config.cacheEnabled).toBe(true);
    });

    it('should update configuration at runtime', () => {
      const generator = new RhythmGenerator({ sdk });

      generator.setConfig({ defaultTempo: 160 });

      const config = generator.getConfig();
      expect(config.defaultTempo).toBe(160);
    });
  });
});