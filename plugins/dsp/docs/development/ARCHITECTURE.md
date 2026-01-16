# White Room Architecture

**Comprehensive system architecture and design documentation for White Room.**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Diagrams](#component-diagrams)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [Module Dependencies](#module-dependencies)
6. [Concurrency Model](#concurrency-model)
7. [Memory Management](#memory-management)

---

## System Overview

### High-Level Architecture

White Room is a next-generation Digital Audio Workstation (DAW) built on a multi-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│                   User Interface Layer                   │
│  (SwiftUI - macOS, tvOS, iOS)                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                   SDK Layer                             │
│  (TypeScript - Shared Types & APIs)                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                   FFI Bridge                            │
│  (C FFI - Swift ↔ JUCE Communication)                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                 Audio Engine Layer                      │
│  (JUCE C++ - Audio Processing & DSP)                   │
└─────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Separation of Concerns** - UI, logic, and audio processing are separate
2. **Type Safety** - TypeScript SDK provides compile-time guarantees
3. **Performance** - Real-time audio processing in C++ via JUCE
4. **Platform Native** - SwiftUI for modern, responsive UI
5. **Modularity** - Clear module boundaries and dependencies

---

## Component Diagrams

### 1. Swift Frontend

**Location**: `/swift_frontend/`

**Components**:
- **Models** - Data structures (Project, Track, Region, Note)
- **ViewModels** - MVVM pattern for UI state management
- **Views** - SwiftUI views for all UI elements
- **Managers** - Coordinators for complex operations
- **FFI Bridge** - Swift-to-C++ interface layer

**Key Files**:
```swift
swift_frontend/
├── Models/
│   ├── Project.swift
│   ├── Track.swift
│   ├── Region.swift
│   └── Note.swift
├── ViewModels/
│   ├── TimelineViewModel.swift
│   ├── PianoRollViewModel.swift
│   └── MixerViewModel.swift
├── Views/
│   ├── TimelineView.swift
│   ├── PianoRollView.swift
│   └── MixerView.swift
└── FFI/
    └── JUCEEngine.swift
```

### 2. SDK Layer

**Location**: `/sdk/`

**Components**:
- **Type Definitions** - Shared TypeScript types
- **API Interfaces** - Function signatures and contracts
- **Projection Engine** - Time domain transformations
- **State Management** - Immutable state updates

**Key Files**:
```typescript
sdk/
├── src/
│   ├── types/
│   │   ├── Project.ts
│   │   ├── Track.ts
│   │   ├── Region.ts
│   │   └── Note.ts
│   ├── api/
│   │   ├── TimelineAPI.ts
│   │   ├── ProjectionAPI.ts
│   │   └── TransportAPI.ts
│   ├── projection/
│   │   └── ProjectionEngine.ts
│   └── state/
│       └── StateManager.ts
└── dist/  // Compiled JavaScript
```

### 3. JUCE Backend

**Location**: `/juce_backend/`

**Components**:
- **Audio Engine** - Real-time audio processing
- **DSP Processors** - Effects and instruments
- **MIDI Handler** - MIDI input/output
- **File I/O** - Audio/MIDI file handling
- **FFI Layer** - C interface for Swift

**Key Files**:
```cpp
juce_backend/
├── src/
│   ├── engine/
│   │   ├── AudioEngine.cpp
│   │   ├── Transport.cpp
│   │   └── Mixer.cpp
│   ├── dsp/
│   │   ├── CompressorProcessor.cpp
│   │   ├── EQProcessor.cpp
│   │   └── ReverbProcessor.cpp
│   ├── midi/
│   │   └── MIDIHandler.cpp
│   ├── ffi/
│   │   ├── sch_engine_ffi.cpp
│   │   ├── sch_transport_ffi.cpp
│   │   └── sch_midi_ffi.cpp
│   └── utils/
│       ├── MemoryManager.cpp
│       └── ErrorHandler.cpp
└── include/
    └── white_room/
        └── ffi/
            └── sch_ffi.h
```

---

## Technology Stack

### Frontend (Swift)

**SwiftUI**:
- Modern, declarative UI framework
- Native macOS, tvOS, iOS support
- Reactive data binding
- Preview support for rapid development

**Combine**:
- Reactive programming framework
- Publisher/subscriber pattern
- State management

**Core Data** (optional):
- Local data persistence
- iCloud sync support

### SDK (TypeScript)

**TypeScript**:
- Type-safe JavaScript
- Excellent IDE support
- Compile-time error checking
- Easy integration with Swift

**Build Tools**:
- tsc (TypeScript compiler)
- npm/yarn package management
- Rollup for bundling

### Audio Engine (C++/JUCE)

**JUCE Framework**:
- Cross-platform audio
- VST3/AU plugin hosting
- Low-latency audio I/O
- Comprehensive DSP library

**C++17**:
- Modern C++ features
- RAII for resource management
- STL for data structures
- Template metaprogramming

---

## Data Flow

### 1. User Action → Audio Output

```
User plays MIDI keyboard
        ↓
Swift UI captures input
        ↓
Swift processes event (ViewModel)
        ↓
SDK validates and transforms (TypeScript)
        ↓
FFI Bridge serializes to C (JSON)
        ↓
JUCE Engine receives FFI call
        ↓
Audio Engine processes audio
        ↓
Audio output to device
```

### 2. Project Save Flow

```
User clicks Save (Cmd+S)
        ↓
Swift UI triggers save
        ↓
ViewModel creates project snapshot
        ↓
SDK serializes to JSON
        ↓
Swift writes to disk
        ↓
File saved as .wrp
```

### 3. Audio Processing Loop

```
Audio callback triggered (hardware)
        ↓
JUCE Engine::audioDeviceIOCallback()
        ↓
Process each track in order
        ↓
Apply instrument/effect plugins
        ↓
Mix to stereo output
        ↓
Output to audio buffer
        ↓
Return to audio hardware
```

---

## Module Dependencies

### Dependency Graph

```
┌─────────────────┐
│  Swift UI       │
│  (Views)        │
└────────┬────────┘
         │ depends on
         ↓
┌─────────────────┐
│  ViewModels     │
└────────┬────────┘
         │ depends on
         ↓
┌─────────────────┐
│  Managers       │
└────────┬────────┘
         │ depends on
         ↓
┌─────────────────┐
│  FFI Bridge     │
└────────┬────────┘
         │ depends on
         ↓
┌─────────────────┐
│  JUCE Engine    │
└─────────────────┘
```

### SDK Dependencies

```
┌─────────────────┐
│  API Layer      │
└────────┬────────┘
         │ depends on
         ↓
┌─────────────────┐
│  Projection     │
│  Engine         │
└────────┬────────┘
         │ depends on
         ↓
┌─────────────────┐
│  State Manager  │
└─────────────────┘
```

---

## Concurrency Model

### Swift Concurrency

**async/await**:
- Modern Swift concurrency
- Structured concurrency
- Actor isolation for thread safety

**DispatchQueue**:
- Main queue for UI updates
- Background queues for processing
- Serial queues for serialization

**Operation Queue**:
- Complex dependencies
- Priority management
- Cancellation support

### JUCE Concurrency

**Audio Thread**:
- Real-time audio processing
- High priority
- No blocking operations
- Lock-free where possible

**Message Thread**:
- UI updates from audio engine
- Parameter changes
- Non-critical notifications

**Background Threads**:
- File I/O
- Project loading/saving
- Plugin scanning

---

## Memory Management

### Swift (ARC)

**Automatic Reference Counting**:
- Compiler inserts retain/release
- Weak references to avoid cycles
- Unowned for non-optional references

**Memory Leaks Prevention**:
- Weak self in closures
- Avoid retain cycles
- Use value types where possible

### JUCE (RAII)

**Resource Acquisition Is Initialization**:
- Objects own resources
- Automatic cleanup on destruction
- Smart pointers (std::unique_ptr, std::shared_ptr)

**Memory Pool**:
- Audio buffer reuse
- Pre-allocated memory
- No allocation in audio thread

### FFI Bridge

**Memory Ownership**:
- Swift owns memory passed to C
- C copies data before processing
- No dangling pointers
- Clear contract for ownership transfer

**Error Handling**:
- Result types for errors
- No exceptions across FFI boundary
- Error codes returned to Swift

---

## Performance Considerations

### Real-Time Audio

**Constraints**:
- Audio callback must complete in < 5ms (at 44.1kHz, 256 samples)
- No heap allocations in audio thread
- Lock-free data structures
- Cache-friendly memory access

**Optimizations**:
- SIMD instructions for DSP
- Vectorized operations
- Branchless code where possible
- Profile-guided optimization

### UI Responsiveness

**Target**: 60 FPS (16.67ms per frame)

**Optimizations**:
- Differential updates (only changed data)
- View recycling (like UITableView)
- Lazy loading of large projects
- Background thread for heavy operations

---

## Security Architecture

### Sandboxing (macOS)

**App Sandbox**:
- File access only to user-selected files
- Network access (if needed)
- No arbitrary code execution
- Audio device access

### Hardened Runtime

**Runtime Security**:
- Code signing
- Library validation
- ASLR (Address Space Layout Randomization)
- Stack smashing protection

### Plugin Safety

**Plugin Validation**:
- Scan and validate plugins
- Blacklist problematic plugins
- Sandbox plugin execution
- Resource limits for plugins

---

## Testing Architecture

### Unit Tests

**Swift**:
- XCTest framework
- ViewModel testing
- Manager testing
- Mock FFI layer

**TypeScript**:
- Jest or Mocha
- API testing
- Projection engine tests
- State manager tests

**C++**:
- Catch2 or Google Test
- Audio engine tests
- DSP processor tests
- FFI layer tests

### Integration Tests

**End-to-End**:
- UI → Audio output
- Project save/load
- MIDI recording
- Audio export

### Performance Tests

**Benchmarks**:
- Audio processing latency
- UI rendering performance
- File I/O speed
- Memory usage

---

## Deployment Architecture

### Build System

**macOS App**:
- Xcode project
- Code signing
- App distribution (App Store, direct)

**tvOS App**:
- Xcode project
- Apple TV packaging
- App Store distribution

**iOS Companion**:
- Xcode project
- iPhone/iPad support
- App Store distribution

### CI/CD

**GitHub Actions**:
- Automated builds on push
- Run tests on all platforms
- Code signing automation
- Deployment to TestFlight/App Store

---

## Documentation

### Code Documentation

**Swift**:
- Doc comments (/// or /** */)
- Markdown formatting
- Generated docs with Jazzy

**TypeScript**:
- TSDoc comments
- Type annotations
- Generated docs with TypeDoc

**C++**:
- Doxygen comments
- Generated docs with Doxygen

### Architecture Documentation

**Diagrams**:
- Mermaid for flowcharts
- PlantUML for component diagrams
- Graphviz for dependency graphs

**Documents**:
- This architecture document
- API reference docs
- Contributing guide
- Build system guide

---

## Future Architecture

### Planned Enhancements

**Multi-User Collaboration**:
- Real-time sync (WebSocket/WebRTC)
- Operational transformation
- Conflict resolution

**Cloud Integration**:
- iCloud sync
- Cloud backup
- Remote processing

**Plugin Ecosystem**:
- Third-party plugin SDK
- Plugin marketplace
- User-contributed plugins

**Machine Learning**:
- Audio analysis
- Intelligent mixing
- Generative composition

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Next**: [Contributing Guide](CONTRIBUTING.md)

---

*For questions about architecture, contact the development team or open an issue on GitHub.*
