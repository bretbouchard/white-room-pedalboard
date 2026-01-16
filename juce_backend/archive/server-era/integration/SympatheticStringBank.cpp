/*
  ==============================================================================

   SympatheticStringBank.cpp
   Sympathetic string resonance implementation for Aether String v2

  ==============================================================================
*/

#include "include/dsp/SympatheticStringBank.h"
#include "../../include/dsp/KaneMarcoAetherStringDSP.h"
#include <cmath>

//==============================================================================
SympatheticStringBank::SympatheticStringBank() = default;

SympatheticStringBank::~SympatheticStringBank() = default;

//==============================================================================
void SympatheticStringBank::prepare(double sampleRate, const SympatheticStringConfig& newConfig)
{
    sr = sampleRate;
    config = newConfig;

    // Clear existing strings
    sympatheticStrings.clear();

    // Create sympathetic strings
    if (!config.enabled)
        return;

    sympatheticStrings.reserve(config.count);

    for (int i = 0; i < config.count; ++i)
    {
        auto string = std::make_unique<WaveguideString>();
        string->prepare(sampleRate);

        // Set very light damping (long sustain)
        string->setDamping(0.999f * config.dampingMultiplier);

        sympatheticStrings.push_back(std::move(string));
    }

    // Set tuning
    switch (config.tuning)
    {
        case SympatheticStringConfig::TuningMode::Harmonic:
            initializeHarmonicTuning();
            break;

        case SympatheticStringConfig::TuningMode::Drone:
            initializeDroneTuning();
            break;

        case SympatheticStringConfig::TuningMode::Custom:
            initializeCustomTuning();
            break;
    }
}

void SympatheticStringBank::reset()
{
    for (auto& string : sympatheticStrings)
        string->reset();

    lastBridgeEnergy = 0.0f;
}

//==============================================================================
void SympatheticStringBank::exciteFromBridge(float bridgeEnergy)
{
    // Excite all sympathetic strings from bridge energy
    // Use a simple noise burst scaled by bridge energy and coupling

    juce::AudioBuffer<float> exciter(1, 10);  // 10-sample exciter
    exciter.clear();

    // Create simple exciter
    float energy = std::abs(bridgeEnergy) * config.couplingGain;

    for (int i = 0; i < 10; ++i)
    {
        float envelope = 1.0f - (static_cast<float>(i) / 10.0f);
        exciter.setSample(0, i, envelope * energy);
    }

    // Excite all strings
    for (auto& string : sympatheticStrings)
    {
        string->excite(exciter, 1.0f);
    }
}

float SympatheticStringBank::processSample()
{
    // Sum output from all sympathetic strings
    float output = 0.0f;

    for (auto& string : sympatheticStrings)
    {
        output += string->processSample();
    }

    // Normalize output
    if (!sympatheticStrings.empty())
        output /= static_cast<float>(sympatheticStrings.size());

    return output;
}

//==============================================================================
void SympatheticStringBank::setTuningMode(SympatheticStringConfig::TuningMode mode)
{
    config.tuning = mode;

    // Re-initialize with new tuning
    prepare(sr, config);
}

void SympatheticStringBank::setCouplingGain(float gain)
{
    config.couplingGain = juce::jlimit(0.0f, 1.0f, gain);
}

void SympatheticStringBank::setDampingMultiplier(float multiplier)
{
    config.dampingMultiplier = juce::jlimit(0.5f, 4.0f, multiplier);

    // Update damping for all strings
    for (auto& string : sympatheticStrings)
    {
        string->setDamping(0.999f * config.dampingMultiplier);
    }
}

//==============================================================================
void SympatheticStringBank::initializeHarmonicTuning()
{
    // Harmonic tuning: octaves, fifths, thirds
    // Based on a fundamental (e.g., A 220 Hz)

    const float fundamental = 220.0f;
    const float ratios[] = {
        2.0f,    // Octave
        3.0f,    // Fifth (octave up)
        4.0f,    // Octave (2 octaves up)
        5.0f,    // Third (2 octaves up)
        6.0f,    // Fifth (2 octaves up)
        8.0f     // Octave (3 octaves up)
    };

    for (size_t i = 0; i < sympatheticStrings.size() && i < 6; ++i)
    {
        sympatheticStrings[i]->setFrequency(fundamental * ratios[i]);
    }

    // Fill remaining strings with octaves
    for (size_t i = 6; i < sympatheticStrings.size(); ++i)
    {
        int octave = static_cast<int>(i) / 6 + 3;
        sympatheticStrings[i]->setFrequency(fundamental * static_cast<float>(std::pow(2, octave)));
    }
}

void SympatheticStringBank::initializeDroneTuning()
{
    // Drone tuning: fixed drone notes
    // Use provided drone notes or defaults

    if (config.droneNotes.empty())
    {
        // Default drone notes: A2, E3, A3, E4, A4, E5
        const float defaultDrones[] = {110.0f, 164.8f, 220.0f, 329.6f, 440.0f, 659.2f};

        for (size_t i = 0; i < sympatheticStrings.size() && i < 6; ++i)
        {
            sympatheticStrings[i]->setFrequency(defaultDrones[i]);
        }
    }
    else
    {
        // Use provided drone notes
        for (size_t i = 0; i < sympatheticStrings.size() && i < config.droneNotes.size(); ++i)
        {
            sympatheticStrings[i]->setFrequency(config.droneNotes[i]);
        }
    }
}

void SympatheticStringBank::initializeCustomTuning()
{
    // Custom tuning: user-defined frequencies
    if (config.customTuning.empty())
    {
        // Fall back to harmonic if no custom tuning provided
        initializeHarmonicTuning();
        return;
    }

    for (size_t i = 0; i < sympatheticStrings.size() && i < config.customTuning.size(); ++i)
    {
        sympatheticStrings[i]->setFrequency(config.customTuning[i]);
    }

    // Fill remaining with octave repeats
    for (size_t i = config.customTuning.size(); i < sympatheticStrings.size(); ++i)
    {
        int octave = static_cast<int>(i) / static_cast<int>(config.customTuning.size());
        sympatheticStrings[i]->setFrequency(config.customTuning[i % config.customTuning.size()] *
                                              static_cast<float>(std::pow(2, octave)));
    }
}
