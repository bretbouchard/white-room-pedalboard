/**
 * Realization Types
 * Re-exports realization types from the shared package
 */

// Re-export MusicalTime from IR
export type { MusicalTime } from "../ir";

// Re-export realization types from shared package
export type {
  RealizationPlane,
  RealizedLayer,
  RealizedFrame,
  LayerState,
  TrackSet,
} from "@schillinger-sdk/shared";
