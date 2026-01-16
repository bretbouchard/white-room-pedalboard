/*
  ==============================================================================

    NoteEventGenerator.cpp
    Created: 15 Jan 2026
    Author:  White Room Project

    Implementation of note event generation from TimelineIR.

  ==============================================================================
*/

#include "audio_pipeline/NoteEventGenerator.h"
#include <algorithm>
#include <stdexcept>

namespace Schillinger::AudioPipeline
{

    //==============================================================================
    NoteEventGenerator::NoteEventGenerator() = default;

    NoteEventGenerator::~NoteEventGenerator() = default;

    //==============================================================================
    std::vector<NoteEvent> NoteEventGenerator::generate(const TimelineIR& timeline,
                                                        const std::vector<PitchData>& pitchData,
                                                        const RhythmData& rhythmData,
                                                        int maxVoices)
    {
        if (maxVoices > 0)
            maxPolyphony = maxVoices;

        std::vector<NoteEvent> allEvents;

        // Generate events for each pitch sequence
        for (size_t i = 0; i < pitchData.size(); ++i)
        {
            const int voiceId = static_cast<int>(i) % maxPolyphony;
            auto sequenceEvents = generateSequence(timeline, pitchData[i], rhythmData, voiceId);
            allEvents.insert(allEvents.end(), sequenceEvents.begin(), sequenceEvents.end());
        }

        // Assign proper voice IDs (round-robin for now)
        assignVoices(allEvents);

        // Generate note-off events
        generateNoteOffs(allEvents);

        // Sort all events by sample time
        sortEvents(allEvents);

        // Validate before returning
        if (!validateEvents(allEvents))
        {
            jassertfalse; // Validation failed
            return {};
        }

        return allEvents;
    }

    std::vector<NoteEvent> NoteEventGenerator::generateSequence(const TimelineIR& timeline,
                                                                 const PitchData& pitch,
                                                                 const RhythmData& rhythm,
                                                                 int voiceId)
    {
        std::vector<NoteEvent> events;

        // For each attack point in the rhythm, create a note-on event
        for (float attackPoint : rhythm.attackPoints)
        {
            // Convert beat time to sample time
            const int64_t sampleTime = timeline.beatsToSamples(attackPoint);

            // Calculate duration in samples
            const float durationSamples = timeline.beatsToSamples(pitch.durationBeats);

            // Create note-on event
            NoteEvent noteOn(sampleTime, pitch.noteNumber, pitch.velocity,
                           voiceId, pitch.derivationId, durationSamples);
            events.push_back(noteOn);
        }

        return events;
    }

    //==============================================================================
    void NoteEventGenerator::assignVoices(std::vector<NoteEvent>& events)
    {
        // Simple round-robin voice assignment
        // In a full implementation, this would use VoiceManager for proper polyphony
        int currentVoice = 0;
        for (auto& event : events)
        {
            if (event.isNoteOn)
            {
                event.voiceId = currentVoice;
                currentVoice = (currentVoice + 1) % maxPolyphony;
            }
        }

        lastVoiceCount = std::min(currentVoice + 1, maxPolyphony);
    }

    void NoteEventGenerator::generateNoteOffs(std::vector<NoteEvent>& events)
    {
        std::vector<NoteEvent> noteOffs;

        // For each note-on event, create a corresponding note-off
        for (const auto& event : events)
        {
            if (event.isNoteOn)
            {
                const int64_t noteOffTime = event.getNoteOffTime();
                NoteEvent noteOff(noteOffTime, event.noteNumber, event.voiceId);
                noteOffs.push_back(noteOff);
            }
        }

        // Add note-offs to the event list
        events.insert(events.end(), noteOffs.begin(), noteOffs.end());
    }

    void NoteEventGenerator::sortEvents(std::vector<NoteEvent>& events)
    {
        // Stable sort by sample time to preserve ordering of simultaneous events
        std::stable_sort(events.begin(), events.end(),
                        [](const NoteEvent& a, const NoteEvent& b)
                        {
                            return a.sampleTime < b.sampleTime;
                        });
    }

    bool NoteEventGenerator::validateEvents(const std::vector<NoteEvent>& events) const
    {
        for (const auto& event : events)
        {
            if (!event.isValid())
                return false;

            // Check voice ID is within range
            if (event.voiceId < 0 || event.voiceId >= maxPolyphony)
                return false;

            // Check sample time is non-negative
            if (event.sampleTime < 0)
                return false;
        }

        return true;
    }

    void NoteEventGenerator::reset()
    {
        maxPolyphony = 256;
        lastVoiceCount = 0;
    }

} // namespace Schillinger::AudioPipeline
