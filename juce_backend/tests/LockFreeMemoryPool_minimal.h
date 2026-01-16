/*
  ==============================================================================
    LockFreeMemoryPool_minimal.h

    Minimal lock-free memory pool for testing without dependencies.
  ==============================================================================
*/

#pragma once

#include <atomic>
#include <memory>
#include <vector>
#include <cstddef>
#include <cstdint>
#include <array>
#include <chrono>

namespace SchillingerEcosystem::Audio {

class LockFreeMemoryPool
{
public:
    struct PoolConfig
    {
        size_t blockSize = 4096;
        size_t initialBlockCount = 256;
        size_t maxBlockCount = 1024;
        size_t alignment = 64;
        bool enableMetrics = true;
    };

    struct PoolMetrics
    {
        size_t totalAllocations{0};
        size_t totalDeallocations{0};
        size_t currentInUse{0};
        size_t peakUsage{0};
        size_t poolHits{0};
        size_t poolMisses{0};
        double avgAllocTimeUs{0.0};
        double avgDeallocTimeUs{0.0};
        std::chrono::steady_clock::time_point startTime;
    };

    LockFreeMemoryPool();
    explicit LockFreeMemoryPool(const PoolConfig& config);
    ~LockFreeMemoryPool();

    bool initialize(const PoolConfig& config);
    bool initialize();
    void shutdown();
    bool isInitialized() const;

    void* allocate(size_t size) noexcept;
    void* allocateAligned(size_t size, size_t alignment) noexcept;
    void deallocate(void* ptr) noexcept;

    float* allocateAudioBuffer(size_t numSamples) noexcept;

    PoolMetrics getMetrics() const;
    void resetMetrics();

private:
    struct alignas(64) MemoryBlock
    {
        std::atomic<MemoryBlock*> next{nullptr};
        std::atomic<bool> inUse{false};
        uint32_t blockId;
        uint32_t magicNumber;
        alignas(64) uint8_t data[];

        static constexpr uint32_t VALID_MAGIC = 0xDEADBEEF;

        bool isValid() const noexcept { return magicNumber == VALID_MAGIC; }
    };

    PoolConfig config_;
    std::atomic<MemoryBlock*> freeList_{nullptr};
    std::atomic<bool> initialized_{false};

    std::unique_ptr<uint8_t[]> memoryStorage_;
    std::vector<MemoryBlock*> blockIndex_;

    // Internal atomic metrics (separate from returned copyable metrics)
    struct AtomicMetrics {
        std::atomic<size_t> totalAllocations{0};
        std::atomic<size_t> totalDeallocations{0};
        std::atomic<size_t> currentInUse{0};
        std::atomic<size_t> peakUsage{0};
        std::atomic<size_t> poolHits{0};
        std::atomic<size_t> poolMisses{0};
        std::atomic<double> avgAllocTimeUs{0.0};
        std::atomic<double> avgDeallocTimeUs{0.0};
        std::chrono::steady_clock::time_point startTime;
    };
    AtomicMetrics metrics_;
    std::atomic<size_t> currentBlockCount_{0};

    uintptr_t memoryStart_;
    uintptr_t memoryEnd_;

    size_t calculateBlockSize() const noexcept;
    void* getDataPointer(MemoryBlock* block) noexcept;
    MemoryBlock* getBlockFromPointer(void* ptr) noexcept;
    bool containsPointer(const void* ptr) const noexcept;

    MemoryBlock* popFromFreeList() noexcept;
    void pushToFreeList(MemoryBlock* block) noexcept;

    LockFreeMemoryPool(const LockFreeMemoryPool&) = delete;
    LockFreeMemoryPool& operator=(const LockFreeMemoryPool&) = delete;

    bool createMemoryPool(const PoolConfig& config);
};

namespace LockFreeMemoryPoolFactory
{
    std::unique_ptr<LockFreeMemoryPool> createAudioBufferPool();
    std::unique_ptr<LockFreeMemoryPool> createCustomPool(const LockFreeMemoryPool::PoolConfig& config);
}

} // namespace SchillingerEcosystem::Audio