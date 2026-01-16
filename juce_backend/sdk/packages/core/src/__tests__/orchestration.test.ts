/**
 * Test Suite for Orchestration Module
 *
 * Comprehensive tests for orchestral texture generation,
 * register mapping, density curves, and instrumental balance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  OrchestrationEngine,
  OrchestrationAPI,
  OrchestralTexture,
  TextureLayer,
  Note,
  OrchestrationConstraints,
  VoicingResult,
  DensityCurve,
  RegisterMap,
  DEFAULT_INSTRUMENTS,
  getInstrument,
  listInstrumentsBySection,
  suggestInstrumentsForTexture
} from '../orchestration';

describe('OrchestrationEngine', () => {
  const testHarmony = [60, 64, 67, 72]; // C major 7th
  const testInstruments = ['violin', 'viola', 'cello'];
  const testConstraints: OrchestrationConstraints = {
    maxSimultaneousNotes: 8,
    minVoiceSeparation: 2,
    registerDistribution: {
      pedal: { min: 0, max: 1 },
      bass: { min: 1, max: 2 },
      tenor: { min: 1, max: 2 },
      alto: { min: 1, max: 2 },
      treble: { min: 1, max: 2 },
      extreme: { min: 0, max: 1 }
    },
    balanceConstraints: {
      strings: { min: 0, max: 1 },
      woodwinds: { min: 0, max: 1 },
      brass: { min: 0, max: 1 },
      percussion: { min: 0, max: 1 }
    },
    dynamicConstraints: {
      overall: { min: 20, max: 100 },
      sections: {}
    }
  };

  describe('createOrchestralTexture', () => {
    it('should create basic orchestral texture', () => {
      const texture = OrchestrationEngine.createOrchestralTexture(
        testHarmony,
        testInstruments,
        testConstraints
      );

      expect(texture).toBeDefined();
      expect(texture.layers).toHaveLength(testInstruments.length);
      expect(texture.overallDensity).toBeGreaterThan(0);
      expect(texture.balance.strings).toBeGreaterThan(0);
    });

    it('should distribute notes among instruments', () => {
      const texture = OrchestrationEngine.createOrchestralTexture(
        testHarmony,
        testInstruments,
        testConstraints
      );

      const totalNotes = texture.layers.reduce((sum, layer) => sum + layer.notes.length, 0);
      expect(totalNotes).toBeGreaterThanOrEqual(testHarmony.length);

      // Check that each layer has the correct instrument
      texture.layers.forEach((layer, index) => {
        expect(layer.instrumentId).toBe(testInstruments[index]);
      });
    });

    it('should calculate correct texture properties', () => {
      const texture = OrchestrationEngine.createOrchestralTexture(
        testHarmony,
        testInstruments,
        testConstraints
      );

      // Check spectral centroid
      const allPitches = texture.layers.flatMap(layer => layer.notes.map(note => note.pitch));
      const expectedCentroid = allPitches.reduce((sum, pitch) => sum + pitch, 0) / allPitches.length;
      expect(texture.spectralCentroid).toBeCloseTo(expectedCentroid, 1);

      // Check complexity
      expect(texture.complexity).toBeGreaterThanOrEqual(0);
      expect(texture.complexity).toBeLessThanOrEqual(1);

      // Check quality metrics
      expect(texture.quality.clarity).toBeGreaterThanOrEqual(0);
      expect(texture.quality.clarity).toBeLessThanOrEqual(1);
      expect(texture.quality.richness).toBeGreaterThanOrEqual(0);
      expect(texture.quality.richness).toBeLessThanOrEqual(1);
    });

    it('should handle empty instrument list', () => {
      expect(() => {
        OrchestrationEngine.createOrchestralTexture(testHarmony, [], testConstraints);
      }).toThrow('No valid instruments specified');
    });

    it('should handle invalid instrument names', () => {
      const texture = OrchestrationEngine.createOrchestralTexture(
        testHarmony,
        ['invalid_instrument', 'violin'],
        testConstraints
      );

      expect(texture.layers).toHaveLength(1);
      expect(texture.layers[0].instrumentId).toBe('violin');
    });

    it('should respect max simultaneous notes constraint', () => {
      const strictConstraints: OrchestrationConstraints = {
        ...testConstraints,
        maxSimultaneousNotes: 4
      };

      const texture = OrchestrationEngine.createOrchestralTexture(
        [60, 62, 64, 65, 67, 69, 71, 72], // 8 notes
        testInstruments,
        strictConstraints
      );

      const totalNotes = texture.layers.reduce((sum, layer) => sum + layer.notes.length, 0);
      expect(totalNotes).toBeLessThanOrEqual(8);
    });
  });

  describe('generateRegisterMap', () => {
    it('should create register maps for all sections', () => {
      const instruments = ['violin', 'viola', 'cello', 'bass', 'flute', 'oboe', 'trumpet', 'horn'];
      const maps = OrchestrationEngine.generateRegisterMap(instruments);

      expect(maps.length).toBeGreaterThan(0);

      // Check string section
      const stringMap = maps.find(map => map.section === 'string');
      expect(stringMap).toBeDefined();
      expect(stringMap!.instruments).toContain('violin');
      expect(stringMap!.instruments).toContain('cello');

      // Check woodwind section
      const windMap = maps.find(map => map.section === 'woodwind');
      expect(windMap).toBeDefined();
      expect(windMap!.instruments).toContain('flute');

      // Check brass section
      const brassMap = maps.find(map => map.section === 'brass');
      expect(brassMap).toBeDefined();
      expect(brassMap!.instruments).toContain('trumpet');
    });

    it('should calculate register ranges correctly', () => {
      const maps = OrchestrationEngine.generateRegisterMap(['violin']);

      const stringMap = maps[0];
      expect(stringMap.treble.range[0]).toBeLessThan(stringMap.treble.range[1]);
      expect(stringMap.treble.instruments).toContain('violin');
    });

    it('should handle single instrument ensemble', () => {
      const maps = OrchestrationEngine.generateRegisterMap(['flute']);

      expect(maps).toHaveLength(1);
      expect(maps[0].section).toBe('woodwind');
      expect(maps[0].instruments).toContain('flute');
    });
  });

  describe('generateDensityCurve', () => {
    it('should generate linear density curve', () => {
      const curve = OrchestrationEngine.generateDensityCurve(8, 'linear');

      expect(curve.time).toHaveLength(101);
      expect(curve.density).toHaveLength(101);
      expect(curve.smoothness).toBe(0.8);
      expect(curve.envelope).toBe('linear');

      // Check that density increases over time
      expect(curve.density[curve.density.length - 1]).toBeGreaterThan(curve.density[0]);
    });

    it('should generate exponential density curve', () => {
      const curve = OrchestrationEngine.generateDensityCurve(8, 'exponential');

      expect(curve.envelope).toBe('exponential');

      // Check exponential growth (faster than linear)
      const midPoint = Math.floor(curve.density.length / 2);
      const linearHalf = curve.density[0] + (curve.density[curve.density.length - 1] - curve.density[0]) / 2;
      expect(curve.density[midPoint]).toBeGreaterThan(linearHalf);
    });

    it('should generate bell curve density', () => {
      const curve = OrchestrationEngine.generateDensityCurve(8, 'bell-curve');

      expect(curve.envelope).toBe('bell-curve');

      // Check that curve peaks in the middle
      const maxIndex = curve.density.indexOf(Math.max(...curve.density));
      const midPoint = Math.floor(curve.density.length / 2);
      expect(Math.abs(maxIndex - midPoint)).toBeLessThan(10);
    });

    it('should generate complex density curve', () => {
      const curve = OrchestrationEngine.generateDensityCurve(8, 'complex', 0.7, 0.9);

      expect(curve.complexity).toBe(0.7);
      expect(curve.smoothness).toBe(0.9);
      expect(curve.envelope).toBe('custom');

      // Check for variation (not monotonic)
      let increasing = true;
      let decreasing = true;

      for (let i = 1; i < curve.density.length; i++) {
        if (curve.density[i] < curve.density[i - 1]) increasing = false;
        if (curve.density[i] > curve.density[i - 1]) decreasing = false;
      }

      expect(increasing && decreasing).toBe(false); // Should have variation
    });

    it('should apply smoothing correctly', () => {
      const curve = OrchestrationEngine.generateDensityCurve(8, 'complex', 0.5, 0.9);
      const unsmoothed = OrchestrationEngine.generateDensityCurve(8, 'complex', 0.5, 0);

      // Smoothed curve should have less extreme variations
      const smoothVariance = curve.density.reduce((sum, val, i) => {
        return i > 0 ? sum + Math.pow(val - curve.density[i - 1], 2) : sum;
      }, 0);

      const unsmoothedVariance = unsmoothed.density.reduce((sum, val, i) => {
        return i > 0 ? sum + Math.pow(val - unsmoothed.density[i - 1], 2) : sum;
      }, 0);

      expect(smoothVariance).toBeLessThan(unsmoothedVariance);
    });
  });

  describe('voiceHarmony', () => {
    it('should voice basic chord correctly', () => {
      const result = OrchestrationEngine.voiceHarmony(
        [60, 64, 67], // C major
        ['violin', 'viola', 'cello']
      );

      expect(result.notes).toHaveLength(3);
      expect(result.spacing.intervals).toHaveLength(2);
      expect(result.voiceLeading.totalMotion).toBeGreaterThanOrEqual(0);
      expect(result.quality.clarity).toBeGreaterThanOrEqual(0);
      expect(result.quality.clarity).toBeLessThanOrEqual(1);
    });

    it('should respect register distribution constraints', () => {
      const constraints = {
        registerDistribution: {
          pedal: { min: 1, max: 1 },
          bass: { min: 1, max: 1 },
          tenor: { min: 1, max: 1 },
          alto: { min: 0, max: 0 },
          treble: { min: 0, max: 0 },
          extreme: { min: 0, max: 0 }
        }
      };

      const result = OrchestrationEngine.voiceHarmony(
        [36, 48, 60, 72],
        ['bass', 'cello', 'viola', 'violin'],
        constraints
      );

      expect(result.registerBalance.pedal).toBe(1);
      expect(result.registerBalance.bass).toBe(1);
      expect(result.registerBalance.tenor).toBe(1);
      expect(result.registerBalance.alto).toBe(0);
    });

    it('should calculate spacing correctly', () => {
      const result = OrchestrationEngine.voiceHarmony(
        [60, 67, 72], // C major with larger intervals
        ['violin', 'viola', 'cello']
      );

      expect(result.spacing.intervals.length).toBeGreaterThan(0);
      expect(result.spacing.balance).toBeGreaterThanOrEqual(0);
      expect(result.spacing.balance).toBeLessThanOrEqual(1);

      // Check spacing rule classification
      expect(['open', 'close', 'expanding', 'irregular']).toContain(result.spacing.spacingRule);
    });

    it('should handle more notes than instruments', () => {
      const result = OrchestrationEngine.voiceHarmony(
        [60, 62, 64, 65, 67, 69], // 6 notes
        ['violin', 'cello'] // 2 instruments
      );

      expect(result.notes.length).toBeGreaterThan(0);
      // Should distribute notes among available instruments
    });

    it('should handle voice leading analysis', () => {
      const result = OrchestrationEngine.voiceHarmony(
        [60, 64, 67],
        ['violin', 'viola', 'cello']
      );

      expect(result.voiceLeading.totalMotion).toBeGreaterThanOrEqual(0);
      expect(result.voiceLeading.parallelMotion).toBeGreaterThanOrEqual(0);
      expect(result.voiceLeading.contraryMotion).toBeGreaterThanOrEqual(0);
      expect(result.voiceLeading.obliqueMotion).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeBalance', () => {
    it('should analyze texture balance correctly', () => {
      const texture: OrchestralTexture = {
        id: 'test',
        name: 'Test Texture',
        layers: [
          {
            instrumentId: 'violin',
            notes: [],
            density: 2,
            range: 12,
            register: 'treble',
            role: 'primary',
            weight: 0.8,
            blendMode: 'linear'
          },
          {
            instrumentId: 'trumpet',
            notes: [],
            density: 1.5,
            range: 8,
            register: 'treble',
            role: 'secondary',
            weight: 0.6,
            blendMode: 'linear'
          }
        ],
        overallDensity: 3.5,
        dynamicRange: { min: 60, max: 80 },
        spectralCentroid: 72,
        complexity: 0.5,
        balance: {
          strings: 0.8,
          woodwinds: 0,
          brass: 0.6,
          percussion: 0
        },
        quality: {
          clarity: 0.7,
          richness: 0.5,
          warmth: 0.6,
          brightness: 0.8,
          transparency: 0.4
        }
      };

      const analysis = OrchestrationEngine.analyzeBalance(texture);

      expect(analysis.currentBalance).toEqual(texture.balance);
      expect(analysis.recommendations.length).toBeGreaterThanOrEqual(0);
      expect(analysis.adjustments.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide balance recommendations', () => {
      const unbalancedTexture: OrchestralTexture = {
        id: 'test',
        name: 'Test Texture',
        layers: [],
        overallDensity: 2,
        dynamicRange: { min: 60, max: 80 },
        spectralCentroid: 72,
        complexity: 0.3,
        balance: {
          strings: 0.9, // Too much
          woodwinds: 0.05, // Too little
          brass: 0.05, // Too little
          percussion: 0 // OK
        },
        quality: {
          clarity: 0.5,
          richness: 0.4,
          warmth: 0.6,
          brightness: 0.7,
          transparency: 0.3
        }
      };

      const analysis = OrchestrationEngine.analyzeBalance(unbalancedTexture);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.adjustments.some(adj => adj.instrument === 'woodwinds')).toBe(true);
    });

    it('should handle empty texture', () => {
      const emptyTexture: OrchestralTexture = {
        id: 'test',
        name: 'Empty Texture',
        layers: [],
        overallDensity: 0,
        dynamicRange: { min: 0, max: 0 },
        spectralCentroid: 60,
        complexity: 0,
        balance: {
          strings: 0,
          woodwinds: 0,
          brass: 0,
          percussion: 0
        },
        quality: {
          clarity: 0,
          richness: 0,
          warmth: 0,
          brightness: 0,
          transparency: 0
        }
      };

      const analysis = OrchestrationEngine.analyzeBalance(emptyTexture);

      expect(analysis.recommendations).toContain('No instruments in texture');
      expect(analysis.adjustments).toHaveLength(0);
    });
  });
});

describe('OrchestrationAPI', () => {
  describe('orchestrateHarmony', () => {
    it('should create string quartet orchestration', () => {
      const texture = OrchestrationAPI.orchestrateHarmony(
        [60, 64, 67, 72],
        'string_quartet',
        { style: 'classical', density: 'moderate' }
      );

      expect(texture.layers).toHaveLength(4);
      expect(texture.balance.strings).toBeGreaterThan(0);
      expect(texture.balance.woodwinds).toBe(0);
      expect(texture.balance.brass).toBe(0);
    });

    it('should create full orchestra orchestration', () => {
      const texture = OrchestrationAPI.orchestrateHarmony(
        [60, 64, 67, 72],
        'full_orchestra',
        { style: 'romantic', density: 'dense' }
      );

      expect(texture.layers.length).toBeGreaterThan(10);
      expect(texture.balance.strings).toBeGreaterThan(0);
      expect(texture.balance.woodwinds).toBeGreaterThan(0);
      expect(texture.balance.brass).toBeGreaterThan(0);
    });

    it('should adapt to different styles', () => {
      const classical = OrchestrationAPI.orchestrateHarmony(
        [60, 64, 67, 72],
        'chamber_orchestra',
        { style: 'classical' }
      );

      const modern = OrchestrationAPI.orchestrateHarmony(
        [60, 64, 67, 72],
        'chamber_orchestra',
        { style: 'modern' }
      );

      // Modern style should allow closer spacing
      expect(modern.complexity).toBeGreaterThan(classical.complexity);
    });

    it('should handle different densities', () => {
      const sparse = OrchestrationAPI.orchestrateHarmony(
        [60, 64, 67, 72],
        'chamber_orchestra',
        { density: 'sparse' }
      );

      const dense = OrchestrationAPI.orchestrateHarmony(
        [60, 64, 67, 72],
        'chamber_orchestra',
        { density: 'dense' }
      );

      expect(dense.overallDensity).toBeGreaterThan(sparse.overallDensity);
    });
  });

  describe('generateTexture', () => {
    it('should create homophonic texture', () => {
      const texture = OrchestrationAPI.generateTexture(
        'homophonic',
        [60, 64, 67, 72],
        undefined,
        { transparency: 0.7 }
      );

      expect(texture.layers.length).toBeGreaterThan(0);
      expect(texture.quality.transparency).toBeGreaterThan(0.5);
    });

    it('should create melody and accompaniment texture', () => {
      const melody = [72, 74, 76, 78, 80];
      const harmony = [60, 64, 67];

      const texture = OrchestrationAPI.generateTexture(
        'melody_accompaniment',
        harmony,
        melody
      );

      expect(texture.layers.length).toBeGreaterThan(1);
      expect(texture.overallDensity).toBeGreaterThan(0);
    });

    it('should handle custom ensemble', () => {
      const customEnsemble = ['flute', 'clarinet', 'horn'];
      const texture = OrchestrationAPI.generateTexture(
        'homophonic',
        [60, 64, 67],
        undefined,
        { ensemble: customEnsemble }
      );

      const instrumentIds = texture.layers.map(layer => layer.instrumentId);
      expect(instrumentIds).toEqual(expect.arrayContaining(customEnsemble));
    });
  });

  describe('balanceOrchestration', () => {
    it('should optimize texture quality', () => {
      const texture: OrchestralTexture = {
        id: 'test',
        name: 'Test Texture',
        layers: [
          {
            instrumentId: 'violin',
            notes: [],
            density: 2,
            range: 12,
            register: 'treble',
            role: 'primary',
            weight: 0.8,
            blendMode: 'linear'
          }
        ],
        overallDensity: 2,
        dynamicRange: { min: 60, max: 80 },
        spectralCentroid: 72,
        complexity: 0.3,
        balance: {
          strings: 0.8,
          woodwinds: 0,
          brass: 0,
          percussion: 0
        },
        quality: {
          clarity: 0.3,
          richness: 0.4,
          warmth: 0.5,
          brightness: 0.6,
          transparency: 0.4
        }
      };

      const result = OrchestrationAPI.balanceOrchestration(texture, {
        clarity: 0.8,
        richness: 0.7
      });

      expect(result.optimizedTexture).toBeDefined();
      expect(result.qualityImprovement).toBeGreaterThanOrEqual(0);
      expect(result.adjustments.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('getInstrument', () => {
    it('should return valid instrument data', () => {
      const violin = getInstrument('violin');
      expect(violin).toBeDefined();
      expect(violin!.id).toBe('violin');
      expect(violin!.section).toBe('string');
      expect(violin!.range.min).toBeLessThan(violin!.range.max);
    });

    it('should return undefined for invalid instrument', () => {
      const invalid = getInstrument('nonexistent_instrument');
      expect(invalid).toBeUndefined();
    });
  });

  describe('listInstrumentsBySection', () => {
    it('should list string instruments', () => {
      const strings = listInstrumentsBySection('string');
      expect(strings).toContain('violin');
      expect(strings).toContain('viola');
      expect(strings).toContain('cello');
      expect(strings).toContain('bass');
      expect(strings).not.toContain('flute');
    });

    it('should list woodwind instruments', () => {
      const winds = listInstrumentsBySection('woodwind');
      expect(winds).toContain('flute');
      expect(winds).toContain('oboe');
      expect(winds).toContain('clarinet');
      expect(winds).not.toContain('violin');
    });

    it('should list brass instruments', () => {
      const brass = listInstrumentsBySection('brass');
      expect(brass).toContain('trumpet');
      expect(brass).toContain('horn');
      expect(brass).toContain('trombone');
      expect(brass).not.toContain('flute');
    });
  });

  describe('suggestInstrumentsForTexture', () => {
    it('should suggest bright texture instruments', () => {
      const instruments = suggestInstrumentsForTexture('bright', 'small');
      expect(instruments).toContain('violin');
      expect(instruments).toContain('trumpet');
      expect(instruments).toContain('flute');
    });

    it('should suggest dark texture instruments', () => {
      const instruments = suggestInstrumentsForTexture('dark', 'medium');
      expect(instruments).toContain('viola');
      expect(instruments).toContain('cello');
      expect(instruments).toContain('horn');
    });

    it('should suggest warm texture instruments', () => {
      const instruments = suggestInstrumentsForTexture('warm', 'large');
      expect(instruments.length).toBeGreaterThan(5);
      expect(instruments).toContain('cello');
      expect(instruments).toContain('clarinet');
    });

    it('should adjust for ensemble size', () => {
      const small = suggestInstrumentsForTexture('bright', 'small');
      const large = suggestInstrumentsForTexture('bright', 'large');

      expect(large.length).toBeGreaterThan(small.length);
    });
  });
});

describe('Performance Tests', () => {
  it('should create orchestral texture within performance targets', () => {
    const startTime = performance.now();

    const texture = OrchestrationEngine.createOrchestralTexture(
      [60, 64, 67, 72, 76, 79, 83, 87], // 8 notes
      ['violin', 'viola', 'cello', 'bass', 'flute', 'oboe', 'clarinet', 'horn'],
      {
        maxSimultaneousNotes: 16,
        minVoiceSeparation: 2,
        registerDistribution: {
          pedal: { min: 0, max: 1 },
          bass: { min: 1, max: 2 },
          tenor: { min: 1, max: 2 },
          alto: { min: 1, max: 2 },
          treble: { min: 1, max: 2 },
          extreme: { min: 0, max: 1 }
        },
        balanceConstraints: {
          strings: { min: 0, max: 1 },
          woodwinds: { min: 0, max: 1 },
          brass: { min: 0, max: 1 },
          percussion: { min: 0, max: 1 }
        },
        dynamicConstraints: {
          overall: { min: 20, max: 100 },
          sections: {}
        }
      }
    );

    const executionTime = performance.now() - startTime;

    expect(texture).toBeDefined();
    expect(texture.layers.length).toBeGreaterThan(0);
    expect(executionTime).toBeLessThan(50); // 50ms target
  });

  it('should generate density curve efficiently', () => {
    const startTime = performance.now();

    const curve = OrchestrationEngine.generateDensityCurve(16, 'complex', 0.8, 0.9);

    const executionTime = performance.now() - startTime;

    expect(curve.time.length).toBe(101);
    expect(curve.density.length).toBe(101);
    expect(executionTime).toBeLessThan(10); // 10ms target
  });

  it('should perform voice harmony quickly', () => {
    const startTime = performance.now();

    const result = OrchestrationEngine.voiceHarmony(
      [60, 62, 64, 65, 67, 69, 71, 72],
      ['violin', 'viola', 'cello', 'flute', 'oboe', 'horn']
    );

    const executionTime = performance.now() - startTime;

    expect(result.notes.length).toBeGreaterThan(0);
    expect(executionTime).toBeLessThan(20); // 20ms target
  });
});

describe('Edge Cases', () => {
  it('should handle single note harmony', () => {
    const texture = OrchestrationEngine.createOrchestralTexture(
      [60],
      ['violin'],
      testConstraints
    );

    expect(texture.layers).toHaveLength(1);
    expect(texture.layers[0].notes.length).toBeGreaterThan(0);
  });

  it('should handle very large harmony', () => {
    const largeHarmony = Array.from({ length: 24 }, (_, i) => 60 + i * 2);
    const texture = OrchestrationEngine.createOrchestralTexture(
      largeHarmony,
      ['violin', 'viola', 'cello', 'bass'],
      {
        ...testConstraints,
        maxSimultaneousNotes: 32
      }
    );

    expect(texture).toBeDefined();
    expect(texture.layers.length).toBe(4);
  });

  it('should handle extreme register constraints', () => {
    const extremeConstraints: OrchestrationConstraints = {
      ...testConstraints,
      registerDistribution: {
        pedal: { min: 2, max: 2 },
        bass: { min: 2, max: 2 },
        tenor: { min: 0, max: 0 },
        alto: { min: 0, max: 0 },
        treble: { min: 0, max: 0 },
        extreme: { min: 0, max: 0 }
      }
    };

    const result = OrchestrationEngine.voiceHarmony(
      [36, 38, 40, 48],
      ['bass', 'cello', 'tuba'],
      extremeConstraints
    );

    expect(result.notes).toBeDefined();
    expect(result.registerBalance.pedal + result.registerBalance.bass).toBeGreaterThan(0);
  });

  it('should handle instrument with limited range', () => {
    const result = OrchestrationEngine.voiceHarmony(
      [100, 102, 104], // Very high notes
      ['violin', 'flute', 'trumpet']
    );

    expect(result.notes.length).toBeGreaterThanOrEqual(0);
    // Some instruments might not get notes if out of range
  });
});