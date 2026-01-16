#pragma once

#include <JuceHeader.h>
#include <atomic>
#include <unordered_map>

namespace SchillingerEcosystem::Audio {

/**
 * @brief Per-channel CPU monitoring for audio engine
 *
 * Tracks CPU usage per execution lane to identify "hot" channels
 * and enforce budgets for real-time safety.
 *
 * Design:
 * - Lightweight tick counting (no heavy profiling)
 * - Debug build warnings only (no release overhead)
 * - Per-channel budgets configurable
 * - Integrates with existing CPUMonitor
 */
class ChannelCPUMonitor {
public:
    //==============================================================================
    // Channel CPU metrics
    //==============================================================================

    struct ChannelMetrics {
        int channelId = 0;
        uint64_t totalTicks = 0;        // Total ticks accumulated
        uint64_t sampleCount = 0;       // Number of samples processed
        double avgMicroseconds = 0.0;   // Average time per sample (µs)
        double cpuPercent = 0.0;        // Estimated CPU % (for this channel)
        bool overBudget = false;        // Exceeded budget?
        int budgetExceedCount = 0;      // How many times exceeded

        juce::String toString() const;
    };

    //==============================================================================
    // Channel budget configuration
    //==============================================================================

    struct ChannelBudget {
        int channelId = 0;
        double maxMicrosecondsPerSample = 0.0;  // Budget per sample
        double maxCpuPercent = 0.0;              // Max CPU for this channel
        juce::String role;                       // "drums", "vocals", etc.

        // Default budget: 5 µs per sample (~15% @ 48kHz stereo)
        ChannelBudget(int id = 0)
            : channelId(id)
            , maxMicrosecondsPerSample(5.0)
            , maxCpuPercent(15.0)
            , role("default") {}
    };

    //==============================================================================
    // CPU reporting interface
    //==============================================================================

    class CPUListener {
    public:
        virtual ~CPUListener() = default;

        /// Called when channel exceeds budget (debug builds only)
        virtual void channelOverBudget(int channelId, double actual, double budget) = 0;

        /// Called periodically with channel stats (debug builds only)
        virtual void channelReport(const ChannelMetrics& metrics) = 0;
    };

    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    ChannelCPUMonitor();
    ~ChannelCPUMonitor();

    //==============================================================================
    // Configuration
    //==============================================================================

    /**
     * @brief Set budget for a specific channel
     *
     * @param channelId Channel identifier
     * @param budget Budget configuration
     */
    void setChannelBudget(int channelId, const ChannelBudget& budget);

    /**
     * @brief Set default budget for all channels
     *
     * @param budget Default budget to apply
     */
    void setDefaultBudget(const ChannelBudget& budget);

    //==============================================================================
    // CPU Reporting (called from audio thread)
    //==============================================================================

    /**
     * @brief Report channel processing start
     *
     * Call this at the START of processBlock()
     *
     * @param channelId Channel identifier
     */
    void beginChannelProcessing(int channelId);

    /**
     * @brief Report channel processing end
     *
     * Call this at the END of processBlock()
     *
     * @param channelId Channel identifier
     * @param numSamples Number of samples processed
     */
    void endChannelProcessing(int channelId, int numSamples);

    /**
     * @brief Get metrics for a specific channel
     *
     * Thread-safe (uses internal mutex)
     *
     * @param channelId Channel identifier
     * @return Channel metrics (zero if channel not tracked)
     */
    ChannelMetrics getChannelMetrics(int channelId) const;

    /**
     * @brief Get all channel metrics
     *
     * Expensive: copies all metrics. Use sparingly.
     *
     * @return Vector of all channel metrics
     */
    std::vector<ChannelMetrics> getAllMetrics() const;

    //==============================================================================
    // Listener Management
    //==============================================================================

    void addListener(CPUListener* listener);
    void removeListener(CPUListener* listener);
    void clearListeners();

    //==============================================================================
    // Analysis
    //==============================================================================

    /**
     * @brief Get "hottest" channels (most CPU intensive)
     *
     * @param count Number of channels to return
     * @return List of channel IDs sorted by CPU usage (descending)
     */
    std::vector<int> getHottestChannels(int count = 5) const;

    /**
     * @brief Check if any channel is over budget
     *
     * @return true if any channel exceeded its budget
     */
    bool hasOverBudgetChannels() const;

    /**
     * @brief Generate debug report
     *
     * @return String with per-channel CPU breakdown
     */
    juce::String generateDebugReport() const;

    //==============================================================================
    // Reset
    //==============================================================================

    /**
     * @brief Reset all metrics
     *
     * Call this when starting a new session or performance test
     */
    void resetMetrics();

    /**
     * @brief Reset metrics for specific channel
     *
     * @param channelId Channel to reset
     */
    void resetChannelMetrics(int channelId);

    //==============================================================================
    // Idle Bypass Tracking (debug instrumentation)
    //==============================================================================

    /**
     * @brief Increment idle bypass counter for a channel
     *
     * Call this when channel short-circuits due to silence detection.
     * Debug builds only.
     *
     * @param channelId Channel that bypassed processing
     */
    void incrementIdleBypass(int channelId);

    /**
     * @brief Get idle bypass count for a channel
     *
     * @param channelId Channel identifier
     * @return Number of times channel bypassed processing
     */
    uint64_t getIdleBypassCount(int channelId) const;

    /**
     * @brief Get total idle bypass count across all channels
     *
     * @return Total number of idle bypass events
     */
    uint64_t getTotalIdleBypassCount() const;

private:
    //==============================================================================
    // Internal state
    //==============================================================================

    struct ChannelState {
        uint64_t startTicks = 0;          // Tick count at start
        uint64_t totalTicks = 0;          // Accumulated ticks
        uint64_t totalSamples = 0;         // Total samples processed
        int exceedCount = 0;               // Budget exceed count
        uint64_t idleBypassCount = 0;      // Idle short-circuit count (debug)
    };

    std::unordered_map<int, ChannelState> channels_;
    std::unordered_map<int, ChannelBudget> budgets_;
    ChannelBudget defaultBudget_;

    juce::ListenerList<CPUListener> listeners_;
    mutable juce::CriticalSection metricsLock_;

    //==============================================================================
    // Platform-specific tick counting
    //==============================================================================

    static inline uint64_t getTicks() noexcept;

    //==============================================================================
    // Helper methods
    //==============================================================================

    void checkBudget(int channelId, const ChannelState& state, double microseconds);
    double ticksToMicroseconds(uint64_t ticks) const noexcept;
    double calculateCpuPercent(double microseconds, int numSamples, double sampleRate) const noexcept;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ChannelCPUMonitor)
};

//==============================================================================
// Inline implementations (platform-specific)
//==============================================================================

#if JUCE_MAC
#include <mach/mach_time.h>

inline uint64_t ChannelCPUMonitor::getTicks() noexcept {
    return mach_absolute_time();
}
#elif JUCE_WINDOWS
#include <windows.h>

inline uint64_t ChannelCPUMonitor::getTicks() noexcept {
    LARGE_INTEGER ticks;
    QueryPerformanceCounter(&ticks);
    return static_cast<uint64_t>(ticks.QuadPart);
}
#else
#include <chrono>

inline uint64_t ChannelCPUMonitor::getTicks() noexcept {
    return std::chrono::high_resolution_clock::now().time_since_epoch().count();
}
#endif

} // namespace SchillingerEcosystem::Audio
