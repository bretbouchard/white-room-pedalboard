/*
  ==============================================================================

    SamSamplerDSP_PureTest.cpp
    Created: December 30, 2025
    Author:  Bret Bouchard

    Unit tests for SamSamplerDSP pure implementation

    Tests the factory-created SamSamplerDSP instance to verify
    all DSP methods work correctly without AudioProcessor dependency.

  ==============================================================================
*/

#include "dsp/InstrumentDSP.h"
#include <cassert>
#include <iostream>
#include <cstring>
#include <cmath>

namespace Test {

//==============================================================================
// Test Framework
//==============================================================================

int testsPassed = 0;
int testsFailed = 0;

#define TEST(name) \
    void test_##name(); \
    struct TestRunner_##name { \
        TestRunner_##name() { /* Disabled - run manually */ } \
    } runner_##name; \
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

#define EXPECT_GE(val1, val2) \
    if ((val1) < (val2)) { \
        throw std::runtime_error("Expected " + std::to_string(val1) + \
                              " >= " + std::to_string(val2)); \
    }

#define EXPECT_LE(val1, val2) \
    if ((val1) > (val2)) { \
        throw std::runtime_error("Expected " + std::to_string(val1) + \
                              " <= " + std::to_string(val2)); \
    }

#define EXPECT_NOT_NULL(ptr) \
    if ((ptr) == nullptr) { \
        throw std::runtime_error("Expected non-NULL pointer but got NULL"); \
    }

//==============================================================================
// TEST SUITE: SamSamplerDSP Pure Implementation
//==============================================================================

TEST(SamSamplerFactoryCreation)
{
    // Test that factory can create SamSamplerDSP instance
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");

    EXPECT_NOT_NULL(sampler);

    // Verify it's the right instrument
    std::string name = sampler->getInstrumentName();
    std::string version = sampler->getInstrumentVersion();
    if (name != "SamSampler") {
        throw std::runtime_error("Expected instrument name 'SamSampler' but got '" + name + "'");
    }
    if (version != "1.0.0") {
        throw std::runtime_error("Expected version '1.0.0' but got '" + version + "'");
    }

    delete sampler;
}

TEST(SamSamplerPrepare)
{
    // Test prepare method
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler);

    bool prepared = sampler->prepare(48000.0, 512);
    EXPECT_TRUE(prepared);

    // Verify polyphony is set
    int maxPolyphony = sampler->getMaxPolyphony();
    EXPECT_GT(maxPolyphony, 0);

    delete sampler;
}

TEST(SamSamplerReset)
{
    // Test reset method
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler);

    sampler->prepare(48000.0, 512);

    // Trigger a note
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    sampler->handleEvent(noteOn);

    // Process some audio
    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    // Clear buffer
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    sampler->process(outputs, 2, 512);

    // Reset should clear all active voices
    sampler->reset();

    int activeVoices = sampler->getActiveVoiceCount();
    EXPECT_EQ(0, activeVoices);

    delete sampler;
}

TEST(SamSamplerNoteOnOff)
{
    // Test note on/off events
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler);

    sampler->prepare(48000.0, 512);

    // Note On
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    sampler->handleEvent(noteOn);

    int activeVoices = sampler->getActiveVoiceCount();
    EXPECT_GT(activeVoices, 0);

    // Note Off
    DSP::ScheduledEvent noteOff;
    noteOff.type = DSP::ScheduledEvent::NOTE_OFF;
    noteOff.time = 0.0;
    noteOff.sampleOffset = 0;
    noteOff.data.note.midiNote = 60;
    noteOff.data.note.velocity = 0.0f;

    sampler->handleEvent(noteOff);

    // Process to release envelopes
    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    // Process enough samples for release
    for (int i = 0; i < 10; i++) {
        sampler->process(outputs, 2, 512);
    }

    delete sampler;
}

TEST(SamSamplerProcess)
{
    // Test process method generates audio
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler);

    sampler->prepare(48000.0, 512);

    // Trigger a note
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    sampler->handleEvent(noteOn);

    // Process audio
    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    sampler->process(outputs, 2, 512);

    // Check that audio was generated (not silent)
    bool hasAudio = false;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 512; ++i) {
            if (std::abs(outputs[ch][i]) > 0.0001f) {
                hasAudio = true;
                break;
            }
        }
    }

    EXPECT_TRUE(hasAudio);

    delete sampler;
}

TEST(SamSamplerParameters)
{
    // Test parameter get/set
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler);

    sampler->prepare(48000.0, 512);

    // Test master volume parameter
    float originalValue = sampler->getParameter("masterVolume");
    EXPECT_GE(originalValue, 0.0f);
    EXPECT_LE(originalValue, 1.0f);

    // Set new value
    sampler->setParameter("masterVolume", 0.5f);
    float newValue = sampler->getParameter("masterVolume");
    EXPECT_NEAR(0.5f, newValue, 0.01f);

    // Test envelope parameters
    sampler->setParameter("envAttack", 0.1f);
    float attackValue = sampler->getParameter("envAttack");
    EXPECT_NEAR(0.1f, attackValue, 0.01f);

    delete sampler;
}

TEST(SamSamplerPresetSaveLoad)
{
    // Test preset save/load
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler);

    sampler->prepare(48000.0, 512);

    // Set some parameters
    sampler->setParameter("masterVolume", 0.75f);
    sampler->setParameter("envAttack", 0.15f);

    // Save preset
    char jsonBuffer[4096];
    bool saved = sampler->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    // Verify JSON is valid
    EXPECT_EQ('{', jsonBuffer[0]);

    // Create new sampler and load preset
    DSP::InstrumentDSP* sampler2 = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler2);

    sampler2->prepare(48000.0, 512);

    bool loaded = sampler2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    // Verify parameters match
    float volume1 = sampler->getParameter("masterVolume");
    float volume2 = sampler2->getParameter("masterVolume");
    EXPECT_NEAR(volume1, volume2, 0.01f);

    delete sampler;
    delete sampler2;
}

TEST(SamSamplerPolyphony)
{
    // Test polyphony management
    DSP::InstrumentDSP* sampler = DSP::createInstrument("SamSampler");
    EXPECT_NOT_NULL(sampler);

    sampler->prepare(48000.0, 512);

    int maxPolyphony = sampler->getMaxPolyphony();

    // Trigger more notes than max polyphony
    for (int i = 0; i < maxPolyphony + 5; ++i) {
        DSP::ScheduledEvent noteOn;
        noteOn.type = DSP::ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = 60 + i;
        noteOn.data.note.velocity = 0.8f;

        sampler->handleEvent(noteOn);
    }

    int activeVoices = sampler->getActiveVoiceCount();
    EXPECT_LE(activeVoices, maxPolyphony);

    delete sampler;
}

TEST(SamSamplerDeterminism)
{
    // Test that output is deterministic
    DSP::InstrumentDSP* sampler1 = DSP::createInstrument("SamSampler");
    DSP::InstrumentDSP* sampler2 = DSP::createInstrument("SamSampler");

    sampler1->prepare(48000.0, 512);
    sampler2->prepare(48000.0, 512);

    // Trigger same note on both
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    sampler1->handleEvent(noteOn);
    sampler2->handleEvent(noteOn);

    // Process audio on both
    float* outputs1[2];
    float* outputs2[2];
    float buffer1[2][512];
    float buffer2[2][512];
    outputs1[0] = buffer1[0];
    outputs1[1] = buffer1[1];
    outputs2[0] = buffer2[0];
    outputs2[1] = buffer2[1];

    std::memset(buffer1, 0, sizeof(buffer1));
    std::memset(buffer2, 0, sizeof(buffer2));

    sampler1->process(outputs1, 2, 512);
    sampler2->process(outputs2, 2, 512);

    // Check that outputs match exactly
    bool outputsMatch = true;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 512; ++i) {
            if (std::abs(buffer1[ch][i] - buffer2[ch][i]) > 0.0001f) {
                outputsMatch = false;
                break;
            }
        }
    }

    EXPECT_TRUE(outputsMatch);

    delete sampler1;
    delete sampler2;
}

} // namespace Test

//==============================================================================
// Main
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "SamSamplerDSP Pure Implementation Tests\n";
    std::cout << "===========================================\n\n";

    // Test 1: Factory Creation
    std::cout << "Running test 1: SamSamplerFactoryCreation...\n";
    try {
        Test::test_SamSamplerFactoryCreation();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 2: Prepare
    std::cout << "\nRunning test 2: SamSamplerPrepare...\n";
    try {
        Test::test_SamSamplerPrepare();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 3: Reset
    std::cout << "\nRunning test 3: SamSamplerReset...\n";
    try {
        Test::test_SamSamplerReset();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 4: Note On/Off
    std::cout << "\nRunning test 4: SamSamplerNoteOnOff...\n";
    try {
        Test::test_SamSamplerNoteOnOff();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 5: Process
    std::cout << "\nRunning test 5: SamSamplerProcess...\n";
    try {
        Test::test_SamSamplerProcess();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 6: Parameters
    std::cout << "\nRunning test 6: SamSamplerParameters...\n";
    try {
        Test::test_SamSamplerParameters();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 7: Preset Save/Load
    std::cout << "\nRunning test 7: SamSamplerPresetSaveLoad...\n";
    try {
        Test::test_SamSamplerPresetSaveLoad();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 8: Polyphony
    std::cout << "\nRunning test 8: SamSamplerPolyphony...\n";
    try {
        Test::test_SamSamplerPolyphony();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 9: Determinism
    std::cout << "\nRunning test 9: SamSamplerDeterminism...\n";
    try {
        Test::test_SamSamplerDeterminism();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nAll tests completed.\n";
    std::cout << "Passed: " << Test::testsPassed << "\n";
    std::cout << "Failed: " << Test::testsFailed << "\n";
    std::cout << "===========================================\n";
    std::cout << "\n";

    return (Test::testsFailed == 0) ? 0 : 1;
}
