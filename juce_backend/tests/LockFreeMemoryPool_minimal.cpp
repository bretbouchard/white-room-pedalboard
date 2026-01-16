/*
  ==============================================================================
    LockFreeMemoryPool_minimal.cpp

    Minimal lock-free memory pool implementation for testing.
  ==============================================================================
*/

#include "LockFreeMemoryPool_minimal.h"
#include <algorithm>
#include <cstring>
#include <iostream>

namespace SchillingerEcosystem::Audio {

//==============================================================================
LockFreeMemoryPool::LockFreeMemoryPool()
    : memoryStart_(0), memoryEnd_(0)
{
    metrics_.startTime = std::chrono::steady_clock::now();
}

LockFreeMemoryPool::LockFreeMemoryPool(const PoolConfig& config)
    : config_(config), memoryStart_(0), memoryEnd_(0)
{
    metrics_.startTime = std::chrono::steady_clock::now();
    initialize(config);
}

LockFreeMemoryPool::~LockFreeMemoryPool()
{
    shutdown();
}

//==============================================================================
bool LockFreeMemoryPool::initialize(const PoolConfig& config)
{
    if (initialized_.load()) {
        return false;
    }

    config_ = config;

    if (config.blockSize == 0 || config.initialBlockCount == 0 || config.maxBlockCount < config.initialBlockCount) {
        std::cerr << "LockFreeMemoryPool: Invalid configuration\n";
        return false;
    }

    if (!createMemoryPool(config)) {
        return false;
    }

    resetMetrics();
    initialized_.store(true);

    std::cout << "LockFreeMemoryPool: Initialized with " << config.initialBlockCount
              << " blocks of " << config.blockSize << " bytes each\n";

    return true;
}

bool LockFreeMemoryPool::initialize()
{
    PoolConfig defaultConfig;
    return initialize(defaultConfig);
}

void LockFreeMemoryPool::shutdown()
{
    if (!initialized_.load()) {
        return;
    }

    initialized_.store(false);
    freeList_.store(nullptr);
    blockIndex_.clear();
    memoryStorage_.reset();
    memoryStart_ = 0;
    memoryEnd_ = 0;

    std::cout << "LockFreeMemoryPool: Shutdown completed\n";
}

bool LockFreeMemoryPool::isInitialized() const
{
    return initialized_.load();
}

//==============================================================================
void* LockFreeMemoryPool::allocate(size_t size) noexcept
{
    if (!initialized_.load() || size > config_.blockSize) {
        return nullptr;
    }

    auto start = std::chrono::high_resolution_clock::now();

    MemoryBlock* block = popFromFreeList();
    if (!block) {
        metrics_.poolMisses.fetch_add(1);
        return nullptr;
    }

    block->inUse.store(true);

    auto end = std::chrono::high_resolution_clock::now();
    (void)end; // Suppress unused variable warning - timing removed for simplified implementation

    metrics_.totalAllocations.fetch_add(1);
    metrics_.currentInUse.fetch_add(1);
    metrics_.poolHits.fetch_add(1);

    return getDataPointer(block);
}

void* LockFreeMemoryPool::allocateAligned(size_t size, size_t) noexcept
{
    return allocate(size);
}

void LockFreeMemoryPool::deallocate(void* ptr) noexcept
{
    if (!ptr || !initialized_.load()) {
        return;
    }

    MemoryBlock* block = getBlockFromPointer(ptr);
    if (!block || !block->isValid() || !containsPointer(ptr)) {
        return;
    }

    if (!block->inUse.load()) {
        return;
    }

    block->inUse.store(false);
    pushToFreeList(block);
    metrics_.totalDeallocations.fetch_add(1);
    metrics_.currentInUse.fetch_sub(1);
}

bool LockFreeMemoryPool::containsPointer(const void* ptr) const noexcept
{
    if (!ptr || !initialized_.load()) {
        return false;
    }

    uintptr_t address = reinterpret_cast<uintptr_t>(ptr);
    return address >= memoryStart_ && address < memoryEnd_;
}

//==============================================================================
float* LockFreeMemoryPool::allocateAudioBuffer(size_t numSamples) noexcept
{
    return static_cast<float*>(allocateAligned(numSamples * sizeof(float), 64));
}

//==============================================================================
LockFreeMemoryPool::PoolMetrics LockFreeMemoryPool::getMetrics() const
{
    PoolMetrics result;
    result.totalAllocations = metrics_.totalAllocations.load();
    result.totalDeallocations = metrics_.totalDeallocations.load();
    result.currentInUse = metrics_.currentInUse.load();
    result.peakUsage = metrics_.peakUsage.load();
    result.poolHits = metrics_.poolHits.load();
    result.poolMisses = metrics_.poolMisses.load();
    result.avgAllocTimeUs = metrics_.avgAllocTimeUs.load();
    result.avgDeallocTimeUs = metrics_.avgDeallocTimeUs.load();
    result.startTime = metrics_.startTime;
    return result;
}

void LockFreeMemoryPool::resetMetrics()
{
    metrics_.totalAllocations.store(0);
    metrics_.totalDeallocations.store(0);
    metrics_.currentInUse.store(0);
    metrics_.peakUsage.store(0);
    metrics_.poolHits.store(0);
    metrics_.poolMisses.store(0);
    metrics_.avgAllocTimeUs.store(0.0);
    metrics_.avgDeallocTimeUs.store(0.0);
    metrics_.startTime = std::chrono::steady_clock::now();
}

//==============================================================================
bool LockFreeMemoryPool::createMemoryPool(const PoolConfig& config)
{
    size_t blockSize = calculateBlockSize();
    size_t totalMemorySize = config.maxBlockCount * blockSize;

    try {
        memoryStorage_ = std::make_unique<uint8_t[]>(totalMemorySize);
    } catch (const std::bad_alloc&) {
        std::cerr << "LockFreeMemoryPool: Failed to allocate memory block\n";
        return false;
    }

    memoryStart_ = reinterpret_cast<uintptr_t>(memoryStorage_.get());
    memoryEnd_ = memoryStart_ + totalMemorySize;

    blockIndex_.reserve(config.maxBlockCount);
    for (size_t i = 0; i < config.maxBlockCount; ++i) {
        uintptr_t blockAddress = memoryStart_ + i * blockSize;
        MemoryBlock* block = reinterpret_cast<MemoryBlock*>(blockAddress);

        block->blockId = static_cast<uint32_t>(i);
        block->magicNumber = MemoryBlock::VALID_MAGIC;
        block->next.store(nullptr);
        block->inUse.store(false);

        blockIndex_.push_back(block);
    }

    currentBlockCount_.store(config.initialBlockCount);
    for (size_t i = 0; i < config.initialBlockCount; ++i) {
        pushToFreeList(blockIndex_[i]);
    }

    return true;
}

size_t LockFreeMemoryPool::calculateBlockSize() const noexcept
{
    size_t minBlockSize = sizeof(MemoryBlock) + config_.blockSize;
    size_t alignedSize = (minBlockSize + config_.alignment - 1) & ~(config_.alignment - 1);
    return std::max(alignedSize, config_.alignment * 2);
}

void* LockFreeMemoryPool::getDataPointer(MemoryBlock* block) noexcept
{
    return reinterpret_cast<void*>(reinterpret_cast<uintptr_t>(block) + sizeof(MemoryBlock));
}

LockFreeMemoryPool::MemoryBlock* LockFreeMemoryPool::getBlockFromPointer(void* ptr) noexcept
{
    if (!ptr || !containsPointer(ptr)) {
        return nullptr;
    }

    size_t blockSize = calculateBlockSize();
    uintptr_t blockAddress = (reinterpret_cast<uintptr_t>(ptr) - memoryStart_ + blockSize - 1) / blockSize * blockSize + memoryStart_;
    MemoryBlock* block = reinterpret_cast<MemoryBlock*>(blockAddress);

    if (block < blockIndex_[0] || block > blockIndex_.back() ||
        (reinterpret_cast<uintptr_t>(block) - memoryStart_) % blockSize != 0) {
        return nullptr;
    }

    return block;
}

LockFreeMemoryPool::MemoryBlock* LockFreeMemoryPool::popFromFreeList() noexcept
{
    MemoryBlock* head = freeList_.load();
    while (head) {
        MemoryBlock* next = head->next.load();
        if (freeList_.compare_exchange_weak(head, next)) {
            return head;
        }
    }
    return nullptr;
}

void LockFreeMemoryPool::pushToFreeList(MemoryBlock* block) noexcept
{
    MemoryBlock* head = freeList_.load();
    do {
        block->next.store(head);
    } while (!freeList_.compare_exchange_weak(head, block));
}

//==============================================================================
namespace LockFreeMemoryPoolFactory
{
    std::unique_ptr<LockFreeMemoryPool> createAudioBufferPool()
    {
        LockFreeMemoryPool::PoolConfig config;
        config.blockSize = 8192;
        config.initialBlockCount = 64;
        config.maxBlockCount = 512;
        config.alignment = 64;
        config.enableMetrics = true;

        return std::make_unique<LockFreeMemoryPool>(config);
    }

    std::unique_ptr<LockFreeMemoryPool> createCustomPool(const LockFreeMemoryPool::PoolConfig& config)
    {
        return std::make_unique<LockFreeMemoryPool>(config);
    }
}

} // namespace SchillingerEcosystem::Audio