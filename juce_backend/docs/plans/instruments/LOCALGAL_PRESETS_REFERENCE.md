# LocalGalDSP Phase 3 - Quick Preset Reference

## Factory Presets (20 presets)

### Bass (4)
| # | Name | Wave | Cutoff | Resonance | Character |
|---|------|------|--------|-----------|-----------|
| 1 | Sub Bass | Sine | 150Hz | 0.3 | Deep sub, tight |
| 2 | Acid Bass | Saw | 1200Hz | 0.8 | 303 resonance |
| 3 | Deep Bass | Saw | 400Hz | 0.7 | Detuned +5st |
| 4 | Growling Bass | Saw | 800Hz | 0.6 | Heavy distortion |

### Leads (4)
| # | Name | Wave | Cutoff | Resonance | Character |
|---|------|------|--------|-----------|-----------|
| 5 | Brass Lead | Saw | 2500Hz | 0.8 | Bright brass |
| 6 | Screaming Lead | Square | 4000Hz | 0.9 | High resonance |
| 7 | FM Lead | Saw | 2000Hz | 0.5 | FM-like +7st |
| 8 | Solo Lead | Sine | 1800Hz | 0.4 | Clean vibrato |

### Pads (3)
| # | Name | Wave | Cutoff | Resonance | Character |
|---|------|------|--------|-----------|-----------|
| 9 | Warm Pad | Saw | 800Hz | 0.4 | Slow attack |
| 10 | Ethereal Pad | Saw | 1200Hz | 0.3 | Detuned +15st |
| 11 | Space Pad | Saw | 1500Hz | 0.4 | Unison +10st |

### Keys (3)
| # | Name | Wave | Cutoff | Resonance | Character |
|---|------|------|--------|-----------|-----------|
| 12 | Electric Piano | Tri | 2000Hz | 0.5 | Medium decay |
| 13 | Clavinet | Square | 3000Hz | 0.7 | Percussive |
| 14 | Organ | Sine | 2200Hz | 0.3 | Leslie-like |

### FX (3)
| # | Name | Wave | Cutoff | Resonance | Character |
|---|------|------|--------|-----------|-----------|
| 15 | Alien Texture | Noise | 1000Hz | 0.5 | Bandpass |
| 16 | Dark Ambience | Saw | 400Hz | 0.3 | Lowpass -5st |
| 17 | Glitch FX | Square | 1500Hz | 0.6 | Highpass |

### Experimental (3)
| # | Name | Wave | Cutoff | Resonance | Character |
|---|------|------|--------|-----------|-----------|
| 18 | Chaos Pad | Saw | 1000Hz | 0.7 | High LFO |
| 19 | Morphing Pad | Saw | 1500Hz | 0.5 | Morph target |
| 20 | Rhythmic Pattern | Square | 2000Hz | 0.6 | Pattern seq |

### Init (1)
| # | Name | Wave | Cutoff | Resonance | Character |
|---|------|------|--------|-----------|-----------|
| 21 | Init | Saw | 1000Hz | 0.7 | Default |

---

## Feel Vector Presets (6 presets)

| Name | Rubber | Bite | Hollow | Growl | Wet | Best For |
|------|--------|------|--------|-------|-----|----------|
| Warm | 0.7 | 0.3 | 0.2 | 0.1 | 0.0 | Warm pads |
| Bright | 0.2 | 0.8 | 0.9 | 0.4 | 0.0 | Bright leads |
| Soft | 0.9 | 0.2 | 0.3 | 0.1 | 0.2 | Soft ambient |
| Hard | 0.3 | 0.9 | 0.5 | 0.8 | 0.3 | Hard bass |
| Liquid | 0.8 | 0.4 | 0.6 | 0.3 | 0.5 | Flowing arpeggios |
| Crisp | 0.4 | 0.7 | 0.5 | 0.4 | 0.2 | Percussive sounds |

---

## Feel Vector Parameter Mapping

| Feel Vector | Target Parameter | Range |
|-------------|------------------|-------|
| rubber | osc1_detune | -6 to +6 semitones |
| bite | filter_resonance | 0 to 5 |
| hollow | filter_cutoff | 200Hz to 5200Hz |
| growl | (reserved for distortion) | - |
| wet | fx_reverb_mix | 0 to 1 |

---

## Waveform Types

| Value | Waveform |
|-------|----------|
| 0.0 | Sine |
| 1.0 | Sawtooth |
| 2.0 | Square |
| 3.0 | Triangle |
| 4.0 | Noise |

---

## Filter Types

| Value | Type |
|-------|------|
| 0 | Low Pass |
| 1 | High Pass |
| 2 | Band Pass |
| 3 | Notch |

---

## Usage Examples

### Load Factory Preset
```cpp
auto synth = std::make_unique<LocalGalDSP>();
synth->setCurrentProgram(0);  // Load first preset (Sub Bass)
```

### Apply Feel Vector Preset
```cpp
synth->applyFeelVectorPreset("Bright");  // Apply bright feel
```

### Get Preset Info
```cpp
std::string jsonPreset = synth->getPresetState();
LocalGalDSP::PresetInfo info = synth->getPresetInfo(jsonPreset);

std::cout << "Name: " << info.name << "\n";
std::cout << "Category: " << info.category << "\n";
std::cout << "Description: " << info.description << "\n";
```

### Validate Preset
```cpp
bool isValid = synth->validatePreset(jsonPreset);
if (!isValid) {
    // Handle invalid preset
}
```

### Custom Feel Vector
```cpp
FeelVector custom = {0.8f, 0.6f, 0.4f, 0.5f, 0.3f};
synth->setFeelVector(custom);
```

---

## Quick Start

1. **Initialize**: Create `LocalGalDSP` instance
2. **Prepare**: Call `prepareToPlay(48000.0, 512)`
3. **Load Preset**: `setCurrentProgram(0)` for Sub Bass
4. **Play**: Send MIDI note-on messages
5. **Morph**: Try different feel vector presets
6. **Save**: `getPresetState()` to save custom preset

---

**End of Quick Reference**
