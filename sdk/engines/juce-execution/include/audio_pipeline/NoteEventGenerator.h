/*
  ==============================================================================

    NoteEventGenerator.h
    Created: 15 Jan 2026
    Author:  White Room Project

    Generates note-on/note-off events from TimelineIR with voice assignment,
    pitch/rhythm integration, and derivation linking.

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <vector>
#include <string>
#include <memory>

namespace Schillinger::AudioPipeline
{

    //==============================================================================
    /**
        Represents a single note event with timing, pitch, and metadata.

        Note events are generated from the TimelineIR and contain all information
        needed for audio rendering, including voice assignment and derivation
        tracing for explainability.
    */
    struct NoteEvent
    {
        /** Sample time when this event occurs (sample-accurate) */
        int64_t sampleTime;

        /** MIDI note number (0-127) */
        int noteNumber;

        /** MIDI velocity (0-127, normalized to 0.0-1.0 in processing) */
        float velocity;

        /** Assigned voice ID for polyphony management */
        int voiceId;

        /** Link to Schillinger derivation source for traceability */
        std::string derivationId;

        /** Duration in samples (for note-off calculation) */
        float duration;

        /** Note-on event (true) or note-off event (false) */
        bool isNoteOn;

        //==============================================================================
        /** Constructor for note-on events */
        NoteEvent(int64_t sampleTime_, int noteNumber_, float velocity_,
                  int voiceId_, const std::string& derivationId_, float duration_)
            : sampleTime(sampleTime_)
            , noteNumber(noteNumber_)
            , velocity(velocity_)
            , voiceId(voiceId_)
            , derivationId(derivationId_)
            , duration(duration_)
            , isNoteOn(true)
        {}

        /** Constructor for note-off events */
        NoteEvent(int64_t sampleTime_, int noteNumber_, int voiceId_)
            : sampleTime(sampleTime_)
            , noteNumber(noteNumber_)
            , velocity(0.0f)
            , voiceId(voiceId_)
            , derivationId("")
            , duration(0.0f)
            , isNoteOn(false)
        {}

        /** Default constructor */
        NoteEvent()
            : sampleTime(0)
            , noteNumber(0)
            , velocity(0.0f)
            , voiceId(-1)
            , derivationId("")
            , duration(0.0f)
            , isNoteOn(false)
        {}

        //==============================================================================
        /** Check if this note event is valid */
        bool isValid() const noexcept
        {
            return noteNumber >= 0 && noteNumber <= 127 &&
                   voiceId >= 0 &&
                   (isNoteOn ? (velocity >= 0.0f && velocity <= 1.0f) : true);
        }

        /** Get the note-off time for a note-on event */
        int64_t getNoteOffTime() const noexcept
        {
            return isNoteOn ? sampleTime + static_cast<int64_t>(duration) : sampleTime;
        }
    };

    //==============================================================================
    /**
        TimelineIR representation for note generation.

        This is a simplified C++ representation of the TypeScript TimelineIR
        that contains the musical timeline information needed to generate notes.
    */
    struct TimelineIR
    {
        /** Tempo in BPM */
        float tempo;

        /** Time signature numerator */
        int timeSignatureNumerator;

        /** Time signature denominator */
        int timeSignatureDenominator;

        /** Start time in musical time (beats) */
        float startTime;

        /** End time in musical time (beats), 0 if infinite */
        float endTime;

        /** Sample rate for audio rendering */
        int sampleRate;

        //==============================================================================
        /** Convert beats to samples */
        int64_t beatsToSamples(float beats) const noexcept
        {
            const float beatsPerSecond = tempo / 60.0f;
            const float seconds = beats / beatsPerSecond;
            return static_cast<int64_t>(seconds * sampleRate);
        }

        /** Convert samples to beats */
        float samplesToBeats(int64_t samples) const noexcept
        {
            const float seconds = static_cast<float>(samples) / sampleRate;
            const float beatsPerSecond = tempo / 60.0f;
            return seconds * beatsPerSecond;
        }
    };

    //==============================================================================
    /**
        Pitch information from Schillinger melody generation.

        Contains pitch data generated by the Schillinger melody systems
        (Book II) with contour constraints and interval cycles applied.
    */
    struct PitchData
    {
        /** MIDI note number */
        int noteNumber;

        /** Derivation ID linking to Schillinger system */
        std::string derivationId;

        /** Velocity from dynamics system */
        float velocity;

        /** Duration in beats */
        float durationBeats;

        /** Priority for voice assignment (orchestration) */
        int priority; // 0=primary, 1=secondary, 2=tertiary

        //==============================================================================
        PitchData()
            : noteNumber(60)
            , derivationId("")
            , velocity(0.8f)
            , durationBeats(1.0f)
            , priority(0)
        {}

        PitchData(int note, const std::string& derivation, float vel, float duration, int prio)
            : noteNumber(note)
            , derivationId(derivation)
            , velocity(vel)
            , durationBeats(duration)
            , priority(prio)
        {}
    };

    //==============================================================================
    /**
        Rhythm attack points from Schillinger rhythm generation.

        Contains rhythmic data generated by the Schillinger rhythm systems
        (Book I) with generator resultants and density constraints applied.
    */
    struct RhythmData
    {
        /** Attack points in beats */
        std::vector<float> attackPoints;

        /** Derivation ID linking to Schillinger rhythm system */
        std::string derivationId;

        //==============================================================================
        RhythmData() = default;

        RhythmData(const std::vector<float>& attacks, const std::string& derivation)
            : attackPoints(attacks)
            , derivationId(derivation)
        {}
    };

    //==============================================================================
    /**
        Generates note-on/note-off events from TimelineIR.

        This class combines pitch and rhythm data from the Schillinger realization
        engine with timeline information to create sample-accurate note events.

        Responsibilities:
        - Generate note-on events from TimelineIR
        - Generate note-off events with proper durations
        - Assign voices for polyphony
        - Link events to derivation metadata for traceability

        Thread Safety: Not thread-safe, use from audio thread or main thread only
    */
    class NoteEventGenerator
    {
    public:
        //==============================================================================
        NoteEventGenerator();
        ~NoteEventGenerator();

        //==============================================================================
        /**
            Generate note events from timeline, pitch, and rhythm data.

            @param timeline       TimelineIR with tempo and timing info
            @param pitchData      Vector of pitch sequences
            @param rhythmData     Rhythm attack points
            @param maxVoices      Maximum polyphony (default 256)

            @return Vector of NoteEvents sorted by sample time
        */
        std::vector<NoteEvent> generate(const TimelineIR& timeline,
                                       const std::vector<PitchData>& pitchData,
                                       const RhythmData& rhythmData,
                                       int maxVoices = 256);

        /**
            Generate a single note sequence from pitch+rhythm combination.

            @param timeline       TimelineIR with tempo and timing info
            @param pitch          Single pitch sequence
            @param rhythm         Rhythm attack points
            @param voiceId        Voice ID to assign

            @return Vector of NoteEvents for this sequence
        */
        std::vector<NoteEvent> generateSequence(const TimelineIR& timeline,
                                                const PitchData& pitch,
                                                const RhythmData& rhythm,
                                                int voiceId);

        //==============================================================================
        /** Set the maximum polyphony */
        void setMaxVoices(int maxVoices) noexcept { maxPolyphony = maxVoices; }

        /** Get the current maximum polyphony */
        int getMaxVoices() const noexcept { return maxPolyphony; }

        /** Get the number of voices used in last generation */
        int getLastVoiceCount() const noexcept { return lastVoiceCount; }

        //==============================================================================
        /** Clear all internal state */
        void reset();

    private:
        //==============================================================================
        int maxPolyphony = 256;
        int lastVoiceCount = 0;

        /** Assign voice IDs to note events using simple round-robin */
        void assignVoices(std::vector<NoteEvent>& events);

        /** Generate note-off events from note-on events */
        void generateNoteOffs(std::vector<NoteEvent>& events);

        /** Sort events by sample time (stable sort) */
        void sortEvents(std::vector<NoteEvent>& events);

        /** Validate events before returning */
        bool validateEvents(const std::vector<NoteEvent>& events) const;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(NoteEventGenerator)
    };

} // namespace Schillinger::AudioPipeline
