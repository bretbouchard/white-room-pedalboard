/**
 * Base error class for all Schillinger SDK errors
 */
export class SchillingerError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly suggestions?: string[];
  public readonly category?: string;
  public readonly timestamp: Date;
  public readonly cause?: any;

  constructor(
    message: string = 'An unexpected error occurred',
    code: string = 'UNKNOWN_ERROR',
    category?: string,
    details?: Record<string, any> | string,
    suggestions?: string[]
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'SchillingerError';
    this.code = code;
    this.category = category;
    const obj = typeof details === 'string' ? { message: details } : details;
    if (obj && typeof obj === 'object' && 'details' in obj) {
      // Support shape: { details: {...}, suggestions: [...] }
      const anyObj = obj as any;
      this.details = anyObj.details ?? undefined;
      this.suggestions = suggestions ?? anyObj.suggestions ?? undefined;
    } else {
      this.details = obj ?? undefined;
      this.suggestions = suggestions;
    }
    if (obj && typeof obj === 'object' && (obj as any).cause) {
      this.cause = (obj as any).cause;
    }
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchillingerError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      details: this.details,
      suggestions: this.suggestions,
      timestamp: this.timestamp,
      cause: this.cause,
      stack: this.stack,
    };
  }

  static handle(error: SchillingerError | Error | string): SchillingerError {
    if (error instanceof SchillingerError) return error;
    if (typeof error === 'string') return new UnknownError('unknown', error);
    return new UnknownError('unknown', safeGetMessage(error), error);
  }
}

/**
 * Math error factory for standardized math errors
 */
export class MathError extends SchillingerError {
  public readonly domain = 'math';
  constructor(
    message: string,
    code: string = 'MATH_ERROR',
    details?: Record<string, any>
  ) {
    super(message, code, 'math', details);
    this.name = 'MathError';
  }
}

export class MathErrorFactory {
  static create(
    message: string,
    code: string = 'MATH_ERROR',
    details?: Record<string, any>
  ) {
    return new MathError(message, code, details);
  }
}
export class ValidationError extends SchillingerError {
  public readonly _name = '_ValidationError';
  public readonly code = 'VALIDATION_ERROR';
  public readonly category = 'validation';
  public readonly field: string;
  public readonly value: any;
  public readonly expected: any;

  constructor(
    field: string,
    value: any,
    expected: any,
    details?: Record<string, any> | string
  ) {
    const valueStr =
      value === undefined
        ? 'undefined'
        : value === null
          ? 'null'
          : stringify(value);
    const summary = `Invalid ${field}: expected ${stringify(expected)} received ${valueStr}`;
    const merged: Record<string, any> | undefined =
      typeof details === 'string'
        ? { field, value, expected, message: details }
        : { field, value, expected, ...(details || {}) };
    const suggestions = buildValidationSuggestions(field, expected);
    super(summary, 'VALIDATION_ERROR', 'validation', merged, suggestions);
    this.field = field;
    this.value = value;
    this.expected = expected;
    // tests expect a specific name for the serialized form
    this.name = '_ValidationError';
  }
}

export class NetworkError extends SchillingerError {
  public readonly _name = 'NetworkError';
  public readonly code = 'NETWORK_ERROR';
  public readonly category = 'network';
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(
      message,
      'NETWORK_ERROR',
      'network',
      statusCode !== undefined ? { statusCode } : undefined,
      networkSuggestions(statusCode)
    );
    this.statusCode = statusCode;
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends SchillingerError {
  constructor(
    message: string,
    details?: Record<string, any>,
    suggestions?: string[]
  ) {
    super(
      message,
      'AUTH_ERROR',
      'auth',
      details,
      suggestions || [
        'Verify your credentials/token',
        'Ensure token has not expired',
        'Check your account status and permissions',
      ]
    );
    this.name = 'AuthenticationError';
  }
}

export class InvalidCredentialsError extends SchillingerError {
  public readonly _name = 'InvalidCredentialsError';
  public readonly code = 'INVALID_CREDENTIALS';
  public readonly category = 'auth';

  constructor(
    message: string = 'Invalid credentials provided',
    details?: Record<string, any>
  ) {
    super(message, 'INVALID_CREDENTIALS', 'auth', details, [
      'Check your username and password',
      'Ensure credentials are not expired',
      'Verify account is not locked or suspended',
      'Contact support if credentials should be valid',
    ]);
  }
}

export class PermissionDeniedError extends SchillingerError {
  public readonly _name = 'PermissionDeniedError';
  public readonly code = 'PERMISSION_DENIED';
  public readonly category = 'auth';
  public readonly requiredPermission?: string;
  public readonly userPermissions?: string[];

  constructor(
    message: string = 'Permission denied',
    requiredPermission?: string,
    userPermissions?: string[],
    details?: Record<string, any>
  ) {
    const enhancedDetails = {
      ...details,
      requiredPermission,
      userPermissions,
    };

    super(message, 'PERMISSION_DENIED', 'auth', enhancedDetails, [
      'Contact an administrator to request the required permissions',
      'Verify you are logged in with the correct account',
      'Check if your role has the necessary access rights',
      requiredPermission
        ? `Required permission: ${requiredPermission}`
        : 'Check required permissions for this operation',
    ]);

    this.requiredPermission = requiredPermission;
    this.userPermissions = userPermissions;
  }
}

export class RateLimitError extends SchillingerError {
  public readonly _name = 'RateLimitError';
  public readonly code = 'RATE_LIMIT_ERROR';

  constructor(
    retryAfter?: number,
    message: string = 'Rate limit exceeded',
    details?: Record<string, any>,
    suggestions?: string[]
  ) {
    const defaultSuggestions = [
      'Wait before making another request',
      'Check your API usage limits',
      'Contact support if you need increased rate limits',
    ];
    const detailsWithRetry = {
      ...details,
      retryAfter: retryAfter ? `${retryAfter} seconds` : undefined,
    };
    super(
      message,
      'RATE_LIMIT_ERROR',
      'network',
      detailsWithRetry,
      suggestions || defaultSuggestions
    );
  }
}

export class QuotaExceededError extends SchillingerError {
  public readonly _name = 'QuotaExceededError';
  public readonly code = 'QUOTA_EXCEEDED';
  public readonly category = 'environment';
  public readonly retriable = false;

  constructor(
    message: string = 'Quota exceeded',
    details?: Record<string, any>
  ) {
    super(message, 'QUOTA_EXCEEDED', 'environment', details, [
      'Reduce request frequency or usage',
      'Check your quota limits and usage',
      'Contact support if you need higher quotas',
    ]);
  }
}

export class ConfigurationError extends SchillingerError {
  public readonly _name = 'ConfigurationError';
  public readonly code = 'CONFIGURATION_ERROR';

  constructor(
    message: string = 'Configuration error',
    details?: Record<string, any>,
    suggestions?: string[]
  ) {
    const defaultSuggestions = [
      'Check your configuration settings',
      'Verify environment variables',
      'Ensure all required parameters are set correctly',
    ];
    super(
      message,
      'CONFIGURATION_ERROR',
      'configuration',
      details,
      suggestions || defaultSuggestions
    );
  }
}

export class ProcessingError extends SchillingerError {
  public readonly category = 'processing';
  public readonly operation?: string;
  public readonly cause?: Error;

  constructor(
    operationOrMessage: string,
    messageOrDetails?: string | Record<string, any>,
    cause?: Error,
    options?: { suggestions?: string[] }
  ) {
    const op = operationOrMessage;
    const rawMsg = typeof messageOrDetails === 'string' ? messageOrDetails : '';
    // eslint-disable-next-line no-useless-escape
    const normalized = rawMsg.replace(
      new RegExp(`^${escapeRegExp(op)}:?\\s*`, 'i'),
      ''
    );
    const msg = `Failed to ${op}: ${normalized || 'Processing error'}`;
    const details =
      typeof messageOrDetails === 'string' ? undefined : messageOrDetails;
    const suggestions = options?.suggestions || [
      'Retry the operation',
      'Check input data for validity',
      'Reduce complexity if applicable',
      'Ensure all required fields are provided',
    ];
    super(
      msg,
      'PROCESSING_ERROR',
      'processing',
      { ...details, operation: op, cause },
      suggestions
    );
    this.operation = op;
    this.cause = cause;
    // tests expect the serialized name to use a leading underscore
    this.name = '_ProcessingError';
  }
}

class UnknownError extends ProcessingError {
  public readonly code = 'UNKNOWN_ERROR';
  constructor(operation: string, message?: string, cause?: Error) {
    super(operation, message ?? 'Unknown error', cause);
    // keep UnknownError as a processing-type error but preserve the leading-underscore
    this.name = '_ProcessingError';
  }
}

export class ErrorHandler {
  private totalErrors = 0;
  private byCategory: Record<string, number> = {};

  handle(
    err: unknown,
    context?: Record<string, any>,
    options?: { sanitize?: boolean }
  ): SchillingerError {
    let processed: SchillingerError = SchillingerError.handle(err as any);

    // Merge context
    if (context && Object.keys(context).length) {
      processed = createErrorWithContext(processed, context);
    }

    // Sanitize sensitive values
    if (options?.sanitize) {
      const sensitiveFields = [
        'apikey',
        'apikey',
        'token',
        'password',
        'secret',
      ];
      if (processed instanceof ValidationError) {
        const isSensitive = sensitiveFields.includes(
          processed.field.toLowerCase()
        );
        if (isSensitive) {
          processed = new ValidationError(
            processed.field,
            '[REDACTED]',
            processed.expected,
            processed.details
          );
        }
      } else if (processed.details && typeof processed.details === 'object') {
        const clone = { ...processed.details } as any;
        if (typeof clone.value === 'string') clone.value = '[REDACTED]';
        processed = new SchillingerError(
          processed.message,
          processed.code,
          processed.category,
          clone,
          processed.suggestions
        );
      }
    }

    // Metrics
    this.totalErrors += 1;
    const cat = processed.category || 'unknown';
    this.byCategory[cat] = (this.byCategory[cat] || 0) + 1;
    return processed;
  }

  static isRetryable(err: unknown): boolean {
    return isRetryableError(err);
  }

  static getRetryDelay(_err: unknown, attempt: number): number {
    // Use production-like delays (milliseconds). Tests expect 1s base delay
    const baseDelay = 1000;
    return Math.max(1, attempt) * baseDelay;
  }

  getMetrics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
  } {
    return {
      totalErrors: this.totalErrors,
      errorsByCategory: { ...this.byCategory },
    };
  }

  /**
   * Static method to handle errors without creating an instance
   */
  static handle(
    error: unknown,
    context?: Record<string, any>,
    opts?: { sanitize?: boolean }
  ): SchillingerError {
    const handler = new ErrorHandler();
    return handler.handle(error, context, opts);
  }
}

export function createErrorWithContext(
  error: unknown,
  context: Record<string, any>
): SchillingerError {
  const base = SchillingerError.handle(error as any);
  const merged = { ...(base.details || {}), ...(context || {}) };
  // Preserve ValidationError fields
  if (base instanceof ValidationError) {
    return new ValidationError(base.field, base.value, base.expected, merged);
  }
  // For other errors (including ProcessingError), return a generic SchillingerError
  return new SchillingerError(
    base.message,
    base.code,
    base.category,
    merged,
    base.suggestions
  );
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof NetworkError) {
    const sc = err.statusCode;
    return (
      sc === 429 ||
      sc === 500 ||
      sc === 502 ||
      sc === 503 ||
      sc === 504 ||
      /timeout/i.test(err.message)
    );
  }
  if (err instanceof SchillingerError && err.code === 'UNKNOWN_ERROR') {
    return true;
  }
  if (err instanceof SchillingerError) {
    return /timeout|temporar|rate limit/i.test(err.message);
  }
  if (err instanceof Error) {
    return /timeout|temporar/i.test(err.message);
  }
  return false;
}

export function formatErrorMessage(
  err: unknown,
  options?: { includeStack?: boolean }
): string {
  const e = SchillingerError.handle(err as any);
  let msg =
    !e.message || /^(unknown:?)?\s*$/.test(e.message)
      ? 'Unknown error'
      : e.message;
  if (e.code === 'UNKNOWN_ERROR') {
    const m = msg;
    if (/^Failed to unknown:\s*(Processing error)?\s*$/i.test(m)) {
      msg = 'Unknown error';
    }
  }
  const parts = [
    `${e.name} [${e.code}] (${e.category ?? 'uncategorized'}): ${msg}`,
  ];
  if (e.details) {
    try {
      parts.push(`Details: ${stringify(e.details)}`);
    } catch (_) {
      parts.push('Details: [unserializable]');
    }
  }
  if (e.suggestions && e.suggestions.length) {
    parts.push(`Suggestions: ${e.suggestions.join('; ')}`);
  }
  if (options?.includeStack && e.stack) {
    parts.push('Stack trace:');
    parts.push(e.stack);
  }
  return parts.join('\n');
}

function stringify(v: any): string {
  try {
    if (typeof v === 'string') return v;
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function buildValidationSuggestions(field: string, expected: any): string[] {
  const base = [`Please provide a valid ${field} value`];
  if (typeof expected === 'string') base.push(`Expected format: ${expected}`);
  return base;
}

function networkSuggestions(status?: number): string[] {
  if (status === 429)
    return [
      'Too many requests, retry after a delay',
      'Implement exponential backoff',
    ];
  if (status && status >= 500)
    return [
      'This appears to be a server error - please contact support if it persists',
      'Server error, retry the request',
      'Check service health or contact support',
    ];
  if (status === 401 || status === 403)
    return [
      'Check authentication/authorization',
      'Refresh or verify credentials',
    ];
  if (status === 404) return ['Verify the endpoint or resource id'];
  return [
    'Check network connectivity',
    'Retry the request',
    'Increase timeout if necessary',
  ];
}

function safeGetMessage(e: Error): string {
  try {
    return e.message;
  } catch (_) {
    return 'Unknown error';
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
