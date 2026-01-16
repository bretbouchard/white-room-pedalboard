/*
  ==============================================================================

    DelayPedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Classic delay pedal implementation

  ==============================================================================
*/

#include "dsp/DelayPedalPureDSP.h"
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// DelayPedalPureDSP Implementation
//==============================================================================

DelayPedalPureDSP::DelayPedalPureDSP()
{
}

bool DelayPedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // Prepare delay lines (max 2 seconds) for multi-tap
    for (int tap = 0; tap < MAX_TAPS; ++tap)
    {
        maxDelaySamples_[tap] = static_cast<int>(sampleRate * 2.0);
        delayLines_[tap].resize(maxDelaySamples_[tap]);
        std::fill(delayLines_[tap].begin(), delayLines_[tap].end(), 0.0f);
        writeIndex_[tap] = 0;
    }

    // Prepare reverse buffer (max 2 seconds)
    reverseBuffer_.resize(maxDelaySamples_[0]);
    std::fill(reverseBuffer_.begin(), reverseBuffer_.end(), 0.0f);
    reverseWriteIndex_ = 0;
    reverseReadIndex_ = 0;
    reverseFilling_ = true;

    prepared_ = true;
    return true;
}

void DelayPedalPureDSP::reset()
{
    for (int tap = 0; tap < MAX_TAPS; ++tap)
    {
        std::fill(delayLines_[tap].begin(), delayLines_[tap].end(), 0.0f);
        writeIndex_[tap] = 0;
    }

    std::fill(reverseBuffer_.begin(), reverseBuffer_.end(), 0.0f);
    reverseWriteIndex_ = 0;
    reverseReadIndex_ = 0;
    reverseFilling_ = true;

    toneState_ = 0.0f;
    wowPhase_ = 0.0f;
    flutterPhase_ = 0.0f;
    duckEnvelope_ = 0.0f;
}

void DelayPedalPureDSP::process(float** inputs, float** outputs,
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
            // 1. Circuit processing (8 different delay types)
            float wetSignal = processCircuit(input);

            // 2. Multi-tap processing (if enabled)
            if (params_.multiTap)
            {
                wetSignal = processMultiTap(input);
            }

            // 3. Reverse processing (if enabled)
            if (params_.reverseMode)
            {
                wetSignal = processReverse(input);
            }

            // 4. Apply tone control
            wetSignal = processTone(wetSignal);

            // 5. Ducking (sidechain compression)
            float output = processDucking(input, wetSignal);

            // 6. Apply output level
            output *= params_.level * 2.0f; // Up to 2x boost

            // Safety
            if (std::isnan(output) || std::isinf(output))
            {
                output = 0.0f;
            }

            // Soft clip output
            output = softClip(output);

            outputs[ch][i] = output;

            // Advance write index for primary delay line
            writeIndex_[0] = (writeIndex_[0] + 1) % maxDelaySamples_[0];
        }
    }
}

//==============================================================================
// DSP Circuits
//==============================================================================

float DelayPedalPureDSP::readDelayLine(float modulation, int tapIndex)
{
    // Read from delay line with modulation and tap index support
    tapIndex = std::max(0, std::min(tapIndex, MAX_TAPS - 1));

    // Calculate base delay time
    float minDelay = 0.05f; // 50ms minimum
    float maxDelay = 2.0f;   // 2 seconds maximum
    float delayTime = minDelay + params_.time * (maxDelay - minDelay);

    // Apply tap tempo subdivision
    if (params_.tapTempo > 0)
    {
        TapSubdivision sub = static_cast<TapSubdivision>(params_.tapTempo);
        switch (sub)
        {
            case TapSubdivision::Quarter:
                delayTime = delayTime; // Base delay
                break;
            case TapSubdivision::DottedEighth:
                delayTime = delayTime * 0.75f; // Dotted eighth
                break;
            case TapSubdivision::Triplet:
                delayTime = delayTime * 0.667f; // Triplet
                break;
            case TapSubdivision::Eighth:
                delayTime = delayTime * 0.5f; // Eighth
                break;
        }
    }

    // Wow/flutter modulation
    float wowMod = 0.0f;
    float flutterMod = 0.0f;

    if (params_.wow > 0.0f)
    {
        wowPhase_ += (0.5f * 2.0f * M_PI) / sampleRate_;
        if (wowPhase_ > 2.0f * M_PI) wowPhase_ -= 2.0f * M_PI;
        wowMod = std::sin(wowPhase_) * params_.wow * 0.05f; // ±50ms
    }

    if (params_.flutter > 0.0f)
    {
        flutterPhase_ += (5.0f * 2.0f * M_PI) / sampleRate_;
        if (flutterPhase_ > 2.0f * M_PI) flutterPhase_ -= 2.0f * M_PI;
        flutterMod = std::sin(flutterPhase_) * params_.flutter * 0.02f; // ±20ms
    }

    float totalMod = modulation + wowMod + flutterMod;
    float modDelayTime = delayTime + totalMod;

    int delaySamples = static_cast<int>(modDelayTime * sampleRate_);
    delaySamples = std::max(1, std::min(delaySamples, maxDelaySamples_[tapIndex] - 1));

    int readIndex = (writeIndex_[tapIndex] - delaySamples + maxDelaySamples_[tapIndex]) % maxDelaySamples_[tapIndex];
    return delayLines_[tapIndex][readIndex];
}

float DelayPedalPureDSP::processCircuit(float input)
{
    // Circuit-specific delay processing
    DelayCircuit circuit = static_cast<DelayCircuit>(params_.circuit);

    switch (circuit)
    {
        case DelayCircuit::AnalogDelay:
        {
            // BBD delay - dark, warm repeats
            float delayed = readDelayLine(0.0f);

            // Apply BBD companding (compression/expansion)
            delayed = std::tanh(delayed * 1.5f) * 0.8f;

            // Write to delay line
            float feedbackSignal = delayed * params_.feedback;
            delayLines_[0][writeIndex_[0]] = input + feedbackSignal;

            return delayed;
        }

        case DelayCircuit::DigitalDelay:
        {
            // Clean digital delay - pristine, clear
            float delayed = readDelayLine(0.0f);

            // No companding - clean digital
            float feedbackSignal = delayed * params_.feedback;
            delayLines_[0][writeIndex_[0]] = input + feedbackSignal;

            return delayed;
        }

        case DelayCircuit::TapeDelay:
        {
            // Tape echo with wow/flutter
            float delayed = readDelayLine(0.0f);

            // Apply tape saturation
            delayed = softClip(delayed * 1.2f) * 0.9f;

            // Write to delay line
            float feedbackSignal = delayed * params_.feedback;
            delayLines_[0][writeIndex_[0]] = input + feedbackSignal;

            return delayed;
        }

        case DelayCircuit::PingPongDelay:
        {
            // Ping-pong delay (stereo effect)
            // For simplicity, implementing as mono with alternating taps
            float delayed = readDelayLine(0.0f);

            // Write to delay line
            float feedbackSignal = delayed * params_.feedback;
            delayLines_[0][writeIndex_[0]] = input + feedbackSignal;

            return delayed;
        }

        case DelayCircuit::SlapbackDelay:
        {
            // Short slapback delay (50-150ms)
            float minDelay = 0.05f; // 50ms
            float maxDelay = 0.15f; // 150ms
            float delayTime = minDelay + params_.time * (maxDelay - minDelay);

            int delaySamples = static_cast<int>(delayTime * sampleRate_);
            delaySamples = std::max(1, std::min(delaySamples, maxDelaySamples_[0] - 1));

            int readIndex = (writeIndex_[0] - delaySamples + maxDelaySamples_[0]) % maxDelaySamples_[0];
            float delayed = delayLines_[0][readIndex];

            // Low feedback for slapback
            float feedbackSignal = delayed * params_.feedback * 0.5f;
            delayLines_[0][writeIndex_[0]] = input + feedbackSignal;

            return delayed;
        }

        case DelayCircuit::MultiTapDelay:
        {
            // Multi-tap - handled separately in processMultiTap()
            return readDelayLine(0.0f);
        }

        case DelayCircuit::ReverseDelay:
        {
            // Reverse delay - handled separately in processReverse()
            return readDelayLine(0.0f);
        }

        case DelayCircuit::EchorecDelay:
        {
            // Echoplex style tape echo
            float delayed = readDelayLine(0.0f);

            // Echoplex has characteristic high-end roll-off
            float echorecTone = 0.95f;
            delayed = echorecTone * delayLines_[0][writeIndex_[0]] + (1.0f - echorecTone) * delayed;

            // Tape saturation
            delayed = softClip(delayed * 1.1f) * 0.95f;

            // Write to delay line
            float feedbackSignal = delayed * params_.feedback;
            delayLines_[0][writeIndex_[0]] = input + feedbackSignal;

            return delayed;
        }

        default:
            return input;
    }
}

float DelayPedalPureDSP::processMultiTap(float input)
{
    // Multi-tap delay with 3 programmable taps
    float output = 0.0f;

    // Tap 1: Quarter note (base delay)
    float tap1Delay = 0.05f + params_.time * 1.95f; // 50ms to 2s
    int tap1Samples = static_cast<int>(tap1Delay * sampleRate_);
    tap1Samples = std::max(1, std::min(tap1Samples, maxDelaySamples_[1] - 1));
    int tap1ReadIndex = (writeIndex_[1] - tap1Samples + maxDelaySamples_[1]) % maxDelaySamples_[1];
    float tap1 = delayLines_[1][tap1ReadIndex];
    output += tap1 * 0.5f; // 50% mix

    // Tap 2: Dotted eighth
    float tap2Delay = tap1Delay * 0.75f;
    int tap2Samples = static_cast<int>(tap2Delay * sampleRate_);
    tap2Samples = std::max(1, std::min(tap2Samples, maxDelaySamples_[2] - 1));
    int tap2ReadIndex = (writeIndex_[2] - tap2Samples + maxDelaySamples_[2]) % maxDelaySamples_[2];
    float tap2 = delayLines_[2][tap2ReadIndex];
    output += tap2 * 0.3f; // 30% mix

    // Tap 3: Eighth note triplet
    float tap3Delay = tap1Delay * 0.667f;
    int tap3Samples = static_cast<int>(tap3Delay * sampleRate_);
    tap3Samples = std::max(1, std::min(tap3Samples, maxDelaySamples_[0] - 1));
    int tap3ReadIndex = (writeIndex_[0] - tap3Samples + maxDelaySamples_[0]) % maxDelaySamples_[0];
    float tap3 = delayLines_[0][tap3ReadIndex];
    output += tap3 * 0.2f; // 20% mix

    // Update all delay lines
    for (int tap = 0; tap < MAX_TAPS; ++tap)
    {
        float feedbackSignal = output * params_.feedback;
        delayLines_[tap][writeIndex_[tap]] = input + feedbackSignal;
        writeIndex_[tap] = (writeIndex_[tap] + 1) % maxDelaySamples_[tap];
    }

    return output;
}

float DelayPedalPureDSP::processReverse(float input)
{
    // Reverse delay with dedicated buffer
    if (reverseFilling_)
    {
        // Fill reverse buffer
        reverseBuffer_[reverseWriteIndex_++] = input;

        if (reverseWriteIndex_ >= maxDelaySamples_[0])
        {
            reverseFilling_ = false;
            reverseReadIndex_ = reverseWriteIndex_ - 1;
        }

        return input; // Pass through while filling
    }
    else
    {
        // Play backwards
        float delayed = reverseBuffer_[reverseReadIndex_--];

        // Wrap around
        if (reverseReadIndex_ < 0)
        {
            reverseReadIndex_ = maxDelaySamples_[0] - 1;
            reverseFilling_ = true; // Refill buffer
        }

        // Write to reverse buffer
        float feedbackSignal = delayed * params_.feedback;
        reverseBuffer_[reverseWriteIndex_] = input + feedbackSignal;
        reverseWriteIndex_ = (reverseWriteIndex_ + 1) % maxDelaySamples_[0];

        return delayed;
    }
}

float DelayPedalPureDSP::processDucking(float input, float wetSignal)
{
    // Sidechain compression - lower delay when playing
    float envelope = std::abs(input);
    float attack = 0.001f;
    float release = 0.01f;

    if (envelope > duckEnvelope_)
        duckEnvelope_ = duckEnvelope_ + (envelope - duckEnvelope_) * attack;
    else
        duckEnvelope_ = duckEnvelope_ + (envelope - duckEnvelope_) * release;

    // Calculate ducking amount
    float duckAmount = params_.ducking;
    float duckedWet = wetSignal * (1.0f - duckAmount * duckEnvelope_);

    // Mix dry and ducked wet
    float output = input * (1.0f - params_.mix) + duckedWet * params_.mix;

    return output;
}

float DelayPedalPureDSP::processTone(float input)
{
    // Tone control with filter modes
    FilterMode mode = static_cast<FilterMode>(params_.filterMode);

    switch (mode)
    {
        case FilterMode::Low:
        {
            // Lowpass filter for dark repeats (analog style)
            float toneCoeff = 0.9f + params_.tone * 0.09f; // 0.9 to 0.99
            float output = toneCoeff * toneState_ + (1.0f - toneCoeff) * input;
            toneState_ = output;
            return output;
        }

        case FilterMode::Flat:
        {
            // Flat frequency response (digital style)
            return input;
        }

        case FilterMode::High:
        {
            // Highpass filter for bright repeats
            float toneCoeff = 0.1f + params_.tone * 0.1f; // 0.1 to 0.2
            float output = toneCoeff * toneState_ + (1.0f - toneCoeff) * input;
            toneState_ = output;
            return output;
        }

        case FilterMode::Sweep:
        {
            // Filter sweep - modulate filter based on LFO
            float lfoRate = 0.5f; // 0.5 Hz
            wowPhase_ += (2.0f * M_PI * lfoRate) / sampleRate_;
            if (wowPhase_ > 2.0f * M_PI) wowPhase_ -= 2.0f * M_PI;

            float sweep = std::sin(wowPhase_) * 0.5f + 0.5f; // 0 to 1
            float toneCoeff = 0.8f + sweep * 0.19f; // 0.8 to 0.99

            float output = toneCoeff * toneState_ + (1.0f - toneCoeff) * input;
            toneState_ = output;
            return output;
        }

        default:
            return input;
    }
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* DelayPedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        // Core parameters (original)
        {"time", "Time", "s", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"feedback", "Feedback", "", 0.0f, 1.0f, 0.4f, true, 0.01f},
        {"mix", "Mix", "%", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"tone", "Tone", "", 0.0f, 1.0f, 0.7f, true, 0.01f},
        {"modulation", "Mod", "", 0.0f, 1.0f, 0.1f, true, 0.01f},
        {"level", "Level", "", 0.0f, 1.0f, 0.7f, true, 0.01f},

        // Enhanced parameters (new)
        {"circuit", "Circuit", "", 0.0f, 7.0f, 0.0f, true, 1.0f},
        {"tapTempo", "Tap Tempo", "", 0.0f, 3.0f, 0.0f, true, 1.0f},
        {"wow", "Wow", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"flutter", "Flutter", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"filterMode", "Filter Mode", "", 0.0f, 3.0f, 0.0f, true, 1.0f},
        {"multiTap", "Multi-Tap", "", 0.0f, 1.0f, 0.0f, true, 1.0f},
        {"reverseMode", "Reverse", "", 0.0f, 1.0f, 0.0f, true, 1.0f},
        {"ducking", "Ducking", "", 0.0f, 1.0f, 0.0f, true, 0.01f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float DelayPedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        // Core parameters
        case Time: return params_.time;
        case Feedback: return params_.feedback;
        case Mix: return params_.mix;
        case Tone: return params_.tone;
        case Modulation: return params_.modulation;
        case Level: return params_.level;

        // Enhanced parameters
        case Circuit: return static_cast<float>(params_.circuit);
        case TapTempo: return static_cast<float>(params_.tapTempo);
        case Wow: return params_.wow;
        case Flutter: return params_.flutter;
        case FilterModeParam: return static_cast<float>(params_.filterMode);
        case MultiTap: return params_.multiTap ? 1.0f : 0.0f;
        case ReverseMode: return params_.reverseMode ? 1.0f : 0.0f;
        case Ducking: return params_.ducking;
    }
    return 0.0f;
}

void DelayPedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to valid range
    value = clamp(value, 0.0f, 1.0f);

    switch (index)
    {
        // Core parameters
        case Time: params_.time = value; break;
        case Feedback: params_.feedback = value; break;
        case Mix: params_.mix = value; break;
        case Tone: params_.tone = value; break;
        case Modulation: params_.modulation = value; break;
        case Level: params_.level = value; break;

        // Enhanced parameters
        case Circuit:
            params_.circuit = static_cast<int>(clamp(value, 0.0f, 7.0f));
            break;
        case TapTempo:
            params_.tapTempo = static_cast<int>(clamp(value, 0.0f, 3.0f));
            break;
        case Wow:
            params_.wow = value;
            break;
        case Flutter:
            params_.flutter = value;
            break;
        case FilterModeParam:
            params_.filterMode = static_cast<int>(clamp(value, 0.0f, 3.0f));
            break;
        case MultiTap:
            params_.multiTap = (value >= 0.5f);
            break;
        case ReverseMode:
            params_.reverseMode = (value >= 0.5f);
            break;
        case Ducking:
            params_.ducking = value;
            break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* DelayPedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &DELAY_PRESETS[index];

    return nullptr;
}

} // namespace DSP
