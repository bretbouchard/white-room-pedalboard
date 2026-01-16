# Multi-Graph IR Architecture - Implementation Plan

**Status**: Planning Phase
**Created**: 2025-12-30
**Branch**: TBD (will create after planning)
**Base**: phase2-implementation

---

## Executive Summary

Implement a comprehensive IR (Intermediate Representation) architecture supporting multiple independent song graphs on a shared timeline, enabling:
- Full Schillinger system embodiment (process-centric, not note-centric)
- Deterministic playback, diffing, replay, and AI reasoning
- Future expansion into AI, live performance, games, Apple TV, JUCE

**Scope**: Core IR layer only (no UI, no DSP, no musical algorithm changes)

---

## Current State

### Completed (Phase 2)
- ✅ Basic `PatternIR_v1` descriptors for 4 generators
  - `generateResultantIR()` - Rhythm resultants
  - `generateComplexIR()` - Complex rhythms
  - `generatePatternIR()` - Melody patterns
  - `generateContourIR()` - Melodic contours
  - `generateProgressionIR()` - Chord progressions
  - `generateChordIR()` - Individual chords
  - `generateCompositionIR()` - Full compositions

### Current IR Structure (Minimal)
```typescript
interface PatternIR_v1 {
  version: '1.0';
  baseRule: string;        // e.g., 'resultant(3,4)'
  variationRule?: string;  // e.g., 'complexity:0.7'
  seed: string;            // explicit seed
}
```

### Gap Analysis
Current IR is a **descriptor** only. The full architecture needs:
- Event-level detail (musical notes, timing)
- Multi-song support
- Timeline management
- Instrument/effect declarations
- Routing/graph topology
- Parameter automation
- Scene management
- Namespacing for collision safety

---

## IR Stack to Implement

### 1. TimelineIR — Global Time Authority (Priority: 1)
**Responsibility**: Single source of truth for time across all songs

```typescript
interface TimelineIR_v1 {
  version: '1.0';
  id: TimelineId;

  tempoMap: TempoChange[];
  timeSignatureMap: TimeSignatureChange[];

  clock: 'musical' | 'seconds' | 'hybrid';

  start: MusicalTime;
  end?: MusicalTime;
}

interface TempoChange {
  time: MusicalTime;
  bpm: number;
}

interface TimeSignatureChange {
  time: MusicalTime;
  numerator: number;
  denominator: number;
}

type MusicalTime = {
  bars?: number;
  beats?: number;
  seconds?: number;
};
```

**Rules**:
- No SongGraph owns tempo or time
- All time references resolve through TimelineIR
- Determinism is anchored here

---

### 2. SongGraphIR — Isolated Musical Graph (Priority: 2)
**Responsibility**: A self-contained musical universe

```typescript
interface SongGraphIR_v1 {
  version: '1.0';
  id: SongId;
  namespace: NamespaceId;

  timelineRef: TimelineId;

  structure: StructuralIR_v1;
  processes: ProcessIR_v1[];
  patterns: PatternIR_v1[];
  controls: ControlIR_v1[];

  instruments: InstrumentIR_v1[];
  signalGraph: SignalGraphIR_v1;
}
```

**Rules**:
- SongGraphs never reference each other
- All IDs are namespaced
- No mix or placement logic inside SongGraphIR

---

### 3. SongPlacementIR — Timeline Coexistence (Priority: 4)
**Responsibility**: Defines when and how a SongGraph exists on the timeline

```typescript
interface SongPlacementIR_v1 {
  version: '1.0';
  songId: SongId;

  start: MusicalTime;
  duration?: MusicalTime;

  mode: 'one-shot' | 'loop' | 'stretch';

  gain: number;
  priority: number;
}
```

**Rules**:
- Multiple SongPlacements may overlap
- Placement does not modify SongGraph contents
- Priority resolves conflicts deterministically

---

### 4. InstrumentIR — Sound Sources & Processors (Priority: 3)
**Responsibility**: Declares what instruments or effects exist

```typescript
interface InstrumentIR_v1 {
  version: '1.0';
  id: InstrumentId;
  role: RoleId;

  kind: 'synth' | 'sampler' | 'effect';
  model: string; // e.g., 'AnalogPoly', 'FM6', 'ReverbPlate'

  parameters: Record<string, ParameterValue>;

  capabilities?: {
    polyphony?: number;
    supportsMPE?: boolean;
    modulationInputs?: string[];
  };
}
```

**Rules**:
- InstrumentIR is declarative
- No automation curves here
- No routing here

---

### 5. SignalGraphIR — Wiring & Routing (Priority: 3)
**Responsibility**: Defines how instruments are connected

```typescript
interface SignalGraphIR_v1 {
  version: '1.0';
  nodes: InstrumentId[];

  connections: {
    from: InstrumentId;
    to: InstrumentId;
    type: 'audio' | 'control' | 'sidechain';
  }[];
}
```

**Rules**:
- Graph is acyclic unless explicitly allowed
- No time-varying behavior
- Routing ≠ automation

---

### 6. ControlIR — Parameter Evolution (Priority: 8)
**Responsibility**: Defines how parameters change over time

```typescript
interface ControlIR_v1 {
  version: '1.0';
  target: ParameterAddress;
  curve: CurveIR;
  scope: TimeRange;
}

interface CurveIR {
  type: 'linear' | 'exponential' | 'step' | 'spline';
  points: { time: number; value: number }[];
}
```

**Rules**:
- ControlIR never implies device existence
- Applies to InstrumentIR, MixIR, or Structural targets
- Purely temporal

---

### 7. ProcessIR — Schillinger Operations (Priority: 7)
**Responsibility**: Captures how patterns were generated

```typescript
interface ProcessIR_v1 {
  version: '1.0';
  id: ProcessId;
  seed: number;

  type:
    | 'resultant'
    | 'interference'
    | 'permutation'
    | 'rotation'
    | 'expansion'
    | 'inversion';

  inputs: PatternIRId[];
  parameters: Record<string, number>;

  output: PatternIRId;
}
```

**Rules**:
- Every generated PatternIR must have a ProcessIR
- Enables explainability, evolution, reverse analysis

---

### 8. PatternIR — Musical Events (Priority: 2 - EXPAND EXISTING)
**Responsibility**: Concrete musical decisions

```typescript
interface PatternIR_v2 {  // Expand from v1
  version: '2.0';
  id: PatternIRId;
  seed: number;

  role: RoleId;
  scope: TimeRange;

  events: MusicalEvent[];

  provenance: {
    generator: string;
    processId: ProcessId;
  };
}

interface MusicalEvent {
  time: number;  // offset from scope.start
  pitch?: number;
  velocity?: number;
  duration?: number;
  type: 'note' | 'rest' | 'chord' | 'control';
}

interface TimeRange {
  start: MusicalTime;
  end: MusicalTime;
}
```

**Migration from v1**:
- Current v1 is descriptor-only (baseRule + seed)
- v2 adds actual events and provenance
- Can generate v2 from v1 + seed

---

### 9. StructuralIR — Form & Hierarchy (Priority: 2)
**Responsibility**: Defines musical roles and structure

```typescript
interface StructuralIR_v1 {
  version: '1.0';
  sections: {
    id: SectionId;
    roleAssignments: RoleId[];
    constraints?: StructuralConstraint[];
  }[];
}

type RoleId = 'melody' | 'bass' | 'harmony' | 'rhythm' | 'pad' | 'lead';
```

---

### 10. MixIR — Cross-Graph Interaction (Priority: 5)
**Responsibility**: Where independent SongGraphs interact safely

```typescript
interface MixIR_v1 {
  version: '1.0';
  buses: BusIR[];

  routes: {
    from: SongId | InstrumentId;
    to: BusId;
    gain: number;
    pan?: number;
  }[];

  effects: InstrumentIR[];
}

interface BusIR {
  id: BusId;
  name: string;
  parameters: Record<string, ParameterValue>;
}
```

**Rules**:
- Only place SongGraphs touch
- No pattern-level logic here

---

### 11. SceneIR — System-Level State (Priority: 6)
**Responsibility**: Defines which graphs are active and how transitions occur

```typescript
interface SceneIR_v1 {
  version: '1.0';
  id: SceneId;

  activePlacements: SongPlacementIR_v1[];

  mixOverrides?: MixIR_v1;
  controlOverrides?: ControlIR_v1[];

  transition: 'cut' | 'fade' | 'morph';
}
```

**Use Cases**:
- Apple TV scenes
- Live performance
- Game states
- Generative setlists

---

### 12. NamespaceIR — Collision Safety (Priority: 9)
**Responsibility**: Prevent ID collisions across independent graphs

```typescript
interface NamespaceIR_v1 {
  version: '1.0';
  id: NamespaceId;
  prefix: string;
}
```

**Rules**:
- Every SongGraph has a namespace
- All IDs are resolved via namespace
- Prevents automation and AI collisions

---

### 13. IntentIR — Why (Priority: 10 - Future)
**Responsibility**: Captures high-level musical intent

```typescript
interface IntentIR_v1 {
  version: '1.0';
  goal: string;
  constraints: string[];
  mood?: string;
  energy?: 'low' | 'medium' | 'high';
}
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. **TimelineIR** - Global time authority
   - Define types
   - Implement tempo/time signature maps
   - Add validation

2. **SongGraphIR** - Isolated musical graphs
   - Define structure
   - Implement namespace resolution
   - Add tests for isolation

3. **PatternIR v2** - Expand existing PatternIR
   - Add events array
   - Add provenance tracking
   - Maintain backward compatibility with v1

### Phase 2: Graph Structure (Week 2)
4. **InstrumentIR + SignalGraphIR**
   - Define instrument types
   - Implement connection graph
   - Add validation (acyclic check)

5. **StructuralIR**
   - Define section/role structure
   - Implement role assignments
   - Add constraint validation

6. **ProcessIR**
   - Define Schillinger operation types
   - Implement provenance tracking
   - Add to existing generators

### Phase 3: Timeline & Placement (Week 3)
7. **SongPlacementIR**
   - Define placement modes
   - Implement overlap resolution
   - Add priority logic

8. **MixIR**
   - Define bus structure
   - Implement routing
   - Add cross-graph interaction

9. **SceneIR**
   - Define scene structure
   - Implement transitions
   - Add state management

### Phase 4: Control & Namespacing (Week 4)
10. **ControlIR**
    - Define curve types
    - Implement parameter addressing
    - Add temporal resolution

11. **NamespaceIR**
    - Define namespace structure
    - Implement ID resolution
    - Add collision detection

12. **IntentIR** (Optional - Future)
    - Define intent structure
    - Implement intent-to-IR mapping
    - Add AI integration hooks

---

## File Structure

```
packages/shared/src/ir/
├── index.ts                      # Main export
├── timeline.ts                   # TimelineIR
├── song-graph.ts                 # SongGraphIR
├── song-placement.ts             # SongPlacementIR
├── instrument.ts                 # InstrumentIR
├── signal-graph.ts               # SignalGraphIR
├── control.ts                    # ControlIR
├── process.ts                    # ProcessIR
├── pattern.ts                    # PatternIR (expand existing)
├── structural.ts                 # StructuralIR
├── mix.ts                        # MixIR
├── scene.ts                      # SceneIR
├── namespace.ts                  # NamespaceIR
├── intent.ts                     # IntentIR
├── types.ts                      # Shared types (MusicalTime, etc.)
└── validation.ts                 # IR validation utilities

packages/core/src/
├── timeline/                     # TimelineIR operations
├── song-graph/                   # SongGraphIR operations
├── instruments/                  # InstrumentIR operations
└── scenes/                       # SceneIR operations

packages/core/src/__tests__/
├── ir/                           # IR tests
│   ├── timeline.test.ts
│   ├── song-graph.test.ts
│   ├── song-placement.test.ts
│   └── ...
└── integration/
    └── multi-song.test.ts       # Multi-song determinism tests
```

---

## Acceptance Criteria

This IR system is complete when:
- [ ] Multiple SongGraphs can overlap deterministically
- [ ] Scenes can switch without state leaks
- [ ] No IR has dual responsibility
- [ ] Tests assert IR structure, not side effects
- [ ] All 13 IR types implemented with tests
- [ ] Type definitions exported for TypeScript, Swift, JSON
- [ ] Documentation complete
- [ ] Golden tests for multi-song determinism pass

---

## Next Steps

1. **Review and approve this plan**
2. **Create feature branch**: `multi-graph-ir`
3. **Start Phase 1**: Implement TimelineIR, SongGraphIR, PatternIR v2
4. **Generate TypeScript type definitions**
5. **Write comprehensive tests**
6. **Document migration path from Phase 2 IR**

---

**Status**: Ready for review and implementation planning
