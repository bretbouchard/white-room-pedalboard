# Architecture Overview

This document provides a comprehensive overview of the White Room system architecture, including design principles, component interactions, and technology choices.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Design Principles](#design-principles)
3. [Technology Stack](#technology-stack)
4. [Component Overview](#component-overview)
5. [Data Flow](#data-flow)
6. [Threading Model](#threading-model)
7. [Memory Management](#memory-management)
8. [Platform Support](#platform-support)

---

## System Architecture

White Room follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Swift Frontend (SwiftUI)                                  │ │
│  │  - iOS/macOS/tvOS native UI                                │ │
│  │  - Reactive state management                               │ │
│  │  - Performance blend interface                             │ │
│  │  - Schillinger system controls                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FFI Bridge (C Interface)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Business Logic Layer                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  JUCE C++ Backend                                          │ │
│  │  - Real-time audio processing                              │ │
│  │  - Plugin host integration (VST3/AU/CLAP)                  │ │
│  │  - Schillinger music theory engine                         │ │
│  │  - Performance blending system                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Type Definitions & Serialization
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Data Layer                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TypeScript SDK                                            │ │
│  │  - Shared type definitions                                 │ │
│  │  - API interfaces                                          │ │
│  │  - Error types                                             │ │
│  │  - Serialization utilities                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Language Separation** - Each layer uses the best language for its purpose
   - Swift for UI (modern, reactive, type-safe)
   - C++ for audio (real-time performance, low-level control)
   - TypeScript for tooling (excellent type system, ecosystem)

2. **FFI Bridge** - Minimal C interface between Swift and C++
   - Type-safe interop via Swift module maps
   - Explicit memory management
   - Thread-safe operations

3. **Plugin Architecture** - Extensible plugin system
   - Each plugin is self-contained
   - Shared Schillinger systems
   - Common infrastructure

---

## Design Principles

### SLC Development Philosophy

White Room follows the **SLC (Simple, Lovable, Complete)** philosophy:

- **Simple** - Focused features, intuitive design, zero learning curve
- **Lovable** - Delights users, solves problems magically
- **Complete** - Fulfills core promise without workarounds or gaps

**No workarounds, no stub methods, no TODOs without tickets.**

### Core Principles

1. **Real-Time Safety First**
   - All audio code must be real-time safe
   - No blocking operations in audio thread
   - Lock-free data structures where possible
   - Deterministic memory allocation

2. **Type Safety Across Boundaries**
   - TypeScript types shared across stack
   - FFI types explicitly defined
   - Compile-time validation
   - Runtime type checking

3. **Thread Safety by Design**
   - Dedicated threads for specific tasks
   - Clear ownership of data
   - Minimal shared state
   - Lock-free communication

4. **Error Handling Throughout**
   - Comprehensive error types
   - User-friendly error messages
   - Recovery strategies
   - Logging and monitoring

5. **Testability**
   - Unit tests for all components
   - Integration tests for boundaries
   - E2E tests for workflows
   - Test fixtures and mocks

---

## Technology Stack

### Programming Languages

| Language | Purpose | Version | Rationale |
|----------|---------|---------|-----------|
| **C++** | Audio Engine | C++17/20 | Real-time performance, JUCE framework |
| **Swift** | UI Layer | Swift 5.9+ | Modern, reactive, native iOS/macOS |
| **TypeScript** | SDK/Tooling | TypeScript 5.0+ | Type safety, excellent ecosystem |
| **Python** | Utilities | Python 3.10+ | Scripting, automation, build tools |
| **C** | FFI Bridge | C11 | Language interop, stable ABI |

### Frameworks & Libraries

#### JUCE Backend

- **JUCE 7** - Audio plugin framework
- **CMake** - Build system
- **Google Test** - Unit testing
- **CLAP Extensions** - CLAP plugin support

#### Swift Frontend

- **SwiftUI** - UI framework
- **Combine** - Reactive programming
- **AVFoundation** - Audio on iOS
- **Swift Package Manager** - Dependency management

#### TypeScript SDK

- **TypeScript Compiler** - Type checking
- **Vitest** - Unit testing
- **ESLint** - Linting
- **Prettier** - Code formatting

### Build Systems

| Component | Build System | Config Files |
|-----------|--------------|--------------|
| JUCE Backend | CMake | `CMakeLists.txt` |
| Swift Frontend | Xcode/SPM | `Package.swift`, `.xcodeproj` |
| TypeScript SDK | NPM | `package.json`, `tsconfig.json` |
| Documentation | Markdown | `*.md` files |

---

## Component Overview

### JUCE C++ Backend

**Purpose:** Real-time audio processing and plugin host integration

**Key Components:**

```cpp
juce_backend/
├── src/
│   ├── plugins/              // Plugin implementations
│   │   ├── LocalGal/        // Acid synthesizer
│   │   ├── NexSynth/        // FM synthesizer
│   │   ├── SamSampler/      // SF2 sampler
│   │   └── ...
│   ├── schillinger/         // Music theory systems
│   │   ├── rhythm/          // Rhythm generators
│   │   ├── pitch/           // Pitch/scale systems
│   │   └── harmony/         // Harmonic progressions
│   ├── ffi/                 // Swift/C++ bridge
│   │   ├── sch_engine.hpp   // C interface
│   │   ├── sch_types.hpp    // Type definitions
│   │   └── sch_engine.mm    // Implementation
│   └── core/                // Shared utilities
│       ├── audio/           // Audio processing
│       ├── midi/            // MIDI handling
│       └── utils/           // Utilities
└── tests/                   // Unit tests
```

**Responsibilities:**
- Real-time audio processing (audio thread)
- MIDI/OSC message handling
- Plugin host integration
- Parameter automation
- State management
- Schillinger system execution

### Swift Frontend

**Purpose:** Native user interface for iOS/macOS/tvOS

**Key Components:**

```swift
swift_frontend/WhiteRoomiOS/
└── Sources/
    ├── SwiftFrontendCore/
    │   ├── Audio/
    │   │   └── JUCEEngine.swift      // FFI bridge wrapper
    │   ├── Performances/
    │   │   └── PerformanceBlender.swift  // Blend interface
    │   ├── Schillinger/
    │   │   └── SystemControls.swift  // Schillinger UI
    │   └── Views/
    │       └── MainView.swift        // Main UI
    └── WhiteRoomiOS/
        └── App.swift                 // App entry point
```

**Responsibilities:**
- Reactive UI updates
- User input handling
- State management
- Error display
- Performance blend control

### TypeScript SDK

**Purpose:** Shared type definitions and tooling

**Key Components:**

```typescript
sdk/
├── src/
│   ├── types/               // Type definitions
│   │   ├── audio.ts         // Audio types
│   │   ├── schillinger.ts   // Schillinger types
│   │   └── ffi.ts           // FFI types
│   ├── api/                 // API interfaces
│   │   ├── engine.ts        // Engine API
│   │   └── parameters.ts    // Parameter API
│   └── utils/               // Utilities
│       ├── serialization.ts // JSON serialization
│       └── validation.ts    // Type validation
└── tests/                   // Unit tests
```

**Responsibilities:**
- Type safety across stack
- API contracts
- Serialization/deserialization
- Validation utilities
- Documentation generation

---

## Data Flow

### Audio Flow (Real-Time Path)

```
┌─────────────────────────────────────────────────────────────┐
│  DAW / Host Application                                    │
│  - Provides audio buffer                                    │
│  - Provides MIDI input                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ processBlock()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  JUCE Audio Processor (Audio Thread)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Read MIDI input                                  │  │
│  │  2. Update parameters (automation)                   │  │
│  │  3. Process audio                                    │  │
│  │  4. Generate output                                  │  │
│  │  5. Write to output buffer                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Audio Output
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Audio Output (Speakers/Headphones)                         │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Audio thread runs at high priority (real-time)
- No blocking operations allowed
- All memory allocations pre-allocated
- Deterministic execution time

### UI Control Flow (Non-Real-Time Path)

```
┌─────────────────────────────────────────────────────────────┐
│  SwiftUI View (Main Thread)                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. User interacts with UI control                   │  │
│  │  2. View updates @Published state                    │  │
│  │  3. Triggers engine operation                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ engineQueue (QoS: userInitiated)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  JUCEEngine (Swift)                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Validate input                                   │  │
│  │  2. Call FFI function                                │  │
│  │  3. Handle errors                                    │  │
│  │  4. Update UI state                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ C FFI Call
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  C FFI Bridge (Background Thread)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Validate arguments                              │  │
│  │  2. Call C++ engine method                          │  │
│  │  3. Return result                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ C++ Method Call
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  JUCE Engine (C++)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Update internal state                           │  │
│  │  2. Store parameter for next audio callback          │  │
│  │  3. Invoke callback (if applicable)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
- UI updates on main thread
- Engine operations on background queue
- FFI calls are asynchronous
- Thread-safe parameter updates

### Performance Blend Flow

```
User Interface (Swift)
       │
       │ setPerformanceBlend(perfA, perfB, t=0.5)
       ▼
JUCEEngine (Swift)
       │
       │ sch_engine_set_performance_blend(idA, idB, 0.5)
       ▼
C FFI Bridge
       │
       │ validate parameters
       │ store blend parameters
       ▼
JUCE Engine (C++)
       │
       │ Update blend state
       │ Notify audio thread
       ▼
Audio Thread
       │
       │ Render audio from perfA (50%)
       │ Render audio from perfB (50%)
       │ Blend and output
       ▼
Audio Output
```

---

## Threading Model

### Thread Overview

| Thread | Purpose | Priority | Real-Time |
|--------|---------|----------|-----------|
| **Main Thread** | UI updates, user input | Normal | No |
| **Audio Thread** | Audio processing | High | Yes |
| **Engine Queue** | FFI operations | User Initiated | No |
| **Background Threads** | File I/O, monitoring | Low | No |

### Thread Safety

**Main Thread:**
- SwiftUI view updates
- User input handling
- UI state changes

**Engine Queue:**
- FFI bridge calls
- Parameter updates
- Non-real-time engine operations

**Audio Thread:**
- Real-time audio processing
- MIDI message handling
- Parameter smoothing
- **NO BLOCKING OPERATIONS**

**Thread Communication:**

```cpp
// Lock-free parameter update (C++)
void AudioProcessor::setParameter(int index, float value) {
    // Atomic write to parameter queue
    parameterQueue.set(index, value);
}

void AudioProcessor::processBlock(AudioBuffer<float>& buffer) {
    // Atomic read from parameter queue
    float value = parameterQueue[index];
    // Use value for processing
}
```

```swift
// Thread-safe engine operation (Swift)
func setPerformanceBlend(_ perfA: PerformanceInfo, _ perfB: PerformanceInfo, blendValue: Double) {
    // Always dispatch to engineQueue
    engineQueue.async { [weak self] in
        self?.sendBlendCommand(perfA, perfB, blendValue)
    }
}
```

---

## Memory Management

### C++ (Manual)

```cpp
// Smart pointers for automatic cleanup
std::unique_ptr<SchillingerEngine> engine;

// RAII for resource management
class AudioProcessor {
    AudioProcessor() {
        // Allocate resources
    }
    ~AudioProcessor() {
        // Automatically release resources
    }
};

// Real-time safe memory pool
class RealTimeAllocator {
    void* allocate(size_t size);
    void deallocate(void* ptr);
};
```

### Swift (ARC)

```swift
// Automatic reference counting
class JUCEEngine {
    private let engineHandle: OpaquePointer

    init() {
        engineHandle = sch_engine_create()
    }

    deinit {
        sch_engine_destroy(engineHandle)
    }
}
```

### FFI Bridge (Explicit)

```c
// String memory allocated with malloc must be freed
char* result = sch_engine_get_string(engine);
// Use result
sch_free_string(result);  // Free memory
```

**Memory Safety Rules:**

1. **C++** - Use smart pointers, RAII
2. **Swift** - Trust ARC, use weak references to avoid cycles
3. **FFI** - Explicit ownership, document who frees what
4. **Audio Thread** - Pre-allocate all memory, no allocations in audio callback

---

## Platform Support

### macOS (12+)

**Features:**
- Full JUCE AudioDeviceManager support
- VST3, AU, CLAP plugin formats
- Real-time audio callbacks
- Native UI (standalone)

**Limitations:**
- None (fully supported)

### iOS (15+)

**Features:**
- AVAudioSession integration
- Real-time audio (direct mode)
- Native SwiftUI UI

**Limitations:**
- AudioDeviceManager bypassed (uses AVAudioEngine directly)
- No plugin hosting (iOS apps only)

### tvOS (15+)

**Features:**
- Inherits iOS implementation

**Limitations:**
- No audio output (currently mocked)
- UI-only interactions

### Linux (Ubuntu 20.04+)

**Features:**
- VST3, CLAP plugin formats
- Real-time audio via ALSA/JACK

**Limitations:**
- No Swift frontend (Linux GUI support limited)
- No AU format (macOS only)

### Windows (10+)

**Features:**
- VST3, CLAP plugin formats

**Limitations:**
- No Swift frontend (Windows GUI in progress)
- Build support only, runtime testing ongoing

---

## Design Patterns

### Common Patterns

1. **Plugin Pattern** - Extensible audio plugins
2. **Strategy Pattern** - Different Schillinger systems
3. **Observer Pattern** - Parameter automation
4. **Factory Pattern** - Plugin instantiation
5. **Singleton Pattern** - Engine instances
6. **Command Pattern** - FFI operations

### Example: Plugin Pattern

```cpp
// Base plugin interface
class Plugin {
public:
    virtual void process(AudioBuffer<float>& buffer) = 0;
    virtual void prepareToPlay(double sampleRate, int samplesPerBlock) = 0;
    virtual void releaseResources() = 0;
};

// Concrete plugin implementation
class LocalGalPlugin : public Plugin {
public:
    void process(AudioBuffer<float>& buffer) override {
        // Acid synth processing
    }
};
```

---

## Performance Considerations

### Real-Time Constraints

- **Maximum audio thread time:** < buffer size / sample rate
  - Example: 256 samples @ 48kHz = ~5.3ms
- **No blocking operations:** No I/O, locks, or allocations
- **Deterministic execution:** Same input → same time

### Optimization Strategies

1. **SIMD Processing** - Vector operations
2. **Lock-Free Queues** - Thread communication
3. **Memory Pools** - Pre-allocated buffers
4. **Parameter Smoothing** - Reduce zippering
5. **Lazy Evaluation** - Defer non-critical work

---

## Next Steps

- [Component Architecture](./components.md) - Detailed component descriptions
- [Data Flow](./data-flow.md) - How data moves through the system
- [Design Patterns](./design-patterns.md) - Patterns and best practices
- [API Documentation](../api/) - API references

---

**Last Updated:** 2026-01-15
**Version:** 1.0.0
