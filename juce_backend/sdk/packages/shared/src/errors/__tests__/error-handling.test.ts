/**
 * Comprehensive unit tests for error handling
 * Tests all edge cases and invalid inputs across the SDK
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ValidationError as _ValidationError,
  ProcessingError as _ProcessingError,
  NetworkError,
  AuthenticationError,
  SchillingerError,
  ErrorHandler,
  createErrorWithContext,
  isRetryableError,
  formatErrorMessage,
} from '../index';

describe('Error Handling - Comprehensive Edge Cases', () => {
  describe('_ValidationError', () => {
    it('should create validation error with all properties', () => {
      const error = new _ValidationError(
        'testField',
        'invalidValue',
        'valid value',
        {
          errors: ['Error 1', 'Error 2'],
          warnings: ['Warning 1'],
          suggestions: ['Try this'],
          context: 'test context',
        }
      );

      expect(error).toBeInstanceOf(_ValidationError);
      expect(error).toBeInstanceOf(SchillingerError);
      expect(error).toBeInstanceOf(Error);

      expect(error.name).toBe('_ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe('validation');
      expect(error.field).toBe('testField');
      expect(error.value).toBe('invalidValue');
      expect(error.expected).toBe('valid value');
      expect(error.details?.errors).toEqual(['Error 1', 'Error 2']);
      expect(error.details?.warnings).toEqual(['Warning 1']);
      expect(error.details?.suggestions).toEqual(['Try this']);
      expect(error.details?.context).toBe('test context');
    });

    it('should handle minimal validation error', () => {
      const error = new _ValidationError('field', 'value', 'expected');

      expect(error).toBeInstanceOf(_ValidationError);
      expect(error.field).toBe('field');
      expect(error.value).toBe('value');
      expect(error.expected).toBe('expected');
      expect(error.details).toEqual({
        field: 'field',
        value: 'value',
        expected: 'expected',
      });
    });

    it('should create meaningful error messages', () => {
      const error = new _ValidationError(
        'tempo',
        400,
        'tempo between 40-300 BPM'
      );

      expect(error.message).toContain('tempo');
      expect(error.message).toContain('400');
      expect(error.message).toContain('tempo between 40-300 BPM');
    });

    it('should handle complex objects as values', () => {
      const complexValue = { generators: [3, 3], tempo: 400 };
      const error = new _ValidationError(
        'parameters',
        complexValue,
        'valid parameters'
      );

      expect(error.value).toEqual(complexValue);
      expect(error.message).toContain('parameters');
    });

    it('should handle null and undefined values', () => {
      const nullError = new _ValidationError('field', null, 'non-null value');
      const undefinedError = new _ValidationError(
        'field',
        undefined,
        'defined value'
      );

      expect(nullError.value).toBeNull();
      expect(undefinedError.value).toBeUndefined();
      expect(nullError.message).toContain('null');
      expect(undefinedError.message).toContain('undefined');
    });
  });

  describe('_ProcessingError', () => {
    it('should create processing error with operation context', () => {
      const error = new _ProcessingError(
        'generate rhythm',
        'Invalid generator combination'
      );

      expect(error).toBeInstanceOf(_ProcessingError);
      expect(error.name).toBe('_ProcessingError');
      expect(error.code).toBe('PROCESSING_ERROR');
      expect(error.category).toBe('processing');
      expect(error.operation).toBe('generate rhythm');
      expect(error.message).toContain('generate rhythm');
      expect(error.message).toContain('Invalid generator combination');
    });

    it('should handle nested errors', () => {
      const originalError = new Error('Original cause');
      const processingError = new _ProcessingError(
        'complex operation',
        'Failed',
        originalError
      );

      expect(processingError.cause).toBe(originalError);
      expect(processingError.message).toContain('complex operation');
    });

    it('should provide helpful suggestions', () => {
      const error = new _ProcessingError(
        'pattern generation',
        'Generators too large',
        undefined,
        {
          suggestions: [
            'Try with different parameters',
            'Check input data format',
            'Reduce complexity if applicable',
            'Ensure all required fields are provided',
          ],
        }
      );

      expect(error.suggestions).toEqual([
        'Try with different parameters',
        'Check input data format',
        'Reduce complexity if applicable',
        'Ensure all required fields are provided',
      ]);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with status code', () => {
      const error = new NetworkError('Request failed', 404);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.category).toBe('network');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Request failed');
    });

    it('should handle network errors without status codes', () => {
      const error = new NetworkError('Connection timeout');

      expect(error.statusCode).toBeUndefined();
      expect(error.message).toContain('Connection timeout');
    });

    it('should provide appropriate suggestions for different status codes', () => {
      const errors = [
        new NetworkError('Not found', 404),
        new NetworkError('Server error', 500),
        new NetworkError('Rate limited', 429),
        new NetworkError('Unauthorized', 401),
      ];

      errors.forEach(error => {
        expect(error.suggestions).toBeDefined();
        expect(error.suggestions!.length).toBeGreaterThan(0);
      });
    });

    it('should identify retryable errors correctly', () => {
      const retryableErrors = [
        new NetworkError('Server error', 500),
        new NetworkError('Bad gateway', 502),
        new NetworkError('Service unavailable', 503),
        new NetworkError('Gateway timeout', 504),
        new NetworkError('Rate limited', 429),
      ];

      const nonRetryableErrors = [
        new NetworkError('Bad request', 400),
        new NetworkError('Unauthorized', 401),
        new NetworkError('Forbidden', 403),
        new NetworkError('Not found', 404),
      ];

      retryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid API key');

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.category).toBe('auth');
      expect(error.message).toContain('Invalid API key');
    });

    it('should provide authentication-specific suggestions', () => {
      const error = new AuthenticationError('Token expired');

      expect(error.suggestions).toBeDefined();
      expect(
        error.suggestions!.some(
          s => s.includes('token') || s.includes('credential')
        )
      ).toBe(true);
    });

    it('should handle different authentication failure types', () => {
      const errorTypes = [
        'Invalid credentials',
        'Token expired',
        'Insufficient permissions',
        'Account suspended',
      ];

      errorTypes.forEach(message => {
        const error = new AuthenticationError(message);
        expect(error.message).toContain(message);
        expect(error.suggestions).toBeDefined();
      });
    });
  });

  describe('SchillingerError Base Class', () => {
    it('should create base error with all properties', () => {
      const error = new SchillingerError('Test error', 'TEST_CODE', 'test');

      expect(error.name).toBe('SchillingerError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.category).toBe('test');
      expect(error.message).toBe('Test error');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should handle details and suggestions', () => {
      const error = new SchillingerError('Test error', 'TEST_CODE', 'test', {
        details: { key: 'value' },
        suggestions: ['Suggestion 1', 'Suggestion 2'],
      });

      expect(error.details).toEqual({ key: 'value' });
      expect(error.suggestions).toEqual(['Suggestion 1', 'Suggestion 2']);
    });

    it('should serialize to JSON correctly', () => {
      const error = new SchillingerError('Test error', 'TEST_CODE', 'test', {
        details: { context: 'test' },
        suggestions: ['Try again'],
      });

      const json = JSON.parse(JSON.stringify(error));

      expect(json.name).toBe('SchillingerError');
      expect(json.code).toBe('TEST_CODE');
      expect(json.category).toBe('test');
      expect(json.message).toBe('Test error');
      expect(json.details).toEqual({ context: 'test' });
      expect(json.suggestions).toEqual(['Try again']);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Error Utilities', () => {
    describe('createErrorWithContext', () => {
      it('should create error with additional context', () => {
        const originalError = new _ValidationError(
          'field',
          'value',
          'expected'
        );
        const contextualError = createErrorWithContext(originalError, {
          operation: 'test operation',
          userId: 'user123',
          requestId: 'req456',
        });

        expect(contextualError.details?.operation).toBe('test operation');
        expect(contextualError.details?.userId).toBe('user123');
        expect(contextualError.details?.requestId).toBe('req456');
      });

      it('should preserve original error properties', () => {
        const originalError = new _ValidationError(
          'field',
          'value',
          'expected',
          {
            errors: ['Original error'],
          }
        );

        const contextualError = createErrorWithContext(originalError, {
          newContext: 'added',
        });

        if (contextualError instanceof _ValidationError) {
          expect(contextualError.field).toBe('field');
          expect(contextualError.value).toBe('value');
          expect(contextualError.expected).toBe('expected');
        } else {
          expect(contextualError.details).toEqual({
            field: 'field',
            value: 'value',
            expected: 'expected',
          });
        }
        expect(contextualError.details?.errors).toEqual(['Original error']);
        expect(contextualError.details?.newContext).toBe('added');
      });

      it('should handle non-Schillinger errors', () => {
        const genericError = new Error('Generic error');
        const contextualError = createErrorWithContext(genericError, {
          context: 'test',
        });

        expect(contextualError).toBeInstanceOf(SchillingerError);
        expect(contextualError.message).toContain('Generic error');
        expect(contextualError.details?.context).toBe('test');
      });
    });

    describe('isRetryableError', () => {
      it('should identify retryable network errors', () => {
        const retryableErrors = [
          new NetworkError('Server error', 500),
          new NetworkError('Bad gateway', 502),
          new NetworkError('Service unavailable', 503),
          new NetworkError('Gateway timeout', 504),
          new NetworkError('Rate limited', 429),
        ];

        retryableErrors.forEach(error => {
          expect(isRetryableError(error)).toBe(true);
        });
      });

      it('should identify non-retryable errors', () => {
        const nonRetryableErrors = [
          new _ValidationError('field', 'value', 'expected'),
          new AuthenticationError('Invalid token'),
          new _ProcessingError('operation', 'Invalid input'),
          new NetworkError('Bad request', 400),
          new NetworkError('Not found', 404),
          new Error('Generic error'),
        ];

        nonRetryableErrors.forEach(error => {
          expect(isRetryableError(error)).toBe(false);
        });
      });

      it('should handle timeout errors as retryable', () => {
        const timeoutError = new NetworkError('Request timeout');
        expect(isRetryableError(timeoutError)).toBe(true);
      });
    });

    describe('formatErrorMessage', () => {
      it('should format Schillinger errors with full details', () => {
        const error = new _ValidationError('tempo', 400, 'valid tempo', {
          errors: ['Too fast'],
          suggestions: ['Use 40-300 BPM'],
        });

        const formatted = formatErrorMessage(error);

        expect(formatted).toContain('_ValidationError');
        expect(formatted).toContain('tempo');
        expect(formatted).toContain('400');
        expect(formatted).toContain('Too fast');
        expect(formatted).toContain('Use 40-300 BPM');
      });

      it('should format generic errors', () => {
        const error = new Error('Generic error message');
        const formatted = formatErrorMessage(error);

        expect(formatted).toContain('Error');
        expect(formatted).toContain('Generic error message');
      });

      it('should handle errors without messages', () => {
        const error = new Error();
        const formatted = formatErrorMessage(error);

        expect(formatted).toContain('Error');
        expect(formatted).toContain('Unknown error');
      });

      it('should include stack trace in development mode', () => {
        const error = new _ValidationError('field', 'value', 'expected');
        const formatted = formatErrorMessage(error, { includeStack: true });

        expect(formatted).toContain('Stack trace:');
        expect(formatted).toContain('at ');
      });
    });
  });

  describe('ErrorHandler Class', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
      errorHandler = new ErrorHandler({
        logErrors: false, // Disable logging in tests
        includeStackTrace: false,
      });
    });

    it('should handle validation errors', () => {
      const error = new _ValidationError('field', 'value', 'expected');
      const handled = errorHandler.handle(error);

      expect(handled).toBeInstanceOf(_ValidationError);
      expect(handled.message).toContain('field');
    });

    it('should convert generic errors to Schillinger errors', () => {
      const genericError = new Error('Generic error');
      const handled = errorHandler.handle(genericError);

      expect(handled).toBeInstanceOf(SchillingerError);
      expect(handled.message).toContain('Generic error');
      expect(handled.code).toBe('UNKNOWN_ERROR');
    });

    it('should add context to errors', () => {
      const error = new _ProcessingError('operation', 'failed');
      const handled = errorHandler.handle(error, {
        userId: 'user123',
        operation: 'test',
      });

      expect(handled.details?.userId).toBe('user123');
      expect(handled.details?.operation).toBe('test');
    });

    it('should sanitize sensitive information', () => {
      const error = new _ValidationError(
        'apiKey',
        'secret-key-123',
        'valid key'
      );
      const handled = errorHandler.handle(error, {}, { sanitize: true });

      if (handled instanceof _ValidationError) {
        expect(handled.value).toBe('[REDACTED]');
      } else {
        expect(handled.details?.value).toBe('[REDACTED]');
      }
      expect(handled.message).not.toContain('secret-key-123');
    });

    it('should track error metrics', () => {
      const errors = [
        new _ValidationError('field1', 'value1', 'expected1'),
        new _ValidationError('field2', 'value2', 'expected2'),
        new _ProcessingError('op1', 'failed'),
        new NetworkError('request failed', 500),
      ];

      errors.forEach(error => errorHandler.handle(error));

      const metrics = errorHandler.getMetrics();
      expect(metrics.totalErrors).toBe(4);
      expect(metrics.errorsByCategory.validation).toBe(2);
      expect(metrics.errorsByCategory.processing).toBe(1);
      expect(metrics.errorsByCategory.network).toBe(1);
    });

    it('should provide error recovery suggestions', () => {
      const error = new NetworkError('Connection failed', 503);
      const handled = errorHandler.handle(error);

      expect(handled.suggestions).toBeDefined();
      expect(handled.suggestions!.length).toBeGreaterThan(0);
      expect(handled.suggestions!.some(s => s.includes('retry'))).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle circular references in error details', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        new _ValidationError('field', circular, 'expected');
      }).not.toThrow();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const error = new _ProcessingError('operation', longMessage);

      expect(error.message.length).toBeGreaterThan(1000);
      expect(error.message).toContain('operation');
    });

    it('should handle unicode characters in error messages', () => {
      const unicodeMessage = 'Error with unicode: 🎵 ♪ ♫ ♬ 中文 العربية';
      const error = new _ValidationError('field', unicodeMessage, 'expected');

      expect(error.message).toContain(unicodeMessage);
      expect(error.value).toBe(unicodeMessage);
    });

    it('should handle errors with no stack trace', () => {
      const error = new _ValidationError('field', 'value', 'expected');
      delete (error as any).stack;

      const formatted = formatErrorMessage(error, { includeStack: true });
      expect(formatted).toContain('_ValidationError');
      expect(formatted).not.toContain('Stack trace:');
    });

    it('should handle deeply nested error causes', () => {
      const level3 = new Error('Level 3 error');
      const level2 = new _ProcessingError('Level 2', 'failed', level3);
      const level1 = new _ValidationError('field', 'value', 'expected', {
        cause: level2,
      });

      expect(level1.details?.cause).toBe(level2);
      expect(level2.cause).toBe(level3);
    });

    it('should handle errors during error handling', () => {
      const errorHandler = new ErrorHandler();

      // Create an error that might cause issues during handling
      const problematicError = new Error('Test error');
      Object.defineProperty(problematicError, 'message', {
        get() {
          throw new Error('Error accessing message');
        },
      });

      // Should not throw, should handle gracefully
      expect(() => {
        errorHandler.handle(problematicError);
      }).not.toThrow();
    });

    it('should handle memory pressure with many errors', () => {
      const errorHandler = new ErrorHandler();

      // Create many errors to test memory handling
      for (let i = 0; i < 1000; i++) {
        const error = new _ValidationError(
          `field${i}`,
          `value${i}`,
          'expected'
        );
        errorHandler.handle(error);
      }

      const metrics = errorHandler.getMetrics();
      expect(metrics.totalErrors).toBe(1000);

      // Should not consume excessive memory
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should provide appropriate retry delays', () => {
      const networkErrors = [
        new NetworkError('Server error', 500),
        new NetworkError('Rate limited', 429),
        new NetworkError('Gateway timeout', 504),
      ];

      networkErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
        expect(error.suggestions).toBeDefined();
        expect(
          error.suggestions!.some(
            s => s.includes('retry') || s.includes('again')
          )
        ).toBe(true);
      });
    });

    it('should suggest different recovery strategies', () => {
      const errors = [
        new _ValidationError('generators', [3, 3], 'different integers'),
        new _ProcessingError('pattern generation', 'Pattern too complex'),
        new NetworkError('API request failed', 503),
        new AuthenticationError('Token expired'),
      ];

      errors.forEach(error => {
        if (error.suggestions) {
          expect(error.suggestions.length).toBeGreaterThan(0);
          expect(error.suggestions.every(s => typeof s === 'string')).toBe(
            true
          );
        }
      });
    });

    it('should handle cascading failures', () => {
      const originalError = new NetworkError('Connection failed', 503);
      const retryError = new _ProcessingError(
        'retry failed',
        'Max retries exceeded',
        originalError
      );
      const finalError = createErrorWithContext(retryError, {
        retryCount: 3,
        lastAttempt: new Date().toISOString(),
      });

      expect(finalError.cause).toBe(originalError);
      expect(finalError.details?.retryCount).toBe(3);
      expect(finalError.details?.lastAttempt).toBeDefined();
    });
  });
});
