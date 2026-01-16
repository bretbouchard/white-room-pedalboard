# API Documentation

Complete API reference for all White Room components.

## API Overview

White Room consists of several API layers:

- **JUCE Backend API** - C++ audio engine and plugin interface
- **Swift Frontend API** - SwiftUI user interface components
- **TypeScript SDK API** - Shared type definitions and interfaces
- **FFI Bridge API** - Swift/C++ interop layer
- **Error Handling API** - Comprehensive error management

## Quick Reference

### JUCE Backend API

**Core Classes:**
- `SchillingerEngine` - Main music theory engine
- `PluginProcessor` - Base audio processor class
- `FFIEngine` - FFI bridge implementation

**Key Functions:**
```cpp
// Engine lifecycle
sch_result_t sch_engine_create(sch_engine_handle* out_engine);
sch_result_t sch_engine_destroy(sch_engine_handle engine);

// Audio control
sch_result_t sch_engine_audio_init(sch_engine_handle engine, const sch_audio_config_t* config);
sch_result_t sch_engine_audio_start(sch_engine_handle engine);
sch_result_t sch_engine_audio_stop(sch_engine_handle engine);

// Performance blend
sch_result_t sch_engine_set_performance_blend(
    sch_engine_handle engine,
    const char* performance_a_id,
    const char* performance_b_id,
    double blend_value
);
```

**Documentation:** [JUCE Backend API](./juce-backend.md)

### Swift Frontend API

**Core Classes:**
- `JUCEEngine` - FFI bridge wrapper (singleton)
- `PerformanceBlender` - Performance blend interface
- `SchillingerControls` - Schillinger system UI

**Key Methods:**
```swift
// Engine lifecycle
func startEngine()
func stopEngine()

// Performance blend
func setPerformanceBlend(_ perfA: PerformanceInfo, _ perfB: PerformanceInfo, blendValue: Double)

// State management
@Published var isEngineRunning: Bool
@Published var currentBlendValue: Double
```

**Documentation:** [Swift Frontend API](./swift-frontend.md)

### TypeScript SDK API

**Core Types:**
- `AudioConfig` - Audio configuration
- `PerformanceInfo` - Performance metadata
- `SchillingerSystem` - Schillinger system types
- `WhiteRoomError` - Error types

**Key Interfaces:**
```typescript
// Audio configuration
interface AudioConfig {
    sampleRate: number;
    bufferSize: number;
    inputChannels: number;
    outputChannels: number;
}

// Performance information
interface PerformanceInfo {
    id: string;
    name: string;
    description: string;
    duration?: number;
}

// Error types
class WhiteRoomError extends Error {
    readonly code: string;
    readonly severity: ErrorSeverity;
    readonly category: ErrorCategory;
}
```

**Documentation:** [TypeScript SDK API](./typescript-sdk.md)

### FFI Bridge API

**C Interface:**
```c
// Engine lifecycle
sch_result_t sch_engine_create(sch_engine_handle* out_engine);
sch_result_t sch_engine_destroy(sch_engine_handle engine);

// Audio control
sch_result_t sch_engine_audio_init(sch_engine_handle engine, const sch_audio_config_t* config);
sch_result_t sch_engine_audio_start(sch_engine_handle engine);
sch_result_t sch_engine_audio_stop(sch_engine_handle engine);

// Performance blend
sch_result_t sch_engine_set_performance_blend(
    sch_engine_handle engine,
    const char* performance_a_id,
    const char* performance_b_id,
    double blend_value
);

// JSON commands
sch_result_t sch_engine_send_command(sch_engine_handle engine, const char* json_command);

// Utilities
const char* sch_result_to_string(sch_result_t result);
void sch_free_string(char* str);
```

**Type Definitions:**
```c
typedef void* sch_engine_handle;

typedef enum {
    SCH_OK = 0,
    SCH_ERR_INVALID_ARG = 1,
    SCH_ERR_ENGINE_FAILED = 2,
    SCH_ERR_NOT_IMPLEMENTED = 3
} sch_result_t;

typedef struct {
    double sample_rate;
    int buffer_size;
    int input_channels;
    int output_channels;
} sch_audio_config_t;
```

**Documentation:** [FFI Bridge API](./ffi-bridge.md)

### Error Handling API

**Swift Errors:**
```swift
public enum WhiteRoomError: LocalizedError, Codable, Sendable {
    case audio(AudioError)
    case ffi(FFIError)
    case fileIO(FileIOError)
    case schillinger(SchillingerError)
    case performance(PerformanceError)
}
```

**C++ Errors:**
```cpp
struct WhiteRoomError {
    ErrorCategory category;
    ErrorSeverity severity;
    WhiteRoomErrorVariant error;
    juce::String code;
    juce::String userMessage;
    juce::String technicalDetails;
};
```

**TypeScript Errors:**
```typescript
export class WhiteRoomError extends Error {
    readonly code: string;
    readonly severity: ErrorSeverity;
    readonly category: ErrorCategory;
    readonly context?: Record<string, unknown>;
}
```

**Documentation:** [Error Handling API](./error-handling.md)

## API Usage Examples

### Example 1: Initialize Audio Engine

**Swift:**
```swift
import SchillingerFFI

let engine = JUCEEngine.shared
engine.startEngine()

// Check engine state
if engine.isEngineRunning {
    print("Engine started successfully")
}
```

**C++:**
```cpp
sch_engine_handle engine;
sch_result_t result = sch_engine_create(&engine);

if (result == SCH_OK) {
    sch_audio_config_t config = {
        .sample_rate = 48000.0,
        .buffer_size = 256,
        .input_channels = 0,
        .output_channels = 2
    };

    sch_engine_audio_init(engine, &config);
    sch_engine_audio_start(engine);
}
```

### Example 2: Set Performance Blend

**Swift:**
```swift
let perfA = PerformanceInfo(
    id: "piano",
    name: "Piano",
    description: "Grand piano performance"
)

let perfB = PerformanceInfo(
    id: "techno",
    name: "Techno",
    description: "Electronic techno beat"
)

// Set 50% blend
JUCEEngine.shared.setPerformanceBlend(perfA, perfB, blendValue: 0.5)
```

**C++:**
```cpp
sch_engine_set_performance_blend(
    engine,
    "piano",
    "techno",
    0.5
);
```

### Example 3: Handle Errors

**Swift:**
```swift
do {
    try engine.startEngine()
} catch {
    let error = error as? WhiteRoomError ?? WhiteRoomError.ffi(.callFailed(
        reason: "Unknown error",
        suggestion: "Check engine state"
    ))

    ErrorLogger.shared.log(error)
    viewModel.error = error
}
```

**C++:**
```cpp
auto result = sch_engine_audio_start(engine);
if (result != SCH_OK) {
    auto error = WhiteRoomError::audioEngineFailed(
        sch_result_to_string(result)
    );
    ErrorHandler::logError(error);
    return ErrorHandler::createFailure(error);
}
```

### Example 4: Send JSON Command

**Swift:**
```swift
let command = """
{
    "type": "set_parameter",
    "parameter_id": "master_volume",
    "value": 0.75
}
"""

JUCEEngine.shared.sendCommand(command)
```

**C++:**
```cpp
const char* command = R"(
{
    "type": "set_parameter",
    "parameter_id": "master_volume",
    "value": 0.75
}
)";

sch_engine_send_command(engine, command);
```

## API Versioning

White Room uses semantic versioning for APIs:

- **Major version** - Breaking changes
- **Minor version** - New features, backward compatible
- **Patch version** - Bug fixes, backward compatible

**Current Version:** 1.0.0

**Version Compatibility:**
- Swift API: 1.0.0
- C++ API: 1.0.0
- TypeScript API: 1.0.0
- FFI API: 1.0.0 (stable ABI)

## API Stability

### Stable APIs

These APIs are stable and will not change without major version bump:

- FFI Bridge API (C interface)
- Core TypeScript types
- JUCE plugin processor interface

### Evolving APIs

These APIs may change between minor versions:

- Swift UI components
- Internal C++ classes
- Utility functions

### Experimental APIs

These APIs are experimental and may change at any time:

- New Schillinger systems
- Advanced features
- Performance optimization APIs

## API Design Principles

### Consistency

- **Naming:** Consistent naming conventions across languages
- **Parameters:** Similar parameter order where possible
- **Return Types:** Consistent error handling patterns

### Safety

- **Type Safety:** Strong typing across all APIs
- **Null Safety:** Explicit null handling
- **Error Handling:** Comprehensive error types

### Performance

- **Real-Time Safe:** Audio APIs optimized for real-time
- **Zero-Copy:** Minimize data copying where possible
- **Lock-Free:** Use lock-free data structures

### Usability

- **Documentation:** Complete API documentation
- **Examples:** Code examples for all major operations
- **Error Messages:** Clear, actionable error messages

## API Support

### Documentation

- **API References:** Complete documentation for each API
- **Code Examples:** Real-world usage examples
- **Best Practices:** Guidelines for effective API usage

### Tools

- **Type Definitions:** TypeScript definitions for type safety
- **Code Generation:** Auto-generated bindings where applicable
- **Validation:** Runtime validation tools

### Community

- **Issues:** Report bugs and request features
- **Discussions:** Ask questions and share knowledge
- **PRs:** Contribute improvements and fixes

## Next Steps

- [JUCE Backend API](./juce-backend.md) - C++ audio engine reference
- [Swift Frontend API](./swift-frontend.md) - SwiftUI interface reference
- [TypeScript SDK API](./typescript-sdk.md) - Shared types reference
- [FFI Bridge API](./ffi-bridge.md) - FFI bridge reference
- [Error Handling API](./error-handling.md) - Error management reference

---

**Last Updated:** 2026-01-15
**API Version:** 1.0.0
