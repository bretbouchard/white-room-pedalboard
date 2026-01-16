/**
 * Tests for utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RetryManager,
  ValidationUtils,
  CacheUtils,
  MathUtils,
  StringUtils,
} from '../utils';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await retryManager.executeWithRetry(operation, 3);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');

    const result = await retryManager.executeWithRetry(operation, 3);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(retryManager.executeWithRetry(operation, 2)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('ValidationUtils', () => {
  describe('isPositiveInteger', () => {
    it('should validate positive integers', () => {
      expect(ValidationUtils.isPositiveInteger(1)).toBe(true);
      expect(ValidationUtils.isPositiveInteger(100)).toBe(true);
      expect(ValidationUtils.isPositiveInteger(0)).toBe(false);
      expect(ValidationUtils.isPositiveInteger(-1)).toBe(false);
      expect(ValidationUtils.isPositiveInteger(1.5)).toBe(false);
      expect(ValidationUtils.isPositiveInteger('1')).toBe(false);
    });
  });

  describe('isValidTimeSignature', () => {
    it('should validate time signatures', () => {
      expect(ValidationUtils.isValidTimeSignature([4, 4])).toBe(true);
      expect(ValidationUtils.isValidTimeSignature([3, 4])).toBe(true);
      expect(ValidationUtils.isValidTimeSignature([6, 8])).toBe(true);
      expect(ValidationUtils.isValidTimeSignature([4, 3])).toBe(false); // Invalid denominator
      expect(ValidationUtils.isValidTimeSignature([4])).toBe(false); // Wrong length
      expect(ValidationUtils.isValidTimeSignature('4/4')).toBe(false); // Wrong type
    });
  });

  describe('isValidKey', () => {
    it('should validate key signatures', () => {
      expect(ValidationUtils.isValidKey('C')).toBe(true);
      expect(ValidationUtils.isValidKey('F#')).toBe(true);
      expect(ValidationUtils.isValidKey('Bb')).toBe(true);
      expect(ValidationUtils.isValidKey('H')).toBe(false); // Invalid key
      expect(ValidationUtils.isValidKey('C##')).toBe(false); // Invalid key
      expect(ValidationUtils.isValidKey(123)).toBe(false); // Wrong type
    });
  });
});

describe('CacheUtils', () => {
  beforeEach(() => {
    CacheUtils.clearMemoryCache();
  });

  afterEach(() => {
    CacheUtils.clearMemoryCache();
  });

  it('should generate consistent cache keys', () => {
    const key1 = CacheUtils.generateKey('test', { a: 1, b: 2 });
    const key2 = CacheUtils.generateKey('test', { b: 2, a: 1 });

    expect(key1).toBe(key2); // Should be same regardless of parameter order
  });

  it('should set and get from memory cache', () => {
    const key = 'test-key';
    const value = { data: 'test' };

    CacheUtils.setMemoryCache(key, value, 1000);
    const retrieved = CacheUtils.getMemoryCache(key);

    expect(retrieved).toEqual(value);
  });

  it('should return null for expired cache entries', async () => {
    const key = 'test-key';
    const value = { data: 'test' };

    CacheUtils.setMemoryCache(key, value, 5); // 5ms TTL

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));

    const retrieved = CacheUtils.getMemoryCache(key);
    expect(retrieved).toBeNull();
  });
});

describe('MathUtils', () => {
  describe('gcd', () => {
    it('should calculate greatest common divisor', () => {
      expect(MathUtils.gcd(12, 8)).toBe(4);
      expect(MathUtils.gcd(17, 13)).toBe(1);
      expect(MathUtils.gcd(100, 25)).toBe(25);
    });
  });

  describe('lcm', () => {
    it('should calculate least common multiple', () => {
      expect(MathUtils.lcm(4, 6)).toBe(12);
      expect(MathUtils.lcm(3, 5)).toBe(15);
      expect(MathUtils.lcm(12, 8)).toBe(24);
    });
  });

  describe('generateRhythmicResultant', () => {
    it('should generate correct 3:2 resultant', () => {
      const result = MathUtils.generateRhythmicResultant(3, 2);
      expect(result).toHaveLength(6); // LCM of 3 and 2
      expect(result[0]).toBe(3); // Both generators hit at position 0
    });

    it('should generate correct 4:3 resultant', () => {
      const result = MathUtils.generateRhythmicResultant(4, 3);
      expect(result).toHaveLength(12); // LCM of 4 and 3
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate pattern complexity', () => {
      const simple = [1, 1, 1, 1];
      const complex = [1, 2, 3, 1, 4, 2];

      const simpleComplexity = MathUtils.calculateComplexity(simple);
      const complexComplexity = MathUtils.calculateComplexity(complex);

      expect(complexComplexity).toBeGreaterThan(simpleComplexity);
    });

    it('should return 0 for empty pattern', () => {
      expect(MathUtils.calculateComplexity([])).toBe(0);
    });
  });
});

describe('StringUtils', () => {
  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(StringUtils.toKebabCase('camelCase')).toBe('camel-case');
      expect(StringUtils.toKebabCase('PascalCase')).toBe('pascal-case');
      expect(StringUtils.toKebabCase('snake_case')).toBe('snake-case');
      expect(StringUtils.toKebabCase('space separated')).toBe(
        'space-separated'
      );
    });
  });

  describe('toCamelCase', () => {
    it('should convert to camelCase', () => {
      expect(StringUtils.toCamelCase('kebab-case')).toBe('kebabCase');
      expect(StringUtils.toCamelCase('snake_case')).toBe('snakeCase');
      expect(StringUtils.toCamelCase('space separated')).toBe('spaceSeparated');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const long = 'This is a very long string that should be truncated';
      const truncated = StringUtils.truncate(long, 20);

      expect(truncated).toHaveLength(20);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should not truncate short strings', () => {
      const short = 'Short';
      const result = StringUtils.truncate(short, 20);

      expect(result).toBe(short);
    });
  });
});
