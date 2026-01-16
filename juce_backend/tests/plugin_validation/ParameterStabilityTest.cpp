/*
  ==============================================================================

    ParameterStabilityTest.cpp
    Created: January 13, 2026
    Author: Bret Bouchard

    Parameter Stability Tests for Plugin Validation
    Tests all parameter combinations and edge cases to ensure stability

  ==============================================================================
*/

#include "../../../instruments/kane_marco/include/dsp/KaneMarcoPureDSP.h"
#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
#include <iomanip>
#include <sstream>

using namespace DSP;

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
        if (failed > 0)
        {
            std::cout << " (" << failed << " failed)";
        }
        std::cout << "\n========================================" << std::endl;
    }

    bool allPassed() const { return failed == 0; }
};

//==============================================================================
// Audio Analysis Utilities
//==============================================================================

namespace AudioUtils
{
    float getPeakLevel(const float* buffer, int numSamples)
    {
        float peak = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            peak = std::max(peak, std::abs(buffer[i]));
        }
        return peak;
    }

    bool hasSignal(const float* buffer, int numSamples, float threshold = 0.001f)
    {
        return getPeakLevel(buffer, numSamples) > threshold;
    }

    bool isSilent(const float* buffer, int numSamples, float threshold = 0.0001f)
    {
        return getPeakLevel(buffer, numSamples) < threshold;
    }

    bool hasNaN(const float* buffer, int numSamples)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            if (std::isnan(buffer[i]) || std::isinf(buffer[i]))
                return true;
        }
        return false;
    }

    float getRMSLevel(const float* buffer, int numSamples)
    {
        float sum = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            sum += buffer[i] * buffer[i];
        }
        return std::sqrt(sum / numSamples);
    }
}

//==============================================================================
// Parameter Stability Test Suite
//==============================================================================

class ParameterStabilityTestSuite
{
public:
    static constexpr int sampleRate = 48000;
    static constexpr int bufferSize = 512;

    ParameterStabilityTestSuite() : synth_(nullptr)
    {
    }

    ~ParameterStabilityTestSuite()
    {
        delete synth_;
    }

    bool initialize()
    {
        synth_ = new KaneMarcoPureDSP();
        if (!synth_->prepare(static_cast<double>(sampleRate), bufferSize))
        {
            std::cerr << "Failed to prepare synth" << std::endl;
            return false;
        }
        return true;
    }

    void runAllTests(TestResults& results)
    {
        std::cout << "\n=== PARAMETER STABILITY TESTS ===" << std::endl;

        testAllParametersZero(results);
        testAllParametersMaximum(results);
        testParameterTransitions(results);
        testParameterRamping(results);
        testExtremeParameterCombinations(results);
        testRandomParameterCombinations(results);
    }

private:
    KaneMarcoPureDSP* synth_;

    // Process a note and return the output buffer
    std::vector<float> processNote(int midiNote = 60, float velocity = 0.8f, int durationMs = 100)
    {
        ScheduledEvent noteOn;
        noteOn.type = ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = midiNote;
        noteOn.data.note.velocity = velocity;
        synth_->handleEvent(noteOn);

        int numSamples = (durationMs * sampleRate) / 1000;
        std::vector<float> output(numSamples * 2); // Stereo

        float* outputs[] = { output.data(), output.data() + numSamples };

        int offset = 0;
        while (offset < numSamples)
        {
            int chunkSize = std::min(bufferSize, numSamples - offset);
            synth_->process(outputs + (offset * 2), 2, chunkSize);
            offset += chunkSize;
        }

        return output;
    }

    // Test 1: All parameters at zero
    void testAllParametersZero(TestResults& results)
    {
        std::cout << "\n--- Test 1: All Parameters Zero ---" << std::endl;

        // Set all parameters to zero
        const char* params[] = {
            "osc1Shape", "osc1Warp", "osc1PulseWidth", "osc1Detune", "osc1Pan", "osc1Level",
            "osc2Shape", "osc2Warp", "osc2PulseWidth", "osc2Detune", "osc2Pan", "osc2Level",
            "subLevel", "noiseLevel",
            "filterCutoff", "filterResonance",
            "lfo1Rate", "lfo1Depth", "lfo2Rate", "lfo2Depth"
        };

        for (const char* param : params)
        {
            synth_->setParameter(param, 0.0f);
        }

        auto output = processNote();

        // Check for signal
        if (AudioUtils::hasSignal(output.data(), output.size()))
        {
            results.pass("All parameters zero produces signal");
        }
        else
        {
            results.fail("All parameters zero produces signal", "No output detected");
        }

        // Check for NaN/Inf
        if (!AudioUtils::hasNaN(output.data(), output.size()))
        {
            results.pass("No NaN/Inf with zero parameters");
        }
        else
        {
            results.fail("No NaN/Inf with zero parameters", "NaN or Inf detected in output");
        }
    }

    // Test 2: All parameters at maximum
    void testAllParametersMaximum(TestResults& results)
    {
        std::cout << "\n--- Test 2: All Parameters Maximum ---" << std::endl;

        // Set all parameters to maximum
        const char* params[] = {
            "osc1Shape", "osc1Warp", "osc1PulseWidth", "osc1Detune", "osc1Pan", "osc1Level",
            "osc2Shape", "osc2Warp", "osc2PulseWidth", "osc2Detune", "osc2Pan", "osc2Level",
            "subLevel", "noiseLevel",
            "filterCutoff", "filterResonance",
            "lfo1Rate", "lfo1Depth", "lfo2Rate", "lfo2Depth"
        };

        for (const char* param : params)
        {
            synth_->setParameter(param, 1.0f);
        }

        auto output = processNote();

        // Check for signal
        if (AudioUtils::hasSignal(output.data(), output.size()))
        {
            results.pass("All parameters maximum produces signal");
        }
        else
        {
            results.fail("All parameters maximum produces signal", "No output detected");
        }

        // Check for NaN/Inf
        if (!AudioUtils::hasNaN(output.data(), output.size()))
        {
            results.pass("No NaN/Inf with maximum parameters");
        }
        else
        {
            results.fail("No NaN/Inf with maximum parameters", "NaN or Inf detected in output");
        }

        // Check for reasonable output level (not clipping excessively)
        float peak = AudioUtils::getPeakLevel(output.data(), output.size());
        if (peak < 10.0f) // Allow some headroom
        {
            results.pass("Output level reasonable at maximum parameters");
        }
        else
        {
            results.fail("Output level reasonable at maximum parameters", "Peak level too high: " + std::to_string(peak));
        }
    }

    // Test 3: Parameter transitions (min -> max -> min)
    void testParameterTransitions(TestResults& results)
    {
        std::cout << "\n--- Test 3: Parameter Transitions ---" << std::endl;

        const char* params[] = {
            "osc1Level", "osc2Level", "filterCutoff", "filterResonance",
            "lfo1Rate", "lfo1Depth"
        };

        for (const char* paramName : params)
        {
            bool transitionOk = true;

            // Min -> Max
            for (float value = 0.0f; value <= 1.0f; value += 0.1f)
            {
                synth_->setParameter(paramName, value);
                auto output = processNote();

                if (AudioUtils::hasNaN(output.data(), output.size()))
                {
                    transitionOk = false;
                    break;
                }
            }

            // Max -> Min
            for (float value = 1.0f; value >= 0.0f; value -= 0.1f)
            {
                synth_->setParameter(paramName, value);
                auto output = processNote();

                if (AudioUtils::hasNaN(output.data(), output.size()))
                {
                    transitionOk = false;
                    break;
                }
            }

            if (transitionOk)
            {
                results.pass(std::string("Parameter transition: ") + paramName);
            }
            else
            {
                results.fail(std::string("Parameter transition: ") + paramName, "NaN detected during transition");
            }

            // Reset parameter
            synth_->setParameter(paramName, 0.5f);
        }
    }

    // Test 4: Parameter ramping (rapid changes)
    void testParameterRamping(TestResults& results)
    {
        std::cout << "\n--- Test 4: Parameter Ramping ---" << std::endl;

        // Test rapid parameter changes while processing
        for (int i = 0; i < 100; ++i)
        {
            synth_->setParameter("filterCutoff", (i % 100) / 100.0f);
            synth_->setParameter("filterResonance", ((i * 7) % 100) / 100.0f);

            auto output = processNote(60 + (i % 12), 0.7f, 10);

            if (AudioUtils::hasNaN(output.data(), output.size()))
            {
                results.fail("Parameter ramping", "NaN detected at iteration " + std::to_string(i));
                return;
            }
        }

        results.pass("Parameter ramping (100 rapid changes)");
    }

    // Test 5: Extreme parameter combinations
    void testExtremeParameterCombinations(TestResults& results)
    {
        std::cout << "\n--- Test 5: Extreme Parameter Combinations ---" << std::endl;

        struct ExtremeCombo
        {
            const char* param;
            float value1;
            float value2;
        };

        ExtremeCombo combos[] = {
            {"filterCutoff", 0.0f, 1.0f},
            {"filterResonance", 1.0f, 1.0f},
            {"lfo1Rate", 1.0f, 1.0f},
            {"lfo1Depth", 1.0f, 1.0f},
            {"osc1Level", 1.0f, 1.0f},
            {"osc2Level", 1.0f, 1.0f}
        };

        for (const auto& combo : combos)
        {
            synth_->setParameter(combo.param, combo.value1);
            synth_->setParameter(combo.param, combo.value2);

            auto output = processNote();

            if (AudioUtils::hasNaN(output.data(), output.size()))
            {
                results.fail(std::string("Extreme combo: ") + combo.param, "NaN detected");
            }
            else
            {
                results.pass(std::string("Extreme combo: ") + combo.param);
            }

            // Reset
            synth_->setParameter(combo.param, 0.5f);
        }
    }

    // Test 6: Random parameter combinations
    void testRandomParameterCombinations(TestResults& results)
    {
        std::cout << "\n--- Test 6: Random Parameter Combinations ---" << std::endl;

        const char* params[] = {
            "osc1Shape", "osc1Level", "osc2Level", "filterCutoff", "filterResonance",
            "lfo1Rate", "lfo1Depth", "lfo2Rate", "lfo2Depth"
        };

        // Test 100 random combinations
        for (int i = 0; i < 100; ++i)
        {
            for (const char* param : params)
            {
                float randomValue = static_cast<float>(rand()) / RAND_MAX;
                synth_->setParameter(param, randomValue);
            }

            auto output = processNote(60 + (i % 24), 0.7f);

            if (AudioUtils::hasNaN(output.data(), output.size()))
            {
                results.fail("Random parameter combinations", "NaN detected at iteration " + std::to_string(i));
                return;
            }
        }

        results.pass("Random parameter combinations (100 iterations)");
    }
};

//==============================================================================
// Main Entry Point
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "========================================" << std::endl;
    std::cout << "Parameter Stability Tests" << std::endl;
    std::cout << "Kane Marco Hybrid VA Synthesizer" << std::endl;
    std::cout << "========================================" << std::endl;

    TestResults results;
    ParameterStabilityTestSuite suite;

    if (!suite.initialize())
    {
        std::cerr << "Failed to initialize test suite" << std::endl;
        return 1;
    }

    suite.runAllTests(results);
    results.printSummary();

    return results.allPassed() ? 0 : 1;
}
