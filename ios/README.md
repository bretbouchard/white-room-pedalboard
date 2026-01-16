# White Room AUv3 iOS Plugin

## Project Structure

```
ios/
├── LocalGalPlugin.xcodeproj/    # Xcode project
├── LocalGalPluginApp/            # AUv3 host container app
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   └── Info.plist
├── LocalGalPluginExtension/      # AUv3 extension
│   ├── AudioUnit.swift
│   ├── AudioUnitViewController.swift
│   ├── ParameterBridge.swift
│   └── Info.plist
└── SharedDSP/                    # C++ static library
    ├── LocalGalDSP.h
    ├── LocalGalDSP.cpp
    └── CMakeLists.txt
```

## Features

- **Platform**: iOS (AUv3 Instrument Extension)
- **DSP**: LocalGal synthesizer (16-voice polyphony)
- **Controls**: Feel Vector system (5D control)
- **Presets**: JSON-based preset management
- **UI**: SwiftUI interface optimized for touch

## Building

```bash
# Open in Xcode
open ios/LocalGalPlugin.xcodeproj

# Or build from command line
xcodebuild -project LocalGalPlugin.xcodeproj \
           -scheme LocalGalPlugin \
           -configuration Release \
           -sdk iphoneos \
           -derivedDataPath build
```

## Deployment Target

- **iOS**: 15.0+
- **Architectures**: arm64 (device), arm64-sim (simulator)

## Notes

- DSP compiled as static C++ library
- No network operations (iOS extension sandbox)
- No background agents or LangGraph
- Pure audio/MIDI processing
