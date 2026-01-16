# JUCE Audio Execution Engine

## Overview

Real-time safe audio execution engine for tvOS, built with JUCE framework. Provides deterministic audio processing, plugin hosting, and DSP synthesis for the Schillinger ecosystem. Optimized for embedded tvOS environments with lock-free architectures and no network dependencies.

**Note:** This is the **tvOS local-only** build. For server-era architecture with WebSocket/REST APIs, see `archive/server-era/`.

## Current Version: v1.2.0

### Key Features
- **Real-time Audio Processing**: Low-latency audio engine with dropout prevention
- **Plugin Hosting**: Full VST3 and AudioUnit support with comprehensive validation
- **Dynamic Algorithm System**: Hot-swappable internal algorithms with automatic smart control generation
- **Lock-Free Architecture**: Wait-free data structures for audio thread safety
- **tvOS SDK Integration**: Seamless integration with TypeScript SDK via JavaScriptCore
- **Deterministic Execution**: Seeded RNG, no timers, reproducible audio output
- **VoiceBus Management**: Type-safe audio routing with voice bus indices
- **Advanced DSP**: Multiple synthesizer instruments (NexSynth, SamSampler, LocalGal, Kane Marco)
- **Comprehensive Testing**: 100% test success rate for execution/DSP tests

## Architecture

### Design Philosophy

**tvOS Local-Only:**
- ✅ Audio execution engine (not a backend server)
- ✅ Real-time safe DSP processing
- ✅ Lock-free plan consumption from TypeScript SDK
- ✅ Deterministic and reproducible
- ❌ No WebSocket server
- ❌ No REST API
- ❌ No network dependencies
- ❌ No cloud deployment

### Core Components

#### Execution Engine
- **JUCE Audio Engine**: Real-time audio processing with plugin hosting
- **Lock-Free Plan Cache**: SPSC queue for TypeScript SDK → JUCE communication
- **VoiceBus System**: Type-safe audio routing (VoiceBusIndex)
- **Event Scheduling**: Deterministic event timing with TimePosition types

#### DSP & Instruments
- **Dynamic Algorithm Registry**: Hot-swappable algorithm management
- **Smart Control System**: Automatic UI generation with intelligent parameter organization
- **NexSynth**: FM synthesizer with multi-operator architecture
- **SamSampler**: SF2 sampler with round-robin voice cycling
- **LocalGal**: Subtractive synthesizer with filter and envelope
- **Kane Marco**: Hybrid virtual analog with Aether string physical modeling
- **Airwindows**: 200+ effects from Chris Johnson

#### Type System (SafeTypes.h)
- **Strong Types**: Type-safe indices (VoiceBusIndex, VoiceIndex, ChannelIndex, etc.)
- **Time Types**: TimePosition, TimeRange for temporal precision
- **Audio Types**: GainLinear, PanPosition for audio parameters
- **Prevents Errors**: Compile-time type checking prevents common bugs

### Technology Stack
- **Framework**: JUCE (C++17)
- **Audio Processing**: VST3/AU plugin hosting
- **Build System**: CMake 3.16+ with tvOS local-only mode
- **Testing**: Google Test framework
- **Platform**: macOS, iOS, tvOS (Apple Silicon)

## Quick Start

### Prerequisites
- C++17 compatible compiler (clang++ for Apple platforms)
- CMake 3.16+
- JUCE framework (included as git submodule)
- macOS (for development and AudioUnit support)

### Building for Desktop

```bash
# Clone repository
git clone https://github.com/bretbouchard/audio_agent_juce.git
cd audio_agent_juce/juce_backend

# Build (standard desktop mode)
cmake -B build -S .
cmake --build build

# Run tests
cd build
ctest --output-on-failure
```

### Building for tvOS (Local-Only Mode)

```bash
# Configure for tvOS local-only (no server, no networking)
cmake -B build-tvos -S . -DSCHILLINGER_TVOS_LOCAL_ONLY=ON
cmake --build build-tvos

# Expected output:
# === tvOS LOCAL-ONLY BUILD MODE ===
#   ✅ Audio engine & DSP
#   ✅ Plugin hosting (VST3/AU)
#   ✅ Lock-free real-time safety
#   ✅ Performance tests
#   ✅ tvOS SDK integration
# ====================================
```

**tvOS Build Differences:**
- ❌ BackendServer target disabled
- ❌ WebSocket tests excluded
- ❌ REST/HTTP endpoints excluded
- ❌ Deployment configs archived
- ✅ Only execution engine and DSP components built

### Running

```bash
# Run standalone app (desktop)
./build/SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW

# Run with specific audio device
./build/SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW --audio-device "Built-in Output"
```

## Instrument Ecosystem

### NexSynth (FM Synthesizer)
6-operator FM synthesizer with comprehensive control:
- **Operators**: 6 independent FM operators with customizable waveforms
- **Voices**: Up to 16-voice polyphony with voice stealing
- **Modulation**: Multiple LFOs and envelope generators
- **Effects**: Built-in chorus, delay, reverb
- **Presets**: 30+ factory presets covering bells, leads, bass, pads

**Key Features:**
- Fast detune factor caching (2-4% CPU reduction)
- SIMD-optimized buffer operations (1-2% CPU reduction)
- Lock-free memory pools (0.5-1% CPU reduction)

### SamSampler (SF2 Sampler)
SoundFont 2 sampler with professional features:
- **Format Support**: Complete SF2 implementation
- **Voices**: Round-robin voice cycling for realism
- **Layers**: Zone-based layering and velocity switching
- **Effects**: Multi-effects send system
- **Presets**: 36+ instrument presets

### LocalGal (Subtractive Synth)
Classic subtractive synthesis:
- **Oscillators**: Multiple waveforms with sync and FM
- **Filter**: Resonant low-pass filter with envelope
- **Envelope**: ADSR with decay, sustain, release
- **Presets**: 33+ patches covering bass, leads, pads, effects

### Kane Marco (Virtual Analog + Physical Modeling)
Hybrid synthesizer with Aether String v2:
- **Oscillators**: Virtual analog with sub-oscillator
- **Aether String v2**: Physical modeling with scale-based coupling
- **Effects**: Chorus, delay, distortion, modulation
- **Presets**: Kane Marco (30 presets), Aether (20 presets), Aether String (41 presets)

### Airwindows Effects
200+ effects from Chris Johnson:
- **Dynamics**: Compression, limiting, gating
- **EQ**: Parametric and graphic EQs
- **Reverb**: Algorithmic reverbs
- **Special**: Creative effects and utilities

## Type System (SafeTypes.h)

### Voice Bus Management

```cpp
// Create voice bus index (type-safe)
auto bus1 = VoiceBusIndex::fromInt(0);

// Set audio clip parameters
AudioClipParameters params;
params.setVoiceBus(bus1);
params.setGain(GainLinear::unity());
params.setPan(PanPosition::center());

// Access type-safe index
VoiceBusIndex busIndex = params.getVoiceBusIndex();
int rawIndex = busIndex.toInt();
```

### Time Management

```cpp
// Create time positions
auto start = TimePosition::fromSamples(0);
auto end = TimePosition::fromSamples(44100);

// Create time range
TimeRange position(start, end);
params.setPosition(position);
```

### Audio Parameters

```cpp
// Gain in linear scale
auto gain = GainLinear::fromDecibels(-6.0);  // -6 dB
params.setGain(gain);

// Pan position (-1.0 to 1.0)
auto pan = PanPosition::fromNormalized(0.0);  // Center
params.setPan(pan);
```

## Performance Optimizations

### Phase 5 Optimizations (v1.2.0)

1. **Detune Caching** (2-4% CPU reduction)
   - Precompute detune factors: `2^(detune/1200)`
   - Eliminate per-sample `pow()` calls in FM synthesis
   - Cache invalidated only on parameter changes

2. **SIMD Vectorization** (1-2% CPU reduction)
   - AVX/SSE optimization for buffer operations
   - Automatic scalar fallback for compatibility
   - 4-8x speedup for vectorizable operations

3. **Lock-Free Memory Pools** (0.5-1% CPU reduction)
   - Wait-free buffer allocation/deallocation
   - Treiber stack for lock-free LIFO
   - Pre-allocated pool eliminates runtime allocations

**Total CPU Reduction:** 4-7% for instrument processing

## Real-Time Safety

### Dropout Prevention
- **Lock-Free Data Structures**: All audio thread data is wait-free
- **Memory Pools**: No allocations in audio thread after initialization
- **Priority Inheritance**: Prevents priority inversion
- **Deterministic Execution**: Bounded execution time guarantees

### Testing Coverage
- **Real-time Safety Tests**: Validate no dropouts at full load
- **Dropout Prevention Tests**: Stress test with maximum voice count
- **Lock-Free Validation**: Verify wait-free properties
- **Memory Safety**: Comprehensive leak detection and buffer overflow checks

## tvOS SDK Integration

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  tvOS Swift │──────│ JavaScriptCore│──────│  JUCE Audio  │
│   App UI    │ JS   │   (TS SDK)   │ JS   │  Execution   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ├── Lock-free plan cache
                            ├── IR (intermediate representation)
                            └── Deterministic execution
```

### TypeScript SDK
- **Location**: `frontend/src/schillinger/core/sdk-entry.ts`
- **Purpose**: Authoritative source for musical plans
- **Output**: IR (intermediate representation) for JUCE
- **Features**: Seeded RNG, no timers, 100% deterministic

### Swift Bridge
- **Location**: `platform/tvos/SchillingerBridge.swift`
- **Purpose**: Integrates TypeScript SDK into tvOS app
- **Threading**: Serial dispatch queue for JSCore calls
- **Safety**: All operations off audio thread

### Lock-Free Plan Cache
- **Location**: `platform/tvos/SchillingerPlanCache.h`
- **Purpose**: SPSC queue for plan updates
- **Producer**: Swift → JavaScriptCore → Queue
- **Consumer**: JUCE audio thread (wait-free pop)

## Development

### Project Structure
```
include/
├── audio/                  # Audio engine headers
├── core/                   # Strong type system (SafeTypes.h)
├── dsp/                    # Fast math, SIMD, buffer pools
├── effects/                # Audio effects
├── instruments/            # Synthesizer instruments
│   ├── Nex_synth/          # FM synthesizer
│   ├── SamSampler/         # SF2 sampler
│   ├── LocalGal/           # Subtractive synth
│   └── KaneMarco/          # Virtual analog + Aether string
└── ui/                     # UI components

src/
├── audio/                  # Audio engine implementation
├── dsp/                    # DSP implementation
├── effects/                # Effects processing
├── instruments/            # Instrument implementations
└── synthesis/              # Synthesis engine

tests/
├── audio/                  # Audio engine tests
├── dsp/                    # DSP tests
├── optimization/           # Performance tests
├── synthesis/              # Synthesis tests
└── websocket_security/     # Excluded in tvOS builds

platform/
└── tvos/                   # tvOS-specific integration
    ├── SchillingerBridge.swift
    ├── SchillingerPlanCache.h
    └── SchillingerSDK.bundle.js
```

### Adding New Instruments

1. **Create DSP class** in `src/instruments/<name>/`
2. **Add to CMakeLists.txt** in instruments section
3. **Create FFI layer** for parameter control
4. **Write tests** in `tests/dsp/<name>Tests.cpp`
5. **Create presets** in `presets/<name>/`

See `instruments/` directory for examples.

### Execution Language Guidelines

**Preferred Terminology:**
- ✅ "voiceBus" or "executionLane" (not "track")
- ✅ "schedule" or "executionGraph" (not "composition")
- ✅ "audio host" or "plugin host" (not "DAW")
- ✅ "voice" (individual synthesis voice)
- ✅ "channel" (audio output channel)
- ✅ "timeline" (scheduling timeline)
- ✅ "event" (scheduled audio event)

See `docs/ExecutionLanguageGuidelines.md` for complete guidelines.

## Build Configuration

### CMake Options

| Option | Default | Description |
|--------|---------|-------------|
| `SCHILLINGER_TVOS_LOCAL_ONLY` | `OFF` | Build for tvOS local-only (no server) |
| `BUILD_BACKEND_SERVER` | `OFF` | Build backend server (deprecated) |
| `BUILD_WEBSOCKET_TESTS` | `OFF` | Build WebSocket tests (deprecated) |
| `BUILD_AUDIO_EXPORT` | `ON` | Build audio export (desktop-only) |

### tvOS Local-Only Mode

When `SCHILLINGER_TVOS_LOCAL_ONLY=ON`:
- Server targets disabled (BackendServer, WebSocket, REST)
- Deployment configs excluded (Docker, Fly.io, nginx)
- Only execution engine and DSP components built
- Optimized for embedded tvOS environment

## Testing

### Test Suites

**Execution/DSP Tests:**
- Real-time safety tests
- Dropout prevention tests
- Performance tests
- SIMD optimization tests
- Memory pool tests
- Instrument DSP tests
- Lock-free validation tests

**Running Tests:**
```bash
# All tests
cd build
ctest

# Specific test categories
ctest -R "realtime"       # Real-time safety
ctest -R "performance"    # Performance tests
ctest -R "dsp"            # DSP tests
```

### Test Coverage

- **Unit Tests**: Individual component testing
- **Integration Tests**: Multi-component testing
- **Performance Tests**: Load and stress testing
- **Real-time Tests**: Audio thread safety validation

## Compatibility

### Platforms
- **macOS**: 11.0+ (Apple Silicon)
- **iOS**: 15.0+ (arm64)
- **tvOS**: 15.0+ (arm64)

### Plugin Formats
- **VST3**: Cross-platform (macOS, Windows, Linux)
- **Audio Unit (AU)**: macOS/iOS only

### Audio Formats
- **SF2**: SoundFont 2 sampler format
- **WAV/AIFF**: Audio file import/export

## Troubleshooting

### Build Issues

**Problem:** CMake can't find JUCE
```
JUCE not found at external/JUCE
```
**Solution:**
```bash
git submodule update --init --recursive
```

**Problem:** Build fails with "undefined symbol"
```
undefined reference to 'VoiceBusIndex::fromInt(int)'
```
**Solution:** Ensure you're using the new execution language APIs (VoiceBusIndex, not TrackIndex)

**Problem:** tvOS build has networking symbols
```
FORBIDDEN networking symbol found: socket
```
**Solution:** Check CMakeLists.txt for accidentally included server sources

### Runtime Issues

**Problem:** Audio dropouts/glitches
**Solution:**
- Check real-time safety tests pass
- Verify no allocations in audio thread
- Reduce voice count or DSP load

**Problem:** Plugin fails to load
**Solution:**
- Check plugin validation in `src/plugins/`
- Verify plugin format compatibility
- Review security logs in `src/security/`

## Contributing

### Code Style
- **C++17**: Modern C++ with RAII and smart pointers
- **Execution Language**: Use preferred terminology (see guidelines)
- **Real-time Safe**: No allocations in audio thread
- **Tested**: All code requires tests

### Pull Request Checklist
- [ ] Tests pass locally
- [ ] Execution language used (no "track/composition/DAW")
- [ ] Real-time safety validated
- [ ] Documentation updated
- [ ] No new warnings/errors

### Server-Era Code
Server-era code (WebSocket, REST, deployment) is archived in `archive/server-era/`. Do not reintroduce without explicit justification.

## Documentation

### Key Documents
- **Execution Language Guidelines**: `docs/ExecutionLanguageGuidelines.md`
- **Server-Era Deprecation Plan**: `docs/ServerEraDeprecationPlan.md`
- **tvOS Build Checklist**: `docs/TvosBuildChecklist.md`
- **Phase Reports**: `docs/Phase*.md` (Phases 1-5 complete)

### Architecture Documentation
- **Type System**: `include/core/SafeTypes.h`
- **tvOS SDK**: `frontend/src/schillinger/core/sdk-entry.ts`
- **Plan Cache**: `platform/tvos/SchillingerPlanCache.h`

## Changelog

### Version 1.2.0 (December 2025)
- ✅ Phase 5 performance optimizations (4-7% CPU reduction)
- ✅ tvOS SDK integration with JavaScriptCore
- ✅ Lock-free plan cache for deterministic execution
- ✅ Server-era deprecation (Phases 1-5)
- ✅ Terminology migration to execution language
- ✅ Deployment configs archived

### Version 1.1.0 (November 2025)
- Dynamic Algorithm System integration
- Smart Controls UI generation
- Kane Marco Aether String v2

### Version 1.0.0 (October 2025)
- Initial release
- NexSynth, SamSampler, LocalGal instruments
- VST3/AU plugin hosting
- Real-time safety framework

## Phase 2: Pure DSP Implementation (December 2025)

Completed optimization phases:
- **Phase 5.1**: Detune factor caching (2-4% CPU reduction)
- **Phase 5.2**: SIMD vectorization (1-2% CPU reduction)
- **Phase 5.3**: Lock-free memory pools (0.5-1% CPU reduction)

**Result:** NexSynth CPU usage reduced from 12.6% to 5-8%

## Server-Era Deprecation (November-December 2025)

Migration to tvOS local-only architecture:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | CMake Configuration | ✅ Complete |
| 2 | Source File Exclusions | ✅ Complete |
| 3 | Test Cleanup | ✅ Complete |
| 4 | Terminology Migration | ✅ Complete |
| 5 | Deployment Cleanup | ✅ Complete |
| 6 | Documentation Updates | ✅ Complete |
| 7 | Audio Export Gating | Pending |
| 8 | Validation & Sign-Off | Pending |

**Archived Components:**
- WebSocket server and client code
- REST API endpoints
- Docker/container configs
- Cloud deployment scripts

See `archive/server-era/` for archived code and `docs/ServerEraDeprecationPlan.md` for details.

## License

[Specify your license here]

## Support

For issues, questions, or contributions:
- **Documentation**: See `docs/` directory
- **Issues**: GitHub Issues
- **Architecture**: See phase reports and deprecation plan

---

**Built with JUCE Framework**
**Real-time safe. Lock-free. Deterministic.**
**tvOS Local-Only Architecture**
