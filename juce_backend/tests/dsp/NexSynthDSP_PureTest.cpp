/*
  ==============================================================================

    NexSynthDSP_PureTest.cpp
    Created: December 30, 2025
    Author:  Bret Bouchard

    Unit tests for NexSynthDSP pure implementation

    Tests the factory-created NexSynthDSP instance to verify
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

#define EXPECT_NEQ(expected, actual) \
    if ((expected) == (actual)) { \
        throw std::runtime_error("Expected not equal to " + std::to_string(expected)); \
    }

#define EXPECT_NULL(ptr) \
    if ((ptr) != nullptr) { \
        throw std::runtime_error("Expected NULL but got non-NULL pointer"); \
    }

#define EXPECT_NOT_NULL(ptr) \
    if ((ptr) == nullptr) { \
        throw std::runtime_error("Expected non-NULL pointer but got NULL"); \
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

//==============================================================================
// TEST SUITE: NexSynthDSP Pure Implementation
//==============================================================================

TEST(NexSynthFactoryCreation)
{
    // Test that factory can create NexSynthDSP instance
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");

    EXPECT_NOT_NULL(synth);

    // Verify it's the right instrument
    std::string name = synth->getInstrumentName();
    std::string version = synth->getInstrumentVersion();
    if (name != "NexSynth") {
        throw std::runtime_error("Expected instrument name 'NexSynth' but got '" + name + "'");
    }
    if (version != "1.0.0") {
        throw std::runtime_error("Expected version '1.0.0' but got '" + version + "'");
    }

    delete synth;
}

TEST(NexSynthPrepare)
{
    // Test prepare method
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth);

    bool prepared = synth->prepare(48000.0, 512);
    EXPECT_TRUE(prepared);

    // Verify polyphony is set
    int maxPolyphony = synth->getMaxPolyphony();
    EXPECT_GT(maxPolyphony, 0);

    delete synth;
}

TEST(NexSynthReset)
{
    // Test reset method
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    // Trigger a note
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth->handleEvent(noteOn);

    // Process some audio
    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    // Clear buffer
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    synth->process(outputs, 2, 512);

    // Reset should clear all active voices
    synth->reset();

    int activeVoices = synth->getActiveVoiceCount();
    EXPECT_EQ(0, activeVoices);

    delete synth;
}

TEST(NexSynthNoteOnOff)
{
    // Test note on/off events
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    // Note On
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth->handleEvent(noteOn);

    int activeVoices = synth->getActiveVoiceCount();
    EXPECT_GT(activeVoices, 0);

    // Note Off
    DSP::ScheduledEvent noteOff;
    noteOff.type = DSP::ScheduledEvent::NOTE_OFF;
    noteOff.time = 0.0;
    noteOff.sampleOffset = 0;
    noteOff.data.note.midiNote = 60;
    noteOff.data.note.velocity = 0.0f;

    synth->handleEvent(noteOff);

    // Process to release envelopes
    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    // Process enough samples for release
    for (int i = 0; i < 10; i++) {
        synth->process(outputs, 2, 512);
    }

    delete synth;
}

TEST(NexSynthProcess)
{
    // Test process method generates audio
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    // Trigger a note
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth->handleEvent(noteOn);

    // Process audio
    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    synth->process(outputs, 2, 512);

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

    delete synth;
}

TEST(NexSynthParameters)
{
    // Test parameter get/set
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    // Test master volume parameter
    float originalValue = synth->getParameter("masterVolume");
    EXPECT_GE(originalValue, 0.0f);
    EXPECT_LE(originalValue, 1.0f);

    // Set new value
    synth->setParameter("masterVolume", 0.5f);
    float newValue = synth->getParameter("masterVolume");
    EXPECT_NEAR(0.5f, newValue, 0.01f);

    delete synth;
}

TEST(NexSynthPresetSaveLoad)
{
    // Test preset save/load
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    // Set some parameters
    synth->setParameter("masterVolume", 0.75f);
    synth->setParameter("fmDepth", 0.5f);

    // Save preset
    char jsonBuffer[4096];
    bool saved = synth->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    // Verify JSON is valid
    EXPECT_EQ('{', jsonBuffer[0]);

    // Create new synth and load preset
    DSP::InstrumentDSP* synth2 = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth2);

    synth2->prepare(48000.0, 512);

    bool loaded = synth2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    // Verify parameters match
    float volume1 = synth->getParameter("masterVolume");
    float volume2 = synth2->getParameter("masterVolume");
    EXPECT_NEAR(volume1, volume2, 0.01f);

    delete synth;
    delete synth2;
}

TEST(NexSynthPolyphony)
{
    // Test polyphony management
    DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    int maxPolyphony = synth->getMaxPolyphony();

    // Trigger more notes than max polyphony
    for (int i = 0; i < maxPolyphony + 5; ++i) {
        DSP::ScheduledEvent noteOn;
        noteOn.type = DSP::ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = 60 + i;
        noteOn.data.note.velocity = 0.8f;

        synth->handleEvent(noteOn);
    }

    int activeVoices = synth->getActiveVoiceCount();
    EXPECT_LE(activeVoices, maxPolyphony);

    delete synth;
}

TEST(NexSynthDeterminism)
{
    // Test that output is deterministic
    DSP::InstrumentDSP* synth1 = DSP::createInstrument("NexSynth");
    DSP::InstrumentDSP* synth2 = DSP::createInstrument("NexSynth");

    synth1->prepare(48000.0, 512);
    synth2->prepare(48000.0, 512);

    // Trigger same note on both
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth1->handleEvent(noteOn);
    synth2->handleEvent(noteOn);

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

    synth1->process(outputs1, 2, 512);
    synth2->process(outputs2, 2, 512);

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

    delete synth1;
    delete synth2;
}

} // namespace Test

//==============================================================================
// Main
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "NexSynthDSP Pure Implementation Tests\n";
    std::cout << "===========================================\n\n";

    // Test 1: Factory Creation
    std::cout << "Running test 1: NexSynthFactoryCreation...\n";
    try {
        Test::test_NexSynthFactoryCreation();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 2: Prepare
    std::cout << "\nRunning test 2: NexSynthPrepare...\n";
    try {
        Test::test_NexSynthPrepare();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 3: Reset
    std::cout << "\nRunning test 3: NexSynthReset...\n";
    try {
        Test::test_NexSynthReset();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 4: Note On/Off
    std::cout << "\nRunning test 4: NexSynthNoteOnOff...\n";
    try {
        Test::test_NexSynthNoteOnOff();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 5: Process
    std::cout << "\nRunning test 5: NexSynthProcess...\n";
    try {
        Test::test_NexSynthProcess();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 6: Parameters
    std::cout << "\nRunning test 6: NexSynthParameters...\n";
    try {
        Test::test_NexSynthParameters();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 7: Preset Save/Load
    std::cout << "\nRunning test 7: NexSynthPresetSaveLoad...\n";
    try {
        Test::test_NexSynthPresetSaveLoad();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 8: Polyphony
    std::cout << "\nRunning test 8: NexSynthPolyphony...\n";
    try {
        Test::test_NexSynthPolyphony();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 9: Determinism
    std::cout << "\nRunning test 9: NexSynthDeterminism...\n";
    try {
        Test::test_NexSynthDeterminism();
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
