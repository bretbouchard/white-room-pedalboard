# SDK Types → Execution Contract Mapping

> **Purpose**: Map existing SDK v2.1.0 types to SongModel_v1 execution contract
> **Status**: Design Document for Implementation

---

## Overview

This document shows how existing Schillinger SDK v2.1.0 types map to the new SongModel_v1 execution contract required for JUCE integration.

---

## Type Mapping Table

### Existing Types → SongModel_v1

| SongModel_v1 Component | Existing SDK Type(s) | Mapping Strategy |
|------------------------|---------------------|------------------|
| **SongModel_v1** | (NEW) | Create new top-level type |
| **TransportConfig** | `TempoMap`, `TimeSignatureMap` from `packages/shared/src/types/realization.ts` | Direct mapping with additions |
| **Section_v1** | `RealizedLayer` | Extract time ranges and role IDs |
| **Role_v1** | `GeneratorConfig` from `packages/core/src/generators/` | Wrap existing generators |
| **Projection_v1** | `TrackProjection` from `packages/shared/src/realization/track-projection.ts` | Enhance with target addressing |
| **MixGraph_v1** | (NEW) | Create new mix configuration type |
| **RealizationPolicy** | `RealizationPlaneConfig` | Adapt existing plane config |
| **ScheduledEvent** | (NEW) | Create from `RealizedFrame` |
| **ParameterAddress** | (NEW) | Create addressing scheme |

---

## Detailed Type Mappings

### 1. TransportConfig Mapping

**From**: `packages/shared/src/types/realization.ts`

```typescript
// EXISTING
interface TempoMap {
  events: TempoEvent[];
}

interface TimeSignatureMap {
  events: TimeSignatureEvent[];
}

// MAP TO → SongModel_v1.TransportConfig
interface TransportConfig {
  tempoMap: TempoEvent[];
  timeSignatureMap: TimeSignatureEvent[];
  loopPolicy: LoopPolicy;
  playbackSpeed: number;
}
```

**Implementation Notes**:
- Extract arrays from existing map types
- Add new `loopPolicy` and `playbackSpeed`
- Reuse existing `TempoEvent` and `TimeSignatureEvent` types

---

### 2. Section_v1 Mapping

**From**: `packages/shared/src/realization/realization-plane.ts`

```typescript
// EXISTING
interface RealizedLayer {
  id: string;
  roleId: string;
  startTime: MusicalTime;
  events: RealizedEvent[];
}

// MAP TO → SongModel_v1.Section_v1
interface Section_v1 {
  id: string;
  name: string;
  start: MusicalTime;
  end: MusicalTime;
  roles: string[];
  realizationHints?: Record<string, unknown>;
}
```

**Implementation Notes**:
- Sections are coarser than layers
- Extract time boundaries from layer groups
- Add role IDs for each section
- Keep `realizationHints` optional for flexibility

---

### 3. Role_v1 Mapping

**From**: `packages/core/src/generators/`

```typescript
// EXISTING (from BaseGenerator)
interface GeneratorConfig {
  type: 'rhythm' | 'harmony' | 'melody' | 'composition';
  params: Record<string, unknown>;
  metadata: GeneratorMetadata;
}

// MAP TO → SongModel_v1.Role_v1
interface Role_v1 {
  id: string;
  name: string;
  type: 'bass' | 'harmony' | 'melody' | 'rhythm' | 'texture' | 'ornament';
  generatorConfig: GeneratorConfig;  // Reuse existing
  parameters: RoleParameters;
}
```

**Implementation Notes**:
- Wrap existing `GeneratorConfig`
- Add musical role type (bass, harmony, etc.)
- Add `RoleParameters` for performance parameters
- Preserve existing generator functionality

---

### 4. Projection_v1 Mapping

**From**: `packages/shared/src/realization/track-projection.ts`

```typescript
// EXISTING
interface TrackProjection {
  roleId: string;
  trackId: string;
  transform?: ProjectionTransform;
}

// MAP TO → SongModel_v1.Projection_v1
interface Projection_v1 {
  id: string;
  roleId: string;
  target: {
    type: 'track' | 'bus' | 'instrument';
    id: string;
  };
  transform?: TransformConfig;
}
```

**Implementation Notes**:
- Extend existing `TrackProjection`
- Add unique ID for each projection
- Generalize target type (track/bus/instrument)
- Reuse existing transform logic

---

### 5. ScheduledEvent Creation

**From**: `packages/shared/src/realization/realization-plane.ts`

```typescript
// EXISTING
interface RealizedFrame {
  timestamp: MusicalTime;
  layers: RealizedLayer[];
  metadata: FrameMetadata;
}

interface RealizedEvent {
  timestamp: MusicalTime;
  type: string;
  data: unknown;
}

// MAP TO → ScheduledEvent (NEW)
interface ScheduledEvent {
  sampleTime: int64;
  musicalTime?: MusicalTime;
  type: EventType;
  target: ParameterAddress;
  payload: EventPayload;
  deterministicId: string;
  sourceInfo: EventSource;
}
```

**Implementation Notes**:
- Convert `RealizedEvent` to `ScheduledEvent`
- Resolve musical time to sample time
- Add parameter addressing
- Extract from `RealizedFrame.layers`
- Generate deterministic IDs

---

## Implementation Strategy

### Phase 1: Type Definitions

1. **Create new type files**:
   - `packages/shared/src/types/song-model.ts`
   - `packages/shared/src/types/scheduled-event.ts`
   - `packages/shared/src/types/parameter-address.ts`
   - `packages/shared/src/types/song-diff.ts`

2. **Import and extend existing types**:
   - Reuse `MusicalTime`, `TempoEvent`, `TimeSignatureEvent`
   - Extend `GeneratorConfig` from `packages/core/src/generators/`
   - Adapt `TrackProjection` from `packages/shared/src/realization/`

3. **Create new supporting types**:
   - `MixGraph_v1` (audio routing configuration)
   - `ParameterAddress` (addressing scheme)
   - `SongDiff` (mutation operations)

### Phase 2: Adapter Implementation

1. **Create adapter: RealizedFrame → ScheduledEvent**
   - File: `packages/core/src/realization/event-emitter.ts`
   - Convert existing `RealizedFrame` outputs to `ScheduledEvent[]`
   - Resolve musical time to sample time
   - Generate parameter addresses

2. **Create adapter: RealizationPlane → SongModel_v1**
   - File: `packages/core/src/realization/song-model-builder.ts`
   - Extract sections from `RealizedLayer` groups
   - Wrap existing `GeneratorConfig` in `Role_v1`
   - Build `Projection_v1` from `TrackProjection`

3. **Create validator: SongModel_v1 completeness**
   - File: `packages/core/src/realization/song-model-validator.ts`
   - Validate all projections resolve to valid targets
   - Ensure all roles have generators
   - Check time map consistency

### Phase 3: Integration Layer

1. **Create SongModel serializer**
   - JSON schema validation
   - Version compatibility checks
   - Portable export/import

2. **Create event emitter**
   - Deterministic scheduling
   - Bounded lookahead
   - Offline repeatability

---

## Anti-Pattern Mapping

### ❌ Don't Do This

```typescript
// BAD: Direct JUCE coupling in SongModel
interface SongModel_v1 {
  juceConfig: JUCEAudioProcessorConfig;  // NO
  tvosConstraints: TvOSConfig;           // NO
}
```

### ✅ Do This Instead

```typescript
// GOOD: Platform-agnostic contract
interface SongModel_v1 {
  mixGraph: MixGraph_v1;           // Platform-independent
  realizationPolicy: RealizationPolicy;  // Engine can interpret
}
```

Platform specifics go in integration layer, not core types.

---

## Testing Strategy

### Unit Tests

- **Type validation**: Verify SongModel_v1 structure
- **Serialization**: JSON round-trip consistency
- **Address parsing**: ParameterAddress validation
- **Diff application**: SongDiff correctness

### Integration Tests

- **Adapter tests**: RealizedFrame → ScheduledEvent
- **Builder tests**: RealizationPlane → SongModel_v1
- **Determinism tests**: Same input → identical events
- **Golden tests**: Verify event stream matches snapshots

### Performance Tests

- **Conversion speed**: RealizedFrame → ScheduledEvent throughput
- **Memory usage**: SongModel_v1 size for large compositions
- **Emission throughput**: Events per second

---

## Migration Path

### For Existing Code

**No Breaking Changes**:

Existing v2.1.0 APIs continue to work:

```typescript
// Still works
const plane = new RealizationPlane(config);
const frame = plane.realize({ seconds: 45.5 });

// New API
const songModel = buildSongModel(plane);
const events = emitScheduledEvents(frame, songModel);
```

### For New Code

Use SongModel_v1 for JUCE integration:

```typescript
const model: SongModel_v1 = {
  version: '1.0',
  id: generateId(),
  transport: { ... },
  sections: [ ... ],
  roles: [ ... ],
  projections: [ ... ],
  mixGraph: { ... },
  realizationPolicy: { ... },
  determinismSeed: 'seed-string'
};

const emitter = new DeterministicEventEmitter(model);
const events = emitter.emitForTimeRange({
  startSample: 0,
  endSample: 48000,
  sampleRate: 48000
});
```

---

## Dependencies

### Internal Dependencies

- `packages/shared/src/types/realization.ts` → Reuse time types
- `packages/shared/src/realization/realization-plane.ts` → Convert frames
- `packages/core/src/generators/` → Wrap generator configs
- `packages/shared/src/realization/track-projection.ts` → Extend projections

### External Dependencies

- No new external dependencies
- Existing dependencies: TypeScript, Vitest

---

## Success Criteria

✅ **Complete when**:
- All SongModel_v1 types defined with tests
- Adapter implementations pass golden tests
- Existing v2.1.0 APIs unchanged
- Deterministic event emission verified
- JUCE integration validated with test harness

---

*Document Version: 1.0*
*Created: 2025-12-30*
*Status: Ready for Implementation*
