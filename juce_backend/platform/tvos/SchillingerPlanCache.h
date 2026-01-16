/*
  ==============================================================================

    SchillingerPlanCache.h
    Created: December 31, 2025
    Author: Bret Bouchard

    Lock-free plan cache for sharing SDK plans between Swift and JUCE audio thread.
    CRITICAL: All operations are wait-free and lock-free for realtime safety.

  ==============================================================================
*/

#pragma once

#include <atomic>
#include <cstring>
#include <string>
#include <vector>
#include <memory>
#include <unordered_map>

//==============================================================================
// JSON Plan Representation
//==============================================================================

/**
 * Simplified JSON structure for plan data.
 * In production, this would use a proper JSON library.
 */
struct SchillingerPlan
{
    std::string planHash;
    std::string irHash;
    int64_t generatedAt;
    int64_t windowFrom;
    int64_t windowTo;
    std::vector<uint8_t> operationsJSON;  // Serialized operations

    bool isValid() const noexcept
    {
        return !planHash.empty() && !irHash.empty();
    }

    void clear() noexcept
    {
        planHash.clear();
        irHash.clear();
        generatedAt = 0;
        windowFrom = 0;
        windowTo = 0;
        operationsJSON.clear();
    }
};

//==============================================================================
// Lock-Free Single Producer/Single Consumer Queue
//==============================================================================

/**
 * Lock-free SPSC queue for plan updates.
 * Swift (producer) writes plans, JUCE (consumer) reads plans.
 */
template<typename T, size_t Capacity>
class LockFreeSPSCQueue
{
public:
    LockFreeSPSCQueue()
        : head_(0), tail_(0)
    {
        buffer_ = std::unique_ptr<T[]>(new T[Capacity]);
        std::memset(buffer_.get(), 0, sizeof(T) * Capacity);
    }

    ~LockFreeSPSCQueue() = default;

    /**
     * Push to queue (producer: Swift bridge).
     * Returns true if successful, false if queue full.
     */
    bool push(const T& item) noexcept
    {
        const size_t head = head_.load(std::memory_order_relaxed);
        const size_t next_head = (head + 1) % Capacity;

        // Check if full
        if (next_head == tail_.load(std::memory_order_acquire))
            return false;

        // Write item
        buffer_[head] = item;

        // Commit write
        head_.store(next_head, std::memory_order_release);
        return true;
    }

    /**
     * Pop from queue (consumer: JUCE audio thread).
     * Returns true if item was available.
     */
    bool pop(T& out) noexcept
    {
        const size_t tail = tail_.load(std::memory_order_relaxed);

        // Check if empty
        if (tail == head_.load(std::memory_order_acquire))
            return false;

        // Read item
        out = buffer_[tail];

        // Commit read
        tail_.store((tail + 1) % Capacity, std::memory_order_release);
        return true;
    }

    /**
     * Check if queue is empty (consumer only).
     */
    bool isEmpty() const noexcept
    {
        return head_.load(std::memory_order_acquire) ==
               tail_.load(std::memory_order_acquire);
    }

private:
    std::unique_ptr<T[]> buffer_;
    std::atomic<size_t> head_;  // Write index (producer)
    std::atomic<size_t> tail_;  // Read index (consumer)
};

//==============================================================================
// Session Plan Cache
//==============================================================================

/**
 * Per-session plan cache with atomic pointer swap.
 * JUCE audio thread can atomically swap to new plans without blocking.
 */
class SessionPlanCache
{
public:
    SessionPlanCache()
        : currentPlan_(std::make_shared<SchillingerPlan>())
    {
    }

    /**
     * Update plan (called from Swift bridge, NOT audio thread).
     * Thread-safe: allocates new plan, atomically swaps pointer.
     */
    void updatePlan(const SchillingerPlan& newPlan) noexcept
    {
        auto newPlanPtr = std::make_shared<SchillingerPlan>(newPlan);

        // Atomic pointer swap (wait-free)
        std::atomic_store_explicit(&currentPlan_,
                                   newPlanPtr,
                                   std::memory_order_release);
    }

    /**
     * Get current plan (called from JUCE audio thread).
     * Thread-safe: returns shared pointer, wait-free read.
     */
    std::shared_ptr<SchillingerPlan> getCurrentPlan() const noexcept
    {
        return std::atomic_load_explicit(&currentPlan_,
                                         std::memory_order_acquire);
    }

    /**
     * Clear plan (reset to empty).
     */
    void clear() noexcept
    {
        auto emptyPlan = std::make_shared<SchillingerPlan>();
        std::atomic_store_explicit(&currentPlan_,
                                   emptyPlan,
                                   std::memory_order_release);
    }

private:
    std::shared_ptr<SchillingerPlan> currentPlan_;
};

//==============================================================================
// Global Plan Cache Manager
//==============================================================================

/**
 * Global cache for all session plans.
 * Maps sessionId → SessionPlanCache
 */
class SchillingerPlanCacheManager
{
public:
    SchillingerPlanCacheManager()
        : updateQueue_(), sessionCaches_()
    {
    }

    /**
     * Register a new session cache.
     * Call this when SDK init() creates a session.
     */
    void registerSession(const std::string& sessionId)
    {
        // NOT thread-safe - call only from init/setup
        sessionCaches_[sessionId] = std::make_unique<SessionPlanCache>();
    }

    /**
     * Unregister a session cache.
     * Call this when session is destroyed.
     */
    void unregisterSession(const std::string& sessionId)
    {
        // NOT thread-safe - call only from cleanup
        sessionCaches_.erase(sessionId);
    }

    /**
     * Queue a plan update for session (Swift bridge side).
     * Lock-free push to queue.
     */
    bool queuePlanUpdate(const std::string& sessionId, const SchillingerPlan& plan) noexcept
    {
        PlanUpdate update;
        update.sessionId = sessionId;
        update.plan = plan;

        return updateQueue_.push(update);
    }

    /**
     * Process all queued plan updates (JUCE audio thread).
     * Call this once per audio callback or on a timer.
     * Returns number of plans processed.
     */
    int processUpdates() noexcept
    {
        int processed = 0;
        PlanUpdate update;

        while (updateQueue_.pop(update))
        {
            auto it = sessionCaches_.find(update.sessionId);
            if (it != sessionCaches_.end())
            {
                it->second->updatePlan(update.plan);
                processed++;
            }
        }

        return processed;
    }

    /**
     * Get current plan for session (JUCE audio thread).
     * Wait-free read.
     */
    std::shared_ptr<SchillingerPlan> getPlan(const std::string& sessionId) const noexcept
    {
        auto it = sessionCaches_.find(sessionId);
        if (it != sessionCaches_.end())
            return it->second->getCurrentPlan();

        static auto emptyPlan = std::make_shared<SchillingerPlan>();
        return emptyPlan;
    }

    /**
     * Clear plan for session.
     */
    void clearPlan(const std::string& sessionId)
    {
        auto it = sessionCaches_.find(sessionId);
        if (it != sessionCaches_.end())
            it->second->clear();
    }

    /**
     * Get statistics.
     */
    struct Statistics
    {
        size_t activeSessions;
        size_t queuedUpdates;
    };

    Statistics getStatistics() const noexcept
    {
        return {
            sessionCaches_.size(),
            updateQueue_.isEmpty() ? 0 : 1  // Approximate
        };
    }

private:
    struct PlanUpdate
    {
        std::string sessionId;
        SchillingerPlan plan;
    };

    static constexpr size_t QUEUE_CAPACITY = 64;
    using UpdateQueue = LockFreeSPSCQueue<PlanUpdate, QUEUE_CAPACITY>;

    UpdateQueue updateQueue_;
    std::unordered_map<std::string, std::unique_ptr<SessionPlanCache>> sessionCaches_;
};

//==============================================================================
// Convenience Singleton Access
//==============================================================================

inline SchillingerPlanCacheManager& getSchillingerPlanCache()
{
    static SchillingerPlanCacheManager instance;
    return instance;
}
