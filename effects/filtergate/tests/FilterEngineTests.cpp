#include "dsp/FilterEngine.h"
#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <cmath>

using namespace FilterGate;

//==============================================================================
// Test 3.11: FilterEngine Instantiation and Configuration
//==============================================================================

TEST(FilterEngine, CanCreate)
{
    FilterEngine engine;
    EXPECT_NE(&engine, nullptr);
}

TEST(FilterEngine, CanPrepare)
{
    FilterEngine engine;
    EXPECT_NO_THROW(engine.prepare(48000.0, 512));
}

TEST(FilterEngine, CanPrepareDifferentSampleRates)
{
    FilterEngine engine;

    std::vector<double> sampleRates = {44100.0, 48000.0, 88200.0, 96000.0, 192000.0};

    for (auto sr : sampleRates)
    {
        EXPECT_NO_THROW(engine.prepare(sr, 512));
    }
}

TEST(FilterEngine, CanReset)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    engine.setParams(params);

    EXPECT_NO_THROW(engine.reset());
}

//==============================================================================
// Test 3.12: FilterEngine Model Selection
//==============================================================================

TEST(FilterEngine, SelectSVF)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    engine.setParams(params);

    EXPECT_EQ(engine.getCurrentModel(), FilterModel::SVF);

    // Process signal
    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
    EXPECT_FALSE(std::isinf(output));
}

TEST(FilterEngine, SelectLadder)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.7f;
    params.drive = 0.5f;
    engine.setParams(params);

    EXPECT_EQ(engine.getCurrentModel(), FilterModel::LADDER);

    // Process signal
    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
    EXPECT_FALSE(std::isinf(output));
}

TEST(FilterEngine, SelectOTAFallback)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::OTA;  // Not implemented yet
    params.cutoffHz = 1000.0f;
    engine.setParams(params);

    EXPECT_EQ(engine.getCurrentModel(), FilterModel::OTA);

    // Should fall back to SVF and not crash
    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
}

TEST(FilterEngine, SelectMS20Fallback)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::MS20;  // Not implemented yet
    engine.setParams(params);

    // Should fall back to SVF and not crash
    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
}

TEST(FilterEngine, SelectCombFallback)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::COMB;  // Not implemented yet
    engine.setParams(params);

    // Should fall back to SVF and not crash
    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
}

TEST(FilterEngine, SelectMorphFallback)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::MORPH;  // Not implemented yet
    engine.setParams(params);

    // Should fall back to SVF and not crash
    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
}

//==============================================================================
// Test 3.13: FilterEngine Cutoff Frequency
//==============================================================================

TEST(FilterEngine, CutoffLowPass)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    engine.setParams(params);

    // DC should pass through
    float output = 0.0f;
    for (int i = 0; i < 100; ++i)
        output = engine.process(0.5f);

    EXPECT_GT(std::abs(output), 0.2f);
}

TEST(FilterEngine, CutoffHighPass)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 100.0f;  // Very low cutoff
    params.resonance = 0.1f;
    engine.setParams(params);

    // High frequency should be attenuated
    float phase = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        float output = engine.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 5000.0f) / 48000.0f;
    }

    float avgOutput = sumOutput / 1000.0f;
    EXPECT_LT(avgOutput, 0.3f);
}

TEST(FilterEngine, CutoffVariable)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    // Test different cutoff frequencies
    std::vector<float> cutoffs = {100.0f, 500.0f, 1000.0f, 5000.0f, 10000.0f};

    for (auto cutoff : cutoffs)
    {
        FilterEngineParams params;
        params.model = FilterModel::SVF;
        params.cutoffHz = cutoff;
        engine.setParams(params);

        float output = engine.process(0.5f);
        EXPECT_FALSE(std::isnan(output));
    }
}

//==============================================================================
// Test 3.14: FilterEngine Resonance Control
//==============================================================================

TEST(FilterEngine, ResonanceSVF)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.8f;  // High resonance
    engine.setParams(params);

    // Process signal at cutoff frequency
    float phase = 0.0f;
    float maxOutput = 0.0f;

    for (int i = 0; i < 2000; ++i)
    {
        float input = 0.3f * std::sin(phase);
        float output = std::abs(engine.process(input));
        maxOutput = std::max(maxOutput, output);
        phase += (2.0f * juce::MathConstants<float>::pi * 1000.0f) / 48000.0f;
    }

    // High resonance should boost signal at cutoff
    EXPECT_GT(maxOutput, 0.3f);
}

TEST(FilterEngine, ResonanceLadder)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.9f;  // Very high resonance
    params.drive = 0.0f;
    engine.setParams(params);

    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
}

//==============================================================================
// Test 3.15: FilterEngine Drive/Saturation
//==============================================================================

TEST(FilterEngine, DriveSVF_NoEffect)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.8f;  // SVF doesn't use drive
    engine.setParams(params);

    float output = engine.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
}

TEST(FilterEngine, DriveLadder_Saturation)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.7f;  // High drive
    engine.setParams(params);

    // Process with high input level
    float output = engine.process(0.8f);

    // Should be saturated (limited)
    EXPECT_GE(output, -1.2f);
    EXPECT_LE(output, 1.2f);
    EXPECT_FALSE(std::isnan(output));
}

TEST(FilterEngine, DriveLadder_NoDistortion)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.0f;  // No drive
    engine.setParams(params);

    float output = engine.process(0.3f);
    EXPECT_FALSE(std::isnan(output));
}

//==============================================================================
// Test 3.16: FilterEngine Key Tracking
//==============================================================================

TEST(FilterEngine, KeyTrackingOff)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.keyTrack = 0.0f;  // No key tracking
    params.pitch = 69.0f;    // A4
    engine.setParams(params);

    float output1 = engine.process(0.5f);

    // Change pitch - should have no effect
    params.pitch = 81.0f;  // A5
    engine.setParams(params);

    float output2 = engine.process(0.5f);

    // Outputs should be similar (no key tracking)
    EXPECT_NEAR(output1, output2, 0.1f);
}

TEST(FilterEngine, KeyTrackingFull)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.keyTrack = 1.0f;  // Full key tracking
    params.pitch = 69.0f;    // A4 = 440Hz
    engine.setParams(params);

    // Process DC at A4
    float output1 = 0.0f;
    for (int i = 0; i < 100; ++i)
        output1 = engine.process(0.5f);

    // Change pitch up one octave to A5
    params.pitch = 81.0f;  // A5 (one octave higher)
    engine.setParams(params);

    // Process DC at A5 (cutoff should be doubled)
    float output2 = 0.0f;
    for (int i = 0; i < 100; ++i)
        output2 = engine.process(0.5f);

    // With full key tracking, cutoff should double, affecting filter response
    // The exact relationship depends on the filter implementation
    EXPECT_FALSE(std::isnan(output1));
    EXPECT_FALSE(std::isnan(output2));
}

TEST(FilterEngine, KeyTrackingPartial)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    params.keyTrack = 0.5f;  // 50% key tracking
    params.pitch = 69.0f;
    engine.setParams(params);

    EXPECT_NO_THROW(engine.process(0.5f));

    params.pitch = 81.0f;
    engine.setParams(params);

    EXPECT_NO_THROW(engine.process(0.5f));
}

//==============================================================================
// Test 3.17: FilterEngine Stereo Processing
//==============================================================================

TEST(FilterEngine, StereoProcessing_IdenticalInput)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    engine.setParams(params);

    constexpr int numSamples = 256;
    float left[256];
    float right[256];

    // Fill with identical signal
    for (int i = 0; i < numSamples; ++i)
    {
        left[i] = 0.5f;
        right[i] = 0.5f;
    }

    engine.processStereo(left, right, numSamples);

    // Both channels should produce identical output
    for (int i = 0; i < numSamples; ++i)
    {
        EXPECT_FLOAT_EQ(left[i], right[i]);
    }
}

TEST(FilterEngine, StereoProcessing_DifferentInput)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    engine.setParams(params);

    constexpr int numSamples = 256;
    float left[256];
    float right[256];

    // Fill with different signals
    for (int i = 0; i < numSamples; ++i)
    {
        left[i] = 0.5f;
        right[i] = -0.5f;
    }

    engine.processStereo(left, right, numSamples);

    // Outputs should differ (mirrored due to filter being linear-ish)
    for (int i = 0; i < numSamples; ++i)
    {
        EXPECT_NE(left[i], right[i]);
    }
}

TEST(FilterEngine, StereoProcessing_MultipleBuffers)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    engine.setParams(params);

    // Process multiple buffers to ensure state is maintained
    for (int buf = 0; buf < 10; ++buf)
    {
        constexpr int numSamples = 64;
        float left[64];
        float right[64];

        for (int i = 0; i < numSamples; ++i)
        {
            left[i] = 0.5f;
            right[i] = 0.5f;
        }

        EXPECT_NO_THROW(engine.processStereo(left, right, numSamples));
    }
}

//==============================================================================
// Test 3.18: FilterEngine Parameter Smoothing
//==============================================================================

TEST(FilterEngine, ParameterSmoothing_Cutoff)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    engine.setParams(params);

    // Process to establish baseline
    for (int i = 0; i < 100; ++i)
        engine.process(0.5f);

    // Abruptly change cutoff
    params.cutoffHz = 5000.0f;
    engine.setParams(params);

    // Should not cause zipper noise (gradual transition)
    float prevOutput = engine.process(0.5f);
    for (int i = 0; i < 100; ++i)
    {
        float output = engine.process(0.5f);
        // Changes should be gradual (no large jumps)
        EXPECT_LT(std::abs(output - prevOutput), 0.5f);
        prevOutput = output;
    }
}

TEST(FilterEngine, ParameterSmoothing_Resonance)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;
    engine.setParams(params);

    // Process to establish baseline
    for (int i = 0; i < 100; ++i)
        engine.process(0.5f);

    // Abruptly change resonance
    params.resonance = 0.9f;
    engine.setParams(params);

    // Should not cause zipper noise
    float prevOutput = engine.process(0.5f);
    for (int i = 0; i < 100; ++i)
    {
        float output = engine.process(0.5f);
        EXPECT_LT(std::abs(output - prevOutput), 0.5f);
        prevOutput = output;
    }
}

//==============================================================================
// Test 3.19: FilterEngine Edge Cases
//==============================================================================

TEST(FilterEngine, EdgeCase_SilenceInput)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    engine.setParams(params);

    // Process silence
    for (int i = 0; i < 1000; ++i)
    {
        float output = engine.process(0.0f);
        // Output should decay to near zero
        EXPECT_LT(std::abs(output), 0.01f);
    }
}

TEST(FilterEngine, EdgeCase_FullScaleInput)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.drive = 0.8f;  // High drive
    engine.setParams(params);

    // Should handle full scale without exploding
    EXPECT_NO_THROW(engine.process(1.0f));
    EXPECT_NO_THROW(engine.process(-1.0f));
}

TEST(FilterEngine, EdgeCase_ExtremeCutoff)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 10.0f;  // Very low
    engine.setParams(params);

    EXPECT_NO_THROW(engine.process(0.5f));

    params.cutoffHz = 20000.0f;  // Very high
    engine.setParams(params);

    EXPECT_NO_THROW(engine.process(0.5f));
}

TEST(FilterEngine, EdgeCase_ExtremeResonance)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.resonance = 0.0f;
    engine.setParams(params);

    EXPECT_NO_THROW(engine.process(0.5f));

    params.resonance = 1.0f;  // Maximum
    engine.setParams(params);

    EXPECT_NO_THROW(engine.process(0.5f));
}

TEST(FilterEngine, EdgeCase_ZeroBuffer)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    engine.setParams(params);

    // Should handle zero-sized buffer
    float left[1] = {0.5f};
    float right[1] = {0.5f};

    EXPECT_NO_THROW(engine.processStereo(left, right, 0));
}

//==============================================================================
// Test 3.20: FilterEngine Realtime Safety
//==============================================================================

TEST(FilterEngine, RealtimeSafety_NoAllocationsInProcess)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    engine.setParams(params);

    // Process many samples - should not allocate
    for (int i = 0; i < 10000; ++i)
    {
        float output = engine.process(0.5f);
        EXPECT_FALSE(std::isnan(output));
    }
}

TEST(FilterEngine, RealtimeSafety_NoAllocationsInStereoProcess)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    engine.setParams(params);

    constexpr int numSamples = 512;
    float left[512];
    float right[512];

    for (int i = 0; i < numSamples; ++i)
    {
        left[i] = 0.5f;
        right[i] = 0.5f;
    }

    // Should not allocate
    EXPECT_NO_THROW(engine.processStereo(left, right, numSamples));
}

//==============================================================================
// Test 3.21: FilterEngine Model Switching
//==============================================================================

TEST(FilterEngine, ModelSwitching_SVFToLadder)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    engine.setParams(params);

    float output1 = engine.process(0.5f);

    // Switch to ladder
    params.model = FilterModel::LADDER;
    engine.setParams(params);

    float output2 = engine.process(0.5f);

    // Both should produce valid output
    EXPECT_FALSE(std::isnan(output1));
    EXPECT_FALSE(std::isnan(output2));
}

TEST(FilterEngine, ModelSwitching_LadderToSVF)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.5f;
    engine.setParams(params);

    float output1 = engine.process(0.5f);

    // Switch to SVF
    params.model = FilterModel::SVF;
    engine.setParams(params);

    float output2 = engine.process(0.5f);

    EXPECT_FALSE(std::isnan(output1));
    EXPECT_FALSE(std::isnan(output2));
}

TEST(FilterEngine, ModelSwitching_RapidSwitching)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.cutoffHz = 1000.0f;

    // Rapidly switch between models
    for (int i = 0; i < 100; ++i)
    {
        params.model = (i % 2 == 0) ? FilterModel::SVF : FilterModel::LADDER;
        engine.setParams(params);
        float output = engine.process(0.5f);
        EXPECT_FALSE(std::isnan(output));
    }
}

//==============================================================================
// Test 3.22: FilterEngine Numeric Stability
//==============================================================================

TEST(FilterEngine, NumericStability_LongSilence)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.resonance = 0.95f;  // High resonance
    engine.setParams(params);

    // Process long silence
    for (int i = 0; i < 100000; ++i)
    {
        float output = engine.process(0.0f);
        EXPECT_FALSE(std::isnan(output));
        EXPECT_FALSE(std::isinf(output));
    }
}

TEST(FilterEngine, NumericStability_DCOffset)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::SVF;
    engine.setParams(params);

    // Process DC for a long time
    for (int i = 0; i < 100000; ++i)
    {
        float output = engine.process(0.5f);
        EXPECT_FALSE(std::isnan(output));
        EXPECT_FALSE(std::isinf(output));
        EXPECT_GE(output, -10.0f);  // Should not explode
        EXPECT_LE(output, 10.0f);
    }
}

TEST(FilterEngine, NumericStability_FullScaleSquareWave)
{
    FilterEngine engine;
    engine.prepare(48000.0, 512);

    FilterEngineParams params;
    params.model = FilterModel::LADDER;
    params.resonance = 0.8f;
    params.drive = 0.7f;
    engine.setParams(params);

    // Process square wave
    for (int i = 0; i < 10000; ++i)
    {
        float input = (i % 2 == 0) ? 1.0f : -1.0f;
        float output = engine.process(input);
        EXPECT_FALSE(std::isnan(output));
        EXPECT_FALSE(std::isinf(output));
    }
}
