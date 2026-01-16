# White Room Guitar Effects Pedal System

## Overview

Complete extensible framework for guitar effects pedals, extracted from KaneMarcoAetherString's bridge nonlinearity and body resonator code. This system provides a solid foundation for building classic guitar effects with a unified API.

## Architecture

### Base Class: `GuitarPedalPureDSP`

All pedals inherit from this base class, which provides:

- **Common parameter system** - Unified parameter handling with ID-based access
- **Preset management** - JSON save/load, factory presets
- **State management** - Binary state serialization
- **DSP lifecycle** - `prepare()`, `reset()`, `process()`
- **Helper functions** - Clamping, interpolation, soft/hard clipping

### Pedal Categories

1. **Distortion** - Overdrive, Fuzz, Distortion
2. **Modulation** - Chorus, Phaser, Flanger, Tremolo
3. **TimeBased** - Delay, Reverb, Echo
4. **Dynamics** - Compressor, Limiter, Boost
5. **Filter** - Wah, EQ, Filter effects
6. **Pitch** - Pitch shifter, Harmonizer

## Implemented Pedals

### 1. Overdrive Pedal (`OverdrivePedalPureDSP`)

**Emulates**: Tube Screamer, Boss SD-1, TS-808/TS-9

**Features**:
- Soft clipping (asymmetric, tube-like saturation)
- 3-band tone stack (bass, mid, treble)
- Drive control (0-5x gain)
- Level control (output volume)
- Mix control (clean/dirty blend)

**Parameters** (6):
- `drive` - Amount of overdrive (0-1)
- `tone` - Overall tone tilt (0-1)
- `bass` - Bass boost/cut (0-1)
- `mid` - Midrange boost/cut (0-1)
- `treble` - Treble boost/cut (0-1)
- `level` - Output volume (0-1)

**Presets** (5):
1. Clean Boost
2. Crunch
3. Overdrive
4. Tube Screamer
5. Blues Breaker

**DSP Circuit**:
```cpp
float processSoftClip(float input)
{
    // Asymmetric clipping (tube-like)
    float positive = std::tanh(input * 2.0f) * 0.6f;
    float negative = std::tanh(input * 1.5f) * 0.4f;

    return (input > 0) ? positive : negative;
}
```

### 2. Fuzz Pedal (`FuzzPedalPureDSP`)

**Emulates**: Fuzz Face, Big Muff Pi, Fuzz Factory

**Features**:
- Hard clipping (aggressive, gated fuzz)
- Noise gate (for high-gain noise reduction)
- Tone control with contour (mid-scoop)
- Stability control (Fuzz Factory oscillation)
- Volume control

**Parameters** (6):
- `fuzz` - Fuzz amount (0-1, up to 9x gain)
- `tone` - Tone control (0-1)
- `contour` - Midrange scoop (0-1)
- `gate` - Gate threshold (0-1)
- `volume` - Output volume (0-1)
- `stab` - Stability/oscillation (0-1)

**Presets** (6):
1. Mild Fuzz
2. Fuzz Face
3. Big Muff
4. Fuzz Factory
5. Velcro Fuzz
6. Octave Fuzz

**DSP Circuit**:
```cpp
float processFuzz(float input)
{
    // Hard clipping with asymmetric curve
    float driven = input * (1.0f + fuzz * 8.0f);

    // Add instability when stab < 0.3
    if (params_.stab < 0.3f)
    {
        float osc = std::sin(phase_ * 2.0f * M_PI) *
                    (0.3f - params_.stab) * 0.5f;
        driven += osc;
    }

    // Asymmetric hard clip
    if (driven > 0)
        clipped = clipped * clipped / (1.5f + clipped * 0.5f);
    else
        clipped = clipped * clipped / (-1.5f + clipped * 0.5f);

    return hardClip(clipped, 1.0f);
}
```

### 3. Chorus Pedal (`ChorusPedalPureDSP`)

**Emulates**: Boss CE-1, Small Clone, Tri-chorus

**Features**:
- LFO-modulated delay (chorus effect)
- Multi-voice chorus (1-3 voices)
- Rate and depth controls
- Tone control (EQ)
- Mix control (wet/dry)

**Parameters** (5):
- `rate` - LFO rate (0-1, maps to 0.1-10.0 Hz)
- `depth` - Modulation depth (0-1)
- `mix` - Wet/dry mix (0-1)
- `tone` - Tone control (0-1)
- `voice_count` - Number of voices (1-3)

**Presets** (5):
1. Subtle Chorus
2. Classic Chorus
3. Lush Chorus
4. Vibrato
5. Tri-Chorus

**DSP Circuit**:
```cpp
// Triangle wave LFO
float lfo = 2.0f * std::abs(2.0f * (phase / (2.0f * M_PI) -
           std::floor(phase / (2.0f * M_PI) + 0.5f))) - 1.0f;

// Modulate delay time
float baseDelay = 0.01f; // 10ms
float modDelay = baseDelay + lfo * depth * 0.02f; // Up to 30ms

// Read from delay line with modulation
int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;
float delayed = delayLine_[readIndex];
```

### 4. Delay Pedal (`DelayPedalPureDSP`)

**Emulates**: Boss DM-2/DM-3, MXR Carbon Copy, Digital delays

**Features**:
- Delay time (50ms - 2 seconds)
- Feedback control (with self-oscillation)
- Tone control (analog warmth)
- Modulation (chorus-like delay modulation)
- Mix and level controls

**Parameters** (6):
- `time` - Delay time (0-1, maps to 50ms-2s)
- `feedback` - Feedback amount (0-1)
- `mix` - Wet/dry mix (0-1)
- `tone` - Tone darkness (0-1)
- `modulation` - Modulation amount (0-1)
- `level` - Output level (0-1)

**Presets** (6):
1. Slapback
2. Rockabilly
3. Analog Delay
4. Digital Delay
5. Ambient
6. Self-Oscillation

**DSP Circuit**:
```cpp
// LFO for modulation
float modRate = 0.5f; // 0.5 Hz
lfoPhase_ += (2.0f * M_PI * modRate) / sampleRate_;
float modulation = std::sin(lfoPhase_) * params_.modulation * 0.01f;

// Read from delay line
int delaySamples = static_cast<int>((delayTime + modulation) * sampleRate_);
int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;
float delayed = delayLine_[readIndex];

// Tone control (analog warmth)
float toneCoeff = 0.9f + params_.tone * 0.09f;
float toned = toneCoeff * toneState_ + (1.0f - toneCoeff) * delayed;
```

## File Structure

```
juce_backend/effects/pedals/
├── include/dsp/
│   ├── GuitarPedalPureDSP.h          (270 lines) - Base class
│   ├── OverdrivePedalPureDSP.h        (140 lines) - Overdrive
│   ├── FuzzPedalPureDSP.h             (145 lines) - Fuzz
│   ├── ChorusPedalPureDSP.h           (150 lines) - Chorus
│   └── DelayPedalPureDSP.h            (145 lines) - Delay
├── src/dsp/
│   ├── GuitarPedalPureDSP.cpp         (150 lines) - Base implementation
│   ├── OverdrivePedalPureDSP.cpp      (200 lines) - Overdrive impl
│   ├── FuzzPedalPureDSP.cpp           (220 lines) - Fuzz impl
│   ├── ChorusPedalPureDSP.cpp         (230 lines) - Chorus impl
│   └── DelayPedalPureDSP.cpp          (210 lines) - Delay impl
└── README.md                           (This file)
```

**Total Lines of Code**: ~2,000 lines

## Usage Example

### Creating a New Pedal

```cpp
#include "GuitarPedalPureDSP.h"

class MyCustomPedal : public DSP::GuitarPedalPureDSP
{
public:
    bool prepare(double sampleRate, int blockSize) override
    {
        sampleRate_ = sampleRate;
        blockSize_ = blockSize;
        prepared_ = true;
        return true;
    }

    void reset() override
    {
        // Reset DSP state
    }

    void process(float** inputs, float** outputs,
                int numChannels, int numSamples) override
    {
        for (int ch = 0; ch < numChannels; ++ch)
        {
            for (int i = 0; i < numSamples; ++i)
            {
                float input = inputs[ch][i];
                float output = myDSPCircuit(input);
                outputs[ch][i] = output;
            }
        }
    }

    const char* getName() const override { return "My Custom Pedal"; }
    PedalCategory getCategory() const override { return PedalCategory::Distortion; }

    // Implement parameters...
};
```

### Using a Pedal

```cpp
// Create pedal
OverdrivePedalPureDSP overdrive;

// Prepare DSP
overdrive.prepare(48000.0, 512);

// Set parameters
overdrive.setParameter("drive", 0.7f);
overdrive.setParameter("tone", 0.5f);
overdrive.setParameter("level", 0.6f);

// Process audio
float* inputs[2] = {leftInput, rightInput};
float* outputs[2] = {leftOutput, rightOutput};
overdrive.process(inputs, outputs, 2, numSamples);

// Load preset
overdrive.loadPreset(2); // Tube Screamer

// Save state
char jsonBuffer[4096];
overdrive.savePreset(jsonBuffer, sizeof(jsonBuffer));
```

## Key Design Decisions

### 1. Parameter System
- **ID-based access** - Strings for human-readable parameter IDs
- **Normalized values** - All parameters 0-1 internally
- **Smooth transitions** - Optional smoothing time per parameter

### 2. Preset System
- **JSON format** - Human-readable, easily editable
- **Factory presets** - Builtin to each pedal
- **User presets** - Save/load via JSON

### 3. DSP Architecture
- **Pure DSP** - No platform-specific code
- **Sample-accurate** - Process sample-by-sample
- **NaN safety** - All inputs checked for NaN/Inf
- **Clipping protection** - Soft clip all outputs

### 4. Modulation Sources
- **LFO** - Triangle wave LFO built into base class
- **Envelope** - Envelope follower available
- **Audio-rate** - Can modulate with audio signal

## Extending the System

### Adding New Pedal Types

1. **Create header** - Inherit from `GuitarPedalPureDSP`
2. **Implement required methods** - `prepare()`, `reset()`, `process()`
3. **Define parameters** - Override parameter methods
4. **Add presets** - Create factory presets array
5. **Implement DSP circuits** - Private methods for audio processing

### Adding New Modulation Types

```cpp
// In your pedal class
float processLFO(float phase)
{
    // Sine wave
    return std::sin(phase * 2.0f * M_PI);

    // Triangle wave
    return 2.0f * std::abs(2.0f * (phase - std::floor(phase + 0.5f))) - 1.0f;

    // Square wave
    return (phase < 0.5f) ? 1.0f : -1.0f;
}
```

## Performance Considerations

- **Memory** - Delay lines allocate max memory at `prepare()`
- **CPU** - Sample-by-sample processing (no vectorization yet)
- **Real-time safe** - No allocations in `process()`
- **Cache-friendly** - Linear memory access patterns

## Future Enhancements

### Planned Pedals
- Phaser (allpass filter modulation)
- Flanger (short delay with feedback)
- Tremolo (amplitude modulation)
- Vibrato (pitch modulation)
- Compressor (dynamic range control)
- Wah (bandpass filter modulation)
- Reverb (algorithmic reverberation)
- Pitch Shifter (FFT-based pitch shifting)

### Framework Improvements
- SIMD optimization (ARM NEON)
- Parameter smoothing (ramp-based)
- Oversampling (for aliasing reduction)
- Multi-channel support (surround)
- Automation curves (LFO shapes)

## Integration with White Room

### From KaneMarcoAetherString
- **Bridge nonlinearity** → Overdrive/Fuzz soft clipping
- **Modal body resonator** → AetherDrive cabinet simulation
- **Physical modeling** → Foundation for new pedal types

### Building Plugins
Each pedal can be wrapped as a JUCE plugin:
```cpp
class OverdrivePluginProcessor : public juce::AudioProcessor
{
    OverdrivePedalPureDSP pedal;
    // JUCE boilerplate...
};
```

## Conclusion

This guitar effects pedal system provides:
- ✅ **Extensible framework** for unlimited pedal types
- ✅ **Production-ready DSP** with safety and quality
- ✅ **Classic pedal emulations** (Overdrive, Fuzz, Chorus, Delay)
- ✅ **Modern C++** (C++17, no external dependencies)
- ✅ **Professional quality** with factory presets
- ✅ **Easy to extend** for new pedal types

**Total Pedals Implemented**: 4
**Total Presets**: 22
**Total Lines of DSP Code**: ~2,000

Ready for integration into White Room's audio plugin ecosystem!
