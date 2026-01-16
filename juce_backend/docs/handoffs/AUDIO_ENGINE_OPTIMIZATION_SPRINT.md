# Audio Engine Optimization Sprint

**Sprint Goal:** Make the audio engine boring, predictable, and cheap when idle, without changing sound.

**Duration:** ~5-7 dev days
**Risk Level:** Low (stability + performance only, no features)
**Priority:** High (Apple TV readiness)

---

## Executive Summary

This sprint focuses on **4 high-leverage upgrades** that compound on the FilterGate work:

1. **Channel-Level Silence Short-Circuit** - Massive CPU win for sparse material
2. **FilterGate Upgrade** - Apply policy-based design (already complete)
3. **Dynamics Control-Rate Unification** - Same class of fix as FilterGate
4. **Execution Language Lock** - Prevent architectural backslide
5. **CPU Visibility Hooks** - Protect all gains

**What NOT to do:**
- ❌ No new DSP types
- ❌ No spectral / FFT features
- ❌ No mixer redesign
- ❌ No code moves across repos
- ❌ No UI polish

---

## Task 1: Channel-Level Silence Short-Circuit ⚡ TOP PRIORITY

**Why first:**
This gives the largest CPU win immediately and benefits every channel, including FilterGate, comp, EQ, etc.

**Owner:** Engine / DSP
**Files:** `ConsoleChannelDSP.*`, `ExecutionLane.*`
**Estimate:** 1–1.5 days

### Deliverables
- Channel-wide early-exit when silent & inactive
- No per-module bypass logic
- Audio-thread safe

### Acceptance Criteria
- ✅ Silent channels show ~0 CPU
- ✅ No audio artifacts on resume
- ✅ Automation reactivates channel correctly

### Design Intent
- Bail out once per channel
- Do not check every module
- Avoid branching inside hot loops
- Safe for generative / sparse material

### Implementation

```cpp
void ConsoleChannelDSP::processBlock(AudioBuffer<float>& buffer)
{
    // --- 1. Measure input energy (cheap RMS / peak) ---
    float inputLevel = inputMeter_.process(buffer);

    // --- 2. Determine activity state (control-rate) ---
    bool automationActive = automationState_.isActive();
    bool modulationActive = modulationState_.isActive();
    bool forceActive = channelFlags_.forceActive;

    bool channelIdle =
        (inputLevel < silenceThreshold_) &&
        !automationActive &&
        !modulationActive &&
        !forceActive;

    // --- 3. Early exit (entire channel) ---
    if (channelIdle)
    {
        buffer.clear();            // or passthrough, depending on design
        cpuMonitor_.reportIdle();  // optional
        return;
    }

    // --- 4. Normal channel processing ---
    hpf_.process(buffer);
    filterGate_.process(buffer);
    compressor_.process(buffer);
    eq_.process(buffer);
    saturation_.process(buffer);
    fader_.process(buffer);

    cpuMonitor_.reportActive();
}
```

### Important Notes

**Where to compute RMS:**
- Use a cheap meter (peak or short RMS)
- Control-rate only (once per block)

**Threshold tuning:**
- Start conservative (e.g. −80 dBFS)
- Do not chase "perfect silence"
- False negatives are OK; false positives are not

**Resume behavior:**
- On first non-silent block:
  - Full chain wakes up
  - Smoothed params avoid clicks

### Why This Works So Well
- Most generative sessions are sparse
- Many channels idle most of the time
- This turns "N channels" into "active channels only"
- FilterGate + comp + EQ become free when unused

---

## Task 2: FilterGate Upgrade ✅ COMPLETE

**Why now:**
You already scoped it — this is execution.

**Owner:** DSP
**Files:** `FilterGatePureDSP_v2.h`
**Estimate:** 1.5–2 days
**Status:** ✅ **COMPLETE**

### Deliverables
- ✅ Control-rate coefficient updates
- ✅ No heap allocation in audio thread
- ✅ Policy-based behavior (Channel / FX)
- ✅ Default-off in channel strip

### Acceptance Criteria
- ✅ CPU scales linearly with active channels
- ✅ ChannelStripPolicy safe for "on every strip"
- ✅ Sound parity preserved

---

## Task 3: Dynamics Control-Rate Unification

**Why now:**
FilterGate shouldn't be the only "good citizen."

**Scope limit (important):**
- Touch only the worst offenders
- No tuning changes
- No feature work

**Owner:** DSP
**Files:** `Compressor.*`, `NoiseGate.*`
**Estimate:** 1–1.5 days

### Targets
- **Compressor** - Move coeff/threshold smoothing to control rate
- **Noise gate / expander** - Move envelope detection to control rate
- **Sidechain detectors** - Cache detection values per block slice

### Deliverables
- Move coeff / threshold smoothing to control rate
- Cache values per block slice
- Zero heap allocs

### Pattern to Apply

```cpp
// Before (per-sample, expensive)
for (int i = 0; i < numSamples; ++i)
{
    float gain = compressor.calculateGain(input[i]);  // Trig every sample
    output[i] = input[i] * gain;
}

// After (control-rate, cheap)
if (++controlCounter >= 32)
{
    smoothedThreshold_ = thresholdSmoother_.process();
    targetGain_ = compressor.calculateGainCoefs(smoothedThreshold_);
    controlCounter = 0;
}

for (int i = 0; i < numSamples; ++i)
{
    float gain = gainSmoother_.processSample(targetGain_);
    output[i] = input[i] * gain;
}
```

### Acceptance Criteria
- ✅ No regressions in existing tests
- ✅ CPU drop measurable with many channels
- ✅ No audible difference (determinism preserved)

---

## Task 4: Execution Language Lock

**Why now:**
Prevents architectural backslide while you optimize.

**Owner:** Tech lead
**Files:** New doc + review rule
**Estimate:** 0.5 day

### Deliverables
- `docs/ENGINE_EXECUTION_LANGUAGE.md` (1 page)
- PR review checklist update:
  - ❌ No new "track / composition / transport" APIs
  - ✅ Execution terms only

### Terminology Rules

**✅ Approved (Execution Language):**
- lane
- event
- buffer
- parameter
- schedule
- voiceBus (instead of "track")
- audio host (instead of "DAW integration")

**❌ Deprecated (Server Era Language):**
- track
- song
- composition
- harmony
- rhythm
- transport
- "Backend Server"

### Acceptance Criteria
- ✅ Doc exists
- ✅ Team acknowledges rule
- ✅ No code churn required

---

## Task 5: CPU Visibility Hook

**Why now:**
Protects all gains you just made.

**Owner:** Engine
**Files:** `CPUMonitor.*`, `ConsoleChannelDSP.*`
**Estimate:** 0.5–1 day

### Deliverables
- Per-channel CPU tick counter (rough is fine)
- Debug log or overlay flag when channel exceeds budget
- No UI polish required

### Implementation Sketch

```cpp
class CPUMonitor
{
public:
    void reportChannelProcessing(int channelId, uint64_t cpuTicks)
    {
        uint64_t budget = channelBudgets_[channelId];

        if (cpuTicks > budget)
        {
            // Debug build warning
            DBG("Channel " << channelId << " exceeded CPU budget: "
                << cpuTicks << " > " << budget);

            // Optional: trigger callback
            onChannelOverBudget(channelId, cpuTicks, budget);
        }

        channelUsage_[channelId] = cpuTicks;
    }

private:
    std::unordered_map<int, uint64_t> channelBudgets_;
    std::unordered_map<int, uint64_t> channelUsage_;
};
```

### Acceptance Criteria
- ✅ Can identify "hot" channels in dev builds
- ✅ No impact on release builds
- ✅ CPU budgets tunable per role

---

## Sprint Summary

| Task | Estimate | Status |
|------|----------|--------|
| Channel silence short-circuit | 1–1.5 d | ⏳ TODO |
| FilterGate upgrade | 1.5–2 d | ✅ **COMPLETE** |
| Dynamics control-rate fixes | 1–1.5 d | ⏳ TODO |
| Execution language lock | 0.5 d | ⏳ TODO |
| CPU visibility | 0.5–1 d | ⏳ TODO |
| **Total** | **~5–7 days** | **20% complete** |

---

## Success Metrics

### Quantitative
- **Idle channel CPU:** ~0 cycles (vs current full cost)
- **64-channel session:** < 15% CPU (when mostly idle)
- **No regression:** All existing tests pass

### Qualitative
- **Predictable:** Channel cost is deterministic
- **Scalable:** Linear CPU scaling with active channels
- **Boring:** No surprises, no special cases
- **Safe:** Apple TV soak tests pass

---

## Risk Mitigation

### Low-Risk Approach
- **No new features** - optimization only
- **No tuning changes** - preserve existing sound
- **Incremental validation** - each task independently testable
- **Easy rollback** - clear boundaries per task

### What Could Go Wrong
| Risk | Mitigation |
|------|------------|
| Silence threshold too aggressive | Start conservative (−80 dBFS) |
| Control-rate updates audible | Test with fast sweeps; increase rate if needed |
| Dynamic range changes | A/B testing with reference material |
| Regression in existing material | Comprehensive test suite before/after |

---

## One-Sentence Guidance

**You're in a "make it boring and predictable" phase — not a "make it powerful" phase.**

---

## Next Steps After This Sprint

1. **Validation** - Extended soak tests on Apple TV
2. **Benchmarking** - Document actual CPU gains
3. **Monitoring** - Set up CPU budget dashboards
4. **Documentation** - Update architecture docs
5. **Planning** - Decide when it's safe to add new DSP

---

**End of Sprint Plan**
**Status:** Ready to Execute
**Priority:** High
**Risk:** Low
