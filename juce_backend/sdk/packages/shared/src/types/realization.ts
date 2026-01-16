/**
 * Realization Layer Types for Schillinger SDK
 *
 * This module defines the core abstractions for the "moving sidewalk" concept
 * of continuous musical time projection and emergence.
 */

// =============================================================================
// TIME MANAGEMENT
// =============================================================================

/**
 * Musical time representation with precision support
 */
export interface MusicalTime {
  /** Total seconds since start */
  seconds: number;
  /** Beats since start (if tempo known) */
  beats?: number;
  /** Measures since start (if time signature known) */
  measures?: number;
  /** Precision for audio processing */
  precision?: 'seconds' | 'samples' | 'ticks';
}

/**
 * Time range for sliding window operations
 */
export interface TimeRange {
  start: MusicalTime;
  end: MusicalTime;
  duration: number; // in seconds

  /**
   * Check if a time point falls within this range
   */
  contains(time: MusicalTime): boolean;

  /**
   * Get the overlap with another time range
   */
  overlap(other: TimeRange): TimeRange | null;

  /**
   * Slide this window by a delta time
   */
  slide(delta: number): TimeRange;
}

// =============================================================================
// MUSICAL ROLES & MATERIALS
// =============================================================================

/**
 * Functional musical role (not instrument-specific)
 */
export type MusicalRole =
  | 'bass'           // Foundation, harmonic root
  | 'harmony'        // Chordal support
  | 'melody'         // Primary melodic line
  | 'counter-melody' // Secondary melodic line
  | 'rhythm'         // Rhythmic foundation
  | 'texture'        // Background/padding
  | 'ornament'       // Embellishments
  | 'lead'           // Main voice
  | 'accompaniment'; // Supporting material

/**
 * Register range for musical material
 */
export interface RegisterRange {
  min: number; // MIDI note number
  max: number; // MIDI note number
  center: number; // Center of register
  width: number; // Width in semitones
}

/**
 * Individual musical event (note, rest, chord)
 */
export interface MusicalEvent {
  id: string;
  time: number; // Local time offset within material (seconds)
  duration: number; // Event duration (seconds)
  pitch?: number; // MIDI note number (if pitched)
  amplitude: number; // 0.0 to 1.0
  articulation?: {
    attack: number; // 0.0 to 1.0
    release: number; // 0.0 to 1.0
    sustain: number; // 0.0 to 1.0
  };
  metadata?: {
    generatorId?: string;
    role?: MusicalRole;
    intensity?: number;
  };
}

/**
 * Collection of musical events forming coherent material
 */
export type MusicalMaterial = MusicalEvent[];

// =============================================================================
// FIELDS (PHASE 2 INTEGRATION)
// =============================================================================

/**
 * Intensity field for emergent musical behavior
 */
export interface IntensityField {
  id: string;
  values: number[]; // Intensity values over time
  timePoints: number[]; // Corresponding time points
  interpolation: 'linear' | 'cubic' | 'exponential';

  /**
   * Get intensity at specific time
   */
  getValueAt(time: number): number;

  /**
   * Get intensity gradient at specific time
   */
  getGradientAt(time: number): number;
}

/**
 * Coincidence field for convergence detection
 */
export interface CoincidenceField {
  id: string;
  convergencePoints: Array<{
    time: number;
    strength: number; // 0.0 to 1.0
    participatingLayers: string[];
  }>;

  /**
   * Check for convergence at specific time
   */
  hasConvergence(time: number, tolerance?: number): boolean;

  /**
   * Get nearest convergence point
   */
  getNearestConvergence(time: number): ConvergencePoint | null;
}

/**
 * Convergence point information
 */
export interface ConvergencePoint {
  time: number;
  strength: number;
  layers: string[];
  type: 'climax' | 'cadence' | 'transition' | 'emergence';
}

/**
 * Unified resultant combining multiple generator outputs
 */
export interface UnifiedResultant {
  id: string;
  generatorIds: string[];
  material: MusicalMaterial;
  coherence: number; // 0.0 to 1.0
  emergence: number; // 0.0 to 1.0
  metadata: {
    dominantRole?: MusicalRole;
    intensity?: number;
    complexity?: number;
  };
}

// =============================================================================
// GENERATORS (PHASE 1 INTEGRATION)
// =============================================================================

/**
 * Generator set for different musical dimensions
 */
export interface GeneratorSet {
  rhythm?: {
    id: string;
    generator: any; // Existing RhythmGenerator
    parameters: Record<string, any>;
  };
  harmony?: {
    id: string;
    generator: any; // Existing HarmonyGenerator
    parameters: Record<string, any>;
  };
  contour?: {
    id: string;
    generator: any; // Existing MelodyGenerator
    parameters: Record<string, any>;
  };
  orchestration?: {
    id: string;
    generator: any; // New OrchestrationGenerator
    parameters: Record<string, any>;
  };
}

// =============================================================================
// ORCHESTRA FIELD
// =============================================================================

/**
 * Instrument specification for orchestration
 */
export interface InstrumentSpec {
  id: string;
  name: string;
  family: 'strings' | 'woodwinds' | 'brass' | 'percussion' | 'keyboard' | 'electronic';
  register: RegisterRange;
  characteristics: {
    polyphonic: boolean;
    dynamicRange: [number, number]; // min/max MIDI velocity
    attackTime: number; // seconds
    sustainTime: number; // seconds
    releaseTime: number; // seconds
  };
  capabilities: {
    roles: MusicalRole[];
    techniques: string[];
    expressions: string[];
  };
}

/**
 * Orchestra field for instrument management
 */
export interface OrchestraField {
  id: string;
  instruments: InstrumentSpec[];
  constraints: {
    registerOverlap: number; // Maximum register overlap between instruments
    doublingTolerance: number; // Maximum simultaneous same-note instances
    densityLimit: number; // Maximum simultaneous instruments
    balanceWeight: Record<MusicalRole, number>; // Role importance weights
  };

  /**
   * Get instruments suitable for specific role
   */
  getInstrumentsForRole(role: MusicalRole): InstrumentSpec[];

  /**
   * Check register compatibility between instruments
   */
  areRegistersCompatible(inst1: InstrumentSpec, inst2: InstrumentSpec): boolean;
}

// =============================================================================
// REALIZATION LAYER CORE
// =============================================================================

/**
 * Realized layer - functional musical role with material
 */
export interface RealizedLayer {
  id: string;
  role: MusicalRole;
  generatorId: string;
  material: MusicalMaterial;
  register: RegisterRange;
  energy: number; // 0.0 to 1.0
  coherence: number; // 0.0 to 1.0
  emergence: number; // 0.0 to 1.0
  metadata: {
    intensity?: number;
    complexity?: number;
    convergenceHints?: ConvergenceHints;
  };
}

/**
 * Convergence hints for layer behavior
 */
export interface ConvergenceHints {
  approachingConvergence: boolean;
  convergenceTime?: number;
  convergenceStrength?: number;
  convergenceType?: 'climax' | 'cadence' | 'transition';
}

/**
 * Realized frame - snapshot of musical material at specific time
 */
export interface RealizedFrame {
  time: MusicalTime;
  layers: RealizedLayer[];
  coherenceScore: number; // Overall frame coherence 0.0 to 1.0
  convergenceFlags: ConvergenceHints;
  metadata: {
    intensity?: number;
    energy?: number;
    density?: number;
  };
}

/**
 * Track projection - mapping layers to actual tracks
 */
export interface TrackProjection {
  id: string;
  name: string;
  layers: string[]; // Layer IDs to assign to this track
  instrument?: InstrumentSpec;
  output: {
    format: 'midi' | 'audio' | 'daw';
    channel?: number;
    bus?: string;
  };
  parameters: {
    volume: number; // 0.0 to 1.0
    pan: number; // -1.0 to 1.0
    reverb?: number; // 0.0 to 1.0
    effects?: Record<string, number>;
  };
}

/**
 * Track set - complete mapping of layers to output tracks
 */
export interface TrackSet {
  id: string;
  tracks: TrackProjection[];
  metadata: {
    format: 'daw' | 'live' | 'export';
    target?: string; // DAW name, output format, etc.
  };
}

/**
 * Traversal plan for moving sidewalk behavior
 */
export interface TraversalPlan {
  id: string;
  duration: MusicalTime;
  intensityCurve: IntensityField;
  releaseMoments: ReleasePlan[];
  behavior: {
    speed: number; // Time progression rate (1.0 = normal)
    smoothing: number; // Smoothing factor for transitions 0.0 to 1.0
    elasticity: number; // Elasticity of time window 0.0 to 1.0
  };
}

/**
 * Release moment for structured emergence
 */
export interface ReleasePlan {
  time: number; // Time from start (seconds)
  type: 'gradual' | 'sudden' | 'staggered' | 'cascading';
  layers: string[]; // Layer IDs to release
  parameters: {
    fadeTime?: number; // For gradual releases
    cascadeDelay?: number; // For staggered releases
    intensity?: number; // Target intensity
  };
}

// =============================================================================
// REALIZATION PLANE
// =============================================================================

/**
 * Main realization plane - the "moving sidewalk"
 */
export interface RealizationPlane {
  id: string;
  timeWindow: TimeRange;
  generators: GeneratorSet;
  fields: {
    intensity: IntensityField;
    coincidence?: CoincidenceField;
    orchestra?: OrchestraField;
  };
  traversal: TraversalPlan;
  configuration: {
    layerCapacity: number;
    coherenceThreshold: number; // Minimum coherence for layer inclusion
    emergenceEnabled: boolean;
    realtimeMode: boolean;
  };

  /**
   * Realize musical material at specific time
   * This is the core method that generates the "moving sidewalk" effect
   */
  realize(atTime: MusicalTime): RealizedFrame;

  /**
   * Project layers to tracks for output
   */
  project(layers: RealizedLayer[]): TrackSet;

  /**
   * Update time window position
   */
  slideWindow(newPosition: MusicalTime): void;

  /**
   * Get current state
   */
  getState(): RealizationState;
}

/**
 * Current state of realization plane
 */
export interface RealizationState {
  currentPosition: MusicalTime;
  activeLayers: string[];
  lastConvergence: ConvergencePoint | null;
  nextConvergence: ConvergencePoint | null;
  intensity: number;
  coherence: number;
}

// =============================================================================
// REALIZATION ENGINE
// =============================================================================

/**
 * Realization engine coordinates the entire process
 */
export interface RealizationEngine {
  id: string;
  plane: RealizationPlane;
  output: {
    format: 'realtime' | 'batch' | 'streaming';
    target?: string; // DAW, file, network, etc.
  };

  /**
   * Start realization process
   */
  start(): Promise<void>;

  /**
   * Stop realization process
   */
  stop(): Promise<void>;

  /**
   * Get current frame
   */
  getCurrentFrame(): RealizedFrame;

  /**
   * Subscribe to frame updates (for real-time UI)
   */
  onFrameUpdate(callback: (frame: RealizedFrame) => void): void;

  /**
   * Subscribe to convergence events
   */
  onConvergence(callback: (point: ConvergencePoint) => void): void;
}

// =============================================================================
// REALTIME SAFETY & PERFORMANCE
// =============================================================================

/**
 * Realtime-safe memory pool for musical events
 */
export interface RealtimeEventPool {
  capacity: number;
  allocated: number;

  /**
   * Allocate event (must be called in realtime thread)
   */
  allocate(): MusicalEvent | null;

  /**
   * Return event to pool (must be called in realtime thread)
   */
  deallocate(event: MusicalEvent): void;

  /**
   * Pre-allocate events (called in setup thread)
   */
  preAllocate(count: number): void;
}

/**
 * Lock-free queue for frame passing between threads
 */
export interface LockFreeFrameQueue {
  capacity: number;

  /**
   * Push frame (realtime thread)
   */
  push(frame: RealizedFrame): boolean;

  /**
   * Pop frame (processing thread)
   */
  pop(): RealizedFrame | null;

  /**
   * Check if queue is full
   */
  isFull(): boolean;

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean;
}

// =============================================================================
// FLUTTER/DAW INTEGRATION TYPES
// =============================================================================

/**
 * Visualization data for Flutter UI
 */
export interface LayerVisualization {
  layerId: string;
  role: MusicalRole;
  color: string;
  events: Array<{
    startTime: number;
    duration: number;
    pitch?: number;
    intensity: number;
  }>;
  register: RegisterRange;
  energy: number;
}

/**
 * DAW-specific track export format
 */
export interface DAWTrackExport {
  format: 'ableton' | 'logic' | 'protools' | 'cubase' | 'generic-midi';
  tracks: Array<{
    name: string;
    instrument: string;
    midiData: ArrayBuffer;
    automation: Array<{
      parameter: string;
      points: Array<{ time: number; value: number }>;
    }>;
  }>;
  tempo: number;
  timeSignature: [number, number];
  duration: number;
}

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export type {
  // Core time and role types
  MusicalTime,
  TimeRange,
  MusicalRole,
  RegisterRange,

  // Musical material types
  MusicalEvent,
  MusicalMaterial,

  // Field types
  IntensityField,
  CoincidenceField,
  ConvergencePoint,
  UnifiedResultant,

  // Generator and orchestration types
  GeneratorSet,
  InstrumentSpec,
  OrchestraField,

  // Realization layer types
  RealizedLayer,
  ConvergenceHints,
  RealizedFrame,
  TrackProjection,
  TrackSet,

  // Traversal and planning types
  TraversalPlan,
  ReleasePlan,

  // Core realization types
  RealizationPlane,
  RealizationState,
  RealizationEngine,

  // Performance types
  RealtimeEventPool,
  LockFreeFrameQueue,

  // Integration types
  LayerVisualization,
  DAWTrackExport,
};