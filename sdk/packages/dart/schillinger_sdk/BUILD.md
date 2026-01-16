# Building the Schillinger Dart SDK

This guide explains how to build the Schillinger SDK Dart package from source, including the native C ABI library.

## Prerequisites

### Required Tools

- **CMake** >= 3.15
- **C++ Compiler** (GCC, Clang, or MSVC)
- **Node.js** >= 16.0.0 (for Node-API bridge)
- **Dart SDK** >= 3.0.0
- **ffigen** >= 9.0.0

### Platform-Specific

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install CMake
brew install cmake

# Install Node.js
brew install node
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake nodejs npm

# Fedora
sudo dnf install gcc-c++ cmake nodejs npm
```

#### Windows
```bash
# Install Visual Studio 2019 or later (with C++ support)
# Install CMake from https://cmake.org/
# Install Node.js from https://nodejs.org/
```

## Build Steps

### 1. Clone Repository

```bash
git clone https://github.com/schillinger/schillinger-sdk.git
cd schillinger-sdk
```

### 2. Build Native C ABI Library

```bash
cd native/schillinger_cabi

# Install Node.js dependencies
npm install

# Build the native library
npm run build:release

# The output will be in build/ directory:
# - macOS: build/libschillinger_cabi.dylib
# - Linux: build/libschillinger_cabi.so
# - Windows: build\schillinger_cabi.dll
```

### 3. Generate Dart FFI Bindings

```bash
cd packages/dart/schillinger_sdk

# Install Dart dependencies
dart pub get

# Install ffigen globally (if not already installed)
dart pub global activate ffigen

# Generate FFI bindings from C header
dart run ffigen

# This generates: lib/src/ffigen/schillinger_capi_generated.dart
```

### 4. Build Dart Package

```bash
# Verify package compiles
dart analyze

# Run tests (if native library is available)
dart test
```

## Development Build

For development builds with debug symbols:

```bash
cd native/schillinger_cabi
cmake -DCMAKE_BUILD_TYPE=Debug -B build -S .
cmake --build build
```

## Release Build

For optimized release builds:

```bash
cd native/schillinger_cabi
cmake -DCMAKE_BUILD_TYPE=Release -B build -S .
cmake --build build
```

## Installing the Native Library

### Option 1: System-Wide Installation

```bash
cd native/schillinger_cabi
sudo cmake --install build
```

This installs to:
- `/usr/local/lib/` on Linux/macOS
- `C:\Program Files\` on Windows

### Option 2: Local Installation

```bash
cd native/schillinger_cabi
cmake --install build --prefix ../../packages/dart/schillinger_sdk/native
```

This installs to the Dart package's native directory.

### Option 3: Runtime Loading

The SDK can load the library at runtime from:
1. The same directory as the Dart executable
2. System library paths
3. Custom path specified via environment variable

```dart
// Set custom library path
Platform.environment['SCHILLINGER_LIB_PATH'] = '/path/to/library';
```

## Flutter Integration

For Flutter applications, the native library needs to be included in the app bundle.

### Android

Add to `android/app/build.gradle`:

```gradle
android {
    sourceSets {
        main.jniLibs.srcDirs += '../../native/schillinger_cabi/build/lib'
    }
}
```

### iOS/macOS

Add to `macos/Podfile` or `ios/Podfile`:

```ruby
plugin 'schillinger_sdk', :path => '../..'
```

### Windows

Copy `.dll` file to `windows/runner/Release/` directory.

## Troubleshooting

### Build Errors

#### "Cannot find -lnode"

**Problem**: Node-API libraries not found.

**Solution**: Install Node.js development packages:

```bash
# macOS
brew install node

# Linux
sudo apt-get install nodejs-dev
```

#### "ffigen failed to generate bindings"

**Problem**: ffigen cannot parse C header.

**Solution**: Ensure header file is at the correct path:

```bash
# Check header exists
ls -l ../../native/schillinger_cabi/include/schillinger_cabi.h

# Regenerate bindings
dart run ffigen
```

#### "Failed to load native library"

**Problem**: Dart cannot find the native library at runtime.

**Solution**: Set library path:

```bash
export LD_LIBRARY_PATH=/path/to/native/schillinger_cabi/build:$LD_LIBRARY_PATH  # Linux
export DYLD_LIBRARY_PATH=/path/to/native/schillinger_cabi/build:$DYLD_LIBRARY_PATH  # macOS
```

### Verification

Verify the build succeeded:

```bash
# Check native library
file native/schillinger_cabi/build/libschillinger_cabi.*

# Should output:
# macOS: Mach-O 64-bit dynamically linked shared library
# Linux: ELF 64-bit LSB shared object
# Windows: PE32+ executable (DLL) x86-64
```

## Clean Build

To clean everything and start fresh:

```bash
# Clean native build
cd native/schillinger_cabi
rm -rf build
npm run clean

# Clean Dart bindings
cd ../../packages/dart/schillinger_sdk
rm -f lib/src/ffigen/schillinger_capi_generated.dart
dart clean
```

## Continuous Integration

See `.github/workflows/dart.yml` for CI/CD configuration that automatically:
- Builds native library on all platforms
- Generates FFI bindings
- Runs tests
- Publishes to pub.dev

## Additional Resources

- [CMake Documentation](https://cmake.org/documentation/)
- [Node-API Documentation](https://nodejs.org/api/n-api.html)
- [Dart FFI Documentation](https://dart.dev/guides/libraries/c-interop)
- [ffigen Documentation](https://pub.dev/packages/ffigen)
