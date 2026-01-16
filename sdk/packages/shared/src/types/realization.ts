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
 * Detailed musical time representation with precision support (for realization layer)
 */
export interface RealizationTime {
  /** Total seconds since start */
  seconds: number;
  /** Beats since start (if tempo known) */
  beats?: number;
  /** Measures since start (if time signature known) */
  measures?: number;
  /** Tempo in BPM (if known) */
  tempo?: number;
  /** Precision for audio processing */
  precision?: "seconds" | "samples" | "ticks" | "beats";
}

/**
 * Time range for sliding window operations
 */
export interface TimeRange {
  start: RealizationTime;
  end: RealizationTime;
  duration: number; // in seconds

  /**
   * Check if a time point falls within this range
   */
  contains(time: RealizationTime): boolean;

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
  | "bass" // Foundation, harmonic root
  | "harmony" // Chordal support
  | "melody" // Primary melodic line
  | "counter-melody" // Secondary melodic line
  | "rhythm" // Rhythmic foundation
  | "texture" // Background/padding
  | "ornament" // Embellishments
  | "lead" // Main voice
  | "accompaniment"; // Supporting material

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
    emergent?: boolean;
    originalLayers?: string[];
    originalEvents?: MusicalEvent[];
    hierarchicalRole?: MusicalRole;
    selectionProbability?: number;
    emergentFrom?: string[];
  };
}

/**
 * Combination strategy for unified resultants
 */
export type CombinationStrategy =
  | "additive"
  | "multiplicative"
  | "convolution"
  | "emergent"
  | "hierarchical"
  | "probabilistic";

/**
 * Layer contribution to unified resultant
 */
export interface LayerContribution {
  layerId: string;
  contribution: number; // 0.0 to 1.0
  primaryRole?: boolean;
  // Additional properties for extended functionality
  weight?: number; // Contribution weight 0.0 to 1.0
  dominance?: number; // Dominance level 0.0 to 1.0
  compatibility?: number; // Compatibility with other layers
  role?: MusicalRole; // Musical role
  characteristics?: {
    density?: number;
    complexity?: number;
    energy?: number;
    register?: RegisterRange;
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
  interpolation: "linear" | "cubic" | "exponential";

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

  /**
   * Predict future convergence points
   */
  predictConvergence(currentTime: number): Array<{
    time: number;
    strength: number;
    confidence: number;
    participatingLayers: string[];
    type:
      | "climax"
      | "cadence"
      | "transition"
      | "emergence"
      | "tension"
      | "release";
  }>;
}

/**
 * Convergence point information
 */
export interface ConvergencePoint {
  time: number;
  strength: number;
  layers: string[];
  type:
    | "climax"
    | "cadence"
    | "transition"
    | "emergence"
    | "tension"
    | "release";
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
    generatorId?: string;
    role?: MusicalRole;
    originalLayers?: string[];
    originalEvents?: MusicalEvent[];
    hierarchicalRole?: MusicalRole;
    selectionProbability?: number;
    emergentFrom?: string[];
    strategy?: CombinationStrategy;
    layerContributions?: LayerContribution[];
  };
  getHierarchicalWeight?(): number;
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
  family:
    | "strings"
    | "woodwinds"
    | "brass"
    | "percussion"
    | "keyboard"
    | "electronic";
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
 * Instrument assignment result
 */
export interface InstrumentAssignment {
  layerId: string;
  instrument: InstrumentSpec;
  confidence: number; // 0.0 to 1.0
  reasons: string[]; // Why this instrument was chosen
  alternatives: Array<{
    instrument: InstrumentSpec;
    confidence: number;
  }>;
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

  /**
   * Assign instruments to layers based on their characteristics
   */
  assignInstruments(
    layerRequirements: Array<{
      layerId: string;
      role: MusicalRole;
      register: RegisterRange;
      energy: number;
      characteristics?: {
        density?: number;
        complexity?: number;
        articulation?: "legato" | "staccato" | "mixed";
      };
    }>,
    existingAssignments?: Map<string, InstrumentSpec>,
  ): InstrumentAssignment[];
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
  convergenceType?:
    | "climax"
    | "cadence"
    | "transition"
    | "emergence"
    | "tension"
    | "release";
}

/**
 * Realized frame - snapshot of musical material at specific time
 */
export interface RealizedFrame {
  time: RealizationTime;
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
 * Track projection interface for class implementation
 */
export interface ITrackProjection {
  id: string;
  name: string;
  layers: string[];
  instrument?: InstrumentSpec;
  output: {
    format: "midi" | "audio" | "daw";
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
 * Track projection configuration - data structure for track projection
 */
export type TrackProjectionConfig = ITrackProjection;

/**
 * Track set - complete mapping of layers to output tracks
 */
export interface TrackSet {
  id: string;
  tracks: TrackProjectionConfig[];
  metadata: {
    format: "daw" | "live" | "export";
    target?: string; // DAW name, output format, etc.
  };
}

/**
 * Traversal plan for moving sidewalk behavior
 */
export interface TraversalPlan {
  id: string;
  duration: RealizationTime;
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
  type: "gradual" | "sudden" | "staggered" | "cascading";
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
  realize(atTime: RealizationTime): RealizedFrame;

  /**
   * Project layers to tracks for output
   */
  project(layers: RealizedLayer[]): TrackSet;

  /**
   * Update time window position
   */
  slideWindow(newPosition: RealizationTime): void;

  /**
   * Get current state
   */
  getState(): RealizationState;
}

/**
 * Current state of realization plane
 */
export interface RealizationState {
  currentPosition: RealizationTime;
  activeLayers: string[];
  lastConvergence: ConvergencePoint | null;
  nextConvergence: ConvergencePoint | null;
  intensity: number;
  coherence: number;
}

/**
 * Layer state for track assignment
 */
export interface LayerState {
  layerId: string;
  trackId?: string;
  busId?: string;
  muted: boolean;
  soloed: boolean;
  volume: number;
  pan: number;
  armed: boolean;
  recordArm: boolean;
  monitoring: boolean;
  outputFormat: "midi" | "audio" | "daw";
  channel?: number;
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
    format: "realtime" | "batch" | "streaming";
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
  format: "ableton" | "logic" | "protools" | "cubase" | "generic-midi";
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
