#include "DiodeLadderFilter.h"
#include <algorithm>
#include <cmath>

//==============================================================================
// DiodeLadderFilter Implementation
//==============================================================================

DiodeLadderFilter::DiodeLadderFilter() {
    reset();
}

void DiodeLadderFilter::process(float* samples, int numSamples) {
    jassert(samples != nullptr);
    jassert(numSamples >= 0);

    if (numSamples == 0) return;

    // Update parameters and coefficients
    smoothParameters();
    if (needsCoefficientUpdate) {
        updateCoefficients();
        needsCoefficientUpdate = false;
    }

    // Process each sample
    for (int i = 0; i < numSamples; ++i) {
        samples[i] = processSample(samples[i]);
    }

    // Update output level meter
    if (numSamples > 0) {
        outputLevel = std::max(outputLevel * 0.99f, std::abs(samples[numSamples - 1]));
    }
}

void DiodeLadderFilter::processStereo(float* leftSamples, float* rightSamples, int numSamples) {
    jassert(leftSamples != nullptr && rightSamples != nullptr);
    jassert(numSamples >= 0);

    if (numSamples == 0) return;

    // Update parameters once for both channels
    smoothParameters();
    if (needsCoefficientUpdate) {
        updateCoefficients();
        needsCoefficientUpdate = false;
    }

    // Process both channels
    for (int i = 0; i < numSamples; ++i) {
        leftSamples[i] = processSample(leftSamples[i]);
        rightSamples[i] = processSample(rightSamples[i]);
    }
}

void DiodeLadderFilter::processAudio(juce::AudioBuffer<float>& buffer, int startSample, int numSamples) {
    jassert(buffer.getNumChannels() >= 1);
    jassert(startSample >= 0 && numSamples >= 0);
    jassert(startSample + numSamples <= buffer.getNumSamples());

    if (numSamples == 0) return;

    int channels = buffer.getNumChannels();

    if (channels == 1) {
        // Mono processing
        float* channelData = buffer.getWritePointer(0, startSample);
        process(channelData, numSamples);
    } else {
        // Multi-channel processing
        for (int ch = 0; ch < channels; ++ch) {
            float* channelData = buffer.getWritePointer(ch, startSample);
            process(channelData, numSamples);
        }
    }
}

void DiodeLadderFilter::setParams(const FilterParams& params) noexcept {
    targetParams = params;
    paramsChanged = true;
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setCutoff(float cutoff) noexcept {
    targetParams.cutoff = juce::jlimit(10.0f, nyquist - 1.0f, cutoff);
    paramsChanged = true;
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setResonance(float resonance) noexcept {
    targetParams.resonance = juce::jlimit(0.0f, 1.0f, resonance);
    paramsChanged = true;
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setDrive(float drive) noexcept {
    targetParams.drive = juce::jlimit(0.1f, 10.0f, drive);
    paramsChanged = true;
}

void DiodeLadderFilter::setMode(FilterMode mode) noexcept {
    if (currentParams.mode != mode) {
        targetParams.mode = mode;
        paramsChanged = true;
        needsCoefficientUpdate = true;
    }
}

void DiodeLadderFilter::setKeyFollow(float keyFollowAmount) noexcept {
    targetParams.keyFollow = juce::jlimit(0.0f, 1.0f, keyFollowAmount);
    paramsChanged = true;
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setDistortionAmount(float amount) noexcept {
    targetParams.distortionAmount = juce::jlimit(0.0f, 1.0f, amount);
    paramsChanged = true;
}

void DiodeLadderFilter::setEnvelopeAmount(float amount) noexcept {
    envelopeAmount = juce::jlimit(0.0f, 4.0f, amount); // Allow up to 4 octaves
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setVelocitySensitivity(float sensitivity) noexcept {
    velocitySensitivity = juce::jlimit(0.0f, 1.0f, sensitivity);
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setNoteFrequency(float frequency) noexcept {
    noteFrequency = juce::jlimit(20.0f, 20000.0f, frequency);
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setCutoffModulation(float modAmount) noexcept {
    cutoffModulation = juce::jlimit(-4.0f, 4.0f, modAmount); // +/- 4 octaves
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::setResonanceModulation(float modAmount) noexcept {
    resonanceModulation = juce::jlimit(-1.0f, 1.0f, modAmount);
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::reset() noexcept {
    // Clear filter state
    y1 = y2 = y3 = y4 = 0.0f;
    x1 = 0.0f;

    // Reset current values
    currentCutoff = 1000.0f;
    currentResonance = 0.5f;
    currentDrive = 1.0f;
    outputLevel = 0.0f;

    // Reset smoothed parameters
    smoothedCutoff = 1000.0f;
    smoothedResonance = 0.5f;
    smoothedDrive = 1.0f;
    smoothedOutputGain = 1.0f;

    // Reset modulation
    envelopeAmount = 0.0f;
    velocitySensitivity = 0.0f;
    currentVelocity = 1.0f;
    noteFrequency = 440.0f;

    cutoffModulation = 0.0f;
    resonanceModulation = 0.0f;

    // Reset rungler
    runglerPhase = 0.0f;
    runglerFreq = 0.0f;
    runglerOutput = 0.0f;

    paramsChanged = false;
    needsCoefficientUpdate = true;
}

void DiodeLadderFilter::clearBuffers() noexcept {
    y1 = y2 = y3 = y4 = 0.0f;
    x1 = 0.0f;
}

void DiodeLadderFilter::setSampleRate(double newSampleRate) {
    sampleRate = static_cast<float>(newSampleRate);
    invSampleRate = 1.0f / sampleRate;
    nyquist = sampleRate * 0.5f;
    needsCoefficientUpdate = true;
}

float DiodeLadderFilter::midiNoteToHz(float midiNote) {
    return 440.0f * std::pow(2.0f, (midiNote - 69.0f) / 12.0f);
}

float DiodeLadderFilter::dbToLinear(float db) {
    return std::pow(10.0f, db / 20.0f);
}

float DiodeLadderFilter::processSample(float input) noexcept {
    // Apply input drive
    float drivenInput = input * currentDrive;

    // Apply distortion if enabled
    if (currentParams.enableDistortion) {
        processDistortion(drivenInput);
    }

    // Process through filter based on mode
    float output;
    switch (currentParams.mode) {
        case FilterMode::LowPass:
            output = processLowPass(drivenInput);
            break;
        case FilterMode::HighPass:
            output = processHighPass(drivenInput);
            break;
        case FilterMode::BandPass:
            output = processBandPass(drivenInput);
            break;
        case FilterMode::Notch:
            output = processNotch(drivenInput);
            break;
        default:
            output = processLowPass(drivenInput);
            break;
    }

    // Apply output gain
    output *= currentParams.outputGain;

    // Update rungler for character
    runglerOutput = rungler(output, currentCutoff);

    return output;
}

void DiodeLadderFilter::updateCoefficients() noexcept {
    // Calculate effective cutoff with all modulations
    float baseCutoff = smoothedCutoff;

    // Apply key follow
    if (targetParams.keyFollow > 0.0f && noteFrequency > 0.0f) {
        float keyFollowAmount = std::log2(noteFrequency / 440.0f) * 1200.0f; // cents
        baseCutoff *= std::pow(2.0f, keyFollowAmount * targetParams.keyFollow / 1200.0f);
    }

    // Apply envelope modulation
    if (envelopeAmount > 0.0f) {
        baseCutoff *= std::pow(2.0f, envelopeAmount * currentVelocity);
    }

    // Apply velocity sensitivity
    if (velocitySensitivity > 0.0f) {
        baseCutoff *= (1.0f + velocitySensitivity * (currentVelocity - 1.0f));
    }

    // Apply cutoff modulation
    if (cutoffModulation != 0.0f) {
        baseCutoff *= std::pow(2.0f, cutoffModulation);
    }

    // Clamp to valid range
    currentCutoff = juce::jlimit(10.0f, nyquist - 1.0f, baseCutoff);

    // Calculate effective resonance
    currentResonance = juce::jlimit(0.0f, 0.99f, smoothedResonance + resonanceModulation * 0.5f);

    // Calculate diode ladder coefficients
    float omega = juce::MathConstants<float>::twoPi * currentCutoff * invSampleRate;
    float tan_omega_2 = std::tan(omega * 0.5f);

    // This is the key to the diode ladder character
    g = tan_omega_2 / (1.0f + tan_omega_2);
    g2 = g * g;
    g3 = g2 * g;
    g4 = g3 * g;

    // Feedback calculation for resonance
    feedback = currentResonance * 4.0f;

    // Compensate for gain loss at high resonance
    float resonanceGain = 1.0f + (currentResonance * currentResonance * 0.5f);
    currentDrive = smoothedDrive * resonanceGain;

    paramsChanged = false;
}

void DiodeLadderFilter::processDistortion(float& sample) const noexcept {
    float amount = currentParams.distortionAmount;
    if (amount <= 0.0f) return;

    // Soft clipping distortion
    float threshold = distortionThreshold;
    float curve = distortionCurve;

    float absSample = std::abs(sample);
    if (absSample > threshold) {
        float sign = (sample >= 0.0f) ? 1.0f : -1.0f;
        float excess = absSample - threshold;

        // Smooth soft clipping
        float distorted = threshold + excess * std::exp(-excess * curve);
        sample = sign * distorted * (1.0f - amount) + sample * amount;
    }
}

float DiodeLadderFilter::rungler(float input, float freq) noexcept {
    // Simple rungler oscillator for character
    runglerFreq = freq * 0.001f; // Very slow modulation
    runglerPhase += runglerFreq * invSampleRate;

    if (runglerPhase >= 1.0f) {
        runglerPhase -= 1.0f;
    }

    // Generate low-frequency modulation
    float modulation = std::sin(runglerPhase * juce::MathConstants<float>::twoPi) * 0.1f;

    return input * (1.0f + modulation);
}

float DiodeLadderFilter::processLowPass(float input) noexcept {
    // 4-stage diode ladder implementation
    // Based on the classic Moog/TB-303 topology

    float hp = input - y4 * feedback;

    // First stage
    float bp1 = hp - y1 * g;
    float lp1 = y1 + bp1 * g;
    y1 = lp1;

    // Second stage
    float bp2 = lp1 - y2 * g;
    float lp2 = y2 + bp2 * g;
    y2 = lp2;

    // Third stage
    float bp3 = lp2 - y3 * g;
    float lp3 = y3 + bp3 * g;
    y3 = lp3;

    // Fourth stage
    float bp4 = lp3 - y4 * g;
    float lp4 = y4 + bp4 * g;
    y4 = lp4;

    return y4;
}

float DiodeLadderFilter::processHighPass(float input) noexcept {
    // High-pass by subtracting low-pass from input
    float lp = processLowPass(input);
    return input - lp;
}

float DiodeLadderFilter::processBandPass(float input) noexcept {
    // Band-pass by difference between stages
    processLowPass(input);
    return y2 - y4; // Difference between 2nd and 4th stage
}

float DiodeLadderFilter::processNotch(float input) noexcept {
    // Notch by mixing input with band-pass
    float bp = processBandPass(input);
    return input - bp * 0.5f; // Mix input with negative band-pass
}

void DiodeLadderFilter::smoothParameters() {
    // Parameter smoothing with 1-pole filters
    const float smoothingCoeff = 0.01f;

    smoothedCutoff += (targetParams.cutoff - smoothedCutoff) * smoothingCoeff;
    smoothedResonance += (targetParams.resonance - smoothedResonance) * smoothingCoeff;
    smoothedDrive += (targetParams.drive - smoothedDrive) * smoothingCoeff;
    smoothedOutputGain += (targetParams.outputGain - smoothedOutputGain) * smoothingCoeff;

    currentParams = targetParams;
}

//==============================================================================
// StereoDiodeLadderFilter Implementation
//==============================================================================

StereoDiodeLadderFilter::StereoDiodeLadderFilter() {
    reset();
}

void StereoDiodeLadderFilter::process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples) {
    jassert(buffer.getNumChannels() >= 2);
    jassert(startSample >= 0 && numSamples >= 0);
    jassert(startSample + numSamples <= buffer.getNumSamples());

    if (numSamples == 0) return;

    float* leftPtr = buffer.getWritePointer(0, startSample);
    float* rightPtr = buffer.getWritePointer(1, startSample);

    // Apply stereo detune if needed
    if (stereoDetune != 0.0f && stereoLink < 1.0f) {
        float leftCutoff = leftFilter.getParams().cutoff * (1.0f - stereoDetune * 0.01f);
        float rightCutoff = rightFilter.getParams().cutoff * (1.0f + stereoDetune * 0.01f);

        leftFilter.setCutoff(leftCutoff);
        rightFilter.setCutoff(rightCutoff);
    }

    // Process both channels
    leftFilter.process(leftPtr, numSamples);
    rightFilter.process(rightPtr, numSamples);
}

void StereoDiodeLadderFilter::setSampleRate(double newSampleRate) {
    leftFilter.setSampleRate(newSampleRate);
    rightFilter.setSampleRate(newSampleRate);
}

void StereoDiodeLadderFilter::setParams(const DiodeLadderFilter::FilterParams& params) {
    if (stereoLink > 0.0f) {
        // Apply to both channels
        leftFilter.setParams(params);
        rightFilter.setParams(params);
    }
}

void StereoDiodeLadderFilter::setCutoff(float cutoff) {
    if (stereoLink > 0.0f) {
        leftFilter.setCutoff(cutoff);
        rightFilter.setCutoff(cutoff);
    }
}

void StereoDiodeLadderFilter::setResonance(float resonance) {
    if (stereoLink > 0.0f) {
        leftFilter.setResonance(resonance);
        rightFilter.setResonance(resonance);
    }
}

void StereoDiodeLadderFilter::setMode(DiodeLadderFilter::FilterMode mode) {
    leftFilter.setMode(mode);
    rightFilter.setMode(mode);
}

void StereoDiodeLadderFilter::setStereoLink(float linkAmount) {
    stereoLink = juce::jlimit(0.0f, 1.0f, linkAmount);
}

void StereoDiodeLadderFilter::setStereoDetune(float detuneAmount) {
    stereoDetune = juce::jlimit(0.0f, 100.0f, detuneAmount);
}

void StereoDiodeLadderFilter::reset() {
    leftFilter.reset();
    rightFilter.reset();
}