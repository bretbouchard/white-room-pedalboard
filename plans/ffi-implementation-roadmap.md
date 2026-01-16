# FFI Bridge Implementation Roadmap

**Status:** Ready for Implementation
**Estimate:** 3-5 days
**Priority:** CRITICAL (blocking real audio)
**Dependencies:** None

---

## Quick Start

```bash
# 1. Review architecture
cat plans/ffi-bridge-architecture.md

# 2. Check current state
ls -la juce_backend/src/ffi/
ls -la swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Audio/

# 3. Create implementation branch
git checkout -b feature/ffi-bridge-implementation

# 4. Track work in bd
bd create "Implement FFI bridge layer (sch_engine_ffi.cpp)" --labels "ffi,critical,implementation"
```

---

## Phase Overview

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| 0 | 0.5d | Foundation | ✅ Already complete |
| 1 | 1d | Core Bridge | Basic Swift ↔ C++ communication |
| 2 | 1.5d | Song Loading | SchillingerSong serialization |
| 3 | 2d | Audio Control | Transport, MIDI, real-time audio |
| 4 | 2.5d | Performance Blend | Lock-free queues, atomic state |
| 5 | 3d | SongModel Binary | Realized notes binary format |
| 6 | 3.5d | Real-Time Callbacks | Event callbacks from audio thread |
| 7 | 4-5d | Polish & Testing | Production-ready, documented |

---

## Phase 1: Core Bridge (Day 1)

### Objective
Establish basic Swift ↔ C++ communication with proper error handling and memory management.

### Tasks

#### 1.1 Create Bridge Implementation File
**File:** `juce_backend/src/ffi/sch_engine_ffi.cpp`

```cpp
// Include headers
#include "sch_engine_ffi.h"
#include "sch_song_structs.hpp"
#include "sch_engine.hpp"  // Existing types
#include <juce_core/juce_core.h>

// Error translation helpers
namespace {
    sch_result_t translate_exception(const std::exception& e) {
        // Log error
        std::cerr << "FFI Exception: " << e.what() << std::endl;
        return SCH_ERR_INTERNAL;
    }
}

extern "C" {
    // Implement all functions from sch_engine_ffi.h
}
```

**Acceptance:** File compiles without errors

#### 1.2 Implement Engine Lifecycle
**Functions:**
- `sch_engine_create` ✅ (already done in sch_engine.mm)
- `sch_engine_destroy` ✅ (already done)
- `sch_engine_get_version`

```cpp
sch_result_t sch_engine_get_version(sch_string_t* out_version) {
    if (!out_version) return SCH_ERR_INVALID_ARG;

    try {
        const char* version = "White Room JUCE FFI 1.0.0";
        size_t len = std::strlen(version);

        out_version->data = static_cast<char*>(std::malloc(len + 1));
        std::strcpy(out_version->data, version);
        out_version->length = len;

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

**Acceptance:** Version returns correctly

#### 1.3 Implement Memory Management
**Functions:**
- `sch_free_string`
- `sch_free_string_array`

```cpp
void sch_free_string(sch_string_t* str) {
    if (str && str->data) {
        std::free(str->data);
        str->data = nullptr;
        str->length = 0;
    }
}

void sch_free_string_array(sch_string_array_t* array) {
    if (array && array->items) {
        for (size_t i = 0; i < array->count; ++i) {
            std::free(array->items[i]);
        }
        std::free(array->items);
        array->items = nullptr;
        array->count = 0;
    }
}
```

**Acceptance:** No memory leaks (verify with ASan)

#### 1.4 Update Swift JUCEEngine
**File:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Audio/JUCEEngine.swift`

**Changes:**
- Replace `NSLog` placeholders with real FFI calls
- Add error handling (throw `JUCEEngineError`)
- Test engine creation/destruction

```swift
class JUCEEngine: ObservableObject {
    private let ffi = SchillingerFFI()
    private var engineHandle: OpaquePointer?

    func initializeEngine() throws {
        engineHandle = try ffi.createEngine()
    }

    deinit {
        try? ffi.destroyEngine(engineHandle)
    }
}
```

**Acceptance:** Engine creates/destroys without crashes

### Testing

```swift
// Swift test
func testEngineLifecycle() throws {
    let engine = try JUCEEngine()
    let version = try engine.getFFIVersion()
    XCTAssertNotNil(version)
    // Should not crash
}
```

### Completion Criteria

- [ ] All functions compile without warnings
- [ ] Swift can create/destroy engine
- [ ] No memory leaks (Instruments/ASan)
- [ ] Version string returns correctly

---

## Phase 2: Song Loading (Day 1.5)

### Objective
Load SchillingerSong from Swift, serialize/deserialize JSON.

### Tasks

#### 2.1 Implement `sch_engine_load_song`

```cpp
sch_result_t sch_engine_load_song(
    sch_engine_handle engine,
    const char* json
) {
    if (!engine || !json) return SCH_ERR_INVALID_ARG;

    try {
        // Parse JSON using JUCE
        juce::var jsonVar;
        auto error = juce::JSON::parse(json, jsonVar);
        if (error.failed()) {
            return SCH_ERR_PARSE_FAILED;
        }

        // Validate against schema
        // TODO: Add JSON schema validation

        // Store in internal engine state
        auto* engineImpl = get_engine_internal(engine);
        engineImpl->loadSongFromJSON(jsonVar);

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

#### 2.2 Implement `sch_engine_get_song`

```cpp
sch_result_t sch_engine_get_song(
    sch_engine_handle engine,
    sch_string_t* out_json
) {
    if (!engine || !out_json) return SCH_ERR_INVALID_ARG;

    try {
        auto* engineImpl = get_engine_internal(engine);
        juce::DynamicObject::Ptr songObj = engineImpl->songToJSON();
        juce::String jsonString = juce::JSON::toString(songObj);

        // Allocate and copy
        out_json->data = static_cast<char*>(std::malloc(jsonString.length() + 1));
        std::strcpy(out_json->data, jsonString.toUTF8());
        out_json->length = jsonString.length();

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

#### 2.3 Add Swift SchillingerSong_v1 Struct

**File:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Models/SchillingerSong.swift`

```swift
struct SchillingerSong_v1: Codable {
    let schemaVersion: String
    let songId: String
    let globals: Globals
    // ... other fields

    struct Globals: Codable {
        let tempo: Double
        let timeSignature: [Int]
        let key: Int
    }
}
```

#### 2.4 Implement Swift JSON Parsing

```swift
extension JUCEEngine {
    func loadSong(_ song: SchillingerSong_v1) throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(song)
        let json = String(data: data, encoding: .utf8)!

        try ffi.loadSong(engineHandle, json: json)
    }

    func getSong() throws -> SchillingerSong_v1 {
        let json = try ffi.getSong(engineHandle)
        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()

        return try decoder.decode(SchillingerSong_v1.self, from: data)
    }
}
```

### Testing

```swift
func testSongRoundTrip() throws {
    let song = SchillingerSong_v1.minimal()

    // Load into engine
    try engine.loadSong(song)

    // Get back
    let restored = try engine.getSong()

    // Verify equality
    XCTAssertEqual(restored.songId, song.songId)
    XCTAssertEqual(restored.globals.tempo, song.globals.tempo)
}
```

### Completion Criteria

- [ ] Song loads without errors
- [ ] JSON parses correctly
- [ ] Round-trip preserves data
- [ ] No memory leaks

---

## Phase 3: Audio Control (Day 2)

### Objective
Start/stop audio, transport control, MIDI events.

### Tasks

#### 3.1 Integrate Existing Audio Functions

**Already implemented in `audio_only_bridge.mm`:**
- `sch_engine_audio_init` ✅
- `sch_engine_audio_start` ✅
- `sch_engine_audio_stop` ✅
- `sch_engine_send_note_on` ✅
- `sch_engine_send_note_off` ✅
- `sch_engine_all_notes_off` ✅

**Action:** Add these to `sch_engine_ffi.h` if not present

#### 3.2 Implement Transport Functions

```cpp
sch_result_t sch_engine_set_transport(
    sch_engine_handle engine,
    sch_transport_state_t state
) {
    if (!engine) return SCH_ERR_INVALID_ARG;

    try {
        auto* engineImpl = get_engine_internal(engine);

        switch (state) {
            case SCH_TRANSPORT_PLAYING:
                engineImpl->startAudio();
                break;
            case SCH_TRANSPORT_STOPPED:
                engineImpl->stopAudio();
                break;
            // ... other states
        }

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}

sch_result_t sch_engine_set_tempo(
    sch_engine_handle engine,
    double tempo
) {
    if (!engine || tempo <= 0.0) return SCH_ERR_INVALID_ARG;

    try {
        auto* engineImpl = get_engine_internal(engine);
        engineImpl->setTempo(tempo);
        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

#### 3.3 Update Swift UI

**File:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/UI/TransportControls.swift`

```swift
struct TransportControls: View {
    @ObservedObject var engine: JUCEEngine

    var body: some View {
        HStack {
            Button(action: { try? engine.play() }) {
                Image(systemName: "play.fill")
            }

            Button(action: { try? engine.stop() }) {
                Image(systemName: "stop.fill")
            }

            Slider(value: $engine.tempo, in: 40...300) { value in
                try? engine.setTempo(value)
            }
        }
    }
}
```

### Completion Criteria

- [ ] Audio starts/stops cleanly
- [ ] Tempo changes affect pitch
- [ ] Note events trigger sounds
- [ ] No audio glitches

---

## Phase 4: Performance Blend (Day 2.5)

### Objective
Real-time blend control with lock-free queues and atomic state.

### Tasks

#### 4.1 Implement Lock-Free Queue

**File:** `juce_backend/src/ffi/lock_free_queue.hpp` (new file)

```cpp
template <typename T, size_t Capacity>
class LockFreeSPSCQueue {
    std::array<T, Capacity> buffer_;
    std::atomic<size_t> write_index_{0};
    std::atomic<size_t> read_index_{0};

public:
    bool try_push(const T& item);
    bool try_pop(T& item);
};
```

#### 4.2 Implement Command Processing

```cpp
// In engine implementation
class Engine {
    LockFreeSPSCQueue<sch_command_t, 256> command_queue_;

    void processCommands() {
        sch_command_t cmd;
        while (command_queue_.try_pop(cmd)) {
            switch (cmd.type) {
                case SCH_CMD_SET_PERFORMANCE_BLEND:
                    setPerformanceBlend(
                        cmd.data.set_performance_blend.perf_a_id,
                        cmd.data.set_performance_blend.perf_b_id,
                        cmd.data.set_performance_blend.blend_value
                    );
                    break;
                // ... other commands
            }
        }
    }
};
```

#### 4.3 Implement Atomic State

```cpp
struct alignas(64) AtomicPerformanceState {
    std::atomic<double> blend_value{0.5};
    std::atomic<double> tempo{120.0};
    std::atomic<double> position{0.0};
    std::atomic<uint32_t> voice_active_count{0};
    std::atomic<bool> is_playing{false};
};
```

#### 4.4 Swift Polling

```swift
class JUCEEngine: ObservableObject {
    private var statePollingTimer: Timer?

    func startStatePolling() {
        statePollingTimer = Timer.scheduledTimer(withTimeInterval: 1.0/60.0, repeats: true) { [weak self] _ in
            self?.pollEngineState()
        }
    }

    private func pollEngineState() {
        guard let engine = engineHandle else { return }

        let state = try? ffi.getPerformanceState(engine)

        DispatchQueue.main.async {
            self.currentBlendValue = state?.blendValue ?? 0.5
            self.currentTempo = state?.tempo ?? 120.0
            self.isPlaying = state?.isPlaying ?? false
        }
    }
}
```

### Completion Criteria

- [ ] Blend changes are audible
- [ ] Latency <10ms
- [ ] No audio dropouts
- [ ] State polling doesn't block UI

---

## Phase 5: SongModel Binary (Day 3)

### Objective
Binary serialization for realized notes (SongModel_v1).

### Tasks

#### 5.1 Design Binary Format

See `ffi-bridge-architecture.md` Section: "SongModel_v1 Serialization"

#### 5.2 Implement Serialization

```cpp
sch_result_t sch_song_model_serialize(
    const sch_song_model_t* model,
    sch_string_t* out_binary
) {
    if (!model || !out_binary) return SCH_ERR_INVALID_ARG;

    try {
        // Calculate size
        size_t size = sizeof(sch_binary_header_t);
        size += model->notes.count * sizeof(sch_binary_note_entry_t);
        size += model->events.count * sizeof(sch_binary_event_entry_t);

        // Allocate
        out_binary->data = static_cast<char*>(std::malloc(size));
        out_binary->length = size;

        // Write header
        auto* header = reinterpret_cast<sch_binary_header_t*>(out_binary->data);
        std::memcpy(header->magic, "WRSM", 4);
        header->version = 1;
        header->flags = 0;

        // Write notes
        // ... serialization logic

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

#### 5.3 Implement Deserialization

```cpp
sch_result_t sch_song_model_deserialize(
    const char* binary,
    size_t length,
    sch_song_model_t* out_model
) {
    if (!binary || !out_model) return SCH_ERR_INVALID_ARG;

    try {
        // Validate header
        auto* header = reinterpret_cast<const sch_binary_header_t*>(binary);
        if (std::memcmp(header->magic, "WRSM", 4) != 0) {
            return SCH_ERR_PARSE_FAILED;
        }
        if (header->version != 1) {
            return SCH_ERR_NOT_SUPPORTED;
        }

        // Parse notes, events, etc.
        // ... deserialization logic

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

### Completion Criteria

- [ ] Serializes 10k notes in <10ms
- [ ] Deserializes without errors
- [ ] Binary format is versioned
- [ ] Round-trip preserves data

---

## Phase 6: Real-Time Callbacks (Day 3.5)

### Objective
Event callbacks from audio thread to Swift main thread.

### Tasks

#### 6.1 Implement Callback System

```cpp
sch_result_t sch_engine_set_event_callback(
    sch_engine_handle engine,
    sch_event_callback_t callback,
    void* user_data
) {
    if (!engine) return SCH_ERR_INVALID_ARG;

    auto* engineImpl = get_engine_internal(engine);
    engineImpl->setEventCallback(callback, user_data);

    return SCH_OK;
}
```

#### 6.2 Swift Callback Wrapper

```swift
class JUCEEngine {
    private var eventCallback: sch_event_callback_t?

    func setupEventCallback() {
        eventCallback = { (eventType, message, userData) in
            let event = EventType(rawValue: Int32(eventType.rawValue)) ?? .error
            let msg = String(cString: message)

            DispatchQueue.main.async {
                self.handleEvent(eventType: event, message: msg)
            }
        }

        try? ffi.setEventCallback(engineHandle, callback: eventCallback)
    }

    private func handleEvent(eventType: EventType, message: String) {
        switch eventType {
        case .error:
            NSLog("[JUCEEngine Error] \(message)")
        case .transportStarted:
            self.isPlaying = true
        case .transportStopped:
            self.isPlaying = false
        default:
            break
        }
    }
}
```

### Completion Criteria

- [ ] Callbacks invoke on main thread
- [ ] No crashes from callback context
- [ ] Events arrive in order
- [ ] Memory doesn't leak

---

## Phase 7: Polish & Testing (Day 4-5)

### Objective
Production-ready implementation with comprehensive testing.

### Tasks

#### 7.1 Unit Tests

```bash
# Run C++ tests
cd juce_backend
cmake --build . --target test_ffi
./tests/test_ffi

# Run Swift tests
cd swift_frontend
swift test
```

#### 7.2 Integration Tests

```swift
func testFullWorkflow() throws {
    let engine = try JUCEEngine()

    // 1. Load song
    let song = SchillingerSong.minimal()
    try engine.loadSong(song)

    // 2. Start audio
    try engine.startAudio()

    // 3. Set blend
    try engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

    // 4. Wait for audio
    Thread.sleep(forTimeInterval: 1.0)

    // 5. Stop audio
    try engine.stopAudio()
}
```

#### 7.3 Performance Tests

```swift
func testBlendLatency() {
    let start = Date()

    try engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

    let latency = Date().timeIntervalSince(start) * 1000  // ms

    XCTAssertLessThan(latency, 10.0)  // <10ms
}
```

#### 7.4 Memory Leak Detection

```bash
# C++ with ASan
ASAN_OPTIONS=detect_leaks=1 ./juce_backend_tests

# Swift with Instruments
xcodebuild test -scheme WhiteRoomiOS
```

#### 7.5 Documentation

- [ ] Add Header Doc comments to all FFI functions
- [ ] Write usage examples
- [ ] Update architecture diagrams
- [ ] Document error codes

### Completion Criteria

- [ ] All tests pass
- [ ] No memory leaks
- [ ] <10ms latency for 99th percentile
- [ ] Documentation complete

---

## Common Issues & Solutions

### Issue: Duplicate Symbol Errors

**Problem:** `sch_engine_create` defined in multiple files

**Solution:**
- Keep implementation in ONE file: `sch_engine_ffi.cpp`
- Use `extern "C"` declarations in header only
- Link against the compiled object file

### Issue: Swift Can't Find FFI Functions

**Problem:** "Undefined symbol" linker errors

**Solution:**
1. Ensure `schillinger.modulemap` references correct header
2. Verify header is in Swift search path
3. Check that functions are `extern "C"`
4. Clean build folder: `rm -rf DerivedData`

### Issue: Callback Crashes

**Problem:** Crash when callback invoked from audio thread

**Solution:**
- Always dispatch to main thread in Swift
- Don't capture `self` strongly (use `[weak self]`)
- Keep callback fast (no blocking operations)

### Issue: Memory Leaks

**Problem:** Memory grows over time

**Solution:**
- Verify all `malloc` have corresponding `free`
- Use Instruments Leaks tool
- Run with AddressSanitizer: `ASAN_OPTIONS=detect_leaks=1`
- Check for retain cycles in Swift closures

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Latency | <10ms | Time from slider change to audio |
| Memory | No leaks | ASan, Instruments |
| Reliability | 99.9% uptime | Crash-free testing (1 hour) |
| Performance | <5% CPU | During active playback |
| Test Coverage | >80% | Unit + integration tests |

---

## Next Steps

1. **Review this roadmap** with team
2. **Create implementation branch:**
   ```bash
   git checkout -b feature/ffi-bridge-implementation
   ```
3. **Track work in bd:**
   ```bash
   bd create "Phase 1: Core Bridge Implementation" --labels "ffi,phase-1"
   ```
4. **Begin Phase 1:** Create `sch_engine_ffi.cpp`
5. **Daily updates:** Update bd issues as you complete tasks

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Status:** Ready for Implementation
