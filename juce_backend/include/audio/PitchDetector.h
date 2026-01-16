#pragma once
#include <utility>
#include <vector>
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "BaseAnalyzer.h"

/**
 * Pitch detection result structure
 */
struct PitchResult {
    double frequency = 0.0;        // Detected fundamental frequency in Hz
    double confidence = 0.0;       // Confidence score (0.0 to 1.0)
    bool isPitched = false;        // Whether a clear pitch was detected
    int midiNote = -1;             // MIDI note number (-1 if no pitch)
    double centsError = 0.0;       // Deviation from nearest MIDI note in cents
    juce::String pitchName;        // Musical note name (e.g., "A4", "C#5")
};

/**
 * Pitch Detection Analyzer using YIN algorithm
 *
 * This analyzer implements the YIN pitch detection algorithm for accurate
 * fundamental frequency extraction from audio signals. It provides:
 * - High accuracy pitch detection within ±2Hz for clean signals
 * - Confidence scoring for pitch reliability
 * - Octave error prevention mechanisms
 * - Real-time performance capabilities
 * - Musical note conversion with cent-precision
 */
class PitchDetector : public BaseAnalyzer {
public:
    PitchDetector();
    ~PitchDetector() override = default;

    // BaseAnalyzer interface implementation
    bool initialize(double sampleRate, int bufferSize) override;
    void processBlock(juce::AudioBuffer<float>& buffer) override;
    juce::String getResultsAsJson() const override;
    bool isReady() const override;
    void reset() override;
    juce::String getAnalysisType() const override;

    // Pitch-specific methods
    PitchResult getLatestPitchResult() const;
    double getCurrentFrequency() const;
    double getConfidence() const;
    bool hasPitch() const;
    juce::String getPitchName() const;

    // Configuration methods
    void setMinFrequency(double minFreq);
    void setMaxFrequency(double maxFreq);
    void setConfidenceThreshold(double threshold);
    void setYINThreshold(double threshold);

    // Performance methods
    double getLastProcessingTime() const { return lastProcessingTime; }

private:
    // YIN algorithm implementation
    double calculateDifferenceFunction(const float* buffer, int bufferSize, int lag) const;
    double calculateMeanDifference(int bufferSize, int lag) const;
    double findPeriodFromDifference(const double* difference, int bufferSize) const;
    double refinePitchEstimate(double period, const float* buffer, int bufferSize) const;
    double parabolicInterpolation(double y1, double y2, double y3) const;

    // Enhanced audio processing utilities for low-frequency accuracy
    void applyWindow(float* buffer, int size) const;
    void applyHighPassFilter(float* buffer, int bufferSize, double cutoffFreq) const;
    bool validateFrequency(double frequency) const;
    double validateLowFrequencyResult(const float* buffer, int bufferSize, double frequency, double confidence) const;
    double frequencyToMidiNote(double frequency) const;
    juce::String midiNoteToPitchName(int midiNote, double cents) const;
    double calculateSignalQuality(const float* buffer, int size) const;

    // Enhanced pitch detection methods
    std::pair<double, double> enhancedAutocorrelation(const float* buffer, int bufferSize) const;
    std::pair<double, double> zeroCrossingPitchDetection(const float* buffer, int bufferSize) const;
    std::pair<double, double> amdfPitchDetection(const float* buffer, int bufferSize) const;

    // Configuration parameters
    double sampleRate = 44100.0;
    int bufferSize = 2048;
    double minFrequency = 80.0;      // E2 ~ 82.4 Hz (typical low end for musical instruments)
    double maxFrequency = 4000.0;    // C8 ~ 4186 Hz (typical high end)
    double confidenceThreshold = 0.3;
    double yinThreshold = 0.15;      // YIN algorithm threshold for period detection

    // Processing state
    bool initialized = false;
    PitchResult latestResult;

    // YIN algorithm buffers
    juce::HeapBlock<double> differenceBuffer;
    juce::HeapBlock<float> windowBuffer;
    int maxLag = 0;

    // Performance tracking
    double lastProcessingTime = 0.0;
};