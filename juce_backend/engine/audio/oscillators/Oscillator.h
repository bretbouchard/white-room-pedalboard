#pragma once

#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_dsp/juce_dsp.h>
#include <cmath>
#include <array>

/**
 * High-quality oscillator with acid-style offset waveforms
 * Generates classic sawtooth, square, and triangle waves with detuning
 */
class Oscillator {
public:
    enum class Waveform {
        Sawtooth,
        Square,
        Triangle,
        Sine,
        Pulse,
        Noise
    };

    struct OscillatorParams {
        Waveform waveform = Waveform::Sawtooth;
        float frequency = 440.0f;
        float amplitude = 1.0f;
        float detune = 0.0f;          // in cents
        float phaseOffset = 0.0f;     // in radians
        float pulseWidth = 0.5f;      // for pulse waves
        float offset = 0.0f;          // acid-style frequency offset
        float driftAmount = 0.0f;     // analog drift simulation
        bool enableDrift = false;
        bool syncEnabled = false;
        float syncFrequency = 0.0f;
    };

    Oscillator();
    ~Oscillator() = default;

    // Main rendering
    void render(float* output, int numSamples);
    void renderStereo(float* leftOutput, float* rightOutput, int numSamples);

    // Parameter control
    void setParams(const OscillatorParams& params) noexcept;
    const OscillatorParams& getParams() const noexcept { return currentParams; }

    // Individual parameter setters
    void setWaveform(Waveform waveform) noexcept;
    void setFrequency(float frequency) noexcept;
    void setAmplitude(float amplitude) noexcept;
    void setDetune(float detuneCents) noexcept;
    void setPhaseOffset(float phaseOffset) noexcept;
    void setPulseWidth(float pulseWidth) noexcept;
    void setOffset(float offset) noexcept;

    // Reset and sync
    void reset() noexcept;
    void resetPhase() noexcept;
    void hardSync() noexcept;

    // Pitch bend and modulation
    void setPitchBend(float bendAmount) noexcept;
    void setFrequencyModulation(float modAmount) noexcept;

    // Performance monitoring
    float getCurrentOutput() const noexcept { return currentOutput; }
    double getCurrentPhase() const noexcept { return phase; }
    double getEffectiveFrequency() const noexcept { return effectiveFrequency; }
    float getFrequency() const noexcept { return currentParams.frequency; }

    // Sample rate control
    void setSampleRate(double newSampleRate);

    // Static helper methods
    static float centsToRatio(float cents);
    static float midiNoteToFrequency(int midiNote);
    static float noteToFrequency(int midiNote, float pitchBend = 0.0f);

private:
    // Waveform generation methods
    float generateSawtooth(double phase) const noexcept;
    float generateSquare(double phase) const noexcept;
    float generateTriangle(double phase) const noexcept;
    float generateSine(double phase) const noexcept;
    float generatePulse(double phase, float pulseWidth) const noexcept;
    float generateNoise() const noexcept;

    // Band-limited synthesis
    void generateBandlimitedSawtooth(float* output, int numSamples);
    void generateBandlimitedSquare(float* output, int numSamples);
    void generateBandlimitedTriangle(float* output, int numSamples);

    // PolyBLEP implementation for anti-aliased waveforms
    float polyBlep(double t, double dt) const noexcept;
    float generateBandlimitedPulse(double phase, float pulseWidth) const noexcept;

    // Drift and analog simulation
    float generateDrift() noexcept;
    void updateAnalogDrift();

    // Parameter smoothing
    void smoothParameters();

    // Member variables
    OscillatorParams currentParams;
    OscillatorParams targetParams;

    double phase = 0.0f;
    double phaseIncrement = 0.0f;
    double effectiveFrequency = 440.0;
    float currentOutput = 0.0f;

    // Parameter smoothing (1-pole lowpass filters)
    float smoothedFrequency = 440.0f;
    float smoothedAmplitude = 1.0f;
    float smoothedDetune = 0.0f;
    float smoothedOffset = 0.0f;
    float smoothedPulseWidth = 0.5f;

    // Analog drift simulation
    float driftLfoPhase = 0.0f;
    float driftCurrentValue = 0.0f;
    mutable juce::Random randomGenerator;

    // Hard sync
    double syncPhase = 0.0f;
    bool syncTriggered = false;

    // Performance optimization
    bool paramsChanged = true;
    float sampleRate = 44100.0f;
    float invSampleRate = 1.0f / 44100.0f;
    float nyquist = sampleRate * 0.5f;

    // Buffer for stereo processing
    juce::AudioBuffer<float> tempBuffer;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(Oscillator)
};

/**
 * Stereo oscillator pair with detuning and spread
 */
class StereoOscillator {
public:
    StereoOscillator();
    ~StereoOscillator() = default;

    void render(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);
    void setSampleRate(double newSampleRate);

    // Control parameters
    void setWaveform(Oscillator::Waveform waveform);
    void setFrequency(float frequency);
    void setAmplitude(float amplitude);
    void setDetune(float detuneAmount);        // in cents
    void setStereoSpread(float spreadAmount); // 0-1
    void setPhaseOffset(float offset);         // 0-2π

    // Individual oscillators
    Oscillator& getLeftOscillator() { return leftOsc; }
    Oscillator& getRightOscillator() { return rightOsc; }

    // Reset
    void reset();

private:
    Oscillator leftOsc;
    Oscillator rightOsc;

    float stereoSpread = 0.1f;
    float stereoDetune = 2.0f; // cents
    float stereoPhaseOffset = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(StereoOscillator)
};