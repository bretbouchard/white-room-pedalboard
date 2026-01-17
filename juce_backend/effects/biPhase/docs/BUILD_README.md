# BiPhase Build System

## Overview

The BiPhase effect has three build configurations:

1. **Library Build** (`CMakeLists.txt`) - Builds DSP library for integration
2. **Plugin Build** (`CMakeLists_plugin.txt`) - Builds standalone VST3/AU plugin
3. **Build Script** (`build_plugin.sh`) - Automated plugin building

## Quick Start

### Build as Library (for integration into main DAW)

```bash
cd juce_backend/effects/biphase
mkdir build && cd build
cmake ..
make
```

This builds `libbiphase_DSP.a` static library.

### Build as Standalone Plugin (for DAW testing)

```bash
cd juce_backend/effects/biphase
./build_plugin.sh
```

This builds:
- `build_plugin/BiPhase_artefacts/VST3/BiPhase.vst3`
- `build_plugin/BiPhase_artefacts/AU/BiPhase.component`

### Clean Build

```bash
./build_plugin.sh clean
```

## Build Options

### Main CMakeLists.txt Options

```bash
# Build with JUCE plugin processor (for DAW integration)
cmake -DBUILD_PLUGIN_PROCESSOR=ON ..

# Build without tests
cmake -DBUILD_TESTS=OFF ..

# Build standalone plugin (via include)
cmake -DBUILD_PLUGIN=ON ..
```

### Plugin Build Options

The standalone plugin (`CMakeLists_plugin.txt`) builds:

- **VST3** - Cross-platform plugin format
- **AU** - macOS Audio Unit format
- **Company**: White Room
- **Manufacturer Code**: WHRM
- **Plugin Code**: Biph
- **Category**: Fx|Modulation

## Installation

### Manual Installation

```bash
# Install VST3
cp -R build_plugin/BiPhase_artefacts/VST3/*.vst3 ~/Library/Audio/Plug-Ins/VST3/

# Install AU
cp -R build_plugin/BiPhase_artefacts/AU/*.component ~/Library/Audio/Plug-Ins/Components/
```

### Automatic Installation

Edit `build_plugin.sh` and uncomment the installation section at the end.

## Validation

### Using pluginval

```bash
# Validate VST3
pluginval --validate-in-place build_plugin/BiPhase_artefacts/VST3/BiPhase.vst3

# Validate AU (macOS only)
pluginval --validate-in-place build_plugin/BiPhase_artefacts/AU/BiPhase.component
```

## Testing

### Unit Tests

```bash
cd build
./BiPhaseDSPTests
```

Or with CTest:

```bash
cd build
ctest
```

## Project Structure

```
biphase/
├── CMakeLists.txt              # Main library build
├── CMakeLists_plugin.txt       # Standalone plugin build
├── build_plugin.sh             # Automated build script
├── include/
│   └── dsp/
│       └── BiPhasePureDSP.h    # Pure DSP interface
├── src/
│   ├── dsp/
│   │   └── BiPhasePureDSP.cpp  # Pure DSP implementation
│   └── plugin/
│       └── BiPhaseProcessor.cpp # JUCE plugin wrapper
└── tests/
    └── BiPhaseDSPTests.cpp     # Unit tests
```

## Dependencies

### Required

- CMake 3.22+
- C++20 compiler (Clang, GCC, MSVC)
- JUCE (in `juce_backend/external/JUCE`)

### Optional

- Google Test (for unit tests)
- pluginval (for plugin validation)

## Build Outputs

### Library Build

```
build/lib/
├── libbiphase_DSP.a           # Static DSP library
└── biphase_processor.a        # JUCE processor (if built)
```

### Plugin Build

```
build_plugin/BiPhase_artefacts/
├── VST3/
│   └── BiPhase.vst3/          # VST3 plugin bundle
└── AU/
    └── BiPhase.component/     # AU plugin bundle
```

## Architecture Support

### macOS

- **Apple Silicon (arm64)** - Native support
- **Intel (x86_64)** - Native support
- **Universal Binary** - Can be built with `-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"`

### Minimum OS Version

- **macOS**: 10.15 (Catalina)
- **Windows**: Windows 10

## Troubleshooting

### JUCE Not Found

```
JUCE not found at ../../../external/JUCE
```

**Solution**: Ensure JUCE submodule is initialized:
```bash
cd juce_backend
git submodule update --init --recursive external/JUCE
```

### GTest Not Found

```
GTest not found, tests built but not linked to test framework
```

**Solution**: Install Google Test:
```bash
brew install googletest  # macOS
```

Or build tests without GTest (standalone binary).

### Plugin Not Appearing in DAW

1. **Check installation path** - Ensure plugin is in correct location
2. **Restart DAW** - Plugins are scanned at startup
3. **Check compatibility** - Verify plugin format matches DAW
4. **Validate with pluginval** - Ensure plugin passes validation

## Performance Notes

- **DSP Library**: Pure C++20, no JUCE dependencies
- **Standalone Plugin**: JUCE-based for DAW compatibility
- **Optimization**: `-O3` enabled by default in Release builds
- **SIMD**: Manual SIMD optimization in DSP code

## License

White Room Audio - Internal Use Only

## Support

For build issues, contact:
- **Email**: info@whiteroom.audio
- **GitHub**: https://github.com/whiteroom-audio/white_room
