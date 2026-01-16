/**
 * SongState Derivation - Derive pure SongState from SongContract
 *
 * This file re-exports the derivation functionality from song_factory.ts
 * to maintain backward compatibility and provide a clear API entry point.
 *
 * The actual implementation is in song_factory.ts which contains:
 * - deriveSongState() - Main derivation function
 * - createSongFromContract() - Internal derivation logic
 * - Helper functions for rhythm, melody, and note generation
 *
 * Data flow:
 * SongContract → deriveSongState() → SongState (pure musical logic)
 * SongState + PerformanceConfiguration → projectSongState() → RenderedSongGraph (audio-ready)
 *
 * CRITICAL: This function returns PURE SongState (invariant musical logic).
 * It does NOT include instrumentation, mixing, or audio rendering details.
 * Those are added later by projectSongState() with a PerformanceConfiguration.
 */

// Re-export all functionality from song_factory
export {
  deriveSongState,
  createSongFromContract,
  beatsToSamples,
  samplesToBeats,
  samplesToSeconds,
  secondsToSamples,
  formatTime,
  parseTime,
  createNoteEvent,
  validateNoteTiming,
  modifySongState,
  calculateDuration
} from './song_factory.js';

// Re-export types
export type { SongCreationResult } from './song_factory.js';

// Re-export SongStateDerivationResult for backward compatibility
export interface SongStateDerivationResult {
  readonly success: boolean;
  readonly songState?: import('./song_state_v1.js').SongStateV1;
  readonly error?: string;
}
