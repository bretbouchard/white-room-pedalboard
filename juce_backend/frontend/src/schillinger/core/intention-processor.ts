/**
 * @fileoverview Intelligent User Intention Interface
 * Translates natural language musical intentions into precise Schillinger operations
 * Bridges the gap between user expressions and the Schillinger Operating System
 */

import type {
  MusicalIntention,
  SchillingerOperation,
  MusicalStructure,
  SchillingerConfig,
  ValidationResult,
  SchillingerError,
  DAWIntegration,
  MusicalFeatures
} from '../../types/schillinger';

//================================================================================================
// Intention Processing Types
//================================================================================================

export interface IntentionPattern {
  id: string;
  keywords: string[];
  musicalConcepts: string[];
  operations: SchillingerOperation[];
  confidence: number;
  examples: string[];
  context: {
    styles?: string[];
    moods?: string[];
    complexity?: string[];
  };
}

export interface IntentionAnalysis {
  originalIntention: string;
  parsedConcepts: Array<{
    concept: string;
    confidence: number;
    position: [number, number];
  }>;
  suggestedOperations: SchillingerOperation[];
  contextualFactors: {
    style?: string;
    mood?: string;
    tempo?: number;
    key?: string;
    instruments?: string[];
  };
  confidence: number;
  alternatives: IntentionAnalysis[];
  error?: string; // Optional error field for error responses
}

export interface IntentionMapping {
  fromLanguage: string;
  toSchillingerConcepts: string[];
  operationTemplate: Partial<SchillingerOperation>;
  parameters: Record<string, any>;
  examples: string[];
}

//================================================================================================
// Core Intention Patterns Database
//================================================================================================

class IntentionPatternDatabase {
  private patterns: Map<string, IntentionPattern> = new Map();

  constructor() {
    this.initializeCorePatterns();
  }

  private initializeCorePatterns(): void {
    // Energy and Drive intentions
    this.addPattern({
      id: 'increase_energy',
      keywords: ['energy', 'drive', 'momentum', 'power', 'intensity', 'forward'],
      musicalConcepts: ['rhythmic_acceleration', 'harmonic_tension', 'dynamic_increase'],
      operations: [
        {
          type: 'rhythmic',
          operation: 'accelerate',
          target: 'rhythm',
          parameters: { factor: 1.3, complexity: 'increase' }
        },
        {
          type: 'harmonic',
          operation: 'increase_tension',
          target: 'harmony',
          parameters: { chromaticism: 'add', dissonance: 'increase' }
        },
        {
          type: 'cross_dimensional',
          operation: 'amplify',
          target: 'dynamics',
          parameters: { intensity: 0.8 }
        }
      ],
      confidence: 0.9,
      examples: [
        "I want more energy in this section",
        "Make this feel more driving",
        "Add some forward momentum",
        "This needs more power"
      ],
      context: {
        styles: ['rock', 'electronic', 'pop', 'funk'],
        moods: ['excited', 'urgent', 'powerful'],
        complexity: ['moderate', 'complex']
      }
    });

    // Tension and Release intentions
    this.addPattern({
      id: 'build_tension',
      keywords: ['tension', 'suspense', 'build', 'climax', 'anticipation', 'rising'],
      musicalConcepts: ['harmonic_tension', 'rhythmic_syncopation', 'dynamic_crescendo'],
      operations: [
        {
          type: 'harmonic',
          operation: 'increase_tension',
          target: 'harmony',
          parameters: { approach: 'chromatic', resolution: 'delay' }
        },
        {
          type: 'rhythmic',
          operation: 'add_syncopation',
          target: 'rhythm',
          parameters: { offbeat_emphasis: 0.7 }
        },
        {
          type: 'structural',
          operation: 'build_climax',
          target: 'form',
          parameters: { crescendo_length: 4, peak_intensity: 0.9 }
        }
      ],
      confidence: 0.85,
      examples: [
        "I want to build tension here",
        "Add some suspense before the chorus",
        "Create a rising feeling",
        "Build up to the climax"
      ],
      context: {
        styles: ['classical', 'jazz', 'film', 'electronic'],
        moods: ['tense', 'anticipating', 'dramatic'],
        complexity: ['moderate', 'complex', 'advanced']
      }
    });

    // Variation and Development intentions
    this.addPattern({
      id: 'add_variation',
      keywords: ['variation', 'different', 'change', 'develop', 'evolve', 'transform'],
      musicalConcepts: ['melodic_variation', 'harmonic_substitution', 'rhythmic_modification'],
      operations: [
        {
          type: 'structural',
          operation: 'variation',
          target: 'structure',
          parameters: { depth: 2, preserveEssence: true, introduceNovelty: 0.4 }
        },
        {
          type: 'cross_dimensional',
          operation: 'transform',
          target: 'all',
          parameters: { variation_type: 'development', maintain_core: true }
        }
      ],
      confidence: 0.8,
      examples: [
        "This feels repetitive, let's vary it",
        "Can you make this more interesting?",
        "I want to develop this idea",
        "Transform this into something new"
      ],
      context: {
        styles: ['all'],
        moods: ['all'],
        complexity: ['all']
      }
    });

    // Relaxation and Release intentions
    this.addPattern({
      id: 'create_release',
      keywords: ['relax', 'release', 'calm', 'peaceful', 'gentle', 'soothing', 'resolve'],
      musicalConcepts: ['harmonic_resolution', 'rhythmic_simplification', 'dynamic_reduction'],
      operations: [
        {
          type: 'harmonic',
          operation: 'resolve',
          target: 'harmony',
          parameters: { resolution_type: 'perfect', tension_release: 0.8 }
        },
        {
          type: 'rhythmic',
          operation: 'simplify',
          target: 'rhythm',
          parameters: { complexity: 'reduce', regularity: 'increase' }
        },
        {
          type: 'cross_dimensional',
          operation: 'relax',
          target: 'all',
          parameters: { intensity: 0.3, smoothness: 0.9 }
        }
      ],
      confidence: 0.85,
      examples: [
        "I want this to feel more peaceful",
        "Can we calm this section down?",
        "Add some resolution here",
        "Make this more gentle"
      ],
      context: {
        styles: ['ambient', 'classical', 'jazz', 'new_age'],
        moods: ['calm', 'peaceful', 'resolved', 'relaxed'],
        complexity: ['simple', 'moderate']
      }
    });

    // Complexity and Simplicity intentions
    this.addPattern({
      id: 'adjust_complexity',
      keywords: ['complex', 'simple', 'intricate', 'basic', 'sophisticated', 'minimal'],
      musicalConcepts: ['structural_complexity', 'rhythmic_density', 'harmonic_sophistication'],
      operations: [
        {
          type: 'structural',
          operation: 'adjust_complexity',
          target: 'structure',
          parameters: { target_complexity: 'adaptive' }
        }
      ],
      confidence: 0.75,
      examples: [
        "Make this more complex",
        "Can we simplify this arrangement?",
        "I want something more sophisticated",
        "This is too complicated, simplify it"
      ],
      context: {
        styles: ['all'],
        moods: ['all'],
        complexity: ['all']
      }
    });

    // Rhythmic specific intentions
    this.addPattern({
      id: 'rhythmic_feel',
      keywords: ['groove', 'pocket', 'rhythm', 'beat', 'pulse', 'dance'],
      musicalConcepts: ['rhythmic_groove', 'syncopation', 'polyrhythm'],
      operations: [
        {
          type: 'rhythmic',
          operation: 'enhance_groove',
          target: 'rhythm',
          parameters: { pocket_depth: 0.7, dance_factor: 0.8 }
        }
      ],
      confidence: 0.9,
      examples: [
        "I want a better groove",
        "Make this more danceable",
        "Add some pocket to this rhythm",
        "Enhance the beat"
      ],
      context: {
        styles: ['funk', 'jazz', 'rock', 'electronic', 'hip_hop'],
        moods: ['grooving', 'dancing', 'funky'],
        complexity: ['moderate', 'complex']
      }
    });
  }

  addPattern(pattern: IntentionPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  findPattern(keywords: string[]): IntentionPattern[] {
    const matches: IntentionPattern[] = [];

    for (const pattern of this.patterns.values()) {
      const matchScore = this.calculateMatchScore(keywords, pattern.keywords);
      if (matchScore > 0.3) { // Threshold for pattern matching
        matches.push({
          ...pattern,
          confidence: pattern.confidence * matchScore
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateMatchScore(userKeywords: string[], patternKeywords: string[]): number {
    let matches = 0;
    const totalKeywords = Math.max(userKeywords.length, patternKeywords.length);

    for (const userKeyword of userKeywords) {
      for (const patternKeyword of patternKeywords) {
        if (userKeyword.toLowerCase().includes(patternKeyword.toLowerCase()) ||
            patternKeyword.toLowerCase().includes(userKeyword.toLowerCase())) {
          matches++;
          break;
        }
      }
    }

    return matches / totalKeywords;
  }

  getAllPatterns(): IntentionPattern[] {
    return Array.from(this.patterns.values());
  }
}

//================================================================================================
// Natural Language Processor
//================================================================================================

class NaturalLanguageProcessor {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'i', 'want', 'make', 'add', 'create', 'feel', 'like'
  ]);

  extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, this would use NLP libraries
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));

    return words;
  }

  detectMusicalConcepts(text: string): Array<{ concept: string; confidence: number }> {
    const concepts: Array<{ concept: string; confidence: number }> = [];
    const lowercaseText = text.toLowerCase();

    // Musical concept detection
    const conceptMap = {
      'energy': ['energy', 'power', 'intensity', 'drive', 'momentum'],
      'tension': ['tension', 'suspense', 'dissonance', 'climax'],
      'rhythm': ['rhythm', 'beat', 'groove', 'pocket', 'pulse'],
      'harmony': ['harmony', 'chord', 'progression', 'key'],
      'melody': ['melody', 'tune', 'line', 'phrase'],
      'form': ['structure', 'form', 'section', 'arrangement'],
      'dynamics': ['loud', 'soft', 'quiet', 'intense', 'dynamic'],
      'texture': ['thick', 'thin', 'dense', 'sparse', 'texture'],
      'timbre': ['bright', 'dark', 'warm', 'cold', 'tone']
    };

    for (const [concept, keywords] of Object.entries(conceptMap)) {
      const matches = keywords.filter(keyword => lowercaseText.includes(keyword)).length;
      if (matches > 0) {
        concepts.push({
          concept,
          confidence: Math.min(1, matches / keywords.length)
        });
      }
    }

    return concepts.sort((a, b) => b.confidence - a.confidence);
  }

  detectContext(text: string): any {
    const context: any = {};

    // Style detection
    const styles = {
      'rock': ['rock', 'guitar', 'drums', 'bass'],
      'jazz': ['jazz', 'swing', 'improv', 'standards'],
      'classical': ['classical', 'orchestra', 'symphony', 'chamber'],
      'electronic': ['electronic', 'synth', 'digital', 'edm'],
      'folk': ['folk', 'acoustic', 'organic', 'traditional']
    };

    for (const [style, keywords] of Object.entries(styles)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        context.style = style;
        break;
      }
    }

    // Mood detection
    const moods = {
      'energetic': ['energetic', 'exciting', 'upbeat', 'driving'],
      'calm': ['calm', 'peaceful', 'relaxing', 'gentle'],
      'dramatic': ['dramatic', 'intense', 'epic', 'powerful'],
      'melancholy': ['sad', 'melancholy', 'somber', 'reflective']
    };

    for (const [mood, keywords] of Object.entries(moods)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        context.mood = mood;
        break;
      }
    }

    return context;
  }
}

//================================================================================================
// Intention Processor Engine
//================================================================================================

export class IntentionProcessor {
  private patternDatabase: IntentionPatternDatabase;
  private nlpProcessor: NaturalLanguageProcessor;
  private config: SchillingerConfig;

  constructor(config: SchillingerConfig) {
    this.config = config;
    this.patternDatabase = new IntentionPatternDatabase();
    this.nlpProcessor = new NaturalLanguageProcessor();
  }

  async processIntention(
    userIntention: string,
    currentMaterial: any,
    context: {
      musicalFeatures?: MusicalFeatures;
      dawIntegration?: DAWIntegration;
      userPreferences?: any;
    } = {}
  ): Promise<IntentionAnalysis> {
    try {
      // Extract keywords and concepts
      const keywords = this.nlpProcessor.extractKeywords(userIntention);
      const musicalConcepts = this.nlpProcessor.detectMusicalConcepts(userIntention);
      const contextualFactors = this.nlpProcessor.detectContext(userIntention);

      // Find matching patterns
      const matchedPatterns = this.patternDatabase.findPattern(keywords);

      if (matchedPatterns.length === 0) {
        return this.createGenericResponse(userIntention, musicalConcepts, contextualFactors);
      }

      // Generate operations from best matching patterns
      const bestPattern = matchedPatterns[0];
      const suggestedOperations = this.adaptOperationsToContext(
        bestPattern.operations,
        context,
        currentMaterial
      );

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(
        bestPattern.confidence,
        musicalConcepts,
        keywords.length
      );

      // Generate alternatives
      const alternatives = this.generateAlternatives(
        matchedPatterns.slice(1),
        userIntention,
        context,
        currentMaterial
      );

      return {
        originalIntention: userIntention,
        parsedConcepts: musicalConcepts.map(concept => ({
          concept: concept.concept,
          confidence: concept.confidence,
          position: [0, 0] // Would be filled by NLP with actual positions
        })),
        suggestedOperations,
        contextualFactors: {
          ...contextualFactors,
          ...context.musicalFeatures,
          ...context.dawIntegration
        },
        confidence,
        alternatives
      };

    } catch (error) {
      console.error('Error processing intention:', error);
      return this.createErrorResponse(userIntention, error);
    }
  }

  private adaptOperationsToContext(
    operations: SchillingerOperation[],
    context: any,
    currentMaterial: any
  ): SchillingerOperation[] {
    return operations.map(operation => {
      const adaptedOperation = { ...operation };

      // Adapt parameters based on complexity level
      if (this.config.complexityLevel) {
        adaptedOperation.parameters = this.adjustParametersForComplexity(
          operation.parameters,
          this.config.complexityLevel
        );
      }

      // Adapt based on current material
      if (currentMaterial) {
        adaptedOperation.parameters = this.adjustParametersForMaterial(
          adaptedOperation.parameters,
          currentMaterial
        );
      }

      // Adapt based on musical features
      if (context.musicalFeatures) {
        adaptedOperation.parameters = this.adjustParametersForFeatures(
          adaptedOperation.parameters,
          context.musicalFeatures
        );
      }

      return adaptedOperation;
    });
  }

  private adjustParametersForComplexity(
    parameters: Record<string, any>,
    complexityLevel: string
  ): Record<string, any> {
    const adjusted = { ...parameters };

    switch (complexityLevel) {
      case 'simple':
        if (adjusted.factor) adjusted.factor = Math.min(1.2, adjusted.factor);
        if (adjusted.complexity) adjusted.complexity = 'minimal';
        if (adjusted.depth) adjusted.depth = Math.min(2, adjusted.depth);
        break;
      case 'moderate':
        // Keep original parameters
        break;
      case 'complex':
        if (adjusted.factor) adjusted.factor = Math.min(1.8, adjusted.factor * 1.2);
        if (adjusted.complexity) adjusted.complexity = 'increase';
        if (adjusted.depth) adjusted.depth = Math.min(4, (adjusted.depth || 2) + 1);
        break;
      case 'advanced':
        if (adjusted.factor) adjusted.factor = Math.min(2.0, adjusted.factor * 1.5);
        if (adjusted.complexity) adjusted.complexity = 'maximum';
        if (adjusted.depth) adjusted.depth = Math.min(6, (adjusted.depth || 3) + 2);
        break;
    }

    return adjusted;
  }

  private adjustParametersForMaterial(
    parameters: Record<string, any>,
    material: any
  ): Record<string, any> {
    // This would analyze the current material and adjust parameters accordingly
    // For now, return original parameters
    return { ...parameters };
  }

  private adjustParametersForFeatures(
    parameters: Record<string, any>,
    features: MusicalFeatures
  ): Record<string, any> {
    const adjusted = { ...parameters };

    // Adjust based on detected style
    if (features.schillingerAnalysis) {
      // Could tailor operations based on detected Schillinger techniques
      adjusted.detectedTechniques = features.schillingerAnalysis.rhythmicTechniques;
    }

    // Adjust based on semantic similarity to user goal
    if (features.semanticSimilarity) {
      adjusted.similarityBoost = features.semanticSimilarity.toUserGoal;
    }

    return adjusted;
  }

  private calculateOverallConfidence(
    patternConfidence: number,
    musicalConcepts: Array<{ concept: string; confidence: number }>,
    keywordCount: number
  ): number {
    const conceptConfidence = musicalConcepts.length > 0
      ? musicalConcepts.reduce((sum, concept) => sum + concept.confidence, 0) / musicalConcepts.length
      : 0.5;

    const keywordFactor = Math.min(1, keywordCount / 3); // Normalize keyword count

    return (patternConfidence * 0.6 + conceptConfidence * 0.3 + keywordFactor * 0.1);
  }

  private generateAlternatives(
    patterns: IntentionPattern[],
    originalIntention: string,
    context: any,
    currentMaterial: any
  ): IntentionAnalysis[] {
    return patterns.slice(0, 2).map(pattern => ({
      originalIntention,
      parsedConcepts: [],
      suggestedOperations: this.adaptOperationsToContext(pattern.operations, context, currentMaterial),
      contextualFactors: {},
      confidence: pattern.confidence * 0.8, // Reduce confidence for alternatives
      alternatives: []
    }));
  }

  private createGenericResponse(
    intention: string,
    concepts: Array<{ concept: string; confidence: number }>,
    context: any
  ): IntentionAnalysis {
    return {
      originalIntention: intention,
      parsedConcepts: concepts.map(concept => ({
        concept: concept.concept,
        confidence: concept.confidence,
        position: [0, 0]
      })),
      suggestedOperations: [{
        type: 'cross_dimensional',
        operation: 'generic_transform',
        target: 'all',
        parameters: {
          user_intention: intention,
          detected_concepts: concepts.map(c => c.concept),
          context
        }
      }],
      contextualFactors: context,
      confidence: 0.4,
      alternatives: []
    };
  }

  private createErrorResponse(intention: string, error: any): IntentionAnalysis {
    return {
      originalIntention: intention,
      parsedConcepts: [],
      suggestedOperations: [],
      contextualFactors: {},
      confidence: 0,
      alternatives: [],
      error: error.message
    };
  }

  // Learning methods
  learnFromFeedback(
    originalIntention: string,
    appliedOperations: SchillingerOperation[],
    userFeedback: 'accept' | 'reject' | 'modify',
    actualResult?: MusicalStructure
  ): void {
    // This would update the pattern database based on user feedback
    console.log('Learning from feedback:', {
      intention: originalIntention,
      operations: appliedOperations,
      feedback: userFeedback
    });
  }

  addCustomPattern(pattern: IntentionPattern): void {
    this.patternDatabase.addPattern(pattern);
  }

  getPatternStatistics(): any {
    return {
      totalPatterns: this.patternDatabase.getAllPatterns().length,
      patternTypes: ['energy', 'tension', 'variation', 'release', 'complexity', 'rhythm']
    };
  }
}

export default IntentionProcessor;