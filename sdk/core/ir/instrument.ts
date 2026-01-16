/**
 * InstrumentIR — Sound Sources & Processors
 *
 * Responsibility: Declares what instruments or effects exist
 *
 * Rules:
 * - InstrumentIR is declarative
 * - No automation curves here
 * - No routing here
 */

import type { InstrumentId, RoleId, ParameterValue } from "./types";

/**
 * Instrument kinds
 */
export type InstrumentKind = "synth" | "sampler" | "effect";

/**
 * Instrument capability flags
 */
export interface InstrumentCapabilities {
  /**
   * Maximum polyphonic voices
   * undefined = unlimited or mono
   */
  polyphony?: number;

  /**
   * Supports MPE (MIDI Polyphonic Expression)
   */
  supportsMPE?: boolean;

  /**
   * Available modulation inputs
   * e.g., ['modwheel', 'pitch', 'aftertouch']
   */
  modulationInputs?: string[];
}

/**
 * InstrumentIR_v1 - Instrument or effect declaration
 *
 * InstrumentIR declares what instruments or effects exist in a SongGraph.
 * It is purely declarative - no automation or routing here.
 */
export interface InstrumentIR_v1 {
  version: "1.0";

  /**
   * Unique identifier for this instrument
   */
  id: InstrumentId;

  /**
   * Musical role this instrument fulfills
   */
  role: RoleId;

  /**
   * Type of instrument
   */
  kind: InstrumentKind;

  /**
   * Model name
   * e.g., 'AnalogPoly', 'FM6', 'ReverbPlate', 'Sampler'
   */
  model: string;

  /**
   * Initial parameter values
   * e.g., { oscillator: 'saw', filterCutoff: 2000, resonance: 0.7 }
   */
  parameters: Record<string, ParameterValue>;

  /**
   * Optional capability declarations
   */
  capabilities?: InstrumentCapabilities;
}
