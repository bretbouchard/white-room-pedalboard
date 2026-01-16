/*
  ==============================================================================

    StereoProcessingTests.cpp
    Comprehensive tests for stereo processing enhancements
    Validates odd/even separation, width control, and mono compatibility

  ==============================================================================
*/

#include "../include/dsp/StereoProcessor.h"
#include <cassert>
#include <iostream>
#include <cmath>

namespace DSP {
namespace Test {

//==============================================================================
// Test Utilities
//==============================================================================

constexpr float EPSILON = 0.0001f;

bool approximatelyEqual(float a, float b, float epsilon = EPSILON)
{
    return std::abs(a - b) < epsilon;
}

void printTestResult(const char* testName, bool passed)
{
    std::cout << "[" << (passed ? "PASS" : "FAIL") << "] " << testName << std::endl;
}

//==============================================================================
// Stereo Width Tests
//==============================================================================

void testStereoWidthMono()
{
    // Mono input should remain unchanged with width=0
    float left = 0.5f;
    float right = 0.5f;

    StereoWidth::processWidth(left, right, 0.0f);

    assert(approximatelyEqual(left, 0.5f));
    assert(approximatelyEqual(right, 0.5f));
    printTestResult("Stereo Width Mono", true);
}

void testStereoWidthFull()
{
    // Full stereo with width=1
    float left = 1.0f;
    float right = 0.0f;

    StereoWidth::processWidth(left, right, 1.0f);

    // With full width, L+R should be preserved (mono compatibility)
    float sum = left + right;
    assert(approximatelyEqual(sum, 1.0f));
    printTestResult("Stereo Width Full", true);
}

void testStereoWidthPreserveMono()
{
    // Mono sum should be preserved
    float left = 0.7f;
    float right = 0.3f;
    float originalSum = left + right;

    StereoWidth::processWidthPreserveMono(left, right, 0.5f);

    float newSum = left + right;
    assert(approximatelyEqual(newSum, originalSum));
    printTestResult("Stereo Width Preserve Mono", true);
}

//==============================================================================
// Odd/Even Separation Tests
//==============================================================================

void testOddEvenSeparationEvenMode()
{
    // Even mode (index 0, 2, 4...) should go to left
    bool inLeft = OddEvenSeparation::isLeftChannel(0, true);
    bool inRight = OddEvenSeparation::isRightChannel(0, true);

    assert(inLeft == true);
    assert(inRight == false);
    printTestResult("Odd/Even Separation Even Mode", true);
}

void testOddEvenSeparationOddMode()
{
    // Odd mode (index 1, 3, 5...) should go to right
    bool inLeft = OddEvenSeparation::isLeftChannel(1, true);
    bool inRight = OddEvenSeparation::isRightChannel(1, true);

    assert(inLeft == false);
    assert(inRight == true);
    printTestResult("Odd/Even Separation Odd Mode", true);
}

void testOddEvenSeparationDisabled()
{
    // When disabled, all modes go to both channels
    bool inLeft = OddEvenSeparation::isLeftChannel(0, false);
    bool inRight = OddEvenSeparation::isRightChannel(1, false);

    assert(inLeft == true);
    assert(inRight == true);
    printTestResult("Odd/Even Separation Disabled", true);
}

void testOddEvenApplySeparation()
{
    float left = 0.0f;
    float right = 0.0f;

    // Even mode should go to left
    OddEvenSeparation::applySeparation(0, true, 1.0f, left, right, 1.0f);

    assert(approximatelyEqual(left, 1.0f));
    assert(approximatelyEqual(right, 0.0f));
    printTestResult("Odd/Even Apply Separation Even", true);

    left = 0.0f;
    right = 0.0f;

    // Odd mode should go to right
    OddEvenSeparation::applySeparation(1, true, 1.0f, left, right, 1.0f);

    assert(approximatelyEqual(left, 0.0f));
    assert(approximatelyEqual(right, 1.0f));
    printTestResult("Odd/Even Apply Separation Odd", true);
}

void testOddEvenMonoCompatibility()
{
    // Test mono compatibility with odd/even separation
    float left = 0.0f;
    float right = 0.0f;

    // Process multiple modes
    for (int i = 0; i < 6; ++i)
    {
        OddEvenSeparation::applySeparation(i, true, 0.5f, left, right, 1.0f);
    }

    // Mono sum should equal sum of all inputs
    float monoSum = left + right;
    float expectedSum = 6.0f * 0.5f;  // 6 modes at 0.5 each

    assert(approximatelyEqual(monoSum, expectedSum));
    printTestResult("Odd/Even Mono Compatibility", true);
}

//==============================================================================
// Stereo Detune Tests
//==============================================================================

void testStereoDetuneLeft()
{
    double baseFreq = 440.0;
    float detuneSemitones = 0.02f;

    double leftFreq = StereoDetune::applyDetune(baseFreq, detuneSemitones, 0);
    double rightFreq = StereoDetune::applyDetune(baseFreq, detuneSemitones, 1);

    // Left should be lower, right should be higher
    assert(leftFreq < baseFreq);
    assert(rightFreq > baseFreq);
    printTestResult("Stereo Detune Direction", true);
}

void testStereoDetuneSymmetry()
{
    double baseFreq = 440.0;
    float detuneSemitones = 0.1f;

    double leftFreq = StereoDetune::applyDetune(baseFreq, detuneSemitones, 0);
    double rightFreq = StereoDetune::applyDetune(baseFreq, detuneSemitones, 1);

    // Average should equal base frequency (symmetry)
    double avgFreq = (leftFreq + rightFreq) * 0.5;

    assert(approximatelyEqual(static_cast<float>(avgFreq), static_cast<float>(baseFreq), 0.001f));
    printTestResult("Stereo Detune Symmetry", true);
}

//==============================================================================
// Stereo Filter Offset Tests
//==============================================================================

void testStereoFilterOffset()
{
    double baseCutoff = 1000.0;
    float offsetAmount = 0.5f;

    double leftCutoff = StereoFilterOffset::calculateCutoff(baseCutoff, offsetAmount, 0, 48000.0);
    double rightCutoff = StereoFilterOffset::calculateCutoff(baseCutoff, offsetAmount, 1, 48000.0);

    // Left should be lower, right should be higher
    assert(leftCutoff < baseCutoff);
    assert(rightCutoff > baseCutoff);
    printTestResult("Stereo Filter Offset Direction", true);
}

void testStereoFilterNormalized()
{
    float baseNorm = 0.5f;
    float offsetAmount = 0.3f;

    float leftNorm = StereoFilterOffset::calculateNormalizedCutoff(baseNorm, offsetAmount, 0);
    float rightNorm = StereoFilterOffset::calculateNormalizedCutoff(baseNorm, offsetAmount, 1);

    // Left should be lower, right should be higher
    assert(leftNorm < baseNorm);
    assert(rightNorm > baseNorm);

    // Should be clamped to 0-1
    assert(leftNorm >= 0.0f && leftNorm <= 1.0f);
    assert(rightNorm >= 0.0f && rightNorm <= 1.0f);
    printTestResult("Stereo Filter Normalized Clamping", true);
}

//==============================================================================
// Ping Pong Delay Tests
//==============================================================================

void testPingPongDelayBasic()
{
    PingPongDelay delay;
    delay.prepare(48000.0);

    float left = 1.0f;
    float right = 0.0f;

    delay.process(left, right);

    // First sample should have some output
    // (delay lines will be empty, so output is mostly dry)
    assert(left >= 0.0f && left <= 1.0f);
    assert(right >= 0.0f && right <= 1.0f);
    printTestResult("Ping Pong Delay Basic", true);
}

//==============================================================================
// Integration Tests
//==============================================================================

void testMonoCompatibility()
{
    // Comprehensive mono compatibility test
    float testSignals[][2] = {
        {0.5f, 0.5f},   // Mono signal
        {1.0f, 0.0f},   // Hard left
        {0.0f, 1.0f},   // Hard right
        {0.7f, 0.3f},   // Centered
        {-0.5f, 0.5f},  // Out of phase
    };

    for (auto& signal : testSignals)
    {
        float left = signal[0];
        float right = signal[1];
        float originalSum = left + right;

        // Apply stereo width
        StereoWidth::processWidth(left, right, 0.7f);

        // Check mono sum is preserved
        float newSum = left + right;
        assert(approximatelyEqual(newSum, originalSum, 0.001f));
    }

    printTestResult("Mono Compatibility Integration", true);
}

void testOddEvenIntegration()
{
    // Test odd/even separation with multiple modes
    float left = 0.0f;
    float right = 0.0f;
    float width = 0.8f;

    // Simulate 10 modes with equal output
    for (int i = 0; i < 10; ++i)
    {
        OddEvenSeparation::applySeparation(i, true, 0.3f, left, right, width);
    }

    // Check that modes are distributed
    // Even modes (0,2,4,6,8) → Left: 5 modes * 0.3 = 1.5
    // Odd modes (1,3,5,7,9) → Right: 5 modes * 0.3 = 1.5
    assert(left > 0.0f);
    assert(right > 0.0f);

    // Mono sum should be preserved
    float monoSum = left + right;
    float expectedSum = 10.0f * 0.3f;
    assert(approximatelyEqual(monoSum, expectedSum, 0.1f));

    printTestResult("Odd/Even Integration", true);
}

void testStereoProcessor()
{
    // Test complete stereo processor
    StereoProcessor processor;
    processor.prepare(48000.0);

    processor.width = 0.6f;
    processor.detune = 0.03f;
    processor.filterOffset = 0.2f;
    processor.oddEvenSeparation = true;

    float left = 0.5f;
    float right = 0.5f;

    processor.process(left, right);

    // Check output is valid
    assert(left >= -2.0f && left <= 2.0f);
    assert(right >= -2.0f && right <= 2.0f);

    // Test frequency detuning
    double baseFreq = 440.0;
    double leftFreq = processor.getDetunedFrequency(baseFreq, 0);
    double rightFreq = processor.getDetunedFrequency(baseFreq, 1);

    assert(leftFreq < baseFreq);
    assert(rightFreq > baseFreq);

    // Test filter cutoff
    double baseCutoff = 1000.0;
    double leftCutoff = processor.getFilterCutoff(baseCutoff, 0, 48000.0);
    double rightCutoff = processor.getFilterCutoff(baseCutoff, 1, 48000.0);

    assert(leftCutoff < baseCutoff);
    assert(rightCutoff > baseCutoff);

    printTestResult("Stereo Processor Integration", true);
}

//==============================================================================
// Run All Tests
//==============================================================================

void runAllStereoTests()
{
    std::cout << "\n========== Stereo Processing Tests ==========\n" << std::endl;

    // Stereo Width Tests
    std::cout << "\n--- Stereo Width Tests ---" << std::endl;
    testStereoWidthMono();
    testStereoWidthFull();
    testStereoWidthPreserveMono();

    // Odd/Even Separation Tests
    std::cout << "\n--- Odd/Even Separation Tests ---" << std::endl;
    testOddEvenSeparationEvenMode();
    testOddEvenSeparationOddMode();
    testOddEvenSeparationDisabled();
    testOddEvenApplySeparation();
    testOddEvenMonoCompatibility();

    // Stereo Detune Tests
    std::cout << "\n--- Stereo Detune Tests ---" << std::endl;
    testStereoDetuneLeft();
    testStereoDetuneSymmetry();

    // Stereo Filter Offset Tests
    std::cout << "\n--- Stereo Filter Offset Tests ---" << std::endl;
    testStereoFilterOffset();
    testStereoFilterNormalized();

    // Ping Pong Delay Tests
    std::cout << "\n--- Ping Pong Delay Tests ---" << std::endl;
    testPingPongDelayBasic();

    // Integration Tests
    std::cout << "\n--- Integration Tests ---" << std::endl;
    testMonoCompatibility();
    testOddEvenIntegration();
    testStereoProcessor();

    std::cout << "\n========== All Tests Complete ==========\n" << std::endl;
}

} // namespace Test
} // namespace DSP

//==============================================================================
// Main Entry Point
//==============================================================================

int main()
{
    DSP::Test::runAllStereoTests();
    return 0;
}
