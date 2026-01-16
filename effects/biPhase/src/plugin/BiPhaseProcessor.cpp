/*
  ==============================================================================

    BiPhaseProcessor.cpp
    Created: January 14, 2026
    Author: Bret Bouchard

    JUCE AudioProcessor implementation for Mu-Tron Bi-Phase

  ==============================================================================
*/

#include "plugin/BiPhaseProcessor.h"

//==============================================================================
BiPhaseProcessor::BiPhaseProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       ),
      parameters_ (*this, nullptr, juce::Identifier ("BiPhase"), createParameterLayout())
#endif
{
    // Register as listener for parameter changes
    parameters_.addParameterListener (ParameterIDs::rateA.toString(), this);
    parameters_.addParameterListener (ParameterIDs::depthA.toString(), this);
    parameters_.addParameterListener (ParameterIDs::feedbackA.toString(), this);
    parameters_.addParameterListener (ParameterIDs::rateB.toString(), this);
    parameters_.addParameterListener (ParameterIDs::depthB.toString(), this);
    parameters_.addParameterListener (ParameterIDs::feedbackB.toString(), this);

    setupParameters();
}

BiPhaseProcessor::~BiPhaseProcessor()
{
    // Remove listeners
    parameters_.removeParameterListener (ParameterIDs::rateA.toString(), this);
    parameters_.removeParameterListener (ParameterIDs::depthA.toString(), this);
    parameters_.removeParameterListener (ParameterIDs::feedbackA.toString(), this);
    parameters_.removeParameterListener (ParameterIDs::rateB.toString(), this);
    parameters_.removeParameterListener (ParameterIDs::depthB.toString(), this);
    parameters_.removeParameterListener (ParameterIDs::feedbackB.toString(), this);
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout BiPhaseProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::AudioProcessorParameter>> params;

    //==========================================================================
    // Phasor A Parameters
    //==========================================================================

    // Rate A: 0.1 Hz to 18 Hz (logarithmic)
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::rateA,
        "Rate A",
        juce::NormalisableRange<float> (0.1f, 18.0f, 0.0f, 0.3f),  // Logarithmic
        0.5f,
        "Hz",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value, 2); },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));

    // Depth A: 0% to 100%
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::depthA,
        "Depth A",
        juce::NormalisableRange<float> (0.0f, 1.0f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value * 100.0f, 0) + "%"; },
        [](const juce::String& text) { return text.getFloatValue() / 100.0f; }
    ));

    // Feedback A: 0% to 98%
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::feedbackA,
        "Feedback A",
        juce::NormalisableRange<float> (0.0f, 0.98f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value * 100.0f, 0) + "%"; },
        [](const juce::String& text) { return text.getFloatValue() / 100.0f; }
    ));

    // Shape A: Sine or Square
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        ParameterIDs::shapeA,
        "Shape A",
        getShapeChoices(),
        0  // Default: Sine
    ));

    // Source A: Generator 1, Generator 2, or Pedal
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        ParameterIDs::sourceA,
        "Source A",
        getSourceChoices(),
        0  // Default: Generator 1
    ));

    //==========================================================================
    // Phasor B Parameters
    //==========================================================================

    // Rate B: 0.1 Hz to 18 Hz (logarithmic)
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::rateB,
        "Rate B",
        juce::NormalisableRange<float> (0.1f, 18.0f, 0.0f, 0.3f),  // Logarithmic
        0.5f,
        "Hz",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value, 2); },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));

    // Depth B: 0% to 100%
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::depthB,
        "Depth B",
        juce::NormalisableRange<float> (0.0f, 1.0f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value * 100.0f, 0) + "%"; },
        [](const juce::String& text) { return text.getFloatValue() / 100.0f; }
    ));

    // Feedback B: 0% to 98%
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::feedbackB,
        "Feedback B",
        juce::NormalisableRange<float> (0.0f, 0.98f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value * 100.0f, 0) + "%"; },
        [](const juce::String& text) { return text.getFloatValue() / 100.0f; }
    ));

    // Shape B: Sine or Square
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        ParameterIDs::shapeB,
        "Shape B",
        getShapeChoices(),
        0  // Default: Sine
    ));

    // Source B: Generator 1, Generator 2, or Pedal
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        ParameterIDs::sourceB,
        "Source B",
        getSourceChoices(),
        0  // Default: Generator 1
    ));

    //==========================================================================
    // Routing Parameters
    //==========================================================================

    // Routing Mode: Parallel, Series, or Independent
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        ParameterIDs::routingMode,
        "Routing Mode",
        getRoutingChoices(),
        1  // Default: Series (Out A)
    ));

    // Sweep Sync: Normal or Reverse
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        ParameterIDs::sweepSync,
        "Sweep Sync",
        getSweepSyncChoices(),
        0  // Default: Normal
    ));

    //==========================================================================
    // Legacy Single-Phaser Parameters (for backward compatibility)
    //==========================================================================

    // Rate (alias for Rate A)
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::rate,
        "Rate",
        juce::NormalisableRange<float> (0.1f, 18.0f, 0.0f, 0.3f),  // Logarithmic
        0.5f,
        "Hz",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value, 2); },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));

    // Depth (alias for Depth A)
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::depth,
        "Depth",
        juce::NormalisableRange<float> (0.0f, 1.0f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value * 100.0f, 0) + "%"; },
        [](const juce::String& text) { return text.getFloatValue() / 100.0f; }
    ));

    // Feedback (alias for Feedback A)
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::feedback,
        "Feedback",
        juce::NormalisableRange<float> (0.0f, 0.98f),
        0.5f,
        "",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value * 100.0f, 0) + "%"; },
        [](const juce::String& text) { return text.getFloatValue() / 100.0f; }
    ));

    // Shape (alias for Shape A)
    params.push_back (std::make_unique<juce::AudioParameterChoice>(
        ParameterIDs::shape,
        "Shape",
        getShapeChoices(),
        0  // Default: Sine
    ));

    // Stereo Phase: 0 to 360 degrees
    params.push_back (std::make_unique<juce::AudioParameterFloat>(
        ParameterIDs::stereoPhase,
        "Stereo Phase",
        juce::NormalisableRange<float> (0.0f, 360.0f),
        0.0f,
        "°",
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int maxStringLength) { return juce::String (value, 0); },
        [](const juce::String& text) { return text.getFloatValue(); }
    ));

    return { params.begin(), params.end() };
}

//==============================================================================
void BiPhaseProcessor::setupParameters()
{
    // Get parameter pointers from APVTS
    rateAParam_ = parameters_.getRawParameterValue (ParameterIDs::rateA.toString());
    depthAParam_ = parameters_.getRawParameterValue (ParameterIDs::depthA.toString());
    feedbackAParam_ = parameters_.getRawParameterValue (ParameterIDs::feedbackA.toString());
    shapeAParam_ = parameters_.getParameter (ParameterIDs::shapeA.toString());
    sourceAParam_ = parameters_.getParameter (ParameterIDs::sourceA.toString());

    rateBParam_ = parameters_.getRawParameterValue (ParameterIDs::rateB.toString());
    depthBParam_ = parameters_.getRawParameterValue (ParameterIDs::depthB.toString());
    feedbackBParam_ = parameters_.getRawParameterValue (ParameterIDs::feedbackB.toString());
    shapeBParam_ = parameters_.getParameter (ParameterIDs::shapeB.toString());
    sourceBParam_ = parameters_.getParameter (ParameterIDs::sourceB.toString());

    routingModeParam_ = parameters_.getParameter (ParameterIDs::routingMode.toString());
    sweepSyncParam_ = parameters_.getParameter (ParameterIDs::sweepSync.toString());

    // Legacy single-phaser parameters
    rateParam_ = parameters_.getRawParameterValue (ParameterIDs::rate.toString());
    depthParam_ = parameters_.getRawParameterValue (ParameterIDs::depth.toString());
    feedbackParam_ = parameters_.getRawParameterValue (ParameterIDs::feedback.toString());
    shapeParam_ = parameters_.getParameter (ParameterIDs::shape.toString());
    stereoPhaseParam_ = parameters_.getRawParameterValue (ParameterIDs::stereoPhase.toString());
}

//==============================================================================
void BiPhaseProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    dsp_.prepare (sampleRate, samplesPerBlock);
}

void BiPhaseProcessor::releaseResources()
{
    dsp_.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool BiPhaseProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    // Only support stereo input/output
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    if (layouts.getMainInputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    return true;
}
#endif

void BiPhaseProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                     juce::MidiBuffer& midiMessages)
{
    juce::ignoreUnused (midiMessages);

    juce::ScopedNoDenormals noDenormals;

    // Check for valid buffer
    if (buffer.getNumChannels() < 2)
        return;

    // Get channel data
    auto* left = buffer.getWritePointer (0);
    auto* right = buffer.getWritePointer (1);

    // Update Phasor A parameters from APVTS
    if (rateAParam_ != nullptr)
        dsp_.setRate (*rateAParam_);

    if (depthAParam_ != nullptr)
        dsp_.setDepth (*depthAParam_);

    if (feedbackAParam_ != nullptr)
        dsp_.setFeedback (*feedbackAParam_);

    if (shapeAParam_ != nullptr)
        dsp_.setShape (static_cast<DSP::LFOShape> (shapeAParam_->getIndex()));

    // Update Phasor B parameters from APVTS
    if (rateBParam_ != nullptr)
        dsp_.setRateB (*rateBParam_);

    if (depthBParam_ != nullptr)
        dsp_.setDepthB (*depthBParam_);

    if (feedbackBParam_ != nullptr)
        dsp_.setFeedbackB (*feedbackBParam_);

    if (shapeBParam_ != nullptr)
        dsp_.setShapeB (static_cast<DSP::LFOShape> (shapeBParam_->getIndex()));

    // Update routing parameters
    if (routingModeParam_ != nullptr)
        dsp_.setRoutingMode (static_cast<DSP::RoutingMode> (routingModeParam_->getIndex()));

    if (sweepSyncParam_ != nullptr)
        dsp_.setSweepSync (static_cast<DSP::SweepSync> (sweepSyncParam_->getIndex()));

    // Process stereo through DSP
    dsp_.processStereo (left, right, buffer.getNumSamples());
}

//==============================================================================
juce::AudioProcessorEditor* BiPhaseProcessor::createEditor()
{
    // For now, return generic editor
    // TODO: Create custom BiPhaseEditor in Phase 4
    return new juce::GenericAudioProcessorEditor (*this);
}

bool BiPhaseProcessor::hasEditor() const
{
    return true;
}

//==============================================================================
const juce::String BiPhaseProcessor::getName() const
{
    return JucePlugin_Name;
}

bool BiPhaseProcessor::acceptsMidi() const
{
    #if JucePlugin_WantsMidiInput
        return true;
    #else
        return false;
    #endif
}

bool BiPhaseProcessor::producesMidi() const
{
    #if JucePlugin_ProducesMidiOutput
        return true;
    #else
        return false;
    #endif
}

bool BiPhaseProcessor::isMidiEffect() const
{
    #if JucePlugin_IsMidiEffect
        return true;
    #else
        return false;
    #endif
}

double BiPhaseProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int BiPhaseProcessor::getNumPrograms()
{
    return 1;  // NB: some hosts don't cope very well if you tell them there are 0 programs,
                // so this should be at least 1, even if you're not really implementing programs.
}

int BiPhaseProcessor::getCurrentProgram()
{
    return 0;
}

void BiPhaseProcessor::setCurrentProgram (int index)
{
    juce::ignoreUnused (index);
}

const juce::String BiPhaseProcessor::getProgramName (int index)
{
    juce::ignoreUnused (index);
    return {};
}

void BiPhaseProcessor::changeProgramName (int index, const juce::String& newName)
{
    juce::ignoreUnused (index, newName);
}

//==============================================================================
void BiPhaseProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    // Save preset
    auto state = parameters_.copyState();
    std::unique_ptr<juce::XmlElement> xml (state.createXml());
    copyXmlToBinary (*xml, destData);
}

void BiPhaseProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    // Load preset
    std::unique_ptr<juce::XmlElement> xmlState (getXmlFromBinary (data, sizeInBytes));

    if (xmlState != nullptr)
        if (xmlState->hasTagName (parameters_.state.getType()))
            parameters_.replaceState (juce::ValueTree::fromXml (*xmlState));
}

//==============================================================================
void BiPhaseProcessor::parameterChanged (const juce::String& parameterID, float newValue)
{
    juce::ignoreUnused (parameterID, newValue);
    // Parameters are updated in processBlock() for thread safety
    // This callback is available if needed for UI updates or other side effects
}

//==============================================================================
// This creates new instances of the plugin
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new BiPhaseProcessor();
}
