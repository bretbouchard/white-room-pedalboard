/**
 * SongModel_v1 Type Definition
 *
 * Frozen, execution-ready song model for deterministic audio integration.
 * This is the core contract between SDK musical intelligence and audio engine execution.
 *
 * @module types/song-model
 */

import type { RealizationTime } from "./realization";

// =============================================================================
// CORE SONG MODEL
// =============================================================================

/**
 * SongModel_v1 - Complete frozen song specification
 *
 * This model contains everything required for deterministic playback:
 * - Musical structure (sections, roles)
 * - Transport configuration (tempo, time signatures)
 * - Audio routing (mix graph, projections)
 * - Realization policy (lookahead, determinism)
 *
 * Once playback starts, model is immutable. Changes only via SongDiff.
 */
export interface SongModel_v1 {
  /** Version identifier for serialization/deserialization */
  version: "1.0";

  /** Unique model identifier */
  id: string;

  /** Creation timestamp */
  createdAt: number;

  /** Song metadata */
  metadata: SongMetadata;

  /** Transport and time configuration */
  transport: TransportConfig;

  /** Musical sections */
  sections: Section_v1[];

  /** Musical roles (bass, harmony, melody, etc.) */
  roles: Role_v1[];

  /** Projections mapping roles to audio targets */
  projections: Projection_v1[];

  /** Audio routing configuration */
  mixGraph: MixGraph_v1;

  /** Realization behavior policy */
  realizationPolicy: RealizationPolicy;

  /** Seed for deterministic realization */
  determinismSeed: string;
}

// =============================================================================
// METADATA
// =============================================================================

export interface SongMetadata {
  title: string;
  composer?: string;
  description?: string;
  genre?: string;
  duration?: number; // seconds
  key?: string;
  custom?: Record<string, unknown>;
}

// =============================================================================
// TRANSPORT CONFIGURATION
// =============================================================================

export interface TransportConfig {
  /** Tempo changes over time */
  tempoMap: TempoEvent[];

  /** Time signature changes over time */
  timeSignatureMap: TimeSignatureEvent[];

  /** Loop configuration */
  loopPolicy: LoopPolicy;

  /** Playback speed multiplier (1.0 = normal) */
  playbackSpeed: number;
}

export interface TempoEvent {
  time: RealizationTime;
  tempo: number; // BPM
}

export interface TimeSignatureEvent {
  time: RealizationTime;
  numerator: number;
  denominator: number;
}

export interface LoopPolicy {
  enabled: boolean;
  start?: RealizationTime;
  end?: RealizationTime;
  count?: number; // -1 = infinite
}

// =============================================================================
// SECTIONS
// =============================================================================

export interface Section_v1 {
  id: string;
  name: string;
  start: RealizationTime;
  end: RealizationTime;
  roles: string[]; // role IDs active in this section
  realizationHints?: Record<string, unknown>;
}

// =============================================================================
// ROLES
// =============================================================================

export interface Role_v1 {
  id: string;
  name: string;
  type: "bass" | "harmony" | "melody" | "rhythm" | "texture" | "ornament";
  generatorConfig: GeneratorConfig;
  parameters: RoleParameters;
}

export interface GeneratorConfig {
  generators: [number, number];
  parameters: Record<string, unknown>;
}

export interface RoleParameters {
  enabled?: boolean;
  volume?: number;
  pan?: number;
  custom?: Record<string, unknown>;
}

// =============================================================================
// PROJECTIONS
// =============================================================================

export interface Projection_v1 {
  id: string;
  roleId: string;
  target: ProjectionTarget;
  transform?: TransformConfig;
}

export interface ProjectionTarget {
  type: "track" | "bus" | "instrument";
  id: string;
}

export interface TransformConfig {
  transpose?: number;
  velocityMultiplier?: number;
  custom?: Record<string, unknown>;
}

// =============================================================================
// MIX GRAPH
// =============================================================================

export interface MixGraph_v1 {
  tracks: TrackConfig[];
  buses: BusConfig[];
  sends: SendConfig[];
  master: MasterConfig;
}

export interface TrackConfig {
  id: string;
  name: string;
  volume?: number;
  pan?: number;
  bus?: string;
  instrumentId?: string;
  custom?: Record<string, unknown>;
}

export interface BusConfig {
  id: string;
  name: string;
  volume?: number;
  pan?: number;
  custom?: Record<string, unknown>;
}

export interface SendConfig {
  fromTrack: string;
  toBus: string;
  amount: number; // 0.0 to 1.0
}

export interface MasterConfig {
  volume: number;
  bus?: string;
  custom?: Record<string, unknown>;
}

// =============================================================================
// REALIZATION POLICY
// =============================================================================

export interface RealizationPolicy {
  windowSize: RealizationTime;
  lookaheadDuration: RealizationTime;
  determinismMode: "strict" | "seeded" | "loose";
}

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface SongModelValidationResult {
  isValid: boolean;
  errors: SongModelValidationError[];
  warnings: SongModelValidationWarning[];
}

export interface SongModelValidationError {
  code: string;
  message: string;
  path: string; // JSON path to error location
  severity: "error";
}

export interface SongModelValidationWarning {
  code: string;
  message: string;
  path: string;
  severity: "warning";
}

// =============================================================================
// SONG MODEL V2 - LLVM ARCHITECTURE COMPLIANT
// =============================================================================

/**
 * SongModel_v2 - Musical structure WITHOUT transport
 *
 * This is the LLVM-style architecture-compliant version of SongModel.
 * It contains ONLY musical structure (what to play), not timing (when to play).
 *
 * Architectural Rules:
 * - NO transport property (moved to TimelineModel)
 * - NO playbackSpeed (execution concern, not musical structure)
 * - Immutable by default (changes via SongDiff)
 * - Pure musical meaning: sections, roles, projections
 *
 * Use SongModel_v2 when:
 * - Working with multi-song timelines
 * - Separating musical structure from execution timing
 * - Following LLVM-style architecture principles
 *
 * Part of: LLVM-Style Core Architecture
 * See: SDK_HANDOFF_ADDENDUM_LLVM_TIMELINE.md
 */
export interface SongModel_v2 {
  /** Version identifier */
  version: "2.0";

  /** Unique model identifier */
  id: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  updatedAt: number;

  /** Song metadata */
  metadata: SongMetadata;

  /** Musical sections */
  sections: Section_v1[];

  /** Musical roles (bass, harmony, melody, etc.) */
  roles: Role_v1[];

  /** Projections mapping roles to audio targets */
  projections: Projection_v1[];

  /** Audio routing configuration */
  mixGraph: MixGraph_v1;

  /** Realization behavior policy */
  realizationPolicy: RealizationPolicy;

  /** Seed for deterministic realization */
  determinismSeed: string;

  /** Version 2 extensions */
  v2Extensions?: SongModel_v2Extensions;
}

/**
 * SongModel v2 Extensions
 * Additional properties for v2 functionality
 */
export interface SongModel_v2Extensions {
  /** Custom tags for categorization */
  tags?: string[];

  /** Linked timelines (if this song is part of multiple timelines) */
  linkedTimelineIds?: string[];

  /** Additional metadata not in v1 */
  customExtensions?: Record<string, unknown>;
}

// =============================================================================
// MIGRATION FUNCTIONS: v1 → v2
// =============================================================================

/**
 * Migrate SongModel_v1 to SongModel_v2
 *
 * Extracts musical structure from v1, removing transport concepts.
 * The transport configuration can be moved to a TimelineModel.
 *
 * @param v1 - SongModel_v1 to migrate
 * @returns SongModel_v2 without transport property
 */
export function migrateSongModel_v1_to_v2(v1: SongModel_v1): SongModel_v2 {
  const { _transport, _playbackSpeed, ...rest } = v1 as any;

  return {
    ...rest,
    version: "2.0",
    updatedAt: Date.now(),
    // Transport is intentionally excluded
    v2Extensions: {
      tags: [],
      linkedTimelineIds: [],
    },
  };
}

/**
 * Extract TimelineModel from SongModel_v1
 *
 * Creates a TimelineModel containing the v1 song's transport configuration
 * and places the song as the first (and only) instance on the timeline.
 *
 * Note: Returns a plain object matching TimelineModel structure.
 * Import from @schillinger-sdk/core for proper typing.
 *
 * @param v1 - SongModel_v1 with transport
 * @param timelineId - Optional custom timeline ID
 * @returns Plain object with timeline structure and v2 model
 */
export function extractTimelineFrom_v1(
  v1: SongModel_v1,
  timelineId?: string,
): { timeline: any; v2: SongModel_v2 } {
  const v2 = migrateSongModel_v1_to_v2(v1);

  // Return plain object matching TimelineModel structure
  // Import TimelineModel type from @schillinger-sdk/core for proper typing
  const timeline = {
    version: "1.0",
    id: timelineId || `${v1.id}-timeline`,
    createdAt: v1.createdAt,
    updatedAt: Date.now(),
    transport: v1.transport,
    songInstances: [
      {
        instanceId: `${v1.id}-instance`,
        songModel: v2,
        entryBar: 0,
        phaseOffset: { bars: 0, beats: 0, sixteenths: 0 },
        gain: 1.0,
        state: "armed",
      },
    ],
    interactionRules: [],
    metadata: {
      title: `${v1.metadata.title} - Timeline`,
      composer: v1.metadata.composer,
    },
  };

  return { timeline, v2 };
}

/**
 * Merge TimelineModel with SongModel to create v1
 *
 * For backwards compatibility: combines a TimelineModel's transport
 * with a SongModel_v2 to create a SongModel_v1.
 *
 * @param v2 - SongModel_v2 (musical structure)
 * @param timeline - TimelineModel (transport info)
 * @returns SongModel_v1 with transport
 */
export function mergeTimelineWithSong(
  v2: SongModel_v2,
  timeline: any, // TimelineModel from core package
): SongModel_v1 {
  return {
    ...v2,
    version: "1.0",
    transport: timeline.transport,
  } as SongModel_v1;
}

// =============================================================================
// TRANSPORT CONFIG V2 (without playbackSpeed)
// =============================================================================

/**
 * TransportConfig_v2 - Timeline transport without playback concerns
 *
 * This is the transport configuration that belongs in TimelineModel.
 * It does NOT include playbackSpeed, which is an execution concern.
 *
 * @deprecated Use TimelineModel.TransportConfig from @schillinger-sdk/core instead
 */
export interface TransportConfig_v2 {
  /** Tempo changes over time */
  tempoMap: TempoEvent[];

  /** Time signature changes over time */
  timeSignatureMap: TimeSignatureEvent[];

  /** Loop configuration */
  loopPolicy: LoopPolicy;

  // ❌ NO playbackSpeed - that's a playback parameter, not musical structure
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for SongModel_v1
 */
export function isSongModel_v1(model: any): model is SongModel_v1 {
  return model?.version === "1.0";
}

/**
 * Type guard for SongModel_v2
 */
export function isSongModel_v2(model: any): model is SongModel_v2 {
  return model?.version === "2.0";
}

/**
 * Get song model version
 */
export function getSongModelVersion(
  model: SongModel_v1 | SongModel_v2,
): "1.0" | "2.0" {
  return model.version;
}
