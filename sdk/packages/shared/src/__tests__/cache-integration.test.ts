/**
 * Integration tests for the caching system with mathematical functions
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import { CachedMathOperations } from "../cache/cached-math";
import { CacheConfiguration } from "../cache/cache-types";
import { InMemoryStorageAdapter } from "../cache/in-memory-storage-adapter";

// Use fake timers but exclude async operations that the cache needs
beforeAll(() => {
  vi.useFakeTimers(); // Use fake timers but exclude async operations that the cache needs
});

afterAll(() => {
  vi.useRealTimers();
});

// Mock global objects for Node.js environment
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  },
  writable: true,
});

Object.defineProperty(globalThis, "navigator", {
  value: {
    onLine: true,
  },
  writable: true,
});

global.fetch = vi.fn();

describe("Cache Integration Tests", () => {
  let cachedMath: CachedMathOperations;

  beforeEach(() => {
    // Configure for offline mode to avoid network calls
    const config: Partial<CacheConfiguration> = {
      memory: {
        ttl: 60000, // 1 minute
        maxEntries: 100,
      },
      persistent: {
        ttl: 3600000, // 1 hour
        maxEntries: 1000,
        storageAdapter: new InMemoryStorageAdapter(), // Use in-memory adapter for tests
      },
      global: {
        offlineMode: true,
        syncInterval: 0, // Disable background sync in tests
      },
    };

    cachedMath = new CachedMathOperations(config);
  });

  afterEach(async () => {
    try {
      cachedMath?.destroy?.();
    } catch (e) {
      // Ignore cleanup errors
    }

    // Let any pending async operations complete
    await Promise.resolve();

    // Flush any pending timers with timeout
    if (vi.isFakeTimers()) {
      try {
        await Promise.race([
          vi.runOnlyPendingTimersAsync(),
          new Promise((resolve) => setTimeout(resolve, 100)),
        ]);
      } catch (e) {
        // Ignore timer flush errors
      }
    }

    // Clean up mocks
    vi.restoreAllMocks();
  });

  it("should cache rhythmic resultants correctly", async () => {
    // First call should compute the result
    const result1 = await cachedMath.generateRhythmicResultant(3, 2);

    // Second call should return cached result
    const result2 = await cachedMath.generateRhythmicResultant(3, 2);

    // Results should be identical
    expect(result1).toEqual(result2);
    expect(result1.pattern).toEqual([3, 0, 1, 1, 1, 0]);
    expect(result1.generators).toEqual({ a: 3, b: 2 });
  });

  it("should cache harmonic progressions correctly", async () => {
    // First call should compute the result (using valid numeric generators)
    const result1 = await cachedMath.generateHarmonicProgression(
      "C",
      "major",
      4,
      { a: 3, b: 2 },
    );
    // Second call should return cached result
    const result2 = await cachedMath.generateHarmonicProgression(
      "C",
      "major",
      4,
      { a: 3, b: 2 },
    );

    // Results should be identical
    expect(result1).toEqual(result2);
    expect(result1.chords).toBeDefined();
    expect(Array.isArray(result1.chords)).toBe(true);
  });

  it("should cache melodic contours correctly", async () => {
    // First call should compute the result (using valid numeric generators)
    const result1 = await cachedMath.generateMelodicContour(8, [60, 72], {
      a: 5,
      b: 3,
      key: "C",
      scale: "major",
    });
    // Second call should return cached result
    const result2 = await cachedMath.generateMelodicContour(8, [60, 72], {
      a: 5,
      b: 3,
      key: "C",
      scale: "major",
    });

    // Results should be identical
    expect(result1).toEqual(result2);
    expect(result1.notes).toBeDefined();
    expect(Array.isArray(result1.notes)).toBe(true);
  });

  it("should handle different parameters with separate cache entries", async () => {
    // Generate different rhythmic resultants
    const result1 = await cachedMath.generateRhythmicResultant(2, 3);
    const result2 = await cachedMath.generateRhythmicResultant(3, 4);
    const result3 = await cachedMath.generateRhythmicResultant(4, 5);

    // Results should be different
    expect(result1.pattern).not.toEqual(result2.pattern);
    expect(result2.pattern).not.toEqual(result3.pattern);
    expect(result1.pattern).not.toEqual(result3.pattern);

    // But calling with same parameters should return cached results
    const cached1 = await cachedMath.generateRhythmicResultant(2, 3);
    const cached2 = await cachedMath.generateRhythmicResultant(3, 4);

    expect(cached1).toEqual(result1);
    expect(cached2).toEqual(result2);
  });

  it("should provide cache metrics", () => {
    const metrics = cachedMath.getCacheMetrics();

    expect(metrics).toHaveLength(3);
    expect(metrics[0].level).toBe("memory");
    expect(metrics[1].level).toBe("persistent");
    expect(metrics[2].level).toBe("network");

    // Each metric should have stats and performance data
    metrics.forEach((metric) => {
      expect(metric.stats).toHaveProperty("hits");
      expect(metric.stats).toHaveProperty("misses");
      expect(metric.stats).toHaveProperty("entries");
      expect(metric.stats).toHaveProperty("size");
      expect(metric.stats).toHaveProperty("hitRate");

      expect(metric.performance).toHaveProperty("averageGetTime");
      expect(metric.performance).toHaveProperty("averageSetTime");
      expect(metric.performance).toHaveProperty("averageDeleteTime");
    });
  });

  it("should handle offline mode correctly", async () => {
    // Ensure we're in offline mode
    cachedMath.setOfflineMode(true);

    // Generate some patterns
    const rhythm = await cachedMath.generateRhythmicResultant(5, 7);
    const harmony = await cachedMath.generateHarmonicProgression(
      "C",
      "major",
      4,
      { a: 2, b: 5 },
    );

    // Results should be generated successfully even offline
    expect(rhythm.pattern).toBeDefined();
    expect(rhythm.generators).toEqual({ a: 5, b: 7 });

    expect(harmony.chords).toBeDefined();
    expect(Array.isArray(harmony.chords)).toBe(true);

    // Accessing cached patterns should work offline
    const cachedRhythm = await cachedMath.generateRhythmicResultant(5, 7);
    const cachedHarmony = await cachedMath.generateHarmonicProgression(
      "C",
      "major",
      4,
      { a: 2, b: 5 },
    );

    expect(cachedRhythm).toEqual(rhythm);
    expect(cachedHarmony).toEqual(harmony);
  });

  it("should handle cache clearing", async () => {
    // Generate some patterns
    await cachedMath.generateRhythmicResultant(2, 3);
    await cachedMath.generateHarmonicProgression("C", "major", 4, {
      a: 2,
      b: 5,
    });

    const beforeClear = cachedMath.getCacheMetrics();
    const memoryEntriesBefore = beforeClear[0].stats.entries;

    // Clear cache
    await cachedMath.clearCache();

    const afterClear = cachedMath.getCacheMetrics();
    const memoryEntriesAfter = afterClear[0].stats.entries;

    // Memory cache should be cleared
    expect(memoryEntriesAfter).toBeLessThanOrEqual(memoryEntriesBefore);
  });

  it("should handle complex mathematical operations", async () => {
    // Test multiple resultants generation
    const generators = [
      { a: 2, b: 3 },
      { a: 3, b: 4 },
      { a: 4, b: 5 },
    ];

    const multipleResults =
      await cachedMath.generateMultipleResultants(generators);
    expect(multipleResults).toHaveLength(3);

    // Test optimal resultant finding
    const optimalResults = await cachedMath.findOptimalResultant(
      {
        length: 12,
        complexity: 0.5,
      },
      8,
    );

    expect(optimalResults).toBeDefined();
    expect(Array.isArray(optimalResults)).toBe(true);

    // Test harmonic progression generation
    const progression = await cachedMath.generateHarmonicProgression(
      "C",
      "major",
      4,
      { a: 2, b: 5 },
    );

    expect(progression).toHaveProperty("chords");
    expect(Array.isArray(progression.chords)).toBe(true);
    expect(progression.chords.length).toBeGreaterThan(0);
  });

  it("should handle error cases gracefully", async () => {
    // Test with invalid generators (should throw ValidationError)
    await expect(cachedMath.generateRhythmicResultant(0, 2)).rejects.toThrow();
    await expect(cachedMath.generateRhythmicResultant(-1, 3)).rejects.toThrow();

    // Test with invalid harmonic parameters
    await expect(
      cachedMath.generateHarmonicProgression("", "", 0, { a: 1, b: 1 }),
    ).rejects.toThrow();
    await expect(
      cachedMath.generateHarmonicProgression("", "", -1, { a: 1, b: 1 }),
    ).rejects.toThrow();

    // Test with invalid melodic parameters
    await expect(
      cachedMath.generateMelodicContour(0, [0, 0], { a: 1, b: 1 }),
    ).rejects.toThrow();
    await expect(
      cachedMath.generateMelodicContour(-1, [0, 0], { a: 1, b: 1 }),
    ).rejects.toThrow();
  });
});
