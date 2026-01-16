# Phase 9.5A Build Status

## Date
2026-01-02

## Current Status
**BLOCKED** - JUCE build system incompatibility with manual CMake configuration

## What Works
✅ Swift UI - tvOS simulator builds and runs
✅ Transport Flow - Play/Stop/Panic buttons implemented
✅ MockEngineClient - Full state tracking for testing
✅ FFI Header - Frozen v0 API surface (JuceFFI.h)
✅ Sine Wave Generator - Ready to compile (JuceFFI.mm)

## What's Blocked
❌ JUCE Framework Build - Cannot compile JUCE modules manually

### Root Cause
JUCE requires a global header file (`JuceHeader.h` or equivalent) to be included before any JUCE module headers. This is enforced by `juce_TargetPlatform.h:68`:

```cpp
#error "No global header file was included!"
```

When we try to compile JUCE module `.cpp` files directly (like `juce_core.cpp`, `juce_audio_basics.cpp`, etc.), they fail because they don't include the global header first.

### Approaches Tried

#### 1. Direct CMake Build (FAILED)
**Command:**
```bash
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release -DBUILD_FLUTTER_FFI=ON
cmake --build build --target juce_ffi
```

**Error:** `error: "No global header file was included!"`

#### 2. tvOS Simulator CMake (FAILED)
**Script:** `build-tvos-framework.sh`

**Approach:** Cross-compilation flags for tvOS simulator
- `-DCMAKE_SYSTEM_NAME=Darwin`
- `-DCMAKE_OSX_SYSROOT=appletvsimulator26.1`
- `-DCMAKE_OSX_ARCHITECTURES=arm64`

**Error:** CMake compiler test failed (binary output instead of C code)

#### 3. Xcode Project Generator (PARTIAL)
**Script:** `build-tvos-xcode.sh`

**Approach:** Generate Xcode project with `-G Xcode`
- Build using `xcodebuild`
- Target: `juce_ffi`

**Result:**
- ✅ CMake configuration succeeded
- ✅ Objective-C++ compilation enabled (`-x objective-c++`)
- ❌ Still hits "No global header file" error

#### 4. Objective-C++ Conversion (ATTEMPTED)
**Changes:**
- Renamed `JuceFFI.cpp` → `JuceFFI.mm`
- Added `COMPILE_FLAGS "-x objective-c++"` for all JUCE module sources
- Set `XCODE_ATTRIBUTE_CLANG_CXX_LANGUAGE_STANDARD "objective-c++20"`

**Result:** Foundation framework headers compile, but JUCE global header requirement still blocks

## Why This Is Hard

### JUCE Build System Design
JUCE is designed to be built using one of these methods:
1. **Projucer** - JUCE's own project generator tool
2. **JUCE CMake Helper** - `juce_add_juce_module()` and related functions
3. **Pre-built JUCE libraries** - Link against static/dynamic JUCE libs

We're trying to bypass all of these and compile JUCE modules manually, which violates JUCE's design assumptions.

### tvOS Complications
Even if we fix the JUCE build issue, tvOS has additional requirements:
- Requires Objective-C++ for Foundation framework
- Simulator SDK uses different architecture (arm64-apple-tvos-simulator)
- Framework must be bundled with Info.plist and module maps

## Potential Solutions

### Option 1: Use JUCE CMake Helpers (RECOMMENDED)
Use JUCE's official CMake integration:

```cmake
juce_add_juce_module(${PROJECT_NAME}
    MODULE_SOURCES
        src/ffi/JuceFFI.mm
    MODULE_DEPENDENCIES
        juce_core
        juce_audio_basics
        juce_audio_devices
)
```

**Pros:**
- Uses JUCE's intended build system
- Handles global headers automatically
- Cross-platform support

**Cons:**
- Requires restructuring CMakeLists.txt
- May need to remove manual module source lists

### Option 2: Generate JUCE Projects with Projucer
Use Projucer to generate Xcode/VS projects, then build from those.

**Pros:**
- Official JUCE workflow
- Guaranteed to work

**Cons:**
- Requires Projucer installation
- Adds another build step
- Harder to automate

### Option 3: Minimal Test Without JUCE (CURRENT BACKUP)
Create a minimal C library that doesn't use JUCE at all, just to verify the Swift → C FFI bridge works.

**Pros:**
- Proves FFI architecture
- No JUCE dependencies
- Fast to implement

**Cons:**
- Doesn't test actual audio output
- Need to integrate JUCE later anyway

### Option 4: Use Pre-built JUCE Frameworks
Build JUCE separately as a framework, then link against it.

**Pros:**
- Separates concerns
- Can reuse JUCE build

**Cons:**
- Need to build JUCE framework first
- More complex dependency management

## Recommended Next Steps

### Immediate (Phase 9.5A.1)
1. **Try Option 3** - Build minimal C library without JUCE
   - Remove JUCE dependencies from CMakeLists.txt
   - Create simple sine wave generator using CoreAudio directly
   - Test Swift → C → Audio path
   - Verify FFI bridge works end-to-end

2. **Once FFI Verified** - Try Option 1 (JUCE CMake Helpers)
   - Research `juce_add_juce_module()` and related functions
   - Restructure CMakeLists.txt to use JUCE helpers
   - Test with JUCE modules
   - Migrate to tvOS when working

### Alternative (If Option 1 Fails)
- Use Xcode GUI to create JUCE project manually
- Add our FFI source files to the JUCE project
- Build framework from Xcode
- Verify in Swift app

## Code Changes Made

### CMakeLists.txt
```cmake
# Updated FFI source reference
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/src/ffi/JuceFFI.mm)
    add_library(juce_ffi SHARED
        src/ffi/JuceFFI.mm
        # ... JUCE modules ...
    )

    # Force Objective-C++ compilation
    set_source_files_properties(
        src/ffi/JuceFFI.mm
        external/JUCE/modules/juce_core/juce_core.cpp
        # ... all other JUCE modules ...
        PROPERTIES
        COMPILE_FLAGS "-x objective-c++"
    )

    # Set Objective-C++20 standard
    set_target_properties(juce_ffi PROPERTIES
        XCODE_ATTRIBUTE_CLANG_CXX_LANGUAGE_STANDARD "objective-c++20"
        XCODE_ATTRIBUTE_CLANG_CXX_LIBRARY "libc++"
    )
endif()
```

### include/ffi/JuceFFI.h
```c
// Fixed empty struct warnings
typedef struct { void* _placeholder; } schillinger_song_diff_t;
typedef struct { void* _placeholder; } schillinger_edit_response_t;
// ... etc ...
```

### src/ffi/JuceFFI.mm (renamed from .cpp)
```objective-c++
// Fixed includes
#include "JuceFFI.h"
#include <juce_core/juce_core.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_basics/juce_audio_basics.h>
```

## Files Created
- `build-tvos-framework.sh` - Original tvOS build attempt
- `build-tvos-xcode.sh` - Xcode project approach
- `build-macos-test.sh` - macOS test build
- Various build directories (all failed)

## Summary
Phase 9.5A is blocked on JUCE build system integration. The FFI API design is solid, Swift UI is working, and the audio generator code is ready. The only remaining task is resolving the JUCE compilation issue, which requires using JUCE's official CMake helpers or an alternative build approach.

**Estimated Time to Unblock:** 2-4 hours (depending on solution chosen)
