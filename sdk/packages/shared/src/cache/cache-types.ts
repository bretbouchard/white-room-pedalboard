/**
 * Type definitions for the caching system
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  size?: number; // Size in bytes
  accessCount: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  maxEntries?: number; // Maximum number of entries
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  size: number; // Total size in bytes
  hitRate: number;
  oldestEntry?: number; // Timestamp
  newestEntry?: number; // Timestamp
}

export interface CacheInvalidationRule {
  pattern?: RegExp;
  keys?: string[];
  maxAge?: number;
  condition?: (entry: CacheEntry) => boolean;
}

export interface CacheSyncOptions {
  strategy: "merge" | "replace" | "conflict-resolution";
  conflictResolver?: (local: CacheEntry, remote: CacheEntry) => CacheEntry;
  batchSize?: number;
  retryAttempts?: number;
}

export interface CacheStorageAdapter {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

export type CacheLevel = "memory" | "persistent" | "network";

export interface CacheConfiguration {
  memory: CacheOptions;
  persistent: CacheOptions & {
    storageAdapter?: CacheStorageAdapter;
    dbName?: string;
    tableName?: string;
  };
  network: CacheOptions & {
    endpoint?: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
  global: {
    enableCompression?: boolean;
    enableEncryption?: boolean;
    syncInterval?: number; // Auto-sync interval in milliseconds
    offlineMode?: boolean;
  };
}

export interface CacheKey {
  namespace: string;
  operation: string;
  parameters: Record<string, any>;
  version?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  items: number;
  memoryUsage: number;
  level: CacheLevel;
  stats: CacheStats;
  performance: {
    averageGetTime: number;
    averageSetTime: number;
    averageDeleteTime: number;
  };
}

export type CacheEventType =
  | "hit"
  | "miss"
  | "set"
  | "delete"
  | "clear"
  | "invalidate"
  | "sync"
  | "error";

export interface CacheEvent {
  type: CacheEventType;
  level: CacheLevel;
  key?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type CacheEventListener = (event: CacheEvent) => void;
