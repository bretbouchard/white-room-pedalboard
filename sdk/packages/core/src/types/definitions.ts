/**
 * Core Type Definitions - Schillinger SDK v1
 *
 * This file defines all TypeScript interfaces for the theory-first architecture.
 * These types map directly to the JSON schemas and data model specification.
 *
 * @see ../specs/schillinger-sdk-systemfirst-rewrite-20260107-084720/plan/data-model.md
 */

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * SchillingerSong_v1 - Canonical theory object
 *
 * Source of truth for all compositions. Contains only systems, parameters,
 * bindings, and constraints. Zero notes, zero events, pure theory.
 *
 * Schema version: "1.0"
 */
export interface SchillingerSong_v1 {
  // Metadata
  readonly schemaVersion: "1.0";
  readonly songId: string; // UUID v4

  // Global Parameters
  globals: {
    tempo: number; // BPM (40-300)
    timeSignature: [number, number]; // [numerator, denominator]
    key: number; // Pitch class (0-11, 0=C)
  };

  // Systems (all optional, can be empty arrays)
  bookI_rhythmSystems: RhythmSystem[];
  bookII_melodySystems: MelodySystem[];
  bookIII_harmonySystems: HarmonySystem[];
  bookIV_formSystem: FormSystem | null;
  bookV_orchestration: OrchestrationSystem;

  // Ensemble and Bindings
  ensembleModel: EnsembleModel;
  bindings: {
    roleRhythmBindings: RoleRhythmBinding[];
    roleMelodyBindings: RoleMelodyBinding[];
    roleHarmonyBindings: RoleHarmonyBinding[];
    roleEnsembleBindings: RoleEnsembleBinding[];
  };

  // Constraints and Provenance
  constraints: Constraint[];
  provenance: {
    readonly createdAt: string; // ISO 8601
    readonly createdBy: string; // User or system ID
    readonly modifiedAt: string; // ISO 8601
    readonly derivationChain: string[]; // IDs of previous versions
  };
}

/**
 * SongModel_v1 - Executable song representation
 *
 * Derived from SchillingerSong_v1 via deterministic realization.
 * Contains notes, events, timing, and voice assignments.
 */
export interface SongModel_v1 {
  // Metadata
  readonly schemaVersion: "1.0";
  readonly songId: string; // Matches SchillingerSong.songId

  // Derivation Reference
  readonly derivationId: string; // Links to DerivationRecord_v1

  // Musical Content
  notes: Note[];
  events: Event[];
  voiceAssignments: VoiceAssignment[];

  // Timing
  readonly duration: number; // Total duration in beats
  tempoChanges: TempoChange[];

  // Structure
  sections: Section[];

  // Transport properties (optional, for backward compatibility)
  // These are derived from SchillingerSong.globals during realization
  tempo?: number; // BPM from globals.tempo
  timeSignature?: [number, number]; // From globals.timeSignature
  key?: number; // From globals.key (0-11, 0=C)

  // Additional properties for backward compatibility
  sourceSongId?: string; // Links back to original SchillingerSong
  createdAt?: string; // ISO 8601 timestamp when realized
}

export interface Note {
  readonly noteId: string; // UUID
  readonly voiceId: string;
  startTime: number; // In beats
  duration: number; // In beats
  pitch: number; // MIDI note number (0-127)
  velocity: number; // 0-127
  readonly derivationSource: string; // System ID that generated this note

  // Additional property for backward compatibility
  time?: number; // Alias for startTime (for backward compatibility)
}

export interface Event {
  readonly eventId: string; // UUID
  readonly voiceId: string;
  readonly time: number; // In beats
  readonly type: "dynamic" | "articulation" | "other";
  value: unknown; // Type-specific value
}

// VoiceAssignment is also exported from theory/systems/orchestration.ts
// with a different interface. This one is for SongModel voice assignments.
export interface VoiceAssignment {
  readonly voiceId: string;
  readonly roleId: string; // Role this voice fulfills
  readonly systemIds: string[]; // Systems bound to this voice
}

export interface TempoChange {
  readonly time: number; // In beats
  tempo: number; // New tempo
}

export interface Section {
  readonly sectionId: string;
  name: string; // "A", "B", "C", etc.
  startTime: number; // In beats
  duration: number; // In beats
}

/**
 * TimelineIR - Intermediate timeline representation
 *
 * Organizes SongModel data into a time-ordered timeline for audio consumption.
 * Includes sections, tempo changes, time signatures, and notes.
 */
export interface TimelineIR {
  readonly schemaVersion: "1.0";
  readonly timelineId: string; // UUID
  readonly songId: string; // Source song

  // Timeline structure
  duration: number; // Total duration in beats
  tempoChanges: TimelineTempoChange[];
  timeSignatureChanges: TimeSignatureChange[];
  sectionBoundaries: SectionBoundary[];

  // Notes organized by time
  notes: TimelineNote[];

  // Metadata
  metadata: TimelineMetadata;
}

export interface TimelineTempoChange {
  readonly time: number; // In beats
  tempo: number; // BPM
  readonly eventId: string; // UUID
}

export interface TimeSignatureChange {
  readonly time: number; // In beats
  numerator: number; // Top of time signature (e.g., 4 for 4/4)
  denominator: number; // Bottom of time signature (e.g., 4 for 4/4)
  readonly eventId: string; // UUID
}

export interface SectionBoundary {
  readonly time: number; // In beats
  readonly sectionId: string;
  readonly sectionName: string;
  readonly type: "start" | "end";
  readonly eventId: string; // UUID
}

export interface TimelineNote {
  readonly noteId: string;
  readonly voiceId: string;
  startTime: number; // In beats
  duration: number; // In beats
  pitch: number; // MIDI note number
  velocity: number; // 0-127
  readonly derivationSource: string;
}

export interface TimelineMetadata {
  readonly createdAt: string; // ISO timestamp
  readonly sourceDerivationId?: string; // Link to derivation if available
  readonly totalNotes: number;
  readonly totalVoices: number;
  readonly totalSections: number;
}

/**
 * NoteEvent - Executable note event for audio layer
 *
 * Represents either a note-on or note-off event scheduled at a specific time.
 * Generated from TimelineNote for audio consumption.
 */
export interface NoteEvent {
  readonly eventId: string; // UUID
  readonly type: "note-on" | "note-off";
  readonly time: number; // In beats
  readonly noteId: string; // Source note ID
  readonly voiceId: string; // Target voice
  readonly pitch: number; // MIDI note number
  readonly velocity: number; // 0-127 (0 for note-off)
  readonly derivationSource: string; // System that generated this note
  readonly linkedEventId?: string; // ID of paired note-off/note-on
}

/**
 * NoteEventSchedule - Time-ordered sequence of note events
 *
 * Contains all note-on/note-off events sorted by time for audio scheduling.
 */
export interface NoteEventSchedule {
  readonly schemaVersion: "1.0";
  readonly scheduleId: string; // UUID
  readonly sourceTimelineId: string; // Timeline this was generated from
  readonly songId: string; // Source song

  // Events ordered by time
  events: NoteEvent[];

  // Schedule metadata
  duration: number; // Total duration in beats
  metadata: NoteEventMetadata;
}

export interface NoteEventMetadata {
  readonly createdAt: string; // ISO timestamp
  readonly totalEvents: number;
  readonly totalNoteOns: number;
  readonly totalNoteOffs: number;
  readonly totalVoices: number;
  readonly voiceIds: readonly string[]; // Unique voice IDs
}

/**
 * DerivationRecord_v1 - Immutable trace of realization
 *
 * Explains how every note was generated from theory.
 */
export interface DerivationRecord_v1 {
  readonly derivationId: string; // UUID
  readonly sourceSongId: string; // SchillingerSong.songId
  readonly seed: number; // PRNG seed used

  // Execution Trace
  readonly executionOrder: string[]; // System IDs in execution order
  readonly outputs: DerivationOutput[];

  // Constraints Applied
  readonly constraintsApplied: ConstraintApplication[];
}

export interface DerivationOutput {
  readonly systemId: string; // Source system
  readonly outputType: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  readonly noteIds: readonly string[]; // Notes generated by this system
  readonly parameters: Record<string, unknown>; // System parameters used
  readonly constraints: readonly string[]; // Constraint IDs applied
}

export interface ConstraintApplication {
  readonly constraintId: string;
  readonly systemId: string; // System this constraint was applied to
  readonly satisfied: boolean; // Whether constraint was satisfied
  readonly details: string; // Human-readable explanation
}

/**
 * ReconciliationReport_v1 - Round-trip reconciliation report
 *
 * Explains what changed and with what confidence.
 */
export interface ReconciliationReport_v1 {
  readonly reportId: string; // UUID
  readonly sourceSongId: string; // Original SchillingerSong
  readonly editedModelId: string; // Edited SongModel

  // Confidence Summary
  readonly confidenceSummary: {
    readonly overall: number; // 0-1, weighted average
    readonly byBook: {
      readonly rhythm: number;
      readonly melody: number;
      readonly harmony: number;
      readonly form: number;
      readonly orchestration: number;
    };
  };

  // System Matches
  readonly systemMatches: SystemMatch[];

  // Losses
  readonly losses: LossReport[];

  // Suggested Actions
  readonly suggestedActions: SuggestedAction[];
}

export interface SystemMatch {
  readonly systemId: string; // Original system ID
  readonly systemType: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  readonly confidence: number; // 0-1
  readonly inferredParameters: Record<string, unknown>; // What was inferred
  readonly originalParameters: Record<string, unknown>; // What was original
  readonly changes: ParameterChange[];
}

export interface ParameterChange {
  readonly parameter: string;
  readonly originalValue: unknown;
  readonly inferredValue: unknown;
  readonly confidence: number; // 0-1
}

export interface LossReport {
  readonly systemId: string;
  readonly lossType: "destructive" | "ambiguous" | "unrecoverable";
  readonly description: string; // What was lost
  readonly impact: string; // How this affects the song
}

export interface SuggestedAction {
  readonly actionType: "update" | "split" | "reject" | "keep_decorative";
  readonly systemId: string;
  readonly reason: string;
  readonly proposedUpdate?: unknown; // New system parameters if update
}

// =============================================================================
// BOOK I: RHYTHM
// =============================================================================

export interface RhythmSystem {
  readonly systemId: string; // UUID
  readonly systemType: "rhythm";

  // Generators
  generators: Generator[];

  // Resultant Rules
  resultantSelection: {
    method: "interference" | "modulo" | "custom";
    targetPeriod?: number; // For resultant selection
  };

  // Transformations
  permutations: PermutationRule[];
  accentDisplacement: AccentDisplacementRule[];

  // Constraints
  densityConstraints: DensityConstraint;
  quantizationConstraint: QuantizationConstraint;
}

export interface Generator {
  period: number; // Period in beats (1-16)
  phase: number; // Phase offset in beats (0 to period-1)
  weight?: number; // Relative weight (0.1-2.0, default 1.0)
}

export interface PermutationRule {
  readonly ruleId: string; // UUID
  type: "rotation" | "retrograde" | "inversion";
  period: number; // Apply every N beats
  parameter?: unknown; // Type-specific parameter
}

export interface AccentDisplacementRule {
  readonly ruleId: string;
  trigger: "strong" | "weak" | "custom"; // Which beats to displace
  displacement: number; // Offset in beats
}

export interface DensityConstraint {
  readonly constraintId: string;
  scope: "global" | "system";
  minAttacksPerMeasure?: number; // Minimum attacks
  maxAttacksPerMeasure?: number; // Maximum attacks
}

export interface QuantizationConstraint {
  readonly constraintId: string;
  grid: number; // Quantization grid (0.0625 = triplet sixteenth)
  allowOffset: boolean; // Allow micro-timing off grid
}

// =============================================================================
// BOOK II: MELODY
// =============================================================================

export interface MelodySystem {
  readonly systemId: string;
  readonly systemType: "melody";

  // Pitch Cycle
  cycleLength: number; // mod N (2-24)
  intervalSeed: number[]; // Ordered intervals (-12 to +12)

  // Transformations
  rotationRule: RotationRule;
  expansionRules: ExpansionRule[];
  contractionRules: ContractionRule[];

  // Constraints
  contourConstraints: ContourConstraint;
  directionalBias: number; // -1 (descending) to 1 (ascending)
  registerConstraints: RegisterConstraint;

  // Bindings
  rhythmBinding: string; // RhythmSystem ID
}

export interface RotationRule {
  readonly ruleId: string;
  type: "cyclic" | "random";
  interval: number; // Rotate every N notes
  amount?: number; // Number of positions to rotate
}

export interface ExpansionRule {
  readonly ruleId: string;
  trigger: "periodic" | "conditional";
  multiplier: number; // Multiply intervals by N (1-4)
  period?: number; // Apply every N notes
}

export interface ContractionRule {
  readonly ruleId: string;
  trigger: "periodic" | "conditional";
  divisor: number; // Divide intervals by N (1-4)
  period?: number; // Apply every N notes
}

export interface ContourConstraint {
  readonly constraintId: string;
  type: "ascending" | "descending" | "oscillating" | "custom";
  maxIntervalLeaps?: number; // Maximum consecutive interval size
}

export interface RegisterConstraint {
  readonly constraintId: string;
  minPitch?: number; // MIDI note number
  maxPitch?: number; // MIDI note number
  allowTransposition: boolean; // Transpose if out of range
}

// =============================================================================
// BOOK III: HARMONY
// =============================================================================

export interface HarmonySystem {
  readonly systemId: string;
  readonly systemType: "harmony";

  // Vertical Distribution
  distribution: number[]; // Interval weights (intervals 1-12)

  // Harmonic Rhythm
  harmonicRhythmBinding: string; // RhythmSystem ID

  // Voice Leading
  voiceLeadingConstraints: VoiceLeadingConstraint[];

  // Resolution
  resolutionRules: ResolutionRule[];
}

export interface VoiceLeadingConstraint {
  readonly constraintId: string;
  maxIntervalLeap: number; // Maximum semitones between chords
  avoidParallels: boolean; // Avoid parallel 5ths/8ves
  preferredMotion: "contrary" | "oblique" | "similar" | "parallel";
}

export interface ResolutionRule {
  readonly ruleId: string;
  trigger: "cadence" | "conditional";
  targetDistribution: number[]; // Target interval weights
  tendency: "resolve" | "suspend" | "avoid";
}

// =============================================================================
// BOOK IV: FORM
// =============================================================================

export interface FormSystem {
  readonly systemId: string;
  readonly systemType: "form";

  // Ratio Tree (updated to match usage in form.ts)
  ratioTree: RatioTreeNode; // Hierarchical ratio tree

  // Section definitions
  sectionDefinitions: FormalSection[];

  // Symmetry and transformation
  symmetryRules: SymmetryRule[];

  // Cadence constraints
  cadenceConstraints: string[]; // Section IDs requiring cadence

  // Nesting depth
  nestingDepth: number; // Maximum nesting level

  // Legacy properties (for backward compatibility)
  nestedPeriodicity?: FormNode[];
  reuseRules?: ReuseRule[];
  transformationReferences?: TransformationReference[];
}

export interface FormNode {
  readonly nodeId: string;
  ratio: number[]; // Child ratios
  children: FormNode[]; // Nested structures
}

export interface ReuseRule {
  readonly ruleId: string;
  sourceSection: string; // Section ID to reuse
  targetSection: string; // Where to place reused material
  transformation?: "transpose" | "retrograde" | "invert";
}

export interface TransformationReference {
  readonly referenceId: string;
  sourceSection: string;
  transformationType: "transpose" | "retrograde" | "invert" | "augment";
  parameter: unknown; // Transformation-specific parameter
}

export interface CadenceConstraint {
  readonly constraintId: string;
  sectionId: string; // Which section gets cadence
  type: "authentic" | "plagal" | "deceptive" | "half";
}

export interface SymmetryRule {
  readonly ruleId: string;
  axis: string; // Section ID as symmetry axis
  type: "mirror" | "rotational" | "palindromic";
}

/**
 * RatioTreeNode - Hierarchical tree node for form structure
 * Used for building formal sections from ratio trees
 */
export interface RatioTreeNode {
  readonly nodeId: string;
  ratio: number; // Ratio value (not array)
  children?: RatioTreeNode[]; // Nested children
}

/**
 * FormalSection - Definition of a formal section
 */
export interface FormalSection {
  readonly sectionId: string;
  startTime?: number; // Calculated during generation
  duration?: number; // Calculated during generation
  content: {
    type: string; // Content type (placeholder, melody, harmony, etc.)
    [key: string]: unknown; // Additional content properties
  };
  requiresCadence?: boolean; // Whether this section needs a cadence
}

// =============================================================================
// BOOK V: ORCHESTRATION
// =============================================================================

export interface OrchestrationSystem {
  readonly systemId: string;
  readonly systemType: "orchestration";

  // Role Hierarchy
  roles: Role[];

  // Register and Spacing
  registerSystem: RegisterSystem;
  spacingSystem: SpacingSystem;

  // Density
  densitySystem: DensitySystem;

  // Doubling and Reinforcement
  doublingRules: DoublingRule[];
  reinforcementRules: ReinforcementRule[];

  // Voice Splitting/Merging
  splitRules: SplitRule[];
  mergeRules: MergeRule[];

  // Orchestration Over Form
  formOrchestration: FormOrchestrationBinding[];
}

export interface Role {
  readonly roleId: string; // UUID
  roleName: string; // "bass", "melody", "accompaniment"
  priority: "primary" | "secondary" | "tertiary";
  functionalClass: "foundation" | "motion" | "ornament" | "reinforcement";
  yieldTo: string[]; // Role IDs this yields to under conflict
}

export interface RegisterSystem {
  readonly systemId: string;
  roleRegisters: {
    roleId: string;
    minPitch: number; // MIDI note number
    maxPitch: number; // MIDI note number
    envelope?: RegisterEnvelope[]; // Register changes over form
  }[];
}

export interface RegisterEnvelope {
  readonly sectionId: string;
  minPitch: number;
  maxPitch: number;
}

export interface SpacingSystem {
  readonly systemId: string;
  minSpacing: {
    voiceId: string; // Reference voice
    minInterval: number; // Minimum semitones below
  }[];
  maxSpacing: {
    voiceId: string; // Reference voice
    maxInterval: number; // Maximum semitones above
  }[];
  crossingRules: CrossingRule[];
}

export interface CrossingRule {
  readonly ruleId: string;
  allowCrossing: boolean;
  conditions?: string[]; // When crossing is allowed/forbidden
}

export interface DensitySystem {
  readonly systemId: string;
  roleDensity: {
    roleId: string;
    densityBudget: number; // 0-1, relative density
    couplingRules: DensityCoupling[];
  }[];
}

export interface DensityCoupling {
  readonly ruleId: string;
  targetRoleId: string;
  type: "direct" | "inverse" | "independent";
  amount: number; // Coupling strength
}

export interface DoublingRule {
  readonly ruleId: string;
  sourceVoiceId: string;
  targetVoiceId: string;
  interval: number; // Octave (12), double octave (24), etc.
  conditional: boolean; // Always or conditional
  trigger?: string; // Conditional trigger (accent, cadence, etc.)
}

export interface ReinforcementRule {
  readonly ruleId: string;
  sourceVoiceId: string;
  targetVoiceId: string;
  delay: number; // Beats to delay (0 = unison)
  duration?: number; // How long reinforcement lasts
}

export interface SplitRule {
  readonly ruleId: string;
  sourceSystemId: string; // System to split
  targetVoices: string[]; // Voices to split into
  splitMethod: "parallel" | "antiphonal" | "alternating";
}

export interface MergeRule {
  readonly ruleId: string;
  sourceVoiceIds: string[]; // Voices to merge
  targetVoiceId: string; // Merged output
  mergeMethod: "unison" | "octave" | "layered";
}

export interface FormOrchestrationBinding {
  readonly bindingId: string;
  sectionId: string; // Form section
  roleReassignments: {
    roleId: string; // Original role
    newRole: string; // New role for this section
  }[];
}

// =============================================================================
// ENSEMBLE MODEL
// =============================================================================

export interface EnsembleModel {
  // Version & Metadata
  version: "1.0";
  id: string; // Ensemble ID

  // Voices
  voices: Voice[];
  voiceCount: number; // Number of voices (1-100)

  // Grouping
  groups?: VoiceGroup[]; // Sections, choirs, layers

  // Balance
  balance?: BalanceRules; // Optional balance rules
}

// Type aliases for ensemble system compatibility
export type RoleType = "primary" | "secondary" | "tertiary";
export type FunctionalClass = "foundation" | "motion" | "ornament" | "reinforcement";
export type UUID = string;

export interface RolePool {
  role: RoleType;
  functionalClass: FunctionalClass;
  enabled: boolean;
}

export interface Voice {
  readonly id: UUID; // UUID - changed from voiceId to match ensemble.ts
  readonly name: string; // Changed from voiceName to match ensemble.ts
  rolePools: RolePool[]; // Changed from rolePool (string[]) to rolePools (RolePool[])
  groupIds?: UUID[]; // Changed from groupId to groupIds (array)
  registerRange?: {
    minPitch: number; // Absolute minimum
    maxPitch: number; // Absolute maximum
  };
}

export interface VoiceGroup {
  readonly id: UUID; // UUID - changed from groupId to match ensemble.ts
  readonly name: string; // Changed from groupName to name
  voiceIds: UUID[]; // Member voices
}

export interface BalanceRules {
  priority?: UUID[]; // Voice priority order
  limits?: {
    maxVoices: number; // Maximum voices (1-100)
    maxPolyphony: number; // Maximum polyphony (1-200)
  };
}

// Keep old types for backward compatibility
export interface Group {
  readonly groupId: string; // UUID
  groupName: string; // "Strings", "Brass", "Choir"
  voiceIds: string[]; // Member voices
  balanceRules: BalanceRule[]; // Group-specific balance
}

export interface BalanceRule {
  readonly ruleId: string;
  type: "relative" | "absolute";
  target: string; // Role or group ID
  reference: string; // Compared to this role/group
  ratio: number; // Target = reference * ratio
}

// =============================================================================
// BINDINGS
// =============================================================================

export interface RoleRhythmBinding {
  readonly bindingId: string; // UUID
  roleId: string; // From OrchestrationSystem
  rhythmSystemId: string; // From Book I
  voiceId: string; // From EnsembleModel
  priority: number; // 1-10, higher = more important
}

export interface RoleMelodyBinding {
  readonly bindingId: string;
  roleId: string;
  melodySystemId: string; // From Book II
  voiceId: string;
  priority: number;
}

export interface RoleHarmonyBinding {
  readonly bindingId: string;
  roleId: string;
  harmonySystemId: string; // From Book III
  voiceIds: string[]; // Multiple voices for harmony
  priority: number;
}

export interface RoleEnsembleBinding {
  readonly bindingId: string;
  roleId: string;
  voiceId: string;
}

// =============================================================================
// CONSTRAINTS
// =============================================================================

export interface Constraint {
  readonly constraintId: string; // UUID
  type: string; // "density", "register", "contour", etc.
  scope: {
    type: "global" | "system" | "voice";
    targetId?: string; // System or voice ID if scoped
  };
  parameters: Record<string, unknown>;
  enabled: boolean;

  // Additional property for backward compatibility
  systemId?: string; // System ID this constraint applies to (if scoped to system)
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for SchillingerSong_v1
 */
export function isSchillingerSong(obj: unknown): obj is SchillingerSong_v1 {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "schemaVersion" in obj &&
    obj.schemaVersion === "1.0" &&
    "songId" in obj &&
    "globals" in obj
  );
}

/**
 * Type guard for SongModel_v1
 */
export function isSongModel(obj: unknown): obj is SongModel_v1 {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "schemaVersion" in obj &&
    obj.schemaVersion === "1.0" &&
    "songId" in obj &&
    "derivationId" in obj &&
    "notes" in obj
  );
}

/**
 * Type guard for DerivationRecord_v1
 */
export function isDerivationRecord(obj: unknown): obj is DerivationRecord_v1 {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "derivationId" in obj &&
    "sourceSongId" in obj &&
    "seed" in obj &&
    "executionOrder" in obj &&
    "outputs" in obj
  );
}

/**
 * Type guard for ReconciliationReport_v1
 */
export function isReconciliationReport(obj: unknown): obj is ReconciliationReport_v1 {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "reportId" in obj &&
    "confidenceSummary" in obj &&
    "systemMatches" in obj &&
    "losses" in obj &&
    "suggestedActions" in obj
  );
}
