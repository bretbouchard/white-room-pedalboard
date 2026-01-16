/*
  ==============================================================================

    StateSaveRestoreTest.cpp
    Created: January 13, 2026
    Author: Bret Bouchard

    State Save/Restore Tests for Plugin Validation
    Tests preset save/load functionality and state consistency

  ==============================================================================
*/

#include "../../../instruments/kane_marco/include/dsp/KaneMarcoPureDSP.h"
#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
#include <iomanip>
#include <sstream>
#include <cstring>

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

    bool buffersEqual(const float* buffer1, const float* buffer2, int numSamples, float epsilon = 0.0001f)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            if (std::abs(buffer1[i] - buffer2[i]) > epsilon)
                return false;
        }
        return true;
    }

    float getDifference(const float* buffer1, const float* buffer2, int numSamples)
    {
        float diff = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            diff += std::abs(buffer1[i] - buffer2[i]);
        }
        return diff / numSamples;
    }
}

//==============================================================================
// State Save/Restore Test Suite
//==============================================================================

class StateSaveRestoreTestSuite
{
public:
    static constexpr int sampleRate = 48000;
    static constexpr int bufferSize = 512;

    StateSaveRestoreTestSuite() : synth_(nullptr)
    {
    }

    ~StateSaveRestoreTestSuite()
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
        std::cout << "\n=== STATE SAVE/RESTORE TESTS ===" << std::endl;

        testBasicStateSaveRestore(results);
        testMultiplePresetSaveRestore(results);
        testStateConsistencyAfterRestore(results);
        testParameterRoundTrip(results);
        testEdgeCaseStates(results);
        testStateCorruptionDetection(results);
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

        // Reset synth for next test
        synth_->reset();

        return output;
    }

    // Set all parameters to known values
    void setTestParameters()
    {
        synth_->setParameter("osc1Shape", 2.0f);      // Triangle
        synth_->setParameter("osc1Level", 0.7f);
        synth_->setParameter("osc1Warp", 0.3f);
        synth_->setParameter("osc2Shape", 1.0f);      // Square
        synth_->setParameter("osc2Level", 0.5f);
        synth_->setParameter("osc2Detune", 0.1f);
        synth_->setParameter("subEnabled", 1.0f);
        synth_->setParameter("subLevel", 0.3f);
        synth_->setParameter("filterCutoff", 0.7f);
        synth_->setParameter("filterResonance", 0.6f);
        synth_->setParameter("filterEnvAttack", 0.05f);
        synth_->setParameter("filterEnvDecay", 0.2f);
        synth_->setParameter("filterEnvSustain", 0.5f);
        synth_->setParameter("ampEnvAttack", 0.01f);
        synth_->setParameter("ampEnvDecay", 0.1f);
        synth_->setParameter("ampEnvSustain", 0.7f);
        synth_->setParameter("lfo1Rate", 5.0f);
        synth_->setParameter("lfo1Depth", 0.5f);
        synth_->setParameter("fmEnabled", 1.0f);
        synth_->setParameter("fmDepth", 0.5f);
    }

    // Test 1: Basic state save/restore
    void testBasicStateSaveRestore(TestResults& results)
    {
        std::cout << "\n--- Test 1: Basic State Save/Restore ---" << std::endl;

        // Set parameters
        setTestParameters();

        // Save state
        char jsonBuffer[8192];
        bool saveSuccess = synth_->savePreset(jsonBuffer, sizeof(jsonBuffer));

        if (!saveSuccess)
        {
            results.fail("Basic state save", "savePreset returned false");
            return;
        }

        std::string savedState(jsonBuffer);
        results.pass("Basic state save");

        // Create new synth instance
        KaneMarcoPureDSP* newSynth = new KaneMarcoPureDSP();
        newSynth->prepare(static_cast<double>(sampleRate), bufferSize);

        // Restore state
        bool loadSuccess = newSynth->loadPreset(jsonBuffer);

        if (!loadSuccess)
        {
            results.fail("Basic state restore", "loadPreset returned false");
            delete newSynth;
            return;
        }

        results.pass("Basic state restore");

        // Verify parameters match
        bool paramsMatch = true;
        const char* testParams[] = {
            "osc1Shape", "osc1Level", "osc1Warp",
            "osc2Shape", "osc2Level", "osc2Detune",
            "subEnabled", "subLevel",
            "filterCutoff", "filterResonance",
            "lfo1Rate", "lfo1Depth",
            "fmEnabled", "fmDepth"
        };

        for (const char* param : testParams)
        {
            float originalValue = synth_->getParameter(param);
            float restoredValue = newSynth->getParameter(param);

            if (std::abs(originalValue - restoredValue) > 0.001f)
            {
                paramsMatch = false;
                std::cout << "    Parameter mismatch: " << param
                          << " (original=" << originalValue
                          << ", restored=" << restoredValue << ")" << std::endl;
            }
        }

        if (paramsMatch)
        {
            results.pass("Parameters match after save/restore");
        }
        else
        {
            results.fail("Parameters match after save/restore", "Some parameters don't match");
        }

        delete newSynth;
    }

    // Test 2: Multiple preset save/restore
    void testMultiplePresetSaveRestore(TestResults& results)
    {
        std::cout << "\n--- Test 2: Multiple Preset Save/Restore ---" << std::endl;

        const int numPresets = 10;
        std::vector<std::string> presets;

        // Create and save multiple presets
        for (int i = 0; i < numPresets; ++i)
        {
            // Set different parameters for each preset
            synth_->setParameter("osc1Shape", static_cast<float>(i % 5));
            synth_->setParameter("osc1Level", (i % 10) / 10.0f);
            synth_->setParameter("filterCutoff", ((i * 7) % 10) / 10.0f);
            synth_->setParameter("filterResonance", (i % 8) / 8.0f);

            char buffer[8192];
            if (synth_->savePreset(buffer, sizeof(buffer)))
            {
                presets.push_back(std::string(buffer));
            }
            else
            {
                results.fail("Multiple presets save", "Failed to save preset " + std::to_string(i));
                return;
            }
        }

        results.pass("Multiple presets save (" + std::to_string(numPresets) + " presets)");

        // Load and verify each preset
        int verifiedCount = 0;
        for (int i = 0; i < numPresets; ++i)
        {
            KaneMarcoPureDSP* testSynth = new KaneMarcoPureDSP();
            testSynth->prepare(static_cast<double>(sampleRate), bufferSize);

            if (testSynth->loadPreset(presets[i].c_str()))
            {
                float expectedShape = static_cast<float>(i % 5);
                float actualShape = testSynth->getParameter("osc1Shape");

                if (std::abs(expectedShape - actualShape) < 0.001f)
                {
                    verifiedCount++;
                }
            }

            delete testSynth;
        }

        if (verifiedCount == numPresets)
        {
            results.pass("Multiple presets restore (" + std::to_string(numPresets) + " presets verified)");
        }
        else
        {
            results.fail("Multiple presets restore", "Only " + std::to_string(verifiedCount) + "/" + std::to_string(numPresets) + " presets verified");
        }
    }

    // Test 3: State consistency after restore
    void testStateConsistencyAfterRestore(TestResults& results)
    {
        std::cout << "\n--- Test 3: State Consistency After Restore ---" << std::endl;

        // Set parameters
        setTestParameters();

        // Process audio before save
        auto outputBefore = processNote(60, 0.8f, 100);

        // Save state
        char jsonBuffer[8192];
        if (!synth_->savePreset(jsonBuffer, sizeof(jsonBuffer)))
        {
            results.fail("State consistency", "Failed to save state");
            return;
        }

        // Restore state
        if (!synth_->loadPreset(jsonBuffer))
        {
            results.fail("State consistency", "Failed to restore state");
            return;
        }

        // Process audio after restore
        auto outputAfter = processNote(60, 0.8f, 100);

        // Compare outputs
        float difference = AudioUtils::getDifference(outputBefore.data(), outputAfter.data(), outputBefore.size());

        if (difference < 0.001f)
        {
            results.pass("State consistency after restore (difference: " + std::to_string(difference) + ")");
        }
        else
        {
            results.fail("State consistency after restore", "Output difference: " + std::to_string(difference));
        }
    }

    // Test 4: Parameter round-trip
    void testParameterRoundTrip(TestResults& results)
    {
        std::cout << "\n--- Test 4: Parameter Round-Trip ---" << std::endl;

        // Test each parameter individually
        const char* params[] = {
            "osc1Shape", "osc1Level", "osc1Warp", "osc1PulseWidth",
            "osc2Shape", "osc2Level", "osc2Warp", "osc2Detune",
            "subEnabled", "subLevel",
            "filterCutoff", "filterResonance",
            "lfo1Rate", "lfo1Depth", "lfo2Rate", "lfo2Depth",
            "fmEnabled", "fmDepth"
        };

        int passedCount = 0;

        for (const char* param : params)
        {
            // Test multiple values
            for (float value : {0.0f, 0.25f, 0.5f, 0.75f, 1.0f})
            {
                synth_->setParameter(param, value);

                char buffer[8192];
                if (!synth_->savePreset(buffer, sizeof(buffer)))
                {
                    continue; // Skip this value
                }

                KaneMarcoPureDSP* testSynth = new KaneMarcoPureDSP();
                testSynth->prepare(static_cast<double>(sampleRate), bufferSize);

                if (testSynth->loadPreset(buffer))
                {
                    float originalValue = synth_->getParameter(param);
                    float restoredValue = testSynth->getParameter(param);

                    if (std::abs(originalValue - restoredValue) < 0.001f)
                    {
                        passedCount++;
                    }
                }

                delete testSynth;
            }
        }

        int totalTests = sizeof(params) / sizeof(params[0]) * 5; // 5 values per param
        if (passedCount == totalTests)
        {
            results.pass("Parameter round-trip (" + std::to_string(passedCount) + "/" + std::to_string(totalTests) + " tests)");
        }
        else
        {
            results.fail("Parameter round-trip", "Only " + std::to_string(passedCount) + "/" + std::to_string(totalTests) + " tests passed");
        }
    }

    // Test 5: Edge case states
    void testEdgeCaseStates(TestResults& results)
    {
        std::cout << "\n--- Test 5: Edge Case States ---" << std::endl;

        struct EdgeCase
        {
            const char* param;
            float value;
            const char* description;
        };

        EdgeCase edgeCases[] = {
            {"osc1Level", 0.0f, "OSC1 level at minimum"},
            {"osc1Level", 1.0f, "OSC1 level at maximum"},
            {"filterCutoff", 0.0f, "Filter cutoff at minimum"},
            {"filterCutoff", 1.0f, "Filter cutoff at maximum"},
            {"filterResonance", 1.0f, "Filter resonance at maximum"},
            {"lfo1Rate", 20.0f, "LFO rate at very high"},
            {"fmDepth", 1.0f, "FM depth at maximum"}
        };

        for (const auto& edgeCase : edgeCases)
        {
            synth_->setParameter(edgeCase.param, edgeCase.value);

            char buffer[8192];
            if (!synth_->savePreset(buffer, sizeof(buffer)))
            {
                results.fail(std::string("Edge case: ") + edgeCase.description, "Failed to save");
                continue;
            }

            KaneMarcoPureDSP* testSynth = new KaneMarcoPureDSP();
            testSynth->prepare(static_cast<double>(sampleRate), bufferSize);

            if (testSynth->loadPreset(buffer))
            {
                float restoredValue = testSynth->getParameter(edgeCase.param);
                if (std::abs(edgeCase.value - restoredValue) < 0.001f)
                {
                    results.pass(std::string("Edge case: ") + edgeCase.description);
                }
                else
                {
                    results.fail(std::string("Edge case: ") + edgeCase.description,
                                  "Value mismatch: " + std::to_string(edgeCase.value) + " vs " + std::to_string(restoredValue));
                }
            }
            else
            {
                results.fail(std::string("Edge case: ") + edgeCase.description, "Failed to restore");
            }

            delete testSynth;
        }
    }

    // Test 6: State corruption detection
    void testStateCorruptionDetection(TestResults& results)
    {
        std::cout << "\n--- Test 6: State Corruption Detection ---" << std::endl;

        // Save valid state
        setTestParameters();

        char validBuffer[8192];
        if (!synth_->savePreset(validBuffer, sizeof(validBuffer)))
        {
            results.fail("State corruption detection", "Failed to save valid state");
            return;
        }

        // Test 1: Corrupted JSON (invalid syntax)
        const char* corruptedJson = "{\"osc1_shape\": invalid}";

        KaneMarcoPureDSP* testSynth = new KaneMarcoPureDSP();
        testSynth->prepare(static_cast<double>(sampleRate), bufferSize);

        if (testSynth->loadPreset(corruptedJson))
        {
            results.fail("Corrupted JSON detection", "Accepted invalid JSON");
        }
        else
        {
            results.pass("Corrupted JSON detection (rejected invalid JSON)");
        }

        delete testSynth;

        // Test 2: Truncated JSON
        std::string truncatedJson = std::string(validBuffer).substr(0, 100);

        testSynth = new KaneMarcoPureDSP();
        testSynth->prepare(static_cast<double>(sampleRate), bufferSize);

        bool handledGracefully = !testSynth->loadPreset(truncatedJson.c_str());

        if (handledGracefully)
        {
            results.pass("Truncated JSON detection (rejected truncated data)");
        }
        else
        {
            // If it succeeded, check if the synth is still in a valid state
            float output = testSynth->getParameter("osc1Level");
            if (output >= 0.0f && output <= 1.0f)
            {
                results.pass("Truncated JSON handling (remains in valid state)");
            }
            else
            {
                results.fail("Truncated JSON handling", "Synth in invalid state after truncated load");
            }
        }

        delete testSynth;
    }
};

//==============================================================================
// Main Entry Point
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "========================================" << std::endl;
    std::cout << "State Save/Restore Tests" << std::endl;
    std::cout << "Kane Marco Hybrid VA Synthesizer" << std::endl;
    std::cout << "========================================" << std::endl;

    TestResults results;
    StateSaveRestoreTestSuite suite;

    if (!suite.initialize())
    {
        std::cerr << "Failed to initialize test suite" << std::endl;
        return 1;
    }

    suite.runAllTests(results);
    results.printSummary();

    return results.allPassed() ? 0 : 1;
}
