# White Room Build System

**Comprehensive guide to building White Room on all platforms.**

---

## Table of Contents

1. [Overview](#overview)
2. [iOS Build](#ios-build)
3. [JUCE Plugin Build](#juce-plugin-build)
4. [SDK Build](#sdk-build)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Troubleshooting Builds](#troubleshooting-builds)

---

## Overview

### Build Architecture

```
┌─────────────────────────────────────────┐
│         CI/CD (GitHub Actions)          │
└───────────────┬─────────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
┌──────▼──────┐  ┌──────▼──────┐
│   macOS     │  │   iOS/tvOS  │
│   App       │  │   Apps      │
└─────────────┘  └─────────────┘
       │                 │
       └────────┬────────┘
                │
       ┌────────▼────────┐
       │  Dependencies   │
       │  - JUCE         │
       │  - SDK          │
       │  - Swift UI     │
       └─────────────────┘
```

### Build Tools

**macOS/iOS/tvOS**:
- Xcode 15.0+
- Swift 5.9+
- Swift Package Manager

**JUCE Backend**:
- CMake 3.25+
- C++17 compiler (Clang)
- JUCE 7.0+

**TypeScript SDK**:
- Node.js 20+
- npm/yarn
- TypeScript 5.0+

---

## iOS Build

### Prerequisites

**Required**:
- Xcode 15.0+
- macOS 13.0+ (Ventura)
- Apple Developer account (for device deployment)
- CocoaPods (for dependencies)

**Install CocoaPods**:
```bash
sudo gem install cocoapods
```

### Build Steps

**1. Clone Repository**:
```bash
git clone https://github.com/white-room/white_room.git
cd white_room
```

**2. Install Dependencies**:
```bash
cd ios_app
pod install
```

**3. Open in Xcode**:
```bash
open WhiteRoom.xcworkspace
```

**4. Select Target**:
- **iOS App**: iPhone/iPad app
- **tvOS App**: Apple TV app
- **macOS App**: Mac app

**5. Build**:
```bash
# Command line
xcodebuild -workspace WhiteRoom.xcworkspace \
           -scheme WhiteRoomiOS \
           -configuration Debug \
           -sdk iphoneos

# Or use Xcode: Product > Build (Cmd+B)
```

**6. Run on Device/Simulator**:
```bash
# Simulator
xcrun simctl boot "iPhone 15"
xcodebuild -workspace WhiteRoom.xcworkspace \
           -scheme WhiteRoomiOS \
           -destination 'platform=iOS Simulator,name=iPhone 15'

# Device (requires code signing)
xcodebuild -workspace WhiteRoom.xcworkspace \
           -scheme WhiteRoomiOS \
           -configuration Release \
           -sdk iphoneos \
           CODE_SIGN_IDENTITY="Apple Distribution: Your Name"
```

### Build Configurations

**Debug**:
- Optimizations disabled (-O0)
- Debug symbols included
- Asserts enabled
- Faster builds

**Release**:
- Optimizations enabled (-Os)
- Debug symbols stripped
- Asserts disabled
- Smaller binary

### Code Signing

**Development**:
- Automatic signing (recommended)
- Xcode manages certificates
- Free Apple ID sufficient

**Distribution**:
- Manual signing required
- Apple Developer account ($99/year)
- Distribution certificate
- Provisioning profile

---

## JUCE Plugin Build

### Prerequisites

**Required**:
- CMake 3.25+
- C++17 compiler (Clang, GCC, MSVC)
- JUCE 7.0+

**Install JUCE**:
```bash
# Download JUCE from https://juce.com/get-juce
# Or use git
git clone https://github.com/juce-framework/JUCE.git
cd JUCE
git checkout 7.0.0
```

### Build Steps

**1. Configure**:
```bash
cd juce_backend
cmake -B build -S . \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=13.0
```

**2. Build**:
```bash
cmake --build build --config Release
```

**3. Test**:
```bash
cd build
ctest --output-on-failure
```

### Build Targets

**Shared Library**:
```bash
cmake --build build --target WhiteRoomEngine
# Outputs: build/libWhiteRoomEngine.dylib
```

**Static Library**:
```bash
cmake --build build --target WhiteRoomEngineStatic
# Outputs: build/libWhiteRoomEngineStatic.a
```

**Plugin (AU/VST3)**:
```bash
cmake --build build --target WhiteRoomPlugin_AU
cmake --build build --target WhiteRoomPlugin_VST3
# Outputs: build/WhiteRoomPlugin.component / .vst3
```

### Cross-Compilation

**Windows (from macOS)**:
```bash
cmake -B build-win -S . \
  -DCMAKE_SYSTEM_NAME=Windows \
  -DCMAKE_C_COMPILER=x86_64-w64-mingw32-gcc \
  -DCMAKE_CXX_COMPILER=x86_64-w64-mingw32-g++
```

**Linux (from macOS)**:
```bash
cmake -B build-linux -S . \
  -DCMAKE_SYSTEM_NAME=Linux \
  -DCMAKE_C_COMPILER=x86_64-linux-gnu-gcc \
  -DCMAKE_CXX_COMPILER=x86_64-linux-gnu-g++
```

---

## SDK Build

### Prerequisites

**Required**:
- Node.js 20+
- npm or yarn

**Install**:
```bash
# macOS
brew install node

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### Build Steps

**1. Install Dependencies**:
```bash
cd sdk
npm install
# or
yarn install
```

**2. Build**:
```bash
npm run build
# or
yarn build
```

**3. Test**:
```bash
npm test
# or
yarn test
```

**4. Lint**:
```bash
npm run lint
# or
yarn lint
```

### Build Outputs

**TypeScript**:
```bash
npm run build
# Outputs: dist/index.js, dist/index.d.ts
```

**Declaration Files**:
```bash
npm run build:types
# Outputs: dist/*.d.ts
```

**Source Maps**:
```bash
npm run build:sourcemaps
# Outputs: dist/index.js.map
```

---

## CI/CD Pipeline

### GitHub Actions

**Location**: `.github/workflows/`

**Workflows**:

**1. CI (Continuous Integration)**:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Swift
        run: |
          cd swift_frontend
          swift build
      - name: Build SDK
        run: |
          cd sdk
          npm install
          npm run build
      - name: Build JUCE
        run: |
          cd juce_backend
          cmake -B build -S .
          cmake --build build
      - name: Run Tests
        run: |
          cd swift_frontend && swift test
          cd ../sdk && npm test
          cd ../juce_backend/build && ctest
```

**2. Release (Deployment)**:
```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Release
        run: |
          xcodebuild -project WhiteRoom.xcodeproj \
                     -scheme WhiteRoom \
                     -configuration Release
      - name: Create Archive
        run: |
          xcodebuild -archivePath WhiteRoom.xcarchive \
                     -scheme WhiteRoom \
                     archive
      - name: Export App
        run: |
          xcodebuild -exportArchive \
                     -archivePath WhiteRoom.xcarchive \
                     -exportPath . \
                     -exportOptionsPlist ExportOptions.plist
      - name: Upload to GitHub
        uses: softprops/action-gh-release@v1
        with:
          files: WhiteRoom.dmg
```

**3. Nightly (Scheduled)**:
```yaml
name: Nightly
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build All
        run: ./scripts/build_all.sh
      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: nightly-build
          path: build/*.dmg
```

### Automated Testing

**Unit Tests**:
- Run on every push
- Must pass before merge
- Coverage tracked

**Integration Tests**:
- Run on PR creation
- Test critical workflows
- Must pass before merge

**Performance Tests**:
- Run on nightly builds
- Track performance over time
- Alert on regressions

---

## Troubleshooting Builds

### Common Issues

**Swift Build Fails**:
```
error: missing required module 'JUCE'
```

**Solution**:
```bash
cd swift_frontend
swift package reset
swift package resolve
```

**TypeScript Build Fails**:
```
error TS2307: Cannot find module
```

**Solution**:
```bash
cd sdk
rm -rf node_modules package-lock.json
npm install
```

**JUCE Build Fails**:
```
error: 'JuceHeader.h' file not found
```

**Solution**:
```bash
cd juce_backend
rm -rf build
cmake -B build -S . -DJUCE_DIR=/path/to/JUCE
```

**Code Signing Errors**:
```
error: No signing certificate found
```

**Solution**:
1. Open Xcode > Preferences > Accounts
2. Add Apple ID
3. Select team (Personal or Organization)
4. Clean and rebuild

### Performance Issues

**Slow Builds**:
- Use `ccache` for C++ builds
- Enable Swift build cache
- Parallelize builds (`make -j8`)

**Memory Issues**:
- Close other apps
- Reduce build parallelism
- Increase swap file

### Debugging Builds

**Verbose Output**:
```bash
# Swift
swift build --verbose

# CMake
cmake --build build --verbose

# Xcode
xcodebuild ... OTHER_SWIFT_FLAGS="-verbose"
```

**Clean Build**:
```bash
# Swift
swift package clean

# CMake
rm -rf build

# Xcode
# Product > Clean Build Folder (Shift+Cmd+K)
```

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Previous**: [Contributing Guide](CONTRIBUTING.md)

---

*For build issues, check the troubleshooting guide or open an issue on GitHub.*
