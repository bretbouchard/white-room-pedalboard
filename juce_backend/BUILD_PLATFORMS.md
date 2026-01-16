# JUCE Backend Multi-Platform Build Guide

## Quick Start

```bash
# Build for iOS (both device and simulator)
./build_ios.sh

# Build for all platforms
./build_all_platforms.sh
```

## Platform-Specific Builds

### iOS (iPhone/iPad)
```bash
./build_ios_device.sh      # Physical device
./build_ios_simulator.sh   # Simulator
```

**Libraries produced:**
- `Libraries/libjuce_backend_ios_device.a` (iPhone/iPad)
- `Libraries/libjuce_backend_ios_simulator.a` (Simulator)
- `Libraries/libjuce_backend_ios_iphoneos.a` → symlinks to device
- `Libraries/libjuce_backend_ios_iphonesimulator.a` → symlinks to simulator

### tvOS (Apple TV)
```bash
./build_tvos.sh            # Physical Apple TV
./build_tvos_simulator.sh  # tvOS Simulator
```

### macOS
```bash
./build_macos.sh  # Universal (arm64 + x86_64)
```

### Raspberry Pi (Linux)
```bash
# Requires cross-compilation setup
# TODO: Configure toolchain for arm-linux-gnueabihf
```

## How It Works

Xcode projects use `$(PLATFORM_NAME)` to automatically select the correct library:

- **iPhone/iPad device**: `PLATFORM_NAME=iphoneos` → `libjuce_backend_ios_iphoneos.a`
- **iOS Simulator**: `PLATFORM_NAME=iphonesimulator` → `libjuce_backend_ios_iphonesimulator.a`

When you build in Xcode, it automatically links the correct library based on your selected destination.

## Rebuilding After Code Changes

1. Run the platform-specific build script (e.g., `./build_ios.sh`)
2. Clean build folder in Xcode (Cmd+Shift+K)
3. Build and run (Cmd+B, then ▶️)

## Architecture Notes

### Why No Universal Binary?

Both iOS Device and iOS Simulator use **arm64** on Apple Silicon, so we can't create a traditional fat binary with `lipo`. Instead, we use separate library files with platform-specific symlinks.

### Platform Matrix

| Platform | Architecture | Library |
|----------|--------------|---------|
| iOS Device | arm64-ios | libjuce_backend_ios_iphoneos.a |
| iOS Simulator | arm64-sim | libjuce_backend_ios_iphonesimulator.a |
| tvOS Device | arm64-tvos | libjuce_backend_tvos_device.a |
| tvOS Simulator | arm64-sim | libjuce_backend_tvos_simulator.a |
| macOS | arm64 + x86_64 | libjuce_backend_macos.a (universal) |
| Raspberry Pi | arm-linux | libjuce_backend_pi.a |

## Troubleshooting

### "Building for 'iOS', but linking in object file built for 'iOS-simulator'"

This means you need to rebuild the library for your target platform:

```bash
# If building for device
./build_ios_device.sh

# If building for simulator
./build_ios_simulator.sh
```

### Library Architecture Mismatch

Check what architecture the library was built for:

```bash
lipo -info Libraries/libjuce_backend_ios_*.a
```

Expected output:
- Device: `Non-fat file: ... is architecture: arm64`
- Simulator: `Non-fat file: ... is architecture: arm64`

Both say arm64, but they're built for different platforms (SDK targets).
