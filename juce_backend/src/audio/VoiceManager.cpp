/**
 * White Room Voice Manager Implementation
 *
 * T018: Implement Voice Manager
 */

#include "audio/VoiceManager.h"
#include <algorithm>
#include <cmath>

namespace white_room {
namespace audio {

// =============================================================================
// VOICE MANAGER IMPLEMENTATION
// =============================================================================

VoiceManager::VoiceManager(const VoiceManagerConfig& config)
    : config_(config)
{
    // Initialize voice pool
    voices_.resize(config_.maxPolyphony);

    for (int i = 0; i < config_.maxPolyphony; ++i) {
        voices_[i].index = i;
        voices_[i].state = VoiceState::Idle;
        voices_[i].priority = VoicePriority::Tertiary;
    }
}

VoiceManager::~VoiceManager() = default;

// -------------------------------------------------------------------------
// VOICE ALLOCATION
// -------------------------------------------------------------------------

int VoiceManager::allocateVoice(int pitch, int velocity, VoicePriority priority,
                                int role, int64_t startTime, double duration) {
    // First try to find an idle voice
    int voiceIndex = findIdleVoice();

    // If no idle voice and stealing is enabled, steal one
    if (voiceIndex < 0 && config_.enableStealing) {
        voiceIndex = findVoiceToSteal(role);
    }

    // Still no voice available
    if (voiceIndex < 0) {
        return -1;
    }

    // Configure the voice
    auto& voice = voices_[voiceIndex];
    voice.state = VoiceState::Active;
    voice.priority = priority;
    voice.pitch = pitch;
    voice.velocity = velocity;
    voice.startTime = startTime;
    voice.duration = duration;
    voice.stopTime = startTime + static_cast<int64_t>(duration * 48000.0); // TODO: Use actual sample rate
    voice.role = role;

    return voiceIndex;
}

void VoiceManager::releaseVoice(int voiceIndex, int64_t releaseTime) {
    if (voiceIndex < 0 || voiceIndex >= static_cast<int>(voices_.size())) {
        return;
    }

    auto& voice = voices_[voiceIndex];
    if (voice.state == VoiceState::Active) {
        voice.state = VoiceState::Releasing;
        voice.stopTime = releaseTime;
    }
}

void VoiceManager::stopAllVoices() {
    for (auto& voice : voices_) {
        if (voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) {
            voice.state = VoiceState::Idle;
            voice.pitch = 0;
            voice.velocity = 0;
            voice.startTime = 0;
            voice.stopTime = 0;
        }
    }
}

void VoiceManager::stopRoleVoices(int role) {
    for (auto& voice : voices_) {
        if (voice.role == role &&
            (voice.state == VoiceState::Active || voice.state == VoiceState::Releasing)) {
            voice.state = VoiceState::Idle;
        }
    }
}

// -------------------------------------------------------------------------
// VOICE STATE QUERIES
// -------------------------------------------------------------------------

VoiceInfo VoiceManager::getVoiceInfo(int voiceIndex) const {
    if (voiceIndex >= 0 && voiceIndex < static_cast<int>(voices_.size())) {
        return voices_[voiceIndex];
    }
    return VoiceInfo(); // Invalid voice
}

std::vector<VoiceInfo> VoiceManager::getActiveVoices() const {
    std::vector<VoiceInfo> active;

    for (const auto& voice : voices_) {
        if (voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) {
            active.push_back(voice);
        }
    }

    return active;
}

int VoiceManager::getActiveVoiceCount() const {
    int count = 0;
    for (const auto& voice : voices_) {
        if (voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) {
            ++count;
        }
    }
    return count;
}

int VoiceManager::getIdleVoiceCount() const {
    int count = 0;
    for (const auto& voice : voices_) {
        if (voice.state == VoiceState::Idle) {
            ++count;
        }
    }
    return count;
}

bool VoiceManager::isVoiceActive(int voiceIndex) const {
    if (voiceIndex >= 0 && voiceIndex < static_cast<int>(voices_.size())) {
        const auto& voice = voices_[voiceIndex];
        return voice.state == VoiceState::Active || voice.state == VoiceState::Releasing;
    }
    return false;
}

// -------------------------------------------------------------------------
// VOICE STEALING
// -------------------------------------------------------------------------

int VoiceManager::findVoiceToSteal(int excludeRole) const {
    switch (config_.stealingPolicy) {
        case StealingPolicy::Oldest:
            return findOldestVoice(excludeRole);
        case StealingPolicy::LowestPriority:
            return findLowestPriorityVoice(excludeRole);
        case StealingPolicy::Quietest:
            return findQuietestVoice(excludeRole);
        case StealingPolicy::Furthest:
            return findFurthestVoice(excludeRole);
        default:
            return findLowestPriorityVoice(excludeRole);
    }
}

void VoiceManager::setStealingPolicy(StealingPolicy policy) {
    config_.stealingPolicy = policy;
}

void VoiceManager::setStealingEnabled(bool enabled) {
    config_.enableStealing = enabled;
}

// -------------------------------------------------------------------------
// POLYPHONY MANAGEMENT
// -------------------------------------------------------------------------

void VoiceManager::setMaxPolyphony(int maxVoices) {
    if (maxVoices < 1 || maxVoices > 256) {
        return;  // Invalid polyphony
    }

    // TODO: Implement dynamic polyphony change
    // This requires careful voice migration
}

double VoiceManager::getPolyphonyUsage() const {
    const int active = getActiveVoiceCount();
    return static_cast<double>(active) / static_cast<double>(config_.maxPolyphony);
}

// -------------------------------------------------------------------------
// TIME UPDATES
// -------------------------------------------------------------------------

void VoiceManager::update(int64_t currentTime) {
    for (auto& voice : voices_) {
        // Check releasing voices
        if (voice.state == VoiceState::Releasing && currentTime >= voice.stopTime) {
            voice.state = VoiceState::Idle;
        }

        // Check active voices that have exceeded their duration
        if (voice.state == VoiceState::Active && currentTime >= voice.stopTime) {
            voice.state = VoiceState::Idle;
        }
    }
}

void VoiceManager::cleanupFinishedVoices() {
    for (auto& voice : voices_) {
        if (voice.state == VoiceState::Releasing || voice.state == VoiceState::Active) {
            // Check if voice has finished
            // Real implementation would check actual envelope state
            if (voice.state == VoiceState::Idle) {
                voice.pitch = 0;
                voice.velocity = 0;
                voice.startTime = 0;
                voice.stopTime = 0;
            }
        }
    }
}

// -------------------------------------------------------------------------
// INTERNAL HELPERS
// -------------------------------------------------------------------------

int VoiceManager::findIdleVoice() const {
    for (int i = 0; i < static_cast<int>(voices_.size()); ++i) {
        if (voices_[i].state == VoiceState::Idle) {
            return i;
        }
    }
    return -1;
}

int VoiceManager::findOldestVoice(int excludeRole) const {
    int64_t oldestTime = std::numeric_limits<int64_t>::max();
    int oldestIndex = -1;

    for (int i = 0; i < static_cast<int>(voices_.size()); ++i) {
        const auto& voice = voices_[i];
        if ((voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) &&
            voice.role != excludeRole &&
            voice.startTime < oldestTime) {
            oldestTime = voice.startTime;
            oldestIndex = i;
        }
    }

    return oldestIndex;
}

int VoiceManager::findLowestPriorityVoice(int excludeRole) const {
    int lowestPriority = -1; // No voice found yet
    int lowestIndex = -1;

    for (int i = 0; i < static_cast<int>(voices_.size()); ++i) {
        const auto& voice = voices_[i];
        if ((voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) &&
            voice.role != excludeRole) {
            const int priority = static_cast<int>(voice.priority);
            if (priority > lowestPriority) {  // Higher enum value = lower priority
                lowestPriority = priority;
                lowestIndex = i;
            }
        }
    }

    return lowestIndex;
}

int VoiceManager::findQuietestVoice(int excludeRole) const {
    int lowestVelocity = 128;
    int quietestIndex = -1;

    for (int i = 0; i < static_cast<int>(voices_.size()); ++i) {
        const auto& voice = voices_[i];
        if ((voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) &&
            voice.role != excludeRole &&
            voice.velocity < lowestVelocity) {
            lowestVelocity = voice.velocity;
            quietestIndex = i;
        }
    }

    return quietestIndex;
}

int VoiceManager::findFurthestVoice(int excludeRole) const {
    int64_t maxElapsed = 0;
    int furthestIndex = -1;
    const int64_t currentTime = 0; // TODO: Pass current time

    for (int i = 0; i < static_cast<int>(voices_.size()); ++i) {
        const auto& voice = voices_[i];
        if ((voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) &&
            voice.role != excludeRole) {
            const int64_t elapsed = currentTime - voice.startTime;
            if (elapsed > maxElapsed) {
                maxElapsed = elapsed;
                furthestIndex = i;
            }
        }
    }

    return furthestIndex;
}

} // namespace audio
} // namespace white_room
