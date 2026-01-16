# Integration Guides

Step-by-step guides for extending White Room functionality.

## Table of Contents

1. [Adding New Instruments](#adding-new-instruments)
2. [Adding New Effects](#adding-new-effects)
3. [Extending Schillinger Systems](#extending-schillinger-systems)
4. [Adding UI Components](#adding-ui-components)
5. [Implementing New Features](#implementing-new-features)

---

## Adding New Instruments

### Overview

This guide shows you how to create a new instrument (synthesizer) plugin for White Room.

### Prerequisites

- JUCE backend set up and building
- Understanding of C++ and JUCE framework
- Basic audio DSP knowledge

### Step 1: Create Plugin Structure

```bash
cd juce_backend/src/plugins

# Create new plugin directory
mkdir MyNewSynth
cd MyNewSynth

# Create plugin files
touch MyNewSynthProcessor.h
touch MyNewSynthProcessor.cpp
touch MyNewSynthEditor.h (optional, for UI)
touch MyNewSynthEditor.cpp (optional, for UI)
```

### Step 2: Implement Plugin Processor

**MyNewSynthProcessor.h:**

```cpp
#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "../core/PluginProcessor.h"

class MyNewSynthProcessor : public PluginProcessor {
public:
    MyNewSynthProcessor();
    ~MyNewSynthProcessor() override;

    // Plugin information
    const juce::String getName() const override;

    // Audio processing
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

protected:
    void processAudio(
        juce::AudioBuffer<float>& buffer,
        const juce::AudioProcessorValueTreeState& params
    ) override;

private:
    // Synth voices
    juce::Synthesiser synth;

    // Parameters
    juce::AudioProcessorValueTreeState::ParameterLayout createParameters() override;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MyNewSynthProcessor)
};
```

**MyNewSynthProcessor.cpp:**

```cpp
#include "MyNewSynthProcessor.h"

MyNewSynthProcessor::MyNewSynthProcessor()
    : PluginProcessor(
        BusesProperties()
            .withInput("Input", juce::AudioChannelSet::stereo())
            .withOutput("Output", juce::AudioChannelSet::stereo())
      )
{
    // Initialize synth
    synth.addVoice(new MySynthVoice());
    synth.addSound(new MySynthSound());
}

MyNewSynthProcessor::~MyNewSynthProcessor() {
}

const juce::String MyNewSynthProcessor::getName() const {
    return "MyNewSynth";
}

void MyNewSynthProcessor::prepareToPlay(
    double sampleRate,
    int samplesPerBlock
) {
    // Prepare synth
    synth.setCurrentPlaybackSampleRate(sampleRate);

    // Prepare DSP
}

void MyNewSynthProcessor::releaseResources() {
    // Clean up
}

juce::AudioProcessorValueTreeState::ParameterLayout
MyNewSynthProcessor::createParameters() {
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    // Add parameters
    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "master_volume",
        "Master Volume",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        0.7f
    ));

    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        "waveform",
        "Waveform",
        juce::StringArray({ "Sine", "Square", "Sawtooth", "Triangle" }),
        0
    ));

    return { params.begin(), params.end() };
}

void MyNewSynthProcessor::processAudio(
    juce::AudioBuffer<float>& buffer,
    const juce::AudioProcessorValueTreeState& params
) {
    // Get parameters
    float volume = *params.getRawParameterValue("master_volume");

    // Render synth
    synth.renderNextBlock(buffer, 0, buffer.getNumSamples());

    // Apply master volume
    buffer.applyGain(volume);
}
```

### Step 3: Implement Synth Voice

**MySynthVoice.h:**

```cpp
#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

class MySynthVoice : public juce::SynthesiserVoice {
public:
    MySynthVoice();
    ~MySynthVoice() override;

    bool canPlaySound(juce::SynthesiserSound* sound) override;

    void startNote(
        int midiNoteNumber,
        float velocity,
        juce::SynthesiserSound* sound,
        int currentPitchWheelPosition
    ) override;

    void stopNote(float velocity, bool allowTailOff) override;

    void pitchWheelMoved(int newPitchWheelValue) override;

    void controllerMoved(int controllerNumber, int newControllerValue) override;

    void renderNextBlock(
        juce::AudioBuffer<float>& outputBuffer,
        int startSample,
        int numSamples
    ) override;

private:
    // Oscillator
    double currentAngle = 0.0;
    double angleDelta = 0.0;
    double level = 0.0;

    // ADSR envelope
    juce::ADSR adsr;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MySynthVoice)
};
```

**MySynthVoice.cpp:**

```cpp
#include "MySynthVoice.h"

MySynthVoice::MySynthVoice() {
    // Setup ADSR
    adsr.setSampleRate(44100.0);
    adsr.setParameters({
        0.1f,  // attack
        0.1f,  // decay
        0.7f,  // sustain
        0.1f   // release
    });
}

MySynthVoice::~MySynthVoice() {
}

bool MySynthVoice::canPlaySound(juce::SynthesiserSound* sound) {
    return dynamic_cast<MySynthSound*>(sound) != nullptr;
}

void MySynthVoice::startNote(
    int midiNoteNumber,
    float velocity,
    juce::SynthesiserSound* sound,
    int currentPitchWheelPosition
) {
    // Calculate frequency
    auto frequency = juce::MidiMessage::getMidiNoteInHertz(midiNoteNumber);
    auto sampleRate = getSampleRate();

    // Calculate angle increment
    auto cyclesPerSample = frequency / sampleRate;
    angleDelta = cyclesPerSample * 2.0 * juce::MathConstants<double>::pi;

    // Set level from velocity
    level = velocity * 0.15;

    // Start ADSR
    adsr.noteOn();
}

void MyNewSynthVoice::stopNote(float velocity, bool allowTailOff) {
    if (allowTailOff) {
        adsr.noteOff();
    } else {
        clearCurrentNote();
        angleDelta = 0.0;
    }
}

void MyNewSynthVoice::pitchWheelMoved(int newPitchWheelValue) {
    // Handle pitch bend
}

void MyNewSynthVoice::controllerMoved(int controllerNumber, int newControllerValue) {
    // Handle MIDI CC
}

void MyNewSynthVoice::renderNextBlock(
    juce::AudioBuffer<float>& outputBuffer,
    int startSample,
    int numSamples
) {
    if (angleDelta != 0.0) {
        // Apply ADSR
        adsr.applyEnvelopeToBuffer(outputBuffer, startSample, numSamples);

        // Generate samples
        for (int sample = 0; sample < numSamples; ++sample) {
            auto currentSample = (float)(std::sin(currentAngle) * level);

            // Write to all output channels
            for (int channel = 0; channel < outputBuffer.getNumChannels(); ++channel) {
                outputBuffer.addSample(channel, startSample + sample, currentSample);
            }

            // Increment angle
            currentAngle += angleDelta;

            // Wrap angle
            if (currentAngle >= 2.0 * juce::MathConstants<double>::pi) {
                currentAngle -= 2.0 * juce::MathConstants<double>::pi;
            }
        }
    }
}
```

### Step 4: Register Plugin

**juce_backend/CMakeLists.txt:**

```cmake
# Add plugin to build list
list(APPEND PLUGIN_SOURCES
    src/plugins/MyNewSynth/MyNewSynthProcessor.cpp
)

# Create plugin target
add_library(MyNewSynth MODULE
    ${PLUGIN_SOURCES}
    ${SHARED_SOURCES}
)

target_link_libraries(MyNewSynth
    PUBLIC
        juce::juce_audio_plugin_client
        schillinger-engine
)

# Set plugin properties
set_target_properties(MyNewSynth PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/my_new_synth_plugin_build"
    PREFIX ""
    OUTPUT_NAME "MyNewSynth"
    SUFFIX ".vst3"
)
```

### Step 5: Update TypeScript Types

**sdk/src/types/instruments.ts:**

```typescript
export interface InstrumentConfig {
    id: string;
    name: string;
    type: 'synth' | 'sampler' | 'physical';
}

export const MY_NEW_SYNTH_CONFIG: InstrumentConfig = {
    id: 'my_new_synth',
    name: 'My New Synth',
    type: 'synth'
};
```

### Step 6: Build and Test

```bash
# Build plugin
cd juce_backend
cmake --build build --target MyNewSynth

# Install plugin
cp build/my_new_synth_plugin_build/MyNewSynth.vst3 ~/Library/Audio/Plug-Ins/VST3/

# Test in DAW
# Open DAW, scan plugins, add MyNewSynth to track
```

---

## Adding New Effects

### Overview

This guide shows you how to create a new audio effect plugin.

### Step 1: Create Effect Structure

```bash
cd juce_backend/src/plugins
mkdir MyNewEffect
cd MyNewEffect

touch MyNewEffectProcessor.h
touch MyNewEffectProcessor.cpp
```

### Step 2: Implement Effect Processor

**MyNewEffectProcessor.h:**

```cpp
#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "../core/PluginProcessor.h"

class MyNewEffectProcessor : public PluginProcessor {
public:
    MyNewEffectProcessor();
    ~MyNewEffectProcessor() override;

    const juce::String getName() const override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

protected:
    void processAudio(
        juce::AudioBuffer<float>& buffer,
        const juce::AudioProcessorValueTreeState& params
    ) override;

private:
    // DSP processors
    juce::dsp::ProcessSpec spec;

    // Parameters
    juce::AudioProcessorValueTreeState::ParameterLayout createParameters() override;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MyNewEffectProcessor)
};
```

**MyNewEffectProcessor.cpp:**

```cpp
#include "MyNewEffectProcessor.h"

MyNewEffectProcessor::MyNewEffectProcessor()
    : PluginProcessor(
        BusesProperties()
            .withInput("Input", juce::AudioChannelSet::stereo())
            .withOutput("Output", juce::AudioChannelSet::stereo())
      )
{
}

MyNewEffectProcessor::~MyNewEffectProcessor() {
}

const juce::String MyNewEffectProcessor::getName() const {
    return "MyNewEffect";
}

void MyNewEffectProcessor::prepareToPlay(
    double sampleRate,
    int samplesPerBlock
) {
    // Prepare DSP
    spec = {
        static_cast<double>(sampleRate),
        static_cast<juce::uint32>(samplesPerBlock),
        static_cast<juce::uint32>(getMainBusNumOutputChannels())
    };

    // Prepare your DSP processors here
}

void MyNewEffectProcessor::releaseResources() {
    // Clean up
}

juce::AudioProcessorValueTreeState::ParameterLayout
MyNewEffectProcessor::createParameters() {
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "amount",
        "Effect Amount",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        0.5f
    ));

    return { params.begin(), params.end() };
}

void MyNewEffectProcessor::processAudio(
    juce::AudioBuffer<float>& buffer,
    const juce::AudioProcessorValueTreeState& params
) {
    // Get parameters
    float amount = *params.getRawParameterValue("amount");

    // Process audio
    juce::dsp::AudioBlock<float> block(buffer);

    // Apply your effect here
    // Example: simple gain
    buffer.applyGain(1.0f + amount);
}
```

### Step 3: Register and Build

```bash
# Update CMakeLists.txt (similar to instrument guide)

# Build effect
cmake --build build --target MyNewEffect

# Install and test
```

---

## Extending Schillinger Systems

### Overview

This guide shows you how to add new Schillinger music theory systems.

### Step 1: Create System Structure

```bash
cd juce_backend/src/schillinger
mkdir my_system
cd my_system

touch MySystem.h
touch MySystem.cpp
touch test_MySystem.cpp
```

### Step 2: Implement System

**MySystem.h:**

```cpp
#pragma once

#include "../core/SchillingerTypes.h"

namespace schillinger {

class MySystem {
public:
    MySystem();
    ~MySystem();

    struct Config {
        int param1;
        float param2;
        bool param3;
    };

    struct Result {
        std::vector<Event> events;
        double duration;
    };

    // Execute system
    Result execute(const Config& config);

    // Validate configuration
    bool validateConfig(const Config& config) const;

private:
    // Internal implementation
    class Impl;
    std::unique_ptr<Impl> impl;
};

} // namespace schillinger
```

**MySystem.cpp:**

```cpp
#include "MySystem.h"

namespace schillinger {

class MySystem::Impl {
public:
    Result execute(const Config& config) {
        Result result;

        // Implement your system logic here
        // Generate events based on Schillinger theory

        return result;
    }

    bool validateConfig(const Config& config) const {
        // Validate parameters
        return config.param1 > 0 && config.param2 >= 0.0f;
    }
};

MySystem::MySystem()
    : impl(std::make_unique<Impl>())
{
}

MySystem::~MySystem() {
}

MySystem::Result MySystem::execute(const Config& config) {
    if (!validateConfig(config)) {
        // Handle invalid config
        return {};
    }

    return impl->execute(config);
}

bool MySystem::validateConfig(const Config& config) const {
    return impl->validateConfig(config);
}

} // namespace schillinger
```

### Step 3: Add Tests

**test_MySystem.cpp:**

```cpp
#include <gtest/gtest.h>
#include "MySystem.h"

using namespace schillinger;

TEST(MySystem, ValidateConfig) {
    MySystem system;

    MySystem::Config validConfig = {
        .param1 = 10,
        .param2 = 0.5f,
        .param3 = true
    };

    EXPECT_TRUE(system.validateConfig(validConfig));
}

TEST(MySystem, ExecuteSystem) {
    MySystem system;

    MySystem::Config config = {
        .param1 = 10,
        .param2 = 0.5f,
        .param3 = true
    };

    auto result = system.execute(config);

    EXPECT_FALSE(result.events.empty());
    EXPECT_GT(result.duration, 0.0);
}
```

### Step 4: Register with Engine

**SchillingerEngine.h:**

```cpp
#pragma once

#include "my_system/MySystem.h"

class SchillingerEngine {
public:
    // Add your system method
    std::vector<Event> executeMySystem(const MySystem::Config& config);

private:
    // Store system instance
    std::unique_ptr<MySystem> mySystem_;
};
```

---

## Adding UI Components

### Overview

This guide shows you how to add new SwiftUI UI components.

### Step 1: Create SwiftUI View

**swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Views/MyNewView.swift:**

```swift
import SwiftUI

struct MyNewView: View {
    @State private var value: Double = 0.5
    @State private var isPlaying: Bool = false

    var body: some View {
        VStack(spacing: 20) {
            Text("My New Control")
                .font(.headline)

            Slider(value: $value, in: 0...1) {
                Text("Value")
            }

            Button(action: {
                isPlaying.toggle()
            }) {
                Text(isPlaying ? "Stop" : "Play")
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

#if DEBUG
struct MyNewView_Previews: PreviewProvider {
    static var previews: some View {
        MyNewView()
    }
}
#endif
```

### Step 2: Add to Main View

**MainView.swift:**

```swift
struct MainView: View {
    var body: some View {
        TabView {
            PerformanceBlenderView()
                .tabItem {
                    Label("Blend", systemImage: "circle.lefthalf.filled")
                }

            MyNewView()  // Add your view here
                .tabItem {
                    Label("My Feature", systemImage: "star.fill")
                }
        }
    }
}
```

### Step 3: Connect to Engine

**MyNewViewModel.swift:**

```swift
import Foundation
import Combine

@MainActor
class MyNewViewModel: ObservableObject {
    @Published var value: Double = 0.5
    @Published var isPlaying: Bool = false

    private let engine = JUCEEngine.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        // Observe engine state
        engine.$isEngineRunning
            .assign(to: &$isPlaying)
    }

    func setValue(_ newValue: Double) {
        value = newValue

        // Send to engine
        Task {
            try? await engine.setParameter("my_param", value: newValue)
        }
    }

    func togglePlayback() {
        if isPlaying {
            engine.stopEngine()
        } else {
            engine.startEngine()
        }
    }
}
```

---

## Implementing New Features

### Feature Development Workflow

1. **Create Specification**
   - Document what the feature does
   - Define API surface
   - Identify affected components

2. **Implement Backend**
   - Add C++ implementation
   - Write unit tests
   - Update FFI bridge if needed

3. **Update TypeScript Types**
   - Define shared types
   - Add validation
   - Update API interfaces

4. **Implement Frontend**
   - Create UI components
   - Connect to backend
   - Handle errors

5. **Test End-to-End**
   - Test complete workflow
   - Verify error handling
   - Check performance

6. **Document**
   - Update API docs
   - Add examples
   - Update changelog

### Example: Adding Parameter Automation

**Backend (C++):**

```cpp
// Add parameter to processor
params.push_back(std::make_unique<juce::AudioParameterFloat>(
    "my_param",
    "My Parameter",
    juce::NormalisableRange<float>(0.0f, 1.0f),
    0.5f
));

// In processBlock
float myParam = *params.getRawParameterValue("my_param");
```

**FFI Bridge (C):**

```c
sch_result_t sch_engine_set_parameter(
    sch_engine_handle engine,
    const char* parameter_id,
    float value
);
```

**TypeScript Types:**

```typescript
export interface Parameter {
    id: string;
    name: string;
    value: number;
    min: number;
    max: number;
}
```

**Frontend (Swift):**

```swift
struct ParameterControl: View {
    let parameter: Parameter
    @Binding var value: Double

    var body: some View {
        VStack {
            Text(parameter.name)
            Slider(value: $value, in: parameter.min...parameter.max)
        }
    }
}
```

---

**Last Updated:** 2026-01-15
**Version:** 1.0.0
