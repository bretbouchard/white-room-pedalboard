/**
 * Realized Ensemble - Derived execution output with stable IDs
 *
 * This is NOT user-authored content. It is derived from:
 * - SchillingerSong theory systems
 * - Role bindings
 * - Orchestration system
 * - Register motion decisions
 *
 * Emitted by realizeSong() alongside SongModel.
 *
 * @module types/realized-ensemble
 */

// =============================================================================
// REALIZED ENSEMBLE MODEL
// =============================================================================

/**
 * RealizedEnsembleModel_v1 - Derived ensemble execution model
 *
 * This represents the actual voices/instruments that will produce sound,
 * with stable IDs for binding to instruments, plugins, or audio routes.
 *
 * KEY PRINCIPLE: This is separate from SchillingerSong_v1.ensembleModel
 * - Authored Ensemble (SchillingerSong) = user intent / theory layer
 * - Realized Ensemble (this) = execution identity / output layer
 *
 * The realized ensemble is derived from:
 * 1. Role-to-system bindings
 * 2. Orchestration system preferences
 * 3. Register motion decisions
 * 4. Voice count calculations
 *
 * IDs are stable across regenerations when musical identity is preserved.
 */
export interface RealizedEnsembleModel_v1 {
  /** Version identifier for serialization/deserialization */
  version: "1.0";

  /** Stable ensemble ID - unique per realization */
  ensembleId: string;

  /** All ensemble members (voices/instruments) */
  members: RealizedEnsembleMember[];
}

// =============================================================================
// ENSEMBLE MEMBER
// =============================================================================

/**
 * RealizedEnsembleMember - Single voice/instrument in the ensemble
 *
 * Each member has:
 * - Stable ID for binding (persists across regenerations)
 * - Musical function (semantic role)
 * - Voice specification (range, density, articulation)
 * - Orchestration (register, doubling, spatial)
 * - Source traceability (which systems produced this voice)
 */
export interface RealizedEnsembleMember {
  /**
   * STABLE ID - Critical for binding persistence
   *
   * This ID must:
   * - Remain constant across regenerations (same seed + same musical identity)
   * - Change when musical identity changes (different role, function, orchestration)
   * - Be content-based (deterministic hash of identity)
   *
   * Format: `member_[a-f0-9]{8}` (8-character hex suffix)
   *
   * Example: `member_3a7f2c9e`
   */
  id: string;

  /**
   * Musical function - semantic role in the ensemble
   *
   * This describes WHAT the member does musically, not HOW.
   * Used by hosts for intelligent voice routing and display.
   */
  function: MusicalFunction;

  /**
   * Source traceability - which theory systems produced this member
   *
   * Enables round-trip editing, reconciliation, and explanation.
   * Hosts can trace member origin back to user-authored systems.
   */
  source: EnsembleSource;

  /**
   * Voice specification - musical characteristics
   *
   * Defines the voice's musical behavior and requirements.
   * Used for rendering decisions and constraint enforcement.
   */
  voiceSpec: VoiceSpec;

  /**
   * Orchestration specification - register and deployment
   *
   * Defines where the voice sits in the texture and how it's deployed.
   * Used for mixing, spatialization, and orchestration decisions.
   */
  orchestration: OrchestrationSpec;
}

// =============================================================================
// MUSICAL FUNCTION
// =============================================================================

/**
 * MusicalFunction - Semantic role of an ensemble member
 *
 * These are the standard Schillinger System functional classifications.
 * They describe WHAT a voice does, not its timbre or specific part.
 *
 * Mapping:
 * - **pulse**: Rhythmic foundation (drums, percussion, bass)
 * - **foundation**: Harmonic foundation (bass, chords, pad)
 * - **motion**: Melodic/linear motion (lead, counter-melody)
 * - **ornament**: Decorative/embellishment (trills, grace notes)
 * - **texture**: Textural reinforcement (layers, pads)
 * - **accent**: Emphasis/climax (risers, impacts)
 * - **noise**: Noise-based elements (hi-hat, snare, cymbals)
 * - **voice**: General/default (fallback)
 *
 * Hosts can use these for:
 * - Intelligent instrument selection
 * - Voice grouping and display
 * - Smart routing to tracks/stems
 */
export type MusicalFunction =
  | "pulse"
  | "foundation"
  | "motion"
  | "ornament"
  | "texture"
  | "accent"
  | "noise"
  | "voice";

// =============================================================================
// SOURCE TRACEABILITY
// =============================================================================

/**
 * EnsembleSource - Traceability back to theory systems
 *
 * Records which Schillinger Book I-V systems produced this member.
 * Enables:
 * - Round-trip editing (classify edits by source)
 * - Reconciliation (explain changes when systems differ)
 * - Explanation (show user why member exists)
 * - Debugging (trace member origin)
 *
 * Example:
 * {
 *   rhythmSystemIds: ["book1_rhythm_resultants_3_4"],
 *   melodySystemIds: ["book2_contour_a"],
 *   harmonySystemIds: ["book3_axis_progression_ii_v"],
 *   formSectionIds: ["book4_section_A"]
 * }
 */
export interface EnsembleSource {
  /** Rhythm system IDs from Book I (rhythmic resultants, interference) */
  rhythmSystemIds: string[];

  /** Melody system IDs from Book II (contour, generators) */
  melodySystemIds: string[];

  /** Harmony system IDs from Book III (axis, progression, voice-leading) */
  harmonySystemIds: string[];

  /** Form section IDs from Book IV (sections, phrase boundaries) */
  formSectionIds: string[];
}

// =============================================================================
// VOICE SPECIFICATION
// =============================================================================

/**
 * VoiceSpec - Musical characteristics of a voice
 *
 * Defines the voice's musical requirements and behavior.
 * Used for rendering decisions and constraint enforcement.
 *
 * These are NOT instrument presets - they are abstract musical
 * specifications that hosts can map to specific instruments/sounds.
 */
export interface VoiceSpec {
  /**
   * Pitch range - allowable MIDI note range
   *
   * All notes emitted for this voice must be within this range.
   * Hosts should clamp or transpose notes outside this range.
   *
   * Example:
   * {
   *   min: 36,  // C2 - bass guitar low note
   *   max: 60   // C4 - bass guitar high note
   * }
   */
  pitchRange: {
    min: number;
    max: number;
  };

  /**
   * Density - note event density
   *
   * Describes how many notes per unit time:
   * - sparse: Low density (quarter notes, half notes)
   * - medium: Moderate density (eighth notes)
   * - dense: High density (sixteenth notes, thirty-second notes)
   *
   * Used for rendering decisions and CPU management.
   */
  density: "sparse" | "medium" | "dense";

  /**
   * Articulation - note connection style
   *
   * - legato: Notes connect smoothly (overlapping)
   * - staccato: Notes are short/separated
   * - mixed: Variable articulation
   *
   * Used for envelope and duration decisions.
   */
  articulation: "legato" | "staccato" | "mixed";

  /**
   * Polyphony - maximum simultaneous notes
   *
   * 1 = monophonic (single note at a time)
   * 2+ = polyphonic (chords, clusters)
   *
   * Used for voice allocation and constraint enforcement.
   */
  polyphony: number;
}

// =============================================================================
// ORCHESTRATION SPECIFICATION
// =============================================================================

/**
 * OrchestrationSpec - Register and deployment of a voice
 *
 * Defines where the voice sits in the texture and how it's deployed.
 * Used for mixing, spatialization, and orchestration decisions.
 */
export interface OrchestrationSpec {
  /**
   * Register - frequency range classification
   *
   * - low: Bass, foundation (< ~150 Hz)
   * - mid: Middle range (~150 Hz - ~1 kHz)
   * - high: High frequency (> ~1 kHz)
   *
   * Used for EQ, mixing, and frequency balancing.
   */
  register: "low" | "mid" | "high";

  /**
   * Doubling - how many instances of this voice
   *
   * 1 = single instance
   * 2+ = doubled/tripled (unison octaves, layering)
   *
   * Used for orchestration thickness and tone color.
   */
  doubling: number;

  /**
   * Spatial hint - optional spatial positioning
   *
   * - mono: Centered/mono
   * - wide: Spread stereo (hard pan L/R)
   * - cluster: Narrow cluster (centered width)
   *
   * Used for spatialization and mix width.
   * Optional because not all hosts support spatial audio.
   */
  spatialHint?: "mono" | "wide" | "cluster";
}
