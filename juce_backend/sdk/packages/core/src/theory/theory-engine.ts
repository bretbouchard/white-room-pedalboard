/**
 * Main Theory Engine Class
 * Central interface for all music theory operations with multi-language support
 */

import {
  Note,
  Chord,
  Scale,
  ChordProgression,
  Key,
  AnalysisResult,
  ValidationResult,
  TheoryEngineConfig,
  TheoryEngineError,
  Suggestion,
  DEFAULT_THEORY_CONFIG,
} from './types';

import { ScaleKnowledgeBase } from './knowledge-base/scales';
import { ChordKnowledgeBase } from './knowledge-base/chords';
import { ProgressionKnowledgeBase } from './knowledge-base/progressions';
import { HarmonicAnalyzer } from './analysis/harmonic-analyzer';
import { KeyDetector } from './analysis/key-detector';
import { TheoryValidator } from './validation/theory-validator';
import { TheoryCache } from './cache/theory-cache';
import { PerformanceMonitor } from './performance/optimization';
import { JSONSerializer } from './serialization/json-serializer';

/**
 * Main Theory Engine class providing comprehensive music theory analysis
 */
export class TheoryEngine {
  private config: Partial<TheoryEngineConfig>;
  private scaleKB!: ScaleKnowledgeBase;
  private chordKB!: ChordKnowledgeBase;
  private progressionKB!: ProgressionKnowledgeBase;
  private harmonicAnalyzer!: HarmonicAnalyzer;
  private keyDetector!: KeyDetector;
  private validator!: TheoryValidator;
  private cache!: TheoryCache;
  private performance!: PerformanceMonitor;
  private serializer!: JSONSerializer;
  private initialized: boolean = false;

  constructor(config: Partial<TheoryEngineConfig> = {}) {
    this.config = { ...DEFAULT_THEORY_CONFIG, ...config };
    this.initializeComponents();
  }

  /**
   * Initialize all theory engine components
   */
  private initializeComponents(): void {
    try {
      // Initialize knowledge bases
      this.scaleKB = new ScaleKnowledgeBase();
      this.chordKB = new ChordKnowledgeBase();
      this.progressionKB = new ProgressionKnowledgeBase();

      // Initialize analysis engines
      this.harmonicAnalyzer = new HarmonicAnalyzer(this.config);
      this.keyDetector = new KeyDetector(this.config);
      this.validator = new TheoryValidator(this.config);

      // Initialize performance and caching
      this.cache = new TheoryCache(this.config);
      this.performance = new PerformanceMonitor(this.config);
      this.serializer = new JSONSerializer();

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Theory Engine: ${error}`);
    }
  }

  /**
   * Check if the engine is properly initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get engine configuration
   */
  public getConfig(): TheoryEngineConfig {
    return { ...(this.config as TheoryEngineConfig) };
  }

  /**
   * Update engine configuration
   */
  public updateConfig(newConfig: Partial<TheoryEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize components that depend on config
    this.harmonicAnalyzer.updateConfig(this.config);
    this.keyDetector.updateConfig(this.config);
    this.validator.updateConfig(this.config);
    this.cache.updateConfig(this.config);
    this.performance.updateConfig(this.config);
  }

  // ==================== SCALE OPERATIONS ====================

  /**
   * Get scale information by name
   */
  public async getScale(scaleName: string, tonic?: string): Promise<AnalysisResult<Scale>> {
    const startTime = performance.now();
    
    try {
      const cacheKey = `scale_${scaleName}_${tonic || 'C'}`;
      
      if (this.config.enableCaching) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return this.createResult(cached, 1.0, performance.now() - startTime, true);
        }
      }

      const scale = await this.scaleKB.getScale(scaleName, tonic);
      
      if (this.config.enableCaching) {
        await this.cache.set(cacheKey, scale);
      }

      return this.createResult(scale, 1.0, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to get scale: ${error}`, { scaleName, tonic });
    }
  }

  /**
   * Find scales by characteristics
   */
  public async findScales(characteristics: string[]): Promise<AnalysisResult<Scale[]>> {
    const startTime = performance.now();
    
    try {
      const scales = await this.scaleKB.findByCharacteristics(characteristics);
      return this.createResult(scales, 0.9, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to find scales: ${error}`, { characteristics });
    }
  }

  // ==================== CHORD OPERATIONS ====================

  /**
   * Analyze a chord symbol
   */
  public async analyzeChord(chordSymbol: string): Promise<AnalysisResult<Chord>> {
    const startTime = performance.now();
    
    try {
      const cacheKey = `chord_${chordSymbol}`;
      
      if (this.config.enableCaching) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return this.createResult(cached, 1.0, performance.now() - startTime, true);
        }
      }

      const chord = await this.chordKB.analyzeChord(chordSymbol);
      
      if (this.config.enableCaching) {
        await this.cache.set(cacheKey, chord);
      }

      return this.createResult(chord, 0.95, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to analyze chord: ${error}`, { chordSymbol });
    }
  }

  /**
   * Get chord substitutions
   */
  public async getChordSubstitutions(chordSymbol: string, context?: Key): Promise<AnalysisResult<Chord[]>> {
    const startTime = performance.now();
    
    try {
  const substitutions = await this.chordKB.getSubstitutions(chordSymbol);
      return this.createResult(substitutions, 0.85, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to get substitutions: ${error}`, { chordSymbol });
    }
  }

  // ==================== HARMONIC ANALYSIS ====================

  /**
   * Analyze chord progression
   */
  public async analyzeProgression(
    chords: string[],
    key?: string
  ): Promise<AnalysisResult<ChordProgression>> {
    const startTime = performance.now();
    
    try {
      const cacheKey = `progression_${chords.join('_')}_${key || 'auto'}`;
      
      if (this.config.enableCaching) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return this.createResult(cached, 1.0, performance.now() - startTime, true);
        }
      }

      const analysis = await this.harmonicAnalyzer.analyzeProgression(chords, key);
      
      if (this.config.enableCaching) {
        await this.cache.set(cacheKey, analysis);
      }

      return this.createResult(analysis, analysis.confidence || 0.8, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to analyze progression: ${error}`, { chords, key });
    }
  }

  /**
   * Detect key from musical data
   */
  public async detectKey(musicalData: string[] | number[]): Promise<AnalysisResult<Key>> {
    const startTime = performance.now();
    
    try {
  const keyResult = await this.keyDetector.detectKey(musicalData);
  return this.createResult(keyResult.primaryKey, keyResult.confidence, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to detect key: ${error}`, { musicalData });
    }
  }

  /**
   * Analyze harmonic function
   */
  public async analyzeHarmonicFunction(
    chords: string[],
    key: string
  ): Promise<AnalysisResult<string[]>> {
    const startTime = performance.now();
    
    try {
      const functions = await this.harmonicAnalyzer.analyzeFunctions(chords, key);
      return this.createResult(functions, 0.9, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to analyze functions: ${error}`, { chords, key });
    }
  }

  // ==================== VALIDATION ====================

  /**
   * Validate chord progression
   */
  public async validateProgression(
    chords: string[],
    options: {
      style?: string;
      strictness?: 'lenient' | 'moderate' | 'strict' | 'academic';
      key?: string;
    } = {}
  ): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      const validation = await this.validator.validateProgression(chords, options);
      
      // Add performance metadata
      validation.metadata = {
        ...validation.metadata,
        processingTime: performance.now() - startTime,
      };

      return validation;
    } catch (error) {
      throw this.createError('VALIDATION_FAILED', `Failed to validate progression: ${error}`, { chords, options });
    }
  }

  /**
   * Validate voice leading
   */
  public async validateVoiceLeading(voices: string[][]): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      const validation = await this.validator.validateVoiceLeading(voices);
      
      validation.metadata = {
        ...validation.metadata,
        processingTime: performance.now() - startTime,
      };

      return validation;
    } catch (error) {
      throw this.createError('VALIDATION_FAILED', `Failed to validate voice leading: ${error}`, { voices });
    }
  }

  // ==================== SUGGESTIONS ====================

  /**
   * Get intelligent suggestions for next chords
   */
  public async suggestNextChords(
    currentChords: string[],
    key: string,
    options: {
      count?: number;
      style?: string;
      complexity?: 'simple' | 'moderate' | 'complex';
    } = {}
  ): Promise<AnalysisResult<Suggestion[]>> {
    const startTime = performance.now();
    
    try {
      const suggestions = await this.harmonicAnalyzer.suggestNextChords(currentChords, key, options);
      return this.createResult(suggestions, 0.8, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to suggest chords: ${error}`, { currentChords, key, options });
    }
  }

  /**
   * Suggest improvements for a progression
   */
  public async suggestImprovements(
    chords: string[],
    key?: string
  ): Promise<AnalysisResult<Suggestion[]>> {
    const startTime = performance.now();
    
    try {
      const validation = await this.validateProgression(chords, { key });
      const suggestions = validation.suggestions;
      
      return this.createResult(suggestions, 0.85, performance.now() - startTime, false);
    } catch (error) {
      throw this.createError('ANALYSIS_FAILED', `Failed to suggest improvements: ${error}`, { chords, key });
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Convert between different note representations
   */
  public convertNote(note: string | number, targetFormat: 'midi' | 'name' | 'frequency'): any {
    try {
      // Implementation would depend on the specific conversion needed
      return this.harmonicAnalyzer.convertNote(note, targetFormat);
    } catch (error) {
      throw this.createError('INVALID_INPUT', `Failed to convert note: ${error}`, { note, targetFormat });
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): any {
    return this.performance.getMetrics();
  }

  /**
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Export data for cross-language compatibility
   */
  public async exportData(format: 'json' | 'binary' = 'json'): Promise<string | Buffer> {
    try {
      const data = {
        scales: await this.scaleKB.exportData(),
        chords: await this.chordKB.exportData(),
        progressions: await this.progressionKB.exportData(),
        config: this.config,
        version: '1.0.0',
      };

      if (format === 'json') {
        return this.serializer.serialize(data);
      } else {
        // Binary serialization would be implemented here
        throw new Error('Binary serialization not yet implemented');
      }
    } catch (error) {
      throw this.createError('SERIALIZATION_ERROR', `Failed to export data: ${error}`, { format });
    }
  }


  // ==================== PRIVATE HELPERS ====================

  /**
   * Create a standardized analysis result
   */
  private createResult<T>(
    data: T,
    confidence: number,
    processingTime: number,
    cacheHit: boolean
  ): AnalysisResult<T> {
    return {
      data,
      confidence,
      metadata: {
        timestamp: Date.now(),
        processingTime,
        method: 'theory_engine',
        source: 'sdk',
        cacheHit,
        depth: (this.config.analysisDepth as any) || 'basic',
      },
    };
  }

  /**
   * Create a standardized error
   */
  private createError(code: string, message: string, details?: any): TheoryEngineError {
    return {
      code,
      message,
      details,
      timestamp: Date.now(),
    } as any;
  }

  /**
   * Cleanup resources
   */
  public async dispose(): Promise<void> {
    try {
      await this.cache.dispose();
      this.performance.dispose();
      this.initialized = false;
    } catch (error) {
      console.warn('Error during Theory Engine disposal:', error);
    }
  }
}

/**
 * Factory function for creating theory engine instances
 */
export function createTheoryEngine(config?: Partial<TheoryEngineConfig>): TheoryEngine {
  return new TheoryEngine(config);
}

/**
 * Singleton instance for global use
 */
let globalTheoryEngine: TheoryEngine | null = null;

/**
 * Get or create global theory engine instance
 */
export function getTheoryEngine(config?: Partial<TheoryEngineConfig>): TheoryEngine {
  if (!globalTheoryEngine) {
    globalTheoryEngine = new TheoryEngine(config);
  }
  return globalTheoryEngine;
}

/**
 * Reset global theory engine instance
 */
export function resetTheoryEngine(): void {
  if (globalTheoryEngine) {
    globalTheoryEngine.dispose();
    globalTheoryEngine = null;
  }
}

export default TheoryEngine;
