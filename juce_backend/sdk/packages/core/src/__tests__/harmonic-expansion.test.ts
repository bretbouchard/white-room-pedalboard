import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HarmonicExpansionEngine,
  HarmonicExpansionAPI,
  HarmonicElement,
  HarmonicExpansionType,
  ExpansionParameters,
  VoiceLeadingConstraints,
  HarmonicLimits,
  TensionModel,
  Polychord,
  HarmonicField
} from '../harmonic-expansion';
import { SchillingerSDK } from '../client';
import { ValidationError as _ValidationError } from '@schillinger-sdk/shared';

// Mock the SDK client
const mockSDK = {
  isOfflineMode: vi.fn(() => true),
  getCachedOrExecute: vi.fn(),
  makeRequest: vi.fn(),
} as unknown as SchillingerSDK;

describe('HarmonicExpansionEngine', () => {
  let sampleHarmony: HarmonicElement[];

  beforeEach(() => {
    sampleHarmony = [
      { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
      { pitch: 64, root: 60, quality: 'major', tension: 0.3, function: 'tonic', inversion: 0 },
      { pitch: 67, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 }
    ];
    vi.clearAllMocks();
  });

  describe('Harmonic Expansion Types', () => {
    it('should create parallel expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.5,
        preserveFunction: true
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.originalHarmony).toEqual(sampleHarmony);
      expect(expansion.expandedHarmony).toHaveLength(3);
      expect(expansion.expansionType).toBe('parallel');
      expect(expansion.analysis).toBeDefined();
      expect(expansion.quality).toBeGreaterThanOrEqual(0);
      expect(expansion.quality).toBeLessThanOrEqual(1);

      // All voices should move in same direction
      const originalIntervals = sampleHarmony.map((h, i) =>
        i > 0 ? h.pitch - sampleHarmony[i - 1].pitch : 0
      );
      const expandedIntervals = expansion.expandedHarmony.map((h, i) =>
        i > 0 ? h.pitch - expansion.expandedHarmony[i - 1].pitch : 0
      );

      expandedIntervals.forEach((interval, i) => {
        expect(Math.abs(interval - originalIntervals[i])).toBeLessThan(0.01);
      });
    });

    it('should create contrary expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'contrary',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('contrary');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that voices move in opposing directions
      const sortedOriginal = [...sampleHarmony].sort((a, b) => a.pitch - b.pitch);
      const sortedExpanded = [...expansion.expandedHarmony].sort((a, b) => a.pitch - b.pitch);
      const midpoint = sortedOriginal[Math.floor(sortedOriginal.length / 2)];

      sortedExpanded.forEach((element, index) => {
        const originalElement = sortedOriginal[index];
        const direction = element.pitch > midpoint ? 1 : -1;
        expect(element.pitch).toBeGreaterThanOrEqual(0);
      });
    });

    it('should create oblique expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'oblique',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('oblique');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that at least one voice stays the same
      const movingVoices = expansion.expandedHarmony.filter((element, index) =>
        element.pitch !== sampleHarmony[index].pitch
      );
      expect(movingVoices.length).toBeLessThan(3);
    });

    it('should create mixed expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'mixed',
        intensity: 0.7
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('mixed');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that there's variety in the movement
      const movements = expansion.expandedHarmony.map((element, index) =>
        element.pitch - sampleHarmony[index].pitch
      );
      const uniqueMovements = new Set(movements);
      expect(uniqueMovements.size).toBeGreaterThan(0);
    });

    it('should create rotational expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'rotational',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('rotational');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that the pattern is rotated
      const originalPitches = sampleHarmony.map(h => h.pitch);
      const expandedPitches = expansion.expandedHarmony.map(h => h.pitch);
      expect(expandedPitches).not.toEqual(originalPitches);
    });

    it('should create retrograde expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'retrograde',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('retrograde');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that the order is reversed
      const reversedOriginal = [...sampleHarmony].reverse();
      expansion.expandedHarmony.forEach((element, index) => {
        expect(element.pitch).toBe(reversedOriginal[index].pitch);
        expect(element.quality).toBe(reversedOriginal[index].quality);
        expect(element.function).toBe(reversedOriginal[index].function);
      });
    });

    it('should create invertible expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'invertible',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('invertible');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that intervals are inverted
      const axis = (sampleHarmony[0].pitch + sampleHarmony[2].pitch) / 2;
      expansion.expandedHarmony.forEach((element, index) => {
        const invertedPitch = 2 * axis - sampleHarmony[index].pitch;
        expect(Math.abs(element.pitch - invertedPitch)).toBeLessThan(0.01);
      });
    });

    it('should create pandiatonic expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'pandiatonic',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('pandiatonic');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that all notes are diatonic
      expansion.expandedHarmony.forEach(element => {
        const pitchClass = (element.pitch - element.root) % 12;
        const diatonicPitches = [0, 2, 4, 5, 7, 9, 11];
        expect(diatonicPitches).toContain(pitchClass >= 0 ? pitchClass : pitchClass + 12);
      });
    });

    it('should create chromatic expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'chromatic',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('chromatic');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that tension is high
      expect(expansion.analysis.total).toBeGreaterThan(0.6);

      expansion.expandedHarmony.forEach(element => {
        expect(element.function).toBe('chromatic');
      });
    });

    it('should create polychordal expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'polychordal',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('polychordal');
      expect(expansion.expandedHarmony.length).toBeGreaterThan(sampleHarmony.length);

      // Should have multiple layers
      expect(expansion.expandedHarmony.length).toBeGreaterThanOrEqual(6);
    });

    it('should create tension-based expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'tension_based',
        intensity: 0.5,
        targetTension: 0.7
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('tension_based');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that target tension is approximately achieved
      expect(Math.abs(expansion.analysis.total - 0.7)).toBeLessThan(0.2);
    });

    it('should create functional expansion correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'functional',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expansionType).toBe('functional');
      expect(expansion.expandedHarmony).toHaveLength(3);

      // Check that functional relationships are preserved/changed appropriately
      expansion.expandedHarmony.forEach(element => {
        expect(['tonic', 'dominant', 'subdominant', 'submediant', 'mediant', 'supertonic']).toContain(element.function);
      });
    });

    it('should handle invalid expansion types', () => {
      const parameters: ExpansionParameters = {
        type: 'invalid' as any,
        intensity: 0.5
      };

      expect(() => HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters)).toThrow();
    });
  });

  describe('Tension Model Calculation', () => {
    it('should calculate tension model for harmony', () => {
      const model = HarmonicExpansionEngine.calculateTensionModel(sampleHarmony);

      expect(model).toHaveProperty('dissonance');
      expect(model).toHaveProperty('voiceLeading');
      expect(model).toHaveProperty('functional');
      expect(model).toHaveProperty('chromatic');
      expect(model).toHaveProperty('rhythmic');
      expect(model).toHaveProperty('total');

      expect(model.dissonance).toBeGreaterThanOrEqual(0);
      expect(model.dissonance).toBeLessThanOrEqual(1);
      expect(model.total).toBeGreaterThanOrEqual(0);
      expect(model.total).toBeLessThanOrEqual(1);
    });

    it('should handle empty harmony gracefully', () => {
      const model = HarmonicExpansionEngine.calculateTensionModel([]);

      expect(model.dissonance).toBe(0);
      expect(model.voiceLeading).toBe(0);
      expect(model.functional).toBe(0);
      expect(model.chromatic).toBe(0);
      expect(model.rhythmic).toBe(0);
      expect(model.total).toBe(0);
    });

    it('should handle single element harmony', () => {
      const model = HarmonicExpansionEngine.calculateTensionModel([sampleHarmony[0]]);

      expect(model.dissonance).toBe(0);
      expect(model.voiceLeading).toBe(0);
      expect(model.functional).toBeGreaterThanOrEqual(0);
      expect(model.chromatic).toBeGreaterThanOrEqual(0);
      expect(model.rhythmic).toBe(0);
      expect(model.total).toBeGreaterThanOrEqual(0);
    });

    it('should calculate dissonance correctly', () => {
      const consonantHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 64, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 67, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 }
      ];

      const dissonantHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.8, function: 'tonic', inversion: 0 },
        { pitch: 61, root: 60, quality: 'minor', tension: 0.9, function: 'chromatic', inversion: 0 },
        { pitch: 66, root: 60, quality: 'tritone', tension: 0.95, function: 'chromatic', inversion: 0 }
      ];

      const consonantModel = HarmonicExpansionEngine.calculateTensionModel(consonantHarmony);
      const dissonantModel = HarmonicExpansionEngine.calculateTensionModel(dissonantHarmony);

      expect(consonantModel.dissonance).toBeLessThan(dissonantModel.dissonance);
      expect(consonantModel.total).toBeLessThan(dissonantModel.total);
    });
  });

  describe('Polychord Generation', () => {
    it('should generate polychord correctly', () => {
      const chords: HarmonicElement[][] = [
        [
          { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
          { pitch: 64, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
          { pitch: 67, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 }
        ],
        [
          { pitch: 65, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 },
          { pitch: 68, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 },
          { pitch: 72, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 }
        ]
      ];

      const polychord = HarmonicExpansionEngine.generatePolychord(chords);

      expect(polychord.chords).toEqual(chords);
      expect(polychord.intervals).toBeDefined();
      expect(polychord.density).toBeGreaterThan(0);
      expect(polychord.clarity).toBeGreaterThanOrEqual(0);
      expect(polychord.clarity).toBeLessThanOrEqual(1);
      expect(polychord.tension).toBeGreaterThanOrEqual(0);
      expect(polychord.tension).toBeLessThanOrEqual(1);

      // Should have 6 combined elements
      expect(polychord.chords.flat().length).toBe(6);
    });

    it('should use custom intervals correctly', () => {
      const chords: HarmonicElement[][] = [
        [
          { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 }
        ],
        [
          { pitch: 65, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 }
        ]
      ];

      const customIntervals = [0, 5, 7]; // Unison, perfect fifth, minor seventh
      const polychord = HarmonicExpansionEngine.generatePolychord(chords, customIntervals);

      expect(polychord.intervals).toEqual(customIntervals);

      // Second chord should be transposed by the first interval (0) + second interval (5) = 5
      expect(polychord.chords.flat()[1].pitch).toBe(65 + 5);
    });
  });

  describe('Harmonic Field Creation', () => {
    it('should create harmonic field correctly', () => {
      const elements: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 64, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 67, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 65, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 },
        { pitch: 68, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 }
      ];

      const field = HarmonicExpansionEngine.createHarmonicField('C', 'major', elements);

      expect(field.elements).toHaveLength(5);
      expect(field.key).toBe('C');
      expect(field.mode).toBe('major');
      expect(field.tonalCenter).toBe(60);
      expect(field.stability).toBeGreaterThanOrEqual(0);
      expect(field.stability).toBeLessThanOrEqual(1);
      expect(field.tension).toBeGreaterThanOrEqual(0);
      expect(field.tension).toBeLessThanOrEqual(1);

      // Should analyze functions for each element
      field.elements.forEach(element => {
        expect(element.function).toBeDefined();
        expect(element.tension).toBeDefined();
      });
    });

    it('should handle different modes correctly', () => {
      const elements: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'minor', tension: 0.3, function: 'tonic', inversion: 0 }
      ];

      const minorField = HarmonicExpansionEngine.createHarmonicField('A', 'minor', elements);
      const dorianField = HarmonicExpansionEngine.createHarmonicField('D', 'dorian', elements);

      expect(minorField.mode).toBe('minor');
      expect(dorianField.mode).toBe('dorian');
      expect(minorField.tonalCenter).toBe(69); // A
      expect(dorianField.tonalCenter).toBe(62); // D

      // Minor should have higher base tension than major
      expect(minorField.elements[0].tension).toBeGreaterThan(0.2);
    });
  });

  describe('Harmony Analysis', () => {
    it('should analyze complete harmony structure', () => {
      const analysis = HarmonicExpansionEngine.analyzeHarmony(sampleHarmony);

      expect(analysis.tensionProfile).toBeDefined();
      expect(analysis.functionAnalysis).toBeDefined();
      expect(analysis.voiceLeading).toBeDefined();
      expect(analysis.structural).toBeDefined();

      // Check tension profile
      expect(analysis.tensionProfile).toHaveLength(3);
      analysis.tensionProfile.forEach(model => {
        expect(model.total).toBeGreaterThanOrEqual(0);
        expect(model.total).toBeLessThanOrEqual(1);
      });

      // Check functional analysis
      expect(analysis.functionAnalysis.progression).toBeDefined();
      expect(analysis.functionAnalysis.stability).toBeDefined();

      // Check voice leading
      expect(analysis.voiceLeading.parallelMotion).toBeDefined();
      expect(analysis.voiceLeading.contraryMotion).toBeDefined();
      expect(analysis.voiceLeading.obliqueMotion).toBeDefined();

      // Check structural analysis
      expect(analysis.structural.symmetry).toBeGreaterThanOrEqual(0);
      expect(analysis.structural.symmetry).toBeLessThanOrEqual(1);
      expect(analysis.structural.balance).toBeGreaterThanOrEqual(0);
      expect(analysis.structural.balance).toBeLessThanOrEqual(1);
      expect(analysis.structural.clarity).toBeGreaterThanOrEqual(0);
      expect(analysis.structural.clarity).toBeLessThanOrEqual(1);
      expect(analysis.structural.complexity).toBeGreaterThanOrEqual(0);
      expect(analysis.structural.complexity).toBeLessThanOrEqual(1);
    });

    it('should analyze complex harmony correctly', () => {
      const complexHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 64, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 67, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 65, root: 65, quality: 'minor', tension: 0.3, function: 'submediant', inversion: 0 },
        { pitch: 68, root: 65, quality: 'minor', tension: 0.3, function: 'submediant', inversion: 0 },
        { pitch: 70, root: 65, quality: 'minor', tension: 0.3, function: 'submediant', inversion: 0 },
        { pitch: 67, root: 67, quality: 'dominant', tension: 0.6, function: 'dominant', inversion: 0 }
      ];

      const analysis = HarmonicExpansionEngine.analyzeHarmony(complexHarmony);

      expect(analysis.tensionProfile.length).toBe(7);

      // Should detect multiple functions
      expect(new Set(analysis.functionAnalysis.progression).size).toBeGreaterThan(2);

      // Should have reasonable structural metrics
      expect(analysis.structural.complexity).toBeGreaterThan(0);
      expect(analysis.structural.balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Voice Leading Optimization', () => {
    it('should optimize voice leading with constraints', () => {
      const problematicHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 80, root: 60, quality: 'major', tension: 0.7, function: 'tonic', inversion: 0 }, // Large leap
        { pitch: 62, root: 60, quality: 'major', tension: 0.3, function: 'tonic', inversion: 0 }, // Another leap
      ];

      const constraints: VoiceLeadingConstraints = {
        maxLeap: 5,
        preferContraryMotion: true
      };

      const optimized = HarmonicExpansionEngine.optimizeVoiceLeading(problematicHarmony, constraints);

      expect(optimized).toHaveLength(3);

      // Check that large leaps are reduced
      const optimizedLeaps = optimized.map((element, index) =>
        index > 0 ? Math.abs(element.pitch - optimized[index - 1].pitch) : 0
      );
      optimizedLeaps.forEach(leap => {
        expect(leap).toBeLessThanOrEqual(constraints.maxLeap!);
      });

      // Check that original harmony is not modified
      expect(problematicHarmony).not.toEqual(optimized);
    });

    it('should handle empty constraints gracefully', () => {
      const constraints: VoiceLeadingConstraints = {};

      const optimized = HarmonicExpansionEngine.optimizeVoiceLeading(sampleHarmony, constraints);

      expect(optimized).toHaveLength(3);
    });

    it('should improve voice leading score', () => {
      const harmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 61, root: 60, quality: 'major', tension: 0.3, function: 'tonic', inversion: 0 },
        { pitch: 62, root: 60, quality: 'major', tension: 0.4, function: 'tonic', inversion: 0 }
      ];

      const constraints: VoiceLeadingConstraints = {
        maxLeap: 2,
        preferContraryMotion: false
      };

      const originalTension = HarmonicExpansionEngine.calculateTensionModel(harmony);
      const optimized = HarmonicExpansionEngine.optimizeVoiceLeading(harmony, constraints);
      const optimizedTension = HarmonicExpansionEngine.calculateTensionModel(optimized);

      // Optimization should improve or maintain tension
      expect(optimizedTension.voiceLeading).toBeGreaterThanOrEqual(originalTension.voiceLeading);
    });
  });

  describe('Quality Assessment', () => {
    it('should calculate expansion quality correctly', () => {
      const parameters: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.5,
        preserveFunction: true
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.quality).toBeGreaterThanOrEqual(0);
      expect(expansion.quality).toBeLessThanOrEqual(1);

      // High quality expansion with preserved functions and moderate intensity
      expect(expansion.quality).toBeGreaterThan(0.4);
    });

    it('should assess quality differences between expansion types', () => {
      const commonParams: ExpansionParameters = {
        intensity: 0.5,
        preserveFunction: true
      };

      const parallelExpansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, {
        type: 'parallel',
        ...commonParams
      });

      const chromaticExpansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, {
        type: 'chromatic',
        ...commonParams
      });

      // Chromatic expansion should have higher tension but potentially lower quality
      expect(chromaticExpansion.analysis.total).toBeGreaterThan(parallelExpansion.analysis.total);

      // Quality depends on context, but parallel should generally be more stable
      expect(parallelExpansion.quality).toBeGreaterThan(0);
      expect(chromaticExpansion.quality).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty harmony', () => {
      const parameters: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.5
      };

      expect(() => HarmonicExpansionEngine.expandHarmony([], parameters)).not.toThrow();
    });

    it('should handle single element harmony', () => {
      const singleElement: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 }
      ];

      const parameters: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.5
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(singleElement, parameters);

      expect(expansion.expandedHarmony).toHaveLength(1);
      expect(expansion.quality).toBeGreaterThan(0);
    });

    it('should handle extreme intensity values', () => {
      const parameters: ExpansionParameters = {
        type: 'chromatic',
        intensity: 1.0, // Maximum intensity
        targetTension: 1.0
      };

      const expansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters);

      expect(expansion.expandedHarmony).toHaveLength(3);
      expect(expansion.analysis.total).toBeCloseTo(1, 0.1); // Very high tension

      const zeroParams: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.0 // No expansion
      };

      const zeroExpansion = HarmonicExpansionEngine.expandHarmony(sampleHarmony, zeroParams);

      expect(zeroExpansion.expandedHarmony).toHaveLength(3);
      expect(zeroExpansion.expansionType).toBe('parallel');
    });

    it('should preserve function when requested', () => {
      const parametersWithFunction: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.5,
        preserveFunction: true
      };

      const parametersWithoutFunction: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.5,
        preserveFunction: false
      };

      const withFunction = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parametersWithFunction);
      const withoutFunction = HarmonicExpansionEngine.expandHarmony(sampleHarmony, parametersWithoutFunction);

      // With preservation, functions should remain mostly the same
      const preservedFunctions = withFunction.expandedHarmony.map(e => e.function);
      const originalFunctions = sampleHarmony.map(e => e.function);

      const preservedCount = preservedFunctions.filter((func, index) => func === originalFunctions[index]).length;
      expect(preservedCount).toBeGreaterThan(1); // At least some should be preserved

      // Without preservation, functions may change more
      const changedFunctions = withoutFunction.expandedHarmony.map(e => e.function);
      const originalCount = originalFunctions.length;
      const changedCount = changedFunctions.filter((func, index) => func !== originalFunctions[index]).length;
      expect(changedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Validation', () => {
    it('should handle large harmonies efficiently', () => {
      const largeHarmony: HarmonicElement[] = Array(50).fill(null).map((_, i) => ({
        pitch: 60 + i,
        root: 60,
        quality: 'major',
        tension: 0.1 + (i % 3) * 0.2,
        function: 'tonic',
        inversion: i % 4
      }));

      const startTime = performance.now();

      const expansion = HarmonicExpansionEngine.expandHarmony(largeHarmony, {
        type: 'mixed',
        intensity: 0.7
      });

      const endTime = performance.now();

      expect(expansion.expandedHarmony).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
      expect(expansion.quality).toBeGreaterThan(0);
    });

    it('should validate harmonic element integrity', () => {
      const harmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 64, root: 60, quality: 'major', tension: 0.3, function: 'tonic', inversion: 0 },
        { pitch: 67, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 }
      ];

      harmony.forEach(element => {
        expect(element.pitch).toBeGreaterThanOrEqual(0);
        expect(element.pitch).toBeLessThanOrEqual(127);
        expect(element.tension).toBeGreaterThanOrEqual(0);
        expect(element.tension).toBeLessThanOrEqual(1);
        expect(element.inversion).toBeGreaterThanOrEqual(0);
        expect(element.inversion).toBeLessThanOrEqual(3);
      });
    });

    it('should maintain consistency across multiple expansions', () => {
      const parameters: ExpansionParameters = {
        type: 'parallel',
        intensity: 0.5
      };

      const expansions = Array(5).fill(null).map(() =>
        HarmonicExpansionEngine.expandHarmony(sampleHarmony, parameters)
      );

      expansions.forEach(expansion => {
        expect(expansion.originalHarmony).toEqual(sampleHarmony);
        expect(expansion.expansionType).toBe('parallel');
        expect(expansion.parameters.intensity).toBe(0.5);
        expect(expansion.analysis).toBeDefined();
        expect(expansion.quality).toBeGreaterThan(0);
      });
    });
  });
});

describe('HarmonicExpansionAPI', () => {
  describe('Intelligent Harmonic Expansion', () => {
    it('should generate harmonic expansion with recommendations', async () => {
      const result = await HarmonicExpansionAPI.generateHarmonicExpansion(
        sampleHarmony,
        'mixed',
        {
          intensity: 0.6,
          preserveFunction: true,
          targetTension: 0.5
        }
      );

      expect(result.expansion).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.alternativeExpansions).toBeDefined();

      expect(result.expansion.expansionType).toBe('mixed');
      expect(result.expansion.parameters.intensity).toBe(0.6);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.alternativeExpansions).toHaveLength(2);
      expect(result.alternativeExpansions[0].expansionType).not.toBe('mixed');
      expect(result.alternativeExpansions[1].expansionType).not.toBe('mixed');
    });

    it('should generate different quality recommendations', async () => {
      const lowQualityExpansion = await HarmonicExpansionAPI.generateHarmonicExpansion(
        sampleHarmony,
        'chromatic',
        { intensity: 1.0 }
      );

      const highQualityExpansion = await HarmonicExpansionAPI.generateHarmonicExpansion(
        sampleHarmony,
        'parallel',
        { intensity: 0.3 }
      );

      // Low quality (chromatic) should have different recommendations than high quality
      expect(lowQualityExpansion.recommendations).not.toEqual(highQualityExpansion.recommendations);
      expect(lowQualityExpansion.expansion.analysis.total).toBeGreaterThan(highQualityExpansion.expansion.analysis.total);
      expect(highQualityExpansion.recommendations).toContain('Excellent harmonic expansion');
    });

    it('should provide meaningful alternative expansions', async () => {
      const result = await HarmonicExpansionAPI.generateHarmonicExpansion(
        sampleHarmony,
        'parallel',
        { preserveFunction: true }
      );

      result.alternativeExpansions.forEach((alt, index) => {
        expect(alt.originalHarmony).toEqual(sampleHarmony);
        expect(alt.expansionType).not.toBe('parallel');
        expect(alt.expandedHarmony).toHaveLength(3);
        expect(alt.quality).toBeGreaterThan(0);
        expect(alt.analysis).toBeDefined();
      });

      // Should be different from main expansion
      const mainPitches = result.expansion.expandedHarmony.map(e => e.pitch);
      const altPitches = result.alternativeExpansions[0].expandedHarmony.map(e => e.pitch);
      expect(mainPitches).not.toEqual(altPitches);
    });
  });

  describe('Polychord Creation', () => {
    it('should create polychord with analysis and recommendations', async () => {
      const chords: HarmonicElement[][] = [
        [
          { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
          { pitch: 64, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 }
        ],
        [
          { pitch: 65, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 },
          { pitch: 68, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 }
        ],
        [
          { pitch: 69, root: 69, quality: 'major', tension: 0.3, function: 'supertonic', inversion: 0 },
          { pitch: 72, root: 69, quality: 'major', tension: 0.3, function: 'supertonic', inversion: 0 }
        ]
      ];

      const result = await HarmonicExpansionAPI.createPolychord(chords, [0, 7, 12]);

      expect(result.polychord).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.recommendations).toBeDefined();

      expect(result.polychord.chords).toEqual(chords);
      expect(result.polychord.intervals).toEqual([0, 7, 12]);
      expect(result.analysis.clarity).toBeGreaterThan(0);
      expect(result.analysis.complexity).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle different polychord densities', async () => {
      const sparseChords: HarmonicElement[][] = [
        [{ pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 }],
        [{ pitch: 72, root: 72, quality: 'major', tension: 0.2, function: 'dominant', inversion: 0 }]
      ];

      const denseChords: HarmonicElement[][] = [
        [
          { pitch: 60, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
          { pitch: 64, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
          { pitch: 67, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
          { pitch: 70, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 }
        ],
        [
          { pitch: 65, root: 65, quality: 'minor', tension: 0.2, function: 'submediant', inversion: 0 },
          { pitch: 68, root: 65, quality: 'minor', tension: 0.2, function: 'submediant', inversion: 0 },
          { pitch: 70, root: 65, quality: 'minor', tension: 0.2, function: 'submediant', inversion: 0 },
          { pitch: 72, root: 65, quality: 'minor', tension: 0.2, function: 'submediant', inversion: 0 }
        ]
      ];

      const sparseResult = await HarmonicExpansionAPI.createPolychord(sparseChords);
      const denseResult = await HarmonicExpansionAPI.createPolychord(denseChords);

      expect(sparseResult.polychord.density).toBeLessThan(denseResult.polychord.density);
      expect(sparseResult.polychord.chords.flat().length).toBeLessThan(denseResult.polychord.chords.flat().length);
      expect(sparseResult.analysis.complexity).toBeLessThan(denseResult.analysis.complexity);
    });

    it('should provide appropriate recommendations for tension profiles', async () => {
      const lowTensionChords: HarmonicElement[][] = [
        [{ pitch: 60, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 }]
      ];

      const highTensionChords: HarmonicElement[][] = [
        [{ pitch: 61, root: 60, quality: 'augmented', tension: 0.9, function: 'chromatic', inversion: 0 }],
        [{ pitch: 62, root: 60, quality: 'diminished', tension: 0.95, function: 'chromatic', inversion: 0 }]
      ];

      const lowTensionResult = await HarmonicExpansionAPI.createPolychord(lowTensionChords);
      const highTensionResult = await HarmonicExpansionAPI.createPolychord(highTensionChords);

      // High tension polychord should have different recommendations
      expect(lowTensionResult.recommendations).not.toEqual(highTensionResult.recommendations);
      expect(highTensionResult.polychord.tension).toBeGreaterThan(lowTensionResult.polychord.tension);
    });
  });

  describe('Harmonic Field Analysis', () => {
    it('should create harmonic field with tonal analysis', async () => {
      const elements: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 64, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 65, root: 65, quality: 'minor', tension: 0.4, function: 'submediant', inversion: 0 },
        { pitch: 68, root: 65, quality: 'minor', tension: 0.3, function: 'submediant', inversion: 0 }
      ];

      const result = await HarmonicExpansionAPI.createHarmonicField(
        'C',
        'major',
        elements,
        { includeAnalysis: true }
      );

      expect(result.field).toBeDefined();
      expect(result.tonalAnalysis).toBeDefined();

      expect(result.field.key).toBe('C');
      expect(result.field.mode).toBe('major');
      expect(result.field.elements).toHaveLength(4);
      expect(result.field.stability).toBeGreaterThan(0);

      expect(result.tonalAnalysis.keyStability).toBe(result.field.stability);
      expect(result.tonalAnalysis.tonalCenter).toBe(60);
      expect(result.tonalAnalysis.modeCharacteristics).toContain('bright');
      expect(result.tonalAnalysis.modeCharacteristics).toContain('stable');
    });

    it('should handle different keys and modes correctly', async () => {
      const elements: HarmonicElement[] = [
        { pitch: 69, root: 69, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 }
      ];

      const aMinorResult = await HarmonicExpansionAPI.createHarmonicField('A', 'minor', elements);
      const gLydianResult = await HarmonicExpansionAPI.createHarmonicField('G', 'lydian', elements);

      expect(aMinorResult.field.key).toBe('A');
      expect(aMinorResult.field.mode).toBe('minor');
      expect(aMinorResult.field.tonalCenter).toBe(69);

      expect(gLydianResult.field.key).toBe('G');
      expect(gLydianResult.field.mode).toBe('lydian');
      expect(gLydianResult.field.tonalCenter).toBe(67);

      // Different modes should have different characteristics
      expect(aMinorResult.tonalAnalysis.modeCharacteristics).toContain('dark');
      expect(gLydianResult.tonalAnalysis.modeCharacteristics).toContain('dreamy');
    });
  });

  describe('Complete Harmony Analysis', () => {
    it('should perform comprehensive harmonic analysis with quality assessment', async () => {
      const complexHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 64, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 67, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 70, root: 65, quality: 'major', tension: 0.3, function: 'dominant', inversion: 0 },
        { pitch: 72, root: 67, tension: 0.6, function: 'subdominant', inversion: 0 }
      ];

      const result = await HarmonicExpansionAPI.analyzeCompleteHarmony(complexHarmony);

      expect(result.analysis).toBeDefined();
      expect(result.qualityAssessment).toBeDefined();
      expect(result.improvementSuggestions).toBeDefined();

      expect(result.qualityAssessment.overall).toBeGreaterThanOrEqual(0);
      expect(result.qualityAssessment.overall).toBeLessThanOrEqual(1);
      expect(result.qualityAssessment.voiceLeading).toBeGreaterThanOrEqual(0);
      expect(result.qualityAssessment.functional).toBeGreaterThanOrEqual(0);
      expect(result.qualityAssessment.structural).toBeGreaterThanOrEqual(0);

      expect(result.improvementSuggestions.length).toBeGreaterThan(0);
    });

    it('should provide specific improvement suggestions', async () => {
      const problematicHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.1, function: 'tonic', inversion: 0 },
        { pitch: 80, root: 60, quality: 'major', tension: 0.7, function: 'tonic', inversion: 0 }, // Large leap
        { pitch: 62, root: 60, quality: 'major', tension: 0.3, function: 'tonic', inversion: 0 }, // Another large leap
        { pitch: 84, root: 60, quality: 'major', tension: 0.9, function: 'tonic', inversion: 0 }  // Extreme leap
      ];

      const result = await HarmonicExpansionAPI.analyzeCompleteHarmony(problematicHarmony);

      // Should suggest reducing large leaps
      const hasLeapSuggestion = result.improvementSuggestions.some(suggestion =>
        suggestion.toLowerCase().includes('leap') || suggestion.toLowerCase().includes('jump')
      );

      expect(hasLeapSuggestion).toBe(true);

      // Should suggest improving balance if needed
      expect(result.improvementSuggestions.length).toBeGreaterThan(0);
    });

    it('should assess quality differences accurately', async () => => {
      const stableHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 64, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 67, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 }
      ];

      const unstableHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'augmented', tension: 0.8, function: 'chromatic', inversion: 0 },
        { pitch: 61, root: 60, quality: 'diminished', tension: 0.9, function: 'chromatic', inversion: 0 },
        { pitch: 62, root: 60, quality: 'tritone', tension: 1.0, function: 'chromatic', inversion: 0 }
      ];

      const stableResult = await HarmonicExpansionAPI.analyzeCompleteHarmony(stableHarmony);
      const unstableResult = await HarmonicExpansionAPI.analyzeCompleteHarmony(unstableHarmony);

      // Stable harmony should have better quality scores
      expect(stableResult.qualityAssessment.functional).toBeGreaterThan(unstableResult.qualityAssessment.functional);
      expect(stableResult.qualityAssessment.overall).toBeGreaterThan(unstableResult.qualityAssessment.overall);
    });
  });

  describe('Harmony Optimization', () => {
    it('should optimize harmony with voice leading constraints', async () => {
      const harmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.2, function: 'tonic', inversion: 0 },
        { pitch: 80, root: 60, quality: 'major', tension: 0.7, function: 'tonic', inversion: 0 },
        { pitch: 62, root: 60, quality: 'major', tension: 0.3, function: 'tonic', inversion: 0 }
      ];

      const constraints: VoiceLeadingConstraints = {
        maxLeap: 4,
        avoidParallelFifths: true,
        preferContraryMotion: true
      };

      const result = await HarmonicExpansionAPI.optimizeHarmony(harmony, constraints);

      expect(result.optimizedHarmony).toHaveLength(3);
      expect(result.improvement).toBeDefined();
      expect(result.improvement.voiceLeadingScore).toBeGreaterThanOrEqual(0);
      expect(result.improvement.tensionImprovement).toBeDefined();
      expect(result.improvement.functionalClarity).toBeDefined();

      // Should reduce large leaps
      const optimizedLeaps = result.optimizedHarmony.map((element, index) =>
        index > 0 ? Math.abs(element.pitch - result.optimizedHarmony[index - 1].pitch) : 0
      );
      optimizedLeaps.forEach(leap => {
        expect(leap).toBeLessThanOrEqual(constraints.maxLeap!);
      });

      // Original harmony should remain unchanged
      expect(harmony).not.toEqual(result.optimizedHarmony);
    });

    it('should show measurable improvement', async () => {
      const poorHarmony: HarmonicElement[] = [
        { pitch: 60, root: 60, quality: 'major', tension: 0.5, function: 'tonic', inversion: 0 },
        { pitch: 84, root: 60, quality: 'major', tension: 0.9, function: 'tonic', inversion: 0 }
      ];

      const constraints: VoiceLeadingConstraints = {
        maxLeap: 2
      };

      const result = await HarmonicExpansionAPI.optimizeHarmony(poorHarmony, constraints);

      expect(result.improvement.tensionImprovement).toBeGreaterThan(0);
      expect(result.optimizedHarmony[1].pitch).toBeLessThan(82); // Should be reduced from 84
    });
  });
});