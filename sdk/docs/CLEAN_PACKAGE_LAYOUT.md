# Clean Package Layout

## Goals

- Make authority obvious by folder name alone
- Prevent accidental parallel SDKs
- Support tvOS local-only with JSCore
- Keep JUCE execution engine clean and portable

## Proposed top-level structure

```
/core                     # AUTHORITATIVE TS "brain"
  /ir                      # canonical IR schemas + validators (TS)
  /planning                # lookahead planning, windowed plan generation
  /arbitration             # intent/human/system/ai arbitration
  /process                 # Schillinger operations (resultant, interference, etc.)
  /structure               # structural/form logic (sections, hierarchy)
  /control                 # musical fields (density/tension/etc.)
  /explain                 # explainability emission + queries
  /tests
    /golden
    /property
    /replay

/runtimes
  /tvos-jsbundle            # build target: TS -> single JS bundle (no Node APIs)
  /node-local               # optional: TS runtime for desktop/local service (not tvOS)
  /shared                   # runtime-agnostic utilities (no Node-only deps)

/engines                   # EXECUTION only
  /juce-execution
    /include
    /src
    /tests
    README.md               # "Execution engine" wording only
  /other-engines...         # future

/hosts                     # PRESENTATION / CONTROL only
  /tvos-swift-host
    /SchillingerHost        # JSCore wrapper + IR bridging
    /UI                     # tvOS navigation + controls
    /Bridge                 # Swift <-> C++ (ObjC++ if needed)
    /Tests                  # JSCore parity tests, bridge tests
  /macos-host (optional)
  /cli-host  (optional)

/clients                   # OPTIONAL remote clients (not tvOS-local)
  /swift-remote-client      # talks to remote service (not authoritative)
  /dart-remote-client
  /python-remote-client

/tools                     # dev tools and codegen
  /codegen
    /ir-ts-to-swift         # generate Swift structs from TS IR
    /ir-ts-to-cpp           # generate C++ structs from TS IR
  /fixtures                 # recorded envelopes, sample IR, replay logs

/docs
  ARCHITECTURE_AUTHORITY_POLICY.md
  CLEAN_PACKAGE_LAYOUT.md
  TVOS_LOCAL_ONLY.md
  IR_VERSIONING.md
```

## Mapping from your current repo (migration guidance)

### Move / rename

- `packages/core` → `/core`
- `packages/shared/src/ir` → `/core/ir` (canonical)
- `packages/juce-cpp` or `packages/juce-execution` → `/engines/juce-execution`
- `packages/swift` → split:
  - tvOS host pieces → `/hosts/tvos-swift-host`
  - any remote client bits → `/clients/swift-remote-client`

### Deprecate (tvOS profile)

- `packages/gateway` → keep only under `/clients` or disable for TVOS_LOCAL_ONLY
- any NetworkManager/AuthManager in engine/host layers

## Naming rules (enforced)

- Only `/core` may use the words:
  - RhythmAPI, MelodyAPI, HarmonyAPI, CompositionAPI
  - Arbitration, ConstraintResolver, PlanGenerator

- `/engines/*` must use execution names:
  - ExecutionEngine, Scheduler, Renderer, PluginHost, AutomationPlayer

- `/hosts/*` must use host/control names:
  - Host, Bridge, Controller, UI, Input

## tvOS local-only checklist (layout implications)

For TVOS_LOCAL_ONLY:
- `/core` builds to `/runtimes/tvos-jsbundle/SchillingerSDK.bundle.js`
- `/hosts/tvos-swift-host` embeds the JS bundle via JSCore
- `/engines/juce-execution` is linked in-process
- No `/clients/*` or networking code compiled into tvOS target

## Minimal repo outcome (what "done" looks like)

If a new engineer opens the repo and asks:

**"Where does the music logic live?"**

The answer must be obvious:
- `/core` only.

If they ask:

**"Where does audio happen?"**

- `/engines/juce-execution`.

If they ask:

**"Where is Apple TV code?"**

- `/hosts/tvos-swift-host`.
