/**
 * White Room SDK - Error Handling System
 *
 * Comprehensive error types, error codes, and recovery mechanisms
 * for Schillinger SDK operations.
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Informational - operation can continue */
  INFO = "info",
  /** Warning - operation completed but with issues */
  WARNING = "warning",
  /** Error - operation failed but system is stable */
  ERROR = "error",
  /** Critical - operation failed and system may be unstable */
  CRITICAL = "critical",
}

/**
 * Error categories
 */
export enum ErrorCategory {
  /** Schillinger theory-related errors */
  THEORY = "theory",
  /** Schema/validation errors */
  VALIDATION = "validation",
  /** Realization/generation errors */
  REALIZATION = "realization",
  /** Audio/playback errors */
  AUDIO = "audio",
  /** FFI/bridge errors */
  FFI = "ffi",
  /** Configuration errors */
  CONFIGURATION = "configuration",
  /** Performance/resource errors */
  PERFORMANCE = "performance",
  /** Unknown/unexpected errors */
  UNKNOWN = "unknown",
}

/**
 * Base White Room error
 */
export class WhiteRoomError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error;

  constructor(
    code: string,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.timestamp = new Date();
    this.context = context;
    this.cause = cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WhiteRoomError);
    }
  }

  /**
   * Get full error details
   */
  getDetails(): string {
    const parts = [
      `[${this.severity.toUpperCase()}] ${this.code}: ${this.message}`,
      `Category: ${this.category}`,
      `Time: ${this.timestamp.toISOString()}`,
    ];

    if (this.context && Object.keys(this.context).length > 0) {
      parts.push(`Context: ${JSON.stringify(this.context, null, 2)}`);
    }

    if (this.cause) {
      parts.push(`Caused by: ${this.cause.message}`);
    }

    return parts.join("\n");
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
          }
        : undefined,
      stack: this.stack,
    };
  }
}

// =============================================================================
// SPECIFIC ERROR TYPES
// =============================================================================

/**
 * Theory-related errors (Schillinger System)
 */
export class TheoryError extends WhiteRoomError {
  constructor(code: string, message: string, context?: Record<string, unknown>, cause?: Error) {
    super(code, message, ErrorSeverity.ERROR, ErrorCategory.THEORY, context, cause);
  }
}

/**
 * Validation/schema errors
 */
export class ValidationError extends WhiteRoomError {
  constructor(code: string, message: string, context?: Record<string, unknown>, cause?: Error) {
    super(code, message, ErrorSeverity.ERROR, ErrorCategory.VALIDATION, context, cause);
  }
}

/**
 * Realization/generation errors
 */
export class RealizationError extends WhiteRoomError {
  constructor(code: string, message: string, context?: Record<string, unknown>, cause?: Error) {
    super(code, message, ErrorSeverity.ERROR, ErrorCategory.REALIZATION, context, cause);
  }
}

/**
 * Audio/playback errors
 */
export class AudioError extends WhiteRoomError {
  constructor(code: string, message: string, context?: Record<string, unknown>, cause?: Error) {
    super(code, message, ErrorSeverity.ERROR, ErrorCategory.AUDIO, context, cause);
  }
}

/**
 * FFI/bridge errors
 */
export class FFIError extends WhiteRoomError {
  constructor(code: string, message: string, context?: Record<string, unknown>, cause?: Error) {
    super(code, message, ErrorSeverity.ERROR, ErrorCategory.FFI, context, cause);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends WhiteRoomError {
  constructor(code: string, message: string, context?: Record<string, unknown>, cause?: Error) {
    super(code, message, ErrorSeverity.ERROR, ErrorCategory.CONFIGURATION, context, cause);
  }
}

/**
 * Performance/resource errors
 */
export class PerformanceError extends WhiteRoomError {
  constructor(code: string, message: string, context?: Record<string, unknown>, cause?: Error) {
    super(code, message, ErrorSeverity.WARNING, ErrorCategory.PERFORMANCE, context, cause);
  }
}

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Theory errors
  INVALID_GENERATOR_PERIOD: "THEORY_001",
  INSUFFICIENT_GENERATORS: "THEORY_002",
  INVALID_PITCH_CYCLE: "THEORY_003",
  INVALID_INTERVAL_SEED: "THEORY_004",
  HARMONY_VIOLATION: "THEORY_005",

  // Validation errors
  INVALID_SCHEMA: "VAL_001",
  VALIDATION_FAILED: "VAL_002",
  INVALID_VOICE_COUNT: "VAL_003",
  INVALID_ROLE_POOL: "VAL_004",
  INVALID_BALANCE_RULES: "VAL_005",

  // Realization errors
  REALIZATION_FAILED: "REAL_001",
  SYSTEM_EXECUTION_FAILED: "REAL_002",
  CONSTRAINT_SATISFACTION_FAILED: "REAL_003",
  DERIVATION_RECORD_FAILED: "REAL_004",

  // Audio errors
  AUDIO_ENGINE_NOT_READY: "AUDIO_001",
  PLAYBACK_FAILED: "AUDIO_002",
  VOICE_CREATION_FAILED: "AUDIO_003",
  DROPOUT_DETECTED: "AUDIO_004",

  // FFI errors
  FFI_NOT_INITIALIZED: "FFI_001",
  FFI_CALL_FAILED: "FFI_002",
  FFI_VERSION_MISMATCH: "FFI_003",
  FFI_TIMEOUT: "FFI_004",

  // Configuration errors
  INVALID_CONFIG: "CFG_001",
  MISSING_CONFIG: "CFG_002",
  CONFIG_PARSE_ERROR: "CFG_003",

  // Performance errors
  SLOW_REALIZATION: "PERF_001",
  MEMORY_LIMIT_EXCEEDED: "PERF_002",
  COMPUTE_LIMIT_EXCEEDED: "PERF_003",
} as const;

// =============================================================================
// ERROR FACTORY FUNCTIONS
// =============================================================================

/**
 * Create theory error for invalid generator period
 */
export function createInvalidGeneratorPeriodError(
  period: number,
  validRange: [number, number]
): TheoryError {
  return new TheoryError(
    ErrorCodes.INVALID_GENERATOR_PERIOD,
    `Generator period ${period} is outside valid range [${validRange[0]}, ${validRange[1]}]`,
    { period, validRange }
  );
}

/**
 * Create theory error for insufficient generators
 */
export function createInsufficientGeneratorsError(actual: number, required: number): TheoryError {
  return new TheoryError(
    ErrorCodes.INSUFFICIENT_GENERATORS,
    `Insufficient generators: ${actual} (required: ${required})`,
    { actual, required }
  );
}

/**
 * Create validation error for invalid voice count
 */
export function createInvalidVoiceCountError(
  count: number,
  validRange: [number, number]
): ValidationError {
  return new ValidationError(
    ErrorCodes.INVALID_VOICE_COUNT,
    `Voice count ${count} is outside valid range [${validRange[0]}, ${validRange[1]}]`,
    { count, validRange }
  );
}

/**
 * Create realization error
 */
export function createRealizationFailedError(systemId: string, reason: string): RealizationError {
  return new RealizationError(
    ErrorCodes.REALIZATION_FAILED,
    `Realization failed for system ${systemId}: ${reason}`,
    { systemId, reason }
  );
}

/**
 * Create audio error for playback failure
 */
export function createPlaybackFailedError(reason: string): AudioError {
  return new AudioError(ErrorCodes.PLAYBACK_FAILED, `Playback failed: ${reason}`, { reason });
}

/**
 * Create FFI error for timeout
 */
export function createFFITimeoutError(operation: string, timeoutMs: number): FFIError {
  return new FFIError(
    ErrorCodes.FFI_TIMEOUT,
    `FFI operation '${operation}' timed out after ${timeoutMs}ms`,
    { operation, timeoutMs }
  );
}

/**
 * Create configuration error for invalid config
 */
export function createInvalidConfigError(section: string, reason: string): ConfigurationError {
  return new ConfigurationError(
    ErrorCodes.INVALID_CONFIG,
    `Invalid configuration in section '${section}': ${reason}`,
    { section, reason }
  );
}

/**
 * Create performance error for slow realization
 */
export function createSlowRealizationError(
  durationMs: number,
  thresholdMs: number
): PerformanceError {
  return new PerformanceError(
    ErrorCodes.SLOW_REALIZATION,
    `Realization took ${durationMs}ms (threshold: ${thresholdMs}ms)`,
    { durationMs, thresholdMs }
  );
}

// =============================================================================
// ERROR CHECKING UTILITIES
// =============================================================================

/**
 * Validate a condition and throw error if false
 */
export function assert(condition: boolean, errorCode: string, message: string): void {
  if (!condition) {
    throw new WhiteRoomError(errorCode, message);
  }
}

/**
 * Validate a number is in range
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  errorCode: string,
  valueName: string
): void {
  if (value < min || value > max) {
    throw new WhiteRoomError(
      errorCode,
      `${valueName} ${value} is outside valid range [${min}, ${max}]`,
      ErrorSeverity.ERROR,
      ErrorCategory.VALIDATION,
      { value, min, max, valueName }
    );
  }
}

/**
 * Validate a value is not null/undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  errorCode: string,
  valueName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new WhiteRoomError(
      errorCode,
      `${valueName} is null or undefined`,
      ErrorSeverity.ERROR,
      ErrorCategory.VALIDATION,
      { valueName }
    );
  }
}

/**
 * Validate an array has minimum length
 */
export function assertMinLength(
  array: unknown[],
  minLength: number,
  errorCode: string,
  arrayName: string
): void {
  if (array.length < minLength) {
    throw new WhiteRoomError(
      errorCode,
      `${arrayName} has insufficient length: ${array.length} (minimum: ${minLength})`,
      ErrorSeverity.ERROR,
      ErrorCategory.VALIDATION,
      { actualLength: array.length, minLength, arrayName }
    );
  }
}
