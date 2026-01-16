# 🎚 FilterGate DSP Upgrade – Dev Handoff

**Channel-Strip Safe, FX-Capable, Deterministic**

**Status:** Approved
**Priority:** High (pre-Apple TV polish)
**Audience:** JUCE / DSP engineers
**Applies to:** FilterGatePureDSP and related channel-strip integration

---

## 0. Executive Summary

The existing FilterGate implementation is conceptually correct but not channel-strip safe due to:
- Per-sample filter coefficient recalculation
- Heap allocation in the audio thread
- Audio-rate modulation where control-rate is sufficient

**The goal is NOT new features.**

The goal is to make FilterGate:
- Safe to exist on every channel strip
- Cheap when idle
- Scalable across many channels
- Still expressive when used creatively

This will be achieved by:

**One optimized DSP core + two update policies (Channel / FX)**

There must be one sound, one algorithm, one codepath.

---

## 1. Non-Negotiable Design Rules

### Rule 1 — One DSP core

There must be exactly one FilterGate DSP implementation.

❌ No FilterGateChannel vs FilterGateFX classes
❌ No duplicated tuning
❌ No compile-time forks

Modes are policy, not code.

### Rule 2 — No heap allocation in audio processing

All buffers must be:
- Stack-based
- Pre-allocated in prepare()
- Or eliminated entirely

No new/delete in process() or processBlock().

### Rule 3 — No per-sample coefficient recomputation

Filter coefficients must be updated at control rate, not audio rate.

Audio-rate trig (sin/cos/sqrt) inside the hot loop is forbidden.

### Rule 4 — Determinism preserved

Given:
- Same input signal
- Same parameters
- Same seed (if applicable)

The output must be identical across runs.

---

## 2. Target Architecture (Locked)

### 2.1 Core DSP (no modes)

```cpp
class FilterGateDSP
{
public:
    void prepare(double sampleRate, int maxBlockSize);
    float processSample(float x);

    void setCutoff(float hz);
    void setResonance(float q);
    void setGateAmount(float g);

private:
    BiquadFilter filter;
    EnvelopeFollower env;

    SmoothedValue<float> cutoffHz;
    SmoothedValue<float> resonance;
};
```

**Responsibilities:**
- Filter math
- Envelope following
- No timing decisions
- No policy logic
- No UI logic

### 2.2 Update Policy (new)

```cpp
struct FilterGatePolicy
{
    int controlIntervalSamples;   // e.g. 32 or 1
    float maxResonance;
    float maxModDepth;
    bool allowExternalSidechain;
};
```

Policies define how often and how far, not what.

### 2.3 Required Policies

**Channel Strip Policy (default)**

```cpp
constexpr FilterGatePolicy ChannelPolicy {
    .controlIntervalSamples = 32,   // ~1 kHz @ 48k
    .maxResonance = 0.7f,
    .maxModDepth = 0.5f,
    .allowExternalSidechain = false
};
```

**FX / Creative Policy**

```cpp
constexpr FilterGatePolicy FXPolicy {
    .controlIntervalSamples = 1,    // audio-rate
    .maxResonance = 1.5f,
    .maxModDepth = 1.0f,
    .allowExternalSidechain = true
};
```

---

## 3. Processing Model (Must Implement)

### 3.1 Control-Rate Modulation

- ADSR
- LFO
- Envelope follower
- Sidechain detector

Must update at control rate, not per sample.

**Example pattern:**

```cpp
if (++controlCounter >= policy.controlIntervalSamples)
{
    updateEnvelope();
    updateModulation();
    updateFilterCoefficients();
    controlCounter = 0;
}
```

Per-sample loop must be multiply + biquad only.

### 3.2 Silence Short-Circuit (Strongly Recommended)

**If:**
- RMS < threshold
- Gate closed
- No modulation active

**Then:**
- Bypass filter math
- Output zero or passthrough

This is critical for generative / sparse material.

---

## 4. Channel Strip Integration Rules

### Placement (fixed)

```
HPF
↓
FilterGate   ← this module
↓
Compressor
↓
EQ
↓
Saturation
↓
Fader
```

### Default State

- Present on every channel
- Disabled by default
- Zero CPU when bypassed

---

## 5. UI / Control Expectations (for context)

**Channel mode:**
- Conservative defaults
- Subtle modulation
- Noise / articification cleanup

**FX mode:**
- Wide ranges
- Aggressive resonance
- Rhythmic effects

UI toggles policy — not DSP.

---

## 6. Testing Requirements (Must Add)

### A. Performance Tests

- N channels (8, 16, 32, 64)
- FilterGate instantiated on all
- Verify CPU stays within budget

### B. Determinism Tests

- Same input + params → bit-identical output
- Channel vs FX policy must only differ where expected

### C. Safety Tests

- No heap allocs during audio
- No denormals
- No NaNs on extreme params

---

## 7. Explicit Non-Goals

The following are out of scope for this upgrade:
- FFT / spectral gating
- Multiband processing
- Lookahead gating
- Convolution
- AI-driven modulation

Those belong in FX chains, not channel strips.

---

## 8. Definition of Done

This task is complete when:
- FilterGate runs safely on every channel strip
- CPU cost scales linearly and predictably
- No per-sample coefficient updates
- No heap allocation in audio thread
- One DSP implementation, two policies
- Existing sound preserved (or improved)
- Apple TV builds pass performance soak tests

---

## 9. One-Sentence Rule (Remember This)

**FilterGate is a console-grade dynamics processor first, and a creative effect second — never the other way around.**

---

## Next Steps

If you want, next I can:
1. Rewrite your current FilterGate code into this structure
2. Provide a JUCE processBlock() reference implementation
3. Help tune default parameters per instrument type
4. Map Schillinger IR fields (density / articulation) → FilterGate policy automatically
