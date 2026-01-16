/*
  ==============================================================================

    Scheduler.h
    Created: 15 Jan 2026
    Author:  White Room Project

    Timeline-based scheduler with lookahead, sample-accurate timing,
    and lock-free queue for main → audio thread communication.

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "audio_pipeline/NoteEventGenerator.h"
#include <memory>
#include <atomic>
#include <vector>

namespace Schillinger::AudioPipeline
{

    //==============================================================================
    /**
        Scheduled event for the audio pipeline.

        Contains a note event with additional scheduling metadata for
        precise timing and loop point handling.
    */
    struct ScheduledEvent
    {
        /** The note event to schedule */
        NoteEvent event;

        /** Scheduled sample time (may be adjusted for loop points) */
        int64_t scheduledTime;

        /** Whether this event has been processed */
        std::atomic<bool> processed{false};

        //==============================================================================
        ScheduledEvent()
            : scheduledTime(0)
        {}

        ScheduledEvent(const NoteEvent& evt, int64_t time)
            : event(evt)
            , scheduledTime(time)
        {}
    };

    //==============================================================================
    /**
        Lock-free queue for main → audio thread communication.

        Uses JUCE's lock-free FIFO for real-time safe communication
        between threads. Events are pushed from the main thread and
        popped from the audio thread.

        Capacity: 2048 events (configurable)
    */
    class LockFreeEventQueue
    {
    public:
        //==============================================================================
        explicit LockFreeEventQueue(int capacity = 2048);
        ~LockFreeEventQueue();

        //==============================================================================
        /** Push an event from main thread (real-time safe) */
        bool push(const ScheduledEvent& event);

        /** Pop an event from audio thread (real-time safe) */
        bool pop(ScheduledEvent& event);

        /** Get number of events in queue */
        int getNumEvents() const noexcept { return fifo.getTotalSize() - fifo.getFreeSpace(); }

        /** Check if queue is empty */
        bool isEmpty() const noexcept { return getNumEvents() == 0; }

        /** Clear all events */
        void clear();

    private:
        //==============================================================================
        juce::AbstractFifo fifo;
        std::vector<ScheduledEvent> buffer;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(LockFreeEventQueue)
    };

    //==============================================================================
    /**
        Timeline-based scheduler for audio pipeline.

        Responsibilities:
        - Schedule events 200ms ahead (default lookahead)
        - Sample-accurate timing
        - Lock-free queue for main → audio thread
        - Handle tempo changes
        - Support loop points

        Thread Safety:
        - Audio thread: process(), getNextEvent()
        - Main thread: schedule(), setTempo(), setLoopPoints()

        Usage:
        1. Call prepare() with audio specs
        2. From main thread: call schedule() with timeline
        3. From audio thread: call process() and getNextEvent()
    */
    class Scheduler
    {
    public:
        //==============================================================================
        static constexpr int DEFAULT_LOOKAHEAD_MS = 200;
        static constexpr int DEFAULT_QUEUE_CAPACITY = 2048;

        //==============================================================================
        Scheduler();
        ~Scheduler();

        //==============================================================================
        /** Prepare for processing with audio specs */
        void prepare(double sampleRate, int maximumBlockSize);

        /** Reset scheduler state */
        void reset();

        //==============================================================================
        /**
            Schedule events from timeline (called from main thread).

            Converts timeline to events and schedules them with lookahead.
            Events are pushed to lock-free queue for audio thread.

            @param timeline TimelineIR with tempo and timing
            @param events   Vector of note events to schedule
        */
        void schedule(const TimelineIR& timeline, const std::vector<NoteEvent>& events);

        /**
            Process audio buffer (called from audio thread).

            Updates current sample position and handles loop points.
            Call getNextEvent() after this to retrieve due events.

            @param numSamples Number of samples in current block
        */
        void process(int numSamples) noexcept;

        /**
            Get next event that is due (called from audio thread).

            Returns events whose scheduledTime <= currentSampleTime.
            Call this after process() to get events for current block.

            @param event Output parameter for next event
            @return true if event was retrieved
        */
        bool getNextEvent(ScheduledEvent& event) noexcept;

        //==============================================================================
        /** Set tempo (called from main thread) */
        void setTempo(float newTempo);

        /** Get current tempo */
        float getTempo() const noexcept { return tempo.load(std::memory_order_relaxed); }

        //==============================================================================
        /** Set loop points (called from main thread) */
        void setLoopPoints(int64_t startSample, int64_t endSample);

        /** Enable/disable looping */
        void setLooping(bool shouldLoop) noexcept { loopingEnabled = shouldLoop; }

        /** Check if looping is enabled */
        bool isLooping() const noexcept { return loopingEnabled.load(std::memory_order_relaxed); }

        /** Clear loop points (disable looping) */
        void clearLoopPoints();

        //==============================================================================
        /** Set lookahead time in milliseconds */
        void setLookahead(int lookaheadMs) noexcept;

        /** Get lookahead time in milliseconds */
        int getLookahead() const noexcept { return lookaheadMs; }

        /** Get lookahead in samples */
        int64_t getLookaheadSamples() const noexcept { return lookaheadSamples; }

        //==============================================================================
        /** Get current sample position */
        int64_t getCurrentSample() const noexcept { return currentSample.load(std::memory_order_relaxed); }

        /** Check if scheduler is ready */
        bool isReady() const noexcept { return prepared; }

    private:
        //==============================================================================
        // Audio parameters
        double sampleRate = 44100.0;
        int maximumBlockSize = 512;
        bool prepared = false;

        // Timing
        std::atomic<int64_t> currentSample{0};
        std::atomic<float> tempo{120.0f};
        int lookaheadMs = DEFAULT_LOOKAHEAD_MS;
        int64_t lookaheadSamples = 0;

        // Loop points
        std::atomic<bool> loopingEnabled{false};
        std::atomic<int64_t> loopStart{0};
        std::atomic<int64_t> loopEnd{0};

        // Event queue (main → audio thread)
        std::unique_ptr<LockFreeEventQueue> eventQueue;

        // Local buffer for events in current block
        std::vector<ScheduledEvent> currentBlockEvents;

        //==============================================================================
        /** Calculate lookahead samples from sample rate */
        void updateLookaheadSamples();

        /** Check if we need to loop back to start */
        bool shouldLoop() const noexcept;

        /** Handle loop point wrapping */
        void handleLoop() noexcept;

        /** Get sample time for event scheduling with lookahead */
        int64_t getScheduleTime(const NoteEvent& event) const noexcept;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(Scheduler)
    };

} // namespace Schillinger::AudioPipeline
