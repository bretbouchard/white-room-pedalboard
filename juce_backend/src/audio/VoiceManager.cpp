/**
 * White Room Voice Manager Implementation
 *
 * SPEC-005: Real-time safe, single-threaded SIMD implementation
 * No threading, all processing on audio thread with SIMD optimizations
 */

#include "audio/VoiceManager.h"
#include <algorithm>
#include <cmath>
#include <cstring>  // For memset

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
    voice.pan = 0.0f;  // Default center pan
    voice.panGains = PanPosition::fromPan(0.0f);  // Center pan gains

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

// -------------------------------------------------------------------------
// SIMD BATCH PROCESSING (SPEC-005)
// -------------------------------------------------------------------------

void VoiceManager::processSIMD(SIMDVoiceBatch& batch,
                               float* outputLeft,
                               float* outputRight,
                               int numSamples) {
    // Clear output buffers
    std::memset(outputLeft, 0, numSamples * sizeof(float));
    std::memset(outputRight, 0, numSamples * sizeof(float));

    // Process active voices in batch
    for (size_t i = 0; i < SIMDVoiceBatch::BatchSize; ++i) {
        if (!batch.active[i]) {
            continue;  // Skip inactive voices
        }

        const float velocity = batch.velocities[i];
        const float leftGain = batch.leftGains[i];
        const float rightGain = batch.rightGains[i];

        // TODO: Replace with actual DSP processing
        // For now, generate silence as placeholder
        // Real implementation would:
        // 1. Get oscillator samples
        // 2. Apply filter
        // 3. Apply envelope
        // 4. Mix to output with pan gains

        // Placeholder: Just apply velocity scaling
        const float scaledGain = velocity / 127.0f;

#ifdef WHITE_ROOM_SIMD_SSE2
        // SSE2 implementation for 4-sample processing
        const int simdSamples = (numSamples / 4) * 4;
        for (int s = 0; s < simdSamples; s += 4) {
            __m128 left = _mm_load_ps(&outputLeft[s]);
            __m128 right = _mm_load_ps(&outputRight[s]);

            // Apply gains (placeholder, would use actual DSP output)
            __m128 gainL = _mm_set1_ps(leftGain * scaledGain);
            __m128 gainR = _mm_set1_ps(rightGain * scaledGain);

            left = _mm_add_ps(left, gainL);
            right = _mm_add_ps(right, gainR);

            _mm_store_ps(&outputLeft[s], left);
            _mm_store_ps(&outputRight[s], right);
        }

        // Process remaining samples scalar
        for (int s = simdSamples; s < numSamples; ++s) {
            outputLeft[s] += leftGain * scaledGain;
            outputRight[s] += rightGain * scaledGain;
        }
#else
        // Scalar fallback
        for (int s = 0; s < numSamples; ++s) {
            outputLeft[s] += leftGain * scaledGain;
            outputRight[s] += rightGain * scaledGain;
        }
#endif
    }
}

int VoiceManager::getNextSIMDBatch(SIMDVoiceBatch& batch, int startIndex) {
    // Reset batch
    for (size_t i = 0; i < SIMDVoiceBatch::BatchSize; ++i) {
        batch.active[i] = false;
        batch.indices[i] = -1;
        batch.pitches[i] = 0.0f;
        batch.velocities[i] = 0.0f;
        batch.leftGains[i] = 0.0f;
        batch.rightGains[i] = 0.0f;
    }

    // Fill batch with active voices starting from startIndex
    size_t batchIndex = 0;
    for (int i = startIndex; i < static_cast<int>(voices_.size()) &&
                          batchIndex < SIMDVoiceBatch::BatchSize; ++i) {
        const auto& voice = voices_[i];
        if (voice.state == VoiceState::Active || voice.state == VoiceState::Releasing) {
            batch.active[batchIndex] = true;
            batch.indices[batchIndex] = voice.index;
            batch.pitches[batchIndex] = static_cast<float>(voice.pitch);
            batch.velocities[batchIndex] = static_cast<float>(voice.velocity);
            batch.leftGains[batchIndex] = voice.panGains.left;
            batch.rightGains[batchIndex] = voice.panGains.right;
            ++batchIndex;
        }
    }

    return static_cast<int>(batchIndex);
}

void VoiceManager::mixStereoOutput(const SIMDVoiceBatch& batch,
                                  float* outputLeft,
                                  float* outputRight,
                                  int numSamples) {
    // SIMD horizontal mixing for stereo output
    // This combines all voices in batch to final stereo output

#ifdef WHITE_ROOM_SIMD_SSE2
    // Process 4 samples at once using SSE2
    const int simdSamples = (numSamples / 4) * 4;

    for (int s = 0; s < simdSamples; s += 4) {
        __m128 mixL = _mm_setzero_ps();
        __m128 mixR = _mm_setzero_ps();

        // Accumulate all active voices
        for (size_t i = 0; i < SIMDVoiceBatch::BatchSize; ++i) {
            if (!batch.active[i]) continue;

            // TODO: Get actual voice output samples
            // For now, just use gains
            __m128 gainL = _mm_set1_ps(batch.leftGains[i]);
            __m128 gainR = _mm_set1_ps(batch.rightGains[i]);

            mixL = _mm_add_ps(mixL, gainL);
            mixR = _mm_add_ps(mixR, gainR);
        }

        // Load current output
        __m128 outL = _mm_load_ps(&outputLeft[s]);
        __m128 outR = _mm_load_ps(&outputRight[s]);

        // Mix and store
        outL = _mm_add_ps(outL, mixL);
        outR = _mm_add_ps(outR, mixR);

        _mm_store_ps(&outputLeft[s], outL);
        _mm_store_ps(&outputRight[s], outR);
    }

    // Process remaining samples
    for (int s = simdSamples; s < numSamples; ++s) {
        float mixL = 0.0f;
        float mixR = 0.0f;

        for (size_t i = 0; i < SIMDVoiceBatch::BatchSize; ++i) {
            if (!batch.active[i]) continue;
            mixL += batch.leftGains[i];
            mixR += batch.rightGains[i];
        }

        outputLeft[s] += mixL;
        outputRight[s] += mixR;
    }
#else
    // Scalar fallback
    for (int s = 0; s < numSamples; ++s) {
        float mixL = 0.0f;
        float mixR = 0.0f;

        for (size_t i = 0; i < SIMDVoiceBatch::BatchSize; ++i) {
            if (!batch.active[i]) continue;
            mixL += batch.leftGains[i];
            mixR += batch.rightGains[i];
        }

        outputLeft[s] += mixL;
        outputRight[s] += mixR;
    }
#endif
}

void VoiceManager::setVoicePan(int voiceIndex, float pan) {
    if (voiceIndex < 0 || voiceIndex >= static_cast<int>(voices_.size())) {
        return;  // Invalid voice index
    }

    auto& voice = voices_[voiceIndex];
    voice.pan = pan;
    voice.panGains = PanPosition::fromPan(pan);
}

} // namespace audio
} // namespace white_room
