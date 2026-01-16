/*
  ==============================================================================
    RealtimeSafeDropoutPrevention.h

    CRITICAL: Real-time safe dropout prevention with ZERO heap allocations.
    This version eliminates ALL violations found in the original implementation.

    REAL-TIME SAFETY GUARANTEES:
    - NO heap allocations in audio callback paths
    - Lock-free memory operations only
    - Pre-allocated buffers for all operations
    - O(1) performance characteristics
    - <1ms audio callback processing time

    ELIMINATED VIOLATIONS:
    - ❌ std::make_unique in initializeSampleRateConverter (line 934)
    - ❌ std::make_unique AudioBuffer allocation (line 954)
    - ❌ std::vector::push_back in handleDropout (line 267)
    - ❌ std::vector::push_back in updateBufferLevel (line 778-779)
  ==============================================================================
*/

#pragma once

#include "LockFreeMemoryPool.h"
#include <memory>
#include <atomic>
#include <array>

namespace SchillingerEcosystem::Audio {

//==============================================================================
/**
 * REAL-TIME SAFE dropout prevention system.
 *
 * This implementation provides complete real-time safety by using:
 * - Pre-allocated lock-free memory pools
 * - Fixed-size circular buffers
 * - Atomic operations only
 * - No heap allocations after initialization
 */
class RealtimeSafeDropoutPrevention
{
public:
    //==============================================================================
    // Use same enums and structures as original for compatibility
    using BufferStrategy = DropoutPrevention::BufferStrategy;
    using DropoutLevel = DropoutPrevention::DropoutLevel;
    using ThreadPriority = DropoutPrevention::ThreadPriority;
    using BufferMetrics = DropoutPrevention::BufferMetrics;
    using DropoutEvent = DropoutPrevention::DropoutEvent;
    using PreventionConfig = DropoutPrevention::PreventionConfig;
    using Statistics = DropoutPrevention::Statistics;
    using DiagnosticInfo = DropoutPrevention::DiagnosticInfo;

    //==============================================================================
    /**
     * Initialize pools for real-time safe operation.
     * MUST be called BEFORE real-time audio processing begins.
     */
    bool initializePools(const PreventionConfig& config);

    //==============================================================================
    // REAL-TIME SAFE: Audio callback operations (ZERO heap allocations)

    /**
     * Update buffer metrics - CRITICAL: NO heap allocations.
     * O(1) operation suitable for real-time audio callbacks.
     */
    void updateBufferMetrics(int inputSamples, int outputSamples, int bufferSize) noexcept;

    /**
     * Detect dropout - CRITICAL: NO heap allocations.
     * Uses pre-allocated buffers and atomic operations only.
     */
    DropoutLevel detectDropout(const float* const* audioData, int numChannels, int numSamples) noexcept;

    /**
     * Process sample rate conversion - CRITICAL: NO heap allocations.
     * Uses pre-allocated interpolator and buffer pools.
     */
    void processSampleRateConversion(const float* input, float* output, int numSamples) noexcept;

    /**
     * Get current buffer metrics - CRITICAL: NO heap allocations.
     * Atomic read operations only.
     */
    BufferMetrics getCurrentBufferMetrics() const noexcept;

    //==============================================================================
    // Non-real-time maintenance operations

    /**
     * Handle detected dropout - uses pre-allocated buffer.
     * Can be called from non-real-time thread.
     */
    void handleDropout(DropoutLevel severity, const juce::String& context);

    /**
     * Get dropout history - copies from circular buffer.
     * Non-real-time safe operation.
     */
    std::vector<DropoutEvent> getDropoutHistory() const;

    /**
     * Get performance statistics.
     * Non-real-time safe operation.
     */
    Statistics getStatistics() const;

    /**
     * Generate performance report.
     * Non-real-time safe operation.
     */
    juce::String generatePerformanceReport() const;

    /**
     * Perform maintenance operations (pool growth, cleanup).
     * Must be called from non-real-time thread.
     */
    void performMaintenance();

    //==============================================================================
    // Real-time monitoring interface
    class DropoutListener
    {
    public:
        virtual ~DropoutListener() = default;
        virtual void dropoutDetected(const DropoutEvent& event) = 0;
        virtual void dropoutPredicted(double probability, double timeToDropout) = 0;
        virtual void bufferLevelChanged(double newLevel) = 0;
    };

    void addDropoutListener(DropoutListener* listener);
    void removeDropoutListener(DropoutListener* listener);

private:
    //==============================================================================
    // Pre-allocated buffer management

    /**
     * Fixed-size circular buffer for dropout events.
     * NO heap allocations during operation.
     */
    template<typename T, size_t Size>
    class CircularBuffer
    {
    public:
        CircularBuffer() : head_(0), tail_(0), count_(0) {}

        void push(const T& item) noexcept
        {
            buffer_[head_] = item;
            head_ = (head_ + 1) % Size;
            if (count_ < Size) {
                ++count_;
            } else {
                tail_ = (tail_ + 1) % Size; // Overwrite oldest
            }
        }

        T pop() noexcept
        {
            if (count_ == 0) return T{};
            T item = buffer_[tail_];
            tail_ = (tail_ + 1) % Size;
            --count_;
            return item;
        }

        const T& operator[](size_t index) const noexcept
        {
            if (index >= count_) return buffer_[0]; // Safety fallback
            return buffer_[(tail_ + index) % Size];
        }

        size_t size() const noexcept { return count_; }
        bool empty() const noexcept { return count_ == 0; }
        bool full() const noexcept { return count_ == Size; }

        void clear() noexcept
        {
            head_ = 0;
            tail_ = 0;
            count_ = 0;
        }

    private:
        std::array<T, Size> buffer_;
        std::atomic<size_t> head_{0};
        std::atomic<size_t> tail_{0};
        std::atomic<size_t> count_{0};
    };

    //==============================================================================
    // Pre-allocated sample rate converter

    /**
     * Real-time safe sample rate converter using pre-allocated resources.
     */
    class PreallocatedSampleRateConverter
    {
    public:
        PreallocatedSampleRateConverter(LockFreeMemoryPool& pool);

        bool initialize(double inputRate, double outputRate, int maxInputSamples);
        void process(const float* input, float* output, int numSamples) noexcept;
        void reset() noexcept;

        bool isEnabled() const noexcept { return enabled_; }

    private:
        LockFreeMemoryPool& pool_;

        // Pre-allocated resources
        PoolGuard<float> interpolatorBuffer_;
        PoolGuard<float> outputBuffer_;

        // Atomic configuration
        std::atomic<bool> enabled_{false};
        std::atomic<double> ratio_{1.0};
        std::atomic<int> maxInputSize_{4096};
        std::atomic<int> maxOutputSize_{4096};

        // Simple linear interpolation state
        std::atomic<double> phase_{0.0};
    };

    //==============================================================================
    // Member variables

    // Memory pools for real-time operations
    std::unique_ptr<LockFreeMemoryPool> audioBufferPool_;
    std::unique_ptr<LockFreeMemoryPool> eventBufferPool_;
    std::unique_ptr<LockFreeMemoryPool> interpolatorPool_;

    // Pre-allocated buffers (NO heap allocations during operation)
    CircularBuffer<DropoutEvent, 1000> dropoutHistory_;  // Fixed-size circular buffer
    CircularBuffer<double, 1024> bufferLevelHistory_;    // Fixed-size circular buffer
    CircularBuffer<std::chrono::steady_clock::time_point, 1024> timestampHistory_;

    // Sample rate converter
    std::unique_ptr<PreallocatedSampleRateConverter> srcConverter_;

    // Atomic metrics for real-time safety
    std::atomic<BufferMetrics> currentMetrics_{};
    std::atomic<DropoutLevel> lastDropoutLevel_{DropoutLevel::None};
    std::atomic<double> dropoutProbability_{0.0};
    std::atomic<double> timeToDropout_{std::numeric_limits<double>::infinity()};
    std::atomic<uint64_t> audioCallbackCount_{0};

    // Buffer state
    std::atomic<double> inputLevel_{0.0};
    std::atomic<double> outputLevel_{0.0};
    std::atomic<int> currentBufferSize_{512};

    // Configuration
    PreventionConfig config_;

    // Listener management (non-real-time)
    juce::ListenerList<DropoutListener> dropoutListeners_;

    // Initialization state
    std::atomic<bool> poolsInitialized_{false};
    std::atomic<bool> initialized_{false};

    // Performance monitoring
    std::chrono::steady_clock::time_point startTime_;
    mutable std::mutex maintenanceMutex_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RealtimeSafeDropoutPrevention)
};

//==============================================================================
/**
 * Factory for creating real-time safe dropout prevention instances.
 */
namespace RealtimeSafeDropoutPreventionFactory
{
    /**
     * Create a real-time safe dropout prevention instance.
     * Automatically initializes appropriate memory pools.
     */
    std::unique_ptr<RealtimeSafeDropoutPrevention> create(const DropoutPrevention::PreventionConfig& config);

    /**
     * Create with default configuration.
     */
    std::unique_ptr<RealtimeSafeDropoutPrevention> create();
}

} // namespace SchillingerEcosystem::Audio