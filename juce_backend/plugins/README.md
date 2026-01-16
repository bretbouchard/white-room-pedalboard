# Schillinger Instrument Plugins

Unified build system for all three JUCE instrument plugins:

- **LOCAL_GAL** - Acid synthesizer with glide, accent, and pattern sequencing
- **SamSampler** - Sampler instrument
- **NexSynth** - FM synthesizer

## Building Plugins

### Quick Start

```bash
# From juce_backend directory
./build-instrument-plugins.sh
```

### Manual Build

```bash
cd plugins
mkdir build && cd build
cmake .. -DBUILD_AU=ON -DBUILD_VST3=ON
cmake --build . --config Release
```

## Plugin Formats

- **AU Components** (.component) - macOS Audio Units
- **VST3 Plugins** (.vst3) - Cross-platform VST3 format

## Output Location

After building, plugins are located in:

```
plugins/build/
├── LOCAL_GAL_artefacts/
│   ├── Release/
│   │   ├── AU/LOCAL_GAL.component
│   │   └── VST3/LOCAL_GAL.vst3
├── SamSampler_artefacts/
│   ├── Release/
│   │   ├── AU/SamSampler.component
│   │   └── VST3/SamSampler.vst3
└── NexSynth_artefacts/
    ├── Release/
    │   ├── AU/NexSynth.component
    │   └── VST3/NexSynth.vst3
```

## Installation

### System-wide Installation

```bash
# AU Components
cp -R build/LOCAL_GAL_artefacts/Release/AU/LOCAL_GAL.component ~/Library/Audio/Plug-Ins/Components/
cp -R build/SamSampler_artefacts/Release/AU/SamSampler.component ~/Library/Audio/Plug-Ins/Components/
cp -R build/NexSynth_artefacts/Release/AU/NexSynth.component ~/Library/Audio/Plug-Ins/Components/

# VST3 Plugins
cp -R build/LOCAL_GAL_artefacts/Release/VST3/LOCAL_GAL.vst3 ~/Library/Audio/Plug-Ins/VST3/
cp -R build/SamSampler_artefacts/Release/VST3/SamSampler.vst3 ~/Library/Audio/Plug-Ins/VST3/
cp -R build/NexSynth_artefacts/Release/VST3/NexSynth.vst3 ~/Library/Audio/Plug-Ins/VST3/
```

### User Installation

```bash
# AU Components (user-specific)
cp -R build/*.component ~/Library/Audio/Plug-Ins/Components/

# VST3 Plugins (user-specific)
cp -R build/*.vst3 ~/Library/Audio/Plug-Ins/VST3/
```

## Architecture

### LOCAL_GAL Plugin
- Complete AudioProcessor implementation
- SynthEngine with voice management
- Diode ladder filter
- ADSR envelope
- Pattern sequencer with glide and accent
- Real-time parameter control

### SamSampler Plugin
- Wrapper around SamSamplerIntegration
- Multi-sample mapping
- Zone management
- ADSR per sample
- Real-time modulation

### NexSynth Plugin
- Wrapper around NexSynthIntegration
- FM synthesis engine
- Multiple operators
- Flexible routing
- Modulation matrix

## Plugin Features

All three plugins support:
- ✅ MIDI note input
- ✅ Stereo output
- ✅ Real-time parameter automation
- ✅ Preset management (state save/load)
- ✅ 64-bit audio processing
- ✅ ARM64 and Intel (universal binary)

## DAW Compatibility

Tested and compatible with:
- Logic Pro (AU)
- GarageBand (AU)
- Ableton Live (VST3/AU)
- Reaper (VST3/AU)
- Bitwig Studio (VST3/AU)
- Cubase (VST3)

## Troubleshooting

### Plugin not recognized by DAW
1. Verify installation path is correct
2. Run `auval -v` to validate AU plugins
3. Rescan plugins in your DAW
4. Check plugin permissions: `xattr -dr com.apple.quarantine ~/Library/Audio/Plug-Ins/Components/*.component`

### Build errors
1. Ensure JUCE submodule is initialized: `git submodule update --init --recursive`
2. Check Xcode command line tools: `xcode-select --install`
3. Verify CMake version 3.16+

## Development

### Plugin Structure

Each plugin has:
- `*PluginProcessor.h/cpp` - Audio processing and parameter management
- `*PluginEditor.h/cpp` - UI (can use GenericEditor for simple UIs)
- Synthesis engine integration from `src/synthesis/`

### Adding Parameters

Edit the PluginProcessor to add parameters:

```cpp
// In constructor
addParameter(cutoff = new juce::AudioParameterFloat(
    "cutoff", "Cutoff", 20.0f, 20000.0f, 1000.0f));

// In processBlock
float cutoffValue = cutoff->get();
synthEngine.setCutoff(cutoffValue);
```

## License

Schillinger Ecosystem - Internal Use Only
