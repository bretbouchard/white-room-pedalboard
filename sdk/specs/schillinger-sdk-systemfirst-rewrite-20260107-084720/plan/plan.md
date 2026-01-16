# Implementation Plan: Schillinger SDK System-First Rewrite

**Feature**: Schillinger SDK System-First Rewrite
**Branch**: feature/schillinger-sdk-systemfirst-rewrite-20260107-084720
**Status**: In Progress
**Created**: 2025-01-07

---

## Table of Contents

1. [Technical Context](#technical-context)
2. [Constitution Check](#constitution-check)
3. [Phase 0: Research](#phase-0-research)
4. [Phase 1: Design & Contracts](#phase-1-design--contracts)
5. [Phase 2: Implementation Strategy](#phase-2-implementation-strategy)

---

## Technical Context

### Existing Architecture

**Current SDK Structure**:
- **Language**: TypeScript (Dart FFI layer in progress)
- **Core Components**:
  - `SongModel` - Note-based song representation
  - Pattern generators - Rhythm, melody, harmony patterns
  - Realization engine - Executes patterns to produce notes
  - Validation framework - Schema validation system

**Current Limitations**:
- Pattern-based, not theory-based
- No canonical theory representation
- Limited round-trip capability
- Orchestration is ad-hoc, not structural
- No reconciliation system

### Target Architecture

**New Components**:
1. **SchillingerSong_v1** - Canonical theory object
   - Books I-V systems
   - Ensemble model
   - Bindings and constraints
   - Zero notes, pure theory

2. **Realization Pipeline** - Deterministic execution
   - Seeded PRNG for reproducibility
   - System execution engine
   - Derivation tracking
   - Constraint satisfaction

3. **Reconciliation System** - Round-trip editing
   - Edit classification (decorative/structural/destructive)
   - System inference
   - Confidence scoring
   - Ambiguity reporting

4. **Schema System** - JSON schemas with validation
   - SchillingerSong_v1 schema
   - SongModel_v1 schema (adapted)
   - DerivationRecord_v1 schema
   - ReconciliationReport_v1 schema

### Technology Stack

**Core SDK**:
- **TypeScript**: Primary implementation language
- **Dart**: Mobile platform support (via FFI)
- **JSON**: Serialization format for all schemas
- **JSON Schema**: Validation standard

**Dependencies**:
- **PRNG**: NEEDS CLARIFICATION - Seeded PRNG library (PCG, xoroshiro, or other)
- **Validation**: Existing validation framework (Ajv or similar)
- **Testing**: Vitest (TypeScript), Dart test framework
- **Build**: Turborepo (monorepo build system)

**Integration Points**:
- **JUCE Backend**: C++ audio engine (via FFI)
- **Flutter UI**: Cross-platform UI (via Dart FFI)
- **Notation Export**: MusicXML/MIDI generation

### Unknowns / Research Needs

1. **PRNG Selection** - NEEDS CLARIFICATION
   - Requirements: Cross-platform identical results, seeded operation, good statistical properties
   - Options: PCG (pcg-random), xoroshiro128+, mulberry32, custom implementation
   - Impact: Critical for determinism guarantee

2. **Schema Versioning Strategy** - OPEN (from spec)
   - Question: How to handle schema evolution?
   - Options: Strict backward compatibility, breaking changes with migration, hybrid
   - Recommendation from spec: Hybrid (core stable, extensions flexible)

3. **Confidence Thresholds** - OPEN (from spec)
   - Question: What confidence thresholds trigger manual review?
   - Options: Fixed (80% auto), user-configurable, adaptive
   - Recommendation from spec: User-configurable with sensible presets

4. **Cross-Platform Arithmetic** - NEEDS CLARIFICATION
   - Requirements: Identical floating-point results across Dart/TypeScript
   - Issues: Floating-point precision differences, rounding behavior
   - Options: Fixed-point arithmetic, decimal libraries, strict IEEE 754 compliance

5. **Migration Strategy** - NEEDS CLARIFICATION
   - Requirements: Migrate existing SongModel data to SchillingerSong_v1
   - Issues: Pattern-to-system inference is lossy
   - Options: Best-effort inference, keep dual systems, manual migration only

### Dependencies

**Internal**:
- Existing SongModel_v1 schema (adaptation required)
- Existing validation infrastructure
- Existing test framework (Vitest, Dart test)
- Current pattern generators (may be reused behind systems)

**External**:
- Seeded PRNG library (TBD)
- JSON Schema validator (likely Ajv for TypeScript)
- Git for version control

---

## Constitution Check

**Status**: ⚠️ No constitution file found at `.specify/memory/constitution.md`

**Default Principles Applied**:

1. **SLC (Simple, Lovable, Complete)**:
   - ✅ **Simple**: Theory-first approach is conceptually clean
   - ✅ **Lovable**: Enables composers to work at theory level
   - ⚠️ **Complete**: Complex theory may overwhelm users (mitigated by documentation)
   - **Risk**: No workarounds - reconciliation may fail (explicit loss reporting addresses this)

2. **No Mock Data**:
   - ✅ All systems must be fully functional
   - ✅ No stub methods in production code
   - ✅ Every system parameter must affect output

3. **Theory-First Authority**:
   - ✅ SchillingerSong_v1 is source of truth
   - ✅ No silent mutations during realization
   - ✅ All musical decisions traceable to theory

**Gate Evaluations**:

**Gate 1: Architectural Change** ⚠️ **MAJOR REFACTORING**
- **Impact**: Breaks existing SongModel-based workflows
- **Justification**: Theory-first architecture is fundamental requirement
- **Mitigation**: Migration tools, version bump, transition support

**Gate 2: Cross-Platform Determinism** 🔴 **CRITICAL RISK**
- **Impact**: Core requirement (100% reproducibility)
- **Unknown**: PRNG selection and arithmetic precision
- **Action Required**: Phase 0 research to validate feasibility

**Gate 3: Round-Trip Accuracy** ⚠️ **HIGH RISK**
- **Impact**: User acceptance depends on reconciliation quality
- **Unknown**: Inference accuracy for all 5 books
- **Action Required**: Prototype and test reconciliation early

**Gate 4: Orchestration Complexity** ⚠️ **MODERATE RISK**
- **Impact**: Book V is most complex subsystem
- **Mitigation**: Phased implementation, orchestration last

**Gate Status**: ⚠️ **PROCEED WITH CAUTION**
- Gate 2 (Determinism) must be resolved in Phase 0
- Gate 3 (Round-Trip) needs early prototyping
- Gates 1 and 4 are acceptable risks with mitigations

---

## Phase 0: Research

### Research Tasks

#### RT-1: Cross-Platform Deterministic PRNG
**Question**: Which PRNG algorithm provides identical results across TypeScript and Dart?

**Research Required**:
- Survey available PRNG libraries for both platforms
- Test cross-platform bit-for-bit identicalness
- Evaluate statistical quality
- Assess performance (realization speed impact)

**Candidates**:
1. **PCG (Permuted Congruential Generator)**
   - Pros: Excellent statistical properties, language-agnostic spec
   - Cons: Library availability varies
   - URL: https://www.pcg-random.org/

2. **xoroshiro128+**
   - Pros: Fast, good statistical properties
   - Cons: Must ensure identical implementation across platforms
   - URL: http://xoroshiro.di.unimi.it/

3. **mulberry32**
   - Pros: Simple, easy to implement identically
   - Cons: Smaller state space
   - URL: https://github.com/bryc/code/blob/master/jshash/PRNGs.md

4. **Custom Implementation**
   - Pros: Full control, guaranteed cross-platform
   - Cons: Maintenance burden, validation required

**Decision Framework**:
- MUST: Bit-for-bit identical outputs across platforms
- MUST: Seeded operation
- SHOULD: Good statistical properties (pass TestU01)
- SHOULD: Fast (< 5% overhead in realization)
- NICE: Large state space

**Deliverable**: Choose PRNG and create cross-platform tests proving determinism

---

#### RT-2: Cross-Platform Arithmetic Precision
**Question**: How to ensure identical floating-point arithmetic across Dart and TypeScript?

**Research Required**:
- Document floating-point behavior in both languages
- Test edge cases (rounding, overflow, underflow)
- Evaluate fixed-point alternatives
- Assess decimal library options

**Options**:
1. **Strict IEEE 754 Compliance**
   - Rely on both platforms implementing IEEE 754
   - Document assumptions (e.g., double precision, round-to-nearest)
   - Test extensively for edge cases

2. **Fixed-Point Arithmetic**
   - Use integer arithmetic with implicit scaling
   - Pros: Completely deterministic
   - Cons: Precision loss, range limitations

3. **Decimal Libraries**
   - Use decimal.js (TS) and decimal (Dart)
   - Pros: Precise decimal arithmetic
   - Cons: Performance overhead, API differences

**Decision Framework**:
- MUST: Identical results for all musical calculations
- MUST: Performance acceptable (≤10% overhead)
- SHOULD: Simple API for developers
- NICE: Human-readable intermediate values

**Deliverable**: Arithmetic specification with cross-platform validation tests

---

#### RT-3: Schema Versioning and Migration
**Question**: How to handle SchillingerSong_v1 schema evolution over time?

**Research Required**:
- Survey best practices for JSON schema versioning
- Evaluate migration tooling
- Design backward compatibility strategy
- Document migration paths for breaking changes

**Approach (from spec recommendation: Hybrid)**:
- **Core Stable**: System structures (generator periods, cycle lengths, etc.) never change
- **Extensions Flexible**: Optional new fields can be added without breaking
- **Breaking Changes**: Allowed with explicit migration tools and version bump

**Migration Strategy**:
1. **Version Field**: Every SchillingerSong has `schemaVersion` field
2. **Validation**: System validates against version-specific schema
3. **Migration**: Automatic migration for known versions
4. **Fallback**: Reject unknown versions with clear error

**Deliverable**: Schema versioning specification and migration tools

---

#### RT-4: Reconciliation Accuracy by Book
**Question**: How accurate is system inference for each Schillinger book?

**Research Required**:
- Prototype inference algorithms for Books I-V
- Test on representative musical examples
- Measure confidence scores vs ground truth
- Identify ambiguous or lossy scenarios

**Expected Accuracy by Book**:
- **Book I (Rhythm)**: HIGH confidence (periodic structures are distinctive)
- **Book II (Melody)**: MEDIUM confidence (pitch cycles can be ambiguous)
- **Book III (Harmony)**: MEDIUM confidence (distributions can be inferred)
- **Book IV (Form)**: HIGH confidence (ratio trees are structurally clear)
- **Book V (Orchestration)**: LOW confidence (register/density are decorative choices)

**Research Method**:
1. Create test corpus of songs with known systems
2. Realize songs to produce SongModels
3. Apply human edits (decorative, structural, destructive)
4. Run reconciliation and compare inferred vs actual
5. Measure confidence scores and error rates

**Deliverable**: Accuracy report by book with recommendations

---

#### RT-5: Migration from Existing SongModel
**Question**: How to migrate existing pattern-based songs to theory-first?

**Research Required**:
- Analyze existing SongModel structure
- Identify pattern-to-system mappings
- Design best-effort inference algorithms
- Document loss and limitations

**Migration Challenges**:
- **Patterns → Systems**: Lossy (patterns don't capture theory)
- **Notes → Parameters**: Requires inference (ambiguous)
- **Orchestration → Roles**: May not map cleanly (ad-hoc assignments)

**Migration Strategy Options**:
1. **Best-Effort Automatic**: Infer systems from notes, flag ambiguities
2. **Manual Only**: Require users to rebuild songs from scratch
3. **Dual Representation**: Keep old SongModel alongside new SchillingerSong
4. **Hybrid**: Automatic migration for simple cases, manual for complex

**Recommendation**: Option 4 (Hybrid)
- Automatic migration when confidence is high
- Manual review required when confidence is low
- Preserve original SongModel for reference

**Deliverable**: Migration tool with confidence-based routing

---

### Research Deliverables Summary

**Phase 0 Output**: `research.md` containing:

1. **PRNG Decision**: Algorithm choice with cross-platform validation tests
2. **Arithmetic Specification**: Precision rules with validation tests
3. **Schema Versioning Strategy**: Hybrid approach with migration tools
4. **Reconciliation Accuracy Report**: Expected confidence by book
5. **Migration Strategy**: Hybrid approach with tooling

**Success Criteria**:
- All NEEDS CLARIFICATION items resolved
- Cross-platform determinism proven via tests
- Arithmetic precision validated
- Versioning strategy documented
- Migration path defined

---

## Phase 1: Design & Contracts

### Prerequisites

✅ `research.md` complete with all decisions made
✅ Cross-platform determinism validated
✅ Arithmetic precision specified
✅ Schema versioning strategy defined
✅ Migration approach documented

---

### Data Model: `data-model.md`

#### Core Entities

**SchillingerSong_v1** (Canonical Theory Object)
```typescript
interface SchillingerSong_v1 {
  // Metadata
  schemaVersion: "1.0";
  songId: string; // UUID

  // Global Parameters
  globals: {
    tempo: number; // BPM
    timeSignature: [number, number]; // [numerator, denominator]
    key: PitchClass; // Tonal center
  };

  // Systems (all optional, can be empty)
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
    createdAt: string; // ISO timestamp
    createdBy: string; // User or system ID
    modifiedAt: string; // ISO timestamp
    derivationChain: string[]; // IDs of previous versions
  };
}
```

**RhythmSystem** (Book I)
```typescript
interface RhythmSystem {
  systemId: string; // UUID
  systemType: "rhythm";

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
```

**MelodySystem** (Book II)
```typescript
interface MelodySystem {
  systemId: string;
  systemType: "melody";

  // Pitch Cycle
  cycleLength: number; // mod N
  intervalSeed: number[]; // Ordered intervals

  // Transformations
  rotationRule: RotationRule;
  expansionRules: ExpansionRule[];
  contractionRules: ContractionRule[];

  // Constraints
  contourConstraints: ContourConstraint;
  directionalBias: number; // -1 (descending) to 1 (ascending)
  registerConstraints: RegisterConstraint;
}
```

**HarmonySystem** (Book III)
```typescript
interface HarmonySystem {
  systemId: string;
  systemType: "harmony";

  // Vertical Distribution
  distribution: number[]; // Interval weights

  // Harmonic Rhythm
  harmonicRhythmBinding: string; // RhythmSystem ID

  // Voice Leading
  voiceLeadingConstraints: VoiceLeadingConstraint[];

  // Resolution
  resolutionRules: ResolutionRule[];
}
```

**FormSystem** (Book IV)
```typescript
interface FormSystem {
  systemId: string;
  systemType: "form";

  // Ratio Tree
  ratioTree: number[]; // Section ratios [A, B, C, ...]

  // Nested Structures
  nestedPeriodicity: FormNode[];

  // Reuse and Transformation
  reuseRules: ReuseRule[];
  transformationReferences: TransformationReference[];

  // Closure
  cadenceConstraints: CadenceConstraint[];
  symmetryRules: SymmetryRule[];
}
```

**OrchestrationSystem** (Book V)
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
```

**EnsembleModel**
```typescript
interface EnsembleModel {
  // Voices
  voices: Voice[];

  // Grouping
  groups: Group[]; // Sections, choirs, layers

  // Balance
  balanceRules: BalanceRule[];
}
```

**SongModel_v1** (Derived Output)
```typescript
interface SongModel_v1 {
  // Metadata
  schemaVersion: "1.0";
  songId: string; // Matches SchillingerSong.songId

  // Derivation Reference
  derivationId: string; // Links to DerivationRecord

  // Musical Content
  notes: Note[];
  events: Event[]; // Non-note events (dynamics, articulations)
  voiceAssignments: VoiceAssignment[];

  // Timing
  duration: number; // In beats
  tempoChanges: TempoChange[];

  // Structure
  sections: Section[];
}
```

**DerivationRecord_v1**
```typescript
interface DerivationRecord_v1 {
  derivationId: string;
  sourceSongId: string; // SchillingerSong.songId
  seed: number; // PRNG seed

  // Execution Trace
  executionOrder: string[]; // System IDs in execution order
  outputs: DerivationOutput[];

  // Constraints Applied
  constraintsApplied: ConstraintApplication[];
}
```

**ReconciliationReport_v1**
```typescript
interface ReconciliationReport_v1 {
  reportId: string;
  sourceSongId: string;
  editedModelId: string;

  // Confidence Summary
  confidenceSummary: {
    overall: number; // 0-1
    byBook: {
      rhythm: number;
      melody: number;
      harmony: number;
      form: number;
      orchestration: number;
    };
  };

  // System Matches
  systemMatches: SystemMatch[];

  // Losses
  losses: LossReport[];

  // Suggested Actions
  suggestedActions: SuggestedAction[];
}
```

#### Entity Relationships

```
SchillingerSong_v1 (1) ── realizes to ──→ (1) SongModel_v1
      │                                      │
      │                                      │
      └─ derivation tracked by ──────────────┘
                      ↓
            DerivationRecord_v1

SchillingerSong_v1 ← reconciles with ← edited SongModel_v1
                │
                ↓
        ReconciliationReport_v1

SchillingerSong_v1 contains:
├─ RhythmSystem[] (Book I)
├─ MelodySystem[] (Book II)
├─ HarmonySystem[] (Book III)
├─ FormSystem (Book IV)
├─ OrchestrationSystem (Book V)
├─ EnsembleModel
└─ Bindings (Role ↔ System mappings)
```

---

### API Contracts: `/contracts/`

#### Realization API

**Endpoint**: `POST /api/v1/realize`

**Request**:
```typescript
interface RealizeRequest {
  schillingerSong: SchillingerSong_v1;
  seed?: number; // Optional, system generates if not provided
}

interface RealizeResponse {
  songModel: SongModel_v1;
  derivationRecord: DerivationRecord_v1;
}
```

**Validation**:
- SchillingerSong_v1 must validate against schema
- All bindings must reference valid system IDs
- All constraints must be satisfiable

**Errors**:
- `400 InvalidSchema`: SchillingerSong_v1 fails validation
- `409 ConstraintConflict`: Constraints cannot be satisfied
- `500 RealizationError`: System error during realization

---

#### Reconciliation API

**Endpoint**: `POST /api/v1/reconcile`

**Request**:
```typescript
interface ReconcileRequest {
  originalSong: SchillingerSong_v1;
  editedModel: SongModel_v1;
}

interface ReconcileResponse {
  reconciliationReport: ReconciliationReport_v1;
  proposedUpdate?: SchillingerSong_v1; // Optional, if structural changes found
}
```

**Validation**:
- editedModel must have derivationId linking to originalSong
- All voice IDs must match

**Errors**:
- `400 InvalidModel`: SongModel_v1 fails validation
- `404 DerivationNotFound`: No derivation link between song and model
- `422 Unreconcilable`: Destructive edits cannot be processed

---

#### Validation API

**Endpoint**: `POST /api/v1/validate/song`

**Request**:
```typescript
interface ValidateSongRequest {
  song: SchillingerSong_v1;
  strict?: boolean; // Default true
}

interface ValidateSongResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

---

#### Export API

**Endpoint**: `POST /api/v1/export`

**Request**:
```typescript
interface ExportRequest {
  songModel: SongModel_v1;
  format: "musicxml" | "midi" | "json";
}

interface ExportResponse {
  data: string; // Base64-encoded or text
  format: string;
}
```

---

### Quickstart: `quickstart.md`

#### Installation

```bash
# TypeScript
npm install @schillinger/sdk

# Dart
flutter pub add schillinger_sdk
```

#### Basic Usage

**1. Create a SchillingerSong**

```typescript
import { SchillingerSong, RhythmSystem, MelodySystem } from '@schillinger/sdk';

// Create a simple song
const song: SchillingerSong_v1 = {
  schemaVersion: "1.0",
  songId: uuidv4(),
  globals: {
    tempo: 120,
    timeSignature: [4, 4],
    key: 0, // C
  },
  bookI_rhythmSystems: [
    {
      systemId: uuidv4(),
      systemType: "rhythm",
      generators: [
        { period: 3, phase: 0 },
        { period: 4, phase: 0 },
      ],
      resultantSelection: { method: "interference" },
      permutations: [],
      accentDisplacement: [],
      densityConstraints: { minAttacksPerMeasure: 2, maxAttacksPerMeasure: 8 },
      quantizationConstraint: { grid: 0.25 }, // Sixteenth notes
    },
  ],
  bookII_melodySystems: [],
  bookIII_harmonySystems: [],
  bookIV_formSystem: null,
  bookV_orchestration: {
    // ... orchestration system
  },
  ensembleModel: {
    // ... ensemble configuration
  },
  bindings: {
    roleRhythmBindings: [],
    roleMelodyBindings: [],
    roleHarmonyBindings: [],
    roleEnsembleBindings: [],
  },
  constraints: [],
  provenance: {
    createdAt: new Date().toISOString(),
    createdBy: "user-123",
    modifiedAt: new Date().toISOString(),
    derivationChain: [],
  },
};
```

**2. Realize to SongModel**

```typescript
import { realize } from '@schillinger/sdk';

// Realize with seed
const { songModel, derivationRecord } = await realize(song, 42);

// Play or export
await play(songModel);
await export(songModel, 'musicxml');
```

**3. Edit and Reconcile**

```typescript
import { reconcile } from '@schillinger/sdk';

// Edit the song model
songModel.notes[0].velocity += 10;

// Reconcile edits back to theory
const report = await reconcile(song, songModel);

// Review confidence
console.log(`Overall confidence: ${report.confidenceSummary.overall}`);

// Accept proposed update if confident
if (report.confidenceSummary.overall > 0.8) {
  song = report.proposedUpdate;
}
```

#### Advanced Usage

**Cross-Platform Consistency**

```typescript
// Same seed produces identical results
const seed = 12345;

// TypeScript
const { songModel: tsModel } = await realize(song, seed);

// Dart (via FFI)
final result = await SchillingerSDK.realize(song, seed);
final dartModel = result.songModel;

// Models are identical (byte-for-byte)
assert(identical(tsModel, dartModel));
```

**Custom Constraints**

```typescript
// Add density constraint
song.constraints.push({
  constraintId: uuidv4(),
  type: "density",
  scope: { systemId: rhythmSystem.systemId },
  parameters: {
    minNotes: 4,
    maxNotes: 12,
  },
});
```

**Derivation Inspection**

```typescript
// Trace any note back to its source
const note = songModel.notes[0];
const derivation = derivationRecord.outputs.find(
  (output) => output.noteIds.includes(note.noteId)
);

console.log(`Note generated by: ${derivation.systemId}`);
console.log(`Using parameters:`, derivation.parameters);
```

---

### Agent Context Update

After completing Phase 1, run:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This updates `.specify/agent-context/claude.md` with:
- New schema types (SchillingerSong_v1, etc.)
- New API endpoints
- New dependencies (PRNG library, etc.)
- Architecture diagrams

---

## Phase 2: Implementation Strategy

### Implementation Phases

**Phase 2.1: Foundation** (Weeks 1-2)
- Schema definitions (all v1 schemas)
- Validation framework setup
- PRNG integration and cross-platform tests
- Basic TypeScript infrastructure

**Phase 2.2: Core Systems** (Weeks 3-6)
- Book I: Rhythm systems
- Book II: Melody systems
- Book III: Harmony systems
- Tests for each book

**Phase 2.3: Form and Ensemble** (Weeks 7-8)
- Book IV: Form systems
- Ensemble model
- Binding system

**Phase 2.4: Orchestration** (Weeks 9-10)
- Book V: Orchestration systems
- Register, spacing, density
- Doubling and reinforcement

**Phase 2.5: Realization Pipeline** (Weeks 11-13)
- Realization engine
- Derivation tracking
- Constraint satisfaction
- Determinism testing

**Phase 2.6: Reconciliation** (Weeks 14-16)
- Edit classification
- System inference
- Confidence scoring
- Ambiguity reporting

**Phase 2.7: Migration and Integration** (Weeks 17-18)
- Migration tools
- API endpoints
- Documentation
- Example songs

### Testing Strategy

**Unit Tests** (per system):
- System execution tests
- Constraint validation tests
- Schema validation tests

**Integration Tests**:
- Full realization tests
- Round-trip reconciliation tests
- Cross-platform consistency tests

**Performance Tests**:
- Realization speed benchmarks
- Reconciliation speed benchmarks
- Memory usage tests

**Determinism Tests**:
- 1000 realizations of same song, compare hashes
- Cross-platform byte-for-byte comparison

### Risk Mitigation

**Risk 1: Cross-Platform Determinism Fails**
- **Mitigation**: Validate in Phase 0, use custom PRNG if needed
- **Fallback**: Fixed-point arithmetic

**Risk 2: Reconciliation Accuracy Too Low**
- **Mitigation**: Prototype early in Phase 2.6
- **Fallback**: Require manual approval for low-confidence updates

**Risk 3: Orchestration Complexity Overruns**
- **Mitigation**: Implement Book V last, simplify if needed
- **Fallback**: MVP orchestration (roles only, no advanced features)

**Risk 4: Migration Quality Issues**
- **Mitigation**: Best-effort migration with manual review
- **Fallback**: Keep dual representation (old + new)

---

## Success Criteria

**Phase 0 Complete**:
- ✅ PRNG chosen with cross-platform tests
- ✅ Arithmetic specification with tests
- ✅ Schema versioning strategy defined
- ✅ Reconciliation accuracy documented
- ✅ Migration approach specified

**Phase 1 Complete**:
- ✅ Data model documented (data-model.md)
- ✅ API contracts defined (contracts/*.json)
- ✅ Quickstart guide written (quickstart.md)
- ✅ Agent context updated

**Phase 2 Complete**:
- ✅ All systems implemented (Books I-V + Ensemble)
- ✅ Realization pipeline functional
- ✅ Reconciliation system functional
- ✅ Migration tools available
- ✅ Tests pass (unit, integration, determinism)
- ✅ Documentation complete

**Final Validation**:
- ✅ Theory-only song validates
- ✅ 1000 realizations produce identical hash
- ✅ Cross-platform byte-for-byte identical
- ✅ 90%+ parameters survive round-trip
- ✅ Performance targets met (≤10s for 5-min song)

---

## Next Steps

1. **Execute Phase 0**: Complete all research tasks
2. **Validate Gates**: Ensure determinism and arithmetic are resolved
3. **Execute Phase 1**: Create design artifacts and contracts
4. **Review and Approve**: Stakeholder sign-off before Phase 2 implementation
