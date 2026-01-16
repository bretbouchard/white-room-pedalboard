/*
  ==============================================================================

    SingleNoteTestProcessor.cpp
    Implementation of single note test processor

  ==============================================================================
*/

#include "SingleNoteTestProcessor.h"
#include "SingleNoteTestEditor.h"

//==============================================================================
// Constructor/Destructor
//==============================================================================

SingleNoteTestProcessor::SingleNoteTestProcessor()
    : juce::AudioProcessor(BusesProperties()
        .withOutput("MIDI", juce::AudioChannelSet::disabled(), false))  // MIDI-only output
{
    DBG("[SingleNoteTest] ========== CONSTRUCTED ==========");
    DBG("[SingleNoteTest] Test note: MIDI " << TEST_MIDI_NOTE << " (Middle C)");
    DBG("[SingleNoteTest] Test velocity: " << TEST_VELOCITY << " ("
        << static_cast<int>(TEST_VELOCITY * 127.0f) << " MIDI)");
    DBG("[SingleNoteTest] Test duration: " << TEST_DURATION << " seconds");
    DBG("[SingleNoteTest] Test channel: " << TEST_CHANNEL);
    DBG("[SingleNoteTest] =====================================");
}

SingleNoteTestProcessor::~SingleNoteTestProcessor()
{
    DBG("[SingleNoteTest] ========== DESTRUCTING ==========");
    logSummary();
    DBG("[SingleNoteTest] ========================================");
}

//==============================================================================
// AudioProcessor Implementation
//==============================================================================

void SingleNoteTestProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    sampleRate_ = sampleRate;
    logPrepare(sampleRate, samplesPerBlock);

    // Reset state for new playback
    playbackTimeSeconds_ = 0.0;
    noteHasBeenSent_ = false;
    noteIsPlaying_ = false;
    noteOnCount_ = 0;
    noteOffCount_ = 0;

    DBG("[SingleNoteTest] ========== READY TO PLAY ==========");
}

void SingleNoteTestProcessor::releaseResources()
{
    DBG("[SingleNoteTest] ========== RESOURCES RELEASED ==========");
    logSummary();
    DBG("[SingleNoteTest] =========================================");
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool SingleNoteTestProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    // We only output MIDI, no audio
    DBG("[SingleNoteTest] Bus layout check: MIDI-only output supported");
    return true;
}
#endif

void SingleNoteTestProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                             juce::MidiBuffer& midiMessages)
{
    // Clear audio buffer (we don't produce audio, only MIDI)
    buffer.clear();

    const int numSamples = buffer.getNumSamples();
    logProcessBlock(numSamples);

    //==========================================================================
    // Check if we need to send the note ON
    //==========================================================================

    if (!noteHasBeenSent_)
    {
        // Send note ON at the start of the first block
        const float velocity = TEST_VELOCITY;
        juce::MidiMessage messageOn = juce::MidiMessage::noteOn(
            TEST_CHANNEL,
            TEST_MIDI_NOTE,
            velocity
        );

        midiMessages.addEvent(messageOn, 0);  // At sample 0
        noteIsPlaying_ = true;
        noteHasBeenSent_ = true;
        noteOnCount_++;

        logNoteEvent("NOTE ON", 0);

        DBG("[SingleNoteTest] Note ON sent: midi=" << static_cast<int>(TEST_MIDI_NOTE)
            << " vel=" << static_cast<int>(velocity * 127.0f) << " at sample 0");
    }

    //==========================================================================
    // Check if we need to send the note OFF
    //==========================================================================

    const double noteOffTime = TEST_DURATION;
    const double blockEndTime = playbackTimeSeconds_ + (numSamples / sampleRate_);

    if (noteIsPlaying_ && blockEndTime >= noteOffTime && playbackTimeSeconds_ < noteOffTime)
    {
        // Calculate sample offset for note OFF
        const double offsetSeconds = noteOffTime - playbackTimeSeconds_;
        int sampleOffset = static_cast<int>(offsetSeconds * sampleRate_);

        // Clamp to valid range
        sampleOffset = juce::jlimit(0, numSamples - 1, sampleOffset);

        // Send note OFF
        juce::MidiMessage messageOff = juce::MidiMessage::noteOff(
            TEST_CHANNEL,
            TEST_MIDI_NOTE,
            0.0f  // Velocity for note OFF (typically 0)
        );

        midiMessages.addEvent(messageOff, sampleOffset);
        noteIsPlaying_ = false;
        noteOffCount_++;

        logNoteEvent("NOTE OFF", sampleOffset);

        DBG("[SingleNoteTest] Note OFF sent: midi=" << static_cast<int>(TEST_MIDI_NOTE)
            << " at sample " << sampleOffset
            << " (time=" << String(noteOffTime, 3) << "s)");
    }

    //==========================================================================
    // Update playback position
    //==========================================================================

    playbackTimeSeconds_ += (numSamples / sampleRate_);

    //==========================================================================
    // Log MIDI events in this block
    //==========================================================================

    if (midiMessages.getNumEvents() > 0)
    {
        DBG("[SingleNoteTest] Block summary: " << midiMessages.getNumEvents()
            << " MIDI events, position=" << String(playbackTimeSeconds_, 3) << "s");
    }
}

//==============================================================================
// Editor
//==============================================================================

juce::AudioProcessorEditor* SingleNoteTestProcessor::createEditor()
{
    return new SingleNoteTestEditor(*this);
}

//==============================================================================
// State Persistence
//==============================================================================

void SingleNoteTestProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    DBG("[SingleNoteTest] getStateInformation called (no state to save)");
}

void SingleNoteTestProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    DBG("[SingleNoteTest] setStateInformation called (no state to restore)");
}

//==============================================================================
// Test Control
//==============================================================================

void SingleNoteTestProcessor::resetTest()
{
    DBG("[SingleNoteTest] ========== TEST RESET ==========");
    DBG("[SingleNoteTest] Previous: noteOn=" << noteOnCount_ << " noteOff=" << noteOffCount_);

    playbackTimeSeconds_ = 0.0;
    noteHasBeenSent_ = false;
    noteIsPlaying_ = false;
    noteOnCount_ = 0;
    noteOffCount_ = 0;

    DBG("[SingleNoteTest] Test reset complete");
    DBG("[SingleNoteTest] =====================================");
}

//==============================================================================
// Logging Implementation
//==============================================================================

void SingleNoteTestProcessor::logPrepare(double sampleRate, int samplesPerBlock)
{
    DBG("[SingleNoteTest] ========================================");
    DBG("[SingleNoteTest] prepareToPlay called:");
    DBG("[SingleNoteTest]   Sample rate: " << sampleRate << " Hz");
    DBG("[SingleNoteTest]   Block size: " << samplesPerBlock << " samples");
    DBG("[SingleNoteTest]   Block duration: "
        << String((samplesPerBlock / sampleRate) * 1000, 1) << " ms");
    DBG("[SingleNoteTest] ========================================");
}

void SingleNoteTestProcessor::logProcessBlock(int numSamples)
{
    DBG("[SingleNoteTest] processBlock: " << numSamples << " samples"
        << " (position=" << String(playbackTimeSeconds_, 3) << "s)"
        << " noteOn=" << noteOnCount_ << " noteOff=" << noteOffCount_);
}

void SingleNoteTestProcessor::logNoteEvent(const juce::String& eventType, int sampleOffset)
{
    DBG("[SingleNoteTest] >>> " << eventType << " <<<"
        << " at sample " << sampleOffset
        << " (time=" << String(playbackTimeSeconds_ + (sampleOffset / sampleRate_), 3) << "s)"
        << " note=" << TEST_MIDI_NOTE
        << " ch=" << TEST_CHANNEL);
}

void SingleNoteTestProcessor::logSummary()
{
    DBG("[SingleNoteTest] ========== TEST SUMMARY ==========");
    DBG("[SingleNoteTest] Note ON events: " << noteOnCount_);
    DBG("[SingleNoteTest] Note OFF events: " << noteOffCount_);
    DBG("[SingleNoteTest] Total playback: " << String(playbackTimeSeconds_, 2) << " seconds");

    if (noteOnCount_ == 1 && noteOffCount_ == 1)
    {
        DBG("[SingleNoteTest] STATUS: ✓ PASS - Note pair complete");
    }
    else if (noteOnCount_ == 1 && noteOffCount_ == 0)
    {
        DBG("[SingleNoteTest] STATUS: ⚠ NOTE ON sent, waiting for NOTE OFF");
    }
    else
    {
        DBG("[SingleNoteTest] STATUS: ✗ FAIL - Unexpected event counts");
    }

    DBG("[SingleNoteTest] ======================================");
}

//==============================================================================
// JUCE Boilerplate
//==============================================================================

// This creates new instances of the plugin
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    DBG("[SingleNoteTest] createPluginFilter() called - creating new processor");
    return new SingleNoteTestProcessor();
}
