/*
  ==============================================================================

    FuzzPedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Classic fuzz pedal implementation

  ==============================================================================
*/

#include "dsp/FuzzPedalPureDSP.h"
#include <cmath>

namespace DSP {

//==============================================================================
// FuzzPedalPureDSP Implementation
//==============================================================================

FuzzPedalPureDSP::FuzzPedalPureDSP()
{
}

bool FuzzPedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;
    return true;
}

void FuzzPedalPureDSP::reset()
{
    gateEnvelope_ = 0.0f;
    toneState_ = 0.0f;
    fuzzState_ = 0.0f;
    phase_ = 0.0f;
    previousInput_ = 0.0f;
    octavePhase_ = 0.0f;
    biasPhase_ = 0.0f;
    biasEnvelope_ = 0.0f;
}

void FuzzPedalPureDSP::process(float** inputs, float** outputs,
                             int numChannels, int numSamples)
{
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float input = inputs[ch][i];

            // Safety check
            if (std::isnan(input) || std::isinf(input))
            {
                input = 0.0f;
            }

            // Processing chain with all new features:
            // 1. Input trim (impedance matching)
            float trimmed = processInputTrim(input);

            // 2. Gate (noise reduction with modes)
            float gated = processGate(trimmed);

            // 3. Bias (voltage starvation)
            float biased = processBias(gated);

            // 4. Circuit clipping (8 different fuzz circuits)
            float fuzzed = processCircuitClipping(biased);

            // 5. Octave up (Octavia style)
            float octaved = processOctaveUp(fuzzed);

            // 6. Tone control with mid scoop
            float toned = processTone(octaved);

            // 7. Output volume
            float output = toned * params_.volume * 2.0f; // Up to 2x boost

            // Final safety
            if (std::isnan(output) || std::isinf(output))
            {
                output = 0.0f;
            }

            // Hard clip output (fuzz should clip hard)
            output = hardClip(output, 1.5f);

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// DSP Circuits
//==============================================================================

float FuzzPedalPureDSP::processInputTrim(float input)
{
    // Input trim adjusts input impedance
    // High = bright/aggressive, Low = dark/smooth

    float trimAmount = params_.inputTrim; // 0-1
    float gain = 0.5f + trimAmount * 1.5f; // 0.5x to 2.0x

    // Apply gain
    return input * gain;
}

float FuzzPedalPureDSP::processCircuitClipping(float input)
{
    // Circuit selector - 8 different fuzz circuits
    // Each has unique clipping characteristics

    float driven = input * (1.0f + params_.fuzz * 10.0f); // Up to 11x gain

    FuzzCircuit circuit = static_cast<FuzzCircuit>(params_.circuit);
    float output = 0.0f;

    switch (circuit)
    {
        case FuzzCircuit::FuzzFace:
        {
            // Classic Fuzz Face - asymmetric soft clipping
            if (driven > 0)
                output = std::tanh(driven) * 1.2f;
            else
                output = std::tanh(driven * 0.8f) * 1.5f;
            break;
        }

        case FuzzCircuit::BigMuff:
        {
            // Big Muff - symmetrical hard clipping
            float preClip = std::tanh(driven * 2.0f);
            if (preClip > 0.5f)
                output = 0.5f;
            else if (preClip < -0.5f)
                output = -0.5f;
            else
                output = preClip;
            break;
        }

        case FuzzCircuit::ToneBender:
        {
            // Tone Bender - aggressive gating
            output = hardClip(driven * 1.5f, 0.8f);
            if (std::abs(output) < 0.1f)
                output = 0.0f; // Gate
            break;
        }

        case FuzzCircuit::FuzzFactory:
        {
            // Fuzz Factory - voltage starvation + oscillation
            output = std::tanh(driven);

            // Add instability
            if (params_.stab < 0.5f)
            {
                phase_ += (440.0f + params_.bias * 880.0f) / sampleRate_;
                if (phase_ > 1.0f) phase_ -= 1.0f;

                float osc = std::sin(phase_ * 2.0f * M_PI) * (0.5f - params_.stab) * 0.3f;
                output += osc;
            }
            break;
        }

        case FuzzCircuit::Octavia:
        {
            // Octavia - octave-up fuzz (ring modulator)
            output = std::tanh(driven);
            // Octave up added in processOctaveUp()
            break;
        }

        case FuzzCircuit::VelcroFuzz:
        {
            // Velcro Fuzz - gated, splatty fuzz
            output = hardClip(driven * 2.0f, 0.6f);

            // Aggressive gate
            if (std::abs(output) < 0.15f)
                output = 0.0f;

            // Add splatter
            if (std::abs(output) > 0.3f)
                output += (rand() / (float)RAND_MAX - 0.5f) * 0.1f;
            break;
        }

        case FuzzCircuit::SuperFuzz:
        {
            // Super Fuzz - thick, wall of sound
            float preClip = driven * 1.2f;
            output = std::tanh(preClip);

            // Add thick harmonics
            output += std::tanh(preClip * 2.0f) * 0.5f;
            output *= 0.8f;
            break;
        }

        case FuzzCircuit::ToneMachine:
        {
            // Tone Machine - vintage Japanese fuzz
            if (driven > 0)
                output = driven * driven / (1.0f + driven * 0.5f);
            else
                output = -std::abs(driven) * std::abs(driven) / (1.0f + std::abs(driven) * 0.7f);

            output = hardClip(output, 1.0f);
            break;
        }
    }

    fuzzState_ = output;
    return output;
}

float FuzzPedalPureDSP::processBias(float input)
{
    // Voltage starvation effect
    // Simulates dying battery with sag and oscillation

    float biasAmount = params_.bias; // 0-1
    if (biasAmount <= 0.01f)
        return input; // Bypass if bias is off

    // Voltage drop (70% to 100% of normal voltage)
    float voltage = 1.0f - (biasAmount * 0.3f);
    float compressed = input * voltage;

    // Add sag (compression based on envelope)
    float envelope = std::abs(input);
    biasEnvelope_ = biasEnvelope_ * 0.99f + envelope * 0.01f;

    float sag = biasEnvelope_ * biasAmount * 0.5f;
    compressed *= (1.0f - sag);

    // Add oscillation at high bias settings
    if (biasAmount > 0.5f)
    {
        biasPhase_ += (220.0f + biasAmount * 660.0f) / sampleRate_;
        if (biasPhase_ > 1.0f) biasPhase_ -= 1.0f;

        float osc = std::sin(biasPhase_ * 2.0f * M_PI) * (biasAmount - 0.5f) * 0.3f;
        compressed += osc;
    }

    return compressed;
}

float FuzzPedalPureDSP::processOctaveUp(float input)
{
    // Octavia-style octave up
    // Adds octave-up harmonic for ring modulator effect

    float octaveAmount = params_.octaveUp; // 0-1
    if (octaveAmount <= 0.01f)
        return input; // Bypass if octave is off

    // Simple octave-up using full-wave rectification
    float octaveSignal = std::abs(input) * 2.0f - 1.0f;

    // Blend original and octave
    float output = input * (1.0f - octaveAmount * 0.5f) + octaveSignal * octaveAmount;

    return output;
}

float FuzzPedalPureDSP::processGate(float input)
{
    // Gate modes: Off/Soft/Hard
    int gateMode = params_.gateMode; // 0=Off, 1=Soft, 2=Hard

    if (gateMode == 0)
        return input; // Gate off

    // Envelope follower
    float envelope = std::abs(input);

    float attack, release;
    if (gateMode == 1)
    {
        // Soft gate - slower
        attack = 0.001f;
        release = 0.01f;
    }
    else
    {
        // Hard gate - faster, more aggressive
        attack = 0.0001f;
        release = 0.001f;
    }

    if (envelope > gateEnvelope_)
        gateEnvelope_ = gateEnvelope_ + (envelope - gateEnvelope_) * attack;
    else
        gateEnvelope_ = gateEnvelope_ + (envelope - gateEnvelope_) * release;

    // Gate threshold
    float threshold = params_.gate * 0.1f; // 0 to 0.1

    if (gateEnvelope_ < threshold)
    {
        if (gateMode == 2)
        {
            // Hard gate - mute completely
            return 0.0f;
        }
        else
        {
            // Soft gate - gradual reduction
            float reduction = gateEnvelope_ / threshold;
            return input * reduction;
        }
    }

    return input;
}

float FuzzPedalPureDSP::processTone(float input)
{
    // Tone control with mid scoop switch
    // Combines low-pass filter with selectable mid scoop

    // Low-pass filter for tone
    float toneCoeff = 0.9f + params_.tone * 0.09f; // 0.9 to 0.99
    float toned = toneCoeff * toneState_ + (1.0f - toneCoeff) * input;
    toneState_ = toned;

    // Mid scoop (if enabled)
    float scoopAmount = params_.midScoop; // 0-1
    if (scoopAmount > 0.01f)
    {
        // Mid-frequency cut (scoop)
        float midCut = toned * (1.0f - scoopAmount * 0.6f);

        // Blend clean and scooped
        toned = toned * (1.0f - scoopAmount * 0.5f) + midCut * scoopAmount * 0.5f;
    }

    return toned;
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* FuzzPedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"fuzz", "Fuzz", "", 0.0f, 1.0f, 0.8f, true, 0.01f},
        {"tone", "Tone", "", 0.0f, 1.0f, 0.6f, true, 0.01f},
        {"contour", "Contour", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"gate", "Gate", "", 0.0f, 1.0f, 0.3f, true, 0.01f},
        {"volume", "Volume", "", 0.0f, 1.0f, 0.6f, true, 0.01f},
        {"stab", "Stability", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"circuit", "Circuit", "", 0.0f, 7.0f, 0.0f, true, 1.0f},
        {"bias", "Bias", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"input_trim", "Input Trim", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"gate_mode", "Gate Mode", "", 0.0f, 2.0f, 1.0f, true, 1.0f},
        {"octave_up", "Octave Up", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"mid_scoop", "Mid Scoop", "", 0.0f, 1.0f, 0.5f, true, 0.01f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float FuzzPedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case Fuzz: return params_.fuzz;
        case Tone: return params_.tone;
        case Contour: return params_.contour;
        case Gate: return params_.gate;
        case Volume: return params_.volume;
        case Stab: return params_.stab;
        case Circuit: return static_cast<float>(params_.circuit);
        case Bias: return params_.bias;
        case InputTrim: return params_.inputTrim;
        case GateMode: return static_cast<float>(params_.gateMode);
        case OctaveUp: return params_.octaveUp;
        case MidScoop: return params_.midScoop;
    }
    return 0.0f;
}

void FuzzPedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to appropriate range
    switch (index)
    {
        case Circuit:
            value = clamp(value, 0.0f, 7.0f);
            params_.circuit = static_cast<int>(value);
            break;
        case GateMode:
            value = clamp(value, 0.0f, 2.0f);
            params_.gateMode = static_cast<int>(value);
            break;
        default:
            value = clamp(value, 0.0f, 1.0f);
            break;
    }

    switch (index)
    {
        case Fuzz: params_.fuzz = value; break;
        case Tone: params_.tone = value; break;
        case Contour: params_.contour = value; break;
        case Gate: params_.gate = value; break;
        case Volume: params_.volume = value; break;
        case Stab: params_.stab = value; break;
        case Circuit: params_.circuit = static_cast<int>(value); break;
        case Bias: params_.bias = value; break;
        case InputTrim: params_.inputTrim = value; break;
        case GateMode: params_.gateMode = static_cast<int>(value); break;
        case OctaveUp: params_.octaveUp = value; break;
        case MidScoop: params_.midScoop = value; break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* FuzzPedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &FUZZ_PRESETS[index];

    return nullptr;
}

} // namespace DSP
