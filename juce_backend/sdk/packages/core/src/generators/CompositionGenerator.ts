import { BaseGenerator } from './BaseGenerator';
import type {
  Composition,
  Section,
  CompositionAnalysis,
  RhythmPattern,
  ChordProgression,
  MelodyLine,
  GeneratorResult,
  CompositionGeneratorConfig,
  CompositionGeneratorParameters,
  SchillingerSDK,
  SectionType,
} from '../../shared/src/types';

/**
 * Parameters for composition creation
 */
export interface CompositionCreationParams {
  name: string;
  key: string;
  scale: string;
  tempo: number;
  timeSignature: [number, number];
  structure?: string[];
  sections?: Array<{
    type: SectionType;
    length: number;
    description?: string;
  }>;
}

/**
 * Parameters for arrangement generation
 */
export interface ArrangementParams {
  instrumentation: string[];
  style: string;
  density?: 'sparse' | 'medium' | 'dense';
  orchestrationStyle?: 'classical' | 'jazz' | 'contemporary' | 'electronic';
}

/**
 * Parameters for composition analysis
 */
export interface CompositionAnalysisParams {
  includeForm?: boolean;
  includeHarmony?: boolean;
  includeRhythm?: boolean;
  includeMelody?: boolean;
}

/**
 * Parameters for user input encoding
 */
export interface UserInputParams {
  melody: number[];
  rhythm?: number[];
  harmony?: string[];
  context?: {
    key?: string;
    scale?: string;
    tempo?: number;
  };
}

/**
 * CompositionGenerator provides stateful composition creation and analysis capabilities.
 *
 * This generator wraps the functional CompositionAPI while adding:
 * - Parameter persistence between calls
 * - Enhanced metadata tracking
 * - Stateful configuration management
 * - Detailed result provenance
 */
export class CompositionGenerator extends BaseGenerator<
  CompositionGeneratorConfig,
  CompositionGeneratorParameters
> {
  /**
   * Create a new CompositionGenerator instance
   *
   * @param config - Configuration options for the generator
   */
  constructor(config?: CompositionGeneratorConfig) {
    super(
      {
        defaultStructure: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'outro'],
        cacheEnabled: true,
        offlineFallback: true,
        defaultStyle: 'contemporary',
        defaultTempo: 120,
        ...config,
      },
      config?.sdk
    );
  }

  /**
   * Get default configuration for composition generation
   */
  getDefaultConfig(): CompositionGeneratorConfig {
    return {
      defaultStructure: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'outro'],
      cacheEnabled: true,
      offlineFallback: true,
      defaultStyle: 'contemporary',
      defaultTempo: 120,
    };
  }

  /**
   * Get default parameters for composition generation
   */
  getDefaultParameters(): CompositionGeneratorParameters {
    return {
      structure: this.config.defaultStructure || ['verse', 'chorus'],
      style: this.config.defaultStyle || 'contemporary',
      tempo: this.config.defaultTempo || 120,
      key: 'C',
      scale: 'major',
      orchestrationDensity: 'medium',
    };
  }

  /**
   * Create a complete composition
   *
   * @param params - Parameters for composition creation
   */
  create(params: CompositionCreationParams): GeneratorResult<Composition> {
    const mergedParams = this.mergeParameters({
      structure: params.structure,
      style: params.style,
      tempo: params.tempo,
      key: params.key,
      scale: params.scale,
    });

    const methodParams = { ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const composition = sdk.composition.create({
        name: params.name,
        key: mergedParams.key || params.key,
        scale: mergedParams.scale || params.scale,
        tempo: mergedParams.tempo || params.tempo,
        timeSignature: params.timeSignature,
        structure: mergedParams.structure || params.structure,
      });

      // Enhance with generator parameters
      const enhancedComposition: Composition = {
        ...composition,
        metadata: {
          ...composition.metadata,
          style: mergedParams.style,
          structure: mergedParams.structure,
        },
      };

      return this.createResult(enhancedComposition, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.create failed: ${error}`);
    }
  }

  /**
   * Generate an arrangement for a composition
   *
   * @param composition - The composition to arrange
   * @param params - Arrangement parameters
   */
  generateArrangement(
    composition: Composition,
    params: ArrangementParams
  ): GeneratorResult<{
    composition: Composition;
    arrangement: Array<{
      instrument: string;
      section: string;
      role: string;
      notes: number[];
    }>;
  }> {
    const methodParams = {
      compositionId: composition.id,
      ...params
    };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API (if available)
      const arrangement = sdk.composition.generateArrangement(composition, params);

      return this.createResult(arrangement, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.generateArrangement failed: ${error}`);
    }
  }

  /**
   * Analyze a complete composition
   *
   * @param composition - The composition to analyze
   * @param params - Optional analysis parameters
   */
  analyzeComposition(
    composition: Composition,
    params: CompositionAnalysisParams = {}
  ): GeneratorResult<CompositionAnalysis> {
    const methodParams = { compositionId: composition.id, ...params };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const analysis = sdk.composition.analyzeComposition(composition);

      return this.createResult(analysis, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.analyzeComposition failed: ${error}`);
    }
  }

  /**
   * Encode user input (melody + optional rhythm/harmony) into Schillinger parameters
   *
   * @param params - User input parameters
   */
  encodeUserInput(params: UserInputParams): GeneratorResult<{
    rhythmParams: any;
    harmonyParams: any;
    melodyParams: any;
    confidence: number;
  }> {
    const methodParams = {
      melodyLength: params.melody.length,
      rhythmLength: params.rhythm?.length || 0,
      harmonyLength: params.harmony?.length || 0,
      ...params
    };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const encoding = sdk.composition.encodeUserInput(
        params.melody,
        params.rhythm,
        params.harmony
      );

      return this.createResult(encoding, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.encodeUserInput failed: ${error}`);
    }
  }

  /**
   * Decode Schillinger parameters back to musical output
   *
   * @param encoding - The encoded parameters
   * @param context - Decoding context
   */
  decodeEncoding(
    encoding: any,
    context: { key: string; scale: string; tempo?: number }
  ): GeneratorResult<{
    rhythm: RhythmPattern;
    harmony: ChordProgression;
    melody: MelodyLine;
  }> {
    const methodParams = { encoding, ...context };

    try {
      const sdk = this.requireSDK();

      // Delegate to existing functional API
      const decoded = sdk.composition.decodeEncoding(encoding, context);

      return this.createResult(decoded, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.decodeEncoding failed: ${error}`);
    }
  }

  /**
   * Generate a complete section for a composition
   *
   * @param type - The type of section to generate
   * @param context - Context for section generation
   */
  generateSection(
    type: SectionType,
    context: {
      key: string;
      scale: string;
      tempo: number;
      length: number;
      previousSection?: Section;
    }
  ): GeneratorResult<Section> {
    const methodParams = { sectionType: type, ...context };

    try {
      const sdk = this.requireSDK();

      // Generate basic section structure
      const section: Section = {
        type,
        length: context.length,
        position: context.previousSection ? context.previousSection.position + context.previousSection.length : 0,
        rhythm: {
          durations: Array(context.length).fill(1),
          timeSignature: [4, 4],
          tempo: context.tempo,
        },
        harmony: {
          chords: [context.key],
          key: context.key,
          scale: context.scale,
          timeSignature: [4, 4],
        },
        melody: {
          notes: Array(context.length).fill(60), // Default to Middle C
          durations: Array(context.length).fill(1),
          key: context.key,
          scale: context.scale,
        },
      };

      return this.createResult(section, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.generateSection failed: ${error}`);
    }
  }

  /**
   * Get composition suggestions based on current parameters
   *
   * @param context - Context for suggestions
   */
  getSuggestions(context: {
    currentSection?: SectionType;
    style?: string;
    key?: string;
    scale?: string;
    tempo?: number;
  } = {}): GeneratorResult<string[]> {
    const mergedContext = { ...this.parameters, ...context };
    const methodParams = { context: mergedContext };

    try {
      // Generate suggestions based on current parameters
      const suggestions = [
        `Use ${mergedContext.style || 'contemporary'} style for modern compositions`,
        `Consider structure: ${(mergedContext.structure || []).join(' → ')} for balanced form`,
        `Set tempo to ${mergedContext.tempo || 120} BPM for ${mergedContext.tempo && mergedContext.tempo > 120 ? 'energetic' : 'moderate'} feel`,
        mergedContext.currentSection
          ? `After ${mergedContext.currentSection}, consider building contrast or development`
          : 'Start with a strong thematic statement in the opening',
        `Use ${mergedContext.key || 'C'} ${mergedContext.scale || 'major'} for bright, clear tonality`,
        `${mergedContext.orchestrationDensity} orchestration density provides ${mergedContext.orchestrationDensity === 'sparse' ? 'clarity and focus' : mergedContext.orchestrationDensity === 'dense' ? 'richness and complexity' : 'balanced texture'}`,
      ];

      return this.createResult(suggestions, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.getSuggestions failed: ${error}`);
    }
  }

  /**
   * Create a variation of an existing composition
   *
   * @param composition - The base composition
   * @param params - Variation parameters
   */
  createVariation(
    composition: Composition,
    params: {
      type: 'key_change' | 'tempo_change' | 'style_adaptation' | 'structure_variation';
      newKey?: string;
      newTempo?: number;
      newStyle?: string;
      newStructure?: string[];
    }
  ): GeneratorResult<Composition> {
    const methodParams = {
      compositionId: composition.id,
      ...params
    };

    try {
      // Create variation based on type
      let variation: Composition = { ...composition };

      switch (params.type) {
        case 'key_change':
          if (params.newKey) {
            variation.key = params.newKey;
            // Update harmony sections to new key
            variation.sections = variation.sections.map(section => ({
              ...section,
              harmony: {
                ...section.harmony,
                key: params.newKey!,
              },
            }));
          }
          break;

        case 'tempo_change':
          if (params.newTempo) {
            variation.tempo = params.newTempo;
            // Update rhythm sections to new tempo
            variation.sections = variation.sections.map(section => ({
              ...section,
              rhythm: {
                ...section.rhythm,
                tempo: params.newTempo!,
              },
            }));
          }
          break;

        case 'style_adaptation':
          variation.metadata = {
            ...variation.metadata,
            style: params.newStyle || this.parameters.style,
          };
          break;

        case 'structure_variation':
          variation.metadata = {
            ...variation.metadata,
            structure: params.newStructure || this.parameters.structure,
          };
          break;
      }

      // Add variation metadata
      variation.metadata = {
        ...variation.metadata,
        originalCompositionId: composition.id,
        variationType: params.type,
        variationTimestamp: Date.now(),
      };

      return this.createResult(variation, methodParams);
    } catch (error) {
      throw new Error(`CompositionGenerator.createVariation failed: ${error}`);
    }
  }
}