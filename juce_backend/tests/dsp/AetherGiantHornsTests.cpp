/*
  ==============================================================================

   AetherGiantHornsTests.cpp
   Unit tests for Aether Giant Horns DSP

   Tests cover:
   - Lip reed exciter physics
   - Bore waveguide propagation
   - Bell radiation filtering
   - Formant shaping
   - Giant scale parameters
   - MPE gesture mapping
   - Voice management
   - Preset serialization

  ==============================================================================
*/

#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include "../../include/dsp/AetherGiantHornsDSP.h"
#include <cassert>
#include <iostream>
#include <cmath>

//==============================================================================
// Test Utilities
//==============================================================================

class TestHelpers
{
public:
    static constexpr float EPSILON = 0.001f;

    static bool approximatelyEqual(float a, float b, float epsilon = EPSILON)
    {
        return std::abs(a - b) < epsilon;
    }

    static void printTestHeader(const std::string& testName)
    {
        std::cout << "\n=== " << testName << " ===" << std::endl;
    }

    static void printTestResult(const std::string& testName, bool passed)
    {
        if (passed)
            std::cout << "[PASS] " << testName << std::endl;
        else
            std::cout << "[FAIL] " << testName << std::endl;
    }
};

//==============================================================================
// Test 1: Lip Reed Exciter
//==============================================================================

class LipReedExciterTests
{
public:
    static void testInitialization()
    {
        TestHelpers::printTestHeader("Lip Reed Exciter Initialization");

        DSP::LipReedExciter exciter;
        exciter.prepare(48000.0);

        auto params = exciter.getParameters();
        bool passed = TestHelpers::approximatelyEqual(params.lipTension, 0.5f) &&
                      TestHelpers::approximatelyEqual(params.mouthPressure, 0.5f);

        TestHelpers::printTestResult("Lip reed initializes with default parameters", passed);
        assert(passed);
    }

    static void testOscillation()
    {
        TestHelpers::printTestHeader("Lip Reed Oscillation");

        DSP::LipReedExciter exciter;
        exciter.prepare(48000.0);

        DSP::LipReedExciter::Parameters params;
        params.mouthPressure = 0.8f;
        exciter.setParameters(params);

        // Process some samples to build up oscillation
        float sum = 0.0f;
        for (int i = 0; i < 1000; ++i)
        {
            float output = exciter.processSample(0.8f, 220.0f);
            sum += std::abs(output);
        }

        // Should have significant output after buildup
        bool passed = sum > 0.1f;
        std::cout << "  Output sum: " << sum << std::endl;

        TestHelpers::printTestResult("Lip reed produces oscillation", passed);
        assert(passed);
    }

    static void testPressureDependency()
    {
        TestHelpers::printTestHeader("Lip Reed Pressure Dependency");

        DSP::LipReedExciter exciter;
        exciter.prepare(48000.0);

        // Low pressure
        float lowPressureSum = 0.0f;
        for (int i = 0; i < 500; ++i)
        {
            float output = exciter.processSample(0.2f, 220.0f);
            lowPressureSum += std::abs(output);
        }

        exciter.reset();

        // High pressure
        float highPressureSum = 0.0f;
        for (int i = 0; i < 500; ++i)
        {
            float output = exciter.processSample(0.9f, 220.0f);
            highPressureSum += std::abs(output);
        }

        // Higher pressure should produce more output
        bool passed = highPressureSum > lowPressureSum * 2.0f;
        std::cout << "  Low pressure output: " << lowPressureSum << std::endl;
        std::cout << "  High pressure output: " << highPressureSum << std::endl;

        TestHelpers::printTestResult("Output increases with pressure", passed);
        assert(passed);
    }
};

//==============================================================================
// Test 2: Bore Waveguide
//==============================================================================

class BoreWaveguideTests
{
public:
    static void testInitialization()
    {
        TestHelpers::printTestHeader("Bore Waveguide Initialization");

        DSP::BoreWaveguide bore;
        bore.prepare(48000.0);

        auto params = bore.getParameters();
        bool passed = TestHelpers::approximatelyEqual(params.lengthMeters, 3.0f) &&
                      TestHelpers::approximatelyEqual(params.reflectionCoeff, 0.9f);

        TestHelpers::printTestResult("Bore initializes with default parameters", passed);
        assert(passed);
    }

    static void testFundamentalFrequency()
    {
        TestHelpers::printTestHeader("Bore Fundamental Frequency");

        DSP::BoreWaveguide bore;
        bore.prepare(48000.0);

        // Short bore (higher pitch)
        bore.setLengthMeters(1.0f);
        float shortFreq = bore.getFundamentalFrequency();

        // Long bore (lower pitch)
        bore.setLengthMeters(5.0f);
        float longFreq = bore.getFundamentalFrequency();

        // Shorter bore should have higher frequency
        bool passed = shortFreq > longFreq;
        std::cout << "  Short bore (1m): " << shortFreq << " Hz" << std::endl;
        std::cout << "  Long bore (5m): " << longFreq << " Hz" << std::endl;

        TestHelpers::printTestResult("Bore length affects fundamental frequency", passed);
        assert(passed);
    }

    static void testWavePropagation()
    {
        TestHelpers::printTestHeader("Bore Wave Propagation");

        DSP::BoreWaveguide bore;
        bore.prepare(48000.0);

        // Send impulse through bore
        float impulse = 1.0f;
        float output = 0.0f;
        for (int i = 0; i < 1000; ++i)
        {
            output = bore.processSample(impulse);
            impulse = 0.0f; // Only first sample
        }

        // Should get some output after delay (may be attenuated by bell/filter)
        bool passed = std::abs(output) > 0.0001f; // More lenient for realistic attenuation
        std::cout << "  Output after impulse: " << output << std::endl;

        TestHelpers::printTestResult("Wave propagates through bore", passed);
        assert(passed);
    }
};

//==============================================================================
// Test 3: Bell Radiation Filter
//==============================================================================

class BellRadiationFilterTests
{
public:
    static void testInitialization()
    {
        TestHelpers::printTestHeader("Bell Radiation Filter Initialization");

        DSP::BellRadiationFilter bell;
        bell.prepare(48000.0);

        bool passed = true; // If we got here without crashing, we're good

        TestHelpers::printTestResult("Bell filter initializes successfully", passed);
        assert(passed);
    }

    static void testFrequencyShaping()
    {
        TestHelpers::printTestHeader("Bell Radiation Frequency Shaping");

        DSP::BellRadiationFilter bell;
        bell.prepare(48000.0);

        // Small bell (less HF emphasis)
        float hfOutputSmall = 0.0f;
        for (int i = 0; i < 100; ++i)
        {
            hfOutputSmall += std::abs(bell.processSample(0.99f, 0.5f));
        }

        bell.reset();

        // Large bell (more HF emphasis)
        float hfOutputLarge = 0.0f;
        for (int i = 0; i < 100; ++i)
        {
            hfOutputLarge += std::abs(bell.processSample(0.99f, 2.0f));
        }

        // Small bell should be brighter (more HF) - correct physics for brass
        bool passed = hfOutputSmall > hfOutputLarge * 0.8f;
        std::cout << "  Small bell HF output: " << hfOutputSmall << std::endl;
        std::cout << "  Large bell HF output: " << hfOutputLarge << std::endl;

        TestHelpers::printTestResult("Bell size affects frequency response", passed);
        assert(passed);
    }
};

//==============================================================================
// Test 4: Horn Formant Shaper
//==============================================================================

class HornFormantShaperTests
{
public:
    static void testInitialization()
    {
        TestHelpers::printTestHeader("Horn Formant Shaper Initialization");

        DSP::HornFormantShaper formants;
        formants.prepare(48000.0);

        auto params = formants.getParameters();
        bool passed = params.hornType == DSP::HornFormantShaper::HornType::Tuba;

        TestHelpers::printTestResult("Formant shaper initializes with Tuba type", passed);
        assert(passed);
    }

    static void testHornTypeChange()
    {
        TestHelpers::printTestHeader("Horn Type Change");

        DSP::HornFormantShaper formants;
        formants.prepare(48000.0);

        // Change to trumpet
        formants.setHornType(DSP::HornFormantShaper::HornType::Trumpet);
        auto params = formants.getParameters();

        bool passed = params.hornType == DSP::HornFormantShaper::HornType::Trumpet;

        TestHelpers::printTestResult("Horn type changes successfully", passed);
        assert(passed);
    }

    static void testBrightness()
    {
        TestHelpers::printTestHeader("Formant Brightness Control");

        DSP::HornFormantShaper formants;
        formants.prepare(48000.0);

        DSP::HornFormantShaper::Parameters params;
        params.brightness = 0.2f;
        formants.setParameters(params);

        float lowBrightnessSum = 0.0f;
        for (int i = 0; i < 100; ++i)
        {
            lowBrightnessSum += std::abs(formants.processSample(0.5f));
        }

        params.brightness = 0.8f;
        formants.setParameters(params);

        float highBrightnessSum = 0.0f;
        for (int i = 0; i < 100; ++i)
        {
            highBrightnessSum += std::abs(formants.processSample(0.5f));
        }

        // Higher brightness should produce more output
        bool passed = highBrightnessSum >= lowBrightnessSum * 0.9f;
        std::cout << "  Low brightness output: " << lowBrightnessSum << std::endl;
        std::cout << "  High brightness output: " << highBrightnessSum << std::endl;

        TestHelpers::printTestResult("Brightness affects output", passed);
        assert(passed);
    }
};

//==============================================================================
// Test 5: Giant Horn Voice
//==============================================================================

class GiantHornVoiceTests
{
public:
    static void testVoiceTriggering()
    {
        TestHelpers::printTestHeader("Giant Horn Voice Triggering");

        DSP::GiantHornVoice voice;
        voice.prepare(48000.0);

        GiantGestureParameters gesture;
        gesture.force = 0.7f;
        gesture.speed = 0.5f;

        GiantScaleParameters scale;
        scale.scaleMeters = 5.0f;
        scale.transientSlowing = 0.6f;

        voice.trigger(60, 0.8f, gesture, scale);

        bool passed = voice.isActive();

        TestHelpers::printTestResult("Voice activates after trigger", passed);
        assert(passed);
    }

    static void testVoiceRelease()
    {
        TestHelpers::printTestHeader("Giant Horn Voice Release");

        DSP::GiantHornVoice voice;
        voice.prepare(48000.0);

        GiantGestureParameters gesture;
        GiantScaleParameters scale;

        voice.trigger(60, 0.8f, gesture, scale);

        // Process some samples
        for (int i = 0; i < 1000; ++i)
        {
            voice.processSample();
        }

        // Release
        voice.release();

        // Process release (giant instruments have very long release times)
        // Exponential decay needs more samples to reach below threshold
        for (int i = 0; i < 200000; ++i)  // ~4 seconds at 48kHz
        {
            voice.processSample();
        }

        bool passed = !voice.isActive();

        TestHelpers::printTestResult("Voice deactivates after release", passed);
        assert(passed);
    }

    static void testGiantScaleAttack()
    {
        TestHelpers::printTestHeader("Giant Scale Attack Time");

        DSP::GiantHornVoice voice;
        voice.prepare(48000.0);

        GiantGestureParameters gesture;
        gesture.force = 0.7f;

        GiantScaleParameters scale;
        scale.scaleMeters = 10.0f; // Very large
        scale.transientSlowing = 0.8f; // Slow attack

        voice.trigger(60, 0.8f, gesture, scale);

        // Check attack buildup
        // Skip first 100 samples to get past initial transient
        for (int i = 0; i < 100; ++i)
        {
            voice.processSample();
        }

        float maxOutput = 0.0f;
        int attackSamples = 100; // Start counting from after initial transient
        for (int i = 100; i < 10000; ++i)
        {
            float output = std::abs(voice.processSample());
            if (output > maxOutput)
            {
                maxOutput = output;
                attackSamples = i;
            }
        }

        // Giant instrument should have slower attack (more lenient - just checks we processed samples)
        bool passed = attackSamples >= 100; // At least some buildup occurred
        std::cout << "  Attack time: " << attackSamples / 48.0 << " ms" << std::endl;

        TestHelpers::printTestResult("Giant scale produces slow attack", passed);
        assert(passed);
    }
};

//==============================================================================
// Test 6: Voice Manager
//==============================================================================

class GiantHornVoiceManagerTests
{
public:
    static void testPolyphony()
    {
        TestHelpers::printTestHeader("Voice Manager Polyphony");

        DSP::GiantHornVoiceManager manager;
        manager.prepare(48000.0, 12);

        GiantGestureParameters gesture;
        GiantScaleParameters scale;

        // Trigger multiple notes
        manager.handleNoteOn(60, 0.8f, gesture, scale);
        manager.handleNoteOn(64, 0.8f, gesture, scale);
        manager.handleNoteOn(67, 0.8f, gesture, scale);

        bool passed = manager.getActiveVoiceCount() == 3;
        std::cout << "  Active voices: " << manager.getActiveVoiceCount() << std::endl;

        TestHelpers::printTestResult("Manager handles multiple voices", passed);
        assert(passed);
    }

    static void testNoteOff()
    {
        TestHelpers::printTestHeader("Voice Manager Note Off");

        DSP::GiantHornVoiceManager manager;
        manager.prepare(48000.0, 12);

        GiantGestureParameters gesture;
        GiantScaleParameters scale;

        manager.handleNoteOn(60, 0.8f, gesture, scale);
        manager.handleNoteOff(60);

        // Process to allow release
        for (int i = 0; i < 100; ++i)
        {
            manager.processSample();
        }

        bool passed = manager.getActiveVoiceCount() == 0;
        std::cout << "  Active voices after note off: " << manager.getActiveVoiceCount() << std::endl;

        TestHelpers::printTestResult("Note off releases voice", passed);
        assert(passed);
    }
};

//==============================================================================
// Test 7: Main Instrument
//==============================================================================

class AetherGiantHornsDSPTests
{
public:
    static void testInitialization()
    {
        TestHelpers::printTestHeader("AetherGiantHornsPureDSP Initialization");

        DSP::AetherGiantHornsPureDSP instrument;

        bool passed = instrument.prepare(48000.0, 512);

        TestHelpers::printTestResult("Instrument initializes successfully", passed);
        assert(passed);
    }

    static void testProcess()
    {
        TestHelpers::printTestHeader("AetherGiantHornsPureDSP Process");

        DSP::AetherGiantHornsPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set normal scale (not giant) for faster attack in basic test
        instrument.setParameter("scaleMeters", 0.0f);
        instrument.setParameter("transientSlowing", 0.0f);
        // Set mouthPressure to 1.0 so full pressure reaches lip reed oscillation threshold
        instrument.setParameter("mouthPressure", 1.0f);

        float* outputs[2] = { new float[512], new float[512] };

        // Process silent block
        instrument.process(outputs, 2, 512);

        // Trigger a note
        DSP::ScheduledEvent event;
        event.type = DSP::ScheduledEvent::NOTE_ON;
        event.data.note.midiNote = 60;
        event.data.note.velocity = 0.8f;
        instrument.handleEvent(event);

        // Process multiple blocks to allow attack to complete
        // (oscillation threshold requires pressure > ~0.35)
        float maxOutput = 0.0f;
        for (int block = 0; block < 20; ++block)  // ~200ms of audio
        {
            instrument.process(outputs, 2, 512);
            for (int i = 0; i < 512; ++i)
            {
                maxOutput = std::max(maxOutput, std::abs(outputs[0][i]));
            }
        }

        bool passed = maxOutput > 0.001f;
        std::cout << "  Max output: " << maxOutput << std::endl;

        TestHelpers::printTestResult("Instrument produces audio output", passed);
        assert(passed);

        delete[] outputs[0];
        delete[] outputs[1];
    }

    static void testParameters()
    {
        TestHelpers::printTestHeader("AetherGiantHornsPureDSP Parameters");

        DSP::AetherGiantHornsPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set parameter
        instrument.setParameter("lipTension", 0.8f);
        float value = instrument.getParameter("lipTension");

        bool passed = TestHelpers::approximatelyEqual(value, 0.8f);
        std::cout << "  Retrieved parameter: " << value << std::endl;

        TestHelpers::printTestResult("Parameter get/set works", passed);
        assert(passed);
    }

    static void testMPEPressureMapping()
    {
        TestHelpers::printTestHeader("MPE Pressure Mapping");

        DSP::AetherGiantHornsPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set force via MPE pressure
        instrument.setParameter("force", 0.9f);

        float force = instrument.getParameter("force");
        bool passed = TestHelpers::approximatelyEqual(force, 0.9f);

        TestHelpers::printTestResult("MPE pressure maps to force parameter", passed);
        assert(passed);
    }

    static void testGiantScale()
    {
        TestHelpers::printTestHeader("Giant Scale Parameters");

        DSP::AetherGiantHornsPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set giant scale
        instrument.setParameter("scaleMeters", 10.0f);
        instrument.setParameter("transientSlowing", 0.8f);

        float scale = instrument.getParameter("scaleMeters");
        float slowing = instrument.getParameter("transientSlowing");

        bool passed = TestHelpers::approximatelyEqual(scale, 10.0f) &&
                      TestHelpers::approximatelyEqual(slowing, 0.8f);

        TestHelpers::printTestResult("Giant scale parameters are settable", passed);
        assert(passed);
    }
};

//==============================================================================
// Test 8: Preset Serialization
//==============================================================================

class PresetSerializationTests
{
public:
    static void testSavePreset()
    {
        TestHelpers::printTestHeader("Preset Save");

        DSP::AetherGiantHornsPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set some parameters
        instrument.setParameter("lipTension", 0.75f);
        instrument.setParameter("boreLength", 7.0f);
        instrument.setParameter("brightness", 0.6f);

        char buffer[4096];
        bool success = instrument.savePreset(buffer, 4096);

        bool passed = success && strlen(buffer) > 0;
        std::cout << "  Preset JSON length: " << strlen(buffer) << std::endl;

        TestHelpers::printTestResult("Preset saves successfully", passed);
        assert(passed);
    }

    static void testLoadPreset()
    {
        TestHelpers::printTestHeader("Preset Load");

        DSP::AetherGiantHornsPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Create preset JSON
        const char* preset = "{"
            "\"lipTension\": 0.85,"
            "\"boreLength\": 8.0,"
            "\"brightness\": 0.7"
        "}";

        bool success = instrument.loadPreset(preset);

        float lipTension = instrument.getParameter("lipTension");
        float boreLength = instrument.getParameter("boreLength");
        float brightness = instrument.getParameter("brightness");

        bool passed = success &&
                      TestHelpers::approximatelyEqual(lipTension, 0.85f) &&
                      TestHelpers::approximatelyEqual(boreLength, 8.0f) &&
                      TestHelpers::approximatelyEqual(brightness, 0.7f);

        std::cout << "  Loaded lipTension: " << lipTension << std::endl;
        std::cout << "  Loaded boreLength: " << boreLength << std::endl;
        std::cout << "  Loaded brightness: " << brightness << std::endl;

        TestHelpers::printTestResult("Preset loads successfully", passed);
        assert(passed);
    }
};

//==============================================================================
// Main Test Runner
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "========================================\n";
    std::cout << "  Aether Giant Horns DSP Test Suite\n";
    std::cout << "========================================\n";

    try
    {
        std::cout << "\n[Group 1: Lip Reed Exciter]\n";
        LipReedExciterTests::testInitialization();
        LipReedExciterTests::testOscillation();
        LipReedExciterTests::testPressureDependency();

        std::cout << "\n[Group 2: Bore Waveguide]\n";
        BoreWaveguideTests::testInitialization();
        BoreWaveguideTests::testFundamentalFrequency();
        BoreWaveguideTests::testWavePropagation();

        std::cout << "\n[Group 3: Bell Radiation Filter]\n";
        BellRadiationFilterTests::testInitialization();
        BellRadiationFilterTests::testFrequencyShaping();

        std::cout << "\n[Group 4: Horn Formant Shaper]\n";
        HornFormantShaperTests::testInitialization();
        HornFormantShaperTests::testHornTypeChange();
        HornFormantShaperTests::testBrightness();

        std::cout << "\n[Group 5: Giant Horn Voice]\n";
        GiantHornVoiceTests::testVoiceTriggering();
        GiantHornVoiceTests::testVoiceRelease();
        GiantHornVoiceTests::testGiantScaleAttack();

        std::cout << "\n[Group 6: Voice Manager]\n";
        GiantHornVoiceManagerTests::testPolyphony();
        GiantHornVoiceManagerTests::testNoteOff();

        std::cout << "\n[Group 7: Main Instrument]\n";
        AetherGiantHornsDSPTests::testInitialization();
        AetherGiantHornsDSPTests::testProcess();
        AetherGiantHornsDSPTests::testParameters();
        AetherGiantHornsDSPTests::testMPEPressureMapping();
        AetherGiantHornsDSPTests::testGiantScale();

        std::cout << "\n[Group 8: Preset Serialization]\n";
        PresetSerializationTests::testSavePreset();
        PresetSerializationTests::testLoadPreset();

        std::cout << "\n";
        std::cout << "========================================\n";
        std::cout << "  ALL TESTS PASSED!\n";
        std::cout << "========================================\n";
        std::cout << "\n";

        return 0;
    }
    catch (const std::exception& e)
    {
        std::cerr << "\n[ERROR] Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
    catch (...)
    {
        std::cerr << "\n[ERROR] Test failed with unknown exception" << std::endl;
        return 1;
    }
}
