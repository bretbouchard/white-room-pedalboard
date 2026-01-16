# Bi-Phase Advanced Features - Design Document

## Overview

This document outlines the implementation of 8 advanced features for the Bi-Phase phaser effect, transforming it from a classic Mu-Tron emulation into a comprehensive, modern phaser suitable for contemporary production.

**Design Philosophy:**
- Maintain the authenticity of the original Bi-Phase sound
- Add musically valuable extensions without becoming a generic multi-FX
- All features must be verifiable via DSP test harness
- Zero heap allocation in audio thread
- Deterministic execution

---

## Feature 1: Manual Phase Offset (Per Phasor)

### Description
A static offset added to the LFO phase position for each phasor. This was implicitly present in the original hardware due to analog tolerances.

### Parameters
```cpp
// Per-phasor manual phase offset
float phaseOffsetA;  // -180.0 to +180.0 degrees
float phaseOffsetB;  // -180.0 to +180.0 degrees
```

### Implementation Details

**Location in DSP Chain:**
- Applied in `getLFOA()` and `getLFOB()` methods
- Added to base LFO phase before processing

**Formula:**
```cpp
float getPhaseWithOffset(float basePhase, float offsetDegrees) {
    float offsetRad = offsetDegrees * (PI / 180.0f);
    float phase = basePhase + offsetRad;
    // Wrap to 0-2PI
    while (phase >= 2.0f * PI) phase -= 2.0f * PI;
    while (phase < 0.0f) phase += 2.0f * PI;
    return phase;
}
```

**Musical Applications:**
- Asymmetrical sweeps (phaser doesn't sweep symmetrically)
- Slow movement textures (with small offsets like 15-30°)
- Stereo depth enhancement in parallel mode

**Test Cases:**
1. Verify -180° to +180° range clamping
2. Verify phase wraparound at boundaries
3. Verify asymmetrical sweep with 90° offset
4. Verify stereo separation in parallel mode

---

## Feature 2: Stage Count Control

### Description
Variable all-pass stage count per phasor. Original was 6 stages, but allowing 4/6/8 provides different phaser characters.

### Parameters
```cpp
enum class StageCount {
    Four,   // Chewy, subtle
    Six,    // Classic Bi-Phase
    Eight   // Vocal, dramatic
};

StageCount stageCountA;
StageCount stageCountB;
```

### Implementation Details

**Architecture Change:**
Convert `PhaserStage` from fixed 6-stage to variable-stage:

```cpp
template<int MaxStages = 8>
class VariablePhaserStage {
    std::array<AllPassStage, MaxStages> allPassStages;
    int activeStages = 6;  // Default: 6 stages

    void setStageCount(StageCount count) {
        switch (count) {
            case StageCount::Four:   activeStages = 4; break;
            case StageCount::Six:    activeStages = 6; break;
            case StageCount::Eight:  activeStages = 8; break;
        }
    }

    void processStereo(float& left, float& right, float modSignal,
                       float minFreq, float maxFreq, double sampleRate) {
        // Calculate coefficient
        float t = (modSignal + 1.0f) * 0.5f;
        float freq = minFreq * std::pow(maxFreq / minFreq, t);
        float a = -std::tan(static_cast<float>(M_PI * freq / sampleRate));

        // Process only active stages
        for (int i = 0; i < activeStages; ++i) {
            allPassStages[i].processStereo(left, right, a);
        }
    }
};
```

**Performance Consideration:**
- Template-based to allow compiler optimization
- Loop still runs to max stages, but early termination possible
- Alternative: Specialized templates for each count

**Sound Characteristics:**
- **4 stages**: Fewer notches, chewier, more subtle
- **6 stages**: Classic Bi-Phase, balanced
- **8 stages**: More notches, vocal quality, dramatic sweeps

**Test Cases:**
1. Verify stage count switching
2. Verify frequency response (4 vs 6 vs 8 stages)
3. Verify CPU usage differences (if any)
4. Verify series mode with mismatched stages (4+6=10 effective)

---

## Feature 3: Feedback Polarity

### Description
Not just feedback amount, but sign matters. Negative feedback creates hollow, notch-forward sound; positive creates sweeping resonant peaks.

### Parameters
```cpp
enum class FeedbackPolarity {
    Positive,  // Resonant peaks
    Negative   // Hollow notches
};

FeedbackPolarity feedbackPolarityA;
FeedbackPolarity feedbackPolarityB;
```

### Implementation Details

**Current Feedback Formula:**
```cpp
outA = inA + feedbackStateA_ * fbA;
feedbackStateA_ = outA;
```

**New Feedback Formula:**
```cpp
float polarityA = (feedbackPolarityA == FeedbackPolarity::Positive) ? 1.0f : -1.0f;
outA = inA + feedbackStateA_ * fbA * polarityA;
feedbackStateA_ = outA;
```

**Sound Characteristics:**
- **Positive**: Emphasized peaks, resonant, aggressive
- **Negative**: Notch emphasis, hollow, subtle

**Test Cases:**
1. Verify positive feedback increases resonance
2. Verify negative feedback creates notch emphasis
3. Verify stability with high feedback (>0.9)
4. Verify A/B comparison in series mode

---

## Feature 4: LFO Phase Relationship

### Description
Beyond "shared vs independent" — precise control over how Phasor B's LFO relates to Phasor A's LFO.

### Parameters
```cpp
enum class LFOLinkMode {
    Free,       // Independent phase (current behavior)
    Locked,     // 0° offset (same phase)
    Offset,     // User-defined offset 0-180°
    Quadrature  // 90° offset (classic stereo)
};

LFOLinkMode lfoLinkMode;
float lfoLinkOffset;  // 0.0 to 180.0 degrees (for Offset mode)
```

### Implementation Details

**Location:** Applied in `updateControlRateDual()` during phase sync

**Implementation:**
```cpp
void updateControlRateDual() {
    // ... existing LFO frequency updates ...

    // Apply LFO phase relationship
    if (parameters_.sourceA == parameters_.sourceB) {
        LFOGenerator& sourceLFO = (parameters_.sourceA == SweepSource::Generator1)
                                   ? lfo1A : lfo2A;
        LFOGenerator& destLFO = (parameters_.sourceA == SweepSource::Generator1)
                                 ? lfo1B : lfo2B;

        float targetPhase = sourceLFO.getPhase();

        switch (parameters_.lfoLinkMode) {
            case LFOLinkMode::Free:
                // Don't synchronize phase
                break;

            case LFOLinkMode::Locked:
                // 0° offset
                destLFO.setPhase(targetPhase);
                break;

            case LFOLinkMode::Offset:
                // User-defined offset
                {
                    float offsetRad = parameters_.lfoLinkOffset * (PI / 180.0f);
                    float phase = targetPhase + offsetRad;
                    if (phase >= 2.0f * PI) phase -= 2.0f * static_cast<float>(M_PI);
                    destLFO.setPhase(phase);
                }
                break;

            case LFOLinkMode::Quadrature:
                // 90° offset (PI/2)
                {
                    float phase = targetPhase + static_cast<float>(M_PI_2);
                    if (phase >= 2.0f * PI) phase -= 2.0f * static_cast<float>(M_PI);
                    destLFO.setPhase(phase);
                }
                break;
        }

        // Apply sweep sync on top of link mode (if using Reverse)
        if (parameters_.sweepSync == SweepSync::Reverse) {
            // Additional 180° offset for reverse sweep
            float currentPhase = destLFO.getPhase();
            float phase = currentPhase + static_cast<float>(M_PI);
            if (phase >= 2.0f * PI) phase -= 2.0f * static_cast<float>(M_PI);
            destLFO.setPhase(phase);
        }
    }
}
```

**Musical Applications:**
- **Free**: Dual independent LFOs (polyrhythmic sweeps)
- **Locked**: Mono-compatible, synchronized sweeps
- **Offset**: Custom stereo imaging (e.g., 45° for subtle width)
- **Quadrature**: Classic stereo phaser (90° = circular motion)

**Test Cases:**
1. Verify Free mode maintains independent phases
2. Verify Locked mode syncs phases
3. Verify Offset mode applies custom angle
4. Verify Quadrature mode applies 90° offset
5. Verify interaction with SweepSync::Reverse

---

## Feature 5: Envelope Follower → Sweep Depth

### Description
Modulate sweep depth (and optionally center frequency, feedback) based on input signal envelope. Creates auto-wah-like behavior.

### Parameters
```cpp
struct EnvelopeFollowerParams {
    bool enabled = false;
    float attack = 10.0f;       // 1.0 to 100.0 ms
    float release = 100.0f;     // 10.0 to 1000.0 ms
    float amount = 0.5f;        // 0.0 to 1.0 (modulation amount)
    bool toDepth = true;        // Modulate sweep depth
    bool toCenter = false;      // Modulate center frequency
    bool toFeedback = false;    // Modulate feedback
};

EnvelopeFollowerParams envelopeA;
EnvelopeFollowerParams envelopeB;
```

### Implementation Details

**Envelope Follower Class:**
```cpp
class EnvelopeFollower {
public:
    void prepare(double sampleRate) {
        sampleRate_ = sampleRate;
    }

    void setAttackTime(float ms) {
        float time = ms * 0.001f;
        attackCoeff_ = std::exp(-1.0f / (time * static_cast<float>(sampleRate_)));
    }

    void setReleaseTime(float ms) {
        float time = ms * 0.001f;
        releaseCoeff_ = std::exp(-1.0f / (time * static_cast<float>(sampleRate_)));
    }

    void reset() {
        envelope_ = 0.0f;
    }

    // Process one sample, returns envelope value 0-1
    inline float processSample(float input) {
        float rectified = std::abs(input);

        if (rectified > envelope_) {
            // Attack phase (fast)
            envelope_ = rectified + attackCoeff_ * (envelope_ - rectified);
        } else {
            // Release phase (slow)
            envelope_ = rectified + releaseCoeff_ * (envelope_ - rectified);
        }

        return envelope_;
    }

    float getCurrent() const { return envelope_; }

private:
    float envelope_ = 0.0f;
    float attackCoeff_ = 0.999f;
    float releaseCoeff_ = 0.999f;
    double sampleRate_ = 48000.0;
};
```

**Integration into BiPhaseDSP:**
```cpp
// In BiPhaseDSP class
EnvelopeFollower envelopeFollowerA_;
EnvelopeFollower envelopeB_;

// In processing loop (before phaser)
float modDepthA = depthSmoother_.getCurrent();
if (envelopeA.enabled) {
    float env = envelopeFollowerA_.processSample(inA);
    if (envelopeA.toDepth) {
        modDepthA = modDepthA * (1.0f - envelopeA.amount) + env * envelopeA.amount;
    }
}
```

**Musical Applications:**
- **Funk articulation**: Fast attack, medium release → dynamic "quack"
- **Ambient swell**: Slow attack, slow release → bloom on notes
- **Synth lead**: Medium settings → dynamic filter sweeps

**Test Cases:**
1. Verify attack time accuracy
2. Verify release time accuracy
3. Verify depth modulation
4. Verify center frequency modulation
5. Verify feedback modulation
6. Verify bypass (disabled = no effect)

---

## Feature 6: Center Frequency Bias (Sweep Center)

### Description
Instead of always sweeping full-range (200-5000 Hz), allow biasing the sweep center and width.

### Parameters
```cpp
struct SweepBiasParams {
    float center = 0.5f;    // 0.0 to 1.0 (sweep center position)
    float width = 1.0f;     // 0.0 to 1.0 (sweep width)
};

SweepBiasParams sweepBiasA;
SweepBiasParams sweepBiasB;
```

### Implementation Details

**Current Frequency Mapping:**
```cpp
float t = (modSignal + 1.0f) * 0.5f;  // Map -1..1 to 0..1
float freq = minFreq * std::pow(maxFreq / minFreq, t);
```

**New Frequency Mapping with Bias:**
```cpp
float processWithBias(float modSignal, float center, float width,
                      float minFreq, float maxFreq) {
    // Map modSignal from -1..1 to 0..1
    float t = (modSignal + 1.0f) * 0.5f;

    // Apply center bias: shift the mapping
    // center=0.5 -> no shift (default)
    // center=0.0 -> biased toward low frequencies
    // center=1.0 -> biased toward high frequencies
    t = t * width + (center - width * 0.5f);

    // Clamp to valid range
    t = std::clamp(t, 0.0f, 1.0f);

    // Exponential frequency sweep
    return minFreq * std::pow(maxFreq / minFreq, t);
}
```

**Integration:**
```cpp
// In PhaserStage::processStereo
float freqA = processWithBias(modSignal,
                               sweepBiasA.center,
                               sweepBiasA.width,
                               200.0f, 5000.0f);
```

**Musical Applications:**
- **Low-mid focus**: center=0.3, width=0.5 → sweeps 400-2500 Hz
- **High-only**: center=0.8, width=0.3 → sweeps 3000-4500 Hz (avoid brittleness)
- **Formant-like**: center=0.5, width=0.2 → narrow sweep around 1 kHz

**Test Cases:**
1. Verify center=0.5, width=1.0 = full range (backward compatible)
2. Verify center=0.0 biases to low frequencies
3. Verify center=1.0 biases to high frequencies
4. Verify width=0.0 creates static filter
5. Verify clamping at boundaries

---

## Feature 7: Sample-and-Hold / Random LFO

### Description
Add stepped/random LFO waveforms per phasor for ambient and experimental textures.

### Parameters
```cpp
enum class LFOShape {
    Sine,
    Square,
    SampleAndHold,    // Stepped random
    RandomWalk        // Smooth random
};

// Additional parameters
float s_hRate;        // Rate of S/H updates (Hz)
float randomSmooth;   // Smoothing for RandomWalk (0-1)
```

### Implementation Details

**Sample-and-Hold LFO:**
```cpp
class SampleAndHoldLFO {
public:
    void prepare(double sampleRate) {
        sampleRate_ = sampleRate;
        reset();
    }

    void setRate(float hz) {
        updateRate_ = hz / static_cast<float>(sampleRate_);
    }

    void reset() {
        currentValue_ = 0.0f;
        phase_ = 0.0f;
    }

    inline float processSample() {
        phase_ += updateRate_;

        if (phase_ >= 1.0f) {
            phase_ -= 1.0f;
            // Generate new random value -1 to 1
            currentValue_ = (randomFloat() * 2.0f - 1.0f);
        }

        return currentValue_;
    }

private:
    float currentValue_ = 0.0f;
    float phase_ = 0.0f;
    float updateRate_ = 0.0f;
    double sampleRate_ = 48000.0;

    float randomFloat() {
        // Simple PRNG ( XORShift32 )
        static uint32_t state = 123456789;
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return (state >> 16) / 65536.0f;
    }
};
```

**Random Walk LFO:**
```cpp
class RandomWalkLFO {
public:
    void prepare(double sampleRate) {
        sampleRate_ = sampleRate;
        reset();
    }

    void setRate(float hz) {
        rate_ = hz;
        updateRate_ = hz / static_cast<float>(sampleRate_);
    }

    void setSmoothing(float smooth) {
        // smooth: 0.0 (no smoothing) to 1.0 (heavy smoothing)
        smoothing_ = std::clamp(smooth, 0.0f, 0.999f);
    }

    void reset() {
        currentValue_ = 0.0f;
        targetValue_ = 0.0f;
        phase_ = 0.0f;
    }

    inline float processSample() {
        phase_ += updateRate_;

        if (phase_ >= 1.0f) {
            phase_ -= 1.0f;
            // Generate new random target
            targetValue_ = (randomFloat() * 2.0f - 1.0f);
        }

        // Smooth interpolation toward target
        currentValue_ += (targetValue_ - currentValue_) * (1.0f - smoothing_);

        return currentValue_;
    }

private:
    float currentValue_ = 0.0f;
    float targetValue_ = 0.0f;
    float phase_ = 0.0f;
    float updateRate_ = 0.0f;
    float smoothing_ = 0.9f;
    float rate_ = 1.0f;
    double sampleRate_ = 48000.0;

    float randomFloat() {
        static uint32_t state = 987654321;
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return (state >> 16) / 65536.0f;
    }
};
```

**Integration:**
```cpp
// Extend LFOGenerator to support new shapes
class LFOGenerator {
    // ... existing code ...

    // New members
    SampleAndHoldLFO s_hLFO;
    RandomWalkLFO randomWalkLFO;

    inline float processSample() {
        float output = 0.0f;

        switch (shape_) {
            case LFOShape::Sine:
                output = std::sin(phase);
                break;
            case LFOShape::Square:
                output = (phase < M_PI) ? 1.0f : -1.0f;
                break;
            case LFOShape::SampleAndHold:
                output = s_hLFO.processSample();
                // Don't update phase (S/H has its own timing)
                return output;
            case LFOShape::RandomWalk:
                output = randomWalkLFO.processSample();
                return output;
        }

        // Advance phase (for sine/square only)
        float phaseIncrement = static_cast<float>(2.0 * M_PI * frequency_ / sampleRate_);
        phase += phaseIncrement;
        if (phase >= static_cast<float>(2.0 * M_PI)) {
            phase -= static_cast<float>(2.0 * M_PI);
        }

        return output;
    }
};
```

**Musical Applications:**
- **S/H**: Stepped motion, randomized filter pings, ambient textures
- **Random Walk**: Organic modulation, never-repeating sweeps, evolving pads

**Test Cases:**
1. Verify S/H generates stepped output
2. Verify S/H rate accuracy
3. Verify Random Walk smoothness
4. Verify Random Walk never exceeds [-1, 1]
5. Verify both produce output with different seeds

---

## Feature 8: Analog Drift / Tolerance Mode

### Description
Subtle random modulation added to LFO rate, phase offset, and all-pass coefficients to prevent "too perfect" DSP sound. Especially important for slow sweeps.

### Parameters
```cpp
struct AnalogDriftParams {
    bool enabled = false;
    float amount = 0.02f;    // 0.0 to 0.05 (2% max for subtlety)
    uint32_t seed = 12345;   // For reproducible drift
};

AnalogDriftParams analogDrift;
```

### Implementation Details

**Drift Generator Class:**
```cpp
class AnalogDriftGenerator {
public:
    void prepare(double sampleRate) {
        sampleRate_ = sampleRate;
        reset();
    }

    void setAmount(float amount) {
        amount_ = std::clamp(amount, 0.0f, 0.05f);
    }

    void setSeed(uint32_t seed) {
        rngState_ = seed;
    }

    void reset() {
        phase_ = 0.0f;
    }

    // Get drift modulation for LFO rate (0.9 to 1.1 multiplier)
    inline float getRateDrift() {
        return 1.0f + (randomFloat() * 2.0f - 1.0f) * amount_;
    }

    // Get drift modulation for phase (small offset)
    inline float getPhaseDrift() {
        return (randomFloat() * 2.0f - 1.0f) * amount_ * 0.1f;
    }

    // Get drift for all-pass coefficient
    inline float getCoefficientDrift() {
        return 1.0f + (randomFloat() * 2.0f - 1.0f) * amount_ * 0.5f;
    }

private:
    float amount_ = 0.02f;
    float phase_ = 0.0f;
    uint32_t rngState_ = 12345;
    double sampleRate_ = 48000.0;

    float randomFloat() {
        // XORShift32 PRNG
        rngState_ ^= rngState_ << 13;
        rngState_ ^= rngState_ >> 17;
        rngState_ ^= rngState_ << 5;
        return (rngState_ >> 16) / 65536.0f;
    }
};
```

**Integration into BiPhaseDSP:**
```cpp
// In BiPhaseDSP class
AnalogDriftGenerator driftGenerator_;

// In processing (modulate LFO rate)
float effectiveRateA = rateSmoother_.getCurrent();
if (analogDrift.enabled) {
    effectiveRateA *= driftGenerator_.getRateDrift();
}
lfo1A.setFrequency(effectiveRateA);

// In PhaserStage (modulate all-pass coefficient)
float a = -std::tan(static_cast<float>(M_PI * freq / sampleRate));
if (analogDrift.enabled) {
    a *= driftGenerator_.getCoefficientDrift();
}
```

**Design Considerations:**
- **Very subtle**: Max 5% variation (0.05)
- **Reproducible**: Seed-based for consistent results
- **Musical**: Adds warmth, not warble

**Test Cases:**
1. Verify drift amount clamping (max 5%)
2. Verify seed reproducibility
3. Verify bypass (disabled = no drift)
4. Verify LFO rate drift range
5. Verify coefficient drift doesn't cause instability

---

## Updated Parameter Structure

### Complete BiPhaseParameters with All Features

```cpp
struct BiPhaseParameters {
    // ========== EXISTING PARAMETERS ==========
    // Phasor A controls
    float rateA = 0.5f;
    float depthA = 0.5f;
    float feedbackA = 0.5f;
    LFOShape shapeA = LFOShape::Sine;
    SweepSource sourceA = SweepSource::Generator1;

    // Phasor B controls
    float rateB = 0.5f;
    float depthB = 0.5f;
    float feedbackB = 0.5f;
    LFOShape shapeB = LFOShape::Sine;
    SweepSource sourceB = SweepSource::Generator1;

    // Routing
    RoutingMode routingMode = RoutingMode::OutA;
    SweepSync sweepSync = SweepSync::Normal;

    // ========== NEW FEATURE 1: Manual Phase Offset ==========
    float phaseOffsetA = 0.0f;      // -180.0 to +180.0 degrees
    float phaseOffsetB = 0.0f;      // -180.0 to +180.0 degrees

    // ========== NEW FEATURE 2: Stage Count ==========
    StageCount stageCountA = StageCount::Six;
    StageCount stageCountB = StageCount::Six;

    // ========== NEW FEATURE 3: Feedback Polarity ==========
    FeedbackPolarity feedbackPolarityA = FeedbackPolarity::Positive;
    FeedbackPolarity feedbackPolarityB = FeedbackPolarity::Positive;

    // ========== NEW FEATURE 4: LFO Phase Relationship ==========
    LFOLinkMode lfoLinkMode = LFOLinkMode::Free;
    float lfoLinkOffset = 90.0f;     // 0.0 to 180.0 degrees

    // ========== NEW FEATURE 5: Envelope Follower ==========
    EnvelopeFollowerParams envelopeA;
    EnvelopeFollowerParams envelopeB;

    // ========== NEW FEATURE 6: Center Frequency Bias ==========
    SweepBiasParams sweepBiasA;
    SweepBiasParams sweepBiasB;

    // ========== NEW FEATURE 7: S/H & Random Walk ==========
    // (Already in LFOShape enum, no new params needed)

    // ========== NEW FEATURE 8: Analog Drift ==========
    AnalogDriftParams analogDrift;

    // ========== LEGACY (for backward compatibility) ==========
    float rate = 0.5f;
    float depth = 0.5f;
    float feedback = 0.5f;
    float stereoPhase = 0.0f;
    LFOShape shape = LFOShape::Sine;
};
```

---

## DSP Test Harness Plan

### Test Organization

```
tests/
├── BiPhaseDSPTests.cpp              # Existing tests
├── Feature1_PhaseOffsetTests.cpp    # Feature 1 tests
├── Feature2_StageCountTests.cpp     # Feature 2 tests
├── Feature3_FeedbackPolarityTests.cpp
├── Feature4_LFOLinkTests.cpp
├── Feature5_EnvelopeFollowerTests.cpp
├── Feature6_SweepBiasTests.cpp
├── Feature7_RandomLFOTests.cpp
└── Feature8_AnalogDriftTests.cpp
```

### Test Harness Template

Each feature test file will follow this structure:

```cpp
// Feature Template
TEST_F(BiPhaseDSPTest, FeatureX_BasicFunctionality) {
    // Test that feature works at all
}

TEST_F(BiPhaseDSPTest, FeatureX_ParameterRanges) {
    // Test parameter clamping and validation
}

TEST_F(BiPhaseDSPTest, FeatureX_AudioOutput) {
    // Test actual audio output with test tone
}

TEST_F(BiPhaseDSPTest, FeatureX_Stability) {
    // Test that feature doesn't cause instability
}

TEST_F(BiPhaseDSPTest, FeatureX_Performance) {
    // Test CPU usage (if applicable)
}

TEST_F(BiPhaseDSPTest, FeatureX_Interaction) {
    // Test interaction with other features
}
```

---

## Implementation Order

### Phase 1: Foundation (No DSP changes)
1. Update enums and parameter structures
2. Update `BiPhaseParameters` struct
3. Add parameter setters/getters

### Phase 2: Core DSP Features (High Priority)
4. Feature 1: Manual Phase Offset
5. Feature 2: Stage Count Control
6. Feature 3: Feedback Polarity

### Phase 3: Advanced LFO Features (Medium Priority)
7. Feature 4: LFO Phase Relationship
8. Feature 7: Sample-and-Hold / Random LFO

### Phase 4: Modulation Features (Medium Priority)
9. Feature 5: Envelope Follower

### Phase 5: Polish Features (Low Priority)
10. Feature 6: Center Frequency Bias
11. Feature 8: Analog Drift

### Phase 6: Testing
12. Write comprehensive tests for all features
13. Verify all tests pass
14. Measure performance impact

---

## Backward Compatibility

All new features must:
1. **Default to disabled/neutral values** that don't affect existing sound
2. **Preserve existing parameter ranges** (no breaking changes)
3. **Maintain existing API** (add new methods, don't remove old ones)

**Default Values:**
- `phaseOffsetA/B = 0.0` (no offset)
- `stageCountA/B = StageCount::Six` (classic)
- `feedbackPolarityA/B = Positive` (existing behavior)
- `lfoLinkMode = Free` (existing behavior)
- `envelopeA/B.enabled = false` (bypassed)
- `sweepBiasA/B = {0.5, 1.0}` (full range)
- `LFOShape = Sine` (existing behavior)
- `analogDrift.enabled = false` (bypassed)

---

## Performance Targets

All features must meet these performance goals:

1. **CPU usage**: <5% increase over baseline (single core @ 3GHz)
2. **Memory**: Zero additional heap allocation in audio thread
3. **Determinism**: No branches or loops with data-dependent timing
4. **Stability**: No explosions with extreme parameter settings

---

## Summary

This design document provides a complete roadmap for implementing 8 advanced Bi-Phase features that transform the plugin from a classic emulation into a comprehensive modern phaser while maintaining authenticity and musical value.

**Key Success Criteria:**
- ✅ All 8 features implemented and working
- ✅ Comprehensive DSP test coverage
- ✅ Backward compatible with existing presets
- ✅ Performance targets met
- ✅ Code follows project conventions
- ✅ Documentation complete

**Next Steps:**
1. Review and approve design document
2. Begin Phase 1 implementation (parameter structures)
3. Progress through Phases 2-5
4. Complete Phase 6 (testing and verification)
