/**
 * Song Cache Tests
 *
 * Test LRU cache for SongState derivation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SongCache, resetGlobalCache, globalSongCache } from '../song_cache.js';
import type { SongContractV1 } from '../song_contract.js';
import type { SongStateV1 } from '../song_state_v1.js';

// Create test contract
function createTestContract(overrides: Partial<SongContractV1> = {}): SongContractV1 {
  return {
    version: '1.0',
    id: 'contract-test-' + Math.random().toString(36).substring(7),
    seed: 42,
    rhythmSystems: [
      {
        id: 'rhythm-test',
        generators: [
          { period: 4, weight: 1.0 },
          { period: 6, weight: 1.0 }
        ],
        resultants: [
          { period: 12, weight: 1.0 }
        ],
        density: {
          gridResolution: 0.25,
          minDensity: 0.3,
          maxDensity: 0.7
        }
      }
    ],
    melodySystems: [
      {
        id: 'melody-test',
        pitchCycle: {
          root: 0,
          intervals: [0, 4, 7, 12]
        },
        intervalSeeds: [
          {
            ordered: true,
            intervals: [2, 2, 1, 2, 2, 2, 1]
          }
        ],
        contour: {
          direction: 'neutral',
          complexity: 0.5
        },
        register: {
          minNote: 48,
          maxNote: 72
        }
      }
    ],
    formSystem: {
      sections: [
        { name: 'Verse', durationBars: 8 },
        { name: 'Chorus', durationBars: 8 }
      ]
    },
    ensemble: {
      voices: [
        {
          id: 'voice-test',
          name: 'Test Voice',
          role: 'melody'
        }
      ]
    },
    instrumentAssignments: [],
    presetAssignments: [],
    console: {
      buses: []
    },
    ...overrides
  };
}

// Mock SongState for testing
function createMockSongState(contractId: string): SongStateV1 {
  return {
    version: '1.0',
    id: `song-${contractId}`,
    sourceContractId: contractId,
    derivationId: 'derivation-test',
    timeline: {
      sections: [],
      tempo: 120,
      timeSignature: [4, 4]
    },
    notes: [],
    automations: [],
    duration: 44100 * 8,
    tempo: 120,
    timeSignature: [4, 4],
    sampleRate: 44100,
    voiceAssignments: [],
    console: {
      buses: []
    },
    presets: [],
    derivedAt: Date.now()
  };
}

describe('SongCache', () => {
  let cache: SongCache;

  beforeEach(() => {
    // Create fresh cache for each test
    cache = new SongCache({
      maxEntries: 5,
      maxSizeBytes: 1024 * 1024, // 1MB
      ttlMs: 1000, // 1 second
      enabled: true
    });
  });

  describe('cache get/set', () => {
    it('should store and retrieve SongState', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      cache.set(contract, 42, songState);
      const retrieved = cache.get(contract, 42);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(songState.id);
    });

    it('should return null for cache miss', () => {
      const contract = createTestContract();
      const retrieved = cache.get(contract, 42);

      expect(retrieved).toBeNull();
    });

    it('should use different seeds for different cache entries', () => {
      const contract = createTestContract();
      const songState1 = createMockSongState(contract.id + '-1');
      const songState2 = createMockSongState(contract.id + '-2');

      cache.set(contract, 42, songState1);
      cache.set(contract, 43, songState2);

      const retrieved1 = cache.get(contract, 42);
      const retrieved2 = cache.get(contract, 43);

      expect(retrieved1?.id).toBe(songState1.id);
      expect(retrieved2?.id).toBe(songState2.id);
    });

    it('should use default seed when not provided', () => {
      const contract = createTestContract({ seed: 42 });
      const songState = createMockSongState(contract.id);

      cache.set(contract, undefined, songState);
      const retrieved = cache.get(contract, undefined);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(songState.id);
    });
  });

  describe('cache expiration', () => {
    it('should expire entries after TTL', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      cache.set(contract, 42, songState);

      // Wait for TTL to expire (1 second)
      const advanceTime = (ms: number) => vi.advanceTimersByTimeAsync(ms);
      vi.useFakeTimers();

      setTimeout(() => {
        const retrieved = cache.get(contract, 42);
        expect(retrieved).toBeNull();
      }, 1100);

      advanceTime(1100);

      vi.useRealTimers();
    });

    it('should not expire entries before TTL', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      cache.set(contract, 42, songState);

      // Wait less than TTL
      const advanceTime = (ms: number) => vi.advanceTimersByTimeAsync(ms);
      vi.useFakeTimers();

      setTimeout(() => {
        const retrieved = cache.get(contract, 42);
        expect(retrieved).toBeDefined();
      }, 500);

      advanceTime(500);

      vi.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when max entries reached', () => {
      const contracts = Array.from({ length: 6 }, (_, i) =>
        createTestContract({ id: `contract-${i}` })
      );

      // Add 6 contracts (max is 5)
      contracts.forEach((contract, i) => {
        const songState = createMockSongState(contract.id);
        cache.set(contract, i, songState);
      });

      // First contract should be evicted
      expect(cache.get(contracts[0], 0)).toBeNull();

      // Other contracts should still be present
      expect(cache.get(contracts[1], 1)).toBeDefined();
      expect(cache.get(contracts[5], 5)).toBeDefined();
    });

    it('should update LRU order on access', () => {
      const contracts = Array.from({ length: 5 }, (_, i) =>
        createTestContract({ id: `contract-${i}` })
      );

      // Add 5 contracts
      contracts.forEach((contract, i) => {
        const songState = createMockSongState(contract.id);
        cache.set(contract, i, songState);
      });

      // Access first contract (should move to end)
      cache.get(contracts[0], 0);

      // Add 6th contract (should evict contracts[1], not contracts[0])
      const newContract = createTestContract({ id: 'contract-new' });
      cache.set(newContract, 6, createMockSongState(newContract.id));

      expect(cache.get(contracts[0], 0)).toBeDefined();
      expect(cache.get(contracts[1], 1)).toBeNull();
      expect(cache.get(contracts[2], 2)).toBeDefined();
    });
  });

  describe('size-based eviction', () => {
    it('should evict entries when max size is reached', () => {
      // Create cache with small size limit
      const smallCache = new SongCache({
        maxEntries: 100,
        maxSizeBytes: 1000, // Very small
        enabled: true
      });

      const contracts = Array.from({ length: 10 }, (_, i) =>
        createTestContract({ id: `contract-${i}` })
      );

      // Add contracts until size limit is reached
      // Each entry is ~1000 bytes, so only 1 should fit
      contracts.forEach((contract, i) => {
        const songState = createMockSongState(contract.id);
        smallCache.set(contract, i, songState);
      });

      // Only the most recent entry should be present
      const stats = smallCache.getStats();
      expect(stats.entries).toBe(1);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('cache statistics', () => {
    it('should report accurate statistics', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      cache.set(contract, 42, songState);

      const stats = cache.getStats();

      expect(stats.entries).toBe(1);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.maxEntries).toBe(5);
      expect(stats.maxSizeBytes).toBe(1024 * 1024);
      expect(stats.ttlMs).toBe(1000);
      expect(stats.enabled).toBe(true);
      expect(stats.hitRate).toBe(0); // No hits yet
    });

    it('should calculate hit rate correctly', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      cache.set(contract, 42, songState);

      // First access (hit)
      cache.get(contract, 42);
      // Second access (hit)
      cache.get(contract, 42);

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should report oldest and newest entry age', () => {
      const contract1 = createTestContract({ id: 'contract-1' });
      const contract2 = createTestContract({ id: 'contract-2' });

      const songState1 = createMockSongState(contract1.id);
      const songState2 = createMockSongState(contract2.id);

      cache.set(contract1, 42, songState1);

      const advanceTime = (ms: number) => vi.advanceTimersByTimeAsync(ms);
      vi.useFakeTimers();

      setTimeout(() => {
        cache.set(contract2, 43, songState2);
        const stats = cache.getStats();

        expect(stats.oldestEntry).toBeGreaterThan(stats.newestEntry);
      }, 100);

      advanceTime(100);

      vi.useRealTimers();
    });
  });

  describe('cache operations', () => {
    it('should clear all entries', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      cache.set(contract, 42, songState);
      expect(cache.get(contract, 42)).toBeDefined();

      cache.clear();
      expect(cache.get(contract, 42)).toBeNull();

      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
    });

    it('should be disabled when enabled is false', () => {
      const disabledCache = new SongCache({
        enabled: false
      });

      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      disabledCache.set(contract, 42, songState);
      const retrieved = disabledCache.get(contract, 42);

      expect(retrieved).toBeNull();
    });
  });

  describe('cache key generation', () => {
    it('should generate different keys for different contracts', () => {
      const contract1 = createTestContract({ id: 'contract-1' });
      const contract2 = createTestContract({ id: 'contract-2' });

      const songState1 = createMockSongState(contract1.id);
      const songState2 = createMockSongState(contract2.id);

      cache.set(contract1, 42, songState1);
      cache.set(contract2, 42, songState2);

      expect(cache.get(contract1, 42)?.id).toBe(songState1.id);
      expect(cache.get(contract2, 42)?.id).toBe(songState2.id);
    });

    it('should generate different keys for different seeds', () => {
      const contract = createTestContract();
      const songState1 = createMockSongState(contract.id + '-1');
      const songState2 = createMockSongState(contract.id + '-2');

      cache.set(contract, 42, songState1);
      cache.set(contract, 43, songState2);

      expect(cache.get(contract, 42)?.id).toBe(songState1.id);
      expect(cache.get(contract, 43)?.id).toBe(songState2.id);
    });
  });

  describe('global cache', () => {
    it('should provide global cache instance', () => {
      expect(globalSongCache).toBeInstanceOf(SongCache);
    });

    it('should allow resetting global cache', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      globalSongCache.set(contract, 42, songState);
      expect(globalSongCache.get(contract, 42)).toBeDefined();

      resetGlobalCache();
      expect(globalSongCache.get(contract, 42)).toBeNull();
    });
  });

  describe('performance', () => {
    it('should be faster to retrieve from cache than to derive', () => {
      const contract = createTestContract();
      const songState = createMockSongState(contract.id);

      cache.set(contract, 42, songState);

      // Measure cache retrieval time
      const startCache = performance.now();
      for (let i = 0; i < 1000; i++) {
        cache.get(contract, 42);
      }
      const cacheTime = performance.now() - startCache;

      // Cache retrieval should be very fast (< 1ms for 1000 operations)
      expect(cacheTime).toBeLessThan(10);
    });
  });
});
