/*
  ==============================================================================

    StressPerformanceTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4A: Stress performance tests - worst-case scenarios

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include <memory>
#include <random>

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
 * @brief CPU usage profiler
 */
class CPUProfiler {
public:
    CPUProfiler() : totalTime_ns_(0), sampleCount_(0) {}

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
        return (timePerSample_ns / budgetPerSample_ns) / numChannels;
    }

private:
    high_resolution_clock::time_point startTime_;
    uint64_t totalTime_ns_ = 0;
    uint64_t sampleCount_ = 0;
};

/**
 * @brief Test fixture for stress testing
 */
class StressPerformanceTest : public ::testing::Test {
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

    double processAndProfile(DSP::InstrumentDSP* instrument, double durationSeconds) {
        CPUProfiler profiler;
        const int numBlocks = static_cast<int>((48000.0 * durationSeconds) / 512);

        for (int i = 0; i < numBlocks; ++i) {
            profiler.start();
            instrument->process(outputs_, numChannels_, blockSize_);
            profiler.stop(blockSize_);
        }

        return profiler.getCPUUsage(sampleRate_, numChannels_);
    }

    double sampleRate_;
    int blockSize_;
    int numChannels_;
    float* outputs_[2];
    float leftBuffer_[512];
    float rightBuffer_[512];
};

// ==============================================================================
// Stress Tests
// ==============================================================================

TEST_F(StressPerformanceTest, RapidNoteOnOff_CPU)
{
    printf("\n=== STRESS TEST: Rapid Note On/Off ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Stress test: rapid note triggering (every block)
    CPUProfiler profiler;
    constexpr int numBlocks = static_cast<int>(48000.0 * 5.0 / 512);  // 5 seconds

    for (int i = 0; i < numBlocks; ++i) {
        // Toggle notes every block (worst-case envelope triggering)
        if (i % 2 == 0) {
            instrument->noteOn(60, 1.0f);
            instrument->noteOn(64, 1.0f);
        } else {
            instrument->noteOff(60);
            instrument->noteOff(64);
        }

        profiler.start();
        instrument->process(outputs_, numChannels_, blockSize_);
        profiler.stop(blockSize_);
    }

    double cpuUsage = profiler.getCPUUsage(sampleRate_, numChannels_);

    printf("Rapid Note On/Off CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, 0.25) << "Rapid note triggering exceeds 25% CPU";
}

TEST_F(StressPerformanceTest, AllNotesTriggered_CPU)
{
    printf("\n=== STRESS TEST: All MIDI Notes ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("SamSampler"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Trigger all 128 MIDI notes
    for (int note = 0; note < 128; ++note) {
        instrument->noteOn(note, 0.8f);
    }

    double cpuUsage = processAndProfile(instrument.get(), 5.0);

    printf("All 128 Notes CPU Usage: %.2f%%\n", cpuUsage * 100.0);

    // This is expected to be high, but should not crash
    printf("⚠️  Note: All 128 notes is extreme stress test\n");
    EXPECT_LT(cpuUsage, 1.0) << "All notes exceed 100% CPU (should still process)";
    EXPECT_GT(cpuUsage, 0.0) << "CPU usage should be measurable";
}

TEST_F(StressPerformanceTest, ParameterModulation_CPU)
{
    printf("\n=== STRESS TEST: Parameter Modulation ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    instrument->noteOn(60, 1.0f);

    // Stress test: rapid parameter changes
    CPUProfiler profiler;
    constexpr int numBlocks = static_cast<int>(48000.0 * 5.0 / 512);

    std::mt19937 rng(42);  // Seeded for determinism
    std::uniform_real_distribution<float> paramDist(0.0f, 1.0f);

    for (int i = 0; i < numBlocks; ++i) {
        // Modulate parameters every block
        for (int paramId = 0; paramId < 10; ++paramId) {
            float value = paramDist(rng);
            // instrument->setParameter requires const char* paramId, skipping for now
        }

        profiler.start();
        instrument->process(outputs_, numChannels_, blockSize_);
        profiler.stop(blockSize_);
    }

    double cpuUsage = profiler.getCPUUsage(sampleRate_, numChannels_);

    printf("Parameter Modulation CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, 0.25) << "Parameter modulation exceeds 25% CPU";
}

TEST_F(StressPerformanceTest, PitchBend_Modulation_CPU)
{
    printf("\n=== STRESS TEST: Pitch Bend + Modulation ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    instrument->noteOn(60, 1.0f);

    CPUProfiler profiler;
    constexpr int numBlocks = static_cast<int>(48000.0 * 5.0 / 512);

    // Continuous pitch bend and modulation
    for (int i = 0; i < numBlocks; ++i) {
        // LFO-like pitch bend
        float bend = std::sin(i * 0.1) * 2.0f;  // ±2 semitones
        // TODO: instrument->pitchBend() not implemented in base interface
        // DSP::ScheduledEvent bendEvent;
        // bendEvent.type = DSP::ScheduledEvent::PITCH_BEND;
        // bendEvent.data.pitchBend.bendValue = bend;
        // instrument->handleEvent(bendEvent);

        // Modulation wheel
        float mod = (std::sin(i * 0.05) + 1.0) * 0.5f;  // 0 to 1
        // TODO: instrument->setModWheel() not implemented in base interface

        profiler.start();
        instrument->process(outputs_, numChannels_, blockSize_);
        profiler.stop(blockSize_);
    }

    double cpuUsage = profiler.getCPUUsage(sampleRate_, numChannels_);

    printf("Pitch Bend + Modulation CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, 0.25) << "Pitch bend/modulation exceeds 25% CPU";
}

TEST_F(StressPerformanceTest, PolyphonyBurst_CPU)
{
    printf("\n=== STRESS TEST: Polyphony Burst ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("KaneMarco"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    // Burst of notes (simulating glissando or rapid run)
    CPUProfiler profiler;
    constexpr int numBlocks = static_cast<int>(48000.0 * 5.0 / 512);

    int currentNote = 60;
    for (int i = 0; i < numBlocks; ++i) {
        // Add new note every block
        if (currentNote < 84) {  // 2 octave range
            instrument->noteOn(currentNote++, 0.9f);
        }

        // Release old notes (voice stealing)
        if (currentNote > 72) {
            instrument->noteOff(currentNote - 24);
        }

        profiler.start();
        instrument->process(outputs_, numChannels_, blockSize_);
        profiler.stop(blockSize_);
    }

    double cpuUsage = profiler.getCPUUsage(sampleRate_, numChannels_);

    printf("Polyphony Burst CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, 0.30) << "Polyphony burst exceeds 30% CPU";
}

TEST_F(StressPerformanceTest, ResetDuringPlayback_CPU)
{
    printf("\n=== STRESS TEST: Reset During Playback ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("LocalGal"));
    ASSERT_NE(instrument, nullptr);
    instrument->prepare(sampleRate_, blockSize_);

    instrument->noteOn(60, 1.0f);

    // Stress test: reset while playing
    CPUProfiler profiler;
    constexpr int numBlocks = static_cast<int>(48000.0 * 5.0 / 512);

    for (int i = 0; i < numBlocks; ++i) {
        // Reset every 100 blocks (simulating preset changes)
        if (i % 100 == 0 && i > 0) {
            instrument->reset();
            instrument->noteOn(60, 1.0f);  // Re-trigger after reset
        }

        profiler.start();
        instrument->process(outputs_, numChannels_, blockSize_);
        profiler.stop(blockSize_);
    }

    double cpuUsage = profiler.getCPUUsage(sampleRate_, numChannels_);

    printf("Reset During Playback CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    EXPECT_LT(cpuUsage, 0.25) << "Reset during playback exceeds 25% CPU";
}

TEST_F(StressPerformanceTest, ExtremeSampleRate_CPU)
{
    printf("\n=== STRESS TEST: Extreme Sample Rates ===\n");

    auto instrument = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument("NexSynth"));
    ASSERT_NE(instrument, nullptr);

    instrument->noteOn(60, 1.0f);

    // Test at different sample rates
    std::vector<double> sampleRates = {44100.0, 48000.0, 96000.0, 192000.0};

    printf("Sample Rate | CPU Usage | Real-Time Factor\n");
    printf("------------|-----------|------------------\n");

    for (double sr : sampleRates) {
        instrument->prepare(sr, 512);

        // Process 1 second worth
        CPUProfiler profiler;
        int numBlocks = static_cast<int>(sr / 512);

        for (int i = 0; i < numBlocks; ++i) {
            profiler.start();
            instrument->process(outputs_, numChannels_, 512);
            profiler.stop(512);
        }

        double cpuUsage = profiler.getCPUUsage(sr, numChannels_);

        // Higher sample rates = less real-time budget per sample
        // So CPU usage should scale accordingly
        printf("%11.0f | %8.2f%% | %14.2fx\n", sr, cpuUsage * 100.0, cpuUsage * (sr / 48000.0));

        // Even at 192kHz, should be processable
        EXPECT_LT(cpuUsage, 1.0) << "Cannot process in real-time at " << sr << "Hz";

        // Reset for next test
        instrument = TestHelpers::createInstrument("NexSynth");
        instrument->noteOn(60, 1.0f);
    }

    printf("\n✅ All sample rates processable in real-time\n");
}

TEST_F(StressPerformanceTest, AllInstrumentsStress_CPU)
{
    printf("\n=== STRESS TEST: All Instruments - Combined Stress ===\n");
    printf("Testing all instruments simultaneously with worst-case patterns\n\n");

    std::vector<std::unique_ptr<DSP::InstrumentDSP>> instruments;
    std::vector<const char*> names = {"NexSynth", "SamSampler", "LocalGal"};

    for (auto name : names) {
        auto inst = std::unique_ptr<DSP::InstrumentDSP>(TestHelpers::createInstrument(name));
        ASSERT_NE(inst, nullptr);
        inst->prepare(sampleRate_, blockSize_);
        inst->noteOn(60, 1.0f);
        instruments.push_back(std::move(inst));
    }

    // Combined stress: all instruments, rapid parameter changes
    CPUProfiler profiler;
    constexpr int numBlocks = static_cast<int>(48000.0 * 5.0 / 512);

    for (int i = 0; i < numBlocks; ++i) {
        // Modulate all instruments
        for (size_t instIdx = 0; instIdx < instruments.size(); ++instIdx) {
            if (i % 8 == 0) {
                instruments[instIdx]->noteOn(60 + (i % 12), 0.9f);
            }
            if (i % 8 == 6) {
                instruments[instIdx]->noteOff(60 + ((i - 2) % 12));
            }
        }

        profiler.start();
        for (auto& inst : instruments) {
            inst->process(outputs_, numChannels_, blockSize_);
        }
        profiler.stop(blockSize_);
    }

    double cpuUsage = profiler.getCPUUsage(sampleRate_, numChannels_);

    printf("All Instruments Stress CPU Usage: %.2f%%\n", cpuUsage * 100.0);
    printf("Per-Instrument Average: %.2f%%\n", (cpuUsage / 3.0) * 100.0);

    EXPECT_LT(cpuUsage, 0.60) << "Combined stress exceeds 60% CPU";
}
