# Schillinger SDK - Real-time Audio Processing

This document describes the real-time audio processing capabilities of the Schillinger SDK for JUCE/C++ applications.

## Overview

The `RealtimeAudioAPI` provides real-time safe pattern generation algorithms, MIDI processing utilities, and audio analysis tools specifically designed for use in audio applications and plugins. All methods are designed to be real-time safe and can be called from the audio thread without causing dropouts.

## Key Features

### 1. Real-time Safe Pattern Generation

- **Schillinger Resultant Patterns**: Generate mathematical rhythm patterns using Schillinger's generator system
- **Pattern Variations**: Apply augmentation, diminution, retrograde, and rotation transformations
- **Pattern Transformations**: Inversion, fragmentation, and randomization operations
- **Memory-safe Operations**: All pattern generation uses fixed-size arrays and avoids dynamic allocation

### 2. MIDI Processing

- **Pattern-based MIDI Generation**: Convert rhythm patterns to MIDI note sequences
- **Real-time MIDI Processing**: Process incoming MIDI messages with pattern-based responses
- **Configurable Output**: Set MIDI channel, base note, and velocity parameters
- **Timing Accuracy**: Sample-accurate MIDI event placement

### 3. Audio Analysis

- **Tempo Detection**: Real-time tempo estimation from audio input
- **Beat Detection**: Onset detection and beat phase tracking
- **RMS Analysis**: Real-time RMS level monitoring
- **DSP Integration**: Uses JUCE DSP modules for efficient processing

### 4. Plugin Parameter Mapping

- **Normalized Parameters**: All parameters use 0.0-1.0 range for DAW compatibility
- **Parameter Types**: Support for all Schillinger pattern parameters
- **Real-time Updates**: Thread-safe parameter changes during audio processing
- **Metadata Support**: Parameter names, units, and ranges for UI display

## Core Classes

### RealtimeAudioAPI

Main interface for real-time audio processing capabilities.

```cpp
// Initialize and prepare for processing
auto& realtimeAPI = sdk.getRealtimeAudioAPI();
juce::dsp::ProcessSpec spec{44100.0, 512, 2};
realtimeAPI.prepare(spec);

// Process audio and MIDI in real-time
void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    auto audioBlock = juce::dsp::AudioBlock<float>(buffer);
    realtimeAPI.processAudioAndMidi(audioBlock, midi);
}
```

### RealtimePatternGenerator

Generates Schillinger patterns using real-time safe algorithms.

```cpp
auto& generator = realtimeAPI.getPatternGenerator();

RealtimePatternParams params;
params.generatorA = 3;
params.generatorB = 2;
params.tempo = 120.0;

RealtimeRhythmPattern pattern;
if (generator.generateRhythmPattern(params, pattern))
{
    // Pattern generated successfully
    // pattern.durations contains the rhythm values
    // pattern.patternLength contains the number of elements
}
```

### RealtimeMidiProcessor

Processes MIDI messages and generates pattern-based MIDI output.

```cpp
auto& midiProcessor = realtimeAPI.getMidiProcessor();

// Configure MIDI output
midiProcessor.setMidiChannel(1);
midiProcessor.setBaseNote(60); // Middle C
midiProcessor.setVelocity(100);

// Process MIDI with pattern
midiProcessor.processMidiBuffer(midiBuffer, pattern, sampleRate, numSamples);
```

### RealtimeAudioAnalyzer

Analyzes audio input for tempo, beats, and level information.

```cpp
auto& analyzer = realtimeAPI.getAnalyzer();

// Analyze audio block
analyzer.analyzeAudioBlock(audioBlock);

// Get analysis results
double tempo = analyzer.getCurrentTempo();
double beatPhase = analyzer.getCurrentBeatPhase();
bool beatDetected = analyzer.wasBeatDetected();
float rmsLevel = analyzer.getCurrentRMS();
```

### PluginParameterMapper

Maps normalized parameter values to Schillinger pattern parameters.

```cpp
auto& paramMapper = realtimeAPI.getParameterMapper();

// Set parameter from DAW (0.0-1.0 range)
paramMapper.setParameterValue(PluginParameterMapper::ParameterType::Tempo, 0.5f);

// Get current pattern parameters
const auto& params = paramMapper.getPatternParams();
double currentTempo = params.tempo; // Converted to actual BPM value
```

## Data Structures

### RealtimePatternParams

Configuration for pattern generation:

```cpp
struct RealtimePatternParams
{
    int generatorA = 3;              // First Schillinger generator (1-16)
    int generatorB = 2;              // Second Schillinger generator (1-16)
    double tempo = 120.0;            // Tempo in BPM (60-240)
    std::pair<int, int> timeSignature {4, 4}; // Time signature
    double swing = 0.0;              // Swing amount (0.0-1.0)
};
```

### RealtimeRhythmPattern

Generated rhythm pattern data:

```cpp
struct RealtimeRhythmPattern
{
    static constexpr int maxPatternLength = 64;
    std::array<float, maxPatternLength> durations; // Pattern durations
    int patternLength = 0;           // Number of valid elements
    double tempo = 120.0;            // Pattern tempo
    std::pair<int, int> timeSignature {4, 4}; // Time signature
    double swing = 0.0;              // Applied swing amount
};
```

## Usage Examples

### Basic Audio Plugin Integration

```cpp
class SchillingerAudioPlugin : public juce::AudioProcessor
{
public:
    void prepareToPlay(double sampleRate, int samplesPerBlock) override
    {
        juce::dsp::ProcessSpec spec;
        spec.sampleRate = sampleRate;
        spec.maximumBlockSize = samplesPerBlock;
        spec.numChannels = getTotalNumOutputChannels();

        sdk.getRealtimeAudioAPI().prepare(spec);
    }

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override
    {
        auto audioBlock = juce::dsp::AudioBlock<float>(buffer);
        sdk.getRealtimeAudioAPI().processAudioAndMidi(audioBlock, midiMessages);
    }

private:
    Schillinger::SchillingerSDK sdk;
};
```

### Pattern-based MIDI Generator

```cpp
void generatePatternMidi(juce::MidiBuffer& outputBuffer, int numSamples, double sampleRate)
{
    // Set pattern parameters
    RealtimePatternParams params;
    params.generatorA = 5;
    params.generatorB = 3;
    params.tempo = 140.0;

    // Generate pattern
    auto& generator = realtimeAPI.getPatternGenerator();
    RealtimeRhythmPattern pattern;

    if (generator.generateRhythmPattern(params, pattern))
    {
        // Convert pattern to MIDI
        auto& midiProcessor = realtimeAPI.getMidiProcessor();
        midiProcessor.generateMidiFromPattern(outputBuffer, pattern, 0, numSamples, sampleRate);
    }
}
```

### Tempo-following Pattern Generator

```cpp
void processWithTempoFollowing(juce::dsp::AudioBlock<float>& audioBlock, juce::MidiBuffer& midiBuffer)
{
    // Analyze incoming audio
    auto& analyzer = realtimeAPI.getAnalyzer();
    analyzer.analyzeAudioBlock(audioBlock);

    // Update pattern tempo based on analysis
    if (analyzer.wasBeatDetected())
    {
        RealtimePatternParams params = realtimeAPI.getPatternParams();
        params.tempo = analyzer.getCurrentTempo();
        realtimeAPI.setPatternParams(params);

        // Generate new pattern with detected tempo
        auto& generator = realtimeAPI.getPatternGenerator();
        RealtimeRhythmPattern pattern;
        generator.generateRhythmPattern(params, pattern);

        // Process MIDI with updated pattern
        auto& midiProcessor = realtimeAPI.getMidiProcessor();
        midiProcessor.processMidiBuffer(midiBuffer, pattern, 44100.0, audioBlock.getNumSamples());
    }
}
```

## Performance Considerations

### Real-time Safety

- All pattern generation uses fixed-size arrays (max 64 elements)
- No dynamic memory allocation in audio thread
- Lock-free atomic operations for parameter updates
- Efficient DSP processing using JUCE's optimized routines

### Memory Usage

- Pattern data structures use stack allocation
- Circular buffers for analysis data
- Minimal heap allocation during initialization only

### CPU Usage

- Optimized mathematical algorithms for pattern generation
- SIMD-optimized audio processing where available
- Configurable analysis complexity based on requirements

## Thread Safety

The RealtimeAudioAPI is designed for use in multi-threaded audio applications:

- **Audio Thread**: All processing methods are real-time safe
- **UI Thread**: Parameter updates use atomic operations
- **Background Thread**: Analysis results can be read safely

## Building and Dependencies

### Required JUCE Modules

- `juce_core` - Core JUCE functionality
- `juce_audio_basics` - Audio buffer and MIDI message handling
- `juce_dsp` - DSP processing and audio blocks

### CMake Configuration

```cmake
target_link_libraries(YourTarget
    PRIVATE
        SchillingerSDK
        juce::juce_core
        juce::juce_audio_basics
        juce::juce_dsp
)
```

### Compiler Requirements

- C++17 or later
- JUCE 6.0 or later
- Platform: Windows, macOS, Linux

## Examples

See the `examples/` directory for complete working examples:

- `realtime_audio_example.cpp` - Comprehensive demonstration of all features
- `basic_usage.cpp` - Simple SDK usage example

Build and run examples:

```bash
mkdir build && cd build
cmake ..
make
./SchillingerRealtimeExample
```

## API Reference

For complete API documentation, see the header files:

- `include/RealtimeAudioAPI.h` - Main real-time audio interface
- `include/SchillingerSDK.h` - Core SDK interface

## Support

For questions and support regarding the real-time audio processing features, please refer to the main SDK documentation or contact the development team.
