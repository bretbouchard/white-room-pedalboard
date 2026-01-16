/*
  ==============================================================================

    ReverbPedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Regular reverb pedal implementation

  ==============================================================================
*/

#include "dsp/ReverbPedalPureDSP.h"
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// Constructor
//==============================================================================

ReverbPedalPureDSP::ReverbPedalPureDSP()
{
    // Default parameters
    params_.decay = 2.0f;      // 2 seconds
    params_.mix = 0.4f;        // 40% wet
    params_.tone = 0.5f;       // Neutral tone
    params_.preDelay = 10.0f;  // 10ms
    params_.size = 0.5f;       // Medium size
    params_.diffusion = 0.5f;  // Medium diffusion
    params_.modulation = 0.0f;  // No modulation
    params_.damping = 0.3f;    // Light damping
    params_.level = 0.7f;      // 70% level
    params_.type = 0;          // Room
}

//==============================================================================
// DSP Lifecycle
//==============================================================================

bool ReverbPedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    prepared_ = true;

    // Initialize delay lines
    for (int ch = 0; ch < 2; ++ch)
    {
        delayLines_[ch].resize(MAX_DELAY_SAMPLES);
        std::fill(delayLines_[ch].begin(), delayLines_[ch].end(), 0.0f);

        reverseBuffer_[ch].resize(MAX_DELAY_SAMPLES);
        std::fill(reverseBuffer_[ch].begin(), reverseBuffer_[ch].end(), 0.0f);
    }

    reset();

    return true;
}

void ReverbPedalPureDSP::reset()
{
    // Reset delay line indices
    writeIndex_[0] = 0;
    writeIndex_[1] = 0;
    reverseWriteIndex_[0] = 0;
    reverseWriteIndex_[1] = 0;

    // Reset LFO phases
    lfoPhase_[0] = 0.0f;
    lfoPhase_[1] = 0.0f;

    // Reset tone filters
    toneZ1_[0] = 0.0f;
    toneZ1_[1] = 0.0f;

    // Reset envelopes
    gateEnvelope_[0] = 0.0f;
    gateEnvelope_[1] = 0.0f;

    // Reset flags
    reverseFilling_[0] = true;
    reverseFilling_[1] = true;

    // Clear delay lines
    for (int ch = 0; ch < 2; ++ch)
    {
        std::fill(delayLines_[ch].begin(), delayLines_[ch].end(), 0.0f);
        std::fill(reverseBuffer_[ch].begin(), reverseBuffer_[ch].end(), 0.0f);
    }

    // Set early reflection delays (in samples)
    earlyDelay1_[0] = timeToSamples(0.01f);  // 10ms
    earlyDelay2_[0] = timeToSamples(0.02f);  // 20ms
    earlyDelay3_[0] = timeToSamples(0.03f);  // 30ms
    earlyDelay1_[1] = timeToSamples(0.015f);
    earlyDelay2_[1] = timeToSamples(0.025f);
    earlyDelay3_[1] = timeToSamples(0.035f);
}

void ReverbPedalPureDSP::process(float** inputs, float** outputs,
                                int numChannels, int numSamples)
{
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float input = inputs[ch][i];
            float dry = input;
            float wet = 0.0f;

            // Process based on reverb type
            ReverbType type = static_cast<ReverbType>(params_.type);

            switch (type)
            {
                case ReverbType::Room:
                    wet = processRoom(input, ch);
                    break;
                case ReverbType::Hall:
                    wet = processHall(input, ch);
                    break;
                case ReverbType::Plate:
                    wet = processPlate(input, ch);
                    break;
                case ReverbType::Spring:
                    wet = processSpring(input, ch);
                    break;
                case ReverbType::Shimmer:
                    wet = processShimmer(input, ch);
                    break;
                case ReverbType::Modulated:
                    wet = processModulated(input, ch);
                    break;
                case ReverbType::Reverse:
                    wet = processReverse(input, ch);
                    break;
                case ReverbType::Gated:
                    wet = processGated(input, ch);
                    break;
            }

            // Apply tone control
            wet = processTone(wet, ch);

            // Mix dry/wet
            float output = dry * (1.0f - params_.mix) + wet * params_.mix;

            // Apply output level
            output *= params_.level;

            outputs[ch][i] = output;
        }
    }
}

//==============================================================================
// DSP Methods
//==============================================================================

float ReverbPedalPureDSP::processRoom(float input, int channel)
{
    // Small room simulation with short decay
    float decaySamples = timeToSamples(params_.decay * 0.3f);

    // Write to delay line
    delayLines_[channel][writeIndex_[channel]] = input;
    writeIndex_[channel] = (writeIndex_[channel] + 1) % MAX_DELAY_SAMPLES;

    // Read early reflections
    float early1 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay1_[channel], channel);
    float early2 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay2_[channel], channel);
    float early3 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay3_[channel], channel);

    // Read tail
    float tail = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                               MAX_DELAY_SAMPLES, decaySamples, channel);

    // Mix reflections
    float output = early1 * 0.5f + early2 * 0.3f + early3 * 0.2f + tail * 0.4f;

    // Apply damping
    output *= (1.0f - params_.damping * 0.3f);

    return output;
}

float ReverbPedalPureDSP::processHall(float input, int channel)
{
    // Large hall with long decay
    float decaySamples = timeToSamples(params_.decay * 0.8f);

    // Write to delay line
    delayLines_[channel][writeIndex_[channel]] = input;
    writeIndex_[channel] = (writeIndex_[channel] + 1) % MAX_DELAY_SAMPLES;

    // Read early reflections (spaced out for larger room)
    float early1 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay1_[channel], channel);
    float early2 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay2_[channel], channel);
    float early3 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay3_[channel], channel);

    // Read tail (longer decay)
    float tail = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                               MAX_DELAY_SAMPLES, decaySamples, channel);

    // Mix with diffusion
    float output = (early1 * 0.4f + early2 * 0.3f + early3 * 0.2f) * params_.diffusion + tail * 0.5f;

    // Apply damping
    output *= (1.0f - params_.damping * 0.4f);

    return output;
}

float ReverbPedalPureDSP::processPlate(float input, int channel)
{
    // Classic plate reverb with dense reflections
    float decaySamples = timeToSamples(params_.decay * 0.5f);

    // Write to delay line
    delayLines_[channel][writeIndex_[channel]] = input;
    writeIndex_[channel] = (writeIndex_[channel] + 1) % MAX_DELAY_SAMPLES;

    // Dense early reflections (plate style)
    float early1 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay1_[channel], channel);
    float early2 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay2_[channel], channel);

    // Read tail
    float tail = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                               MAX_DELAY_SAMPLES, decaySamples, channel);

    // Mix with high diffusion
    float output = (early1 * 0.6f + early2 * 0.4f) * params_.diffusion + tail * 0.5f;

    // Apply damping
    output *= (1.0f - params_.damping * 0.3f);

    return output;
}

float ReverbPedalPureDSP::processSpring(float input, int channel)
{
    // Fender-style spring reverb with modulation
    float decaySamples = timeToSamples(params_.decay * 0.4f);

    // Add slight modulation for spring effect
    float mod = processModulation(input, lfoPhase_[channel]);
    lfoPhase_[channel] += 0.1f;

    // Write to delay line
    delayLines_[channel][writeIndex_[channel]] = input + mod * 0.1f;
    writeIndex_[channel] = (writeIndex_[channel] + 1) % MAX_DELAY_SAMPLES;

    // Read early reflections
    float early1 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay1_[channel], channel);
    float early2 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay2_[channel], channel);

    // Read tail with modulation
    float tail = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                               MAX_DELAY_SAMPLES, decaySamples, channel);

    // Mix with diffusion (lower for spring)
    float output = (early1 * 0.5f + early2 * 0.3f) * params_.diffusion + tail * 0.4f;

    // Apply damping (higher for spring)
    output *= (1.0f - params_.damping * 0.5f);

    return output;
}

float ReverbPedalPureDSP::processShimmer(float input, int channel)
{
    // Shimmer reverb with octave-up effect
    float decaySamples = timeToSamples(params_.decay);

    // Add octave-up shimmer
    float shimmer = input * 2.0f;  // Simple octave simulation

    // Write to delay line
    delayLines_[channel][writeIndex_[channel]] = input + shimmer * 0.3f;
    writeIndex_[channel] = (writeIndex_[channel] + 1) % MAX_DELAY_SAMPLES;

    // Read early reflections
    float early1 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay1_[channel], channel);
    float early2 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay2_[channel], channel);

    // Read tail (longer for shimmer)
    float tail = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                               MAX_DELAY_SAMPLES, decaySamples, channel);

    // Mix with diffusion (higher for shimmer)
    float output = (early1 * 0.4f + early2 * 0.3f) * params_.diffusion + tail * 0.6f;

    // Apply light damping for brightness
    output *= (1.0f - params_.damping * 0.2f);

    return output;
}

float ReverbPedalPureDSP::processModulated(float input, int channel)
{
    // Modulated reverb with chorus on tail
    float decaySamples = timeToSamples(params_.decay * 0.6f);

    // Add modulation
    float mod = processModulation(input, lfoPhase_[channel]);
    lfoPhase_[channel] += params_.modulation * 0.2f;

    // Write to delay line
    delayLines_[channel][writeIndex_[channel]] = input;
    writeIndex_[channel] = (writeIndex_[channel] + 1) % MAX_DELAY_SAMPLES;

    // Read early reflections
    float early1 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay1_[channel], channel);
    float early2 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay2_[channel], channel);

    // Read tail with modulation
    float tail = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                               MAX_DELAY_SAMPLES, decaySamples + mod * 100.0f, channel);

    // Mix
    float output = (early1 * 0.4f + early2 * 0.3f) * params_.diffusion + tail * 0.5f;

    // Apply damping
    output *= (1.0f - params_.damping * 0.3f);

    return output;
}

float ReverbPedalPureDSP::processReverse(float input, int channel)
{
    // Reverse reverb with fill/playback cycle
    int bufferSize = timeToSamples(params_.decay * 0.5f);

    // Fill buffer
    if (reverseFilling_[channel])
    {
        reverseBuffer_[channel][reverseWriteIndex_[channel]] = input;
        reverseWriteIndex_[channel]++;

        if (reverseWriteIndex_[channel] >= bufferSize)
        {
            reverseWriteIndex_[channel] = 0;
            reverseFilling_[channel] = false;
        }

        return input * 0.5f;  // Pass dry while filling
    }
    // Playback in reverse
    else
    {
        int readIndex = reverseWriteIndex_[channel];
        readIndex--;

        if (readIndex < 0)
            readIndex = bufferSize - 1;

        float output = reverseBuffer_[channel][readIndex];

        // Crossfade with dry
        float wet = output * 0.6f;

        // Check if we've played back entire buffer
        if (readIndex == 0)
        {
            reverseFilling_[channel] = true;
        }

        reverseWriteIndex_[channel] = readIndex;

        return wet;
    }
}

float ReverbPedalPureDSP::processGated(float input, int channel)
{
    // Gated reverb with 80s style
    float decaySamples = timeToSamples(params_.decay * 0.3f);

    // Write to delay line
    delayLines_[channel][writeIndex_[channel]] = input;
    writeIndex_[channel] = (writeIndex_[channel] + 1) % MAX_DELAY_SAMPLES;

    // Read early reflections
    float early1 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay1_[channel], channel);
    float early2 = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                                  MAX_DELAY_SAMPLES, earlyDelay2_[channel], channel);

    // Read tail
    float tail = readDelayLine(delayLines_[channel].data(), writeIndex_[channel],
                               MAX_DELAY_SAMPLES, decaySamples, channel);

    // Mix
    float output = (early1 * 0.5f + early2 * 0.3f) * params_.diffusion + tail * 0.5f;

    // Apply envelope follower for gating
    float env = std::abs(output);
    float gateCoeff = 0.99f;
    gateEnvelope_[channel] = env + (gateEnvelope_[channel] - env) * gateCoeff;

    // Gate when envelope drops below threshold
    float gateThreshold = 0.01f;
    if (gateEnvelope_[channel] < gateThreshold)
    {
        output *= 0.0f;  // Close gate
    }

    return output;
}

float ReverbPedalPureDSP::readDelayLine(float* buffer, int& writeIndex, int bufferSize,
                                        float delaySamples, int channel)
{
    float readIndex = writeIndex - delaySamples;

    // Wrap around
    while (readIndex < 0)
        readIndex += bufferSize;
    while (readIndex >= bufferSize)
        readIndex -= bufferSize;

    // Linear interpolation
    int index1 = static_cast<int>(readIndex);
    int index2 = (index1 + 1) % bufferSize;
    float frac = readIndex - index1;

    float sample1 = buffer[index1];
    float sample2 = buffer[index2];

    return lerp(sample1, sample2, frac);
}

float ReverbPedalPureDSP::processTone(float input, int channel)
{
    // Simple lowpass filter for tone control (dark to bright)
    // tone = 0 (dark) to 1 (bright)

    float coeff = 0.3f + params_.tone * 0.6f;  // 0.3 to 0.9

    float output = coeff * input + (1.0f - coeff) * toneZ1_[channel];
    toneZ1_[channel] = output;

    return output;
}

float ReverbPedalPureDSP::processModulation(float input, float phase)
{
    // Simple LFO modulation
    return std::sin(phase) * params_.modulation;
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* ReverbPedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"decay", "Decay", "s", 0.1f, 10.0f, 2.0f, true, 0.01f},
        {"mix", "Mix", "%", 0.0f, 1.0f, 0.4f, true, 0.01f},
        {"tone", "Tone", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"preDelay", "Pre-Delay", "ms", 0.0f, 200.0f, 10.0f, true, 0.01f},
        {"size", "Size", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"diffusion", "Diffusion", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"modulation", "Modulation", "", 0.0f, 1.0f, 0.0f, true, 0.01f},
        {"damping", "Damping", "", 0.0f, 1.0f, 0.3f, true, 0.01f},
        {"level", "Level", "", 0.0f, 1.0f, 0.7f, true, 0.01f},
        {"type", "Type", "", 0.0f, 7.0f, 0.0f, true, 1.0f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float ReverbPedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case Decay: return params_.decay;
        case Mix: return params_.mix;
        case Tone: return params_.tone;
        case PreDelay: return params_.preDelay;
        case Size: return params_.size;
        case Diffusion: return params_.diffusion;
        case Modulation: return params_.modulation;
        case Damping: return params_.damping;
        case Level: return params_.level;
        case Type: return static_cast<float>(params_.type);
    }
    return 0.0f;
}

void ReverbPedalPureDSP::setParameterValue(int index, float value)
{
    switch (index)
    {
        case Decay: params_.decay = value; break;
        case Mix: params_.mix = value; break;
        case Tone: params_.tone = value; break;
        case PreDelay: params_.preDelay = value; break;
        case Size: params_.size = value; break;
        case Diffusion: params_.diffusion = value; break;
        case Modulation: params_.modulation = value; break;
        case Damping: params_.damping = value; break;
        case Level: params_.level = value; break;
        case Type:
            params_.type = static_cast<int>(clamp(value, 0.0f, 7.0f));
            break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* ReverbPedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &REVERB_PRESETS[index];

    return nullptr;
}

} // namespace DSP
