#include <gtest/gtest.h>
#include <chrono>
#include <cmath>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include "../../include/audio/SpatialAnalyzer.h"

class SpatialAnalysisTests : public ::testing::Test {
protected:
    void SetUp() override {
        analyzer = std::make_unique<SpatialAnalyzer>();
    }

    void TearDown() override {
        analyzer.reset();
    }

    // Helper methods for creating test audio
    void createMonoSineWave(juce::AudioBuffer<float>& buffer, float frequency, float amplitude = 0.7f) {
        buffer.setSize(1, 512);
        auto* writePtr = buffer.getWritePointer(0);
        const float sampleRate = 44100.0f;
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int sample = 0; sample < 512; ++sample) {
            float time = sample / sampleRate;
            writePtr[sample] = amplitude * std::sin(twoPi * frequency * time);
        }
    }

    void createStereoSineWave(juce::AudioBuffer<float>& buffer, float leftFreq, float rightFreq, float amplitude = 0.7f) {
        buffer.setSize(2, 512);
        auto* leftChannel = buffer.getWritePointer(0);
        auto* rightChannel = buffer.getWritePointer(1);
        const float sampleRate = 44100.0f;
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int sample = 0; sample < 512; ++sample) {
            float time = sample / sampleRate;
            leftChannel[sample] = amplitude * std::sin(twoPi * leftFreq * time);
            rightChannel[sample] = amplitude * std::sin(twoPi * rightFreq * time);
        }
    }

    void createPerfectlyCorrelatedStereo(juce::AudioBuffer<float>& buffer, float frequency = 440.0f) {
        buffer.setSize(2, 512);
        auto* leftChannel = buffer.getWritePointer(0);
        auto* rightChannel = buffer.getWritePointer(1);
        const float sampleRate = 44100.0f;
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int sample = 0; sample < 512; ++sample) {
            float time = sample / sampleRate;
            float sampleValue = 0.7f * std::sin(twoPi * frequency * time);
            leftChannel[sample] = sampleValue;
            rightChannel[sample] = sampleValue; // Perfect correlation
        }
    }

    void createPerfectlyAntiCorrelatedStereo(juce::AudioBuffer<float>& buffer, float frequency = 440.0f) {
        buffer.setSize(2, 512);
        auto* leftChannel = buffer.getWritePointer(0);
        auto* rightChannel = buffer.getWritePointer(1);
        const float sampleRate = 44100.0f;
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int sample = 0; sample < 512; ++sample) {
            float time = sample / sampleRate;
            float sampleValue = 0.7f * std::sin(twoPi * frequency * time);
            leftChannel[sample] = sampleValue;
            rightChannel[sample] = -sampleValue; // Perfect anti-correlation
        }
    }

    void createHardPannedStereo(juce::AudioBuffer<float>& buffer, float panPosition = 1.0f, float frequency = 440.0f) {
        buffer.setSize(2, 512);
        auto* leftChannel = buffer.getWritePointer(0);
        auto* rightChannel = buffer.getWritePointer(1);
        const float sampleRate = 44100.0f;
        const float twoPi = juce::MathConstants<float>::twoPi;

        // Calculate gain based on pan position (-1.0 = left, 0.0 = center, 1.0 = right)
        float leftGain = std::cos((panPosition + 1.0f) * juce::MathConstants<float>::pi / 4.0f);
        float rightGain = std::sin((panPosition + 1.0f) * juce::MathConstants<float>::pi / 4.0f);

        for (int sample = 0; sample < 512; ++sample) {
            float time = sample / sampleRate;
            float sampleValue = 0.7f * std::sin(twoPi * frequency * time);
            leftChannel[sample] = leftGain * sampleValue;
            rightChannel[sample] = rightGain * sampleValue;
        }
    }

    std::unique_ptr<SpatialAnalyzer> analyzer;
};

// Test 1: Basic initialization with valid parameters
TEST_F(SpatialAnalysisTests, BasicInitialization) {
    EXPECT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize with valid parameters";

    EXPECT_TRUE(analyzer->isReady())
        << "Analyzer should be ready after successful initialization";

    EXPECT_EQ(analyzer->getAnalysisType().toStdString(), "Spatial")
        << "Analysis type should be 'Spatial'";
}

// Test 2: Initialization with invalid parameters
TEST_F(SpatialAnalysisTests, InitializationWithInvalidParameters) {
    EXPECT_FALSE(analyzer->initialize(0.0, 512))
        << "Should not initialize with zero sample rate";
    EXPECT_FALSE(analyzer->initialize(-44100.0, 512))
        << "Should not initialize with negative sample rate";

    EXPECT_FALSE(analyzer->initialize(44100.0, 0))
        << "Should not initialize with zero buffer size";
    EXPECT_FALSE(analyzer->initialize(44100.0, -512))
        << "Should not initialize with negative buffer size";
}

// Test 3: Correlation Coefficient Calculation - Perfect Correlation
TEST_F(SpatialAnalysisTests, CorrelationCoefficientPerfectCorrelation) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for correlation test";

    juce::AudioBuffer<float> perfectlyCorrelated;
    createPerfectlyCorrelatedStereo(perfectlyCorrelated, 1000.0f);

    analyzer->processBlock(perfectlyCorrelated);

    // For perfectly correlated signals, correlation should be +1.0
    double correlation = analyzer->getCorrelationCoefficient();
    EXPECT_NEAR(correlation, 1.0, 0.01)
        << "Perfect correlation should yield +1.0 coefficient, got " << correlation;
}

// Test 4: Correlation Coefficient Calculation - Perfect Anti-Correlation
TEST_F(SpatialAnalysisTests, CorrelationCoefficientPerfectAntiCorrelation) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for anti-correlation test";

    juce::AudioBuffer<float> antiCorrelated;
    createPerfectlyAntiCorrelatedStereo(antiCorrelated, 1000.0f);

    analyzer->processBlock(antiCorrelated);

    // For perfectly anti-correlated signals, correlation should be -1.0
    double correlation = analyzer->getCorrelationCoefficient();
    EXPECT_NEAR(correlation, -1.0, 0.01)
        << "Perfect anti-correlation should yield -1.0 coefficient, got " << correlation;
}

// Test 5: Correlation Coefficient Calculation - Uncorrelated Signals
TEST_F(SpatialAnalysisTests, CorrelationCoefficientUncorrelatedSignals) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for uncorrelated test";

    juce::AudioBuffer<float> uncorrelated;
    createStereoSineWave(uncorrelated, 440.0f, 659.25f); // A4 and E5 - different frequencies

    analyzer->processBlock(uncorrelated);

    // For uncorrelated signals, correlation should be close to 0.0
    double correlation = analyzer->getCorrelationCoefficient();
    EXPECT_NEAR(correlation, 0.0, 0.2)
        << "Uncorrelated signals should yield coefficient near 0.0, got " << correlation;
}

// Test 6: Stereo Width Measurement - Wide Stereo
TEST_F(SpatialAnalysisTests, StereoWidthWideStereo) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for wide stereo test";

    juce::AudioBuffer<float> wideStereo;
    createHardPannedStereo(wideStereo, 0.8f, 1000.0f); // Pan to the right

    analyzer->processBlock(wideStereo);

    double stereoWidth = analyzer->getStereoWidth();
    EXPECT_GT(stereoWidth, 70.0)
        << "Wide stereo should have width > 70%, got " << stereoWidth;
    EXPECT_LE(stereoWidth, 100.0)
        << "Stereo width should not exceed 100%, got " << stereoWidth;
}

// Test 7: Stereo Width Measurement - Mono Signal
TEST_F(SpatialAnalysisTests, StereoWidthMonoSignal) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for mono signal test";

    juce::AudioBuffer<float> monoSignal;
    createMonoSineWave(monoSignal, 1000.0f);
    // Convert mono to stereo by duplicating channel
    juce::AudioBuffer<float> stereoMono(2, 512);
    stereoMono.copyFrom(0, 0, monoSignal, 0, 0, 512);
    stereoMono.copyFrom(1, 0, monoSignal, 0, 0, 512);

    analyzer->processBlock(stereoMono);

    double stereoWidth = analyzer->getStereoWidth();
    EXPECT_NEAR(stereoWidth, 0.0, 1.0)
        << "Mono signal should have width close to 0%, got " << stereoWidth;
}

// Test 8: Mid-Side Analysis
TEST_F(SpatialAnalysisTests, MidSideAnalysis) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for mid-side test";

    juce::AudioBuffer<float> testSignal;
    createHardPannedStereo(testSignal, 0.5f, 1000.0f); // Center-right pan

    analyzer->processBlock(testSignal);

    auto metrics = analyzer->getLatestMetrics();

    // Mid and side levels should be reasonable
    EXPECT_GT(metrics.midLevel, -60.0)
        << "Mid level should be above -60dB";
    EXPECT_GT(metrics.sideLevel, -60.0)
        << "Side level should be above -60dB";

    // M/S ratio should be calculated
    EXPECT_FALSE(std::isnan(metrics.midSideRatio))
        << "M/S ratio should not be NaN";
}

// Test 9: Phase Inversion Detection
TEST_F(SpatialAnalysisTests, PhaseInversionDetection) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for phase inversion test";

    juce::AudioBuffer<float> phaseInverted;
    createPerfectlyAntiCorrelatedStereo(phaseInverted, 1000.0f);

    analyzer->processBlock(phaseInverted);

    auto metrics = analyzer->getLatestMetrics();
    EXPECT_TRUE(metrics.hasPhaseInversion)
        << "Should detect phase inversion in anti-correlated signals";
}

// Test 10: Mono Compatibility Assessment
TEST_F(SpatialAnalysisTests, MonoCompatibilityAssessment) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for mono compatibility test";

    juce::AudioBuffer<float> compatibleSignal;
    createPerfectlyCorrelatedStereo(compatibleSignal, 1000.0f);

    analyzer->processBlock(compatibleSignal);

    double compatibility = analyzer->getMonoCompatibility();
    EXPECT_GT(compatibility, 80.0)
        << "Perfectly correlated signal should have high mono compatibility > 80%";
    EXPECT_LE(compatibility, 100.0)
        << "Compatibility should not exceed 100%";
}

// Test 11: Panning Position Detection
TEST_F(SpatialAnalysisTests, PanningPositionDetection) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for panning detection test";

    // Test left panning
    juce::AudioBuffer<float> leftPanned;
    createHardPannedStereo(leftPanned, -0.8f, 1000.0f);

    analyzer->processBlock(leftPanned);
    auto metrics = analyzer->getLatestMetrics();

    EXPECT_LT(metrics.panningPosition, -0.5)
        << "Left panned signal should have negative panning position";

    // Reset for next test
    analyzer->reset();
    ASSERT_TRUE(analyzer->isReady());

    // Test right panning
    juce::AudioBuffer<float> rightPanned;
    createHardPannedStereo(rightPanned, 0.8f, 1000.0f);

    analyzer->processBlock(rightPanned);
    metrics = analyzer->getLatestMetrics();

    EXPECT_GT(metrics.panningPosition, 0.5)
        << "Right panned signal should have positive panning position";
}

// Test 12: Phase Coherence Analysis
TEST_F(SpatialAnalysisTests, PhaseCoherenceAnalysis) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for phase coherence test";

    juce::AudioBuffer<float> coherentSignal;
    createPerfectlyCorrelatedStereo(coherentSignal, 1000.0f);

    analyzer->processBlock(coherentSignal);

    auto metrics = analyzer->getLatestMetrics();

    // Phase coherence should be calculated and reasonable
    EXPECT_GE(metrics.phaseCoherence, -1.0)
        << "Phase coherence should be >= -1.0";
    EXPECT_LE(metrics.phaseCoherence, 1.0)
        << "Phase coherence should be <= 1.0";
}

// Test 13: Frequency Band Spatial Analysis
TEST_F(SpatialAnalysisTests, FrequencyBandSpatialAnalysis) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for frequency band test";

    juce::AudioBuffer<float> testSignal;
    createStereoSineWave(testSignal, 440.0f, 440.0f); // Same frequency in both channels

    analyzer->processBlock(testSignal);

    auto metrics = analyzer->getLatestMetrics();

    // Frequency band analysis should be populated
    EXPECT_GT(metrics.frequencyBands.size(), 0)
        << "Frequency band analysis should contain data";
    EXPECT_EQ(metrics.frequencyBands.size(), SpatialAnalyzer::NUM_FREQUENCY_BANDS)
        << "Should have data for all frequency bands";
}

// Test 14: Real-Time Performance Requirements
TEST_F(SpatialAnalysisTests, RealTimePerformanceRequirements) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for performance test";

    juce::AudioBuffer<float> testBuffer(2, 512);
    testBuffer.clear();

    auto startTime = std::chrono::high_resolution_clock::now();

    // Process multiple buffers to measure average performance
    const int numIterations = 100;
    for (int i = 0; i < numIterations; ++i) {
        analyzer->processBlock(testBuffer);
        analyzer->getResultsAsJson();
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    double avgTimeMs = (double)duration.count() / (numIterations * 1000.0);

    EXPECT_LT(avgTimeMs, 2.0)
        << "Spatial analysis should process 512 samples in < 2ms, average: "
        << avgTimeMs << "ms";
}

// Test 15: Audio Processing with Mono Input
TEST_F(SpatialAnalysisTests, AudioProcessingWithMonoInput) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for mono input test";

    juce::AudioBuffer<float> monoBuffer;
    createMonoSineWave(monoBuffer, 1000.0f);

    analyzer->processBlock(monoBuffer);

    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should process mono input successfully";

    auto metrics = analyzer->getLatestMetrics();
    EXPECT_NEAR(metrics.correlationCoefficient, 1.0, 0.1)
        << "Mono input should have perfect correlation";
    EXPECT_NEAR(metrics.stereoWidth, 0.0, 1.0)
        << "Mono input should have zero stereo width";
}

// Test 16: Audio Processing with Different Buffer Sizes
TEST_F(SpatialAnalysisTests, AudioProcessingWithDifferentBufferSizes) {
    std::vector<int> bufferSizes = {128, 256, 512, 1024, 2048};

    for (int bufferSize : bufferSizes) {
        analyzer->reset();
        ASSERT_TRUE(analyzer->initialize(44100.0, bufferSize))
            << "Failed to initialize with buffer size: " << bufferSize;

        juce::AudioBuffer<float> testBuffer(2, bufferSize);
        createStereoSineWave(testBuffer, 440.0f, 880.0f);

        analyzer->processBlock(testBuffer);

        juce::String results = analyzer->getResultsAsJson();
        EXPECT_TRUE(results.isNotEmpty())
            << "Should process buffer size " << bufferSize << " successfully";

        auto metrics = analyzer->getLatestMetrics();
        EXPECT_FALSE(std::isnan(metrics.correlationCoefficient))
            << "Correlation should not be NaN for buffer size " << bufferSize;
    }
}

// Test 17: Reset Functionality
TEST_F(SpatialAnalysisTests, ResetFunctionality) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for reset test";

    // Process some audio to populate internal state
    juce::AudioBuffer<float> testBuffer;
    createStereoSineWave(testBuffer, 440.0f, 660.0f);
    analyzer->processBlock(testBuffer);

    // Reset the analyzer
    analyzer->reset();

    EXPECT_TRUE(analyzer->isReady())
        << "Analyzer should still be ready after reset";

    // Should process audio normally after reset
    analyzer->processBlock(testBuffer);
    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should produce results after reset";
}

// Test 18: JSON Output Format Validation
TEST_F(SpatialAnalysisTests, JSONOutputFormatValidation) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for JSON format test";

    juce::AudioBuffer<float> testBuffer;
    createStereoSineWave(testBuffer, 440.0f, 880.0f);
    analyzer->processBlock(testBuffer);

    juce::String results = analyzer->getResultsAsJson();

    // Validate JSON format
    EXPECT_NO_THROW(juce::JSON::parse(results))
        << "Analysis results should be valid JSON";

    // Check for required spatial analysis fields
    EXPECT_TRUE(results.contains("\"analysisType\""))
        << "JSON should contain analysis type";
    EXPECT_TRUE(results.contains("\"correlationCoefficient\""))
        << "JSON should contain correlation coefficient";
    EXPECT_TRUE(results.contains("\"stereoWidth\""))
        << "JSON should contain stereo width";
    EXPECT_TRUE(results.contains("\"midSideRatio\""))
        << "JSON should contain M/S ratio";
    EXPECT_TRUE(results.contains("\"monoCompatibility\""))
        << "JSON should contain mono compatibility";
    EXPECT_TRUE(results.contains("\"hasPhaseInversion\""))
        << "JSON should contain phase inversion flag";
}

// Test 19: Edge Cases - Silent Buffer
TEST_F(SpatialAnalysisTests, EdgeCasesSilentBuffer) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for silent buffer test";

    juce::AudioBuffer<float> silentBuffer(2, 512);
    silentBuffer.clear();

    analyzer->processBlock(silentBuffer);

    auto metrics = analyzer->getLatestMetrics();

    // Should handle silence gracefully
    EXPECT_FALSE(std::isnan(metrics.correlationCoefficient))
        << "Correlation should not be NaN for silent buffer";
    EXPECT_GE(metrics.stereoWidth, 0.0)
        << "Stereo width should be >= 0 for silent buffer";
    EXPECT_LE(metrics.stereoWidth, 100.0)
        << "Stereo width should be <= 100 for silent buffer";
}

// Test 20: Edge Cases - Very Low Level Signal
TEST_F(SpatialAnalysisTests, EdgeCasesVeryLowLevelSignal) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for low level test";

    juce::AudioBuffer<float> lowLevelBuffer;
    createStereoSineWave(lowLevelBuffer, 440.0f, 660.0f, 0.001f); // -60dB level

    analyzer->processBlock(lowLevelBuffer);

    auto metrics = analyzer->getLatestMetrics();

    // Should handle low level signals gracefully
    EXPECT_FALSE(std::isnan(metrics.correlationCoefficient))
        << "Correlation should not be NaN for low level signal";
}

// Test 21: Multi-Channel Processing (more than 2 channels)
TEST_F(SpatialAnalysisTests, MultiChannelProcessing) {
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for multi-channel test";

    // Create a 4-channel buffer
    juce::AudioBuffer<float> multiChannelBuffer(4, 512);
    multiChannelBuffer.clear();

    // Add signal to each channel
    for (int channel = 0; channel < 4; ++channel) {
        auto* channelPtr = multiChannelBuffer.getWritePointer(channel);
        const float frequency = 440.0f * (channel + 1);
        const float sampleRate = 44100.0f;
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int sample = 0; sample < 512; ++sample) {
            float time = sample / sampleRate;
            channelPtr[sample] = 0.5f * std::sin(twoPi * frequency * time);
        }
    }

    analyzer->processBlock(multiChannelBuffer);

    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should handle multi-channel audio successfully";

    auto metrics = analyzer->getLatestMetrics();
    EXPECT_FALSE(std::isnan(metrics.correlationCoefficient))
        << "Should calculate correlation from first two channels of multi-channel buffer";
}