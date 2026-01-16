/**
 * White Room SDK - Error Handling
 *
 * Comprehensive error handling, recovery, and management system.
 */

// Error types and codes
export {
  // Enums
  ErrorSeverity,
  ErrorCategory,
  ErrorCodes,

  // Base error class
  WhiteRoomError,

  // Specific error types
  TheoryError,
  ValidationError,
  RealizationError,
  AudioError,
  FFIError,
  ConfigurationError,
  PerformanceError,

  // Error factory functions
  createInvalidGeneratorPeriodError,
  createInsufficientGeneratorsError,
  createInvalidVoiceCountError,
  createRealizationFailedError,
  createPlaybackFailedError,
  createFFITimeoutError,
  createInvalidConfigError,
  createSlowRealizationError,

  // Validation utilities
  assert,
  assertInRange,
  assertDefined,
  assertMinLength,
} from "./errors";

// Recovery system
export {
  // Recovery strategies
  RetryStrategy,
  FallbackStrategy,
  DefaultStrategy,
  SanitizationStrategy,
  LoggingStrategy,

  // Recovery manager
  ErrorRecoveryManager,
  defaultRecoveryManager,
  withRecovery,

  // Recovery types
  type RecoveryResult,
  type RecoveryStrategy,
} from "./recovery";

// Error handler
export {
  // Error handler
  ErrorHandler,
  defaultErrorHandler,

  // Convenience functions
  handleError,
  withErrorHandling,

  // Types
  type ErrorLogEntry,
  type ErrorStatistics,
  type ErrorHandlerConfig,
} from "./handler";
