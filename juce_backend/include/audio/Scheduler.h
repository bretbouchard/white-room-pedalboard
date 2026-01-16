/**
 * White Room Audio Scheduler
 *
 * Timeline-based scheduler with lookahead for sample-accurate timing.
 * Implements lock-free queue between main thread and audio thread.
 *
 * T017: Implement Scheduler
 */

#pragma once

#include <cstdint>
#include <string>
#include <memory>
#include <atomic>
#include <vector>
#include <mutex>

// Forward declarations to minimize JUCE dependencies
namespace juce {
    class String;
}

// Use std::string instead of juce::String where possible
using string = std::string;

// Define non-copyable macro for C++11 compatibility
#define WHITE_ROOM_DECLARE_NON_COPYABLE(Class) \
    Class(const Class&) = delete; \
    Class& operator=(const Class&) = delete;

namespace white_room {
namespace audio {

// =============================================================================
// TIMELINE EVENT
// =============================================================================

/**
 * Event types
 */
enum class EventType {
    NoteOn,
    NoteOff,
    Parameter,
    Custom
};

/**
 * Event data union for efficient storage
 */
union EventData {
    int pitch;              // For NoteOn/NoteOff
    double value;           // For Parameter changes
    void* custom;           // For custom event data

    EventData() : custom(nullptr) {}
    EventData(int p) : pitch(p) {}
    EventData(double v) : value(v) {}
};

/**
 * Scheduled event for precise timing
 */
struct TimelineEvent {
    int64_t sampleTime;      // Absolute sample time
    EventType type;          // Event type
    EventData data;          // Event data (type-dependent)
    int voiceIndex;          // Target voice (-1 for all/none)
    bool processed;          // Has this event been processed?

    TimelineEvent() : sampleTime(0), type(EventType::Custom), voiceIndex(-1), processed(false) {}
    TimelineEvent(int64_t time, EventType t, const EventData& d, int voice = -1)
        : sampleTime(time), type(t), data(d), voiceIndex(voice), processed(false) {}
};

// =============================================================================
// LOCK-FREE EVENT QUEUE
// =============================================================================

/**
 * Lock-free single-producer single-consumer queue for events
 * Uses circular buffer with atomic indices
 */
class LockFreeEventQueue {
public:
    explicit LockFreeEventQueue(int capacity = 1024);
    ~LockFreeEventQueue();

    /**
     * Push event from main thread (producer)
     * Returns false if queue is full
     */
    bool push(const TimelineEvent& event);

    /**
     * Pop event from audio thread (consumer)
     * Returns false if queue is empty
     */
    bool pop(TimelineEvent& event);

    /**
     * Get number of events in queue
     * Approximate, use for monitoring only
     */
    int size() const { return size_.load(std::memory_order_relaxed); }

    /**
     * Check if queue is empty
     */
    bool isEmpty() const { return size_.load(std::memory_order_relaxed) == 0; }

private:
    std::unique_ptr<TimelineEvent[]> buffer_;
    const int capacity_;
    std::atomic<int> writeIndex_{0};
    std::atomic<int> readIndex_{0};
    std::atomic<int> size_{0};

    WHITE_ROOM_DECLARE_NON_COPYABLE(LockFreeEventQueue)
};

// =============================================================================
// SCHEDULER
// =============================================================================

/**
 * Playback state
 */
enum class PlaybackState {
    Stopped,
    Playing,
    Paused
};

/**
 * Transport position
 */
struct TransportPosition {
    int64_t sampleTime;      // Current sample position
    double tempo;            // Current tempo (BPM)
    int timeSignatureNum;    // Time signature numerator
    int timeSignatureDen;    // Time signature denominator
    double musicalPosition;  // Position in beats
    int bar;                 // Current bar
    int beat;                // Current beat within bar
    int tick;                // Current tick within beat

    TransportPosition()
        : sampleTime(0), tempo(120.0), timeSignatureNum(4), timeSignatureDen(4),
          musicalPosition(0.0), bar(1), beat(1), tick(0) {}
};

/**
 * Scheduler configuration
 */
struct SchedulerConfig {
    double sampleRate;           // Sample rate in Hz
    int bufferSize;              // Buffer size
    double lookaheadMs;          // Lookahead time in milliseconds
    int maxPolyphony;            // Maximum polyphonic voices

    SchedulerConfig()
        : sampleRate(48000.0), bufferSize(512), lookaheadMs(200.0), maxPolyphony(32) {}
};

/**
 * Timeline-based scheduler
 *
 * Manages event scheduling with lookahead for smooth playback.
 * Thread-safe between main thread (scheduling) and audio thread (processing).
 */
class Scheduler {
public:
    explicit Scheduler(const SchedulerConfig& config);
    ~Scheduler();

    // -------------------------------------------------------------------------
    // TRANSPORT CONTROL
    // -------------------------------------------------------------------------

    /**
     * Start playback from current position
     */
    void play();

    /**
     * Pause playback
     */
    void pause();

    /**
     * Stop playback and reset to beginning
     */
    void stop();

    /**
     * Seek to sample position (sample-accurate)
     */
    void seek(int64_t sampleTime);

    /**
     * Set tempo (BPM)
     */
    void setTempo(double tempo);

    /**
     * Set time signature
     */
    void setTimeSignature(int num, int den);

    /**
     * Get current playback state
     */
    PlaybackState getPlaybackState() const {
        return state_.load(std::memory_order_acquire);
    }

    /**
     * Get current transport position (thread-safe copy)
     */
    TransportPosition getTransportPosition() const;

    // -------------------------------------------------------------------------
    // EVENT SCHEDULING (main thread)
    // -------------------------------------------------------------------------

    /**
     * Schedule event at absolute sample time
     * Thread-safe: can be called from main thread
     */
    bool scheduleEvent(const TimelineEvent& event);

    /**
     * Schedule note-on event
     * Convenience method for MIDI-style note scheduling
     */
    bool scheduleNoteOn(int voice, int pitch, int velocity, int64_t sampleTime);

    /**
     * Schedule note-off event
     * Convenience method for MIDI-style note scheduling
     */
    bool scheduleNoteOff(int voice, int pitch, int64_t sampleTime);

    /**
     * Schedule parameter change
     */
    bool scheduleParameterChange(int voice, int paramId, float value, int64_t sampleTime);

    /**
     * Clear all scheduled events
     */
    void clearEvents();

    /**
     * Clear events for specific voice
     */
    void clearVoiceEvents(int voice);

    // -------------------------------------------------------------------------
    // AUDIO PROCESSING (audio thread)
    // -------------------------------------------------------------------------

    /**
     * Process events for current buffer
     * Called from audio thread - must be real-time safe
     *
     * @param samplesToProcess Number of samples in current buffer
     * @return Vector of events to process this buffer
     */
    std::vector<TimelineEvent> processEvents(int samplesToProcess);

    /**
     * Get events scheduled for next buffer (lookahead)
     * Called from main thread to pre-schedule events
     */
    std::vector<TimelineEvent> getLookaheadEvents();

    // -------------------------------------------------------------------------
    // LOOP POINTS
    // -------------------------------------------------------------------------

    /**
     * Set loop points
     * @param startSample Loop start sample (inclusive)
     * @param endSample Loop end sample (exclusive), or 0 to disable looping
     */
    void setLoopPoints(int64_t startSample, int64_t endSample);

    /**
     * Clear loop
     */
    void clearLoop();

    /**
     * Get loop points
     */
    struct LoopPoints {
        bool enabled;
        int64_t startSample;
        int64_t endSample;
    };

    LoopPoints getLoopPoints() const;

private:
    // Scheduler config
    SchedulerConfig config_;

    // Transport state
    std::atomic<PlaybackState> state_{PlaybackState::Stopped};
    TransportPosition position_;

    // Event storage (sorted by sample time)
    std::vector<TimelineEvent> events_;
    mutable std::mutex eventsMutex_;  // Protects events_ vector

    // Lock-free queue for main → audio thread communication
    std::unique_ptr<LockFreeEventQueue> eventQueue_;

    // Loop points
    LoopPoints loop_;

    // Internal helpers
    void updateMusicalPosition();
    int64_t samplesPerBeat() const;
    void checkLoop();

    WHITE_ROOM_DECLARE_NON_COPYABLE(Scheduler)
};

} // namespace audio
} // namespace white_room
