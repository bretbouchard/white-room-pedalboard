/*
  ==============================================================================

    InstrumentPerformanceTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4A: Per-instrument CPU performance profiling tests

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include <memory>
#include <cmath>

// Pure DSP instrument headers (correct paths)
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
 * @brief CPU usage profiler for audio processing
 *
 * Measures actual CPU time used by audio processing
 * to verify < 20% CPU per instrument budget.
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

        // Calculate actual processing time per sample
        double timePerSample_ns = static_cast<double>(totalTime_ns_) / sampleCount_;

        // Calculate real-time budget per sample (in nanoseconds)
        double budgetPerSample_ns = 1e9 / sampleRate;

        // CPU usage = processing time / budget time
        double cpuPerChannel = timePerSample_ns / budgetPerSample_ns;

        // Account for multi-channel processing
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
 * @brief Test fixture for instrument performance testing
 */
class InstrumentPerformanceTest : public ::testing::Test {
protected:
    void SetUp() override {
        sampleRate_ = 48000.0;
        blockSize_ = 512;
        numChannels_ = 2;

        // Allocate output buffers
        outputs_[0] = leftBuffer_;
        outputs_[1] = rightBuffer_;

        // Clear buffers
        memset(leftBuffer_, 0, sizeof(leftBuffer_));
        memset(rightBuffer_, 0, sizeof(rightBuffer_));
    }

    void TearDown() override {
        // Cleanup
    }

    // Process instrument for specified duration and measure CPU
    double processAndProfile(DSP::InstrumentDSP* instrument, double durationSeconds) {
        CPUProfiler profiler;

        const int numBlocks = static_cast<int>((48000.0 * durationSeconds) / 512);

        // Warm-up (first block to initialize any internal state)
        instrument->process(outputs_, numChannels_, blockSize_);

        // Profile processing
        for (int i = 0; i < numBlocks; ++i) {
            profiler.start();
            instrument->process(outputs_, numChannels_, blockSize_);
            profiler.stop(blockSize_);
        }

        return profiler.getCPUUsage(sampleRate_, numChannels_);
    }

    // Test parameters
    double sampleRate_;
    int blockSize_;
    int numChannels_;
    float* outputs_[2];
    float leftBuffer_[512];
    float rightBuffer_[512];

    // Apple TV CPU budget: < 20% per instrument
    static constexpr double APPLE_TV_CPU_BUDGET = 0.20;  // 20%
};

// ==============================================================================
// Per-Instrument CPU Tests
// ==============================================================================

TEST_F(InstrumentPerformanceTest, NexSynth_SingleNote_CPU)
{
    auto instrument = TestHelpers::createInstrument("NexSynth");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger single note (worst-case: rich FM patch)
    instrument->noteOn(60, 1.0f);  // Middle C, full velocity

    double cpuUsage = processAndProfile(instrument.get(), 10.0);  // 10 seconds

    printf("NexSynth CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "NexSynth exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, NexSynth_Polyphonic_CPU)
{
    auto instrument = TestHelpers::createInstrument("NexSynth");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger 8-voice chord (worst-case polyphony)
    for (int i = 0; i < 8; ++i) {
        instrument->noteOn(60 + i * 4, 0.8f);  // C major chord spread
    }

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("NexSynth (8 voices) CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "NexSynth polyphonic exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, SamSampler_SingleNote_CPU)
{
    auto instrument = TestHelpers::createInstrument("SamSampler");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger single note
    instrument->noteOn(60, 1.0f);

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("SamSampler CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "SamSampler exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, SamSampler_Polyphonic_CPU)
{
    auto instrument = TestHelpers::createInstrument("SamSampler");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger 8-voice chord
    for (int i = 0; i < 8; ++i) {
        instrument->noteOn(60 + i * 4, 0.8f);
    }

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("SamSampler (8 voices) CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "SamSampler polyphonic exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, LocalGal_SingleNote_CPU)
{
    auto instrument = TestHelpers::createInstrument("LocalGal");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger single note
    instrument->noteOn(60, 1.0f);

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("LocalGal CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "LocalGal exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, LocalGal_Polyphonic_CPU)
{
    auto instrument = TestHelpers::createInstrument("LocalGal");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger 8-voice chord
    for (int i = 0; i < 8; ++i) {
        instrument->noteOn(60 + i * 4, 0.8f);
    }

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("LocalGal (8 voices) CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "LocalGal polyphonic exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, KaneMarco_SingleNote_CPU)
{
    auto instrument = TestHelpers::createInstrument("KaneMarco");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger single note
    instrument->noteOn(60, 1.0f);

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("KaneMarco CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "KaneMarco exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, KaneMarco_Polyphonic_CPU)
{
    auto instrument = TestHelpers::createInstrument("KaneMarco");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger 8-voice chord
    for (int i = 0; i < 8; ++i) {
        instrument->noteOn(60 + i * 4, 0.8f);
    }

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("KaneMarco (8 voices) CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "KaneMarco polyphonic exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, KaneMarcoAether_SingleNote_CPU)
{
    auto instrument = TestHelpers::createInstrument("KaneMarcoAether");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger single note
    instrument->noteOn(60, 1.0f);

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("KaneMarcoAether CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "KaneMarcoAether exceeds 20% CPU budget";
}

TEST_F(InstrumentPerformanceTest, KaneMarcoAetherString_SingleNote_CPU)
{
    auto instrument = TestHelpers::createInstrument("KaneMarcoAetherString");
    ASSERT_NE(instrument, nullptr);

    instrument->prepare(sampleRate_, blockSize_);

    // Trigger single note
    instrument->noteOn(60, 1.0f);

    double cpuUsage = processAndProfile(instrument.get(), 10.0);

    printf("KaneMarcoAetherString CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, APPLE_TV_CPU_BUDGET) << "KaneMarcoAetherString exceeds 20% CPU budget";
}

// ==============================================================================
// Summary Test
// ==============================================================================

TEST_F(InstrumentPerformanceTest, AllInstruments_CPU_Summary)
{
    printf("\n=== PER-INSTRUMENT CPU PERFORMANCE SUMMARY ===\n");
    printf("Apple TV CPU Budget: < 20%% per instrument\n\n");

    std::vector<const char*> instrumentNames = {
        "NexSynth",
        "SamSampler",
        "LocalGal",
        "KaneMarco",
        "KaneMarcoAether",
        "KaneMarcoAetherString"
    };

    std::vector<double> cpuUsages;

    for (auto name : instrumentNames) {
        auto instrument = TestHelpers::createInstrument(name);
        ASSERT_NE(instrument, nullptr);

        instrument->prepare(sampleRate_, blockSize_);

        // Test worst-case: 8-voice chord
        for (int i = 0; i < 8; ++i) {
            instrument->noteOn(60 + i * 4, 0.8f);
        }

        double cpuUsage = processAndProfile(instrument.get(), 10.0);
        cpuUsages.push_back(cpuUsage);

        printf("%-25s: %6.2f%% %s\n",
               name,
               cpuUsage * 100.0,
               cpuUsage < APPLE_TV_CPU_BUDGET ? "✅ PASS" : "❌ FAIL");
    }

    printf("\n");

    // Check all instruments pass
    for (size_t i = 0; i < cpuUsages.size(); ++i) {
        EXPECT_LT(cpuUsages[i], APPLE_TV_CPU_BUDGET)
            << "Instrument " << instrumentNames[i] << " exceeds 20% CPU budget";
    }

    // Calculate total CPU for all instruments
    double totalCPU = 0.0;
    for (double cpu : cpuUsages) {
        totalCPU += cpu;
    }

    printf("Total CPU (all instruments): %.2f%%\n", totalCPU * 100.0);
    printf("Remaining headroom: %.2f%%\n", (1.0 - totalCPU) * 100.0);
    printf("\n");

    // Verify headroom exists (should use < 80% total for 6 instruments)
    EXPECT_LT(totalCPU, 0.80) << "Total CPU usage exceeds 80% for all instruments";
}
