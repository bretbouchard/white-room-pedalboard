/**
 * Validation Module
 *
 * Comprehensive input validation and sanitization for SDK operations
 */

export {
  sanitizeString,
  sanitizeJSON,
  validateSongContract,
  RateLimiter,
  validateInputSize,
  checkNestingDepth,
  INPUT_LIMITS
} from './input_validator.js';

export type {
  ValidationResult,
  SanitizeOptions,
  JSONSchema
} from './input_validator.js';

// =============================================================================
// Schema Validation
// =============================================================================

export {
  // SchillingerSong_v1
  validateSchillingerSong,
  // SongModel_v1
  validateSongModel,
  // PerformanceState_v1
  validatePerformanceState,
  // Utilities
  isValidUUID,
  Ok,
  Err,
  isOk,
  isErr,
  ValidationErrors
} from './schema_validator.js';

// Schema types
export type {
  // Result types
  Result,
  Ok,
  Err,
  ValidationError,
  // SchillingerSong_v1 types
  SchillingerSong_v1,
  EnsembleModel,
  Voice,
  VoiceGroup,
  RolePool,
  BalanceRules,
  BindingModel,
  ConstraintModel,
  ConsoleModel,
  Bus,
  EffectSlot,
  SendEffect,
  Send,
  RoutingMatrix,
  Route,
  MeteringConfig,
  RhythmSystem,
  Generator,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
  InstrumentAssignment,
  PresetAssignment,
  AutomationTimeline,
  // SongModel_v1 types
  SongModel_v1,
  SongTimeline,
  SongTimelineSection,
  NoteEvent,
  NoteDerivation,
  SongAutomation,
  VoiceAssignment,
  // PerformanceState_v1 types
  PerformanceState_v1,
  PerformanceArrangementStyle,
  PerformanceInstrumentAssignment,
  PerformanceMixTarget
} from './schema_validator.js';
