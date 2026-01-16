/*
  ==============================================================================

    ThreadSafetyTest.cpp
    Created: January 13, 2026
    Author: Bret Bouchard

    Thread Safety Tests for Plugin Validation
    Tests concurrent parameter access and audio processing

  ==============================================================================
*/

#include "../../../instruments/kane_marco/include/dsp/KaneMarcoPureDSP.h"
#include <iostream>
#include <vector>
#include <cmath>
#include <thread>
#include <atomic>
#include <random>
#include <chrono>

using namespace DSP;

//==============================================================================
// Test Result Tracking
//==============================================================================

struct TestResults
{
    std::atomic<int> total{0};
    std::atomic<int> passed{0};
    std::atomic<int> failed{0};
    std::vector<std::string> failures;

    void pass(const std::string& testName)
    {
        total++;
        passed++;
        std::cout << "  [PASS] " << testName << std::endl;
    }

    void fail(const std::string& testName, const std::string& reason)
    {
        total++;
        failed++;
        failures.push_back(testName + ": " + reason);
        std::cout << "  [FAIL] " << testName << ": " << reason << std::endl;
    }

    void printSummary() const
    {
        std::cout << "\n========================================" << std::endl;
        std::cout << "Test Summary: " << passed << "/" << total << " passed";
        if (failed > 0)
        {
            std::cout << " (" << failed << " failed)";
        }
        std::cout << "\n========================================" << std::endl;
    }

    bool allPassed() const { return failed == 0; }
};

//==============================================================================
// Audio Analysis Utilities
//==============================================================================

namespace AudioUtils
{
    float getPeakLevel(const float* buffer, int numSamples)
    {
        float peak = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            peak = std::max(peak, std::abs(buffer[i]));
        }
        return peak;
    }

    bool hasSignal(const float* buffer, int numSamples, float threshold = 0.001f)
    {
        return getPeakLevel(buffer, numSamples) > threshold;
    }

    bool hasNaN(const float* buffer, int numSamples)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            if (std::isnan(buffer[i]) || std::isinf(buffer[i]))
                return true;
        }
        return false;
    }
}

//==============================================================================
// Thread Safety Test Suite
//==============================================================================

class ThreadSafetyTestSuite
{
public:
    static constexpr int sampleRate = 48000;
    static constexpr int bufferSize = 512;

    ThreadSafetyTestSuite() : synth_(nullptr), stopThreads_(false)
    {
    }

    ~ThreadSafetyTestSuite()
    {
        stopThreads_ = true;
        for (auto& thread : audioThreads_)
        {
            if (thread.joinable())
                thread.join();
        }
        for (auto& thread : paramThreads_)
        {
            if (thread.joinable())
                thread.join();
        }
        delete synth_;
    }

    bool initialize()
    {
        synth_ = new KaneMarcoPureDSP();
        if (!synth_->prepare(static_cast<double>(sampleRate), bufferSize))
        {
            std::cerr << "Failed to prepare synth" << std::endl;
            return false;
        }
        return true;
    }

    void runAllTests(TestResults& results)
    {
        std::cout << "\n=== THREAD SAFETY TESTS ===" << std::endl;

        testConcurrentParameterAccess(results);
        testConcurrentAudioProcessing(results);
        testConcurrentParamAndAudio(results);
        testRapidParameterChanges(results);
        testStressTest(results);
    }

private:
    KaneMarcoPureDSP* synth_;
    std::atomic<bool> stopThreads_;
    std::vector<std::thread> audioThreads_;
    std::vector<std::thread> paramThreads_;

    // Test 1: Concurrent parameter access from multiple threads
    void testConcurrentParameterAccess(TestResults& results)
    {
        std::cout << "\n--- Test 1: Concurrent Parameter Access ---" << std::endl;

        const int numThreads = 4;
        const int iterationsPerThread = 1000;
        std::atomic<int> successCount{0};
        std::atomic<int> failCount{0};

        auto parameterThread = [&](int threadId) {
            std::mt19937 rng(threadId);
            std::uniform_real_distribution<float> dist(0.0f, 1.0f);

            const char* params[] = {
                "osc1Level", "osc2Level", "filterCutoff", "filterResonance",
                "lfo1Rate", "lfo1Depth", "lfo2Rate", "lfo2Depth"
            };

            for (int i = 0; i < iterationsPerThread; ++i)
            {
                for (const char* param : params)
                {
                    float value = dist(rng);
                    try
                    {
                        synth_->setParameter(param, value);
                        float retrieved = synth_->getParameter(param);

                        if (std::abs(value - retrieved) < 0.01f)
                        {
                            successCount++;
                        }
                        else
                        {
                            failCount++;
                        }
                    }
                    catch (...)
                    {
                        failCount++;
                    }
                }
            }
        };

        // Launch threads
        std::vector<std::thread> threads;
        for (int i = 0; i < numThreads; ++i)
        {
            threads.emplace_back(parameterThread, i);
        }

        // Wait for completion
        for (auto& thread : threads)
        {
            thread.join();
        }

        int totalOps = successCount + failCount;
        float successRate = static_cast<float>(successCount) / totalOps;

        if (successRate > 0.99f) // Allow 1% failure rate for race conditions
        {
            results.pass("Concurrent parameter access (success rate: " +
                        std::to_string(successRate * 100) + "%)");
        }
        else
        {
            results.fail("Concurrent parameter access",
                        "Success rate too low: " + std::to_string(successRate * 100) + "%");
        }
    }

    // Test 2: Concurrent audio processing from multiple threads
    void testConcurrentAudioProcessing(TestResults& results)
    {
        std::cout << "\n--- Test 2: Concurrent Audio Processing ---" << std::endl;

        // Note: This test simulates what would happen if multiple DAW instances
        // tried to use the same synth simultaneously (which shouldn't happen in practice)
        // But we test it to ensure the synth doesn't crash

        const int numThreads = 2;
        const int blocksPerThread = 100;
        std::atomic<int> crashCount{0};
        std::atomic<int> nanCount{0};

        auto audioThread = [&](int threadId) {
            for (int block = 0; block < blocksPerThread; ++block)
            {
                try
                {
                    std::vector<float> output(bufferSize * 2);
                    float* outputs[] = { output.data(), output.data() + bufferSize };

                    synth_->process(outputs, 2, bufferSize);

                    if (AudioUtils::hasNaN(output.data(), output.size()))
                    {
                        nanCount++;
                    }
                }
                catch (...)
                {
                    crashCount++;
                }
            }
        };

        // Launch threads
        std::vector<std::thread> threads;
        for (int i = 0; i < numThreads; ++i)
        {
            threads.emplace_back(audioThread, i);
        }

        // Wait for completion
        for (auto& thread : threads)
        {
            thread.join();
        }

        if (crashCount == 0 && nanCount == 0)
        {
            results.pass("Concurrent audio processing (no crashes or NaN)");
        }
        else
        {
            results.fail("Concurrent audio processing",
                        "Crashes: " + std::to_string(crashCount) +
                        ", NaN: " + std::to_string(nanCount));
        }
    }

    // Test 3: Concurrent parameter changes and audio processing
    void testConcurrentParamAndAudio(TestResults& results)
    {
        std::cout << "\n--- Test 3: Concurrent Parameters + Audio ---" << std::endl;

        const int audioBlocks = 500;
        const int paramChangesPerBlock = 10;
        std::atomic<int> nanCount{0};

        auto audioProc = [&]() {
            for (int block = 0; block < audioBlocks; ++block)
            {
                std::vector<float> output(bufferSize * 2);
                float* outputs[] = { output.data(), output.data() + bufferSize };
                synth_->process(outputs, 2, bufferSize);

                if (AudioUtils::hasNaN(output.data(), output.size()))
                {
                    nanCount++;
                }

                std::this_thread::sleep_for(std::chrono::microseconds(100));
            }
        };

        auto paramChanger = [&]() {
            std::mt19937 rng(std::random_device{}());
            std::uniform_real_distribution<float> dist(0.0f, 1.0f);

            const char* params[] = {
                "filterCutoff", "filterResonance", "lfo1Rate", "lfo1Depth"
            };

            for (int i = 0; i < audioBlocks * paramChangesPerBlock; ++i)
            {
                const char* param = params[i % 4];
                float value = dist(rng);
                synth_->setParameter(param, value);
                std::this_thread::sleep_for(std::chrono::microseconds(50));
            }
        };

        // Launch threads
        std::thread audioThread(audioProc);
        std::thread paramThread(paramChanger);

        // Wait for completion
        audioThread.join();
        paramThread.join();

        if (nanCount == 0)
        {
            results.pass("Concurrent parameters + audio (no NaN in " +
                        std::to_string(audioBlocks) + " blocks)");
        }
        else
        {
            results.fail("Concurrent parameters + audio",
                        "NaN detected in " + std::to_string(nanCount) + " blocks");
        }
    }

    // Test 4: Rapid parameter changes
    void testRapidParameterChanges(TestResults& results)
    {
        std::cout << "\n--- Test 4: Rapid Parameter Changes ---" << std::endl;

        const int numChanges = 10000;
        std::atomic<int> successCount{0};

        std::mt19937 rng(std::random_device{}());
        std::uniform_real_distribution<float> dist(0.0f, 1.0f);

        const char* params[] = {
            "osc1Level", "osc2Level", "filterCutoff", "filterResonance",
            "lfo1Rate", "lfo1Depth", "lfo2Rate", "lfo2Depth"
        };

        for (int i = 0; i < numChanges; ++i)
        {
            const char* param = params[i % 8];
            float value = dist(rng);

            try
            {
                synth_->setParameter(param, value);
                float retrieved = synth_->getParameter(param);

                if (std::abs(value - retrieved) < 0.01f)
                {
                    successCount++;
                }
            }
            catch (...)
            {
                // Parameter change failed
            }
        }

        float successRate = static_cast<float>(successCount) / numChanges;

        if (successRate > 0.99f)
        {
            results.pass("Rapid parameter changes (" + std::to_string(numChanges) +
                        " changes, success rate: " + std::to_string(successRate * 100) + "%)");
        }
        else
        {
            results.fail("Rapid parameter changes",
                        "Success rate: " + std::to_string(successRate * 100) + "%");
        }
    }

    // Test 5: Stress test with sustained load
    void testStressTest(TestResults& results)
    {
        std::cout << "\n--- Test 5: Stress Test ---" << std::endl;

        const int durationSeconds = 5;
        const auto startTime = std::chrono::steady_clock::now();

        std::atomic<int> audioBlocksProcessed{0};
        std::atomic<int> paramChanges{0};
        std::atomic<bool> errorOccurred{false};

        auto audioWorker = [&]() {
            while (!errorOccurred &&
                   std::chrono::duration_cast<std::chrono::seconds>(
                       std::chrono::steady_clock::now() - startTime).count() < durationSeconds)
            {
                try
                {
                    std::vector<float> output(bufferSize * 2);
                    float* outputs[] = { output.data(), output.data() + bufferSize };
                    synth_->process(outputs, 2, bufferSize);
                    audioBlocksProcessed++;

                    if (AudioUtils::hasNaN(output.data(), output.size()))
                    {
                        errorOccurred = true;
                    }
                }
                catch (...)
                {
                    errorOccurred = true;
                }
            }
        };

        auto paramWorker = [&]() {
            std::mt19937 rng(std::random_device{}());
            std::uniform_real_distribution<float> dist(0.0f, 1.0f);

            const char* params[] = {"filterCutoff", "filterResonance", "lfo1Rate"};

            while (!errorOccurred &&
                   std::chrono::duration_cast<std::chrono::seconds>(
                       std::chrono::steady_clock::now() - startTime).count() < durationSeconds)
            {
                for (const char* param : params)
                {
                    synth_->setParameter(param, dist(rng));
                    paramChanges++;
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
            }
        };

        // Launch threads
        std::thread audioThread(audioWorker);
        std::thread paramThread(paramWorker);

        // Wait for completion
        audioThread.join();
        paramThread.join();

        if (!errorOccurred)
        {
            results.pass("Stress test (" + std::to_string(durationSeconds) + "s, " +
                        std::to_string(audioBlocksProcessed) + " audio blocks, " +
                        std::to_string(paramChanges) + " param changes)");
        }
        else
        {
            results.fail("Stress test", "Error occurred during stress test");
        }
    }
};

//==============================================================================
// Main Entry Point
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "========================================" << std::endl;
    std::cout << "Thread Safety Tests" << std::endl;
    std::cout << "Kane Marco Hybrid VA Synthesizer" << std::endl;
    std::cout << "========================================" << std::endl;

    TestResults results;
    ThreadSafetyTestSuite suite;

    if (!suite.initialize())
    {
        std::cerr << "Failed to initialize test suite" << std::endl;
        return 1;
    }

    suite.runAllTests(results);
    results.printSummary();

    return results.allPassed() ? 0 : 1;
}
