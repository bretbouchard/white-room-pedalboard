/*
  ==============================================================================

    FarFarAwayProcessor.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor for Far Far Away distance effect

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "FarFieldPureDSP.h"

//==============================================================================
// Audio Processor
//==============================================================================

class FarFarAwayProcessor : public juce::AudioProcessor
{
public:
    //==========================================================================
    FarFarAwayProcessor();
    ~FarFarAwayProcessor() override;

    //==========================================================================
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
#endif

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    //==========================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==========================================================================
    const juce::String getName() const override { return "Far Far Away"; }

    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 2.0; }

    //==========================================================================
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int index) override {}
    const juce::String getProgramName(int index) override { return {}; }
    void changeProgramName(int index, const juce::String& newName) override {}

    //==========================================================================
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

private:
    //==========================================================================
    // DSP Engine
    //==========================================================================

    farfield::FarField farField;

    //==========================================================================
    // Parameters (JUCE APVTS)
    //==========================================================================

    std::unique_ptr<juce::AudioProcessorValueTreeState> parameters;

    // Parameter pointers
    std::atomic<float>* distanceParam = nullptr;
    std::atomic<float>* maxDistanceParam = nullptr;
    std::atomic<float>* airAmountParam = nullptr;
    std::atomic<float>* softenParam = nullptr;
    std::atomic<float>* widthParam = nullptr;
    std::atomic<float>* levelParam = nullptr;
    std::atomic<float>* nearFadeParam = nullptr;
    std::atomic<float>* farFadeParam = nullptr;
    std::atomic<float>* sourceVelocityParam = nullptr;
    std::atomic<float>* dopplerAmountParam = nullptr;

    //==========================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(FarFarAwayProcessor)
};
