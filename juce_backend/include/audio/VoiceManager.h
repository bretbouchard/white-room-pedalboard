/**
 * White Room Voice Manager
 *
 * Real-time safe, single-threaded SIMD voice management with voice stealing
 * and priority handling. Optimized for cache efficiency and deterministic timing.
 *
 * SPEC-005: Single-threaded SIMD implementation (no threading)
 */

#pragma once

#include <cstdint>
#include <string>
#include <memory>
#include <vector>
#include <array>

// SIMD intrinsics support
#if defined(__x86_64__) || defined(_M_X64) || defined(__i386__) || defined(_M_IX86)
    #define WHITE_ROOM_SIMD_SSE2
    #include <emmintrin.h>  // SSE2
    #define SIMD_ALIGNMENT 16
#elif defined(__aarch64__) || defined(_M_ARM64)
    #define WHITE_ROOM_SIMD_NEON
    #include <arm_neon.h>
    #define SIMD_ALIGNMENT 16
#else
    #define SIMD_ALIGNMENT 16
#endif

// Define non-copyable macro for C++11 compatibility
#define WHITE_ROOM_DECLARE_NON_COPYABLE(Class) \
    Class(const Class&) = delete; \
    Class& operator=(const Class&) = delete;

namespace white_room {
namespace audio {

// =============================================================================
// LOCK-FREE RING BUFFER (Single Producer, Single Consumer)
// =============================================================================

/**
 * Lock-free ring buffer for real-time safe audio I/O
 * Uses atomic index arithmetic for wait-free operation
 */
template<typename T, size_t Capacity>
class LockFreeRingBuffer {
public:
    LockFreeRingBuffer() : readIdx_(0), writeIdx_(0) {
        static_assert((Capacity & (Capacity - 1)) == 0,
                      "Capacity must be power of 2 for efficient masking");
    }

    /**
     * Write data to buffer (producer)
     * Returns true if successful, false if buffer full
     */
    bool write(const T* data, size_t count) {
        const size_t readIdx = readIdx_.load(std::memory_order_acquire);
        const size_t writeIdx = writeIdx_.load(std::memory_order_relaxed);

        const size_t available = Capacity - (writeIdx - readIdx);
        if (count > available) {
            return false;  // Buffer full
        }

        for (size_t i = 0; i < count; ++i) {
            buffer_[mask(writeIdx + i)] = data[i];
        }

        writeIdx_.store(writeIdx + count, std::memory_order_release);
        return true;
    }

    /**
     * Read data from buffer (consumer)
     * Returns actual number of items read
     */
    size_t read(T* dest, size_t count) {
        const size_t writeIdx = writeIdx_.load(std::memory_order_acquire);
        const size_t readIdx = readIdx_.load(std::memory_order_relaxed);

        const size_t available = writeIdx - readIdx;
        const size_t toRead = std::min(count, available);

        for (size_t i = 0; i < toRead; ++i) {
            dest[i] = buffer_[mask(readIdx + i)];
        }

        readIdx_.store(readIdx + toRead, std::memory_order_release);
        return toRead;
    }

    /**
     * Get available items to read
     */
    size_t available() const {
        return writeIdx_.load(std::memory_order_acquire) -
               readIdx_.load(std::memory_order_relaxed);
    }

    /**
     * Get free space for writing
     */
    size_t free() const {
        return Capacity - available();
    }

private:
    std::array<T, Capacity> buffer_;
    std::atomic<size_t> readIdx_;
    std::atomic<size_t> writeIdx_;

    static constexpr size_t mask(size_t index) {
        return index & (Capacity - 1);
    }
};

// =============================================================================
// VOICE STATE
// =============================================================================

/**
 * Voice priority levels
 */
enum class VoicePriority {
    Primary = 0,     // Highest priority (lead, main melody)
    Secondary = 1,   // Medium priority (harmony, pads)
    Tertiary = 2     // Lowest priority (texture, effects)
};

/**
 * Voice state
 */
enum class VoiceState {
    Idle,        // Voice is available
    Active,      // Voice is playing
    Releasing,   // Voice is in release phase
    Stolen       // Voice was stolen (rapid release)
};

/**
 * Stereo pan position (-1.0 to 1.0)
 */
struct PanPosition {
    float left;   // Left gain
    float right;  // Right gain

    /**
     * Constant-power pan law: sqrt(0.5 * (1 ± pan))
     * Ensures consistent perceived volume across stereo field
     */
    static PanPosition fromPan(float pan) {
        // Clamp pan to [-1.0, 1.0]
        pan = std::max(-1.0f, std::min(1.0f, pan));

        PanPosition result;
        result.left = std::sqrt(0.5f * (1.0f - pan));
        result.right = std::sqrt(0.5f * (1.0f + pan));
        return result;
    }
};

/**
 * Voice information
 */
struct VoiceInfo {
    int index;                    // Voice index
    VoiceState state;             // Current state
    VoicePriority priority;       // Voice priority
    int pitch;                    // Current pitch (MIDI note)
    int velocity;                 // Current velocity
    int64_t startTime;            // Start time (samples)
    int64_t stopTime;             // Scheduled stop time (samples)
    double duration;              // Duration (seconds)
    int role;                     // Ensemble role index
    float pan;                    // Pan position (-1.0 to 1.0)
    PanPosition panGains;         // Computed stereo gains

    VoiceInfo()
        : index(-1), state(VoiceState::Idle), priority(VoicePriority::Tertiary),
          pitch(0), velocity(0), startTime(0), stopTime(0), duration(0.0), role(-1),
          pan(0.0f), panGains{0.707f, 0.707f} {}  // Default center pan
};

// =============================================================================
// VOICE STEALING CONFIG
// =============================================================================

/**
 * Voice stealing policy
 */
enum class StealingPolicy {
    Oldest,        // Steal oldest active voice
    LowestPriority, // Steal lowest priority voice
    Quietest,      // Steal quietest voice (lowest velocity)
    Furthest      // Steal voice furthest from its start
};

/**
 * Voice manager configuration
 */
struct VoiceManagerConfig {
    int maxPolyphony;              // Maximum simultaneous voices
    int releaseTimeMs;            // Default release time (ms)
    StealingPolicy stealingPolicy; // Voice stealing policy
    bool enableStealing;           // Allow voice stealing

    VoiceManagerConfig()
        : maxPolyphony(32), releaseTimeMs(100),
          stealingPolicy(StealingPolicy::LowestPriority),
          enableStealing(true) {}
};

// =============================================================================
// SIMD BATCH PROCESSING
// =============================================================================

/**
 * SIMD batch of voices for cache-efficient processing
 * Processes 4-8 voices simultaneously using SIMD instructions
 */
struct SIMDVoiceBatch {
    static constexpr size_t BatchSize = 4;  // Process 4 voices at once

    float pitches[BatchSize];          // MIDI pitches
    float velocities[BatchSize];       // MIDI velocities
    float leftGains[BatchSize];        // Left channel gains
    float rightGains[BatchSize];       // Right channel gains
    int indices[BatchSize];            // Voice indices
    bool active[BatchSize];            // Active flags

    SIMDVoiceBatch() {
        for (size_t i = 0; i < BatchSize; ++i) {
            pitches[i] = 0.0f;
            velocities[i] = 0.0f;
            leftGains[i] = 0.0f;
            rightGains[i] = 0.0f;
            indices[i] = -1;
            active[i] = false;
        }
    }
};

// =============================================================================
// VOICE MANAGER
// =============================================================================

/**
 * Voice Manager
 *
 * Real-time safe, single-threaded polyphony management with SIMD batch
 * processing. Ensures deterministic timing and cache efficiency.
 *
 * SPEC-005: No threading, all processing on audio thread
 */
class VoiceManager {
public:
    explicit VoiceManager(const VoiceManagerConfig& config);
    ~VoiceManager();

    // -------------------------------------------------------------------------
    // VOICE ALLOCATION
    // -------------------------------------------------------------------------

    /**
     * Allocate a voice for note-on
     *
     * @param pitch MIDI pitch
     * @param velocity MIDI velocity
     * @param priority Voice priority
     * @param role Ensemble role index
     * @param startTime Start time (samples)
     * @param duration Duration (seconds)
     * @return Voice index, or -1 if no voices available
     */
    int allocateVoice(int pitch, int velocity, VoicePriority priority,
                     int role, int64_t startTime, double duration);

    /**
     * Release a voice (start note-off)
     *
     * @param voiceIndex Voice to release
     * @param releaseTime Release time (samples)
     */
    void releaseVoice(int voiceIndex, int64_t releaseTime);

    /**
     * Stop all voices immediately
     */
    void stopAllVoices();

    /**
     * Stop voice by role
     */
    void stopRoleVoices(int role);

    // -------------------------------------------------------------------------
    // VOICE STATE QUERIES
    // -------------------------------------------------------------------------

    /**
     * Get voice info
     */
    VoiceInfo getVoiceInfo(int voiceIndex) const;

    /**
     * Get all active voices
     */
    std::vector<VoiceInfo> getActiveVoices() const;

    /**
     * Get active voice count
     */
    int getActiveVoiceCount() const;

    /**
     * Get idle voice count
     */
    int getIdleVoiceCount() const;

    /**
     * Check if voice is active
     */
    bool isVoiceActive(int voiceIndex) const;

    // -------------------------------------------------------------------------
    // VOICE STEALING
    // -------------------------------------------------------------------------

    /**
     * Find voice to steal based on policy
     *
     * @param excludeRole Role to exclude from stealing (optional)
     * @return Voice index to steal, or -1 if none available
     */
    int findVoiceToSteal(int excludeRole = -1) const;

    /**
     * Set voice stealing policy
     */
    void setStealingPolicy(StealingPolicy policy);

    /**
     * Enable/disable voice stealing
     */
    void setStealingEnabled(bool enabled);

    // -------------------------------------------------------------------------
    // POLYPHONY MANAGEMENT
    // -------------------------------------------------------------------------

    /**
     * Set maximum polyphony
     */
    void setMaxPolyphony(int maxVoices);

    /**
     * Get maximum polyphony
     */
    int getMaxPolyphony() const { return config_.maxPolyphony; }

    /**
     * Get polyphony usage (0.0 to 1.0)
     */
    double getPolyphonyUsage() const;

    // -------------------------------------------------------------------------
    // TIME UPDATES (call from audio thread)
    // -------------------------------------------------------------------------

    /**
     * Update voice states based on current time
     * Called from audio thread - must be real-time safe
     *
     * @param currentTime Current sample time
     */
    void update(int64_t currentTime);

    /**
     * Clean up finished voices
     */
    void cleanupFinishedVoices();

    // -------------------------------------------------------------------------
    // SIMD BATCH PROCESSING (SPEC-005)
    // -------------------------------------------------------------------------

    /**
     * Process voices using SIMD batch operations
     * Improves cache efficiency and instruction-level parallelism
     *
     * @param batch SIMD voice batch to process
     * @param outputLeft Left channel output buffer
     * @param outputRight Right channel output buffer
     * @param numSamples Number of samples to process
     */
    void processSIMD(SIMDVoiceBatch& batch,
                     float* outputLeft,
                     float* outputRight,
                     int numSamples);

    /**
     * Get next SIMD batch of active voices
     * Groups voices for cache-efficient processing
     *
     * @param batch Output batch to fill
     * @param startIndex Starting voice index
     * @return Number of voices in batch, or 0 if no more active voices
     */
    int getNextSIMDBatch(SIMDVoiceBatch& batch, int startIndex = 0);

    /**
     * Process stereo output with constant-power panning
     * Applies SIMD horizontal mixing for efficiency
     *
     * @param batch Voice batch to mix
     * @param outputLeft Left output buffer
     * @param outputRight Right output buffer
     * @param numSamples Number of samples to process
     */
    void mixStereoOutput(const SIMDVoiceBatch& batch,
                        float* outputLeft,
                        float* outputRight,
                        int numSamples);

    /**
     * Set pan position for voice (constant-power law)
     *
     * @param voiceIndex Voice to pan
     * @param pan Pan position (-1.0 left, 0.0 center, 1.0 right)
     */
    void setVoicePan(int voiceIndex, float pan);

private:
    VoiceManagerConfig config_;
    std::vector<VoiceInfo> voices_;

    // Find idle voice
    int findIdleVoice() const;

    // Find voice to steal by specific policy
    int findOldestVoice(int excludeRole) const;
    int findLowestPriorityVoice(int excludeRole) const;
    int findQuietestVoice(int excludeRole) const;
    int findFurthestVoice(int excludeRole) const;

    WHITE_ROOM_DECLARE_NON_COPYABLE(VoiceManager)
};

} // namespace audio
} // namespace white_room
