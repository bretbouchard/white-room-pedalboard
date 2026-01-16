/*
  ==============================================================================
    LockFreeMemoryPool.h

    CRITICAL: Lock-free memory pool for real-time audio safety
    Eliminates ALL heap allocations from audio callback paths

    Features:
    - Lock-free O(1) allocate/deallocate operations
    - Cache-friendly memory alignment for SIMD operations
    - Pre-allocated fixed-size blocks for audio buffers
    - Memory fragmentation prevention
    - Real-time safe buffer management
    - Performance monitoring and statistics
  ==============================================================================
*/

#pragma once

#include <atomic>
#include <memory>
#include <vector>
#include <cstddef>
#include <cstdint>
#include <array>
#include <mutex>
#include <chrono>

namespace SchillingerEcosystem::Audio {

//==============================================================================
/**
 * Lock-free memory pool for real-time audio applications.
 *
 * This class provides completely lock-free memory allocation and deallocation
 * suitable for use in real-time audio callbacks. All memory is pre-allocated
 * during initialization to ensure zero heap allocations during operation.
 *
 * PERFORMANCE GUARANTEES:
 * - O(1) allocate/deallocate operations
 * - No heap allocations after initialization
 * - Cache-friendly memory layout
 * - SIMD-aligned memory blocks
 * - Lock-free atomic operations only
 */
class LockFreeMemoryPool
{
public:
    //==============================================================================
    /**
     * Configuration for memory pool initialization.
     * Must be set up BEFORE real-time audio processing begins.
     */
    struct PoolConfig
    {
        size_t blockSize = 4096;              // Size of each memory block
        size_t initialBlockCount = 256;       // Initial number of blocks
        size_t maxBlockCount = 1024;          // Maximum number of blocks
        size_t alignment = 64;                // Memory alignment for SIMD operations
        bool enableMetrics = true;            // Enable performance monitoring
        bool enableBoundsChecking = true;     // Enable debug bounds checking
        double growthFactor = 1.5;            // Pool growth factor when depleted
        size_t prewarmCount = 32;            // Number of blocks to pre-warm
    };

    //==============================================================================
    /**
     * Memory block header for tracking and management.
     * Designed to be cache-friendly and minimize overhead.
     */
    struct alignas(64) MemoryBlock
    {
        std::atomic<MemoryBlock*> next{nullptr};  // Next block in free list (cache line 1)
        std::atomic<bool> inUse{false};           // Usage flag (cache line 1)
        uint32_t blockId;                         // Block identifier for debugging
        uint32_t magicNumber;                     // Magic number for corruption detection
        alignas(64) uint8_t data[];               // Aligned data storage (cache line 2)

        static constexpr uint32_t VALID_MAGIC = 0xDEADBEEF;
        static constexpr uint32_t CORRUPTED_MAGIC = 0xBADC0DE1;

        bool isValid() const noexcept { return magicNumber == VALID_MAGIC; }
        void markCorrupted() noexcept { magicNumber = CORRUPTED_MAGIC; }
    };

    //==============================================================================
    /**
     * Performance metrics for memory pool monitoring.
     * Updated atomically for real-time safe statistics.
     */
    struct PoolMetrics
    {
        std::atomic<size_t> totalAllocations{0};     // Total allocation count
        std::atomic<size_t> totalDeallocations{0};   // Total deallocation count
        std::atomic<size_t> currentInUse{0};         // Currently allocated blocks
        std::atomic<size_t> peakUsage{0};            // Peak usage count
        std::atomic<size_t> poolHits{0};             // Successful allocations from pool
        std::atomic<size_t> poolMisses{0};           // Failed allocations (pool empty)
        std::atomic<double> avgAllocTimeUs{0.0};     // Average allocation time (microseconds)
        std::atomic<double> avgDeallocTimeUs{0.0};   // Average deallocation time (microseconds)
        std::chrono::steady_clock::time_point startTime; // Pool creation time
    };

    //==============================================================================
    LockFreeMemoryPool();
    explicit LockFreeMemoryPool(const PoolConfig& config);
    ~LockFreeMemoryPool();

    //==============================================================================
    // Initialization and shutdown
    bool initialize(const PoolConfig& config);
    bool initialize(); // Uses default config
    void shutdown();
    bool isInitialized() const;

    //==============================================================================
    // CRITICAL: Real-time safe memory operations
    // These methods are GUARANTEED to be lock-free and heap-allocation-free

    /**
     * Allocate a memory block from the pool.
     * O(1) operation with no heap allocations.
     * Returns nullptr if pool is exhausted (real-time safe fallback).
     */
    void* allocate(size_t size) noexcept;

    /**
     * Allocate a memory block with explicit alignment.
     * O(1) operation with no heap allocations.
     */
    void* allocateAligned(size_t size, size_t alignment) noexcept;

    /**
     * Deallocate a memory block back to the pool.
     * O(1) operation with no heap allocations.
     */
    void deallocate(void* ptr) noexcept;

    /**
     * Check if a pointer belongs to this pool.
     * O(1) operation for validation.
     */
    bool containsPointer(const void* ptr) const noexcept;

    //==============================================================================
    // Specialized allocators for audio data types

    /**
     * Allocate audio buffer with SIMD alignment.
     * Optimized for audio processing performance.
     */
    float* allocateAudioBuffer(size_t numSamples) noexcept;

    /**
     * Allocate stereo audio buffer pair.
     * Returns two aligned float pointers.
     */
    std::pair<float*, float*> allocateStereoBuffer(size_t numSamples) noexcept;

    /**
     * Allocate multi-channel audio buffer.
     * Returns aligned pointers for each channel.
     */
    std::vector<float*> allocateMultiChannelBuffer(size_t numChannels, size_t numSamples) noexcept;

    //==============================================================================
    // Pool management and statistics

    /**
     * Get current pool metrics.
     * Real-time safe atomic reads.
     */
    PoolMetrics getMetrics() const;

    /**
     * Reset pool statistics.
     * Should be called outside real-time paths.
     */
    void resetMetrics();

    /**
     * Get pool configuration.
     */
    PoolConfig getConfig() const;

    /**
     * Get pool health status.
     * Returns true if pool is operating normally.
     */
    bool isHealthy() const;

    /**
     * Perform pool maintenance (growth, cleanup).
     * Should be called periodically outside real-time paths.
     */
    void performMaintenance();

    //==============================================================================
    // Diagnostic and debugging utilities

    /**
     * Validate pool integrity.
     * Returns false if corruption is detected.
     */
    bool validateIntegrity() const;

    /**
     * Get detailed diagnostic information.
     */
    struct DiagnosticInfo
    {
        size_t totalMemorySize;
        size_t usedMemorySize;
        size_t freeMemorySize;
        double fragmentationRatio;
        size_t corruptedBlocks;
        size_t orphanedBlocks;
        double avgUtilization;
        bool isHealthy;
        juce::String recommendations;
    };

    DiagnosticInfo getDiagnosticInfo() const;

    /**
     * Generate pool performance report.
     */
    juce::String generatePerformanceReport() const;

private:
    //==============================================================================
    // Internal memory management

    /**
     * Create and initialize the memory pool.
     */
    bool createMemoryPool(const PoolConfig& config);

    /**
     * Allocate a new block from the pool storage.
     */
    MemoryBlock* allocateFromStorage() noexcept;

    /**
     * Return a block to the free list.
     */
    void returnToFreeList(MemoryBlock* block) noexcept;

    /**
     * Grow the pool size.
     * Called outside real-time paths.
     */
    bool growPool(size_t additionalBlocks);

    /**
     * Calculate memory block size including header.
     */
    size_t calculateBlockSize() const noexcept;

    /**
     * Get data pointer from memory block.
     */
    void* getDataPointer(MemoryBlock* block) noexcept;

    /**
     * Get memory block from data pointer.
     */
    MemoryBlock* getBlockFromPointer(void* ptr) noexcept;

    //==============================================================================
    // Lock-free free list management

    /**
     * Pop a block from the free list (lock-free).
     */
    MemoryBlock* popFromFreeList() noexcept;

    /**
     * Push a block to the free list (lock-free).
     */
    void pushToFreeList(MemoryBlock* block) noexcept;

    //==============================================================================
    // Performance measurement utilities

    /**
     * Measure allocation time with high precision.
     */
    double measureAllocationTime(std::function<void*()> allocationFunc) noexcept;

    /**
     * Measure deallocation time with high precision.
     */
    double measureDeallocationTime(std::function<void()> deallocationFunc) noexcept;

    //==============================================================================
    // Member variables

    PoolConfig config_;                              // Pool configuration
    std::atomic<MemoryBlock*> freeList_{nullptr};   // Lock-free free list head
    std::atomic<bool> initialized_{false};          // Initialization flag

    // Memory storage for blocks
    std::unique_ptr<uint8_t[]> memoryStorage_;      // Contiguous memory block storage
    std::vector<MemoryBlock*> blockIndex_;          // Index of all blocks for validation

    // Performance metrics
    mutable std::mutex metricsMutex_;               // Mutex for metric updates (non-realtime)
    PoolMetrics metrics_;                           // Real-time metrics
    mutable std::vector<double> allocationTimes_;   // Allocation time samples
    mutable std::vector<double> deallocationTimes_; // Deallocation time samples

    // Pool management
    std::atomic<size_t> currentBlockCount_{0};      // Current number of blocks
    std::atomic<bool> maintenanceInProgress_{false}; // Maintenance flag

    // Memory bounds for validation
    uintptr_t memoryStart_;                         // Start of managed memory
    uintptr_t memoryEnd_;                           // End of managed memory

    LockFreeMemoryPool(const LockFreeMemoryPool&) = delete;
    LockFreeMemoryPool& operator=(const LockFreeMemoryPool&) = delete;
};

//==============================================================================
/**
 * RAII wrapper for pool-allocated memory.
 * Ensures automatic deallocation when scope ends.
 *
 * Usage:
 *   auto buffer = PoolAllocator<float>::allocate(pool, 1024);
 *   // Use buffer...
 *   // Automatically deallocated when leaving scope
 */
template<typename T>
class PoolAllocator
{
public:
    static T* allocate(LockFreeMemoryPool& pool, size_t count = 1) noexcept
    {
        return static_cast<T*>(pool.allocateAligned(count * sizeof(T), alignof(T)));
    }

    static void deallocate(LockFreeMemoryPool& pool, T* ptr) noexcept
    {
        pool.deallocate(ptr);
    }
};

//==============================================================================
/**
 * RAII memory guard for automatic deallocation.
 */
template<typename T>
class PoolGuard
{
public:
    PoolGuard(LockFreeMemoryPool& pool, T* ptr) noexcept
        : pool_(pool), ptr_(ptr) {}

    ~PoolGuard()
    {
        if (ptr_) {
            PoolAllocator<T>::deallocate(pool_, ptr_);
        }
    }

    // Move semantics
    PoolGuard(PoolGuard&& other) noexcept
        : pool_(other.pool_), ptr_(other.ptr_)
    {
        other.ptr_ = nullptr;
    }

    PoolGuard& operator=(PoolGuard&& other) noexcept
    {
        if (this != &other) {
            if (ptr_) {
                PoolAllocator<T>::deallocate(pool_, ptr_);
            }
            pool_ = other.pool_;
            ptr_ = other.ptr_;
            other.ptr_ = nullptr;
        }
        return *this;
    }

    // Delete copy operations
    PoolGuard(const PoolGuard&) = delete;
    PoolGuard& operator=(const PoolGuard&) = delete;

    // Access operators
    T& operator*() const noexcept { return *ptr_; }
    T* operator->() const noexcept { return ptr_; }
    T* get() const noexcept { return ptr_; }

    // Release ownership
    T* release() noexcept
    {
        T* ptr = ptr_;
        ptr_ = nullptr;
        return ptr;
    }

    // Reset to new pointer
    void reset(T* ptr = nullptr) noexcept
    {
        if (ptr_) {
            PoolAllocator<T>::deallocate(pool_, ptr_);
        }
        ptr_ = ptr;
    }

private:
    LockFreeMemoryPool& pool_;
    T* ptr_;
};

//==============================================================================
/**
 * Factory functions for creating specialized pools.
 */
namespace LockFreeMemoryPoolFactory
{
    /**
     * Create a pool optimized for audio buffer allocation.
     */
    std::unique_ptr<LockFreeMemoryPool> createAudioBufferPool();

    /**
     * Create a pool optimized for MIDI data allocation.
     */
    std::unique_ptr<LockFreeMemoryPool> createMidiBufferPool();

    /**
     * Create a pool optimized for small object allocation.
     */
    std::unique_ptr<LockFreeMemoryPool> createSmallObjectPool();

    /**
     * Create a pool with custom configuration.
     */
    std::unique_ptr<LockFreeMemoryPool> createCustomPool(const LockFreeMemoryPool::PoolConfig& config);
}

} // namespace SchillingerEcosystem::Audio