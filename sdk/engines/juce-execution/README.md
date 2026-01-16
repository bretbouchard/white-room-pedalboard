# Schillinger Audio Execution Engine for JUCE/C++

**⚠️ IMPORTANT**: This is an **execution engine**, not an SDK. It consumes IR from the TypeScript SDK and renders audio. It does NOT implement music generation logic.

## Architecture Role

```
TypeScript SDK (authoritative) → PatternIR/ControlIR → JUCE Execution Engine → Audio
```

**What this engine does:**
- ✅ Consumes PatternIR, ControlIR, InstrumentIR from TypeScript
- ✅ Schedules musical events from TimelineIR
- ✅ Renders high-quality audio
- ✅ Hosts VST/AU plugins
- ✅ Manages audio hardware

**What this engine does NOT do:**
- ❌ Generate rhythmic patterns (TypeScript SDK)
- ❌ Generate harmony (TypeScript SDK)
- ❌ Generate melody (TypeScript SDK)
- ❌ Make compositional decisions (TypeScript SDK)
- ❌ Expose "RhythmAPI", "HarmonyAPI", etc.

## Features

- **IR-Based Architecture**: Consumes serialized IR from TypeScript SDK
- **JUCE-Compatible**: Built following JUCE coding standards and memory management
- **Real-Time Safe**: Designed for audio applications with real-time constraints
- **Plugin Hosting**: VST/AU plugin hosting for instruments and effects
- **Hardware Integration**: Audio device management and MIDI I/O

## Requirements

- JUCE Framework 7.0+
- C++17 or later
- CMake 3.15+
- **TypeScript SDK** (for IR definitions and generation)

## Installation

### Using CMake

1. Add the execution engine as a subdirectory in your CMakeLists.txt:

```cmake
add_subdirectory(path/to/juce-execution)
target_link_libraries(YourTarget PRIVATE SchillingerExecution)
```

2. Include the execution engine header:

```cpp
#include "SchillingerExecution.h"
```

## Quick Start

### Basic IR Consumption

```cpp
#include "SchillingerExecution.h"
using namespace Schillinger::Execution;

// Initialize execution engine
auto engine = std::make_unique<ExecutionEngine>();

// Configure audio
EngineOptions options;
options.sampleRate = 48000;
options.bufferSize = 512;

auto result = engine->initialize(options);
if (!result.wasOk()) {
    DBG("Failed to initialize: " << result.getErrorMessage());
    return;
}

// Load IR from TypeScript SDK (JSON format)
std::string irJson = loadIRFromFile("pattern.json");
engine->loadPatternIR(irJson);

// Start audio rendering
engine->startPlayback();
```

### IR Input Format

The engine consumes IR in JSON format from the TypeScript SDK:

```json
{
  "version": "1.0",
  "id": "pattern-123",
  "type": "resultant",
  "events": [
    {
      "time": 0.0,
      "pitch": 60,
      "velocity": 127,
      "duration": 0.5
    }
  ]
}
```

## API Reference

### ExecutionEngine

Main class for audio rendering and IR consumption.

**Methods:**
- `initialize(EngineOptions)`: Initialize audio engine
- `loadPatternIR(json)`: Load pattern IR from TypeScript
- `loadControlIR(json)`: Load control curves (automation)
- `loadInstrumentIR(json)`: Load instrument configuration
- `startPlayback()`: Begin audio rendering
- `stopPlayback()`: Stop audio rendering
- `setTimelinePosition(time)`: Seek to position

## Integration Patterns

### With TypeScript SDK (Recommended)

1. TypeScript SDK generates IR and serializes to JSON
2. Swift host loads JS via JSCore, calls TS functions
3. Swift receives IR JSON, passes to JUCE execution engine
4. JUCE renders audio

```swift
// Swift bridge layer
let tsSDK = loadJSCore()  // Load TypeScript
let irJson = tsSDK.generatePattern(params)  // Get IR from TS
juceEngine.loadPatternIR(irJson)  // Pass to JUCE
juceEngine.startPlayback()  // Render audio
```

### Direct IR Loading (Advanced)

You can load pre-generated IR files directly:

```cpp
engine->loadPatternIRFromFile("patterns/pattern123.json");
engine->loadControlIRFromFile("automation/curves.json");
engine->startPlayback();
```

## Error Handling

The engine uses JUCE's `Result` type:

```cpp
auto result = engine->loadPatternIR(irJson);
if (!result.wasOk()) {
    // Handle error
    std::cerr << "IR load failed: " << result.getErrorMessage() << std::endl;
}
```

## Thread Safety

- **Audio Thread**: All rendering happens on the audio thread (real-time safe)
- **GUI Thread**: IR loading and configuration should happen on GUI/message thread
- **Lock-Free**: Uses lock-free queues for IR updates

## Performance Considerations

- **IR Parsing**: Parse IR on loading, not during audio rendering
- **Memory Pooling**: Pre-allocate memory for events
- **Vectorization**: Use SIMD for audio processing where possible
- **Avoid Allocation**: Never allocate memory on the audio thread

## Migration from Old "SDK" Pattern

If you have code using the old "SchillingerSDK" API:

**OLD (deprecated):**
```cpp
auto sdk = std::make_unique<SchillingerSDK>();
sdk->generateResultant(3, 4);  // ❌ Don't do this
```

**NEW (correct):**
```cpp
auto engine = std::make_unique<ExecutionEngine>();
// Get IR from TypeScript SDK
engine->loadPatternIR(irJson);  // ✅ Do this instead
```

## Documentation

- **IR Schema**: See `@schillinger-sdk/shared` TypeScript types
- **TypeScript SDK**: [../../README.md](../../README.md)
- **Architecture Authority**: [../../docs/ARCHITECTURE_AUTHORITY.md](../../docs/ARCHITECTURE_AUTHORITY.md)

## Examples

See `examples/` directory for:
- Basic IR loading and playback
- Real-time IR updates
- Plugin hosting
- MIDI integration

## License

MIT License - see LICENSE file for details

## Contributing

This package consumes IR defined by the TypeScript SDK. All music generation logic lives in TypeScript. This engine is for audio rendering only.

For generator logic, see: [../../packages/core/](../../packages/core/)
