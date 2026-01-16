/*
  ==============================================================================

    SchillingerIntegration.cpp
    Created: December 31, 2025
    Author: Bret Bouchard

    JUCE integration for Schillinger tvOS SDK.
    Demonstrates how to consume plans from the lock-free cache in audio thread.

  ==============================================================================
*/

#include "SchillingerPlanCache.h"
#include <juce_audio_processors/juce_audio_processors.h>

//==============================================================================
// Schillinger-Aware Audio Processor
//==============================================================================

class SchillingerAudioProcessor : public juce::AudioProcessor
{
public:
    SchillingerAudioProcessor()
        : AudioProcessor(BusesProperties().withInput("Input",  juce::AudioChannelSet::stereo())
                                          .withOutput("Output", juce::AudioChannelSet::stereo())),
          currentSampleRate(48000.0),
          samplesProcessed(0)
    {
        // Register Schillinger session
        sessionId = "session-demo-001";
        getSchillingerPlanCache().registerSession(sessionId);
    }

    ~SchillingerAudioProcessor() override
    {
        // Unregister session
        getSchillingerPlanCache().unregisterSession(sessionId);
    }

    //==========================================================================
    // AudioProcessor Overrides
    //==========================================================================

    void prepareToPlay(double sampleRate, int samplesPerBlock) override
    {
        currentSampleRate = sampleRate;
        samplesProcessed = 0;
    }

    void releaseResources() override {}

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override
    {
        // CRITICAL: No allocations, no blocking calls in audio thread!

        // Process queued plan updates (wait-free)
        int updatesProcessed = getSchillingerPlanCache().processUpdates();

        // Get current plan for this session (wait-free read)
        auto currentPlan = getSchillingerPlanCache().getPlan(sessionId);

        // If we have a valid plan, use it to generate audio
        if (currentPlan && currentPlan->isValid())
        {
            // Generate audio based on plan
            generateAudioFromPlan(*currentPlan, buffer, midiMessages);
        }
        else
        {
            // No plan yet - pass audio through
            buffer.clear();
        }

        // Update sample position
        samplesProcessed += buffer.getNumSamples();
    }

    //==========================================================================
    // Plan-Based Audio Generation
    //==========================================================================

    void generateAudioFromPlan(const SchillingerPlan& plan,
                              juce::AudioBuffer<float>& buffer,
                              juce::MidiBuffer& midiMessages)
    {
        // In a real implementation, this would:
        // 1. Parse plan.operationsJSON
        // 2. Schedule notes/events based on timestamps
        // 3. Apply Schillinger rhythmic/harmonic patterns
        // 4. Render audio using synth voices

        // For demonstration, we'll just log plan info
        // In production, this would be replaced with actual DSP

        // Example: Check if current time falls within plan window
        const double currentTimeInSeconds = samplesProcessed / currentSampleRate;
        const double windowFromInSeconds = plan.windowFrom / 1000.0;  // ms to seconds
        const double windowToInSeconds = plan.windowTo / 1000.0;

        if (currentTimeInSeconds >= windowFromInSeconds &&
            currentTimeInSeconds < windowToInSeconds)
        {
            // We're in the plan's time window - generate audio
            // This is where actual Schillinger synthesis would happen
            buffer.clear();  // Placeholder
        }
        else
        {
            // Outside time window - silence
            buffer.clear();
        }
    }

    //==========================================================================
    // Metadata
    //==========================================================================

    const juce::String getName() const override { return "Schillinger Processor"; }

    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }

    double getTailLengthSeconds() const override { return 0.0; }

    //==========================================================================
    // Program Management
    //==========================================================================

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int index) override {}
    const juce::String getProgramName(int index) override { return "Schillinger"; }
    void changeProgramName(int index, const juce::String& newName) override {}

    //==========================================================================
    // State Management
    //==========================================================================

    void getStateInformation(juce::MemoryBlock& destData) override
    {
        // Save processor state
        juce::MemoryOutputStream stream(destData, false);
        stream.writeString(sessionId);
    }

    void setStateInformation(const void* data, int sizeInBytes) override
    {
        // Restore processor state
        juce::MemoryInputStream stream(data, static_cast<size_t>(sizeInBytes), false);
        sessionId = stream.readString();
    }

private:
    //==========================================================================
    // Member Variables
    //==========================================================================

    std::string sessionId;
    double currentSampleRate;
    int64_t samplesProcessed;

    //==========================================================================
    // JUCE Macros
    //==========================================================================

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SchillingerAudioProcessor)
};

//==============================================================================
// Plugin Factory
//==============================================================================

// This creates the plugin instance when the host loads the plugin
juce::AudioProcessor* JUCE_CALL createPluginFilter()
{
    return new SchillingerAudioProcessor();
}
