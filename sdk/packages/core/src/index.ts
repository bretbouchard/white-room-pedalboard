/**
 * Schillinger SDK v1 - Theory-First Architecture
 *
 * Main entry point for the Schillinger System SDK.
 * Provides complete theory-first composition, deterministic realization,
 * and round-trip reconciliation capabilities.
 */

// Random number generation - deterministic PRNG
export * from "./random";

// Theory layer - SchillingerSong_v1 and all Book I-V systems
export * from "./theory";

// Core type definitions (includes VoiceAssignment - imported before theory to avoid conflicts)
export * from "./types";

// Realization pipeline - deterministic conversion to SongModel_v1
export * from "./realize";

// Reconciliation pipeline - round-trip edit processing
export * from "./reconcile";

// Utility functions
export * from "./utils";

// Schema validation (selective exports to avoid conflicts with theory)
export { validate, addSchema } from "./schemas";

// Error handling
export * from "./errors";

// Performance profiling
export * from "./performance";

// Curve engine - automation, envelopes, LFOs
export * from "./curves";

// Parameter mapping - UI parameters to Schillinger systems
export * from "./mapping";

// SDK bundle for JavaScriptCore
export { SchillingerSDK } from "./sdk-bundle";
