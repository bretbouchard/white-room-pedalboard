#pragma once
#include <juce_audio_basics/juce_audio_basics.h>

/**
 * Base interface for all audio analysis components
 * Provides common functionality and ensures consistent API
 */
class BaseAnalyzer {
public:
    virtual ~BaseAnalyzer() = default;

    /**
     * Initialize analyzer with audio processing parameters
     * @param sampleRate Audio sample rate in Hz
     * @param bufferSize Audio buffer size for processing
     * @return true if initialization successful
     */
    virtual bool initialize(double sampleRate, int bufferSize) = 0;

    /**
     * Process a block of audio samples
     * @param buffer Audio buffer to analyze (interleaved or planar)
     */
    virtual void processBlock(juce::AudioBuffer<float>& buffer) = 0;

    /**
     * Get latest analysis results formatted as JSON
     * @return JSON string containing analysis results
     */
    virtual juce::String getResultsAsJson() const = 0;

    /**
     * Check if analyzer is ready for real-time processing
     * @return true if ready
     */
    virtual bool isReady() const = 0;

    /**
     * Reset analyzer internal state
     */
    virtual void reset() = 0;

    /**
     * Get analysis type identifier
     * @return String identifier for analysis type
     */
    virtual juce::String getAnalysisType() const = 0;
};