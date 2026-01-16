#pragma once
#include "BaseAnalyzer.h"
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>

/**
 * Quality detection analyzer for identifying audio problems
 * Detects noise, hum, clipping, DC offset, and other quality issues
 */
class QualityDetector : public BaseAnalyzer {
public:
    /**
     * Configuration for quality detection thresholds
     */
    struct QualityConfig {
        float noiseFloorThreshold = -60.0f;    // dBFS
        float clippingThreshold = -1.0f;       // dBFS (headroom below full scale)
        float dcOffsetThreshold = 0.05f;       // Amplitude ratio
        float humDetectionThreshold = -40.0f;  // dBFS
        float clickDetectionThreshold = 0.3f;  // Amplitude ratio
        bool enableNoiseDetection = true;
        bool enableHumDetection = true;
        bool enableClippingDetection = true;
        bool enableDCOffsetDetection = true;
        bool enableClickDetection = true;

        // Mains frequency (50Hz or 60Hz)
        float mainsFrequency = 60.0f;
    };

    /**
     * Results from quality analysis
     */
    struct QualityResults {
        // Noise analysis
        float noiseFloorDbfs = -120.0f;
        bool hasExcessiveNoise = false;

        // Hum detection
        bool hasMainsHum = false;
        float humAmplitudeDbfs = -120.0f;
        float detectedHumFrequency = 0.0f;

        // Clipping detection
        bool hasClipping = false;
        float clippingPercentage = 0.0f;
        int clippingSamples = 0;

        // DC offset detection
        bool hasDCOffset = false;
        float dcOffsetLeft = 0.0f;
        float dcOffsetRight = 0.0f;

        // Click/pop detection
        int detectedClicks = 0;
        float maxClickAmplitude = 0.0f;

        // Phase issues
        bool hasPhaseInversion = false;
        float phaseCorrelation = 1.0f;

        // Overall quality score (0-100)
        float overallQualityScore = 100.0f;

        // Timestamp
        juce::int64 timestamp = 0;
    };

    QualityDetector();
    explicit QualityDetector(const QualityConfig& config);
    ~QualityDetector() override = default;

    // BaseAnalyzer interface
    bool initialize(double sampleRate, int bufferSize) override;
    void processBlock(juce::AudioBuffer<float>& buffer) override;
    juce::String getResultsAsJson() const override;
    bool isReady() const override;
    void reset() override;
    juce::String getAnalysisType() const override;

    // Quality detector specific methods
    void setConfig(const QualityConfig& newConfig);
    QualityConfig getConfig() const;
    QualityResults getLatestResults() const;

    // Detection methods (will be implemented in GREEN phase)
    bool detectNoiseFloor(const juce::AudioBuffer<float>& buffer, float& noiseFloorDbfs);
    bool detectMainsHum(const juce::AudioBuffer<float>& buffer, float& humFrequency, float& amplitude);
    bool detectClipping(const juce::AudioBuffer<float>& buffer, int& clippingCount, float& clippingPercent);
    bool detectDCOffset(const juce::AudioBuffer<float>& buffer, float& leftOffset, float& rightOffset);
    bool detectClicks(const juce::AudioBuffer<float>& buffer, int& clickCount, float& maxAmplitude);
    bool detectPhaseInversion(const juce::AudioBuffer<float>& buffer, bool& isInverted, float& correlation);

private:
    /**
     * Implementation structure for QualityDetector
     */
    struct Impl {
        QualityConfig config;
        QualityResults results;
        double currentSampleRate = 0.0;
        int currentBufferSize = 0;
        bool initialized = false;
    };

    std::unique_ptr<Impl> pImpl;
};