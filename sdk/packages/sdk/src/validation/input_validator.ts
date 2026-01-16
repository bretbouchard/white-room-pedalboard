/**
 * Input Validation Module
 *
 * Provides comprehensive input validation for all SDK operations
 * to prevent security vulnerabilities and ensure data integrity.
 */

import type { SongContractV1 } from '../song/song_contract.js';
import type { SongStateV1 } from '../song/song_state.js';

// ============================================================================
// Validation Result
// ============================================================================

/**
 * Result of validation operation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (if any) */
  errors: string[];
  /** Sanitized data (if applicable) */
  sanitized?: unknown;
}

// ============================================================================
// String Sanitization
// ============================================================================

/**
 * Sanitize string input to prevent injection attacks
 *
 * Removes potentially dangerous characters and escapes special characters.
 */
export function sanitizeString(input: string, options: SanitizeOptions = {}): string {
  const {
    maxLength = 10000,
    allowHTML = false,
    allowSQL = false,
    trim = true
  } = options;

  let sanitized = input;

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Check length
  if (sanitized.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength}`);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Escape HTML if not allowed
  if (!allowHTML) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Basic SQL injection prevention
  if (!allowSQL) {
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b)/gi,
      /(;(\s+)*(DROP|DELETE|EXEC(UTE){0,1}|UPDATE)\b)/gi,
      /('(\s+)*(OR|AND)(\s+)*[\w\s]+(=|LIKE))/gi
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Input contains potentially dangerous SQL patterns');
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize string options
 */
export interface SanitizeOptions {
  /** Maximum allowed length */
  maxLength?: number;
  /** Allow HTML tags */
  allowHTML?: boolean;
  /** Allow SQL queries */
  allowSQL?: boolean;
  /** Trim whitespace */
  trim?: boolean;
}

// ============================================================================
// JSON Sanitization
// ============================================================================

/**
 * Sanitize JSON input to prevent injection attacks
 *
 * Parses JSON, validates structure, and removes dangerous content.
 */
export function sanitizeJSON<T = unknown>(json: string, schema?: JSONSchema): ValidationResult {
  const errors: string[] = [];

  try {
    // Parse JSON
    const parsed = JSON.parse(json);

    // Validate against schema if provided
    if (schema) {
      const schemaErrors = validateAgainstSchema(parsed, schema);
      errors.push(...schemaErrors);
    }

    // Check for dangerous patterns
    const dangerCheck = checkForDangerousPatterns(parsed);
    errors.push(...dangerCheck);

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, errors: [], sanitized: parsed as T };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * JSON schema for validation
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: RegExp;
}

/**
 * Validate object against schema
 */
function validateAgainstSchema(obj: unknown, schema: JSONSchema): string[] {
  const errors: string[] = [];

  if (schema.type === 'object') {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return [`Expected object, got ${typeof obj}`];
    }

    const record = obj as Record<string, unknown>;

    // Check required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in record)) {
          errors.push(`Missing required property: ${prop}`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [key, valueSchema] of Object.entries(schema.properties)) {
        if (key in record) {
          const valueErrors = validateAgainstSchema(record[key], valueSchema);
          errors.push(...valueErrors.map(e => `${key}.${e}`));
        }
      }
    }

    // Check for additional properties
    if (schema.additionalProperties === false) {
      const allowedKeys = new Set(Object.keys(schema.properties || {}));
      const actualKeys = Object.keys(record);
      for (const key of actualKeys) {
        if (!allowedKeys.has(key)) {
          errors.push(`Unexpected property: ${key}`);
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(obj)) {
      return [`Expected array, got ${typeof obj}`];
    }

    if (schema.items) {
      for (let i = 0; i < obj.length; i++) {
        const itemErrors = validateAgainstSchema(obj[i], schema.items);
        errors.push(...itemErrors.map(e => `[${i}].${e}`));
      }
    }
  } else if (schema.type === 'string') {
    if (typeof obj !== 'string') {
      errors.push(`Expected string, got ${typeof obj}`);
    } else {
      if (schema.minLength !== undefined && obj.length < schema.minLength) {
        errors.push(`Length ${obj.length} < minimum ${schema.minLength}`);
      }
      if (schema.maxLength !== undefined && obj.length > schema.maxLength) {
        errors.push(`Length ${obj.length} > maximum ${schema.maxLength}`);
      }
      if (schema.pattern && !schema.pattern.test(obj)) {
        errors.push(`Does not match pattern ${schema.pattern}`);
      }
    }
  } else if (schema.type === 'number') {
    if (typeof obj !== 'number') {
      errors.push(`Expected number, got ${typeof obj}`);
    } else {
      if (schema.minimum !== undefined && obj < schema.minimum) {
        errors.push(`Value ${obj} < minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && obj > schema.maximum) {
        errors.push(`Value ${obj} > maximum ${schema.maximum}`);
      }
    }
  } else if (schema.type === 'boolean') {
    if (typeof obj !== 'boolean') {
      errors.push(`Expected boolean, got ${typeof obj}`);
    }
  } else if (schema.type === 'null') {
    if (obj !== null) {
      errors.push(`Expected null, got ${typeof obj}`);
    }
  }

  return errors;
}

/**
 * Check for dangerous patterns in object
 */
function checkForDangerousPatterns(obj: unknown, path = ''): string[] {
  const errors: string[] = [];

  if (obj === null) {
    return errors;
  }

  if (typeof obj === 'string') {
    // Check for null bytes
    if (obj.includes('\0')) {
      errors.push(`${path}: Contains null bytes`);
    }

    // Check for prototype pollution patterns
    if (obj.includes('__proto__') || obj.includes('constructor') || obj.includes('prototype')) {
      errors.push(`${path}: Contains potentially dangerous prototype patterns`);
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      errors.push(...checkForDangerousPatterns(obj[i], `${path}[${i}]`));
    }
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      // Check for dangerous keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        errors.push(`${path}.${key}: Dangerous key name`);
      }
      errors.push(...checkForDangerousPatterns(value, path ? `${path}.${key}` : key));
    }
  }

  return errors;
}

// ============================================================================
// SongContract Validation
// ============================================================================

/**
 * Validate SongContract for security and integrity
 */
export function validateSongContract(contract: SongContractV1): ValidationResult {
  const errors: string[] = [];

  // Validate ID format
  if (!contract.id || typeof contract.id !== 'string') {
    errors.push('Invalid or missing contract ID');
  } else if (contract.id.length > 1000) {
    errors.push('Contract ID too long');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(contract.id)) {
    errors.push('Contract ID contains invalid characters');
  }

  // Validate seed
  if (typeof contract.seed !== 'number' || !Number.isInteger(contract.seed)) {
    errors.push('Invalid seed value');
  } else if (contract.seed < 0 || contract.seed > 0xFFFFFFFF) {
    errors.push('Seed out of valid range');
  }

  // Validate rhythm systems
  if (!Array.isArray(contract.rhythmSystems)) {
    errors.push('Rhythm systems must be an array');
  } else if (contract.rhythmSystems.length === 0) {
    errors.push('At least one rhythm system is required');
  } else if (contract.rhythmSystems.length > 100) {
    errors.push('Too many rhythm systems (max 100)');
  } else {
    contract.rhythmSystems.forEach((system, i) => {
      if (!system.id || typeof system.id !== 'string') {
        errors.push(`Rhythm system ${i}: Missing or invalid ID`);
      }
      if (!Array.isArray(system.generators) || system.generators.length === 0) {
        errors.push(`Rhythm system ${i}: Must have at least one generator`);
      }
    });
  }

  // Validate melody systems
  if (!Array.isArray(contract.melodySystems)) {
    errors.push('Melody systems must be an array');
  } else if (contract.melodySystems.length === 0) {
    errors.push('At least one melody system is required');
  } else if (contract.melodySystems.length > 100) {
    errors.push('Too many melody systems (max 100)');
  } else {
    contract.melodySystems.forEach((system, i) => {
      if (!system.id || typeof system.id !== 'string') {
        errors.push(`Melody system ${i}: Missing or invalid ID`);
      }
      if (!system.pitchCycle || typeof system.pitchCycle !== 'object') {
        errors.push(`Melody system ${i}: Missing or invalid pitch cycle`);
      }
    });
  }

  // Validate ensemble
  if (!contract.ensemble || typeof contract.ensemble !== 'object') {
    errors.push('Missing or invalid ensemble');
  } else if (!Array.isArray(contract.ensemble.voices)) {
    errors.push('Ensemble voices must be an array');
  } else if (contract.ensemble.voices.length === 0) {
    errors.push('At least one voice is required');
  } else if (contract.ensemble.voices.length > 128) {
    errors.push('Too many voices (max 128)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate limiter for API operations
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if operation is allowed
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter(t => t > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return true;
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }
}

// ============================================================================
// Input Size Limits
// ============================================================================

/**
 * Maximum sizes for various inputs
 */
export const INPUT_LIMITS = {
  MAX_CONTRACT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_STATE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_STRING_LENGTH: 10000,
  MAX_ARRAY_LENGTH: 10000,
  MAX_NESTING_DEPTH: 100
} as const;

/**
 * Validate input size
 */
export function validateInputSize(data: unknown, maxSize: number): ValidationResult {
  const size = JSON.stringify(data).length;

  if (size > maxSize) {
    return {
      valid: false,
      errors: [`Input size (${size} bytes) exceeds maximum (${maxSize} bytes)`]
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Check maximum nesting depth
 */
export function checkNestingDepth(obj: unknown, maxDepth: number = INPUT_LIMITS.MAX_NESTING_DEPTH, currentDepth: number = 0): ValidationResult {
  if (currentDepth > maxDepth) {
    return {
      valid: false,
      errors: [`Nesting depth (${currentDepth}) exceeds maximum (${maxDepth})`]
    };
  }

  if (obj === null || typeof obj !== 'object') {
    return { valid: true, errors: [] };
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = checkNestingDepth(item, maxDepth, currentDepth + 1);
      if (!result.valid) {
        return result;
      }
    }
  } else {
    for (const value of Object.values(obj)) {
      const result = checkNestingDepth(value, maxDepth, currentDepth + 1);
      if (!result.valid) {
        return result;
      }
    }
  }

  return { valid: true, errors: [] };
}
