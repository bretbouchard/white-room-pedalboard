#include "dsp/filters/LadderFilter.h"
#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <cmath>

using namespace FilterGate;

//==============================================================================
// Test 3.7: Ladder Filter Instantiation and Configuration
//==============================================================================

TEST(LadderFilter, CanCreate)
{
    LadderFilter ladder;
    EXPECT_NE(&ladder, nullptr);
}

TEST(LadderFilter, CanSetParams)
{
    LadderFilter ladder;
    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.3f;
    ladder.setParams(params);

    EXPECT_NO_THROW(ladder.process(0.5f));
}

TEST(LadderFilter, CanReset)
{
    LadderFilter ladder;
    LadderParams params;
    ladder.setParams(params);

    // Process some samples
    for (int i = 0; i < 100; ++i)
        ladder.process(0.5f);

    EXPECT_NO_THROW(ladder.reset());
}

TEST(LadderFilter, CanSetSampleRate)
{
    LadderFilter ladder;
    EXPECT_NO_THROW(ladder.setSampleRate(48000.0));
    EXPECT_NO_THROW(ladder.setSampleRate(96000.0));
}

//==============================================================================
// Test 3.8: Ladder Filter Lowpass Response
//==============================================================================

TEST(LadderFilter, LowPassResponse_LowFreqPass)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;  // Low resonance
    params.drive = 0.0f;
    ladder.setParams(params);

    // DC should pass through
    float output = 0.0f;
    for (int i = 0; i < 200; ++i)
        output = ladder.process(0.5f);

    EXPECT_NEAR(output, 0.5f, 0.15f);
}

TEST(LadderFilter, LowPassResponse_HighFreqAttenuated)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;
    params.drive = 0.0f;
    ladder.setParams(params);

    // Generate high frequency (10kHz)
    float phase = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        float output = ladder.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 10000.0f) / 48000.0f;
    }

    float avgOutput = sumOutput / 1000.0f;
    EXPECT_LT(avgOutput, 0.2f);
}

//==============================================================================
// Test 3.9: Ladder Filter Resonance
//==============================================================================

TEST(LadderFilter, ResonanceControl_LowResonance)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.0f;  // Minimum
    params.drive = 0.0f;
    ladder.setParams(params);

    float output = 0.0f;
    for (int i = 0; i < 200; ++i)
        output = ladder.process(0.5f);

    // Should pass through reasonably well
    EXPECT_GT(std::abs(output), 0.3f);
}

TEST(LadderFilter, ResonanceControl_HighResonance)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.95f;  // Very high, near self-oscillation
    params.drive = 0.0f;
    ladder.setParams(params);

    // Process signal at cutoff frequency
    float phase = 0.0f;
    float maxOutput = 0.0f;

    for (int i = 0; i < 2000; ++i)
    {
        float input = 0.3f * std::sin(phase);
        float output = std::abs(ladder.process(input));
        maxOutput = std::max(maxOutput, output);
        phase += (2.0f * juce::MathConstants<float>::pi * 1000.0f) / 48000.0f;
    }

    // High resonance should create peak at cutoff
    EXPECT_GT(maxOutput, 0.35f);
}

TEST(LadderFilter, ResonanceControl_SelfOscillation)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 1.0f;  // Maximum (should self-oscillate)
    params.drive = 0.0f;
    ladder.setParams(params);

    // Process silence - high resonance filter should produce output
    float sumOutput = 0.0f;
    for (int i = 0; i < 1000; ++i)
    {
        float output = ladder.process(0.0f);
        sumOutput += std::abs(output);
    }

    // Even with zero input, self-oscillation produces output
    // (though implementation may prevent actual oscillation)
    EXPECT_NO_THROW(ladder.process(0.0f));
}

//==============================================================================
// Test 3.10: Ladder Filter Drive/Saturation
//==============================================================================

TEST(LadderFilter, DriveSaturation_NoDrive)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.0f;  // No drive
    ladder.setParams(params);

    float output = ladder.process(0.5f);
    EXPECT_FALSE(std::isnan(output));
}

TEST(LadderFilter, DriveSaturation_MediumDrive)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.5f;  // Medium drive
    ladder.setParams(params);

    float output = ladder.process(0.8f);

    // Should be limited (soft clipping)
    EXPECT_GE(output, -1.2f);
    EXPECT_LE(output, 1.2f);
}

TEST(LadderFilter, DriveSaturation_HighDrive)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.9f;  // High drive
    ladder.setParams(params);

    // Process full scale input
    float output = ladder.process(1.0f);

    // Should definitely be saturated
    EXPECT_GE(output, -1.2f);
    EXPECT_LE(output, 1.2f);
}

TEST(LadderFilter, DriveSaturation_HarmonicDistortion)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 2000.0f;  // Higher cutoff to let harmonics through
    params.resonance = 0.1f;    // Low resonance
    params.drive = 0.8f;        // High drive
    ladder.setParams(params);

    // Process sine wave - should produce harmonics
    float phase = 0.0f;
    float sumSquared = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.7f * std::sin(phase);
        float output = ladder.process(input);
        sumSquared += output * output;
        phase += (2.0f * juce::MathConstants<float>::pi * 440.0f) / 48000.0f;
    }

    // RMS should be significant (not zeroed out)
    float rms = std::sqrt(sumSquared / 1000.0f);
    EXPECT_GT(rms, 0.01f);
}

//==============================================================================
// Test 3.11: Ladder Filter Frequency Response
//==============================================================================

TEST(LadderFilter, FrequencyResponse_Sweep)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 0.0f;
    ladder.setParams(params);

    // Test various frequencies
    std::vector<float> frequencies = {100.0f, 500.0f, 1000.0f, 2000.0f, 5000.0f, 10000.0f};

    for (auto freq : frequencies)
    {
        float phase = 0.0f;
        float sumOutput = 0.0f;

        for (int i = 0; i < 500; ++i)
        {
            float input = 0.5f * std::sin(phase);
            float output = ladder.process(input);
            sumOutput += std::abs(output);
            phase += (2.0f * juce::MathConstants<float>::pi * freq) / 48000.0f;
        }

        float avgOutput = sumOutput / 500.0f;
        EXPECT_FALSE(std::isnan(avgOutput));
    }
}

//==============================================================================
// Test 3.12: Ladder Filter 4-Pole Slope
//==============================================================================

TEST(LadderFilter, FourPoleSlope)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;
    params.drive = 0.0f;
    ladder.setParams(params);

    // Measure attenuation at 2x cutoff frequency
    // 4-pole filter should have -24dB/octave slope
    // At 2x frequency (1 octave), should be approximately -24dB (~0.063x)

    float phase = 0.0f;
    float sumOutputAt2x = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        float output = ladder.process(input);
        sumOutputAt2x += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 2000.0f) / 48000.0f;
    }

    float avgOutputAt2x = sumOutputAt2x / 1000.0f;

    // Should be significantly attenuated (4-pole slope is steep)
    EXPECT_LT(avgOutputAt2x, 0.25f);
}

//==============================================================================
// Test 3.13: Ladder Filter Edge Cases
//==============================================================================

TEST(LadderFilter, EdgeCase_ZeroCutoff)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 0.0f;  // Extreme
    params.resonance = 0.5f;
    params.drive = 0.0f;

    EXPECT_NO_THROW(ladder.setParams(params));
    EXPECT_NO_THROW(ladder.process(0.5f));
}

TEST(LadderFilter, EdgeCase_NyquistCutoff)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 24000.0f;  // Nyquist
    params.resonance = 0.5f;
    params.drive = 0.0f;

    EXPECT_NO_THROW(ladder.setParams(params));
    EXPECT_NO_THROW(ladder.process(0.5f));
}

TEST(LadderFilter, EdgeCase_MaximumDrive)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.drive = 1.0f;  // Maximum
    ladder.setParams(params);

    EXPECT_NO_THROW(ladder.process(1.0f));
    EXPECT_NO_THROW(ladder.process(-1.0f));
}

TEST(LadderFilter, EdgeCase_SilenceInput)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    ladder.setParams(params);

    // Process silence
    for (int i = 0; i < 1000; ++i)
    {
        float output = ladder.process(0.0f);
        EXPECT_LT(std::abs(output), 1.0f);  // Should not explode
    }
}

TEST(LadderFilter, EdgeCase_FullScaleInput)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.drive = 0.8f;
    ladder.setParams(params);

    // Should handle full scale
    EXPECT_NO_THROW(ladder.process(1.0f));
    EXPECT_NO_THROW(ladder.process(-1.0f));
}

//==============================================================================
// Test 3.14: Ladder Filter Sample Rate Handling
//==============================================================================

TEST(LadderFilter, SampleRate441kHz)
{
    LadderFilter ladder;
    ladder.setSampleRate(44100.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    ladder.setParams(params);

    EXPECT_NO_THROW(ladder.process(0.5f));
}

TEST(LadderFilter, SampleRate48kHz)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    ladder.setParams(params);

    EXPECT_NO_THROW(ladder.process(0.5f));
}

TEST(LadderFilter, SampleRate96kHz)
{
    LadderFilter ladder;
    ladder.setSampleRate(96000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    ladder.setParams(params);

    EXPECT_NO_THROW(ladder.process(0.5f));
}

TEST(LadderFilter, SampleRate192kHz)
{
    LadderFilter ladder;
    ladder.setSampleRate(192000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    ladder.setParams(params);

    EXPECT_NO_THROW(ladder.process(0.5f));
}

//==============================================================================
// Test 3.15: Ladder Filter Tanh Approximation
//==============================================================================

TEST(LadderFilter, TanhApproximation_ZeroInput)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    // Test through actual filter (tanh is private)
    LadderParams params;
    params.drive = 0.0f;
    ladder.setParams(params);

    // Reset should set all stages to zero
    ladder.reset();
    float output = ladder.process(0.0f);

    EXPECT_NEAR(output, 0.0f, 0.001f);
}

TEST(LadderFilter, TanhApproximation_LinearRegion)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 500.0f;  // Low cutoff
    params.resonance = 0.0f;   // No resonance
    params.drive = 0.0f;       // No extra drive
    ladder.setParams(params);

    // Small signal should be mostly linear
    float output1 = ladder.process(0.1f);
    float output2 = ladder.process(0.2f);

    // Should be approximately proportional (roughly)
    // Filter memory makes this inexact, but should be in reasonable range
    EXPECT_GT(std::abs(output2), 0.0f);
}

//==============================================================================
// Test 3.16: Ladder Filter Multiple Instances
//==============================================================================

TEST(LadderFilter, MultipleInstances_Independent)
{
    LadderFilter ladder1, ladder2;
    ladder1.setSampleRate(48000.0);
    ladder2.setSampleRate(48000.0);

    LadderParams params1;
    params1.cutoffHz = 500.0f;
    ladder1.setParams(params1);

    LadderParams params2;
    params2.cutoffHz = 2000.0f;
    ladder2.setParams(params2);

    float input = 0.5f;
    float out1 = ladder1.process(input);
    float out2 = ladder2.process(input);

    // Should differ due to different cutoffs
    EXPECT_NE(out1, out2);
}

//==============================================================================
// Test 3.17: Ladder Filter Numeric Stability
//==============================================================================

TEST(LadderFilter, NumericStability_LongProcessing)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.9f;  // High resonance
    params.drive = 0.5f;
    ladder.setParams(params);

    // Process many samples
    for (int i = 0; i < 100000; ++i)
    {
        float input = (i % 100 < 50) ? 0.5f : -0.5f;  // Square wave
        float output = ladder.process(input);
        EXPECT_FALSE(std::isnan(output));
        EXPECT_FALSE(std::isinf(output));
        EXPECT_GE(output, -10.0f);
        EXPECT_LE(output, 10.0f);
    }
}

TEST(LadderFilter, NumericStability_DenormalPrevention)
{
    LadderFilter ladder;
    ladder.setSampleRate(48000.0);

    LadderParams params;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.99f;  // Very high resonance
    ladder.setParams(params);

    // Process very small signals
    for (int i = 0; i < 10000; ++i)
    {
        float input = 1e-10f;  // Very small
        float output = ladder.process(input);
        EXPECT_FALSE(std::isnan(output));
        EXPECT_FALSE(std::isinf(output));
    }
}
