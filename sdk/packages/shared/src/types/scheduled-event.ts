/**
 * ScheduledEvent Type Definition
 *
 * Deterministic, bounded musical events for audio engine integration.
 * Each event is fully resolved to sample time and includes all information
 * needed for deterministic playback.
 *
 * @module types/scheduled-event
 */

import type { RealizationTime } from "./realization";
import type { ParameterAddress } from "./parameter-address";

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Event type classification
 */
export type EventType =
  | "NOTE_ON" // Note start event
  | "NOTE_OFF" // Note end event
  | "PARAM" // Parameter change event
  | "SECTION" // Section boundary event
  | "TRANSPORT" // Transport control event
  | "AUTOMATION" // Automation event
  | "CONTROL"; // Generic control event

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

/**
 * Note event payload (for NOTE_ON and NOTE_OFF)
 */
export interface NotePayload {
  /** MIDI pitch (0-127) */
  pitch: number;
  /** MIDI velocity (0-127) */
  velocity: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Parameter event payload (for PARAM and AUTOMATION)
 */
export interface ParameterPayload {
  /** Parameter value */
  value: number;
  /** Interpolation type */
  interpolation?: "linear" | "exponential" | "step";
  /** Ramp duration in seconds (optional) */
  duration?: number;
}

/**
 * Section event payload (for SECTION events)
 */
export interface SectionPayload {
  /** Section identifier */
  sectionId: string;
  /** Section action */
  action: "enter" | "exit";
}

/**
 * Transport event payload (for TRANSPORT events)
 */
export interface TransportPayload {
  /** Transport command */
  command: "play" | "stop" | "pause" | "seek" | "tempo" | "timesig";
  /** Command value (if applicable) */
  value?: number;
}

/**
 * Event payload union type
 */
export interface EventPayload {
  /** Note payload (for NOTE_ON/NOTE_OFF) */
  note?: NotePayload;
  /** Parameter payload (for PARAM/AUTOMATION) */
  parameter?: ParameterPayload;
  /** Section payload (for SECTION) */
  section?: SectionPayload;
  /** Transport payload (for TRANSPORT) */
  transport?: TransportPayload;
}

// =============================================================================
// EVENT SOURCE
// =============================================================================

/**
 * Event source information for determinism tracking
 */
export interface EventSource {
  /** Generator ID that created this event */
  generatorId: string;
  /** Role that generated this event */
  role: string;
  /** Section ID (optional, for section-related events) */
  sectionId?: string;
  /** Additional source metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// SCHEDULED EVENT
// =============================================================================

/**
 * ScheduledEvent - A deterministic, bounded musical event
 *
 * Each event contains:
 * - Fully resolved timing (sample time + optional musical time)
 * - Event classification (type)
 * - Target address (parameter path)
 * - Event data (payload)
 * - Determinism tracking (ID + source)
 */
export interface ScheduledEvent {
  // -------------------------------------------------------------------------
  // TIMING (fully resolved to samples)
  // -------------------------------------------------------------------------

  /** Sample time (int64 for precise sample-accurate timing) */
  sampleTime: bigint;
  /** Optional musical time reference */
  musicalTime?: RealizationTime;

  // -------------------------------------------------------------------------
  // EVENT CLASSIFICATION
  // -------------------------------------------------------------------------

  /** Event type */
  type: EventType;
  /** Target parameter address */
  target: ParameterAddress;

  // -------------------------------------------------------------------------
  // EVENT DATA
  // -------------------------------------------------------------------------

  /** Event payload (data specific to event type) */
  payload: EventPayload;

  // -------------------------------------------------------------------------
  // DETERMINISM
  // -------------------------------------------------------------------------

  /** Unique deterministic ID for this event */
  deterministicId: string;
  /** Source information */
  sourceInfo: EventSource;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Sample time range for event emission
 */
export interface SampleTimeRange {
  /** Start sample */
  startSample: bigint;
  /** End sample */
  endSample: bigint;
  /** Sample rate */
  sampleRate: number;
}

/**
 * Time boundary for lookahead management
 */
export interface TimeBoundary {
  /** Boundary time in samples */
  sampleTime: bigint;
  /** Boundary time in seconds */
  seconds: number;
  /** Is this a safe boundary for applying changes? */
  isSafe: boolean;
}
