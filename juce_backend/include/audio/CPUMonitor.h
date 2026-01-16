#pragma once

#include "JuceHeader.h"
#include <atomic>
#include <chrono>
#include <memory>
#include <thread>
#include <vector>

namespace SchillingerEcosystem::Audio {

class CPUMonitor {
public:
    // Performance levels
    enum class PerformanceLevel {
        Excellent,
        Good,
        Warning,
        Critical,
        Overloaded
    };

    // Alert types
    enum class AlertType {
        None,
        Warning,
        Critical,
        Overload
    };

    // Performance profile
    struct PerformanceProfile {
        double targetLoad = 0.75;
        double warningThreshold = 0.80;
        double criticalThreshold = 0.90;
        double overloadThreshold = 0.95;
        int averagingWindowMs = 5000;
        int alertCooldownMs = 1000;
        bool enableCoreMonitoring = true;
    };

    // CPU metrics
    struct CPUMetrics {
        double currentUsage = 0.0;
        double audioThreadUsage = 0.0;
        double systemUsage = 0.0;
        double peakUsage = 0.0;
        double averageUsage = 0.0;
        PerformanceLevel level = PerformanceLevel::Excellent;
        AlertType alert = AlertType::None;
        int sampleCount = 0;
        double processingTime = 0.0;
        std::chrono::steady_clock::time_point lastUpdate;
    };

    // Core metrics
    struct CoreMetrics {
        int coreId = 0;
        double coreUsage = 0.0;
        bool active = false;
    };

    // Statistics
    struct Statistics {
        double meanUsage = 0.0;
        double stdDeviation = 0.0;
        double minUsage = 0.0;
        double maxUsage = 0.0;
        double currentUsage = 0.0;
        int totalSamples = 0;
        double totalTimeMs = 0.0;
        std::chrono::steady_clock::time_point startTime;
        std::chrono::steady_clock::time_point lastUpdate;
        int alertCount = 0;
        int warningCount = 0;
        int criticalCount = 0;
        int overloadCount = 0;
    };

    // Diagnostic info
    struct DiagnosticInfo {
        juce::String processorModel;
        double clockSpeedGHz = 0.0;
        int totalCores = 0;
        int activeCores = 0;
        double averageCoreUsage = 0.0;
        double maxCoreUsage = 0.0;
        bool supportsAVX = false;
        bool supportsAVX2 = false;
        bool supportsAVX512 = false;
        bool supportsNEON = false;
    };

    // Alert listener interface
    class AlertListener {
    public:
        virtual ~AlertListener() = default;
        virtual void cpuAlert(AlertType type, double usage, const juce::String& message) = 0;
        virtual void performanceLevelChanged(PerformanceLevel oldLevel, PerformanceLevel newLevel) {}
    };

    CPUMonitor();
    explicit CPUMonitor(const PerformanceProfile& profile);
    ~CPUMonitor();

    auto initialize() -> bool;
    auto initialize(const PerformanceProfile& profile) -> bool;
    void shutdown();
    auto isInitialized() -> bool;

    void startMonitoring();
    void stopMonitoring();
    void pauseMonitoring();
    void resumeMonitoring();
    auto isMonitoring() const -> bool;

    auto getCurrentMetrics() const -> CPUMetrics;
    auto getCoreMetrics() const -> std::vector<CoreMetrics>;
    auto getPerformanceLevel() const -> PerformanceLevel;
    auto getCurrentAlert() const -> AlertType;
    auto getCPUUsage() const -> double;
    auto getAudioThreadUsage() const -> double;

    void setProfile(const PerformanceProfile& profile);
    void setTargetLoad(double targetLoad);
    void setWarningThreshold(double threshold);
    void setCriticalThreshold(double threshold);
    void setOverloadThreshold(double threshold);

    void beginAudioProcessing();
    void endAudioProcessing(int samplesProcessed = 0);
    void reportProcessingTime(double timeMs);
    void reportProcessingTime(int samplesProcessed, double timeMs);

    void addAlertListener(AlertListener* listener);
    void removeAlertListener(AlertListener* listener);
    void removeAlertListeners();

    auto getStatistics() const -> Statistics;
    void resetStatistics();
    auto generatePerformanceReport() const -> juce::String;
    auto getDiagnosticInfo() const -> DiagnosticInfo;

private:
    void monitoringLoop();
    void updateMetrics();
    void detectPerformanceIssues();
    void checkAlerts();
    void triggerAlert(AlertType type, double usage, const juce::String& message);
    void clearAlert();
    void checkAlertCooldowns();
    void updateStatistics();
    void calculateStatistics();
    void updateCoreStatistics();

    auto calculateCPUUsage() -> double const;
    auto calculateAudioThreadUsage() -> double;
    auto calculateSystemUsage() -> double;
    auto calculateCoreMetrics() -> std::vector<CoreMetrics> const;
    auto getSystemCPUUsage() -> double;
    auto getProcessCPUUsage() -> double;
    auto getThreadCPUUsage() -> double;
    auto supportsPerCoreMonitoring() -> bool const;

    struct MonitoringState {
        bool running = false;
        bool paused = false;
        std::chrono::steady_clock::time_point startTime;
        std::chrono::steady_clock::time_point lastUpdate;
        std::thread monitoringThread;
    };

    struct History {
        static constexpr size_t maxSize = 1000;
        std::vector<double> usageHistory;
        std::vector<double> audioThreadHistory;
        std::vector<std::chrono::steady_clock::time_point> timestamps;
    };

    MonitoringState state_;
    PerformanceProfile profile_;
    CPUMetrics currentMetrics_;
    std::vector<CoreMetrics> coreMetrics_;
    Statistics statistics_;
    DiagnosticInfo diagnosticInfo_;
    History history_;

    mutable juce::CriticalSection metricsMutex_;
    mutable juce::CriticalSection coreMetricsMutex_;
    mutable juce::CriticalSection statisticsMutex_;

    juce::ListenerList<AlertListener> alertListeners_;
    std::atomic<AlertType> currentAlert_{AlertType::None};
    std::chrono::steady_clock::time_point lastAlertTime_;
    bool alertCooldownActive_ = false;

    std::atomic<bool> inAudioCallback_{false};
    std::chrono::high_resolution_clock::time_point processingStartTime_;
    std::atomic<int> processingCount_{0};
    std::atomic<double> totalProcessingTime_{0.0};
    std::atomic<double> peakProcessingTime_{0.0};
    std::atomic<int> samplesInCallback_{0};

    int totalCores_;
    bool coreMonitoringEnabled_ = true;
};

} // namespace SchillingerEcosystem::Audio