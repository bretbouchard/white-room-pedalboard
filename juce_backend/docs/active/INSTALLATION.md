# Installation Guide

## System Requirements

### Operating Systems
- **macOS**: 10.15 (Catalina) or later
- **Windows**: Windows 10 or later
- **Linux**: Ubuntu 18.04, CentOS 7, or equivalent

### Hardware Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for application, additional space for plugins and samples
- **Audio Interface**: Recommended for low-latency audio processing

### Software Dependencies
- **CMake**: 3.16 or later
- **Compiler**:
  - macOS: Xcode 12 or later (Clang)
  - Windows: Visual Studio 2019 or later
  - Linux: GCC 7.5 or later, Clang 8 or later
- **JUCE Framework**: 7.0 or later (included as submodule)

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-org/schillinger-ecosystem-backend.git
cd schillinger-ecosystem-backend
```

### 2. Initialize Submodules

```bash
git submodule update --init --recursive
```

### 3. Install Dependencies

#### macOS
```bash
# Install Xcode command line tools (if not installed)
xcode-select --install

# Install CMake (if not installed)
brew install cmake
```

#### Windows
```bash
# Install CMake (download from cmake.org)
# Ensure Visual Studio is installed with C++ development tools
```

#### Linux (Ubuntu/Debian)
```bash
# Install development tools
sudo apt-get update
sudo apt-get install build-essential cmake

# Install audio development libraries
sudo apt-get install libasound2-dev libjack-jackd2-dev \
                       libpulse-dev portaudio19-dev
```

### 4. Configure Build

```bash
# Create build directory
mkdir build
cd build

# Configure with CMake
cmake .. -DCMAKE_BUILD_TYPE=Release
```

### 5. Build Application

```bash
# Build the application
cmake --build . --config Release

# Alternative: Use make (Linux/macOS)
make -j$(nproc)
```

### 6. Install (Optional)

```bash
# Install to system directories
sudo cmake --install . --prefix /usr/local
```

## Configuration

### Audio Device Configuration

The application automatically detects available audio devices. To specify a default device:

```bash
# List available devices
./SchillingerEcosystemBackend --list-devices

# Run with specific device
./SchillingerEcosystemBackend --audio-device "Built-in Output"
```

### Plugin Paths

Configure plugin scanning paths in `config/plugins.json`:

```json
{
  "vst3Paths": [
    "/Library/Audio/Plug-Ins/VST3",
    "~/.vst3"
  ],
  "auPaths": [
    "/Library/Audio/Plug-Ins/Components",
    "~/Library/Audio/Plug-Ins/Components"
  ]
}
```

### Algorithm Directory

Place algorithm YAML files in `algorithms/` directory:

```bash
mkdir -p algorithms
# Copy algorithm files to this directory
```

## Testing Installation

### Run Unit Tests

```bash
cd build
ctest --output-on-failure
```

### Run Integration Tests

```bash
# Run specific test suite
ctest --output-on-failure -R "integration"

# Run performance tests
ctest --output-on-failure -R "performance"
```

### Manual Testing

1. **Audio Test**: Verify audio output by playing test tones
2. **Plugin Test**: Load a VST3/AU plugin
3. **Algorithm Test**: Load a dynamic algorithm
4. **WebSocket Test**: Connect with WebSocket client

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clean build directory
rm -rf build
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
```

**Audio Device Issues**
```bash
# Check available devices
./SchillingerEcosystemBackend --list-devices

# Run with verbose logging
./SchillingerEcosystemBackend --debug --log-level=trace
```

**Plugin Loading Issues**
```bash
# Verify plugin paths
./SchillingerEcosystemBackend --validate-plugins

# Check plugin compatibility
./SchillingerEcosystemBackend --scan-plugins --verbose
```

**WebSocket Connection Issues**
```bash
# Check if port is available
lsof -i :8080

# Test with WebSocket client
websocat ws://localhost:8080/ws
```

### Debug Mode

Enable debug logging:

```bash
./SchillingerEcosystemBackend --debug --log-level=debug
```

Log levels: `trace`, `debug`, `info`, `warn`, `error`

### Performance Issues

**High CPU Usage**
- Increase buffer size in audio settings
- Disable unused plugins
- Check for audio dropouts in logs

**Memory Issues**
- Monitor memory usage with system tools
- Limit number of loaded plugins/algorithms
- Check for memory leaks in debug mode

## Platform-Specific Notes

### macOS
- Requires macOS 10.15 or later
- AU plugins supported on macOS only
- Notarization required for distribution

### Windows
- ASIO drivers supported for low-latency audio
- VST3 plugins supported
- Windows Defender may flag plugin scanning

### Linux
- JACK audio server recommended for professional audio
- LADSPA and LV2 plugin support available
- May require real-time kernel optimizations

## Uninstallation

### Remove Built Files

```bash
# Remove build directory
rm -rf build

# Remove installed files (if installed with sudo)
sudo rm -rf /usr/local/bin/SchillingerEcosystemBackend
sudo rm -rf /usr/local/share/schillinger-ecosystem
```

### Remove Configuration

```bash
# Remove configuration files
rm -rf ~/.config/schillinger-ecosystem
rm -rf ~/.local/share/schillinger-ecosystem
```

## Next Steps

After successful installation:

1. Read the [API Documentation](API.md) for integration details
2. Check the [README.md](README.md) for usage examples
3. Explore the [examples/](examples/) directory for code samples
4. Review the [docs/](docs/) directory for detailed guides

## Support

For installation issues:
- Check the troubleshooting section above
- Review debug logs for error messages
- Consult the issue tracker on GitHub
- Contact support with system specifications and error details