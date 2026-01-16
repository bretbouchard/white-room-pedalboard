/*
  ==============================================================================
    MemorySafetyDebugger.h

    Comprehensive memory safety debugging and validation tools.
    Integrates with AddressSanitizer, ThreadSanitizer, and custom diagnostics.
  ==============================================================================
*/

#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <atomic>
#include <mutex>
#include <thread>
#include <chrono>
#include <sstream>
#include <fstream>
#include <juce_core/juce_core.h>

// AddressSanitizer detection and configuration
#ifdef __has_feature
  #if __has_feature(address_sanitizer)
    #define ADDRESS_SANITIZER_ENABLED 1
    #include <sanitizer/asan_interface.h>
    #include <sanitizer/common_interface_defs.h>
  #endif
  #if __has_feature(thread_sanitizer)
    #define THREAD_SANITIZER_ENABLED 1
    #include <sanitizer/tsan_interface.h>
  #endif
  #if __has_feature(memory_sanitizer)
    #define MEMORY_SANITIZER_ENABLED 1
    #include <sanitizer/msan_interface.h>
  #endif
#endif

// Compiler-based sanitizers
#ifdef __SANITIZE_ADDRESS__
  #define ADDRESS_SANITIZER_ENABLED 1
  #include <sanitizer/asan_interface.h>
  #include <sanitizer/common_interface_defs.h>
#endif

#ifdef __SANITIZE_THREAD__
  #define THREAD_SANITIZER_ENABLED 1
  #include <sanitizer/tsan_interface.h>
#endif

namespace SchillingerEcosystem::Audio {

//==============================================================================
/**
 * Memory safety violation types
 */
enum class MemoryViolationType {
    UseAfterFree,
    DoubleFree,
    BufferOverflow,
    BufferUnderflow,
    InvalidFree,
    MemoryLeak,
    DataRace,
    UninitializedAccess,
    NullPointerDereference,
    UnknownViolation
};

/**
 * Memory safety severity levels
 */
enum class MemorySafetySeverity {
    Info,
    Warning,
    Error,
    Critical,
    Fatal
};

/**
 * Memory safety event structure
 */
struct MemorySafetyEvent {
    MemoryViolationType violationType;
    MemorySafetySeverity severity;
    std::string description;
    std::string location;
    std::string stackTrace;
    std::string allocationStackTrace;
    uint64_t timestamp;
    std::thread::id threadId;
    size_t memoryAddress;
    size_t memorySize;
    bool isRecoverable;

    MemorySafetyEvent() : violationType(MemoryViolationType::UnknownViolation),
                         severity(MemorySafetySeverity::Info),
                         timestamp(0),
                         threadId(),
                         memoryAddress(0),
                         memorySize(0),
                         isRecoverable(true) {}
};

//==============================================================================
/**
 * Memory tracking information for allocations
 */
struct MemoryAllocationInfo {
    void* pointer;
    size_t size;
    size_t alignment;
    std::string allocationLocation;
    std::string allocationStackTrace;
    std::thread::id allocationThread;
    uint64_t allocationTime;
    bool isFreed;
    uint64_t freeTime;
    std::string freeLocation;

    MemoryAllocationInfo() : pointer(nullptr), size(0), alignment(0),
                           allocationThread(), allocationTime(0),
                           isFreed(false), freeTime(0) {}
};

//==============================================================================
/**
 * Memory safety statistics
 */
struct MemorySafetyStats {
    uint64_t totalAllocations;
    uint64_t totalDeallocations;
    uint64_t currentAllocations;
    uint64_t peakAllocations;
    size_t currentMemoryUsage;
    size_t peakMemoryUsage;
    uint64_t totalViolations;
    uint64_t criticalViolations;
    uint64_t recoveredViolations;
    std::unordered_map<MemoryViolationType, uint64_t> violationCounts;

    MemorySafetyStats() : totalAllocations(0), totalDeallocations(0),
                         currentAllocations(0), peakAllocations(0),
                         currentMemoryUsage(0), peakMemoryUsage(0),
                         totalViolations(0), criticalViolations(0),
                         recoveredViolations(0) {}
};

//==============================================================================
/**
 * Memory safety debugger with comprehensive diagnostics
 */
class MemorySafetyDebugger {
public:
    using EventCallback = std::function<void(const MemorySafetyEvent&)>;
    using StatCallback = std::function<void(const MemorySafetyStats&)>;

private:
    static std::unique_ptr<MemorySafetyDebugger> instance_;
    static std::mutex instanceMutex_;

    // Event storage and callbacks
    std::vector<MemorySafetyEvent> eventHistory_;
    mutable std::mutex eventMutex_;
    std::vector<EventCallback> eventCallbacks_;
    mutable std::mutex callbackMutex_;

    // Memory tracking
    std::unordered_map<void*, MemoryAllocationInfo> activeAllocations_;
    mutable std::mutex allocationsMutex_;
    std::atomic<uint64_t> nextAllocationId_{1};

    // Statistics
    std::atomic<MemorySafetyStats> stats_;

    // Configuration
    std::atomic<bool> enabled_{true};
    std::atomic<bool> trackAllAllocations_{false}; // Expensive, enable with care
    std::atomic<bool> generateStackTrace_{true};
    std::atomic<bool> logToFile_{false};
    std::atomic<bool> breakOnCriticalViolation_{false};
    std::string logFilePath_;
    std::unique_ptr<std::ofstream> logFile_;

    // Debug state
    std::atomic<bool> violationDetected_{false};
    std::atomic<bool> inCriticalSection_{false};

    // Performance tracking
    std::atomic<uint64_t> totalOverheadTime_{0};
    std::atomic<uint64_t> maxOverheadTime_{0};

    #ifdef DEBUG
    std::string creatorContext_;
    uint64_t creationTime_;
    #endif

public:
    /**
     * Get singleton instance
     */
    static MemorySafetyDebugger& getInstance();

    /**
     * Initialize debugger with configuration
     */
    bool initialize(const std::string& logFilePath = "");

    /**
     * Shutdown debugger and cleanup resources
     */
    void shutdown();

    //==============================================================================
    // Memory tracking interface

    /**
     * Track memory allocation
     */
    void trackAllocation(void* ptr, size_t size, size_t alignment = 0,
                        const char* location = nullptr);

    /**
     * Track memory deallocation
     */
    void trackDeallocation(void* ptr, const char* location = nullptr);

    /**
     * Get allocation info for pointer
     */
    MemoryAllocationInfo getAllocationInfo(void* ptr) const;

    /**
     * Check if pointer is currently tracked
     */
    bool isTrackedPointer(void* ptr) const;

    //==============================================================================
    // Memory violation reporting

    /**
     * Report memory violation
     */
    void reportViolation(MemoryViolationType type,
                        MemorySafetySeverity severity,
                        const std::string& description,
                        const std::string& location = "",
                        void* memoryAddress = nullptr,
                        size_t memorySize = 0,
                        bool isRecoverable = true);

    /**
     * Report use-after-free violation
     */
    void reportUseAfterFree(void* ptr, const std::string& location = "");

    /**
     * Report buffer overflow violation
     */
    void reportBufferOverflow(void* ptr, size_t accessSize, size_t bufferSize,
                             const std::string& location = "");

    /**
     * Report data race violation
     */
    void reportDataRace(void* ptr, const std::string& location = "");

    /**
     * Report memory leak
     */
    void reportMemoryLeak(const std::vector<void*>& leakedPointers);

    //==============================================================================
    // Memory validation

    /**
     * Validate pointer access
     */
    bool validatePointerAccess(void* ptr, size_t accessSize,
                              const std::string& location = "");

    /**
     * Validate all active allocations
     */
    size_t validateAllAllocations();

    /**
     * Detect memory leaks
     */
    std::vector<void*> detectMemoryLeaks();

    /**
     * Check for common memory corruption patterns
     */
    bool checkMemoryCorruption();

    //==============================================================================
    // AddressSanitizer integration

    /**
     * Enable AddressSanitizer features
     */
    void enableAddressSanitizerFeatures();

    /**
     * Get AddressSanitizer report
     */
    std::string getAddressSanitizerReport();

    /**
     * Poison memory region (AddressSanitizer)
     */
    void poisonMemoryRegion(void* addr, size_t size);

    /**
     * Unpoison memory region (AddressSanitizer)
     */
    void unpoisonMemoryRegion(void* addr, size_t size);

    /**
     * Check if memory region is poisoned (AddressSanitizer)
     */
    bool isMemoryRegionPoisoned(void* addr, size_t size);

    //==============================================================================
    // Callback management

    /**
     * Add event callback
     */
    void addEventCallback(EventCallback callback);

    /**
     * Remove event callback
     */
    void removeEventCallback(EventCallback callback);

    /**
     * Add statistics callback
     */
    void addStatCallback(StatCallback callback);

    /**
     * Remove statistics callback
     */
    void removeStatCallback(StatCallback callback);

    //==============================================================================
    // Statistics and monitoring

    /**
     * Get current statistics
     */
    MemorySafetyStats getStats() const;

    /**
     * Reset statistics
     */
    void resetStats();

    /**
     * Get event history
     */
    std::vector<MemorySafetyEvent> getEventHistory(size_t maxEvents = 1000) const;

    /**
     * Get violations by type
     */
    std::vector<MemorySafetyEvent> getViolationsByType(MemoryViolationType type) const;

    /**
     * Get violations by severity
     */
    std::vector<MemorySafetyEvent> getViolationsBySeverity(MemorySafetySeverity severity) const;

    //==============================================================================
    // Configuration

    /**
     * Enable/disable debugger
     */
    void setEnabled(bool enabled) { enabled_.store(enabled); }

    /**
     * Check if debugger is enabled
     */
    bool isEnabled() const { return enabled_.load(); }

    /**
     * Enable/disable allocation tracking
     */
    void setAllocationTrackingEnabled(bool enabled) { trackAllAllocations_.store(enabled); }

    /**
     * Enable/disable stack trace generation
     */
    void setStackTraceEnabled(bool enabled) { generateStackTrace_.store(enabled); }

    /**
     * Enable/disable file logging
     */
    void setFileLoggingEnabled(bool enabled, const std::string& filePath = "");

    /**
     * Enable/disable break on critical violation
     */
    void setBreakOnCriticalViolation(bool enabled) { breakOnCriticalViolation_.store(enabled); }

    //==============================================================================
    // Utility functions

    /**
     * Generate stack trace
     */
    std::string generateStackTrace(size_t maxFrames = 32) const;

    /**
     * Get current timestamp
     */
    static uint64_t getCurrentTimestamp();

    /**
     * Get violation type string
     */
    static std::string getViolationTypeString(MemoryViolationType type);

    /**
     * Get severity string
     */
    static std::string getSeverityString(MemorySafetySeverity severity);

    /**
     * Format memory address
     */
    static std::string formatMemoryAddress(void* addr);

    /**
     * Format memory size
     */
    static std::string formatMemorySize(size_t size);

    /**
     * Check if AddressSanitizer is available
     */
    static bool isAddressSanitizerAvailable();

    /**
     * Check if ThreadSanitizer is available
     */
    static bool isThreadSanitizerAvailable();

    /**
     * Check if MemorySanitizer is available
     */
    static bool isMemorySanitizerAvailable();

    #ifdef DEBUG
    /**
     * Set creator context for debugging
     */
    void setCreatorContext(const std::string& context);

    /**
     * Get creator context
     */
    const std::string& getCreatorContext() const { return creatorContext_; }
    #endif

private:
    MemorySafetyDebugger();
    ~MemorySafetyDebugger();

    // Disable copying
    MemorySafetyDebugger(const MemorySafetyDebugger&) = delete;
    MemorySafetyDebugger& operator=(const MemorySafetyDebugger&) = delete;

    //==============================================================================
    // Internal implementation

    /**
     * Log event to file
     */
    void logEventToFile(const MemorySafetyEvent& event);

    /**
     * Update statistics
     */
    void updateStatistics(const MemorySafetyEvent& event);

    /**
     * Notify callbacks
     */
    void notifyCallbacks(const MemorySafetyEvent& event);

    /**
     * Handle critical violation
     */
    void handleCriticalViolation(const MemorySafetyEvent& event);

    /**
     * Format event for logging
     */
    std::string formatEvent(const MemorySafetyEvent& event) const;

    /**
     * Get allocation ID
     */
    uint64_t getNextAllocationId() { return nextAllocationId_.fetch_add(1); }
};

//==============================================================================
/**
 * RAII Memory Tracker for automatic memory tracking
 */
class ScopedMemoryTracker {
private:
    void* pointer_;
    size_t size_;
    std::string location_;
    bool trackOnDestruct_;

public:
    /**
     * Create memory tracker for allocation
     */
    ScopedMemoryTracker(void* ptr, size_t size, const std::string& location = "",
                       bool trackOnDestruct = true)
        : pointer_(ptr), size_(size), location_(location), trackOnDestruct_(trackOnDestruct) {
        if (ptr && size > 0) {
            MemorySafetyDebugger::getInstance().trackAllocation(ptr, size, 0, location.c_str());
        }
    }

    /**
     * Destructor tracks deallocation
     */
    ~ScopedMemoryTracker() {
        if (trackOnDestruct_ && pointer_) {
            MemorySafetyDebugger::getInstance().trackDeallocation(pointer_, location_.c_str());
        }
    }

    // Disable copying
    ScopedMemoryTracker(const ScopedMemoryTracker&) = delete;
    ScopedMemoryTracker& operator=(const ScopedMemoryTracker&) = delete;

    // Enable moving
    ScopedMemoryTracker(ScopedMemoryTracker&& other) noexcept
        : pointer_(other.pointer_), size_(other.size_),
          location_(std::move(other.location_)), trackOnDestruct_(other.trackOnDestruct_) {
        other.pointer_ = nullptr;
        other.size_ = 0;
        other.trackOnDestruct_ = false;
    }

    /**
     * Get tracked pointer
     */
    void* getPointer() const { return pointer_; }

    /**
     * Get tracked size
     */
    size_t getSize() const { return size_; }

    /**
     * Disable tracking on destruction
     */
    void disableTrackingOnDestruct() { trackOnDestruct_ = false; }

    /**
     * Force deallocation tracking
     */
    void trackDeallocation() {
        if (pointer_) {
            MemorySafetyDebugger::getInstance().trackDeallocation(pointer_, location_.c_str());
            pointer_ = nullptr;
            size_ = 0;
        }
    }
};

//==============================================================================
/**
 * Memory-safe smart pointer with debugging
 */
template<typename T>
class DebuggingPtr {
private:
    std::unique_ptr<T> ptr_;
    std::string allocationLocation_;
    mutable ScopedMemoryTracker tracker_;

public:
    /**
     * Construct with allocation location tracking
     */
    explicit DebuggingPtr(T* ptr = nullptr, const std::string& location = "")
        : ptr_(ptr), allocationLocation_(location),
          tracker_(ptr, ptr ? sizeof(T) : 0, location) {}

    /**
     * Construct with unique_ptr
     */
    explicit DebuggingPtr(std::unique_ptr<T> ptr, const std::string& location = "")
        : ptr_(std::move(ptr)), allocationLocation_(location),
          tracker_(ptr_.get(), ptr_ ? sizeof(T) : 0, location) {}

    // Move constructor
    DebuggingPtr(DebuggingPtr&& other) noexcept
        : ptr_(std::move(other.ptr_)),
          allocationLocation_(std::move(other.allocationLocation_)),
          tracker_(ptr_.get(), ptr_ ? sizeof(T) : 0, allocationLocation_) {
        other.tracker_.disableTrackingOnDestruct();
    }

    // Move assignment
    DebuggingPtr& operator=(DebuggingPtr&& other) noexcept {
        if (this != &other) {
            tracker_.trackDeallocation();
            ptr_ = std::move(other.ptr_);
            allocationLocation_ = std::move(other.allocationLocation_);
            tracker_ = ScopedMemoryTracker(ptr_.get(), ptr_ ? sizeof(T) : 0, allocationLocation_);
            other.tracker_.disableTrackingOnDestruct();
        }
        return *this;
    }

    // Disable copying
    DebuggingPtr(const DebuggingPtr&) = delete;
    DebuggingPtr& operator=(const DebuggingPtr&) = delete;

    /**
     * Dereference operators
     */
    T& operator*() const {
        if (!ptr_) {
            MemorySafetyDebugger::getInstance().reportViolation(
                MemoryViolationType::NullPointerDereference,
                MemorySafetySeverity::Error,
                "Dereferencing null DebuggingPtr",
                allocationLocation_);
        }
        return *ptr_;
    }

    T* operator->() const {
        if (!ptr_) {
            MemorySafetyDebugger::getInstance().reportViolation(
                MemoryViolationType::NullPointerDereference,
                MemorySafetySeverity::Error,
                "Accessing null DebuggingPtr",
                allocationLocation_);
        }
        return ptr_.get();
    }

    /**
     * Get raw pointer
     */
    T* get() const { return ptr_.get(); }

    /**
     * Release ownership
     */
    T* release() {
        tracker_.disableTrackingOnDestruct();
        return ptr_.release();
    }

    /**
     * Reset with new pointer
     */
    void reset(T* ptr = nullptr) {
        tracker_.trackDeallocation();
        ptr_.reset(ptr);
        tracker_ = ScopedMemoryTracker(ptr, ptr ? sizeof(T) : 0, allocationLocation_);
    }

    /**
     * Check if pointer is valid
     */
    explicit operator bool() const { return ptr_ != nullptr; }

    /**
     * Get allocation location
     */
    const std::string& getAllocationLocation() const { return allocationLocation_; }
};

//==============================================================================
/**
 * Memory safety macros for easy integration
 */

#ifdef DEBUG
    #define MEMORY_SAFE_NEW(type, ...) \
        DebuggingPtr<type>(new type(__VA_ARGS__), __FILE__ ":" + std::to_string(__LINE__))

    #define MEMORY_SAFE_MAKE_UNIQUE(type, ...) \
        DebuggingPtr<type>(std::make_unique<type>(__VA_ARGS__), __FILE__ ":" + std::to_string(__LINE__))

    #define MEMORY_SAFE_ALLOC(size) \
        ScopedMemoryTracker(malloc(size), size, __FILE__ ":" + std::to_string(__LINE__)), malloc(size)

    #define MEMORY_SAFE_FREE(ptr) \
        do { \
            if (ptr) { \
                MemorySafetyDebugger::getInstance().trackDeallocation(ptr, __FILE__ ":" + std::to_string(__LINE__)); \
                free(ptr); \
                ptr = nullptr; \
            } \
        } while(0)

    #define MEMORY_TRACK_SCOPE(name) \
        MemorySafetyDebugger::getInstance().trackAllocation(this, sizeof(*this), 0, __FILE__ ":" + std::to_string(__LINE__) " (" name ")")

    #define MEMORY_REPORT_USE_AFTER_FREE(ptr) \
        MemorySafetyDebugger::getInstance().reportUseAfterFree(ptr, __FILE__ ":" + std::to_string(__LINE__))

    #define MEMORY_REPORT_BUFFER_OVERFLOW(ptr, accessSize, bufferSize) \
        MemorySafetyDebugger::getInstance().reportBufferOverflow(ptr, accessSize, bufferSize, __FILE__ ":" + std::to_string(__LINE__))

    #define MEMORY_VALIDATE_POINTER(ptr, size) \
        MemorySafetyDebugger::getInstance().validatePointerAccess(ptr, size, __FILE__ ":" + std::to_string(__LINE__))
#else
    #define MEMORY_SAFE_NEW(type, ...) std::make_unique<type>(__VA_ARGS__)
    #define MEMORY_SAFE_MAKE_UNIQUE(type, ...) std::make_unique<type>(__VA_ARGS__)
    #define MEMORY_SAFE_ALLOC(size) malloc(size)
    #define MEMORY_SAFE_FREE(ptr) do { free(ptr); ptr = nullptr; } while(0)
    #define MEMORY_TRACK_SCOPE(name)
    #define MEMORY_REPORT_USE_AFTER_FREE(ptr)
    #define MEMORY_REPORT_BUFFER_OVERFLOW(ptr, accessSize, bufferSize)
    #define MEMORY_VALIDATE_POINTER(ptr, size) true
#endif

//==============================================================================
/**
 * Memory safety utility functions
 */
namespace MemorySafetyUtils {

/**
 * Initialize memory safety debugging
 */
bool initializeMemorySafetyDebugging(const std::string& logFilePath = "");

/**
 * Shutdown memory safety debugging
 */
void shutdownMemorySafetyDebugging();

/**
 * Create memory dump for debugging
 */
std::string createMemoryDump();

/**
 * Analyze memory usage
 */
std::string analyzeMemoryUsage();

/**
 * Run comprehensive memory safety check
 */
bool runMemorySafetyCheck();

/**
 * Get memory safety report
 */
std::string getMemorySafetyReport();

} // namespace MemorySafetyUtils

} // namespace SchillingerEcosystem::Audio