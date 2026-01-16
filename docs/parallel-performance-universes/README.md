# Parallel Performance Universes - Documentation Suite

Complete documentation for the Parallel Performance Universes feature in White Room.

## Overview

**Parallel Performance Universes** is a revolutionary feature that separates "what the song is" from "how it sounds", enabling a single composition to exist in infinite performance realities.

### Quick Links

- **[Design Documentation](./001-design-documentation.md)** - Architecture, data models, rendering pipeline
- **[API Documentation](./002-api-documentation.md)** - Complete API reference for all platforms
- **[User Guide](./003-user-guide.md)** - How to use performances (for end users)
- **[Developer Guide](./004-developer-guide.md)** - Integration, extension, debugging (for developers)

## Feature Summary

### Core Concept

```
SongState (What the song is)
    ↓
PerformanceRealization (How it sounds)
    ↓
Rendered Audio Graph (Playable output)
```

The same SongState can yield infinite realizations:
- **Solo Piano** - 1 voice, minimal density
- **SATB Choir** - 4 voices, moderate density
- **Ambient Techno** - 8 voices, high density, heavy effects
- **...and infinite custom performances**

### Key Capabilities

✅ **Multiple Performances** - Create unlimited performances per song
✅ **Instant Switching** - Transform your song with one tap (at bar boundaries)
✅ **Smooth Blending** - Sweep between performances (Milestone 2)
✅ **Complete Control** - Instruments, density, groove, register, mixing
✅ **Non-Destructive** - Never changes your original song

## Documentation Guide

### For Everyone

Start here to understand the feature:

1. **[Design Documentation](./001-design-documentation.md)** - Learn the architecture
   - Three-layer separation (SongState → PerformanceRealization → RenderGraph)
   - Data models and types
   - Rendering pipeline
   - Interpolation algorithms

2. **[User Guide](./003-user-guide.md)** - Learn how to use it
   - Creating performances
   - Switching between performances
   - Using the Sweep control
   - Best practices

### For Developers

Deep dive into implementation:

3. **[API Documentation](./002-api-documentation.md)** - Reference for all APIs
   - TypeScript SDK (PerformanceRealizationV1, PerformanceManager)
   - JUCE Backend (SongModelAdapter, FFIServer)
   - Swift Frontend (PerformanceState, JUCEEngine)
   - FFI Bridge specification

4. **[Developer Guide](./004-developer-guide.md)** - Integration and extension
   - Integration points (file locations, code paths)
   - Extension points (custom instruments, arrangements, grooves)
   - Debugging guide
   - Performance optimization
   - Testing strategies
   - Code examples

## Feature Status

### Milestone 1: Discrete Switching ✅ COMPLETE

**Status**: Implemented and tested

**Capabilities**:
- ✅ Create multiple performances per song
- ✅ Switch between performances at bar boundaries
- ✅ No audio glitches during transitions
- ✅ Preset performances (Solo Piano, SATB Choir, Ambient Techno)
- ✅ Custom performance creation
- ✅ Performance CRUD operations

**Deliverables**:
- ✅ SDK PerformanceRealizationV1 type
- ✅ SDK PerformanceManager class
- ✅ JUCE performance-aware rendering
- ✅ Swift performance UI
- ✅ Complete documentation

### Milestone 2: Continuous Blending 🚧 PLANNED

**Status**: In design phase

**Planned Capabilities**:
- ⏳ Sweep control for blending between performances
- ⏳ Dual-render crossfade (equal power)
- ⏳ Interpolation of density, groove, mix targets
- ⏳ Smooth transitions (0..1 blend parameter)
- ⏳ Performance morphing

**Estimated**: 2-4 weeks

## Quick Start

### For Users

1. **Open White Room** and load a song
2. **View Performances** strip at bottom of screen
3. **Tap a performance card** to switch to that universe
4. **Create custom performance** by tapping [+] button
5. **Experiment** with different arrangements!

For detailed instructions, see the [User Guide](./003-user-guide.md).

### For Developers

1. **Explore the codebase**:
   ```bash
   # SDK (TypeScript)
   /Users/bretbouchard/apps/schill/white_room/sdk/packages/sdk/src/song/

   # JUCE Backend (C++)
   /Users/bretbouchard/apps/schill/white_room/juce_backend/src/

   # Swift Frontend
   /Users/bretbouchard/apps/schill/white_room/swift_frontend/src/SwiftFrontendCore/
   ```

2. **Read the architecture**:
   - Start with [Design Documentation](./001-design-documentation.md)
   - Review [API Documentation](./002-api-documentation.md)
   - Study [Developer Guide](./004-developer-guide.md)

3. **Run the tests**:
   ```bash
   # SDK tests
   cd sdk/packages/sdk
   npm test

   # JUCE tests
   cd juce_backend
   cmake --build . --target test_ffi_server

   # Swift tests
   cd swift_frontend
   swift test
   ```

4. **Create custom extension**:
   - Add custom arrangement style
   - Create custom instrument
   - Define custom groove profile
   - Build custom ConsoleX profile

## Key Files

### TypeScript SDK

```
sdk/packages/sdk/src/song/
├── performance_realization.ts     # PerformanceRealizationV1 type
├── performance_manager.ts         # PerformanceManager class
├── performance_configuration.ts   # PerformanceConfiguration type
└── __tests__/
    └── performance_switching.test.ts  # Unit tests
```

### JUCE Backend

```
juce_backend/src/
├── ffi/
│   ├── include/ffi_server.h       # FFI interface
│   └── src/ffi_server.cpp         # FFI implementation
├── audio/
│   ├── SongModelAdapter.h         # Rendering logic
│   └── AudioEngine.h              # Audio engine
└── models/
    └── PerformanceRealization.h   # C++ types
```

### Swift Frontend

```
swift_frontend/src/SwiftFrontendCore/
├── Models/
│   └── PerformanceState.swift     # Swift types
├── Audio/
│   ├── JUCEEngine.swift           # JUCE bridge
│   └── ProjectionEngine.swift     # Projection logic
└── Surface/
    └── SurfaceRootView.swift      # UI components
```

## Performance Examples

### Solo Piano

```typescript
{
  name: "Solo Piano",
  arrangementStyle: "SOLO_PIANO",
  density: 0.3,
  instrumentationMap: [
    { roleId: "primary", instrumentId: "NexSynth", presetId: "grand-piano" }
  ],
  registerMap: [
    { roleId: "primary", minPitch: 48, maxPitch: 96 }
  ]
}
```

**Characteristics**: Sparse, elegant, minimal CPU (~5%)

### SATB Choir

```typescript
{
  name: "SATB Choir",
  arrangementStyle: "SATB",
  density: 0.6,
  instrumentationMap: [
    { roleId: "primary", voiceId: "soprano", instrumentId: "KaneMarcoAetherString", presetId: "choir-soprano" },
    { roleId: "primary", voiceId: "alto", instrumentId: "KaneMarcoAetherString", presetId: "choir-alto" },
    { roleId: "primary", voiceId: "tenor", instrumentId: "KaneMarcoAetherString", presetId: "choir-tenor" },
    { roleId: "primary", voiceId: "bass", instrumentId: "KaneMarcoAetherString", presetId: "choir-bass" }
  ]
}
```

**Characteristics**: Four-part harmony, moderate CPU (~15%)

### Ambient Techno

```typescript
{
  name: "Ambient Techno",
  arrangementStyle: "AMBIENT_TECHNO",
  density: 0.8,
  instrumentationMap: [
    { roleId: "primary", voiceId: "lead", instrumentId: "NexSynth", presetId: "techno-lead" },
    { roleId: "primary", voiceId: "pad", instrumentId: "KaneMarco", presetId: "ambient-pad" },
    { roleId: "secondary", voiceId: "bass", instrumentId: "NexSynth", presetId: "techno-bass" },
    { roleId: "tertiary", voiceId: "drone", instrumentId: "KaneMarcoAether", presetId: "drone-low" }
  ]
}
```

**Characteristics**: Dense, layered, heavy effects (~25% CPU)

## FAQ

**Q: What is Parallel Performance Universes?**

A: A feature that separates "what the song is" (musical notes) from "how it sounds" (instruments, density, groove), letting you have infinite realizations of the same song.

**Q: How many performances can I have?**

A: Unlimited! Create as many as you want.

**Q: Can I share performances with others?**

A: Not yet, but it's planned for a future update.

**Q: Do performances change my original song?**

A: No! Performances are non-destructive. Your original SongState stays exactly the same.

**Q: What's the CPU impact?**

A: Discrete switching: Minimal (just reconfigures audio engine). Sweep blending: ~2x CPU (dual rendering).

**Q: When will the Sweep Control be available?**

A: Planned for Milestone 2.

## Contributing

We welcome contributions! See the [Developer Guide](./004-developer-guide.md) for:
- Extension points (custom instruments, arrangements, grooves)
- Integration guide
- Testing strategies
- Code examples

## Support

- **Documentation**: See links above
- **Issues**: https://github.com/bretbouchard/white-room/issues
- **Discussions**: https://github.com/bretbouchard/white-room/discussions

## License

Copyright © 2026 White Room. All rights reserved.

---

**Version**: 1.0
**Last Updated**: 2026-01-15
**Issue**: white_room-211
