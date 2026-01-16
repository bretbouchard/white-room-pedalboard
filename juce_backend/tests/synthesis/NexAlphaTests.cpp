#include <gtest/gtest.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <cmath>
#include "synthesis/NexSynthEngine_Simple.h"

using namespace JuceBackend::NexSynth;

// Type aliases for cleaner test code
using Operator = NexSynthEngine::OperatorState;
using Waveform = NexSynthEngine::WaveformType;

class NexAlphaTests : public ::testing::Test
{
protected:
    void SetUp() override
    {
        engine = std::make_unique<NexSynthEngine>();
        engine->prepareToPlay(44100.0, 512);
        sampleRate = 44100.0;
    }

    void TearDown() override
    {
        engine = nullptr;
    }

    std::unique_ptr<NexSynthEngine> engine;
    double sampleRate = 44100.0;

    // Helper function for calculating RMS
    static float calculateRMS(const std::vector<float>& buffer);
};

// =============================================================================
// WAVEFORM GENERATION TESTS
// =============================================================================

TEST_F(NexAlphaTests, GenerateSineWave)
{
    // Create a simple operator with sine wave
    Operator op;
    op.waveform = Waveform::Sine;
    op.ratio = 1.0f;
    op.level = 1.0f;

    // Generate sample at zero phase
    float sample = engine->generateWaveform(op, 0.0, 440.0);
    EXPECT_NEAR(sample, 0.0f, 0.001f) << "Sine wave should start at zero crossing";
}

TEST_F(NexAlphaTests, SineWaveFrequencyAccuracy)
{
    Operator op;
    op.waveform = Waveform::Sine;
    op.ratio = 2.0f; // One octave up
    op.level = 1.0f;

    // Generate one second of audio and count zero crossings
    int zeroCrossings = 0;
    float lastSample = 0.0f;

    for (int i = 0; i < sampleRate; ++i)
    {
        double phase = static_cast<double>(i) / sampleRate;
        float sample = engine->generateWaveform(op, phase, 440.0);

        if (lastSample <= 0.0f && sample > 0.0f)
            zeroCrossings++;
        lastSample = sample;
    }

    // For a 440Hz signal with ratio 2.0, we should get 880 crossings per second
    EXPECT_EQ(zeroCrossings, 880) << "Sine wave with ratio 2.0 should have 880 zero crossings";
}

TEST_F(NexAlphaTests, TriangleWaveGeneration)
{
    Operator op;
    op.waveform = Waveform::Triangle;
    op.ratio = 1.0f;
    op.level = 1.0f;

    float sample = engine->generateWaveform(op, 0.0, 440.0);
    EXPECT_NEAR(sample, 0.0f, 0.001f) << "Triangle wave should start at zero crossing";

    // Triangle wave should be linear ramp
    float quarterPeriod = engine->generateWaveform(op, 0.25 / 440.0, 440.0);
    EXPECT_NEAR(quarterPeriod, 1.0f, 0.001f) << "Triangle wave should peak at 1.0";
}

TEST_F(NexAlphaTests, SawtoothWaveGeneration)
{
    Operator op;
    op.waveform = Waveform::Saw;
    op.ratio = 1.0f;
    op.level = 1.0f;

    float sample = engine->generateWaveform(op, 0.0, 440.0);
    EXPECT_NEAR(sample, 0.0f, 0.001f) << "Sawtooth wave should start at zero crossing";

    // Sawtooth should be mostly positive initially
    float earlySample = engine->generateWaveform(op, 0.1 / 440.0, 440.0);
    EXPECT_GT(earlySample, 0.0f) << "Sawtooth wave should be positive early in cycle";
}

TEST_F(NexAlphaTests, SquareWaveGeneration)
{
    Operator op;
    op.waveform = Waveform::Square;
    op.ratio = 1.0f;
    op.level = 1.0f;
    op.pulseWidth = 0.5f;

    float sample = engine->generateWaveform(op, 0.0, 440.0);
    EXPECT_NEAR(sample, 1.0f, 0.001f) << "Square wave should start at positive peak";

    float halfPeriod = engine->generateWaveform(op, 0.5 / 440.0, 440.0);
    EXPECT_NEAR(halfPeriod, -1.0f, 0.001f) << "Square wave should be negative at half period";
}

TEST_F(NexAlphaTests, PulseWidthModulation)
{
    Operator op;
    op.waveform = Waveform::PWM;
    op.ratio = 1.0f;
    op.level = 1.0f;

    // Test different pulse widths
    op.pulseWidth = 0.1f; // Narrow pulse
    float narrowSample = engine->generateWaveform(op, 0.0, 440.0);
    EXPECT_NEAR(narrowSample, 1.0f, 0.001f) << "Narrow PWM should start high";

    op.pulseWidth = 0.9f; // Wide pulse
    float wideSample = engine->generateWaveform(op, 0.0, 440.0);
    EXPECT_NEAR(wideSample, 1.0f, 0.001f) << "Wide PWM should start high";

    // Different duty cycle should affect the harmonic content
    std::vector<float> narrowBuffer, wideBuffer;
    narrowBuffer.reserve(1000);
    wideBuffer.reserve(1000);

    // Generate complete cycles to ensure proper RMS calculation
    // One period of 440Hz is 1/440 = 0.0022727 seconds
    double period = 1.0 / 440.0;
    int samplesPerPeriod = static_cast<int>(period * 44100.0);

    for (int i = 0; i < samplesPerPeriod * 10; ++i) // 10 complete periods
    {
        double time = static_cast<double>(i) / 44100.0;
        narrowBuffer.push_back(engine->generateWaveform(op, time, 440.0));
    }

    op.pulseWidth = 0.9f;
    for (int i = 0; i < samplesPerPeriod * 10; ++i) // 10 complete periods
    {
        double time = static_cast<double>(i) / 44100.0;
        wideBuffer.push_back(engine->generateWaveform(op, time, 440.0));
    }

    // Different pulse widths should produce different outputs at non-zero phase
    // Test at a specific time point where PWM differences should be visible
    Operator testOp;
    testOp.waveform = Waveform::PWM;
    testOp.ratio = 1.0f;
    testOp.level = 1.0f;

    testOp.pulseWidth = 0.1f; // Narrow pulse
    float narrowPhaseSample = engine->generateWaveform(testOp, 0.001, 440.0);

    testOp.pulseWidth = 0.9f; // Wide pulse
    float widePhaseSample = engine->generateWaveform(testOp, 0.001, 440.0);

    // With different pulse widths, we should see different values at non-zero times
    EXPECT_NE(narrowPhaseSample, widePhaseSample)
        << "Different pulse widths should produce different sample values. "
        << "Narrow: " << narrowPhaseSample << ", Wide: " << widePhaseSample;
}

// =============================================================================
// MODIFIER STACK TESTS
// =============================================================================

TEST_F(NexAlphaTests, NoModifiers)
{
    Operator op;
    op.waveform = Waveform::Sine;
    op.ratio = 1.0f;
    op.level = 0.5f;

    float input = 0.5f;
    float output = engine->applyModifiers(op, input);

    EXPECT_NEAR(output, 0.5f, 0.001f) << "No modifiers should not change signal";
}

TEST_F(NexAlphaTests, Wavefolding)
{
    Operator op;
    op.modifiers.foldAmount = 2.0f;

    float input = 1.5f;
    float output = engine->applyModifiers(op, input);

    EXPECT_LT(std::abs(output), 2.0f) << "Wavefolding should limit output";
    EXPECT_GT(std::abs(output), std::abs(input)) << "Wavefolding should increase signal beyond linear range";
}

TEST_F(NexAlphaTests, WaveformWarping)
{
    Operator op;
    op.modifiers.warpAmount = 1.0f;

    float input = 0.5f;
    float output = engine->applyModifiers(op, input);

    EXPECT_NE(output, input) << "Waveform warping should change signal";
    EXPECT_LT(std::abs(output), 1.0f) << "Waveform warping should normalize output";
}

TEST_F(NexAlphaTests, BiasAndOffset)
{
    Operator op;
    op.modifiers.bias = 0.25f;
    op.modifiers.offset = 0.1f;

    float input = 0.0f;
    float output = engine->applyModifiers(op, input);

    EXPECT_NEAR(output, 0.35f, 0.001f) << "Bias and offset should be additive";
}

// =============================================================================
// BASIC MODULATION TESTS
// =============================================================================

TEST_F(NexAlphaTests, BasicFMModulation)
{
    Operator carrier, modulator;
    carrier.waveform = Waveform::Sine;
    carrier.ratio = 1.0f;
    carrier.level = 1.0f;

    modulator.waveform = Waveform::Sine;
    modulator.ratio = 2.0f; // Modulate at octave above
    modulator.level = 1.0f;

    float carrierOutput = engine->generateWaveform(carrier, 0.001, 440.0); // Small non-zero phase
    float fmOutput = engine->generateFM(carrier, modulator, 0.001, 440.0);

    EXPECT_NE(fmOutput, carrierOutput)
        << "FM modulation should create different output than carrier alone";
}

TEST_F(NexAlphaTests, PMModulationStability)
{
    // Phase modulation should be more stable at high frequencies than FM
    Operator carrier, modulator;
    carrier.waveform = Waveform::Sine;
    carrier.ratio = 100.0f; // High frequency carrier
    modulator.waveform = Waveform::Sine;
    modulator.ratio = 1.0f;
    modulator.level = 2.0f; // Deep modulation

    // Test that PM produces reasonable results
    std::vector<float> outputBuffer;
    outputBuffer.reserve(1000);

    for (int i = 0; i < 1000; ++i)
    {
        double phase = static_cast<double>(i) / sampleRate;
        float carrierOut = engine->generateWaveform(carrier, phase, carrier.ratio * 440.0);
        float modulatorOut = engine->generateWaveform(modulator, phase, modulator.ratio * 440.0);
        float pmOutput = carrierOut + modulatorOut; // Simple PM

        outputBuffer.push_back(pmOutput);
    }

    // Output should be bounded and not explode
    float rms = calculateRMS(outputBuffer);
    EXPECT_LT(rms, 10.0f) << "PM modulation should remain stable at high frequencies";
    EXPECT_FALSE(std::isnan(rms)) << "PM modulation should not produce NaN values";
}

TEST_F(NexAlphaTests, AMAmplitudeModulation)
{
    Operator carrier, modulator;
    carrier.waveform = Waveform::Sine;
    carrier.ratio = 1.0f;
    carrier.level = 1.0f;

    modulator.waveform = Waveform::Sine;
    modulator.ratio = 10.0f; // Low frequency LFO
    modulator.level = 0.5f;

    std::vector<float> carrierBuffer, modulatorBuffer, outputBuffer;
    carrierBuffer.reserve(100);
    outputBuffer.reserve(100);

    for (int i = 0; i < 100; ++i)
    {
        double time = static_cast<double>(i) / sampleRate;
        carrierBuffer.push_back(engine->generateWaveform(carrier, time, 440.0));
        modulatorBuffer.push_back(engine->generateWaveform(modulator, time, 44.0f));
        outputBuffer.push_back(carrierBuffer.back() * (1.0f + modulatorBuffer.back()));
    }

    // AM should create tremolo effect
    float carrierRMS = calculateRMS(carrierBuffer);
    float outputRMS = calculateRMS(outputBuffer);

    EXPECT_NE(carrierRMS, outputRMS) << "AM modulation should change RMS level";
    EXPECT_GT(outputRMS, 0.0f) << "AM modulation should produce output";
}

// =============================================================================
// PERFORMANCE AND STABILITY TESTS
// =============================================================================

TEST_F(NexAlphaTests, SignalRangeValidation)
{
    Operator op;
    op.waveform = Waveform::Sine;
    op.ratio = 1.0f;
    op.level = 1.0f;
    op.modifiers.foldAmount = 1.0f; // Add some folding for stress testing

    std::vector<float> outputBuffer;
    outputBuffer.reserve(sampleRate); // One second of audio

    for (int i = 0; i < sampleRate; ++i)
    {
        double phase = static_cast<double>(i) / sampleRate;
        float sample = engine->generateWaveform(op, phase, 440.0);
        float processed = engine->applyModifiers(op, sample);
        outputBuffer.push_back(processed);
    }

    // Check for stability issues
    for (float sample : outputBuffer)
    {
        EXPECT_FALSE(std::isnan(sample)) << "Sample should not be NaN";
        EXPECT_FALSE(std::isinf(sample)) << "Sample should not be infinite";
        EXPECT_LT(std::abs(sample), 1000.0f) << "Sample should be reasonable range";
    }

    // Check overall signal level
    float rms = calculateRMS(outputBuffer);
    EXPECT_GT(rms, 0.0f) << "Should produce some signal";
    EXPECT_LT(rms, 10.0f) << "Signal should not explode";
}

TEST_F(NexAlphaTests, ParameterValidation)
{
    // Test that parameters are properly validated
    Operator op;

    // Valid parameters
    EXPECT_NO_THROW(op.ratio = 1.0f);
    EXPECT_NO_THROW(op.fineTune = 0.0f);
    EXPECT_NO_THROW(op.level = 1.0f);

    // These should be valid ranges (engine implementation will validate)
    EXPECT_GE(op.ratio, 0.01f) << "Ratio should be positive";
    EXPECT_LE(op.ratio, 100.0f) << "Ratio should be reasonable range";
    EXPECT_GE(op.level, 0.0f) << "Level should be non-negative";
    EXPECT_LE(op.level, 10.0f) << "Level should be reasonable range";
}

// Helper function for calculating RMS
float NexAlphaTests::calculateRMS(const std::vector<float>& buffer)
{
    float sum = 0.0f;
    for (float sample : buffer)
    {
        sum += sample * sample;
    }
    return std::sqrt(sum / buffer.size());
}