# FilterGate Releases

This folder contains ready-to-use FilterGate files.

## Contents

### 📁 dsp/
Pure DSP (Digital Signal Processing) code for FilterGate v2.
- `FilterGatePureDSP.h` - Header file with complete DSP interface
- `FilterGatePureDSP.cpp` - Implementation

Use these if you want to integrate FilterGate directly into your C++ project.

### 📁 vst3/
VST3 plugin for macOS/Windows (when built)

### 📁 au/
Audio Unit plugin for macOS (when built)

## Building Plugins

To build VST3/AU plugins, run from the parent directory:
```bash
./build_plugin.sh
```

Built plugins will be copied to this folder.

## Installation

### macOS VST3
```bash
cp -R vst3/FilterGate.vst3 ~/Library/Audio/Plug-Ins/VST3/
```

### macOS AU
```bash
cp -R au/FilterGate.component ~/Library/Audio/Plug-Ins/Components/
```

## Version

FilterGate v2.0.0 - Spectral Noise Gate with:
- Traditional gate with filter
- Spectral frequency processing
- 5 spectral curves (Flat, LowTilt, HighTilt, ExponentialLow, ExponentialHigh)
- 4 energy modes (Independent, WeightedSum, LowBiasedSum, HighBiasedSum)
- Gate floor for musical partial openness
