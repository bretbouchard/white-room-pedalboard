/**
 * Song State Cache - Performance optimization for deriveSongState()
 *
 * Provides LRU (Least Recently Used) caching for SongState derivation
 * to avoid redundant computation when deriving the same contract multiple times.
 */

import type { SongContractV1 } from './song_contract.js';
import type { SongStateV1 } from './song_state_v1.js';

// ============================================================================
// Cache Entry
// ============================================================================

/**
 * Cache entry storing derived SongState and metadata
 */
interface CacheEntry {
  /** The derived SongState */
  songState: SongStateV1;
  /** When this entry was created (timestamp) */
  createdAt: number;
  /** When this entry was last accessed (timestamp) */
  lastAccessedAt: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Size of entry in bytes (approximate) */
  sizeBytes: number;
}

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Cache configuration options
 */
export interface SongCacheOptions {
  /** Maximum number of entries to store (default: 100) */
  maxEntries?: number;
  /** Maximum total size in bytes (default: 50MB) */
  maxSizeBytes?: number;
  /** Entry TTL in milliseconds (default: 1 hour) */
  ttlMs?: number;
  /** Enable/disable cache (default: true) */
  enabled?: boolean;
}

/** Default cache configuration */
const DEFAULT_CACHE_OPTIONS: Required<SongCacheOptions> = {
  maxEntries: 100,
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  ttlMs: 60 * 60 * 1000, // 1 hour
  enabled: true
};

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generate cache key from contract and seed
 *
 * The key is a string that uniquely identifies the derivation parameters.
 * It includes:
 * - Contract ID (unique identifier)
 * - Contract hash (content hash)
 * - Seed (PRNG seed)
 */
function generateCacheKey(contract: SongContractV1, seed?: number): string {
  // Create a hash of the contract content
  const contractHash = hashContract(contract);

  // Build key from contract ID, hash, and seed
  const seedPart = seed !== undefined ? `seed:${seed}` : `seed:${contract.seed}`;
  return `${contract.id}:${contractHash}:${seedPart}`;
}

/**
 * Simple hash of contract content for cache key
 *
 * This is a lightweight hash function for cache invalidation.
 * It doesn't need to be cryptographically secure, just fast and collision-resistant.
 */
function hashContract(contract: SongContractV1): string {
  // Stringify contract with sorted keys for consistency
  const normalized = JSON.stringify(contract, Object.keys(contract).sort());

  // Simple DJB2 hash
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i); // hash * 33 + char
  }

  return (hash >>> 0).toString(16); // Convert to unsigned hex
}

/**
 * Estimate size of SongState in bytes
 *
 * This is an approximation used for cache size management.
 */
function estimateSize(songState: SongStateV1): number {
  // Base object overhead
  let size = 1000;

  // Notes array (most significant contributor)
  size += songState.notes.length * 200; // ~200 bytes per note

  // Timeline sections
  size += songState.timeline.sections.length * 300;

  // Automations
  size += songState.automations.length * 150;

  // Voice assignments
  size += songState.voiceAssignments.length * 100;

  // Console and presets
  size += 500; // Approximate

  return size;
}

// ============================================================================
// Song Cache Implementation
// ============================================================================

/**
 * Song State Cache
 *
 * LRU cache for SongState derivation results with size and time limits.
 */
export class SongCache {
  private cache: Map<string, CacheEntry> = new Map();
  private currentSizeBytes: number = 0;
  private options: Required<SongCacheOptions>;

  constructor(options: SongCacheOptions = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
  }

  /**
   * Get cached SongState for contract and seed
   *
   * @param contract - Song contract to derive
   * @param seed - PRNG seed (optional)
   * @returns Cached SongState or null if not found/expired
   */
  get(contract: SongContractV1, seed?: number): SongStateV1 | null {
    if (!this.options.enabled) {
      return null;
    }

    const key = generateCacheKey(contract, seed);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.createdAt > this.options.ttlMs) {
      this.cache.delete(key);
      this.currentSizeBytes -= entry.sizeBytes;
      return null;
    }

    // Update access metadata
    entry.lastAccessedAt = now;
    entry.accessCount++;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.songState;
  }

  /**
   * Store SongState in cache
   *
   * @param contract - Song contract that was derived
   * @param seed - PRNG seed that was used
   * @param songState - Derived SongState to cache
   */
  set(contract: SongContractV1, seed: number | undefined, songState: SongStateV1): void {
    if (!this.options.enabled) {
      return;
    }

    const key = generateCacheKey(contract, seed);
    const now = Date.now();
    const sizeBytes = estimateSize(songState);

    // Remove existing entry if present
    const existing = this.cache.get(key);
    if (existing) {
      this.cache.delete(key);
      this.currentSizeBytes -= existing.sizeBytes;
    }

    // Evict entries if necessary
    this.evictIfNeeded(sizeBytes);

    // Add new entry
    const entry: CacheEntry = {
      songState,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      sizeBytes
    };

    this.cache.set(key, entry);
    this.currentSizeBytes += sizeBytes;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      entries: this.cache.size,
      totalSizeBytes: this.currentSizeBytes,
      maxEntries: this.options.maxEntries,
      maxSizeBytes: this.options.maxSizeBytes,
      ttlMs: this.options.ttlMs,
      enabled: this.options.enabled,
      hitRate: this.calculateHitRate(),
      oldestEntry: this.getOldestEntry(),
      newestEntry: this.getNewestEntry()
    };
  }

  /**
   * Evict least recently used entries if cache is full
   */
  private evictIfNeeded(neededSize: number): void {
    // Evict by entry count
    while (this.cache.size >= this.options.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (!firstKey) break;

      const entry = this.cache.get(firstKey);
      if (entry) {
        this.currentSizeBytes -= entry.sizeBytes;
      }
      this.cache.delete(firstKey);
    }

    // Evict by size
    while (this.currentSizeBytes + neededSize > this.options.maxSizeBytes) {
      const firstKey = this.cache.keys().next().value;
      if (!firstKey) break;

      const entry = this.cache.get(firstKey);
      if (entry) {
        this.currentSizeBytes -= entry.sizeBytes;
      }
      this.cache.delete(firstKey);
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(): number {
    let totalAccesses = 0;
    let hits = 0;

    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
      hits += entry.accessCount - 1; // First access is a miss, subsequent are hits
    }

    return totalAccesses > 0 ? hits / totalAccesses : 0;
  }

  /**
   * Get oldest entry age
   */
  private getOldestEntry(): number | null {
    let oldest: number | null = null;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      const age = now - entry.createdAt;
      if (oldest === null || age > oldest) {
        oldest = age;
      }
    }

    return oldest;
  }

  /**
   * Get newest entry age
   */
  private getNewestEntry(): number | null {
    let newest: number | null = null;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      const age = now - entry.createdAt;
      if (newest === null || age < newest) {
        newest = age;
      }
    }

    return newest;
  }
}

// ============================================================================
// Cache Statistics
// ============================================================================

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of entries in cache */
  entries: number;
  /** Total size of all entries in bytes */
  totalSizeBytes: number;
  /** Maximum number of entries allowed */
  maxEntries: number;
  /** Maximum total size allowed in bytes */
  maxSizeBytes: number;
  /** Time-to-live for entries in milliseconds */
  ttlMs: number;
  /** Whether cache is enabled */
  enabled: boolean;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Age of oldest entry in milliseconds (null if empty) */
  oldestEntry: number | null;
  /** Age of newest entry in milliseconds (null if empty) */
  newestEntry: number | null;
}

// ============================================================================
// Global Cache Instance
// ============================================================================

/**
 * Global SongState cache instance
 *
 * This cache is shared across all deriveSongState calls for optimal performance.
 */
export const globalSongCache = new SongCache();

/**
 * Reset global cache to default configuration
 */
export function resetGlobalCache(options?: SongCacheOptions): void {
  globalSongCache.clear();
  Object.assign(globalSongCache, new SongCache(options));
}
