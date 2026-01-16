/**
 * TimelineDiff - Atomic Mutation Units for TimelineModel
 *
 * This module defines all possible diff types that can be applied to a TimelineModel.
 * Every diff is:
 * - Atomic: A single logical operation
 * - Undoable: Can be reversed to restore previous state
 * - Deterministic: Same input always produces same output
 * - Validated: Must pass validation before application
 *
 * TimelineDiff follows the same principles as SongDiff - all timeline mutations
 * are expressed as explicit, reversible operations.
 *
 * Part of: LLVM-Style Core Architecture
 * See: SDK_HANDOFF_ADDENDUM_LLVM_TIMELINE.md
 */

import type { MusicalTime } from "../../ir";
import type {
  TimelineTransportConfig,
  InteractionRuleType,
} from "./timeline-model";

/**
 * TimelineDiff - Union of all possible timeline mutations
 *
 * Every change to a TimelineModel must be expressed as one of these diffs.
 * This enables:
 * - Undo/redo functionality
 * - Change tracking and history
 * - Collaborative editing
 * - Deterministic validation
 */
export type TimelineDiff =
  | AddSongInstanceDiff
  | RemoveSongInstanceDiff
  | UpdateSongInstanceDiff
  | SetPhaseOffsetDiff
  | SetGainDiff
  | SetStateDiff
  | SetFadeConfigDiff
  | RenameSongInstanceDiff
  | UpdateTransportDiff
  | SetTempoEventDiff
  | AddTempoEventDiff
  | RemoveTempoEventDiff
  | SetTimeSignatureEventDiff
  | AddTimeSignatureEventDiff
  | RemoveTimeSignatureEventDiff
  | SetLoopPolicyDiff
  | AddInteractionRuleDiff
  | RemoveInteractionRuleDiff
  | UpdateInteractionRuleDiff
  | EnableInteractionRuleDiff
  | UpdateTimelineMetadataDiff;

// =============================================================================
// SONG INSTANCE DIFFS
// =============================================================================

/**
 * Add a new song instance to the timeline
 */
export interface AddSongInstanceDiff {
  type: "addSongInstance";
  instanceId: string;
  songModelId: string; // Reference to SongModel to instantiate
  entryBar: number;
  phaseOffset: MusicalTime;
  gain: number;
  state: "armed" | "muted";
  name?: string;
}

/**
 * Remove a song instance from the timeline
 */
export interface RemoveSongInstanceDiff {
  type: "removeSongInstance";
  instanceId: string;
}

/**
 * Update song instance configuration
 */
export interface UpdateSongInstanceDiff {
  type: "updateSongInstance";
  instanceId: string;
  updates: Partial<{
    entryBar: number;
    gain: number;
    name: string;
  }>;
}

/**
 * Set phase offset for a song instance
 */
export interface SetPhaseOffsetDiff {
  type: "setPhaseOffset";
  instanceId: string;
  phaseOffset: MusicalTime;
}

/**
 * Set gain for a song instance
 */
export interface SetGainDiff {
  type: "setGain";
  instanceId: string;
  gain: number;
}

/**
 * Set state for a song instance (armed/muted/fading)
 */
export interface SetStateDiff {
  type: "setState";
  instanceId: string;
  state: "armed" | "muted" | "fading";
  fadeConfig?: {
    targetGain: number;
    duration: number;
    curve: "linear" | "exponential" | "logarithmic";
  };
}

/**
 * Set fade configuration for a song instance
 */
export interface SetFadeConfigDiff {
  type: "setFadeConfig";
  instanceId: string;
  fadeConfig: {
    targetGain: number;
    duration: number;
    curve: "linear" | "exponential" | "logarithmic";
  };
}

/**
 * Rename a song instance
 */
export interface RenameSongInstanceDiff {
  type: "renameSongInstance";
  instanceId: string;
  name: string;
}

// =============================================================================
// TRANSPORT DIFFS
// =============================================================================

/**
 * Update entire transport configuration
 */
export interface UpdateTransportDiff {
  type: "updateTransport";
  transport: TimelineTransportConfig;
}

/**
 * Set a tempo event at a specific time
 * (Creates new or updates existing)
 */
export interface SetTempoEventDiff {
  type: "setTempoEvent";
  time: MusicalTime;
  tempo: number;
}

/**
 * Add a new tempo event
 */
export interface AddTempoEventDiff {
  type: "addTempoEvent";
  tempoEvent: {
    time: MusicalTime;
    tempo: number;
  };
}

/**
 * Remove a tempo event
 */
export interface RemoveTempoEventDiff {
  type: "removeTempoEvent";
  time: MusicalTime;
}

/**
 * Set a time signature event at a specific time
 * (Creates new or updates existing)
 */
export interface SetTimeSignatureEventDiff {
  type: "setTimeSignatureEvent";
  time: MusicalTime;
  numerator: number;
  denominator: number;
}

/**
 * Add a new time signature event
 */
export interface AddTimeSignatureEventDiff {
  type: "addTimeSignatureEvent";
  timeSignatureEvent: {
    time: MusicalTime;
    numerator: number;
    denominator: number;
  };
}

/**
 * Remove a time signature event
 */
export interface RemoveTimeSignatureEventDiff {
  type: "removeTimeSignatureEvent";
  time: MusicalTime;
}

/**
 * Update loop policy configuration
 */
export interface SetLoopPolicyDiff {
  type: "setLoopPolicy";
  loopPolicy: {
    enabled: boolean;
    start?: MusicalTime;
    end?: MusicalTime;
    count?: number;
  };
}

// =============================================================================
// INTERACTION RULE DIFFS
// =============================================================================

/**
 * Add a new interaction rule
 */
export interface AddInteractionRuleDiff {
  type: "addInteractionRule";
  ruleId: string;
  ruleType: InteractionRuleType;
  sourceInstanceId: string;
  targetInstanceId?: string;
  parameters: Record<string, unknown>;
}

/**
 * Remove an interaction rule
 */
export interface RemoveInteractionRuleDiff {
  type: "removeInteractionRule";
  ruleId: string;
}

/**
 * Update an interaction rule
 */
export interface UpdateInteractionRuleDiff {
  type: "updateInteractionRule";
  ruleId: string;
  updates: Partial<{
    ruleType: InteractionRuleType;
    sourceInstanceId: string;
    targetInstanceId: string;
    parameters: Record<string, unknown>;
  }>;
}

/**
 * Enable or disable an interaction rule
 */
export interface EnableInteractionRuleDiff {
  type: "enableInteractionRule";
  ruleId: string;
  enabled: boolean;
}

// =============================================================================
// METADATA DIFFS
// =============================================================================

/**
 * Update timeline metadata
 */
export interface UpdateTimelineMetadataDiff {
  type: "updateTimelineMetadata";
  metadata: {
    title?: string;
    description?: string;
    composer?: string;
    custom?: Record<string, unknown>;
  };
}

// =============================================================================
// DIFF UTILITIES
// =============================================================================

/**
 * Validate a TimelineDiff before application
 *
 * @param diff - The diff to validate
 * @returns Validation result with optional error message
 */
export function validateTimelineDiff(
  diff: TimelineDiff,
): TimelineDiffValidationResult {
  // Basic validation: ensure required fields are present
  switch (diff.type) {
    case "addSongInstance":
      if (!diff.instanceId || !diff.songModelId) {
        return {
          valid: false,
          error: "addSongInstance requires instanceId and songModelId",
        };
      }
      if (diff.entryBar < 0) {
        return { valid: false, error: "entryBar must be >= 0" };
      }
      if (diff.gain < 0 || diff.gain > 1) {
        return { valid: false, error: "gain must be between 0 and 1" };
      }
      break;

    case "removeSongInstance":
    case "setPhaseOffset":
    case "setGain":
    case "setState":
    case "setFadeConfig":
    case "renameSongInstance":
      if (!diff.instanceId) {
        return { valid: false, error: `${diff.type} requires instanceId` };
      }
      break;

    case "setTempoEvent":
      if (diff.tempo < 1 || diff.tempo > 500) {
        return { valid: false, error: "tempo must be between 1 and 500 BPM" };
      }
      break;

    case "addTempoEvent":
      if (
        !diff.tempoEvent?.tempo ||
        diff.tempoEvent.tempo < 1 ||
        diff.tempoEvent.tempo > 500
      ) {
        return { valid: false, error: "tempo must be between 1 and 500 BPM" };
      }
      break;

    case "setTimeSignatureEvent":
      if (diff.numerator < 1 || diff.numerator > 16) {
        return { valid: false, error: "numerator must be between 1 and 16" };
      }
      // Check if denominator is power of 2
      const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
      if (
        diff.denominator < 1 ||
        diff.denominator > 32 ||
        !isPowerOfTwo(diff.denominator)
      ) {
        return {
          valid: false,
          error: "denominator must be power of 2 between 1 and 32",
        };
      }
      break;

    case "addInteractionRule":
      if (!diff.ruleId || !diff.ruleType || !diff.sourceInstanceId) {
        return {
          valid: false,
          error:
            "addInteractionRule requires ruleId, ruleType, and sourceInstanceId",
        };
      }
      break;

    case "removeInteractionRule":
    case "updateInteractionRule":
    case "enableInteractionRule":
      if (!diff.ruleId) {
        return { valid: false, error: `${diff.type} requires ruleId` };
      }
      break;
  }

  return { valid: true };
}

/**
 * Create inverse of a TimelineDiff for undo functionality
 *
 * @param diff - The diff to invert
 * @param previousState - State before diff was applied
 * @returns Inverse diff that undoes the original
 */
export function invertTimelineDiff(
  diff: TimelineDiff,
  previousState: any,
): TimelineDiff | null {
  // Create inverse diff based on type
  switch (diff.type) {
    case "addSongInstance":
      return {
        type: "removeSongInstance",
        instanceId: diff.instanceId,
      };

    case "removeSongInstance":
      return {
        type: "addSongInstance",
        instanceId: diff.instanceId,
        songModelId: previousState.songModelId,
        entryBar: previousState.entryBar,
        phaseOffset: previousState.phaseOffset,
        gain: previousState.gain,
        state: previousState.state,
        name: previousState.name,
      };

    case "setGain":
      return {
        type: "setGain",
        instanceId: diff.instanceId,
        gain: previousState.gain,
      };

    case "setState":
      return {
        type: "setState",
        instanceId: diff.instanceId,
        state: previousState.state,
        fadeConfig: previousState.fadeConfig,
      };

    case "enableInteractionRule":
      return {
        type: "enableInteractionRule",
        ruleId: diff.ruleId,
        enabled: previousState.enabled,
      };

    // Add more cases as needed...

    default:
      return null; // Not invertible
  }
}

/**
 * Validation result
 */
export interface TimelineDiffValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * TimelineDiff with metadata for tracking
 */
export interface TimelineDiffWithMetadata {
  diff: TimelineDiff;
  timestamp: number;
  author?: string;
  description?: string;
}
