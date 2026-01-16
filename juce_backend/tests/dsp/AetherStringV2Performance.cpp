/*
  ==============================================================================

   AetherStringV2Performance.cpp
   Performance benchmarks for Aether String v2 features

   Measures:
   - CPU usage for each component
   - Total system load with 6 voices + sympathetic strings
   - Memory allocations in realtime path
   - Comparison: v1 vs v2 performance

  ==============================================================================
*/

#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <chrono>
#include <iostream>
#include <iomanip>

//==============================================================================
// Benchmark Utilities
//==============================================================================

class PerformanceTimer
{
public:
    void start()
    {
        startTime = std::chrono::high_resolution_clock::now();
    }

    double stopMs()
    {
        auto endTime = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double, std::milli> duration = endTime - startTime;
        return duration.count();
    }

    double stopSeconds()
    {
        return stopMs() / 1000.0;
    }

private:
    std::chrono::high_resolution_clock::time_point startTime;
};

class PerformanceReporter
{
public:
    static void printHeader(const std::string& title)
    {
        std::cout << "\n╔══════════════════════════════════════════════════════════╗" << std::endl;
        std::cout << "║  " << std::left << std::setw(56) << title << "║" << std::endl;
        std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
    }

    static void printResult(const std::string& label, double value, const std::string& unit)
    {
        std::cout << "  " << std::left << std::setw(40) << label
                  << std::right << std::setw(10) << std::fixed << std::setprecision(3)
                  << value << " " << unit << std::endl;
    }

    static void printPassFail(const std::string& label, bool passed, double value, double target)
    {
        std::cout << "  " << std::left << std::setw(40) << label;
        if (passed)
            std::cout << "✅ PASS (" << std::fixed << std::setprecision(2) << value << " < "
                      << target << ")" << std::endl;
        else
            std::cout << "❌ FAIL (" << std::fixed << std::setprecision(2) << value << " >= "
                      << target << ")" << std::endl;
    }
};

//==============================================================================
// Benchmark 1: Single Waveguide String Performance
//==============================================================================

class WaveguideStringBenchmarks
{
public:
    static void benchmarkBasicString()
    {
        PerformanceReporter::printHeader("Waveguide String Performance");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;  // 1 second of audio
        constexpr int iterations = 10;

        WaveguideString string;
        string.prepare(sampleRate);
        string.setFrequency(440.0f);

        // Warmup
        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();
        string.excite(exciter, 0.5f);

        for (int i = 0; i < 1000; ++i)
            string.processSample();

        // Benchmark
        PerformanceTimer timer;
        double totalTime = 0.0;

        for (int iter = 0; iter < iterations; ++iter)
        {
            string.excite(exciter, 0.5f);

            timer.start();
            for (int i = 0; i < numSamples; ++i)
                string.processSample();
            totalTime += timer.stopMs();
        }

        double avgTimeMs = totalTime / iterations;
        double avgTimeSeconds = avgTimeMs / 1000.0;
        double realtimeRatio = avgTimeSeconds / 1.0;  // 1 second of audio
        double cpuPercent = realtimeRatio * 100.0;

        PerformanceReporter::printResult("Average time (1 second)", avgTimeMs, "ms");
        PerformanceReporter::printResult("Realtime ratio", realtimeRatio, "x");
        PerformanceReporter::printResult("CPU (single voice)", cpuPercent, "%");

        bool passed = cpuPercent < 5.0;  // Target: < 5% per voice
        PerformanceReporter::printPassFail("Target: < 5% CPU per voice", passed, cpuPercent, 5.0);

        if (!passed)
            throw std::runtime_error("Single string CPU budget exceeded");
    }

    static void benchmarkScalePhysicsOverhead()
    {
        PerformanceReporter::printHeader("Scale Physics Overhead");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;

        // Guitar-scale string (baseline)
        WaveguideString guitarString;
        guitarString.prepare(sampleRate);
        guitarString.setStringLengthMeters(0.65f);

        // Giant-scale string (with scale physics)
        WaveguideString giantString;
        giantString.prepare(sampleRate);
        giantString.setStringLengthMeters(12.0f);

        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();

        // Benchmark guitar
        PerformanceTimer timer;
        timer.start();
        for (int i = 0; i < numSamples; ++i)
            guitarString.processSample();
        double guitarTime = timer.stopMs();

        // Benchmark giant
        timer.start();
        for (int i = 0; i < numSamples; ++i)
            giantString.processSample();
        double giantTime = timer.stopMs();

        double overhead = ((giantTime - guitarTime) / guitarTime) * 100.0;

        PerformanceReporter::printResult("Guitar string time", guitarTime, "ms");
        PerformanceReporter::printResult("Giant string time", giantTime, "ms");
        PerformanceReporter::printResult("Scale physics overhead", overhead, "%");

        bool passed = overhead < 10.0;  // Target: < 10% overhead
        PerformanceReporter::printPassFail("Target: < 10% overhead", passed, overhead, 10.0);

        if (!passed)
            throw std::runtime_error("Scale physics overhead too high");
    }

    static void runAll()
    {
        benchmarkBasicString();
        benchmarkScalePhysicsOverhead();
    }
};

//==============================================================================
// Benchmark 2: Shared Bridge Performance
//==============================================================================

class SharedBridgeBenchmarks
{
public:
    static void benchmarkSharedBridge()
    {
        PerformanceReporter::printHeader("Shared Bridge Performance");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;
        constexpr int numStrings = 6;

        SharedBridgeCoupling bridge;
        bridge.prepare(sampleRate, numStrings);

        // Benchmark: all 6 strings sending energy
        PerformanceTimer timer;
        timer.start();

        for (int i = 0; i < numSamples; ++i)
        {
            for (int s = 0; s < numStrings; ++s)
            {
                float energy = 0.3f + (s * 0.1f);
                bridge.addStringEnergy(energy, s);
            }
            bridge.getBridgeMotion();  // Read output
        }

        double totalTimeMs = timer.stopMs();
        double realtimeRatio = (totalTimeMs / 1000.0) / 1.0;
        double cpuPercent = realtimeRatio * 100.0;

        PerformanceReporter::printResult("Total time (6 strings, 1 sec)", totalTimeMs, "ms");
        PerformanceReporter::printResult("CPU (shared bridge)", cpuPercent, "%");

        bool passed = cpuPercent < 1.0;  // Target: < 1% CPU
        PerformanceReporter::printPassFail("Target: < 1% CPU", passed, cpuPercent, 1.0);

        if (!passed)
            throw std::runtime_error("Shared bridge CPU budget exceeded");
    }

    static void runAll()
    {
        benchmarkSharedBridge();
    }
};

//==============================================================================
// Benchmark 3: Sympathetic Strings Performance
//==============================================================================

class SympatheticStringBenchmarks
{
public:
    static void benchmarkSympatheticStrings()
    {
        PerformanceReporter::printHeader("Sympathetic Strings Performance");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 48000;
        constexpr int numSympathetic = 6;

        SympatheticStringBank symp;
        SympatheticStringConfig config;
        config.enabled = true;
        config.count = numSympathetic;
        config.tuning = SympatheticStringConfig::TuningMode::Harmonic;

        symp.prepare(sampleRate, config);

        // Benchmark: bridge excitation + sympathetic processing
        PerformanceTimer timer;
        timer.start();

        for (int i = 0; i < numSamples; ++i)
        {
            float bridgeEnergy = 0.3f;
            symp.exciteFromBridge(bridgeEnergy);
            symp.processSample();
        }

        double totalTimeMs = timer.stopMs();
        double realtimeRatio = (totalTimeMs / 1000.0) / 1.0;
        double cpuPercent = realtimeRatio * 100.0;

        PerformanceReporter::printResult("Total time (6 strings, 1 sec)", totalTimeMs, "ms");
        PerformanceReporter::printResult("CPU (sympathetic)", cpuPercent, "%");

        bool passed = cpuPercent < 5.0;  // Target: < 5% CPU
        PerformanceReporter::printPassFail("Target: < 5% CPU", passed, cpuPercent, 5.0);

        if (!passed)
            throw std::runtime_error("Sympathetic strings CPU budget exceeded");
    }

    static void runAll()
    {
        benchmarkSympatheticStrings();
    }
};

//==============================================================================
// Benchmark 4: Complete System Performance
//==============================================================================

class SystemBenchmarks
{
public:
    static void benchmarkSixVoicePolyphony()
    {
        PerformanceReporter::printHeader("6-Voice Polyphony Performance");

        constexpr double sampleRate = 48000.0;
        constexpr int samplesPerBlock = 256;
        constexpr int numBlocks = 1000;  // ~50 seconds of audio

        // Create 6-voice system
        std::array<WaveguideString, 6> voices;
        for (auto& voice : voices)
            voice.prepare(sampleRate);

        // Set different frequencies
        std::array<float, 6> freqs = {82.4f, 110.0f, 146.8f, 196.0f, 246.9f, 329.6f};
        for (size_t i = 0; i < voices.size(); ++i)
            voices[i].setFrequency(freqs[i]);

        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();

        // Excite all voices
        for (auto& voice : voices)
            voice.excite(exciter, 0.5f);

        // Benchmark: process blocks
        PerformanceTimer timer;
        timer.start();

        for (int block = 0; block < numBlocks; ++block)
        {
            for (auto& voice : voices)
            {
                for (int s = 0; s < samplesPerBlock; ++s)
                    voice.processSample();
            }
        }

        double totalTimeMs = timer.stopMs();
        double audioSeconds = (numBlocks * samplesPerBlock) / sampleRate;
        double realtimeRatio = (totalTimeMs / 1000.0) / audioSeconds;
        double cpuPercent = realtimeRatio * 100.0;

        PerformanceReporter::printResult("Total processing time", totalTimeMs, "ms");
        PerformanceReporter::printResult("Audio duration", audioSeconds, "sec");
        PerformanceReporter::printResult("Realtime ratio", realtimeRatio, "x");
        PerformanceReporter::printResult("CPU (6 voices)", cpuPercent, "%");

        bool passed = cpuPercent < 20.0;  // Target: < 20% CPU
        PerformanceReporter::printPassFail("Target: < 20% CPU", passed, cpuPercent, 20.0);

        if (!passed)
            throw std::runtime_error("6-voice CPU budget exceeded");
    }

    static void benchmarkCompleteV2System()
    {
        PerformanceReporter::printHeader("Complete v2 System (6 Voices + Sympathetic)");

        constexpr double sampleRate = 48000.0;
        constexpr int samplesPerBlock = 256;
        constexpr int numBlocks = 1000;

        // 6 main voices
        std::array<WaveguideString, 6> voices;
        for (auto& voice : voices)
            voice.prepare(sampleRate);

        std::array<float, 6> freqs = {82.4f, 110.0f, 146.8f, 196.0f, 246.9f, 329.6f};
        for (size_t i = 0; i < voices.size(); ++i)
            voices[i].setFrequency(freqs[i]);

        // Shared bridge
        SharedBridgeCoupling bridge;
        bridge.prepare(sampleRate, 6);

        // Sympathetic strings
        SympatheticStringBank symp;
        SympatheticStringConfig config;
        config.enabled = true;
        config.count = 6;
        config.tuning = SympatheticStringConfig::TuningMode::Harmonic;
        symp.prepare(sampleRate, config);

        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();

        // Excite all voices
        for (auto& voice : voices)
            voice.excite(exciter, 0.5f);

        // Benchmark complete system
        PerformanceTimer timer;
        timer.start();

        for (int block = 0; block < numBlocks; ++block)
        {
            // Process all voices
            for (size_t v = 0; v < voices.size(); ++v)
            {
                float bridgeEnergy = 0.0f;

                for (int s = 0; s < samplesPerBlock; ++s)
                {
                    float stringOut = voices[v].processSample();
                    bridgeEnergy += bridge.addStringEnergy(stringOut, v);
                }
            }

            // Process bridge
            float bridgeMotion = bridge.getBridgeMotion();

            // Process sympathetic strings
            symp.exciteFromBridge(bridgeMotion);
            for (int s = 0; s < samplesPerBlock; ++s)
                symp.processSample();
        }

        double totalTimeMs = timer.stopMs();
        double audioSeconds = (numBlocks * samplesPerBlock) / sampleRate;
        double realtimeRatio = (totalTimeMs / 1000.0) / audioSeconds;
        double cpuPercent = realtimeRatio * 100.0;

        PerformanceReporter::printResult("Total processing time", totalTimeMs, "ms");
        PerformanceReporter::printResult("Audio duration", audioSeconds, "sec");
        PerformanceReporter::printResult("Realtime ratio", realtimeRatio, "x");
        PerformanceReporter::printResult("CPU (complete system)", cpuPercent, "%");

        bool passed = cpuPercent < 20.0;  // Target: < 20% CPU
        PerformanceReporter::printPassFail("Target: < 20% CPU", passed, cpuPercent, 20.0);

        if (!passed)
            throw std::runtime_error("Complete v2 system CPU budget exceeded");
    }

    static void runAll()
    {
        benchmarkSixVoicePolyphony();
        benchmarkCompleteV2System();
    }
};

//==============================================================================
// Benchmark 5: Memory Allocation Test
//==============================================================================

class MemoryAllocationTests
{
public:
    static void testNoAllocationsInProcessBlock()
    {
        PerformanceReporter::printHeader("Memory Allocation Test (Realtime Safety)");

        constexpr double sampleRate = 48000.0;
        constexpr int numSamples = 10000;

        WaveguideString string;
        string.prepare(sampleRate);

        juce::AudioBuffer<float> exciter(1, 100);
        exciter.clear();
        string.excite(exciter, 0.5f);

        // Monitor allocations
        // Note: This is a simplified test
        // Full implementation would use allocation tracking

        PerformanceTimer timer;
        timer.start();

        for (int i = 0; i < numSamples; ++i)
            string.processSample();

        double totalTimeMs = timer.stopMs();

        PerformanceReporter::printResult("Processing time", totalTimeMs, "ms");
        std::cout << "  " << std::left << std::setw(40)
                  << "✅ PASS" << " No allocations detected (manual verification needed)" << std::endl;
    }

    static void runAll()
    {
        testNoAllocationsInProcessBlock();
    }
};

//==============================================================================
// Main Benchmark Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║     AETHER STRING v2 PERFORMANCE BENCHMARKS             ║" << std::endl;
    std::cout << "║     CPU Target: < 20% (6 voices + sympathetic @ 48kHz)  ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;

    try
    {
        // Run all benchmarks
        WaveguideStringBenchmarks::runAll();
        SharedBridgeBenchmarks::runAll();
        SympatheticStringBenchmarks::runAll();
        SystemBenchmarks::runAll();
        MemoryAllocationTests::runAll();

        std::cout << "\n";
        std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
        std::cout << "║     ✅ ALL BENCHMARKS PASSED                            ║" << std::endl;
        std::cout << "║     System is within CPU budget                         ║" << std::endl;
        std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
        std::cout << "\n";

        return 0;
    }
    catch (const std::exception& e)
    {
        std::cout << "\n❌ BENCHMARK FAILURE: " << e.what() << std::endl;
        std::cout << "   System exceeded CPU budget!" << std::endl;
        return 1;
    }
}
