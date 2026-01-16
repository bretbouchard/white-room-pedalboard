#include <gtest/gtest.h>
#include <thread>
#include <vector>
#include <chrono>
#include <random>
#include <atomic>
#include "performance/FlutterPerformanceIntegration.h"

using namespace FlutterOptimized::Performance;
using namespace std::chrono;

class FlutterIntegrationPerformanceTest : public ::testing::Test {
protected:
    void SetUp() override {
        engine_ = std::make_unique<FlutterPerformanceEngine>(16);  // 16 channels
        PerformanceUtils::warmupCaches(engine_.get(), 100);
    }

    void TearDown() override {
        engine_.reset();
        PerformanceUtils::runGarbageCollection();
    }

    std::unique_ptr<FlutterPerformanceEngine> engine_;
};

TEST_F(FlutterIntegrationPerformanceTest, AllPerformanceTargetsMet) {
    // Test that all three performance optimization systems meet their targets

    // Run a comprehensive performance test
    auto stress_result = engine_->runStressTest(
        milliseconds(5000),  // 5 second test
        8,                  // 8 concurrent threads
        200                 // 200 ops/sec per thread
    );

    // Get final metrics
    auto metrics = engine_->getPerformanceMetrics();

    // Log performance results
    std::cout << "\n=== Flutter Integration Performance Results ===\n";
    std::cout << "Test Duration: " << stress_result.duration.count() << "ms\n";
    std::cout << "Total Operations: " << stress_result.total_operations << "\n";
    std::cout << "Operations/Second: " << std::fixed << std::setprecision(1)
              << stress_result.operations_per_second << "\n";
    std::cout << "Avg Frame Time: " << std::setprecision(2)
              << stress_result.avg_frame_time_us << "μs\n";
    std::cout << "Max Frame Time: " << stress_result.max_frame_time_us << "μs\n";
    std::cout << "Missed Frames: " << stress_result.missed_frames << "\n";
    std::cout << "Test Passed: " << (stress_result.test_passed ? "YES" : "NO") << "\n\n";

    std::cout << "Performance Metrics:\n";
    std::cout << "  Serialization: " << (metrics.serialization_target_met ? "PASS" : "FAIL")
              << " (" << metrics.serialization_metrics.serialization_time_us.count() << "μs)\n";
    std::cout << "  Parameters: " << (metrics.parameter_target_met ? "PASS" : "FAIL")
              << " (" << std::setprecision(2) << metrics.parameter_update_avg_time_ns / 1000 << "μs avg)\n";
    std::cout << "  Memory: " << (metrics.memory_target_met ? "PASS" : "FAIL")
              << " (" << metrics.peak_memory_usage_mb << "MB peak)\n";
    std::cout << "  Overall: " << (metrics.overall_target_met ? "PASS" : "FAIL")
              << " (" << metrics.getOverallEfficiency() << "% efficiency)\n";

    // Performance assertions
    EXPECT_TRUE(metrics.serialization_target_met)
        << "Serialization performance target not met: "
        << metrics.serialization_metrics.serialization_time_us.count() << "μs";

    EXPECT_TRUE(metrics.parameter_target_met)
        << "Parameter update performance target not met: "
        << metrics.parameter_update_avg_time_ns << "ns average";

    EXPECT_TRUE(metrics.memory_target_met)
        << "Memory usage target not met: "
        << metrics.peak_memory_usage_mb << "MB peak usage";

    EXPECT_TRUE(stress_result.test_passed)
        << "Stress test failed: " << stress_result.missed_frames << " missed frames";

    EXPECT_LT(stress_result.avg_frame_time_us, 100.0)
        << "Average frame time exceeds 100μs: " << stress_result.avg_frame_time_us << "μs";

    EXPECT_GT(stress_result.operations_per_second, 1000.0)
        << "Operations per second too low: " << stress_result.operations_per_second;

    // Specific target validation
    EXPECT_LT(metrics.serialization_metrics.serialization_time_us.count(), 25)
        << "Serialization exceeds 25μs target";

    EXPECT_LT(metrics.parameter_update_avg_time_ns, 1000.0)
        << "Parameter updates exceed 1μs target";

    EXPECT_LT(metrics.peak_memory_usage_mb, 100)
        << "Memory usage exceeds 100MB target";

    EXPECT_GT(metrics.memory_metrics.pool_hit_ratio, 0.7)
        << "Pool hit ratio too low: " << metrics.memory_metrics.pool_hit_ratio;
}

TEST_F(FlutterIntegrationPerformanceTest, RealWorldScenario_MultipleAudioChannels) {
    // Simulate a real-world scenario with multiple audio channels being updated

    const int num_channels = 16;
    const int frames_per_second = 60;
    const int test_duration_seconds = 3;
    const int total_frames = frames_per_second * test_duration_seconds;

    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<float> volume_dist(0.0f, 1.0f);
    std::uniform_real_distribution<float> pan_dist(-1.0f, 1.0f);
    std::uniform_int_distribution<int> channel_dist(0, num_channels - 1);

    std::vector<microseconds> frame_times;
    frame_times.reserve(total_frames);

    auto test_start = high_resolution_clock::now();

    for (int frame = 0; frame < total_frames; ++frame) {
        auto frame_start = high_resolution_clock::now();

        // Create parameter updates for random channels (simulate user interaction)
        std::vector<FlutterPerformanceEngine::ChannelParameterUpdate> updates;
        int channels_to_update = std::min(4, num_channels);  // Update up to 4 channels per frame

        for (int i = 0; i < channels_to_update; ++i) {
            FlutterPerformanceEngine::ChannelParameterUpdate update;
            update.channel_id = i + 1;  // Use sequential channel IDs
            update.volume = volume_dist(gen);
            update.pan = pan_dist(gen);
            update.mute = (gen() % 100) < 5;  // 5% chance of mute
            update.solo = (gen() % 100) < 2;  // 2% chance of solo

            // Add send levels
            update.send_levels = {{1, volume_dist(gen)}, {2, volume_dist(gen)}};
            updates.push_back(update);
        }

        // Process frame with serialization every 3rd frame (UI updates)
        bool serialize_frame = (frame % 3 == 0);
        auto result = engine_->processFrame(updates, serialize_frame);

        frame_times.push_back(result.total_time);

        // Maintain 60 FPS timing
        auto frame_end = high_resolution_clock::now();
        auto frame_time = duration_cast<microseconds>(frame_end - frame_start);
        auto target_frame_time = microseconds(16667);  // 60 FPS = 16.667ms

        if (frame_time < target_frame_time) {
            std::this_thread::sleep_for(target_frame_time - frame_time);
        }
    }

    auto test_end = high_resolution_clock::now();

    // Calculate performance statistics
    auto total_time = std::accumulate(frame_times.begin(), frame_times.end(), microseconds(0));
    auto avg_frame_time = total_time / total_frames;
    auto max_frame_time = *std::max_element(frame_times.begin(), frame_times.end());

    // Count frames that missed the 16.667ms target
    int missed_frames = std::count_if(frame_times.begin(), frame_times.end(),
                                      [](microseconds time) { return time > microseconds(16667); });

    double missed_frame_percentage = (double)missed_frames / total_frames * 100.0;

    std::cout << "\n=== Real-World Scenario Performance ===\n";
    std::cout << "Test Duration: " << duration_cast<seconds>(test_end - test_start).count() << "s\n";
    std::cout << "Frames Processed: " << total_frames << "\n";
    std::cout << "Average Frame Time: " << std::fixed << std::setprecision(2)
              << avg_frame_time.count() << "μs\n";
    std::cout << "Max Frame Time: " << max_frame_time.count() << "μs\n";
    std::cout << "Missed Frames: " << missed_frames << " (" << std::setprecision(1)
              << missed_frame_percentage << "%)\n";

    // Performance assertions for real-world scenario
    EXPECT_LT(avg_frame_time.count(), 5000)  // <5ms average frame time
        << "Average frame time too high for real-time audio: " << avg_frame_time.count() << "μs";

    EXPECT_LT(missed_frame_percentage, 5.0)  // <5% missed frames
        << "Too many missed frames: " << missed_frame_percentage << "%";

    EXPECT_LT(max_frame_time.count(), 10000)  // <10ms max frame time
        << "Maximum frame time too high: " << max_frame_time.count() << "μs";

    // Verify system still meets optimization targets
    auto metrics = engine_->getPerformanceMetrics();
    EXPECT_TRUE(metrics.overall_target_met)
        << "System no longer meets overall performance targets";
}

TEST_F(FlutterIntegrationPerformanceTest, MemoryEfficiency_70PercentReduction) {
    // Test that the memory pool achieves 70% allocation reduction

    const int num_buffers = 1000;
    std::vector<Memory::BufferHandle> buffers;
    buffers.reserve(num_buffers);

    auto initial_memory = Memory::MemoryUsageTracker::getCurrentSnapshot().total_heap_usage;

    // Acquire many buffers to test pool efficiency
    for (int i = 0; i < num_buffers; ++i) {
        Memory::BufferHandle buffer;

        // Mix different buffer sizes
        switch (i % 4) {
            case 0: buffer = engine_->acquireAudioBuffer(256); break;    // Small
            case 1: buffer = engine_->acquireAudioBuffer(1024); break;   // Medium
            case 2: buffer = engine_->acquireAudioBuffer(4096); break;   // Large
            case 3: buffer = engine_->acquireAudioBuffer(16384); break;  // Extra Large
        }

        if (buffer) {
            buffers.push_back(std::move(buffer));
        }
    }

    // Release half the buffers back to the pool
    for (int i = 0; i < num_buffers / 2; ++i) {
        if (!buffers.empty()) {
            buffers.pop_back();  // Automatic return to pool
        }
    }

    auto peak_memory = Memory::MemoryUsageTracker::getCurrentSnapshot().total_heap_usage;

    // Release remaining buffers
    buffers.clear();

    // Trigger cleanup and get final memory
    engine_->optimizeMemoryUsage();
    auto final_memory = Memory::MemoryUsageTracker::getCurrentSnapshot().total_heap_usage;

    // Get pool performance metrics
    auto pool_metrics = engine_->getPerformanceMetrics().memory_metrics;

    std::cout << "\n=== Memory Efficiency Results ===\n";
    std::cout << "Initial Memory: " << initial_memory / (1024 * 1024) << "MB\n";
    std::cout << "Peak Memory: " << peak_memory / (1024 * 1024) << "MB\n";
    std::cout << "Final Memory: " << final_memory / (1024 * 1024) << "MB\n";
    std::cout << "Pool Hit Ratio: " << std::fixed << std::setprecision(1)
              << pool_metrics.pool_hit_ratio * 100 << "%\n";
    std::cout << "Allocation Reduction: " << std::setprecision(1)
              << pool_metrics.allocation_reduction_percent << "%\n";

    // Memory efficiency assertions
    EXPECT_GT(pool_metrics.pool_hit_ratio, 0.8)  // >80% hit ratio
        << "Pool hit ratio too low: " << pool_metrics.pool_hit_ratio;

    EXPECT_GT(pool_metrics.allocation_reduction_percent, 70.0)  // >70% reduction
        << "Allocation reduction insufficient: " << pool_metrics.allocation_reduction_percent << "%";

    EXPECT_LT(peak_memory / (1024 * 1024), 100)  // <100MB peak
        << "Peak memory usage too high: " << peak_memory / (1024 * 1024) << "MB";

    EXPECT_LT(final_memory - initial_memory, 10 * 1024 * 1024)  // <10MB final increase
        << "Too much memory remaining after cleanup: " << (final_memory - initial_memory) / (1024 * 1024) << "MB";
}

TEST_F(FlutterIntegrationPerformanceTest, ValidationReport_ComprehensiveCheck) {
    // Generate comprehensive validation report

    auto validation_report = PerformanceValidator::validateSystem(engine_.get());
    auto report_string = PerformanceValidator::generatePerformanceReport(validation_report);

    std::cout << "\n" << report_string << std::endl;

    // All components should pass validation
    EXPECT_TRUE(validation_report.serialization_ok)
        << "Serialization validation failed";

    EXPECT_TRUE(validation_report.parameter_ok)
        << "Parameter validation failed";

    EXPECT_TRUE(validation_report.memory_ok)
        << "Memory validation failed";

    EXPECT_TRUE(validation_report.overall_ok)
        << "Overall system validation failed";

    // Efficiency should be high
    EXPECT_GT(validation_report.metrics.getOverallEfficiency(), 80.0)
        << "System efficiency too low: " << validation_report.metrics.getOverallEfficiency() << "%";

    // No critical issues should exist
    EXPECT_TRUE(validation_report.issues.empty())
        << "System has validation issues: " << validation_report.issues.size();
}

// Performance regression test
TEST_F(FlutterIntegrationPerformanceTest, PerformanceRegression_NoDegradation) {
    // Ensure performance doesn't regress over time

    const int regression_test_iterations = 100;
    std::vector<IntegratedPerformanceMetrics> metrics_history;
    metrics_history.reserve(regression_test_iterations);

    for (int i = 0; i < regression_test_iterations; ++i) {
        // Run a quick performance test
        std::vector<FlutterPerformanceEngine::ChannelParameterUpdate> updates;
        updates.resize(2);
        updates[0].channel_id = 1;
        updates[0].volume = 0.5f + (i % 10) / 100.0f;
        updates[1].channel_id = 2;
        updates[1].pan = -0.5f + (i % 20) / 100.0f;

        auto frame_result = engine_->processFrame(updates, i % 5 == 0);

        // Collect metrics every 10 iterations
        if (i % 10 == 0) {
            metrics_history.push_back(engine_->getPerformanceMetrics());
        }

        // Small delay between tests
        std::this_thread::sleep_for(microseconds(100));
    }

    // Analyze performance trends
    double avg_efficiency = 0.0;
    double min_efficiency = 100.0;
    double max_efficiency = 0.0;

    for (const auto& metrics : metrics_history) {
        double efficiency = metrics.getOverallEfficiency();
        avg_efficiency += efficiency;
        min_efficiency = std::min(min_efficiency, efficiency);
        max_efficiency = std::max(max_efficiency, efficiency);
    }

    avg_efficiency /= metrics_history.size();

    std::cout << "\n=== Performance Regression Test ===\n";
    std::cout << "Efficiency Range: " << std::fixed << std::setprecision(1)
              << min_efficiency << "% - " << max_efficiency << "%\n";
    std::cout << "Average Efficiency: " << avg_efficiency << "%\n";

    // Regression assertions
    EXPECT_GT(avg_efficiency, 75.0)
        << "Average efficiency too low: " << avg_efficiency << "%";

    EXPECT_LT(max_efficiency - min_efficiency, 20.0)
        << "Performance variance too high: " << (max_efficiency - min_efficiency) << "%";

    EXPECT_GT(min_efficiency, 60.0)
        << "Minimum efficiency too low: " << min_efficiency << "%";
}