# Schillinger SDK System-First Rewrite

**Version**: 1.0
**Status**: Draft
**Created**: 2025-01-07
**Last Updated**: 2025-01-07

---

## 1. Overview

### 1.1 Purpose

The Schillinger SDK rewrite establishes a **theory-first musical system architecture** that enables:

1. **System-First Song Authoring**: Songs are authored directly as Schillinger systems (mathematical structures), not patterns or notes
2. **Deterministic Realization**: Systems execute deterministically to produce executable song models
3. **Bidirectional Round-Trip**: Edited songs can be re-ingested into Schillinger space with honest reconciliation
4. **Complete Orchestration**: Full Book V orchestration support as structural, not decorative
5. **Explainable Operations**: Every musical decision is traceable to system parameters

This refactoring shifts the SDK from **pattern-based composition** to **theory-first composition**, where the canonical song representation is a SchillingerSystem object, not a note sequence.

**Business Value**:
- Composers can create complete songs using only Schillinger theory parameters
- AI systems can reason about music at the theory level, not note level
- All realizations are reproducible and explainable
- Round-trip editing enables seamless workflow between theory and practice
- Orchestration becomes first-class, not an afterthought

### 1.2 Scope

**Included**:
- All 5 Books of the Schillinger System (Rhythm, Melody, Harmony, Form, Orchestration)
- Ensemble Models (voice topology, role assignments, balance)
- Canonical theory layer (SchillingerSong_v1) as source of truth
- Deterministic derivation pipeline (SchillingerSong → SongModel)
- Round-trip reconciliation (edited SongModel → updated SchillingerSong)
- Explicit bindings between roles and systems
- Confidence scoring and ambiguity reporting

**Excluded** (explicit non-goals):
- Synthesis parameters and audio generation
- FX chains and audio processing
- Articulation curves and MIDI CC automation
- "Energy", "mood", or "drive" controls
- Preset systems pretending to be theory
- DAW-specific metaphors
- Performance gestures and humanization
- Tools or intent-based controls

These excluded features may exist **above** the SDK layer, never inside core schemas.

---

## 2. User Scenarios & Testing

### 2.1 Primary Actors

**Composers/Musicians**:
- Want to create music using Schillinger theory
- Need to understand and control every musical parameter
- Require ability to edit realized results and have edits respected

**Music Theorists**:
- Analyze musical structure through Schillinger systems
- Study relationships between theory parameters and output
- Teach composition using formal systems

**AI/ML Systems**:
- Generate or modify music at theory level
- Reason about composition structure, not notes
- Ensure all outputs are theoretically grounded

**Application Developers**:
- Build composition tools on top of SDK
- Implement UI for editing theory parameters
- Provide visualization of system relationships

### 2.2 User Stories

#### Story 1: Theory-First Composition
**As a** composer
**I want to** author a complete song using only Schillinger system parameters
**So that** I have complete theoretical control and understand every musical decision

**Acceptance Criteria**:
- A valid SchillingerSong_v1 can be created with zero notes
- All musical content (rhythm, melody, harmony, form, orchestration) is specified via system parameters
- Realization produces complete, executable SongModel_v1
- Every note in the output is traceable to a system parameter

#### Story 2: Deterministic Realization
**As a** composer
**I want to** realize the same SchillingerSong multiple times with identical results
**So that** I can reliably reproduce my compositions

**Acceptance Criteria**:
- Same SchillingerSong + seed produces identical SongModel hash
- Multiple realizations are byte-for-byte identical
- Derivation record explains every generated event
- Realization is language-agnostic (same across Dart, TypeScript, etc.)

#### Story 3: Edit and Reconcile
**As a** composer
**I want to** edit a realized song and have those edits intelligently re-ingested into my theory
**So that** I can work iteratively between theory and practice

**Acceptance Criteria**:
- Edited SongModel can be submitted for reconciliation
- System classifies edits as decorative, structural, or destructive
- Reconciliation report provides confidence scores for each system
- Structural edits update SchillingerSong appropriately
- Destructive edits are flagged with explicit loss reports
- Ambiguity is reported, never hidden

#### Story 4: Complete Orchestration
**As a** composer
**I want to** orchestrate my compositions using role-based systems
**So that** orchestration is structural and reproducible, not ad-hoc

**Acceptance Criteria**:
- Book V orchestration systems control all voice assignments
- Ensemble model defines voice topology independently
- Roles bind to specific rhythm/melody/harmony systems
- Register, density, and reinforcement are system parameters
- Orchestration survives round-trip editing

#### Story 5: Explainable Systems
**As a** music theorist
**I want to** see exactly how each system parameter affects the musical output
**So that** I can understand and teach composition principles

**Acceptance Criteria**:
- Every note in SongModel links to its derivation source
- Derivation record lists all systems, constraints, and parameters applied
- No "magic" numbers or unexplained operations
- Visualization tools can trace any output event back to theory

### 2.3 User Journey Flows

**Primary Flow: Theory-First Composition**
1. Composer creates SchillingerSong_v1 with:
   - Book I rhythm systems (generators, resultants, permutations)
   - Book II melody systems (cycles, intervals, contours)
   - Book III harmony systems (distributions, voice-leading)
   - Book IV form system (ratio trees, sections)
   - Book V orchestration (roles, ensembles, spacing)
   - Ensemble model (voices, groups, balance)
   - Bindings (role → system mappings)
2. System realizes SchillingerSong → SongModel
3. Composer previews rendered output
4. Composer makes manual edits to SongModel if desired
5. Composer submits edited SongModel for reconciliation
6. System provides reconciliation report with confidence/ambiguity
7. Composer approves structural updates or rejects with understanding of losses
8. Updated SchillingerSong is saved for future realizations

**Secondary Flow: Analysis and Learning**
1. Theorist loads existing SchillingerSong
2. Theorist adjusts system parameters
3. System re-realizes and shows differences
4. Theorist studies derivation record to understand parameter effects
5. Theorist saves variations for comparison

**Error Recovery Flow**
1. Reconciliation produces low confidence or destructive edits
2. System flags affected systems with detailed explanations
3. User chooses: split song, override, or keep original
4. System documents decision in provenance
5. Process continues with clear understanding of trade-offs

### 2.4 Edge Cases & Error Handling

**Ambiguous Reconciliation**:
- **Scenario**: Edited rhythm matches multiple possible generator configurations
- **Handling**: Report all candidates with confidence scores, do not silently choose

**Destructive Edits**:
- **Scenario**: User edits break theoretical consistency (e.g., non-systematic melody)
- **Handling**: Flag as destructive, preserve in realization but do not update theory

**Conflicting Constraints**:
- **Scenario**: Rhythm system and harmony system impose incompatible requirements
- **Handling**: Realization fails with explicit error explaining conflict

**Ensemble Mismatch**:
- **Scenario**: Orchestration requires more voices than ensemble provides
- **Handling**: Validation error before realization, explain voice count requirement

**Form Violations**:
- **Scenario**: Edited song structure violates ratio-based form system
- **Handling**: Flag during reconciliation, suggest new form system or reject edit

**Empty Systems**:
- **Scenario**: SchillingerSong has no systems for a particular book
- **Handling**: Valid if intentional (e.g., percussion-only song needs no melody), allow realization

---

## 3. Functional Requirements

### 3.1 Core Requirements

**FR-1**: SchillingerSong_v1 Schema
- **Description**: Define canonical theory object containing only systems, parameters, bindings, and constraints
- **Components**:
  - Top-level structure with globals, Books I-V systems, ensemble model, bindings, constraints, provenance
  - Every system has systemId (stable UUID), explicit parameters, explicit constraints, versioned schema
  - No notes, events, MIDI, or audio data
- **Acceptance Criteria**:
  - Schema validates required and optional fields
  - SchillingerSong_v1 can be serialized to/from JSON
  - Valid SchillingerSong_v1 exists with zero musical events
  - All systems reference explicit parameters (no magic values)
- **Priority**: Must

**FR-2**: Book I - Rhythm Systems
- **Description**: Implement rhythm generation via periodic systems and resultants
- **Components**:
  - Generator periods (P₁, P₂, ...) with phase offsets
  - Generator ratios (e.g., 3:2, 5:4)
  - Resultant selection rules
  - Accent displacement rules
  - Permutation rules (rotation, retrograde, etc.)
  - Density constraints (minimum/maximum attacks per measure)
  - Grid/quantization policy (as constraint, not post-processing)
- **Acceptance Criteria**:
  - Rhythm systems produce explicit attack points from generators
  - Resultants are derived mathematically, not stored as patterns
  - Density is bounded and constrained
  - Forward direction: RhythmSystem → rhythmic event structure
  - Reverse direction: infer generator candidates with confidence scores
- **Priority**: Must

**FR-3**: Book II - Melody Systems
- **Description**: Implement pitch motion as modular arithmetic systems
- **Components**:
  - Pitch cycle length (mod N)
  - Interval seed sets (ordered collections of intervals)
  - Rotation rules (cyclic shifts of interval sequence)
  - Expansion/contraction rules (interval multiplication)
  - Contour constraints (directional restrictions)
  - Directional bias (numeric preference for ascending/descending)
  - Register constraints (pitch range limits)
- **Acceptance Criteria**:
  - Melody is generated from cycle math, not scales
  - Pitch sequences follow modular arithmetic exactly
  - Contour is constrained via numeric parameters
  - Forward direction: MelodySystem → pitch sequence
  - Reverse direction: infer pitch cycles and interval seeds with ambiguity reporting
- **Priority**: Must

**FR-4**: Book III - Harmony Systems
- **Description**: Implement vertical pitch organization via distributions
- **Components**:
  - Vertical interval distribution rules
  - Chord-class derivation constraints
  - Harmonic rhythm system (binds to Book I rhythm system)
  - Voice-leading constraints (interval limits between voices)
  - Resolution rules (tendency constraints)
- **Acceptance Criteria**:
  - Harmony is derived from distributions, not named chords
  - Chords emerge from interval distributions
  - Harmonic rhythm follows explicit binding to rhythm system
  - Forward direction: HarmonySystem → vertical pitch structures
  - Reverse direction: infer distribution classes and harmonic rhythm candidates
- **Priority**: Must

**FR-5**: Book IV - Form Systems
- **Description**: Implement large-scale temporal structure via ratio trees
- **Components**:
  - Section ratio tree (A:B:C...)
  - Nested periodicity (hierarchical time structures)
  - Section reuse/transformation references
  - Formal symmetry rules
  - Cadence/closure constraints
- **Acceptance Criteria**:
  - Form is defined via ratios, not timeline hacks
  - Sections are structural entities
  - Nested forms are supported
  - Forward direction: FormSystem → temporal structure
  - Reverse direction: infer ratio groupings where possible, preserve human edits explicitly
- **Priority**: Must

**FR-6**: Book V - Orchestration Systems
- **Description**: Implement structural orchestration controlling voice assignments
- **Components**:
  - Role hierarchy (primary/secondary/tertiary priority levels)
  - Functional classes (foundation, motion, ornament, reinforcement)
  - Register & spacing systems (absolute ranges, minimum/maximum spacing, crossing rules)
  - Density & weight distribution (density budgets, coupling rules)
  - Doubling & reinforcement (octave doubling, unison reinforcement, delayed shadows)
  - Voice splitting & merging (one system → multiple voices)
  - Orchestration over form (role reassignment per section)
- **Acceptance Criteria**:
  - Orchestration answers: who plays what, where, with what weight, in relation to whom
  - All orchestration is structural (no sound design)
  - Forward direction: OrchestrationSystem → voice assignments
  - Reverse direction: register, density, reinforcement survive round-trip
  - No synthesis parameters or audio controls
- **Priority**: Must

**FR-7**: Ensemble Models
- **Description**: Define voice topology independent of specific instruments
- **Components**:
  - Voice count limits
  - Grouping (sections, choirs, layers)
  - Role pools (which roles each voice can fulfill)
  - Inter-group constraints
  - Balance rules (relative weight between groups)
- **Acceptance Criteria**:
  - Ensemble model enables chamber vs massed orchestration
  - Voice topology is separate from orchestration systems
  - Role assignments are validated against ensemble capacity
- **Priority**: Must

**FR-8**: Bindings System
- **Description**: Explicitly connect roles to systems
- **Components**:
  - Role → RhythmSystem bindings
  - Role → MelodySystem bindings
  - Role → HarmonySystem bindings
  - Role → Ensemble slot bindings
- **Acceptance Criteria**:
  - Bindings are structural (not stylistic preferences)
  - All roles must bind to valid systems
  - Binding validation prevents invalid configurations
- **Priority**: Must

**FR-9**: Deterministic Derivation Pipeline
- **Description**: Realize SchillingerSong into SongModel via deterministic execution
- **API Contract**:
  ```
  realize(schillingerSong: SchillingerSong_v1, seed: DeterminismKey)
    → { songModel: SongModel_v1, derivation: DerivationRecord_v1 }
  ```
- **Components**:
  - Deterministic number generation (seeded PRNG)
  - System execution in dependency order
  - Constraint satisfaction
  - Derivation record generation
- **Acceptance Criteria**:
  - Same input + seed produces identical SongModel hash
  - Realization is reproducible across languages
  - Derivation record explains every generated event
  - System failures provide explicit error messages
- **Priority**: Must

**FR-10**: Round-Trip Reconciliation
- **Description**: Re-ingest edited songs back into Schillinger space
- **API Contract**:
  ```
  reconcile(schillingerSong: SchillingerSong_v1, editedSong: SongModel_v1)
    → ReconciliationReport_v1
  ```
- **Components**:
  - Edit classification (Decorative, Structural, Destructive)
  - System inference (reverse engineering)
  - Confidence scoring
  - Ambiguity detection
  - Loss reporting
  - Suggested actions (update, split, reject)
- **Acceptance Criteria**:
  - Every edit is classified (no silent promotion)
  - Decorative edits do not mutate theory
  - Structural edits update SchillingerSong
  - Destructive edits remain realization-only with explicit flags
  - Confidence scores quantify inference certainty
  - Ambiguity is reported, never hidden
  - Loss reports explain what cannot be recovered
- **Priority**: Must

**FR-11**: Derivation Record
- **Description**: Explainable record of realization process
- **Components**:
  - Derivation ID, source song ID, seed used
  - System execution order
  - Constraints applied
  - Generated outputs with source system IDs
- **Acceptance Criteria**:
  - Every output event links to its derivation source
  - Record is serializable and versioned
  - Record is queryable for analysis and debugging
- **Priority**: Must

**FR-12**: Reconciliation Report
- **Description**: Detailed report of round-trip reconciliation
- **Components**:
  - Confidence summary per system
  - System matches with confidence scores
  - Losses with explanations
  - Suggested actions
- **Acceptance Criteria**:
  - Report quantifies confidence for each system
  - Losses are explicit and explained
  - Actions are actionable and clear
  - User can make informed decisions about updates
- **Priority**: Must

### 3.2 Business Rules

**BR-1**: Authority Hierarchy
- SchillingerSong_v1 is the source of truth
- SongModel_v1 is derived output, never authoritative
- PlaybackState is ephemeral, never persisted as theory

**BR-2**: No Silent Mutations
- Nothing is allowed to silently mutate theory during realization or playback
- All theory changes must be explicit and user-initiated

**BR-3**: Determinism
- All system execution must be deterministic given same seed
- No randomness outside of seeded PRNG
- Derivation must be reproducible across implementations

**BR-4**: Explicitness
- No magic numbers or implicit defaults in schemas
- All parameters must be explicit in SchillingerSong_v1
- Defaults may exist for user convenience, but must be serialized

**BR-5**: Ambiguity Reporting
- Ambiguity must always be reported, never hidden
- Confidence scores quantify uncertainty
- User makes final decisions, not system

**BR-6**: Separation of Concerns
- Theory layer (SchillingerSong) knows nothing about audio
- Realization layer (SongModel) knows nothing about synthesis
- Playback layer concerns itself only with performance

**BR-7**: Orchestration is Structural
- Book V orchestration is about voice assignment, not sound
- No synthesis parameters in orchestration systems
- Sound design lives above the SDK layer

### 3.3 Data Requirements

**SchillingerSong_v1 Data**:
- System definitions (all 5 books + ensemble)
- Parameter values (all explicit, no magic)
- Constraint definitions
- Binding mappings
- Provenance metadata
- Size: Expected 1-50 KB per song (theory-only)

**SongModel_v1 Data**:
- Realized notes and events
- Voice assignments
- Timing information
- Metadata linking to derivation
- Size: Expected 10-500 KB per song (depending on length)

**DerivationRecord_v1 Data**:
- Execution trace
- System outputs
- Constraint applications
- Source mappings
- Size: Expected 5-100 KB per derivation

**ReconciliationReport_v1 Data**:
- Confidence scores
- System matches
- Loss reports
- Suggested actions
- Size: Expected 1-20 KB per report

### 3.4 Integration Points

**External Systems**:
- Notation software (export via MusicXML/MIDI)
- DAWs (export via standard formats)
- Audio engines (realized song feeds audio layer)
- Analysis tools (derivation records for study)
- AI/ML systems (theory-level manipulation)

**API Boundaries**:
- Realization API (SchillingerSong → SongModel)
- Reconciliation API (SongModel → SchillingerSong)
- Export API (SongModel → standard formats)
- Validation API (schema compliance checking)

---

## 4. Non-Functional Requirements

### 4.1 Performance

**Realization Performance**:
- Realize 5-minute song in under 10 seconds on consumer hardware
- Memory usage under 500 MB during realization
- Support real-time preview for short sections (< 30 seconds)

**Reconciliation Performance**:
- Reconcile 5-minute song in under 30 seconds
- Memory usage under 1 GB during reconciliation

**Validation Performance**:
- Validate SchillingerSong_v1 schema in under 100 ms
- Validate SongModel_v1 schema in under 500 ms

### 4.2 Security

**Data Integrity**:
- All serialized objects validate against schemas before use
- Versioning prevents incompatible data loading
- Checksums detect data corruption

**Provenance Tracking**:
- All objects include creation/modification metadata
- Derivation chains are auditable
- Edit history is preserved

### 4.3 Reliability

**Determinism**:
- Same inputs produce identical outputs (bit-for-bit)
- Cross-platform consistency (Dart, TypeScript, Python)
- Regression testing suite validates determinism

**Error Handling**:
- All errors provide explicit, actionable messages
- No silent failures
- Validation before execution prevents bad states

### 4.4 Scalability

**Song Length**:
- Support songs from 10 seconds to 1 hour
- Memory usage scales linearly with duration
- No performance cliffs at any length

**System Complexity**:
- Support 1-100 systems per book per song
- Support 1-500 voices in ensemble
- Support arbitrarily nested form structures

### 4.5 Usability

**Learnability**:
- Schema structure follows Schillinger theory directly
- Concepts map one-to-one with theory books
- Minimal abstraction layers

**Debuggability**:
- Derivation records explain everything
- Validation errors point to exact issues
- Reconciliation reports are comprehensive

**Composability**:
- Systems can be combined in any valid configuration
- No hidden coupling between systems
- Clear dependency graph

---

## 5. Key Entities & Data

### 5.1 Entity Definitions

**SchillingerSong_v1**
- **Purpose**: Canonical theory representation
- **Contains**: Systems, parameters, bindings, constraints, provenance
- **Relationships**: Derives to SongModel_v1, updated by reconciliation
- **Lifecycle**: Authored → Realized → (optionally) Edited → Reconciled

**SongModel_v1**
- **Purpose**: Executable song representation
- **Contains**: Notes, events, timing, voice assignments
- **Relationships**: Derived from SchillingerSong_v1, feeds playback/export
- **Lifecycle**: Created by realization, edited by user, reconciled back to theory

**DerivationRecord_v1**
- **Purpose**: Explainable trace of realization
- **Contains**: Execution order, system outputs, constraint applications, source mappings
- **Relationships**: Links SchillingerSong_v1 to SongModel_v1
- **Lifecycle**: Created by realization, used for analysis and debugging

**ReconciliationReport_v1**
- **Purpose**: Report on round-trip reconciliation
- **Contains**: Confidence scores, system matches, losses, suggested actions
- **Relationships**: Links edited SongModel_v1 to updated SchillingerSong_v1
- **Lifecycle**: Created by reconciliation, used for decision-making

**System Entities (per book)**:
- RhythmSystem (Book I)
- MelodySystem (Book II)
- HarmonySystem (Book III)
- FormSystem (Book IV)
- OrchestrationSystem (Book V)
- EnsembleModel

**Binding Entities**:
- RoleRhythmBinding
- RoleMelodyBinding
- RoleHarmonyBinding
- RoleEnsembleBinding

**Constraint Entities**:
- DensityConstraint
- RegisterConstraint
- SpacingConstraint
- ContourConstraint
- VoiceLeadingConstraint

### 5.2 Data Flow

**Primary Flow: Author → Realize → Playback**
1. User authors SchillingerSong_v1
2. System validates SchillingerSong_v1 schema
3. User calls realize(schillingerSong, seed)
4. System executes systems in dependency order
5. System generates SongModel_v1
6. System generates DerivationRecord_v1
7. SongModel_v1 feeds playback/export

**Secondary Flow: Edit → Reconcile → Update**
1. User edits SongModel_v1
2. User calls reconcile(schillingerSong, editedSong)
3. System classifies edits (decorative/structural/destructive)
4. System infers updated system parameters
5. System generates ReconciliationReport_v1
6. User reviews report and approves/rejects changes
7. If approved, SchillingerSong_v1 is updated

**Tertiary Flow: Analyze → Learn**
1. Theorist loads SchillingerSong_v1
2. Theorist adjusts parameters
3. Theorist calls realize() with new parameters
4. Theorist compares DerivationRecord_v1 outputs
5. Theorist studies parameter effects

---

## 6. Success Criteria

### 6.1 Measurable Outcomes

**SC-1**: Theory-Only Authoring
- **Measurement**: A valid SchillingerSong_v1 can be created and saved with zero musical events
- **Target**: 100% of test songs validate and serialize correctly
- **Method**: Automated test suite creates theory-only songs, validates schema, verifies serialization

**SC-2**: Deterministic Realization
- **Measurement**: Same SchillingerSong_v1 + seed produces identical SongModel_v1 hash across multiple realizations
- **Target**: 100% reproducibility across 1000 realizations of same song
- **Method**: Automated tests realize same song 1000 times, compare cryptographic hashes

**SC-3**: Cross-Platform Consistency
- **Measurement**: Same input produces identical output across Dart and TypeScript implementations
- **Target**: Bit-for-bit identical outputs across platforms
- **Method**: Cross-platform test suite realizes same songs in Dart and TypeScript, compare outputs

**SC-4**: Full Round-Trip Survival
- **Measurement**: SchillingerSong → Realize → Edit → Reconcile produces either (a) updated theory OR (b) explicit loss report
- **Target**: 90% of theory parameters survive round-trip with ≥80% confidence
- **Method**: Test suite creates songs, realizes, makes edits, reconciles, measures parameter recovery

**SC-5**: Orchestration Survival
- **Measurement**: Register, density, and reinforcement parameters survive round-trip
- **Target**: 95% of orchestration parameters survive with ≥70% confidence
- **Method**: Test suite creates orchestration-heavy songs, edits, reconciles, measures survival

**SC-6**: Explainability
- **Measurement**: Every note in SongModel links to derivation source in DerivationRecord
- **Target**: 100% of notes have traceable lineage
- **Method**: Automated tests verify all notes have source mappings

**SC-7**: Ambiguity Reporting
- **Measurement**: Reconciliation reports confidence scores and ambiguity flags
- **Target**: 100% of reconciled songs include confidence scores for all systems
- **Method**: Test suite verifies all reconciliation reports include required confidence data

**SC-8**: Performance Targets
- **Measurement**: Realization time for 5-minute song
- **Target**: ≤10 seconds on consumer hardware (M1 MacBook Pro or equivalent)
- **Method**: Performance benchmark suite realizes songs of varying lengths

**SC-9**: Validation Coverage
- **Measurement**: Test suite coverage of all schema fields and system types
- **Target**: ≥90% code coverage, all schema fields validated
- **Method**: Coverage analysis, manual review of schema validation tests

**SC-10**: Documentation Completeness
- **Measurement**: All schemas, APIs, and algorithms documented
- **Target**: 100% of public APIs documented with examples
- **Method**: Documentation coverage audit

### 6.2 User Experience Goals

**Composability**:
- Users can combine systems intuitively without hidden coupling
- System combinations either work cleanly or fail with clear explanation

**Predictability**:
- Parameter adjustments produce expected results
- Derivation records explain unexpected outcomes

**Transparency**:
- Every operation is explainable via derivation records
- Reconciliation reports are comprehensive and understandable

**Forgiveness**:
- Edits are preserved unless explicitly rejected
- Reconciliation suggests sensible actions
- Destructive edits are flagged before theory is lost

**Learnability**:
- Concepts map directly to Schillinger theory
- Schema structure reflects theoretical structure
- Examples demonstrate common patterns

---

## 7. Assumptions & Dependencies

### 7.1 Assumptions

**User Expertise**:
- Users have basic familiarity with Schillinger System concepts
- Users understand musical theory fundamentals (rhythm, melody, harmony)
- Training materials will be provided for new users

**Implementation Environment**:
- SDK will run on modern JavaScript/Dart runtimes
- Access to seeded PRNG is available
- JSON serialization is supported

**Integration Context**:
- Audio playback is handled by external layer
- UI is built by application developers
- Notation export uses standard formats (MusicXML, MIDI)

### 7.2 Dependencies

**Internal**:
- Existing SongModel_v1 schema (will be adapted)
- Existing validation infrastructure
- Existing test framework

**External**:
- Seeded PRNG implementation (e.g., PCG, xoroshiro)
- JSON schema validation library
- Git for version control (for feature branches)

**Future**:
- Audio engine integration (out of scope for this rewrite)
- UI development (out of scope for this rewrite)
- AI/ML integration (out of scope for this rewrite)

### 7.3 Constraints

**Theoretical Fidelity**:
- Must adhere to Schillinger System principles as documented
- Cannot simplify or "abstract away" theoretical complexity
- No "magic" parameters that bypass theory

**Backward Compatibility**:
- May break existing SongModel_v1 usage (acceptable for major version bump)
- Migration path must be provided for existing songs
- API changes must be documented

**Performance**:
- Realization cannot be slow enough to hinder composition workflow
- Reconciliation must be fast enough for interactive editing

**Platform Support**:
- Must work on web (JavaScript) and mobile (Dart)
- Cannot use platform-specific APIs

---

## 8. Risks & Mitigation

### 8.1 Identified Risks

**Risk 1: Complexity Overwhelms Users**
- **Description**: Schillinger theory is complex; users may struggle with parameters
- **Impact**: Low adoption, user frustration
- **Probability**: High
- **Mitigation**:
  - Provide comprehensive examples and tutorials
  - Build UI layers that simplify common cases
  - Offer presets for typical genres/styles (above SDK layer)
  - Document every parameter extensively

**Risk 2: Round-Trip Accuracy Too Low**
- **Description**: Reconciliation cannot accurately infer edited systems
- **Impact**: Users lose edits, frustration
- **Probability**: Medium
- **Mitigation**:
  - Focus on high-confidence inferences first
  - Provide explicit loss reports
  - Allow user to choose between auto-update and manual review
  - Improve inference algorithms iteratively

**Risk 3: Performance Issues**
- **Description**: Realization or reconciliation is too slow
- **Impact**: Poor UX, workflow interruptions
- **Probability**: Medium
- **Mitigation**:
  - Benchmark early and often
  - Optimize critical paths (PRNG, constraint satisfaction)
  - Cache intermediate results where safe
  - Provide progress indicators

**Risk 4: Schema Design Flaws**
- **Description**: Schema cannot represent important musical concepts
- **Impact**: Limited expressiveness, user workarounds
- **Probability**: Medium
- **Mitigation**:
  - Thoroughly review schemas with theory experts
  - Build flexibility (extensibility) into schemas
  - Validate schemas against real-world compositions
  - Version schemas explicitly to support evolution

**Risk 5: Cross-Platform Inconsistency**
- **Description**: Dart and TypeScript implementations produce different outputs
- **Impact**: Violates determinism requirement
- **Probability**: Low
- **Mitigation**:
  - Use identical PRNG algorithms
  - Specify exact arithmetic (floating-point precision, rounding)
  - Cross-platform test suite
  - Document exact execution order

**Risk 6: Adoption Resistance**
- **Description**: Existing users resist migration to theory-first approach
- **Impact**: Low uptake, parallel systems
- **Probability**: Medium
- **Mitigation**:
  - Provide migration tools from old to new format
  - Maintain backward compatibility where possible
  - Demonstrate clear benefits of new approach
  - Support both systems during transition period

### 8.2 Mitigation Strategies

**Comprehensive Documentation**:
- Write detailed guides for each book
- Provide annotated examples
- Create video tutorials
- Build interactive explorers

**Iterative Development**:
- Release in stages (Book I first, then others)
- Gather user feedback early
- Adjust schemas based on real usage
- Maintain open communication channels

**Testing Excellence**:
- Extensive unit test coverage
- Integration tests for round-trip
- Cross-platform consistency tests
- Performance regression tests

**Community Building**:
- Early access program for power users
- Responsive issue triage
- Transparent development roadmap
- Contribution guidelines for extensions

---

## 9. Open Questions

**Q1: Schema Versioning Strategy**
- **Context**: SchillingerSong_v1 is explicitly versioned, but evolution strategy is unclear
- **Options**:
  - A) Strict backward compatibility (new fields optional, old fields never removed)
  - B) Breaking changes allowed with migration tools
  - C) Hybrid (core stable, extensions flexible)
- **Impact**: Affects long-term maintenance and user experience
- **Recommendation**: Option C - Keep core system structures stable, allow extensibility for new features

**Q2: Confidence Thresholds**
- **Context**: Reconciliation produces confidence scores, but action thresholds are undefined
- **Options**:
  - A) Fixed thresholds (e.g., 80% = auto-accept, 50% = manual review)
  - B) User-configurable thresholds per project
  - C) Adaptive thresholds based on context
- **Impact**: Affects reconciliation UX and automation level
- **Recommendation**: Option B - User-configurable defaults with sensible presets

**Q3: Ensemble Model Granularity**
- **Context**: Ensemble model can represent voices at various granularity levels (individual, sections, groups)
- **Options**:
  - A) Require individual voices (most explicit)
  - B) Allow abstract groups (most flexible)
  - C) Hybrid with requirements for voice count but not individual identities
- **Impact**: Affects schema complexity and expressiveness
- **Recommendation**: Option A - Require individual voices for clarity and validation

---

## Appendix A: Glossary

**Schillinger System**: Mathematical theory of music composition developed by Joseph Schillinger, organized into Books I-V

**System**: A mathematical structure that generates musical material via deterministic rules

**Realization**: Process of executing Schillinger systems to produce concrete musical events

**Derivation**: Trace of how each musical event was generated from systems

**Reconciliation**: Process of inferring updated system parameters from edited musical material

**Round-Trip**: Author → Realize → Edit → Reconcile cycle

**Resultant**: Rhythmic pattern generated from interference of two or more periodic generators

**Generator**: Periodic system that produces attacks or events at regular intervals

**Ensemble**: Collection of voices with assigned roles

**Role**: Functional category (e.g., bass, melody, accompaniment) assigned to voices

**Binding**: Explicit mapping between roles and systems

**Constraint**: Rule that limits system output (e.g., density, register, spacing)

**Decorative Edit**: Edit that does not alter theory (e.g., micro-timing, velocity)

**Structural Edit**: Edit that changes systems or constraints

**Destructive Edit**: Edit that breaks theoretical consistency

**Confidence**: Quantified certainty (0-1) that inferred system is correct

**Ambiguity**: Existence of multiple valid system interpretations for same material

---

## Appendix B: References

**Primary Sources**:
- Schillinger, J. (1946). *The Schillinger System of Musical Composition*
- Schillinger, J. (1978). *The Mathematical Basis of the Arts*

**Technical References**:
- JSON Schema specification
- Deterministic PRNG algorithms (PCG, xoroshiro)
- Cross-platform arithmetic precision standards

**Related Work**:
- Music theory formalizations
- Algorithmic composition systems
- Computer-assisted composition tools
