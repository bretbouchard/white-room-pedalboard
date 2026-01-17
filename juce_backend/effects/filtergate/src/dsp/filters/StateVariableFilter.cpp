#include "dsp/filters/StateVariableFilter.h"

namespace FilterGate {

//==============================================================================
StateVariableFilter::StateVariableFilter() = default;

StateVariableFilter::~StateVariableFilter() = default;

//==============================================================================
void StateVariableFilter::setParams (const SVFParams& newParams)
{
    params = newParams;
    updateCoefficients();
}

//==============================================================================
void StateVariableFilter::reset()
{
    low = 0.0f;
    high = 0.0f;
    band = 0.0f;
    notch = 0.0f;
}

//==============================================================================
void StateVariableFilter::updateCoefficients()
{
    // Prevent denormals and invalid values
    auto safeSampleRate = juce::jmax (params.sampleRate, 44100.0f);
    auto safeCutoff = juce::jmin (params.cutoffHz, safeSampleRate * 0.49f);
    auto safeResonance = juce::jlimit (0.0f, 1.0f, params.resonance);

    // Calculate frequency coefficient (F = 2*sin(pi*fc/fs))
    auto freq = (juce::MathConstants<float>::twoPi * safeCutoff) / safeSampleRate;
    coeff = 2.0f * std::sin (freq * 0.5f);

    // Calculate Q (resonance) - maps 0-1 to useful Q range
    // Q = 1/resonance, where resonance goes from 0.5 to ~50
    q = 1.0f - (safeResonance * 0.99f);  // Maps 0-1 to 1.0-0.01
}

//==============================================================================
float StateVariableFilter::process (float input)
{
    // State Variable Filter implementation
    // Based on "The Art of VA Filter Design" by Vadim Zavalishin

    // Notch = input - q * band
    notch = input - (q * band);

    // Low = low + coeff * band
    low = low + (coeff * band);

    // High = notch - low
    high = notch - low;

    // Band = coeff * high + band (with damping)
    band = (coeff * high) + band;

    // Apply slight damping to prevent explosion at high resonance
    band *= (1.0f - (q * 0.01f));

    // Return based on filter type
    switch (params.type)
    {
        case FilterType::LOWPASS:
            return low;

        case FilterType::HIGHPASS:
            return high;

        case FilterType::BANDPASS:
            return band;

        case FilterType::NOTCH:
            return notch;

        default:
            return input;
    }
}

//==============================================================================
void StateVariableFilter::processStereo (float* left, float* right, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        left[i] = process (left[i]);
        right[i] = process (right[i]);
    }
}

} // namespace FilterGate
