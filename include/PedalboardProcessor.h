/*
==============================================================================
White Room Pedalboard Processor
==============================================================================

A virtual pedalboard plugin that allows users to chain multiple guitar
effects pedals in any order.

Author: Bret Bouchard
Version: 1.0.0
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <nlohmann/json.hpp>

#include "dsp/GuitarPedalPureDSP.h"
#include "dsp/VolumePedalPureDSP.h"
#include "dsp/FuzzPedalPureDSP.h"
#include "dsp/OverdrivePedalPureDSP.h"
#include "dsp/CompressorPedalPureDSP.h"
#include "dsp/EQPedalPureDSP.h"
#include "dsp/NoiseGatePedalPureDSP.h"
#include "dsp/ChorusPedalPureDSP.h"
#include "dsp/DelayPedalPureDSP.h"
#include "dsp/ReverbPedalPureDSP.h"
// #include "dsp/BiPhasePedalPureDSP.h"  // TODO: Fix BiPhaseDSP linking issues

using namespace DSP;

//==============================================================================
/**
    Represents a single pedal instance in the pedalboard
*/
class PedalInstance
{
public:
    PedalInstance(GuitarPedalPureDSP* pedal, const std::string& name)
        : dspPedal(pedal), pedalName(name), bypassed(false)
    {
    }

    ~PedalInstance()
    {
        // Note: We don't own the dspPedal pointer, it's managed by the pedalboard
    }

    void process(float** inputs, float** outputs, int numChannels, int numSamples)
    {
        if (bypassed)
        {
            // Just copy input to output
            for (int ch = 0; ch < numChannels; ++ch)
            {
                std::copy(inputs[ch], inputs[ch] + numSamples, outputs[ch]);
            }
        }
        else
        {
            // Process through DSP pedal
            dspPedal->process(inputs, outputs, numChannels, numSamples);
        }
    }

    void setBypass(bool bypass)
    {
        bypassed = bypass;
    }

    bool isBypassed() const { return bypassed; }

    std::string getName() const { return pedalName; }

    GuitarPedalPureDSP* getDSP() { return dspPedal; }

    nlohmann::json getParameters() const
    {
        nlohmann::json params;
        params["bypassed"] = bypassed;
        params["parameters"] = nlohmann::json::array();

        for (int i = 0; i < dspPedal->getNumParameters(); ++i)
        {
            nlohmann::json param;
            param["index"] = i;

            // Get parameter info
            const auto* paramInfo = dspPedal->getParameter(i);
            if (paramInfo)
            {
                param["name"] = paramInfo->name;
                param["value"] = dspPedal->getParameterValue(i);
            }

            params["parameters"].push_back(param);
        }

        return params;
    }

    void setParameters(const nlohmann::json& params)
    {
        if (params.contains("bypassed"))
        {
            bypassed = params["bypassed"];
        }

        if (params.contains("parameters"))
        {
            for (const auto& param : params["parameters"])
            {
                int index = param["index"];
                float value = param["value"];
                dspPedal->setParameterValue(index, value);
            }
        }
    }

private:
    GuitarPedalPureDSP* dspPedal;
    std::string pedalName;
    bool bypassed;
};

//==============================================================================
/**
    Main plugin processor for the pedalboard
*/
class PedalboardProcessor : public juce::AudioProcessor
{
public:
    //==============================================================================
    PedalboardProcessor();
    ~PedalboardProcessor() override;

    //==============================================================================
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==============================================================================
    const juce::String getName() const override { return "White Room Pedalboard"; }

    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }

    double getTailLengthSeconds() const override { return 0.0; }

    //==============================================================================
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int index) override {}
    const juce::String getProgramName(int index) override { return {}; }
    void changeProgramName(int index, const juce::String& newName) override {}

    //==============================================================================
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==============================================================================
    // Pedalboard management
    void addPedal(const std::string& pedalType, int position = -1);
    void removePedal(int position);
    void movePedal(int fromPosition, int toPosition);

    int getNumPedals() const { return pedalChain.size(); }
    PedalInstance* getPedal(int index) { return pedalChain[index].get(); }

    // Preset management
    void savePreset(const std::string& presetName);
    void loadPreset(const std::string& presetName);

    // Scene management
    void saveScene(int sceneNumber, const std::string& sceneName);
    void loadScene(int sceneNumber);

private:
    //==============================================================================
    // Create a pedal instance by type
    std::unique_ptr<PedalInstance> createPedalInstance(const std::string& pedalType);

    // Pedal chain
    std::vector<std::unique_ptr<PedalInstance>> pedalChain;

    // All available pedal DSP instances (shared across pedalboard)
    std::unique_ptr<VolumePedalPureDSP> volumeDSP;
    std::unique_ptr<FuzzPedalPureDSP> fuzzDSP;
    std::unique_ptr<OverdrivePedalPureDSP> overdriveDSP;
    std::unique_ptr<CompressorPedalPureDSP> compressorDSP;
    std::unique_ptr<EQPedalPureDSP> eqDSP;
    std::unique_ptr<NoiseGatePedalPureDSP> noiseGateDSP;
    std::unique_ptr<ChorusPedalPureDSP> chorusDSP;
    std::unique_ptr<DelayPedalPureDSP> delayDSP;
    std::unique_ptr<ReverbPedalPureDSP> reverbDSP;
    // std::unique_ptr<BiPhasePedalPureDSP> phaserDSP;  // TODO: Fix BiPhaseDSP linking issues

    // Global parameters
    float inputLevel = 1.0f;
    float outputLevel = 1.0f;
    float dryWetMix = 1.0f; // 0.0 = dry, 1.0 = wet
    float globalTempo = 120.0f;

    // Scene storage (8 scenes)
    std::array<nlohmann::json, 8> scenes;

    // Current preset
    std::string currentPresetName = "Default";

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PedalboardProcessor)
};
