/*
  ==============================================================================

    AudioBufferPool.h
    Created: December 31, 2025
    Author: Bret Bouchard

    Lock-free memory pool for audio thread buffer allocation.
    Pre-allocates buffers to eliminate runtime allocations in process().

  ==============================================================================
*/

#pragma once

#include <atomic>
#include <vector>
#include <memory>
#include <cstring>
#include <juce_audio_basics/juce_audio_basics.h>

//==============================================================================
// Pooled Audio Buffer
//==============================================================================

/**
 * A pooled buffer with reference counting.
 * Returns to pool when last reference is released.
 */
class PooledAudioBuffer
{
public:
    PooledAudioBuffer(int numChannels, int numSamples)
        : channels_(numChannels),
          samples_(numSamples),
          refCount_(1)
    {
        // Allocate contiguous memory for all channels
        data_.resize(channels_ * samples_);
    }

    ~PooledAudioBuffer()
    {
        // Memory will be freed by pool
    }

    /**
     * Get read-only pointer to channel data (const version).
     */
    const float* getChannelReadPointer(int channel) const noexcept
    {
        jassert(channel >= 0 && channel < channels_);
        return data_.data() + (channel * samples_);
    }

    /**
     * Get writable pointer to channel data.
     */
    float* getChannelWritePointer(int channel) noexcept
    {
        jassert(channel >= 0 && channel < channels_);
        return data_.data() + (channel * samples_);
    }

    /**
     * Get number of channels.
     */
    int getNumChannels() const noexcept { return channels_; }

    /**
     * Get number of samples.
     */
    int getNumSamples() const noexcept { return samples_; }

    /**
     * Increment reference count (called when buffer is acquired).
     */
    void addRef() noexcept
    {
        refCount_.fetch_add(1, std::memory_order_relaxed);
    }

    /**
     * Decrement reference count.
     * Returns true if buffer should be returned to pool.
     */
    bool release() noexcept
    {
        return refCount_.fetch_sub(1, std::memory_order_acq_rel) == 1;
    }

    /**
     * Clear all channels to zero.
     */
    void clear() noexcept
    {
        std::memset(data_.data(), 0, sizeof(float) * channels_ * samples_);
    }

    /**
     * Copy from JUCE AudioBuffer.
     */
    void copyFrom(const juce::AudioBuffer<float>& source) noexcept
    {
        jassert(source.getNumChannels() == channels_);
        jassert(source.getNumSamples() == samples_);

        for (int ch = 0; ch < channels_; ++ch)
        {
            std::memcpy(getChannelWritePointer(ch),
                      source.getReadPointer(ch),
                      sizeof(float) * samples_);
        }
    }

    /**
     * Copy to JUCE AudioBuffer.
     */
    void copyTo(juce::AudioBuffer<float>& dest) const noexcept
    {
        jassert(dest.getNumChannels() == channels_);
        jassert(dest.getNumSamples() == samples_);

        for (int ch = 0; ch < channels_; ++ch)
        {
            std::memcpy(dest.getWritePointer(ch),
                      getChannelReadPointer(ch),
                      sizeof(float) * samples_);
        }
    }

private:
    std::vector<float> data_;
    int channels_;
    int samples_;
    std::atomic<int> refCount_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PooledAudioBuffer)
};

//==============================================================================
// Audio Buffer Pool
//==============================================================================

/**
 * Lock-free pool of pre-allocated audio buffers.
 * Eliminates allocations in audio thread.
 */
class AudioBufferPool
{
public:
    /**
     * Create pool with specified configuration.
     *
     * @param maxBufferSize Maximum samples per buffer
     * @param maxChannels Maximum channels per buffer
     * @param initialBuffers Number of buffers to pre-allocate
     */
    AudioBufferPool(int maxBufferSize = 512,
                   int maxChannels = 2,
                   int initialBuffers = 16)
        : maxSamples_(maxBufferSize),
          maxChannels_(maxChannels),
          totalAllocated_(0),
          totalReturned_(0)
    {
        // Pre-allocate initial buffers
        for (int i = 0; i < initialBuffers; ++i)
        {
            auto buffer = std::make_unique<PooledAudioBuffer>(maxChannels_, maxSamples_);
            freeList_.push(buffer.get());
            buffers_.push_back(std::move(buffer));
        }

        totalAllocated_.store(initialBuffers, std::memory_order_relaxed);
    }

    ~AudioBufferPool()
    {
        // All buffers will be freed automatically
    }

    /**
     * Acquire a buffer from the pool (lock-free).
     * Returns nullptr if no buffers available (caller should handle gracefully).
     *
     * @param numChannels Required channels (must be <= maxChannels)
     * @param numSamples Required samples (must be <= maxSamples)
     */
    PooledAudioBuffer* acquire(int numChannels, int numSamples) noexcept
    {
        jassert(numChannels <= maxChannels_);
        jassert(numSamples <= maxSamples_);

        // Try to get from free list (lock-free pop)
        PooledAudioBuffer* buffer = freeList_.pop();

        if (buffer != nullptr)
        {
            buffer->addRef();
            return buffer;
        }

        // No free buffers - allocation would be required
        // In production, could expand pool here (not in audio thread!)
        return nullptr;
    }

    /**
     * Return a buffer to the pool (lock-free).
     */
    void release(PooledAudioBuffer* buffer) noexcept
    {
        if (buffer == nullptr)
            return;

        // Decrement ref count
        if (buffer->release())
        {
            // Last reference - return to free list
            freeList_.push(buffer);
            totalReturned_.fetch_add(1, std::memory_order_relaxed);
        }
    }

    /**
     * Get pool statistics.
     */
    struct Statistics
    {
        int totalBuffers;
        int freeBuffers;
        int64_t totalAllocations;
        int64_t totalReturns;
    };

    Statistics getStatistics() const noexcept
    {
        return {
            static_cast<int>(buffers_.size()),
            freeList_.size(),
            totalAllocated_.load(std::memory_order_relaxed),
            totalReturned_.load(std::memory_order_relaxed)
        };
    }

    /**
     * Get maximum buffer size.
     */
    int getMaxSamples() const noexcept { return maxSamples_; }

    /**
     * Get maximum channel count.
     */
    int getMaxChannels() const noexcept { return maxChannels_; }

private:
    //==========================================================================
    // Lock-Free Stack
    //==========================================================================

    /**
     * Lock-free Treiber stack for free buffer list.
     * SPSC (single producer, single consumer) for simplicity.
     */
    class LockFreeStack
    {
    public:
        LockFreeStack() : head_(nullptr) {}

        void push(PooledAudioBuffer* item) noexcept
        {
            Node* node = reinterpret_cast<Node*>(item);
            node->next = head_.load(std::memory_order_acquire);
            head_.store(node, std::memory_order_release);
        }

        PooledAudioBuffer* pop() noexcept
        {
            Node* head = head_.load(std::memory_order_acquire);
            if (head == nullptr)
                return nullptr;

            Node* next = head->next;
            head_.store(next, std::memory_order_release);
            return reinterpret_cast<PooledAudioBuffer*>(head);
        }

        int size() const noexcept
        {
            // Approximate size - not 100% accurate but good for stats
            int count = 0;
            Node* node = head_.load(std::memory_order_acquire);
            while (node != nullptr)
            {
                ++count;
                node = node->next;
            }
            return count;
        }

    private:
        struct Node
        {
            PooledAudioBuffer* buffer;  // This pointer
            Node* next;
        };

        std::atomic<Node*> head_;
    };

    //==========================================================================
    // Member Variables
    //==========================================================================

    int maxSamples_;
    int maxChannels_;
    LockFreeStack freeList_;
    std::vector<std::unique_ptr<PooledAudioBuffer>> buffers_;
    std::atomic<int64_t> totalAllocated_;
    std::atomic<int64_t> totalReturned_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioBufferPool)
};

//==============================================================================
// Convenience Singleton Access
//==============================================================================

/**
 * Global buffer pool instance.
 * Initialized once at startup.
 */
inline AudioBufferPool& getAudioBufferPool()
{
    // Default: 512 samples, 2 channels, 16 buffers
    static AudioBufferPool instance(512, 2, 16);
    return instance;
}
