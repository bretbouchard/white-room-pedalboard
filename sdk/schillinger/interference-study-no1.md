# Interference Study No. 1 - Canonical Demo Piece

**Status:** Specification Complete
**Length:** 64 bars (3-4 minutes at 130 BPM)
**Purpose:** Prove Schillinger completeness through structural necessity

## Core Principle

**If you remove any one Schillinger subsystem, the piece audibly collapses.**

No automation lanes. No manual toggles. All change driven by:
- Structural tension
- Phrase boundaries
- Section transitions

## Global Constants

```
Tempo: 130 BPM
Time: 4/4
Phrase length: 4 bars
Section length: 16 bars
Total: 64 bars
Seed: Fixed (deterministic)
```

## Track Roles

| Track  | Role                  | Schillinger Function            |
|--------|-----------------------|---------------------------------|
| Kick   | Temporal anchor       | Never drills, provides stability |
| Snare  | Structural stress     | Carries accents, fills          |
| Hats   | Phase motion          | Drifts, resets at phrases       |
| Perc   | Resultant interference | Prime grids, density            |
| Bass   | Stability anchor      | Stable during rhythmic chaos     |
| Pad    | Harmonic field        | Motion counter to rhythm         |

## Form Structure

```
A   Bars 1-16    Stability
B   Bars 17-32   Interference
C   Bars 33-48   Collapse
A'  Bars 49-64  Resolution
```

## Section A: Stability (Bars 1-16)

**Purpose:** Prove system can sound calm

### Behavior

| Bars | Behavior                           | Tension Constraints               |
|------|------------------------------------|-----------------------------------|
| 1-4  | Groove only, no drill, no gate    | tension.total < 0.25              |
| 5-8  | Light fills at bar 8 only         | drillAmount ≤ 0.2                 |
| 9-12 | Same as 1-4                        | tension.total < 0.25              |
| 13-16| Fill at bar 16 (low intensity)    | drillAmount ≤ 0.3, gate = false  |

### Validation

- ❌ If this sounds chaotic → system broken
- ✅ Should feel stable, predictable, calm
- ✅ Low rhythmic tension, clear harmony

## Section B: Interference (Bars 17-32)

**Purpose:** Prove resultants + phase + orthogonal motion

### Behavior

| Bars | Behavior                              | Tension Constraints                      |
|------|---------------------------------------|-----------------------------------------|
| 17-20| Drill fills at phrase ends            | drillAmount: 0.3 → 0.5                 |
| 21-24| Prime grids enabled                   | Resultants: [3,2], [5,3], [7,2]        |
| 25-28| Hat phase drift enabled               | phaseOffset: 0 → +0.2 (over 4 bars)    |
| 29-32| Drill fills intensify                 | drillAmount: 0.5 → 0.7                 |

### Critical Schillinger Features

1. **Resultants as Generators**
   - Prime grids create interference patterns
   - Resultant density contributes to tension.rhythmic

2. **Phase Drift as Motion**
   - Hats drift away from grid (not random jitter)
   - Phase reset at bar 32 (phrase boundary)
   - Phase writes to tension.rhythmic

3. **Orthogonal Counter-Motion**
   - Rhythmic tension ↑ (drill, phase)
   - Harmonic motion ↓ (slower changes)
   - Prevents "everything escalates"

### Validation

- ❌ Turning off resultants → Section B loses forward motion
- ❌ Turning off phase drift → Hats feel stiff, mechanical
- ❌ Turning off counter-motion → Feels overwhelming, no clarity
- ✅ Should feel complex but intelligible

## Section C: Collapse (Bars 33-48)

**Purpose:** Prove silence is structural, not absence

### Behavior

| Bars | Behavior                              | Tension Constraints                      |
|------|---------------------------------------|-----------------------------------------|
| 33-36| Silence gating begins                 | gate: true, tension.rhythmic → 0.8      |
| 37-40| Silence → burst replacement           | drill bursts: 0.9, gate: true           |
| 41-44| Max drill + gate                      | tension.total ≥ 0.85                     |
| 45-48| Peak tension, no new escalation       | tension at maximum, holding pattern     |

### Critical Schillinger Features

1. **Silence Increases Tension**
   - gate: true → tension.rhythmic = 0.8 (not 0!)
   - Silence creates expectation pressure
   - Compensatory density required later

2. **Burst Replacement**
   - Silence triggers drill bursts (0.9)
   - Burst > Silence tension (0.95 > 0.8)
   - Creates collapse effect

3. **Bass Stability**
   - Kick never drills
   - Bass remains stable during chaos
   - Prevents total disintegration

### Validation

- ❌ Turning off gate → No perceived collapse
- ❌ Turning off bursts → Section C dies, doesn't collapse
- ❌ Bass drilling → Piece loses grounding
- ✅ Should feel like structural breakdown

## Section A': Resolution (Bars 49-64)

**Purpose:** Prove system resolves itself automatically

### Behavior

| Bars | Behavior                              | Tension Constraints                      |
|------|---------------------------------------|-----------------------------------------|
| 49-52| Gate disabled automatically           | gate: false (tension logic)             |
| 53-56| Drill disabled automatically          | drillAmount: 0 (tension logic)          |
| 57-60| Groove restored                       | tension.total → < 0.3                   |
| 61-64| Final cadence                         | All tensions low, resolution complete   |

### Critical Schillinger Features

1. **Automatic Resolution (No Manual Input)**
   - Tension threshold triggers resolution
   - if tension.total > 0.8 → disable drill, gate
   - System responds, doesn't just escalate

2. **Resolution Strategies**
   - Return to groove (rhythmic release)
   - Thinning texture (density reduction)
   - Final cadence (formal resolution)

3. **Tension Memory**
   - System remembers peak at bar 44-48
   - Resolution proportional to peak
   - Avoids repeating identical climaxes

### Validation

- ❌ Manual toggles required → Not Schillinger-compliant
- ❌ Endless chaos → Resolution logic broken
- ❌ No resolution → Missing tension response
- ✅ Should feel inevitable, not forced

## Hard Constraints (Non-Negotiable)

### Forbidden

- ❌ Automation lanes
- ❌ Manual parameter changes mid-render
- ❌ Randomize buttons
- ❌ "Good enough" approximations

### Required

- ✅ All change driven by tension
- ✅ All tension changes have musical causes
- ✅ Phrase boundaries trigger events
- ✅ Resolution is automatic
- ✅ Silence is structural

## Validation Checklist

The demo is **valid** only if:

1. **Structural Necessity**
   - [ ] Removing drill breaks Section C
   - [ ] Removing silence gating removes collapse
   - [ ] Removing phase logic makes hats feel mechanical
   - [ ] Removing phrase boundaries makes fills feel random
   - [ ] Removing resolution causes endless chaos

2. **Tension Compliance**
   - [ ] Section A: tension < 0.3
   - [ ] Section B: tension rises 0.3 → 0.7
   - [ ] Section C: tension ≥ 0.85
   - [ ] Section A': tension → < 0.3
   - [ ] Resolution automatic (no user input)

3. **Schillinger Correctness**
   - [ ] Silence increases tension (not decreases)
   - [ ] Phase drift is motion (not jitter)
   - [ ] Resultants generate (not just analyze)
   - [ ] Harmony opposes rhythm at peak
   - [ ] Resolution responds to tension

## Implementation Status

### Phase A: CI Enforcement ✅

- ✅ StructuralTension module
- ✅ TensionAccumulator service
- ✅ 44 CI tests passing
- ✅ Completeness manifest

### Phase B: Demo Implementation (Pending)

- [ ] Render actual audio with these parameters
- [ ] Validate each section meets constraints
- [ ] Verify structural necessity (A/B testing)
- [ ] Create listening test suite

### Phase C: Validation Tests (Pending)

- [ ] Automated validation of tension curves
- [ ] Removal testing (remove subsystem, verify collapse)
- [ ] Comparison tests (with vs without Schillinger features)
- [ ] Human validation (blind listening tests)

## Success Metrics

### Technical

- [ ] All CI tests pass
- [ ] Demo renders without errors
- [ ] Tension curves match specification
- [ ] No manual intervention required

### Musical

- [ ] Section A sounds stable
- [ ] Section B sounds complex but intelligible
- [ ] Section C sounds like collapse
- [ ] Section A' sounds inevitable (not forced)

### Schillinger

- [ ] Each subsystem is structurally necessary
- [ ] Removal causes audible failure
- [ ] No "showcase fluff" - only required systems
- [ ] Explains itself via tension history

## Next Steps

1. **Implement Demo Renderer**
   - Create generator that follows bar-by-bar spec
   - Wire all tension writes to actual musical parameters
   - Export to audio format for validation

2. **Create Validation Tests**
   - Automated tension curve verification
   - Removal testing infrastructure
   - Comparison test framework

3. **Human Validation**
   - Blind listening tests
   - A/B comparisons (with/without subsystems)
   - Expert review (Schillinger-knowledgeable musicians)

## References

- Schillinger Completeness Manifest: `schillinger/completeness.json`
- CI Tests: `tests/schillinger/`
- Tension System: `src/structure/`

---

**This is not a showcase. This is proof.**

If Interference Study No. 1 works, the Schillinger SDK is complete.
If it fails, we know exactly what's missing.
