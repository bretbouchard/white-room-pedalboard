# Architecture Authority & Boundaries

**Status**: Effective 2025-12-31 (tvOS Branch)
**Authority**: TypeScript Core SDK

---

## Executive Summary

The Schillinger SDK v2.1 has a **single authoritative implementation**: TypeScript.

All other languages and frameworks are **consumers, not implementers** of the SDK.

### Key Principle

> **TypeScript plans. JUCE renders. Swift hosts.**
>
> **Only TypeScript decides music.**

---

## Authority Hierarchy (Locked)

```
┌─────────────────────────────────────────────────────┐
│  TypeScript SDK (authoritative)                     │
│  - All IR definitions                               │
│  - All generator logic                              │
│  - All planning & adaptation                        │
│  - All explainability                               │
└─────────────────────────────────────────────────────┘
                         │
                         │ IR emission (deterministic)
                         ▼
┌─────────────────────────────────────────────────────┐
│  JUCE Execution Engine (audio only)                 │
│  - Consumes PatternIR / ControlIR / InstrumentIR    │
│  - Schedules events                                 │
│  - Renders audio                                    │
│  - Hosts plugins                                    │
│  ❌ NO rhythm/harmony/melody APIs                   │
│  ❌ NO decision-making                              │
└─────────────────────────────────────────────────────┘
                         │
                         │ Swift bridge layer
                         ▼
┌─────────────────────────────────────────────────────┐
│  Swift/tvOS (host & controller)                     │
│  - Loads JS bundle                                  │
│  - Passes IR in/out                                 │
│  - Manages UI + lifecycle                           │
│  - Feeds IR to JUCE                                 │
│  ❌ NO generation logic                             │
│  ❌ NO network/auth (tvOS builds)                   │
└─────────────────────────────────────────────────────┘
```

---

## Package Authority Matrix

| Package | Role | Authority | Notes |
|---------|------|-----------|-------|
| `@schillinger-sdk/shared` | Types & utilities | ✅ Authoritative | Shared across all consumers |
| `@schillinger-sdk/core` | Main SDK | ✅ Authoritative | Sole decision-maker |
| `packages/juce-execution` | Audio rendering | ⚠️ Execution-only | Consumes IR, never creates |
| `packages/swift` | Host/bridge | ⚠️ Consumer-only | tvOS: UI + lifecycle only |
| `packages/python` | Optional bindings | ⚠️ Consumer-only | Future, not yet implemented |
| `packages/dart` | Mobile bindings | ⚠️ Consumer-only | Separate implementation track |

---

## Strict Boundaries

### TypeScript SDK (Authoritative)

**CAN:**
- ✅ Define all IR types
- ✅ Implement all generators
- ✅ Plan and adapt music
- ✅ Arbitrate between intents
- ✅ Explain decisions
- ✅ Emit deterministic events

**CANNOT:**
- ❌ Synthesize audio directly (delegates to JUCE)
- ❌ Access hardware audio devices (delegates to JUCE)
- ❌ Manage plugin UI (delegates to JUCE)

### JUCE Execution Engine (Consumer)

**CAN:**
- ✅ Consume PatternIR / ControlIR / InstrumentIR
- ✅ Schedule events from TimelineIR
- ✅ Render audio
- ✅ Host VST/AU plugins
- ✅ Manage audio hardware

**CANNOT:**
- ❌ Decide what music to play (TS decides)
- ❌ Expose rhythm/harmony/melody APIs
- ❌ Modify IR (only consume)
- ❌ Make adaptive decisions

### Swift/tvOS (Host)

**CAN:**
- ✅ Load JavaScript bundle via JSCore
- ✅ Pass IR between TS and JUCE
- ✅ Manage UI and user input
- ✅ Handle tvOS lifecycle
- ✅ Control playback state

**CANNOT (tvOS builds):**
- ❌ Implement generation logic
- ❌ Make network calls
- ❌ Use authentication
- ❌ Use WebSockets
- ❌ Run background services

---

## tvOS-Specific Constraints

### Disabled Features (Local-Only)

On Apple TV, the following are **permanently disabled**:

- ❌ **Networking**: No REST, no WebSockets, no HTTP
- ❌ **Authentication**: No API keys, no user accounts
- ❌ **Collaboration**: No real-time multi-user
- ❌ **Gateway**: No backend communication
- ❌ **Rate Limiting**: Not applicable locally
- ❌ **Background Services**: tvOS lifecycle only

### Build-Time Exclusions

The `tvOS` build profile excludes:

```
packages/gateway/           # ❌ Excluded
packages/audio/             # ⚠️ Delegated to JUCE
src/realtime/              # ❌ No WebSocket collaboration
src/collaboration/         # ❌ No multi-user
```typescript
// NO network calls
// NO auth managers
// NO remote state sync
```

### Enabled Features (tvOS)

- ✅ **JSCore Embedding**: Full JS execution in Swift
- ✅ **IR Bridge**: Bidirectional IR passing
- ✅ **DeterministicEmitter**: Event streaming to JUCE
- ✅ **Local Caching**: In-memory only (no persistence to cloud)
- ✅ **Offline Mode**: Default and only mode

---

## Migration Path

### For Existing Code

**If you have code in `packages/juce-execution` that:**
- Exposes `RhythmAPI`, `HarmonyAPI`, etc. → **DELETE IT**
- Accepts IR and renders audio → **KEEP IT**
- Manages audio devices → **KEEP IT**

**If you have code in `packages/swift` that:**
- Mirrors TS SDK APIs → **DELETE IT** (use JSCore instead)
- Manages UI/lifecycle → **KEEP IT**
- Bridges to JUCE → **KEEP IT**
- Uses network/auth → **GATE IT** (disable on tvOS)

---

## Enforcement Mechanisms

### 1. Code Review Checklist

Before merging to `tvOS` branch:

- [ ] No generator APIs in JUCE package
- [ ] No network calls in Swift tvOS code
- [ ] All IR types defined in `@schillinger-sdk/shared`
- [ ] JUCE only consumes IR, never creates
- [ ] Swift only hosts UI and bridges IR

### 2. Build Configuration

The `tvOS` build profile has:

```typescript
// tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "exclude": [
    "packages/gateway/**",
    "src/realtime/**",
    "src/collaboration/**"
  ]
}
```

### 3. Runtime Guards

```swift
#if os(tvOS)
  // Compile-time error if network code is referenced
  #error("Networking disabled on tvOS")
#endif
```

---

## Testing Strategy

### TypeScript SDK Tests

- ✅ Full property-based testing
- ✅ Golden master tests for determinism
- ✅ Record/replay for JSCore execution
- ✅ IR serialization tests

### JUCE Execution Tests

- ✅ IR ingestion tests
- ✅ Event scheduling tests
- ✅ Audio rendering tests
- ✅ Plugin hosting tests
- ❌ NO generator logic tests (TS handles this)

### Swift/tvOS Tests

- ✅ JSCore loading tests
- ✅ IR bridge tests
- ✅ UI lifecycle tests
- ✅ Memory management tests
- ❌ NO network/auth tests (disabled on tvOS)

---

## FAQ

### Q: Why not implement generators in JUCE?

**A:** Determinism and authority. If JUCE can generate music independently, we lose:
- Single source of truth
- Deterministic replay
- Explainability chain
- Cross-platform consistency

### Q: Can Swift implement generators for tvOS?

**A:** No. Swift on tvOS is a **host only**. All music generation happens in TypeScript via JSCore.

### Q: What if we need platform-specific optimizations?

**A:** Implement them as **IR transformations** in TypeScript, not as separate generator logic. The IR is platform-agnostic; the execution is platform-specific.

### Q: Can we add networking back later?

**A:** Not in the `tvOS` branch. This branch is **local-only by design**. If you need networking, create a separate branch (e.g., `tvOS-cloud`).

---

## Success Metrics

The tvOS architecture is successful when:

1. ✅ All IR definitions live in `@schillinger-sdk/shared`
2. ✅ All generator logic lives in `@schillinger-sdk/core`
3. ✅ JUCE package has no rhythm/harmony/melody APIs
4. ✅ Swift tvOS code has no network calls
5. ✅ Record/replay tests pass deterministically
6. ✅ No "SDK" branding on JUCE or Swift packages

---

## References

- **Phase 6 Handoff**: Human-Machine Co-Performance
- **JUCE Execution Handoff**: Audio Rendering Only
- **tvOS Requirements**: Local-Only, JSCore Embedded

---

**Document Owner**: SDK Architecture Team
**Last Updated**: 2025-12-31
**Status**: APPROVED for tvOS branch
