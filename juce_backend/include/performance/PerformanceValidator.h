#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include <juce_events/juce_events.h>
#include <memory>
#include <vector>
#include <atomic>
#include <chrono>
#include <thread>
#include <unordered_map>

// Forward declarations for all 6 analyzers
class BaseAnalyzer;
class CoreDSPAnalyzer;
class PitchDetector;
class DynamicsAnalyzer;
class SpatialAnalyzer;
class QualityDetector;
class AnalysisWebSocketHandler;

/**
 * Performance metrics structure for system monitoring
 */
struct PerformanceMetrics {
    // Memory usage metrics
    size_t totalMemoryUsageMB = 0;
    size_t peakMemoryUsageMB = 0;
    size_t analyzerMemoryUsage = 0;
    size_t websocketMemoryUsage = 0;

    // CPU usage metrics
    double cpuUsagePercent = 0.0;
    double averageProcessingTimeMs = 0.0;
    double peakProcessingTimeMs = 0.0;
    double realtimeAudioLatencyMs = 0.0;

    // Analyzer-specific metrics
    std::unordered_map<std::string, double> analyzerProcessingTimes;
    std::unordered_map<std::string, size_t> analyzerMemoryUsages;

    // System health metrics
    int activeAnalyzerCount = 0;
    int totalAnalysesPerformed = 0;
    int errorCount = 0;
    double uptimeSeconds = 0.0;

    // WebSocket metrics
    int connectedClients = 0;
    int messagesPerSecond = 0;
    size_t messageQueueSize = 0;

    // Timestamp
    juce::Time lastUpdate = juce::Time::getCurrentTime();

    // Audio processing parameters
    double sampleRate = 44100.0;
    int bufferSize = 512;
};

/**
 * System stress test configuration
 */
struct StressTestConfig {
    int durationSeconds = 60;           // Test duration
    int concurrentAnalyzers = 6;        // All analyzers running
    int audioBufferSamples = 512;       // Buffer size for processing
    double sampleRate = 44100.0;        // Audio sample rate
    int processingThreads = 4;          // Concurrent processing threads
    int targetMemoryLimitMB = 100;      // Memory usage limit
    double targetCpuLimitPercent = 20.0; // CPU usage limit
    int maxLatencyMs = 5;               // Maximum allowed latency
};

/**
 * Performance Validator for multi-analyzer audio analysis system
 *
 * This component provides comprehensive performance validation and monitoring
 * for the complete audio analysis pipeline including all 6 analyzers:
 * - CoreDSPAnalyzer: Spectral analysis
 * - PitchDetector: Pitch detection
 * - DynamicsAnalyzer: Dynamics and loudness analysis
 * - SpatialAnalyzer: Spatial audio analysis
 * - QualityDetector: Audio quality assessment
 * - AnalysisWebSocketHandler: Real-time result broadcasting
 *
 * Features:
 * - Real-time performance monitoring and validation
 * - Memory usage tracking and optimization
 * - CPU usage monitoring and alerting
 * - Multi-analyzer coordination testing
 * - System stress testing and load balancing
 * - Continuous operation stability testing
 * - Performance benchmarking and reporting
 * - Automated performance regression detection
 */
class PerformanceValidator : public juce::Thread
{
public:
    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    PerformanceValidator();
    ~PerformanceValidator() override;

    //==============================================================================
    // System Initialization and Configuration
    //==============================================================================

    /**
     * Initialize the performance validator with all 6 analyzers
     * @param sampleRate Audio sample rate for processing
     * @param bufferSize Audio buffer size for analysis
     * @return true if initialization successful
     */
    bool initialize(double sampleRate, int bufferSize);

    /**
     * Register all 6 analyzers for performance monitoring
     * @param coreDSP CoreDSP analyzer instance
     * @param pitch Pitch detector instance
     * @param dynamics Dynamics analyzer instance
     * @param spatial Spatial analyzer instance
     * @param quality Quality detector instance
     * @param websocket WebSocket handler instance
     * @return true if all analyzers registered successfully
     */
    bool registerAllAnalyzers(CoreDSPAnalyzer* coreDSP,
                             PitchDetector* pitch,
                             DynamicsAnalyzer* dynamics,
                             SpatialAnalyzer* spatial,
                             QualityDetector* quality,
                             AnalysisWebSocketHandler* websocket);

    /**
     * Start real-time performance monitoring
     * @param monitoringIntervalMs Update interval for performance metrics
     * @return true if monitoring started successfully
     */
    bool startMonitoring(int monitoringIntervalMs = 100);

    /**
     * Stop performance monitoring
     */
    void stopMonitoring();

    /**
     * Check if performance validator is ready for operation
     * @return true if ready
     */
    bool isReady() const;

    //==============================================================================
    // Performance Validation and Testing
    //==============================================================================

    /**
     * Run comprehensive system integration test
     * Tests all 6 analyzers working simultaneously
     * @return true if all integration tests pass
     */
    bool runSystemIntegrationTest();

    /**
     * Run system stress test with configurable parameters
     * @param config Stress test configuration
     * @return true if stress test passes all requirements
     */
    bool runStressTest(const StressTestConfig& config = {});

    /**
     * Run continuous operation stability test
     * Tests system stability over extended periods
     * @param durationMinutes Test duration in minutes
     * @return true if stability test passes
     */
    bool runStabilityTest(int durationMinutes = 30);

    /**
     * Validate system performance against requirements
     * @return true if system meets all performance requirements
     */
    bool validatePerformanceRequirements();

    /**
     * Run real-time performance benchmark
     * @param iterations Number of processing iterations to test
     * @return Performance metrics from benchmark
     */
    PerformanceMetrics runPerformanceBenchmark(int iterations = 1000);

    //==============================================================================
    // Multi-Analyzer Coordination Testing
    //==============================================================================

    /**
     * Test concurrent analyzer processing
     * Validates all 6 analyzers can process simultaneously without conflicts
     * @return true if concurrent processing works correctly
     */
    bool testConcurrentAnalyzerProcessing();

    /**
     * Test analyzer pipeline data flow
     * Validates data flows correctly through all analysis stages
     * @return true if data flow is correct
     */
    bool testAnalyzerPipelineDataFlow();

    /**
     * Test analyzer synchronization and coordination
     * Validates analyzers work together properly
     * @return true if synchronization works correctly
     */
    bool testAnalyzerSynchronization();

    /**
     * Test load balancing across multiple analyzers
     * @return true if load balancing is effective
     */
    bool testLoadBalancing();

    //==============================================================================
    // Memory and CPU Performance Testing
    //==============================================================================

    /**
     * Test memory usage under normal operation
     * Validates memory usage stays within limits
     * @return true if memory usage is acceptable
     */
    bool testMemoryUsage();

    /**
     * Test CPU usage under normal operation
     * Validates CPU usage stays within limits
     * @return true if CPU usage is acceptable
     */
    bool testCpuUsage();

    /**
     * Test memory leak detection
     * Runs extended test to detect memory leaks
     * @param durationMinutes Test duration
     * @return true if no memory leaks detected
     */
    bool testMemoryLeakDetection(int durationMinutes = 10);

    /**
     * Test performance under memory pressure
     * @param pressureLevelMB Memory pressure level in MB
     * @return true if system handles memory pressure gracefully
     */
    bool testMemoryPressureHandling(int pressureLevelMB = 80);

    //==============================================================================
    // Real-Time Performance Testing
    //==============================================================================

    /**
     * Test real-time audio processing performance
     * Validates system can process audio in real-time without dropouts
     * @return true if real-time performance is acceptable
     */
    bool testRealTimePerformance();

    /**
     * Test audio latency measurements
     * @return true if latency is within acceptable limits
     */
    bool testAudioLatency();

    /**
     * Test system response time under load
     * @return true if response times are acceptable
     */
    bool testSystemResponseTime();

    //==============================================================================
    // WebSocket Performance Testing
    //==============================================================================

    /**
     * Test WebSocket broadcasting performance
     * @param clientCount Number of simulated clients
     * @return true if WebSocket performance is acceptable
     */
    bool testWebSocketPerformance(int clientCount = 10);

    /**
     * Test message queue performance under load
     * @return true if message queue performance is acceptable
     */
    bool testMessageQueuePerformance();

    //==============================================================================
    // Performance Monitoring and Metrics
    //==============================================================================

    /**
     * Get current performance metrics
     * @return Current performance metrics
     */
    PerformanceMetrics getCurrentMetrics() const;

    /**
     * Get performance metrics history
     * @param historySize Number of historical data points to return
     * @return Vector of historical performance metrics
     */
    std::vector<PerformanceMetrics> getMetricsHistory(int historySize = 100) const;

    /**
     * Reset performance metrics
     */
    void resetMetrics();

    /**
     * Get performance summary report
     * @return Formatted performance report
     */
    juce::String getPerformanceReport() const;

    /**
     * Export performance data to JSON format
     * @return JSON string containing performance data
     */
    juce::String exportPerformanceData() const;

    //==============================================================================
    // Performance Thresholds and Alerting
    //==============================================================================

    /**
     * Set performance thresholds for alerting
     * @param maxMemoryMB Maximum memory usage in MB
     * @param maxCpuPercent Maximum CPU usage percentage
     * @param maxLatencyMs Maximum allowed latency in milliseconds
     */
    void setPerformanceThresholds(double maxMemoryMB, double maxCpuPercent, double maxLatencyMs);

    /**
     * Check if performance thresholds are exceeded
     * @return true if any thresholds are exceeded
     */
    bool checkPerformanceThresholds();

    /**
     * Get performance violations report
     * @return Report of current performance violations
     */
    juce::String getPerformanceViolations() const;

    //==============================================================================
    // BaseAnalyzer interface (for consistency)
    //==============================================================================

    /**
     * Process audio buffer through all analyzers and validate performance
     * @param buffer Audio buffer to process
     */
    void processBlock(juce::AudioBuffer<float>& buffer);

    /**
     * Get performance results as JSON
     * @return JSON string containing performance validation results
     */
    juce::String getResultsAsJson() const;

    /**
     * Reset performance validator state
     */
    void reset();

    /**
     * Get analysis type identifier
     * @return Performance validator type string
     */
    juce::String getAnalysisType() const;

private:
    //==============================================================================
    // Thread Implementation (for continuous monitoring)
    //==============================================================================

    void run() override;

    //==============================================================================
    // Timer and ChangeListener Implementation (DISABLED for RED phase)
    //==============================================================================

    // void timerCallback() override;    // DISABLED for RED phase
    // void changeListenerCallback(juce::ChangeBroadcaster* source) override; // DISABLED for RED phase

    //==============================================================================
    // Internal Helper Methods
    //==============================================================================

    // Performance monitoring
    void updatePerformanceMetrics();
    void measureMemoryUsage();
    void measureCpuUsage();
    void measureAnalyzerPerformance();
    void validateRealTimeConstraints();

    // Test utilities
    bool runTestWithTimeout(std::function<bool()> testFunction, int timeoutMs);
    void generateTestAudio(juce::AudioBuffer<float>& buffer, float frequency = 440.0f);
    void logPerformanceEvent(const juce::String& event, const juce::String& details = {});

    // Data collection and analysis
    void collectSystemMetrics();
    void analyzePerformanceTrends();
    void detectPerformanceRegressions();

    // Analyzer management
    void initializeAnalyzers();
    void validateAnalyzerStates();
    void coordinateAnalyzerProcessing();

    // Utility methods
    double getCurrentCpuUsage();
    size_t getCurrentMemoryUsage();
    double calculateAverageLatency();
    juce::String formatMetricsReport(const PerformanceMetrics& metrics) const;

    //==============================================================================
    // Member Variables
    //==============================================================================

    // Configuration
    double currentSampleRate = 44100.0;
    int currentBufferSize = 512;
    bool initialized = false;
    bool monitoringActive = false;

    // Analyzer instances (6 total analyzers)
    CoreDSPAnalyzer* coreDSPAnalyzer = nullptr;
    PitchDetector* pitchDetector = nullptr;
    DynamicsAnalyzer* dynamicsAnalyzer = nullptr;
    SpatialAnalyzer* spatialAnalyzer = nullptr;
    QualityDetector* qualityDetector = nullptr;
    AnalysisWebSocketHandler* websocketHandler = nullptr;

    std::vector<BaseAnalyzer*> registeredAnalyzers;
    juce::CriticalSection analyzersMutex;

    // Performance monitoring
    PerformanceMetrics currentMetrics;
    std::vector<PerformanceMetrics> metricsHistory;
    juce::CriticalSection metricsMutex;

    // Performance thresholds
    double maxMemoryThresholdMB = 100.0;
    double maxCpuThresholdPercent = 20.0;
    double maxLatencyThresholdMs = 5.0;

    // Monitoring control
    std::atomic<bool> shouldStopMonitoring{false};
    int monitoringIntervalMs = 100;

    // Test state
    bool testInProgress = false;
    juce::CriticalSection testMutex;

    // Timing and performance measurement
    std::chrono::high_resolution_clock::time_point startTime;
    std::vector<double> processingTimeHistory;

    // System resource tracking
    std::atomic<size_t> peakMemoryUsage{0};
    std::atomic<double> peakCpuUsage{0.0};
    std::atomic<uint64_t> totalAnalysesCount{0};
    std::atomic<uint64_t> errorCount{0};

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PerformanceValidator)
};