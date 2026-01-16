#include "ADSREnvelope.h"
#include <algorithm>
#include <cmath>

//==============================================================================
// ADSREnvelope Implementation
//==============================================================================

ADSREnvelope::ADSREnvelope() {
    reset();
}

float ADSREnvelope::getNextValue() noexcept {
    switch (currentStage) {
        case EnvelopeStage::Idle:
            updateIdle();
            break;
        case EnvelopeStage::Attack:
            updateAttack();
            break;
        case EnvelopeStage::Decay:
            updateDecay();
            break;
        case EnvelopeStage::Sustain:
            updateSustain();
            break;
        case EnvelopeStage::Release:
            updateRelease();
            break;
    }

    // Apply audio rate modulation
    if (modulationAmount != 0.0f) {
        modulationPhase += 0.001f;
        if (modulationPhase >= 1.0f) {
            modulationPhase -= 1.0f;
        }
        float modulation = std::sin(modulationPhase * juce::MathConstants<float>::twoPi) * modulationAmount;
        currentValue *= (1.0f + modulation);
    }

    // Update performance monitoring
    peakValue = std::max(peakValue, currentValue);
    averageValue = (averageValue * samplesProcessed + currentValue) / (samplesProcessed + 1);
    samplesProcessed++;

    return currentValue;
}

void ADSREnvelope::processBlock(float* output, int numSamples) noexcept {
    jassert(output != nullptr);
    jassert(numSamples >= 0);

    for (int i = 0; i < numSamples; ++i) {
        output[i] = getNextValue();
    }
}

void ADSREnvelope::processStereo(float* leftOutput, float* rightOutput, int numSamples) noexcept {
    jassert(leftOutput != nullptr && rightOutput != nullptr);
    jassert(numSamples >= 0);

    for (int i = 0; i < numSamples; ++i) {
        float value = getNextValue();
        leftOutput[i] = value;
        rightOutput[i] = value;
    }
}

void ADSREnvelope::noteOn(int midiNote, float velocity, bool accent) {
    jassert(midiNote >= 0 && midiNote <= 127);
    jassert(velocity >= 0.0f && velocity <= 1.0f);

    currentVelocity = velocity;
    currentAccent = accent;

    // Apply velocity and accent to parameters
    applyVelocityAndAccent();

    // Reset progress and start attack stage
    stageProgress = 0.0f;
    currentValue = 0.0f;
    startStage(EnvelopeStage::Attack);

    noteOnTime = std::chrono::high_resolution_clock::now();
}

void ADSREnvelope::noteOff() {
    if (currentStage != EnvelopeStage::Idle && currentStage != EnvelopeStage::Release) {
        releaseStartValue = currentValue;
        startStage(EnvelopeStage::Release);
    }
}

void ADSREnvelope::allNotesOff() {
    reset();
}

void ADSREnvelope::reset() noexcept {
    currentStage = EnvelopeStage::Idle;
    currentValue = 0.0f;
    targetValue = 0.0f;
    stageProgress = 0.0f;

    currentVelocity = 1.0f;
    currentAccent = false;

    peakValue = 0.0f;
    averageValue = 0.0f;
    samplesProcessed = 0;

    modulationPhase = 0.0f;

    attackStartValue = 0.0f;
    attackTargetValue = 1.0f;
    decayStartValue = 1.0f;
    decayTargetValue = 0.7f;
    releaseStartValue = 0.7f;

    paramsChanged = false;
    needsRecalculation = true;
}

void ADSREnvelope::setParams(const ADSRParams& params) noexcept {
    targetParams = params;
    paramsChanged = true;
    needsRecalculation = true;
}

void ADSREnvelope::setAttack(float attackTime) noexcept {
    targetParams.attack = juce::jlimit(0.001f, 10.0f, attackTime);
    paramsChanged = true;
    needsRecalculation = true;
}

void ADSREnvelope::setDecay(float decayTime) noexcept {
    targetParams.decay = juce::jlimit(0.001f, 10.0f, decayTime);
    paramsChanged = true;
    needsRecalculation = true;
}

void ADSREnvelope::setSustain(float sustainLevel) noexcept {
    targetParams.sustain = juce::jlimit(0.0f, 1.0f, sustainLevel);
    paramsChanged = true;
    needsRecalculation = true;
}

void ADSREnvelope::setRelease(float releaseTime) noexcept {
    targetParams.release = juce::jlimit(0.001f, 10.0f, releaseTime);
    paramsChanged = true;
    needsRecalculation = true;
}

void ADSREnvelope::setAttackCurve(float curve) noexcept {
    targetParams.attackCurve = juce::jlimit(0.0f, 1.0f, curve);
    paramsChanged = true;
}

void ADSREnvelope::setDecayCurve(float curve) noexcept {
    targetParams.decayCurve = juce::jlimit(0.0f, 1.0f, curve);
    paramsChanged = true;
}

void ADSREnvelope::setReleaseCurve(float curve) noexcept {
    targetParams.releaseCurve = juce::jlimit(0.0f, 1.0f, curve);
    paramsChanged = true;
}

void ADSREnvelope::setVelocitySensitivity(bool enabled) noexcept {
    targetParams.velocitySensitivity = enabled;
    paramsChanged = true;
}

void ADSREnvelope::setVelocityAmount(float amount) noexcept {
    targetParams.velocityAmount = juce::jlimit(0.0f, 1.0f, amount);
    paramsChanged = true;
}

void ADSREnvelope::setAccentAmount(float amount) noexcept {
    targetParams.accentAmount = juce::jlimit(0.0f, 2.0f, amount);
    paramsChanged = true;
}

void ADSREnvelope::setAttackRate(float rate) {
    float attackTime = rate * 5.0f; // 0-5 seconds
    setAttack(attackTime);
}

void ADSREnvelope::setDecayRate(float rate) {
    float decayTime = rate * 5.0f; // 0-5 seconds
    setDecay(decayTime);
}

void ADSREnvelope::setSustainLevel(float level) {
    setSustain(level);
}

void ADSREnvelope::setReleaseRate(float rate) {
    float releaseTime = rate * 10.0f; // 0-10 seconds
    setRelease(releaseTime);
}

void ADSREnvelope::setSampleRate(double newSampleRate) {
    sampleRate = static_cast<float>(newSampleRate);
    needsRecalculation = true;
}

float ADSREnvelope::getTimeToNextStage() const noexcept {
    switch (currentStage) {
        case EnvelopeStage::Attack:
            return (1.0f - stageProgress) * smoothedAttack;
        case EnvelopeStage::Decay:
            return (1.0f - stageProgress) * smoothedDecay;
        case EnvelopeStage::Sustain:
            return std::numeric_limits<float>::infinity();
        case EnvelopeStage::Release:
            return (1.0f - stageProgress) * smoothedRelease;
        default:
            return 0.0f;
    }
}

float ADSREnvelope::getTotalTimeRemaining() const noexcept {
    float timeRemaining = getTimeToNextStage();

    switch (currentStage) {
        case EnvelopeStage::Attack:
            timeRemaining += smoothedDecay + smoothedRelease;
            break;
        case EnvelopeStage::Decay:
            timeRemaining += smoothedRelease;
            break;
        case EnvelopeStage::Sustain:
            timeRemaining = smoothedRelease; // Only release time
            break;
        default:
            break;
    }

    return timeRemaining;
}

float ADSREnvelope::calculateCurve(float progress, float curveAmount) {
    if (curveAmount <= 0.0f) {
        return progress; // Linear
    } else if (curveAmount >= 1.0f) {
        return progress * progress; // Pure exponential
    } else {
        // Interpolate between linear and exponential
        float linear = progress;
        float exponential = progress * progress;
        return linear * (1.0f - curveAmount) + exponential * curveAmount;
    }
}

float ADSREnvelope::millisecondsToSamples(float ms, float sampleRate) {
    return (ms / 1000.0f) * sampleRate;
}

void ADSREnvelope::updateAttack() noexcept {
    stageProgress += 1.0f / attackRate;

    if (stageProgress >= 1.0f) {
        stageProgress = 1.0f;
        currentValue = attackTargetValue;
        startStage(EnvelopeStage::Decay);
    } else {
        float curvedProgress = calculateCurve(stageProgress, currentParams.attackCurve);
        currentValue = calculateStageValue(curvedProgress, attackStartValue, attackTargetValue, currentParams.attackCurve);
    }
}

void ADSREnvelope::updateDecay() noexcept {
    stageProgress += 1.0f / decayRate;

    if (stageProgress >= 1.0f) {
        stageProgress = 1.0f;
        currentValue = decayTargetValue;
        startStage(EnvelopeStage::Sustain);
    } else {
        float curvedProgress = calculateCurve(stageProgress, currentParams.decayCurve);
        currentValue = calculateStageValue(curvedProgress, decayStartValue, decayTargetValue, currentParams.decayCurve);
    }
}

void ADSREnvelope::updateSustain() noexcept {
    currentValue = effectiveSustain;
    // Sustain stage continues until noteOff()
}

void ADSREnvelope::updateRelease() noexcept {
    stageProgress += 1.0f / releaseRate;

    if (stageProgress >= 1.0f) {
        stageProgress = 1.0f;
        currentValue = 0.0f;
        startStage(EnvelopeStage::Idle);
    } else {
        float curvedProgress = calculateCurve(stageProgress, currentParams.releaseCurve);
        currentValue = calculateStageValue(curvedProgress, releaseStartValue, 0.0f, currentParams.releaseCurve);
    }
}

void ADSREnvelope::updateIdle() noexcept {
    currentValue = 0.0f;
    peakValue = 0.0f;
    averageValue = 0.0f;
    samplesProcessed = 0;
}

void ADSREnvelope::calculateStageRates() noexcept {
    attackRate = timeToSamples(smoothedAttack);
    decayRate = timeToSamples(smoothedDecay);
    releaseRate = timeToSamples(smoothedRelease);

    needsRecalculation = false;
}

void ADSREnvelope::applyVelocityAndAccent() noexcept {
    float velocityFactor = 1.0f;

    if (currentParams.velocitySensitivity) {
        velocityFactor = 0.3f + currentVelocity * currentParams.velocityAmount * 0.7f;
    }

    if (currentAccent) {
        velocityFactor *= currentParams.accentAmount;
    }

    // Apply velocity to envelope parameters
    effectiveSustain = smoothedSustain * velocityFactor;
    attackTargetValue = velocityFactor; // Attack peak affected by velocity

    // Adjust timing slightly with velocity
    float velocityTimeFactor = 1.0f + (1.0f - velocityFactor) * 0.3f;
    attackRate = timeToSamples(smoothedAttack * velocityTimeFactor);
}

float ADSREnvelope::calculateStageValue(float progress, float start, float end, float curve) const noexcept {
    if (curve <= 0.0f) {
        return start + (end - start) * progress; // Linear
    } else {
        // Exponential interpolation
        return start + (end - start) * calculateCurve(progress, curve);
    }
}

float ADSREnvelope::timeToSamples(float time) const noexcept {
    return time * sampleRate;
}

void ADSREnvelope::startStage(EnvelopeStage newStage) noexcept {
    currentStage = newStage;
    stageProgress = 0.0f;
    stageStartTime = std::chrono::high_resolution_clock::now();

    // Reset progress monitoring
    if (newStage == EnvelopeStage::Attack) {
        peakValue = 0.0f;
        averageValue = 0.0f;
        samplesProcessed = 0;
    }
}

//==============================================================================
// StereoADSREnvelope Implementation
//==============================================================================

StereoADSREnvelope::StereoADSREnvelope() {
    reset();
}

void StereoADSREnvelope::process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples) {
    jassert(buffer.getNumChannels() >= 2);
    jassert(startSample >= 0 && numSamples >= 0);
    jassert(startSample + numSamples <= buffer.getNumSamples());

    if (numSamples == 0) return;

    // Create temporary buffers for envelope values
    juce::AudioBuffer<float> tempBuffer(2, numSamples);
    float* leftTemp = tempBuffer.getWritePointer(0);
    float* rightTemp = tempBuffer.getWritePointer(1);

    // Generate envelope values
    leftEnvelope.processBlock(leftTemp, numSamples);

    if (stereoLink > 0.0f) {
        // Apply stereo link
        juce::FloatVectorOperations::copy(rightTemp, leftTemp, numSamples);
    } else {
        // Generate independent right channel
        rightEnvelope.processBlock(rightTemp, numSamples);
    }

    // Apply to output buffer (multiplication)
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch) {
        float* channelData = buffer.getWritePointer(ch, startSample);
        const float* envData = tempBuffer.getReadPointer(ch % 2);

        juce::FloatVectorOperations::multiply(channelData, envData, numSamples);
    }
}

void StereoADSREnvelope::setSampleRate(double newSampleRate) {
    leftEnvelope.setSampleRate(newSampleRate);
    rightEnvelope.setSampleRate(newSampleRate);
}

void StereoADSREnvelope::setParams(const ADSREnvelope::ADSRParams& params) {
    leftEnvelope.setParams(params);
    rightEnvelope.setParams(params);
}

void StereoADSREnvelope::noteOn(int midiNote, float velocity, bool accent) {
    leftEnvelope.noteOn(midiNote, velocity, accent);

    if (stereoLink > 0.0f) {
        rightEnvelope.noteOn(midiNote, velocity, accent);
    } else {
        // Add slight timing offset for stereo width
        float velocityOffset = juce::jlimit(0.0f, 1.0f, velocity + (stereoDetune * 0.1f));
        rightEnvelope.noteOn(midiNote, velocityOffset, accent);
    }
}

void StereoADSREnvelope::noteOff() {
    leftEnvelope.noteOff();
    rightEnvelope.noteOff();
}

void StereoADSREnvelope::setStereoLink(float linkAmount) {
    stereoLink = juce::jlimit(0.0f, 1.0f, linkAmount);
}

void StereoADSREnvelope::setStereoDetune(float detuneAmount) {
    stereoDetune = juce::jlimit(0.0f, 0.5f, detuneAmount);
}

bool StereoADSREnvelope::isActive() const {
    return leftEnvelope.isActive() || rightEnvelope.isActive();
}

float StereoADSREnvelope::getCurrentValue() const {
    return (leftEnvelope.getCurrentValue() + rightEnvelope.getCurrentValue()) * 0.5f;
}

void StereoADSREnvelope::reset() {
    leftEnvelope.reset();
    rightEnvelope.reset();
}

//==============================================================================
// EnvelopeManager Implementation
//==============================================================================

EnvelopeManager::EnvelopeManager() {
    reset();
}

ADSREnvelope& EnvelopeManager::getEnvelope(EnvelopeType type) {
    return envelopes[static_cast<size_t>(type)];
}

const ADSREnvelope& EnvelopeManager::getEnvelope(EnvelopeType type) const {
    return envelopes[static_cast<size_t>(type)];
}

void EnvelopeManager::noteOn(int midiNote, float velocity, bool accent) {
    for (auto& envelope : envelopes) {
        envelope.noteOn(midiNote, velocity, accent);
    }
}

void EnvelopeManager::noteOff() {
    for (auto& envelope : envelopes) {
        envelope.noteOff();
    }
}

void EnvelopeManager::allNotesOff() {
    for (auto& envelope : envelopes) {
        envelope.allNotesOff();
    }
}

void EnvelopeManager::reset() {
    for (auto& envelope : envelopes) {
        envelope.reset();
    }
}

void EnvelopeManager::setEnvelopeParams(EnvelopeType type, const ADSREnvelope::ADSRParams& params) {
    envelopes[static_cast<size_t>(type)].setParams(params);
}

void EnvelopeManager::setSampleRate(double newSampleRate) {
    sampleRate = static_cast<float>(newSampleRate);
    for (auto& envelope : envelopes) {
        envelope.setSampleRate(newSampleRate);
    }
}

void EnvelopeManager::processBlock(juce::AudioBuffer<float>& ampBuffer,
                                   juce::AudioBuffer<float>& filterBuffer,
                                   juce::AudioBuffer<float>& pitchBuffer,
                                   int startSample, int numSamples) {
    // Process amplitude envelope
    envelopes[static_cast<size_t>(EnvelopeType::Amplitude)].processBlock(
        ampBuffer.getWritePointer(startSample), numSamples);

    // Process filter envelope
    envelopes[static_cast<size_t>(EnvelopeType::Filter)].processBlock(
        filterBuffer.getWritePointer(startSample), numSamples);

    // Process pitch envelope
    envelopes[static_cast<size_t>(EnvelopeType::Pitch)].processBlock(
        pitchBuffer.getWritePointer(startSample), numSamples);
}

void EnvelopeManager::loadAcidPreset() {
    // Acid envelope preset - fast attack, medium decay, low sustain, medium release
    ADSREnvelope::ADSRParams acidParams;
    acidParams.attack = 0.001f;    // 1ms
    acidParams.decay = 0.15f;      // 150ms
    acidParams.sustain = 0.1f;     // 10%
    acidParams.release = 0.3f;     // 300ms
    acidParams.velocitySensitivity = true;
    acidParams.velocityAmount = 0.8f;
    acidParams.accentAmount = 2.0f;

    setEnvelopeParams(EnvelopeType::Amplitude, acidParams);

    // Filter envelope - slightly slower
    acidParams.attack = 0.005f;    // 5ms
    acidParams.decay = 0.2f;       // 200ms
    acidParams.sustain = 0.3f;     // 30%
    setEnvelopeParams(EnvelopeType::Filter, acidParams);
}

void EnvelopeManager::loadPadPreset() {
    // Pad envelope preset - slow attack, long decay, high sustain
    ADSREnvelope::ADSRParams padParams;
    padParams.attack = 1.0f;       // 1 second
    padParams.decay = 2.0f;        // 2 seconds
    padParams.sustain = 0.8f;      // 80%
    padParams.release = 3.0f;      // 3 seconds
    padParams.attackCurve = 0.8f;  // More exponential
    padParams.decayCurve = 0.3f;   // Less exponential

    setEnvelopeParams(EnvelopeType::Amplitude, padParams);
    setEnvelopeParams(EnvelopeType::Filter, padParams);
}

void EnvelopeManager::loadLeadPreset() {
    // Lead envelope preset - medium attack, medium decay, medium sustain
    ADSREnvelope::ADSRParams leadParams;
    leadParams.attack = 0.05f;     // 50ms
    leadParams.decay = 0.3f;       // 300ms
    leadParams.sustain = 0.6f;     // 60%
    leadParams.release = 0.5f;     // 500ms
    leadParams.velocitySensitivity = true;
    leadParams.velocityAmount = 0.6f;

    setEnvelopeParams(EnvelopeType::Amplitude, leadParams);
    setEnvelopeParams(EnvelopeType::Filter, leadParams);
}

void EnvelopeManager::loadBassPreset() {
    // Bass envelope preset - fast attack, short decay, low sustain
    ADSREnvelope::ADSRParams bassParams;
    bassParams.attack = 0.01f;     // 10ms
    bassParams.decay = 0.2f;       // 200ms
    bassParams.sustain = 0.2f;     // 20%
    bassParams.release = 0.3f;     // 300ms
    bassParams.velocitySensitivity = true;
    bassParams.velocityAmount = 0.7f;

    setEnvelopeParams(EnvelopeType::Amplitude, bassParams);
    setEnvelopeParams(EnvelopeType::Filter, bassParams);
}