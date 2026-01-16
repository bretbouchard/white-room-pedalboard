# LocalGal AUv3 iOS Plugin - Quick Reference

## Project at a Glance

**Platform**: iOS 15.0+ (AUv3 Instrument Extension)
**DSP**: LocalGal 16-voice polyphonic synthesizer
**UI**: SwiftUI with touch-optimized controls
**Build**: Xcode 15.0+, Swift 5.9+, C++17

## Directory Structure

```
ios/
├── LocalGalPluginApp/           # Container app (minimal)
│   ├── AppDelegate.swift        # App lifecycle
│   ├── ViewController.swift     # Instructions view
│   ├── Info.plist              # App configuration
│   └── *.entitlements          # Sandbox settings
│
├── LocalGalPluginExtension/    # AUv3 extension (main)
│   ├── AudioUnit.swift         # DSP wrapper and AU implementation
│   ├── AudioUnitViewController.swift  # SwiftUI interface
│   ├── ParameterBridge.swift   # AU ↔ DSP parameter mapping
│   ├── AUFactory.swift         # Component factory
│   ├── Info.plist              # AUv3 configuration
│   └── *.entitlements          # Extension sandbox
│
└── SharedDSP/                   # C++ static library
    ├── DSPBridge.h/cpp         # C wrapper for Swift
    ├── LocalGalDSP.h/cpp       # Actual DSP implementation
    └── CMakeLists.txt          # Build configuration
```

## Key Components

### 1. AudioUnit.swift
- **Purpose**: Main AUv3 audio unit implementation
- **Responsibilities**:
  - DSP lifecycle (create, initialize, destroy)
  - Parameter tree management
  - Audio rendering (render block)
  - MIDI event handling
  - State save/restore

### 2. ParameterBridge.swift
- **Purpose**: Map AU parameters to DSP parameters
- **Key Methods**:
  - `getParameterValue(_:)` - Get parameter value
  - `setParameterValue(_:value:)` - Set parameter value
  - `setFeelVector(_:)` - Update 5D feel vector
  - `loadFactoryPreset(index:)` - Load preset

### 3. AudioUnitViewController.swift
- **Purpose**: SwiftUI UI for AUv3 extension
- **Views**:
  - Main controls (volume, oscillator, filter)
  - Feel Vector (5D control: rubber, bite, hollow, growl, wet)
  - Factory presets

### 4. DSPBridge.h/cpp
- **Purpose**: C interface between Swift and C++ DSP
- **Functions**:
  - `localgal_create()` - Create DSP instance
  - `localgal_process()` - Render audio
  - `localgal_note_on/off()` - MIDI handling
  - `localgal_set_parameter_value()` - Parameter control

## Parameter Map

| Address | ID | Name | Range | Unit |
|---------|----|----|-------|-----|
| 0 | master_volume | Master Volume | 0-1 | Linear Gain |
| 1 | osc_waveform | Waveform | 0-4 | Indexed |
| 2 | filter_cutoff | Filter Cutoff | 0-1 | Generic |
| 3 | filter_resonance | Filter Resonance | 0-1 | Generic |
| 4 | feel_rubber | Rubber | 0-1 | Generic |
| 5 | feel_bite | Bite | 0-1 | Generic |
| 6 | feel_hollow | Hollow | 0-1 | Generic |
| 7 | feel_growl | Growl | 0-1 | Generic |

## Feel Vector System

5D control system for intuitive sound shaping:

- **Rubber** (0.0-1.0): Glide & timing variation
- **Bite** (0.0-1.0): Filter resonance & brightness
- **Hollow** (0.0-1.0): Filter cutoff & warmth
- **Growl** (0.0-1.0): Drive & saturation
- **Wet** (0.0-1.0): Effects mix (reserved)

## Factory Presets

1. **Init** - Default initialized state
2. **Soft** - Smooth, gentle sound
3. **Bright** - Bright, cutting tone
4. **Warm** - Warm, rounded character
5. **Aggressive** - Hard, saturated sound

## Build Commands

```bash
# Build for device
./build.sh

# Build for simulator
./build.sh --simulator

# Debug build
./build.sh --debug

# Clean build
./build.sh --clean
```

## Xcode Build Settings

**SharedDSP (Static Library)**:
- C++ Language: C++17
- Optimization: -O3 (Release), -O0 (Debug)
- Architectures: arm64, arm64-sim

**Extension**:
- Swift: 5.9+
- iOS: 15.0+
- Frameworks: AVFoundation, CoreAudio, AudioToolbox

## Testing Checklist

- [ ] Build succeeds for device (arm64)
- [ ] Build succeeds for simulator (arm64-sim)
- [ ] Extension appears in host apps
- [ ] MIDI keyboard triggers notes
- [ ] Parameters respond in UI
- [ ] Factory presets load correctly
- [ ] State saves/restores
- [ ] No audio glitches
- [ ] CPU usage acceptable (< 50%)

## Common Issues

**Extension not appearing**:
- Check Info.plist AudioComponents array
- Verify entitlements sandbox settings
- Reinstall app

**Build errors**:
- Clean build folder (⌘⇧K)
- Check iOS deployment target
- Verify framework linking

**No sound**:
- Check DSP initialization
- Verify audio format (48kHz, stereo)
- Test with different host app

## Performance Targets

- **CPU**: < 50% on iPhone 12 or newer
- **Latency**: < 12ms (512 samples @ 48kHz)
- **Memory**: < 50MB for extension
- **App Size**: < 20MB total

## Deployment Steps

1. **Development**:
   - Build and test in Xcode
   - Test on physical device
   - Validate in multiple host apps

2. **Ad Hoc**:
   - Archive in Xcode
   - Distribute to test devices
   - Test with external testers

3. **App Store**:
   - Create App Store Connect record
   - Archive and upload
   - Submit for review

## Next Steps

- [ ] Generate Xcode project (manual or XcodeGen)
- [ ] Test build on device
- [ ] Integrate full DSP implementation
- [ ] Add remaining instruments
- [ ] Performance optimization
- [ ] App Store submission preparation

## Files Created

**Source Code**:
- `/ios/LocalGalPluginApp/*.swift`
- `/ios/LocalGalPluginExtension/*.swift`
- `/ios/SharedDSP/*.{h,cpp}`

**Configuration**:
- `*/Info.plist` (2 files)
- `*/*.entitlements` (2 files)
- `/ios/SharedDSP/CMakeLists.txt`

**Build**:
- `/ios/build.sh`
- `/ios/BUILD_GUIDE.md`
- `/ios/README.md`

## Status

✅ Project structure created
✅ C++ static library configured
✅ Swift AUv3 implementation
✅ SwiftUI interface designed
✅ Build settings configured
✅ Documentation complete

⚠️ **Next**: Generate Xcode project and test build

---

**For detailed build instructions**: See `BUILD_GUIDE.md`
**For project overview**: See `README.md`
