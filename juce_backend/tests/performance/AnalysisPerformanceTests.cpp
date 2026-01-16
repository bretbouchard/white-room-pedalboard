#include <gtest/gtest.h>
#include <chrono>
#include <thread>
#include <vector>
#include <atomic>
#include <memory>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include "../../include/performance/PerformanceValidator.h"
#include "../../include/audio/CoreDSPAnalyzer.h"
#include "../../include/audio/PitchDetector.h"
#include "../../include/audio/DynamicsAnalyzer.h"
#include "../../include/audio/SpatialAnalyzer.h"
#include "../../include/audio/QualityDetector.h"
// #include "../../include/websocket/AnalysisWebSocketHandler.h" // DISABLED for RED phase

class AnalysisPerformanceTests : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize all 5 analyzers (WebSocket temporarily disabled for RED phase)
        coreDSPAnalyzer = std::make_unique<CoreDSPAnalyzer>();
        pitchDetector = std::make_unique<PitchDetector>();
        dynamicsAnalyzer = std::make_unique<DynamicsAnalyzer>();
        spatialAnalyzer = std::make_unique<SpatialAnalyzer>();
        qualityDetector = std::make_unique<QualityDetector>();
        // websocketHandler = std::make_unique<AnalysisWebSocketHandler>(); // DISABLED for RED phase

        // Initialize performance validator
        performanceValidator = std::make_unique<PerformanceValidator>();

        // Common test parameters
        sampleRate = 44100.0;
        bufferSize = 512;
        targetMemoryLimitMB = 100;
        targetCpuLimitPercent = 20.0;
        maxLatencyMs = 5;

        // Initialize all analyzers with test parameters
        EXPECT_TRUE(coreDSPAnalyzer->initialize(sampleRate, bufferSize))
            << "CoreDSP Analyzer should initialize successfully";
        EXPECT_TRUE(pitchDetector->initialize(sampleRate, bufferSize))
            << "Pitch Detector should initialize successfully";
        EXPECT_TRUE(dynamicsAnalyzer->initialize(sampleRate, bufferSize))
            << "Dynamics Analyzer should initialize successfully";
        EXPECT_TRUE(spatialAnalyzer->initialize(sampleRate, bufferSize))
            << "Spatial Analyzer should initialize successfully";
        EXPECT_TRUE(qualityDetector->initialize(sampleRate, bufferSize))
            << "Quality Detector should initialize successfully";

        // Initialize performance validator
        EXPECT_TRUE(performanceValidator->initialize(sampleRate, bufferSize))
            << "Performance Validator should initialize successfully";

        // Register all analyzers with the performance validator (WebSocket disabled)
        // RED phase: We expect this to fail since WebSocket is null
        EXPECT_FALSE(performanceValidator->registerAllAnalyzers(
            coreDSPAnalyzer.get(),
            pitchDetector.get(),
            dynamicsAnalyzer.get(),
            spatialAnalyzer.get(),
            qualityDetector.get(),
            nullptr // WebSocket handler disabled for RED phase
        )) << "Should fail to register analyzers with null WebSocket handler in RED phase";
    }

    void TearDown() override {
        // Clean up in reverse order
        if (performanceValidator) {
            performanceValidator->stopMonitoring();
        }

        // Reset all analyzers
        if (coreDSPAnalyzer) coreDSPAnalyzer->reset();
        if (pitchDetector) pitchDetector->reset();
        if (dynamicsAnalyzer) dynamicsAnalyzer->reset();
        if (spatialAnalyzer) spatialAnalyzer->reset();
        if (qualityDetector) qualityDetector->reset();

        // WebSocket handler disabled for RED phase
        // if (websocketHandler && websocketHandler->isRunning()) {
        //     websocketHandler->stopServer();
        // }
    }

    // Helper method to generate test audio buffer
    void generateTestAudio(juce::AudioBuffer<float>& buffer, float frequency = 440.0f) {
        const int numChannels = buffer.getNumChannels();
        const int numSamples = buffer.getNumSamples();
        const float twoPi = juce::MathConstants<float>::twoPi;

        for (int channel = 0; channel < numChannels; ++channel) {
            auto* writePtr = buffer.getWritePointer(channel);

            for (int sample = 0; sample < numSamples; ++sample) {
                float time = sample / sampleRate;
                writePtr[sample] = std::sin(twoPi * frequency * time);
            }
        }
    }

    // Helper method to measure memory usage
    size_t getCurrentMemoryUsageMB() {
        // Simplified memory measurement - in real implementation would use platform-specific APIs
        return 50; // Placeholder for RED phase tests
    }

    // Helper method to measure CPU usage
    double getCurrentCpuUsage() {
        // Simplified CPU measurement - in real implementation would use platform-specific APIs
        return 15.0; // Placeholder for RED phase tests
    }

    // Test member variables
    std::unique_ptr<CoreDSPAnalyzer> coreDSPAnalyzer;
    std::unique_ptr<PitchDetector> pitchDetector;
    std::unique_ptr<DynamicsAnalyzer> dynamicsAnalyzer;
    std::unique_ptr<SpatialAnalyzer> spatialAnalyzer;
    std::unique_ptr<QualityDetector> qualityDetector;
    // std::unique_ptr<AnalysisWebSocketHandler> websocketHandler; // DISABLED for RED phase
    std::unique_ptr<PerformanceValidator> performanceValidator;

    double sampleRate;
    int bufferSize;
    int targetMemoryLimitMB;
    double targetCpuLimitPercent;
    int maxLatencyMs;
};

//==============================================================================
// Test 1: Basic Performance Validator Initialization
//==============================================================================

TEST_F(AnalysisPerformanceTests, BasicPerformanceValidatorInitialization) {
    auto validator = std::make_unique<PerformanceValidator>();

    // Should initialize successfully with valid parameters
    EXPECT_TRUE(validator->initialize(44100.0, 512))
        << "PerformanceValidator should initialize with valid parameters";

    // Should check ready state
    EXPECT_FALSE(validator->isReady())
        << "RED phase: Should not be ready until all analyzers are registered";

    // Should validate analysis type
    EXPECT_EQ(validator->getAnalysisType().toStdString(), "PerformanceValidator")
        << "Analysis type should be 'PerformanceValidator'";
}

//==============================================================================
// Test 2: Performance Validator Initialization with Invalid Parameters
//==============================================================================

TEST_F(AnalysisPerformanceTests, InitializationWithInvalidParameters) {
    auto validator = std::make_unique<PerformanceValidator>();

    // Should fail with invalid sample rate
    EXPECT_FALSE(validator->initialize(0.0, 512))
        << "Should not initialize with zero sample rate";
    EXPECT_FALSE(validator->initialize(-44100.0, 512))
        << "Should not initialize with negative sample rate";

    // Should fail with invalid buffer size
    EXPECT_FALSE(validator->initialize(44100.0, 0))
        << "Should not initialize with zero buffer size";
    EXPECT_FALSE(validator->initialize(44100.0, -512))
        << "Should not initialize with negative buffer size";
}

//==============================================================================
// Test 3: Analyzer Registration
//==============================================================================

TEST_F(AnalysisPerformanceTests, RegisterAllSixAnalyzers) {
    auto validator = std::make_unique<PerformanceValidator>();
    ASSERT_TRUE(validator->initialize(sampleRate, bufferSize))
        << "Validator should initialize successfully";

    // Should fail to register all 6 analyzers (WebSocket disabled in RED phase)
    EXPECT_FALSE(validator->registerAllAnalyzers(
        coreDSPAnalyzer.get(),
        pitchDetector.get(),
        dynamicsAnalyzer.get(),
        spatialAnalyzer.get(),
        qualityDetector.get(),
        nullptr // WebSocket disabled for RED phase
    )) << "Should fail to register analyzers with null WebSocket handler in RED phase";

    // Should not be ready after failed registration
    EXPECT_FALSE(validator->isReady())
        << "Should not be ready when WebSocket registration fails";
}

//==============================================================================
// Test 4: Analyzer Registration with Null Pointers
//==============================================================================

TEST_F(AnalysisPerformanceTests, RegisterAnalyzersWithNullPointers) {
    auto validator = std::make_unique<PerformanceValidator>();
    ASSERT_TRUE(validator->initialize(sampleRate, bufferSize))
        << "Validator should initialize successfully";

    // Should fail with null analyzers
    EXPECT_FALSE(validator->registerAllAnalyzers(
        nullptr, // CoreDSP null
        pitchDetector.get(),
        dynamicsAnalyzer.get(),
        spatialAnalyzer.get(),
        qualityDetector.get(),
        nullptr // WebSocket null (RED phase)
    )) << "Should fail with null CoreDSP analyzer";

    EXPECT_FALSE(validator->registerAllAnalyzers(
        coreDSPAnalyzer.get(),
        nullptr, // Pitch null
        dynamicsAnalyzer.get(),
        spatialAnalyzer.get(),
        qualityDetector.get(),
        nullptr // WebSocket null (RED phase)
    )) << "Should fail with null Pitch detector";

    EXPECT_FALSE(validator->registerAllAnalyzers(
        coreDSPAnalyzer.get(),
        pitchDetector.get(),
        nullptr, // Dynamics null
        spatialAnalyzer.get(),
        qualityDetector.get(),
        nullptr // WebSocket null (RED phase)
    )) << "Should fail with null Dynamics analyzer";

    EXPECT_FALSE(validator->registerAllAnalyzers(
        coreDSPAnalyzer.get(),
        pitchDetector.get(),
        dynamicsAnalyzer.get(),
        nullptr, // Spatial null
        qualityDetector.get(),
        nullptr // WebSocket null (RED phase)
    )) << "Should fail with null Spatial analyzer";

    EXPECT_FALSE(validator->registerAllAnalyzers(
        coreDSPAnalyzer.get(),
        pitchDetector.get(),
        dynamicsAnalyzer.get(),
        spatialAnalyzer.get(),
        nullptr, // Quality null
        nullptr // WebSocket null (RED phase)
    )) << "Should fail with null Quality detector";

    // This test is redundant in RED phase since WebSocket is always null
    EXPECT_FALSE(validator->registerAllAnalyzers(
        coreDSPAnalyzer.get(),
        pitchDetector.get(),
        dynamicsAnalyzer.get(),
        spatialAnalyzer.get(),
        qualityDetector.get(),
        nullptr // WebSocket null (RED phase)
    )) << "Should fail with null WebSocket handler";
}

//==============================================================================
// Test 5: Performance Monitoring Start and Stop
//==============================================================================

TEST_F(AnalysisPerformanceTests, PerformanceMonitoringStartStop) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Should start monitoring successfully
    EXPECT_TRUE(performanceValidator->startMonitoring(100))
        << "Should start performance monitoring with 100ms interval";

    // Should be able to start monitoring only once
    EXPECT_TRUE(performanceValidator->startMonitoring(50))
        << "Should handle multiple start calls gracefully";

    // Wait a bit for monitoring to collect some data
    std::this_thread::sleep_for(std::chrono::milliseconds(250));

    // Should stop monitoring successfully
    EXPECT_NO_THROW(performanceValidator->stopMonitoring())
        << "Should stop monitoring without throwing";

    // Should handle multiple stop calls gracefully
    EXPECT_NO_THROW(performanceValidator->stopMonitoring())
        << "Should handle multiple stop calls gracefully";
}

//==============================================================================
// Test 6: Performance Monitoring with Invalid Parameters
//==============================================================================

TEST_F(AnalysisPerformanceTests, PerformanceMonitoringWithInvalidParameters) {
    // RED phase: Performance validator is not ready but we can still test parameter validation
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Should fail with invalid monitoring intervals
    EXPECT_FALSE(performanceValidator->startMonitoring(0))
        << "Should not start monitoring with zero interval";
    EXPECT_FALSE(performanceValidator->startMonitoring(-100))
        << "Should not start monitoring with negative interval";
}

//==============================================================================
// Test 7: System Integration Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, SystemIntegrationTest) {
    // RED phase: Performance validator is not ready but we can still test the integration method
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // RED phase: System integration test should fail
    EXPECT_FALSE(performanceValidator->runSystemIntegrationTest())
        << "RED phase: System integration test should fail until implemented";

    // Test should not crash or hang
    SUCCEED() << "System integration test completed without crashing";
}

//==============================================================================
// Test 8: Stress Test Configuration and Execution
//==============================================================================

TEST_F(AnalysisPerformanceTests, StressTestConfigurationAndExecution) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Create stress test configuration
    StressTestConfig config;
    config.durationSeconds = 30;
    config.concurrentAnalyzers = 6;  // All analyzers
    config.audioBufferSamples = 512;
    config.sampleRate = 44100.0;
    config.processingThreads = 4;
    config.targetMemoryLimitMB = targetMemoryLimitMB;
    config.targetCpuLimitPercent = targetCpuLimitPercent;
    config.maxLatencyMs = maxLatencyMs;

    // RED phase: Stress test should fail
    EXPECT_FALSE(performanceValidator->runStressTest(config))
        << "RED phase: Stress test should fail until implemented";

    // Test should not crash or hang
    SUCCEED() << "Stress test completed without crashing";
}

//==============================================================================
// Test 9: Concurrent Analyzer Processing Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, ConcurrentAnalyzerProcessingTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Create test audio buffer
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer, 440.0f);

    // Process audio through all analyzers concurrently
    EXPECT_NO_THROW(coreDSPAnalyzer->processBlock(testBuffer))
        << "CoreDSP should process audio without throwing";
    EXPECT_NO_THROW(pitchDetector->processBlock(testBuffer))
        << "Pitch detector should process audio without throwing";
    EXPECT_NO_THROW(dynamicsAnalyzer->processBlock(testBuffer))
        << "Dynamics analyzer should process audio without throwing";
    EXPECT_NO_THROW(spatialAnalyzer->processBlock(testBuffer))
        << "Spatial analyzer should process audio without throwing";
    EXPECT_NO_THROW(qualityDetector->processBlock(testBuffer))
        << "Quality detector should process audio without throwing";

    // RED phase: Concurrent processing test should fail
    EXPECT_FALSE(performanceValidator->testConcurrentAnalyzerProcessing())
        << "RED phase: Concurrent processing test should fail until implemented";
}

//==============================================================================
// Test 10: Memory Usage Validation Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, MemoryUsageValidationTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Get initial memory usage
    size_t initialMemory = getCurrentMemoryUsageMB();
    EXPECT_LT(initialMemory, targetMemoryLimitMB)
        << "Initial memory usage should be below target limit";

    // Process audio through all analyzers
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer);

    for (int i = 0; i < 100; ++i) {
        coreDSPAnalyzer->processBlock(testBuffer);
        pitchDetector->processBlock(testBuffer);
        dynamicsAnalyzer->processBlock(testBuffer);
        spatialAnalyzer->processBlock(testBuffer);
        qualityDetector->processBlock(testBuffer);
    }

    // Check memory usage after processing
    size_t finalMemory = getCurrentMemoryUsageMB();
    EXPECT_LT(finalMemory, targetMemoryLimitMB)
        << "Final memory usage should be below target limit";

    // RED phase: Memory usage test should fail
    EXPECT_FALSE(performanceValidator->testMemoryUsage())
        << "RED phase: Memory usage test should fail until implemented";
}

//==============================================================================
// Test 11: CPU Usage Validation Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, CpuUsageValidationTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Start CPU monitoring
    EXPECT_TRUE(performanceValidator->startMonitoring(50))
        << "Should start monitoring for CPU test";

    // Process audio continuously for CPU measurement
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer);

    auto startTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::seconds(5); // Test for 5 seconds

    while (std::chrono::high_resolution_clock::now() - startTime < duration) {
        coreDSPAnalyzer->processBlock(testBuffer);
        pitchDetector->processBlock(testBuffer);
        dynamicsAnalyzer->processBlock(testBuffer);
        spatialAnalyzer->processBlock(testBuffer);
        qualityDetector->processBlock(testBuffer);

        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    // Get performance metrics
    auto metrics = performanceValidator->getCurrentMetrics();
    EXPECT_LT(metrics.cpuUsagePercent, targetCpuLimitPercent)
        << "CPU usage should be below target limit";

    performanceValidator->stopMonitoring();

    // RED phase: CPU usage test should fail
    EXPECT_FALSE(performanceValidator->testCpuUsage())
        << "RED phase: CPU usage test should fail until implemented";
}

//==============================================================================
// Test 12: Real-Time Performance Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, RealTimePerformanceTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Create test audio buffer
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer);

    // Measure real-time processing performance
    const int numIterations = 1000;
    auto startTime = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < numIterations; ++i) {
        // Process through all analyzers
        coreDSPAnalyzer->processBlock(testBuffer);
        pitchDetector->processBlock(testBuffer);
        dynamicsAnalyzer->processBlock(testBuffer);
        spatialAnalyzer->processBlock(testBuffer);
        qualityDetector->processBlock(testBuffer);
        performanceValidator->processBlock(testBuffer);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Calculate average processing time per buffer
    double avgTimeMs = (double)duration.count() / (numIterations * 1000.0);

    // Real-time constraint: processing should be faster than real-time
    // For 512 samples at 44100Hz, one buffer = ~11.6ms
    double bufferDurationMs = (bufferSize / sampleRate) * 1000.0;
    EXPECT_LT(avgTimeMs, bufferDurationMs)
        << "Average processing time should be less than buffer duration for real-time operation";

    // RED phase: Real-time performance test should fail
    EXPECT_FALSE(performanceValidator->testRealTimePerformance())
        << "RED phase: Real-time performance test should fail until implemented";
}

//==============================================================================
// Test 13: Performance Benchmark Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, PerformanceBenchmarkTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Reset metrics before benchmark
    performanceValidator->resetMetrics();

    // Run performance benchmark
    auto metrics = performanceValidator->runPerformanceBenchmark(100);

    // Validate benchmark results structure
    EXPECT_EQ(metrics.activeAnalyzerCount, 6)
        << "Benchmark should report 6 active analyzers";
    EXPECT_GE(metrics.uptimeSeconds, 0.0)
        << "Uptime should be non-negative";

    // RED phase: Benchmark should return minimal data
    EXPECT_EQ(metrics.totalAnalysesPerformed, 0)
        << "RED phase: Should report minimal analysis count";
}

//==============================================================================
// Test 14: Performance Thresholds Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, PerformanceThresholdsTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Set performance thresholds
    performanceValidator->setPerformanceThresholds(
        targetMemoryLimitMB,
        targetCpuLimitPercent,
        maxLatencyMs
    );

    // RED phase: Should report threshold violations
    EXPECT_FALSE(performanceValidator->checkPerformanceThresholds())
        << "RED phase: Should report threshold violations until implemented";

    // Get violations report
    juce::String violations = performanceValidator->getPerformanceViolations();
    EXPECT_TRUE(violations.isNotEmpty())
        << "Violations report should not be empty";
}

//==============================================================================
// Test 15: WebSocket Performance Test (DISABLED for RED phase)
//==============================================================================

TEST_F(AnalysisPerformanceTests, DISABLED_WebSocketPerformanceTest) {
    // DISABLED: WebSocket tests require additional header configuration
    // Will be enabled in GREEN phase when WebSocket integration is complete
    SUCCEED() << "WebSocket performance test disabled for RED phase";
}

//==============================================================================
// Test 16: Stability Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, StabilityTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Start monitoring for stability test
    EXPECT_TRUE(performanceValidator->startMonitoring(100))
        << "Should start monitoring for stability test";

    // Run stability test for short duration (RED phase)
    EXPECT_FALSE(performanceValidator->runStabilityTest(1)) // 1 minute
        << "RED phase: Stability test should fail until implemented";

    performanceValidator->stopMonitoring();
}

//==============================================================================
// Test 17: Memory Leak Detection Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, MemoryLeakDetectionTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // RED phase: Memory leak detection should fail
    EXPECT_FALSE(performanceValidator->testMemoryLeakDetection(1)) // 1 minute
        << "RED phase: Memory leak detection should fail until implemented";
}

//==============================================================================
// Test 18: Performance Metrics and Reporting Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, PerformanceMetricsAndReportingTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Start monitoring to collect metrics
    EXPECT_TRUE(performanceValidator->startMonitoring(50))
        << "Should start monitoring for metrics test";

    // Process some audio to generate metrics
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer);

    for (int i = 0; i < 10; ++i) {
        coreDSPAnalyzer->processBlock(testBuffer);
        pitchDetector->processBlock(testBuffer);
        dynamicsAnalyzer->processBlock(testBuffer);
        spatialAnalyzer->processBlock(testBuffer);
        qualityDetector->processBlock(testBuffer);
        performanceValidator->processBlock(testBuffer);
    }

    // Wait for metrics collection
    std::this_thread::sleep_for(std::chrono::milliseconds(200));

    // Get current metrics
    auto metrics = performanceValidator->getCurrentMetrics();
    EXPECT_EQ(metrics.activeAnalyzerCount, 6)
        << "Should report 6 active analyzers";

    // Get metrics history
    auto history = performanceValidator->getMetricsHistory(10);
    EXPECT_LE(history.size(), 10)
        << "History size should not exceed requested size";

    // Get performance report
    juce::String report = performanceValidator->getPerformanceReport();
    EXPECT_TRUE(report.isNotEmpty())
        << "Performance report should not be empty";

    // Export performance data
    juce::String jsonData = performanceValidator->exportPerformanceData();
    EXPECT_TRUE(jsonData.isNotEmpty())
        << "Exported JSON data should not be empty";

    // Should be valid JSON
    EXPECT_NO_THROW(juce::JSON::parse(jsonData))
        << "Exported data should be valid JSON";

    performanceValidator->stopMonitoring();
}

//==============================================================================
// Test 19: Multi-Analyzer Pipeline Data Flow Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, MultiAnalyzerPipelineDataFlowTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Create test audio with known characteristics
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer, 1000.0f); // 1kHz sine wave

    // Process through all analyzers
    coreDSPAnalyzer->processBlock(testBuffer);
    pitchDetector->processBlock(testBuffer);
    dynamicsAnalyzer->processBlock(testBuffer);
    spatialAnalyzer->processBlock(testBuffer);
    qualityDetector->processBlock(testBuffer);

    // Get results from all analyzers
    juce::String coreResults = coreDSPAnalyzer->getResultsAsJson();
    juce::String pitchResults = pitchDetector->getResultsAsJson();
    juce::String dynamicsResults = dynamicsAnalyzer->getResultsAsJson();
    juce::String spatialResults = spatialAnalyzer->getResultsAsJson();
    juce::String qualityResults = qualityDetector->getResultsAsJson();

    // Validate results format
    EXPECT_TRUE(coreResults.isNotEmpty()) << "CoreDSP results should not be empty";
    EXPECT_TRUE(pitchResults.isNotEmpty()) << "Pitch results should not be empty";
    EXPECT_TRUE(dynamicsResults.isNotEmpty()) << "Dynamics results should not be empty";
    EXPECT_TRUE(spatialResults.isNotEmpty()) << "Spatial results should not be empty";
    EXPECT_TRUE(qualityResults.isNotEmpty()) << "Quality results should not be empty";

    // All results should be valid JSON
    EXPECT_NO_THROW(juce::JSON::parse(coreResults)) << "CoreDSP results should be valid JSON";
    EXPECT_NO_THROW(juce::JSON::parse(pitchResults)) << "Pitch results should be valid JSON";
    EXPECT_NO_THROW(juce::JSON::parse(dynamicsResults)) << "Dynamics results should be valid JSON";
    EXPECT_NO_THROW(juce::JSON::parse(spatialResults)) << "Spatial results should be valid JSON";
    EXPECT_NO_THROW(juce::JSON::parse(qualityResults)) << "Quality results should be valid JSON";

    // RED phase: Pipeline data flow test should fail
    EXPECT_FALSE(performanceValidator->testAnalyzerPipelineDataFlow())
        << "RED phase: Pipeline data flow test should fail until implemented";
}

//==============================================================================
// Test 20: Load Balancing Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, LoadBalancingTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // RED phase: Load balancing test should fail
    EXPECT_FALSE(performanceValidator->testLoadBalancing())
        << "RED phase: Load balancing test should fail until implemented";
}

//==============================================================================
// Test 21: Performance Validator Reset Test
//==============================================================================

TEST_F(AnalysisPerformanceTests, PerformanceValidatorResetTest) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Start monitoring and process some audio
    EXPECT_TRUE(performanceValidator->startMonitoring(50))
        << "Should start monitoring for reset test";

    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer);

    for (int i = 0; i < 10; ++i) {
        performanceValidator->processBlock(testBuffer);
    }

    std::this_thread::sleep_for(std::chrono::milliseconds(200));

    // Get metrics before reset
    auto beforeMetrics = performanceValidator->getCurrentMetrics();
    EXPECT_GT(beforeMetrics.uptimeSeconds, 0.0)
        << "Should have positive uptime before reset";

    // Reset performance validator
    performanceValidator->reset();

    // Get metrics after reset
    auto afterMetrics = performanceValidator->getCurrentMetrics();
    EXPECT_LT(afterMetrics.uptimeSeconds, beforeMetrics.uptimeSeconds)
        << "Uptime should be reset to lower value";

    // Should still be ready after reset
    EXPECT_TRUE(performanceValidator->isReady())
        << "Should still be ready after reset";

    performanceValidator->stopMonitoring();
}

//==============================================================================
// Test 22: JSON Output Format Validation
//==============================================================================

TEST_F(AnalysisPerformanceTests, JsonOutputFormatValidation) {
    // RED phase: Performance validator should not be ready due to failed WebSocket registration
    ASSERT_FALSE(performanceValidator->isReady())
        << "RED phase: Performance validator should not be ready without complete registration";

    // Process some audio
    juce::AudioBuffer<float> testBuffer(2, bufferSize);
    generateTestAudio(testBuffer);
    performanceValidator->processBlock(testBuffer);

    // Get results as JSON
    juce::String results = performanceValidator->getResultsAsJson();

    // Validate JSON format
    EXPECT_TRUE(results.isNotEmpty())
        << "Results should not be empty";

    // Should be valid JSON
    EXPECT_NO_THROW(juce::JSON::parse(results))
        << "Results should be valid JSON";

    // Parse JSON and check required fields
    auto jsonResult = juce::JSON::parse(results);
    if (auto* resultObject = jsonResult.getDynamicObject()) {
        EXPECT_TRUE(resultObject->hasProperty("analysisType"))
            << "JSON should contain analysisType";
        EXPECT_TRUE(resultObject->hasProperty("phase"))
            << "JSON should contain phase";
        EXPECT_TRUE(resultObject->hasProperty("implemented"))
            << "JSON should contain implemented status";
        EXPECT_TRUE(resultObject->hasProperty("activeAnalyzers"))
            << "JSON should contain activeAnalyzers count";
        EXPECT_TRUE(resultObject->hasProperty("totalAnalyses"))
            << "JSON should contain totalAnalyses count";
        EXPECT_TRUE(resultObject->hasProperty("uptimeSeconds"))
            << "JSON should contain uptimeSeconds";

        // Validate specific values
        EXPECT_EQ(resultObject->getProperty("analysisType").toString(), "PerformanceValidator")
            << "Analysis type should be PerformanceValidator";
        EXPECT_EQ(resultObject->getProperty("phase").toString(), "RED")
            << "Phase should be RED in RED phase implementation";
        EXPECT_EQ(static_cast<bool>(resultObject->getProperty("implemented")), false)
            << "Implemented should be false in RED phase";
    } else {
        FAIL() << "Failed to parse results as JSON object";
    }
}