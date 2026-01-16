/*
  ==============================================================================

    CompressorPedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Pedal-style compressor implementation

  ==============================================================================
*/

#include "dsp/CompressorPedalPureDSP.h"
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// Constructor
//==============================================================================

CompressorPedalPureDSP::CompressorPedalPureDSP()
{
    // Default parameters
    params_.threshold = -20.0f;  // -20dB
    params_.ratio = 4.0f;        // 4:1
    params_.attack = 5.0f;       // 5ms
    params_.release = 100.0f;    // 100ms
    params_.level = 6.0f;        // 6dB makeup
    params_.blend = 0.4f;        // 40% wet
    params_.sustain = 0.0f;      // Auto off
    params_.knee = 2.0f;         // 2dB soft knee
    params_.tone = 0.5f;         // Neutral tone
    params_.circuit = 0;         // Dynacomp
}

//==============================================================================
// DSP Lifecycle
//==============================================================================

bool CompressorPedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;

    reset();

    return true;
}

void CompressorPedalPureDSP::reset()
{
    // Reset envelope followers
    envelope_[0] = 0.0f;
    envelope_[1] = 0.0f;

    // Reset tone filter
    toneZ1_[0] = 0.0f;
    toneZ1_[1] = 0.0f;

    // Calculate initial attack/release coefficients
    float attackTime = std::max(params_.attack * 0.001f, 0.0001f);
    float releaseTime = std::max(params_.release * 0.001f, 0.0001f);

    attackCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * attackTime));
    releaseCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * releaseTime));
}

void CompressorPedalPureDSP::process(float** inputs, float** outputs,
                                   int numChannels, int numSamples)
{
    // Update coefficients (auto mode or manual)
    float attackTime, releaseTime;

    if (params_.sustain > 0.5f)
    {
        // Program-dependent attack/release
        attackTime = 0.001f;  // 1ms
        releaseTime = 0.5f;   // 500ms
    }
    else
    {
        // Manual attack/release
        attackTime = std::max(params_.attack * 0.001f, 0.0001f);
        releaseTime = std::max(params_.release * 0.001f, 0.0001f);
    }

    attackCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * attackTime));
    releaseCoeff_ = std::exp(-1.0f / (static_cast<float>(sampleRate_) * releaseTime));

    // Convert threshold to linear
    float thresholdLinear = dbToLinear(params_.threshold);
    float ratio = params_.ratio;

    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float input = inputs[ch][i];
            float dry = input;

            // Process envelope follower
            float env = processEnvelope(std::abs(input), ch);

            // Calculate gain reduction
            float gainReduction = calculateGainReduction(env, thresholdLinear);

            // Apply circuit-specific compression
            float wet = processCircuit(input, gainReduction);

            // Apply tone control
            wet = processTone(wet);

            // Apply makeup gain
            wet *= dbToLinear(params_.level);

            // Blend dry/wet
            float output = dry * (1.0f - params_.blend) + wet * params_.blend;

            // Soft limit output to prevent clipping from extreme level settings
            output = std::tanh(output);

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// DSP Methods
//==============================================================================

float CompressorPedalPureDSP::processEnvelope(float input, int channel)
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

float CompressorPedalPureDSP::calculateGainReduction(float inputLevel, float threshold)
{
    // Soft knee calculation
    float kneeHalf = dbToLinear(params_.knee / 2.0f);
    float kneeStart = threshold / kneeHalf;
    float kneeEnd = threshold * kneeHalf;

    float gainReduction = 1.0f;

    if (inputLevel < kneeStart)
    {
        // Below threshold - no reduction
        gainReduction = 1.0f;
    }
    else if (inputLevel > kneeEnd)
    {
        // Above knee - full ratio
        float excess = inputLevel - threshold;
        gainReduction = threshold + excess / params_.ratio;
        gainReduction /= inputLevel;
    }
    else
    {
        // Within knee - smooth transition
        float x = (inputLevel - kneeStart) / (kneeEnd - kneeStart);
        float ratioInterp = 1.0f + x * (params_.ratio - 1.0f);
        gainReduction = threshold + (inputLevel - threshold) / ratioInterp;
        gainReduction /= inputLevel;
    }

    return gainReduction;
}

float CompressorPedalPureDSP::processCircuit(float input, float gainReduction)
{
    CompressorCircuit circuit = static_cast<CompressorCircuit>(params_.circuit);
    float output = input * gainReduction;

    switch (circuit)
    {
        case CompressorCircuit::Dynacomp:
            // MXR Dynacomp - soft clipping
            output = std::tanh(output * 1.2f) * 0.9f;
            break;

        case CompressorCircuit::Ross:
            // Ross Compressor - clean
            output = std::tanh(output * 1.1f) * 0.95f;
            break;

        case CompressorCircuit::BossCS2:
            // Boss CS-2 - warm
            output = softClip(output * 1.15f) * 0.92f;
            break;

        case CompressorCircuit::Diamond:
            // Diamond Compressor - transparent
            output = output * 0.98f;  // Minimal coloration
            break;

        case CompressorCircuit::Keeley:
            // Keeley Compressor - smooth
            output = std::tanh(output * 1.1f) * 0.93f;
            break;

        case CompressorCircuit::Wampler:
            // Wampler Ego - musical
            output = softClip(output * 1.2f) * 0.91f;
            break;

        case CompressorCircuit::Empress:
            // Empress Compressor - clean
            output = std::tanh(output * 1.05f) * 0.96f;
            break;

        case CompressorCircuit::Origin:
            // Origin Cali76 - vintage
            output = softClip(output * 1.25f) * 0.89f;
            break;
    }

    return output;
}

float CompressorPedalPureDSP::processTone(float input)
{
    // Simple high shelf filter for brightness control
    // tone = 0 (dark) to 1 (bright)

    float b = 0.0f;
    float a = 1.0f - params_.tone * 0.3f;  // 0.7 to 1.0

    int ch = 0;  // Use first channel state
    float output = a * input + b * toneZ1_[ch];
    toneZ1_[ch] = output;

    return output;
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* CompressorPedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"threshold", "Threshold", "dB", -40.0f, 0.0f, -20.0f, true, 0.01f},
        {"ratio", "Ratio", ":1", 1.0f, 20.0f, 4.0f, true, 0.01f},
        {"attack", "Attack", "ms", 0.1f, 100.0f, 5.0f, true, 0.01f},
        {"release", "Release", "ms", 10.0f, 1000.0f, 100.0f, true, 0.01f},
        {"level", "Level", "dB", 0.0f, 30.0f, 6.0f, true, 0.01f},
        {"blend", "Blend", "%", 0.0f, 1.0f, 0.4f, true, 0.01f},
        {"sustain", "Sustain", "", 0.0f, 1.0f, 0.0f, true, 1.0f},
        {"knee", "Knee", "dB", 0.0f, 6.0f, 2.0f, true, 0.01f},
        {"tone", "Tone", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"circuit", "Circuit", "", 0.0f, 7.0f, 0.0f, true, 1.0f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float CompressorPedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case Threshold: return params_.threshold;
        case Ratio: return params_.ratio;
        case Attack: return params_.attack;
        case Release: return params_.release;
        case Level: return params_.level;
        case Blend: return params_.blend;
        case Sustain: return params_.sustain;
        case Knee: return params_.knee;
        case Tone: return params_.tone;
        case Circuit: return static_cast<float>(params_.circuit);
    }
    return 0.0f;
}

void CompressorPedalPureDSP::setParameterValue(int index, float value)
{
    switch (index)
    {
        case Threshold: params_.threshold = value; break;
        case Ratio: params_.ratio = value; break;
        case Attack: params_.attack = value; break;
        case Release: params_.release = value; break;
        case Level: params_.level = value; break;
        case Blend: params_.blend = value; break;
        case Sustain: params_.sustain = value; break;
        case Knee: params_.knee = value; break;
        case Tone: params_.tone = value; break;
        case Circuit:
            params_.circuit = static_cast<int>(clamp(value, 0.0f, 7.0f));
            break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* CompressorPedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &COMPRESSOR_PRESETS[index];

    return nullptr;
}

} // namespace DSP
