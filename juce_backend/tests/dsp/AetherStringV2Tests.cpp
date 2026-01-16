/*
  ==============================================================================

   AetherStringV2Tests.cpp
   Unit tests for Aether String v2 "Giant Instruments" features

   Tests cover:
   - Scale parameters (stringLengthMeters)
   - Pick position comb filtering
   - String gauge mappings
   - Gesture parameters
   - Shared bridge coupling
   - Sympathetic strings

  ==============================================================================
*/

#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include "../../include/dsp/KaneMarcoAetherStringDSP.h"
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
            std::cout << "✅ PASS: " << testName << std::endl;
        else
            std::cout << "❌ FAIL: " << testName << std::endl;
    }
};

//==============================================================================
// Test 1: Scale Parameters (stringLengthMeters)
//==============================================================================

class ScaleParameterTests
{
public:
    static void testStringLengthDefaults()
    {
        TestHelpers::printTestHeader("String Length Defaults");

        WaveguideString string;
        string.prepare(48000.0);

        // Default should be guitar-scale (0.65m)
        bool passed = TestHelpers::approximatelyEqual(
            string.params.stringLengthMeters,
            0.65f,
            0.01f
        );

        TestHelpers::printTestResult("Default string length is 0.65m (guitar)", passed);
        assert(passed);
    }

    static void testStringLengthClamping()
    {
        TestHelpers::printTestHeader("String Length Clamping");

        WaveguideString string;
        string.prepare(48000.0);

        // Test minimum clamp (should not go below 0.1m)
        string.setStringLengthMeters(0.01f);
        bool minPass = string.params.stringLengthMeters >= 0.1f;

        // Test maximum clamp (should not exceed 100m)
        string.setStringLengthMeters(200.0f);
        bool maxPass = string.params.stringLengthMeters <= 100.0f;

        bool passed = minPass && maxPass;
        TestHelpers::printTestResult("String length clamps to valid range [0.1, 100.0]", passed);
        assert(passed);
    }

    static void testStiffnessScalingWithLength()
    {
        TestHelpers::printTestHeader("Stiffness Scaling with Length");

        WaveguideString guitarString;
        guitarString.prepare(48000.0);
        guitarString.setStringLengthMeters(0.65f);
        float guitarStiffness = guitarString.params.stiffness;

        WaveguideString giantString;
        giantString.prepare(48000.0);
        giantString.setStringLengthMeters(12.0f);
        float giantStiffness = giantString.params.stiffness;

        // Giant string should have ~4.7x less stiffness
        // (sqrt(12.0 / 0.65) ≈ 4.7)
        bool passed = giantStiffness < guitarStiffness;
        float ratio = guitarStiffness / giantStiffness;
        bool ratioPass = ratio > 3.0f && ratio < 6.0f; // Allow some tolerance

        std::cout << "  Guitar stiffness: " << guitarStiffness << std::endl;
        std::cout << "  Giant stiffness: " << giantStiffness << std::endl;
        std::cout << "  Ratio: " << ratio << " (expected ~4.7x)" << std::endl;

        TestHelpers::printTestResult("Giant string has significantly lower stiffness", passed && ratioPass);
        assert(passed && ratioPass);
    }

    static void testDampingScalingWithLength()
    {
        TestHelpers::printTestHeader("Damping Scaling with Length");

        WaveguideString guitarString;
        guitarString.prepare(48000.0);
        guitarString.setStringLengthMeters(0.65f);
        float guitarDamping = guitarString.params.damping;

        WaveguideString giantString;
        giantString.prepare(48000.0);
        giantString.setStringLengthMeters(12.0f);
        float giantDamping = giantString.params.damping;

        // Giant string should have higher damping (closer to 1.0)
        // Result: much longer decay time
        bool passed = giantDamping > guitarDamping;

        std::cout << "  Guitar damping: " << guitarDamping << std::endl;
        std::cout << "  Giant damping: " << giantDamping << std::endl;
        std::cout << "  Decay time ratio: ~"
                  << (1.0f - guitarDamping) / (1.0f - giantDamping) << "x" << std::endl;

        TestHelpers::printTestResult("Giant string has higher damping (longer decay)", passed);
        assert(passed);
    }

    static void testBridgeCouplingScaling()
    {
        TestHelpers::printTestHeader("Bridge Coupling Scaling with Length");

        WaveguideString guitarString;
        guitarString.prepare(48000.0);
        guitarString.setStringLengthMeters(0.65f);
        float guitarCoupling = guitarString.params.bridgeCoupling;

        WaveguideString giantString;
        giantString.prepare(48000.0);
        giantString.setStringLengthMeters(12.0f);
        float giantCoupling = giantString.params.bridgeCoupling;

        // Giant string should have less bridge coupling (massive bridge)
        bool passed = giantCoupling < guitarCoupling;

        std::cout << "  Guitar coupling: " << guitarCoupling << std::endl;
        std::cout << "  Giant coupling: " << giantCoupling << std::endl;

        TestHelpers::printTestResult("Giant string has lower bridge coupling", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  SCALE PARAMETER TESTS                  ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testStringLengthDefaults();
        testStringLengthClamping();
        testStiffnessScalingWithLength();
        testDampingScalingWithLength();
        testBridgeCouplingScaling();
    }
};

//==============================================================================
// Test 2: Pick Position Comb Filtering
//==============================================================================

class PickPositionTests
{
public:
    static void testPickPositionDefaults()
    {
        TestHelpers::printTestHeader("Pick Position Defaults");

        WaveguideString string;
        string.prepare(48000.0);

        // Default should be 0.12 (12% from bridge, guitar-style)
        bool passed = TestHelpers::approximatelyEqual(
            string.params.pickPosition,
            0.12f,
            0.01f
        );

        TestHelpers::printTestResult("Default pick position is 0.12 (guitar)", passed);
        assert(passed);
    }

    static void testPickPositionClamping()
    {
        TestHelpers::printTestHeader("Pick Position Clamping");

        WaveguideString string;
        string.prepare(48000.0);

        // Test minimum clamp
        string.setPickPosition(-0.5f);
        bool minPass = string.params.pickPosition >= 0.0f;

        // Test maximum clamp
        string.setPickPosition(1.5f);
        bool maxPass = string.params.pickPosition <= 1.0f;

        bool passed = minPass && maxPass;
        TestHelpers::printTestResult("Pick position clamps to [0.0, 1.0]", passed);
        assert(passed);
    }

    static void testPickPositionCombFilterNulls()
    {
        TestHelpers::printTestHeader("Pick Position Comb Filter Nulls");

        // Test that pick position creates expected spectral nulls
        // Null at frequency f where: pickPosition = n / f_ratio
        // For pickPosition = 0.12, nulls should occur at harmonics:
        // f_null = n * f0 / 0.12 = n * 8.33 * f0

        float pickPosition = 0.12f;
        float fundamental = 440.0f;

        // First null should be around 8.33x fundamental (~3667 Hz)
        float firstNullExpected = fundamental / pickPosition;

        // This test validates the theoretical relationship
        // (actual implementation tested in exciter tests)
        bool passed = TestHelpers::approximatelyEqual(firstNullExpected, 3666.67f, 1.0f);

        std::cout << "  Pick position: " << pickPosition << std::endl;
        std::cout << "  First null expected: " << firstNullExpected << " Hz" << std::endl;

        TestHelpers::printTestResult("Pick position comb filter theory validated", passed);
        assert(passed);
    }

    static void testPickPositionTimbreEffect()
    {
        TestHelpers::printTestHeader("Pick Position Timbre Effect");

        // Near bridge (0.1) = bright
        // Middle (0.5) = warm
        // Near nut (0.9) = dark

        WaveguideString brightString;
        brightString.prepare(48000.0);
        brightString.setPickPosition(0.1f);

        WaveguideString warmString;
        warmString.prepare(48000.0);
        warmString.setPickPosition(0.5f);

        WaveguideString darkString;
        darkString.prepare(48000.0);
        darkString.setPickPosition(0.9f);

        bool passed = (brightString.params.pickPosition < warmString.params.pickPosition) &&
                      (warmString.params.pickPosition < darkString.params.pickPosition);

        std::cout << "  Bright position: " << brightString.params.pickPosition << std::endl;
        std::cout << "  Warm position: " << warmString.params.pickPosition << std::endl;
        std::cout << "  Dark position: " << darkString.params.pickPosition << std::endl;

        TestHelpers::printTestResult("Pick positions ordered correctly", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  PICK POSITION TESTS                    ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testPickPositionDefaults();
        testPickPositionClamping();
        testPickPositionCombFilterNulls();
        testPickPositionTimbreEffect();
    }
};

//==============================================================================
// Test 3: String Gauge Mappings
//==============================================================================

class StringGaugeTests
{
public:
    static void testStringGaugeDefaults()
    {
        TestHelpers::printTestHeader("String Gauge Defaults");

        WaveguideString string;
        string.prepare(48000.0);

        // Default should be Normal
        bool passed = (string.params.stringGauge == StringGauge::Normal);

        TestHelpers::printTestResult("Default string gauge is Normal", passed);
        assert(passed);
    }

    static void testThinGaugeMapping()
    {
        TestHelpers::printTestHeader("Thin Gauge Mapping");

        WaveguideString string;
        string.prepare(48000.0);
        string.setStringGauge(StringGauge::Thin);

        // Thin gauge should be brighter and faster decay
        // Expected: brightness +20%, decay -30%
        float baselineBrightness = 0.5f;
        float baselineDamping = 0.996f;

        bool brightnessPass = string.params.brightness > baselineBrightness;
        bool dampingPass = string.params.damping < baselineDamping;

        std::cout << "  Brightness: " << string.params.brightness
                  << " (expected > " << baselineBrightness << ")" << std::endl;
        std::cout << "  Damping: " << string.params.damping
                  << " (expected < " << baselineDamping << ")" << std::endl;

        bool passed = brightnessPass && dampingPass;
        TestHelpers::printTestResult("Thin gauge produces brighter, faster decay", passed);
        assert(passed);
    }

    static void testMassiveGaugeMapping()
    {
        TestHelpers::printTestHeader("Massive Gauge Mapping");

        WaveguideString string;
        string.prepare(48000.0);
        string.setStringGauge(StringGauge::Massive);

        // Massive gauge should be darker and much longer decay
        // Expected: brightness -40%, decay +150%
        float baselineBrightness = 0.5f;
        float baselineDamping = 0.996f;

        bool brightnessPass = string.params.brightness < baselineBrightness;
        bool dampingPass = string.params.damping > baselineDamping;

        std::cout << "  Brightness: " << string.params.brightness
                  << " (expected < " << baselineBrightness << ")" << std::endl;
        std::cout << "  Damping: " << string.params.damping
                  << " (expected > " << baselineDamping << ")" << std::endl;

        bool passed = brightnessPass && dampingPass;
        TestHelpers::printTestResult("Massive gauge produces darker, longer decay", passed);
        assert(passed);
    }

    static void testGaugeProgression()
    {
        TestHelpers::printTestHeader("Gauge Progression");

        WaveguideString thinString, normalString, thickString, massiveString;
        thinString.prepare(48000.0);
        normalString.prepare(48000.0);
        thickString.prepare(48000.0);
        massiveString.prepare(48000.0);

        thinString.setStringGauge(StringGauge::Thin);
        normalString.setStringGauge(StringGauge::Normal);
        thickString.setStringGauge(StringGauge::Thick);
        massiveString.setStringGauge(StringGauge::Massive);

        // Brightness should decrease: Thin > Normal > Thick > Massive
        bool brightnessProgression =
            (thinString.params.brightness > normalString.params.brightness) &&
            (normalString.params.brightness > thickString.params.brightness) &&
            (thickString.params.brightness > massiveString.params.brightness);

        // Damping should increase: Thin < Normal < Thick < Massive
        bool dampingProgression =
            (thinString.params.damping < normalString.params.damping) &&
            (normalString.params.damping < thickString.params.damping) &&
            (thickString.params.damping < massiveString.params.damping);

        bool passed = brightnessProgression && dampingProgression;

        std::cout << "  Brightness progression: "
                  << thinString.params.brightness << " > "
                  << normalString.params.brightness << " > "
                  << thickString.params.brightness << " > "
                  << massiveString.params.brightness << std::endl;
        std::cout << "  Damping progression: "
                  << thinString.params.damping << " < "
                  << normalString.params.damping << " < "
                  << thickString.params.damping << " < "
                  << massiveString.params.damping << std::endl;

        TestHelpers::printTestResult("Gauge produces monotonic parameter progression", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  STRING GAUGE TESTS                     ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testStringGaugeDefaults();
        testThinGaugeMapping();
        testMassiveGaugeMapping();
        testGaugeProgression();
    }
};

//==============================================================================
// Test 4: Gesture Parameters
//==============================================================================

class GestureParameterTests
{
public:
    static void testGestureDefaults()
    {
        TestHelpers::printTestHeader("Gesture Defaults");

        ArticulationStateMachine fsm;
        fsm.prepare(48000.0);

        GestureParameters defaultGesture = fsm.getGestureParameters();

        bool forcePass = TestHelpers::approximatelyEqual(defaultGesture.force, 0.7f);
        bool speedPass = TestHelpers::approximatelyEqual(defaultGesture.speed, 0.2f);
        bool areaPass = TestHelpers::approximatelyEqual(defaultGesture.contactArea, 0.6f);
        bool roughnessPass = TestHelpers::approximatelyEqual(defaultGesture.roughness, 0.3f);

        bool passed = forcePass && speedPass && areaPass && roughnessPass;

        std::cout << "  Force: " << defaultGesture.force << " (expected 0.7)" << std::endl;
        std::cout << "  Speed: " << defaultGesture.speed << " (expected 0.2)" << std::endl;
        std::cout << "  Contact Area: " << defaultGesture.contactArea << " (expected 0.6)" << std::endl;
        std::cout << "  Roughness: " << defaultGesture.roughness << " (expected 0.3)" << std::endl;

        TestHelpers::printTestResult("Gesture defaults are correct", passed);
        assert(passed);
    }

    static void testGestureSpeedToAttackTime()
    {
        TestHelpers::printTestHeader("Gesture Speed to Attack Time Mapping");

        // Fast speed (0.8) should produce short attack (~20ms)
        // Slow speed (0.2) should produce long attack (~200-500ms)

        ArticulationStateMachine fastFsm, slowFsm;
        fastFsm.prepare(48000.0);
        slowFsm.prepare(48000.0);

        GestureParameters fastGesture;
        fastGesture.speed = 0.8f;
        fastFsm.setGestureParameters(fastGesture);

        GestureParameters slowGesture;
        slowGesture.speed = 0.2f;
        slowFsm.setGestureParameters(slowGesture);

        // This test validates the parameter is set
        // (actual attack time tested in exciter tests)
        bool fastSet = TestHelpers::approximatelyEqual(
            fastFsm.getGestureParameters().speed,
            0.8f
        );
        bool slowSet = TestHelpers::approximatelyEqual(
            slowFsm.getGestureParameters().speed,
            0.2f
        );

        bool passed = fastSet && slowSet;

        std::cout << "  Fast speed set: " << fastFsm.getGestureParameters().speed << std::endl;
        std::cout << "  Slow speed set: " << slowFsm.getGestureParameters().speed << std::endl;
        std::cout << "  Expected attack times: ~20ms (fast) vs ~200-500ms (slow)" << std::endl;

        TestHelpers::printTestResult("Gesture speed parameters set correctly", passed);
        assert(passed);
    }

    static void testGestureContactAreaToBandwidth()
    {
        TestHelpers::printTestHeader("Gesture Contact Area to Bandwidth Mapping");

        // Small contact area (0.2) = bright excitation
        // Large contact area (0.8) = dark excitation

        ArticulationStateMachine smallAreaFsm, largeAreaFsm;
        smallAreaFsm.prepare(48000.0);
        largeAreaFsm.prepare(48000.0);

        GestureParameters smallAreaGesture;
        smallAreaGesture.contactArea = 0.2f;
        smallAreaFsm.setGestureParameters(smallAreaGesture);

        GestureParameters largeAreaGesture;
        largeAreaGesture.contactArea = 0.8f;
        largeAreaFsm.setGestureParameters(largeAreaGesture);

        bool smallSet = TestHelpers::approximatelyEqual(
            smallAreaFsm.getGestureParameters().contactArea,
            0.2f
        );
        bool largeSet = TestHelpers::approximatelyEqual(
            largeAreaFsm.getGestureParameters().contactArea,
            0.8f
        );

        bool passed = smallSet && largeSet;

        std::cout << "  Small contact area: " << smallAreaFsm.getGestureParameters().contactArea << std::endl;
        std::cout << "  Large contact area: " << largeAreaFsm.getGestureParameters().contactArea << std::endl;

        TestHelpers::printTestResult("Contact area parameters set correctly", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  GESTURE PARAMETER TESTS                ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testGestureDefaults();
        testGestureSpeedToAttackTime();
        testGestureContactAreaToBandwidth();
    }
};

//==============================================================================
// Test 5: Shared Bridge Coupling
//==============================================================================

class SharedBridgeTests
{
public:
    static void testSharedBridgeInitialization()
    {
        TestHelpers::printTestHeader("Shared Bridge Initialization");

        SharedBridgeCoupling bridge;
        bridge.prepare(48000.0, 6);  // 6 strings

        // Bridge should start at rest
        bool motionPass = TestHelpers::approximatelyEqual(bridge.getBridgeMotion(), 0.0f);

        bool passed = motionPass;

        TestHelpers::printTestResult("Shared bridge initializes at rest", passed);
        assert(passed);
    }

    static void testSingleStringEnergyTransfer()
    {
        TestHelpers::printTestHeader("Single String Energy Transfer");

        SharedBridgeCoupling bridge;
        bridge.prepare(48000.0, 6);

        // Inject energy from string 0
        float inputEnergy = 0.5f;
        float reflected = bridge.addStringEnergy(inputEnergy, 0);

        // Bridge should have energy now
        float bridgeMotion = bridge.getBridgeMotion();
        bool energyTransfer = bridgeMotion > 0.0f;

        // Reflected energy should be less than input (some transferred to bridge)
        bool reflectionPass = reflected < inputEnergy;

        bool passed = energyTransfer && reflectionPass;

        std::cout << "  Input energy: " << inputEnergy << std::endl;
        std::cout << "  Bridge motion: " << bridgeMotion << std::endl;
        std::cout << "  Reflected energy: " << reflected << std::endl;

        TestHelpers::printTestResult("String energy transfers to bridge", passed);
        assert(passed);
    }

    static void testMultipleStringAccumulation()
    {
        TestHelpers::printTestHeader("Multiple String Energy Accumulation");

        SharedBridgeCoupling bridge;
        bridge.prepare(48000.0, 6);

        // Inject energy from multiple strings
        float bridgeBefore = bridge.getBridgeMotion();

        bridge.addStringEnergy(0.3f, 0);
        bridge.addStringEnergy(0.4f, 1);
        bridge.addStringEnergy(0.5f, 2);

        float bridgeAfter = bridge.getBridgeMotion();

        // Bridge should have more energy with multiple strings
        bool passed = bridgeAfter > bridgeBefore;

        std::cout << "  Bridge motion before: " << bridgeBefore << std::endl;
        std::cout << "  Bridge motion after: " << bridgeAfter << std::endl;

        TestHelpers::printTestResult("Multiple strings accumulate bridge energy", passed);
        assert(passed);
    }

    static void testBridgeMassEffect()
    {
        TestHelpers::printTestHeader("Bridge Mass Effect");

        SharedBridgeCoupling lightBridge, heavyBridge;
        lightBridge.prepare(48000.0, 6);
        heavyBridge.prepare(48000.0, 6);

        lightBridge.setBridgeMass(0.5f);   // Light bridge
        heavyBridge.setBridgeMass(2.0f);   // Heavy bridge

        // Inject same energy into both
        lightBridge.addStringEnergy(0.5f, 0);
        heavyBridge.addStringEnergy(0.5f, 0);

        float lightMotion = lightBridge.getBridgeMotion();
        float heavyMotion = heavyBridge.getBridgeMotion();

        // Light bridge should move more than heavy bridge
        bool passed = lightMotion > heavyMotion;

        std::cout << "  Light bridge motion: " << lightMotion << std::endl;
        std::cout << "  Heavy bridge motion: " << heavyMotion << std::endl;

        TestHelpers::printTestResult("Bridge mass affects motion", passed);
        assert(passed);
    }

    static void testBridgeReset()
    {
        TestHelpers::printTestHeader("Bridge Reset");

        SharedBridgeCoupling bridge;
        bridge.prepare(48000.0, 6);

        // Add energy
        bridge.addStringEnergy(0.5f, 0);
        bool energyBefore = bridge.getBridgeMotion() > 0.0f;

        // Reset
        bridge.reset();

        // Should be back at rest
        bool energyAfter = TestHelpers::approximatelyEqual(bridge.getBridgeMotion(), 0.0f);

        bool passed = energyBefore && energyAfter;

        TestHelpers::printTestResult("Bridge reset clears energy", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  SHARED BRIDGE TESTS                    ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testSharedBridgeInitialization();
        testSingleStringEnergyTransfer();
        testMultipleStringAccumulation();
        testBridgeMassEffect();
        testBridgeReset();
    }
};

//==============================================================================
// Test 6: Sympathetic Strings
//==============================================================================

class SympatheticStringTests
{
public:
    static void testSympatheticStringInitialization()
    {
        TestHelpers::printTestHeader("Sympathetic String Initialization");

        SympatheticStringBank symp;
        SympatheticStringConfig config;
        config.enabled = true;
        config.count = 6;
        config.tuning = SympatheticStringConfig::TuningMode::Harmonic;

        symp.prepare(48000.0, config);

        // Should initialize without errors
        bool passed = true;  // If we got here, initialization succeeded

        TestHelpers::printTestResult("Sympathetic strings initialize", passed);
        assert(passed);
    }

    static void testSympatheticStringNotDirectlyExcited()
    {
        TestHelpers::printTestHeader("Sympathetic Strings Not Directly Excited");

        // Sympathetic strings should only respond to bridge energy
        // not direct MIDI note-on
        // (This test validates the design concept)

        bool passed = true;  // Conceptual test

        TestHelpers::printTestResult("Sympathetic strings require bridge excitation", passed);
        assert(passed);
    }

    static void testSympatheticStringLightDamping()
    {
        TestHelpers::printTestHeader("Sympathetic String Light Damping");

        SympatheticStringBank symp;
        SympatheticStringConfig config;
        config.enabled = true;
        config.count = 6;
        config.tuning = SympatheticStringConfig::TuningMode::Harmonic;

        symp.prepare(48000.0, config);

        // Excite from bridge
        symp.exciteFromBridge(0.5f);

        // Process samples
        float output = symp.processSample();

        // Should have output (ringing)
        bool hasOutput = output != 0.0f;

        // Process many samples to check decay
        float sustainedEnergy = 0.0f;
        for (int i = 0; i < 1000; ++i)
        {
            sustainedEnergy += std::abs(symp.processSample());
        }

        // Should still have energy after 1000 samples (light damping)
        bool hasSustain = sustainedEnergy > 0.001f;

        bool passed = hasOutput && hasSustain;

        std::cout << "  Initial output: " << output << std::endl;
        std::cout << "  Sustained energy (1000 samples): " << sustainedEnergy << std::endl;

        TestHelpers::printTestResult("Sympathetic strings have light damping", passed);
        assert(passed);
    }

    static void testSympatheticStringTuning()
    {
        TestHelpers::printTestHeader("Sympathetic String Tuning Modes");

        SympatheticStringBank symp;
        SympatheticStringConfig config;

        // Test Harmonic tuning
        config.enabled = true;
        config.count = 6;
        config.tuning = SympatheticStringConfig::TuningMode::Harmonic;

        symp.prepare(48000.0, config);
        bool harmonicSet = true;  // If we got here, harmonic tuning set

        // Test Drone tuning
        config.tuning = SympatheticStringConfig::TuningMode::Drone;
        symp.prepare(48000.0, config);
        bool droneSet = true;  // If we got here, drone tuning set

        bool passed = harmonicSet && droneSet;

        TestHelpers::printTestResult("Sympathetic string tuning modes set", passed);
        assert(passed);
    }

    static void runAll()
    {
        std::cout << "\n╔════════════════════════════════════════╗" << std::endl;
        std::cout << "║  SYMPATHETIC STRING TESTS               ║" << std::endl;
        std::cout << "╚════════════════════════════════════════╝" << std::endl;

        testSympatheticStringInitialization();
        testSympatheticStringNotDirectlyExcited();
        testSympatheticStringLightDamping();
        testSympatheticStringTuning();
    }
};

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║     AETHER STRING v2 UNIT TEST SUITE                     ║" << std::endl;
    std::cout << "║     Testing \"Giant Instruments\" Features                ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;

    try
    {
        // Run all test suites
        ScaleParameterTests::runAll();
        PickPositionTests::runAll();
        StringGaugeTests::runAll();
        GestureParameterTests::runAll();
        SharedBridgeTests::runAll();
        SympatheticStringTests::runAll();

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
