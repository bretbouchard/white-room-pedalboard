/*
  ==============================================================================

   SharedBridgeCoupling.cpp
   Multi-string bridge coupling implementation for Aether String v2

  ==============================================================================
*/

#include "include/dsp/SharedBridgeCoupling.h"
#include <algorithm>

//==============================================================================
SharedBridgeCoupling::SharedBridgeCoupling() = default;

SharedBridgeCoupling::~SharedBridgeCoupling() = default;

//==============================================================================
void SharedBridgeCoupling::prepare(double sampleRate, int numStringsParam)
{
    sr = sampleRate;
    numStrings = numStringsParam;

    // Resize per-string arrays
    stringEnergy.resize(numStrings, 0.0f);
    stringFeedback.resize(numStrings, 0.0f);

    // Reset all state
    reset();
}

void SharedBridgeCoupling::reset()
{
    bridgeMotion = 0.0f;
    bridgeTargetMotion = 0.0f;

    // Clear per-string energy
    std::fill(stringEnergy.begin(), stringEnergy.end(), 0.0f);
    std::fill(stringFeedback.begin(), stringFeedback.end(), 0.0f);
}

//==============================================================================
float SharedBridgeCoupling::addStringEnergy(float energy, int stringIndex)
{
    // Validate string index
    if (stringIndex < 0 || stringIndex >= numStrings)
        return energy;  // No reflection if invalid

    // Store energy from this string
    stringEnergy[stringIndex] = energy;

    // Sum energy from all strings
    float totalEnergy = 0.0f;
    for (int i = 0; i < numStrings; ++i)
        totalEnergy += stringEnergy[i];

    // Update target bridge motion
    bridgeTargetMotion = totalEnergy / static_cast<float>(numStrings);

    // Apply bridge mass (lowpass filtering effect)
    // Higher mass = slower response
    float massCoefficient = 1.0f / (1.0f + bridgeMass);
    bridgeMotion += (bridgeTargetMotion - bridgeMotion) * massCoefficient;

    // Calculate reflection back to string
    // Bridge absorbs some energy, reflects the rest
    float bridgeAbsorption = std::tanh(std::abs(bridgeMotion) * 0.5f);
    float reflectedEnergy = energy * (1.0f - bridgeAbsorption * 0.3f);  // Max 30% absorption

    // Calculate feedback for all strings (if enabled)
    if (feedbackEnabled)
    {
        // Bridge motion feeds back to all strings
        // Cross-string coupling based on coupling coefficient
        for (int i = 0; i < numStrings; ++i)
        {
            if (i != stringIndex)  // Don't feedback to same string immediately
            {
                stringFeedback[i] = bridgeMotion * crossStringCoupling;
            }
        }
    }

    return reflectedEnergy;
}

float SharedBridgeCoupling::getStringFeedback(int stringIndex) const
{
    // Validate string index
    if (stringIndex < 0 || stringIndex >= numStrings)
        return 0.0f;

    return stringFeedback[stringIndex];
}

//==============================================================================
void SharedBridgeCoupling::setBridgeMass(float mass)
{
    // Clamp to valid range
    bridgeMass = juce::jlimit(0.1f, 10.0f, mass);
}

void SharedBridgeCoupling::setCrossStringCoupling(float coupling)
{
    // Clamp to valid range
    crossStringCoupling = juce::jlimit(0.0f, 1.0f, coupling);
}
