/**
 * Comprehensive cache manager that coordinates memory, persistent, and network caches
 */

import {
  CacheConfiguration,
  CacheLevel,
  CacheInvalidationRule,
  CacheMetrics,
  CacheEventListener,
  CacheEvent,
  CacheKey,
  CacheSyncOptions,
} from "./cache-types";
import { generateCacheKey, debounce } from "./cache-utils";
import { MemoryCache } from "./memory-cache";
import { NetworkCache } from "./network-cache";
import { PersistentCache } from "./persistent-cache";

export class CacheManager {
  private memoryCache: MemoryCache;
  private persistentCache: any; // Use 'any' to avoid type error from dynamic import
  private networkCache: NetworkCache;
  private listeners: CacheEventListener[] = [];
  private syncInterval?: NodeJS.Timeout;
  private invalidationRules: CacheInvalidationRule[] = [];

  constructor(private config: CacheConfiguration) {
    console.debug("[CacheManager] constructor START");
    // Initialize cache levels
    this.memoryCache = new MemoryCache(config.memory);
    console.debug("[CacheManager] after MemoryCache");
    console.debug("[CacheManager] before PersistentCache assignment");
    this.persistentCache = new PersistentCache(config.persistent);
    console.debug("[CacheManager] after PersistentCache assignment");
    console.debug(
      "[CacheManager] typeof this.persistentCache:",
      typeof this.persistentCache,
    );
    console.debug(
      "[CacheManager] instanceof PersistentCache:",
      this.persistentCache &&
        this.persistentCache.constructor &&
        this.persistentCache.constructor.name,
    );
    console.debug(
      "[CacheManager] typeof this.persistentCache.set:",
      typeof this.persistentCache.set,
    );
    console.debug(
      "[CacheManager] this.persistentCache.set:",
      this.persistentCache.set,
    );
    this.networkCache = new NetworkCache(config.network);
    console.debug("[CacheManager] after NetworkCache");

    // Set up event forwarding
    this.setupEventForwarding();

    // Set up auto-sync if configured
    if (config.global.syncInterval) {
      this.startAutoSync(config.global.syncInterval);
    }

    // Set up debounced invalidation
    this.debouncedInvalidate = debounce(
      this.performInvalidation.bind(this),
      1000,
    );
    console.debug("[CacheManager] constructor END");
  }

  /**
   * Get value from cache with multi-level fallback
   */
  async get<T>(keyData: CacheKey): Promise<T | null> {
    const key = generateCacheKey(keyData);

    // Try memory cache first (fastest)
    let value = await this.memoryCache.get<T>(key);
    if (value !== null) {
      return value;
    }

    // Try persistent cache second
    value = await this.persistentCache.get(key);
    if (value !== null) {
      // Populate memory cache for faster future access
      await this.memoryCache.set(key, value);
      return value;
    }

    // Try network cache last (if online)
    if (!this.config.global.offlineMode) {
      value = await this.networkCache.get<T>(key);
      if (value !== null) {
        // Populate both memory and persistent caches
        await Promise.all([
          this.memoryCache.set(key, value),
          this.persistentCache.set(key, value),
        ]);
        return value;
      }
    }

    return null;
  }

  /**
   * Set value in all appropriate cache levels
   */
  async set<T>(keyData: CacheKey, value: T, ttl?: number): Promise<void> {
    const key = generateCacheKey(keyData);
    // Write-through to memory and persistent; queue to network if online
    await this.memoryCache.set(key, value, ttl);
    await this.persistentCache.set(key, value, ttl);

    if (!this.config.global.offlineMode) {
      try {
        await this.networkCache.set(key, value, ttl);
      } catch (error) {
        console.warn("Network cache set failed, will rely on sync:", error);
      }
    }

    this.emit("set", "all", key, { ttl });
  }

  /**
   * Delete value from all cache levels
   */
  async delete(keyData: CacheKey): Promise<boolean> {
    const key = generateCacheKey(keyData);

    const promises = [
      this.memoryCache.delete(key),
      this.persistentCache.delete(key),
    ];

    if (!this.config.global.offlineMode) {
      promises.push(
        this.networkCache.delete(key).catch((error) => {
          console.warn(
            "Network cache delete failed, will retry during sync:",
            error,
          );
          return false;
        }),
      );
    }

    const results = await Promise.allSettled(promises);
    return results.some(
      (result) => result.status === "fulfilled" && result.value === true,
    );
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    const promises = [this.memoryCache.clear(), this.persistentCache.clear()];

    if (!this.config.global.offlineMode) {
      promises.push(
        this.networkCache.clear().catch((error) => {
          console.warn("Network cache clear failed:", error);
        }),
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Check if key exists in any cache level
   */
  async has(keyData: CacheKey): Promise<boolean> {
    const key = generateCacheKey(keyData);

    // Check memory cache first
    if (await this.memoryCache.has(key)) {
      return true;
    }

    // Check persistent cache
    if (await this.persistentCache.has(key)) {
      return true;
    }

    // Check network cache if online
    if (!this.config.global.offlineMode) {
      return await this.networkCache.has(key);
    }

    return false;
  }

  /**
   * Get cache metrics for all levels
   */
  getMetrics(): CacheMetrics[] {
    const memoryStats = this.memoryCache.getStats();
    const persistentStats = this.persistentCache.getStats();
    const networkStats = this.networkCache.getStats();

    return [
      {
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        items: memoryStats.entries,
        memoryUsage: memoryStats.size,
        level: "memory",
        stats: memoryStats,
        performance: {
          averageGetTime: 0.1, // Memory cache is very fast
          averageSetTime: 0.1,
          averageDeleteTime: 0.1,
        },
      },
      {
        hits: persistentStats.hits,
        misses: persistentStats.misses,
        items: persistentStats.entries,
        memoryUsage: persistentStats.size,
        level: "persistent",
        stats: persistentStats,
        performance: {
          averageGetTime: 5, // Persistent cache is slower
          averageSetTime: 10,
          averageDeleteTime: 5,
        },
      },
      {
        hits: networkStats.hits,
        misses: networkStats.misses,
        items: networkStats.entries,
        memoryUsage: networkStats.size,
        level: "network",
        stats: networkStats,
        performance: {
          averageGetTime: 100, // Network cache is slowest
          averageSetTime: 150,
          averageDeleteTime: 100,
        },
      },
    ];
  }

  /**
   * Synchronize caches when connectivity is restored
   */
  async sync(
    options: CacheSyncOptions = { strategy: "merge" } as CacheSyncOptions,
  ): Promise<void> {
    if (this.config.global.offlineMode) {
      return;
    }

    try {
      // Sync network cache first
      await this.networkCache.sync(options);

      // Sync persistent cache with network cache
      await this.syncPersistentWithNetwork(options);

      this.emit("sync", "all", undefined, { strategy: options.strategy });
    } catch (error) {
      console.error("Cache sync error:", error);
      this.emit("error", "all", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Add cache invalidation rule
   */
  addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.push(rule);
  }

  /**
   * Remove cache invalidation rule
   */
  removeInvalidationRule(rule: CacheInvalidationRule): void {
    const index = this.invalidationRules.indexOf(rule);
    if (index > -1) {
      this.invalidationRules.splice(index, 1);
    }
  }

  /**
   * Manually trigger cache invalidation
   */
  invalidate(pattern?: RegExp | string): void {
    this.debouncedInvalidate(pattern);
  }

  /**
   * Optimize all cache levels
   */
  async optimize(): Promise<void> {
    const promises = [
      this.memoryCache.cleanup(),
      this.persistentCache.optimize(),
    ];

    await Promise.allSettled(promises);
    this.emit("sync", "all", undefined, { optimized: true });
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
   * Set offline mode
   */
  setOfflineMode(offline: boolean): void {
    this.config.global.offlineMode = offline;
    this.networkCache.setOnlineStatus(!offline);
  }

  /**
   * Get cache configuration
   */
  getConfiguration(): CacheConfiguration {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfiguration(newConfig: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart auto-sync if interval changed
    if (newConfig.global?.syncInterval !== undefined) {
      this.stopAutoSync();
      if (newConfig.global.syncInterval > 0) {
        this.startAutoSync(newConfig.global.syncInterval);
      }
    }
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    this.stopAutoSync();
    this.memoryCache.destroy();
    this.listeners = [];
  }

  private debouncedInvalidate: (pattern?: RegExp | string) => void;

  private async performInvalidation(pattern?: RegExp | string): Promise<void> {
    try {
      const allKeys = await Promise.all([
        this.memoryCache.keys(),
        this.persistentCache.keys(),
      ]);

      const uniqueKeys = new Set([...allKeys[0], ...allKeys[1]]);
      const keysToInvalidate: string[] = [];

      for (const key of uniqueKeys) {
        let shouldInvalidate = false;

        // Check pattern match
        if (pattern) {
          if (pattern instanceof RegExp) {
            shouldInvalidate = pattern.test(key);
          } else {
            shouldInvalidate = key.includes(pattern);
          }
        } else {
          // If no pattern provided, invalidate all keys
          shouldInvalidate = true;
        }

        // Check invalidation rules
        if (!shouldInvalidate) {
          for (const rule of this.invalidationRules) {
            if (rule.pattern && rule.pattern.test(key)) {
              shouldInvalidate = true;
              break;
            }

            if (rule.keys && rule.keys.includes(key)) {
              shouldInvalidate = true;
              break;
            }

            if (rule.maxAge) {
              // Check age in memory cache first
              const memoryEntry = await this.memoryCache.get(key);
              if (memoryEntry) {
                const _age =
                  Date.now() - ((memoryEntry as any)?.timestamp || Date.now());
                if (_age > rule.maxAge) {
                  shouldInvalidate = true;
                  break;
                }
              }
            }
          }
        }

        if (shouldInvalidate) {
          keysToInvalidate.push(key);
        }
      }

      // Invalidate keys
      const invalidationPromises = keysToInvalidate.map(async (key) => {
        await Promise.all([
          this.memoryCache.delete(key),
          this.persistentCache.delete(key),
        ]);
      });

      await Promise.allSettled(invalidationPromises);

      if (keysToInvalidate.length > 0) {
        this.emit("invalidate", "all", undefined, {
          invalidatedKeys: keysToInvalidate.length,
        });
      }
    } catch (error) {
      console.error("Cache invalidation error:", error);
      this.emit("error", "all", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async syncPersistentWithNetwork(
    options: CacheSyncOptions,
  ): Promise<void> {
    // This is a simplified sync - in production you might want more sophisticated conflict resolution
    const { strategy = "merge" } = options;

    if (strategy === "replace") {
      // Clear persistent cache and repopulate from network
      await this.persistentCache.clear();
      // In a real implementation, you'd fetch all keys from network and populate persistent cache
    }

    // For 'merge' strategy, we rely on the network cache's sync queue mechanism
  }

  private setupEventForwarding(): void {
    // Forward events from all cache levels
    this.memoryCache.addEventListener((event) => this.forwardEvent(event));
    this.persistentCache.addEventListener((event: CacheEvent) =>
      this.forwardEvent(event),
    );
    this.networkCache.addEventListener((event) => this.forwardEvent(event));
  }

  private forwardEvent(event: CacheEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Cache event listener error:", error);
      }
    });
  }

  private emit(
    type: string,
    level: CacheLevel | "all",
    key?: string,
    metadata?: Record<string, any>,
  ): void {
    const event: CacheEvent = {
      type: type as any,
      level: level as CacheLevel,
      key,
      timestamp: Date.now(),
      metadata,
    };

    this.forwardEvent(event);
  }

  private startAutoSync(interval: number): void {
    this.syncInterval = setInterval(() => {
      this.sync().catch((error) => {
        console.error("Auto-sync error:", error);
      });
    }, interval);
  }

  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }
}
