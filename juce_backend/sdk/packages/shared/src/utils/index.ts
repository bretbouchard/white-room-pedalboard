/**
 * Shared utilities for the Schillinger SDK
 */

import { ErrorHandler, SchillingerError } from '../errors';

/**
 * Retry manager for handling retryable operations
 */
export class RetryManager {
  /**
   * Execute an operation with automatic retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: SchillingerError | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const handler = new ErrorHandler();
        lastError = handler.handle(error as unknown);

        if (attempt === maxRetries || !ErrorHandler.isRetryable(lastError)) {
          throw lastError;
        }

        const delayMs = ErrorHandler.getRetryDelay(lastError, attempt);
        await this.delay(delayMs);
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Type converter utilities for handling internal/external type conversions
 */
export class TypeConverter {
  /**
   * Safely convert unknown input to expected type with validation
   */
  static safeConvert<T>(
    input: unknown,
    validator: (value: unknown) => value is T,
    errorMessage: string
  ): T {
    if (validator(input)) {
      return input;
    }
    throw new Error(errorMessage);
  }

  /**
   * Deep clone an object to avoid mutation issues
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Merge objects with deep merging support
   */
  static deepMerge<T extends Record<string, any>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = this.deepClone(target);

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }
}

/**
 * Validation utilities for common data validation tasks
 */
export class ValidationUtils {
  /**
   * Validate that a value is a positive integer
   */
  static isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
  }

  /**
   * Validate that a value is a non-negative number
   */
  static isNonNegativeNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && value >= 0;
  }

  /**
   * Validate that a value is a valid time signature
   */
  static isValidTimeSignature(value: unknown): value is [number, number] {
    return (
      Array.isArray(value) &&
      value.length === 2 &&
      this.isPositiveInteger(value[0]) &&
      this.isPositiveInteger(value[1]) &&
      [1, 2, 4, 8, 16].includes(value[1]) // Valid denominators
    );
  }

  /**
   * Validate that a value is a valid tempo
   */
  static isValidTempo(value: unknown): value is number {
    return typeof value === 'number' && value >= 40 && value <= 300;
  }

  /**
   * Validate that a value is a valid key signature
   */
  static isValidKey(value: unknown): value is string {
    if (typeof value !== 'string') return false;

    const validKeys = [
      'C',
      'C#',
      'Db',
      'D',
      'D#',
      'Eb',
      'E',
      'F',
      'F#',
      'Gb',
      'G',
      'G#',
      'Ab',
      'A',
      'A#',
      'Bb',
      'B',
    ];

    return validKeys.includes(value);
  }

  /**
   * Validate that a value is a valid scale name
   */
  static isValidScale(value: unknown): value is string {
    if (typeof value !== 'string') return false;

    const validScales = [
      'major',
      'minor',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'locrian',
      'harmonic_minor',
      'melodic_minor',
      'pentatonic_major',
      'pentatonic_minor',
      'blues',
      'chromatic',
    ];

    return validScales.includes(value);
  }

  /**
   * Validate array of durations (allows 0 for rests, supports decimal durations)
   */
  static isValidDurations(value: unknown): value is number[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        duration =>
          typeof duration === 'number' &&
          Number.isFinite(duration) &&
          duration >= 0
      )
    );
  }

  /**
   * Validate chord progression format
   */
  static isValidChordProgression(value: unknown): value is string[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(chord => typeof chord === 'string' && chord.length > 0)
    );
  }
}

/**
 * Cache utilities for managing different cache levels
 */
export class CacheUtils {
  private static memoryCache = new Map<
    string,
    { value: any; expires: number }
  >();

  /**
   * Generate cache key from parameters
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');

    return `${prefix}:${sortedParams}`;
  }

  /**
   * Set value in memory cache with TTL
   */
  static setMemoryCache(key: string, value: any, ttlMs: number = 300000): void {
    const expires = Date.now() + ttlMs;
    this.memoryCache.set(key, { value, expires });
  }

  /**
   * Get value from memory cache
   */
  static getMemoryCache<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  /**
   * Clear expired entries from memory cache
   */
  static cleanupMemoryCache(): void {
    for (const [key, cached] of this.memoryCache.entries()) {
      const _now = Date.now();

      if (_now > cached.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all memory cache
   */
  static clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}

/**
 * HTTP utilities for API communication
 */
export class HttpUtils {
  /**
   * Build query string from parameters
   */
  static buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }

    return searchParams.toString();
  }

  /**
   * Parse response based on content type
   */
  static async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('text/')) {
      return response.text();
    }

    return response.blob();
  }

  /**
   * Check if response indicates rate limiting
   */
  static isRateLimited(response: Response): boolean {
    return response.status === 429;
  }

  /**
   * Get retry-after header value
   */
  static getRetryAfter(response: Response): number | null {
    const retryAfter = response.headers.get('retry-after');
    if (!retryAfter) return null;

    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? null : seconds;
  }
}

/**
 * Math utilities for Schillinger calculations
 */
export class MathUtils {
  /**
   * Optional logging hook for math computations.
   * Set MathUtils.onMathComputation = (meta) => { ... } to enable.
   */
  static onMathComputation: (metricMeta: any) => void = () => {};

  /**
   * Compare two numeric arrays for equality within a given floating-point precision.
   * Returns true if arrays are same length and all elements are equal after rounding.
   */
  static arraysAlmostEqual(
    a: number[],
    b: number[],
    precision: number = 6
  ): boolean {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++) {
      if (
        parseFloat(a[i].toFixed(precision)) !==
        parseFloat(b[i].toFixed(precision))
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Normalize a numeric sequence for deterministic comparison.
   * Options:
   *   - precision: number of decimal places to round (default: 6)
   *   - sort: whether to sort the sequence (default: false)
   *   - dedupe: whether to remove duplicates (default: false)
   */
  static normalizeSequence(
    seq: number[],
    options?: { precision?: number; sort?: boolean; dedupe?: boolean }
  ): number[] {
    if (!Array.isArray(seq)) return [];
    const { precision = 6, sort = false, dedupe = false } = options || {};
    let result = seq.map(x =>
      typeof x === 'number' && Number.isFinite(x)
        ? parseFloat(x.toFixed(precision))
        : 0
    );
    if (sort) result = result.slice().sort((a, b) => a - b);
    if (dedupe) result = Array.from(new Set(result));
    return result;
  }

  /**
   * Calculate greatest common divisor
   */
  static gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  /**
   * Calculate least common multiple
   */
  static lcm(a: number, b: number): number {
    return Math.abs(a * b) / this.gcd(a, b);
  }

  /**
   * Generate rhythmic resultant from two generators
   */
  static generateRhythmicResultant(a: number, b: number): number[] {
    // Canonical cross-platform logic: LCM length, [3] for both, [1] for one or neither
    if (a === b) {
      return [a, a, a, a]; // Edge case: identical generators
    }
    const lcmValue = this.lcm(a, b);
    const result: number[] = [];
    for (let i = 0; i < lcmValue; i++) {
      const hitA = i % a === 0;
      const hitB = i % b === 0;
      if (hitA && hitB) {
        result.push(3);
      } else if (hitA || hitB) {
        result.push(1);
      } else {
        result.push(1); // Canonical: always 1 except both
      }
    }
    return result;
  }

  /**
   * Calculate pattern complexity score
   */
  static calculateComplexity(pattern: number[]): number {
    if (pattern.length === 0) return 0;

    // Count unique values
    const uniqueValues = new Set(pattern).size;

    // Count transitions
    let transitions = 0;
    for (let i = 1; i < pattern.length; i++) {
      if (pattern[i] !== pattern[i - 1]) {
        transitions++;
      }
    }

    // Normalize by pattern length
    const uniqueRatio = uniqueValues / pattern.length;
    const transitionRatio = transitions / (pattern.length - 1);

    return (uniqueRatio + transitionRatio) / 2;
  }

  /**
   * Calculate syncopation level in a rhythm pattern
   */
  static calculateSyncopation(
    pattern: number[],
    timeSignature: [number, number] = [4, 4]
  ): number {
    if (pattern.length === 0) return 0;

    const beatsPerMeasure = timeSignature[0];
    const strongBeats = new Set();

    // Define strong beats based on time signature
    for (let i = 0; i < pattern.length; i += pattern.length / beatsPerMeasure) {
      strongBeats.add(Math.floor(i));
    }

    let syncopationScore = 0;
    let totalBeats = 0;

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] > 0) {
        totalBeats++;
        if (!strongBeats.has(i)) {
          syncopationScore++;
        }
      }
    }

    return totalBeats > 0 ? syncopationScore / totalBeats : 0;
  }
}

/**
 * String utilities for text processing
 */
export class StringUtils {
  /**
   * Convert string to kebab-case
   */
  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Convert string to camelCase
   */
  static toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[A-Z]/, char => char.toLowerCase());
  }

  /**
   * Convert string to PascalCase
   */
  static toPascalCase(str: string): string {
    const camelCase = this.toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(
    str: string,
    maxLength: number,
    suffix: string = '...'
  ): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Generate random string of specified length
   */
  static randomString(
    length: number,
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }
}

// Export all utilities
export * from '../errors';
export * from '../types';
