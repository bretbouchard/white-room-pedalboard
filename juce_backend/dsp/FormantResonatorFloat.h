/**
 * FormantResonatorFloat - Single-precision Real Biquad Resonator
 *
 * Float version for real-time audio processing.
 * Uses identical mathematics to double version but with float precision.
 *
 * See FormantResonator.h for mathematical derivation and bug fix details.
 */

#pragma once

#include <cmath>
#include <algorithm>
#include <juce_dsp/juce_dsp.h>

namespace audio::dsp {

/**
 * Fixed-frequency formant resonator (single precision)
 *
 * Optimized for real-time audio processing with float samples.
 * Uses Direct Form I structure for numerical stability.
 */
class FormantResonatorFloat {
public:
    /**
     * Constructor - fixed frequency resonator
     *
     * @param sampleRate Sample rate in Hz
     * @param frequency Formant frequency in Hz
     * @param bandwidth Bandwidth in Hz
     */
    FormantResonatorFloat(float sampleRate, float frequency, float bandwidth)
        : sampleRate_(sampleRate)
        , frequency_(frequency)
        , bandwidth_(bandwidth)
        , z1_(0.0f)
        , z2_(0.0f)
    {
        calculateCoefficients();
        reset();
    }

    /** Destructor */
    ~FormantResonatorFloat() = default;

    /**
     * Process a single sample (SIMD-friendly)
     *
     * Direct Form I structure:
     * output[n] = b0 * input[n] + z1[n-1]
     * z1[n] = -a1 * input[n] + z2[n-1]
     * z2[n] = -a2 * input[n]
     *
     * @param input Input sample
     * @return Filtered output sample
     */
    inline float process(float input) {
        // Direct Form I structure (single precision)
        float output = b0_ * input + z1_;

        // Update state variables
        z1_ = (-a1_) * input + z2_;
        z2_ = (-a2_) * input;

        return output;
    }

    /**
     * Process a block of samples
     *
     * @param input Input buffer
     * @param output Output buffer
     * @param numSamples Number of samples to process
     */
    void process(float* input, float* output, int numSamples) {
        for (int i = 0; i < numSamples; ++i) {
            output[i] = process(input[i]);
        }
    }

    /**
     * Process a block of samples (in-place)
     *
     * @param buffer Input/output buffer
     * @param numSamples Number of samples to process
     */
    void processInPlace(float* buffer, int numSamples) {
        for (int i = 0; i < numSamples; ++i) {
            buffer[i] = process(buffer[i]);
        }
    }

    /**
     * Reset filter state
     */
    void reset() {
        z1_ = 0.0f;
        z2_ = 0.0f;
    }

    /**
     * Update formant parameters
     */
    void setParameters(float frequency, float bandwidth) {
        frequency_ = frequency;
        bandwidth_ = bandwidth;
        calculateCoefficients();
    }

    /** Getters */
    float getFrequency() const { return frequency_; }
    float getBandwidth() const { return bandwidth_; }
    float getRadius() const { return r_; }
    bool isStable() const { return r_ < 1.0f; }
    float getPeakGain() const { return 1.0f / (1.0f - r_); }

    /**
     * Get frequency response at a given frequency
     *
     * H(e^jω) = b0 / (1 - a1*e^(-jω) - a2*e^(-j2ω))
     *
     * @param freq Frequency in Hz
     * @return Magnitude response in dB
     */
    float getFrequencyResponse(float freq) const {
        float omega = 2.0f * juce::MathConstants<float>::pi * freq / sampleRate_;

        // Calculate complex frequency response
        float cosOmega = std::cos(omega);
        float sinOmega = std::sin(omega);
        float cos2Omega = std::cos(2.0f * omega);
        float sin2Omega = std::sin(2.0f * omega);

        // Numerator: b0 (real)
        float numReal = b0_;
        float numImag = 0.0f;

        // Denominator: 1 - a1*e^(-jω) - a2*e^(-j2ω)
        float denReal = 1.0f - a1_ * cosOmega - a2_ * cos2Omega;
        float denImag = a1_ * sinOmega + a2_ * sin2Omega;

        // Magnitude squared
        float magSq = (numReal * numReal + numImag * numImag) /
                     (denReal * denReal + denImag * denImag);

        // Convert to dB
        return 10.0f * std::log10(magSq);
    }

private:
    // Parameters
    float sampleRate_;
    float frequency_;
    float bandwidth_;

    // Coefficients
    float b0_;
    float a1_;
    float a2_;

    // State
    float z1_;
    float z2_;
    float r_;

    /**
     * Calculate coefficients (float version)
     */
    void calculateCoefficients() {
        // Clamp parameters
        frequency_ = std::clamp(frequency_, 20.0f, sampleRate_ / 2.0f - 1.0f);
        bandwidth_ = std::clamp(bandwidth_, 10.0f, sampleRate_ / 4.0f);

        // Calculate radius and omega
        float omega = 2.0f * juce::MathConstants<float>::pi * frequency_ / sampleRate_;
        r_ = std::exp(-juce::MathConstants<float>::pi * bandwidth_ / sampleRate_);

        // Safety check
        if (r_ >= 1.0f) {
            r_ = 0.999f;
        }

        // Real biquad coefficients
        b0_ = 1.0f - r_;
        a1_ = -2.0f * r_ * std::cos(omega);
        a2_ = r_ * r_;
    }
};

} // namespace audio::dsp
