# Build Matrix Documentation

## Overview

This document defines the complete build matrix for the White Room audio plugin ecosystem across all target platforms and formats.

## Build Targets

### Core DSP Library
**Purpose**: Shared audio processing engine used by all plugin formats

**Platform**: All (Linux, macOS, Windows, iOS)

**Build Output**: Static library (`libjuce_backend.a` / `juce_backend_ios.a`)

**Dependencies**:
- JUCE framework (audio-only modules)
- Google Test (for testing)
- nlohmann/json

**Included Instruments**:
- LocalGal (Feel-Vector Synthesizer)
- KaneMarco (Hybrid Virtual Analog)
- KaneMarcoAether (Physical Modeling)
- KaneMarcoAetherString (String Resonator)
- NexSynth (FM Synthesizer)
- SamSampler (SF2 Sampler)
- DrumMachine (Percussion)

**Audio Layer**:
- VoiceManager (polyphony management)
- Scheduler (timing and synchronization)
- DropoutPrevention (real-time safety)

**Build Commands**:
```bash
# macOS/Linux
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target juce_backend_ios -j$(sysctl -n hw.ncpu)

# iOS
cmake -B build-ios -DCMAKE_SYSTEM_NAME=iOS -DCMAKE_OSX_ARCHITECTURES=arm64
cmake --build build-ios --target juce_backend_ios -j$(sysctl -n hw.ncpu)
```

---

### LV2 Plugin (Linux / Raspberry Pi)
**Purpose**: Linux audio plugin format for desktop and embedded deployment

**Platform**: Linux (x86_64, arm64), Raspberry Pi (armv7, arm64)

**Build Output**: LV2 bundle (`.lv2` directory with manifest and binaries)

**Dependencies**:
- LV2 SDK
- JUCE framework
- Core DSP library

**Target Instruments**:
- FilterGate (Dynamics Processor)
- All instruments (via Core DSP library)

**Build Commands**:
```bash
# Enable LV2 builds
cmake -B build -DBUILD_LV2_PLUGINS=ON
cmake --build build --target lv2_plugins

# Deploy to system LV2 path
make install
# Default: /usr/lib/lv2/
# Custom: cmake -DCMAKE_INSTALL_PREFIX=/usr/local ..
```

**Raspberry Pi Specific**:
```bash
# Cross-compile from macOS/Linux
cmake -B build-pi \
  -DCMAKE_TOOLCHAIN_FILE=cmake/raspberrypi-toolchain.cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_LV2_PLUGINS=ON

# Or build directly on Pi
cmake -B build -DBUILD_LV2_PLUGINS=ON
cmake --build build -j4  # Pi 4 has 4 cores
```

**Deployment Paths**:
- System: `/usr/lib/lv2/`
- User: `~/.lv2/`
- Custom: `$LV2_PATH`

---

### AUv3 Plugin (iOS)
**Purpose**: iOS Audio Unit plugin format for iPhone/iPad

**Platform**: iOS (arm64)

**Build Output**: `.appex` bundle (App Extension)

**Dependencies**:
- Xcode (with iOS SDK)
- Core Audio framework
- AVFoundation (for audio session management)
- Core DSP library

**Target Instruments**: All instruments (via Core DSP library)

**Build Commands**:
```bash
# Build via Xcode
open juce_backend/ios/WhiteRoomAUv3.xcodeproj
# Product > Archive

# Or via xcodebuild
xcodebuild -project WhiteRoomAUv3.xcodeproj \
  -scheme WhiteRoomAUv3 \
  -configuration Release \
  -sdk iphoneos \
  -archiveBuildPath build/WhiteRoomAUv3.xcarchive
```

**Build Settings**:
- Deployment Target: iOS 14.0+
- Architectures: arm64
- Bitcode: Disabled (for real-time performance)
- Optimization: -O3 -ffast-math

**Capabilities Required**:
- Audio Background Mode
- Inter-App Audio (optional, for legacy hosts)

---

### Standalone Application (Desktop)
**Purpose**: Desktop DAW application for macOS, Windows, Linux

**Platform**: macOS, Windows, Linux

**Build Output**: Native executable
- macOS: `.app` bundle
- Windows: `.exe`
- Linux: ELF binary

**Dependencies**:
- JUCE framework (full GUI modules)
- Core DSP library
- Platform-specific frameworks

**Target Instruments**: All instruments

**Build Commands**:
```bash
# macOS
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target SchillingerEcosystemWorkingDAW -j$(sysctl -n hw.ncpu)

# Windows (Visual Studio)
cmake -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release

# Linux
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target SchillingerEcosystemWorkingDAW -j$(nproc)
```

**macOS Signing**:
```bash
# Hardened runtime
codesign --force --deep --sign "Developer ID Application: Your Name" \
  build/SchillingerEcosystemWorkingDAW.app

# Notarization (for distribution)
xcrun notarytool submit build/WhiteRoom-1.0.0.dmg \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAMID" \
  --wait
```

---

## Platform-Specific Dependencies

### macOS
```bash
# Homebrew
brew install cmake ninja nlohmann-json googletest

# JUCE
cd external/JUCE
git checkout 7.0.12  # Stable release
```

### Ubuntu/Debian
```bash
# System packages
sudo apt-get install -y \
  cmake ninja-build \
  liblv2-dev \
  libnlohmann-json3-dev \
  libgtest-dev \
  libasound2-dev \
  libx11-dev \
  libxcb1-dev \
  libxrandr-dev \
  libxinerama-dev \
  libxcursor-dev \
  libfreetype6-dev
```

### Raspberry Pi OS
```bash
# Same as Ubuntu, plus ARM optimizations
sudo apt-get install -y \
  gcc-arm-linux-gnueabihf \
  g++-arm-linux-gnueabihf \
  libc6-dev-armhf-cross

# Enable 64-bit kernel for arm64 builds
# Edit /boot/config.txt: enable_64bit=1
```

### iOS
- Xcode 14.0+ (from App Store)
- iOS SDK 14.0+
- Command Line Tools

---

## Build Optimization Flags

### Release Builds
```cmake
# Common optimizations
-O3                    # Maximum optimization
-march=native          # CPU-specific optimizations (desktop)
-march=armv8-a+crypto  # ARM optimizations (iOS/M1)
-ffast-math           # Faster floating-point math
-funroll-loops        # Loop unrolling
-finline-functions     # Function inlining
```

### Debug Builds
```cmake
-g                    # Debug symbols
-O0                   # No optimization
-fsanitize=address    # Address sanitizer (optional)
-fsanitize=undefined  # Undefined behavior sanitizer (optional)
```

### Profile-Guided Optimization (PGO)
```bash
# Step 1: Build with profiling
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_FLAGS="-fprofile-generate"
cmake --build build
./build/tests/all_tests  # Run representative workload

# Step 2: Rebuild with profile data
cmake -B build -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_FLAGS="-fprofile-use"
cmake --build build
```

---

## Continuous Integration Matrix

### GitHub Actions Runners

| Platform | Runner | Container | Status |
|----------|--------|-----------|--------|
| macOS-latest | macos-14 | No | Production |
| ubuntu-latest | ubuntu-22.04 | Yes | Production |
| windows-latest | windows-2022 | No | Production |
| iOS | macos-14 | No | Production |
| Raspberry Pi | self-hosted | No | Optional |

### CI Build Configurations

```yaml
# Example matrix for GitHub Actions
strategy:
  matrix:
    include:
      # macOS builds
      - platform: macos
        arch: arm64
        target: standalone
        config: Release

      - platform: macos
        arch: x86_64
        target: core_dsp
        config: Release

      # Ubuntu builds
      - platform: ubuntu
        arch: x86_64
        target: lv2
        config: Release

      - platform: ubuntu
        arch: x86_64
        target: standalone
        config: Release

      # iOS builds
      - platform: ios
        arch: arm64
        target: auv3
        config: Release
        sdk: iphoneos

      - platform: ios
        arch: arm64
        target: simulator
        config: Debug
        sdk: iphonesimulator
```

---

## Artifact Naming Convention

### Format: `{project}-{version}-{target}-{platform}-{arch}.{ext}`

Examples:
- `whiteroom-1.0.0-core_dsp-macos-arm64.a`
- `whiteroom-1.0.0-lv2-linux-x86_64.tar.gz`
- `whiteroom-1.0.0-auv3-ios-arm64.appex`
- `whiteroom-1.0.0-standalone-win64-x86_64.zip`

---

## Version Management

### CMake Version
```cmake
project(SchillingerEcosystemWorkingDAW VERSION 1.1.0)
```

### Git Tags
```bash
# Format: v{major}.{minor}.{patch}
git tag v1.1.0
git push origin v1.1.0

# Build from tag
cmake -B build -DGIT_TAG=v1.1.0
```

### Automatic Versioning
```bash
# Generate version from git describe
GIT_DESCRIBE=$(git describe --tags --always)
BUILD_VERSION=${GIT_DESCRIBE:-v1.0.0-dev}
cmake -B build -DPROJECT_VERSION=${BUILD_VERSION#v}
```

---

## Troubleshooting

### Common Build Issues

**Issue**: `juce_backend_ios` has undefined symbols
```bash
# Solution: Verify all instrument DSP files are included
ls instruments/*/src/dsp/*.cpp
# Ensure CMakeLists.txt includes all required sources
```

**Issue**: LV2 plugin not found by host
```bash
# Solution: Verify LV2_PATH or install to system directory
ls /usr/lib/lv2/FilterGate.lv2/
export LV2_PATH=/usr/lib/lv2:$LV2_PATH
```

**Issue**: iOS build fails with code signing error
```bash
# Solution: Update provisioning profile in Xcode
# Project > Signing & Capabilities > Team
```

**Issue**: Standalone app crashes on startup
```bash
# Solution: Verify all frameworks are linked
otool -L build/SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW
# Should list: @rpath/CoreAudio.framework, etc.
```

---

## Performance Benchmarks

### Build Times (Reference Hardware)

| Target | Platform | Time (cores) |
|--------|----------|--------------|
| Core DSP (macOS M1) | macOS | 45s (8 cores) |
| Core DSP (Intel i7) | Ubuntu | 1m30s (8 cores) |
| LV2 Plugin | Ubuntu | 2m (8 cores) |
| AUv3 Plugin | macOS (iOS) | 3m (8 cores) |
| Standalone | macOS | 4m (8 cores) |
| All Tests | macOS | 6m (8 cores) |

---

## Further Reading

- JUCE Plugin Development: https://docs.juce.com/master/plugin_overview.html
- LV2 Specification: https://lv2plug.in/
- AUv3 Development: https://developer.apple.com/documentation/audiounits
- CMake Documentation: https://cmake.org/documentation/
