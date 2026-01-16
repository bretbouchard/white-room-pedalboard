/*
  ==============================================================================
    MemorySafePersistenceManager.h

    Memory-safe persistence management using RAII patterns.
    Eliminates double-free vulnerabilities and ensures proper resource cleanup.
  ==============================================================================
*/

#pragma once

#include <memory>
#include <vector>
#include <string>
#include <unordered_map>
#include <atomic>
#include <mutex>
#include <shared_mutex>
#include <future>
#include <functional>
#include <chrono>
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>

namespace SchillingerEcosystem::Audio {

//==============================================================================
/**
 * Memory-safe data buffer with RAII management
 *
 * Provides automatic memory management and eliminates double-free
 * vulnerabilities through proper ownership semantics.
 */
class SafeDataBuffer {
public:
    using Ptr = std::shared_ptr<SafeDataBuffer>;
    using WeakPtr = std::weak_ptr<SafeDataBuffer>;

private:
    std::unique_ptr<uint8_t[]> data_;
    size_t size_;
    size_t capacity_;
    std::atomic<bool> isValid_{true};
    std::atomic<uint64_t> accessCount_{0};
    std::string bufferId_;

    // Memory safety validation (debug builds)
    #ifdef DEBUG
    std::atomic<uint64_t> lastAccessTime_{0};
    std::string creatorContext_;
    mutable std::mutex debugMutex_;
    std::vector<uint8_t> debugPattern_;
    #endif

public:
    /**
     * Create safe data buffer with specified capacity
     *
     * @param capacity Buffer capacity in bytes
     * @param bufferId Optional identifier for debugging
     */
    explicit SafeDataBuffer(size_t capacity, const std::string& bufferId = "")
        : size_(0), capacity_(capacity), bufferId_(bufferId.empty() ? "buffer_" + std::to_string(reinterpret_cast<uintptr_t>(this)) : bufferId) {
        if (capacity == 0) {
            throw std::invalid_argument("Buffer capacity must be greater than 0");
        }

        try {
            data_ = std::make_unique<uint8_t[]>(capacity);

            #ifdef DEBUG
            // Initialize with debug pattern
            debugPattern_.resize(capacity, 0xDE);
            std::copy(debugPattern_.begin(), debugPattern_.end(), data_.get());
            creatorContext_ = "SafeDataBuffer constructor";
            lastAccessTime_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::steady_clock::now().time_since_epoch()).count());
            #endif

        } catch (const std::bad_alloc&) {
            throw std::runtime_error("Failed to allocate buffer of size " + std::to_string(capacity));
        }
    }

    /**
     * Destructor with automatic cleanup
     */
    ~SafeDataBuffer() {
        // Mark as invalid before cleanup
        isValid_.store(false);

        #ifdef DEBUG
        // Fill with dead pattern to detect use-after-free
        if (data_ && capacity_ > 0) {
            std::fill(data_.get(), data_.get() + capacity_, 0xFE);
        }
        #endif

        // RAII handles automatic memory cleanup
    }

    // Disable copying to maintain unique ownership of underlying data
    SafeDataBuffer(const SafeDataBuffer&) = delete;
    SafeDataBuffer& operator=(const SafeDataBuffer&) = delete;

    // Enable moving
    SafeDataBuffer(SafeDataBuffer&&) = default;
    SafeDataBuffer& operator=(SafeDataBuffer&&) = default;

    //==============================================================================
    // Memory-safe data access

    /**
     * Get raw data pointer safely
     * @return nullptr if buffer is invalid, otherwise pointer to data
     */
    uint8_t* getData() noexcept {
        if (!isValid_.load()) {
            return nullptr;
        }

        accessCount_.fetch_add(1);
        updateLastAccessTime();
        return data_.get();
    }

    /**
     * Get raw data pointer safely (const)
     */
    const uint8_t* getData() const noexcept {
        if (!isValid_.load()) {
            return nullptr;
        }

        accessCount_.fetch_add(1);
        const_cast<SafeDataBuffer*>(this)->updateLastAccessTime();
        return data_.get();
    }

    /**
     * Get buffer size
     */
    size_t getSize() const noexcept { return size_; }

    /**
     * Get buffer capacity
     */
    size_t getCapacity() const noexcept { return capacity_; }

    /**
     * Get buffer ID
     */
    const std::string& getId() const { return bufferId_; }

    /**
     * Check if buffer is valid
     */
    bool isValid() const noexcept { return isValid_.load(); }

    /**
     * Get access count
     */
    uint64_t getAccessCount() const noexcept { return accessCount_.load(); }

    //==============================================================================
    // Memory-safe data operations

    /**
     * Write data to buffer with bounds checking
     *
     * @param data Data to write
     * @param offset Offset in buffer
     * @param length Length to write
     * @return true if write successful
     */
    bool writeData(const void* data, size_t offset, size_t length) {
        if (!isValid_.load() || !data || length == 0) {
            return false;
        }

        if (offset + length > capacity_) {
            return false; // Bounds check
        }

        if (!data_) {
            return false;
        }

        try {
            std::memcpy(data_.get() + offset, data, length);
            size_ = std::max(size_, offset + length);
            updateLastAccessTime();
            return true;
        } catch (...) {
            return false;
        }
    }

    /**
     * Read data from buffer with bounds checking
     *
     * @param offset Offset in buffer
     * @param length Length to read
     * @param data Buffer to store data
     * @return true if read successful
     */
    bool readData(size_t offset, size_t length, void* data) const {
        if (!isValid_.load() || !data || length == 0) {
            return false;
        }

        if (offset + length > size_ || offset + length > capacity_) {
            return false; // Bounds check
        }

        if (!data_) {
            return false;
        }

        try {
            std::memcpy(data, data_.get() + offset, length);
            const_cast<SafeDataBuffer*>(this)->updateLastAccessTime();
            return true;
        } catch (...) {
            return false;
        }
    }

    /**
     * Resize buffer safely
     *
     * @param newCapacity New buffer capacity
     * @return true if resize successful
     */
    bool resize(size_t newCapacity) {
        if (!isValid_.load() || newCapacity == 0) {
            return false;
        }

        std::lock_guard<std::mutex> lock(getMutex());

        try {
            auto newData = std::make_unique<uint8_t[]>(newCapacity);

            // Copy existing data
            size_t copySize = std::min(size_, newCapacity);
            if (data_ && copySize > 0) {
                std::memcpy(newData.get(), data_.get(), copySize);
            }

            // Swap buffers
            data_ = std::move(newData);
            capacity_ = newCapacity;
            size_ = std::min(size_, newCapacity);

            updateLastAccessTime();
            return true;

        } catch (const std::bad_alloc&) {
            return false;
        } catch (...) {
            return false;
        }
    }

    /**
     * Clear buffer contents
     */
    void clear() {
        std::lock_guard<std::mutex> lock(getMutex());

        if (data_ && capacity_ > 0) {
            std::fill(data_.get(), data_.get() + capacity_, 0);
        }
        size_ = 0;
        updateLastAccessTime();
    }

    /**
     * Mark buffer as invalid (prevents further access)
     */
    void invalidate() {
        isValid_.store(false);
        clear();
    }

    //==============================================================================
    // Memory safety validation

    #ifdef DEBUG
    /**
     * Validate memory integrity
     */
    bool validateMemoryIntegrity() const {
        std::lock_guard<std::mutex> lock(debugMutex_);

        if (!isValid_.load() || !data_ || capacity_ == 0) {
            return false;
        }

        // Check for buffer overflow by verifying end pattern
        if (capacity_ > 16) {
            const uint8_t* endPattern = data_.get() + capacity_ - 16;
            for (int i = 0; i < 16; ++i) {
                if (endPattern[i] != 0xDE) {
                    return false; // Buffer overflow detected
                }
            }
        }

        return true;
    }

    /**
     * Get creator context
     */
    const std::string& getCreatorContext() const { return creatorContext_; }

    /**
     * Set creator context
     */
    void setCreatorContext(const std::string& context) {
        std::lock_guard<std::mutex> lock(debugMutex_);
        creatorContext_ = context;
    }

    /**
     * Get last access time
     */
    uint64_t getLastAccessTime() const { return lastAccessTime_.load(); }
    #endif

private:
    /**
     * Get mutex for thread safety
     */
    std::mutex& getMutex() const {
        #ifdef DEBUG
        return debugMutex_;
        #else
        static std::mutex dummy;
        return dummy;
        #endif
    }

    /**
     * Update last access time
     */
    void updateLastAccessTime() {
        #ifdef DEBUG
        lastAccessTime_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count());
        #endif
    }
};

//==============================================================================
/**
 * Memory-safe persistence manager with RAII resource management
 *
 * Eliminates double-free vulnerabilities through:
 * - Smart pointer-based buffer ownership
 * - Atomic state management
 * - Exception-safe operations
 * - Comprehensive error handling
 */
class MemorySafePersistenceManager {
public:
    using BufferPtr = std::shared_ptr<SafeDataBuffer>;
    using BufferMap = std::unordered_map<std::string, BufferPtr>;
    using SaveCallback = std::function<bool(const std::string&, const SafeDataBuffer&)>;
    using LoadCallback = std::function<BufferPtr(const std::string&)>;

    enum class PersistenceState {
        Uninitialized,
        Ready,
        Saving,
        Loading,
        Error,
        Shutdown
    };

    enum class PersistenceResult {
        Success,
        InvalidState,
        InvalidParameter,
        BufferNotFound,
        IoError,
        CorruptedData,
        AccessDenied,
        InsufficientSpace,
        UnknownError
    };

private:
    // Buffer storage with shared ownership
    BufferMap buffers_;
    mutable std::shared_mutex buffersMutex_;

    // State management
    std::atomic<PersistenceState> currentState_{PersistenceState::Uninitialized};
    std::atomic<bool> shutdownRequested_{false};
    std::atomic<uint64_t> totalOperations_{0};
    std::atomic<uint64_t> failedOperations_{0};

    // Operation management
    std::atomic<uint32_t> activeSaveOperations_{0};
    std::atomic<uint32_t> activeLoadOperations_{0};
    mutable std::mutex operationMutex_;

    // Callback management
    SaveCallback saveCallback_;
    LoadCallback loadCallback_;
    mutable std::mutex callbackMutex_;

    // Configuration
    std::string persistenceDirectory_;
    size_t maxBufferSize_{1024 * 1024 * 100}; // 100MB default
    size_t maxTotalMemory_{1024 * 1024 * 1024}; // 1GB default
    bool enableCompression_{false};
    bool enableEncryption_{false};

    // Memory usage tracking
    std::atomic<size_t> currentMemoryUsage_{0};
    std::atomic<size_t> peakMemoryUsage_{0};

    // Memory safety debugging
    #ifdef DEBUG
    std::atomic<uint64_t> lastOperationTime_{0};
    std::string creatorContext_;
    std::vector<std::string> operationHistory_;
    mutable std::mutex debugMutex_;
    #endif

public:
    /**
     * Construct memory-safe persistence manager
     */
    MemorySafePersistenceManager();

    /**
     * Destructor ensures clean shutdown
     */
    ~MemorySafePersistenceManager();

    // Disable copying to maintain unique ownership
    MemorySafePersistenceManager(const MemorySafePersistenceManager&) = delete;
    MemorySafePersistenceManager& operator=(const MemorySafePersistenceManager&) = delete;

    // Enable moving
    MemorySafePersistenceManager(MemorySafePersistenceManager&&) = default;
    MemorySafePersistenceManager& operator=(MemorySafePersistenceManager&&) = default;

    //==============================================================================
    // Memory-safe lifecycle management

    /**
     * Initialize persistence manager
     *
     * @param persistenceDirectory Directory for persistence files
     * @return true if initialization successful
     */
    bool initialize(const std::string& persistenceDirectory = "");

    /**
     * Shutdown persistence manager safely
     * Ensures all operations complete before cleanup
     */
    void shutdown();

    /**
     * Check if manager is ready
     */
    bool isReady() const { return currentState_.load() == PersistenceState::Ready; }

    /**
     * Get current state
     */
    PersistenceState getState() const { return currentState_.load(); }

    //==============================================================================
    // Memory-safe buffer management

    /**
     * Create a new buffer with memory safety guarantees
     *
     * @param bufferId Unique buffer identifier
     * @param size Buffer size in bytes
     * @return weak pointer to buffer (invalid on failure)
     */
    std::weak_ptr<SafeDataBuffer> createBuffer(const std::string& bufferId, size_t size);

    /**
     * Get existing buffer safely
     *
     * @param bufferId Buffer identifier
     * @return weak pointer to buffer (invalid if not found)
     */
    std::weak_ptr<SafeDataBuffer> getBuffer(const std::string& bufferId);

    /**
     * Remove buffer safely
     * Ensures no operations are active on buffer before removal
     *
     * @param bufferId Buffer identifier
     * @return true if buffer removed successfully
     */
    bool removeBuffer(const std::string& bufferId);

    /**
     * Remove buffer asynchronously
     *
     * @param bufferId Buffer identifier
     * @return future that completes when removal is done
     */
    std::future<bool> removeBufferAsync(const std::string& bufferId);

    /**
     * Get all buffer IDs (thread-safe snapshot)
     */
    std::vector<std::string> getBufferIds() const;

    /**
     * Get buffer count
     */
    size_t getBufferCount() const;

    /**
     * Check if buffer exists
     */
    bool hasBuffer(const std::string& bufferId) const;

    //==============================================================================
    // Memory-safe persistence operations

    /**
     * Save buffer to persistent storage
     *
     * @param bufferId Buffer identifier
     * @return operation result
     */
    PersistenceResult saveBuffer(const std::string& bufferId);

    /**
     * Save buffer asynchronously
     *
     * @param bufferId Buffer identifier
     * @return future with operation result
     */
    std::future<PersistenceResult> saveBufferAsync(const std::string& bufferId);

    /**
     * Load buffer from persistent storage
     *
     * @param bufferId Buffer identifier
     * @param createIfNotExist Create new buffer if not found
     * @return weak pointer to loaded buffer
     */
    std::weak_ptr<SafeDataBuffer> loadBuffer(const std::string& bufferId, bool createIfNotExist = false);

    /**
     * Load buffer asynchronously
     *
     * @param bufferId Buffer identifier
     * @param createIfNotExist Create new buffer if not found
     * @return future with weak pointer to loaded buffer
     */
    std::future<std::weak_ptr<SafeDataBuffer>> loadBufferAsync(const std::string& bufferId, bool createIfNotExist = false);

    /**
     * Save all buffers
     *
     * @return number of successfully saved buffers
     */
    size_t saveAllBuffers();

    /**
     * Load all buffers from persistent storage
     *
     * @return number of successfully loaded buffers
     */
    size_t loadAllBuffers();

    //==============================================================================
    // Memory-safe configuration

    /**
     * Set persistence directory
     */
    bool setPersistenceDirectory(const std::string& directory);

    /**
     * Set maximum buffer size
     */
    void setMaxBufferSize(size_t maxSize) { maxBufferSize_ = maxSize; }

    /**
     * Set maximum total memory usage
     */
    void setMaxTotalMemory(size_t maxMemory) { maxTotalMemory_ = maxMemory; }

    /**
     * Enable/disable compression
     */
    void setCompressionEnabled(bool enabled) { enableCompression_ = enabled; }

    /**
     * Enable/disable encryption
     */
    void setEncryptionEnabled(bool enabled) { enableEncryption_ = enabled; }

    //==============================================================================
    // Callback management

    /**
     * Set save callback
     */
    void setSaveCallback(SaveCallback callback);

    /**
     * Set load callback
     */
    void setLoadCallback(LoadCallback callback);

    //==============================================================================
    // Memory usage monitoring

    /**
     * Get current memory usage
     */
    size_t getCurrentMemoryUsage() const { return currentMemoryUsage_.load(); }

    /**
     * Get peak memory usage
     */
    size_t getPeakMemoryUsage() const { return peakMemoryUsage_.load(); }

    /**
     * Reset peak memory usage
     */
    void resetPeakMemoryUsage() { peakMemoryUsage_.store(currentMemoryUsage_.load()); }

    /**
     * Check memory usage within limits
     */
    bool isMemoryUsageWithinLimits() const {
        return currentMemoryUsage_.load() <= maxTotalMemory_;
    }

    //==============================================================================
    // Memory safety and validation

    /**
     * Validate all buffers for memory integrity
     */
    bool validateAllBuffers() const;

    /**
     * Cleanup invalid buffers
     */
    size_t cleanupInvalidBuffers();

    /**
     * Get manager statistics
     */
    struct ManagerStats {
        size_t totalBuffers;
        size_t currentMemoryUsage;
        size_t peakMemoryUsage;
        uint64_t totalOperations;
        uint64_t failedOperations;
        uint32_t activeSaveOperations;
        uint32_t activeLoadOperations;
        PersistenceState currentState;
        bool isShutdownRequested;
    };

    ManagerStats getStats() const;

    /**
     * Clear all buffers safely
     */
    void clear();

    /**
     * Request shutdown
     */
    void requestShutdown() { shutdownRequested_.store(true); }

    /**
     * Check if shutdown is requested
     */
    bool isShutdownRequested() const { return shutdownRequested_.load(); }

    #ifdef DEBUG
    /**
     * Set creator context for debugging
     */
    void setCreatorContext(const std::string& context);

    /**
     * Get operation history
     */
    std::vector<std::string> getOperationHistory() const;

    /**
     * Clear operation history
     */
    void clearOperationHistory();
    #endif

private:
    //==============================================================================
    // Memory-safe internal operations

    /**
     * Update memory usage statistics
     */
    void updateMemoryUsage();

    /**
     * Validate buffer for operation
     */
    bool validateBufferForOperation(const std::string& bufferId);

    /**
     * Get buffer size for memory tracking
     */
    size_t getBufferSize(const BufferPtr& buffer) const;

    /**
     * Acquire operation lock
     */
    bool tryAcquireOperationLock();

    /**
     * Release operation lock
     */
    void releaseOperationLock();

    /**
     * Log operation
     */
    void logOperation(const std::string& operation, PersistenceResult result);

    /**
     * Get persistence result string
     */
    std::string getResultString(PersistenceResult result) const;
};

//==============================================================================
/**
 * RAII Persistence Manager Scope
 * Provides scoped management of persistence manager lifecycle
 */
class ScopedPersistenceManager {
private:
    std::unique_ptr<MemorySafePersistenceManager> manager_;
    bool initialized_;

public:
    /**
     * Create scoped persistence manager
     */
    explicit ScopedPersistenceManager(const std::string& persistenceDirectory = "");

    /**
     * Destructor ensures clean shutdown
     */
    ~ScopedPersistenceManager();

    // Disable copying
    ScopedPersistenceManager(const ScopedPersistenceManager&) = delete;
    ScopedPersistenceManager& operator=(const ScopedPersistenceManager&) = delete;

    // Enable moving
    ScopedPersistenceManager(ScopedPersistenceManager&&) = default;
    ScopedPersistenceManager& operator=(ScopedPersistenceManager&&) = default;

    /**
     * Get managed persistence manager
     */
    MemorySafePersistenceManager& getManager() { return *manager_; }

    /**
     * Get managed persistence manager (const)
     */
    const MemorySafePersistenceManager& getManager() const { return *manager_; }

    /**
     * Check if manager is initialized
     */
    bool isInitialized() const { return initialized_; }

    /**
     * Reset manager (shutdown and create new)
     */
    void reset(const std::string& persistenceDirectory = "");
};

//==============================================================================
/**
 * Memory-safe persistence factory
 * Provides consistent creation patterns
 */
class PersistenceFactory {
public:
    /**
     * Create memory-safe persistence manager
     */
    static std::unique_ptr<MemorySafePersistenceManager> createManager(const std::string& persistenceDirectory = "");

    /**
     * Create scoped persistence manager
     */
    static std::unique_ptr<ScopedPersistenceManager> createScopedManager(const std::string& persistenceDirectory = "");

    /**
     * Create safe data buffer
     */
    static SafeDataBuffer::Ptr createBuffer(size_t size, const std::string& bufferId = "");
};

} // namespace SchillingerEcosystem::Audio