# Architecture Authority Policy

## Purpose

This policy prevents "multiple brains" and keeps Schillinger deterministic, testable, and portable across platforms (tvOS, macOS, desktop, headless).

## Non-negotiable rule

There is exactly one authoritative implementation of Schillinger logic: the **TypeScript Core**.

If logic exists anywhere else, it must be:
- a consumer of TS outputs (IR / Plans), or
- a host for the TS runtime (JSCore on tvOS), or
- a generated artifact derived from TS (schemas/types only).

## Definitions

### "Schillinger logic"

Any code that:
- generates or transforms musical material (Pattern/Process/Variation)
- arbitrates intent (Intent/HumanIntent/System/AI)
- resolves constraints
- produces plan windows (lookahead planning)
- produces explainability chains
- guarantees determinism via seeding

### "Execution"

Any code that:
- renders audio (DSP)
- schedules events in sample time
- hosts plugins/instruments
- applies automation curves to parameters
- performs mixing, metering, analysis taps

### "Presentation/Control"

Any code that:
- displays state and explainability
- gathers user input (remote/gamepad/gestures)
- issues HumanIntent / edits
- manages navigation/UI state

## Layer responsibilities (locked)

### TypeScript Core (Authoritative)

**Must own:**
- IR schemas (canonical)
- intent arbitration
- constraints
- structure/form logic
- process chains
- plan generation (windowed lookahead)
- explainability emission
- determinism tests and golden fixtures

**Must NOT:**
- render audio
- host plugins
- depend on Node-only APIs for tvOS builds (fs/net/crypto/child_process)
- assume networking

### Execution Engines (JUCE / C++ etc.)

**Must own:**
- DSP/rendering
- sample-time scheduling
- plugin hosting
- automation playback
- audio stability and performance

**Must NOT:**
- contain Schillinger generators (RhythmAPI/MelodyAPI/HarmonyAPI/etc.)
- interpret or resolve musical intent
- perform constraint resolution
- plan in musical time
- spawn Node/Bun/Deno on tvOS
- expose network APIs on tvOS

### Hosts / Controllers (Swift/tvOS, SwiftUI, etc.)

**Must own:**
- JSCore hosting for the TS bundle (tvOS)
- UI, input, navigation
- bridging IR in/out
- logging, record/replay capture (optional)

**Must NOT:**
- implement Schillinger generation logic
- maintain a parallel "Swift SDK" that claims parity
- do network/auth/gateway for tvOS local-only builds

## Acceptable multi-language artifacts

✅ **Allowed outside TS:**
- IR type mirrors (Swift/C++ structs) generated from TS schemas
- Execution ingest APIs (PatternIR/ControlIR/InstrumentIR in)
- Serialization helpers (JSON <-> structs), no musical logic
- Performance context (buffer sizes, CPU class) used only for scheduling, not composition

❌ **Not allowed outside TS:**
- RhythmAPI/MelodyAPI/HarmonyAPI/CompositionAPI implementations
- intent arbitration or constraint resolution
- any code that changes musical outcomes from the same IR+seed

## Build profiles (must exist)

### TVOS_LOCAL_ONLY
- No networking
- No auth
- No gateway/websocket
- TS bundle runs in JSCore
- JUCE is execution-only, in-process

### DESKTOP_LOCAL
- Optional local service/IPC for TS (if desired)
- Networking optional, still not required

### REMOTE_SERVICE
- TS runs as a service
- Clients are thin; still only TS is authoritative

## Enforcement

1. **Repo structure must reflect authority** (see clean layout doc).

2. **CI rules:**
   - Lint/grep gates: forbid "RhythmAPI/MelodyAPI/HarmonyAPI/CompositionAPI" outside TS core
   - Forbid networking modules in tvOS build targets
   - Golden determinism tests must pass

3. **PR review rule:**
   - Any musical decision logic added outside TS core is rejected.

## One sentence to remember

**TS decides. Hosts control. Engines execute.**
