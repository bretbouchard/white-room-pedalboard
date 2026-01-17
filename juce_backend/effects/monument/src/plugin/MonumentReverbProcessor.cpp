/*
 ==============================================================================
    MonumentReverbProcessor.cpp
    JUCE Processor for Monument Reverb Effect

 ==============================================================================
*/

#include "MonumentReverbProcessor.h"

//==============================================================================
// Parameter ID Definitions
//==============================================================================

const juce::ParameterID MonumentReverbProcessor::ParameterIDs::wet { "wet", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::dry { "dry", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::scale { "scale", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::air { "air", 1 };

const juce::ParameterID MonumentReverbProcessor::ParameterIDs::surface { "surface", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::hardness { "hardness", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::roughness { "roughness", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::groundWetness { "groundWetness", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::height { "height", 1 };

const juce::ParameterID MonumentReverbProcessor::ParameterIDs::density { "density", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::vegWetness { "vegWetness", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::jitter { "jitter", 1 };

const juce::ParameterID MonumentReverbProcessor::ParameterIDs::horizonEnabled { "horizonEnabled", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::horizonDelay { "horizonDelay", 1 };

const juce::ParameterID MonumentReverbProcessor::ParameterIDs::tailEnabled { "tailEnabled", 1 };
const juce::ParameterID MonumentReverbProcessor::ParameterIDs::tailDecay { "tailDecay", 1 };

//==============================================================================
// Constructor/Destructor
//==============================================================================

MonumentReverbProcessor::MonumentReverbProcessor()
    : AudioProcessor (BusesProperties()
        .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
        .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
    , parameters_ (*this, nullptr, juce::Identifier ("Monument"), createParameterLayout())
{
    // Cache parameter pointers
    wetParam_ = parameters_.getRawParameterValue (ParameterIDs::wet.getParamID());
    dryParam_ = parameters_.getRawParameterValue (ParameterIDs::dry.getParamID());
    scaleParam_ = parameters_.getRawParameterValue (ParameterIDs::scale.getParamID());
    airParam_ = parameters_.getRawParameterValue (ParameterIDs::air.getParamID());

    surfaceParam_ = parameters_.getRawParameterValue (ParameterIDs::surface.getParamID());
    hardnessParam_ = parameters_.getRawParameterValue (ParameterIDs::hardness.getParamID());
    roughnessParam_ = parameters_.getRawParameterValue (ParameterIDs::roughness.getParamID());
    groundWetnessParam_ = parameters_.getRawParameterValue (ParameterIDs::groundWetness.getParamID());
    heightParam_ = parameters_.getRawParameterValue (ParameterIDs::height.getParamID());

    densityParam_ = parameters_.getRawParameterValue (ParameterIDs::density.getParamID());
    vegWetnessParam_ = parameters_.getRawParameterValue (ParameterIDs::vegWetness.getParamID());
    jitterParam_ = parameters_.getRawParameterValue (ParameterIDs::jitter.getParamID());

    horizonEnabledParam_ = parameters_.getRawParameterValue (ParameterIDs::horizonEnabled.getParamID());
    horizonDelayParam_ = parameters_.getRawParameterValue (ParameterIDs::horizonDelay.getParamID());

    tailEnabledParam_ = parameters_.getRawParameterValue (ParameterIDs::tailEnabled.getParamID());
    tailDecayParam_ = parameters_.getRawParameterValue (ParameterIDs::tailDecay.getParamID());
}

MonumentReverbProcessor::~MonumentReverbProcessor()
{
}

//==============================================================================
// Parameter Layout
//==============================================================================

juce::AudioProcessorValueTreeState::ParameterLayout
MonumentReverbProcessor::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    using namespace juce;
    using namespace schill::monument::Parameters;

    //==========================================================================
    // Master Parameters
    //==========================================================================

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::wet,
        "Wet",
        NormalisableRange<float> (wetMin, wetMax),
        wetDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::dry,
        "Dry",
        NormalisableRange<float> (dryMin, dryMax),
        dryDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::scale,
        "Scale",
        NormalisableRange<float> (scaleMin, scaleMax),
        scaleDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::air,
        "Air",
        NormalisableRange<float> (airMin, airMax),
        airDefault
    ));

    //==========================================================================
    // Ground Parameters
    //==========================================================================

    layout.add (std::make_unique<AudioParameterChoice>(
        ParameterIDs::surface,
        "Surface",
        getSurfaceChoices(),
        surfaceDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::hardness,
        "Hardness",
        NormalisableRange<float> (hardnessMin, hardnessMax),
        hardnessDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::roughness,
        "Roughness",
        NormalisableRange<float> (roughnessMin, roughnessMax),
        roughnessDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::groundWetness,
        "Ground Wetness",
        NormalisableRange<float> (groundWetnessMin, groundWetnessMax),
        groundWetnessDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::height,
        "Source Height",
        NormalisableRange<float> (heightMin, heightMax),
        heightDefault
    ));

    //==========================================================================
    // Vegetation Parameters
    //==========================================================================

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::density,
        "Density",
        NormalisableRange<float> (densityMin, densityMax),
        densityDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::vegWetness,
        "Vegetation Wetness",
        NormalisableRange<float> (vegWetnessMin, vegWetnessMax),
        vegWetnessDefault
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::jitter,
        "Jitter",
        NormalisableRange<float> (jitterMin, jitterMax),
        jitterDefault
    ));

    //==========================================================================
    // Horizon Echo Parameters
    //==========================================================================

    layout.add (std::make_unique<AudioParameterBool>(
        ParameterIDs::horizonEnabled,
        "Horizon Enabled",
        horizonEnabledDefault > 0.5f
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::horizonDelay,
        "Horizon Delay",
        NormalisableRange<float> (horizonDelayMin, horizonDelayMax),
        horizonDelayDefault
    ));

    //==========================================================================
    // Tail Parameters
    //==========================================================================

    layout.add (std::make_unique<AudioParameterBool>(
        ParameterIDs::tailEnabled,
        "Tail Enabled",
        tailEnabledDefault > 0.5f
    ));

    layout.add (std::make_unique<AudioParameterFloat>(
        ParameterIDs::tailDecay,
        "Tail Decay",
        NormalisableRange<float> (tailDecayMin, tailDecayMax),
        tailDecayDefault
    ));

    return layout;
}

juce::StringArray MonumentReverbProcessor::getSurfaceChoices()
{
    return {
        "Grass",
        "Soil",
        "Wood",
        "Concrete",
        "Marble",
        "Stone",
        "Snow",
        "Ice"
    };
}

//==============================================================================
// AudioProcessor Implementation
//==============================================================================

void MonumentReverbProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    dsp_.prepare (sampleRate, samplesPerBlock);
}

void MonumentReverbProcessor::releaseResources()
{
    dsp_.reset();
}

void MonumentReverbProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                             juce::MidiBuffer& midiMessages)
{
    juce::ignoreUnused (midiMessages);

    // Check if input is valid
    if (buffer.getNumChannels() == 0)
        return;

    // Build params struct from parameter pointers
    schill::monument::MonumentReverbParams params;

    params.wet = wetParam_ != nullptr ? wetParam_->load() : 0.5f;
    params.dry = dryParam_ != nullptr ? dryParam_->load() : 1.0f;
    params.scale = scaleParam_ != nullptr ? scaleParam_->load() : 1.0f;
    params.air = airParam_ != nullptr ? airParam_->load() : 0.3f;

    params.surface = surfaceParam_ != nullptr ? static_cast<int> (surfaceParam_->load()) : 0;
    params.hardness = hardnessParam_ != nullptr ? hardnessParam_->load() : 0.5f;
    params.roughness = roughnessParam_ != nullptr ? roughnessParam_->load() : 0.3f;
    params.groundWetness = groundWetnessParam_ != nullptr ? groundWetnessParam_->load() : 0.0f;
    params.height = heightParam_ != nullptr ? heightParam_->load() : 0.6f;

    params.density = densityParam_ != nullptr ? densityParam_->load() : 0.2f;
    params.vegWetness = vegWetnessParam_ != nullptr ? vegWetnessParam_->load() : 0.0f;
    params.jitter = jitterParam_ != nullptr ? jitterParam_->load() : 0.1f;

    params.horizonEnabled = horizonEnabledParam_ != nullptr ? horizonEnabledParam_->load() : 1.0f;
    params.horizonDelay = horizonDelayParam_ != nullptr ? horizonDelayParam_->load() : 0.2f;

    params.tailEnabled = tailEnabledParam_ != nullptr ? tailEnabledParam_->load() : 1.0f;
    params.tailDecay = tailDecayParam_ != nullptr ? tailDecayParam_->load() : 2.0f;

    // Process with DSP engine
    dsp_.processBlock (
        buffer.getArrayOfReadPointers(),
        buffer.getArrayOfWritePointers(),
        buffer.getNumChannels(),
        buffer.getNumChannels(),
        buffer.getNumSamples(),
        params
    );
}

//==============================================================================
// Editor
//==============================================================================

juce::AudioProcessorEditor* MonumentReverbProcessor::createEditor()
{
    // For now, return a generic editor
    // TODO: Create custom editor
    return new juce::GenericAudioProcessorEditor (*this);
}

//==============================================================================
// State
//==============================================================================

void MonumentReverbProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    // Save parameter state
    auto state = parameters_.copyState();
    std::unique_ptr<juce::XmlElement> xml (state.createXml());
    copyXmlToBinary (*xml, destData);
}

void MonumentReverbProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    // Restore parameter state
    std::unique_ptr<juce::XmlElement> xmlState (getXmlFromBinary (data, sizeInBytes));

    if (xmlState != nullptr && xmlState->hasTagName (parameters_.state.getType()))
    {
        parameters_.replaceState (juce::ValueTree::fromXml (*xmlState));
    }
}

//==============================================================================
// Create Plugin Instance
//==============================================================================

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new MonumentReverbProcessor();
}
