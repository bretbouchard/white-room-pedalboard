# Schillinger SDK

# Stability, Boundary Control & CI Matrix

**Handoff Document (v1)**

---

## 0. Purpose

The Schillinger SDK is now theoretically and structurally complete.

This document defines the **minimum stability, boundary, and verification layer** required to:

- ✅ Preserve determinism across languages
- ✅ Prevent agency leaks (UI, AI, tooling)
- ✅ Enable safe experimentation ("play")
- ✅ Guarantee long-term replayability
- ✅ Enforce Schillinger structural correctness

**This is additive and non-breaking.**

---

# PART I — Boundary System (Minimal v1)

**These boundaries do not generate music.**
**They regulate how music generation may change.**

---

## 1. Energy / Entropy Budget (v1)

**Intent:** Prevent over-variation and novelty saturation.

```typescript
type EnergyBudgetV1 = {
  max: number;
  available: number;
  cost: {
    transform: number;
    modulate: number;
  };
  recoverPerFrame: number;
};
```

### Rules

- ✅ Transformations consume energy
- ✅ If energy < cost → action is DEFERRED
- ✅ Silence + coherence restore energy

### Must

- Be deterministic
- Serialize with SidewalkState
- Explain "why nothing changed"

---

## 2. Structural Silence Regions (v1)

**Intent:** Silence as intentional structure.

```typescript
type SilenceRegionV1 = {
  startTick: number;
  endTick: number;
  scope: "local" | "section" | "global";
  protected: boolean;
};
```

### Rules

- ✅ Silence forces rest events
- ✅ Protected silence blocks PLAY / AI overrides
- ✅ Silence restores energy

---

## 3. Constraint Priority Resolution (v1)

**Fixed priority order:**

1. Determinism
2. Invariants
3. Phrase Grammar
4. Structural Modulation
5. Generator Preference
6. Play Requests

### Rules

- ✅ Higher priority always wins
- ✅ Conflicts emit explainability events

---

## 4. Explainability Mode Toggle (v1)

```typescript
sdk.setExplainability(true | false);
sdk.getExplainabilityBuffer(): ExplainabilityEvent[];
```

### Rules

- ✅ When off: zero overhead
- ✅ When on: logs structural decisions only
- ✅ Never affects output

---

## 5. Play-Surface Boundary (v1)

**Intent:** Define what is safe to poke.

```typescript
type PlaySurfaceV1 = {
  allowed: ParameterID[];
  mode: "strict" | "warn";
};
```

### Rules

- ✅ Non-allowlisted changes are rejected or logged
- ✅ Structural parameters are read-only

---

## 6. Temporal Authority Boundary (v1)

```typescript
type TemporalAuthorityV1 = {
  canScrub: boolean;
  canFork: boolean;
  canOverrideCausality: false;
};
```

### Rules

- ✅ External systems may request time movement
- ✅ Only realization layer advances time
- ✅ No rewriting realized past

---

## 7. Causality Boundary (v1)

**Hard rules:**

- ✅ No reading future frames
- ✅ No modifying realized past frames

**Violations throw explicit errors.**

---

## 8. Authority Gradient Boundary (v1)

```typescript
AuthorityLevel = "SYSTEM" | "STRUCTURE" | "GENERATOR" | "PLAY";
```

### Rules

- ✅ Lower authority may request, not override
- ✅ All overrides logged

---

## 9. Mutation Rate Boundary (v1)

```typescript
type MutationRateV1 = {
  maxPerSecond: number;
  maxPerPhrase: number;
};
```

### Rules

- ✅ Excess mutations defer deterministically
- ✅ Counters serialize with state

---

## 10. Observation vs Intervention Boundary (v1)

```typescript
AccessMode = "observe" | "intervene";
```

### Rules

- ✅ Observation is pure (no state change)
- ✅ Intervention must be explicit

---

## 11. Serialization Boundary (v1)

**Serializable scopes:**

- STATE
- STRUCTURE
- METADATA

### Rules

- ✅ EPHEMERA never serializes
- ✅ Serialized state must replay exactly

---

## 12. Explanation Boundary (v1)

```typescript
type ExplanationV1 = {
  atTick: number;
  cause: string;
  summary: string;
};
```

### Rules

- ✅ Structural causes only
- ✅ No implementation details
- ✅ Must survive refactors

---

# PART II — Safe Chaos Playground

**Goal:** Intentionally stress the system while proving it cannot break.

---

## A. Chaos Runner (Headless)

### Inputs

- `seed`
- `scenario.json`
- `boundary configuration`
- `duration`

### Actions

- Play patch floods
- Time scrubs
- Forks
- Silence insertion
- Energy starvation
- Constraint conflicts

### Outputs

- `frames.json`
- `state_final.json`
- `events.json`
- `assertions.json`

### Assertions

- ✅ Determinism holds
- ✅ Causality intact
- ✅ Forbidden actions blocked
- ✅ All blocks explained

---

## B. Chaos Scenarios (v1 set)

1. **Patch Flood**
2. **Forbidden Parameter Attack**
3. **Causality Attack**
4. **Silence Shield**
5. **Energy Starvation**
6. **Constraint Conflict Storm**
7. **Fork Divergence**

**Each scenario must:**

- Pass deterministically
- Produce identical results on rerun

---

## C. Chaos Playground UI (Optional, Flutter)

### Panels

- Policy controls (energy, mutation, explainability)
- Attack buttons
- Timeline visualization (DTOs)
- "Why" panel (explanations)

### UI may only call

- `applyPlayPatch`
- `requestScrub`
- `requestFork`
- `observe` queries

---

# PART III — CI Matrix Plan (Goldens + Chaos)

---

## Canonical Rule

**TypeScript is the source of truth.**

**All other SDKs must match TS outputs.**

---

## Test Layout

```
/tests/
  /golden/
  /chaos/
    /scenarios
    /expected
```

---

## CI Stages

1. **Build** (all languages)
2. **Golden generation** (TS only)
3. **Golden verification** (all languages)
4. **Chaos runner** (all languages)
5. **Determinism rerun diff**

---

## CI Matrix

| Language | Build | Goldens | Chaos | Rerun Diff |
|----------|-------|---------|-------|------------|
| TS       | ✅    | Generate | Run  | ✅         |
| Dart     | ✅    | Verify  | Run  | ✅         |
| Python   | ✅    | Verify  | Run  | ✅         |
| Swift    | ✅    | Verify  | Run  | ✅         |

---

## Failure Classification

- `GOLDEN_MISMATCH`
- `NON_DETERMINISTIC`
- `CAUSALITY_VIOLATION`
- `PRIORITY_BREACH`
- `SILENT_FAILURE`
- `SERIALIZATION_LEAK`

**Failures must be explicit and typed.**

---

## CI "Green" Definition

**CI passes only if:**

- ✅ TS goldens generate
- ✅ All languages match goldens
- ✅ All chaos scenarios pass
- ✅ Determinism holds on rerun
- ✅ No silent failures occur

---

# Final Statement to SDK Team

**If all items in this document are implemented:**

- ✅ The Schillinger SDK is sealed
- ✅ Experimentation is safe
- ✅ AI participation is bounded
- ✅ Replay is guaranteed
- ✅ Cross-language drift is impossible without detection

**No further architectural work is required.**

---

# Next Steps

Upon request, I can:

1. Convert this into Jira / Linear tickets
2. Generate GitHub Actions YAML
3. Write a developer README explaining why these rules exist (without theory overload)

**This is a very strong place to hand off.**
