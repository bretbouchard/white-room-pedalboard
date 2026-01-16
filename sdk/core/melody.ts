/**
 * Melody API implementation for the Schillinger SDK
 * Provides comprehensive melody generation, analysis, and encoding functionality
 */

import type { SchillingerSDK } from "./client";
import type { PatternIR_v1 } from "./ir";
import { MelodyLine, MelodicAnalysis, SchillingerEncoding } from "./ir";
import {
  ValidationError as _ValidationError,
  ProcessingError as _ProcessingError,
  NetworkError,
} from "@schillinger-sdk/shared";
import { safeLog, safeExecute, FALLBACKS } from "./error-handling";
// Note: Import will be added when analysis package exports are fixed
// import { analyzeMelody as reverseAnalyzeMelody } from '@schillinger-sdk/analysis';

export interface CoreMelodyGenerationParams {
  key: string;
  scale: string;
  length: number;
  rangeLow?: number;
  rangeHigh?: number;
  contour?: ContourType;
  style?: MelodyStyle;
}

export interface CoreMelodyVariationParams {
  melody: MelodyLine;
  variationType: MelodyVariationType;
  count?: number;
  intensity?: number;
}

export interface MelodyAnalysisOptions {
  includeIntervals?: boolean;
  includeContour?: boolean;
  includePhrases?: boolean;
  includeComplexity?: boolean;
}

export interface MelodyEncodingOptions {
  includeAlternatives?: boolean;
  confidenceThreshold?: number;
  analysisDepth?: "basic" | "detailed" | "comprehensive";
}

export type ContourType =
  | "ascending"
  | "descending"
  | "arch"
  | "inverted_arch"
  | "wave"
  | "zigzag"
  | "plateau"
  | "random";

export type MelodyStyle =
  | "classical"
  | "jazz"
  | "contemporary"
  | "modal"
  | "chromatic"
  | "pentatonic";

export type MelodyVariationType =
  | "inversion"
  | "retrograde"
  | "augmentation"
  | "diminution"
  | "sequence"
  | "fragmentation"
  | "ornamentation";

export interface MelodyMatch {
  melody: MelodyLine;
  confidence: number;
  similarity: number;
  characteristics: string[];
  schillingerParameters?: Record<string, any>;
}

export class MelodyAPI {
  constructor(private sdk: SchillingerSDK) {}

  // ============================================================================
  // IR-FIRST METHODS (Primary API - returns PatternIR_v1)
  // ============================================================================

  /**
   * Generate melody pattern as IR (Intermediate Representation)
   *
   * IR is the canonical output format - explicit, serializable, and diff-able.
   *
   * @param key Musical key (e.g., 'C', 'F#', 'Bb')
   * @param scale Musical scale (e.g., 'major', 'minor', 'dorian')
   * @param length Number of notes in the melody
   * @param seed Seed for deterministic generation
   * @param options Optional parameters (range, contour, style)
   * @returns PatternIR_v1 with explicit seed and metadata
   *
   * @example
   * ```ts
   * const ir = await melodyAPI.generatePatternIR('C', 'major', 16, 'my-seed-123', {
   *   contour: 'ascending',
   *   style: 'classical'
   * });
   * console.log(ir.seed);  // 'my-seed-123'
   * console.log(ir.baseRule);  // 'melody(C,major,16)'
   *
   * // Same seed always produces identical IR
   * const ir2 = await melodyAPI.generatePatternIR('C', 'major', 16, 'my-seed-123');
   * console.log(ir === ir2);  // true (deep equality)
   * ```
   */
  async generatePatternIR(
    key: string,
    scale: string,
    length: number,
    seed: string,
    options?: {
      rangeLow?: number;
      rangeHigh?: number;
      contour?: ContourType;
      style?: MelodyStyle;
    },
  ): Promise<PatternIR_v1> {
    // Validate inputs
    this.validateKey(key);
    this.validateScale(scale);
    this.validateLength(length);

    if (options?.rangeLow !== undefined || options?.rangeHigh !== undefined) {
      this.validateRange(options.rangeLow || 60, options.rangeHigh || 84);
    }

    if (!seed || typeof seed !== "string" || seed.trim().length === 0) {
      throw new _ValidationError("seed", seed, "non-empty string");
    }

    // Build base rule descriptor
    const baseRule = `melody(${key},${scale},${length})`;

    // Build variation rules for optional parameters
    const variationRules: string[] = [];
    if (options?.contour) {
      variationRules.push(`contour:${options.contour}`);
    }
    if (options?.style) {
      variationRules.push(`style:${options.style}`);
    }
    if (options?.rangeLow !== undefined || options?.rangeHigh !== undefined) {
      variationRules.push(
        `range:${options.rangeLow || 60}-${options.rangeHigh || 84}`,
      );
    }

    return {
      version: "1.0",
      baseRule,
      variationRule:
        variationRules.length > 0 ? variationRules.join(", ") : undefined,
      seed,
    };
  }

  /**
   * Generate melody contour as IR
   *
   * @param contour Type of contour to generate
   * @param length Number of notes in the melody
   * @param seed Seed for deterministic generation
   * @param options Optional generation parameters
   * @returns PatternIR_v1 with explicit seed and metadata
   */
  async generateContourIR(
    contour: ContourType,
    length: number,
    seed: string,
    options?: Partial<CoreMelodyGenerationParams>,
  ): Promise<PatternIR_v1> {
    // Validate inputs
    this.validateContourType(contour);
    this.validateLength(length);

    if (!seed || typeof seed !== "string" || seed.trim().length === 0) {
      throw new _ValidationError("seed", seed, "non-empty string");
    }

    // Build base rule descriptor
    const baseRule = `melody_contour(${contour},${length})`;

    // Build variation rules for optional parameters
    const variationRules: string[] = [];
    if (options?.key !== undefined) {
      this.validateKey(options.key);
      variationRules.push(`key:${options.key}`);
    }
    if (options?.scale !== undefined) {
      this.validateScale(options.scale);
      variationRules.push(`scale:${options.scale}`);
    }
    if (options?.style) {
      variationRules.push(`style:${options.style}`);
    }
    if (options?.rangeLow !== undefined || options?.rangeHigh !== undefined) {
      this.validateRange(options.rangeLow || 60, options.rangeHigh || 84);
      variationRules.push(
        `range:${options.rangeLow || 60}-${options.rangeHigh || 84}`,
      );
    }

    return {
      version: "1.0",
      baseRule,
      variationRule:
        variationRules.length > 0 ? variationRules.join(", ") : undefined,
      seed,
    };
  }

  // ============================================================================
  // CONVENIENCE METHODS (Domain Object API - derived from IR)
  // ============================================================================

  /**
   * Generate melodic contour (convenience wrapper)
   *
   * This is a backward-compatible wrapper that:
   * 1. Auto-generates a seed if not provided
   * 2. Calls the IR method internally
   * 3. Generates the actual pattern from the IR
   * 4. Returns a domain object (MelodyLine)
   *
   * For new code, prefer using generateContourIR() for explicit seed control.
   *
   * @param contour - Type of contour to generate
   * @param length - Number of notes in the melody
   * @param options - Additional generation options
   */
  async generateContour(
    contour: ContourType,
    length: number,
    options: Partial<CoreMelodyGenerationParams> = {},
  ): Promise<MelodyLine> {
    // Validate inputs
    this.validateContourType(contour);
    this.validateLength(length);

    const params: CoreMelodyGenerationParams = {
      key: options.key || "C",
      scale: options.scale || "major",
      length,
      rangeLow: options.rangeLow || 60,
      rangeHigh: options.rangeHigh || 84,
      contour,
      style: options.style || "classical",
    };

    try {
      // Check if offline mode is enabled and operation is supported
      if (this.sdk.isOfflineMode() && this.canGenerateOffline(contour)) {
        return this.generateContourOffline(params);
      }

      // Make API request
      const response = await this.sdk.makeRequest("/melody/generate-contour", {
        method: "POST",
        body: JSON.stringify(params),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new NetworkError(
          `Failed to generate melody contour: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return this.validateMelodyLine(data.melody || data);
    } catch (error) {
      if (error instanceof _ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new _ProcessingError(
        "melody generation",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Generate a melodic line with specified parameters
   * @param params - Melody generation parameters
   */
  async generateLine(params: CoreMelodyGenerationParams): Promise<MelodyLine> {
    // Validate inputs
    this.validateKey(params.key);
    this.validateScale(params.scale);
    this.validateLength(params.length);
    this.validateRange(params.rangeLow || 60, params.rangeHigh || 84);

    try {
      // Check if offline mode is enabled
      if (this.sdk.isOfflineMode()) {
        return this.generateLineOffline(params);
      }

      // Make API request
      const response = await this.sdk.makeRequest("/melody/generate-line", {
        method: "POST",
        body: JSON.stringify(params),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new NetworkError(
          `Failed to generate melody line: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return this.validateMelodyLine(data.melody || data);
    } catch (error) {
      if (error instanceof _ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new _ProcessingError(
        "melody line generation",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Generate variations of an existing melody
   * @param params - Variation parameters
   */
  async generateVariations(
    params: CoreMelodyVariationParams,
  ): Promise<MelodyLine[]> {
    // Validate inputs
    this.validateMelodyLine(params.melody);
    this.validateVariationType(params.variationType);

    const count = params.count ?? 3; // Use nullish coalescing to handle 0 properly
    if (count < 1 || count > 10) {
      throw new _ValidationError("count", count, "integer between 1 and 10");
    }

    try {
      // Check if offline mode is enabled
      if (this.sdk.isOfflineMode()) {
        return this.generateVariationsOffline(params);
      }

      // Make API request
      const response = await this.sdk.makeRequest(
        "/melody/generate-variations",
        {
          method: "POST",
          body: JSON.stringify({
            melody: params.melody,
            variationtype: params.variationType,
            count,
            intensity: params.intensity || 0.5,
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new NetworkError(
          `Failed to generate melody variations: ${response.statusText}`,
        );
      }

      const data = await response.json();
      const variations = data.variations || data;

      if (!Array.isArray(variations)) {
        throw new _ProcessingError(
          "melody variations",
          "Invalid response format",
        );
      }

      return variations.map((variation) => this.validateMelodyLine(variation));
    } catch (error) {
      if (error instanceof _ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new _ProcessingError(
        "melody variations",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Analyze a melody line for contour, intervals, and structure
   * @param melody - Melody to analyze
   * @param options - Analysis options
   */
  async analyzeMelody(
    melody: MelodyLine,
    options: MelodyAnalysisOptions = {},
  ): Promise<MelodicAnalysis> {
    // Validate input
    this.validateMelodyLine(melody);

    try {
      // Check if offline mode is enabled
      if (this.sdk.isOfflineMode()) {
        return this.analyzeMelodyOffline(melody, options);
      }

      // Make API request
      const response = await this.sdk.makeRequest("/melody/analyze", {
        method: "POST",
        body: JSON.stringify({
          melody,
          options: {
            include_intervals: options.includeIntervals !== false,
            include_contour: options.includeContour !== false,
            include_phrases: options.includePhrases !== false,
            include_complexity: options.includeComplexity !== false,
          },
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new NetworkError(
          `Failed to analyze melody: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return this.validateMelodicAnalysis(data.analysis || data);
    } catch (error) {
      if (error instanceof _ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new _ProcessingError(
        "melody analysis",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Encode a melody into Schillinger parameters
   * @param melody - Melody to encode
   * @param options - Encoding options
   */
  async encodeMelody(
    melody: MelodyLine,
    options: MelodyEncodingOptions = {},
  ): Promise<SchillingerEncoding> {
    // Validate input
    this.validateMelodyLine(melody);

    try {
      // Check if offline mode is enabled
      if (this.sdk.isOfflineMode()) {
        return this.encodeMelodyOffline(melody, options);
      }

      // Make API request
      const response = await this.sdk.makeRequest("/melody/encode", {
        method: "POST",
        body: JSON.stringify({
          melody,
          options: {
            include_alternatives: options.includeAlternatives !== false,
            confidence_threshold: options.confidenceThreshold || 0.5,
            analysis_depth: options.analysisDepth || "detailed",
          },
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new NetworkError(
          `Failed to encode melody: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return this.validateSchillingerEncoding(data.encoding || data);
    } catch (error) {
      if (error instanceof _ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new _ProcessingError(
        "melody encoding",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Generate counterpoint for a given melody
   * @param melody - Base melody for counterpoint
   * @param options - Counterpoint generation options
   */
  async generateCounterpoint(
    melody: MelodyLine,
    options: { species?: string; style?: string } = {},
  ): Promise<MelodyLine> {
    // Validate input
    this.validateMelodyLine(melody);

    try {
      // Check if offline mode is enabled
      if (this.sdk.isOfflineMode()) {
        return this.generateCounterpointOffline(melody, options);
      }

      // Make API request
      const response = await this.sdk.makeRequest(
        "/melody/generate-counterpoint",
        {
          method: "POST",
          body: JSON.stringify({
            melody,
            species: options.species || "first",
            style: options.style || "classical",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new NetworkError(
          `Failed to generate counterpoint: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return this.validateMelodyLine(data.counterpoint || data);
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new _ProcessingError(
        "counterpoint generation",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Find melodic matches for a target melody
   * @param targetMelody - Melody to find matches for
   * @param options - Search options
   */
  async findMelodicMatches(
    targetMelody: MelodyLine,
    options: { maxResults?: number; minConfidence?: number } = {},
  ): Promise<MelodyMatch[]> {
    // Validate input
    this.validateMelodyLine(targetMelody);

    const maxResults = options.maxResults || 5;
    const minConfidence = options.minConfidence || 0.5;

    if (maxResults < 1 || maxResults > 20) {
      throw new _ValidationError(
        "maxResults",
        maxResults,
        "integer between 1 and 20",
      );
    }

    try {
      // Check if offline mode is enabled
      if (this.sdk.isOfflineMode()) {
        return this.findMelodicMatchesOffline(targetMelody, options);
      }

      // Make API request
      const response = await this.sdk.makeRequest("/melody/find-matches", {
        method: "POST",
        body: JSON.stringify({
          target_melody: targetMelody,
          max_results: maxResults,
          min_confidence: minConfidence,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new NetworkError(
          `Failed to find melodic matches: ${response.statusText}`,
        );
      }

      const data = await response.json();
      const matches = data.matches || data;

      if (!Array.isArray(matches)) {
        throw new _ProcessingError(
          "melodic matches",
          "Invalid response format",
        );
      }

      return matches.map((match) => this.validateMelodyMatch(match));
    } catch (error) {
      if (error instanceof _ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new _ProcessingError(
        "melodic matches",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  // ============================================================================
  // OFFLINE IMPLEMENTATIONS
  // ============================================================================

  /**
   * Check if contour generation can be performed offline
   */
  private canGenerateOffline(contour: ContourType): boolean {
    // Simple contours can be generated offline
    return ["ascending", "descending", "arch", "inverted_arch"].includes(
      contour,
    );
  }

  /**
   * Generate melody contour offline using advanced music theory algorithms
   */
  private generateContourOffline(
    params: CoreMelodyGenerationParams,
  ): MelodyLine {
    try {
      const {
        key,
        scale,
        length,
        rangeLow = 60,
        rangeHigh = 84,
        contour,
        style = "classical",
      } = params;

      // Generate enhanced scale patterns with modal considerations
      const scalePattern = this.getScalePattern(scale);
      const keyOffset = this.getKeyOffset(key);
      const tonalCenter = this.calculateTonalCenter(key, scale);

      // Generate contour-based melody with voice leading considerations
      const notes = this.generateAdvancedContourNotes(
        contour!,
        length,
        rangeLow,
        rangeHigh,
        scalePattern,
        keyOffset,
        tonalCenter,
        style,
      );

      // Generate musically appropriate durations
      const durations = this.generateMusicalDurations(length, style, contour!);

      // Add expressive markings based on musical context
      const articulations = this.generateArticulations(notes, contour!, style);

      return {
        id: `melody-${Date.now()}`,
        notes,
        durations,
        key,
        scale,
        metadata: {
          contour: contour!,
          intervals: this.calculateIntervals(notes),
          range: [Math.min(...notes), Math.max(...notes)] as [number, number],
        },
      };
    } catch (error) {
      safeLog("MelodyAPI.generateContourOffline", error, "warn");
      // Fallback to basic melody generation if enhanced generation fails
      return this.generateBasicMelodyFallback(params);
    }
  }

  /**
   * Fallback melody generation for error recovery
   */
  private generateBasicMelodyFallback(
    params: CoreMelodyGenerationParams,
  ): MelodyLine {
    const { key = "C", scale = "major", length = 8 } = params;
    const scalePattern = this.getScalePattern(scale);
    const keyOffset = this.getKeyOffset(key);

    // Simple ascending/descending pattern
    const notes = Array.from({ length }, (_, i) => {
      const degree = i % scalePattern.length;
      return keyOffset + scalePattern[degree];
    });

    const durations = Array.from({ length }, () => 0.5);

    return {
      id: `melody-fallback-${Date.now()}`,
      notes,
      durations,
      key,
      scale,
      metadata: {
        contour: "ascending",
        intervals: this.calculateIntervals(notes),
        range: [Math.min(...notes), Math.max(...notes)] as [number, number],
      },
    };
  }

  /**
   * Generate melody line offline
   */
  private generateLineOffline(params: CoreMelodyGenerationParams): MelodyLine {
    // Use contour generation as fallback
    const contour = params.contour || "arch";
    return this.generateContourOffline({ ...params, contour });
  }

  /**
   * Generate melody variations offline
   */
  private generateVariationsOffline(
    params: CoreMelodyVariationParams,
  ): MelodyLine[] {
    const { melody, variationType, count = 3 } = params;
    const variations: MelodyLine[] = [];

    for (let i = 0; i < count; i++) {
      let variedNotes = [...melody.notes];

      switch (variationType) {
        case "inversion":
          variedNotes = this.invertMelody(variedNotes);
          break;
        case "retrograde":
          variedNotes = variedNotes.reverse();
          break;
        case "augmentation":
          // Keep same notes, extend durations
          break;
        case "diminution":
          // Keep same notes, shorten durations
          break;
        case "sequence":
          variedNotes = this.sequenceMelody(variedNotes, i + 1);
          break;
        default:
          // Add slight random variation
          variedNotes = this.addRandomVariation(variedNotes, 0.1);
      }

      variations.push({
        ...melody,
        id: `${melody.id || "melody"}-var-${i + 1}`,
        notes: variedNotes,
        metadata: {
          ...melody.metadata,
          // Note: variationType would need to be added to MelodyLine metadata type
          // variationType,
          // originalId: melody.id
        },
      });
    }

    return variations;
  }

  /**
   * Analyze melody offline using advanced music theory algorithms
   */
  private analyzeMelodyOffline(
    melody: MelodyLine,
    options: MelodyAnalysisOptions,
  ): MelodicAnalysis {
    try {
      // Enhanced interval analysis with harmonic implications
      const intervals = this.calculateIntervals(melody.notes);
      const harmonicImplications = this.analyzeHarmonicImplications(intervals);

      // Advanced contour analysis with multiple contour segments
      const contourSegments = this.analyzeContourSegments(melody.notes);
      const primaryContour = this.determinePrimaryContour(contourSegments);

      // Enhanced range analysis with tessitura identification
      const range = [Math.min(...melody.notes), Math.max(...melody.notes)] as [
        number,
        number,
      ];
      const tessitura = this.calculateTessitura(melody.notes);

      // Sophisticated phrase detection with musical phrasing principles
      const phrases =
        options.includePhrases !== false
          ? this.detectMusicalPhrases(melody.notes, intervals).map((phrase) => {
              // Calculate direction based on phrase contour
              const phraseNotes = melody.notes.slice(
                phrase.start,
                phrase.end + 1,
              );
              const startNote = phraseNotes[0];
              const endNote = phraseNotes[phraseNotes.length - 1];

              let direction: "ascending" | "descending" | "static";
              if (endNote > startNote + 2) direction = "ascending";
              else if (endNote < startNote - 2) direction = "descending";
              else direction = "static";

              // Peak is the highest note in the phrase
              const peak = Math.max(...phraseNotes);

              return {
                start: phrase.start,
                end: phrase.end,
                direction,
                peak,
              };
            })
          : [];

      // Advanced complexity analysis
      const complexity =
        options.includeComplexity !== false
          ? this.calculateMelodicComplexity(
              melody.notes,
              intervals,
              harmonicImplications,
            ).overall
          : undefined;

      return {
        contour: primaryContour,
        range,
        intervals: options.includeIntervals !== false ? intervals : [],
        phrases,
        complexity,
      };
    } catch (error) {
      safeLog("MelodyAPI.analyzeMelodyOffline", error, "warn");
      // Fallback to basic analysis if enhanced analysis fails
      return {
        contour: "neutral",
        range: [0, 12],
        intervals: [],
        phrases: [],
        complexity: undefined,
      };
    }
  }

  /**
   * Analyze harmonic implications of melodic intervals
   */
  private analyzeHarmonicImplications(intervals: number[]): {
    consonanceRatio: number;
    tensionPoints: number[];
    harmonicFunctions: string[];
  } {
    const harmonicQualities = intervals.map((interval) => {
      const absInterval = Math.abs(interval);

      // Consonance/dissonance classification based on music theory
      if ([1, 2, 3, 4, 5, 7, 8, 9, 12].includes(absInterval)) {
        return "consonant";
      } else if ([6, 10, 11].includes(absInterval)) {
        return "mildly_dissonant";
      } else {
        return "dissonant";
      }
    });

    const consonantCount = harmonicQualities.filter(
      (q) => q === "consonant",
    ).length;
    const consonanceRatio =
      intervals.length > 0 ? consonantCount / intervals.length : 0.5;

    const tensionPoints = intervals
      .map((interval, index) =>
        harmonicQualities[index] === "dissonant" ? index : -1,
      )
      .filter((index) => index !== -1);

    const harmonicFunctions = intervals.map((interval, index) => {
      const absInterval = Math.abs(interval);
      if ([1, 4, 5, 8].includes(absInterval)) return "stable";
      if ([2, 3, 6, 7, 9].includes(absInterval)) return "transitional";
      return "tension";
    });

    return {
      consonanceRatio,
      tensionPoints,
      harmonicFunctions,
    };
  }

  /**
   * Analyze contour segments for more detailed melodic shape
   */
  private analyzeContourSegments(notes: number[]): Array<{
    start: number;
    end: number;
    direction: "ascending" | "descending" | "static";
    slope: number;
    significance: number;
  }> {
    if (notes.length < 3) {
      return [
        {
          start: 0,
          end: notes.length - 1,
          direction: "static",
          slope: 0,
          significance: 0.5,
        },
      ];
    }

    const segments: Array<{
      start: number;
      end: number;
      direction: "ascending" | "descending" | "static";
      slope: number;
      significance: number;
    }> = [];

    let currentStart = 0;
    let currentDirection: "ascending" | "descending" | "static" = "static";

    for (let i = 1; i < notes.length; i++) {
      const diff = notes[i] - notes[i - 1];
      let direction: "ascending" | "descending" | "static";

      if (diff > 2) direction = "ascending";
      else if (diff < -2) direction = "descending";
      else direction = "static";

      // If direction changes significantly, create a new segment
      if (direction !== currentDirection && i > currentStart + 1) {
        const segmentNotes = notes.slice(currentStart, i);
        const slope =
          (notes[i - 1] - notes[currentStart]) / (i - 1 - currentStart);
        const significance = Math.abs(slope) / Math.max(...notes);

        segments.push({
          start: currentStart,
          end: i - 1,
          direction: currentDirection,
          slope,
          significance,
        });

        currentStart = i - 1;
        currentDirection = direction;
      }
    }

    // Add final segment
    if (currentStart < notes.length - 1) {
      const segmentNotes = notes.slice(currentStart);
      const slope =
        (notes[notes.length - 1] - notes[currentStart]) /
        (notes.length - 1 - currentStart);
      const significance = Math.abs(slope) / Math.max(...notes);

      segments.push({
        start: currentStart,
        end: notes.length - 1,
        direction: currentDirection,
        slope,
        significance,
      });
    }

    return segments;
  }

  /**
   * Determine primary contour from segment analysis
   */
  private determinePrimaryContour(segments: Array<any>): string {
    if (segments.length === 0) return "static";

    const ascendingSegments = segments.filter(
      (s) => s.direction === "ascending",
    );
    const descendingSegments = segments.filter(
      (s) => s.direction === "descending",
    );
    const staticSegments = segments.filter((s) => s.direction === "static");

    // Weight by segment significance and length
    const ascendingWeight = ascendingSegments.reduce(
      (sum, s) => sum + s.significance * (s.end - s.start + 1),
      0,
    );
    const descendingWeight = descendingSegments.reduce(
      (sum, s) => sum + s.significance * (s.end - s.start + 1),
      0,
    );
    const staticWeight = staticSegments.reduce(
      (sum, s) => sum + s.significance * (s.end - s.start + 1),
      0,
    );

    const totalWeight = ascendingWeight + descendingWeight + staticWeight;

    if (totalWeight === 0) return "static";

    const ascendingRatio = ascendingWeight / totalWeight;
    const descendingRatio = descendingWeight / totalWeight;

    if (ascendingRatio > 0.5 && ascendingRatio > descendingRatio + 0.2) {
      return "ascending";
    } else if (
      descendingRatio > 0.5 &&
      descendingRatio > ascendingRatio + 0.2
    ) {
      return "descending";
    } else if (Math.abs(ascendingRatio - descendingRatio) < 0.2) {
      return "wave"; // Balanced up and down movement
    } else {
      return "static";
    }
  }

  /**
   * Calculate tessitura (comfortable singing range) of the melody
   */
  private calculateTessitura(notes: number[]): {
    tessitura: [number, number];
    center: number;
    comfort: number;
  } {
    if (notes.length === 0) {
      return { tessitura: [60, 72], center: 66, comfort: 0.5 };
    }

    // Sort notes to find range
    const sortedNotes = [...notes].sort((a, b) => a - b);
    const min = sortedNotes[0];
    const max = sortedNotes[sortedNotes.length - 1];

    // Calculate statistical measures
    const mean = notes.reduce((sum, note) => sum + note, 0) / notes.length;

    // Find median
    const mid = Math.floor(sortedNotes.length / 2);
    const median =
      sortedNotes.length % 2 === 0
        ? (sortedNotes[mid - 1] + sortedNotes[mid]) / 2
        : sortedNotes[mid];

    // Calculate standard deviation
    const variance =
      notes.reduce((sum, note) => sum + Math.pow(note - mean, 2), 0) /
      notes.length;
    const stdDev = Math.sqrt(variance);

    // Tessitura is typically mean ± 1.5 standard deviations, but constrained to reasonable range
    const tessituraStart = Math.max(min, Math.round(mean - 1.5 * stdDev));
    const tessituraEnd = Math.min(max, Math.round(mean + 1.5 * stdDev));

    // Calculate comfort score based on how well notes fit in tessitura
    const notesInTessitura = notes.filter(
      (note) => note >= tessituraStart && note <= tessituraEnd,
    ).length;
    const comfort = notes.length > 0 ? notesInTessitura / notes.length : 0.5;

    return {
      tessitura: [tessituraStart, tessituraEnd] as [number, number],
      center: Math.round(mean),
      comfort,
    };
  }

  /**
   * Detect musical phrases using phrase-ending patterns
   */
  private detectMusicalPhrases(
    notes: number[],
    intervals: number[],
  ): Array<{
    start: number;
    end: number;
    type: "question" | "answer" | "conclusive";
    strength: number;
  }> {
    const phrases: Array<{
      start: number;
      end: number;
      type: "question" | "answer" | "conclusive";
      strength: number;
    }> = [];

    // Look for phrase-ending patterns
    for (let i = 1; i < notes.length - 1; i++) {
      const currentInterval = intervals[i];
      const nextInterval = intervals[i + 1] || 0;

      // Phrase ending indicators
      const isPhraseEnd =
        // Rest or significant pause
        nextInterval === 0 ||
        // Stepwise motion to tonic
        (Math.abs(currentInterval) <= 2 && notes[i + 1] < notes[i]) ||
        // Leap followed by stepwise motion in opposite direction
        (Math.abs(currentInterval) >= 4 &&
          Math.abs(nextInterval) <= 2 &&
          currentInterval * nextInterval < 0);

      if (isPhraseEnd && i > 0) {
        // Find phrase start (last phrase end or beginning)
        const phraseStart =
          phrases.length > 0 ? phrases[phrases.length - 1].end + 1 : 0;

        // Determine phrase type based on ending pattern
        let type: "question" | "answer" | "conclusive" = "answer";
        let strength = 0.5;

        if (notes[i] > notes[phraseStart]) {
          type = "question";
          strength = 0.6;
        } else if (Math.abs(currentInterval) <= 2) {
          type = "conclusive";
          strength = 0.8;
        } else {
          type = "answer";
          strength = 0.7;
        }

        // Adjust strength based on phrase length
        const phraseLength = i - phraseStart + 1;
        if (phraseLength >= 4 && phraseLength <= 8) {
          strength += 0.2; // Ideal phrase length
        }

        phrases.push({
          start: phraseStart,
          end: i,
          type,
          strength: Math.min(1.0, strength),
        });
      }
    }

    return phrases;
  }

  /**
   * Calculate melodic complexity using multiple factors
   */
  private calculateMelodicComplexity(
    notes: number[],
    intervals: number[],
    harmonicImplications: any,
  ): {
    overall: number;
    interval: number;
    rhythmic: number;
    harmonic: number;
    contour: number;
  } {
    // Interval complexity (variety of intervals)
    const uniqueIntervals = new Set(intervals.map(Math.abs)).size;
    const intervalComplexity =
      intervals.length > 0 ? uniqueIntervals / intervals.length : 0;

    // Harmonic complexity (based on consonance ratio)
    const harmonicComplexity = 1 - harmonicImplications.consonanceRatio;

    // Contour complexity (number of direction changes)
    let directionChanges = 0;
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i] * intervals[i - 1] < 0) {
        directionChanges++;
      }
    }
    const contourComplexity =
      intervals.length > 1 ? directionChanges / (intervals.length - 1) : 0;

    // Range complexity (wider range = more complex)
    const range = Math.max(...notes) - Math.min(...notes);
    const rangeComplexity = Math.min(1.0, range / 24); // Normalize to 2 octaves

    // Rhythmic complexity would depend on duration data, use placeholder
    const rhythmicComplexity = 0.5; // Would be calculated from note durations

    // Overall complexity is weighted average
    const overall =
      intervalComplexity * 0.3 +
      harmonicComplexity * 0.25 +
      contourComplexity * 0.2 +
      rangeComplexity * 0.15 +
      rhythmicComplexity * 0.1;

    return {
      overall: Math.min(1.0, overall),
      interval: intervalComplexity,
      rhythmic: rhythmicComplexity,
      harmonic: harmonicComplexity,
      contour: contourComplexity,
    };
  }

  /**
   * Analyze melodic motifs and patterns
   */
  private analyzeMotifs(
    notes: number[],
    intervals: number[],
  ): {
    motifs: Array<{ pattern: number[]; frequency: number }>;
    repetition: number;
    development: number;
  } {
    const motifs: Array<{ pattern: number[]; frequency: number }> = [];
    const minMotifLength = 3;

    // Find repeating patterns
    for (
      let length = minMotifLength;
      length <= Math.min(7, notes.length / 2);
      length++
    ) {
      for (let start = 0; start <= notes.length - length * 2; start++) {
        const pattern = notes.slice(start, start + length);
        const patternIntervals = intervals.slice(start, start + length - 1);

        // Look for this pattern elsewhere
        let frequency = 1;
        for (
          let searchStart = start + 1;
          searchStart <= notes.length - length;
          searchStart++
        ) {
          const candidate = notes.slice(searchStart, searchStart + length);
          const candidateIntervals = intervals.slice(
            searchStart,
            searchStart + length - 1,
          );

          if (
            JSON.stringify(pattern) === JSON.stringify(candidate) ||
            JSON.stringify(patternIntervals) ===
              JSON.stringify(candidateIntervals)
          ) {
            frequency++;
          }
        }

        if (frequency > 1) {
          // Check if this motif is already recorded
          const existingMotif = motifs.find(
            (m) => JSON.stringify(m.pattern) === JSON.stringify(pattern),
          );

          if (existingMotif) {
            existingMotif.frequency = Math.max(
              existingMotif.frequency,
              frequency,
            );
          } else {
            motifs.push({ pattern: [...pattern], frequency });
          }
        }
      }
    }

    // Calculate repetition and development scores
    const totalNotes = notes.length;
    const repeatedNotes = motifs.reduce(
      (sum, motif) => sum + motif.pattern.length * (motif.frequency - 1),
      0,
    );
    const repetition = totalNotes > 0 ? repeatedNotes / totalNotes : 0;

    // Development score based on variation of motifs
    const development =
      motifs.length > 0
        ? Math.min(1.0, motifs.length / 5) // More unique motifs = more development
        : 0;

    return {
      motifs: motifs.sort((a, b) => b.frequency - a.frequency).slice(0, 5), // Top 5 motifs
      repetition,
      development,
    };
  }

  /**
   * Analyze rhythmic characteristics (placeholder implementation)
   */
  private analyzeRhythmicCharacteristics(melody: MelodyLine): {
    noteDensity: number;
    rhythmicVariety: number;
    articulation: string[];
  } {
    // Placeholder implementation - would analyze actual note durations
    const noteCount = melody.notes.length;
    const estimatedDuration = noteCount * 0.5; // Assume average 0.5 beats per note
    const noteDensity = noteCount / Math.max(1, estimatedDuration);

    return {
      noteDensity: Math.min(1.0, noteDensity / 4), // Normalize to reasonable range
      rhythmicVariety: 0.5, // Placeholder
      articulation: ["legato", "staccato"], // Placeholder
    };
  }

  /**
   * Encode melody offline using basic analysis
   */
  private encodeMelodyOffline(
    melody: MelodyLine,
    options: MelodyEncodingOptions,
  ): SchillingerEncoding {
    // Basic offline encoding implementation
    const intervals = this.calculateIntervals(melody.notes);
    const complexity =
      intervals.length > 0
        ? new Set(intervals.map(Math.abs)).size / intervals.length
        : 0;

    // Simple generator inference based on interval patterns
    const avgInterval =
      intervals.reduce((sum, interval) => sum + Math.abs(interval), 0) /
      intervals.length;
    const generators: [number, number] = [
      Math.max(2, Math.round(avgInterval / 2)),
      Math.max(3, Math.round(avgInterval)),
    ];

    return {
      type: "melody",
      parameters: {
        generators,
        contour: this.analyzeBasicContour(melody.notes),
        scale: melody.scale,
        key: melody.key,
        complexity,
      },
      confidence: 0.7, // Basic confidence for offline analysis
      alternatives:
        options.includeAlternatives !== false
          ? [
              {
                parameters: {
                  generators: [generators[0] + 1, generators[1] + 1],
                  contour: "alternative",
                  scale: melody.scale,
                },
                confidence: 0.5,
              },
            ]
          : [],
    };
  }

  private analyzeBasicContour(notes: number[]): string {
    if (notes.length < 2) return "static";

    const start = notes[0];
    const end = notes[notes.length - 1];
    const middle = notes[Math.floor(notes.length / 2)];

    if (end > start + 5) return "ascending";
    if (end < start - 5) return "descending";
    if (middle > start + 3 && middle > end + 3) return "arch";
    if (middle < start - 3 && middle < end - 3) return "inverted_arch";
    return "static";
  }

  /**
   * Generate counterpoint offline using basic counterpoint rules
   */
  private generateCounterpointOffline(
    melody: MelodyLine,
    options: { species?: string; style?: string },
  ): MelodyLine {
    const { species = "first", style = "classical" } = options;

    // Simple counterpoint generation based on species counterpoint rules
    const counterpointNotes: number[] = [];
    const counterpointDurations: number[] = [];

    for (let i = 0; i < melody.notes.length; i++) {
      const originalNote = melody.notes[i];
      const originalDuration = melody.durations?.[i] || 1;

      // Generate counterpoint note based on species
      let counterpointNote: number;

      if (species === "first") {
        // First species: note against note
        // Use simple interval relationships (3rd, 5th, 6th, octave)
        const intervals = [3, 4, 7, 8, 9, 12]; // Major 3rd, Perfect 4th, Perfect 5th, Minor 6th, Major 6th, Octave
        const interval = intervals[i % intervals.length];
        counterpointNote = originalNote + (i % 2 === 0 ? interval : -interval);
      } else {
        // Other species - simplified approach
        counterpointNote = originalNote + (i % 2 === 0 ? 7 : -5); // Perfect 5th up/down
      }

      // Ensure note is in reasonable range
      counterpointNote = Math.max(48, Math.min(84, counterpointNote));

      counterpointNotes.push(counterpointNote);
      counterpointDurations.push(originalDuration);
    }

    return {
      id: `counterpoint-${melody.id || "generated"}`,
      notes: counterpointNotes,
      durations: counterpointDurations,
      key: melody.key,
      scale: melody.scale,
      metadata: {
        ...melody.metadata,
        complexity: 0.5,
      },
    };
  }

  /**
   * Find melodic matches offline (basic implementation)
   */
  private findMelodicMatchesOffline(
    targetMelody: MelodyLine,
    options: { maxResults?: number; minConfidence?: number },
  ): MelodyMatch[] {
    // Basic implementation - would need a database of melodies in real implementation
    const matches: MelodyMatch[] = [];

    // Generate some basic matches based on the target melody characteristics
    const targetIntervals = this.calculateIntervals(targetMelody.notes);
    const targetRange = [
      Math.min(...targetMelody.notes),
      Math.max(...targetMelody.notes),
    ];

    // Create a few synthetic matches for demonstration
    for (let i = 0; i < Math.min(options.maxResults || 5, 3); i++) {
      const similarity = 0.8 - i * 0.1;
      if (similarity >= (options.minConfidence || 0.5)) {
        matches.push({
          melody: {
            ...targetMelody,
            id: `match-${i + 1}`,
            notes: this.generateSimilarMelody(targetMelody.notes, similarity),
          },
          confidence: similarity,
          similarity,
          characteristics: ["similar_contour", "similar_range", "samekey"],
          schillingerParameters: {
            generators: [2 + i, 3 + i],
            complexity: 0.6 + i * 0.1,
          },
        });
      }
    }

    return matches;
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  private validateContourType(contour: ContourType): void {
    const validContours: ContourType[] = [
      "ascending",
      "descending",
      "arch",
      "inverted_arch",
      "wave",
      "zigzag",
      "plateau",
      "random",
    ];
    if (!validContours.includes(contour)) {
      throw new _ValidationError(
        "contour",
        contour,
        `one of: ${validContours.join(", ")}`,
      );
    }
  }

  private validateLength(length: number): void {
    if (!Number.isInteger(length) || length < 1 || length > 128) {
      throw new _ValidationError("length", length, "integer between 1 and 128");
    }
  }

  private validateKey(key: string): void {
    const validKeys = [
      "C",
      "C#",
      "Db",
      "D",
      "D#",
      "Eb",
      "E",
      "F",
      "F#",
      "Gb",
      "G",
      "G#",
      "Ab",
      "A",
      "A#",
      "Bb",
      "B",
    ];
    if (!validKeys.includes(key)) {
      throw new _ValidationError("key", key, `one of: ${validKeys.join(", ")}`);
    }
  }

  private validateScale(scale: string): void {
    const validScales = [
      "major",
      "minor",
      "dorian",
      "phrygian",
      "lydian",
      "mixolydian",
      "aeolian",
      "locrian",
      "pentatonic",
      "blues",
    ];
    if (!validScales.includes(scale)) {
      throw new _ValidationError(
        "scale",
        scale,
        `one of: ${validScales.join(", ")}`,
      );
    }
  }

  private validateRange(rangeLow: number, rangeHigh: number): void {
    if (!Number.isInteger(rangeLow) || rangeLow < 0 || rangeLow > 127) {
      throw new _ValidationError(
        "rangeLow",
        rangeLow,
        "MIDI note number (0-127)",
      );
    }
    if (!Number.isInteger(rangeHigh) || rangeHigh < 0 || rangeHigh > 127) {
      throw new _ValidationError(
        "rangeHigh",
        rangeHigh,
        "MIDI note number (0-127)",
      );
    }
    if (rangeLow >= rangeHigh) {
      throw new _ValidationError(
        "range",
        `${rangeLow}-${rangeHigh}`,
        "rangeLow must be less than rangeHigh",
      );
    }
  }

  private validateVariationType(variationType: MelodyVariationType): void {
    const validTypes: MelodyVariationType[] = [
      "inversion",
      "retrograde",
      "augmentation",
      "diminution",
      "sequence",
      "fragmentation",
      "ornamentation",
    ];
    if (!validTypes.includes(variationType)) {
      throw new _ValidationError(
        "variationType",
        variationType,
        `one of: ${validTypes.join(", ")}`,
      );
    }
  }

  private validateMelodyLine(melody: any): MelodyLine {
    if (!melody || typeof melody !== "object") {
      throw new _ValidationError("melody", melody, "MelodyLine object");
    }

    if (!Array.isArray(melody.notes) || melody.notes.length === 0) {
      throw new _ValidationError(
        "melody.notes",
        melody.notes,
        "non-empty array of MIDI note numbers",
      );
    }

    if (
      !Array.isArray(melody.durations) ||
      melody.durations.length !== melody.notes.length
    ) {
      throw new _ValidationError(
        "melody.durations",
        melody.durations,
        "array of durations matching notes length",
      );
    }

    if (!melody.key || typeof melody.key !== "string") {
      throw new _ValidationError(
        "melody.key",
        melody.key,
        "string key signature",
      );
    }

    if (!melody.scale || typeof melody.scale !== "string") {
      throw new _ValidationError(
        "melody.scale",
        melody.scale,
        "string scale type",
      );
    }

    // Validate MIDI note ranges
    for (const note of melody.notes) {
      if (!Number.isInteger(note) || note < 0 || note > 127) {
        throw new _ValidationError(
          "melody.notes",
          note,
          "MIDI note numbers (0-127)",
        );
      }
    }

    // Validate durations
    for (const duration of melody.durations) {
      if (typeof duration !== "number" || duration <= 0) {
        throw new _ValidationError(
          "melody.durations",
          duration,
          "positive numbers",
        );
      }
    }

    return melody as MelodyLine;
  }

  private validateMelodicAnalysis(analysis: any): MelodicAnalysis {
    if (!analysis || typeof analysis !== "object") {
      throw new _ValidationError(
        "analysis",
        analysis,
        "MelodicAnalysis object",
      );
    }

    // Basic validation - the shared types should handle the rest
    return analysis as MelodicAnalysis;
  }

  private validateSchillingerEncoding(encoding: any): SchillingerEncoding {
    if (!encoding || typeof encoding !== "object") {
      throw new _ValidationError(
        "encoding",
        encoding,
        "SchillingerEncoding object",
      );
    }

    if (encoding.type !== "melody") {
      throw new _ValidationError("encoding.type", encoding.type, "melody");
    }

    return encoding as SchillingerEncoding;
  }

  private validateMelodyMatch(match: any): MelodyMatch {
    if (!match || typeof match !== "object") {
      throw new _ValidationError("match", match, "MelodyMatch object");
    }

    if (!match.melody) {
      throw new _ValidationError(
        "match.melody",
        match.melody,
        "MelodyLine object",
      );
    }

    this.validateMelodyLine(match.melody);

    return match as MelodyMatch;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getScalePattern(scale: string): number[] {
    const patterns: Record<string, number[]> = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      aeolian: [0, 2, 3, 5, 7, 8, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10],
      pentatonic: [0, 2, 4, 7, 9],
      blues: [0, 3, 5, 6, 7, 10],
    };
    return patterns[scale] || patterns["major"];
  }

  private getKeyOffset(key: string): number {
    const offsets: Record<string, number> = {
      C: 0,
      "C#": 1,
      Db: 1,
      D: 2,
      "D#": 3,
      Eb: 3,
      E: 4,
      F: 5,
      "F#": 6,
      Gb: 6,
      G: 7,
      "G#": 8,
      Ab: 8,
      A: 9,
      "A#": 10,
      Bb: 10,
      B: 11,
    };
    return offsets[key] || 0;
  }

  private generateContourNotes(
    contour: ContourType,
    length: number,
    rangeLow: number,
    rangeHigh: number,
    scalePattern: number[],
    keyOffset: number,
  ): number[] {
    const notes: number[] = [];
    const range = rangeHigh - rangeLow;

    for (let i = 0; i < length; i++) {
      const progress = i / (length - 1);
      let height: number;

      switch (contour) {
        case "ascending":
          height = progress;
          break;
        case "descending":
          height = 1 - progress;
          break;
        case "arch":
          height = Math.sin(progress * Math.PI);
          break;
        case "inverted_arch":
          height = 1 - Math.sin(progress * Math.PI);
          break;
        case "wave":
          height = (Math.sin(progress * Math.PI * 2) + 1) / 2;
          break;
        case "zigzag":
          height =
            progress % 0.5 < 0.25
              ? (progress % 0.25) * 4
              : 1 - (progress % 0.25) * 4;
          break;
        case "plateau":
          height =
            progress < 0.2
              ? progress * 5
              : progress > 0.8
                ? (1 - progress) * 5
                : 1;
          break;
        default: // random
          height = Math.random();
      }

      // Map to scale degree
      const scaleDegree = Math.floor(height * scalePattern.length);
      const octave =
        Math.floor(rangeLow / 12) + Math.floor((height * range) / 12);
      const note = octave * 12 + scalePattern[scaleDegree] + keyOffset;

      notes.push(Math.max(rangeLow, Math.min(rangeHigh, note)));
    }

    return notes;
  }

  private generateBasicDurations(length: number): number[] {
    // Generate simple quarter note durations with some variation
    const durations: number[] = [];
    const basicDurations = [0.25, 0.5, 1.0]; // sixteenth, eighth, quarter

    for (let i = 0; i < length; i++) {
      durations.push(
        basicDurations[Math.floor(Math.random() * basicDurations.length)],
      );
    }

    return durations;
  }

  private calculateIntervals(notes: number[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < notes.length; i++) {
      intervals.push(notes[i] - notes[i - 1]);
    }
    return intervals;
  }

  private detectPhrases(notes: number[]): Array<{
    start: number;
    end: number;
    direction: "ascending" | "descending" | "static";
    peak: number;
  }> {
    const phrases: Array<{
      start: number;
      end: number;
      direction: "ascending" | "descending" | "static";
      peak: number;
    }> = [];
    const phraseLength = Math.max(4, Math.floor(notes.length / 4));

    for (let i = 0; i < notes.length; i += phraseLength) {
      const end = Math.min(i + phraseLength - 1, notes.length - 1);
      const startNote = notes[i];
      const endNote = notes[end];

      // Find the peak (highest note) in this phrase
      const phraseNotes = notes.slice(i, end + 1);
      const peak = Math.max(...phraseNotes);

      let direction: "ascending" | "descending" | "static";
      if (endNote > startNote + 2) direction = "ascending";
      else if (endNote < startNote - 2) direction = "descending";
      else direction = "static";

      phrases.push({ start: i, end, direction, peak });
    }

    return phrases;
  }

  private invertMelody(notes: number[]): number[] {
    if (notes.length === 0) return notes;

    const center = notes[0];
    return notes.map((note) => center - (note - center));
  }

  private sequenceMelody(notes: number[], steps: number): number[] {
    return notes.map((note) => note + steps * 2); // Transpose by steps
  }

  private addRandomVariation(notes: number[], intensity: number): number[] {
    return notes.map((note) => {
      const variation = (Math.random() - 0.5) * intensity * 12; // Up to intensity semitones
      return Math.round(note + variation);
    });
  }

  private generateSimilarMelody(
    originalNotes: number[],
    similarity: number,
  ): number[] {
    const variation = 1 - similarity;
    return originalNotes.map((note) => {
      const change = (Math.random() - 0.5) * variation * 12;
      return Math.max(0, Math.min(127, Math.round(note + change)));
    });
  }

  // Enhanced helper methods for production-grade melody generation

  /**
   * Calculate tonal center based on key and scale
   */
  private calculateTonalCenter(key: string, scale: string): number {
    const keyOffset = this.getKeyOffset(key);
    const scalePattern = this.getScalePattern(scale);

    // Tonic is the first degree of the scale
    return keyOffset;
  }

  /**
   * Generate advanced contour notes with voice leading considerations
   */
  private generateAdvancedContourNotes(
    contour: ContourType,
    length: number,
    rangeLow: number,
    rangeHigh: number,
    scalePattern: number[],
    keyOffset: number,
    tonalCenter: number,
    style: string,
  ): number[] {
    const notes: number[] = [];
    const range = rangeHigh - rangeLow;

    // Previous note for voice leading
    let previousNote = tonalCenter;

    for (let i = 0; i < length; i++) {
      const progress = i / (length - 1);
      let targetHeight: number;
      let preferredIntervals: number[];

      // Style-specific interval preferences
      switch (style) {
        case "classical":
          preferredIntervals = [2, 2, 1, 2, 2, 1, 2]; // Conjunct motion preferred
          break;
        case "romantic":
          preferredIntervals = [3, 4, 5, 6, 7, 2, 3]; // More expressive intervals
          break;
        case "jazz":
          preferredIntervals = [5, 7, 9, 11, 2, 3, 4]; // Extended intervals
          break;
        case "folk":
          preferredIntervals = [1, 2, 3, 5, 6, 8]; // Pentatonic-friendly
          break;
        default:
          preferredIntervals = [2, 3, 4, 5, 2]; // Balanced
      }

      // Generate target height based on contour
      switch (contour) {
        case "ascending":
          targetHeight = progress;
          break;
        case "descending":
          targetHeight = 1 - progress;
          break;
        case "arch":
          targetHeight = Math.sin(progress * Math.PI);
          break;
        case "inverted_arch":
          targetHeight = 1 - Math.sin(progress * Math.PI);
          break;
        case "wave":
          targetHeight = (Math.sin(progress * Math.PI * 2) + 1) / 2;
          break;
        default:
          targetHeight = progress;
      }

      // Choose interval that best matches the contour direction
      const interval = this.chooseIntervalForContour(
        targetHeight,
        previousNote,
        tonalCenter,
        preferredIntervals,
        rangeLow,
        rangeHigh,
      );

      const newNote = previousNote + interval;
      notes.push(Math.max(rangeLow, Math.min(rangeHigh, newNote)));
      previousNote = newNote;
    }

    return notes;
  }

  /**
   * Choose appropriate interval for contour direction
   */
  private chooseIntervalForContour(
    targetHeight: number,
    currentNote: number,
    tonalCenter: number,
    preferredIntervals: number[],
    rangeLow: number,
    rangeHigh: number,
  ): number {
    const range = rangeHigh - rangeLow;
    const targetNote = rangeLow + targetHeight * range;

    // Find interval that gets us closest to target
    let bestInterval = 2; // Default to whole step
    let bestDistance = Math.abs(currentNote + bestInterval - targetNote);

    for (const interval of preferredIntervals) {
      const candidateNote = currentNote + interval;
      const candidateDistance = Math.abs(candidateNote - targetNote);

      // Check if candidate is within range
      if (candidateNote >= rangeLow && candidateNote <= rangeHigh) {
        if (candidateDistance < bestDistance) {
          bestInterval = interval;
          bestDistance = candidateDistance;
        }
      }
    }

    return bestInterval;
  }

  /**
   * Generate musically appropriate durations
   */
  private generateMusicalDurations(
    length: number,
    style: string,
    contour: ContourType,
  ): number[] {
    const durations: number[] = [];

    // Style-specific rhythmic patterns
    let baseDurations: number[];
    let rhythmicPatterns: number[][];

    switch (style) {
      case "classical":
        baseDurations = [0.25, 0.5, 1.0, 2.0]; // 16th, 8th, quarter, half
        rhythmicPatterns = [
          [0.5, 0.5, 0.5, 0.5], // Steady quarter notes
          [0.25, 0.25, 0.5, 0.5], // Eighth-eighth-quarter-quarter
          [1.0, 0.5, 0.5, 1.0], // Half-quarter-quarter-half
        ];
        break;
      case "romantic":
        baseDurations = [0.25, 0.375, 0.5, 0.75, 1.0]; // More varied
        rhythmicPatterns = [
          [0.75, 0.25, 0.5, 0.5], // Dotted eighth-sixteenth-quarter-quarter
          [0.5, 0.25, 0.75, 0.5], // Quarter-eighth-dotted eighth-quarter
        ];
        break;
      case "jazz":
        baseDurations = [0.125, 0.25, 0.375, 0.5, 0.75]; // Swing-ready
        rhythmicPatterns = [
          [0.375, 0.125, 0.5, 0.5], // Swing eighths
          [0.5, 0.375, 0.125, 1.0], // Quarter-swing eighths-half
        ];
        break;
      default:
        baseDurations = [0.25, 0.5, 1.0];
        rhythmicPatterns = [[0.5, 0.5, 0.5, 0.5]];
    }

    // Generate durations based on contour
    if (contour === "wave" || contour === "zigzag") {
      // Use more varied rhythms for complex contours
      for (let i = 0; i < length; i++) {
        durations.push(
          baseDurations[Math.floor(Math.random() * baseDurations.length)],
        );
      }
    } else {
      // Use rhythmic patterns for simpler contours
      const pattern =
        rhythmicPatterns[Math.floor(Math.random() * rhythmicPatterns.length)];
      for (let i = 0; i < length; i++) {
        durations.push(pattern[i % pattern.length]);
      }
    }

    return durations;
  }

  /**
   * Generate articulations based on melodic context
   */
  private generateArticulations(
    notes: number[],
    contour: ContourType,
    style: string,
  ): string[] {
    const articulations: string[] = [];

    for (let i = 0; i < notes.length; i++) {
      const interval = i > 0 ? notes[i] - notes[i - 1] : 0;

      // Determine articulation based on interval and style
      if (Math.abs(interval) >= 5) {
        articulations.push("accent"); // Accent leaps
      } else if (style === "romantic" && Math.abs(interval) === 3) {
        articulations.push("tenuto"); // Tenuto for expressive thirds
      } else if (style === "classical" && Math.abs(interval) <= 2) {
        articulations.push("legato"); // Legato for stepwise motion
      } else {
        articulations.push("normal"); // Default articulation
      }
    }

    return articulations;
  }
}

// ===== EXPORTED TYPES FOR INTEROPERABILITY =====

/**
 * Scale Degree - represents a position within a scale
 */
export type ScaleDegree = number;

/**
 * Contour Direction - melodic movement direction
 */
export type ContourDirection = "up" | "down" | "static";

/**
 * Rhythmic Pattern - alias for shared RhythmPattern
 * Re-exported for convenience
 */
export type { RhythmPattern as RhythmicPattern } from "./ir";
