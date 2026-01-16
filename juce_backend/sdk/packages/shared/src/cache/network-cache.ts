/**
 * Network cache implementation for remote caching and synchronization
 */

import {
  CacheEntry,
  CacheOptions,
  CacheStats,
  CacheEventListener,
  CacheEvent,
  CacheEventType,
  CacheSyncOptions,
} from './cache-types';
import { calculateEntrySize, isExpired, calculateHitRate } from './cache-utils';

interface NetworkCacheOptions extends CacheOptions {
  endpoint?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class NetworkCache {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    size: 0,
    hitRate: 0,
  };
  private listeners: CacheEventListener[] = [];
  private isOnline = true;
  private syncQueue: Array<{
    operation: string;
    _key: string;
    value?: any;
    timestamp: number;
  }> = [];

  constructor(private options: NetworkCacheOptions = {}) {
    const {
      ttl = 60 * 60 * 1000, // 1 hour default
      endpoint = '/api/cache',
      timeout = 5000,
      retryAttempts = 3,
      retryDelay = 1000,
    } = options;

    this.options = {
      ttl,
      endpoint,
      timeout,
      retryAttempts,
      retryDelay,
      ...options,
    };

    // Monitor online status
    this.setupOnlineStatusMonitoring();
  }

  /**
   * Get value from network cache
   */
  async get<T>(_key: string): Promise<T | null> {
    if (!this.isOnline) {
      this.stats.misses++;
      this.updateHitRate();
      this.emit('miss', _key, { reason: 'offline' });
      return null;
    }

    try {
      const response = await this.makeRequest(
        'GET',
        `${this.options.endpoint}/${encodeURIComponent(_key)}`
      );

      if (response.status === 404) {
        this.stats.misses++;
        this.updateHitRate();
        this.emit('miss', _key);
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `Network cache GET failed: ${response.status} ${response.statusText}`
        );
      }

      const entry: CacheEntry = await response.json();

      // Check if expired
      if (isExpired(entry)) {
        this.stats.misses++;
        this.updateHitRate();
        this.emit('miss', _key, { reason: 'expired' });
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      this.emit('hit', _key);

      return entry.value as T;
    } catch (error) {
      console.error('Network cache get error:', error);
      this.stats.misses++;
      this.updateHitRate();
      this.emit('error', _key, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set value in network cache
   */
  async set<T>(_key: string, value: T, ttl?: number): Promise<void> {
    const entryTtl = ttl || this.options.ttl;

    const entry: CacheEntry<T> = {
      key: _key,
      value,
      timestamp: Date.now(),
      ttl: entryTtl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: calculateEntrySize({
        key: _key,
        value,
        timestamp: Date.now(),
        ttl: entryTtl,
        accessCount: 0,
        lastAccessed: Date.now(),
      }),
    };

    if (!this.isOnline) {
      // Queue for later sync
      this.syncQueue.push({
        operation: 'set',
        _key,
        value: entry,
        timestamp: Date.now(),
      });
      this.emit('set', _key, { queued: true });
      return;
    }

    try {
      const response = await this.makeRequest(
        'PUT',
        `${this.options.endpoint}/${encodeURIComponent(_key)}`,
        entry
      );

      if (!response.ok) {
        throw new Error(
          `Network cache SET failed: ${response.status} ${response.statusText}`
        );
      }

      this.emit('set', _key, { size: entry.size });
    } catch (error) {
      console.error('Network cache set error:', error);

      // Queue for retry
      this.syncQueue.push({
        operation: 'set',
        _key,
        value: entry,
        timestamp: Date.now(),
      });

      this.emit('error', _key, {
        error: error instanceof Error ? error.message : String(error),
        queued: true,
      });
      throw error;
    }
  }

  /**
   * Delete entry from network cache
   */
  async delete(_key: string): Promise<boolean> {
    if (!this.isOnline) {
      // Queue for later sync
      this.syncQueue.push({
        operation: 'delete',
        _key,
        timestamp: Date.now(),
      });
      this.emit('delete', _key, { queued: true });
      return true; // Assume success for offline operations
    }

    try {
      const response = await this.makeRequest(
        'DELETE',
        `${this.options.endpoint}/${encodeURIComponent(_key)}`
      );

      const existed = response.status !== 404;

      if (response.ok || response.status === 404) {
        this.emit('delete', _key);
        return existed;
      }

      throw new Error(
        `Network cache DELETE failed: ${response.status} ${response.statusText}`
      );
    } catch (error) {
      console.error('Network cache delete error:', error);

      // Queue for retry
      this.syncQueue.push({
        operation: 'delete',
        _key,
        timestamp: Date.now(),
      });

      this.emit('error', _key, {
        error: error instanceof Error ? error.message : String(error),
        queued: true,
      });
      return false;
    }
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    if (!this.isOnline) {
      // Queue for later sync
      this.syncQueue.push({
        operation: 'clear',
        _key: '*',
        timestamp: Date.now(),
      });
      this.emit('clear', undefined, { queued: true });
      return;
    }

    try {
      const response = await this.makeRequest('DELETE', this.options.endpoint!);

      if (!response.ok) {
        throw new Error(
          `Network cache CLEAR failed: ${response.status} ${response.statusText}`
        );
      }

      this.emit('clear');
    } catch (error) {
      console.error('Network cache clear error:', error);

      // Queue for retry
      this.syncQueue.push({
        operation: 'clear',
        _key: '*',
        timestamp: Date.now(),
      });

      this.emit('error', undefined, {
        error: error instanceof Error ? error.message : String(error),
        queued: true,
      });
      throw error;
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    if (!this.isOnline) {
      return [];
    }

    try {
      const response = await this.makeRequest(
        'GET',
        `${this.options.endpoint}/keys`
      );

      if (!response.ok) {
        throw new Error(
          `Network cache KEYS failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Network cache keys error:', error);
      this.emit('error', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get cache size in bytes
   */
  async size(): Promise<number> {
    if (!this.isOnline) {
      return 0;
    }

    try {
      const response = await this.makeRequest(
        'GET',
        `${this.options.endpoint}/stats`
      );

      if (!response.ok) {
        throw new Error(
          `Network cache SIZE failed: ${response.status} ${response.statusText}`
        );
      }

      const stats = await response.json();
      return stats.size || 0;
    } catch (error) {
      console.error('Network cache size error:', error);
      this.emit('error', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
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
    if (!this.isOnline) {
      return false;
    }

    try {
      const response = await this.makeRequest(
        'HEAD',
        `${this.options.endpoint}/${encodeURIComponent(_key)}`
      );
      return response.ok;
    } catch (error) {
      console.error('Network cache has error:', error);
      return false;
    }
  }

  /**
   * Synchronize queued operations when back online
   */
  async sync(options: CacheSyncOptions = { strategy: 'merge' }): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const { batchSize = 10, retryAttempts = 3 } = options;
    const queue = [...this.syncQueue];
    this.syncQueue = [];

    try {
      // Process queue in batches
      for (let i = 0; i < queue.length; i += batchSize) {
        const batch = queue.slice(i, i + batchSize);

        const batchPromises = batch.map(async item => {
          let attempts = 0;

          while (attempts < retryAttempts) {
            try {
              switch (item.operation) {
                case 'set':
                  await this.set(item._key, item.value);
                  break;
                case 'delete':
                  await this.delete(item._key);
                  break;
                case 'clear':
                  await this.clear();
                  break;
              }
              return; // Success
            } catch (error) {
              attempts++;
              if (attempts >= retryAttempts) {
                console.error(
                  `Failed to sync ${item.operation} for key ${item._key} after ${retryAttempts} attempts:`,
                  error
                );
                // Re-queue failed items
                this.syncQueue.push(item);
              } else {
                // Wait before retry
                await new Promise(resolve =>
                  setTimeout(resolve, this.options.retryDelay! * attempts)
                );
              }
            }
          }
        });

        await Promise.allSettled(batchPromises);
      }

      this.emit('sync', undefined, {
        processed: queue.length,
        remaining: this.syncQueue.length,
      });
    } catch (error) {
      console.error('Network cache sync error:', error);
      this.emit('error', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
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
   * Get sync queue status
   */
  getSyncQueueStatus(): { count: number; operations: string[] } {
    return {
      count: this.syncQueue.length,
      operations: this.syncQueue.map(item => `${item.operation}:${item._key}`),
    };
  }

  /**
   * Force online/offline status (for testing)
   */
  setOnlineStatus(online: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    if (!wasOnline && online) {
      // Just came back online, sync queued operations
      this.sync().catch(error => {
        console.error('Auto-sync error:', error);
      });
    }
  }

  private async makeRequest(
    method: string,
    url: string,
    body?: any
  ): Promise<Response> {
    const { timeout = 5000, headers = {} } = this.options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private setupOnlineStatusMonitoring(): void {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      window.addEventListener
    ) {
      // Browser environment
      this.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.sync().catch(error => {
          console.error('Auto-sync on online error:', error);
        });
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    } else {
      // Node.js/test environment - assume online by default
      this.isOnline = true;
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
      level: 'network',
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
