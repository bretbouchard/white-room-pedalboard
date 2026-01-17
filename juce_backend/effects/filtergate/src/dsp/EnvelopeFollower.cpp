#include "dsp/EnvelopeFollower.h"
#include <cmath>

namespace FilterGate {

EnvelopeFollower::EnvelopeFollower()
{
    updateCoefficients();
}

EnvelopeFollower::~EnvelopeFollower()
{
}

void EnvelopeFollower::prepare(double sampleRate, int samplesPerBlock)
{
    this->sampleRate = sampleRate;
    updateCoefficients();
}

void EnvelopeFollower::reset()
{
    envelopeLevel = 0.0f;
    updateCoefficients();
}

void EnvelopeFollower::setParams(const EnvelopeFollowerParams& newParams)
{
    params = newParams;
    updateCoefficients();
}

float EnvelopeFollower::process(float inputSample)
{
    // Rectified input
    float rectified = std::abs(inputSample);

    // Asymmetric attack/release
    if (rectified > envelopeLevel)
    {
        // Attack: fast rise
        if (params.attackMs < 0.5f)
        {
            // Instant attack for very fast settings
            envelopeLevel = rectified;
        }
        else
        {
            // Gradual attack - apply coefficient directly
            envelopeLevel += attackCoeff;
            if (envelopeLevel > rectified)
                envelopeLevel = rectified;
        }
    }
    else
    {
        // Release: slow decay - apply coefficient to decay
        envelopeLevel *= (1.0f - releaseCoeff);
    }

    // Clamp to valid range
    envelopeLevel = juce::jmax(0.0f, juce::jmin(envelopeLevel, 1.0f));

    // Denormal protection
    if (envelopeLevel < 1e-10f)
        envelopeLevel = 0.0f;

    return envelopeLevel;
}

void EnvelopeFollower::process(float* input, float* output, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        output[i] = process(input[i]);
    }
}

void EnvelopeFollower::updateCoefficients()
{
    // Convert time constants to coefficients
    // Use simple linear approach: increment per sample

    // Attack coefficient (fast)
    float attackTime = juce::jmax(params.attackMs, 0.1f) / 1000.0f;
    float attackSamples = static_cast<float>(attackTime * sampleRate);
    attackCoeff = 1.0f / juce::jmax(attackSamples, 1.0f);

    // Release coefficient (slow)
    float releaseTime = juce::jmax(params.releaseMs, 0.1f) / 1000.0f;
    float releaseSamples = static_cast<float>(releaseTime * sampleRate);
    releaseCoeff = 1.0f / juce::jmax(releaseSamples, 1.0f);
}

} // namespace FilterGate
