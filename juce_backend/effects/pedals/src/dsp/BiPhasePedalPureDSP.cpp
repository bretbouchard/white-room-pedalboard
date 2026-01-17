/*
  ==============================================================================

    BiPhasePedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Bi-Phase phaser pedal wrapper implementation

  ==============================================================================
*/

#include "dsp/BiPhasePedalPureDSP.h"
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// Constructor
//==============================================================================

BiPhasePedalPureDSP::BiPhasePedalPureDSP()
{
    // Default parameters
    params_.rateA = 0.5f;       // 0.5 Hz
    params_.depthA = 0.5f;      // 50%
    params_.feedbackA = 0.5f;   // 50%
    params_.rateB = 0.7f;       // 0.7 Hz
    params_.depthB = 0.5f;      // 50%
    params_.feedbackB = 0.5f;   // 50%
    params_.mix = 0.6f;         // 60% wet
    params_.level = 0.7f;       // 70%
    params_.routing = 1;        // Series (12-stage cascade)
}

//==============================================================================
// DSP Lifecycle
//==============================================================================

bool BiPhasePedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;

    // Prepare wrapped BiPhase DSP
    biPhaseDSP_.prepare(sampleRate, blockSize);

    // Set initial parameters
    BiPhaseParameters biPhaseParams;
    biPhaseParams.rateA = params_.rateA * 18.0f;  // Map 0-1 to 0.1-18 Hz
    biPhaseParams.depthA = params_.depthA;
    biPhaseParams.feedbackA = params_.feedbackA * 0.98f;  // Map 0-1 to 0-0.98
    biPhaseParams.rateB = params_.rateB * 18.0f;
    biPhaseParams.depthB = params_.depthB;
    biPhaseParams.feedbackB = params_.feedbackB * 0.98f;
    biPhaseParams.routingMode = static_cast<RoutingMode>(params_.routing);

    biPhaseDSP_.setParameters(biPhaseParams);

    return true;
}

void BiPhasePedalPureDSP::reset()
{
    // Reset wrapped BiPhase DSP
    biPhaseDSP_.reset();
}

void BiPhasePedalPureDSP::process(float** inputs, float** outputs,
                                 int numChannels, int numSamples)
{
    // Update wrapped BiPhase parameters
    BiPhaseParameters biPhaseParams;
    biPhaseParams.rateA = params_.rateA * 18.0f;
    biPhaseParams.depthA = params_.depthA;
    biPhaseParams.feedbackA = params_.feedbackA * 0.98f;
    biPhaseParams.rateB = params_.rateB * 18.0f;
    biPhaseParams.depthB = params_.depthB;
    biPhaseParams.feedbackB = params_.feedbackB * 0.98f;
    biPhaseParams.routingMode = static_cast<RoutingMode>(params_.routing);

    biPhaseDSP_.setParameters(biPhaseParams);

    // Process stereo through BiPhase
    if (numChannels >= 2)
    {
        biPhaseDSP_.processStereo(inputs[0], inputs[1], numSamples);
    }

    // Apply mix and level
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float dry = inputs[ch][i];
            float wet = outputs[ch][i];  // BiPhase output

            // Mix dry/wet
            float output = dry * (1.0f - params_.mix) + wet * params_.mix;

            // Apply level
            output *= params_.level;

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* BiPhasePedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"rateA", "Rate A", "Hz", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"depthA", "Depth A", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"feedbackA", "Feedback A", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"rateB", "Rate B", "Hz", 0.0f, 1.0f, 0.7f, true, 0.01f},
        {"depthB", "Depth B", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"feedbackB", "Feedback B", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"mix", "Mix", "%", 0.0f, 1.0f, 0.6f, true, 0.01f},
        {"level", "Level", "", 0.0f, 1.0f, 0.7f, true, 0.01f},
        {"routing", "Routing", "", 0.0f, 2.0f, 1.0f, true, 1.0f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float BiPhasePedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case RateA: return params_.rateA;
        case DepthA: return params_.depthA;
        case FeedbackA: return params_.feedbackA;
        case RateB: return params_.rateB;
        case DepthB: return params_.depthB;
        case FeedbackB: return params_.feedbackB;
        case Mix: return params_.mix;
        case Level: return params_.level;
        case Routing: return static_cast<float>(params_.routing);
    }
    return 0.0f;
}

void BiPhasePedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to valid range
    value = clamp(value, 0.0f, 1.0f);

    switch (index)
    {
        case RateA: params_.rateA = value; break;
        case DepthA: params_.depthA = value; break;
        case FeedbackA: params_.feedbackA = value; break;
        case RateB: params_.rateB = value; break;
        case DepthB: params_.depthB = value; break;
        case FeedbackB: params_.feedbackB = value; break;
        case Mix: params_.mix = value; break;
        case Level: params_.level = value; break;
        case Routing:
            params_.routing = static_cast<int>(clamp(value, 0.0f, 2.0f));
            break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* BiPhasePedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &BIPHASE_PRESETS[index];

    return nullptr;
}

} // namespace DSP
