/*
  ==============================================================================

    ParameterTelemetryRecorder.h
    Created: January 13, 2026
    Author: Claude Code (white_room-179)

    Audio-thread-safe parameter change recording for UI telemetry

  ==============================================================================
*/

#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include <juce_core/juce_core.h>
#include <atomic>
#include <memory>
#include <string>

//==============================================================================
// Parameter Change Event
//==============================================================================

/**
 * Represents a single parameter change event for telemetry.
 *
 * Captured from JUCE audio thread and queued for serialization.
 * Matches the data model specification in:
 * plans/ui-telemetry-constraints-testing/data-model.md
 */
struct ParameterChangeEvent {
    /// Unique event identifier (UUID)
    juce::String eventID;

    /// Parameter identifier (e.g., "op1_ratio", "masterVolume")
    juce::String parameterID;

    /// Previous value before change
    float previousValue;

    /// New value after change
    float newValue;

    /// Absolute change magnitude
    float delta;

    /// Whether this change is from an undo operation
    bool isUndo;

    /// Duration of parameter adjustment (ms)
    /// 0 for instantaneous changes, >0 for continuous adjustments
    int durationMs;

    /// Unix timestamp in milliseconds
    int64 timestampMs;

    /// Default constructor
    ParameterChangeEvent()
        : previousValue(0.0f)
        , newValue(0.0f)
        , delta(0.0f)
        , isUndo(false)
        , durationMs(0)
        , timestampMs(0) {
    }

    /// Constructor with all fields
    ParameterChangeEvent(
        const juce::String& eventID_,
        const juce::String& parameterID_,
        float previousValue_,
        float newValue_,
        bool isUndo_,
        int durationMs_
    ) : eventID(eventID_)
      , parameterID(parameterID_)
      , previousValue(previousValue_)
      , newValue(newValue_)
      , delta(std::abs(newValue_ - previousValue_))
      , isUndo(isUndo_)
      , durationMs(durationMs_)
      , timestampMs(juce::Time::currentTimeMillis()) {
    }

    /// Convert to JSON for serialization
    juce::String toJSON() const {
        juce::String json = "{";
        json += "\"event_type\":\"parameter_change\",";
        json += "\"event_id\":\"" + eventID + "\",";
        json += "\"parameter_id\":\"" + parameterID + "\",";
        json += "\"previous_value\":" + juce::String(previousValue, 6) + ",";
        json += "\"new_value\":" + juce::String(newValue, 6) + ",";
        json += "\"delta\":" + juce::String(delta, 6) + ",";
        json += "\"is_undo\":" + juce::String(isUndo ? "true" : "false") + ",";
        json += "\"duration_ms\":" + juce::String(durationMs) + ",";
        json += "\"timestamp_ms\":" + juce::String(timestampMs);
        json += "}";
        return json;
    }
};

//==============================================================================
// Lock-Free Parameter Event Queue
//==============================================================================

/**
 * Lock-free queue for parameter change events from audio thread.
 *
 * Uses juce::AbstractFifo for thread-safe ring buffer operations.
 * Events are queued from audio thread and flushed from message thread.
 */
class ParameterEventQueue {
public:
    /**
     * Creates a parameter event queue with specified capacity.
     *
     * @param capacity Maximum number of events (must be power of 2)
     */
    explicit ParameterEventQueue(int capacity = 256)
        : fifo(capacity) {
        jassert(capacity > 0 && juce::isPowerOfTwo(capacity),
                "Capacity must be a positive power of 2");
        buffer.insertMultiple(0, ParameterChangeEvent(), capacity);
    }

    /**
     * Queue a parameter change event (call from any thread).
     *
     * Thread-safe: Can be called from audio thread.
     *
     * @param event Parameter change event to queue
     * @return true if event was queued, false if queue is full
     */
    bool push(const ParameterChangeEvent& event) {
        int start1, size1, start2, size2;
        fifo.prepareToWrite(1, start1, size1, start2, size2);

        if (size1 == 0) {
            // Queue is full
            return false;
        }

        buffer[start1] = event;
        fifo.finishedWrite(size1 != 0 ? 1 : 1 + size2);

        return true;
    }

    /**
     * Pop events from queue (call from message thread).
     *
     * Thread-safe: Should only be called from one consumer thread.
     *
     * @param output Destination array for popped events
     * @param maxEvents Maximum number of events to pop
     * @return Number of events actually popped
     */
    int pop(ParameterChangeEvent* output, int maxEvents) {
        int start1, size1, start2, size2;
        fifo.prepareToRead(maxEvents, start1, size1, start2, size2);

        int totalRead = size1 + size2;

        if (totalRead == 0) {
            return 0;
        }

        // Read first block
        if (size1 > 0) {
            memcpy(output, buffer.begin() + start1, size1 * sizeof(ParameterChangeEvent));
        }

        // Read second block (if wrapped)
        if (size2 > 0) {
            memcpy(output + size1, buffer.begin(), size2 * sizeof(ParameterChangeEvent));
        }

        fifo.finishedRead(totalRead);
        return totalRead;
    }

    /**
     * Get the number of events currently in the queue.
     */
    int getNumEvents() const {
        return fifo.getNumReady();
    }

    /**
     * Check if the queue is empty.
     */
    bool isEmpty() const {
        return fifo.getNumReady() == 0;
    }

private:
    juce::AbstractFifo fifo;
    juce::Array<ParameterChangeEvent> buffer;
};

//==============================================================================
// Parameter Telemetry Recorder
//==============================================================================

/**
 * Records parameter changes from JUCE AudioProcessorValueTreeState.
 *
 * IMPLEMENTATION:
 * - Implements AudioProcessorValueTreeState::Listener interface
 * - Queues events to lock-free queue from parameterChanged callback
 * - Provides flush method for message thread serialization
 *
 * USAGE:
 * 1. Create instance with reference to AudioProcessorValueTreeState
 * 2. Add as listener: parameters->addListener(&recorder)
 * 3. In audio callback: events are automatically queued
 * 4. In message thread: call flushEvents() to serialize
 *
 * THREAD SAFETY:
 * - parameterChanged() called from audio thread (must be lock-free)
 * - flushEvents() called from message thread
 * - Queue operations use juce::AbstractFifo (wait-free)
 */
class ParameterTelemetryRecorder : public juce::AudioProcessorValueTreeState::Listener {
public:
    /**
     * Creates a telemetry recorder with specified queue capacity.
     *
     * @param capacity Maximum number of events to buffer (power of 2)
     */
    explicit ParameterTelemetryRecorder(int capacity = 256)
        : queue(capacity) {
    }

    ~ParameterTelemetryRecorder() override = default;

    //==========================================================================
    // AudioProcessorValueTreeState::Listener Interface
    //==========================================================================

    /**
     * Called when a parameter value changes.
     *
     * IMPORTANT: This is called from the AUDIO THREAD.
     * Must be wait-free and non-blocking.
     *
     * @param parameterID Parameter that changed
     * @param newValue New parameter value
     */
    void parameterChanged(const juce::String& parameterID, float newValue) override {
        // Get previous value (if we have tracking for this parameter)
        float previousValue = getPreviousValue(parameterID);

        // Calculate duration of adjustment
        int durationMs = calculateDurationMs(parameterID);

        // Check if this is an undo operation
        // TODO: Integrate with undo manager when available
        bool isUndo = false;

        // Generate event ID (UUID)
        juce::String eventID = juce::Uuid().toString();

        // Create event
        ParameterChangeEvent event(
            eventID,
            parameterID,
            previousValue,
            newValue,
            isUndo,
            durationMs
        );

        // Queue event (non-blocking, drops if full)
        bool queued = queue.push(event);

        if (!queued) {
            // Queue full - drop event and log
            // In production, this should be rate-limited
            DBG("ParameterTelemetryRecorder: Queue full, dropped event for " + parameterID);
        } else {
            // Update previous value tracking
            updatePreviousValue(parameterID, newValue);
        }
    }

    //==========================================================================
    // Event Flushing (Message Thread)
    //==========================================================================

    /**
     * Flush queued events to JSONL format for serialization.
     *
     * IMPORTANT: This should be called from the MESSAGE THREAD.
     *
     * @param maxEvents Maximum number of events to flush (0 = all)
     * @return JSONL string with serialized events
     */
    juce::String flushEvents(int maxEvents = 0) {
        if (maxEvents <= 0) {
            maxEvents = queue.getNumEvents();
        }

        juce::Array<ParameterChangeEvent> events;
        events.ensureStorageAllocated(maxEvents);

        int numEvents = queue.pop(events.getRawDataPointer(), maxEvents);

        if (numEvents == 0) {
            return {};
        }

        // Serialize to JSONL format
        juce::String jsonl;
        for (int i = 0; i < numEvents; ++i) {
            jsonl += events[i].toJSON();
            jsonl += "\n";
        }

        return jsonl;
    }

    /**
     * Check if there are events pending to flush.
     *
     * @return Number of queued events
     */
    int getNumQueuedEvents() const {
        return queue.getNumEvents();
    }

private:
    //==========================================================================
    // Previous Value Tracking
    //==========================================================================

    /**
     * Get the previous value for a parameter.
     */
    float getPreviousValue(const juce::String& parameterID) {
        const juce::GenericScopedLock<juce::SpinLock> lock(previousValuesLock);
        auto it = previousValues.find(parameterID);
        if (it != previousValues.end()) {
            return it->second;
        }
        return 0.0f; // Default if no previous value
    }

    /**
     * Update the previous value for a parameter.
     */
    void updatePreviousValue(const juce::String& parameterID, float value) {
        const juce::GenericScopedLock<juce::SpinLock> lock(previousValuesLock);
        previousValues[parameterID] = value;
    }

    //==========================================================================
    // Duration Calculation
    //==========================================================================

    /**
     * Calculate duration of parameter adjustment in milliseconds.
     *
     * This is a simplified implementation. A more sophisticated version
     * would track the start time of each parameter interaction.
     *
     * For now, returns 0 (instantaneous change).
     *
     * TODO: Implement interaction duration tracking for continuous knobs/sliders
     */
    int calculateDurationMs(const juce::String& parameterID) {
        juce::ignoreUnused(parameterID);
        return 0; // Instantaneous for now
    }

    //==========================================================================
    // Member Variables
    //==========================================================================

    /// Lock-free queue for parameter events
    ParameterEventQueue queue;

    /// Map of previous parameter values (for delta calculation)
    juce::HashMap<juce::String, float> previousValues;

    /// Spin lock for previous values map
    juce::SpinLock previousValuesLock;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ParameterTelemetryRecorder)
};
