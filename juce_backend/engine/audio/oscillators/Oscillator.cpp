#include "Oscillator.h"
#include <algorithm>
#include <numbers>

//==============================================================================
// Oscillator Implementation
//==============================================================================

Oscillator::Oscillator() {
    tempBuffer.setSize(2, 4096);
    reset();
}

void Oscillator::render(float* output, int numSamples) {
    jassert(output != nullptr);
    jassert(numSamples >= 0);

    if (numSamples == 0) return;

    // Update parameters
    smoothParameters();

    // Calculate effective frequency with detune and offset
    effectiveFrequency = smoothedFrequency *
                        centsToRatio(smoothedDetune) *
                        (1.0f + smoothedOffset);

    phaseIncrement = effectiveFrequency * invSampleRate;

    // Generate samples based on waveform
    switch (currentParams.waveform) {
        case Waveform::Sawtooth:
            generateBandlimitedSawtooth(output, numSamples);
            break;
        case Waveform::Square:
            generateBandlimitedSquare(output, numSamples);
            break;
        case Waveform::Triangle:
            generateBandlimitedTriangle(output, numSamples);
            break;
        case Waveform::Sine:
            for (int i = 0; i < numSamples; ++i) {
                output[i] = generateSine(phase) * smoothedAmplitude;
                phase += phaseIncrement;
                if (phase >= 1.0) phase -= 1.0;
            }
            break;
        case Waveform::Pulse:
            for (int i = 0; i < numSamples; ++i) {
                output[i] = generatePulse(phase, smoothedPulseWidth) * smoothedAmplitude;
                phase += phaseIncrement;
                if (phase >= 1.0) phase -= 1.0;
            }
            break;
        case Waveform::Noise:
            for (int i = 0; i < numSamples; ++i) {
                output[i] = generateNoise() * smoothedAmplitude;
                // Noise doesn't advance phase
            }
            break;
    }

    currentOutput = output[numSamples - 1];

    // Update analog drift
    if (currentParams.enableDrift) {
        updateAnalogDrift();
    }
}

void Oscillator::renderStereo(float* leftOutput, float* rightOutput, int numSamples) {
    tempBuffer.setSize(2, numSamples, false, false, true);

    float* leftPtr = tempBuffer.getWritePointer(0);
    float* rightPtr = tempBuffer.getWritePointer(1);

    // Generate mono signal
    render(leftPtr, numSamples);

    // Copy to right channel (can be enhanced with stereo effects later)
    juce::FloatVectorOperations::copy(rightPtr, leftPtr, numSamples);

    // Copy to output buffers
    juce::FloatVectorOperations::copy(leftOutput, leftPtr, numSamples);
    juce::FloatVectorOperations::copy(rightOutput, rightPtr, numSamples);
}

void Oscillator::setParams(const OscillatorParams& params) noexcept {
    targetParams = params;
    paramsChanged = true;
}

void Oscillator::setWaveform(Waveform waveform) noexcept {
    if (currentParams.waveform != waveform) {
        targetParams.waveform = waveform;
        paramsChanged = true;
    }
}

void Oscillator::setFrequency(float frequency) noexcept {
    targetParams.frequency = juce::jlimit(0.1f, 20000.0f, frequency);
    paramsChanged = true;
}

void Oscillator::setAmplitude(float amplitude) noexcept {
    targetParams.amplitude = juce::jlimit(0.0f, 2.0f, amplitude);
    paramsChanged = true;
}

void Oscillator::setDetune(float detuneCents) noexcept {
    targetParams.detune = juce::jlimit(-1200.0f, 1200.0f, detuneCents);
    paramsChanged = true;
}

void Oscillator::setPhaseOffset(float phaseOffset) noexcept {
    targetParams.phaseOffset = juce::jlimit(0.0f, juce::MathConstants<float>::twoPi, phaseOffset);
    paramsChanged = true;
}

void Oscillator::setPulseWidth(float pulseWidth) noexcept {
    targetParams.pulseWidth = juce::jlimit(0.01f, 0.99f, pulseWidth);
    paramsChanged = true;
}

void Oscillator::setOffset(float offset) noexcept {
    targetParams.offset = juce::jlimit(-0.5f, 0.5f, offset);
    paramsChanged = true;
}

void Oscillator::reset() noexcept {
    phase = 0.0;
    phaseIncrement = 0.0;
    effectiveFrequency = 440.0;
    currentOutput = 0.0f;

    smoothedFrequency = 440.0f;
    smoothedAmplitude = 1.0f;
    smoothedDetune = 0.0f;
    smoothedOffset = 0.0f;
    smoothedPulseWidth = 0.5f;

    driftLfoPhase = 0.0f;
    driftCurrentValue = 0.0f;

    syncPhase = 0.0;
    syncTriggered = false;

    paramsChanged = false;
}

void Oscillator::resetPhase() noexcept {
    phase = 0.0;
}

void Oscillator::hardSync() noexcept {
    phase = 0.0;
    syncTriggered = true;
}

void Oscillator::setPitchBend(float bendAmount) noexcept {
    // bendAmount is typically in range [-1, 1], representing +/- 2 semitones
    float bendInCents = bendAmount * 200.0f;
    targetParams.detune = bendInCents;
    paramsChanged = true;
}

void Oscillator::setFrequencyModulation(float modAmount) noexcept {
    // modAmount is typically in range [-1, 1], representing +/- 2 octaves
    float frequencyMod = std::pow(2.0f, modAmount * 2.0f);
    effectiveFrequency = smoothedFrequency * frequencyMod *
                        centsToRatio(smoothedDetune) *
                        (1.0f + smoothedOffset);
}

float Oscillator::centsToRatio(float cents) {
    return std::pow(2.0f, cents / 1200.0f);
}

float Oscillator::midiNoteToFrequency(int midiNote) {
    jassert(midiNote >= 0 && midiNote <= 127);
    return 440.0f * std::pow(2.0f, (midiNote - 69) / 12.0f);
}

float Oscillator::noteToFrequency(int midiNote, float pitchBend) {
    float baseFreq = midiNoteToFrequency(midiNote);
    float bendInCents = pitchBend * 200.0f; // +/- 2 semitones
    return baseFreq * centsToRatio(bendInCents);
}

void Oscillator::setSampleRate(double newSampleRate) {
    sampleRate = static_cast<float>(newSampleRate);
    invSampleRate = 1.0f / sampleRate;

    // Update derived values
    nyquist = sampleRate * 0.5f;
}

float Oscillator::generateSawtooth(double phase) const noexcept {
    return static_cast<float>((phase * 2.0 - 1.0) * 0.8); // 0.8 to avoid clipping
}

float Oscillator::generateSquare(double phase) const noexcept {
    return static_cast<float>((phase < 0.5 ? 1.0 : -1.0) * 0.8);
}

float Oscillator::generateTriangle(double phase) const noexcept {
    return static_cast<float>((phase < 0.5 ?
                              phase * 4.0 - 1.0 :
                              3.0 - phase * 4.0) * 0.8);
}

float Oscillator::generateSine(double phase) const noexcept {
    return std::sin(phase * juce::MathConstants<double>::twoPi) * 0.8f;
}

float Oscillator::generatePulse(double phase, float pulseWidth) const noexcept {
    return static_cast<float>((phase < pulseWidth ? 1.0 : -1.0) * 0.8);
}

float Oscillator::generateNoise() const noexcept {
    return randomGenerator.nextFloat() * 2.0f - 1.0f;
}

void Oscillator::generateBandlimitedSawtooth(float* output, int numSamples) {
    double dt = phaseIncrement;

    for (int i = 0; i < numSamples; ++i) {
        float sample = 0.0f;

        // Generate naive sawtooth
        double naiveSample = phase * 2.0 - 1.0;

        // Apply PolyBLEP for anti-aliasing
        double t = phase;
        sample = static_cast<float>(naiveSample + polyBlep(t, dt));

        output[i] = sample * smoothedAmplitude;

        phase += phaseIncrement;
        if (phase >= 1.0) phase -= 1.0;
    }
}

void Oscillator::generateBandlimitedSquare(float* output, int numSamples) {
    double dt = phaseIncrement;
    float pw = smoothedPulseWidth;

    for (int i = 0; i < numSamples; ++i) {
        float sample = 0.0f;

        // Generate naive square wave
        double naiveSample = (phase < pw ? 1.0 : -1.0);

        // Apply PolyBLEP at both edges
        double t = phase;
        sample = static_cast<float>(naiveSample + polyBlep(t, dt) - polyBlep(std::fmod(t + pw, 1.0), dt));

        output[i] = sample * smoothedAmplitude;

        phase += phaseIncrement;
        if (phase >= 1.0) phase -= 1.0;
    }
}

void Oscillator::generateBandlimitedTriangle(float *output, int numSamples) {
    // Triangle can be generated by integrating a bandlimited square
    generateBandlimitedSquare(output, numSamples);

    // Integrate the square wave to get triangle
    float integrator = 0.0f;
    float dcOffset = 0.0f;

    for (int i = 0; i < numSamples; ++i) {
        integrator += output[i] * phaseIncrement * 2.0f;
        integrator = juce::jlimit(-1.0f, 1.0f, integrator);
        output[i] = integrator * smoothedAmplitude;
    }
}

float Oscillator::polyBlep(double t, double dt) const noexcept {
    // PolyBLEP (Polynomial Band-Limited Step) implementation
    if (t < dt) {
        t /= dt;
        return t + t - t * t - 1.0;
    } else if (t > 1.0 - dt) {
        t = (t - 1.0) / dt;
        return t + t + t * t + 1.0;
    }
    return 0.0;
}

float Oscillator::generateBandlimitedPulse(double phase, float pulseWidth) const noexcept {
    // Generate bandlimited pulse using PolyBLEP
    double naiveSample = (phase < pulseWidth ? 1.0 : -1.0);
    double dt = phaseIncrement;

    double t = phase;
    float sample = static_cast<float>(naiveSample +
                                      polyBlep(t, dt) -
                                      polyBlep(std::fmod(t + pulseWidth, 1.0), dt));

    return sample;
}

float Oscillator::generateDrift() noexcept {
    // Slow LFO for analog drift simulation
    driftLfoPhase += 0.001f; // Very slow rate

    if (driftLfoPhase >= 1.0f) {
        driftLfoPhase -= 1.0f;
    }

    float driftLfo = std::sin(driftLfoPhase * juce::MathConstants<float>::twoPi) * 0.1f;
    float randomComponent = (randomGenerator.nextFloat() - 0.5f) * 0.05f;

    return driftLfo + randomComponent;
}

void Oscillator::updateAnalogDrift() {
    driftCurrentValue = generateDrift();
    effectiveFrequency *= (1.0f + driftCurrentValue * currentParams.driftAmount);
}

void Oscillator::smoothParameters() {
    // Simple 1-pole lowpass filter for parameter smoothing
    const float smoothingCoeff = 0.001f;

    smoothedFrequency += (targetParams.frequency - smoothedFrequency) * smoothingCoeff;
    smoothedAmplitude += (targetParams.amplitude - smoothedAmplitude) * smoothingCoeff;
    smoothedDetune += (targetParams.detune - smoothedDetune) * smoothingCoeff;
    smoothedOffset += (targetParams.offset - smoothedOffset) * smoothingCoeff;
    smoothedPulseWidth += (targetParams.pulseWidth - smoothedPulseWidth) * smoothingCoeff;

    currentParams = targetParams;
    paramsChanged = false;
}

//==============================================================================
// StereoOscillator Implementation
//==============================================================================

StereoOscillator::StereoOscillator() {
    // Initialize oscillators with slight detuning
    leftOsc.setDetune(-stereoDetune / 2.0f);
    rightOsc.setDetune(stereoDetune / 2.0f);

    // Set phase offset for stereo width
    rightOsc.setPhaseOffset(stereoPhaseOffset);
}

void StereoOscillator::render(juce::AudioBuffer<float>& buffer, int startSample, int numSamples) {
    jassert(buffer.getNumChannels() >= 2);
    jassert(startSample >= 0);
    jassert(numSamples >= 0);
    jassert(startSample + numSamples <= buffer.getNumSamples());

    if (numSamples == 0) return;

    float* leftPtr = buffer.getWritePointer(0, startSample);
    float* rightPtr = buffer.getWritePointer(1, startSample);

    // Render both oscillators
    leftOsc.render(leftPtr, numSamples);
    rightOsc.render(rightPtr, numSamples);
}

void StereoOscillator::setSampleRate(double newSampleRate) {
    leftOsc.setSampleRate(newSampleRate);
    rightOsc.setSampleRate(newSampleRate);
}

void StereoOscillator::setWaveform(Oscillator::Waveform waveform) {
    leftOsc.setWaveform(waveform);
    rightOsc.setWaveform(waveform);
}

void StereoOscillator::setFrequency(float frequency) {
    leftOsc.setFrequency(frequency);
    rightOsc.setFrequency(frequency);
}

void StereoOscillator::setAmplitude(float amplitude) {
    leftOsc.setAmplitude(amplitude);
    rightOsc.setAmplitude(amplitude);
}

void StereoOscillator::setDetune(float detuneAmount) {
    stereoDetune = detuneAmount;
    leftOsc.setDetune(-detuneAmount / 2.0f);
    rightOsc.setDetune(detuneAmount / 2.0f);
}

void StereoOscillator::setStereoSpread(float spreadAmount) {
    stereoSpread = juce::jlimit(0.0f, 1.0f, spreadAmount);
    // This could be enhanced with more sophisticated stereo techniques
}

void StereoOscillator::setPhaseOffset(float offset) {
    stereoPhaseOffset = offset;
    rightOsc.setPhaseOffset(offset);
}

void StereoOscillator::reset() {
    leftOsc.reset();
    rightOsc.reset();
}