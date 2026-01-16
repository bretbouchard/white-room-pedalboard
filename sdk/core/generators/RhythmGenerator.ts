import { BaseGenerator } from "./BaseGenerator";
import type {
  RhythmPattern,
  RhythmAnalysis,
  GeneratorInference,
  GeneratorResult,
  RhythmGeneratorConfig,
  RhythmGeneratorParameters,
  SchillingerSDK,
  VariationType,
} from "@schillinger-sdk/shared";

/**
 * Configuration for complex rhythm generation
 */
export interface ComplexRhythmParams {
  generators: [number, number];
  complexity: number;
  style?: "classical" | "jazz" | "contemporary" | "experimental";
  timeSignature?: [number, number];
  swing?: number;
}

/**
 * Configuration for rhythm variations
 */
export interface RhythmVariationParams {
  type: VariationType;
  factor?: number;
  preserveAccent?: boolean;
}

/**
 * RhythmGenerator provides stateful rhythm generation and analysis capabilities.
 *
 * This generator wraps the functional RhythmAPI while adding:
 * - Parameter persistence between calls
 * - Enhanced metadata tracking
 * - Stateful configuration management
 * - Detailed result provenance
 */
export class RhythmGenerator extends BaseGenerator<
  RhythmGeneratorConfig,
  RhythmGeneratorParameters
> {
  /**
   * Create a new RhythmGenerator instance
   *
   * @param config - Configuration options for the generator
   */
  constructor(config?: RhythmGeneratorConfig) {
    super(
      {
        defaultComplexity: 0.5,
        cacheEnabled: true,
        offlineFallback: true,
        defaultTempo: 120,
        defaultTimeSignature: [4, 4],
        defaultSwing: 0,
        ...config,
      },
      config?.sdk,
    );
  }

  /**
   * Get default configuration for rhythm generation
   */
  getDefaultConfig(): RhythmGeneratorConfig {
    return {
      defaultComplexity: 0.5,
      cacheEnabled: true,
      offlineFallback: true,
      defaultTempo: 120,
      defaultTimeSignature: [4, 4],
      defaultSwing: 0,
    };
  }

  /**
   * Get default parameters for rhythm generation
   */
  getDefaultParameters(): RhythmGeneratorParameters {
    return {
      swing: this.config.defaultSwing || 0,
      style: "contemporary",
      complexity: this.config.defaultComplexity || 0.5,
      density: 0.5,
    };
  }

  /**
   * Generate a rhythmic resultant pattern from two generators
   *
   * @param a - First generator (number of units)
   * @param b - Second generator (number of units)
   * @param params - Optional method-specific parameters
   */
  async generateResultant(
    a: number,
    b: number,
    params: Partial<RhythmGeneratorParameters> = {},
  ): Promise<GeneratorResult<RhythmPattern>> {
    const mergedParams = this.mergeParameters(params);
    const methodParams = { a, b };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const pattern = await sdk.rhythm.generateResultant(a, b);

      // Enhance with generator parameters
      const enhancedPattern: RhythmPattern = {
        ...pattern,
        swing: mergedParams.swing,
        metadata: {
          ...pattern.metadata,
          generators: [a, b],
          complexity: mergedParams.complexity,
        },
      };

      return this.createResult(enhancedPattern, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.generateResultant failed: ${error}`);
    }
  }

  /**
   * Generate a complex rhythmic pattern
   *
   * @param params - Parameters for complex rhythm generation
   */
  async generateComplex(
    params: ComplexRhythmParams,
  ): Promise<GeneratorResult<RhythmPattern>> {
    const mergedParams = this.mergeParameters({
      style: params.style,
      swing: params.swing,
      complexity: params.complexity,
    });

    const methodParams = { ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const pattern = await sdk.rhythm.generateComplex({
        generators: params.generators,
        complexity: params.complexity,
        style: mergedParams.style,
      });

      // Enhance with generator parameters
      const enhancedPattern: RhythmPattern = {
        ...pattern,
        swing: mergedParams.swing,
        metadata: {
          ...pattern.metadata,
          generators: params.generators,
          complexity: mergedParams.complexity,
        },
      };

      return this.createResult(enhancedPattern, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.generateComplex failed: ${error}`);
    }
  }

  /**
   * Analyze a rhythmic pattern
   *
   * @param pattern - The rhythm pattern to analyze
   * @param params - Optional analysis parameters
   */
  async analyzePattern(
    pattern: RhythmPattern,
    params: Partial<RhythmGeneratorParameters> = {},
  ): Promise<GeneratorResult<RhythmAnalysis>> {
    const mergedParams = this.mergeParameters(params);
    const methodParams = { patternId: pattern.id };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const analysis = await sdk.rhythm.analyzePattern(pattern);

      return this.createResult(analysis, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.analyzePattern failed: ${error}`);
    }
  }

  /**
   * Infer the original generators from a rhythm pattern
   *
   * @param pattern - The rhythm pattern to analyze
   * @param params - Optional inference parameters
   */
  async inferGenerators(
    pattern: RhythmPattern,
    params: { maxGenerators?: number; tolerance?: number } = {},
  ): Promise<GeneratorResult<GeneratorInference>> {
    const methodParams = { patternId: pattern.id, ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const inference = await sdk.rhythm.inferGenerators(pattern, params);

      return this.createResult(inference, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.inferGenerators failed: ${error}`);
    }
  }

  /**
   * Create a variation of an existing rhythm pattern
   *
   * @param pattern - The base rhythm pattern
   * @param variationType - Type of variation to apply
   * @param params - Variation-specific parameters
   */
  async generateVariation(
    pattern: RhythmPattern,
    variationType: VariationType,
    params: RhythmVariationParams = { type: variationType },
  ): Promise<GeneratorResult<RhythmPattern>> {
    const methodParams = {
      patternId: pattern.id,
      variationType,
      ...params,
    };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const variation = await sdk.rhythm.generateVariation(
        pattern,
        variationType,
        params,
      );

      // Enhance with generator parameters
      const enhancedVariation: RhythmPattern = {
        ...variation,
        tempo: this.parameters.tempo,
        swing: this.parameters.swing,
        metadata: {
          ...variation.metadata,
          variationType,
          originalPatternId: pattern.id,
        },
      };

      return this.createResult(enhancedVariation, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.generateVariation failed: ${error}`);
    }
  }

  /**
   * Find the best fitting generators for a target pattern
   *
   * @param targetPattern - The pattern to match
   * @param params - Search parameters
   */
  async findBestFit(
    targetPattern: RhythmPattern,
    params: { maxGenerators?: number; tolerance?: number } = {},
  ): Promise<GeneratorResult<{ generators: [number, number]; score: number }>> {
    const methodParams = {
      targetPatternId: targetPattern.id,
      ...params,
    };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API (if available)
      // Note: This method might not exist in the current API, implement fallback
      const inference = await sdk.rhythm.inferGenerators(targetPattern, params);
      const bestFit = {
        generators: inference.generators,
        score: inference.confidence,
      };

      return this.createResult(bestFit, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.findBestFit failed: ${error}`);
    }
  }

  /**
   * Encode a rhythm pattern for storage or transmission
   *
   * @param pattern - The pattern to encode
   */
  encodePattern(pattern: RhythmPattern): GeneratorResult<string> {
    const methodParams = { patternId: pattern.id };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API (if available)
      const encoded = JSON.stringify(pattern);

      return this.createResult(encoded, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.encodePattern failed: ${error}`);
    }
  }

  /**
   * Decode a rhythm pattern from storage/transmission format
   *
   * @param encoding - The encoded pattern data
   */
  decodePattern(encoding: string): GeneratorResult<RhythmPattern> {
    const methodParams = { encodingLength: encoding.length };

    try {
      const pattern = JSON.parse(encoding) as RhythmPattern;

      // Validate pattern structure
      if (!pattern.durations || !Array.isArray(pattern.durations)) {
        throw new Error("Invalid rhythm pattern encoding");
      }

      return this.createResult(pattern, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.decodePattern failed: ${error}`);
    }
  }

  /**
   * Get rhythmic suggestions based on current parameters
   *
   * @param context - Context for suggestions
   */
  getSuggestions(
    context: {
      style?: string;
      complexity?: number;
      timeSignature?: [number, number];
    } = {},
  ): GeneratorResult<string[]> {
    const mergedContext = { ...this.parameters, ...context };
    const methodParams = { context: mergedContext };

    try {
      // Generate suggestions based on current parameters
      const suggestions = [
        `Try generators [3, 2] for a ${mergedContext.style || "contemporary"} feel`,
        `Consider complexity ${mergedContext.complexity || 0.5} for balanced interest`,
        `Use time signature ${mergedContext.timeSignature?.join("/") || "4/4"} for standard phrasing`,
        `Apply swing ${mergedContext.swing || 0} for rhythmic feel`,
      ];

      return this.createResult(suggestions, methodParams);
    } catch (error) {
      throw new Error(`RhythmGenerator.getSuggestions failed: ${error}`);
    }
  }
}
