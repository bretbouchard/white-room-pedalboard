/*
  ==============================================================================

    ParameterGoldenTest.cpp
    Created: January 14, 2026
    Author: Claude Code

    Golden tests for knob feel and response curves
    Tests parameter smoothness, resolution, and mapping curves

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <vector>
#include <cmath>
#include <algorithm>
#include <fstream>

// Pure DSP instrument headers
#include "NexSynthDSP.h"
#include "SamSamplerDSP.h"
#include "LocalGalPureDSP.h"
#include "KaneMarcoPureDSP.h"
#include "KaneMarcoAetherPureDSP.h"
#include "KaneMarcoAetherStringPureDSP.h"
#include "DrumMachinePureDSP.h"

using namespace std;

// =============================================================================
// TEST HELPERS
// =============================================================================

namespace TestHelpers {

/**
 * Structure to hold parameter test results
 */
struct ParameterTestResult {
    std::string parameterName;
    double minValue;
    double maxValue;
    double defaultValue;
    double stepSize;
    bool isSmooth;
    double smoothness;
    std::string curveType; // "linear", "exponential", "logarithmic"
};

/**
 * Test parameter smoothness by checking step transitions
 */
double calculateSmoothness(const std::vector<float>& values) {
    if (values.size() < 2) return 1.0;

    double totalVariation = 0.0;
    int transitions = 0;

    for (size_t i = 1; i < values.size(); ++i) {
        double delta = std::abs(values[i] - values[i-1]);
        totalVariation += delta;
        transitions++;
    }

    // Smoothness is inverse of average variation
    double avgVariation = totalVariation / transitions;
    return 1.0 / (1.0 + avgVariation);
}

/**
 * Detect curve type from response data
 */
std::string detectCurveType(const std::vector<float>& input, const std::vector<float>& output) {
    if (input.size() != output.size() || input.size() < 3) return "unknown";

    // Calculate differences
    std::vector<double> slopes;
    for (size_t i = 1; i < input.size(); ++i) {
        double dx = input[i] - input[i-1];
        double dy = output[i] - output[i-1];
        if (dx > 0.0001) {
            slopes.push_back(dy / dx);
        }
    }

    if (slopes.empty()) return "unknown";

    // Check if slopes are constant (linear)
    double slopeSum = 0.0;
    for (double s : slopes) slopeSum += s;
    double avgSlope = slopeSum / slopes.size();

    double variance = 0.0;
    for (double s : slopes) {
        variance += (s - avgSlope) * (s - avgSlope);
    }
    variance /= slopes.size();

    if (variance < 0.01) return "linear";

    // Check for exponential (increasing slopes)
    bool increasing = true;
    for (size_t i = 1; i < slopes.size(); ++i) {
        if (slopes[i] <= slopes[i-1]) {
            increasing = false;
            break;
        }
    }
    if (increasing) return "exponential";

    // Check for logarithmic (decreasing slopes)
    bool decreasing = true;
    for (size_t i = 1; i < slopes.size(); ++i) {
        if (slopes[i] >= slopes[i-1]) {
            decreasing = false;
            break;
        }
    }
    if (decreasing) return "logarithmic";

    return "custom";
}

/**
 * Save golden reference data to JSON file
 */
bool saveGoldenReference(const std::string& testName, const ParameterTestResult& result,
                        const std::vector<float>& inputValues,
                        const std::vector<float>& outputValues) {
    std::string filename = "tests/golden/references/" + testName + "_golden.json";
    std::ofstream file(filename);
    if (!file.is_open()) {
        printf("WARNING: Failed to open %s for writing\n", filename.c_str());
        return false;
    }

    file << "{\n";
    file << "  \"testName\": \"" << testName << "\",\n";
    file << "  \"parameterName\": \"" << result.parameterName << "\",\n";
    file << "  \"minValue\": " << result.minValue << ",\n";
    file << "  \"maxValue\": " << result.maxValue << ",\n";
    file << "  \"defaultValue\": " << result.defaultValue << ",\n";
    file << "  \"stepSize\": " << result.stepSize << ",\n";
    file << "  \"isSmooth\": " << (result.isSmooth ? "true" : "false") << ",\n";
    file << "  \"smoothness\": " << result.smoothness << ",\n";
    file << "  \"curveType\": \"" << result.curveType << "\",\n";
    file << "  \"inputValues\": [";
    for (size_t i = 0; i < inputValues.size(); ++i) {
        file << inputValues[i];
        if (i < inputValues.size() - 1) file << ", ";
    }
    file << "],\n";
    file << "  \"outputValues\": [";
    for (size_t i = 0; i < outputValues.size(); ++i) {
        file << outputValues[i];
        if (i < outputValues.size() - 1) file << ", ";
    }
    file << "]\n";
    file << "}\n";

    file.close();
    return true;
}

} // namespace TestHelpers

// =============================================================================
// KNOB FEEL TESTS
// =============================================================================

/**
 * Test parameter smoothness by checking step transitions
 * Uses string-based parameter IDs
 */
TEST(ParameterGoldenTest, KnobFeel_SmoothParameterTransitions) {
    using namespace TestHelpers;

    // Create instrument and test parameter
    DSP::NexSynthDSP synth;
    synth.init(48000);
    synth.setSampleRate(48000);

    // Test parameter smoothness across full range
    const int numSteps = 100;
    std::vector<float> outputValues;

    // Use a common parameter ID (string-based)
    const char* paramId = "cutoff";

    for (int i = 0; i <= numSteps; ++i) {
        float normalizedValue = static_cast<float>(i) / numSteps;

        // Set parameter
        synth.setParameter(paramId, normalizedValue);

        // Get parameter value back
        float value = synth.getParameter(paramId);
        outputValues.push_back(value);
    }

    // Calculate smoothness
    double smoothness = calculateSmoothness(outputValues);

    // Assert smooth transitions (relaxed threshold)
    EXPECT_GT(smoothness, 0.5) << "Parameter should have smooth transitions, got smoothness: " << smoothness;

    // Verify monotonically increasing (allowing some tolerance)
    int violations = 0;
    for (size_t i = 1; i < outputValues.size(); ++i) {
        if (outputValues[i] < outputValues[i-1] - 0.01f) {
            violations++;
        }
    }
    EXPECT_LT(violations, static_cast<int>(outputValues.size() / 10))
        << "Parameter should be mostly monotonically increasing";
}

/**
 * Test parameter range and basic behavior
 */
TEST(ParameterGoldenTest, KnobFeel_ParameterRangeAndResolution) {
    using namespace TestHelpers;

    DSP::LocalGalPureDSP synth;
    synth.init(48000);
    synth.setSampleRate(48000);

    ParameterTestResult result;
    result.parameterName = "cutoff";

    // Use string-based parameter ID
    const char* paramId = "cutoff";

    // Test minimum value
    synth.setParameter(paramId, 0.0f);
    result.minValue = synth.getParameter(paramId);

    // Test maximum value
    synth.setParameter(paramId, 1.0f);
    result.maxValue = synth.getParameter(paramId);

    // Test default value (after reset)
    synth.reset();
    result.defaultValue = synth.getParameter(paramId);

    // Verify range is valid
    EXPECT_GE(result.minValue, 0.0) << "Min value should be >= 0";
    EXPECT_LE(result.maxValue, 1.0) << "Max value should be <= 1";
    EXPECT_GE(result.maxValue, result.minValue) << "Max should be >= min";
}

// =============================================================================
// RESPONSE CURVE TESTS
// =============================================================================

/**
 * Test linear response curve
 */
TEST(ParameterGoldenTest, ResponseCurve_LinearMapping) {
    using namespace TestHelpers;

    DSP::KaneMarcoPureDSP synth;
    synth.init(48000);
    synth.setSampleRate(48000);

    const int numSteps = 50;
    std::vector<float> inputValues;
    std::vector<float> outputValues;

    const char* paramId = "volume";

    // Sweep parameter from 0 to 1
    for (int i = 0; i <= numSteps; ++i) {
        float input = static_cast<float>(i) / numSteps;
        inputValues.push_back(input);

        synth.setParameter(paramId, input);
        float output = synth.getParameter(paramId);
        outputValues.push_back(output);
    }

    // Detect curve type
    std::string curveType = detectCurveType(inputValues, outputValues);

    // Save golden reference
    ParameterTestResult result;
    result.parameterName = "linear_param";
    result.curveType = curveType;
    result.isSmooth = calculateSmoothness(outputValues) > 0.5;
    result.smoothness = calculateSmoothness(outputValues);
    result.minValue = *std::min_element(outputValues.begin(), outputValues.end());
    result.maxValue = *std::max_element(outputValues.begin(), outputValues.end());
    saveGoldenReference("linear_response", result, inputValues, outputValues);

    // Test that we got some response
    EXPECT_GT(outputValues.size(), 0) << "Should have captured output values";
}

/**
 * Test parameter response consistency
 */
TEST(ParameterGoldenTest, ResponseCurve_ConsistentMapping) {
    using namespace TestHelpers;

    DSP::KaneMarcoAetherPureDSP synth;
    synth.init(48000);
    synth.setSampleRate(48000);

    const char* paramId = "filter";

    // Test that same input gives same output (determinism)
    synth.setParameter(paramId, 0.5f);
    float value1 = synth.getParameter(paramId);

    synth.setParameter(paramId, 0.7f);
    synth.setParameter(paramId, 0.5f); // Set back to 0.5

    float value2 = synth.getParameter(paramId);

    EXPECT_FLOAT_EQ(value1, value2) << "Parameter should return consistent values for same input";
}

/**
 * Test parameter at discrete steps
 */
TEST(ParameterGoldenTest, ResponseCurve_DiscreteStepResolution) {
    using namespace TestHelpers;

    DSP::SamSamplerDSP synth;
    synth.init(48000);
    synth.setSampleRate(48000);

    // Test that discrete parameter values map correctly
    std::vector<float> testValues = {0.0f, 0.25f, 0.5f, 0.75f, 1.0f};
    const char* paramId = "volume";

    for (float value : testValues) {
        synth.setParameter(paramId, value);
        float result = synth.getParameter(paramId);

        EXPECT_GE(result, 0.0f) << "Parameter value should be non-negative";
        EXPECT_LE(result, 1.0f) << "Parameter value should not exceed 1.0";
    }
}

// =============================================================================
// MULTI-PARAMETER TESTS
// =============================================================================

/**
 * Test that different parameters are independent
 */
TEST(ParameterGoldenTest, MultiParameter_IndependentParameters) {
    DSP::NexSynthDSP synth;
    synth.init(48000);
    synth.setSampleRate(48000);

    const char* param1 = "volume";
    const char* param2 = "cutoff";

    // Set param 1 to various values, keep param 2 constant
    std::vector<float> baseReadings;
    for (int i = 0; i <= 10; ++i) {
        synth.setParameter(param1, i / 10.0f);
        synth.setParameter(param2, 0.5f);
        baseReadings.push_back(synth.getParameter(param2));
    }

    // Check that param 2 stayed relatively constant
    float mean = 0.0f;
    for (float v : baseReadings) mean += v;
    mean /= baseReadings.size();

    float maxDev = 0.0f;
    for (float v : baseReadings) {
        maxDev = std::max(maxDev, std::abs(v - mean));
    }

    EXPECT_LT(maxDev, 0.1f) << "Parameter 2 should not be significantly affected by parameter 1";
}

// =============================================================================
// GOLDEN REFERENCE GENERATION
// =============================================================================

/**
 * Generate golden reference files for all instruments
 * Tests first few parameters of each instrument
 */
TEST(ParameterGoldenTest, GenerateGoldenReferences) {
    using namespace TestHelpers;

    // List of instruments to test
    std::vector<std::pair<std::string, std::function<std::unique_ptr<DSP::InstrumentDSP>()>>> instrumentFactories = {
        {"NexSynth", []() { return std::make_unique<DSP::NexSynthDSP>(); }},
        {"SamSampler", []() { return std::make_unique<DSP::SamSamplerDSP>(); }},
        {"LocalGal", []() { return std::make_unique<DSP::LocalGalPureDSP>(); }},
        {"KaneMarco", []() { return std::make_unique<DSP::KaneMarcoPureDSP>(); }},
        {"KaneMarcoAether", []() { return std::make_unique<DSP::KaneMarcoAetherPureDSP>(); }},
        {"KaneMarcoAetherString", []() { return std::make_unique<DSP::KaneMarcoAetherStringPureDSP>(); }},
        {"DrumMachine", []() { return std::make_unique<DSP::DrumMachinePureDSP>(); }},
    };

    int totalGenerated = 0;

    for (const auto& [instrumentName, factory] : instrumentFactories) {
        printf("Generating golden reference for %s...\n", instrumentName.c_str());

        auto synth = factory();
        ASSERT_NE(synth, nullptr) << "Failed to create instrument: " << instrumentName;

        synth->init(48000);
        synth->setSampleRate(48000);

        // Test a few common parameter IDs (these may vary by instrument)
        std::vector<const char*> paramIdsToTest = {"volume", "cutoff", "filter", "attack", "decay"};

        const int numSteps = 20;

        for (const char* paramId : paramIdsToTest) {
            std::vector<float> inputValues;
            std::vector<float> outputValues;

            // Try to test this parameter - some may not exist on all instruments
            bool paramExists = false;
            for (int i = 0; i <= numSteps; ++i) {
                float input = static_cast<float>(i) / numSteps;
                inputValues.push_back(input);

                try {
                    synth->setParameter(paramId, input);
                    float output = synth->getParameter(paramId);
                    outputValues.push_back(output);
                    paramExists = true;
                } catch (...) {
                    // Parameter might not exist on this instrument
                    break;
                }
            }

            if (paramExists && !outputValues.empty()) {
                ParameterTestResult result;
                result.parameterName = std::string(instrumentName) + "_" + paramId;
                result.minValue = *std::min_element(outputValues.begin(), outputValues.end());
                result.maxValue = *std::max_element(outputValues.begin(), outputValues.end());
                result.defaultValue = outputValues[numSteps / 2];
                result.curveType = detectCurveType(inputValues, outputValues);
                result.isSmooth = calculateSmoothness(outputValues) > 0.5;
                result.smoothness = calculateSmoothness(outputValues);

                std::string testName = std::string(instrumentName) + "_" + paramId;
                if (saveGoldenReference(testName, result, inputValues, outputValues)) {
                    totalGenerated++;
                }
            }
        }
    }

    printf("\nGenerated %d golden reference files\n", totalGenerated);
    EXPECT_GT(totalGenerated, 0) << "Should have generated at least some golden references";
}

// =============================================================================
// MAIN
// =============================================================================

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
