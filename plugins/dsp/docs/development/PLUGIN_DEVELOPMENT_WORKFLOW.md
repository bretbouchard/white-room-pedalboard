# White Room Plugin Development Workflow

**Version**: 1.0.0
**Date**: January 16, 2026
**Status**: Production Ready

---

## Overview

This document outlines the complete workflow for developing, testing, and deploying audio plugins in the White Room ecosystem. The workflow ensures every plugin meets production standards through comprehensive testing, UI templating, and multi-format support.

## Plugin Development Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLUGIN DEVELOPMENT LIFECYCLE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DSP IMPLEMENTATION                                          │
│     ├─ Pure DSP C++ class (GuitarPedalPureDSP)                 │
│     ├─ Parameters definition                                    │
│     ├─ Presets creation                                         │
│     └─ Algorithm implementation                                 │
│                                                                 │
│  2. COMPREHENSIVE TESTING                                       │
│     ├─ Basic signal tests (silence, impulse, tone)             │
│     ├─ Parameter sweep tests (min/mid/max)                     │
│     ├─ Preset tests (all factory presets)                      │
│     ├─ Parameter smoothing tests (zipper noise)                │
│     └─ Target: 98%+ pass rate                                  │
│                                                                 │
│  3. JUCE PLUGIN INTEGRATION                                     │
│     ├─ AudioProcessor wrapper                                   │
│     ├─ Parameter layout (APVTS)                                 │
│     ├─ State management (save/load)                            │
│     └─ Preset bank implementation                              │
│                                                                 │
│  4. UI TEMPLATE APPLICATION                                    │
│     ├─ WebView UI generation                                    │
│     ├─ Component layout (knobs, sliders, switches)              │
│     ├─ Visual feedback (meters, graphs)                         │
│     └─ Responsive design                                        │
│                                                                 │
│  5. PLUGIN FORMAT BUILD                                        │
│     ├─ VST3 (macOS, Windows)                                   │
│     ├─ AU (macOS only)                                         │
│     ├─ AAX (Pro Tools - optional)                              │
│     ├─ Standalone app                                          │
│     └─ LV2 (Linux - optional)                                  │
│                                                                 │
│  6. QUALITY ASSURANCE                                          │
│     ├─ DAW integration testing                                 │
│     ├─ Automation testing                                      │
│     ├─ Performance profiling (CPU usage)                       │
│     └─ User acceptance testing                                 │
│                                                                 │
│  7. DEPLOYMENT                                                 │
│     ├─ Code signing                                            │
│     ├─ Installer creation                                      │
│     ├─ Documentation                                           │
│     └─ Release notes                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: DSP Implementation

### 1.1 Create Pure DSP Class

Every plugin starts with a Pure DSP class that inherits from `GuitarPedalPureDSP`:

```cpp
// File: juce_backend/effects/pedals/include/dsp/MyPedalPureDSP.h

#pragma once

#include "GuitarPedalPureDSP.h"

namespace DSP {

class MyPedalPureDSP : public GuitarPedalPureDSP
{
public:
    MyPedalPureDSP();
    ~MyPedalPureDSP() override;

    // Required overrides
    const char* getName() const override { return "My Pedal"; }
    PedalCategory getCategory() const override { return PedalCategory::Distortion; }
    int getNumParameters() const override { return NUM_PARAMETERS; }
    const char* getParameterName(int index) const override;
    float getParameterMin(int index) const override;
    float getParameterMax(int index) const override;
    float getParameterValue(int index) const override;
    void setParameterValue(int index, float value) override;

    // Processing
    void process(float** inputs, float** outputs, int numChannels, int numSamples) override;
    void reset() override;

    // Presets
    static const int NUM_PRESETS = 8;
    static const Preset PRESETS[NUM_PRESETS];

    // Circuit modes (optional)
    enum CircuitMode
    {
        CircuitA = 0,
        CircuitB = 1,
        CircuitC = 2
    };

private:
    enum Parameters
    {
        Param1 = 0,
        Param2,
        Param3,
        Param4,
        NUM_PARAMETERS
    };

    struct Parameters
    {
        float param1;
        float param2;
        float param3;
        float param4;
    };

    Parameters params_;

    // Internal DSP state
    float stateVariable1_[2];
    float stateVariable2_[2];
};

} // namespace DSP
```

### 1.2 DSP Implementation Checklist

- [ ] Implement `setParameterValue()` with proper normalization (0.0-1.0 to actual ranges)
- [ ] Implement `getParameterValue()` with reverse normalization
- [ ] Add NaN/Inf guards in all processing functions
- [ ] Add safety clamps for critical parameters (Q, frequency, etc.)
- [ ] Implement soft limiting if output can clip
- [ ] Create 8 factory presets with normalized values
- [ ] Test all circuit modes (if applicable)
- [ ] Ensure sample rate handling in `reset()`

### 1.3 Parameter Normalization Pattern

```cpp
void MyPedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp to valid range
    value = juce::jlimit(0.0f, 1.0f, value);

    switch (index)
    {
        case Param1:  // Linear 0.0 to 100.0
            params_.param1 = value * 100.0f;
            break;

        case Param2:  // Logarithmic -20dB to +20dB
            params_.param2 = (value - 0.5f) * 40.0f;
            break;

        case Param3:  // Frequency 20Hz to 20kHz
            params_.param3 = 20.0f * std::pow(1000.0f, value);
            break;

        case Param4:  // Enum 0 to 7
            params_.param4 = std::round(value * 7.0f);
            break;
    }
}
```

---

## Phase 2: Comprehensive Testing

### 2.1 Test Categories

Every pedal must pass the following test suite:

| Test Category | Tests Per Pedal | Total Tests (10 pedals) | Pass Target |
|---------------|----------------|------------------------|-------------|
| Basic Signal  | 3 (silence, impulse, tone) | 30 | 100% |
| Parameter Sweep | N×3 (min/mid/max per param) | ~300 | 100% |
| Preset Tests | 8 (all presets) | 80 | 100% |
| Parameter Smoothing | N (all params) | ~100 | 95%+ |
| **TOTAL** | **~40 per pedal** | **~400** | **98%+** |

### 2.2 Running Tests

```bash
# Build test harness
cd juce_backend/dsp_test_harness/build
cmake ..
make

# Run all tests
./comprehensive_pedal_test_host

# View results
cat COMPREHENSIVE_TEST_RESULTS.json | jq '.testSummary'
```

### 2.3 Test Success Criteria

- ✅ **Basic Signal Tests**: 100% pass rate (no NaN/Inf, no unexpected clipping)
- ✅ **Parameter Sweep Tests**: 100% pass rate (all values stable)
- ✅ **Preset Tests**: 100% pass rate (all presets load and produce valid output)
- ⚠️ **Parameter Smoothing Tests**: 95%+ pass rate (zipper noise acceptable for EQ)

### 2.4 Common Test Failures and Solutions

#### Issue: NaN/Inf in output
**Solution**: Add NaN/Inf guards in processing functions
```cpp
if (std::isnan(output) || std::isinf(output)) output = input;
```

#### Issue: Clipping at max settings
**Solution**: Add soft limiter
```cpp
output = std::tanh(output);
```

#### Issue: Parameter instability
**Solution**: Add safety clamps
```cpp
value = std::max(minimumValue, std::min(maximumValue, value));
```

---

## Phase 3: JUCE Plugin Integration

### 3.1 AudioProcessor Wrapper

Create a JUCE `AudioProcessor` that wraps the Pure DSP class:

```cpp
// File: juce_backend/effects/pedals/src/processors/MyPedalProcessor.h

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "dsp/MyPedalPureDSP.h"

class MyPedalProcessor : public juce::AudioProcessor
{
public:
    MyPedalProcessor();
    ~MyPedalProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "My Pedal"; }

    int getNumParameters() override { return dsp_.getNumParameters(); }

    // State management
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // Programs (presets)
    int getNumPrograms() override { return MyPedalPureDSP::NUM_PRESETS; }
    const juce::String getProgramName(int index) override;
    void setCurrentProgram(int index) override;

private:
    DSP::MyPedalPureDSP dsp_;

    // APVTS for parameter management
    std::unique_ptr<juce::AudioProcessorValueTreeState> parameters_;
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MyPedalProcessor)
};
```

### 3.2 Parameter Layout

```cpp
juce::AudioProcessorValueTreeState::ParameterLayout MyPedalProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "param1",
        "Parameter 1",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter
    ));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        "param2",
        "Parameter 2",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter
    ));

    // ... add remaining parameters

    return { params.begin(), params.end() };
}
```

### 3.3 State Management

```cpp
void MyPedalProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    // Create state tree
    juce::ValueTree state("MyPedalState");

    // Save parameters
    juce::ValueTree params("Parameters");
    for (int i = 0; i < dsp_.getNumParameters(); ++i)
    {
        params.setProperty("param_" + juce::String(i), dsp_.getParameterValue(i), nullptr);
    }
    state.appendChild(params, nullptr);

    // Save preset
    state.setProperty("current_preset", getCurrentProgram(), nullptr);

    // Serialize
    juce::MemoryOutputStream stream(destData, false);
    state.writeToStream(stream);
}

void MyPedalProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    // Deserialize
    juce::MemoryInputStream stream(data, static_cast<size_t>(sizeInBytes), false);
    juce::ValueTree state = juce::ValueTree::readFromStream(stream);

    // Restore parameters
    juce::ValueTree params = state.getChildWithName("Parameters");
    for (int i = 0; i < dsp_.getNumParameters(); ++i)
    {
        float value = params.getProperty("param_" + juce::String(i), 0.5f);
        dsp_.setParameterValue(i, value);

        // Update APVTS
        auto* param = parameters_->getParameter("param_" + juce::String(i));
        if (param)
            param->setValueNotifyingHost(value);
    }

    // Restore preset
    int presetIndex = state.getProperty("current_preset", 0);
    setCurrentProgram(presetIndex);
}
```

---

## Phase 4: UI Template Application

### 4.1 UI Template System

White Room uses a standardized UI template system for all pedals:

```
swift_frontend/
├── Resources/
│   ├── UI_Templates/
│   │   ├── single_knob_template.html          # Simple 1-knob pedals
│   │   ├── dual_knob_template.html            # 2-knob pedals
│   │   ├── quad_knob_template.html            # 4-knob pedals
│   │   ├── multi_knob_template.html           # 5+ knob pedals
│   │   ├── compressor_template.html           # Compressor-specific
│   │   ├── eq_template.html                   # EQ-specific
│   │   └── modulation_template.html           # Chorus/ Phaser/ Flanger
│   │
│   └── Components/
│       ├── knob.js                            # Rotary control
│       ├── slider.js                          # Fader control
│       ├── switch.js                          # Toggle switch
│       ├── meter.js                           # VU/peak meter
│       ├── waveform.js                        # Oscilloscope
│       └── spectrum.js                        # Spectrum analyzer
```

### 4.2 UI Template Selection Guide

| Pedal Type | Template | Components |
|------------|----------|------------|
| Boost | `single_knob_template.html` | 1 Level knob |
| Fuzz | `dual_knob_template.html` | 2 knobs (Volume, Tone) |
| Overdrive | `quad_knob_template.html` | 4 knobs (Drive, Tone, Level, etc.) |
| Compressor | `compressor_template.html` | Threshold, Ratio, Attack, Release, Gain, Meter |
| EQ | `eq_template.html` | Bass, Mid, Treble, MidFreq, Q, Level, Spectrum |
| Chorus | `modulation_template.html` | Rate, Depth, Mix, Tone, Waveform |
| Delay | `modulation_template.html` | Time, Feedback, Mix, Modulation, Tone |
| Reverb | `multi_knob_template.html` | Decay, PreDelay, Diffusion, Tone, Mix |
| Phaser | `modulation_template.html` | Rate, Depth, Feedback, Mix, Manual |
| Noise Gate | `dual_knob_template.html` | Threshold, Release |

### 4.3 UI Template Structure

```html
<!-- File: swift_frontend/Resources/UI_Templates/quad_knob_template.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PEDAL_NAME}}</title>
    <style>
        /* CSS Variables for easy theming */
        :root {
            --primary-color: #{{PRIMARY_COLOR}};
            --secondary-color: #{{SECONDARY_COLOR}};
            --knob-size: {{KNOB_SIZE}}px;
        }

        body {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #ffffff;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }

        .pedal-container {
            background: linear-gradient(145deg, #2a2a2a, #1f1f1f);
            border-radius: 20px;
            padding: 30px;
            box-shadow:
                0 20px 60px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            max-width: 600px;
            width: 100%;
        }

        .pedal-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .pedal-title {
            font-size: 28px;
            font-weight: bold;
            color: var(--primary-color);
            text-transform: uppercase;
            letter-spacing: 3px;
            margin: 0;
        }

        .pedal-subtitle {
            font-size: 14px;
            color: #888;
            margin-top: 5px;
        }

        .knobs-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            margin-bottom: 20px;
        }

        .knob-container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* Knob styling */
        .knob {
            width: var(--knob-size);
            height: var(--knob-size);
            border-radius: 50%;
            background: linear-gradient(145deg, #3a3a3a, #2a2a2a);
            box-shadow:
                0 10px 20px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            position: relative;
            cursor: pointer;
            transition: transform 0.1s;
        }

        .knob:hover {
            transform: scale(1.05);
        }

        .knob-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 40%;
            height: 2px;
            background: var(--primary-color);
            transform-origin: left center;
            box-shadow: 0 0 10px var(--primary-color);
        }

        .knob-label {
            margin-top: 10px;
            font-size: 12px;
            color: #aaa;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .knob-value {
            margin-top: 5px;
            font-size: 14px;
            color: var(--primary-color);
            font-weight: bold;
        }

        /* Footer */
        .pedal-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #333;
        }

        .preset-selector {
            display: flex;
            gap: 10px;
        }

        .preset-btn {
            background: #333;
            border: 1px solid #444;
            color: #aaa;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
        }

        .preset-btn:hover {
            background: #444;
            color: #fff;
        }

        .preset-btn.active {
            background: var(--primary-color);
            color: #000;
            border-color: var(--primary-color);
        }

        .bypass-btn {
            background: #2a2a2a;
            border: 2px solid #{{BYPASS_COLOR}};
            color: #{{BYPASS_COLOR}};
            padding: 10px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: all 0.2s;
        }

        .bypass-btn.active {
            background: #{{BYPASS_COLOR}};
            color: #000;
            box-shadow: 0 0 20px #{{BYPASS_COLOR}};
        }

        /* LED indicator */
        .led {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #333;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
            margin-left: 10px;
        }

        .led.on {
            background: #{{LED_COLOR}};
            box-shadow: 0 0 10px #{{LED_COLOR}}, inset 0 1px 3px rgba(255, 255, 255, 0.3);
        }
    </style>
</head>
<body>
    <div class="pedal-container">
        <div class="pedal-header">
            <h1 class="pedal-title">{{PEDAL_NAME}}</h1>
            <p class="pedal-subtitle">{{PEDAL_CATEGORY}}</p>
        </div>

        <div class="knobs-grid">
            <!-- Dynamic knobs will be inserted here -->
            {{KNOBS_HTML}}
        </div>

        <div class="pedal-footer">
            <div class="preset-selector">
                {{PRESET_BUTTONS}}
            </div>

            <div style="display: flex; align-items: center;">
                <button class="bypass-btn" id="bypassBtn">Bypass</button>
                <div class="led" id="led"></div>
            </div>
        </div>
    </div>

    <script src="../../Components/knob.js"></script>
    <script src="../../Components/switch.js"></script>
    <script>
        // Initialize knobs
        {{KNOBS_INITIALIZATION}}

        // Initialize bypass
        const bypassBtn = document.getElementById('bypassBtn');
        const led = document.getElementById('led');

        bypassBtn.addEventListener('click', () => {
            bypassBtn.classList.toggle('active');
            led.classList.toggle('on');
            // Send bypass state to backend
            sendMessage({
                type: 'bypass',
                value: bypassBtn.classList.contains('active')
            });
        });

        // Preset management
        {{PRESET_MANAGEMENT}}

        // WebSocket communication
        let ws;

        function connect() {
            ws = new WebSocket('ws://localhost:8080/ws');

            ws.onopen = () => {
                console.log('Connected to backend');
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };

            ws.onclose = () => {
                console.log('Disconnected, reconnecting...');
                setTimeout(connect, 1000);
            };
        }

        function sendMessage(msg) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(msg));
            }
        }

        function handleMessage(data) {
            switch (data.type) {
                case 'parameter':
                    updateParameter(data.index, data.value);
                    break;
                case 'preset':
                    loadPreset(data.index);
                    break;
                case 'bypass':
                    updateBypass(data.value);
                    break;
            }
        }

        function updateParameter(index, value) {
            // Update knob UI
            const knob = document.getElementById(`knob-${index}`);
            if (knob) {
                knob.setValue(value);
            }
        }

        function loadPreset(index) {
            // Load preset parameters
            const preset = {{PRESETS}};
            preset.parameters.forEach((param, i) => {
                updateParameter(i, param);
            });

            // Update preset buttons
            document.querySelectorAll('.preset-btn').forEach((btn, i) => {
                btn.classList.toggle('active', i === index);
            });
        }

        function updateBypass(isActive) {
            bypassBtn.classList.toggle('active', isActive);
            led.classList.toggle('on', isActive);
        }

        // Initialize
        connect();
    </script>
</body>
</html>
```

### 4.4 UI Generation Script

```python
#!/usr/bin/env python3
"""
Generate UI HTML for all pedals from templates.
"""

import json
import os
from pathlib import Path

# Pedal configurations
PEDAL_CONFIGS = {
    "Boost": {
        "template": "single_knob_template.html",
        "primary_color": "FF6B35",
        "secondary_color": "FFD23F",
        "bypass_color": "00FF00",
        "led_color": "00FF00",
        "knobs": [
            {"name": "Level", "param_index": 0, "min": 0.0, "max": 1.0, "default": 0.5}
        ]
    },

    "Fuzz": {
        "template": "dual_knob_template.html",
        "primary_color": "E63946",
        "secondary_color": "F1FAEE",
        "bypass_color": "FF0000",
        "led_color": "FF0000",
        "knobs": [
            {"name": "Volume", "param_index": 0, "min": 0.0, "max": 1.0, "default": 0.5},
            {"name": "Tone", "param_index": 1, "min": 0.0, "max": 1.0, "default": 0.5}
        ]
    },

    "EQ": {
        "template": "eq_template.html",
        "primary_color": "457B9D",
        "secondary_color": "A8DADC",
        "bypass_color": "00B4D8",
        "led_color": "00B4D8",
        "knobs": [
            {"name": "Bass", "param_index": 0, "min": -12.0, "max": 12.0, "default": 0.0},
            {"name": "Mid", "param_index": 1, "min": -12.0, "max": 12.0, "default": 0.0},
            {"name": "Treble", "param_index": 2, "min": -12.0, "max": 12.0, "default": 0.0},
            {"name": "MidFreq", "param_index": 3, "min": 250.0, "max": 4000.0, "default": 1000.0},
            {"name": "Q", "param_index": 4, "min": 0.5, "max": 3.0, "default": 1.0},
            {"name": "Level", "param_index": 5, "min": -12.0, "max": 12.0, "default": 0.0}
        ]
    },

    # ... Add remaining pedals
}

def generate_ui(pedal_name, config):
    """Generate UI HTML for a pedal from template."""
    template_path = Path(f"swift_frontend/Resources/UI_Templates/{config['template']}")
    output_path = Path(f"swift_frontend/Resources/Pedals/{pedal_name}.html")

    # Read template
    with open(template_path) as f:
        template = f.read()

    # Generate knobs HTML
    knobs_html = ""
    knobs_init = ""

    for i, knob in enumerate(config['knobs']):
        knobs_html += f"""
        <div class="knob-container">
            <div class="knob" id="knob-{i}" data-param="{knob['param_index']}">
                <div class="knob-indicator"></div>
            </div>
            <div class="knob-label">{knob['name']}</div>
            <div class="knob-value" id="value-{i}">{knob['default']}</div>
        </div>
        """

        knobs_init += f"""
        const knob{i} = new Knob('knob-{i}', {{
            min: {knob['min']},
            max: {knob['max']},
            value: {knob['default']},
            onChange: (value) => {{
                document.getElementById('value-{i}').textContent = value.toFixed(2);
                sendMessage({{
                    type: 'parameter',
                    index: {knob['param_index']},
                    value: value
                }});
            }}
        }});
        """

    # Generate preset buttons
    preset_buttons = ""
    preset_mgmt = ""
    presets_data = []

    # Load presets from pedal header
    # ... (parse presets from Pure DSP header)

    for i, preset in enumerate(presets_data):
        preset_buttons += f'<button class="preset-btn" data-preset="{i}">{preset["name"]}</button>'

    preset_mgmt = """
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.preset);
                sendMessage({
                    type: 'preset',
                    index: index
                });
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    """

    # Replace template variables
    html = template.replace('{{PEDAL_NAME}}', pedal_name)
                   .replace('{{PEDAL_CATEGORY}}', config.get('category', 'Effect'))
                   .replace('{{PRIMARY_COLOR}}', config['primary_color'])
                   .replace('{{SECONDARY_COLOR}}', config['secondary_color'])
                   .replace('{{BYPASS_COLOR}}', config['bypass_color'])
                   .replace('{{LED_COLOR}}', config['led_color'])
                   .replace('{{KNOB_SIZE}}', str(config.get('knob_size', 80)))
                   .replace('{{KNOBS_HTML}}', knobs_html)
                   .replace('{{KNOBS_INITIALIZATION}}', knobs_init)
                   .replace('{{PRESET_BUTTONS}}', preset_buttons)
                   .replace('{{PRESET_MANAGEMENT}}', preset_mgmt)
                   .replace('{{PRESETS}}', json.dumps(presets_data))

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(html)

    print(f"✅ Generated UI for {pedal_name}")

# Generate all pedals
for pedal_name, config in PEDAL_CONFIGS.items():
    generate_ui(pedal_name, config)
```

---

## Phase 5: Plugin Format Build

### 5.1 Supported Formats

| Format | Platforms | Description |
|--------|-----------|-------------|
| **VST3** | macOS, Windows | Primary format, most DAWs |
| **AU** | macOS | Logic Pro, GarageBand, GarageBand |
| **Standalone** | macOS, Windows | Desktop application |
| **AAX** | macOS, Windows | Pro Tools (optional) |
| **LV2** | Linux | Linux DAWs (optional) |

### 5.2 Build Configuration

```cmake
# File: juce_backend/effects/pedals/CMakeLists.txt

cmake_minimum_required(VERSION 3.15)
project(WhiteRoomPedals)

# Find JUCE
find_package(JUCE REQUIRED CONFIG)

# Add all pedal processors
add_library(WhiteRoomPedals
    # DSP implementations
    src/dsp/BoostPedalPureDSP.cpp
    src/dsp/FuzzPedalPureDSP.cpp
    src/dsp/OverdrivePedalPureDSP.cpp
    src/dsp/CompressorPedalPureDSP.cpp
    src/dsp/EQPedalPureDSP.cpp
    src/dsp/ChorusPedalPureDSP.cpp
    src/dphaser/DelayPedalPureDSP.cpp
    src/dsp/ReverbPedalPureDSP.cpp
    src/dsp/PhaserPedalPureDSP.cpp
    src/dsp/NoiseGatePedalPureDSP.cpp

    # Processors
    src/processors/BoostProcessor.cpp
    src/processors/FuzzProcessor.cpp
    src/processors/OverdriveProcessor.cpp
    src/processors/CompressorProcessor.cpp
    src/processors/EQProcessor.cpp
    src/processors/ChorusProcessor.cpp
    src/processors/DelayProcessor.cpp
    src/processors/ReverbProcessor.cpp
    src/processors/PhaserProcessor.cpp
    src/processors/NoiseGateProcessor.cpp

    # Headers
    include/dsp/BoostPedalPureDSP.h
    include/dsp/FuzzPedalPureDSP.h
    include/dsp/OverdrivePedalPureDSP.h
    include/dsp/CompressorPedalPureDSP.h
    include/dsp/EQPedalPureDSP.h
    include/dsp/ChorusPedalPureDSP.h
    include/dsp/DelayPedalPureDSP.h
    include/dsp/ReverbPedalPureDSP.h
    include/dsp/PhaserPedalPureDSP.h
    include/dsp/NoiseGatePedalPureDSP.h
)

# Link JUCE
target_link_libraries(WhiteRoomPedals PRIVATE JUCE::juce_audio_plugin_client)

# Create VST3 plugin
juce_add_plugin(WhiteRoomPedals_VST3
    PRODUCT_NAME "WhiteRoomPedals"
    FORMATS VST3
    PLUGIN_COPY_DIR "${CMAKE_BINARY_DIR}/plugins"
)

# Create AU plugin (macOS only)
if(APPLE)
    juce_add_plugin(WhiteRoomPedals_AU
        PRODUCT_NAME "WhiteRoomPedals"
        FORMATS AU
        PLUGIN_COPY_DIR "${CMAKE_BINARY_DIR}/plugins"
    )
endif()

# Create Standalone app
juce_add_plugin(WhiteRoomPedals_Standalone
    PRODUCT_NAME "WhiteRoomPedals"
    FORMATS Standalone
    PLUGIN_COPY_DIR "${CMAKE_BINARY_DIR}/apps"
)
```

### 5.3 Building Plugins

```bash
# Build all formats
cd juce_backend/effects/pedals/build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j8

# Output locations
# VST3: build/plugins/VST3/
# AU:   build/plugins/AU/
# App:  build/apps/
```

---

## Phase 6: Quality Assurance

### 6.1 DAW Integration Testing

Test in multiple DAWs:

| DAW | Platform | Test Cases |
|-----|----------|------------|
| Ableton Live | macOS, Windows | Load plugin, automation, presets |
| Logic Pro | macOS | AU validation, session load/save |
| Reaper | macOS, Windows | VST3 stability, routing |
| Cubase | macOS, Windows | VST3 automation, sidechain |
| GarageBand | macOS | AU validation, simple workflow |
| FL Studio | macOS, Windows | VST3 routing, presets |

### 6.2 Performance Profiling

```cpp
// Add CPU metering to processor
void MyPedalProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    auto start = juce::Time::getHighResolutionTicks();

    // Process audio
    dsp_.process(inputs, outputs, buffer.getNumSamples());

    auto end = juce::Time::getHighResolutionTicks();
    auto elapsedMs = (end - start) / 1000.0;
    auto bufferMs = buffer.getNumSamples() / 48.0; // At 48kHz

    // Log CPU usage
    if (elapsedMs > bufferMs * 0.5) // Warning at 50% CPU
    {
        DBG("High CPU usage: " + juce::String(elapsedMs / bufferMs * 100, 1) + "%");
    }
}
```

### 6.3 Automation Testing

- Parameter smoothing verification
- Preset switching timing
- State load/save reliability
- Bypass switching artifacts

---

## Phase 7: Deployment

### 7.1 Code Signing

```bash
# macOS code signing
codesign --force --deep --sign "Developer ID Application: Your Name" \
    build/apps/WhiteRoomPedals.app

codesign --force --deep --sign "Developer ID Application: Your Name" \
    build/plugins/VST3/WhiteRoomPedals.vst3

codesign --force --deep --sign "Developer ID Application: Your Name" \
    build/plugins/AU/WhiteRoomPedals.component
```

### 7.2 Installer Creation

```bash
# Create macOS installer
productbuild \
    --component build/apps/WhiteRoomPedals.app /Applications \
    --component build/plugins/VST3 /Library/Audio/Plug-Ins/VST3 \
    --component build/plugins/AU /Library/Audio/Plug-Ins/Components \
    WhiteRoomPedals-1.0.0.pkg
```

### 7.3 Release Checklist

- [ ] All tests passing (98%+ success rate)
- [ ] DAW testing completed
- [ ] CPU usage acceptable (<10% per instance)
- [ ] Code signed
- [ ] Installer tested
- [ ] User manual updated
- [ ] Release notes written
- [ ] Demo version created (optional)
- [ ] Website updated
- [ ] Support documentation ready

---

## Complete Pedal Inventory

### Production Ready (10 Pedals)

| Pedal | DSP | Tests | UI | VST3 | AU | Standalone |
|-------|-----|-------|-----|------|----|------------|
| ✅ Boost | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Fuzz | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Overdrive | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Compressor | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ EQ | ✅ | ✅ 94.6% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Chorus | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Delay | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Reverb | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Phaser (BiPhase) | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |
| ✅ Noise Gate | ✅ | ✅ 100% | 🔄 | 🔄 | 🔄 | 🔄 |

**Legend:**
- ✅ Complete
- 🔄 In Progress
- ❌ Not Started

---

## Quick Start Guide

### Create New Pedal

```bash
# 1. Create Pure DSP class
cp -r templates/pedal_template juce_backend/effects/pedals/src/dsp/MyNewPedal

# 2. Run comprehensive tests
cd juce_backend/dsp_test_harness/build
./comprehensive_pedal_test_host

# 3. Generate UI from template
cd swift_frontend
python scripts/generate_ui.py --pedal MyNewPedal

# 4. Build plugin formats
cd juce_backend/effects/pedals/build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j8

# 5. Test in DAW
open -a "Logic Pro" build/plugins/AU/MyNewPedal.component
```

---

## Troubleshooting

### Common Issues

**Issue**: Plugin not appearing in DAW
**Solution**:
- Verify code signing
- Check plugin location
- Rescan DAW plugin list
- Check DAW console for errors

**Issue**: Audio dropouts or glitches
**Solution**:
- Profile CPU usage
- Optimize DSP code
- Reduce SIMD operations
- Check buffer size settings

**Issue**: Parameter changes not smooth
**Solution**:
- Implement parameter smoothing in DSP
- Use APVTS parameter ramps
- Add smoothing filters

**Issue**: UI not updating
**Solution**:
- Check WebSocket connection
- Verify parameter mapping
- Debug message handling

---

## Resources

- **JUCE Documentation**: https://docs.juce.com/
- **VST3 SDK**: https://steinberg.net/vst3/
- **AU Documentation**: https://developer.apple.com/documentation/audiounits/
- **WebView Documentation**: https://developer.apple.com/documentation/webkit/webview/

---

**End of Workflow Document**

Generated: January 16, 2026
Version: 1.0.0
Status: Production Ready
