/**
 * White Room Voice Manager
 *
 * Polyphony management with voice stealing and priority handling.
 * Ensures optimal voice allocation for ensemble playback.
 *
 * T018: Implement Voice Manager
 */

#pragma once

#include <cstdint>
#include <string>
#include <memory>
#include <vector>
#include <array>

// Define non-copyable macro for C++11 compatibility
#define WHITE_ROOM_DECLARE_NON_COPYABLE(Class) \
    Class(const Class&) = delete; \
    Class& operator=(const Class&) = delete;

namespace white_room {
namespace audio {

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

    VoiceInfo()
        : index(-1), state(VoiceState::Idle), priority(VoicePriority::Tertiary),
          pitch(0), velocity(0), startTime(0), stopTime(0), duration(0.0), role(-1) {}
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
// VOICE MANAGER
// =============================================================================

/**
 * Voice Manager
 *
 * Manages polyphonic voice allocation with intelligent voice stealing.
 * Ensures fair distribution of voices across ensemble roles.
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
