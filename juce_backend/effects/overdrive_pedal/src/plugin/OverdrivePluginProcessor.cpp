/*
  ==============================================================================

    OverdrivePluginProcessor.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    JUCE plugin processor for Overdrive Pedal

  ==============================================================================
*/

#include "OverdrivePluginProcessor.h"
#include "OverdrivePluginEditor.h"

//==============================================================================
OverdrivePluginProcessor::OverdrivePluginProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       ),
    parameters (*this, nullptr, juce::Identifier("Overdrive"), {})
#endif
{
    // Add JUCE parameters
    auto& drive = parameters.createAndAddParameter("drive", "Drive",
        juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& tone = parameters.createAndAddParameter("tone", "Tone",
        juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& bass = parameters.createAndAddParameter("bass", "Bass",
        juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& mid = parameters.createAndAddParameter("mid", "Mid",
        juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& treble = parameters.createAndAddParameter("treble", "Treble",
        juce::NormalisableRange<float>(0.0f, 1.0f), 0.5f);

    auto& level = parameters.createAndAddParameter("level", "Level",
        juce::NormalisableRange<float>(0.0f, 1.0f), 0.7f);
}

OverdrivePluginProcessor::~OverdrivePluginProcessor()
{
}

//==============================================================================
void OverdrivePluginProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    dspEngine.prepare(sampleRate, samplesPerBlock);
}

void OverdrivePluginProcessor::releaseResources()
{
    dspEngine.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool OverdrivePluginProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    #if JucePlugin_IsMidiEffect
        juce::ignoreUnused (layouts);
        return true;
    #else
        if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
         && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
            return false;

        #if ! JucePlugin_IsSynth
            if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
                return false;
        #endif

        return true;
    #endif
}
#endif

void OverdrivePluginProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                             juce::MidiBuffer& midiMessages)
{
    juce::ignoreUnused (midiMessages);

    // Update DSP parameters from JUCE
    dspEngine.setParameter("drive", getParameter("drive")->getValue());
    dspEngine.setParameter("tone", getParameter("tone")->getValue());
    dspEngine.setParameter("bass", getParameter("bass")->getValue());
    dspEngine.setParameter("mid", getParameter("mid")->getValue());
    dspEngine.setParameter("treble", getParameter("treble")->getValue());
    dspEngine.setParameter("level", getParameter("level")->getValue());

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
juce::AudioProcessorEditor* OverdrivePluginProcessor::createEditor()
{
    return new OverdrivePluginEditor (*this);
}

bool OverdrivePluginProcessor::hasEditor() const
{
    return true;
}

//==============================================================================
const juce::String OverdrivePluginProcessor::getName() const
{
    return JucePlugin_Name;
}

bool OverdrivePluginProcessor::acceptsMidi() const
{
   #if JucePlugin_WantsMidiInput
    return true;
   #else
    return false;
   #endif
}

bool OverdrivePluginProcessor::producesMidi() const
{
   #if JucePlugin_ProducesMidiOutput
    return true;
   #else
    return false;
   #endif
}

bool OverdrivePluginProcessor::isMidiEffect() const
{
   #if JucePlugin_IsMidiEffect
    return true;
   #else
    return false;
   #endif
}

double OverdrivePluginProcessor::getTailLengthSeconds() const
{
    return 0.5;
}

//==============================================================================
int OverdrivePluginProcessor::getNumPrograms()
{
    return DSP::OverdrivePedalPureDSP::NUM_PRESETS;
}

int OverdrivePluginProcessor::getCurrentProgram()
{
    return currentProgram;
}

void OverdrivePluginProcessor::setCurrentProgram (int index)
{
    if (index >= 0 && index < getNumPrograms())
    {
        currentProgram = index;
        dspEngine.loadPreset(index);
    }
}

const juce::String OverdrivePluginProcessor::getProgramName (int index)
{
    if (index >= 0 && index < getNumPrograms())
    {
        return dspEngine.getPreset(index)->name;
    }
    return {};
}

void OverdrivePluginProcessor::changeProgramName (int index, const juce::String& newName)
{
    juce::ignoreUnused (index, newName);
}

//==============================================================================
void OverdrivePluginProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    char jsonBuffer[4096];
    if (dspEngine.savePreset(jsonBuffer, sizeof(jsonBuffer)))
    {
        destData.append(jsonBuffer, std::strlen(jsonBuffer));
    }
}

void OverdrivePluginProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    const char* jsonData = static_cast<const char*>(data);
    dspEngine.loadPreset(jsonData);
}

//==============================================================================
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new OverdrivePluginProcessor();
}
