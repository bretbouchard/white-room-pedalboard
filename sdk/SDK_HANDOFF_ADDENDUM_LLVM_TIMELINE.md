Schillinger SDK Team — Architecture Addendum

LLVM-Style Core + Global Transport + Multi-Song Graph

Status: Additive clarification
Impact: Low risk, high leverage
No existing deliverables are invalidated

---

## 0. Executive Summary (Read This First)

We are formalizing Schillinger as a compiler-style system.

- **SongModel + SongDiff = IR** (Intermediate Representation)
- **SDK = frontend** (semantic authority)
- **JUCE = backend** (execution)
- **Transport does not live in the SDK**
- **Multiple songs evaluate against one shared transport**

Your current work already aligns with this direction.
This addendum locks responsibility boundaries so the system scales cleanly.

---

## 1. Core Architectural Rule (Non-Negotiable)

**The SDK defines musical meaning.**
**It never defines when that meaning is executed.**

If SDK code needs to know "what bar are we on right now", that code is in the wrong layer.

---

## 2. What the SDK Owns (Authoritative)

The SDK is the semantic authority. It owns:

### 2.1 IR Definitions
- **SongModel** (immutable snapshot)
- **SongDiff** (atomic mutation units)

These are the only ways musical structure is represented or changed.

### 2.2 Validation & Legality
- Structural validity
- Constraint enforcement
- Interaction rule legality
- Determinism guarantees

Validation must be:
- **deterministic**
- **side-effect free**
- **callable by both Swift UI and JUCE backend**

### 2.3 Deterministic Schillinger Passes

All Schillinger logic is expressed as pure transforms:

```
Input Model + Diff + Seed → Output Model
```

Rules:
- No clocks
- No scheduling
- No mutable state
- Seeded stochasticity only

### 2.4 Explainability / Preview

SDK **may**:
- simulate diffs
- explain outcomes
- preview structural changes

SDK **must not**:
- assume audio timing
- reference playback position

---

## 3. New Required Concept: TimelineModel

We are adding explicit support for multiple songs sharing one transport.

This is **not** "multiple transports" or "DJ sync".
It is **one transport, many song graphs**.

### 3.1 TimelineModel (New IR Layer)

```
TimelineModel
├── transport
│   ├── tempoMap
│   ├── timeSignatureMap
│   └── loopRegions
├── songInstances[]
│   ├── instanceId
│   ├── songModel        // immutable snapshot
│   ├── entryBar
│   ├── phaseOffset
│   ├── gain
│   ├── state            // armed / muted / fading
│   └── interactionRules[]
```

**Rules**
- Transport is global and singular
- SongModels remain unchanged
- SongInstances do not own time
- No song-to-song direct mutation

### 3.2 TimelineDiff (New Diff Type)

Parallel to SongDiff, add:

```
TimelineDiff
├── addSongInstance
├── removeSongInstance
├── arm / disarm
├── setPhaseOffset
├── setGain
├── crossfade
├── setInteractionRule
```

**Rules:**
- Atomic
- Undoable
- Deterministic
- No implicit mutation

---

## 4. Evaluation Contract (Critical)

SDK must support pure evaluation of multiple songs against time:

```
TimelineModel + TimeSlice → EvaluatedEvents
```

Where:
- **TimeSlice** = symbolic bars/beats window
- **Output** = symbolic musical events
- No audio
- No scheduling
- No realtime assumptions

**This is the LLVM linker step of the system.**

---

## 5. Interaction Rules (SDK Responsibility)

Songs never talk to each other directly.

They interact through declared rules, such as:
- energy caps
- density budgets
- call/response windows
- motif sharing permissions

SDK must:
- define rule schema
- validate legality
- evaluate deterministically
- expose explainability hooks

**JUCE will execute results, not reinterpret rules.**

---

## 6. What the SDK Must Explicitly Avoid

🚫 Owning transport
🚫 Tracking playback position
🚫 Scheduling events
🚫 Audio concepts (buffers, voices, latency)
🚫 Per-song clocks
🚫 Silent "fix-ups" of invalid models

**If SDK code asks "what is currently playing?", it is a violation.**

---

## 7. What Stays Exactly the Same

No changes required to:
- SongModel internal structure
- SongDiff semantics
- Deterministic Schillinger logic
- Validation rules
- Undo / redo mechanisms
- Explainability tooling

**This is an extension, not a rewrite.**

---

## 8. Repository Direction (High-Level)

We are converging toward:

```
schillinger/
├── core/        // semantic authority (IR + passes)
├── bindings/    // Swift / C / C++ bindings
├── sdk-swift/   // intent lowering, UX helpers
└── engine-juce/ // execution backend
```

**Core must have zero dependency on:**
- UI frameworks
- JUCE
- threading
- clocks
- audio

---

## 9. Determinism & Testing Expectations

SDK must support:
- Golden test vectors
- Identical inputs → identical outputs
- Cross-language parity (Swift ↔ C/C++)

Multi-song evaluation must be:
- reproducible
- rewindable
- explainable

---

## 10. One-Sentence Law (Put This in the SDK README)

**The SDK defines musical meaning across songs.**
**It never defines when that meaning is executed.**

---

## 11. Final Alignment Check

If all of the following are true, the SDK is correctly aligned:
- ✓ SongModel is immutable
- ✓ All edits are diffs
- ✓ Transport is external
- ✓ Multiple songs evaluate against one timeline
- ✓ No realtime assumptions exist
- ✓ JUCE consumes meaning, it does not invent it

---

## Implementation Roadmap

### Phase 1: Core Separation (Current)
- [x] Shared package: Pure types, validation, math (0 errors)
- [x] Begin separating transport-independent logic
- [ ] Fix remaining core package errors (283 remaining)

### Phase 2: TimelineModel Implementation
- [ ] Create TimelineModel IR in packages/core
- [ ] Create TimelineDiff types
- [ ] Implement pure evaluation: TimelineModel + TimeSlice → Events
- [ ] Add interaction rule schema

### Phase 3: Transport Extraction
- [ ] Remove all transport logic from SDK
- [ ] Ensure realtime.ts is pure (no clocks)
- [ ] Move event scheduling to JUCE layer

### Phase 4: Multi-Song Support
- [ ] Implement song instance management
- [ ] Add interaction rule evaluation
- [ ] Create golden test vectors for determinism

### Phase 5: Language Bindings
- [ ] Create C bindings for core IR
- [ ] Expose to Swift UI layer
- [ ] Expose to JUCE backend

---

## Success Metrics

**Technical:**
- All SDK tests pass with deterministic results
- No transport/clock dependencies in core package
- Multi-song evaluation is reproducible
- Cross-language parity (Swift ↔ C++)

**Architectural:**
- Clear boundary: SDK owns meaning, JUCE owns timing
- No invalid models can be constructed
- All operations are undoable
- Full explainability of all transformations

---

End of SDK Addendum
