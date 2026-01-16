#pragma once
#include "BaseAnalyzer.h"
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

/**
 * Spatial Analysis component for stereo and multi-channel audio
 * Provides comprehensive spatial audio analysis including:
 * - Stereo correlation coefficient calculation
 * - Phase correlation and coherence analysis
 * - Mid-side encoding/decoding and analysis
 * - Stereo width measurement and imaging
 * - Panning detection and localization
 * - Mono compatibility assessment
 * - Phase inversion detection
 */
class SpatialAnalyzer : public BaseAnalyzer {
public:
    struct SpatialMetrics {
        // Correlation and Phase
        double correlationCoefficient = 0.0;     // -1.0 to +1.0
        double phaseCorrelation = 0.0;           // Phase correlation metric
        double phaseCoherence = 0.0;             // Coherence across frequency bands
        double averagePhaseDifference = 0.0;     // Average phase difference in degrees

        // Mid-Side Analysis
        double midLevel = 0.0;                   // Mid channel level (dB)
        double sideLevel = 0.0;                  // Side channel level (dB)
        double midSideRatio = 0.0;               // M/S ratio in dB
        double stereoWidth = 0.0;                // Stereo width percentage (0-100%)

        // Spatial Imaging
        double leftRightBalance = 0.0;           // L/R balance (-1.0 to +1.0)
        double panningPosition = 0.0;            // Estimated panning position
        double imagingScore = 0.0;               // Overall imaging quality score

        // Compatibility
        double monoCompatibility = 0.0;          // Mono compatibility score (0-100%)
        bool hasPhaseInversion = false;          // Phase inversion detected
        bool hasStereoImagingIssues = false;     // Imaging quality issues

        // Frequency-based spatial analysis
        std::vector<double> frequencyBands;      // Spatial metrics per frequency band
        std::vector<double> correlationByBand;   // Correlation per frequency band
    };

    SpatialAnalyzer();
    ~SpatialAnalyzer() override = default;

    // BaseAnalyzer interface implementation
    bool initialize(double sampleRate, int bufferSize) override;
    void processBlock(juce::AudioBuffer<float>& buffer) override;
    juce::String getResultsAsJson() const override;
    bool isReady() const override;
    void reset() override;
    juce::String getAnalysisType() const override;

    // Spatial-specific methods
    SpatialMetrics getLatestMetrics() const;
    double getCorrelationCoefficient() const;
    double getStereoWidth() const;
    double getMidSideRatio() const;
    double getMonoCompatibility() const;
    bool hasPhaseInversionDetected() const;

    // Frequency band analysis
    static constexpr int NUM_FREQUENCY_BANDS = 8;
    static constexpr double FREQUENCY_BANDS[NUM_FREQUENCY_BANDS] = {
        20.0, 100.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0
    };

private:
    // Internal state
    bool initialized = false;
    bool ready = false;
    double currentSampleRate = 44100.0;
    int currentBufferSize = 512;

    // Analysis buffers
    juce::AudioBuffer<float> midBuffer;
    juce::AudioBuffer<float> sideBuffer;
    juce::AudioBuffer<float> correlationBuffer;
    juce::AudioBuffer<float> phaseBuffer;

    // Frequency analysis
    juce::dsp::FFT fft;
    juce::dsp::WindowingFunction<float> windowing;

    // Results storage
    SpatialMetrics latestMetrics;
    juce::String cachedJsonResults;

    // Analysis methods (minimal RED phase implementations)
    void performSpatialAnalysis(juce::AudioBuffer<float>& buffer);
    void calculateCorrelationCoefficients(juce::AudioBuffer<float>& buffer);
    void performMidSideAnalysis(juce::AudioBuffer<float>& buffer);
    void calculateStereoWidth(juce::AudioBuffer<float>& buffer);
    void analyzePhaseRelationships(juce::AudioBuffer<float>& buffer);
    void detectPanningPosition(juce::AudioBuffer<float>& buffer);
    void assessMonoCompatibility(juce::AudioBuffer<float>& buffer);
    void detectPhaseInversion(juce::AudioBuffer<float>& buffer);
    void performFrequencyBandAnalysis(juce::AudioBuffer<float>& buffer);
    void updateJsonResults();

    // Helper methods
    void allocateBuffers();
    void clearBuffers();
    double calculateCorrelation(const float* leftChannel, const float* rightChannel, int numSamples);
    void midSideEncode(const float* leftChannel, const float* rightChannel,
                      float* midChannel, float* sideChannel, int numSamples);
    void midSideDecode(const float* midChannel, const float* sideChannel,
                      float* leftChannel, float* rightChannel, int numSamples);
    double calculateLevelDb(const float* channel, int numSamples);
    double calculatePhaseDifference(const float* leftChannel, const float* rightChannel, int numSamples);
};