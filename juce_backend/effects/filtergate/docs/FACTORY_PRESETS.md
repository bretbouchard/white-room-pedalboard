# FilterGate Factory Presets Reference

## Overview

FilterGate includes 21 factory presets covering a wide range of sonic possibilities, from subtle enhancements to extreme experimental textures. This document provides detailed information about each preset.

## Categories

- **Character** (3): Vintage, Modern, Minimal
- **Phaser** (3): Subtle Phaser, Deep Phaser, Dual Phaser
- **Filter** (1): Filter Sweep
- **Modulation** (2): Gate Trigger, Modulation Demo
- **Distortion** (2): Soft Drive, Hard Clip
- **Ambient** (1): Ambient Pad
- **Rhythm** (1): Funk Rhythm
- **Electronic** (1): Electronic
- **Bass** (1): Bass Enhancer
- **Vocal** (1): Vocal FX
- **Drums** (1): Drum Bus
- **Synth** (1): Synth Lead
- **Guitar** (1): Guitar FX
- **Experimental** (2): Experimental, Extreme Modulation

---

## Preset Details

### 1. Init

**Category**: Factory
**Description**: Clean default preset with all parameters at default values

**Key Settings**:
- Gate Threshold: 0.5 (50%)
- Phaser A Stages: 4
- Filter Model: SVF
- Filter Cutoff: 1000 Hz
- Mixer: Wet 100%, Dry 0%

**Use Case**: Starting point for creating custom sounds

---

### 2. Subtle Phaser

**Category**: Phaser
**Description**: Gentle 4-stage phaser with slow sweep, perfect for subtle movement

**Key Settings**:
- Phaser A Stages: 4
- Phaser A Rate: 0.3 Hz
- Phaser A Depth: 0.4
- Phaser A Feedback: 0.3
- Phaser A Center: 800 Hz
- Phaser A Spread: 1500 Hz
- Phaser A Mix: 30%
- Mixer: Wet 50%, Dry 50%

**Use Case**: Adding gentle movement to pads, vocals, or guitars without overwhelming the source

---

### 3. Deep Phaser

**Category**: Phaser
**Description**: Classic 8-stage sweeping phaser with rich resonance

**Key Settings**:
- Phaser A Stages: 8
- Phaser A Rate: 0.5 Hz
- Phaser A Depth: 0.8
- Phaser A Feedback: 0.7
- Phaser A Center: 1200 Hz
- Phaser A Spread: 3000 Hz
- Phaser A Mix: 70%
- Mixer: Wet 80%, Dry 20%

**Use Case**: Classic sweeping phaser effect for guitars, synths, and drums

---

### 4. Filter Sweep

**Category**: Filter
**Description**: Automatic filter sweep triggered by envelope follower

**Key Settings**:
- Filter Cutoff: 500 Hz
- Filter Resonance: 0.7
- Envelope Follower Attack: 10 ms
- Envelope Follower Release: 200 ms
- Modulation: ENV_FOLLOWER → FILTER_CUTOFF (Amount: 0.8, Slew: 10 ms)
- Mixer: Wet 70%, Dry 30%

**Use Case**: Dynamic filter that responds to input level, great for rhythmic tracks

---

### 5. Gate Trigger

**Category**: Modulation
**Description**: Gate triggers envelopes for dynamic filter modulation

**Key Settings**:
- Gate Threshold: 0.4
- Gate Attack: 5 ms
- Gate Release: 100 ms
- Envelope 1: ADSR (Attack: 20 ms, Decay: 200 ms, Sustain: 0.6, Release: 300 ms)
- Filter Cutoff: 800 Hz
- Filter Resonance: 0.5
- Modulation: ENV1 → FILTER_CUTOFF (Amount: 0.7, Slew: 5 ms)

**Use Case**: Envelope-controlled filter for dynamic synth leads and bass

---

### 6. Modulation Demo

**Category**: Modulation
**Description**: Showcases various modulation sources and destinations

**Key Settings**:
- Gate Threshold: 0.3
- Envelope 1: ADSR (Attack: 50 ms, Decay: 300 ms, Sustain: 0.5, Release: 400 ms)
- Envelope 2: ADSR (Attack: 30 ms, Decay: 200 ms, Sustain: 0.7, Release: 250 ms)
- Filter Cutoff: 1000 Hz, Resonance: 0.6
- Phaser A: Rate 0.6 Hz, Depth 0.6, Mix 0.5
- Modulation Routes:
  - ENV1 → FILTER_CUTOFF (0.8, 10 ms)
  - ENV1 → FILTER_RESONANCE (0.5, 15 ms)
  - ENV2 → PHASER_A_CENTER (0.6, 8 ms)
  - ENV_FOLLOWER → FILTER_CUTOFF (0.4, 20 ms)

**Use Case**: Learning tool for understanding FilterGate's modulation capabilities

---

### 7. Dual Phaser

**Category**: Phaser
**Description**: Two independent phasers in stereo configuration

**Key Settings**:
- Phaser A: 6 stages, Rate 0.4 Hz, Depth 0.7, Feedback 0.6, Center 1000 Hz, Spread 2500 Hz
- Phaser B: 4 stages, Rate 0.6 Hz, Depth 0.5, Feedback 0.4, Center 1500 Hz, Spread 2000 Hz
- Dual Phaser Routing: STEREO
- LFO Phase Offset: 90°
- Mixer: Wet 70%

**Use Case**: True stereo phasing for wide stereo imaging

---

### 8. Soft Drive

**Category**: Distortion
**Description**: Warm tube-like saturation with soft clipping

**Key Settings**:
- Pre-Drive Type: SOFT_CLIP
- Pre-Drive Drive: 0.5
- Pre-Drive Output: 1.0
- Pre-Drive Tone: 0.6
- Post-Drive Type: SOFT_CLIP
- Post-Drive Drive: 0.2, Output: 1.0
- Mixer: Wet 60%, Dry 40%

**Use Case**: Adding warmth and subtle saturation to sterile digital recordings

---

### 9. Hard Clip

**Category**: Distortion
**Description**: Brutal hard clipping for aggressive distortion

**Key Settings**:
- Pre-Drive Type: HARD_CLIP
- Pre-Drive Drive: 0.8, Output: 0.7
- Post-Drive Type: HARD_CLIP
- Post-Drive Drive: 0.3, Output: 0.8
- Mixer: Wet 100%, Dry 0%

**Use Case**: Aggressive distortion for guitars, drums, or sound design

---

### 10. Vintage

**Category**: Character
**Description**: Classic 70s phaser with warm drive

**Key Settings**:
- Phaser A: 4 stages, Rate 0.4 Hz, Depth 0.7, Feedback 0.6, Center 900 Hz, Spread 2200 Hz, Mix 0.6
- Pre-Drive Type: SOFT_CLIP
- Pre-Drive Drive: 0.3, Output: 1.0, Tone: 0.6
- Mixer: Wet 70%, Dry 30%

**Use Case**: Recreating classic electric piano and guitar phaser sounds

---

### 11. Modern

**Category**: Character
**Description**: Clean, precise dual phaser with LFO stereo offset

**Key Settings**:
- Phaser A & B: 8 stages, Rate 0.6 Hz, Depth 0.6, Feedback 0.5, Center 1200 Hz, Spread 2800 Hz
- Dual Phaser Routing: STEREO
- LFO Phase Offset: 180°
- Mixer: Wet 60%, Dry 40%

**Use Case**: Contemporary stereo phasing for electronic production

---

### 12. Ambient Pad

**Category**: Ambient
**Description**: Slow, evolving filter modulations for ambient textures

**Key Settings**:
- Filter Model: LADDER
- Filter Cutoff: 600 Hz, Resonance: 0.4
- Envelope 1: ADSR (Attack: 500 ms, Decay: 1000 ms, Sustain: 0.7, Release: 2000 ms)
- Envelope 2: ADSR (Attack: 700 ms, Decay: 1200 ms, Sustain: 0.5, Release: 2500 ms)
- Phaser A: 4 stages, Rate 0.1 Hz, Depth 0.5, Mix 0.4
- Modulation Routes:
  - ENV1 → FILTER_CUTOFF (0.9, 100 ms)
  - ENV2 → FILTER_RESONANCE (0.6, 150 ms)
  - ENV1 → PHASER_A_CENTER (0.5, 80 ms)
- Mixer: Wet 80%, Dry 20%

**Use Case**: Creating evolving ambient soundscapes and pads

---

### 13. Funk Rhythm

**Category**: Rhythm
**Description**: Dynamic filter for funky rhythm guitar

**Key Settings**:
- Gate Threshold: 0.5, Attack: 1 ms, Release: 50 ms
- Envelope 1: ADR (Attack: 10 ms, Decay: 150 ms, Release: 100 ms), Loop: ON
- Filter Model: SVF, Cutoff: 400 Hz, Resonance: 0.8
- Modulation: ENV1 → FILTER_CUTOFF (1.0, 2 ms)
- Mixer: Wet 70%, Dry 30%

**Use Case**: Funky auto-wah style filter for rhythm guitar or bass

---

### 14. Electronic

**Category**: Electronic
**Description**: Sweeping filter with phaser for electronic music

**Key Settings**:
- Filter Model: SVF, Cutoff: 1500 Hz, Resonance: 0.6
- Phaser A: 6 stages, Rate 0.8 Hz, Depth 0.7, Feedback 0.6, Center 1500 Hz, Spread 3000 Hz, Mix 0.5
- Envelope Follower: Attack 5 ms, Release 100 ms
- Modulation Routes:
  - ENV_FOLLOWER → FILTER_CUTOFF (0.7, 10 ms)
  - ENV_FOLLOWER → PHASER_A_DEPTH (0.5, 15 ms)
- Mixer Routing: PHASER_FILTER
- Mixer: Wet 80%, Dry 20%

**Use Case**: Dynamic filtering and phasing for electronic music production

---

### 15. Bass Enhancer

**Category**: Bass
**Description**: Subtle filter and phaser for bass enhancement

**Key Settings**:
- Filter Model: LADDER, Cutoff: 400 Hz, Resonance: 0.3
- Phaser A: 4 stages, Rate 0.2 Hz, Depth 0.3, Feedback 0.2, Center 500 Hz, Spread 1000 Hz, Mix 0.3
- Mixer: Wet 40%, Dry 60%

**Use Case**: Adding subtle movement and presence to bass without losing low end

---

### 16. Vocal FX

**Category**: Vocal
**Description**: Gentle phaser for vocal processing

**Key Settings**:
- Phaser A: 4 stages, Rate 0.3 Hz, Depth 0.4, Feedback 0.3, Center 1500 Hz, Spread 2000 Hz, Mix 0.3
- Pre-Drive Type: SOFT_CLIP, Drive: 0.2, Output: 1.0
- Mixer: Wet 40%, Dry 60%

**Use Case**: Subtle vocal enhancement for adding dimension and movement

---

### 17. Drum Bus

**Category**: Drums
**Description**: Transient-triggered filter for drum bus processing

**Key Settings**:
- Gate Threshold: 0.4, Attack: 1 ms, Hold: 50 ms, Release: 100 ms
- Envelope 1: ADR (Attack: 5 ms, Decay: 100 ms, Release: 50 ms)
- Filter Model: SVF, Cutoff: 800 Hz, Resonance: 0.5
- Modulation Routes:
  - ENV1 → FILTER_CUTOFF (0.8, 1 ms)
  - GATE → FILTER_CUTOFF (0.3, 5 ms)
- Mixer: Wet 60%, Dry 40%

**Use Case**: Dynamic filter sweep triggered by drum transients

---

### 18. Synth Lead

**Category**: Synth
**Description**: Dynamic filter with envelope for synth leads

**Key Settings**:
- Gate Threshold: 0.3
- Envelope 1: ADSR (Attack: 20 ms, Decay: 200 ms, Sustain: 0.6, Release: 300 ms)
- Filter Model: LADDER, Cutoff: 2000 Hz, Resonance: 0.7, Drive: 0.3
- Modulation Routes:
  - ENV1 → FILTER_CUTOFF (1.0, 5 ms)
  - ENV1 → FILTER_RESONANCE (0.5, 8 ms)
- Mixer: Wet 80%, Dry 20%

**Use Case**: Classic synth lead filter with envelope modulation

---

### 19. Guitar FX

**Category**: Guitar
**Description**: Classic guitar phaser with warm drive

**Key Settings**:
- Phaser A: 6 stages, Rate 0.4 Hz, Depth 0.7, Feedback 0.65, Center 1100 Hz, Spread 2400 Hz, Mix 0.6
- Pre-Drive Type: SOFT_CLIP, Drive: 0.4, Output: 1.0, Tone: 0.6
- Post-Drive Type: SOFT_CLIP, Drive: 0.2, Output: 1.1
- Mixer: Wet 70%, Dry 30%

**Use Case**: All-in-one guitar phaser with drive for authentic rock and funk tones

---

### 20. Experimental

**Category**: Experimental
**Description**: Complex modulation routing for experimental sounds

**Key Settings**:
- Phaser A: 8 stages, Rate 1.2 Hz, Depth 0.8, Feedback 0.7, Center 1500 Hz, Spread 3500 Hz, Mix 0.6
- Phaser B: 4 stages, Rate 0.8 Hz, Depth 0.6, Feedback 0.5, Center 800 Hz, Spread 2000 Hz, Mix 0.5
- Dual Phaser Routing: PARALLEL, Cross Feedback: 0.3
- Gate Threshold: 0.4
- Envelope 1: ADSR (Attack: 30 ms, Decay: 250 ms, Sustain: 0.5, Release: 400 ms)
- Modulation Routes (7 total):
  - ENV1 → FILTER_CUTOFF (0.9, 10 ms)
  - ENV1 → FILTER_RESONANCE (0.7, 15 ms)
  - ENV1 → PHASER_A_CENTER (0.6, 12 ms)
  - ENV1 → PHASER_B_CENTER (0.5, 8 ms)
  - ENV_FOLLOWER → PHASER_A_DEPTH (0.4, 20 ms)
  - ENV_FOLLOWER → PHASER_B_DEPTH (0.3, 18 ms)
  - GATE → FILTER_CUTOFF (0.2, 5 ms)
- Mixer: Wet 90%, Dry 10%

**Use Case**: Sound design and experimental music production

---

### 21. Extreme Modulation

**Category**: Experimental
**Description**: Maximum modulation depth for extreme sonic textures

**Key Settings**:
- Filter Model: LADDER, Cutoff: 1000 Hz, Resonance: 0.8, Drive: 0.5
- Phaser A: 8 stages, Rate 2.0 Hz, Depth: 1.0, Feedback: 0.9, Center 2000 Hz, Spread 5000 Hz, Mix 0.8
- Envelope 1: ADSR (Attack: 10 ms, Decay: 100 ms, Sustain: 1.0, Release: 500 ms)
- Envelope 2: ADSR (Attack: 15 ms, Decay: 150 ms, Sustain: 0.8, Release: 400 ms)
- Modulation Routes (8 total):
  - ENV1 → FILTER_CUTOFF (1.0, 2 ms) - MAX, FAST
  - ENV2 → FILTER_CUTOFF (-1.0, 3 ms) - INVERTED, FAST
  - ENV1 → FILTER_RESONANCE (1.0, 5 ms)
  - ENV1 → PHASER_A_CENTER (1.0, 5 ms)
  - ENV1 → PHASER_A_DEPTH (1.0, 8 ms)
  - ENV1 → PHASER_A_FEEDBACK (1.0, 10 ms)
  - ENV2 → PHASER_B_CENTER (1.0, 7 ms)
  - ENV_FOLLOWER → FILTER_CUTOFF (0.8, 1 ms)
- Mixer: Wet 100%, Dry 0%, Output: 0.8

**Use Case**: Extreme sound design, glitch textures, and experimental effects

---

### 22. Minimal

**Category**: Character
**Description**: Subtle effect with minimal processing

**Key Settings**:
- Phaser A: 4 stages, Rate 0.2 Hz, Depth 0.2, Feedback 0.2, Center 1000 Hz, Spread 1000 Hz, Mix 0.2
- Mixer: Wet 30%, Dry 70%

**Use Case**: Adding the slightest hint of movement without coloring the sound

---

## Using Factory Presets

### Loading a Factory Preset

```swift
// Get preset manager
let presetManager = PresetManager()

// Get factory preset by name
let preset = presetManager.getFactoryPreset(name: "Subtle Phaser")

// Apply to processor
preset.applyTo(processor)
```

### Listing All Factory Presets

```swift
let presetNames = presetManager.getFactoryPresetNames()
for name in presetNames {
    print("- \(name)")
}
```

### Getting Preset by Category

```swift
let allPresets = presetManager.getFactoryPresets()
let phaserPresets = allPresets.filter { $0.category == "Phaser" }
```

---

## Preset Parameters Reference

### Modulation Sources
- **0** (ENV1): Envelope 1
- **1** (ENV2): Envelope 2
- **4** (ENVELOPE_FOLLOWER): Envelope Follower
- **5** (GATE): Gate output

### Modulation Destinations
- **0** (FILTER_CUTOFF): Filter cutoff frequency
- **1** (FILTER_RESONANCE): Filter resonance
- **3** (PHASER_A_CENTER): Phaser A center frequency
- **4** (PHASER_A_DEPTH): Phaser A depth
- **5** (PHASER_A_FEEDBACK): Phaser A feedback
- **8** (PHASER_B_CENTER): Phaser B center frequency

### Filter Models
- **0** (SVF): State Variable Filter
- **1** (LADDER): Moog-style Ladder Filter

### Drive Types
- **0** (SOFT_CLIP): Smooth tanh saturation
- **1** (HARD_CLIP): Brutal clipping

### Routing Modes
- **0** (SERIES): Phaser A → Phaser B → Filter
- **1** (PARALLEL): All effects summed
- **2** (PHASER_FILTER): (Phaser A || Phaser B) → Filter
- **4** (STEREO): Dual phaser stereo mode

---

## Tips for Customizing Factory Presets

1. **Start Subtle**: Begin with minimal settings and gradually increase intensity
2. **Use Preset as Template**: Load a factory preset and save as user preset before modifying
3. **Experiment with Modulation**: Try routing different sources to destinations
4. **Adjust Wet/Dry Mix**: Find the right balance between effected and dry signal
5. **Listen in Context**: Test presets within a mix, not in isolation

---

## See Also

- [Preset Format Specification](./PRESET_FORMAT.md)
- [Swift Integration Guide](./SWIFT_INTEGRATION.md)
- [C API Reference](./C_API_REFERENCE.md)
