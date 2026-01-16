📘 Schillinger SDK

Phase 5 — Intent & Adaptive Intelligence

Developer Handoff + Test Specification

Authority: TypeScript (canonical)
Prerequisites: Phase 1, 1.5, 3, 4 complete
Status: Approved for implementation

⸻

## 0. Phase 5 Purpose (Read First)

Phase 5 introduces goal-directed musical reasoning.

Up to Phase 4, the system can:
- generate deterministically
- shape music with fields
- structure long-form material
- coordinate multi-song timelines

Phase 5 enables the system to:

**Reason about musical goals, adapt behavior over time, and explain decisions.**

This phase is not about creativity by randomness.
It is about intent-driven adaptation with strict safety and explainability.

⸻

## 1. Phase 5 Goals (Locked)

Phase 5 introduces:
1. Authoritative IntentIR
2. Intent → Process / Control arbitration
3. Adaptive variation (non-destructive)
4. Explainability as a first-class output
5. Safe AI participation (bounded, auditable)

⸻

## 2. IntentIR — Goal Authority (Authoritative)

### 2.1 IntentIR Definition

IntentIR represents what the system is trying to achieve, not how.

```typescript
export type IntentIR_v1 = {
  id: IntentId;

  goal:
    | "increase_tension"
    | "resolve_tension"
    | "thin_texture"
    | "increase_density"
    | "create_contrast"
    | "stabilize"
    | "prepare_transition";

  strength: number; // 0–1

  scope:
    | "global"
    | "scene"
    | "section"
    | "role";

  timeRange?: TimeRange;

  source: "user" | "composer" | "ai" | "system";

  priority: number;
};
```

⸻

### 2.2 Rules
- IntentIR never directly creates PatternIR
- IntentIR influences:
  - Process selection
  - Control field shaping
  - Constraint priority
- Higher priority intents dominate
- Conflicting intents must resolve deterministically

⸻

## 3. Intent Arbitration Engine (Required)

### 3.1 Arbitration Responsibilities

The engine must:
1. Collect active IntentIRs
2. Sort by priority + scope
3. Translate intent into:
   - ProcessIR parameter bias
   - ControlIR field bias
4. Enforce constraints
5. Produce ExplainabilityIR (see §6)

⸻

### 3.2 Determinism Rule

Given the same IR graph and seed, intent arbitration must produce identical outcomes.

No stochastic intent resolution is allowed.

⸻

## 4. VariationIntentIR — Adaptive Development (Non-Destructive)

### 4.1 VariationIntentIR Definition

```typescript
export type VariationIntentIR_v1 = {
  id: VariationIntentId;

  basePattern: PatternId;

  operations: Array<
    | "augmentation"
    | "diminution"
    | "interference"
    | "phase_shift"
    | "register_rotation"
    | "density_warp"
    | "rhythmic_displacement"
  >;

  intensity: number; // 0–1

  seed: number;
};
```

⸻

### 4.2 Rules
- Variation never deletes the base PatternIR
- Produces:
  - New PatternIR
  - New ProcessIR
- Must be reversible
- Must preserve lineage

⸻

## 5. AI Participation Rules (Strict)

**AI may:**
- Propose IntentIR
- Propose VariationIntentIR
- Suggest ControlIR biases

**AI may not:**
- Modify PatternIR directly
- Override hard constraints
- Mutate SongGraphIR

AI output is treated as suggestions, subject to arbitration.

⸻

## 6. ExplainabilityIR — Required Output

### 6.1 ExplainabilityIR Definition

```typescript
export type ExplainabilityIR_v1 = {
  id: ExplainabilityId;

  chain: {
    intent?: IntentId;
    constraints?: ConstraintId[];
    processes?: ProcessId[];
    controls?: ControlId[];
    patterns?: PatternId[];
  };

  summary: string;
};
```

⸻

### 6.2 Rule

Every adaptive or intent-driven change must emit ExplainabilityIR.

If it cannot be explained, it must not happen.

⸻

## 7. Phase 5 Test Suite (MANDATORY)

Create: `/test/phase_5/`

All tests are IR-level only.

⸻

### 🧪 Test 1 — Intent Priority Resolution

**File:** `intent_priority.test.ts`

**Given**
- Two conflicting IntentIRs
- Different priorities

**Assert**
- Higher priority dominates
- Outcome deterministic
- ExplainabilityIR emitted

⸻

### 🧪 Test 2 — Intent → Control Influence

**File:** `intent_control_influence.test.ts`

**Given**
- Same ProcessIR
- Two IntentIR strengths

**Assert**
- ControlIR curves differ
- PatternIR differences bounded
- Seed stability holds

⸻

### 🧪 Test 3 — Adaptive Variation Lineage

**File:** `variation_lineage.test.ts`

**Given**
- Base PatternIR
- VariationIntentIR

**Assert**
- Base PatternIR unchanged
- New PatternIR created
- ProcessIR chain preserved
- Variation reversible

⸻

### 🧪 Test 4 — Explainability Completeness

**File:** `explainability_chain.test.ts`

**Given**
- Intent-driven adaptation

**Assert**
- ExplainabilityIR exists
- Chain references valid IRs
- Summary non-empty and stable

⸻

### 🧪 Test 5 — AI Safety Boundary

**File:** `ai_safety_boundary.test.ts`

**Given**
- AI-sourced IntentIR
- Conflicting user ConstraintIR

**Assert**
- User constraint always wins
- AI suggestion logged but not applied
- Deterministic outcome

⸻

### 🧪 Test 6 — Long-Form Adaptive Stability

**File:** `long_form_adaptive_stability.test.ts`

**Given**
- Multi-section StructuralIR
- Multiple IntentIR changes over time

**Assert**
- No drift
- No accumulation error
- Event stream reproducible

⸻

## 8. Phase 5 Acceptance Criteria (Gate)

Phase 5 is complete when:
- IntentIR influences behavior deterministically
- Adaptive variation is non-destructive
- All adaptive behavior is explainable
- AI participation is bounded and auditable
- All tests pass without mocking randomness or time

⸻

## 9. Explicit Non-Goals

❌ No UI
❌ No DSP
❌ No unsandboxed AI autonomy
❌ No black-box decisions
❌ No performance tuning

Phase 5 is about reasoning, not rendering.

⸻

## 10. Final Instruction to the Team

**Intent guides.**
**Constraints protect.**
**Processes transform.**
**Control shapes.**
**Patterns persist.**
**Everything explains itself.**

Phase 5 completes the Schillinger system as a living, adaptive composer.

⸻

## What Comes After Phase 6

**Phase 6 — Human & Machine Co-Performance**

Only after Phase 5 gate is met.

⸻

**If you want next, I can:**
- convert this into tickets / milestones
- generate test skeleton code
- produce a Phase 6 outline
- or map Phase 5 → Apple TV / live performance

Just tell me the next move.
