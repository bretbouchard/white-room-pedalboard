# JUCE Backend API Reference

Complete API reference for the JUCE C++ audio backend.

## Table of Contents

1. [Overview](#overview)
2. [Core Classes](#core-classes)
3. [Plugin API](#plugin-api)
4. [Schillinger Systems API](#schillinger-systems-api)
5. [FFI API](#ffi-api)
6. [Audio Processing API](#audio-processing-api)
7. [Error Handling](#error-handling)
8. [Utilities](#utilities)

---

## Overview

The JUCE Backend API provides:

- **Real-time audio processing** - Low-latency audio engine
- **Plugin host integration** - VST3/AU/CLAP support
- **Schillinger systems** - Algorithmic music theory
- **FFI bridge** - Swift/C++ interop
- **Parameter automation** - Smooth parameter transitions

**Language:** C++17/20
**Framework:** JUCE 7
**Thread Safety:** Real-time safe for audio APIs

---

## Core Classes

### SchillingerEngine

Main music theory engine implementing Schillinger's systems of composition.

```cpp
namespace schillinger {

class SchillingerEngine {
public:
    // Constructor
    SchillingerEngine();

    // Destructor
    ~SchillingerEngine();

    // Initialization
    bool initialize(double sampleRate, int samplesPerBlock);

    // Rhythm generation
    std::vector<RhythmEvent> generateRhythm(
        const RhythmGenerator& generator,
        int barCount
    );

    // Pitch generation
    std::vector<PitchEvent> generatePitch(
        const PitchGenerator& generator,
        const Scale& scale,
        int noteCount
    );

    // Harmony generation
    std::vector<HarmonyEvent> generateHarmony(
        const HarmonyGenerator& generator,
        const Progression& progression
    );

    // State management
    void reset();
    juce::var getState() const;
    void setState(const juce::var& state);

private:
    // Internal implementation
    class Impl;
    std::unique_ptr<Impl> impl;
};

} // namespace schillinger
```

**Usage Example:**

```cpp
// Create engine
auto engine = std::make_unique<SchillingerEngine>();

// Initialize
engine->initialize(48000.0, 256);

// Generate rhythm
RhythmGenerator generator;
generator.pattern = RhythmPattern::Attack;
generator.generatorCount = 3;

auto rhythms = engine->generateRhythm(generator, 4);

// Process rhythms
for (const auto& rhythm : rhythms) {
    // Use rhythm events
}
```

### PluginProcessor

Base class for all audio plugin processors.

```cpp
class PluginProcessor : public juce::AudioProcessor {
public:
    // Constructor
    PluginProcessor();

    // Destructor
    ~PluginProcessor() override;

    // JUCE AudioProcessor interface
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(
        juce::AudioBuffer<float>& buffer,
        juce::MidiBuffer& midiMessages
    ) override;

    // Plugin information
    const juce::String getName() const override;
    double getTailLengthSeconds() const override;
    bool acceptsMidi() const override;
    bool producesMidi() const override;

    // Parameters
    juce::AudioProcessorValueTreeState::ParameterLayout createParameters();
    void parameterChanged(const juce::String& parameterID, float newValue);

    // State
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

protected:
    // Plugin-specific processing (override in subclasses)
    virtual void processAudio(
        juce::AudioBuffer<float>& buffer,
        const juce::AudioProcessorValueTreeState& params
    ) = 0;

    // Helper methods
    void applyGain(
        juce::AudioBuffer<float>& buffer,
        float gain
    );

private:
    // Parameter tree
    juce::AudioProcessorValueTreeState parameters;

    // Level metering
    juce::LinearSmoothedValue<float> inputLevel;
    juce::LinearSmoothedValue<float> outputLevel;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginProcessor)
};
```

**Usage Example:**

```cpp
class MyPluginProcessor : public PluginProcessor {
public:
    MyPluginProcessor() : PluginProcessor() {
        // Initialize plugin-specific state
    }

protected:
    void processAudio(
        juce::AudioBuffer<float>& buffer,
        const juce::AudioProcessorValueTreeState& params
    ) override {
        // Get parameters
        auto* gainParam = params.getParameter("gain");
        float gain = gainParam->getValue();

        // Process audio
        applyGain(buffer, gain);
    }
};
```

---

## Plugin API

### Creating a New Plugin

```cpp
class MyNewPlugin : public juce::AudioProcessor {
public:
    MyNewPlugin()
        : AudioProcessor(
            BusesProperties()
                .withInput("Input", juce::AudioChannelSet::stereo())
                .withOutput("Output", juce::AudioChannelSet::stereo())
          )
    {
        // Add parameters
        addParameter(gain = new juce::AudioParameterFloat(
            "gain",
            "Gain",
            0.0f,
            1.0f,
            0.5f
        ));
    }

    void prepareToPlay(double sampleRate, int samplesPerBlock) override {
        // Prepare DSP
        dsp::ProcessSpec spec {
            sampleRate,
            static_cast<uint32>(samplesPerBlock),
            static_cast<uint32>(getMainBusNumOutputChannels())
        };
        gain.prepare(spec);
    }

    void processBlock(
        juce::AudioBuffer<float>& buffer,
        juce::MidiBuffer& midiMessages
    ) override {
        // Process MIDI
        for (const auto metadata : midiMessages) {
            auto message = metadata.getMessage();
            // Handle MIDI
        }

        // Process audio
        juce::dsp::AudioBlock<float> block(buffer);
        gain.process(juce::dsp::ProcessContextReplacing<float>(block));
    }

    const juce::String getName() const override { return "MyNewPlugin"; }

private:
    juce::AudioParameterFloat* gain;
    juce::dsp::Gain<float> gain;
};
```

### Plugin Registration

```cpp
// In plugin includes header
#define USE_JUCE_MAIN 1
#include <juce_audio_plugin_client/juce_audio_plugin_client.h>

// Plugin metadata
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new MyNewPlugin();
}

// Plugin properties
const juce::PluginDescription JUCE_CALLTYPE getPluginDescription()
{
    juce::PluginDescription desc;
    desc.name = "My New Plugin";
    desc.descriptiveName = "My New Plugin";
    desc.pluginFormatName = "VST3";
    desc.category = "Effect";
    desc.manufacturerName = "Your Name";
    desc.version = "1.0.0";
    desc.fileOrIdentifier = "com.yourname.mynewplugin";
    desc.uid = 0x12345678;
    return desc;
}
```

---

## Schillinger Systems API

### Rhythm Generators

```cpp
namespace schillinger {

struct RhythmGenerator {
    enum class Pattern {
        Attack,
        Interference,
        Coordination,
        Permutation
    };

    Pattern pattern = Pattern::Attack;
    int generatorCount = 3;
    std::vector<int> generatorPeriods;
    bool syncopated = false;
};

struct RhythmEvent {
    double timestamp;
    double duration;
    int velocity;
    int voice;
};

} // namespace schillinger
```

**Usage:**

```cpp
using namespace schillinger;

RhythmGenerator generator;
generator.pattern = RhythmGenerator::Pattern::Attack;
generator.generatorCount = 4;
generator.generatorPeriods = {2, 3, 5, 7};

SchillingerEngine engine;
engine.initialize(48000.0, 256);

auto rhythms = engine.generateRhythm(generator, 4);

for (const auto& rhythm : rhythms) {
    // Trigger note at rhythm.timestamp
    // Duration: rhythm.duration
    // Velocity: rhythm.velocity
}
```

### Pitch Generators

```cpp
namespace schillinger {

struct PitchGenerator {
    enum class Strategy {
        Diatonic,
        Chromatic,
        Microtonal
    };

    Strategy strategy = Strategy::Diatonic;
    Scale scale = Scale::Major;
    bool allowRests = true;
    double rangeSemitones = 12.0;
};

struct PitchEvent {
    double timestamp;
    int midiNote;
    double frequency;
    double duration;
};

} // namespace schillinger
```

**Usage:**

```cpp
using namespace schillinger;

PitchGenerator generator;
generator.strategy = PitchGenerator::Strategy::Diatonic;
generator.scale = Scale::Major;
generator.rangeSemitones = 24.0;

SchillingerEngine engine;
engine.initialize(48000.0, 256);

auto pitches = engine.generatePitch(generator, Scale::Major, 16);

for (const auto& pitch : pitches) {
    // Play note at pitch.midiNote
    // Frequency: pitch.frequency Hz
    // Duration: pitch.duration seconds
}
```

### Harmony Generators

```cpp
namespace schillinger {

struct HarmonyGenerator {
    enum class Type {
        Diatonic,
        Chromatic,
        Quartal
    };

    Type type = Type::Diatonic;
    Key key = Key::C;
    Scale scale = Scale::Major;
    int voiceCount = 4;
};

struct HarmonyEvent {
    double timestamp;
    std::vector<int> chordTones;
    double duration;
};

} // namespace schillinger
```

**Usage:**

```cpp
using namespace schillinger;

HarmonyGenerator generator;
generator.type = HarmonyGenerator::Type::Diatonic;
generator.key = Key::C;
generator.scale = Scale::Major;
generator.voiceCount = 4;

SchillingerEngine engine;
engine.initialize(48000.0, 256);

auto harmonies = engine.generateHarmony(
    generator,
    Progression::I_IV_V_I
);

for (const auto& harmony : harmonies) {
    // Play chord with harmony.chordTones
    // Duration: harmony.duration seconds
}
```

---

## FFI API

### Engine Lifecycle

```cpp
// Create engine
extern "C" {
    sch_result_t sch_engine_create(sch_engine_handle* out_engine);
}

// Destroy engine
extern "C" {
    sch_result_t sch_engine_destroy(sch_engine_handle engine);
}
```

**Usage:**

```cpp
sch_engine_handle engine;
sch_result_t result = sch_engine_create(&engine);

if (result == SCH_OK) {
    // Use engine

    // Clean up
    sch_engine_destroy(engine);
}
```

### Audio Control

```cpp
// Initialize audio
extern "C" {
    sch_result_t sch_engine_audio_init(
        sch_engine_handle engine,
        const sch_audio_config_t* config
    );
}

// Start audio
extern "C" {
    sch_result_t sch_engine_audio_start(sch_engine_handle engine);
}

// Stop audio
extern "C" {
    sch_result_t sch_engine_audio_stop(sch_engine_handle engine);
}
```

**Usage:**

```cpp
// Configure audio
sch_audio_config_t config = {
    .sample_rate = 48000.0,
    .buffer_size = 256,
    .input_channels = 0,
    .output_channels = 2
};

// Initialize
sch_engine_audio_init(engine, &config);

// Start
sch_engine_audio_start(engine);

// ... audio processing ...

// Stop
sch_engine_audio_stop(engine);
```

### Performance Blend

```cpp
extern "C" {
    sch_result_t sch_engine_set_performance_blend(
        sch_engine_handle engine,
        const char* performance_a_id,
        const char* performance_b_id,
        double blend_value
    );
}
```

**Usage:**

```cpp
// Blend two performances
sch_result_t result = sch_engine_set_performance_blend(
    engine,
    "piano",     // Performance A
    "techno",    // Performance B
    0.5          // 50% blend
);

if (result != SCH_OK) {
    // Handle error
    const char* errorStr = sch_result_to_string(result);
    fprintf(stderr, "Error: %s\n", errorStr);
}
```

### JSON Commands

```cpp
extern "C" {
    sch_result_t sch_engine_send_command(
        sch_engine_handle engine,
        const char* json_command
    );
}
```

**Usage:**

```cpp
// Send JSON command
const char* command = R"(
{
    "type": "set_parameter",
    "parameter_id": "master_volume",
    "value": 0.75
}
)";

sch_result_t result = sch_engine_send_command(engine, command);

if (result == SCH_OK) {
    // Command succeeded
}
```

---

## Audio Processing API

### Real-Time Audio Processing

```cpp
void PluginProcessor::processBlock(
    juce::AudioBuffer<float>& buffer,
    juce::MidiBuffer& midiMessages
) {
    // 1. Get buffer info
    int numSamples = buffer.getNumSamples();
    int numChannels = buffer.getNumChannels();

    // 2. Process MIDI
    for (const auto metadata : midiMessages) {
        auto message = metadata.getMessage();
        int samplePosition = metadata.samplePosition;

        // Handle MIDI message
        if (message.isNoteOn()) {
            int midiNote = message.getNoteNumber();
            float velocity = message.getVelocity() / 127.0f;
            // Trigger note
        }
    }

    // 3. Process audio (real-time safe!)
    for (int channel = 0; channel < numChannels; ++channel) {
        float* channelData = buffer.getWritePointer(channel);

        for (int sample = 0; sample < numSamples; ++sample) {
            // Process sample
            float input = channelData[sample];
            float output = processSample(input);
            channelData[sample] = output;
        }
    }

    // 4. Apply gain
    float gain = *parameters.getRawParameterValue("gain");
    buffer.applyGain(gain);

    // 5. Update meters
    inputLevel.setCurrentLevel(buffer.getRMSLevel(0, 0, numSamples));
    outputLevel.setCurrentLevel(buffer.getRMSLevel(0, 0, numSamples));
}
```

### Parameter Smoothing

```cpp
class SmoothedParameter {
public:
    SmoothedParameter(float smoothingTimeSeconds = 0.01)
        : smoothingTime(smoothingTimeSeconds)
    {
    }

    void prepare(double sampleRate, int samplesPerBlock) {
        smoothedValue.reset(sampleRate, smoothingTime);
    }

    void setValue(float newValue) {
        smoothedValue.setTargetValue(newValue);
    }

    float getNextValue() {
        return smoothedValue.getNextValue();
    }

private:
    juce::LinearSmoothedValue<float> smoothedValue;
    float smoothingTime;
};
```

**Usage:**

```cpp
// In processor
SmoothedParameter gainParam;

void prepareToPlay(double sampleRate, int samplesPerBlock) override {
    gainParam.prepare(sampleRate, samplesPerBlock);
}

void processBlock(
    juce::AudioBuffer<float>& buffer,
    juce::MidiBuffer& midiMessages
) override {
    // Update target value
    float targetGain = *parameters.getRawParameterValue("gain");
    gainParam.setValue(targetGain);

    // Process with smoothed values
    for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
        float gain = gainParam.getNextValue();
        // Process sample with smoothed gain
    }
}
```

---

## Error Handling

### Result Types

```cpp
enum class sch_result_t {
    SCH_OK = 0,
    SCH_ERR_INVALID_ARG = 1,
    SCH_ERR_ENGINE_FAILED = 2,
    SCH_ERR_NOT_IMPLEMENTED = 3
};

const char* sch_result_to_string(sch_result_t result);
```

**Usage:**

```cpp
sch_result_t result = sch_engine_create(&engine);

if (result != SCH_OK) {
    const char* errorStr = sch_result_to_string(result);
    fprintf(stderr, "Engine creation failed: %s\n", errorStr);
}
```

### Error Handler

```cpp
class ErrorHandler {
public:
    static void logError(const WhiteRoomError& error);

    static juce::Result createFailure(const WhiteRoomError& error);

    static juce::String errorToJson(const WhiteRoomError& error);
};
```

**Usage:**

```cpp
auto error = WhiteRoomError::audioEngineNotReady();
ErrorHandler::logError(error);
return ErrorHandler::createFailure(error);
```

---

## Utilities

### String Conversion

```cpp
// C string to JUCE String
juce::String toJUCEString(const char* cstr);

// JUCE String to C string (caller must free)
char* toCString(const juce::String& jstr);

// Free C string
void sch_free_string(char* str);
```

**Usage:**

```cpp
// C++ to C
juce::String msg = "Hello";
char* cmsg = toCString(msg);
// Use cmsg
sch_free_string(cmsg);

// C to C++
const char* cmsg = "World";
juce::String msg = toJUCEString(cmsg);
```

### JSON Utilities

```cpp
namespace json {

// Parse JSON
juce::var parse(const juce::String& jsonString);

// Serialize JSON
juce::String serialize(const juce::var& jsonData);

// Get property
juce::var getProperty(const juce::var& jsonData, const juce::String& key);

// Set property
void setProperty(juce::var& jsonData, const juce::String& key, const juce::var& value);

} // namespace json
```

**Usage:**

```cpp
// Parse JSON
juce::String jsonString = R"({"gain": 0.75, "frequency": 440.0})";
juce::var jsonData = json::parse(jsonString);

// Get property
double gain = jsonData.getProperty("gain", 0.5);

// Set property
json::setProperty(jsonData, "gain", 0.8);

// Serialize
juce::String output = json::serialize(jsonData);
```

---

## Performance Guidelines

### Real-Time Safety

**DO:**
- Pre-allocate all memory
- Use lock-free data structures
- Keep processing deterministic
- Avoid blocking operations

**DON'T:**
- No `new`/`delete` in audio thread
- No mutex locks in audio thread
- No file I/O in audio thread
- No logging in audio thread

### Optimization Tips

1. **SIMD Processing**
```cpp
// Use SIMD for vector operations
juce::FloatVectorOperations::multiply(
    buffer.getWritePointer(channel),
    gain,
    numSamples
);
```

2. **Minimize Virtual Calls**
```cpp
// Inline critical paths
JUCE_FORCE_INLINE float processSample(float input) {
    return input * gain;
}
```

3. **Avoid Copies**
```cpp
// Use references
void processBuffer(const juce::AudioBuffer<float>& buffer) {
    // Process directly
}
```

---

## Next Steps

- [FFI Bridge API](./ffi-bridge.md) - FFI bridge details
- [Error Handling API](./error-handling.md) - Error management
- [Integration Guides](../integration/) - How to use APIs
- [Troubleshooting](../troubleshooting/) - Common issues

---

**Last Updated:** 2026-01-15
**API Version:** 1.0.0
**C++ Standard:** C++17/20
