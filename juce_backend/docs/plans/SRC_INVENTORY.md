# Source Code Inventory & Migration Plan

**Date:** December 30, 2025
**Branch:** `juce_backend_clean`
**Phase:** Phase 1 - Audit & Cleanup

---

## 📊 Executive Summary

Total directories analyzed: 71
Total files analyzed: 181+

**Key Findings:**
- ✅ **KEEP:** ~40% (DSP, FFI, core audio engine)
- 🟡 **REFACTOR:** ~30% (routing, effects, integration)
- 🔴 **REMOVE:** ~30% (UI code, Python, REST API, misc)

---

## 🗂️ Categorization by Destination

### ✅ Ship-Ready (Keep As-Is)

#### `src/dsp/` → Keep in Instruments (Move to individual instruments)
```
✅ KaneMarcoAetherDSP.cpp     → instruments/kane_marco/src/dsp/
✅ KaneMarcoAetherStringDSP.cpp
✅ KaneMarcoDSP.cpp
✅ LocalGalDSP.cpp             → instruments/LOCAL_GAL/src/dsp/
✅ NexSynthDSP.cpp             → instruments/Nex_synth/src/dsp/
✅ SamSamplerDSP.cpp           → instruments/Sam_sampler/src/dsp/
✅ SF2Reader.cpp
✅ SharedBridgeCoupling.cpp
✅ SympatheticStringBank.cpp
```
**Status:** Production-ready DSP, verified by APPLETV_TEAM_HANDOFF.md

#### `src/ffi/` → Keep in Instruments (Move to individual instruments)
```
✅ KaneMarcoFFI.cpp            → instruments/kane_marco/src/ffi/
✅ LocalGalFFI.cpp             → instruments/LOCAL_GAL/src/ffi/
✅ NexSynthFFI.cpp             → instruments/Nex_synth/src/ffi/
✅ SamSamplerFFI.cpp           → instruments/Sam_sampler/src/ffi/
✅ JuceFFI.cpp                 → Keep as shared FFI base
✅ JuceFFI.h
```
**Status:** C bridges for tvOS, production-ready

#### `src/audio/` → Move to `engine/` (Core DSP primitives)
```
✅ ADSREnvelope.cpp            → engine/audio/primitives/
✅ ADSREnvelope.h
✅ DiodeLadderFilter.cpp       → engine/audio/filters/
✅ DiodeLadderFilter.h
✅ Oscillator.cpp              → engine/audio/oscillators/
✅ Oscillator.h
✅ OscillatorProcessor.cpp     → engine/audio/oscillators/
✅ ComplexPitchDetector.cpp    → engine/audio/pitch/
✅ ComplexPitchDetector.h
✅ CPUMonitor.cpp              → engine/monitoring/
✅ DropoutPrevention.cpp       → engine/safety/
✅ RealtimeSafeDropoutPrevention.cpp
✅ MemorySafeAudioGraph.cpp    → engine/safety/
✅ MemorySafeAudioGraph.h
✅ OptimizedMemoryPool.h       → engine/memory/
✅ LockFreeMemoryPool.cpp      → engine/memory/
```
**Status:** Core DSP building blocks, keep and organize

---

### 🟡 Needs Refactor (Move to New Structure)

#### `src/routing/` → Move to `routing/`
```
🟡 AudioRoutingEngine.cpp     → routing/AudioRoutingEngine.cpp
🟡 AudioRoutingEngine.h       → routing/AudioRoutingEngine.h
🟡 MidiRoutingEngine.cpp      → routing/MidiRoutingEngine.cpp (NEW)
```
**Action:** Consolidate into routing/ folder, implement GraphBuilder per README

#### `src/dynamics/` → Move to `console/` or `effects/dynamics/`
```
🟡 DynamicsProcessor.cpp      → console/DynamicsProcessor.cpp (per-channel)
🟡 DynamicsEffectsChain.cpp   → effects/dynamics/DynamicsEffectsChain.cpp
🟡 FilterGate.cpp             → effects/dynamics/FilterGate.cpp
```
**Action:** Split into console DSP (per-track) and effects (shared)

#### `src/effects/` → Move to `effects/`
```
🟡 AirwindowsInternalProcessor.cpp  → effects/dynamics/AirwindowsInternalProcessor.cpp
🟡 InterchangeableEffectSlot.cpp    → effects/InterchangeableEffectSlot.cpp
```
**Action:** Categorize by effect type (dynamics, time, modulation, etc.)

#### `src/backend/` → Move to `engine/` and `integration/`
```
🟡 AudioEngine.cpp             → engine/AudioEngine.cpp (core graph)
🟡 AudioEngine.h
🟡 BackendMain.cpp             → integration/EngineMain.cpp (entry point)
🟡 WebSocketBridge.cpp         → integration/WebSocketBridge.cpp (SDK bridge)
🟡 WebSocketBridge.h
🟡 SecureWebSocketBridge.cpp   → integration/SecureWebSocketBridge.cpp
🟡 SecureWebSocketBridge.h
🟡 WebSocketSecurityManager.cpp → platform/tvos/WebSocketSecurityManager.cpp
🟡 WebSocketSecurityManager.h
```
**Action:** Split core engine from integration layer

#### `src/synthesis/` → Move to `instruments/` (Integration files)
```
🟡 LocalGalIntegration.cpp     → instruments/LOCAL_GAL/src/integration/
🟡 LocalGalIntegration.h
🟡 NexSynthIntegration.cpp     → instruments/Nex_synth/src/integration/
🟡 NexSynthIntegration.h
🟡 NexSynthEngine_Simple.cpp   → instruments/Nex_synth/src/engine/
🟡 NexSynthEngine_Simple.h
🟡 SamSamplerIntegration.cpp   → instruments/Sam_sampler/src/integration/
🟡 SamSamplerIntegration.h
🟡 NexAudioControlAPI.h        → instruments/Nex_synth/include/
🟡 NexParameterStreamAPI.cpp   → instruments/Nex_synth/src/parameters/
🟡 NexParameterStreamAPI.h
🟡 NexParameterSystem.h        → instruments/Nex_synth/include/
🟡 NexSchillingerBridge.h      → instruments/Nex_synth/include/
```
**Action:** Move integration files to respective instruments

#### `src/instrument/` → Move to `engine/instruments/`
```
🟡 InstrumentManager.cpp       → engine/instruments/InstrumentManager.cpp
🟡 InstrumentManager.h
🟡 InstrumentInstance.cpp      → engine/instruments/InstrumentInstance.cpp
🟡 InstrumentInstance.h
🟡 CustomInstrumentBase.h      → engine/instruments/CustomInstrumentBase.h
🟡 PluginManager.cpp           → engine/instruments/PluginManager.cpp (or REMOVE if no plugin hosting)
🟡 PluginManager.h
```
**Action:** Refactor to InstrumentDSP interface per handoff

#### `src/airwindows/` → Move to `effects/dynamics/` (or REMOVE)
```
🟡 AirwindowsInventory.cpp     → effects/dynamics/AirwindowsInventory.cpp
🟡 Density.cpp                 → effects/dynamics/Density.cpp
🟡 DynamicAlgorithmSmartControlAdapter.cpp
🟡 DynamicAlgorithmSystem.cpp
```
**Action:** Decide if Airwindows effects are needed for tvOS (probably not)

---

### 🔴 Remove (Not Part of JUCE Backend)

#### `src/ui/` → REMOVE (65+ files)
```
❌ src/ui/                      → DELETE or move to separate UI project
   ├── AdvancedComponents/      → Flutter/Dart UI code
   ├── PluginBrowser/          → Flutter/Dart UI code
   ├── PluginBrowser/          → Flutter/Dart UI code
   ├── plugins/                → Flutter/Dart UI code
   ├── synthesis/              → Flutter/Dart UI code
   └── [All UI .cpp/.h files]  → DELETE
```
**Reason:** UI code violates "Pure DSP" principle. UI should be in Flutter/Dart SDK.
**Action:** Archive or delete entirely.

#### `src/audio_agent/` → REMOVE (Python backend)
```
❌ src/audio_agent/             → DELETE (Python backend, separate project)
```
**Reason:** Python agent system, not part of C++ JUCE backend
**Action:** Move to separate repository or delete

#### `src/daid/` → REMOVE (Build artifacts)
```
❌ src/daid/                    → DELETE (CMake build artifacts)
```
**Reason:** CMake build output, not source code
**Action:** Delete (add to .gitignore)

#### `src/daid_core/` → REMOVE (Symlink)
```
❌ src/daid_core/               → DELETE (symlink to external repo)
```
**Reason:** Symlink to daid-core submodule
**Action:** Delete (use submodule directly)

#### `src/rest/` → REMOVE (REST API, not audio backend)
```
❌ src/rest/                    → DELETE or move to separate server project
   ├── RestApiServer.cpp
   ├── RestApiServer.h
   ├── DatabaseSecurity.cpp
   ├── RequestValidator.cpp
   └── ...
```
**Reason:** REST API is not part of audio backend
**Action:** Move to separate server repository

#### `src/websocket/` → REVIEW (May belong in integration/)
```
⚠️ AnalysisWebSocketHandler.cpp  → integration/ or REMOVE
⚠️ InstrumentWebSocketAPI.cpp    → integration/ or REMOVE
```
**Reason:** WebSocket handlers may be needed for SDK bridge
**Action:** Review if needed for integration/ or can be removed

#### `src/schillinger/` → MOVE to SDK
```
⚠️ src/schillinger/             → Move to schillinger-sdk
```
**Reason:** Schillinger algorithms belong in SDK, not JUCE backend
**Action:** Move to SDK repository

#### `src/security/` → KEEP (or move to platform/)
```
✅ SafeBufferOperations.cpp     → platform/tvos/safety/ or KEEP
✅ SafeBufferOperations.h
```
**Reason:** Safety utilities are needed for tvOS
**Action:** Keep or move to platform layer

#### `src/performance/` → KEEP (or move to platform/)
```
✅ PerformanceValidator.cpp     → platform/tvos/monitoring/ or KEEP
```
**Reason:** Performance monitoring needed for tvOS
**Action:** Keep or move to platform layer

#### `src/analysis/` → MOVE to tools/
```
⚠️ src/analysis/                → tools/analysis/ or REMOVE
```
**Reason:** Analysis tools may be useful for development
**Action:** Move to tools/ or remove if not needed

#### `src/timeline/` → REMOVE (UI component)
```
❌ src/timeline/                → DELETE (UI code)
```
**Reason:** Timeline is UI component, not DSP
**Action:** Delete

#### `src/engine_process/` → REMOVE (Python script)
```
❌ src/engine_process/          → DELETE (Python, not C++)
```
**Reason:** Python script, not part of C++ backend
**Action:** Delete

#### `src/server/` → REMOVE (TypeScript)
```
❌ src/server/                  → DELETE (TypeScript server code)
```
**Reason:** TypeScript server code, not C++ audio
**Action:** Delete

---

## 📦 Migration Plan

### Phase 1A: Remove Non-Audio Code (Immediate)

**Actions:**
1. Delete `src/ui/` (entire folder, 65+ files)
2. Delete `src/audio_agent/` (Python backend)
3. Delete `src/rest/` (REST API)
4. Delete `src/timeline/` (UI)
5. Delete `src/server/` (TypeScript)
6. Delete `src/engine_process/` (Python)
7. Delete CMake build artifacts in `src/daid/`
8. Delete symlink `src/daid_core/`

**Space Savings:** ~5,000+ lines of non-audio code removed

---

### Phase 1B: Move Code to New Structure

**Step 1: Move DSP to instruments/**
```bash
# LocalGal
mv src/synthesis/LocalGalIntegration.* instruments/LOCAL_GAL/src/integration/

# NexSynth
mv src/dsp/NexSynthDSP.* instruments/Nex_synth/src/dsp/
mv src/ffi/NexSynthFFI.* instruments/Nex_synth/src/ffi/
mv src/synthesis/NexSynth*.* instruments/Nex_synth/src/integration/

# SamSampler
mv src/dsp/SamSamplerDSP.* instruments/Sam_sampler/src/dsp/
mv src/ffi/SamSamplerFFI.* instruments/Sam_sampler/src/ffi/
mv src/synthesis/SamSampler*.* instruments/Sam_sampler/src/integration/

# KaneMarco
mv src/dsp/KaneMarco*.* instruments/kane_marco/src/dsp/
mv src/ffi/KaneMarcoFFI.* instruments/kane_marco/src/ffi/
```

**Step 2: Move routing to routing/ (already exists, just consolidate)**
```bash
mv src/routing/AudioRoutingEngine.* routing/
mv src/routing/MidiRoutingEngine.* routing/
```

**Step 3: Move effects to effects/ (already exists, just consolidate)**
```bash
mkdir -p effects/dynamics effects/time effects/modulation
mv src/dynamics/DynamicsEffectsChain.* effects/dynamics/
mv src/dynamics/FilterGate.* effects/dynamics/
mv src/effects/* effects/
```

**Step 4: Move console DSP to console/**
```bash
mv src/dynamics/DynamicsProcessor.* console/
# Create ConsoleChannelDSP from DynamicsProcessor
```

**Step 5: Move audio engine to engine/**
```bash
mkdir -p engine/audio engine/instruments engine/safety engine/monitoring engine/memory
mv src/audio/ADSR* engine/audio/primitives/
mv src/audio/Diode* engine/audio/filters/
mv src/audio/Oscillator* engine/audio/oscillators/
mv src/audio/ComplexPitch* engine/audio/pitch/
mv src/audio/CPUMonitor* engine/monitoring/
mv src/audio/Dropout* engine/safety/
mv src/audio/MemorySafe* engine/safety/
mv src/audio/OptimizedMemoryPool.h engine/memory/
mv src/audio/LockFreeMemoryPool.cpp engine/memory/
mv src/backend/AudioEngine.* engine/
mv src/instrument/Instrument*.* engine/instruments/
```

**Step 6: Move integration to integration/**
```bash
mv src/backend/BackendMain.cpp integration/EngineMain.cpp
mv src/backend/WebSocket* integration/
mv src/websocket/InstrumentWebSocketAPI.* integration/ (if needed)
mv src/websocket/AnalysisWebSocketHandler.* integration/ (if needed)
```

**Step 7: Move platform-specific to platform/**
```bash
mkdir -p platform/tvos/safety platform/tvos/monitoring
mv src/security/SafeBufferOperations.* platform/tvos/safety/
mv src/performance/PerformanceValidator.cpp platform/tvos/monitoring/
mv src/backend/WebSocketSecurityManager.* platform/tvos/
```

**Step 8: Move Schillinger to SDK**
```bash
mv src/schillinger/* sdk/src/schillinger/
```

---

### Phase 1C: Create New Interfaces

**Files to Create:**
1. `include/dsp/InstrumentDSP.h` - Base interface for all instruments
2. `console/ConsoleChannelDSP.h` - Console channel strip interface
3. `console/ConsoleChannelDSP.cpp` - Implementation
4. `routing/GraphBuilder.h` - Build graph from SongModel
5. `routing/GraphBuilder.cpp` - Implementation
6. `routing/SendReturnManager.h` - Send/return management
7. `routing/SendReturnManager.cpp` - Implementation
8. `integration/SongModelAdapter.h` - SDK SongModel translation
9. `integration/SongModelAdapter.cpp` - Implementation
10. `integration/EventQueue.h` - Event scheduling
11. `integration/EventQueue.cpp` - Implementation

---

## 📊 Final Structure (After Migration)

```
juce_backend/
├── engine/                          ✅ Core audio engine
│   ├── AudioEngine.h/cpp           (from src/backend/AudioEngine)
│   ├── audio/                      (from src/audio/)
│   │   ├── primitives/             ADSR, etc.
│   │   ├── filters/                DiodeLadder, etc.
│   │   ├── oscillators/            Oscillator, etc.
│   │   └── pitch/                  PitchDetector, etc.
│   ├── instruments/                (from src/instrument/)
│   │   ├── InstrumentManager.h/cpp
│   │   ├── InstrumentInstance.h/cpp
│   │   └── CustomInstrumentBase.h
│   ├── safety/                     (from src/audio/)
│   │   ├── DropoutPrevention.cpp
│   │   ├── MemorySafeAudioGraph.h/cpp
│   │   └── RealtimeSafeDropoutPrevention.cpp
│   ├── monitoring/                 (from src/audio/)
│   │   └── CPUMonitor.cpp
│   └── memory/                     (from src/audio/)
│       └── LockFreeMemoryPool.cpp
│
├── instruments/                     ✅ All 5 instruments (already done)
│   ├── FilterGate/                 (submodule)
│   ├── LOCAL_GAL/                  (submodule)
│   ├── Nex_synth/                  (submodule)
│   ├── Sam_sampler/                (submodule)
│   ├── drummachine/                (submodule)
│   └── kane_marco/                 (internal)
│
├── console/                         ✅ NEW - Channel strip DSP
│   ├── README.md                   (done)
│   ├── ConsoleChannelDSP.h         (to create)
│   ├── ConsoleChannelDSP.cpp       (from src/dynamics/DynamicsProcessor)
│   └── ConsoleParams.h              (to create)
│
├── effects/                         ✅ NEW - Insert & send effects
│   ├── README.md                   (done)
│   ├── dynamics/                   (from src/dynamics/)
│   │   ├── DynamicsEffectsChain.cpp
│   │   └── FilterGate.cpp
│   ├── time/                       (to create)
│   ├── modulation/                 (to create)
│   └── distortion/                 (to create)
│
├── routing/                         ✅ NEW - Graph topology
│   ├── README.md                   (done)
│   ├── AudioRoutingEngine.h/cpp   (from src/routing/)
│   ├── MidiRoutingEngine.cpp       (from src/routing/)
│   ├── GraphBuilder.h              (to create)
│   ├── GraphBuilder.cpp            (to create)
│   ├── SendReturnManager.h         (to create)
│   └── SendReturnManager.cpp       (to create)
│
├── platform/                        ✅ NEW - Platform-specific
│   ├── README.md                   (to create - overview)
│   ├── tvos/                       (from src/security, src/performance)
│   │   ├── README.md               (done)
│   │   ├── safety/
│   │   │   └── SafeBufferOperations.cpp
│   │   ├── monitoring/
│   │   │   └── PerformanceValidator.cpp
│   │   └── WebSocketSecurityManager.h/cpp
│   └── macos/                      (to create - macOS extensions)
│       └── README.md               (done)
│
├── integration/                     ✅ NEW - SDK bridge
│   ├── README.md                   (done)
│   ├── EngineMain.cpp              (from src/backend/BackendMain)
│   ├── SongModelAdapter.h          (to create)
│   ├── SongModelAdapter.cpp        (to create)
│   ├── EventQueue.h                (to create)
│   ├── EventQueue.cpp              (to create)
│   ├── WebSocketBridge.h/cpp       (from src/backend/)
│   └── InstrumentWebSocketAPI.cpp  (from src/websocket/ if needed)
│
├── tests/                           ✅ Already exists
│   ├── ...existing tests...
│   └── golden/                     (to create - headless render tests)
│
└── tools/                           ✅ NEW - Development tools
    ├── render/                     (to create)
    └── analysis/                   (from src/analysis/)
```

---

## ✅ Acceptance Criteria

Phase 1 is complete when:
- [ ] All UI code removed from `src/ui/`
- [ ] All Python/non-C++ code removed
- [ ] All instrument DSP moved to `instruments/`
- [ ] All routing moved to `routing/`
- [ ] All effects categorized in `effects/`
- [ ] All audio engine code in `engine/`
- [ ] All platform code in `platform/`
- [ ] All integration code in `integration/`
- [ ] `src/` folder is empty or deleted
- [ ] Build still works after migration

---

## 📝 Notes

**Why This Cleanup is Necessary:**
1. **Compliance:** Handoff requires mandatory folder structure
2. **Clarity:** Mixing UI, Python, and C++ audio code is confusing
3. **Apple TV:** tvOS cannot have UI, plugins, or file I/O in backend
4. **Maintainability:** Clear boundaries between engine, instruments, effects, routing
5. **Scalability:** Easy to add new instruments, effects, or platform support

**Anti-Patterns Being Eliminated:**
- ❌ UI code in audio backend
- ❌ Python scripts in C++ project
- ❌ REST API in audio engine
- ❌ Instrument code mixed with engine code
- ❌ Platform conditionals in DSP
- ❌ Ad-hoc routing scattered across files

**New Architecture Principles:**
- ✅ Pure DSP in instruments/
- ✅ Routing logic centralized in routing/
- ✅ Platform-specifics isolated in platform/
- ✅ SDK integration isolated in integration/
- ✅ Console DSP extracted to console/
- ✅ Effects organized by category

---

**End of Inventory**

**Next Step:** Execute Phase 1A (remove non-audio code) → Phase 1B (move to new structure) → Phase 1C (create interfaces)
