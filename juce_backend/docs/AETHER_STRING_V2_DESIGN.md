# Aether String v2: "Giant Instruments" Design Document

## Executive Summary

Aether String v2 extends the existing Karplus-Strong waveguide engine to convincingly simulate **extreme-scale string instruments** (multi-meter to tens-of-meters strings), preserving the current DSP core while adding:

1. **Scale-aware physics** (string length, mass, stiffness scaling)
2. **Gesture-shaped excitation** (pick position, contact type, force/speed)
3. **Shared mechanical coupling** (bridge, body, sympathetic strings)
4. **Giant-scale articulation** (slow attacks, massive resonance, long decay)

**Non-Goals** (Important Guardrails):
- ❌ No new top-level instrument engine
- ❌ No fork of Karplus-Strong / waveguide core
- ❌ No academic-perfect bowed string physics in v2
- ❌ No per-sample physical FEM simulation

**Design Philosophy**: Controlled physical plausibility, not research DSP.

---

## 1. Conceptual Model: What Makes a "Giant Instrument"?

A "giant instrument" differs from a guitar **not by pitch alone**, but by:

| Physical Property | Guitar (Normal) | Giant String |
|-------------------|-----------------|--------------|
| **String Length** | 0.65m | 3.6m - 12m+ |
| **Mass per Length** | Normal | High (thick gauge) |
| **Stiffness** | Higher (more inharmonicity) | Lower (more harmonic) |
| **Energy Flow** | Fast injection, fast decay | Slow injection, long sustain |
| **Attack** | Sharp, immediate | Slow, blooming |
| **Decay** | 1-3 seconds | 5-30+ seconds |
| **Coupling** | Individual body resonance | Shared bridge/body mass |
| **Gesture Scale** | Human-sized | Giant-scaled (slow, wide) |

**Key Insight**: A giant instrument is **not louder or lower** — it is **slower, heavier, and more connected**.

---

## 2. Parameter Schema v2

### 2.1 New First-Class Parameters

#### 2.1.1 `stringLengthMeters` (Required)

**Primary "giant switch"** - semantic scale parameter.

```cpp
// In WaveguideString::Parameters
float stringLengthMeters = 0.65f;  // Guitar-scale default
```

**Value Ranges**:
- `0.65m` - Guitar / violin (normal scale)
- `3.6m` - Bass / long string installation
- `12.0m` - Giant instrument (titan harp, cathedral string)
- `30.0m+` - Mythic scale (extreme giant)

**Internal Mappings** (automatic based on length):

```cpp
// Pseudo-code for length-based scaling
void applyScalePhysics(float length) {
    // Stiffness ↓ as length ↑ (longer strings = more harmonic)
    float normalizedLength = length / 0.65f;  // 1.0 = guitar
    params.stiffness = baseStiffness / std::sqrt(normalizedLength);

    // Inharmonicity ↓ (longer strings = less stretch)
    params.inharmonicity = baseInharmonicity / normalizedLength;

    // Damping curve reshaped
    // - HF loss slower (longer strings sustain highs longer)
    // - LF sustain longer (more energy storage)
    params.damping = remapDampingForLength(baseDamping, length);

    // Excitation bandwidth reduced (longer strings = less bright initial)
    exciterBrightness = baseBrightness / std::cbrt(normalizedLength);

    // Bridge coupling scaled down (massive bridge)
    params.bridgeCoupling = baseCoupling / std::sqrt(normalizedLength);
}
```

---

#### 2.1.2 `stringGauge` (Semantic Macro)

**High-level macro for mass-per-length**, maps to multiple DSP parameters.

```cpp
enum class StringGauge {
    Thin,      // Bright, fast decay, sharp attack
    Normal,    // Balanced (default)
    Thick,     // Dark, slow decay, soft attack
    Massive    // Very dark, very long sustain, bloom attack
};

StringGauge stringGauge = StringGauge::Normal;
```

**Mapping Table**:

| Gauge | Mass Proxy | Brightness | Decay Rate | Attack Sharpness |
|-------|------------|------------|------------|------------------|
| `Thin` | 0.7x | +20% | -30% | Sharp |
| `Normal` | 1.0x | 0% | 0% | Balanced |
| `Thick` | 1.5x | -25% | +50% | Soft |
| `Massive` | 2.5x | -40% | +150% | Bloom |

**Used By**:
- Presets (semantic description)
- Schillinger reasoning (high-level control)
- UI (user-friendly labels)

---

#### 2.1.3 `pickPosition` (0-1) (Required)

**Excitation point along string length** - critical for timbre control.

```cpp
float pickPosition = 0.12f;  // 12% from bridge (guitar default)
```

**Physical Effect**:
- Creates **comb filtering** in excitation spectrum
- Near bridge (0.0-0.15): Bright, sharp, harmonics emphasized
- Middle (0.3-0.7): Warm, balanced, fundamental emphasis
- Near nut (0.85-1.0): Dark, soft, muted tone

**Implementation** (comb filter):

```cpp
// In exciter generation
float pickComb(float input, float pickPos, int harmonicIndex) {
    // Comb filter: null at frequencies where pickPos = n / harmonicIndex
    float phase = 2.0f * juce::MathConstants<float>::pi * pickPos * harmonicIndex;
    float attenuation = std::abs(std::sin(phase));  // Nulls at harmonic nulls
    return input * attenuation;
}
```

**Low CPU cost, very high realism payoff.**

---

### 2.2 Gesture / Excitation Parameters v2

#### 2.2.1 `ContactType` (Enum)

```cpp
enum class ContactType {
    Pick,      // Sharp impulse, noise burst
    Finger,    // Softer attack, more low-freq energy
    Bow,       // Continuous excitation (noise + sawtooth)
    Scrape,    // High-freq noise, sustained
    Strike     // Percussive impulse (drum stick)
};

ContactType contactType = ContactType::Pick;
```

**Each Contact Defines**:
- Exciter envelope shape
- Noise component
- Bandwidth
- Energy injection rate

---

#### 2.2.2 `Gesture` Parameters (Giant-Scaled)

```cpp
struct GestureParameters {
    float force = 0.7f;         // 0-1, energy amount
    float speed = 0.2f;         // 0-1, attack speed (giant = slow)
    float contactArea = 0.6f;   // 0-1, width of contact (giant = wide)
    float roughness = 0.3f;     // 0-1, texture / noise
};

GestureParameters gesture;
```

**Giant Instrument Rules**:
- `speed` ↓ (slower attack, 50-500ms instead of 5-50ms)
- `contactArea` ↑ (wider contact, less high-freq energy)
- `force` → Sustained (energy injected over longer time)
- `roughness` ↓ (smoother excitation for giant strings)

**No stick–slip bow physics yet** - this is **gesture shaping**, not friction simulation.

---

## 3. Multi-String & Coupling (Phase 2.2)

### 3.1 Shared Bridge + Body Resonator

**Current**: Each string has an implicit body
**v2**: Multiple strings feed into shared bridge → shared body → feedback

```cpp
class SharedBridgeCoupling {
public:
    // Sum energy from all active strings
    float addStringEnergy(float stringEnergy, int stringIndex);

    // Get bridge motion (goes to body)
    float getBridgeMotion() const { return bridgeMotion; }

    // Get feedback to specific string (optional)
    float getStringFeedback(int stringIndex) const;

private:
    float bridgeMotion = 0.0f;           // Current bridge position
    std::array<float, 6> stringEnergy;   // Per-string energy
    float bridgeMass = 1.0f;             // Scales coupling speed
};
```

**Enables**:
- **String-to-string energy bleed** (play one note, others sympathetically vibrate)
- **Slow bloom** (bridge accumulates energy over time)
- **Massive resonance** (all strings contribute to body)

---

### 3.2 Sympathetic Strings (Optional but Recommended)

```cpp
struct SympatheticStringConfig {
    bool enabled = true;
    int count = 6;                       // Number of sympathetic strings
    enum class TuningMode {
        Harmonic,    // Octaves, fifths
        Drone,       // Fixed drone notes
        Custom       // User-defined tuning
    };
    TuningMode tuning = TuningMode::Harmonic;
};

class SympatheticStringBank {
public:
    void prepare(double sampleRate, SympatheticStringConfig config);
    void exciteFromBridge(float bridgeEnergy);  // Not directly excited
    float processSample();                      // Sum all sympathetic output

private:
    std::vector<WaveguideString> sympatheticStrings;
    float couplingGain = 0.3f;  // Light coupling only
};
```

**Characteristics**:
- Not directly excited (no MIDI note-on)
- Receive energy from bridge/body
- Ring slowly (very light damping)
- Create **"giant halo" effect**

**CPU Cheap**: Lightly damped waveguides = ~2-3% CPU for 6 strings.

---

## 4. What We Are NOT Adding Yet

❌ **Longitudinal Modes**
   - Compression waves along the string
   - Adds metallic "ping"
   - Nice later, not required for giant feel

❌ **True Bow Stick–Slip Physics**
   - Very complex (friction differential equations)
   - Hard to control musically
   - Phase 3+ only

❌ **Air Modes / Room Coupling**
   - Environmental resonance
   - Nice for v3

---

## 5. Preset & Semantic Layer

### 5.1 Giant Instrument Presets

**Preset Categories**:

| Preset Name | Scale Regime | Gauge | Contact | Use Case |
|-------------|--------------|-------|---------|----------|
| **Giant Monochord** | 12m | Massive | Bow | Drone, meditation |
| **Titan Harp** | 8m | Thick | Pick | Arpeggios, layers |
| **Cathedral String** | 15m | Massive | Finger | Pads, atmospheres |
| **Stone Bass** | 4m | Thick | Pick | Bass lines, foundation |
| **Mythic Drone** | 20m+ | Massive | Bow | Ethereal, cinematic |
| **Colossus Bow** | 10m | Thick | Bow | Sustained leads |

**All are still "Aether String" presets** - just different parameter configurations.

---

### 5.2 Schillinger Integration

**Schillinger reasons in semantic terms**:

```dart
// Schillinger Generator Output (example)
{
  "scaleRegime": "giant",        // Not raw DSP knobs
  "gesture": "slow/heavy",        // Semantic gesture
  "energyProfile": "sustained",   // Not "damping = 0.999"
  "role": "harmonic gravity"      // Musical function
}
```

**Mappings to DSP**:
- `scaleRegime: giant` → `stringLengthMeters = 12.0f`
- `gesture: slow/heavy` → `gesture.speed = 0.2f`, `gesture.force = 0.8f`
- `energyProfile: sustained` → `params.damping = 0.999f`
- `role: harmonic gravity` → `stringGauge = StringGauge::Massive`

---

## 6. Implementation Order

### Phase 2.1 (Small, high impact)
1. ✅ Add `stringLengthMeters` to `WaveguideString::Parameters`
2. ✅ Implement `applyScalePhysics()` with automatic mappings
3. ✅ Add `pickPosition` with comb filtering
4. ✅ Add `stringGauge` enum + parameter mapping
5. ✅ Extend `ArticulationStateMachine` with gesture parameters

### Phase 2.2 (Core "giant" feel)
6. ✅ Implement `SharedBridgeCoupling` class
7. ✅ Integrate shared bridge into `VoiceManager`
8. ✅ Add cross-string coupling (energy bleed)
9. ✅ Implement `SympatheticStringBank` class
10. ✅ Create sympathetic string presets

### Phase 2.3 (Optional polish)
11. ✅ Giant-scale articulation presets (6 presets)
12. ✅ Slow vibrato / drift scaling (time stretching)
13. ✅ Environmental body presets (stone / wood / metal)
14. ✅ Schillinger generator integration

---

## 7. Success Criteria

**How we know it worked**:

- [ ] Same pitch (e.g., A 440Hz) sounds **massive**, not just lower
- [ ] Attacks feel **slow and heavy** (50-500ms vs 5-50ms)
- [ ] Sustains feel **inevitable** (energy hangs in the air)
- [ ] Small gestures produce **large, delayed results** (giant inertia)
- [ ] Multiple notes feel **mechanically connected** (shared bridge)
- [ ] Drone chords **bloom instead of sparkle** (slow resonance)

**Subjective Validation**:
> "When I play a giant string, I feel like I'm pulling a massive rope that takes time to start moving, and once it moves, it wants to keep moving forever."

---

## 8. Technical Implementation Notes

### 8.1 Backward Compatibility

**v2 is 100% backward compatible** with v1:
- All existing presets work unchanged
- `stringLengthMeters = 0.65f` (default) = v1 behavior
- New parameters default to "guitar-scale" values

### 8.2 CPU Budget Targets

| Component | v1 Cost | v2 Cost (Giant) | Notes |
|-----------|---------|-----------------|-------|
| Waveguide String | ~2% per voice | ~2% per voice | No change (same core) |
| Bridge Coupling | ~0.1% per voice | ~0.5% (shared) | Less per voice total |
| Body Resonator | ~1% (8 modes) | ~1% (8 modes) | No change |
| Sympathetic Strings | - | ~2% (6 strings) | Optional |
| Gesture Shaping | ~0.5% per voice | ~0.5% per voice | No change |
| **Total** | **~12% (6 voices)** | **~18% (6 voices + symp)** | Within budget |

**v2 Target**: < 20% CPU (6 voices + sympathetic strings @ 48kHz)

### 8.3 Realtime Safety

**No allocations in processBlock()**:
- Pre-allocate all buffers in `prepare()`
- Use fixed-size arrays (`std::array`, not `std::vector`)
- Avoid dynamic memory during audio rendering

---

## 9. One-Sentence Guiding Principle

> **A giant instrument is not louder or lower — it is slower, heavier, and more connected.**

---

## Appendix A: Parameter Mapping Equations

### A.1 Length-Based Stiffness Scaling

```cpp
// Stiffness ∝ 1 / sqrt(length)
// Longer strings = less inharmonicity (more harmonic)
float scaleStiffness(float baseStiffness, float length) {
    float normalizedLength = length / 0.65f;  // Guitar = 1.0
    return baseStiffness / std::sqrt(normalizedLength);
}
```

**Example**:
- Guitar (0.65m): stiffness = 0.1 → 0.1
- Giant (12m): stiffness = 0.1 / 4.7 → **0.021** (much more harmonic)

### A.2 Damping Curve Reshaping

```cpp
// Damping curve changes with length
// - HF loss slower (longer strings sustain highs)
// - LF sustain longer (more energy storage)
float scaleDamping(float baseDamping, float length) {
    float normalizedLength = length / 0.65f;

    // Split into bands
    float hfDamping = baseDamping + (0.001f * normalizedLength);  // Better HF
    float lfDamping = baseDamping * (1.0f + 0.1f * normalizedLength);  // Better LF

    // Blend based on frequency (simplified)
    return (hfDamping + lfDamping) * 0.5f;
}
```

**Example**:
- Guitar: damping = 0.996 → ~3s decay
- Giant: damping = 0.9995 → **~30s decay**

### A.3 Excitation Bandwidth

```cpp
// Excitation brightness ∝ 1 / cbrt(length)
// Longer strings = less bright initial (comb filter + mass)
float scaleExciterBrightness(float baseBrightness, float length) {
    float normalizedLength = length / 0.65f;
    return baseBrightness / std::cbrt(normalizedLength);
}
```

---

## Appendix B: File Structure

```
juce_backend/
├── include/dsp/
│   └── KaneMarcoAetherStringDSP.h          [MODIFY] Add v2 parameters
├── src/dsp/
│   ├── KaneMarcoAetherStringDSP.cpp        [MODIFY] Implement v2 features
│   ├── SharedBridgeCoupling.cpp            [NEW] Shared bridge implementation
│   └── SympatheticStringBank.cpp           [NEW] Sympathetic strings
├── presets/
│   ├── aether_v2_giant_presets.json        [NEW] Giant instrument presets
│   └── aether_v2_sympathetic_presets.json  [NEW] Sympathetic configs
└── tests/dsp/
    ├── AetherStringV2Tests.cpp             [NEW] v2 feature tests
    └── GiantInstrumentValidation.cpp       [NEW] Subjective quality tests
```

---

**End of Design Document**
