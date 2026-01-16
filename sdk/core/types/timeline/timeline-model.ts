/**
 * TimelineModel - Multi-Song Timeline IR
 *
 * This module defines the TimelineModel, which represents a timeline containing
 * multiple song instances sharing a single global transport. This is the LLVM-style
 * "linker" layer where multiple SongModels are evaluated against a unified timeline.
 *
 * ARCHITECTURAL RULES:
 * - TimelineModel owns transport (tempo, time signature, loops)
 * - SongModels remain immutable (no modifications)
 * - SongInstances do not own time (they reference TimelineModel's time)
 * - No song-to-song direct mutation (only through InteractionRules)
 *
 * Part of: LLVM-Style Core Architecture
 * See: SDK_HANDOFF_ADDENDUM_LLVM_TIMELINE.md
 */

import type { MusicalTime } from "../../ir";
import type { SongModel_v1, SongModel_v2 } from "@schillinger-sdk/shared";

// Re-export SongModel types for convenience
export type { SongModel_v1, SongModel_v2 } from "@schillinger-sdk/shared";

/**
 * Union type for SongModel in SongInstance
 * Supports both v1 (legacy) and v2 (architecture compliant)
 */
export type SongModel = SongModel_v1 | SongModel_v2;

/**
 * TimelineModel - Multi-song timeline with global transport
 *
 * Represents a timeline where multiple songs can be instantiated, arranged,
 * and evaluated against a shared transport. This is the execution context
 * for musical content.
 */
export interface TimelineModel {
  /** Version identifier for serialization/deserialization */
  version: "1.0";

  /** Unique timeline identifier */
  id: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  updatedAt: number;

  /**
   * Global transport configuration
   * Shared by all song instances on this timeline
   */
  transport: TimelineTransportConfig;

  /**
   * Song instances on this timeline
   * Each instance references an immutable SongModel with its own configuration
   */
  songInstances: SongInstance[];

  /**
   * Interaction rules between songs
   * Songs never talk directly - they interact through declared rules
   */
  interactionRules: InteractionRule[];

  /** Timeline metadata */
  metadata?: TimelineMetadata;
}

/**
 * Transport Configuration - Global timing and loop settings
 *
 * IMPORTANT: This is NOT about playback controls (play/stop/seek).
 * It's about the musical structure of time on the timeline.
 *
 * NO playbackSpeed - that's a playback concern, not a musical structure concern.
 */
export interface TimelineTransportConfig {
  /** Tempo changes over time */
  tempoMap: TimelineTempoEvent[];

  /** Time signature changes over time */
  timeSignatureMap: TimelineTimeSignatureEvent[];

  /** Loop configuration */
  loopPolicy: TimelineLoopPolicy;
}

/**
 * Tempo Event - Tempo change at a specific time
 */
export interface TimelineTempoEvent {
  /** Time position of tempo change */
  time: MusicalTime;

  /** Tempo in BPM (beats per minute) */
  tempo: number;
}

/**
 * Time Signature Event - Time signature change at a specific time
 */
export interface TimelineTimeSignatureEvent {
  /** Time position of signature change */
  time: MusicalTime;

  /** Upper number (beats per measure) */
  numerator: number;

  /** Lower number (note value per beat) */
  denominator: number;
}

/**
 * Loop Policy - Timeline loop configuration
 */
export interface TimelineLoopPolicy {
  /** Whether looping is enabled */
  enabled: boolean;

  /** Loop start point (undefined = start of timeline) */
  start?: MusicalTime;

  /** Loop end point (undefined = end of timeline) */
  end?: MusicalTime;

  /** Number of loop iterations (-1 = infinite loop) */
  count?: number;
}

/**
 * Song Instance - A song placed on the timeline
 *
 * Songs are referenced immutably - we don't modify the SongModel,
 * we configure how it participates in the timeline.
 */
export interface SongInstance {
  /** Unique instance identifier (not the same as SongModel.id) */
  instanceId: string;

  /**
   * Reference to immutable SongModel
   * This is the musical content - we never modify it directly
   *
   * Can be either v1 (legacy, with transport) or v2 (architecture compliant, no transport)
   */
  songModel: SongModel;

  /** Which bar this song starts on the timeline */
  entryBar: number;

  /** Phase offset from entry point (for fine alignment) */
  phaseOffset: MusicalTime;

  /** Gain/volume multiplier for this instance */
  gain: number;

  /**
   * Instance state
   * - armed: actively contributing to timeline output
   * - muted: present but not contributing
   * - fading: in transition between armed/muted
   */
  state: "armed" | "muted" | "fading";

  /** If state is 'fading', target gain and fade duration */
  fadeConfig?: FadeConfig;

  /** Human-readable name for this instance */
  name?: string;
}

/**
 * Fade Configuration - For smooth transitions between states
 */
export interface FadeConfig {
  /** Target gain value (0-1) */
  targetGain: number;

  /** Fade duration in milliseconds */
  duration: number;

  /** Fade curve shape */
  curve: "linear" | "exponential" | "logarithmic";
}

/**
 * Timeline Metadata
 */
export interface TimelineMetadata {
  /** Timeline title */
  title?: string;

  /** Timeline description */
  description?: string;

  /** Creator/composer name */
  composer?: string;

  /** Custom user-defined metadata */
  custom?: Record<string, unknown>;
}

/**
 * Interaction Rule - How songs interact with each other
 *
 * Songs never communicate directly. All interactions are declared
 * as rules and evaluated deterministically.
 */
export interface InteractionRule {
  /** Unique rule identifier */
  id: string;

  /** Rule type */
  type: InteractionRuleType;

  /** Source song instance */
  sourceInstanceId: string;

  /** Target song instance (optional - some rules apply to all songs) */
  targetInstanceId?: string;

  /** Rule parameters (type-specific) */
  parameters: Record<string, unknown>;

  /** Whether this rule is currently active */
  enabled: boolean;
}

/**
 * Interaction Rule Types
 *
 * Defines how songs can interact on the timeline
 */
export type InteractionRuleType =
  /** Limit total energy across specified songs */
  | "energyCap"

  /** Limit density (notes/events per time window) */
  | "densityBudget"

  /** Call-and-response pattern between songs */
  | "callResponse"

  /** Allow motif sharing between songs */
  | "motifSharing"

  /** Voice leading constraints between songs */
  | "voiceLeading"

  /** Harmonic compatibility rules */
  | "harmonicConstraint"

  /** Custom interaction rule */
  | "custom";

/**
 * Time Slice - A window in time for evaluation
 *
 * Used when evaluating the timeline to generate events.
 * This is a symbolic time window, not a playback position.
 */
export interface TimeSlice {
  /** Start of time window */
  start: MusicalTime;

  /** End of time window */
  end: MusicalTime;

  /** Resolution for event generation */
  resolution: "bar" | "beat" | "sixteenth" | "sample";
}

/**
 * Evaluated Event - Output from timeline evaluation
 *
 * Represents a single musical event generated from evaluating
 * the timeline at a specific time slice.
 */
export interface EvaluatedEvent {
  /** Which song instance generated this event */
  instanceId: string;

  /** Which role/track within the song */
  roleId: string;

  /** Event time (global timeline time) */
  time: MusicalTime;

  /** Event duration */
  duration: MusicalTime;

  /** MIDI pitch (0-127) or rest */
  pitch: number;

  /** Velocity (0-127, 0 = rest) */
  velocity: number;

  /** Additional event metadata */
  metadata?: EventMetadata;
}

/**
 * Event Metadata - Additional information about evaluated events
 */
export interface EventMetadata {
  /** Original position in source song */
  originalTime: MusicalTime;

  /** Articulation/expression information */
  articulation?: string;

  /** Custom user-defined metadata */
  custom?: Record<string, unknown>;
}
