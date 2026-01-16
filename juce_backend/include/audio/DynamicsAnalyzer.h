#pragma once
#include "BaseAnalyzer.h"
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <algorithm>
#include <numeric>
#include <vector>

/**
 * Dynamics and Loudness Analysis Component
 *
 * Provides comprehensive audio dynamics analysis including:
 * - LUFS loudness measurement (EBU R128 compliant)
 * - Dynamic range analysis and crest factor calculation
 * - Envelope tracking with configurable attack/release times
 * - True peak detection for broadcast standards
 * - K-weighted filtering for EBU R128 compliance
 */
class DynamicsAnalyzer : public BaseAnalyzer {
public:
    DynamicsAnalyzer();
    ~DynamicsAnalyzer() override = default;

    // BaseAnalyzer interface implementation
    bool initialize(double sampleRate, int bufferSize) override;
    void processBlock(juce::AudioBuffer<float>& buffer) override;
    juce::String getResultsAsJson() const override;
    bool isReady() const override;
    void reset() override;
    juce::String getAnalysisType() const override;

    // Dynamics-specific analysis methods
    double getCurrentLUFS() const;
    double getIntegratedLUFS() const;
    double getDynamicRange() const;
    double getCrestFactor() const;
    double getTruePeak() const;
    double getEnvelopeValue() const;

    // Configuration methods
    void setAttackTime(double attackTimeMs);
    void setReleaseTime(double releaseTimeMs);
    void setWindowTime(double windowTimeMs);
    void setIntegrationTime(double integrationTimeMs);

private:
    // Internal state
    bool initialized = false;
    double currentSampleRate = 44100.0;
    int currentBufferSize = 512;

    // LUFS measurement variables
    double lufsIntegrated = -23.0;  // EBU R128 standard
    double lufsMomentary = -23.0;
    double lufsShortTerm = -23.0;
    double lufsRange = 0.0;

    // Dynamic range measurements
    double crestFactor = 0.0;
    double dynamicRange = 0.0;
    double truePeak = 0.0;

    // Envelope following
    double envelopeValue = 0.0;
    double attackTime = 10.0;      // ms
    double releaseTime = 100.0;    // ms
    double windowTime = 400.0;     // ms (momentary)
    double integrationTime = 1000.0; // ms (short-term)

    // K-weighted filter coefficients for EBU R128
    struct KWeightFilter {
        double highShelfGain = 4.0;      // dB
        double highShelfFreq = 1000.0;   // Hz
        double highPassFreq = 38.0;      // Hz

        // High-pass filter coefficients (38 Hz pre-filter)
        double hpA0 = 0.0, hpA1 = 0.0, hpA2 = 0.0;
        double hpB0 = 1.0, hpB1 = 0.0, hpB2 = 0.0;

        // High-shelf filter coefficients (1 kHz with +4 dB gain)
        double hsA0 = 0.0, hsA1 = 0.0, hsA2 = 0.0;
        double hsB0 = 1.0, hsB1 = 0.0, hsB2 = 0.0;

        // Filter state variables (supporting up to 8 channels)
        static constexpr int maxChannels = 8;
        double hpX1[maxChannels] = {0};
        double hpX2[maxChannels] = {0};
        double hpY1[maxChannels] = {0};
        double hpY2[maxChannels] = {0};
        double hsX1[maxChannels] = {0};
        double hsX2[maxChannels] = {0};
        double hsY1[maxChannels] = {0};
        double hsY2[maxChannels] = {0};

        void reset() {
            std::fill(std::begin(hpX1), std::end(hpX1), 0.0);
            std::fill(std::begin(hpX2), std::end(hpX2), 0.0);
            std::fill(std::begin(hpY1), std::end(hpY1), 0.0);
            std::fill(std::begin(hpY2), std::end(hpY2), 0.0);
            std::fill(std::begin(hsX1), std::end(hsX1), 0.0);
            std::fill(std::begin(hsX2), std::end(hsX2), 0.0);
            std::fill(std::begin(hsY1), std::end(hsY1), 0.0);
            std::fill(std::begin(hsY2), std::end(hsY2), 0.0);
        }
    } kWeightFilter;

    // Internal processing buffers
    juce::AudioBuffer<float> processingBuffer;
    std::vector<double> powerHistory;
    std::vector<double> peakHistory;

    // Envelope follower coefficients
    double envAttackCoeff = 0.0;
    double envReleaseCoeff = 0.0;

    // Analysis timing
    juce::int64 lastUpdateTime = 0;
    int processedSamples = 0;

    // Internal helper methods
    void initializeFilters();
    void updateEnvelopeCoefficients();
    void processKWeightedFilter(juce::AudioBuffer<float>& buffer);
    void calculateLUFSMeasurement(const juce::AudioBuffer<float>& buffer);
    void calculateLoudnessRange();
    void calculateDynamicRange(const juce::AudioBuffer<float>& buffer);
    void calculateTruePeak(const juce::AudioBuffer<float>& buffer);
    void updateEnvelope(const juce::AudioBuffer<float>& buffer);
    void resetInternalState();
};