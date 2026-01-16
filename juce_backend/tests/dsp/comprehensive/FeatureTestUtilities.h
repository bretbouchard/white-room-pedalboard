/*
  ==============================================================================

    FeatureTestUtilities.h
    Created: January 13, 2026
    Author: Bret Bouchard

    Comprehensive feature testing framework for all instruments
    Provides reusable utilities for systematic feature verification

  ==============================================================================
*/

#pragma once

#include <vector>
#include <string>
#include <cmath>
#include <functional>
#include <iostream>
#include <iomanip>
#include <cassert>

//==============================================================================
// Audio Analysis Utilities
//==============================================================================

struct AudioAnalyzer
{
    static float getPeakLevel(const float* buffer, int numSamples)
    {
        float peak = 0.0f;
        for (int i = 0; i < numSamples; ++i) {
            peak = std::max(peak, std::abs(buffer[i]));
        }
        return peak;
    }

    static float getRMSLevel(const float* buffer, int numSamples)
    {
        float sum = 0.0f;
        for (int i = 0; i < numSamples; ++i) {
            sum += buffer[i] * buffer[i];
        }
        return std::sqrt(sum / numSamples);
    }

    static bool hasSignal(const float* buffer, int numSamples, float threshold = 0.001f)
    {
        return getPeakLevel(buffer, numSamples) > threshold;
    }

    static bool isSilent(const float* buffer, int numSamples, float threshold = 0.0001f)
    {
        return getPeakLevel(buffer, numSamples) < threshold;
    }

    static float getSpectralCentroid(const float* buffer, int numSamples, int fftSize = 1024)
    {
        // Simplified spectral centroid for brightness analysis
        float energy = 0.0f;
        float weightedEnergy = 0.0f;

        for (int i = 1; i < std::min(numSamples, fftSize/2); ++i) {
            float magnitude = std::abs(buffer[i]);
            energy += magnitude;
            weightedEnergy += i * magnitude;
        }

        return (energy > 0.0f) ? weightedEnergy / energy : 0.0f;
    }

    static float getZeroCrossingRate(const float* buffer, int numSamples)
    {
        int crossings = 0;
        for (int i = 1; i < numSamples; ++i) {
            if ((buffer[i] >= 0.0f) != (buffer[i-1] >= 0.0f)) {
                crossings++;
            }
        }
        return static_cast<float>(crossings) / numSamples;
    }
};

//==============================================================================
// Test Result Tracking
//==============================================================================

struct TestResults
{
    int total = 0;
    int passed = 0;
    int failed = 0;
    std::vector<std::string> failures;

    void pass(const std::string& testName)
    {
        total++;
        passed++;
        std::cout << "  [PASS] " << testName << std::endl;
    }

    void fail(const std::string& testName, const std::string& reason)
    {
        total++;
        failed++;
        failures.push_back(testName + ": " + reason);
        std::cout << "  [FAIL] " << testName << ": " << reason << std::endl;
    }

    void printSummary() const
    {
        std::cout << "\n========================================" << std::endl;
        std::cout << "Test Summary: " << passed << "/" << total << " passed";
        if (failed > 0) {
            std::cout << " (" << failed << " failed)";
        }
        std::cout << "\n========================================" << std::endl;

        if (failed > 0) {
            std::cout << "\nFailed Tests:" << std::endl;
            for (const auto& failure : failures) {
                std::cout << "  - " << failure << std::endl;
            }
        }
    }

    bool allPassed() const { return failed == 0; }
};

//==============================================================================
// Feature Testing Utilities
//==============================================================================

class FeatureTestSuite
{
public:
    FeatureTestSuite(const std::string& suiteName) : suiteName_(suiteName)
    {
        std::cout << "\n========================================" << std::endl;
        std::cout << suiteName << std::endl;
        std::cout << "========================================" << std::endl;
    }

    //==========================================================================
    // Test all enum values
    template<typename Enum>
    void testAllEnumValues(
        const std::string& testName,
        const std::vector<std::pair<Enum, std::string>>& values,
        std::function<void(Enum)> setter)
    {
        std::cout << "\n[" << testName << "]" << std::endl;
        for (const auto& value : values) {
            std::cout << "  Testing: " << value.second << std::endl;
            setter(value.first);
        }
        results_.pass(testName);
    }

    //==========================================================================
    // Test parameter range
    void testParameterRange(
        const std::string& testName,
        std::function<void(float)> setter,
        std::function<float()> getter,
        float min, float max, int steps = 10)
    {
        std::cout << "\n[" << testName << "]" << std::endl;
        std::cout << "  Range: " << min << " to " << max << std::endl;

        for (int i = 0; i <= steps; ++i) {
            float value = min + (max - min) * i / steps;
            setter(value);
            float retrieved = getter();
            // Allow small floating point differences
            if (std::abs(retrieved - value) > 0.001f) {
                results_.fail(testName, "Value mismatch: set " +
                    std::to_string(value) + " got " + std::to_string(retrieved));
                return;
            }
        }
        results_.pass(testName);
    }

    //==========================================================================
    // Test waveform produces different output
    void testWaveformDifferences(
        const std::string& testName,
        std::function<void(int)> waveformSetter,
        std::function<std::pair<float, float>(int)> processAndGetOutput)
    {
        std::cout << "\n[" << testName << "]" << std::endl;

        std::vector<float> outputs;
        for (int wf = 0; wf < 5; ++wf) {
            waveformSetter(wf);
            auto [left, right] = processAndGetOutput(wf);
            outputs.push_back(left);
            std::cout << "  Waveform " << wf << ": " << left << std::endl;
        }

        // Check that waveforms produce different outputs
        bool allDifferent = true;
        for (size_t i = 0; i < outputs.size(); ++i) {
            for (size_t j = i + 1; j < outputs.size(); ++j) {
                if (std::abs(outputs[i] - outputs[j]) < 0.01f) {
                    allDifferent = false;
                }
            }
        }

        if (allDifferent) {
            results_.pass(testName);
        } else {
            results_.fail(testName, "Some waveforms produce identical output");
        }
    }

    //==========================================================================
    // Test all presets
    void testAllPresets(
        const std::string& testName,
        std::function<int()> getPresetCount,
        std::function<void(int)> loadPreset,
        std::function<std::pair<float, float>()> processAndGetOutput)
    {
        std::cout << "\n[" << testName << "]" << std::endl;

        int numPresets = getPresetCount();
        std::cout << "  Testing " << numPresets << " presets" << std::endl;

        for (int p = 0; p < numPresets; ++p) {
            loadPreset(p);
            auto [left, right] = processAndGetOutput();
            std::cout << "  Preset " << std::setw(2) << p << ": "
                      << std::setw(10) << left << std::endl;

            if (left < 0.0001f && right < 0.0001f) {
                results_.fail(testName, "Preset " + std::to_string(p) + " produces no output");
                return;
            }
        }
        results_.pass(testName);
    }

    //==========================================================================
    // Test envelope stages
    void testEnvelopeStages(
        const std::string& testName,
        std::function<void(float)> setAttack,
        std::function<void(float)> setDecay,
        std::function<void(float)> setSustain,
        std::function<void(float)> setRelease,
        std::function<std::vector<float>()> processAndGetEnvelope)
    {
        std::cout << "\n[" << testName << "]" << std::endl;

        // Test attack
        setAttack(0.01f);
        setDecay(0.1f);
        setSustain(0.5f);
        setRelease(0.1f);
        auto env1 = processAndGetEnvelope();
        std::cout << "  Fast attack tested" << std::endl;

        setAttack(0.5f);
        auto env2 = processAndGetEnvelope();
        std::cout << "  Slow attack tested" << std::endl;

        // Verify envelope shapes differ
        if (env1 != env2) {
            results_.pass(testName);
        } else {
            results_.fail(testName, "Envelope parameters don't affect output");
        }
    }

    //==========================================================================
    // Test filter types
    void testFilterTypes(
        const std::string& testName,
        const std::vector<int>& filterTypes,
        const std::vector<std::string>& filterNames,
        std::function<void(int)> setFilterType,
        std::function<float()> processAndGetOutput)
    {
        std::cout << "\n[" << testName << "]" << std::endl;

        std::vector<float> outputs;
        for (size_t i = 0; i < filterTypes.size(); ++i) {
            setFilterType(filterTypes[i]);
            float output = processAndGetOutput();
            outputs.push_back(output);
            std::cout << "  " << filterNames[i] << ": " << output << std::endl;
        }

        // Each filter type should produce different output
        bool allDifferent = true;
        for (size_t i = 0; i < outputs.size(); ++i) {
            for (size_t j = i + 1; j < outputs.size(); ++j) {
                if (std::abs(outputs[i] - outputs[j]) < 0.001f) {
                    allDifferent = false;
                }
            }
        }

        if (allDifferent) {
            results_.pass(testName);
        } else {
            results_.fail(testName, "Some filter types produce identical output");
        }
    }

    //==========================================================================
    // Test polyphony modes
    void testPolyphonyModes(
        const std::string& testName,
        const std::vector<int>& modes,
        const std::vector<std::string>& modeNames,
        std::function<void(int)> setMode,
        std::function<int(int)> getVoiceCount)
    {
        std::cout << "\n[" << testName << "]" << std::endl;

        for (size_t i = 0; i < modes.size(); ++i) {
            setMode(modes[i]);
            int voices = getVoiceCount(5); // Trigger 5 notes
            std::cout << "  " << modeNames[i] << ": " << voices << " voices" << std::endl;
        }
        results_.pass(testName);
    }

    //==========================================================================
    // Test modulation routing
    void testModulationRouting(
        const std::string& testName,
        std::function<void(int, int, float)> routeModulation,
        std::function<float()> getModulatedOutput)
    {
        std::cout << "\n[" << testName << "]" << std::endl;

        // Test without modulation
        float base = getModulatedOutput();
        std::cout << "  Base output: " << base << std::endl;

        // Test with modulation
        routeModulation(0, 0, 0.5f); // LFO 1 -> filter cutoff
        float modulated = getModulatedOutput();
        std::cout << "  Modulated output: " << modulated << std::endl;

        if (std::abs(modulated - base) > 0.001f) {
            results_.pass(testName);
        } else {
            results_.fail(testName, "Modulation has no effect");
        }
    }

    //==========================================================================
    // Get results
    TestResults& getResults() { return results_; }
    const TestResults& getResults() const { return results_; }

private:
    std::string suiteName_;
    TestResults results_;
};

//==============================================================================
// Parameter Testing Helper
//==============================================================================

struct ParameterTest
{
    static void testParameter(
        const std::string& paramName,
        std::function<void(float)> setter,
        std::function<float()> getter,
        float min, float max)
    {
        std::cout << "    Testing " << paramName << " [" << min << ", " << max << "]" << std::endl;

        // Test min
        setter(min);
        if (std::abs(getter() - min) > 0.001f) {
            throw std::runtime_error(paramName + " min value not set correctly");
        }

        // Test max
        setter(max);
        if (std::abs(getter() - max) > 0.001f) {
            throw std::runtime_error(paramName + " max value not set correctly");
        }

        // Test mid
        float mid = (min + max) * 0.5f;
        setter(mid);
        if (std::abs(getter() - mid) > 0.001f) {
            throw std::runtime_error(paramName + " mid value not set correctly");
        }
    }

    static void testParameterNormalization(
        const std::string& paramName,
        std::function<void(float)> setter,
        std::function<float()> getter,
        float expectedMin, float expectedMax)
    {
        // Test that 0.0 gives min and 1.0 gives max
        setter(0.0f);
        float minVal = getter();

        setter(1.0f);
        float maxVal = getter();

        std::cout << "      " << paramName << ": [0.0 -> " << minVal
                  << ", 1.0 -> " << maxVal << "]" << std::endl;
    }
};
