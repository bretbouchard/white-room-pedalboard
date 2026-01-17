/*
  ==============================================================================

    NexSynthDSP_Pure.cpp
    Created: December 30, 2025
    Author:  Bret Bouchard

    Pure DSP implementation of NEX FM Synthesizer for tvOS

    5-operator FM synthesis with real-time safe audio processing
    No allocations in audio thread, deterministic output

  ==============================================================================
*/

#define JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED 1

#include "dsp/NexSynthDSP.h"
#include "../../../../include/dsp/InstrumentFactory.h"
#include "../../../../include/dsp/FastMath.h"
#include "../../../../include/dsp/SIMDBufferOps.h"
#include "../../../../include/dsp/DSPLogging.h"
#include <cstring>
#include <cmath>
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace DSP {

//==============================================================================
// FMOperator Implementation
//==============================================================================

void FMOperator::Envelope::reset()
{
    currentLevel = 0.0;
    envelopeTime = 0.0;
    isReleased = false;
    isActive = false;
}

void FMOperator::Envelope::start()
{
    currentLevel = 0.0;
    envelopeTime = 0.0;
    isReleased = false;
    isActive = true;
}

void FMOperator::Envelope::release()
{
    isReleased = true;
    envelopeTime = 0.0;
}

double FMOperator::Envelope::process(double sampleRate, int numSamples)
{
    if (!isActive)
    {
        currentLevel = 0.0;
        return 0.0;
    }

    // Guard against invalid sample rate
    double safeSampleRate = (sampleRate > 0.0) ? sampleRate : 48000.0;
    double time = envelopeTime / safeSampleRate;
    double target = 0.0;

    if (!isReleased)
    {
        // Attack phase
        if (time < attack)
        {
            double t = time / attack;
            target = t;  // Linear attack
        }
        // Decay phase
        else if (time < (attack + decay))
        {
            double t = (time - attack) / decay;
            target = sustain + (1.0 - sustain) * (1.0 - t);
        }
        // Sustain phase
        else
        {
            target = sustain;
        }
    }
    else
    {
        // Release phase
        double timeInRelease = time;
        if (timeInRelease < releaseTime)
        {
            double t = timeInRelease / releaseTime;
            target = currentLevel * (1.0 - t);  // Release from current level
        }
        else
        {
            isActive = false;
            currentLevel = 0.0;
            return 0.0;
        }
    }

    envelopeTime += static_cast<double>(numSamples);
    currentLevel = target;
    return currentLevel;
}

void FMOperator::reset()
{
    phase = 0.0;
    phaseIncrement = 0.0;
    previousOutput = 0.0;
    envelope.reset();
}

double FMOperator::process(double modulation, double sampleRate, double feedback)
{
    // Update phase
    double frequency = (fixedFrequency > 0.0) ? fixedFrequency :
                      phaseIncrement * sampleRate;
    double modulatedFreq = frequency * detuneFactor;  // Use cached detune factor
    phase += modulatedFreq / sampleRate;
    phase -= std::floor(phase);  // Wrap to [0, 1)

    // Generate sine wave output using fast approximation
    double sine = FastMath::fastSin(2.0 * M_PI * phase);

    // Apply envelope
    double env = envelope.process(sampleRate, 1);

    // Store previous output for feedback
    previousOutput = sine;

    // Apply feedback, modulation, envelope, and output level
    double output = sine * env * outputLevel * modulationIndex;

    // Apply feedback modulation (self-modulation)
    if (feedback > 0.0)
    {
        output += previousOutput * feedback * env;
    }

    return output * modulation;
}

//==============================================================================
// FM Algorithms Implementation
//==============================================================================

const double (*FMAlgorithms::getAlgorithm(int algorithmIndex))[NUM_OPERATORS]
{
    switch (algorithmIndex)
    {
        case 1:  return algorithm1;
        case 2:  return algorithm2;
        case 3:  return algorithm3;
        case 16: return algorithm16;
        case 32: return algorithm32;
        default: return algorithm1;  // Default to algorithm 1
    }
}

//==============================================================================
// NexSynthVoice Implementation
//==============================================================================

NexSynthVoice::NexSynthVoice()
{
    // Initialize operators
    for (auto& op : operators_)
    {
        op.reset();
    }

    // Set default algorithm
    setAlgorithm(1);
}

void NexSynthVoice::setAlgorithm(int algorithmIndex)
{
    currentAlgorithm_ = algorithmIndex;
    currentAlgorithmMatrix_ = FMAlgorithms::getAlgorithm(algorithmIndex);
}

void NexSynthVoice::startNote(int midiNote, float velocity)
{
    midiNote_ = midiNote;
    velocity_ = velocity;
    frequency_ = midiToFrequency(midiNote);
    isActive_ = true;

    // Start all operator envelopes and initialize detune factors
    for (auto& op : operators_)
    {
        op.envelope.start();
        // Initialize detune factor cache
        op.detuneFactor = FastMath::detuneToFactor(op.detune);
        // Note: phaseIncrement will be updated in process() loop
        op.phaseIncrement = 0.0;
    }
}

void NexSynthVoice::stopNote(float velocity)
{
    // Release all operator envelopes
    for (auto& op : operators_)
    {
        op.envelope.release();
    }
}

void NexSynthVoice::reset()
{
    // Reset all operators
    for (auto& op : operators_)
    {
        op.reset();
    }

    // Reset feedback state
    feedbackOutputs_.fill(0.0);
    operatorOutputs_.fill(0.0);

    // Mark voice as inactive
    isActive_ = false;
    midiNote_ = 0;
    velocity_ = 0.0f;
    frequency_ = 440.0;
}

double NexSynthVoice::midiToFrequency(int midiNote) const
{
    return 440.0 * FastMath::fastPow2((midiNote - 69) / 12.0);
}

void NexSynthVoice::processAllOperatorsBatch(double sampleRate)
{
    // BATCH PROCESSING: Process all operators in parallel using the modulation matrix
    // This approach is cache-friendly and allows for better CPU pipeline utilization

    // First pass: Calculate modulation for each operator
    std::array<double, 5> modulationAmounts;
    for (int i = 0; i < 5; ++i)
    {
        modulationAmounts[i] = 1.0;  // Start with no modulation

        // Sum contributions from all modulators
        for (int j = 0; j < 5; ++j)
        {
            double modAmount = currentAlgorithmMatrix_[i][j];
            if (modAmount > 0.0 && operatorOutputs_[j] != 0.0)
            {
                // Apply modulation from operator j to operator i
                modulationAmounts[i] += operatorOutputs_[j] * modAmount * operators_[i].modulationIndex;
            }
        }
    }

    // Second pass: Process all operators with their calculated modulation
    // This is cache-friendly as we access operators sequentially
    for (int i = 0; i < 5; ++i)
    {
        FMOperator& op = operators_[i];

        // Update phase increment based on current frequency
        op.phaseIncrement = frequency_ * op.frequencyRatio;

        // Process operator with modulation and feedback
        operatorOutputs_[i] = op.process(modulationAmounts[i], sampleRate, op.feedbackAmount);
    }
}

void NexSynthVoice::process(float** outputs, int numChannels, int numSamples, double sampleRate)
{
    if (!isActive_)
        return;

    // Clear output buffers using SIMD
    SIMDBufferOps::clearBuffers(outputs, numChannels, numSamples);

    // Process each sample using batch processing
    for (int sample = 0; sample < numSamples; ++sample)
    {
        // BATCH PROCESSING: Process all operators in parallel
        processAllOperatorsBatch(sampleRate);

        // Mix operator outputs according to algorithm
        // Carriers are operators that don't modulate others
        double output = 0.0;

        // Simple mix: sum all operator outputs (could be algorithm-specific)
        for (int i = 0; i < 5; ++i)
        {
            output += operatorOutputs_[i];
        }

        // Apply velocity
        output *= velocity_;

        // Check if voice is finished
        bool allInactive = true;
        for (const auto& op : operators_)
        {
            if (op.envelope.isActive)
            {
                allInactive = false;
                break;
            }
        }

        if (allInactive)
        {
            isActive_ = false;
            break;
        }

        // Write to all channels
        for (int ch = 0; ch < numChannels; ++ch)
        {
            outputs[ch][sample] += static_cast<float>(output);
        }
    }

    // Apply SIMD-optimized soft clipping to prevent overload
    for (int ch = 0; ch < numChannels; ++ch)
    {
        SIMDBufferOps::softClipBuffer(outputs[ch], numSamples, -1.0f, 1.0f);
    }
}

//==============================================================================
// NexSynthDSP Implementation
//==============================================================================

NexSynthDSP::NexSynthDSP()
{
    // Initialize voices
    for (auto& voice : voices_)
    {
        voice = std::make_unique<NexSynthVoice>();
    }
}

NexSynthDSP::~NexSynthDSP()
{
    // Voices are automatically cleaned up by unique_ptr
}

bool NexSynthDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // Reset all voices to inactive state
    for (auto& voice : voices_)
    {
        if (voice) {
            // Don't start notes - voices should be inactive initially
            // Just reset the voice state
        }
    }

    return true;
}

void NexSynthDSP::reset()
{
    // Reset all voices to inactive state
    for (auto& voice : voices_)
    {
        if (voice) {
            voice->reset();
        }
    }

    pitchBend_ = 0.0;
}

void NexSynthDSP::process(float** outputs, int numChannels, int numSamples)
{
    // Clear output buffers using SIMD
    SIMDBufferOps::clearBuffers(outputs, numChannels, numSamples);

    // Process all active voices
    int activeCount = 0;
    for (auto& voice : voices_)
    {
        if (voice && voice->isActive())
        {
            voice->process(outputs, numChannels, numSamples, sampleRate_);
            activeCount++;
        }
    }

    // Apply master volume using SIMD
    float masterVol = static_cast<float>(params_.masterVolume);
    for (int ch = 0; ch < numChannels; ++ch)
    {
        SIMDBufferOps::multiplyBuffer(outputs[ch], numSamples, masterVol);
    }
}

void NexSynthDSP::handleEvent(const ScheduledEvent& event)
{
    switch (event.type)
    {
        case ScheduledEvent::NOTE_ON:
        {
            NexSynthVoice* voice = findFreeVoice();
            if (voice)
            {
                double pitchBendSemitones = pitchBend_ * params_.pitchBendRange;
                voice->startNote(event.data.note.midiNote, event.data.note.velocity);
            }
            break;
        }

        case ScheduledEvent::NOTE_OFF:
        {
            NexSynthVoice* voice = findVoiceForNote(event.data.note.midiNote);
            if (voice)
            {
                voice->stopNote(event.data.note.velocity);
            }
            break;
        }

        case ScheduledEvent::PITCH_BEND:
        {
            pitchBend_ = event.data.pitchBend.bendValue;
            // Update active voices
            for (auto& voice : voices_)
            {
                if (voice && voice->isActive())
                {
                    // Voice will use pitchBend_ in next process call
                }
            }
            break;
        }

        case ScheduledEvent::RESET:
        {
            reset();
            break;
        }

        default:
            break;
    }
}

float NexSynthDSP::getParameter(const char* paramId) const
{
    if (std::strcmp(paramId, "masterVolume") == 0)
        return static_cast<float>(params_.masterVolume);

    if (std::strcmp(paramId, "pitchBendRange") == 0)
        return static_cast<float>(params_.pitchBendRange);

    if (std::strcmp(paramId, "algorithm") == 0)
        return static_cast<float>(params_.algorithm);

    // Operator parameters
    if (std::strncmp(paramId, "op", 2) == 0)
    {
        int opIndex = paramId[2] - '1';
        if (opIndex >= 0 && opIndex < 5)
        {
            const char* subParam = paramId + 4;  // Skip "opX_"

            if (std::strcmp(subParam, "ratio") == 0)
                return static_cast<float>(params_.operatorParams.ratio[opIndex]);
            if (std::strcmp(subParam, "detune") == 0)
                return static_cast<float>(params_.operatorParams.detune[opIndex]);
            if (std::strcmp(subParam, "modIndex") == 0)
                return static_cast<float>(params_.operatorParams.modulationIndex[opIndex]);
            if (std::strcmp(subParam, "level") == 0)
                return static_cast<float>(params_.operatorParams.outputLevel[opIndex]);
            if (std::strcmp(subParam, "feedback") == 0)
                return static_cast<float>(params_.operatorParams.feedback[opIndex]);
            if (std::strcmp(subParam, "attack") == 0)
                return static_cast<float>(params_.operatorParams.attack[opIndex]);
            if (std::strcmp(subParam, "decay") == 0)
                return static_cast<float>(params_.operatorParams.decay[opIndex]);
            if (std::strcmp(subParam, "sustain") == 0)
                return static_cast<float>(params_.operatorParams.sustain[opIndex]);
            if (std::strcmp(subParam, "release") == 0)
                return static_cast<float>(params_.operatorParams.release[opIndex]);
        }
    }

    return 0.0f;
}

void NexSynthDSP::setParameter(const char* paramId, float value)
{
    // Get old value for logging (before change)
    float oldValue = getParameter(paramId);

    if (std::strcmp(paramId, "masterVolume") == 0)
    {
        params_.masterVolume = clamp(value, 0.0f, 1.0f);
        LOG_PARAMETER_CHANGE("NexSynth", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "pitchBendRange") == 0)
    {
        params_.pitchBendRange = clamp(value, 0.0f, 24.0f);
        LOG_PARAMETER_CHANGE("NexSynth", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "algorithm") == 0)
    {
        int algorithmIndex = static_cast<int>(value);
        params_.algorithm = clamp(algorithmIndex, 1, 32);

        // Update algorithm for all active voices
        for (auto& voice : voices_)
        {
            if (voice && voice->isActive())
            {
                voice->setAlgorithm(params_.algorithm);
            }
        }
        LOG_PARAMETER_CHANGE("NexSynth", paramId, oldValue, value);
        return;
    }

    // Operator parameters
    if (std::strncmp(paramId, "op", 2) == 0)
    {
        int opIndex = paramId[2] - '1';
        if (opIndex >= 0 && opIndex < 5)
        {
            const char* subParam = paramId + 4;  // Skip "opX_"

            if (std::strcmp(subParam, "ratio") == 0)
                params_.operatorParams.ratio[opIndex] = clamp(value, 0.1f, 20.0f);
            if (std::strcmp(subParam, "detune") == 0)
            {
                params_.operatorParams.detune[opIndex] = clamp(value, -100.0f, 100.0f);

                // Update detune factor cache for all voices
                double detuneValue = params_.operatorParams.detune[opIndex];
                for (auto& voice : voices_)
                {
                    if (voice)
                    {
                        voice->operators_[opIndex].detune = detuneValue;
                        voice->operators_[opIndex].detuneFactor =
                            FastMath::detuneToFactor(detuneValue);
                    }
                }
            }
            if (std::strcmp(subParam, "modIndex") == 0)
                params_.operatorParams.modulationIndex[opIndex] = clamp(value, 0.0f, 20.0f);
            if (std::strcmp(subParam, "level") == 0)
                params_.operatorParams.outputLevel[opIndex] = clamp(value, 0.0f, 1.0f);
            if (std::strcmp(subParam, "feedback") == 0)
            {
                params_.operatorParams.feedback[opIndex] = clamp(value, 0.0f, 1.0f);

                // Update feedback amount for all voices
                double feedbackValue = params_.operatorParams.feedback[opIndex];
                for (auto& voice : voices_)
                {
                    if (voice)
                    {
                        voice->operators_[opIndex].feedbackAmount = feedbackValue;
                    }
                }
            }
            if (std::strcmp(subParam, "attack") == 0)
                params_.operatorParams.attack[opIndex] = clamp(value, 0.001f, 5.0f);
            if (std::strcmp(subParam, "decay") == 0)
                params_.operatorParams.decay[opIndex] = clamp(value, 0.001f, 5.0f);
            if (std::strcmp(subParam, "sustain") == 0)
                params_.operatorParams.sustain[opIndex] = clamp(value, 0.0f, 1.0f);
            if (std::strcmp(subParam, "release") == 0)
                params_.operatorParams.release[opIndex] = clamp(value, 0.001f, 5.0f);
        }
    }

    // Log parameter change (shared telemetry infrastructure)
    LOG_PARAMETER_CHANGE("NexSynth", paramId, oldValue, value);
}

bool NexSynthDSP::savePreset(char* jsonBuffer, int jsonBufferSize) const
{
    if (!jsonBuffer || jsonBufferSize <= 0)
        return false;

    int offset = 0;

    // Write opening brace
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = '{';

    // Write master volume
    if (!writeJsonParameter("masterVolume", params_.masterVolume, jsonBuffer, offset, jsonBufferSize))
        return false;

    // Write pitch bend range
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = ',';
    if (!writeJsonParameter("pitchBendRange", params_.pitchBendRange, jsonBuffer, offset, jsonBufferSize))
        return false;

    // Write algorithm
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = ',';
    if (!writeJsonParameter("algorithm", static_cast<double>(params_.algorithm), jsonBuffer, offset, jsonBufferSize))
        return false;

    // Write operator parameters
    for (int op = 0; op < 5; ++op)
    {
        char paramName[64];

        // Ratio
        if (offset >= jsonBufferSize) return false;
        jsonBuffer[offset++] = ',';
        std::snprintf(paramName, sizeof(paramName), "op%d_ratio", op + 1);
        if (!writeJsonParameter(paramName, params_.operatorParams.ratio[op], jsonBuffer, offset, jsonBufferSize))
            return false;

        // Detune
        if (offset >= jsonBufferSize) return false;
        jsonBuffer[offset++] = ',';
        std::snprintf(paramName, sizeof(paramName), "op%d_detune", op + 1);
        if (!writeJsonParameter(paramName, params_.operatorParams.detune[op], jsonBuffer, offset, jsonBufferSize))
            return false;

        // Modulation index
        if (offset >= jsonBufferSize) return false;
        jsonBuffer[offset++] = ',';
        std::snprintf(paramName, sizeof(paramName), "op%d_modIndex", op + 1);
        if (!writeJsonParameter(paramName, params_.operatorParams.modulationIndex[op], jsonBuffer, offset, jsonBufferSize))
            return false;

        // Output level
        if (offset >= jsonBufferSize) return false;
        jsonBuffer[offset++] = ',';
        std::snprintf(paramName, sizeof(paramName), "op%d_level", op + 1);
        if (!writeJsonParameter(paramName, params_.operatorParams.outputLevel[op], jsonBuffer, offset, jsonBufferSize))
            return false;

        // Feedback
        if (offset >= jsonBufferSize) return false;
        jsonBuffer[offset++] = ',';
        std::snprintf(paramName, sizeof(paramName), "op%d_feedback", op + 1);
        if (!writeJsonParameter(paramName, params_.operatorParams.feedback[op], jsonBuffer, offset, jsonBufferSize))
            return false;
    }

    // Write closing brace
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = '}';
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = '\0';

    return true;
}

bool NexSynthDSP::loadPreset(const char* jsonData)
{
    if (!jsonData)
        return false;

    // Simple JSON parsing (in production, use a proper JSON library)
    double value;

    if (parseJsonParameter(jsonData, "masterVolume", value))
        params_.masterVolume = value;

    if (parseJsonParameter(jsonData, "pitchBendRange", value))
        params_.pitchBendRange = value;

    if (parseJsonParameter(jsonData, "algorithm", value))
    {
        params_.algorithm = static_cast<int>(value);
        // Update algorithm for all active voices
        for (auto& voice : voices_)
        {
            if (voice && voice->isActive())
            {
                voice->setAlgorithm(params_.algorithm);
            }
        }
    }

    // Parse operator parameters
    for (int op = 0; op < 5; ++op)
    {
        char paramName[64];

        std::snprintf(paramName, sizeof(paramName), "op%d_ratio", op + 1);
        if (parseJsonParameter(jsonData, paramName, value))
            params_.operatorParams.ratio[op] = value;

        std::snprintf(paramName, sizeof(paramName), "op%d_detune", op + 1);
        if (parseJsonParameter(jsonData, paramName, value))
            params_.operatorParams.detune[op] = value;

        std::snprintf(paramName, sizeof(paramName), "op%d_modIndex", op + 1);
        if (parseJsonParameter(jsonData, paramName, value))
            params_.operatorParams.modulationIndex[op] = value;

        std::snprintf(paramName, sizeof(paramName), "op%d_level", op + 1);
        if (parseJsonParameter(jsonData, paramName, value))
            params_.operatorParams.outputLevel[op] = value;

        std::snprintf(paramName, sizeof(paramName), "op%d_feedback", op + 1);
        if (parseJsonParameter(jsonData, paramName, value))
            params_.operatorParams.feedback[op] = value;
    }

    return true;
}

int NexSynthDSP::getActiveVoiceCount() const
{
    int count = 0;
    for (const auto& voice : voices_)
    {
        if (voice && voice->isActive())
            count++;
    }
    return count;
}

//==============================================================================
// Private Methods
//==============================================================================

NexSynthVoice* NexSynthDSP::findFreeVoice()
{
    // First, try to find a completely inactive voice
    for (auto& voice : voices_)
    {
        if (voice && !voice->isActive())
            return voice.get();
    }

    // If all voices are active, steal the oldest (first one)
    // In a more sophisticated implementation, we'd find the quietest voice
    if (voices_[0])
        return voices_[0].get();

    return nullptr;
}

NexSynthVoice* NexSynthDSP::findVoiceForNote(int midiNote)
{
    for (auto& voice : voices_)
    {
        if (voice && voice->isActive() && voice->getMidiNote() == midiNote)
            return voice.get();
    }
    return nullptr;
}

bool NexSynthDSP::writeJsonParameter(const char* name, double value, char* buffer, int& offset, int bufferSize) const
{
    char temp[128];
    int len = std::snprintf(temp, sizeof(temp), "\"%s\":%.6f", name, value);

    if (offset + len >= bufferSize)
        return false;

    std::memcpy(buffer + offset, temp, len);
    offset += len;
    return true;
}

bool NexSynthDSP::parseJsonParameter(const char* json, const char* param, double& value) const
{
    // Very simple JSON parsing (for production, use a proper JSON library)
    char search[128];
    std::snprintf(search, sizeof(search), "\"%s\":", param);

    const char* found = std::strstr(json, search);
    if (!found)
        return false;

    // Parse number after the colon
    found += std::strlen(search);
    value = std::atof(found);
    return true;
}

//==============================================================================
// Static Factory (No runtime registration for tvOS hardening)
//==============================================================================

// Pure DSP instruments are instantiated directly, not through dynamic factory
// This ensures tvOS compatibility (no static initialization, no global state)

} // namespace DSP
