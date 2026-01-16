# Aether String v2 Quick Reference

## One-Line Summary

> **Aether String v2 simulates "giant instruments" (12m+ strings) through scale-aware physics, gesture-shaped excitation, and shared mechanical coupling.**

---

## New Parameters v2

### Core Scale Parameters

| Parameter | Type | Range | Default | Effect |
|-----------|------|-------|---------|--------|
| `stringLengthMeters` | float | 0.65 - 30.0+ | 0.65 | **Primary giant switch** - scales all physics |
| `stringGauge` | enum | Thin/Normal/Thick/Massive | Normal | Brightness, decay, attack character |
| `pickPosition` | float | 0.0 - 1.0 | 0.12 | Comb filtering (timbre) |

### Gesture Parameters

| Parameter | Type | Range | Default | Effect |
|-----------|------|-------|---------|--------|
| `gesture.force` | float | 0.0 - 1.0 | 0.7 | Excitation energy |
| `gesture.speed` | float | 0.0 - 1.0 | 0.2 | Attack time (giant = slow) |
| `gesture.contactArea` | float | 0.0 - 1.0 | 0.6 | Excitation bandwidth |
| `gesture.roughness` | float | 0.0 - 1.0 | 0.3 | Noise texture |

---

## Preset Library

### Giant Instrument Presets

```
Giant Monochord     - 12m, Massive, Bow   (drone, meditation)
Titan Harp          - 8m,  Thick,  Pick   (arpeggios, layers)
Cathedral String    - 15m, Massive, Finger (pads, atmospheres)
Stone Bass          - 4m,  Thick,  Pick   (bass lines)
Mythic Drone        - 20m+, Massive, Bow  (ethereal, cinematic)
Colossus Bow        - 10m, Thick,  Bow    (sustained leads)
```

**All existing v1 presets remain 100% compatible.**

---

## Code Usage Example

### C++ API

```cpp
// Create DSP engine
KaneMarcoAetherStringDSP dsp;

// Configure as giant instrument
auto& voiceManager = dsp.getVoiceManager();
for (auto& voice : voiceManager.voices) {
    // Set scale
    voice.string.setStringLengthMeters(12.0f);  // 12-meter string

    // Set gauge
    voice.string.setStringGauge(StringGauge::Massive);

    // Set pick position
    voice.string.setPickPosition(0.5f);  // Middle of string

    // Set gesture
    GestureParameters giantGesture;
    giantGesture.force = 0.8f;
    giantGesture.speed = 0.2f;   // Slow attack (200-500ms)
    giantGesture.contactArea = 0.8f;
    voice.fsm.setGestureParameters(giantGesture);
}

// Enable shared bridge
voiceManager.enableSharedBridge(true);

// Enable sympathetic strings
SympatheticStringConfig sympConfig;
sympConfig.enabled = true;
sympConfig.count = 6;
sympConfig.tuning = TuningMode::Harmonic;
voiceManager.setSympatheticConfig(sympConfig);
```

---

## Schillinger Integration

### Semantic → DSP Mapping

```dart
// Schillinger Output (Semantic)
{
  "scaleRegime": "giant",
  "gesture": "slow/heavy",
  "energyProfile": "sustained",
  "role": "harmonic gravity"
}

// Maps to DSP Parameters
{
  "stringLengthMeters": 12.0,
  "stringGauge": "Massive",
  "gesture.speed": 0.2,
  "gesture.force": 0.8,
  "params.damping": 0.9995,
  "params.bridgeCoupling": 0.15
}
```

---

## CPU Budget

| Component | Cost (6 voices) |
|-----------|-----------------|
| Waveguide Strings | ~12% |
| Shared Bridge | ~0.5% |
| Sympathetic Strings (6) | ~2% |
| Body Resonator | ~1% |
| **Total** | **~15.5%** |

**Target**: < 20% CPU @ 48kHz ✅

---

## Implementation Phases

### Phase 2.1 (Week 1-2)
- ✅ `stringLengthMeters` + scale physics
- ✅ `pickPosition` + comb filtering
- ✅ `stringGauge` macro
- ✅ Gesture parameters

**Impact**: High (core giant feel)

### Phase 2.2 (Week 3-4)
- ✅ Shared bridge + coupling
- ✅ Cross-string energy bleed
- ✅ Sympathetic strings

**Impact**: High (mechanical connection)

### Phase 2.3 (Week 5-6)
- ✅ Giant instrument presets
- ✅ Environmental body materials
- ✅ Schillinger integration

**Impact**: Medium (polish)

---

## Success Criteria

- [ ] **Same pitch sounds massive** (not just lower)
- [ ] **Attacks feel slow and heavy** (50-500ms vs 5-50ms)
- [ ] **Sustains feel inevitable** (energy hangs in air)
- [ ] **Small gestures → large, delayed results** (giant inertia)
- [ ] **Multiple notes feel mechanically connected** (shared bridge)
- [ ] **Drone chords bloom instead of sparkle** (slow resonance)

---

## Key Equations

### Length-Based Stiffness Scaling
```
stiffness_scaled = base_stiffness / sqrt(length / 0.65)
```

**Example**: Guitar (0.65m) → Giant (12m): stiffness 0.1 → 0.021

### Damping Curve Reshaping
```
damping_scaled = base_damping + 0.001 * (length / 0.65)
```

**Example**: Guitar (0.65m) → Giant (12m): decay 3s → 30s

### Excitation Bandwidth
```
brightness_scaled = base_brightness / cbrt(length / 0.65)
```

**Example**: Guitar → Giant: brightness 0.5 → 0.18

---

## Backward Compatibility

✅ **100% backward compatible** with v1:
- All existing presets work unchanged
- `stringLengthMeters = 0.65f` = v1 behavior
- New parameters default to guitar-scale values
- Feature flags for new features (shared bridge, sympathetic)

---

## Testing Commands

```bash
# Unit tests
./build/aether_string_v2_tests

# Performance benchmark
./build/aether_string_v2_performance --benchmark

# Subjective validation
./build/giant_instrument_quality --interactive
```

---

## File Locations

```
juce_backend/
├── docs/
│   ├── AETHER_STRING_V2_DESIGN.md          [Design document]
│   ├── AETHER_STRING_V2_TASK_BREAKDOWN.md  [Task list]
│   └── AETHER_STRING_V2_QUICK_REFERENCE.md [This file]
├── include/dsp/
│   └── KaneMarcoAetherStringDSP.h          [Modify: Add v2 params]
├── src/dsp/
│   ├── KaneMarcoAetherStringDSP.cpp        [Modify: Implement v2]
│   ├── SharedBridgeCoupling.cpp            [New: Shared bridge]
│   └── SympatheticStringBank.cpp           [New: Sympathetic strings]
├── presets/
│   ├── aether_v2_giant_presets.json        [New: 6 giant presets]
│   └── aether_v2_sympathetic_presets.json  [New: Sympathetic configs]
└── tests/dsp/
    ├── AetherStringV2Tests.cpp             [New: Unit tests]
    ├── GiantInstrumentValidation.cpp       [New: Integration tests]
    └── AetherStringV2Performance.cpp       [New: Benchmarks]
```

---

## Design Principle

> **A giant instrument is not louder or lower — it is slower, heavier, and more connected.**

---

**End of Quick Reference**
