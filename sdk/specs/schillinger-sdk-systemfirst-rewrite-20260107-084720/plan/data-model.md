# Data Model: Schillinger SDK v1

**Feature**: Schillinger SDK System-First Rewrite
**Status**: Design Phase
**Date**: 2025-01-07

---

## Overview

This document defines the complete data model for the Schillinger SDK v1, including all entities, relationships, validation rules, and state transitions.

**Core Principles**:
- **Theory-First**: SchillingerSong_v1 is the canonical source of truth
- **Derived Output**: SongModel_v1 is generated, never authoritative
- **Explainability**: Every generated event links to its source
- **Determinism**: Same inputs always produce identical outputs
- **Versioned**: All schemas include version field for evolution

---

## Entity Catalog

| Entity | Purpose | Source of Truth | Mutable |
|--------|---------|-----------------|---------|
| SchillingerSong_v1 | Canonical theory object | User | Yes |
| SongModel_v1 | Executable song | Derivation | Yes (decorative only) |
| DerivationRecord_v1 | Realization trace | System | No (immutable) |
| ReconciliationReport_v1 | Round-trip analysis | System | No (immutable) |
| RhythmSystem | Book I rhythm structure | User | Yes |
| MelodySystem | Book II melody structure | User | Yes |
| HarmonySystem | Book III harmony structure | User | Yes |
| FormSystem | Book IV form structure | User | Yes |
| OrchestrationSystem | Book V orchestration | User | Yes |
| EnsembleModel | Voice topology | User | Yes |

---

## Core Entities

### SchillingerSong_v1

**Purpose**: Canonical theory representation containing only systems, parameters, bindings, and constraints. Zero notes, zero events, pure theory.

**Fields**:
```typescript
interface SchillingerSong_v1 {
  // Metadata
  schemaVersion: "1.0";                    // Schema version for migration
  songId: string;                          // UUID, unique identifier

  // Global Parameters
  globals: {
    tempo: number;                         // BPM (40-300)
    timeSignature: [number, number];       // [numerator, denominator]
    key: number;                           // Pitch class (0-11, 0=C)
  };

  // Systems (all optional, can be empty arrays)
  bookI_rhythmSystems: RhythmSystem[];     // Rhythm generators and resultants
  bookII_melodySystems: MelodySystem[];    // Pitch cycles and intervals
  bookIII_harmonySystems: HarmonySystem[]; // Vertical distributions
  bookIV_formSystem: FormSystem | null;    // Ratio trees and sections
  bookV_orchestration: OrchestrationSystem;// Roles and voice assignments

  // Ensemble and Bindings
  ensembleModel: EnsembleModel;            // Voice topology
  bindings: {
    roleRhythmBindings: RoleRhythmBinding[];
    roleMelodyBindings: RoleMelodyBinding[];
    roleHarmonyBindings: RoleHarmonyBinding[];
    roleEnsembleBindings: RoleEnsembleBinding[];
  };

  // Constraints and Provenance
  constraints: Constraint[];
  provenance: {
    createdAt: string;                     // ISO 8601 timestamp
    createdBy: string;                     // User or system ID
    modifiedAt: string;                    // ISO 8601 timestamp
    derivationChain: string[];             // IDs of previous versions
  };
}
```

**Validation Rules**:
- `tempo`: Must be between 40 and 300 BPM
- `timeSignature`: Numerator must be 1-16, denominator must be power of 2
- `key`: Must be 0-11 (C through B)
- `songId`: Must be valid UUID v4
- All `systemId` fields in systems must be unique
- All bindings must reference valid system IDs
- All constraints must reference valid system IDs or voice IDs

**Relationships**:
- Derives to many SongModel_v1 (via different seeds)
- Updated by ReconciliationReport_v1
- Contains 1+ RhythmSystem, 0+ MelodySystem, 0+ HarmonySystem
- Contains 0-1 FormSystem, 1 OrchestrationSystem, 1 EnsembleModel

---

### SongModel_v1

**Purpose**: Executable song representation derived from SchillingerSong. Contains notes, events, timing, and voice assignments.

**Fields**:
```typescript
interface SongModel_v1 {
  // Metadata
  schemaVersion: "1.0";
  songId: string;                          // Matches SchillingerSong.songId

  // Derivation Reference
  derivationId: string;                    // Links to DerivationRecord_v1

  // Musical Content
  notes: Note[];                          // All notes in the song
  events: Event[];                         // Non-note events (dynamics, articulations)
  voiceAssignments: VoiceAssignment[];     // Which voice plays which notes

  // Timing
  duration: number;                        // Total duration in beats
  tempoChanges: TempoChange[];             // Tempo map (if any)

  // Structure
  sections: Section[];                     // Form sections (A, B, C, etc.)
}

interface Note {
  noteId: string;                          // UUID
  voiceId: string;                         // Which voice plays this note
  startTime: number;                       // In beats
  duration: number;                        // In beats
  pitch: number;                           // MIDI note number (0-127)
  velocity: number;                        // 0-127
  derivationSource: string;                // System ID that generated this note
}

interface Event {
  eventId: string;                         // UUID
  voiceId: string;
  time: number;                            // In beats
  type: "dynamic" | "articulation" | "other";
  value: any;                              // Type-specific value
}

interface VoiceAssignment {
  voiceId: string;
  roleId: string;                          // Role this voice fulfills
  systemIds: string[];                     // Systems bound to this voice
}
```

**Validation Rules**:
- `derivationId` must link to existing DerivationRecord
- All `noteId` values must be unique
- All `voiceId` values must exist in EnsembleModel
- `startTime` must be ≥ 0
- `duration` must be > 0
- `pitch` must be 0-127
- `velocity` must be 0-127
- Notes must not overlap in same voice (unless polyphonic)
- Total duration must match sum of section durations

**Relationships**:
- Derived from 1 SchillingerSong_v1
- Linked to 1 DerivationRecord_v1
- Input to Reconciliation (produces ReconciliationReport_v1)

---

### DerivationRecord_v1

**Purpose**: Immutable trace of realization process. Explains how every note was generated.

**Fields**:
```typescript
interface DerivationRecord_v1 {
  derivationId: string;                    // UUID
  sourceSongId: string;                    // SchillingerSong.songId
  seed: number;                            // PRNG seed used

  // Execution Trace
  executionOrder: string[];                // System IDs in execution order
  outputs: DerivationOutput[];

  // Constraints Applied
  constraintsApplied: ConstraintApplication[];
}

interface DerivationOutput {
  systemId: string;                        // Source system
  outputType: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  noteIds: string[];                       // Notes generated by this system
  parameters: Record<string, any>;         // System parameters used
  constraints: string[];                   // Constraint IDs applied
}

interface ConstraintApplication {
  constraintId: string;
  systemId: string;                        // System this constraint was applied to
  satisfied: boolean;                      // Whether constraint was satisfied
  details: string;                         // Human-readable explanation
}
```

**Validation Rules**:
- `derivationId` must be unique UUID
- `sourceSongId` must reference existing SchillingerSong
- `seed` must be valid 32-bit integer
- All `systemId` values in `executionOrder` must exist in source song
- All `noteIds` in outputs must exist in derived SongModel
- Record is immutable (created once, never modified)

**Relationships**:
- Created from 1 SchillingerSong_v1
- Links to 1 SongModel_v1 (via noteIds)
- Used for analysis and debugging

---

### ReconciliationReport_v1

**Purpose**: Report on round-trip reconciliation, explaining what changed and with what confidence.

**Fields**:
```typescript
interface ReconciliationReport_v1 {
  reportId: string;                        // UUID
  sourceSongId: string;                    // Original SchillingerSong
  editedModelId: string;                   // Edited SongModel

  // Confidence Summary
  confidenceSummary: {
    overall: number;                       // 0-1, weighted average
    byBook: {
      rhythm: number;                      // Book I confidence
      melody: number;                      // Book II confidence
      harmony: number;                     // Book III confidence
      form: number;                        // Book IV confidence
      orchestration: number;               // Book V confidence
    };
  };

  // System Matches
  systemMatches: SystemMatch[];

  // Losses
  losses: LossReport[];

  // Suggested Actions
  suggestedActions: SuggestedAction[];
}

interface SystemMatch {
  systemId: string;                        // Original system ID
  systemType: "rhythm" | "melody" | "harmony" | "form" | "orchestration";
  confidence: number;                      // 0-1
  inferredParameters: Record<string, any>; // What was inferred
  originalParameters: Record<string, any>; // What was original
  changes: ParameterChange[];
}

interface LossReport {
  systemId: string;
  lossType: "destructive" | "ambiguous" | "unrecoverable";
  description: string;                     // What was lost
  impact: string;                          // How this affects the song
}

interface SuggestedAction {
  actionType: "update" | "split" | "reject" | "keep_decorative";
  systemId: string;
  reason: string;
  proposedUpdate?: any;                    // New system parameters if update
}
```

**Validation Rules**:
- `reportId` must be unique UUID
- `sourceSongId` must reference existing SchillingerSong
- `editedModelId` must reference existing SongModel
- All confidence values must be 0-1
- `confidenceSummary.overall` must equal weighted average of `byBook`
- All `systemId` values must exist in source song

**Relationships**:
- Generated from SchillingerSong_v1 + SongModel_v1
- Optionally produces updated SchillingerSong_v1

---

## Book I: Rhythm Entities

### RhythmSystem

**Purpose**: Defines rhythm via periodic generators and resultants.

**Fields**:
```typescript
interface RhythmSystem {
  systemId: string;                        // UUID
  systemType: "rhythm";

  // Generators
  generators: Generator[];

  // Resultant Rules
  resultantSelection: {
    method: "interference" | "modulo" | "custom";
    targetPeriod?: number;                 // For resultant selection
  };

  // Transformations
  permutations: PermutationRule[];
  accentDisplacement: AccentDisplacementRule[];

  // Constraints
  densityConstraints: DensityConstraint;
  quantizationConstraint: QuantizationConstraint;
}

interface Generator {
  period: number;                          // Period in beats (1-16)
  phase: number;                           // Phase offset in beats (0 to period-1)
  weight?: number;                         // Relative weight (0.1-2.0, default 1.0)
}

interface PermutationRule {
  ruleId: string;                          // UUID
  type: "rotation" | "retrograde" | "inversion";
  period: number;                          // Apply every N beats
  parameter?: any;                         // Type-specific parameter
}

interface AccentDisplacementRule {
  ruleId: string;
  trigger: "strong" | "weak" | "custom";   // Which beats to displace
  displacement: number;                    // Offset in beats
}

interface DensityConstraint {
  constraintId: string;
  scope: "global" | "system";
  minAttacksPerMeasure?: number;           // Minimum attacks
  maxAttacksPerMeasure?: number;           // Maximum attacks
}

interface QuantizationConstraint {
  constraintId: string;
  grid: number;                            // Quantization grid (0.0625 = triplet sixteenth)
  allowOffset: boolean;                    // Allow micro-timing off grid
}
```

**Validation Rules**:
- `period` must be 1-16 beats
- `phase` must be ≥ 0 and < period
- `weight` must be 0.1-2.0
- At least 2 generators required for resultant
- `grid` must be valid fraction (1, 0.5, 0.25, 0.125, etc.)

**State Transitions**:
- Generators can be added/removed
- Parameters can be adjusted
- Resultant method can be changed
- Constraints can be added/removed

---

## Book II: Melody Entities

### MelodySystem

**Purpose**: Defines pitch motion via modular arithmetic systems.

**Fields**:
```typescript
interface MelodySystem {
  systemId: string;
  systemType: "melody";

  // Pitch Cycle
  cycleLength: number;                     // mod N (2-24)
  intervalSeed: number[];                  // Ordered intervals (-12 to +12)

  // Transformations
  rotationRule: RotationRule;
  expansionRules: ExpansionRule[];
  contractionRules: ContractionRule[];

  // Constraints
  contourConstraints: ContourConstraint;
  directionalBias: number;                 // -1 (descending) to 1 (ascending)
  registerConstraints: RegisterConstraint;
}

interface RotationRule {
  ruleId: string;
  type: "cyclic" | "random";
  interval: number;                        // Rotate every N notes
  amount?: number;                         // Number of positions to rotate
}

interface ExpansionRule {
  ruleId: string;
  trigger: "periodic" | "conditional";
  multiplier: number;                      // Multiply intervals by N (1-4)
  period?: number;                         // Apply every N notes
}

interface ContractionRule {
  ruleId: string;
  trigger: "periodic" | "conditional";
  divisor: number;                         // Divide intervals by N (1-4)
  period?: number;                         // Apply every N notes
}

interface ContourConstraint {
  constraintId: string;
  type: "ascending" | "descending" | "oscillating" | "custom";
  maxIntervalLeaps?: number;               // Maximum consecutive interval size
}

interface RegisterConstraint {
  constraintId: string;
  minPitch?: number;                       // MIDI note number
  maxPitch?: number;                       // MIDI note number
  allowTransposition: boolean;             // Transpose if out of range
}
```

**Validation Rules**:
- `cycleLength` must be 2-24
- `intervalSeed` must have at least 1 interval
- Interval values must be -12 to +12
- `directionalBias` must be -1 to 1
- `minPitch` must be ≤ `maxPitch` (if both specified)

**State Transitions**:
- Cycle can be expanded/contracted
- Intervals can be rotated
- Constraints can be modified

---

## Book III: Harmony Entities

### HarmonySystem

**Purpose**: Defines vertical pitch organization via interval distributions.

**Fields**:
```typescript
interface HarmonySystem {
  systemId: string;
  systemType: "harmony";

  // Vertical Distribution
  distribution: number[];                  // Interval weights (intervals 1-12)

  // Harmonic Rhythm
  harmonicRhythmBinding: string;           // RhythmSystem ID

  // Voice Leading
  voiceLeadingConstraints: VoiceLeadingConstraint[];

  // Resolution
  resolutionRules: ResolutionRule[];
}

interface VoiceLeadingConstraint {
  constraintId: string;
  maxIntervalLeap: number;                 // Maximum semitones between chords
  avoidParallels: boolean;                 // Avoid parallel 5ths/8ves
  preferredMotion: "contrary" | "oblique" | "similar" | "parallel";
}

interface ResolutionRule {
  ruleId: string;
  trigger: "cadence" | "conditional";
  targetDistribution: number[];            // Target interval weights
  tendency: "resolve" | "suspend" | "avoid";
}
```

**Validation Rules**:
- `distribution` must have exactly 12 values (intervals 1-12)
- Distribution values must be ≥ 0
- `harmonicRhythmBinding` must reference existing RhythmSystem
- `maxIntervalLeap` must be 1-12 semitones

**State Transitions**:
- Distribution can be adjusted
- Binding can be changed to different RhythmSystem
- Voice leading rules can be modified

---

## Book IV: Form Entities

### FormSystem

**Purpose**: Defines large-scale temporal structure via ratio trees.

**Fields**:
```typescript
interface FormSystem {
  systemId: string;
  systemType: "form";

  // Ratio Tree
  ratioTree: number[];                     // Section ratios [A, B, C, ...]

  // Nested Structures
  nestedPeriodicity: FormNode[];

  // Reuse and Transformation
  reuseRules: ReuseRule[];
  transformationReferences: TransformationReference[];

  // Closure
  cadenceConstraints: CadenceConstraint[];
  symmetryRules: SymmetryRule[];
}

interface FormNode {
  nodeId: string;
  ratio: number[];                         // Child ratios
  children: FormNode[];                    // Nested structures
}

interface ReuseRule {
  ruleId: string;
  sourceSection: string;                   // Section ID to reuse
  targetSection: string;                   // Where to place reused material
  transformation?: "transpose" | "retrograde" | "invert";
}

interface TransformationReference {
  referenceId: string;
  sourceSection: string;
  transformationType: "transpose" | "retrograde" | "invert" | "augment";
  parameter: any;                          // Transformation-specific parameter
}

interface CadenceConstraint {
  constraintId: string;
  sectionId: string;                       // Which section gets cadence
  type: "authentic" | "plagal" | "deceptive" | "half";
}

interface SymmetryRule {
  ruleId: string;
  axis: string;                            // Section ID as symmetry axis
  type: "mirror" | "rotational" | "palindromic";
}
```

**Validation Rules**:
- `ratioTree` must have at least 2 values
- Ratio values must be positive integers
- Nested structures must be acyclic (no circular references)
- All `sectionId` references must be valid

**State Transitions**:
- Ratios can be adjusted
- Sections can be added/removed
- Transformations can be modified

---

## Book V: Orchestration Entities

### OrchestrationSystem

**Purpose**: Defines structural orchestration (who plays what, where, with what weight).

**Fields**:
```typescript
interface OrchestrationSystem {
  systemId: string;
  systemType: "orchestration";

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

interface Role {
  roleId: string;                          // UUID
  roleName: string;                        // "bass", "melody", "accompaniment"
  priority: "primary" | "secondary" | "tertiary";
  functionalClass: "foundation" | "motion" | "ornament" | "reinforcement";
  yieldTo: string[];                       // Role IDs this yields to under conflict
}

interface RegisterSystem {
  systemId: string;
  roleRegisters: {
    roleId: string;
    minPitch: number;                      // MIDI note number
    maxPitch: number;                      // MIDI note number
    envelope?: RegisterEnvelope[];         // Register changes over form
  }[];
}

interface SpacingSystem {
  systemId: string;
  minSpacing: {
    voiceId: string;                       // Reference voice
    minInterval: number;                   // Minimum semitones below
  }[];
  maxSpacing: {
    voiceId: string;                       // Reference voice
    maxInterval: number;                   // Maximum semitones above
  }[];
  crossingRules: CrossingRule[];
}

interface DensitySystem {
  systemId: string;
  roleDensity: {
    roleId: string;
    densityBudget: number;                 // 0-1, relative density
    couplingRules: DensityCoupling[];
  }[];
}

interface DoublingRule {
  ruleId: string;
  sourceVoiceId: string;
  targetVoiceId: string;
  interval: number;                        // Octave (12), double octave (24), etc.
  conditional: boolean;                    // Always or conditional
  trigger?: string;                        // Conditional trigger (accent, cadence, etc.)
}

interface ReinforcementRule {
  ruleId: string;
  sourceVoiceId: string;
  targetVoiceId: string;
  delay: number;                           // Beats to delay (0 = unison)
  duration?: number;                       // How long reinforcement lasts
}

interface SplitRule {
  ruleId: string;
  sourceSystemId: string;                  // System to split
  targetVoices: string[];                  // Voices to split into
  splitMethod: "parallel" | "antiphonal" | "alternating";
}

interface MergeRule {
  ruleId: string;
  sourceVoiceIds: string[];                // Voices to merge
  targetVoiceId: string;                   // Merged output
  mergeMethod: "unison" | "octave" | "layered";
}

interface FormOrchestrationBinding {
  bindingId: string;
  sectionId: string;                       // Form section
  roleReassignments: {
    roleId: string;                        // Original role
    newRole: string;                       // New role for this section
  }[];
}
```

**Validation Rules**:
- All `roleId` values must be unique
- `minPitch` must be ≤ `maxPitch`
- `densityBudget` must be 0-1
- All `voiceId` references must exist in EnsembleModel
- Split/merge rules must be acyclic

**State Transitions**:
- Roles can be added/removed
- Register assignments can be modified
- Density budgets can be adjusted
- Doubling/reinforcement can be enabled/disabled

---

## Ensemble Model

### EnsembleModel

**Purpose**: Defines voice topology independent of specific instruments.

**Fields**:
```typescript
interface EnsembleModel {
  // Voices
  voices: Voice[];

  // Grouping
  groups: Group[];                         // Sections, choirs, layers

  // Balance
  balanceRules: BalanceRule[];
}

interface Voice {
  voiceId: string;                         // UUID
  voiceName: string;                       // "Violin 1", "Trumpet", etc.
  rolePool: string[];                      // Roles this voice can fulfill
  registerRange: {
    minPitch: number;                      // Absolute minimum
    maxPitch: number;                      // Absolute maximum
  };
  groupId?: string;                        // Optional group membership
}

interface Group {
  groupId: string;                         // UUID
  groupName: string;                       // "Strings", "Brass", "Choir"
  voiceIds: string[];                      // Member voices
  balanceRules: BalanceRule[];             // Group-specific balance
}

interface BalanceRule {
  ruleId: string;
  type: "relative" | "absolute";
  target: string;                          // Role or group ID
  reference: string;                       // Compared to this role/group
  ratio: number;                           // Target = reference * ratio
}
```

**Validation Rules**:
- All `voiceId` values must be unique
- All `groupId` values must be unique
- `rolePool` must have at least 1 role
- `minPitch` must be ≤ `maxPitch`
- `ratio` must be > 0

**State Transitions**:
- Voices can be added/removed
- Groups can be created/dissolved
- Role pools can be modified

---

## Binding Entities

### RoleSystemBindings

**Purpose**: Explicitly connect roles to systems.

**Fields**:
```typescript
interface RoleRhythmBinding {
  bindingId: string;                       // UUID
  roleId: string;                          // From OrchestrationSystem
  rhythmSystemId: string;                  // From Book I
  voiceId: string;                         // From EnsembleModel
  priority: number;                        // 1-10, higher = more important
}

interface RoleMelodyBinding {
  bindingId: string;
  roleId: string;
  melodySystemId: string;                  // From Book II
  voiceId: string;
  priority: number;
}

interface RoleHarmonyBinding {
  bindingId: string;
  roleId: string;
  harmonySystemId: string;                 // From Book III
  voiceIds: string[];                      // Multiple voices for harmony
  priority: number;
}

interface RoleEnsembleBinding {
  bindingId: string;
  roleId: string;
  voiceId: string;
  sectionId?: string;                       // Optional form section binding
}
```

**Validation Rules**:
- All `roleId` values must exist in OrchestrationSystem
- All system IDs must reference existing systems
- All `voiceId` values must exist in EnsembleModel
- `priority` must be 1-10
- No duplicate bindings (same role + system/voice)

---

## Constraint Entities

### Constraint Types

**Purpose**: Limit system output to enforce musical constraints.

**Fields**:
```typescript
interface Constraint {
  constraintId: string;                    // UUID
  type: "density" | "register" | "spacing" | "contour" | "custom";
  scope: {
    type: "global" | "system" | "voice" | "binding";
    targetId?: string;                     // System/voice/binding ID
  };
  parameters: Record<string, any>;
  enabled: boolean;                        // Can be disabled without removal
}
```

**State Transitions**:
- Can be enabled/disabled
- Can be modified
- Can be added/removed

---

## State Machine Diagrams

### SchillingerSong_v1 Lifecycle

```
[Created]
    ↓
[Editing Systems] ← ← ← ← ← ← ← ←
    ↓                           ↑
[Realizing]                   [Reconciling]
    ↓                           ↑
[SongModel Generated] ─ ─ ─ ─ ─ ┘
    ↓
[Edited]
    ↓
[Reconciling]
    ↓
[Updated] → [Editing Systems]
```

### System Parameter Transitions

**RhythmSystem**:
```
[Add Generator] → [Adjust Period/Phase] → [Remove Generator]
[Add Permutation] → [Modify Rule] → [Remove Rule]
[Change Resultant Method]
[Adjust Density Constraints]
```

**MelodySystem**:
```
[Set Cycle Length] → [Modify Interval Seed]
[Add Rotation] → [Adjust Amount] → [Remove Rotation]
[Add Expansion/Contraction] → [Adjust Multiplier/Divisor]
[Adjust Register/Contour Constraints]
```

---

## Data Model Relationships

```
SchillingerSong_v1 (1)
├── contains → RhythmSystem[] (0-*)
├── contains → MelodySystem[] (0-*)
├── contains → HarmonySystem[] (0-*)
├── contains → FormSystem (0-1)
├── contains → OrchestrationSystem (1)
├── contains → EnsembleModel (1)
├── contains → Constraint[] (0-*)
├── binds → RoleRhythmBinding[] (0-*)
├── binds → RoleMelodyBinding[] (0-*)
├── binds → RoleHarmonyBinding[] (0-*)
└── binds → RoleEnsembleBinding[] (0-*)

SchillingerSong_v1 (1) ── realizes → SongModel_v1 (1)
                                   │
                                   ├─ derivation tracked by → DerivationRecord_v1 (1)
                                   │
                                   └─ reconciled from → ReconciliationReport_v1 (1)
                                                            │
                                                            └─ proposes → SchillingerSong_v1 (0-1)

OrchestrationSystem (1) ── defines → Role[] (1-*)
EnsembleModel (1) ── contains → Voice[] (1-*)
Role (1) ── fulfilled by → Voice (1-*) via RoleEnsembleBinding
Role (1) ── bound to → RhythmSystem (1) via RoleRhythmBinding
```

---

## Validation Summary

### Cross-Entity Validation Rules

1. **System ID Uniqueness**: All `systemId` values in a song must be unique
2. **Binding References**: All bindings must reference valid system/role/voice IDs
3. **Voice Capacity**: Ensemble must have enough voices for all role assignments
4. **Constraint Scopes**: All constraints must reference valid targets
5. **Derivation Links**: SongModels must link to valid DerivationRecords
6. **Form References**: All form section IDs must be consistent

### Validation Order

1. **Schema Validation**: JSON schema compliance
2. **Internal Validation**: Field-level rules (ranges, types)
3. **Cross-Entity Validation**: References and relationships
4. **Business Rules**: Musical constraints and logic
5. **Realization Validation**: Constraint satisfaction check

---

## Migration Strategy

### Schema Evolution

**Version 1.0 → 1.1**: Additions only (backward compatible)
- Add new optional fields
- Add new system types
- No migration required

**Version 1.0 → 2.0**: Breaking changes
- Remove or rename fields
- Change field types
- Migration required

**Migration Tool**:
```typescript
function migrateSchema(data: any, fromVersion: string, toVersion: string): SchillingerSong_v1 {
  // Apply migration rules
  const migration = findMigration(fromVersion, toVersion);
  return migration.migrate(data);
}
```

---

## Appendix: Type Definitions

**Complete TypeScript definitions**: See `/schemas/typescript/` (generated from this spec)

**JSON Schemas**: See `/schemas/json/` (generated from this spec)

**Dart Definitions**: See `/schemas/dart/` (generated from this spec)
