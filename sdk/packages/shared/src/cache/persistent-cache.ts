/**
 * Persistent cache implementation using IndexedDB for browser and file system for Node.js
 */

import {
  CacheEntry,
  CacheOptions,
  CacheStats,
  CacheStorageAdapter,
  CacheEventListener,
  CacheEvent,
  CacheEventType,
} from "./cache-types";
import {
  calculateEntrySize,
  isExpired,
  calculateHitRate,
  compressData,
  decompressData,
} from "./cache-utils";
import { InMemoryStorageAdapter } from "./in-memory-storage-adapter";

function shouldUsePersistentStorage(): boolean {
  // Explicit opt-in via runtime global (useful for host apps overriding behavior)
  const globalFlag =
    typeof globalThis !== "undefined"
      ? (globalThis as any).__WHITE_ROOM_ENABLE_PERSISTENT_CACHE__
      : undefined;
  if (typeof globalFlag === "boolean") {
    console.debug("[PersistentCache] global flag detected", globalFlag);
    return globalFlag;
  }

  try {
    // Environment variable opt-in (defaults to disabled for safety)
    if (typeof process !== "undefined") {
      const envValue = process.env?.NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE;
      console.debug(
        "[PersistentCache] NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE value",
        envValue,
      );
      if (envValue === "true") {
        return true;
      }
    }
    if (typeof window !== "undefined") {
      const windowFlag = (window as any).__WHITE_ROOM_ENABLE_PERSISTENT_CACHE__;
      if (typeof windowFlag === "boolean") {
        console.debug("[PersistentCache] window flag detected", windowFlag);
        return windowFlag;
      }
      const nextPublicFlag =
        (window as any).__NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE__ ??
        (window as any).NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE;
      if (typeof nextPublicFlag === "string") {
        console.debug(
          "[PersistentCache] window NEXT_PUBLIC flag",
          nextPublicFlag,
        );
        return nextPublicFlag === "true";
      }
    }
    if (typeof globalThis !== "undefined") {
      const globalFlagString = (globalThis as any)
        ?.NEXT_PUBLIC_ENABLE_PERSISTENT_CACHE;
      if (typeof globalFlagString === "string") {
        console.debug(
          "[PersistentCache] global NEXT_PUBLIC flag",
          globalFlagString,
        );
        return globalFlagString === "true";
      }
    }
    if (typeof document !== "undefined") {
      const attrValue = document?.documentElement?.getAttribute(
        "data-enable-persistent-cache",
      );
      if (attrValue) {
        console.debug(
          "[PersistentCache] document attribute data-enable-persistent-cache",
          attrValue,
        );
        return attrValue === "true";
      }
    }
    if (typeof sessionStorage !== "undefined") {
      try {
        const sessionFlag = sessionStorage.getItem(
          "__WHITE_ROOM_ENABLE_PERSISTENT_CACHE__",
        );
        if (sessionFlag !== null) {
          console.debug("[PersistentCache] sessionStorage flag", sessionFlag);
          return sessionFlag === "true";
        }
      } catch (error) {
        console.warn("[PersistentCache] sessionStorage probe failed", error);
      }
    }
    if (typeof localStorage !== "undefined") {
      try {
        const localFlag = localStorage.getItem(
          "__WHITE_ROOM_ENABLE_PERSISTENT_CACHE__",
        );
        if (localFlag !== null) {
          console.debug("[PersistentCache] localStorage flag", localFlag);
          return localFlag === "true";
        }
      } catch (error) {
        console.warn("[PersistentCache] localStorage flag probe failed", error);
      }
    }
    const envFallback =
      (typeof process !== "undefined" &&
        process.env?.ENABLE_PERSISTENT_CACHE === "true") ||
      (typeof process !== "undefined" &&
        process.env?.PERSISTENT_CACHE_ENABLED === "true");
    if (envFallback) {
      console.debug("[PersistentCache] fallback env flag detected");
      return true;
    }
  } catch (error) {
    // Ignore env probing errors (e.g., restricted sandboxes)
    console.warn("[PersistentCache] error while probing flags", error);
  }

  return false;
}

function detectLocalStorageWritable(): boolean {
  if (typeof localStorage === "undefined") {
    return false;
  }

  try {
    const probeKey = "__persistent_cache_probe__";
    const originalValue = localStorage.getItem(probeKey);
    localStorage.setItem(probeKey, "probe");
    localStorage.removeItem(probeKey);

    if (originalValue !== null) {
      localStorage.setItem(probeKey, originalValue);
    }

    return true;
  } catch (error) {
    console.warn(
      "PersistentCache: localStorage is not writable; falling back to in-memory adapter.",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Default storage adapter using localStorage as fallback
 */

class DefaultStorageAdapter implements CacheStorageAdapter {
  private prefix = "cache:";

  async get(_key: string): Promise<any | null> {
    try {
      if (typeof localStorage === "undefined") {
        return null;
      }
      const item = localStorage.getItem(this.prefix + _key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Storage adapter get error:", error);
      return null;
    }
  }

  async set(_key: string, value: any): Promise<void> {
    try {
      if (typeof localStorage === "undefined") {
        return;
      }
      localStorage.setItem(this.prefix + _key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage adapter set error:", error);
    }
  }

  async delete(_key: string): Promise<boolean> {
    try {
      if (typeof localStorage === "undefined") {
        return false;
      }
      const existed = localStorage.getItem(this.prefix + _key) !== null;
      localStorage.removeItem(this.prefix + _key);
      return existed;
    } catch (error) {
      console.error("Storage adapter delete error:", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof localStorage === "undefined") {
        return;
      }
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix),
      );
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Storage adapter clear error:", error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      console.debug("[DefaultStorageAdapter] keys() called");
      if (typeof localStorage === "undefined") {
        console.debug("[DefaultStorageAdapter] localStorage is undefined");
        return [];
      }

      console.debug(
        "[DefaultStorageAdapter] keys() before Object.keys(localStorage)",
      );
      const allKeys = Object.keys(localStorage);

      console.debug(
        "[DefaultStorageAdapter] keys() after Object.keys(localStorage)",
        allKeys,
      );
      const filtered = allKeys.filter((key) => key.startsWith(this.prefix));

      console.debug("[DefaultStorageAdapter] keys() filtered", filtered);
      const mapped = filtered.map((key) => key.substring(this.prefix.length));

      console.debug("[DefaultStorageAdapter] keys() mapped", mapped);
      return mapped;
    } catch (error) {
      console.error("Storage adapter keys error:", error);
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      if (typeof localStorage === "undefined") {
        return 0;
      }
      const keys = await this.keys();
      let totalSize = 0;

      for (const key of keys) {
        const item = localStorage.getItem(this.prefix + key);
        if (item) {
          totalSize += item.length * 2; // Rough UTF-16 estimation
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Storage adapter size error:", error);
      return 0;
    }
  }
}

export class PersistentCache {
  private storageAdapter: CacheStorageAdapter;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    size: 0,
    hitRate: 0,
  };
  private listeners: CacheEventListener[] = [];
  private initPromise: Promise<void>;
  // Promise that resolves when background initialization (updateStats/cleanup)
  // has completed. Callers who need the cache fully initialized should await
  // `ready()` which returns this promise.
  private initCompletePromise: Promise<void>;
  private _resolveInitComplete?: () => void;
  private _rejectInitComplete?: (err?: any) => void;

  constructor(
    private options: CacheOptions & {
      storageAdapter?: CacheStorageAdapter;
      dbName?: string;
      tableName?: string;
    } = {},
  ) {
    console.debug("[PersistentCache] constructor TOP", options);
    // ...existing code...
    const {
      ttl = 24 * 60 * 60 * 1000, // 24 hours default
      maxSize = 100 * 1024 * 1024, // 100MB default
      maxEntries = 10000,
      storageAdapter,
    } = options;

    this.options = { ttl, maxSize, maxEntries, ...options };

    const usePersistent = shouldUsePersistentStorage();
    console.debug(
      "[PersistentCache] shouldUsePersistentStorage",
      usePersistent,
    );
    if (storageAdapter) {
      this.storageAdapter = storageAdapter;
    } else if (usePersistent && detectLocalStorageWritable()) {
      this.storageAdapter = new DefaultStorageAdapter();
    } else {
      this.storageAdapter = new InMemoryStorageAdapter();
    }
    console.debug(
      "[PersistentCache] storage adapter selected",
      this.storageAdapter?.constructor?.name,
    );

    // The public-facing short-circuit promise that keeps existing callers
    // non-blocking. This mirrors the previous behavior where operations do not
    // block waiting for a potentially slow storage initialization. Internally
    // we also expose `initCompletePromise` which callers can await via
    // `ready()` when they need the cache to be fully initialized.
    this.initPromise = Promise.resolve();

    // Setup the init-completion promise and its resolvers.
    this.initCompletePromise = new Promise((resolve, reject) => {
      this._resolveInitComplete = resolve;
      this._rejectInitComplete = reject;
    });

    if (this.storageAdapter.constructor.name === "InMemoryStorageAdapter") {
      console.debug(
        "[PersistentCache] using InMemoryStorageAdapter, resolving ready() immediately",
      );
      // For in-memory adapters, initialization is trivial — resolve ready.
      this._resolveInitComplete?.();
    } else {
      // Start the real initialization asynchronously and resolve/reject the
      // initCompletePromise accordingly so callers using `ready()` get an
      // accurate signal when initialization finishes.
      this.initialize()
        .then(() => {
          this._resolveInitComplete?.();
        })
        .catch((error) => {
          console.error("Persistent cache async initialize failed:", error);
          this._rejectInitComplete?.(error);
        });
    }
    console.debug("[PersistentCache] constructor END");
  }

  /**
   * Wait for background initialization to complete. This does not change the
   * non-blocking behavior of normal cache operations (those still use
   * `initPromise`), but it lets tests and callers explicitly wait for the
   * expensive updateStats/cleanup work to finish.
   */
  async ready(): Promise<void> {
    return this.initCompletePromise;
  }

  private async initialize(): Promise<void> {
    try {
      console.debug("[PersistentCache] initialize called");
      if (
        typeof localStorage === "undefined" ||
        this.storageAdapter.constructor.name === "InMemoryStorageAdapter"
      ) {
        console.debug(
          "[PersistentCache] in-memory adapter or no localStorage, skipping updateStats/cleanup",
        );
        return;
      }
      console.debug("[PersistentCache] initialize before updateStats");
      await this.updateStats();
      console.debug(
        "[PersistentCache] initialize after updateStats, before cleanup",
      );
      await this.cleanup();
      console.debug("[PersistentCache] initialize complete");
    } catch (error) {
      console.error("Persistent cache initialization error:", error);
    }
  }

  /**
   * Get value from persistent cache
   */
  async get<T>(_key: string): Promise<T | null> {
    console.debug("[PersistentCache] get before await initPromise", _key);
    await this.initPromise;
    console.debug("[PersistentCache] get after await initPromise", _key);
    try {
      const entry = await this.storageAdapter.get(_key);
      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        this.emit("miss", _key);
        return null;
      }
      // Check if expired
      if (isExpired(entry)) {
        await this.storageAdapter.delete(_key);
        this.stats.misses++;
        this.updateHitRate();
        this.emit("miss", _key);
        return null;
      }
      // Update access information
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      await this.storageAdapter.set(_key, entry);
      this.stats.hits++;
      this.updateHitRate();
      this.emit("hit", _key);
      // Decompress if needed
      let value = entry.value;
      if (this.options.compressionEnabled && entry.metadata?.compressed) {
        value = decompressData(value);
      }
      return value as T;
    } catch (error) {
      console.error("Persistent cache get error:", error);
      this.stats.misses++;
      this.updateHitRate();
      this.emit("error", _key, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set value in persistent cache
   */
  async set<T>(_key: string, value: T, ttl?: number): Promise<void> {
    console.debug("[PersistentCache.set] TOP", _key);
    await this.initPromise;
    console.debug("[PersistentCache.set] after await initPromise", _key);
    try {
      const entryTtl = ttl || this.options.ttl;
      let processedValue = value;
      const metadata: Record<string, any> = {};
      if (this.options.compressionEnabled) {
        processedValue = compressData(value) as T;
        metadata.compressed = true;
      }
      const entry: CacheEntry<T> = {
        key: _key,
        value: processedValue,
        timestamp: Date.now(),
        ttl: entryTtl,
        accessCount: 0,
        lastAccessed: Date.now(),
        metadata,
      };
      entry.size = calculateEntrySize(entry);
      console.debug("[PersistentCache.set] before evictIfNecessary", _key);
      await this.evictIfNecessary(entry.size!);
      console.debug("[PersistentCache.set] after evictIfNecessary", _key);
      console.debug("[PersistentCache.set] before storageAdapter.set", _key);
      await this.storageAdapter.set(_key, entry);
      console.debug("[PersistentCache.set] after storageAdapter.set", _key);
      console.debug("[PersistentCache.set] before updateStats", _key);
      await this.updateStats();
      console.debug("[PersistentCache.set] after updateStats", _key);
      this.emit("set", _key, { size: entry.size });
    } catch (error) {
      console.error("Persistent cache set error:", error);
      this.emit("error", _key, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete entry from persistent cache
   */
  async delete(_key: string): Promise<boolean> {
    console.debug("[PersistentCache] delete before await initPromise", _key);
    await this.initPromise;
    console.debug("[PersistentCache] delete after await initPromise", _key);
    try {
      const existed = await this.storageAdapter.delete(_key);
      if (existed) {
        await this.updateStats();
        this.emit("delete", _key);
      }
      return existed;
    } catch (error) {
      console.error("Persistent cache delete error:", error);
      this.emit("error", _key, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    await this.initPromise;

    try {
      await this.storageAdapter.clear();
      await this.updateStats();
      this.emit("clear");
    } catch (error) {
      console.error("Persistent cache clear error:", error);
      this.emit("error", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    await this.initPromise;

    try {
      return await this.storageAdapter.keys();
    } catch (error) {
      console.error("Persistent cache keys error:", error);
      return [];
    }
  }

  /**
   * Get cache size in bytes
   */
  async size(): Promise<number> {
    await this.initPromise;
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
    await this.initPromise;

    try {
      const entry = await this.storageAdapter.get(_key);
      return entry !== null && !isExpired(entry);
    } catch (error) {
      console.error("Persistent cache has error:", error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    // Process in batches to avoid overwhelming storage
    const batchSize = 50;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const batchPromises = batch.map(async (key) => {
        const value = await this.get<T>(key);
        return { key, value };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ key, value }) => {
        results.set(key, value);
      });
    }

    return results;
  }

  /**
   * Set multiple values at once
   */
  async setMultiple<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    // Process in batches to avoid overwhelming storage
    const batchSize = 50;
    const entriesArray = Array.from(entries.entries());

    for (let i = 0; i < entriesArray.length; i += batchSize) {
      const batch = entriesArray.slice(i, i + batchSize);
      const batchPromises = batch.map(([key, value]) =>
        this.set(key, value, ttl),
      );
      await Promise.all(batchPromises);
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
  async cleanup(): Promise<number> {
    await this.initPromise;

    console.debug("[PersistentCache] cleanup called");
    try {
      console.debug("[PersistentCache] cleanup before keys");
      const keys = await this.storageAdapter.keys();
      console.debug("[PersistentCache] cleanup after keys", keys);
      let removedCount = 0;
      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        for (const key of batch) {
          const entry = await this.storageAdapter.get(key);
          if (entry && isExpired(entry)) {
            await this.storageAdapter.delete(key);
            removedCount++;
          }
        }
      }
      if (removedCount > 0) {
        await this.updateStats();
        this.emit("invalidate", undefined, { removedCount });
      }

      console.debug("[PersistentCache] cleanup complete", { removedCount });
      return removedCount;
    } catch (error) {
      console.error("Persistent cache cleanup error:", error);
      return 0;
    }
  }

  /**
   * Optimize storage by defragmenting and compacting
   */
  async optimize(): Promise<void> {
    await this.initPromise;

    try {
      // First cleanup expired entries
      await this.cleanup();

      // Get all entries and re-save them (this can help with storage optimization)
      const keys = await this.storageAdapter.keys();
      const entries: Array<{ _key: string; entry: CacheEntry }> = [];

      // Load all entries
      for (const key of keys) {
        const entry = await this.storageAdapter.get(key);
        if (entry && !isExpired(entry)) {
          entries.push({ _key: key, entry });
        }
      }

      // Clear storage
      await this.storageAdapter.clear();

      // Re-save all valid entries
      for (const { _key, entry } of entries) {
        await this.storageAdapter.set(_key, entry);
      }

      await this.updateStats();
      this.emit("sync", undefined, {
        optimized: true,
        entries: entries.length,
      });
    } catch (error) {
      console.error("Persistent cache optimize error:", error);
      this.emit("error", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async evictIfNecessary(newEntrySize: number): Promise<void> {
    console.debug("[PersistentCache.evictIfNecessary] TOP", newEntrySize);
    // Check if we need to evict entries based on size or count
    const keys = await this.storageAdapter.keys();
    console.debug("[PersistentCache.evictIfNecessary] after keys", keys);
    const totalSize = await this.storageAdapter.size();
    console.debug("[PersistentCache.evictIfNecessary] after size", totalSize);
    const { maxSize = Infinity, maxEntries = Infinity } = this.options;

    // Check size limit
    while (this.stats.size + newEntrySize > maxSize) {
      const evicted = await this.evictLRU();
      if (!evicted) break; // No more entries to evict
    }

    // Check entry count limit
    while (this.stats.entries >= maxEntries) {
      const evicted = await this.evictLRU();
      if (!evicted) break; // No more entries to evict
    }
    console.debug("[PersistentCache.evictIfNecessary] END");
  }

  private async evictLRU(): Promise<boolean> {
    try {
      const keys = await this.storageAdapter.keys();
      if (keys.length === 0) return false;

      let oldestKey = "";
      let oldestTime = Infinity;

      // Find the least recently used entry
      for (const key of keys) {
        const entry = await this.storageAdapter.get(key);
        if (entry && entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        await this.storageAdapter.delete(oldestKey);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Persistent cache evict LRU error:", error);
      return false;
    }
  }

  private async updateStats(): Promise<void> {
    try {
      console.debug("[PersistentCache] updateStats called");
      console.debug("[PersistentCache] updateStats before keys");
      const keys = await this.storageAdapter.keys();
      console.debug("[PersistentCache] updateStats after keys", keys);
      this.stats.entries = keys.length;
      console.debug("[PersistentCache] updateStats before size");
      this.stats.size = await this.storageAdapter.size();
      console.debug(
        "[PersistentCache] updateStats after size",
        this.stats.size,
      );

      console.debug("[PersistentCache] updateStats keys", keys);
      // Update oldest and newest entry timestamps
      let oldestTime = Infinity;
      let newestTime = 0;
      for (const key of keys) {
        const entry = await this.storageAdapter.get(key);
        if (entry) {
          if (entry.timestamp < oldestTime) oldestTime = entry.timestamp;
          if (entry.timestamp > newestTime) newestTime = entry.timestamp;
        }
      }
      if (oldestTime !== Infinity) this.stats.oldestEntry = oldestTime;
      if (newestTime !== 0) this.stats.newestEntry = newestTime;

      console.debug("[PersistentCache] updateStats complete", this.stats);
    } catch (error) {
      console.error("Persistent cache update stats error:", error);
    }
  }

  private updateHitRate(): void {
    this.stats.hitRate = calculateHitRate(this.stats.hits, this.stats.misses);
  }

  private emit(
    type: CacheEventType,
    key?: string,
    metadata?: Record<string, any>,
  ): void {
    const event: CacheEvent = {
      type,
      level: "persistent",
      key,
      timestamp: Date.now(),
      metadata,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Cache event listener error:", error);
      }
    });
  }
}
