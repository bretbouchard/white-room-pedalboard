/**
 * Comprehensive SongContract Tests
 *
 * Tests for SongContractV1 validation, serialization, and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  SongContractV1,
  validateSongContract,
  createMinimalSongContract,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
  Ensemble,
  Bindings,
  InstrumentType
} from '../song_contract.js';

describe('SongContractV1', () => {
  describe('Validation', () => {
    it('accepts valid minimal contract', () => {
      const contract = createMinimalSongContract();
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts valid contract with all optional fields', () => {
      const contract: SongContractV1 = {
        version: '1.0',
        id: 'test-contract-full',
        seed: 12345,

        rhythmSystems: [{
          id: 'rhythm-1',
          name: 'Test Rhythm',
          generators: [
            { period: 4, phaseOffset: 0, weight: 1.0 },
            { period: 6, phaseOffset: 0, weight: 1.0 }
          ],
          resultants: [{
            generatorIndex1: 0,
            generatorIndex2: 1,
            method: 'interference',
            weight: 1.0
          }],
          permutations: [],
          density: {
            minDensity: 0.3,
            maxDensity: 0.7,
            gridResolution: 0.25
          }
        }],

        melodySystems: [{
          id: 'melody-1',
          name: 'Test Melody',
          pitchCycle: { modulus: 12, rotation: 0 },
          intervalSeeds: [{
            intervals: [2, 2, 1, 2, 2, 2, 1],
            ordered: true
          }],
          contour: { direction: 'neutral', complexity: 0.5 },
          register: { minNote: 48, maxNote: 72 }
        }],

        harmonySystems: [{
          id: 'harmony-1',
          name: 'Test Harmony',
          distribution: {
            intervals: [1, 2, 4],
            weights: [0.5, 0.3, 0.2]
          },
          chordClasses: [{
            intervals: [0, 4, 7],
            inversions: [true, true, true]
          }],
          voiceLeading: {
            maxMovement: 5,
            preferredMovement: 2
          }
        }],

        formSystem: {
          id: 'form-1',
          name: 'Test Form',
          ratioTree: { ratios: [1, 1] },
          sections: [
            { id: 'section-1', name: 'A', ratioIndex: 0, durationBars: 8 },
            { id: 'section-2', name: 'B', ratioIndex: 1, durationBars: 8 }
          ],
          periodicity: []
        },

        orchestrationSystems: [{
          id: 'orch-1',
          name: 'Test Orchestration',
          roleAssignments: [{
            roleId: 'melody',
            voiceIds: ['voice-1']
          }],
          spacing: { type: 'close', parameters: {} },
          density: { weights: { melody: 1.0 } }
        }],

        ensemble: {
          voices: [{
            id: 'voice-1',
            name: 'Voice 1',
            role: 'melody'
          }]
        },

        bindings: {
          rhythmBindings: [{ roleId: 'melody', systemId: 'rhythm-1' }],
          melodyBindings: [{ roleId: 'melody', systemId: 'melody-1' }],
          harmonyBindings: [{ roleId: 'melody', systemId: 'harmony-1' }]
        },

        instrumentAssignments: [{
          roleId: 'melody',
          instrumentType: 'LocalGal',
          busId: 'bus-1'
        }],

        presetAssignments: [{
          instrumentType: 'LocalGal',
          presetId: 'piano-preset'
        }],

        console: {
          buses: [{
            id: 'bus-1',
            name: 'Bus 1',
            type: 'voice',
            gain: 1.0,
            pan: 0.0
          }]
        }
      };

      const result = validateSongContract(contract);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects contract with invalid version', () => {
      const contract = createMinimalSongContract({ version: '2.0' as any });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid version: 2.0');
    });

    it('rejects contract with missing ID', () => {
      const contract = createMinimalSongContract({ id: '' as any });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must have a valid ID');
    });

    it('rejects contract with negative seed', () => {
      const contract = createMinimalSongContract({ seed: -1 });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Seed must be between'))).toBe(true);
    });

    it('rejects contract with seed too large', () => {
      const contract = createMinimalSongContract({ seed: 2 ** 32 });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Seed must be between'))).toBe(true);
    });

    it('accepts maximum valid seed', () => {
      const contract = createMinimalSongContract({ seed: 2 ** 32 - 1 });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts minimum valid seed (0)', () => {
      const contract = createMinimalSongContract({ seed: 0 });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('rejects contract with no rhythm systems', () => {
      const contract = createMinimalSongContract();
      const emptyContract = { ...contract, rhythmSystems: [] };
      const result = validateSongContract(emptyContract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must have at least one rhythm system');
    });

    it('rejects contract with no melody systems', () => {
      const contract = createMinimalSongContract();
      const emptyContract = { ...contract, melodySystems: [] };
      const result = validateSongContract(emptyContract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must have at least one melody system');
    });

    it('rejects contract with no harmony systems', () => {
      const contract = createMinimalSongContract();
      const emptyContract = { ...contract, harmonySystems: [] };
      const result = validateSongContract(emptyContract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must have at least one harmony system');
    });

    it('rejects contract with no orchestration systems', () => {
      const contract = createMinimalSongContract();
      const emptyContract = { ...contract, orchestrationSystems: [] };
      const result = validateSongContract(emptyContract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must have at least one orchestration system');
    });

    it('rejects contract with empty ensemble', () => {
      const contract = createMinimalSongContract();
      const emptyContract = {
        ...contract,
        ensemble: { ...contract.ensemble, voices: [] }
      };
      const result = validateSongContract(emptyContract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must have at least one voice');
    });

    it('rejects contract with missing form system', () => {
      const contract = createMinimalSongContract();
      const invalidContract = {
        ...contract,
        formSystem: undefined as any
      };
      const result = validateSongContract(invalidContract);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('form system'))).toBe(true);
    });

    it('rejects contract with empty form sections', () => {
      const contract = createMinimalSongContract();
      const invalidContract = {
        ...contract,
        formSystem: { ...contract.formSystem, sections: [] }
      };
      const result = validateSongContract(invalidContract);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('form system'))).toBe(true);
    });
  });

  describe('Rhythm System Validation', () => {
    it('accepts rhythm system with multiple generators', () => {
      const system: RhythmSystem = {
        id: 'rhythm-multi',
        generators: [
          { period: 3, phaseOffset: 0, weight: 1.0 },
          { period: 4, phaseOffset: 0, weight: 1.0 },
          { period: 5, phaseOffset: 0, weight: 1.0 }
        ],
        resultants: [
          { generatorIndex1: 0, generatorIndex2: 1, method: 'interference' },
          { generatorIndex1: 1, generatorIndex2: 2, method: 'syncopation' }
        ],
        permutations: [
          { type: 'rotation', amount: 1 }
        ],
        density: {
          minDensity: 0.2,
          maxDensity: 0.8,
          gridResolution: 0.125
        }
      };

      const contract = createMinimalSongContract({ rhythmSystems: [system] });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts all resultant methods', () => {
      const methods: Array<'interference' | 'syncopation' | 'composite'> = [
        'interference',
        'syncopation',
        'composite'
      ];

      methods.forEach(method => {
        const system: RhythmSystem = {
          id: `rhythm-${method}`,
          generators: [
            { period: 4, phaseOffset: 0 },
            { period: 6, phaseOffset: 0 }
          ],
          resultants: [{
            generatorIndex1: 0,
            generatorIndex2: 1,
            method
          }],
          permutations: [],
          density: {
            minDensity: 0.5,
            maxDensity: 0.5,
            gridResolution: 0.25
          }
        };

        const contract = createMinimalSongContract({ rhythmSystems: [system] });
        const result = validateSongContract(contract);

        expect(result.valid).toBe(true);
      });
    });

    it('accepts all permutation types', () => {
      const types: Array<'rotation' | 'retrograde' | 'invert' | 'shuffle'> = [
        'rotation',
        'retrograde',
        'invert',
        'shuffle'
      ];

      types.forEach(type => {
        const system: RhythmSystem = {
          id: `rhythm-${type}`,
          generators: [{ period: 4, phaseOffset: 0 }],
          resultants: [],
          permutations: [{ type, amount: 1 }],
          density: {
            minDensity: 0.5,
            maxDensity: 0.5,
            gridResolution: 0.25
          }
        };

        const contract = createMinimalSongContract({ rhythmSystems: [system] });
        const result = validateSongContract(contract);

        expect(result.valid).toBe(true);
      });
    });

    it('accepts density at bounds', () => {
      const densities = [
        { min: 0.0, max: 0.0 },
        { min: 0.0, max: 1.0 },
        { min: 1.0, max: 1.0 }
      ];

      densities.forEach(({ min, max }) => {
        const system: RhythmSystem = {
          id: `rhythm-density-${min}-${max}`,
          generators: [{ period: 4, phaseOffset: 0 }],
          resultants: [],
          permutations: [],
          density: {
            minDensity: min,
            maxDensity: max,
            gridResolution: 0.25
          }
        };

        const contract = createMinimalSongContract({ rhythmSystems: [system] });
        const result = validateSongContract(contract);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Melody System Validation', () => {
    it('accepts diatonic scale (modulus 7)', () => {
      const system: MelodySystem = {
        id: 'melody-diatonic',
        pitchCycle: { modulus: 7, rotation: 0 },
        intervalSeeds: [{
          intervals: [2, 2, 1, 2, 2, 2, 1],
          ordered: true
        }],
        contour: { direction: 'ascending', complexity: 0.5 },
        register: { minNote: 48, maxNote: 72 }
      };

      const contract = createMinimalSongContract({ melodySystems: [system] });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts chromatic scale (modulus 12)', () => {
      const system: MelodySystem = {
        id: 'melody-chromatic',
        pitchCycle: { modulus: 12, rotation: 0 },
        intervalSeeds: [{
          intervals: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          ordered: true
        }],
        contour: { direction: 'neutral', complexity: 0.0 },
        register: { minNote: 0, maxNote: 127 }
      };

      const contract = createMinimalSongContract({ melodySystems: [system] });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts all contour directions', () => {
      const directions: Array<'ascending' | 'descending' | 'oscillating' | 'neutral'> = [
        'ascending',
        'descending',
        'oscillating',
        'neutral'
      ];

      directions.forEach(direction => {
        const system: MelodySystem = {
          id: `melody-${direction}`,
          pitchCycle: { modulus: 12, rotation: 0 },
          intervalSeeds: [{ intervals: [2, 2, 1], ordered: true }],
          contour: { direction, complexity: 0.5 },
          register: { minNote: 48, maxNote: 72 }
        };

        const contract = createMinimalSongContract({ melodySystems: [system] });
        const result = validateSongContract(contract);

        expect(result.valid).toBe(true);
      });
    });

    it('accepts contour complexity at bounds', () => {
      const complexities = [0.0, 0.5, 1.0];

      complexities.forEach(complexity => {
        const system: MelodySystem = {
          id: `melody-complexity-${complexity}`,
          pitchCycle: { modulus: 12, rotation: 0 },
          intervalSeeds: [{ intervals: [2, 2, 1], ordered: true }],
          contour: { direction: 'neutral', complexity },
          register: { minNote: 48, maxNote: 72 }
        };

        const contract = createMinimalSongContract({ melodySystems: [system] });
        const result = validateSongContract(contract);

        expect(result.valid).toBe(true);
      });
    });

    it('accepts full MIDI register range', () => {
      const system: MelodySystem = {
        id: 'melody-full-range',
        pitchCycle: { modulus: 12, rotation: 0 },
        intervalSeeds: [{ intervals: [2, 2, 1], ordered: true }],
        contour: { direction: 'neutral', complexity: 0.5 },
        register: { minNote: 0, maxNote: 127 }
      };

      const contract = createMinimalSongContract({ melodySystems: [system] });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });
  });

  describe('Harmony System Validation', () => {
    it('accepts major triad', () => {
      const system: HarmonySystem = {
        id: 'harmony-major',
        distribution: {
          intervals: [1, 2, 4],
          weights: [0.5, 0.3, 0.2]
        },
        chordClasses: [{
          intervals: [0, 4, 7],
          inversions: [true, true, true]
        }],
        voiceLeading: {
          maxMovement: 5,
          preferredMovement: 2
        }
      };

      const contract = createMinimalSongContract({ harmonySystems: [system] });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts minor seventh chord', () => {
      const system: HarmonySystem = {
        id: 'harmony-minor7',
        distribution: {
          intervals: [1],
          weights: [1.0]
        },
        chordClasses: [{
          intervals: [0, 3, 7, 10],
          inversions: [true, false, true, false]
        }],
        voiceLeading: {
          maxMovement: 3,
          preferredMovement: 1
        }
      };

      const contract = createMinimalSongContract({ harmonySystems: [system] });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts multiple chord classes', () => {
      const system: HarmonySystem = {
        id: 'harmony-multiple',
        distribution: {
          intervals: [1, 2],
          weights: [0.6, 0.4]
        },
        chordClasses: [
          { intervals: [0, 4, 7], inversions: [true, true, true] },
          { intervals: [0, 3, 7], inversions: [true, true, true] },
          { intervals: [0, 4, 7, 11], inversions: [true, true, true, true] }
        ],
        voiceLeading: {
          maxMovement: 5,
          preferredMovement: 2
        }
      };

      const contract = createMinimalSongContract({ harmonySystems: [system] });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });
  });

  describe('Form System Validation', () => {
    it('accepts binary form (A-B)', () => {
      const form: FormSystem = {
        id: 'form-binary',
        name: 'Binary Form',
        ratioTree: { ratios: [1, 1] },
        sections: [
          { id: 'section-a', name: 'A', ratioIndex: 0, durationBars: 8 },
          { id: 'section-b', name: 'B', ratioIndex: 1, durationBars: 8 }
        ],
        periodicity: []
      };

      const contract = createMinimalSongContract({ formSystem: form });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts ternary form (A-B-A)', () => {
      const form: FormSystem = {
        id: 'form-ternary',
        name: 'Ternary Form',
        ratioTree: { ratios: [1, 2, 1] },
        sections: [
          { id: 'section-a1', name: 'A', ratioIndex: 0, durationBars: 8 },
          { id: 'section-b', name: 'B', ratioIndex: 1, durationBars: 16 },
          { id: 'section-a2', name: 'A\'', ratioIndex: 2, durationBars: 8 }
        ],
        periodicity: []
      };

      const contract = createMinimalSongContract({ formSystem: form });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts rondo form (A-B-A-C-A)', () => {
      const form: FormSystem = {
        id: 'form-rondo',
        name: 'Rondo Form',
        ratioTree: { ratios: [2, 1, 2, 1, 2] },
        sections: [
          { id: 'section-a1', name: 'A', ratioIndex: 0 },
          { id: 'section-b', name: 'B', ratioIndex: 1 },
          { id: 'section-a2', name: 'A', ratioIndex: 2 },
          { id: 'section-c', name: 'C', ratioIndex: 3 },
          { id: 'section-a3', name: 'A', ratioIndex: 4 }
        ],
        periodicity: []
      };

      const contract = createMinimalSongContract({ formSystem: form });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts sections without explicit duration', () => {
      const form: FormSystem = {
        id: 'form-no-duration',
        name: 'Implicit Duration',
        ratioTree: { ratios: [1, 2, 1] },
        sections: [
          { id: 'section-1', name: 'A', ratioIndex: 0 },
          { id: 'section-2', name: 'B', ratioIndex: 1 },
          { id: 'section-3', name: 'A\'', ratioIndex: 2 }
        ],
        periodicity: []
      };

      const contract = createMinimalSongContract({ formSystem: form });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts periodicity layers', () => {
      const form: FormSystem = {
        id: 'form-periodicity',
        name: 'With Periodicity',
        ratioTree: { ratios: [1, 1] },
        sections: [
          { id: 'section-1', name: 'A', ratioIndex: 0 },
          { id: 'section-2', name: 'B', ratioIndex: 1 }
        ],
        periodicity: [
          { period: 4, amplitude: 0.8 },
          { period: 8, amplitude: 0.5 }
        ]
      };

      const contract = createMinimalSongContract({ formSystem: form });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });
  });

  describe('Orchestration System Validation', () => {
    it('accepts solo piano orchestration', () => {
      const orchestration: OrchestrationSystem = {
        id: 'orch-solo-piano',
        name: 'Solo Piano',
        roleAssignments: [{
          roleId: 'melody',
          voiceIds: ['piano-right']
        }],
        spacing: { type: 'close', parameters: { interval: 4 } },
        density: { weights: { melody: 1.0 } }
      };

      const contract = createMinimalSongContract({
        orchestrationSystems: [orchestration],
        ensemble: {
          voices: [
            { id: 'piano-right', name: 'Piano Right Hand', role: 'melody' }
          ]
        },
        bindings: {
          rhythmBindings: [{ roleId: 'melody', systemId: 'rhythm-1' }],
          melodyBindings: [{ roleId: 'melody', systemId: 'melody-1' }],
          harmonyBindings: [{ roleId: 'melody', systemId: 'harmony-1' }]
        }
      });

      const result = validateSongContract(contract);
      expect(result.valid).toBe(true);
    });

    it('accepts SATB choir orchestration', () => {
      const orchestration: OrchestrationSystem = {
        id: 'orch-satb',
        name: 'SATB Choir',
        roleAssignments: [
          { roleId: 'soprano', voiceIds: ['soprano'] },
          { roleId: 'alto', voiceIds: ['alto'] },
          { roleId: 'tenor', voiceIds: ['tenor'] },
          { roleId: 'bass', voiceIds: ['bass'] }
        ],
        spacing: { type: 'open', parameters: { interval: 5 } },
        density: {
          weights: { soprano: 1.0, alto: 0.9, tenor: 0.8, bass: 0.7 }
        }
      };

      const contract = createMinimalSongContract({
        orchestrationSystems: [orchestration],
        ensemble: {
          voices: [
            { id: 'soprano', name: 'Soprano', role: 'soprano' },
            { id: 'alto', name: 'Alto', role: 'alto' },
            { id: 'tenor', name: 'Tenor', role: 'tenor' },
            { id: 'bass', name: 'Bass', role: 'bass' }
          ]
        },
        bindings: {
          rhythmBindings: [
            { roleId: 'soprano', systemId: 'rhythm-1' },
            { roleId: 'alto', systemId: 'rhythm-1' },
            { roleId: 'tenor', systemId: 'rhythm-1' },
            { roleId: 'bass', systemId: 'rhythm-1' }
          ],
          melodyBindings: [
            { roleId: 'soprano', systemId: 'melody-1' },
            { roleId: 'alto', systemId: 'melody-1' },
            { roleId: 'tenor', systemId: 'melody-1' },
            { roleId: 'bass', systemId: 'melody-1' }
          ],
          harmonyBindings: [
            { roleId: 'soprano', systemId: 'harmony-1' },
            { roleId: 'alto', systemId: 'harmony-1' },
            { roleId: 'tenor', systemId: 'harmony-1' },
            { roleId: 'bass', systemId: 'harmony-1' }
          ]
        }
      });

      const result = validateSongContract(contract);
      expect(result.valid).toBe(true);
    });

    it('accepts all spacing types', () => {
      const spacingTypes: Array<'close' | 'open' | 'crossed' | 'cluster'> = [
        'close',
        'open',
        'crossed',
        'cluster'
      ];

      spacingTypes.forEach(type => {
        const orchestration: OrchestrationSystem = {
          id: `orch-${type}`,
          name: `${type} Spacing`,
          roleAssignments: [{
            roleId: 'melody',
            voiceIds: ['voice-1']
          }],
          spacing: { type, parameters: {} },
          density: { weights: { melody: 1.0 } }
        };

        const contract = createMinimalSongContract({
          orchestrationSystems: [orchestration]
        });

        const result = validateSongContract(contract);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Ensemble Validation', () => {
    it('accepts ensemble with voice groups', () => {
      const ensemble: Ensemble = {
        voices: [
          { id: 'v1', name: 'Voice 1', role: 'melody' },
          { id: 'v2', name: 'Voice 2', role: 'harmony' },
          { id: 'v3', name: 'Voice 3', role: 'harmony' }
        ],
        groups: [
          { id: 'harmony-group', name: 'Harmony Voices', voiceIds: ['v2', 'v3'] }
        ],
        balance: {
          priority: ['melody', 'harmony'],
          limits: { maxVoices: 8, maxPolyphony: 32 }
        }
      };

      const contract = createMinimalSongContract({ ensemble });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });

    it('accepts ensemble with register ranges', () => {
      const ensemble: Ensemble = {
        voices: [
          {
            id: 'bass',
            name: 'Bass',
            role: 'bass',
            registerRange: { minNote: 32, maxNote: 60 }
          },
          {
            id: 'melody',
            name: 'Melody',
            role: 'melody',
            registerRange: { minNote: 60, maxNote: 84 }
          }
        ]
      };

      const contract = createMinimalSongContract({ ensemble });
      const result = validateSongContract(contract);

      expect(result.valid).toBe(true);
    });
  });

  describe('Instrument Assignments', () => {
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
        const assignment = {
          roleId: 'melody',
          instrumentType: type,
          busId: 'bus-1'
        };

        const contract = createMinimalSongContract({
          instrumentAssignments: [assignment]
        });

        const result = validateSongContract(contract);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Console/Mixing', () => {
    it('accepts bus configuration with all bus types', () => {
      const contract = createMinimalSongContract({
        console: {
          buses: [
            { id: 'voice-1', name: 'Voice 1', type: 'voice', gain: 0.8, pan: -0.3 },
            { id: 'mix-1', name: 'Mix Bus 1', type: 'mix', gain: 1.0 },
            { id: 'master', name: 'Master', type: 'master', gain: 0.9, pan: 0.0 }
          ]
        }
      });

      const result = validateSongContract(contract);
      expect(result.valid).toBe(true);
    });

    it('accepts buses without optional parameters', () => {
      const contract = createMinimalSongContract({
        console: {
          buses: [
            { id: 'voice-1', name: 'Voice 1', type: 'voice' },
            { id: 'master', name: 'Master', type: 'master' }
          ]
        }
      });

      const result = validateSongContract(contract);
      expect(result.valid).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('serializes to JSON', () => {
      const contract = createMinimalSongContract();
      const json = JSON.stringify(contract);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json) as SongContractV1;
      expect(parsed.version).toBe('1.0');
      expect(parsed.id).toBe(contract.id);
      expect(parsed.seed).toBe(contract.seed);
    });

    it('deserializes from JSON', () => {
      const original = createMinimalSongContract();
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as SongContractV1;

      const result = validateSongContract(parsed);
      expect(result.valid).toBe(true);
    });

    it('preserves all fields through serialization', () => {
      const original: SongContractV1 = {
        version: '1.0',
        id: 'test-serialization',
        seed: 42,
        rhythmSystems: [{
          id: 'rhythm-1',
          name: 'Test Rhythm',
          generators: [{ period: 4, phaseOffset: 0, weight: 1.0 }],
          resultants: [],
          permutations: [],
          density: { minDensity: 0.5, maxDensity: 0.5, gridResolution: 0.25 }
        }],
        melodySystems: [{
          id: 'melody-1',
          name: 'Test Melody',
          pitchCycle: { modulus: 12, rotation: 0 },
          intervalSeeds: [{ intervals: [2, 2, 1], ordered: true }],
          contour: { direction: 'neutral', complexity: 0.5 },
          register: { minNote: 48, maxNote: 72 }
        }],
        harmonySystems: [{
          id: 'harmony-1',
          name: 'Test Harmony',
          distribution: { intervals: [1], weights: [1.0] },
          chordClasses: [{ intervals: [0, 4, 7], inversions: [true, true, true] }],
          voiceLeading: { maxMovement: 5, preferredMovement: 2 }
        }],
        formSystem: {
          id: 'form-1',
          ratioTree: { ratios: [1, 1] },
          sections: [
            { id: 'section-1', name: 'A', ratioIndex: 0, durationBars: 8 },
            { id: 'section-2', name: 'B', ratioIndex: 1, durationBars: 8 }
          ],
          periodicity: []
        },
        orchestrationSystems: [{
          id: 'orch-1',
          roleAssignments: [{ roleId: 'melody', voiceIds: ['voice-1'] }],
          spacing: { type: 'close', parameters: {} },
          density: { weights: { melody: 1.0 } }
        }],
        ensemble: { voices: [{ id: 'voice-1', name: 'Voice 1', role: 'melody' }] },
        bindings: {
          rhythmBindings: [{ roleId: 'melody', systemId: 'rhythm-1' }],
          melodyBindings: [{ roleId: 'melody', systemId: 'melody-1' }],
          harmonyBindings: [{ roleId: 'melody', systemId: 'harmony-1' }]
        },
        console: { buses: [] }
      };

      const json = JSON.stringify(original);
      const parsed = JSON.parse(json) as SongContractV1;

      expect(parsed).toEqual(original);
    });
  });

  describe('Factory Functions', () => {
    it('creates unique IDs for multiple contracts', async () => {
      const contract1 = createMinimalSongContract();

      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      const contract2 = createMinimalSongContract();

      expect(contract1.id).not.toBe(contract2.id);
    });

    it('accepts field overrides', () => {
      const contract = createMinimalSongContract({
        id: 'custom-id',
        seed: 999
      });

      expect(contract.id).toBe('custom-id');
      expect(contract.seed).toBe(999);
    });

    it('creates contract with all required fields', () => {
      const contract = createMinimalSongContract();

      expect(contract.version).toBe('1.0');
      expect(contract.id).toBeDefined();
      expect(contract.seed).toBeDefined();
      expect(contract.rhythmSystems.length).toBeGreaterThan(0);
      expect(contract.melodySystems.length).toBeGreaterThan(0);
      expect(contract.harmonySystems.length).toBeGreaterThan(0);
      expect(contract.formSystem).toBeDefined();
      expect(contract.orchestrationSystems.length).toBeGreaterThan(0);
      expect(contract.ensemble.voices.length).toBeGreaterThan(0);
      expect(contract.bindings).toBeDefined();
      expect(contract.console).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles contract with maximum complexity', () => {
      const contract: SongContractV1 = {
        version: '1.0',
        id: 'max-complexity',
        seed: 2 ** 32 - 1,

        rhythmSystems: Array.from({ length: 10 }, (_, i) => ({
          id: `rhythm-${i}`,
          generators: Array.from({ length: 8 }, (_, j) => ({
            period: (j + 1) * 2,
            phaseOffset: j,
            weight: Math.random()
          })),
          resultants: Array.from({ length: 20 }, (_, k) => ({
            generatorIndex1: k % 8,
            generatorIndex2: (k + 1) % 8,
            method: ['interference', 'syncopation', 'composite'][k % 3] as any
          })),
          permutations: Array.from({ length: 5 }, () => ({
            type: ['rotation', 'retrograde', 'invert', 'shuffle'][Math.floor(Math.random() * 4)] as any,
            amount: Math.floor(Math.random() * 4)
          })),
          density: {
            minDensity: Math.random(),
            maxDensity: Math.random(),
            gridResolution: 0.125
          }
        })),

        melodySystems: Array.from({ length: 10 }, (_, i) => ({
          id: `melody-${i}`,
          pitchCycle: { modulus: 12, rotation: i },
          intervalSeeds: Array.from({ length: 5 }, () => ({
            intervals: [2, 2, 1, 2, 2, 2, 1],
            ordered: true
          })),
          contour: {
            direction: ['ascending', 'descending', 'oscillating', 'neutral'][i % 4] as any,
            complexity: Math.random()
          },
          register: { minNote: 0, maxNote: 127 }
        })),

        harmonySystems: Array.from({ length: 10 }, (_, i) => ({
          id: `harmony-${i}`,
          distribution: {
            intervals: Array.from({ length: 5 }, () => Math.floor(Math.random() * 8) + 1),
            weights: Array.from({ length: 5 }, () => Math.random())
          },
          chordClasses: Array.from({ length: 10 }, () => ({
            intervals: [0, 3, 7],
            inversions: [true, true, true]
          })),
          voiceLeading: { maxMovement: 5, preferredMovement: 2 }
        })),

        formSystem: {
          id: 'form-complex',
          ratioTree: { ratios: [1, 2, 3, 5, 8, 13] },
          sections: Array.from({ length: 20 }, (_, i) => ({
            id: `section-${i}`,
            name: `Section ${i}`,
            ratioIndex: i % 6,
            durationBars: (i + 1) * 4
          })),
          periodicity: Array.from({ length: 5 }, (_, i) => ({
            period: (i + 1) * 4,
            amplitude: 1.0 - (i * 0.2)
          }))
        },

        orchestrationSystems: Array.from({ length: 10 }, (_, i) => ({
          id: `orch-${i}`,
          roleAssignments: Array.from({ length: 4 }, (_, j) => ({
            roleId: `role-${j}`,
            voiceIds: [`voice-${j}`]
          })),
          spacing: {
            type: ['close', 'open', 'crossed', 'cluster'][i % 4] as any,
            parameters: { interval: i }
          },
          density: {
            weights: Object.fromEntries(
              Array.from({ length: 4 }, (_, j) => [`role-${j}`, Math.random()])
            )
          }
        })),

        ensemble: {
          voices: Array.from({ length: 16 }, (_, i) => ({
            id: `voice-${i}`,
            name: `Voice ${i}`,
            role: `role-${i % 4}`
          })),
          groups: Array.from({ length: 4 }, (_, i) => ({
            id: `group-${i}`,
            name: `Group ${i}`,
            voiceIds: [`voice-${i}`, `voice-${i + 4}`]
          })),
          balance: {
            priority: ['role-0', 'role-1', 'role-2', 'role-3'],
            limits: { maxVoices: 16, maxPolyphony: 64 }
          }
        },

        bindings: {
          rhythmBindings: Array.from({ length: 4 }, (_, i) => ({
            roleId: `role-${i}`,
            systemId: `rhythm-${i}`
          })),
          melodyBindings: Array.from({ length: 4 }, (_, i) => ({
            roleId: `role-${i}`,
            systemId: `melody-${i}`
          })),
          harmonyBindings: Array.from({ length: 4 }, (_, i) => ({
            roleId: `role-${i}`,
            systemId: `harmony-${i}`
          }))
        },

        instrumentAssignments: Array.from({ length: 4 }, (_, i) => ({
          roleId: `role-${i}`,
          instrumentType: ['LocalGal', 'KaneMarco', 'NexSynth', 'SamSampler'][i] as InstrumentType,
          busId: `bus-${i}`
        })),

        presetAssignments: Array.from({ length: 4 }, (_, i) => ({
          instrumentType: ['LocalGal', 'KaneMarco', 'NexSynth', 'SamSampler'][i] as InstrumentType,
          presetId: `preset-${i}`
        })),

        console: {
          buses: Array.from({ length: 8 }, (_, i) => ({
            id: `bus-${i}`,
            name: `Bus ${i}`,
            type: ['voice', 'mix', 'master'][i % 3] as any,
            gain: Math.random(),
            pan: (Math.random() * 2) - 1
          }))
        }
      };

      const result = validateSongContract(contract);
      expect(result.valid).toBe(true);
    });

    it('handles contract with minimum valid values', () => {
      const contract = createMinimalSongContract({
        seed: 0,
        rhythmSystems: [{
          id: 'rhythm-min',
          generators: [{ period: 1, phaseOffset: 0 }],
          resultants: [],
          permutations: [],
          density: { minDensity: 0, maxDensity: 0, gridResolution: 1 }
        }],
        melodySystems: [{
          id: 'melody-min',
          pitchCycle: { modulus: 1, rotation: 0 },
          intervalSeeds: [{ intervals: [0], ordered: true }],
          contour: { direction: 'neutral', complexity: 0 },
          register: { minNote: 0, maxNote: 0 }
        }]
      });

      const result = validateSongContract(contract);
      expect(result.valid).toBe(true);
    });
  });
});
