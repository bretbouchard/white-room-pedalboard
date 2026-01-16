# Architecture Compliance Report
## LLVM-Style Core + Global Transport + Multi-Song Graph

**Date**: 2025-12-30
**Status**: 🔴 Critical Violations Found
**Action Required**: Structural Refactoring Needed

---

## Executive Summary

The current codebase has **critical architectural violations** that must be resolved to align with the LLVM-style architecture. The main issue is that **SongModel contains transport concepts**, which violates the core principle that "SDK defines musical meaning, not timing."

**Impact**: High - requires breaking changes to SongModel_v1 interface
**Effort**: Medium - well-scoped refactoring with clear path forward

---

## 🔴 Critical Violations

### 1. SongModel Contains Transport Property

**Location**: `packages/shared/src/types/song-model.ts:27-60`

**Current Structure**:
```typescript
export interface SongModel_v1 {
  version: '1.0';
  id: string;
  createdAt: number;
  metadata: SongMetadata;
  transport: TransportConfig;  // ❌ VIOLATION
  sections: Section_v1[];
  roles: Role_v1[];
  projections: Projection_v1[];
  mixGraph: MixGraph_v1;
  realizationPolicy: RealizationPolicy;
  determinismSeed: string;
}
```

**Why This Violates the Architecture**:
- SongModel should represent **musical structure only** (immutable snapshot)
- Transport is about **execution timing**, which belongs in TimelineModel
- This prevents multiple songs from sharing one transport

**Required Fix**:
```typescript
// SongModel_v1 - Musical structure ONLY (no transport)
export interface SongModel_v1 {
  version: '1.0';
  id: string;
  createdAt: number;
  metadata: SongMetadata;
  // ❌ REMOVE: transport: TransportConfig;
  sections: Section_v1[];
  roles: Role_v1[];
  projections: Projection_v1[];
  mixGraph: MixGraph_v1;
  realizationPolicy: RealizationPolicy;
  determinismSeed: string;
}
```

---

### 2. TransportConfig Contains Playback Speed

**Location**: `packages/shared/src/types/song-model.ts:80-92`

**Current Structure**:
```typescript
export interface TransportConfig {
  tempoMap: TempoEvent[];
  timeSignatureMap: TimeSignatureEvent[];
  loopPolicy: LoopPolicy;
  playbackSpeed: number;  // ❌ VIOLATION - execution concern
}
```

**Why This Violates the Architecture**:
- `playbackSpeed` is a playback/execution parameter
- It belongs in the JUCE layer, not in the SDK
- SDK should not know "how fast" we're playing, only "what" we're playing

**Required Fix**:
Remove `playbackSpeed` from TransportConfig entirely. If needed, it should be:
- A property on the TimelineModel (as a playback preference)
- OR a parameter passed to JUCE's evaluation function
- NOT in the core SongModel

---

### 3. Validator Checks Transport Properties

**Location**: `packages/core/src/realization/song-model-validator.ts:255-265`

**Current Code**:
```typescript
if (
  model.transport.playbackSpeed !== undefined &&
  (typeof model.transport.playbackSpeed !== 'number' ||
    model.transport.playbackSpeed <= 0)
) {
  errors.push({
    field: 'transport.playbackSpeed',  // ❌ VIOLATION
    message: 'playbackSpeed must be a positive number',
    severity: 'error',
  });
}
```

**Why This Violates the Architecture**:
- SDK is validating execution concepts
- This validation should be in JUCE or removed entirely

**Required Fix**:
Remove all transport-related validation from SongModel validator.

---

## ✅ Acceptable Code (Not Violations)

### 1. visual-editor.ts has playheadPosition

**Status**: ✅ ACCEPTABLE

**Why**: `visual-editor.ts` is a **UI component**, not core SDK logic. UI layer can:
- Display playhead position
- Show current time
- Control playback

This is the **consumer** of SDK meaning, not the **definer** of meaning.

---

### 2. realtime.ts Exists

**Status**: ✅ ACCEPTABLE (but rename for clarity)

**Why**: `realtime.ts` implements **WebSocket network connections**, not musical timing:
- Connection management
- Message queuing
- Subscription handling
- Heartbeat monitoring

This is **network realtime**, not **musical realtime**.

**Recommendation**: Rename to `websocket-manager.ts` or `network-connection.ts` for clarity, but not required.

---

## 📋 Refactoring Plan

### Phase 1: Create New IR Types (Non-Breaking)

Create new types without breaking existing code:

1. **Create TimelineModel** (`packages/core/src/types/timeline-model.ts`):
```typescript
export interface TimelineModel {
  version: '1.0';
  id: string;
  transport: TransportConfig;  // Moved from SongModel
  songInstances: SongInstance[];
  interactionRules: InteractionRule[];
}

export interface SongInstance {
  instanceId: string;
  songModel: SongModel_v1;  // Reference to immutable model
  entryBar: number;
  phaseOffset: MusicalTime;
  gain: number;
  state: 'armed' | 'muted' | 'fading';
}

export interface InteractionRule {
  id: string;
  type: 'energyCap' | 'densityBudget' | 'callResponse' | 'motifSharing';
  sourceInstanceId: string;
  targetInstanceId?: string;
  parameters: Record<string, unknown>;
}
```

2. **Create TimelineDiff** (`packages/core/src/types/timeline-diff.ts`):
```typescript
export type TimelineDiff =
  | AddSongInstanceDiff
  | RemoveSongInstanceDiff
  | SetPhaseOffsetDiff
  | SetGainDiff
  | ArmSongDiff
  | AddInteractionRuleDiff;
```

---

### Phase 2: Deprecate Old Structure (Breaking Change)

1. **Version SongModel to v2.1**:
```typescript
export interface SongModel_v2 {
  version: '2.0';
  // ❌ NO transport property
  // Only musical structure
}
```

2. **Add Migration Path**:
```typescript
export function migrateSongModel_v1_to_v2(v1: SongModel_v1): SongModel_v2 {
  const { transport, ...rest } = v1;
  return {
    ...rest,
    version: '2.0',
  };
}
```

3. **Create TimelineModel from v1**:
```typescript
export function extractTimelineFrom_v1(v1: SongModel_v1): TimelineModel {
  return {
    version: '1.0',
    id: `${v1.id}-timeline`,
    transport: v1.transport,
    songInstances: [{
      instanceId: `${v1.id}-instance`,
      songModel: migrateSongModel_v1_to_v2(v1),
      entryBar: 0,
      phaseOffset: { bars: 0, beats: 0, sixteenths: 0 },
      gain: 1.0,
      state: 'armed',
    }],
    interactionRules: [],
  };
}
```

---

### Phase 3: Update All References

1. **Files to Update**:
   - `packages/shared/src/types/song-model.ts` - Remove transport
   - `packages/core/src/realization/song-model-validator.ts` - Remove transport validation
   - `packages/core/src/realization/song-model-builder.ts` - Update builder
   - All test files using SongModel_v1

2. **Validation Updates**:
   - Remove transport validation from SongModel validator
   - Create new TimelineModel validator
   - Add multi-song validation rules

---

### Phase 4: Implement Pure Evaluation

Create the evaluation function:

```typescript
// packages/core/src/evaluation/evaluate-timeline.ts
export function evaluateTimeline(
  timeline: TimelineModel,
  timeSlice: TimeSlice
): EvaluatedEvent[] {
  // Pure function: timeline + time window → events
  // No clocks, no scheduling, no side effects

  const events: EvaluatedEvent[] = [];

  for (const instance of timeline.songInstances) {
    if (instance.state !== 'armed') continue;

    const songEvents = evaluateSongAtTime(
      instance.songModel,
      timeSlice,
      instance.phaseOffset,
      instance.gain
    );

    events.push(...songEvents);
  }

  // Apply interaction rules
  return applyInteractionRules(events, timeline.interactionRules);
}
```

---

## 🎯 Success Criteria

After refactoring, the following must be true:

- ✅ SongModel_v2 has NO transport property
- ✅ TimelineModel owns transport (tempoMap, timeSignatureMap, loopRegions)
- ✅ No SDK code references playbackSpeed, playheadPosition, or currentBar
- ✅ All operations are pure functions (no side effects)
- ✅ Multi-song evaluation is deterministic
- ✅ Golden tests pass: same input → same output

---

## 📊 Estimated Effort

| Task | Effort | Risk |
|------|--------|------|
| Create TimelineModel types | 2 hours | Low |
| Create migration functions | 2 hours | Low |
| Remove transport from SongModel_v2 | 1 hour | Medium |
| Update all SongModel references | 4 hours | Medium |
| Update validators | 2 hours | Low |
| Implement evaluateTimeline() | 4 hours | Medium |
| Write golden tests | 3 hours | Low |
| Fix resulting TypeScript errors | 4 hours | Medium |
| **Total** | **22 hours** | **Medium** |

---

## 🚀 Next Steps

1. **Immediate**: Create new types (TimelineModel, TimelineDiff)
2. **Short-term**: Deprecate SongModel_v1, create v2
3. **Medium-term**: Implement evaluation function
4. **Long-term**: Add interaction rules and multi-song support

---

## Questions for SDK Team

1. **Migration Strategy**: Do we want to support both v1 and v2 simultaneously, or do a hard break?
2. **Playback Speed**: Where should playbackSpeed live if not in SongModel? (JUCE parameter? TimelineModel?)
3. **Testing**: What level of test coverage is required before breaking changes?
4. **Timeline**: When should this refactoring be completed relative to other deliverables?

---

**End of Architecture Compliance Report**
