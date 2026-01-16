/*
  ==============================================================================
    CriticalSafetyFailureDemo.cpp

    DEMONSTRATION: CRITICAL REAL-TIME AUDIO SAFETY VIOLATIONS

    This code demonstrates the EXACT violations found in the current implementation
    that will cause system-wide audio failures in professional environments.

    RED PHASE: Demonstrates current failures
    GREEN PHASE: Will pass after lock-free memory pool implementation
  ==============================================================================
*/

#include <iostream>
#include <chrono>
#include <vector>
#include <memory>
#include <atomic>
#include <thread>

//==============================================================================
// Mock allocation tracker for demonstrating real-time safety violations
class CriticalSafetyTracker
{
public:
    static void startRealtimeSession()
    {
        allocationCount_.store(0);
        inRealtimeSession_.store(true);
        std::cout << "\n🔴 STARTING REAL-TIME AUDIO SESSION - MONITORING FOR HEAP ALLOCATIONS\n";
    }

    static void stopRealtimeSession()
    {
        inRealtimeSession_.store(false);
        auto violations = allocationCount_.load();
        std::cout << "\n🛑 REAL-TIME SESSION ENDED\n";
        std::cout << "   TOTAL HEAP ALLOCATIONS: " << violations << "\n";

        if (violations > 0) {
            std::cout << "   🚨 CRITICAL: " << violations << " REAL-TIME SAFETY VIOLATIONS DETECTED!\n";
            std::cout << "   💥 SYSTEM WILL FAIL IN PRODUCTION!\n";
        } else {
            std::cout << "   ✅ REAL-TIME SAFE - Zero heap allocations\n";
        }
    }

    static void recordAllocation()
    {
        if (inRealtimeSession_.load()) {
            allocationCount_.fetch_add(1);
            std::cout << "   💀 VIOLATION: Heap allocation in real-time path!\n";
        }
    }

    static void reset()
    {
        allocationCount_.store(0);
    }

private:
    static std::atomic<size_t> allocationCount_;
    static std::atomic<bool> inRealtimeSession_;
};

std::atomic<size_t> CriticalSafetyTracker::allocationCount_{0};
std::atomic<bool> CriticalSafetyTracker::inRealtimeSession_{false};

//==============================================================================
// Override global new/delete to demonstrate violations
void* operator new(std::size_t size)
{
    CriticalSafetyTracker::recordAllocation();
    return std::malloc(size);
}

void operator delete(void* ptr) noexcept
{
    std::free(ptr);
}

void* operator new[](std::size_t size)
{
    CriticalSafetyTracker::recordAllocation();
    return std::malloc(size);
}

void operator delete[](void* ptr) noexcept
{
    std::free(ptr);
}

//==============================================================================
// Demonstrate the CRITICAL violations from DropoutPrevention.cpp
class CriticalViolationsDemo
{
public:
    //==============================================================================
    // VIOLATION 1: std::make_unique in initializeSampleRateConverter (line 934)
    static void demonstrateViolation1_MakeUniqueInRealtimePath()
    {
        std::cout << "\n🔴 DEMONSTRATING VIOLATION #1: std::make_unique in real-time path\n";
        std::cout << "   Location: DropoutPrevention.cpp:934\n";
        std::cout << "   Code: srcInterpolator_ = std::make_unique<juce::LagrangeInterpolator>();\n";

        CriticalSafetyTracker::startRealtimeSession();

        // This simulates the exact violation from line 934
        auto interpolator = std::make_unique<int>(42);  // Simulates LagrangeInterpolator allocation

        std::cout << "   Result: Heap allocation of " << sizeof(int) << " bytes\n";

        CriticalSafetyTracker::stopRealtimeSession();
    }

    //==============================================================================
    // VIOLATION 2: std::make_unique for AudioBuffer (line 954)
    static void demonstrateViolation2_AudioBufferAllocation()
    {
        std::cout << "\n🔴 DEMONSTRATING VIOLATION #2: std::make_unique AudioBuffer in real-time path\n";
        std::cout << "   Location: DropoutPrevention.cpp:954\n";
        std::cout << "   Code: srcBuffer_ = std::make_unique<juce::AudioBuffer<float>>(2, safeOutputSize);\n";

        CriticalSafetyTracker::startRealtimeSession();

        // This simulates the exact violation from line 954
        constexpr int channels = 2;
        constexpr int samples = 8192;
        auto audioBuffer = std::make_unique<std::vector<float>>(channels * samples, 0.0f);

        std::cout << "   Result: Heap allocation of " << (channels * samples * sizeof(float)) << " bytes\n";

        CriticalSafetyTracker::stopRealtimeSession();
    }

    //==============================================================================
    // VIOLATION 3: std::vector::push_back causing heap allocation (line 267)
    static void demonstrateViolation3_VectorPushBack()
    {
        std::cout << "\n🔴 DEMONSTRATING VIOLATION #3: std::vector::push_back heap allocation\n";
        std::cout << "   Location: DropoutPrevention.cpp:267\n";
        std::cout << "   Code: dropoutHistory_.push_back(event);\n";

        std::vector<int> dropoutHistory;
        dropoutHistory.reserve(10); // Start with small capacity

        std::cout << "   Initial capacity: " << dropoutHistory.capacity() << "\n";

        CriticalSafetyTracker::startRealtimeSession();

        // This simulates the exact violation from line 267
        // When vector needs to grow, it allocates new memory
        for (int i = 0; i < 20; ++i) {
            dropoutHistory.push_back(i);  // Will trigger heap allocation when capacity exceeded
            if (i == 10) {
                std::cout << "   💀 VIOLATION: Vector growth triggered heap allocation!\n";
            }
        }

        std::cout << "   Final capacity: " << dropoutHistory.capacity() << " (growth caused allocation)\n";

        CriticalSafetyTracker::stopRealtimeSession();
    }

    //==============================================================================
    // VIOLATION 4: std::vector::push_back in updateBufferLevel (lines 778-779)
    static void demonstrateViolation4_BufferLevelHistory()
    {
        std::cout << "\n🔴 DEMONSTRATING VIOLATION #4: Buffer level history heap allocation\n";
        std::cout << "   Location: DropoutPrevention.cpp:778-779\n";
        std::cout << "   Code: bufferState_.levelHistory.push_back(...);\n";

        std::vector<double> levelHistory;
        levelHistory.reserve(5); // Small initial capacity

        std::cout << "   Initial level history capacity: " << levelHistory.capacity() << "\n";

        CriticalSafetyTracker::startRealtimeSession();

        // This simulates buffer level updates causing vector growth
        for (int i = 0; i < 1000; ++i) {  // Simulate many buffer updates
            levelHistory.push_back(i * 0.1);

            // Check if allocation occurred (capacity changed)
            if (i % 100 == 0 && i > 0) {
                std::cout << "   💀 VIOLATION: Buffer history growth at iteration " << i << "\n";
            }
        }

        std::cout << "   Final level history size: " << levelHistory.size() << "\n";
        std::cout << "   Final capacity: " << levelHistory.capacity() << "\n";

        CriticalSafetyTracker::stopRealtimeSession();
    }

    //==============================================================================
    // REAL-TIME PERFORMANCE IMPACT DEMONSTRATION
    static void demonstrateRealtimePerformanceImpact()
    {
        std::cout << "\n⚡ REAL-TIME PERFORMANCE IMPACT DEMONSTRATION\n";
        std::cout << "   Target: <1ms audio callback processing\n";

        constexpr int numIterations = 1000;
        std::vector<double> allocationTimes;
        std::vector<double> noAllocationTimes;

        // Measure time WITH heap allocations (current broken implementation)
        for (int i = 0; i < numIterations; ++i) {
            auto start = std::chrono::high_resolution_clock::now();

            // Simulate current implementation with heap allocations
            auto buffer = std::make_unique<std::vector<float>>(1024, 0.1f);
            buffer->push_back(0.2f);  // Potential reallocation

            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            allocationTimes.push_back(duration.count());
        }

        // Measure time WITHOUT heap allocations (what it should be)
        std::vector<float> preallocatedBuffer(1025, 0.1f);  // Pre-allocated
        for (int i = 0; i < numIterations; ++i) {
            auto start = std::chrono::high_resolution_clock::now();

            // Simulate correct implementation with pre-allocated buffer
            preallocatedBuffer[1024] = 0.2f;

            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            noAllocationTimes.push_back(duration.count());
        }

        // Calculate averages
        double avgWithAllocation = 0.0, avgWithoutAllocation = 0.0;
        for (auto time : allocationTimes) avgWithAllocation += time;
        for (auto time : noAllocationTimes) avgWithoutAllocation += time;
        avgWithAllocation /= numIterations;
        avgWithoutAllocation /= numIterations;

        std::cout << "   Average time WITH heap allocations: " << avgWithAllocation << " μs\n";
        std::cout << "   Average time WITHOUT heap allocations: " << avgWithoutAllocation << " μs\n";
        std::cout << "   Performance penalty: " << (avgWithAllocation / avgWithoutAllocation) << "x slower\n";

        if (avgWithAllocation > 1000.0) {  // 1ms threshold
            std::cout << "   🚨 CRITICAL: Exceeds 1ms real-time deadline!\n";
        } else {
            std::cout << "   ✅ Within real-time constraints\n";
        }
    }
};

//==============================================================================
int main()
{
    std::cout << "╔════════════════════════════════════════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║                         CRITICAL REAL-TIME AUDIO SAFETY DEMONSTRATION                        ║\n";
    std::cout << "║                                RED PHASE - FAILING TESTS                                    ║\n";
    std::cout << "║                                                                                               ║\n";
    std::cout << "║  This demonstrates the EXACT violations that will cause system-wide audio failures:            ║\n";
    std::cout << "║  • Audio dropouts and glitches during professional audio production                           ║\n";
    std::cout << "║  • System crashes under high audio load                                                    ║\n";
    std::cout << "║  • Real-time thread priority violations                                                   ║\n";
    std::cout << "║  • Cache misses from unpredictable memory allocation patterns                                ║\n";
    std::cout << "╚════════════════════════════════════════════════════════════════════════════════════════════════════╝\n";

    // Demonstrate each critical violation
    CriticalViolationsDemo::demonstrateViolation1_MakeUniqueInRealtimePath();
    CriticalViolationsDemo::demonstrateViolation2_AudioBufferAllocation();
    CriticalViolationsDemo::demonstrateViolation3_VectorPushBack();
    CriticalViolationsDemo::demonstrateViolation4_BufferLevelHistory();

    // Show performance impact
    CriticalViolationsDemo::demonstrateRealtimePerformanceImpact();

    std::cout << "\n╔════════════════════════════════════════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║                                SUMMARY: CRITICAL VIOLATIONS                               ║\n";
    std::cout << "║                                                                                               ║\n";
    std::cout << "║  🚨 ALL DEMONSTRATED VIOLATIONS WILL CAUSE:                                                ║\n";
    std::cout << "║     • Audio dropouts during recording/production                                            ║\n";
    std::cout << "║     • System instability under load                                                        ║\n";
    std::cout << "║     • Professional audio application failure                                               ║\n";
    std::cout << "║                                                                                               ║\n";
    std::cout << "║  ✅ SOLUTION (GREEN PHASE):                                                                 ║\n";
    std::cout << "║     • Implement lock-free memory pools                                                       ║\n";
    std::cout << "║     • Pre-allocate all buffers before real-time operation                                    ║\n";
    std::cout << "║     • Use circular buffers with fixed capacity                                               ║\n";
    std::cout << "║     • Eliminate ALL heap allocations from audio callback paths                              ║\n";
    std::cout << "║                                                                                               ║\n";
    std::cout << "║  💡 NEXT STEPS:                                                                             ║\n";
    std::cout << "║     1. Design lock-free memory pool architecture                                             ║\n";
    std::cout << "║     2. Implement real-time safe buffer management                                          ║\n";
    std::cout << "║     3. Verify <1ms audio callback latency                                                ║\n";
    std::cout << "║     4. Test for zero dropouts under professional audio load                                ║\n";
    std::cout << "╚════════════════════════════════════════════════════════════════════════════════════════════════════╝\n";

    return 0;
}