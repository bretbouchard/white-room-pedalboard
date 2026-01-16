/*
  ==============================================================================

    EventQueue.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Implementation of event scheduling and timing for playback

  ==============================================================================
*/

#include "EventQueue.h"
#include "dsp/InstrumentDSP.h"

#include <algorithm>
#include <map>

namespace Integration {

//==============================================================================
// Constructor/Destructor
//==============================================================================

EventQueue::EventQueue()
    : sampleRate_(48000.0)
    , currentTime_(0.0)
    , quantization_(0.0)  // No quantization by default
{
}

EventQueue::~EventQueue()
{
    clear();
}

//==============================================================================
// Initialization
//==============================================================================

bool EventQueue::initialize(double sampleRate)
{
    if (sampleRate <= 0.0) {
        return false;
    }

    sampleRate_ = sampleRate;
    currentTime_ = 0.0;
    clear();
    return true;
}

void EventQueue::reset()
{
    clear();
    currentTime_ = 0.0;
}

//==============================================================================
// Event Scheduling
//==============================================================================

bool EventQueue::scheduleEvent(const QueuedEvent& event)
{
    if (event.time < currentTime_) {
        // Don't schedule events in the past
        return false;
    }

    // Add event to priority queue (automatically sorted by time)
    events_.push(event);

    return true;
}

int EventQueue::scheduleEvents(const std::vector<QueuedEvent>& events)
{
    int scheduled = 0;

    for (const auto& event : events) {
        if (scheduleEvent(event)) {
            scheduled++;
        }
    }

    return scheduled;
}

//==============================================================================
// Event Processing
//==============================================================================

void EventQueue::processEvents(double currentTime,
                               const std::map<std::string, DSP::InstrumentDSP*>& instruments)
{
    if (instruments.empty()) {
        return;
    }

    currentTime_ = currentTime;

    // Process all events that are due at or before currentTime
    while (!events_.empty() && events_.top().time <= currentTime_) {
        const QueuedEvent& queuedEvent = events_.top();

        // Find target instrument
        DSP::InstrumentDSP* targetInstrument = nullptr;

        if (!queuedEvent.targetTrackId.empty()) {
            // Look up instrument by track ID
            auto it = instruments.find(queuedEvent.targetTrackId);
            if (it != instruments.end()) {
                targetInstrument = it->second;
            }
        } else if (!queuedEvent.targetInstrumentId.empty()) {
            // Look up by instrument ID (search all tracks)
            for (const auto& pair : instruments) {
                if (pair.second != nullptr &&
                    std::string(pair.second->getInstrumentName()) == queuedEvent.targetInstrumentId) {
                    targetInstrument = pair.second;
                    break;
                }
            }
        }

        // Deliver event to instrument
        if (targetInstrument != nullptr) {
            DSP::ScheduledEvent dspEvent = convertToDSPEvent(queuedEvent);
            targetInstrument->handleEvent(dspEvent);
        }

        // Remove processed event
        events_.pop();
    }
}

void EventQueue::clear()
{
    // Clear priority queue by creating new one
    events_ = std::priority_queue<QueuedEvent, std::vector<QueuedEvent>, std::greater<QueuedEvent>>();
}

//==============================================================================
// Queries
//==============================================================================

int EventQueue::getEventCount() const
{
    return static_cast<int>(events_.size());
}

double EventQueue::getNextEventTime() const
{
    if (events_.empty()) {
        return -1.0;
    }

    return events_.top().time;
}

//==============================================================================
// Quantization
//==============================================================================

void EventQueue::setQuantization(double quantization)
{
    quantization_ = quantization;
}

double EventQueue::getQuantization() const
{
    return quantization_;
}

//==============================================================================
// Helper Methods
//==============================================================================

DSP::ScheduledEvent EventQueue::convertToDSPEvent(const QueuedEvent& queuedEvent) const
{
    DSP::ScheduledEvent dspEvent;
    dspEvent.time = queuedEvent.time;
    dspEvent.sampleOffset = static_cast<uint32_t>(
        queuedEvent.sampleIndex % static_cast<uint64_t>(sampleRate_)
    );

    // Convert event type
    switch (queuedEvent.type) {
        case EventType::NOTE_ON:
            dspEvent.type = DSP::ScheduledEvent::NOTE_ON;
            dspEvent.data.note.midiNote = queuedEvent.data.note.midiNote;
            dspEvent.data.note.velocity = queuedEvent.data.note.velocity;
            break;

        case EventType::NOTE_OFF:
            dspEvent.type = DSP::ScheduledEvent::NOTE_OFF;
            dspEvent.data.note.midiNote = queuedEvent.data.note.midiNote;
            dspEvent.data.note.velocity = 0.0f;
            break;

        case EventType::PARAM_CHANGE:
            dspEvent.type = DSP::ScheduledEvent::PARAM_CHANGE;
            dspEvent.data.param.paramId = queuedEvent.data.param.paramId;
            dspEvent.data.param.value = queuedEvent.data.param.value;
            break;

        case EventType::PITCH_BEND:
            dspEvent.type = DSP::ScheduledEvent::PITCH_BEND;
            dspEvent.data.pitchBend.bendValue = queuedEvent.data.pitchBend.bendValue;
            break;

        case EventType::CHANNEL_PRESSURE:
            dspEvent.type = DSP::ScheduledEvent::CHANNEL_PRESSURE;
            dspEvent.data.channelPressure.pressure = queuedEvent.data.channelPressure.pressure;
            break;

        case EventType::CONTROL_CHANGE:
            dspEvent.type = DSP::ScheduledEvent::CONTROL_CHANGE;
            dspEvent.data.controlChange.controllerNumber = queuedEvent.data.controlChange.controllerNumber;
            dspEvent.data.controlChange.value = queuedEvent.data.controlChange.value;
            break;

        case EventType::PROGRAM_CHANGE:
            dspEvent.type = DSP::ScheduledEvent::PROGRAM_CHANGE;
            dspEvent.data.programChange.programNumber = queuedEvent.data.programChange.programNumber;
            break;

        case EventType::RESET:
            dspEvent.type = DSP::ScheduledEvent::RESET;
            break;

        default:
            // Unknown event type - create a RESET event as fallback
            dspEvent.type = DSP::ScheduledEvent::RESET;
            break;
    }

    return dspEvent;
}

double EventQueue::quantizeTime(double time) const
{
    if (quantization_ <= 0.0) {
        return time;  // No quantization
    }

    // Quantize to nearest grid line
    return std::round(time / quantization_) * quantization_;
}

//==============================================================================
// Event Batch Creation (Placeholder implementations for future)
//==============================================================================

EventBatch createEventBatchFromMIDI(const std::vector<uint8_t>& midiData, double tempo)
{
    // TODO: Implement MIDI file parsing
    // - Parse MIDI file header and tracks
    // - Extract note events, tempo changes, etc.
    // - Convert to QueuedEvents with proper timing
    // - Return EventBatch

    EventBatch batch;
    batch.startTime = 0.0;
    batch.duration = 0.0;
    return batch;
}

EventBatch createEventBatchFromNotes(const std::vector<NoteData>& notes)
{
    // TODO: Implement SDK note data conversion
    // - Convert SDK note representation to events
    // - Calculate timing based on tempo/time signature
    // - Return EventBatch

    EventBatch batch;
    batch.startTime = 0.0;
    batch.duration = 0.0;
    return batch;
}

} // namespace Integration
