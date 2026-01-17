#pragma once
#include <juce_core/juce_core.h>

namespace FilterGate {

/**
 * First-order all-pass filter for phaser effects.
 *
 * The all-pass filter passes all frequencies equally but introduces
 * phase shift that varies with frequency. This is the core building
 * block of phaser effects.
 *
 * Difference equation:
 *   y[n] = -x[n] + coeff * x[n-1] + coeff * y[n-1]
 *
 * Which can be rewritten as:
 *   y[n] = -x[n] + coeff * (x[n-1] + y[n-1])
 *
 * Or using the state variable z1 = x[n-1] + y[n-1]:
 *   y[n] = -x[n] + coeff * z1
 *   z1[n+1] = x[n] + y[n]
 *
 * Reference: https://ccrma.stanford.edu/~jos/pasp/First_Order_Allpass_Interpolation.html
 */
class AllPassFilter {
public:
    AllPassFilter();
    ~AllPassFilter();

    /**
     * Set the all-pass coefficient.
     * @param coeff Coefficient in range [-1, 1], typically close to 1
     */
    void setCoefficient(float coeff);

    /**
     * Reset filter state to zero.
     */
    void reset();

    /**
     * Process a single sample.
     * @param input Input sample
     * @return Output sample with phase shift
     */
    float process(float input);

    /**
     * Process stereo samples.
     * @param left Pointer to left channel buffer (modified in-place)
     * @param right Pointer to right channel buffer (modified in-place)
     * @param numSamples Number of samples to process
     */
    void processStereo(float* left, float* right, int numSamples);

private:
    float coeff = 0.0f;
    float z1_L = 0.0f;  // State variable for left channel
    float z1_R = 0.0f;  // State variable for right channel

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AllPassFilter)
};

} // namespace FilterGate
