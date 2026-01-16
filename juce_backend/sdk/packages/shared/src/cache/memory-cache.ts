/**
 * In-memory cache implementation with LRU eviction
 */

import {
  CacheEntry,
  CacheOptions,
  CacheStats,
  CacheEventListener,
  CacheEvent,
  CacheEventType,
} from './cache-types';
import { calculateEntrySize, isExpired, calculateHitRate } from './cache-utils';

export class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    size: 0,
    hitRate: 0,
  };
  private listeners: CacheEventListener[] = [];
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private options: CacheOptions = {}) {
    console.debug('[MemoryCache] constructor START');
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      maxSize = 50 * 1024 * 1024, // 50MB default
      maxEntries = 1000,
    } = options;

    this.options = { ttl, maxSize, maxEntries, ...options };
    // Start cleanup interval
    this.startCleanup();
    console.debug('[MemoryCache] constructor END');
  }

  /**
   * Get value from cache
   */
  async get<T>(_key: string): Promise<T | null> {
    const entry = this.cache.get(_key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      this.emit('miss', _key);
      return null;
    }

    // Check if expired
    if (isExpired(entry)) {
      this.cache.delete(_key);
      this.removeFromAccessOrder(_key);
      this.updateStats();
      this.stats.misses++;
      this.updateHitRate();
      this.emit('miss', _key);
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end of access order (most recently used)
    this.updateAccessOrder(_key);

    this.stats.hits++;
    this.updateHitRate();
    this.emit('hit', _key);

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(_key: string, value: T, ttl?: number): Promise<void> {
    console.debug('[MemoryCache.set] called', _key);
    const entryTtl = ttl || this.options.ttl;
    const entry: CacheEntry<T> = {
      key: _key,
      value,
      timestamp: Date.now(),
      ttl: entryTtl,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Calculate size
    entry.size = calculateEntrySize(entry);

    // Check if we need to evict entries
    await this.evictIfNecessary(entry.size!);

    // Set the entry
    this.cache.set(_key, entry);
    this.updateAccessOrder(_key);
    this.updateStats();
    this.emit('set', _key, { size: entry.size });
    console.debug('[MemoryCache.set] finished', _key);
  }

  /**
   * Delete entry from cache
   */
  async delete(_key: string): Promise<boolean> {
    const existed = this.cache.has(_key);

    if (existed) {
      this.cache.delete(_key);
      this.removeFromAccessOrder(_key);
      this.updateStats();
      this.emit('delete', _key);
    }

    return existed;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.updateStats();
    this.emit('clear');
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in bytes
   */
  async size(): Promise<number> {
    return this.stats.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Check if key exists and is not expired
   */
  async has(_key: string): Promise<boolean> {
    const entry = this.cache.get(_key);
    return entry !== undefined && !isExpired(entry);
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    for (const key of keys) {
      results.set(key, await this.get<T>(key));
    }

    return results;
  }

  /**
   * Set multiple values at once
   */
  async setMultiple<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: CacheEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: CacheEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    // Removed unused variable 'now'
    let removedCount = 0;

    for (const [key, entry] of this.cache) {
      if (isExpired(entry)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.updateStats();
      this.emit('invalidate', undefined, { removedCount });
    }

    return removedCount;
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    this.listeners = [];
  }

  /**
   * Get entries sorted by access frequency
   */
  getEntriesByFrequency(): Array<{ key: string; accessCount: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Get entries sorted by last access time
   */
  getEntriesByRecency(): Array<{ key: string; lastAccessed: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, lastAccessed: entry.lastAccessed }))
      .sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  private startCleanup(): void {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private async evictIfNecessary(newEntrySize: number): Promise<void> {
    const { maxSize = Infinity, maxEntries = Infinity } = this.options;

    // Check size limit
    while (this.stats.size + newEntrySize > maxSize && this.cache.size > 0) {
      await this.evictLRU();
    }

    // Check entry count limit
    while (this.cache.size >= maxEntries) {
      await this.evictLRU();
    }
  }

  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    await this.delete(lruKey);
  }

  private updateAccessOrder(_key: string): void {
    this.removeFromAccessOrder(_key);
    this.accessOrder.push(_key);
  }

  private removeFromAccessOrder(_key: string): void {
    const index = this.accessOrder.indexOf(_key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private updateStats(): void {
    this.stats.entries = this.cache.size;
    this.stats.size = Array.from(this.cache.values()).reduce(
      (total, entry) => total + (entry.size || 0),
      0
    );

    // Update oldest and newest entry timestamps
    const timestamps = Array.from(this.cache.values()).map(
      entry => entry.timestamp
    );
    if (timestamps.length > 0) {
      this.stats.oldestEntry = Math.min(...timestamps);
      this.stats.newestEntry = Math.max(...timestamps);
    }
  }

  private updateHitRate(): void {
    this.stats.hitRate = calculateHitRate(this.stats.hits, this.stats.misses);
  }

  private emit(
    type: CacheEventType,
    key?: string,
    metadata?: Record<string, any>
  ): void {
    const event: CacheEvent = {
      type,
      level: 'memory',
      key,
      timestamp: Date.now(),
      metadata,
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Cache event listener error:', error);
      }
    });
  }
}
