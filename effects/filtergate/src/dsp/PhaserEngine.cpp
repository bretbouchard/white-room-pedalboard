#include "dsp/PhaserEngine.h"
#include <cmath>

namespace FilterGate {

PhaserEngine::PhaserEngine() = default;

PhaserEngine::~PhaserEngine() = default;

void PhaserEngine::prepare(double sampleRate, int samplesPerBlock)
{
    this->sampleRate = sampleRate;

    // Initialize parameter smoothers
    smoothedMix.reset(sampleRate, 0.05);
    smoothedMix.setCurrentAndTargetValue(currentParams.mix);

    smoothedFeedback.reset(sampleRate, 0.05);
    smoothedFeedback.setCurrentAndTargetValue(currentParams.feedback);

    // Build initial stages
    rebuildStages(currentParams.stages);
}

void PhaserEngine::reset()
{
    lfoPhase = 0.0f;
    feedbackState_L = 0.0f;
    feedbackState_R = 0.0f;

    for (auto& stage : stages)
    {
        if (stage)
            stage->reset();
    }

    // Reset smoothers
    smoothedMix.reset(sampleRate, 0.05);
    smoothedFeedback.reset(sampleRate, 0.05);
}

void PhaserEngine::setParams(const PhaserParams& params)
{
    targetParams = params;

    // Rebuild stages if needed
    if (params.stages != currentParams.stages)
    {
        rebuildStages(params.stages);
    }

    // Update LFO rate
    lfoIncrement = static_cast<float>(params.rateHz / sampleRate);

    // Update smoothed values
    smoothedMix.setTargetValue(params.mix);
    smoothedFeedback.setTargetValue(params.feedback);

    currentParams = params;
}

void PhaserEngine::process(float* input, float* output, int numSamples)
{
    jassert(input != nullptr);
    jassert(output != nullptr);
    jassert(numSamples >= 0);

    for (int i = 0; i < numSamples; ++i)
    {
        // Update LFO and get modulation
        updateLFO();
        float mod = calculateModulation(lfoPhase);

        // Calculate modulated frequency
        float modFreq = currentParams.centerHz + mod * currentParams.spread;

        // Convert frequency to all-pass coefficient
        // coeff = (tan(π*f/fs) - 1) / (tan(π*f/fs) + 1)
        float omega = 2.0f * juce::MathConstants<float>::pi * modFreq;
        float tan_omega_2 = std::tan(omega / (2.0f * static_cast<float>(sampleRate)));
        float coeff = (tan_omega_2 - 1.0f) / (tan_omega_2 + 1.0f);

        // Apply coefficient to all stages
        for (auto& stage : stages)
        {
            if (stage)
                stage->setCoefficient(coeff);
        }

        // Get current smoothed values
        float mix = smoothedMix.getNextValue();
        float feedback = smoothedFeedback.getNextValue();

        // Apply feedback to input
        float in = input[i] + feedbackState_L * feedback;

        // Process through all stages
        float wet = in;
        for (auto& stage : stages)
        {
            if (stage)
                wet = stage->process(wet);
        }

        // Update feedback state
        feedbackState_L = wet;
        if (std::abs(feedbackState_L) < 1e-10f)
            feedbackState_L = 0.0f;

        // Mix dry and wet
        output[i] = input[i] * (1.0f - mix) + wet * mix;
    }
}

void PhaserEngine::processStereo(float* left, float* right, int numSamples)
{
    jassert(left != nullptr);
    jassert(right != nullptr);
    jassert(numSamples >= 0);

    for (int i = 0; i < numSamples; ++i)
    {
        // Update LFO and get modulation (same for both channels)
        updateLFO();
        float mod = calculateModulation(lfoPhase);

        // Calculate modulated frequency
        float modFreq = currentParams.centerHz + mod * currentParams.spread;

        // Convert frequency to all-pass coefficient
        float omega = 2.0f * juce::MathConstants<float>::pi * modFreq;
        float tan_omega_2 = std::tan(omega / (2.0f * static_cast<float>(sampleRate)));
        float coeff = (tan_omega_2 - 1.0f) / (tan_omega_2 + 1.0f);

        // Apply coefficient to all stages
        for (auto& stage : stages)
        {
            if (stage)
                stage->setCoefficient(coeff);
        }

        // Get current smoothed values
        float mix = smoothedMix.getNextValue();
        float feedback = smoothedFeedback.getNextValue();

        // Process left channel
        float inL = left[i] + feedbackState_L * feedback;
        float wetL = inL;
        for (auto& stage : stages)
        {
            if (stage)
                wetL = stage->process(wetL);
        }
        feedbackState_L = wetL;
        if (std::abs(feedbackState_L) < 1e-10f)
            feedbackState_L = 0.0f;
        left[i] = left[i] * (1.0f - mix) + wetL * mix;

        // Process right channel
        float inR = right[i] + feedbackState_R * feedback;
        float wetR = inR;
        for (auto& stage : stages)
        {
            if (stage)
                wetR = stage->process(wetR);
        }
        feedbackState_R = wetR;
        if (std::abs(feedbackState_R) < 1e-10f)
            feedbackState_R = 0.0f;
        right[i] = right[i] * (1.0f - mix) + wetR * mix;
    }
}

void PhaserEngine::updateLFO()
{
    lfoPhase += lfoIncrement;
    if (lfoPhase >= 1.0f)
        lfoPhase -= 1.0f;
}

float PhaserEngine::calculateModulation(float phase)
{
    // Sine LFO: -1 to +1
    return std::sin(2.0f * juce::MathConstants<float>::pi * phase);
}

void PhaserEngine::rebuildStages(int numStages)
{
    stages.clear();

    for (int i = 0; i < numStages; ++i)
    {
        stages.push_back(std::make_unique<AllPassFilter>());
    }
}

float PhaserEngine::processSample(float input) {
    // Update LFO and get modulation
    updateLFO();
    float mod = calculateModulation(lfoPhase);

    // Calculate modulated frequency
    float modFreq = currentParams.centerHz + mod * currentParams.spread;

    // Convert frequency to all-pass coefficient
    float omega = 2.0f * juce::MathConstants<float>::pi * modFreq;
    float tan_omega_2 = std::tan(omega / (2.0f * static_cast<float>(sampleRate)));
    float coeff = (tan_omega_2 - 1.0f) / (tan_omega_2 + 1.0f);

    // Apply coefficient to all stages
    for (auto& stage : stages) {
        if (stage) {
            stage->setCoefficient(coeff);
        }
    }

    // Get current smoothed values
    float mix = smoothedMix.getNextValue();
    float feedback = smoothedFeedback.getNextValue();

    // Process with feedback
    float in = input + feedbackState_L * feedback;
    float wet = in;

    // Process through all all-pass stages
    for (auto& stage : stages) {
        if (stage) {
            wet = stage->process(wet);
        }
    }

    // Update feedback state
    feedbackState_L = wet;
    if (std::abs(feedbackState_L) < 1e-10f) {
        feedbackState_L = 0.0f;
    }

    // Mix dry and wet
    return input * (1.0f - mix) + wet * mix;
}

} // namespace FilterGate
