# MPE & Microtonal Integration Guide

**Date:** 2025-01-08
**Purpose:** Quick guide for adding MPE and microtonal support to existing synths

---

## Quick Start: 3 Steps to Add MPE + Microtonal

### Step 1: Include Headers

In your plugin processor, add:

```cpp
#include "plugin_templates/BaseInstrumentProcessor.h"
#include "dsp/MPEUniversalSupport.h"
#include "dsp/MicrotonalTuning.h"
```

### Step 2: Enable in Constructor

```cpp
class MySynthPluginProcessor : public BaseInstrumentProcessor {
public:
    MySynthPluginProcessor()
        : BaseInstrumentProcessor(/* ... */)
    {
        // Enable MPE (choose appropriate level)
        MPEGestureMapping mapping;

        switch (myMPELevel) {
            case Full:
                mapping.pressureToForce = 1.0f;
                mapping.timbreToSpeed = 0.5f;
                mapping.pitchBendToRoughness = 0.3f;
                break;

            case Partial:
                mapping.pressureToForce = 0.8f;
                mapping.timbreToContactArea = 0.5f;
                mapping.pitchBendToRoughness = 0.1f;
                break;

            case Lite:
                mapping.pressureToForce = 0.5f;
                // timbre and pitch bend not used
                break;
        }

        enableMPE(myMPELevel, mapping);

        // Enable microtonal tuning
        enableMicrotonal();
    }
};
```

### Step 3: Use in processBlock

```cpp
void MySynthPluginProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                         juce::MidiBuffer& midiMessages)
{
    // Process MPE first (before note handling)
    processMPE(midiMessages);

    // Now handle MIDI as normal
    for (const auto& metadata : midiMessages) {
        const auto* msg = metadata.getMessage();

        if (msg->isNoteOn()) {
            int note = msg->getNoteNumber();
            int channel = msg->getChannel();
            float velocity = msg->getVelocity() / 127.0f;

            // Get MPE gestures if available
            auto gestures = getMPEGestures(note, channel);

            // Apply to your voice
            // gestures.force - excitation energy
            // gestures.speed - modulation speed
            // gestures.contactArea - filter/brightness
            // gestures.roughness - texture

            startVoice(note, velocity, gestures);
        }
        // ... rest of MIDI handling
    }

    // For microtonal, use midiToFrequency() instead of standard calculation
    // float freq = midiToFrequency(noteNumber);
}
```

---

## MPE Level Guidelines

### Full MPE ✅
**Use for:** Expressive, melodic instruments

**Instruments:**
- KaneMarco Aether (Strings)
- KaneMarco Aether String
- KaneMarco (Virtual Analog)
- Giant Strings, Voice, Horns

**Mapping:**
```cpp
mapping.pressureToForce = 1.0f;        // Excitation energy
mapping.timbreToSpeed = 0.5f;          // Modulation/LFO speed
mapping.pitchBendToRoughness = 0.3f;   // Detune/textures
```

### Partial MPE 🟡
**Use for:** Gesture-focused, not primarily melodic

**Instruments:**
- LOCAL_GAL (Acid)
- DrumMachine
- Giant Drums, Giant Percussion

**Mapping:**
```cpp
mapping.pressureToForce = 0.8f;        // Strike/accent amount
mapping.timbreToContactArea = 0.5f;    // Brightness/decay
mapping.pitchBendToRoughness = 0.1f;   // Minimal (mostly for tuned drums)
```

### MPE-Lite 🟠
**Use for:** Limited MPE utility

**Instruments:**
- SamSampler (samples are baked, but can modulate filter/amp)

**Mapping:**
```cpp
mapping.pressureToForce = 0.5f;        // Filter cutoff or amplitude
mapping.timbreToSpeed = 0.0f;           // Not used
mapping.pitchBendToRoughness = 0.0f;   // Not used (samples fixed pitch)
```

---

## Microtonal Tuning Guide

### Recommended Scales Per Instrument

#### Strings Instruments
```cpp
// Historical string tunings
tuningManager->setJustIntonation5Limit();  // Pure thirds
tuningManager->setMeantoneQuarterComma();   // Renaissance
tuningManager->setPythagorean();            // Medieval
```

#### Virtual Analog
```cpp
// All temperaments work well
tuningManager->set19TET();   // Popular microtonal
tuningManager->set31TET();   // Very popular
tuningManager->set24TET();   // Quarter tones
```

#### FM Synthesis (NexSynth)
```cpp
// Experimental scales
tuningManager->setBohlenPierce();  // 13-TET tritave
tuningManager->setSpectral();       // Inharmonic
tuningManager->setWilsonFiveLimit(); // Wilson's 5-limit
```

#### Acid Synth (LOCAL_GAL)
```cpp
// Quarter tones work well for acid
tuningManager->set24TET();   // Quarter tones
```

#### Samplers
```cpp
// Default to 12-TET, but can map samples to other scales
tuningManager->set12TET();
```

#### Drums/Percussion
```cpp
// Tuned percussion scales
tuningManager->setIndianShruti();   // 22 shruti
tuningManager->setThai();           // 7-tone equal
```

---

## Per-Instrument Integration Checklist

### KaneMarco Aether (Strings) ✅ Full MPE
- [x] MPE already implemented
- [x] Microtonal already implemented
- [x] **Status: COMPLETE**

### KaneMarco Aether String ✅ Full MPE
- [x] MPE already implemented
- [x] Microtonal already implemented
- [x] **Status: COMPLETE**

### KaneMarco (Virtual Analog) ⚠️ Needs Integration
- [ ] Add `#include "dsp/MPEUniversalSupport.h"`
- [ ] Add `#include "dsp/MicrotonalTuning.h"`
- [ ] Call `enableMPE(Full)` in constructor
- [ ] Call `enableMicrotonal()` in constructor
- [ ] Use `getMPEGestures()` in voice handling
- [ ] Use `midiToFrequency()` in oscillators

### LOCAL_GAL (Acid) ⚠️ Needs Partial MPE
- [ ] Add headers
- [ ] Call `enableMPE(Partial)` with acid-specific mapping
- [ ] Call `enableMicrotonal()`
- [ ] Map pressure to accent
- [ ] Map timbre to filter brightness

### NexSynth (FM) ⚠️ Needs Configurable MPE
- [ ] Add headers
- [ ] Add MPE enable parameter (per-preset)
- [ ] Call `enableMPE()` with preset-specific mapping
- [ ] Call `enableMicrotonal()`
- [ ] Experimental scales work well

### SamSampler ⚠️ Needs MPE-Lite
- [ ] Add headers
- [ ] Call `enableMPE(Lite)` - pressure to filter/amp only
- [ ] Call `enableMicrotonal()`
- [ ] No pitch bend (samples are baked)

### DrumMachine ⚠️ Needs Partial MPE
- [ ] Add headers
- [ ] Call `enableMPE(Partial)` with drum mapping
- [ ] Call `enableMicrotonal()`
- [ ] Per-drum articulation

### FilterGate ❌ No MPE
- [ ] It's an effect, not an instrument
- [ ] Skip MPE

### Giant Instruments ✅ Full MPE
- [x] All already implemented
- [x] **Status: COMPLETE**

---

## Testing Checklist

### MPE Testing
- [ ] Test with Roli Seaboard
- [ ] Test with LinnStrument
- [ ] Test with K-Board
- [ ] Test with regular MIDI (should work normally)
- [ ] Verify per-note independence
- [ ] Verify gesture smoothing (no zipper noise)

### Microtonal Testing
- [ ] Test 12-TET (standard)
- [ ] Test 19-TET
- [ ] Test 31-TET
- [ ] Test Just Intonation 5-limit
- [ ] Test Meantone quarter-comma
- [ ] Test Scala file loading
- [ ] Verify pitch accuracy (use tuner)

### DAW Testing
- [ ] Logic Pro (AU)
- [ ] Ableton Live (VST3)
- [ ] Reaper (VST3)
- [ ] Bitwig (VST3)
- [ ] GarageBand (AU)

---

## Common Patterns

### Pattern 1: Apply MPE Gestures to Voice Parameters

```cpp
struct VoiceParams {
    float frequency;
    float velocity;
    float cutoff;
    float resonance;
    float lfoSpeed;
    float vibratoDepth;
};

VoiceParams getVoiceParams(int note, int channel, float baseVelocity)
{
    VoiceParams params;

    // Get MPE gestures
    auto gestures = getMPEGestures(note, channel);

    // Apply gestures to parameters
    params.frequency = midiToFrequency(note);
    params.velocity = baseVelocity * (0.5f + gestures.force * 0.5f);  // Velocity modified by pressure
    params.cutoff = gestures.contactArea * 20000.0f;  // Contact area controls filter
    params.lfoSpeed = gestures.speed * 20.0f;  // Speed controls LFO
    params.vibratoDepth = gestures.roughness * 50.0f;  // Roughness controls vibrato

    return params;
}
```

### Pattern 2: MPE Preset Toggle (for NexSynth)

```cpp
// Add parameter to APVTS
auto mpeEnabledParam = std::make_unique<juce::AudioParameterBool>(
    "mpe_enabled", "MPE Enabled", false);

// In processBlock
void NexSynthProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                     juce::MidiBuffer& midiMessages)
{
    // Check if MPE is enabled for current preset
    if (mpeEnabledParam->get()) {
        processMPE(midiMessages);
    }

    // ... rest of processing
}
```

### Pattern 3: Scale-Specific Presets

```cpp
// Create presets for different tunings
void createMicrotonalPresets()
{
    // 12-TET default
    addPreset("Default (12-TET)", createPresetState(12));

    // 19-TET
    addPreset("19-TET Microtonal", createPresetState(19));

    // Just Intonation
    MicrotonalTuning jiTuning;
    jiTuning.system = TuningSystem::JustIntonation;
    addPreset("Just Intonation", createPresetState(jiTuning));
}
```

---

## Troubleshooting

### Issue: MPE not working
**Solution:**
- Check `supportsMPE()` returns true
- Verify `processMPE()` is called before note handling
- Check MPE zone is configured in DAW
- Test with MPE controller

### Issue: Wrong pitch with microtonal
**Solution:**
- Verify `midiToFrequency()` is being used
- Check tuning is valid: `getTuningManager()->getTuning().isValid()`
- Verify tuning was loaded correctly
- Test with known scale (12-TET) as baseline

### Issue: Zipper noise on MPE
**Solution:**
- Increase smoothing times in `MPEGestureMapping`
- Check `updateSmoothing()` is called every block
- Verify sample rate is correct

### Issue: Presets don't save MPE/microtonal state
**Solution:**
- Check `getStateInformation()` includes MPE/microtonal elements
- Check `setStateInformation()` restores MPE/microtonal elements
- Verify XML has correct structure

---

## Resources

- **MPE Guide:** `docs/MPE_Guide/`
- **Microtonal Guide:** `docs/Microtonal_Guide/`
- **Standardization Plan:** `docs/SYNTH_STANDARDIZATION_PLAN.md`
- **Base Template:** `include/plugin_templates/BaseInstrumentProcessor.h`
- **Giant Instruments:** `instruments/kane_marco/docs/plans/GIANT_INSTRUMENT_IMPLEMENTATION.md`
