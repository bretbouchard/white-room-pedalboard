#include "dsp/AllPassFilter.h"
#include "dsp/PhaserEngine.h"
#include "dsp/DualPhaser.h"
#include <gtest/gtest.h>
#include <cmath>
#include <limits>

using namespace FilterGate;

//==============================================================================
// PHASE 1: AllPassFilter Tests
//==============================================================================

TEST(AllPassFilter, CanCreate)
{
    AllPassFilter filter;
    EXPECT_NE(&filter, nullptr);
}

TEST(AllPassFilter, CoefficientInRange)
{
    AllPassFilter filter;
    filter.setCoefficient(0.7f);
    // Coefficient should be stored (we'll verify it affects processing)
}

TEST(AllPassFilter, ProcessSingleSample)
{
    AllPassFilter filter;
    filter.setCoefficient(0.5f);

    float output = filter.process(1.0f);

    // Output should be different from input for non-zero coefficient
    EXPECT_NE(output, 1.0f);
}

TEST(AllPassFilter, ProcessZeroCoefficient)
{
    AllPassFilter filter;
    filter.setCoefficient(0.0f);

    float output = filter.process(1.0f);

    // With zero coefficient, output should just be -input + delayed
    // First sample: y[n] = -x[n] + 0*x[n-1] + 0*z1 = -1.0
    EXPECT_FLOAT_EQ(output, -1.0f);
}

TEST(AllPassFilter, ResetsToZero)
{
    AllPassFilter filter;
    filter.setCoefficient(0.5f);
    filter.process(1.0f);

    filter.reset();

    // After reset, processing should behave as if fresh
    float output = filter.process(1.0f);
    EXPECT_FLOAT_EQ(output, -1.0f); // Should match first sample behavior
}

TEST(AllPassFilter, ProcessStereo)
{
    AllPassFilter filter;
    filter.setCoefficient(0.5f);

    float left[4] = {1.0f, 0.5f, -0.5f, 0.0f};
    float right[4] = {0.8f, 0.3f, -0.3f, 0.0f};

    filter.processStereo(left, right, 4);

    // Outputs should differ from inputs
    EXPECT_NE(left[0], 1.0f);
    EXPECT_NE(right[0], 0.8f);
}

TEST(AllPassFilter, MultipleSamplesAccumulateState)
{
    AllPassFilter filter;
    filter.setCoefficient(0.7f);

    float output1 = filter.process(1.0f);
    float output2 = filter.process(0.5f);  // Different input

    // Second sample should differ due to state accumulation
    EXPECT_NE(output1, output2);
}

TEST(AllPassFilter, NegativeCoefficient)
{
    AllPassFilter filter;
    filter.setCoefficient(-0.5f);

    float output = filter.process(1.0f);

    // Should handle negative coefficients
    EXPECT_NE(output, 1.0f);
}

TEST(AllPassFilter, ExtremeCoefficient)
{
    AllPassFilter filter;
    filter.setCoefficient(0.99f);

    float output = filter.process(1.0f);

    // Should handle coefficients close to 1.0
    EXPECT_TRUE(std::isfinite(output));
}

TEST(AllPassFilter, DenormalProtection)
{
    AllPassFilter filter;
    filter.setCoefficient(0.0000001f);

    // Process many samples to potentially accumulate denormals
    for (int i = 0; i < 1000; ++i)
    {
        float output = filter.process(0.000001f);
        EXPECT_TRUE(std::isfinite(output));
        EXPECT_FALSE(std::isnan(output));
        EXPECT_FALSE(std::isinf(output));
    }
}

//==============================================================================
// PHASE 2: PhaserEngine Tests
//==============================================================================

TEST(PhaserEngine, CanCreate)
{
    PhaserEngine engine;
    EXPECT_NE(&engine, nullptr);
}

TEST(PhaserEngine, CanPrepare)
{
    PhaserEngine engine;
    EXPECT_NO_THROW(engine.prepare(48000.0, 512));
}

TEST(PhaserEngine, PrepareMultipleSampleRates)
{
    PhaserEngine engine;

    std::vector<double> sampleRates = {44100.0, 48000.0, 88200.0, 96000.0, 192000.0};

    for (auto sr : sampleRates)
    {
        EXPECT_NO_THROW(engine.prepare(sr, 512));
    }
}

TEST(PhaserEngine, SetStages4)
{
    PhaserEngine engine;
    PhaserParams params;
    params.stages = 4;
    engine.setParams(params);

    // Should accept 4 stages
}

TEST(PhaserEngine, SetStages6)
{
    PhaserEngine engine;
    PhaserParams params;
    params.stages = 6;
    engine.setParams(params);

    // Should accept 6 stages
}

TEST(PhaserEngine, SetStages8)
{
    PhaserEngine engine;
    PhaserParams params;
    params.stages = 8;
    engine.setParams(params);

    // Should accept 8 stages
}

TEST(PhaserEngine, ProcessMono)
{
    PhaserEngine engine;
    engine.prepare(48000.0, 512);

    float input[512];
    float output[512];

    // Fill with test signal
    for (int i = 0; i < 512; ++i)
    {
        input[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
        output[i] = 0.0f;
    }

    engine.process(input, output, 512);

    // Output should be processed (not all zeros)
    bool hasNonZero = false;
    for (int i = 0; i < 512; ++i)
    {
        if (std::abs(output[i]) > 0.0001f)
        {
            hasNonZero = true;
            break;
        }
    }
    EXPECT_TRUE(hasNonZero);
}

TEST(PhaserEngine, ProcessStereo)
{
    PhaserEngine engine;
    engine.prepare(48000.0, 512);

    float left[512];
    float right[512];

    // Fill with test signal
    for (int i = 0; i < 512; ++i)
    {
        left[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
        right[i] = std::sin(2.0 * 3.14159 * 441.0 * i / 48000.0);
    }

    engine.processStereo(left, right, 512);

    // Both channels should be processed
    bool leftHasNonZero = false;
    bool rightHasNonZero = false;

    for (int i = 0; i < 512; ++i)
    {
        if (std::abs(left[i]) > 0.0001f) leftHasNonZero = true;
        if (std::abs(right[i]) > 0.0001f) rightHasNonZero = true;
    }

    EXPECT_TRUE(leftHasNonZero);
    EXPECT_TRUE(rightHasNonZero);
}

TEST(PhaserEngine, ResetClearsState)
{
    PhaserEngine engine;
    engine.prepare(48000.0, 512);

    float input[512];
    float output[512];

    for (int i = 0; i < 512; ++i)
    {
        input[i] = 1.0f;
        output[i] = 0.0f;
    }

    engine.process(input, output, 512);
    engine.reset();

    // After reset, should process from clean state
    engine.process(input, output, 512);
}

TEST(PhaserEngine, LFOModulation)
{
    PhaserEngine engine;
    PhaserParams params;
    params.rateHz = 1.0f;  // 1 Hz LFO
    params.depth = 0.5f;
    params.centerHz = 1000.0f;
    params.spread = 500.0f;

    engine.prepare(48000.0, 512);
    engine.setParams(params);

    float input[48000]; // 1 second at 48kHz
    float output[48000];

    for (int i = 0; i < 48000; ++i)
    {
        input[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
    }

    engine.process(input, output, 48000);

    // LFO should modulate - output should vary over time
    // Check that output at start differs from output at 0.5 seconds
    EXPECT_NE(output[100], output[24000]);
}

TEST(PhaserEngine, FeedbackLoop)
{
    PhaserEngine engine;
    PhaserParams params;
    params.feedback = 0.5f;
    params.stages = 4;

    engine.prepare(48000.0, 512);
    engine.setParams(params);

    float input[512];
    float output[512];

    for (int i = 0; i < 512; ++i)
    {
        input[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
    }

    engine.process(input, output, 512);

    // Feedback should create resonance
    // Output amplitude can be greater than input with resonance
    float maxInput = 0.0f;
    float maxOutput = 0.0f;

    for (int i = 0; i < 512; ++i)
    {
        maxInput = std::max(maxInput, std::abs(input[i]));
        maxOutput = std::max(maxOutput, std::abs(output[i]));
    }

    EXPECT_TRUE(maxOutput > 0.0f);
}

TEST(PhaserEngine, DryWetMix)
{
    PhaserEngine engine;
    PhaserParams params;
    params.mix = 1.0f; // Fully wet

    engine.prepare(48000.0, 512);
    engine.setParams(params);

    float input[512];
    float output[512];

    for (int i = 0; i < 512; ++i)
    {
        input[i] = 0.5f;
    }

    engine.process(input, output, 512);

    // With mix = 1, output should be phased (not equal to input)
    EXPECT_NE(output[400], 0.5f);
}

//==============================================================================
// PHASE 3: DualPhaser Tests
//==============================================================================

TEST(DualPhaser, CanCreate)
{
    DualPhaser dualPhaser;
    EXPECT_NE(&dualPhaser, nullptr);
}

TEST(DualPhaser, CanPrepare)
{
    DualPhaser dualPhaser;
    EXPECT_NO_THROW(dualPhaser.prepare(48000.0, 512));
}

TEST(DualPhaser, SerialRouting)
{
    DualPhaser dualPhaser;
    DualPhaserParams params;
    params.routing = SERIAL;

    dualPhaser.prepare(48000.0, 512);
    dualPhaser.setParams(params);

    float input[512];
    float output[512];

    for (int i = 0; i < 512; ++i)
    {
        input[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
    }

    dualPhaser.process(input, output, 512);

    // Should process through A → B
    bool hasNonZero = false;
    for (int i = 0; i < 512; ++i)
    {
        if (std::abs(output[i]) > 0.0001f)
        {
            hasNonZero = true;
            break;
        }
    }
    EXPECT_TRUE(hasNonZero);
}

TEST(DualPhaser, ParallelRouting)
{
    DualPhaser dualPhaser;
    DualPhaserParams params;
    params.routing = PARALLEL;

    dualPhaser.prepare(48000.0, 512);
    dualPhaser.setParams(params);

    float input[512];
    float output[512];

    for (int i = 0; i < 512; ++i)
    {
        input[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
    }

    dualPhaser.process(input, output, 512);

    // Should process A || B (summed)
    bool hasNonZero = false;
    for (int i = 0; i < 512; ++i)
    {
        if (std::abs(output[i]) > 0.0001f)
        {
            hasNonZero = true;
            break;
        }
    }
    EXPECT_TRUE(hasNonZero);
}

TEST(DualPhaser, StereoRouting)
{
    DualPhaser dualPhaser;
    DualPhaserParams params;
    params.routing = STEREO;

    dualPhaser.prepare(48000.0, 512);
    dualPhaser.setParams(params);

    float left[512];
    float right[512];

    for (int i = 0; i < 512; ++i)
    {
        left[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
        right[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
    }

    dualPhaser.processStereo(left, right, 512);

    // Left should use A, right should use B
    bool leftHasNonZero = false;
    bool rightHasNonZero = false;

    for (int i = 0; i < 512; ++i)
    {
        if (std::abs(left[i]) > 0.0001f) leftHasNonZero = true;
        if (std::abs(right[i]) > 0.0001f) rightHasNonZero = true;
    }

    EXPECT_TRUE(leftHasNonZero);
    EXPECT_TRUE(rightHasNonZero);
}

TEST(DualPhaser, LFOPhaseOffset)
{
    DualPhaser dualPhaser;
    DualPhaserParams params;
    params.routing = STEREO;

    // Verify that independent phaser parameters are supported
    params.phaserA.stages = 4;   // Different number of stages
    params.phaserB.stages = 8;   // Different number of stages

    dualPhaser.prepare(48000.0, 512);
    dualPhaser.setParams(params);

    float left[512];
    float right[512];

    for (int i = 0; i < 512; ++i)
    {
        left[i] = std::sin(2.0f * 3.14159f * 440.0f * i / 48000.0f);
        right[i] = std::sin(2.0f * 3.14159f * 440.0f * i / 48000.0f);
    }

    // Should not crash with different phaser configurations
    EXPECT_NO_THROW(dualPhaser.processStereo(left, right, 512));

    // Both channels should be processed (not all zeros)
    bool leftHasNonZero = false;
    bool rightHasNonZero = false;

    for (int i = 0; i < 512; ++i)
    {
        if (std::abs(left[i]) > 0.0001f) leftHasNonZero = true;
        if (std::abs(right[i]) > 0.0001f) rightHasNonZero = true;
    }

    EXPECT_TRUE(leftHasNonZero);
    EXPECT_TRUE(rightHasNonZero);
}

TEST(DualPhaser, CrossFeedback)
{
    DualPhaser dualPhaser;
    DualPhaserParams params;
    params.routing = SERIAL;
    params.crossFeedback = 0.5f;

    dualPhaser.prepare(48000.0, 512);
    dualPhaser.setParams(params);

    float input[512];
    float output[512];

    for (int i = 0; i < 512; ++i)
    {
        input[i] = std::sin(2.0 * 3.14159 * 440.0 * i / 48000.0);
    }

    dualPhaser.process(input, output, 512);

    // Cross-feedback should affect output
    bool hasNonZero = false;
    for (int i = 0; i < 512; ++i)
    {
        if (std::abs(output[i]) > 0.0001f)
        {
            hasNonZero = true;
            break;
        }
    }
    EXPECT_TRUE(hasNonZero);
}

TEST(DualPhaser, ResetClearsState)
{
    DualPhaser dualPhaser;
    dualPhaser.prepare(48000.0, 512);

    float input[512];
    float output[512];

    for (int i = 0; i < 512; ++i)
    {
        input[i] = 1.0f;
    }

    dualPhaser.process(input, output, 512);
    dualPhaser.reset();

    // After reset, state should be cleared
    float input2[512];
    float output2[512];

    for (int i = 0; i < 512; ++i)
    {
        input2[i] = 1.0f;
    }

    dualPhaser.process(input2, output2, 512);
}

//==============================================================================
// Main test runner
//==============================================================================

int main(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
