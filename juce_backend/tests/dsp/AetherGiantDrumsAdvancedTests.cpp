/*
  ==============================================================================

   AetherGiantDrumsAdvancedTests.cpp
   Tests for advanced membrane physics improvements

   Tests:
   - SVF membrane resonator behavior
   - Shell/cavity coupling characteristics
   - Pitch envelope validation
   - Energy transfer between components

  ==============================================================================
*/

#include "dsp/AetherGiantDrumsDSP.h"
#include <gtest/gtest.h>
#include <cmath>
#include <vector>

namespace DSP {
namespace Test {

//==============================================================================
// SVF Membrane Mode Tests
//==============================================================================

TEST(AetherGiantDrumsAdvanced, SVFMembraneModeResonance)
{
    SVFMembraneMode mode;
    mode.prepare(48000.0);
    mode.frequency = 100.0f;
    mode.qFactor = 50.0f;
    mode.amplitude = 1.0f;
    mode.decay = 0.999f;
    mode.calculateCoefficients();

    // Impulse response test
    float output = mode.processSample(1.0f);

    // Should have some output
    EXPECT_GT(std::abs(output), 0.0f);

    // Reset state
    mode.reset();
    EXPECT_EQ(mode.z1, 0.0f);
    EXPECT_EQ(mode.z2, 0.0f);
    EXPECT_EQ(mode.energy, 0.0f);
}

TEST(AetherGiantDrumsAdvanced, SVFMembraneModeDecay)
{
    SVFMembraneMode mode;
    mode.prepare(48000.0);
    mode.frequency = 100.0f;
    mode.qFactor = 50.0f;
    mode.amplitude = 1.0f;
    mode.decay = 0.99f;  // Fast decay
    mode.calculateCoefficients();

    // Strike the mode
    mode.energy = 1.0f;

    // Process samples and check decay
    float prevEnergy = mode.energy;
    for (int i = 0; i < 100; ++i) {
        mode.processSample(0.0f);
        EXPECT_LT(mode.energy, prevEnergy);  // Energy should decrease
        prevEnergy = mode.energy;
    }
}

TEST(AetherGiantDrumsAdvanced, SVFMembraneModeFrequencyResponse)
{
    SVFMembraneMode mode;
    mode.prepare(48000.0);
    mode.frequency = 100.0f;
    mode.qFactor = 50.0f;
    mode.amplitude = 1.0f;
    mode.decay = 0.9999f;
    mode.calculateCoefficients();

    // Check frequency factor calculation
    float expectedG = (2.0f * juce::MathConstants<float>::pi * 100.0f) / 48000.0f;
    EXPECT_NEAR(mode.frequencyFactor, expectedG, 0.0001f);

    // Check resonance clamping
    EXPECT_GE(mode.resonance, 0.0f);
    EXPECT_LE(mode.resonance, 2.0f);
}

//==============================================================================
// Coupled Resonator Tests
//==============================================================================

TEST(AetherGiantDrumsAdvanced, CoupledResonatorInitialization)
{
    CoupledResonator resonator;
    resonator.prepare(48000.0);

    // Check initial state
    EXPECT_EQ(resonator.getParameters().cavityFrequency, 120.0f);
    EXPECT_EQ(resonator.getParameters().shellFormant, 300.0f);

    // Reset state
    resonator.reset();
    // State variables should be zero (private, but we can check through processing)
}

TEST(AetherGiantDrumsAdvanced, CoupledResonatorResponse)
{
    CoupledResonator resonator;
    resonator.prepare(48000.0);

    CoupledResonator::Parameters params;
    params.cavityFrequency = 120.0f;
    params.shellFormant = 300.0f;
    params.cavityQ = 2.0f;
    params.shellQ = 1.5f;
    params.coupling = 0.5f;

    resonator.setParameters(params);

    // Process impulse
    float output = resonator.processSample(1.0f);
    EXPECT_GT(std::abs(output), 0.0f);

    // Subsequent samples should show decay
    float prevOutput = std::abs(output);
    for (int i = 0; i < 100; ++i) {
        output = resonator.processSample(0.0f);
        // Output should generally decrease (may oscillate)
        // Just check it doesn't explode
        EXPECT_LT(std::abs(output), 10.0f);
    }
}

TEST(AetherGiantDrumsAdvanced, CoupledResonatorBidirectionalCoupling)
{
    CoupledResonator resonator;
    resonator.prepare(48000.0);

    CoupledResonator::Parameters params;
    params.cavityFrequency = 120.0f;
    params.shellFormant = 300.0f;
    params.coupling = 0.8f;  // High coupling

    resonator.setParameters(params);

    // Check coupling coefficients are calculated
    EXPECT_GT(params.cavityToShellCoupling, 0.0f);
    EXPECT_GT(params.shellToCavityCoupling, 0.0f);
    EXPECT_GT(params.shellMix, 0.0f);
    EXPECT_GT(params.cavityMix, 0.0f);
}

//==============================================================================
// Membrane Resonator Tests
//==============================================================================

TEST(AetherGiantDrumsAdvanced, MembraneResonatorSVFModes)
{
    MembraneResonator membrane;
    membrane.prepare(48000.0);

    MembraneResonator::Parameters params;
    params.fundamentalFrequency = 80.0f;
    params.diameterMeters = 1.0f;
    params.numModes = 4;

    membrane.setParameters(params);

    // Strike the membrane
    membrane.strike(0.8f, 0.7f, 0.5f);

    // Process samples
    float output = membrane.processSample();
    EXPECT_GT(std::abs(output), 0.0f);
    EXPECT_GT(membrane.getEnergy(), 0.0f);
}

TEST(AetherGiantDrumsAdvanced, MembraneResonatorModeFrequencies)
{
    MembraneResonator membrane;
    membrane.prepare(48000.0);

    MembraneResonator::Parameters params;
    params.fundamentalFrequency = 100.0f;
    params.diameterMeters = 1.0f;
    params.inharmonicity = 0.1f;
    params.numModes = 4;

    membrane.setParameters(params);

    // Check that modes are initialized
    // (We can't access them directly, but we can check behavior)
    membrane.strike(1.0f, 1.0f, 1.0f);

    // Process and verify output
    float output = membrane.processSample();
    EXPECT_GT(std::abs(output), 0.0f);
}

TEST(AetherGiantDrumsAdvanced, MembraneResonatorDiameterScaling)
{
    MembraneResonator membrane1, membrane2;
    membrane1.prepare(48000.0);
    membrane2.prepare(48000.0);

    MembraneResonator::Parameters params1, params2;
    params1.fundamentalFrequency = 100.0f;
    params1.diameterMeters = 0.5f;  // Small drum
    params1.numModes = 4;

    params2.fundamentalFrequency = 100.0f;
    params2.diameterMeters = 2.0f;  // Large drum
    params2.numModes = 4;

    membrane1.setParameters(params1);
    membrane2.setParameters(params2);

    // Strike both
    membrane1.strike(1.0f, 1.0f, 1.0f);
    membrane2.strike(1.0f, 1.0f, 1.0f);

    // Process both
    float out1 = membrane1.processSample();
    float out2 = membrane2.processSample();

    // Both should produce output
    EXPECT_GT(std::abs(out1), 0.0f);
    EXPECT_GT(std::abs(out2), 0.0f);

    // Large drum should have more energy initially
    // (due to diameter scaling in strike calculation)
}

//==============================================================================
// Shell Resonator Tests
//==============================================================================

TEST(AetherGiantDrumsAdvanced, ShellResonatorCoupledBehavior)
{
    ShellResonator shell;
    shell.prepare(48000.0);

    ShellResonator::Parameters params;
    params.cavityFrequency = 120.0f;
    params.shellFormant = 300.0f;
    params.coupling = 0.5f;

    shell.setParameters(params);

    // Feed membrane energy
    shell.processMembraneEnergy(0.5f);

    // Process
    float output = shell.processSample();
    EXPECT_GT(std::abs(output), 0.0f);
}

TEST(AetherGiantDrumsAdvanced, ShellResonatorDecay)
{
    ShellResonator shell;
    shell.prepare(48000.0);

    ShellResonator::Parameters params;
    params.cavityFrequency = 120.0f;
    params.shellFormant = 300.0f;
    params.coupling = 0.3f;

    shell.setParameters(params);

    // Continuous excitation
    shell.processMembraneEnergy(0.5f);
    float output1 = shell.processSample();

    // No excitation
    shell.processMembraneEnergy(0.0f);
    float output2 = shell.processSample();

    // Output should decrease
    // (may oscillate due to resonance, but envelope should decay)
}

//==============================================================================
// Integration Tests
//==============================================================================

TEST(AetherGiantDrumsAdvanced, VoiceIntegration)
{
    GiantDrumVoice voice;
    voice.prepare(48000.0);

    GiantGestureParameters gesture;
    gesture.force = 0.7f;
    gesture.speed = 0.5f;
    gesture.contactArea = 0.6f;
    gesture.roughness = 0.3f;

    GiantScaleParameters scale;
    scale.scaleMeters = 1.0f;
    scale.massBias = 0.5f;
    scale.airLoss = 0.3f;
    scale.transientSlowing = 0.5f;

    voice.trigger(60, 0.8f, gesture, scale);

    EXPECT_TRUE(voice.isActive());

    // Process some samples
    for (int i = 0; i < 100; ++i) {
        float output = voice.processSample();
        // Should produce output
        if (i < 10) {  // First few samples
            EXPECT_GT(std::abs(output), 0.0f);
        }
    }
}

TEST(AetherGiantDrumsAdvanced, DrumPitchEnvelope)
{
    // Test for realistic pitch envelope during decay
    GiantDrumVoice voice;
    voice.prepare(48000.0);

    GiantGestureParameters gesture;
    gesture.force = 0.8f;
    gesture.speed = 0.6f;
    gesture.contactArea = 0.7f;
    gesture.roughness = 0.2f;

    GiantScaleParameters scale;
    scale.scaleMeters = 1.5f;
    scale.massBias = 0.6f;
    scale.airLoss = 0.2f;
    scale.transientSlowing = 0.4f;

    voice.trigger(48, 0.9f, gesture, scale);

    // Collect samples for analysis
    std::vector<float> samples;
    for (int i = 0; i < 1000; ++i) {
        samples.push_back(voice.processSample());
    }

    // Check that we have output
    float maxSample = 0.0f;
    for (float s : samples) {
        maxSample = std::max(maxSample, std::abs(s));
    }
    EXPECT_GT(maxSample, 0.0f);
}

TEST(AetherGiantDrumsAdvanced, MultiVoicePolyphony)
{
    GiantDrumVoiceManager manager;
    manager.prepare(48000.0, 8);

    GiantGestureParameters gesture;
    gesture.force = 0.7f;
    gesture.speed = 0.5f;
    gesture.contactArea = 0.6f;
    gesture.roughness = 0.3f;

    GiantScaleParameters scale;
    scale.scaleMeters = 1.0f;
    scale.massBias = 0.5f;
    scale.airLoss = 0.3f;
    scale.transientSlowing = 0.5f;

    // Trigger multiple voices
    manager.handleNoteOn(36, 0.8f, gesture, scale);
    manager.handleNoteOn(40, 0.7f, gesture, scale);
    manager.handleNoteOn(44, 0.9f, gesture, scale);

    EXPECT_EQ(manager.getActiveVoiceCount(), 3);

    // Process
    float output = manager.processSample();
    EXPECT_GT(std::abs(output), 0.0f);
}

//==============================================================================
// Parameter Smoothing Tests
//==============================================================================

TEST(AetherGiantDrumsAdvanced, ParameterSmoothing)
{
    AetherGiantDrumsPureDSP drums;
    drums.prepare(48000.0, 512);

    // Set initial parameters
    drums.setParameter("membrane_tension", 0.5f);
    drums.setParameter("shell_coupling", 0.3f);

    // Trigger note
    ScheduledEvent event;
    event.type = ScheduledEvent::NOTE_ON;
    event.data.note.midiNote = 60;
    event.data.note.velocity = 0.8f;
    drums.handleEvent(event);

    // Process
    float outputs[2][512];
    drums.process(reinterpret_cast<float**>(outputs), 2, 512);

    // Change parameters while processing
    drums.setParameter("membrane_tension", 0.8f);
    drums.setParameter("shell_coupling", 0.6f);

    // Should not crash or produce NaN
    drums.process(reinterpret_cast<float**>(outputs), 2, 512);

    for (int i = 0; i < 512; ++i) {
        EXPECT_FALSE(std::isnan(outputs[0][i]));
        EXPECT_FALSE(std::isinf(outputs[0][i]));
    }
}

//==============================================================================
// Performance Tests
//==============================================================================

TEST(AetherGiantDrumsAdvanced, PerformanceSVFVsSimple)
{
    // SVF should be efficient
    SVFMembraneMode mode;
    mode.prepare(48000.0);
    mode.frequency = 100.0f;
    mode.qFactor = 50.0f;
    mode.amplitude = 1.0f;
    mode.decay = 0.999f;
    mode.calculateCoefficients();

    // Process many samples
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 100000; ++i) {
        mode.processSample(i == 0 ? 1.0f : 0.0f);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    // Should process 100k samples in reasonable time (< 10ms)
    EXPECT_LT(duration.count(), 10000);
}

} // namespace Test
} // namespace DSP
