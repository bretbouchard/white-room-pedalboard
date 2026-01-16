# LV2 Plugin Testing & Deployment Guide

## Building the Plugin

### Prerequisites

**macOS:**
```bash
brew install lv2
brew install lv2-validate  # For TTL validation
```

**Linux/Raspberry Pi:**
```bash
sudo apt-get update
sudo apt-get install lv2-dev
sudo apt-get install lv2-plugins  # For jalv host
```

### Build Process

```bash
cd juce_backend/lv2

# Quick build
./build.sh

# Debug build
./build.sh --debug

# Build and validate TTL
./build.sh --validate

# Build and install to user path
./build.sh --install

# Build and install to system path (requires sudo)
./build.sh --install-system
```

### Manual Build

```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(sysctl -n hw.ncpu)
```

## Testing LV2 Plugins

### Validation Tests

```bash
# Validate TTL syntax and semantics
lv2-validate build/FilterGate.lv2/manifest.ttl
lv2-validate build/FilterGate.lv2/FilterGate.ttl

# Check plugin info
lv2info build/FilterGate.lv2/
```

### Host Testing

**1. Jalv (Simple LV2 Host)**

```bash
# GUI version
jalv.gtk http://schillinger-ecosystem/plugins/filtergate

# CLI version
jalv.lv2 http://schillinger-ecosystem/plugins/filtergate

# With Jack
jalv -j http://schillinger-ecosystem/plugins/filtergate
```

**2. Carla (Plugin Host)**

```bash
# Launch Carla
carla

# Or load plugin from command line
carla-single http://schillinger-ecosystem/plugins/filtergate
```

**3. Ardour**

```bash
# In Ardour: Window → Plugin Manager → Scan → FilterGate
# Then: Process → Add Plugin → FilterGate
```

**4. Reaper**

```bash
# In Reaper: Track → Insert FX → LV2 → FilterGate
```

### Automated Testing

Create test scripts in `lv2/tests/`:

```bash
# Run all tests
cd lv2/tests
./run_all_tests.sh

# Individual test
./test_basic_functionality.sh
```

## Deployment on Raspberry Pi

### Cross-Compilation from macOS

```bash
# Install ARM toolchain
brew install arm-linux-gnueabihf-gcc

# Configure for ARM
cd lv2/build
cmake .. \
    -DCMAKE_TOOLCHAIN_FILE=../cmake/pi-toolchain.cmake \
    -DCMAKE_BUILD_TYPE=Release

make -j4
```

### Native Build on Pi

```bash
# SSH into Pi
ssh pi@raspberrypi

# Clone/Update repo
cd /path/to/white_room/juce_backend/lv2

# Build
./build.sh --release --install
```

### Manual Installation on Pi

```bash
# Copy bundle to system
sudo cp -R build/FilterGate.lv2 /usr/lib/lv2/

# Or user path
cp -R build/FilterGate.lv2 ~/.lv2/

# Verify installation
ls -la /usr/lib/lv2/FilterGate.lv2/
```

### Performance Testing on Pi

```bash
# Test CPU usage with jalv
jalv.lv2 http://schillinger-ecosystem/plugins/filtergate

# Monitor with top
top -p $(pgrep jalv)

# Check DSP load
cat /proc/$(pgrep jalv)/status
```

## Integration with Agent Shell

### OSC Control

LV2 plugins can receive OSC messages for remote control:

```python
# agent_shell_osc.py
import liblo
import sys

# OSC server to receive commands
server = liblo.Server(1234)

def osc_callback(path, args):
    print(f"Received OSC: {path} {args}")

    # Map OSC to LV2 parameter
    if path == "/filtergate/frequency":
        freq = args[0]
        # Update LV2 parameter via OSC
        # (requires OSC extension support in plugin)
        pass

server.add_method(None, None, osc_callback)

print("OSC server listening on port 1234")
while True:
    server.recv(100)
```

### Shared Memory Control

For high-performance parameter updates:

```cpp
// Map shared memory segment
void* shm = lv2_shm_map("/lv2_filtergate_params");
float* params = static_cast<float*>(shm);

// In audio thread (real-time safe)
float freq = params[PARAM_FREQUENCY];
dsp_->setFrequency(freq);

// From agent shell (non-real-time)
params[PARAM_FREQUENCY] = 1000.0f;
```

### Python Agent Shell Integration

```python
# agent_shell_lv2.py
import lilv
import os

class LV2PluginController:
    def __init__(self, plugin_uri):
        # Load LV2 world
        self.world = lilv.World()
        self.world.load_all()

        # Find plugin
        self.plugin = self.world.get_plugin_by_uri(plugin_uri)
        if not self.plugin:
            raise Exception(f"Plugin not found: {plugin_uri}")

        # Create instance
        self.instance = self.plugin.instantiate(48000.0)

    def set_parameter(self, symbol, value):
        """Set parameter by symbol"""
        port = self.plugin.get_port_by_symbol(symbol)
        if port:
            self.instance.connect_port(port.get_index(), value)
        else:
            print(f"Port not found: {symbol}")

    def connect_audio(self, inputs, outputs):
        """Connect audio ports"""
        # Connect input ports
        for i, buf in enumerate(inputs):
            port = self.plugin.get_port_by_designation(
                lilv.const.LV2_INPUT_PORT, i)
            if port:
                self.instance.connect_port(port.get_index(), buf)

        # Connect output ports
        for i, buf in enumerate(outputs):
            port = self.plugin.get_port_by_designation(
                lilv.const.LV2_OUTPUT_PORT, i)
            if port:
                self.instance.connect_port(port.get_index(), buf)

    def process(self, num_samples):
        """Process audio block"""
        self.instance.run(num_samples)

# Usage
controller = LV2PluginController(
    "http://schillinger-ecosystem/plugins/filtergate")

controller.set_parameter("frequency", 1000.0)
controller.set_parameter("resonance", 2.0)

# Process audio
import numpy as np
input_l = np.zeros(1024, dtype=np.float32)
input_r = np.zeros(1024, dtype=np.float32)
output_l = np.zeros(1024, dtype=np.float32)
output_r = np.zeros(1024, dtype=np.float32)

controller.connect_audio(
    [input_l, input_r],
    [output_l, output_r]
)

controller.process(1024)
```

## Troubleshooting

### Plugin Not Found

**Symptoms:**
- DAW can't find plugin
- `lv2info` returns "Plugin not found"

**Solutions:**
```bash
# Check LV2_PATH
echo $LV2_PATH

# Add to LV2_PATH
export LV2_PATH=/usr/local/lib/lv2:~/.lv2

# Rescan in DAW
# Or restart DAW
```

### TTL Validation Errors

**Common Issues:**
```bash
# Invalid URI
lv2-validate: error: Expected URI

# Fix: Ensure URI is properly quoted
<http://schillinger-ecosystem/plugins/filtergate>

# Missing prefix
lv2-validate: error: Undefined prefix

# Fix: Add missing prefix in TTL
@prefix units: <http://lv2plug.in/ns/extensions/units#> .
```

### Build Errors

**Missing DSP headers:**
```bash
# Ensure paths are correct in CMakeLists.txt
set(DSP_INCLUDE "${CMAKE_CURRENT_SOURCE_DIR}/../effects/filtergate/include")
```

**Link errors:**
```bash
# Check library dependencies
nm -D FilterGate_LV2.so | grep FilterGate

# Verify symbols are exported
nm -D FilterGate_LV2.so | grep lv2_descriptor
```

### Runtime Crashes

**Enable debug logging:**
```bash
# Run with debugger
gdb --args jalv.lv2 http://schillinger-ecosystem/plugins/filtergate

# Check for memory errors
valgrind --leak-check=full jalv.lv2 http://schillinger-ecosystem/plugins/filtergate
```

## Performance Optimization

### Profile on Raspberry Pi

```bash
# CPU profiling
perf record -F 99 -p $(pgrep jalv) sleep 10
perf report

# Memory usage
valgrind --tool=massif jalv.lv2 http://schillinger-ecosystem/plugins/filtergate

# Real-time safety
chrt -f 80 jalv.lv2 http://schillinger-ecosystem/plugins/filtergate
```

### Optimization Flags

Edit `CMakeLists.txt` for Pi optimization:

```cmake
# Raspberry Pi 4 specific optimizations
if(CMAKE_SYSTEM_PROCESSOR MATCHES "arm")
    target_compile_options(FilterGate_LV2 PRIVATE
        -march=armv8-a
        -mtune=cortex-a72
        -mfpu=neon-fp-armv8
        -mfloat-abi=hard
        -O3
        -ffast-math
        -ftree-vectorize
    )
endif()
```

### Lock-Free Parameter Updates

```cpp
// Use atomic for parameter smoothing
std::atomic<float> frequency_target_;

void setParameter(uint32_t id, float value) {
    frequency_target_.store(value, std::memory_order_relaxed);
}

void process(float** inputs, float** outputs, int numSamples) {
    // Lock-free parameter read
    float freq = frequency_target_.load(std::memory_order_relaxed);

    // Smooth parameter changes
    for (int i = 0; i < numSamples; ++i) {
        current_freq += 0.001 * (freq - current_freq);
        // Process...
    }
}
```

## Continuous Integration

### GitHub Actions

```yaml
name: LV2 Plugin CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        include:
          - os: ubuntu-latest
            install-cmd: sudo apt-get install -y lv2-dev lv2-validate
          - os: macos-latest
            install-cmd: brew install lv2

    steps:
    - uses: actions/checkout@v2

    - name: Install Dependencies
      run: ${{ matrix.install-cmd }}

    - name: Build Plugin
      run: |
        cd juce_backend/lv2
        ./build.sh --validate

    - name: Run Tests
      run: |
        cd juce_backend/lv2/tests
        ./run_all_tests.sh

    - name: Upload Artifacts
      uses: actions/upload-artifact@v2
      with:
        name: lv2-plugin-${{ matrix.os }}
        path: juce_backend/lv2/build/*.lv2
```

## Next Steps

1. **Build More LV2 Plugins**
   - MonumentReverb.lv2
   - FarFarAway.lv2
   - Other effects from `/effects` directory

2. **Add LV2 Presets**
   - Create preset banks in TTL format
   - Implement preset save/load

3. **LV2 UI**
   - Create native UI using LV2 UI extension
   - Or use generic UI from host

4. **Performance Monitoring**
   - Add CPU meter
   - Parameter smoothing
   - SIMD optimizations

5. **Documentation**
   - User manual
   - API documentation
   - Tutorial videos
