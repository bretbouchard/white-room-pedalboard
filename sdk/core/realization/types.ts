/**
 * SongModel_v1 and Deterministic Audio Types
 *
 * These types define the frozen execution contract for deterministic audio engine integration.
 * Part of SDK v2.1.0 implementation for Apple TV and other platforms.
 */

// =============================================================================
// MUSICAL TIME & TIME RANGES
// =============================================================================

/**
 * Musical time representation
 */
export interface MusicalTime {
  /** Total seconds since start */
  seconds: number;
  /** Beats since start (if tempo known) */
  beats?: number;
  /** Measures since start (if time signature known) */
  measures?: number;
  /** Precision for audio processing */
  precision?: "seconds" | "samples" | "ticks";
}

/**
 * Sample time range for event emission
 */
export interface SampleTimeRange {
  startSample: number;
  endSample: number;
  sampleRate: number;
}

/**
 * Time boundary for lookahead
 */
export interface TimeBoundary {
  startTime: number;
  endTime: number;
  maxSamples: number;
}

// =============================================================================
// PARAMETER ADDRESSING
// =============================================================================

/**
 * Parameter address for event targeting
 */
export interface ParameterAddress {
  path: string; // e.g., "/role/bass/note", "/track/3/console/drive"
  scope: "role" | "track" | "bus" | "instrument" | "global";
}

// =============================================================================
// SCHEDULED EVENTS
// =============================================================================

/**
 * Event types supported by the system
 */
export type EventType =
  | "NOTE_ON"
  | "NOTE_OFF"
  | "PARAM"
  | "SECTION"
  | "TRANSPORT"
  | "AUTOMATION"
  | "CONTROL";

/**
 * Note event payload
 */
export interface NotePayload {
  pitch: number;
  velocity: number;
  duration: number;
}

/**
 * Parameter event payload
 */
export interface ParameterPayload {
  value: number;
  interpolation?: "linear" | "exponential" | "step";
  duration?: number;
}

/**
 * Section event payload
 */
export interface SectionPayload {
  sectionId: string;
  command: "enter" | "exit";
}

/**
 * Transport event payload
 */
export interface TransportPayload {
  command: "play" | "stop" | "pause" | "seek" | "tempo" | "timesig";
  value?: number;
}

/**
 * Event payload union
 */
export interface EventPayload {
  // For NOTE_ON/NOTE_OFF
  note?: NotePayload;
  // For PARAM/AUTOMATION
  parameter?: ParameterPayload;
  // For SECTION
  section?: SectionPayload;
  // For TRANSPORT
  transport?: TransportPayload;
}

/**
 * Event source information
 */
export interface EventSource {
  source: string;
  roleId?: string;
  trackId?: string;
  generatorId?: string;
  sectionId?: string;
}

/**
 * Scheduled event - deterministic audio event
 */
export interface ScheduledEvent {
  // Timing (fully resolved to samples)
  sampleTime: number;
  musicalTime?: MusicalTime;

  // Event Classification
  type: EventType;
  target: ParameterAddress;

  // Event Data
  payload: EventPayload;

  // Determinism
  deterministicId: string;
  sourceInfo: EventSource;
}

// =============================================================================
// SONMODEL TYPES
// =============================================================================

/**
 * Song metadata
 */
export interface SongMetadata {
  name: string;
  tempo: number;
  timeSignature: [number, number];
  duration?: number;
  [key: string]: any;
}

/**
 * Tempo map event
 */
export interface RealtimeTempoEvent {
  time: number; // seconds
  tempo: number; // BPM
}

/**
 * Time signature event
 */
export interface RealtimeTimeSignatureEvent {
  time: number; // seconds
  timeSignature: [number, number];
}

/**
 * Loop policy
 */
export interface RealtimeLoopPolicy {
  enabled: boolean;
  start?: number;
  end?: number;
  count?: number;
}

/**
 * Transport configuration
 */
export interface RealtimeTransportConfig {
  tempoMap: RealtimeTempoEvent[];
  timeSignatureMap: RealtimeTimeSignatureEvent[];
  loopPolicy: RealtimeLoopPolicy;
  playbackSpeed: number;
}

/**
 * Generator configuration (placeholder for now)
 */
export interface GeneratorConfig {
  type: string;
  [key: string]: any;
}

/**
 * Role parameters (placeholder for now)
 */
export interface RoleParameters {
  [key: string]: any;
}

/**
 * Musical role type
 */
export type RoleType =
  | "bass"
  | "harmony"
  | "melody"
  | "rhythm"
  | "texture"
  | "ornament";

/**
 * Section v1
 */
export interface Section_v1 {
  id: string;
  name: string;
  start: MusicalTime;
  end: MusicalTime;
  roles: string[]; // role IDs
  realizationHints?: Record<string, unknown>;
}

/**
 * Role v1
 */
export interface Role_v1 {
  id: string;
  name: string;
  type: RoleType;
  generatorConfig: GeneratorConfig;
  parameters: RoleParameters;
}

/**
 * Projection target
 */
export interface ProjectionTarget {
  type: "track" | "bus" | "instrument";
  id: string;
}

/**
 * Transform configuration
 */
export interface TransformConfig {
  [key: string]: any;
}

/**
 * Projection v1
 */
export interface Projection_v1 {
  id: string;
  roleId: string;
  target: ProjectionTarget;
  transform?: TransformConfig;
}

/**
 * Track configuration
 */
export interface TrackConfig {
  id: string;
  name: string;
  volume: number;
  pan: number;
  [key: string]: any;
}

/**
 * Bus configuration
 */
export interface BusConfig {
  id: string;
  name: string;
  volume: number;
  [key: string]: any;
}

/**
 * Send configuration
 */
export interface SendConfig {
  fromTrackId: string;
  toBusId: string;
  amount: number;
}

/**
 * Master configuration
 */
export interface MasterConfig {
  volume: number;
  [key: string]: any;
}

/**
 * Mix graph v1
 */
export interface MixGraph_v1 {
  tracks: TrackConfig[];
  buses: BusConfig[];
  sends: SendConfig[];
  master: MasterConfig;
}

/**
 * Determinism mode
 */
export type DeterminismMode = "strict" | "seeded" | "loose";

/**
 * Realization policy
 */
export interface RealizationPolicy {
  windowSize: MusicalTime;
  lookaheadDuration: MusicalTime;
  determinismMode: DeterminismMode;
}

/**
 * SongModel v1 - Frozen execution contract
 */
export interface SongModel_v1 {
  // Version & Metadata
  version: "1.0";
  id: string;
  createdAt: number;
  metadata: SongMetadata;

  // Transport & Time
  transport: RealtimeTransportConfig;

  // Musical Structure
  sections: Section_v1[];
  roles: Role_v1[];
  projections: Projection_v1[];

  // Audio Configuration
  mixGraph: MixGraph_v1;
  realizationPolicy: RealizationPolicy;

  // Determinism
  determinismSeed: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Determinism validation result
 */
export interface DeterminismValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Boundedness check result
 */
export interface BoundednessCheck {
  isBounded: boolean;
  maxSamplesEmitted: number;
  warnings?: string[];
}

// =============================================================================
// EVENT EMITTER CONFIGURATION
// =============================================================================

/**
 * Configuration for deterministic event emitter
 */
export interface EventEmitterConfig {
  seed: string;
  maxLookahead?: number; // in seconds
  cacheSize?: number;
}
