/*
  ==============================================================================

    BiPhaseProcessor.h
    Created: January 14, 2026
    Author: Bret Bouchard

    JUCE AudioProcessor for Mu-Tron Bi-Phase Phaser

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include "../../../include/dsp/BiPhasePureDSP_v2.h"
#include <atomic>
#include <memory>

//==============================================================================
// Parameter IDs
//==============================================================================

namespace ParameterIDs
{
    // Phasor A parameters
    static const juce::Identifier rateA       { "rateA" };
    static const juce::Identifier depthA      { "depthA" };
    static const juce::Identifier feedbackA   { "feedbackA" };
    static const juce::Identifier shapeA      { "shapeA" };
    static const juce::Identifier sourceA     { "sourceA" };

    // Phasor B parameters
    static const juce::Identifier rateB       { "rateB" };
    static const juce::Identifier depthB      { "depthB" };
    static const juce::Identifier feedbackB   { "feedbackB" };
    static const juce::Identifier shapeB      { "shapeB" };
    static const juce::Identifier sourceB     { "sourceB" };

    // Routing parameters
    static const juce::Identifier routingMode { "routingMode" };
    static const juce::Identifier sweepSync   { "sweepSync" };

    // Legacy single-phaser parameters (for backward compatibility)
    static const juce::Identifier rate        { "rate" };
    static const juce::Identifier depth       { "depth" };
    static const juce::Identifier feedback    { "feedback" };
    static const juce::Identifier shape       { "shape" };
    static const juce::Identifier stereoPhase { "stereoPhase" };
}

//==============================================================================
// Bi-Phase Audio Processor
//==============================================================================

class BiPhaseProcessor : public juce::AudioProcessor
                       , public juce::AudioProcessorValueTreeState::Listener
{
public:
    //==========================================================================
    // Constructor/Destructor
    //==========================================================================

    BiPhaseProcessor();
    ~BiPhaseProcessor() override;

    //==========================================================================
    // AudioProcessor Overrides
    //==========================================================================

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
#endif

    void processBlock (juce::AudioBuffer<float>& buffer,
                      juce::MidiBuffer& midiMessages) override;

    //==========================================================================
    // Editor
    //==========================================================================

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    //==========================================================================
    // Plugin Identification
    //==========================================================================

    const juce::String getName() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;

    //==========================================================================
    // State
    //==========================================================================

    double getTailLengthSeconds() const override;

    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram (int index) override;
    const juce::String getProgramName (int index) override;
    void changeProgramName (int index, const juce::String& newName) override;

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    //==========================================================================
    // Parameter Access
    //==========================================================================

    juce::AudioProcessorValueTreeState& getValueTreeState() { return parameters_; }
    const juce::AudioProcessorValueTreeState& getValueTreeState() const { return parameters_; }

    //==========================================================================
    // AudioProcessorValueTreeState::Listener
    //==========================================================================

    void parameterChanged (const juce::String& parameterID, float newValue) override;

private:
    //==========================================================================
    // Parameter Layout
    //==========================================================================

    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    //==========================================================================
    // Setup
    //==========================================================================

    void setupParameters();

    //==========================================================================
    // DSP Engine
    //==========================================================================

    DSP::BiPhaseDSP dsp_;

    //==========================================================================
    // Parameters
    //==========================================================================

    juce::AudioProcessorValueTreeState parameters_;

    // Phasor A parameter pointers
    const float* rateAParam_ = nullptr;
    const float* depthAParam_ = nullptr;
    const float* feedbackAParam_ = nullptr;
    juce::AudioProcessorParameter* shapeAParam_ = nullptr;
    juce::AudioProcessorParameter* sourceAParam_ = nullptr;

    // Phasor B parameter pointers
    const float* rateBParam_ = nullptr;
    const float* depthBParam_ = nullptr;
    const float* feedbackBParam_ = nullptr;
    juce::AudioProcessorParameter* shapeBParam_ = nullptr;
    juce::AudioProcessorParameter* sourceBParam_ = nullptr;

    // Routing parameter pointers
    juce::AudioProcessorParameter* routingModeParam_ = nullptr;
    juce::AudioProcessorParameter* sweepSyncParam_ = nullptr;

    // Legacy parameter pointers (single phaser mode)
    const float* rateParam_ = nullptr;
    const float* depthParam_ = nullptr;
    const float* feedbackParam_ = nullptr;
    juce::AudioProcessorParameter* shapeParam_ = nullptr;
    const float* stereoPhaseParam_ = nullptr;

    //==========================================================================
    // Choice Parameter Strings
    //==========================================================================

    static juce::StringArray getShapeChoices()      { return { "Sine", "Square" }; }
    static juce::StringArray getSourceChoices()     { return { "Generator 1", "Generator 2", "Pedal" }; }
    static juce::StringArray getRoutingChoices()    { return { "Parallel (In A)", "Series (Out A)", "Independent (In B)" }; }
    static juce::StringArray getSweepSyncChoices()  { return { "Normal", "Reverse" }; }

    //==========================================================================

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (BiPhaseProcessor)
};
