/**
 * SongContract - Theory layer contract for song generation
 *
 * SongContract is the SDK's simplified theory contract that represents
 * the Schillinger systems and parameters for song generation.
 *
 * This is a streamlined version of SchillingerSong_v1 optimized for:
 * - SDK public API
 * - JSON serialization
 * - Cross-language compatibility (TypeScript, Swift, C++)
 * - Simplified validation
 *
 * Data flow:
 * User creates SongContract → deriveSongState() → SongState (executable)
 * SongState + PerformanceConfiguration → RenderedSongGraph (audio-ready)
 */

// =============================================================================
// SongContract V1
// =============================================================================

/**
 * SongContractV1 - Theory contract for song generation
 *
 * Contains all Schillinger systems and parameters needed to derive
 * a complete SongState. This is the pure theory representation with
 * no notes or audio rendering details.
 */
export interface SongContractV1 {
  readonly version: '1.0';
  readonly id: string;
  readonly seed: number; // PRNG seed for reproducibility (0 to 2^32-1)

  // Book I: Rhythm Systems
  readonly rhythmSystems: readonly RhythmSystem[];

  // Book II: Melody Systems
  readonly melodySystems: readonly MelodySystem[];

  // Book III: Harmony Systems
  readonly harmonySystems: readonly HarmonySystem[];

  // Book IV: Form System
  readonly formSystem: FormSystem;

  // Book V: Orchestration Systems
  readonly orchestrationSystems: readonly OrchestrationSystem[];

  // Ensemble & Bindings
  readonly ensemble: Ensemble;
  readonly bindings: Bindings;

  // Instrument Assignments (optional, for PerformanceConfiguration)
  readonly instrumentAssignments?: readonly InstrumentAssignment[];
  readonly presetAssignments?: readonly PresetAssignment[];

  // Console/Mixing (optional, for PerformanceConfiguration)
  readonly console: Console;
}

// =============================================================================
// Book I - Rhythm
// =============================================================================

/**
 * Rhythm System (Book I)
 *
 * Defines rhythmic patterns using Schillinger's resultant rhythm theory.
 */
export interface RhythmSystem {
  readonly id: string;
  readonly name?: string;

  // Generators (interference patterns)
  readonly generators: readonly Generator[];

  // Resultants (interference of generators)
  readonly resultants: readonly Resultant[];

  // Permutations (rhythmic transformations)
  readonly permutations: readonly Permutation[];

  // Density control
  readonly density: Density;
}

export interface Generator {
  readonly period: number; // >= 1
  readonly phaseOffset: number; // >= 0
  readonly weight?: number; // Optional weight for resultant calculation
}

export interface Resultant {
  readonly generatorIndex1: number; // Index into generators array
  readonly generatorIndex2: number; // Index into generators array
  readonly method: 'interference' | 'syncopation' | 'composite';
  readonly weight?: number;
}

export interface Permutation {
  readonly type: 'rotation' | 'retrograde' | 'invert' | 'shuffle';
  readonly amount: number; // Number of steps to rotate, etc.
}

export interface Density {
  readonly minDensity: number; // 0-1
  readonly maxDensity: number; // 0-1
  readonly gridResolution: number; // Beat fraction (e.g., 0.25 = 16th notes)
}

// =============================================================================
// Book II - Melody
// =============================================================================

/**
 * Melody System (Book II)
 *
 * Defines pitch generation using Schillinger's pitch cycles and interval seeds.
 */
export interface MelodySystem {
  readonly id: string;
  readonly name?: string;

  // Pitch cycle (scale construction)
  readonly pitchCycle: PitchCycle;

  // Interval seeds (melodic patterns)
  readonly intervalSeeds: readonly IntervalSeed[];

  // Contour (shape of melody)
  readonly contour: Contour;

  // Register (pitch range)
  readonly register: Register;
}

export interface PitchCycle {
  readonly modulus: number; // 12 for chromatic, 7 for diatonic, etc.
  readonly rotation: number; // Starting position in cycle
}

export interface IntervalSeed {
  readonly intervals: readonly number[]; // Interval pattern (e.g., [2,2,1,2,2,2,1] for major)
  readonly ordered?: boolean; // True = scale, False = interval set
}

export interface Contour {
  readonly direction: 'ascending' | 'descending' | 'oscillating' | 'neutral';
  readonly complexity: number; // 0-1, how much variation
}

export interface Register {
  readonly minNote: number; // MIDI note (0-127)
  readonly maxNote: number; // MIDI note (0-127)
}

// =============================================================================
// Book III - Harmony
// =============================================================================

/**
 * Harmony System (Book III)
 *
 * Defines harmonic progression and voice leading using Schillinger's theory.
 */
export interface HarmonySystem {
  readonly id: string;
  readonly name?: string;

  // Distribution (harmonic rhythm)
  readonly distribution: Distribution;

  // Chord classes (harmonic vocabulary)
  readonly chordClasses: readonly ChordClass[];

  // Voice leading
  readonly voiceLeading: VoiceLeading;
}

export interface Distribution {
  readonly intervals: readonly number[]; // Time intervals between chord changes
  readonly weights: readonly number[]; // Probability weights for each interval
}

export interface ChordClass {
  readonly intervals: readonly number[]; // Interval pattern above root
  readonly inversions: readonly boolean[]; // Which inversions are allowed
}

export interface VoiceLeading {
  readonly maxMovement: number; // Maximum semitones between voices
  readonly preferredMovement: number; // Preferred interval for voice leading
}

// =============================================================================
// Book IV - Form
// =============================================================================

/**
 * Form System (Book IV)
 *
 * Defines song structure using Schillinger's ratio theory.
 */
export interface FormSystem {
  readonly id: string;
  readonly name?: string;

  // Ratio tree (harchical time structure)
  readonly ratioTree: RatioTree;

  // Sections (temporal form)
  readonly sections: readonly Section[];

  // Periodicity layers
  readonly periodicity: readonly PeriodicityLayer[];
}

export interface RatioTree {
  readonly ratios: readonly number[]; // Fibonacci, golden section, etc.
}

export interface Section {
  readonly id: string;
  readonly name: string;
  readonly ratioIndex: number; // Index into ratioTree
  readonly durationBars?: number; // Optional explicit duration
}

export interface PeriodicityLayer {
  readonly period: number; // Beats
  readonly amplitude: number; // Strength of periodicity
}

// =============================================================================
// Book V - Orchestration
// =============================================================================

/**
 * Orchestration System (Book V)
 *
 * Defines voice assignments and orchestration strategies.
 */
export interface OrchestrationSystem {
  readonly id: string;
  readonly name?: string;

  // Role assignments (which voices play which roles)
  readonly roleAssignments: readonly RoleAssignment[];

  // Spacing (voice spacing strategy)
  readonly spacing: Spacing;

  // Density (note density per voice)
  readonly density: OrchestrationDensity;
}

export interface RoleAssignment {
  readonly roleId: string;
  readonly voiceIds: readonly string[];
}

export interface Spacing {
  readonly type: 'close' | 'open' | 'crossed' | 'cluster';
  readonly parameters: Record<string, number>;
}

export interface OrchestrationDensity {
  readonly weights: Record<string, number>; // Role -> density weight
}

// =============================================================================
// Ensemble
// =============================================================================

/**
 * Ensemble - Voice configuration
 *
 * Defines available voices and their properties.
 */
export interface Ensemble {
  readonly voices: readonly Voice[];
  readonly groups?: readonly VoiceGroup[];
  readonly balance?: BalanceRules;
}

export interface Voice {
  readonly id: string;
  readonly name: string;
  readonly role: string; // Primary role (e.g., 'melody', 'bass', 'harmony')
  readonly registerRange?: Register;
}

export interface VoiceGroup {
  readonly id: string;
  readonly name: string;
  readonly voiceIds: readonly string[];
}

export interface BalanceRules {
  readonly priority?: readonly string[];
  readonly limits?: {
    readonly maxVoices: number;
    readonly maxPolyphony: number;
  };
}

// =============================================================================
// Bindings
// =============================================================================

/**
 * Bindings - Connect roles to systems
 *
 * Defines which Schillinger systems apply to which roles/voices.
 */
export interface Bindings {
  readonly rhythmBindings: readonly RhythmBinding[];
  readonly melodyBindings: readonly MelodyBinding[];
  readonly harmonyBindings: readonly HarmonyBinding[];
}

export interface RhythmBinding {
  readonly roleId: string;
  readonly systemId: string;
}

export interface MelodyBinding {
  readonly roleId: string;
  readonly systemId: string;
}

export interface HarmonyBinding {
  readonly roleId: string;
  readonly systemId: string;
}

// =============================================================================
// Instrument Assignments (for PerformanceConfiguration)
// =============================================================================

/**
 * Instrument Assignment
 *
 * Maps voices to instruments (optional, for performance configuration).
 */
export interface InstrumentAssignment {
  readonly roleId: string;
  readonly instrumentType: InstrumentType;
  readonly busId: string;
}

export type InstrumentType =
  | 'LocalGal'
  | 'KaneMarco'
  | 'KaneMarcoAether'
  | 'KaneMarcoAetherString'
  | 'NexSynth'
  | 'SamSampler'
  | 'DrumMachine';

/**
 * Preset Assignment
 *
 * Maps instrument types to presets.
 */
export interface PresetAssignment {
  readonly instrumentType: InstrumentType;
  readonly presetId: string;
}

// =============================================================================
// Console/Mixing (for PerformanceConfiguration)
// =============================================================================

/**
 * Console - Mixing configuration
 *
 * Defines console buses and effects (optional, for performance configuration).
 */
export interface Console {
  readonly buses: readonly Bus[];
}

export interface Bus {
  readonly id: string;
  readonly name: string;
  readonly type: 'voice' | 'mix' | 'master';
  readonly gain?: number;
  readonly pan?: number;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate SongContractV1
 *
 * @param contract - Contract to validate
 * @returns Validation result with errors
 */
export function validateSongContract(contract: SongContractV1): {
  valid: boolean;
  errors: readonly string[];
} {
  const errors: string[] = [];

  // Version check
  if (contract.version !== '1.0') {
    errors.push(`Invalid version: ${contract.version}`);
  }

  // ID check
  if (!contract.id || typeof contract.id !== 'string') {
    errors.push('Contract must have a valid ID');
  }

  // Seed check
  if (typeof contract.seed !== 'number' || contract.seed < 0 || contract.seed > 2 ** 32 - 1) {
    errors.push(`Seed must be between 0 and ${2 ** 32 - 1}`);
  }

  // Rhythm systems check
  if (!contract.rhythmSystems || contract.rhythmSystems.length === 0) {
    errors.push('Contract must have at least one rhythm system');
  }

  // Melody systems check
  if (!contract.melodySystems || contract.melodySystems.length === 0) {
    errors.push('Contract must have at least one melody system');
  }

  // Harmony systems check
  if (!contract.harmonySystems || contract.harmonySystems.length === 0) {
    errors.push('Contract must have at least one harmony system');
  }

  // Form system check
  if (!contract.formSystem || !contract.formSystem.sections || contract.formSystem.sections.length === 0) {
    errors.push('Contract must have form system with at least one section');
  }

  // Orchestration systems check
  if (!contract.orchestrationSystems || contract.orchestrationSystems.length === 0) {
    errors.push('Contract must have at least one orchestration system');
  }

  // Ensemble check
  if (!contract.ensemble || !contract.ensemble.voices || contract.ensemble.voices.length === 0) {
    errors.push('Contract must have at least one voice');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a minimal valid SongContract for testing
 *
 * @param overrides - Optional field overrides
 * @returns Minimal SongContractV1
 */
export function createMinimalSongContract(
  overrides: Partial<SongContractV1> = {}
): SongContractV1 {
  return {
    version: '1.0',
    id: `contract-${Date.now()}`,
    seed: 42,

    rhythmSystems: [
      {
        id: 'rhythm-1',
        name: 'Basic Rhythm',
        generators: [
          { period: 4, phaseOffset: 0, weight: 1.0 },
          { period: 6, phaseOffset: 0, weight: 1.0 }
        ],
        resultants: [
          {
            generatorIndex1: 0,
            generatorIndex2: 1,
            method: 'interference'
          }
        ],
        permutations: [],
        density: {
          minDensity: 0.3,
          maxDensity: 0.7,
          gridResolution: 0.25
        }
      }
    ],

    melodySystems: [
      {
        id: 'melody-1',
        name: 'Basic Melody',
        pitchCycle: {
          modulus: 12,
          rotation: 0
        },
        intervalSeeds: [
          {
            intervals: [2, 2, 1, 2, 2, 2, 1],
            ordered: true
          }
        ],
        contour: {
          direction: 'neutral',
          complexity: 0.5
        },
        register: {
          minNote: 48,
          maxNote: 72
        }
      }
    ],

    harmonySystems: [
      {
        id: 'harmony-1',
        name: 'Basic Harmony',
        distribution: {
          intervals: [1, 2, 4],
          weights: [0.5, 0.3, 0.2]
        },
        chordClasses: [
          {
            intervals: [0, 4, 7], // Major triad
            inversions: [true, true, true]
          }
        ],
        voiceLeading: {
          maxMovement: 5,
          preferredMovement: 2
        }
      }
    ],

    formSystem: {
      id: 'form-1',
      name: 'Binary Form',
      ratioTree: {
        ratios: [1, 1]
      },
      sections: [
        { id: 'section-1', name: 'A', ratioIndex: 0, durationBars: 8 },
        { id: 'section-2', name: 'B', ratioIndex: 1, durationBars: 8 }
      ],
      periodicity: []
    },

    orchestrationSystems: [
      {
        id: 'orch-1',
        name: 'Basic Orchestration',
        roleAssignments: [
          {
            roleId: 'melody',
            voiceIds: ['voice-1']
          }
        ],
        spacing: {
          type: 'close',
          parameters: {}
        },
        density: {
          weights: {
            melody: 1.0
          }
        }
      }
    ],

    ensemble: {
      voices: [
        {
          id: 'voice-1',
          name: 'Voice 1',
          role: 'melody'
        }
      ]
    },

    bindings: {
      rhythmBindings: [
        { roleId: 'melody', systemId: 'rhythm-1' }
      ],
      melodyBindings: [
        { roleId: 'melody', systemId: 'melody-1' }
      ],
      harmonyBindings: [
        { roleId: 'melody', systemId: 'harmony-1' }
      ]
    },

    console: {
      buses: []
    },

    ...overrides
  };
}
