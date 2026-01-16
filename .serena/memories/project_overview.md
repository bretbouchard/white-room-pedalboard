# White Room Project Overview

## Project Purpose

White Room is a **multi-platform Schillinger System-based music creation system**. This monorepo contains a comprehensive music composition platform with focus on **Apple TV as the MVP**.

## Core Philosophy

- **TypeScript plans. Audio layer renders. Swift hosts.**
- **Only TypeScript decides music.**
- TypeScript SDK is the authoritative implementation
- Audio layer (platform-specific) renders audio from IR
- Swift hosts the application and provides UI

## Multi-Platform Strategy

| Platform | Role | Audio Engine |
|----------|------|--------------|
| **Apple TV** | Schillinger songwriting platform (MVP) | Native Apple (AVAudioEngine/AVAudioUnit) |
| **iPhone** | Fruity Loops analog | Native Apple |
| **Mac** | Professional DAW parallel | JUCE FFI + Apple native |
| **Raspberry Pi** | Scalable ensemble army | DSP-focused |

## Repository Structure

```
white_room/
├── sdk/                    # TypeScript SDK (authoritative implementation)
│   ├── packages/core/      # Core Schillinger System implementation
│   ├── packages/audio/     # Audio layer abstractions
│   ├── packages/shared/    # Shared types and utilities
│   ├── core/               # Core engine implementation
│   └── packages/generation/# Music generation algorithms
│
├── juce_backend/           # JUCE FFI layer + C++ audio engine (Mac/Linux)
│   ├── src/ffi/           # TypeScript → JUCE bridge
│   └── src/audio/         # C++ audio engine
│
├── swift_frontend/         # SwiftUI application (tvOS/iOS/macOS)
│   ├── Sources/SwiftFrontendCore/   # Core library
│   ├── Sources/SwiftFrontend/       # Main app (tvOS)
│   └── src/WhiteRoomiOS/            # iOS app
│
├── design_system/          # Design specifications and plans
├── docs/                   # Comprehensive documentation
├── specs/                  # Feature specifications (SpecKit)
├── plans/                  # Implementation plans (SpecKit)
└── scripts/                # Build and development scripts
```

## Key Technologies

- **SDK**: TypeScript (Node.js 18+, npm 9+)
- **JUCE Backend**: C++17, CMake 3.25+
- **Swift Frontend**: Swift 5.9+, SwiftUI, Xcode 15+
- **Testing**: Vitest (TS), swift test, CTest (C++)
- **Task Tracking**: Beads (bd)
- **Memory**: Confucius (hierarchical memory system)
