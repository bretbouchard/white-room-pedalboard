/**
 * Examples demonstrating the caching system usage
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
} from 'vitest';
import { CachedMathOperations } from '../cache/cached-math';
import { CacheManager } from '../cache/cache-manager';
import { CacheConfiguration } from '../cache/cache-types';

// Use fake timers to prevent hanging
beforeAll(() => {
  vi.useFakeTimers(); // Use fake timers to prevent hanging
});

afterAll(() => {
  vi.useRealTimers();
});

describe('Cache System Examples', () => {
  let cachedMath: CachedMathOperations;

  beforeEach(() => {
    // Initialize with custom configuration
    const config: Partial<CacheConfiguration> = {
      memory: {
        ttl: 2 * 60 * 1000, // 2 minutes
        maxEntries: 50,
      },
      persistent: {
        ttl: 60 * 60 * 1000, // 1 hour
        maxEntries: 500,
        compressionEnabled: true,
      },
      global: {
        offlineMode: true, // Start in offline mode for testing
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

    // Flush any pending timers
    if (vi.isFakeTimers()) {
      await vi.runOnlyPendingTimersAsync();
    }

    // Clean up mocks
    vi.restoreAllMocks();
  });

  it('should demonstrate basic caching of rhythmic resultants', async () => {
    console.log('=== Rhythmic Resultant Caching Example ===');

    // First call - will compute and cache
    console.time('First call (compute + cache)');
    const result1 = await cachedMath.generateRhythmicResultant(3, 2);
    console.timeEnd('First call (compute + cache)');

    // Second call - will retrieve from cache
    console.time('Second call (from cache)');
    const result2 = await cachedMath.generateRhythmicResultant(3, 2);
    console.timeEnd('Second call (from cache)');

    expect(result1).toEqual(result2);
    expect(result1.pattern).toEqual([3, 0, 1, 1, 1, 0]);

    console.log('Pattern:', result1.pattern);
    console.log('Complexity:', result1.complexity);
    console.log('Cache metrics:', cachedMath.getCacheMetrics());
  });

  it('should demonstrate harmonic progression caching', async () => {
    console.log('\\n=== Harmonic Progression Caching Example ===');

    // Generate and cache a progression
    const progression = await cachedMath.generateHarmonicProgression(
      'C',
      'major',
      4
    );
    console.log('Generated progression:', progression.chords);

    // Analyze the progression (will also be cached)
    const analysis = await cachedMath.analyzeHarmonicProgression(progression);
    console.log('Analysis - Key stability:', analysis.keyStability);
    console.log('Functional analysis:', analysis.functionalAnalysis);

    // Generate variations (cached separately)
    const variations = await cachedMath.generateProgressionVariations(
      progression,
      ['reharmonization', 'substitution', 'extension']
    );
    console.log('Generated', variations.length, 'variations');

    expect(progression.chords).toHaveLength(4);
    expect(analysis.keyStability).toBeGreaterThan(0);
    expect(Array.isArray(variations)).toBe(true);
  });

  it('should demonstrate melodic contour caching', async () => {
    console.log('\\n=== Melodic Contour Caching Example ===');

    // Generate a melodic contour
    const contour = await cachedMath.generateMelodicContour(8, [60, 72], {
      stepSize: 2,
      allowRepeats: false,
    });

    // MelodicContour likely has 'notes' and 'intervals', not 'pitches'
    console.log('Generated contour:', contour.notes);
    console.log('Intervals:', contour.intervals);

    expect(Array.isArray(contour.notes)).toBe(true);
    expect(contour.notes).toHaveLength(8);
  });

  it('should demonstrate cache preloading', async () => {
    console.log('\\n=== Cache Preloading Example ===');

    console.time('Preload common patterns');
    await cachedMath.preloadCommonPatterns();
    console.timeEnd('Preload common patterns');

    const metrics = cachedMath.getCacheMetrics();
    console.log('Cache metrics after preloading:');
    metrics.forEach(metric => {
      console.log(
        `${metric.level}: ${metric.stats.entries} entries, ${metric.stats.hits} hits`
      );
    });

    // Now accessing preloaded patterns should be very fast
    console.time('Access preloaded pattern');
    const result = await cachedMath.generateRhythmicResultant(3, 4);
    console.timeEnd('Access preloaded pattern');

    expect(result).toBeDefined();
  });

  it('should demonstrate offline functionality', async () => {
    console.log('\\n=== Offline Functionality Example ===');

    // Ensure we're in offline mode
    cachedMath.setOfflineMode(true);

    // Generate some patterns (will be cached locally)
    const rhythm1 = await cachedMath.generateRhythmicResultant(2, 3);
    const rhythm2 = await cachedMath.generateRhythmicResultant(3, 5);

    console.log('Generated patterns offline:');
    console.log('2:3 ->', rhythm1.pattern);
    console.log('3:5 ->', rhythm2.pattern);

    // Access cached patterns (should work offline)
    const cachedRhythm1 = await cachedMath.generateRhythmicResultant(2, 3);
    const cachedRhythm2 = await cachedMath.generateRhythmicResultant(3, 5);

    expect(cachedRhythm1).toEqual(rhythm1);
    expect(cachedRhythm2).toEqual(rhythm2);

    console.log('Successfully accessed cached patterns offline');
  });

  it('should demonstrate cache optimization', async () => {
    console.log('\\n=== Cache Optimization Example ===');

    // Generate many patterns to fill cache
    const generators = [
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [2, 5],
      [3, 7],
      [4, 9],
      [5, 11],
      [6, 13],
      [7, 15],
    ];

    for (const [a, b] of generators) {
      await cachedMath.generateRhythmicResultant(a, b);
    }

    const beforeOptimization = cachedMath.getCacheMetrics();
    console.log(
      'Before optimization:',
      beforeOptimization[0].stats.entries,
      'entries'
    );

    // Optimize cache
    console.time('Cache optimization');
    await cachedMath.optimizeCache();
    console.timeEnd('Cache optimization');

    const afterOptimization = cachedMath.getCacheMetrics();
    console.log(
      'After optimization:',
      afterOptimization[0].stats.entries,
      'entries'
    );

    expect(afterOptimization[0].stats.entries).toBeGreaterThan(0);
  });

  it('should demonstrate cache invalidation', async () => {
    console.log('\\n=== Cache Invalidation Example ===');

    // Generate some patterns
    await cachedMath.generateRhythmicResultant(2, 3);
    await cachedMath.generateRhythmicResultant(3, 4);
    await cachedMath.generateHarmonicProgression('C', 'major', 4);

    const beforeInvalidation = cachedMath.getCacheMetrics();
    console.log(
      'Before invalidation:',
      beforeInvalidation[0].stats.entries,
      'entries'
    );

    // Add invalidation rule for rhythm patterns
    cachedMath.addInvalidationRule(/rhythm/, 1000); // 1 second max age

    // Wait for invalidation to trigger using fake timers
    await vi.advanceTimersByTimeAsync(1100);

    const afterInvalidation = cachedMath.getCacheMetrics();
    console.log(
      'After invalidation:',
      afterInvalidation[0].stats.entries,
      'entries'
    );

    // Rhythm patterns should be invalidated, but harmony should remain
    expect(afterInvalidation[0].stats.entries).toBeLessThan(
      beforeInvalidation[0].stats.entries
    );
  });
});

describe('Advanced Cache Manager Usage', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    const config: CacheConfiguration = {
      memory: { ttl: 60000, maxEntries: 100 },
      persistent: { ttl: 3600000, maxEntries: 1000 },
      network: { ttl: 1800000, endpoint: '/api/cache' },
      global: { offlineMode: true, syncInterval: 0 }, // Disable sync in tests
    };

    cacheManager = new CacheManager(config);
  });

  afterEach(async () => {
    try {
      cacheManager?.destroy?.();
    } catch (e) {
      // Ignore cleanup errors
    }

    // Let any pending async operations complete
    await Promise.resolve();

    // Flush any pending timers
    if (vi.isFakeTimers()) {
      await vi.runOnlyPendingTimersAsync();
    }

    // Clean up mocks
    vi.restoreAllMocks();
  });

  it('should demonstrate custom cache key usage', async () => {
    console.log('\\n=== Custom Cache Key Example ===');

    const customKey = {
      namespace: 'custom',
      operation: 'complexCalculation',
      parameters: {
        input: [1, 2, 3, 4, 5],
        algorithm: 'schillinger-v2',
        options: { precision: 'high' },
      },
      version: '2.1',
    };

    const complexResult = {
      output: [5, 4, 3, 2, 1],
      metadata: { processingTime: 150, accuracy: 0.95 },
    };

    // Store custom result
    await cacheManager.set(customKey, complexResult);

    // Retrieve custom result
    const retrieved = await cacheManager.get(customKey);

    console.log('Stored and retrieved custom result:', retrieved);
    expect(retrieved).toEqual(complexResult);
  });

  it('should demonstrate event listening', async () => {
    console.log('\\n=== Cache Event Listening Example ===');

    const events: any[] = [];

    cacheManager.addEventListener(event => {
      events.push(event);
      console.log(`Cache event: ${event.type} on ${event.level} level`);
    });

    const testKey = {
      namespace: 'test',
      operation: 'demo',
      parameters: { value: 42 },
    };

    // Perform operations to trigger events
    await cacheManager.set(testKey, 'test value');
    await cacheManager.get(testKey);
    await cacheManager.delete(testKey);

    console.log('Total events captured:', events.length);
    expect(events.length).toBeGreaterThan(0);
  });

  it('should demonstrate cache metrics monitoring', async () => {
    console.log('\\n=== Cache Metrics Monitoring Example ===');

    // Generate some cache activity
    for (let i = 0; i < 10; i++) {
      const key = {
        namespace: 'test',
        operation: 'generate',
        parameters: { index: i },
      };

      await cacheManager.set(key, `value-${i}`);

      // Access some entries multiple times
      if (i % 2 === 0) {
        await cacheManager.get(key);
        await cacheManager.get(key);
      }
    }

    const metrics = cacheManager.getMetrics();

    console.log('\\nDetailed Cache Metrics:');
    metrics.forEach(metric => {
      console.log(`\\n${metric.level.toUpperCase()} Cache:`);
      console.log(`  Entries: ${metric.stats.entries}`);
      console.log(`  Hits: ${metric.stats.hits}`);
      console.log(`  Misses: ${metric.stats.misses}`);
      console.log(`  Hit Rate: ${(metric.stats.hitRate * 100).toFixed(1)}%`);
      console.log(`  Size: ${metric.stats.size} bytes`);
      console.log(`  Avg Get Time: ${metric.performance.averageGetTime}ms`);
    });

    expect(metrics).toHaveLength(3);
    expect(metrics[0].stats.entries).toBeGreaterThan(0);
  });
});
