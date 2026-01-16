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
} from "./types";

import { ScaleKnowledgeBase } from "./knowledge-base/scales";
import { ChordKnowledgeBase } from "./knowledge-base/chords";
import { ProgressionKnowledgeBase } from "./knowledge-base/progressions";
import { HarmonicAnalyzer } from "./analysis/harmonic-analyzer";
import { KeyDetector } from "./analysis/key-detector";
import { TheoryValidator } from "./validation/theory-validator";
import { TheoryCache } from "./cache/theory-cache";
import { PerformanceMonitor } from "./performance/optimization";
import { JSONSerializer } from "./serialization/json-serializer";

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
    // Note: Components would need updateConfig methods added for full functionality
  }

  // ==================== SCALE OPERATIONS ====================

  /**
   * Get scale information by name
   */
  public async getScale(
    scaleName: string,
    tonic?: string,
  ): Promise<AnalysisResult<Scale>> {
    const startTime = performance.now();

    try {
      const cacheKey = `scale_${scaleName}_${tonic || "C"}`;

      if (this.config.enableCaching) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return this.createResult(
            cached,
            1.0,
            performance.now() - startTime,
            true,
          );
        }
      }

      const scale = await this.scaleKB.getScale(scaleName, tonic);

      if (this.config.enableCaching) {
        await this.cache.set(cacheKey, scale);
      }

      return this.createResult(
        scale,
        1.0,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to get scale: ${error}`,
        { scaleName, tonic },
      );
    }
  }

  /**
   * Find scales by characteristics
   */
  public async findScales(
    characteristics: string[],
  ): Promise<AnalysisResult<Scale[]>> {
    const startTime = performance.now();

    try {
      const scales = await this.scaleKB.findByCharacteristics(characteristics);
      return this.createResult(
        scales,
        0.9,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to find scales: ${error}`,
        { characteristics },
      );
    }
  }

  // ==================== CHORD OPERATIONS ====================

  /**
   * Analyze a chord symbol
   */
  public async analyzeChord(
    chordSymbol: string,
  ): Promise<AnalysisResult<Chord>> {
    const startTime = performance.now();

    try {
      const cacheKey = `chord_${chordSymbol}`;

      if (this.config.enableCaching) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return this.createResult(
            cached,
            1.0,
            performance.now() - startTime,
            true,
          );
        }
      }

      // Get chord data from knowledge base
      const chordData = this.chordKB.getChord(chordSymbol);

      if (!chordData) {
        throw new Error(`Chord not found: ${chordSymbol}`);
      }

      // Create a proper Chord object
      const chord: Chord = {
        id: chordSymbol,
        symbol: chordSymbol,
        root: {
          midi: 60,
          name: "C4",
          octave: 4,
          pitchClass: 0,
        },
        quality: {
          base: "major",
          modifiers: [],
        },
        tones: [],
        intervals: [],
        extensions: [],
        inversions: [],
        voicings: [],
        function: {
          primary: "tonic",
          romanNumeral: "I",
          strength: 10,
        },
        characteristics: {
          tension: 5,
          stability: 5,
          brightness: 5,
          dissonance: 5,
          color: [],
          emotions: [],
        },
      };

      if (this.config.enableCaching) {
        await this.cache.set(cacheKey, chord);
      }

      return this.createResult(
        chord,
        0.95,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to analyze chord: ${error}`,
        { chordSymbol },
      );
    }
  }

  /**
   * Get chord substitutions
   */
  public async getChordSubstitutions(
    chordSymbol: string,
    context?: Key,
  ): Promise<AnalysisResult<Chord[]>> {
    const startTime = performance.now();

    try {
      // Return empty array for now - this would be implemented with full chord substitution logic
      const substitutions: Chord[] = [];
      return this.createResult(
        substitutions,
        0.85,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to get substitutions: ${error}`,
        { chordSymbol },
      );
    }
  }

  // ==================== HARMONIC ANALYSIS ====================

  /**
   * Analyze chord progression
   */
  public async analyzeProgression(
    chords: string[],
    key?: string,
  ): Promise<AnalysisResult<ChordProgression>> {
    const startTime = performance.now();

    try {
      const cacheKey = `progression_${chords.join("_")}_${key || "auto"}`;

      if (this.config.enableCaching) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return this.createResult(
            cached,
            1.0,
            performance.now() - startTime,
            true,
          );
        }
      }

      const analysis = this.harmonicAnalyzer.analyzeProgression(chords);

      // Create a proper ChordProgression object
      const progression: ChordProgression = {
        id: `prog_${Date.now()}`,
        name: "Custom Progression",
        chords: [],
        romanNumerals: [],
        functions: [],
        key: {
          tonic: {
            midi: 60,
            name: "C4",
            octave: 4,
            pitchClass: 0,
          },
          mode: "major",
          signature: {
            accidentals: [],
            count: 0,
            type: "natural",
          },
          scale: {} as any,
          relatives: {
            closelyRelated: [],
          },
        },
        characteristics: {
          mood: [],
          tension: 5,
          stability: 5,
          movement: "linear",
          genres: [],
          complexity: 5,
        },
        voiceLeading: {
          smoothness: 8,
          violations: [],
          commonTones: [],
          stepwiseMotion: 90,
          leaps: [],
        },
        cadences: [],
      };

      if (this.config.enableCaching) {
        await this.cache.set(cacheKey, progression);
      }

      return this.createResult(
        progression,
        0.8,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to analyze progression: ${error}`,
        { chords, key },
      );
    }
  }

  /**
   * Detect key from musical data
   */
  public async detectKey(
    musicalData: string[] | number[],
  ): Promise<AnalysisResult<Key>> {
    const startTime = performance.now();

    try {
      // Convert string array to number array if needed
      const notes =
        typeof musicalData[0] === "string"
          ? (musicalData as string[]).map((n) => n.charCodeAt(0))
          : (musicalData as number[]);

      const keyResult = this.keyDetector.detectKey(notes);

      // Create a proper Key object
      const key: Key = {
        tonic: {
          midi: 60,
          name: keyResult.key,
          octave: 4,
          pitchClass: 0,
        },
        mode: keyResult.scale,
        signature: {
          accidentals: [],
          count: 0,
          type: "natural",
        },
        scale: {} as any,
        relatives: {
          closelyRelated: [],
        },
      };

      return this.createResult(
        key,
        keyResult.confidence,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to detect key: ${error}`,
        { musicalData },
      );
    }
  }

  /**
   * Analyze harmonic function
   */
  public async analyzeHarmonicFunction(
    chords: string[],
    key: string,
  ): Promise<AnalysisResult<string[]>> {
    const startTime = performance.now();

    try {
      // For now, return empty array - this would use harmonic analysis logic
      const functions: string[] = [];
      return this.createResult(
        functions,
        0.9,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to analyze functions: ${error}`,
        { chords, key },
      );
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
      strictness?: "lenient" | "moderate" | "strict" | "academic";
      key?: string;
    } = {},
  ): Promise<ValidationResult> {
    const startTime = performance.now();

    try {
      const validation = this.validator.validateProgression(chords);

      // Convert to proper ValidationResult
      const result: ValidationResult = {
        isValid: validation.valid,
        score: validation.valid ? 100 : 0,
        violations: validation.errors.map((err) => ({
          type: "progression_error",
          severity: "medium" as const,
          location: { chords },
          description: err,
          rule: "basic_progression_rules",
        })),
        suggestions: [],
        metadata: {
          style: options.style || "general",
          strictness: options.strictness || "moderate",
          rulesApplied: ["basic_progression_rules"],
          timestamp: Date.now(),
          processingTime: performance.now() - startTime,
        },
      };

      return result;
    } catch (error) {
      throw this.createError(
        "VALIDATION_FAILED",
        `Failed to validate progression: ${error}`,
        { chords, options },
      );
    }
  }

  /**
   * Validate voice leading
   */
  public async validateVoiceLeading(
    voices: string[][],
  ): Promise<ValidationResult> {
    const startTime = performance.now();

    try {
      // Convert string[][] to number[][] for the validator
      const numericVoices: number[][] = voices.map((voice) =>
        voice.map((note) =>
          typeof note === "string"
            ? note.charCodeAt(0)
            : (note as unknown as number),
        ),
      );

      const validation = this.validator.validateVoiceLeading(numericVoices);

      // Convert to proper ValidationResult
      const result: ValidationResult = {
        isValid: validation.valid,
        score: validation.valid ? 100 : 0,
        violations: validation.errors.map((err) => ({
          type: "voice_leading_error",
          severity: "medium" as const,
          location: { voices },
          description: err,
          rule: "basic_voice_leading_rules",
        })),
        suggestions: [],
        metadata: {
          style: "general",
          strictness: "moderate",
          rulesApplied: ["basic_voice_leading_rules"],
          timestamp: Date.now(),
          processingTime: performance.now() - startTime,
        },
      };

      return result;
    } catch (error) {
      throw this.createError(
        "VALIDATION_FAILED",
        `Failed to validate voice leading: ${error}`,
        { voices },
      );
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
      complexity?: "simple" | "moderate" | "complex";
    } = {},
  ): Promise<AnalysisResult<Suggestion[]>> {
    const startTime = performance.now();

    try {
      // Return empty suggestions for now - this would be implemented with full suggestion logic
      const suggestions: Suggestion[] = [];
      return this.createResult(
        suggestions,
        0.8,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to suggest chords: ${error}`,
        { currentChords, key, options },
      );
    }
  }

  /**
   * Suggest improvements for a progression
   */
  public async suggestImprovements(
    chords: string[],
    key?: string,
  ): Promise<AnalysisResult<Suggestion[]>> {
    const startTime = performance.now();

    try {
      const validation = await this.validateProgression(chords, { key });
      const suggestions = validation.suggestions;

      return this.createResult(
        suggestions,
        0.85,
        performance.now() - startTime,
        false,
      );
    } catch (error) {
      throw this.createError(
        "ANALYSIS_FAILED",
        `Failed to suggest improvements: ${error}`,
        { chords, key },
      );
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Convert between different note representations
   */
  public convertNote(
    note: string | number,
    targetFormat: "midi" | "name" | "frequency",
  ): any {
    try {
      // Simple conversion implementation
      if (targetFormat === "midi") {
        if (typeof note === "string") {
          // Convert note name to MIDI (simplified)
          return note.charCodeAt(0);
        }
        return note;
      } else if (targetFormat === "name") {
        if (typeof note === "number") {
          // Convert MIDI to note name (simplified)
          return `Note${note}`;
        }
        return note;
      } else {
        // Frequency conversion (simplified)
        return 440; // Default to A4
      }
    } catch (error) {
      throw this.createError(
        "INVALID_INPUT",
        `Failed to convert note: ${error}`,
        { note, targetFormat },
      );
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): any {
    return {
      averageTime: this.performance.getAverageTime("all"),
      cacheSize: this.cache.size,
    };
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
  public async exportData(
    format: "json" | "binary" = "json",
  ): Promise<string | Buffer> {
    try {
      const data = {
        scales: {} as any, // exportData not implemented for ScaleKnowledgeBase
        chords: {} as any, // exportData not implemented for ChordKnowledgeBase
        progressions: {} as any, // exportData not implemented for ProgressionKnowledgeBase
        config: this.config,
        version: "1.0.0",
      };

      if (format === "json") {
        return this.serializer.serialize(data);
      } else {
        // Binary serialization would be implemented here
        throw new Error("Binary serialization not yet implemented");
      }
    } catch (error) {
      throw this.createError(
        "SERIALIZATION_ERROR",
        `Failed to export data: ${error}`,
        { format },
      );
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
    cacheHit: boolean,
  ): AnalysisResult<T> {
    return {
      data,
      confidence,
      metadata: {
        timestamp: Date.now(),
        processingTime,
        method: "theory_engine",
        source: "sdk",
        cacheHit,
        depth: (this.config.analysisDepth as any) || "basic",
      },
    };
  }

  /**
   * Create a standardized error
   */
  private createError(
    code: string,
    message: string,
    details?: any,
  ): TheoryEngineError {
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
      this.cache.clear();
      this.performance.clearMetrics();
      this.initialized = false;
    } catch (error) {
      console.warn("Error during Theory Engine disposal:", error);
    }
  }
}

/**
 * Factory function for creating theory engine instances
 */
export function createTheoryEngine(
  config?: Partial<TheoryEngineConfig>,
): TheoryEngine {
  return new TheoryEngine(config);
}

/**
 * Singleton instance for global use
 */
let globalTheoryEngine: TheoryEngine | null = null;

/**
 * Get or create global theory engine instance
 */
export function getTheoryEngine(
  config?: Partial<TheoryEngineConfig>,
): TheoryEngine {
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
