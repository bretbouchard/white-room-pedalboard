# LocalGal AUv3 iOS Plugin - Build Guide

## Project Overview

LocalGal is a 16-voice polyphonic synthesizer AUv3 extension for iOS, built with:
- **DSP**: C++ static library (SharedDSP)
- **Extension**: Swift AUv3 implementation
- **UI**: SwiftUI touch-optimized interface
- **Features**: Feel Vector control system, factory presets, MIDI support

## Prerequisites

- Xcode 15.0+
- iOS 15.0+ deployment target
- Apple Developer Account (for device deployment)
- Mac with Apple Silicon (arm64)

## Project Structure

```
ios/
├── LocalGalPluginApp/              # AUv3 host container app
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   ├── Info.plist
│   └── LocalGalPluginApp.entitlements
├── LocalGalPluginExtension/        # AUv3 extension
│   ├── AudioUnit.swift             # Main audio unit
│   ├── AudioUnitViewController.swift  # SwiftUI UI
│   ├── ParameterBridge.swift       # Parameter mapping
│   ├── AUFactory.swift             # AU factory
│   ├── Info.plist
│   └── LocalGalPluginExtension.entitlements
├── SharedDSP/                      # C++ static library
│   ├── DSPBridge.h                 # C interface for Swift
│   ├── DSPBridge.cpp               # C wrapper implementation
│   ├── LocalGalDSP.h               # DSP header (from juce_backend)
│   ├── LocalGalDSP.cpp             # DSP implementation
│   └── CMakeLists.txt              # Build configuration
├── build.sh                        # Build script
└── README.md                       # Project documentation
```

## Building

### Method 1: Using Xcode (Recommended)

1. **Open in Xcode**:
   ```bash
   cd /Users/bretbouchard/apps/schill/white_room/ios
   # First, create Xcode project (if not exists)
   # Then:
   open LocalGalPlugin.xcodeproj
   ```

2. **Select Target**:
   - Choose "LocalGalPlugin" scheme
   - Select destination (iOS device or simulator)

3. **Build**:
   - Press ⌘B or Product → Build
   - Fix any build errors

4. **Run**:
   - Connect iOS device (for device testing)
   - Press ⌘R or Product → Run

### Method 2: Command Line Build

```bash
# Build for device (arm64)
./build.sh

# Build for simulator
./build.sh --simulator

# Debug build
./build.sh --debug

# Clean build
./build.sh --clean
```

### Method 3: Manual xcodebuild

```bash
xcodebuild \
    -project LocalGalPlugin.xcodeproj \
    -scheme LocalGalPlugin \
    -configuration Release \
    -sdk iphoneos \
    -derivedDataPath build \
    build
```

## Xcode Project Setup

Since we don't have an `.xcodeproj` file yet, you'll need to create one:

### Option 1: Manual Xcode Setup

1. Create new Xcode project:
   - File → New → Project
   - iOS → App
   - Product Name: `LocalGalPluginApp`
   - Bundle Identifier: `com.whiteroom.localgal`

2. Add AUv3 Extension target:
   - File → New → Target
   - iOS → Audio Unit Extension
   - Product Name: `LocalGalPluginExtension`
   - Bundle Identifier: `com.whiteroom.localgal.Extension`

3. Add SharedDSP static library:
   - File → New → Target
   - iOS → Static Library
   - Product Name: `SharedDSP`
   - Add all `.h` and `.cpp` files from `SharedDSP/` directory

4. Configure build settings:
   - iOS Deployment Target: 15.0
   - Architectures: arm64 (device), arm64-sim (simulator)
   - Swift Language Version: Swift 5.9+

### Option 2: Generate with XcodeGen

Create `project.yml` in `ios/` directory:

```yaml
name: LocalGalPlugin
options:
  bundleIdPrefix: com.whiteroom
  deploymentTarget:
    iOS: "15.0"
  developmentLanguage: en

targets:
  LocalGalPluginApp:
    type: application
    platform: iOS
    deploymentTarget: "15.0"
    sources:
      - LocalGalPluginApp
    info:
      path: LocalGalPluginApp/Info.plist
      properties:
        CFBundleDisplayName: LocalGal
        CFBundleShortVersionString: "1.0"
    entitlements:
      path: LocalGalPluginApp/LocalGalPluginApp.entitlements

  LocalGalPluginExtension:
    type: appExtension
    platform: iOS
    deploymentTarget: "15.0"
    sources:
      - LocalGalPluginExtension
    info:
      path: LocalGalPluginExtension/Info.plist
      properties:
        NSExtension:
          NSExtensionPointIdentifier: com.apple.AudioUnit
          NSExtensionPrincipalClass: $(PRODUCT_MODULE_NAME).LocalGalAudioUnitFactory
    entitlements:
      path: LocalGalPluginExtension/LocalGalPluginExtension.entitlements
    dependencies:
      - target: SharedDSP

  SharedDSP:
    type: library.static
    platform: iOS
    sources:
      - SharedDSP
```

Then generate:
```bash
brew install xcodegen
xcodegen generate
```

## Build Settings

### SharedDSP (C++ Static Library)
- **C++ Language Dialect**: C++17
- **Enable C++ Modules**: No
- **Optimization Level**: -O3 (Release), -O0 (Debug)
- **Other C++ Flags**: `-fPIC -ffast-math`

### LocalGalPluginExtension (AUv3)
- **Swift Language Version**: Swift 5.9+
- **iOS Deployment Target**: 15.0
- **Other Linker Flags**: `-ObjC`
- **Frameworks**: AVFoundation, CoreAudio, AudioToolbox
- **Valid Architectures**: arm64, arm64-sim

### LocalGalPluginApp (Container)
- **Swift Language Version**: Swift 5.9+
- **iOS Deployment Target**: 15.0
- **App Sandbox**: Enabled
- **File Access**: User Selected Read-Only

## Testing

### In Host App
1. Install app on iOS device
2. Open any AUv3-compatible host (GarageBand, AUM, Cubasis, etc.)
3. Add new AU instrument track
4. Select "White Room: LocalGal"
5. Test MIDI keyboard and parameters

### In Xcode
1. Select "LocalGalPluginApp" scheme
2. Run on device or simulator
3. Container app will open with instructions

### Validation
- Test all parameters in UI
- Verify MIDI note on/off
- Check factory presets load
- Validate state save/restore
- Test on multiple iOS devices

## Deployment

### Ad Hoc Testing
1. Archive in Xcode
2. Distribute to registered devices
3. Install via TestFlight or direct IPA

### App Store Submission
1. Create App Store Connect record
2. Archive and upload
3. Complete app review information
4. Submit for review

## Troubleshooting

### Build Errors

**"Cannot find module 'AVFoundation'"**:
- Check iOS deployment target is 15.0+
- Clean build folder (⌘⇧K)

**"Undefined symbols for architecture arm64"**:
- Ensure SharedDSP is linked in extension
- Check architectures match (arm64 only)

**"AudioComponentFactory not found"**:
- Verify Info.plist NSExtensionPrincipalClass
- Check factory class name matches

### Runtime Issues

**AU not appearing in host apps**:
- Check extension sandbox entitlements
- Verify Info.plist AudioComponents array
- Reinstall app (uninstall first)

**No sound output**:
- Check DSP initialization
- Verify audio format (48kHz, stereo)
- Test with host app's built-in piano roll

**Crash on load**:
- Check Xcode crash logs
- Verify all files included in target
- Test on iOS device (not simulator)

### Performance

**High CPU usage**:
- Optimize DSP for mobile
- Reduce max polyphony
- Check for inefficient UI updates

**Audio glitches**:
- Increase buffer size
- Optimize render block
- Check for blocking operations

## Architecture Decisions

### Why AUv3 Extension?
- iOS standard for audio plugins
- Host app integration
- Preset management
- MIDI input support

### Why SwiftUI?
- Modern iOS UI framework
- Touch-optimized controls
- Fast development
- Native iOS look and feel

### Why C++ Static Library?
- Portable DSP code
- Performance
- Easy integration with Swift
- Reusable across platforms

## Future Enhancements

- [ ] Full DSP integration (currently stub implementation)
- [ ] Additional instruments (KaneMarco, NexSynth, etc.)
- [ ] MIDI learn functionality
- [ ] Custom preset management
- [ ] AUv3 parameter automation
- [ ] Inter-app audio support
- [ ] Background audio support
- [ ] iPhone-specific layouts
- [ ] iPad-optimized interface

## Resources

- [Apple AUv3 Documentation](https://developer.apple.com/documentation/audiounit)
- [AUv3 Tutorial](https://www.raywenderlich.com/769-playing-with-au-audio-unit-hosting-and-the-ios-audio-unit)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [LocalGal DSP Spec](../juce_backend/instruments/localgal/)

## Support

For issues and questions:
1. Check this build guide
2. Review Apple AUv3 documentation
3. Test on iOS device (not simulator)
4. File issue in project tracker

---

**Status**: Development - Proof of Concept
**Last Updated**: 2026-01-15
**Author**: Bret Bouchard
