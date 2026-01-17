/*
  ==============================================================================

    EQPedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Pedal-style EQ implementation

  ==============================================================================
*/

#include "dsp/EQPedalPureDSP.h"
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// Constructor
//==============================================================================

EQPedalPureDSP::EQPedalPureDSP()
{
    // Default parameters
    params_.bass = 0.0f;
    params_.mid = 0.0f;
    params_.treble = 0.0f;
    params_.midFreq = 1000.0f;
    params_.level = 0.0f;
    params_.q = 1.0f;
    params_.circuit = 0;  // BossGE7
}

//==============================================================================
// DSP Lifecycle
//==============================================================================

bool EQPedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;

    reset();

    return true;
}

void EQPedalPureDSP::reset()
{
    // Reset filter states
    bassZ1_[0] = bassZ1_[1] = 0.0f;
    bassZ2_[0] = bassZ2_[1] = 0.0f;
    midZ1_[0] = midZ1_[1] = 0.0f;
    midZ2_[0] = midZ2_[1] = 0.0f;
    trebleZ1_[0] = trebleZ1_[1] = 0.0f;
    trebleZ2_[0] = trebleZ2_[1] = 0.0f;

    // Calculate filter coefficients
    calcLowShelf(params_.bass, 200.0f, bassB0_, bassB1_, bassB2_, bassA1_, bassA2_);
    calcPeaking(params_.mid, params_.midFreq, params_.q, midB0_, midB1_, midB2_, midA1_, midA2_);
    calcHighShelf(params_.treble, 4000.0f, trebleB0_, trebleB1_, trebleB2_, trebleA1_, trebleA2_);
}

void EQPedalPureDSP::process(float** inputs, float** outputs,
                            int numChannels, int numSamples)
{
    // Recalculate coefficients in case parameters changed
    calcLowShelf(params_.bass, 200.0f, bassB0_, bassB1_, bassB2_, bassA1_, bassA2_);
    calcPeaking(params_.mid, params_.midFreq, params_.q, midB0_, midB1_, midB2_, midA1_, midA2_);
    calcHighShelf(params_.treble, 4000.0f, trebleB0_, trebleB1_, trebleB2_, trebleA1_, trebleA2_);

    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float input = inputs[ch][i];

            // Process EQ filters
            float output = processBass(input, ch);
            output = processMid(output, ch);
            output = processTreble(output, ch);

            // Apply circuit coloration
            output = processCircuit(output);

            // Apply level
            output *= dbToLinear(params_.level);

            // Soft limit output to prevent clipping from extreme level settings
            output = std::tanh(output);

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// DSP Methods
//==============================================================================

float EQPedalPureDSP::processBass(float input, int channel)
{
    // Guard against NaN in filter state
    if (std::isnan(bassZ1_[channel]) || std::isinf(bassZ1_[channel])) bassZ1_[channel] = 0.0f;
    if (std::isnan(bassZ2_[channel]) || std::isinf(bassZ2_[channel])) bassZ2_[channel] = 0.0f;

    float output = bassB0_ * input + bassB1_ * bassZ1_[channel] + bassB2_ * bassZ2_[channel]
                  - bassA1_ * bassZ1_[channel] - bassA2_ * bassZ2_[channel];

    bassZ2_[channel] = bassZ1_[channel];
    bassZ1_[channel] = output;

    // Guard output
    if (std::isnan(output) || std::isinf(output)) output = input;

    return output;
}

float EQPedalPureDSP::processMid(float input, int channel)
{
    // Guard against NaN in filter state
    if (std::isnan(midZ1_[channel]) || std::isinf(midZ1_[channel])) midZ1_[channel] = 0.0f;
    if (std::isnan(midZ2_[channel]) || std::isinf(midZ2_[channel])) midZ2_[channel] = 0.0f;

    float output = midB0_ * input + midB1_ * midZ1_[channel] + midB2_ * midZ2_[channel]
                  - midA1_ * midZ1_[channel] - midA2_ * midZ2_[channel];

    midZ2_[channel] = midZ1_[channel];
    midZ1_[channel] = output;

    // Guard output
    if (std::isnan(output) || std::isinf(output)) output = input;

    return output;
}

float EQPedalPureDSP::processTreble(float input, int channel)
{
    // Guard against NaN in filter state
    if (std::isnan(trebleZ1_[channel]) || std::isinf(trebleZ1_[channel])) trebleZ1_[channel] = 0.0f;
    if (std::isnan(trebleZ2_[channel]) || std::isinf(trebleZ2_[channel])) trebleZ2_[channel] = 0.0f;

    float output = trebleB0_ * input + trebleB1_ * trebleZ1_[channel] + trebleB2_ * trebleZ2_[channel]
                  - trebleA1_ * trebleZ1_[channel] - trebleA2_ * trebleZ2_[channel];

    trebleZ2_[channel] = trebleZ1_[channel];
    trebleZ1_[channel] = output;

    // Guard output
    if (std::isnan(output) || std::isinf(output)) output = input;

    return output;
}

float EQPedalPureDSP::processCircuit(float input)
{
    EQCircuit circuit = static_cast<EQCircuit>(params_.circuit);
    float output = input;

    switch (circuit)
    {
        case EQCircuit::BossGE7:
            // Boss GE-7 - clean, transparent
            output = std::tanh(output * 1.05f) * 0.98f;
            break;

        case EQCircuit::MXR10Band:
            // MXR 10-band - slight warmth
            output = std::tanh(output * 1.08f) * 0.96f;
            break;

        case EQCircuit::EQDTheEQ:
            // EarthQuaker Devices - transparent
            output = output * 0.99f;
            break;

        case EQCircuit::Wampler:
            // Wampler Equator - musical
            output = softClip(output * 1.1f) * 0.95f;
            break;

        case EQCircuit::Tech21:
            // Tech21 SansAmp - tube-like
            output = softClip(output * 1.15f) * 0.93f;
            break;

        case EQCircuit::Mooer:
            // Mooer Graphic EQ - clean
            output = std::tanh(output * 1.03f) * 0.97f;
            break;

        case EQCircuit::Empress:
            // Empress ParaEQ - transparent
            output = output * 0.995f;
            break;

        case EQCircuit::Freqout:
            // DOD Freqout - resonant
            output = std::tanh(output * 1.2f) * 0.94f;
            break;
    }

    return output;
}

//==============================================================================
// Helper Methods
//==============================================================================

float EQPedalPureDSP::softClip(float x) const
{
    if (x > 1.0f)
        return 1.0f - std::exp(-x + 1.0f);
    else if (x < -1.0f)
        return -1.0f + std::exp(x + 1.0f);
    else
        return x;
}

//==============================================================================
// Filter Coefficient Calculations
//==============================================================================

void EQPedalPureDSP::calcLowShelf(float gain, float freq, float& b0, float& b1, float& b2, float& a1, float& a2)
{
    float A = dbToLinear(gain / 2.0f);
    float w0 = 2.0f * M_PI * freq / static_cast<float>(sampleRate_);
    float alpha = std::sin(w0) / 2.0f * std::sqrt((A + 1.0f / A) * (1.0f / 0.5f - 1.0f) + 2.0f);

    float b0_calc = A * ((A + 1.0f) - (A - 1.0f) * std::cos(w0) + 2.0f * std::sqrt(A) * alpha);
    float b1_calc = 2.0f * A * ((A - 1.0f) - (A + 1.0f) * std::cos(w0));
    float b2_calc = A * ((A + 1.0f) - (A - 1.0f) * std::cos(w0) - 2.0f * std::sqrt(A) * alpha);
    float a0_calc = (A + 1.0f) + (A - 1.0f) * std::cos(w0) + 2.0f * std::sqrt(A) * alpha;
    float a1_calc = -2.0f * ((A - 1.0f) + (A + 1.0f) * std::cos(w0));
    float a2_calc = (A + 1.0f) + (A - 1.0f) * std::cos(w0) - 2.0f * std::sqrt(A) * alpha;

    b0 = b0_calc / a0_calc;
    b1 = b1_calc / a0_calc;
    b2 = b2_calc / a0_calc;
    a1 = a1_calc / a0_calc;
    a2 = a2_calc / a0_calc;
}

void EQPedalPureDSP::calcPeaking(float gain, float freq, float q, float& b0, float& b1, float& b2, float& a1, float& a2)
{
    // Safety clamp to prevent divide by zero
    q = std::max(0.1f, q);

    float A = dbToLinear(gain / 2.0f);
    float w0 = 2.0f * M_PI * freq / static_cast<float>(sampleRate_);
    float alpha = std::sin(w0) / (2.0f * q);

    float b0_calc = 1.0f + alpha * A;
    float b1_calc = -2.0f * std::cos(w0);
    float b2_calc = 1.0f - alpha * A;
    float a0_calc = 1.0f + alpha / A;
    float a1_calc = -2.0f * std::cos(w0);
    float a2_calc = 1.0f - alpha / A;

    // Safety check for divide by zero
    if (std::abs(a0_calc) < 0.0001f)
        a0_calc = 1.0f;

    b0 = b0_calc / a0_calc;
    b1 = b1_calc / a0_calc;
    b2 = b2_calc / a0_calc;
    a1 = a1_calc / a0_calc;
    a2 = a2_calc / a0_calc;

    // NaN/Inf guard
    if (std::isnan(b0) || std::isinf(b0)) b0 = 1.0f;
    if (std::isnan(b1) || std::isinf(b1)) b1 = 0.0f;
    if (std::isnan(b2) || std::isinf(b2)) b2 = 0.0f;
    if (std::isnan(a1) || std::isinf(a1)) a1 = 0.0f;
    if (std::isnan(a2) || std::isinf(a2)) a2 = 0.0f;
}

void EQPedalPureDSP::calcHighShelf(float gain, float freq, float& b0, float& b1, float& b2, float& a1, float& a2)
{
    float A = dbToLinear(gain / 2.0f);
    float w0 = 2.0f * M_PI * freq / static_cast<float>(sampleRate_);
    float alpha = std::sin(w0) / 2.0f * std::sqrt((A + 1.0f / A) * (1.0f / 0.5f - 1.0f) + 2.0f);

    float b0_calc = A * ((A + 1.0f) + (A - 1.0f) * std::cos(w0) + 2.0f * std::sqrt(A) * alpha);
    float b1_calc = -2.0f * A * ((A - 1.0f) + (A + 1.0f) * std::cos(w0));
    float b2_calc = A * ((A + 1.0f) + (A - 1.0f) * std::cos(w0) - 2.0f * std::sqrt(A) * alpha);
    float a0_calc = (A + 1.0f) - (A - 1.0f) * std::cos(w0) + 2.0f * std::sqrt(A) * alpha;
    float a1_calc = 2.0f * ((A - 1.0f) - (A + 1.0f) * std::cos(w0));
    float a2_calc = (A + 1.0f) - (A - 1.0f) * std::cos(w0) - 2.0f * std::sqrt(A) * alpha;

    b0 = b0_calc / a0_calc;
    b1 = b1_calc / a0_calc;
    b2 = b2_calc / a0_calc;
    a1 = a1_calc / a0_calc;
    a2 = a2_calc / a0_calc;
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* EQPedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"bass", "Bass", "dB", -12.0f, 12.0f, 0.0f, true, 0.01f},
        {"mid", "Mid", "dB", -12.0f, 12.0f, 0.0f, true, 0.01f},
        {"treble", "Treble", "dB", -12.0f, 12.0f, 0.0f, true, 0.01f},
        {"midFreq", "Mid Freq", "Hz", 250.0f, 4000.0f, 1000.0f, true, 0.01f},
        {"level", "Level", "dB", -12.0f, 12.0f, 0.0f, true, 0.01f},
        {"q", "Q", "", 0.5f, 3.0f, 1.0f, true, 0.01f},
        {"circuit", "Circuit", "", 0.0f, 7.0f, 0.0f, true, 1.0f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float EQPedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case Bass:
            // Convert from -12.0 to +12.0 dB to 0.0-1.0
            return (params_.bass + 12.0f) / 24.0f;
        case Mid:
            // Convert from -12.0 to +12.0 dB to 0.0-1.0
            return (params_.mid + 12.0f) / 24.0f;
        case Treble:
            // Convert from -12.0 to +12.0 dB to 0.0-1.0
            return (params_.treble + 12.0f) / 24.0f;
        case MidFreq:
            // Convert from 250.0 to 4000.0 Hz to 0.0-1.0
            return (params_.midFreq - 250.0f) / (4000.0f - 250.0f);
        case Level:
            // Convert from -12.0 to +12.0 dB to 0.0-1.0
            return (params_.level + 12.0f) / 24.0f;
        case Q:
            // Convert from 0.5 to 3.0 to 0.0-1.0
            return (params_.q - 0.5f) / (3.0f - 0.5f);
        case Circuit:
            return static_cast<float>(params_.circuit) / 7.0f;
    }
    return 0.0f;
}

void EQPedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to valid range
    value = clamp(value, 0.0f, 1.0f);

    switch (index)
    {
        case Bass:
            // Convert from 0.0-1.0 to -12.0 to +12.0 dB
            params_.bass = value * 24.0f - 12.0f;
            break;
        case Mid:
            // Convert from 0.0-1.0 to -12.0 to +12.0 dB
            params_.mid = value * 24.0f - 12.0f;
            break;
        case Treble:
            // Convert from 0.0-1.0 to -12.0 to +12.0 dB
            params_.treble = value * 24.0f - 12.0f;
            break;
        case MidFreq:
            // Convert from 0.0-1.0 to 250.0 to 4000.0 Hz
            params_.midFreq = 250.0f + value * (4000.0f - 250.0f);
            break;
        case Level:
            // Convert from 0.0-1.0 to -12.0 to +12.0 dB
            params_.level = value * 24.0f - 12.0f;
            break;
        case Q:
            // Convert from 0.0-1.0 to 0.5 to 3.0
            // IMPORTANT: Prevent Q from going to zero or negative (causes NaN)
            params_.q = 0.5f + value * (3.0f - 0.5f);
            params_.q = std::max(0.1f, params_.q);  // Safety clamp
            break;
        case Circuit:
            params_.circuit = static_cast<int>(clamp(value, 0.0f, 7.0f));
            break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* EQPedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &EQ_PRESETS[index];

    return nullptr;
}

} // namespace DSP
