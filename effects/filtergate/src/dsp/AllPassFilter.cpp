#include "dsp/AllPassFilter.h"

namespace FilterGate {

AllPassFilter::AllPassFilter() = default;

AllPassFilter::~AllPassFilter() = default;

void AllPassFilter::setCoefficient(float coeff)
{
    this->coeff = juce::jlimit(-1.0f, 1.0f, coeff);
}

void AllPassFilter::reset()
{
    z1_L = 0.0f;
    z1_R = 0.0f;
}

float AllPassFilter::process(float input)
{
    // All-pass filter difference equation:
    // y[n] = -x[n] + coeff * (x[n-1] + y[n-1])
    // Where z1 = x[n-1] + y[n-1]

    float output = -input + coeff * z1_L;
    z1_L = input + output;

    // Denormal protection: flush near-zero values to actual zero
    if (std::abs(z1_L) < 1e-10f)
        z1_L = 0.0f;

    return output;
}

void AllPassFilter::processStereo(float* left, float* right, int numSamples)
{
    jassert(left != nullptr);
    jassert(right != nullptr);
    jassert(numSamples >= 0);

    for (int i = 0; i < numSamples; ++i)
    {
        // Process left channel
        float outL = -left[i] + coeff * z1_L;
        z1_L = left[i] + outL;
        left[i] = outL;

        // Process right channel
        float outR = -right[i] + coeff * z1_R;
        z1_R = right[i] + outR;
        right[i] = outR;
    }

    // Denormal protection
    if (std::abs(z1_L) < 1e-10f)
        z1_L = 0.0f;
    if (std::abs(z1_R) < 1e-10f)
        z1_R = 0.0f;
}

} // namespace FilterGate
