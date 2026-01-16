# White Room FFI Bridge Architecture

**Status:** Design Document
**Created:** 2025-01-15
**Author:** Backend Architect (Claude)
**Target Implementation:** 3-5 days

---

## Executive Summary

This document defines the complete Foreign Function Interface (FFI) architecture for White Room's Swift frontend and JUCE C++ backend communication. The FFI bridge enables real-time audio control (<10ms latency) while supporting complex data structures (Schillinger songs, performances, and state synchronization).

**Key Requirements:**
- Swift ↔ C++ function calls with C ABI boundary
- Real-time callbacks from audio thread to UI thread
- Serialization of TypeScript/C++/Swift complex types
- Thread-safe communication patterns
- Low-latency audio pipeline (<10ms target)
- Cross-platform support (iOS, macOS, tvOS)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [C ABI Boundary Definition](#c-abi-boundary-definition)
3. [Serialization Layer](#serialization-layer)
4. [Real-Time Communication](#real-time-communication)
5. [Type Mapping](#type-mapping)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Testing Strategy](#testing-strategy)
8. [Common Pitfalls](#common-pitfalls)

---

## Architecture Overview

### Current State

**Existing Components:**
- `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Audio/JUCEEngine.swift` (264 lines)
  - Placeholder `NSLog` calls
  - No real FFI implementation
- `juce_backend/src/ffi/sch_engine.hpp` (445 lines)
  - Complete type definitions
  - Function signatures declared
- `juce_backend/src/ffi/sch_engine.mm` (1131 lines)
  - Partial implementation with TODOs
  - Sine wave test generator
- `juce_backend/src/ffi/audio_only_bridge.mm` (898 lines)
  - iOS-specific AVAudioEngine setup
  - Per-MIDI-channel instrument routing
  - Real-time audio processor

**Missing Components:**
- Real Schillinger song serialization (TypeScript → C++ → Swift)
- Real-time performance state synchronization
- Thread-safe audio callbacks
- Error handling across language boundaries
- Memory management for complex types

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Swift Frontend (UI)                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  JUCEEngine.swift (ObservableObject)                    ││
│  │  - @Published state (blend, performances)               ││
│  │  - DispatchQueue for async operations                   ││
│  │  - Error handling (JUCEEngineError)                     ││
│  └──────────────────────┬──────────────────────────────────┘│
│                         │ Swift FFI Layer                    │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ C ABI (extern "C")
                          │
┌─────────────────────────┼───────────────────────────────────┐
│  ┌──────────────────────┴──────────────────────────────────┐│
│  │  C++ Bridge Layer (sch_engine_ffi.cpp)                 ││
│  │  - Serialization/deserialization                        ││
│  │  - Thread-safe command queue                            ││
│  │  - Memory management (malloc/free)                      ││
│  │  - Error translation (C++ → C codes)                    ││
│  └──────────────────────┬──────────────────────────────────┘│
│                         │                                     │
│  ┌──────────────────────┴──────────────────────────────────┐│
│  │  JUCE Engine (C++)                                     ││
│  │  - AudioDeviceManager / AVAudioEngine                   ││
│  │  - SchillingerEngine (theory processing)                ││
│  │  - Real-time audio thread                               ││
│  │  - Command queue (lock-free SPSC)                       ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## C ABI Boundary Definition

### Core Principle

**All FFI functions must be `extern "C"`** to prevent C++ name mangling and ensure C ABI compatibility.

### Function Signature Template

```c
// C header (sch_engine_ffi.h)
extern "C" {
    sch_result_t sch_engine_function_name(
        sch_engine_handle engine,  // Opaque pointer
        const input_type_t* input,  // Const pointer (no ownership transfer)
        output_type_t* output      // Non-const (caller allocates)
    );
}
```

### Memory Management Rules

| Direction | Who Allocates | Who Frees | Pattern |
|-----------|--------------|-----------|----------|
| Swift → C++ | Swift | C++ | `const char*` (borrowed) |
| C++ → Swift | C++ (`malloc`) | Swift | `sch_string_t` (ownership transfer) |
| Arrays | C++ (`malloc`) | Swift | `sch_array_t<T>` (with count) |
| Complex types | C++ | Swift | Structs with inline buffers |

### Error Handling Strategy

**All FFI functions return `sch_result_t`:**

```c
typedef enum sch_result_t {
    SCH_OK = 0,                          // Success
    SCH_ERR_INVALID_ARG = 1,             // Null pointer, invalid value
    SCH_ERR_NOT_FOUND = 2,               // Resource doesn't exist
    SCH_ERR_REJECTED = 3,                // Operation rejected (state conflict)
    SCH_ERR_DEFERRED = 4,                // Deferred to boundary
    SCH_ERR_NOT_IMPLEMENTED = 5,         // Function not yet implemented
    SCH_ERR_ENGINE_NULL = 6,             // Engine handle is null
    SCH_ERR_INVALID_STATE = 7,           // Invalid state for operation
    SCH_ERR_INTERNAL = 100,              // Internal error (bug)
    // Legacy codes for compatibility
    SCH_ERR_ENGINE_FAILED = 3,
    SCH_ERR_AUDIO_FAILED = 4,
    SCH_ERR_OUT_OF_MEMORY = 6,
    SCH_ERR_NOT_SUPPORTED = 8,
    SCH_ERR_PARSE_FAILED = 9,
    SCH_ERR_VALIDATION_FAILED = 10
} sch_result_t;
```

**Error propagation:**

```
Swift Error
    ↓ (JUCEEngineError)
C++ Exception (caught in bridge)
    ↓ (translated to)
sch_result_t
    ↓ (checked by)
Swift if/switch
    ↓ (converted back to)
Swift Error (throw)
```

---

## Serialization Layer

### Data Flow

```
TypeScript SDK (npm package)
    ↓ (JSON string)
Swift Frontend (SchillingerSong_v1 struct)
    ↓ (binary serialization)
C++ Bridge (C++ struct)
    ↓ (shared_ptr/unique_ptr)
JUCE Engine (internal types)
```

### Serialization Format Decision

**Recommendation: JSON for complex types, binary for primitives**

| Data Type | Serialization Format | Justification |
|-----------|---------------------|---------------|
| SchillingerSong_v1 | JSON | Human-readable, debuggable, schema-validated |
| SongModel_v1 (notes) | Binary (MsgPack) | Size efficiency, parse speed |
| PerformanceState | Binary struct | Direct memory mapping |
| Audio parameters | Binary struct | Real-time performance |

**Rationale:**
- JSON for theory objects (infrequent, large, need validation)
- Binary for audio data (frequent, small, performance-critical)
- Hybrid approach balances debuggability and performance

### SchillingerSong_v1 Serialization

**TypeScript → C++:**

```typescript
// TypeScript SDK
const song = SchillingerSong.minimal();
const json = song.toString(); // JSON string
```

```c
// C FFI function
sch_result_t sch_engine_load_song(
    sch_engine_handle engine,
    const char* json  // JSON string from TypeScript
);
```

```cpp
// C++ implementation
sch_result_t sch_engine_load_song(sch_engine_handle engine, const char* json) {
    try {
        // Parse JSON using JUCE JSON parser
        juce::var jsonVar;
        auto error = juce::JSON::parse(json, jsonVar);
        if (error.failed()) {
            return SCH_ERR_PARSE_FAILED;
        }

        // Deserialize to internal SchillingerEngine types
        auto* engineImpl = get_engine_internal(engine);
        engineImpl->loadSongFromJSON(jsonVar);

        return SCH_OK;
    } catch (const std::exception& e) {
        return SCH_ERR_INTERNAL;
    }
}
```

**C++ → Swift:**

```cpp
// C++ implementation
sch_result_t sch_engine_get_song(sch_engine_handle engine, sch_string_t* out_json) {
    auto* engineImpl = get_engine_internal(engine);
    juce::DynamicObject::Ptr songObj = engineImpl->songToJSON();
    juce::String jsonString = juce::JSON::toString(songObj);

    // Allocate and copy (caller must free)
    out_json->data = static_cast<char*>(std::malloc(jsonString.length() + 1));
    std::strcpy(out_json->data, jsonString.toUTF8());
    out_json->length = jsonString.length();

    return SCH_OK;
}
```

```swift
// Swift usage
var jsonStr = sch_string_t()
let result = sch_engine_get_song(engine, &jsonStr)

if result == SCH_OK {
    let string = String(cString: jsonStr.data)
    sch_free_string(&jsonStr)  // MUST free

    // Parse JSON to Swift struct
    let song = try JSONDecoder().decode(SchillingerSong_v1.self, from: string.data)
}
```

### SongModel_v1 (Realized Notes) Serialization

**Binary Format (MsgPack-like):**

```
Header (8 bytes):
  [4 bytes: magic "WRSN"] (White Room Song Notes)
  [4 bytes: version (1)]

Notes Section:
  [4 bytes: note_count]
  [NoteEntry * note_count]

NoteEntry (32 bytes each):
  [16 bytes: note_id (UUID)]
  [16 bytes: voice_id (UUID)]
  [8 bytes: start_time (double, beats)]
  [8 bytes: duration (double, beats)]
  [4 bytes: pitch (uint16)]
  [4 bytes: velocity (uint16)]
  [8 bytes: derivation_source_id (UUID)]

Events Section:
  [4 bytes: event_count]
  [EventEntry * event_count]

...
```

**Rationale:**
- Fixed-size entries for O(1) indexing
- Cache-friendly memory layout
- Direct `memcpy` to audio engine structures
- ~10x smaller than JSON for 1000+ notes

---

## Real-Time Communication

### Communication Channel Decision

**Recommendation: Lock-Free SPSC Queue + Atomic State**

**Options Considered:**

| Option | Latency | Complexity | Verdict |
|--------|---------|------------|---------|
| WebSocket | 50-100ms | Low | ❌ Too slow for audio |
| Shared Memory | <1ms | High | ⚠️ Complex synchronization |
| Lock-Free Queue | <1ms | Medium | ✅ Recommended |
| Atomic State | <1ms | Low | ✅ Recommended |

**Hybrid Approach:**
- **Commands (Swift → C++):** Lock-free SPSC queue
- **State (C++ → Swift):** Atomic variables + periodic polling

### Command Queue Architecture

```cpp
// Lock-free SPSC queue (C++)
template <typename T, size_t Capacity>
class LockFreeSPSCQueue {
    std::array<T, Capacity> buffer_;
    std::atomic<size_t> write_index_{0};
    std::atomic<size_t> read_index_{0};

public:
    bool try_push(const T& item) {
        const size_t write = write_index_.load(std::memory_order_relaxed);
        const size_t next = (write + 1) % Capacity;

        if (next == read_index_.load(std::memory_order_acquire)) {
            return false;  // Queue full
        }

        buffer_[write] = item;
        write_index_.store(next, std::memory_order_release);
        return true;
    }

    bool try_pop(T& item) {
        const size_t read = read_index_.load(std::memory_order_relaxed);
        if (read == write_index_.load(std::memory_order_acquire)) {
            return false;  // Queue empty
        }

        item = buffer_[read];
        read_index_.store((read + 1) % Capacity, std::memory_order_release);
        return true;
    }
};

// Command types
enum class CommandType {
    SetPerformanceBlend,
    SetTempo,
    SetPosition,
    SendNoteOn,
    SendNoteOff,
    Panic
};

struct Command {
    CommandType type;
    union {
        struct { double blend_value; } performance_blend;
        struct { double tempo; } set_tempo;
        struct { int channel; int note; float velocity; } note_on;
        struct { int channel; int note; float velocity; } note_off;
    } data;
};
```

**Swift Interface:**

```swift
class JUCEEngine {
    private let engineQueue = DispatchQueue(label: "com.whiteroom.audio.engine")

    func setPerformanceBlend(_ perfA: PerformanceInfo, _ perfB: PerformanceInfo, blend: Double) {
        engineQueue.async {
            // Push to command queue
            let command = Command(
                type: CMD_SET_PERFORMANCE_BLEND,
                performance_blend: (blend_value: blend)
            )

            // Thread-safe FFI call
            sch_engine_push_command(self.engineHandle, &command)
        }
    }
}
```

### Real-Time State Synchronization

**Atomic State Pattern:**

```cpp
// C++ atomic state (updated from audio thread)
struct alignas(64) AtomicPerformanceState {
    std::atomic<double> blend_value{0.5};
    std::atomic<double> tempo{120.0};
    std::atomic<double> position{0.0};
    std::atomic<uint32_t> voice_active_count{0};
    std::atomic<bool> is_playing{false};
};
```

**Swift Polling:**

```swift
class JUCEEngine: ObservableObject {
    @Published var currentBlendValue: Double = 0.5
    @Published var currentTempo: Double = 120.0

    private var statePollingTimer: Timer?

    func startStatePolling() {
        // Poll at 60Hz (UI refresh rate)
        statePollingTimer = Timer.scheduledTimer(withTimeInterval: 1.0/60.0, repeats: true) { [weak self] _ in
            self?.pollEngineState()
        }
    }

    private func pollEngineState() {
        guard let engine = engineHandle else { return }

        var state = sch_performance_state_t()
        sch_engine_get_performance_state(engine, &state)

        DispatchQueue.main.async {
            self.currentBlendValue = state.blend_value
            self.currentTempo = state.tempo
            self.isPlaying = state.is_playing
        }
    }
}
```

**Rationale:**
- Atomic state reads are wait-free (<100ns)
- Polling at 60Hz matches UI refresh rate
- No blocking on audio thread
- Simpler than callbacks for frequent updates

### Audio Thread Callbacks (Events)

**For rare events (errors, transport changes):**

```cpp
// C++ callback (invoked from audio thread)
typedef void (*sch_event_callback_t)(
    sch_event_type_t event_type,
    const char* message,
    void* user_data
);

sch_result_t sch_engine_set_event_callback(
    sch_engine_handle engine,
    sch_event_callback_t callback,
    void* user_data
);
```

**Swift Wrapper:**

```swift
class JUCEEngine {
    private var eventCallback: sch_event_callback_t?

    func setupEventCallback() {
        // Create C callback wrapper
        eventCallback = { (eventType, message, userData) in
            // Dispatch to main thread
            DispatchQueue.main.async {
                self.handleEvent(eventType: eventType, message: message)
            }
        }

        sch_engine_set_event_callback(engineHandle, eventCallback, nil)
    }

    private func handleEvent(eventType: sch_event_type_t, message: UnsafePointer<CChar>) {
        let msg = String(cString: message)

        switch eventType {
        case SCH_EVT_ERROR:
            NSLog("[JUCEEngine Error] \(msg)")
        case SCH_EVT_TRANSPORT_STOPPED:
            self.isPlaying = false
        case SCH_EVT_TRANSPORT_STARTED:
            self.isPlaying = true
        default:
            break
        }
    }
}
```

---

## Type Mapping

### Primitive Types

| Swift | C | C++ | Notes |
|-------|---|-----|-------|
| `Int` | `int64_t` | `int64_t` | Use fixed-width types |
| `Double` | `double` | `double` | IEEE 754 double precision |
| `Float` | `float` | `float` | IEEE 754 single precision |
| `Bool` | `bool` | `bool` | C++ bool, not BOOL |
| `String` | `const char*` | `std::string_view` | Borrowed reference |
| `Data` | `uint8_t*` + `size_t` | `std::span<uint8_t>` | With length |

### UUID Handling

**Strategy: String representation (36 chars + null terminator)**

```c
// C struct
typedef char sch_uuid_t[37];  // "550e8400-e29b-41d4-a716-446655440000" + '\0'

// Function to validate
bool sch_uuid_validate(const sch_uuid_t uuid);
```

```swift
// Swift extension
extension UUID {
    func toFFI() -> sch_uuid_t {
        var uuid = self.uuidString  // "550E8400-E29B-41D4-A716-446655440000"
        uuid = uuid.lowercased()    // "550e8400-e29b-41d4-a716-446655440000"

        var ffi_uuid = sch_uuid_t()
        uuid.withCString { ptr in
            strncpy(&ffi_uuid.0, ptr, 36)
            ffi_uuid.36 = '\0'
        }

        return ffi_uuid
    }

    init?(ffi: sch_uuid_t) {
        let string = String(cString: &ffi.0)
        self.init(uuidString: string)
    }
}
```

**Alternative (for performance-critical paths):**

```c
// Binary UUID (16 bytes)
typedef struct {
    uint8_t bytes[16];
} sch_uuid_binary_t;
```

### Array/List Handling

**C arrays (with length):**

```c
// String array
typedef struct {
    char** items;
    size_t count;
} sch_string_array_t;

// Generic array (using void* for type erasure)
typedef struct {
    void* items;
    size_t count;
    size_t item_size;
} sch_array_t;

// Typed array macros
#define SCH_ARRAY_DECLARE(T, name) \
    typedef struct { \
        T* items; \
        size_t count; \
    } name##_t

SCH_ARRAY_DECLARE(double, sch_double_array);
SCH_ARRAY_DECLARE(int32_t, sch_int32_array);
```

```swift
// Swift wrapper
extension Array where Element == String {
    func toFFI() -> sch_string_array_t {
        let cStrings = self.map { strdup($0) }
        let count = cStrings.count

        let items = UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>.allocate(capacity: count)
        for (index, cString) in cStrings.enumerated() {
            items[index] = cString
        }

        return sch_string_array_t(items: items, count: count)
    }
}

// Free function
func sch_free_string_array(_ array: sch_string_array_t) {
    for i in 0..<array.count {
        free(array.items[i])
    }
    free(array.items)
}
```

### Complex Type Example: PerformanceState

**Swift struct:**

```swift
struct PerformanceState: Codable {
    let performanceAId: String
    let performanceBId: String
    let blendValue: Double
    let tempo: Double
    let position: Double
    let isPlaying: Bool
}
```

**C struct:**

```c
typedef struct {
    sch_uuid_t performance_a_id;
    sch_uuid_t performance_b_id;
    double blend_value;
    double tempo;
    double position;
    bool is_playing;
} sch_performance_state_t;
```

**Conversion:**

```swift
extension PerformanceState {
    func toFFI() -> sch_performance_state_t {
        return sch_performance_state_t(
            performance_a_id: performanceAId.toFFI(),
            performance_b_id: performanceBId.toFFI(),
            blend_value: blendValue,
            tempo: tempo,
            position: position,
            is_playing: isPlaying
        )
    }

    init?(ffi: sch_performance_state_t) {
        guard let perfA = UUID(ffi: ffi.performance_a_id),
              let perfB = UUID(ffi: ffi.performance_b_id) else {
            return nil
        }

        self.init(
            performanceAId: perfA.uuidString,
            performanceBId: perfB.uuidString,
            blendValue: ffi.blend_value,
            tempo: ffi.tempo,
            position: ffi.position,
            isPlaying: ffi.is_playing
        )
    }
}
```

---

## Implementation Roadmap

### Phase 0: Foundation (Day 0.5) ✅ Already Done

- [x] Type definitions (`sch_types.hpp`)
- [x] Function signatures (`sch_engine.hpp`)
- [x] Swift module map (`schillinger.modulemap`)
- [x] Basic C++ engine stub (`sch_engine.mm`)

### Phase 1: Core Bridge (Day 1)

**Goal: Basic Swift ↔ C++ communication**

- [ ] Create `sch_engine_ffi.cpp` (new file)
  - [ ] Serialization utilities (JSON ↔ C++ structs)
  - [ ] Error translation (C++ exceptions → `sch_result_t`)
  - [ ] Memory management helpers
- [ ] Implement lifecycle functions
  - [ ] `sch_engine_create` ✅ (already done)
  - [ ] `sch_engine_destroy` ✅ (already done)
  - [ ] `sch_engine_get_version_info`
- [ ] Update Swift `JUCEEngine.swift`
  - [ ] Replace `NSLog` placeholders with real FFI calls
  - [ ] Add error handling (throw `JUCEEngineError`)
  - [ ] Test engine creation/destruction

**Acceptance Criteria:**
- Engine creates/destroys without crashes
- Version info returns correctly
- No memory leaks (verify with ASan/Instruments)

### Phase 2: Song Loading (Day 1.5)

**Goal: Load SchillingerSong from Swift**

- [ ] Implement `sch_engine_load_song`
  - [ ] Parse JSON using JUCE parser
  - [ ] Validate against schema
  - [ ] Store in internal engine state
- [ ] Implement `sch_engine_get_song`
  - [ ] Serialize internal state to JSON
  - [ ] Allocate `sch_string_t` with `malloc`
  - [ ] Swift wrapper to free memory
- [ ] Add Swift `SchillingerSong_v1` struct
  - [ ] Codable conformance
  - [ ] JSON parsing
  - [ ] Validation
- [ ] Test round-trip (Swift → C++ → Swift)

**Acceptance Criteria:**
- Song loads without errors
- JSON parses correctly
- Round-trip preserves data (deep equality)
- No memory leaks

### Phase 3: Audio Control (Day 2)

**Goal: Start/stop audio, transport control**

- [ ] Integrate `audio_only_bridge.mm` functions
  - [ ] `sch_engine_audio_init` ✅ (already implemented)
  - [ ] `sch_engine_audio_start` ✅ (already implemented)
  - [ ] `sch_engine_audio_stop` ✅ (already implemented)
- [ ] Implement transport functions
  - [ ] `sch_engine_set_tempo`
  - [ ] `sch_engine_set_position`
  - [ ] `sch_engine_transport` (play/pause/stop)
- [ ] Implement MIDI events
  - [ ] `sch_engine_send_note_on` ✅ (already implemented)
  - [ ] `sch_engine_send_note_off` ✅ (already implemented)
  - [ ] `sch_engine_all_notes_off` ✅ (already implemented)
- [ ] Update Swift UI
  - [ ] Play/pause button
  - [ ] Tempo slider
  - [ ] Position scrubber

**Acceptance Criteria:**
- Audio starts/stops cleanly
- Tempo changes affect pitch
- Note events trigger sounds
- No audio glitches/crashes

### Phase 4: Performance Blend (Day 2.5)

**Goal: Real-time blend control**

- [ ] Implement lock-free command queue
  - [ ] `LockFreeSPSCQueue<Command, 256>`
  - [ ] `sch_engine_push_command`
  - [ ] Audio thread: `try_pop` and process
- [ ] Implement `sch_engine_set_performance_blend`
  - [ ] Push to command queue
  - [ ] Update atomic blend value
- [ ] Implement atomic state polling
  - [ ] `sch_engine_get_performance_state`
  - [ ] Swift timer (60Hz polling)
- [ ] Update Swift `SweepControl`
  - [ ] Real-time blend slider
  - [ ] Performance A/B selectors

**Acceptance Criteria:**
- Blend changes are audible
- Latency <10ms from slider to audio
- No audio dropouts during rapid updates
- State polling doesn't block UI

### Phase 5: SongModel Serialization (Day 3)

**Goal: Realized notes (SongModel_v1) binary format**

- [ ] Design binary format
  - [ ] Header (magic + version)
  - [ ] Notes section (fixed-size entries)
  - [ ] Events section
- [ ] Implement serialization
  - [ ] `sch_song_model_serialize` (C++ → binary)
  - [ ] `sch_song_model_deserialize` (binary → C++)
  - [ ] Endianness handling (if cross-platform)
- [ ] Implement Swift wrapper
  - [ ] `SongModel_v1` struct
  - [ ] Binary parser/writer
  - [ ] Memory management

**Acceptance Criteria:**
- Serializes 10,000 notes in <10ms
- Deserializes without errors
- Binary format is versioned
- Round-trip preserves all data

### Phase 6: Real-Time Callbacks (Day 3.5)

**Goal: Event callbacks from audio thread**

- [ ] Implement callback system
  - [ ] `sch_engine_set_event_callback`
  - [ ] Thread-safe callback invocation
  - [ ] Event types (error, transport, boundary)
- [ ] Swift callback wrapper
  - [ ] Dispatch to main thread
  - [ ] Convert C strings to Swift
  - [ ] Error handling
- [ ] Test event delivery
  - [ ] Transport start/stop events
  - [ ] Error events (validation failures)
  - [ ] Boundary events (section changes)

**Acceptance Criteria:**
- Callbacks invoke on main thread
- No crashes from callback context
- Events arrive in order
- Memory doesn't leak from callbacks

### Phase 7: Polish & Testing (Day 4-5)

**Goal: Production-ready implementation**

- [ ] Comprehensive testing
  - [ ] Unit tests for serialization
  - [ ] Integration tests (Swift ↔ C++)
  - [ ] Stress tests (10k notes, rapid updates)
  - [ ] Memory leak detection (ASan, Instruments)
- [ ] Performance optimization
  - [ ] Profile hot paths
  - [ ] Reduce allocations in audio thread
  - [ ] Optimize serialization
- [ ] Documentation
  - [ ] API documentation (Header Doc comments)
  - [ ] Usage examples
  - [ ] Architecture diagrams
- [ ] Error handling review
  - [ ] All error paths tested
  - [ ] Meaningful error messages
  - [ ] Recovery strategies

**Acceptance Criteria:**
- All tests pass
- No memory leaks
- <10ms latency for 99th percentile
- Documentation complete

---

## Testing Strategy

### Unit Tests

**C++ Tests (Catch2):**

```cpp
// juce_backend/tests/ffi/test_serialization.cpp
TEST_CASE("SchillingerSong serialization", "[ffi][serialize]") {
    // Create test song
    auto song = createTestSong();

    // Serialize to JSON
    juce::String json = serializeSong(song);

    // Deserialize back
    auto restored = deserializeSong(json);

    // Verify deep equality
    REQUIRE(restored->songId == song.songId);
    REQUIRE(restored->globals.tempo == song.globals.tempo);
    // ... more assertions
}
```

**Swift Tests (XCTest):**

```swift
// swift_frontend/Tests/SwiftFrontendCoreTests/FFITests.swift
class FFITests: XCTestCase {
    func testEngineLifecycle() {
        var engine: OpaquePointer?
        let result = sch_engine_create(&engine)

        XCTAssertEqual(result, SCH_OK)
        XCTAssertNotNil(engine)

        sch_engine_destroy(engine)
    }

    func testSongRoundTrip() throws {
        let song = SchillingerSong.minimal()

        // Load into engine
        let json = song.toString()
        let result = sch_engine_load_song(engine, json)

        XCTAssertEqual(result, SCH_OK)

        // Get back
        var outJson = sch_string_t()
        let getResult = sch_engine_get_song(engine, &outJson)

        XCTAssertEqual(getResult, SCH_OK)

        let restored = String(cString: outJson.data)
        sch_free_string(&outJson)

        // Verify equality
        XCTAssertEqual(restored, json)
    }
}
```

### Integration Tests

**End-to-End Workflow:**

```swift
// Integration test: Load song → Start audio → Blend → Stop
func testFullWorkflow() throws {
    // 1. Create engine
    let engine = try JUCEEngine.create()

    // 2. Load song
    let song = SchillingerSong.minimal()
    try engine.loadSong(song)

    // 3. Start audio
    try engine.startAudio()

    // 4. Set blend
    try engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

    // 5. Wait for audio output (verify with callback)
    let expectation = XCTestExpectation(description: "Audio callback")
    engine.onAudioCallback = {
        expectation.fulfill()
    }
    wait(for: [expectation], timeout: 1.0)

    // 6. Stop audio
    try engine.stopAudio()

    // 7. Cleanup
    engine.destroy()
}
```

### Performance Tests

**Latency Measurement:**

```cpp
// C++ benchmark
TEST_CASE("Blend command latency", "[benchmark][ffi]") {
    auto engine = createEngine();

    // Measure time from command to audio thread processing
    auto start = std::chrono::high_resolution_clock::now();

    sch_engine_set_performance_blend(engine, "perfA", "perfB", 0.5);

    // (In audio thread callback)
    auto end = std::chrono::high_resolution_clock::now();
    auto latency = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    REQUIRE(latency.count() < 10000);  // <10ms
}
```

**Serialization Benchmark:**

```swift
// Swift benchmark
func testSongSerializationPerformance() {
    let song = createLargeSong()  // 10 systems, 100 voices

    measure {
        let json = song.toString()
        _ = try JSONDecoder().decode(SchillingerSong_v1.self, from: json.data)
    }

    // Should complete in <100ms
}
```

### Memory Leak Detection

**Tools:**
- **macOS/iOS:** Instruments (Leaks tool)
- **C++:** AddressSanitizer (ASan)
- **Swift:** XCTest memory leak detection

**Test:**

```bash
# Run with ASan
ASAN_OPTIONS=detect_leaks=1 ./juce_backend_tests

# Run Swift tests with leak detection
xcodebuild test -scheme WhiteRoomiOS -destination 'platform=iOS Simulator,name=iPhone 15'
```

---

## Common Pitfalls

### 1. Memory Ownership Confusion

**Problem:** Who frees memory allocated across FFI boundary?

**Solution:** Document ownership in function headers

```c
/**
 * Get song as JSON string
 *
 * @param out_json Pointer to receive JSON string (CALLER MUST FREE via sch_free_string)
 * @return SCH_OK on success
 */
sch_result_t sch_engine_get_song(sch_engine_handle engine, sch_string_t* out_json);
```

### 2. Thread Safety Violations

**Problem:** Calling Swift from C++ audio thread crashes

**Solution:** Always dispatch to main thread

```cpp
// WRONG: Direct Swift callback from audio thread
callback(message);  // 💥 Crash

// CORRECT: Dispatch to main thread
dispatch_async(dispatch_get_main_queue(), ^{
    callback(message);
});
```

### 3. C++ Exceptions Across FFI Boundary

**Problem:** C++ exceptions unwind through C ABI → undefined behavior

**Solution:** Catch all exceptions in bridge

```cpp
extern "C" sch_result_t sch_engine_function(...) {
    try {
        // C++ code that might throw
        return SCH_OK;
    } catch (const std::exception& e) {
        // Log error
        return SCH_ERR_INTERNAL;
    } catch (...) {
        return SCH_ERR_INTERNAL;
    }
}
```

### 4. String Encoding Mismatches

**Problem:** Swift `String` is UTF-8, C uses `char*` (encoding undefined)

**Solution:** Explicit UTF-8 conversion

```swift
// WRONG: Assume C string is UTF-8
let string = String(cString: cString)  // 💥 Might crash if invalid UTF-8

// CORRECT: Validate and handle errors
let string = String(validatingUTF8: cString) ?? "<invalid UTF-8>"
```

### 5. ABI Incompatibility

**Problem:** C++ name mangling breaks Swift linkage

**Solution:** Always `extern "C"`

```cpp
// WRONG: Swift can't find this
void sch_engine_function(...) { ... }

// CORRECT: C ABI, no name mangling
extern "C" void sch_engine_function(...) { ... }
```

### 6. Atomic State Races

**Problem:** Reading atomic state while it's being updated

**Solution:** Use proper memory ordering

```cpp
// WRONG: No memory ordering (might see stale values)
value_.load();

// CORRECT: Acquire/release semantics
value_.load(std::memory_order_acquire);  // Reader
value_.store(new_value, std::memory_order_release);  // Writer
```

### 7. Callback Lifetime Issues

**Problem:** Callback captures `self` → retain cycle

**Solution:** Use `[weak self]` in closures

```swift
// WRONG: Retain cycle
engine.setCallback { message in
    self.handleMessage(message)  // 💥 Retain cycle
}

// CORRECT: Weak self
engine.setCallback { [weak self] message in
    guard let self = self else { return }
    self.handleMessage(message)
}
```

---

## Summary

This architecture provides:

1. **Clean separation of concerns:** Swift UI → C bridge → C++ engine
2. **Type safety:** Well-defined FFI types with validation
3. **Performance:** Lock-free queues, atomic state, binary serialization
4. **Maintainability:** Clear ownership semantics, documented error handling
5. **Testability:** Unit, integration, and performance tests defined

**Estimated implementation time:** 3-5 days (depending on complexity of Schillinger song processing)

**Next steps:**
1. Review and approve architecture
2. Create implementation branch
3. Begin Phase 1 (Core Bridge)
4. Track progress with `bd` (Beads)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
