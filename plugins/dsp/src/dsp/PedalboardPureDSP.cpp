/*
  ==============================================================================

    PedalboardPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Modular pedalboard system implementation

  ==============================================================================
*/

#include "dsp/PedalboardPureDSP.h"
#include "../pedals/include/dsp/OverdrivePedalPureDSP.h"
#include "../pedals/include/dsp/FuzzPedalPureDSP.h"
#include "../pedals/include/dsp/ChorusPedalPureDSP.h"
#include "../pedals/include/dsp/DelayPedalPureDSP.h"
#include <algorithm>

namespace DSP {

//==============================================================================
// PedalboardPureDSP Implementation
//==============================================================================

PedalboardPureDSP::PedalboardPureDSP()
{
    // Reserve space for up to 8 pedals
    pedals_.reserve(8);
}

PedalboardPureDSP::~PedalboardPureDSP()
{
}

//==============================================================================
// GuitarPedalPureDSP Implementation
//==============================================================================

bool PedalboardPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // Prepare all pedals
    for (auto& slot : pedals_)
    {
        if (slot.pedal)
        {
            slot.pedal->prepare(sampleRate, blockSize);
        }
    }

    prepared_ = true;
    return true;
}

void PedalboardPureDSP::reset()
{
    // Reset all pedals
    for (auto& slot : pedals_)
    {
        if (slot.pedal)
        {
            slot.pedal->reset();
        }
    }
}

void PedalboardPureDSP::process(float** inputs, float** outputs,
                               int numChannels, int numSamples)
{
    // Apply global input level
    float inputBuffers[2][MAX_BLOCK_SIZE];

    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            inputBuffers[ch][i] = inputs[ch][i] * params_.inputLevel;
        }
    }

    // Process through pedal chain
    float* workingInputs[2] = {inputBuffers[0], inputBuffers[1]};
    float* workingOutputs[2] = {tempBuffer_[0], tempBuffer_[1]};

    for (auto& slot : pedals_)
    {
        if (slot.isEmpty() || slot.bypassed)
            continue;

        // Apply pedal input gain
        for (int ch = 0; ch < numChannels; ++ch)
        {
            for (int i = 0; i < numSamples; ++i)
            {
                workingInputs[ch][i] = workingInputs[ch][i] * slot.inputGain;
            }
        }

        // Process pedal
        slot.pedal->process(workingInputs, workingOutputs, numChannels, numSamples);

        // Apply pedal output gain and mix
        for (int ch = 0; ch < numChannels; ++ch)
        {
            for (int i = 0; i < numSamples; ++i)
            {
                float wet = workingOutputs[ch][i] * slot.outputGain * slot.mix;
                float dry = workingInputs[ch][i] * (1.0f - slot.mix);
                workingInputs[ch][i] = wet + dry;
            }
        }
    }

    // Copy to output with global output level
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            outputs[ch][i] = workingInputs[ch][i] * params_.outputLevel;
        }
    }
}

//==============================================================================
// Pedalboard Management
//==============================================================================

int PedalboardPureDSP::addPedal(int slotIndex, PedalType type)
{
    // Create pedal
    auto pedal = createPedal(type);
    if (!pedal)
        return -1;

    // Prepare pedal
    if (prepared_)
    {
        pedal->prepare(sampleRate_, blockSize_);
    }

    // Create slot
    PedalSlot slot;
    slot.pedal = std::move(pedal);
    slot.bypassed = false;
    slot.mix = 1.0f;
    slot.inputGain = 1.0f;
    slot.outputGain = 1.0f;

    // Insert at position
    if (slotIndex < 0 || slotIndex >= static_cast<int>(pedals_.size()))
    {
        pedals_.push_back(std::move(slot));
        return static_cast<int>(pedals_.size()) - 1;
    }
    else
    {
        pedals_.insert(pedals_.begin() + slotIndex, std::move(slot));
        return slotIndex;
    }
}

void PedalboardPureDSP::removePedal(int slotIndex)
{
    if (slotIndex >= 0 && slotIndex < static_cast<int>(pedals_.size()))
    {
        pedals_.erase(pedals_.begin() + slotIndex);
    }
}

void PedalboardPureDSP::movePedal(int fromIndex, int toIndex)
{
    if (fromIndex < 0 || fromIndex >= static_cast<int>(pedals_.size()) ||
        toIndex < 0 || toIndex >= static_cast<int>(pedals_.size()))
        return;

    if (fromIndex == toIndex)
        return;

    // Move pedal
    auto pedal = std::move(pedals_[fromIndex]);
    pedals_.erase(pedals_.begin() + fromIndex);

    if (toIndex > fromIndex)
        toIndex--;

    pedals_.insert(pedals_.begin() + toIndex, std::move(pedal));
}

void PedalboardPureDSP::swapPedals(int index1, int index2)
{
    if (index1 >= 0 && index1 < static_cast<int>(pedals_.size()) &&
        index2 >= 0 && index2 < static_cast<int>(pedals_.size()))
    {
        std::swap(pedals_[index1], pedals_[index2]);
    }
}

void PedalboardPureDSP::clear()
{
    pedals_.clear();
}

const PedalboardPureDSP::PedalSlot* PedalboardPureDSP::getPedalSlot(int index) const
{
    if (index >= 0 && index < static_cast<int>(pedals_.size()))
        return &pedals_[index];
    return nullptr;
}

PedalboardPureDSP::PedalSlot* PedalboardPureDSP::getPedalSlot(int index)
{
    if (index >= 0 && index < static_cast<int>(pedals_.size()))
        return &pedals_[index];
    return nullptr;
}

//==============================================================================
// Parameters
//==============================================================================

const GuitarPedalPureDSP::Parameter* PedalboardPureDSP::getParameter(int index) const
{
    static constexpr Parameter parameters[NUM_PARAMETERS] =
    {
        {"input_level", "Input Level", "dB", 0.0f, 2.0f, 1.0f, true, 0.01f},
        {"output_level", "Output Level", "dB", 0.0f, 2.0f, 1.0f, true, 0.01f}
    };

    if (index >= 0 && index < NUM_PARAMETERS)
        return &parameters[index];

    return nullptr;
}

float PedalboardPureDSP::getParameterValue(int index) const
{
    switch (index)
    {
        case InputLevel: return params_.inputLevel;
        case OutputLevel: return params_.outputLevel;
    }
    return 0.0f;
}

void PedalboardPureDSP::setParameterValue(int index, float value)
{
    value = clamp(value, 0.0f, 2.0f);

    switch (index)
    {
        case InputLevel: params_.inputLevel = value; break;
        case OutputLevel: params_.outputLevel = value; break;
    }
}

//==============================================================================
// Presets
//==============================================================================

const GuitarPedalPureDSP::Preset* PedalboardPureDSP::getPreset(int index) const
{
    if (index >= 0 && index < NUM_PRESETS)
        return &PEDALBOARD_PRESETS[index];

    return nullptr;
}

//==============================================================================
// Factory
//==============================================================================

std::unique_ptr<GuitarPedalPureDSP> PedalboardPureDSP::createPedal(PedalType type)
{
    switch (type)
    {
        case PedalType::Overdrive:
            return std::make_unique<OverdrivePedalPureDSP>();

        case PedalType::Fuzz:
            return std::make_unique<FuzzPedalPureDSP>();

        case PedalType::Chorus:
            return std::make_unique<ChorusPedalPureDSP>();

        case PedalType::Delay:
            return std::make_unique<DelayPedalPureDSP>();

        case PedalType::None:
        default:
            return nullptr;
    }
}

} // namespace DSP
