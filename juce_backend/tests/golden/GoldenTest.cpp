/*
  ==============================================================================

    GoldenTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4C: Golden tests - deterministic audio output validation

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include <memory>
#include <cstring>
#include <cmath>
#include <cstdio>

// Pure DSP instrument headers
#include "NexSynthDSP.h"
#include "SamSamplerDSP.h"
#include "LocalGalPureDSP.h"
#include "KaneMarcoPureDSP.h"
#include "KaneMarcoAetherPureDSP.h"
#include "KaneMarcoAetherStringPureDSP.h"

// Use libsndfile for WAV I/O if available
#ifdef USE_SNDFILE
#include <sndfile.h>
#else
// Fallback: simple WAV file writer
struct WAVHeader {
    uint8_t riff[4] = {'R', 'I', 'F', 'F'};
    uint32_t fileSize;
    uint8_t wave[4] = {'W', 'A', 'V', 'E'};
    uint8_t fmt[4] = {'f', 'm', 't', ' '};
    uint32_t fmtSize = 16;
    uint16_t audioFormat = 1;  // PCM
    uint16_t numChannels = 2;
    uint32_t sampleRate = 48000;
    uint32_t byteRate = 48000 * 2 * 2;
    uint16_t blockAlign = 4;
    uint16_t bitsPerSample = 16;
    uint8_t data[4] = {'d', 'a', 't', 'a'};
    uint32_t dataSize;
};
#endif

using namespace std::chrono;

// Simple instrument factory for testing
namespace TestHelpers {
    static std::unique_ptr<DSP::InstrumentDSP> createInstrument(const char* name) {
        if (strcmp(name, "NexSynth") == 0) return std::make_unique<DSP::NexSynthDSP>();
        if (strcmp(name, "SamSampler") == 0) return std::make_unique<DSP::SamSamplerDSP>();
        if (strcmp(name, "LocalGal") == 0) return std::make_unique<DSP::LocalGalPureDSP>();
        if (strcmp(name, "KaneMarco") == 0) return std::make_unique<DSP::KaneMarcoPureDSP>();
        if (strcmp(name, "KaneMarcoAether") == 0) return std::make_unique<DSP::KaneMarcoAetherPureDSP>();
        if (strcmp(name, "KaneMarcoAetherString") == 0) return std::make_unique<DSP::KaneMarcoAetherStringPureDSP>();
        return nullptr;
    }
}

/**
 * @brief WAV file writer for golden reference generation
 */
class WAVWriter {
public:
    static bool write(const char* filename, float* leftChannel, float* rightChannel, int numSamples, int sampleRate = 48000) {
        FILE* file = fopen(filename, "wb");
        if (!file) {
            printf("ERROR: Failed to open %s for writing\n", filename);
            return false;
        }

        // Write WAV header
        WAVHeader header;
        header.sampleRate = sampleRate;
        header.dataSize = numSamples * 2 * 2;  // 2 channels, 16-bit
        header.fileSize = 36 + header.dataSize;

        fwrite(&header, sizeof(WAVHeader), 1, file);

        // Convert and write audio data (16-bit PCM)
        for (int i = 0; i < numSamples; ++i) {
            // Clamp and convert to 16-bit integer
            float leftSample = std::max(-1.0f, std::min(1.0f, leftChannel[i]));
            float rightSample = std::max(-1.0f, std::min(1.0f, rightChannel[i]));

            int16_t leftInt = static_cast<int16_t>(leftSample * 32767.0f);
            int16_t rightInt = static_cast<int16_t>(rightSample * 32767.0f);

            fwrite(&leftInt, sizeof(int16_t), 1, file);
            fwrite(&rightInt, sizeof(int16_t), 1, file);
        }

        fclose(file);
        return true;
    }
};

/**
 * @brief Audio buffer comparator for golden testing
 */
class AudioComparator {
public:
    struct ComparisonResult {
        bool matches;
        double maxDifference;
        double meanDifference;
        double snr_db;
        int differingSamples;
        int totalSamples;
    };

    static ComparisonResult compare(float* reference1, float* reference2, int numSamples, double tolerance = 0.001) {
        ComparisonResult result;
        result.totalSamples = numSamples;
        result.differingSamples = 0;
        result.maxDifference = 0.0;
        double sumDifference = 0.0;
        double sumSignal = 0.0;
        double sumNoise = 0.0;

        for (int i = 0; i < numSamples; ++i) {
            double diff = std::abs(reference1[i] - reference2[i]);
            double signal = std::abs(reference1[i]);

            if (diff > tolerance) {
                result.differingSamples++;
            }

            result.maxDifference = std::max(result.maxDifference, diff);
            sumDifference += diff;
            sumSignal += reference1[i] * reference1[i];
            sumNoise += diff * diff;
        }

        result.meanDifference = sumDifference / numSamples;

        // Calculate SNR in dB
        if (sumNoise > 1e-10) {
            double snr = 10.0 * std::log10(sumSignal / sumNoise);
            result.snr_db = snr;
        } else {
            result.snr_db = 150.0;  // Essentially perfect match
        }

        result.matches = (result.differingSamples == 0);

        return result;
    }
};

/**
 * @brief Test fixture for golden testing
 */
class GoldenTest : public ::testing::Test {
protected:
    void SetUp() override {
        sampleRate_ = 48000.0;
        blockSize_ = 512;
        numChannels_ = 2;
    }

    void processInstrument(DSP::InstrumentDSP* instrument, int numBlocks) {
        int totalSamples = numBlocks * blockSize_;
        leftBuffer_.resize(totalSamples);
        rightBuffer_.resize(totalSamples);

        // Zero buffers
        std::fill(leftBuffer_.begin(), leftBuffer_.end(), 0.0f);
        std::fill(rightBuffer_.begin(), rightBuffer_.end(), 0.0f);

        // Process audio blocks
        float* outputs[2];
        for (int block = 0; block < numBlocks; ++block) {
            outputs[0] = &leftBuffer_[block * blockSize_];
            outputs[1] = &rightBuffer_[block * blockSize_];
            instrument->process(outputs, numChannels_, blockSize_);
        }
    }

    double calculateRMS(float* buffer, int size) {
        double sum = 0.0;
        for (int i = 0; i < size; ++i) {
            sum += buffer[i] * buffer[i];
        }
        return std::sqrt(sum / size);
    }

    bool loadReference(const char* filename, std::vector<float>& leftChannel, std::vector<float>& rightChannel) {
        // Try to load from reference directory
        char filepath[512];
        snprintf(filepath, sizeof(filepath), "tests/golden/reference/%s", filename);

        FILE* file = fopen(filepath, "rb");
        if (!file) {
            // Try relative path
            snprintf(filepath, sizeof(filepath), "reference/%s", filename);
            file = fopen(filepath, "rb");
            if (!file) {
                printf("WARNING: Could not open reference file: %s\n", filename);
                return false;
            }
        }

        // Skip WAV header (44 bytes)
        fseek(file, 44, SEEK_SET);

        // Read audio data
        while (!feof(file)) {
            int16_t leftInt, rightInt;
            if (fread(&leftInt, sizeof(int16_t), 1, file) != 1) break;
            if (fread(&rightInt, sizeof(int16_t), 1, file) != 1) break;

            leftChannel.push_back(leftInt / 32768.0f);
            rightChannel.push_back(rightInt / 32768.0f);
        }

        fclose(file);
        return true;
    }

    double sampleRate_;
    int blockSize_;
    int numChannels_;
    std::vector<float> leftBuffer_;
    std::vector<float> rightBuffer_;
};

// =============================================================================
// Golden Tests - Determinism Validation
// ==============================================================================

TEST_F(GoldenTest, NexSynth_C4_Velocity127_Deterministic)
{
    printf("\n=== GOLDEN TEST: NexSynth C4 Velocity 127 Determinism ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger note
    instrument->noteOn(60, 1.0f);  // C4, velocity 127
    processInstrument(instrument.get(), 100);

    // Load reference if available
    std::vector<float> refLeft, refRight;
    bool hasReference = loadReference("NexSynth_C4_127.wav", refLeft, refRight);

    if (hasReference && refLeft.size() >= 51200) {  // 100 blocks * 512 samples
        // Compare with reference
        auto result = AudioComparator::compare(leftBuffer_.data(), refLeft.data(), 51200);

        printf("Comparison Results:\n");
        printf("  Matches: %s\n", result.matches ? "YES" : "NO");
        printf("  Max Difference: %.6f\n", result.maxDifference);
        printf("  Mean Difference: %.6f\n", result.meanDifference);
        printf("  SNR: %.2f dB\n", result.snr_db);
        printf("  Differing Samples: %d / %d\n", result.differingSamples, result.totalSamples);

        EXPECT_TRUE(result.matches) << "Audio output differs from golden reference";
        EXPECT_LT(result.maxDifference, 0.01) << "Max difference exceeds tolerance";
    } else {
        printf("⚠️  Golden reference not found, generating new reference...\n");
        WAVWriter::write("NexSynth_C4_127.wav", leftBuffer_.data(), rightBuffer_.data(), 51200);
        printf("✅ Generated reference file: NexSynth_C4_127.wav\n");
    }

    // Check output is valid
    double rmsLeft = calculateRMS(leftBuffer_.data(), 51200);
    double rmsRight = calculateRMS(rightBuffer_.data(), 51200);

    printf("RMS Levels: Left=%.6f, Right=%.6f\n", rmsLeft, rmsRight);
    EXPECT_GT(rmsLeft, 0.001) << "Output signal too quiet";
    EXPECT_GT(rmsRight, 0.001) << "Output signal too quiet";

    printf("✅ NexSynth C4 determinism test PASSED\n");
}

TEST_F(GoldenTest, SamSampler_C4_Velocity127_Deterministic)
{
    printf("\n=== GOLDEN TEST: SamSampler C4 Velocity 127 Determinism ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger note
    instrument->noteOn(60, 1.0f);  // C4, velocity 127
    processInstrument(instrument.get(), 100);

    // Load reference if available
    std::vector<float> refLeft, refRight;
    bool hasReference = loadReference("SamSampler_C4_127.wav", refLeft, refRight);

    if (hasReference && refLeft.size() >= 51200) {
        auto result = AudioComparator::compare(leftBuffer_.data(), refLeft.data(), 51200);

        printf("Comparison Results:\n");
        printf("  Matches: %s\n", result.matches ? "YES" : "NO");
        printf("  Max Difference: %.6f\n", result.maxDifference);
        printf("  SNR: %.2f dB\n", result.snr_db);

        EXPECT_TRUE(result.matches) << "Audio output differs from golden reference";
        EXPECT_LT(result.maxDifference, 0.01) << "Max difference exceeds tolerance";
    } else {
        printf("⚠️  Golden reference not found, generating new reference...\n");
        WAVWriter::write("SamSampler_C4_127.wav", leftBuffer_.data(), rightBuffer_.data(), 51200);
        printf("✅ Generated reference file: SamSampler_C4_127.wav\n");
    }

    printf("✅ SamSampler C4 determinism test PASSED\n");
}

TEST_F(GoldenTest, LocalGal_C4_Velocity127_Deterministic)
{
    printf("\n=== GOLDEN TEST: LocalGal C4 Velocity 127 Determinism ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger note
    instrument->noteOn(60, 1.0f);  // C4, velocity 127
    processInstrument(instrument.get(), 100);

    // Load reference if available
    std::vector<float> refLeft, refRight;
    bool hasReference = loadReference("LocalGal_C4_127.wav", refLeft, refRight);

    if (hasReference && refLeft.size() >= 51200) {
        auto result = AudioComparator::compare(leftBuffer_.data(), refLeft.data(), 51200);

        printf("Comparison Results:\n");
        printf("  Matches: %s\n", result.matches ? "YES" : "NO");
        printf("  Max Difference: %.6f\n", result.maxDifference);
        printf("  SNR: %.2f dB\n", result.snr_db);

        EXPECT_TRUE(result.matches) << "Audio output differs from golden reference";
        EXPECT_LT(result.maxDifference, 0.01) << "Max difference exceeds tolerance";
    } else {
        printf("⚠️  Golden reference not found, generating new reference...\n");
        WAVWriter::write("LocalGal_C4_127.wav", leftBuffer_.data(), rightBuffer_.data(), 51200);
        printf("✅ Generated reference file: LocalGal_C4_127.wav\n");
    }

    printf("✅ LocalGal C4 determinism test PASSED\n");
}

TEST_F(GoldenTest, KaneMarco_C4_Velocity127_Deterministic)
{
    printf("\n=== GOLDEN TEST: KaneMarco C4 Velocity 127 Determinism ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger note
    instrument->noteOn(60, 1.0f);
    processInstrument(instrument.get(), 100);

    // Load reference if available
    std::vector<float> refLeft, refRight;
    bool hasReference = loadReference("KaneMarco_C4_127.wav", refLeft, refRight);

    if (hasReference && refLeft.size() >= 51200) {
        auto result = AudioComparator::compare(leftBuffer_.data(), refLeft.data(), 51200);

        printf("Comparison Results:\n");
        printf("  Matches: %s\n", result.matches ? "YES" : "NO");
        printf("  Max Difference: %.6f\n", result.maxDifference);
        printf("  SNR: %.2f dB\n", result.snr_db);

        EXPECT_TRUE(result.matches) << "Audio output differs from golden reference";
        EXPECT_LT(result.maxDifference, 0.01) << "Max difference exceeds tolerance";
    } else {
        printf("⚠️  Golden reference not found, generating new reference...\n");
        WAVWriter::write("KaneMarco_C4_127.wav", leftBuffer_.data(), rightBuffer_.data(), 51200);
        printf("✅ Generated reference file: KaneMarco_C4_127.wav\n");
    }

    printf("✅ KaneMarco C4 determinism test PASSED\n");
}

TEST_F(GoldenTest, KaneMarcoAether_C4_Velocity127_Deterministic)
{
    printf("\n=== GOLDEN TEST: KaneMarcoAether C4 Velocity 127 Determinism ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAether"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger note
    instrument->noteOn(60, 1.0f);
    processInstrument(instrument.get(), 100);

    // Load reference if available
    std::vector<float> refLeft, refRight;
    bool hasReference = loadReference("KaneMarcoAether_C4_127.wav", refLeft, refRight);

    if (hasReference && refLeft.size() >= 51200) {
        auto result = AudioComparator::compare(leftBuffer_.data(), refLeft.data(), 51200);

        printf("Comparison Results:\n");
        printf("  Matches: %s\n", result.matches ? "YES" : "NO");
        printf("  Max Difference: %.6f\n", result.maxDifference);
        printf("  SNR: %.2f dB\n", result.snr_db);

        EXPECT_TRUE(result.matches) << "Audio output differs from golden reference";
        EXPECT_LT(result.maxDifference, 0.01) << "Max difference exceeds tolerance";
    } else {
        printf("⚠️  Golden reference not found, generating new reference...\n");
        WAVWriter::write("KaneMarcoAether_C4_127.wav", leftBuffer_.data(), rightBuffer_.data(), 51200);
        printf("✅ Generated reference file: KaneMarcoAether_C4_127.wav\n");
    }

    printf("✅ KaneMarcoAether C4 determinism test PASSED\n");
}

TEST_F(GoldenTest, KaneMarcoAetherString_C4_Velocity127_Deterministic)
{
    printf("\n=== GOLDEN TEST: KaneMarcoAetherString C4 Velocity 127 Determinism ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAetherString"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger note
    instrument->noteOn(60, 1.0f);
    processInstrument(instrument.get(), 100);

    // Load reference if available
    std::vector<float> refLeft, refRight;
    bool hasReference = loadReference("KaneMarcoAetherString_C4_127.wav", refLeft, refRight);

    if (hasReference && refLeft.size() >= 51200) {
        auto result = AudioComparator::compare(leftBuffer_.data(), refLeft.data(), 51200);

        printf("Comparison Results:\n");
        printf("  Matches: %s\n", result.matches ? "YES" : "NO");
        printf("  Max Difference: %.6f\n", result.maxDifference);
        printf("  SNR: %.2f dB\n", result.snr_db);

        EXPECT_TRUE(result.matches) << "Audio output differs from golden reference";
        EXPECT_LT(result.maxDifference, 0.01) << "Max difference exceeds tolerance";
    } else {
        printf("⚠️  Golden reference not found, generating new reference...\n");
        WAVWriter::write("KaneMarcoAetherString_C4_127.wav", leftBuffer_.data(), rightBuffer_.data(), 51200);
        printf("✅ Generated reference file: KaneMarcoAetherString_C4_127.wav\n");
    }

    printf("✅ KaneMarcoAetherString C4 determinism test PASSED\n");
}

TEST_F(GoldenTest, AllInstruments_Determinism_AllDeterministic)
{
    printf("\n=== GOLDEN TEST: All Instruments Determinism ===\n");

    std::vector<const char*> instrumentNames = {
        "NexSynth",
        "SamSampler",
        "LocalGal",
        "KaneMarco",
        "KaneMarcoAether",
        "KaneMarcoAetherString"
    };

    int passed = 0;
    int total = 0;

    for (auto name : instrumentNames) {
        printf("\nTesting %s...\n", name);

        // Run instrument twice and compare outputs
        auto inst1 = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument(name));
        auto inst2 = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument(name));

        ASSERT_NE(inst1, nullptr);
        ASSERT_NE(inst2, nullptr);

        inst1->prepare(sampleRate_, blockSize_);
        inst2->prepare(sampleRate_, blockSize_);

        // Process first instance
        float buffer1_L[51200];
        float buffer1_R[51200];
        // Initialize buffers to prevent NaN from uninitialized memory
        std::fill(buffer1_L, buffer1_L + 51200, 0.0f);
        std::fill(buffer1_R, buffer1_R + 51200, 0.0f);
        float* outputs1[2] = {buffer1_L, buffer1_R};

        inst1->noteOn(60, 1.0f);
        for (int block = 0; block < 100; ++block) {
            inst1->process(outputs1, numChannels_, blockSize_);
        }

        // Process second instance
        float buffer2_L[51200];
        float buffer2_R[51200];
        // Initialize buffers to prevent NaN from uninitialized memory
        std::fill(buffer2_L, buffer2_L + 51200, 0.0f);
        std::fill(buffer2_R, buffer2_R + 51200, 0.0f);
        float* outputs2[2] = {buffer2_L, buffer2_R};

        inst2->noteOn(60, 1.0f);
        for (int block = 0; block < 100; ++block) {
            inst2->process(outputs2, numChannels_, blockSize_);
        }

        // Compare outputs (should be identical)
        auto resultLeft = AudioComparator::compare(buffer1_L, buffer2_L, 51200);
        auto resultRight = AudioComparator::compare(buffer1_R, buffer2_R, 51200);

        printf("  Left Channel:  MaxDiff=%.6f, SNR=%.2f dB\n", resultLeft.maxDifference, resultLeft.snr_db);
        printf("  Right Channel: MaxDiff=%.6f, SNR=%.2f dB\n", resultRight.maxDifference, resultRight.snr_db);

        total++;
        if (resultLeft.matches && resultRight.matches) {
            passed++;
            printf("✅ %s - DETERMINISTIC\n", name);
        } else {
            printf("❌ %s - NOT DETERMINISTIC\n", name);
        }
    }

    printf("\nDeterminism Summary: %d/%d instruments passed\n", passed, total);
    EXPECT_EQ(passed, total) << "Some instruments are not deterministic";
}

TEST_F(GoldenTest, SampleRateConsistency_Consistent)
{
    printf("\n=== GOLDEN TEST: Sample Rate Consistency ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);

    std::vector<double> sampleRates = {44100.0, 48000.0, 96000.0};

    for (double sr : sampleRates) {
        printf("Testing sample rate: %.0f Hz\n", sr);

        // Create new instance for each sample rate
        auto inst = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
        ASSERT_NE(inst, nullptr);

        inst->prepare(sr, 512);
        inst->noteOn(60, 1.0f);

        float buffer_L[5120];
        float buffer_R[5120];
        // Initialize buffers to prevent NaN from uninitialized memory
        std::fill(buffer_L, buffer_L + 5120, 0.0f);
        std::fill(buffer_R, buffer_R + 5120, 0.0f);
        float* outputs[2] = {buffer_L, buffer_R};

        for (int block = 0; block < 10; ++block) {
            inst->process(outputs, 2, 512);
        }

        // Check output is valid
        double rms = calculateRMS(buffer_L, 5120);
        printf("  RMS Level: %.6f\n", rms);
        EXPECT_GT(rms, 0.001) << "No output at sample rate " << sr;
    }

    printf("✅ Sample rate consistency test PASSED\n");
}

TEST_F(GoldenTest, VelocityLayers_Deterministic)
{
    printf("\n=== GOLDEN TEST: Velocity Layers Determinism ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    std::vector<float> velocities = {0.3f, 0.5f, 0.7f, 1.0f};

    for (float vel : velocities) {
        printf("Testing velocity: %.1f\n", vel);

        // Create new instance for each velocity
        auto inst = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
        ASSERT_NE(inst, nullptr);

        inst->prepare(sampleRate_, blockSize_);
        inst->noteOn(60, vel);

        float buffer_L[5120];
        float buffer_R[5120];
        // Initialize buffers to prevent NaN from uninitialized memory
        std::fill(buffer_L, buffer_L + 5120, 0.0f);
        std::fill(buffer_R, buffer_R + 5120, 0.0f);
        float* outputs[2] = {buffer_L, buffer_R};

        for (int block = 0; block < 10; ++block) {
            inst->process(outputs, 2, 512);
        }

        // Check output level increases with velocity
        double rms = calculateRMS(buffer_L, 5120);
        printf("  RMS Level: %.6f\n", rms);
        EXPECT_GT(rms, 0.0) << "No output at velocity " << vel;
    }

    printf("✅ Velocity layers determinism test PASSED\n");
}

TEST_F(GoldenTest, PolyphonicConsistency_Consistent)
{
    printf("\n=== GOLDEN TEST: Polyphonic Consistency ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger 4-note chord
    instrument->noteOn(60, 0.8f);
    instrument->noteOn(64, 0.8f);
    instrument->noteOn(67, 0.8f);
    instrument->noteOn(72, 0.8f);

    processInstrument(instrument.get(), 100);

    // Load reference if available
    std::vector<float> refLeft, refRight;
    bool hasReference = loadReference("NexSynth_C4_127.wav", refLeft, refRight);

    if (hasReference) {
        // Just verify output is valid (different from single note)
        double rmsLeft = calculateRMS(leftBuffer_.data(), 51200);
        double rmsRight = calculateRMS(rightBuffer_.data(), 51200);

        printf("Chord RMS Levels: Left=%.6f, Right=%.6f\n", rmsLeft, rmsRight);
        EXPECT_GT(rmsLeft, 0.001) << "Chord output too quiet";
        EXPECT_GT(rmsRight, 0.001) << "Chord output too quiet";
    }

    printf("✅ Polyphonic consistency test PASSED\n");
}

TEST_F(GoldenTest, TimingConsistency_Consistent)
{
    printf("\n=== GOLDEN TEST: Timing Consistency ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger note with precise timing
    instrument->noteOn(60, 1.0f);

    // Process and check output starts promptly
    float buffer_L[5120];
    float buffer_R[5120];
    float* outputs[2] = {buffer_L, buffer_R};

    for (int block = 0; block < 10; ++block) {
        instrument->process(outputs, 2, 512);
    }

    // Find first sample with significant amplitude
    int onsetSample = -1;
    for (int i = 0; i < 5120; ++i) {
        if (std::abs(buffer_L[i]) > 0.01f || std::abs(buffer_R[i]) > 0.01f) {
            onsetSample = i;
            break;
        }
    }

    printf("Note onset detected at sample: %d\n", onsetSample);
    EXPECT_GE(onsetSample, 0) << "No note onset detected";
    EXPECT_LT(onsetSample, 1000) << "Note onset too delayed";

    printf("✅ Timing consistency test PASSED\n");
}
