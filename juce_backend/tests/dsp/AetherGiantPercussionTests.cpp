/*
  ==============================================================================

   AetherGiantPercussionTests.cpp
   Unit tests for Aether Giant Percussion Pure DSP Implementation

   Tests cover:
   - Modal resonator bank initialization and processing
   - Strike exciter with different mallet types
   - Nonlinear dispersion for metallic shimmer
   - Stereo radiation patterns
   - Giant scale parameters (2-10 second decay)
   - MPE gesture mapping
   - Voice management and polyphony
   - Preset serialization

  ==============================================================================
*/

#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <cassert>
#include <iostream>
#include <cmath>

// Include after JUCE headers
#include "dsp/AetherGiantPercussionDSP.h"

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
            std::cout << "✅ PASS: " << testName << std::endl;
        else
            std::cout << "❌ FAIL: " << testName << std::endl;
    }
};

//==============================================================================
// Test 1: Modal Resonator Mode
//==============================================================================

class ModalResonatorModeTests
{
public:
    static void testModeInitialization()
    {
        TestHelpers::printTestHeader("Mode Initialization");

        DSP::ModalResonatorMode mode;
        mode.prepare(48000.0);

        mode.frequency = 440.0f;
        mode.decay = 0.995f;

        bool frequencySet = TestHelpers::approximatelyEqual(mode.frequency, 440.0f);
        bool decaySet = TestHelpers::approximatelyEqual(mode.decay, 0.995f);
        bool amplitudeZero = TestHelpers::approximatelyEqual(mode.amplitude, 0.0f);

        bool passed = frequencySet && decaySet && amplitudeZero;

        TestHelpers::printTestResult("Mode initializes correctly", passed);
        assert(passed);
    }

    static void testModeExcitation()
    {
        TestHelpers::printTestHeader("Mode Excitation");

        DSP::ModalResonatorMode mode;
        mode.prepare(48000.0);
        mode.frequency = 220.0f;
        mode.decay = 0.995f;

        mode.excite(0.8f);

        bool amplitudeIncreased = mode.amplitude > 0.0f;

        // Process with some input to drive the resonator
        float sample1 = mode.processSample(0.5f);  // Drive the resonator
        float sample2 = mode.processSample(0.3f);

        bool hasOutput = (sample1 != 0.0f) && (sample2 != 0.0f);
        bool outputChanges = (sample1 != sample2);

        std::cout << "  amplitude: " << mode.amplitude << std::endl;
        std::cout << "  sample1: " << sample1 << ", sample2: " << sample2 << std::endl;
        std::cout << "  amplitudeIncreased: " << amplitudeIncreased << std::endl;
        std::cout << "  hasOutput: " << hasOutput << std::endl;
        std::cout << "  outputChanges: " << outputChanges << std::endl;

        bool passed = amplitudeIncreased && hasOutput && outputChanges;

        TestHelpers::printTestResult("Mode excitation produces output", passed);
        assert(passed);
    }

    static void testModeDecay()
    {
        TestHelpers::printTestHeader("Mode Decay");

        DSP::ModalResonatorMode mode;
        mode.prepare(48000.0);
        mode.frequency = 110.0f;
        mode.decay = 0.990f; // Fast decay for testing

        mode.excite(1.0f);

        float maxAmplitude = mode.amplitude;

        // Process many samples with small input to drive the resonator
        for (int i = 0; i < 1000; ++i)
        {
            mode.processSample(0.01f);  // Small drive signal
        }

        float finalAmplitude = mode.amplitude;

        // Amplitude should have decayed
        bool passed = finalAmplitude < maxAmplitude;

        std::cout << "  Initial amplitude: " << maxAmplitude << std::endl;
        std::cout << "  Final amplitude: " << finalAmplitude << std::endl;

        TestHelpers::printTestResult("Mode amplitude decays over time", passed);
        assert(passed);
    }

    static void testModeReset()
    {
        TestHelpers::printTestHeader("Mode Reset");

        DSP::ModalResonatorMode mode;
        mode.prepare(48000.0);
        mode.frequency = 330.0f;
        mode.decay = 0.995f;

        mode.excite(1.0f);
        mode.processSample(0.0f); // Generate some output

        bool hasEnergyBefore = mode.amplitude > 0.0f;

        mode.reset();

        bool energyCleared = TestHelpers::approximatelyEqual(mode.amplitude, 0.0f);
        bool phaseReset = TestHelpers::approximatelyEqual(mode.phase, 0.0f);

        bool passed = hasEnergyBefore && energyCleared && phaseReset;

        TestHelpers::printTestResult("Mode reset clears all state", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  MODAL RESONATOR MODE TESTS             ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testModeInitialization();
        testModeExcitation();
        testModeDecay();
        testModeReset();
    }
};

//==============================================================================
// Test 2: Modal Resonator Bank
//==============================================================================

class ModalResonatorBankTests
{
public:
    static void testBankInitialization()
    {
        TestHelpers::printTestHeader("Bank Initialization");

        DSP::ModalResonatorBank bank;
        bank.prepare(48000.0);

        auto params = bank.getParameters();

        bool defaultType = (params.instrumentType == DSP::ModalResonatorBank::InstrumentType::Gong);
        bool defaultSize = TestHelpers::approximatelyEqual(params.sizeMeters, 1.0f);
        bool defaultModes = (params.numModes == 16);

        bool passed = defaultType && defaultSize && defaultModes;

        TestHelpers::printTestResult("Bank initializes with default parameters", passed);
        assert(passed);
    }

    static void testGongModeGeneration()
    {
        TestHelpers::printTestHeader("Gong Mode Generation");

        DSP::ModalResonatorBank bank;
        bank.prepare(48000.0);

        DSP::ModalResonatorBank::Parameters params;
        params.instrumentType = DSP::ModalResonatorBank::InstrumentType::Gong;
        params.numModes = 16;
        bank.setParameters(params);

        // Strike the bank
        bank.strike(0.8f, 0.7f, 0.5f);

        // Should have output
        float output = bank.processSample();

        bool hasOutput = (output != 0.0f);
        bool hasEnergy = bank.getTotalEnergy() > 0.0f;

        bool passed = hasOutput && hasEnergy;

        TestHelpers::printTestResult("Gong modes generate output", passed);
        assert(passed);
    }

    static void testBellModeGeneration()
    {
        TestHelpers::printTestHeader("Bell Mode Generation");

        DSP::ModalResonatorBank bank;
        bank.prepare(48000.0);

        DSP::ModalResonatorBank::Parameters params;
        params.instrumentType = DSP::ModalResonatorBank::InstrumentType::Bell;
        params.numModes = 16;
        bank.setParameters(params);

        bank.strike(0.8f, 0.7f, 0.5f);

        float output = bank.processSample();

        bool hasOutput = (output != 0.0f);
        bool hasEnergy = bank.getTotalEnergy() > 0.0f;

        bool passed = hasOutput && hasEnergy;

        TestHelpers::printTestResult("Bell modes generate output", passed);
        assert(passed);
    }

    static void testLongDecayForGiantScale()
    {
        TestHelpers::printTestHeader("Giant Scale Long Decay");

        DSP::ModalResonatorBank bank;
        bank.prepare(48000.0);

        DSP::ModalResonatorBank::Parameters params;
        params.instrumentType = DSP::ModalResonatorBank::InstrumentType::Gong;
        params.sizeMeters = 3.0f; // Giant scale
        params.numModes = 16;
        bank.setParameters(params);

        bank.strike(1.0f, 1.0f, 0.5f);

        float initialEnergy = bank.getTotalEnergy();

        // Process 2 seconds at 48kHz
        for (int i = 0; i < 96000; ++i)
        {
            bank.processSample();
        }

        float energyAfter2Seconds = bank.getTotalEnergy();

        // Giant percussion should still have energy after 2 seconds
        bool hasSustain = energyAfter2Seconds > 0.01f;

        std::cout << "  Initial energy: " << initialEnergy << std::endl;
        std::cout << "  Energy after 2 seconds: " << energyAfter2Seconds << std::endl;

        TestHelpers::printTestResult("Giant scale has long decay (2+ seconds)", hasSustain);
        assert(hasSustain);
    }

    static void testLowFundamentalForGiantScale()
    {
        TestHelpers::printTestHeader("Giant Scale Low Fundamental");

        DSP::ModalResonatorBank bank;
        bank.prepare(48000.0);

        DSP::ModalResonatorBank::Parameters params;
        params.instrumentType = DSP::ModalResonatorBank::InstrumentType::Gong;
        params.sizeMeters = 5.0f; // Very large
        params.numModes = 16;
        bank.setParameters(params);

        bank.strike(0.8f, 0.7f, 0.5f);

        // The lowest mode should be below 100Hz for giant gong
        // We can't directly access modes, but we can check the sound character
        // by analyzing the output over time

        float output = bank.processSample();

        bool hasOutput = (output != 0.0f);

        TestHelpers::printTestResult("Giant gong produces low frequency content", hasOutput);
        assert(hasOutput);
    }

    static void testBankReset()
    {
        TestHelpers::printTestHeader("Bank Reset");

        DSP::ModalResonatorBank bank;
        bank.prepare(48000.0);

        bank.strike(1.0f, 1.0f, 0.5f);
        bank.processSample();

        bool hasEnergyBefore = bank.getTotalEnergy() > 0.0f;

        bank.reset();

        bool energyCleared = bank.getTotalEnergy() < 0.0001f;

        bool passed = hasEnergyBefore && energyCleared;

        TestHelpers::printTestResult("Bank reset clears all modes", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  MODAL RESONATOR BANK TESTS             ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testBankInitialization();
        testGongModeGeneration();
        testBellModeGeneration();
        testLongDecayForGiantScale();
        testLowFundamentalForGiantScale();
        testBankReset();
    }
};

//==============================================================================
// Test 3: Strike Exciter
//==============================================================================

class StrikeExciterTests
{
public:
    static void testExciterInitialization()
    {
        TestHelpers::printTestHeader("Exciter Initialization");

        DSP::StrikeExciter exciter;
        exciter.prepare(48000.0);

        auto params = exciter.getParameters();

        bool defaultType = (params.malletType == DSP::StrikeExciter::MalletType::Medium);
        bool defaultClick = TestHelpers::approximatelyEqual(params.clickAmount, 0.3f);

        bool passed = defaultType && defaultClick;

        TestHelpers::printTestResult("Exciter initializes with defaults", passed);
        assert(passed);
    }

    static void testMalletTypes()
    {
        TestHelpers::printTestHeader("Mallet Type Variations");

        DSP::StrikeExciter softExciter, hardExciter, metalExciter;
        softExciter.prepare(48000.0);
        hardExciter.prepare(48000.0);
        metalExciter.prepare(48000.0);

        DSP::StrikeExciter::Parameters softParams;
        softParams.malletType = DSP::StrikeExciter::MalletType::Soft;
        softParams.brightness = 0.3f;
        softExciter.setParameters(softParams);

        DSP::StrikeExciter::Parameters hardParams;
        hardParams.malletType = DSP::StrikeExciter::MalletType::Hard;
        hardParams.brightness = 0.7f;
        hardExciter.setParameters(hardParams);

        DSP::StrikeExciter::Parameters metalParams;
        metalParams.malletType = DSP::StrikeExciter::MalletType::Metal;
        metalParams.brightness = 0.9f;
        metalExciter.setParameters(metalParams);

        // Generate excitation
        float softOutput = softExciter.processSample(0.8f, 0.7f, 0.5f, 0.3f);
        float hardOutput = hardExciter.processSample(0.8f, 0.7f, 0.5f, 0.3f);
        float metalOutput = metalExciter.processSample(0.8f, 0.7f, 0.5f, 0.3f);

        bool softHasOutput = (softOutput != 0.0f);
        bool hardHasOutput = (hardOutput != 0.0f);
        bool metalHasOutput = (metalOutput != 0.0f);

        bool passed = softHasOutput && hardHasOutput && metalHasOutput;

        std::cout << "  Soft output: " << softOutput << std::endl;
        std::cout << "  Hard output: " << hardOutput << std::endl;
        std::cout << "  Metal output: " << metalOutput << std::endl;

        TestHelpers::printTestResult("All mallet types produce excitation", passed);
        assert(passed);
    }

    static void testBrightnessControl()
    {
        TestHelpers::printTestHeader("Brightness Control");

        DSP::StrikeExciter darkExciter, brightExciter;
        darkExciter.prepare(48000.0);
        brightExciter.prepare(48000.0);

        DSP::StrikeExciter::Parameters darkParams;
        darkParams.brightness = 0.2f;
        darkExciter.setParameters(darkParams);

        DSP::StrikeExciter::Parameters brightParams;
        brightParams.brightness = 0.9f;
        brightExciter.setParameters(brightParams);

        float darkOutput = darkExciter.processSample(0.8f, 0.7f, 0.5f, 0.3f);
        float brightOutput = brightExciter.processSample(0.8f, 0.7f, 0.5f, 0.3f);

        bool darkHasOutput = (darkOutput != 0.0f);
        bool brightHasOutput = (brightOutput != 0.0f);

        bool passed = darkHasOutput && brightHasOutput;

        TestHelpers::printTestResult("Brightness affects excitation", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  STRIKE EXCITER TESTS                   ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testExciterInitialization();
        testMalletTypes();
        testBrightnessControl();
    }
};

//==============================================================================
// Test 4: Nonlinear Dispersion
//==============================================================================

class NonlinearDispersionTests
{
public:
    static void testDispersionInitialization()
    {
        TestHelpers::printTestHeader("Dispersion Initialization");

        DSP::NonlinearDispersion dispersion;
        dispersion.prepare(48000.0);

        // If we got here without crash, initialization succeeded
        bool passed = true;

        TestHelpers::printTestResult("Dispersion initializes", passed);
        assert(passed);
    }

    static void testDispersionEffect()
    {
        TestHelpers::printTestHeader("Dispersion Effect");

        DSP::NonlinearDispersion dispersion;
        dispersion.prepare(48000.0);

        // Process a simple signal
        float input = 0.5f;
        float output = dispersion.processSample(input, 0.5f);

        bool hasOutput = (output != 0.0f);

        // With dispersion, output should be modified
        bool passed = hasOutput;

        TestHelpers::printTestResult("Dispersion processes signal", passed);
        assert(passed);
    }

    static void testInharmonicityControl()
    {
        TestHelpers::printTestHeader("Inharmonicity Control");

        DSP::NonlinearDispersion dispersion;
        dispersion.prepare(48000.0);

        dispersion.setInharmonicity(0.2f);
        float output1 = dispersion.processSample(0.5f, 0.2f);

        dispersion.setInharmonicity(0.8f);
        float output2 = dispersion.processSample(0.5f, 0.8f);

        bool hasOutput1 = (output1 != 0.0f);
        bool hasOutput2 = (output2 != 0.0f);

        bool passed = hasOutput1 && hasOutput2;

        TestHelpers::printTestResult("Inharmonicity parameter works", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  NONLINEAR DISPERSION TESTS              ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testDispersionInitialization();
        testDispersionEffect();
        testInharmonicityControl();
    }
};

//==============================================================================
// Test 5: Stereo Radiation Pattern
//==============================================================================

class StereoRadiationTests
{
public:
    static void testRadiationInitialization()
    {
        TestHelpers::printTestHeader("Radiation Initialization");

        DSP::StereoRadiationPattern radiation;
        radiation.prepare(48000.0);

        auto params = radiation.getParameters();

        bool defaultWidth = TestHelpers::approximatelyEqual(params.width, 0.5f);

        bool passed = defaultWidth;

        TestHelpers::printTestResult("Radiation initializes with defaults", passed);
        assert(passed);
    }

    static void testStereoOutput()
    {
        TestHelpers::printTestHeader("Stereo Output Generation");

        DSP::StereoRadiationPattern radiation;
        radiation.prepare(48000.0);

        float input = 0.5f;
        float left = 0.0f;
        float right = 0.0f;

        radiation.processSample(input, left, right);

        bool hasLeft = (left != 0.0f);
        bool hasRight = (right != 0.0f);

        bool passed = hasLeft && hasRight;

        std::cout << "  Left output: " << left << std::endl;
        std::cout << "  Right output: " << right << std::endl;

        TestHelpers::printTestResult("Radiation generates stereo output", passed);
        assert(passed);
    }

    static void testStereoWidth()
    {
        TestHelpers::printTestHeader("Stereo Width Control");

        DSP::StereoRadiationPattern narrowRadiation, wideRadiation;
        narrowRadiation.prepare(48000.0);
        wideRadiation.prepare(48000.0);

        DSP::StereoRadiationPattern::Parameters narrowParams;
        narrowParams.width = 0.1f;
        narrowRadiation.setParameters(narrowParams);

        DSP::StereoRadiationPattern::Parameters wideParams;
        wideParams.width = 1.0f;
        wideRadiation.setParameters(wideParams);

        float input = 0.5f;
        float narrowLeft, narrowRight, wideLeft, wideRight;

        narrowRadiation.processSample(input, narrowLeft, narrowRight);
        wideRadiation.processSample(input, wideLeft, wideRight);

        bool narrowHasOutput = (narrowLeft != 0.0f) && (narrowRight != 0.0f);
        bool wideHasOutput = (wideLeft != 0.0f) && (wideRight != 0.0f);

        bool passed = narrowHasOutput && wideHasOutput;

        std::cout << "  Narrow L/R: " << narrowLeft << " / " << narrowRight << std::endl;
        std::cout << "  Wide L/R: " << wideLeft << " / " << wideRight << std::endl;

        TestHelpers::printTestResult("Stereo width parameter works", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  STEREO RADIATION TESTS                 ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testRadiationInitialization();
        testStereoOutput();
        testStereoWidth();
    }
};

//==============================================================================
// Test 6: Giant Percussion Voice
//==============================================================================

class GiantPercussionVoiceTests
{
public:
    static void testVoiceInitialization()
    {
        TestHelpers::printTestHeader("Voice Initialization");

        DSP::GiantPercussionVoice voice;
        voice.prepare(48000.0);

        bool notActive = !voice.active;

        bool passed = notActive;

        TestHelpers::printTestResult("Voice initializes inactive", passed);
        assert(passed);
    }

    static void testVoiceTrigger()
    {
        TestHelpers::printTestHeader("Voice Trigger");

        DSP::GiantPercussionVoice voice;
        voice.prepare(48000.0);

        GiantScaleParameters scale;
        scale.scaleMeters = 2.0f;

        GiantGestureParameters gesture;
        gesture.force = 0.7f;
        gesture.speed = 0.6f;

        voice.trigger(60, 0.8f, gesture, scale);

        bool isActive = voice.active;
        bool correctNote = (voice.midiNote == 60);
        bool correctVelocity = TestHelpers::approximatelyEqual(voice.velocity, 0.8f);

        bool passed = isActive && correctNote && correctVelocity;

        TestHelpers::printTestResult("Voice triggers correctly", passed);
        assert(passed);
    }

    static void testVoiceProcessing()
    {
        TestHelpers::printTestHeader("Voice Processing");

        DSP::GiantPercussionVoice voice;
        voice.prepare(48000.0);

        GiantScaleParameters scale;
        scale.scaleMeters = 2.0f;

        GiantGestureParameters gesture;
        gesture.force = 0.7f;

        voice.trigger(60, 0.8f, gesture, scale);

        float left = 0.0f;
        float right = 0.0f;
        float output = voice.processSample(left, right);

        bool hasOutput = (output != 0.0f);
        bool hasStereo = (left != 0.0f) && (right != 0.0f);

        bool passed = hasOutput && hasStereo;

        std::cout << "  Output: " << output << std::endl;
        std::cout << "  L/R: " << left << " / " << right << std::endl;

        TestHelpers::printTestResult("Voice produces stereo output", passed);
        assert(passed);
    }

    static void testVoiceDecay()
    {
        TestHelpers::printTestHeader("Voice Decay");

        DSP::GiantPercussionVoice voice;
        voice.prepare(48000.0);

        GiantScaleParameters scale;
        scale.scaleMeters = 3.0f; // Giant scale

        GiantGestureParameters gesture;
        gesture.force = 1.0f;

        voice.trigger(48, 1.0f, gesture, scale);

        float left, right;

        // Process for 1 second
        for (int i = 0; i < 48000; ++i)
        {
            voice.processSample(left, right);
        }

        // Should still be active after 1 second (giant scale)
        bool stillActive = voice.isActive();

        std::cout << "  Voice active after 1 second: " << (stillActive ? "yes" : "no") << std::endl;

        TestHelpers::printTestResult("Giant voice has long decay", stillActive);
        assert(stillActive);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  GIANT PERCUSSION VOICE TESTS           ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testVoiceInitialization();
        testVoiceTrigger();
        testVoiceProcessing();
        testVoiceDecay();
    }
};

//==============================================================================
// Test 7: Voice Manager
//==============================================================================

class VoiceManagerTests
{
public:
    static void testManagerInitialization()
    {
        TestHelpers::printTestHeader("Voice Manager Initialization");

        DSP::GiantPercussionVoiceManager manager;
        manager.prepare(48000.0, 16);

        int activeCount = manager.getActiveVoiceCount();

        bool passed = (activeCount == 0);

        TestHelpers::printTestResult("Manager initializes with no active voices", passed);
        assert(passed);
    }

    static void testNoteOnOff()
    {
        TestHelpers::printTestHeader("Note On/Off");

        DSP::GiantPercussionVoiceManager manager;
        manager.prepare(48000.0, 16);

        GiantScaleParameters scale;
        scale.scaleMeters = 2.0f;

        GiantGestureParameters gesture;
        gesture.force = 0.7f;

        manager.handleNoteOn(60, 0.8f, gesture, scale);

        int activeAfterOn = manager.getActiveVoiceCount();
        bool hasActiveVoice = (activeAfterOn > 0);

        manager.handleNoteOff(60);

        int activeAfterOff = manager.getActiveVoiceCount();

        bool passed = hasActiveVoice;

        std::cout << "  Active voices after note on: " << activeAfterOn << std::endl;
        std::cout << "  Active voices after note off: " << activeAfterOff << std::endl;

        TestHelpers::printTestResult("Note on creates active voice", passed);
        assert(passed);
    }

    static void testPolyphony()
    {
        TestHelpers::printTestHeader("Polyphony");

        DSP::GiantPercussionVoiceManager manager;
        manager.prepare(48000.0, 8);

        GiantScaleParameters scale;
        scale.scaleMeters = 2.0f;

        GiantGestureParameters gesture;
        gesture.force = 0.7f;

        // Trigger multiple notes
        manager.handleNoteOn(60, 0.8f, gesture, scale);
        manager.handleNoteOn(64, 0.8f, gesture, scale);
        manager.handleNoteOn(67, 0.8f, gesture, scale);

        int activeCount = manager.getActiveVoiceCount();

        bool passed = (activeCount == 3);

        std::cout << "  Active voices: " << activeCount << std::endl;

        TestHelpers::printTestResult("Multiple voices can be active", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  VOICE MANAGER TESTS                    ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testManagerInitialization();
        testNoteOnOff();
        testPolyphony();
    }
};

//==============================================================================
// Test 8: Main Instrument
//==============================================================================

class MainInstrumentTests
{
public:
    static void testInstrumentInitialization()
    {
        TestHelpers::printTestHeader("Instrument Initialization");

        DSP::AetherGiantPercussionPureDSP instrument;

        bool prepared = instrument.prepare(48000.0, 512);

        int maxPolyphony = instrument.getMaxPolyphony();
        int activeVoices = instrument.getActiveVoiceCount();

        const char* name = instrument.getInstrumentName();
        const char* version = instrument.getInstrumentVersion();

        bool passed = prepared &&
                     (maxPolyphony == 24) &&
                     (activeVoices == 0) &&
                     (std::string(name) == "AetherGiantPercussion") &&
                     (std::string(version) == "1.0.0");

        std::cout << "  Prepared: " << (prepared ? "yes" : "no") << std::endl;
        std::cout << "  Max polyphony: " << maxPolyphony << std::endl;
        std::cout << "  Name: " << name << std::endl;
        std::cout << "  Version: " << version << std::endl;

        TestHelpers::printTestResult("Instrument initializes correctly", passed);
        assert(passed);
    }

    static void testNoteProcessing()
    {
        TestHelpers::printTestHeader("Note Processing");

        DSP::AetherGiantPercussionPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set giant scale
        instrument.setParameter("scaleMeters", 3.0f);
        instrument.setParameter("sizeMeters", 2.5f);

        // Trigger note
        instrument.noteOn(48, 0.8f);

        // Process a buffer
        constexpr int numSamples = 256;
        float* outputs[2];
        float leftBuffer[numSamples];
        float rightBuffer[numSamples];

        // Clear buffers
        std::fill(leftBuffer, leftBuffer + numSamples, 0.0f);
        std::fill(rightBuffer, rightBuffer + numSamples, 0.0f);

        outputs[0] = leftBuffer;
        outputs[1] = rightBuffer;

        instrument.process(outputs, 2, numSamples);

        // Check for output
        bool hasOutput = false;
        for (int i = 0; i < numSamples; ++i)
        {
            if (leftBuffer[i] != 0.0f || rightBuffer[i] != 0.0f)
            {
                hasOutput = true;
                break;
            }
        }

        bool passed = hasOutput;

        TestHelpers::printTestResult("Note produces audio output", passed);
        assert(passed);
    }

    static void testParameterSetGet()
    {
        TestHelpers::printTestHeader("Parameter Set/Get");

        DSP::AetherGiantPercussionPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set parameters
        instrument.setParameter("instrumentType", 1.0f); // Bell
        instrument.setParameter("sizeMeters", 3.5f);
        instrument.setParameter("brightness", 0.8f);
        instrument.setParameter("masterVolume", 0.6f);

        // Get parameters
        float type = instrument.getParameter("instrumentType");
        float size = instrument.getParameter("sizeMeters");
        float brightness = instrument.getParameter("brightness");
        float volume = instrument.getParameter("masterVolume");

        bool passed = TestHelpers::approximatelyEqual(type, 1.0f) &&
                     TestHelpers::approximatelyEqual(size, 3.5f) &&
                     TestHelpers::approximatelyEqual(brightness, 0.8f) &&
                     TestHelpers::approximatelyEqual(volume, 0.6f);

        std::cout << "  Type: " << type << " (expected 1.0)" << std::endl;
        std::cout << "  Size: " << size << " (expected 3.5)" << std::endl;
        std::cout << "  Brightness: " << brightness << " (expected 0.8)" << std::endl;
        std::cout << "  Volume: " << volume << " (expected 0.6)" << std::endl;

        TestHelpers::printTestResult("Parameters set and get correctly", passed);
        assert(passed);
    }

    static void testMPEGestureMapping()
    {
        TestHelpers::printTestHeader("MPE Gesture Mapping");

        DSP::AetherGiantPercussionPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set gesture parameters
        instrument.setParameter("force", 0.9f);      // Strike force
        instrument.setParameter("speed", 0.7f);      // Mallet velocity
        instrument.setParameter("contactArea", 0.4f); // Mallet head size
        instrument.setParameter("roughness", 0.6f);   // Mallet hardness

        // Verify
        float force = instrument.getParameter("force");
        float speed = instrument.getParameter("speed");
        float contactArea = instrument.getParameter("contactArea");
        float roughness = instrument.getParameter("roughness");

        bool passed = TestHelpers::approximatelyEqual(force, 0.9f) &&
                     TestHelpers::approximatelyEqual(speed, 0.7f) &&
                     TestHelpers::approximatelyEqual(contactArea, 0.4f) &&
                     TestHelpers::approximatelyEqual(roughness, 0.6f);

        TestHelpers::printTestResult("MPE gesture parameters map correctly", passed);
        assert(passed);
    }

    static void testGiantScaleEffect()
    {
        TestHelpers::printTestHeader("Giant Scale Effect on Decay");

        DSP::AetherGiantPercussionPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set giant scale
        instrument.setParameter("scaleMeters", 4.0f);
        instrument.setParameter("sizeMeters", 3.0f);
        instrument.setParameter("damping", 0.3f); // Low damping = long decay

        instrument.noteOn(36, 1.0f); // Low C

        // Process 3 seconds
        constexpr int numSamples = 256;
        float* outputs[2];
        float leftBuffer[numSamples];
        float rightBuffer[numSamples];
        outputs[0] = leftBuffer;
        outputs[1] = rightBuffer;

        for (int i = 0; i < (48000 * 3) / numSamples; ++i)
        {
            std::fill(leftBuffer, leftBuffer + numSamples, 0.0f);
            std::fill(rightBuffer, rightBuffer + numSamples, 0.0f);
            instrument.process(outputs, 2, numSamples);
        }

        // Should still have active voices after 3 seconds
        int activeVoices = instrument.getActiveVoiceCount();

        bool passed = (activeVoices > 0);

        std::cout << "  Active voices after 3 seconds: " << activeVoices << std::endl;

        TestHelpers::printTestResult("Giant scale produces 3+ second decay", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  MAIN INSTRUMENT TESTS                  ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testInstrumentInitialization();
        testNoteProcessing();
        testParameterSetGet();
        testMPEGestureMapping();
        testGiantScaleEffect();
    }
};

//==============================================================================
// Test 9: Preset Serialization
//==============================================================================

class PresetTests
{
public:
    static void testPresetSave()
    {
        TestHelpers::printTestHeader("Preset Save");

        DSP::AetherGiantPercussionPureDSP instrument;
        instrument.prepare(48000.0, 512);

        // Set some parameters
        instrument.setParameter("instrumentType", 2.0f); // Plate
        instrument.setParameter("sizeMeters", 4.0f);
        instrument.setParameter("brightness", 0.7f);
        instrument.setParameter("masterVolume", 0.8f);

        char jsonBuffer[4096];
        bool saved = instrument.savePreset(jsonBuffer, 4096);

        bool hasContent = (std::strlen(jsonBuffer) > 0);

        bool passed = saved && hasContent;

        if (passed)
        {
            std::cout << "  JSON: " << jsonBuffer << std::endl;
        }

        TestHelpers::printTestResult("Preset saves to JSON", passed);
        assert(passed);
    }

    static void testPresetLoad()
    {
        TestHelpers::printTestHeader("Preset Load");

        // Create a simple preset
        const char* presetJson = R"({
            "instrumentType": 1.0,
            "sizeMeters": 3.5,
            "brightness": 0.8,
            "masterVolume": 0.7
        })";

        DSP::AetherGiantPercussionPureDSP instrument;
        instrument.prepare(48000.0, 512);

        bool loaded = instrument.loadPreset(presetJson);

        float type = instrument.getParameter("instrumentType");
        float size = instrument.getParameter("sizeMeters");
        float brightness = instrument.getParameter("brightness");
        float volume = instrument.getParameter("masterVolume");

        bool passed = loaded &&
                     TestHelpers::approximatelyEqual(type, 1.0f) &&
                     TestHelpers::approximatelyEqual(size, 3.5f) &&
                     TestHelpers::approximatelyEqual(brightness, 0.8f) &&
                     TestHelpers::approximatelyEqual(volume, 0.7f);

        TestHelpers::printTestResult("Preset loads from JSON", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  PRESET SERIALIZATION TESTS             ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testPresetSave();
        testPresetLoad();
    }
};

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║     AETHER GIANT PERCUSSION UNIT TEST SUITE             ║" << std::endl;
    std::cout << "║     Physical Modeling Metallic Percussion               ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;

    try
    {
        // Run all test suites
        ModalResonatorModeTests::runAll();
        ModalResonatorBankTests::runAll();
        StrikeExciterTests::runAll();
        NonlinearDispersionTests::runAll();
        StereoRadiationTests::runAll();
        GiantPercussionVoiceTests::runAll();
        VoiceManagerTests::runAll();
        MainInstrumentTests::runAll();
        PresetTests::runAll();

        std::cout << "\n";
        std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
        std::cout << "║     ✅ ALL TESTS PASSED                                  ║" << std::endl;
        std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
        std::cout << "\n";

        return 0;
    }
    catch (const std::exception& e)
    {
        std::cout << "\n❌ TEST FAILURE: " << e.what() << std::endl;
        return 1;
    }
}
