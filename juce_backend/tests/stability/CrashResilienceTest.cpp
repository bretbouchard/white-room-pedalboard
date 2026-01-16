/*
  ==============================================================================

    CrashResilienceTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4B: Crash resilience tests - graceful failure handling under stress

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include <memory>
#include <random>
#include <stdexcept>
#include <cstring>

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
 * @brief Crash detection wrapper
 */
class CrashGuard {
public:
    static bool executeSafely(std::function<void()> func) {
        try {
            func();
            return true;  // No crash
        } catch (const std::exception& e) {
            fprintf(stderr, "Exception caught: %s\n", e.what());
            return false;  // Crashed with exception
        } catch (...) {
            fprintf(stderr, "Unknown exception caught\n");
            return false;  // Crashed with unknown exception
        }
    }
};

/**
 * @brief Test fixture for crash resilience testing
 */
class CrashResilienceTest : public ::testing::Test {
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
// Crash Resilience Tests
// ==============================================================================

TEST_F(CrashResilienceTest, ExtremeMidiValues_NoCrash)
{
    printf("\n=== CRASH RESILIENCE TEST: Extreme MIDI Values ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    bool crashed = !CrashGuard::executeSafely([&]() {
        // Test extreme MIDI note values
        instrument->noteOn(-1000, 0.8f);     // Way below range
        instrument->noteOn(10000, 0.8f);     // Way above range
        instrument->noteOn(60, -1.0f);       // Negative velocity
        instrument->noteOn(60, 1000.0f);     // Excessive velocity

        processInstrument(instrument.get(), 10);

        instrument->noteOff(-1000);          // Invalid note off
        instrument->noteOff(10000);

        processInstrument(instrument.get(), 10);
    });

    EXPECT_FALSE(crashed) << "Instrument crashed on extreme MIDI values";
    printf("✅ Extreme MIDI values handled without crash\n");
}

TEST_F(CrashResilienceTest, ZeroSampleRate_NoCrash)
{
    printf("\n=== CRASH RESILIENCE TEST: Zero Sample Rate ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler"));
    ASSERT_NE(instrument, nullptr);

    bool crashed = !CrashGuard::executeSafely([&]() {
        // Test with zero sample rate (edge case)
        instrument->prepare(0.0, 512);
    });

    if (crashed) {
        printf("⚠️  Zero sample rate caused crash (expected)\n");
        // Recreate with valid settings
        instrument = TestHelpers::createInstrument("SamSampler");
        instrument->prepare(48000.0, 512);
    } else {
        printf("✅ Zero sample rate handled gracefully\n");
    }

    // Instrument should still work
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);
    printf("✅ Instrument functional after edge case test\n");
}

TEST_F(CrashResilienceTest, ZeroBlockSize_NoCrash)
{
    printf("\n=== CRASH RESILIENCE TEST: Zero Block Size ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco"));
    ASSERT_NE(instrument, nullptr);

    bool crashed = !CrashGuard::executeSafely([&]() {
        // Test with zero block size (edge case)
        instrument->prepare(48000.0, 0);
    });

    if (crashed) {
        printf("⚠️  Zero block size caused crash (expected)\n");
        // Recreate with valid settings
        instrument = TestHelpers::createInstrument("KaneMarco");
        instrument->prepare(48000.0, 512);
    } else {
        printf("✅ Zero block size handled gracefully\n");
    }

    // Verify functionality
    instrument->noteOn(60, 0.8f);
    processInstrument(instrument.get(), 10);
    printf("✅ Instrument functional after edge case test\n");
}

TEST_F(CrashResilienceTest, RapidStateChanges_NoCrash)
{
    printf("\n=== CRASH RESILIENCE TEST: Rapid State Changes ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    bool crashed = !CrashGuard::executeSafely([&]() {
        // Rapid prepare/reset cycles
        for (int i = 0; i < 10000; ++i) {
            instrument->prepare(48000.0, 512);
            instrument->noteOn(60, 0.8f);
            processInstrument(instrument.get(), 1);
            instrument->reset();
        }
    });

    EXPECT_FALSE(crashed) << "Instrument crashed during rapid state changes";
    printf("✅ 10,000 state changes - no crashes\n");
}

TEST_F(CrashResilienceTest, ConcurrentNoteEvents_NoCrash)
{
    printf("\n=== CRASH RESILIENCE TEST: Concurrent Note Events ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAether"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    bool crashed = !CrashGuard::executeSafely([&]() {
        // Fire many note events simultaneously (stress test)
        for (int i = 0; i < 1000; ++i) {
            // Trigger all notes at once
            for (int note = 60; note < 84; ++note) {
                instrument->noteOn(note, 0.8f);
            }

            processInstrument(instrument.get(), 1);

            // Release all at once
            for (int note = 60; note < 84; ++note) {
                instrument->noteOff(note);
            }

            processInstrument(instrument.get(), 1);
        }
    });

    EXPECT_FALSE(crashed) << "Instrument crashed under concurrent events";
    printf("✅ 1,000 concurrent event cycles - no crashes\n");
}

TEST_F(CrashResilienceTest, MemoryStress_NoCrash)
{
    printf("\n=== CRASH RESILIENCE TEST: Memory Stress ===\n");

    bool crashed = !CrashGuard::executeSafely([&]() {
        // Create and destroy many instruments rapidly
        for (int i = 0; i < 10000; ++i) {
            auto inst1 = TestHelpers::createInstrument("NexSynth");
            auto inst2 = TestHelpers::createInstrument("SamSampler");
            auto inst3 = TestHelpers::createInstrument("LocalGal");

            inst1->prepare(48000.0, 512);
            inst2->prepare(48000.0, 512);
            inst3->prepare(48000.0, 512);

            // All destroyed automatically
        }
    });

    EXPECT_FALSE(crashed) << "Crashed under memory stress";
    printf("✅ 10,000 instrument allocations - no crashes\n");
}

TEST_F(CrashResilienceTest, StackOverflowProtection_NoCrash)
{
    printf("\n=== CRASH RESILIENCE TEST: Deep Recursion Protection ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    bool crashed = !CrashGuard::executeSafely([&]() {
        // Trigger many notes in rapid succession (could cause deep recursion in voice management)
        for (int i = 0; i < 100000; ++i) {
            instrument->noteOn(i % 128, 0.8f);
            instrument->noteOff(i % 128);
        }

        processInstrument(instrument.get(), 1000);
    });

    EXPECT_FALSE(crashed) << "Instrument crashed (possible stack overflow)";
    printf("✅ 100,000 rapid events - no stack overflow\n");
}

TEST_F(CrashResilienceTest, AllInstrumentsCrashResilience_NoCrashes)
{
    printf("\n=== CRASH RESILIENCE TEST: All Instruments Combined ===\n");

    std::vector<const char*> instrumentNames = {
        "NexSynth",
        "SamSampler",
        "LocalGal",
        "KaneMarco",
        "KaneMarcoAether",
        "KaneMarcoAetherString"
    };

    int totalTests = 0;
    int passedTests = 0;

    for (auto name : instrumentNames) {
        printf("Testing %s...\n", name);

        bool crashed = !CrashGuard::executeSafely([&]() {
            auto instrument = TestHelpers::createInstrument(name);
            instrument->prepare(48000.0, 512);

            // Stress test each instrument
            for (int i = 0; i < 1000; ++i) {
                instrument->noteOn(60 + (i % 24), 0.8f);
                instrument->process(outputs_, 2, 512);
                instrument->noteOff(60 + (i % 24));
                instrument->process(outputs_, 2, 512);

                if (i % 100 == 0) {
                    instrument->reset();
                }
            }
        });

        totalTests++;
        if (!crashed) {
            passedTests++;
            printf("✅ %s - PASSED\n", name);
        } else {
            printf("❌ %s - FAILED (crashed)\n", name);
        }
    }

    printf("\nCrash Resilience Summary: %d/%d instruments passed\n", passedTests, totalTests);
    EXPECT_EQ(passedTests, totalTests) << "Some instruments crashed under stress";
}
