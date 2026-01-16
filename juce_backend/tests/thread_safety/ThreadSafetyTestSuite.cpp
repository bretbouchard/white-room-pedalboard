/*
  ==============================================================================
    ThreadSafetyTestSuite.cpp

    Implementation of comprehensive thread safety test suite.
    RED-GREEN-REFACTOR cycles for thread safety validation.
  ==============================================================================
*/

#include "ThreadSafetyTestSuite.h"
#include <iostream>
#include <algorithm>
#include <sched.h>
#include <unistd.h>

namespace SchillingerEcosystem::Audio::Testing {

//==============================================================================
// ThreadSafetyTestSuite Implementation
//==============================================================================

void ThreadSafetyTestSuite::SetUp()
{
    testRunning_.store(true);
    completedOperations_.store(0);
    detectedViolations_.store(0);
    violationLog_.clear();
}

void ThreadSafetyTestSuite::TearDown()
{
    testRunning_.store(false);

    // Report any detected violations
    if (detectedViolations_.load() > 0) {
        std::cerr << "Thread safety violations detected: " << detectedViolations_.load() << std::endl;
        for (const auto& violation : violationLog_) {
            std::cerr << "  - " << violation << std::endl;
        }
    }
}

void ThreadSafetyTestSuite::runConcurrentTest(std::function<void(int)> testFunction,
                                             int numThreads,
                                             int operationsPerThread)
{
    std::vector<std::thread> threads;
    std::barrier sync_point(numThreads);

    for (int i = 0; i < numThreads; ++i) {
        threads.emplace_back([&, i]() {
            ThreadTestUtils::setThreadAffinity(i % std::thread::hardware_concurrency());

            // Synchronize all threads to start simultaneously
            sync_point.arrive_and_wait();

            for (int j = 0; j < operationsPerThread && testRunning_.load(); ++j) {
                testFunction(i);
                completedOperations_.fetch_add(1);

                // Add small random delays to increase race condition probability
                if (j % 100 == 0) {
                    ThreadTestUtils::randomDelay();
                }
            }
        });
    }

    waitForAllThreads(threads);
}

void ThreadSafetyTestSuite::runStressTest(std::function<void()> testFunction,
                                         int durationMs,
                                         int numThreads)
{
    std::atomic<bool> shouldStop{false};
    std::vector<std::thread> threads;

    auto startTime = std::chrono::steady_clock::now();

    for (int i = 0; i < numThreads; ++i) {
        threads.emplace_back([&, i]() {
            ThreadTestUtils::setThreadPriority(ThreadTestUtils::TestPriority::High);

            while (!shouldStop.load()) {
                testFunction();
                completedOperations_.fetch_add(1);
            }
        });
    }

    // Run for specified duration
    std::this_thread::sleep_for(std::chrono::milliseconds(durationMs));
    shouldStop.store(true);

    waitForAllThreads(threads);

    auto endTime = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

    std::cout << "Stress test completed: " << completedOperations_.load()
              << " operations in " << duration.count() << "ms" << std::endl;
}

void ThreadSafetyTestSuite::runDeadlockDetectionTest(std::function<void()> testFunction,
                                                    int timeoutMs)
{
    auto startTime = std::chrono::steady_clock::now();
    std::atomic<bool> completed{false};

    std::thread testThread([&]() {
        testFunction();
        completed.store(true);
    });

    testThread.detach();

    // Wait for completion with timeout
    while (!completed.load()) {
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - startTime).count();

        if (elapsed > timeoutMs) {
            logThreadSafetyViolation("Deadlock detected - operation timed out after " +
                                   std::to_string(timeoutMs) + "ms");
            FAIL() << "Deadlock detected in thread safety test";
            return;
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}

void ThreadSafetyTestSuite::runAtomicityTest(std::function<void()> testFunction,
                                           int numThreads,
                                           int iterations)
{
    std::atomic<int> threadCount{0};
    std::barrier start_barrier(numThreads);
    std::latch completion_latch(numThreads);

    std::vector<std::thread> threads;

    for (int i = 0; i < numThreads; ++i) {
        threads.emplace_back([&, i]() {
            threadCount.fetch_add(1);

            // Synchronized start
            start_barrier.arrive_and_wait();

            for (int j = 0; j < iterations; ++j) {
                testFunction();
                ThreadTestUtils::memoryBarrier();
            }

            completion_latch.count_down();
        });
    }

    // Wait for all threads with timeout
    bool completed = completion_latch.wait_for(std::chrono::seconds(30)) == std::future_status::ready;

    waitForAllThreads(threads);

    EXPECT_TRUE(completed) << "Atomicity test failed to complete within timeout";
}

void ThreadSafetyTestSuite::runReaderWriterStressTest(std::function<void()> reader,
                                                     std::function<void()> writer,
                                                     int numReaders,
                                                     int numWriters)
{
    std::atomic<bool> shouldStop{false};
    std::vector<std::thread> threads;

    // Launch reader threads
    for (int i = 0; i < numReaders; ++i) {
        threads.emplace_back([&, i]() {
            ThreadTestUtils::setThreadPriority(ThreadTestUtils::TestPriority::Normal);

            while (!shouldStop.load()) {
                reader();
                completedOperations_.fetch_add(1);
            }
        });
    }

    // Launch writer threads
    for (int i = 0; i < numWriters; ++i) {
        threads.emplace_back([&, i]() {
            ThreadTestUtils::setThreadPriority(ThreadTestUtils::TestPriority::High);

            while (!shouldStop.load()) {
                writer();
                completedOperations_.fetch_add(1);
            }
        });
    }

    // Run stress test for 2 seconds
    std::this_thread::sleep_for(std::chrono::seconds(2));
    shouldStop.store(true);

    waitForAllThreads(threads);
}

void ThreadSafetyTestSuite::runProducerConsumerTest(std::function<void()> producer,
                                                   std::function<void()> consumer,
                                                   int numItems)
{
    std::atomic<int> producedItems{0};
    std::atomic<int> consumedItems{0};
    std::atomic<bool> producerDone{false};

    std::thread producerThread([&]() {
        for (int i = 0; i < numItems; ++i) {
            producer();
            producedItems.fetch_add(1);
        }
        producerDone.store(true);
    });

    std::thread consumerThread([&]() {
        while (!producerDone.load() || consumedItems.load() < producedItems.load()) {
            if (consumer()) {
                consumedItems.fetch_add(1);
            }
        }
    });

    producerThread.join();
    consumerThread.join();

    EXPECT_EQ(producedItems.load(), consumedItems.load())
        << "Producer-consumer test failed: items lost or duplicated";
}

void ThreadSafetyTestSuite::waitForAllThreads(std::vector<std::thread>& threads)
{
    for (auto& thread : threads) {
        if (thread.joinable()) {
            thread.join();
        }
    }
    threads.clear();
}

bool ThreadSafetyTestSuite::detectDeadlock(std::function<void()> testFunction, int timeoutMs)
{
    auto startTime = std::chrono::steady_clock::now();
    std::atomic<bool> completed{false};

    std::thread testThread([&]() {
        testFunction();
        completed.store(true);
    });

    testThread.detach();

    while (!completed.load()) {
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - startTime).count();

        if (elapsed > timeoutMs) {
            return false; // Deadlock detected
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    return true; // No deadlock
}

void ThreadSafetyTestSuite::logThreadSafetyViolation(const std::string& description)
{
    std::lock_guard<std::mutex> lock(logMutex_);
    detectedViolations_.fetch_add(1);
    violationLog_.push_back(description);
}

void ThreadSafetyTestSuite::recordContentionPoint(const std::string& location)
{
    logThreadSafetyViolation("Lock contention detected at: " + location);
}

//==============================================================================
// LockFreeMemoryPoolThreadSafetyTest Implementation
//==============================================================================

void LockFreeMemoryPoolThreadSafetyTest::SetUp()
{
    ThreadSafetyTestSuite::SetUp();

    LockFreeMemoryPool::PoolConfig config;
    config.blockSize = 1024;
    config.initialBlockCount = 64;
    config.maxBlockCount = 256;
    config.alignment = 16;
    config.enableMetrics = true;

    pool_ = std::make_unique<LockFreeMemoryPool>(config);
    ASSERT_TRUE(pool_->isInitialized());

    totalAllocations_.store(0);
    totalDeallocations_.store(0);
    concurrentUsers_.store(0);
}

//==============================================================================
// MemorySafeAudioGraphThreadSafetyTest Implementation
//==============================================================================

void MemorySafeAudioGraphThreadSafetyTest::SetUp()
{
    ThreadSafetyTestSuite::SetUp();

    graph_ = std::make_unique<MemorySafeAudioGraph>();
    testNodes_.clear();
    processingCount_.store(0);
    modificationCount_.store(0);

    // Create test nodes
    for (int i = 0; i < 10; ++i) {
        auto node = std::make_shared<MemorySafeAudioNode>(
            "test_node_" + std::to_string(i),
            MemorySafeAudioNode::NodeType::Processor,
            2, 512, 44100.0);
        node->initialize();
        testNodes_.push_back(node);
        graph_->addNode(node);
    }
}

//==============================================================================
// DropoutPreventionThreadSafetyTest Implementation
//==============================================================================

void DropoutPreventionThreadSafetyTest::SetUp()
{
    ThreadSafetyTestSuite::SetUp();

    DropoutPrevention::PreventionConfig config;
    config.strategy = DropoutPrevention::BufferStrategy::Adaptive;
    config.threadPriority = DropoutPrevention::ThreadPriority::RealTime;
    config.targetBufferLevel = 0.7;
    config.enablePrediction = true;

    dropoutPrevention_ = std::make_unique<DropoutPrevention>(config);
    ASSERT_TRUE(dropoutPrevention_->isInitialized());

    bufferUpdates_.store(0);
    priorityChanges_.store(0);
    dropoutEvents_.store(0);
}

//==============================================================================
// ThreadTestUtils Implementation
//==============================================================================

namespace ThreadTestUtils {

void randomDelay(std::mt19937& rng, int minUs, int maxUs)
{
    std::uniform_int_distribution<int> dist(minUs, maxUs);
    std::this_thread::sleep_for(std::chrono::microseconds(dist(rng)));
}

void memoryBarrier()
{
    std::atomic_thread_fence(std::memory_order_seq_cst);
}

void cpuIntensiveWork(int iterations)
{
    volatile double sum = 0.0;
    for (int i = 0; i < iterations; ++i) {
        sum += std::sin(i) * std::cos(i);
    }
    (void)sum; // Prevent optimization
}

void HighResTimer::start()
{
    start_ = std::chrono::high_resolution_clock::now();
}

double HighResTimer::elapsedMs() const
{
    auto now = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(now - start_).count();
}

void setThreadAffinity(int cpuCore)
{
#ifdef __linux__
    cpu_set_t cpuset;
    CPU_ZERO(&cpuset);
    CPU_SET(cpuCore, &cpuset);
    pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpuset);
#endif
}

void setThreadPriority(TestPriority priority)
{
    // Implementation would depend on the platform
    // This is a placeholder for priority setting logic
    switch (priority) {
        case TestPriority::Low:
            // Set low priority
            break;
        case TestPriority::Normal:
            // Set normal priority
            break;
        case TestPriority::High:
            // Set high priority
            break;
        case TestPriority::Realtime:
            // Set realtime priority
            break;
    }
}

} // namespace ThreadTestUtils

} // namespace SchillingerEcosystem::Audio::Testing