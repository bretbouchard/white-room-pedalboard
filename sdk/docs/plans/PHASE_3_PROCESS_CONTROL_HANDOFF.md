📘 Schillinger SDK

Phase 3 — Process & Control Intelligence

Developer Handoff + Test Specification

Authority: TypeScript
Status: Approved for implementation
Prerequisite: Phase 1 + Phase 1.5 complete

⸻

## 0. Phase 3 Purpose (Read First)

Phase 3 makes Schillinger explicit, inspectable, and reversible.

Up to Phase 2, the SDK answers:

**"What happens, and when?"**

Phase 3 answers:

**"Why did this happen, how can it change, and how does it evolve?"**

This phase does not add new generators.
It formalizes and constrains how generators behave.

⸻

## 1. Phase 3 Scope (Locked)

Phase 3 introduces:
1. Authoritative ProcessIR
2. ControlIR as musical fields (not automation)
3. Role-centric generation
4. Deterministic constraint enforcement
5. Explainable lineage

⸻

## 2. ProcessIR — Authoritative Schillinger Logic

### 2.1 Required ProcessIR Expansion

Every PatternIR must be produced by a ProcessIR chain.

```typescript
export type ProcessIR_v1 = {
  id: ProcessId;
  seed: number;

  operation:
    | "resultant"
    | "interference"
    | "permutation"
    | "rotation"
    | "expansion"
    | "contraction"
    | "inversion"
    | "reflection"
    | "phase_shift";

  inputs: PatternId[];

  parameters: Record<string, number>;

  output: PatternId;
};
```

⸻

### 2.2 Mandatory Rules
- ❌ No PatternIR may exist without ProcessIR
- ❌ Generators may not emit PatternIR directly
- ✅ Generators emit ProcessIR + PatternIR
- ✅ Process chains must be serializable and replayable

⸻

## 3. ControlIR — Musical Fields (Not Automation)

### 3.1 ControlIR Redefined

ControlIR represents continuous musical influence, not parameter knobs.

Examples:
- density
- harmonic tension
- interval spread
- rhythmic compression
- articulation pressure

```typescript
export type ControlIR_v1 = {
  id: ControlId;

  field:
    | "density"
    | "interval_spread"
    | "harmonic_tension"
    | "rhythmic_pressure"
    | "articulation_energy";

  curve: CurveIR;
  scope: TimeRange;

  target:
    | { type: "role"; id: RoleId }
    | { type: "process"; id: ProcessId };
};
```

⸻

### 3.2 Rules
- ControlIR never creates events
- ControlIR shapes ProcessIR parameters
- ControlIR must be evaluable deterministically

⸻

## 4. Role-Centric Generation (Mandatory Shift)

### 4.1 Generator Contract Change

Generators must pivot from:

**"Generate notes for an instrument"**

to:

**"Generate behavior for a RoleIR"**

PatternIR references RoleIR, not InstrumentIR.

⸻

### 4.2 Acceptance Rule

The same:
- RoleIR
- ProcessIR
- ControlIR

must produce valid PatternIR when assigned to different InstrumentIRs.

⸻

## 5. ConstraintIR — Enforcement Engine

### 5.1 Constraint Resolution

Constraints are now active.

```typescript
export type ConstraintIR_v1 = {
  id: ConstraintId;

  scope: "global" | "scene" | "song" | "role";

  kind: "hard" | "soft";

  rule: string;
  value: number | boolean;

  priority: number;
  source: "user" | "system" | "ai";
};
```

⸻

### 5.2 Rules
- Hard constraints may not be violated
- Soft constraints may bend, not disappear
- Higher priority wins
- Resolution must be explainable

⸻

## 6. Phase 3 Test Suite (MANDATORY)

All tests are IR-level.
No DSP. No UI. No MIDI.

Create: `/test/phase_3/`

⸻

### 🧪 Test 1 — Process Lineage Completeness

**Name:** `process_lineage.test.ts`

**Given**
- A generated PatternIR

**Assert**
- It has a ProcessIR
- ProcessIR inputs exist
- Process chain is acyclic
- Replay produces identical PatternIR

⸻

### 🧪 Test 2 — Reversibility Test

**Name:** `process_reversibility.test.ts`

**Given**
- A PatternIR
- Its ProcessIR chain

**Assert**
- Removing the last ProcessIR removes the PatternIR
- Re-applying the ProcessIR regenerates the PatternIR identically

⸻

### 🧪 Test 3 — Control Field Influence

**Name:** `control_field_influence.test.ts`

**Given**
- Same ProcessIR
- Two different ControlIR curves

**Assert**
- Output PatternIR differs
- Differences are bounded and deterministic
- Seed stability holds

⸻

### 🧪 Test 4 — Role Independence

**Name:** `role_independence.test.ts`

**Given**
- Same RoleIR + ProcessIR
- Two different InstrumentIR assignments

**Assert**
- PatternIR identical
- Only realization differs

⸻

### 🧪 Test 5 — Constraint Enforcement

**Name:** `constraint_enforcement.test.ts`

**Given**
- Conflicting constraints (hard vs soft)

**Assert**
- Hard constraint always enforced
- Soft constraint yields deterministically
- Resolution is logged and explainable

⸻

### 🧪 Test 6 — Multi-Scene Stability

**Name:** `scene_control_isolation.test.ts`

**Given**
- Scene A and Scene B
- Scene-local ControlIR overrides

**Assert**
- Scene switches do not mutate SongGraphIR
- ControlIR applies only within scope

⸻

## 7. Phase 3 Acceptance Criteria (Gate)

Phase 3 is complete when:
- Every PatternIR is traceable to ProcessIR
- ControlIR influences are measurable and deterministic
- Roles generate independently of instruments
- Constraints resolve deterministically
- All tests pass without mocking time or randomness

**No exceptions.**

⸻

## 8. Explicit Non-Goals

❌ No UI
❌ No DSP
❌ No performance tuning
❌ No new musical theory
❌ No AI heuristics

This phase is about correctness and clarity.

⸻

## 9. Final Instruction to the Team

**If it is not represented in IR, it does not exist.**
**If it cannot be tested, it is not complete.**

Phase 3 is the foundation for everything expressive that follows.

⸻

**If you want next, I can:**
- turn this into tickets / milestones
- generate test skeleton code
- write Phase 4 handoff
- or map Phase 3 directly to JUCE runtime hooks

Just say the word.
