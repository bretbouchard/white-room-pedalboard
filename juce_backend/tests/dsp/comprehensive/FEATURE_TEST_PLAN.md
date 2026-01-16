# Comprehensive Feature Test Plan for All Instruments

**Date:** 2025-01-13
**Goal:** Test ALL features of ALL instruments with complete coverage

---

## Current Status

All instruments have basic tests (7 tests each), covering:
- ✅ Instrument initialization
- ✅ Basic note on/off
- ✅ Polyphony
- ✅ Sample rate compatibility
- ✅ Stereo output
- ✅ Parameter changes

**Missing:** Comprehensive feature testing

---

## Feature Matrix by Instrument

### Kane Marco (Hybrid VA Synth)

| Feature Category | Features | Test Count |
|------------------|----------|------------|
| **Oscillators** | 5 waveforms, WARP, FM, sub-osc | 15 |
| **Filter** | 4 filter types, cutoff, resonance, key track | 12 |
| **Envelopes** | ADSR + global envelope | 8 |
| **LFOs** | 5 waveforms, rate, depth, fade | 10 |
| **Modulation** | 16-slot matrix, 8 macros | 24 |
| **Polyphony** | Mono, Legato, Poly modes | 6 |
| **Presets** | 30 factory presets load/play | 30 |
| **Performance** | All parameters at extremes | 15 |
| **Total** | | **120 tests** |

### NexSynth (FM Synth)

| Feature Category | Features | Test Count |
|------------------|----------|------------|
| **Operators** | 5 operators, envelope per op | 25 |
| **Algorithms** | 32 FM algorithms | 32 |
| **Frequency** | Ratios, fixed freq, detune, feedback | 20 |
| **Modulation** | Modulation index per op | 10 |
| **Polyphony** | Up to 16 voices | 8 |
| **Presets** | Factory presets | 20 |
| **Performance** | Extreme values | 15 |
| **Total** | | **130 tests** |

### DrumMachine

| Feature Category | Features | Test Count |
|------------------|----------|------------|
| **Voices** | Kick, Snare, HiHat, Clap, Tom, Cymbal, etc. | 35 |
| **Sequencer** | 16 tracks x 16 steps | 20 |
| **Patterns** | Pattern chaining | 8 |
| **Groove** | Swing, flam, roll, probability | 16 |
| **Kits** | Multiple kit types | 10 |
| **Parameters** | Per-voice parameters | 42 |
| **Total** | | **131 tests** |

### SamSampler

| Feature Category | Features | Test Count |
|------------------|----------|------------|
| **Playback** | Sample trigger, loop, one-shot | 12 |
| **Envelope** | ADSR with multiple curves | 16 |
| **Filter** | SVF types, cutoff, resonance | 12 |
| **Pitch** | Base pitch, bend range, transpose | 10 |
| **Zones** | Keyboard mapping | 8 |
| **Modulation** | LFOs, modulation routing | 15 |
| **Total** | | **73 tests** |

### LocalGal

| Feature Category | Features | Test Count |
|------------------|----------|------------|
| **Oscillators** | Waveforms, detune, mix | 12 |
| **Filter** | Multi-mode, envelopes | 15 |
| **Envelope** | ADSR, times, levels | 12 |
| **Effects** | Built-in effects | 10 |
| **Modulation** | Routing matrix | 15 |
| **Total** | | **64 tests** |

### Giant Instruments (AetherGiant*)

| Feature Category | Features | Test Count |
|------------------|----------|------------|
| **Drums** | Membrane resonator, coupling | 25 |
| **Voice** | Formant filter, vibrato | 20 |
| **Horns** | Physical modeling | 18 |
| **Percussion** | Modal bank, decay | 20 |
| **Total** | | **83 tests** |

### Kane Marco Aether Family

| Feature Category | Features | Test Count |
|------------------|----------|------------|
| **Aether** | Exciter, resonator, feedback | 30 |
| **String** | String model, pedalboard | 35 |
| **Total** | | **65 tests** |

---

## Grand Total

**678 comprehensive feature tests** across all instruments

---

## Implementation Strategy

### Phase 1: Test Infrastructure (1-2 hours)

Create reusable test utilities:
```cpp
// tests/dsp/FeatureTestUtilities.h
class FeatureTestSuite {
    // Helper to test all enum values
    template<typename Enum>
    void testAllEnumValues(auto instrument, auto setter, auto getter);

    // Helper to test parameter ranges
    void testParameterRange(auto instrument, std::string param,
                             float min, float max);

    // Helper for audio analysis
    bool hasSignal(float* buffer, int size);
    float getPeakLevel(float* buffer, int size);
    float getSpectralCentroid(float* buffer, int size);
};
```

### Phase 2: Per-Instrument Tests (6-8 hours)

For each instrument:
1. Enumerate all features from header files
2. Create comprehensive test file
3. Test each feature systematically
4. Document expected behavior

### Phase 3: Integration & Reporting (1 hour)

- Generate test coverage report
- Identify gaps
- Create feature verification matrix

---

## Test File Structure

```
tests/dsp/comprehensive/
├── KaneMarcoFeaturesTest.cpp      (120 tests)
├── NexSynthFeaturesTest.cpp        (130 tests)
├── DrumMachineFeaturesTest.cpp     (131 tests)
├── SamSamplerFeaturesTest.cpp      (73 tests)
├── LocalGalFeaturesTest.cpp        (64 tests)
├── GiantInstrumentsFeaturesTest.cpp (83 tests)
├── KaneMarcoAetherFeaturesTest.cpp (65 tests)
└── FeatureTestUtilities.h
```

---

## Example: Kane Marco Oscillator Tests

```cpp
// Test all 5 waveforms
TEST(KaneMarcoOscillators, AllWaveforms)
{
    for (int wf = 0; wf < 5; ++wf) {
        KaneMarcoPureDSP synth;
        synth.prepare(48000.0, 512);
        synth.setParameter("osc1Waveform", wf);
        // Trigger and verify output
        // Each waveform should have distinct spectral characteristics
    }
}

// Test WARP across full range
TEST(KaneMarcoOscillators, FullWarpRange)
{
    for (float w = -1.0f; w <= 1.0f; w += 0.1f) {
        // Verify oscillator produces output
        // Verify no artifacts at extreme values
    }
}

// Test FM synthesis
TEST(KaneMarcoOscillators, FMSynthesis)
{
    // Test as carrier
    // Test as modulator
    // Test FM depth range
    // Test with different modulator waveforms
}
```

---

## Priority Order

1. **Kane Marco** - Most complex synth (120 tests)
2. **NexSynth** - FM synthesis needs verification (130 tests)
3. **DrumMachine** - Many voices to test (131 tests)
4. **SamSampler** - Sample playback critical (73 tests)
5. **LocalGal** - Foundation instrument (64 tests)
6. **Giant Instruments** - Physical modeling (83 tests)
7. **Kane Marco Aether** - Already mostly tested (65 tests)

---

## Success Criteria

- [ ] All 678 feature tests implemented
- [ ] All tests pass
- [ ] 100% feature coverage documented
- [ ] Test execution time < 5 minutes total
- [ ] Memory safety verified (no leaks)
- [ ] Realtime safety verified (no allocations in audio thread)

---

## Next Steps

**Option 1:** Create all 678 tests (8-10 hours of work)
**Option 2:** Create tests for most critical instruments first (3-4 hours)
**Option 3:** Create test framework + one example, then multiply (4-5 hours)

Which approach would you prefer?

---

*Generated with [Claude Code](https://claude.com/claude-code)*
*Co-Authored-By: Claude <noreply@anthropic.com>*
