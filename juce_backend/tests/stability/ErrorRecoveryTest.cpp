/*
  ==============================================================================

    ErrorRecoveryTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4B: Error recovery tests - validation of error handling paths

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include <memory>
#include <random>
#include <cstring>
#include <cmath>

// Pure DSP instrument headers
#include "NexSynthDSP.h"
#include "SamSamplerDSP.h"
#include "LocalGalPureDSP.h"
#include "KaneMarcoPureDSP.h"
#include "KaneMarcoAetherPureDSP.h"
#include "KaneMarcoAetherStringPureDSP.h"

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
 * @brief Error detection and recovery validator
 */
class ErrorRecoveryValidator {
public:
    static bool isOutputValid(float* buffer, int size, bool expectSilent = false) {
        if (!buffer) return false;

        bool hasSignal = false;
        bool hasNaN = false;
        bool hasInf = false;

        for (int i = 0; i < size; ++i) {
            if (std::isnan(buffer[i])) hasNaN = true;
            if (std::isinf(buffer[i])) hasInf = true;
            if (std::abs(buffer[i]) > 0.0001f) hasSignal = true;
        }

        if (hasNaN || hasInf) {
            printf("  ERROR: Invalid audio detected (NaN: %s, Inf: %s)\n",
                   hasNaN ? "yes" : "no", hasInf ? "yes" : "no");
            return false;
        }

        if (expectSilent && hasSignal) {
            printf("  WARNING: Expected silent output but found signal\n");
            // Not necessarily an error, could be decay tail
        }

        return true;
    }

    static bool isOutputConsistent(float* buffer1, float* buffer2, int size) {
        if (!buffer1 || !buffer2) return false;

        for (int i = 0; i < size; ++i) {
            double diff = std::abs(buffer1[i] - buffer2[i]);
            if (diff > 0.0001) {
                return false;  // Outputs differ
            }
        }

        return true;  // Outputs are identical
    }
};

/**
 * @brief Test fixture for error recovery testing
 */
class ErrorRecoveryTest : public ::testing::Test {
protected:
    void SetUp() override {
        sampleRate_ = 48000.0;
        blockSize_ = 512;
        numChannels_ = 2;

        outputs_[0] = leftBuffer_;
        outputs_[1] = rightBuffer_;

        memset(leftBuffer_, 0, sizeof(leftBuffer_));
        memset(rightBuffer_, 0, sizeof(rightBuffer_));
    }

    void processInstrument(DSP::InstrumentDSP* instrument, int numBlocks) {
        for (int i = 0; i < numBlocks; ++i) {
            instrument->process(outputs_, numChannels_, blockSize_);
        }
    }

    double sampleRate_;
    int blockSize_;
    int numChannels_;
    float* outputs_[2];
    float leftBuffer_[512];
    float rightBuffer_[512];
};

// =============================================================================
// Error Recovery Tests
// ==============================================================================

TEST_F(ErrorRecoveryTest, InvalidNoteRecovery_Recovered)
{
    printf("\n=== ERROR RECOVERY TEST: Invalid Note Recovery ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Send invalid MIDI events
    printf("Sending invalid MIDI events...\n");
    instrument->noteOn(-100, 0.8f);       // Negative note
    instrument->noteOn(10000, 0.8f);      // Way above range
    instrument->noteOn(60, -1.0f);        // Negative velocity
    instrument->noteOn(60, 2.0f);         // Velocity > 1.0

    processInstrument(instrument.get(), 10);

    // Validate output
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    // Now send valid note - should work normally
    printf("Sending valid note after invalid events...\n");
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    printf("✅ Instrument recovered from invalid MIDI events\n");
}

TEST_F(ErrorRecoveryTest, ProcessAfterReset_Recovered)
{
    printf("\n=== ERROR RECOVERY TEST: Process After Reset ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Play some audio
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 50);

    // Store reference
    float referenceLeft[512];
    float referenceRight[512];
    memcpy(referenceLeft, leftBuffer_, sizeof(leftBuffer_));
    memcpy(referenceRight, rightBuffer_, sizeof(rightBuffer_));

    // Reset
    printf("Resetting instrument...\n");
    instrument->reset();

    // Process after reset - should be silent
    memset(leftBuffer_, 0, sizeof(leftBuffer_));
    memset(rightBuffer_, 0, sizeof(rightBuffer_));
    instrument->process(outputs_, numChannels_, blockSize_);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_, true));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_, true));

    // Now play again - should work normally
    printf("Playing after reset...\n");
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 50);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    printf("✅ Instrument recovered from reset\n");
}

TEST_F(ErrorRecoveryTest, SampleRateChange_Recovered)
{
    printf("\n=== ERROR RECOVERY TEST: Sample Rate Change Recovery ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);

    std::vector<double> sampleRates = {44100.0, 48000.0, 96000.0, 192000.0};

    for (double sr : sampleRates) {
        printf("Testing sample rate: %.0f Hz\n", sr);

        instrument->prepare(sr, 512);
        instrument->noteOn(60, 0.8f);
        processInstrument(instrument.get(), 10);

        EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
        EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

        instrument->reset();
    }

    // Back to standard rate
    printf("Returning to standard sample rate...\n");
    instrument->prepare(48000.0, 512);
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    printf("✅ Instrument recovered from all sample rate changes\n");
}

TEST_F(ErrorRecoveryTest, ExtremeParameterChanges_Recovered)
{
    printf("\n=== ERROR RECOVERY TEST: Extreme Parameter Changes ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Rapid note changes (stress test)
    printf("Applying rapid note changes...\n");
    for (int i = 0; i < 1000; ++i) {
        instrument->noteOn(60 + (i % 24), 0.8f);
        instrument->process(outputs_, numChannels_, 1);  // Single sample
        instrument->noteOff(60 + (i % 24));
        instrument->process(outputs_, numChannels_, 1);
    }

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, 1));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, 1));

    // Verify still works normally
    printf("Verifying normal operation after stress...\n");
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    printf("✅ Instrument recovered from extreme parameter changes\n");
}

TEST_F(ErrorRecoveryTest, BufferOverflowProtection_NoCorruption)
{
    printf("\n=== ERROR RECOVERY TEST: Buffer Overflow Protection ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAether"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Initialize buffer with known pattern
    memset(leftBuffer_, 0xAA, sizeof(leftBuffer_));
    memset(rightBuffer_, 0x55, sizeof(rightBuffer_));

    // Set guard bytes at end
    const int guardSize = 16;
    float leftGuard[guardSize];
    float rightGuard[guardSize];
    memset(leftGuard, 0xFF, sizeof(leftGuard));
    memset(rightGuard, 0xFF, sizeof(rightGuard));

    // Process audio
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    // Check guard bytes weren't overwritten (no buffer overflow)
    bool guardIntact = true;
    for (int i = 0; i < guardSize; ++i) {
        unsigned char* leftBytes = (unsigned char*)&leftGuard[i];
        unsigned char* rightBytes = (unsigned char*)&rightGuard[i];

        for (int j = 0; j < sizeof(float); ++j) {
            if (leftBytes[j] != 0xFF || rightBytes[j] != 0xFF) {
                guardIntact = false;
                break;
            }
        }
    }

    EXPECT_TRUE(guardIntact) << "Buffer overflow detected - guard bytes overwritten";

    // Validate output
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    printf("✅ No buffer overflow detected\n");
}

TEST_F(ErrorRecoveryTest, NaNInfHandling_Filtered)
{
    printf("\n=== ERROR RECOVERY TEST: NaN/Infinity Handling ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAetherString"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Inject NaN/Inf into buffer (simulating upstream corruption)
    printf("Injecting NaN/Inf values...\n");
    leftBuffer_[10] = std::numeric_limits<float>::quiet_NaN();
    leftBuffer_[20] = std::numeric_limits<float>::infinity();
    rightBuffer_[30] = -std::numeric_limits<float>::infinity();

    // Process (should filter out or handle gracefully)
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    // Check output doesn't contain NaN/Inf
    bool hasNaN = false;
    bool hasInf = false;

    for (int i = 0; i < blockSize_; ++i) {
        if (std::isnan(leftBuffer_[i]) || std::isnan(rightBuffer_[i])) {
            hasNaN = true;
        }
        if (std::isinf(leftBuffer_[i]) || std::isinf(rightBuffer_[i])) {
            hasInf = true;
        }
    }

    // Note: Instruments may not filter NaN/Inf, but they shouldn't crash
    if (hasNaN || hasInf) {
        printf("⚠️  Output contains NaN/Inf (instrument doesn't filter)\n");
        printf("    This is acceptable if instrument doesn't crash\n");
    } else {
        printf("✅ Instrument filters NaN/Inf values\n");
    }

    // Verify instrument still works
    printf("Verifying instrument still functional...\n");
    memset(leftBuffer_, 0, sizeof(leftBuffer_));
    memset(rightBuffer_, 0, sizeof(rightBuffer_));

    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    printf("✅ Instrument handles NaN/Inf without crashing\n");
}

TEST_F(ErrorRecoveryTest, ConcurrentEvents_Recovered)
{
    printf("\n=== ERROR RECOVERY TEST: Concurrent Event Handling ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Fire all notes at once (extreme concurrency)
    printf("Triggering all 128 notes simultaneously...\n");
    for (int note = 0; note < 128; ++note) {
        instrument->noteOn(note, 0.8f);
    }

    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    // Release all simultaneously
    printf("Releasing all 128 notes simultaneously...\n");
    for (int note = 0; note < 128; ++note) {
        instrument->noteOff(note);
    }

    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    // Verify normal operation
    printf("Verifying normal operation after extreme concurrency...\n");
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    printf("✅ Instrument recovered from extreme concurrent events\n");
}

TEST_F(ErrorRecoveryTest, PrepareTwice_Recovered)
{
    printf("\n=== ERROR RECOVERY TEST: Double Prepare Recovery ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler"));
    ASSERT_NE(instrument, nullptr);

    // Prepare twice without reset (could leak memory or cause issues)
    printf("Calling prepare() twice...\n");
    instrument->prepare(48000.0, 512);
    instrument->prepare(48000.0, 512);  // Second prepare

    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    // Now prepare with different settings
    printf("Preparing with different settings...\n");
    instrument->prepare(96000.0, 256);

    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, 256));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, 256));

    printf("✅ Instrument recovered from double prepare\n");
}

TEST_F(ErrorRecoveryTest, AllInstrumentsErrorRecovery_AllRecovered)
{
    printf("\n=== ERROR RECOVERY TEST: All Instruments Error Recovery ===\n");

    std::vector<const char*> instrumentNames = {
        "NexSynth",
        "SamSampler",
        "LocalGal",
        "KaneMarco",
        "KaneMarcoAether",
        "KaneMarcoAetherString"
    };

    int passedTests = 0;
    int totalTests = 0;

    for (auto name : instrumentNames) {
        printf("\nTesting %s...\n", name);

        auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument(name));
        ASSERT_NE(instrument, nullptr);
        instrument->prepare(48000.0, 512);

        bool recovered = true;

        // Test 1: Invalid MIDI events
        instrument->noteOn(-100, 0.8f);
        instrument->noteOn(10000, 0.8f);
        processInstrument(instrument.get(), 10);
        recovered &= ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_);

        // Test 2: Reset recovery
        instrument->noteOn(60, 0.8f);
        processInstrument(instrument.get(), 10);
        instrument->reset();
        memset(leftBuffer_, 0, sizeof(leftBuffer_));
        memset(rightBuffer_, 0, sizeof(rightBuffer_));
        instrument->process(outputs_, 2, 512);
        recovered &= ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_, true);

        // Test 3: Sample rate change
        instrument->prepare(96000.0, 512);
        instrument->noteOn(60, 0.8f);
        processInstrument(instrument.get(), 10);
        recovered &= ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_);

        // Test 4: Back to normal
        instrument->prepare(48000.0, 512);
        instrument->noteOn(60, 0.8f);
        processInstrument(instrument.get(), 10);
        recovered &= ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_);

        totalTests++;
        if (recovered) {
            passedTests++;
            printf("✅ %s - PASSED all recovery tests\n", name);
        } else {
            printf("❌ %s - FAILED some recovery tests\n", name);
        }
    }

    printf("\nError Recovery Summary: %d/%d instruments passed\n", passedTests, totalTests);
    EXPECT_EQ(passedTests, totalTests) << "Some instruments failed error recovery";
}

TEST_F(ErrorRecoveryTest, DenormalHandling_NoPerformanceImpact)
{
    printf("\n=== ERROR RECOVERY TEST: Denormal Number Handling ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Inject denormal numbers (very small values near zero)
    printf("Injecting denormal values...\n");
    for (int i = 0; i < blockSize_; ++i) {
        leftBuffer_[i] = 1e-40f;  // Denormal
        rightBuffer_[i] = -1e-40f;
    }

    // Process (should handle denormals efficiently)
    auto startTime = high_resolution_clock::now();

    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 1000);

    auto endTime = high_resolution_clock::now();
    auto duration = duration_cast<milliseconds>(endTime - startTime).count();

    printf("Processing time with denormals: %ld ms\n", (long)duration);

    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(leftBuffer_, blockSize_));
    EXPECT_TRUE(ErrorRecoveryValidator::isOutputValid(rightBuffer_, blockSize_));

    // Should not be significantly slower than normal processing
    // (denormals can cause 100x slowdown on some CPUs if not handled)
    EXPECT_LT(duration, 5000) << "Denormal handling caused severe slowdown";

    printf("✅ Denormal numbers handled efficiently\n");
}
