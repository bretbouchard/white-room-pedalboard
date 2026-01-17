# Sam Sampler - Quick Reference Guide

## New Parameters Reference

### Envelope Parameters

#### Basic Timing
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `envAttack` | 0.001 - 5.0s | 0.01s | Attack time |
| `envHold` | 0.0 - 5.0s | 0.0s | Hold time at peak |
| `envDecay` | 0.001 - 5.0s | 0.1s | Decay time |
| `envSustain` | 0.0 - 1.0 | 0.7 | Sustain level |
| `envRelease` | 0.001 - 5.0s | 0.2s | Release time |

#### Envelope Curves
| Parameter | Values | Description |
|-----------|--------|-------------|
| `envAttackCurve` | 0=Linear, 1=Exp, 2=Log, 3=SCurve | Attack shape |
| `envDecayCurve` | 0=Linear, 1=Exp, 2=Log, 3=SCurve | Decay shape |
| `envReleaseCurve` | 0=Linear, 1=Exp, 2=Log, 3=SCurve | Release shape |

### Filter Parameters

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `filterCutoff` | 20.0 - 20000.0 Hz | 20000.0 | Filter frequency |
| `filterResonance` | 0.0 - 1.0 | 0.0 | Filter resonance |
| `filterEnabled` | 0.0 or 1.0 | 0.0 | Enable/disable filter |
| `filterType` | 0=LP, 1=BP, 2=HP, 3=Notch | 0 | Filter type |

## Preset Recipes

### Piano
```
Envelope:
  Attack: 0.01s (Exponential)
  Hold: 0.0s
  Decay: 0.5s (Exponential)
  Sustain: 0.3
  Release: 0.3s (Exponential)

Filter: Disabled
```

### Organ
```
Envelope:
  Attack: 0.01s (Linear)
  Hold: 0.0s
  Decay: 0.1s (Linear)
  Sustain: 0.8
  Release: 0.1s (Linear)

Filter:
  Type: Lowpass
  Cutoff: 5000 Hz
  Resonance: 0.2
```

### Strings (Pad)
```
Envelope:
  Attack: 0.5s (Logarithmic)
  Hold: 0.2s
  Decay: 0.3s (Linear)
  Sustain: 0.7
  Release: 1.0s (Logarithmic)

Filter:
  Type: Lowpass
  Cutoff: 8000 Hz
  Resonance: 0.0
```

### Synth Bass
```
Envelope:
  Attack: 0.01s (Exponential)
  Hold: 0.0s
  Decay: 0.2s (Exponential)
  Sustain: 0.4
  Release: 0.2s (Exponential)

Filter:
  Type: Lowpass
  Cutoff: 800 Hz
  Resonance: 0.7
```

### Brass
```
Envelope:
  Attack: 0.05s (Exponential)
  Hold: 0.1s
  Decay: 0.2s (Linear)
  Sustain: 0.6
  Release: 0.3s (Exponential)

Filter:
  Type: Lowpass
  Cutoff: 4000 Hz
  Resonance: 0.3
```

### Ambient Pad
```
Envelope:
  Attack: 2.0s (S-Curve)
  Hold: 1.0s
  Decay: 0.5s (Logarithmic)
  Sustain: 0.8
  Release: 3.0s (Logarithmic)

Filter:
  Type: Lowpass
  Cutoff: 3000 Hz
  Resonance: 0.1
```

### Plucked String
```
Envelope:
  Attack: 0.001s (Exponential)
  Hold: 0.0s
  Decay: 0.8s (Exponential)
  Sustain: 0.0
  Release: 0.5s (Exponential)

Filter:
  Type: Lowpass
  Cutoff: 6000 Hz
  Resonance: 0.4
```

## Envelope Curve Guide

### Linear (0)
- **Use for**: Organ, percussion, mechanical sounds
- **Character**: Straight, predictable transitions
- **Formula**: `f(t) = t`

### Exponential (1)
- **Use for**: Piano, brass, plucked strings, natural sounds
- **Character**: Fast initial change, slower later (natural decay)
- **Formula**: `f(t) = t²`

### Logarithmic (2)
- **Use for**: Strings, pads, slow attack sounds
- **Character**: Slower initial change, faster later
- **Formula**: `f(t) = √t`

### S-Curve (3)
- **Use for**: Ambient pads, smooth transitions, swell effects
- **Character**: Ease-in-ease-out, very smooth
- **Formula**: `f(t) = (1 - cos(πt)) / 2`

## Filter Type Guide

### Lowpass (0)
- **Use for**: Removing high frequencies, warming sound
- **Character**: attenuates frequencies above cutoff
- **Applications**: Bass, pads, subtractive synthesis

### Bandpass (1)
- **Use for**: Focusing on frequency range, formant filtering
- **Character**: Passes band around cutoff
- **Applications**: Vocal-like sounds, wah effects, resonant sweeps

### Highpass (2)
- **Use for**: Removing low frequencies, adding brightness
- **Character**: attenuates frequencies below cutoff
- **Applications**: Percussion, cleaning up muddy low end

### Notch (3)
- **Use for**: Removing specific frequencies, phaser-like effects
- **Character**: Removes band around cutoff
- **Applications**: Feedback suppression, special effects

## Code Examples

### C++ API Usage
```cpp
// Create sampler
DSP::SamSamplerDSP sampler;
sampler.prepare(48000.0, 512);

// Configure envelope
sampler.setParameter("envAttack", 0.05f);
sampler.setParameter("envHold", 0.1f);
sampler.setParameter("envDecay", 0.3f);
sampler.setParameter("envSustain", 0.6f);
sampler.setParameter("envRelease", 0.4f);

// Set envelope curves
sampler.setParameter("envAttackCurve", 1.0f);    // Exponential
sampler.setParameter("envDecayCurve", 2.0f);     // Logarithmic
sampler.setParameter("envReleaseCurve", 1.0f);   // Exponential

// Configure filter
sampler.setParameter("filterEnabled", 1.0f);
sampler.setParameter("filterType", 0.0f);        // Lowpass
sampler.setParameter("filterCutoff", 2000.0f);
sampler.setParameter("filterResonance", 0.5f);
```

### Real-time Parameter Changes
```cpp
// Smooth filter sweep
for (int i = 0; i < 100; ++i)
{
    float cutoff = 200.0f + (i * 100.0f);  // 200Hz to 10000Hz
    sampler.setParameter("filterCutoff", cutoff);
    // Process audio...
}

// Morph envelope curve
sampler.setParameter("envAttackCurve", 0.0f);  // Start linear
// Later...
sampler.setParameter("envAttackCurve", 3.0f);  // Switch to S-curve
```

## Tips and Tricks

### Creating Expressive Sounds
1. **Use S-curve attack** for smooth pad swells
2. **Add hold stage** to emphasize the peak of sounds
3. **Match decay curve to sound character** (exp for natural, log for mechanical)
4. **Use longer release** for ambient sounds

### Filter Techniques
1. **Start with high resonance** and adjust to taste
2. **Automate cutoff** for sweeps and motion
3. **Use bandpass** for formant/vocal qualities
4. **Combine with envelope** for dynamic filter sweeps

### Performance Optimization
1. **Disable filter when not needed** (saves CPU)
2. **Use linear interpolation** for percussive sounds (faster)
3. **Use cubic interpolation** for pads and sustained sounds (better quality)
4. **Keep release times reasonable** to avoid voice stealing issues

## Troubleshooting

### Filter Artifacts
- **Problem**: Zipper noise when changing cutoff
- **Solution**: Filter smoothing is automatic, but ensure gradual changes

### Envelope Clicks
- **Problem**: Clicks at attack/release
- **Solution**: Use exponential or S-curve instead of linear

### Loop Clicks
- **Problem**: Clicks at loop points
- **Solution**: Increase crossfade time in sample parameters

### CPU Usage
- **Problem**: High CPU with many voices
- **Solution**: Disable filter on non-critical voices, use linear interpolation

## Parameter Clamping

All parameters are automatically clamped to valid ranges:

- **Times**: 0.001 to 5.0 seconds
- **Levels**: 0.0 to 1.0
- **Cutoff**: 20.0 to 20000.0 Hz
- **Curves**: 0 to 3 (integer)
- **Filter Type**: 0 to 3 (integer)

Invalid values are automatically constrained without errors.
