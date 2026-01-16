/*
  ==============================================================================

    SingleNoteTestProcessor.h
    Phase 1: Foundation - Verify JUCE audio pipeline works

    Creates a minimal audio processor that outputs a single Middle C note
    for exactly 1 second. This is the foundation layer - if this doesn't work,
    nothing above it will.

    Observability: Logs every step of the audio pipeline

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>

//==============================================================================
// Single Note Test Processor
//==============================================================================

class SingleNoteTestProcessor : public juce::AudioProcessor {
public:
    //==========================================================================
    // Constructor/Destructor
    //==========================================================================

    SingleNoteTestProcessor();
    ~SingleNoteTestProcessor() override;

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

    const juce::String getName() const override { return "SingleNoteTest"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return true; }
    bool isMidiEffect() const override { return true; }

    //==========================================================================
    // Program State
    //==========================================================================

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int index) override {}
    const juce::String getProgramName(int index) override { return "Test"; }
    void changeProgramName(int index, const juce::String& newName) override {}

    //==========================================================================
    // State Persistence
    //==========================================================================

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==========================================================================
    // AudioProcessor Properties
    //==========================================================================

    double getTailLengthSeconds() const override { return 0.0; }

    //==========================================================================
    // Test Control
    //==========================================================================

    /** Reset the test (will trigger new note on next processBlock) */
    void resetTest();

    /** Get test statistics */
    int getNoteOnCount() const { return noteOnCount_; }
    int getNoteOffCount() const { return noteOffCount_; }
    double getPlaybackTime() const { return playbackTimeSeconds_; }

private:
    //==========================================================================
    // Test Parameters
    //==========================================================================

    static constexpr int TEST_MIDI_NOTE = 60;      // Middle C
    static constexpr float TEST_VELOCITY = 0.8f;   // 80% velocity
    static constexpr double TEST_DURATION = 1.0;    // 1 second
    static constexpr int TEST_CHANNEL = 1;          // MIDI channel 1

    //==========================================================================
    // Playback State
    //==========================================================================

    double sampleRate_ = 0.0;
    double playbackTimeSeconds_ = 0.0;
    bool noteHasBeenSent_ = false;
    bool noteIsPlaying_ = false;

    int noteOnCount_ = 0;
    int noteOffCount_ = 0;

    //==========================================================================
    // Logging
    //==========================================================================

    void logPrepare(double sampleRate, int samplesPerBlock);
    void logProcessBlock(int numSamples);
    void logNoteEvent(const juce::String& eventType, int sampleOffset);
    void logSummary();

    //==========================================================================
    // JUCE Declarations
    //==========================================================================

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SingleNoteTestProcessor)
};
