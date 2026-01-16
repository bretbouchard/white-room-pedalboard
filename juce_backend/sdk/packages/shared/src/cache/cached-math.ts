/**
 * Cached versions of mathematical functions for offline support
 */

import { CacheManager } from './cache-manager';
import { CacheKey, CacheConfiguration } from './cache-types';
import {
  generateRhythmicResultant,
  generateMultipleResultants,
  findOptimalResultant,
  RhythmicResultant,
  ResultantOptions,
} from '../math/rhythmic-resultants';
import {
  generateHarmonicProgression,
  generateProgressionVariations,
  HarmonicProgression,
} from '../math/harmonic-progressions';
import {
  generateMelodicContour,
  MelodicContour,
} from '../math/melodic-contours';
import { GeneratorPair } from '../math/generators';

/**
 * Default cache configuration optimized for mathematical operations
 */
const DEFAULT_CACHE_CONFIG: CacheConfiguration = {
  memory: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
  },
  persistent: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 200 * 1024 * 1024, // 200MB
    maxEntries: 10000,
    compressionEnabled: true,
  },
  network: {
    ttl: 60 * 60 * 1000, // 1 hour
    endpoint: '/api/schillinger/cache',
    timeout: 5000,
  },
  global: {
    enableCompression: true,
    enableEncryption: false,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    offlineMode: false,
  },
};

export class CachedMathOperations {
  private cacheManager: CacheManager;

  constructor(config: Partial<CacheConfiguration> = {}) {
    const mergedConfig = this.mergeConfig(DEFAULT_CACHE_CONFIG, config);
    this.cacheManager = new CacheManager(mergedConfig);
  }

  /**
   * Cached rhythmic resultant generation
   */
  async generateRhythmicResultant(
    a: number,
    b: number,
    options: ResultantOptions = {}
  ): Promise<RhythmicResultant> {
    const cacheKey: CacheKey = {
      namespace: 'rhythm',
      operation: 'generateResultant',
      parameters: { a, b, options },
      version: '1.0',
    };

    // Try to get from cache first
    let result = await this.cacheManager.get<RhythmicResultant>(cacheKey);

    if (result === null) {
      // Generate new result
      result = generateRhythmicResultant(a, b, options);

      // Cache the result
      await this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Cached multiple resultants generation
   */
  async generateMultipleResultants(
    generators: GeneratorPair[],
    options: ResultantOptions = {}
  ): Promise<RhythmicResultant[]> {
    const cacheKey: CacheKey = {
      namespace: 'rhythm',
      operation: 'generateMultiple',
      parameters: { generators, options },
      version: '1.0',
    };

    let result = await this.cacheManager.get<RhythmicResultant[]>(cacheKey);

    if (result === null) {
      result = generateMultipleResultants(generators, options);
      await this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Cached optimal resultant finding
   */
  async findOptimalResultant(
    targetCharacteristics: {
      length?: number;
      complexity?: number;
      density?: number;
      syncopation?: number;
    },
    maxGenerator: number = 16
  ): Promise<RhythmicResultant[]> {
    const cacheKey: CacheKey = {
      namespace: 'rhythm',
      operation: 'findOptimal',
      parameters: { targetCharacteristics, maxGenerator },
      version: '1.0',
    };

    let result = await this.cacheManager.get<RhythmicResultant[]>(cacheKey);

    if (result === null) {
      result = findOptimalResultant(targetCharacteristics, maxGenerator);
      await this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Cached harmonic progression generation
   */
  async generateHarmonicProgression(
    key: string,
    scale: string,
    length: number,
    options: any = {}
  ): Promise<HarmonicProgression> {
    const cacheKey: CacheKey = {
      namespace: 'harmony',
      operation: 'generateProgression',
      parameters: { key, scale, length, options },
      version: '1.0',
    };

    let result = await this.cacheManager.get<HarmonicProgression>(cacheKey);

    if (result === null) {
      const { a, b, ...rest } = options;
      if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error(
          'Missing numeric generators a and b in options for harmonic progression'
        );
      }
      result = generateHarmonicProgression(a, b, {
        key,
        scale,
        length,
        ...rest,
      });
      // Validate result: must have non-empty chords array with no undefined
      if (
        !result ||
        !Array.isArray(result.chords) ||
        result.chords.length === 0 ||
        result.chords.some(c => c === undefined)
      ) {
        throw new Error('Invalid harmonic progression result');
      }
      await this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Cached harmonic progression analysis
   */
  async analyzeHarmonicProgression(
    progression: HarmonicProgression
  ): Promise<{ keyStability: number; functionalAnalysis: string[] }> {
    const cacheKey: CacheKey = {
      namespace: 'harmony',
      operation: 'analyzeProgression',
      parameters: { progression },
      version: '1.0',
    };

    let result = await this.cacheManager.get<{
      keyStability: number;
      functionalAnalysis: string[];
    }>(cacheKey);

    if (result === null) {
      // Simple mock analysis for testing
      result = {
        keyStability: Math.random() * 0.5 + 0.5, // Random value between 0.5 and 1
        functionalAnalysis: progression.chords.map(() => 'tonic'), // Simple mock
      };
      await this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Cached harmonic progression variations
   */
  async generateProgressionVariations(
    baseProgression: HarmonicProgression,
    variationTypes: string[] = ['reharmonization', 'substitution', 'extension']
  ): Promise<HarmonicProgression[]> {
    const cacheKey: CacheKey = {
      namespace: 'harmony',
      operation: 'generateVariations',
      parameters: { baseProgression, variationTypes },
      version: '1.0',
    };

    let result = await this.cacheManager.get<HarmonicProgression[]>(cacheKey);

    if (result === null) {
      result = generateProgressionVariations(baseProgression, variationTypes);
      await this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Cached melodic contour generation
   */
  async generateMelodicContour(
    length: number,
    range: [number, number],
    options: any = {}
  ): Promise<MelodicContour> {
    const cacheKey: CacheKey = {
      namespace: 'melody',
      operation: 'generateContour',
      parameters: { length, range, options },
      version: '1.0',
    };

    let result = await this.cacheManager.get<MelodicContour>(cacheKey);

    if (result === null) {
      const { a, b, ...rest } = options;
      if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error(
          'Missing numeric generators a and b in options for melodic contour'
        );
      }
      result = generateMelodicContour(a, b, { range, length, ...rest });
      // Validate result: must have non-empty notes array with no undefined
      if (
        !result ||
        !Array.isArray(result.notes) ||
        result.notes.length === 0 ||
        result.notes.some(n => n === undefined)
      ) {
        throw new Error('Invalid melodic contour result');
      }
      await this.cacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Cached melodic contour transformation
   */
  // transformMelodicContour is not implemented: TransformationOptions and transformMelodicContour do not exist in melodic-contours

  /**
   * Cached melodic complexity analysis
   */
  // analyzeMelodicComplexity is not implemented: analyzeMelodicComplexity does not exist in melodic-contours

  /**
   * Preload frequently used patterns into cache
   */
  async preloadCommonPatterns(): Promise<void> {
    const commonGenerators: GeneratorPair[] = [
      { a: 2, b: 3 },
      { a: 3, b: 4 },
      { a: 4, b: 5 },
      { a: 3, b: 5 },
      { a: 5, b: 7 },
      { a: 7, b: 11 },
    ];

    // Preload rhythmic resultants
    const rhythmPromises = commonGenerators.map(({ a, b }) =>
      this.generateRhythmicResultant(a, b).catch(error => {
        console.warn(`Failed to preload rhythm ${a}:${b}:`, error);
      })
    );

    // Preload harmonic progressions
    // Preload harmonic progressions
    const harmonyPromises = [
      this.generateHarmonicProgression('C', 'major', 4),
      this.generateHarmonicProgression('G', 'major', 4),
      this.generateHarmonicProgression('F', 'major', 4),
    ].map(promise =>
      promise.catch(error => {
        console.warn('Failed to preload harmony:', error);
      })
    );

    // Preload melodic contours
    const melodyPromises = [
      this.generateMelodicContour(8, [60, 72]),
      this.generateMelodicContour(16, [48, 84]),
      this.generateMelodicContour(12, [55, 79]),
    ].map(promise =>
      promise.catch(error => {
        console.warn('Failed to preload melody:', error);
      })
    );

    await Promise.allSettled([
      ...rhythmPromises,
      ...harmonyPromises,
      ...melodyPromises,
    ]);
  }

  /**
   * Clear all cached mathematical results
   */
  async clearCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheMetrics() {
    return this.cacheManager.getMetrics();
  }

  /**
   * Set offline mode
   */
  setOfflineMode(offline: boolean): void {
    this.cacheManager.setOfflineMode(offline);
  }

  /**
   * Sync cache with network when connectivity is restored
   */
  async syncCache(): Promise<void> {
    await this.cacheManager.sync();
  }

  /**
   * Optimize cache storage
   */
  async optimizeCache(): Promise<void> {
    await this.cacheManager.optimize();
  }

  /**
   * Add cache invalidation rule
   */
  addInvalidationRule(pattern: RegExp, maxAge?: number): void {
    this.cacheManager.addInvalidationRule({
      pattern,
      maxAge,
    });
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    this.cacheManager.destroy();
  }

  private mergeConfig(
    defaultConfig: CacheConfiguration,
    userConfig: Partial<CacheConfiguration>
  ): CacheConfiguration {
    return {
      memory: { ...defaultConfig.memory, ...userConfig.memory },
      persistent: { ...defaultConfig.persistent, ...userConfig.persistent },
      network: { ...defaultConfig.network, ...userConfig.network },
      global: { ...defaultConfig.global, ...userConfig.global },
    };
  }
}

/**
 * Default cached math operations instance
 */
export const cachedMath = new CachedMathOperations();
