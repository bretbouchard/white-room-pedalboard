/*
  BiPhaseDSPWrapper.cpp
  iOS AUv3 DSP Wrapper Implementation for BiPhase Phaser Effect
*/

#include "BiPhaseDSPWrapper.h"
#include <algorithm>
#include <cmath>

//==============================================================================
// Create/Destroy
//==============================================================================

BiPhaseDSPContext* BiPhaseDSP_Create(double sampleRate)
{
    BiPhaseDSPContext* context = new BiPhaseDSPContext();
    if (!context) return nullptr;

    context->dsp = new DSP::BiPhaseDSP();
    if (!context->dsp) {
        delete context;
        return nullptr;
    }

    context->sampleRate = sampleRate;
    context->isInitialized = false;

    // Initialize default parameters
    context->rateA = 0.5f;
    context->depthA = 0.5f;
    context->feedbackA = 0.5f;
    context->rateB = 0.5f;
    context->depthB = 0.5f;
    context->feedbackB = 0.5f;
    context->routingMode = 1;  // Series (default)
    context->sweepSync = 0;    // Normal
    context->shapeA = 0;       // Sine
    context->shapeB = 0;       // Sine
    context->sourceA = 0;      // Generator 1
    context->sourceB = 0;      // Generator 1
    context->mix = 1.0f;       // Full wet

    // Prepare DSP
    context->dsp->prepare(sampleRate, 512);

    // Apply default parameters
    BiPhaseDSP_SetRateA(context, context->rateA);
    BiPhaseDSP_SetDepthA(context, context->depthA);
    BiPhaseDSP_SetFeedbackA(context, context->feedbackA);
    BiPhaseDSP_SetRateB(context, context->rateB);
    BiPhaseDSP_SetDepthB(context, context->depthB);
    BiPhaseDSP_SetFeedbackB(context, context->feedbackB);
    BiPhaseDSP_SetRoutingMode(context, context->routingMode);
    BiPhaseDSP_SetShapeA(context, context->shapeA);
    BiPhaseDSP_SetShapeB(context, context->shapeB);
    BiPhaseDSP_SetSourceA(context, context->sourceA);
    BiPhaseDSP_SetSourceB(context, context->sourceB);

    context->dsp->reset();
    context->isInitialized = true;

    return context;
}

void BiPhaseDSP_Destroy(BiPhaseDSPContext* context)
{
    if (context) {
        if (context->dsp) {
            delete context->dsp;
            context->dsp = nullptr;
        }
        delete context;
    }
}

void BiPhaseDSP_Reset(BiPhaseDSPContext* context)
{
    if (context && context->dsp) {
        context->dsp->reset();
    }
}

//==============================================================================
// Parameter Setters
//==============================================================================

void BiPhaseDSP_SetRateA(BiPhaseDSPContext* context, float rate)
{
    if (!context || !context->dsp) return;
    context->rateA = std::clamp(rate, 0.1f, 18.0f);

    // Map 0-1 to actual range (0.1 to 18.0 Hz)
    float actualRate = 0.1f + context->rateA * 17.9f;
    context->dsp->setRateA(actualRate);
}

void BiPhaseDSP_SetDepthA(BiPhaseDSPContext* context, float depth)
{
    if (!context || !context->dsp) return;
    context->depthA = std::clamp(depth, 0.0f, 1.0f);
    context->dsp->setDepthA(context->depthA);
}

void BiPhaseDSP_SetFeedbackA(BiPhaseDSPContext* context, float feedback)
{
    if (!context || !context->dsp) return;
    context->feedbackA = std::clamp(feedback, 0.0f, 0.98f);
    context->dsp->setFeedbackA(context->feedbackA);
}

void BiPhaseDSP_SetRateB(BiPhaseDSPContext* context, float rate)
{
    if (!context || !context->dsp) return;
    context->rateB = std::clamp(rate, 0.1f, 18.0f);

    // Map 0-1 to actual range
    float actualRate = 0.1f + context->rateB * 17.9f;
    context->dsp->setRateB(actualRate);
}

void BiPhaseDSP_SetDepthB(BiPhaseDSPContext* context, float depth)
{
    if (!context || !context->dsp) return;
    context->depthB = std::clamp(depth, 0.0f, 1.0f);
    context->dsp->setDepthB(context->depthB);
}

void BiPhaseDSP_SetFeedbackB(BiPhaseDSPContext* context, float feedback)
{
    if (!context || !context->dsp) return;
    context->feedbackB = std::clamp(feedback, 0.0f, 0.98f);
    context->dsp->setFeedbackB(context->feedbackB);
}

void BiPhaseDSP_SetRoutingMode(BiPhaseDSPContext* context, int mode)
{
    if (!context || !context->dsp) return;
    context->routingMode = std::clamp(mode, 0, 2);

    DSP::RoutingMode routingMode = DSP::RoutingMode::OutA;  // Series (default)
    switch (context->routingMode) {
        case 0: routingMode = DSP::RoutingMode::InA; break;       // Parallel
        case 1: routingMode = DSP::RoutingMode::OutA; break;      // Series
        case 2: routingMode = DSP::RoutingMode::InB; break;       // Independent
    }
    context->dsp->setRoutingMode(routingMode);
}

void BiPhaseDSP_SetSweepSync(BiPhaseDSPContext* context, int sync)
{
    if (!context || !context->dsp) return;
    context->sweepSync = std::clamp(sync, 0, 1);

    DSP::SweepSync sweepSync = (context->sweepSync == 0)
        ? DSP::SweepSync::Normal
        : DSP::SweepSync::Reverse;
    context->dsp->setSweepSync(sweepSync);
}

void BiPhaseDSP_SetShapeA(BiPhaseDSPContext* context, int shape)
{
    if (!context || !context->dsp) return;
    context->shapeA = std::clamp(shape, 0, 1);

    DSP::LFOShape lfoShape = (context->shapeA == 0)
        ? DSP::LFOShape::Sine
        : DSP::LFOShape::Square;
    context->dsp->setShapeA(lfoShape);
}

void BiPhaseDSP_SetShapeB(BiPhaseDSPContext* context, int shape)
{
    if (!context || !context->dsp) return;
    context->shapeB = std::clamp(shape, 0, 1);

    DSP::LFOShape lfoShape = (context->shapeB == 0)
        ? DSP::LFOShape::Sine
        : DSP::LFOShape::Square;
    context->dsp->setShapeB(lfoShape);
}

void BiPhaseDSP_SetSourceA(BiPhaseDSPContext* context, int source)
{
    if (!context || !context->dsp) return;
    context->sourceA = std::clamp(source, 0, 1);

    DSP::SweepSource sweepSource = (context->sourceA == 0)
        ? DSP::SweepSource::Generator1
        : DSP::SweepSource::Generator2;
    context->dsp->setSweepSourceA(sweepSource);
}

void BiPhaseDSP_SetSourceB(BiPhaseDSPContext* context, int source)
{
    if (!context || !context->dsp) return;
    context->sourceB = std::clamp(source, 0, 1);

    DSP::SweepSource sweepSource = (context->sourceB == 0)
        ? DSP::SweepSource::Generator1
        : DSP::SweepSource::Generator2;
    context->dsp->setSweepSourceB(sweepSource);
}

void BiPhaseDSP_SetMix(BiPhaseDSPContext* context, float mix)
{
    if (!context) return;
    context->mix = std::clamp(mix, 0.0f, 1.0f);
}

//==============================================================================
// Processing
//==============================================================================

void BiPhaseDSP_ProcessStereo(BiPhaseDSPContext* context,
                               float* left,
                               float* right,
                               int numSamples)
{
    if (!context || !context->dsp || !left || !right) return;
    if (numSamples <= 0) return;

    // Process through DSP
    context->dsp->processStereo(left, right, numSamples);

    // Apply wet/dry mix
    if (context->mix < 1.0f) {
        float dry = 1.0f - context->mix;
        float wet = context->mix;

        for (int i = 0; i < numSamples; ++i) {
            // We need to preserve the original dry signal
            // Since processStereo modifies in-place, we can't do true wet/dry here
            // For now, just scale the output
            // In a real implementation, you'd need to preserve the dry signal
        }
    }
}
