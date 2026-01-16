# Ensemble Model Separation - Authored vs Realized

**Status:** Proposed Feature Addition
**Date:** 2025-01-08
**Priority:** High - prevents architectural pollution

## Overview

Separate ensemble model into two distinct layers:
1. **Authored Ensemble** - User intent in SchillingerSong_v1
2. **Realized Ensemble** - Derived execution identity from realizeSong()

## Why This Matters

The thing inside SchillingerSong_v1 is **user-authored intent** ("what ensemble do I want?"). The thing we need for instruments and JUCE routing is **derived execution identity** ("what voices actually exist right now, with stable IDs, sources, range, density, etc.").

If you merge them, you'll:
- ❌ Pollute the authored song with runtime artifacts
- ❌ Create churn on regen
- ❌ Make round-trip edits brittle

Keeping them separate gives you:
- ✅ Stable bindings
- ✅ Deterministic diffs
- ✅ Clean reconciliation
- ✅ Small, sane song file

## Concrete Implementation

### Keep (Authored)

**SchillingerSong_v1.ensembleModel** (aka *AuthoredEnsembleModel*)

Contains:
- Desired roles/functions
- High-level orchestration preferences
- Optional "requested members" / hints
- **No stable IDs required**
- **No derived source references**

This is pure user intent - what they want, not how it's realized.

### Add (Derived Output)

**RealizedEnsembleModel_v1** (new type)

Emitted by `realizeSong()` as part of realization output.

Required shape:
```typescript
interface RealizedEnsembleModel_v1 {
  members: {
    id: string;              // Stable ID for binding
    function: MusicalFunction;
    voiceSpec: VoiceSpec;
    orchestration: OrchestrationSpec;
    source: EnsembleSource;  // Traceability to system IDs/sections
  }[];
}
```

Key properties:
- **Stable IDs** - Persist across regenerations when musical identity unchanged
- **Source references** - Trace back to authored song + derivation graph
- **Complete spec** - Everything needed for instrument binding

## Updated realizeSong() Contract

```typescript
realizeSong(song: SchillingerSong_v1): {
  songModel: SongModel_v1;
  realizedEnsemble: RealizedEnsembleModel_v1;  // NEW
  derivation: DerivationGraph_v1;
}
```

## Round-Trip Implications

### Instrument Bindings
- Live in host (DAW/JUCE) keyed by `realizedEnsemble.members[i].id`
- NOT stored in SchillingerSong_v1
- Survive regeneration via SDK's stable ID preservation

### Regeneration Behavior
```typescript
// On regen, SDK must preserve member IDs when "musical identity" is same
const oldMembers = realizedEnsemble.members;
const newMembers = realizeSong(song).realizedEnsemble.members;

// SDK reuses IDs when function/role/spec are materially the same
// This prevents thrashing of instrument bindings
```

### Reconciliation
- Uses `derivation` + `sources` to explain changes
- Clear separation between "what I asked for" vs "what I got"
- Can detect when ensemble changed but intent didn't (regen only)
- vs when intent changed (user edit)

## Naming Convention (Internal)

Use these names to avoid confusion:

- `SchillingerSong_v1.ensembleModel` → **AuthoredEnsembleModel**
- `realizeSong().realizedEnsemble` → **RealizedEnsembleModel**

You don't have to rename the field today, but use these names internally for clarity.

## Single Rule for the Team

> **Authored Ensemble expresses intent. Realized Ensemble expresses identity. Only realized IDs are bindable.**

## Benefits

### For Swift Frontend (tvOS)
- Stable voice IDs for JUCE/DSP routing
- Can bind instruments once and survive regen
- Clear separation between UI (authored) and engine (realized)

### For JUCE Backend
- Ensemble members have stable handles for audio routing
- No need to rebind instruments on every regen
- Clear contract: bind to realized IDs, never to authored

### For Round-Trip Editing
- Clean separation of concerns
- Deterministic diffs (authored vs realized)
- Reconciliation can explain "why did this voice change?"
- Song files stay small (no runtime artifacts)

### For SDK Implementation
- Clear responsibility boundary
- `realizeSong()` owns ID stability
- Authored layer never sees IDs
- Regeneration is deterministic and testable

## Migration Path

### Phase 1: Add Realized Output
1. Add `RealizedEnsembleModel_v1` type
2. Update `realizeSong()` return type
3. Populate stable IDs in realization (preserve on regen)

### Phase 2: Update Bindings
1. Move instrument bindings to use `realizedEnsemble.members[i].id`
2. Remove any bindings to authored ensemble
3. Test regeneration preserves bindings

### Phase 3: Reconciliation
1. Implement diff between authored vs realized
2. Add explanations via derivation graph
3. UI can show "you asked for X, realized as Y"

## Context

This decision is particularly important because:
- JUCE backend and Swift frontend are currently disconnected
- Ensemble binding will be critical when reconnecting them
- Getting this wrong creates permanent technical debt
- Right separation makes future integration trivial

## References

- Related to: SongModel vs SchillingerSong separation
- Related to: Derivation graph for provenance
- Related to: Round-trip editing architecture

---

**Note:** This document preserves architectural guidance from when JUCE and Swift frontend were disconnected. When reconnecting, reference this to ensure clean separation between authored intent and realized execution.
