# JUCE Instrument Plugin Template System

Reusable C++ templates for building JUCE instrument plugins with minimal boilerplate.

## Features

- ✅ **Automatic Parameter Management** - APVTS integration with minimal code
- ✅ **State Serialization** - Preset save/load for VST3/AU formats
- ✅ **Custom UI Components** - Slider, button, combo box builders with auto-attachment
- ✅ **Factory Presets** - Built-in preset management system
- ✅ **Thread-Safe Parameter Access** - Atomic parameter pointers
- ✅ **Dark Theme Styling** - Professional default appearance
- ✅ **Resizable UI** - Responsive layouts with constraints
- ✅ **Multi-Format Build** - VST3 + AU support via CMake

## Template Components

### 1. ParameterBuilder.h

Utility class for creating JUCE parameters with consistent defaults:

```cpp
using namespace PluginTemplates;

// Float parameter
auto* param = ParameterBuilder::createFloatParameter(
    "drillAmount", "Drill Amount",
    0.0f, 1.0f, 0.5f,
    ParameterCategory::drill
);

// Percentage parameter
auto* percent = ParameterBuilder::createPercentageParameter(
    "mix", "Mix", 50.0f
);

// Gain parameter (dB)
auto* gain = ParameterBuilder::createGainParameter(
    "masterVol", "Master Volume", 0.0f
);

// Time parameter (ms)
auto* time = ParameterBuilder::createTimeParameter(
    "decay", "Decay Time", 250.0f
);

// Boolean parameter
auto* toggle = ParameterBuilder::createBoolParameter(
    "drillEnabled", "Enable Drill", true
);

// Choice parameter
juce::StringArray choices = { "4 Bars", "8 Bars", "16 Bars" };
auto* choice = ParameterBuilder::createChoiceParameter(
    "phraseLength", "Phrase Length", choices, 0
);
```

### 2. BaseInstrumentProcessor.h

Base class for instrument processors:

```cpp
class MyInstrumentProcessor : public PluginTemplates::BaseInstrumentProcessor {
public:
    MyInstrumentProcessor()
        : BaseInstrumentProcessor(
            BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo()),
            "My Instrument",
            // Define parameter layout
            PluginTemplates::ParameterLayoutBuilder::createLayout({
                ParameterBuilder::createFloatParameter("param1", "Param 1", 0.0f, 1.0f, 0.5f),
                ParameterBuilder::createBoolParameter("enabled", "Enabled", true),
            }))
    {
        // Initialize parameter pointers
        param1Param = getParameterPointer("param1");
        enabledParam = getParameterPointer("enabled");

        // Initialize DSP
        dsp.prepareToPlay(44100.0, 512);
    }

    void prepareToPlay(double sampleRate, int samplesPerBlock) override
    {
        dsp.prepareToPlay(sampleRate, samplesPerBlock);
    }

    void releaseResources() override
    {
        dsp.releaseResources();
    }

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) override
    {
        // Update DSP parameters from thread-safe atomics
        dsp.setParameter(param1Param->load());
        dsp.setEnabled(enabledParam->load() > 0.5f);

        // Process audio
        dsp.processBlock(buffer, midi);
    }

private:
    // DSP instance
    MyPureDSP dsp;

    // Parameter pointers (thread-safe)
    std::atomic<float>* param1Param = nullptr;
    std::atomic<float>* enabledParam = nullptr;
};
```

### 3. BaseInstrumentEditor.h

Base class for instrument editors:

```cpp
class MyInstrumentEditor : public PluginTemplates::BaseInstrumentEditor {
public:
    MyInstrumentEditor(MyInstrumentProcessor& p)
        : BaseInstrumentEditor(p, p.parameters)
    {
        // Create parameter sliders
        param1Slider = createParameterSlider("param1", "Parameter 1");
        enabledButton = createParameterButton("enabled", "Enable");

        // Add components to editor
        addAndMakeVisible(*param1Slider);
        addAndMakeVisible(*enabledButton);

        // Add preset manager
        addPresetManager(*this, 10, 10, 300, 30);

        // Set initial size
        setSize(400, 300);
    }

    void layoutComponents() override
    {
        // Layout components
        param1Slider->setBounds(50, 60, 100, 100);
        enabledButton->setBounds(200, 60, 100, 30);
    }

private:
    std::unique_ptr<juce::Slider> param1Slider;
    std::unique_ptr<juce::ToggleButton> enabledButton;
};
```

## Quick Start: Creating a New Plugin

### Step 1: Define Your Processor

```cpp
// MyInstrumentPluginProcessor.h
#pragma once
#include "plugin_templates/BaseInstrumentProcessor.h"

class MyInstrumentPluginProcessor : public PluginTemplates::BaseInstrumentProcessor {
public:
    MyInstrumentPluginProcessor();

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) override;

    juce::AudioProcessorEditor* createEditor() override;

private:
    // Your DSP instance
    MyPureDSP dsp;

    // Parameter pointers
    std::atomic<float>* param1Param = nullptr;
    std::atomic<float>* param2Param = nullptr;
};
```

### Step 2: Implement Processor

```cpp
// MyInstrumentPluginProcessor.cpp
#include "MyInstrumentPluginProcessor.h"

MyInstrumentPluginProcessor::MyInstrumentPluginProcessor()
    : BaseInstrumentProcessor(
        BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo()),
        "My Instrument",
        PluginTemplates::ParameterLayoutBuilder::createLayout({
            PluginTemplates::ParameterBuilder::createFloatParameter(
                "param1", "Parameter 1", 0.0f, 1.0f, 0.5f),
            PluginTemplates::ParameterBuilder::createBoolParameter(
                "enabled", "Enabled", true),
        }))
{
    // Get parameter pointers
    param1Param = getParameterPointer("param1");
    enabledParam = getParameterPointer("enabled");

    // Initialize DSP
    dsp = std::make_unique<MyPureDSP>();
}

void MyInstrumentPluginProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    dsp->prepareToPlay(sampleRate, samplesPerBlock);
}

void MyInstrumentPluginProcessor::releaseResources()
{
    dsp->releaseResources();
}

void MyInstrumentPluginProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    // Update DSP from parameters
    dsp->setParameter(param1Param->load());
    dsp->setEnabled(enabledParam->load() > 0.5f);

    // Process
    dsp->processBlock(buffer, midi);
}

juce::AudioProcessorEditor* MyInstrumentPluginProcessor::createEditor()
{
    return new MyInstrumentPluginEditor(*this);
}

// Required plugin factory function
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new MyInstrumentPluginProcessor();
}
```

### Step 3: Define Editor

```cpp
// MyInstrumentPluginEditor.h
#pragma once
#include "plugin_templates/BaseInstrumentEditor.h"

class MyInstrumentPluginProcessor;

class MyInstrumentPluginEditor : public PluginTemplates::BaseInstrumentEditor {
public:
    MyInstrumentPluginEditor(MyInstrumentPluginProcessor& p);

    void layoutComponents() override;

private:
    std::unique_ptr<juce::Slider> param1Slider;
    std::unique_ptr<juce::ToggleButton> enabledButton;
};
```

### Step 4: Implement Editor

```cpp
// MyInstrumentPluginEditor.cpp
#include "MyInstrumentPluginEditor.h"
#include "MyInstrumentPluginProcessor.h"

MyInstrumentPluginEditor::MyInstrumentPluginEditor(MyInstrumentPluginProcessor& p)
    : BaseInstrumentEditor(p, p.parameters)
{
    // Create UI components
    param1Slider = createParameterSlider("param1", "Parameter 1");
    enabledButton = createParameterButton("enabled", "Enable");

    addAndMakeVisible(*param1Slider);
    addAndMakeVisible(*enabledButton);

    // Add preset manager
    addPresetManager(*this, 10, 10, 300, 30);

    setSize(400, 300);
}

void MyInstrumentPluginEditor::layoutComponents()
{
    param1Slider->setBounds(50, 60, 100, 100);
    enabledButton->setBounds(200, 100, 100, 30);
}
```

### Step 5: Add to CMakeLists.txt

```cmake
# Find your plugin section in CMakeLists.txt and add:

juce_add_plugin("MyInstrument"
    SOURCES
        src/MyInstrumentPluginProcessor.cpp
        src/MyInstrumentPluginEditor.cpp
    COMPANY_NAME "YourCompany"
    BUNDLE_ID "com.yourcompany.myinstrument"
    FORMATS "VST3;AU"  # Build both VST3 and AU
    PLUGIN_IS_SYNTH TRUE
)

target_link_libraries(MyInstrument
    PRIVATE
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_dsp
        juce::juce_gui_basics
        juce::juce_gui_extra
)

target_include_directories(MyInstrument
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)
```

## Parameter Categories

Use categories for better DAW organization:

- `ParameterCategory::generic` - General parameters
- `ParameterCategory::synthesis` - Oscillators, filters
- `ParameterCategory::effects` - Audio effects
- `ParameterCategory::envelope` - ADSR envelopes
- `ParameterCategory::modulation` - LFOs, modulation
- `ParameterCategory::sequencer` - Pattern/sequence controls
- `ParameterCategory::drill` - IDM/drill specific controls
- `ParameterCategory::performance` - Performance controls

## Preset Management

### Adding Factory Presets

```cpp
// In your processor constructor
addFactoryPreset("Init", getXmlForPreset("init"));
addFactoryPreset("Heavy Drill", getXmlForPreset("heavy"));
addFactoryPreset("Subtle", getXmlForPreset("subtle"));

juce::String MyInstrumentProcessor::getXmlForPreset(const juce::String& name)
{
    // Create preset state programmatically or load from file
    juce::ValueTree preset("State");
    preset.setProperty("param1", 0.8f, nullptr);
    preset.setProperty("enabled", true, nullptr);

    std::unique_ptr<juce::XmlElement> xml(preset.createXml());
    return xml->toString();
}
```

### Saving/Loading User Presets

The template system handles this automatically:
- VST3 presets are saved to `~/Library/Audio/Presets/YourCompany/`
- AU presets are saved to `~/Library/Audio/Presets/YourCompany/`
- The "Save" button opens a native file picker

## Build Configuration

### Building VST3 Only

```cmake
juce_add_plugin("MyInstrument"
    FORMATS "VST3"
    # ...
)
```

### Building AU Only (macOS)

```cmake
juce_add_plugin("MyInstrument"
    FORMATS "AU"
    # ...
)
```

### Building Both

```cmake
juce_add_plugin("MyInstrument"
    FORMATS "VST3;AU"
    # ...
)
```

## Advanced Features

### Custom State Serialization

Override `getCustomState()` and `restoreCustomState()`:

```cpp
// Save pattern data
std::unique_ptr<juce::XmlElement> MyInstrumentProcessor::getCustomState() const
{
    auto state = std::make_unique<juce::XmlElement>("CustomState");

    // Save pattern data
    auto patternXml = dsp_->getPatternAsXml();
    state->addChildElement(patternXml.release());

    return state;
}

// Restore pattern data
void MyInstrumentProcessor::restoreCustomState(const juce::XmlElement& element)
{
    if (auto* patternXml = element.getChildByName("Pattern"))
    {
        dsp_->restorePatternFromXml(*patternXml);
    }
}
```

### Real-time Parameter Updates

Use atomic pointers for thread-safe access:

```cpp
void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    // Thread-safe read without locks
    float currentValue = myParam->load(std::memory_order_relaxed);

    // Update DSP
    dsp->setParameter(currentValue);

    // Process
    dsp->process(buffer, midi);
}
```

### Custom UI Components

Extend the base editor for custom components:

```cpp
class MyInstrumentEditor : public PluginTemplates::BaseInstrumentEditor {
public:
    // ... constructor

    void layoutComponents() override
    {
        // Custom layout
        sequencerDisplay.setBounds(10, 50, 380, 200);
        drumPads.setBounds(10, 260, 380, 100);
    }

private:
    std::unique_ptr<SequencerComponent> sequencerDisplay;
    std::unique_ptr<DrumPadComponent> drumPads;
};
```

## Examples

See the DrumMachinePlugin implementation for a complete example using all template features.

## License

Part of the Schillinger Ecosystem JUCE Backend.
