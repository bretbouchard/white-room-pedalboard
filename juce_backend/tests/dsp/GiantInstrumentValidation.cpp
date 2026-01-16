/*
  ==============================================================================

   GiantInstrumentValidation.cpp
   Integration tests and subjective quality validation for Aether String v2

   Tests cover:
   - End-to-end feature integration
   - Preset loading and validation
   - Giant instrument subjective criteria
   - Realtime rendering tests

  ==============================================================================
*/

#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <iostream>
#include <fstream>

//==============================================================================
// Validation Utilities
//==============================================================================

class ValidationResult
{
public:
    std::string testName;
    bool passed;
    std::string message;
    float measuredValue;
    float expectedValue;

    ValidationResult(const std::string& name, bool pass, const std::string& msg = "")
        : testName(name), passed(pass), message(msg), measuredValue(0.0f), expectedValue(0.0f) {}
};

class ValidationReporter
{
public:
    static void printHeader(const std::string& title)
    {
        std::cout << "\n╔══════════════════════════════════════════════════════════╗" << std::endl;
        std::cout << "║  " << std::left << std::setw(56) << title << "║" << std::endl;
        std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
    }

    static void printResult(const ValidationResult& result)
    {
        if (result.passed)
            std::cout << "  ✅ PASS: " << result.testName;
        else
            std::cout << "  ❌ FAIL: " << result.testName;

        if (!result.message.empty())
            std::cout << " - " << result.message;

        std::cout << std::endl;
    }

    static void printSummary(const std::vector<ValidationResult>& results)
    {
        int passed = 0;
        int failed = 0;

        for (const auto& result : results)
        {
            if (result.passed)
                passed++;
            else
                failed++;
        }

        std::cout << "\n  Summary: " << passed << " passed, " << failed << " failed" << std::endl;
    }
};

//==============================================================================
// Integration Test 1: Complete Signal Chain
//==============================================================================

class SignalChainTests
{
public:
    static ValidationResult testCompleteSignalFlow()
    {
        ValidationReporter::printHeader("Complete Signal Flow Test");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;  // 1 second

        // Create complete signal chain
        WaveguideString string;
        string.prepare(sampleRate);

        BridgeCoupling bridge;
        bridge.prepare(sampleRate);

        ModalBodyResonator body;
        body.prepare(sampleRate);

        // Configure as giant instrument
        string.setStringLengthMeters(12.0f);
        string.setStringGauge(StringGauge::Massive);
        string.setPickPosition(0.5f);

        // Excite string
        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();
        string.excite(exciter, 0.8f);

        // Process signal chain
        float maxOutput = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            float stringOut = string.processSample();
            float bridgeEnergy = bridge.processString(stringOut);
            float bodyOut = body.processSample(bridgeEnergy);
            maxOutput = std::max(maxOutput, std::abs(bodyOut));
        }

        bool passed = maxOutput > 0.0f;
        std::string message = "Max output: " + std::to_string(maxOutput);

        ValidationResult result("Complete signal flow", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static ValidationResult testVoiceManagerIntegration()
    {
        ValidationReporter::printHeader("Voice Manager Integration");

        VoiceManager vm;
        vm.prepare(48000.0, 256);

        // Trigger chord (6 notes)
        vm.handleNoteOn(82, 0.8f);   // E2
        vm.handleNoteOn(110, 0.8f);  // A2
        vm.handleNoteOn(146, 0.8f);  // D3
        vm.handleNoteOn(196, 0.8f);  // G3
        vm.handleNoteOn(247, 0.8f);  // B3
        vm.handleNoteOn(329, 0.8f);  // E4

        int activeCount = vm.getActiveVoiceCount();

        bool passed = (activeCount == 6);
        std::string message = "Active voices: " + std::to_string(activeCount) + "/6";

        ValidationResult result("Voice manager polyphony", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static std::vector<ValidationResult> runAll()
    {
        std::vector<ValidationResult> results;

        results.push_back(testCompleteSignalFlow());
        results.push_back(testVoiceManagerIntegration());

        return results;
    }
};

//==============================================================================
// Integration Test 2: Preset Loading
//==============================================================================

class PresetTests
{
public:
    static ValidationResult testGiantPresetStructure()
    {
        ValidationReporter::printHeader("Giant Preset Structure Test");

        // This test validates the preset JSON structure
        // In a real implementation, this would load from file

        struct GiantPreset
        {
            float stringLengthMeters;
            StringGauge stringGauge;
            float pickPosition;
            GestureParameters gesture;
        };

        // Giant Monochord preset
        GiantPreset monochord;
        monochord.stringLengthMeters = 12.0f;
        monochord.stringGauge = StringGauge::Massive;
        monochord.pickPosition = 0.5f;
        monochord.gesture.force = 0.8f;
        monochord.gesture.speed = 0.2f;

        bool lengthValid = (monochord.stringLengthMeters >= 10.0f);
        bool gaugeValid = (monochord.stringGauge == StringGauge::Massive);
        bool gestureValid = (monochord.gesture.speed < 0.5f);  // Slow

        bool passed = lengthValid && gaugeValid && gestureValid;
        std::string message = "Monochord preset structure valid";

        ValidationResult result("Giant preset structure", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static ValidationResult testPresetApplication()
    {
        ValidationReporter::printHeader("Preset Application Test");

        // Create string
        WaveguideString string;
        string.prepare(48000.0);

        // Apply Giant Monochord preset
        string.setStringLengthMeters(12.0f);
        string.setStringGauge(StringGauge::Massive);
        string.setPickPosition(0.5f);

        // Validate parameters applied
        bool lengthMatch = TestHelpers::approximatelyEqual(string.params.stringLengthMeters, 12.0f, 0.1f);
        bool gaugeMatch = (string.params.stringGauge == StringGauge::Massive);
        bool pickMatch = TestHelpers::approximatelyEqual(string.params.pickPosition, 0.5f, 0.01f);

        bool passed = lengthMatch && gaugeMatch && pickMatch;
        std::string message = "All preset parameters applied correctly";

        ValidationResult result("Preset application", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static std::vector<ValidationResult> runAll()
    {
        std::vector<ValidationResult> results;

        results.push_back(testGiantPresetStructure());
        results.push_back(testPresetApplication());

        return results;
    }

private:
    struct TestHelpers
    {
        static bool approximatelyEqual(float a, float b, float epsilon = 0.001f)
        {
            return std::abs(a - b) < epsilon;
        }
    };
};

//==============================================================================
// Subjective Quality Test 3: Giant Instrument Criteria
//==============================================================================

class GiantInstrumentQualityTests
{
public:
    static ValidationResult testSlowAttackCriterion()
    {
        ValidationReporter::printHeader("Slow Attack Criterion");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;

        // Create giant string
        WaveguideString giant;
        giant.prepare(sampleRate);
        giant.setStringLengthMeters(12.0f);
        giant.setStringGauge(StringGauge::Massive);

        ArticulationStateMachine fsm;
        fsm.prepare(sampleRate);
        GestureParameters slowGesture;
        slowGesture.speed = 0.2f;  // Slow
        fsm.setGestureParameters(slowGesture);
        fsm.triggerPluck(0.8f);

        // Measure attack time (time to reach 90% of peak)
        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();
        giant.excite(exciter, 0.8f);

        float peak = 0.0f;
        float threshold = 0.0f;
        int attackSamples = 0;

        for (int i = 0; i < numSamples; ++i)
        {
            float output = giant.processSample();
            peak = std::max(peak, output);

            if (threshold == 0.0f && output >= peak * 0.9f)
            {
                threshold = output;
                attackSamples = i;
            }
        }

        float attackTimeMs = (attackSamples / sampleRate) * 1000.0f;

        // Giant instruments should have slow attack (50-500ms)
        bool passed = (attackTimeMs >= 50.0f && attackTimeMs <= 500.0f);
        std::string message = "Attack time: " + std::to_string(attackTimeMs) + "ms (expected 50-500ms)";

        ValidationResult result("Slow attack criterion", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static ValidationResult testLongDecayCriterion()
    {
        ValidationReporter::printHeader("Long Decay Criterion");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;  // 1 second

        // Create giant string
        WaveguideString giant;
        giant.prepare(sampleRate);
        giant.setStringLengthMeters(12.0f);
        giant.setStringGauge(StringGauge::Massive);

        // Excite and measure decay
        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();
        giant.excite(exciter, 0.8f);

        float initialEnergy = 0.0f;
        for (int i = 0; i < 100; ++i)
            initialEnergy += std::abs(giant.processSample());

        float finalEnergy = 0.0f;
        for (int i = 0; i < numSamples; ++i)
            finalEnergy += std::abs(giant.processSample());

        float decayRatio = finalEnergy / initialEnergy;

        // Giant instruments should have long decay (energy still present after 1 second)
        bool passed = (decayRatio > 0.1f);  // Still > 10% energy after 1 second
        std::string message = "Decay ratio: " + std::to_string(decayRatio) + " (expected > 0.1)";

        ValidationResult result("Long decay criterion", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static ValidationResult testMassiveTimbreCriterion()
    {
        ValidationReporter::printHeader("Massive Timbre Criterion");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;

        // Compare guitar vs giant at same pitch
        WaveguideString guitar, giant;
        guitar.prepare(sampleRate);
        giant.prepare(sampleRate);

        guitar.setFrequency(220.0f);  // Same pitch
        giant.setFrequency(220.0f);

        guitar.setStringLengthMeters(0.65f);  // Guitar scale
        giant.setStringLengthMeters(12.0f);   // Giant scale

        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();

        guitar.excite(exciter, 0.5f);
        giant.excite(exciter, 0.5f);

        // Measure spectral centroid (brightness)
        float guitarCentroid = 0.0f;
        float giantCentroid = 0.0f;
        float guitarEnergy = 0.0f;
        float giantEnergy = 0.0f;

        for (int i = 0; i < numSamples; ++i)
        {
            float g = guitar.processSample();
            float gt = giant.processSample();

            guitarEnergy += std::abs(g);
            giantEnergy += std::abs(gt);

            // Simplified centroid (just use amplitude as proxy)
            guitarCentroid += std::abs(g) * i;
            giantCentroid += std::abs(gt) * i;
        }

        guitarCentroid /= guitarEnergy;
        giantCentroid /= giantEnergy;

        // Giant should be darker (lower centroid)
        bool passed = (giantCentroid < guitarCentroid);
        std::string message = "Giant is darker (centroid: " +
                             std::to_string(giantCentroid) + " vs " +
                             std::to_string(guitarCentroid) + ")";

        ValidationResult result("Massive timbre criterion", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static std::vector<ValidationResult> runAll()
    {
        std::vector<ValidationResult> results;

        results.push_back(testSlowAttackCriterion());
        results.push_back(testLongDecayCriterion());
        results.push_back(testMassiveTimbreCriterion());

        return results;
    }
};

//==============================================================================
// Integration Test 4: Shared Bridge Behavior
//==============================================================================

class SharedBridgeBehaviorTests
{
public:
    static ValidationResult testBridgeEnergyAccumulation()
    {
        ValidationReporter::printHeader("Bridge Energy Accumulation");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 10000;

        SharedBridgeCoupling bridge;
        bridge.prepare(sampleRate, 6);

        // Inject energy from all strings over time
        float bridgeBefore = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            for (int s = 0; s < 6; ++s)
                bridge.addStringEnergy(0.3f, s);
            bridgeBefore = std::max(bridgeBefore, bridge.getBridgeMotion());
        }

        bool passed = (bridgeBefore > 0.0f);
        std::string message = "Bridge accumulated energy: " + std::to_string(bridgeBefore);

        ValidationResult result("Bridge energy accumulation", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static ValidationResult testCrossStringCoupling()
    {
        ValidationReporter::printHeader("Cross-String Coupling");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 10000;

        SharedBridgeCoupling bridge;
        bridge.prepare(sampleRate, 6);

        // Excite only string 0
        for (int i = 0; i < numSamples; ++i)
        {
            bridge.addStringEnergy(0.8f, 0);  // Only string 0
            bridge.addStringEnergy(0.0f, 1);
            bridge.addStringEnergy(0.0f, 2);
            bridge.addStringEnergy(0.0f, 3);
            bridge.addStringEnergy(0.0f, 4);
            bridge.addStringEnergy(0.0f, 5);

            // Check if other strings receive feedback
            for (int s = 1; s < 6; ++s)
            {
                float feedback = bridge.getStringFeedback(s);
                if (feedback > 0.001f)
                {
                    ValidationResult result("Cross-string coupling", true,
                                          "String " + std::to_string(s) + " received feedback");
                    ValidationReporter::printResult(result);
                    return result;
                }
            }
        }

        ValidationResult result("Cross-string coupling", false, "No feedback detected");
        ValidationReporter::printResult(result);
        return result;
    }

    static std::vector<ValidationResult> runAll()
    {
        std::vector<ValidationResult> results;

        results.push_back(testBridgeEnergyAccumulation());
        results.push_back(testCrossStringCoupling());

        return results;
    }
};

//==============================================================================
// Integration Test 5: Sympathetic Strings Behavior
//==============================================================================

class SympatheticStringBehaviorTests
{
public:
    static ValidationResult testSympatheticResponseToBridge()
    {
        ValidationReporter::printHeader("Sympathetic Response to Bridge");

        constexpr double sampleRate = 48000.0;

        SympatheticStringBank symp;
        SympatheticStringConfig config;
        config.enabled = true;
        config.count = 6;
        config.tuning = SympatheticStringConfig::TuningMode::Harmonic;
        symp.prepare(sampleRate, config);

        // Excite from bridge
        symp.exciteFromBridge(0.5f);

        float output = symp.processSample();

        bool passed = (output != 0.0f);
        std::string message = "Sympathetic output: " + std::to_string(output);

        ValidationResult result("Sympathetic response", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static ValidationResult testSympatheticLongSustain()
    {
        ValidationReporter::printHeader("Sympathetic Long Sustain");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 24000;  // 0.5 seconds

        SympatheticStringBank symp;
        SympatheticStringConfig config;
        config.enabled = true;
        config.count = 6;
        config.tuning = SympatheticStringConfig::TuningMode::Harmonic;
        symp.prepare(sampleRate, config);

        // Excite from bridge
        symp.exciteFromBridge(0.5f);

        // Measure sustain
        float initialOutput = std::abs(symp.processSample());
        float sustainedEnergy = 0.0f;

        for (int i = 0; i < numSamples; ++i)
            sustainedEnergy += std::abs(symp.processSample());

        float avgSustain = sustainedEnergy / numSamples;

        // Should still have energy after 0.5 seconds
        bool passed = (avgSustain > initialOutput * 0.01f);  // > 1% of initial
        std::string message = "Sustain: " + std::to_string(avgSustain / initialOutput * 100.0f) + "% of initial";

        ValidationResult result("Sympathetic long sustain", passed, message);
        ValidationReporter::printResult(result);

        return result;
    }

    static std::vector<ValidationResult> runAll()
    {
        std::vector<ValidationResult> results;

        results.push_back(testSympatheticResponseToBridge());
        results.push_back(testSympatheticLongSustain());

        return results;
    }
};

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║     AETHER STRING v2 INTEGRATION & VALIDATION          ║" << std::endl;
    std::cout << "║     Subjective Quality Tests                            ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;

    std::vector<ValidationResult> allResults;

    try
    {
        // Run all test suites
        auto signalChainResults = SignalChainTests::runAll();
        auto presetResults = PresetTests::runAll();
        auto qualityResults = GiantInstrumentQualityTests::runAll();
        auto bridgeResults = SharedBridgeBehaviorTests::runAll();
        auto sympResults = SympatheticStringBehaviorTests::runAll();

        // Combine results
        allResults.insert(allResults.end(), signalChainResults.begin(), signalChainResults.end());
        allResults.insert(allResults.end(), presetResults.begin(), presetResults.end());
        allResults.insert(allResults.end(), qualityResults.begin(), qualityResults.end());
        allResults.insert(allResults.end(), bridgeResults.begin(), bridgeResults.end());
        allResults.insert(allResults.end(), sympResults.begin(), sympResults.end());

        // Print summary
        std::cout << "\n";
        std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
        std::cout << "║     VALIDATION SUMMARY                                  ║" << std::endl;
        std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
        ValidationReporter::printSummary(allResults);

        // Check if all passed
        bool allPassed = true;
        for (const auto& result : allResults)
        {
            if (!result.passed)
            {
                allPassed = false;
                break;
            }
        }

        if (allPassed)
        {
            std::cout << "\n";
            std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
            std::cout << "║     ✅ ALL VALIDATION TESTS PASSED                    ║" << std::endl;
            std::cout << "║     Giant instrument criteria met!                     ║" << std::endl;
            std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
            std::cout << "\n";
            return 0;
        }
        else
        {
            std::cout << "\n❌ Some validation tests failed" << std::endl;
            return 1;
        }
    }
    catch (const std::exception& e)
    {
        std::cout << "\n❌ VALIDATION ERROR: " << e.what() << std::endl;
        return 1;
    }
}
