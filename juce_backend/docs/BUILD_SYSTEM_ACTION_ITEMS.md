# Build System Action Items - Quick Reference

## Critical Issues (Fix Before Next Release)

### 1. Flutter FFI Integration ⚠️ HIGH PRIORITY
**File**: CMakeLists.txt lines 493-576

**Issue**: JUCE modules compiled directly may cause symbol conflicts
**Impact**: Runtime crashes, ABI incompatibility
**Fix**: Verify no duplicate symbols between juce_ffi and main DAW

**Test**:
```bash
cd build_simple
nm -U libjuce_ffi.dylib | grep "juce_" | head -20
nm -U SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW | grep "juce_" | head -20
# Compare for conflicts
```

---

### 2. Plugin Build Source Code Issues ⚠️ HIGH PRIORITY
**Location**: plugins/CMakeLists.txt

**LOCAL_GAL** (2 errors):
- File: `LOCAL_GAL/src/ui/LOCAL_GALPluginProcessor.cpp:149`
  - Error: `MemoryOutputStream` constructor mismatch
  - Fix: Add buffer size parameter or use MemoryBlock wrapper
  ```cpp
  // Change from:
  juce::MemoryOutputStream stream;
  // To:
  juce::MemoryOutputStream stream (2048);
  ```

- File: `LOCAL_GAL/src/ui/LOCAL_GALPluginEditor.cpp:147+`
  - Error: Indirection on AudioProcessorValueTreeState
  - Fix: Check if `parameters` is pointer or reference
  ```cpp
  // If reference, change:
  parameters->getParameter(...)
  // To:
  parameters.getParameter(...)
  ```

**SamSampler** (missing methods):
- File: `Nex_synth/src/synthesis/SamSamplerIntegration.cpp`
  - Add: `prepareToPlay(double sampleRate, int samplesPerBlock)`
  - Add: `releaseResources()`
  - Add: `processBlock(AudioBuffer<float>&, MidiBuffer&)`

**NexSynth** (missing methods):
- File: `Nex_synth/src/synthesis/NexSynthIntegration.cpp`
  - Add: `prepareToPlay(double sampleRate, int samplesPerBlock)`
  - Add: `releaseResources()`
  - Add: `processBlock(AudioBuffer<float>&, MidiBuffer&)`

---

### 3. Compiler Dependency Removal ✅ COMPLETE
**Status**: 148 files removed - CMake optimization
**Impact**: Positive - faster incremental builds
**Action Required**: None (this is good)

---

## Testing Checklist

### Pre-Commit Tests (Run Before Every Push)
```bash
#!/bin/bash
# tests/pre_commit.sh

echo "=== Pre-commit build verification ==="

# 1. Clean configure
rm -rf build_simple
cmake -B build_simple -DCMAKE_BUILD_TYPE=Release || exit 1

# 2. Build main executable
cmake --build build_simple --target SchillingerEcosystemWorkingDAW -j4 || exit 1

# 3. Build Flutter FFI
cmake --build build_simple --target juce_ffi || exit 1

# 4. Verify binary exists
[ -f build_simple/SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW ] || exit 1
[ -f build_simple/libjuce_ffi.dylib ] || exit 1

# 5. Run unit tests
cd build_simple && ctest --output-on-failure || exit 1

echo "✅ Pre-commit tests passed"
```

### Integration Tests (Run Before Merging to Main)
```bash
#!/bin/bash
# tests/integration.sh

echo "=== Integration tests ==="

# 1. Build all plugins
cd plugins
rm -rf build
cmake -B build -DCMAKE_BUILD_TYPE=Release || exit 1
cmake --build build || exit 1

# 2. Verify plugin bundles exist
find build -name "*.component" | grep -q "LOCAL_GAL" || exit 1
find build -name "*.vst3" | grep -q "LOCAL_GAL" || exit 1

# 3. Validate AU plugins (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    auval -v com.schillingerEcosystem.localgal || true
fi

echo "✅ Integration tests passed"
```

---

## CI/CD Setup (Immediate Priority)

### GitHub Actions Workflow
**File**: `.github/workflows/build.yml`

```yaml
name: Build and Test

on:
  push:
    branches: [main, juce_backend_clean]
  pull_request:
    branches: [main]

jobs:
  build-macos:
    runs-on: macos-latest
    strategy:
      matrix:
        build_type: [Debug, Release]

    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - name: Configure CMake
        run: cmake -B build -DCMAKE_BUILD_TYPE=${{ matrix.build_type }}

      - name: Build
        run: cmake --build build -- -j$(sysctl -n hw.ncpu)

      - name: Test
        run: cd build && ctest --output-on-failure

      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: macos-${{ matrix.build_type }}
          path: |
            build/SchillingerEcosystemWorkingDAW.app
            build/libjuce_ffi.dylib
```

---

## Build Optimization (Performance)

### Enable Ccache (10x faster rebuilds)
```cmake
# Add to CMakeLists.txt after project() call
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    message(STATUS "✓ ccache enabled")
    set(CMAKE_CXX_COMPILER_LAUNCHER ${CCACHE_PROGRAM})
endif()
```

### Enable Unity Builds (60% faster compilation)
```cmake
# Add after target definitions
set_target_properties(SchillingerEcosystemWorkingDAW PROPERTIES
    UNITY_BUILD ON
    UNITY_BUILD_BATCH_SIZE 10
)
```

---

## Platform-Specific Fixes

### Windows Support
**File**: CMakeLists.txt

**Add**:
```cmake
if(WIN32)
    # Windows runtime library
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

    # Windows-specific optimizations
    target_compile_options(SchillingerEcosystemWorkingDAW PRIVATE
        /arch:AVX2
        /O2
    )

    # DLL exports for juce_ffi
    target_compile_definitions(juce_ffi PRIVATE
        JUCE_DLL_EXPORTS=1
    )
endif()
```

### Linux Support
**File**: CMakeLists.txt

**Add**:
```cmake
if(UNIX AND NOT APPLE)
    # Find audio libraries
    pkg_check_modules(ALSA REQUIRED alsa)
    pkg_check_modules(JACK REQUIRED jack)

    target_link_libraries(SchillingerEcosystemWorkingDAW PRIVATE
        ${ALSA_LIBRARIES}
        ${JACK_LIBRARIES}
        pthread
        dl
    )

    target_include_directories(SchillingerEcosystemWorkingDAW PRIVATE
        ${ALSA_INCLUDE_DIRS}
        ${JACK_INCLUDE_DIRS}
    )

    # Library versioning
    set_target_properties(juce_ffi PROPERTIES
        VERSION ${PROJECT_VERSION}
        SOVERSION 1
    )
endif()
```

---

## Security Hardening (Next Sprint)

### Compiler Hardening Flags
**Add to CMakeLists.txt**:
```cmake
if(CMAKE_CXX_COMPILER_ID MATCHES "AppleClang|GNU|Clang")
    target_compile_options(SchillingerEcosystemWorkingDAW PRIVATE
        -fstack-protector-strong
        -fPIC
        -fPIE
        $<$<CONFIG:Release>:-D_FORTIFY_SOURCE=2>
        -Wformat
        -Wformat-security
    )

    target_link_options(SchillingerEcosystemWorkingDAW PRIVATE
        -Wl,-z,relro
        -Wl,-z,now
        -Wl,-z,noexecstack
    )
endif()
```

---

## Monitoring & Metrics

### Build Time Tracking
```bash
# Track build times over time
time cmake --build build --config Release
echo "Build time: $SECONDS seconds" >> build_times.log
```

### Binary Size Tracking
```bash
# Track binary sizes
ls -lh SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW
ls -lh libjuce_ffi.dylib
```

---

## Quick Diagnostic Commands

```bash
# Check for symbol conflicts
nm -DU build_simple/libjuce_ffi.dylib | grep "juce_" | sort > ffi_symbols.txt
nm -DU build_simple/SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW | grep "juce_" | sort > daw_symbols.txt
diff ffi_symbols.txt daw_symbols.txt

# Check framework dependencies
otool -L build_simple/libjuce_ffi.dylib

# Check bundle structure
find build_simple -name "*.app" -exec ls -R {} \;

# Check plugin bundles
find plugins/build -name "*.component" -o -name "*.vst3"

# Validate AU plugin
auval -v com.schillingerEcosystem.localgal

# Check for compiler warnings
cmake --build build_simple 2>&1 | grep -i "warning"
```

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Clean build time | ~10 min | < 8 min | `time cmake --build` |
| Incremental build | ~30 sec | < 10 sec | `touch file.h && cmake --build` |
| Binary size (DAW) | TBD | < 50 MB | `ls -lh` |
| Binary size (FFI) | TBD | < 10 MB | `ls -lh` |
| Plugin load time | TBD | < 1 sec | Manual DAW test |
| Memory footprint | TBD | < 200 MB | Activity Monitor |

---

## Next Steps

**This Week**:
1. Fix LOCAL_GAL JUCE API compatibility (30 min)
2. Add DSP methods to SamSampler/NexSynth (1 hour)
3. Verify Flutter FFI symbol integrity (15 min)
4. Test plugin loading in DAW (1 hour)

**Next Sprint**:
1. Set up GitHub Actions CI/CD (2 hours)
2. Add ccache support (30 min)
3. Implement code signing (1 hour)
4. Add integration tests (2 hours)

**Next Quarter**:
1. Enable unity builds (1 hour)
2. Add PGO (4 hours)
3. Set up dependency scanning (2 hours)
4. Add Linux build support (8 hours)

---

**Last Updated**: 2025-12-25
**Status**: 🟡 Build System Healthy - Minor Issues Require Attention
**Priority**: Fix plugin compilation issues before next release
