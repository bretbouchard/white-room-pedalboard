/*
  ==============================================================================

    VoiceAllocator.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    Polyphonic voice allocation system.

    Manages voice stealing, note assignment, and voice lifecycle for
    polyphonic instruments and effects.

    Strategies:
    - LIFO (Last In First Out) - Steal most recently played voice
    - FIFO (First In First Out) - Steal oldest playing voice
    - Lowest Priority - Steal quietest/lowest priority voice
    - Highest Amplitude - Steal loudest voice (masking effect)

  ==============================================================================
*/

#pragma once

#include <vector>
#include <algorithm>
#include <cstdint>
#include <cstring>

namespace schill {
namespace core {

//==============================================================================
// Voice State
//==============================================================================

struct VoiceState {
    bool active = false;
    int noteNumber = -1;
    float velocity = 0.0f;
    uint32_t age = 0;  // Incremented each block, used for LIFO/FIFO
    float amplitude = 0.0f;  // Current amplitude for stealing decisions
    void* voiceData = nullptr;  // Pointer to DSP engine's voice data
};

//==============================================================================
// Voice Allocation Strategy
//==============================================================================

enum class VoiceStealStrategy {
    LIFO,           // Steal most recent voice
    FIFO,           // Steal oldest voice
    LowestPriority, // Steal quietest voice
    HighestAmp,     // Steal loudest voice
    None            // Don't steal (fail if no free voices)
};

//==============================================================================
// Voice Allocator
//==============================================================================

class VoiceAllocator {
public:
    VoiceAllocator(int maxVoices = 16, VoiceStealStrategy strategy = VoiceStealStrategy::LIFO)
        : maxVoices_(maxVoices)
        , strategy_(strategy)
        , voiceAge_(0)
    {
        voices_.resize(maxVoices);
        noteToVoiceMap_.resize(128, -1);  // MIDI note range
    }

    //==========================================================================
    // Configuration
    //==========================================================================

    void setMaxVoices(int maxVoices) {
        maxVoices_ = maxVoices;
        voices_.resize(maxVoices);
    }

    void setStealStrategy(VoiceStealStrategy strategy) {
        strategy_ = strategy;
    }

    //==========================================================================
    // Voice Allocation
    //==========================================================================

    // Allocate a voice for a note. Returns voice index, or -1 if failed.
    int allocateVoice(int noteNumber, float velocity) {
        // Check if note is already playing
        int existingVoice = findVoiceForNote(noteNumber);
        if (existingVoice >= 0) {
            // Re-trigger existing voice
            voices_[existingVoice].velocity = velocity;
            voices_[existingVoice].age = voiceAge_++;
            return existingVoice;
        }

        // Find free voice
        int freeVoice = findFreeVoice();
        if (freeVoice >= 0) {
            voices_[freeVoice].active = true;
            voices_[freeVoice].noteNumber = noteNumber;
            voices_[freeVoice].velocity = velocity;
            voices_[freeVoice].age = voiceAge_++;
            voices_[freeVoice].amplitude = velocity;
            noteToVoiceMap_[noteNumber] = freeVoice;
            return freeVoice;
        }

        // No free voices - steal one
        int stolenVoice = stealVoice();
        if (stolenVoice >= 0) {
            // Update mapping for stolen note
            if (voices_[stolenVoice].noteNumber >= 0) {
                noteToVoiceMap_[voices_[stolenVoice].noteNumber] = -1;
            }

            // Allocate to new note
            voices_[stolenVoice].noteNumber = noteNumber;
            voices_[stolenVoice].velocity = velocity;
            voices_[stolenVoice].age = voiceAge_++;
            voices_[stolenVoice].amplitude = velocity;
            noteToVoiceMap_[noteNumber] = stolenVoice;
            return stolenVoice;
        }

        return -1;  // Failed to allocate
    }

    // Release a voice by note number
    void releaseVoice(int noteNumber) {
        int voiceIndex = noteToVoiceMap_[noteNumber];
        if (voiceIndex >= 0 && voiceIndex < maxVoices_) {
            voices_[voiceIndex].active = false;
            voices_[voiceIndex].noteNumber = -1;
            voices_[voiceIndex].velocity = 0.0f;
            voices_[voiceIndex].amplitude = 0.0f;
            noteToVoiceMap_[noteNumber] = -1;
        }
    }

    // Release all voices
    void releaseAll() {
        for (auto& voice : voices_) {
            voice.active = false;
            voice.noteNumber = -1;
            voice.velocity = 0.0f;
            voice.amplitude = 0.0f;
        }
        std::fill(noteToVoiceMap_.begin(), noteToVoiceMap_.end(), -1);
    }

    //==========================================================================
    // Voice Access
    //==========================================================================

    VoiceState* getVoiceState(int voiceIndex) {
        if (voiceIndex >= 0 && voiceIndex < maxVoices_) {
            return &voices_[voiceIndex];
        }
        return nullptr;
    }

    int getNumActiveVoices() const {
        int count = 0;
        for (const auto& voice : voices_) {
            if (voice.active) count++;
        }
        return count;
    }

    //==========================================================================
    // Voice Amplitude Updates
    //==========================================================================

    void updateVoiceAmplitude(int voiceIndex, float amplitude) {
        if (voiceIndex >= 0 && voiceIndex < maxVoices_) {
            voices_[voiceIndex].amplitude = amplitude;
        }
    }

private:
    //==========================================================================
    // Internal Helpers
    //==========================================================================

    int findFreeVoice() const {
        for (int i = 0; i < maxVoices_; ++i) {
            if (!voices_[i].active) {
                return i;
            }
        }
        return -1;
    }

    int findVoiceForNote(int noteNumber) const {
        if (noteNumber >= 0 && noteNumber < 128) {
            return noteToVoiceMap_[noteNumber];
        }
        return -1;
    }

    int stealVoice() {
        if (strategy_ == VoiceStealStrategy::None) {
            return -1;
        }

        int stolenVoice = -1;

        switch (strategy_) {
            case VoiceStealStrategy::LIFO:
                stolenVoice = stealMostRecentVoice();
                break;

            case VoiceStealStrategy::FIFO:
                stolenVoice = stealOldestVoice();
                break;

            case VoiceStealStrategy::LowestPriority:
                stolenVoice = stealQuietestVoice();
                break;

            case VoiceStealStrategy::HighestAmp:
                stolenVoice = stealLoudestVoice();
                break;

            default:
                break;
        }

        return stolenVoice;
    }

    int stealMostRecentVoice() {
        int oldestAge = -1;
        int victim = -1;

        for (int i = 0; i < maxVoices_; ++i) {
            if (voices_[i].active) {
                if (voices_[i].age > oldestAge) {
                    oldestAge = voices_[i].age;
                    victim = i;
                }
            }
        }

        return victim;
    }

    int stealOldestVoice() {
        int youngestAge = 0x7FFFFFFF;
        int victim = -1;

        for (int i = 0; i < maxVoices_; ++i) {
            if (voices_[i].active) {
                if (voices_[i].age < youngestAge) {
                    youngestAge = voices_[i].age;
                    victim = i;
                }
            }
        }

        return victim;
    }

    int stealQuietestVoice() {
        float quietestAmplitude = 1e10f;
        int victim = -1;

        for (int i = 0; i < maxVoices_; ++i) {
            if (voices_[i].active) {
                if (voices_[i].amplitude < quietestAmplitude) {
                    quietestAmplitude = voices_[i].amplitude;
                    victim = i;
                }
            }
        }

        return victim;
    }

    int stealLoudestVoice() {
        float loudestAmplitude = -1.0f;
        int victim = -1;

        for (int i = 0; i < maxVoices_; ++i) {
            if (voices_[i].active) {
                if (voices_[i].amplitude > loudestAmplitude) {
                    loudestAmplitude = voices_[i].amplitude;
                    victim = i;
                }
            }
        }

        return victim;
    }

    //==========================================================================
    // Member Variables
    //==========================================================================

    int maxVoices_;
    VoiceStealStrategy strategy_;
    uint32_t voiceAge_;

    std::vector<VoiceState> voices_;
    std::vector<int> noteToVoiceMap_;  // MIDI note -> voice index mapping
};

} // namespace core
} // namespace schill
