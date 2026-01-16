#pragma once

#include <gtest/gtest.h>
#include <juce_core/juce_core.h>
#include <chrono>
#include <atomic>
#include <memory>
#include <vector>
#include <thread>
#include <future>
#include "../websocket/DAIDWebSocketServer.h"
#include "../websocket/StreamingSocketServer.h"
#include "../proto/daid.pb.h"

namespace DAID {
namespace Tests {

/**
 * Test fixtures for Real-time WebSocket Optimization Engine
 * These tests follow TDD RED phase - they MUST FAIL initially
 * and define clear performance requirements for implementation
 */

class RealtimeOptimizationTest : public ::testing::Test {
protected:
    void SetUp() override;
    void TearDown() override;

    // Test configuration with real-time requirements
    DAID::WebSocket::DAIDWebSocketServer::ServerConfig getRealtimeConfig() const;

    // Performance measurement utilities
    double measureOperationTime(std::function<void()> operation);
    std::vector<double> measureMultipleOperations(std::function<void()> operation, int iterations);

    std::unique_ptr<DAID::WebSocket::DAIDWebSocketServer> server;
    const std::string TEST_HOST = "127.0.0.1";
    const int BASE_PORT = 18080;
};

class WebSocketPerformanceTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;
    void TearDown() override;
};

class PatternGenerationOptimizationTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Pattern generation test data
    daid::RealtimeGenerateRequest createPatternRequest(int complexity = 1) const;
    daid::BatchProcessRequest createBatchRequest(int patternCount = 10) const;
};

class ConnectionManagementTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Connection simulation utilities
    struct MockClient {
        std::string id;
        std::unique_ptr<DAID::WebSocket::WebSocketConnection> connection;
        std::chrono::steady_clock::time_point connectTime;
        std::atomic<bool> isActive{true};
    };

    std::vector<std::unique_ptr<MockClient>> createMockClients(int count);
    void simulateClientActivity(MockClient* client, int messagesPerSecond, int durationSeconds);
};

class PerformanceMonitoringTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Metrics validation utilities
    void validateLatencyMetrics(const DAID::WebSocket::PerformanceMonitor::LatencyMetrics& metrics,
                               double maxAvgMs, double maxP95Ms) const;
    void validateThroughputMetrics(const DAID::WebSocket::PerformanceMonitor::ThroughputMetrics& metrics,
                                  double minOpsPerSecond) const;
};

class RealtimeCachingTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Cache testing utilities
    struct CacheEntry {
        std::string key;
        std::string value;
        std::chrono::steady_clock::time_point timestamp;
        int accessCount = 0;
    };

    std::vector<CacheEntry> generateCacheTestData(int size) const;
    void simulateCacheAccessPattern(const std::vector<std::string>& keys, int iterations);
};

class StreamingCapabilityTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Streaming test utilities
    daid::RealtimeGenerateRequest createStreamingRequest(int durationSeconds = 10) const;
    void validateStreamIntegrity(const std::vector<daid::PatternChunk>& chunks) const;
};

class ErrorHandlingTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Error simulation utilities
    void simulateNetworkLatency(std::chrono::milliseconds latency);
    void simulateConnectionDrop();
    void simulateResourceExhaustion();
};

class SecurityAuthenticationTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Security test utilities
    std::string generateValidAuthToken() const;
    std::string generateInvalidAuthToken() const;
    void simulateAuthenticationAttack(int attackType);
};

class ResourceManagementTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // Resource testing utilities
    void simulateMemoryPressure(size_t memoryUsageMB);
    void simulateCpuLoad(double targetCpuUsage, int durationSeconds);
    void validateResourceLimits() const;
};

class IntegrationWorkflowTest : public RealtimeOptimizationTest {
protected:
    void SetUp() override;

    // End-to-end workflow simulation
    void simulateRealWorldMusicalWorkflow();
    void simulateLivePerformanceScenario();
    void simulateStudioProductionScenario();
};

// Performance constants for real-time requirements
namespace PerformanceConstants {
    constexpr double SUB_MILLISECOND_THRESHOLD = 0.001;    // <1ms for pattern generation
    constexpr double P95_LATENCY_THRESHOLD = 0.005;        // <5ms 95th percentile
    constexpr double P99_LATENCY_THRESHOLD = 0.010;        // <10ms 99th percentile
    constexpr double CONNECTION_ESTABLISHMENT_THRESHOLD = 0.050; // <50ms
    constexpr double MIN_THROUGHPUT_OPS_PER_SECOND = 1000.0;
    constexpr int MAX_CONCURRENT_CONNECTIONS = 1000;
    constexpr double MAX_MEMORY_PER_CONNECTION_MB = 50.0;
    constexpr double MAX_ERROR_RATE_PERCENT = 0.1;
    constexpr int RATE_LIMIT_REQUESTS_PER_SECOND = 1000;
    constexpr int CACHE_TTL_SECONDS = 300; // 5 minutes
    constexpr double CACHE_HIT_RATE_TARGET = 0.85; // 85%
    constexpr int WORKER_THREAD_COUNT = 8;
    constexpr int TASK_QUEUE_SIZE = 10000;
    constexpr int MONITORING_INTERVAL_MS = 100;
    constexpr int AUTH_TIMEOUT_MS = 5000;
}

// Test helper classes
class PerformanceProfiler {
public:
    void startMeasurement();
    void endMeasurement();
    double getElapsedMs() const;
    void recordMeasurement(const std::string& operation, double timeMs);
    std::vector<double> getMeasurements(const std::string& operation) const;
    double getAverageTime(const std::string& operation) const;
    double getPercentile(const std::string& operation, double percentile) const;

private:
    std::chrono::high_resolution_clock::time_point startTime;
    std::unordered_map<std::string, std::vector<double>> measurements;
    mutable std::mutex measurementsMutex;
};

class LoadGenerator {
public:
    struct LoadProfile {
        int concurrentClients;
        int requestsPerSecond;
        int durationSeconds;
        double complexityFactor;
        bool enableStreaming;
    };

    void generateLoad(const LoadProfile& profile,
                     std::function<void(int clientId, int requestId)> requestGenerator);
    void stopLoad();
    std::vector<double> getResponseTimes() const;
    int getTotalRequests() const;
    int getSuccessfulRequests() const;

private:
    std::atomic<bool> shouldStop{false};
    std::vector<std::thread> clientThreads;
    std::vector<double> responseTimes;
    std::atomic<int> totalRequests{0};
    std::atomic<int> successfulRequests{0};
    mutable std::mutex dataMutex;
};

class MetricsValidator {
public:
    struct ValidationCriteria {
        double maxAverageLatency;
        double maxP95Latency;
        double maxP99Latency;
        double minThroughput;
        double maxErrorRate;
        double maxMemoryUsage;
        double maxCpuUsage;
    };

    bool validateMetrics(const daid::PerformanceMetrics& metrics,
                        const ValidationCriteria& criteria) const;
    std::vector<std::string> getValidationFailures(const daid::PerformanceMetrics& metrics,
                                                  const ValidationCriteria& criteria) const;

private:
    bool validateLatency(double value, double threshold) const;
    bool validateThroughput(double value, double threshold) const;
    bool validateResourceUsage(double value, double threshold) const;
};

} // namespace Tests
} // namespace DAID