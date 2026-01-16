/*
  ==============================================================================

    VoiceManager.h
    Created: 15 Jan 2026
    Author:  White Room Project

    Polyphony management with voice stealing and voice priority
    (primary > secondary > tertiary).

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <vector>
#include <memory>
#include <algorithm>

namespace Schillinger::AudioPipeline
{

    //==============================================================================
    /**
        Voice priority levels for Schillinger orchestration (Book V).

        Priority determines which voices are stolen when polyphony is exceeded:
        - PRIMARY: Most important (e.g., melody, bass)
        - SECONDARY: Less important (e.g., harmony, pads)
        - TERTIARY: Least important (e.g., ornamentation, reinforcement)
    */
    enum class VoicePriority
    {
        PRIMARY = 0,
        SECONDARY = 1,
        TERTIARY = 2
    };

    //==============================================================================
    /**
        Represents a single voice in the polyphony manager.

        Tracks voice state including whether it's active, what note it's playing,
        its priority level, and when it was last used for LRU stealing.
    */
    struct Voice
    {
        /** Unique voice ID */
        int id;

        /** Whether this voice is currently active (playing) */
        bool active;

        /** MIDI note number this voice is playing (-1 if inactive) */
        int noteNumber;

        /** Voice priority for stealing decisions */
        VoicePriority priority;

        /** Last sample time this voice was used (for LRU) */
        int64_t lastUsed;

        /** Derivation ID for traceability */
        std::string derivationId;

        //==============================================================================
        Voice()
            : id(-1)
            , active(false)
            , noteNumber(-1)
            , priority(VoicePriority::TERTIARY)
            , lastUsed(0)
            , derivationId("")
        {}

        Voice(int voiceId, VoicePriority prio)
            : id(voiceId)
            , active(false)
            , noteNumber(-1)
            , priority(prio)
            , lastUsed(0)
            , derivationId("")
        {}

        //==============================================================================
        /** Activate this voice for a note */
        void activate(int note, int64_t sampleTime, const std::string& derivation)
        {
            active = true;
            noteNumber = note;
            lastUsed = sampleTime;
            derivationId = derivation;
        }

        /** Deactivate this voice */
        void deactivate()
        {
            active = false;
            noteNumber = -1;
            // Keep priority and lastUsed for stealing decisions
        }

        /** Check if this voice is available */
        bool isAvailable() const noexcept
        {
            return !active;
        }

        /** Check if this voice can be stolen (based on priority) */
        bool canSteal(const Voice& other) const noexcept
        {
            // Can steal if our priority is higher (lower enum value)
            return priority < other.priority;
        }
    };

    //==============================================================================
    /**
        Polyphony manager with voice stealing and priority handling.

        Responsibilities:
        - Allocate voices for note-on events
        - Deallocate voices for note-off events
        - Steal voices when polyphony exceeded (LRU with priority)
        - Respect voice priorities (primary > secondary > tertiary)
        - Track voice states for real-time safe access

        Stealing Strategy:
        1. Try to find free voice
        2. If none free, steal lowest priority voice (tertiary first)
        3. Among same priority, steal least recently used (LRU)

        Thread Safety: Not thread-safe, use from audio thread only

        Usage:
        1. Call allocateVoice() for each note-on
        2. Call deallocateVoice() for each note-off
        3. Voice ID is used for audio rendering
    */
    class VoiceManager
    {
    public:
        //==============================================================================
        static constexpr int DEFAULT_MAX_VOICES = 256;
        static constexpr int MIN_VOICES = 1;
        static constexpr int MAX_VOICES = 512;

        //==============================================================================
        /** Constructor with max voices */
        explicit VoiceManager(int maxVoices = DEFAULT_MAX_VOICES);

        /** Destructor */
        ~VoiceManager();

        //==============================================================================
        /**
            Allocate a voice for a note-on event.

            First tries to find a free voice. If none available, steals
            the lowest priority voice (preferring tertiary, then secondary,
            then primary). Among equal priorities, steals least recently used.

            @param noteNumber MIDI note number (0-127)
            @param priority   Voice priority for stealing decisions
            @param sampleTime Current sample time for LRU tracking
            @param derivationId Optional derivation ID for traceability

            @return Allocated voice ID, or -1 if allocation failed
        */
        int allocateVoice(int noteNumber, VoicePriority priority, int64_t sampleTime,
                         const std::string& derivationId = "");

        /**
            Deallocate a voice for a note-off event.

            Marks the voice as inactive and available for reuse.

            @param voiceId Voice ID to deallocate
            @param noteNumber MIDI note number (must match allocation)
        */
        void deallocateVoice(int voiceId, int noteNumber);

        //==============================================================================
        /**
            Get active voices currently playing.

            Returns a vector of all voices with active=true.

            @return Vector of active voice structures
        */
        std::vector<Voice> getActiveVoices() const;

        /**
            Get voice by ID.

            @param voiceId Voice ID to retrieve
            @return Voice structure, or nullptr if invalid ID
        */
        const Voice* getVoice(int voiceId) const;

        //==============================================================================
        /** Get number of active voices */
        int getActiveVoiceCount() const noexcept { return activeVoiceCount; }

        /** Get maximum polyphony */
        int getMaxVoices() const noexcept { return maxVoices; }

        /** Check if all voices are in use */
        bool isPolyphonyExceeded() const noexcept { return activeVoiceCount >= maxVoices; }

        /** Get voice usage as percentage */
        float getVoiceUsage() const noexcept
        {
            return (activeVoiceCount > 0)
                ? static_cast<float>(activeVoiceCount) / maxVoices
                : 0.0f;
        }

        //==============================================================================
        /** Steal a voice based on priority and LRU */
        int stealVoice(VoicePriority priority, int64_t sampleTime);

        /** Find the best voice to steal (lowest priority, oldest) */
        int findVoiceToSteal(VoicePriority excludePriority) const;

        //==============================================================================
        /** Reset all voices to inactive state */
        void reset();

        /** Set maximum polyphony (recreates voice pool) */
        void setMaxVoices(int newMaxVoices);

        /** Get stealing statistics */
        struct StealingStats
        {
            int totalSteals = 0;
            int primarySteals = 0;
            int secondarySteals = 0;
            int tertiarySteals = 0;
        };

        const StealingStats& getStealingStats() const noexcept { return stealingStats; }

        void resetStealingStats() noexcept { stealingStats = {}; }

    private:
        //==============================================================================
        int maxVoices;
        int activeVoiceCount = 0;
        std::vector<Voice> voices;

        // Statistics
        StealingStats stealingStats;

        //==============================================================================
        /** Initialize voice pool */
        void initializeVoices();

        /** Find free voice */
        int findFreeVoice() const;

        /** Update stealing statistics */
        void updateStealingStats(VoicePriority stolenPriority);

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(VoiceManager)
    };

} // namespace Schillinger::AudioPipeline
