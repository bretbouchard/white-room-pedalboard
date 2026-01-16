/*
  ==============================================================================

    LookupTablePerformanceTests.cpp
    Created: January 9, 2026
    Author: Bret Bouchard

    Performance benchmark tests for LookupTables
    Verifies 2x+ speedup with <0.1% error tolerance

  ==============================================================================
*/

#include "../include/dsp/LookupTables.h"
#include <chrono>
#include <cmath>
#include <iostream>
#include <vector>
#include <iomanip>
#include <functional>

using namespace SchillingerEcosystem::DSP;

//==============================================================================
// Test Configuration
//==============================================================================

constexpr int ITERATIONS = 1000000;
constexpr float MAX_ERROR = 0.001f;  // 0.1% error tolerance

//==============================================================================
// Benchmark Utilities
//==============================================================================

template<typename Func>
double benchmark(const char* name, Func func, int iterations)
{
    auto start = std::chrono::high_resolution_clock::now();
    volatile float result = 0.0f;  // Prevent optimization

    for (int i = 0; i < iterations; ++i)
    {
        result = func();
    }

    auto end = std::chrono::high_resolution_clock::now();
    double elapsedMs = std::chrono::duration<double, std::milli>(end - start).count();

    std::cout << name << ": " << std::fixed << std::setprecision(2) << elapsedMs << " ms" << std::endl;
    return elapsedMs;
}

bool verifyAccuracy(const char* name, std::function<float(int)> lutFunc, std::function<float(int)> stdFunc, int testPoints)
{
    float maxError = 0.0f;
    float avgError = 0.0f;

    for (int i = 0; i < testPoints; ++i)
    {
        float lutValue = lutFunc(i);
        float stdValue = stdFunc(i);

        float error = std::abs(lutValue - stdValue);
        if (stdValue != 0.0f)
            error /= std::abs(stdValue);

        maxError = std::max(maxError, error);
        avgError += error;
    }

    avgError /= testPoints;

    bool passed = maxError < MAX_ERROR;
    std::cout << name << " - Max error: " << std::scientific << maxError
              << " (" << (passed ? "PASS" : "FAIL") << ")" << std::endl;

    return passed;
}

//==============================================================================
// Sine Table Tests
//==============================================================================

void testSineTable()
{
    std::cout << "\n=== Sine Table Tests ===" << std::endl;

    // Benchmark std::sin
    auto stdSinFunc = []() -> float {
        static float phase = 0.0f;
        phase += 0.001f;
        if (phase > 2.0f * M_PI) phase -= 2.0f * M_PI;
        return std::sin(phase);
    };
    double stdSinTime = benchmark("std::sin", stdSinFunc, ITERATIONS);

    // Benchmark LookupTables sine
    auto lutSinFunc = []() -> float {
        static float phase = 0.0f;
        phase += 0.001f;
        if (phase > 2.0f * M_PI) phase -= 2.0f * M_PI;
        return LookupTables::getInstance().sine(phase);
    };
    double lutSinTime = benchmark("LookupTables::sine", lutSinFunc, ITERATIONS);

    // Calculate speedup
    double speedup = stdSinTime / lutSinTime;
    std::cout << "Speedup: " << std::fixed << std::setprecision(1) << speedup << "x" << std::endl;

    // Verify accuracy
    bool passed = verifyAccuracy(
        "Sine accuracy",
        [](int i) -> float {
            float phase = (i % 1000) / 1000.0f * 2.0f * M_PI;
            return LookupTables::getInstance().sine(phase);
        },
        [](int i) -> float {
            float phase = (i % 1000) / 1000.0f * 2.0f * M_PI;
            return std::sin(phase);
        },
        1000
    );

    if (passed && speedup >= 2.0)
        std::cout << ">>> SINE TABLE: PASS (" << speedup << "x speedup)" << std::endl;
    else
        std::cout << ">>> SINE TABLE: FAIL" << std::endl;
}

//==============================================================================
// MIDI to Frequency Tests
//==============================================================================

void testMidiToFreq()
{
    std::cout << "\n=== MIDI to Frequency Tests ===" << std::endl;

    // Benchmark std::pow version
    auto stdMidiFunc = []() -> float {
        static int midiNote = 60;
        midiNote = (midiNote + 1) % 128;
        return 440.0f * std::pow(2.0f, (midiNote - 69) / 12.0f);
    };
    double stdMidiTime = benchmark("std::pow MIDI", stdMidiFunc, ITERATIONS);

    // Benchmark LookupTables version
    auto lutMidiFunc = []() -> float {
        static int midiNote = 60;
        midiNote = (midiNote + 1) % 128;
        return LookupTables::getInstance().midiToFreq(static_cast<float>(midiNote));
    };
    double lutMidiTime = benchmark("LookupTables::midiToFreq", lutMidiFunc, ITERATIONS);

    // Calculate speedup
    double speedup = stdMidiTime / lutMidiTime;
    std::cout << "Speedup: " << std::fixed << std::setprecision(1) << speedup << "x" << std::endl;

    // Verify accuracy
    bool passed = verifyAccuracy(
        "MIDI to Freq accuracy",
        [](int i) -> float {
            return LookupTables::getInstance().midiToFreq(static_cast<float>(i % 128));
        },
        [](int i) -> float {
            return 440.0f * std::pow(2.0f, (i % 128 - 69) / 12.0f);
        },
        128
    );

    if (passed && speedup >= 2.0)
        std::cout << ">>> MIDI TO FREQ: PASS (" << speedup << "x speedup)" << std::endl;
    else
        std::cout << ">>> MIDI TO FREQ: FAIL" << std::endl;
}

//==============================================================================
// Exponential Decay Tests
//==============================================================================

void testExpDecay()
{
    std::cout << "\n=== Exponential Decay Tests ===" << std::endl;

    // Benchmark std::exp version
    auto stdExpFunc = []() -> float {
        static float x = 0.0f;
        x += 0.001f;
        if (x > 1.0f) x = 0.0f;
        return std::exp(-5.0f * x);
    };
    double stdExpTime = benchmark("std::exp decay", stdExpFunc, ITERATIONS);

    // Benchmark LookupTables version
    auto lutExpFunc = []() -> float {
        static float x = 0.0f;
        x += 0.001f;
        if (x > 1.0f) x = 0.0f;
        return LookupTables::getInstance().expDecay(x);
    };
    double lutExpTime = benchmark("LookupTables::expDecay", lutExpFunc, ITERATIONS);

    // Calculate speedup
    double speedup = stdExpTime / lutExpTime;
    std::cout << "Speedup: " << std::fixed << std::setprecision(1) << speedup << "x" << std::endl;

    // Verify accuracy
    bool passed = verifyAccuracy(
        "Exp decay accuracy",
        [](int i) -> float {
            float x = i / 1000.0f;
            return LookupTables::getInstance().expDecay(x);
        },
        [](int i) -> float {
            float x = i / 1000.0f;
            return std::exp(-5.0f * x);
        },
        1000
    );

    if (passed && speedup >= 2.0)
        std::cout << ">>> EXP DECAY: PASS (" << speedup << "x speedup)" << std::endl;
    else
        std::cout << ">>> EXP DECAY: FAIL" << std::endl;
}

//==============================================================================
// Logarithmic Sweep Tests
//==============================================================================

void testLogSweep()
{
    std::cout << "\n=== Logarithmic Sweep Tests ===" << std::endl;

    // Benchmark std::log/exp version
    auto stdLogFunc = []() -> float {
        static float x = 0.0f;
        x += 0.001f;
        if (x > 1.0f) x = 0.0f;
        const float minFreq = 20.0f;
        const float maxFreq = 20000.0f;
        float logMin = std::log(minFreq);
        float logMax = std::log(maxFreq);
        float logValue = logMin + x * (logMax - logMin);
        return std::exp(logValue);
    };
    double stdLogTime = benchmark("std::log/exp sweep", stdLogFunc, ITERATIONS);

    // Benchmark LookupTables version
    auto lutLogFunc = []() -> float {
        static float x = 0.0f;
        x += 0.001f;
        if (x > 1.0f) x = 0.0f;
        return LookupTables::getInstance().logSweep(x);
    };
    double lutLogTime = benchmark("LookupTables::logSweep", lutLogFunc, ITERATIONS);

    // Calculate speedup
    double speedup = stdLogTime / lutLogTime;
    std::cout << "Speedup: " << std::fixed << std::setprecision(1) << speedup << "x" << std::endl;

    // Verify accuracy
    bool passed = verifyAccuracy(
        "Log sweep accuracy",
        [](int i) -> float {
            float x = i / 1000.0f;
            return LookupTables::getInstance().logSweep(x);
        },
        [](int i) -> float {
            float x = i / 1000.0f;
            const float minFreq = 20.0f;
            const float maxFreq = 20000.0f;
            float logMin = std::log(minFreq);
            float logMax = std::log(maxFreq);
            float logValue = logMin + x * (logMax - logMin);
            return std::exp(logValue);
        },
        1000
    );

    if (passed && speedup >= 2.0)
        std::cout << ">>> LOG SWEEP: PASS (" << speedup << "x speedup)" << std::endl;
    else
        std::cout << ">>> LOG SWEEP: FAIL" << std::endl;
}

//==============================================================================
// Cosine Tests
//==============================================================================

void testCosine()
{
    std::cout << "\n=== Cosine Tests ===" << std::endl;

    // Benchmark std::cos
    auto stdCosFunc = []() -> float {
        static float phase = 0.0f;
        phase += 0.001f;
        if (phase > 2.0f * M_PI) phase -= 2.0f * M_PI;
        return std::cos(phase);
    };
    double stdCosTime = benchmark("std::cos", stdCosFunc, ITERATIONS);

    // Benchmark LookupTables cosine
    auto lutCosFunc = []() -> float {
        static float phase = 0.0f;
        phase += 0.001f;
        if (phase > 2.0f * M_PI) phase -= 2.0f * M_PI;
        return LookupTables::getInstance().cosine(phase);
    };
    double lutCosTime = benchmark("LookupTables::cosine", lutCosFunc, ITERATIONS);

    // Calculate speedup
    double speedup = stdCosTime / lutCosTime;
    std::cout << "Speedup: " << std::fixed << std::setprecision(1) << speedup << "x" << std::endl;

    // Verify accuracy
    bool passed = verifyAccuracy(
        "Cosine accuracy",
        [](int i) -> float {
            float phase = (i % 1000) / 1000.0f * 2.0f * M_PI;
            return LookupTables::getInstance().cosine(phase);
        },
        [](int i) -> float {
            float phase = (i % 1000) / 1000.0f * 2.0f * M_PI;
            return std::cos(phase);
        },
        1000
    );

    if (passed && speedup >= 2.0)
        std::cout << ">>> COSINE: PASS (" << speedup << "x speedup)" << std::endl;
    else
        std::cout << ">>> COSINE: FAIL" << std::endl;
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "========================================" << std::endl;
    std::cout << "  LookupTables Performance Benchmarks" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Iterations: " << ITERATIONS << std::endl;
    std::cout << "Max error tolerance: " << MAX_ERROR * 100 << "%" << std::endl;

    testSineTable();
    testCosine();
    testMidiToFreq();
    testExpDecay();
    testLogSweep();

    std::cout << "\n========================================" << std::endl;
    std::cout << "  All tests completed" << std::endl;
    std::cout << "========================================\n" << std::endl;

    return 0;
}
