# Parameter Smoothing - Quick Reference Card

## Quick Start

### 1. Include Header
```cpp
#include "../../include/SmoothedParametersMixin.h"
using namespace SchillingerEcosystem::DSP;
```

### 2. Define Parameters
```cpp
enum Parameters {
    PARAM_CUTOFF = 0,
    PARAM_RESONANCE,
    PARAM_VOLUME,
    PARAM_COUNT
};
```

### 3. Add Member
```cpp
SmoothedParameterArray<float, PARAM_COUNT> smoothedParams_;
```

### 4. Initialize
```cpp
void prepare(double sampleRate, int blockSize) {
    smoothedParams_.prepare(sampleRate, blockSize);
}
```

### 5. Set Parameters
```cpp
void setParameter(const char* id, float value) {
    if (strcmp(id, "cutoff") == 0) {
        params_.cutoff = value;
        smoothedParams_.set(PARAM_CUTOFF, value);  // Smoothed
    }
}
```

### 6. Use in Process
```cpp
void process(float** output, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        float cutoff = smoothedParams_.getSmoothed(PARAM_CUTOFF);
        // Use smoothed value...
    }
}
```

### 7. Preset Changes
```cpp
void loadPreset(const char* json) {
    float cutoff = parseCutoff(json);
    smoothedParams_.setImmediate(PARAM_CUTOFF, cutoff);  // No smoothing
}
```

## Common Patterns

### Single Parameter
```cpp
SmoothedParameter<float> param;
param.prepare(48000.0, 512);
param.set(0.5f);
float value = param.getSmoothed();
```

### Array of Parameters
```cpp
SmoothedParameterArray<float, 32> array;
array.prepare(48000.0, 512);
array.set(0, 0.5f);
float value = array.getSmoothed(0);
```

### Fast Smoothing (Modulation)
```cpp
float modValue = smoothedParams_.getFast(PARAM_CUTOFF);
```

### Check if Smoothing
```cpp
if (smoothedParams_[PARAM_CUTOFF].isSmoothing()) {
    // Parameter is still smoothing
}
```

### Get Current Target
```cpp
float target = smoothedParams_.get(PARAM_CUTOFF);
```

## Standard Parameters

Use these IDs for consistency:

```cpp
// Oscillator
OSC_FREQUENCY = 0
OSC_DETUNE = 1
OSC_LEVEL = 2

// Filter
FILTER_CUTOFF = 10
FILTER_RESONANCE = 11
FILTER_DRIVE = 12

// Envelope
ENV_ATTACK = 20
ENV_DECAY = 21
ENV_SUSTAIN = 22
ENV_RELEASE = 23

// Effects
EFFECTS_REVERB_MIX = 30
EFFECTS_DELAY_MIX = 31
EFFECTS_DRIVE = 32

// Global
MASTER_VOLUME = 40
PITCH_BEND_RANGE = 41
```

## Utility Functions

### Frequency Conversion
```cpp
using namespace SmoothedParameterUtils;

// Linear 0-1 to Log frequency (20Hz-20kHz)
float freq = linearToLogFrequency(0.5f);  // ~632 Hz

// Log frequency to Linear 0-1
float linear = logFrequencyToLinear(1000.0f);  // ~0.55

// Clamp
float clamped = clamp(value, 0.0f, 1.0f);
```

## Best Practices

### DO ✓
- Use standard smoothing (50ms) for UI parameters
- Use fast smoothing (0.1ms) for modulation
- Use setImmediate() for preset changes
- Prepare in prepare() method
- Call getSmoothed() in process loop

### DON'T ✗
- Don't allocate memory in process()
- Don't smooth MIDI note events
- Don't bypass smoothing for envelopes
- Don't forget to call prepare()

## Performance Tips

### Optimize: Check Before Smoothing
```cpp
if (smoothedParams_[PARAM_CUTOFF].isSmoothing()) {
    // Per-sample smoothing
    for (int i = 0; i < numSamples; ++i) {
        float cutoff = smoothedParams_.getSmoothed(PARAM_CUTOFF);
        // Process...
    }
} else {
    // Use constant value
    float cutoff = smoothedParams_.get(PARAM_CUTOFF);
    for (int i = 0; i < numSamples; ++i) {
        // Process with constant cutoff...
    }
}
```

### Optimize: Batch Process
```cpp
// Get all smoothed values once per sample
float cutoff = smoothedParams_.getSmoothed(PARAM_CUTOFF);
float resonance = smoothedParams_.getSmoothed(PARAM_RESONANCE);
float volume = smoothedParams_.getSmoothed(PARAM_VOLUME);

// Use them throughout the sample processing
```

## Troubleshooting

### Problem: Zipper noise still present
**Solution**: Verify getSmoothed() is called in process loop

### Problem: Smoothing too slow
**Solution**: Use getFast() for modulation, setImmediate() for presets

### Problem: Parameters don't update
**Solution**: Check setParameter() calls smoothedParams_.set()

### Problem: High CPU usage
**Solution**: Check if smoothing is needed before calling getSmoothed()

## Testing

### Unit Test Template
```cpp
TEST_CASE("Parameter smoothing prevents zipper noise", "[dsp]")
{
    MyInstrument inst;
    inst.prepare(48000.0, 512);

    // Rapid parameter changes
    for (int i = 0; i < 1000; ++i) {
        inst.setParameter("cutoff", i / 1000.0f);
        float sample = inst.processSample();
        // Check for discontinuities...
    }

    // Verify smooth output
    REQUIRE(maxDelta < 0.1f);
}
```

## File Locations

### Core System
- Header: `/Users/bretbouchard/apps/schill/instrument_juce/include/SmoothedParametersMixin.h`
- Tests: `/Users/bretbouchard/apps/schill/instrument_juce/tests/dsp/SmoothedParametersTest.cpp`

### Documentation
- Integration Guide: `/Users/bretbouchard/apps/schill/instrument_juce/docs/SmoothedParametersIntegrationGuide.md`
- Summary: `/Users/bretbouchard/apps/schill/instrument_juce/docs/SmoothedParametersImplementationSummary.md`
- LocalGal Example: `/Users/bretbouchard/apps/schill/instrument_juce/docs/LocalGalSmoothingIntegration.cpp`

## Instrument Integration Status

- [ ] LOCAL_GAL (Acid Synthesizer)
- [ ] Nex Synth (FM Synthesizer)
- [ ] Sam Sampler
- [ ] Giant Strings
- [ ] Giant Drums
- [ ] Giant Voice
- [ ] Giant Horns
- [ ] Giant Percussion
- [ ] Drum Machine

## Quick Commands

### Compile test
```bash
cd /Users/bretbouchard/apps/schill/instrument_juce/tests/dsp
g++ -std=c++17 -I../../../include SmoothedParametersTest.cpp -o test
```

### Run test
```bash
./test
```

### View documentation
```bash
cat docs/SmoothedParametersIntegrationGuide.md
cat docs/SmoothedParametersImplementationSummary.md
```

## Key Concepts

### Smoothing Time
- **Standard**: 50ms (0.05s) - User-facing parameters
- **Fast**: 0.1ms (0.0001s) - Internal modulation

### Thread Safety
- Atomic parameter updates
- No locks needed
- Real-time safe

### Memory Usage
- ~32 bytes per parameter
- Negligible impact

### CPU Usage
- ~5-10 cycles per getSmoothed()
- ~0.1% CPU per instrument

## Support

For detailed information:
- See Integration Guide for step-by-step instructions
- See Implementation Summary for architecture overview
- See LocalGal Example for complete integration
- See test files for usage examples

## Version

- **Version**: 1.0
- **Date**: January 9, 2026
- **Author**: Bret Bouchard
- **Inspired By**: Mutable Instruments

---

**Quick Reference v1.0** - Keep this handy while integrating!
