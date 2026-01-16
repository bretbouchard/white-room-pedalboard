# Implementation Tasks: Schillinger SDK System-First Rewrite

**Feature**: Schillinger SDK System-First Rewrite
**Branch**: feature/schillinger-sdk-systemfirst-rewrite-20260107-084720
**Generated**: 2025-01-07

---

## Overview

This document breaks down the Schillinger SDK rewrite into actionable, implementation-ready tasks organized by user story. Each user story represents a complete, independently testable increment.

**Total Tasks**: 87
**Estimated Duration**: 18 weeks
**Parallel Opportunities**: 23 tasks can run in parallel

---

## Implementation Strategy

### MVP Scope
**Phase 3 (User Story 1)** - Theory-First Composition
- Delivers core SchillingerSong_v1 schema
- Basic Books I-III systems (Rhythm, Melody, Harmony)
- Simple realization pipeline
- Single-platform (TypeScript)

### Incremental Delivery
- **Phase 4**: Add determinism guarantees (US2)
- **Phase 5**: Add reconciliation (US3)
- **Phase 6**: Add orchestration (US4)
- **Phase 7**: Add derivation visualization (US5)

### Parallel Execution Strategy
- Within each phase, tasks marked [P] can run in parallel
- Different files = parallelizable
- Same file = sequential (must coordinate)
- Foundation phases (1-2) must complete before any user story

---

## Phase 1: Setup and Infrastructure

**Duration**: Week 1
**Goal**: Project structure and shared infrastructure

### Tasks

**T001**: Initialize project structure for Schillinger SDK v1
- [Story]: Setup
- [File]: `/packages/core/src/`
- Create directory structure: theory/, realize/, reconcile/, types/
- Set up TypeScript configuration with strict mode
- Configure path aliases for clean imports
- Set up ESLint and Prettier rules
- **Deliverable**: Buildable project with clean structure

**T002**: Set up JSON Schema validation framework
- [Story]: Setup
- [File]: `/packages/core/src/validation/`
- Install Ajv (Another JSON Schema Validator)
- Create schema loader for versioned schemas
- Set up schema validation utilities
- Create validation error types
- **Deliverable**: Working validation framework with tests

**T003**: Create UUID utilities for stable entity IDs
- [Story]: Setup
- [File]: `/packages/core/src/utils/uuid.ts`
- Implement UUID v4 generator
- Add UUID validation utilities
- Export as named functions
- **Deliverable**: UUID utilities with unit tests

**T004**: Set up testing infrastructure (TypeScript)
- [Story]: Setup
- [File]: `/tests/unit/`, `/tests/integration/`
- Configure Vitest for unit tests
- Set up test environment with fixtures
- Create test helper utilities
- Add coverage reporting (Istanbul)
- **Deliverable**: Passing test suite with >80% coverage

**T005**: Create build and development scripts
- [Story]: Setup
- [File]: `/package.json`, `/turbo.json`
- Set up Turborepo for monorepo builds
- Create development script (watch mode)
- Create production build script
- Add lint and test scripts
- **Deliverable**: Working build pipeline

---

## Phase 2: Foundational Components

**Duration**: Week 1-2
**Goal**: Block prerequisites for all user stories

**Critical Path**: Must complete before ANY user story can start

### Tasks

**T006**: Implement PCG Random Number Generator (TypeScript)
- [Story]: US2 (Deterministic Realization)
- [File]: `/packages/core/src/random/pcg.ts`
- Implement PCG-random state transition (128-bit state)
- Implement output function (permuted congruential)
- Add seed initialization from 32-bit integer
- Add nextInt(), nextFloat() methods
- **Deliverable**: PCG implementation with cross-platform tests

**T007**: Implement PCG Random Number Generator (Dart)
- [Story]: US2 (Deterministic Realization)
- [File]: `/packages/dart/lib/random/pcg.dart`
- Port PCG algorithm from TypeScript implementation
- Ensure identical state transition and output functions
- Add seed initialization from 32-bit integer
- Add nextInt(), nextFloat() methods
- **Deliverable**: Dart PCG implementation matching TypeScript

**T008**: Create cross-platform determinism validation tests
- [Story]: US2 (Deterministic Realization)
- [File]: `/tests/cross-platform/determinism.test.ts`
- Generate 1000 random sequences with same seed
- Compare TypeScript vs Dart outputs byte-for-byte
- Test edge cases (min/max int, seed 0, etc.)
- **Deliverable**: Passing cross-platform determinism tests

**T009**: Define IEEE 754 arithmetic specification and edge cases
- [Story]: US2 (Deterministic Realization)
- [File]: `/docs/specs/arithmetic-spec.md`
- Document double precision assumptions
- List supported operations and edge cases
- Document forbidden operations (eval, non-associative ops)
- Create validation test suite for edge cases
- **Deliverable**: Arithmetic spec with 1000+ test cases

**T010**: Create core TypeScript type definitions
- [Story]: US1 (Theory-First)
- [File]: `/packages/core/src/types/index.ts`
- Define SchillingerSong_v1, SongModel_v1 interfaces
- Define all system types (RhythmSystem, MelodySystem, etc.)
- Define DerivationRecord_v1, ReconciliationReport_v1
- Export all types with JSDoc comments
- **Deliverable**: Complete type definitions file

**T011**: Create JSON Schema for SchillingerSong_v1
- [Story]: US1 (Theory-First)
- [File]: `/packages/core/src/schemas/schillinger-song-v1.schema.json`
- Define schema with all required fields
- Add validation for UUIDs, pitch ranges, etc.
- Set schemaVersion to "1.0"
- Add examples in schema
- **Deliverable**: Valid JSON schema with examples

**T012**: Create JSON Schema for SongModel_v1
- [Story]: US1 (Theory-First)
- [File]: `/packages/core/src/schemas/song-model-v1.schema.json`
- Define schema with note, event structures
- Add validation for timing, pitch ranges
- Link to derivationId field
- Add examples in schema
- **Deliverable**: Valid JSON schema with examples

**T013**: Create JSON Schema for DerivationRecord_v1
- [Story]: US5 (Explainable Systems)
- [File]: `/packages/core/src/schemas/derivation-record-v1.schema.json`
- Define schema with execution trace fields
- Add system output structures
- Link to sourceSongId and seed
- **Deliverable**: Valid JSON schema

**T014**: Create JSON Schema for ReconciliationReport_v1
- [Story]: US3 (Edit and Reconcile)
- [File]: `/packages/core/src/schemas/reconciliation-report-v1.schema.json`
- Define schema with confidence summary
- Add system match and loss structures
- Include suggested actions format
- **Deliverable**: Valid JSON schema

---

## Phase 3: User Story 1 - Theory-First Composition

**Duration**: Weeks 2-3
**Goal**: Author complete songs using Schillinger systems

**User Story**: As a composer, I want to author a complete song using only Schillinger system parameters, so that I have complete theoretical control and understand every musical decision.

**Independent Test Criteria**:
- [ ] Can create valid SchillingerSong_v1 with zero notes
- [ ] All musical content specified via system parameters
- [ ] Realization produces executable SongModel_v1
- [ ] Every note traceable to system parameter

### Tasks

**T015**: Implement SchillingerSong_v1 data structure
- [Story]: US1
- [File]: `/packages/core/src/theory/schillinger-song.ts`
- Create SchillingerSong_v1 class
- Implement validation against schema
- Add serialization/deserialization (JSON)
- Add factory methods for creating songs
- **Deliverable**: Working SchillingerSong_v1 class with tests

**T016**: Implement RhythmSystem (Book I) - Generators and Resultants
- [Story]: US1
- [File]: `/packages/core/src/theory/systems/rhythm.ts`
- Create RhythmSystem class with generators
- Implement resultant calculation (interference pattern)
- Add generator period/phase validation
- Add density constraint checking
- **Deliverable**: Rhythm system with unit tests

**T017**: Implement RhythmSystem - Permutations and Transformations
- [Story]: US1
- [File]: `/packages/core/src/theory/systems/rhythm.ts`
- Add permutation rules (rotation, retrograde)
- Implement accent displacement
- Add quantization constraint support
- **Deliverable**: Complete rhythm system with tests [P with T016]

**T018**: Implement MelodySystem (Book II) - Pitch Cycles
- [Story]: US1
- [File]: `/packages/core/src/theory/systems/melody.ts`
- Create MelodySystem class with pitch cycles
- Implement interval seed handling
- Add cycle length validation (mod N)
- **Deliverable**: Melody system with unit tests [P]

**T019**: Implement MelodySystem - Transformations and Constraints
- [Story]: US1
- [File]: `/packages/core/src/theory/systems/melody.ts`
- Add rotation rules for interval cycles
- Implement expansion/contraction transformations
- Add contour constraint checking
- Add register constraints
- **Deliverable**: Complete melody system with tests [P with T018]

**T020**: Implement HarmonySystem (Book III)
- [Story]: US1
- [File]: `/packages/core/src/theory/systems/harmony.ts`
- Create HarmonySystem class with distributions
- Implement vertical interval distribution
- Add harmonic rhythm binding to RhythmSystem
- Add voice-leading constraint checking
- **Deliverable**: Harmony system with unit tests [P]

**T021**: Implement basic FormSystem (Book IV)
- [Story]: US1
- [File]: `/packages/core/src/theory/systems/form.ts`
- Create FormSystem class with ratio trees
- Implement section ratio validation
- Add simple section structure (no nesting yet)
- **Deliverable**: Basic form system with tests [P]

**T022**: Implement EnsembleModel
- [Story]: US1
- [File]: `/packages/core/src/theory/ensemble.ts`
- Create EnsembleModel class with voices
- Implement voice role pools
- Add grouping support (sections, choirs)
- Add balance rules
- **Deliverable**: Ensemble model with tests [P]

**T023**: Implement BindingsSystem
- [Story]: US1
- [File]: `/packages/core/src/theory/bindings.ts`
- Create binding classes (RoleRhythm, RoleMelody, etc.)
- Implement binding validation
- Add conflict detection (voice assigned twice)
- **Deliverable**: Bindings system with tests [P]

**T024**: Create SchillingerSong factory and builder
- [Story]: US1
- [File]: `/packages/core/src/theory/builders.ts`
- Implement builder pattern for songs
- Add helper methods for common configurations
- Add validation at build time
- **Deliverable**: Builder utilities with examples

**T025**: Implement basic realization engine (Rhythm only)
- [Story]: US1
- [File]: `/packages/core/src/realize/rhythm-engine.ts`
- Create rhythm realization from RhythmSystem
- Generate attack points from generators
- Apply density constraints
- Output rhythmic event structure
- **Deliverable**: Rhythm engine with tests

**T026**: Implement basic realization engine (Melody)
- [Story]: US1
- [File]: `/packages/core/src/realize/melody-engine.ts`
- Create melody realization from MelodySystem
- Generate pitch sequences from cycles
- Apply register constraints
- **Deliverable**: Melody engine with tests [P]

**T027**: Implement basic realization engine (Harmony)
- [Story]: US1
- [File]: `/packages/core/src/realize/harmony-engine.ts`
- Create harmony realization from HarmonySystem
- Generate vertical structures from distributions
- Apply voice-leading constraints
- **Deliverable**: Harmony engine with tests [P]

**T028**: Implement SongModel_v1 generation
- [Story]: US1
- [File]: `/packages/core/src/realize/song-model-generator.ts`
- Combine rhythm, melody, harmony outputs
- Generate Note objects with proper timing
- Assign voice IDs
- Link to derivation sources
- **Deliverable**: SongModel generator with tests

**T029**: Create basic realization orchestration
- [Story]: US1
- [File]: `/packages/core/src/realize/orchestrator.ts`
- Execute engines in dependency order
- Apply binding logic
- Combine outputs into SongModel
- **Deliverable**: Working realization with tests

**T030**: Implement DerivationRecord generation
- [Story]: US1, US5
- [File]: `/packages/core/src/realize/derivation.ts`
- Track system execution order
- Record parameters used for each output
- Link notes to source systems
- Create immutable DerivationRecord
- **Deliverable**: Derivation tracking with tests

**T031**: Create realize() API function
- [Story]: US1, US2
- [File]: `/packages/core/src/api/realize.ts`
- Implement realize(schillingerSong, seed) API
- Initialize PCG with seed
- Orchestrate realization pipeline
- Return { songModel, derivationRecord }
- **Deliverable]: Working realize API with tests

**T032**: Implement validation API for SchillingerSong
- [Story]: US1
- [File]: `/packages/core/src/api/validate.ts`
- Create validate(song) function
- Run schema validation
- Check binding consistency
- Return validation report with errors/warnings
- **Deliverable**: Validation API with tests

**T033**: Create simple export to MusicXML
- [Story]: US1
- [File]: `/packages/core/src/export/musicxml.ts`
- Implement MusicXML generation from SongModel
- Add note pitch, duration, voice mapping
- **Deliverable**: Working MusicXML export [P]

**T034**: Create simple export to MIDI
- [Story]: US1
- [File]: `/packages/core/src/export/midi.ts`
- Implement MIDI file generation from SongModel
- Add tempo, note events, track support
- **Deliverable**: Working MIDI export [P]

**Checkpoint**: Phase 3 Complete - MVP Ready
**MVP Test**: Create song with Books I-III, realize, export to MusicXML

---

## Phase 4: User Story 2 - Deterministic Realization

**Duration**: Week 4
**Goal**: Reproducible realizations across platforms

**User Story**: As a composer, I want to realize the same SchillingerSong multiple times with identical results, so that I can reliably reproduce my compositions.

**Independent Test Criteria**:
- [ ] Same song + seed produces identical SongModel hash
- [ ] 1000 realizations byte-for-byte identical
- [ ] Cross-platform (TS ↔ Dart) produces identical results
- [ ] Derivation record explains every event

### Tasks

**T035**: Create determinism test suite
- [Story]: US2
- [File]: `/tests/determinism/realization.test.ts`
- Test same song realized 1000 times
- Compare cryptographic hashes
- Verify byte-for-byte identicalness
- **Deliverable**: Passing determinism tests

**T036**: Create cross-platform validation tests
- [Story]: US2
- [File]: `/tests/cross-platform/consistency.test.ts`
- Share test songs between TS and Dart
- Realize on both platforms with same seed
- Compare outputs byte-for-byte
- **Deliverable**: Passing cross-platform tests

**T037**: Optimize realization performance
- [Story]: US2
- [File]: `/packages/core/src/realize/optimize.ts`
- Profile current realization speed
- Optimize hot paths (PRNG calls, constraint checking)
- Add caching where safe (pure functions)
- Target: ≤10 seconds for 5-minute song
- **Deliverable**: Performance tests meeting targets

**T038**: Add comprehensive derivation tracking
- [Story]: US2, US5
- [File]: `/packages/core/src/realize/derivation-detail.ts`
- Track all constraint applications
- Record intermediate states
- Link every note to derivation path
- Add derivation inspection utilities
- **Deliverable**: Complete derivation tracking

**T039**: Create derivation record query API
- [Story]: US2, US5
- [File]: `/packages/core/src/api/derivation-query.ts`
- Add methods to query DerivationRecord
- Find notes by source system
- Trace parameter effects
- Export derivation as human-readable report
- **Deliverable**: Query API with tests

**T040**: Implement determinism guarantees documentation
- [Story]: US2
- [File]: `/docs/specs/determinism-guarantees.md`
- Document PCG algorithm choice
- Document IEEE 754 assumptions
- Document forbidden operations
- Provide determinism checklist
- **Deliverable**: Complete determinism spec

**Checkpoint**: Phase 4 Complete - Determinism Achieved
**Test**: 1000 realizations, cross-platform validation

---

## Phase 5: User Story 3 - Edit and Reconcile

**Duration**: Weeks 5-7
**Goal**: Round-trip editing with confidence scoring

**User Story**: As a composer, I want to edit a realized song and have those edits intelligently re-ingested into my theory, so that I can work iteratively between theory and practice.

**Independent Test Criteria**:
- [ ] Edited SongModel submitted for reconciliation
- [ ] Edits classified (decorative/structural/destructive)
- [ ] Confidence scores provided for each system
- [ ] Ambiguity reported, never hidden
- [ ] Loss reports explain what cannot be recovered

### Tasks

**T041**: Implement edit classification system
- [Story]: US3
- [File]: `/packages/core/src/reconcile/classifier.ts`
- Create edit detector (compare SongModels)
- Classify edits as decorative/structural/destructive
- Add confidence scoring for classification
- **Deliverable**: Edit classifier with tests

**T042**: Implement rhythm system inference
- [Story]: US3
- [File]: `/packages/core/src/reconcile/infer/rhythm.ts`
- Infer generator candidates from notes
- Calculate confidence scores
- Report multiple candidates (ambiguity)
- **Deliverable**: Rhythm inference with tests [P]

**T043**: Implement melody system inference
- [Story]: US3
- [File]: `/packages/core/src/reconcile/infer/melody.ts`
- Infer pitch cycles from note sequences
- Detect interval seeds
- Report ambiguity (multiple cycle lengths)
- **Deliverable**: Melody inference with tests [P]

**T044**: Implement harmony system inference
- [Story]: US3
- [File]: `/packages/core/src/reconcile/infer/harmony.ts`
- Infer distributions from chord structures
- Detect harmonic rhythm
- Report confidence scores
- **Deliverable**: Harmony inference with tests [P]

**T045**: Implement form system inference
- [Story]: US3
- [File]: `/packages/core/src/reconcile/infer/form.ts`
- Infer ratio trees from sections
- Detect nested structures
- Report confidence scores
- **Deliverable**: Form inference with tests [P]

**T046**: Implement orchestration inference (basic)
- [Story]: US3, US4
- [File]: `/packages/core/src/reconcile/infer/orchestration.ts`
- Detect register changes
- Identify voice assignments
- Low confidence (expected)
- **Deliverable**: Basic orchestration inference [P]

**T047**: Implement confidence scoring system
- [Story]: US3
- [File]: `/packages/core/src/reconcile/confidence.ts`
- Calculate overall confidence from systems
- Weight by book (rhythm=high, orchestration=low)
- Provide confidence summary
- **Deliverable**: Confidence calculator with tests

**T048**: Create ReconciliationReport generator
- [Story]: US3
- [File]: `/packages/core/src/reconcile/report.ts`
- Generate reconciliation reports
- Include system matches with confidence
- Add loss reports
- Suggest actions (update, split, reject)
- **Deliverable**: Report generator with tests

**T049**: Implement proposed update generation
- [Story]: US3
- [File]: `/packages/core/src/reconcile/update.ts`
- Generate updated SchillingerSong from edits
- Apply only structural changes
- Preserve decorative edits separately
- **Deliverable**: Update generator with tests

**T050**: Create reconcile() API function
- [Story]: US3
- [File]: `/packages/core/src/api/reconcile.ts`
- Implement reconcile(schillingerSong, editedModel) API
- Run classification and inference
- Generate reconciliation report
- Return { report, proposedUpdate? }
- **Deliverable]: Working reconcile API with tests

**T051**: Implement user-configurable confidence thresholds
- [Story]: US3
- [File]: `/packages/core/src/reconcile/thresholds.ts`
- Create threshold configuration interface
- Add default presets (conservative, aggressive)
- Allow per-book threshold customization
- **Deliverable]: Threshold system with tests

**T052**: Create reconciliation test suite
- [Story]: US3
- [File]: `/tests/reconcile/round-trip.test.ts`
- Create test corpus of known songs
- Realize, edit, reconcile, measure accuracy
- Validate confidence scores match expectations
- **Deliverable**: Passing reconciliation tests

**T053**: Implement reconciliation UI/CLI (optional)
- [Story]: US3
- [File]: `/packages/cli/src/reconcile.ts`
- Create CLI command for reconciliation
- Display confidence scores
- Show proposed changes
- Accept/reject workflow
- **Deliverable**: Working CLI tool [P]

**Checkpoint**: Phase 5 Complete - Round-Trip Working
**Test**: Reconcile edited songs, measure accuracy

---

## Phase 6: User Story 4 - Complete Orchestration

**Duration**: Weeks 8-10
**Goal**: Structural orchestration with role-based systems

**User Story**: As a composer, I want to orchestrate my compositions using role-based systems, so that orchestration is structural and reproducible, not ad-hoc.

**Independent Test Criteria**:
- [ ] Book V systems control voice assignments
- [ ] Ensemble model defines voice topology
- [ ] Roles bind to rhythm/melody/harmony
- [ ] Register, density, reinforcement are parameters
- [ ] Orchestration survives round-trip

### Tasks

**T054**: Implement OrchestrationSystem (Book V)
- [Story]: US4
- [File]: `/packages/core/src/theory/systems/orchestration.ts`
- Create OrchestrationSystem class
- Implement role hierarchy (primary/secondary/tertiary)
- Add functional classes (foundation, motion, ornament)
- **Deliverable**: Orchestration system with tests

**T055**: Implement register system
- [Story]: US4
- [File]: `/packages/core/src/theory/orchestration/register.ts`
- Create RegisterSystem with role ranges
- Add register envelopes over form
- Implement crossing rules
- **Deliverable**: Register system with tests [P]

**T056**: Implement spacing system
- [Story]: US4
- [File]: `/packages/core/src/theory/orchestration/spacing.ts`
- Create SpacingSystem with min/max intervals
- Add voice spacing constraints
- Implement crossing rules
- **Deliverable**: Spacing system with tests [P]

**T057**: Implement density system
- [Story]: US4
- [File]: `/packages/core/src/theory/orchestration/density.ts`
- Create DensitySystem with role budgets
- Add coupling rules (inverse relationships)
- Implement density distribution
- **Deliverable**: Density system with tests [P]

**T058**: Implement doubling and reinforcement
- [Story]: US4
- [File]: `/packages/core/src/theory/orchestration/reinforcement.ts`
- Add doubling rules (octave, unison)
- Implement reinforcement (delayed shadows)
- Add conditional triggers
- **Deliverable**: Reinforcement system with tests [P]

**T059**: Implement voice splitting and merging
- [Story]: US4
- [File]: `/packages/core/src/theory/orchestration/voices.ts`
- Add split rules (one system → multiple voices)
- Implement merge rules (multiple voices → one)
- Add antiphonal patterns
- **Deliverable**: Voice manipulation with tests [P]

**T060**: Implement orchestration over form
- [Story]: US4
- [File]: `/packages/core/src/theory/orchestration/form-orchestration.ts`
- Add role reassignments per section
- Implement orchestration evolution
- Link to FormSystem sections
- **Deliverable**: Form-aware orchestration with tests

**T061**: Enhance EnsembleModel with orchestration features
- [Story]: US4
- [File]: `/packages/core/src/theory/ensemble.ts`
- Add voice count limits
- Implement voice role pools
- Add inter-group constraints
- **Deliverable**: Enhanced ensemble model

**T062**: Create orchestration realization engine
- [Story]: US4
- [File]: `/packages/core/src/realize/orchestration-engine.ts`
- Realize role-based voice assignments
- Apply register constraints
- Apply spacing rules
- Apply density budgets
- **Deliverable**: Orchestration engine with tests

**T063**: Integrate orchestration into main realization pipeline
- [Story]: US4
- [File]: `/packages/core/src/realize/orchestrator.ts`
- Add Book V execution after Books I-III
- Apply orchestration to generated notes
- Handle doubling and reinforcement
- **Deliverable**: Integrated orchestration

**T064**: Test orchestration round-trip
- [Story]: US4
- [File]: `/tests/orchestration/round-trip.test.ts`
- Create orchestration-heavy test songs
- Realize, edit, reconcile
- Verify register/density survive
- **Deliverable**: Passing round-trip tests

**Checkpoint**: Phase 6 Complete - Orchestration Working
**Test**: Full orchestration with round-trip validation

---

## Phase 7: User Story 5 - Explainable Systems

**Duration**: Weeks 11-13
**Goal**: Complete traceability and visualization

**User Story**: As a music theorist, I want to see exactly how each system parameter affects the musical output, so that I can understand and teach composition principles.

**Independent Test Criteria**:
- [ ] Every note links to derivation source
- [ ] Derivation record lists all systems/constraints/parameters
- [ ] No "magic" numbers
- [ ] Can trace output event back to theory

### Tasks

**T065**: Enhance DerivationRecord with complete traceability
- [Story]: US5
- [File]: `/packages/core/src/realize/derivation-trace.ts`
- Track all intermediate states
- Record constraint applications
- Link every note to exact derivation path
- Add parameter snapshots
- **Deliverable**: Complete derivation trace

**T066**: Create derivation inspection utilities
- [Story]: US5
- [File]: `/packages/core/src/api/derivation-inspect.ts`
- Add query methods for DerivationRecord
- Trace note → system → parameters
- Reverse trace: system → all notes
- Export as human-readable
- **Deliverable**: Inspection API with tests

**T067**: Implement parameter effect analysis
- [Story]: US5
- [File]: `/packages/core/src/analysis/parameter-effects.ts`
- Compare realizations with different parameters
- Identify which notes changed
- Quantify parameter impact
- **Deliverable**: Effect analyzer with tests

**T068**: Create derivation visualization export
- [Story]: US5
- [File]: `/packages/core/src/export/derivation-viz.ts`
- Export derivation as GraphViz DOT
- Create derivation tree visualization
- Highlight constraint effects
- **Deliverable**: Visualization export [P]

**T069**: Implement web-based derivation viewer
- [Story]: US5
- [File]: `/packages/web/src/components/DerivationViewer.tsx`
- Create React component for viewing derivation
- Interactive note tracing
- Parameter highlighting
- **Deliverable**: Working web viewer [P]

**T070**: Add derivation explanations to reconciliation
- [Story]: US5
- [File]: `/packages/core/src/reconcile/explain.ts`
- Explain why edits were classified
- Show inference logic
- Highlight ambiguity sources
- **Deliverable**: Enhanced reconciliation reports

**T071**: Create teaching example library
- [Story]: US5
- [File]: `/examples/teaching/`
- Create songs demonstrating each system
- Show parameter effects side-by-side
- Add explanation documents
- **Deliverable**: Teaching materials

**Checkpoint**: Phase 7 Complete - Full Explainability
**Test**: Trace any note from theory to output and back

---

## Phase 8: Polish and Cross-Cutting Concerns

**Duration**: Weeks 14-18
**Goal**: Production readiness, migration, documentation

### Tasks

**T072**: Implement schema versioning system
- [Story]: All
- [File]: `/packages/core/src/migration/versioning.ts`
- Add schema version field support
- Create migration framework
- Implement v1 → v2 migration (if needed)
- **Deliverable**: Working versioning system

**T073**: Create migration tool for existing songs
- [Story]: All
- [File]: `/packages/migrate/src/song-model-migrate.ts`
- Implement SongModel → SchillingerSong inference
- Add confidence-based routing
- Create manual review workflow
- **Deliverable**: Migration CLI tool

**T074**: Add comprehensive error handling
- [Story]: All
- [File]: `/packages/core/src/errors/index.ts`
- Create domain-specific error types
- Add helpful error messages
- Implement error recovery suggestions
- **Deliverable**: Robust error handling

**T075**: Implement logging and debugging support
- [Story]: All
- [File]: `/packages/core/src/utils/logger.ts`
- Add structured logging
- Create debug mode utilities
- Add performance profiling
- **Deliverable]: Logging infrastructure

**T076**: Create comprehensive documentation
- [Story]: All
- [File]: `/docs/`
- Write API documentation
- Create getting started guide
- Add migration guide
- Write teaching materials
- **Deliverable**: Complete docs site

**T077**: Add performance benchmarks
- [Story]: All
- [File]: `/tests/performance/`
- Create realization benchmarks
- Add reconciliation benchmarks
- Track performance over time
- **Deliverable**: Benchmark suite

**T078**: Implement memory optimization
- [Story]: All
- [File]: `/packages/core/src/optimization/memory.ts`
- Profile memory usage
- Optimize large song handling
- Add streaming for long songs
- **Deliverable**: Memory-efficient implementation

**T079**: Create example songs and tutorials
- [Story]: All
- [File]: `/examples/`
- Create basic song examples
- Add advanced examples (all books)
- Write tutorial walkthroughs
- **Deliverable]: Example library

**T080**: Set up CI/CD pipeline
- [Story]: All
- [File]: `/.github/workflows/`
- Configure automated testing
- Add automated builds
- Set up deployment (if applicable)
- **Deliverable]: Working CI/CD

**T081**: Create automated release process
- [Story]: All
- [File]: `/scripts/release/`
- Automate version bumping
- Generate changelog
- Publish packages
- **Deliverable]: Release automation

**T082**: Implement Dart FFI layer
- [Story]: US2 (Cross-platform)
- [File]: `/packages/dart/lib/ffi/`
- Create FFI bindings to C++ backend
- Expose Dart API matching TypeScript
- Add platform-specific code
- **Deliverable]: Working Dart SDK

**T083**: Add Flutter UI components (optional)
- [Story]: All
- [File]: `/packages/flutter/lib/`
- Create song editor UI
- Add parameter visualization
- Implement real-time preview
- **Deliverable]: Flutter UI (if needed)

**T084**: Create final integration test suite
- [Story]: All
- [File]: `/tests/integration/e2e/`
- Test complete user journeys
- Validate cross-platform consistency
- Test round-trip accuracy
- **Deliverable**: End-to-end tests

**T085**: Perform security audit
- [Story]: All
- [File]: `/docs/security/`
- Review data validation
- Check for injection vulnerabilities
- Audit access controls
- **Deliverable]: Security report

**T086**: Create deployment and installation guides
- [Story]: All
- [File]: `/docs/deployment/`
- Write installation instructions
- Create deployment guide
- Add troubleshooting section
- **Deliverable**: Deployment docs

**T087**: Final validation and release preparation
- [Story]: All
- [File]: `/docs/release/`
- Run full test suite
- Validate all acceptance criteria
- Create release notes
- **Deliverable]: Production-ready SDK

---

## Dependencies

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundations)
                   ↓
                   ├→ Phase 3 (US1: Theory-First)
                   ↓
                   ├→ Phase 4 (US2: Determinism) [depends on US1]
                   ↓
                   ├→ Phase 5 (US3: Reconcile) [depends on US1]
                   ↓
                   ├→ Phase 6 (US4: Orchestration) [depends on US1]
                   ↓
                   ├→ Phase 7 (US5: Explainability) [depends on US1, US2, US3]
                   ↓
                   └→ Phase 8 (Polish) [depends on all]
```

### Critical Path

1. **T001-T005** (Setup) - MUST START FIRST
2. **T006-T014** (Foundations) - MUST COMPLETE BEFORE USER STORIES
3. **T015-T034** (US1) - FIRST USER STORY
4. **T035-T040** (US2) - REQUIRES US1
5. **T041-T053** (US3) - REQUIRES US1
6. **T054-T064** (US4) - REQUIRES US1
7. **T065-T071** (US5) - REQUIRES US1, US2, US3
8. **T072-T087** (Polish) - REQUIRES ALL USER STORIES

### Parallel Opportunities

**Within Phase 3** (US1):
- T016-T017 (Rhythm) can run parallel
- T018-T019 (Melody) can run parallel
- T020 (Harmony), T021 (Form), T022-T023 (Ensemble/Bindings) can all run parallel
- T033-T034 (Exports) can run parallel

**Within Phase 5** (US3):
- T042-T046 (All inference engines) can run parallel

**Within Phase 6** (US4):
- T055-T059 (All orchestration subsystems) can run parallel

**Within Phase 7** (US5):
- T068-T069 (Visualization) can run parallel

**Within Phase 8** (Polish):
- T076-T077 (Docs/benchmarks) can run parallel
- T079-T083 (Examples/UI) can run parallel

---

## Parallel Execution Examples

### Example 1: Phase 3 Parallel Execution (US1)

```bash
# Terminal 1: Rhythm System
npm run work T016 T017  # Complete rhythm system

# Terminal 2: Melody System
npm run work T018 T019  # Complete melody system

# Terminal 3: Harmony System
npm run work T020  # Complete harmony system

# Terminal 4: Form + Ensemble + Bindings
npm run work T021 T022 T023  # Complete form, ensemble, bindings

# All finish, then:
npm run work T024 T025 T026 T027  # Integration tasks
```

### Example 2: Phase 5 Parallel Execution (US3)

```bash
# Terminal 1: Rhythm Inference
npm run work T042

# Terminal 2: Melody Inference
npm run work T043

# Terminal 3: Harmony Inference
npm run work T044

# Terminal 4: Form + Orchestration Inference
npm run work T045 T046

# All finish, then:
npm run work T047 T048 T049 T050 T051  # Integration
```

### Example 3: Phase 8 Parallel Execution (Polish)

```bash
# Terminal 1: Documentation
npm run work T076

# Terminal 2: Examples
npm run work T079

# Terminal 3: Benchmarks
npm run work T077

# Terminal 4: CI/CD
npm run work T080 T081
```

---

## Task Statistics

| Phase | Tasks | Duration | Parallel Opportunities |
|-------|-------|----------|----------------------|
| Phase 1: Setup | 5 | 1 week | 0 (sequential) |
| Phase 2: Foundations | 9 | 1-2 weeks | 0 (sequential) |
| Phase 3: US1 | 20 | 2-3 weeks | 6 tasks [P] |
| Phase 4: US2 | 6 | 1 week | 1 task [P] |
| Phase 5: US3 | 13 | 3 weeks | 5 tasks [P] |
| Phase 6: US4 | 11 | 3 weeks | 6 tasks [P] |
| Phase 7: US5 | 7 | 3 weeks | 2 tasks [P] |
| Phase 8: Polish | 16 | 5 weeks | 3 tasks [P] |
| **Total** | **87** | **18 weeks** | **23 parallelizable** |

---

## MVP Definition

### Minimum Viable Product (Phase 3 Only)

**Scope**: User Story 1 - Theory-First Composition

**Included**:
- SchillingerSong_v1 schema
- Books I-III systems (Rhythm, Melody, Harmony)
- Basic FormSystem
- EnsembleModel and Bindings
- Realization pipeline
- Derivation tracking
- Export to MusicXML/MIDI
- TypeScript implementation only

**Excluded**:
- Cross-platform determinism validation (US2)
- Reconciliation (US3)
- Orchestration (US4)
- Advanced visualization (US5)
- Dart FFI layer
- Migration tools

**MVP Test Criteria**:
- ✅ Create valid SchillingerSong_v1 with zero notes
- ✅ Realize to SongModel_v1
- ✅ Export to MusicXML
- ✅ Trace notes to derivation sources

---

## Success Metrics

### Per User Story

**US1 (Theory-First)**:
- Can create song with zero notes
- Realization produces executable model
- Export works

**US2 (Determinism)**:
- 1000 realizations identical (hash check)
- Cross-platform byte-for-byte match
- Performance ≤10s for 5-min song

**US3 (Reconcile)**:
- Round-trip accuracy ≥80%
- Confidence scores accurate
- Loss reports comprehensive

**US4 (Orchestration)**:
- All Book V features implemented
- Orchestration survives round-trip
- Register/density/reinforcement work

**US5 (Explainability)**:
- Every note traceable
- Derivation inspection works
- Visualization available

### Overall

- All 12 functional requirements implemented
- All 5 user stories working
- Cross-platform consistency validated
- Performance targets met
- Documentation complete

---

## Next Steps

### Immediate Actions

1. **Review tasks.md** - Verify task breakdown is complete
2. **Set up project tracking** - Import tasks into project management system
3. **Begin Phase 1** - Start with T001 (project structure)
4. **Establish checkpoints** - Plan review after each user story

### Implementation Order

1. **Week 1-2**: Complete Phases 1-2 (Setup + Foundations)
2. **Week 2-3**: Complete Phase 3 (US1 - MVP)
3. **Week 4**: Complete Phase 4 (US2 - Determinism)
4. **Week 5-7**: Complete Phase 5 (US3 - Reconcile)
5. **Week 8-10**: Complete Phase 6 (US4 - Orchestration)
6. **Week 11-13**: Complete Phase 7 (US5 - Explainability)
7. **Week 14-18**: Complete Phase 8 (Polish + Production)

### After MVP (Phase 3)

**Options**:
- **Ship MVP**: Validate with users, get feedback
- **Continue**: Build remaining user stories
- **Pivot**: Adjust based on MVP learnings

**Recommendation**: Ship MVP after Phase 3, gather feedback, then continue with Phases 4-8 based on user input.

---

## Notes

- **Task IDs**: T001-T087 are sequential and numbered for tracking
- **[P] Marker**: Indicates task can run in parallel with other [P] tasks in same phase
- **[Story] Label**: Maps task to user story (Setup, US1-US5, All)
- **Dependencies**: Respect user story order (US1 → US2 → US3, US4, US5 independent)
- **Files**: All file paths are absolute from repo root
- **Tests**: Each task should include its own tests (unit + integration)

**Generated**: 2025-01-07
**Status**: Ready for implementation
