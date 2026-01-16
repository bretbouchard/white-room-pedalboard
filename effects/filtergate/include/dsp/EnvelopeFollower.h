#pragma once
#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>

namespace FilterGate {

/**
 * Envelope Follower Parameters
 *
 * Controls how quickly the envelope responds to input changes.
 */
struct EnvelopeFollowerParams {
    float attackMs = 5.0f;    // 0-100, Fast attack to follow transients
    float releaseMs = 50.0f;  // 0-1000, Slower release for smooth decay
};

/**
 * Envelope Follower
 *
 * Tracks the amplitude envelope of an audio signal.
 * Uses asymmetric attack/release times for natural envelope tracking.
 *
 * Algorithm:
 * - Rectified input: |x|
 * - Attack: when input > current, fast rise
 * - Release: when input < current, slow decay
 * - Output: Smoothed envelope 0-1
 *
 * Applications:
 * - Ducking, sidechaining
 * - Modulation source
 * - Dynamics detection
 * - Input analysis
 *
 * Realtime-safe: No allocations in process()
 * Sample-accurate: Single sample or block processing
 */
class EnvelopeFollower {
public:
    EnvelopeFollower();
    ~EnvelopeFollower();

    /**
     * Prepare for processing
     * @param sampleRate Sample rate in Hz
     * @param samplesPerBlock Expected block size
     */
    void prepare(double sampleRate, int samplesPerBlock);

    /**
     * Reset all state to initial values
     */
    void reset();

    /**
     * Set envelope follower parameters
     */
    void setParams(const EnvelopeFollowerParams& newParams);

    /**
     * Process single sample
     * @param inputSample Input audio sample (-1 to 1)
     * @return Current envelope level (0-1)
     */
    float process(float inputSample);

    /**
     * Process single sample (alias for process())
     * @param inputSample Input audio sample (-1 to 1)
     * @return Current envelope level (0-1)
     */
    float processSample(float inputSample) { return process(inputSample); }

    /**
     * Process block of samples
     * @param input Input audio buffer
     * @param output Output envelope buffer
     * @param numSamples Number of samples to process
     */
    void process(float* input, float* output, int numSamples);

    /**
     * Get current envelope level
     * @return Current level (0-1)
     */
    float getCurrentLevel() const { return envelopeLevel; }

private:
    EnvelopeFollowerParams params;
    double sampleRate = 48000.0;

    float envelopeLevel = 0.0f;
    float attackCoeff = 0.0f;
    float releaseCoeff = 0.0f;

    /**
     * Update coefficients based on sample rate and params
     */
    void updateCoefficients();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(EnvelopeFollower)
};

} // namespace FilterGate
