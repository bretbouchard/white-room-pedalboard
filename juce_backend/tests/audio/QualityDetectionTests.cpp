#include <gtest/gtest.h>
#include <chrono>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_dsp/juce_dsp.h>
#include <juce_core/juce_core.h>
#include "../../include/audio/QualityDetector.h"

class QualityDetectionTests : public ::testing::Test {
protected:
    void SetUp() override {
        detector = std::make_unique<QualityDetector>();
        sampleRate = 44100.0;
        bufferSize = 512;
    }

    void TearDown() override {
        detector.reset();
    }

    // Helper method to generate test audio with specific problems
    void generateNoisySignal(juce::AudioBuffer<float>& buffer, float noiseLevel = 0.01f) {
        auto numChannels = buffer.getNumChannels();
        auto numSamples = buffer.getNumSamples();

        juce::Random random;

        for (int ch = 0; ch < numChannels; ++ch) {
            auto* channelPtr = buffer.getWritePointer(ch);
            for (int i = 0; i < numSamples; ++i) {
                channelPtr[i] = random.nextFloat() * noiseLevel * 2.0f - noiseLevel;
            }
        }
    }

    // Helper method to generate sine wave with mains hum
    void generateSignalWithHum(juce::AudioBuffer<float>& buffer, float signalFreq = 440.0f,
                               float humFreq = 60.0f, float humLevel = 0.1f) {
        auto numChannels = buffer.getNumChannels();
        auto numSamples = buffer.getNumSamples();
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int ch = 0; ch < numChannels; ++ch) {
            auto* channelPtr = buffer.getWritePointer(ch);
            for (int i = 0; i < numSamples; ++i) {
                float time = i / sampleRate;
                float signal = std::sin(twoPi * signalFreq * time) * 0.5f;
                float hum = std::sin(twoPi * humFreq * time) * humLevel;
                channelPtr[i] = signal + hum;
            }
        }
    }

    // Helper method to generate clipped signal
    void generateClippedSignal(juce::AudioBuffer<float>& buffer, float clipThreshold = 0.9f) {
        auto numChannels = buffer.getNumChannels();
        auto numSamples = buffer.getNumSamples();
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int ch = 0; ch < numChannels; ++ch) {
            auto* channelPtr = buffer.getWritePointer(ch);
            for (int i = 0; i < numSamples; ++i) {
                float time = i / sampleRate;
                float signal = std::sin(twoPi * 440.0f * time) * 1.2f; // Intentionally over-amplified

                // Simulate clipping
                if (signal > clipThreshold) signal = clipThreshold;
                if (signal < -clipThreshold) signal = -clipThreshold;

                channelPtr[i] = signal;
            }
        }
    }

    // Helper method to generate signal with DC offset
    void generateSignalWithDCOffset(juce::AudioBuffer<float>& buffer, float dcOffset = 0.1f) {
        auto numChannels = buffer.getNumChannels();
        auto numSamples = buffer.getNumSamples();
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int ch = 0; ch < numChannels; ++ch) {
            auto* channelPtr = buffer.getWritePointer(ch);
            for (int i = 0; i < numSamples; ++i) {
                float time = i / sampleRate;
                float signal = std::sin(twoPi * 440.0f * time) * 0.5f + dcOffset;
                channelPtr[i] = signal;
            }
        }
    }

    // Helper method to generate signal with clicks
    void generateSignalWithClicks(juce::AudioBuffer<float>& buffer, int numClicks = 3) {
        auto numChannels = buffer.getNumChannels();
        auto numSamples = buffer.getNumSamples();
        const float twoPi = juce::MathConstants<float>::twoPi;

        // Generate clean signal first
        for (int ch = 0; ch < numChannels; ++ch) {
            auto* channelPtr = buffer.getWritePointer(ch);
            for (int i = 0; i < numSamples; ++i) {
                float time = i / sampleRate;
                channelPtr[i] = std::sin(twoPi * 440.0f * time) * 0.3f;
            }
        }

        // Add clicks at random positions
        juce::Random random;
        for (int click = 0; click < numClicks; ++click) {
            int clickPos = random.nextInt(numSamples);
            float clickAmplitude = random.nextFloat() * 0.8f + 0.2f;

            for (int ch = 0; ch < numChannels; ++ch) {
                auto* channelPtr = buffer.getWritePointer(ch);
                if (clickPos < numSamples) {
                    channelPtr[clickPos] += (random.nextFloat() > 0.5f ? clickAmplitude : -clickAmplitude);
                }
            }
        }
    }

    std::unique_ptr<QualityDetector> detector;
    double sampleRate;
    int bufferSize;
};

// Test 1: Basic initialization with valid parameters
TEST_F(QualityDetectionTests, BasicInitialization) {
    EXPECT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize with valid parameters";

    EXPECT_TRUE(detector->isReady())
        << "Detector should be ready after successful initialization";

    EXPECT_EQ(detector->getAnalysisType().toStdString(), "QualityDetection")
        << "Analysis type should be 'QualityDetection'";
}

// Test 2: Initialization with invalid parameters
TEST_F(QualityDetectionTests, InitializationWithInvalidParameters) {
    EXPECT_FALSE(detector->initialize(0.0, bufferSize))
        << "Should not initialize with zero sample rate";

    EXPECT_FALSE(detector->initialize(-sampleRate, bufferSize))
        << "Should not initialize with negative sample rate";

    EXPECT_FALSE(detector->initialize(sampleRate, 0))
        << "Should not initialize with zero buffer size";

    EXPECT_FALSE(detector->initialize(sampleRate, -bufferSize))
        << "Should not initialize with negative buffer size";
}

// Test 3: Configuration management
TEST_F(QualityDetectionTests, ConfigurationManagement) {
    QualityDetector::QualityConfig config;
    config.noiseFloorThreshold = -50.0f;
    config.clippingThreshold = -3.0f;
    config.mainsFrequency = 50.0f;
    config.enableHumDetection = true;

    detector->setConfig(config);

    auto retrievedConfig = detector->getConfig();
    EXPECT_EQ(retrievedConfig.noiseFloorThreshold, config.noiseFloorThreshold)
        << "Configuration should be properly stored and retrieved";
    EXPECT_EQ(retrievedConfig.clippingThreshold, config.clippingThreshold)
        << "Configuration should be properly stored and retrieved";
    EXPECT_EQ(retrievedConfig.mainsFrequency, config.mainsFrequency)
        << "Configuration should be properly stored and retrieved";
    EXPECT_EQ(retrievedConfig.enableHumDetection, config.enableHumDetection)
        << "Configuration should be properly stored and retrieved";
}

// Test 4: Noise floor detection with noisy signal
TEST_F(QualityDetectionTests, NoiseFloorDetection) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for noise detection test";

    // Create buffer with noise
    juce::AudioBuffer<float> noisyBuffer(1, bufferSize);
    generateNoisySignal(noisyBuffer, 0.05f); // Generate -26dB noise

    float noiseFloor;
    bool detected = detector->detectNoiseFloor(noisyBuffer, noiseFloor);

    // In RED phase, this should fail (return false)
    EXPECT_FALSE(detected)
        << "RED phase: Noise floor detection should not be implemented yet";
    EXPECT_EQ(noiseFloor, -120.0f)
        << "RED phase: Should return default value";
}

// Test 5: Mains hum detection (60Hz)
TEST_F(QualityDetectionTests, MainsHumDetection60Hz) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for 60Hz hum detection test";

    // Configure for 60Hz detection
    QualityDetector::QualityConfig config;
    config.mainsFrequency = 60.0f;
    config.enableHumDetection = true;
    detector->setConfig(config);

    // Create buffer with 60Hz hum
    juce::AudioBuffer<float> humBuffer(1, bufferSize);
    generateSignalWithHum(humBuffer, 440.0f, 60.0f, 0.15f);

    float humFrequency, amplitude;
    bool detected = detector->detectMainsHum(humBuffer, humFrequency, amplitude);

    // In RED phase, this should fail (return false)
    EXPECT_FALSE(detected)
        << "RED phase: Mains hum detection should not be implemented yet";
    EXPECT_EQ(humFrequency, 0.0f)
        << "RED phase: Should return default frequency";
    EXPECT_EQ(amplitude, -120.0f)
        << "RED phase: Should return default amplitude";
}

// Test 6: Mains hum detection (50Hz)
TEST_F(QualityDetectionTests, MainsHumDetection50Hz) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for 50Hz hum detection test";

    // Configure for 50Hz detection
    QualityDetector::QualityConfig config;
    config.mainsFrequency = 50.0f;
    config.enableHumDetection = true;
    detector->setConfig(config);

    // Create buffer with 50Hz hum
    juce::AudioBuffer<float> humBuffer(1, bufferSize);
    generateSignalWithHum(humBuffer, 440.0f, 50.0f, 0.15f);

    float humFrequency, amplitude;
    bool detected = detector->detectMainsHum(humBuffer, humFrequency, amplitude);

    // In RED phase, this should fail (return false)
    EXPECT_FALSE(detected)
        << "RED phase: Mains hum detection should not be implemented yet";
}

// Test 7: Clipping detection
TEST_F(QualityDetectionTests, ClippingDetection) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for clipping detection test";

    // Create buffer with clipping
    juce::AudioBuffer<float> clippedBuffer(1, bufferSize);
    generateClippedSignal(clippedBuffer, 0.95f);

    int clippingCount;
    float clippingPercent;
    bool detected = detector->detectClipping(clippedBuffer, clippingCount, clippingPercent);

    // In RED phase, this should fail (return false)
    EXPECT_FALSE(detected)
        << "RED phase: Clipping detection should not be implemented yet";
    EXPECT_EQ(clippingCount, 0)
        << "RED phase: Should return default clipping count";
    EXPECT_EQ(clippingPercent, 0.0f)
        << "RED phase: Should return default clipping percentage";
}

// Test 8: DC offset detection
TEST_F(QualityDetectionTests, DCOffsetDetection) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for DC offset detection test";

    // Create stereo buffer with DC offset
    juce::AudioBuffer<float> dcBuffer(2, bufferSize);
    generateSignalWithDCOffset(dcBuffer, 0.15f);

    float leftOffset, rightOffset;
    bool detected = detector->detectDCOffset(dcBuffer, leftOffset, rightOffset);

    // In RED phase, this should fail (return false)
    EXPECT_FALSE(detected)
        << "RED phase: DC offset detection should not be implemented yet";
    EXPECT_EQ(leftOffset, 0.0f)
        << "RED phase: Should return default left offset";
    EXPECT_EQ(rightOffset, 0.0f)
        << "RED phase: Should return default right offset";
}

// Test 9: Click/pop detection
TEST_F(QualityDetectionTests, ClickDetection) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for click detection test";

    // Create buffer with clicks
    juce::AudioBuffer<float> clickBuffer(1, bufferSize);
    generateSignalWithClicks(clickBuffer, 5);

    int clickCount;
    float maxAmplitude;
    bool detected = detector->detectClicks(clickBuffer, clickCount, maxAmplitude);

    // In RED phase, this should fail (return false)
    EXPECT_FALSE(detected)
        << "RED phase: Click detection should not be implemented yet";
    EXPECT_EQ(clickCount, 0)
        << "RED phase: Should return default click count";
    EXPECT_EQ(maxAmplitude, 0.0f)
        << "RED phase: Should return default amplitude";
}

// Test 10: Phase inversion detection
TEST_F(QualityDetectionTests, PhaseInversionDetection) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for phase inversion detection test";

    // Create stereo buffer with phase inversion
    juce::AudioBuffer<float> phaseBuffer(2, bufferSize);
    auto* leftChannel = phaseBuffer.getWritePointer(0);
    auto* rightChannel = phaseBuffer.getWritePointer(1);

    const float twoPi = juce::MathConstants<float>::twoPi;
    for (int i = 0; i < bufferSize; ++i) {
        float time = i / sampleRate;
        float signal = std::sin(twoPi * 440.0f * time) * 0.5f;
        leftChannel[i] = signal;
        rightChannel[i] = -signal; // Inverted phase
    }

    bool isInverted;
    float correlation;
    bool detected = detector->detectPhaseInversion(phaseBuffer, isInverted, correlation);

    // In RED phase, this should fail (return false)
    EXPECT_FALSE(detected)
        << "RED phase: Phase inversion detection should not be implemented yet";
    EXPECT_FALSE(isInverted)
        << "RED phase: Should return default inversion state";
    EXPECT_EQ(correlation, 1.0f)
        << "RED phase: Should return default correlation";
}

// Test 11: Integration test with real audio file (noisy signal)
TEST_F(QualityDetectionTests, RealNoisyAudioFileProcessing) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for real noisy audio test";

    // Try to load the real noisy signal file
    juce::File noisyFile("/Users/bretbouchard/apps/schill/juce_backend/tools/test_data/audio/problems/noisy_signal.wav");

    if (noisyFile.existsAsFile()) {
        juce::AudioFormatManager formatManager;
        formatManager.registerFormat(new juce::WavAudioFormat(), true);

        std::unique_ptr<juce::AudioFormatReader> reader(formatManager.createReaderFor(noisyFile));
        ASSERT_TRUE(reader != nullptr)
            << "Failed to create reader for noisy_signal.wav";

        juce::AudioBuffer<float> audioBuffer(reader->numChannels, reader->lengthInSamples);
        reader->read(&audioBuffer, 0, reader->lengthInSamples, 0, true, true);

        // Process the real noisy audio
        detector->processBlock(audioBuffer);

        juce::String results = detector->getResultsAsJson();
        EXPECT_TRUE(results.isNotEmpty())
            << "Should return results for real noisy audio";

        // In RED phase, results should be minimal/default
        EXPECT_TRUE(results.contains("\"noiseFloorDbfs\": -120.0"))
            << "RED phase: Should contain default noise floor";
    } else {
        GTEST_SKIP() << "Test audio file not found: noisy_signal.wav";
    }
}

// Test 12: Integration test with real audio file (clipped signal)
TEST_F(QualityDetectionTests, RealClippedAudioFileProcessing) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for real clipped audio test";

    // Try to load the real clipped signal file
    juce::File clippedFile("/Users/bretbouchard/apps/schill/juce_backend/tools/test_data/audio/problems/clipped_signal.wav");

    if (clippedFile.existsAsFile()) {
        juce::AudioFormatManager formatManager;
        formatManager.registerFormat(new juce::WavAudioFormat(), true);

        std::unique_ptr<juce::AudioFormatReader> reader(formatManager.createReaderFor(clippedFile));
        ASSERT_TRUE(reader != nullptr)
            << "Failed to create reader for clipped_signal.wav";

        juce::AudioBuffer<float> audioBuffer(reader->numChannels, reader->lengthInSamples);
        reader->read(&audioBuffer, 0, reader->lengthInSamples, 0, true, true);

        // Process the real clipped audio
        detector->processBlock(audioBuffer);

        juce::String results = detector->getResultsAsJson();
        EXPECT_TRUE(results.isNotEmpty())
            << "Should return results for real clipped audio";

        // In RED phase, results should be minimal/default
        EXPECT_TRUE(results.contains("\"clippingSamples\": 0"))
            << "RED phase: Should contain default clipping count";
    } else {
        GTEST_SKIP() << "Test audio file not found: clipped_signal.wav";
    }
}

// Test 13: Full processing workflow test
TEST_F(QualityDetectionTests, FullProcessingWorkflow) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for workflow test";

    // Create buffer with multiple quality problems
    juce::AudioBuffer<float> problemBuffer(2, bufferSize);
    generateSignalWithHum(problemBuffer, 440.0f, 60.0f, 0.1f);
    generateSignalWithDCOffset(problemBuffer, 0.05f);

    // Add some clipping
    auto* leftChannel = problemBuffer.getWritePointer(0);
    auto* rightChannel = problemBuffer.getWritePointer(1);
    for (int i = 0; i < bufferSize; ++i) {
        if (leftChannel[i] > 0.95f) leftChannel[i] = 0.95f;
        if (leftChannel[i] < -0.95f) leftChannel[i] = -0.95f;
        if (rightChannel[i] > 0.95f) rightChannel[i] = 0.95f;
        if (rightChannel[i] < -0.95f) rightChannel[i] = -0.95f;
    }

    // Process the problematic buffer
    detector->processBlock(problemBuffer);

    // Check that results are generated
    juce::String results = detector->getResultsAsJson();
    EXPECT_TRUE(results.isNotEmpty())
        << "Should generate results for problematic audio";

    // Verify JSON format
    EXPECT_NO_THROW(juce::JSON::parse(results))
        << "Results should be valid JSON";

    // Check required fields exist in RED phase format
    EXPECT_TRUE(results.contains("\"analysisType\""))
        << "Results should contain analysis type";
    EXPECT_TRUE(results.contains("\"noise\""))
        << "Results should contain noise analysis";
    EXPECT_TRUE(results.contains("\"clipping\""))
        << "Results should contain clipping analysis";
    EXPECT_TRUE(results.contains("\"dcOffset\""))
        << "Results should contain DC offset analysis";
    EXPECT_TRUE(results.contains("\"overallQualityScore\""))
        << "Results should contain overall quality score";
}

// Test 14: Real-time performance requirements
TEST_F(QualityDetectionTests, RealTimePerformanceRequirements) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for performance test";

    // Create test buffer
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    testBuffer.clear();

    // Measure processing time
    auto startTime = std::chrono::high_resolution_clock::now();

    // Process multiple buffers to measure average performance
    const int numIterations = 100;
    for (int i = 0; i < numIterations; ++i) {
        detector->processBlock(testBuffer);
        detector->getResultsAsJson();
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Average processing time per buffer should be less than 2ms
    double avgTimeMs = (double)duration.count() / (numIterations * 1000.0);

    EXPECT_LT(avgTimeMs, 2.0)
        << "Real-time performance requirement failed. Average time: "
        << avgTimeMs << "ms, required: < 2.0ms";
}

// Test 15: Reset functionality
TEST_F(QualityDetectionTests, ResetFunctionality) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for reset test";

    // Process some audio to populate internal state
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    generateNoisySignal(testBuffer, 0.05f);
    detector->processBlock(testBuffer);

    // Get initial results
    QualityDetector::QualityResults initialResults = detector->getLatestResults();
    juce::int64 initialTimestamp = initialResults.timestamp;

    // Wait a bit to ensure different timestamp
    juce::Thread::sleep(1);

    // Reset the detector
    detector->reset();

    // Check that results are reset
    QualityDetector::QualityResults resetResults = detector->getLatestResults();
    EXPECT_NE(resetResults.timestamp, initialTimestamp)
        << "Timestamp should change after reset";
    EXPECT_EQ(resetResults.overallQualityScore, 100.0f)
        << "Quality score should be reset to default";
    EXPECT_EQ(resetResults.detectedClicks, 0)
        << "Click count should be reset to default";

    // Should still be ready after reset
    EXPECT_TRUE(detector->isReady())
        << "Detector should still be ready after reset";
}

// Test 16: JSON output format validation
TEST_F(QualityDetectionTests, JSONOutputFormatValidation) {
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for JSON format test";

    // Process test data
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    detector->processBlock(testBuffer);

    juce::String results = detector->getResultsAsJson();

    // Validate JSON format
    EXPECT_NO_THROW(juce::JSON::parse(results))
        << "Analysis results should be valid JSON";

    // Check for required top-level fields
    EXPECT_TRUE(results.contains("\"analysisType\""))
        << "JSON should contain analysis type";
    EXPECT_TRUE(results.contains("\"timestamp\""))
        << "JSON should contain timestamp";
    EXPECT_TRUE(results.contains("\"sampleRate\""))
        << "JSON should contain sample rate";
    EXPECT_TRUE(results.contains("\"bufferSize\""))
        << "JSON should contain buffer size";

    // Check for quality-specific sections
    EXPECT_TRUE(results.contains("\"noise\""))
        << "JSON should contain noise analysis section";
    EXPECT_TRUE(results.contains("\"hum\""))
        << "JSON should contain hum analysis section";
    EXPECT_TRUE(results.contains("\"clipping\""))
        << "JSON should contain clipping analysis section";
    EXPECT_TRUE(results.contains("\"dcOffset\""))
        << "JSON should contain DC offset analysis section";
    EXPECT_TRUE(results.contains("\"clicks\""))
        << "JSON should contain click analysis section";
    EXPECT_TRUE(results.contains("\"phase\""))
        << "JSON should contain phase analysis section";
}