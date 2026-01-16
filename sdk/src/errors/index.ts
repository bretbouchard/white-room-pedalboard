/**
 * White Room Error Handling System
 *
 * Comprehensive error handling infrastructure for White Room.
 * Exports all error types, handler, and validation functions.
 */

// Error types
export {
  WhiteRoomError,
  AudioEngineError,
  AudioDeviceError,
  FileNotFoundError,
  FileCorruptedError,
  FilePermissionError,
  NetworkError,
  TimeoutError,
  ValidationError,
  InvalidParameterError,
  InvalidStateError,
  NotInitializedError,
  OutOfMemoryError,
  DiskFullError,
  UserCancelledError,
  UserError
} from './ErrorTypes'

// Enums and interfaces
export {
  ErrorCategory,
  ErrorSeverity
} from './ErrorTypes'

export type {
  RecoveryAction,
  ErrorContext
} from './ErrorTypes'

// Error handler
export {
  ErrorHandler
} from './ErrorHandler'

export type {
  ErrorLog,
  ErrorStatistics,
  ErrorHandlerConfig
} from './ErrorHandler'

// Validation guards
export {
  validateNotNull,
  validateNotEmpty,
  validateRange,
  validatePositive,
  validateNonNegative,
  validateType,
  validateArray,
  validateArrayNotEmpty,
  validateFileExists,
  validateFileReadable,
  validateFileWritable,
  validateDirectory,
  validateOneOf,
  validatePattern,
  validateEmail,
  validateURL,
  validateInitialized,
  validateMemoryAvailable,
  validateTimeout,
  validateFunctionCall,
  validateAudioBuffer,
  validateAudioDevice,
  validateStateTransition,
  validateBatch,
  validateIf,
  validateAsync
} from './Validation'

// Convenience: Get singleton instance
export const errorHandler = ErrorHandler.getInstance()
