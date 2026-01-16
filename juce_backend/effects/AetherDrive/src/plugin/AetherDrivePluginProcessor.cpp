/*
  ==============================================================================

    AetherDrivePluginProcessor.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    JUCE plugin processor for Aether Drive

  ==============================================================================
*/

#include "AetherDrivePluginProcessor.h"
#include "AetherDrivePluginEditor.h"

//==============================================================================
AetherDrivePluginProcessor::AetherDrivePluginProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       ),
    parameters (*this, nullptr, juce::Identifier("AetherDrive"), {})
#endif
{
    // Add parameters
    auto& layout = parameters.createAndAddParameter("drive", "Drive",
        "Drive amount", juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& bass = parameters.createAndAddParameter("bass", "Bass",
        "Bass shelving", juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& mid = parameters.createAndAddParameter("mid", "Mid",
        "Mid presence", juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& treble = parameters.createAndAddParameter("treble", "Treble",
        "Treble shelving", juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& bodyResonance = parameters.createAndAddParameter("body_resonance", "Body Resonance",
        "Body resonance amount", juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& resonanceDecay = parameters.createAndAddParameter("resonance_decay", "Resonance Decay",
        "Resonance decay time", juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& mix = parameters.createAndAddParameter("mix", "Mix",
        "Dry/wet mix", juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& outputLevel = parameters.createAndAddParameter("output_level", "Output Level",
        "Output level", juce::NormalisableRange<float>(0.0f, 1.0f), 0.8f);

    auto& cabinetSimulation = parameters.createAndAddParameter("cabinet_simulation", "Cabinet",
        "Cabinet simulation", juce::NormalisableRange<float>(0.0f, 1.0f), 0.3f);
}

AetherDrivePluginProcessor::~AetherDrivePluginProcessor()
{
}

//==============================================================================
void AetherDrivePluginProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    dspEngine.prepare(sampleRate, samplesPerBlock);
}

void AetherDrivePluginProcessor::releaseResources()
{
    dspEngine.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool AetherDrivePluginProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    #if JucePlugin_IsMidiEffect
        juce::ignoreUnused (layouts);
        return true;
    #else
        // Only support mono and stereo
        if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
         && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
            return false;

        // This checks if the input layout matches the output layout
        #if ! JucePlugin_IsSynth
            if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
                return false;
        #endif

        return true;
    #endif
}
#endif

void AetherDrivePluginProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                               juce::MidiBuffer& midiMessages)
{
    juce::ignoreUnused (midiMessages);

    // Update DSP parameters from JUCE parameters
    auto* driveParam = getParameter("drive");
    auto* bassParam = getParameter("bass");
    auto* midParam = getParameter("mid");
    auto* trebleParam = getParameter("treble");
    auto* bodyResonanceParam = getParameter("body_resonance");
    auto* resonanceDecayParam = getParameter("resonance_decay");
    auto* mixParam = getParameter("mix");
    auto* outputLevelParam = getParameter("output_level");
    auto* cabinetSimulationParam = getParameter("cabinet_simulation");

    if (driveParam)
        dspEngine.setParameter("drive", driveParam->getValue());
    if (bassParam)
        dspEngine.setParameter("bass", bassParam->getValue());
    if (midParam)
        dspEngine.setParameter("mid", midParam->getValue());
    if (trebleParam)
        dspEngine.setParameter("treble", trebleParam->getValue());
    if (bodyResonanceParam)
        dspEngine.setParameter("body_resonance", bodyResonanceParam->getValue());
    if (resonanceDecayParam)
        dspEngine.setParameter("resonance_decay", resonanceDecayParam->getValue());
    if (mixParam)
        dspEngine.setParameter("mix", mixParam->getValue());
    if (outputLevelParam)
        dspEngine.setParameter("output_level", outputLevelParam->getValue());
    if (cabinetSimulationParam)
        dspEngine.setParameter("cabinet_simulation", cabinetSimulationParam->getValue());

    // Get channel pointers
    float* channels[2];
    channels[0] = buffer.getWritePointer(0);
    channels[1] = buffer.getNumChannels() > 1 ? buffer.getWritePointer(1) : nullptr;

    // Process through DSP engine
    const float* inputChannels[2];
    inputChannels[0] = buffer.getReadPointer(0);
    inputChannels[1] = buffer.getNumChannels() > 1 ? buffer.getReadPointer(1) : nullptr;

    dspEngine.process(
        const_cast<float**>(inputChannels),
        channels,
        buffer.getNumChannels(),
        buffer.getNumSamples()
    );
}

//==============================================================================
juce::AudioProcessorEditor* AetherDrivePluginProcessor::createEditor()
{
    return new AetherDrivePluginEditor (*this);
}

bool AetherDrivePluginProcessor::hasEditor() const
{
    return true;
}

//==============================================================================
const juce::String AetherDrivePluginProcessor::getName() const
{
    return JucePlugin_Name;
}

bool AetherDrivePluginProcessor::acceptsMidi() const
{
   #if JucePlugin_WantsMidiInput
    return true;
   #else
    return false;
   #endif
}

bool AetherDrivePluginProcessor::producesMidi() const
{
   #if JucePlugin_ProducesMidiOutput
    return true;
   #else
    return false;
   #endif
}

bool AetherDrivePluginProcessor::isMidiEffect() const
{
   #if JucePlugin_IsMidiEffect
    return true;
   #else
    return false;
   #endif
}

double AetherDrivePluginProcessor::getTailLengthSeconds() const
{
    return 2.0; // 2 seconds tail for body resonator decay
}

//==============================================================================
int AetherDrivePluginProcessor::getNumPrograms()
{
    return DSP::AetherDrivePureDSP::NUM_FACTORY_PRESETS;
}

int AetherDrivePluginProcessor::getCurrentProgram()
{
    return currentProgram;
}

void AetherDrivePluginProcessor::setCurrentProgram (int index)
{
    if (index >= 0 && index < getNumPrograms())
    {
        currentProgram = index;
        dspEngine.loadFactoryPreset(index);
    }
}

const juce::String AetherDrivePluginProcessor::getProgramName (int index)
{
    if (index >= 0 && index < getNumPrograms())
    {
        return dspEngine.getFactoryPresetName(index);
    }
    return {};
}

void AetherDrivePluginProcessor::changeProgramName (int index, const juce::String& newName)
{
    juce::ignoreUnused (index, newName);
}

//==============================================================================
void AetherDrivePluginProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    // Save DSP state to JSON
    char jsonBuffer[4096];
    if (dspEngine.savePreset(jsonBuffer, sizeof(jsonBuffer)))
    {
        destData.append(jsonBuffer, std::strlen(jsonBuffer));
    }
}

void AetherDrivePluginProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    // Load DSP state from JSON
    const char* jsonData = static_cast<const char*>(data);
    dspEngine.loadPreset(jsonData);
}

//==============================================================================
// This creates new instances of the plugin
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new AetherDrivePluginProcessor();
}
