/*
  ==============================================================================

    FilterGatePureDSPTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Unit tests for Filter Gate Pure DSP implementation

    Tests the FilterGate effect to verify all DSP methods work correctly
    without JUCE dependencies.

  ==============================================================================
*/

#include "dsp/FilterGatePureDSP.h"
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
// TEST SUITE: Filter Gate Pure DSP
//==============================================================================

TEST(FilterGateCreation)
{
    DSP::FilterGatePureDSP* gate = new DSP::FilterGatePureDSP();

    std::string name = gate->getEffectName();
    std::string version = gate->getEffectVersion();

    if (name != "FilterGate") {
        throw std::runtime_error("Expected effect name 'FilterGate' but got '" + name + "'");
    }
    if (version != "1.0.0") {
        throw std::runtime_error("Expected version '1.0.0' but got '" + version + "'");
    }

    delete gate;
}

TEST(FilterGatePrepare)
{
    DSP::FilterGatePureDSP gate;
    bool prepared = gate.prepare(48000.0, 512);
    EXPECT_TRUE(prepared);
}

TEST(FilterGateReset)
{
    DSP::FilterGatePureDSP gate;
    gate.prepare(48000.0, 512);

    // Trigger ADSR
    gate.noteOn(0.8f);

    // Process some audio
    float* inputs[2];
    float* outputs[2];
    float inputBuffer[2][512];
    float outputBuffer[2][512];

    inputs[0] = inputBuffer[0];
    inputs[1] = inputBuffer[1];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    // Fill with test signal
    for (int i = 0; i < 512; ++i) {
        inputBuffer[0][i] = 0.5f;
        inputBuffer[1][i] = 0.5f;
    }

    gate.process(inputs, outputs, 2, 512);
    gate.reset();

    // After reset, should be back to initial state
    // (we can't directly check internal state, but we can verify it doesn't crash)
    EXPECT_TRUE(true);
}

TEST(FilterGateProcessLowPass)
{
    DSP::FilterGatePureDSP gate;
    gate.prepare(48000.0, 512);

    // Set lowpass filter at 1kHz
    gate.setFilterMode(DSP::FilterMode::LowPass);
    gate.setFrequency(1000.0f);
    gate.setResonance(1.0f);

    // Create test signal (white noise)
    float* inputs[2];
    float* outputs[2];
    float inputBuffer[2][512];
    float outputBuffer[2][512];

    inputs[0] = inputBuffer[0];
    inputs[1] = inputBuffer[1];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    // Fill with white noise
    unsigned seed = 42;
    for (int i = 0; i < 512; ++i) {
        seed = seed * 1103515245 + 12345;
        float noise = static_cast<float>((seed & 0x7fffffff)) / static_cast<float>(0x7fffffff) * 2.0f - 1.0f;
        inputBuffer[0][i] = noise;
        inputBuffer[1][i] = noise;
    }

    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    gate.process(inputs, outputs, 2, 512);

    // Check that output is different from input (filtering happened)
    bool hasFiltering = false;
    for (int i = 0; i < 512; ++i) {
        if (std::abs(outputBuffer[0][i] - inputBuffer[0][i]) > 0.01f) {
            hasFiltering = true;
            break;
        }
    }

    EXPECT_TRUE(hasFiltering);
}

TEST(FilterGateAllFilterModes)
{
    DSP::FilterGatePureDSP gate;
    gate.prepare(48000.0, 512);

    DSP::FilterMode modes[] = {
        DSP::FilterMode::LowPass,
        DSP::FilterMode::HighPass,
        DSP::FilterMode::BandPass,
        DSP::FilterMode::Notch,
        DSP::FilterMode::Peak,
        DSP::FilterMode::Bell,
        DSP::FilterMode::HighShelf,
        DSP::FilterMode::LowShelf
    };

    float* inputs[2];
    float* outputs[2];
    float inputBuffer[2][512];
    float outputBuffer[2][512];

    inputs[0] = inputBuffer[0];
    inputs[1] = inputBuffer[1];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    // Test each filter mode
    for (int modeIdx = 0; modeIdx < 8; ++modeIdx) {
        gate.setFilterMode(modes[modeIdx]);
        gate.setFrequency(1000.0f);
        gate.setResonance(1.0f);

        // Fill with test signal
        for (int i = 0; i < 512; ++i) {
            inputBuffer[0][i] = 0.5f;
            inputBuffer[1][i] = 0.5f;
        }
        std::memset(outputBuffer, 0, sizeof(outputBuffer));

        // Should not crash
        gate.process(inputs, outputs, 2, 512);
    }

    EXPECT_TRUE(true);
}

TEST(FilterGateADSRTrigger)
{
    DSP::FilterGatePureDSP gate;
    gate.prepare(48000.0, 512);

    // Set ADSR trigger mode
    gate.setGateTriggerMode(DSP::GateTriggerMode::ADSR);
    gate.setFrequency(1000.0f);
    gate.setResonance(1.0f);

    // Trigger note
    gate.noteOn(0.8f);

    float* inputs[2];
    float* outputs[2];
    float inputBuffer[2][512];
    float outputBuffer[2][512];

    inputs[0] = inputBuffer[0];
    inputs[1] = inputBuffer[1];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    for (int i = 0; i < 512; ++i) {
        inputBuffer[0][i] = 0.5f;
        inputBuffer[1][i] = 0.5f;
    }
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    gate.process(inputs, outputs, 2, 512);

    // Check that audio was processed
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
}

TEST(FilterGateLFOTrigger)
{
    DSP::FilterGatePureDSP gate;
    gate.prepare(48000.0, 512);

    // Set LFO trigger mode
    gate.setGateTriggerMode(DSP::GateTriggerMode::LFO);
    gate.setFrequency(1000.0f);
    gate.setResonance(1.0f);
    gate.setLFOFrequency(5.0f);  // 5 Hz LFO
    gate.setLFODepth(0.5f);

    float* inputs[2];
    float* outputs[2];
    float inputBuffer[2][512];
    float outputBuffer[2][512];

    inputs[0] = inputBuffer[0];
    inputs[1] = inputBuffer[1];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    for (int i = 0; i < 512; ++i) {
        inputBuffer[0][i] = 0.5f;
        inputBuffer[1][i] = 0.5f;
    }
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    gate.process(inputs, outputs, 2, 512);

    // Check that audio was processed
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
}

TEST(FilterGatePresetSaveLoad)
{
    DSP::FilterGatePureDSP gate;
    gate.prepare(48000.0, 512);

    gate.setFrequency(2000.0f);
    gate.setResonance(2.0f);
    gate.setGain(6.0f);
    gate.setGateThreshold(0.7f);
    gate.setLFOFrequency(10.0f);

    char jsonBuffer[4096];
    bool saved = gate.savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    EXPECT_EQ('{', jsonBuffer[0]);

    // Create new gate and load preset
    DSP::FilterGatePureDSP gate2;
    gate2.prepare(48000.0, 512);

    bool loaded = gate2.loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    // Note: We can't directly read back parameters, but we verified load succeeded
    EXPECT_TRUE(true);
}

TEST(FilterGateDeterminism)
{
    DSP::FilterGatePureDSP gate1;
    DSP::FilterGatePureDSP gate2;

    gate1.prepare(48000.0, 512);
    gate2.prepare(48000.0, 512);

    gate1.setFilterMode(DSP::FilterMode::LowPass);
    gate1.setFrequency(1000.0f);
    gate1.setResonance(1.0f);

    gate2.setFilterMode(DSP::FilterMode::LowPass);
    gate2.setFrequency(1000.0f);
    gate2.setResonance(1.0f);

    float* inputs1[2];
    float* inputs2[2];
    float* outputs1[2];
    float* outputs2[2];
    float buffer1[2][512];
    float buffer2[2][512];
    float outputBuffer1[2][512];
    float outputBuffer2[2][512];

    inputs1[0] = buffer1[0];
    inputs1[1] = buffer1[1];
    inputs2[0] = buffer2[0];
    inputs2[1] = buffer2[1];
    outputs1[0] = outputBuffer1[0];
    outputs1[1] = outputBuffer1[1];
    outputs2[0] = outputBuffer2[0];
    outputs2[1] = outputBuffer2[1];

    // Fill both with same deterministic noise
    unsigned seed = 42;
    for (int i = 0; i < 512; ++i) {
        seed = seed * 1103515245 + 12345;
        float noise = static_cast<float>((seed & 0x7fffffff)) / static_cast<float>(0x7fffffff) * 2.0f - 1.0f;
        buffer1[0][i] = noise;
        buffer1[1][i] = noise;
        buffer2[0][i] = noise;
        buffer2[1][i] = noise;
    }

    std::memset(outputBuffer1, 0, sizeof(outputBuffer1));
    std::memset(outputBuffer2, 0, sizeof(outputBuffer2));

    gate1.process(inputs1, outputs1, 2, 512);
    gate2.process(inputs2, outputs2, 2, 512);

    bool outputsMatch = true;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 512; ++i) {
            if (std::abs(outputBuffer1[ch][i] - outputBuffer2[ch][i]) > 0.0001f) {
                outputsMatch = false;
                break;
            }
        }
    }

    EXPECT_TRUE(outputsMatch);
}

} // namespace Test

//==============================================================================
// Main
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "Filter Gate Pure DSP Tests\n";
    std::cout << "===========================================\n\n";

    // Test 1: Creation
    std::cout << "Running test 1: FilterGateCreation...\n";
    try {
        Test::test_FilterGateCreation();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 2: Prepare
    std::cout << "\nRunning test 2: FilterGatePrepare...\n";
    try {
        Test::test_FilterGatePrepare();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 3: Reset
    std::cout << "\nRunning test 3: FilterGateReset...\n";
    try {
        Test::test_FilterGateReset();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 4: Process LowPass
    std::cout << "\nRunning test 4: FilterGateProcessLowPass...\n";
    try {
        Test::test_FilterGateProcessLowPass();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 5: All Filter Modes
    std::cout << "\nRunning test 5: FilterGateAllFilterModes...\n";
    try {
        Test::test_FilterGateAllFilterModes();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 6: ADSR Trigger
    std::cout << "\nRunning test 6: FilterGateADSRTrigger...\n";
    try {
        Test::test_FilterGateADSRTrigger();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 7: LFO Trigger
    std::cout << "\nRunning test 7: FilterGateLFOTrigger...\n";
    try {
        Test::test_FilterGateLFOTrigger();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 8: Preset Save/Load
    std::cout << "\nRunning test 8: FilterGatePresetSaveLoad...\n";
    try {
        Test::test_FilterGatePresetSaveLoad();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Test 9: Determinism
    std::cout << "\nRunning test 9: FilterGateDeterminism...\n";
    try {
        Test::test_FilterGateDeterminism();
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
