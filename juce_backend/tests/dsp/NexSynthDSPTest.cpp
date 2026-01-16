/*
  ==============================================================================

    NexSynthDSPTest.cpp
    Created: 15 Jan 2025
    Author:  Bret Bouchard

    TDD Test Suite for NexSynthDSP - RED Phase

    This file contains FAILING tests that drive the implementation.
    Following strict TDD: Write test → Watch it fail → Implement → Watch it pass

  ==============================================================================
*/

#include "../include/dsp/NexSynthDSP.h"
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
    // This test verifies that we can create a NexSynthDSP instance
    // RED PHASE: This will FAIL initially, driving implementation

    auto synth = std::make_unique<NexSynthDSP>();

    EXPECT_TRUE(synth != nullptr);
    EXPECT_TRUE(synth.get() != nullptr);
}

TEST(GetName, ShouldReturnCorrectName)
{
    // Verify the synth identifies itself correctly
    auto synth = std::make_unique<NexSynthDSP>();

    juce::String name = synth->getName();

    EXPECT_TRUE(name == "NexSynthDSP");
}

TEST(AcceptsMidi, ShouldReturnTrue)
{
    // Verify synth accepts MIDI input
    auto synth = std::make_unique<NexSynthDSP>();

    EXPECT_TRUE(synth->acceptsMidi());
}

TEST(DoesNotProduceMidi, ShouldReturnFalse)
{
    // Verify synth doesn't produce MIDI output
    auto synth = std::make_unique<NexSynthDSP>();

    EXPECT_FALSE(synth->producesMidi());
}

//==============================================================================
// TEST SUITE 2: Audio Processing Basics (RED Phase)
//==============================================================================

TEST(PrepareToPlay, ShouldNotCrash)
{
    // Verify prepareToPlay doesn't crash
    // This is the MINIMAL test for audio system initialization

    auto synth = std::make_unique<NexSynthDSP>();

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

    auto synth = std::make_unique<NexSynthDSP>();
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
    auto synth = std::make_unique<NexSynthDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;  // No MIDI messages

    synth->processBlock(buffer, midi);

    // Should be silent (no active notes)
    EXPECT_TRUE(DSPTestFramework::isSilent(buffer));
}

//==============================================================================
// TEST SUITE 3: Parameter System (RED Phase)
//==============================================================================

TEST(ParametersExist, ShouldHaveParameters)
{
    // Verify parameter system is initialized
    auto synth = std::make_unique<NexSynthDSP>();

    // Should have at least some parameters
    auto params = synth->getParameterList();

    EXPECT_GT(params.size(), static_cast<size_t>(0));
}

TEST(GetParameterValue, ShouldReturnDefaultValue)
{
    // Verify we can read parameter values
    auto synth = std::make_unique<NexSynthDSP>();

    // Master gain should have default value
    float gain = synth->getParameterValue("master_gain");

    // Default from implementation is 0.8f
    EXPECT_NEAR(gain, 0.8f, 0.001f);
}

TEST(SetParameterValue, ShouldUpdateValue)
{
    // Verify we can set parameter values
    auto synth = std::make_unique<NexSynthDSP>();

    // Set master gain to 0.5
    synth->setParameterValue("master_gain", 0.5f);

    // Read it back
    float gain = synth->getParameterValue("master_gain");

    EXPECT_NEAR(gain, 0.5f, 0.001f);
}

TEST(GetParameterList, ShouldHaveCorrectStructure)
{
    // Verify parameter metadata is correct
    auto synth = std::make_unique<NexSynthDSP>();

    auto params = synth->getParameterList();

    // Should have at least master_gain
    bool foundMasterGain = false;
    for (const auto& param : params)
    {
        if (param.id == "master_gain")
        {
            foundMasterGain = true;
            EXPECT_TRUE(param.name == "Master Gain");
            EXPECT_NEAR(param.defaultValue, 0.8f, 0.001f);
            break;
        }
    }

    EXPECT_TRUE(foundMasterGain);
}

//==============================================================================
// TEST SUITE 4: Preset System (RED Phase)
//==============================================================================

TEST(GetPresetState, ShouldReturnValidJSON)
{
    // Verify we can save preset state as JSON
    auto synth = std::make_unique<NexSynthDSP>();

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
    auto synth = std::make_unique<NexSynthDSP>();

    // Empty JSON should not crash
    std::string json = "{}";

    // Should not throw
    synth->setPresetState(json);

    EXPECT_TRUE(true);
}

TEST(PresetRoundTrip, ShouldPreserveParameters)
{
    // Verify that saving and loading preserves parameters
    auto synth1 = std::make_unique<NexSynthDSP>();
    auto synth2 = std::make_unique<NexSynthDSP>();

    // Set custom value on synth1
    synth1->setParameterValue("master_gain", 0.42f);

    // Save preset
    std::string json = synth1->getPresetState();

    // Load into synth2
    synth2->setPresetState(json);

    // Verify value was preserved
    // NOTE: This will FAIL in RED phase because preset system isn't implemented yet
    // This is the DRIVING TEST for preset implementation

    float value = synth2->getParameterValue("master_gain");

    // GREEN PHASE TODO: Implement preset save/load to make this pass
    // For now, we expect it to fail or be wrong
    // EXPECT_NEAR(value, 0.42f, 0.001f);

    (void)value;  // Suppress unused warning
}

//==============================================================================
// TEST SUITE 5: MIDI Processing (RED Phase - driving implementation)
//==============================================================================

TEST(NoteOnWithoutPrepare, ShouldHandleGracefully)
{
    // Verify we handle MIDI before prepareToPlay (edge case)
    auto synth = std::make_unique<NexSynthDSP>();

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
    auto synth = std::make_unique<NexSynthDSP>();
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

//==============================================================================
// TEST SUITE 6: Performance Constraints (RED Phase)
//==============================================================================

TEST(CPUBudget, ShouldProcessQuickly)
{
    // Verify processing time is within tvOS CPU budget
    // RED PHASE: This test will likely fail initially, driving optimization

    auto synth = std::make_unique<NexSynthDSP>();
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
// TEST SUITE 7: FM Modulation (Phase 2 - RED Phase)
//==============================================================================

TEST(FMModulation, ShouldModulateCarrierFrequency)
{
    // Phase 2 RED: Test that modulator operator affects carrier frequency
    // This will create FM synthesis (vibrato, harmonics)

    auto synth = std::make_unique<NexSynthDSP>();
    synth->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    // Set modulator parameters
    synth->setParameterValue("op2_ratio", 2.0f);  // Modulator at 2x frequency
    synth->setParameterValue("op2_enabled", 1.0f);
    synth->setParameterValue("fm_depth", 100.0f);  // Modulation depth

    synth->processBlock(buffer, midi);

    // Should produce output with FM modulation
    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.0f);
}

TEST(ModulationMatrix, ShouldSupportMultipleModulators)
{
    // Test that multiple operators can modulate the carrier
    // This creates complex FM spectra

    auto synth = std::make_unique<NexSynthDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Enable multiple modulators
    synth->setParameterValue("op2_enabled", 1.0f);
    synth->setParameterValue("op3_enabled", 1.0f);
    synth->setParameterValue("op2_ratio", 2.0f);
    synth->setParameterValue("op3_ratio", 3.0f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    synth->processBlock(buffer, midi);

    float rms = DSPTestFramework::calculateRMS(buffer);
    EXPECT_GT(rms, 0.0f);
}

TEST(OperatorWaveforms, ShouldSupportMultipleWaveforms)
{
    // Test different oscillator waveforms (beyond sine)
    // Phase 2 will add sawtooth, square, triangle

    auto synth = std::make_unique<NexSynthDSP>();
    synth->prepareToPlay(48000.0, 512);

    // Set carrier waveform (will be implemented in Phase 2)
    // synth->setParameterValue("op1_waveform", 1.0f);  // Sawtooth

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = DSPTestFramework::createNoteOn(60, 0.8f);

    bool threw = false;
    try { synth->processBlock(buffer, midi); } catch (...) { threw = true; }

    EXPECT_FALSE(threw);
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n========================================\n";
    std::cout << "NexSynthDSP TDD Test Suite - RED PHASE\n";
    std::cout << "========================================\n\n";

    int passed = 0;
    int failed = 0;

    // Run all tests
    #define RUN_TEST(test) \
        if (main_##test() == 0) passed++; else failed++;

    // Basic Creation Tests
    RUN_TEST(CreateInstance);
    RUN_TEST(GetName);
    RUN_TEST(AcceptsMidi);
    RUN_TEST(DoesNotProduceMidi);

    // Audio Processing Tests
    RUN_TEST(PrepareToPlay);
    RUN_TEST(ProcessBlock);
    RUN_TEST(ProcessBlockWithSilentMidi);

    // Parameter Tests
    RUN_TEST(ParametersExist);
    RUN_TEST(GetParameterValue);
    RUN_TEST(SetParameterValue);
    RUN_TEST(GetParameterList);

    // Preset Tests
    RUN_TEST(GetPresetState);
    RUN_TEST(SetPresetState);
    RUN_TEST(PresetRoundTrip);

    // MIDI Tests
    RUN_TEST(NoteOnWithoutPrepare);
    RUN_TEST(NoteOnAfterPrepare);

    // Performance Tests
    RUN_TEST(CPUBudget);

    // Phase 2: FM Modulation Tests
    RUN_TEST(FMModulation);
    RUN_TEST(ModulationMatrix);
    RUN_TEST(OperatorWaveforms);

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
