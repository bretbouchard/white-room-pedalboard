/**
 * Schillinger SDK 2.1 - Schema Type Definitions
 *
 * TypeScript types matching JSON Schema definitions for all SDK 2.1 entities.
 * These types provide compile-time type safety for runtime JSON validation.
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type UUID = string;
export type Timestamp = number; // Unix timestamp in milliseconds

export type InstrumentType =
  | "LocalGal"
  | "KaneMarco"
  | "KaneMarcoAether"
  | "KaneMarcoAetherString"
  | "NexSynth"
  | "SamSampler"
  | "DrumMachine";

export type EffectType =
  | "compressor"
  | "limiter"
  | "gate"
  | "expander"
  | "parametric_eq"
  | "graphic_eq"
  | "lowpass_filter"
  | "highpass_filter"
  | "bandpass_filter"
  | "reverb"
  | "delay"
  | "chorus"
  | "flanger"
  | "phaser"
  | "overdrive"
  | "distortion"
  | "bitcrusher"
  | "tremolo"
  | "vibrato"
  | "auto_pan";

export type RoleType = "primary" | "secondary" | "tertiary";
export type FunctionalClass =
  | "foundation"
  | "motion"
  | "ornament"
  | "reinforcement";
export type BusType = "voice" | "mix" | "master";
export type InterpolationType = "linear" | "curve" | "step";
export type TransportState = "stopped" | "playing" | "paused";

// =============================================================================
// THEORY LAYER - SchillingerSong_v1
// =============================================================================

export interface SchillingerSong {
  version: "1.0";
  id: UUID;
  createdAt: Timestamp;
  modifiedAt: Timestamp;
  author: string;
  name: string;
  seed: number; // PRNG seed for reproducibility (0 to 2^32-1)

  // Book Systems
  book1?: RhythmSystem[];
  book2?: MelodySystem[];
  book3?: HarmonySystem[];
  book4: FormSystem;
  book5?: OrchestrationSystem[];

  // Ensemble & Bindings
  ensemble: EnsembleModel;
  bindings: BindingModel;
  constraints: ConstraintModel;

  // Instrument Assignments
  instrumentAssignments?: InstrumentAssignment[];
  presets?: PresetAssignment[];

  // Console/Mixing
  console: ConsoleModel;

  // Automation
  automation?: AutomationTimeline;
}

// =============================================================================
// BOOK I - RHYTHM
// =============================================================================

export interface RhythmSystem {
  id: UUID;
  type: "resultant" | "permutation" | "density";
  generators: Generator[];
  resultant?: Record<string, unknown>;
  permutations?: number[][];
  density?: number; // 0-1
}

export interface Generator {
  period: number; // >= 1
  phaseOffset: number; // >= 0
}

// =============================================================================
// BOOK II - MELODY
// =============================================================================

export interface MelodySystem {
  id: UUID;
  type: "pitch_cycle" | "interval_seed";
  cycleLength?: number; // >= 1
  intervalSeeds?: number[][];
  contour?: Record<string, unknown>;
  register?: Record<string, unknown>;
}

// =============================================================================
// BOOK III - HARMONY
// =============================================================================

export interface HarmonySystem {
  id: UUID;
  type: "distribution" | "chord_class";
  distribution?: Record<string, unknown>;
  chordClass?: string;
  harmonicRhythm?: UUID; // References RhythmSystem
}

// =============================================================================
// BOOK IV - FORM
// =============================================================================

export interface FormSystem {
  id: UUID;
  ratioTree: number[];
  sections?: FormSection[];
}

export interface FormSection {
  id: UUID;
  name: string;
  ratio: number;
}

// =============================================================================
// BOOK V - ORCHESTRATION
// =============================================================================

export interface OrchestrationSystem {
  id: UUID;
  type: "role_assignment" | "register" | "density" | "reinforcement";
  roleHierarchy?: Record<string, unknown>;
  functionalClasses?: string[];
  register?: Record<string, unknown>;
  density?: Record<string, unknown>;
  reinforcement?: Record<string, unknown>;
}

// =============================================================================
// ENSEMBLE MODEL
// =============================================================================

export interface EnsembleModel {
  version: "1.0";
  id: UUID;
  voices: Voice[];
  voiceCount: number; // 1-100
  groups?: VoiceGroup[];
  balance?: BalanceRules;
}

export interface Voice {
  id: UUID;
  name: string;
  rolePools: RolePool[];
  groupIds: UUID[];
}

export interface VoiceGroup {
  id: UUID;
  name: string;
  voiceIds: UUID[];
}

export interface RolePool {
  role: RoleType;
  functionalClass: FunctionalClass;
  enabled: boolean;
}

export interface BalanceRules {
  priority?: number[];
  limits?: {
    maxVoices: number; // 1-100
    maxPolyphony: number; // 1-200
  };
}

// =============================================================================
// BINDINGS & CONSTRAINTS
// =============================================================================

export interface BindingModel {
  rhythmBindings?: UUID[];
  melodyBindings?: UUID[];
  harmonyBindings?: UUID[];
}

export interface ConstraintModel {
  constraints: Record<string, unknown>[];
}

// =============================================================================
// CONSOLE/MIXING MODEL
// =============================================================================

export interface ConsoleModel {
  version: "1.0";
  id: UUID;
  voiceBusses: Bus[];
  mixBusses: Bus[];
  masterBus: Bus;
  sendEffects?: SendEffect[];
  routing: RoutingMatrix;
  metering?: MeteringConfig;
}

export interface Bus {
  id: UUID;
  name: string;
  type: BusType;
  inserts: EffectSlot[];
  gain: number; // -inf to 0 dB
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
}

export interface EffectSlot {
  id: UUID;
  effectType: EffectType;
  enabled: boolean;
  bypassed: boolean;
  parameters: Record<string, number>;
  automation?: string;
}

export interface SendEffect {
  id: UUID;
  busId: UUID;
  effectType: EffectType;
  enabled: boolean;
  parameters: Record<string, number>;
  sends: Send[];
}

export interface Send {
  sourceBusId: UUID;
  level: number; // -inf to 0 dB
  pan: number; // -1 to 1
}

export interface RoutingMatrix {
  routes: Route[];
}

export interface Route {
  sourceBusId: UUID;
  destinationBusId: UUID;
  level: number; // -inf to 0 dB
  enabled: boolean;
}

export interface MeteringConfig {
  enabled?: boolean;
  refreshRate?: number; // 10-60 Hz
  meterType?: "peak" | "rms" | "both";
  holdTime?: number; // ms
}

// =============================================================================
// REALIZATION LAYER - SongModel_v1
// =============================================================================

export interface SongModel {
  version: "1.0";
  id: UUID;
  sourceSongId: UUID; // SchillingerSong_v1 ID
  derivationId: UUID; // DerivationRecord_v1 ID

  // Content
  timeline: TimelineIR;
  notes: NoteEvent[];
  automations?: AutomationEvent[];

  // Metadata
  duration: number; // Samples
  tempo: number; // BPM (exclusiveMinimum: 0, maximum: 500)
  timeSignature: [number, number]; // [numerator, denominator]
  sampleRate: number; // 44100 | 48000 | 96000

  // Voice Assignments
  voiceAssignments: VoiceAssignment[];

  // Console State
  console: ConsoleModel;

  // Presets
  presets?: PresetAssignment[];

  // Derived At
  derivedAt: Timestamp;

  // Performance Universes
  performances: PerformanceState[];
  activePerformanceId?: UUID;
}

export interface TimelineIR {
  sections: TimelineSection[];
  tempo: number;
  timeSignature: [number, number];
}

export interface TimelineSection {
  id: UUID;
  name: string;
  startTime: number; // Samples
  duration: number; // Samples
  tempo: number;
  timeSignature: [number, number];
}

export interface NoteEvent {
  id: UUID;
  voiceId: UUID;
  startTime: number; // Samples
  duration: number; // Samples
  pitch: number; // 0-127 (MIDI note)
  velocity: number; // 0-1
  derivation?: {
    systemType: "rhythm" | "melody" | "harmony";
    systemId: UUID;
    confidence: number; // 0-1
  };
}

export interface AutomationEvent {
  id: UUID;
  target: string;
  time: number; // Samples
  value: number;
  interpolation?: InterpolationType;
}

export interface VoiceAssignment {
  voiceId: UUID;
  instrumentId: InstrumentType;
  presetId: string;
  busId: UUID;
}

// =============================================================================
// PRESETS & INSTRUMENTS
// =============================================================================

export interface PresetAssignment {
  instrumentType: InstrumentType;
  presetId: string;
}

export interface InstrumentAssignment {
  voiceId: UUID;
  instrumentType: InstrumentType;
  presetId: string;
  busId: UUID;
}

export interface Preset {
  version: "1.0";
  id: UUID;
  instrumentType: InstrumentType;
  name: string;
  parameters: Record<string, PresetParameter>;
  metadata?: PresetMetadata;
}

export interface PresetParameter {
  value: number;
  min: number;
  max: number;
  default: number;
  automationEnabled: boolean;
}

export interface PresetMetadata {
  author?: string;
  description?: string;
  tags?: string[];
  createdAt?: Timestamp;
  modifiedAt?: Timestamp;
}

// =============================================================================
// AUTOMATION
// =============================================================================

export interface AutomationTimeline {
  version: "1.0";
  tracks: AutomationTrack[];
}

export interface AutomationTrack {
  id: UUID;
  target: string;
  events: AutomationPoint[];
  interpolation: InterpolationType;
}

export interface AutomationPoint {
  time: number; // Samples
  value: number;
  curve?: number; // Curve tension for curve interpolation
}

// =============================================================================
// RECONCILIATION LAYER
// =============================================================================

export interface DerivationRecord {
  version: "1.0";
  id: UUID;
  sourceSongId: UUID; // SchillingerSong_v1
  resultSongId: UUID; // SongModel_v1
  seed: number;

  executedAt: Timestamp;
  executionOrder: SystemExecution[];
  duration: number; // ms

  outputs: DerivationOutput[];
  constraints: ConstraintApplication[];
}

export interface SystemExecution {
  systemType: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  systemId: UUID;
  executedAt: Timestamp;
  duration: number; // ms
  inputs: unknown;
  outputs: UUID[];
}

export interface DerivationOutput {
  id: UUID;
  type: "note" | "automation" | "section";
  sourceSystem: UUID;
  sourceConfidence: number; // 0-1
  metadata: unknown;
}

export interface ConstraintApplication {
  constraintId: UUID;
  appliedAt: number; // Stage in execution
  effect: string;
}

export interface ReconciliationReport {
  version: "1.0";
  id: UUID;
  editedSongId: UUID; // SongModel_v1
  originalSongId: UUID; // SchillingerSong_v1
  generatedAt: Timestamp;

  editClassification: EditClassification;
  confidenceSummary: ConfidenceSummary;
  systemMatches: SystemMatch[];
  losses: LossReport[];
  suggestedActions: SuggestedAction[];
}

export interface EditClassification {
  decorative: number;
  structural: number;
  destructive: number;
}

export interface ConfidenceSummary {
  rhythm: number; // 0-1
  melody: number; // 0-1
  harmony: number; // 0-1
  form: number; // 0-1
  orchestration: number; // 0-1
  overall: number; // 0-1
}

export interface SystemMatch {
  systemType: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  systemId: UUID;
  confidence: number; // 0-1
  suggestedParameters: unknown;
  ambiguous: boolean;
  alternatives?: SystemMatch[];
}

export interface LossReport {
  category: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  description: string;
  impact: "low" | "medium" | "high";
  recoverable: boolean;
}

export interface SuggestedAction {
  action: "update_theory" | "preserve_realization" | "manual_review";
  target: string;
  reason: string;
  confidence: number; // 0-1
}

// =============================================================================
// PLAYBACK LAYER
// =============================================================================

export interface PlaybackState {
  version: "1.0";

  transport: {
    state: TransportState;
    playheadPosition: number; // Samples
    loopEnabled: boolean;
    loopStart: number; // Samples
    loopEnd: number; // Samples
  };

  activeVoices: ActiveVoice[];

  metering: {
    voiceBusses: Record<string, MeterLevel>;
    mixBusses: Record<string, MeterLevel>;
    masterBus: MeterLevel;
  };

  performance: {
    cpuUsage: number; // 0-1
    dropoutCount: number;
    latency: number; // ms
  };
}

export interface ActiveVoice {
  voiceId: UUID;
  instrumentId: InstrumentType;
  noteId: UUID;
  startedAt: number; // Samples
  duration: number; // Samples
  pitch: number;
  velocity: number;
}

export interface MeterLevel {
  peak: number; // -inf to 0 dB
  rms: number; // -inf to 0 dB
  peakHold: number; // -inf to 0 dB
}

// =============================================================================
// VERSIONING & MIGRATION
// =============================================================================

export interface SchemaVersion {
  version: string;
  migrationPath?: string;
  breakingChanges: string[];
}

export interface MigrationResult<T = unknown> {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  warnings: string[];
  migratedData?: T;
}

// =============================================================================
// PERFORMANCE LAYER - PerformanceState_v1
// =============================================================================

/**
 * Arrangement style enumeration for musical performances
 * Defines common musical ensemble configurations
 */
export enum ArrangementStyle {
  SOLO_PIANO = "SOLO_PIANO",
  SATB = "SATB",
  CHAMBER_ENSEMBLE = "CHAMBER_ENSEMBLE",
  FULL_ORCHESTRA = "FULL_ORCHESTRA",
  JAZZ_COMBO = "JAZZ_COMBO",
  JAZZ_TRIO = "JAZZ_TRIO",
  ROCK_BAND = "ROCK_BAND",
  AMBIENT_TECHNO = "AMBIENT_TECHNO",
  ELECTRONIC = "ELECTRONIC",
  ACAPPELLA = "ACAPPELLA",
  STRING_QUARTET = "STRING_QUARTET",
  CUSTOM = "CUSTOM",
}

/**
 * Instrument assignment for a specific role or track
 * Maps abstract roles to concrete instruments with optional presets
 */
export interface InstrumentAssignment {
  instrumentId: string;
  presetId?: string;
  parameters?: Record<string, number>;
}

/**
 * Mix target for a specific role or track
 * Defines gain, pan, and stereo configuration
 */
export interface MixTarget {
  gain: number; // dB
  pan: number; // -1..1
  stereo?: boolean;
}

/**
 * PerformanceState - Represents a parallel performance universe
 * One song can have many performances (Piano, SATB, Techno, etc.)
 *
 * SongState (what the song is) + PerformanceState (how it's realized) → Playable graph
 */
export interface PerformanceState {
  version: "1";
  id: UUID;
  name: string;
  arrangementStyle: ArrangementStyle;
  density: number; // 0..1
  grooveProfileId: string;
  instrumentationMap: Record<string, InstrumentAssignment>;
  consoleXProfileId: string;
  mixTargets: Record<string, MixTarget>;
  createdAt: string; // ISO 8601
  modifiedAt: string; // ISO 8601
  metadata?: Record<string, unknown>;
}
