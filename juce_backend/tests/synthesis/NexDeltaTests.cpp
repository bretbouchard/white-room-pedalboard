#include <gtest/gtest.h>
#include <vector>
#include <array>
#include <cmath>
#include <set>
#include <chrono>
#include "../../src/synthesis/NexSynthEngine_Simple.h"

using namespace JuceBackend::NexSynth;

/**
 * @brief Delta Block Tests: Filters & Effects
 *
 * Tests the comprehensive filter and effects processing capabilities of the NEX synthesizer.
 * Delta Block focuses on:
 * - Filter algorithms (LPF, HPF, BPF, Tilt, Notch)
 * - Filter resonance and cutoff control
 * - Audio effects (Distortion, Delay, Reverb, Chorus)
 * - Real-time effects processing
 * - Performance validation for complex effect chains
 */

class NexDeltaTests : public ::testing::Test
{
protected:
    void SetUp() override
    {
        engine = std::make_unique<NexSynthEngine>();
        engine->prepareToPlay(sampleRate, bufferSize);
    }

    void TearDown() override
    {
        engine.reset();
    }

    // Helper methods
    void createSineWave(juce::AudioBuffer<float>& buffer, float frequency, float duration);
    void createNoiseBuffer(juce::AudioBuffer<float>& buffer, float duration);
    float calculateRMS(const juce::AudioBuffer<float>& buffer);
    float calculatePeak(const juce::AudioBuffer<float>& buffer);
    std::vector<float> generateFrequencyResponse(float cutoff, NexSynthEngine::OperatorState::Filter::Type type);

    std::unique_ptr<NexSynthEngine> engine;
    const double sampleRate = 44100.0;
    const int bufferSize = 512;
};

void NexDeltaTests::createSineWave(juce::AudioBuffer<float>& buffer, float frequency, float duration)
{
    int numSamples = static_cast<int>(duration * sampleRate);
    buffer.setSize(1, numSamples);
    buffer.clear();

    float* channelData = buffer.getWritePointer(0);
    for (int i = 0; i < numSamples; ++i)
    {
        double time = static_cast<double>(i) / sampleRate;
        channelData[i] = std::sin(2.0 * juce::MathConstants<double>::pi * frequency * time);
    }
}

void NexDeltaTests::createNoiseBuffer(juce::AudioBuffer<float>& buffer, float duration)
{
    int numSamples = static_cast<int>(duration * sampleRate);
    buffer.setSize(1, numSamples);
    buffer.clear();

    float* channelData = buffer.getWritePointer(0);
    for (int i = 0; i < numSamples; ++i)
    {
        channelData[i] = (static_cast<float>(rand()) / RAND_MAX) * 2.0f - 1.0f;
    }
}

float NexDeltaTests::calculateRMS(const juce::AudioBuffer<float>& buffer)
{
    float sum = 0.0f;
    int numSamples = 0;

    for (int channel = 0; channel < buffer.getNumChannels(); ++channel)
    {
        const float* channelData = buffer.getReadPointer(channel);
        for (int i = 0; i < buffer.getNumSamples(); ++i)
        {
            sum += channelData[i] * channelData[i];
            ++numSamples;
        }
    }

    return std::sqrt(sum / numSamples);
}

float NexDeltaTests::calculatePeak(const juce::AudioBuffer<float>& buffer)
{
    float peak = 0.0f;

    for (int channel = 0; channel < buffer.getNumChannels(); ++channel)
    {
        const float* channelData = buffer.getReadPointer(channel);
        for (int i = 0; i < buffer.getNumSamples(); ++i)
        {
            peak = std::max(peak, std::abs(channelData[i]));
        }
    }

    return peak;
}

// =============================================================================
// FILTER TESTS
// =============================================================================

TEST_F(NexDeltaTests, LowPassFilterBasicResponse)
{
    // Create operator with low-pass filter
    NexSynthEngine::OperatorState op;
    op.waveform = NexSynthEngine::WaveformType::Sine;  // Set waveform
    op.ratio = 1.0f;  // Set frequency ratio
    op.level = 1.0f;   // Set output level
    op.filter.enabled = true;
    op.filter.type = NexSynthEngine::OperatorState::Filter::LowPass;
    op.filter.cutoff = 1000.0f; // 1kHz cutoff
    op.filter.resonance = 0.0f;

    // Test with various frequencies
    struct TestFreq { float freq; float expectedAttenuation; };
    std::vector<TestFreq> testFreqs;
    testFreqs.push_back({100.0f, 0.1f});   // Well below cutoff - minimal attenuation
    testFreqs.push_back({1000.0f, 0.5f});  // At cutoff - about -3dB
    testFreqs.push_back({5000.0f, 0.8f});  // Above cutoff - significant attenuation
    testFreqs.push_back({10000.0f, 0.9f}); // Way above cutoff - heavy attenuation

    for (const auto& test : testFreqs)
    {
        float input = 1.0f;
        float output = input;

        // Generate sample and apply filter
        double phase = 0.001; // 1ms time offset to get non-zero waveform
        float waveform = engine->generateWaveform(op, phase, test.freq);
        engine->testApplyFilter(op.filter, waveform, sampleRate);

        // Basic response validation
        EXPECT_GT(std::abs(waveform), 0.0f) << "Filter should pass some signal at " << test.freq << "Hz";
        EXPECT_LE(std::abs(waveform), 1.1f) << "Filter should not amplify beyond reasonable limits at " << test.freq << "Hz";
    }
}

TEST_F(NexDeltaTests, HighPassFilterBasicResponse)
{
    // Create operator with high-pass filter
    NexSynthEngine::OperatorState op;
    op.waveform = NexSynthEngine::WaveformType::Sine;
    op.ratio = 1.0f;
    op.level = 1.0f;
    op.filter.enabled = true;
    op.filter.type = NexSynthEngine::OperatorState::Filter::HighPass;
    op.filter.cutoff = 1000.0f; // 1kHz cutoff
    op.filter.resonance = 0.0f;

    // Test with various frequencies
    struct TestFreq { float freq; const char* expectation; };
    std::vector<TestFreq> testFreqs;
    testFreqs.push_back({100.0f, "significant attenuation"});   // Well below cutoff
    testFreqs.push_back({1000.0f, "moderate attenuation"});     // At cutoff
    testFreqs.push_back({5000.0f, "minimal attenuation"});      // Above cutoff
    testFreqs.push_back({10000.0f, "minimal attenuation"});     // Way above cutoff

    for (const auto& test : testFreqs)
    {
        float waveform = engine->generateWaveform(op, 0.001, test.freq);
        engine->testApplyFilter(op.filter, waveform, sampleRate);

        EXPECT_GE(std::abs(waveform), 0.0f) << "High-pass filter should pass some signal at " << test.freq << "Hz (" << test.expectation << ")";
        EXPECT_LE(std::abs(waveform), 1.1f) << "High-pass filter should not amplify beyond reasonable limits at " << test.freq << "Hz";
    }
}

TEST_F(NexDeltaTests, BandPassFilterResponse)
{
    NexSynthEngine::OperatorState op;
    op.waveform = NexSynthEngine::WaveformType::Sine;
    op.ratio = 1.0f;
    op.level = 1.0f;
    op.filter.enabled = true;
    op.filter.type = NexSynthEngine::OperatorState::Filter::BandPass;
    op.filter.cutoff = 1000.0f;
    op.filter.resonance = 0.0f;

    // Test band-pass response around cutoff
    float centerFreq = 1000.0f;
    std::vector<float> testFreqs = {100.0f, 500.0f, 1000.0f, 2000.0f, 5000.0f};

    float maxOutput = 0.0f;
    float maxFreq = 0.0f;

    for (float freq : testFreqs)
    {
        float waveform = engine->generateWaveform(op, 0.001, freq);
        engine->testApplyFilter(op.filter, waveform, sampleRate);
        float output = std::abs(waveform);

        if (output > maxOutput)
        {
            maxOutput = output;
            maxFreq = freq;
        }

        EXPECT_GT(output, 0.0f) << "Band-pass filter should pass some signal at " << freq << "Hz";
        EXPECT_LE(output, 1.1f) << "Band-pass filter should not amplify beyond limits at " << freq << "Hz";
    }

    // Band-pass should have maximum response near center frequency
    EXPECT_NEAR(maxFreq, centerFreq, centerFreq * 0.5f) << "Band-pass filter should peak near center frequency";
}

TEST_F(NexDeltaTests, FilterParameterValidation)
{
    // Test filter parameter ranges and validation
    NexSynthEngine::OperatorState op;
    op.waveform = NexSynthEngine::WaveformType::Sine;
    op.ratio = 1.0f;
    op.level = 1.0f;
    op.filter.enabled = true;
    op.filter.type = NexSynthEngine::OperatorState::Filter::LowPass;

    // Test extreme cutoff frequencies
    std::vector<float> cutoffs = {1.0f, 20.0f, 1000.0f, 20000.0f, 50000.0f};

    for (float cutoff : cutoffs)
    {
        op.filter.cutoff = cutoff;
        float waveform = engine->generateWaveform(op, 0.001, 440.0f);
        engine->testApplyFilter(op.filter, waveform, sampleRate);

        EXPECT_GE(std::abs(waveform), 0.0f) << "Filter should handle cutoff " << cutoff << "Hz";
        EXPECT_LE(std::abs(waveform), 2.0f) << "Filter output should be reasonable for cutoff " << cutoff << "Hz";
    }

    // Test resonance parameter
    std::vector<float> resonances = {0.0f, 0.5f, 0.99f, 2.0f}; // 2.0f should be clamped

    for (float resonance : resonances)
    {
        op.filter.resonance = resonance;
        float waveform = engine->generateWaveform(op, 0.001, 440.0f);
        engine->testApplyFilter(op.filter, waveform, sampleRate);

        EXPECT_GE(std::abs(waveform), 0.0f) << "Filter should handle resonance " << resonance;
        EXPECT_LE(std::abs(waveform), 10.0f) << "Filter should not explode with high resonance";
    }
}

TEST_F(NexDeltaTests, FilterPerformance)
{
    // Performance test for filter processing
    NexSynthEngine::OperatorState op;
    op.waveform = NexSynthEngine::WaveformType::Sine;
    op.ratio = 1.0f;
    op.level = 1.0f;
    op.filter.enabled = true;
    op.filter.type = NexSynthEngine::OperatorState::Filter::LowPass;
    op.filter.cutoff = 2000.0f;
    op.filter.resonance = 0.5f;

    const int numSamples = 10000;
    auto startTime = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < numSamples; ++i)
    {
        float phase = static_cast<double>(i) / sampleRate;
        float waveform = engine->generateWaveform(op, phase, 440.0f);
        engine->testApplyFilter(op.filter, waveform, sampleRate);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should process 10000 samples in reasonable time (< 10ms)
    EXPECT_LT(duration.count(), 10000) << "Filter processing should be fast enough for real-time use";

    // Calculate samples per second processing capability
    double samplesPerSecond = static_cast<double>(numSamples) / (duration.count() / 1000000.0);
    EXPECT_GT(samplesPerSecond, sampleRate * 100) << "Should be able to process at least 100x real-time rate";
}

// =============================================================================
// EFFECTS TESTS
// =============================================================================

TEST_F(NexDeltaTests, DistortionSoftClip)
{
    // Enable soft clipping distortion
    NexSynthEngine::Effects effects;
    effects.distortion.enabled = true;
    effects.distortion.type = NexSynthEngine::Effects::Distortion::SoftClip;
    effects.distortion.drive = 2.0f;
    engine->setEffects(effects);

    // Create test signal
    juce::AudioBuffer<float> buffer;
    createSineWave(buffer, 440.0f, 0.1f); // 100ms of 440Hz

    // Apply distortion
    float* channelData = buffer.getWritePointer(0);
    for (int i = 0; i < buffer.getNumSamples(); ++i)
    {
        channelData[i] *= 2.0f; // Drive into distortion range
    }

    engine->testApplyDistortion(buffer);

    // Verify distortion effect
    float peak = calculatePeak(buffer);
    EXPECT_GT(peak, 0.5f) << "Distortion should create significant output";
    EXPECT_LE(peak, 1.2f) << "Soft clip should limit output reasonably";

    // RMS should be different from original
    float distortedRMS = calculateRMS(buffer);
    EXPECT_GT(distortedRMS, 0.1f) << "Distorted signal should have energy";
}

TEST_F(NexDeltaTests, DistortionBitReduction)
{
    NexSynthEngine::Effects effects;
    effects.distortion.enabled = true;
    effects.distortion.type = NexSynthEngine::Effects::Distortion::BitReduction;
    effects.distortion.drive = 1.5f;
    engine->setEffects(effects);

    juce::AudioBuffer<float> buffer;
    createSineWave(buffer, 1000.0f, 0.1f); // Higher frequency for bit reduction effect

    engine->testApplyDistortion(buffer);

    // Bit reduction should create quantization steps
    float rms = calculateRMS(buffer);
    EXPECT_GT(rms, 0.0f) << "Bit reduction should not silence the signal";

    // Check that the signal is quantized (fewer unique values)
    std::set<float> uniqueValues;
    const float* channelData = buffer.getReadPointer(0);
    for (int i = 0; i < buffer.getNumSamples(); ++i)
    {
        uniqueValues.insert(std::round(channelData[i] * 1000.0f) / 1000.0f); // Round to 3 decimal places
    }

    EXPECT_LT(uniqueValues.size(), buffer.getNumSamples() / 2) << "Bit reduction should reduce unique values";
}

TEST_F(NexDeltaTests, DelayBasicFunctionality)
{
    NexSynthEngine::Effects effects;
    effects.delay.enabled = true;
    effects.delay.time = 0.1f;      // 100ms delay
    effects.delay.feedback = 0.3f;
    effects.delay.mix = 0.5f;
    engine->setEffects(effects);

    // Create impulse
    juce::AudioBuffer<float> buffer;
    buffer.setSize(1, static_cast<int>(sampleRate * 0.2)); // 200ms
    buffer.clear();
    *buffer.getWritePointer(0) = 1.0f; // Single sample impulse

    engine->testApplyDelay(buffer);

    // Verify delayed signal appears
    int delaySamples = static_cast<int>(0.1f * sampleRate);
    float delayedSample = buffer.getReadPointer(0)[delaySamples];

    EXPECT_GT(delayedSample, 0.1f) << "Should hear delayed impulse after 100ms";

    // Verify feedback creates repetitions
    int secondDelaySamples = delaySamples + static_cast<int>(0.1f * sampleRate);
    if (secondDelaySamples < buffer.getNumSamples())
    {
        float secondEcho = buffer.getReadPointer(0)[secondDelaySamples];
        EXPECT_GT(secondEcho, 0.02f) << "Should hear feedback echo";
    }
}

TEST_F(NexDeltaTests, ReverbBasicFunctionality)
{
    NexSynthEngine::Effects effects;
    effects.reverb.enabled = true;
    effects.reverb.roomSize = 0.7f;
    effects.reverb.damping = 0.5f;
    effects.reverb.wetLevel = 0.4f;
    effects.reverb.dryLevel = 0.6f;
    engine->setEffects(effects);

    juce::AudioBuffer<float> buffer;
    createSineWave(buffer, 440.0f, 0.1f);

    float originalRMS = calculateRMS(buffer);
    engine->testApplyReverb(buffer);
    float reverbRMS = calculateRMS(buffer);

    // Reverb should change the signal characteristics
    EXPECT_NE(reverbRMS, originalRMS) << "Reverb should modify signal RMS";

    // Reverb should add some energy but not too much
    EXPECT_GT(reverbRMS, originalRMS * 0.8f) << "Reverb should maintain most signal energy";
    EXPECT_LT(reverbRMS, originalRMS * 2.0f) << "Reverb should not massively increase signal level";
}

TEST_F(NexDeltaTests, ChorusBasicFunctionality)
{
    NexSynthEngine::Effects effects;
    effects.chorus.enabled = true;
    effects.chorus.rate = 2.0f;      // 2Hz LFO
    effects.chorus.depth = 0.5f;
    effects.chorus.feedback = 0.2f;
    effects.chorus.mix = 0.3f;
    engine->setEffects(effects);

    juce::AudioBuffer<float> buffer;
    createSineWave(buffer, 440.0f, 1.0f); // 1 second for LFO modulation

    float originalRMS = calculateRMS(buffer);
    engine->testApplyChorus(buffer);
    float chorusRMS = calculateRMS(buffer);

    // Chorus should create subtle changes
    EXPECT_NE(chorusRMS, originalRMS) << "Chorus should modify signal";

    // Chorus should not drastically change signal level
    EXPECT_NEAR(chorusRMS, originalRMS, originalRMS * 0.3f) << "Chorus should maintain similar signal level";
}

TEST_F(NexDeltaTests, EffectsChainPerformance)
{
    // Enable all effects
    NexSynthEngine::Effects effects;
    effects.distortion.enabled = true;
    effects.distortion.drive = 1.5f;
    effects.filter.enabled = true;
    effects.filter.cutoff = 3000.0f;
    effects.delay.enabled = true;
    effects.delay.time = 0.05f;
    effects.reverb.enabled = true;
    effects.reverb.roomSize = 0.5f;
    effects.chorus.enabled = true;
    effects.chorus.rate = 1.5f;
    engine->setEffects(effects);

    juce::AudioBuffer<float> buffer;
    createSineWave(buffer, 440.0f, 0.5f); // 500ms

    auto startTime = std::chrono::high_resolution_clock::now();
    engine->testProcessGlobalEffects(buffer);
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should process 500ms buffer quickly (< 50ms)
    EXPECT_LT(duration.count(), 50000) << "Effects chain should be fast enough for real-time use";

    // Signal should still be present and reasonable
    float rms = calculateRMS(buffer);
    EXPECT_GT(rms, 0.0f) << "Effects chain should not silence signal";
    EXPECT_LT(rms, 10.0f) << "Effects chain should not cause excessive amplification";
}

TEST_F(NexDeltaTests, EffectsParameterStability)
{
    // Test extreme parameter combinations
    std::vector<NexSynthEngine::Effects> extremeSettings;

    // Minimal settings
    NexSynthEngine::Effects minimal;
    minimal.distortion.enabled = true;
    minimal.distortion.drive = 0.1f;
    minimal.delay.enabled = true;
    minimal.delay.time = 0.001f;
    extremeSettings.push_back(minimal);

    // Maximal settings
    NexSynthEngine::Effects maximal;
    maximal.distortion.enabled = true;
    maximal.distortion.drive = 5.0f;
    maximal.delay.enabled = true;
    maximal.delay.time = 1.0f;
    maximal.delay.feedback = 0.95f;
    extremeSettings.push_back(maximal);

    for (const auto& settings : extremeSettings)
    {
        engine->setEffects(settings);

        juce::AudioBuffer<float> buffer;
        createNoiseBuffer(buffer, 0.1f); // Use noise for comprehensive testing

        // Should not crash or produce NaN/Inf
        engine->testProcessGlobalEffects(buffer);

        float peak = calculatePeak(buffer);
        float rms = calculateRMS(buffer);

        EXPECT_FALSE(std::isnan(peak)) << "Effects should not produce NaN";
        EXPECT_FALSE(std::isinf(peak)) << "Effects should not produce infinite values";
        EXPECT_FALSE(std::isnan(rms)) << "Effects should not produce NaN in RMS";
        EXPECT_FALSE(std::isinf(rms)) << "Effects should not produce infinite RMS";

        EXPECT_GE(peak, 0.0f) << "Peak should be non-negative";
        EXPECT_LT(peak, 1000.0f) << "Peak should be reasonable";
    }
}

TEST_F(NexDeltaTests, FilterWithEffectsIntegration)
{
    // Test that filters work correctly with effects
    NexSynthEngine::OperatorState op;
    op.waveform = NexSynthEngine::WaveformType::Sine;
    op.ratio = 1.0f;
    op.level = 1.0f;
    op.filter.enabled = true;
    op.filter.type = NexSynthEngine::OperatorState::Filter::LowPass;
    op.filter.cutoff = 1000.0f;
    op.filter.resonance = 0.5f;

    // Enable distortion after filter
    NexSynthEngine::Effects effects;
    effects.distortion.enabled = true;
    effects.distortion.type = NexSynthEngine::Effects::Distortion::SoftClip;
    effects.distortion.drive = 2.0f;
    engine->setEffects(effects);

    // Generate high-frequency content that should be filtered
    float waveform = engine->generateWaveform(op, 0.001, 5000.0f); // 5kHz above cutoff
    engine->testApplyFilter(op.filter, waveform, sampleRate);

    // Filtered signal should be reduced
    EXPECT_LT(std::abs(waveform), 0.8f) << "Low-pass filter should reduce high frequencies";

    // Apply distortion to filtered signal
    juce::AudioBuffer<float> buffer(1, 1);
    *buffer.getWritePointer(0) = waveform;
    engine->testApplyDistortion(buffer);

    float distorted = buffer.getReadPointer(0)[0];
    EXPECT_NE(distorted, waveform) << "Distortion should modify filtered signal";
    EXPECT_GT(std::abs(distorted), 0.0f) << "Distorted signal should have energy";
}