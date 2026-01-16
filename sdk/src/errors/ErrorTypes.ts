/**
 * White Room Error Handling System
 *
 * Comprehensive error taxonomy with categorization, severity levels,
 * recovery strategies, and user-friendly messaging.
 */

/**
 * White Room error categories
 */
export enum ErrorCategory {
  // Audio engine errors
  AUDIO_ENGINE = 'audio_engine',
  AUDIO_DEVICE = 'audio_device',
  AUDIO_BUFFER = 'audio_buffer',

  // File I/O errors
  FILE_NOT_FOUND = 'file_not_found',
  FILE_CORRUPTED = 'file_corrupted',
  FILE_PERMISSION = 'file_permission',

  // Network errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',

  // Validation errors
  VALIDATION_ERROR = 'validation_error',
  INVALID_PARAMETER = 'invalid_parameter',

  // State errors
  INVALID_STATE = 'invalid_state',
  NOT_INITIALIZED = 'not_initialized',

  // Resource errors
  OUT_OF_MEMORY = 'out_of_memory',
  DISK_FULL = 'disk_full',

  // User errors
  USER_CANCELLED = 'user_cancelled',
  USER_ERROR = 'user_error'
}

/**
 * Severity levels for error classification
 */
export enum ErrorSeverity {
  DEBUG = 'debug',       // Information only, no user impact
  INFO = 'info',         // User notification, no action needed
  WARNING = 'warning',   // Potential issue, user should be aware
  ERROR = 'error',       // Operation failed, user action may be needed
  CRITICAL = 'critical', // App may crash, immediate attention required
  FATAL = 'fatal'        // App must terminate, unrecoverable
}

/**
 * Recovery action suggestion for error resolution
 */
export interface RecoveryAction {
  title: string
  action: () => Promise<void>
  description?: string
  isAutomatic?: boolean
  isRecommended?: boolean
}

/**
 * Error context information for debugging
 */
export interface ErrorContext {
  [key: string]: any
}

/**
 * Base White Room Error class
 *
 * All White Room errors extend this class to provide:
 * - Consistent error categorization
 * - Severity-based handling
 * - User-friendly messages
 * - Technical details for debugging
 * - Recovery action suggestions
 * - Structured logging
 */
export class WhiteRoomError extends Error {
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly code: string
  public readonly context: ErrorContext
  public readonly recoveryActions: RecoveryAction[]
  public readonly userMessage: string
  public readonly technicalDetails: string
  public readonly timestamp: Date

  constructor(
    category: ErrorCategory,
    severity: ErrorSeverity,
    code: string,
    userMessage: string,
    technicalDetails?: string,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(userMessage)

    this.category = category
    this.severity = severity
    this.code = code
    this.userMessage = userMessage
    this.technicalDetails = technicalDetails || userMessage
    this.context = context || {}
    this.recoveryActions = recoveryActions || []
    this.timestamp = new Date()

    // Set error name for easier debugging
    this.name = 'WhiteRoomError'

    // Maintain proper stack trace (where available)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WhiteRoomError)
    }
  }

  /**
   * Format error for structured logging
   */
  toLogString(): string {
    const contextStr = Object.keys(this.context).length > 0
      ? ` | Context: ${JSON.stringify(this.context)}`
      : ''
    return `[${this.severity.toUpperCase()}] ${this.code}: ${this.technicalDetails}${contextStr}`
  }

  /**
   * Format error for user display
   */
  toUserString(): string {
    return this.userMessage
  }

  /**
   * Get recovery suggestions for user
   */
  getRecoverySuggestions(): string[] {
    return this.recoveryActions.map(action => {
      const base = action.title
      return action.description ? `${base}: ${action.description}` : base
    })
  }

  /**
   * Check if error has automatic recovery
   */
  hasAutomaticRecovery(): boolean {
    return this.recoveryActions.some(action => action.isAutomatic === true)
  }

  /**
   * Get recommended recovery action
   */
  getRecommendedRecovery(): RecoveryAction | undefined {
    return this.recoveryActions.find(action => action.isRecommended === true)
  }

  /**
   * Serialize for error reporting
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      category: this.category,
      severity: this.severity,
      code: this.code,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      context: this.context,
      recoveryActions: this.recoveryActions.map(action => ({
        title: action.title,
        description: action.description,
        isAutomatic: action.isAutomatic,
        isRecommended: action.isRecommended
      })),
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    }
  }
}

/**
 * Audio Engine Error
 *
 * Critical errors related to audio engine functionality
 */
export class AudioEngineError extends WhiteRoomError {
  constructor(
    code: string,
    userMessage: string,
    technicalDetails?: string,
    context?: ErrorContext,
    recoveryActions?: RecoveryAction[]
  ) {
    super(
      ErrorCategory.AUDIO_ENGINE,
      ErrorSeverity.CRITICAL,
      `AUDIO_ENGINE_${code}`,
      userMessage,
      technicalDetails,
      context,
      recoveryActions || [
        {
          title: 'Restart Audio Engine',
          action: async () => {
            // Trigger engine restart
          },
          description: 'Attempt to restart the audio engine',
          isRecommended: true
        },
        {
          title: 'Reset Audio Settings',
          action: async () => {
            // Reset to defaults
          },
          description: 'Reset audio settings to defaults'
        }
      ]
    )
    this.name = 'AudioEngineError'
  }
}

/**
 * Audio Device Error
 *
 * Errors related to audio device configuration or access
 */
export class AudioDeviceError extends WhiteRoomError {
  constructor(
    deviceName: string,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCategory.AUDIO_DEVICE,
      ErrorSeverity.ERROR,
      'AUDIO_DEVICE_ERROR',
      `Unable to use audio device "${deviceName}": ${reason}`,
      `Audio device error: ${deviceName} - ${reason}`,
      { deviceName, reason, ...context },
      [
        {
          title: 'Select Different Device',
          action: async () => {
            // Open device selector
          },
          description: 'Choose a different audio device',
          isRecommended: true
        },
        {
          title: 'Retry Connection',
          action: async () => {
            // Attempt reconnection
          },
          description: 'Try connecting to the device again'
        }
      ]
    )
    this.name = 'AudioDeviceError'
  }
}

/**
 * File Not Found Error
 *
 * Error when a required file cannot be located
 */
export class FileNotFoundError extends WhiteRoomError {
  constructor(path: string, context?: ErrorContext) {
    super(
      ErrorCategory.FILE_NOT_FOUND,
      ErrorSeverity.ERROR,
      'FILE_NOT_FOUND',
      `The file "${path}" could not be found.`,
      `File not found: ${path}`,
      { path, ...context },
      [
        {
          title: 'Browse for File',
          action: async () => {
            // Open file browser
          },
          description: 'Locate the file manually',
          isRecommended: true
        },
        {
          title: 'Create New File',
          action: async () => {
            // Create new file
          },
          description: 'Create a new file with default settings'
        }
      ]
    )
    this.name = 'FileNotFoundError'
  }
}

/**
 * File Corrupted Error
 *
 * Error when a file is corrupted or invalid
 */
export class FileCorruptedError extends WhiteRoomError {
  constructor(path: string, reason: string, context?: ErrorContext) {
    super(
      ErrorCategory.FILE_CORRUPTED,
      ErrorSeverity.ERROR,
      'FILE_CORRUPTED',
      `The file "${path}" is corrupted and cannot be loaded: ${reason}`,
      `File corrupted: ${path} - ${reason}`,
      { path, reason, ...context },
      [
        {
          title: 'Restore from Backup',
          action: async () => {
            // Restore from backup
          },
          description: 'Restore from automatic backup',
          isRecommended: true
        },
        {
          title: 'Recover Data',
          action: async () => {
            // Attempt data recovery
          },
          description: 'Attempt to recover partial data'
        },
        {
          title: 'Create New File',
          action: async () => {
            // Create new file
          },
          description: 'Create a new file to replace corrupted one'
        }
      ]
    )
    this.name = 'FileCorruptedError'
  }
}

/**
 * File Permission Error
 *
 * Error when lacking permissions to access a file
 */
export class FilePermissionError extends WhiteRoomError {
  constructor(path: string, operation: string, context?: ErrorContext) {
    super(
      ErrorCategory.FILE_PERMISSION,
      ErrorSeverity.ERROR,
      'FILE_PERMISSION',
      `Permission denied when trying to ${operation} "${path}"`,
      `File permission error: ${operation} - ${path}`,
      { path, operation, ...context },
      [
        {
          title: 'Choose Different Location',
          action: async () => {
            // Open file browser
          },
          description: 'Save to a location with write permissions',
          isRecommended: true
        },
        {
          title: 'Run as Administrator',
          action: async () => {
            // Prompt for admin
          },
          description: 'Request elevated permissions'
        }
      ]
    )
    this.name = 'FilePermissionError'
  }
}

/**
 * Network Error
 *
 * Error related to network operations
 */
export class NetworkError extends WhiteRoomError {
  constructor(operation: string, url: string, reason: string, context?: ErrorContext) {
    super(
      ErrorCategory.NETWORK_ERROR,
      ErrorSeverity.ERROR,
      'NETWORK_ERROR',
      `Network error while ${operation}: ${reason}`,
      `Network error: ${operation} - ${url} - ${reason}`,
      { operation, url, reason, ...context },
      [
        {
          title: 'Retry',
          action: async () => {
            // Retry operation
          },
          description: 'Try the operation again',
          isRecommended: true,
          isAutomatic: true
        },
        {
          title: 'Check Connection',
          action: async () => {
            // Check network
          },
          description: 'Verify your internet connection'
        }
      ]
    )
    this.name = 'NetworkError'
  }
}

/**
 * Timeout Error
 *
 * Error when an operation times out
 */
export class TimeoutError extends WhiteRoomError {
  constructor(operation: string, timeoutMs: number, context?: ErrorContext) {
    super(
      ErrorCategory.TIMEOUT,
      ErrorSeverity.WARNING,
      'TIMEOUT',
      `Operation "${operation}" timed out after ${timeoutMs}ms`,
      `Timeout: ${operation} - ${timeoutMs}ms`,
      { operation, timeoutMs, ...context },
      [
        {
          title: 'Retry',
          action: async () => {
            // Retry operation
          },
          description: 'Try the operation again',
          isRecommended: true,
          isAutomatic: true
        },
        {
          title: 'Increase Timeout',
          action: async () => {
            // Adjust timeout
          },
          description: 'Increase the timeout duration'
        }
      ]
    )
    this.name = 'TimeoutError'
  }
}

/**
 * Validation Error
 *
 * Error when input validation fails
 */
export class ValidationError extends WhiteRoomError {
  constructor(
    field: string,
    value: any,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCategory.VALIDATION_ERROR,
      ErrorSeverity.WARNING,
      'VALIDATION_ERROR',
      `Invalid value for ${field}: ${reason}`,
      `Validation failed: ${field} = ${JSON.stringify(value)} - ${reason}`,
      { field, value, reason, ...context },
      [
        {
          title: 'Fix Value',
          action: async () => {
            // Open field editor
          },
          description: 'Correct the invalid value',
          isRecommended: true
        },
        {
          title: 'Reset to Default',
          action: async () => {
            // Reset field
          },
          description: 'Reset to the default value'
        }
      ]
    )
    this.name = 'ValidationError'
  }
}

/**
 * Invalid Parameter Error
 *
 * Error when a function receives invalid parameters
 */
export class InvalidParameterError extends WhiteRoomError {
  constructor(
    functionName: string,
    paramName: string,
    value: any,
    expectedType: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCategory.INVALID_PARAMETER,
      ErrorSeverity.WARNING,
      'INVALID_PARAMETER',
      `Invalid parameter "${paramName}" for ${functionName}: expected ${expectedType}`,
      `Invalid parameter: ${functionName} - ${paramName} = ${JSON.stringify(value)}`,
      { functionName, paramName, value, expectedType, ...context },
      []
    )
    this.name = 'InvalidParameterError'
  }
}

/**
 * Invalid State Error
 *
 * Error when an operation is called in an invalid state
 */
export class InvalidStateError extends WhiteRoomError {
  constructor(
    operation: string,
    currentState: string,
    requiredStates: string[],
    context?: ErrorContext
  ) {
    super(
      ErrorCategory.INVALID_STATE,
      ErrorSeverity.ERROR,
      'INVALID_STATE',
      `Cannot ${operation} in current state "${currentState}"`,
      `Invalid state: ${operation} - current: ${currentState}, required: ${requiredStates.join(' or ')}`,
      { operation, currentState, requiredStates, ...context },
      []
    )
    this.name = 'InvalidStateError'
  }
}

/**
 * Not Initialized Error
 *
 * Error when using a component before initialization
 */
export class NotInitializedError extends WhiteRoomError {
  constructor(componentName: string, context?: ErrorContext) {
    super(
      ErrorCategory.NOT_INITIALIZED,
      ErrorSeverity.ERROR,
      'NOT_INITIALIZED',
      `"${componentName}" has not been initialized. Please initialize it before use.`,
      `Component not initialized: ${componentName}`,
      { componentName, ...context },
      [
        {
          title: 'Initialize Component',
          action: async () => {
            // Initialize component
          },
          description: 'Initialize the component now',
          isRecommended: true
        }
      ]
    )
    this.name = 'NotInitializedError'
  }
}

/**
 * Out of Memory Error
 *
 * Error when system runs out of memory
 */
export class OutOfMemoryError extends WhiteRoomError {
  constructor(operation: string, requiredBytes: number, context?: ErrorContext) {
    super(
      ErrorCategory.OUT_OF_MEMORY,
      ErrorSeverity.CRITICAL,
      'OUT_OF_MEMORY',
      `Not enough memory to complete operation: ${operation}`,
      `Out of memory: ${operation} - required: ${requiredBytes} bytes`,
      { operation, requiredBytes, ...context },
      [
        {
          title: 'Free Memory',
          action: async () => {
            // Free memory
          },
          description: 'Close other applications to free memory',
          isRecommended: true
        },
        {
          title: 'Reduce Project Size',
          action: async () => {
            // Reduce memory usage
          },
          description: 'Reduce project complexity or memory usage'
        }
      ]
    )
    this.name = 'OutOfMemoryError'
  }
}

/**
 * Disk Full Error
 *
 * Error when disk is full
 */
export class DiskFullError extends WhiteRoomError {
  constructor(path: string, requiredBytes: number, context?: ErrorContext) {
    super(
      ErrorCategory.DISK_FULL,
      ErrorSeverity.CRITICAL,
      'DISK_FULL',
      `Not enough disk space to save to "${path}"`,
      `Disk full: ${path} - required: ${requiredBytes} bytes`,
      { path, requiredBytes, ...context },
      [
        {
          title: 'Free Disk Space',
          action: async () => {
            // Open disk manager
          },
          description: 'Free up disk space',
          isRecommended: true
        },
        {
          title: 'Choose Different Location',
          action: async () => {
            // Open file browser
          },
          description: 'Save to a different disk with more space'
        }
      ]
    )
    this.name = 'DiskFullError'
  }
}

/**
 * User Cancelled Error
 *
 * Error when user cancels an operation
 */
export class UserCancelledError extends WhiteRoomError {
  constructor(operation: string, context?: ErrorContext) {
    super(
      ErrorCategory.USER_CANCELLED,
      ErrorSeverity.INFO,
      'USER_CANCELLED',
      `Operation "${operation}" was cancelled.`,
      `User cancelled: ${operation}`,
      { operation, ...context },
      []
    )
    this.name = 'UserCancelledError'
  }
}

/**
 * User Error
 *
 * Error caused by user action
 */
export class UserError extends WhiteRoomError {
  constructor(message: string, technicalDetails?: string, context?: ErrorContext) {
    super(
      ErrorCategory.USER_ERROR,
      ErrorSeverity.WARNING,
      'USER_ERROR',
      message,
      technicalDetails || message,
      context,
      []
    )
    this.name = 'UserError'
  }
}
