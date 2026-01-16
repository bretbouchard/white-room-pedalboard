# Apple TV (tvOS) Platform Layer

**Purpose:** tvOS-specific restrictions, constraints, and glue code

## Responsibilities

This folder contains tvOS-specific code:

- **Platform Restrictions** - Enforce tvOS memory/CPU limits
- **System Integration** - tvOS audio session management
- **Resource Limits** - Max instances, CPU budgeting
- **Build Configuration** - tvOS-specific build settings
- **Testing Hooks** - tvOS hardware testing

## tvOS Constraints

### Memory Limits
- **App Memory**: ~200-400 MB available (varies by model)
- **Per Instrument**: < 10 MB memory target
- **No virtual memory**: Swapping not available
- **Strict limits**: OOM kills app immediately

### CPU Limits
- **Per Instrument**: < 20% CPU (measured at 48kHz)
- **Total Budget**: < 80% CPU (headroom for system)
- **Real-time requirement**: No dropouts allowed
- **Thermal throttling**: Reduces CPU over time

### API Restrictions
- **No plugin hosting**: VST3/AU not available on tvOS
- **No file system access**: Read-only bundle access
- **No dynamic libraries**: Static linking only
- **Limited networking**: WebSocket OK, no raw sockets
- **No UI toolkit**: No native GUI widgets

## Build Configuration

### tvOS Target
```cmake
set(CMAKE_SYSTEM_NAME tvOS)
set(CMAKE_OSX_SYSROOT appleTVOS)
set(CMAKE_OSX_ARCHITECTURES arm64)
```

### Static Linking
```cmake
# All code statically linked
set(BUILD_SHARED_LIBS OFF)

# No dynamic loading of instruments
set(INSTRUMENT_FACTORY_STATIC ON)
```

## System Integration

### Audio Session
```cpp
class TVOSAudioSession {
public:
    // Configure tvOS audio session
    bool configure(double sampleRate, int bufferSize);

    // Set preferred buffer size
    bool setBufferSize(int frames);

    // Handle interruptions (phone calls, etc.)
    void onInterruptionBegin();
    void onInterruptionEnd();

    // Handle route changes (HDMI disconnect, etc.)
    void onRouteChange();
};
```

### Resource Management
```cpp
class TVOSResourceMonitor {
public:
    // Monitor memory usage
    size_t getCurrentMemoryUsage();
    size_t getMemoryLimit();

    // Monitor CPU usage
    double getCurrentCPUUsage();
    double getCPULimit();

    // Check if resource limit exceeded
    bool isWithinLimits();
};
```

## Instrument Limits

### tvOS Configuration
```cpp
struct TVOSLimits {
    int maxInstruments = 16;        // Soft limit
    int maxPolyphony = 64;          // Per instrument
    int maxEffects = 8;             // Per track
    int maxBuses = 4;               // Aux buses only
    double maxCPUPercent = 20.0;    // Per instrument
    size_t maxMemoryMB = 10;        // Per instrument
};
```

## Testing

### Unit Tests
```cpp
// Test tvOS-specific behavior
TEST(TVOSResourceLimits, InstrumentWithinBudget)
TEST(TVOSSystemIntegration, AudioSessionConfiguration)
TEST(TVOSSystemIntegration, InterruptionHandling)
```

### Hardware Testing
- Run on actual Apple TV hardware
- Test with remote control input
- Verify thermal performance
- Test with HDMI connect/disconnect

## Files

- `include/platform/tvos/TVOSSession.h` - Audio session management
- `include/platform/tvos/TVOSLimits.h` - Resource limits
- `include/platform/tvos/TVOSMonitor.h` - Resource monitoring
- `src/platform/tvos/TVOSSession.cpp` - Implementation
- `tests/platform/tvos/TVOSTest.cpp` - Platform tests

## Dependencies

- Core Audio framework (tvOS)
- AVFoundation (audio session)
- Platform-agnostic DSP layer

## Anti-Patterns

- ❌ Platform conditionals in DSP code
- ❌ tvOS-specific code in instruments/
- ❌ Dynamic loading of any kind
- ❌ File system writes (except cache)
- ❌ Assumption of desktop features

---

**Owner:** Platform Team
**Status:** 🟡 Design Phase (implementation not yet started)
**Priority:** HIGH (primary target platform)
