# Parameter Smoothing Integration Guide

## Overview

This guide explains how to integrate the universal parameter smoothing system into all Schillinger instruments. The system prevents zipper noise during parameter changes and provides smooth, professional-quality audio transitions.

## Architecture

### Components

1. **SmoothedParameter<T>**: Template class for single smoothed parameter
2. **SmoothedParameterArray<T, N>**: Container for multiple smoothed parameters
3. **SmoothedParametersMixin<Derived, N>**: Mixin class for instruments
4. **StandardParameters**: Common parameter IDs for consistency

### Design Philosophy

- **Mutable Instruments-inspired**: Professional eurorack module design
- **Dual smoothing modes**: Standard (50ms) for UI, Fast (0.1ms) for modulation
- **Zero-allocation**: No memory allocation in audio thread
- **Thread-safe**: Atomic parameter updates

## Integration Steps

### Step 1: Add Include

Add to your instrument's header file:

```cpp
#include "../../include/SmoothedParametersMixin.h"
```

### Step 2: Define Parameter Indices

Define parameter indices in your instrument class:

```cpp
class MyInstrument : public InstrumentDSP
{
public:
    // Parameter indices
    enum Parameters
    {
        PARAM_OSC Frequency = 0,
        PARAM_OSC_DETUNE,
        PARAM_OSC_LEVEL,
        PARAM_FILTER_CUTOFF,
        PARAM_FILTER_RESONANCE,
        PARAM_FILTER_DRIVE,
        PARAM_ENV_ATTACK,
        PARAM_ENV_DECAY,
        PARAM_ENV_SUSTAIN,
        PARAM_ENV_RELEASE,
        PARAM_MASTER_VOLUME,
        PARAM_PITCH_BEND_RANGE,
        PARAM_COUNT
    };

    // Rest of class...
};
```

### Step 3: Add Smoothed Parameters Member

Add smoothed parameters storage:

```cpp
private:
    // Smoothed parameters (use array for multiple params)
    SchillingerEcosystem::DSP::SmoothedParameterArray<float, PARAM_COUNT> smoothedParams_;

    // Or use individual parameters for simpler instruments
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedCutoff_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedResonance_;
```

### Step 4: Initialize in prepare()

Call prepare in your instrument's prepare() method:

```cpp
bool MyInstrument::prepare(double sampleRate, int blockSize)
{
    // Prepare smoothed parameters
    smoothedParams_.prepare(sampleRate, blockSize);

    // Or individual parameters
    smoothedCutoff_.prepare(sampleRate, blockSize);
    smoothedResonance_.prepare(sampleRate, blockSize);

    // Rest of preparation...
    return true;
}
```

### Step 5: Update setParameter()

Modify setParameter() to use smoothed values:

```cpp
void MyInstrument::setParameter(const char* paramId, float value)
{
    if (strcmp(paramId, "cutoff") == 0)
    {
        params_.filterCutoff = value;
        smoothedParams_.set(PARAM_FILTER_CUTOFF, value);
    }
    else if (strcmp(paramId, "resonance") == 0)
    {
        params_.filterResonance = value;
        smoothedParams_.set(PARAM_FILTER_RESONANCE, value);
    }
    // ... other parameters
}
```

### Step 6: Use Smoothed Values in process()

Replace direct parameter access with smoothed values:

```cpp
void MyInstrument::process(float** outputs, int numChannels, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        // Get smoothed parameter values
        float cutoff = smoothedParams_.getSmoothed(PARAM_FILTER_CUTOFF);
        float resonance = smoothedParams_.getSmoothed(PARAM_FILTER_RESONANCE);
        float drive = smoothedParams_.getSmoothed(PARAM_FILTER_DRIVE);

        // Use smoothed values in DSP
        filter.setCutoff(cutoff);
        filter.setResonance(resonance);
        filter.setDrive(drive);

        // Process sample
        float sample = oscillator.process();
        sample = filter.process(sample);

        outputs[0][i] = sample;
        outputs[1][i] = sample;
    }
}
```

### Step 7: Handle Preset Changes

Use setImmediate() for preset changes to bypass smoothing:

```cpp
bool MyInstrument::loadPreset(const char* jsonData)
{
    // Parse JSON and set parameters
    float cutoff = parseCutoff(jsonData);
    float resonance = parseResonance(jsonData);

    // Use immediate setting for preset changes
    smoothedParams_.setImmediate(PARAM_FILTER_CUTOFF, cutoff);
    smoothedParams_.setImmediate(PARAM_FILTER_RESONANCE, resonance);

    return true;
}
```

## Instrument-Specific Integration

### 1. LOCAL_GAL (Acid Synthesizer)

**Priority Parameters:**
- Filter cutoff (hollow parameter)
- Filter resonance (bite parameter)
- Filter drive (growl parameter)
- Oscillator detune (rubber parameter)
- Envelope times (ADSR)

**Integration Example:**

```cpp
// In LocalGalPureDSP.h
class LocalGalPureDSP : public InstrumentDSP
{
private:
    SchillingerEcosystem::DSP::SmoothedParameterArray<float, 32> smoothedParams_;

    enum SmoothedParams
    {
        SMOOTH_FILTER_CUTOFF = 0,
        SMOOTH_FILTER_RESONANCE,
        SMOOTH_FILTER_DRIVE,
        SMOOTH_OSC_DETUNE,
        SMOOTH_ENV_ATTACK,
        SMOOTH_ENV_DECAY,
        SMOOTH_ENV_SUSTAIN,
        SMOOTH_ENV_RELEASE,
        SMOOTH_MASTER_VOLUME
    };
};

// In process()
float cutoff = smoothedParams_.getSmoothed(SMOOTH_FILTER_CUTOFF);
filter.setCutoff(cutoff * 20000.0); // Convert normalized to Hz
```

### 2. Nex Synth (FM Synthesizer)

**Priority Parameters:**
- Operator frequencies (all 5 operators)
- Operator modulation indices
- Operator output levels
- Envelope times (all operators)
- Master volume

**Integration Example:**

```cpp
// In NexSynthDSP.h
class NexSynthDSP : public InstrumentDSP
{
private:
    // Per-operator smoothed parameters
    struct SmoothedOperatorParams
    {
        SchillingerEcosystem::DSP::SmoothedParameter<float> ratio;
        SchillingerEcosystem::DSP::SmoothedParameter<float> detune;
        SchillingerEcosystem::DSP::SmoothedParameter<float> modulationIndex;
        SchillingerEcosystem::DSP::SmoothedParameter<float> outputLevel;
        SchillingerEcosystem::DSP::SmoothedParameter<float> attack;
        SchillingerEcosystem::DSP::SmoothedParameter<float> decay;
        SchillingerEcosystem::DSP::SmoothedParameter<float> sustain;
        SchillingerEcosystem::DSP::SmoothedParameter<float> release;
    };

    std::array<SmoothedOperatorParams, 5> smoothedOperators_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedMasterVolume_;
};
```

### 3. Sam Sampler

**Priority Parameters:**
- Sample playback rate (pitch)
- Filter cutoff
- Filter resonance
- Amplitude envelope times
- Effects mix (reverb, delay, drive)

**Integration Example:**

```cpp
// In SamSamplerDSP.h
class SamSamplerDSP : public InstrumentDSP
{
private:
    SchillingerEcosystem::DSP::SmoothedParameterArray<float, 24> smoothedParams_;

    enum SmoothedParams
    {
        SMOOTH_BASE_PITCH = 0,
        SMOOTH_FILTER_CUTOFF,
        SMOOTH_FILTER_RESONANCE,
        SMOOTH_ENV_ATTACK,
        SMOOTH_ENV_DECAY,
        SMOOTH_ENV_SUSTAIN,
        SMOOTH_ENV_RELEASE,
        SMOOTH_REVERB_MIX,
        SMOOTH_DELAY_MIX,
        SMOOTH_DRIVE,
        SMOOTH_MASTER_VOLUME
    };
};
```

### 4. Giant Instruments (Strings, Drums, Horns, Voice, Percussion)

**Priority Parameters:**
- Scale parameters (scaleMeters, massBias)
- Gesture parameters (force, speed, contactArea, roughness)
- Environment parameters (distance, roomSize)
- Filter parameters (if applicable)
- Envelope times

**Integration Example:**

```cpp
// In AetherGiantBase.h (shared by all giant instruments)
class AetherGiantBase
{
protected:
    // Smoothed giant physics parameters
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedScaleMeters_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedMassBias_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedAirLoss_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedForce_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedSpeed_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedContactArea_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedRoughness_;
};

// In prepare()
void prepareGiantBase(double sampleRate)
{
    smoothedScaleMeters_.prepare(sampleRate, blockSize);
    smoothedMassBias_.prepare(sampleRate, blockSize);
    // ... etc
}

// In process()
float scale = smoothedScaleMeters_.getSmoothed();
float force = smoothedForce_.getSmoothed();
// Apply to physics calculations
```

### 5. Drum Machine

**Priority Parameters:**
- Tempo (for swing timing)
- Swing amount
- Per-track volumes
- Voice parameters (pitch, decay, tone for each drum)
- Master volume

**Integration Example:**

```cpp
// In DrumMachinePureDSP.h
class DrumMachinePureDSP : public InstrumentDSP
{
private:
    // Smoothed global parameters
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedTempo_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedSwing_;
    SchillingerEcosystem::DSP::SmoothedParameter<float> smoothedMasterVolume_;

    // Smoothed track volumes
    SchillingerEcosystem::DSP::SmoothedParameterArray<float, 16> smoothedTrackVolumes_;

    // Smoothed voice parameters for each drum type
    struct SmoothedDrumVoice
    {
        SchillingerEcosystem::DSP::SmoothedParameter<float> pitch;
        SchillingerEcosystem::DSP::SmoothedParameter<float> decay;
        SchillingerEcosystem::DSP::SmoothedParameter<float> tone;
    };

    SmoothedDrumVoice smoothedKick_;
    SmoothedDrumVoice smoothedSnare_;
    SmoothedDrumVoice smoothedHiHat_;
    // ... etc for other voices
};
```

## Testing

### Unit Tests

Each instrument should have tests for:

1. **No zipper noise on rapid parameter changes**
   - Automate parameter at audio rate
   - Measure signal continuity
   - Check for discontinuities

2. **Smoothing time is appropriate**
   - Measure time to reach target
   - Verify ~50ms for standard smoothing
   - Verify ~0.1ms for fast smoothing

3. **Immediate setting works for presets**
   - Load preset
   - Verify immediate parameter change
   - No audible artifacts

### Example Test

```cpp
TEST_CASE("LocalGal filter smoothing prevents zipper noise", "[instrument][localgal]")
{
    LocalGalPureDSP synth;
    synth.prepare(48000.0, 512);

    // Set initial cutoff
    synth.setParameter("cutoff", 0.5f);

    // Rapid automation
    std::vector<float> audio;
    for (int i = 0; i < 1000; ++i)
    {
        synth.setParameter("cutoff", static_cast<float>(i) / 1000.0f);
        float sample = synth.processSample();
        audio.push_back(sample);
    }

    // Check for discontinuities
    float maxDelta = 0.0f;
    for (size_t i = 1; i < audio.size(); ++i)
    {
        float delta = std::abs(audio[i] - audio[i-1]);
        maxDelta = std::max(maxDelta, delta);
    }

    // Should be smooth (no zipper noise)
    REQUIRE(maxDelta < 0.1f);
}
```

## Best Practices

### DO:
- Use standard smoothing (50ms) for UI parameters
- Use fast smoothing (0.1ms) for modulation sources
- Use setImmediate() for preset changes
- Prepare smoothed parameters in prepare()
- Use smoothed values in audio processing loop

### DON'T:
- Don't allocate memory in process()
- Don't use smoothed parameters for event triggers
- Don't smooth MIDI note events
- Don't bypass smoothing for envelope generators

## Performance Considerations

### Memory Usage

- SmoothedParameter<float>: ~32 bytes per parameter
- SmoothedParameterArray<32>: ~1KB total
- Negligible impact on overall instrument memory

### CPU Usage

- getSmoothed(): ~5-10 CPU cycles per call
- Typical instrument with 20 parameters: ~100-200 cycles/block
- Negligible impact on overall DSP performance

### Optimization Tips

1. **Batch processing**: Call getSmoothed() once per sample, not per voice
2. **Skip when inactive**: Only smooth active parameters
3. **Use arrays**: More efficient than individual parameters

## Troubleshooting

### Problem: Parameters still have zipper noise

**Solutions:**
- Verify getSmoothed() is called in process loop
- Check that set() is called from setParameter()
- Ensure prepare() was called with correct sample rate

### Problem: Smoothing is too slow/fast

**Solutions:**
- Adjust smooth time in prepare() (default 50ms)
- Use getFast() for modulation signals
- Use setImmediate() for preset changes

### Problem: Parameters don't update

**Solutions:**
- Verify parameter ID mapping is correct
- Check that setParameter() is being called
- Ensure smoothedParams_.set() is called with correct index

## Migration Checklist

For each instrument:

- [ ] Add #include for SmoothedParametersMixin.h
- [ ] Define parameter enum
- [ ] Add smoothed parameters member
- [ ] Initialize in prepare()
- [ ] Update setParameter() to use smoothed values
- [ ] Update process() to use getSmoothed()
- [ ] Handle preset changes with setImmediate()
- [ ] Add tests for zipper noise prevention
- [ ] Verify audio quality
- [ ] Update documentation

## References

- Mutable Instruments design philosophy: https://mutable-instruments.net/
- JUCE SmoothedValue documentation: https://docs.juce.com/master/classSmoothedValue.html
- Schillinger DSP architecture: /Users/bretbouchard/apps/schill/instrument_juce/include/dsp/

## Support

For questions or issues:
1. Check this guide first
2. Review test files in /tests/dsp/
3. Examine integration examples in this document
4. Consult JUCE documentation for SmoothedValue

## Changelog

### Version 1.0 (2026-01-09)
- Initial release
- Support for float and double precision
- Dual smoothing modes (standard/fast)
- Thread-safe parameter updates
- Comprehensive test suite
- Integration examples for all 9 instruments
