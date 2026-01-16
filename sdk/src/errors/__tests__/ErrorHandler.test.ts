/**
 * Error Handling System Tests
 *
 * Comprehensive test suite covering:
 * - Error type creation and properties
 * - Error handler functionality
 * - Validation guards
 * - Error recovery
 * - Error logging and reporting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WhiteRoomError,
  ErrorCategory,
  ErrorSeverity,
  AudioEngineError,
  FileNotFoundError,
  FileCorruptedError,
  ValidationError,
  NetworkError,
  TimeoutError,
  NotInitializedError
} from '../ErrorTypes'
import { ErrorHandler } from '../ErrorHandler'
import {
  validateNotNull,
  validateRange,
  validatePositive,
  validateNotEmpty,
  validateArrayNotEmpty,
  validateFileExists,
  validateAudioBuffer,
  validateBatch,
  validateIf
} from '../Validation'
import * as fs from 'fs'
import * as path from 'path'
import { os } from 'os'

describe('ErrorTypes', () => {
  describe('WhiteRoomError', () => {
    it('should create error with all properties', () => {
      const error = new WhiteRoomError(
        ErrorCategory.AUDIO_ENGINE,
        ErrorSeverity.CRITICAL,
        'TEST_ERROR',
        'User message',
        'Technical details',
        { key: 'value' },
        []
      )

      expect(error.category).toBe(ErrorCategory.AUDIO_ENGINE)
      expect(error.severity).toBe(ErrorSeverity.CRITICAL)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.userMessage).toBe('User message')
      expect(error.technicalDetails).toBe('Technical details')
      expect(error.context).toEqual({ key: 'value' })
      expect(error.recoveryActions).toEqual([])
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should format log string correctly', () => {
      const error = new WhiteRoomError(
        ErrorCategory.AUDIO_ENGINE,
        ErrorSeverity.ERROR,
        'TEST_ERROR',
        'User message',
        'Technical details',
        { key: 'value' }
      )

      const logString = error.toLogString()
      expect(logString).toContain('[ERROR]')
      expect(logString).toContain('TEST_ERROR')
      expect(logString).toContain('Technical details')
      expect(logString).toContain('key')
    })

    it('should serialize to JSON correctly', () => {
      const error = new WhiteRoomError(
        ErrorCategory.AUDIO_ENGINE,
        ErrorSeverity.ERROR,
        'TEST_ERROR',
        'User message',
        'Technical details',
        { key: 'value' }
      )

      const json = error.toJSON()
      expect(json.category).toBe(ErrorCategory.AUDIO_ENGINE)
      expect(json.severity).toBe(ErrorSeverity.ERROR)
      expect(json.code).toBe('TEST_ERROR')
      expect(json.userMessage).toBe('User message')
      expect(json.technicalDetails).toBe('Technical details')
      expect(json.context).toEqual({ key: 'value' })
    })
  })

  describe('AudioEngineError', () => {
    it('should create audio engine error with default recovery actions', () => {
      const error = new AudioEngineError(
        'DEVICE_FAILED',
        'Audio device failed',
        'Device not responding'
      )

      expect(error.category).toBe(ErrorCategory.AUDIO_ENGINE)
      expect(error.severity).toBe(ErrorSeverity.CRITICAL)
      expect(error.code).toBe('AUDIO_ENGINE_DEVICE_FAILED')
      expect(error.recoveryActions.length).toBeGreaterThan(0)
    })
  })

  describe('FileNotFoundError', () => {
    it('should create file not found error with recovery actions', () => {
      const error = new FileNotFoundError('/path/to/file.txt')

      expect(error.category).toBe(ErrorCategory.FILE_NOT_FOUND)
      expect(error.severity).toBe(ErrorSeverity.ERROR)
      expect(error.code).toBe('FILE_NOT_FOUND')
      expect(error.userMessage).toContain('/path/to/file.txt')
      expect(error.recoveryActions.length).toBeGreaterThan(0)
    })
  })

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('sampleRate', 0, 'Must be positive')

      expect(error.category).toBe(ErrorCategory.VALIDATION_ERROR)
      expect(error.severity).toBe(ErrorSeverity.WARNING)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.userMessage).toContain('sampleRate')
    })
  })

  describe('TimeoutError', () => {
    it('should create timeout error with automatic recovery', () => {
      const error = new TimeoutError('loadProject', 30000)

      expect(error.category).toBe(ErrorCategory.TIMEOUT)
      expect(error.severity).toBe(ErrorSeverity.WARNING)
      expect(error.code).toBe('TIMEOUT')
      expect(error.hasAutomaticRecovery()).toBe(true)
    })
  })
})

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler
  let tempLogDir: string
  let logFilePath: string

  beforeEach(() => {
    // Create temp directory for logs
    tempLogDir = `/tmp/whiteroom-test-${Date.now()}`
    logFilePath = path.join(tempLogDir, 'test-errors.log')
    fs.mkdirSync(tempLogDir, { recursive: true })

    // Create handler with test config
    errorHandler = new ErrorHandler({
      logFilePath,
      enableConsoleLogging: false,
      enableFileLogging: true,
      autoRecoveryEnabled: false
    })
  })

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempLogDir)) {
      fs.rmSync(tempLogDir, { recursive: true, force: true })
    }
  })

  describe('handleError', () => {
    it('should handle WhiteRoomError correctly', async () => {
      const error = new WhiteRoomError(
        ErrorCategory.AUDIO_ENGINE,
        ErrorSeverity.ERROR,
        'TEST_ERROR',
        'Test message'
      )

      await errorHandler.handleError(error)

      const log = errorHandler.getErrorLog()
      expect(log.length).toBe(1)
      expect(log[0].code).toBe('TEST_ERROR')
    })

    it('should convert standard Error to WhiteRoomError', async () => {
      const error = new Error('Standard error')

      await errorHandler.handleError(error)

      const log = errorHandler.getErrorLog()
      expect(log.length).toBe(1)
      expect(log[0].code).toBeDefined()
    })

    it('should convert file not found error correctly', async () => {
      const error = new Error('ENOENT: no such file, open \'/test.txt\'')

      await errorHandler.handleError(error)

      const log = errorHandler.getErrorLog()
      expect(log.length).toBe(1)
      expect(log[0].category).toBe(ErrorCategory.FILE_NOT_FOUND)
    })

    it('should write to log file', async () => {
      const error = new WhiteRoomError(
        ErrorCategory.AUDIO_ENGINE,
        ErrorSeverity.ERROR,
        'TEST_ERROR',
        'Test message'
      )

      await errorHandler.handleError(error)

      expect(fs.existsSync(logFilePath)).toBe(true)

      const logContent = fs.readFileSync(logFilePath, 'utf-8')
      expect(logContent).toContain('TEST_ERROR')
    })

    it('should notify error listeners', async () => {
      const listener = vi.fn()
      const unsubscribe = errorHandler.onError(listener)

      const error = new WhiteRoomError(
        ErrorCategory.AUDIO_ENGINE,
        ErrorSeverity.ERROR,
        'TEST_ERROR',
        'Test message'
      )

      await errorHandler.handleError(error)

      expect(listener).toHaveBeenCalledWith(error)

      unsubscribe()
    })
  })

  describe('getErrorLog', () => {
    beforeEach(async () => {
      // Add some errors
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.AUDIO_ENGINE, ErrorSeverity.ERROR, 'ERROR_1', 'Message 1')
      )
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.FILE_NOT_FOUND, ErrorSeverity.WARNING, 'WARN_1', 'Message 2')
      )
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.AUDIO_ENGINE, ErrorSeverity.ERROR, 'ERROR_2', 'Message 3')
      )
    })

    it('should return all errors', () => {
      const log = errorHandler.getErrorLog()
      expect(log.length).toBe(3)
    })

    it('should filter by category', () => {
      const log = errorHandler.getErrorLog({ category: ErrorCategory.AUDIO_ENGINE })
      expect(log.length).toBe(2)
    })

    it('should filter by severity', () => {
      const log = errorHandler.getErrorLog({ severity: ErrorSeverity.ERROR })
      expect(log.length).toBe(2)
    })

    it('should filter by code', () => {
      const log = errorHandler.getErrorLog({ code: 'ERROR_1' })
      expect(log.length).toBe(1)
    })

    it('should limit results', () => {
      const log = errorHandler.getErrorLog({ limit: 2 })
      expect(log.length).toBe(2)
    })
  })

  describe('getErrorStatistics', () => {
    beforeEach(async () => {
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.AUDIO_ENGINE, ErrorSeverity.ERROR, 'ERROR_1', 'Message 1')
      )
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.AUDIO_ENGINE, ErrorSeverity.ERROR, 'ERROR_1', 'Message 2')
      )
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.FILE_NOT_FOUND, ErrorSeverity.WARNING, 'WARN_1', 'Message 3')
      )
    })

    it('should calculate total errors', () => {
      const stats = errorHandler.getErrorStatistics()
      expect(stats.totalErrors).toBe(3)
    })

    it('should count errors by category', () => {
      const stats = errorHandler.getErrorStatistics()
      expect(stats.errorsByCategory[ErrorCategory.AUDIO_ENGINE]).toBe(2)
      expect(stats.errorsByCategory[ErrorCategory.FILE_NOT_FOUND]).toBe(1)
    })

    it('should count errors by severity', () => {
      const stats = errorHandler.getErrorStatistics()
      expect(stats.errorsBySeverity[ErrorSeverity.ERROR]).toBe(2)
      expect(stats.errorsBySeverity[ErrorSeverity.WARNING]).toBe(1)
    })

    it('should track most frequent errors', () => {
      const stats = errorHandler.getErrorStatistics()
      expect(stats.mostFrequentErrors[0].code).toBe('ERROR_1')
      expect(stats.mostFrequentErrors[0].count).toBe(2)
    })

    it('should include recent errors', () => {
      const stats = errorHandler.getErrorStatistics()
      expect(stats.recentErrors.length).toBeLessThanOrEqual(10)
    })
  })

  describe('exportErrorReport', () => {
    it('should export error report as JSON', async () => {
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.AUDIO_ENGINE, ErrorSeverity.ERROR, 'ERROR_1', 'Message 1')
      )

      const report = await errorHandler.exportErrorReport()

      expect(() => JSON.parse(report)).not.toThrow()

      const parsed = JSON.parse(report)
      expect(parsed.generatedAt).toBeDefined()
      expect(parsed.summary).toBeDefined()
      expect(errors).toBeDefined()
    })
  })

  describe('clearErrorLog', () => {
    it('should clear error log', async () => {
      await errorHandler.handleError(
        new WhiteRoomError(ErrorCategory.AUDIO_ENGINE, ErrorSeverity.ERROR, 'ERROR_1', 'Message 1')
      )

      expect(errorHandler.getErrorLog().length).toBe(1)

      errorHandler.clearErrorLog()

      expect(errorHandler.getErrorLog().length).toBe(0)
    })
  })
})

describe('Validation', () => {
  describe('validateNotNull', () => {
    it('should return value if not null', () => {
      expect(validateNotNull('test', 'param')).toBe('test')
      expect(validateNotNull(0, 'param')).toBe(0)
      expect(validateNotNull(false, 'param')).toBe(false)
    })

    it('should throw if null', () => {
      expect(() => validateNotNull(null, 'param')).toThrow(ValidationError)
    })

    it('should throw if undefined', () => {
      expect(() => validateNotNull(undefined, 'param')).toThrow(ValidationError)
    })
  })

  describe('validateRange', () => {
    it('should return value if in range', () => {
      expect(validateRange(5, 0, 10, 'param')).toBe(5)
      expect(validateRange(0, 0, 10, 'param')).toBe(0)
      expect(validateRange(10, 0, 10, 'param')).toBe(10)
    })

    it('should throw if out of range', () => {
      expect(() => validateRange(-1, 0, 10, 'param')).toThrow(ValidationError)
      expect(() => validateRange(11, 0, 10, 'param')).toThrow(ValidationError)
    })

    it('should throw if NaN', () => {
      expect(() => validateRange(NaN, 0, 10, 'param')).toThrow(ValidationError)
    })
  })

  describe('validatePositive', () => {
    it('should return value if positive', () => {
      expect(validatePositive(1, 'param')).toBe(1)
      expect(validatePositive(0.5, 'param')).toBe(0.5)
    })

    it('should throw if zero', () => {
      expect(() => validatePositive(0, 'param')).toThrow(ValidationError)
    })

    it('should throw if negative', () => {
      expect(() => validatePositive(-1, 'param')).toThrow(ValidationError)
    })
  })

  describe('validateNotEmpty', () => {
    it('should return value if not empty', () => {
      expect(validateNotEmpty('test', 'param')).toBe('test')
      expect(validateNotEmpty(' test ', 'param')).toBe(' test ')
    })

    it('should throw if empty', () => {
      expect(() => validateNotEmpty('', 'param')).toThrow(ValidationError)
    })

    it('should throw if whitespace only', () => {
      expect(() => validateNotEmpty('   ', 'param')).toThrow(ValidationError)
    })
  })

  describe('validateArrayNotEmpty', () => {
    it('should return array if not empty', () => {
      const arr = [1, 2, 3]
      expect(validateArrayNotEmpty(arr, 'param')).toBe(arr)
    })

    it('should throw if empty', () => {
      expect(() => validateArrayNotEmpty([], 'param')).toThrow(ValidationError)
    })
  })

  describe('validateFileExists', () => {
    it('should not throw if file exists', () => {
      const testFile = path.join(os.tmpdir(), 'test-exists.txt')
      fs.writeFileSync(testFile, 'test')

      expect(() => validateFileExists(testFile)).not.toThrow()

      fs.unlinkSync(testFile)
    })

    it('should throw if file does not exist', () => {
      expect(() => validateFileExists('/nonexistent/file.txt')).toThrow(FileNotFoundError)
    })
  })

  describe('validateAudioBuffer', () => {
    it('should validate correct parameters', () => {
      expect(() => validateAudioBuffer(44100, 2, 512)).not.toThrow()
      expect(() => validateAudioBuffer(48000, 1, 1024)).not.toThrow()
    })

    it('should throw on invalid sample rate', () => {
      expect(() => validateAudioBuffer(0, 2, 512)).toThrow(ValidationError)
      expect(() => validateAudioBuffer(-44100, 2, 512)).toThrow(ValidationError)
      expect(() => validateAudioBuffer(1000000, 2, 512)).toThrow(ValidationError)
    })

    it('should throw on invalid channels', () => {
      expect(() => validateAudioBuffer(44100, 0, 512)).toThrow(ValidationError)
      expect(() => validateAudioBuffer(44100, -1, 512)).toThrow(ValidationError)
      expect(() => validateAudioBuffer(44100, 200, 512)).toThrow(ValidationError)
    })

    it('should throw on invalid frames', () => {
      expect(() => validateAudioBuffer(44100, 2, 0)).toThrow(ValidationError)
      expect(() => validateAudioBuffer(44100, 2, -1)).toThrow(ValidationError)
    })
  })

  describe('validateBatch', () => {
    it('should pass all validations', () => {
      expect(() => {
        validateBatch([
          () => validatePositive(1, 'a'),
          () => validateRange(5, 0, 10, 'b'),
          () => validateNotEmpty('test', 'c')
        ])
      }).not.toThrow()
    })

    it('should aggregate validation errors', () => {
      expect(() => {
        validateBatch([
          () => validatePositive(1, 'a'),
          () => validateRange(15, 0, 10, 'b'),  // fails
          () => validateNotEmpty('', 'c')       // fails
        ])
      }).toThrow(ValidationError)
    })
  })

  describe('validateIf', () => {
    it('should validate if condition is true', () => {
      expect(() => {
        validateIf(true, () => validatePositive(1, 'param'))
      }).not.toThrow()
    })

    it('should not validate if condition is false', () => {
      expect(() => {
        validateIf(false, () => validatePositive(-1, 'param'))
      }).not.toThrow()
    })
  })
})
