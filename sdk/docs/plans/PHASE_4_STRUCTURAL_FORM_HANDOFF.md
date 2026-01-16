📘 Schillinger SDK

Phase 4 — Structural & Form Intelligence

Developer Handoff + Test Specification

Authority: TypeScript
Prerequisites: Phase 1, Phase 1.5, Phase 3 complete
Status: Approved for implementation

⸻

## 0. Phase 4 Purpose (Read First)

Phase 3 made process and control explicit.
Phase 4 makes music large-scale, hierarchical, and intentional over time.

Up to Phase 3, the system understands:
- patterns
- processes
- fields
- roles

Phase 4 enables:

**form, hierarchy, sectional logic, and long-range musical intent**

This is where the SDK stops behaving like a generator and starts behaving like a composer.

⸻

## 1. Phase 4 Goals (Locked)

Phase 4 introduces:
1. Hierarchical StructuralIR
2. Section-aware role behavior
3. Scene-driven form transitions
4. Multi-song structural coexistence
5. Deterministic long-form behavior

⸻

## 2. StructuralIR — Hierarchical Form Graph (Authoritative)

### 2.1 StructuralIR Expansion

StructuralIR becomes a tree, not a flat list.

```typescript
export type StructuralIR_v1 = {
  id: StructuralId;

  rootSection: SectionId;

  sections: {
    id: SectionId;

    parent?: SectionId;
    children?: SectionId[];

    timeRange: TimeRange;

    roleWeights: Record<RoleId, number>;

    constraints?: ConstraintId[];

    sceneHints?: SceneHint[];
  }[];
};
```

⸻

### 2.2 Rules
- Sections form a directed acyclic graph
- Children inherit constraints unless overridden
- Section boundaries do not regenerate patterns
- StructuralIR never emits notes

⸻

### 2.3 Examples Enabled
- AABA
- Verse / Chorus / Bridge
- Primary vs secondary material
- Call / response
- Anticipation / release

⸻

## 3. Section-Aware Role Behavior

Roles gain sectional context.

```typescript
type SectionRoleBehavior = {
  roleId: RoleId;
  sectionId: SectionId;

  densityBias?: number;
  registerBias?: number;
  rhythmicBias?: number;
};
```

**Rules**
- Section bias modifies ControlIR evaluation
- No direct PatternIR mutation
- Behavior must remain deterministic

⸻

## 4. Scene-Driven Structural Transitions

Scenes now act as structural state selectors, not just switches.

```typescript
export type SceneHint = {
  sceneId: SceneId;

  intentBias?: {
    tension?: number;
    density?: number;
    contrast?: number;
  };

  transitionStyle?: "cut" | "fade" | "morph";
};
```

**Rules**
- Scene changes never mutate SongGraphIR
- StructuralIR defines what can change
- SceneIR defines when it changes

⸻

## 5. Multi-Song Structural Coexistence

Phase 4 introduces structural arbitration across graphs.

**Rules:**
- Each SongGraph retains its own StructuralIR
- Timeline arbitration occurs via:
  - role weights
  - constraint priority
  - scene context
- No SongGraph may directly reference another

This enables:
- overlapping songs
- ambient layers
- generative playlists
- moving sidewalk sets

⸻

## 6. Phase 4 Test Suite (MANDATORY)

Create: `/test/phase_4/`

All tests are IR-level.
No DSP, MIDI, UI, or realtime clocks.

⸻

### 🧪 Test 1 — Structural Hierarchy Validity

**File:** `structural_hierarchy.test.ts`

**Given**
- A StructuralIR with nested sections

**Assert**
- Graph is acyclic
- All children fall within parent timeRange
- Inherited constraints resolve deterministically

⸻

### 🧪 Test 2 — Section Boundary Stability

**File:** `section_boundary_stability.test.ts`

**Given**
- PatternIR spanning multiple sections

**Assert**
- PatternIR identity unchanged across sections
- Only ControlIR influence differs
- No re-generation occurs

⸻

### 🧪 Test 3 — Role Weight Influence

**File:** `role_weighting.test.ts`

**Given**
- Same RoleIR + ProcessIR
- Two sections with different roleWeights

**Assert**
- PatternIR density / emphasis differs
- Differences are bounded
- Determinism holds with same seed

⸻

### 🧪 Test 4 — Scene-Structural Interaction

**File:** `scene_structural_interaction.test.ts`

**Given**
- Two scenes with different SceneHints

**Assert**
- Scene changes modify control bias
- StructuralIR remains immutable
- Reverting scene restores prior behavior

⸻

### 🧪 Test 5 — Long-Form Determinism

**File:** `long_form_determinism.test.ts`

**Given**
- Multi-section StructuralIR
- Long timeline (> 5 minutes musical time)

**Assert**
- Event stream identical across runs
- No drift or accumulation error
- Control fields remain stable

⸻

### 🧪 Test 6 — Multi-Song Structural Arbitration

**File:** `multi_song_structure.test.ts`

**Given**
- Two SongGraphs with overlapping sections
- Conflicting role emphasis

**Assert**
- Constraint priority resolves conflicts
- No cross-graph mutation
- Mix + structure remain explainable

⸻

## 7. Phase 4 Acceptance Criteria (Gate)

Phase 4 is complete when:
- StructuralIR supports nested sections
- Roles behave differently by section
- Scenes influence structure without mutation
- Multi-song timelines remain deterministic
- All tests pass without time mocking

⸻

## 8. Explicit Non-Goals

❌ No UI
❌ No DSP
❌ No new generators
❌ No AI heuristics
❌ No performance tuning

Phase 4 is about form, not sound.

⸻

## 9. Final Instruction to the Team

**Patterns persist.**
**Structure shapes.**
**Scenes select.**
**Time never lies.**

Phase 4 is the foundation for intent-driven music.

⸻

## What Comes Next (Do Not Implement Yet)

**Phase 5 — Intent & Adaptive Intelligence**

Only begins after Phase 4 gate is met.

⸻

**If you want next, I can:**
- produce Phase 5 handoff
- generate golden long-form fixtures
- map Phase 4 → Apple TV UX
- or convert this into tickets / milestones

Just tell me where to go next.
