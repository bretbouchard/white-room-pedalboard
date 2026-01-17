/*
  ==============================================================================

    NoiseGatePedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Simple noise gate pedal implementation

  ==============================================================================
*/

#include "dsp/NoiseGatePedalPureDSP.h"
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// Constructor
//==============================================================================

NoiseGatePedalPureDSP::NoiseGatePedalPureDSP()
{
    // Default parameters
    params_.threshold = -50.0f;  // -50dB
    params_.attack = 5.0f;       // 5ms
    params_.hold = 50.0f;        // 50ms
    params_.release = 100.0f;    // 100ms
    params_.hysteresis = 3.0f;   // 3dB
    params_.mix = 1.0f;          // 100% wet
}

//==============================================================================
// DSP Lifecycle
//==============================================================================

bool NoiseGatePedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;

    reset();

    return true;
}

void NoiseGatePedalPureDSP::reset()
{
    // Reset envelope followers
    envelope_[0] = 0.0f;
    envelope_[1] = 0.0f;

    // Reset gate state
    gateOpen_[0] = false;
    gateOpen_[1] = false;

    // Reset hold timers
    holdTimer_[0] = 0;
    holdTimer_[1] = 0;

    // Calculate attack/release coefficients
    float attackTime = std::max(params_.attack * 0.001f, 0.0001f);
    float releaseTime = std::max(params_.release * 0.001f, 0.0001f);

    attackCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * attackTime));
    releaseCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * releaseTime));
}

void NoiseGatePedalPureDSP::process(float** inputs, float** outputs,
                                   int numChannels, int numSamples)
{
    // Update coefficients in case parameters changed
    float attackTime = std::max(params_.attack * 0.001f, 0.0001f);
    float releaseTime = std::max(params_.release * 0.001f, 0.0001f);

    attackCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * attackTime));
    releaseCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * releaseTime));

    // Convert threshold to linear
    float thresholdLinear = dbToLinear(params_.threshold);
    float hysteresisLinear = dbToLinear(params_.hysteresis);

    float openThreshold = thresholdLinear * hysteresisLinear;
    float closeThreshold = thresholdLinear;

    // Calculate hold time in samples
    int holdSamples = static_cast<int>(params_.hold * 0.001f * sampleRate_);

    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float input = inputs[ch][i];
            float dry = input;

            // Process envelope follower
            float env = processEnvelope(std::abs(input), ch);

            // Process gate with hysteresis
            float wet = processGate(input, env, ch);

            // Update hold timer
            if (gateOpen_[ch])
            {
                if (holdTimer_[ch] > 0)
                    holdTimer_[ch]--;
                else if (env < closeThreshold)
                    gateOpen_[ch] = false;
            }
            else
            {
                if (env > openThreshold)
                {
                    gateOpen_[ch] = true;
                    holdTimer_[ch] = holdSamples;
                }
            }

            // Apply mix
            float output = dry * (1.0f - params_.mix) + wet * params_.mix;

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// DSP Methods
//==============================================================================

float NoiseGatePedalPureDSP::processEnvelope(float input, int channel)
{
    // Attack phase (envelope goes up)
    if (input > envelope_[channel])
    {
        envelope_[channel] = input + (envelope_[channel] - input) * attackCoeff_;
    }
    // Release phase (envelope goes down)
    else
    {
        envelope_[channel] = input + (envelope_[channel] - input) * releaseCoeff_;
    }

    return envelope_[channel];
}

float NoiseGatePedalPureDSP::processGate(float input, float envelope, int channel)
{
    // Gate is open - pass audio
    if (gateOpen_[channel])
    {
        return input;
    }
    // Gate is closed - attenuate
    else
    {
        // Apply -60dB attenuation when closed
        return input * 0.001f;
    }
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* NoiseGatePedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"threshold", "Threshold", "dB", -60.0f, 0.0f, -50.0f, true, 0.01f},
        {"attack", "Attack", "ms", 0.1f, 100.0f, 5.0f, true, 0.01f},
        {"hold", "Hold", "ms", 0.0f, 1000.0f, 50.0f, true, 0.01f},
        {"release", "Release", "ms", 0.1f, 1000.0f, 100.0f, true, 0.01f},
        {"hysteresis", "Hysteresis", "dB", 0.0f, 6.0f, 3.0f, true, 0.01f},
        {"mix", "Mix", "%", 0.0f, 1.0f, 1.0f, true, 0.01f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float NoiseGatePedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case Threshold: return params_.threshold;
        case Attack: return params_.attack;
        case Hold: return params_.hold;
        case Release: return params_.release;
        case Hysteresis: return params_.hysteresis;
        case Mix: return params_.mix;
    }
    return 0.0f;
}

void NoiseGatePedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to valid range
    value = clamp(value, 0.0f, 1.0f);

    switch (index)
    {
        case Threshold: params_.threshold = value; break;
        case Attack: params_.attack = value; break;
        case Hold: params_.hold = value; break;
        case Release: params_.release = value; break;
        case Hysteresis: params_.hysteresis = value; break;
        case Mix: params_.mix = value; break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* NoiseGatePedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &NOISE_GATE_PRESETS[index];

    return nullptr;
}

} // namespace DSP
