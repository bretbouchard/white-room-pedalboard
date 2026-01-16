/*
  ==============================================================================

    OverdrivePedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Enhanced overdrive pedal implementation

  ==============================================================================
*/

#include "dsp/OverdrivePedalPureDSP.h"
#include <cmath>

namespace DSP {

//==============================================================================
// OverdrivePedalPureDSP Implementation
//==============================================================================

OverdrivePedalPureDSP::OverdrivePedalPureDSP()
{
}

bool OverdrivePedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;
    return true;
}

void OverdrivePedalPureDSP::reset()
{
    bassState_ = 0.0f;
    midState_ = 0.0f;
    trebleState_ = 0.0f;
    presenceState_ = 0.0f;
    biteState_ = 0.0f;
    brightCapState_ = 0.0f;
    midFocusState_ = 0.0f;
    clipperState_ = 0.0f;
    envelopeState_ = 0.0f;
    compressionState_ = 0.0f;
}

void OverdrivePedalPureDSP::process(float** inputs, float** outputs,
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

            // Apply bright cap (high-pass before clipping)
            float processed = processBrightCap(input);

            // Apply drive (pre-gain)
            float driven = processed * (1.0f + params_.drive * 4.0f); // Up to 5x gain

            // Apply dynamic response (tight vs loose)
            driven = processDynamicResponse(driven);

            // Apply circuit-specific clipping
            float clipped = processCircuitClipping(driven);

            // Apply midrange focus (pushed mids)
            clipped = processMidFocus(clipped);

            // Apply presence (3-5kHz boost)
            clipped = processPresence(clipped);

            // Apply bite (4-8kHz grit)
            clipped = processBite(clipped);

            // Apply tone stack
            float shaped = processToneStack(clipped);

            // Apply output level
            float output = shaped * params_.level * 2.0f; // Up to 2x boost

            // Final safety and soft clip output
            if (std::isnan(output) || std::isinf(output))
            {
                output = 0.0f;
            }

            output = softClip(output);

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// DSP Circuits
//==============================================================================

float OverdrivePedalPureDSP::processSoftClip(float input)
{
    // Asymmetric soft clipping (like tubes)
    // Positive half: tanh
    // Negative half: softer tanh

    float positive = std::tanh(input * 2.0f) * 0.6f;
    float negative = std::tanh(input * 1.5f) * 0.4f;

    if (input > 0)
        return positive;
    else
        return negative;
}

float OverdrivePedalPureDSP::processCircuitClipping(float input)
{
    // Circuit-specific clipping based on selected circuit type
    switch (static_cast<CircuitType>(params_.circuit))
    {
        case CircuitType::Standard:
        {
            // Standard asymmetric soft clipping
            return processSoftClip(input);
        }

        case CircuitType::Symmetrical:
        {
            // Symmetrical soft clipping
            return std::tanh(input * 2.0f) * 0.5f;
        }

        case CircuitType::HardClip:
        {
            // Soft clipping followed by hard clipping
            float soft = processSoftClip(input);
            return hardClip(soft, 0.8f);
        }

        case CircuitType::DiodeClipping:
        {
            // Silicon diode clipping (asymmetric with knee)
            float forward = std::tanh(input * 1.8f) * 0.55f;
            float reverse = std::tanh(input * 1.3f) * 0.45f;
            return (input > 0) ? forward : reverse;
        }

        case CircuitType::LEDClipping:
        {
            // LED clipping (brighter, more open)
            // Higher forward voltage = less compression
            float led = std::tanh(input * 1.5f) * 0.65f;
            return led;
        }

        case CircuitType::TubeScreamer:
        {
            // Classic Tube Screamer style
            // Mild asymmetric clipping with mid focus
            float ts = std::tanh(input * 1.7f) * 0.58f;
            if (input > 0)
                return ts * 1.1f;
            else
                return ts * 0.9f;
        }

        case CircuitType::BluesBreaker:
        {
            // Blues Breaker style (transparent, symmetrical)
            // Very subtle clipping
            float bb = std::tanh(input * 1.3f) * 0.7f;
            return bb;
        }

        case CircuitType::FullBodiedFat:
        {
            // Full-bodied fat sound
            // Heavy asymmetric clipping with compression
            float fat = std::tanh(input * 2.5f) * 0.45f;
            if (input > 0)
                return fat * 1.2f;
            else
                return fat * 0.8f;
        }

        default:
            return processSoftClip(input);
    }
}

float OverdrivePedalPureDSP::processToneStack(float input)
{
    // Enhanced 3-band EQ using first-order filters

    // Bass filter (low shelf)
    float bassCoeff = 0.99f - (params_.bass * 0.09f); // 0.90 to 0.99
    float bass = bassCoeff * bassState_ + (1.0f - bassCoeff) * input;
    bassState_ = bass;
    float bassSignal = bass * (0.5f + params_.bass);

    // Treble filter (high shelf)
    float trebleCoeff = params_.treble * 0.1f; // 0.0 to 0.1
    float treble = trebleCoeff * (input - trebleState_) + trebleState_;
    trebleState_ = treble;
    float trebleSignal = treble * params_.treble;

    // Mid filter (peaking EQ)
    float midAmount = (params_.mid - 0.5f) * 2.0f; // -1 to 1
    float midSignal = input * (1.0f + midAmount * 0.5f);

    // Blend bands
    float blend = input + bassSignal * 0.5f + trebleSignal * 0.5f + (midSignal - input) * 0.3f;

    // Apply tone tilt
    float toneAmount = (params_.tone - 0.5f) * 2.0f; // -1 to 1
    float output = blend * (1.0f + toneAmount * 0.3f);

    return output;
}

float OverdrivePedalPureDSP::processPresence(float input)
{
    // Presence control: 3-5kHz high-mid boost
    // Creates "cut-through" quality - Marshall-style presence

    if (params_.presence <= 0.01f)
        return input;

    // Peaking EQ at 4kHz
    float centerFreq = 4000.0f;
    float Q = 1.5f; // Bandwidth
    float gain = params_.presence * 12.0f; // Up to +12dB

    float omega = 2.0f * M_PI * centerFreq / static_cast<float>(sampleRate_);
    float alpha = std::sin(omega) / (2.0f * Q);
    float A = std::pow(10.0f, gain / 40.0f);

    float b0 = 1.0f + alpha * A;
    float b1 = -2.0f * std::cos(omega);
    float b2 = 1.0f - alpha * A;
    float a0 = 1.0f + alpha / A;
    float a1 = -2.0f * std::cos(omega);
    float a2 = 1.0f - alpha / A;

    // Normalize
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;

    // Apply filter
    float output = b0 * input + b1 * presenceState_ + b2 * 0.0f
                  - a1 * presenceState_ - a2 * 0.0f;

    presenceState_ = input;

    return output;
}

float OverdrivePedalPureDSP::processBite(float input)
{
    // Bite control: 4-8kHz high-frequency grit
    // Adds harmonics for aggressive overdrive

    if (params_.bite <= 0.01f)
        return input;

    // High-frequency boost
    float hf = input + std::sin(input * params_.bite * 20.0f) * params_.bite * 0.3f;

    // Soft limit
    return softClip(hf);
}

float OverdrivePedalPureDSP::processBrightCap(float input)
{
    // Bright cap high-pass filter
    // Creates "bright" vs "dark" clipping

    if (params_.brightCap <= 0.01f)
        return input;

    // First-order high-pass at 700Hz
    float rc = 1.0f / (2.0f * M_PI * 700.0f);
    float dt = 1.0f / static_cast<float>(sampleRate_);
    float alpha = rc / (rc + dt);

    float hp = alpha * (brightCapState_ + input - 0.0f);
    brightCapState_ = hp;

    // Blend original with high-passed
    float blend = input * (1.0f - params_.brightCap) + hp * params_.brightCap;

    return blend;
}

float OverdrivePedalPureDSP::processMidFocus(float input)
{
    // Midrange focus peaking EQ
    // Creates "pushed mids" (Marshall style)

    if (std::abs(params_.midFocus - 0.5f) < 0.01f)
        return input;

    // Peaking EQ at 1.2kHz
    float centerFreq = 1200.0f;
    float Q = 1.2f;
    float gain = (params_.midFocus - 0.5f) * 2.0f * 10.0f; // ±10dB

    float omega = 2.0f * M_PI * centerFreq / static_cast<float>(sampleRate_);
    float alpha = std::sin(omega) / (2.0f * Q);
    float A = std::pow(10.0f, gain / 40.0f);

    float b0 = 1.0f + alpha * A;
    float b1 = -2.0f * std::cos(omega);
    float b2 = 1.0f - alpha * A;
    float a0 = 1.0f + alpha / A;
    float a1 = -2.0f * std::cos(omega);
    float a2 = 1.0f - alpha / A;

    // Normalize
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;

    // Apply filter
    float output = b0 * input + b1 * midFocusState_ + b2 * 0.0f
                  - a1 * midFocusState_ - a2 * 0.0f;

    midFocusState_ = input;

    return output;
}

float OverdrivePedalPureDSP::processDynamicResponse(float input)
{
    // Dynamic response control
    // Tight: Faster response, more controlled
    // Loose: More sag, bloom, compression

    if (params_.tightLoose <= 0.01f)
        return input; // Tight mode (no processing)

    // Loose mode: Add compression and sag
    float attack = 0.001f; // 1ms attack
    float release = 0.1f;  // 100ms release
    float ratio = 1.0f + params_.tightLoose * 3.0f; // Up to 4:1 compression
    float threshold = 0.3f; // -10dB

    // Envelope follower
    float envelope = std::abs(input);
    float alpha = (envelope > envelopeState_) ? attack : release;
    envelopeState_ = alpha * envelope + (1.0f - alpha) * envelopeState_;

    // Compression
    float gain = 1.0f;
    if (envelopeState_ > threshold)
    {
        float excess = envelopeState_ - threshold;
        gain = threshold + excess / ratio;
        gain /= envelopeState_;
    }

    // Apply compression with soft-knee
    float knee = 0.1f;
    float compressed = input * lerp(1.0f, gain, params_.tightLoose * (1.0f - knee));

    return compressed;
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* OverdrivePedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        // Core controls
        {"drive", "Drive", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"tone", "Tone", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"bass", "Bass", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"mid", "Mid", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"treble", "Treble", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"level", "Level", "", 0.0f, 1.0f, 0.7f, true, 0.01f},

        // Advanced controls
        {"circuit", "Circuit", "", 0.0f, 7.0f, 0.0f, false, 1.0f},
        {"presence", "Presence", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"bite", "Bite", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"tightLoose", "Tight/Loose", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"brightCap", "Bright Cap", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"midFocus", "Mid Focus", "", 0.0f, 1.0f, 0.5f, true, 0.01f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float OverdrivePedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        // Core controls
        case Drive: return params_.drive;
        case Tone: return params_.tone;
        case Bass: return params_.bass;
        case Mid: return params_.mid;
        case Treble: return params_.treble;
        case Level: return params_.level;

        // Advanced controls
        case Circuit: return static_cast<float>(params_.circuit);
        case Presence: return params_.presence;
        case Bite: return params_.bite;
        case TightLoose: return params_.tightLoose;
        case BrightCap: return params_.brightCap;
        case MidFocus: return params_.midFocus;
    }
    return 0.0f;
}

void OverdrivePedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to 0-1 range
    value = clamp(value, 0.0f, 1.0f);

    switch (index)
    {
        // Core controls
        case Drive: params_.drive = value; break;
        case Tone: params_.tone = value; break;
        case Bass: params_.bass = value; break;
        case Mid: params_.mid = value; break;
        case Treble: params_.treble = value; break;
        case Level: params_.level = value; break;

        // Advanced controls
        case Circuit:
            // Clamp to valid circuit range
            params_.circuit = clamp(static_cast<int>(value), 0,
                                   static_cast<int>(CircuitType::FullBodiedFat));
            break;
        case Presence: params_.presence = value; break;
        case Bite: params_.bite = value; break;
        case TightLoose: params_.tightLoose = value; break;
        case BrightCap: params_.brightCap = value; break;
        case MidFocus: params_.midFocus = value; break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* OverdrivePedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &OVERDRIVE_PRESETS[index];

    return nullptr;
}

} // namespace DSP
