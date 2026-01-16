/**
 * Theory Layer - SchillingerSong_v1
 *
 * Canonical theory representation following Schillinger's System.
 * This is the source of truth for all compositions.
 *
 * Schema version: 1.0
 * Zero notes required - pure theory representation.
 */

// Main theory object
export * from "./schillinger-song";

// System implementations (Books I-V)
export * from "./systems/rhythm";
export * from "./systems/melody";
export * from "./systems/harmony";
export * from "./systems/form";
export * from "./systems/orchestration";

// Ensemble and binding utilities
export * from "./ensemble";
export * from "./bindings";

// Re-export types for convenience
export type {
  SchillingerSong_v1,
  SongModel_v1,
  DerivationRecord_v1,
  ReconciliationReport_v1,
} from "../types";
