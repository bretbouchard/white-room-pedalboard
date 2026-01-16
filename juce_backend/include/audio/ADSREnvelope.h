#pragma once

#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_dsp/juce_dsp.h>
#include <chrono>

/**
 * High-quality ADSR envelope with additional features for acid synthesis
 * Includes accent detection, velocity sensitivity, and envelope shaping
 */
class ADSREnvelope {
public:
    enum class EnvelopeStage {
        Idle,
        Attack,
        Decay,
        Sustain,
        Release
    };

    struct ADSRParams {
        float attack = 0.01f;   // seconds
        float decay = 0.3f;     // seconds
        float sustain = 0.7f;   // 0-1
        float release = 0.5f;   // seconds
        float attackCurve = 0.5f;  // 0=linear, 1=exponential
        float decayCurve = 0.5f;   // 0=linear, 1=exponential
        float releaseCurve = 0.5f; // 0=linear, 1=exponential
        bool velocitySensitivity = true;
        float velocityAmount = 0.5f;
        float accentAmount = 1.5f;
    };

    ADSREnvelope();
    ~ADSREnvelope() = default;

    // Main processing
    float getNextValue() noexcept;
    void processBlock(float* output, int numSamples) noexcept;
    void processStereo(float* leftOutput, float* rightOutput, int numSamples) noexcept;

    // Envelope control
    void noteOn(int midiNote, float velocity = 1.0f, bool accent = false);
    void noteOff();
    void allNotesOff();
    void reset() noexcept;

    // Parameter control
    void setParams(const ADSRParams& params) noexcept;
    const ADSRParams& getParams() const noexcept { return currentParams; }

    // Individual parameter setters
    void setAttack(float attackTime) noexcept;
    void setDecay(float decayTime) noexcept;
    void setSustain(float sustainLevel) noexcept;
    void setRelease(float releaseTime) noexcept;
    void setAttackCurve(float curve) noexcept;
    void setDecayCurve(float curve) noexcept;
    void setReleaseCurve(float curve) noexcept;

    // Velocity and accent control
    void setVelocitySensitivity(bool enabled) noexcept;
    void setVelocityAmount(float amount) noexcept;
    void setAccentAmount(float amount) noexcept;

    // Real-time parameter control
    void setAttackRate(float rate);      // 0-1
    void setDecayRate(float rate);       // 0-1
    void setSustainLevel(float level);   // 0-1
    void setReleaseRate(float rate);     // 0-1

    // Envelope information
    bool isActive() const noexcept { return currentStage != EnvelopeStage::Idle; }
    bool isInAttack() const noexcept { return currentStage == EnvelopeStage::Attack; }
    bool isInDecay() const noexcept { return currentStage == EnvelopeStage::Decay; }
    bool isInSustain() const noexcept { return currentStage == EnvelopeStage::Sustain; }
    bool isInRelease() const noexcept { return currentStage == EnvelopeStage::Release; }

    float getCurrentValue() const noexcept { return currentValue; }
    EnvelopeStage getCurrentStage() const noexcept { return currentStage; }
    float getProgress() const noexcept { return stageProgress; }

    // Time remaining
    float getTimeToNextStage() const noexcept;
    float getTotalTimeRemaining() const noexcept;

    // Performance monitoring
    float getPeakValue() const noexcept { return peakValue; }
    float getAverageValue() const noexcept { return averageValue; }

    // Audio rate modulation
    void setModulationAmount(float modAmount) noexcept { modulationAmount = modAmount; }
    float getModulationAmount() const noexcept { return modulationAmount; }

    // Sample rate control
    void setSampleRate(double newSampleRate);

    // Static helper methods
    static float calculateCurve(float progress, float curveAmount);
    static float millisecondsToSamples(float ms, float sampleRate);

private:
    // Stage processing
    void updateAttack() noexcept;
    void updateDecay() noexcept;
    void updateSustain() noexcept;
    void updateRelease() noexcept;
    void updateIdle() noexcept;

    // Parameter calculation
    void calculateStageRates() noexcept;
    void applyVelocityAndAccent() noexcept;
    float calculateStageValue(float progress, float start, float end, float curve) const noexcept;

    // Timing calculations
    float timeToSamples(float time) const noexcept;
    void startStage(EnvelopeStage newStage) noexcept;

    // Member variables
    ADSRParams currentParams;
    ADSRParams targetParams;

    // Current state
    EnvelopeStage currentStage = EnvelopeStage::Idle;
    float currentValue = 0.0f;
    float targetValue = 0.0f;
    float stageProgress = 0.0f;

    // Stage rates (in samples)
    float attackRate = 44.1f;
    float decayRate = 13230.0f;
    float releaseRate = 22050.0f;

    // Velocity and accent
    float currentVelocity = 1.0f;
    bool currentAccent = false;
    float effectiveSustain = 0.7f;

    // Stage start/end values
    float attackStartValue = 0.0f;
    float attackTargetValue = 1.0f;
    float decayStartValue = 1.0f;
    float decayTargetValue = 0.7f;
    float releaseStartValue = 0.7f;

    // Performance monitoring
    float peakValue = 0.0f;
    float averageValue = 0.0f;
    int samplesProcessed = 0;

    // Audio rate modulation
    float modulationAmount = 0.0f;
    float modulationPhase = 0.0f;

    // Timing
    float sampleRate = 44100.0f;
    std::chrono::high_resolution_clock::time_point stageStartTime;
    std::chrono::high_resolution_clock::time_point noteOnTime;

    // Parameter smoothing
    float smoothedAttack = 0.01f;
    float smoothedDecay = 0.3f;
    float smoothedSustain = 0.7f;
    float smoothedRelease = 0.5f;

    bool paramsChanged = true;
    bool needsRecalculation = true;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ADSREnvelope)
};

/**
 * Stereo ADSR envelope with linked controls
 */
class StereoADSREnvelope {
public:
    StereoADSREnvelope();
    ~StereoADSREnvelope() = default;

    void process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);
    void setSampleRate(double newSampleRate);

    // Envelope control (applies to both channels)
    void setParams(const ADSREnvelope::ADSRParams& params);
    void noteOn(int midiNote, float velocity, bool accent);
    void noteOff();

    // Stereo parameters
    void setStereoLink(float linkAmount); // 0 = independent, 1 = fully linked
    void setStereoDetune(float detuneAmount); // Timing offset between channels

    // Individual envelopes
    ADSREnvelope& getLeftEnvelope() { return leftEnvelope; }
    ADSREnvelope& getRightEnvelope() { return rightEnvelope; }

    // Combined information
    bool isActive() const;
    float getCurrentValue() const;

    // Reset
    void reset();

private:
    ADSREnvelope leftEnvelope;
    ADSREnvelope rightEnvelope;

    float stereoLink = 0.8f;
    float stereoDetune = 0.01f; // 1% timing difference

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(StereoADSREnvelope)
};

/**
 * Multi-envelope manager for complex synthesis
 */
class EnvelopeManager {
public:
    enum class EnvelopeType {
        Amplitude,
        Filter,
        Pitch,
        Modulation1,
        Modulation2
    };

    EnvelopeManager();
    ~EnvelopeManager() = default;

    // Envelope access
    ADSREnvelope& getEnvelope(EnvelopeType type);
    const ADSREnvelope& getEnvelope(EnvelopeType type) const;

    // Global control
    void noteOn(int midiNote, float velocity, bool accent = false);
    void noteOff();
    void allNotesOff();
    void reset();

    // Parameter control
    void setEnvelopeParams(EnvelopeType type, const ADSREnvelope::ADSRParams& params);
    void setSampleRate(double newSampleRate);

    // Processing
    void processBlock(juce::AudioBuffer<float>& ampBuffer,
                     juce::AudioBuffer<float>& filterBuffer,
                     juce::AudioBuffer<float>& pitchBuffer,
                     int startSample, int numSamples);

    // Presets
    void loadAcidPreset();
    void loadPadPreset();
    void loadLeadPreset();
    void loadBassPreset();

private:
    std::array<ADSREnvelope, 5> envelopes;
    float sampleRate = 44100.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(EnvelopeManager)
};