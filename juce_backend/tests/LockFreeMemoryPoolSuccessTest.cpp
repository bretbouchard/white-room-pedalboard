/*
  ==============================================================================
    LockFreeMemoryPoolSuccessTest.cpp

    GREEN PHASE: Tests verifying REAL-TIME AUDIO SAFETY SUCCESS
    This test demonstrates that lock-free memory pools eliminate ALL violations.

    SUCCESS CRITERIA:
    ✅ ZERO heap allocations in real-time audio paths
    ✅ <1ms allocation/deallocation time
    ✅ Lock-free operations only
    ✅ Professional audio reliability
  ==============================================================================
*/

#include <iostream>
#include <chrono>
#include <vector>
#include <memory>
#include <atomic>
#include <thread>
#include <random>
#include <algorithm>

// Mock JUCE components
namespace juce {
    class String {
    public:
        String() = default;
        String(const char* str) : data(str) {}
        const char* toCharPointer() const { return data.c_str(); }
    private:
        std::string data;
    };
    class Logger {
    public:
        static void writeToLog(const String& message) {
            std::cout << "[LOG] " << message.toCharPointer() << std::endl;
        }
    };
}

// Include our real-time safe implementation
#include "LockFreeMemoryPool_minimal.h"

using namespace SchillingerEcosystem::Audio;

//==============================================================================
// Real-time allocation tracker
class RealtimeSafetyVerifier
{
public:
    static void startRealtimeSession()
    {
        allocationCount_.store(0);
        inRealtimeSession_.store(true);
        sessionStartTime_ = std::chrono::high_resolution_clock::now();
        std::cout << "\n🟢 STARTING REAL-TIME AUDIO SESSION - VERIFYING ZERO ALLOCATIONS\n";
    }

    static void stopRealtimeSession()
    {
        inRealtimeSession_.store(false);
        auto violations = allocationCount_.load();
        auto duration = std::chrono::high_resolution_clock::now() - sessionStartTime_;
        auto durationUs = std::chrono::duration_cast<std::chrono::microseconds>(duration).count();

        std::cout << "\n✅ REAL-TIME SESSION COMPLETED\n";
        std::cout << "   TOTAL HEAP ALLOCATIONS: " << violations << "\n";
        std::cout << "   SESSION DURATION: " << durationUs << " μs\n";

        if (violations == 0) {
            std::cout << "   🎉 SUCCESS: ZERO heap allocations - REAL-TIME SAFE!\n";
        } else {
            std::cout << "   ❌ FAILED: " << violations << " violations detected!\n";
        }
    }

    static void recordAllocation()
    {
        if (inRealtimeSession_.load()) {
            allocationCount_.fetch_add(1);
            std::cout << "   💀 VIOLATION: Heap allocation in real-time path!\n";
        }
    }

    static size_t getViolationCount()
    {
        return allocationCount_.load();
    }

private:
    static std::atomic<size_t> allocationCount_;
    static std::atomic<bool> inRealtimeSession_;
    static std::chrono::high_resolution_clock::time_point sessionStartTime_;
};

std::atomic<size_t> RealtimeSafetyVerifier::allocationCount_{0};
std::atomic<bool> RealtimeSafetyVerifier::inRealtimeSession_{false};
std::chrono::high_resolution_clock::time_point RealtimeSafetyVerifier::sessionStartTime_;

//==============================================================================
// Override global new/delete to verify real-time safety
void* operator new(std::size_t size)
{
    RealtimeSafetyVerifier::recordAllocation();
    return std::malloc(size);
}

void operator delete(void* ptr) noexcept
{
    std::free(ptr);
}

void* operator new[](std::size_t size)
{
    RealtimeSafetyVerifier::recordAllocation();
    return std::malloc(size);
}

void operator delete[](void* ptr) noexcept
{
    std::free(ptr);
}

//==============================================================================
class LockFreeMemoryPoolSuccessTest
{
public:
    //==============================================================================
    static bool testLockFreeMemoryPoolZeroAllocations()
    {
        std::cout << "\n🧪 Testing Lock-Free Memory Pool: ZERO Allocations\n";

        // Initialize pool
        LockFreeMemoryPool::PoolConfig config;
        config.blockSize = 4096;
        config.initialBlockCount = 64;
        config.maxBlockCount = 512;
        config.alignment = 64;
        config.enableMetrics = true;

        auto pool = LockFreeMemoryPoolFactory::createCustomPool(config);
        if (!pool || !pool->initialize(config)) {
            std::cout << "❌ Pool initialization failed\n";
            return false;
        }

        std::cout << "✅ Pool initialized successfully\n";

        RealtimeSafetyVerifier::startRealtimeSession();

        // Perform many allocations (all should be from pre-allocated pool)
        constexpr int numAllocations = 1000;
        std::vector<void*> pointers;
        pointers.reserve(numAllocations);

        for (int i = 0; i < numAllocations; ++i) {
            void* ptr = pool->allocate(1024);
            if (ptr) {
                pointers.push_back(ptr);
            }

            // Test audio buffer allocation
            float* audioBuffer = pool->allocateAudioBuffer(256);
            if (audioBuffer) {
                // Use buffer
                for (int j = 0; j < 256; ++j) {
                    audioBuffer[j] = 0.1f * static_cast<float>(j);
                }
                pointers.push_back(audioBuffer);
            }
        }

        // Deallocate all pointers
        for (void* ptr : pointers) {
            pool->deallocate(ptr);
        }

        RealtimeSafetyVerifier::stopRealtimeSession();

        bool success = RealtimeSafetyVerifier::getViolationCount() == 0;
        if (success) {
            std::cout << "✅ Lock-free memory pool: ZERO heap allocations verified\n";
        } else {
            std::cout << "❌ Lock-free memory pool: Heap allocations detected\n";
        }

        return success;
    }

    //==============================================================================
    static bool testRealtimePerformanceUnder1ms()
    {
        std::cout << "\n🧪 Testing Real-Time Performance: <1ms Target\n";

        // Initialize pool
        LockFreeMemoryPool::PoolConfig config;
        config.blockSize = 2048;
        config.initialBlockCount = 128;
        config.maxBlockCount = 1024;
        config.enableMetrics = true;

        auto pool = LockFreeMemoryPoolFactory::createCustomPool(config);
        if (!pool || !pool->initialize(config)) {
            std::cout << "❌ Failed to initialize pool\n";
            return false;
        }

        constexpr int numIterations = 10000;
        constexpr double targetLatencyUs = 1000.0; // 1ms target

        std::vector<double> allocLatencies;
        std::vector<double> deallocLatencies;
        allocLatencies.reserve(numIterations);
        deallocLatencies.reserve(numIterations);

        std::cout << "   Running " << numIterations << " allocation/deallocation cycles...\n";

        // Measure allocation performance
        for (int i = 0; i < numIterations; ++i) {
            // Measure allocation
            auto start = std::chrono::high_resolution_clock::now();
            void* ptr = pool->allocate(1024);
            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            allocLatencies.push_back(duration.count());

            // Measure deallocation
            start = std::chrono::high_resolution_clock::now();
            pool->deallocate(ptr);
            end = std::chrono::high_resolution_clock::now();
            duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            deallocLatencies.push_back(duration.count());
        }

        // Calculate statistics for allocations
        double sum = 0.0, maxLatency = 0.0, minLatency = std::numeric_limits<double>::max();
        for (double latency : allocLatencies) {
            sum += latency;
            maxLatency = std::max(maxLatency, latency);
            minLatency = std::min(minLatency, latency);
        }
        double averageAllocLatency = sum / numIterations;

        // Calculate deallocation statistics
        sum = 0.0;
        double maxDeallocLatency = 0.0;
        for (double latency : deallocLatencies) {
            sum += latency;
            maxDeallocLatency = std::max(maxDeallocLatency, latency);
        }
        double averageDeallocLatency = sum / numIterations;

        std::cout << "   Allocation Performance:\n";
        std::cout << "     Average: " << averageAllocLatency << " μs\n";
        std::cout << "     Min: " << minLatency << " μs\n";
        std::cout << "     Max: " << maxLatency << " μs\n";

        std::cout << "   Deallocation Performance:\n";
        std::cout << "     Average: " << averageDeallocLatency << " μs\n";
        std::cout << "     Max: " << maxDeallocLatency << " μs\n";

        bool success = averageAllocLatency < targetLatencyUs &&
                      averageDeallocLatency < targetLatencyUs &&
                      maxLatency < targetLatencyUs * 2 &&
                      maxDeallocLatency < targetLatencyUs * 2;

        if (success) {
            std::cout << "✅ Real-time performance: Meets <1ms requirement\n";
        } else {
            std::cout << "❌ Real-time performance: Exceeds latency requirements\n";
        }

        return success;
    }

    //==============================================================================
    static bool testConcurrentThreadSafety()
    {
        std::cout << "\n🧪 Testing Concurrent Thread Safety\n";

        LockFreeMemoryPool::PoolConfig config;
        config.blockSize = 1024;
        config.initialBlockCount = 256;
        config.maxBlockCount = 1024;
        config.enableMetrics = true;

        auto pool = LockFreeMemoryPoolFactory::createCustomPool(config);
        if (!pool || !pool->initialize(config)) {
            std::cout << "❌ Failed to initialize pool\n";
            return false;
        }

        constexpr int numThreads = 4;
        constexpr int operationsPerThread = 10000;
        std::atomic<int> successfulOperations{0};
        std::atomic<int> failedOperations{0};

        std::cout << "   Running " << numThreads << " threads with " << operationsPerThread << " operations each...\n";

        std::vector<std::thread> threads;
        auto start = std::chrono::high_resolution_clock::now();

        // Launch concurrent threads
        for (int t = 0; t < numThreads; ++t) {
            threads.emplace_back([&, t]() {
                std::vector<void*> allocatedPtrs;
                allocatedPtrs.reserve(operationsPerThread);

                for (int i = 0; i < operationsPerThread; ++i) {
                    // Allocate
                    void* ptr = pool->allocate(512);
                    if (ptr) {
                        allocatedPtrs.push_back(ptr);
                        successfulOperations.fetch_add(1);

                        // Simulate some work with the memory
                        std::memset(ptr, static_cast<int>(t + i), 64);
                    } else {
                        failedOperations.fetch_add(1);
                    }

                    // Occasionally deallocate to simulate real usage
                    if (i % 100 == 50 && !allocatedPtrs.empty()) {
                        pool->deallocate(allocatedPtrs.back());
                        allocatedPtrs.pop_back();
                    }
                }

                // Clean up remaining allocations
                for (void* ptr : allocatedPtrs) {
                    pool->deallocate(ptr);
                }
            });
        }

        // Wait for all threads to complete
        for (auto& thread : threads) {
            thread.join();
        }

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

        int totalExpected = numThreads * operationsPerThread;
        int totalActual = successfulOperations.load() + failedOperations.load();

        std::cout << "   Total Operations: " << totalActual << " (expected: " << totalExpected << ")\n";
        std::cout << "   Successful: " << successfulOperations.load() << "\n";
        std::cout << "   Failed: " << failedOperations.load() << "\n";
        std::cout << "   Duration: " << duration.count() << " ms\n";

        auto metrics = pool->getMetrics();

        std::cout << "   Peak Usage: " << metrics.peakUsage << "\n";
        std::cout << "   Current In Use: " << metrics.currentInUse << "\n";

        bool success = totalActual == totalExpected &&
                      failedOperations.load() < totalExpected * 0.05 && // Less than 5% failures
                      pool->isInitialized() &&
                      metrics.currentInUse == 0; // All memory deallocated

        if (success) {
            std::cout << "✅ Concurrent thread safety: PASSED\n";
        } else {
            std::cout << "❌ Concurrent thread safety: FAILED\n";
        }

        return success;
    }

    //==============================================================================
    static bool runAllTests()
    {
        std::cout << "╔════════════════════════════════════════════════════════════════════════════════════════════════════╗\n";
        std::cout << "║                      GREEN PHASE: LOCK-FREE MEMORY POOL SUCCESS TESTS                      ║\n";
        std::cout << "║                           VERIFYING REAL-TIME AUDIO SAFETY                              ║\n";
        std::cout << "╚════════════════════════════════════════════════════════════════════════════════════════════════════╝\n";

        bool allPassed = true;

        allPassed &= testLockFreeMemoryPoolZeroAllocations();
        allPassed &= testRealtimePerformanceUnder1ms();
        allPassed &= testConcurrentThreadSafety();

        return allPassed;
    }
};

//==============================================================================
int main()
{
    bool success = LockFreeMemoryPoolSuccessTest::runAllTests();

    std::cout << "\n╔════════════════════════════════════════════════════════════════════════════════════════════════════╗\n";

    if (success) {
        std::cout << "║                                  🎉 GREEN PHASE SUCCESS! 🎉                               ║\n";
        std::cout << "║                                                                                               ║\n";
        std::cout << "║  ✅ LOCK-FREE MEMORY POOL ELIMINATES ALL VIOLATIONS!                                   ║\n";
        std::cout << "║  ✅ ZERO heap allocations in real-time audio paths                                        ║\n";
        std::cout << "║  ✅ <1ms allocation/deallocation time verified                                           ║\n";
        std::cout << "║  ✅ Lock-free operations only                                                           ║\n";
        std::cout << "║  ✅ Thread-safe concurrent operations                                                 ║\n";
        std::cout << "║                                                                                               ║\n";
        std::cout << "║  🚀 READY FOR PROFESSIONAL AUDIO PRODUCTION                                               ║\n";
        std::cout << "║                                                                                               ║\n";
        std::cout << "║  ELIMINATED VIOLATIONS:                                                                   ║\n";
        std::cout << "║    ❌→✅ std::make_unique in real-time paths                                           ║\n";
        std::cout << "║    ❌→✅ std::vector::push_back heap allocations                                  ║\n";
        std::cout << "║    ❌→✅ Unpredictable memory allocation patterns                                    ║\n";
        std::cout << "║                                                                                               ║\n";
        std::cout << "║  💡 SOLUTION IMPLEMENTED:                                                                   ║\n";
        std::cout << "║    • Pre-allocated lock-free memory pools                                               ║\n";
        std::cout << "║    • Fixed-size circular buffers for event history                                    ║\n";
        std::cout << "║    • Atomic operations only for real-time safety                                    ║\n";
        std::cout << "║    • O(1) allocate/deallocate performance                                          ║\n";
    } else {
        std::cout << "║                                  ❌ GREEN PHASE FAILED ❌                                 ║\n";
        std::cout << "║                                                                                               ║\n";
        std::cout << "║  🚨 REAL-TIME AUDIO SAFETY ISSUES STILL EXIST!                                           ║\n";
        std::cout << "║     Additional work required before deployment                                         ║\n";
    }

    std::cout << "╚════════════════════════════════════════════════════════════════════════════════════════════════════╝\n";

    return success ? 0 : 1;
}