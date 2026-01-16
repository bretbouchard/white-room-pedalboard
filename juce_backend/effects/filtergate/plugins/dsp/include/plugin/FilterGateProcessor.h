/*
  ==============================================================================

    FilterGateProcessor.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor wrapper for FilterGate effect

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "dsp/FilterGatePureDSP_v2.h"

using namespace DSP;

class FilterGateProcessor : public juce::AudioProcessor
{
public:
    FilterGateProcessor();
    ~FilterGateProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
#endif

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "FilterGate"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }

    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

private:
    FilterGateDSP filterGate;

    // AudioProcessorValueTreeState for parameter management
    std::unique_ptr<juce::AudioProcessorValueTreeState> parameters;

    // Parameter pointers
    std::atomic<float>* filterModeParam = nullptr;
    std::atomic<float>* frequencyParam = nullptr;
    std::atomic<float>* resonanceParam = nullptr;
    std::atomic<float>* gainParam = nullptr;

    std::atomic<float>* gateEnabledParam = nullptr;
    std::atomic<float>* gateThresholdParam = nullptr;
    std::atomic<float>* gateAttackParam = nullptr;
    std::atomic<float>* gateReleaseParam = nullptr;
    std::atomic<float>* gateRangeParam = nullptr;
    std::atomic<float>* triggerModeParam = nullptr;
    std::atomic<float>* manualControlParam = nullptr;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(FilterGateProcessor)
};
