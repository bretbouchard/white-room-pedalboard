# Phase 1 Alignment Plan (Transport-Agnostic, Canonical IR, Diff, Seeds)
Date: 2025-12-31T03:11:44.726Z
Owner: SDK Core
Status: Draft for execution

Goals
- Enforce transport-agnostic SDK (no clocks, scheduling, audio-thread assumptions).
- Introduce Canonical IR: SongIR + PatternIR (serializable, versioned).
- Establish Diff-only mutation: SongDiff (atomic, deterministic, replayable).
- Seeded stochasticity end-to-end (explicit seeds in IR/Diff, reproducible).
- ParameterAddress enforced across outputs.
- Role/instrument separation (roles in SDK, instruments as refs).
- Serialization round-trip tests for IR/Diff.

Scope & Tasks
1) Transport-Agnostic Purge (SDK layer)
- Remove/ban functions: generateAtTime, applyWhilePlaying, stepFrame.
- Replace quantization/timeSignature references in SDK with symbolic MusicalTime only.
- Add ESLint rule or type guards to block time-based APIs in SDK.

2) Canonical IR Types (shared package)
- Add SongIR { songId, tempoMap (description only), sections[tracks[role, instrumentRef, PatternIR]], metadata }.
- Add PatternIR { baseRule, variationRule, seed }.
- Export IR types with version fields; add toJSON/fromJSON helpers.

3) Diff-Based Mutation (shared/core)
- Implement SongDiff { AddSection, RemoveSection, ReplacePattern, UpdateParameterRule, ChangeSeed, ReorderTracks }.
- Add SongDiffApplier (pure) and validator; no in-place mutation.
- Add TimelineDiff integration only at timeline layer; SDK never decides when.

4) Seeded Stochasticity
- Refactor randomness: remove randomElement/Math.random/Date.now usage in generators.
- Introduce SeededRNG utility (DeterministicRNG(seed)) used by PatternIR.
- Store seeds in SongIR/PatternIR and propagate via SongDiff changes.

5) Multi-Song / Instance Safety
- Ensure no globals/singletons in SDK; instance-scoped APIs only.
- Add tests: multiple SongIR instances evaluated via TimelineModel with no shared state.

6) Parameter Addressing
- Enforce ParameterAddress for all emitted targets (no names/indices).
- Add validator: reject "cutoff"/"param[3]"/unnamed parameters.

7) Role vs Instrument
- Ensure role logic resides in SDK; instrumentRef is a string/id only.
- Add checks: no DSP/instrument behavior in SDK.

8) Serialization & Versioning
- Round-trip tests for SongIR, PatternIR, SongDiff.
- Version fields on IR/Diff; migrations for future versions.

Deliverables
- packages/shared/src/ir/song-ir.ts
- packages/shared/src/ir/pattern-ir.ts
- packages/shared/src/diff/song-diff.ts (types + applier + validator)
- packages/shared/src/utils/seeded-rng.ts
- packages/core/src/validation/ir-validator.ts
- tests: core/shared contract tests (IR round-trip, seeds determinism, diff validation)

Acceptance Criteria
- No SDK references to transport clocks/scheduling/audio-thread.
- IR/Diff compile and pass serialization/determinism tests.
- ParameterAddress enforced in all outputs.
- Role/instrument separation validated.

Risks & Mitigations
- Refactor touches many files: proceed incrementally with tests.
- Legacy v1 code paths: provide migration helpers.

Next Steps
- Implement IR types and SeededRNG, then SongDiff + validators, then refactor generators to PatternIR + seeds.
