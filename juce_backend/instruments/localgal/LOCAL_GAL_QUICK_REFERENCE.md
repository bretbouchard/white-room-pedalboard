# LOCAL_GAL Quick Reference Guide

## Overview

LOCAL_GAL is a 16-voice polyphonic synthesizer with a 5D Feel Vector control system, now enhanced with professional-grade filter and oscillator technologies inspired by Mutable Instruments.

## Key Features

### 🎵 Sound Generation
- **Oscillators:** Sine, Sawtooth (bandlimited), Square, Triangle, Noise
- **Filter:** TPT State Variable Filter with 4 types (LP, HP, BP, Notch)
- **Envelope:** ADSR with velocity sensitivity
- **Polyphony:** 16 voices with voice stealing

### 🎛️ Feel Vector Control (5D)
- **Rubber** (0.0-1.0): Glide, oscillator offset, timing variation
- **Bite** (0.0-1.0): Filter resonance, envelope amount, brightness
- **Hollow** (0.0-1.0): Filter cutoff, warm character, fundamental
- **Growl** (0.0-1.0): Filter drive, distortion, saturation
- **Wet** (0.0-1.0): Effects mix (reserved for future)

## Parameter Reference

### Oscillator Parameters
```cpp
setParameter("osc_waveform", value);  // 0=Sine, 1=Saw, 2=Square, 3=Triangle, 4=Noise
setParameter("osc_detune", value);    // Semitone detune (-12 to +12)
setParameter("osc_level", value);     // Oscillator level (0.0 to 1.0)
```

### Filter Parameters
```cpp
setParameter("filter_type", value);       // 0=LP, 1=HP, 2=BP, 3=Notch
setParameter("filter_cutoff", value);     // Normalized cutoff (0.0 to 1.0)
setParameter("filter_resonance", value);  // Resonance (0.0 to 1.0)
setParameter("filter_drive", value);      // Drive/soft saturation (1.0 to 3.0)
```

### Envelope Parameters
```cpp
setParameter("env_attack", value);   // Attack time (0.0 to 1.0 seconds)
setParameter("env_decay", value);    // Decay time (0.0 to 1.0 seconds)
setParameter("env_sustain", value);  // Sustain level (0.0 to 1.0)
setParameter("env_release", value);  // Release time (0.0 to 1.0 seconds)
```

### Feel Vector Parameters
```cpp
setParameter("feel_rubber", value);  // Glide & timing (0.0 to 1.0)
setParameter("feel_bite", value);    // Resonance & brightness (0.0 to 1.0)
setParameter("feel_hollow", value);  // Cutoff & warmth (0.0 to 1.0)
setParameter("feel_growl", value);   // Drive & saturation (0.0 to 1.0)
setParameter("feel_wet", value);     // Effects mix (0.0 to 1.0)
```

### Global Parameters
```cpp
setParameter("master_volume", value);  // Master volume (0.0 to 1.0)
```

## Usage Examples

### Basic Note On/Off
```cpp
#include "dsp/LocalGalPureDSP.h"

using namespace DSP;

// Create instrument
auto synth = std::make_unique<LocalGalPureDSP>();
synth->prepare(48000.0, 512);

// Note on
ScheduledEvent noteOn;
noteOn.type = ScheduledEvent::NOTE_ON;
noteOn.data.note.midiNote = 60;  // Middle C
noteOn.data.note.velocity = 0.8f;
synth->handleEvent(noteOn);

// Process audio
float* outputs[2];
float leftBuffer[512], rightBuffer[512];
outputs[0] = leftBuffer;
outputs[1] = rightBuffer;
synth->process(outputs, 2, 512);

// Note off
ScheduledEvent noteOff;
noteOff.type = ScheduledEvent::NOTE_OFF;
noteOff.data.note.midiNote = 60;
synth->handleEvent(noteOff);
```

### Feel Vector Presets
```cpp
// Apply preset feel vector
synth->applyFeelVectorPreset("Bite");  // High resonance, aggressive
synth->applyFeelVectorPreset("Hollow");  // Warm, mellow
synth->applyFeelVectorPreset("Growl");  // Saturated, distorted
synth->applyFeelVectorPreset("Rubber");  // Smooth, evolving

// Available presets: "Init", "Rubber", "Bite", "Hollow", "Growl"
```

### Custom Feel Vector
```cpp
FeelVector fv;
fv.rubber = 0.8f;  // Long glide, slow evolution
fv.bite = 0.9f;    // Maximum resonance
fv.hollow = 0.3f;   // Bright, thin
fv.growl = 0.7f;    // Heavy saturation
synth->setFeelVector(fv);
```

### Morphing Between Feel Vectors
```cpp
FeelVector start = FeelVector::getPreset("Hollow");
FeelVector end = FeelVector::getPreset("Bite");

// Smooth morph over 500ms
synth->morphToFeelVector(end, 500.0);
```

### Filter Sweep Example
```cpp
// Sawtooth with filter sweep
synth->setParameter("osc_waveform", 1.0f);  // Sawtooth
synth->setParameter("filter_type", 0.0f);   // Lowpass
synth->setParameter("filter_resonance", 0.8f); // High resonance

// Sweep from low to high
for (int i = 0; i < 100; ++i) {
    float cutoff = static_cast<float>(i) / 100.0f;
    synth->setParameter("filter_cutoff", cutoff);
    // Process audio block...
}
```

### Bandlimited Sawtooth (Clean High End)
```cpp
// The sawtooth oscillator is automatically bandlimited
// No aliasing even at high frequencies!
synth->setParameter("osc_waveform", 1.0f);  // Bandlimited Sawtooth
synth->setParameter("filter_cutoff", 1.0f);  // Filter fully open
synth->setParameter("filter_resonance", 0.0f); // No resonance

// Play high notes - still clean!
ScheduledEvent noteOn;
noteOn.type = ScheduledEvent::NOTE_ON;
noteOn.data.note.midiNote = 84;  // High C (5 octaves above middle C)
noteOn.data.note.velocity = 0.8f;
synth->handleEvent(noteOn);
```

## Sound Design Tips

### Acid Bass Lines
```cpp
FeelVector acid;
acid.bite = 0.95f;   // Maximum resonance for squelch
acid.hollow = 0.6f;  // Medium cutoff
acid.growl = 0.5f;   // Some drive
acid.rubber = 0.2f;  // Fast envelope
synth->setFeelVector(acid);
synth->setParameter("osc_waveform", 1.0f);  // Sawtooth
synth->setParameter("filter_type", 0.0f);   // Lowpass
```

### Warm Pads
```cpp
FeelVector pad;
pad.bite = 0.3f;   // Low resonance
pad.hollow = 0.4f;  // Low-mid cutoff
pad.growl = 0.2f;   // Clean
pad.rubber = 0.8f;  // Slow attack/release
synth->setFeelVector(pad);
synth->setParameter("osc_waveform", 0.0f);  // Sine
synth->setParameter("env_attack", 0.3f);    // Slow attack
synth->setParameter("env_release", 0.5f);   // Long release
```

### Aggressive Leads
```cpp
FeelVector lead;
lead.bite = 0.9f;   // High resonance
lead.hollow = 0.8f;  // Bright
lead.growl = 0.8f;   // Heavily saturated
lead.rubber = 0.3f;  // Fast envelope
synth->setFeelVector(lead);
synth->setParameter("osc_waveform", 1.0f);  // Sawtooth
synth->setParameter("filter_drive", 2.0f);  // Extra drive
```

### Ambient Textures
```cpp
FeelVector ambient;
ambient.bite = 0.2f;   // Minimal resonance
ambient.hollow = 0.3f;  // Dark, mellow
ambient.growl = 0.1f;   // Very clean
ambient.rubber = 0.9f;  // Very slow evolution
synth->setFeelVector(ambient);
synth->setParameter("osc_waveform", 3.0f);  // Triangle
synth->setParameter("env_attack", 0.8f);    // Very slow attack
synth->setParameter("env_decay", 0.5f);
synth->setParameter("env_sustain", 0.7f);
synth->setParameter("env_release", 1.0f);   // Long release
```

## Technical Details

### TPT State Variable Filter
- **Topology:** Zero-delay feedback (ZDF)
- **Accuracy:** Pre-warped frequency for stability
- **Resonance:** Self-oscillation capable at high settings
- **Types:** LP, HP, BP, Notch (simultaneous outputs)

### Bandlimited Sawtooth Oscillator
- **Technique:** minBLEP (minimum Bandlimited stEP)
- **Aliasing:** Suppressed above 15kHz
- **Table:** Windowed sinc with Blackman window
- **Size:** 128 samples (8 zero-crossings, 16 oversampling)

### Voice Architecture
- **Polyphony:** 16 voices
- **Stealing:** Oldest voice stolen when all active
- **Priority:** Note-on replaces same note if already playing
- **Efficiency:** ~50 CPU cycles per voice per sample

## Preset System

### Saving Presets
```cpp
char jsonBuffer[4096];
if (synth->savePreset(jsonBuffer, sizeof(jsonBuffer))) {
    printf("Preset saved: %s\n", jsonBuffer);
}
```

### Loading Presets
```cpp
const char* presetData = "{\"osc_waveform\": 1.0, \"filter_cutoff\": 0.5, ...}";
if (synth->loadPreset(presetData)) {
    printf("Preset loaded\n");
}
```

## Performance Tips

1. **Reuse Voices:** Keep notes playing instead of rapid retriggering
2. **Filter Efficiency:** Avoid rapid filter modulation if CPU is constrained
3. **Oscillator Choice:** Sine is cheapest, sawtooth is most expensive
4. **Polyphony:** Reduce max voices if CPU is limited

## Troubleshooting

### No Sound Output
- Check master_volume parameter (try 0.8)
- Verify note-on event is being sent
- Confirm oscillator is enabled (default)
- Check filter isn't fully closed (filter_cutoff > 0.0)

### Clicks/Pops
- Use smooth parameter changes (avoid jumps)
- Check envelope attack time (try 0.005 or higher)
- Verify filter resonance isn't too high (try < 0.95)

### Distortion
- Reduce filter drive (try 1.0)
- Lower master volume (try 0.5)
- Check growl parameter (try < 0.5)
- Verify multiple notes aren't stacking (check active voice count)

### High CPU Usage
- Reduce polyphony (max 16 voices)
- Use simpler waveforms (sine instead of sawtooth)
- Avoid rapid parameter modulation
- Check if too many notes are active simultaneously

## Version History

### v1.1.0 (January 9, 2026)
- ✅ Added TPT State Variable Filter
- ✅ Added Bandlimited Sawtooth Oscillator
- ✅ Improved filter resonance behavior
- ✅ Eliminated aliasing artifacts

### v1.0.0 (December 30, 2025)
- Initial release
- 5D Feel Vector control system
- 16-voice polyphony
- ADSR envelope with velocity sensitivity

---

**For more details, see:** `LOCAL_GAL_IMPROVEMENTS_REPORT.md`
