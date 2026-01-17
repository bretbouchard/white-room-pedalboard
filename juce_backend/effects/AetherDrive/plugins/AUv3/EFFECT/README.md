# Aether Drive AUv3 iOS Effect Plugin

## Project Overview

**Aether Drive** is a guitar effects pedal emulator AUv3 plugin for iOS, featuring bridge nonlinearity saturation and modal body resonator for warm, musical distortion.

**IMPORTANT**: This is an **EFFECT plugin** (aufx), NOT an instrument (aumu). It processes audio input to output.

---

## DSP Architecture Summary

### Effect Type: Guitar Distortion/Saturation

Aether Drive is a **guitar effects pedal emulator** with two main DSP stages:

1. **Bridge Nonlinearity**: Soft clipping distortion using tanh() saturation
   - Adjustable drive amount (0-4x gain)
   - Tone control (lowpass filter)
   - Tube-like character

2. **Modal Body Resonator**: Acoustic body emulation
   - 8 modal resonators (guitar body preset)
   - Cabinet simulation
   - Resonant decay control

### Signal Flow

```
Input → Drive Stage → Body Resonator → Cabinet Mix → Dry/Wet Mix → Output
          (tanh)         (8 modes)      (blend)      (crossfade)
```

### Parameters Implemented

| Parameter | ID | Range | Description |
|-----------|----|-------|-------------|
| Drive | `drive` | 0.0-1.0 | Distortion amount (0-4x gain) |
| Bass | `bass` | 0.0-1.0 | Low-frequency shelving EQ |
| Mid | `mid` | 0.0-1.0 | Mid-frequency presence |
| Treble | `treble` | 0.0-1.0 | High-frequency shelving EQ |
| Body Resonance | `body_resonance` | 0.0-1.0 | Resonator amount |
| Resonance Decay | `resonance_decay` | 0.0-1.0 | Decay time multiplier (0.5x-2.0x) |
| Mix | `mix` | 0.0-1.0 | Dry/wet mix (0=dry, 1=wet) |
| Output Level | `output_level` | 0.0-1.0 | Master output level |
| Cabinet Sim | `cabinet_simulation` | 0.0-1.0 | Cabinet resonance blend |

### Factory Presets (8 total)

1. **Clean Boost** - Light drive, low mix for clean boost
2. **Crunch** - Medium drive, classic crunch tone
3. **Overdrive** - High drive, warm tube character
4. **Distortion** - Heavy distortion, aggressive tone
5. **Fuzz** - Maximum drive, fuzzy character
6. **Warm Tube** - High resonance, tube warmth
7. **Acoustic Body** - Low drive, high resonance for acoustic sim
8. **Bass Warmth** - Bass-focused with cabinet sim

---

## Project Structure

```
ios-auv3/
├── AetherDrivePluginApp/          # AUv3 host container app
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   ├── Info.plist
│   └── AetherDrivePluginApp.entitlements
│
├── AetherDrivePluginExtension/     # AUv3 EFFECT extension (aufx)
│   ├── AudioUnit.swift             # Main AUv3 audio unit (EFFECT type)
│   ├── AudioUnitViewController.swift # SwiftUI UI
│   ├── ParameterBridge.swift       # Swift ↔ C++ bridge
│   ├── Info.plist                  # AUv3 EFFECT configuration (aufx!)
│   └── AetherDrivePluginExtension.entitlements
│
├── SharedDSP/                      # C++ static library
│   ├── AetherDriveDSP.h            # iOS DSP wrapper interface
│   ├── AetherDriveDSP.cpp          # iOS DSP wrapper implementation
│   └── CMakeLists.txt              # Build configuration
│
└── build.sh                        # Build script
```

---

## Key Differences from Instrument Plugins

### EFFECT (aufx) vs Instrument (aumu)

| Aspect | EFFECT (aufx) | Instrument (aumu) |
|--------|---------------|-------------------|
| **Input** | Processes audio input | No audio input (generates sound) |
| **MIDI** | Ignores MIDI events | Responds to note on/off |
| **Output** | Transforms input signal | Generates audio from scratch |
| **UI** | Effect parameters (EQ, drive) | Keyboard, controls |
| **Use Case** | Guitar FX, mixing | Synthesizers, samplers |

### Aether Drive Specifics

- **Type**: Audio Effect (`aufx`)
- **SubType**: `athr` (AetherDrive unique code)
- **Manufacturer**: `WHRM` (WhiteRoom)
- **Channels**: Mono-in/Mono-out or Stereo-in/Stereo-out
- **MIDI**: No MIDI handling (pure audio effect)
- **Tail**: 2 seconds (for body resonator decay)

---

## Building

### Prerequisites

- Xcode 14.0+
- iOS 15.0+ deployment target
- CMake 3.15+
- iOS Device or Simulator

### Create Xcode Project

⚠️ **Manual Xcode project creation required** (one-time setup):

1. **Open Xcode** → Create New Project

2. **Create App Target** (AetherDrivePluginApp):
   - Template: iOS → App
   - Product Name: AetherDrivePluginApp
   - Interface: SwiftUI
   - Language: Swift
   - Bundle ID: `com.whiteroom.aetherdrive.app`

3. **Add AUv3 Extension Target**:
   - File → New → Target
   - Template: Audio Unit Extension
   - Product Name: AetherDrivePluginExtension
   - Bundle ID: `com.whiteroom.aetherdrive.extension`
   - **IMPORTANT**: Configure as **EFFECT** type (not instrument)

4. **Add Static Library Target** (SharedDSP):
   - File → New → Target
   - Template: Static Library
   - Product Name: SharedDSP
   - Language: C++

5. **Configure Build Settings**:
   - iOS Deployment Target: 15.0
   - Architectures: arm64 (device), arm64-sim (simulator)
   - Enable Modules: Yes
   - C++ Language Dialect: C++17

6. **Link Targets**:
   - Extension links with SharedDSP
   - App links with SharedDSP
   - Add `$(PROJECT_DIR)/../..` to header search paths

### Build from Command Line

```bash
# Build for iOS Device
./build.sh

# Build for iOS Simulator
./build.sh --simulator

# Debug build
./build.sh --debug

# Clean build
./build.sh --clean
```

### Build in Xcode

```bash
# Open project
open ios-auv3/AetherDrivePlugin.xcodeproj

# Select scheme: AetherDrivePlugin
# Select destination: Any iOS Device
# Product → Build (⌘B)
```

---

## Deployment

### Installation on Device

1. **Archive**:
   - Xcode → Product → Archive
   - Wait for build to complete

2. **Distribute**:
   - Window → Organizer
   - Select archive
   - Distribute App → Ad Hoc / Development

3. **Install**:
   - Connect iOS device
   - Drag IPA to iTunes/App Store Connect
   - Or use Xcode Devices window

### Testing in Host Apps

After installation, Aether Drive will appear in:

- **GarageBand**: Plug-ins → Audio Units → Aether Drive
- **AUM**: Effect → Aether Drive
- **Audiobus**: Effects → Aether Drive
- **Cubasis**, **Logic Remote**, etc.

---

## Technical Details

### DSP Integration

The C++ DSP code from `juce_backend/effects/AetherDrive/` is compiled as a static library and linked into the AUv3 extension:

```
AetherDrivePureDSP (C++)
        ↓
AetherDriveDSP (iOS wrapper)
        ↓
AetherDriveDSPWrapper (Swift bridge)
        ↓
AudioUnit (AUv3 extension)
```

### Parameter Flow

```
UI Slider (Swift)
    ↓
ParameterBridge
    ↓
AetherDriveDSP (C++ wrapper)
    ↓
AetherDrivePureDSP.setParameter()
    ↓
DSP Engine processes audio
```

### Audio Processing

```
Host App (GarageBand/AUM)
    ↓
AudioUnit.internalRenderBlock
    ↓
AetherDriveDSP.process()
    ↓
AetherDrivePureDSP.process()
    ↓
Audio Output
```

---

## Features

- **Platform**: iOS 15.0+ (AUv3 Effect Extension)
- **DSP**: AetherDrivePureDSP (C++ audio engine)
- **Parameters**: 9 effect parameters
- **Presets**: 8 factory presets
- **UI**: SwiftUI interface optimized for touch
- **Architecture**: Offline-first, no network operations
- **Type**: Audio Effect (`aufx`), processes input to output

---

## Notes

- ✅ DSP compiled as static C++ library
- ✅ No network operations (iOS extension sandbox)
- ✅ No MIDI handling (pure audio effect)
- ✅ Single source of truth for DSP algorithms
- ✅ Efficient performance (native C++)
- ✅ Code reuse between iOS and desktop versions

---

## Troubleshooting

### Build Errors

**"AetherDrivePureDSP.h not found"**:
- Add header search path: `$(PROJECT_DIR)/../..`

**"Undefined symbols for architecture arm64"**:
- Ensure SharedDSP is linked to extension target
- Check C++ standard library linking

### Runtime Errors

**"Audio Unit not found in host app"**:
- Verify componentType is `aufx` (not `aumu`)
- Check Bundle ID matches Info.plist
- Reinstall app on device

**"Crash on parameter change"**:
- Check parameter address mapping
- Verify Swift ↔ C++ bridge

---

## Status

✅ **Complete** - Ready for Xcode project creation and compilation

**Created**: 2026-01-17
**Type**: AUv3 Audio Effect (aufx)
**SubType**: athr (AetherDrive)
**Manufacturer**: WHRM (WhiteRoom)
