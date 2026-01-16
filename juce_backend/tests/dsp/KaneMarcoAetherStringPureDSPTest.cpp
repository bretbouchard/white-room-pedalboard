/*
  ==============================================================================

    KaneMarcoAetherStringPureDSPTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Unit tests for Kane Marco Aether String Pure DSP implementation

    Tests the factory-created Kane Marco Aether String instance to verify
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
// TEST SUITE: Kane Marco Aether String Pure DSP
//==============================================================================

TEST(KaneMarcoAetherStringFactoryCreation)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");

    EXPECT_NOT_NULL(synth);

    std::string name = synth->getInstrumentName();
    std::string version = synth->getInstrumentVersion();

    if (name != "KaneMarcoAetherString") {
        throw std::runtime_error("Expected instrument name 'KaneMarcoAetherString' but got '" + name + "'");
    }
    if (version != "1.0.0") {
        throw std::runtime_error("Expected version '1.0.0' but got '" + version + "'");
    }

    delete synth;
}

TEST(KaneMarcoAetherStringPrepare)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");
    EXPECT_NOT_NULL(synth);

    bool prepared = synth->prepare(48000.0, 512);
    EXPECT_TRUE(prepared);

    int maxPolyphony = synth->getMaxPolyphony();
    EXPECT_EQ(6, maxPolyphony);  // 6 voices for physical modeling

    delete synth;
}

TEST(KaneMarcoAetherStringReset)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");
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

TEST(KaneMarcoAetherStringNoteOnOff)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");
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

    // Process to allow release to complete
    for (int i = 0; i < 20; i++) {
        synth->process(outputs, 2, 512);
    }

    delete synth;
}

TEST(KaneMarcoAetherStringProcess)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");
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

TEST(KaneMarcoAetherStringParameters)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    float originalValue = synth->getParameter("master_volume");
    EXPECT_GE(originalValue, 0.0f);
    EXPECT_LE(originalValue, 1.0f);

    synth->setParameter("master_volume", 0.5f);
    float newValue = synth->getParameter("master_volume");
    EXPECT_NEAR(0.5f, newValue, 0.01f);

    synth->setParameter("string_damping", 0.99f);
    float dampingValue = synth->getParameter("string_damping");
    EXPECT_NEAR(0.99f, dampingValue, 0.01f);

    synth->setParameter("body_resonance", 0.8f);
    float resonanceValue = synth->getParameter("body_resonance");
    EXPECT_NEAR(0.8f, resonanceValue, 0.01f);

    delete synth;
}

TEST(KaneMarcoAetherStringPresetSaveLoad)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");
    EXPECT_NOT_NULL(synth);

    synth->prepare(48000.0, 512);

    synth->setParameter("master_volume", 0.75f);
    synth->setParameter("string_damping", 0.98f);
    synth->setParameter("body_resonance", 0.85f);

    char jsonBuffer[4096];
    bool saved = synth->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    EXPECT_EQ('{', jsonBuffer[0]);

    DSP::InstrumentDSP* synth2 = DSP::createInstrument("KaneMarcoAetherString");
    EXPECT_NOT_NULL(synth2);

    synth2->prepare(48000.0, 512);

    bool loaded = synth2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    float volume1 = synth->getParameter("master_volume");
    float volume2 = synth2->getParameter("master_volume");
    EXPECT_NEAR(volume1, volume2, 0.01f);

    delete synth;
    delete synth2;
}

TEST(KaneMarcoAetherStringPolyphony)
{
    DSP::InstrumentDSP* synth = DSP::createInstrument("KaneMarcoAetherString");
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

TEST(KaneMarcoAetherStringDeterminism)
{
    DSP::InstrumentDSP* synth1 = DSP::createInstrument("KaneMarcoAetherString");
    DSP::InstrumentDSP* synth2 = DSP::createInstrument("KaneMarcoAetherString");

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
    std::cout << "Kane Marco Aether String Pure DSP Tests\n";
    std::cout << "===========================================\n\n";

    // Test 1: Factory Creation
    std::cout << "Running test 1: KaneMarcoAetherStringFactoryCreation...\n";
    try {
        Test::test_KaneMarcoAetherStringFactoryCreation();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 2: Prepare
    std::cout << "\nRunning test 2: KaneMarcoAetherStringPrepare...\n";
    try {
        Test::test_KaneMarcoAetherStringPrepare();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 3: Reset
    std::cout << "\nRunning test 3: KaneMarcoAetherStringReset...\n";
    try {
        Test::test_KaneMarcoAetherStringReset();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 4: Note On/Off
    std::cout << "\nRunning test 4: KaneMarcoAetherStringNoteOnOff...\n";
    try {
        Test::test_KaneMarcoAetherStringNoteOnOff();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 5: Process
    std::cout << "\nRunning test 5: KaneMarcoAetherStringProcess...\n";
    try {
        Test::test_KaneMarcoAetherStringProcess();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 6: Parameters
    std::cout << "\nRunning test 6: KaneMarcoAetherStringParameters...\n";
    try {
        Test::test_KaneMarcoAetherStringParameters();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 7: Preset Save/Load
    std::cout << "\nRunning test 7: KaneMarcoAetherStringPresetSaveLoad...\n";
    try {
        Test::test_KaneMarcoAetherStringPresetSaveLoad();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 8: Polyphony
    std::cout << "\nRunning test 8: KaneMarcoAetherStringPolyphony...\n";
    try {
        Test::test_KaneMarcoAetherStringPolyphony();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 9: Determinism
    std::cout << "\nRunning test 9: KaneMarcoAetherStringDeterminism...\n";
    try {
        Test::test_KaneMarcoAetherStringDeterminism();
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
