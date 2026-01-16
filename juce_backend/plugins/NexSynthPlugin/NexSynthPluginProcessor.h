/*
  ==============================================================================

    NexSynthPluginProcessor.h
    Created: January 8, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor wrapper for NexSynth FM Synthesizer
    Handles plugin interface and parameter management

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "dsp/NexSynthDSP.h"
#include "dsp/MPEUniversalSupport.h"
#include "dsp/MicrotonalTuning.h"
#include "src/frontend/telemetry/ParameterTelemetryRecorder.h"

using namespace DSP;

/**
 * JUCE AudioProcessor wrapper for NexSynth FM Synthesizer
 * Handles plugin interface and parameter management
 *
 * ENHANCED with:
 * - Preset-based MPE support (opt-in via mpe_enabled parameter)
 * - Microtonal tuning support (30+ built-in scales, experimental scales work well)
 */
class NexSynthPluginProcessor : public juce::AudioProcessor {
public:
    NexSynthPluginProcessor();
    ~NexSynthPluginProcessor() override;

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

    // MPE Capability Declaration (conditional - based on mpe_enabled parameter)
    bool supportsMPE() const override { return mpeEnabledParam && mpeEnabledParam->load() > 0.5f; }

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
    NexSynthDSP& getNexSynth() { return nexSynth; }
    const NexSynthDSP& getNexSynth() const { return nexSynth; }
    juce::AudioProcessorValueTreeState& getParameters() { return *parameters; }

    // Telemetry access
    ParameterTelemetryRecorder* getTelemetryRecorder() { return telemetryRecorder.get(); }

private:
    // Core NexSynth FM synthesizer
    NexSynthDSP nexSynth;

    // MPE Support (Preset-based - enabled via parameter)
    std::unique_ptr<MPEUniversalSupport> mpeSupport;
    bool mpeSupportInitialized = false;

    // Microtonal Tuning Support
    std::unique_ptr<MicrotonalTuningManager> tuningManager;
    bool microtonalEnabled = true;

    // Parameter tree (JUCE's parameter management)
    std::unique_ptr<juce::AudioProcessorValueTreeState> parameters;

    // Telemetry recorder for parameter change events
    std::unique_ptr<ParameterTelemetryRecorder> telemetryRecorder;

    // Global parameters
    std::atomic<float>* masterVolumeParam = nullptr;
    std::atomic<float>* pitchBendRangeParam = nullptr;
    std::atomic<float>* mpeEnabledParam = nullptr;  // MPE enable/disable parameter
    std::atomic<float>* microtonalEnabledParam = nullptr;  // Microtonal enable/disable

    // FM Operator parameters (5 operators)
    struct OperatorParams {
        std::atomic<float>* ratioParam = nullptr;
        std::atomic<float>* detuneParam = nullptr;
        std::atomic<float>* modulationIndexParam = nullptr;
        std::atomic<float>* outputLevelParam = nullptr;
        std::atomic<float>* feedbackParam = nullptr;
        std::atomic<float>* attackParam = nullptr;
        std::atomic<float>* decayParam = nullptr;
        std::atomic<float>* sustainParam = nullptr;
        std::atomic<float>* releaseParam = nullptr;
    };

    std::array<OperatorParams, 5> operatorParams;

    // Modulation matrix parameters (simplified - just a few key routes)
    std::atomic<float>* mod2to1Param = nullptr;
    std::atomic<float>* mod3to2Param = nullptr;
    std::atomic<float>* mod4to2Param = nullptr;
    std::atomic<float>* mod5to3Param = nullptr;

    // Initialize parameters
    void setupParameters();
    void setupParameterCallbacks();

    // Update NexSynth parameters
    void updateNexSynthParameters();

    // MPE & Microtonal helpers
    void processMPE(const juce::MidiBuffer& midiMessages);
    void applyMPEToNote(int noteNumber, int midiChannel);
    float getMicrotonalFrequency(int midiNote);

    // Utility functions
    static juce::String floatToString(float value, int maxDecimalPlaces = 2);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(NexSynthPluginProcessor)
};
