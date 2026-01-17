/*
  ==============================================================================

    FarFarAwayProcessor.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor implementation for Far Far Away effect

  ==============================================================================
*/

#include "FarFarAwayProcessor.h"
#include <juce_audio_processors/juce_audio_processors.h>

//==============================================================================
// Constructor
//==============================================================================

FarFarAwayProcessor::FarFarAwayProcessor()
    : juce::AudioProcessor(BusesProperties()
        .withInput("Input", juce::AudioChannelSet::stereo(), true)
        .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
    // Initialize parameter layout
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    // Distance parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("distance", 1),
        "Distance",
        juce::NormalisableRange<float>(0.0f, 300.0f, 0.1f, 0.3f),
        10.0f,
        "m"
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("maxDistance", 1),
        "Max Distance",
        juce::NormalisableRange<float>(1.0f, 500.0f, 1.0f),
        300.0f,
        "m"
    ));

    // Air absorption
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("airAmount", 1),
        "Air Amount",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        0.7f
    ));

    // Transient softening
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("soften", 1),
        "Soften",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        0.5f
    ));

    // Stereo width
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("width", 1),
        "Width",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        1.0f
    ));

    // Output level
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("level", 1),
        "Level",
        juce::NormalisableRange<float>(0.0f, 2.0f),
        1.0f
    ));

    // Near/far fade
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("nearFade", 1),
        "Near Fade",
        juce::NormalisableRange<float>(0.0f, 20.0f),
        5.0f,
        "m"
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("farFade", 1),
        "Far Fade",
        juce::NormalisableRange<float>(1.0f, 100.0f),
        20.0f,
        "m"
    ));

    // Doppler parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("sourceVelocity", 1),
        "Source Velocity",
        juce::NormalisableRange<float>(-80.0f, 80.0f),
        0.0f,
        "m/s"
    ));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID("dopplerAmount", 1),
        "Doppler Amount",
        juce::NormalisableRange<float>(0.0f, 1.0f),
        0.0f
    ));

    // Create parameter tree (move layout to avoid copy)
    parameters = std::make_unique<juce::AudioProcessorValueTreeState>(
        *this,
        nullptr,
        juce::Identifier("FarFarAwayParameters"),
        std::move(layout)
    );

    // Get parameter pointers
    distanceParam = parameters->getRawParameterValue("distance");
    maxDistanceParam = parameters->getRawParameterValue("maxDistance");
    airAmountParam = parameters->getRawParameterValue("airAmount");
    softenParam = parameters->getRawParameterValue("soften");
    widthParam = parameters->getRawParameterValue("width");
    levelParam = parameters->getRawParameterValue("level");
    nearFadeParam = parameters->getRawParameterValue("nearFade");
    farFadeParam = parameters->getRawParameterValue("farFade");
    sourceVelocityParam = parameters->getRawParameterValue("sourceVelocity");
    dopplerAmountParam = parameters->getRawParameterValue("dopplerAmount");
}

FarFarAwayProcessor::~FarFarAwayProcessor()
{
}

//==============================================================================
// AudioProcessor overrides
//==============================================================================

void FarFarAwayProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    farField.prepare(sampleRate, samplesPerBlock);
}

void FarFarAwayProcessor::releaseResources()
{
    farField.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool FarFarAwayProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    // Support stereo only
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    if (layouts.getMainInputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    return true;
}
#endif

void FarFarAwayProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                       juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear any output channels that don't contain input data
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    // Update parameters from JUCE parameters
    farField.setDistance(distanceParam->load());
    farField.setMaxDistance(maxDistanceParam->load());
    farField.setAirAmount(airAmountParam->load());
    farField.setSoften(softenParam->load());
    farField.setWidth(widthParam->load());
    farField.setLevel(levelParam->load());
    farField.setNearFade(nearFadeParam->load());
    farField.setFarFade(farFadeParam->load());
    farField.setSourceVelocity(sourceVelocityParam->load());
    farField.setDopplerAmount(dopplerAmountParam->load());

    // Process audio
    if (totalNumInputChannels >= 2 && totalNumOutputChannels >= 2)
    {
        float* left = buffer.getWritePointer(0);
        float* right = buffer.getWritePointer(1);
        int numSamples = buffer.getNumSamples();

        farField.processStereo(left, right, numSamples);
    }
}

juce::AudioProcessorEditor* FarFarAwayProcessor::createEditor()
{
    // Generic editor for now - can be replaced with custom UI later
    return new juce::GenericAudioProcessorEditor(*this);
}

void FarFarAwayProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    // Save state
    auto state = parameters->copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void FarFarAwayProcessor::setStateInformation(const void* data, int sizeInBytes)
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
    return new FarFarAwayProcessor();
}
