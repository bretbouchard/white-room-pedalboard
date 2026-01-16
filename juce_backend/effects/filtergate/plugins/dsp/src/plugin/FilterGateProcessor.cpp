/*
  ==============================================================================

    FilterGateProcessor.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor implementation for FilterGate effect

  ==============================================================================
*/

#include "plugin/FilterGateProcessor.h"
#include <juce_audio_processors/juce_audio_processors.h>

//==============================================================================
// Constructor
//==============================================================================

FilterGateProcessor::FilterGateProcessor()
{
    // Initialize parameter layout
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    // Filter parameters
    layout.add(std::make_unique<juce::AudioParameterChoice>(
        "filterMode",
        "Filter Mode",
        juce::StringArray {"LowPass", "HighPass", "BandPass", "Notch", "Peak", "Bell", "HighShelf", "LowShelf"},
        0  // LowPass
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "frequency",
        "Frequency",
        juce::NormalisableRange<float>(20.0f, 20000.0f, 0.0f, 0.5f),
        1000.0f,
        "Hz"
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "resonance",
        "Resonance",
        juce::NormalisableRange<float>(0.0f, 2.0f),
        0.7f
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "gain",
        "Gain",
        juce::NormalisableRange<float>(-24.0f, 24.0f),
        0.0f,
        "dB"
    ));

    // Gate parameters
    layout.add(std::make_unique<juce::AudioParameterBool>(
        "gateEnabled",
        "Gate Enabled",
        true
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "gateThreshold",
        "Gate Threshold",
        juce::NormalisableRange<float>(-60.0f, 0.0f),
        -24.0f,
        "dB"
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "gateAttack",
        "Gate Attack",
        juce::NormalisableRange<float>(0.1f, 100.0f),
        5.0f,
        "ms"
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "gateRelease",
        "Gate Release",
        juce::NormalisableRange<float>(10.0f, 1000.0f),
        50.0f,
        "ms"
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "gateRange",
        "Gate Range",
        juce::NormalisableRange<float>(-60.0f, 0.0f),
        -24.0f,
        "dB"
    ));

    layout.add(std::make_unique<juce::AudioParameterChoice>(
        "triggerMode",
        "Trigger Mode",
        juce::StringArray {"Sidechain", "ADSR", "LFO", "Velocity", "Manual"},
        4  // Manual
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "manualControl",
        "Manual Control",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        1.0f
    ));

    // Create parameter tree (move layout to avoid copy)
    parameters = std::make_unique<juce::AudioProcessorValueTreeState>(
        *this,
        nullptr,
        "FilterGateParameters",
        std::move(layout)
    );

    // Get parameter pointers
    filterModeParam = parameters->getRawParameterValue("filterMode");
    frequencyParam = parameters->getRawParameterValue("frequency");
    resonanceParam = parameters->getRawParameterValue("resonance");
    gainParam = parameters->getRawParameterValue("gain");

    gateEnabledParam = parameters->getRawParameterValue("gateEnabled");
    gateThresholdParam = parameters->getRawParameterValue("gateThreshold");
    gateAttackParam = parameters->getRawParameterValue("gateAttack");
    gateReleaseParam = parameters->getRawParameterValue("gateRelease");
    gateRangeParam = parameters->getRawParameterValue("gateRange");
    triggerModeParam = parameters->getRawParameterValue("triggerMode");
    manualControlParam = parameters->getRawParameterValue("manualControl");
}

FilterGateProcessor::~FilterGateProcessor()
{
}

//==============================================================================
// AudioProcessor overrides
//==============================================================================

void FilterGateProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    filterGate.prepare(sampleRate, samplesPerBlock);
}

void FilterGateProcessor::releaseResources()
{
    filterGate.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool FilterGateProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    // Support stereo only
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    if (layouts.getMainInputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    return true;
}
#endif

void FilterGateProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                       juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear any output channels that don't contain input data
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    // Update parameters from JUCE parameters
    int filterModeIndex = static_cast<int>(filterModeParam->load());
    filterGate.setFilterMode(static_cast<FilterMode>(filterModeIndex));
    filterGate.setFrequency(frequencyParam->load());
    filterGate.setResonance(resonanceParam->load());
    filterGate.setGain(gainParam->load());

    filterGate.setGateEnabled(gateEnabledParam->load() > 0.5f);
    filterGate.setGateThreshold(gateThresholdParam->load());
    filterGate.setGateAttack(gateAttackParam->load());
    filterGate.setGateRelease(gateReleaseParam->load());
    filterGate.setGateRange(gateRangeParam->load());

    int triggerModeIndex = static_cast<int>(triggerModeParam->load());
    filterGate.setTriggerMode(static_cast<GateTriggerMode>(triggerModeIndex));
    filterGate.setManualControl(manualControlParam->load());

    // Process audio
    if (totalNumInputChannels >= 2 && totalNumOutputChannels >= 2)
    {
        float* left = buffer.getWritePointer(0);
        float* right = buffer.getWritePointer(1);
        int numSamples = buffer.getNumSamples();

        filterGate.processStereo(left, right, numSamples);
    }
}

juce::AudioProcessorEditor* FilterGateProcessor::createEditor()
{
    // Generic editor for now - can be replaced with custom UI later
    return new juce::GenericAudioProcessorEditor(*this);
}

void FilterGateProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    // Save state
    auto state = parameters->copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void FilterGateProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    // Restore state
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));

    if (xmlState != nullptr)
    {
        if (xmlState->hasTagName(parameters->state.getType()))
        {
            parameters->replaceState(juce::ValueTree::fromXml(*xmlState));
        }
    }
}

//==============================================================================
// Plugin creation function
//==============================================================================

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new FilterGateProcessor();
}
