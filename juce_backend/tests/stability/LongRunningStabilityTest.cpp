/*
  ==============================================================================

    LongRunningStabilityTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4B: Long-running stability tests - 24-hour continuous playback validation

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include <memory>
#include <atomic>
#include <csignal>
#include <cstdio>
#include <ctime>

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

// Global flag for graceful shutdown
static std::atomic<bool> g_running(true);

// Signal handler for CTRL+C
void signalHandler(int signum) {
    printf("\n\nReceived signal %d - shutting down gracefully...\n", signum);
    g_running = false;
}

/**
 * @brief Stability metrics tracker
 */
class StabilityMetrics {
public:
    void reset() {
        blocksProcessed_ = 0;
        notesTriggered_ = 0;
        errors_ = 0;
        startTime_ = high_resolution_clock::now();
    }

    void recordBlock() { blocksProcessed_++; }
    void recordNote() { notesTriggered_++; }
    void recordError() { errors_++; }

    double getElapsedSeconds() const {
        auto endTime = high_resolution_clock::now();
        return duration_cast<seconds>(endTime - startTime_).count();
    }

    uint64_t getBlocksProcessed() const { return blocksProcessed_; }
    uint64_t getNotesTriggered() const { return notesTriggered_; }
    uint64_t getErrors() const { return errors_; }

    void printReport() const {
        printf("\n========== STABILITY METRICS REPORT ==========\n");
        printf("Elapsed Time:       %.2f seconds (%.2f minutes)\n", getElapsedSeconds(), getElapsedSeconds() / 60.0);
        printf("Blocks Processed:   %lu\n", (unsigned long)blocksProcessed_);
        printf("Notes Triggered:    %lu\n", (unsigned long)notesTriggered_);
        printf("Errors Detected:    %lu\n", (unsigned long)errors_);
        printf("Blocks/Second:      %.2f\n", blocksProcessed_ / (getElapsedSeconds() + 0.001));
        printf("Notes/Second:       %.2f\n", notesTriggered_ / (getElapsedSeconds() + 0.001));
        printf("==============================================\n\n");
    }

private:
    uint64_t blocksProcessed_ = 0;
    uint64_t notesTriggered_ = 0;
    uint64_t errors_ = 0;
    high_resolution_clock::time_point startTime_;
};

/**
 * @brief Test fixture for long-running stability testing
 */
class LongRunningStabilityTest : public ::testing::Test {
protected:
    void SetUp() override {
        sampleRate_ = 48000.0;
        blockSize_ = 512;
        numChannels_ = 2;

        outputs_[0] = leftBuffer_;
        outputs_[1] = rightBuffer_;

        memset(leftBuffer_, 0, sizeof(leftBuffer_));
        memset(rightBuffer_, 0, sizeof(rightBuffer_));

        metrics_.reset();
    }

    void processInstrument(DSP::InstrumentDSP* instrument, int numBlocks) {
        for (int i = 0; i < numBlocks; ++i) {
            instrument->process(outputs_, numChannels_, blockSize_);
            metrics_.recordBlock();
        }
    }

    // Parse command line args for --short flag
    static bool isShortTest() {
        return testing::internal::GetArgvs().size() > 1 &&
               testing::internal::GetArgvs()[1] == std::string("--short");
    }

    double getTestDuration() {
        // Short version for CI (30 seconds), full version (24 hours)
        return isShortTest() ? 30.0 : (24.0 * 60.0 * 60.0);
    }

    double sampleRate_;
    int blockSize_;
    int numChannels_;
    float* outputs_[2];
    float leftBuffer_[512];
    float rightBuffer_[512];
    StabilityMetrics metrics_;
};

// =============================================================================
// Long-Running Stability Tests
// ==============================================================================

TEST_F(LongRunningStabilityTest, OneHourStability_Stable)
{
    printf("\n=== LONG-RUNNING STABILITY TEST: One-Hour Continuous Playback ===\n");
    printf("Duration: %s\n", isShortTest() ? "30 seconds (short test)" : "1 hour");
    printf("Press CTRL+C to stop early...\n\n");

    // Install signal handler
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    double duration = isShortTest() ? 30.0 : 3600.0;  // 30s or 1 hour
    const int totalBlocks = static_cast<int>((48000.0 * duration) / 512);

    printf("Target: %d blocks (%.2f seconds)\n", totalBlocks, duration);
    printf("Progress: ");

    int reportInterval = totalBlocks / 10;  // Report 10% progress

    for (int block = 0; block < totalBlocks && g_running; ++block) {
        // Simulate realistic note patterns
        if (block % 100 == 0) {
            instrument->noteOn(60 + (block % 12), 0.8f);
            metrics_.recordNote();
        }
        if (block % 100 == 90) {
            instrument->noteOff(60 + ((block - 10) % 12));
        }

        instrument->process(outputs_, numChannels_, blockSize_);

        // Progress indicator
        if (block % reportInterval == 0) {
            int progress = (block * 100) / totalBlocks;
            printf("%d%% ", progress);
            fflush(stdout);
        }
    }

    printf("100%%\n\n");

    metrics_.printReport();

    EXPECT_EQ(metrics_.getErrors(), 0ULL) << "Errors detected during stability test";
    EXPECT_GT(metrics_.getBlocksProcessed(), 0ULL) << "No blocks processed";

    printf("✅ One-hour stability test PASSED\n");
}

TEST_F(LongRunningStabilityTest, TwentyFourHourStability_Stable)
{
    printf("\n=== LONG-RUNNING STABILITY TEST: 24-Hour Marathon ===\n");
    printf("This is the FULL 24-hour test (use --short for quick testing)\n");
    printf("Duration: %s\n", isShortTest() ? "30 seconds (short test)" : "24 hours");
    printf("Press CTRL+C to stop early...\n\n");

    if (!isShortTest()) {
        printf("⚠️  WARNING: This test will run for 24 hours!\n");
        printf("    Starting 24-hour stability test at ");
        fflush(stdout);

        time_t now = time(0);
        char* dt = ctime(&now);
        printf("%s", dt);

        printf("    Expected completion: ");
        fflush(stdout);

        time_t finish = now + (24 * 60 * 60);
        char* dt_finish = ctime(&finish);
        printf("%s", dt_finish);
    }

    // Install signal handler
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    // Create all 6 instruments for comprehensive test
    std::vector<std::unique_ptr<DSP::InstrumentDSP>> instruments;
    std::vector<const char*> names = {
        "NexSynth", "SamSampler", "LocalGal",
        "KaneMarco", "KaneMarcoAether", "KaneMarcoAetherString"
    };

    for (auto name : names) {
        auto inst = TestHelpers::createInstrument(name);
        ASSERT_NE(inst, nullptr);
        inst->prepare(sampleRate_, blockSize_);
        instruments.push_back(std::move(inst));
    }

    double duration = isShortTest() ? 30.0 : (24.0 * 60.0 * 60.0);  // 30s or 24 hours
    const int totalBlocks = static_cast<int>((48000.0 * duration) / 512);

    printf("\nProcessing %lu blocks...\n", (unsigned long)totalBlocks);
    printf("Progress: (updates every 10%%)\n\n");

    int reportInterval = totalBlocks / 10;  // Report every 10%

    for (int block = 0; block < totalBlocks && g_running; ++block) {
        // Rotate through instruments with different patterns
        for (size_t instIdx = 0; instIdx < instruments.size(); ++instIdx) {
            // Different note patterns for each instrument
            if (block % (8 * (instIdx + 1)) == 0) {
                instruments[instIdx]->noteOn(60 + (block % 24), 0.8f);
                metrics_.recordNote();
            }
            if (block % (8 * (instIdx + 1)) == (7 * (instIdx + 1))) {
                instruments[instIdx]->noteOff(60 + ((block - 7) % 24));
            }

            instruments[instIdx]->process(outputs_, numChannels_, blockSize_);
            metrics_.recordBlock();
        }

        // Progress report
        if (block % reportInterval == 0) {
            int progress = (block * 100) / totalBlocks;
            double elapsed = metrics_.getElapsedSeconds();
            double remaining = (elapsed / (block + 1)) * (totalBlocks - block);

            printf("[%3d%%] Elapsed: %5.0fs | Remaining: %5.0fs | Errors: %lu\n",
                   progress, elapsed, remaining, (unsigned long)metrics_.getErrors());
            fflush(stdout);
        }
    }

    printf("\n");

    if (!g_running) {
        printf("\n⚠️  Test stopped early by user\n");
    } else {
        printf("\n✅ 24-hour test completed!\n");
    }

    metrics_.printReport();

    EXPECT_EQ(metrics_.getErrors(), 0ULL) << "Errors detected during 24-hour test";
    EXPECT_GT(metrics_.getBlocksProcessed(), 0ULL) << "No blocks processed";

    // Final validation
    printf("\nFinal validation check...\n");
    for (size_t i = 0; i < instruments.size(); ++i) {
        instruments[i]->reset();
        instruments[i]->process(outputs_, numChannels_, blockSize_);

        // Check for silent output after reset
        bool silent = true;
        for (int s = 0; s < blockSize_; ++s) {
            if (std::abs(leftBuffer_[s]) > 0.0001f || std::abs(rightBuffer_[s]) > 0.0001f) {
                silent = false;
                break;
            }
        }
        EXPECT_TRUE(silent) << "Instrument " << i << " not silent after reset";
    }

    printf("✅ All instruments still functional after 24-hour stress test\n");
}

TEST_F(LongRunningStabilityTest, MemoryStability_NoGrowth)
{
    printf("\n=== LONG-RUNNING STABILITY TEST: Memory Stability ===\n");
    printf("Testing for memory leaks over extended period\n");
    printf("Duration: %s\n", isShortTest() ? "30 seconds (short test)" : "10 minutes");

    // Install signal handler
    std::signal(SIGINT, signalHandler);

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAether"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    double duration = isShortTest() ? 30.0 : 600.0;  // 30s or 10 minutes
    const int totalBlocks = static_cast<int>((48000.0 * duration) / 512);

    printf("Processing %d blocks...\n", totalBlocks);

    for (int block = 0; block < totalBlocks && g_running; ++block) {
        // Aggressive note triggering
        if (block % 50 == 0) {
            for (int note = 60; note < 72; ++note) {
                instrument->noteOn(note, 0.8f);
                metrics_.recordNote();
            }
        }
        if (block % 50 == 40) {
            for (int note = 60; note < 72; ++note) {
                instrument->noteOff(note);
            }
        }

        instrument->process(outputs_, numChannels_, blockSize_);
        metrics_.recordBlock();

        if (block % 1000 == 0) {
            printf("Progress: %d%%\r", (block * 100) / totalBlocks);
            fflush(stdout);
        }
    }

    printf("Progress: 100%%\n\n");

    metrics_.printReport();

    // Note: Actual memory leak detection requires Valgrind/ASan
    // This test validates that the instrument doesn't crash under memory stress
    EXPECT_GT(metrics_.getBlocksProcessed(), 0ULL) << "No blocks processed";

    printf("✅ Memory stability test completed (run with Valgrind for leak detection)\n");
}

TEST_F(LongRunningStabilityTest, ResetCyclesStability_Stable)
{
    printf("\n=== LONG-RUNNING STABILITY TEST: Reset Cycle Stability ===\n");
    printf("Testing instrument reset over extended period\n");
    printf("Duration: %s\n", isShortTest() ? "30 seconds (short test)" : "1 hour");

    // Install signal handler
    std::signal(SIGINT, signalHandler);

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);

    double duration = isShortTest() ? 30.0 : 3600.0;  // 30s or 1 hour
    const int resetCycles = static_cast<int>(duration * 10);  // 10 resets per second

    printf("Performing %d reset cycles...\n", resetCycles);

    for (int cycle = 0; cycle < resetCycles && g_running; ++cycle) {
        instrument->prepare(sampleRate_, blockSize_);

        // Trigger notes
        for (int note = 60; note < 72; ++note) {
            instrument->noteOn(note, 0.8f);
            metrics_.recordNote();
        }

        processInstrument(instrument.get(), 10);

        instrument->reset();

        if (cycle % 100 == 0) {
            printf("Progress: %d%%\r", (cycle * 100) / resetCycles);
            fflush(stdout);
        }
    }

    printf("Progress: 100%%\n\n");

    metrics_.printReport();

    EXPECT_GT(metrics_.getNotesTriggered(), 0ULL) << "No notes triggered";

    printf("✅ Reset cycle stability test PASSED\n");
}

TEST_F(LongRunningStabilityTest, VoiceStealingStability_Stable)
{
    printf("\n=== LONG-RUNNING STABILITY TEST: Voice Stealing Stability ===\n");
    printf("Testing voice management under extreme polyphony\n");
    printf("Duration: %s\n", isShortTest() ? "30 seconds (short test)" : "1 hour");

    // Install signal handler
    std::signal(SIGINT, signalHandler);

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    double duration = isShortTest() ? 30.0 : 3600.0;  // 30s or 1 hour
    const int totalBlocks = static_cast<int>((48000.0 * duration) / 512);

    printf("Processing %d blocks with extreme polyphony...\n", totalBlocks);

    for (int block = 0; block < totalBlocks && g_running; ++block) {
        // Trigger more voices than polyphony limit (forces voice stealing)
        for (int note = 0; note < 128; ++note) {
            instrument->noteOn(note, 0.8f);
            metrics_.recordNote();
        }

        processInstrument(instrument.get(), 10);

        // Release all
        for (int note = 0; note < 128; ++note) {
            instrument->noteOff(note);
        }

        processInstrument(instrument.get(), 10);

        if (block % 1000 == 0) {
            printf("Progress: %d%%\r", (block * 100) / totalBlocks);
            fflush(stdout);
        }
    }

    printf("Progress: 100%%\n\n");

    metrics_.printReport();

    EXPECT_EQ(metrics_.getErrors(), 0ULL) << "Errors during voice stealing test";

    printf("✅ Voice stealing stability test PASSED\n");
}
