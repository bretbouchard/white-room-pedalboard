/**
 * Tests for error handling system
 */

import { describe, it, expect } from 'vitest';
import {
  SchillingerError,
  ValidationError as _ValidationError,
  NetworkError,
  AuthenticationError,
  ProcessingError as _ProcessingError,
  ErrorHandler,
} from '../errors';

describe('SchillingerError', () => {
  it('should create error with all properties', () => {
    const error = new SchillingerError(
      'Test error',
      'TEST_ERROR',
      'validation',
      { field: 'test' },
      ['Try again']
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.category).toBe('validation');
    expect(error.details).toEqual({ field: 'test' });
    expect(error.suggestions).toEqual(['Try again']);
  });

  it('should serialize to JSON correctly', () => {
    const error = new _ValidationError('field', 'value', 'expected');
    const json = error.toJSON();

    expect(json.name).toBe('_ValidationError');
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.category).toBe('validation');
    expect(json.message).toContain('Invalid field');
  });
});

describe('_ValidationError', () => {
  it('should create validation error with proper message', () => {
    const error = new _ValidationError(
      'email',
      'invalid-email',
      'valid email format'
    );

    expect(error.name).toBe('_ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.category).toBe('validation');
    expect(error.message).toContain('Invalid email');
    expect(error.suggestions).toContain('Please provide a valid email value');
  });
});

describe('NetworkError', () => {
  it('should create network error with status code', () => {
    const error = new NetworkError('Connection failed', 500);

    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.category).toBe('network');
    expect(error.details?.statusCode).toBe(500);
  });

  it('should include server error suggestion for 5xx status codes', () => {
    const error = new NetworkError('Server error', 503);

    expect(error.suggestions).toContain(
      'This appears to be a server error - please contact support if it persists'
    );
  });
});

describe('ErrorHandler', () => {
  const handler = new ErrorHandler();

  it('should handle SchillingerError instances', () => {
    const originalError = new _ValidationError('test', 'value', 'expected');
    const handled = handler.handle(originalError);
    expect(handled).toBe(originalError);
  });

  it('should convert regular Error to _ProcessingError', () => {
    const originalError = new Error('Something went wrong');
    const handled = handler.handle(originalError);
    expect(handled).toBeInstanceOf(_ProcessingError);
    expect(handled.message).toContain('Something went wrong');
  });

  it('should handle string errors', () => {
    const handled = handler.handle('String error');
    expect(handled).toBeInstanceOf(_ProcessingError);
    expect(handled.message).toContain('String error');
  });

  it('should identify retryable errors', () => {
    const networkError = new NetworkError('Timeout', 500);
    const validationError = new _ValidationError('field', 'value', 'expected');
    expect(ErrorHandler.isRetryable(networkError)).toBe(true);
    expect(ErrorHandler.isRetryable(validationError)).toBe(false);
  });

  it('should calculate retry delay', () => {
    const networkError = new NetworkError('Timeout', 500);
    const delay1 = ErrorHandler.getRetryDelay(networkError, 1);
    const delay2 = ErrorHandler.getRetryDelay(networkError, 2);
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay1).toBe(1000); // First attempt: 1 second
    expect(delay2).toBe(2000); // Second attempt: 2 seconds
  });
});
