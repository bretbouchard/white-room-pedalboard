# SongModel_v1 & Deterministic Audio Integration Plan

> **Handoff Document Implementation**
> **Status**: Mandatory for Apple TV MVP
> **Version Target**: SDK v2.1.0
> **Approach**: TDD with Parallel Autonomous Sub-Agents

---

## Executive Summary

This document defines the implementation plan for adding **SongModel_v1** and **Deterministic Audio Integration** to the Schillinger SDK, enabling reliable integration with JUCE audio engine on Apple TV and other platforms.

**The Problem:**
- SDK stops at continuous musical realization, not executable audio delivery
- No frozen execution contract for audio engines
- JUCE must "infer" musical intent → unacceptable

**The Solution:**
- Add **SongModel_v1**: A frozen, execution-ready song model
- Add **ScheduledEvent**: Deterministic, bounded musical events
- Establish clear boundary: SDK owns musical intelligence, JUCE owns audio execution

---

## Architecture Overview

### Current State (v2.1.0)
```
RealizationPlane → RealizedFrame → TrackProjection → (Manual JUCE Interpretation)
```

### Target State (v2.1.0)
```
SongModel_v1 → ScheduledEvent[] → Deterministic Emission → JUCE Audio Engine
```

### Key Principles

1. **Self-Sufficiency**: SongModel_v1 contains everything audio engine needs
2. **Platform Agnostic**: No platform-specific logic in core SDK
3. **Deterministic**: Same model → identical event streams every time
4. **Bounded**: Lookahead and emission are strictly bounded
5. **Immutable**: Once playback starts, model only changes via explicit diffs

---

## Phase 1: Contract Lock (1-2 weeks)

### Objective
Define and implement the core execution contract with comprehensive TDD validation.

### Deliverables

#### 1.1 SongModel_v1 Type Definition

**File**: `packages/shared/src/types/song-model.ts`

```typescript
interface SongModel_v1 {
  // Version & Metadata
  version: '1.0';
  id: string;
  createdAt: number;
  metadata: SongMetadata;

  // Transport & Time
  transport: TransportConfig;

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

interface TransportConfig {
  tempoMap: TempoEvent[];
  timeSignatureMap: TimeSignatureEvent[];
  loopPolicy: LoopPolicy;
  playbackSpeed: number;
}

interface Section_v1 {
  id: string;
  name: string;
  start: MusicalTime;
  end: MusicalTime;
  roles: string[];  // role IDs
  realizationHints?: Record<string, unknown>;
}

interface Role_v1 {
  id: string;
  name: string;
  type: 'bass' | 'harmony' | 'melody' | 'rhythm' | 'texture' | 'ornament';
  generatorConfig: GeneratorConfig;
  parameters: RoleParameters;
}

interface Projection_v1 {
  id: string;
  roleId: string;
  target: {
    type: 'track' | 'bus' | 'instrument';
    id: string;
  };
  transform?: TransformConfig;
}

interface MixGraph_v1 {
  tracks: TrackConfig[];
  buses: BusConfig[];
  sends: SendConfig[];
  master: MasterConfig;
}

interface RealizationPolicy {
  windowSize: MusicalTime;
  lookaheadDuration: MusicalTime;
  determinismMode: 'strict' | 'seeded' | 'loose';
}
```

#### 1.2 ScheduledEvent Type Definition

**File**: `packages/shared/src/types/scheduled-event.ts`

```typescript
interface ScheduledEvent {
  // Timing (fully resolved to samples)
  sampleTime: int64;
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

type EventType =
  | 'NOTE_ON'
  | 'NOTE_OFF'
  | 'PARAM'
  | 'SECTION'
  | 'TRANSPORT'
  | 'AUTOMATION'
  | 'CONTROL';

interface ParameterAddress {
  path: string;  // e.g., "/role/bass/note", "/track/3/console/drive"
  scope: 'role' | 'track' | 'bus' | 'instrument' | 'global';
}

interface EventPayload {
  // For NOTE_ON/NOTE_OFF
  note?: NotePayload;
  // For PARAM/AUTOMATION
  parameter?: ParameterPayload;
  // For SECTION
  section?: SectionPayload;
  // For TRANSPORT
  transport?: TransportPayload;
}

interface NotePayload {
  pitch: number;
  velocity: number;
  duration: number;
}

interface ParameterPayload {
  value: number;
  interpolation?: 'linear' | 'exponential' | 'step';
  duration?: number;
}
```

#### 1.3 Parameter Addressing Scheme

**File**: `packages/shared/src/types/parameter-address.ts`

```typescript
class ParameterAddress {
  static parse(address: string): ParsedAddress {
    // "/role/bass/note" → { scope: 'role', role: 'bass', param: 'note' }
    // "/track/3/console/drive" → { scope: 'track', track: 3, system: 'console', param: 'drive' }
  }

  static validate(address: string): boolean
  static resolve(address: string, model: SongModel_v1): ParameterTarget
}

interface ParsedAddress {
  scope: string;
  components: string[];
  validation: AddressValidation;
}
```

#### 1.4 SongDiff Model

**File**: `packages/shared/src/types/song-diff.ts`

```typescript
interface SongDiff {
  version: '1.0';
  timestamp: number;
  operations: DiffOperation[];
  appliesTo: string;  // SongModel ID
}

type DiffOperation =
  | AddRoleOperation
  | RemoveRoleOperation
  | UpdateParamOperation
  | UpdateMixGraphOperation
  | ChangeSectionOperation;

interface AddRoleOperation {
  type: 'addRole';
  role: Role_v1;
  index?: number;
}

interface UpdateParamOperation {
  type: 'updateParam';
  target: ParameterAddress;
  value: unknown;
  interpolation?: 'linear' | 'exponential' | 'step';
  rampDuration?: number;
}
```

#### 1.5 Realization → Event Adapter

**File**: `packages/core/src/realization/event-emitter.ts`

```typescript
class DeterministicEventEmitter {
  constructor(config: EventEmitterConfig);

  // Core emission
  emitEventsForTimeRange(
    model: SongModel_v1,
    range: SampleTimeRange
  ): ScheduledEvent[];

  // Determinism
  seedDeterminism(seed: string): void;
  resetDeterministicState(): void;

  // Lookahead management
  setLookahead(duration: MusicalTime): void;
  getLookaheadBoundaries(): TimeBoundary[];

  // Validation
  validateDeterminism(model: SongModel_v1): DeterminismValidation;
  ensureBoundedEmission(maxSamples: number): BoundednessCheck;
}

interface SampleTimeRange {
  startSample: int64;
  endSample: int64;
  sampleRate: number;
}
```

---

## Phase 2: Engine Readiness (Parallel with Phase 1)

### Objective
Ensure all realized outputs can map to projections with bounded, deterministic behavior.

### Deliverables

#### 2.1 Projection Mapping Validation

**File**: `packages/core/src/realization/projection-validator.ts`

```typescript
class ProjectionValidator {
  // Validate all roles can project to targets
  validateProjections(model: SongModel_v1): ValidationResult;

  // Ensure no circular dependencies
  detectCircularProjections(model: SongModel_v1): CycleReport;

  // Verify all addresses resolve
  validateAddressResolution(model: SongModel_v1): AddressReport;
}
```

#### 2.2 Bounded Lookahead System

**File**: `packages/core/src/realization/lookahead-manager.ts`

```typescript
class LookaheadManager {
  // Calculate required lookahead for model
  calculateLookahead(model: SongModel_v1): LookaheadRequirements;

  // Ensure lookahead is bounded
  enforceBoundaries(
    model: SongModel_v1,
    maxLookahead: MusicalTime
  ): BoundedLookahead;

  // Predictive event pre-generation
  pregenerateEvents(
    model: SongModel_v1,
    currentTime: MusicalTime
  ): ScheduledEvent[];
}
```

#### 2.3 Offline Repeatability

**File**: `packages/core/src/realization/offline-replay.ts`

```typescript
class OfflineReplaySystem {
  // Serialize event stream for offline testing
  serializeEventStream(events: ScheduledEvent[]): string;

  // Replay event stream deterministically
  replayEventStream(
    serialized: string,
    model: SongModel_v1
  ): ScheduledEvent[];

  // Verify repeatability
  verifyRepeatability(
    model: SongModel_v1,
    runs: number
  ): RepeatabilityReport;
}
```

---

## Phase 3: Integration Validation

### Objective
Create JUCE test harness and validate integration with golden tests.

### Deliverables

#### 3.1 Headless JUCE Test Harness

**File**: `tests/integration/juce-headless-harness.ts`

```typescript
class JUCEHeadlessHarness {
  // Load SongModel and emit events
  loadModel(model: SongModel_v1): void;

  // Render audio offline
  renderOffline(config: RenderConfig): RenderResult;

  // Verify event stream
  verifyEventStream(expected: ScheduledEvent[]): boolean;

  // Export audio for comparison
  exportAudio(format: 'wav' | 'flac'): Buffer;
}

interface RenderConfig {
  duration: number;
  sampleRate: number;
  bufferSize: number;
  offline: boolean;
}

interface RenderResult {
  audio: AudioBuffer;
  events: ScheduledEvent[];
  determinismHash: string;
}
```

#### 3.2 Golden Tests

**File**: `tests/golden/song-model-golden.test.ts`

```typescript
describe('SongModel Golden Tests', () => {
  const goldenModels = loadGoldenSongModels();

  goldenModels.forEach(model => {
    it(`should emit deterministic events for ${model.id}`, () => {
      const emitter = new DeterministicEventEmitter({ seed: model.seed });

      const run1 = emitter.emitEventsForTimeRange(model, model.timeRange);
      const run2 = emitter.emitEventsForTimeRange(model, model.timeRange);

      expect(run1).toEqual(run2);
    });

    it(`should match golden event stream for ${model.id}`, () => {
      const events = emitter.emitEventsForTimeRange(model, model.timeRange);

      expect(events).toEqual(matchGoldenSnapshot(model.goldenHash));
    });
  });
});
```

#### 3.3 Audio Hashing

**File**: `tests/integration/audio-hashing.ts`

```typescript
class AudioHasher {
  // Generate deterministic hash of audio buffer
  hashAudioBuffer(buffer: AudioBuffer): string;

  // Hash event stream
  hashEventStream(events: ScheduledEvent[]): string;

  // Compare hashes for regression testing
  compareHashes(hash1: string, hash2: string): HashComparison;
}
```

---

## Phase 4: Expansion (Post-MVP)

### Future Enhancements

#### 4.1 Live Diff Streaming

```typescript
class LiveDiffStreamer {
  // Stream real-time updates to audio engine
  streamDiffs(model: SongModel_v1): AsyncIterable<SongDiff>;

  // Apply diffs at safe boundaries
  applyDiff(diff: SongDiff, boundary: TimeBoundary): ApplyResult;
}
```

#### 4.2 Complex Realization Policies

- Multi-lookahead strategies
- Adaptive determinism modes
- Platform-specific optimizations

#### 4.3 Platform-Specific Extensions

- Apple TV optimizations (outside core SDK)
- Metal-accelerated rendering helpers
- tvOS-specific constraints handling

---

## Anti-Patterns & Prohibitions

### ❌ MUST NOT DO

1. **Pull-based musical logic in audio thread**
   - Events must be pre-scheduled, not queried
   - No "what should I play now?" calls from audio thread

2. **JUCE interpreting realization frames**
   - JUCE receives ScheduledEvents, not RealizedFrames
   - No Schillinger concepts in JUCE

3. **Mutable global song state**
   - SongModel is immutable after playback start
   - Changes only via SongDiff

4. **Platform-aware logic in core SDK**
   - No Apple TV constraints in core types
   - Platform specifics in integration layer only

5. **Implicit time**
   - All time must be explicit (musical or sample)
   - All conversions must be deterministic

### ✅ MUST DO

1. **Frozen execution contract**
   - SongModel_v1 is self-sufficient
   - All configuration explicit

2. **Deterministic emission**
   - Same model + seed = identical events
   - Repeatability verifiable

3. **Bounded lookahead**
   - Maximum lookahead calculable
   - Pre-generation bounded

4. **Clear separation**
   - SDK: musical logic, scheduling
   - JUCE: audio execution, routing

---

## Testing Strategy

### Unit Tests

- SongModel serialization/deserialization
- ParameterAddress parsing and validation
- SongDiff application
- Event emission determinism
- Lookahead boundary calculations

### Integration Tests

- Realization → Event adapter
- Projection mapping
- Offline repeatability
- Diff streaming

### Golden Tests

- Deterministic event emission
- Audio rendering hash consistency
- Cross-platform event stream validation

### Performance Tests

- Bounded lookahead enforcement
- Event emission throughput
- Memory usage over long playback

---

## Definition of Done

The SDK is Apple TV-ready when:

- ✅ **SongModel_v1** is frozen and documented
- ✅ **ScheduledEvent** emission is deterministic and bounded
- ✅ Same model produces identical event streams across runs
- ✅ No JUCE-specific code in core SDK
- ✅ No musical logic in JUCE
- ✅ Golden tests pass 100%
- ✅ Offline repeatability verified
- ✅ All anti-patterns avoided
- ✅ Documentation complete

---

## Version Bump Strategy

**Current Version**: v2.1.0
**Target Version**: v2.1.0

**Rationale**:
- Minor version bump (backward compatible)
- Adds significant new functionality
- No breaking changes to existing APIs
- New execution layer is additive

---

## Parallel Autonomous Sub-Agent Strategy

### Agent 1: Core Types & Contracts
- **Focus**: SongModel_v1, ScheduledEvent, ParameterAddress, SongDiff
- **TDD Approach**: Red → Green → Refactor for each type
- **Deliverables**: Complete type definitions with tests

### Agent 2: Event Emission Engine
- **Focus**: DeterministicEventEmitter, lookahead, boundedness
- **TDD Approach**: Test emission determinism first, then implement
- **Deliverables**: Working event emitter with golden tests

### Agent 3: Validation & Verification
- **Focus**: Projection validation, repeatability, hashing
- **TDD Approach**: Test failure modes first, then validators
- **Deliverables**: Complete validation system

### Agent 4: Integration & Tooling
- **Focus**: JUCE harness, CLI tools, serialization
- **TDD Approach**: Integration tests drive implementation
- **Deliverables**: Working integration toolchain

---

## Next Steps

1. **Approve this plan** - Confirm handoff understanding
2. **Initialize bd tracking** - Create issues for all phases
3. **Launch autonomous agents** - Begin parallel TDD implementation
4. **Daily sync** - Review progress and resolve blockers
5. **Continuous validation** - Run golden tests on every commit

---

*Plan Version: 1.0*
*Created: 2025-12-30*
*Status: Ready for Execution*
