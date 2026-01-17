# Mu-Tron Bi-Phase Dual Phaser Implementation Plan

**Status:** Planning
**Issue:** white_room-267
**Approach:** Iterative (A → B → modes)
**Pattern:** Policy-based DSP (FilterGate style) + UnifiedEffectInterface

---

## Overview

Faithful digital recreation of the Mu-Tron Bi-Phase with two independent 6-stage phase shifters, flexible routing, and comprehensive control.

## Target Architecture

```
juce_backend/effects/biphase/
├── include/dsp/
│   └── BiPhasePureDSP_v2.h          # Policy-based DSP core
├── src/dsp/
│   └── BiPhasePureDSP.cpp           # DSP implementation
├── include/plugin/
│   └── BiPhaseProcessor.h           # JUCE processor wrapper
├── src/plugin/
│   └── BiPhaseProcessor.cpp         # JUCE processor implementation
├── tests/
│   ├── BiPhaseDSPTests.cpp          # DSP unit tests
│   └── BiPhaseIntegrationTests.cpp  # Integration tests
├── presets/
│   └── *.json                       # Factory presets
├── CMakeLists.txt                   # Build configuration
└── README.md                        # Documentation
```

---

## Phase 1: Single Phaser (Phasor A)

### 1.1 Core DSP - All-Pass Filter Cascade

**File:** `BiPhasePureDSP_v2.h`

```cpp
namespace DSP {

//==============================================================================
// All-Pass Filter Stage (First-Order)
//==============================================================================

class AllPassStage
{
public:
    AllPassStage();
    void prepare(double sampleRate);
    void setCoefficient(float coeff);  // Based on sweep frequency
    float processSample(float input);

    void reset() { z1 = 0.0f; }

private:
    float coeff = 0.0f;
    float z1 = 0.0f;  // Single sample delay
};

//==============================================================================
// 6-Stage Phaser (Phasor A)
//==============================================================================

class PhaserStage
{
public:
    struct Parameters {
        float rate = 0.5f;        // 0.1 - 18 Hz
        float depth = 0.8f;       // 0.0 - 1.0 (mapped 1-10)
        float feedback = 0.0f;    // 0.0 - 1.0 (regenerative)
        bool squareWave = false;  // LFO shape
        float baseFreq = 200.0f;  // Base sweep center (Hz)
        float sweepWidth = 2000.0f; // Sweep width (Hz)
    };

    PhaserStage();

    void prepare(double sampleRate);
    void reset();
    void setParameters(const Parameters& params);
    Parameters getParameters() const { return params; }

    float processSample(float input, float lfoValue);

private:
    static constexpr int NUM_STAGES = 6;
    std::array<AllPassStage, NUM_STAGES> stages;

    Parameters params;

    // State
    float lfoPhase = 0.0f;
    double sampleRate_ = 48000.0;
    float feedbackState = 0.0f;

    // Calculate all-pass coefficient from frequency
    float calculateCoefficient(float frequency);
    // Generate LFO value (-1 to 1)
    float generateLFO();
};

} // namespace DSP
```

### 1.2 Policy Configuration

```cpp
//==============================================================================
// Policy Configuration (FilterGate pattern)
//==============================================================================

struct BiPhasePolicy
{
    int controlIntervalSamples;   // Control rate: 1=audio, 32=~1kHz@48k
    float maxFeedback;             // Safety limit for feedback
    float maxDepth;                // Modulation depth limit
    bool allowExternalModulation;  // External CV/pedal support
};

// Predefined policies
constexpr BiPhasePolicy ChannelStripPolicy {
    .controlIntervalSamples = 32,
    .maxFeedback = 0.85f,         // Prevent runaway oscillation
    .maxDepth = 0.9f,
    .allowExternalModulation = false
};

constexpr BiPhasePolicy FXPolicy {
    .controlIntervalSamples = 1,  // Audio-rate
    .maxFeedback = 0.98f,         // Full resonance
    .maxDepth = 1.0f,
    .allowExternalModulation = true
};
```

### 1.3 Controls Mapping

| Mu-Tron Control | Parameter | Range | Implementation |
|----------------|-----------|-------|----------------|
| Rate (1-10) | `rate` | 0.1-18 Hz | LFO frequency |
| Depth (1-10) | `depth` | 0-1 | Sweep width multiplier |
| Feedback (0-10) | `feedback` | 0-0.98 | Regenerative feedback |
| Shape | `squareWave` | bool | LFO waveform |
| Phasor A Sweep | N/A | N/A | LFO source selection |

### 1.4 Tests

```cpp
// BiPhaseDSPTests.cpp
TEST_CASE("Phasor A - Basic Sweep", "[dsp][phaser]") {
    DSP::PhaserStage phaser;
    phaser.prepare(48000.0);

    DSP::PhaserStage::Parameters params;
    params.rate = 1.0f;
    params.depth = 0.5f;
    params.feedback = 0.0f;
    phaser.setParameters(params);

    // Process 1 second of audio
    float input = 1.0f;
    float output = 0.0f;
    for (int i = 0; i < 48000; ++i) {
        output = phaser.processSample(input, 0.0f);
    }

    // Verify output is different from input (phasing occurred)
    REQUIRE(output != Approx(0.0f));
}

TEST_CASE("Phasor A - Feedback", "[dsp][phaser]") {
    // Test regenerative feedback creates resonance peaks
}

TEST_CASE("Phasor A - Square Wave LFO", "[dsp][phaser]") {
    // Test square wave creates discrete jumps
}
```

---

## Phase 2: Dual Phaser (Add Phasor B)

### 2.1 Dual Phaser Core

```cpp
//==============================================================================
// Dual Phaser (Bi-Phase Core)
//==============================================================================

class BiPhaseCore
{
public:
    enum class SweepSource {
        Generator1,
        Generator2,
        Pedal
    };

    struct Parameters {
        // Phasor A
        PhaserStage::Parameters phasorA;

        // Phasor B
        PhaserStage::Parameters phasorB;

        // Routing
        SweepSource phasorASource = SweepSource::Generator1;
        SweepSource phasorBSource = SweepSource::Generator1;
    };

    BiPhaseCore();

    void prepare(double sampleRate);
    void reset();
    void setParameters(const Parameters& params);

    // Process both phasers
    std::pair<float, float> processSample(float inputA, float inputB);

private:
    PhaserStage phasorA_;
    PhaserStage phasorB_;

    // LFO generators
    float lfo1Phase = 0.0f;
    float lfo2Phase = 0.0f;

    double sampleRate_ = 48000.0;

    float generateLFO(int generator, bool squareWave);
};
```

### 2.2 Independent Sweep Rates

- **LFO 1**: Controls Phasor A (rate: 0.1-18 Hz)
- **LFO 2**: Controls Phasor B (rate: 0.1-18 Hz)
- Independent rates create complex two-speed effects

### 2.3 Tests

```cpp
TEST_CASE("Dual Phaser - Independent Rates", "[dsp][phaser]") {
    // Test LFO 1 ≠ LFO 2 creates complex sweep
}

TEST_CASE("Dual Phaser - Synchronized Sweep", "[dsp][phaser]") {
    // Test both phasors on same LFO source
}
```

---

## Phase 3: Routing Modes

### 3.1 Three Operating Modes

```cpp
//==============================================================================
// Routing Modes
//==============================================================================

enum class RoutingMode {
    InA,      // Parallel: Both phasors get Input A
    OutA,     // Series: Phasor B gets Phasor A output
    InB       // Independent: Phasor B gets separate input
};

class BiPhasePureDSP
{
public:
    struct Parameters {
        BiPhaseCore::Parameters core;

        RoutingMode routingMode = RoutingMode::OutA;  // Default series

        // Sweep sync (for stereo effects)
        bool sweepReverse = false;  // Reverse Phasor B direction
    };

    void prepare(double sampleRate);
    void reset();
    void setParameters(const Parameters& params);

    // Stereo output
    void process(float inputA, float inputB,
                 float& outputA, float& outputB);

private:
    BiPhaseCore core_;
    Parameters params_;
};
```

### 3.2 Mode Behaviors

| Mode | Phasor A Input | Phasor B Input | Output A | Output B | Use Case |
|------|---------------|----------------|----------|----------|----------|
| InA (Parallel) | Input A | Input A | Phasor A | Phasor B | Stereo phasing |
| OutA (Series) | Input A | Phasor A Out | Phasor A | Phasor B | 12-stage deep |
| InB (Independent) | Input A | Input B | Phasor A | Phasor B | Two instruments |

### 3.3 Sweep Sync

```cpp
// When both phasors use same LFO source:
if (!sweepReverse) {
    // Normal: Both sweep same direction
    lfoB = lfoA;
} else {
    // Reverse: B sweeps opposite to A (stereo effect)
    lfoB = -lfoA;
}
```

### 3.4 Tests

```cpp
TEST_CASE("Routing - Series Mode", "[dsp][phaser]") {
    // Test 12-stage cascade
}

TEST_CASE("Routing - Parallel Mode", "[dsp][phaser]") {
    // Test stereo output from single input
}

TEST_CASE("Routing - Independent Mode", "[dsp][phaser]") {
    // Test two separate inputs
}

TEST_CASE("Sweep Sync - Reverse", "[dsp][phaser]") {
    // Test opposite LFO phase for stereo
}
```

---

## Phase 4: JUCE Integration

### 4.1 UnifiedEffectInterface Integration

**File:** `include/plugin/BiPhaseProcessor.h`

```cpp
#include "effects/UnifiedEffectInterface.h"
#include "dsp/BiPhasePureDSP_v2.h"

namespace schill {
namespace effects {

class BiPhaseProcessor : public UnifiedEffect
{
public:
    BiPhaseProcessor();

    // UnifiedEffect interface
    void processBlock(juce::AudioBuffer<float>& buffer) override;
    void reset() override;
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;

    EffectInfo getEffectInfo() const override;

    // Parameters
    struct ParameterIDs {
        // Phasor A
        juce::ParameterID rateA{"rate_a", 1};
        juce::ParameterID depthA{"depth_a", 1};
        juce::ParameterID feedbackA{"feedback_a", 1};
        juce::ParameterID shapeA{"shape_a", 1};

        // Phasor B
        juce::ParameterID rateB{"rate_b", 1};
        juce::ParameterID depthB{"depth_b", 1};
        juce::ParameterID feedbackB{"feedback_b", 1};
        juce::ParameterID shapeB{"shape_b", 1};

        // Routing
        juce::ParameterID routingMode{"routing_mode", 1};
        juce::ParameterID sweepSync{"sweep_sync", 1};
    };

private:
    DSP::BiPhasePureDSP<FXPolicy> dsp_;

    // Parameter references
    std::unique_ptr<juce::AudioParameterFloat> rateAParam_;
    std::unique_ptr<juce::AudioParameterFloat> depthAParam_;
    // ... etc
};

} // namespace effects
} // namespace schill
```

### 4.2 Parameter Ranges

```cpp
// Rate: 0.1 Hz to 18 Hz (logarithmic)
NormalisableRange<float> rateRange(0.1f, 18.0f, [](auto& range, auto value) {
    return std::exp(std::log(range.start) + value * (std::log(range.end) - std::log(range.start)));
});

// Depth: 0 to 1 (linear)
NormalisableRange<float> depthRange(0.0f, 1.0f);

// Feedback: 0 to 0.98 (linear, clamped for stability)
NormalisableRange<float> feedbackRange(0.0f, 0.98f);

// Shape: 0 = Sine, 1 = Square
StringArray shapeChoices{"Sine", "Square"};

// Routing Mode: 0 = InA, 1 = OutA, 2 = InB
StringArray routingChoices{"Parallel (In A)", "Series (Out A)", "Independent (In B)"};

// Sweep Sync: 0 = Normal, 1 = Reverse
StringArray syncChoices{"Normal", "Reverse"};
```

---

## Phase 5: Presets

### 5.1 Factory Presets

```json
// presets/BiPhase/01_Double_Deep.json
{
    "name": "Double Deep",
    "description": "Classic 12-stage series phasing",
    "parameters": {
        "rateA": 0.4,
        "depthA": 0.9,
        "feedbackA": 0.3,
        "shapeA": 0,
        "rateB": 0.4,
        "depthB": 0.9,
        "feedbackB": 0.3,
        "shapeB": 0,
        "routingMode": 1,
        "sweepSync": 0
    }
}

// presets/BiPhase/02_Stereo_Swirl.json
{
    "name": "Stereo Swirl",
    "description": "Circular stereo motion",
    "parameters": {
        "rateA": 0.5,
        "depthA": 1.0,
        "feedbackA": 0.6,
        "shapeA": 0,
        "rateB": 0.5,
        "depthB": 1.0,
        "feedbackB": 0.6,
        "shapeB": 0,
        "routingMode": 0,
        "sweepSync": 1
    }
}

// presets/BiPhase/03_Two_Speed.json
{
    "name": "Two Speed",
    "description": "Slow A + fast B for complex sweep",
    "parameters": {
        "rateA": 0.2,
        "depthA": 0.8,
        "feedbackA": 0.7,
        "shapeA": 0,
        "rateB": 3.0,
        "depthB": 0.5,
        "feedbackB": 0.2,
        "shapeB": 0,
        "routingMode": 1,
        "sweepSync": 0
    }
}

// presets/BiPhase/04_Square_Jump.json
{
    "name": "Square Jump",
    "description": "Rhythmic square-wave echo effect",
    "parameters": {
        "rateA": 4.0,
        "depthA": 0.7,
        "feedbackA": 0.8,
        "shapeA": 1,
        "rateB": 4.0,
        "depthB": 0.7,
        "feedbackB": 0.8,
        "shapeB": 1,
        "routingMode": 1,
        "sweepSync": 0
    }
}

// presets/BiPhase/05_Subtle_Shimmer.json
{
    "name": "Subtle Shimmer",
    "description": "Gentle slow phasing",
    "parameters": {
        "rateA": 0.15,
        "depthA": 0.3,
        "feedbackA": 0.0,
        "shapeA": 0,
        "rateB": 0.18,
        "depthB": 0.3,
        "feedbackB": 0.0,
        "shapeB": 0,
        "routingMode": 0,
        "sweepSync": 0
    }
}
```

---

## Build Integration

### CMakeLists.txt

```cmake
# BiPhase Effect
add_library(biphase_DSP OBJECT
    src/dsp/BiPhasePureDSP.cpp
)

target_include_directories(biphase_DSP
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${JUCE_BACKEND_DIR}/include
)

target_compile_features(biphase_DSP PUBLIC cxx_std_20)

# JUCE Processor
add_library(BiPhaseProcessor STATIC
    src/plugin/BiPhaseProcessor.cpp
)

target_link_libraries(BiPhaseProcessor
    PUBLIC
        biphase_DSP
        unified_effects_interface
        juce::juce_audio_processors
)

# Tests
add_executable(BiPhaseDSPTests
    tests/BiPhaseDSPTests.cpp
    tests/BiPhaseIntegrationTests.cpp
)

target_link_libraries(BiPhaseDSPTests
    PRIVATE
        biphase_DSP
        catch2
)

# Include in parent build
target_link_libraries(effect_library INTERFACE BiPhaseProcessor)
```

---

## Testing Strategy

### Unit Tests (DSP Level)
- All-pass filter coefficient calculation
- LFO generation (sine/square)
- Single phaser response
- Feedback stability
- Dual phaser interaction
- Routing mode correctness

### Integration Tests (Effect Level)
- Parameter automation
- Sample rate changes
- Reset/clear behavior
- Preset loading

### Validation Tests
- Frequency response analysis
- Phase response plots
- CPU usage profiling
- Comparison with Bi-Phase manual settings

---

## Success Criteria

### Phase 1 (Phasor A)
- [ ] 6-stage all-pass cascade implemented
- [ ] LFO with sine/square wave
- [ ] Rate (0.1-18 Hz), depth, feedback controls
- [ ] Unit tests pass
- [ ] Audio output verified

### Phase 2 (Phasor B)
- [ ] Independent second phaser
- [ ] Separate LFO 2
- [ ] Independent controls for B
- [ ] Dual-rate effects verified

### Phase 3 (Routing)
- [ ] Three routing modes implemented
- [ ] Sweep sync (norm/rev) working
- [ ] Stereo output verified
- [ ] All mode combinations tested

### Phase 4 (JUCE)
- [ ] UnifiedEffectInterface integration
- [ ] All parameters exposed
- [ ] Automation support
- [ ] Preset system working

### Phase 5 (Polish)
- [ ] Factory presets complete
- [ ] CPU profiling < 2%
- [ ] Documentation complete
- [ ] Demo audio examples

---

## Open Questions

1. **Oversampling**: Classic phasers benefit from 2x oversampling to reduce aliasing. Should we implement this?
2. **Pedal Input**: The original Bi-Phase supported an expression pedal for manual sweep. Do we want MIDI CC or automatable parameter?
3. **LFO Sync**: Should we add tempo sync option (not in original)?

---

## References

- Mu-Tron Bi-Phase Owner's Manual (Soundgas transcription)
- "Design of a Digital Phaser" by V. Zavalishin (2012)
- JUCE dsp module design patterns
- FilterGatePureDSP_v2.h (policy pattern reference)
