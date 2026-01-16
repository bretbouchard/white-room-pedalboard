/*
  ==============================================================================

    SamSamplerPluginProcessor.h
    Created: January 8, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor wrapper for Sam Sampler instrument
    Handles plugin interface and parameter management

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "dsp/SamSamplerDSP.h"
#include "dsp/MPEUniversalSupport.h"
#include "dsp/MicrotonalTuning.h"

using namespace DSP;

/**
 * JUCE AudioProcessor wrapper for Sam Sampler instrument
 * Handles plugin interface and parameter management
 *
 * ENHANCED with:
 * - MPE-Lite support (pressure to filter/amp only)
 * - Microtonal tuning support (limited - samples are baked)
 */
class SamSamplerPluginProcessor : public juce::AudioProcessor {
public:
    SamSamplerPluginProcessor();
    ~SamSamplerPluginProcessor() override;

    // AudioProcessor interface
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
#endif

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    // AudioProcessorEditor interface
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    // Plugin information
    const juce::String getName() const override;
    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    double getTailLengthSeconds() const override;

    // MPE Capability Declaration
    bool supportsMPE() const override { return true; }

    // Program information
    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override;

    // State management
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // Parameter access
    SamSamplerDSP& getSamSampler() { return samSampler; }
    const SamSamplerDSP& getSamSampler() const { return samSampler; }
    juce::AudioProcessorValueTreeState& getParameters() { return *parameters; }

private:
    // Core sampler instrument
    SamSamplerDSP samSampler;

    // MPE Support (Lite - pressure to filter/amp only)
    std::unique_ptr<MPEUniversalSupport> mpeSupport;
    bool mpeEnabled = true;

    // Microtonal Tuning Support (limited - samples are baked)
    std::unique_ptr<MicrotonalTuningManager> tuningManager;
    bool microtonalEnabled = true;

    // Parameter tree (JUCE's parameter management)
    std::unique_ptr<juce::AudioProcessorValueTreeState> parameters;

    // Global parameters
    std::atomic<float>* masterVolumeParam = nullptr;
    std::atomic<float>* pitchBendRangeParam = nullptr;

    // Sample playback parameters
    std::atomic<float>* basePitchParam = nullptr;
    std::atomic<float>* sampleStartParam = nullptr;
    std::atomic<float>* sampleEndParam = nullptr;
    std::atomic<float>* loopEnabledParam = nullptr;
    std::atomic<float>* loopStartParam = nullptr;
    std::atomic<float>* loopEndParam = nullptr;
    std::atomic<float>* crossfadeParam = nullptr;

    // Envelope parameters
    std::atomic<float>* envAttackParam = nullptr;
    std::atomic<float>* envDecayParam = nullptr;
    std::atomic<float>* envSustainParam = nullptr;
    std::atomic<float>* envReleaseParam = nullptr;

    // Filter parameters
    std::atomic<float>* filterCutoffParam = nullptr;
    std::atomic<float>* filterResonanceParam = nullptr;
    std::atomic<float>* filterEnabledParam = nullptr;

    // Effects parameters
    std::atomic<float>* reverbMixParam = nullptr;
    std::atomic<float>* delayMixParam = nullptr;
    std::atomic<float>* driveParam = nullptr;

    // Initialize parameters
    void setupParameters();
    void setupParameterCallbacks();

    // Update sampler parameters
    void updateSamSamplerParameters();

    // MPE & Microtonal helpers
    void processMPE(const juce::MidiBuffer& midiMessages);
    void applyMPEToNote(int noteNumber, int midiChannel);

    // Utility functions
    static juce::String floatToString(float value, int maxDecimalPlaces = 2);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SamSamplerPluginProcessor)
};
