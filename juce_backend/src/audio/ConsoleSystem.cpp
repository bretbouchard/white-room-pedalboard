/**
 * White Room Console / Mixing System Implementation
 *
 * T023: Implement Console/Mixing System
 */

#include "audio/ConsoleSystem.h"
#include <algorithm>
#include <cmath>
#include <cassert>

namespace white_room {
namespace audio {

// Forward declaration for AudioBuffer (will be provided by audio engine)
class AudioBuffer;

// Helper function for clamping values
template<typename T>
inline T clamp(T value, T min, T max) {
    return value < min ? min : (value > max ? max : value);
}

// =============================================================================
// CONSOLE SYSTEM IMPLEMENTATION
// =============================================================================

ConsoleSystem::ConsoleSystem(const ConsoleConfig& config,
                             double sampleRate,
                             int bufferSize)
    : config_(config)
    , sampleRate_(sampleRate)
    , bufferSize_(bufferSize)
{
    // Create master bus (always present)
    BusConfig masterConfig;
    masterConfig.name = "Master";
    masterConfig.type = BusType::Master;
    masterConfig.busIndex = 0;
    masterConfig.gain = 1.0;
    masterConfig.pan = 0.0;
    masterConfig.muted = false;

    buses_.push_back(masterConfig);
    busMeters_[0] = LevelMeter();
}

ConsoleSystem::~ConsoleSystem() = default;

// -------------------------------------------------------------------------
// BUS MANAGEMENT
// -------------------------------------------------------------------------

bool ConsoleSystem::addBus(const BusConfig& config) {
    // Check for duplicate bus index
    for (const auto& bus : buses_) {
        if (bus.busIndex == config.busIndex) {
            return false;  // Bus index already exists
        }
    }

    buses_.push_back(config);
    busMeters_[config.busIndex] = LevelMeter();
    return true;
}

bool ConsoleSystem::removeBus(int busIndex) {
    // Cannot remove master bus
    if (busIndex == 0) {
        return false;
    }

    auto it = std::find_if(buses_.begin(), buses_.end(),
        [busIndex](const BusConfig& bus) { return bus.busIndex == busIndex; });

    if (it != buses_.end()) {
        buses_.erase(it);
        busMeters_.erase(busIndex);
        effects_.erase(busIndex);
        routing_.erase(busIndex);
        return true;
    }

    return false;
}

BusConfig ConsoleSystem::getBusConfig(int busIndex) const {
    for (const auto& bus : buses_) {
        if (bus.busIndex == busIndex) {
            return bus;
        }
    }
    return BusConfig();  // Invalid bus
}

void ConsoleSystem::setBusGain(int busIndex, double gain) {
    for (auto& bus : buses_) {
        if (bus.busIndex == busIndex) {
            bus.gain = clamp(gain, 0.0, 2.0);
            break;
        }
    }
}

void ConsoleSystem::setBusPan(int busIndex, double pan) {
    for (auto& bus : buses_) {
        if (bus.busIndex == busIndex) {
            bus.pan = clamp(pan, -1.0, 1.0);
            break;
        }
    }
}

void ConsoleSystem::setBusMuted(int busIndex, bool muted) {
    for (auto& bus : buses_) {
        if (bus.busIndex == busIndex) {
            bus.muted = muted;
            break;
        }
    }
}

LevelMeter ConsoleSystem::getBusLevels(int busIndex) const {
    auto it = busMeters_.find(busIndex);
    if (it != busMeters_.end()) {
        return it->second;
    }
    return LevelMeter();
}

// -------------------------------------------------------------------------
// EFFECT MANAGEMENT
// -------------------------------------------------------------------------

bool ConsoleSystem::addEffect(int busIndex, const EffectConfig& effect) {
    // Initialize effect to bypassed (silent by default)
    EffectConfig effectCopy = effect;
    effectCopy.state = EffectState::Bypassed;

    effects_[busIndex].push_back(effectCopy);
    return true;
}

bool ConsoleSystem::removeEffect(int busIndex, int effectIndex) {
    auto it = effects_.find(busIndex);
    if (it != effects_.end() && effectIndex >= 0 &&
        effectIndex < static_cast<int>(it->second.size())) {
        it->second.erase(it->second.begin() + effectIndex);
        return true;
    }
    return false;
}

EffectConfig ConsoleSystem::getEffectConfig(int busIndex, int effectIndex) const {
    auto it = effects_.find(busIndex);
    if (it != effects_.end() && effectIndex >= 0 &&
        effectIndex < static_cast<int>(it->second.size())) {
        return it->second[effectIndex];
    }
    return EffectConfig();
}

void ConsoleSystem::setEffectState(int busIndex, int effectIndex, EffectState state) {
    auto it = effects_.find(busIndex);
    if (it != effects_.end() && effectIndex >= 0 &&
        effectIndex < static_cast<int>(it->second.size())) {
        it->second[effectIndex].state = state;
    }
}

void ConsoleSystem::setEffectParameter(int busIndex, int effectIndex,
                                      const std::string& param, double value) {
    auto it = effects_.find(busIndex);
    if (it != effects_.end() && effectIndex >= 0 &&
        effectIndex < static_cast<int>(it->second.size())) {
        it->second[effectIndex].parameters[param] = value;
    }
}

double ConsoleSystem::getEffectParameter(int busIndex, int effectIndex,
                                        const std::string& param) const {
    auto it = effects_.find(busIndex);
    if (it != effects_.end() && effectIndex >= 0 &&
        effectIndex < static_cast<int>(it->second.size())) {
        auto paramIt = it->second[effectIndex].parameters.find(param);
        if (paramIt != it->second[effectIndex].parameters.end()) {
            return paramIt->second;
        }
    }
    return 0.0;
}

// -------------------------------------------------------------------------
// ROUTING MANAGEMENT
// -------------------------------------------------------------------------

bool ConsoleSystem::addRouting(const RoutingConnection& routing) {
    routing_[routing.sourceBus].push_back(routing);
    return true;
}

bool ConsoleSystem::removeRouting(int sourceBus, int destBus) {
    auto it = routing_.find(sourceBus);
    if (it != routing_.end()) {
        auto routeIt = std::find_if(it->second.begin(), it->second.end(),
            [destBus](const RoutingConnection& r) { return r.destBus == destBus; });

        if (routeIt != it->second.end()) {
            it->second.erase(routeIt);
            return true;
        }
    }
    return false;
}

void ConsoleSystem::setRoutingAmount(int sourceBus, int destBus, double amount) {
    auto it = routing_.find(sourceBus);
    if (it != routing_.end()) {
        for (auto& routing : it->second) {
            if (routing.destBus == destBus) {
                routing.amount = clamp(amount, 0.0, 1.0);
                break;
            }
        }
    }
}

std::vector<RoutingConnection> ConsoleSystem::getRoutings(int sourceBus) const {
    auto it = routing_.find(sourceBus);
    if (it != routing_.end()) {
        return it->second;
    }
    return {};
}

// -------------------------------------------------------------------------
// MASTER OUTPUT
// -------------------------------------------------------------------------

LevelMeter ConsoleSystem::getMasterLevels() const {
    return masterMeter_;
}

void ConsoleSystem::setMasterGain(double gain) {
    setBusGain(0, gain);  // Master is bus 0
}

// -------------------------------------------------------------------------
// AUDIO PROCESSING
// -------------------------------------------------------------------------

void ConsoleSystem::processAudio(AudioBuffer& buffer) {
    // Stub implementation for testing
    // Full audio processing implementation will be provided during integration
    (void)buffer;
}

void ConsoleSystem::updateMeters() {
    // Peak hold decay
    const float decay = std::exp(-1.0f / (meteringConfig_.peakHoldTime * sampleRate_));

    masterMeter_.peakHoldL *= decay;
    masterMeter_.peakHoldR *= decay;

    for (auto& [busIndex, meter] : busMeters_) {
        meter.peakHoldL *= decay;
        meter.peakHoldR *= decay;
    }
}

// -------------------------------------------------------------------------
// CONFIGURATION
// -------------------------------------------------------------------------

void ConsoleSystem::prepare(double sampleRate, int bufferSize) {
    sampleRate_ = sampleRate;
    bufferSize_ = bufferSize;

    // Prepare effects for each bus
    for (auto& [busIndex, effects] : effects_) {
        (void)busIndex;
        for (auto& effect : effects) {
            (void)effect;
            // TODO: Initialize actual effect processors
        }
    }
}

void ConsoleSystem::reset() {
    // Reset all meters
    masterMeter_.reset();
    busMeters_.clear();

    for (const auto& bus : buses_) {
        busMeters_[bus.busIndex] = LevelMeter();
    }
}

// -------------------------------------------------------------------------
// INTERNAL HELPERS
// -------------------------------------------------------------------------

void ConsoleSystem::processBus(int busIndex, AudioBuffer& buffer) {
    // Stub implementation for testing
    (void)busIndex;
    (void)buffer;
}

void ConsoleSystem::processEffects(int busIndex, AudioBuffer& buffer) {
    // Stub implementation for testing
    (void)busIndex;
    (void)buffer;
}

void ConsoleSystem::processRouting(int busIndex, AudioBuffer& buffer) {
    // Stub implementation for testing
    (void)busIndex;
    (void)buffer;
}

void ConsoleSystem::updateLevelMeter(LevelMeter& meter,
                                     const AudioBuffer& buffer) {
    // Stub implementation for testing
    (void)meter;
    (void)buffer;
}

} // namespace audio
} // namespace white_room
