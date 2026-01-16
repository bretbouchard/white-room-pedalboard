import { BaseGenerator } from './BaseGenerator';
import type {
  MelodyLine,
  MelodicAnalysis,
  GeneratorResult,
  MelodyGeneratorConfig,
  MelodyGeneratorParameters,
  SchillingerSDK,
} from '../../shared/src/types';

/**
 * Parameters for melody generation
 */
export interface MelodyGenerationParams {
  key: string;
  scale: string;
  length: number;
  contour: 'ascending' | 'descending' | 'wave' | 'arch';
  intervalRange?: [number, number];
  rhythmPattern?: number[];
  harmonicContext?: string[];
}

/**
 * Parameters for melody variations
 */
export interface MelodyVariationParams {
  type: 'inversion' | 'retrograde' | 'modal_shift' | 'interval_expansion' | 'rhythm_variation';
  newScale?: string;
  expansionFactor?: number;
  preserveContour?: boolean;
}

/**
 * Parameters for melodic analysis
 */
export interface MelodyAnalysisParams {
  includePhrases?: boolean;
  includeIntervals?: boolean;
  harmonicContext?: string[];
}

/**
 * MelodyGenerator provides stateful melody generation and analysis capabilities.
 *
 * This generator wraps the functional MelodyAPI while adding:
 * - Parameter persistence between calls
 * - Enhanced metadata tracking
 * - Stateful configuration management
 * - Detailed result provenance
 */
export class MelodyGenerator extends BaseGenerator<
  MelodyGeneratorConfig,
  MelodyGeneratorParameters
> {
  /**
   * Create a new MelodyGenerator instance
   *
   * @param config - Configuration options for the generator
   */
  constructor(config?: MelodyGeneratorConfig) {
    super(
      {
        defaultContour: 'wave',
        cacheEnabled: true,
        offlineFallback: true,
        defaultKey: 'C',
        defaultScale: 'major',
        defaultRange: [60, 84], // One octave range starting at Middle C
        ...config,
      },
      config?.sdk
    );
  }

  /**
   * Get default configuration for melody generation
   */
  getDefaultConfig(): MelodyGeneratorConfig {
    return {
      defaultContour: 'wave',
      cacheEnabled: true,
      offlineFallback: true,
      defaultKey: 'C',
      defaultScale: 'major',
      defaultRange: [60, 84],
    };
  }

  /**
   * Get default parameters for melody generation
   */
  getDefaultParameters(): MelodyGeneratorParameters {
    return {
      contour: this.config.defaultContour || 'wave',
      key: this.config.defaultKey || 'C',
      scale: this.config.defaultScale || 'major',
      range: this.config.defaultRange || [60, 84],
      intervalPreference: [1, 2, 3, 4, 5], // Perfect intervals first
      rhythmIntegration: true,
    };
  }

  /**
   * Generate a melodic line
   *
   * @param params - Parameters for melody generation
   */
  generateMelody(params: MelodyGenerationParams): GeneratorResult<MelodyLine> {
    const mergedParams = this.mergeParameters({
      contour: params.contour,
      key: params.key,
      scale: params.scale,
      range: params.intervalRange,
    });

    const methodParams = { ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const melody = sdk.melody.generateMelody({
        key: mergedParams.key || params.key,
        scale: mergedParams.scale || params.scale,
        length: params.length,
        contour: mergedParams.contour || params.contour,
        intervalRange: mergedParams.range || params.intervalRange,
      });

      // Enhance with generator parameters
      const enhancedMelody: MelodyLine = {
        ...melody,
        key: mergedParams.key || params.key,
        scale: mergedParams.scale || params.scale,
        metadata: {
          ...melody.metadata,
          contour: mergedParams.contour,
          range: mergedParams.range,
        },
      };

      return this.createResult(enhancedMelody, methodParams);
    } catch (error) {
      throw new Error(`MelodyGenerator.generateMelody failed: ${error}`);
    }
  }

  /**
   * Analyze a melodic line
   *
   * @param melody - The melody to analyze
   * @param params - Optional analysis parameters
   */
  analyzeMelody(
    melody: MelodyLine,
    params: MelodyAnalysisParams = {}
  ): GeneratorResult<MelodicAnalysis> {
    const mergedParams = this.mergeParameters({
      key: melody.key,
      scale: melody.scale,
    });

    const methodParams = { melodyId: melody.id, ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const analysis = sdk.melody.analyzeMelody(melody);

      return this.createResult(analysis, methodParams);
    } catch (error) {
      throw new Error(`MelodyGenerator.analyzeMelody failed: ${error}`);
    }
  }

  /**
   * Generate variations on an existing melody
   *
   * @param melody - The base melody
   * @param params - Variation parameters
   */
  generateVariations(
    melody: MelodyLine,
    params: MelodyVariationParams
  ): GeneratorResult<MelodyLine> {
    const methodParams = {
      melodyId: melody.id,
      ...params
    };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const variation = sdk.melody.generateVariations(melody, params.type, params);

      // Enhance with generator parameters
      const enhancedVariation: MelodyLine = {
        ...variation,
        key: params.newScale ? melody.key : melody.key,
        scale: params.newScale || melody.scale,
        metadata: {
          ...variation.metadata,
          originalMelodyId: melody.id,
          variationType: params.type,
        },
      };

      return this.createResult(enhancedVariation, methodParams);
    } catch (error) {
      throw new Error(`MelodyGenerator.generateVariations failed: ${error}`);
    }
  }

  /**
   * Extract contour from a melody for similarity matching
   *
   * @param melody - The melody to analyze
   */
  extractContour(melody: MelodyLine): GeneratorResult<string[]> {
    const methodParams = { melodyId: melody.id };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API (if available)
      const contour = sdk.melody.extractContour(melody);

      return this.createResult(contour, methodParams);
    } catch (error) {
      throw new Error(`MelodyGenerator.extractContour failed: ${error}`);
    }
  }

  /**
   * Find similar melodies based on contour
   *
   * @param contour - The contour to match
   * @param params - Search parameters
   */
  findSimilarMelodies(
    contour: string[],
    params: { tolerance?: number; style?: string } = {}
  ): GeneratorResult<{ melody: MelodyLine; similarity: number }[]> {
    const methodParams = { contourLength: contour.length, ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API (if available)
      const similar = sdk.melody.findSimilarMelodies(contour, params);

      return this.createResult(similar, methodParams);
    } catch (error) {
      throw new Error(`MelodyGenerator.findSimilarMelodies failed: ${error}`);
    }
  }

  /**
   * Complete a partial melody pattern
   *
   * @param partialMelody - The incomplete melody
   * @param targetLength - Desired final length
   * @param params - Completion parameters
   */
  completeMelody(
    partialMelody: MelodyLine,
    targetLength: number,
    params: { preserveStyle?: boolean; harmonicContext?: string[] } = {}
  ): GeneratorResult<MelodyLine> {
    const methodParams = {
      partialMelodyId: partialMelody.id,
      targetLength,
      ...params
    };

    try {
      // For now, implement basic completion logic
      const completedLength = Math.min(partialMelody.notes.length, targetLength);
      const completedNotes = partialMelody.notes.slice(0, completedLength);
      const completedDurations = partialMelody.durations.slice(0, completedLength);

      // Pad with additional notes if needed
      while (completedNotes.length < targetLength) {
        const lastNote = completedNotes[completedNotes.length - 1] || this.parameters.range?.[0] || 60;
        const interval = this.parameters.intervalPreference?.[0] || 1;
        completedNotes.push(lastNote + interval);
        completedDurations.push(1); // Default duration
      }

      const completedMelody: MelodyLine = {
        ...partialMelody,
        notes: completedNotes,
        durations: completedDurations,
        metadata: {
          ...partialMelody.metadata,
          originalPartialId: partialMelody.id,
          completionMethod: 'generator',
        },
      };

      return this.createResult(completedMelody, methodParams);
    } catch (error) {
      throw new Error(`MelodyGenerator.completeMelody failed: ${error}`);
    }
  }

  /**
   * Get melodic suggestions based on current parameters
   *
   * @param context - Context for suggestions
   */
  getSuggestions(context: {
    currentNote?: number;
    style?: string;
    key?: string;
    scale?: string;
  } = {}): GeneratorResult<string[]> {
    const mergedContext = { ...this.parameters, ...context };
    const methodParams = { context: mergedContext };

    try {
      // Generate suggestions based on current parameters
      const suggestions = [
        `Try ${mergedContext.contour} contour for expressive lines`,
        `Use ${mergedContext.key || 'C'} ${mergedContext.scale || 'major'} for bright tonality`,
        `Stay within range ${mergedContext.range?.[0]}-${mergedContext.range?.[1]} for comfortable voice leading`,
        mergedContext.currentNote
          ? `From note ${mergedContext.currentNote}, consider intervals ${mergedContext.intervalPreference?.join(', ')}`
          : `Start with tonic for strong melodic opening`,
        mergedContext.rhythmIntegration
          ? 'Integrate rhythm and melody for cohesive phrases'
          : 'Focus on pitch contour first, add rhythm later',
      ];

      return this.createResult(suggestions, methodParams);
    } catch (error) {
      throw new Error(`MelodyGenerator.getSuggestions failed: ${error}`);
    }
  }
}