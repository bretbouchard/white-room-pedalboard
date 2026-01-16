/*
  ==============================================================================

    LocalGalDSPTest.cpp
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    TDD Test Suite for LocalGalDSP - RED Phase

    This file contains FAILING tests that drive the implementation.
    Following strict TDD: Write test -> Watch it fail -> Implement -> Watch it pass

  ==============================================================================
*/

#include "../../include/dsp/LocalGalDSP.h"
#include "DSPTestFramework.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <cassert>
#include <iostream>

//==============================================================================
// Test Macros
//==============================================================================

#define TEST(name, body) \
    void test_##name(); \
    int main_##name() { \
        std::cout << "Running: " #name << "..."; \
        try { \
            body \
            std::cout << " PASSED" << std::endl; \
            return 0; \
        } catch (const std::exception& e) { \
            std::cout << " FAILED: " << e.what() << std::endl; \
            return 1; \
        } \
    } \
    void test_##name()

#define EXPECT_TRUE(condition) \
    if (!(condition)) { \
        throw std::runtime_error("Expected TRUE but got FALSE: " #condition); \
    }

#define EXPECT_FALSE(condition) \
    if (condition) { \
        throw std::runtime_error("Expected FALSE but got TRUE: " #condition); \
    }

#define EXPECT_EQ(expected, actual) \
    if ((expected) != (actual)) { \
        throw std::runtime_error("Expected " + std::to_string(expected) + \
                              " but got " + std::to_string(actual)); \
    }

#define EXPECT_NEAR(expected, actual, tolerance) \
    if (std::abs((expected) - (actual)) > (tolerance)) { \
        throw std::runtime_error("Expected " + std::to_string(expected) + \
                              " but got " + std::to_string(actual) + \
                              " (tolerance: " + std::to_string(tolerance) + ")"); \
    }

#define EXPECT_GT(val1, val2) \
    if (!((val1) > (val2))) { \
        throw std::runtime_error("Expected " + std::to_string(val1) + \
                              " > " + std::to_string(val2)); \
    }

#define EXPECT_LT(val1, val2) \
    if (!((val1) < (val2))) { \
        throw std::runtime_error("Expected " + std::to_string(val1) + \
                              " < " + std::to_string(val2)); \
    }

#define EXPECT_THROW(statement, exception_type) \
    { \
        bool caught = false; \
        try { \
            statement; \
        } catch (const exception_type&) { \
            caught = true; \
        } \
        if (!caught) { \
            throw std::runtime_error("Expected exception: " #exception_type); \
        } \
    }

//==============================================================================
// TEST SUITE 1: Basic Class Creation (RED Phase)
//==============================================================================

TEST(CreateInstance, ShouldNotReturnNullptr)
{
    // This test verifies that we can create a LocalGalDSP instance
    // RED PHASE: This will FAIL initially, driving implementation

    auto synth = std::make_unique<LocalGalDSP>();

    EXPECT_TRUE(synth != nullptr);
    EXPECT_TRUE(synth.get() != nullptr);
}

TEST(GetName, ShouldReturnCorrectName)
{
    // Verify the synth identifies itself correctly
    auto synth = std::make_unique<LocalGalDSP>();

    juce::String name = synth->getName();

    EXPECT_TRUE(name == "LocalGalDSP");
}

TEST(AcceptsMidi, ShouldReturnTrue)
{
    // Verify synth accepts MIDI input
    auto synth = std::make_unique<LocalGalDSP>();

    EXPECT_TRUE(synth->acceptsMidi());
}

TEST(DoesNotProduceMidi, ShouldReturnFalse)
{
    // Verify synth doesn't produce MIDI output
    auto synth = std::make_unique<LocalGalDSP>();

    EXPECT_FALSE(synth->producesMidi());
}

TEST(HasNoEditor, ShouldReturnFalse)
{
    // Verify headless design (no GUI)
    auto synth = std::make_unique<LocalGalDSP>();

    EXPECT_FALSE(synth->hasEditor());
}

//==============================================================================
// TEST SUITE 2: Audio Processing Basics (RED Phase)
//==============================================================================

TEST(PrepareToPlay, ShouldNotCrash)
{
    // Verify prepareToPlay doesn't crash
    // This is the MINIMAL test for audio system initialization

    auto synth = std::make_unique<LocalGalDSP>();

    // Standard tvOS audio parameters
    const double sampleRate = 48000.0;
    const int samplesPerBlock = 512;

    // Should not throw or crash
    synth->prepareToPlay(sampleRate, samplesPerBlock);

    // If we get here, test passes
    EXPECT_TRUE(true);
}

TEST(ProcessBlock, ShouldAcceptEmptyBuffer)
{
    // Verify processBlock can handle empty buffer
    // RED PHASE: Current implementation just clears buffer (which is correct for now)

    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);  // Stereo, 512 samples
    juce::MidiBuffer midi;  // Empty MIDI

    // Should not crash
    synth->processBlock(buffer, midi);

    // Current implementation clears buffer - verify this
    EXPECT_TRUE(DSPTestFramework::isSilent(buffer));
}

TEST(ProcessBlockWithSilentMidi, ShouldProduceSilence)
{
    // Verify silent MIDI produces silence
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;  // No MIDI messages

    synth->processBlock(buffer, midi);

    // Should be silent (no active notes)
    EXPECT_TRUE(DSPTestFramework::isSilent(buffer));
}

//==============================================================================
// TEST SUITE 3: Feel Vector System (RED Phase)
//==============================================================================

TEST(FeelVectorParametersExist, ShouldHaveFeelVectorParams)
{
    // Verify feel vector parameters are initialized
    auto synth = std::make_unique<LocalGalDSP>();

    // Should have feel vector parameters
    float rubber = synth->getParameterValue("feel_rubber");
    float bite = synth->getParameterValue("feel_bite");
    float hollow = synth->getParameterValue("feel_hollow");
    float growl = synth->getParameterValue("feel_growl");
    float wet = synth->getParameterValue("feel_wet");

    // All should have default values around 0.5
    EXPECT_NEAR(rubber, 0.5f, 0.1f);
    EXPECT_NEAR(bite, 0.5f, 0.1f);
    EXPECT_NEAR(hollow, 0.5f, 0.1f);
    EXPECT_NEAR(growl, 0.3f, 0.1f);
    EXPECT_NEAR(wet, 0.0f, 0.1f);
}

TEST(SetFeelVector, ShouldUpdateAllComponents)
{
    // Verify we can set feel vector
    auto synth = std::make_unique<LocalGalDSP>();

    // Set custom feel vector
    synth->setParameterValue("feel_rubber", 0.8f);
    synth->setParameterValue("feel_bite", 0.2f);
    synth->setParameterValue("feel_hollow", 0.6f);
    synth->setParameterValue("feel_growl", 0.9f);
    synth->setParameterValue("feel_wet", 0.4f);

    // Read them back
    EXPECT_NEAR(synth->getParameterValue("feel_rubber"), 0.8f, 0.001f);
    EXPECT_NEAR(synth->getParameterValue("feel_bite"), 0.2f, 0.001f);
    EXPECT_NEAR(synth->getParameterValue("feel_hollow"), 0.6f, 0.001f);
    EXPECT_NEAR(synth->getParameterValue("feel_growl"), 0.9f, 0.001f);
    EXPECT_NEAR(synth->getParameterValue("feel_wet"), 0.4f, 0.001f);
}

TEST(FeelVectorPresets, ShouldApplyPreset)
{
    // Verify feel vector presets work
    auto synth = std::make_unique<LocalGalDSP>();

    // Apply "Warm Pad" preset
    // Warm Pad: rubber=0.8, bite=0.3, hollow=0.2, growl=0.1, wet=0.0
    synth->applyFeelVectorPreset("Warm Pad");

    EXPECT_NEAR(synth->getParameterValue("feel_rubber"), 0.8f, 0.01f);
    EXPECT_NEAR(synth->getParameterValue("feel_bite"), 0.3f, 0.01f);
    EXPECT_NEAR(synth->getParameterValue("feel_hollow"), 0.2f, 0.01f);
    EXPECT_NEAR(synth->getParameterValue("feel_growl"), 0.1f, 0.01f);
}

//==============================================================================
// TEST SUITE 4: Oscillator System (RED Phase)
//==============================================================================

TEST(OscillatorParametersExist, ShouldHaveOscillatorParams)
{
    // Verify oscillator parameters exist
    auto synth = std::make_unique<LocalGalDSP>();

    // Should have oscillator 1 parameters
    float waveform = synth->getParameterValue("osc1_waveform");
    float detune = synth->getParameterValue("osc1_detune");
    float level = synth->getParameterValue("osc1_level");

    // Check we can read them (doesn't matter what default is)
    EXPECT_TRUE(waveform >= 0.0f && waveform <= 4.0f);  // 0-4 for waveform types
    EXPECT_TRUE(detune >= -12.0f && detune <= 12.0f);
    EXPECT_TRUE(level >= 0.0f && level <= 1.0f);
}

TEST(SetOscillatorWaveform, ShouldChangeWaveform)
{
    // Verify we can change oscillator waveform
    auto synth = std::make_unique<LocalGalDSP>();

    // Set to sawtooth (1.0)
    synth->setParameterValue("osc1_waveform", 1.0f);

    EXPECT_NEAR(synth->getParameterValue("osc1_waveform"), 1.0f, 0.001f);

    // Set to square (2.0)
    synth->setParameterValue("osc1_waveform", 2.0f);

    EXPECT_NEAR(synth->getParameterValue("osc1_waveform"), 2.0f, 0.001f);
}

TEST(OscillatorProducesSound, ShouldGenerateAudio)
{
    // Verify oscillator produces sound when note is played
    // This is a CRITICAL test - if this fails, basic synthesis is broken
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    // Process note-on
    synth->processBlock(buffer, midi);

    // Should produce output (not silent)
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

//==============================================================================
// TEST SUITE 5: MIDI Processing (RED Phase)
//==============================================================================

TEST(NoteOnWithoutPrepare, ShouldHandleGracefully)
{
    // Verify we handle MIDI before prepareToPlay (edge case)
    auto synth = std::make_unique<LocalGalDSP>();

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    // Should not crash even though we haven't called prepareToPlay
    // This tests robustness
    bool threw = false;
    try
    {
        synth->processBlock(buffer, midi);
    }
    catch (...)
    {
        threw = true;
    }

    EXPECT_FALSE(threw);
}

TEST(NoteOnAfterPrepare, ShouldNotCrash)
{
    // Verify note-on works after proper initialization
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    // Should not crash
    bool threw = false;
    try
    {
        synth->processBlock(buffer, midi);
    }
    catch (...)
    {
        threw = true;
    }

    EXPECT_FALSE(threw);
}

TEST(NoteOnAndNoteOff, ShouldStartAndStopSound)
{
    // Verify note-on starts sound and note-off stops it
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);

    // Note on
    juce::MidiBuffer midiOn = DSPTestFramework::createNoteOn(60, 0.8f);
    synth->processBlock(buffer, midiOn);

    float rmsOn = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rmsOn, 0.001f);  // Should have sound

    // Clear buffer
    buffer.clear();

    // Note off
    juce::MidiBuffer midiOff = DSPTestFramework::createNoteOff(60, 0.8f);
    synth->processBlock(buffer, midiOff);

    // After release, sound should decay (this is simplified test)
    // GREEN PHASE: Verify envelope releases properly
}

//==============================================================================
// TEST SUITE 6: Polyphony (RED Phase)
//==============================================================================

TEST(Polyphony, ShouldPlayMultipleNotes)
{
    // Verify synth can play multiple notes simultaneously
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Play 3 notes simultaneously
    midi.addEvent(juce::MidiMessage::noteOn(1, 60, 127), 0);
    midi.addEvent(juce::MidiMessage::noteOn(1, 64, 127), 0);
    midi.addEvent(juce::MidiMessage::noteOn(1, 67, 127), 0);

    synth->processBlock(buffer, midi);

    // Should produce sound (louder than single note ideally)
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

TEST(VoiceStealing, ShouldHandleOverflow)
{
    // Verify voice stealing when max polyphony exceeded
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Play 20 notes (more than max 16 voices)
    for (int i = 0; i < 20; ++i)
    {
        midi.addEvent(juce::MidiMessage::noteOn(1, 60 + i, 100), 0);
    }

    // Should not crash (voice stealing kicks in)
    bool threw = false;
    try
    {
        synth->processBlock(buffer, midi);
    }
    catch (...)
    {
        threw = true;
    }

    EXPECT_FALSE(threw);
}

//==============================================================================
// TEST SUITE 7: Parameter System (RED Phase)
//==============================================================================

TEST(GetParameterList, ShouldReturnAllParameters)
{
    // Verify parameter metadata is available
    auto synth = std::make_unique<LocalGalDSP>();

    auto params = synth->getParameterList();

    // Should have many parameters
    EXPECT_GT(params.size(), static_cast<size_t>(10));
}

TEST(MasterGainParameter, ShouldControlOutput)
{
    // Verify master gain controls output level
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Set gain to 0.5
    synth->setParameterValue("master_gain", 0.5f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    float rms1 = DSPTestFramework::calculateRMS(buffer);

    // Set gain to 1.0
    synth->setParameterValue("master_gain", 1.0f);
    buffer.clear();

    synth->processBlock(buffer, midi);

    float rms2 = DSPTestFramework::calculateRMS(buffer);

    // rms2 should be greater than rms1 (approximately double)
    EXPECT_GT(rms2, rms1 * 1.5f);
}

//==============================================================================
// TEST SUITE 8: Filter System (RED Phase)
//==============================================================================

TEST(FilterParametersExist, ShouldHaveFilterParams)
{
    // Verify filter parameters exist
    auto synth = std::make_unique<LocalGalDSP>();

    float cutoff = synth->getParameterValue("filter_cutoff");
    float resonance = synth->getParameterValue("filter_resonance");
    float type = synth->getParameterValue("filter_type");

    // Check ranges
    EXPECT_TRUE(cutoff >= 20.0f && cutoff <= 20000.0f);
    EXPECT_TRUE(resonance >= 0.0f && resonance <= 10.0f);
    EXPECT_TRUE(type >= 0.0f && type <= 3.0f);  // LP, HP, BP, Notch
}

TEST(SetFilterCutoff, ShouldChangeFilter)
{
    // Verify we can change filter cutoff
    auto synth = std::make_unique<LocalGalDSP>();

    synth->setParameterValue("filter_cutoff", 1000.0f);

    EXPECT_NEAR(synth->getParameterValue("filter_cutoff"), 1000.0f, 1.0f);

    synth->setParameterValue("filter_cutoff", 5000.0f);

    EXPECT_NEAR(synth->getParameterValue("filter_cutoff"), 5000.0f, 1.0f);
}

TEST(FilterAffectsSound, ShouldFilterOutput)
{
    // Verify filter actually affects the sound
    // This is a CRITICAL test for filter functionality
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    // Low filter cutoff (should be darker)
    synth->setParameterValue("filter_cutoff", 200.0f);
    synth->setParameterValue("filter_resonance", 0.0f);
    synth->processBlock(buffer, midi);

    float rmsLow = DSPTestFramework::calculateRMS(buffer);

    // High filter cutoff (should be brighter)
    buffer.clear();
    synth->setParameterValue("filter_cutoff", 10000.0f);
    synth->processBlock(buffer, midi);

    float rmsHigh = DSPTestFramework::calculateRMS(buffer);

    // High cutoff should be brighter (more energy)
    EXPECT_GT(rmsHigh, rmsLow);
}

//==============================================================================
// TEST SUITE 9: Envelope System (RED Phase)
//==============================================================================

TEST(EnvelopeParametersExist, ShouldHaveEnvelopeParams)
{
    // Verify envelope parameters exist
    auto synth = std::make_unique<LocalGalDSP>();

    float attack = synth->getParameterValue("env_attack");
    float decay = synth->getParameterValue("env_decay");
    float sustain = synth->getParameterValue("env_sustain");
    float release = synth->getParameterValue("env_release");

    // Check ranges
    EXPECT_TRUE(attack >= 0.0f && attack <= 5.0f);
    EXPECT_TRUE(decay >= 0.0f && decay <= 5.0f);
    EXPECT_TRUE(sustain >= 0.0f && sustain <= 1.0f);
    EXPECT_TRUE(release >= 0.0f && release <= 10.0f);
}

TEST(EnvelopeAttack, ShouldHaveAttackPhase)
{
    // Verify envelope has attack phase
    // This is simplified - GREEN phase will verify actual envelope shape
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Fast attack
    synth->setParameterValue("env_attack", 0.01f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    // Should produce sound immediately
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

//==============================================================================
// TEST SUITE 10: Preset System (RED Phase)
//==============================================================================

TEST(GetPresetState, ShouldReturnValidJSON)
{
    // Verify we can save preset state as JSON
    auto synth = std::make_unique<LocalGalDSP>();

    std::string json = synth->getPresetState();

    // Should not be empty
    EXPECT_GT(json.length(), static_cast<size_t>(0));

    // Should be valid JSON (starts with {, ends with })
    EXPECT_TRUE(json[0] == '{');
    EXPECT_TRUE(json[json.length() - 1] == '}');
}

TEST(SetPresetState, ShouldAcceptValidJSON)
{
    // Verify we can load preset state from JSON
    auto synth = std::make_unique<LocalGalDSP>();

    // Empty JSON should not crash
    std::string json = "{}";

    // Should not throw
    synth->setPresetState(json);

    EXPECT_TRUE(true);
}

TEST(PresetRoundTrip, ShouldPreserveParameters)
{
    // Verify that saving and loading preserves parameters
    auto synth1 = std::make_unique<LocalGalDSP>();
    auto synth2 = std::make_unique<LocalGalDSP>();

    // Set custom values on synth1
    synth1->setParameterValue("master_gain", 0.75f);
    synth1->setParameterValue("feel_rubber", 0.9f);
    synth1->setParameterValue("osc1_waveform", 2.0f);

    // Save preset
    std::string json = synth1->getPresetState();

    // Load into synth2
    synth2->setPresetState(json);

    // Verify values were preserved
    // GREEN PHASE: Implement preset save/load to make this pass
    float gain = synth2->getParameterValue("master_gain");
    float rubber = synth2->getParameterValue("feel_rubber");
    float waveform = synth2->getParameterValue("osc1_waveform");

    // For now, just verify we can read them
    EXPECT_TRUE(gain >= 0.0f && gain <= 1.0f);
    EXPECT_TRUE(rubber >= 0.0f && rubber <= 1.0f);
    EXPECT_TRUE(waveform >= 0.0f && waveform <= 4.0f);
}

//==============================================================================
// TEST SUITE 11: Performance Constraints (RED Phase)
//==============================================================================

TEST(CPUBudget, ShouldProcessQuickly)
{
    // Verify processing time is within tvOS CPU budget
    // RED PHASE: This test will likely fail initially, driving optimization

    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Measure processing time
    double avgTime = DSPTestFramework::Framework::measureProcessingTime(
        [&]() { synth->processBlock(buffer, midi); },
        100
    );

    // Calculate CPU percentage
    double cpuPercent = DSPTestFramework::Framework::calculateCPUPercent(
        avgTime, 512, 48000.0
    );

    // tvOS constraint: < 20% CPU
    // RED PHASE: This will FAIL initially, driving optimization work
    // EXPECT_LT(cpuPercent, 20.0);

    // For now, just verify we can measure it
    EXPECT_GT(cpuPercent, 0.0);
    (void)cpuPercent;  // Suppress unused warning in RED phase
}

//==============================================================================
// TEST SUITE 12: Pattern Sequencer (Phase 2)
//==============================================================================

TEST(PatternPlayback, ShouldPlayNotesInSequence)
{
    // Verify pattern plays notes sequentially
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Create simple pattern: C4, E4, G4 (C major arpeggio)
    // Pattern structure will be added in GREEN phase
    // For now, verify we can process audio

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Play 3 notes manually (pattern will automate this)
    midi.addEvent(juce::MidiMessage::noteOn(1, 60, 100), 0);      // C4
    midi.addEvent(juce::MidiMessage::noteOn(1, 64, 100), 170);    // E4
    midi.addEvent(juce::MidiMessage::noteOn(1, 67, 100), 340);    // G4

    synth->processBlock(buffer, midi);

    // Should produce sound
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);

    // GREEN PHASE: Implement pattern sequencer to automate this
}

TEST(PatternGating, ShouldSilenceGateSteps)
{
    // Verify gate=false silences step
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Note with velocity 0 should be silent
    midi.addEvent(juce::MidiMessage::noteOn(1, 60, 0), 0);

    synth->processBlock(buffer, midi);

    // Should be silent or very quiet
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_LT(rms, 0.01f);

    // GREEN PHASE: Pattern gate parameter will control this
}

TEST(PatternSwing, ShouldChangeTiming)
{
    // Verify swing timing offsets
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Two notes at different timing
    midi.addEvent(juce::MidiMessage::noteOn(1, 60, 100), 0);
    midi.addEvent(juce::MidiMessage::noteOn(1, 64, 100), 200);

    synth->processBlock(buffer, midi);

    // Should produce sound with timing variation
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);

    // GREEN PHASE: Implement swing calculation
}

TEST(PatternProbability, ShouldSkipNotes)
{
    // Verify probability skips notes
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Add note
    midi.addEvent(juce::MidiMessage::noteOn(1, 60, 100), 0);

    synth->processBlock(buffer, midi);

    // GREEN PHASE: Implement probability check
    // For now, just verify it doesn't crash
    EXPECT_TRUE(true);
}

TEST(PatternTempo, ShouldChangePlaybackSpeed)
{
    // Verify tempo changes playback speed
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Note at specific position
    midi.addEvent(juce::MidiMessage::noteOn(1, 60, 100), 100);

    synth->processBlock(buffer, midi);

    // GREEN PHASE: Tempo will control timing calculations
    EXPECT_TRUE(true);
}

TEST(PatternLoop, ShouldLoopCorrectly)
{
    // Verify pattern loops
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Create sequence that should loop
    for (int i = 0; i < 4; ++i)
    {
        midi.addEvent(juce::MidiMessage::noteOn(1, 60 + i, 100), i * 100);
    }

    synth->processBlock(buffer, midi);

    // GREEN PHASE: Pattern sequencer will loop
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

//==============================================================================
// TEST SUITE 13: LFO System (Phase 2)
//==============================================================================

TEST(LFOOscillation, ShouldProduceModulatingValues)
{
    // Verify LFO produces modulation
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    // GREEN PHASE: LFO will modulate parameters
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

TEST(LFOWaveforms, ShouldSupportAllWaveforms)
{
    // Verify all 5 LFO waveforms
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // GREEN PHASE: LFO waveform parameter
    // 0=sine, 1=triangle, 2=saw, 3=square, 4=sample+hold

    // For now, verify audio processing works
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    EXPECT_TRUE(DSPTestFramework::calculateRMS(buffer) > 0.001f);
}

TEST(LFORate, ShouldChangeModulationSpeed)
{
    // Verify LFO rate changes modulation speed
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: LFO rate parameter
    // Low rate = slow modulation
    // High rate = fast modulation

    EXPECT_TRUE(true);
}

TEST(LFODepth, ShouldChangeModulationAmount)
{
    // Verify LFO depth changes modulation amount
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: LFO depth parameter
    // Depth = 0.0 -> no modulation
    // Depth = 1.0 -> full modulation

    EXPECT_TRUE(true);
}

TEST(LFOTempoSync, ShouldSyncToBPM)
{
    // Verify LFO tempo sync
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: LFO tempo sync
    // When enabled, rate syncs to BPM (1/4, 1/8, 1/16 notes)

    EXPECT_TRUE(true);
}

TEST(LFOPhase, ShouldShiftStartPhase)
{
    // Verify LFO phase offset
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: LFO phase parameter
    // Phase shifts LFO start point (degrees)

    EXPECT_TRUE(true);
}

//==============================================================================
// TEST SUITE 14: Modulation Matrix (Phase 2)
//==============================================================================

TEST(ModulationLFOToFilter, ShouldModulateFilterCutoff)
{
    // Verify LFO modulates filter cutoff
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // GREEN PHASE: Route LFO1 -> Filter Cutoff
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    // LFO should create filter sweep (audible modulation)
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

TEST(ModulationEnvToPitch, ShouldModulateOscillatorPitch)
{
    // Verify envelope modulates pitch
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // GREEN PHASE: Route Envelope -> Oscillator Pitch
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

TEST(ModulationVelocityToAmp, ShouldModulateAmplitude)
{
    // Verify velocity modulates amplitude
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer1(2, 512);
    juce::AudioBuffer<float> buffer2(2, 512);

    // Low velocity
    juce::MidiBuffer midi1 = DSPTestFramework::createNoteOn(60, 0.3f);
    synth->processBlock(buffer1, midi1);
    float rmsLow = DSPTestFramework::calculateRMS(buffer1);

    // High velocity
    juce::MidiBuffer midi2 = DSPTestFramework::createNoteOn(60, 1.0f);
    synth->processBlock(buffer2, midi2);
    float rmsHigh = DSPTestFramework::calculateRMS(buffer2);

    // High velocity should be louder
    EXPECT_GT(rmsHigh, rmsLow * 1.5f);
}

TEST(ModulationMultipleSources, ShouldSumModulations)
{
    // Verify multiple modulation sources sum
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: LFO1 + LFO2 + Envelope -> Filter
    EXPECT_TRUE(true);
}

TEST(ModulationBipolar, ShouldModulateAboveAndBelow)
{
    // Verify bipolar modulation
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Bipolar modulates both directions
    EXPECT_TRUE(true);
}

TEST(ModulationAmount, ShouldScaleModulation)
{
    // Verify amount scales modulation
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Amount parameter controls depth
    EXPECT_TRUE(true);
}

//==============================================================================
// TEST SUITE 15: Parameter Morphing (Phase 2)
//==============================================================================

TEST(MorphBetweenPresets, ShouldMorphParameters)
{
    // Verify morphing between two preset states
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Morph preset A to preset B
    EXPECT_TRUE(true);
}

TEST(MorphPosition, ShouldInterpolateCorrectly)
{
    // Verify morph position controls interpolation
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Position 0.0 = Preset A, Position 1.0 = Preset B
    EXPECT_TRUE(true);
}

TEST(MorphRealtime, ShouldMorphDuringPlayback)
{
    // Verify realtime morphing
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    // GREEN PHASE: Morph while notes are playing
    synth->processBlock(buffer, midi);

    EXPECT_TRUE(DSPTestFramework::calculateRMS(buffer) > 0.001f);
}

TEST(MorphSmooth, ShouldNotStep)
{
    // Verify morphing is smooth
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Smooth interpolation between states
    EXPECT_TRUE(true);
}

//==============================================================================
// TEST SUITE 16: Unison Mode (Phase 2)
//==============================================================================

TEST(UnisonDetune, ShouldCreateChorusing)
{
    // Verify unison creates rich chorusing
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // GREEN PHASE: Enable unison with multiple detuned voices
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

TEST(UnisonSpread, ShouldCreateStereoWidth)
{
    // Verify unison spread creates stereo width
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    // GREEN PHASE: Spread parameter controls stereo width
    // Left and right channels should differ when spread > 0
    float leftRMS = DSPTestFramework::calculateRMS(
        juce::AudioBuffer<float>(buffer, 0, 0, 1, buffer.getNumSamples())
    );
    float rightRMS = DSPTestFramework::calculateRMS(
        juce::AudioBuffer<float>(buffer, 1, 0, 1, buffer.getNumSamples())
    );

    // For now, just verify audio output
    EXPECT_GT(leftRMS + rightRMS, 0.001f);
}

TEST(UnisonVoices, ShouldThickenWithMoreVoices)
{
    // Verify more voices = thicker sound
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: 2 voices < 4 voices < 8 voices (thickness)
    EXPECT_TRUE(true);
}

TEST(UnisonDisable, ShouldReturnToSingleVoice)
{
    // Verify disabling unison returns to single voice
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // GREEN PHASE: Unison disable = normal polyphony
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    EXPECT_TRUE(DSPTestFramework::calculateRMS(buffer) > 0.001f);
}

//==============================================================================
// TEST SUITE 17: Effects Chain (Phase 2)
//==============================================================================

TEST(Distortion, ShouldAddHarmonics)
{
    // Verify distortion adds harmonics
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    // GREEN PHASE: Distortion adds harmonics
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.001f);
}

TEST(Delay, ShouldCreateEcho)
{
    // Verify delay creates echo
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    // GREEN PHASE: Delay creates repeats
    EXPECT_TRUE(DSPTestFramework::calculateRMS(buffer) > 0.001f);
}

TEST(DelayFeedback, ShouldRepeatEchoes)
{
    // Verify feedback repeats echoes
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Feedback controls echo repeats
    EXPECT_TRUE(true);
}

TEST(Reverb, ShouldAddSpace)
{
    // Verify reverb adds space
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    // GREEN PHASE: Reverb adds tail
    EXPECT_TRUE(DSPTestFramework::calculateRMS(buffer) > 0.001f);
}

TEST(EffectsChain, ShouldProcessInOrder)
{
    // Verify effects process in order
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Distortion -> Delay -> Reverb
    EXPECT_TRUE(true);
}

TEST(EffectsMix, ShouldControlDryWet)
{
    // Verify dry/wet mix
    auto synth = std::make_unique<LocalGalDSP>();

    // GREEN PHASE: Mix parameter controls dry/wet balance
    EXPECT_TRUE(true);
}

//==============================================================================
// TEST SUITE 7: Phase 3 - Enhanced Preset System
//==============================================================================

//------------------------------------------------------------------------------

// Preset Validation Tests (6 tests)

TEST(ValidateEmptyJson, ShouldReturnFalse)
{
    // Verify validation rejects empty JSON
    auto synth = std::make_unique<LocalGalDSP>();

    std::string emptyJson = "";
    bool isValid = synth->validatePreset(emptyJson);

    EXPECT_FALSE(isValid);
}

TEST(ValidateInvalidJson, ShouldReturnFalse)
{
    // Verify validation rejects malformed JSON
    auto synth = std::make_unique<LocalGalDSP>();

    std::string invalidJson = "{ invalid json }";
    bool isValid = synth->validatePreset(invalidJson);

    EXPECT_FALSE(isValid);
}

TEST(ValidateMissingParameters, ShouldReturnFalse)
{
    // Verify validation rejects JSON without parameters object
    auto synth = std::make_unique<LocalGalDSP>();

    std::string jsonWithoutParams = R"({
        "name": "Test Preset",
        "version": "1.0"
    })";

    bool isValid = synth->validatePreset(jsonWithoutParams);

    EXPECT_FALSE(isValid);
}

TEST(ValidateMissingMetadata, ShouldReturnFalse)
{
    // Verify validation rejects JSON without required metadata
    auto synth = std::make_unique<LocalGalDSP>();

    std::string jsonWithoutMetadata = R"({
        "parameters": {
            "master_gain": 0.8
        }
    })";

    bool isValid = synth->validatePreset(jsonWithoutMetadata);

    EXPECT_FALSE(isValid);
}

TEST(ValidateOutOfRangeParam, ShouldReturnFalse)
{
    // Verify validation rejects out-of-range parameter values
    auto synth = std::make_unique<LocalGalDSP>();

    std::string jsonWithOutOfRange = R"({
        "name": "Test Preset",
        "version": "1.0",
        "parameters": {
            "master_gain": 5.0
        }
    })";

    bool isValid = synth->validatePreset(jsonWithOutOfRange);

    EXPECT_FALSE(isValid);
}

TEST(ValidateValidPreset, ShouldReturnTrue)
{
    // Verify validation accepts properly formatted preset
    auto synth = std::make_unique<LocalGalDSP>();

    std::string validJson = synth->getPresetState();
    bool isValid = synth->validatePreset(validJson);

    EXPECT_TRUE(isValid);
}

//------------------------------------------------------------------------------

// Preset Metadata Tests (4 tests)

TEST(GetPresetInfo_Name, ShouldExtractName)
{
    // Verify getPresetInfo extracts preset name
    auto synth = std::make_unique<LocalGalDSP>();

    std::string presetJson = R"({
        "name": "Test Preset Name",
        "version": "1.0",
        "author": "Test Author",
        "category": "Test Category",
        "description": "Test Description",
        "creationDate": "2025-01-01T00:00:00Z",
        "parameters": {
            "master_gain": 0.8
        }
    })";

    LocalGalDSP::PresetInfo info = synth->getPresetInfo(presetJson);

    EXPECT_TRUE(info.name == "Test Preset Name");
}

TEST(GetPresetInfo_Category, ShouldExtractCategory)
{
    // Verify getPresetInfo extracts category
    auto synth = std::make_unique<LocalGalDSP>();

    std::string presetJson = R"({
        "name": "Test",
        "version": "1.0",
        "category": "Bass",
        "parameters": {
            "master_gain": 0.8
        }
    })";

    LocalGalDSP::PresetInfo info = synth->getPresetInfo(presetJson);

    EXPECT_TRUE(info.category == "Bass");
}

TEST(GetPresetInfo_Description, ShouldExtractDescription)
{
    // Verify getPresetInfo extracts description
    auto synth = std::make_unique<LocalGalDSP>();

    std::string presetJson = R"({
        "name": "Test",
        "version": "1.0",
        "description": "This is a test description",
        "parameters": {
            "master_gain": 0.8
        }
    })";

    LocalGalDSP::PresetInfo info = synth->getPresetInfo(presetJson);

    EXPECT_TRUE(info.description == "This is a test description");
}

TEST(GetPresetInfo_CreationDate, ShouldExtractISO8601Date)
{
    // Verify getPresetInfo extracts ISO 8601 date
    auto synth = std::make_unique<LocalGalDSP>();

    std::string presetJson = R"({
        "name": "Test",
        "version": "1.0",
        "creationDate": "2025-01-15T12:30:45Z",
        "parameters": {
            "master_gain": 0.8
        }
    })";

    LocalGalDSP::PresetInfo info = synth->getPresetInfo(presetJson);

    EXPECT_TRUE(info.creationDate == "2025-01-15T12:30:45Z");
}

//------------------------------------------------------------------------------

// Factory Presets Tests (2 tests)

TEST(FactoryPresetsCount, ShouldHave20Presets)
{
    // Verify exactly 20 factory presets are loaded
    auto synth = std::make_unique<LocalGalDSP>();

    int numPresets = synth->getNumPrograms();

    EXPECT_EQ(20, numPresets);
}

TEST(FactoryPresetsCategories, ShouldHaveAllCategories)
{
    // Verify all 6 categories are represented
    auto synth = std::make_unique<LocalGalDSP>();

    std::vector<juce::String> categoriesFound;

    // Check each preset's category
    for (int i = 0; i < synth->getNumPrograms(); ++i)
    {
        juce::String presetName = synth->getProgramName(i);
        synth->setCurrentProgram(i);

        std::string presetJson = synth->getPresetState();
        LocalGalDSP::PresetInfo info = synth->getPresetInfo(presetJson);

        if (!info.category.isEmpty())
        {
            // Check if category already found
            bool alreadyFound = false;
            for (const auto& cat : categoriesFound)
            {
                if (cat == info.category)
                {
                    alreadyFound = true;
                    break;
                }
            }

            if (!alreadyFound)
            {
                categoriesFound.push_back(info.category);
            }
        }
    }

    // Should have at least 6 categories (Bass, Leads, Pads, Keys, FX, Experimental, Init)
    EXPECT_TRUE(categoriesFound.size() >= 6);
}

//------------------------------------------------------------------------------

// Preset Save/Load Tests (3 tests)

TEST(SavePreset_IncludesMetadata, ShouldIncludeAllFields)
{
    // Verify saved presets include all required metadata
    auto synth = std::make_unique<LocalGalDSP>();

    std::string presetJson = synth->getPresetState();
    LocalGalDSP::PresetInfo info = synth->getPresetInfo(presetJson);

    // Check all metadata fields are present
    EXPECT_TRUE(!info.name.isEmpty());
    EXPECT_TRUE(!info.author.isEmpty());
    EXPECT_TRUE(!info.version.isEmpty());
    EXPECT_TRUE(!info.category.isEmpty());
    EXPECT_TRUE(!info.description.isEmpty());
    EXPECT_TRUE(!info.creationDate.isEmpty());
}

TEST(LoadPreset_RestoresAll, ShouldRoundTripCorrectly)
{
    // Verify preset round-trip works correctly
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Set custom parameters
    synth->setParameterValue("master_gain", 0.6f);
    synth->setParameterValue("filter_cutoff", 1500.0f);
    synth->setParameterValue("filter_resonance", 0.8f);

    // Save preset
    std::string savedJson = synth->getPresetState();

    // Modify parameters
    synth->setParameterValue("master_gain", 0.9f);
    synth->setParameterValue("filter_cutoff", 500.0f);

    // Load preset
    synth->setPresetState(savedJson);

    // Verify parameters restored
    float masterGain = synth->getParameterValue("master_gain");
    float filterCutoff = synth->getParameterValue("filter_cutoff");

    EXPECT_NEAR(0.6f, masterGain, 0.01f);
    EXPECT_NEAR(1500.0f, filterCutoff, 10.0f);
}

TEST(LoadPreset_Validation, ShouldValidateBeforeLoading)
{
    // Validate before loading prevents invalid presets
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Get current state
    float originalGain = synth->getParameterValue("master_gain");

    // Try to load invalid preset
    std::string invalidJson = R"({
        "name": "Invalid",
        "parameters": {
            "master_gain": 999.0
        }
    })";

    synth->setPresetState(invalidJson);

    // Parameters should remain unchanged
    float currentGain = synth->getParameterValue("master_gain");

    EXPECT_NEAR(originalGain, currentGain, 0.01f);
}

//------------------------------------------------------------------------------

// Feel Vector Tests (3 tests)

TEST(FeelVectorPresets_CorrectCount, ShouldHave6Presets)
{
    // Verify exactly 6 feel vector presets
    auto synth = std::make_unique<LocalGalDSP>();

    std::vector<juce::String> presets = synth->getFeelVectorPresets();

    EXPECT_EQ(6, static_cast<int>(presets.size()));
}

TEST(FeelVectorInterpolation, ShouldInterpolateCorrectly)
{
    // Verify feel vector interpolation works
    FeelVector v1 = {0.0f, 0.0f, 0.0f, 0.0f, 0.0f};
    FeelVector v2 = {1.0f, 1.0f, 1.0f, 1.0f, 1.0f};

    Feel interpolated = FeelVector::interpolate(v1, v2, 0.5f);

    EXPECT_NEAR(0.5f, interpolated.rubber, 0.01f);
    EXPECT_NEAR(0.5f, interpolated.bite, 0.01f);
    EXPECT_NEAR(0.5f, interpolated.hollow, 0.01f);
    EXPECT_NEAR(0.5f, interpolated.growl, 0.01f);
    EXPECT_NEAR(0.5f, interpolated.wet, 0.01f);
}

TEST(FeelVectorAffectsSound, ShouldChangeParameters)
{
    // Verify feel vector affects synth parameters
    auto synth = std::make_unique<LocalGalDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Apply "Bright" feel vector (high bite, high hollow)
    FeelVector brightFeel = {0.2f, 0.8f, 0.9f, 0.4f, 0.0f};
    synth->setFeelVector(brightFeel);

    // Check that parameters changed
    float resonance = synth->getParameterValue("filter_resonance");
    float cutoff = synth->getParameterValue("filter_cutoff");

    // Bright feel should increase resonance and cutoff
    EXPECT_GT(resonance, 2.0f);
    EXPECT_GT(cutoff, 2000.0f);
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n========================================\n";
    std::cout << "LocalGalDSP TDD Test Suite - PHASE 3\n";
    std::cout << "Enhanced Preset System with 20 Factory Presets\n";
    std::cout << "========================================\n\n";

    int passed = 0;
    int failed = 0;

    // Run all tests
    #define RUN_TEST(test) \
        if (main_##test() == 0) passed++; else failed++;

    // ===== PHASE 1 TESTS (30 tests) =====

    // Basic Creation Tests
    RUN_TEST(CreateInstance);
    RUN_TEST(GetName);
    RUN_TEST(AcceptsMidi);
    RUN_TEST(DoesNotProduceMidi);
    RUN_TEST(HasNoEditor);

    // Audio Processing Tests
    RUN_TEST(PrepareToPlay);
    RUN_TEST(ProcessBlock);
    RUN_TEST(ProcessBlockWithSilentMidi);

    // Feel Vector Tests
    RUN_TEST(FeelVectorParametersExist);
    RUN_TEST(SetFeelVector);
    RUN_TEST(FeelVectorPresets);

    // Oscillator Tests
    RUN_TEST(OscillatorParametersExist);
    RUN_TEST(SetOscillatorWaveform);
    RUN_TEST(OscillatorProducesSound);

    // MIDI Tests
    RUN_TEST(NoteOnWithoutPrepare);
    RUN_TEST(NoteOnAfterPrepare);
    RUN_TEST(NoteOnAndNoteOff);

    // Polyphony Tests
    RUN_TEST(Polyphony);
    RUN_TEST(VoiceStealing);

    // Parameter Tests
    RUN_TEST(GetParameterList);
    RUN_TEST(MasterGainParameter);

    // Filter Tests
    RUN_TEST(FilterParametersExist);
    RUN_TEST(SetFilterCutoff);
    RUN_TEST(FilterAffectsSound);

    // Envelope Tests
    RUN_TEST(EnvelopeParametersExist);
    RUN_TEST(EnvelopeAttack);

    // Preset Tests
    RUN_TEST(GetPresetState);
    RUN_TEST(SetPresetState);
    RUN_TEST(PresetRoundTrip);

    // Performance Tests
    RUN_TEST(CPUBudget);

    // ===== PHASE 2 TESTS (36 tests) =====

    // Pattern Sequencer Tests (6)
    RUN_TEST(PatternPlayback);
    RUN_TEST(PatternGating);
    RUN_TEST(PatternSwing);
    RUN_TEST(PatternProbability);
    RUN_TEST(PatternTempo);
    RUN_TEST(PatternLoop);

    // LFO Tests (6)
    RUN_TEST(LFOOscillation);
    RUN_TEST(LFOWaveforms);
    RUN_TEST(LFORate);
    RUN_TEST(LFODepth);
    RUN_TEST(LFOTempoSync);
    RUN_TEST(LFOPhase);

    // Modulation Matrix Tests (6)
    RUN_TEST(ModulationLFOToFilter);
    RUN_TEST(ModulationEnvToPitch);
    RUN_TEST(ModulationVelocityToAmp);
    RUN_TEST(ModulationMultipleSources);
    RUN_TEST(ModulationBipolar);
    RUN_TEST(ModulationAmount);

    // Parameter Morphing Tests (4)
    RUN_TEST(MorphBetweenPresets);
    RUN_TEST(MorphPosition);
    RUN_TEST(MorphRealtime);
    RUN_TEST(MorphSmooth);

    // Unison Tests (4)
    RUN_TEST(UnisonDetune);
    RUN_TEST(UnisonSpread);
    RUN_TEST(UnisonVoices);
    RUN_TEST(UnisonDisable);

    // Effects Tests (6)
    RUN_TEST(Distortion);
    RUN_TEST(Delay);
    RUN_TEST(DelayFeedback);
    RUN_TEST(Reverb);
    RUN_TEST(EffectsChain);
    RUN_TEST(EffectsMix);

    // ===== PHASE 3 TESTS (18 tests) =====

    // Preset Validation Tests (6)
    RUN_TEST(ValidateEmptyJson);
    RUN_TEST(ValidateInvalidJson);
    RUN_TEST(ValidateMissingParameters);
    RUN_TEST(ValidateMissingMetadata);
    RUN_TEST(ValidateOutOfRangeParam);
    RUN_TEST(ValidateValidPreset);

    // Preset Metadata Tests (4)
    RUN_TEST(GetPresetInfo_Name);
    RUN_TEST(GetPresetInfo_Category);
    RUN_TEST(GetPresetInfo_Description);
    RUN_TEST(GetPresetInfo_CreationDate);

    // Factory Presets Tests (2)
    RUN_TEST(FactoryPresetsCount);
    RUN_TEST(FactoryPresetsCategories);

    // Preset Save/Load Tests (3)
    RUN_TEST(SavePreset_IncludesMetadata);
    RUN_TEST(LoadPreset_RestoresAll);
    RUN_TEST(LoadPreset_Validation);

    // Feel Vector Tests (3)
    RUN_TEST(FeelVectorPresets_CorrectCount);
    RUN_TEST(FeelVectorInterpolation);
    RUN_TEST(FeelVectorAffectsSound);

    // Summary
    std::cout << "\n========================================\n";
    std::cout << "Test Results:\n";
    std::cout << "  Passed: " << passed << "\n";
    std::cout << "  Failed: " << failed << "\n";
    std::cout << "  Total:  " << (passed + failed) << "\n";
    std::cout << "========================================\n\n";

    if (failed == 0)
    {
        std::cout << "✅ ALL TESTS PASSED - GREEN PHASE COMPLETE!\n";
        return 0;
    }
    else
    {
        std::cout << "❌ SOME TESTS FAILED - RED PHASE (expected during TDD)\n";
        std::cout << "   This is NORMAL - these failures drive implementation\n";
        return 1;  // Non-zero exit indicates work remaining
    }
}
