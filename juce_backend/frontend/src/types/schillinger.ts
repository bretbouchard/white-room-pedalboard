/**
 * @fileoverview Unified type definitions for Schillinger Operating System integration
 * Bridges the Schillinger musical concepts with the existing DAW infrastructure
 */

//================================================================================================
// Core Musical Types (Aligned with existing system)
//================================================================================================

export interface MusicalNote {
  midi: number;
  octave: number;
  frequency: number;
  duration: number;
  velocity: number;
  name?: string; // e.g., "C4", "A#3"
}

export interface Rhythm {
  pattern: number[];
  timeSignature: [number, number];
  subdivision: number;
  duration: number;
  tempo?: number;
}

export interface Scale {
  root: MusicalNote;
  type: string;
  intervals: number[];
  notes: MusicalNote[];
  name?: string; // e.g., "C Major", "A Minor"
}

export interface Chord {
  root: MusicalNote;
  type: string;
  intervals: number[];
  notes: MusicalNote[];
  duration: number;
  name?: string; // e.g., "Cmaj7", "F#m"
  inversion?: number;
}

export interface Melody {
  notes: MusicalNote[];
  contour: number[];
  intervals: number[];
  scale: Scale;
  rhythm?: Rhythm;
}

//================================================================================================
// Bridge Types to Existing System
//================================================================================================

export interface DAWIntegration {
  // Mapping to existing flow types
  flowNodeId?: string;
  nodeType?: 'track' | 'clip' | 'effect' | 'bus';

  // Mapping to existing composition types
  musicalKey?: import('./composition').MusicalKey;
  timeSignature?: import('./composition').TimeSignature;
  musicalStyle?: import('./composition').MusicalStyle;

  // Audio integration
  audioBuffer?: AudioBuffer;
  audioContext?: AudioContext;
}

//================================================================================================
// Schillinger Operating System Types
//================================================================================================

export interface MusicalStructure {
  type: 'rhythm' | 'harmony' | 'melody' | 'form';
  elements: any[];
  properties: {
    symmetry: number;
    complexity: number;
    coherence: number;
    fractalDepth: number;
  };
  relationships: StructureRelationship[];
  dawIntegration?: DAWIntegration;
}

export interface StructureRelationship {
  source: string;
  target: string;
  type: 'derivation' | 'transformation' | 'combination' | 'resultant';
  strength: number;
  operation: string;
}

export interface SchillingerConfig {
  defaultTempo: number;
  defaultKey: string;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'advanced';
  preserveOriginal: boolean;
  generateVariations: boolean;
}

export interface SchillingerOperation {
  type: 'rhythmic' | 'harmonic' | 'structural' | 'cross_dimensional';
  operation: string;
  target: string;
  parameters: Record<string, any>;
}

//================================================================================================
// Enhanced Rhythmic Types
//================================================================================================

export interface RhythmicPattern {
  id: string;
  name: string;
  pattern: number[];
  subdivision: number;
  length: number;
  complexity: number;
  symmetry: number;
  properties: {
    periodicity: number;
    syncopation: number;
    density: number;
    energy: number;
  };
  dawIntegration?: DAWIntegration;
}

export interface ResultantRhythm {
  originalPatterns: RhythmicPattern[];
  resultant: number[];
  method: 'simple' | 'interference' | 'symmetry' | 'modulation';
  properties: {
    periodicity: number;
    stability: number;
    coherence: number;
  };
  dawIntegration?: DAWIntegration;
}

export interface InterferencePattern {
  pattern1: number[];
  pattern2: number[];
  interference: number[];
  phase: number;
  properties: {
    beatFrequency: number;
    beatStrength: number;
    complexity: number;
  };
  dawIntegration?: DAWIntegration;
}

//================================================================================================
// Cross-Dimensional Bridge Types
//================================================================================================

export interface UnifiedMusicalConcept {
  id: string;
  seed: MusicalStructure;
  dimensions: {
    rhythmic: RhythmicPattern;
    harmonic: Chord[];
    melodic: Melody;
    structural: MusicalStructure;
  };
  fractalProperties: {
    selfSimilarity: number;
    scalingFactor: number;
    recursionDepth: number;
  };
  dawIntegration?: DAWIntegration;
}

export interface FractalMapping {
  sourceDimension: 'rhythm' | 'harmony' | 'melody' | 'form';
  targetDimension: 'rhythm' | 'harmony' | 'melody' | 'form';
  mappingFunction: string;
  parameters: Record<string, any>;
  successRate: number;
}

//================================================================================================
// User Intention & Learning Types
//================================================================================================

export interface MusicalIntention {
  text: string;
  type: string;
  priority: number;
  context: Record<string, any>;
  parsedOperations?: SchillingerOperation[];
}

export interface InteractionRecord {
  timestamp: number;
  intention: string;
  operations: SchillingerOperation[];
  result: MusicalStructure[];
  feedback: 'accept' | 'reject' | 'modify';
  context: Record<string, any>;
  dawContext?: DAWIntegration;
}

export interface PersonalizedSchillingerEngine {
  userId: string;
  userPreferences: Record<string, any>;
  learningHistory: InteractionRecord[];
  processIntention(intention: string, material: any, context: any): MusicalStructure[];
  getPersonalizedRecommendations(context: any): SchillingerOperation[];
}

//================================================================================================
// ML Integration Types
//================================================================================================

export interface MusicalFeatures {
  // Existing audio features
  spectralCentroid?: number;
  spectralRolloff?: number;
  mfcc?: number[];
  tempo?: number;
  key?: string;

  // Enhanced Schillinger features
  schillingerAnalysis?: {
    detectedConcepts: Array<{
      concept: string;
      book: number;
      confidence: number;
      application: string;
    }>;
    rhythmicTechniques: string[];
    harmonicTechniques: string[];
    melodicTechniques: string[];
    formTechniques: string[];
  };
  semanticSimilarity?: {
    toUserGoal: number;
    toCurrentStyle: number;
    toSkillLevel: number;
  };

  // DAW integration features
  nodeContext?: {
    nodeId: string;
    nodeType: string;
    connectedNodes: string[];
    signalFlow: string[];
  };

  // Additional properties for ML integration
  complexity?: number;
  userContext?: any;
  workflowPatterns?: any[];
  userProfile?: any;
}

//================================================================================================
// Workflow Pattern Types
//================================================================================================

export interface WorkflowPattern {
  pattern: string;
  confidence: number;
  frequency?: number;
  success?: number;
}

export interface HybridRecommendation {
  schillingerInsights: any;
  mlConfidence: number;
  schillingerConfidence: number;
  musicalOutcome: any;
  id: string;
  type: "node_suggestion" | "connection_prediction" | "parameter_optimization" | "workflow_improvement" | "musical_suggestion" | "collaboration_enhancement";
  title: string;
  description: string;
  confidence: number;
  impact: "low" | "moderate" | "high";
  metadata: {
    modelUsed: string;
    processingTime: number;
    schillingerTechniques: string[];
    musicalContext: any;
  };
  combinedConfidence: number; // Required property
}

//================================================================================================
// Error Handling & Validation Types
//================================================================================================

export interface SchillingerError extends Error {
  code: 'CONFIG_INVALID' | 'OPERATION_FAILED' | 'INTEGRATION_ERROR' | 'TYPE_MISMATCH';
  context?: {
    operation?: SchillingerOperation;
    inputType?: string;
    expectedType?: string;
    dawContext?: DAWIntegration;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

//================================================================================================
// API & Integration Types
//================================================================================================

export interface SchillingerRequest {
  operation: SchillingerOperation;
  inputMaterial: any;
  context: {
    musicalContext?: MusicalFeatures;
    dawContext?: DAWIntegration;
    userContext?: {
      userId: string;
      skillLevel: string;
      preferences: Record<string, any>;
    };
  };
}

export interface SchillingerResponse {
  success: boolean;
  result?: MusicalStructure[];
  error?: SchillingerError;
  metadata: {
    processingTime: number;
    operationsApplied: SchillingerOperation[];
    confidence: number;
    suggestions: string[];
  };
  dawIntegration?: DAWIntegration;
}

//================================================================================================
// Type Guards and Utilities
//================================================================================================

export function isValidMusicalNote(obj: any): obj is MusicalNote {
  return obj &&
         typeof obj.midi === 'number' &&
         typeof obj.octave === 'number' &&
         typeof obj.frequency === 'number' &&
         typeof obj.duration === 'number' &&
         typeof obj.velocity === 'number';
}

export function isValidRhythm(obj: any): obj is Rhythm {
  return obj &&
         Array.isArray(obj.pattern) &&
         Array.isArray(obj.timeSignature) &&
         typeof obj.subdivision === 'number' &&
         typeof obj.duration === 'number';
}

export function isValidScale(obj: any): obj is Scale {
  return obj &&
         isValidMusicalNote(obj.root) &&
         typeof obj.type === 'string' &&
         Array.isArray(obj.intervals) &&
         Array.isArray(obj.notes) &&
         obj.notes.every(isValidMusicalNote);
}

export function isValidChord(obj: any): obj is Chord {
  return obj &&
         isValidMusicalNote(obj.root) &&
         typeof obj.type === 'string' &&
         Array.isArray(obj.intervals) &&
         Array.isArray(obj.notes) &&
         obj.notes.every(isValidMusicalNote) &&
         typeof obj.duration === 'number';
}

//================================================================================================
// Exports
//================================================================================================

export type {
  // Re-export from existing types for convenience
  MusicalKey,
  TimeSignature,
  MusicalStyle,
  HarmonicProgression,
  CompositionStructure,
  SchillingerContext,
  CompositionContext
} from './composition';

export type {
  FlowNode,
  FlowEdge,
  FlowNodeData,
  BaseNodeData
} from './flow';