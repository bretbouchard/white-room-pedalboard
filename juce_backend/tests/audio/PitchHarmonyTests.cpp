#include <gtest/gtest.h>
#include <chrono>
#include <fstream>
#include <cmath>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>
#include "../../include/audio/PitchDetector.h"

class PitchHarmonyTests : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize JUCE audio format manager for loading test files
        juce::AudioFormatManager formatManager;
        formatManager.registerBasicFormats();

        // Initialize test parameters
        sampleRate = 44100.0;
        bufferSize = 2048;

        // Test data path
        testDataPath = juce::File::getCurrentWorkingDirectory().getChildFile("tools/test_data/audio/pitch/");
    }

    void TearDown() override {
        // Cleanup
    }

    // Helper method to load WAV file for testing
    std::unique_ptr<juce::AudioBuffer<float>> loadWavFile(const juce::String& filename) {
        if (!testDataPath.getChildFile(filename).exists()) {
            return nullptr;
        }

        juce::AudioFormatManager formatManager;
        formatManager.registerBasicFormats();

        std::unique_ptr<juce::AudioFormatReader> reader(
            formatManager.createReaderFor(testDataPath.getChildFile(filename)));

        if (reader == nullptr) {
            return nullptr;
        }

        auto buffer = std::make_unique<juce::AudioBuffer<float>>(
            static_cast<int>(reader->numChannels),
            static_cast<int>(reader->lengthInSamples));

        reader->read(buffer.get(), 0, static_cast<int>(reader->lengthInSamples), 0, true, true);

        return buffer;
    }

    // Helper method to generate sine wave for testing
    void generateSineWave(juce::AudioBuffer<float>& buffer, double frequency, double amplitude = 0.7) {
        auto* writePtr = buffer.getWritePointer(0);
        const double twoPi = juce::MathConstants<double>::twoPi;

        for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
            double time = sample / sampleRate;
            writePtr[sample] = static_cast<float>(amplitude * std::sin(twoPi * frequency * time));
        }
    }

    // Helper method to generate complex harmonic signal (like piano)
    void generateHarmonicSignal(juce::AudioBuffer<float>& buffer, double fundamentalFreq) {
        auto* writePtr = buffer.getWritePointer(0);
        const double twoPi = juce::MathConstants<double>::twoPi;

        // Generate fundamental with harmonics (typical piano-like spectrum)
        for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
            double time = sample / sampleRate;
            double value = 0.0;

            // Fundamental (strongest)
            value += 0.6 * std::sin(twoPi * fundamentalFreq * time);

            // Second harmonic (octave)
            value += 0.3 * std::sin(twoPi * fundamentalFreq * 2.0 * time);

            // Third harmonic (fifth above octave)
            value += 0.2 * std::sin(twoPi * fundamentalFreq * 3.0 * time);

            // Fourth harmonic (two octaves above)
            value += 0.1 * std::sin(twoPi * fundamentalFreq * 4.0 * time);

            // Fifth harmonic (major third above two octaves)
            value += 0.05 * std::sin(twoPi * fundamentalFreq * 5.0 * time);

            writePtr[sample] = static_cast<float>(value);
        }
    }

    // Helper method to generate noisy signal
    void generateNoise(juce::AudioBuffer<float>& buffer, double amplitude = 0.1) {
        auto* writePtr = buffer.getWritePointer(0);
        std::srand(static_cast<unsigned>(std::time(nullptr)));

        for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
            writePtr[sample] = static_cast<float>(amplitude * (2.0 * std::rand() / RAND_MAX - 1.0));
        }
    }

    // Helper method to verify pitch accuracy
    bool verifyPitchAccuracy(double detectedFreq, double expectedFreq, double toleranceHz = 2.0) {
        return std::abs(detectedFreq - expectedFreq) <= toleranceHz;
    }

    // Helper method to check if JSON contains required pitch fields
    bool jsonContainsPitchFields(const juce::String& json) {
        return json.contains("\"frequency\"") &&
               json.contains("\"confidence\"") &&
               json.contains("\"isPitched\"") &&
               json.contains("\"midiNote\"") &&
               json.contains("\"centsError\"") &&
               json.contains("\"pitchName\"");
    }

    double sampleRate = 44100.0;
    int bufferSize = 2048;
    juce::File testDataPath;
};

// Test 1: Basic Initialization with Valid Parameters
TEST_F(PitchHarmonyTests, BasicInitialization) {
    auto detector = std::make_unique<PitchDetector>();

    // Should initialize successfully with valid parameters
    EXPECT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize with valid parameters";

    // Check detector state after initialization
    EXPECT_TRUE(detector->isReady())
        << "Detector should be ready after successful initialization";

    EXPECT_EQ(detector->getAnalysisType().toStdString(), "PitchDetector")
        << "Analysis type should be 'PitchDetector'";
}

// Test 2: Initialization with Invalid Parameters
TEST_F(PitchHarmonyTests, InitializationWithInvalidParameters) {
    auto detector = std::make_unique<PitchDetector>();

    // Should fail with invalid sample rate
    EXPECT_FALSE(detector->initialize(0.0, bufferSize))
        << "Should not initialize with zero sample rate";
    EXPECT_FALSE(detector->initialize(-44100.0, bufferSize))
        << "Should not initialize with negative sample rate";

    // Should fail with invalid buffer size
    EXPECT_FALSE(detector->initialize(sampleRate, 0))
        << "Should not initialize with zero buffer size";
    EXPECT_FALSE(detector->initialize(sampleRate, -512))
        << "Should not initialize with negative buffer size";

    // Should fail with non-power-of-2 buffer size
    EXPECT_FALSE(detector->initialize(sampleRate, 1000))
        << "Should not initialize with non-power-of-2 buffer size";
}

// Test 3: Pitch Detection Accuracy with A4 (440Hz)
TEST_F(PitchHarmonyTests, PitchDetectionAccuracyA4_440Hz) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for A4 pitch detection test";

    // Load A4 440Hz test file or generate sine wave
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    auto audioFile = loadWavFile("A4_440.0Hz.wav");

    if (audioFile != nullptr) {
        // Use actual audio file if available
        testBuffer = *audioFile;
    } else {
        // Generate 440Hz sine wave
        generateSineWave(testBuffer, 440.0);
    }

    // Process the audio
    detector->processBlock(testBuffer);

    // Get pitch result
    auto result = detector->getLatestPitchResult();

    // Verify pitch detection accuracy within ±2Hz
    EXPECT_TRUE(verifyPitchAccuracy(result.frequency, 440.0, 2.0))
        << "Pitch detection accuracy failed for A4. Expected ~440Hz, got "
        << result.frequency << "Hz";

    // Verify high confidence for clean sine wave
    EXPECT_GT(result.confidence, 0.9)
        << "Confidence should be high (>0.9) for clean sine wave, got "
        << result.confidence;

    // Verify MIDI note conversion
    EXPECT_EQ(result.midiNote, 69)  // A4 = MIDI note 69
        << "MIDI note should be 69 for A4, got " << result.midiNote;

    // Verify pitch name
    EXPECT_EQ(result.pitchName.toStdString(), "A4")
        << "Pitch name should be 'A4', got '" << result.pitchName << "'";

    // Verify JSON output contains all required fields
    juce::String jsonResult = detector->getResultsAsJson();
    EXPECT_TRUE(jsonContainsPitchFields(jsonResult))
        << "JSON result should contain all pitch detection fields";
}

// Test 4: Pitch Detection Across Musical Range (A3 to A5)
TEST_F(PitchHarmonyTests, PitchDetectionMusicalRange) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for musical range test";

    // Test frequencies: A3 (220Hz) to A5 (880Hz) - one octave above and below A4
    std::vector<std::pair<double, std::string>> testNotes = {
        {220.0, "A3"},   // A3
        {261.63, "C4"},  // Middle C
        {293.66, "D4"},  // D4
        {329.63, "E4"},  // E4
        {349.23, "F4"},  // F4
        {392.0, "G4"},   // G4
        {440.0, "A4"},   // A4 (reference)
        {493.88, "B4"},  // B4
        {523.25, "C5"},  // C5
        {587.33, "D5"},  // D5
        {659.25, "E5"},  // E5
        {698.46, "F5"},  // F5
        {783.99, "G5"},  // G5
        {880.0, "A5"}    // A5
    };

    for (const auto& note : testNotes) {
        juce::AudioBuffer<float> testBuffer(1, bufferSize);
        generateSineWave(testBuffer, note.first);

        detector->reset(); // Reset between tests
        detector->processBlock(testBuffer);

        auto result = detector->getLatestPitchResult();

        // Verify pitch accuracy within ±2Hz
        EXPECT_TRUE(verifyPitchAccuracy(result.frequency, note.first, 2.0))
            << "Pitch detection failed for " << note.second
            << ". Expected ~" << note.first << "Hz, got " << result.frequency << "Hz";

        // Verify high confidence for clean sine waves
        EXPECT_GT(result.confidence, 0.8)
            << "Confidence should be high for " << note.second
            << ", got " << result.confidence;

        // Verify correct pitch name
        EXPECT_EQ(result.pitchName.toStdString(), note.second)
            << "Pitch name mismatch for " << note.second
            << ". Expected '" << note.second << "', got '" << result.pitchName << "'";
    }
}

// Test 5: Piano-like Harmonic Signal Detection
TEST_F(PitchHarmonyTests, PianoLikeHarmonicDetection) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for harmonic detection test";

    // Load piano-like A4 file or generate harmonic signal
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    auto audioFile = loadWavFile("piano_like_A4.wav");

    if (audioFile != nullptr) {
        // Use actual piano-like audio file if available
        testBuffer = *audioFile;
    } else {
        // Generate piano-like harmonic signal
        generateHarmonicSignal(testBuffer, 440.0);
    }

    detector->processBlock(testBuffer);
    auto result = detector->getLatestPitchResult();

    // Verify fundamental detection despite harmonics
    EXPECT_TRUE(verifyPitchAccuracy(result.frequency, 440.0, 5.0)) // Slightly larger tolerance for harmonic signals
        << "Fundamental detection failed for harmonic signal. Expected ~440Hz, got "
        << result.frequency << "Hz";

    // Verify moderate confidence for harmonic signals
    EXPECT_GT(result.confidence, 0.7) // Lower threshold for complex signals
        << "Confidence should be reasonable for harmonic signals, got "
        << result.confidence;

    // Verify pitch is detected
    EXPECT_TRUE(result.isPitched)
        << "Should detect pitch in harmonic signal";
}

// Test 6: Octave Error Prevention
TEST_F(PitchHarmonyTests, OctaveErrorPrevention) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for octave error test";

    // Test with signal that has strong harmonics that could cause octave errors
    juce::AudioBuffer<float> testBuffer(1, bufferSize);

    // Generate 220Hz (A3) with strong 440Hz (A4) harmonic to test octave detection
    auto* writePtr = testBuffer.getWritePointer(0);
    const double twoPi = juce::MathConstants<double>::twoPi;

    for (int sample = 0; sample < bufferSize; ++sample) {
        double time = sample / sampleRate;
        // Strong fundamental at A3 (220Hz)
        double value = 0.5 * std::sin(twoPi * 220.0 * time);
        // Very strong second harmonic at A4 (440Hz) - could cause octave error
        value += 0.4 * std::sin(twoPi * 440.0 * time);
        // Add higher harmonics
        value += 0.2 * std::sin(twoPi * 660.0 * time);
        value += 0.1 * std::sin(twoPi * 880.0 * time);

        writePtr[sample] = static_cast<float>(value);
    }

    detector->processBlock(testBuffer);
    auto result = detector->getLatestPitchResult();

    // Should detect fundamental (A3 = 220Hz), not octave (A4 = 440Hz)
    EXPECT_TRUE(verifyPitchAccuracy(result.frequency, 220.0, 5.0))
        << "Octave error prevention failed. Should detect ~220Hz (A3), not 440Hz (A4). Got: "
        << result.frequency << "Hz";

    // Verify pitch name is A3, not A4
    EXPECT_EQ(result.pitchName.toStdString(), "A3")
        << "Should detect A3, not A4. Got: " << result.pitchName;
}

// Test 7: Confidence Scoring
TEST_F(PitchHarmonyTests, ConfidenceScoring) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for confidence scoring test";

    struct SignalTest {
        std::string name;
        double frequency;
        double amplitude;
        double expectedMinConfidence;
    };

    std::vector<SignalTest> signalTests = {
        {"Clean sine wave", 440.0, 0.8, 0.9},
        {"Lower amplitude", 440.0, 0.2, 0.6},
        {"Higher frequency", 1760.0, 0.6, 0.8},
        {"Lower frequency", 110.0, 0.6, 0.7}
    };

    for (const auto& test : signalTests) {
        juce::AudioBuffer<float> testBuffer(1, bufferSize);
        generateSineWave(testBuffer, test.frequency, test.amplitude);

        detector->reset();
        detector->processBlock(testBuffer);

        auto result = detector->getLatestPitchResult();

        // Verify confidence meets minimum expectations
        EXPECT_GT(result.confidence, test.expectedMinConfidence)
            << "Confidence too low for " << test.name
            << ". Expected >" << test.expectedMinConfidence
            << ", got " << result.confidence;

        // Verify confidence is in valid range
        EXPECT_GE(result.confidence, 0.0);
        EXPECT_LE(result.confidence, 1.0)
            << "Confidence should be between 0.0 and 1.0 for " << test.name;
    }
}

// Test 8: Edge Cases - Silence and Noise
TEST_F(PitchHarmonyTests, EdgeCasesSilenceAndNoise) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for edge cases test";

    // Test 1: Complete silence
    juce::AudioBuffer<float> silentBuffer(1, bufferSize);
    silentBuffer.clear();

    detector->processBlock(silentBuffer);
    auto result = detector->getLatestPitchResult();

    // Should not detect pitch in silence
    EXPECT_FALSE(result.isPitched)
        << "Should not detect pitch in silence";
    EXPECT_EQ(result.frequency, 0.0)
        << "Frequency should be 0.0 for silence";
    EXPECT_LT(result.confidence, 0.3)
        << "Confidence should be low for silence";

    // Test 2: White noise
    juce::AudioBuffer<float> noiseBuffer(1, bufferSize);
    generateNoise(noiseBuffer, 0.1);

    detector->reset();
    detector->processBlock(noiseBuffer);
    result = detector->getLatestPitchResult();

    // Should not detect pitch in noise
    EXPECT_FALSE(result.isPitched)
        << "Should not detect pitch in white noise";
    EXPECT_LT(result.confidence, 0.5)
        << "Confidence should be low for noise";

    // Test 3: Very low amplitude signal (below detection threshold)
    juce::AudioBuffer<float> quietBuffer(1, bufferSize);
    generateSineWave(quietBuffer, 440.0, 0.01); // Very low amplitude

    detector->reset();
    detector->processBlock(quietBuffer);
    result = detector->getLatestPitchResult();

    // May or may not detect pitch depending on sensitivity
    if (result.isPitched) {
        EXPECT_LT(result.confidence, 0.7)
            << "Confidence should be lower for very quiet signals";
    }
}

// Test 9: Real-Time Performance Requirements
TEST_F(PitchHarmonyTests, RealTimePerformanceRequirements) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for performance test";

    // Create test buffer with 440Hz sine wave
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    generateSineWave(testBuffer, 440.0);

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

    // Average processing time per buffer should be less than 5ms for real-time performance
    double avgTimeMs = (double)duration.count() / (numIterations * 1000.0);

    EXPECT_LT(avgTimeMs, 5.0)
        << "Real-time performance requirement failed. Average time: "
        << avgTimeMs << "ms, required: < 5.0ms";

    // Also check that the detector's internal timing matches
    double internalTime = detector->getLastProcessingTime();
    EXPECT_LT(internalTime, 5.0)
        << "Internal processing time should be under 5ms";
}

// Test 10: Frequency Range Validation
TEST_F(PitchHarmonyTests, FrequencyRangeValidation) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for frequency range test";

    // Test frequency detection within and outside expected range
    struct FrequencyTest {
        double frequency;
        bool shouldDetect;
        std::string description;
    };

    std::vector<FrequencyTest> freqTests = {
        {50.0, false, "Below instrument range (50Hz)"},
        {80.0, true, "Lower limit of range (80Hz)"},
        {100.0, true, "Within low range (100Hz)"},
        {440.0, true, "Middle range (440Hz)"},
        {2000.0, true, "High range (2000Hz)"},
        {4000.0, true, "Upper limit of range (4000Hz)"},
        {5000.0, false, "Above instrument range (5000Hz)"},
        {10000.0, false, "Well above range (10kHz)"}
    };

    for (const auto& test : freqTests) {
        juce::AudioBuffer<float> testBuffer(1, bufferSize);
        generateSineWave(testBuffer, test.frequency);

        detector->reset();
        detector->processBlock(testBuffer);

        auto result = detector->getLatestPitchResult();

        if (test.shouldDetect) {
            EXPECT_TRUE(result.isPitched)
                << "Should detect pitch for " << test.description;
            EXPECT_GT(result.confidence, 0.6)
                << "Confidence should be reasonable for " << test.description;
        } else {
            // May or may not detect pitch, but confidence should be low
            if (result.isPitched) {
                EXPECT_LT(result.confidence, 0.7)
                    << "Confidence should be low for out-of-range frequency";
            }
        }
    }
}

// Test 11: Configuration Methods
TEST_F(PitchHarmonyTests, ConfigurationMethods) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for configuration test";

    // Test frequency range configuration
    detector->setMinFrequency(100.0);
    detector->setMaxFrequency(2000.0);

    // Test confidence threshold configuration
    detector->setConfidenceThreshold(0.85);

    // Test YIN threshold configuration
    detector->setYINThreshold(0.15);

    // Test with frequency outside configured range
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    generateSineWave(testBuffer, 50.0); // Below min frequency

    detector->processBlock(testBuffer);
    auto result = detector->getLatestPitchResult();

    // Should not detect frequency outside configured range
    if (result.isPitched) {
        EXPECT_LT(result.confidence, 0.7)
            << "Low confidence for out-of-range frequency";
    }

    // Test with frequency within configured range
    detector->reset();
    generateSineWave(testBuffer, 440.0); // Within range

    detector->processBlock(testBuffer);
    result = detector->getLatestPitchResult();

    EXPECT_TRUE(result.isPitched)
        << "Should detect frequency within configured range";
}

// Test 12: JSON Output Format Validation
TEST_F(PitchHarmonyTests, JSONOutputFormatValidation) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for JSON format test";

    // Process test data
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    generateSineWave(testBuffer, 440.0);
    detector->processBlock(testBuffer);

    juce::String results = detector->getResultsAsJson();

    // Validate JSON format - parsing should not throw
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

    // Check pitch-specific fields
    EXPECT_TRUE(jsonContainsPitchFields(results))
        << "JSON should contain all pitch detection fields";

    // Parse JSON and verify field types
    juce::var jsonResult = juce::JSON::parse(results);
    if (auto* resultObject = jsonResult.getDynamicObject()) {
        // Verify numeric fields are actually numbers
        juce::var frequency = resultObject->getProperty("frequency");
        juce::var confidence = resultObject->getProperty("confidence");
        juce::var midiNote = resultObject->getProperty("midiNote");

        EXPECT_TRUE(frequency.isDouble() || frequency.isInt())
            << "Frequency should be a number";
        EXPECT_TRUE(confidence.isDouble() || confidence.isInt())
            << "Confidence should be a number";
        EXPECT_TRUE(midiNote.isInt())
            << "MIDI note should be an integer";
    } else {
        FAIL() << "Failed to parse JSON as object";
    }
}

// Test 13: Reset Functionality
TEST_F(PitchHarmonyTests, ResetFunctionality) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for reset test";

    // Process some audio to populate internal state
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    generateSineWave(testBuffer, 440.0);
    detector->processBlock(testBuffer);

    // Get result before reset
    auto beforeReset = detector->getLatestPitchResult();
    EXPECT_TRUE(beforeReset.isPitched)
        << "Should detect pitch before reset";

    // Reset the detector
    detector->reset();

    // Should still be ready after reset
    EXPECT_TRUE(detector->isReady())
        << "Detector should still be ready after reset";

    // Process audio after reset
    juce::AudioBuffer<float> newBuffer(1, bufferSize);
    generateSineWave(newBuffer, 330.0); // Different frequency
    detector->processBlock(newBuffer);

    auto afterReset = detector->getLatestPitchResult();

    // Should detect new frequency correctly
    EXPECT_TRUE(verifyPitchAccuracy(afterReset.frequency, 330.0, 2.0))
        << "Should detect new frequency after reset";
}

// Test 14: Multi-Channel Processing
TEST_F(PitchHarmonyTests, MultiChannelProcessing) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for multi-channel test";

    // Test with stereo buffer - different frequencies in each channel
    juce::AudioBuffer<float> stereoBuffer(2, bufferSize);

    auto* leftChannel = stereoBuffer.getWritePointer(0);
    auto* rightChannel = stereoBuffer.getWritePointer(1);

    const double twoPi = juce::MathConstants<double>::twoPi;

    for (int sample = 0; sample < bufferSize; ++sample) {
        double time = sample / sampleRate;
        leftChannel[sample] = static_cast<float>(std::sin(twoPi * 440.0 * time));   // A4
        rightChannel[sample] = static_cast<float>(std::sin(twoPi * 523.25 * time)); // C5
    }

    detector->processBlock(stereoBuffer);
    auto result = detector->getLatestPitchResult();

    // Should detect pitch in multi-channel audio
    EXPECT_TRUE(result.isPitched)
        << "Should detect pitch in multi-channel audio";

    // Should detect one of the frequencies (implementation dependent which)
    bool detectedA4 = verifyPitchAccuracy(result.frequency, 440.0, 10.0);
    bool detectedC5 = verifyPitchAccuracy(result.frequency, 523.25, 10.0);

    EXPECT_TRUE(detectedA4 || detectedC5)
        << "Should detect either A4 (440Hz) or C5 (523.25Hz) in multi-channel audio. Got: "
        << result.frequency << "Hz";
}

// Test 15: Memory and Resource Management
TEST_F(PitchHarmonyTests, MemoryAndResourceManagement) {
    // Test multiple detector instances
    std::vector<std::unique_ptr<PitchDetector>> detectors;

    for (int i = 0; i < 10; ++i) {
        auto detector = std::make_unique<PitchDetector>();
        EXPECT_TRUE(detector->initialize(sampleRate, bufferSize))
            << "Detector " << i << " should initialize successfully";
        detectors.push_back(std::move(detector));
    }

    // Process audio with all detectors simultaneously
    juce::AudioBuffer<float> testBuffer(1, bufferSize);
    generateSineWave(testBuffer, 440.0);

    for (auto& detector : detectors) {
        detector->processBlock(testBuffer);
        auto result = detector->getLatestPitchResult();
        EXPECT_TRUE(result.isPitched)
            << "Each detector should detect pitch independently";
    }

    // All detectors should be destroyed cleanly when going out of scope
    detectors.clear();
}

// Test 16: Edge Case - Very Short Buffers
TEST_F(PitchHarmonyTests, EdgeCaseVeryShortBuffers) {
    auto detector = std::make_unique<PitchDetector>();
    ASSERT_TRUE(detector->initialize(sampleRate, bufferSize))
        << "Failed to initialize for short buffer test";

    // Test with very short buffer
    juce::AudioBuffer<float> shortBuffer(1, 128); // Much shorter than typical
    generateSineWave(shortBuffer, 440.0);

    // Should handle short buffers gracefully
    detector->processBlock(shortBuffer);

    auto result = detector->getLatestPitchResult();

    // May not detect pitch reliably in very short buffers, but shouldn't crash
    juce::String jsonResult = detector->getResultsAsJson();
    EXPECT_TRUE(jsonResult.isNotEmpty())
        << "Should return some result even for short buffers";

    // JSON should be parseable
    EXPECT_NO_THROW(juce::JSON::parse(jsonResult))
        << "Result should be valid JSON even for short buffers";
}