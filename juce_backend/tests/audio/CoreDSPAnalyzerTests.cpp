#include <gtest/gtest.h>
#include <chrono>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include "../../include/audio/CoreDSPAnalyzer.h"

class CoreDSPAnalyzerTests : public ::testing::Test {
protected:
    void SetUp() override {
        // Common setup for tests
    }

    void TearDown() override {
        // Common cleanup for tests
    }
};

// Test 1: Basic initialization with valid parameters
TEST_F(CoreDSPAnalyzerTests, BasicInitialization) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();

    // Should initialize successfully with valid parameters
    EXPECT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize with valid parameters";

    // Check analyzer state after initialization
    EXPECT_TRUE(analyzer->isReady())
        << "Analyzer should be ready after successful initialization";

    EXPECT_EQ(analyzer->getAnalysisType().toStdString(), "CoreDSP")
        << "Analysis type should be 'CoreDSP'";
}

// Test 2: Initialization with invalid parameters
TEST_F(CoreDSPAnalyzerTests, InitializationWithInvalidParameters) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();

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

    // Should fail with non-power-of-2 buffer size
    EXPECT_FALSE(analyzer->initialize(44100.0, 500))
        << "Should not initialize with non-power-of-2 buffer size";
}

// Test 3: FFT Initialization and Configuration
TEST_F(CoreDSPAnalyzerTests, FFTInitialization) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();

    // Initialize with standard parameters
    EXPECT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for FFT test";

    // Verify analyzer is ready after FFT initialization
    EXPECT_TRUE(analyzer->isReady())
        << "Analyzer should be ready after FFT initialization";
}

// Test 4: Audio Processing with Valid Input
TEST_F(CoreDSPAnalyzerTests, AudioProcessingWithValidInput) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for processing test";

    // Create test audio buffer with sine wave at 440Hz
    juce::AudioBuffer<float> testBuffer(1, 512);
    auto* writePtr = testBuffer.getWritePointer(0);

    // Generate 440Hz sine wave
    const float frequency = 440.0f;
    const float sampleRate = 44100.0f;
    const float twoPi = juce::MathConstants<float>::twoPi;

    for (int sample = 0; sample < 512; ++sample) {
        float time = sample / sampleRate;
        writePtr[sample] = std::sin(twoPi * frequency * time);
    }

    // Process the buffer - should not crash
    analyzer->processBlock(testBuffer);

    // Check that analysis results are available
    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Analysis results should not be empty after processing";

    // Verify results contain expected fields
    EXPECT_TRUE(results.contains("\"spectralCentroid\""))
        << "Results should contain spectral centroid";
    EXPECT_TRUE(results.contains("\"spectralRolloff\""))
        << "Results should contain spectral rolloff";
    EXPECT_TRUE(results.contains("\"spectralFlux\""))
        << "Results should contain spectral flux";
}

// Test 5: Audio Processing with Empty Buffer
TEST_F(CoreDSPAnalyzerTests, AudioProcessingWithEmptyBuffer) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for empty buffer test";

    // Test with empty buffer
    juce::AudioBuffer<float> emptyBuffer(1, 512);
    emptyBuffer.clear();

    // Should handle empty buffer gracefully
    analyzer->processBlock(emptyBuffer);

    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should return results even for empty buffer";
}

// Test 6: Audio Processing with Invalid Buffer Size
TEST_F(CoreDSPAnalyzerTests, AudioProcessingWithInvalidBufferSize) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for invalid buffer test";

    // Test with wrong buffer size
    juce::AudioBuffer<float> wrongSizeBuffer(1, 256);

    // Should handle wrong buffer size gracefully (either adapt or report error)
    analyzer->processBlock(wrongSizeBuffer);

    // Results should still be available, possibly with error indicators
    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should return results even for wrong buffer size";
}

// Test 7: Spectral Analysis Accuracy with Sine Wave
TEST_F(CoreDSPAnalyzerTests, SpectralAnalysisAccuracy) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for accuracy test";

    // Create test buffer with 1000Hz sine wave
    juce::AudioBuffer<float> testBuffer(1, 512);
    auto* writePtr = testBuffer.getWritePointer(0);

    const float frequency = 1000.0f;
    const float sampleRate = 44100.0f;
    const float twoPi = juce::MathConstants<float>::twoPi;

    for (int sample = 0; sample < 512; ++sample) {
        float time = sample / sampleRate;
        writePtr[sample] = std::sin(twoPi * frequency * time);
    }

    analyzer->processBlock(testBuffer);
    juce::String results = analyzer->getResultsAsJson();

    // Parse JSON to verify spectral centroid accuracy
    juce::var jsonResult = juce::JSON::parse(results);

    if (auto* resultObject = jsonResult.getDynamicObject()) {
        // Spectral centroid should be close to the sine wave frequency
        double spectralCentroid = resultObject->getProperty("spectralCentroid");

        // Allow ±10Hz tolerance as specified
        EXPECT_LE(std::abs(spectralCentroid - frequency), 10.0)
            << "Spectral centroid accuracy test failed. Expected ~"
            << frequency << "Hz, got " << spectralCentroid << "Hz";
    } else {
        FAIL() << "Failed to parse analysis results as JSON";
    }
}

// Test 8: Real-Time Performance Requirements
TEST_F(CoreDSPAnalyzerTests, RealTimePerformanceRequirements) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for performance test";

    // Create test buffer
    juce::AudioBuffer<float> testBuffer(1, 512);
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

    // Average processing time per buffer should be less than 2ms
    double avgTimeMs = (double)duration.count() / (numIterations * 1000.0);

    EXPECT_LT(avgTimeMs, 2.0)
        << "Real-time performance requirement failed. Average time: "
        << avgTimeMs << "ms, required: < 2.0ms";
}

// Test 9: Multi-Channel Audio Processing
TEST_F(CoreDSPAnalyzerTests, MultiChannelAudioProcessing) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for multi-channel test";

    // Test with stereo buffer
    juce::AudioBuffer<float> stereoBuffer(2, 512);

    // Generate different frequencies for each channel
    auto* leftChannel = stereoBuffer.getWritePointer(0);
    auto* rightChannel = stereoBuffer.getWritePointer(1);

    const float sampleRate = 44100.0f;
    const float twoPi = juce::MathConstants<float>::twoPi;

    for (int sample = 0; sample < 512; ++sample) {
        float time = sample / sampleRate;
        leftChannel[sample] = std::sin(twoPi * 440.0f * time);   // A4 = 440Hz
        rightChannel[sample] = std::sin(twoPi * 880.0f * time);  // A5 = 880Hz
    }

    analyzer->processBlock(stereoBuffer);

    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should process multi-channel audio successfully";

    // Results should contain multi-channel analysis
    EXPECT_TRUE(results.contains("\"channels\""))
        << "Results should contain multi-channel information";
}

// Test 10: Reset Functionality
TEST_F(CoreDSPAnalyzerTests, ResetFunctionality) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for reset test";

    // Process some audio to populate internal state
    juce::AudioBuffer<float> testBuffer(1, 512);
    testBuffer.clear();
    analyzer->processBlock(testBuffer);

    // Reset the analyzer
    analyzer->reset();

    // Should still be ready after reset
    EXPECT_TRUE(analyzer->isReady())
        << "Analyzer should still be ready after reset";

    // Should process audio normally after reset
    analyzer->processBlock(testBuffer);
    juce::String results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should produce results after reset";
}

// Test 11: Error Handling and Edge Cases
TEST_F(CoreDSPAnalyzerTests, ErrorHandlingAndEdgeCases) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();

    // Test processing before initialization
    juce::AudioBuffer<float> testBuffer(1, 512);

    // Should handle processing without initialization gracefully
    analyzer->processBlock(testBuffer);

    juce::String results = analyzer->getResultsAsJson();
    // Results should indicate error or un-initialized state
    EXPECT_TRUE(results.isNotEmpty())
        << "Should return results even before initialization";

    // Now initialize properly
    EXPECT_TRUE(analyzer->initialize(44100.0, 512))
        << "Should initialize after error test";

    // Test with very small buffer after initialization
    juce::AudioBuffer<float> smallBuffer(1, 1);
    analyzer->processBlock(smallBuffer);

    results = analyzer->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should handle very small buffers";
}

// Test 12: JSON Output Format Validation
TEST_F(CoreDSPAnalyzerTests, JSONOutputFormatValidation) {
    auto analyzer = std::make_unique<CoreDSPAnalyzer>();
    ASSERT_TRUE(analyzer->initialize(44100.0, 512))
        << "Failed to initialize for JSON format test";

    // Process test data
    juce::AudioBuffer<float> testBuffer(1, 512);
    testBuffer.clear();
    analyzer->processBlock(testBuffer);

    juce::String results = analyzer->getResultsAsJson();

    // Validate JSON format - if parsing doesn't throw, it's valid JSON
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
}