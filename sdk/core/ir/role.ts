/**
 * RoleIR - Musical Function Authority
 *
 * Defines a musical function independent of:
 * - instrument
 * - generator
 * - DSP
 * - UI
 *
 * Schillinger composes in roles, not instruments.
 * PatternIR references RoleIR, not InstrumentIR.
 * Instruments are assigned to roles, not vice versa.
 *
 * Responsibility:
 * - Defines musical function (melodic, harmonic, rhythmic, textural, structural)
 * - Specifies register constraints (min/max pitch)
 * - Authority weights for rhythmic/harmonic/intensity contribution
 * - Orchestration affinity preferences
 *
 * Rules:
 * - PatternIR references RoleIR, not InstrumentIR
 * - Instruments are assigned to roles, not vice versa
 * - RoleIR is stable across scenes and placements
 *
 * v1.0 - Initial release
 */

import type { Pitch, RoleId } from "./types";

/**
 * Musical function categories
 */
export type MusicalFunction =
  | "melodic"
  | "harmonic"
  | "rhythmic"
  | "textural"
  | "structural";

/**
 * Pitch range
 */
export interface PitchRange {
  min?: Pitch;
  max?: Pitch;
  preferred?: Pitch;
}

/**
 * Orchestration affinity preferences
 */
export interface OrchestrationAffinity {
  /**
   * Prefers solo vs ensemble
   */
  prefersSolo?: boolean;

  /**
   * Prefers unison vs independent voices
   */
  prefersUnison?: boolean;

  /**
   * Maximum number of voices for this role
   */
  maxVoices?: number;
}

/**
 * RoleIR v1.0 - Musical Function Authority
 */
export interface RoleIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Role identifier (unique within namespace)
   */
  id: RoleId;

  /**
   * Musical function category
   */
  function: MusicalFunction;

  /**
   * Register constraints and preferences
   */
  register: PitchRange;

  /**
   * Rhythmic authority (0-1)
   * How much this role contributes to rhythmic decisions
   */
  rhythmicAuthority: number;

  /**
   * Harmonic authority (0-1)
   * How much this role contributes to harmonic decisions
   */
  harmonicAuthority: number;

  /**
   * Intensity weight (0-1)
   * Contribution to perceived energy
   */
  intensityWeight: number;

  /**
   * Orchestration affinity preferences
   */
  orchestrationAffinity?: OrchestrationAffinity;
}
