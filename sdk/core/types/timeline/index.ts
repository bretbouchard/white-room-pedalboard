/**
 * Timeline Types Index
 *
 * Exports all timeline-related types for easy importing.
 *
 * Usage:
 * import { TimelineModel, SongInstance, InteractionRule } from '@schillinger-sdk/core';
 */

// TimelineModel and related types
export type {
  TimelineModel,
  TimelineTransportConfig,
  TimelineTempoEvent,
  TimelineTimeSignatureEvent,
  TimelineLoopPolicy,
  SongInstance,
  FadeConfig,
  TimelineMetadata,
  InteractionRule,
  InteractionRuleType,
  TimeSlice,
  EvaluatedEvent,
  EventMetadata,
} from "./timeline-model";

// TimelineDiff types
export type {
  TimelineDiff,
  AddSongInstanceDiff,
  RemoveSongInstanceDiff,
  UpdateSongInstanceDiff,
  SetPhaseOffsetDiff,
  SetGainDiff,
  SetStateDiff,
  SetFadeConfigDiff,
  RenameSongInstanceDiff,
  UpdateTransportDiff,
  SetTempoEventDiff,
  AddTempoEventDiff,
  RemoveTempoEventDiff,
  SetTimeSignatureEventDiff,
  AddTimeSignatureEventDiff,
  RemoveTimeSignatureEventDiff,
  SetLoopPolicyDiff,
  AddInteractionRuleDiff,
  RemoveInteractionRuleDiff,
  UpdateInteractionRuleDiff,
  EnableInteractionRuleDiff,
  UpdateTimelineMetadataDiff,
  TimelineDiffValidationResult,
  TimelineDiffWithMetadata,
} from "./timeline-diff";

// Utility functions
export { validateTimelineDiff, invertTimelineDiff } from "./timeline-diff";

// Timeline validation
export {
  TimelineValidator,
  validateTimeline,
  validateTimelineDiff as validateTimelineDiffStrict,
} from "./timeline-validator";

export type {
  ValidationError,
  ValidationResult,
  ValidationOptions,
} from "./timeline-validator";
