# FFI Bridge Quick Reference Guide

**For:** Implementation Agent
**Purpose:** Quick reference during implementation
**Read:** Full architecture docs first!

---

## File Structure

```
juce_backend/src/ffi/
├── sch_engine_ffi.h                  # C header (CREATE THIS)
├── sch_engine_ffi.cpp                # Implementation (CREATE THIS)
├── sch_song_structs.hpp              # Data structures (CREATED)
├── sch_types.hpp                     # Existing types
└── sch_engine.hpp                    # Existing declarations

swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/
├── Audio/
│   ├── JUCEEngine.swift              # UPDATE THIS (replace NSLog)
│   └── SchillingerFFIProtocol.swift  # Swift protocol (CREATED)
└── Models/
    └── SchillingerSong.swift         # CREATE THIS
```

---

## Phase 1: Core Bridge (Day 1)

### Create sch_engine_ffi.cpp

```cpp
#include "sch_engine_ffi.h"
#include "sch_song_structs.hpp"
#include "sch_engine.hpp"
#include <juce_core/juce_core.h>

namespace {
    sch_result_t translate_exception(const std::exception& e) {
        std::cerr << "FFI Exception: " << e.what() << std::endl;
        return SCH_ERR_INTERNAL;
    }
}

extern "C" {

// Engine Lifecycle
sch_result_t sch_engine_create(sch_engine_handle* out_engine) {
    // Use existing implementation from sch_engine.mm
}

sch_result_t sch_engine_destroy(sch_engine_handle engine) {
    // Use existing implementation from sch_engine.mm
}

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

// Memory Management
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

// Utility Functions
const char* sch_result_to_string(sch_result_t result) {
    switch (result) {
        case SCH_OK: return "OK";
        case SCH_ERR_INVALID_ARG: return "Invalid argument";
        case SCH_ERR_NOT_FOUND: return "Not found";
        case SCH_ERR_REJECTED: return "Operation rejected";
        case SCH_ERR_DEFERRED: return "Operation deferred";
        case SCH_ERR_NOT_IMPLEMENTED: return "Not implemented";
        case SCH_ERR_ENGINE_NULL: return "Engine null";
        case SCH_ERR_INVALID_STATE: return "Invalid state";
        case SCH_ERR_INTERNAL: return "Internal error";
        default: return "Unknown error";
    }
}

bool sch_uuid_validate(const char* uuid) {
    // Basic UUID format validation
    if (!uuid) return false;

    // Check length (36 chars + null terminator)
    if (std::strlen(uuid) != 36) return false;

    // Check format: 8-4-4-4-12
    for (int i = 0; i < 36; ++i) {
        if (i == 8 || i == 13 || i == 18 || i == 23) {
            if (uuid[i] != '-') return false;
        } else {
            if (!std::isxdigit(uuid[i])) return false;
        }
    }

    return true;
}

} // extern "C"
```

### Update JUCEEngine.swift

```swift
import Foundation
import SchillingerFFI

public class JUCEEngine: ObservableObject {
    private let ffi = SchillingerFFI()
    private var engineHandle: OpaquePointer?

    // MARK: - Initialization

    public init() throws {
        engineHandle = try ffi.createEngine()
    }

    deinit {
        try? ffi.destroyEngine(engineHandle)
    }

    // MARK: - Version

    public func getVersion() throws -> String {
        return try ffi.getEngineVersion()
    }

    // MARK: - Error Handling

    enum JUCEEngineError: Error, LocalizedError {
        case engineNotInitialized
        case ffiError(SchResult)

        public var errorDescription: String? {
            switch self {
            case .engineNotInitialized:
                return "Engine not initialized"
            case .ffiError(let result):
                return result.message
            }
        }
    }
}
```

---

## Phase 2: Song Loading (Day 1.5)

### Implement sch_engine_load_song

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

        // Get engine implementation
        auto* engineImpl = get_engine_internal(engine);

        // Validate schema version
        if (!jsonVar.isObject()) return SCH_ERR_PARSE_FAILED;

        auto* obj = jsonVar.getDynamicObject();
        if (!obj->hasProperty("schemaVersion")) return SCH_ERR_PARSE_FAILED;

        juce::String version = obj->getProperty("schemaVersion").toString();
        if (version != "1.0") {
            std::cerr << "Unsupported schema version: " << version << std::endl;
            return SCH_ERR_NOT_SUPPORTED;
        }

        // Store song (TODO: Implement actual loading)
        engineImpl->currentSongJSON = json;

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}

sch_result_t sch_engine_get_song(
    sch_engine_handle engine,
    sch_string_t* out_json
) {
    if (!engine || !out_json) return SCH_ERR_INVALID_ARG;

    try {
        auto* engineImpl = get_engine_internal(engine);

        // Get current song JSON
        juce::String jsonString = engineImpl->currentSongJSON;

        // Allocate and copy
        out_json->data = static_cast<char*>(std::malloc(jsonString.length() + 1));
        std::strcpy(out_json->data, jsonString.toUTF8());
        out_json->length = jsonString.length();

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}

sch_result_t sch_engine_create_default_song(sch_engine_handle engine) {
    if (!engine) return SCH_ERR_INVALID_ARG;

    try {
        // Create minimal song JSON
        juce::DynamicObject::Ptr songObj = new juce::DynamicObject();
        songObj->setProperty("schemaVersion", "1.0");
        songObj->setProperty("songId", "00000000-0000-0000-0000-000000000000");
        songObj->setProperty("globals", juce::var::undefined());
        // TODO: Add minimal song structure

        juce::String jsonString = juce::JSON::toString(songObj);

        auto* engineImpl = get_engine_internal(engine);
        engineImpl->currentSongJSON = jsonString;

        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

### Create SchillingerSong.swift

```swift
import Foundation

struct SchillingerSong_v1: Codable {
    let schemaVersion: String
    let songId: String
    let globals: Globals
    let bookI_rhythmSystems: [RhythmSystem]
    let bookII_melodySystems: [MelodySystem]
    let bookIII_harmonySystems: [HarmonySystem]
    let bookIV_formSystem: FormSystem?
    let bookV_orchestration: OrchestrationSystem
    let ensembleModel: EnsembleModel
    let bindings: Bindings
    let constraints: [Constraint]
    let provenance: Provenance

    struct Globals: Codable {
        let tempo: Double
        let timeSignature: [Int]
        let key: Int
    }

    struct RhythmSystem: Codable {
        let systemId: String
        let systemType: String
        // ... other fields
    }

    // ... other system types

    static func minimal() -> SchillingerSong_v1 {
        return SchillingerSong_v1(
            schemaVersion: "1.0",
            songId: UUID().uuidString,
            globals: Globals(tempo: 120, timeSignature: [4, 4], key: 0),
            bookI_rhythmSystems: [],
            bookII_melodySystems: [],
            bookIII_harmonySystems: [],
            bookIV_formSystem: nil,
            bookV_orchestration: OrchestrationSystem(systemId: UUID().uuidString, systemType: "orchestration", roles: []),
            ensembleModel: EnsembleModel(version: "1.0", id: UUID().uuidString, voices: [], voiceCount: 0),
            bindings: Bindings(
                roleRhythmBindings: [],
                roleMelodyBindings: [],
                roleHarmonyBindings: [],
                roleEnsembleBindings: []
            ),
            constraints: [],
            provenance: Provenance(
                createdAt: ISO8601DateFormatter().string(from: Date()),
                createdBy: "system",
                modifiedAt: ISO8601DateFormatter().string(from: Date()),
                derivationChain: []
            )
        )
    }
}
```

### Update JUCEEngine.swift (song methods)

```swift
extension JUCEEngine {
    public func loadSong(_ song: SchillingerSong_v1) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(song)
        guard let json = String(data: data, encoding: .utf8) else {
            throw JUCEEngineError.ffiError(.internal)
        }

        try ffi.loadSong(engineHandle, json: json)
    }

    public func getSong() throws -> SchillingerSong_v1 {
        let json = try ffi.getSong(engineHandle)
        guard let data = json.data(using: .utf8) else {
            throw JUCEEngineError.ffiError(.internal)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(SchillingerSong_v1.self, from: data)
    }

    public func createDefaultSong() throws {
        try ffi.createDefaultSong(engineHandle)
    }
}
```

---

## Phase 3: Audio Control (Day 2)

### Integrate Existing Audio Functions

**Note:** These are already implemented in `audio_only_bridge.mm`

Add to `sch_engine_ffi.h`:

```c
// Audio Control (already implemented, expose in FFI)
sch_result_t sch_engine_audio_init(
    sch_engine_handle engine,
    const sch_audio_config_t* config
);

sch_result_t sch_engine_audio_start(sch_engine_handle engine);
sch_result_t sch_engine_audio_stop(sch_engine_handle engine);
sch_result_t sch_engine_get_audio_status(
    sch_engine_handle engine,
    sch_string_t* out_json
);

// MIDI Events (already implemented)
sch_result_t sch_engine_send_note_on(
    sch_engine_handle engine,
    int channel,
    int note,
    float velocity
);

sch_result_t sch_engine_send_note_off(
    sch_engine_handle engine,
    int channel,
    int note,
    float velocity
);

sch_result_t sch_engine_all_notes_off(sch_engine_handle engine);
```

### Implement Transport Functions

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
                // Call existing audio start
                return sch_engine_audio_start(engine);

            case SCH_TRANSPORT_STOPPED:
                // Call existing audio stop
                return sch_engine_audio_stop(engine);

            case SCH_TRANSPORT_PAUSED:
                // TODO: Implement pause
                return SCH_ERR_NOT_IMPLEMENTED;

            case SCH_TRANSPORT_RECORDING:
                // TODO: Implement recording
                return SCH_ERR_NOT_IMPLEMENTED;
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
        // TODO: Update tempo in engine
        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}

sch_result_t sch_engine_set_position(
    sch_engine_handle engine,
    double position
) {
    if (!engine || position < 0.0) return SCH_ERR_INVALID_ARG;

    try {
        auto* engineImpl = get_engine_internal(engine);
        // TODO: Update position in engine
        return SCH_OK;
    } catch (const std::exception& e) {
        return translate_exception(e);
    }
}
```

### Update Swift Audio Methods

```swift
extension JUCEEngine {
    public func initializeAudio(sampleRate: Double = 48000, bufferSize: UInt32 = 512) throws {
        let config = AudioConfig(
            sampleRate: sampleRate,
            bufferSize: bufferSize,
            inputChannels: 0,
            outputChannels: 2
        )
        try ffi.initializeAudio(engineHandle, config: config)
    }

    public func startAudio() throws {
        try ffi.startAudio(engineHandle)
    }

    public func stopAudio() throws {
        try ffi.stopAudio(engineHandle)
    }

    public func getAudioStatus() throws -> String {
        return try ffi.getAudioStatus(engineHandle)
    }

    // Transport
    public func play() throws {
        try ffi.setTransport(engineHandle, state: .playing)
    }

    public func stop() throws {
        try ffi.setTransport(engineHandle, state: .stopped)
    }

    public func setTempo(_ tempo: Double) throws {
        try ffi.setTempo(engineHandle, tempo: tempo)
    }

    public func setPosition(_ position: Double) throws {
        try ffi.setPosition(engineHandle, position: position)
    }

    // MIDI
    public func sendNoteOn(channel: Int, note: Int, velocity: Float) throws {
        try ffi.sendNoteOn(engineHandle, channel: channel, note: note, velocity: velocity)
    }

    public func sendNoteOff(channel: Int, note: Int, velocity: Float) throws {
        try ffi.sendNoteOff(engineHandle, channel: channel, note: note, velocity: velocity)
    }

    public func allNotesOff() throws {
        try ffi.allNotesOff(engineHandle)
    }
}
```

---

## Testing Checklist

### Phase 1 Tests

- [ ] Engine creates without crash
- [ ] Engine destroys without crash
- [ ] Version returns correctly
- [ ] No memory leaks (run with ASan)

### Phase 2 Tests

- [ ] Load song from JSON
- [ ] Get song as JSON
- [ ] Round-trip preserves data
- [ ] No memory leaks

### Phase 3 Tests

- [ ] Audio starts/stops cleanly
- [ ] Note events trigger sounds
- [ ] Tempo changes work
- [ ] No audio glitches

---

## Common Errors & Fixes

### "Undefined symbol" linker error

**Fix:** Ensure `sch_engine_ffi.cpp` is compiled and linked

```cmake
# juce_backend/src/ffi/CMakeLists.txt
add_library(schillinger_ffi STATIC
    sch_engine_ffi.cpp
    sch_song_structs.hpp
    sch_engine_ffi.h
)
```

### "Cannot find 'SchillingerFFI' in scope"

**Fix:** Ensure module map is correct

```swift
// swift_frontend/WhiteRoomiOS/FFI/schillinger.modulemap
module SchillingerFFI {
    header "sch_engine_ffi.h"
    export *
}
```

### Memory leak detected

**Fix:** Ensure all `malloc` have corresponding `free`

```swift
let json = try ffi.getSong(engineHandle)
defer { sch_free_string(&json) }  // MUST free
```

### Crash in callback

**Fix:** Always dispatch to main thread

```swift
let wrapper: sch_event_callback_t = { eventType, message, userData in
    DispatchQueue.main.async {  // CRITICAL
        self.handleEvent(eventType: eventType, message: message)
    }
}
```

---

## Quick Commands

```bash
# Create implementation branch
git checkout -b feature/ffi-bridge-implementation

# Build C++ code
cd juce_backend
cmake -B build
cmake --build build

# Build Swift code
cd swift_frontend
swift build

# Run tests
cd juce_backend
ctest

# Check for memory leaks
ASAN_OPTIONS=detect_leaks=1 ./tests/test_ffi

# Track work in bd
bd create "Phase 1: Core Bridge" --labels "ffi,phase-1"
```

---

## Need Help?

- **Architecture:** `plans/ffi-bridge-architecture.md`
- **Roadmap:** `plans/ffi-implementation-roadmap.md`
- **Summary:** `plans/ffi-bridge-summary.md`
- **C Header:** `juce_backend/src/ffi/sch_engine_ffi.h`
- **Swift Protocol:** `swift_frontend/.../SchillingerFFIProtocol.swift`

---

**Good luck! 🚀**
