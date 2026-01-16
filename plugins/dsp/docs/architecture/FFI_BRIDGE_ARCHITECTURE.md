# Schillinger FFI Bridge - Swift to JUCE Audio Engine

## Overview

The Schillinger FFI (Foreign Function Interface) bridge enables real-time audio communication between the Swift frontend UI and the JUCE C++ audio backend. This document describes the architecture, implementation, and usage of the FFI bridge.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Swift Frontend (UI)                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  JUCEEngine.swift                                         │ │
│  │  - Manages engine lifecycle                               │ │
│  │  - Handles performance blend state                        │ │
│  │  - Thread-safe operations via engineQueue                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FFI Calls (C)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Swift Module Map (schillinger.modulemap)          │
│  - Exposes C headers to Swift                                  │
│  - Type-safe interop layer                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ C Functions
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              C FFI Layer (sch_engine.hpp/sch_engine.mm)          │
│  - extern "C" wrapper functions                               │
│  - C-compatible types (sch_types.hpp)                         │
│  - Error handling and validation                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ C++ Implementation
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   JUCE C++ Audio Engine                        │
│  - AudioDeviceManager                                         │
│  - AudioSourcePlayer                                          │
│  - SineWaveGenerator (demo)                                   │
│  - Real-time audio processing                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Swift Frontend Layer

**File:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Audio/JUCEEngine.swift`

**Key Features:**
- Singleton pattern (`JUCEEngine.shared`)
- `@Published` properties for reactive UI updates
- Thread-safe operations via dedicated `engineQueue`
- Automatic engine initialization on first access
- Proper cleanup in `deinit`

**Key Methods:**
```swift
// Engine Lifecycle
func startEngine()              // Start audio processing
func stopEngine()               // Stop audio processing

// Performance Blend
func setPerformanceBlend(_ perfA: PerformanceInfo, _ perfB: PerformanceInfo, blendValue: Double)
```

### 2. Swift Module Map

**File:** `swift_frontend/WhiteRoomiOS/FFI/schillinger.modulemap`

**Purpose:** Exposes C headers to Swift with type safety

```swift
module SchillingerFFI {
    header "sch_engine.hpp"
    export *
}
```

**Symlinks:**
- `sch_engine.hpp` → `../../juce_backend/src/ffi/sch_engine.hpp`
- `sch_types.hpp` → `../../juce_backend/src/ffi/sch_types.hpp`

### 3. C FFI Layer

**Files:**
- `juce_backend/src/ffi/sch_engine.hpp` - Function declarations
- `juce_backend/src/ffi/sch_types.hpp` - Type definitions
- `juce_backend/src/ffi/sch_engine.mm` - Implementation

**Key Functions:**

```c
// Engine Lifecycle
sch_result_t sch_engine_create(sch_engine_handle* out_engine);
sch_result_t sch_engine_destroy(sch_engine_handle engine);

// Audio Configuration
sch_result_t sch_engine_audio_init(sch_engine_handle engine, const sch_audio_config_t* config);
sch_result_t sch_engine_audio_start(sch_engine_handle engine);
sch_result_t sch_engine_audio_stop(sch_engine_handle engine);

// Performance Blend (Swift Frontend Integration)
sch_result_t sch_engine_set_performance_blend(
    sch_engine_handle engine,
    const char* performance_a_id,
    const char* performance_b_id,
    double blend_value
);

// JSON Command Interface
sch_result_t sch_engine_send_command(sch_engine_handle engine, const char* json_command);

// Utility
const char* sch_result_to_string(sch_result_t result);
```

## Usage Example

### Swift Code

```swift
import SchillingerFFI

class MyViewController: UIViewController {
    private let engine = JUCEEngine.shared

    override func viewDidLoad() {
        super.viewDidLoad()

        // Start the engine
        engine.startEngine()

        // Set performance blend
        let perfA = PerformanceInfo(id: "piano", name: "Piano", description: "...")
        let perfB = PerformanceInfo(id: "techno", name: "Techno", description: "...")

        // 50% blend
        engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)
    }

    deinit {
        // Stop the engine
        engine.stopEngine()
    }
}
```

## FFI Function Flow

### Performance Blend Operation

1. **Swift UI** calls `JUCEEngine.setPerformanceBlend()`
2. **JUCEEngine** validates blend value (0.0-1.0)
3. **JUCEEngine** updates `@Published` properties on main thread
4. **JUCEEngine** calls `sendBlendCommand()` on `engineQueue`
5. **sendBlendCommand()** calls C function `sch_engine_set_performance_blend()`
6. **C FFI** validates arguments and stores parameters
7. **C FFI** updates tone generator frequency/amplitude (demo)
8. **C FFI** invokes parameter callback
9. **JUCE Engine** processes audio in real-time

### Error Handling

All FFI functions return `sch_result_t`:
- `SCH_OK` (0) - Success
- `SCH_ERR_INVALID_ARG` - Invalid argument
- `SCH_ERR_ENGINE_FAILED` - Engine operation failed
- `SCH_ERR_NOT_IMPLEMENTED` - Feature not yet implemented

Swift converts C errors to NSLog messages and handles gracefully.

## Thread Safety

### Swift Side
- All engine operations run on dedicated `engineQueue` (QoS: userInitiated)
- UI updates always dispatched to main thread
- `@Published` properties are thread-safe

### C++ Side
- Engine uses JUCE `AudioDeviceManager` for thread-safe audio
- Parameters stored in `juce::StringPairArray` (thread-safe)
- Callbacks invoked from FFI thread

## Memory Management

### Swift Side
- Automatic via ARC (Automatic Reference Counting)
- `OpaquePointer` for C handle management
- Proper cleanup in `deinit`

### C++ Side
- Manual memory management with `new`/`delete`
- String memory allocated with `std::malloc()` must be freed with `sch_free_string()`
- Engine destroyed with `sch_engine_destroy()`

## Platform Support

### macOS (v12+)
- Full JUCE `AudioDeviceManager` support
- Real-time audio callbacks
- Native audio device selection

### iOS (v15+)
- Direct audio mode (bypasses `AudioDeviceManager`)
- Requires `AVAudioSession` setup (TODO)
- Currently using sine wave generator for demo

### tvOS (v15+)
- Inherits iOS implementation
- No audio output currently (mocked)

## Current Limitations

1. **Demo Audio Only**
   - Current implementation uses `SineWaveGenerator` for demonstration
   - Real performance blending requires actual audio engine implementation
   - TODO: Integrate with `ProjectionEngine` for real rendering

2. **iOS Audio**
   - `AudioDeviceManager` requires complex setup on iOS
   - TODO: Implement proper `AVAudioEngine` integration
   - Currently bypassed with direct tone generator

3. **Performance Management**
   - Performances are hardcoded in Swift for now
   - TODO: Fetch from JUCE backend via `sch_engine_list_parameters()`

4. **Callbacks**
   - Error/transport/parameter callbacks defined but not fully utilized
   - TODO: Implement Swift callback handlers for real-time feedback

## Build Integration

### Linking the FFI Library

The FFI bridge must be linked with both Swift and JUCE code:

**Swift Package Manager:**
```swift
// Package.swift
.target(
    name: "SwiftFrontendCore",
    dependencies: [],
    cSettings: [
        .headerSearchPath("FFI"),  // For module map
        .define("SCHILLINGER_FFI", to: "1")
    ],
    linkerSettings: [
        .linkedLibrary("schillinger"),
        .unsafeFlags(["-L\(path_to_juce_backend/build)"])
    ]
)
```

**CMake (JUCE):**
```cmake
# juce_backend/src/ffi/CMakeLists.txt
add_library(schillinger-ffi STATIC
    sch_engine.cpp
    sch_types.cpp
)

target_include_directories(schillinger-ffi PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
)
```

## Testing

### Unit Tests

**Swift Tests:**
```swift
func testEngineInitialization() {
    let engine = JUCEEngine.shared
    XCTAssertNotNil(engine.engineHandle)
}

func testPerformanceBlend() {
    let engine = JUCEEngine.shared
    let perfA = PerformanceInfo(id: "test_a", name: "Test A", description: "")
    let perfB = PerformanceInfo(id: "test_b", name: "Test B", description: "")

    engine.setPerformanceBlend(perfA, perfB, blendValue: 0.5)

    XCTAssertEqual(engine.currentBlendValue, 0.5)
}
```

### Integration Tests

1. Start engine
2. Verify audio output (check for sine wave)
3. Set blend to 0.0 (should hear 220Hz)
4. Set blend to 1.0 (should hear 880Hz)
5. Stop engine
6. Verify no audio output

## Future Enhancements

1. **Real Performance Blending**
   - Integrate with `ProjectionEngine`
   - Crossfade between actual audio performances
   - Use JUCE `AudioSource` chaining

2. **Advanced Features**
   - MIDI learn for blend control
   - Automation recording/playback
   - Preset save/load

3. **Performance Optimization**
   - Reduce FFI call overhead
   - Batch parameter updates
   - Real-time safe memory allocation

4. **Error Recovery**
   - Automatic engine restart on crash
   - Graceful degradation on audio errors
   - User-friendly error messages

## Debugging

### Enable FFI Logging

**Swift:**
```swift
import os.log
let log = OSLog(subsystem: "com.whiteroom.audio", category: "FFI")
os_log("FFI call: %{public}@", log: log, type: .debug, "sch_engine_create")
```

**C++:**
```cpp
#define ENABLE_FFI_DEBUG 1
#if ENABLE_FFI_DEBUG
    DBG("SchillingerEngine: " << message);
#endif
```

**Console:**
```bash
log stream --predicate 'subsystem == "com.whiteroom.audio"' --level debug
```

## Related Documentation

- [JUCE Backend Architecture](../../juce_backend/README.md)
- [Swift Frontend Guide](../../swift_frontend/README.md)
- [Platform Capabilities Matrix](./PLATFORM_CAPABILITIES_MATRIX.md)

## Version History

- **v1.0.0** (2025-01-15) - Initial FFI bridge implementation
  - Engine lifecycle management
  - Performance blend operations
  - Platform-specific audio handling
  - Swift module map integration

---

**Last Updated:** 2025-01-15
**Status:** Complete - white_room-308
