#include "dsp/filters/StateVariableFilter.h"
#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <cmath>

using namespace FilterGate;

//==============================================================================
// Test 3.1: SVF Instantiation and Configuration
//==============================================================================

TEST(StateVariableFilter, CanCreate)
{
    StateVariableFilter svf;
    // Should successfully create without crash
    EXPECT_NE(&svf, nullptr);
}

TEST(StateVariableFilter, CanSetParams)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;

    EXPECT_NO_THROW(svf.setParams(params));
}

TEST(StateVariableFilter, CanReset)
{
    StateVariableFilter svf;
    SVFParams params;
    svf.setParams(params);

    // Process some samples to accumulate state
    for (int i = 0; i < 100; ++i)
        svf.process(0.5f);

    // Reset should clear state
    EXPECT_NO_THROW(svf.reset());
}

//==============================================================================
// Test 3.2: SVF Lowpass Response
//==============================================================================

TEST(StateVariableFilter, LowPassResponse_LowFreqPass)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;  // Low resonance for clear response
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate low frequency (100Hz, well below cutoff)
    float lowFreqSignal = 0.5f;
    float output = svf.process(lowFreqSignal);

    // After settling, low freq should mostly pass through
    // Process multiple samples to reach steady state
    for (int i = 0; i < 1000; ++i)
        output = svf.process(lowFreqSignal);

    // Output should be close to input (some attenuation is OK)
    EXPECT_GT(std::abs(output), 0.3f);
}

TEST(StateVariableFilter, LowPassResponse_HighFreqAttenuated)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate high frequency (10kHz, well above cutoff)
    float phase = 0.0f;
    float output = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        output = svf.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 10000.0f) / 48000.0f;
    }

    // Average output should be significantly attenuated
    float avgOutput = sumOutput / 1000.0f;
    EXPECT_LT(avgOutput, 0.15f);
}

//==============================================================================
// Test 3.3: SVF Highpass Response
//==============================================================================

TEST(StateVariableFilter, HighPassResponse_HighFreqPass)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::HIGHPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate high frequency (10kHz, well above cutoff)
    float phase = 0.0f;
    float output = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        output = svf.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 10000.0f) / 48000.0f;
    }

    // Average output should be close to input amplitude
    float avgOutput = sumOutput / 1000.0f;
    EXPECT_GT(avgOutput, 0.2f);
}

TEST(StateVariableFilter, HighPassResponse_LowFreqAttenuated)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::HIGHPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.1f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate low frequency (100Hz, well below cutoff)
    float phase = 0.0f;
    float output = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        output = svf.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 100.0f) / 48000.0f;
    }

    // Average output should be significantly attenuated
    float avgOutput = sumOutput / 1000.0f;
    EXPECT_LT(avgOutput, 0.15f);
}

//==============================================================================
// Test 3.4: SVF Bandpass Response
//==============================================================================

TEST(StateVariableFilter, BandPassResponse_CenterFreqPass)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::BANDPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.7f;  // Higher Q for narrower bandwidth
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate signal at cutoff frequency (1000Hz)
    float phase = 0.0f;
    float output = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        output = svf.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 1000.0f) / 48000.0f;
    }

    // Average output should be significant at center frequency
    float avgOutput = sumOutput / 1000.0f;
    EXPECT_GT(avgOutput, 0.2f);
}

TEST(StateVariableFilter, BandPassResponse_OffFreqAttenuated)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::BANDPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.8f;  // High Q for narrow bandwidth
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate signal far from cutoff (100Hz)
    float phase = 0.0f;
    float output = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        output = svf.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 100.0f) / 48000.0f;
    }

    // Average output should be attenuated away from center
    float avgOutput = sumOutput / 1000.0f;
    EXPECT_LT(avgOutput, 0.15f);
}

//==============================================================================
// Test 3.5: SVF Notch Response
//==============================================================================

TEST(StateVariableFilter, NotchResponse_CenterFreqAttenuated)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::NOTCH;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate signal at cutoff frequency (should be notched out)
    float phase = 0.0f;
    float output = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        output = svf.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 1000.0f) / 48000.0f;
    }

    // Average output should be significantly attenuated at notch frequency
    float avgOutput = sumOutput / 1000.0f;
    EXPECT_LT(avgOutput, 0.2f);
}

TEST(StateVariableFilter, NotchResponse_OffFreqPass)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::NOTCH;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.7f;  // Higher Q for narrower notch
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Generate signal far from cutoff (100Hz, should pass)
    float phase = 0.0f;
    float output = 0.0f;
    float sumOutput = 0.0f;

    for (int i = 0; i < 1000; ++i)
    {
        float input = 0.5f * std::sin(phase);
        output = svf.process(input);
        sumOutput += std::abs(output);
        phase += (2.0f * juce::MathConstants<float>::pi * 100.0f) / 48000.0f;
    }

    // Average output should pass through away from notch
    float avgOutput = sumOutput / 1000.0f;
    EXPECT_GT(avgOutput, 0.2f);
}

//==============================================================================
// Test 3.6: SVF Resonance Control
//==============================================================================

TEST(StateVariableFilter, ResonanceControl_LowResonance)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.0f;  // Minimum resonance
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // DC should pass through relatively unchanged at low resonance
    float output = 0.0f;
    for (int i = 0; i < 100; ++i)
        output = svf.process(0.5f);

    EXPECT_NEAR(output, 0.5f, 0.1f);
}

TEST(StateVariableFilter, ResonanceControl_HighResonance)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::BANDPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.95f;  // Very high resonance
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // High resonance should create narrower bandwidth
    // Signal at exactly cutoff frequency should be boosted
    float phase = 0.0f;
    float maxOutput = 0.0f;

    for (int i = 0; i < 2000; ++i)
    {
        float input = 0.3f * std::sin(phase);
        float output = std::abs(svf.process(input));
        maxOutput = std::max(maxOutput, output);
        phase += (2.0f * juce::MathConstants<float>::pi * 1000.0f) / 48000.0f;
    }

    // At high resonance, output should exceed input (peak at cutoff)
    EXPECT_GT(maxOutput, 0.35f);
}

//==============================================================================
// Test 3.7: SVF Stereo Processing
//==============================================================================

TEST(StateVariableFilter, StereoProcessing_IdenticalChannels)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Create stereo buffer with identical signals
    constexpr int numSamples = 256;
    float left[256];
    float right[256];

    for (int i = 0; i < numSamples; ++i)
    {
        left[i] = 0.5f;
        right[i] = 0.5f;
    }

    svf.processStereo(left, right, numSamples);

    // Both channels should produce identical output
    for (int i = 0; i < numSamples; ++i)
    {
        EXPECT_FLOAT_EQ(left[i], right[i]);
    }
}

//==============================================================================
// Test 3.8: SVF Sample Rate Handling
//==============================================================================

TEST(StateVariableFilter, SampleRate441kHz)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 44100.0f;
    svf.setParams(params);

    EXPECT_NO_THROW(svf.process(0.5f));
}

TEST(StateVariableFilter, SampleRate48kHz)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    EXPECT_NO_THROW(svf.process(0.5f));
}

TEST(StateVariableFilter, SampleRate96kHz)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 96000.0f;
    svf.setParams(params);

    EXPECT_NO_THROW(svf.process(0.5f));
}

TEST(StateVariableFilter, SampleRate192kHz)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 192000.0f;
    svf.setParams(params);

    EXPECT_NO_THROW(svf.process(0.5f));
}

//==============================================================================
// Test 3.9: SVF Edge Cases
//==============================================================================

TEST(StateVariableFilter, EdgeCase_ZeroCutoff)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 0.0f;  // Extreme case
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;

    EXPECT_NO_THROW(svf.setParams(params));
    EXPECT_NO_THROW(svf.process(0.5f));
}

TEST(StateVariableFilter, EdgeCase_NyquistCutoff)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 24000.0f;  // Nyquist at 48kHz
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;

    EXPECT_NO_THROW(svf.setParams(params));
    EXPECT_NO_THROW(svf.process(0.5f));
}

TEST(StateVariableFilter, EdgeCase_MaximumResonance)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 1.0f;  // Maximum resonance
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    EXPECT_NO_THROW(svf.process(0.5f));
}

TEST(StateVariableFilter, EdgeCase_SilenceInput)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Process silence
    for (int i = 0; i < 1000; ++i)
        EXPECT_EQ(svf.process(0.0f), 0.0f);
}

TEST(StateVariableFilter, EdgeCase_FullScaleInput)
{
    StateVariableFilter svf;
    SVFParams params;
    params.type = FilterType::LOWPASS;
    params.cutoffHz = 1000.0f;
    params.resonance = 0.5f;
    params.sampleRate = 48000.0f;
    svf.setParams(params);

    // Process full scale input
    EXPECT_NO_THROW(svf.process(1.0f));
    EXPECT_NO_THROW(svf.process(-1.0f));
}

//==============================================================================
// Test 3.10: SVF Multiple Instance Independence
//==============================================================================

TEST(StateVariableFilter, MultipleInstances_Independent)
{
    StateVariableFilter svf1, svf2;

    SVFParams params1;
    params1.type = FilterType::LOWPASS;
    params1.cutoffHz = 500.0f;
    params1.resonance = 0.5f;
    params1.sampleRate = 48000.0f;
    svf1.setParams(params1);

    SVFParams params2;
    params2.type = FilterType::LOWPASS;
    params2.cutoffHz = 2000.0f;  // Different cutoff
    params2.resonance = 0.5f;
    params2.sampleRate = 48000.0f;
    svf2.setParams(params2);

    // Process same signal through both
    float input = 0.5f;
    float out1 = svf1.process(input);
    float out2 = svf2.process(input);

    // Outputs should differ due to different cutoffs
    EXPECT_NE(out1, out2);
}
