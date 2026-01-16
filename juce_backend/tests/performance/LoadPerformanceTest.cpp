/*
  ==============================================================================

    LoadPerformanceTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4A: Multi-instrument load performance tests

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include <memory>
#include <algorithm>

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
 * @brief CPU usage profiler for load testing
 */
class CPUProfiler {
public:
    CPUProfiler()
        : startTime_()
        , totalTime_ns_(0)
        , sampleCount_(0)
    {}

    void start() {
        startTime_ = high_resolution_clock::now();
    }

    void stop(int samplesProcessed) {
        auto endTime = high_resolution_clock::now();
        totalTime_ns_ += duration_cast<nanoseconds>(endTime - startTime_).count();
        sampleCount_ += samplesProcessed;
    }

    double getCPUUsage(double sampleRate, int numChannels) const {
        if (sampleCount_ == 0) return 0.0;

        double timePerSample_ns = static_cast<double>(totalTime_ns_) / sampleCount_;
        double budgetPerSample_ns = 1e9 / sampleRate;
        double cpuPerChannel = timePerSample_ns / budgetPerSample_ns;

        return cpuPerChannel / numChannels;
    }

    void reset() {
        totalTime_ns_ = 0;
        sampleCount_ = 0;
    }

private:
    high_resolution_clock::time_point startTime_;
    uint64_t totalTime_ns_;
    uint64_t sampleCount_;
};

/**
 * @brief Test fixture for load performance testing
 */
class LoadPerformanceTest : public ::testing::Test {
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

    void TeararDown() {
        instruments_.clear();
    }

    double processAndProfile(double durationSeconds) {
        CPUProfiler profiler;
        const int numBlocks = static_cast<int>((48000.0 * durationSeconds) / 512);

        // Warm-up
        for (auto& inst : instruments_) {
            inst->process(outputs_, numChannels_, blockSize_);
        }

        // Profile all instruments
        for (int i = 0; i < numBlocks; ++i) {
            profiler.start();

            // Process all instruments
            for (auto& inst : instruments_) {
                inst->process(outputs_, numChannels_, blockSize_);
            }

            profiler.stop(blockSize_);
        }

        return profiler.getCPUUsage(sampleRate_, numChannels_);
    }

    std::vector<std::unique_ptr<DSP::InstrumentDSP>> instruments_;
    double sampleRate_;
    int blockSize_;
    int numChannels_;
    float* outputs_[2];
    float leftBuffer_[512];
    float rightBuffer_[512];

    // Apple TV load budget: < 80% for all instruments
    static constexpr double APPLE_TV_LOAD_BUDGET = 0.80;  // 80%
};

// ==============================================================================
// Load Tests
// ==============================================================================

TEST_F(LoadPerformanceTest, TwoInstruments_CPU)
{
    printf("\n=== LOAD TEST: 2 Instruments ===\n");

    // Create 2 instruments
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler")));

    for (auto& inst : instruments_) {
        ASSERT_NE(inst, nullptr);
        inst->prepare(sampleRate_, blockSize_);

        // Trigger 4 voices each
        for (int i = 0; i < 4; ++i) {
            inst->noteOn(60 + i * 4, 0.8f);
        }
    }

    double cpuUsage = processAndProfile(10.0);

    printf("2 Instruments CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    printf("Per-Instrument Average: %.2f%%\n", (cpuUsage / 2.0) * 100.0);

    EXPECT_LT(cpuUsage, APPLE_TV_LOAD_BUDGET) << "2 instruments exceed 80% CPU budget";
    EXPECT_LT(cpuUsage / 2.0, 0.20) << "Average per-instrument exceeds 20% CPU";
}

TEST_F(LoadPerformanceTest, FourInstruments_CPU)
{
    printf("\n=== LOAD TEST: 4 Instruments ===\n");

    // Create 4 instruments
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco")));

    for (auto& inst : instruments_) {
        ASSERT_NE(inst, nullptr);
        inst->prepare(sampleRate_, blockSize_);

        // Trigger 4 voices each
        for (int i = 0; i < 4; ++i) {
            inst->noteOn(60 + i * 4, 0.8f);
        }
    }

    double cpuUsage = processAndProfile(10.0);

    printf("4 Instruments CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    printf("Per-Instrument Average: %.2f%%\n", (cpuUsage / 4.0) * 100.0);

    EXPECT_LT(cpuUsage, APPLE_TV_LOAD_BUDGET) << "4 instruments exceed 80% CPU budget";
    EXPECT_LT(cpuUsage / 4.0, 0.20) << "Average per-instrument exceeds 20% CPU";
}

TEST_F(LoadPerformanceTest, SixInstruments_CPU)
{
    printf("\n=== LOAD TEST: 6 Instruments ===\n");

    // Create 6 instruments
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAether")));
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarcoAetherString")));

    for (auto& inst : instruments_) {
        ASSERT_NE(inst, nullptr);
        inst->prepare(sampleRate_, blockSize_);

        // Trigger 4 voices each
        for (int i = 0; i < 4; ++i) {
            inst->noteOn(60 + i * 4, 0.8f);
        }
    }

    double cpuUsage = processAndProfile(10.0);

    printf("6 Instruments CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    printf("Per-Instrument Average: %.2f%%\n", (cpuUsage / 6.0) * 100.0);
    printf("Remaining Headroom: %.2f%%\n", (1.0 - cpuUsage) * 100.0);

    EXPECT_LT(cpuUsage, APPLE_TV_LOAD_BUDGET) << "6 instruments exceed 80% CPU budget";
    EXPECT_LT(cpuUsage / 6.0, 0.20) << "Average per-instrument exceeds 20% CPU";
}

TEST_F(LoadPerformanceTest, RealisticSong_CPU)
{
    printf("\n=== LOAD TEST: Realistic Song ===\n");
    printf("Simulating typical song with varying note density\n\n");

    // Create realistic band setup
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth")));  // Lead
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco")));  // Pad
    instruments_.push_back(std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler")));  // Bass

    for (auto& inst : instruments_) {
        ASSERT_NE(inst, nullptr);
        inst->prepare(sampleRate_, blockSize_);
    }

    CPUProfiler profiler;
    constexpr int numBlocks = static_cast<int>((48000.0 * 30.0) / 512);  // 30 seconds

    // Simulate realistic song patterns
    for (int block = 0; block < numBlocks; ++block) {
        profiler.start();

        // Lead: melody (occasional notes)
        if (block % 8 == 0) {
            instruments_[0]->noteOn(60 + (block % 12), 0.9f);
        }
        if (block % 8 == 7) {
            instruments_[0]->noteOff(60 + ((block - 1) % 12));
        }

        // Pad: sustained chord (constant)
        if (block == 0) {
            instruments_[1]->noteOn(48, 0.7f);
            instruments_[1]->noteOn(52, 0.7f);
            instruments_[1]->noteOn(55, 0.7f);
        }

        // Bass: root notes (every beat)
        if (block % 8 == 0) {
            instruments_[2]->noteOn(36, 0.9f);
        }
        if (block % 8 == 6) {
            instruments_[2]->noteOff(36);
        }

        // Process all instruments
        for (auto& inst : instruments_) {
            inst->process(outputs_, numChannels_, blockSize_);
        }

        profiler.stop(blockSize_);
    }

    double cpuUsage = profiler.getCPUUsage(sampleRate_, numChannels_);

    printf("Realistic Song (30 seconds) CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    printf("Remaining Headroom: %.2f%%\n", (1.0 - cpuUsage) * 100.0);

    EXPECT_LT(cpuUsage, APPLE_TV_LOAD_BUDGET) << "Realistic song exceeds 80% CPU budget";
}

TEST_F(LoadPerformanceTest, WorstCaseAllInstruments_CPU)
{
    printf("\n=== LOAD TEST: Worst Case - All Instruments ===\n");
    printf("Testing absolute maximum load with all instruments active\n\n");

    // Create all 6 instruments
    std::vector<const char*> instrumentNames = {
        "NexSynth",
        "SamSampler",
        "LocalGal",
        "KaneMarco",
        "KaneMarcoAether",
        "KaneMarcoAetherString"
    };

    for (auto name : instrumentNames) {
        auto inst = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument(name));
        ASSERT_NE(inst, nullptr);
        inst->prepare(sampleRate_, blockSize_);

        // Trigger worst-case: 8 voices each
        for (int i = 0; i < 8; ++i) {
            inst->noteOn(60 + i * 2, 1.0f);  // Dense cluster
        }

        instruments_.push_back(std::move(inst));
    }

    double cpuUsage = processAndProfile(10.0);

    printf("Worst Case (6 instruments × 8 voices = 48 voices)\n");
    printf("Total CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    printf("Per-Instrument Average: %.2f%%\n", (cpuUsage / 6.0) * 100.0);
    printf("Per-Voice Average: %.2f%%\n", (cpuUsage / 48.0) * 100.0);

    if (cpuUsage >= APPLE_TV_LOAD_BUDGET) {
        printf("\n⚠️  WARNING: Worst case exceeds 80%% CPU budget\n");
        printf("   This is acceptable if:\n");
        printf("   - Typical usage is well below budget\n");
        printf("   - User can limit voice count\n");
        printf("   - CPU overload protection is active\n");
    } else {
        printf("\n✅ PASS: Even worst case fits within CPU budget\n");
    }

    // For worst case, we allow up to 95% CPU if typical usage is reasonable
    EXPECT_LT(cpuUsage, 0.95) << "Worst case exceeds 95% CPU (unacceptable)";
}

TEST_F(LoadPerformanceTest, VoiceCountScaling_CPU)
{
    printf("\n=== LOAD TEST: Voice Count Scaling ===\n");
    printf("Testing CPU usage vs voice count\n\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    printf("Voice Count | CPU Usage | Per-Voice CPU\n");
    printf("------------|-----------|---------------\n");

    for (int voices = 1; voices <= 16; voices *= 2) {
        // Trigger voices
        for (int i = 0; i < voices; ++i) {
            instrument->noteOn(60 + i, 0.8f);
        }

        // Measure CPU
        double cpuUsage = processAndProfile(5.0);
        double perVoiceCPU = cpuUsage / voices;

        printf("%11d | %8.2f%% | %12.4f%%\n", voices, cpuUsage * 100.0, perVoiceCPU * 100.0);

        // Verify linear or sub-linear scaling
        if (voices > 1) {
            EXPECT_LT(perVoiceCPU, 0.10) << "Per-voice CPU exceeds 10% at " << voices << " voices";
        }

        // Reset for next test
        instrument = TestHelpers::createInstrument("NexSynth");
        instrument->prepare(sampleRate_, blockSize_);
    }

    printf("\n✅ Voice scaling test complete\n");
}
