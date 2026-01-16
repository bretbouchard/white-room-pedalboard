# BiPhase Releases

This folder contains ready-to-use BiPhase files.

## Contents

### 📁 dsp/
Pure DSP (Digital Signal Processing) code for Mu-Tron Bi-Phase.
- `BiPhasePureDSP.h` - Header file with complete DSP interface
- `BiPhasePureDSP.cpp` - Implementation

Use these if you want to integrate BiPhase directly into your C++ project.

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
cp -R vst3/BiPhase.vst3 ~/Library/Audio/Plug-Ins/VST3/
```

### macOS AU
```bash
cp -R au/BiPhase.component ~/Library/Audio/Plug-Ins/Components/
```

## Version

BiPhase v2.0.0 - Mu-Tron Bi-Phase Dual Phaser with:
- Dual 6-stage phasor architecture
- Three routing modes: Series (12-stage), Parallel, Independent
- Two LFO generators with independent rate control
- Sweep synchronization (Normal/Reverse)
- Regenerative feedback for each phasor
- 8 factory presets

## Features

### Phaser A & B
- Independent 6-stage all-pass filter cascades
- LFO rate: 0.1 - 18 Hz
- Depth: 0% - 100%
- Feedback: 0.0 - 0.98
- LFO shape: Sine/Square

### Routing Modes
- **Series (OutA)**: 12-stage cascade for deep phasing
- **Parallel (InA)**: Stereo output with independent phasors
- **Independent (InB)**: Dual input processing

### Sweep Sync
- **Normal**: Both phasors sweep in same direction
- **Reverse**: 180° phase offset for stereo width
