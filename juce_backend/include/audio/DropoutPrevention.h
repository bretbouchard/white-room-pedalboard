#pragma once

#include "JuceHeader.h"
#include <memory>
#include <atomic>
#include <vector>
#include <mutex>
#include <chrono>

namespace SchillingerEcosystem {
namespace Audio {

/**
 * Advanced audio dropout prevention and buffer management system.
 *
 * This system provides:
 * - Advanced buffer management with overflow protection
 * - Audio glitch detection and reporting
 * - Automatic sample rate conversion for device compatibility
 * - Audio thread priority management
 * - Real-time dropout prediction and prevention
 * - Adaptive buffer sizing based on system performance
 *
 * Dropout Prevention Strategy:
 * - Monitor buffer levels in real-time
 * - Detect potential dropouts before they occur
 * - Automatically adapt buffer sizes to prevent audio artifacts
 * - Provide detailed analytics for optimization
 */
class DropoutPrevention
{
public:
    //==============================================================================
    // Buffer management strategies
    enum class BufferStrategy
    {
        Fixed,           // Fixed buffer size
        Adaptive,        // Adaptive based on load
        Predictive,      // Predictive adaptation
        Conservative     // Conservative approach prioritizing stability
    };

    // Dropout severity levels
    enum class DropoutLevel
    {
        None,            // No dropout detected
        Minor,           // Small audio glitch
        Moderate,        // Noticeable audio interruption
        Severe,          // Major dropout
        Critical         // Complete audio failure
    };

    // Priority levels for audio thread
    enum class ThreadPriority
    {
        Normal,
        High,
        RealTime,
        Critical
    };

    //==============================================================================
    struct BufferMetrics
    {
        double bufferLevel = 0.0;              // Current buffer level (0-1)
        double inputBufferLevel = 0.0;         // Input buffer level
        double outputBufferLevel = 0.0;        // Output buffer level
        double bufferGrowthRate = 0.0;         // Rate of buffer level change
        int totalBufferSize = 0;               // Total buffer size in samples
        int availableBufferSpace = 0;          // Available buffer space
        uint64_t underrunsDetected = 0;        // Buffer underrun count
        uint64_t overrunsDetected = 0;         // Buffer overrun count
        std::chrono::steady_clock::time_point lastUpdate;
    };

    struct DropoutEvent
    {
        DropoutLevel severity = DropoutLevel::None;
        double duration = 0.0;                 // Duration in milliseconds
        double timestamp = 0.0;                // Timestamp relative to session start
        juce::String description;              // Description of the dropout
        juce::String context;                  // Context when dropout occurred
        double bufferLevel = 0.0;              // Buffer level at dropout time
        double cpuUsage = 0.0;                 // CPU usage at dropout time
        bool wasPredicted = false;             // Whether dropout was predicted
        int samplesLost = 0;                   // Number of audio samples lost
    };

    struct PreventionConfig
    {
        BufferStrategy strategy = BufferStrategy::Adaptive;
        ThreadPriority threadPriority = ThreadPriority::RealTime;
        double targetBufferLevel = 0.7;        // Target buffer fill level (0-1)
        double criticalBufferLevel = 0.2;      // Critical buffer threshold
        double warningBufferLevel = 0.4;       // Warning buffer threshold
        int minBufferSize = 64;                // Minimum buffer size in samples
        int maxBufferSize = 8192;              // Maximum buffer size in samples
        int adaptationRate = 100;              // Buffer adaptation rate (ms)
        bool enablePrediction = true;          // Enable dropout prediction
        bool enableAutoRecovery = true;        // Enable automatic recovery
        double dropoutThreshold = 0.95;        // Dropout detection threshold
        int glitchDetectionWindow = 10;        // Window for glitch detection (samples)
    };

    //==============================================================================
    DropoutPrevention();
    explicit DropoutPrevention(const PreventionConfig& config);
    ~DropoutPrevention();

    //==============================================================================
    // Initialization and configuration
    bool initialize(const PreventionConfig& config);
    bool initialize(); // Overload with default config
    void shutdown();
    bool isInitialized() const;

    //==============================================================================
    // Real-time buffer management
    void updateBufferMetrics(int inputSamples, int outputSamples, int bufferSize);
    BufferMetrics getCurrentBufferMetrics() const;
    bool isBufferHealthy() const;
    bool isNearUnderrun() const;
    bool isNearOverrun() const;

    //==============================================================================
    // Dropout detection and prevention
    DropoutLevel detectDropout(const float* const* audioData, int numChannels, int numSamples);
    bool predictDropout() const;
    bool preventDropout();
    void handleDropout(DropoutLevel severity, const juce::String& context = "");

    //==============================================================================
    // Adaptive buffer management
    void adaptBufferSize(int currentLoad);
    int getOptimalBufferSize() const;
    bool shouldIncreaseBuffer() const;
    bool shouldDecreaseBuffer() const;
    void setBufferStrategy(BufferStrategy strategy);

    //==============================================================================
    // Thread priority management
    bool boostAudioThreadPriority();
    bool setAudioThreadPriority(ThreadPriority priority);
    ThreadPriority getCurrentThreadPriority() const;
    bool isRealTimePriorityEnabled() const;

    //==============================================================================
    // Sample rate conversion and compatibility
    bool enableSampleRateConversion(double inputRate, double outputRate);
    bool isSampleRateConversionEnabled() const;
    double getInputSampleRate() const;
    double getOutputSampleRate() const;
    void processSampleRateConversion(const float* input, float* output, int numSamples);

    //==============================================================================
    // Dropout event management
    std::vector<DropoutEvent> getDropoutHistory() const;
    DropoutEvent getLastDropout() const;
    void clearDropoutHistory();
    int getDropoutCount(DropoutLevel severity = DropoutLevel::Minor) const;
    double getTotalDropoutTime() const;

    //==============================================================================
    // Real-time monitoring interface
    class DropoutListener
    {
    public:
        virtual ~DropoutListener() = default;
        virtual void dropoutDetected(const DropoutEvent& event) = 0;
        virtual void dropoutPredicted(double probability, double timeToDropout) = 0;
        virtual void bufferLevelChanged(double newLevel) = 0;
        virtual void bufferAdapted(int oldSize, int newSize) = 0;
        virtual void priorityChanged(ThreadPriority oldPriority, ThreadPriority newPriority) = 0;
    };

    void addDropoutListener(DropoutListener* listener);
    void removeDropoutListener(DropoutListener* listener);

    //==============================================================================
    // Analytics and reporting
    struct Statistics
    {
        uint64_t totalDropouts = 0;
        double totalDropoutTime = 0.0;
        DropoutLevel worstDropout = DropoutLevel::None;
        double averageBufferLevel = 0.0;
        double minBufferLevel = 1.0;
        double maxBufferLevel = 0.0;
        uint64_t bufferUnderruns = 0;
        uint64_t bufferOverruns = 0;
        uint64_t adaptationsTriggered = 0;
        uint64_t predictionsMade = 0;
        uint64_t correctPredictions = 0;
        std::chrono::steady_clock::time_point startTime;
        std::chrono::steady_clock::time_point lastUpdate;
    };

    Statistics getStatistics() const;
    void resetStatistics();
    juce::String generatePerformanceReport() const;

    //==============================================================================
    // Advanced diagnostics
    struct DiagnosticInfo
    {
        bool systemStable = true;
        double systemStabilityScore = 0.0;
        bool realTimePriorityActive = false;
        bool sampleRateConversionActive = false;
        double currentLatencyMs = 0.0;
        int currentBufferSize = 0;
        double cpuUsage = 0.0;
        double memoryUsage = 0.0;
        int activeThreads = 0;
        juce::String audioDeviceName;
        juce::Array<juce::String> recommendations;
    };

    DiagnosticInfo getDiagnosticInfo() const;

private:
    //==============================================================================
    // Internal buffer management
    struct BufferState
    {
        std::atomic<double> inputLevel{0.0};
        std::atomic<double> outputLevel{0.0};
        std::atomic<int> currentSize{512};
        std::atomic<int> targetSize{512};
        std::atomic<uint64_t> underruns{0};
        std::atomic<uint64_t> overruns{0};
        std::vector<double> levelHistory;
        std::vector<std::chrono::steady_clock::time_point> timestamps;
        size_t maxHistorySize = 1000;
    };

    //==============================================================================
    // Core dropout prevention methods
    void updateBufferLevel(int inputSamples, int outputSamples, int bufferSize);
    void analyzeBufferTrends();
    void predictBufferExhaustion();
    void triggerBufferAdaptation();
    void performDropoutRecovery();

    // Audio glitch detection
    bool detectAudioGlitch(const float* const* audioData, int numChannels, int numSamples);
    static bool detectSilence(const float *audioData, int numSamples);
    static bool detectDistortion(const float *audioData, int numSamples);
    static bool detectPhaseInversion(const float *const *audioData,
                                     int numChannels, int numSamples);

    // Sample rate conversion
    bool initializeSampleRateConverter();
    void cleanupSampleRateConverter();
    void performSRC(const float* input, float* output, int numSamples);

    // Thread management
    bool setThreadPriority();
    void resetThreadPriority();
    static bool supportsRealTimePriority();

    // Dropout prediction algorithms
    double calculateDropoutProbability() const;
    double estimateTimeToDropout() const;
    void updatePredictionModel();

    //==============================================================================
    // Member variables
    PreventionConfig config_;
    BufferState bufferState_;
    std::atomic<BufferMetrics> currentMetrics_{};
    std::atomic<bool> initialized_{false};

    // Dropout tracking
    std::vector<DropoutEvent> dropoutHistory_;
    std::atomic<DropoutLevel> lastDropoutLevel_{DropoutLevel::None};
    mutable std::mutex dropoutHistoryMutex_;

    // Sample rate conversion
    std::atomic<bool> srcEnabled_{false};
    std::atomic<double> inputSampleRate_{44100.0};
    std::atomic<double> outputSampleRate_{44100.0};
    std::unique_ptr<juce::AudioBuffer<float>> srcBuffer_;
    std::unique_ptr<juce::LagrangeInterpolator> srcInterpolator_;

    // Thread management
    std::atomic<ThreadPriority> currentPriority_{ThreadPriority::Normal};
    std::atomic<bool> priorityBoosted_{false};

    // Statistics
    Statistics statistics_;
    mutable std::mutex statisticsMutex_;

    // Listener management
    juce::ListenerList<DropoutListener> dropoutListeners_;

    // Prediction model
    struct PredictionModel
    {
        std::vector<double> bufferLevels;
        std::vector<double> cpuUsages;
        std::vector<double> times;
        std::vector<bool> dropoutOccurred;
        double threshold = 0.3;
        double timeWindow = 5.0; // seconds
    };

    PredictionModel predictionModel_;
    std::atomic<double> dropoutProbability_{0.0};
    std::atomic<double> timeToDropout_{std::numeric_limits<double>::infinity()};

    // Performance monitoring
    std::chrono::steady_clock::time_point startTime_;
    std::atomic<uint64_t> audioCallbackCount_{0};
    std::atomic<double> totalProcessingTime_{0.0};

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DropoutPrevention)
};

//==============================================================================
// Utility functions for dropout prevention
namespace DropoutPreventionUtils
{
DropoutPrevention::BufferStrategy
getRecommendedStrategy(double cpuUsage, double systemStability);
DropoutPrevention::ThreadPriority getRecommendedPriority(double cpuUsage,
                                                         double audioLatency);
int calculateOptimalBufferSize(double cpuUsage, double sampleRate,
                               double targetLatency);
double calculateDropoutProbability(double bufferLevel, double cpuUsage,
                                   double rateOfChange);
bool isSystemStable(const DropoutPrevention::DiagnosticInfo &info);
juce::String getDropoutMessage(DropoutPrevention::DropoutLevel level);
juce::String
getBufferStrategyMessage(DropoutPrevention::BufferStrategy strategy);
}

} // namespace Audio
} // namespace SchillingerEcosystem