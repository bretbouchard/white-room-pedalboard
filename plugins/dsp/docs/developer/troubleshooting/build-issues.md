# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues in White Room development.

## Table of Contents

1. [Build Issues](#build-issues)
2. [Runtime Issues](#runtime-issues)
3. [Debugging Techniques](#debugging-techniques)
4. [Performance Optimization](#performance-optimization)
5. [Memory Leaks](#memory-leaks)
6. [Platform-Specific Issues](#platform-specific-issues)

---

## Build Issues

### CMake Configuration Fails

**Symptom:**
```
CMake Error at CMakeLists.txt:10 (find_package):
  Could not find JUCE
```

**Solution:**

1. **Check CMake version:**
```bash
cmake --version  # Should be 3.22+
```

2. **Initialize submodules:**
```bash
git submodule update --init --recursive
```

3. **Clean and reconfigure:**
```bash
rm -rf juce_backend/build
cd juce_backend
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
```

4. **Check JUCE path:**
```bash
# Verify JUCE submodule exists
ls JUCE/CMakeLists.txt

# If missing, reinitialize
git submodule update --init --recursive JUCE
```

---

### Swift Build Fails

**Symptom:**
```
error: module 'SchillingerFFI' not found
```

**Solution:**

1. **Check FFI files exist:**
```bash
ls swift_frontend/WhiteRoomiOS/FFI/sch_engine.hpp
```

2. **Verify symlinks:**
```bash
cd swift_frontend/WhiteRoomiOS/FFI
ls -la sch_engine.hpp  # Should be symlink
```

3. **Recreate symlinks if broken:**
```bash
cd swift_frontend/WhiteRoomiOS/FFI
ln -sf ../../../juce_backend/src/ffi/sch_engine.hpp sch_engine.hpp
ln -sf ../../../juce_backend/src/ffi/sch_types.hpp sch_types.hpp
```

4. **Clean Xcode build:**
```bash
cd swift_frontend/WhiteRoomiOS
rm -rf .build
rm -rf ~/Library/Developer/Xcode/DerivedData/WhiteRoomiOS-*
xcodebuild clean -scheme WhiteRoomiOS
```

---

### TypeScript Compilation Errors

**Symptom:**
```
error TS2307: Cannot find module './types'
```

**Solution:**

1. **Clean node_modules:**
```bash
cd sdk
rm -rf node_modules package-lock.json
npm install
```

2. **Check tsconfig.json:**
```bash
cat tsconfig.json | grep baseUrl
# Should include "baseUrl": "./src"
```

3. **Rebuild TypeScript:**
```bash
npm run clean
npm run build
```

---

### Linker Errors

**Symptom:**
```
undefined reference to 'sch_engine_create'
```

**Solution:**

1. **Verify FFI library built:**
```bash
ls juce_backend/build/libschillinger-ffi.a
```

2. **Rebuild FFI library:**
```bash
cd juce_backend
cmake --build build --target schillinger-ffi
```

3. **Check linking flags:**
```bash
# In Swift Package.swift or Xcode project
# Verify -lschillinger-ffi is present
# Verify library path is correct
```

---

## Runtime Issues

### Plugin Not Scanning in DAW

**Symptom:** Plugin doesn't appear in DAW plugin list

**Solution:**

1. **Verify plugin installed:**
```bash
# macOS VST3
ls ~/Library/Audio/Plug-Ins/VST3/LocalGal.vst3

# macOS CLAP
ls ~/Library/Audio/Plug-Ins/CLAP/LocalGal.clap

# macOS AU
ls ~/Library/Audio/Plug-Ins/Components/LocalGal.component
```

2. **Check file permissions:**
```bash
chmod +x ~/Library/Audio/Plug-Ins/VST3/LocalGal.vst3/Contents/MacOS/LocalGal
```

3. **Rescan in DAW:**
   - REAPER: Preferences → Plug-ins → ReScan
   - Ableton Live: Options → Preferences → Plug-Ins → Rescan
   - Bitwig Studio: Settings → Plugins → Rescan

4. **Check plugin validator:**
```bash
# macOS
validatePlugin ~/Library/Audio/Plug-Ins/VST3/LocalGal.vst3
```

---

### FFI Bridge Crashes on iOS

**Symptom:** App crashes when calling FFI functions

**Solution:**

1. **Enable crash logging:**
```swift
// In AppDelegate.swift
func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {

    // Enable crash logging
    NSSetUncaughtExceptionHandler { exception in
        print("Crash: \(exception)")
        print("Call stack: \(exception.callStackSymbols)")
    }

    return true
}
```

2. **Check thread safety:**
```swift
// All FFI calls must be on engineQueue
engineQueue.async { [weak self] in
    self?.callFFI()
}
```

3. **Verify engine initialized:**
```swift
guard let engine = engineHandle else {
    print("Engine not initialized")
    return
}
```

4. **Check device capabilities:**
```swift
// Verify audio session configured
AVAudioSession.sharedInstance().setCategory(
    .playback,
    mode: .default,
    options: []
)
```

---

### Audio Dropout/XRUNs

**Symptom:** Audio glitches, dropouts, or XRUN warnings

**Solution:**

1. **Increase buffer size:**
```cpp
// In audio processor
void prepareToPlay(double sampleRate, int samplesPerBlock) override {
    // Use larger buffer size
    recommendedBufferSize = 512;  // Instead of 256
}
```

2. **Reduce CPU load:**
```cpp
// Optimize audio processing
// - Use SIMD operations
// - Avoid complex calculations
// - Pre-calculate tables
```

3. **Check for blocking operations:**
```cpp
// NO blocking in audio thread!
void processBlock(juce::AudioBuffer<float>& buffer) {
    // DON'T: malloc/free
    // DON'T: mutex locks
    // DON'T: file I/O
    // DON'T: logging
}
```

4. **Monitor CPU usage:**
```cpp
// In audio processor
float getCpuUsage() {
    return audioDeviceManager.getCpuUsage();
}

// In UI
timerCallback() {
    float cpu = engine->getCpuUsage();
    if (cpu > 0.9) {
        showWarning("High CPU usage");
    }
}
```

---

### Parameter Zippering

**Symptom:** Audible noise when changing parameters

**Solution:**

1. **Use parameter smoothing:**
```cpp
class SmoothedParameter {
public:
    void prepare(double sampleRate) {
        smoothedValue.reset(sampleRate, 0.01);  // 10ms smoothing
    }

    void setValue(float newValue) {
        smoothedValue.setTargetValue(newValue);
    }

    float getNextValue() {
        return smoothedValue.getNextValue();
    }

private:
    juce::LinearSmoothedValue<float> smoothedValue;
};
```

2. **Apply smoothing in audio thread:**
```cpp
void processBlock(juce::AudioBuffer<float>& buffer) {
    for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
        float gain = gainParam.getNextValue();
        // Process with smoothed gain
    }
}
```

---

## Debugging Techniques

### Enable Debug Logging

**C++:**
```cpp
// Enable debug logging
#define ENABLE_DEBUG_LOG 1

#if ENABLE_DEBUG_LOG
    #define DBG_LOG(msg) DBG(msg)
#else
    #define DBG_LOG(msg) {}
#endif

// Use in code
DBG_LOG("Processing buffer: " << buffer.getNumSamples() << " samples");
```

**Swift:**
```swift
import os.log

let log = OSLog(subsystem: "com.whiteroom.audio", category: "FFI")

os_log("FFI call: %{public}@", log: log, type: .debug, "sch_engine_create")
```

**TypeScript:**
```typescript
// Enable debug mode
const DEBUG = process.env.DEBUG === 'true';

function debugLog(message: string, ...args: any[]) {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}`, ...args);
    }
}
```

### Debug FFI Bridge

**1. Add logging to FFI functions:**
```c
sch_result_t sch_engine_create(sch_engine_handle* out_engine) {
    #ifdef ENABLE_FFI_DEBUG
        fprintf(stderr, "[FFI] sch_engine_create called\n");
    #endif

    // Implementation

    #ifdef ENABLE_FFI_DEBUG
        fprintf(stderr, "[FFI] sch_engine_create returned: %d\n", result);
    #endif

    return result;
}
```

**2. Monitor logs:**
```bash
# macOS
log stream --predicate 'subsystem == "com.whiteroom.audio"' --level debug

# Linux
journalctl -f -t white_room
```

### Debug Audio Thread

**1. Use JUCE debugger:**
```cpp
void processBlock(juce::AudioBuffer<float>& buffer) {
    // Add breakpoint here
    DEBUG_BUFFER_STATE(buffer);
}
```

**2. Profile audio code:**
```cpp
class ScopedTimer {
public:
    ScopedTimer(const juce::String& name)
        : name(name), startTime(juce::Time::getHighResolutionTicks()) {}

    ~ScopedTimer() {
        auto elapsed = juce::Time::getHighResolutionTicks() - startTime;
        DBG(name + " took " + juce::String(elapsed) + " ticks");
    }

private:
    juce::String name;
    int64 startTime;
};

// Use in audio thread
void processBlock(juce::AudioBuffer<float>& buffer) {
    ScopedTimer timer("processBlock");
    // Process audio
}
```

### Debug SwiftUI

**1. Enable SwiftUI previews:**
```swift
#if DEBUG
struct MyView_Previews: PreviewProvider {
    static var previews: some View {
        MyView()
    }
}
#endif
```

**2. Use print statements:**
```swift
struct MyView: View {
    var body: some View {
        VStack {
            Text("Hello")
                .onAppear {
                    print("View appeared")
                }
        }
    }
}
```

**3. Use Xcode View Debugger:**
- Run app
- Debug → View Debugging → Capture View Hierarchy

---

## Performance Optimization

### Profile CPU Usage

**macOS:**
```bash
# Sample CPU usage
instruments -t "Time Profiler" -D trace.trace ./build/MyApp

# Open trace
open trace.trace
```

**Linux:**
```bash
# Profile with perf
perf record -g ./build/MyApp
perf report
```

### Optimize Audio Processing

**1. Use SIMD:**
```cpp
// Scalar (slow)
for (int i = 0; i < numSamples; ++i) {
    output[i] = input[i] * gain;
}

// SIMD (fast)
juce::FloatVectorOperations::multiply(output, input, gain, numSamples);
```

**2. Minimize branching:**
```cpp
// Bad (branching in audio thread)
for (int i = 0; i < numSamples; ++i) {
    if (input[i] > threshold) {
        output[i] = processHardClip(input[i]);
    } else {
        output[i] = input[i];
    }
}

// Good (branchless)
for (int i = 0; i < numSamples; ++i) {
    float mask = input[i] > threshold ? 1.0f : 0.0f;
    output[i] = input[i] * (1.0f - mask) + processHardClip(input[i]) * mask;
}
```

**3. Pre-calculate tables:**
```cpp
// Bad (calculate every sample)
float sinWave = std::.sin(angle);

// Good (lookup table)
static const int TABLE_SIZE = 1024;
static float sinTable[TABLE_SIZE];

void initTable() {
    for (int i = 0; i < TABLE_SIZE; ++i) {
        sinTable[i] = std::sin(i * 2.0 * M_PI / TABLE_SIZE);
    }
}

float sinWave = sinTable[index];
```

### Reduce Memory Allocations

**1. Use memory pools:**
```cpp
class RealTimeAllocator {
public:
    void* allocate(size_t size) {
        // Pre-allocated pool
        return pool.allocate(size);
    }

    void deallocate(void* ptr) {
        // Return to pool
        pool.deallocate(ptr);
    }

private:
    juce::MemoryBlock pool;
};
```

**2. Reuse buffers:**
```cpp
// Bad (allocate every time)
void processAudio() {
    juce::AudioBuffer<float> buffer(2, 512);
    // Process
}

// Good (reuse buffer)
juce::AudioBuffer<float> buffer(2, 512);

void processAudio() {
    // Clear and reuse
    buffer.clear();
    // Process
}
```

---

## Memory Leaks

### Detect Memory Leaks

**C++ (Valgrind):**
```bash
# Run with Valgrind
valgrind --leak-check=full --show-leak-kinds=all ./build/MyApp

# Look for:
# "definitely lost", "indirectly lost", "possibly lost"
```

**C++ (Address Sanitizer):**
```bash
# Build with ASan
cmake -B build -S . -DCMAKE_BUILD_TYPE=Debug \
    -DCMAKE_CXX_FLAGS="-fsanitize=address -g" \
    -DCMAKE_LINKER_FLAGS="-fsanitize=address"

# Run
./build/MyApp
```

**Swift (Xcode Instruments):**
1. Run app in Xcode
2. Product → Profile (Cmd + I)
3. Choose "Leaks" template
4. Look for leaks in timeline

**TypeScript (Node.js):**
```bash
# Run with --inspect
node --inspect app.js

# Open Chrome DevTools
chrome://inspect

# Check memory usage
```

### Fix Memory Leaks

**C++ Smart Pointers:**
```cpp
// Bad (raw pointer, potential leak)
Plugin* plugin = new Plugin();

// Good (automatic cleanup)
std::unique_ptr<Plugin> plugin = std::make_unique<Plugin>();
```

**Swift Weak References:**
```swift
// Bad (strong reference cycle)
class Parent {
    var child: Child?
}

class Child {
    var parent: Parent?
}

// Good (weak reference)
class Child {
    weak var parent: Parent?
}
```

**TypeScript Cleanup:**
```typescript
// Bad (no cleanup)
class Processor {
    private timer: NodeJS.Timeout;

    start() {
        this.timer = setInterval(() => {
            // Process
        }, 1000);
    }
}

// Good (cleanup)
class Processor {
    private timer?: NodeJS.Timeout;

    start() {
        this.timer = setInterval(() => {
            // Process
        }, 1000);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}
```

---

## Platform-Specific Issues

### macOS

**Issue:** App crashes on macOS 11 or earlier

**Solution:**
```swift
// Set minimum macOS version in Xcode project
MACOSX_DEPLOYMENT_TARGET = 12.0
```

**Issue:** Plugin not loading in GarageBand

**Solution:**
```bash
# Verify AU plugin is signed
codesign -dv --verbose=4 ~/Library/Audio/Plug-Ins/Components/MyPlugin.component
```

### iOS

**Issue:** Audio session interrupted by phone call

**Solution:**
```swift
// Handle audio session interruptions
NotificationCenter.default.addObserver(
    self,
    selector: #selector(handleInterruption),
    name: AVAudioSession.interruptionNotification,
    object: nil
)

@objc func handleInterruption(notification: Notification) {
    guard let userInfo = notification.userInfo,
          let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
        return
    }

    if type == .began {
        // Pause audio
        engine?.stopEngine()
    } else if type == .ended {
        // Resume audio
        engine?.startEngine()
    }
}
```

### Linux

**Issue:** No audio output

**Solution:**
```bash
# Check ALSA devices
aplay -l

# Check JACK status
jack_lsp

# Verify device permissions
groups $USER  # Should include 'audio'
```

### Windows

**Issue:** Plugin crashes in FL Studio

**Solution:**
```cpp
// Ensure proper calling convention
extern "C" __declspec(dllexport) void* VSTPluginMain();

// Use proper struct packing
#pragma pack(push, 8)
struct MyStruct {
    // ...
};
#pragma pack(pop)
```

---

## Getting More Help

If you're still stuck:

1. **Check existing issues:** Search GitHub issues
2. **Enable debug logging:** Get more information
3. **Create minimal reproducible example:** Isolate the problem
4. **File an issue:** Include logs, stack traces, and system info
5. **Join discussions:** Ask in GitHub Discussions

---

**Last Updated:** 2026-01-15
**Version:** 1.0.0
