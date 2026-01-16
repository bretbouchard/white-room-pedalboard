# White Room JUCE Backend

Audio plugin development environment integrating JUCE backend (C++), Python tooling, and AI-driven development workflows.

## Plugin Formats

### Supported Formats

- **VST3** - Cross-platform plugin format (Windows, macOS, Linux)
- **AU** - macOS Audio Unit format (macOS only)
- **CLAP** - Modern, open-source plugin format with advanced features (all platforms)

### CLAP Plugin Support

CLAP (CLever Audio Plugin) is a modern plugin format offering:

- **Better event timing** - More precise MIDI and parameter automation
- **OSC support** - Open Sound Control for remote parameter control
- **Advanced MPE** - Enhanced MIDI Polyphonic Expression support
- **Plugin-side search** - Faster plugin browsing in hosts
- **Per-note parameters** - Fine-grained per-voice control
- **State extension** - More robust preset and state management

## Building CLAP Plugins

### Prerequisites

1. **CLAP SDK** - Included as git submodule in `external/clap-juce-extensions`
2. **JUCE 6+** - Already present in `external/JUCE`
3. **CMake 3.22+** - Build system
4. **clap-validator** (optional) - For plugin validation

### Initialize Submodules

```bash
# From repository root
cd juce_backend
git submodule update --init --recursive external/clap-juce-extensions
```

### Build All Plugins (CLAP + VST3)

```bash
# Configure with CLAP support enabled (default)
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release -DBUILD_CLAP=ON

# Build all plugins
cmake --build build --target all -j$(sysctl -n hw.ncpu)

# CLAP plugins will be in: build/*_plugin_build/*.clap
```

### Build Individual Plugins

```bash
# Build specific plugin with CLAP
cmake --build build --target LocalGal
cmake --build build --target NexSynth
cmake --build build --target SamSampler
cmake --build build --target KaneMarcoAether
cmake --build build --target GiantInstruments
```

### Disable CLAP Build

```bash
# Configure without CLAP support
cmake -B build -S . -DBUILD_CLAP=OFF

# Rebuild
cmake --build build --target all
```

## Installing CLAP Plugins

### macOS

```bash
# Install to user CLAP directory
mkdir -p ~/Library/Audio/Plug-Ins/CLAP
cp build/*_plugin_build/*.clap ~/Library/Audio/Plug-Ins/CLAP/

# Or install system-wide (requires sudo)
sudo cp build/*_plugin_build/*.clap /Library/Audio/Plug-Ins/CLAP/
```

### Windows

```cmd
REM Install to CLAP directory
copy build\*_plugin_build\*.clap C:\Program Files\Common Files\CLAP\

REM Or to user directory
mkdir %LOCALAPPDATA%\Programs\Common Files\CLAP
copy build\*_plugin_build\*.clap %LOCALAPPDATA%\Programs\Common Files\CLAP\
```

### Linux

```bash
# Install to user CLAP directory
mkdir -p ~/.clap
cp build/*_plugin_build/*.clap ~/.clap/

# Or install system-wide (requires sudo)
sudo cp build/*_plugin_build/*.clap /usr/lib/clap/
```

## Testing CLAP Plugins

### Manual Testing in REAPER

1. **Install CLAP plugins** (see above)
2. **Open REAPER**
3. **Preferences → Plug-ins → ReScan** (to detect new plugins)
4. **Add CLAP plugin to track**:
   - Right-click track → Insert virtual instrument on new track...
   - Filter by "CLAP" in plugin browser
   - Select plugin (e.g., "LOCAL GAL", "NexSynth FM", etc.)
5. **Validate functionality**:
   - Plugin loads without errors
   - Audio output works
   - Parameters respond to automation
   - MIDI input triggers notes
   - Presets save/load correctly

### Automated Validation

```bash
# Validate all CLAP plugins with clap-validator
./scripts/validate_clap.sh
```

**Install clap-validator:**
- macOS: `brew install clap-validator`
- Linux: `cargo install clap-validator`
- Source: https://github.com/free-audio/clap-validator

## Available CLAP Plugins

### Synthesizers

| Plugin | Description | CLAP ID |
|--------|-------------|---------|
| LOCAL GAL | Acid synthesizer with feel vector control and MPE support | `com.schillinger.LocalGal` |
| NexSynth FM | 5-operator FM synthesizer with MPE and microtonal support | `com.schillinger.NexSynth` |
| Sam Sampler | SF2-based sampler with MPE and microtonal support | `com.schillinger.SamSampler` |
| Kane Marco Aether | Physical modeling string synthesizer | `com.schillinger.KaneMarcoAether` |
| Giant Instruments | Multi-instrument synthesizer with MPE and microtonal support | `com.schillinger.GiantInstruments` |

### Effects

| Plugin | Description | CLAP ID |
|--------|-------------|---------|
| Monument Reverb | Exterior/open-air reverb system with ground surface simulation | `com.whiteroom.monument` |
| FilterGate | Spectral-aware gate with filter | `com.whiteroom.filtergate` |
| Far Far Away | Far-field distance rendering effect | `com.whiteroom.farfaraway` |

## CLAP-Specific Features

### Enabled Extensions

All White Room CLAP plugins include:

- **clap.host.audio-ports** - Audio port configuration
- **clap.host.note-ports** - MIDI note ports
- **clap.host.params** - Parameter automation
- **clap.host.state** - Preset and state management
- **clap.host.gui** - GUI support (if plugin has editor)

### CLAP Attributes

- **Plugin Category**: `synth` or `audio-effect`
- **Features**: MPE, microtonal, OSC (where applicable)
- **Support**: Thread-safe parameter automation

## Troubleshooting

### CLAP Plugins Not Scanning in Host

1. **Verify installation**:
   ```bash
   # macOS
   ls -la ~/Library/Audio/Plug-Ins/CLAP/

   # Windows
   dir "C:\Program Files\Common Files\CLAP\"

   # Linux
   ls -la ~/.clap/
   ```

2. **Check file permissions**:
   ```bash
   # macOS/Linux
   chmod +x ~/Library/Audio/Plug-Ins/CLAP/*.clap
   ```

3. **Rescan plugins** in host application

### Build Errors

```bash
# Clean build directory
rm -rf build
cmake -B build -S . -DBUILD_CLAP=ON

# Check CMake version (must be 3.22+)
cmake --version

# Verify submodules initialized
git submodule status
```

### Missing clap-juce-extensions

```bash
# Initialize submodule
git submodule update --init --recursive external/clap-juce-extensions

# Verify
ls external/clap-juce-extensions/CMakeLists.txt
```

## Performance Considerations

### CLAP vs VST3/AU

- **CPU Overhead**: CLAP has minimal overhead compared to VST3/AU
- **Automation Timing**: CLAP provides more precise parameter automation
- **Startup Time**: CLAP plugins load faster in some hosts
- **Memory**: Similar memory footprint to VST3

### Optimization Tips

1. **Release builds**: Always use `-DCMAKE_BUILD_TYPE=Release`
2. **Parallel builds**: Use `-j$(nproc)` for faster compilation
3. **Strip symbols**: CLAP plugins are smaller without debug symbols

## References

- **CLAP Specification**: https://github.com/free-audio/clap
- **clap-juce-extensions**: https://github.com/free-audio/clap-juce-extensions
- **clap-validator**: https://github.com/free-audio/clap-validator
- **CLAP in JUCE**: https://github.com/juce-framework/JUCE/blob/master/docs/CLAP%20Plugin%20Tutorial.md
- **JUCE Roadmap**: https://juce.com/blog/juce-roadmap-update-q3-2024/

## Contributing

When adding new plugins:

1. **Update CMakeLists.txt** to include CLAP format
2. **Add CLAP ID** following naming convention: `com.schillinger.PluginName` or `com.whiteroom.effectname`
3. **Test in multiple hosts** (REAPER, Bitwig, Ableton Live)
4. **Validate with clap-validator**: `./scripts/validate_clap.sh`
5. **Update this README** with plugin details

## License

See main project LICENSE file.
