/*
  ==============================================================================

    VoiceManager.cpp
    Created: 15 Jan 2026
    Author:  White Room Project

    Implementation of polyphony management with voice stealing.

  ==============================================================================
*/

#include "audio_pipeline/VoiceManager.h"
#include <algorithm>
#include <limits>

namespace Schillinger::AudioPipeline
{

    //==============================================================================
    VoiceManager::VoiceManager(int maxVoices)
        : maxVoices(jlimit(MIN_VOICES, MAX_VOICES, maxVoices))
    {
        initializeVoices();
    }

    VoiceManager::~VoiceManager() = default;

    //==============================================================================
    void VoiceManager::initializeVoices()
    {
        voices.clear();
        voices.reserve(maxVoices);

        // Create voice pool with default priorities
        // First 25% primary, next 50% secondary, remaining 25% tertiary
        const int primaryCount = maxVoices / 4;
        const int secondaryCount = maxVoices / 2;
        const int tertiaryCount = maxVoices - primaryCount - secondaryCount;

        int voiceId = 0;
        for (int i = 0; i < primaryCount; ++i)
        {
            voices.emplace_back(voiceId++, VoicePriority::PRIMARY);
        }
        for (int i = 0; i < secondaryCount; ++i)
        {
            voices.emplace_back(voiceId++, VoicePriority::SECONDARY);
        }
        for (int i = 0; i < tertiaryCount; ++i)
        {
            voices.emplace_back(voiceId++, VoicePriority::TERTIARY);
        }

        activeVoiceCount = 0;
    }

    int VoiceManager::allocateVoice(int noteNumber, VoicePriority priority,
                                   int64_t sampleTime, const std::string& derivationId)
    {
        // First try to find a free voice
        int freeVoiceId = findFreeVoice();
        if (freeVoiceId >= 0)
        {
            voices[freeVoiceId].activate(noteNumber, sampleTime, derivationId);
            voices[freeVoiceId].priority = priority;
            activeVoiceCount++;
            return freeVoiceId;
        }

        // No free voices, need to steal
        return stealVoice(priority, sampleTime);
    }

    void VoiceManager::deallocateVoice(int voiceId, int noteNumber)
    {
        if (voiceId < 0 || voiceId >= maxVoices)
        {
            jassertfalse; // Invalid voice ID
            return;
        }

        Voice& voice = voices[voiceId];

        // Verify note number matches (prevent accidental mismatches)
        if (voice.noteNumber != noteNumber)
        {
            jassertfalse; // Note mismatch - possible bug in caller
            return;
        }

        if (voice.active)
        {
            voice.deactivate();
            activeVoiceCount--;
            jassert(activeVoiceCount >= 0);
        }
    }

    //==============================================================================
    std::vector<Voice> VoiceManager::getActiveVoices() const
    {
        std::vector<Voice> active;
        active.reserve(activeVoiceCount);

        for (const auto& voice : voices)
        {
            if (voice.active)
            {
                active.push_back(voice);
            }
        }

        return active;
    }

    const Voice* VoiceManager::getVoice(int voiceId) const
    {
        if (voiceId >= 0 && voiceId < maxVoices)
        {
            return &voices[voiceId];
        }
        return nullptr;
    }

    //==============================================================================
    int VoiceManager::stealVoice(VoicePriority priority, int64_t sampleTime)
    {
        // Find voice to steal (exclude same or higher priority)
        int voiceToSteal = findVoiceToSteal(priority);

        if (voiceToSteal < 0)
        {
            // No stealable voice found - must steal from same priority
            voiceToSteal = findVoiceToSteal(static_cast<VoicePriority>(
                std::numeric_limits<int>::max()));
        }

        if (voiceToSteal < 0)
        {
            jassertfalse; // Should never happen if voices exist
            return -1;
        }

        // Update statistics
        updateStealingStats(voices[voiceToSteal].priority);

        // Steal the voice (reactivate with new parameters)
        // Note: In production, you'd want to send a note-off for the stolen voice
        voices[voiceToSteal].priority = priority;
        // The activate() call will set noteNumber and sampleTime by caller
        return voiceToSteal;
    }

    int VoiceManager::findVoiceToSteal(VoicePriority excludePriority) const
    {
        int oldestVoice = -1;
        int64_t oldestTime = std::numeric_limits<int64_t>::max();
        VoicePriority lowestPriority = VoicePriority::TERTIARY;

        // Find oldest voice with lowest priority (excluding excludePriority)
        for (const auto& voice : voices)
        {
            if (!voice.active)
                continue;

            // Skip voices with same or higher priority than excluded
            if (voice.priority >= excludePriority)
                continue;

            // Prefer lower priority voices
            if (voice.priority < lowestPriority)
            {
                lowestPriority = voice.priority;
                oldestVoice = voice.id;
                oldestTime = voice.lastUsed;
            }
            else if (voice.priority == lowestPriority)
            {
                // Among same priority, pick least recently used
                if (voice.lastUsed < oldestTime)
                {
                    oldestVoice = voice.id;
                    oldestTime = voice.lastUsed;
                }
            }
        }

        return oldestVoice;
    }

    int VoiceManager::findFreeVoice() const
    {
        for (const auto& voice : voices)
        {
            if (!voice.active)
            {
                return voice.id;
            }
        }
        return -1;
    }

    //==============================================================================
    void VoiceManager::updateStealingStats(VoicePriority stolenPriority)
    {
        stealingStats.totalSteals++;

        switch (stolenPriority)
        {
            case VoicePriority::PRIMARY:
                stealingStats.primarySteals++;
                break;
            case VoicePriority::SECONDARY:
                stealingStats.secondarySteals++;
                break;
            case VoicePriority::TERTIARY:
                stealingStats.tertiarySteals++;
                break;
        }
    }

    //==============================================================================
    void VoiceManager::reset()
    {
        for (auto& voice : voices)
        {
            voice.deactivate();
        }
        activeVoiceCount = 0;
    }

    void VoiceManager::setMaxVoices(int newMaxVoices)
    {
        const int clamped = jlimit(MIN_VOICES, MAX_VOICES, newMaxVoices);
        if (clamped != maxVoices)
        {
            maxVoices = clamped;
            initializeVoices();
        }
    }

} // namespace Schillinger::AudioPipeline
