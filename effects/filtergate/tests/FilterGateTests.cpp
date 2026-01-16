#include "FilterGateProcessor.h"
#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>

using namespace FilterGate;

//==============================================================================
// Test 1.1: Processor Instantiates
//==============================================================================

TEST(FilterGateProcessor, CanCreate)
{
    FilterGateProcessor proc;
    // Should successfully create without crash
    EXPECT_NE(&proc, nullptr);
}

//==============================================================================
// Test 1.2: Processor Configuration
//==============================================================================

TEST(FilterGateProcessor, CanPrepareToPlay)
{
    FilterGateProcessor proc;
    proc.prepareToPlay(48000.0, 512);

    EXPECT_EQ(proc.getTotalNumInputChannels(), 2);
    EXPECT_EQ(proc.getTotalNumOutputChannels(), 2);
}

TEST(FilterGateProcessor, CanPrepareToPlayDifferentSampleRates)
{
    FilterGateProcessor proc;

    // Test common sample rates
    std::vector<double> sampleRates = {44100.0, 48000.0, 88200.0, 96000.0, 192000.0};

    for (auto sr : sampleRates)
    {
        proc.prepareToPlay(sr, 512);
        EXPECT_NO_THROW(proc.prepareToPlay(sr, 512));
    }
}

TEST(FilterGateProcessor, CanReleaseResources)
{
    FilterGateProcessor proc;
    proc.prepareToPlay(48000.0, 512);
    EXPECT_NO_THROW(proc.releaseResources());
}

//==============================================================================
// Test 1.3: Audio Processing - Silence
//==============================================================================

TEST(FilterGateProcessor, ProcessSilence)
{
    FilterGateProcessor proc;
    proc.prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    buffer.clear();

    juce::MidiBuffer midi;
    proc.processBlock(buffer, midi);

    // Output should be silence (0.0)
    for (int ch = 0; ch < 2; ++ch)
    {
        for (int s = 0; s < 512; ++s)
        {
            EXPECT_FLOAT_EQ(buffer.getSample(ch, s), 0.0f);
        }
    }
}

//==============================================================================
// Test 1.4: Audio Processing - Pass Through
//==============================================================================

TEST(FilterGateProcessor, ProcessPassThrough)
{
    FilterGateProcessor proc;
    proc.prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);

    // Fill with test signal (0.5 DC)
    for (int ch = 0; ch < 2; ++ch)
    {
        for (int s = 0; s < 512; ++s)
        {
            buffer.setSample(ch, s, 0.5f);
        }
    }

    juce::MidiBuffer midi;
    proc.processBlock(buffer, midi);

    // Output should match input (pass-through)
    for (int ch = 0; ch < 2; ++ch)
    {
        for (int s = 0; s < 512; ++s)
        {
            EXPECT_FLOAT_EQ(buffer.getSample(ch, s), 0.5f);
        }
    }
}

//==============================================================================
// Test 1.5: Parameter System
//==============================================================================

TEST(FilterGateProcessor, HasTestParameter)
{
    FilterGateProcessor proc;

    // Should have test parameter
    auto params = proc.getParameters();
    EXPECT_GT(params.size(), 0);
}

TEST(FilterGateProcessor, CanGetTestParameter)
{
    FilterGateProcessor proc;

    // Get test parameter by index
    auto param = proc.getParameters()[0];
    EXPECT_NE(param, nullptr);

    // Default value should be 0.5
    auto* floatParam = dynamic_cast<juce::AudioProcessorParameter*>(param);
    EXPECT_NE(floatParam, nullptr);
    EXPECT_FLOAT_EQ(floatParam->getValue(), 0.5f);
}

//==============================================================================
// Main test runner
//==============================================================================

int main(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
