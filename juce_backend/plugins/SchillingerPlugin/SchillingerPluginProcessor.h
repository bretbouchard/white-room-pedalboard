/*
  ==============================================================================

    SchillingerPluginProcessor.h
    Created: January 13, 2026
    Author:  Bret Bouchard

    JUCE AudioProcessor for Schillinger System Composition

    This plugin generates MIDI notes using the Schillinger System SDK.
    It takes 60+ parameters mapping to Schillinger's Books I-V and outputs
    the realized composition as MIDI to the host DAW.

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include "../include/plugin_templates/ParameterBuilder.h"
#include <atomic>
#include <memory>
#include <vector>

//==============================================================================
// Schillinger Note Structure
//==============================================================================

struct SchillingerNote {
    int midiNote;        // MIDI note number (0-127)
    float velocity;      // Velocity (0.0-1.0)
    double startTime;    // Start time in seconds
    double duration;     // Duration in seconds
    int pitch;           // Schillinger pitch class
};

//==============================================================================
// Schillinger Plugin Processor
//==============================================================================

class SchillingerPluginProcessor : public juce::AudioProcessor {
public:
    //==========================================================================
    // Constructor/Destructor
    //==========================================================================

    SchillingerPluginProcessor();
    ~SchillingerPluginProcessor() override;

    //==========================================================================
    // AudioProcessor Overrides
    //==========================================================================

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
#endif

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    //==========================================================================
    // Editor
    //==========================================================================

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==========================================================================
    // Plugin Identification
    //==========================================================================

    const juce::String getName() const override { return "Schillinger"; }
    bool acceptsMidi() const override { return false; }  // We don't accept MIDI input
    bool producesMidi() const override { return true; }  // We produce MIDI output
    bool isMidiEffect() const override { return true; }  // We're a MIDI effect plugin

    //==========================================================================
    // Parameter Access
    //==========================================================================

    juce::AudioProcessorValueTreeState& getValueTreeState() { return parameters; }
    const juce::AudioProcessorValueTreeState& getValueTreeState() const { return parameters; }

    //==========================================================================
    // State
    //==========================================================================

    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override;

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==========================================================================
    // Parameter Layout
    //==========================================================================

    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    //==========================================================================
    // Schillinger-Specific Methods
    //==========================================================================

    /**
     * Generate composition from current parameters
     * Called when trigger button is pressed or host transport starts
     */
    void generateComposition();

    /**
     * Get current composition notes
     */
    const std::vector<SchillingerNote>& getCompositionNotes() const { return compositionNotes_; }

    /**
     * Reset composition state
     */
    void resetComposition();

private:
    //==========================================================================
    // Parameters
    //==========================================================================

    juce::AudioProcessorValueTreeState parameters;

    // Parameter pointers (atomic for thread-safe access)
    std::atomic<float>* tempoParam;
    std::atomic<float>* timeSignatureNumParam;
    std::atomic<float>* timeSignatureDenParam;
    std::atomic<float>* scaleParam;
    std::atomic<float>* rootNoteParam;

    // Rhythm parameters
    std::atomic<float>* resultantTypeParam;
    std::atomic<float>* periodicityAParam;
    std::atomic<float>* periodicityBParam;
    std::atomic<float>* periodicityCParam;
    std::atomic<float>* densityParam;
    std::atomic<float>* complexityParam;
    std::atomic<float>* rhythmicDensityParam;
    std::atomic<float>* syncopationParam;

    // Melody parameters
    std::atomic<float>* melodyContourParam;
    std::atomic<float>* intervalRangeParam;
    std::atomic<float>* stepLeapingParam;
    std::atomic<float>* repetitionParam;
    std::atomic<float>* sequenceLengthParam;

    // Harmony parameters
    std::atomic<float>* harmonyTypeParam;
    std::atomic<float>* harmonicRhythmParam;
    std::atomic<float>* chordDensityParam;
    std::atomic<float>* voiceLeadingParam;
    std::atomic<float>* tensionParam;

    // Structure parameters
    std::atomic<float>* sectionsParam;
    std::atomic<float>* sectionLengthParam;
    std::atomic<float>* transitionTypeParam;
    std::atomic<float>* developmentParam;

    // Orchestration parameters
    std::atomic<float>* registerParam;
    std::atomic<float>* textureParam;
    std::atomic<float>* articulationParam;
    std::atomic<float>* dynamicsParam;
    std::atomic<float>* timbreParam;

    // Generation parameters
    std::atomic<float>* seedParam;
    std::atomic<float>* triggerParam;  // Button to trigger generation
    std::atomic<float>* lengthParam;   // Composition length in bars

    //==========================================================================
    // Composition State
    //==========================================================================

    std::vector<SchillingerNote> compositionNotes_;
    double playbackPosition_ = 0.0;  // Current playback position in seconds
    bool isGenerating_ = false;
    bool needsGeneration_ = true;  // Flag to trigger generation on first start

    //==========================================================================
    // Timing
    //==========================================================================

    double sampleRate_ = 44100.0;
    int samplesPerBlock_ = 512;

    //==========================================================================
    // Private Methods
    //==========================================================================

    /**
     * Initialize parameter pointers
     */
    void initializeParameterPointers();

    /**
     * Map parameter values to UIParameterState structure
     */
    struct UIParameterState {
        double tempo;
        int timeSignatureNumerator;
        int timeSignatureDenominator;
        juce::String scale;
        int rootNote;

        // Rhythm
        juce::String resultantType;
        int periodicityA;
        int periodicityB;
        int periodicityC;
        double density;
        double complexity;
        double rhythmicDensity;
        double syncopation;

        // Melody
        double melodyContour;
        double intervalRange;
        double stepLeaping;
        double repetition;
        int sequenceLength;

        // Harmony
        juce::String harmonyType;
        double harmonicRhythm;
        double chordDensity;
        double voiceLeading;
        double tension;

        // Structure
        int sections;
        int sectionLength;
        juce::String transitionType;
        double development;

        // Orchestration
        double registerValue;
        double texture;
        double articulation;
        double dynamics;
        double timbre;

        // Generation
        int seed;
        int lengthBars;
    };

    UIParameterState getCurrentParameterState();

    /**
     * Convert SDK JSON output to SchillingerNote vector
     */
    void parseSDKNotes(const juce::String& sdkJson);

    /**
     * Schedule MIDI messages from composition notes
     */
    void scheduleMIDIEvents(juce::MidiBuffer& midiMessages, int numSamples);

    /**
     * Load preset from XML state string
     */
    void loadPreset(const juce::String& xmlState);

    //==========================================================================
    // Presets
    //==========================================================================

    struct Preset {
        juce::String name;
        juce::String state;
    };

    std::vector<Preset> factoryPresets_;
    int currentProgramIndex_ = 0;

    void initializeFactoryPresets();

    //==========================================================================
    // JavaScriptCore Integration (Platform-specific)
    //==========================================================================

    class JavaScriptCoreWrapper;
    std::unique_ptr<JavaScriptCoreWrapper> jsCore_;

    //==========================================================================

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SchillingerPluginProcessor)
};
