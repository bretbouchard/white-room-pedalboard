/**
 * Shared Types for Multi-Graph IR Architecture
 *
 * These types are used across multiple IR definitions.
 */

/**
 * Musical time representation supporting bars/beats (musical) and seconds (absolute)
 */
export type MusicalTime = {
  bars?: number;
  beats?: number;
  seconds?: number;
};

/**
 * Time range with start and end points
 */
export type TimeRange = {
  start: MusicalTime;
  end: MusicalTime;
};

/**
 * Tempo change event at a specific time
 */
export type TempoChange = {
  time: MusicalTime;
  bpm: number;
};

/**
 * Time signature change event at a specific time
 */
export type TimeSignatureChange = {
  time: MusicalTime;
  numerator: number;
  denominator: number;
};

/**
 * Parameter value (can be number, boolean, or string)
 */
export type ParameterValue = number | boolean | string;

/**
 * Curve type for parameter transformations
 */
export type CurveIR =
  | { type: "linear" }
  | { type: "exponential"; factor: number }
  | { type: "logarithmic" }
  | { type: "sine" }
  | { type: "step"; steps: number };

/**
 * Clock type for timeline
 */
export type ClockType = "musical" | "seconds" | "hybrid";

/**
 * Pitch representation
 */
export type Pitch = {
  note: number; // MIDI note number (0-127)
  octave?: number; // Octave number (optional, can be derived from note)
  cents?: number; // Fine tuning in cents (optional, default 0)
};

/**
 * Musical role identifiers
 */
export type RoleId =
  | "melody"
  | "bass"
  | "harmony"
  | "rhythm"
  | "pad"
  | "lead"
  | "counterpoint"
  | "accompaniment";

/**
 * ID types for strong typing
 */
export type TimelineId = string;
export type SongId = string;
export type NamespaceId = string;
export type SectionId = string;
export type PatternIRId = string;
export type PatternId = string; // Alias for PatternIRId
export type ProcessId = string;
export type InstrumentId = string;
export type BusId = string;
export type SceneId = string;
export type ParameterAddress = string;
export type ControlId = string;
export type IntentId = string;
export type HumanIntentId = string;
export type GestureId = string;
export type ConstraintId = string;
export type VariationIntentId = string;
export type ExplainabilityId = string;
