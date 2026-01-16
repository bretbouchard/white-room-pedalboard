# LocalGalDSP Phase 2 - GREEN Phase Implementation Start

## Status Update

**Date**: December 25, 2024
**Phase**: 2 GREEN (Implementation)
**Progress**: Foundation Complete

---

## Completed Work

### 1. Test Suite (RED Phase) - 100% Complete

All 36 Phase 2 tests have been written and added to:
- `/Users/bretbouchard/apps/schill/juce_backend/tests/dsp/LocalGalDSPTest.cpp`

**Test Coverage**:
- Pattern Sequencer: 6 tests
- LFO System: 6 tests
- Modulation Matrix: 6 tests
- Parameter Morphing: 4 tests
- Unison Mode: 4 tests
- Effects Chain: 6 tests

**Total Test Count**: 66 tests (30 Phase 1 + 36 Phase 2)

### 2. Header File Updates - 100% Complete

**File**: `/Users/bretbouchard/apps/schill/juce_backend/include/dsp/LocalGalDSP.h`

**Added Structures**:
```cpp
// Pattern Sequencer (lines 238-264)
struct PatternStep { ... };
struct Pattern { ... };

// LFO System (lines 273-296)
struct LFO { ... };

// Modulation Matrix (lines 305-337)
struct ModulationRouting { ... };
class ModulationMatrix { ... };

// Parameter Morphing (lines 346-370)
struct MorphTarget { ... };
class ParameterMorpher { ... };

// Unison Mode (lines 379-385)
struct Unison { ... };

// Effects Chain (lines 394-409)
struct EffectsChain { ... };
```

**Added Member Variables** (lines 517-553):
- `Pattern currentPattern`
- `ModulationMatrix modulationMatrix`
- `ParameterMorpher parameterMorpher`
- `Unison unisonConfig`
- `EffectsChain effectsConfig`
- Delay buffers for effects

**Added Helper Functions** (lines 591-604):
- `applyDistortion()`
- `processDelay()`
- `processReverb()`
- `processEffectsChain()`
- `processPatternSequencer()`
- `renderUnisonVoice()`
- `calculateUnisonDetune()`
- `calculateUnisonPan()`

### 3. Implementation File - Partially Complete

**File**: `/Users/bretbouchard/apps/schill/juce_backend/src/dsp/LocalGalDSP.cpp`

**Added Parameters** (lines 311-500):
- Pattern parameters: 4 params
- LFO parameters: 6 params
- Modulation parameters: 3 params
- Unison parameters: 4 params
- Effects parameters: 9 params
- Morph parameters: 2 params

**Total New Parameters**: 28 parameters

---

## Implementation Roadmap (GREEN Phase)

### Phase 2A: Foundation (Week 1) - NEXT

**Status**: Ready to begin

1. ✅ Add Phase 2 parameters to `createParameterLayout()` (COMPLETE)
2. ⏳ Implement LFO system
   - Add `LFO::generateSample()` implementation
   - Implement 5 waveforms (sine, triangle, saw, square, S&H)
   - Add tempo sync calculation
   - Test LFO output

3. ⏳ Implement ModulationMatrix
   - Add `ModulationMatrix::processLFOs()`
   - Implement `applyModulation()` method
   - Wire up default routing: LFO1 → Filter Cutoff
   - Test modulation with real audio

**Files to Modify**:
- `/Users/bretbouchard/apps/schill/juce_backend/src/dsp/LocalGalDSP.cpp`

**Implementation Details**:

```cpp
// LFO::generateSample() - Add after line 759
float LocalGalDSP::LFO::generateSample(double sampleRate, double hostBPM)
{
    // Calculate rate (Hz or tempo-synced)
    double rateHz = tempoSync
        ? (hostBPM / 60.0) * std::pow(2.0, tempoSyncRate - 2.0)
        : rate;

    double phaseIncrement = (2.0 * juce::MathConstants<double>::pi * rateHz) / sampleRate;
    phaseAccumulator += phaseIncrement;

    // Wrap phase
    while (phaseAccumulator > 2.0 * juce::MathConstants<double>::pi)
        phaseAccumulator -= 2.0 * juce::MathConstants<double>::pi;

    double phase = phaseAccumulator + (phase * juce::MathConstants<double>::pi / 180.0);

    float output = 0.0f;
    switch (waveform)
    {
        case Waveform::Sine:
            output = std::sin(phase);
            break;
        case Waveform::Triangle:
            output = static_cast<float>((2.0 / juce::MathConstants<double>::pi) * std::asin(std::sin(phase)));
            break;
        case Waveform::Sawtooth:
            {
                double t = phase / (2.0 * juce::MathConstants<double>::pi);
                output = static_cast<float>(2.0 * (t - std::floor(t + 0.5)));
            }
            break;
        case Waveform::Square:
            output = (std::sin(phase) >= 0.0) ? 1.0f : -1.0f;
            break;
        case Waveform::SampleAndHold:
            if (phaseAccumulator < phaseIncrement)
            {
                juce::Random random;
                lastSampleHoldValue = random.nextFloat() * 2.0f - 1.0f;
            }
            output = lastSampleHoldValue;
            break;
    }

    return output * depth + offset;
}

void LocalGalDSP::LFO::reset()
{
    phaseAccumulator = 0.0;
    lastSampleHoldValue = 0.0f;
}
```

```cpp
// ModulationMatrix implementation - Add after line 1075
LocalGalDSP::ModulationMatrix::ModulationMatrix()
{
    // Initialize with 3 LFOs
    lfos.resize(3);
    lfoOutputs.resize(3);
    envelopeOutputs.resize(16);  // One per voice
}

void LocalGalDSP::ModulationMatrix::prepare(double sampleRate)
{
    this->sampleRate = sampleRate;
}

void LocalGalDSP::ModulationMatrix::reset()
{
    for (auto& lfo : lfos)
        lfo.reset();

    lfoOutputs.clear();
    envelopeOutputs.clear();
}

void LocalGalDSP::ModulationMatrix::processLFOs(double sampleRate, double hostBPM)
{
    for (size_t i = 0; i < lfos.size(); ++i)
    {
        lfoOutputs.set(i, lfos[i].generateSample(sampleRate, hostBPM));
    }
}

float LocalGalDSP::ModulationMatrix::getModulationValue(const juce::String& source)
{
    if (source.startsWith("LFO"))
    {
        int lfoIndex = source.getLastCharacters(1).getIntValue() - 1;
        if (lfoIndex >= 0 && lfoIndex < lfoOutputs.size())
            return lfoOutputs[lfoIndex];
    }
    else if (source == "Velocity")
    {
        // Velocity is handled per-voice, return 0 for global queries
        return 0.0f;
    }

    return 0.0f;
}

float LocalGalDSP::ModulationMatrix::applyModulation(const juce::String& destination, float baseValue)
{
    float totalModulation = 0.0f;

    for (const auto& routing : routings)
    {
        if (routing.destination == destination)
        {
            float sourceValue = getModulationValue(routing.source);

            if (routing.bipolar)
            {
                // Bipolar: -1 to +1 maps to -amount to +amount
                totalModulation += sourceValue * routing.amount;
            }
            else
            {
                // Unipolar: 0 to 1 maps to 0 to amount
                totalModulation += (sourceValue * 0.5f + 0.5f) * routing.amount;
            }
        }
    }

    return baseValue + totalModulation;
}

void LocalGalDSP::ModulationMatrix::addRouting(const ModulationRouting& routing)
{
    routings.push_back(routing);
}

void LocalGalDSP::ModulationMatrix::clearRoutings()
{
    routings.clear();
}
```

### Phase 2B: Pattern Sequencer (Week 2)

**Tasks**:
4. Implement pattern sequencer timing
5. Add swing calculation
6. Implement probability gating
7. Integrate with MIDI processing

**Implementation Details**:

```cpp
// Pattern sequencer - Add after line 127
void LocalGalDSP::processPatternSequencer(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    if (!patternEnabled || currentPattern.steps.empty())
        return;

    // Get tempo from parameter
    double tempo = getParameterValue("pattern_tempo");
    double swing = getParameterValue("pattern_swing");

    // Calculate samples per step
    double secondsPerBeat = 60.0 / tempo;
    double samplesPerBeat = secondsPerBeat * currentSampleRate;
    double samplesPerStep = samplesPerBeat / 4.0;  // 16th notes

    // Calculate current step
    int currentStep = static_cast<int>(patternPosition / samplesPerStep) % currentPattern.length;

    // Get current step data
    if (currentStep < static_cast<int>(currentPattern.steps.size()))
    {
        const PatternStep& step = currentPattern.steps[currentStep];

        // Check gate
        if (step.gate)
        {
            // Check probability
            if (step.probability >= 1.0 || patternRandom.nextFloat() < step.probability)
            {
                // Calculate timing with swing
                double stepOffset = 0.0;
                if (swing > 0.0 && (currentStep % 2 == 1))
                {
                    // Off-beat: delay by up to 50% (triplet feel)
                    stepOffset = samplesPerStep * swing * 0.5;
                }

                // Add timing offset
                stepOffset += step.timingOffset * samplesPerStep;

                // Trigger note
                int noteToPlay = step.midiNote + static_cast<int>(step.noteOffset);
                float velocity = step.velocity;

                // Create note-on message
                midiMessages.addEvent(
                    juce::MidiMessage::noteOn(1, noteToPlay, static_cast<int>(velocity * 127)),
                    static_cast<int>(stepOffset)
                );
            }
        }
    }

    // Advance pattern position
    advancePatternStep(buffer.getNumSamples());
}

void LocalGalDSP::advancePatternStep(int numSamples)
{
    if (!patternEnabled)
        return;

    double tempo = getParameterValue("pattern_tempo");
    double secondsPerBeat = 60.0 / tempo;
    double samplesPerBeat = secondsPerBeat * currentSampleRate;
    double samplesPerStep = samplesPerBeat / 4.0;  // 16th notes

    patternPosition += numSamples;

    // Wrap around pattern length
    double patternLengthSamples = samplesPerStep * currentPattern.length;
    if (patternPosition >= patternLengthSamples)
        patternPosition = 0.0;
}
```

### Phase 2C: Voice Enhancement (Week 3)

**Tasks**:
8. Implement unison mode rendering
9. Add detune calculation
10. Add pan spread calculation
11. Implement distortion effect
12. Implement delay with feedback
13. Implement reverb using JUCE

**Implementation Details**:

```cpp
// Unison detune calculation - Add after line 604
float LocalGalDSP::calculateUnisonDetune(int voiceIndex, int totalVoices, float detuneRange)
{
    if (totalVoices == 1) return 0.0f;

    // Center voices around 0, spread evenly
    float normalizedPos = static_cast<float>(voiceIndex) / (totalVoices - 1);  // 0 to 1
    float centeredPos = normalizedPos * 2.0f - 1.0f;  // -1 to 1
    return centeredPos * (detuneRange / 2.0f);  // Spread across range
}

float LocalGalDSP::calculateUnisonPan(int voiceIndex, int totalVoices, float spread)
{
    if (totalVoices == 1) return 0.5f;

    float normalizedPos = static_cast<float>(voiceIndex) / (totalVoices - 1);
    return normalizedPos * spread + (1.0f - spread) * 0.5f;
}

// Distortion - Add after line 592
float LocalGalDSP::applyDistortion(float sample, float amount, float type)
{
    if (amount <= 0.0f) return sample;

    float drive = 1.0f + amount * 50.0f;
    int typeInt = static_cast<int>(type);

    switch (typeInt)
    {
        case 0:  // Soft clip (tanh)
            return std::tanh(sample * drive) / drive;

        case 1:  // Hard clip
            {
                float driven = sample * drive;
                return juce::jlimit(-1.0f, 1.0f, driven);
            }

        case 2:  // Fuzz (exponential)
            {
                float absIn = std::abs(sample);
                float sign = (sample >= 0.0f) ? 1.0f : -1.0f;
                float driven = std::pow(absIn * drive, 0.5f);
                return sign * std::min(driven, 1.0f);
            }
    }

    return sample;
}

// Delay - Add after line 593
void LocalGalDSP::processDelay(juce::AudioBuffer<float>& buffer)
{
    float delayTime = getParameterValue("fx_delay_time");
    float feedback = getParameterValue("fx_delay_feedback");
    float mix = getParameterValue("fx_delay_mix");

    if (delayTime <= 0.0f)
        return;

    int delaySamples = static_cast<int>(delayTime * currentSampleRate);

    // Ensure delay buffer is large enough
    int requiredSize = nextPowerOfTwo(delaySamples * 2);
    if (delayBufferLeft.size() < static_cast<size_t>(requiredSize))
    {
        delayBufferLeft.resize(requiredSize, 0.0f);
        delayBufferRight.resize(requiredSize, 0.0f);
    }

    int bufferSize = static_cast<int>(delayBufferLeft.size());

    for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
    {
        int readIndex = (delayWriteIndex - delaySamples + bufferSize) % bufferSize;

        float delayLeft = delayBufferLeft[readIndex];
        float delayRight = delayBufferRight[readIndex];

        // Feedback
        delayBufferLeft[delayWriteIndex] = buffer.getSample(0, sample) + delayLeft * feedback;
        delayBufferRight[delayWriteIndex] = buffer.getSample(1, sample) + delayRight * feedback;

        // Dry/wet mix
        float outLeft = buffer.getSample(0, sample) * (1.0f - mix) + delayLeft * mix;
        float outRight = buffer.getSample(1, sample) * (1.0f - mix) + delayRight * mix;

        buffer.setSample(0, sample, outLeft);
        buffer.setSample(1, sample, outRight);

        delayWriteIndex = (delayWriteIndex + 1) % bufferSize;
    }
}

// Reverb - Add after line 594
void LocalGalDSP::processReverb(juce::AudioBuffer<float>& buffer)
{
    float size = getParameterValue("fx_reverb_size");
    float decay = getParameterValue("fx_reverb_decay");
    float mix = getParameterValue("fx_reverb_mix");

    if (size <= 0.0f)
        return;

    // Configure JUCE reverb
    juce::dsp::Reverb::Parameters params;
    params.roomSize = size;
    params.damping = 0.5f;
    params.wetLevel = mix;
    params.dryLevel = 1.0f - mix;
    params.width = 1.0f;
    params.freezeMode = 0.0f;

    // Get reverb from effects chain
    auto& reverb = masterEffects.get<juce::dsp::Reverb>();
    reverb.setParameters(params);

    // Process
    juce::dsp::AudioBlock<float> block(buffer);
    juce::dsp::ProcessContextReplacing<float> context(block);
    masterEffects.process(context);
}

// Effects chain - Add after line 595
void LocalGalDSP::processEffectsChain(juce::AudioBuffer<float>& buffer)
{
    // Apply distortion first
    float distortionAmount = getParameterValue("fx_distortion_amount");
    float distortionType = getParameterValue("fx_distortion_type");

    if (distortionAmount > 0.0f)
    {
        for (int channel = 0; channel < buffer.getNumChannels(); ++channel)
        {
            for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
            {
                float dry = buffer.getSample(channel, sample);
                float wet = applyDistortion(dry, distortionAmount, distortionType);
                buffer.setSample(channel, sample, wet);
            }
        }
    }

    // Apply delay
    processDelay(buffer);

    // Apply reverb
    processReverb(buffer);
}
```

### Phase 2D: Morphing & Polish (Week 4)

**Tasks**:
14. Implement parameter morphing
15. Update `processBlock()` to use new features
16. Update `renderVoice()` for modulation
17. Run all 66 tests
18. Profile CPU usage
19. Optimize hot paths
20. Ensure < 20% CPU budget

---

## Success Metrics

Phase 2 Complete When:
- ✅ All 66 tests pass
- ✅ Pattern sequencer plays melodies
- ✅ LFO modulates parameters (audible filter sweep)
- ✅ Modulation matrix routes signals
- ✅ Parameter morphing works smoothly
- ✅ Unison creates thick sounds
- ✅ Effects chain processes audio
- ✅ Code compiles with 0 errors
- ✅ CPU < 20% @ 48kHz, 512 samples

---

## Known Issues

### Current Build Status
- Header file updated with Phase 2 structures
- Parameters added to `createParameterLayout()`
- **Next step**: Implement LFO and ModulationMatrix methods

### Expected Compilation Errors
Until implementations are added:
- `LFO::generateSample()` - undefined
- `ModulationMatrix` methods - undefined
- Pattern sequencer methods - undefined
- Effects processing methods - undefined

These will be resolved progressively during GREEN phase.

---

## Next Actions

1. **Implement LFO::generateSample()** (highest priority)
   - Add to LocalGalDSP.cpp after line 759
   - Test LFO output values

2. **Implement ModulationMatrix** (highest priority)
   - Add to LocalGalDSP.cpp after line 1075
   - Wire up LFO1 → Filter routing
   - Test modulation

3. **Update processBlock()**
   - Process LFOs at start of block
   - Apply modulation in renderVoice()
   - Call pattern sequencer

4. **Run Tests**
   - Compile with all implementations
   - Verify LFO tests pass (6 tests)
   - Verify modulation tests pass (6 tests)

---

## References

**Design Document**: `/Users/bretbouchard/apps/schill/juce_backend/LOCAL_GAL_PHASE_2_REPORT.md`

**Test File**: `/Users/bretbouchard/apps/schill/juce_backend/tests/dsp/LocalGalDSPTest.cpp`

**Header**: `/Users/bretbouchard/apps/schill/juce_backend/include/dsp/LocalGalDSP.h`

**Implementation**: `/Users/bretbouchard/apps/schill/juce_backend/src/dsp/LocalGalDSP.cpp`

---

**Report Generated**: December 25, 2024
**Status**: GREEN Phase Implementation Started
**Progress**: Foundation Complete (tests + structures + parameters)
**Next**: Implement LFO and ModulationMatrix
