/*
 * EventQueue.h
 *
 * Event scheduling and timing for playback
 *
 * Purpose: Schedule events at sample-accurate timing and deliver to instruments
 *
 * Design Constraints:
 *  - Sample-accurate timing (events scheduled to specific sample)
 *  - Real-time safe (no allocations during audio process)
 *  - Deterministic (same events = same output)
 *  - Priority queue for efficient scheduling
 *
 * Created: December 30, 2025
 * Source: JUCE Backend Handoff Directive
 */

#ifndef EVENT_QUEUE_H_INCLUDED
#define EVENT_QUEUE_H_INCLUDED

#include <cstdint>
#include <queue>
#include <vector>
#include <string>
#include <map>
#include "SongModel_v1.h"

// Forward declaration
namespace DSP {
    struct ScheduledEvent;
    class InstrumentDSP;
}

namespace Integration {

/**
 * @brief Event types matching DSP::ScheduledEvent::Type
 */
enum class EventType : uint32_t {
    NOTE_ON,
    NOTE_OFF,
    PARAM_CHANGE,
    PITCH_BEND,
    CHANNEL_PRESSURE,
    CONTROL_CHANGE,
    PROGRAM_CHANGE,
    TEMPO_CHANGE,
    TIME_SIGNATURE_CHANGE,
    TRANSPORT_START,
    TRANSPORT_STOP,
    TRANSPORT_SEEK,
    RESET
};

/**
 * @brief Queued event with absolute time
 *
 * Events are scheduled at absolute time (in seconds) and
 * processed when the playhead reaches that time.
 */
struct QueuedEvent {
    double time;                 // Absolute time in seconds
    uint64_t sampleIndex;        // Sample index (time * sampleRate)
    EventType type;

    // Target (which instrument/track receives this event)
    std::string targetTrackId;    // Track to send event to
    std::string targetInstrumentId; // Instrument within track

    // Event data (same as DSP::ScheduledEvent)
    union {
        struct {
            int midiNote;
            float velocity;
        } note;

        struct {
            const char* paramId;
            float value;
        } param;

        struct {
            float bendValue;      // -1.0 to +1.0
        } pitchBend;

        struct {
            float pressure;       // 0.0 to 1.0
        } channelPressure;

        struct {
            int controllerNumber;
            float value;
        } controlChange;

        struct {
            int programNumber;
        } programChange;

        struct {
            double tempo;         // BPM
        } tempoChange;

        struct {
            int upper;            // Time signature numerator
            int lower;            // Time signature denominator
        } timeSignatureChange;

        struct {
            double position;      // Seek position in seconds
        } transportSeek;
    } data;

    // Priority queue comparison (earlier events first)
    bool operator>(const QueuedEvent& other) const {
        return time > other.time;
    }
};

/**
 * @brief Event queue for sample-accurate scheduling
 *
 * Manages scheduling and delivery of events to instruments.
 * Events are scheduled at absolute time and processed when
 * the playhead reaches that time.
 *
 * Usage:
 *   EventQueue queue;
 *   queue.scheduleEvent(noteOnEvent);
 *   queue.processEvents(currentTime, instruments);
 */
class EventQueue {
public:
    EventQueue();
    ~EventQueue();

    /**
     * @brief Initialize event queue
     *
     * @param sampleRate Sample rate in Hz
     * @return true if initialization succeeded
     */
    bool initialize(double sampleRate);

    /**
     * @brief Reset queue (clear all events)
     */
    void reset();

    /**
     * @brief Schedule an event
     *
     * Adds event to queue at specified time.
     * Events are sorted by time (earliest first).
     *
     * @param event Event to schedule
     * @return true if event was scheduled
     */
    bool scheduleEvent(const QueuedEvent& event);

    /**
     * @brief Schedule multiple events
     *
     * Batch schedule for efficiency.
     *
     * @param events Events to schedule
     * @return Number of events scheduled
     */
    int scheduleEvents(const std::vector<QueuedEvent>& events);

    /**
     * @brief Process events for current time
     *
     * Processes all events scheduled between lastTime and currentTime.
     * Delivers events to target instruments via handleEvent().
     *
     * @param currentTime Current playhead position in seconds
     * @param instruments Map of track ID to InstrumentDSP
     *
     * Thread safety: Called from audio thread only.
     */
    void processEvents(double currentTime,
                       const std::map<std::string, DSP::InstrumentDSP*>& instruments);

    /**
     * @brief Clear all events
     *
     * Removes all scheduled events.
     */
    void clear();

    /**
     * @brief Get event count
     *
     * @return Number of events currently scheduled
     */
    int getEventCount() const;

    /**
     * @brief Get next event time
     *
     * @return Time of next scheduled event, or -1 if no events
     */
    double getNextEventTime() const;

    /**
     * @brief Set quantization
     *
     * Events are quantized to specified grid (optional).
     * Set to 0.0 to disable quantization.
     *
     * @param quantization Quantization in seconds (e.g., 0.25 for 16th notes at 120bpm)
     */
    void setQuantization(double quantization);

    /**
     * @brief Get quantization setting
     *
     * @return Quantization in seconds, or 0.0 if disabled
     */
    double getQuantization() const;

private:
    double sampleRate_;
    double currentTime_;
    double quantization_;

    // Event queue (priority queue, earliest events first)
    std::priority_queue<QueuedEvent, std::vector<QueuedEvent>, std::greater<QueuedEvent>> events_;

    // Helper methods
    DSP::ScheduledEvent convertToDSPEvent(const QueuedEvent& queuedEvent) const;
    double quantizeTime(double time) const;
};

/**
 * @brief Event batch for efficient scheduling
 *
 * Container for scheduling multiple events at once.
 * Used by SDK to send events from SongModel.
 */
struct EventBatch {
    std::vector<QueuedEvent> events;
    double startTime;  // Start time for this batch
    double duration;   // Duration of this batch

    EventBatch() : startTime(0.0), duration(0.0) {}

    /**
     * @brief Add event to batch
     *
     * @param event Event to add
     */
    void addEvent(const QueuedEvent& event) {
        events.push_back(event);
    }

    /**
     * @brief Sort events by time
     *
     * Ensures events are in chronological order before scheduling.
     */
    void sort() {
        std::sort(events.begin(), events.end(),
                  [](const QueuedEvent& a, const QueuedEvent& b) {
                      return a.time < b.time;
                  });
    }

    /**
     * @brief Clear all events
     */
    void clear() {
        events.clear();
    }
};

/**
 * @brief Create event batch from MIDI file (future)
 *
 * Parses MIDI file and creates EventBatch.
 *
 * @param midiData MIDI file data
 * @param tempo Tempo in BPM
 * @return EventBatch with all MIDI events
 */
EventBatch createEventBatchFromMIDI(const std::vector<uint8_t>& midiData, double tempo);

/**
 * @brief Create event batch from SDK note data (future)
 *
 * Converts SDK note representation to EventBatch.
 *
 * @param notes SDK note data
 * @return EventBatch with all note events
 */
EventBatch createEventBatchFromNotes(const std::vector<NoteData>& notes);

} // namespace Integration

#endif // EVENT_QUEUE_H_INCLUDED
