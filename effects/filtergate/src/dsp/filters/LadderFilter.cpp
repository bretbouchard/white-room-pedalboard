#include "dsp/filters/LadderFilter.h"
#include <cmath>

namespace FilterGate {

//==============================================================================
LadderFilter::LadderFilter() = default;

LadderFilter::~LadderFilter() = default;

//==============================================================================
void LadderFilter::setSampleRate (double newSampleRate)
{
    sampleRate = juce::jmax (newSampleRate, 44100.0);
    updateCoefficients();
}

//==============================================================================
void LadderFilter::setParams (const LadderParams& newParams)
{
    params = newParams;
    updateCoefficients();
}

//==============================================================================
void LadderFilter::updateCoefficients()
{
    // Moog ladder filter coefficient calculation
    // Based on "Simulation of the Moog VCF" by Tim Stilson

    auto safeSampleRate = static_cast<float> (juce::jmax (sampleRate, 44100.0));
    auto safeCutoff = juce::jmin (params.cutoffHz, safeSampleRate * 0.49f);

    // Calculate coefficient from cutoff frequency
    // This uses the approximation: g = 2*pi*fc/fs
    auto freq = (juce::MathConstants<float>::twoPi * safeCutoff) / safeSampleRate;
    coeff = freq * 0.98f;  // Slight correction factor
}

//==============================================================================
float LadderFilter::tanhX (float x)
{
    // Fast tanh approximation
    // Based on "A Fast Approximation to the Hyperbolic Tangent"
    // by Juha Nieminen

    // Clamp input to prevent overflow
    x = juce::jlimit (-4.0f, 4.0f, x);

    // Approximate tanh using rational function
    float x2 = x * x;
    return x * (27.0f + x2) / (27.0f + 9.0f * x2);
}

//==============================================================================
void LadderFilter::reset()
{
    stage1 = 0.0f;
    stage2 = 0.0f;
    stage3 = 0.0f;
    stage4 = 0.0f;
    feedback = 0.0f;
}

//==============================================================================
float LadderFilter::process (float input)
{
    // Apply input drive (pre-distortion)
    float driven = input * (1.0f + params.drive * 2.0f);
    driven = tanhX (driven);

    // Calculate feedback from resonance
    // Resonance 0 = no feedback, 1 = self-oscillation
    float resonanceFeedback = stage4 * params.resonance * 0.95f;

    // Input to first stage with feedback
    float in = driven - resonanceFeedback;

    // Four 1-pole lowpass stages in cascade
    // Each stage: y = y + g * (x - y) where g is the coefficient
    float temp1 = stage1 + coeff * (tanhX (in) - stage1);
    float temp2 = stage2 + coeff * (tanhX (temp1) - stage2);
    float temp3 = stage3 + coeff * (tanhX (temp2) - stage3);
    float temp4 = stage4 + coeff * (tanhX (temp3) - stage4);

    // Update state variables
    stage1 = temp1;
    stage2 = temp2;
    stage3 = temp3;
    stage4 = temp4;

    // Return output from final stage
    // Apply soft clipping to prevent explosion at high resonance
    return tanhX (stage4);
}

} // namespace FilterGate
