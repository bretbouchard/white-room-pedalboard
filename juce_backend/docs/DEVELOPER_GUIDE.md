# Developer Guide

## Overview

The Schillinger Ecosystem Backend is a professional audio processing system built with JUCE framework. This guide covers architecture, development workflows, and contribution guidelines.

## Architecture

### Core Components

#### Audio Engine
- **Real-time Processing**: Low-latency audio I/O with dropout prevention
- **Plugin Hosting**: VST3 and AudioUnit plugin management
- **Dynamic Algorithms**: Hot-swappable internal algorithms with smart controls

#### WebSocket API
- **Real-time Communication**: Bridge for external UI frameworks
- **Message Protocol**: JSON-based API with request/response patterns
- **Security**: Authentication, rate limiting, and input validation

#### Security Framework
- **Plugin Validation**: Cryptographic signature verification
- **Sandboxing**: Optional plugin isolation with resource limits
- **Permission System**: Granular access controls

### Directory Structure

```
src/
├── audio/                  # Audio engine components
│   ├── AudioEngine.cpp
│   ├── AudioProcessor.cpp
│   └── AudioBufferManager.cpp
├── plugins/                 # Plugin hosting system
│   ├── PluginManager.cpp
│   ├── PluginScanner.cpp
│   └── PluginValidator.cpp
├── airwindows/             # Dynamic algorithm system
│   ├── DynamicAlgorithmRegistry.cpp
│   ├── AirwindowsAlgorithm.cpp
│   └── AlgorithmLoader.cpp
├── websocket/              # WebSocket API bridge
│   ├── WebSocketServer.cpp
│   ├── MessageHandler.cpp
│   └── ProtocolHandler.cpp
├── effects/                # Audio effects and DSP
│   ├── DynamicsProcessor.cpp
│   ├── FilterProcessor.cpp
│   └── ReverbProcessor.cpp
└── security/               # Security and validation
    ├── PluginValidator.cpp
    ├── SecurityManager.cpp
    └── SignatureVerifier.cpp

include/
├── audio/                  # Audio engine headers
├── plugins/                 # Plugin system headers
├── airwindows/             # Dynamic algorithm headers
└── security/               # Security system headers

tests/
├── audio/                  # Audio engine tests
├── plugins/                 # Plugin system tests
├── integration/            # Integration test suite
└── websocket/              # WebSocket API tests
```

## Development Setup

### Prerequisites

- C++17 compatible compiler
- CMake 3.16+
- JUCE framework (included as submodule)
- Google Test framework (for testing)

### Building for Development

```bash
# Clone repository
git clone <repository>
cd schillinger-ecosystem-backend

# Initialize submodules
git submodule update --init --recursive

# Configure for development
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTS=ON

# Build with tests
cmake --build . --config Debug
```

### Running Tests

```bash
# Run all tests
ctest --output-on-failure

# Run specific test categories
ctest --output-on-failure -R "audio_"
ctest --output-on-failure -R "plugins_"
ctest --output-on-failure -R "integration_"

# Run with coverage (Linux/macOS)
cmake .. -DCMAKE_BUILD_TYPE=Debug -DCOVERAGE=ON
ctest --output-on-failure
lcov --capture --directory . --output-file coverage.info
```

## Adding New Features

### Dynamic Algorithms

1. **Create Algorithm Specification**
   ```yaml
   # algorithms/NewEffect.yaml
   algorithm:
     name: "NewEffect"
     displayName: "New Effect"
     category: "Reverb"
     description: "Custom reverb effect"

   parameters:
     - name: "RoomSize"
       type: "float"
       minValue: 0.0
       maxValue: 1.0
       defaultValue: 0.5
   ```

2. **Generate Algorithm Code**
   ```bash
   # Use code generation tool
   ./tools/generate_algorithm.py algorithms/NewEffect.yaml
   ```

3. **Implement DSP Functions**
   ```cpp
   // src/airwindows/NewEffect.cpp
   float NewEffect::newEffectProcess(float input) {
       // Implement algorithm here
       return processedAudio;
   }
   ```

4. **Add Tests**
   ```cpp
   // tests/airwindows/NewEffectTest.cpp
   TEST(NewEffectTest, BasicProcessing) {
       NewEffect effect;
       effect.setParameter("RoomSize", 0.5f);
       float output = effect.processSample(0.5f);
       EXPECT_GT(output, 0.0f);
   }
   ```

### API Endpoints

1. **Define Message Schema**
   ```cpp
   // include/websocket/Messages.h
   enum MessageType {
       LOAD_ALGORITHM = 1050,
       GET_ALGORITHMS = 1051,
       SET_PARAMETER = 1052
   };
   ```

2. **Implement Handler**
   ```cpp
   // src/websocket/AlgorithmHandler.cpp
   void AlgorithmHandler::handleLoadAlgorithm(const json& payload) {
       std::string algorithmName = payload["algorithmName"];
       // Load algorithm implementation
   }
   ```

3. **Add Tests**
   ```cpp
   // tests/websocket/AlgorithmHandlerTest.cpp
   TEST(AlgorithmHandlerTest, LoadValidAlgorithm) {
       // Test algorithm loading
   }
   ```

## Code Guidelines

### Style Conventions

- **Naming**: PascalCase for classes, camelCase for variables/functions
- **Headers**: Use include guards, forward declarations when possible
- **Comments**: Javadoc-style for public interfaces
- **Formatting**: 4 spaces indentation, no tabs

### Example Code Style

```cpp
// File: include/audio/AudioProcessor.h
#pragma once

#include <JuceHeader.h>

/**
 * High-level audio processor with plugin hosting capabilities
 */
class AudioProcessor : public juce::AudioProcessor {
public:
    /**
     * Create audio processor with specified configuration
     * @param config Audio processing configuration
     */
    explicit AudioProcessor(const AudioConfig& config);

    /**
     * Process audio buffer with real-time safety
     * @param buffer Audio buffer to process
     * @param numSamples Number of samples to process
     */
    void processAudio(juce::AudioBuffer<float>& buffer, int numSamples) override;

private:
    std::unique_ptr<PluginManager> pluginManager;
    AudioConfig configuration;
};
```

### Performance Guidelines

#### Real-time Safety
- Avoid memory allocations in audio thread
- Use lock-free data structures for audio parameters
- Keep audio processing functions simple and fast
- Prefer pre-allocated buffers and pools

#### Memory Management
- Use RAII for resource management
- Prefer smart pointers over raw pointers
- Implement copy/move semantics carefully
- Avoid circular references

#### Optimization
- Profile critical code paths
- Use SIMD instructions for audio processing
- Cache frequently accessed data
- Minimize virtual function calls in hot loops

## Testing Strategy

### Unit Tests

- Test individual components in isolation
- Use mocks for external dependencies
- Cover edge cases and error conditions
- Aim for >90% code coverage

### Integration Tests

- Test component interactions
- Use real dependencies where practical
- Test complete workflows
- Include performance benchmarks

### Audio Testing

```cpp
// Example audio test
TEST(AudioEngineTest, ProcessSinewave) {
    AudioEngine engine;
    engine.initialize(44100.0, 512);

    // Generate test signal
    juce::AudioBuffer<float> buffer(2, 512);
    generateSinewave(buffer, 440.0f, 44100.0);

    // Process audio
    engine.processAudio(buffer);

    // Verify output
    EXPECT_FALSE(buffer.hasBeenCleared());
    EXPECT_EQ(buffer.getNumChannels(), 2);
    EXPECT_EQ(buffer.getNumSamples(), 512);
}
```

### Performance Testing

```cpp
// Example performance test
TEST(PerformanceTest, AlgorithmProcessing) {
    DynamicAlgorithmRegistry registry;
    registry.scanDirectory("algorithms/");

    auto algorithm = registry.createAlgorithm("Density");

    auto start = std::chrono::high_resolution_clock::now();

    // Process 1 million samples
    for (int i = 0; i < 1000000; ++i) {
        algorithm->processSample(0.5f);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    EXPECT_LT(duration.count(), 10000); // Should complete in <10ms
}
```

## Debugging

### Build Configurations

- **Debug**: Full debugging symbols, no optimizations
- **RelWithDebInfo**: Optimizations with debugging symbols
- **Release**: Full optimizations, minimal debugging info

### Common Issues

**Audio Dropouts**
- Check buffer size settings
- Profile CPU usage
- Verify real-time thread priority

**Plugin Crashes**
- Enable plugin sandboxing
- Check plugin compatibility
- Review plugin validation logs

**Memory Leaks**
- Use Valgrind (Linux) or Instruments (macOS)
- Check smart pointer usage
- Verify RAII compliance

### Debug Tools

```bash
# Debug with GDB
gdb ./build/SchillingerEcosystemBackend
(gdb) run --debug

# Profile with perf (Linux)
perf record ./build/SchillingerEcosystemBackend
perf report

# Memory check with Valgrind
valgrind --tool=memcheck ./build/SchillingerEcosystemBackend
```

## Contributing

### Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following style guidelines
   - Add comprehensive tests
   - Update documentation

3. **Test Changes**
   ```bash
   # Run full test suite
   ctest --output-on-failure

   # Run linting
   ./tools/lint.sh

   # Run static analysis
   ./tools/static-analysis.sh
   ```

4. **Submit Pull Request**
   - Describe changes clearly
   - Include test results
   - Reference related issues

### Code Review Process

- All code must be reviewed before merging
- Automated checks must pass
- Documentation should be updated
- Breaking changes require version bump

### Release Process

1. Update version in `CMakeLists.txt`
2. Update `CHANGELOG.md`
3. Create release tag
4. Build release binaries
5. Update documentation

## Documentation

### Code Documentation

- Public interfaces require Javadoc comments
- Complex algorithms need inline explanations
- API changes must be documented

### User Documentation

- Update README.md for user-facing changes
- Add examples to `docs/examples/`
- Update API.md for protocol changes

### Architecture Documentation

- Design decisions in `docs/architecture/`
- Performance analysis in `docs/performance/`
- Security considerations in `docs/security/`

## Resources

### JUCE Documentation
- [JUCE API Reference](https://docs.juce.com/)
- [JUCE Tutorials](https://juce.com/learn/tutorials)

### Audio Programming
- [The Audio Programming Book](https://www.apress.com/gp/book/9781439821378)
- [Designing Audio Effect Plugins](https://www.willkirk.io/audio-plugin-book/)

### Testing
- [Google Test Documentation](https://google.github.io/googletest/)
- [Test-Driven Development](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)

### Performance
- [Optimizing C++](https://www.agner.org/optimize/)
- [Computer Architecture](https://www.amazon.com/Computer-Architecture-Quantitative-Approach/dp/0128119055)