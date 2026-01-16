# Schillinger SDK for JUCE/C++

A comprehensive C++ SDK for integrating Schillinger System mathematical music composition capabilities into JUCE applications.

## Features

- **JUCE-Compatible Architecture**: Built following JUCE coding standards and memory management practices
- **JSON Serialization**: Uses JUCE's `var` and `DynamicObject` classes for data exchange
- **Authentication System**: Compatible with JUCE's networking classes and secure storage
- **Comprehensive Error Handling**: Uses JUCE `Result` types and logging system
- **Offline Capabilities**: Core mathematical functions work without network connectivity
- **Real-time Safe**: Designed for use in audio applications with real-time constraints

## Requirements

- JUCE Framework 7.0+
- C++17 or later
- CMake 3.15+

## Installation

### Using CMake

1. Clone or download the SDK:

```bash
git clone https://github.com/schillinger/sdk-juce-cpp.git
cd sdk-juce-cpp
```

2. Create build directory:

```bash
mkdir build
cd build
```

3. Configure and build:

```bash
cmake ..
make
```

### Integration with Existing JUCE Project

1. Add the SDK as a subdirectory in your CMakeLists.txt:

```cmake
add_subdirectory(path/to/SchillingerSDK)
target_link_libraries(YourTarget PRIVATE SchillingerSDK)
```

2. Include the SDK header:

```cpp
#include "SchillingerSDK.h"
```

## Quick Start

### Basic Setup

```cpp
#include "SchillingerSDK.h"
using namespace Schillinger;

// Initialize SDK
auto sdk = std::make_unique<SchillingerSDK>();

// Configure options
SDKOptions options;
options.apiBaseUrl = "https://api.schillinger.com";
options.enableOfflineMode = true;

auto result = sdk->configure(options);
if (!result.wasOk())
{
    DBG("Failed to configure SDK: " << result.getErrorMessage());
    return;
}

// Set up authentication (optional for offline use)
AuthCredentials credentials;
credentials.apiKey = "your-api-key";

sdk->authenticate(credentials, [](juce::Result authResult)
{
    if (authResult.wasOk())
        DBG("Authentication successful");
    else
        DBG("Authentication failed: " << authResult.getErrorMessage());
});
```

### Rhythm Generation

```cpp
// Get rhythm API
auto& rhythmAPI = sdk->getRhythmAPI();

// Generate a 3:2 resultant pattern synchronously
RhythmPattern pattern;
auto result = rhythmAPI.generateResultantSync(3, 2, pattern);

if (result.wasOk())
{
    DBG("Generated pattern with " << pattern.durations.size() << " elements");

    // Access pattern data
    for (int duration : pattern.durations)
        DBG("Duration: " << duration);
}
```

### Asynchronous Operations

```cpp
// Generate pattern asynchronously
rhythmAPI.generateResultant(4, 3, [](juce::Result result, RhythmPattern pattern)
{
    if (result.wasOk())
    {
        DBG("Async generation successful");
        // Use pattern...
    }
});
```

### Reverse Analysis

```cpp
// Create a pattern to analyze
RhythmPattern inputPattern;
inputPattern.durations = {2, 1, 3, 1, 2, 1};
inputPattern.timeSignature = {4, 4};

// Infer possible generators
rhythmAPI.inferGenerators(inputPattern, [](juce::Result result, GeneratorInference inference)
{
    if (result.wasOk() && !inference.possibleGenerators.isEmpty())
    {
        auto bestPair = inference.possibleGenerators[0];
        DBG("Best generator match: " << bestPair.first << ":" << bestPair.second);
    }
});
```

### Error Handling

```cpp
// Set global error handler
sdk->setErrorHandler([](const juce::String& code, const juce::String& message)
{
    juce::Logger::writeToLog("SDK Error [" + code + "]: " + message);
});

// Use JUCE Result types
auto result = rhythmAPI.generateResultantSync(3, 2, pattern);
if (result.failed())
{
    DBG("Operation failed: " << result.getErrorMessage());
}
```

### Offline Mode

```cpp
// Enable offline mode for network-independent operation
sdk->setOfflineMode(true);

// Mathematical functions still work offline
RhythmPattern pattern;
auto result = rhythmAPI.generateResultantSync(5, 3, pattern);
// This will work even without network connectivity
```

## API Reference

### Core Classes

#### `SchillingerSDK`

Main SDK class providing access to all functionality.

**Key Methods:**

- `configure(const SDKOptions& options)` - Configure SDK settings
- `authenticate(const AuthCredentials& credentials, callback)` - Authenticate with API
- `getRhythmAPI()` - Access rhythm generation and analysis
- `getHarmonyAPI()` - Access harmony generation and analysis
- `getCompositionAPI()` - Access composition tools
- `setOfflineMode(bool enabled)` - Enable/disable offline mode

#### `RhythmAPI`

Rhythm generation and analysis functionality.

**Key Methods:**

- `generateResultant(int a, int b, callback)` - Generate Schillinger resultant
- `generateVariation(const RhythmPattern& pattern, type, callback)` - Create variations
- `analyzePattern(const RhythmPattern& pattern, callback)` - Analyze rhythm complexity
- `inferGenerators(const RhythmPattern& pattern, callback)` - Reverse engineer generators
- `findBestFit(const RhythmPattern& target, options, callback)` - Find matching patterns

#### `HarmonyAPI`

Harmony generation and analysis functionality.

**Key Methods:**

- `generateProgression(key, scale, length, callback)` - Generate chord progressions
- `analyzeProgression(const StringArray& chords, callback)` - Analyze harmonic content
- `resolveChord(chord, context, callback)` - Find chord resolutions

#### `CompositionAPI`

Complete composition tools.

**Key Methods:**

- `create(const CompositionParams& params, callback)` - Create new composition
- `generateSection(type, params, callback)` - Generate composition sections
- `analyzeComposition(const Composition& comp, callback)` - Analyze structure

### Data Types

#### `RhythmPattern`

```cpp
struct RhythmPattern
{
    juce::Array<int> durations;           // Duration values
    std::pair<int, int> timeSignature;    // Time signature (4, 4)
    int tempo;                            // BPM
    double swing;                         // Swing factor (0.0-1.0)
    juce::var metadata;                   // Additional data

    juce::var toJson() const;             // Convert to JSON
    static RhythmPattern fromJson(const juce::var& json);
    juce::Result validate() const;        // Validate data
};
```

#### `ChordProgression`

```cpp
struct ChordProgression
{
    juce::StringArray chords;             // Chord symbols
    juce::String key;                     // Key signature
    juce::String scale;                   // Scale type
    juce::var metadata;                   // Additional data

    juce::var toJson() const;
    static ChordProgression fromJson(const juce::var& json);
    juce::Result validate() const;
};
```

## Examples

See the `examples/` directory for complete working examples:

- `basic_usage.cpp` - Basic SDK usage and rhythm generation
- `audio_plugin_example.cpp` - Integration with JUCE audio plugins
- `realtime_example.cpp` - Real-time safe pattern generation

## Building Examples

```bash
cd build
make SchillingerSDKExample
./SchillingerSDKExample
```

## Thread Safety

The SDK is designed to be thread-safe for most operations:

- **UI Thread**: All async callbacks are called on the message thread
- **Audio Thread**: Synchronous mathematical functions are real-time safe
- **Background Threads**: Network operations use background threads automatically

## Memory Management

The SDK follows JUCE memory management patterns:

- Uses `std::unique_ptr` for internal implementation (PIMPL idiom)
- JUCE reference-counted objects for shared data
- Automatic cleanup on destruction
- No manual memory management required

## Error Handling

The SDK uses JUCE's `Result` type for error handling:

```cpp
auto result = api.someOperation();
if (result.wasOk())
{
    // Success
}
else
{
    DBG("Error: " << result.getErrorMessage());
}
```

## Caching

The SDK includes built-in caching:

- **Memory Cache**: Fast access to recently used data
- **Persistent Cache**: Survives application restarts
- **Network Cache**: Reduces API calls
- **Offline Cache**: Enables offline functionality

```cpp
// Clear all caches
sdk->clearCache();

// Get cache statistics
auto stats = sdk->getCacheStats();
DBG("Cache entries: " << stats["entryCount"].toString());
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow JUCE coding standards
4. Add tests for new functionality
5. Submit a pull request

## License

This SDK is licensed under the MIT License. See LICENSE file for details.

## Support

- Documentation: https://docs.schillinger.com/sdk/juce
- Issues: https://github.com/schillinger/sdk-juce-cpp/issues
- Community: https://community.schillinger.com
