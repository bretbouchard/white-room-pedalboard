# Aether String v2 Task Breakdown

## Phase 2.1: Scale & Gesture Parameters (High Impact, Low Risk)

### Task 2.1.1: Add stringLengthMeters Parameter
**Priority**: P0 (Critical)
**Estimated Time**: 2 hours
**Files**: `include/dsp/KaneMarcoAetherStringDSP.h`, `src/dsp/KaneMarcoAetherStringDSP.cpp`

**Steps**:
1. Add `float stringLengthMeters = 0.65f;` to `WaveguideString::Parameters`
2. Add `void setStringLengthMeters(float length);` to `WaveguideString`
3. Implement `applyScalePhysics(float length)` private method
4. Add length-based scaling:
   - `stiffness ↓ as length ↑` (formula: `base / sqrt(length)`)
   - `damping curve reshaped` (HF loss slower, LF sustain longer)
   - `bridgeCoupling ↓` (massive bridge)
5. Add unit tests for length-based parameter scaling

**Success Criteria**:
- [ ] Setting `stringLengthMeters = 12.0f` reduces stiffness by ~4.7x
- [ ] Damping increases from 0.996 to ~0.9995 (10x longer decay)
- [ ] Bridge coupling decreases proportionally

---

### Task 2.1.2: Add pickPosition with Comb Filtering
**Priority**: P0 (Critical)
**Estimated Time**: 3 hours
**Files**: `include/dsp/KaneMarcoAetherStringDSP.h`, `src/dsp/KaneMarcoAetherStringDSP.cpp`

**Steps**:
1. Add `float pickPosition = 0.12f;` to `WaveguideString::Parameters`
2. Add `void setPickPosition(float position);` to `WaveguideString`
3. Implement comb filtering in exciter generation:
   ```cpp
   float pickComb(float input, float pickPos, int harmonicIndex);
   ```
4. Apply comb filter to all excitation types (pick, finger, bow)
5. Add unit tests for comb filter nulls at expected frequencies

**Success Criteria**:
- [ ] Pick position 0.12 (guitar default) produces expected brightness
- [ ] Pick position 0.5 (middle) produces warmer tone with less highs
- [ ] Comb filter nulls match theoretical positions: `f_null = n * f0 / pickPos`

---

### Task 2.1.3: Add stringGauge Macro
**Priority**: P1 (High)
**Estimated Time**: 2 hours
**Files**: `include/dsp/KaneMarcoAetherStringDSP.h`, `src/dsp/KaneMarcoAetherStringDSP.cpp`

**Steps**:
1. Define `enum class StringGauge { Thin, Normal, Thick, Massive };`
2. Add `StringGauge stringGauge = StringGauge::Normal;` to `WaveguideString::Parameters`
3. Add `void setStringGauge(StringGauge gauge);` to `WaveguideString`
4. Implement gauge mapping table:
   - `Thin`: brightness +20%, decay -30%
   - `Normal`: baseline
   - `Thick`: brightness -25%, decay +50%
   - `Massive`: brightness -40%, decay +150%
5. Add unit tests for gauge mappings

**Success Criteria**:
- [ ] `Thick` gauge produces noticeably darker tone
- [ ] `Massive` gauge produces 2.5x longer decay than `Normal`
- [ ] Gauge changes are smooth (no clicks/pops)

---

### Task 2.1.4: Extend Gesture Parameters
**Priority**: P1 (High)
**Estimated Time**: 4 hours
**Files**: `include/dsp/KaneMarcoAetherStringDSP.h`, `src/dsp/KaneMarcoAetherStringDSP.cpp`

**Steps**:
1. Add `GestureParameters` struct to `ArticulationStateMachine`:
   ```cpp
   struct GestureParameters {
       float force = 0.7f;
       float speed = 0.2f;      // Giant-scaled
       float contactArea = 0.6f;
       float roughness = 0.3f;
   };
   ```
2. Extend exciter generators to use gesture parameters:
   - `speed` → attack time (5-50ms normal, 50-500ms giant)
   - `force` → excitation amplitude
   - `contactArea` → bandwidth (wider = less bright)
   - `roughness` → noise component
3. Add `void setGestureParameters(const GestureParameters& params);`
4. Add unit tests for gesture-shaped exciters

**Success Criteria**:
- [ ] `speed = 0.2f` produces 200-500ms attack (vs 20ms for `speed = 0.8f`)
- [ ] `contactArea = 0.8f` produces noticeably darker excitation
- [ ] Gesture changes apply in realtime (no clicks)

---

## Phase 2.2: Shared Bridge & Coupling (Core "Giant" Feel)

### Task 2.2.1: Implement SharedBridgeCoupling Class
**Priority**: P0 (Critical)
**Estimated Time**: 6 hours
**Files**: `src/dsp/SharedBridgeCoupling.cpp`, `include/dsp/SharedBridgeCoupling.h`

**Steps**:
1. Create `SharedBridgeCoupling` class:
   ```cpp
   class SharedBridgeCoupling {
   public:
       void prepare(double sampleRate, int numStrings);
       void reset();

       float addStringEnergy(float stringEnergy, int stringIndex);
       float getBridgeMotion() const;
       float getStringFeedback(int stringIndex) const;

       void setBridgeMass(float mass);  // Scales coupling speed
   private:
       float bridgeMotion = 0.0f;
       std::vector<float> stringEnergy;
       float bridgeMass = 1.0f;
   };
   ```
2. Implement energy accumulation from all strings
3. Implement bridge motion lowpass filter (mass simulation)
4. Implement feedback to strings (optional, light coupling)
5. Add unit tests for multi-string coupling

**Success Criteria**:
- [ ] Playing 2 notes creates audible intermodulation
- [ ] Bridge motion has "weight" (slow attack, slow decay)
- [ ] CPU cost < 0.5% for 6 strings

---

### Task 2.2.2: Integrate Shared Bridge into VoiceManager
**Priority**: P0 (Critical)
**Estimated Time**: 3 hours
**Files**: `src/dsp/KaneMarcoAetherStringDSP.cpp`, `include/dsp/KaneMarcoAetherStringDSP.h`

**Steps**:
1. Add `SharedBridgeCoupling sharedBridge;` to `VoiceManager`
2. Modify `Voice::processBlock()` to send energy to shared bridge
3. Modify `Voice::processBlock()` to receive bridge feedback
4. Add `void enableSharedBridge(bool enable);` to `VoiceManager`
5. Add unit tests for shared bridge with polyphony

**Success Criteria**:
- [ ] Playing a chord creates "bloom" effect (bridge accumulates energy)
- [ ] Releasing one note doesn't kill bridge energy immediately
- [ ] Backward compatible (disabled by default)

---

### Task 2.2.3: Add Cross-String Coupling
**Priority**: P1 (High)
**Estimated Time**: 2 hours
**Files**: `src/dsp/KaneMarcoAetherStringDSP.cpp`

**Steps**:
1. Implement energy transfer between strings via bridge
2. Add coupling coefficient parameter: `float crossStringCoupling = 0.1f;`
3. Ensure energy conservation (no runaway gain)
4. Add unit tests for cross-string modulation

**Success Criteria**:
- [ ] Playing a loud note causes quieter notes to vibrate sympathetically
- [ ] Coupling is subtle but audible (not muddy)
- [ ] No runaway feedback loops

---

### Task 2.2.4: Implement SympatheticStringBank Class
**Priority**: P1 (High)
**Estimated Time**: 8 hours
**Files**: `src/dsp/SympatheticStringBank.cpp`, `include/dsp/SympatheticStringBank.h`

**Steps**:
1. Create `SympatheticStringBank` class:
   ```cpp
   class SympatheticStringBank {
   public:
       void prepare(double sampleRate, SympatheticStringConfig config);
       void reset();

       void exciteFromBridge(float bridgeEnergy);
       float processSample();

       void setTuningMode(TuningMode mode);
   private:
       std::vector<WaveguideString> sympatheticStrings;
       float couplingGain = 0.3f;
   };
   ```
2. Implement tuning modes:
   - `Harmonic`: Octaves, fifths, thirds
   - `Drone`: Fixed drone notes
   - `Custom`: User-defined
3. Implement light damping (very long sustain)
4. Add unit tests for sympathetic strings

**Success Criteria**:
- [ ] Sympathetic strings ring when main strings are played
- [ ] Tuning is accurate (harmonics align)
- [ ] CPU cost < 3% for 6 sympathetic strings

---

### Task 2.2.5: Create Sympathetic String Presets
**Priority**: P2 (Medium)
**Estimated Time**: 2 hours
**Files**: `presets/aether_v2_sympathetic_presets.json`

**Steps**:
1. Define 3-4 sympathetic string configurations:
   - **Harmonic Cloud**: Octaves + fifths (bright halo)
   - **Drone Orchestra**: Fixed drones (foundation)
   - **Resonant Swarm**: Quarter-tone cluster (ethereal)
2. Create JSON preset format
3. Add preset loading to `KaneMarcoAetherStringDSP`
4. Add unit tests for preset loading

**Success Criteria**:
- [ ] All presets load without errors
- [ ] Presets produce distinct, usable sounds
- [ ] Presets are documented with use cases

---

## Phase 2.3: Presets & Polish (Optional)

### Task 2.3.1: Create Giant Instrument Presets
**Priority**: P1 (High)
**Estimated Time**: 6 hours
**Files**: `presets/aether_v2_giant_presets.json`

**Steps**:
1. Design 6 giant instrument presets:
   - **Giant Monochord** (12m, Massive, Bow)
   - **Titan Harp** (8m, Thick, Pick)
   - **Cathedral String** (15m, Massive, Finger)
   - **Stone Bass** (4m, Thick, Pick)
   - **Mythic Drone** (20m+, Massive, Bow)
   - **Colossus Bow** (10m, Thick, Bow)
2. Tune parameters by ear (subjective quality)
3. Document each preset with use cases
4. Add preset loading UI hooks
5. Add unit tests for preset validation

**Success Criteria**:
- [ ] All presets sound "giant" (not just low pitch)
- [ ] Attacks feel slow and heavy
- [ ] Sustains feel inevitable
- [ ] Presets cover different musical use cases

---

### Task 2.3.2: Add Slow Vibrato / Drift Scaling
**Priority**: P2 (Medium)
**Estimated Time**: 4 hours
**Files**: `src/dsp/KaneMarcoAetherStringDSP.cpp`

**Steps**:
1. Add LFO-based vibrato to `WaveguideString`
2. Scale vibrato rate/depth with `stringLengthMeters`:
   - Giant strings → slower vibrato (0.5-2 Hz vs 5-7 Hz)
   - Giant strings → wider depth (more pitch excursion)
3. Add random drift (slow random pitch modulation)
4. Add `void enableSlowVibrato(bool enable);`
5. Add unit tests for vibrato scaling

**Success Criteria**:
- [ ] Giant strings have slower, wider vibrato
- [ ] Vibrato is smooth (no zipper noise)
- [ ] Drift adds organic movement without pitch instability

---

### Task 2.3.3: Environmental Body Presets
**Priority**: P2 (Medium)
**Estimated Time**: 4 hours
**Files**: `include/dsp/KaneMarcoAetherStringDSP.h`, `src/dsp/KaneMarcoAetherStringDSP.cpp`

**Steps**:
1. Add body material presets to `ModalBodyResonator`:
   - **Stone**: Low resonance, fast decay, bright
   - **Wood**: Warm resonance, medium decay
   - **Metal**: High resonance, long decay, bright
   - **Air**: Very low resonance, very long decay
2. Implement `void loadBodyPreset(BodyMaterial material);`
3. Create modal filter parameters for each material
4. Add unit tests for body presets

**Success Criteria**:
- [ ] Stone body sounds "hard" and "cold"
- [ ] Wood body sounds "warm" and "resonant"
- [ ] Metal body sounds "bright" and "sustained"
- [ ] Material changes are smooth (no clicks)

---

### Task 2.3.4: Schillinger Generator Integration
**Priority**: P2 (Medium)
**Estimated Time**: 6 hours
**Files**: `src/dsp/KaneMarcoAetherStringDSP.cpp`, `schillinger/integrations/` (new)

**Steps**:
1. Define Schillinger → DSP parameter mapping:
   ```dart
   {
     "scaleRegime": "giant" → stringLengthMeters = 12.0f
     "gesture": "slow/heavy" → gesture.speed = 0.2f, force = 0.8f
     "energyProfile": "sustained" → params.damping = 0.999f
     "role": "harmonic gravity" → stringGauge = StringGauge::Massive
   }
   ```
2. Create `KaneMarcoAetherStringDSP::setFromSchillinger()` method
3. Add parameter validation (clamp to valid ranges)
4. Add unit tests for Schillinger mappings
5. Document mappings for Schillinger team

**Success Criteria**:
- [ ] Schillinger output correctly maps to DSP parameters
- [ ] All parameters are clamped to valid ranges
- [ ] Mapping is documented and testable

---

## Testing Strategy

### Unit Tests (All Tasks)
- **File**: `tests/dsp/AetherStringV2Tests.cpp`
- **Coverage**: All new methods + parameter mappings
- **Automation**: Run in CI/CD pipeline

### Integration Tests
- **File**: `tests/dsp/GiantInstrumentValidation.cpp`
- **Coverage**: End-to-end feature tests
- **Validation**: Subjective quality criteria

### CPU Performance Tests
- **File**: `tests/dsp/AetherStringV2Performance.cpp`
- **Target**: < 20% CPU (6 voices + sympathetic @ 48kHz)
- **Benchmark**: Before/after comparison

### Subjective Validation Tests
- **File**: `tests/dsp/GiantInstrumentQuality.cpp`
- **Method**: Listening tests + perceptual validation
- **Criteria**: Success criteria from design doc

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **CPU over budget** | Medium | High | Optimize sympathetic strings, reduce modes |
| **Parameter mapping too complex** | Low | Medium | Keep formulas simple, document thoroughly |
| **Giant presets sound "muddy"** | Medium | High | Tune by ear, add EQ presets |
| **Shared bridge creates feedback** | Low | High | Clamp coupling gains, add safety limits |
| **Sympathetic strings dominate mix** | Medium | Medium | Add level controls, default to low gain |

---

## Rollout Plan

1. **Phase 2.1** (Week 1-2): Scale + gesture parameters
   - Merge to `juce_backend_clean` branch
   - Run full test suite
   - CPU performance validation

2. **Phase 2.2** (Week 3-4): Shared bridge + coupling
   - Feature flag for backward compatibility
   - A/B testing with existing presets
   - Performance profiling

3. **Phase 2.3** (Week 5-6): Presets + polish
   - Subjective quality testing
   - Preset refinement
   - Documentation

4. **Release** (Week 7):
   - Merge to `main`
   - Tag version v2.0.0
   - Update preset library

---

**End of Task Breakdown**
