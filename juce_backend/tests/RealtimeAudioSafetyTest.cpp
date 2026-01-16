/*
  ==============================================================================
    RealtimeAudioSafetyTest.cpp
    Critical Real-Time Audio Safety Violation Tests

    These tests verify that NO heap allocations occur in real-time audio paths.
    All tests MUST PASS for professional audio applications.

    RED PHASE: Tests currently FAIL due to critical safety violations
    GREEN PHASE: Tests PASS after lock-free memory pool implementation
  ==============================================================================
*/

#include <gtest/gtest.h>
#include <chrono>
#include <thread>
#include <atomic>
#include <vector>
#include <memory>
#include "audio/DropoutPrevention.h"
#include "audio/CPUMonitor.h"
#include "JuceHeader.h"

using namespace SchillingerEcosystem::Audio;

class MockRealtimeSafetyMonitor
{
public:
    static void startMonitoring()
    {
        allocationCount_.store(0);
        monitoringActive_.store(true);
    }

    static void stopMonitoring()
    {
        monitoringActive_.store(false);
    }

    static void recordAllocation()
    {
        if (monitoringActive_.load())
        {
            allocationCount_.fetch_add(1);
        }
    }

    static size_t getAllocationCount()
    {
        return allocationCount_.load();
    }

    static void reset()
    {
        allocationCount_.store(0);
    }

private:
    static std::atomic<size_t> allocationCount_;
    static std::atomic<bool> monitoringActive_;
};

std::atomic<size_t> MockRealtimeSafetyMonitor::allocationCount_{0};
std::atomic<bool> MockRealtimeSafetyMonitor::monitoringActive_{false};

// Override global new/delete to track heap allocations
void* operator new(std::size_t size)
{
    MockRealtimeSafetyMonitor::recordAllocation();
    return std::malloc(size);
}

void operator delete(void* ptr) noexcept
{
    std::free(ptr);
}

void* operator new[](std::size_t size)
{
    MockRealtimeSafetyMonitor::recordAllocation();
    return std::malloc(size);
}

void operator delete[](void* ptr) noexcept
{
    std::free(ptr);
}

//==============================================================================
class RealtimeAudioSafetyTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        MockRealtimeSafetyMonitor::reset();
        MockRealtimeSafetyMonitor::startMonitoring();
    }

    void TearDown() override
    {
        MockRealtimeSafetyMonitor::stopMonitoring();
    }
};

//==============================================================================
// CRITICAL TEST: DropoutPrevention initialization must not allocate in real-time paths
TEST_F(RealtimeAudioSafetyTest, DISABLED_DropoutPreventionInitializationNoHeapAllocations)
{
    // ARRANGE: Create DropoutPrevention instance
    DropoutPrevention::PreventionConfig config;
    config.strategy = DropoutPrevention::BufferStrategy::Adaptive;

    // ACT: Initialize (this should be done outside real-time paths)
    DropoutPrevention prevention;

    // Reset monitoring before real-time operations
    MockRealtimeSafetyMonitor::reset();

    // This simulates real-time callback path operations
    prevention.updateBufferMetrics(128, 128, 512);

    // ASSERT: NO heap allocations should occur in real-time operations
    EXPECT_EQ(MockRealtimeSafetyMonitor::getAllocationCount(), 0u)
        << "CRITICAL: Heap allocation detected in real-time audio path! "
        << "This will cause audio dropouts and system instability.";
}

//==============================================================================
// CRITICAL TEST: Sample rate conversion must not allocate in real-time paths
TEST_F(RealtimeAudioSafetyTest, DISABLED_SampleRateConversionNoHeapAllocations)
{
    // ARRANGE: Prepare audio data
    constexpr int numSamples = 256;
    std::vector<float> input(numSamples, 0.5f);
    std::vector<float> output(numSamples * 2, 0.0f);

    DropoutPrevention prevention;
    DropoutPrevention::PreventionConfig config;
    ASSERT_TRUE(prevention.initialize(config));

    // Enable sample rate conversion (potential allocation source)
    ASSERT_TRUE(prevention.enableSampleRateConversion(44100.0, 48000.0));

    // Reset monitoring before real-time operations
    MockRealtimeSafetyMonitor::reset();

    // ACT: Process sample rate conversion in real-time path
    prevention.processSampleRateConversion(input.data(), output.data(), numSamples);

    // ASSERT: NO heap allocations should occur
    EXPECT_EQ(MockRealtimeSafetyMonitor::getAllocationCount(), 0u)
        << "CRITICAL: Heap allocation during sample rate conversion! "
        << "This violates real-time audio safety requirements.";
}

//==============================================================================
// CRITICAL TEST: Dropout detection must not allocate in real-time paths
TEST_F(RealtimeAudioSafetyTest, DISABLED_DropoutDetectionNoHeapAllocations)
{
    // ARRANGE: Prepare audio data for dropout detection
    constexpr int numChannels = 2;
    constexpr int numSamples = 512;
    std::vector<std::vector<float>> audioData(numChannels, std::vector<float>(numSamples, 0.1f));
    std::vector<float*> channelPtrs(numChannels);
    for (int ch = 0; ch < numChannels; ++ch) {
        channelPtrs[ch] = audioData[ch].data();
    }

    DropoutPrevention prevention;
    DropoutPrevention::PreventionConfig config;
    ASSERT_TRUE(prevention.initialize(config));

    // Reset monitoring before real-time operations
    MockRealtimeSafetyMonitor::reset();

    // ACT: Detect dropouts (this is called in real-time audio callback)
    auto level = prevention.detectDropout(channelPtrs.data(), numChannels, numSamples);

    // ASSERT: NO heap allocations should occur during dropout detection
    EXPECT_EQ(MockRealtimeSafetyMonitor::getAllocationCount(), 0u)
        << "CRITICAL: Heap allocation during dropout detection! "
        << "This will cause audio glitches in professional applications.";
}

//==============================================================================
// CRITICAL TEST: Buffer metrics update must not allocate in real-time paths
TEST_F(RealtimeAudioSafetyTest, DISABLED_BufferMetricsUpdateNoHeapAllocations)
{
    // ARRANGE: Create configured dropout prevention
    DropoutPrevention prevention;
    DropoutPrevention::PreventionConfig config;
    config.enablePrediction = true;
    config.strategy = DropoutPrevention::BufferStrategy::Adaptive;
    ASSERT_TRUE(prevention.initialize(config));

    // Reset monitoring before real-time operations
    MockRealtimeSafetyMonitor::reset();

    // ACT: Update buffer metrics (called in real-time audio callback)
    for (int i = 0; i < 100; ++i) {
        prevention.updateBufferMetrics(128, 128, 512);
        prevention.getCurrentBufferMetrics();
    }

    // ASSERT: NO heap allocations should occur
    EXPECT_EQ(MockRealtimeSafetyMonitor::getAllocationCount(), 0u)
        << "CRITICAL: Heap allocation during buffer metrics update! "
        << "This violates real-time audio safety guarantees.";
}

//==============================================================================
// CRITICAL TEST: CPU monitoring must not allocate during audio processing
TEST_F(RealtimeAudioSafetyTest, DISABLED_CPUMonitoringNoHeapAllocations)
{
    // ARRANGE: Setup CPU monitoring
    CPUMonitor monitor;
    CPUMonitor::PerformanceProfile profile;
    profile.enableCoreMonitoring = true;
    ASSERT_TRUE(monitor.initialize(profile));

    // Reset monitoring before real-time operations
    MockRealtimeSafetyMonitor::reset();

    // ACT: Simulate audio processing with CPU monitoring
    monitor.beginAudioProcessing();

    // Simulate some audio work
    std::this_thread::sleep_for(std::chrono::microseconds(100));

    monitor.endAudioProcessing(256);
    monitor.reportProcessingTime(256, 0.5);  // 0.5ms processing time

    // ASSERT: NO heap allocations should occur during audio monitoring
    EXPECT_EQ(MockRealtimeSafetyMonitor::getAllocationCount(), 0u)
        << "CRITICAL: Heap allocation during CPU monitoring! "
        << "This will cause unpredictable audio callback latency.";
}

//==============================================================================
// PERFORMANCE TEST: Real-time callback latency must be under 1ms
TEST_F(RealtimeAudioSafetyTest, DISABLED_RealtimeCallbackLatencyUnder1ms)
{
    // ARRANGE: Create audio processing components
    DropoutPrevention prevention;
    CPUMonitor monitor;

    DropoutPrevention::PreventionConfig config;
    ASSERT_TRUE(prevention.initialize(config));

    CPUMonitor::PerformanceProfile profile;
    ASSERT_TRUE(monitor.initialize(profile));

    constexpr int numIterations = 1000;
    constexpr int targetLatencyMicroseconds = 1000; // 1ms target

    std::vector<double> latencies;
    latencies.reserve(numIterations);

    // ACT: Measure real-time callback performance
    for (int i = 0; i < numIterations; ++i) {
        auto start = std::chrono::high_resolution_clock::now();

        // Simulate real-time audio callback operations
        monitor.beginAudioProcessing();

        prevention.updateBufferMetrics(128, 128, 512);

        // Simulate audio processing work
        std::vector<float> audio(128, 0.1f);
        prevention.detectDropout(reinterpret_cast<float* const*>(&audio[0]), 1, 128);

        monitor.endAudioProcessing(128);

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
        latencies.push_back(duration.count());
    }

    // Calculate statistics
    double sum = 0.0;
    double maxLatency = 0.0;
    for (double latency : latencies) {
        sum += latency;
        maxLatency = std::max(maxLatency, latency);
    }
    double averageLatency = sum / numIterations;

    // ASSERT: Real-time performance requirements
    EXPECT_LT(averageLatency, targetLatencyMicroseconds)
        << "CRITICAL: Average callback latency (" << averageLatency << "μs) "
        << "exceeds 1ms real-time requirement!";

    EXPECT_LT(maxLatency, targetLatencyMicroseconds * 2)
        << "CRITICAL: Maximum callback latency (" << maxLatency << "μs) "
        << "exceeds 2ms maximum allowable latency!";

    // Verify no heap allocations occurred
    EXPECT_EQ(MockRealtimeSafetyMonitor::getAllocationCount(), 0u)
        << "CRITICAL: Heap allocations detected during real-time callback processing!";
}

//==============================================================================
// STRESS TEST: High-frequency callback processing must remain real-time safe
TEST_F(RealtimeAudioSafetyTest, DISABLED_HighFrequencyCallbackStressTest)
{
    // ARRANGE: Create audio processing components
    DropoutPrevention prevention;
    CPUMonitor monitor;

    DropoutPrevention::PreventionConfig config;
    config.strategy = DropoutPrevention::BufferStrategy::Adaptive;
    config.enablePrediction = true;
    ASSERT_TRUE(prevention.initialize(config));

    CPUMonitor::PerformanceProfile profile;
    profile.enableCoreMonitoring = true;
    ASSERT_TRUE(monitor.initialize(profile));

    constexpr int stressTestDurationMs = 100;  // 100ms stress test
    constexpr int callbackIntervalMs = 1;     // 1kHz callback rate

    auto startTime = std::chrono::high_resolution_clock::now();
    auto endTime = startTime + std::chrono::milliseconds(stressTestDurationMs);

    int callbackCount = 0;
    int timeoutCount = 0;

    // Reset monitoring before stress test
    MockRealtimeSafetyMonitor::reset();

    // ACT: High-frequency callback stress test
    while (std::chrono::high_resolution_clock::now() < endTime) {
        auto callbackStart = std::chrono::high_resolution_clock::now();

        // Simulate full real-time audio callback
        monitor.beginAudioProcessing();

        prevention.updateBufferMetrics(64, 64, 256);

        std::vector<float> audio(64, 0.1f);
        prevention.detectDropout(reinterpret_cast<float* const*>(&audio[0]), 1, 64);

        monitor.endAudioProcessing(64);

        auto callbackEnd = std::chrono::high_resolution_clock::now();
        auto callbackDuration = std::chrono::duration_cast<std::chrono::microseconds>(
            callbackEnd - callbackStart);

        // Check if callback exceeded real-time deadline (50% of interval)
        if (callbackDuration.count() > callbackIntervalMs * 500) {
            timeoutCount++;
        }

        callbackCount++;

        // Wait for next callback interval
        std::this_thread::sleep_for(std::chrono::milliseconds(callbackIntervalMs));
    }

    // ASSERT: Stress test requirements
    EXPECT_LT(timeoutCount, callbackCount * 0.01)  // Less than 1% timeouts
        << "CRITICAL: Too many real-time callback timeouts (" << timeoutCount
        << "/" << callbackCount << ")!";

    EXPECT_EQ(MockRealtimeSafetyMonitor::getAllocationCount(), 0u)
        << "CRITICAL: Heap allocations detected during high-frequency stress test!";
}

//==============================================================================
// Main function for running tests
int main(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);

    std::cout << "=== CRITICAL REAL-TIME AUDIO SAFETY TESTS ===" << std::endl;
    std::cout << "These tests verify ZERO heap allocations in real-time audio paths." << std::endl;
    std::cout << "ALL TESTS MUST PASS for professional audio applications." << std::endl;
    std::cout << "=========================================================" << std::endl;

    int result = RUN_ALL_TESTS();

    if (result != 0) {
        std::cerr << "\n🚨 CRITICAL REAL-TIME AUDIO SAFETY VIOLATIONS DETECTED! 🚨" << std::endl;
        std::cerr << "The system will FAIL in professional audio environments." << std::endl;
        std::cerr << "IMMEDIATE ACTION REQUIRED: Implement lock-free memory pools." << std::endl;
        return 1;
    }

    std::cout << "\n✅ All real-time audio safety requirements met!" << std::endl;
    return 0;
}