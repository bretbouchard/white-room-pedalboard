# Core DSP Architecture

## Overview

This directory contains the platform-agnostic, format-independent DSP core for all White Room audio plugins.

## Critical Rules

- **NO platform conditionals inside DSP**
- **DSP must be 100% independent of plugin format** (VST, AU, AAX, CLAP)
- **All plugins share same DSP core and parameter model**
- **ParameterSpec.json is the SINGLE source of truth**

## Directory Structure

```
core/
├── dsp/
│   ├── EngineCore.h          - Base class for all DSP engines
│   ├── VoiceAllocator.h      - Polyphonic voice management
│   ├── ModMatrix.h           - Modulation routing system
│   └── RenderGraph.h         - Node-based processing graph
├── parameters/
│   ├── ParameterSpec.json    - Single source of truth for parameters
│   ├── ParameterModel.h      - Parameter state management
│   └── ParameterHash.cpp     - Deterministic parameter hashing
└── presets/
    └── (future: preset management)
```

## Component Overview

### EngineCore.h

Base class defining the common interface for all DSP engines:

```cpp
class EngineCore {
public:
    virtual void prepare(double sampleRate, int maxSamplesPerBlock) = 0;
    virtual void reset() = 0;
    virtual void processBlock(...) = 0;
    virtual void setParameter(const char* parameterId, float value) = 0;
    virtual float getParameter(const char* parameterId) const = 0;
};
```

**Key Features:**
- Platform-agnostic interface
- Parameter smoothing helpers
- Utility functions (interpolation, dB conversion, clamping, soft clipping)

### VoiceAllocator.h

Polyphonic voice allocation system with multiple stealing strategies:

**Strategies:**
- **LIFO** (Last In First Out) - Steal most recent voice
- **FIFO** (First In First Out) - Steal oldest voice
- **Lowest Priority** - Steal quietest voice
- **Highest Amplitude** - Steal loudest voice (masking effect)

**Usage:**
```cpp
VoiceAllocator allocator(16, VoiceStealStrategy::LIFO);
int voiceIndex = allocator.allocateVoice(noteNumber, velocity);
allocator.releaseVoice(noteNumber);
```

### ModMatrix.h

Modulation routing system for LFOs, envelopes, macros, and MIDI:

**Features:**
- Multiple sources per destination (summed)
- Bipolar and unipolar modulation
- Audio-rate and control-rate modulation
- Polyphonic modulation sources

**Sources:**
- LFOs (1-4)
- Envelopes (1-4)
- Macros (1-4)
- MIDI (velocity, modwheel, pitch bend, aftertouch, key track, breath)
- Audio (amplitude, centroid, RMS)
- Random & sample & hold

**Usage:**
```cpp
ModMatrix matrix;
matrix.setNumParameters(numParams);
int routingId = matrix.addRouting({ModSource::LFO1, paramId, 0.5f, false, false});
float modulatedValue = matrix.getModulatedValue(paramId, baseValue);
```

### RenderGraph.h

Node-based processing graph for organizing DSP chains:

**Node Types:**
- **Generator** - Audio source (oscillator, noise)
- **Processor** - Audio processor (filter, effect)
- **Output** - Audio output
- **Control** - Control signal (LFO, envelope)
- **Input** - Audio input from plugin

**Predefined Nodes:**
- `GainNode` - Simple gain
- `MixerNode` - Mix multiple inputs

**Usage:**
```cpp
RenderGraph graph;
auto* gain = graph.createNode<GainNode>("output_gain", NodeType::Processor);
gain->setGain(0.5f);
graph.prepare(sampleRate, maxSamplesPerBlock);
graph.process(inputs, outputs, numSamples);
```

### ParameterSpec.json

**Single source of truth** for all plugin parameters.

**Schema:**
```json
{
  "id": "string - Unique parameter identifier",
  "name": "string - Human-readable display name",
  "range": { "min": 0.0, "max": 1.0, "default": 0.5 },
  "rate": "enum - 'audio', 'control', 'startup'",
  "polyphonic": "boolean - Per-voice instances",
  "type": "enum - 'float', 'int', 'bool', 'enum'",
  "mapping": "enum - 'linear', 'log', 'sqrt', 'exp'",
  "automation": "boolean - Can be automated",
  "modulatable": "boolean - Can be modulation target"
}
```

**Examples included:**
- Far Far Away (distance renderer)
- Monument (open air reverb)
- Filter Gate (dual processor)

### ParameterModel.h

Parameter state management with smoothing:

**Features:**
- Parameter storage and access
- Normalized-to-raw value conversion
- Audio-rate smoothing
- Change detection and callbacks
- State serialization

**Usage:**
```cpp
ParameterModel model;
ParameterDefinition def = { /* ... */ };
int paramId = model.addParameter(def);
model.setParameterValue(paramId, 0.5f);
model.processAllSmoothing();
float smoothed = model.getSmoothedValue(paramId);
```

### ParameterHash.cpp

Deterministic parameter hashing for reliable preset management:

**Features:**
- Consistent hash generation from parameter ID strings
- Hash-to-index mapping for array lookups
- Hash combination for composite keys
- Collision detection (future)

## Design Philosophy

### Platform Independence

All DSP code is **100% independent** of plugin format:

- No `#ifdef` for VST/AU/AAX
- No format-specific includes
- Pure C++ DSP implementation

### Parameter Model Consistency

All plugins use the **same parameter system**:

- Single ParameterSpec.json defines all parameters
- ParameterModel handles state consistently
- ParameterHash ensures deterministic identification

### DSP Purity

The DSP core contains **only audio processing**:

- No UI code
- no file I/O
- No network calls
- Pure mathematical transformations

## Usage Pattern

### Creating a New Plugin

1. **Define parameters** in `ParameterSpec.json`
2. **Create DSP class** inheriting from `EngineCore`
3. **Implement required methods**: `prepare()`, `reset()`, `processBlock()`
4. **Use helper classes**: `VoiceAllocator` for polyphony, `ModMatrix` for modulation
5. **Build format-specific wrapper** (separate from DSP core)

### Example: Simple Gain Plugin

```cpp
class GainPlugin : public EngineCore {
public:
    void prepare(double sr, int maxBlock) override {
        sampleRate = sr;
        gainSmoother.prepare(sr);
    }

    void reset() override {
        gainSmoother.reset();
    }

    void processBlock(const float* const* inputs, float* const* outputs,
                     int numIn, int numOut, int numSamples) override {
        for (int i = 0; i < numSamples; ++i) {
            float gain = gainSmoother.process(targetGain);
            outputs[0][i] = inputs[0][i] * gain;
        }
    }

    void setParameter(const char* id, float value) override {
        if (strcmp(id, "gain") == 0) {
            targetGain = value;
        }
    }

private:
    ParameterSmoother gainSmoother;
    float targetGain = 1.0f;
};
```

## Best Practices

### DO:
- Use `EngineCore` base class for all DSP engines
- Define all parameters in `ParameterSpec.json`
- Use `ParameterModel` for state management
- Implement parameter smoothing for audio-rate parameters
- Use `VoiceAllocator` for polyphonic instruments
- Use `ModMatrix` for modulation systems
- Keep DSP pure (no I/O, no UI)

### DON'T:
- Add platform conditionals in DSP code
- Hardcode parameter values in DSP
- Mix UI code with DSP code
- Use format-specific APIs in DSP core
- Skip parameter smoothing for audio-rate params

## Testing

All DSP components should be tested with:

- **Unit tests** for individual components
- **Integration tests** for complete processing chains
- **Performance benchmarks** for CPU usage
- **Validation tests** against reference implementations

See `/tests/core/` for test files.

## Future Work

- [ ] Preset management system
- [ ] Parameter automation curves
- [ ] Advanced modulation (matrix modulation, sequencing)
- [ ] DSP graph optimization (topology sorting, parallel processing)
- [ ] SIMD optimization for critical paths

## References

- JUCE DSP Module: https://docs.juce.com/master/classDSP.html
- VST3 SDK: https://steinbergmedia.github.io/vst3_doc/
- AU API: https://developer.apple.com/documentation/audiounits
- CLAP Specification: https://cleveraudio.org/
