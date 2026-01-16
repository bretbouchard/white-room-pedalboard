📘 Schillinger SDK

Phase 6 — Human & Machine Co-Performance

Developer Handoff + Test Specification

Authority: TypeScript (canonical)
Prerequisites: Phases 1, 1.5, 3, 4, 5 complete
Status: Approved for implementation

⸻

## 0. Phase 6 Purpose (Read First)

Phase 6 enables live, bidirectional collaboration between:
- humans (performers, conductors, controllers)
- machines (Schillinger processes, adaptive intent)
- environments (games, visuals, external systems)

Up to Phase 5, the system can:
- reason about goals
- adapt deterministically
- explain its decisions

Phase 6 ensures that human input can participate safely without:
- breaking determinism
- mutating composition state
- overriding musical intent silently

**Humans do not "take over" the system.**
**They negotiate with it.**

⸻

## 1. Phase 6 Goals (Locked)

Phase 6 introduces:
1. HumanIntentIR (live input as intent)
2. GestureIR / InputIR (raw performance signals)
3. Negotiation & Arbitration Layer
4. Non-destructive live overrides
5. Full explainability of human + AI decisions

⸻

## 2. HumanIntentIR — Performer Intent Authority

### 2.1 HumanIntentIR Definition

HumanIntentIR is a live, time-scoped intent, not a command.

```typescript
export type HumanIntentIR_v1 = {
  id: HumanIntentId;

  goal:
    | "increase_energy"
    | "reduce_density"
    | "hold_pattern"
    | "release_tension"
    | "emphasize_role"
    | "override_articulation";

  strength: number; // 0–1

  scope:
    | "global"
    | "scene"
    | "section"
    | "role"
    | "instrument";

  timeRange: TimeRange;

  source: "gesture" | "controller" | "keyboard" | "network";

  priority: number;
};
```

⸻

### 2.2 Rules
- HumanIntentIR never mutates PatternIR
- HumanIntentIR enters the same arbitration pipeline as IntentIR
- Priority resolves conflicts deterministically
- Expired HumanIntentIR is automatically removed

⸻

## 3. GestureIR / InputIR — Raw Performance Signals

### 3.1 GestureIR Definition

GestureIR captures raw human input, un-interpreted.

```typescript
export type GestureIR_v1 = {
  id: GestureId;

  inputType:
    | "knob"
    | "fader"
    | "pad"
    | "keyboard"
    | "touch"
    | "motion"
    | "network";

  value: number; // normalized 0–1
  timestamp: number;

  targetHint?: RoleId | InstrumentId;
};
```

⸻

### 3.2 Rules
- GestureIR is ephemeral
- GestureIR must be translated into HumanIntentIR
- GestureIR alone never changes music

⸻

## 4. Negotiation & Arbitration Engine (CRITICAL)

### 4.1 Arbitration Order (Locked)

All influence flows through this order:

```
Hard Constraints
→ User IntentIR
→ HumanIntentIR
→ System IntentIR
→ AI IntentIR
→ ControlIR
→ ProcessIR
```

**No exceptions.**

⸻

### 4.2 Negotiation Rules
- Human input may bend, not break, structure
- Human input may override AI, but not user constraints
- All outcomes must emit ExplainabilityIR

⸻

## 5. Live Override Model (Non-Destructive)

### 5.1 Override Behavior

Live performance effects:
- apply via ControlIR bias
- apply via VariationIntentIR
- expire automatically

No PatternIR or StructuralIR mutation is allowed.

⸻

## 6. ExplainabilityIR (Extended)

ExplainabilityIR must now include human input lineage.

```typescript
export type ExplainabilityIR_v2 = {
  id: ExplainabilityId;

  chain: {
    humanIntent?: HumanIntentId;
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

## 7. Phase 6 Test Suite (MANDATORY)

Create: `/test/phase_6/`

All tests are IR-level.
No UI, DSP, MIDI, or realtime clocks.

⸻

### 🧪 Test 1 — Human Intent Arbitration

**File:** `human_intent_arbitration.test.ts`

**Given**
- HumanIntentIR and AI IntentIR conflict

**Assert**
- HumanIntentIR wins if priority higher
- Outcome deterministic
- ExplainabilityIR emitted

⸻

### 🧪 Test 2 — Gesture Translation Safety

**File:** `gesture_translation.test.ts`

**Given**
- GestureIR stream

**Assert**
- GestureIR produces HumanIntentIR
- No direct PatternIR mutation
- Translation deterministic

⸻

### 🧪 Test 3 — Live Override Expiry

**File:** `live_override_expiry.test.ts`

**Given**
- Time-scoped HumanIntentIR

**Assert**
- Influence applies only within timeRange
- System returns to baseline after expiry
- No state leakage

⸻

### 🧪 Test 4 — Multi-Performer Isolation

**File:** `multi_performer_isolation.test.ts`

**Given**
- Two HumanIntentIRs from different sources

**Assert**
- Scoped correctly
- No cross-role contamination
- Deterministic resolution

⸻

### 🧪 Test 5 — Structural Safety Under Performance

**File:** `structural_safety.test.ts`

**Given**
- Aggressive HumanIntentIR input

**Assert**
- StructuralIR unchanged
- No section collapse
- Constraints enforced

⸻

### 🧪 Test 6 — Explainability Completeness (Human)

**File:** `human_explainability.test.ts`

**Given**
- Human-driven musical change

**Assert**
- ExplainabilityIR includes humanIntent
- Chain complete
- Summary stable and non-empty

⸻

### 🧪 Test 7 — Long-Running Live Stability

**File:** `long_running_live_stability.test.ts`

**Given**
- Continuous HumanIntentIR input (>10 min)

**Assert**
- No drift
- No accumulation error
- Event stream reproducible with same input log

⸻

## 8. Phase 6 Acceptance Criteria (Final Gate)

Phase 6 is complete when:
- Human input participates as intent, not command
- Live performance is non-destructive
- Human, AI, and system intents arbitrate deterministically
- All changes are explainable
- Long-running sessions remain stable

⸻

## 9. Explicit Non-Goals

❌ No UI implementation
❌ No DSP performance tuning
❌ No unsandboxed human overrides
❌ No bypassing constraints
❌ No non-deterministic "feel" hacks

Phase 6 is about trust, not flash.

⸻

## 10. Final Instruction to the Team

**Humans guide.**
**Machines adapt.**
**Constraints protect.**
**Music persists.**
**Nothing is lost.**

Phase 6 completes the Schillinger SDK as a human-machine musical instrument, not just a generator.

⸻

## What Comes After Phase 6

Beyond this point, the SDK is feature-complete.

Further work becomes:
- UX layers
- hardware mappings
- game / film integration
- domain-specific tooling

⸻

**If you want next, I can:**
- convert Phase 6 into tickets / milestones
- map Phase 6 → Apple TV / hardware controllers
- produce input device profiles
- or write a 1-page executive summary

Just tell me where you want to go next.
