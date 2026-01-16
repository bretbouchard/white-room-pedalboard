/**
 * ParameterMapper - Maps UI parameters to Schillinger systems
 *
 * Converts iPhone app UI parameters (60+ controls) into SchillingerSong objects
 * by mapping them to Book I-V systems.
 *
 * **Architecture:**
 * - UI Parameters → Schillinger Systems
 * - Converts slider values (0-1) to musical values
 * - Creates generators, systems, and bindings
 * - Builds complete SchillingerSong for realization
 *
 * Created by Claude on 2026-01-11.
 */

import {
  SchillingerSong_v1,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
  EnsembleModel,
  Generator,
  RatioTreeNode,
} from "../types";
import { SchillingerSong } from "../theory/schillinger-song";
import { generateUUID } from "../utils/uuid";

/**
 * UI Parameter State
 *
 * Matches the iPhone app's SchillingerParameterView bindings
 */
export interface UIParameterState {
  // Song Definition
  tempo: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  scale: string;
  rootNote: number;

  // Rhythm
  resultantType: string; // "resultant" | "interference" | "rhythmic_field" | "permutation"
  periodicityA: number;  // Generator A period (2-16)
  periodicityB: number;  // Generator B period (2-16)
  periodicityC: number;  // Generator C period (2-16, 0 = disabled)
  density: number;       // Attack density (0-1)
  complexity: number;    // Pattern complexity (0-1)
  rhythmicDensity: number;
  syncopation: number;

  // Melody
  melodyContour: number;
  intervalRange: number;
  stepLeaping: number;
  repetition: number;
  sequenceLength: number;

  // Harmony
  harmonyType: string;
  harmonicRhythm: number;
  chordDensity: number;
  voiceLeading: number;
  tension: number;

  // Structure
  sections: number;
  sectionLength: number;
  transitionType: string;
  development: number;

  // Orchestration
  register: number;
  texture: number;
  articulation: number;
  dynamics: number;
  timbre: number;
}

/**
 * Parameter Mapper
 *
 * Converts UI parameters to SchillingerSong
 */
export class ParameterMapper {

  /**
   * Convert UI parameters to SchillingerSong
   *
   * This is the main entry point for converting the iPhone app's
   * UI state into a SchillingerSong that can be realized.
   *
   * @param params - UI parameter state from iPhone app
   * @returns Complete SchillingerSong ready for realization
   */
  static toSchillingerSong(params: UIParameterState): SchillingerSong_v1 {
    // Generate system IDs for binding
    const rhythmSystemId = generateUUID();
    const melodySystemId = generateUUID();
    const harmonySystemId = generateUUID();
    const primaryRoleId = generateUUID();

    // Create individual systems
    const rhythmSystem = this.createRhythmSystem(params, rhythmSystemId);
    const melodySystem = this.createMelodySystem(params, melodySystemId, rhythmSystemId);
    const harmonySystem = this.createHarmonySystem(params, harmonySystemId, rhythmSystemId);
    const formSystem = this.createFormSystem(params);
    const orchestration = this.createOrchestration(params, primaryRoleId);
    const ensemble = this.createEnsemble(params, primaryRoleId);

    // Build SchillingerSong
    const songData: Omit<SchillingerSong_v1, "schemaVersion"> = {
      songId: generateUUID(),
      globals: {
        tempo: Math.round(params.tempo),
        timeSignature: [
          Math.round(params.timeSignatureNumerator),
          Math.round(params.timeSignatureDenominator)
        ],
        key: Math.round(params.rootNote)
      },
      bookI_rhythmSystems: [rhythmSystem],
      bookII_melodySystems: [melodySystem],
      bookIII_harmonySystems: [harmonySystem],
      bookIV_formSystem: formSystem,
      bookV_orchestration: orchestration,
      ensembleModel: ensemble,
      bindings: {
        roleRhythmBindings: [],
        roleMelodyBindings: [],
        roleHarmonyBindings: [],
        roleEnsembleBindings: []
      },
      constraints: [],
      provenance: {
        createdAt: new Date().toISOString(),
        createdBy: "ParameterMapper",
        modifiedAt: new Date().toISOString(),
        derivationChain: []
      }
    };

    return SchillingerSong.create(songData);
  }

  /**
   * Create Book I: Rhythm System
   *
   * Maps periodicity parameters to generators
   * Maps resultant type to selection method
   * Maps density to attack constraints
   */
  private static createRhythmSystem(params: UIParameterState, systemId: string): RhythmSystem {
    // Create generators from periodicity
    const generators: Generator[] = [
      {
        period: Math.round(params.periodicityA),
        phase: 0,
        weight: 1.0
      },
      {
        period: Math.round(params.periodicityB),
        phase: 0,
        weight: 1.0
      }
    ];

    // Add third generator if C > 0
    if (params.periodicityC > 0) {
      generators.push({
        period: Math.round(params.periodicityC),
        phase: 0,
        weight: 1.0
      });
    }

    // Map resultant type to selection method
    const resultantSelection = {
      method: params.resultantType === "resultant"
        ? "interference"
        : params.resultantType === "permutation"
        ? "modulo"
        : params.resultantType as any,
      targetPeriod: Math.round(params.periodicityA * params.periodicityB)
    };

    // Map density to attack constraints
    const minAttacks = Math.max(1, Math.round(4 * params.density)); // 1-4 per measure
    const maxAttacks = Math.round(16 * params.density); // Up to 16 per measure

    return {
      systemId,
      systemType: "rhythm",
      generators,
      resultantSelection,
      permutations: [],
      accentDisplacement: [],
      densityConstraints: {
        constraintId: generateUUID(),
        scope: "system",
        minAttacksPerMeasure: minAttacks,
        maxAttacksPerMeasure: maxAttacks
      },
      quantizationConstraint: {
        constraintId: generateUUID(),
        grid: 0.25, // 16th note quantization
        allowOffset: false
      }
    };
  }

  /**
   * Create Book II: Melody System
   *
   * Maps contour, interval range, step/leaping to melody generation
   */
  private static createMelodySystem(params: UIParameterState, systemId: string, rhythmBinding: string): MelodySystem {
    // Generate interval seed based on parameters
    const intervalSeed = this.generateIntervalSeed(
      params.melodyContour,
      params.stepLeaping,
      params.intervalRange
    );

    // Map contour to direction
    const contourType = params.melodyContour > 0.5 ? "ascending" : "descending";

    // Map register to pitch range
    const registerOffset = Math.round(params.register * 12); // 0-12 semitones
    const minPitch = 48 + registerOffset; // C3 + offset
    const maxPitch = 84 - registerOffset; // C6 - offset

    return {
      systemId,
      systemType: "melody",
      cycleLength: Math.round(params.sequenceLength),
      intervalSeed,
      registerConstraints: {
        constraintId: generateUUID(),
        allowTransposition: false,
        minPitch,
        maxPitch
      },
      rotationRule: {
        ruleId: generateUUID(),
        type: "cyclic",
        interval: 1
      },
      expansionRules: [],
      contractionRules: [],
      contourConstraints: {
        constraintId: generateUUID(),
        type: contourType as any,
        maxIntervalLeaps: 12
      },
      directionalBias: contourType === "ascending" ? 1 : -1,
      rhythmBinding
    };
  }

  /**
   * Generate interval seed for melody
   *
   * Creates a sequence of intervals based on contour, step/leap, and range
   */
  private static generateIntervalSeed(
    contour: number,
    stepLeaping: number,
    range: number
  ): number[] {
    const intervals: number[] = [];
    const steps = Math.round(8 * range); // 8 steps scaled by range

    for (let i = 0; i < steps; i++) {
      // Mix steps and leaps based on stepLeaping
      if (Math.random() < stepLeaping) {
        // Leap: larger interval (3rd-5th)
        const leap = contour > 0.5 ? 4 : -4;
        intervals.push(leap);
      } else {
        // Step: smaller interval (2nd)
        const step = contour > 0.5 ? 1 : -1;
        intervals.push(step);
      }
    }

    return intervals;
  }

  /**
   * Create Book III: Harmony System
   *
   * Maps harmony type, chord density, voice leading to harmony generation
   */
  private static createHarmonySystem(params: UIParameterState, systemId: string, harmonicRhythmBinding: string): HarmonySystem {
    // Map scale to distribution weights (diatonic emphasis)
    const distribution = this.mapScaleToDistribution(params.scale);

    // Map chord density to voice leading constraints
    const maxLeap = Math.round(12 * (1 - params.voiceLeading)); // Less voice leading = larger leaps

    return {
      systemId,
      systemType: "harmony",
      distribution,
      harmonicRhythmBinding,
      voiceLeadingConstraints: [
        {
          constraintId: generateUUID(),
          maxIntervalLeap: maxLeap,
          avoidParallels: params.tension > 0.7,
          preferredMotion: "similar"
        }
      ],
      resolutionRules: []
    };
  }

  /**
   * Map UI scale to distribution weights
   */
  private static mapScaleToDistribution(scale: string): number[] {
    // Return interval weights (intervals 1-12)
    // Diatonic major emphasizes intervals 2, 4, 5, 7, 9, 11
    const scaleMap: Record<string, number[]> = {
      "Major": [0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0], // Major scale intervals
      "Minor": [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0], // Natural minor
      "Pentatonic": [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0], // Pentatonic major
      "Blues": [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0], // Blues scale
      "Chromatic": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // All intervals equal
      "Dorian": [0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1],
      "Mixolydian": [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
    };

    return scaleMap[scale] || scaleMap["Major"];
  }

  /**
   * Create Book IV: Form System
   *
   * Maps sections and section length to form structure
   */
  private static createFormSystem(params: UIParameterState): FormSystem | null {
    const sectionCount = Math.round(params.sections);

    // Single section: no form system needed
    if (sectionCount <= 1) {
      return null;
    }

    // Create ratio tree as RatioTreeNode (hierarchical structure)
    const ratioTree: RatioTreeNode = {
      nodeId: generateUUID(),
      ratio: 1, // Root ratio
      children: Array.from(
        { length: sectionCount },
        () => ({
          nodeId: generateUUID(),
          ratio: Math.round(params.sectionLength),
        })
      ),
    };

    return {
      systemId: generateUUID(),
      systemType: "form",
      ratioTree,
      nestedPeriodicity: [],
      reuseRules: [],
      transformationReferences: [],
      sectionDefinitions: [],
      symmetryRules: [],
      cadenceConstraints: [],
      nestingDepth: sectionCount
    };
  }

  /**
   * Create Book V: Orchestration System
   *
   * Maps register, texture, articulation, dynamics, timbre
   */
  private static createOrchestration(params: UIParameterState, primaryRoleId: string): OrchestrationSystem {
    // Map register to pitch range
    const registerOffset = Math.round(params.register * 12);
    const minPitch = Math.max(24, 48 - registerOffset);
    const maxPitch = Math.min(96, 84 + registerOffset);

    return {
      systemId: generateUUID(),
      systemType: "orchestration",
      roles: [],
      registerSystem: {
        systemId: generateUUID(),
        roleRegisters: [
          {
            roleId: primaryRoleId,
            minPitch,
            maxPitch
          }
        ]
      },
      spacingSystem: {
        systemId: generateUUID(),
        minSpacing: [],
        maxSpacing: [],
        crossingRules: []
      },
      densitySystem: {
        systemId: generateUUID(),
        roleDensity: []
      },
      doublingRules: [],
      reinforcementRules: [],
      splitRules: [],
      mergeRules: [],
      formOrchestration: []
    };
  }

  /**
   * Create Ensemble Model
   *
   * Creates a simple single-voice ensemble for iPhone app
   */
  private static createEnsemble(params: UIParameterState, _primaryRoleId: string): EnsembleModel {
    // Map register to voice range
    const registerOffset = Math.round(params.register * 12);
    const minPitch = 48 + registerOffset;
    const maxPitch = 84 - registerOffset;

    // Generate voice ID (roleId comes from parameter)
    const voiceId = generateUUID();

    return {
      version: "1.0",
      id: generateUUID(),
      voices: [
        {
          id: voiceId,
          name: "Primary Voice",
          rolePools: [{ role: "primary" as const, functionalClass: "foundation" as const, enabled: true }],
          registerRange: {
            minPitch,
            maxPitch
          }
        }
      ],
      voiceCount: 1,
      groups: []
    };
  }
}

/**
 * Helper function for non-class usage
 *
 * Converts UI parameters to JSON string for JavaScriptCore
 */
export function mapParametersToSong(params: UIParameterState): string {
  const song = ParameterMapper.toSchillingerSong(params);
  return JSON.stringify(song);
}
