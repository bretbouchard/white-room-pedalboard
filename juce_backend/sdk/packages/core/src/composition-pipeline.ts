/**
 * Composition Pipeline - Master Orchestration Engine
 *
 * This module integrates all Schillinger SDK engines into a complete
 * musical composition workflow, handling everything from initial idea
 * generation to final orchestral score production.
 */

import { Rational } from './rhythm';
import { CounterpointEngine } from './counterpoint';
import { ExpansionOperators } from './expansion';
import { ContourEngine } from './contour';
import { HarmonicExpansionEngine } from './harmonic-expansion';
import { OrchestrationEngine, OrchestrationAPI } from './orchestration';
import { FormEngine, FormAPI, MusicalForm } from './form';

// ===== BASIC TYPES =====

export interface CompositionRequest {
  id: string;
  title: string;
  composer?: string;
  duration: Rational;
  style: {
    era: 'baroque' | 'classical' | 'romantic' | 'modern' | 'contemporary' | 'fusion';
    genre: 'symphony' | 'chamber' | 'solo' | 'ensemble' | 'film' | 'electronic' | 'experimental';
    mood: 'lyrical' | 'dramatic' | 'mysterious' | 'joyful' | 'somber' | 'triumphant' | 'intimate';
    complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  };
  ensemble: {
    type: 'solo' | 'chamber' | 'orchestral' | 'band' | 'electronic' | 'mixed';
    size: 'solo' | 'duo' | 'trio' | 'quartet' | 'quintet' | 'small' | 'medium' | 'large' | 'full';
    instrumentation?: string[];
  };
  structure: {
    formType: 'auto' | 'binary' | 'ternary' | 'sonata' | 'rondo' | 'arch' | 'theme_variations' | 'custom';
    sections?: number;
    repetitions?: boolean;
    developmentIntensity?: number;
  };
  material: {
    themes: ThemeMaterial[];
    motifs: MotifMaterial[];
    harmonicLanguage: 'tonal' | 'modal' | 'atonal' | 'polytonal' | 'serial';
    keyCenter?: string;
    rhythmicCharacter: 'regular' | 'irregular' | 'complex' | 'minimal' | 'drive';
  };
  constraints: {
    technicalDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'professional' | 'virtuosic';
    instrumentalRanges: 'comfortable' | 'extended' | 'extreme';
    orchestrationDensity: 'sparse' | 'moderate' | 'dense' | 'very_dense';
    dynamicRange: 'limited' | 'moderate' | 'wide' | 'extreme';
  };
  objectives: {
    primaryGoal: 'educational' | 'performance' | 'recording' | 'film_sync' | 'artistic_exploration';
    targetAudience: 'general' | 'musicians' | 'connoisseurs' | 'students' | 'children';
    emotionalImpact: 'subtle' | 'moderate' | 'powerful' | 'overwhelming';
  };
}

export interface ThemeMaterial {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'transitional' | 'developmental';
  melodic: {
    contour: 'ascending' | 'descending' | 'arch' | 'wave' | 'static';
    intervals: number[];
    range: number;
    register: 'high' | 'medium' | 'low' | 'wide';
    character: 'lyrical' | 'dramatic' | 'playful' | 'mysterious' | 'heroic';
  };
  rhythmic: {
    meter: string;
    tempo: { min: number; max: number; preferred: number };
    pattern: number[];
    subdivision: string;
    articulation: string[];
  };
  harmonic: {
    chordTypes: string[];
    progression: string[];
    modulationPoints: number[];
    tension: 'low' | 'moderate' | 'high';
  };
}

export interface MotifMaterial {
  id: string;
  name: string;
  melodicFragment: number[];
  rhythmicPattern: number[];
  harmonicFunction: string;
  transformations: string[];
}

export interface CompositionProject {
  id: string;
  request: CompositionRequest;
  form: MusicalForm;
  sections: CompositionSection[];
  orchestration: OrchestrationPlan;
  analysis: CompositionAnalysis;
  metadata: ProjectMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompositionSection {
  id: string;
  name: string;
  formSectionId: string;
  start: Rational;
  end: Rational;
  duration: Rational;
  character: SectionCharacter;
  material: SectionMaterial;
  orchestration: SectionOrchestration;
  development: SectionDevelopment;
  techniques: AppliedTechnique[];
}

export interface SectionCharacter {
  energy: number;           // 0-1, overall energy level
  intensity: number;        // 0-1, dynamic intensity
  complexity: number;       // 0-1, textural complexity
  stability: number;        // 0-1, harmonic stability
  momentum: number;         // 0-1, forward motion
  emotional: 'calm' | 'tense' | 'excited' | 'mysterious' | 'triumphant' | 'somber';
}

export interface SectionMaterial {
  themes: string[];         // Theme IDs used in this section
  motifs: string[];         // Motif IDs used
  harmonic: {
    progression: string[];
    key: string;
    modulations: Modulation[];
    cadences: Cadence[];
  };
  melodic: {
    primaryLine: number[];
    secondaryLines: number[][];
    counterpoint: CounterpointLine[];
    contours: ContourLine[];
  };
  rhythmic: {
    primaryPattern: number[];
    secondaryPatterns: number[][];
    tempoChanges: TempoChange[];
    meterChanges: MeterChange[];
  };
}

export interface Modulation {
  from: string;
  to: string;
  at: Rational;
  type: 'direct' | 'common_chord' | 'chromatic' | 'enharmonic' | 'phrygian';
  preparation: Rational;
}

export interface Cadence {
  at: Rational;
  type: 'perfect' | 'imperfect' | 'plagal' | 'deceptive' | 'half';
  strength: number;        // 0-1, harmonic resolution strength
}

export interface CounterpointLine {
  id: string;
  notes: number[];
  relationship: 'parallel' | 'contrary' | 'oblique' | 'similar';
  species: 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'florid';
  intervalAnalysis: IntervalAnalysis[];
}

export interface ContourLine {
  id: string;
  type: 'linear' | 'bell_curve' | 'sinusoidal' | 'exponential' | 'custom';
  parameters: Record<string, any>;
  points: Array<{ x: number; y: number; velocity: number; duration: number }>;
  analysis: {
    overallShape: string;
    symmetry: number;
    complexity: number;
    elegance: number;
  };
}

export interface IntervalAnalysis {
  interval: number;
  quality: 'consonant' | 'dissonant' | 'perfect';
  direction: 'up' | 'down' | 'unison';
  tension: number;
}

export interface TempoChange {
  at: Rational;
  tempo: number;
  type: 'abrupt' | 'gradual' | 'ramp' | 'accelerando' | 'ritardando';
  duration?: Rational;
}

export interface MeterChange {
  at: Rational;
  from: string;
  to: string;
  transition: 'abrupt' | 'gradual' | 'metric_modulation';
}

export interface SectionOrchestration {
  instrumentation: InstrumentalGroup[];
  textures: TextureLayer[];
  balance: BalanceAnalysis;
  dynamics: DynamicPlan;
  articulation: ArticulationPlan;
}

export interface InstrumentalGroup {
  section: string;
  instruments: string[];
  register: 'pedal' | 'bass' | 'tenor' | 'alto' | 'treble' | 'extreme';
  role: 'primary' | 'secondary' | 'background' | 'support';
  weight: number;          // 0-1, prominence in texture
}

export interface TextureLayer {
  instrumentId: string;
  density: number;          // notes per beat
  range: number;            // interval span
  register: string;
  blendMode: 'linear' | 'exponential' | 'logarithmic';
  role: 'melody' | 'harmony' | 'rhythm' | 'color';
}

export interface BalanceAnalysis {
  strings: number;
  woodwinds: number;
  brass: number;
  percussion: number;
  recommendations: string[];
}

export interface DynamicPlan {
  overall: { min: number; max: number; shape: string };
  sections: Array<{ start: Rational; end: Rational; level: number }>;
  transitions: Array<{ at: Rational; type: string; curve: string }>;
}

export interface ArticulationPlan {
  primary: string[];        // Main articulation types
  secondary: string[];      // Secondary articulation types
  variations: Array<{ at: Rational; type: string; duration: Rational }>;
}

export interface SectionDevelopment {
  techniques: DevelopmentTechnique[];
  expansions: ExpansionResult[];
  transformations: TransformationResult[];
  elaborations: ElaborationResult[];
}

export interface DevelopmentTechnique {
  type: 'sequence' | 'imitation' | 'inversion' | 'retrograde' | 'augmentation' | 'diminution' | 'fragmentation';
  material: string;         // Theme or motif ID
  at: Rational;
  parameters: Record<string, any>;
  result: string;           // Generated material ID
}

export interface ExpansionResult {
  originalId: string;
  expandedId: string;
  type: 'horizontal' | 'vertical' | 'diagonal';
  factor: number;
  quality: number;          // 0-1, musical quality
}

export interface TransformationResult {
  originalId: string;
  transformedId: string;
  type: 'inversion' | 'retrograde' | 'augmentation' | 'diminution' | 'transposition';
  parameters: Record<string, any>;
  relationship: string;
}

export interface ElaborationResult {
  baseId: string;
  elaboratedId: string;
  type: 'ornamentation' | 'embellishment' | 'variation' | 'development';
  complexity: number;       // 0-1
  density: number;          // Notes per unit time
}

export interface AppliedTechnique {
  engine: 'counterpoint' | 'expansion' | 'contour' | 'harmonic' | 'orchestration' | 'form';
  operation: string;
  parameters: Record<string, any>;
  result: string;
  timestamp: Rational;
  confidence: number;       // 0-1, quality of result
}

export interface OrchestrationPlan {
  overall: {
    ensemble: string[];
    size: string;
    balance: BalanceAnalysis;
  };
  sections: Array<{
    sectionId: string;
    orchestration: SectionOrchestration;
    transitions: TransitionPlan[];
  }];
  instrumentation: InstrumentationMap;
  dynamics: GlobalDynamicPlan;
  texture: TextureEvolution;
}

export interface TransitionPlan {
  from: string;
  to: string;
  type: 'direct' | 'crossfade' | 'overlap' | 'gap' | 'bridge';
  duration: Rational;
  techniques: string[];
}

export interface InstrumentationMap {
  sections: Record<string, string[]>;
  solos: Array<{ instrument: string; at: Rational; duration: Rational }>;
  doubling: Array<{ primary: string; secondary: string; section: string }>;
  special: Array<{ instrument: string; role: string; sections: string[] }>;
}

export interface GlobalDynamicPlan {
  overall: { min: number; max: number; range: number };
  arcs: Array<{ start: Rational; peak: Rational; end: Rational; type: string }>;
  highlights: Array<{ at: Rational; intensity: number; duration: Rational }>;
  balancing: Array<{ section: string; adjustment: number }>;
}

export interface TextureEvolution {
  layers: Array<{ instrument: string; density: number; complexity: number }>;
  evolution: Array<{ at: Rational; change: string; target: Record<string, any> }>;
  climaxes: Array<{ at: Rational; instruments: string[]; intensity: number }>;
}

export interface CompositionAnalysis {
  structural: StructuralAnalysis;
  technical: TechnicalAnalysis;
  artistic: ArtisticAnalysis;
  performance: PerformanceAnalysis;
  recommendations: Recommendation[];
}

export interface StructuralAnalysis {
  formAnalysis: any;        // Form analysis result
  thematicCohesion: number;  // 0-1, how well themes are integrated
  narrative: string[];       // Story progression description
  balance: number;          // 0-1, formal balance
  innovation: number;        // 0-1, structural innovation
}

export interface TechnicalAnalysis {
  difficulty: number;       // 0-1, overall difficulty
  instrumentalChallenges: string[];
  rhythmicComplexity: number; // 0-1
  harmonicComplexity: number; // 0-1
  contrapuntalDensity: number; // 0-1
  orchestrationChallenges: string[];
}

export interface ArtisticAnalysis {
  originality: number;      // 0-1, creative originality
  emotionalImpact: number;  // 0-1, emotional power
  coherence: number;        // 0-1, artistic coherence
  expression: string[];     // Artistic elements
  innovation: string[];     // Innovative techniques
}

export interface PerformanceAnalysis {
  duration: Rational;
  technicalRequirements: string[];
  rehearsalTime: number;    // Estimated hours
  performerSkills: Record<string, number>;
  audienceAppeal: number;   // 0-1, potential audience appeal
  memorability: number;     // 0-1, how memorable
}

export interface Recommendation {
  category: 'structural' | 'technical' | 'artistic' | 'practical';
  priority: 'critical' | 'important' | 'helpful' | 'optional';
  description: string;
  suggestion: string;
  impact: number;           // 0-1, potential improvement
  effort: number;           // 0-1, implementation effort
}

export interface ProjectMetadata {
  tags: string[];
  version: string;
  status: 'planning' | 'in_progress' | 'draft' | 'complete' | 'revised';
  statistics: {
    sections: number;
    instruments: number;
    techniques: number;
    duration: Rational;
    complexity: number;
  };
  history: Array<{
    timestamp: Date;
    action: string;
    details: string;
  }>;
}

export interface PipelineOptions {
  verbose?: boolean;
  saveIntermediates?: boolean;
  validateResults?: boolean;
  generateMidi?: boolean;
  generateScore?: boolean;
  optimizeFor?: 'speed' | 'quality' | 'balance';
}

export interface PipelineResult {
  project: CompositionProject;
  stages: PipelineStage[];
  success: boolean;
  errors: string[];
  warnings: string[];
  timing: {
    total: number;
    stages: Record<string, number>;
  };
  statistics: {
    techniques: number;
    materials: number;
    operations: number;
  };
}

export interface PipelineStage {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  input: any;
  output: any;
  metadata: Record<string, any>;
}

// ===== CORE COMPOSITION PIPELINE =====

export class CompositionPipeline {
  private static readonly DEFAULT_OPTIONS: PipelineOptions = {
    verbose: false,
    saveIntermediates: false,
    validateResults: true,
    generateMidi: false,
    generateScore: false,
    optimizeFor: 'quality'
  };

  /**
   * Execute complete composition pipeline
   */
  static async execute(
    request: CompositionRequest,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const startTime = performance.now();
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const stages: PipelineStage[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (mergedOptions.verbose) {
        console.log(`🎵 Starting Composition Pipeline: ${request.title}`);
        console.log(`📋 Duration: ${request.duration.toString()}`);
        console.log(`🎭 Style: ${request.style.era} ${request.style.genre}`);
        console.log(`👥 Ensemble: ${request.ensemble.type} ${request.ensemble.size}`);
      }

      // Stage 1: Material Generation
      const materialResult = await this.executeStage(
        'Material Generation',
        () => this.generateMaterials(request),
        stages,
        mergedOptions
      );

      // Stage 2: Form Design
      const formResult = await this.executeStage(
        'Form Design',
        () => this.designForm(request, materialResult.output),
        stages,
        mergedOptions
      );

      // Stage 3: Section Development
      const sectionsResult = await this.executeStage(
        'Section Development',
        () => this.developSections(formResult.output, materialResult.output, request),
        stages,
        mergedOptions
      );

      // Stage 4: Counterpoint Application
      const counterpointResult = await this.executeStage(
        'Counterpoint Application',
        () => this.applyCounterpoint(sectionsResult.output, request),
        stages,
        mergedOptions
      );

      // Stage 5: Harmonic Expansion
      const harmonicResult = await this.executeStage(
        'Harmonic Expansion',
        () => this.applyHarmonicExpansion(counterpointResult.output, request),
        stages,
        mergedOptions
      );

      // Stage 6: Contour Development
      const contourResult = await this.executeStage(
        'Contour Development',
        () => this.applyContourDevelopment(harmonicResult.output, request),
        stages,
        mergedOptions
      );

      // Stage 7: Orchestration
      const orchestrationResult = await this.executeStage(
        'Orchestration',
        () => this.applyOrchestration(contourResult.output, request),
        stages,
        mergedOptions
      );

      // Stage 8: Analysis and Refinement
      const analysisResult = await this.executeStage(
        'Analysis and Refinement',
        () => this.analyzeAndRefine(orchestrationResult.output, request),
        stages,
        mergedOptions
      );

      // Assemble final project
      const project = this.assembleProject(
        request,
        materialResult.output,
        formResult.output,
        sectionsResult.output,
        orchestrationResult.output,
        analysisResult.output
      );

      const totalTime = performance.now() - startTime;
      const timing = {
        total: totalTime,
        stages: stages.reduce((acc, stage) => {
          acc[stage.name] = stage.duration || 0;
          return acc;
        }, {} as Record<string, number>)
      };

      const statistics = this.calculateStatistics(project);

      if (mergedOptions.verbose) {
        console.log(`✅ Composition completed in ${totalTime.toFixed(2)}ms`);
        console.log(`📊 Generated ${statistics.techniques} techniques`);
        console.log(`🎼 ${statistics.materials} musical materials`);
        console.log(`⚡ ${statistics.operations} total operations`);
      }

      return {
        project,
        stages,
        success: true,
        errors,
        warnings,
        timing,
        statistics
      };

    } catch (error) {
      const totalTime = performance.now() - startTime;
      errors.push(error instanceof Error ? error.message : 'Unknown error');

      return {
        project: {} as CompositionProject,
        stages,
        success: false,
        errors,
        warnings,
        timing: {
          total: totalTime,
          stages: {}
        },
        statistics: {
          techniques: 0,
          materials: 0,
          operations: 0
        }
      };
    }
  }

  /**
   * Quick composition with simplified workflow
   */
  static async quickCompose(
    themes: number[][],
    duration: Rational,
    style: 'classical' | 'modern' | 'film',
    ensemble: 'string_quartet' | 'orchestra' | 'chamber' = 'orchestra'
  ): Promise<PipelineResult> {
    const request: CompositionRequest = {
      id: this.generateId(),
      title: 'Quick Composition',
      duration,
      style: {
        era: style === 'classical' ? 'classical' : style === 'modern' ? 'contemporary' : 'modern',
        genre: 'ensemble',
        mood: 'lyrical',
        complexity: 'moderate'
      },
      ensemble: {
        type: ensemble === 'string_quartet' ? 'chamber' : ensemble === 'orchestra' ? 'orchestral' : 'chamber',
        size: ensemble === 'string_quartet' ? 'quartet' : ensemble === 'orchestra' ? 'full' : 'medium'
      },
      structure: {
        formType: 'auto'
      },
      material: {
        themes: themes.map((melody, index) => ({
          id: `theme_${index}`,
          name: `Theme ${index + 1}`,
          type: index === 0 ? 'primary' : 'secondary',
          melodic: {
            contour: 'ascending',
            intervals: this.extractIntervals(melody),
            range: Math.max(...melody) - Math.min(...melody),
            register: 'medium',
            character: 'lyrical'
          },
          rhythmic: {
            meter: '4/4',
            tempo: { min: 60, max: 120, preferred: 90 },
            pattern: [1, 1, 1, 1],
            subdivision: 'eighth',
            articulation: ['legato']
          },
          harmonic: {
            chordTypes: ['major', 'minor'],
            progression: ['I', 'IV', 'V', 'I'],
            modulationPoints: [themes[0].length / 2],
            tension: 'moderate'
          }
        })),
        motifs: [],
        harmonicLanguage: 'tonal',
        keyCenter: 'C',
        rhythmicCharacter: 'regular'
      },
      constraints: {
        technicalDifficulty: 'intermediate',
        instrumentalRanges: 'comfortable',
        orchestrationDensity: 'moderate',
        dynamicRange: 'moderate'
      },
      objectives: {
        primaryGoal: 'performance',
        targetAudience: 'general',
        emotionalImpact: 'moderate'
      }
    };

    return this.execute(request, { optimizeFor: 'speed' });
  }

  /**
   * Generate variations on existing composition
   */
  static async generateVariations(
    project: CompositionProject,
    variationType: 'structural' | 'thematic' | 'harmonic' | 'orchestral' | 'combined',
    count: number = 3
  ): Promise<PipelineResult[]> {
    const variations: PipelineResult[] = [];

    for (let i = 0; i < count; i++) {
      const variationRequest: CompositionRequest = {
        ...project.request,
        id: `${project.id}_variation_${i}`,
        title: `${project.request.title} - Variation ${i + 1}`,
        structure: {
          ...project.request.structure,
          formType: variationType === 'structural' ? 'custom' : project.request.structure.formType
        }
      };

      // Apply variation-specific transformations
      if (variationType === 'thematic') {
        variationRequest.material = {
          ...project.request.material,
          themes: this.transformThemes(project.request.material.themes, i)
        };
      } else if (variationType === 'harmonic') {
        variationRequest.material = {
          ...project.request.material,
          harmonicLanguage: i % 2 === 0 ? 'modal' : 'chromatic'
        };
      } else if (variationType === 'orchestral') {
        variationRequest.ensemble = {
          ...project.request.ensemble,
          instrumentation: this.varyInstrumentation(project.request.ensemble.instrumentation || [], i)
        };
      }

      const result = await this.execute(variationRequest, { optimizeFor: 'speed' });
      variations.push(result);
    }

    return variations;
  }

  /**
   * Analyze existing composition
   */
  static analyzeComposition(
    project: CompositionProject
  ): CompositionAnalysis {
    // Perform structural analysis
    const structuralAnalysis = this.performStructuralAnalysis(project);

    // Perform technical analysis
    const technicalAnalysis = this.performTechnicalAnalysis(project);

    // Perform artistic analysis
    const artisticAnalysis = this.performArtisticAnalysis(project);

    // Perform performance analysis
    const performanceAnalysis = this.performPerformanceAnalysis(project);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      structuralAnalysis,
      technicalAnalysis,
      artisticAnalysis,
      performanceAnalysis
    );

    return {
      structural: structuralAnalysis,
      technical: technicalAnalysis,
      artistic: artisticAnalysis,
      performance: performanceAnalysis,
      recommendations
    };
  }

  // ===== PRIVATE PIPELINE STAGE METHODS =====

  private static async executeStage<T>(
    stageName: string,
    operation: () => Promise<T> | T,
    stages: PipelineStage[],
    options: PipelineOptions
  ): Promise<{ output: T; duration: number }> {
    const stage: PipelineStage = {
      name: stageName,
      status: 'in_progress',
      startTime: performance.now(),
      input: null,
      output: null,
      metadata: {}
    };

    stages.push(stage);

    try {
      const startTime = performance.now();
      const result = await operation();
      const duration = performance.now() - startTime;

      stage.status = 'completed';
      stage.endTime = performance.now();
      stage.duration = duration;
      stage.output = result;

      if (options.verbose) {
        console.log(`✅ ${stageName}: ${duration.toFixed(2)}ms`);
      }

      return { output: result, duration };
    } catch (error) {
      stage.status = 'failed';
      stage.endTime = performance.now();
      stage.duration = performance.now() - (stage.startTime || performance.now());

      if (options.verbose) {
        console.log(`❌ ${stageName}: Failed`);
        console.error(error);
      }

      throw error;
    }
  }

  private static async generateMaterials(request: CompositionRequest): Promise<any> {
    // Enhance themes with additional analysis
    const enhancedThemes = request.material.themes.map(theme => ({
      ...theme,
      analysis: {
        contourAnalysis: ContourEngine.analyzeContour(
          theme.melodic.intervals.map((interval, index) => ({
            x: index,
            y: index === 0 ? 0 : theme.melodic.intervals.slice(0, index + 1).reduce((sum, i) => sum + i, 0),
            velocity: 80,
            duration: 1
          })),
          { length: theme.melodic.intervals.length, complexity: 'moderate' }
        ),
        harmonicPotential: this.calculateHarmonicPotential(theme),
        developmentalPossibilities: this.identifyDevelopmentalPossibilities(theme)
      }
    }));

    // Generate motifs from themes
    const motifs = this.generateMotifs(enhancedThemes);

    return {
      themes: enhancedThemes,
      motifs,
      harmonicLanguage: request.material.harmonicLanguage,
      rhythmicCharacter: request.material.rhythmicCharacter
    };
  }

  private static async designForm(request: CompositionRequest, materials: any): Promise<any> {
    const themeNames = materials.themes.map((t: any) => t.id);

    // Use FormAPI to generate optimal form
    const formResult = FormAPI.generateOptimalForm(
      themeNames,
      request.duration,
      {
        complexity: request.style.complexity,
        style: request.style.era,
        emotionalShape: this.mapMoodToEmotionalShape(request.style.mood)
      }
    );

    // Customize form based on request structure
    if (request.structure.formType !== 'auto' && request.structure.formType !== 'custom') {
      const specificForm = FormEngine.generateForm(
        request.structure.formType,
        {
          duration: request.duration,
          complexity: request.style.complexity,
          developmentalIntensity: request.structure.developmentIntensity || 0.5
        },
        themeNames
      );

      return {
        primary: specificForm,
        alternatives: formResult.alternatives,
        analysis: FormEngine.analyzeForm(specificForm)
      };
    }

    return formResult;
  }

  private static async developSections(
    form: any,
    materials: any,
    request: CompositionRequest
  ): Promise<CompositionSection[]> {
    const sections: CompositionSection[] = [];
    let currentTime = new Rational(0, 1);

    form.primary.sections.forEach((formSection: any, index: number) => {
      const section: CompositionSection = {
        id: `section_${index}`,
        name: formSection.name,
        formSectionId: formSection.id,
        start: currentTime,
        end: currentTime.add(formSection.duration),
        duration: formSection.duration,
        character: this.generateSectionCharacter(formSection, request),
        material: {
          themes: this.selectThemesForSection(formSection, materials.themes),
          motifs: [],
          harmonic: {
            progression: this.generateHarmonicProgression(formSection, request),
            key: formSection.structure.harmonicGoal || 'C',
            modulations: [],
            cadences: []
          },
          melodic: {
            primaryLine: [],
            secondaryLines: [],
            counterpoint: [],
            contours: []
          },
          rhythmic: {
            primaryPattern: this.generateRhythmicPattern(formSection, request),
            secondaryPatterns: [],
            tempoChanges: [],
            meterChanges: []
          }
        },
        orchestration: {
          instrumentation: [],
          textures: [],
          balance: { strings: 0, woodwinds: 0, brass: 0, percussion: 0, recommendations: [] },
          dynamics: { overall: { min: 60, max: 100, shape: 'arc' }, sections: [], transitions: [] },
          articulation: { primary: ['legato'], secondary: [], variations: [] }
        },
        development: {
          techniques: [],
          expansions: [],
          transformations: [],
          elaborations: []
        },
        techniques: []
      };

      sections.push(section);
      currentTime = currentTime.add(formSection.duration);
    });

    return sections;
  }

  private static async applyCounterpoint(
    sections: CompositionSection[],
    request: CompositionRequest
  ): Promise<CompositionSection[]> {
    return sections.map(section => {
      // Apply counterpoint to sections with multiple melodic lines
      if (section.material.themes.length > 1 || request.style.complexity !== 'simple') {
        const counterpointResult = CounterpointEngine.generateSpeciesCounterpoint(
          section.material.harmonic.progression.map(() => 60), // Simplified
          section.material.themes.length,
          'third', // Use third species for moderate complexity
          {
            harmonicRhythm: [4, 4, 4, 4],
            dissonanceTreatment: 'prepared',
            voiceRanges: [
              { min: 60, max: 80 },
              { min: 48, max: 72 },
              { min: 36, max: 60 }
            ]
          }
        );

        // Apply counterpoint results to section
        section.material.melodic.counterpoint = counterpointResult.voices.map((voice, index) => ({
          id: `counterpoint_${index}`,
          notes: voice.notes,
          relationship: 'contrary',
          species: 'third',
          intervalAnalysis: []
        }));
      }

      return section;
    });
  }

  private static async applyHarmonicExpansion(
    sections: CompositionSection[],
    request: CompositionRequest
  ): Promise<CompositionSection[]> {
    return sections.map(section => {
      // Apply harmonic expansion based on section type and complexity
      if (section.name.includes('Development') || request.style.complexity === 'complex') {
        const harmony = section.material.harmonic.progression.map(() => 60); // Simplified

        const expansionResult = HarmonicExpansionEngine.expandHarmony(
          harmony,
          {
            type: 'parallel',
            scaleType: 'major',
            rootMovement: 'step',
            voiceLeading: 'smooth',
            expansionFactor: 2
          }
        );

        // Apply expansion results
        section.development.expansions.push({
          originalId: 'original',
          expandedId: 'expanded',
          type: 'horizontal',
          factor: 2,
          quality: expansionResult.quality || 0.8
        });

        // Add transformation techniques
        section.development.techniques.push({
          type: 'sequence',
          material: section.material.themes[0] || 'primary',
          at: section.start,
          parameters: { intervals: [2, 2, 3], pattern: 'ascending' },
          result: 'sequence_result'
        });
      }

      return section;
    });
  }

  private static async applyContourDevelopment(
    sections: CompositionSection[],
    request: CompositionRequest
  ): Promise<CompositionSection[]> {
    return sections.map(section => {
      // Generate contour lines based on section character
      const contourType = this.selectContourType(section.character);
      const contourResult = ContourEngine.generateContour(
        contourType,
        {
          length: section.duration.toNumber(),
          range: { min: 40, max: 80 },
          style: 'smooth',
          complexity: request.style.complexity === 'simple' ? 'simple' : 'moderate'
        }
      );

      section.material.melodic.contours.push({
        id: `contour_${section.id}`,
        type: contourType,
        parameters: {},
        points: contourResult.points,
        analysis: {
          overallShape: contourResult.overallShape,
          symmetry: contourResult.symmetry,
          complexity: contourResult.complexity,
          elegance: contourResult.elegance
        }
      });

      // Add technique record
      section.techniques.push({
        engine: 'contour',
        operation: 'generateContour',
        parameters: { type: contourType },
        result: `contour_${section.id}`,
        timestamp: section.start,
        confidence: contourResult.elegance
      });

      return section;
    });
  }

  private static async applyOrchestration(
    sections: CompositionSection[],
    request: CompositionRequest
  ): Promise<OrchestrationPlan> {
    // Determine ensemble instrumentation
    const instruments = this.selectInstrumentsForEnsemble(request);

    // Generate orchestration plan using OrchestrationAPI
    const orchestrationPlan: OrchestrationPlan = {
      overall: {
        ensemble: instruments,
        size: request.ensemble.size,
        balance: { strings: 0, woodwinds: 0, brass: 0, percussion: 0, recommendations: [] }
      },
      sections: [],
      instrumentation: {
        sections: {},
        solos: [],
        doubling: [],
        special: []
      },
      dynamics: {
        overall: { min: 40, max: 120, range: 80 },
        arcs: [],
        highlights: [],
        balancing: []
      },
      texture: {
        layers: [],
        evolution: [],
        climaxes: []
      }
    };

    // Orchestrate each section
    sections.forEach((section, index) => {
      const sectionOrchestration = OrchestrationEngine.createOrchestralTexture(
        section.material.harmonic.progression.map(() => 60), // Simplified harmony
        instruments.slice(0, 4 + Math.floor(index / 2)), // Vary instrumentation
        {
          maxSimultaneousNotes: 8,
          minVoiceSeparation: 2,
          registerDistribution: {
            pedal: { min: 0, max: 1 },
            bass: { min: 1, max: 2 },
            tenor: { min: 1, max: 2 },
            alto: { min: 1, max: 2 },
            treble: { min: 1, max: 2 },
            extreme: { min: 0, max: 1 }
          },
          balanceConstraints: {
            strings: { min: 0, max: 1 },
            woodwinds: { min: 0, max: 1 },
            brass: { min: 0, max: 1 },
            percussion: { min: 0, max: 1 }
          },
          dynamicConstraints: {
            overall: { min: 20, max: 100 },
            sections: {}
          }
        }
      );

      orchestrationPlan.sections.push({
        sectionId: section.id,
        orchestration: {
          instrumentation: sectionOrchestration.layers.map(layer => ({
            section: this.getInstrumentSection(layer.instrumentId),
            instruments: [layer.instrumentId],
            register: layer.register as any,
            role: layer.role as any,
            weight: layer.weight
          })),
          textures: sectionOrchestration.layers,
          balance: sectionOrchestration.balance,
          dynamics: {
            overall: { min: 60, max: 100, shape: 'arc' },
            sections: [],
            transitions: []
          },
          articulation: { primary: ['legato'], secondary: [], variations: [] }
        },
        transitions: []
      });

      // Update section orchestration
      section.orchestration = sectionOrchestration;
    });

    return orchestrationPlan;
  }

  private static async analyzeAndRefine(
    project: any,
    request: CompositionRequest
  ): Promise<CompositionAnalysis> {
    // Perform comprehensive analysis
    const analysis = this.analyzeComposition(project);

    // Apply refinements based on analysis
    if (analysis.recommendations.length > 0) {
      const criticalRecommendations = analysis.recommendations.filter(r => r.priority === 'critical');

      criticalRecommendations.forEach(rec => {
        if (rec.category === 'technical' && rec.suggestion.includes('balance')) {
          // Adjust orchestration balance
          project.orchestration.balance = this.improveBalance(project.orchestration.balance);
        }
      });
    }

    return analysis;
  }

  private static assembleProject(
    request: CompositionRequest,
    materials: any,
    form: any,
    sections: CompositionSection[],
    orchestration: OrchestrationPlan,
    analysis: CompositionAnalysis
  ): CompositionProject {
    return {
      id: request.id,
      request,
      form: form.primary,
      sections,
      orchestration,
      analysis,
      metadata: {
        tags: this.generateTags(request),
        version: '1.0.0',
        status: 'complete',
        statistics: {
          sections: sections.length,
          instruments: orchestration.overall.ensemble.length,
          techniques: sections.reduce((sum, s) => sum + s.techniques.length, 0),
          duration: request.duration,
          complexity: this.calculateComplexity(request)
        },
        history: [{
          timestamp: new Date(),
          action: 'composition_completed',
          details: 'Generated via CompositionPipeline'
        }]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // ===== UTILITY METHODS =====

  private static generateId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static extractIntervals(melody: number[]): number[] {
    if (melody.length < 2) return [];
    return melody.slice(1).map((note, index) => note - melody[index]);
  }

  private static transformThemes(themes: ThemeMaterial[], variationIndex: number): ThemeMaterial[] {
    return themes.map(theme => ({
      ...theme,
      melodic: {
        ...theme.melodic,
        contour: variationIndex % 2 === 0 ? 'descending' : theme.melodic.contour
      }
    }));
  }

  private static varyInstrumentation(baseInstruments: string[], variationIndex: number): string[] {
    // Simple variation logic - in practice would be more sophisticated
    const variations = [
      ['violin', 'viola', 'cello', 'flute'],
      ['violin', 'viola', 'cello', 'oboe', 'clarinet'],
      ['violin', 'viola', 'cello', 'bassoon', 'horn']
    ];
    return variations[variationIndex % variations.length];
  }

  private static calculateHarmonicPotential(theme: ThemeMaterial): number {
    // Simple calculation based on intervals
    const intervals = theme.melodic.intervals;
    const perfectIntervals = intervals.filter(i => [0, 4, 5, 7, 11].includes(Math.abs(i) % 12));
    return perfectIntervals.length / Math.max(1, intervals.length);
  }

  private static identifyDevelopmentalPossibilities(theme: ThemeMaterial): string[] {
    const possibilities = [];
    if (theme.melodic.range > 12) possibilities.push('range_expansion');
    if (theme.melodic.intervals.length > 4) possibilities.push('fragmentation');
    possibilities.push('inversion', 'retrograde', 'augmentation');
    return possibilities;
  }

  private static generateMotifs(themes: ThemeMaterial[]): MotifMaterial[] {
    return themes.map((theme, index) => ({
      id: `motif_${index}`,
      name: `${theme.name} Motif`,
      melodicFragment: theme.melodic.intervals.slice(0, 4),
      rhythmicPattern: theme.rhythmic.pattern.slice(0, 4),
      harmonicFunction: 'tonic',
      transformations: ['inversion', 'retrograde']
    }));
  }

  private static generateSectionCharacter(formSection: any, request: CompositionRequest): SectionCharacter {
    const baseCharacter = {
      energy: 0.5,
      intensity: 0.5,
      complexity: 0.5,
      stability: 0.5,
      momentum: 0.5,
      emotional: 'calm' as const
    };

    // Adjust based on form section type
    switch (formSection.type) {
      case 'exposition':
        baseCharacter.stability += 0.3;
        baseCharacter.energy += 0.1;
        break;
      case 'development':
        baseCharacter.complexity += 0.4;
        baseCharacter.momentum += 0.4;
        baseCharacter.stability -= 0.3;
        break;
      case 'recapitulation':
        baseCharacter.stability += 0.4;
        baseCharacter.intensity += 0.2;
        break;
    }

    // Apply style adjustments
    if (request.style.complexity === 'complex') {
      baseCharacter.complexity += 0.2;
    }

    // Apply mood adjustments
    switch (request.style.mood) {
      case 'dramatic':
        baseCharacter.intensity += 0.3;
        baseCharacter.energy += 0.2;
        break;
      case 'somber':
        baseCharacter.intensity -= 0.2;
        baseCharacter.energy -= 0.1;
        break;
      case 'joyful':
        baseCharacter.energy += 0.3;
        baseCharacter.intensity += 0.1;
        break;
    }

    return baseCharacter;
  }

  private static selectThemesForSection(formSection: any, themes: any[]): string[] {
    // Select appropriate themes for each form section
    if (formSection.type === 'exposition') {
      return themes.filter((t: any) => t.type === 'primary' || t.type === 'secondary').map((t: any) => t.id);
    } else if (formSection.type === 'development') {
      return themes.map((t: any) => t.id);
    } else {
      return themes.filter((t: any) => t.type === 'primary').map((t: any) => t.id);
    }
  }

  private static generateHarmonicProgression(formSection: any, request: CompositionRequest): string[] {
    const progressions = {
      major: ['I', 'IV', 'V', 'I'],
      minor: ['i', 'iv', 'V', 'i'],
      modal: ['I', 'IV', 'VII', 'I']
    };

    const key = 'C';
    const progression = progressions[request.material.harmonicLanguage === 'tonal' ? 'major' : 'modal'];

    return progression.map(roman => `${roman}/${key}`);
  }

  private static generateRhythmicPattern(formSection: any, request: CompositionRequest): number[] {
    const patterns = {
      regular: [1, 1, 1, 1],
      complex: [1, 2, 1, 3],
      minimal: [1, 1, 1, 1],
      drive: [1, 2, 1, 2]
    };

    return patterns[request.material.rhythmicCharacter] || patterns.regular;
  }

  private static selectContourType(character: SectionCharacter): any {
    const types = ['linear', 'bell_curve', 'sinusoidal', 'exponential'];

    if (character.momentum > 0.7) {
      return 'exponential';
    } else if (character.stability > 0.7) {
      return 'bell_curve';
    } else if (character.energy > 0.6) {
      return 'sinusoidal';
    } else {
      return 'linear';
    }
  }

  private static selectInstrumentsForEnsemble(request: CompositionRequest): string[] {
    const instrumentSets = {
      string_quartet: ['violin', 'viola', 'cello', 'bass'],
      chamber: ['violin', 'viola', 'cello', 'flute', 'oboe', 'horn'],
      orchestral: [
        'violin', 'viola', 'cello', 'bass',
        'flute', 'oboe', 'clarinet', 'bassoon',
        'horn', 'trumpet', 'trombone'
      ],
      solo: ['piano']
    };

    const key = `${request.ensemble.type}_${request.ensemble.size}`;
    return instrumentSets[key as keyof typeof instrumentSets] || instrumentSets.chamber;
  }

  private static getInstrumentSection(instrumentId: string): string {
    const sectionMap: Record<string, string> = {
      'violin': 'strings',
      'viola': 'strings',
      'cello': 'strings',
      'bass': 'strings',
      'flute': 'woodwinds',
      'oboe': 'woodwinds',
      'clarinet': 'woodwinds',
      'bassoon': 'woodwinds',
      'horn': 'brass',
      'trumpet': 'brass',
      'trombone': 'brass',
      'piano': 'keyboard'
    };

    return sectionMap[instrumentId] || 'other';
  }

  private static improveBalance(balance: any): any {
    // Simple balance improvement logic
    const total = balance.strings + balance.woodwinds + balance.brass + balance.percussion;
    if (total === 0) return balance;

    return {
      ...balance,
      strings: Math.max(1, balance.strings),
      woodwinds: Math.max(0, Math.floor(balance.woodwinds * 0.8)),
      brass: Math.max(0, Math.floor(balance.brass * 0.6)),
      percussion: Math.max(0, Math.floor(balance.percussion * 0.4))
    };
  }

  private static mapMoodToEmotionalShape(mood: string): string {
    const mapping: Record<string, string> = {
      'lyrical': 'arc',
      'dramatic': 'dramatic',
      'mysterious': 'building',
      'joyful': 'arc',
      'somber': 'sustained',
      'triumphant': 'building',
      'intimate': 'sustained'
    };

    return mapping[mood] || 'arc';
  }

  private static generateTags(request: CompositionRequest): string[] {
    const tags = [
      request.style.era,
      request.style.genre,
      request.style.mood,
      request.style.complexity,
      request.ensemble.type,
      request.ensemble.size
    ];

    if (request.material.harmonicLanguage !== 'tonal') {
      tags.push(request.material.harmonicLanguage);
    }

    return tags;
  }

  private static calculateComplexity(request: CompositionRequest): number {
    let complexity = 0.5;

    // Style complexity
    if (request.style.complexity === 'simple') complexity -= 0.2;
    if (request.style.complexity === 'complex') complexity += 0.3;

    // Ensemble size complexity
    if (request.ensemble.size === 'full') complexity += 0.2;
    if (request.ensemble.size === 'solo') complexity -= 0.2;

    // Form complexity
    if (request.structure.formType === 'sonata') complexity += 0.2;
    if (request.structure.formType === 'theme_variations') complexity += 0.1;

    // Material complexity
    if (request.material.harmonicLanguage !== 'tonal') complexity += 0.1;

    return Math.max(0, Math.min(1, complexity));
  }

  private static calculateStatistics(project: CompositionProject): any {
    return {
      techniques: project.sections.reduce((sum, s) => sum + s.techniques.length, 0),
      materials: project.sections.reduce((sum, s) => sum + s.material.themes.length + s.material.motifs.length, 0),
      operations: project.metadata.statistics.techniques
    };
  }

  private static performStructuralAnalysis(project: CompositionProject): StructuralAnalysis {
    // Simplified structural analysis
    return {
      formAnalysis: FormEngine.analyzeForm(project.form),
      thematicCohesion: 0.7,
      narrative: ['Establishes primary material', 'Develops themes', 'Returns to main material'],
      balance: 0.8,
      innovation: 0.6
    };
  }

  private static performTechnicalAnalysis(project: CompositionProject): TechnicalAnalysis {
    // Simplified technical analysis
    return {
      difficulty: 0.6,
      instrumentalChallenges: ['Range requirements', 'Rhythmic complexity'],
      rhythmicComplexity: 0.5,
      harmonicComplexity: 0.6,
      contrapuntalDensity: 0.4,
      orchestrationChallenges: ['Balance considerations', 'Dynamic control']
    };
  }

  private static performArtisticAnalysis(project: CompositionProject): ArtisticAnalysis {
    // Simplified artistic analysis
    return {
      originality: 0.7,
      emotionalImpact: 0.6,
      coherence: 0.8,
      expression: ['Dynamic contrast', 'Thematic development'],
      innovation: ['Harmonic language', 'Orchestration techniques']
    };
  }

  private static performPerformanceAnalysis(project: CompositionProject): PerformanceAnalysis {
    // Simplified performance analysis
    return {
      duration: project.request.duration,
      technicalRequirements: ['Moderate technical skill required'],
      rehearsalTime: 15,
      performerSkills: { violin: 0.6, piano: 0.7, conductor: 0.5 },
      audienceAppeal: 0.7,
      memorability: 0.6
    };
  }

  private static generateRecommendations(
    structural: StructuralAnalysis,
    technical: TechnicalAnalysis,
    artistic: ArtisticAnalysis,
    performance: PerformanceAnalysis
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (technical.difficulty > 0.8) {
      recommendations.push({
        category: 'technical',
        priority: 'important',
        description: 'High technical difficulty',
        suggestion: 'Consider simplifying passages for better playability',
        impact: 0.3,
        effort: 0.5
      });
    }

    if (artistic.originality < 0.5) {
      recommendations.push({
        category: 'artistic',
        priority: 'helpful',
        description: 'Low originality score',
        suggestion: 'Consider adding unique harmonic or rhythmic elements',
        impact: 0.4,
        effort: 0.3
      });
    }

    if (structural.balance < 0.6) {
      recommendations.push({
        category: 'structural',
        priority: 'critical',
        description: 'Formal balance issues',
        suggestion: 'Adjust section durations for better balance',
        impact: 0.5,
        effort: 0.4
      });
    }

    return recommendations;
  }
}

// ===== HIGH-LEVEL PIPELINE API =====

export class CompositionAPI {
  /**
   * Quick composition with minimal parameters
   */
  static quickCompose(
    themes: number[][],
    duration: Rational,
    style: 'classical' | 'modern' | 'film' = 'classical'
  ): Promise<PipelineResult> {
    return CompositionPipeline.quickCompose(themes, duration, style);
  }

  /**
   * Professional composition with full control
   */
  static compose(
    themes: ThemeMaterial[],
    formType: string,
    orchestration: string[],
    options: {
      duration?: Rational;
      style?: any;
      constraints?: any;
    } = {}
  ): Promise<PipelineResult> {
    const request: CompositionRequest = {
      id: CompositionPipeline['generateId'](),
      title: 'Professional Composition',
      duration: options.duration || new Rational(120, 1),
      style: options.style || {
        era: 'contemporary',
        genre: 'ensemble',
        mood: 'lyrical',
        complexity: 'moderate'
      },
      ensemble: {
        type: 'mixed',
        size: 'medium',
        instrumentation: orchestration
      },
      structure: {
        formType: formType as any
      },
      material: {
        themes,
        motifs: [],
        harmonicLanguage: 'tonal',
        rhythmicCharacter: 'regular'
      },
      constraints: options.constraints || {
        technicalDifficulty: 'advanced',
        instrumentalRanges: 'extended',
        orchestrationDensity: 'moderate',
        dynamicRange: 'wide'
      },
      objectives: {
        primaryGoal: 'performance',
        targetAudience: 'general',
        emotionalImpact: 'moderate'
      }
    };

    return CompositionPipeline.execute(request);
  }

  /**
   * Generate variations on existing work
   */
  static createVariations(
    project: CompositionProject,
    count: number = 3,
    types: ('thematic' | 'harmonic' | 'orchestral' | 'structural')[] = ['combined']
  ): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];

    for (const type of types) {
      const variations = await CompositionPipeline.generateVariations(
        project,
        type as any,
        Math.ceil(count / types.length)
      );
      results.push(...variations);
    }

    return results;
  }

  /**
   * Analyze composition quality and potential
   */
  static analyzeComposition(project: CompositionProject): {
    quality: {
      overall: number;
      technical: number;
      artistic: number;
      performability: number;
    };
    potential: {
      audience: string;
      commercial: number;
      educational: number;
      competition: number;
    };
    recommendations: Array<{
      category: string;
      priority: string;
      suggestion: string;
      impact: number;
    }>;
  } {
    const analysis = CompositionPipeline.analyzeComposition(project);

    // Calculate quality scores
    const quality = {
      overall: (analysis.technical.difficulty + analysis.artistic.coherence + analysis.structural.balance) / 3,
      technical: 1 - analysis.technical.difficulty, // Inverted - lower difficulty = higher quality
      artistic: analysis.artistic.coherence,
      performability: Math.max(0, 1 - analysis.performance.rehearsalTime / 50) // Normalize rehearsal time
    };

    // Calculate potential scores
    const potential = {
      audience: project.request.objectives.targetAudience,
      commercial: analysis.performance.audienceAppeal * 0.7 + analysis.artistic.originality * 0.3,
      educational: Math.max(0, 1 - analysis.technical.difficulty) * 0.8,
      competition: analysis.artistic.originality * 0.6 + analysis.structural.innovation * 0.4
    };

    return {
      quality,
      potential,
      recommendations: analysis.recommendations
    };
  }
}

// Export utilities
export function createQuickComposition(
  themes: number[][],
  duration: Rational,
  style: 'classical' | 'modern' | 'film' = 'classical'
): Promise<PipelineResult> {
  return CompositionAPI.quickCompose(themes, duration, style);
}

export function analyzeProject(project: CompositionProject) {
  return CompositionAPI.analyzeComposition(project);
}

export function createTheme(
  melody: number[],
  name: string,
  type: 'primary' | 'secondary' = 'primary'
): ThemeMaterial {
  return {
    id: `theme_${Date.now()}`,
    name,
    type,
    melodic: {
      contour: 'ascending',
      intervals: melody.slice(1).map((note, index) => note - melody[index]),
      range: Math.max(...melody) - Math.min(...melody),
      register: 'medium',
      character: 'lyrical'
    },
    rhythmic: {
      meter: '4/4',
      tempo: { min: 60, max: 120, preferred: 90 },
      pattern: [1, 1, 1, 1],
      subdivision: 'eighth',
      articulation: ['legato']
    },
    harmonic: {
      chordTypes: ['major', 'minor'],
      progression: ['I', 'IV', 'V', 'I'],
      modulationPoints: [melody.length / 2],
      tension: 'moderate'
    }
  };
}