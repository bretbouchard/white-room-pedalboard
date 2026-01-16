# Ensemble Model Separation - Implementation Plan

**Status:** Ready for Implementation
**Created:** 2025-01-08
**Priority:** High - Foundation for JUCE/Swift integration

---

## Current State Analysis

### What Exists Today

**Swift Frontend (SongModel):**
```swift
public struct SongModel {
  let roles: [Role]  // ← Already has stable IDs
  let sections: [Section]
  let patterns: [Pattern]
  // ...
}

public struct Role {
  let id: String        // ← Stable ID exists
  let name: String
  let kind: RoleKind
  let generatorConfig: GeneratorConfig
  let parameters: [ParameterID: ParameterMetadata]
}
```

**C++ Engine (SchillingerEngineCore):**
```cpp
// Types.hpp has:
enum class RoleKind : u8 { ... };
struct RoleConfig { ... };

// schillinger_ffi.h has:
typedef struct {
  char id[64];
  char name[64];
  sch_role_kind_t kind;
  // ...
} sch_role_t;
```

### What's Missing

❌ No `realizeSong()` function exists
❌ No `RealizedEnsembleModel_v1` type
❌ No separation between authored vs realized
❌ No stable ID preservation algorithm
❌ No derivation graph for reconciliation

---

## Implementation Strategy

### Phase 1: Add Realization Output (C++ SDK)

**Goal:** Emit realized ensemble from engine without breaking existing API

#### 1.1 Create RealizedEnsembleModel_v1 Type

**File:** `include/schillinger/RealizedEnsemble.hpp`

```cpp
namespace sch {

/// Stable identity for a single realized voice
struct RealizedVoice {
  std::string id;                    // Stable ID (persists across regen)
  MusicalFunction function;          // What this voice does musically
  VoiceSpec voiceSpec;               // Range, tessitura, characteristics
  OrchestrationSpec orchestration;   // Instrument assignment preferences
  EnsembleSource source;             // Traceability to authored song

  // For stable ID preservation
  std::string getFingerprint() const;
};

/// Complete realized ensemble with stable voice identities
struct RealizedEnsembleModel_v1 {
  std::vector<RealizedVoice> members;

  // Stable ID preservation helpers
  std::string generateStableID(const RealizedVoice& voice);
  bool preserveMatchingIDs(
    const RealizedEnsembleModel_v1& previous,
    std::function<bool(const RealizedVoice&, const RealizedVoice&)> comparator
  );
};

} // namespace sch
```

#### 1.2 Add EnsembleSource Traceability

**File:** `include/schillinger/EnsembleSource.hpp`

```cpp
namespace sch {

/// Traces a realized voice back to its authored origin
struct EnsembleSource {
  std::string authoredRoleID;     // Which Role in SchillingerSong_v1
  std::string sectionID;          // Which section (if section-specific)
  std::string patternID;          // Which pattern assignment
  std::string systemID;           // Which Schillinger system (rhythm/harmony)

  /// Derivation path from authored intent to realized voice
  std::vector<std::string> derivationPath;
};

} // namespace sch
```

#### 1.3 Update realizeSong() Contract

**File:** `src/RealizationEngine.cpp`

```cpp
struct RealizationOutput {
  SongModel_v1 songModel;
  RealizedEnsembleModel_v1 realizedEnsemble;  // NEW
  DerivationGraph_v1 derivation;
};

RealizationOutput realizeSong(
  const SchillingerSong_v1& song,
  RealizationParameters params
) {
  RealizationOutput output;

  // 1. Generate SongModel (existing)
  output.songModel = generateSongModel(song);

  // 2. Realize ensemble with stable IDs
  output.realizedEnsemble = realizeEnsemble(
    song.ensembleModel,
    output.songModel,
    previousEnsemble  // For ID preservation
  );

  // 3. Build derivation graph
  output.derivation = buildDerivationGraph(
    song,
    output.songModel,
    output.realizedEnsemble
  );

  return output;
}
```

#### 1.4 Implement Stable ID Preservation

**File:** `src/StableIDPreserver.cpp`

```cpp
RealizedEnsembleModel_v1 StableIDPreserver::preserveIDs(
  const RealizedEnsembleModel_v1& previous,
  const RealizedEnsembleModel_v1& current
) {
  RealizedEnsembleModel_v1 result = current;

  for (auto& newVoice : result.members) {
    // Find matching voice in previous ensemble
    for (const auto& oldVoice : previous.members) {
      if (isMusicallySame(oldVoice, newVoice)) {
        // Preserve stable ID
        newVoice.id = oldVoice.id;
        break;
      }
    }
  }

  return result;
}

bool StableIDPreserver::isMusicallySame(
  const RealizedVoice& a,
  const RealizedVoice& b
) {
  // Same musical function?
  if (a.function != b.function) return false;

  // Same authored role?
  if (a.source.authoredRoleID != b.source.authoredRoleID) return false;

  // Same pattern assignment?
  if (a.source.patternID != b.source.patternID) return false;

  // Similar voice spec (allow minor tweaks)
  return a.voiceSpec.fingerprint() == b.voiceSpec.fingerprint();
}
```

---

### Phase 2: FFI Bridge (C ABI)

**Goal:** Expose realized ensemble to Swift without breaking existing FFI

#### 2.1 Add FFI Types

**File:** `SchillingerEngineCore/ffi/include/schillinger_ffi.h`

```c
// ========== REALIZED ENSEMBLE (Phase 1: Ensemble Separation) ==========

/// Single realized voice with stable identity
typedef struct {
  char id[64];                      // Stable voice ID
  char function_name[64];           // Musical function
  char authored_role_id[64];        // Traceability to SchillingerSong_v1
  char pattern_id[64];              // Which pattern created this
  char section_id[64];              // Which section (empty if global)
  double range_low;                 // MIDI note range low
  double range_high;                // MIDI note range high
  double density;                   // Expected note density
  int32_t has_instrument;           // Whether instrument assigned
  char instrument_id[128];          // Assigned instrument ID
} sch_realized_voice_t;

/// Complete realized ensemble
typedef struct {
  sch_realized_voice_t* voices;     // Array of voices
  int32_t voice_count;              // Number of voices
} sch_realized_ensemble_t;

/// Get realized ensemble from engine
sch_result_t sch_engine_get_realized_ensemble(
  sch_engine_t* e,
  uint64_t song_id,
  sch_realized_ensemble_t* out_ensemble
);

/// Free realized ensemble memory
void sch_engine_free_realized_ensemble(sch_realized_ensemble_t* ensemble);
```

#### 2.2 Update FFI Implementation

**File:** `SchillingerEngineCore/src/schillinger_ffi.cpp`

```cpp
sch_result_t sch_engine_get_realized_ensemble(
  sch_engine_t* e,
  uint64_t song_id,
  sch_realized_ensemble_t* out_ensemble
) {
  if (!e || !out_ensemble) return SCH_ERR_INVALID_ARG;

  try {
    // Get realization output from engine
    auto output = engine->getRealization(song_id);
    const auto& realized = output.realizedEnsemble;

    // Allocate FFI struct array
    out_ensemble->voices = (sch_realized_voice_t*)malloc(
      sizeof(sch_realized_voice_t) * realized.members.size()
    );
    out_ensemble->voice_count = realized.members.size();

    // Copy each voice to FFI format
    for (size_t i = 0; i < realized.members.size(); ++i) {
      const auto& voice = realized.members[i];

      strncpy(out_ensemble->voices[i].id, voice.id.c_str(), 64);
      strncpy(out_ensemble->voices[i].function_name,
              voice.function.name.c_str(), 64);
      strncpy(out_ensemble->voices[i].authored_role_id,
              voice.source.authoredRoleID.c_str(), 64);
      // ... copy remaining fields
    }

    return SCH_OK;

  } catch (const std::exception& ex) {
    return SCH_ERR_INTERNAL;
  }
}

void sch_engine_free_realized_ensemble(
  sch_realized_ensemble_t* ensemble
) {
  if (ensemble && ensemble->voices) {
    free(ensemble->voices);
    ensemble->voices = nullptr;
    ensemble->voice_count = 0;
  }
}
```

---

### Phase 3: Swift SDK Layer

**Goal:** Provide Swift API for realized ensemble

#### 3.1 Add Swift Types

**File:** `SwiftFrontendCore/Models/RealizedEnsemble.swift`

```swift
/// Stable identity for a single realized voice
public struct RealizedVoice: Identifiable, Codable, Sendable {
  public let id: String                    // Stable ID
  public let functionName: String          // Musical function
  public let authoredRoleID: String        // Traceability
  public let patternID: String             // Source pattern
  public let sectionID: String?            // Section (nil if global)
  public let range: ClosedRange<Double>    // MIDI note range
  public let density: Double               // Expected density
  public let instrumentID: String?         // Assigned instrument

  public init(
    id: String,
    functionName: String,
    authoredRoleID: String,
    patternID: String,
    sectionID: String?,
    range: ClosedRange<Double>,
    density: Double,
    instrumentID: String?
  ) {
    self.id = id
    self.functionName = functionName
    self.authoredRoleID = authoredRoleID
    self.patternID = patternID
    self.sectionID = sectionID
    self.range = range
    self.density = density
    self.instrumentID = instrumentID
  }
}

/// Complete realized ensemble
public struct RealizedEnsemble: Codable, Sendable {
  public let voices: [RealizedVoice]

  public init(voices: [RealizedVoice]) {
    self.voices = voices
  }

  /// Find voice by stable ID
  public func voice(id: String) -> RealizedVoice? {
    return voices.first { $0.id == id }
  }

  /// Find voices for a specific role
  public func voices(forRole roleID: String) -> [RealizedVoice] {
    return voices.filter { $0.authoredRoleID == roleID }
  }
}
```

#### 3.2 Extend EngineClient Protocol

**File:** `SwiftFrontendCore/Integration/EngineClient.swift`

```swift
public protocol EngineClient {
  // Existing methods...

  /// Get realized ensemble for a song
  func getRealizedEnsemble(songID: String) async throws -> RealizedEnsemble

  /// Regenerate realization (preserves stable IDs)
  func regenerateRealization(songID: String) async throws -> RealizedEnsemble
}
```

#### 3.3 Implement in JUCEFFIBridge

**File:** `SwiftFrontendCore/FFI/JUCEFFIBridge.swift`

```swift
extension JUCEFFIBridge {

  public func getRealizedEnsemble(songID: String) async throws -> RealizedEnsemble {
    guard enginePtr != nil, state == .connected else {
      throw EngineError.notConnected
    }

    // Convert songID to uint64
    guard let songIDNum = UInt64(songID) else {
      throw EngineError.invalidOperation("Invalid song ID")
    }

    // Call FFI
    var ensemble = sch_realized_ensemble_t()
    let result = sch_engine_get_realized_ensemble(
      enginePtr,
      songIDNum,
      &ensemble
    )

    guard result == SCH_OK else {
      throw EngineError.internalError("Failed to get realized ensemble")
    }

    // Convert to Swift models
    defer {
      sch_engine_free_realized_ensemble(&ensemble)
    }

    let voices = (0..<ensemble.voice_count).map { i in
      let voice = ensemble.voices.advanced(by: i).pointee
      return RealizedVoice(
        id: String(cString: &voice.id.0),
        functionName: String(cString: &voice.function_name.0),
        authoredRoleID: String(cString: &voice.authored_role_id.0),
        patternID: String(cString: &voice.pattern_id.0),
        sectionID: voice.section_id[0] != 0 ? String(cString: &voice.section_id.0) : nil,
        range: voice.range_low...voice.range_high,
        density: voice.density,
        instrumentID: voice.has_instrument != 0 ? String(cString: &voice.instrument_id.0) : nil
      )
    }

    return RealizedEnsemble(voices: voices)
  }
}
```

---

### Phase 4: Update Instrument Bindings

**Goal:** Bind instruments to realized IDs instead of role IDs

#### 4.1 Update InstrumentStore

**File:** `SwiftFrontendCore/Stores/InstrumentStore.swift`

```swift
@MainActor
public final class InstrumentStore: ObservableObject {

  // OLD: Bind to role ID
  // @Published var roleInstrumentBindings: [RoleID: InstrumentID] = [:]

  // NEW: Bind to realized voice ID
  @Published var voiceInstrumentBindings: [VoiceID: InstrumentID] = [:]

  /// Assign instrument to a realized voice
  public func assignInstrument(_ instrumentID: InstrumentID, to voiceID: VoiceID) {
    voiceInstrumentBindings[voiceID] = instrumentID

    // Push to engine
    Task {
      try? await engineClient?.assignInstrument(instrumentID, toVoice: voiceID)
    }
  }

  /// Get assigned instrument for a voice
  public func instrument(for voiceID: VoiceID) -> InstrumentID? {
    return voiceInstrumentBindings[voiceID]
  }

  /// On regeneration, preserve bindings by matching voices
  public func reconcileBindings(
    old: RealizedEnsemble,
    new: RealizedEnsemble
  ) {
    var newBindings: [VoiceID: InstrumentID] = [:]

    for newVoice in new.voices {
      // Find matching old voice by musical identity
      if let matchingOldVoice = old.voices.first(where: { oldVoice in
        oldVoice.authoredRoleID == newVoice.authoredRoleID &&
        oldVoice.patternID == newVoice.patternID &&
        oldVoice.range == newVoice.range
      }) {
        // Preserve binding
        if let instrumentID = voiceInstrumentBindings[matchingOldVoice.id] {
          newBindings[newVoice.id] = instrumentID
        }
      }
    }

    voiceInstrumentBindings = newBindings
  }
}
```

#### 4.2 Update Instrument Picker UI

**File:** `SwiftFrontendCore/Components/InstrumentPicker.swift`

```swift
struct InstrumentPicker: View {
  let realizedVoice: RealizedVoice

  var body: some View {
    Picker("Instrument", selection: $selectedInstrument) {
      Text("None").tag(nil as String?)
      ForEach(instruments) { instrument in
        Text(instrument.name).tag(instrument.id as String?)
      }
    }
    .onChange(of: selectedInstrument) { _, newID in
      // Bind to realized voice ID, not role ID
      instrumentStore.assignInstrument(newID, to: realizedVoice.id)
    }
  }
}
```

---

### Phase 5: Testing & Validation

#### 5.1 Unit Tests

**Test:** `RealizedEnsembleTests.swift`

```swift
final class RealizedEnsembleTests: XCTestCase {

  func testStableIDPreservation() {
    // Create initial ensemble
    let voice1 = RealizedVoice(id: "voice-1", ...)
    let ensemble1 = RealizedEnsemble(voices: [voice1])

    // Regenerate (should preserve ID if musical identity unchanged)
    let voice2 = RealizedVoice(id: "voice-2", ...) // Same musical identity
    let ensemble2 = RealizedEnsemble(voices: [voice2])

    // Reconcile
    store.reconcileBindings(old: ensemble1, new: ensemble2)

    // Verify binding preserved
    XCTAssertEqual(store.instrument(for: "voice-2"), "piano")
  }

  func testTraceability() {
    let voice = RealizedVoice(
      id: "voice-1",
      authoredRoleID: "bass-role",
      patternID: "3:2-polyrhythm",
      sectionID: "verse-1",
      ...
    )

    // Verify can trace back to authored song
    XCTAssertEqual(voice.authoredRoleID, "bass-role")
    XCTAssertEqual(voice.patternID, "3:2-polyrhythm")
  }
}
```

#### 5.2 Integration Tests

**Test:** `EnseMbleIntegrationTests.swift`

```swift
final class EnsembleIntegrationTests: XCTestCase {

  func testRoundTripRegeneration() async throws {
    // Load song
    let song = try loadTestSong()

    // Realize ensemble
    let ensemble1 = try await engine.getRealizedEnsemble(songID: song.id)

    // Bind instrument
    store.assignInstrument("piano", to: ensemble1.voices[0].id)

    // Regenerate
    let ensemble2 = try await engine.regenerateRealization(songID: song.id)

    // Verify binding preserved
    let binding = store.instrument(for: ensemble2.voices[0].id)
    XCTAssertEqual(binding, "piano")
  }
}
```

---

## Migration Path

### Step 1: Backend First (Week 1)
- ✅ Add C++ types (RealizedVoice, EnsembleSource)
- ✅ Implement realizeSong() with realized ensemble
- ✅ Add stable ID preservation algorithm
- ✅ Unit tests for ID preservation

### Step 2: FFI Bridge (Week 1-2)
- ✅ Add FFI types to schillinger_ffi.h
- ✅ Implement FFI functions
- ✅ Test FFI with C++ unit tests

### Step 3: Swift SDK (Week 2)
- ✅ Add Swift models
- ✅ Extend EngineClient protocol
- ✅ Implement in JUCEFFIBridge
- ✅ Swift unit tests

### Step 4: Update Bindings (Week 2-3)
- ✅ Update InstrumentStore
- ✅ Update UI components
- ✅ Integration tests
- ✅ Manual testing with JUCE backend

### Step 5: Documentation & Handoff (Week 3)
- ✅ Update API docs
- ✅ Create migration guide
- ✅ Team training on new pattern

---

## Success Criteria

### Must Have
- ✅ `realizeSong()` emits `RealizedEnsembleModel_v1`
- ✅ Each voice has stable ID
- ✅ IDs survive regeneration when musical identity unchanged
- ✅ Instruments bind to realized IDs, not role IDs
- ✅ FFI bridge exposes realized ensemble to Swift
- ✅ Unit tests for ID preservation pass

### Should Have
- ✅ EnsembleSource provides traceability
- ✅ Derivation graph explains changes
- ✅ Reconciliation UI shows "what changed and why"
- ✅ Performance: < 100ms for ensemble realization
- ✅ Memory: No leaks in FFI bridge

### Nice to Have
- ⏸️ Visual diff of ensemble changes
- ⏸️ Auto-merge of manual instrument edits on regen
- ⏸️ Ensemble presets (save/load realized configs)

---

## Risks & Mitigations

### Risk 1: ID Collision
**Risk:** Two different voices get same ID
**Mitigation:** Use UUID + namespace (role + pattern + section)

### Risk 2: Binding Thrash
**Risk:** Instruments unbound on every regen
**Mitigation:** Strict musical identity comparison, preserve IDs liberally

### Risk 3: Performance
**Risk:** Realization is slow (>1 second)
**Mitigation:** Cache ensemble, lazy load, incremental updates

### Risk 4: Memory Leaks
**Risk:** FFI bridge leaks ensemble memory
**Mitigation:** RAII wrappers, defer cleanup, Valgrind testing

---

## Open Questions

1. **Q:** Should realized voices be persisted to song files?
   **A:** No - only authored ensemble goes to disk. Realized is always recomputed.

2. **Q:** What if user manually edits voice range after initial binding?
   **A:** Manual edits create "pinned" voices that don't participate in auto-regen.

3. **Q:** How do we handle ensemble changes during playback?
   **A:** Defer ensemble changes to loop boundary (existing behavior).

---

## Next Steps

1. **Review this plan** with SDK and Swift teams
2. **Create tracking issues** for each phase
3. **Set up branch** for implementation
4. **Start with Phase 1** (C++ types)
5. **Weekly sync** on progress

---

**Questions? Contact @bretbouchard**
