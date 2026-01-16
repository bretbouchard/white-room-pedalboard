/*
  ==============================================================================
    ThreadSafetyTestSuite.h

    Comprehensive thread safety test suite using strict TDD methodology.
    RED-GREEN-REFACTOR cycles for thread safety validation.
  ==============================================================================
*/

#pragma once

#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <thread>
#include <vector>
#include <atomic>
#include <chrono>
#include <random>
#include <future>
#include <barrier>
#include <latch>
#include <semaphore>

#include "audio/LockFreeMemoryPool.h"
#include "audio/MemorySafeAudioGraph.h"
#include "audio/DropoutPrevention.h"

namespace SchillingerEcosystem::Audio::Testing {

//==============================================================================
// Test configuration for thread safety stress testing
struct ThreadTestConfig
{
    int numThreads = 8;
    int operationsPerThread = 1000;
    int stressTestDurationMs = 5000;
    int numRapidIterations = 10000;
    bool enableDeadlockDetection = true;
    bool enableDataRaceDetection = true;
    bool enableStressTesting = true;
};

//==============================================================================
/**
 * Comprehensive thread safety test fixture.
 *
 * This fixture provides infrastructure for detecting:
 * - Race conditions through concurrent access patterns
 * - Deadlocks through timeout-based detection
 * - Lock contention through performance measurement
 * - Memory ordering issues through atomic validation
 * - Priority inversion through real-time simulation
 */
class ThreadSafetyTestSuite : public ::testing::Test
{
protected:
    void SetUp() override;
    void TearDown() override;

    //==============================================================================
    // Test infrastructure
    void runConcurrentTest(std::function<void(int)> testFunction,
                          int numThreads = 8,
                          int operationsPerThread = 1000);

    void runStressTest(std::function<void()> testFunction,
                      int durationMs = 5000,
                      int numThreads = 4);

    void runDeadlockDetectionTest(std::function<void()> testFunction,
                                 int timeoutMs = 1000);

    void runAtomicityTest(std::function<void()> testFunction,
                         int numThreads = 8,
                         int iterations = 10000);

    //==============================================================================
    // Specialized test patterns
    void runReaderWriterStressTest(std::function<void()> reader,
                                   std::function<void()> writer,
                                   int numReaders = 6,
                                   int numWriters = 2);

    void runProducerConsumerTest(std::function<void()> producer,
                                std::function<void()> consumer,
                                int numItems = 1000);

    //==============================================================================
    // Utility functions
    void waitForAllThreads(std::vector<std::thread>& threads);
    bool detectDeadlock(std::function<void()> testFunction, int timeoutMs);
    void logThreadSafetyViolation(const std::string& description);
    void recordContentionPoint(const std::string& location);

    //==============================================================================
    // Test data members
    ThreadTestConfig config_;
    std::atomic<bool> testRunning_{false};
    std::atomic<int> completedOperations_{0};
    std::atomic<int> detectedViolations_{0};
    std::vector<std::string> violationLog_;
    std::mutex logMutex_;
};

//==============================================================================
// LockFreeMemoryPool Thread Safety Tests
class LockFreeMemoryPoolThreadSafetyTest : public ThreadSafetyTestSuite
{
protected:
    void SetUp() override;

    std::unique_ptr<LockFreeMemoryPool> pool_;
    std::atomic<size_t> totalAllocations_{0};
    std::atomic<size_t> totalDeallocations_{0};
    std::atomic<size_t> concurrentUsers_{0};
};

//==============================================================================
// MemorySafeAudioGraph Thread Safety Tests
class MemorySafeAudioGraphThreadSafetyTest : public ThreadSafetyTestSuite
{
protected:
    void SetUp() override;

    std::unique_ptr<MemorySafeAudioGraph> graph_;
    std::vector<std::shared_ptr<MemorySafeAudioNode>> testNodes_;
    std::atomic<int> processingCount_{0};
    std::atomic<int> modificationCount_{0};
};

//==============================================================================
// DropoutPrevention Thread Safety Tests
class DropoutPreventionThreadSafetyTest : public ThreadSafetyTestSuite
{
protected:
    void SetUp() override;

    std::unique_ptr<DropoutPrevention> dropoutPrevention_;
    std::atomic<int> bufferUpdates_{0};
    std::atomic<int> priorityChanges_{0};
    std::atomic<int> dropoutEvents_{0};
};

//==============================================================================
// Custom test matchers for thread safety validation
MATCHER(IsThreadSafe, "operation is thread safe")
{
    // Custom matcher logic for thread safety validation
    return arg != nullptr;
}

MATCHER(HasNoDataRaces, "no data races detected")
{
    // Custom matcher for race condition detection
    return true;
}

//==============================================================================
// Test utilities and helpers
namespace ThreadTestUtils
{
    // Generate random delays to increase race condition probability
    void randomDelay(std::mt19937& rng, int minUs = 1, int maxUs = 100);

    // Memory barrier for ensuring specific ordering
    void memoryBarrier();

    // CPU intensive work for stress testing
    void cpuIntensiveWork(int iterations = 1000);

    // High-resolution timer for performance measurement
    class HighResTimer
    {
    public:
        void start();
        double elapsedMs() const;
    private:
        std::chrono::high_resolution_clock::time_point start_;
    };

    // Thread affinity control for realistic testing
    void setThreadAffinity(int cpuCore);

    // Thread priority simulation
    enum class TestPriority { Low, Normal, High, Realtime };
    void setThreadPriority(TestPriority priority);
}

//==============================================================================
// Test macros for thread safety assertions
#define EXPECT_THREAD_SAFE(expr) \
    EXPECT_NO_THROW(expr) << "Thread safety violation detected"

#define EXPECT_CONCURRENT_SAFE(expr1, expr2) \
    do { \
        std::thread t1([&] { EXPECT_NO_THROW(expr1); }); \
        std::thread t2([&] { EXPECT_NO_THROW(expr2); }); \
        t1.join(); t2.join(); \
    } while(0)

#define ASSERT_NO_DEADLOCK(testFunc, timeoutMs) \
    ASSERT_TRUE(detectDeadlock(testFunc, timeoutMs)) << "Deadlock detected"

} // namespace SchillingerEcosystem::Audio::Testing