#include "audio/DropoutPrevention.h"
#include "juce_audio_basics/juce_audio_basics.h"
#include "juce_core/juce_core.h"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <limits>
#include <memory>
#include <mutex>
#include <pthread/pthread_impl.h>
#include <pthread/sched.h>
#include <vector>

#ifdef JUCE_WINDOWS
#include <windows.h>
#include <processthreadsapi.h>
#elif defined(JUCE_MAC)
#include <pthread.h>
#elif defined(JUCE_LINUX)
#include <pthread.h>
#include <sched.h>
#include <sys/resource.h>
#endif

namespace SchillingerEcosystem::Audio {

//==============================================================================
DropoutPrevention::DropoutPrevention()
{
    startTime_ = std::chrono::steady_clock::now();
    predictionModel_.timeWindow = 5.0; // 5 second prediction window
}

DropoutPrevention::DropoutPrevention(const PreventionConfig& config)
    : config_(config)
{
    startTime_ = std::chrono::steady_clock::now();
    predictionModel_.timeWindow = 5.0;
}

DropoutPrevention::~DropoutPrevention()
{
    shutdown();
}

//==============================================================================
bool DropoutPrevention::initialize(const PreventionConfig &config) {
  config_ = config;

  // Initialize buffer state
  bufferState_.currentSize.store(config.minBufferSize);
  bufferState_.targetSize.store(config.minBufferSize);

  // Initialize statistics
  statistics_ = Statistics{};
  statistics_.startTime = std::chrono::steady_clock::now();

  // Initialize sample rate converter if needed
  if (inputSampleRate_ != outputSampleRate_) {
    return initializeSampleRateConverter();
  }

  // Set initial thread priority
  setAudioThreadPriority(config.threadPriority);

  // Reserve space for history
  bufferState_.levelHistory.reserve(bufferState_.maxHistorySize);
  bufferState_.timestamps.reserve(bufferState_.maxHistorySize);
  dropoutHistory_.reserve(1000);

  initialized_.store(true);
  return true;
}

bool DropoutPrevention::initialize() {
  PreventionConfig defaultConfig;
  return initialize(defaultConfig);
}

void DropoutPrevention::shutdown()
{
  if (!initialized_.load()) {
    return;
  }

    initialized_.store(false);

    // Reset thread priority
    resetThreadPriority();

    // Cleanup sample rate converter
    cleanupSampleRateConverter();

    // Clear all data
    bufferState_.levelHistory.clear();
    bufferState_.timestamps.clear();
    dropoutHistory_.clear();

    // Clear listeners
    dropoutListeners_.clear();
}

bool DropoutPrevention::isInitialized() const {
  return initialized_.load();
}

//==============================================================================
void DropoutPrevention::updateBufferMetrics(int inputSamples, int outputSamples, int bufferSize)
{
  if (!initialized_.load()) {
    return;
  }

    updateBufferLevel(inputSamples, outputSamples, bufferSize);
    analyzeBufferTrends();

    if (config_.enablePrediction)
    {
        predictBufferExhaustion();
    }

    // Update statistics
    statistics_.lastUpdate = std::chrono::steady_clock::now();
}

DropoutPrevention::BufferMetrics DropoutPrevention::getCurrentBufferMetrics() const {
  BufferMetrics metrics;

  metrics.inputBufferLevel = bufferState_.inputLevel.load();
  metrics.outputBufferLevel = bufferState_.outputLevel.load();
  metrics.bufferLevel =
      (metrics.inputBufferLevel + metrics.outputBufferLevel) * 0.5;
  metrics.totalBufferSize = bufferState_.currentSize.load();
  metrics.availableBufferSpace =
      static_cast<int>(metrics.totalBufferSize * (1.0 - metrics.bufferLevel));
  metrics.underrunsDetected = bufferState_.underruns.load();
  metrics.overrunsDetected = bufferState_.overruns.load();
  metrics.lastUpdate = std::chrono::steady_clock::now();

  // Calculate buffer growth rate
  if (!bufferState_.levelHistory.empty()) {
    size_t const size = bufferState_.levelHistory.size();
    if (size >= 2) {
      double const recentChange = bufferState_.levelHistory[size - 1] -
                                  bufferState_.levelHistory[size - 2];
      metrics.bufferGrowthRate = recentChange * 1000.0; // Rate per second
    }
  }

  return metrics;
}

bool DropoutPrevention::isBufferHealthy() const {
  double const inputLevel = bufferState_.inputLevel.load();
  double const outputLevel = bufferState_.outputLevel.load();

  return inputLevel > config_.criticalBufferLevel && inputLevel < 0.95 &&
         outputLevel > config_.criticalBufferLevel && outputLevel < 0.95;
}

bool DropoutPrevention::isNearUnderrun() const {
  double const inputLevel = bufferState_.inputLevel.load();
  double const outputLevel = bufferState_.outputLevel.load();

  return inputLevel <= config_.criticalBufferLevel ||
         outputLevel <= config_.criticalBufferLevel;
}

bool DropoutPrevention::isNearOverrun() const {
  double const inputLevel = bufferState_.inputLevel.load();
  double const outputLevel = bufferState_.outputLevel.load();

  return inputLevel >= 0.95 || outputLevel >= 0.95;
}

//==============================================================================
DropoutPrevention::DropoutLevel DropoutPrevention::detectDropout(const float *const *audioData,
                                      int numChannels, int numSamples) {
  if (!initialized_.load() || (audioData == nullptr) || numSamples == 0) {
    return DropoutLevel::None;
  }

  DropoutLevel detectedLevel = DropoutLevel::None;

  // Check for audio glitches
  if (detectAudioGlitch(audioData, numChannels, numSamples)) {
    detectedLevel = std::max(detectedLevel, DropoutLevel::Minor);
  }

  // Check buffer levels
  if (isNearUnderrun()) {
    detectedLevel = std::max(detectedLevel, DropoutLevel::Moderate);
  }

  if (isNearOverrun()) {
    detectedLevel = std::max(detectedLevel, DropoutLevel::Moderate);
  }

  // Check for complete dropout
  bool totalSilence = true;
  for (int ch = 0; ch < numChannels && totalSilence; ++ch) {
    if (!detectSilence(audioData[ch], numSamples)) {
      totalSilence = false;
    }
  }

  if (totalSilence) {
    detectedLevel = std::max(detectedLevel, DropoutLevel::Severe);
  }

  // Handle detected dropout
  if (detectedLevel != DropoutLevel::None) {
    handleDropout(detectedLevel, "Real-time audio monitoring");
  }

  return detectedLevel;
}

bool DropoutPrevention::predictDropout() const {
  return dropoutProbability_.load() > config_.dropoutThreshold;
}

bool DropoutPrevention::preventDropout() {
  if (!initialized_.load()) {
    return false;
  }

  bool prevented = false;

  // Try to adapt buffer size
  if (shouldIncreaseBuffer()) {
    triggerBufferAdaptation();
    prevented = true;
  }

  // Try to boost thread priority
  if (!priorityBoosted_.load()) {
    prevented = boostAudioThreadPriority() || prevented;
  }

  return prevented;
}

void DropoutPrevention::handleDropout(DropoutLevel severity, const juce::String& context)
{
  if (!initialized_.load()) {
    return;
  }

    // Create dropout event
    DropoutEvent event;
    event.severity = severity;
    event.context = context;
    event.bufferLevel = (bufferState_.inputLevel.load() + bufferState_.outputLevel.load()) * 0.5;
    event.timestamp = std::chrono::duration<double>(
        std::chrono::steady_clock::now() - startTime_).count();
    event.wasPredicted = predictDropout();

    // Update statistics
    statistics_.totalDropouts++;
    statistics_.worstDropout = std::max(severity, statistics_.worstDropout);

    // Store in history
    {
      std::scoped_lock const lock(dropoutHistoryMutex_);
      dropoutHistory_.push_back(event);

      // Limit history size
      if (dropoutHistory_.size() > 1000) {
        dropoutHistory_.erase(dropoutHistory_.begin());
      }
    }

    // Notify listeners
    dropoutListeners_.call([&](DropoutListener &listener) -> void {
      listener.dropoutDetected(event);
    });

    // Attempt recovery if enabled
    if (config_.enableAutoRecovery)
    {
        performDropoutRecovery();
    }

    lastDropoutLevel_.store(severity);
}

//==============================================================================
void DropoutPrevention::adaptBufferSize(int /*currentLoad*/) {
  if (!initialized_.load()) {
    return;
  }

  int const currentSize = bufferState_.currentSize.load();
  int const newSize = getOptimalBufferSize();

  if (newSize != currentSize) {
    bufferState_.targetSize.store(newSize);
    triggerBufferAdaptation();
  }
}

int DropoutPrevention::getOptimalBufferSize() const {
  double const inputLevel = bufferState_.inputLevel.load();
  double const outputLevel = bufferState_.outputLevel.load();
  double const avgLevel = (inputLevel + outputLevel) * 0.5;

  int const currentSize = bufferState_.currentSize.load();

  if (config_.strategy == BufferStrategy::Fixed) {
    return currentSize;
  }

  if (config_.strategy == BufferStrategy::Conservative) {
    if (avgLevel < config_.criticalBufferLevel) {
      return std::min(currentSize * 2, config_.maxBufferSize);
    }
    return currentSize;
  }

  // Adaptive and predictive strategies
  if (shouldIncreaseBuffer()) {
    return std::min(currentSize * 2, config_.maxBufferSize);
  }
  if (shouldDecreaseBuffer()) {
    return std::max(currentSize / 2, config_.minBufferSize);
  }

  return currentSize;
}

bool DropoutPrevention::shouldIncreaseBuffer() const {
  return isNearUnderrun() ||
         (predictDropout() && dropoutProbability_.load() > 0.8);
}

bool DropoutPrevention::shouldDecreaseBuffer() const {
  double const inputLevel = bufferState_.inputLevel.load();
  double const outputLevel = bufferState_.outputLevel.load();
  double const avgLevel = (inputLevel + outputLevel) * 0.5;

  return avgLevel > 0.9 && !predictDropout();
}

void DropoutPrevention::setBufferStrategy(BufferStrategy strategy)
{
    config_.strategy = strategy;
}

//==============================================================================
bool DropoutPrevention::boostAudioThreadPriority() {
  if (!initialized_.load() || priorityBoosted_.load()) {
    return false;
  }

  ThreadPriority oldPriority = currentPriority_.load();

  if (setAudioThreadPriority(ThreadPriority::Critical)) {
    dropoutListeners_.call([&](DropoutListener &listener) -> void {
      listener.priorityChanged(oldPriority, ThreadPriority::Critical);
    });
    return true;
  }

  return false;
}

void DropoutPrevention::resetThreadPriority()
{
  if (!initialized_.load()) {
    return;
  }

    // Reset to normal priority
    setAudioThreadPriority(ThreadPriority::Normal);
    priorityBoosted_.store(false);
}

bool DropoutPrevention::setThreadPriority() {
  // This method seems to be a duplicate or alternative interface
  // For now, delegate to setAudioThreadPriority with current priority
  ThreadPriority const current = currentPriority_.load();
  return setAudioThreadPriority(current);
}

bool DropoutPrevention::supportsRealTimePriority() {
  // Check if the system supports real-time priority
#ifdef JUCE_WINDOWS
  return true; // Windows supports real-time priority
#elif defined(JUCE_MAC)
    return true;  // macOS supports real-time priority
#elif defined(JUCE_LINUX)
    return true;  // Linux supports real-time priority with proper permissions
#else
    return false; // Unknown platform
#endif
}

bool DropoutPrevention::setAudioThreadPriority(ThreadPriority priority) {
  if (!initialized_.load()) {
    return false;
  }

  ThreadPriority const oldPriority = currentPriority_.load();

#ifdef JUCE_WINDOWS
  DWORD windowsPriority = THREAD_PRIORITY_NORMAL;

  switch (priority) {
  case ThreadPriority::Normal:
    windowsPriority = THREAD_PRIORITY_NORMAL;
    break;
  case ThreadPriority::High:
    windowsPriority = THREAD_PRIORITY_ABOVE_NORMAL;
    break;
  case ThreadPriority::RealTime:
    windowsPriority = THREAD_PRIORITY_HIGHEST;
    break;
  case ThreadPriority::Critical:
    windowsPriority = THREAD_PRIORITY_TIME_CRITICAL;
    break;
  }

  HANDLE currentThread = GetCurrentThread();
  if (SetThreadPriority(currentThread, windowsPriority)) {
    currentPriority_.store(priority);
    priorityBoosted_.store(priority >= ThreadPriority::RealTime);
    return true;
  }

#elif defined(JUCE_MAC)
  struct sched_param param{};
  param.sched_priority = 47; // Default high priority for audio

  int const policy = SCHED_RR;

  switch (priority) {
  case ThreadPriority::Normal:
    param.sched_priority = 31;
    break;
  case ThreadPriority::High:
    param.sched_priority = 39;
    break;
  case ThreadPriority::RealTime:
    param.sched_priority = 47;
    break;
  case ThreadPriority::Critical:
    param.sched_priority = 63;
    break;
  }

    if (pthread_setschedparam(pthread_self(), policy, &param) == 0)
    {
        currentPriority_.store(priority);
        priorityBoosted_.store(priority >= ThreadPriority::RealTime);
        return true;
    }

#elif defined(JUCE_LINUX)
    struct sched_param param;
    int minPriority = sched_get_priority_min(SCHED_FIFO);
    int maxPriority = sched_get_priority_max(SCHED_FIFO);

    // Scale priority based on available range
    int range = maxPriority - minPriority;
    switch (priority)
    {
        case ThreadPriority::Normal:
            param.sched_priority = minPriority + range * 0.25;
            break;
        case ThreadPriority::High:
            param.sched_priority = minPriority + range * 0.5;
            break;
        case ThreadPriority::RealTime:
            param.sched_priority = minPriority + range * 0.75;
            break;
        case ThreadPriority::Critical:
            param.sched_priority = maxPriority;
            break;
    }

    if (sched_setscheduler(0, SCHED_FIFO, &param) == 0)
    {
        currentPriority_.store(priority);
        priorityBoosted_.store(priority >= ThreadPriority::RealTime);
        return true;
    }
#endif

    return false;
}

DropoutPrevention::ThreadPriority DropoutPrevention::getCurrentThreadPriority() const {
  return currentPriority_.load();
}

bool DropoutPrevention::isRealTimePriorityEnabled() const {
  return priorityBoosted_.load();
}

//==============================================================================
bool DropoutPrevention::enableSampleRateConversion(double inputRate,
                                                   double outputRate) {
  if (inputRate <= 0.0 || outputRate <= 0.0) {
    return false;
  }

  inputSampleRate_.store(inputRate);
  outputSampleRate_.store(outputRate);

  if (inputRate != outputRate) {
    return initializeSampleRateConverter();
  }

  cleanupSampleRateConverter();
  srcEnabled_.store(false);
  return true;
}

bool DropoutPrevention::isSampleRateConversionEnabled() const {
  return srcEnabled_.load();
}

double DropoutPrevention::getInputSampleRate() const {
  return inputSampleRate_.load();
}

double DropoutPrevention::getOutputSampleRate() const {
  return outputSampleRate_.load();
}

void DropoutPrevention::processSampleRateConversion(const float* input, float* output, int numSamples)
{
  // SECURITY FIX: Add comprehensive parameter validation to prevent buffer overflow
  constexpr int MAX_SAFE_SAMPLES = 32768;  // Maximum safe input sample count
  constexpr double MAX_SAFE_RATIO = 8.0;    // Maximum safe conversion ratio

  if (!srcEnabled_.load() || (input == nullptr) || (output == nullptr)) {
    if ((input != nullptr) && (output != nullptr) && numSamples > 0 && numSamples <= MAX_SAFE_SAMPLES) {
      // SECURITY FIX: Bounds checking before copy operation
      int safeCopyLength = std::min(numSamples, MAX_SAFE_SAMPLES);
      std::copy(input, input + safeCopyLength, output);
    }
    return;
  }

  // SECURITY FIX: Validate sample count and conversion ratio
  if (numSamples <= 0 || numSamples > MAX_SAFE_SAMPLES) {
    juce::Logger::writeToLog("DropoutPrevention::processSampleRateConversion - Invalid sample count: " + juce::String(numSamples));
    return;
  }

  // Validate conversion ratio is safe
  double const ratio = outputSampleRate_.load() / inputSampleRate_.load();
  if (ratio <= 0.0 || ratio > MAX_SAFE_RATIO) {
    juce::Logger::writeToLog("DropoutPrevention::processSampleRateConversion - Unsafe conversion ratio: " + juce::String(ratio));
    return;
  }

  // Calculate expected output size and validate it's safe
  int expectedOutputSamples = static_cast<int>(numSamples * ratio);
  if (expectedOutputSamples <= 0 || expectedOutputSamples > MAX_SAFE_SAMPLES * MAX_SAFE_RATIO) {
    juce::Logger::writeToLog("DropoutPrevention::processSampleRateConversion - Unsafe output size: " + juce::String(expectedOutputSamples));
    return;
  }

  performSRC(input, output, numSamples);
}

//==============================================================================
std::vector<DropoutPrevention::DropoutEvent> DropoutPrevention::getDropoutHistory() const {
  std::scoped_lock const lock(dropoutHistoryMutex_);
  return dropoutHistory_;
}

DropoutPrevention::DropoutEvent DropoutPrevention::getLastDropout() const {
  std::scoped_lock const lock(dropoutHistoryMutex_);
  if (dropoutHistory_.empty()) {
    return DropoutEvent{};
  }

  return dropoutHistory_.back();
}

void DropoutPrevention::clearDropoutHistory()
{
  std::scoped_lock const lock(dropoutHistoryMutex_);
  dropoutHistory_.clear();
}

int DropoutPrevention::getDropoutCount(DropoutLevel severity) const {
  std::scoped_lock const lock(dropoutHistoryMutex_);

  if (severity == DropoutLevel::Minor) {
    return static_cast<int>(dropoutHistory_.size());
  }

  int count = 0;
  for (const auto &event : dropoutHistory_) {
    if (event.severity >= severity) {
      count++;
    }
  }

  return count;
}

double DropoutPrevention::getTotalDropoutTime() const {
  std::scoped_lock const lock(dropoutHistoryMutex_);

  double totalTime = 0.0;
  for (const auto &event : dropoutHistory_) {
    totalTime += event.duration;
  }

  return totalTime;
}

//==============================================================================
void DropoutPrevention::addDropoutListener(DropoutListener* listener)
{
    dropoutListeners_.add(listener);
}

void DropoutPrevention::removeDropoutListener(DropoutListener* listener)
{
    dropoutListeners_.remove(listener);
}

//==============================================================================
DropoutPrevention::Statistics DropoutPrevention::getStatistics() const {
  std::scoped_lock const lock(statisticsMutex_);

  Statistics stats = statistics_;

  // Calculate average buffer level
  if (!bufferState_.levelHistory.empty()) {
    double sum = 0.0;
    for (double const level : bufferState_.levelHistory) {
      sum += level;
    }
    stats.averageBufferLevel = sum / bufferState_.levelHistory.size();
    stats.minBufferLevel = *std::min_element(bufferState_.levelHistory.begin(),
                                             bufferState_.levelHistory.end());
    stats.maxBufferLevel = *std::max_element(bufferState_.levelHistory.begin(),
                                             bufferState_.levelHistory.end());
  }

  stats.bufferUnderruns = bufferState_.underruns.load();
  stats.bufferOverruns = bufferState_.overruns.load();

  return stats;
}

void DropoutPrevention::resetStatistics()
{
  std::scoped_lock const lock(statisticsMutex_);

  statistics_ = Statistics{};
  statistics_.startTime = std::chrono::steady_clock::now();

  bufferState_.underruns.store(0);
  bufferState_.overruns.store(0);
  clearDropoutHistory();
}

juce::String DropoutPrevention::generatePerformanceReport() const {
  Statistics const stats = getStatistics();
  BufferMetrics const metrics = getCurrentBufferMetrics();

  juce::String report;
  report << "=== Dropout Prevention Performance Report ===\n";
  report << "Session Duration: "
         << std::chrono::duration<double>(std::chrono::steady_clock::now() -
                                          stats.startTime)
                .count()
         << " seconds\n";
  report << "Total Dropouts: " << stats.totalDropouts << "\n";
  report << "Total Dropout Time: " << stats.totalDropoutTime << " ms\n";
  report << "Worst Dropout Level: " << static_cast<int>(stats.worstDropout)
         << "\n";
  report << "Buffer Underruns: " << stats.bufferUnderruns << "\n";
  report << "Buffer Overruns: " << stats.bufferOverruns << "\n";
  report << "Average Buffer Level: "
         << juce::String(stats.averageBufferLevel * 100, 2) << "%\n";
  report << "Current Buffer Level: "
         << juce::String(metrics.bufferLevel * 100, 2) << "%\n";
  report << "Current Buffer Size: " << metrics.totalBufferSize << " samples\n";
  report << "Dropout Prediction Accuracy: ";

  if (stats.predictionsMade > 0) {
    double const accuracy =
        static_cast<double>(stats.correctPredictions) / stats.predictionsMade;
    report << juce::String(accuracy * 100, 2) << "%";
  } else {
    report << "N/A";
  }

  report << "\n";
  report << "Real-time Priority Enabled: "
         << (priorityBoosted_.load() ? "Yes" : "No") << "\n";
  report << "Sample Rate Conversion: " << (srcEnabled_.load() ? "Yes" : "No")
         << "\n";

  return report;
}

//==============================================================================
DropoutPrevention::DiagnosticInfo DropoutPrevention::getDiagnosticInfo() const {
  DiagnosticInfo info;

  Statistics const stats = getStatistics();
  BufferMetrics const metrics = getCurrentBufferMetrics();

  info.systemStable = isBufferHealthy() && !predictDropout();
  info.systemStabilityScore =
      info.systemStable ? 1.0 : dropoutProbability_.load();
  info.realTimePriorityActive = priorityBoosted_.load();
  info.sampleRateConversionActive = srcEnabled_.load();
  info.currentLatencyMs =
      (static_cast<double>(bufferState_.currentSize.load()) /
       outputSampleRate_.load()) *
      1000.0;
  info.currentBufferSize = bufferState_.currentSize.load();
  info.audioDeviceName =
      "Default Audio Device"; // Would be set from audio engine

  // Add recommendations
  if (!info.systemStable) {
    info.recommendations.add("Consider increasing buffer size");
    info.recommendations.add("Check system CPU usage");
  }

  if (!info.realTimePriorityActive) {
    info.recommendations.add("Enable real-time thread priority");
  }

  return info;
}

//==============================================================================
// Private methods implementation

void DropoutPrevention::updateBufferLevel(int inputSamples, int outputSamples, int bufferSize)
{
  if (bufferSize <= 0) {
    return;
  }

  double const inputChange = static_cast<double>(inputSamples) / bufferSize;
  double const outputChange = static_cast<double>(outputSamples) / bufferSize;

  double const currentInputLevel = bufferState_.inputLevel.load();
  double const currentOutputLevel = bufferState_.outputLevel.load();

  // Update buffer levels (simplified model)
  double const newInputLevel =
      juce::jlimit(0.0, 1.0, currentInputLevel - outputChange + inputChange);
  double const newOutputLevel =
      juce::jlimit(0.0, 1.0, currentOutputLevel - outputChange);

  bufferState_.inputLevel.store(newInputLevel);
  bufferState_.outputLevel.store(newOutputLevel);

  // Check for underruns/overruns
  if (newInputLevel <= 0.0 || newOutputLevel <= 0.0) {
    bufferState_.underruns.fetch_add(1);
  }

    if (newInputLevel >= 1.0 || newOutputLevel >= 1.0)
    {
        bufferState_.overruns.fetch_add(1);
    }

    // Update history
    auto now = std::chrono::steady_clock::now();
    bufferState_.levelHistory.push_back((newInputLevel + newOutputLevel) * 0.5);
    bufferState_.timestamps.push_back(now);

    // Limit history size
    if (bufferState_.levelHistory.size() > bufferState_.maxHistorySize)
    {
        bufferState_.levelHistory.erase(bufferState_.levelHistory.begin());
        bufferState_.timestamps.erase(bufferState_.timestamps.begin());
    }
}

void DropoutPrevention::analyzeBufferTrends()
{
  if (bufferState_.levelHistory.size() < 2) {
    return;
  }

    updatePredictionModel();
    dropoutProbability_.store(calculateDropoutProbability());
    timeToDropout_.store(estimateTimeToDropout());

    // Notify listeners of buffer level changes
    double currentLevel = (bufferState_.inputLevel.load() + bufferState_.outputLevel.load()) * 0.5;
    dropoutListeners_.call([&](DropoutListener &listener) -> void {
      listener.bufferLevelChanged(currentLevel);
    });
}

void DropoutPrevention::predictBufferExhaustion()
{
    if (dropoutProbability_.load() > config_.dropoutThreshold)
    {
      dropoutListeners_.call([&](DropoutListener &listener) -> void {
        listener.dropoutPredicted(dropoutProbability_.load(),
                                  timeToDropout_.load());
      });

      statistics_.predictionsMade++;

      // Check if prediction was correct (dropout actually occurred)
      if (isNearUnderrun() || isNearOverrun()) {
        statistics_.correctPredictions++;
      }
    }
}

void DropoutPrevention::triggerBufferAdaptation()
{
    int oldSize = bufferState_.currentSize.load();
    int targetSize = bufferState_.targetSize.load();

    if (targetSize != oldSize)
    {
        bufferState_.currentSize.store(targetSize);
        statistics_.adaptationsTriggered++;

        dropoutListeners_.call([&](DropoutListener &listener) -> void {
          listener.bufferAdapted(oldSize, targetSize);
        });
    }
}

void DropoutPrevention::performDropoutRecovery()
{
    // Boost thread priority
    boostAudioThreadPriority();

    // Adapt buffer size if needed
    adaptBufferSize(0); // 0 indicates recovery mode

    // Reset critical buffer levels
    bufferState_.inputLevel.store(config_.targetBufferLevel);
    bufferState_.outputLevel.store(config_.targetBufferLevel);
}

bool DropoutPrevention::detectAudioGlitch(const float *const *audioData,
                                          int numChannels, int numSamples) {
  if ((audioData == nullptr) || numChannels == 0 || numSamples == 0) {
    return false;
  }

  bool glitchDetected = false;

  for (int ch = 0; ch < numChannels; ++ch) {
    const float *channel = audioData[ch];

    // Check for silence
    if (detectSilence(channel, numSamples)) {
      glitchDetected = true;
      continue;
    }

    // Check for distortion
    if (detectDistortion(channel, numSamples)) {
      glitchDetected = true;
      continue;
    }
  }

  return glitchDetected;
}

bool DropoutPrevention::detectSilence(const float *audioData, int numSamples) {
  const float silenceThreshold = 1e-6F;

  for (int i = 0; i < numSamples; ++i) {
    if (std::abs(audioData[i]) > silenceThreshold) {
      return false;
    }
  }

  return true;
}

bool DropoutPrevention::detectDistortion(const float *audioData, int numSamples) {
  const float distortionThreshold = 0.99F;

  for (int i = 0; i < numSamples; ++i) {
    if (std::abs(audioData[i]) > distortionThreshold) {
      return true;
    }
  }

  return false;
}

bool DropoutPrevention::detectPhaseInversion(const float *const *audioData,
                                             int numChannels, int numSamples) {
  if (numChannels < 2) {
    return false;
  }

  // Simple phase inversion detection between first two channels
  for (int i = 0; i < numSamples; ++i) {
    float const correlation = audioData[0][i] * audioData[1][i];
    if (correlation < -0.9F) // Strong negative correlation
    {
      return true;
    }
  }

  return false;
}

bool DropoutPrevention::initializeSampleRateConverter()
{
  if (srcEnabled_.load()) {
    return true; // Already initialized
  }

  // SECURITY FIX: Validate input parameters and calculate safe buffer sizes
  constexpr int BASE_BUFFER_SIZE = 4096;  // Conservative base buffer size
  constexpr double MAX_SAFE_RATIO = 8.0;  // Maximum safe conversion ratio
  constexpr int MAX_SAFE_OUTPUT_SIZE = BASE_BUFFER_SIZE * 4;  // Maximum safe output size

  try {
    srcInterpolator_ = std::make_unique<juce::LagrangeInterpolator>();

    double const ratio = outputSampleRate_.load() / inputSampleRate_.load();

    // SECURITY FIX: Validate conversion ratio is safe
    if (ratio <= 0.0 || ratio > MAX_SAFE_RATIO) {
      juce::Logger::writeToLog("DropoutPrevention::initializeSampleRateConverter - Unsafe conversion ratio: " + juce::String(ratio));
      return false;
    }

    // SECURITY FIX: Calculate safe output buffer size with bounds checking
    int const maxOutputSize = static_cast<int>(BASE_BUFFER_SIZE * ratio);
    int const safeOutputSize = std::min(maxOutputSize, MAX_SAFE_OUTPUT_SIZE);

    // Validate calculated size is reasonable
    if (safeOutputSize <= 0 || safeOutputSize > MAX_SAFE_OUTPUT_SIZE) {
      juce::Logger::writeToLog("DropoutPrevention::initializeSampleRateConverter - Invalid buffer size: " + juce::String(safeOutputSize));
      return false;
    }

    srcBuffer_ = std::make_unique<juce::AudioBuffer<float>>(2, safeOutputSize);
    srcEnabled_.store(true);

    juce::Logger::writeToLog("DropoutPrevention::initializeSampleRateConverter - Initialized safely with buffer size: " + juce::String(safeOutputSize));
    return true;
  }
  catch (const std::exception& e) {
    juce::Logger::writeToLog("DropoutPrevention::initializeSampleRateConverter - Exception: " + juce::String(e.what()));
    return false;
  }
  catch (...) {
    juce::Logger::writeToLog("DropoutPrevention::initializeSampleRateConverter - Unknown exception occurred");
    return false;
  }
}

void DropoutPrevention::cleanupSampleRateConverter()
{
    srcEnabled_.store(false);
    srcInterpolator_ = nullptr;
    srcBuffer_.reset();
}

void DropoutPrevention::performSRC(const float* input, float* output, int numSamples)
{
    if (!srcInterpolator_ || !srcBuffer_)
    {
        std::copy(input, input + numSamples, output);
        return;
    }

    double const ratio = outputSampleRate_.load() / inputSampleRate_.load();
    int const outputSamples = static_cast<int>(numSamples * ratio);

    srcInterpolator_->process(ratio, input, output, outputSamples);
}

double DropoutPrevention::calculateDropoutProbability() const {
  double const inputLevel = bufferState_.inputLevel.load();
  double const outputLevel = bufferState_.outputLevel.load();
  double const avgLevel = (inputLevel + outputLevel) * 0.5;

  // Simple probability calculation based on buffer level and trends
  if (bufferState_.levelHistory.size() < 5) {
    return 0.0;
  }

  // Calculate trend
  double trend = 0.0;
  size_t const size = bufferState_.levelHistory.size();
  for (size_t i = size - 5; i < size - 1; ++i) {
    trend += bufferState_.levelHistory[i + 1] - bufferState_.levelHistory[i];
  }
  trend /= 4.0; // Average over last 4 changes

  // Higher probability if buffer level is low and decreasing
  double probability = 0.0;

  if (avgLevel < config_.criticalBufferLevel) {
    probability = 1.0 - (avgLevel / config_.criticalBufferLevel);
  } else if (trend < -0.01) // Decreasing
  {
    probability = juce::jlimit(0.0, 1.0, -trend * 10.0);
  }

  return probability;
}

double DropoutPrevention::estimateTimeToDropout() const {
  double const inputLevel = bufferState_.inputLevel.load();
  double const outputLevel = bufferState_.outputLevel.load();
  double const avgLevel = (inputLevel + outputLevel) * 0.5;

  if (bufferState_.levelHistory.size() < 2 ||
      avgLevel >= config_.criticalBufferLevel) {
    return std::numeric_limits<double>::infinity();
  }

  // Calculate rate of change
  double rateOfChange = 0.0;
  size_t const size = bufferState_.levelHistory.size();
  for (size_t i = size - 3; i < size - 1; ++i) {
    rateOfChange +=
        bufferState_.levelHistory[i + 1] - bufferState_.levelHistory[i];
  }
  rateOfChange /= 2.0;

  if (rateOfChange >= 0.0) {
    return std::numeric_limits<double>::infinity();
  }

  return (avgLevel - config_.criticalBufferLevel) / (-rateOfChange);
}

void DropoutPrevention::updatePredictionModel()
{
    // Update prediction model with current data
    double const currentLevel =
        (bufferState_.inputLevel.load() + bufferState_.outputLevel.load()) *
        0.5;

    predictionModel_.bufferLevels.push_back(currentLevel);
    predictionModel_.times.push_back(
        std::chrono::duration<double>(std::chrono::steady_clock::now() - startTime_).count());
    predictionModel_.dropoutOccurred.push_back(isNearUnderrun() || isNearOverrun());

    // Limit model size
    size_t const maxSize = 1000;
    if (predictionModel_.bufferLevels.size() > maxSize)
    {
        predictionModel_.bufferLevels.erase(predictionModel_.bufferLevels.begin());
        predictionModel_.times.erase(predictionModel_.times.begin());
        predictionModel_.dropoutOccurred.erase(predictionModel_.dropoutOccurred.begin());
    }
}

//==============================================================================
// Utility functions implementation

namespace DropoutPreventionUtils
{
    DropoutPrevention::BufferStrategy getRecommendedStrategy(double cpuUsage, double systemStability)
    {
      if (systemStability < 0.7 || cpuUsage > 0.8) {
        return DropoutPrevention::BufferStrategy::Conservative;
      }
      if (systemStability < 0.9 || cpuUsage > 0.6)
        return DropoutPrevention::BufferStrategy::Adaptive;
      else
        return DropoutPrevention::BufferStrategy::Predictive;
    }

    DropoutPrevention::ThreadPriority getRecommendedPriority(double cpuUsage, double audioLatency)
    {
      if (audioLatency > 10.0 || cpuUsage > 0.7) {
        return DropoutPrevention::ThreadPriority::Critical;
      }
      if (audioLatency > 5.0 || cpuUsage > 0.5)
        return DropoutPrevention::ThreadPriority::RealTime;
      else
        return DropoutPrevention::ThreadPriority::High;
    }

    int calculateOptimalBufferSize(double cpuUsage, double sampleRate,
                                    double targetLatency) {
      int const baseSize =
          static_cast<int>(targetLatency * sampleRate / 1000.0);

      if (cpuUsage > 0.8) {
        return baseSize * 4; // Increase buffer for high CPU usage
      }
      if (cpuUsage > 0.6)
        return baseSize * 2;
      else if (cpuUsage > 0.4)
        return baseSize;
      else
        return std::max(64, baseSize / 2); // Reduce buffer for low CPU usage
    }

    double calculateDropoutProbability(double bufferLevel, double cpuUsage,
                                     double rateOfChange) {
      double const levelRisk =
          bufferLevel < 0.3 ? (1.0 - (bufferLevel / 0.3)) : 0.0;
      double const cpuRisk = cpuUsage > 0.7 ? (cpuUsage - 0.7) / 0.3 : 0.0;
      double const trendRisk =
          rateOfChange < -0.01 ? -rateOfChange * 10.0 : 0.0;

      return juce::jlimit(0.0, 1.0, levelRisk + cpuRisk + trendRisk);
    }

    bool isSystemStable(const DropoutPrevention::DiagnosticInfo &info) {
      return info.systemStable && info.systemStabilityScore > 0.8 &&
             info.currentLatencyMs < 10.0;
    }

    juce::String getDropoutMessage(DropoutPrevention::DropoutLevel level) {
      switch (level) {
      case DropoutPrevention::DropoutLevel::None:
        return "No dropout detected";
      case DropoutPrevention::DropoutLevel::Minor:
        return "Minor audio glitch detected";
      case DropoutPrevention::DropoutLevel::Moderate:
        return "Moderate dropout - audio interruption";
      case DropoutPrevention::DropoutLevel::Severe:
        return "Severe dropout - significant audio loss";
      case DropoutPrevention::DropoutLevel::Critical:
        return "Critical dropout - complete audio failure";
      default:
        return "Unknown dropout level";
      }
    }

    juce::String getBufferStrategyMessage(DropoutPrevention::BufferStrategy strategy) {
      switch (strategy) {
      case DropoutPrevention::BufferStrategy::Fixed:
        return "Fixed buffer size";
      case DropoutPrevention::BufferStrategy::Adaptive:
        return "Adaptive buffer management";
      case DropoutPrevention::BufferStrategy::Predictive:
        return "Predictive buffer adaptation";
      case DropoutPrevention::BufferStrategy::Conservative:
        return "Conservative buffer strategy";
      default:
        return "Unknown buffer strategy";
      }
    }
}

} // namespace SchillingerEcosystem::Audio