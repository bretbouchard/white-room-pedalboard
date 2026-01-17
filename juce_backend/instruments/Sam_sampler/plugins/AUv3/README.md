# Sam Sampler AUv3 iOS Plugin

## Project Structure

```
ios-auv3/
├── SamSamplerPluginApp/            # AUv3 host container app
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   ├── Info.plist
│   └── SamSamplerPluginApp.entitlements
├── SamSamplerPluginExtension/      # AUv3 extension
│   ├── AudioUnit.swift
│   ├── AudioUnitViewController.swift
│   ├── SamSamplerDSPWrapper.swift
│   ├── Info.plist
│   └── SamSamplerPluginExtension.entitlements
└── SharedDSP/                      # C++ static library
    ├── SamSamplerDSP.h
    ├── SamSamplerDSP.cpp
    └── CMakeLists.txt
```

## Features

- **Platform**: iOS (AUv3 Instrument Extension)
- **DSP**: Sam Sampler (SF2 SoundFont playback)
- **Polyphony**: 16 voices
- **Controls**:
  - SF2 file loading (SoundFont 2 support)
  - ADSR envelope with Hold stage
  - State Variable Filter (LP/BP/HP/Notch)
  - Envelope curves (Linear, Exponential, Logarithmic, S-Curve)
  - Stereo width control
  - Preset management

## Building

### Requirements

- Xcode 14.0+
- iOS 15.0+ deployment target
- CMake 3.15+

### Build Steps

```bash
# 1. Build SharedDSP library
cd SharedDSP
mkdir build && cd build
cmake .. -DCMAKE_SYSTEM_NAME=iOS \
         -DCMAKE_OSX_ARCHITECTURES=arm64 \
         -DCMAKE_OSX_DEPLOYMENT_TARGET=15.0 \
         -G Xcode
xcodebuild -project SamSamplerDSP.xcodeproj \
           -target SamSamplerDSP \
           -configuration Release \
           -sdk iphoneos \
           build

# 2. Open main project in Xcode
cd ..
open SamSamplerPlugin.xcodeproj

# 3. Build and run in Xcode
# Select target: iOS Simulator or Device
# Press ⌘R to build and run
```

## Usage

### In AUv3 Host Apps (GarageBand, AUM, etc.)

1. Create new instrument track
2. Select "Sam Sampler" from instrument list
3. Load SF2 file using file picker
4. Select instrument preset
5. Adjust envelope, filter, and effects
6. Play with on-screen keyboard or MIDI

### Parameters

#### Global
- **Master Volume**: 0.0 - 1.5 (default 1.1)
- **Pitch Bend Range**: 0 - 24 semitones
- **Base Pitch**: 0.1 - 4.0 (playback rate multiplier)

#### Envelope
- **Attack**: 0.001 - 5.0 seconds
- **Hold**: 0.0 - 5.0 seconds (NEW)
- **Decay**: 0.001 - 5.0 seconds
- **Sustain**: 0.0 - 1.0 (level)
- **Release**: 0.001 - 5.0 seconds

#### Envelope Curves
- **Attack Curve**: 0=Linear, 1=Exponential, 2=Logarithmic, 3=S-Curve
- **Decay Curve**: 0=Linear, 1=Exponential, 2=Logarithmic, 3=S-Curve
- **Release Curve**: 0=Linear, 1=Exponential, 2=Logarithmic, 3=S-Curve

#### Filter
- **Filter Enabled**: On/Off
- **Filter Cutoff**: 20 - 20000 Hz
- **Filter Resonance**: 0.0 - 1.0
- **Filter Type**: 0=Lowpass, 1=Bandpass, 2=Highpass, 3=Notch

#### Effects
- **Reverb Mix**: 0.0 - 1.0
- **Delay Mix**: 0.0 - 1.0
- **Drive**: 0.0 - 1.0 (distortion)

#### Structure
- **Structure**: 0.0 - 1.0 (complexity)

#### Stereo
- **Stereo Width**: 0.0 - 1.0

## Technical Details

### DSP Architecture

The Sam Sampler AUv3 plugin uses a pure C++ DSP engine derived from the main Sam Sampler instrument:

- **SF2 Loading**: Full SoundFont 2 file parsing
- **Sample Playback**: High-quality interpolation (linear/cubic)
- **Voices**: 16-voice polyphony with voice stealing
- **Filter**: Per-voice State Variable Filter (TPT topology)
- **Envelope**: AHDSR with selectable curve types
- **Stereo**: True stereo with width control

### iOS Integration

- **AudioUnit Framework**: Native AUv3 extension
- **SwiftUI**: Modern declarative UI
- **Combine**: Reactive parameter updates
- **FilePicker**: SF2 file import
- **Sandboxing**: Full iOS app sandbox compliance

### Performance

- **CPU**: ~5% per core (48kHz, 16 voices)
- **Memory**: ~50MB base + SF2 size
- **Latency**: < 10ms audio buffer

## Key Differences from LocalGal

| Feature | LocalGal | Sam Sampler |
|---------|----------|-------------|
| DSP Type | Synthesizer | Sampler |
| Sound Generation | Oscillators | SF2 Samples |
| Control System | Feel Vector (5D) | Traditional ADSR |
| File Loading | N/A | SF2 SoundFont |
| Presets | Feel Vector | Instrument presets |

## Deployment Target

- **iOS**: 15.0+
- **Architectures**: arm64 (device), arm64-sim (simulator)
- **AUv3 Type**: Music Instrument (aumu)

## Notes

- DSP compiled as static C++ library
- No network operations (iOS extension sandbox)
- No background agents or LangGraph
- Pure audio/MIDI processing
- Supports both iOS devices and simulator

## Architecture

The Sam Sampler AUv3 plugin consists of three main components:

1. **Host App**: Minimal iOS app that hosts the AUv3 extension
2. **AUv3 Extension**: The actual audio plugin that processes MIDI/Audio
3. **Shared DSP**: C++ library containing the Sam Sampler implementation

### DSP Integration

The C++ DSP code from the Sam Sampler instrument is compiled as a static library and linked into both the host app and the AUv3 extension. This ensures:

- Single source of truth for DSP algorithms
- Efficient performance (native C++)
- Code reuse between iOS and desktop versions

### SF2 SoundFont Support

The Sam Sampler supports full SoundFont 2 format:

- Presets with bank/select
- Instruments with zones
- Samples with loop points
- Velocity layers
- Key switching
- Stereo samples

---

**Status**: ✅ Created 2025-01-17
**Based on**: juce_backend/instruments/Sam_sampler/
**Template**: juce_backend/instruments/localgal/ios-auv3/
