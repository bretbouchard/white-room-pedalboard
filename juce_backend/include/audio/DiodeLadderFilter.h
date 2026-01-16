#pragma once

#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_dsp/juce_dsp.h>

/**
 * Authentic diode ladder filter implementation
 * Based on the classic TB-303 filter topology for acid sound character
 */
class DiodeLadderFilter {
public:
    enum class FilterMode {
        LowPass,
        HighPass,
        BandPass,
        Notch
    };

    struct FilterParams {
        FilterMode mode = FilterMode::LowPass;
        float cutoff = 1000.0f;      // Hz
        float resonance = 0.5f;       // 0-1
        float drive = 1.0f;           // Input drive amount
        float outputGain = 1.0f;      // Output gain
        float keyFollow = 0.0f;       // Keyboard follow amount
        bool enableDistortion = true; // Soft clipping for character
        float distortionAmount = 0.1f;
    };

    DiodeLadderFilter();
    ~DiodeLadderFilter() = default;

    // Main processing
    void process(float* samples, int numSamples);
    void processStereo(float* leftSamples, float* rightSamples, int numSamples);
    void processAudio(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);

    // Parameter control
    void setParams(const FilterParams& params) noexcept;
    const FilterParams& getParams() const noexcept { return currentParams; }

    // Individual parameter setters
    void setCutoff(float cutoff) noexcept;
    void setResonance(float resonance) noexcept;
    void setDrive(float drive) noexcept;
    void setMode(FilterMode mode) noexcept;
    void setKeyFollow(float keyFollowAmount) noexcept;
    void setDistortionAmount(float amount) noexcept;

    // Envelope control
    void setEnvelopeAmount(float amount) noexcept;
    void setVelocitySensitivity(float sensitivity) noexcept;
    void setNoteFrequency(float frequency) noexcept;

    // Filter modulation
    void setCutoffModulation(float modAmount) noexcept;
    void setResonanceModulation(float modAmount) noexcept;

    // Audio rate modulation
    float getCurrentCutoff() const noexcept { return currentCutoff; }
    float getCurrentResonance() const noexcept { return currentResonance; }

    // Reset and initialization
    void reset() noexcept;
    void clearBuffers() noexcept;

    // Performance monitoring
    float getOutputLevel() const noexcept { return outputLevel; }

    // Sample rate control
    void setSampleRate(double newSampleRate);

    // Static helper methods
    static float midiNoteToHz(float midiNote);
    static float dbToLinear(float db);

private:
    // Core filter processing
    float processSample(float input) noexcept;
    void updateCoefficients() noexcept;
    void processDistortion(float& sample) const noexcept;

    // Diode ladder filter implementation
    float rungler(float input, float freq) noexcept;
    void updateRunglerCoefficients() noexcept;

    // Mode-specific processing
    float processLowPass(float input) noexcept;
    float processHighPass(float input) noexcept;
    float processBandPass(float input) noexcept;
    float processNotch(float input) noexcept;

    // Parameter smoothing
    void smoothParameters();

    // Member variables
    FilterParams currentParams;
    FilterParams targetParams;

    // Filter state variables (4-stage diode ladder)
    float y1 = 0.0f, y2 = 0.0f, y3 = 0.0f, y4 = 0.0f;
    float x1 = 0.0f; // Input memory

    // Coefficients
    float g = 0.0f;          // Gain coefficient
    float g2 = 0.0f, g3 = 0.0f, g4 = 0.0f;
    float feedback = 0.0f;

    // Current values
    float currentCutoff = 1000.0f;
    float currentResonance = 0.5f;
    float currentDrive = 1.0f;
    float outputLevel = 0.0f;

    // Parameter smoothing
    float smoothedCutoff = 1000.0f;
    float smoothedResonance = 0.5f;
    float smoothedDrive = 1.0f;
    float smoothedOutputGain = 1.0f;

    // Modulation
    float envelopeAmount = 0.0f;
    float velocitySensitivity = 0.0f;
    float currentVelocity = 1.0f;
    float noteFrequency = 440.0f;

    float cutoffModulation = 0.0f;
    float resonanceModulation = 0.0f;

    // Audio rate variables
    float sampleRate = 44100.0f;
    float invSampleRate = 1.0f / sampleRate;
    float nyquist = sampleRate * 0.5f;

    // Performance optimization
    bool paramsChanged = true;
    bool needsCoefficientUpdate = true;

    // Soft clipping for distortion
    float distortionThreshold = 0.8f;
    float distortionCurve = 3.0f;

    // Rungler for classic TB-303 character
    float runglerPhase = 0.0f;
    float runglerFreq = 0.0f;
    float runglerOutput = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DiodeLadderFilter)
};

/**
 * Stereo diode ladder filter with linked controls
 */
class StereoDiodeLadderFilter {
public:
    StereoDiodeLadderFilter();
    ~StereoDiodeLadderFilter() = default;

    void process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);
    void setSampleRate(double newSampleRate);

    // Parameter control (applies to both channels)
    void setParams(const DiodeLadderFilter::FilterParams& params);
    void setCutoff(float cutoff);
    void setResonance(float resonance);
    void setMode(DiodeLadderFilter::FilterMode mode);

    // Stereo parameters
    void setStereoLink(float linkAmount); // 0 = independent, 1 = fully linked
    void setStereoDetune(float detuneAmount); // Cutoff detune between channels

    // Individual filters
    DiodeLadderFilter& getLeftFilter() { return leftFilter; }
    DiodeLadderFilter& getRightFilter() { return rightFilter; }

    // Reset
    void reset();

private:
    DiodeLadderFilter leftFilter;
    DiodeLadderFilter rightFilter;

    float stereoLink = 0.8f;
    float stereoDetune = 5.0f; // Hz
    float detuneRatio = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(StereoDiodeLadderFilter)
};