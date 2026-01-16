# FilterGate Integration Guide

**Full-App Application (Engine → Console → UI → Schillinger)**

**Status:** Ready for Integration
**Priority:** High (Channel-strip safety)
**Applies to:** Engine, Console, UI, and Schillinger teams

---

## 1. Where FilterGate Lives (Authoritative)

### DSP Core (already correct)

```
effects/filtergate/
├── include/dsp/FilterGatePureDSP.h       (original, deprecated)
├── include/dsp/FilterGatePureDSP_v2.h    (NEW, use this)
└── src/dsp/FilterGatePureDSP.cpp
```

**This is the only place FilterGate math belongs.**

- ✅ Correct
- ✅ Isolated
- ✅ Reusable

**No other DSP copy should exist elsewhere.**

---

## 2. How FilterGate Enters the Audio Graph

### A. Channel Strip (Primary Path)

**FilterGate is not an effect plugin in this context — it is a console primitive.**

**Integration point:**

```
console/
├── ConsoleChannelDSP.h
└── ConsoleChannelDSP.cpp
```

**Required ordering (locked):**

```
Input
 → HPF
 → FilterGate   ← integrate here
 → Compressor
 → EQ
 → Saturation
 → Fader
```

**Rule:**
FilterGate is constructed with the channel, not dynamically inserted.

---

### B. Engine-Level Ownership

**In:**

```
engine/AudioEngine.cpp
engine/AudioEngine.h
```

The engine must:
- Allocate FilterGate per channel at prepare time
- Never allocate or destroy it during playback
- Include it in CPU accounting (`monitoring/CPUMonitor.cpp`)

FilterGate must participate in:
- Dropout prevention
- Silence detection
- CPU budget enforcement

---

## 3. Policy Wiring (Channel vs FX)

### Where policy is selected

**Policy is not UI-owned.**

Policy is chosen by:
- Channel role
- Schillinger intent
- Effect slot type

**Location:**

```
effects/dynamics/
├── DynamicsProcessor.h
└── DynamicsEffectsChain.h
```

**Rules:**
- Channel strips → `ChannelStripPolicy`
- FX slots → `FXPolicy`
- Schillinger automation may switch policy only at block boundaries

**No runtime branching inside processSample().**

---

## 4. UI Integration (Frontend + JUCE UI)

### A. Channel Strip UI

**Frontend location:**

```
frontend/src/components/daw/
├── ChannelStrip.tsx
└── EnhancedChannelStrip.tsx
```

**Expose only:**
- Enable / Disable
- Cutoff (macro-scaled)
- Gate Amount
- Sidechain toggle (internal only)

**No resonance knob in channel view.**

---

### B. FX UI (Plugin Chain)

**Frontend location:**

```
frontend/src/components/plugins/
├── PluginChain.tsx
├── PluginSlot.tsx
└── PluginControl.tsx
```

**FX mode exposes:**
- Resonance
- Modulation depth
- Sidechain source
- Rhythmic modulation

**Same DSP, different policy.**

---

## 5. Schillinger System Integration (Critical)

### Where Schillinger touches FilterGate

```
frontend/src/schillinger/core/
├── dynamic-bridge.ts
├── intention-processor.ts
└── sdk-entry.ts
```

### Mapping rules (authoritative)

| Schillinger Concept | FilterGate Action |
|---------------------|-------------------|
| Density ↓ | Increase gate depth |
| Articulation ↑ | Raise cutoff |
| Percussive role | Enable FilterGate |
| Sustained role | Disable or soften |
| Section transition | Policy switch (safe point) |

**Schillinger never controls raw DSP parameters directly.**
It emits intent, which maps to policy + macros.

---

## 6. Automation + Timeline

**Automation lives here:**

```
frontend/src/components/flow/
├── PluginAutomation.tsx
└── NodeInspector.tsx
```

**Rules:**
- FilterGate automation is control-rate
- No per-sample automation lanes
- Quantized to musical grid when Schillinger-driven

---

## 7. Performance & Safety Enforcement

**Must be validated by:**

```
engine/monitoring/CPUMonitor.cpp
engine/safety/DropoutPrevention.cpp
engine/safety/RealtimeSafeDropoutPrevention.cpp
```

FilterGate must:
- Report idle CPU correctly
- Bypass math when disabled
- Never allocate
- Never denormal

---

## 8. What NOT To Do (Important)

❌ Do NOT register FilterGate as a generic plugin
❌ Do NOT allow arbitrary insertion order in channel strips
❌ Do NOT expose raw resonance in channel UI
❌ Do NOT let Schillinger bypass policy rules
❌ Do NOT duplicate DSP under `effects/dynamics/FilterGate.cpp`

---

## 9. Sanity Checklist (Definition of Integrated)

FilterGate is considered fully integrated when:
- ✅ It exists on every channel strip by default
- ✅ It costs ~0 CPU when disabled
- ✅ It is policy-driven, not forked
- ✅ It responds to Schillinger intent
- ✅ UI exposure matches role
- ✅ No DSP duplication exists
- ✅ Apple TV builds pass soak tests

---

## 10. One-Line Mental Model

**FilterGate is a console primitive with FX reach — not an effect pretending to be a console tool.**

---

## Integration Code Examples

### ConsoleChannelDSP Integration

```cpp
class ConsoleChannelDSP
{
public:
    ConsoleChannelDSP()
    {
        // Channel strip mode by default
        filterGate_.setPolicy(DSP::ChannelStripPolicy);
        filterGate_.setEnabled(false);  // Default off
    }

    void prepare(double sampleRate, int maxSamples)
    {
        // Prepare all channel processors
        hpf_.prepare(sampleRate, maxSamples);
        filterGate_.prepare(sampleRate, maxSamples);
        compressor_.prepare(sampleRate, maxSamples);
        eq_.prepare(sampleRate, maxSamples);
        saturation_.prepare(sampleRate, maxSamples);
    }

    void processBlock(juce::AudioBuffer<float>& buffer)
    {
        // Channel strip processing order (locked)
        hpf_.process(buffer);
        filterGate_.process(buffer);
        compressor_.process(buffer);
        eq_.process(buffer);
        saturation_.process(buffer);
        fader_.process(buffer);
    }

private:
    DSP::FilterGateDSP filterGate_;
    BiquadFilter hpf_;
    Compressor compressor_;
    EQ eq_;
    Saturation saturation_;
    Fader fader_;
};
```

### Schillinger Intent Mapping

```cpp
// In Schillinger bridge layer
void SchillingerIntentionProcessor::applyDensityIntent(float density)
{
    // Density 0.0-1.0 → Gate depth
    float gateAmount = juce::jmap(density, 0.0f, 1.0f, 0.0f, -60.0f);
    filterGate_->setGateAmount(gateAmount);

    // Low density = more aggressive gating
    if (density < 0.3f)
    {
        filterGate_->setEnabled(true);
        filterGate_->setGateThreshold(0.3f);
    }
}

void SchillingerIntentionProcessor::applyArticulationIntent(float articulation)
{
    // Articulation 0.0-1.0 → Filter cutoff
    float cutoff = juce::jmap(articulation, 0.0f, 1.0f, 80.0f, 2000.0f);
    filterGate_->setFrequency(cutoff);
}
```

### Policy Selection by Role

```cpp
// In dynamics chain setup
void DynamicsEffectsChain::configureForRole(ChannelRole role)
{
    switch (role)
    {
        case ChannelRole::ChannelStrip:
            filterGate_.setPolicy(DSP::ChannelStripPolicy);
            // Conservative limits for console use
            break;

        case ChannelRole::FXSlot:
            filterGate_.setPolicy(DSP::FXPolicy);
            // Creative freedom for FX
            break;

        case ChannelRole::SchillingerVoice:
            filterGate_.setPolicy(DSP::ChannelStripPolicy);
            // Schillinger gets channel strip safety
            // but intent-driven automation
            break;
    }
}
```

---

## Performance Targets

### CPU Usage (per channel)

| Mode | Control Rate | CPU (active) | CPU (idle) |
|------|--------------|--------------|------------|
| Channel Strip | 32 samples | ~5-10 cycles | ~0 cycles |
| FX | 1 sample | ~20-30 cycles | ~0 cycles |

### Scalability

```
8 channels @ 48kHz:
  Channel Strip mode: ~1-2% CPU
  FX mode: ~3-5% CPU

64 channels @ 48kHz:
  Channel Strip mode: ~8-12% CPU
  FX mode: ~25-30% CPU
```

**With silence short-circuiting:**
- Idle channels: ~0 CPU
- Active channels only pay for what they use

---

## Next Steps

1. **Integrate into ConsoleChannelDSP** - Add FilterGate to channel strip processing
2. **Wire up Schillinger bridge** - Intent → Parameter mapping
3. **Add UI controls** - Channel strip (minimal) + FX (full)
4. **Performance validation** - CPU monitoring, dropout testing
5. **Apple TV soak tests** - Extended runtime validation

---

**End of Integration Guide**
**Status:** Ready for Implementation
