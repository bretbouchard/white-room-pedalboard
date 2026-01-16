import { BaseGenerator } from "./BaseGenerator";
import type {
  ChordProgression,
  HarmonicAnalysis,
  GeneratorResult,
  HarmonyGeneratorConfig,
  HarmonyGeneratorParameters,
  SchillingerSDK,
} from "@schillinger-sdk/shared";

/**
 * Parameters for harmony generation
 */
export interface ProgressionParams {
  key: string;
  scale: string;
  length: number;
  style?: "classical" | "jazz" | "contemporary" | "experimental";
  complexity?: number;
  includeExtensions?: boolean;
}

/**
 * Parameters for chord resolution
 */
export interface ResolutionParams {
  key: string;
  scale: string;
  context?:
    | "dominant_preparation"
    | "tonic_preparation"
    | "subdominant_preparation";
  includeAlterations?: boolean;
}

/**
 * Parameters for harmony variations
 */
export interface HarmonyVariationParams {
  style:
    | "modal_interchange"
    | "secondary_dominants"
    | "tritone_substitution"
    | "color_chords";
  preserveMelody?: boolean;
  targetKey?: string;
}

/**
 * HarmonyGenerator provides stateful harmony generation and analysis capabilities.
 *
 * This generator wraps the functional HarmonyAPI while adding:
 * - Parameter persistence between calls
 * - Enhanced metadata tracking
 * - Stateful configuration management
 * - Detailed result provenance
 */
export class HarmonyGenerator extends BaseGenerator<
  HarmonyGeneratorConfig,
  HarmonyGeneratorParameters
> {
  /**
   * Create a new HarmonyGenerator instance
   *
   * @param config - Configuration options for the generator
   */
  constructor(config?: HarmonyGeneratorConfig) {
    super(
      {
        defaultStyle: "contemporary",
        cacheEnabled: true,
        offlineFallback: true,
        defaultKey: "C",
        defaultScale: "major",
        ...config,
      },
      config?.sdk,
    );
  }

  /**
   * Get default configuration for harmony generation
   */
  getDefaultConfig(): HarmonyGeneratorConfig {
    return {
      defaultStyle: "contemporary",
      cacheEnabled: true,
      offlineFallback: true,
      defaultKey: "C",
      defaultScale: "major",
    };
  }

  /**
   * Get default parameters for harmony generation
   */
  getDefaultParameters(): HarmonyGeneratorParameters {
    return {
      style: this.config.defaultStyle || "contemporary",
      complexity: 0.5,
      key: this.config.defaultKey || "C",
      scale: this.config.defaultScale || "major",
      includeExtensions: false,
      functionalHarmony: true,
    };
  }

  /**
   * Generate a chord progression
   *
   * @param params - Parameters for progression generation
   */
  async generateProgression(
    params: ProgressionParams,
  ): Promise<GeneratorResult<ChordProgression>> {
    const mergedParams = this.mergeParameters({
      style: params.style,
      complexity: params.complexity,
      key: params.key,
      scale: params.scale,
      includeExtensions: params.includeExtensions,
    });

    const methodParams = { ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const progression = await sdk.harmony.generateProgression(
        params.key,
        params.scale,
        params.length,
        {
          style: mergedParams.style,
          complexity: mergedParams.complexity,
          includeExtensions: mergedParams.includeExtensions,
        },
      );

      // Enhance with generator parameters
      const enhancedProgression: ChordProgression = {
        ...progression,
        key: mergedParams.key || params.key,
        scale: mergedParams.scale || params.scale,
        metadata: {
          ...progression.metadata,
          complexity: mergedParams.complexity,
        },
      };

      return this.createResult(enhancedProgression, methodParams);
    } catch (error) {
      throw new Error(`HarmonyGenerator.generateProgression failed: ${error}`);
    }
  }

  /**
   * Analyze a chord progression
   *
   * @param progression - The chord progression to analyze
   * @param params - Optional analysis parameters
   */
  async analyzeProgression(
    progression: ChordProgression,
    params: Partial<HarmonyGeneratorParameters> = {},
  ): Promise<GeneratorResult<HarmonicAnalysis>> {
    const mergedParams = this.mergeParameters(params);
    const methodParams = { progressionId: progression.id };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const analysis = await sdk.harmony.analyzeProgression(progression.chords);

      return this.createResult(analysis, methodParams);
    } catch (error) {
      throw new Error(`HarmonyGenerator.analyzeProgression failed: ${error}`);
    }
  }

  /**
   * Generate variations on an existing progression
   *
   * @param progression - The base chord progression
   * @param params - Variation parameters
   */
  async generateVariations(
    progression: ChordProgression,
    params: HarmonyVariationParams,
  ): Promise<GeneratorResult<ChordProgression>> {
    const methodParams = {
      progressionId: progression.id,
      ...params,
    };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API (if available)
      const variation = await sdk.harmony.generateVariations(
        progression,
        params,
      );

      // Enhance with generator parameters
      const enhancedVariation: ChordProgression = {
        ...variation,
        key: progression.key,
        scale: progression.scale,
        metadata: {
          ...variation.metadata,
          originalProgressionId: progression.id,
          variationStyle: params.style,
        },
      };

      return this.createResult(enhancedVariation, methodParams);
    } catch (error) {
      throw new Error(`HarmonyGenerator.generateVariations failed: ${error}`);
    }
  }

  /**
   * Resolve a chord in a given context
   *
   * @param chord - The chord to resolve
   * @param params - Resolution context parameters
   */
  async resolveChord(
    chord: string,
    params: ResolutionParams,
  ): Promise<
    GeneratorResult<{ resolutions: string[]; analysis: HarmonicAnalysis }>
  > {
    const mergedParams = this.mergeParameters({
      key: params.key,
      scale: params.scale,
    });

    const methodParams = { chord, ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const resolution = await sdk.harmony.resolveChord(chord, {
        key: mergedParams.key || params.key,
        scale: mergedParams.scale || params.scale,
        context: params.context,
      });

      return this.createResult(resolution, methodParams);
    } catch (error) {
      throw new Error(`HarmonyGenerator.resolveChord failed: ${error}`);
    }
  }

  /**
   * Infer harmonic structure from a list of chords
   *
   * @param chords - List of chords to analyze
   * @param params - Optional inference parameters
   */
  async inferHarmonicStructure(
    chords: string[],
    params: { preferredKey?: string; preferredScale?: string } = {},
  ): Promise<
    GeneratorResult<{
      key: string;
      scale: string;
      functionalRoles: string[];
      confidence: number;
    }>
  > {
    const mergedParams = this.mergeParameters({
      key: params.preferredKey,
      scale: params.preferredScale,
    });

    const methodParams = { chords, ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API (if available)
      const structure = await sdk.harmony.inferHarmonicStructure(chords);

      return this.createResult(structure, methodParams);
    } catch (error) {
      throw new Error(
        `HarmonyGenerator.inferHarmonicStructure failed: ${error}`,
      );
    }
  }

  /**
   * Get harmonic suggestions based on current parameters
   *
   * @param context - Context for suggestions
   */
  getSuggestions(
    context: {
      currentChord?: string;
      style?: string;
      key?: string;
      scale?: string;
    } = {},
  ): GeneratorResult<string[]> {
    const mergedContext = { ...this.parameters, ...context };
    const methodParams = { context: mergedContext };

    try {
      // Generate suggestions based on current parameters
      const suggestions = [
        `Try ${mergedContext.style || "contemporary"} style for modern harmony`,
        `Consider key of ${mergedContext.key || "C"} ${mergedContext.scale || "major"} for bright sound`,
        `Use functional harmony ${mergedContext.functionalHarmony ? "enabled" : "disabled"} for traditional progressions`,
        mergedContext.currentChord
          ? `From ${mergedContext.currentChord}, consider IV or V chords for strong resolution`
          : `Start with tonic chord for stable beginning`,
      ];

      return this.createResult(suggestions, methodParams);
    } catch (error) {
      throw new Error(`HarmonyGenerator.getSuggestions failed: ${error}`);
    }
  }
}
