/**
 * Error Prevention and Validation Guards
 *
 * Comprehensive set of validation functions and guards to prevent errors
 * before they occur. These should be used throughout the codebase to
 * ensure data integrity and catch issues early.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  ValidationError,
  InvalidParameterError,
  FileNotFoundError,
  NotInitializedError,
  OutOfMemoryError
} from './ErrorTypes'

/**
 * Validate that a value is not null or undefined
 *
 * @param value - The value to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated value
 * @throws ValidationError if value is null or undefined
 */
export function validateNotNull<T>(value: T | null | undefined, paramName: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(paramName, value, 'Cannot be null or undefined')
  }
  return value
}

/**
 * Validate that a string is not empty
 *
 * @param value - The string to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated string
 * @throws ValidationError if string is empty
 */
export function validateNotEmpty(value: string, paramName: string): string {
  if (value.trim().length === 0) {
    throw new ValidationError(paramName, value, 'Cannot be empty')
  }
  return value
}

/**
 * Validate that a number is within a specified range
 *
 * @param value - The number to check
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param paramName - The parameter name for error messaging
 * @returns The validated number
 * @throws ValidationError if number is out of range
 */
export function validateRange(value: number, min: number, max: number, paramName: string): number {
  if (isNaN(value)) {
    throw new ValidationError(paramName, value, 'Must be a valid number')
  }

  if (value < min || value > max) {
    throw new ValidationError(paramName, value, `Must be between ${min} and ${max}`)
  }

  return value
}

/**
 * Validate that a number is positive
 *
 * @param value - The number to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated number
 * @throws ValidationError if number is not positive
 */
export function validatePositive(value: number, paramName: string): number {
  if (value <= 0) {
    throw new ValidationError(paramName, value, 'Must be positive')
  }
  return value
}

/**
 * Validate that a number is non-negative
 *
 * @param value - The number to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated number
 * @throws ValidationError if number is negative
 */
export function validateNonNegative(value: number, paramName: string): number {
  if (value < 0) {
    throw new ValidationError(paramName, value, 'Must be non-negative')
  }
  return value
}

/**
 * Validate that a value is of the expected type
 *
 * @param value - The value to check
 * @param expectedType - The expected type name
 * @param paramName - The parameter name for error messaging
 * @returns The validated value
 * @throws InvalidParameterError if type doesn't match
 */
export function validateType(value: any, expectedType: string, paramName: string): any {
  const actualType = typeof value

  if (actualType !== expectedType) {
    throw new InvalidParameterError(
      'validateType',
      paramName,
      value,
      expectedType
    )
  }

  return value
}

/**
 * Validate that a value is an array
 *
 * @param value - The value to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated array
 * @throws InvalidParameterError if value is not an array
 */
export function validateArray(value: any, paramName: string): any[] {
  if (!Array.isArray(value)) {
    throw new InvalidParameterError('validateArray', paramName, value, 'array')
  }
  return value
}

/**
 * Validate that an array is not empty
 *
 * @param value - The array to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated array
 * @throws ValidationError if array is empty
 */
export function validateArrayNotEmpty(value: any[], paramName: string): any[] {
  if (value.length === 0) {
    throw new ValidationError(paramName, value, 'Cannot be empty')
  }
  return value
}

/**
 * Validate that a file exists
 *
 * @param filePath - The path to check
 * @throws FileNotFoundError if file doesn't exist
 */
export function validateFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new FileNotFoundError(filePath)
  }
}

/**
 * Validate that a file is readable
 *
 * @param filePath - The path to check
 * @throws ValidationError if file is not readable
 */
export function validateFileReadable(filePath: string): void {
  try {
    fs.accessSync(filePath, fs.constants.R_OK)
  } catch (err) {
    throw new ValidationError(filePath, filePath, 'File is not readable', { error: err })
  }
}

/**
 * Validate that a file is writable
 *
 * @param filePath - The path to check
 * @throws ValidationError if file is not writable
 */
export function validateFileWritable(filePath: string): void {
  try {
    fs.accessSync(filePath, fs.constants.W_OK)
  } catch (err) {
    throw new ValidationError(filePath, filePath, 'File is not writable', { error: err })
  }
}

/**
 * Validate that a directory exists
 *
 * @param dirPath - The directory path to check
 * @param create - Whether to create the directory if it doesn't exist
 * @throws ValidationError if directory doesn't exist and create is false
 */
export function validateDirectory(dirPath: string, create: boolean = false): void {
  if (!fs.existsSync(dirPath)) {
    if (create) {
      try {
        fs.mkdirSync(dirPath, { recursive: true })
      } catch (err) {
        throw new ValidationError(dirPath, dirPath, 'Failed to create directory', { error: err })
      }
    } else {
      throw new ValidationError(dirPath, dirPath, 'Directory does not exist')
    }
  }
}

/**
 * Validate that a value is one of a set of allowed values
 *
 * @param value - The value to check
 * @param allowedValues - Array of allowed values
 * @param paramName - The parameter name for error messaging
 * @returns The validated value
 * @throws ValidationError if value is not in allowed values
 */
export function validateOneOf<T>(value: T, allowedValues: T[], paramName: string): T {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      paramName,
      value,
      `Must be one of: ${allowedValues.join(', ')}`
    )
  }
  return value
}

/**
 * Validate that a string matches a pattern
 *
 * @param value - The string to check
 * @param pattern - Regular expression pattern
 * @param paramName - The parameter name for error messaging
 * @returns The validated string
 * @throws ValidationError if string doesn't match pattern
 */
export function validatePattern(value: string, pattern: RegExp, paramName: string): string {
  if (!pattern.test(value)) {
    throw new ValidationError(
      paramName,
      value,
      `Must match pattern: ${pattern.toString()}`
    )
  }
  return value
}

/**
 * Validate that a string is a valid email address
 *
 * @param value - The string to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated email
 * @throws ValidationError if string is not a valid email
 */
export function validateEmail(value: string, paramName: string = 'email'): string {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return validatePattern(value, emailPattern, paramName)
}

/**
 * Validate that a string is a valid URL
 *
 * @param value - The string to check
 * @param paramName - The parameter name for error messaging
 * @returns The validated URL
 * @throws ValidationError if string is not a valid URL
 */
export function validateURL(value: string, paramName: string = 'url'): string {
  try {
    new URL(value)
    return value
  } catch (err) {
    throw new ValidationError(paramName, value, 'Must be a valid URL')
  }
}

/**
 * Validate that an object has been initialized
 *
 * @param obj - The object to check
 * @param componentName - The component name for error messaging
 * @returns The validated object
 * @throws NotInitializedError if object is null or undefined
 */
export function validateInitialized<T>(obj: T | null | undefined, componentName: string): T {
  if (obj === null || obj === undefined) {
    throw new NotInitializedError(componentName)
  }
  return obj
}

/**
 * Validate memory availability
 *
 * @param requiredBytes - The amount of memory required
 * @param operation - The operation name for error messaging
 * @throws OutOfMemoryError if insufficient memory
 */
export function validateMemoryAvailable(requiredBytes: number, operation: string): void {
  const freeMemory = process.memoryUsage().heap_total

  // Add safety margin (require 2x the amount needed)
  const requiredWithMargin = requiredBytes * 2

  if (freeMemory < requiredWithMargin) {
    throw new OutOfMemoryError(operation, requiredBytes)
  }
}

/**
 * Validate that a promise resolves within a timeout
 *
 * @param promise - The promise to validate
 * @param timeoutMs - Timeout in milliseconds
 * @param operation - The operation name for error messaging
 * @returns The promise result
 * @throws TimeoutError if promise doesn't resolve in time
 */
export async function validateTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const { TimeoutError } = require('./ErrorTypes')
      reject(new TimeoutError(operation, timeoutMs))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * Validate that a function is called with correct arguments
 *
 * @param func - The function to call
 * @param args - Arguments to validate
 * @param functionName - Function name for error messaging
 * @returns The function result
 */
export async function validateFunctionCall<T>(
  func: (...args: any[]) => T,
  args: any[],
  functionName: string
): Promise<T> {
  try {
    return func(...args)
  } catch (err) {
    if (err instanceof Error) {
      throw new ValidationError(
        functionName,
        args,
        err.message,
        { originalError: err }
      )
    }
    throw err
  }
}

/**
 * Validate audio buffer parameters
 *
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels
 * @param frames - Number of frames
 * @throws ValidationError if parameters are invalid
 */
export function validateAudioBuffer(
  sampleRate: number,
  channels: number,
  frames: number
): void {
  validatePositive(sampleRate, 'sampleRate')
  validatePositive(channels, 'channels')
  validatePositive(frames, 'frames')

  // Validate typical audio ranges
  if (sampleRate < 8000 || sampleRate > 192000) {
    throw new ValidationError(
      'sampleRate',
      sampleRate,
      'Must be between 8000 and 192000 Hz'
    )
  }

  if (channels < 1 || channels > 128) {
    throw new ValidationError(
      'channels',
      channels,
      'Must be between 1 and 128'
    )
  }
}

/**
 * Validate audio device parameters
 *
 * @param deviceId - Device ID
 * @param sampleRate - Sample rate in Hz
 * @param bufferSize - Buffer size in frames
 * @throws ValidationError if parameters are invalid
 */
export function validateAudioDevice(
  deviceId: string,
  sampleRate: number,
  bufferSize: number
): void {
  validateNotEmpty(deviceId, 'deviceId')
  validatePositive(sampleRate, 'sampleRate')
  validatePositive(bufferSize, 'bufferSize')

  // Validate buffer size is power of 2
  const log2 = Math.log2(bufferSize)
  if (!Number.isInteger(log2)) {
    throw new ValidationError(
      'bufferSize',
      bufferSize,
      'Must be a power of 2'
    )
  }

  // Validate typical buffer sizes
  if (bufferSize < 32 || bufferSize > 8192) {
    throw new ValidationError(
      'bufferSize',
      bufferSize,
      'Must be between 32 and 8192'
    )
  }
}

/**
 * Validate project state transitions
 *
 * @param currentState - Current state
 * @param newState - New state
 * @param allowedTransitions - Map of allowed state transitions
 * @throws InvalidStateError if transition is not allowed
 */
export function validateStateTransition(
  currentState: string,
  newState: string,
  allowedTransitions: Record<string, string[]>
): void {
  const { InvalidStateError } = require('./ErrorTypes')

  const allowedStates = allowedTransitions[currentState]

  if (!allowedStates || !allowedStates.includes(newState)) {
    throw new InvalidStateError(
      `transition from ${currentState} to ${newState}`,
      currentState,
      allowedStates
    )
  }
}

/**
 * Batch validation - validate multiple values at once
 *
 * @param validations - Array of validation functions to run
 * @throws ValidationError with aggregated errors
 */
export function validateBatch(validations: Array<() => void>): void {
  const errors: string[] = []

  for (const validation of validations) {
    try {
      validation()
    } catch (err) {
      if (err instanceof Error) {
        errors.push(err.message)
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'batch',
      errors,
      `${errors.length} validation errors: ${errors.join('; ')}`
    )
  }
}

/**
 * Conditional validation - validate only if condition is met
 *
 * @param condition - Whether to run validation
 * @param validation - Validation function to run
 */
export function validateIf(condition: boolean, validation: () => void): void {
  if (condition) {
    validation()
  }
}

/**
 * Async validation - validate async operation result
 *
 * @param promise - Promise that should resolve to a valid value
 * @param validation - Validation function to run on resolved value
 * @returns Validated value
 */
export async function validateAsync<T>(
  promise: Promise<T>,
  validation: (value: T) => void
): Promise<T> {
  const value = await promise
  validation(value)
  return value
}
