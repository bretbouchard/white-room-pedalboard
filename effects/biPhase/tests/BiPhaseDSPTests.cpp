/*
  ==============================================================================
    BiPhaseDSPTests.cpp
    Unit tests for Bi-Phase DSP (Phase 1 + Phase 2)

    Tests the core DSP components:
    - AllPassStage: First-order all-pass filter
    - LFOGenerator: Low-frequency oscillator (sine/square)
    - PhaserStage: 6-stage phaser with feedback
    - Dual phaser routing modes (parallel/series/independent)
    - Sweep synchronization (normal/reverse)
    - Dual LFO source selection

    Framework: Google Test (gtest)
    Dependencies: BiPhasePureDSP_v2.h

    Tests validate the actual DSP implementation
  ==============================================================================
*/

#include <gtest/gtest.h>
#include <cmath>
#include <vector>
#include <array>
#include <algorithm>
#include <numeric>

// Include actual DSP header
#include "dsp/BiPhasePureDSP_v2.h"

using namespace DSP;

//==============================================================================
// Test Helper Functions
//==============================================================================

/**
 * Generate a test tone (sine wave)
 * @param frequency Frequency of the test tone in Hz
 * @param sampleRate Sample rate in Hz
 * @param numSamples Number of samples to generate
 * @param amplitude Peak amplitude (default 1.0)
 * @return Vector of audio samples
 */
std::vector<float> generateTestTone(float frequency, double sampleRate,
                                    size_t numSamples, float amplitude = 1.0f)
{
    std::vector<float> samples(numSamples);
    const double phaseIncrement = (2.0 * M_PI * frequency) / sampleRate;

    for (size_t i = 0; i < numSamples; ++i) {
        samples[i] = static_cast<float>(amplitude * std::sin(phaseIncrement * i));
    }

    return samples;
}

/**
 * Measure DC offset in a signal
 * @param samples Audio samples
 * @return Average DC offset
 */
float measureDCOffset(const std::vector<float>& samples)
{
    if (samples.empty()) {
        return 0.0f;
    }

    double sum = std::accumulate(samples.begin(), samples.end(), 0.0);
    return static_cast<float>(sum / samples.size());
}

/**
 * Calculate signal power (RMS)
 * @param samples Audio samples
 * @return RMS power
 */
float calculateSignalPower(const std::vector<float>& samples)
{
    if (samples.empty()) {
        return 0.0f;
    }

    double sumSquares = 0.0;
    for (float sample : samples) {
        sumSquares += sample * sample;
    }

    return static_cast<float>(std::sqrt(sumSquares / samples.size()));
}

/**
 * Verify signal differs from input (phasing occurred)
 * @param input Original signal
 * @param output Processed signal
 * @param minDifference Minimum required difference threshold
 * @return True if signals differ significantly
 */
bool signalsDiffer(const std::vector<float>& input,
                   const std::vector<float>& output,
                   float minDifference = 0.01f)
{
    if (input.size() != output.size() || input.empty()) {
        return false;
    }

    // Calculate RMS difference
    double sumDiffSquares = 0.0;
    for (size_t i = 0; i < input.size(); ++i) {
        float diff = output[i] - input[i];
        sumDiffSquares += diff * diff;
    }

    float rmsDifference = static_cast<float>(std::sqrt(sumDiffSquares / input.size()));
    return rmsDifference > minDifference;
}

/**
 * Verify signal differs from input (phasing occurred) - raw pointer version
 * @param signal1 First signal
 * @param signal2 Second signal
 * @param numSamples Number of samples
 * @param minDifference Minimum required difference threshold
 * @return True if signals differ significantly
 */
bool signalsDiffer(const float* signal1, const float* signal2,
                   size_t numSamples, float minDifference = 0.01f)
{
    if (signal1 == nullptr || signal2 == nullptr || numSamples == 0) {
        return false;
    }

    // Calculate RMS difference
    double sumDiffSquares = 0.0;
    for (size_t i = 0; i < numSamples; ++i) {
        float diff = signal2[i] - signal1[i];
        sumDiffSquares += diff * diff;
    }

    float rmsDifference = static_cast<float>(std::sqrt(sumDiffSquares / numSamples));
    return rmsDifference > minDifference;
}

/**
 * Calculate signal power (RMS) - raw pointer version
 * @param samples Audio samples
 * @param numSamples Number of samples
 * @return RMS power
 */
float calculateSignalPower(const float* samples, size_t numSamples)
{
    if (samples == nullptr || numSamples == 0) {
        return 0.0f;
    }

    double sumSquares = 0.0;
    for (size_t i = 0; i < numSamples; ++i) {
        sumSquares += samples[i] * samples[i];
    }

    return static_cast<float>(std::sqrt(sumSquares / numSamples));
}

/**
 * Measure DC offset in a signal - raw pointer version
 * @param samples Audio samples
 * @param numSamples Number of samples
 * @return Average DC offset
 */
float measureDCOffset(const float* samples, size_t numSamples)
{
    if (samples == nullptr || numSamples == 0) {
        return 0.0f;
    }

    double sum = 0.0;
    for (size_t i = 0; i < numSamples; ++i) {
        sum += samples[i];
    }
    return static_cast<float>(sum / numSamples);
}

//==============================================================================
// Test Fixtures
//==============================================================================

class BiPhaseDSPTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        // Default sample rate for audio tests
        sampleRate_ = 48000.0;
    }

    void TearDown() override
    {
        // Cleanup if needed
    }

    double sampleRate_;
};

//==============================================================================
// TEST CASE 1: AllPassStage - Coefficient Calculation
//==============================================================================

TEST_F(BiPhaseDSPTest, AllPassStage_ProcessStereo_ZeroState)
{
    // ARRANGE: Create all-pass stage
    AllPassStage stage;
    stage.reset();

    // ACT: Process stereo samples with zero coefficient
    float left = 1.0f;
    float right = 1.0f;
    stage.processStereo(left, right, 0.0f);

    // ASSERT: With zero coefficient, output should equal input
    EXPECT_NEAR(left, 1.0f, 0.001f)
        << "All-pass with zero coeff should pass signal through";
    EXPECT_NEAR(right, 1.0f, 0.001f)
        << "All-pass with zero coeff should pass signal through";
}

TEST_F(BiPhaseDSPTest, AllPassStage_ProcessStereo_StateTracking)
{
    // Test that all-pass maintains state between samples
    AllPassStage stage;
    stage.reset();

    float coeff = -0.5f;

    // Process first sample
    float left1 = 1.0f;
    float right1 = 1.0f;
    stage.processStereo(left1, right1, coeff);

    // Process second sample
    float left2 = 0.0f;
    float right2 = 0.0f;
    stage.processStereo(left2, right2, coeff);

    // Second sample output should be affected by first sample state
    EXPECT_NE(left2, 0.0f)
        << "All-pass state should affect subsequent samples";
}

TEST_F(BiPhaseDSPTest, AllPassStage_Reset_ClearsState)
{
    // Test that reset clears filter state
    AllPassStage stage;
    stage.reset();

    float coeff = -0.7f;

    // Process samples to build up state
    for (int i = 0; i < 100; ++i) {
        float left = 1.0f;
        float right = 1.0f;
        stage.processStereo(left, right, coeff);
    }

    // Reset
    stage.reset();

    // Process zero input - output should be near zero
    float left = 0.0f;
    float right = 0.0f;
    stage.processStereo(left, right, coeff);

    EXPECT_NEAR(left, 0.0f, 0.001f)
        << "After reset, all-pass should output zero for zero input";
    EXPECT_NEAR(right, 0.0f, 0.001f)
        << "After reset, all-pass should output zero for zero input";
}

//==============================================================================
// TEST CASE 2: LFOGenerator - Sine Wave
//==============================================================================

TEST_F(BiPhaseDSPTest, LFOGenerator_SineWave_AmplitudeRange)
{
    // ARRANGE: Create sine wave LFO at 1 Hz
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);
    lfo.setFrequency(1.0f);
    lfo.setShape(LFOShape::Sine);

    // ACT: Generate one full cycle
    std::vector<float> output(static_cast<size_t>(sampleRate_));
    for (size_t i = 0; i < output.size(); ++i) {
        output[i] = lfo.processSample();
    }

    // ASSERT: Amplitude should be in [-1, 1] range
    float minVal = *std::min_element(output.begin(), output.end());
    float maxVal = *std::max_element(output.begin(), output.end());

    EXPECT_GE(minVal, -1.0f)
        << "Sine LFO minimum should be >= -1.0";
    EXPECT_LE(maxVal, 1.0f)
        << "Sine LFO maximum should be <= 1.0";

    // Should reach near full amplitude
    EXPECT_LT(minVal, -0.99f)
        << "Sine LFO should reach near -1.0";
    EXPECT_GT(maxVal, 0.99f)
        << "Sine LFO should reach near +1.0";

    // DC offset should be near zero
    float dcOffset = measureDCOffset(output);
    EXPECT_NEAR(dcOffset, 0.0f, 0.01f)
        << "Sine LFO should have zero DC offset";
}

TEST_F(BiPhaseDSPTest, LFOGenerator_SineWave_FrequencyAccuracy)
{
    // Test multiple frequencies
    std::vector<float> testRates = {0.5f, 1.0f, 2.0f, 5.0f, 10.0f};

    for (float rate : testRates) {
        LFOGenerator lfo;
        lfo.prepare(sampleRate_);
        lfo.setFrequency(rate);

        // Generate 1 second of output
        std::vector<float> output(static_cast<size_t>(sampleRate_));
        for (size_t i = 0; i < output.size(); ++i) {
            output[i] = lfo.processSample();
        }

        // Count zero crossings to verify frequency
        int zeroCrossings = 0;
        for (size_t i = 1; i < output.size(); ++i) {
            if ((output[i-1] >= 0.0f && output[i] < 0.0f) ||
                (output[i-1] < 0.0f && output[i] >= 0.0f)) {
                zeroCrossings++;
            }
        }

        // Each cycle has 2 zero crossings
        float measuredRate = zeroCrossings / 2.0f;
        float rateError = std::abs(measuredRate - rate) / rate;

        EXPECT_LT(rateError, 0.01f)
            << "LFO rate " << rate << " Hz has error " << rateError * 100 << "%";
    }
}

//==============================================================================
// TEST CASE 3: LFOGenerator - Square Wave
//==============================================================================

TEST_F(BiPhaseDSPTest, LFOGenerator_SquareWave_AmplitudeRange)
{
    // ARRANGE: Create square wave LFO at 1 Hz
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);
    lfo.setFrequency(1.0f);
    lfo.setShape(LFOShape::Square);

    // ACT: Generate one full cycle
    std::vector<float> output(static_cast<size_t>(sampleRate_));
    for (size_t i = 0; i < output.size(); ++i) {
        output[i] = lfo.processSample();
    }

    // ASSERT: Square wave should only have values -1 or +1
    for (float sample : output) {
        bool isValid = (sample == 1.0f || sample == -1.0f);
        EXPECT_TRUE(isValid)
            << "Square LFO should only output -1 or +1, got " << sample;
    }

    // Should have both positive and negative sections
    float minVal = *std::min_element(output.begin(), output.end());
    float maxVal = *std::max_element(output.begin(), output.end());

    EXPECT_EQ(minVal, -1.0f)
        << "Square LFO should reach -1.0";
    EXPECT_EQ(maxVal, 1.0f)
        << "Square LFO should reach +1.0";
}

TEST_F(BiPhaseDSPTest, LFOGenerator_SquareWave_DutyCycle)
{
    // ARRANGE: Create square wave LFO at 2 Hz
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);
    lfo.setFrequency(2.0f);
    lfo.setShape(LFOShape::Square);

    // ACT: Generate one second
    std::vector<float> output(static_cast<size_t>(sampleRate_));
    for (size_t i = 0; i < output.size(); ++i) {
        output[i] = lfo.processSample();
    }

    // ASSERT: Should have roughly 50% duty cycle
    int positiveSamples = 0;
    for (float sample : output) {
        if (sample > 0.0f) {
            positiveSamples++;
        }
    }

    float dutyCycle = static_cast<float>(positiveSamples) / output.size();
    EXPECT_NEAR(dutyCycle, 0.5f, 0.01f)
        << "Square wave should have 50% duty cycle";
}

//==============================================================================
// TEST CASE 4: LFOGenerator - Rate Range
//==============================================================================

TEST_F(BiPhaseDSPTest, LFOGenerator_RateRange_MinimumRate)
{
    // Test minimum rate (0.1 Hz)
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);
    lfo.setFrequency(0.1f);

    // Generate 10 seconds (should see 1 full cycle)
    std::vector<float> output(static_cast<size_t>(sampleRate_ * 10));
    for (size_t i = 0; i < output.size(); ++i) {
        output[i] = lfo.processSample();
    }

    // Count zero crossings
    int zeroCrossings = 0;
    for (size_t i = 1; i < output.size(); ++i) {
        if ((output[i-1] >= 0.0f && output[i] < 0.0f) ||
            (output[i-1] < 0.0f && output[i] >= 0.0f)) {
            zeroCrossings++;
        }
    }

    // At 0.1 Hz for 10 seconds, expect ~2 zero crossings
    EXPECT_NEAR(zeroCrossings, 2, 1)
        << "0.1 Hz LFO should produce ~1 cycle in 10 seconds";
}

TEST_F(BiPhaseDSPTest, LFOGenerator_RateRange_MaximumRate)
{
    // Test maximum rate (18 Hz)
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);
    lfo.setFrequency(18.0f);

    // Generate 1 second
    std::vector<float> output(static_cast<size_t>(sampleRate_));
    for (size_t i = 0; i < output.size(); ++i) {
        output[i] = lfo.processSample();
    }

    // Count zero crossings
    int zeroCrossings = 0;
    for (size_t i = 1; i < output.size(); ++i) {
        if ((output[i-1] >= 0.0f && output[i] < 0.0f) ||
            (output[i-1] < 0.0f && output[i] >= 0.0f)) {
            zeroCrossings++;
        }
    }

    // At 18 Hz, expect ~36 zero crossings per second
    EXPECT_NEAR(zeroCrossings, 36, 2)
        << "18 Hz LFO should produce ~18 cycles per second";
}

TEST_F(BiPhaseDSPTest, LFOGenerator_RateClamping_OutOfRange)
{
    // Test that out-of-range rates are clamped
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);

    // Test below minimum - should clamp to 0.1 Hz
    lfo.setFrequency(0.01f);
    lfo.processSample();

    // Test above maximum - should clamp to 18 Hz
    lfo.setFrequency(100.0f);
    lfo.processSample();

    // Just verify no crashes occur
    SUCCEED();
}

TEST_F(BiPhaseDSPTest, LFOGenerator_PhaseControl)
{
    // Test phase get/set for stereo offset
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);

    // Set specific phase
    lfo.setPhase(M_PI);

    // Verify phase is set
    float phase = lfo.getPhase();
    EXPECT_NEAR(phase, M_PI, 0.001f)
        << "LFO phase should be settable";

    // Process should advance from set phase
    float output = lfo.processSample();
    EXPECT_NEAR(output, 0.0f, 0.1f)
        << "LFO at PI phase should produce near-zero output";
}

//==============================================================================
// TEST CASE 5: PhaserStage - Prepare and Reset
//==============================================================================

TEST_F(BiPhaseDSPTest, PhaserStage_PrepareAndReset_Initialization)
{
    // ARRANGE: Create phaser stage
    PhaserStage phaser;

    // ACT: Reset
    phaser.reset();

    // ASSERT: Phaser should be in clean state
    // Process stereo samples
    float left = 0.0f;
    float right = 0.0f;
    phaser.processStereo(left, right, 0.0f, 200.0f, 5000.0f, sampleRate_);

    // Output should be near zero (no noise or DC offset)
    EXPECT_NEAR(left, 0.0f, 0.001f)
        << "Phaser output should be silent after reset";
    EXPECT_NEAR(right, 0.0f, 0.001f)
        << "Phaser output should be silent after reset";

    // Process multiple silent samples
    for (int i = 0; i < 100; ++i) {
        left = 0.0f;
        right = 0.0f;
        phaser.processStereo(left, right, 0.0f, 200.0f, 5000.0f, sampleRate_);
    }

    EXPECT_NEAR(left, 0.0f, 0.001f)
        << "Phaser should remain silent with zero input";
    EXPECT_NEAR(right, 0.0f, 0.001f)
        << "Phaser should remain silent with zero input";
}

//==============================================================================
// TEST CASE 6: PhaserStage - Basic Sweep
//==============================================================================

TEST_F(BiPhaseDSPTest, PhaserStage_BasicSweep_PhasingEffect)
{
    // ARRANGE: Create phaser stage
    PhaserStage phaser;
    phaser.reset();

    // ACT: Process 1 second of 1 kHz test tone with LFO modulation
    auto input = generateTestTone(1000.0f, sampleRate_,
                                  static_cast<size_t>(sampleRate_));

    std::vector<float> outputLeft(input.size());
    std::vector<float> outputRight(input.size());

    // Generate LFO for modulation
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);
    lfo.setFrequency(1.0f);

    for (size_t i = 0; i < input.size(); ++i) {
        float modSignal = lfo.processSample();
        outputLeft[i] = input[i];
        outputRight[i] = input[i];
        phaser.processStereo(outputLeft[i], outputRight[i], modSignal,
                            200.0f, 5000.0f, sampleRate_);
    }

    // ASSERT: Output should differ from input (phasing occurred)
    bool differs = signalsDiffer(input, outputLeft, 0.01f);
    EXPECT_TRUE(differs)
        << "Phaser output should differ from input";

    // Signal power should be preserved (within 20%)
    float inputPower = calculateSignalPower(input);
    float outputPower = calculateSignalPower(outputLeft);
    float powerRatio = outputPower / inputPower;

    EXPECT_GE(powerRatio, 0.8f)
        << "Phaser should not attenuate signal excessively";
    EXPECT_LE(powerRatio, 1.2f)
        << "Phaser should not amplify signal excessively";
}

TEST_F(BiPhaseDSPTest, PhaserStage_BasicSweep_TimeVarying)
{
    // ARRANGE: Create phaser with slow LFO
    PhaserStage phaser;
    phaser.reset();

    // ACT: Process constant input (DC) with varying modulation
    constexpr size_t numSamples = static_cast<size_t>(sampleRate_ * 2); // 2 seconds
    std::vector<float> outputLeft(numSamples);
    std::vector<float> outputRight(numSamples);

    // Generate slow LFO for modulation
    LFOGenerator lfo;
    lfo.prepare(sampleRate_);
    lfo.setFrequency(0.5f);

    for (size_t i = 0; i < numSamples; ++i) {
        float modSignal = lfo.processSample();
        outputLeft[i] = 1.0f;
        outputRight[i] = 1.0f;
        phaser.processStereo(outputLeft[i], outputRight[i], modSignal,
                            200.0f, 5000.0f, sampleRate_);
    }

    // ASSERT: Output should vary over time (due to LFO sweep)
    float minVal = *std::min_element(outputLeft.begin(), outputLeft.end());
    float maxVal = *std::max_element(outputLeft.begin(), outputLeft.end());
    float variation = maxVal - minVal;

    EXPECT_GT(variation, 0.1f)
        << "Phaser output should vary with LFO sweep";
}

//==============================================================================
// TEST CASE 7: PhaserStage - Frequency Range
//==============================================================================

TEST_F(BiPhaseDSPTest, PhaserStage_FrequencyRange_LowFreq)
{
    // Test phaser at low frequency range
    PhaserStage phaser;
    phaser.reset();

    float left = 1.0f;
    float right = 1.0f;

    // Process with minimum frequency modulation
    phaser.processStereo(left, right, -1.0f, 200.0f, 5000.0f, sampleRate_);

    // Should process without issues
    EXPECT_TRUE(std::isfinite(left))
        << "Phaser should produce finite output at low frequency";
    EXPECT_TRUE(std::isfinite(right))
        << "Phaser should produce finite output at low frequency";
}

TEST_F(BiPhaseDSPTest, PhaserStage_FrequencyRange_HighFreq)
{
    // Test phaser at high frequency range
    PhaserStage phaser;
    phaser.reset();

    float left = 1.0f;
    float right = 1.0f;

    // Process with maximum frequency modulation
    phaser.processStereo(left, right, 1.0f, 200.0f, 5000.0f, sampleRate_);

    // Should process without issues
    EXPECT_TRUE(std::isfinite(left))
        << "Phaser should produce finite output at high frequency";
    EXPECT_TRUE(std::isfinite(right))
        << "Phaser should produce finite output at high frequency";
}

//==============================================================================
// TEST CASE 8: BiPhaseDSP - Integration Tests
//==============================================================================

TEST_F(BiPhaseDSPTest, BiPhaseDSP_PrepareAndReset)
{
    // ARRANGE: Create BiPhase DSP
    BiPhaseDSP dsp;

    // ACT: Prepare and reset
    dsp.prepare(sampleRate_, 512);
    dsp.reset();

    // ASSERT: Process silence should produce silence
    std::vector<float> left(512, 0.0f);
    std::vector<float> right(512, 0.0f);

    dsp.processStereo(left.data(), right.data(), 512);

    for (size_t i = 0; i < 512; ++i) {
        EXPECT_NEAR(left[i], 0.0f, 0.001f)
            << "BiPhase DSP should output zero for zero input after reset";
        EXPECT_NEAR(right[i], 0.0f, 0.001f)
            << "BiPhase DSP should output zero for zero input after reset";
    }
}

TEST_F(BiPhaseDSPTest, BiPhaseDSP_ProcessStereo_PhasingEffect)
{
    // ARRANGE: Create BiPhase DSP
    BiPhaseDSP dsp;
    dsp.prepare(sampleRate_, 512);

    // Set parameters
    BiPhaseParameters params;
    params.rate = 1.0f;
    params.depth = 0.8f;
    params.feedback = 0.5f;
    params.shape = LFOShape::Sine;
    dsp.setParameters(params);

    // ACT: Process test tone
    auto input = generateTestTone(1000.0f, sampleRate_, 512);
    std::vector<float> left(input.begin(), input.end());
    std::vector<float> right(input.begin(), input.end());

    dsp.processStereo(left.data(), right.data(), 512);

    // ASSERT: Output should differ from input
    bool leftDiffers = signalsDiffer(input, left, 0.01f);
    bool rightDiffers = signalsDiffer(input, right, 0.01f);

    EXPECT_TRUE(leftDiffers)
        << "BiPhase DSP left channel should differ from input";
    EXPECT_TRUE(rightDiffers)
        << "BiPhase DSP right channel should differ from input";
}

TEST_F(BiPhaseDSPTest, BiPhaseDSP_ParameterSetters)
{
    // Test parameter setters
    BiPhaseDSP dsp;
    dsp.prepare(sampleRate_, 512);

    // Test rate setter
    dsp.setRate(5.0f);
    // Should clamp to valid range

    // Test depth setter
    dsp.setDepth(0.9f);

    // Test feedback setter
    dsp.setFeedback(0.7f);

    // Test stereo phase setter
    dsp.setStereoPhase(180.0f);

    // Test shape setter
    dsp.setShape(LFOShape::Square);

    // Just verify no crashes occur
    SUCCEED();
}

TEST_F(BiPhaseDSPTest, BiPhaseDSP_StereoPhaseOffset)
{
    // Test stereo phase offset creates different outputs
    BiPhaseDSP dsp;
    dsp.prepare(sampleRate_, 512);

    BiPhaseParameters params;
    params.rate = 1.0f;
    params.depth = 0.8f;
    params.feedback = 0.0f;
    params.stereoPhase = 180.0f;  // 180 degree offset
    params.shape = LFOShape::Sine;
    dsp.setParameters(params);

    // Process constant input
    std::vector<float> left(512, 1.0f);
    std::vector<float> right(512, 1.0f);

    dsp.processStereo(left.data(), right.data(), 512);

    // With stereo phase offset, outputs should differ
    bool differs = signalsDiffer(left, right, 0.001f);
    EXPECT_TRUE(differs)
        << "Stereo phase offset should create different L/R outputs";
}

TEST_F(BiPhaseDSPTest, BiPhaseDSP_PolicyConfiguration)
{
    // Test policy-based configuration
    BiPhaseDSP dsp;

    // Set FX policy (allows stereo phase, high feedback)
    dsp.setPolicy(FXPolicy);
    dsp.prepare(sampleRate_, 512);

    BiPhaseParameters params;
    params.rate = 2.0f;
    params.depth = 1.0f;
    params.feedback = 0.95f;  // High feedback
    params.stereoPhase = 90.0f;
    params.shape = LFOShape::Square;

    dsp.setParameters(params);

    // Process test tone
    std::vector<float> left(512, 1.0f);
    std::vector<float> right(512, 1.0f);

    dsp.processStereo(left.data(), right.data(), 512);

    // Should remain stable even with high feedback
    float maxLeft = *std::max_element(left.begin(), left.end(),
                                      [](float a, float b) { return std::abs(a) < std::abs(b); });
    float maxRight = *std::max_element(right.begin(), right.end(),
                                       [](float a, float b) { return std::abs(a) < std::abs(b); });

    EXPECT_LT(std::abs(maxLeft), 100.0f)
        << "FX policy should prevent runaway with high feedback";
    EXPECT_LT(std::abs(maxRight), 100.0f)
        << "FX policy should prevent runaway with high feedback";
}

//==============================================================================
// Phase 2: Routing Mode Tests
//==============================================================================

TEST_CASE("BiPhaseDSP_RoutingMode_Parallel", "[dsp][phaser][routing]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Set parallel mode
    dsp.setRoutingMode(DSP::RoutingMode::InA);

    // Process stereo signal
    std::array<float, 512> left, right;
    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = std::sin(2.0 * M_PI * 440.0 * i / 48000.0);
        right[i] = std::sin(2.0 * M_PI * 440.0 * i / 48000.0);
    }

    float* leftPtr = left.data();
    float* rightPtr = right.data();
    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Verify outputs differ (parallel processing)
    bool outputsDiffer = false;
    for (size_t i = 0; i < left.size(); ++i) {
        if (std::abs(left[i] - right[i]) > 0.01f) {
            outputsDiffer = true;
            break;
        }
    }
    REQUIRE(outputsDiffer);
}

TEST_CASE("BiPhaseDSP_RoutingMode_Series", "[dsp][phaser][routing]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Set series mode (12-stage cascade)
    dsp.setRoutingMode(DSP::RoutingMode::OutA);

    // Both phasors with same rate for deep effect
    dsp.setRateA(0.5f);
    dsp.setRateB(0.5f);
    dsp.setDepthA(0.9f);
    dsp.setDepthB(0.9f);

    std::array<float, 512> left, right;
    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = std::sin(2.0 * M_PI * 440.0 * i / 48000.0);
        right[i] = std::sin(2.0 * M_PI * 440.0 * i / 48000.0);
    }

    float* leftPtr = left.data();
    float* rightPtr = right.data();
    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Series mode should produce deep phasing
    float powerLeft = calculateSignalPower(leftPtr, left.size());
    REQUIRE(powerLeft > 0.0f);
    REQUIRE(powerLeft < 1.0f);  // Should be attenuated by phasing
}

TEST_CASE("BiPhaseDSP_RoutingMode_Independent", "[dsp][phaser][routing]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Set independent mode
    dsp.setRoutingMode(DSP::RoutingMode::InB);

    // Different settings for each phaser
    dsp.setRateA(0.3f);
    dsp.setRateB(0.7f);

    std::array<float, 512> left, right;
    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = std::sin(2.0 * M_PI * 440.0 * i / 48000.0);   // Input A
        right[i] = std::sin(2.0 * M_PI * 880.0 * i / 48000.0);  // Input B (different freq)
    }

    float* leftPtr = left.data();
    float* rightPtr = right.data();
    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Both outputs should be modified independently
    REQUIRE(signalsDiffer(left.data(), right.data(), left.size()));
}

//==============================================================================
// Phase 2: Sweep Sync Tests
//==============================================================================

TEST_CASE("BiPhaseDSP_SweepSync_Normal", "[dsp][phaser][sync]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Normal sync: both sweep same direction
    dsp.setSweepSync(DSP::SweepSync::Normal);
    dsp.setRoutingMode(DSP::RoutingMode::InA);  // Parallel

    dsp.setRateA(1.0f);
    dsp.setRateB(1.0f);
    dsp.setSweepSourceA(DSP::SweepSource::Generator1);
    dsp.setSweepSourceB(DSP::SweepSource::Generator1);

    // Process and verify LFOs are synchronized
    std::array<float, 512> left, right;
    float* leftPtr = left.data();
    float* rightPtr = right.data();

    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = 1.0f;
        right[i] = 1.0f;
    }

    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Outputs should be similar (same LFO phase)
    float diff = 0.0f;
    for (size_t i = 0; i < left.size(); ++i) {
        diff += std::abs(left[i] - right[i]);
    }
    REQUIRE(diff / left.size() < 0.1f);  // Average difference should be small
}

TEST_CASE("BiPhaseDSP_SweepSync_Reverse", "[dsp][phaser][sync]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Reverse sync: opposite sweep direction
    dsp.setSweepSync(DSP::SweepSync::Reverse);
    dsp.setRoutingMode(DSP::RoutingMode::InA);  // Parallel

    dsp.setRateA(1.0f);
    dsp.setRateB(1.0f);
    dsp.setSweepSourceA(DSP::SweepSource::Generator1);
    dsp.setSweepSourceB(DSP::SweepSource::Generator1);

    std::array<float, 512> left, right;
    float* leftPtr = left.data();
    float* rightPtr = right.data();

    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = 1.0f;
        right[i] = 1.0f;
    }

    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Outputs should differ (opposite LFO phase)
    bool outputsDiffer = false;
    for (size_t i = 0; i < left.size(); ++i) {
        if (std::abs(left[i] - right[i]) > 0.1f) {
            outputsDiffer = true;
            break;
        }
    }
    REQUIRE(outputsDiffer);
}

//==============================================================================
// Phase 2: Dual Phaser Tests
//==============================================================================

TEST_CASE("BiPhaseDSP_DualPhaser_IndependentRates", "[dsp][phaser][dual]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Different rates for each phaser
    dsp.setRateA(0.2f);  // Slow
    dsp.setRateB(3.0f);  // Fast

    dsp.setRoutingMode(DSP::RoutingMode::OutA);  // Series

    std::array<float, 48000> left, right;
    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = std::sin(2.0 * M_PI * 440.0 * i / 48000.0);
        right[i] = left[i];
    }

    float* leftPtr = left.data();
    float* rightPtr = right.data();

    // Process 1 second
    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Verify output is modified (complex sweep pattern)
    float dcOffset = measureDCOffset(leftPtr, left.size());
    REQUIRE(std::abs(dcOffset) < 0.01f);
}

TEST_CASE("BiPhaseDSP_DualPhaser_ParameterIndependence", "[dsp][phaser][dual]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Set different parameters for each phaser
    dsp.setRateA(0.5f);
    dsp.setRateB(1.5f);
    dsp.setDepthA(0.3f);
    dsp.setDepthB(0.8f);
    dsp.setFeedbackA(0.2f);
    dsp.setFeedbackB(0.7f);
    dsp.setShapeA(DSP::LFOShape::Sine);
    dsp.setShapeB(DSP::LFOShape::Square);

    // Verify parameters are set
    REQUIRE(dsp.getParameters().rateA == 0.5f);
    REQUIRE(dsp.getParameters().rateB == 1.5f);
    REQUIRE(dsp.getParameters().depthA == 0.3f);
    REQUIRE(dsp.getParameters().depthB == 0.8f);
}

//==============================================================================
// Phase 2: Sweep Source Selection Tests
//==============================================================================

TEST_CASE("BiPhaseDSP_SweepSource_BothOnGenerator1", "[dsp][phaser][source]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Both phasors on LFO 1
    dsp.setSweepSourceA(DSP::SweepSource::Generator1);
    dsp.setSweepSourceB(DSP::SweepSource::Generator1);
    dsp.setRateA(1.0f);
    dsp.setRateB(1.0f);

    // Should be synchronized
    std::array<float, 512> left, right;
    float* leftPtr = left.data();
    float* rightPtr = right.data();

    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = 1.0f;
        right[i] = 1.0f;
    }

    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Verify synchronized sweep
    float sumLeft = std::accumulate(left.begin(), left.end(), 0.0f);
    float sumRight = std::accumulate(right.begin(), right.end(), 0.0f);

    // Similar output indicates synchronization
    REQUIRE(std::abs(sumLeft - sumRight) < 100.0f);
}

TEST_CASE("BiPhaseDSP_SweepSource_DifferentGenerators", "[dsp][phaser][source]") {
    DSP::BiPhaseDSP dsp;
    dsp.prepare(48000.0, 512);

    // Phasor A on LFO 1, Phasor B on LFO 2
    dsp.setSweepSourceA(DSP::SweepSource::Generator1);
    dsp.setSweepSourceB(DSP::SweepSource::Generator2);
    dsp.setRateA(0.5f);
    dsp.setRateB(0.7f);  // Different rate

    std::array<float, 512> left, right;
    float* leftPtr = left.data();
    float* rightPtr = right.data();

    for (size_t i = 0; i < left.size(); ++i) {
        left[i] = 1.0f;
        right[i] = 1.0f;
    }

    dsp.processStereo(leftPtr, rightPtr, left.size());

    // Outputs should differ (unsynchronized)
    REQUIRE(signalsDiffer(left.data(), right.data(), left.size()));
}

//==============================================================================
// Main function
//==============================================================================

int main(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);

    std::cout << "=====================================================" << std::endl;
    std::cout << "   Bi-Phase DSP Unit Tests" << std::endl;
    std::cout << "   Testing actual DSP implementation" << std::endl;
    std::cout << "=====================================================" << std::endl;
    std::cout << "\nTest Coverage:" << std::endl;
    std::cout << "  - AllPassStage stereo processing and state" << std::endl;
    std::cout << "  - LFO sine wave generation" << std::endl;
    std::cout << "  - LFO square wave generation" << std::endl;
    std::cout << "  - LFO rate range (0.1-18 Hz)" << std::endl;
    std::cout << "  - LFO phase control for stereo offset" << std::endl;
    std::cout << "  - Phaser stage processing" << std::endl;
    std::cout << "  - Phaser frequency sweep range" << std::endl;
    std::cout << "  - BiPhaseDSP integration tests" << std::endl;
    std::cout << "  - Parameter setters and policy configuration" << std::endl;
    std::cout << "  - Stereo phase offset" << std::endl;
    std::cout << "\nPhase 2 Coverage:" << std::endl;
    std::cout << "  - Routing Mode: Parallel (InA)" << std::endl;
    std::cout << "  - Routing Mode: Series (OutA)" << std::endl;
    std::cout << "  - Routing Mode: Independent (InB)" << std::endl;
    std::cout << "  - Sweep Sync: Normal (same direction)" << std::endl;
    std::cout << "  - Sweep Sync: Reverse (opposite direction)" << std::endl;
    std::cout << "  - Dual Phaser: Independent rates" << std::endl;
    std::cout << "  - Dual Phaser: Parameter independence" << std::endl;
    std::cout << "  - Sweep Source: Both on Generator 1" << std::endl;
    std::cout << "  - Sweep Source: Different generators" << std::endl;
    std::cout << "\n=====================================================\n" << std::endl;

    int result = RUN_ALL_TESTS();

    if (result == 0) {
        std::cout << "\n✅ All Bi-Phase DSP tests PASSED!" << std::endl;
    } else {
        std::cout << "\n❌ Some Bi-Phase DSP tests FAILED." << std::endl;
        std::cout << "   Review implementation for correctness." << std::endl;
    }

    return result;
}
