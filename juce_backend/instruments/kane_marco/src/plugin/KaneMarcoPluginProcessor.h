/*
  ==============================================================================

   KaneMarcoPluginProcessor.h
   VST3/AU Plugin Processor for Kane Marco Aether

   Provides:
   - Kane Marco Aether physical modeling string synthesizer
   - Parameter automation
   - MIDI/MPE support
   - State management for DAW projects
   - pluginval validation support

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "dsp/KaneMarcoAetherPureDSP.h"
#include <memory>
#include <atomic>

//==============================================================================
/**
 * Audio Processor for Kane Marco Aether
 *
 * Implements both VST3 and AU formats via JUCE
 * Designed for pluginval validation testing
 */
class KaneMarcoPluginProcessor : public juce::AudioProcessor
{
public:
    //==============================================================================
    KaneMarcoPluginProcessor();
    ~KaneMarcoPluginProcessor() override;

    //==============================================================================
    // juce::AudioProcessor implementation
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    void processBlock(juce::AudioBuffer<float>& buffer,
                      juce::MidiBuffer& midiMessages) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "Kane Marco Aether"; }

    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 3.0; }

    //==============================================================================
    // Programs (presets) - minimal for pluginval
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return "Default"; }
    void changeProgramName(int, const juce::String&) override {}

    //==============================================================================
    // Parameters
    int getNumParameters() override;
    float getParameter(int index) override;
    void setParameter(int index, float value) override;
    const juce::String getParameterName(int index) override;
    const juce::String getParameterText(int index) override;

    //==============================================================================
    // State
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==============================================================================
    // Info
    const juce::String getInputChannelName(int channelIndex) const override;
    const juce::String getOutputChannelName(int channelIndex) const override;
    bool isInputChannelStereoPair(int index) const override;
    bool isOutputChannelStereoPair(int index) const override;

    bool supportsMPE() const override { return true; }
    bool supportsDoublePrecisionProcessing() const override { return false; }

    //==============================================================================
    // Kane Marco specific methods
    void enableSharedBridge(bool enabled) { dsp_.enableSharedBridge(enabled); }
    void enableSympatheticStrings(bool enabled) { dsp_.enableSympatheticStrings(enabled); }

protected:
    juce::AudioPlayHead::CurrentPositionInfo positionInfo;

private:
    //==============================================================================
    // DSP instance
    DSP::KaneMarcoAetherPureDSP dsp_;

    // Critical section for DSP access
    juce::CriticalSection dspLock;

    //==============================================================================
    // Parameter definitions
    enum ParameterIndex
    {
        MasterVolume = 0,
        Damping,
        Brightness,
        Stiffness,
        Dispersion,
        SympatheticCoupling,
        Material,
        BodyPreset,

        TotalNumParameters
    };

    // Parameter ranges
    struct ParameterInfo
    {
        const char* name;
        float minValue;
        float maxValue;
        float defaultValue;
        const char* label;
    };

    static const ParameterInfo parameterInfos[TotalNumParameters];

    //==============================================================================
    // MIDI processing
    void processMIDI(juce::MidiBuffer& midiMessages,
                     std::vector<DSP::ScheduledEvent>& events);

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KaneMarcoPluginProcessor)
};

//==============================================================================
/**
 * Plug-in description for JUCE wrapper
 */
struct KaneMarcoPluginInfo
{
    static const char* getName()        { return "Kane Marco Aether"; }
    static const char* getDescription() { return "Physical modeling string synthesizer"; }
    static const char* getManufacturer() { return "Kane Marco"; }
    static const char* getVersion()     { return "1.0.0"; }
    static int getVersionHex()          { return 0x00010000; }

    static const char* getCategory()    { return "Synth"; }
};
