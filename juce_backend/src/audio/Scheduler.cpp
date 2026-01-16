/**
 * White Room Audio Scheduler Implementation
 *
 * T017: Implement Scheduler
 */

#include "audio/Scheduler.h"
#include <cassert>
#include <cmath>
#include <algorithm>

namespace white_room {
namespace audio {

// Helper function for power-of-2 check
inline bool isPowerOfTwo(int value) {
    return value > 0 && (value & (value - 1)) == 0;
}

// Helper function for clamping values
template<typename T>
inline T clamp(T value, T min, T max) {
    return value < min ? min : (value > max ? max : value);
}

// =============================================================================
// LOCK-FREE EVENT QUEUE IMPLEMENTATION
// =============================================================================

LockFreeEventQueue::LockFreeEventQueue(int capacity)
    : capacity_(capacity)
    , buffer_(std::make_unique<TimelineEvent[]>(capacity))
{
    // Power-of-2 capacity for efficient modulo
    assert(isPowerOfTwo(capacity));
    (void)capacity; // Suppress unused warning in release builds
}

LockFreeEventQueue::~LockFreeEventQueue() = default;

bool LockFreeEventQueue::push(const TimelineEvent& event) {
    const int write = writeIndex_.load(std::memory_order_relaxed);

    // Check if queue is full
    if (size_.load(std::memory_order_acquire) >= capacity_) {
        return false;  // Queue full
    }

    const int index = write & (capacity_ - 1);
    buffer_[index] = event;

    // Commit write
    writeIndex_.store(write + 1, std::memory_order_release);
    size_.fetch_add(1, std::memory_order_release);

    return true;
}

bool LockFreeEventQueue::pop(TimelineEvent& event) {
    const int read = readIndex_.load(std::memory_order_relaxed);

    // Check if queue is empty
    if (size_.load(std::memory_order_acquire) == 0) {
        return false;  // Queue empty
    }

    const int index = read & (capacity_ - 1);
    event = buffer_[index];

    // Commit read
    readIndex_.store(read + 1, std::memory_order_release);
    size_.fetch_sub(1, std::memory_order_release);

    return true;
}

// =============================================================================
// SCHEDULER IMPLEMENTATION
// =============================================================================

Scheduler::Scheduler(const SchedulerConfig& config)
    : config_(config)
    , eventQueue_(std::make_unique<LockFreeEventQueue>(4096))
{
    position_.tempo = 120.0;
}

Scheduler::~Scheduler() = default;

// -------------------------------------------------------------------------
// TRANSPORT CONTROL
// -------------------------------------------------------------------------

void Scheduler::play() {
    state_.store(PlaybackState::Playing, std::memory_order_release);
}

void Scheduler::pause() {
    state_.store(PlaybackState::Paused, std::memory_order_release);
}

void Scheduler::stop() {
    state_.store(PlaybackState::Stopped, std::memory_order_release);
    seek(0);
}

void Scheduler::seek(int64_t sampleTime) {
    // Update position atomically
    position_.sampleTime = sampleTime;
    updateMusicalPosition();
}

void Scheduler::setTempo(double tempo) {
    if (tempo < 1.0 || tempo > 500.0) {
        return;  // Invalid tempo
    }
    position_.tempo = tempo;
}

void Scheduler::setTimeSignature(int num, int den) {
    position_.timeSignatureNum = num;
    position_.timeSignatureDen = den;
    updateMusicalPosition();
}

TransportPosition Scheduler::getTransportPosition() const {
    return position_;
}

// -------------------------------------------------------------------------
// EVENT SCHEDULING (main thread)
// -------------------------------------------------------------------------

bool Scheduler::scheduleEvent(const TimelineEvent& event) {
    // For events in the near future, add to lock-free queue
    const auto lookaheadSamples = static_cast<int64_t>(
        config_.sampleRate * (config_.lookaheadMs / 1000.0)
    );

    if (event.sampleTime <= position_.sampleTime + lookaheadSamples) {
        // Use lock-free queue for real-time safety
        return eventQueue_->push(event);
    }

    // For far-future events, add to sorted events vector
    std::lock_guard<std::mutex> lock(eventsMutex_);

    // Find insertion point (binary search)
    auto it = std::lower_bound(
        events_.begin(),
        events_.end(),
        event,
        [](const TimelineEvent& a, const TimelineEvent& b) {
            return a.sampleTime < b.sampleTime;
        }
    );

    events_.insert(it, event);
    return true;
}

bool Scheduler::scheduleNoteOn(int voice, int pitch, int velocity, int64_t sampleTime) {
    // Pack pitch and velocity into event data
    EventData data;
    data.pitch = pitch;  // Note: velocity handling would need additional storage

    TimelineEvent event(sampleTime, EventType::NoteOn, data, voice);
    return scheduleEvent(event);
}

bool Scheduler::scheduleNoteOff(int voice, int pitch, int64_t sampleTime) {
    EventData data;
    data.pitch = pitch;

    TimelineEvent event(sampleTime, EventType::NoteOff, data, voice);
    return scheduleEvent(event);
}

bool Scheduler::scheduleParameterChange(int voice, int paramId, float value, int64_t sampleTime) {
    EventData data;
    data.value = static_cast<double>(value);

    TimelineEvent event(sampleTime, EventType::Parameter, data, voice);
    return scheduleEvent(event);
}

void Scheduler::clearEvents() {
    std::lock_guard<std::mutex> lock(eventsMutex_);
    events_.clear();
}

void Scheduler::clearVoiceEvents(int voice) {
    std::lock_guard<std::mutex> lock(eventsMutex_);
    events_.erase(
        std::remove_if(events_.begin(), events_.end(),
            [voice](const TimelineEvent& e) { return e.voiceIndex == voice; }),
        events_.end()
    );
}

// -------------------------------------------------------------------------
// AUDIO PROCESSING (audio thread)
// -------------------------------------------------------------------------

std::vector<TimelineEvent> Scheduler::processEvents(int samplesToProcess) {
    std::vector<TimelineEvent> readyEvents;

    // Only process if playing
    if (getPlaybackState() != PlaybackState::Playing) {
        return readyEvents;
    }

    const int64_t bufferStart = position_.sampleTime;
    const int64_t bufferEnd = bufferStart + samplesToProcess;

    // Process lock-free queue events first
    TimelineEvent event;
    while (eventQueue_->pop(event)) {
        if (event.sampleTime >= bufferStart && event.sampleTime < bufferEnd) {
            readyEvents.push_back(event);
        } else if (event.sampleTime >= bufferEnd) {
            // Put back in event list for later
            std::lock_guard<std::mutex> lock(eventsMutex_);
            events_.push_back(event);
        }
    }

    // Process sorted event list
    {
        std::lock_guard<std::mutex> lock(eventsMutex_);

        // Find events in current buffer range
        auto it = events_.begin();
        while (it != events_.end() && it->sampleTime < bufferEnd) {
            if (it->sampleTime >= bufferStart && !it->processed) {
                readyEvents.push_back(*it);
                it->processed = true;
            }
            ++it;
        }

        // Remove processed events
        events_.erase(
            std::remove_if(events_.begin(), events_.end(),
                [bufferEnd](const TimelineEvent& e) { return e.processed && e.sampleTime < bufferEnd; }),
            events_.end()
        );
    }

    // Advance position
    position_.sampleTime = bufferEnd;
    updateMusicalPosition();

    // Check for loop
    checkLoop();

    return readyEvents;
}

std::vector<TimelineEvent> Scheduler::getLookaheadEvents() {
    std::vector<TimelineEvent> lookaheadEvents;

    const auto lookaheadSamples = static_cast<int64_t>(
        config_.sampleRate * (config_.lookaheadMs / 1000.0)
    );

    const int64_t windowStart = position_.sampleTime;
    const int64_t windowEnd = windowStart + lookaheadSamples;

    std::lock_guard<std::mutex> lock(eventsMutex_);

    // Find events in lookahead window
    for (const auto& event : events_) {
        if (event.sampleTime >= windowStart && event.sampleTime < windowEnd) {
            lookaheadEvents.push_back(event);
        } else if (event.sampleTime >= windowEnd) {
            break;  // Events are sorted
        }
    }

    return lookaheadEvents;
}

// -------------------------------------------------------------------------
// LOOP POINTS
// -------------------------------------------------------------------------

void Scheduler::setLoopPoints(int64_t startSample, int64_t endSample) {
    loop_.enabled = true;
    loop_.startSample = startSample;
    loop_.endSample = endSample;
}

void Scheduler::clearLoop() {
    loop_.enabled = false;
    loop_.startSample = 0;
    loop_.endSample = 0;
}

Scheduler::LoopPoints Scheduler::getLoopPoints() const {
    return loop_;
}

// -------------------------------------------------------------------------
// INTERNAL HELPERS
// -------------------------------------------------------------------------

void Scheduler::updateMusicalPosition() {
    // Calculate samples per beat based on tempo
    const double samplesPerBeat = static_cast<double>(this->samplesPerBeat());

    // Calculate total beats
    const double totalBeats = static_cast<double>(position_.sampleTime) / samplesPerBeat;
    position_.musicalPosition = totalBeats;

    // Calculate bar and beat
    const double beatsPerBar = static_cast<double>(position_.timeSignatureNum);
    const double totalBars = totalBeats / beatsPerBar;

    position_.bar = static_cast<int>(totalBars) + 1;
    position_.beat = static_cast<int>(totalBeats) % static_cast<int>(beatsPerBar) + 1;
    position_.tick = 0;  // TODO: Implement ticks if needed
}

int64_t Scheduler::samplesPerBeat() const {
    // Samples per beat = (sampleRate * 60) / tempo
    return static_cast<int64_t>((config_.sampleRate * 60.0) / position_.tempo);
}

void Scheduler::checkLoop() {
    if (!loop_.enabled || loop_.endSample == 0) {
        return;
    }

    if (position_.sampleTime >= loop_.endSample) {
        // Loop back to start
        const auto loopLength = loop_.endSample - loop_.startSample;
        position_.sampleTime = loop_.startSample + (position_.sampleTime - loop_.endSample) % loopLength;
    }
}

} // namespace audio
} // namespace white_room
