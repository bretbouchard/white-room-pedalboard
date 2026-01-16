/*
  ==============================================================================

    Scheduler.cpp
    Created: 15 Jan 2026
    Author:  White Room Project

    Implementation of timeline-based scheduler with lookahead.

  ==============================================================================
*/

#include "audio_pipeline/Scheduler.h"
#include <algorithm>

namespace Schillinger::AudioPipeline
{

    //==============================================================================
    // LockFreeEventQueue Implementation
    //==============================================================================

    LockFreeEventQueue::LockFreeEventQueue(int capacity)
        : fifo(capacity)
        , buffer(capacity)
    {
    }

    LockFreeEventQueue::~LockFreeEventQueue() = default;

    bool LockFreeEventQueue::push(const ScheduledEvent& event)
    {
        const auto scope = fifo.write(1);
        if (scope.blockSize1 + scope.blockSize2 < 1)
            return false; // Queue full

        buffer[scope.startIndex1] = event;
        return true;
    }

    bool LockFreeEventQueue::pop(ScheduledEvent& event)
    {
        const auto scope = fifo.read(1);
        if (scope.blockSize1 + scope.blockSize2 < 1)
            return false; // Queue empty

        event = buffer[scope.startIndex1];
        return true;
    }

    void LockFreeEventQueue::clear()
    {
        fifo.reset();
    }

    //==============================================================================
    // Scheduler Implementation
    //==============================================================================

    Scheduler::Scheduler()
        : eventQueue(std::make_unique<LockFreeEventQueue>(DEFAULT_QUEUE_CAPACITY))
    {
    }

    Scheduler::~Scheduler() = default;

    void Scheduler::prepare(double newSampleRate, int newMaximumBlockSize)
    {
        sampleRate = newSampleRate;
        maximumBlockSize = newMaximumBlockSize;
        prepared = true;

        updateLookaheadSamples();

        // Pre-allocate current block events buffer
        currentBlockEvents.reserve(maximumBlockSize * 4); // Estimated max events per block
    }

    void Scheduler::reset()
    {
        currentSample.store(0, std::memory_order_relaxed);
        tempo.store(120.0f, std::memory_order_relaxed);
        loopingEnabled.store(false, std::memory_order_relaxed);
        loopStart.store(0, std::memory_order_relaxed);
        loopEnd.store(0, std::memory_order_relaxed);

        eventQueue->clear();
        currentBlockEvents.clear();
    }

    void Scheduler::schedule(const TimelineIR& timeline, const std::vector<NoteEvent>& events)
    {
        if (!prepared)
        {
            jassertfalse;
            return;
        }

        // Schedule each event with lookahead
        for (const auto& event : events)
        {
            const int64_t scheduleTime = getScheduleTime(event);
            ScheduledEvent scheduled(event, scheduleTime);

            // Push to lock-free queue (real-time safe)
            if (!eventQueue->push(scheduled))
            {
                // Queue full - in production, log this
                jassertfalse; // Should increase queue capacity
            }
        }
    }

    void Scheduler::process(int numSamples) noexcept
    {
        if (!prepared)
            return;

        // Update current sample position
        const int64_t previousSample = currentSample.load(std::memory_order_relaxed);
        currentSample.store(previousSample + numSamples, std::memory_order_relaxed);

        // Check for loop points
        if (shouldLoop())
        {
            handleLoop();
        }

        // Retrieve events that are due in this block
        currentBlockEvents.clear();

        ScheduledEvent event;
        while (eventQueue->pop(event))
        {
            // Check if event is due
            if (event.scheduledTime <= currentSample.load(std::memory_order_relaxed))
            {
                currentBlockEvents.push_back(event);
            }
            else
            {
                // Event not due yet, push it back
                // In a more efficient implementation, we'd use a priority queue
                // but lock-free FIFO is simpler for real-time safety
                eventQueue->push(event);
                break;
            }
        }

        // Sort current block events by scheduled time
        std::sort(currentBlockEvents.begin(), currentBlockEvents.end(),
                 [](const ScheduledEvent& a, const ScheduledEvent& b)
                 {
                     return a.scheduledTime < b.scheduledTime;
                 });
    }

    bool Scheduler::getNextEvent(ScheduledEvent& event) noexcept
    {
        // Check if we have events in current block buffer
        if (!currentBlockEvents.empty())
        {
            event = currentBlockEvents.back();
            currentBlockEvents.pop_back();
            return true;
        }

        return false;
    }

    void Scheduler::setTempo(float newTempo)
    {
        if (newTempo > 0.0f && newTempo <= 300.0f)
        {
            tempo.store(newTempo, std::memory_order_relaxed);
            updateLookaheadSamples();
        }
    }

    void Scheduler::setLoopPoints(int64_t startSample, int64_t endSample)
    {
        if (startSample >= 0 && endSample > startSample)
        {
            loopStart.store(startSample, std::memory_order_relaxed);
            loopEnd.store(endSample, std::memory_order_relaxed);
            loopingEnabled.store(true, std::memory_order_relaxed);
        }
    }

    void Scheduler::clearLoopPoints()
    {
        loopingEnabled.store(false, std::memory_order_relaxed);
        loopStart.store(0, std::memory_order_relaxed);
        loopEnd.store(0, std::memory_order_relaxed);
    }

    void Scheduler::setLookahead(int lookaheadMs_) noexcept
    {
        if (lookaheadMs_ > 0 && lookaheadMs_ <= 1000)
        {
            lookaheadMs = lookaheadMs_;
            updateLookaheadSamples();
        }
    }

    //==============================================================================
    void Scheduler::updateLookaheadSamples()
    {
        if (sampleRate > 0)
        {
            lookaheadSamples = static_cast<int64_t>((lookaheadMs / 1000.0) * sampleRate);
        }
    }

    bool Scheduler::shouldLoop() const noexcept
    {
        if (!loopingEnabled.load(std::memory_order_relaxed))
            return false;

        const int64_t loopEndSample = loopEnd.load(std::memory_order_relaxed);
        const int64_t current = currentSample.load(std::memory_order_relaxed);

        return loopEndSample > 0 && current >= loopEndSample;
    }

    void Scheduler::handleLoop() noexcept
    {
        const int64_t loopStartSample = loopStart.load(std::memory_order_relaxed);
        const int64_t loopEndSample = loopEnd.load(std::memory_order_relaxed);

        // Wrap current position to loop start
        const int64_t loopLength = loopEndSample - loopStartSample;
        const int64_t currentPosition = currentSample.load(std::memory_order_relaxed);

        const int64_t newPosition = loopStartSample + ((currentPosition - loopStartSample) % loopLength);
        currentSample.store(newPosition, std::memory_order_relaxed);
    }

    int64_t Scheduler::getScheduleTime(const NoteEvent& event) const noexcept
    {
        // Schedule event at its sample time plus lookahead
        // This ensures events are available to the audio thread before they're due
        return event.sampleTime + lookaheadSamples;
    }

} // namespace Schillinger::AudioPipeline
