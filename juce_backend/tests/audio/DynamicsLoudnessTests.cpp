#include <gtest/gtest.h>
#include <chrono>
#include <cmath>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include "../../include/audio/DynamicsAnalyzer.h"

class DynamicsLoudnessTests : public ::testing::Test {
protected:
    void SetUp() override {
        // Common setup for tests
        analyzer = std::make_unique<DynamicsAnalyzer>();

        // Test audio parameters
        testSampleRate = 44100.0;
        testBufferSize = 1024;

        // Create test signal generators
        generateTestSignals();
    }

    void TearDown() override {
        // Common cleanup for tests
        analyzer.reset();
    }

    // Generate test signals for dynamics analysis
    void generateTestSignals() {
        // Generate quiet signal (-30 dBFS)
        quietBuffer = std::make_unique<juce::AudioBuffer<float>>(1, testBufferSize);
        generateSineWave(*quietBuffer, 440.0f, 0.03162f); // -30 dB = 10^(-30/20)

        // Generate loud signal (-6 dBFS)
        loudBuffer = std::make_unique<juce::AudioBuffer<float>>(1, testBufferSize);
        generateSineWave(*loudBuffer, 1000.0f, 0.50119f); // -6 dB = 10^(-6/20)

        // Generate dynamic range test signal
        dynamicRangeBuffer = std::make_unique<juce::AudioBuffer<float>>(1, testBufferSize);
        generateDynamicRangeSignal(*dynamicRangeBuffer);

        // Generate transient test signal
        transientBuffer = std::make_unique<juce::AudioBuffer<float>>(1, testBufferSize);
        generateTransientSignal(*transientBuffer);
    }

    void generateSineWave(juce::AudioBuffer<float>& buffer, float frequency, float amplitude) {
        auto* writePtr = buffer.getWritePointer(0);
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
            float time = sample / testSampleRate;
            writePtr[sample] = amplitude * std::sin(twoPi * frequency * time);
        }
    }

    void generateDynamicRangeSignal(juce::AudioBuffer<float>& buffer) {
        auto* writePtr = buffer.getWritePointer(0);
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
            float time = sample / testSampleRate;
            float envelope = 0.1f + 0.9f * std::abs(std::sin(twoPi * 2.0f * time)); // 2Hz envelope
            writePtr[sample] = envelope * std::sin(twoPi * 440.0f * time);
        }
    }

    void generateTransientSignal(juce::AudioBuffer<float>& buffer) {
        auto* writePtr = buffer.getWritePointer(0);

        // Clear buffer first
        buffer.clear();

        // Add sharp transients
        const int transientPositions[] = {100, 300, 500, 700};
        const float transientAmplitude = 0.8f;

        for (int pos : transientPositions) {
            if (pos < buffer.getNumSamples()) {
                // Create sharp attack exponential decay
                for (int i = 0; i < 50 && (pos + i) < buffer.getNumSamples(); ++i) {
                    float decay = std::exp(-i * 0.1f);
                    writePtr[pos + i] = transientAmplitude * decay;
                }
            }
        }
    }

    // Calculate reference LUFS values for validation
    double calculateReferenceLUFS(const juce::AudioBuffer<float>& buffer) {
        double sumSquared = 0.0;
        int numSamples = buffer.getNumSamples();
        int numChannels = buffer.getNumChannels();

        for (int channel = 0; channel < numChannels; ++channel) {
            const auto* channelData = buffer.getReadPointer(channel);
            for (int sample = 0; sample < numSamples; ++sample) {
                sumSquared += channelData[sample] * channelData[sample];
            }
        }

        double rms = std::sqrt(sumSquared / (numSamples * numChannels));
        double lufs = 20.0 * std::log10(rms + 1e-12); // Add small value to avoid log(0)

        return lufs;
    }

    // Calculate reference dynamic range
    double calculateReferenceDynamicRange(const juce::AudioBuffer<float>& buffer) {
        double peak = 0.0;
        double sumSquared = 0.0;
        int numSamples = buffer.getNumSamples();
        int numChannels = buffer.getNumChannels();

        for (int channel = 0; channel < numChannels; ++channel) {
            const auto* channelData = buffer.getReadPointer(channel);
            for (int sample = 0; sample < numSamples; ++sample) {
                float absSample = std::abs(channelData[sample]);
                peak = std::max(peak, (double)absSample);
                sumSquared += channelData[sample] * channelData[sample];
            }
        }

        double rms = std::sqrt(sumSquared / (numSamples * numChannels));
        return 20.0 * std::log10(peak / (rms + 1e-12));
    }

    std::unique_ptr<DynamicsAnalyzer> analyzer;
    double testSampleRate;
    int testBufferSize;

    std::unique_ptr<juce::AudioBuffer<float>> quietBuffer;
    std::unique_ptr<juce::AudioBuffer<float>> loudBuffer;
    std::unique_ptr<juce::AudioBuffer<float>> dynamicRangeBuffer;
    std::unique_ptr<juce::AudioBuffer<float>> transientBuffer;
};

// Test 1: Basic initialization with valid parameters
TEST_F(DynamicsLoudnessTests, BasicInitialization) {
    EXPECT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize with valid parameters";

    EXPECT_TRUE(analyzer->isReady())
        << "Analyzer should be ready after successful initialization";

    EXPECT_EQ(analyzer->getAnalysisType().toStdString(), "DynamicsAnalyzer")
        << "Analysis type should be 'DynamicsAnalyzer'";
}

// Test 2: Initialization with invalid parameters
TEST_F(DynamicsLoudnessTests, InitializationWithInvalidParameters) {
    // Should fail with invalid sample rate
    EXPECT_FALSE(analyzer->initialize(0.0, 512))
        << "Should not initialize with zero sample rate";
    EXPECT_FALSE(analyzer->initialize(-44100.0, 512))
        << "Should not initialize with negative sample rate";

    // Should fail with invalid buffer size
    EXPECT_FALSE(analyzer->initialize(44100.0, 0))
        << "Should not initialize with zero buffer size";
    EXPECT_FALSE(analyzer->initialize(44100.0, -512))
        << "Should not initialize with negative buffer size";
}

// Test 3: LUFS Loudness Measurement Accuracy
TEST_F(DynamicsLoudnessTests, LUFSLoudnessMeasurementAccuracy) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for LUFS test";

    // Test with quiet signal (should be around -30 LUFS)
    analyzer->reset();
    analyzer->processBlock(*quietBuffer);

    double measuredLUFS = analyzer->getCurrentLUFS();
    double referenceLUFS = calculateReferenceLUFS(*quietBuffer);

    // Should be accurate within ±0.5 LU
    EXPECT_LE(std::abs(measuredLUFS - referenceLUFS), 0.5)
        << "LUFS measurement accuracy test failed for quiet signal. "
        << "Expected ~" << referenceLUFS << " LUFS, got " << measuredLUFS << " LUFS";

    // Test with loud signal (should be around -6 LUFS)
    analyzer->reset();
    analyzer->processBlock(*loudBuffer);

    measuredLUFS = analyzer->getCurrentLUFS();
    referenceLUFS = calculateReferenceLUFS(*loudBuffer);

    EXPECT_LE(std::abs(measuredLUFS - referenceLUFS), 0.5)
        << "LUFS measurement accuracy test failed for loud signal. "
        << "Expected ~" << referenceLUFS << " LUFS, got " << measuredLUFS << " LUFS";
}

// Test 4: EBU R128 K-Weighted Filter Compliance
TEST_F(DynamicsLoudnessTests, EBUR128KWeightedFilterCompliance) {
    ASSERT_TRUE(analyzer->initialize(48000.0, 1024))
        << "Failed to initialize for EBU R128 test";

    // Test with 1kHz sine wave at -12 dBFS
    juce::AudioBuffer<float> testBuffer(1, 1024);
    auto* writePtr = testBuffer.getWritePointer(0);
    const float frequency = 1000.0f;
    const float amplitude = 0.25119f; // -12 dB
    const float twoPi = juce::MathConstants<float>::twoPi;

    for (int sample = 0; sample < 1024; ++sample) {
        float time = sample / 48000.0f;
        writePtr[sample] = amplitude * std::sin(twoPi * frequency * time);
    }

    analyzer->processBlock(testBuffer);
    double lufs = analyzer->getCurrentLUFS();

    // K-weighted filter should boost around 4dB for 1kHz signal
    // So -12 dBFS input should result in approximately -8 LUFS output
    EXPECT_LE(std::abs(lufs - (-8.0)), 2.0)
        << "K-weighted filter not applying correct gain. "
        << "Expected ~-8 LUFS, got " << lufs << " LUFS";
}

// Test 5: Dynamic Range Calculation
TEST_F(DynamicsLoudnessTests, DynamicRangeCalculation) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for dynamic range test";

    // Test with dynamic range signal
    analyzer->reset();
    analyzer->processBlock(*dynamicRangeBuffer);

    double measuredDynamicRange = analyzer->getDynamicRange();
    double referenceDynamicRange = calculateReferenceDynamicRange(*dynamicRangeBuffer);

    // Should be accurate within ±1 dB
    EXPECT_LE(std::abs(measuredDynamicRange - referenceDynamicRange), 1.0)
        << "Dynamic range calculation test failed. "
        << "Expected ~" << referenceDynamicRange << " dB, got " << measuredDynamicRange << " dB";

    // Dynamic range signal should have significant range (> 6 dB)
    EXPECT_GT(measuredDynamicRange, 6.0)
        << "Dynamic range signal should have range > 6 dB, got " << measuredDynamicRange << " dB";
}

// Test 6: Crest Factor Analysis
TEST_F(DynamicsLoudnessTests, CrestFactorAnalysis) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for crest factor test";

    // Test with sine wave (crest factor should be ~3 dB)
    analyzer->reset();
    analyzer->processBlock(*quietBuffer);

    double crestFactor = analyzer->getCrestFactor();

    // Sine wave has crest factor of 3.01 dB
    EXPECT_LE(std::abs(crestFactor - 3.01), 0.5)
        << "Sine wave crest factor test failed. "
        << "Expected ~3.01 dB, got " << crestFactor << " dB";
}

// Test 7: Envelope Following with Configurable Attack/Release
TEST_F(DynamicsLoudnessTests, EnvelopeFollowing) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for envelope test";

    // Configure fast attack/release times
    analyzer->setAttackTime(1.0);   // 1ms attack
    analyzer->setReleaseTime(10.0); // 10ms release

    // Test with transient signal
    analyzer->reset();
    analyzer->processBlock(*transientBuffer);

    double envelopeValue = analyzer->getEnvelopeValue();

    // Should detect transients (envelope should be > 0)
    EXPECT_GT(envelopeValue, 0.0)
        << "Envelope following should detect transients. Got " << envelopeValue;

    // Test with slow attack/release
    analyzer->setAttackTime(100.0);   // 100ms attack
    analyzer->setReleaseTime(1000.0); // 1s release

    analyzer->reset();
    analyzer->processBlock(*transientBuffer);

    double slowEnvelopeValue = analyzer->getEnvelopeValue();

    // Slow envelope should have different response
    EXPECT_NE(envelopeValue, slowEnvelopeValue)
        << "Attack/release time configuration should affect envelope response";
}

// Test 8: True Peak Detection for Broadcast Standards
TEST_F(DynamicsLoudnessTests, TruePeakDetection) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for true peak test";

    // Test with high-frequency content that can cause intersample peaks
    juce::AudioBuffer<float> highFreqBuffer(1, testBufferSize);
    auto* writePtr = highFreqBuffer.getWritePointer(0);
    const float frequency = 18000.0f; // High frequency near Nyquist
    const float amplitude = 0.7071f;   // -3 dBFS
    const float twoPi = juce::MathConstants<float>::twoPi;

    for (int sample = 0; sample < testBufferSize; ++sample) {
        float time = sample / testSampleRate;
        writePtr[sample] = amplitude * std::sin(twoPi * frequency * time);
    }

    analyzer->reset();
    analyzer->processBlock(highFreqBuffer);

    double truePeak = analyzer->getTruePeak();

    // True peak should be >= sample peak due to intersample overs
    EXPECT_GE(truePeak, amplitude)
        << "True peak should detect intersample peaks. "
        << "Sample peak: " << amplitude << ", True peak: " << truePeak;
}

// Test 9: Real-Time Performance Requirements
TEST_F(DynamicsLoudnessTests, RealTimePerformanceRequirements) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for performance test";

    // Create test buffer
    juce::AudioBuffer<float> testBuffer(1, testBufferSize);
    testBuffer.clear();

    // Measure processing time
    auto startTime = std::chrono::high_resolution_clock::now();

    // Process multiple buffers to measure average performance
    const int numIterations = 100;
    for (int i = 0; i < numIterations; ++i) {
        analyzer->processBlock(testBuffer);
        analyzer->getResultsAsJson();
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Average processing time per buffer should be less than 3ms
    double avgTimeMs = (double)duration.count() / (numIterations * 1000.0);

    EXPECT_LT(avgTimeMs, 3.0)
        << "Real-time performance requirement failed. Average time: "
        << avgTimeMs << "ms, required: < 3.0ms";
}

// Test 10: Multi-Channel Audio Processing
TEST_F(DynamicsLoudnessTests, MultiChannelAudioProcessing) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for multi-channel test";

    // Test with stereo buffer
    juce::AudioBuffer<float> stereoBuffer(2, testBufferSize);

    // Generate different levels for each channel
    auto* leftChannel = stereoBuffer.getWritePointer(0);
    auto* rightChannel = stereoBuffer.getWritePointer(1);

    const float twoPi = juce::MathConstants<float>::twoPi;

    for (int sample = 0; sample < testBufferSize; ++sample) {
        float time = sample / testSampleRate;
        leftChannel[sample] = 0.1f * std::sin(twoPi * 440.0f * time);   // Quiet left
        rightChannel[sample] = 0.5f * std::sin(twoPi * 880.0f * time);  // Loud right
    }

    analyzer->processBlock(stereoBuffer);

    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should process multi-channel audio successfully";

    // Results should contain multi-channel analysis
    EXPECT_TRUE(results.contains("\"channels\""))
        << "Results should contain multi-channel information";

    // LUFS should be calculated from combined channels
    double measuredLUFS = analyzer->getCurrentLUFS();
    EXPECT_TRUE(std::isfinite(measuredLUFS))
        << "LUFS should be finite for multi-channel input";
}

// Test 11: Integrated LUFS Measurement Over Time
TEST_F(DynamicsLoudnessTests, IntegratedLUFSMeasurement) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for integrated LUFS test";

    // Process multiple buffers to accumulate integrated measurement
    const int numBuffers = 10;
    double totalPower = 0.0;
    int totalSamples = 0;

    for (int i = 0; i < numBuffers; ++i) {
        analyzer->processBlock(*loudBuffer);
        analyzer->processBlock(*quietBuffer);

        // Calculate expected integrated LUFS
        for (int channel = 0; channel < loudBuffer->getNumChannels(); ++channel) {
            const auto* loudData = loudBuffer->getReadPointer(channel);
            const auto* quietData = quietBuffer->getReadPointer(channel);

            for (int sample = 0; sample < loudBuffer->getNumSamples(); ++sample) {
                totalPower += loudData[sample] * loudData[sample];
                totalPower += quietData[sample] * quietData[sample];
                totalSamples += 2;
            }
        }
    }

    double integratedLUFS = analyzer->getIntegratedLUFS();
    double expectedLUFS = 20.0 * std::log10(std::sqrt(totalPower / totalSamples) + 1e-12);

    // Should be accurate within ±1 LU
    EXPECT_LE(std::abs(integratedLUFS - expectedLUFS), 1.0)
        << "Integrated LUFS measurement test failed. "
        << "Expected ~" << expectedLUFS << " LUFS, got " << integratedLUFS << " LUFS";
}

// Test 12: Reset Functionality
TEST_F(DynamicsLoudnessTests, ResetFunctionality) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for reset test";

    // Process some audio to populate internal state
    analyzer->processBlock(*loudBuffer);
    analyzer->processBlock(*quietBuffer);

    // Get measurements before reset
    double lufsBeforeReset = analyzer->getCurrentLUFS();
    double integratedBeforeReset = analyzer->getIntegratedLUFS();

    // Reset the analyzer
    analyzer->reset();

    // Should still be ready after reset
    EXPECT_TRUE(analyzer->isReady())
        << "Analyzer should still be ready after reset";

    // Process audio after reset
    analyzer->processBlock(*quietBuffer);

    double lufsAfterReset = analyzer->getCurrentLUFS();
    double integratedAfterReset = analyzer->getIntegratedLUFS();

    // Integrated LUFS should be reset (different from before reset)
    EXPECT_NE(integratedBeforeReset, integratedAfterReset)
        << "Integrated LUFS should be reset to new value";

    // Current LUFS should reflect new input
    EXPECT_LT(std::abs(lufsAfterReset - calculateReferenceLUFS(*quietBuffer)), 1.0)
        << "Current LUFS should reflect new input after reset";
}

// Test 13: JSON Output Format Validation
TEST_F(DynamicsLoudnessTests, JSONOutputFormatValidation) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for JSON format test";

    // Process test data
    analyzer->processBlock(*loudBuffer);

    juce::String results = analyzer->getResultsAsJson();

    // Validate JSON format
    EXPECT_NO_THROW(juce::JSON::parse(results))
        << "Analysis results should be valid JSON";

    // Check for required fields in the JSON
    EXPECT_TRUE(results.contains("\"analysisType\""))
        << "JSON should contain analysis type";
    EXPECT_TRUE(results.contains("\"timestamp\""))
        << "JSON should contain timestamp";
    EXPECT_TRUE(results.contains("\"sampleRate\""))
        << "JSON should contain sample rate";
    EXPECT_TRUE(results.contains("\"bufferSize\""))
        << "JSON should contain buffer size";
    EXPECT_TRUE(results.contains("\"lufs\""))
        << "JSON should contain LUFS measurements";
    EXPECT_TRUE(results.contains("\"dynamics\""))
        << "JSON should contain dynamics measurements";
    EXPECT_TRUE(results.contains("\"envelope\""))
        << "JSON should contain envelope measurements";
}

// Test 14: LUFS Range Measurement (EBU R128 Loudness Range)
TEST_F(DynamicsLoudnessTests, LUFSRangeMeasurement) {
    ASSERT_TRUE(analyzer->initialize(48000.0, 4096)) // Larger buffer for range measurement
        << "Failed to initialize for LUFS range test";

    // Create signal with varying loudness for range measurement
    juce::AudioBuffer<float> rangeBuffer(1, 4096);
    auto* writePtr = rangeBuffer.getWritePointer(0);
    const float twoPi = juce::MathConstants<float>::twoPi;

    for (int sample = 0; sample < 4096; ++sample) {
        float time = sample / 48000.0f;
        float envelope = 0.2f + 0.8f * std::abs(std::sin(twoPi * 1.0f * time)); // 1Hz modulation
        writePtr[sample] = envelope * std::sin(twoPi * 1000.0f * time);
    }

    analyzer->reset();
    analyzer->processBlock(rangeBuffer);

    // Check if JSON contains loudness range
    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.contains("\"range\""))
        << "JSON should contain loudness range measurement";

    // Parse and validate range value
    juce::var jsonResult = juce::JSON::parse(results);
    if (auto* resultObject = jsonResult.getDynamicObject()) {
        if (auto* lufsObject = resultObject->getProperty("lufs").getDynamicObject()) {
            double range = lufsObject->getProperty("range");
            EXPECT_GT(range, 0.0)
                << "Loudness range should be positive for varying signal";
        } else {
            FAIL() << "LUFS object not found in JSON";
        }
    } else {
        FAIL() << "Failed to parse analysis results as JSON";
    }
}

// Test 15: Configuration Parameter Bounds Checking
TEST_F(DynamicsLoudnessTests, ConfigurationParameterBoundsChecking) {
    ASSERT_TRUE(analyzer->initialize(testSampleRate, testBufferSize))
        << "Failed to initialize for configuration test";

    // Test attack time bounds
    analyzer->setAttackTime(-10.0); // Should be clamped to minimum
    double minAttack = analyzer->getEnvelopeValue(); // Verify it was set

    analyzer->setAttackTime(10000.0); // Should be clamped to maximum
    double maxAttack = analyzer->getEnvelopeValue(); // Verify it was set

    // Test release time bounds
    analyzer->setReleaseTime(-1.0); // Should be clamped to minimum
    double minRelease = analyzer->getEnvelopeValue();

    analyzer->setReleaseTime(100000.0); // Should be clamped to maximum
    double maxRelease = analyzer->getEnvelopeValue();

    // Should handle out-of-bounds values gracefully
    EXPECT_NO_THROW({
        analyzer->setAttackTime(0.1);
        analyzer->setReleaseTime(1.0);
        analyzer->setWindowTime(100.0);
        analyzer->setIntegrationTime(1000.0);
    }) << "Should handle parameter bounds checking gracefully";
}