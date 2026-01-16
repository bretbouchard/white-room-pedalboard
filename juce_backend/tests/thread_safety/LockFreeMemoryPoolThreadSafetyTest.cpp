/*
  ==============================================================================
    LockFreeMemoryPoolThreadSafetyTest.cpp

    RED PHASE: Failing tests that expose thread safety violations in LockFreeMemoryPool.
    These tests are designed to fail initially to demonstrate thread safety issues.
  ==============================================================================
*/

#include "ThreadSafetyTestSuite.h"
#include "audio/LockFreeMemoryPool.h"

using namespace SchillingerEcosystem::Audio::Testing;
using namespace ::testing;

//==============================================================================
// Thread Safety Tests for LockFreeMemoryPool
//==============================================================================

TEST_F(LockFreeMemoryPoolThreadSafetyTest, ConcurrentAllocateDeallocateRaceCondition)
{
    // This test exposes a potential race condition in allocate/deallocate operations
    // RED PHASE: This should fail due to race conditions

    std::vector<void*> allocatedPointers;
    std::mutex pointersMutex;

    auto allocateFunction = [&](int threadId) {
        for (int i = 0; i < config_.operationsPerThread; ++i) {
            void* ptr = pool_->allocate(512);
            if (ptr) {
                {
                    std::lock_guard<std::mutex> lock(pointersMutex);
                    allocatedPointers.push_back(ptr);
                }
                totalAllocations_.fetch_add(1);
            }

            // Add some delay to increase race condition probability
            ThreadTestUtils::randomDelay(rng_);
        }
    };

    auto deallocateFunction = [&](int threadId) {
        void* ptr = nullptr;
        {
            std::lock_guard<std::mutex> lock(pointersMutex);
            if (!allocatedPointers.empty()) {
                ptr = allocatedPointers.back();
                allocatedPointers.pop_back();
            }
        }

        if (ptr) {
            pool_->deallocate(ptr);
            totalDeallocations_.fetch_add(1);
        }

        ThreadTestUtils::randomDelay(rng_);
    };

    // Run concurrent allocate/deallocate operations
    runConcurrentTest(allocateFunction, 4, config_.operationsPerThread);
    runConcurrentTest(deallocateFunction, 4, config_.operationsPerThread / 2);

    // This assertion will fail if there are race conditions
    EXPECT_EQ(totalAllocations_.load(), totalDeallocations_.load())
        << "Memory leak detected due to race condition in allocate/deallocate";

    // Verify pool integrity
    auto metrics = pool_->getMetrics();
    EXPECT_EQ(metrics.currentInUse.load(), 0)
        << "Memory blocks left in use after test - potential corruption";
}

TEST_F(LockFreeMemoryPoolThreadSafetyTest, MemoryCorruptionUnderConcurrentAccess)
{
    // This test checks for memory corruption when multiple threads access the pool
    // RED PHASE: Should detect memory corruption issues

    std::atomic<bool> corruptionDetected{false};

    auto memoryStressTest = [&](int threadId) {
        std::vector<void*> threadPointers;
        threadPointers.reserve(100);

        for (int i = 0; i < 100; ++i) {
            // Allocate memory
            void* ptr = pool_->allocate(256);
            if (ptr) {
                threadPointers.push_back(ptr);

                // Write test pattern to detect corruption
                if (pool_->containsPointer(ptr)) {
                    uint8_t* data = static_cast<uint8_t*>(ptr);
                    for (size_t j = 0; j < 64 && j < 256; ++j) {
                        data[j] = static_cast<uint8_t>(threadId + i + j);
                    }
                }
            }

            // Random deallocation to stress test
            if (i > 50 && !threadPointers.empty() && (i % 3 == 0)) {
                size_t index = i % threadPointers.size();
                if (threadPointers[index]) {
                    // Verify pattern before deallocation
                    uint8_t* data = static_cast<uint8_t*>(threadPointers[index]);
                    bool patternValid = true;
                    for (size_t j = 0; j < 64 && j < 256; ++j) {
                        if (data[j] != static_cast<uint8_t>(threadId + i + j)) {
                            corruptionDetected.store(true);
                            logThreadSafetyViolation("Memory corruption detected in thread " +
                                                   std::to_string(threadId));
                            break;
                        }
                    }

                    pool_->deallocate(threadPointers[index]);
                    threadPointers[index] = nullptr;
                }
            }
        }

        // Clean up remaining pointers
        for (void* ptr : threadPointers) {
            if (ptr) {
                pool_->deallocate(ptr);
            }
        }
    };

    runConcurrentTest(memoryStressTest, 8, 1);

    EXPECT_FALSE(corruptionDetected.load())
        << "Memory corruption detected under concurrent access";
}

TEST_F(LockFreeMemoryPoolThreadSafetyTest, FreeListCorruptionDetection)
{
    // Test for free list corruption under high concurrency
    // RED PHASE: Should detect free list corruption

    std::atomic<int> freeListCorruptionCount{0};

    auto freeListStressTest = [&](int threadId) {
        std::vector<void*> pointers;
        pointers.reserve(50);

        // Rapid allocate/deallocate cycles to stress free list
        for (int cycle = 0; cycle < 100; ++cycle) {
            // Allocate many blocks
            for (int i = 0; i < 50; ++i) {
                void* ptr = pool_->allocate(128);
                if (ptr) {
                    pointers.push_back(ptr);
                }
            }

            // Deallocate in random order to stress free list management
            std::shuffle(pointers.begin(), pointers.end(), rng_);

            for (void* ptr : pointers) {
                if (ptr) {
                    // Validate pointer before deallocation
                    if (!pool_->containsPointer(ptr)) {
                        freeListCorruptionCount.fetch_add(1);
                        logThreadSafetyViolation("Invalid pointer detected in free list");
                    }

                    pool_->deallocate(ptr);
                }
            }

            pointers.clear();

            // Add memory barrier to ensure ordering
            ThreadTestUtils::memoryBarrier();
        }
    };

    runConcurrentTest(freeListStressTest, 4, 1);

    EXPECT_EQ(freeListCorruptionCount.load(), 0)
        << "Free list corruption detected: " << freeListCorruptionCount.load() << " instances";
}

TEST_F(LockFreeMemoryPoolThreadSafetyTest, AtomicOperationsTest)
{
    // Test atomicity of pool operations under extreme contention
    // RED PHASE: Should detect non-atomic operations

    std::atomic<int> atomicityViolations{0};
    std::atomic<int> successfulOperations{0};

    auto atomicityTest = [&](int threadId) {
        for (int i = 0; i < 1000; ++i) {
            // Test allocation atomicity
            void* ptr1 = pool_->allocate(64);
            void* ptr2 = pool_->allocate(64);

            if (ptr1 && ptr2) {
                // Verify both allocations are valid and distinct
                if (ptr1 == ptr2) {
                    atomicityViolations.fetch_add(1);
                    logThreadSafetyViolation("Same pointer returned for two allocations");
                }

                // Test deallocation atomicity
                pool_->deallocate(ptr1);
                pool_->deallocate(ptr2);

                successfulOperations.fetch_add(2);
            } else {
                // Handle failed allocations
                if (ptr1) pool_->deallocate(ptr1);
                if (ptr2) pool_->deallocate(ptr2);
            }
        }
    };

    runAtomicityTest(atomicityTest, 8, 1000);

    EXPECT_EQ(atomicityViolations.load(), 0)
        << "Atomicity violations detected: " << atomicityViolations.load();

    // Verify final pool state
    auto metrics = pool_->getMetrics();
    EXPECT_EQ(metrics.currentInUse.load(), 0)
        << "Pool has inconsistent state after atomicity test";
}

TEST_F(LockFreeMemoryPoolThreadSafetyTest, DeadlockDetectionTest)
{
    // Test for potential deadlocks in pool operations
    // RED PHASE: Should timeout if deadlock occurs

    auto deadlockTest = [&]() {
        std::vector<std::thread> threads;
        std::atomic<bool> completed{false};

        // Create threads that perform complex allocation patterns
        for (int i = 0; i < 4; ++i) {
            threads.emplace_back([&]() {
                for (int j = 0; j < 100; ++j) {
                    void* ptrs[10];

                    // Allocate multiple blocks
                    for (int k = 0; k < 10; ++k) {
                        ptrs[k] = pool_->allocate(256 * (k + 1));
                    }

                    // Deallocate in reverse order
                    for (int k = 9; k >= 0; --k) {
                        if (ptrs[k]) {
                            pool_->deallocate(ptrs[k]);
                        }
                    }
                }
            });
        }

        // Wait for completion with timeout
        for (auto& t : threads) {
            t.join();
        }

        completed.store(true);
    };

    // This should complete without timeout if no deadlock exists
    EXPECT_NO_FATAL_FAILURE({
        runDeadlockDetectionTest(deadlockTest, 5000);
    }) << "Potential deadlock detected in lock-free memory pool operations";
}

TEST_F(LockFreeMemoryPoolThreadSafetyTest, MetricsAccuracyUnderConcurrency)
{
    // Test accuracy of pool metrics under concurrent access
    // RED PHASE: Should detect inconsistent metrics

    pool_->resetMetrics();

    std::atomic<int> localAllocations{0};
    std::atomic<int> localDeallocations{0};

    auto metricsTest = [&](int threadId) {
        std::vector<void*> pointers;

        for (int i = 0; i < 200; ++i) {
            void* ptr = pool_->allocate(128);
            if (ptr) {
                pointers.push_back(ptr);
                localAllocations.fetch_add(1);
            }

            // Deallocation every other iteration
            if (i % 2 == 1 && !pointers.empty()) {
                pool_->deallocate(pointers.back());
                pointers.pop_back();
                localDeallocations.fetch_add(1);
            }
        }

        // Clean up
        for (void* ptr : pointers) {
            pool_->deallocate(ptr);
            localDeallocations.fetch_add(1);
        }
    };

    runConcurrentTest(metricsTest, 6, 1);

    // Verify metrics accuracy
    auto finalMetrics = pool_->getMetrics();

    EXPECT_EQ(finalMetrics.totalAllocations.load(), localAllocations.load())
        << "Allocation metrics inaccurate under concurrency";

    EXPECT_EQ(finalMetrics.totalDeallocations.load(), localDeallocations.load())
        << "Deallocation metrics inaccurate under concurrency";

    EXPECT_EQ(finalMetrics.currentInUse.load(), 0)
        << "Current usage metric inaccurate after cleanup";
}

TEST_F(LockFreeMemoryPoolThreadSafetyTest, RealtimeSafetyValidation)
{
    // Test that operations complete within real-time constraints
    // RED PHASE: Should detect operations exceeding real-time thresholds

    const double maxRealtimeUs = 50.0; // 50 microseconds maximum

    std::atomic<int> realtimeViolations{0};
    std::atomic<int> totalOperations{0};

    auto realtimeTest = [&](int threadId) {
        ThreadTestUtils::HighResTimer timer;

        for (int i = 0; i < 1000; ++i) {
            // Measure allocation time
            timer.start();
            void* ptr = pool_->allocate(512);
            double allocTimeUs = timer.elapsedMs() * 1000.0;

            if (allocTimeUs > maxRealtimeUs) {
                realtimeViolations.fetch_add(1);
                logThreadSafetyViolation("Allocation exceeded realtime threshold: " +
                                       std::to_string(allocTimeUs) + "us");
            }

            if (ptr) {
                // Measure deallocation time
                timer.start();
                pool_->deallocate(ptr);
                double deallocTimeUs = timer.elapsedMs() * 1000.0;

                if (deallocTimeUs > maxRealtimeUs) {
                    realtimeViolations.fetch_add(1);
                    logThreadSafetyViolation("Deallocation exceeded realtime threshold: " +
                                           std::to_string(deallocTimeUs) + "us");
                }
            }

            totalOperations.fetch_add(1);
        }
    };

    runStressTest(realtimeTest, 2000, 4);

    double violationRate = static_cast<double>(realtimeViolations.load()) / totalOperations.load();

    EXPECT_LT(violationRate, 0.01) // Less than 1% violations allowed
        << "Realtime safety violation rate too high: " << (violationRate * 100) << "%";
}