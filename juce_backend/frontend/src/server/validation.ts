/**
 * Input Validation Utilities for White Room API
 *
 * Comprehensive input validation to prevent injection attacks,
 * resource exhaustion, and data corruption.
 */

/**
 * Validated export parameters
 */
export interface ValidatedExportParams {
  limit: number;
  runId?: string;
  userId?: string;
  startDate?: number;
  endDate?: number;
}

/**
 * Export parameters validation result
 */
export interface ValidationResult<T> {
  valid: boolean;
  error?: string;
  parsed?: T;
}

/**
 * Configuration for export parameter validation
 */
const EXPORT_CONFIG = {
  MAX_LIMIT: 10000,
  MIN_LIMIT: 1,
  MIN_DATE: new Date('2020-01-01').getTime(),
  MAX_DATE: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
  MAX_RANGE_DAYS: 90,
} as const;

/**
 * Validate export parameters from API request
 *
 * @param params - Raw parameters from request
 * @returns Validation result with error or parsed parameters
 *
 * @example
 * ```typescript
 * const validation = validateExportParams({
 *   limit: searchParams.get('limit') || undefined,
 *   startDate: searchParams.get('startDate') || undefined,
 *   endDate: searchParams.get('endDate') || undefined
 * });
 *
 * if (!validation.valid) {
 *   return NextResponse.json({ error: validation.error }, { status: 400 });
 * }
 * ```
 */
export function validateExportParams(params: {
  limit?: string | null;
  runId?: string | null;
  userId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): ValidationResult<ValidatedExportParams> {
  // Validate and parse limit
  const limit = parseInt(params.limit || '1000', 10);
  if (isNaN(limit)) {
    return {
      valid: false,
      error: `Limit must be a valid integer. Received: "${params.limit}"`
    };
  }

  if (limit < EXPORT_CONFIG.MIN_LIMIT || limit > EXPORT_CONFIG.MAX_LIMIT) {
    return {
      valid: false,
      error: `Limit must be between ${EXPORT_CONFIG.MIN_LIMIT} and ${EXPORT_CONFIG.MAX_LIMIT}. Received: ${limit}`
    };
  }

  // Validate and parse startDate
  let startDate: number | undefined;
  if (params.startDate) {
    startDate = new Date(params.startDate).getTime();

    if (isNaN(startDate)) {
      return {
        valid: false,
        error: `Invalid startDate format. Use ISO 8601 format (e.g., "2024-01-15T00:00:00Z"). Received: "${params.startDate}"`
      };
    }

    if (startDate < EXPORT_CONFIG.MIN_DATE || startDate > EXPORT_CONFIG.MAX_DATE) {
      return {
        valid: false,
        error: `StartDate out of valid range. Must be between ${new Date(EXPORT_CONFIG.MIN_DATE).toISOString()} and ${new Date(EXPORT_CONFIG.MAX_DATE).toISOString()}. Received: ${new Date(startDate).toISOString()}`
      };
    }
  }

  // Validate and parse endDate
  let endDate: number | undefined;
  if (params.endDate) {
    endDate = new Date(params.endDate).getTime();

    if (isNaN(endDate)) {
      return {
        valid: false,
        error: `Invalid endDate format. Use ISO 8601 format (e.g., "2024-01-15T00:00:00Z"). Received: "${params.endDate}"`
      };
    }

    if (endDate < EXPORT_CONFIG.MIN_DATE || endDate > EXPORT_CONFIG.MAX_DATE) {
      return {
        valid: false,
        error: `EndDate out of valid range. Must be between ${new Date(EXPORT_CONFIG.MIN_DATE).toISOString()} and ${new Date(EXPORT_CONFIG.MAX_DATE).toISOString()}. Received: ${new Date(endDate).toISOString()}`
      };
    }
  }

  // Validate date range order
  if (startDate && endDate && startDate > endDate) {
    return {
      valid: false,
      error: `StartDate must be before EndDate. StartDate: ${new Date(startDate).toISOString()}, EndDate: ${new Date(endDate).toISOString()}`
    };
  }

  // Validate date range duration (max 90 days)
  if (startDate && endDate) {
    const rangeDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
    if (rangeDays > EXPORT_CONFIG.MAX_RANGE_DAYS) {
      return {
        valid: false,
        error: `Date range cannot exceed ${EXPORT_CONFIG.MAX_RANGE_DAYS} days. Received: ${Math.round(rangeDays)} days`
      };
    }
  }

  // Validate runId format (if provided)
  if (params.runId) {
    if (params.runId.length > 256) {
      return {
        valid: false,
        error: `runId too long. Maximum length is 256 characters. Received: ${params.runId.length} characters`
      };
    }

    // Check for valid characters (alphanumeric, hyphen, underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(params.runId)) {
      return {
        valid: false,
        error: `runId contains invalid characters. Only alphanumeric, hyphen, and underscore allowed. Received: "${params.runId}"`
      };
    }
  }

  // Validate userId format (if provided)
  if (params.userId) {
    if (params.userId.length > 256) {
      return {
        valid: false,
        error: `userId too long. Maximum length is 256 characters. Received: ${params.userId.length} characters`
      };
    }

    // Check for valid characters (alphanumeric, hyphen, underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(params.userId)) {
      return {
        valid: false,
        error: `userId contains invalid characters. Only alphanumeric, hyphen, and underscore allowed. Received: "${params.userId}"`
      };
    }
  }

  return {
    valid: true,
    parsed: {
      limit,
      runId: params.runId || undefined,
      userId: params.userId || undefined,
      startDate,
      endDate
    }
  };
}

/**
 * Sanitize string input to prevent injection attacks
 *
 * @param input - Raw string input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate integer input
 *
 * @param input - String or number input
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated integer or throws error
 */
export function validateInteger(
  input: string | number,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  let value: number;

  if (typeof input === 'string') {
    value = parseInt(input, 10);
    if (isNaN(value)) {
      throw new Error(`Invalid integer: "${input}"`);
    }
  } else if (typeof input === 'number') {
    if (!Number.isInteger(input)) {
      throw new Error(`Value must be an integer: ${input}`);
    }
    value = input;
  } else {
    throw new Error('Input must be a string or number');
  }

  if (value < min || value > max) {
    throw new Error(`Integer out of range. Must be between ${min} and ${max}. Received: ${value}`);
  }

  return value;
}

/**
 * Validate email format
 *
 * @param email - Email string to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 *
 * @param uuid - UUID string to validate
 * @returns True if valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ISO 8601 date string
 *
 * @param dateString - Date string to validate
 * @returns True if valid ISO 8601 date
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
}

/**
 * Check for SQL injection patterns
 *
 * @param input - String to check
 * @returns True if suspicious patterns found
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(--)|(\/*.*\*\/)/,
    /(;)/,
    /(\bOR\b|\bAND\b).*=.*=/i,
    /('.*--)|('.*\*)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for XSS patterns
 *
 * @param input - String to check
 * @returns True if XSS patterns found
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Comprehensive security validation for user input
 *
 * @param input - String to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateUserInput(
  input: string,
  options: {
    maxLength?: number;
    checkSQLInjection?: boolean;
    checkXSS?: boolean;
    checkEmail?: boolean;
    checkUUID?: boolean;
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxLength = 10000,
    checkSQLInjection = true,
    checkXSS = true,
    checkEmail = false,
    checkUUID = false
  } = options;

  // Check length
  if (input.length > maxLength) {
    return {
      valid: false,
      error: `Input too long. Maximum ${maxLength} characters allowed.`
    };
  }

  // Check for SQL injection
  if (checkSQLInjection && containsSQLInjection(input)) {
    return {
      valid: false,
      error: 'Input contains suspicious SQL patterns'
    };
  }

  // Check for XSS
  if (checkXSS && containsXSS(input)) {
    return {
      valid: false,
      error: 'Input contains suspicious script patterns'
    };
  }

  // Check email format if requested
  if (checkEmail && !isValidEmail(input)) {
    return {
      valid: false,
      error: 'Invalid email format'
    };
  }

  // Check UUID format if requested
  if (checkUUID && !isValidUUID(input)) {
    return {
      valid: false,
      error: 'Invalid UUID format'
    };
  }

  return { valid: true };
}
