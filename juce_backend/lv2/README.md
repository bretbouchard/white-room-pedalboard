# LV2 Plugin Support

LV2 (LADSPA Version 2) plugin wrapper infrastructure for JUCE DSP effects.

## Why LV2?

- **Headless-friendly**: No GUI required, perfect for embedded/Pi deployment
- **Modular graph compatible**: Works with patching systems like Carla
- **First-class on Pi**: Native Linux support, widely supported on Raspberry Pi
- **Industry standard**: Supported by Ardour, MOD Devices, Bitwig, Reaper

## Architecture

JUCE does not natively emit LV2, so we create a thin LV2 wrapper around our pure DSP cores.

### Components

```
/lv2
  ├─ include/
  │   └─ lv2/
  │       ├── lv2.h           # LV2 API headers
  │       ├── lv2_util.h      # LV2 utility functions
  │       └── lv2_extensions.h # LV2 extensions (urid, options, etc.)
  ├─ src/
  │   ├── lv2_entry.cpp      # LV2 descriptor and entry points
  │   └── lv2_parameters.cpp # Parameter mapping (LV2 ports ↔ DSP params)
  ├─ ttl/
  │   ├── manifest.ttl.template  # Plugin metadata template
  │   └── plugin.ttl.template    # Port definitions template
  └─ bundles/
      └─ [PluginName].lv2/     # Generated LV2 bundles
          ├── manifest.ttl
          ├── plugin.ttl
          ├── [PluginName].so   # Compiled binary
          └── [PluginName]_ui.ttl # Optional UI
```

## DSP Contract

All LV2-wrapped plugins must implement this interface:

```cpp
struct LV2DSPInstance {
    // Lifecycle
    virtual bool prepare(double sampleRate, int blockSize) = 0;
    virtual void reset() = 0;

    // Processing
    virtual void process(float** inputs, float** outputs,
                        int numChannels, int numSamples) = 0;

    // Parameters
    virtual void setParameter(uint32_t id, float value) = 0;
    virtual float getParameter(uint32_t id) const = 0;
    virtual const char* getParameterName(uint32_t id) const = 0;
    virtual const char* getParameterLabel(uint32_t id) const = 0;

    // Metadata
    virtual const char* getName() const = 0;
    virtual const char* getCreator() const = 0;
    virtual uint32_t getParameterCount() const = 0;
};
```

## Building LV2 Bundles

### Prerequisites

```bash
# Install LV2 dev tools
sudo apt-get install lv2-dev  # Ubuntu/Debian/Raspberry Pi OS
brew install lv2              # macOS
```

### Build Process

```bash
# From juce_backend directory
cd lv2
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(sysctl -n hw.ncpu)

# Install to system LV2 path
make install  # Installs to ~/.lv2/ or /usr/lib/lv2/
```

### Plugin Bundles

Each plugin becomes a `.lv2` bundle:

```
~/.lv2/
  FilterGate.lv2/
    ├── manifest.ttl        # Plugin metadata
    ├── FilterGate.ttl      # Port definitions
    ├── FilterGate.so       # Binary
    └── FilterGate_ui.ttl   # UI (optional)
```

## Testing LV2 Plugins

### Validation

```bash
# Validate TTL syntax
lv2_validate FilterGate.lv2/

# Check with lv2info
lv2info FilterGate.lv2/
```

### Host Testing

```bash
# Test with Jalv (simple LV2 host)
jalv.gtk FilterGate    # GUI version
jalv.lv2 FilterGate    # CLI version

# Test with Carla
carla-plugin-add lv2 FilterGate
```

## Parameter Mapping

LV2 uses port-based parameter control:

```
LV2 Port Index → DSP Parameter ID

Example:
Port 0: Audio Input L
Port 1: Audio Input R
Port 2: Audio Output L
Port 3: Audio Output R
Port 4: Frequency (Control) → DSP::setFrequency()
Port 5: Resonance (Control)  → DSP::setResonance()
Port 6: Mode (Control)       → DSP::setFilterMode()
```

## TTL Templates

### manifest.ttl

Defines plugin metadata:

```turtle
@prefix lv2:  <http://lv2plug.in/ns/lv2core#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

<{{PLUGIN_URI}}>
    a lv2:Plugin ;
    lv2:binary <{{BINARY_NAME}}.so> ;
    rdfs:seeAlso <{{PLUGIN_NAME}}.ttl> .
```

### plugin.ttl

Defines ports and parameters:

```turtle
@prefix lv2:  <http://lv2plug.in/ns/lv2core#> .
@prefix units: <http://lv2plug.in/ns/extensions/units#> .

<{{PLUGIN_URI}}>
    a lv2:Plugin ;

    # Audio Ports
    lv2:port [
        a lv2:AudioPort, lv2:InputPort ;
        lv2:index 0 ;
        lv2:symbol "in_l" ;
        lv2:name "Input L" ;
    ] ;

    # Control Ports
    lv2:port [
        a lv2:ControlPort, lv2:InputPort ;
        lv2:index 4 ;
        lv2:symbol "frequency" ;
        lv2:name "Frequency" ;
        lv2:default 1000.0 ;
        lv2:minimum 20.0 ;
        lv2:maximum 20000.0 ;
        units:unit units:hz ;
    ] .
```

## Integration Points

### OSC Control

LV2 plugins can receive OSC messages for remote control:

```cpp
// In LV2 wrapper
void osc_receive(const char* path, const char* types, ...) {
    if (strcmp(path, "/frequency") == 0) {
        float freq = va_arg(args, double);
        dsp_->setFrequency(freq);
    }
}
```

### Shared Memory

For high-performance parameter updates:

```cpp
// Map shared memory segment
void* shm = lv2_shm_map(shm_fd);
float* params = static_cast<float*>(shm);

// In audio thread
float freq = params[PARAM_FREQUENCY];
dsp_->setFrequency(freq);
```

### Agent Shell Integration

Pi-side agent_shell can drive LV2 plugins:

```python
# agent_shell.py
import lv2

plugin = lv2.Plugin("FilterGate")
plugin.connect("frequency", osc_port)
plugin.set_parameter("frequency", 1000.0)
```

## Deployment on Raspberry Pi

### Build for Pi

```bash
# Cross-compile from macOS
cmake .. -DCMAKE_TOOLCHAIN_FILE=../cmake/pi-toolchain.cmake

# Or build natively on Pi
ssh pi@raspberrypi
cd /path/to/white_room/juce_backend/lv2
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j4
```

### Install on Pi

```bash
# Copy to system LV2 path
sudo cp -R FilterGate.lv2 /usr/lib/lv2/

# Or user path
cp -R FilterGate.lv2 ~/.lv2/

# Rescan plugins in Carla/Ardour
```

## Performance Considerations

- **Lock-free**: LV2 requires real-time safe parameter updates
- **SMP**: Use LV2's Worker interface for offload work
- **DSP purity**: No JUCE dependencies in DSP core
- **Memory**: Static allocation only in audio thread

## References

- [LV2 Specification](https://lv2plug.in/)
- [LV2 Book](https://gitlab.com/lv2/lv2book)
- [JUCE LV2 Implementation](https://github.com/juce-framework/JUCE/tree/master/docs/)LV2 Plugin Wrapper for JUCE DSP Effects

## Quick Start

```bash
# Build FilterGate LV2 plugin
cd lv2/build
cmake .. -DBUILD_PLUGIN=FilterGate
make

# Test
jalv.gtk FilterGate
```

## License

Schillinger Ecosystem - Internal Use Only
