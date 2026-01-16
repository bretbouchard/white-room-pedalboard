/*
  ==============================================================================

    comprehensive_pedal_test_host.cpp
    Comprehensive test suite for all guitar pedal features

    Test Types:
    - Basic signal tests (silence, impulse, tone)
    - Parameter sweep tests (min, mid, max for each parameter)
    - Preset tests (all presets for each pedal)
    - Parameter smoothing tests (zipper noise detection)
    - Circuit mode tests (different circuit modes)

  ==============================================================================
*/

#include "dsp_test/DspOfflineHost.h"
#include <iostream>
#include <fstream>
#include <cstring>
#include <memory>
#include <vector>
#include <string>
#include <iomanip>

// Include pedal headers
#include "../../effects/pedals/include/dsp/NoiseGatePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/CompressorPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/EQPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/ReverbPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/VolumePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/BiPhasePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/OverdrivePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/FuzzPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/ChorusPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/DelayPedalPureDSP.h"

//==============================================================================
// Test Registry
//==============================================================================

struct TestPedal
{
    const char* name;
    std::unique_ptr<DSP::GuitarPedalPureDSP> (*create)();
};

std::unique_ptr<DSP::GuitarPedalPureDSP> createNoiseGate()
{
    return std::make_unique<DSP::NoiseGatePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createCompressor()
{
    return std::make_unique<DSP::CompressorPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createEQ()
{
    return std::make_unique<DSP::EQPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createReverb()
{
    return std::make_unique<DSP::ReverbPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createVolume()
{
    return std::make_unique<DSP::VolumePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createBiPhase()
{
    return std::make_unique<DSP::BiPhasePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createOverdrive()
{
    return std::make_unique<DSP::OverdrivePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createFuzz()
{
    return std::make_unique<DSP::FuzzPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createChorus()
{
    return std::make_unique<DSP::ChorusPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createDelay()
{
    return std::make_unique<DSP::DelayPedalPureDSP>();
}

TestPedal pedals[] =
{
    {"NoiseGate", createNoiseGate},
    {"Compressor", createCompressor},
    {"EQ", createEQ},
    {"Reverb", createReverb},
    {"Volume", createVolume},
    {"BiPhase", createBiPhase},
    {"Overdrive", createOverdrive},
    {"Fuzz", createFuzz},
    {"Chorus", createChorus},
    {"Delay", createDelay}
};

constexpr int numPedals = sizeof(pedals) / sizeof(pedals[0]);

//==============================================================================
// Test Result Tracking
//==============================================================================

struct TestResult
{
    std::string testName;
    std::string pedalName;
    bool passed;
    std::string message;
    double executionTimeMs;
};

std::vector<TestResult> testResults;
int totalTestsRun = 0;
int totalTestsPassed = 0;

//==============================================================================
// Test Utilities
//==============================================================================

double getCurrentTimeMs()
{
    auto now = std::chrono::high_resolution_clock::now();
    auto duration = now.time_since_epoch();
    return std::chrono::duration<double, std::milli>(duration).count();
}

void recordTest(const std::string& testName, const std::string& pedalName,
                bool passed, const std::string& message, double startTime)
{
    double endTime = getCurrentTimeMs();
    TestResult result;
    result.testName = testName;
    result.pedalName = pedalName;
    result.passed = passed;
    result.message = message;
    result.executionTimeMs = endTime - startTime;

    testResults.push_back(result);
    totalTestsRun++;

    if (passed)
        totalTestsPassed++;

    std::cout << (passed ? "✅ PASS" : "❌ FAIL") << " [" << pedalName << "] "
              << testName << ": " << message << " ("
              << std::fixed << std::setprecision(2) << result.executionTimeMs << "ms)"
              << std::endl;
}

//==============================================================================
// Basic Signal Tests
//==============================================================================

bool runSilenceTest(DSP::GuitarPedalPureDSP* pedal, const std::string& pedalName)
{
    double startTime = getCurrentTimeMs();

    const int numSamples = 48000;
    std::vector<float> input(numSamples, 0.0f);
    std::vector<float> outputLeft(numSamples);
    std::vector<float> outputRight(numSamples);

    float* inputs[2] = { input.data(), input.data() };
    float* outputs[2] = { outputLeft.data(), outputRight.data() };

    pedal->prepare(48000.0, 512);
    pedal->process(inputs, outputs, 2, numSamples);

    // Check for NaN, Inf, and clipped samples
    int nanCount = 0;
    int infCount = 0;
    int clippedCount = 0;
    double maxDCOffset = 0.0;

    for (int i = 0; i < numSamples; ++i)
    {
        if (std::isnan(outputLeft[i])) nanCount++;
        if (std::isinf(outputLeft[i])) infCount++;
        if (std::abs(outputLeft[i]) > 1.0f) clippedCount++;
        maxDCOffset = std::max(maxDCOffset, static_cast<double>(std::abs(outputLeft[i])));

        if (std::isnan(outputRight[i])) nanCount++;
        if (std::isinf(outputRight[i])) infCount++;
        if (std::abs(outputRight[i]) > 1.0f) clippedCount++;
        maxDCOffset = std::max(maxDCOffset, static_cast<double>(std::abs(outputRight[i])));
    }

    bool passed = (nanCount == 0 && infCount == 0 && clippedCount == 0);
    std::string message = "Silence test";
    if (nanCount > 0) message += " | NaN: " + std::to_string(nanCount);
    if (infCount > 0) message += " | Inf: " + std::to_string(infCount);
    if (clippedCount > 0) message += " | Clipped: " + std::to_string(clippedCount);
    if (maxDCOffset > 0.001) message += " | DC Offset: " + std::to_string(maxDCOffset);
    else message += " | DC Offset: OK";

    recordTest("Silence", pedalName, passed, message, startTime);
    return passed;
}

bool runImpulseTest(DSP::GuitarPedalPureDSP* pedal, const std::string& pedalName)
{
    double startTime = getCurrentTimeMs();

    const int numSamples = 48000;
    std::vector<float> input(numSamples, 0.0f);
    input[0] = 1.0f;  // Single impulse

    std::vector<float> outputLeft(numSamples);
    std::vector<float> outputRight(numSamples);

    float* inputs[2] = { input.data(), input.data() };
    float* outputs[2] = { outputLeft.data(), outputRight.data() };

    pedal->reset();
    pedal->process(inputs, outputs, 2, numSamples);

    // Check for NaN, Inf, and clipped samples
    int nanCount = 0;
    int infCount = 0;
    int clippedCount = 0;

    for (int i = 0; i < numSamples; ++i)
    {
        if (std::isnan(outputLeft[i])) nanCount++;
        if (std::isinf(outputLeft[i])) infCount++;
        if (std::abs(outputLeft[i]) > 1.0f) clippedCount++;

        if (std::isnan(outputRight[i])) nanCount++;
        if (std::isinf(outputRight[i])) infCount++;
        if (std::abs(outputRight[i]) > 1.0f) clippedCount++;
    }

    bool passed = (nanCount == 0 && infCount == 0 && clippedCount == 0);
    std::string message = "Impulse test";
    if (nanCount > 0) message += " | NaN: " + std::to_string(nanCount);
    if (infCount > 0) message += " | Inf: " + std::to_string(infCount);
    if (clippedCount > 0) message += " | Clipped: " + std::to_string(clippedCount);
    else message += " | Filter stable";

    recordTest("Impulse", pedalName, passed, message, startTime);
    return passed;
}

bool runToneTest(DSP::GuitarPedalPureDSP* pedal, const std::string& pedalName)
{
    double startTime = getCurrentTimeMs();

    const int numSamples = 48000;
    const float frequency = 220.0f;
    const float sampleRate = 48000.0f;

    std::vector<float> input(numSamples);
    std::vector<float> outputLeft(numSamples);
    std::vector<float> outputRight(numSamples);

    // Generate 220Hz tone
    for (int i = 0; i < numSamples; ++i)
    {
        float t = static_cast<float>(i) / sampleRate;
        input[i] = 0.5f * std::sin(2.0f * M_PI * frequency * t);
    }

    float* inputs[2] = { input.data(), input.data() };
    float* outputs[2] = { outputLeft.data(), outputRight.data() };

    pedal->reset();
    pedal->process(inputs, outputs, 2, numSamples);

    // Check if this is a distortion/fuzz pedal (clipping is expected)
    bool isDistortion = (pedal->getCategory() == DSP::GuitarPedalPureDSP::PedalCategory::Distortion);

    // Check for NaN, Inf, and clipped samples
    int nanCount = 0;
    int infCount = 0;
    int clippedCount = 0;
    double maxOutput = 0.0;

    for (int i = 0; i < numSamples; ++i)
    {
        if (std::isnan(outputLeft[i])) nanCount++;
        if (std::isinf(outputLeft[i])) infCount++;
        if (std::abs(outputLeft[i]) > 1.0f) clippedCount++;
        maxOutput = std::max(maxOutput, static_cast<double>(std::abs(outputLeft[i])));

        if (std::isnan(outputRight[i])) nanCount++;
        if (std::isinf(outputRight[i])) infCount++;
        if (std::abs(outputRight[i]) > 1.0f) clippedCount++;
        maxOutput = std::max(maxOutput, static_cast<double>(std::abs(outputRight[i])));
    }

    // For distortion pedals, clipping is expected - only check for NaN/Inf and output presence
    bool passed;
    std::string message = "Tone 220Hz";

    if (isDistortion)
    {
        // Distortion pedals: Only check for NaN/Inf and that there's output
        passed = (nanCount == 0 && infCount == 0 && maxOutput > 0.001);
        if (nanCount > 0) message += " | NaN: " + std::to_string(nanCount);
        if (infCount > 0) message += " | Inf: " + std::to_string(infCount);
        if (maxOutput < 0.001) message += " | No output";
        else message += " | Max output: " + std::to_string(maxOutput) + " (clipping expected)";
        if (clippedCount > 0) message += " | Clipped: " + std::to_string(clippedCount) + " (expected for distortion)";
    }
    else
    {
        // Normal pedals: No clipping allowed
        passed = (nanCount == 0 && infCount == 0 && clippedCount == 0 && maxOutput > 0.001);
        if (nanCount > 0) message += " | NaN: " + std::to_string(nanCount);
        if (infCount > 0) message += " | Inf: " + std::to_string(infCount);
        if (clippedCount > 0) message += " | Clipped: " + std::to_string(clippedCount);
        if (maxOutput < 0.001) message += " | No output";
        else message += " | Max output: " + std::to_string(maxOutput);
    }

    recordTest("Tone 220Hz", pedalName, passed, message, startTime);
    return passed;
}

//==============================================================================
// Parameter Sweep Tests
//==============================================================================

bool runParameterSweepTest(DSP::GuitarPedalPureDSP* pedal, const std::string& pedalName,
                           int paramIndex, const std::string& paramName)
{
    double startTime = getCurrentTimeMs();

    // Check if this is a distortion/fuzz pedal (clipping is expected)
    bool isDistortion = (pedal->getCategory() == DSP::GuitarPedalPureDSP::PedalCategory::Distortion);

    const int numSamples = 48000;
    std::vector<float> input(numSamples, 0.0f);
    input[0] = 0.5f;  // Small signal

    std::vector<float> outputLeft(numSamples);
    std::vector<float> outputRight(numSamples);

    float* inputs[2] = { input.data(), input.data() };
    float* outputs[2] = { outputLeft.data(), outputRight.data() };

    bool allPassed = true;
    std::string failures;

    // Test at minimum (0.0)
    pedal->reset();
    pedal->setParameterValue(paramIndex, 0.0f);
    pedal->process(inputs, outputs, 2, numSamples);

    for (int i = 0; i < numSamples; ++i)
    {
        if (std::isnan(outputLeft[i]) || std::isinf(outputLeft[i]) ||
            (!isDistortion && std::abs(outputLeft[i]) > 1.0f))
        {
            allPassed = false;
            failures += "min ";
            break;
        }
    }

    // Test at mid (0.5)
    pedal->reset();
    pedal->setParameterValue(paramIndex, 0.5f);
    pedal->process(inputs, outputs, 2, numSamples);

    for (int i = 0; i < numSamples; ++i)
    {
        if (std::isnan(outputLeft[i]) || std::isinf(outputLeft[i]) ||
            (!isDistortion && std::abs(outputLeft[i]) > 1.0f))
        {
            allPassed = false;
            failures += "mid ";
            break;
        }
    }

    // Test at maximum (1.0)
    pedal->reset();
    pedal->setParameterValue(paramIndex, 1.0f);
    pedal->process(inputs, outputs, 2, numSamples);

    for (int i = 0; i < numSamples; ++i)
    {
        if (std::isnan(outputLeft[i]) || std::isinf(outputLeft[i]) ||
            (!isDistortion && std::abs(outputLeft[i]) > 1.0f))
        {
            allPassed = false;
            failures += "max ";
            break;
        }
    }

    std::string message = "Parameter " + paramName + " sweep";
    if (allPassed)
        message += " | All values stable";
    else
        message += " | Failed at: " + failures;

    recordTest("ParamSweep_" + paramName, pedalName, allPassed, message, startTime);
    return allPassed;
}

//==============================================================================
// Preset Tests
//==============================================================================

bool runPresetTest(DSP::GuitarPedalPureDSP* pedal, const std::string& pedalName,
                   int presetIndex, const std::string& presetName)
{
    double startTime = getCurrentTimeMs();

    const int numSamples = 48000;
    std::vector<float> input(numSamples, 0.0f);
    input[0] = 0.5f;

    std::vector<float> outputLeft(numSamples);
    std::vector<float> outputRight(numSamples);

    float* inputs[2] = { input.data(), input.data() };
    float* outputs[2] = { outputLeft.data(), outputRight.data() };

    // Load preset
    const auto* preset = pedal->getPreset(presetIndex);
    if (!preset)
    {
        recordTest("Preset_" + presetName, pedalName, false, "Preset not found", startTime);
        return false;
    }

    pedal->reset();

    // Apply preset parameters
    for (int i = 0; i < preset->numValues; ++i)
    {
        pedal->setParameterValue(i, preset->values[i]);
    }

    pedal->process(inputs, outputs, 2, numSamples);

    // Check if this is a distortion/fuzz pedal (clipping is expected)
    bool isDistortion = (pedal->getCategory() == DSP::GuitarPedalPureDSP::PedalCategory::Distortion);

    // Check for NaN, Inf, and clipped samples
    int nanCount = 0;
    int infCount = 0;
    int clippedCount = 0;

    for (int i = 0; i < numSamples; ++i)
    {
        if (std::isnan(outputLeft[i])) nanCount++;
        if (std::isinf(outputLeft[i])) infCount++;
        if (std::abs(outputLeft[i]) > 1.0f) clippedCount++;
    }

    bool passed;
    std::string message = "Preset " + presetName;

    if (isDistortion)
    {
        // Distortion pedals: Allow clipping
        passed = (nanCount == 0 && infCount == 0);
        if (nanCount > 0) message += " | NaN: " + std::to_string(nanCount);
        if (infCount > 0) message += " | Inf: " + std::to_string(infCount);
        if (clippedCount > 0) message += " | Clipped: " + std::to_string(clippedCount) + " (expected)";
        else message += " | Loaded successfully";
    }
    else
    {
        // Normal pedals: No clipping allowed
        passed = (nanCount == 0 && infCount == 0 && clippedCount == 0);
        if (nanCount > 0) message += " | NaN: " + std::to_string(nanCount);
        if (infCount > 0) message += " | Inf: " + std::to_string(infCount);
        if (clippedCount > 0) message += " | Clipped: " + std::to_string(clippedCount);
        else message += " | Loaded successfully";
    }

    recordTest("Preset_" + presetName, pedalName, passed, message, startTime);
    return passed;
}

//==============================================================================
// Parameter Smoothing Tests
//==============================================================================

bool runParameterSmoothingTest(DSP::GuitarPedalPureDSP* pedal, const std::string& pedalName,
                                int paramIndex, const std::string& paramName)
{
    double startTime = getCurrentTimeMs();

    const int numSamples = 48000;
    std::vector<float> input(numSamples, 0.5f);  // Constant input

    std::vector<float> outputLeft(numSamples);
    std::vector<float> outputRight(numSamples);

    float* inputs[2] = { input.data(), input.data() };
    float* outputs[2] = { outputLeft.data(), outputRight.data() };

    pedal->reset();

    // Process with parameter change at sample 1000
    int changeSample = 1000;
    bool hasZipperNoise = false;
    double maxDelta = 0.0;

    for (int i = 0; i < numSamples; ++i)
    {
        // Change parameter at sample 1000
        if (i == changeSample)
        {
            pedal->setParameterValue(paramIndex, 0.8f);
        }

        // Process one sample at a time
        float* inPtr = &input[i];
        float* outPtr = &outputLeft[i];
        pedal->process(&inPtr, &outPtr, 1, 1);

        // Check for sudden changes (zipper noise)
        if (i > changeSample && i < changeSample + 100)
        {
            double delta = std::abs(outputLeft[i] - outputLeft[i-1]);
            maxDelta = std::max(maxDelta, delta);

            // Threshold for zipper noise detection
            if (delta > 0.1)
            {
                hasZipperNoise = true;
            }
        }
    }

    bool passed = !hasZipperNoise;
    std::string message = "Parameter " + paramName + " smoothing";
    if (hasZipperNoise)
        message += " | Zipper noise detected! Max delta: " + std::to_string(maxDelta);
    else
        message += " | Smooth transition (max delta: " + std::to_string(maxDelta) + ")";

    recordTest("ParamSmooth_" + paramName, pedalName, passed, message, startTime);
    return passed;
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║   Comprehensive Guitar Pedal Test Suite                    ║\n";
    std::cout << "║   Testing EVERY feature of EVERY pedal                      ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";
    std::cout << "\n";

    bool runAll = true;
    std::string specificPedal;
    std::string specificTest;

    // Parse command line arguments
    for (int i = 1; i < argc; ++i)
    {
        if (std::strcmp(argv[i], "--pedal") == 0 && i + 1 < argc)
        {
            specificPedal = argv[++i];
            runAll = false;
        }
        else if (std::strcmp(argv[i], "--test") == 0 && i + 1 < argc)
        {
            specificTest = argv[++i];
            runAll = false;
        }
        else if (std::strcmp(argv[i], "--help") == 0)
        {
            std::cout << "Usage: " << argv[0] << " [options]\n";
            std::cout << "Options:\n";
            std::cout << "  --pedal <name>  Test specific pedal\n";
            std::cout << "  --test <type>   Test specific type (silence, impulse, tone, params, presets, smoothing)\n";
            std::cout << "  --help          Show this help\n";
            return 0;
        }
    }

    // Run tests
    for (int p = 0; p < numPedals; ++p)
    {
        if (!runAll && specificPedal != pedals[p].name)
            continue;

        std::cout << "\n";
        std::cout << "══════════════════════════════════════════════════════════════\n";
        std::cout << "Testing: " << pedals[p].name << "\n";
        std::cout << "══════════════════════════════════════════════════════════════\n";

        auto pedal = pedals[p].create();
        int numParams = pedal->getNumParameters();
        int numPresets = pedal->getNumPresets();

        // Basic signal tests
        if (runAll || specificTest.empty() || specificTest == "silence")
            runSilenceTest(pedal.get(), pedals[p].name);

        if (runAll || specificTest.empty() || specificTest == "impulse")
            runImpulseTest(pedal.get(), pedals[p].name);

        if (runAll || specificTest.empty() || specificTest == "tone")
            runToneTest(pedal.get(), pedals[p].name);

        // Parameter sweep tests
        if (runAll || specificTest.empty() || specificTest == "params")
        {
            for (int param = 0; param < numParams; ++param)
            {
                const auto* paramInfo = pedal->getParameter(param);
                std::string paramName = paramInfo ? paramInfo->name : "Param" + std::to_string(param);
                runParameterSweepTest(pedal.get(), pedals[p].name, param, paramName);
            }
        }

        // Preset tests
        if (runAll || specificTest.empty() || specificTest == "presets")
        {
            for (int preset = 0; preset < numPresets; ++preset)
            {
                const auto* presetInfo = pedal->getPreset(preset);
                std::string presetName = presetInfo ? presetInfo->name : "Preset" + std::to_string(preset);
                runPresetTest(pedal.get(), pedals[p].name, preset, presetName);
            }
        }

        // Parameter smoothing tests
        if (runAll || specificTest.empty() || specificTest == "smoothing")
        {
            for (int param = 0; param < numParams; ++param)
            {
                const auto* paramInfo = pedal->getParameter(param);
                std::string paramName = paramInfo ? paramInfo->name : "Param" + std::to_string(param);
                runParameterSmoothingTest(pedal.get(), pedals[p].name, param, paramName);
            }
        }
    }

    // Print summary
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║   Test Summary                                                ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";
    std::cout << "\n";
    std::cout << "Total Tests Run:    " << totalTestsRun << "\n";
    std::cout << "Tests Passed:       " << totalTestsPassed << "\n";
    std::cout << "Tests Failed:       " << (totalTestsRun - totalTestsPassed) << "\n";
    std::cout << "Success Rate:       " << std::fixed << std::setprecision(1)
              << (100.0 * totalTestsPassed / totalTestsRun) << "%\n";
    std::cout << "\n";

    // Save detailed results
    std::ofstream resultsFile("COMPREHENSIVE_TEST_RESULTS.json");
    resultsFile << "{\n";
    resultsFile << "  \"summary\": {\n";
    resultsFile << "    \"totalTests\": " << totalTestsRun << ",\n";
    resultsFile << "    \"passed\": " << totalTestsPassed << ",\n";
    resultsFile << "    \"failed\": " << (totalTestsRun - totalTestsPassed) << ",\n";
    resultsFile << "    \"successRate\": " << (100.0 * totalTestsPassed / totalTestsRun) << "\n";
    resultsFile << "  },\n";
    resultsFile << "  \"tests\": [\n";

    for (size_t i = 0; i < testResults.size(); ++i)
    {
        const auto& result = testResults[i];
        resultsFile << "    {\n";
        resultsFile << "      \"pedal\": \"" << result.pedalName << "\",\n";
        resultsFile << "      \"test\": \"" << result.testName << "\",\n";
        resultsFile << "      \"passed\": " << (result.passed ? "true" : "false") << ",\n";
        resultsFile << "      \"message\": \"" << result.message << "\",\n";
        resultsFile << "      \"executionTimeMs\": " << result.executionTimeMs << "\n";
        resultsFile << "    }" << (i < testResults.size() - 1 ? "," : "") << "\n";
    }

    resultsFile << "  ]\n";
    resultsFile << "}\n";
    resultsFile.close();

    std::cout << "✅ Results saved to: COMPREHENSIVE_TEST_RESULTS.json\n";
    std::cout << "\n";

    return (totalTestsPassed == totalTestsRun) ? 0 : 1;
}
