/**
 * SongState - Unified export for song state types
 *
 * This file provides a unified export point for SongState types.
 * SongState is an alias for SongStateV1 for backward compatibility.
 */

export type { SongStateV1 as SongState } from './song_state_v1.js';
export type {
  Timeline,
  TimelineSection,
  NoteEvent,
  NoteDerivation,
  Automation,
  AutomationPoint,
  VoiceAssignment,
  PresetAssignment,
  ConsoleModel,
  Bus,
  BusType,
  EffectSlot,
  SendEffect,
  Send,
  RoutingMatrix,
  Route,
  MeteringConfig
} from './song_state_v1.js';

// Re-export factory functions
export { createMinimalSongState } from './song_state_v1.js';
