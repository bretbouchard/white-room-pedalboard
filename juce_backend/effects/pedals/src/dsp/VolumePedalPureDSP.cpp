/*
  ==============================================================================

    VolumePedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Volume/Expression pedal implementation

  ==============================================================================
*/

#include "dsp/VolumePedalPureDSP.h"
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// Constructor
//==============================================================================

VolumePedalPureDSP::VolumePedalPureDSP()
{
    // Default parameters
    params_.volume = 1.0f;      // 100%
    params_.minimum = 0.0f;     // 0%
    params_.expressionMode = 0.0f;  // Off
    params_.reverse = 0.0f;     // Off
    params_.curve = 0.5f;       // Semi-log
    params_.range = 1.0f;       // Full range
    params_.level = 1.0f;       // Unity
}

//==============================================================================
// DSP Lifecycle
//==============================================================================

bool VolumePedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;

    reset();

    return true;
}

void VolumePedalPureDSP::reset()
{
    // Reset smoothing state
    currentVolume_[0] = 1.0f;
    currentVolume_[1] = 1.0f;

    // Calculate smoothing coefficient
    float smoothingTime = 0.01f;  // 10ms smoothing
    smoothingCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * smoothingTime));
}

void VolumePedalPureDSP::process(float** inputs, float** outputs,
                                int numChannels, int numSamples)
{
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float input = inputs[ch][i];

            // Get volume value (0-1)
            float volume = params_.volume;

            // Apply reverse if enabled
            if (params_.reverse > 0.5f)
            {
                volume = 1.0f - volume;
            }

            // Apply range limiting
            float effectiveRange = params_.range;
            volume = params_.minimum + volume * (effectiveRange - params_.minimum);

            // Apply curve
            volume = applyCurve(volume);

            // Smooth volume changes
            volume = smoothVolume(volume, ch);

            // Apply volume
            float output = input * volume;

            // Apply output level
            output *= params_.level;

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// DSP Methods
//==============================================================================

float VolumePedalPureDSP::applyCurve(float input)
{
    // curve = 0 (linear) to 1 (logarithmic)
    // curve = 0.5 is semi-log

    if (params_.curve < 0.25f)
    {
        // Linear
        return input;
    }
    else if (params_.curve < 0.75f)
    {
        // Semi-log (exp curve)
        float t = (params_.curve - 0.25f) / 0.5f;  // 0-1
        float linear = input;
        float log = std::pow(input, 0.5f);
        return lerp(linear, log, t);
    }
    else
    {
        // Logarithmic
        float t = (params_.curve - 0.75f) / 0.25f;  // 0-1
        float log = std::pow(input, 0.5f);
        float heavyLog = std::pow(input, 0.3f);
        return lerp(log, heavyLog, t);
    }
}

float VolumePedalPureDSP::smoothVolume(float target, int channel)
{
    // Exponential smoothing
    currentVolume_[channel] = target + (currentVolume_[channel] - target) * smoothingCoeff_;
    return currentVolume_[channel];
}

//==============================================================================
// Expression Control
//==============================================================================

float VolumePedalPureDSP::getExpressionValue() const
{
    // Return current expression value (0-1) for controlling other parameters
    float value = params_.volume;

    // Apply reverse if enabled
    if (params_.reverse > 0.5f)
    {
        value = 1.0f - value;
    }

    // Apply range limiting
    float effectiveRange = params_.range;
    value = params_.minimum + value * (effectiveRange - params_.minimum);

    // Apply curve
    // Note: We need to recreate the curve logic here without modifying state
    if (params_.curve < 0.25f)
    {
        return value;
    }
    else if (params_.curve < 0.75f)
    {
        float t = (params_.curve - 0.25f) / 0.5f;
        float linear = value;
        float log = std::pow(value, 0.5f);
        return lerp(linear, log, t);
    }
    else
    {
        float t = (params_.curve - 0.75f) / 0.25f;
        float log = std::pow(value, 0.5f);
        float heavyLog = std::pow(value, 0.3f);
        return lerp(log, heavyLog, t);
    }
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* VolumePedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"volume", "Volume", "%", 0.0f, 1.0f, 1.0f, true, 0.01f},
        {"minimum", "Minimum", "%", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"expressionMode", "Expression", "", 0.0f, 1.0f, 0.0f, true, 1.0f},
        {"reverse", "Reverse", "", 0.0f, 1.0f, 0.0f, true, 1.0f},
        {"curve", "Curve", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"range", "Range", "%", 0.0f, 1.0f, 1.0f, true, 0.01f},
        {"level", "Level", "", 0.0f, 1.0f, 1.0f, true, 0.01f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float VolumePedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case Volume: return params_.volume;
        case Minimum: return params_.minimum;
        case ExpressionMode: return params_.expressionMode;
        case Reverse: return params_.reverse;
        case Curve: return params_.curve;
        case Range: return params_.range;
        case Level: return params_.level;
    }
    return 0.0f;
}

void VolumePedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to 0-1 range
    value = clamp(value, 0.0f, 1.0f);

    switch (index)
    {
        case Volume: params_.volume = value; break;
        case Minimum: params_.minimum = value; break;
        case ExpressionMode: params_.expressionMode = value; break;
        case Reverse: params_.reverse = value; break;
        case Curve: params_.curve = value; break;
        case Range: params_.range = value; break;
        case Level: params_.level = value; break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* VolumePedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &VOLUME_PRESETS[index];

    return nullptr;
}

} // namespace DSP
