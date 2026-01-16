/**
 * Utility functions for caching operations
 */

import { CacheKey, CacheEntry } from './cache-types';

/**
 * Generate a consistent cache key from parameters
 */
export function generateCacheKey(keyData: CacheKey): string {
  const { namespace, operation, parameters, version = '1.0' } = keyData;

  // Sort parameters for consistent key generation
  const sortedParams = Object.keys(parameters)
    .sort()
    .reduce(
      (sorted, key) => {
        sorted[key] = parameters[key];
        return sorted;
      },
      {} as Record<string, any>
    );

  const paramString = JSON.stringify(sortedParams);
  const keyString = `${namespace}:${operation}:${version}:${paramString}`;

  return hashString(keyString);
}

/**
 * Simple hash function for string keys
 */
export function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Calculate the size of a cache entry in bytes
 */
export function calculateEntrySize(entry: CacheEntry): number {
  if (entry.size !== undefined) {
    return entry.size;
  }

  try {
    const serialized = JSON.stringify(entry);
    return new Blob([serialized]).size;
  } catch (error) {
    // Fallback estimation
    return JSON.stringify(entry).length * 2; // Rough UTF-16 estimation
  }
}

/**
 * Check if a cache entry has expired
 */
export function isExpired(entry: CacheEntry): boolean {
  if (!entry.ttl) return false;

  return entry.timestamp + entry.ttl < Date.now();
}

/**
 * Calculate cache hit rate
 */
export function calculateHitRate(hits: number, misses: number): number {
  const total = hits + misses;

  return total > 0 ? hits / total : 0;
}

/**
 * Compress data using simple string compression
 */
export function compressData(_data: any): string {
  const jsonString = JSON.stringify(_data);

  // Simple compression using base64 encoding for demonstration
  // In production, you might use a proper compression library like pako
  try {
    if (typeof btoa !== 'undefined') {
      return btoa(jsonString);
    } else {
      // Node.js environment
      return Buffer.from(jsonString, 'utf8').toString('base64');
    }
  } catch (error) {
    // Fallback to original string if compression fails
    return jsonString;
  }
}

/**
 * Decompress data
 */
export function decompressData(compressed: string): any {
  try {
    let decompressed: string;

    if (typeof atob !== 'undefined') {
      decompressed = atob(compressed);
    } else {
      // Node.js environment
      decompressed = Buffer.from(compressed, 'base64').toString('utf8');
    }

    return JSON.parse(decompressed);
  } catch (error) {
    // If decompression fails, try to parse as regular JSON
    try {
      return JSON.parse(compressed);
    } catch (parseError) {
      throw new Error(`Failed to decompress data: ${error}`);
    }
  }
}

/**
 * Create a deep clone of an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Validate cache key format
 */
export function validateCacheKey(key: string): boolean {
  // Key should be non-empty and contain only safe characters
  return /^[a-zA-Z0-9_-]+$/.test(key) && key.length > 0 && key.length <= 250;
}

/**
 * Sanitize cache key
 */
export function sanitizeCacheKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 250);
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
