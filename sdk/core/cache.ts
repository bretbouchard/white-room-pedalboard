/**
 * Cache manager for the core SDK client
 */

// Prefer importing shared utilities from the package entrypoint to ensure resolution
import { CacheUtils } from "@schillinger-sdk/shared";

export class CacheManager {
  private enabled: boolean;
  private stats = {
    hits: 0,
    misses: 0,
    totalEntries: 0,
  };

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    if (!this.enabled) return null;

    const value = CacheUtils.getMemoryCache<T>(key);
    if (value !== null) {
      this.stats.hits++;
      return value;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    if (!this.enabled) return;

    CacheUtils.setMemoryCache(key, value, ttlMs);
    this.stats.totalEntries++;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    CacheUtils.clearMemoryCache();
    this.stats = {
      hits: 0,
      misses: 0,
      totalEntries: 0,
    };
  }

  /**
   * Enable or disable caching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return { ...this.stats };
  }
}
