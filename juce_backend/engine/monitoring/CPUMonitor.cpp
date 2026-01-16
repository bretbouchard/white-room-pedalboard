#include "audio/CPUMonitor.h"
#include "security/SafeBufferOperations.h"
#include "juce_core/juce_core.h"
#include "juce_core/system/juce_TargetPlatform.h"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <mutex>
#include <numeric>
#include <ratio>
#include <thread>
#include <vector>

#if JUCE_WINDOWS
#include <windows.h>
#include <psapi.h>
#elif JUCE_MAC
#include <sys/sysctl.h>
#elif JUCE_LINUX
#include <unistd.h>
#include <sys/sysinfo.h>
#include <proc/readproc.h>
#endif

namespace SchillingerEcosystem::Audio {

//==============================================================================
// CPU Monitor utility functions implementation
namespace CPUMonitorUtils
{
auto getPerformanceLevel(double cpuUsage,
                         const CPUMonitor::PerformanceProfile &profile)
    -> CPUMonitor::PerformanceLevel {
  if (cpuUsage < profile.warningThreshold) {
    return CPUMonitor::PerformanceLevel::Excellent;
  }
  if (cpuUsage < profile.criticalThreshold) {
    return CPUMonitor::PerformanceLevel::Good;
  }
  if (cpuUsage < profile.overloadThreshold) {
    return CPUMonitor::PerformanceLevel::Warning;
  }
  if (cpuUsage < 0.98) {
    return CPUMonitor::PerformanceLevel::Critical;
  }
  return CPUMonitor::PerformanceLevel::Overloaded;
}

auto getAlertType(double cpuUsage,
                  const CPUMonitor::PerformanceProfile &profile)
    -> CPUMonitor::AlertType {
  if (cpuUsage < profile.warningThreshold) {
    return CPUMonitor::AlertType::None;
  }
  if (cpuUsage < profile.criticalThreshold) {
    return CPUMonitor::AlertType::Warning;
  }
  if (cpuUsage < profile.overloadThreshold) {
    return CPUMonitor::AlertType::Critical;
  }
  return CPUMonitor::AlertType::Overload;
}

auto getPerformanceMessage(CPUMonitor::PerformanceLevel level) -> juce::String {
  switch (level) {
  case CPUMonitor::PerformanceLevel::Excellent:
    return "Excellent performance - CPU usage is optimal";
  case CPUMonitor::PerformanceLevel::Good:
    return "Good performance - CPU usage is acceptable";
  case CPUMonitor::PerformanceLevel::Warning:
    return "Warning - CPU usage is elevated, consider optimization";
  case CPUMonitor::PerformanceLevel::Critical:
    return "Critical - CPU usage is high, immediate action required";
  case CPUMonitor::PerformanceLevel::Overloaded:
    return "Overloaded - CPU usage is excessive, system may become unstable";
  default:
    return "Unknown performance level";
  }
}

auto getAlertMessage(CPUMonitor::AlertType alert, double usage)
    -> juce::String {
  switch (alert) {
  case CPUMonitor::AlertType::Warning:
    return "CPU usage warning: " + juce::String(usage * 100.0, 1) + "%";
  case CPUMonitor::AlertType::Critical:
    return "CPU usage critical: " + juce::String(usage * 100.0, 1) +
           "% - System may become unstable";
  case CPUMonitor::AlertType::Overload:
    return "CPU overload detected: " + juce::String(usage * 100.0, 1) +
           "% - Immediate action required";
  default:
    return "CPU usage: " + juce::String(usage * 100.0, 1) + "%";
  }
}

auto getTotalCores() -> int {
#if JUCE_WINDOWS
  SYSTEM_INFO sysInfo;
  GetSystemInfo(&sysInfo);
  return sysInfo.dwNumberOfProcessors;
#elif JUCE_MAC
  int numCPU = 0;
  size_t len = sizeof(numCPU);
  sysctlbyname("hw.ncpu", &numCPU, &len, nullptr, 0);
  return numCPU;
#elif JUCE_LINUX
  return std::thread::hardware_concurrency();
#else
  return std::thread::hardware_concurrency();
#endif
}

auto supportsHyperthreading() -> bool {
#if JUCE_WINDOWS
  SYSTEM_INFO sysInfo;
  GetSystemInfo(&sysInfo);
  return sysInfo.dwNumberOfProcessors > getTotalCores();
#elif JUCE_MAC
  size_t size = 0;
  sysctlbyname("hw.logicalcpu", nullptr, &size, nullptr, 0);
  return size > getTotalCores();
#else
  return false; // Linux requires complex detection
#endif
}

auto getProcessorModel() -> juce::String {
  using namespace SchillingerEcosystem::Security;

#if JUCE_WINDOWS
  // REFACTOR: Use SafeBufferOperations for secure string handling
  constexpr size_t MAX_PROCESSOR_NAME_LENGTH = 512;
  auto buffer = SafeBufferOperations::safeBufferAllocate<char>(MAX_PROCESSOR_NAME_LENGTH);
  DWORD size = static_cast<DWORD>(buffer.size());

  if (RegGetValueA(HKEY_LOCAL_MACHINE,
                   "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", NULL,
                   RRF_RT_REG_SZ, NULL, buffer.data(),
                   &size) == ERROR_SUCCESS) {
    // Use SafeBufferOperations for secure string creation
    return SafeBufferOperations::safeStringCopy(buffer.data(), MAX_PROCESSOR_NAME_LENGTH - 1);
  }
#elif JUCE_MAC
  // REFACTOR: Use SafeBufferOperations for secure string handling
  constexpr size_t MAX_CPU_BRAND_LENGTH = 512;
  auto buffer = SafeBufferOperations::safeBufferAllocate<char>(MAX_CPU_BRAND_LENGTH);
  size_t size = buffer.size();

  if (sysctlbyname("machdep.cpu.brand_string", buffer.data(), &size, nullptr, 0) == 0) {
    // Validate size using SafeBufferOperations
    if (SafeBufferOperations::validateSampleCount(static_cast<int>(size), static_cast<int>(buffer.size()))) {
      return SafeBufferOperations::safeStringCopy(buffer.data(), MAX_CPU_BRAND_LENGTH - 1);
    }
  }
#endif
  return SafeBufferOperations::safeStringCopy("Unknown Processor");
}

auto getProcessorClockSpeed() -> double {
#if JUCE_WINDOWS
  DWORD speedMHz = 0;
  DWORD size = sizeof(speedMHz);
  if (RegGetValueA(HKEY_LOCAL_MACHINE,
                   "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", "~MHz",
                   RRF_RT_REG_DWORD, NULL, (LPBYTE)&speedMHz,
                   (LPDWORD)&size) == ERROR_SUCCESS) {
    return speedMHz / 1000.0;
  }
#elif JUCE_MAC
  uint64_t freq = 0;
  size_t size = sizeof(freq);
  if (sysctlbyname("hw.cpufrequency", &freq, &size, nullptr, 0) == 0) {
    return freq / 1e9;
  }
#endif
        return 0.0;
}

auto supportsSIMDInstructions(const juce::String &instructionSet) -> bool {
  // This would require runtime detection
  // For now, assume modern processors support basic SIMD
  if (instructionSet == "SSE" || instructionSet == "AVX") {
    return true;
  }
  if (instructionSet == "NEON" && getProcessorModel().contains("ARM")) {
    return true;
  }
  return false;
}

auto getOptimalThreadCount() -> int {
  int const totalCores = getTotalCores();
  return std::max(1, totalCores - 1); // Reserve one core for system
}

auto getRecommendedCPULoad() -> double {
  return 0.75; // Recommended 75% CPU load for audio processing
}

auto getCPUAffinityMask() -> std::vector<int> {
  std::vector<int> mask;
  int const totalCores = getTotalCores();
  for (int i = 0; i < totalCores; ++i) {
    mask.push_back(i);
  }
  return mask;
}

auto setCPUAffinity(const std::vector<int> & /*coreMask*/) -> bool {
// Platform-specific CPU affinity setting
#if JUCE_WINDOWS
  DWORD_PTR maskValue = 0;
  for (int core : coreMask) {
    maskValue |= (1ULL << core);
  }
  return SetThreadAffinityMask(GetCurrentThread(), maskValue) != 0;
#elif JUCE_MAC || JUCE_LINUX
  // Use thread affinity API on macOS/Linux
  return true; // Simplified for now
#else
  return false;
#endif
}
}

//==============================================================================
CPUMonitor::CPUMonitor()
    : state_{}, totalCores_(CPUMonitorUtils::getTotalCores()) {

  coreMetrics_.resize(totalCores_);
  for (int i = 0; i < totalCores_; ++i) {
    coreMetrics_[i].coreId = i;
    coreMetrics_[i].coreUsage = 0.0;
    coreMetrics_[i].active = false;
  }
}

CPUMonitor::CPUMonitor(const PerformanceProfile& profile)
    : CPUMonitor()
{
    initialize(profile);
}

CPUMonitor::~CPUMonitor()
{
    shutdown();
}

auto CPUMonitor::initialize() -> bool {
  return initialize(PerformanceProfile{});
}

auto CPUMonitor::initialize(const PerformanceProfile &profile) -> bool {
  if (state_.running) {
    return false;
  }

  profile_ = profile;

  // Initialize core monitoring
  coreMonitoringEnabled_ = profile.enableCoreMonitoring;

  // Initialize statistics
  resetStatistics();

  // Update diagnostic info
  diagnosticInfo_.totalCores = totalCores_;
  diagnosticInfo_.processorModel = CPUMonitorUtils::getProcessorModel();
  diagnosticInfo_.clockSpeedGHz = CPUMonitorUtils::getProcessorClockSpeed();
  diagnosticInfo_.supportsAVX =
      CPUMonitorUtils::supportsSIMDInstructions("AVX");
  diagnosticInfo_.supportsAVX2 =
      CPUMonitorUtils::supportsSIMDInstructions("AVX2");
  diagnosticInfo_.supportsAVX512 =
      CPUMonitorUtils::supportsSIMDInstructions("AVX512");
  diagnosticInfo_.supportsNEON =
      CPUMonitorUtils::supportsSIMDInstructions("NEON");

  // Set initial metrics
  CPUMetrics initialMetrics;
  initialMetrics.currentUsage = 0.0;
  initialMetrics.systemUsage = getSystemCPUUsage();
  initialMetrics.level = PerformanceLevel::Excellent;
  initialMetrics.alert = AlertType::None;
  initialMetrics.lastUpdate = std::chrono::steady_clock::now();
  {
    juce::ScopedLock const lock(metricsMutex_);
    currentMetrics_ = initialMetrics;
  }

  state_.startTime = std::chrono::steady_clock::now();
  state_.lastUpdate = state_.startTime;

  return true;
}

void CPUMonitor::shutdown()
{
    if (state_.running)
    {
        stopMonitoring();
    }

    clearAlert();
    removeAlertListeners();
}

auto CPUMonitor::isInitialized() -> bool {
  return true; // Always initialized after construction
}

void CPUMonitor::startMonitoring()
{
  if (state_.running) {
    return;
  }

    state_.running = true;
    state_.paused = false;
    state_.lastUpdate = std::chrono::steady_clock::now();

    // Start monitoring thread
    state_.monitoringThread = std::thread(&CPUMonitor::monitoringLoop, this);
}

void CPUMonitor::stopMonitoring()
{
  if (!state_.running) {
    return;
  }

    state_.running = false;

    if (state_.monitoringThread.joinable())
    {
        state_.monitoringThread.join();
    }
}

void CPUMonitor::pauseMonitoring()
{
    state_.paused = true;
}

void CPUMonitor::resumeMonitoring()
{
    state_.paused = false;
}

auto CPUMonitor::isMonitoring() const -> bool {
  return state_.running && !state_.paused;
}

auto CPUMonitor::getCurrentMetrics() const -> CPUMonitor::CPUMetrics {
  juce::ScopedLock const lock(metricsMutex_);
  return currentMetrics_;
}

auto CPUMonitor::getCoreMetrics() const
    -> std::vector<CPUMonitor::CoreMetrics> {
  juce::ScopedLock const lock(coreMetricsMutex_);
  return coreMetrics_;
}

auto CPUMonitor::getPerformanceLevel() const -> CPUMonitor::PerformanceLevel {
  juce::ScopedLock const lock(metricsMutex_);
  return currentMetrics_.level;
}

auto CPUMonitor::getCurrentAlert() const -> CPUMonitor::AlertType {
  return currentAlert_.load();
}

auto CPUMonitor::getCPUUsage() const -> double {
  juce::ScopedLock const lock(metricsMutex_);
  return currentMetrics_.currentUsage;
}

auto CPUMonitor::getAudioThreadUsage() const -> double {
  juce::ScopedLock const lock(metricsMutex_);
  return currentMetrics_.audioThreadUsage;
}

void CPUMonitor::setProfile(const PerformanceProfile& profile)
{
    profile_ = profile;
    updateMetrics();
}

void CPUMonitor::setTargetLoad(double targetLoad)
{
    profile_.targetLoad = std::clamp(targetLoad, 0.1, 0.99);
}

void CPUMonitor::setWarningThreshold(double threshold)
{
    profile_.warningThreshold = std::clamp(threshold, 0.1, 0.99);
}

void CPUMonitor::setCriticalThreshold(double threshold)
{
    profile_.criticalThreshold = std::clamp(threshold, 0.1, 0.99);
}

void CPUMonitor::setOverloadThreshold(double threshold)
{
    profile_.overloadThreshold = std::clamp(threshold, 0.1, 0.99);
}

void CPUMonitor::beginAudioProcessing()
{
    processingStartTime_ = std::chrono::high_resolution_clock::now();
    inAudioCallback_ = true;
}

void CPUMonitor::endAudioProcessing(int samplesProcessed)
{
    if (inAudioCallback_)
    {
        auto endTime = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration<double, std::milli>(endTime - processingStartTime_).count();

        reportProcessingTime(samplesProcessed, duration);
        inAudioCallback_ = false;
    }
}

void CPUMonitor::reportProcessingTime(double timeMs)
{
    reportProcessingTime(0, timeMs);
}

void CPUMonitor::reportProcessingTime(int samplesProcessed, double timeMs)
{
    processingCount_++;
    totalProcessingTime_.store(totalProcessingTime_.load() + timeMs);
    peakProcessingTime_ = std::max(peakProcessingTime_.load(), timeMs);

    samplesInCallback_.store(samplesInCallback_.load() + samplesProcessed);
}

void CPUMonitor::addAlertListener(AlertListener* listener)
{
    alertListeners_.add(listener);
}

void CPUMonitor::removeAlertListener(AlertListener* listener)
{
    alertListeners_.remove(listener);
}

void CPUMonitor::removeAlertListeners()
{
    alertListeners_.clear();
}

auto CPUMonitor::getStatistics() const -> CPUMonitor::Statistics {
  juce::ScopedLock const lock(statisticsMutex_);
  return statistics_;
}

void CPUMonitor::resetStatistics()
{
  juce::ScopedLock const lock(statisticsMutex_);

  statistics_.meanUsage = 0.0;
  statistics_.stdDeviation = 0.0;
  statistics_.minUsage = 0.0;
  statistics_.maxUsage = 0.0;
  statistics_.totalSamples = 0;
  statistics_.totalTimeMs = 0.0;
  statistics_.startTime = std::chrono::steady_clock::now();
  statistics_.lastUpdate = std::chrono::steady_clock::now();
  statistics_.alertCount = 0;
  statistics_.warningCount = 0;
  statistics_.criticalCount = 0;
  statistics_.overloadCount = 0;
}

auto CPUMonitor::generatePerformanceReport() const -> juce::String {
  CPUMetrics const metrics = getCurrentMetrics();
  Statistics const stats = getStatistics();

  juce::String report;
  report << "=== CPU Performance Monitoring Report ===\n\n";

  report << "Current Performance:\n";
  report << "  CPU Usage: " << juce::String(metrics.currentUsage * 100.0, 1)
         << "%\n";
  report << "  Audio Thread: "
         << juce::String(metrics.audioThreadUsage * 100.0, 1) << "%\n";
  report << "  System Usage: " << juce::String(metrics.systemUsage * 100.0, 1)
         << "%\n";
  report << "  Performance Level: "
         << CPUMonitorUtils::getPerformanceMessage(metrics.level) << "\n\n";

  report << "Statistics (Monitoring Period: "
         << juce::String(stats.totalTimeMs / 1000.0, 1) << " seconds):\n";
  report << "  Mean Usage: " << juce::String(stats.meanUsage * 100.0, 1)
         << "%\n";
  report << "  Min/Max: " << juce::String(stats.minUsage * 100.0, 1) << "% / "
         << juce::String(stats.maxUsage * 100.0, 1) << "%\n";
  report << "  Samples Processed: " << stats.totalSamples << "\n\n";

  report << "Alerts:\n";
  report << "  Total Alerts: " << stats.alertCount << "\n";
  report << "  Warnings: " << stats.warningCount << "\n";
  report << "  Critical: " << stats.criticalCount << "\n";
  report << "  Overloads: " << stats.overloadCount << "\n\n";

  report << "Hardware Information:\n";
  report << "  Processor: " << diagnosticInfo_.processorModel << "\n";
  report << "  Clock Speed: " << juce::String(diagnosticInfo_.clockSpeedGHz, 2)
         << " GHz\n";
  report << "  Total Cores: " << diagnosticInfo_.totalCores << "\n";
  report << "  Active Cores: " << diagnosticInfo_.activeCores << "\n";
  report << "  Average Core Usage: "
         << juce::String(diagnosticInfo_.averageCoreUsage * 100.0, 1) << "%\n";
  report << "  Max Core Usage: "
         << juce::String(diagnosticInfo_.maxCoreUsage * 100.0, 1) << "%\n";
  report << "  SIMD Support: AVX="
         << (diagnosticInfo_.supportsAVX ? "Yes" : "No")
         << ", AVX2=" << (diagnosticInfo_.supportsAVX2 ? "Yes" : "No")
         << ", NEON=" << (diagnosticInfo_.supportsNEON ? "Yes" : "No") << "\n";

  return report;
}

auto CPUMonitor::getDiagnosticInfo() const -> CPUMonitor::DiagnosticInfo {
  return diagnosticInfo_;
}

void CPUMonitor::monitoringLoop()
{
    while (state_.running)
    {
        if (!state_.paused)
        {
            updateMetrics();
            detectPerformanceIssues();
            checkAlerts();
        }

        // Sleep for monitoring interval (10ms)
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}

void CPUMonitor::updateMetrics()
{
    CPUMetrics metrics;

    // Calculate current usage
    metrics.audioThreadUsage = calculateAudioThreadUsage();
    metrics.systemUsage = calculateSystemUsage();
    metrics.currentUsage = metrics.audioThreadUsage;  // Focus on audio thread
    metrics.sampleCount = samplesInCallback_.load();
    metrics.processingTime = totalProcessingTime_.load();

    // Update peak usage
    CPUMetrics current;
    {
      juce::ScopedLock const lock(metricsMutex_);
      current = currentMetrics_;
    }
    metrics.peakUsage = std::max(current.peakUsage, metrics.currentUsage);

    // Calculate average over time window
    if (!history_.timestamps.empty())
    {
        auto now = std::chrono::steady_clock::now();
        auto cutoff = now - std::chrono::milliseconds(profile_.averagingWindowMs);

        // Remove old samples
        while (!history_.timestamps.empty() && history_.timestamps.front() < cutoff)
        {
            history_.usageHistory.erase(history_.usageHistory.begin());
            history_.audioThreadHistory.erase(history_.audioThreadHistory.begin());
            history_.timestamps.erase(history_.timestamps.begin());
        }
    }

    // Add current sample
    history_.usageHistory.push_back(metrics.currentUsage);
    history_.audioThreadHistory.push_back(metrics.audioThreadUsage);
    history_.timestamps.push_back(std::chrono::steady_clock::now());

    // Limit history size
    while (history_.timestamps.size() > history_.maxSize)
    {
        history_.usageHistory.erase(history_.usageHistory.begin());
        history_.audioThreadHistory.erase(history_.audioThreadHistory.begin());
        history_.timestamps.erase(history_.timestamps.begin());
    }

    // Calculate average
    if (!history_.usageHistory.empty())
    {
      double const sum = std::accumulate(history_.usageHistory.begin(),
                                         history_.usageHistory.end(), 0.0);
      metrics.averageUsage = sum / history_.usageHistory.size();
    }

    // Determine performance level and alert
    metrics.level = CPUMonitorUtils::getPerformanceLevel(metrics.currentUsage, profile_);
    metrics.alert = CPUMonitorUtils::getAlertType(metrics.currentUsage, profile_);
    metrics.lastUpdate = std::chrono::steady_clock::now();

    // Update metrics with mutex protection
    {
      juce::ScopedLock const lock(metricsMutex_);
      currentMetrics_ = metrics;
    }

    state_.lastUpdate = std::chrono::steady_clock::now();
}

void CPUMonitor::detectPerformanceIssues()
{
    CPUMetrics metrics;
    {
      juce::ScopedLock const lock(metricsMutex_);
      metrics = currentMetrics_;
    }

    // Check for audio thread overloading
    if (metrics.audioThreadUsage > profile_.overloadThreshold)
    {
        triggerAlert(AlertType::Overload, metrics.audioThreadUsage,
                    "Audio thread overload detected - immediate optimization required");
    }

    // Check for performance degradation
    if (metrics.level == PerformanceLevel::Warning || metrics.level == PerformanceLevel::Critical)
    {
        // Notify performance level change if different from previous
        CPUMetrics previous;
        {
          juce::ScopedLock const lock(metricsMutex_);
          previous = currentMetrics_;
        }
        if (previous.level != metrics.level)
        {
            // Use modern JUCE ListenerList iteration pattern
            alertListeners_.call([previous, metrics](AlertListener& listener) {
                listener.performanceLevelChanged(previous.level, metrics.level);
            });
        }
    }
}

void CPUMonitor::checkAlerts()
{
    CPUMetrics metrics;
    {
      juce::ScopedLock const lock(metricsMutex_);
      metrics = currentMetrics_;
    }
    AlertType const newAlert = metrics.alert;

    // Check if alert has changed
    AlertType const currentAlert = currentAlert_.load();
    if (newAlert != currentAlert)
    {
        if (newAlert != AlertType::None)
        {
          juce::String const message =
              CPUMonitorUtils::getAlertMessage(newAlert, metrics.currentUsage);
          triggerAlert(newAlert, metrics.currentUsage, message);
        }
        else
        {
            clearAlert();
        }
    }
}

auto CPUMonitor::calculateCPUUsage() -> double const {
  return getAudioThreadUsage();
}

auto CPUMonitor::calculateAudioThreadUsage() -> double {
  if (processingCount_.load() == 0) {
    return 0.0;
  }

  double const totalTime = totalProcessingTime_.load();
  double const averageTime = totalTime / processingCount_.load();

  // Estimate CPU usage based on processing time vs. buffer duration
  // This is a simplified calculation - real implementation would be more
  // accurate
  return std::min(1.0, averageTime / 10.0);
}

auto CPUMonitor::calculateSystemUsage() -> double {
  return getSystemCPUUsage();
}

auto CPUMonitor::calculateCoreMetrics()
    -> std::vector<CPUMonitor::CoreMetrics> const {
  std::vector<CoreMetrics> coreMetrics;

  // Simplified core monitoring - would implement per-core CPU monitoring
  for (int i = 0; i < totalCores_; ++i) {
    CoreMetrics metric;
    metric.coreId = i;
    metric.coreUsage = 0.0; // Would calculate per-core usage
    metric.active = false;  // Would detect if core is active
    coreMetrics.push_back(metric);
  }

  return coreMetrics;
}

auto CPUMonitor::getSystemCPUUsage() -> double {
#if JUCE_WINDOWS
    FILETIME idleTime, kernelTime, userTime;
    if (GetSystemTimes(&idleTime, &kernelTime, &userTime))
    {
        ULARGE_INTEGER idle, kernel, user;
        idle.LowPart = idleTime.dwLowDateTime;
        idle.HighPart = idleTime.dwHighDateTime;
        kernel.LowPart = kernelTime.dwLowDateTime;
        kernel.HighPart = kernelTime.dwHighDateTime;
        user.LowPart = userTime.dwLowDateTime;
        user.HighPart = userTime.dwHighDateTime;

        ULARGE_INTEGER total = idle + kernel + user;
        ULARGE_INTEGER busy = kernel + user;

        return static_cast<double>(busy.QuadPart) / static_cast<double>(total.QuadPart);
    }
#elif JUCE_MAC || JUCE_LINUX
    // Use system monitoring APIs on macOS/Linux
    // For now, return 0 (would implement proper monitoring)
    return 0.0;
#else
    return 0.0;
#endif
}

auto CPUMonitor::getProcessCPUUsage() -> double {
  // Would implement process-specific CPU monitoring
  return 0.0;
}

auto CPUMonitor::getThreadCPUUsage() -> double {
  // Would implement thread-specific CPU monitoring
  return 0.0;
}

auto CPUMonitor::supportsPerCoreMonitoring() -> bool const {
  return totalCores_ > 1; // Simplified check
}

void CPUMonitor::triggerAlert(AlertType type, double usage, const juce::String& message)
{
    currentAlert_ = type;
    lastAlertTime_ = std::chrono::steady_clock::now();
    alertCooldownActive_ = true;

    // Notify all listeners using modern JUCE ListenerList pattern
    alertListeners_.call([type, usage, message](AlertListener& listener) {
        listener.cpuAlert(type, usage, message);
    });

    // Update alert counts
    switch (type)
    {
        case AlertType::Warning:
            statistics_.warningCount++;
            break;
        case AlertType::Critical:
            statistics_.criticalCount++;
            break;
        case AlertType::Overload:
            statistics_.overloadCount++;
            break;
        default:
            break;
    }

    statistics_.alertCount++;
}

void CPUMonitor::clearAlert()
{
    currentAlert_ = AlertType::None;
    alertCooldownActive_ = false;
}

void CPUMonitor::checkAlertCooldowns()
{
    if (alertCooldownActive_)
    {
        auto now = std::chrono::steady_clock::now();
        auto timeSinceLastAlert = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastAlertTime_).count();

        if (timeSinceLastAlert >= profile_.alertCooldownMs)
        {
            alertCooldownActive_ = false;
        }
    }
}

void CPUMonitor::updateStatistics()
{
  juce::ScopedLock const lock(statisticsMutex_);

  CPUMetrics metrics;
  {
    juce::ScopedLock const metricsLock(metricsMutex_);
    metrics = currentMetrics_;
  }

    // Update basic statistics
    statistics_.currentUsage = metrics.currentUsage;
    statistics_.lastUpdate = std::chrono::steady_clock::now();

    // Update history-based statistics
    if (!history_.usageHistory.empty())
    {
      double const sum = std::accumulate(history_.usageHistory.begin(),
                                         history_.usageHistory.end(), 0.0);
      statistics_.meanUsage = sum / history_.usageHistory.size();

      // Calculate min/max
      auto minmax = std::minmax_element(history_.usageHistory.begin(),
                                        history_.usageHistory.end());
      statistics_.minUsage = *minmax.first;
      statistics_.maxUsage = *minmax.second;

      // Calculate standard deviation
      double variance = 0.0;
      for (double const usage : history_.usageHistory) {
        variance += std::pow(usage - statistics_.meanUsage, 2);
      }
        statistics_.stdDeviation = std::sqrt(variance / history_.usageHistory.size());
    }

    // Update processing statistics
    statistics_.totalSamples = metrics.sampleCount;
    statistics_.totalTimeMs = metrics.processingTime;
}

void CPUMonitor::calculateStatistics()
{
    updateStatistics();
}

void CPUMonitor::updateCoreStatistics()
{
  juce::ScopedLock const lock(coreMetricsMutex_);

  // Update core-specific statistics
  double totalUsage = 0.0;
  int activeCores = 0;
  double maxUsage = 0.0;

  for (const auto &core : coreMetrics_) {
    totalUsage += core.coreUsage;
    if (core.active) {
      activeCores++;
    }
    maxUsage = std::max(maxUsage, core.coreUsage);
  }

    diagnosticInfo_.averageCoreUsage = totalCores_ > 0 ? totalUsage / totalCores_ : 0.0;
    diagnosticInfo_.activeCores = activeCores;
    diagnosticInfo_.maxCoreUsage = maxUsage;
}

} // namespace SchillingerEcosystem::Audio
