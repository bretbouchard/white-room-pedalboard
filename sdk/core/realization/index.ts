/**
 * Realization Module - Event Emission Engine
 *
 * Exports the deterministic event emission system for SongModel_v1 integration.
 * Part of SDK v2.1.0 deterministic audio engine integration.
 *
 * @module realization
 */

// Core types
export * from "./types";

// Event emitter - export named class only
export { DeterministicEventEmitter } from "./event-emitter";

// Event adapter - export named classes only
export {
  EventAdapter,
  BatchEventAdapter,
  StreamingEventAdapter,
} from "./event-adapter";

// Validation components
export { ProjectionValidator } from "./projection-validator";
export { LookaheadManager } from "./lookahead-manager";
export { OfflineReplaySystem } from "./offline-replay";
export { AudioHasher } from "./audio-hashing";

// Re-export MusicalTime from IR
export type { MusicalTime } from "../ir";

// Re-export realization types from shared package
export type {
  MusicalRole,
  RealizedFrame,
  RealizedLayer,
  MusicalEvent,
} from "@schillinger-sdk/shared";
