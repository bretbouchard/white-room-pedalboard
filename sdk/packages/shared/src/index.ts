// Export all from types (non-conflicting exports)
export * from "./types/index";
export * from "./errors/index";
export * from "./utils/index";
export * from "./math/index";
export * from "./cache/index";
export * from "./auth/index";

// Multi-Graph IR Architecture
// Note: We do NOT use 'export * from ./ir/index' because it causes duplicate export errors
// The IR module re-exports types from './types' which conflicts with the above export
// Consumers should import IR types directly from './ir/...' modules
// For example:
//   import { SongGraphIR } from '@schillinger-sdk/shared/ir/song-graph'
//   import { MusicalEvent } from '@schillinger-sdk/shared/types/realization'
