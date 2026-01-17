/*
 ==============================================================================
    MonumentReverbProcessor.h
    JUCE Processor for Monument Reverb Effect

 ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "MonumentReverbPureDSP.h"

//==============================================================================
/**
    JUCE AudioProcessor for Monument Reverb Effect
*/
class MonumentReverbProcessor  : public juce::AudioProcessor
{
public:
    //==============================================================================
    MonumentReverbProcessor();
    ~MonumentReverbProcessor() override;

    //==============================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==============================================================================
    const juce::String getName() const override { return "Monument"; }

    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 5.0; }

    //==============================================================================
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    //==============================================================================
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

private:
    //==============================================================================
    // Parameter IDs
    struct ParameterIDs
    {
        static const juce::ParameterID wet;
        static const juce::ParameterID dry;
        static const juce::ParameterID scale;
        static const juce::ParameterID air;

        static const juce::ParameterID surface;
        static const juce::ParameterID hardness;
        static const juce::ParameterID roughness;
        static const juce::ParameterID groundWetness;
        static const juce::ParameterID height;

        static const juce::ParameterID density;
        static const juce::ParameterID vegWetness;
        static const juce::ParameterID jitter;

        static const juce::ParameterID horizonEnabled;
        static const juce::ParameterID horizonDelay;

        static const juce::ParameterID tailEnabled;
        static const juce::ParameterID tailDecay;
    };

    //==============================================================================
    // Parameter layout
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    // Get surface choices for choice parameter
    static juce::StringArray getSurfaceChoices();

    //==============================================================================
    // DSP Engine
    schill::monument::MonumentReverbPureDSP dsp_;

    // Parameter state
    juce::AudioProcessorValueTreeState parameters_;

    // Pointer cache (updated in processBlock)
    std::atomic<float>* wetParam_ = nullptr;
    std::atomic<float>* dryParam_ = nullptr;
    std::atomic<float>* scaleParam_ = nullptr;
    std::atomic<float>* airParam_ = nullptr;

    std::atomic<float>* surfaceParam_ = nullptr;
    std::atomic<float>* hardnessParam_ = nullptr;
    std::atomic<float>* roughnessParam_ = nullptr;
    std::atomic<float>* groundWetnessParam_ = nullptr;
    std::atomic<float>* heightParam_ = nullptr;

    std::atomic<float>* densityParam_ = nullptr;
    std::atomic<float>* vegWetnessParam_ = nullptr;
    std::atomic<float>* jitterParam_ = nullptr;

    std::atomic<float>* horizonEnabledParam_ = nullptr;
    std::atomic<float>* horizonDelayParam_ = nullptr;

    std::atomic<float>* tailEnabledParam_ = nullptr;
    std::atomic<float>* tailDecayParam_ = nullptr;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MonumentReverbProcessor)
};
