/*
  ==============================================================================

    DrumMachinePureDSPTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Unit tests for Drum Machine Pure DSP implementation

    Tests the factory-created Drum Machine instance to verify
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
// TEST SUITE: Drum Machine Pure DSP
//==============================================================================

TEST(DrumMachineFactoryCreation)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");

    EXPECT_NOT_NULL(drum);

    std::string name = drum->getInstrumentName();
    std::string version = drum->getInstrumentVersion();

    if (name != "DrumMachine") {
        throw std::runtime_error("Expected instrument name 'DrumMachine' but got '" + name + "'");
    }
    if (version != "1.0.0") {
        throw std::runtime_error("Expected version '1.0.0' but got '" + version + "'");
    }

    delete drum;
}

TEST(DrumMachinePrepare)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);

    bool prepared = drum->prepare(48000.0, 512);
    EXPECT_TRUE(prepared);

    int maxPolyphony = drum->getMaxPolyphony();
    EXPECT_EQ(16, maxPolyphony);  // 16 tracks

    delete drum;
}

TEST(DrumMachineReset)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);

    drum->prepare(48000.0, 512);

    // Trigger some notes
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;  // Kick
    noteOn.data.note.velocity = 0.8f;

    drum->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    drum->process(outputs, 2, 512);
    drum->reset();

    int activeVoices = drum->getActiveVoiceCount();
    EXPECT_EQ(0, activeVoices);

    delete drum;
}

TEST(DrumMachineNoteOnOff)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);

    drum->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 38;  // Snare
    noteOn.data.note.velocity = 0.8f;

    drum->handleEvent(noteOn);

    int activeVoices = drum->getActiveVoiceCount();
    EXPECT_GT(activeVoices, 0);

    delete drum;
}

TEST(DrumMachineProcess)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);

    drum->prepare(48000.0, 512);

    // Trigger kick drum
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;  // Kick
    noteOn.data.note.velocity = 0.8f;

    drum->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    drum->process(outputs, 2, 512);

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

    delete drum;
}

TEST(DrumMachineParameters)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);

    drum->prepare(48000.0, 512);

    float originalTempo = drum->getParameter("tempo");
    EXPECT_GE(originalTempo, 60.0f);
    EXPECT_LE(originalTempo, 200.0f);

    drum->setParameter("tempo", 140.0f);
    float newTempo = drum->getParameter("tempo");
    EXPECT_NEAR(140.0f, newTempo, 0.01f);

    drum->setParameter("swing", 0.5f);
    float swingValue = drum->getParameter("swing");
    EXPECT_NEAR(0.5f, swingValue, 0.01f);

    drum->setParameter("master_volume", 0.7f);
    float volumeValue = drum->getParameter("master_volume");
    EXPECT_NEAR(0.7f, volumeValue, 0.01f);

    delete drum;
}

TEST(DrumMachinePresetSaveLoad)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);

    drum->prepare(48000.0, 512);

    drum->setParameter("tempo", 135.0f);
    drum->setParameter("swing", 0.3f);
    drum->setParameter("master_volume", 0.75f);

    char jsonBuffer[4096];
    bool saved = drum->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    EXPECT_EQ('{', jsonBuffer[0]);

    DSP::InstrumentDSP* drum2 = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum2);

    drum2->prepare(48000.0, 512);

    bool loaded = drum2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    float tempo1 = drum->getParameter("tempo");
    float tempo2 = drum2->getParameter("tempo");
    EXPECT_NEAR(tempo1, tempo2, 0.01f);

    delete drum;
    delete drum2;
}

TEST(DrumMachinePolyphony)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);

    drum->prepare(48000.0, 512);

    // Trigger multiple drum sounds (different tracks)
    for (int i = 0; i < 16; ++i) {
        DSP::ScheduledEvent noteOn;
        noteOn.type = DSP::ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = 36 + i;
        noteOn.data.note.velocity = 0.8f;

        drum->handleEvent(noteOn);
    }

    int activeVoices = drum->getActiveVoiceCount();
    EXPECT_LE(activeVoices, 16);

    delete drum;
}

TEST(DrumMachineDeterminism)
{
    DSP::InstrumentDSP* drum1 = DSP::createInstrument("DrumMachine");
    DSP::InstrumentDSP* drum2 = DSP::createInstrument("DrumMachine");

    drum1->prepare(48000.0, 512);
    drum2->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;  // Kick
    noteOn.data.note.velocity = 0.8f;

    drum1->handleEvent(noteOn);
    drum2->handleEvent(noteOn);

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

    drum1->process(outputs1, 2, 512);
    drum2->process(outputs2, 2, 512);

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

    delete drum1;
    delete drum2;
}

//==============================================================================
// TEST SUITE: Pocket / Push / Pull Timing System
//==============================================================================

TEST(TimingRoleParams_DefaultValues)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Check default role timing parameters
    float pocketOffset = drum->getParameter("pocket_offset");
    EXPECT_NEAR(0.0f, pocketOffset, 0.001f);

    float pushOffset = drum->getParameter("push_offset");
    EXPECT_NEAR(-0.04f, pushOffset, 0.001f);

    float pullOffset = drum->getParameter("pull_offset");
    EXPECT_NEAR(+0.06f, pullOffset, 0.001f);

    delete drum;
}

TEST(DillaParams_DefaultValues)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Check default Dilla parameters
    float amount = drum->getParameter("dilla_amount");
    EXPECT_NEAR(0.6f, amount, 0.001f);

    float hatBias = drum->getParameter("dilla_hat_bias");
    EXPECT_NEAR(0.55f, hatBias, 0.001f);

    float snareLate = drum->getParameter("dilla_snare_late");
    EXPECT_NEAR(0.8f, snareLate, 0.001f);

    float kickTight = drum->getParameter("dilla_kick_tight");
    EXPECT_NEAR(0.7f, kickTight, 0.001f);

    float maxDrift = drum->getParameter("dilla_max_drift");
    EXPECT_NEAR(0.15f, maxDrift, 0.001f);

    delete drum;
}

TEST(TimingRole_CanModifyParameters)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Modify role timing parameters
    drum->setParameter("push_offset", -0.08f);
    float pushOffset = drum->getParameter("push_offset");
    EXPECT_NEAR(-0.08f, pushOffset, 0.001f);

    drum->setParameter("pull_offset", +0.10f);
    float pullOffset = drum->getParameter("pull_offset");
    EXPECT_NEAR(+0.10f, pullOffset, 0.001f);

    delete drum;
}

TEST(DillaTime_CanModifyParameters)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Modify Dilla parameters
    drum->setParameter("dilla_amount", 0.85f);
    float amount = drum->getParameter("dilla_amount");
    EXPECT_NEAR(0.85f, amount, 0.001f);

    drum->setParameter("dilla_snare_late", 1.0f);
    float snareLate = drum->getParameter("dilla_snare_late");
    EXPECT_NEAR(1.0f, snareLate, 0.001f);

    delete drum;
}

TEST(TimingPresets_DillaLite)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Dilla Lite preset
    drum->setParameter("dilla_amount", 0.35f);
    drum->setParameter("dilla_hat_bias", 0.5f);
    drum->setParameter("dilla_snare_late", 0.6f);
    drum->setParameter("dilla_kick_tight", 0.85f);

    EXPECT_NEAR(0.35f, drum->getParameter("dilla_amount"), 0.001f);
    EXPECT_NEAR(0.5f, drum->getParameter("dilla_hat_bias"), 0.001f);
    EXPECT_NEAR(0.6f, drum->getParameter("dilla_snare_late"), 0.001f);
    EXPECT_NEAR(0.85f, drum->getParameter("dilla_kick_tight"), 0.001f);

    delete drum;
}

TEST(TimingPresets_NeoSoulPocket)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Neo-Soul Pocket preset
    drum->setParameter("dilla_amount", 0.55f);
    drum->setParameter("dilla_hat_bias", 0.65f);
    drum->setParameter("dilla_snare_late", 0.9f);
    drum->setParameter("dilla_kick_tight", 0.7f);

    EXPECT_NEAR(0.55f, drum->getParameter("dilla_amount"), 0.001f);
    EXPECT_NEAR(0.65f, drum->getParameter("dilla_hat_bias"), 0.001f);
    EXPECT_NEAR(0.9f, drum->getParameter("dilla_snare_late"), 0.001f);
    EXPECT_NEAR(0.7f, drum->getParameter("dilla_kick_tight"), 0.001f);

    delete drum;
}

TEST(TimingPresets_DrunkDilla)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Drunk Dilla preset
    drum->setParameter("dilla_amount", 0.85f);
    drum->setParameter("dilla_hat_bias", 0.55f);
    drum->setParameter("dilla_snare_late", 1.0f);
    drum->setParameter("dilla_kick_tight", 0.4f);

    EXPECT_NEAR(0.85f, drum->getParameter("dilla_amount"), 0.001f);
    EXPECT_NEAR(0.55f, drum->getParameter("dilla_hat_bias"), 0.001f);
    EXPECT_NEAR(1.0f, drum->getParameter("dilla_snare_late"), 0.001f);
    EXPECT_NEAR(0.4f, drum->getParameter("dilla_kick_tight"), 0.001f);

    delete drum;
}

TEST(PresetSaveLoad_TimingParameters)
{
    DSP::InstrumentDSP* drum = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum);
    drum->prepare(48000.0, 512);

    // Set timing parameters
    drum->setParameter("push_offset", -0.06f);
    drum->setParameter("pull_offset", +0.08f);
    drum->setParameter("dilla_amount", 0.75f);
    drum->setParameter("dilla_snare_late", 0.9f);

    // Save preset
    char jsonBuffer[8192];
    bool saved = drum->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    // Load into new instance
    DSP::InstrumentDSP* drum2 = DSP::createInstrument("DrumMachine");
    EXPECT_NOT_NULL(drum2);
    drum2->prepare(48000.0, 512);

    bool loaded = drum2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    // Verify timing parameters match
    EXPECT_NEAR(drum->getParameter("push_offset"),
                drum2->getParameter("push_offset"), 0.001f);
    EXPECT_NEAR(drum->getParameter("pull_offset"),
                drum2->getParameter("pull_offset"), 0.001f);
    EXPECT_NEAR(drum->getParameter("dilla_amount"),
                drum2->getParameter("dilla_amount"), 0.001f);
    EXPECT_NEAR(drum->getParameter("dilla_snare_late"),
                drum2->getParameter("dilla_snare_late"), 0.001f);

    delete drum;
    delete drum2;
}

} // namespace Test

//==============================================================================
// Main
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "Drum Machine Pure DSP Tests\n";
    std::cout << "===========================================\n\n";

    // Test 1: Factory Creation
    std::cout << "Running test 1: DrumMachineFactoryCreation...\n";
    try {
        Test::test_DrumMachineFactoryCreation();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 2: Prepare
    std::cout << "\nRunning test 2: DrumMachinePrepare...\n";
    try {
        Test::test_DrumMachinePrepare();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 3: Reset
    std::cout << "\nRunning test 3: DrumMachineReset...\n";
    try {
        Test::test_DrumMachineReset();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 4: Note On/Off
    std::cout << "\nRunning test 4: DrumMachineNoteOnOff...\n";
    try {
        Test::test_DrumMachineNoteOnOff();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 5: Process
    std::cout << "\nRunning test 5: DrumMachineProcess...\n";
    try {
        Test::test_DrumMachineProcess();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 6: Parameters
    std::cout << "\nRunning test 6: DrumMachineParameters...\n";
    try {
        Test::test_DrumMachineParameters();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 7: Preset Save/Load
    std::cout << "\nRunning test 7: DrumMachinePresetSaveLoad...\n";
    try {
        Test::test_DrumMachinePresetSaveLoad();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 8: Polyphony
    std::cout << "\nRunning test 8: DrumMachinePolyphony...\n";
    try {
        Test::test_DrumMachinePolyphony();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 9: Determinism
    std::cout << "\nRunning test 9: DrumMachineDeterminism...\n";
    try {
        Test::test_DrumMachineDeterminism();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 10: Timing Role Params Default Values
    std::cout << "\nRunning test 10: TimingRoleParams_DefaultValues...\n";
    try {
        Test::test_TimingRoleParams_DefaultValues();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 11: Dilla Params Default Values
    std::cout << "\nRunning test 11: DillaParams_DefaultValues...\n";
    try {
        Test::test_DillaParams_DefaultValues();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 12: Timing Role Can Modify Parameters
    std::cout << "\nRunning test 12: TimingRole_CanModifyParameters...\n";
    try {
        Test::test_TimingRole_CanModifyParameters();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 13: Dilla Time Can Modify Parameters
    std::cout << "\nRunning test 13: DillaTime_CanModifyParameters...\n";
    try {
        Test::test_DillaTime_CanModifyParameters();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 14: Timing Presets - Dilla Lite
    std::cout << "\nRunning test 14: TimingPresets_DillaLite...\n";
    try {
        Test::test_TimingPresets_DillaLite();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 15: Timing Presets - Neo Soul Pocket
    std::cout << "\nRunning test 15: TimingPresets_NeoSoulPocket...\n";
    try {
        Test::test_TimingPresets_NeoSoulPocket();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 16: Timing Presets - Drunk Dilla
    std::cout << "\nRunning test 16: TimingPresets_DrunkDilla...\n";
    try {
        Test::test_TimingPresets_DrunkDilla();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 17: Preset Save/Load - Timing Parameters
    std::cout << "\nRunning test 17: PresetSaveLoad_TimingParameters...\n";
    try {
        Test::test_PresetSaveLoad_TimingParameters();
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
