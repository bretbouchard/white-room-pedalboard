/*
  ==============================================================================

    FarFieldPureDSP.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    Distance rendering effect DSP engine

    This effect simulates sound propagation over distance, including:
    - Distance-based attenuation (inverse square law)
    - High-frequency air absorption
    - Stereo width narrowing with distance
    - Doppler effect from source velocity
    - Near-to-far crossfading

  ==============================================================================
*/

#pragma once

#include <cmath>
#include <algorithm>
#include <cstdint>

namespace farfield {

//==============================================================================
// DSP Parameters Structure
//==============================================================================

struct FarFieldParams {
    float distance_m;        // Distance to sound source (0-300m)
    float maxDistance_m;     // Maximum distance (1-500m)
    float airAmount;         // High-frequency absorption (0-1)
    float soften;            // Transient softening (0-1)
    float width;             // Stereo width (0-1)
    float level;             // Output level (0-2)
    float nearFade_m;        // Near fade start (0-20m)
    float farFade_m;         // Far fade end (1-100m)
    float sourceVelocity;    // Source velocity (-80 to +80 m/s)
    float dopplerAmount;     // Doppler effect amount (0-1)

    FarFieldParams()
        : distance_m(10.0f)
        , maxDistance_m(300.0f)
        , airAmount(0.7f)
        , soften(0.5f)
        , width(1.0f)
        , level(1.0f)
        , nearFade_m(5.0f)
        , farFade_m(20.0f)
        , sourceVelocity(0.0f)
        , dopplerAmount(0.0f)
    {}
};

//==============================================================================
// Far Field DSP Engine
//==============================================================================

class FarField {
public:
    FarField()
        : sampleRate(48000.0)
        , lastLeftIn(0.0f)
        , lastRightIn(0.0f)
        , lastLeftOut(0.0f)
        , lastRightOut(0.0f)
        , dopplerPhase(0.0f)
    {
    }

    //==========================================================================
    // Initialization
    //==========================================================================

    void prepare(double newSampleRate, int /*maxSamplesPerBlock*/)
    {
        sampleRate = newSampleRate;
        reset();
    }

    void reset()
    {
        lastLeftIn = 0.0f;
        lastRightIn = 0.0f;
        lastLeftOut = 0.0f;
        lastRightOut = 0.0f;
        dopplerPhase = 0.0f;
    }

    //==========================================================================
    // Parameter Setting
    //==========================================================================

    void setDistance(float distance) { params.distance_m = distance; }
    void setMaxDistance(float maxDist) { params.maxDistance_m = maxDist; }
    void setAirAmount(float amount) { params.airAmount = amount; }
    void setSoften(float soft) { params.soften = soft; }
    void setWidth(float w) { params.width = w; }
    void setLevel(float lvl) { params.level = lvl; }
    void setNearFade(float fade) { params.nearFade_m = fade; }
    void setFarFade(float fade) { params.farFade_m = fade; }
    void setSourceVelocity(float vel) { params.sourceVelocity = vel; }
    void setDopplerAmount(float amount) { params.dopplerAmount = amount; }

    //==========================================================================
    // Processing
    //==========================================================================

    void processStereo(float* left, float* right, int numSamples)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            // Process stereo sample
            float leftIn = left[i];
            float rightIn = right[i];

            processSample(leftIn, rightIn, left[i], right[i]);
        }
    }

private:
    //==========================================================================
    // Sample Processing
    //==========================================================================

    void processSample(float leftIn, float rightIn, float& leftOut, float& rightOut)
    {
        // 1. Calculate distance-based gain (inverse square law with minimum distance)
        float minDistance = 1.0f;
        float effectiveDistance = std::max(params.distance_m, minDistance);

        // Inverse square law: gain = 1 / (1 + distance^2)
        float distanceGain = 1.0f / (1.0f + 0.01f * effectiveDistance * effectiveDistance);

        // 2. Calculate near-to-far crossfade
        float distanceRatio = (effectiveDistance - params.nearFade_m) /
                             std::max(0.1f, params.farFade_m - params.nearFade_m);
        distanceRatio = std::clamp(distanceRatio, 0.0f, 1.0f);

        // Smooth crossfade using cosine
        float fadeFactor = 0.5f * (1.0f - std::cos(distanceRatio * 3.14159265f));

        // 3. Apply high-frequency air absorption
        float leftAir = applyAirAbsorption(leftIn, lastLeftIn);
        float rightAir = applyAirAbsorption(rightIn, lastRightIn);

        // Blend dry and air-absorbed signal based on distance
        float leftProcessed = leftIn + (leftAir - leftIn) * fadeFactor;
        float rightProcessed = rightIn + (rightAir - rightIn) * fadeFactor;

        // 4. Apply transient softening
        float leftSoftened = applySoften(leftProcessed, lastLeftIn);
        float rightSoftened = applySoften(rightProcessed, lastRightIn);

        // 5. Apply distance gain
        float leftGained = leftSoftened * distanceGain;
        float rightGained = rightSoftened * distanceGain;

        // 6. Apply stereo width narrowing with distance
        float mid = (leftGained + rightGained) * 0.5f;
        float side = (leftGained - rightGained) * 0.5f;

        // Width decreases with distance
        float widthFactor = params.width * (1.0f - 0.5f * fadeFactor);
        float leftWide = mid + side * widthFactor;
        float rightWide = mid - side * widthFactor;

        // 7. Apply Doppler effect (pitch shift based on source velocity)
        float leftDoppler = applyDoppler(leftWide);
        float rightDoppler = applyDoppler(rightWide);

        // 8. Apply output level
        leftOut = leftDoppler * params.level;
        rightOut = rightDoppler * params.level;

        // Update state
        lastLeftIn = leftIn;
        lastRightIn = rightIn;
        lastLeftOut = leftOut;
        lastRightOut = rightOut;
    }

    //==========================================================================
    // Air Absorption (LPF)
    //==========================================================================

    float applyAirAbsorption(float input, float lastInput)
    {
        // Air absorbs high frequencies more than low frequencies
        // Implement as simple lowpass filter
        float amount = params.airAmount * 0.5f; // Max 50% absorption
        float cutoff = 20000.0f * (1.0f - amount);
        float rc = 1.0f / (2.0f * 3.14159265f * cutoff);
        float dt = 1.0f / static_cast<float>(sampleRate);
        float alpha = dt / (rc + dt);

        return lastInput + alpha * (input - lastInput);
    }

    //==========================================================================
    // Transient Softening
    //==========================================================================

    float applySoften(float input, float lastInput)
    {
        // Soften transients by limiting rate of change
        float maxDelta = 1.0f - params.soften * 0.9f; // 0.1 to 1.0
        float delta = input - lastInput;
        float clampedDelta = std::clamp(delta, -maxDelta, maxDelta);
        return lastInput + clampedDelta;
    }

    //==========================================================================
    // Doppler Effect
    //==========================================================================

    float applyDoppler(float input)
    {
        if (params.dopplerAmount < 0.01f)
            return input;

        // Doppler shift frequency
        float speedOfSound = 343.0f; // m/s at 20°C
        float dopplerShift = 1.0f + (params.sourceVelocity / speedOfSound);
        dopplerShift = 1.0f + (dopplerShift - 1.0f) * params.dopplerAmount;

        // Simple delay-based Doppler implementation
        float delaySamples = dopplerShift * 10.0f; // Max 10 samples delay
        dopplerPhase += delaySamples;
        if (dopplerPhase >= 10.0f)
            dopplerPhase -= 10.0f;

        // For simplicity, we'll just modulate the input slightly
        // A full implementation would use a variable delay line
        float modulation = std::sin(dopplerPhase * 0.1f) * 0.01f * params.dopplerAmount;
        return input * (1.0f + modulation);
    }

    //==========================================================================
    // Member Variables
    //==========================================================================

    double sampleRate;
    FarFieldParams params;

    // State variables
    float lastLeftIn, lastRightIn;
    float lastLeftOut, lastRightOut;
    float dopplerPhase;
};

//==============================================================================
// Legacy namespace support
//==============================================================================

namespace DSP {
    using FarField = farfield::FarField;
}

} // namespace farfield
