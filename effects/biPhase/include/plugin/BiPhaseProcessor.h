/*
  ==============================================================================

    BiPhaseProcessor.h
    Created: January 14, 2026
    Author: Bret Bouchard

    JUCE AudioProcessor wrapper for Mu-Tron Bi-Phase DSP

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "dsp/BiPhasePureDSP_v2.h"
#include <memory>

//==============================================================================
/**
 * JUCE AudioProcessor for Mu-Tron Bi-Phase Phaser Effect
 *
 * Implements a dual 6-stage phaser based on the Mu-Tron Bi-Phase specification:
 * - Two independent phasors (A and B) with 6 all-pass stages each
 * - Routing modes: Parallel, Series (12-stage cascade), Independent
 * - LFO rate: 0.1 Hz to 18 Hz (logarithmic scaling)
 * - Depth: 0.0 to 1.0 (modulation depth)
 * - Feedback: 0.0 to 0.98 (regenerative resonance)
 * - LFO shapes: Sine, Square
 * - Sweep sync: Normal, Reverse (for stereo imaging)
 * - Sweep source: Generator 1, Generator 2, Pedal (reserved)
 *
 * Parameter Layout:
 * - Phasor A: rate_a, depth_a, feedback_a, shape_a, source_a
 * - Phasor B: rate_b, depth_b, feedback_b, shape_b, source_b
 * - Routing: routing_mode (InA/OutA/InB), sweep_sync (Normal/Reverse)
 * - Legacy: rate, depth, feedback, shape, stereo_phase (single phaser)
 */
class BiPhaseProcessor : public juce::AudioProcessor
{
public:
    //==============================================================================
    BiPhaseProcessor();
    ~BiPhaseProcessor() override;

    //==============================================================================
    // juce::AudioProcessor implementation
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    void processBlock(juce::AudioBuffer<float>& buffer,
                      juce::MidiBuffer& midiMessages) override;

    // Using the other buffer for mono compatibility
    using AudioProcessor::processBlock;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    //==============================================================================
    const juce::String getName() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    double getTailLengthSeconds() const override;

    //==============================================================================
    // Programs (presets)
    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override;

    //==============================================================================
    // State persistence
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==============================================================================
    // AudioProcessor properties
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

    //==============================================================================
    // Parameter IDs
    struct ParameterIDs
    {
        // Phasor A
        juce::ParameterID rateA {"rate_a", 1};
        juce::ParameterID depthA {"depth_a", 1};
        juce::ParameterID feedbackA {"feedback_a", 1};
        juce::ParameterID shapeA {"shape_a", 1};
        juce::ParameterID sourceA {"source_a", 1};

        // Phasor B
        juce::ParameterID rateB {"rate_b", 1};
        juce::ParameterID depthB {"depth_b", 1};
        juce::ParameterID feedbackB {"feedback_b", 1};
        juce::ParameterID shapeB {"shape_b", 1};
        juce::ParameterID sourceB {"source_b", 1};

        // Routing
        juce::ParameterID routingMode {"routing_mode", 1};
        juce::ParameterID sweepSync {"sweep_sync", 1};

        // Legacy (for single phaser compatibility)
        juce::ParameterID rate {"rate", 1};
        juce::ParameterID depth {"depth", 1};
        juce::ParameterID feedback {"feedback", 1};
        juce::ParameterID shape {"shape", 1};
        juce::ParameterID stereoPhase {"stereo_phase", 1};
    };

private:
    //==============================================================================
    // DSP Core
    DSP::BiPhaseDSP dsp_;

    //==============================================================================
    // Parameters - Phasor A
    std::unique_ptr<juce::AudioParameterFloat> rateAParam_;
    std::unique_ptr<juce::AudioParameterFloat> depthAParam_;
    std::unique_ptr<juce::AudioParameterFloat> feedbackAParam_;
    std::unique_ptr<juce::AudioParameterChoice> shapeAParam_;
    std::unique_ptr<juce::AudioParameterChoice> sourceAParam_;

    // Parameters - Phasor B
    std::unique_ptr<juce::AudioParameterFloat> rateBParam_;
    std::unique_ptr<juce::AudioParameterFloat> depthBParam_;
    std::unique_ptr<juce::AudioParameterFloat> feedbackBParam_;
    std::unique_ptr<juce::AudioParameterChoice> shapeBParam_;
    std::unique_ptr<juce::AudioParameterChoice> sourceBParam_;

    // Parameters - Routing
    std::unique_ptr<juce::AudioParameterChoice> routingModeParam_;
    std::unique_ptr<juce::AudioParameterChoice> sweepSyncParam_;

    // Parameters - Legacy (single phaser)
    std::unique_ptr<juce::AudioParameterFloat> rateParam_;
    std::unique_ptr<juce::AudioParameterFloat> depthParam_;
    std::unique_ptr<juce::AudioParameterFloat> feedbackParam_;
    std::unique_ptr<juce::AudioParameterChoice> shapeParam_;
    std::unique_ptr<juce::AudioParameterFloat> stereoPhaseParam_;

    //==============================================================================
    // Layout
    juce::AudioProcessorValueTreeState parameters_;

    //==============================================================================
    // Setup
    void setupParameters();
    void parameterChanged(const juce::String& parameterID, float newValue);

    //==============================================================================
    // Helper functions for parameter ranges
    static juce::NormalisableRange<float> createRateRange();
    static juce::NormalisableRange<float> createDepthRange();
    static juce::NormalisableRange<float> createFeedbackRange();
    static juce::NormalisableRange<float> createStereoPhaseRange();

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (BiPhaseProcessor)
};

//==============================================================================
/**
 * Plug-in description for JUCE wrapper
 */
struct BiPhasePluginInfo
{
    static const char* getName()        { return "Mu-Tron Bi-Phase"; }
    static const char* getDescription() { return "Dual 6-stage phaser effect"; }
    static const char* getManufacturer() { return "White Room"; }
    static const char* getVersion()     { return "1.0.0"; }
    static int getVersionHex()          { return 0x00010000; }

    static const char* getCategory()    { return "Effect"; }
};
