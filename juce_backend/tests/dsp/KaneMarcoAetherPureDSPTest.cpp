/*
  ==============================================================================

    KaneMarcoAetherPureDSPTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Unit tests for Kane Marco Aether Pure DSP implementation

    Tests the factory-created Kane Marco Aether instance to verify
    all DSP methods work correctly without JUCE dependencies.

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
// TEST SUITE: Kane Marco Aether Pure DSP
//==============================================================================

TEST(KaneMarcoAetherFactoryCreation)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");

    EXPECT_NOT_NULL(synth);

    std::string name = synth->getInstrumentName();
    std::string version = synth->getInstrumentVersion();

    if (name != "KaneMarcoAether") {
        throw std::runtime_error("Expected instrument name 'KaneMarcoAether' but got '" + name + "'");
    }
    if (version != "2.0.0") {
        throw std::runtime_error("Expected version '2.0.0' but got '" + version + "'");
    }

    delete synth;
}

TEST(KaneMarcoAetherPrepare)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth);

    bool prepared = synth->prepare(48000.0, 512);
    EXPECT_TRUE(prepared);

    int maxPolyphony = synth->getMaxPolyphony();
    EXPECT_EQ(6, maxPolyphony);  // 6 voices (guitar strings)

    delete synth;
}

TEST(KaneMarcoAetherReset)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    synth->process(outputs, 2, 512);
    synth->reset();

    int activeVoices = synth->getActiveVoiceCount();
    EXPECT_EQ(0, activeVoices);

    delete synth;
}

TEST(KaneMarcoAetherNoteOnOff)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth->handleEvent(noteOn);

    int activeVoices = synth->getActiveVoiceCount();
    EXPECT_GT(activeVoices, 0);

    DSP::ScheduledEvent noteOff;
    noteOff.type = DSP::ScheduledEvent::NOTE_OFF;
    noteOff.time = 0.0;
    noteOff.sampleOffset = 0;
    noteOff.data.note.midiNote = 60;
    noteOff.data.note.velocity = 0.0f;

    synth->handleEvent(noteOff);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    for (int i = 0; i < 20; i++) {
        synth->process(outputs, 2, 512);
    }

    delete synth;
}

TEST(KaneMarcoAetherProcess)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    synth->process(outputs, 2, 512);

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

TEST(KaneMarcoAetherParameters)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    float originalValue = synth->getParameter("masterVolume");
    EXPECT_GE(originalValue, 0.0f);
    EXPECT_LE(originalValue, 1.0f);

    synth->setParameter("masterVolume", 0.5f);
    float newValue = synth->getParameter("masterVolume");
    EXPECT_NEAR(0.5f, newValue, 0.01f);

    synth->setParameter("brightness", 0.8f);
    float brightnessValue = synth->getParameter("brightness");
    EXPECT_NEAR(0.8f, brightnessValue, 0.01f);

    delete synth;
}

TEST(KaneMarcoAetherPresetSaveLoad)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    synth->setParameter("masterVolume", 0.75f);
    synth->setParameter("brightness", 0.85f);

    char jsonBuffer[4096];
    bool saved = synth->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    EXPECT_EQ('{', jsonBuffer[0]);

    DSP::InstrumentDSP* synth2 = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth2);

    synth2->prepare(48000.0, 512);

    bool loaded = synth2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    float volume1 = synth->getParameter("masterVolume");
    float volume2 = synth2->getParameter("masterVolume");
    EXPECT_NEAR(volume1, volume2, 0.01f);

    delete synth;
    delete synth2;
}

TEST(KaneMarcoAetherPolyphony)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAether");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    int maxPolyphony = synth->getMaxPolyphony();

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

TEST(KaneMarcoAetherDeterminism)
{
    DSP::InstrumentDSP* synth1 = DSP::createInstrument("KaneMarcoAether");
    DSP::InstrumentDSP* synth2 = DSP::createInstrument("KaneMarcoAether");

    synth1->prepare(48000.0, 512);
    synth2->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;

    synth1->handleEvent(noteOn);
    synth2->handleEvent(noteOn);

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
    std::cout << "Kane Marco Aether Pure DSP Tests\n";
    std::cout << "===========================================\n\n";

    // Test 1: Factory Creation
    std::cout << "Running test 1: KaneMarcoAetherFactoryCreation...\n";
    try {
        Test::test_KaneMarcoAetherFactoryCreation();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 2: Prepare
    std::cout << "\nRunning test 2: KaneMarcoAetherPrepare...\n";
    try {
        Test::test_KaneMarcoAetherPrepare();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 3: Reset
    std::cout << "\nRunning test 3: KaneMarcoAetherReset...\n";
    try {
        Test::test_KaneMarcoAetherReset();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 4: Note On/Off
    std::cout << "\nRunning test 4: KaneMarcoAetherNoteOnOff...\n";
    try {
        Test::test_KaneMarcoAetherNoteOnOff();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 5: Process
    std::cout << "\nRunning test 5: KaneMarcoAetherProcess...\n";
    try {
        Test::test_KaneMarcoAetherProcess();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 6: Parameters
    std::cout << "\nRunning test 6: KaneMarcoAetherParameters...\n";
    try {
        Test::test_KaneMarcoAetherParameters();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 7: Preset Save/Load
    std::cout << "\nRunning test 7: KaneMarcoAetherPresetSaveLoad...\n";
    try {
        Test::test_KaneMarcoAetherPresetSaveLoad();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 8: Polyphony
    std::cout << "\nRunning test 8: KaneMarcoAetherPolyphony...\n";
    try {
        Test::test_KaneMarcoAetherPolyphony();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 9: Determinism
    std::cout << "\nRunning test 9: KaneMarcoAetherDeterminism...\n";
    try {
        Test::test_KaneMarcoAetherDeterminism();
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
