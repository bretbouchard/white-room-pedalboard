# FilterGate v2 - Spectral Gate with Filter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![C++20](https://img.shields.io/badge/C++-20-blue.svg)](https://en.cppreference.com/w/cpp/20)
[![JUCE](https://img.shields.io/badge/JUCE-8.0.4+-brightgreen.svg)](https://juce.com/)

**Effect:** Spectral-Aware Gate with Filter
**Status:** ✅ Production Ready (v2.0.0)
**Repository:** https://github.com/bretbouchard/FilterGate.git

---

## 🎸 Plugin Architecture Compliance (v2.0.1)

**This plugin now follows the White Room Plugin Architecture Contract**:

✅ **Separate Repository**: `https://github.com/bretbouchard/FilterGate.git`
✅ **Standard Folder Structure**: `plugins/` with all 7 formats
✅ **Multi-Format Build**: VST3, AU, CLAP, LV2, AUv3, Standalone
✅ **Compliant**: Per `.claude/PLUGIN_ARCHITECTURE_CONTRACT.md`

### Quick Build (All Formats)

```bash
./build_plugin.sh
```

### Architecture

```
FilterGate/
├── plugins/              ← NEW: Standard structure per contract
│   ├── dsp/              ← Pure DSP (include/, src/)
│   ├── vst/              ← VST3 build output
│   ├── au/               ← AU build output
│   ├── clap/             ← CLAP build output
│   ├── lv2/              ← LV2 build output
│   ├── auv3/             ← iOS AUv3 build output
│   └── standalone/       ← Standalone app
├── CMakeLists.txt        ← NEW: Multi-format build config
├── build_plugin.sh       ← NEW: One-command build script
└── README.md             ← This file
```

See full contract at: `/Users/bretbouchard/apps/schill/white_room/.claude/PLUGIN_ARCHITECTURE_CONTRACT.md`

---

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Spectral Features](#spectral-features)
4. [Quick Start](#quick-start)
5. [Building](#building)
6. [Presets](#presets)
7. [Parameters](#parameters)
8. [Usage Examples](#usage-examples)
9. [Integration](#integration)
10. [Performance](#performance)
11. [Technical Details](#technical-details)
12. [Contributing](#contributing)
13. [License](#license)

---

## Overview

**FilterGate v2** is a frequency-aware, musically intelligent gate that combines a multimode filter with advanced spectral processing. The gate can respond differently across frequencies - enabling low frequencies to hold the gate open while highs close, or vice versa.

### What Makes It Special?

- **Spectral Frequency Weighting** - Gate responds differently per frequency band
- **5 Spectral Curves** - Flat, LowTilt, HighTilt, ExponentialLow, ExponentialHigh
- **4 Energy Modes** - Independent, WeightedSum, LowBiasedSum, HighBiasedSum
- **Gate Floor** - Partial openness for musical results (no brittle on/off)
- **Adjacent Band Linking** - Smooth transitions between frequency bands

### Use Cases

- **Verse Thinning** - Low frequencies stay open, highs close tightly
- **Chorus Lift** - High frequencies open easily, lows remain controlled
- **Groove Preservation** - Bass drives gate, highs add texture without chatter
- **Rhythmic Effects** - Pump it, staccato rhythm, telephone gate
- **Ambient Textures** - Dark ambience, bright tail, soft tail

---

## Features

### Filter Section

- **4 Filter Modes**: LowPass, HighPass, BandPass, Notch
- **Frequency**: 20 Hz - 20 kHz (logarithmic)
- **Resonance**: 0.0 - 2.0 (Q factor)
- **Smooth parameter transitions** - 10 ms smoothing

### Gate System

- **Threshold**: -60 dB to 0 dB
- **Ratio**: 1:1 to 20:1
- **Attack**: 0.1 ms to 100 ms
- **Release**: 10 ms to 1000 ms
- **Hold**: 0 ms to 500 ms
- **Hysteresis**: 0 dB to 12 dB

### Spectral Processing (NEW)

- **Spectral Curve**: Flat, LowTilt, HighTilt, ExponentialLow, ExponentialHigh
- **Spectral Exponent**: 0.5 to 5.0 (controls exponential curve steepness)
- **Energy Mode**: Independent, WeightedSum, LowBiasedSum, HighBiasedSum
- **Gate Floor**: 0.0 to 0.5 (partial openness for musical results)
- **Band Linking**: 0.0 to 1.0 (smooth transitions between bands)

---

## Spectral Features

### Spectral Curve Types

| Curve | Description | Musical Use |
|-------|-------------|-------------|
| **Flat** | No frequency bias | Traditional gate behavior |
| **LowTilt** | Lows weighted more (1-x) | Verse thinning, dark warmth |
| **HighTilt** | Highs weighted more (x) | Chorus brightness, air |
| **ExponentialLow** | Exponential low bias | Strong bass lock |
| **ExponentialHigh** | Exponential high bias | Aggressive highs |

### Energy Accumulation Modes

| Mode | Description | Effect |
|------|-------------|--------|
| **Independent** | Per-band gating | Original behavior |
| **WeightedSum** | All bands contribute equally | Balanced response |
| **LowBiasedSum** | Lows dominate decision | Bass-driven gating |
| **HighBiasedSum** | Highs dominate decision | Treble-driven gating |

### Gate Floor

Prevents brittle, hard-on/off gating behavior.

```
gateGain = lerp(gateFloor, 1.0, gateEnvelope)
```

| Value | Effect |
|-------|--------|
| 0.0 | Full gating (original) |
| 0.1 | Subtle transparency (recommended) |
| 0.3 | Significant leakage (filter-like) |
| 0.5 | Maximum floor (barely closes) |

---

## Quick Start

### Build Plugin

```bash
cd juce_backend/effects/filtergate
./build_plugin.sh
```

Output:
- `build_plugin/FilterGate_artefacts/VST3/FilterGate.vst3`
- `build_plugin/FilterGate_artefacts/AU/FilterGate.component`

### Install Plugin

```bash
# VST3
cp -R build_plugin/FilterGate_artefacts/VST3/*.vst3 \
   ~/Library/Audio/Plug-Ins/VST3/

# AU (macOS)
cp -R build_plugin/FilterGate_artefacts/AU/*.component \
   ~/Library/Audio/Plug-Ins/Components/
```

### Validate Plugin

```bash
pluginval --validate-in-place \
  build_plugin/FilterGate_artefacts/VST3/FilterGate.vst3
```

---

## Building

### Requirements

- **CMake**: 3.22+
- **C++ Compiler**: C++20 (Clang, GCC, MSVC)
- **JUCE**: 8.0.4+ (in `juce_backend/external/JUCE`)
- **macOS**: 10.15+ (Catalina)
- **Windows**: Windows 10+

### Build Options

#### 1. Standalone Plugin (Recommended)

```bash
./build_plugin.sh
```

#### 2. Clean Build

```bash
./build_plugin.sh clean
```

#### 3. Library Build (for integration)

```bash
mkdir build && cd build
cmake ..
make
```

### Build Outputs

```
build_plugin/FilterGate_artefacts/
├── VST3/
│   └── FilterGate.vst3/       # VST3 plugin
└── AU/
    └── FilterGate.component/  # AU plugin (macOS)
```

---

## Presets

FilterGate v2 includes **16 factory presets** organized by category:

### Basic

| Preset | Description |
|--------|-------------|
| Classic Gate | Traditional noise gate with filter |

### Mixing

| Preset | Description |
|--------|-------------|
| Verse Thinning | Cleans low-end mud while preserving vocal presence |
| Chorus Lift | Allows high-frequency ambience while gating low-end |
| Groove Preservation | Keeps bass and kick punchy |

### Effect

| Preset | Description |
|--------|-------------|
| Pump It | Rhythmic pumping effect that follows the groove |
| Frequency Sweep | Gate that opens differently across the frequency spectrum |
| Sparkle Gate | Lets high frequencies sparkle while gating mud |
| Mid Scoop Gate | Notch filter with mid-scooped spectral response |
| Bright Tail | High-pass gate lets bright harmonics through |
| Spectral Pan | Frequency-dependent gating creates stereo movement |

### Bass

| Preset | Description |
|--------|-------------|
| Bass Heavy Gate | Low frequencies control the gate |

### Vocal

| Preset | Description |
|--------|-------------|
| Air Gate | Transparent high-pass gate for vocals |

### Rhythmic

| Preset | Description |
|--------|-------------|
| Staccato Rhythm | Fast attack/release creates percussive rhythm |

### Lo-Fi

| Preset | Description |
|--------|-------------|
| Telephone Gate | Band-limited lo-fi telephone effect |

### Ambient

| Preset | Description |
|--------|-------------|
| Soft Tail | Long release with gate floor for natural decay |
| Dark Ambience | Low-pass gate for dark atmospheric textures |

### Preset File Format

```json
{
    "name": "Preset Name",
    "description": "Human-readable description",
    "author": "White Room",
    "category": "Category",
    "parameters": {
        "filterMode": "LowPass",
        "frequency": 1000.0,
        "gateEnabled": true,
        "threshold": -24.0,
        "spectralCurve": "Flat",
        "gateFloor": 0.1
    },
    "notes": "Usage notes or tips"
}
```

---

## Parameters

### Filter Parameters

| Parameter | Range | Default | Unit | Description |
|-----------|-------|---------|------|-------------|
| filterMode | enum | LowPass | - | Filter type |
| frequency | 20-20000 | 1000 | Hz | Filter cutoff frequency |
| resonance | 0.0-2.0 | 0.7 | - | Filter resonance/Q |

### Gate Parameters

| Parameter | Range | Default | Unit | Description |
|-----------|-------|---------|------|-------------|
| gateEnabled | 0-1 | 1 | - | Gate on/off |
| threshold | -60 to 0 | -24 | dB | Gate threshold |
| ratio | 1-20 | 4 | :1 | Compression ratio |
| attack | 0.1-100 | 5 | ms | Attack time |
| release | 10-1000 | 100 | ms | Release time |
| hold | 0-500 | 10 | ms | Hold time |
| hysteresis | 0-12 | 2 | dB | Hysteresis |

### Spectral Parameters

| Parameter | Range | Default | Unit | Description |
|-----------|-------|---------|------|-------------|
| spectralCurve | enum | Flat | - | Frequency weighting curve |
| spectralExponent | 0.5-5.0 | 2.0 | - | Exponential curve power |
| energyMode | enum | Independent | - | Energy accumulation mode |
| gateFloor | 0.0-0.5 | 0.0 | - | Minimum gate openness |
| bandLinking | 0.0-1.0 | 0.0 | - | Adjacent band smoothing |

---

## Usage Examples

### Verse Thinning

```cpp
// Dark, tight gating (bass-driven)
filterGate->setFilterMode(FilterMode::HighPass);
filterGate->setFrequency(120.0f);
filterGate->setSpectralCurve(SpectralCurve::LowTilt);
filterGate->setEnergyMode(EnergyMode::LowBiasedSum);
filterGate->setGateFloor(0.1f);
filterGate->setThreshold(-30.0f);
```

### Chorus Lift

```cpp
// Bright, open (treble-driven)
filterGate->setFilterMode(FilterMode::LowPass);
filterGate->setFrequency(8000.0f);
filterGate->setSpectralCurve(SpectralCurve::LowTilt);
filterGate->setEnergyMode(EnergyMode::HighBiasedSum);
filterGate->setGateFloor(0.15f);
filterGate->setThreshold(-32.0f);
```

### Exponential Bass Lock

```cpp
// Strong bass lock, highs gated aggressively
filterGate->setSpectralCurve(SpectralCurve::ExponentialLow);
filterGate->setSpectralExponent(3.0f);
filterGate->setEnergyMode(EnergyMode::LowBiasedSum);
filterGate->setGateFloor(0.05f);
```

---

## Integration

### C++ API

```cpp
#include "dsp/FilterGatePureDSP_v2.h"

// Create instance
auto filterGate = std::make_unique<DSP::FilterGateDSP>();
filterGate->prepare(48000.0, 512);

// Set parameters
filterGate->setFilterMode(DSP::FilterMode::LowPass);
filterGate->setFrequency(1000.0f);
filterGate->setGateEnabled(true);
filterGate->setSpectralCurve(DSP::SpectralCurve::HighTilt);

// Process stereo
filterGate->processStereo(left, right, numSamples);
```

### JUCE Plugin

```cpp
#include "plugin/FilterGateProcessor.h"

// Plugin wraps DSP automatically
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new FilterGateProcessor();
}
```

---

## Performance

### CPU Usage

- **Typical**: 0.5-1% of one core (48kHz, stereo)
- **Maximum**: 2% (all features active)
- **Realtime-safe**: No allocations in audio thread

### Memory

- **Code size**: ~100KB compiled
- **Per-instance**: ~2KB
- **Preset storage**: ~1KB per preset

### Latency

- **Algorithmic latency**: 0 samples
- **Typical total**: < 1ms (including smoothing)

---

## Technical Details

### Architecture

- **Pure DSP**: No JUCE dependencies in core
- **Policy-based design**: ChannelStrip vs FX modes
- **Control-rate processing**: Efficient parameter updates
- **RT-safe**: Deterministic, no allocations

### Filter Mathematics

Biquad filter using Audio EQ Cookbook formulas:

```
ω = 2π × frequency / sampleRate
α = sin(ω) / (2 × resonance)
```

### Spectral Weighting

```cpp
float weight = SpectralWeight::calculate(
    freqNorm,           // 0-1 normalized frequency
    spectralCurve,      // Curve type
    spectralExponent    // Power for exponential
);
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/FilterGate.git
cd FilterGate

# Run tests
cd build
ctest --verbose

# Validate plugin
pluginval --validate-in-place build_plugin/FilterGate_artefacts/VST3/FilterGate.vst3
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For issues or questions:

- **GitHub Issues**: https://github.com/bretbouchard/FilterGate/issues
- **Documentation**: See `BUILD_README.md` for build details
- **Presets**: See `presets/` directory for factory presets

---

## Acknowledgments

- **JUCE** - Audio plugin framework
- **White Room Audio** - Development support
- **pluginval** - Plugin validation tool

---

**FilterGate v2.0.0** - Spectral Gate with Filter
Copyright © 2026 White Room Audio
