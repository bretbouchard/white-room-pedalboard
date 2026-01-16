/**
 * Song Module
 *
 * Complete song model management including performance helpers,
 * performance switching, bar boundary detection, and song state management.
 */

// Performance Helpers - Simple functional API for managing performances
export {
  addPerformance,
  setActivePerformance,
  blendPerformance,
  listPerformances,
  getActivePerformance,
  hasPerformances,
  getPerformanceCount,
  findPerformanceByName,
  isSongModelWithPerformances
} from './performance_helpers.js';

export type {
  SongModelWithPerformances,
  HelperResult,
  BlendOptions
} from './performance_helpers.js';

// Performance Realization
export {
  validatePerformanceRealization,
  clonePerformanceRealization,
  createSoloPianoPerformance,
  createSATBPerformance,
  createAmbientTechnoPerformance
} from './performance_realization.js';

export type {
  PerformanceRealizationV1
} from './performance_realization.js';

// Performance Switcher
export {
  PerformanceSwitcher,
  createPerformanceSwitcher
} from './performance_switcher.js';

export type {
  PerformanceSwitcherOptions,
  SwitchToPerformanceOptions,
  SwitchTiming,
  PendingSwitch,
  SwitchResult
} from './performance_switcher.js';

// Bar Boundary Detector
export {
  BarBoundaryDetector,
  calculateBarBoundary,
  calculateSamplesToNextBar,
  isAtBarBoundary
} from './bar_boundary_detector.js';

export type {
  BarBoundaryDetectorOptions
} from './bar_boundary_detector.js';

// Song Factory
export {
  createSongModel,
  createDefaultSongModel
} from './song_factory.js';

// Song State
export {
  deriveSongStateFromPerformance,
  createMinimalSongState
} from './song_state_v1.js';

export type {
  SongStateV1
} from './song_state_v1.js';

export type {
  SongState
} from './song_state.js';

// Song Contract
export {
  SongContract,
  createSongContract
} from './song_contract.js';

export type {
  SongContractOptions,
  SongContractState
} from './song_contract.js';

// Transition Engine
export {
  TransitionEngine,
  createTransitionEngine
} from './transition_engine.js';

export type {
  TransitionEngineOptions,
  TransitionRequest,
  TransitionResult,
  TransitionPhase
} from './transition_engine.js';

// Undo History
export {
  SongUndoHistory,
  createSongUndoHistory
} from './undo_history.js';

export type {
  SongUndoHistoryOptions,
  HistorySnapshot
} from './undo_history.js';

// Song Cache
export {
  SongCache,
  createSongCache
} from './song_cache.js';

export type {
  SongCacheOptions,
  CacheEntry,
  CacheStats
} from './song_cache.js';

// Performance Manager
export {
  PerformanceManager
} from './performance_manager.js';

export type {
  PerformanceManagerOptions,
  PerformanceList,
  ActivePerformanceInfo
} from './performance_manager.js';

// Performance Configuration
export {
  validatePerformanceConfiguration,
  serializePerformanceConfiguration,
  deserializePerformanceConfiguration,
  createMinimalPerformanceConfiguration
} from './performance_configuration.js';

export type {
  PerformanceConfiguration,
  PerformanceConfigurationOptions
} from './performance_configuration.js';

// Rendered Song Graph
export {
  projectSongState,
  createRenderedSongGraph,
  validateRenderedSongGraph
} from './rendered_song_graph.js';

export type {
  RenderedSongGraph,
  RenderedSongGraphOptions
} from './rendered_song_graph.js';

// IDs
export {
  generatePerformanceId,
  generateSongId,
  validatePerformanceId,
  validateSongId
} from './ids.js';
