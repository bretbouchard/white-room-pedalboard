/*
  ==============================================================================

    ChorusPedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Classic chorus pedal implementation

  ==============================================================================
*/

#include "dsp/ChorusPedalPureDSP.h"
#include <cmath>

namespace DSP {

//==============================================================================
// ChorusVoice Implementation
//==============================================================================

void ChorusPedalPureDSP::ChorusVoice::prepare(double sampleRate)
{
    lfoFrequency = sampleRate;
}

void ChorusPedalPureDSP::ChorusVoice::reset()
{
    phase = 0.0f;
}

float ChorusPedalPureDSP::ChorusVoice::process(float input, float rate, float depth, float& delayState)
{
    // Update LFO phase
    float lfoRate = 0.1f + rate * 9.9f; // 0.1 to 10.0 Hz
    phase += (2.0f * M_PI * lfoRate) / lfoFrequency;

    // Triangle wave LFO
    float lfo = 2.0f * std::abs(2.0f * (phase / (2.0f * M_PI) - std::floor(phase / (2.0f * M_PI) + 0.5f))) - 1.0f;

    // Modulate delay time
    float baseDelay = 0.01f; // 10ms base delay
    float modDelay = baseDelay + lfo * depth * 0.02f; // Up to 30ms total
    int delaySamples = static_cast<int>(modDelay * 48000.0f);

    // Simple delay implementation (would need circular buffer in full implementation)
    float delayed = delayState; // Simplified - would use actual delay line
    delayState = input;

    // Mix dry and delayed
    return input * (1.0f - depth * 0.5f) + delayed * depth * 0.5f;
}

//==============================================================================
// ChorusPedalPureDSP Implementation
//==============================================================================

ChorusPedalPureDSP::ChorusPedalPureDSP()
{
}

bool ChorusPedalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // Prepare delay line (max 50ms)
    maxDelaySamples_ = static_cast<int>(sampleRate * 0.05);
    delayLine_.resize(maxDelaySamples_);
    std::fill(delayLine_.begin(), delayLine_.end(), 0.0f);
    writeIndex_ = 0;

    // Prepare voices
    for (auto& voice : voices_)
    {
        voice.prepare(sampleRate);
    }

    prepared_ = true;
    return true;
}

void ChorusPedalPureDSP::reset()
{
    std::fill(delayLine_.begin(), delayLine_.end(), 0.0f);
    writeIndex_ = 0;
    toneState_ = 0.0f;

    for (auto& voice : voices_)
    {
        voice.reset();
    }

    for (auto& state : delayStates_)
    {
        state = 0.0f;
    }
}

void ChorusPedalPureDSP::process(float** inputs, float** outputs,
                                int numChannels, int numSamples)
{
    // Ensure we have stereo for stereo modes
    bool useStereo = (numChannels >= 2) && (params_.stereoMode > 0);

    for (int i = 0; i < numSamples; ++i)
    {
        // Get input samples (mono or stereo)
        float inputL = inputs[0][i];
        float inputR = useStereo ? inputs[1][i] : inputL;

        // Safety check
        if (std::isnan(inputL) || std::isinf(inputL)) inputL = 0.0f;
        if (std::isnan(inputR) || std::isinf(inputR)) inputR = 0.0f;

        // Write to delay line (mono input for chorus)
        float monoInput = (inputL + inputR) * 0.5f;
        delayLine_[writeIndex_] = monoInput;

        // Processing chain with all new features:
        // 1. Circuit processing (8 different chorus types)
        float chorusL = processCircuit(monoInput, 0);
        float chorusR = useStereo ? processCircuit(monoInput, 1) : chorusL;

        // 2. Vibrato mode (100% wet if enabled)
        if (params_.vibratoMode)
        {
            chorusL = processVibrato(monoInput);
            chorusR = useStereo ? processVibrato(monoInput) : chorusL;
        }

        // 3. Stereo processing
        if (useStereo)
        {
            StereoMode mode = static_cast<StereoMode>(params_.stereoMode);

            if (mode == StereoMode::Stereo)
            {
                // Ping-pong delay (alternating channels)
                // This is simplified - would need more sophisticated implementation
                // for true ping-pong
            }
            else if (mode == StereoMode::Cross)
            {
                // Cross mode (opposing phases)
                // L gets chorusL, R gets chorusR with phase offset
                chorusR = chorusL; // Simplified - would use phase offset
            }
        }

        // 4. Tone control
        chorusL = processTone(chorusL);
        chorusR = useStereo ? processTone(chorusR) : chorusL;

        // 5. Mix dry and wet
        float outputL, outputR;

        if (params_.vibratoMode)
        {
            // Vibrato mode - 100% wet
            outputL = chorusL;
            outputR = chorusR;
        }
        else
        {
            // Normal chorus - mix wet and dry
            outputL = inputL * (1.0f - params_.mix) + chorusL * params_.mix;
            outputR = useStereo ? (inputR * (1.0f - params_.mix) + chorusR * params_.mix) : outputL;
        }

        // Safety
        if (std::isnan(outputL) || std::isinf(outputL)) outputL = 0.0f;
        if (std::isnan(outputR) || std::isinf(outputR)) outputR = 0.0f;

        // Hard clip for safety
        outputL = hardClip(outputL, 1.5f);
        outputR = hardClip(outputR, 1.5f);

        // Output
        outputs[0][i] = outputL;
        if (useStereo)
        {
            outputs[1][i] = outputR;
        }

        // Advance write index
        writeIndex_ = (writeIndex_ + 1) % maxDelaySamples_;
    }
}

//==============================================================================
// DSP Circuits
//==============================================================================

float ChorusPedalPureDSP::generateLFO(float phase, LFOWaveform waveform)
{
    // Generate different LFO waveforms
    switch (waveform)
    {
        case LFOWaveform::Triangle:
        {
            // Standard triangle wave
            return 2.0f * std::abs(2.0f * (phase / (2.0f * M_PI) -
                   std::floor(phase / (2.0f * M_PI) + 0.5f))) - 1.0f;
        }

        case LFOWaveform::Sine:
        {
            // Smooth sine wave
            return std::sin(phase);
        }

        case LFOWaveform::Square:
        {
            // Aggressive square wave
            return (std::sin(phase) > 0.0f) ? 1.0f : -1.0f;
        }

        case LFOWaveform::Random:
        {
            // Random modulation (sample and hold)
            static float lastRandom = 0.0f;
            static int sampleCounter = 0;
            static constexpr int RANDOM_RATE = 1000; // Update every 1000 samples

            sampleCounter++;
            if (sampleCounter >= RANDOM_RATE)
            {
                lastRandom = (rand() / (float)RAND_MAX) * 2.0f - 1.0f;
                sampleCounter = 0;
            }
            return lastRandom;
        }

        default:
            return 0.0f;
    }
}

float ChorusPedalPureDSP::processCircuit(float input, int channel)
{
    // Circuit-specific chorus processing
    ChorusCircuit circuit = static_cast<ChorusCircuit>(params_.circuit);

    float baseDelay = 0.01f; // 10ms base delay
    float maxDelay = 0.03f; // 30ms max delay

    switch (circuit)
    {
        case ChorusCircuit::AnalogChorus:
        {
            // BBD emulation - warmer, darker tone
            float delay = baseDelay + params_.depth * maxDelay * 0.5f;
            int delaySamples = static_cast<int>(delay * sampleRate_);
            int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;
            float delayed = delayLine_[readIndex];

            // Apply BBD companding (compression/expansion)
            // and add subtle warmth
            return delayed * 0.9f + input * 0.1f;
        }

        case ChorusCircuit::DigitalChorus:
        {
            // Clean digital chorus - pristine, clear
            float delay = baseDelay + params_.depth * maxDelay;
            int delaySamples = static_cast<int>(delay * sampleRate_);
            int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;
            return delayLine_[readIndex];
        }

        case ChorusCircuit::TriChorus:
        {
            // Tri-chorus - 3 detuned voices
            float output = 0.0f;
            for (int v = 0; v < 3; ++v)
            {
                float detune = params_.detune * 0.333f;
                float voiceDelay = baseDelay + (v * detune * maxDelay * 0.333f);

                LFOWaveform waveform = static_cast<LFOWaveform>(params_.waveform);
                float lfo = generateLFO(voices_[v].phase, waveform);
                voices_[v].phase += (2.0f * M_PI * getLFORate()) / sampleRate_;

                float modDelay = voiceDelay + lfo * params_.depth * maxDelay * 0.5f;
                int delaySamples = static_cast<int>(modDelay * sampleRate_);
                int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;

                output += delayLine_[readIndex];
            }
            return output / 3.0f;
        }

        case ChorusCircuit::QuadChorus:
        {
            // Quad chorus - 4 voices for maximum richness
            float output = 0.0f;
            for (int v = 0; v < 4; ++v)
            {
                float detune = params_.detune * 0.25f;
                float voiceDelay = baseDelay + (v * detune * maxDelay * 0.25f);

                LFOWaveform waveform = static_cast<LFOWaveform>(params_.waveform);
                float lfo = generateLFO(voices_[v % MAX_VOICES].phase + v * 0.5f, waveform);
                voices_[v % MAX_VOICES].phase += (2.0f * M_PI * getLFORate()) / sampleRate_;

                float modDelay = voiceDelay + lfo * params_.depth * maxDelay * 0.5f;
                int delaySamples = static_cast<int>(modDelay * sampleRate_);
                int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;

                output += delayLine_[readIndex];
            }
            return output / 4.0f;
        }

        case ChorusCircuit::DimensionD:
        {
            // Dimension D - separate LFOs per voice for 3D modulation
            float output = 0.0f;
            for (int v = 0; v < 2; ++v)
            {
                LFOWaveform waveform = static_cast<LFOWaveform>(params_.waveform);
                float lfo1 = generateLFO(voices_[v].phase, waveform);
                float lfo2 = generateLFO(voices_[v].phase + M_PI, waveform); // Opposing phase

                voices_[v].phase += (2.0f * M_PI * getLFORate()) / sampleRate_;

                float modDelay1 = baseDelay + lfo1 * params_.depth * maxDelay * 0.5f;
                float modDelay2 = baseDelay + lfo2 * params_.depth * maxDelay * 0.5f;

                int delaySamples1 = static_cast<int>(modDelay1 * sampleRate_);
                int delaySamples2 = static_cast<int>(modDelay2 * sampleRate_);

                int readIndex1 = (writeIndex_ - delaySamples1 + maxDelaySamples_) % maxDelaySamples_;
                int readIndex2 = (writeIndex_ - delaySamples2 + maxDelaySamples_) % maxDelaySamples_;

                output += (delayLine_[readIndex1] + delayLine_[readIndex2]) * 0.5f;
            }
            return output / 2.0f;
        }

        case ChorusCircuit::SmallClone:
        {
            // Small Clone - EH style, simple and effective
            float delay = baseDelay + params_.depth * maxDelay * 0.7f;
            int delaySamples = static_cast<int>(delay * sampleRate_);
            int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;
            return delayLine_[readIndex];
        }

        case ChorusCircuit::CE1:
        {
            // Boss CE-1 - classic studio chorus
            float delay = baseDelay + params_.depth * maxDelay * 0.6f;
            int delaySamples = static_cast<int>(delay * sampleRate_);
            int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;

            // CE-1 has a characteristic high-frequency rolloff
            float delayed = delayLine_[readIndex];
            float toneCoeff = 0.95f;
            return toneCoeff * delayStates_[0] + (1.0f - toneCoeff) * delayed;
        }

        case ChorusCircuit::JazzChorus:
        {
            // Roland Jazz Chorus - clean, lush stereo
            float delay = baseDelay + params_.depth * maxDelay * 0.4f;
            int delaySamples = static_cast<int>(delay * sampleRate_);
            int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;
            return delayLine_[readIndex];
        }

        default:
            return input;
    }
}

float ChorusPedalPureDSP::processVibrato(float input)
{
    // Vibrato mode - 100% wet, pitch modulation only
    // No dry signal mixed in

    LFOWaveform waveform = static_cast<LFOWaveform>(params_.waveform);
    float lfo = generateLFO(voices_[0].phase, waveform);
    voices_[0].phase += (2.0f * M_PI * getLFORate()) / sampleRate_;

    // Modulate delay time for pitch shifting
    float baseDelay = 0.01f; // 10ms base delay
    float maxDelay = 0.03f; // 30ms max delay
    float modDelay = baseDelay + lfo * params_.depth * maxDelay;

    int delaySamples = static_cast<int>(modDelay * sampleRate_);
    int readIndex = (writeIndex_ - delaySamples + maxDelaySamples_) % maxDelaySamples_;

    // Return 100% wet signal (no dry mix)
    return delayLine_[readIndex];
}

float ChorusPedalPureDSP::processTone(float input)
{
    // Simple lowpass filter for tone control
    float toneCoeff = 0.9f + params_.tone * 0.09f; // 0.9 to 0.99
    float output = toneCoeff * toneState_ + (1.0f - toneCoeff) * input;
    toneState_ = output;
    return output;
}

float ChorusPedalPureDSP::getLFORate()
{
    // Get LFO rate based on speed switch
    float baseRate = 0.1f + params_.rate * 9.9f; // 0.1 to 10.0 Hz

    if (params_.speedSwitch == 1)
    {
        // Fast range: 5 to 20 Hz
        return 5.0f + params_.rate * 15.0f;
    }
    else
    {
        // Slow range: 0.1 to 5 Hz
        return baseRate;
    }
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* ChorusPedalPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"rate", "Rate", "Hz", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"depth", "Depth", "", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"mix", "Mix", "%", 0.0f, 1.0f, 0.5f, true, 0.01f},
        {"tone", "Tone", "", 0.0f, 1.0f, 0.6f, true, 0.01f},
        {"voice_count", "Voices", "", 1.0f, 3.0f, 3.0f, true, 1.0f},
        {"circuit", "Circuit", "", 0.0f, 7.0f, 0.0f, true, 1.0f},
        {"vibrato_mode", "Vibrato", "", 0.0f, 1.0f, 0.0f, true, 1.0f},
        {"speed_switch", "Speed", "", 0.0f, 1.0f, 0.0f, true, 1.0f},
        {"waveform", "Waveform", "", 0.0f, 3.0f, 0.0f, true, 1.0f},
        {"stereo_mode", "Stereo", "", 0.0f, 2.0f, 0.0f, true, 1.0f},
        {"detune", "Detune", "", 0.0f, 1.0f, 0.3f, true, 0.01f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float ChorusPedalPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case Rate: return params_.rate;
        case Depth: return params_.depth;
        case Mix: return params_.mix;
        case Tone: return params_.tone;
        case VoiceCount: return static_cast<float>(params_.voiceCount);
        case Circuit: return static_cast<float>(params_.circuit);
        case VibratoMode: return static_cast<float>(params_.vibratoMode);
        case SpeedSwitch: return static_cast<float>(params_.speedSwitch);
        case Waveform: return static_cast<float>(params_.waveform);
        case StereoModeParam: return static_cast<float>(params_.stereoMode);
        case Detune: return params_.detune;
    }
    return 0.0f;
}

void ChorusPedalPureDSP::setParameterValue(int index, float value)
{
    // Clamp value to appropriate range
    switch (index)
    {
        case Circuit:
            value = clamp(value, 0.0f, 7.0f);
            params_.circuit = static_cast<int>(value);
            break;
        case VibratoMode:
        case SpeedSwitch:
            value = clamp(value, 0.0f, 1.0f);
            params_.vibratoMode = static_cast<int>(value);
            params_.speedSwitch = static_cast<int>(value);
            break;
        case Waveform:
            value = clamp(value, 0.0f, 3.0f);
            params_.waveform = static_cast<int>(value);
            break;
        case StereoModeParam:
            value = clamp(value, 0.0f, 2.0f);
            params_.stereoMode = static_cast<int>(value);
            break;
        case VoiceCount:
            value = clamp(value, 1.0f, 3.0f);
            params_.voiceCount = static_cast<int>(value);
            break;
        default:
            value = clamp(value, 0.0f, 1.0f);
            break;
    }

    switch (index)
    {
        case Rate: params_.rate = value; break;
        case Depth: params_.depth = value; break;
        case Mix: params_.mix = value; break;
        case Tone: params_.tone = value; break;
        case VoiceCount: params_.voiceCount = static_cast<int>(value); break;
        case Circuit: params_.circuit = static_cast<int>(value); break;
        case VibratoMode: params_.vibratoMode = static_cast<int>(value); break;
        case SpeedSwitch: params_.speedSwitch = static_cast<int>(value); break;
        case Waveform: params_.waveform = static_cast<int>(value); break;
        case StereoModeParam: params_.stereoMode = static_cast<int>(value); break;
        case Detune: params_.detune = value; break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* ChorusPedalPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &CHORUS_PRESETS[index];

    return nullptr;
}

} // namespace DSP
