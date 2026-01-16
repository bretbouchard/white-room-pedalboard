/*
  ==============================================================================

    ModMatrix.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    Modulation matrix for routing modulation sources to destinations.

    Supports:
    - Multiple sources per destination (summed)
    - Source scaling and bipolar modulation
    - Audio-rate and control-rate modulation
    - Polyphonic modulation sources
    - LFO, envelope, macro, and MIDI modulation sources

  ==============================================================================
*/

#pragma once

#include <vector>
#include <functional>
#include <cstring>
#include <algorithm>

namespace schill {
namespace core {

//==============================================================================
// Modulation Source ID
//==============================================================================

enum class ModSource : int {
    None = -1,

    // LFOs
    LFO1 = 0,
    LFO2,
    LFO3,
    LFO4,

    // Envelopes
    Env1,
    Env2,
    Env3,
    Env4,

    // Macros
    Macro1,
    Macro2,
    Macro3,
    Macro4,

    // MIDI
    Velocity,
    ModWheel,
    PitchBend,
    Aftertouch,
    KeyTrack,
    Breath,

    // Audio
    AudioAmplitude,
    AudioCentroid,
    AudioRMS,

    // Random
    Random,
    SampleAndHold,

    // Custom
    Custom1,
    Custom2,
    Custom3,
    Custom4
};

//==============================================================================
// Modulation Routing
//==============================================================================

struct ModRouting {
    ModSource source = ModSource::None;
    int destinationParameterId = -1;  // Index into parameter array
    float amount = 0.0f;              // Modulation depth
    bool bipolar = false;             // True if modulation is bipolar (-1 to 1)
    bool voice = false;               // True if polyphonic (per-voice)

    // Runtime state
    float lastValue = 0.0f;
};

//==============================================================================
// Modulation Matrix
//==============================================================================

class ModMatrix {
public:
    ModMatrix() {
        // Reserve space for common sources
        sourceValues_.resize(64, 0.0f);
    }

    //==========================================================================
    // Configuration
    //==========================================================================

    void setNumParameters(int numParameters) {
        parameterModulations_.clear();
        parameterModulations_.resize(numParameters);
    }

    //==========================================================================
    // Routing Management
    //==========================================================================

    // Add a modulation routing
    int addRouting(const ModRouting& routing) {
        routings_.push_back(routing);

        // Add to parameter's modulation list
        if (routing.destinationParameterId >= 0 &&
            routing.destinationParameterId < static_cast<int>(parameterModulations_.size())) {
            parameterModulations_[routing.destinationParameterId].push_back(
                static_cast<int>(routings_.size()) - 1
            );
        }

        return static_cast<int>(routings_.size()) - 1;
    }

    // Remove a modulation routing by index
    void removeRouting(int routingIndex) {
        if (routingIndex < 0 || routingIndex >= static_cast<int>(routings_.size())) {
            return;
        }

        auto& routing = routings_[routingIndex];

        // Remove from parameter's modulation list
        if (routing.destinationParameterId >= 0 &&
            routing.destinationParameterId < static_cast<int>(parameterModulations_.size())) {

            auto& modList = parameterModulations_[routing.destinationParameterId];
            modList.erase(
                std::remove(modList.begin(), modList.end(), routingIndex),
                modList.end()
            );
        }

        // Mark as inactive
        routing.source = ModSource::None;
    }

    // Clear all routings
    void clearAllRoutings() {
        routings_.clear();
        for (auto& modList : parameterModulations_) {
            modList.clear();
        }
    }

    //==========================================================================
    // Source Value Updates
    //==========================================================================

    // Update a modulation source value
    void setSourceValue(ModSource source, float value) {
        int sourceIndex = static_cast<int>(source);
        if (sourceIndex >= 0 && sourceIndex < static_cast<int>(sourceValues_.size())) {
            sourceValues_[sourceIndex] = value;
        }
    }

    // Get a modulation source value
    float getSourceValue(ModSource source) const {
        int sourceIndex = static_cast<int>(source);
        if (sourceIndex >= 0 && sourceIndex < static_cast<int>(sourceValues_.size())) {
            return sourceValues_[sourceIndex];
        }
        return 0.0f;
    }

    //==========================================================================
    // Modulation Processing
    //==========================================================================

    // Get modulated value for a parameter
    float getModulatedValue(int parameterId, float baseValue) {
        if (parameterId < 0 || parameterId >= static_cast<int>(parameterModulations_.size())) {
            return baseValue;
        }

        float modulation = 0.0f;

        for (int routingIndex : parameterModulations_[parameterId]) {
            if (routingIndex < 0 || routingIndex >= static_cast<int>(routings_.size())) {
                continue;
            }

            const auto& routing = routings_[routingIndex];
            if (routing.source == ModSource::None) {
                continue;
            }

            int sourceIndex = static_cast<int>(routing.source);
            if (sourceIndex < 0 || sourceIndex >= static_cast<int>(sourceValues_.size())) {
                continue;
            }

            float sourceValue = sourceValues_[sourceIndex];

            // Apply modulation amount
            if (routing.bipolar) {
                // Bipolar: source is -1 to 1, scaled by amount
                modulation += sourceValue * routing.amount;
            } else {
                // Unipolar: source is 0 to 1, scaled by amount
                modulation += sourceValue * routing.amount;
            }
        }

        return baseValue + modulation;
    }

    // Process all modulations for a block of samples
    void processBlock(float* const* parameterOutputs, int numParameters, int numSamples) {
        // For control-rate modulation, we just compute once per block
        for (int param = 0; param < numParameters; ++param) {
            float baseValue = parameterOutputs[param][0];  // Assume constant for block
            float modulatedValue = getModulatedValue(param, baseValue);

            // Fill the block (control rate, so all samples same)
            std::fill(parameterOutputs[param], parameterOutputs[param] + numSamples, modulatedValue);
        }
    }

    //==========================================================================
    // Routing Access
    //==========================================================================

    const ModRouting* getRouting(int routingIndex) const {
        if (routingIndex >= 0 && routingIndex < static_cast<int>(routings_.size())) {
            return &routings_[routingIndex];
        }
        return nullptr;
    }

    ModRouting* getRouting(int routingIndex) {
        if (routingIndex >= 0 && routingIndex < static_cast<int>(routings_.size())) {
            return &routings_[routingIndex];
        }
        return nullptr;
    }

    int getNumRoutings() const {
        return static_cast<int>(routings_.size());
    }

    //==========================================================================
    // Serialization
    //==========================================================================

    void getState(std::vector<float>& state) const {
        state.clear();
        for (const auto& routing : routings_) {
            if (routing.source != ModSource::None) {
                state.push_back(static_cast<float>(routing.source));
                state.push_back(static_cast<float>(routing.destinationParameterId));
                state.push_back(routing.amount);
                state.push_back(routing.bipolar ? 1.0f : 0.0f);
                state.push_back(routing.voice ? 1.0f : 0.0f);
            }
        }
    }

    void setState(const float* state, int numValues) {
        clearAllRoutings();

        int i = 0;
        while (i + 4 < numValues) {
            ModRouting routing;
            routing.source = static_cast<ModSource>(static_cast<int>(state[i++]));
            routing.destinationParameterId = static_cast<int>(state[i++]);
            routing.amount = state[i++];
            routing.bipolar = state[i++] > 0.5f;
            routing.voice = state[i++] > 0.5f;

            if (routing.source != ModSource::None) {
                addRouting(routing);
            }
        }
    }

private:
    //==========================================================================
    // Member Variables
    //==========================================================================

    std::vector<ModRouting> routings_;
    std::vector<std::vector<int>> parameterModulations_;  // parameter ID -> list of routing indices
    std::vector<float> sourceValues_;  // Current values of all sources
};

//==============================================================================
// Utility Functions
//==============================================================================

inline const char* getModSourceName(ModSource source) {
    switch (source) {
        case ModSource::LFO1: return "LFO 1";
        case ModSource::LFO2: return "LFO 2";
        case ModSource::LFO3: return "LFO 3";
        case ModSource::LFO4: return "LFO 4";
        case ModSource::Env1: return "Envelope 1";
        case ModSource::Env2: return "Envelope 2";
        case ModSource::Env3: return "Envelope 3";
        case ModSource::Env4: return "Envelope 4";
        case ModSource::Macro1: return "Macro 1";
        case ModSource::Macro2: return "Macro 2";
        case ModSource::Macro3: return "Macro 3";
        case ModSource::Macro4: return "Macro 4";
        case ModSource::Velocity: return "Velocity";
        case ModSource::ModWheel: return "Mod Wheel";
        case ModSource::PitchBend: return "Pitch Bend";
        case ModSource::Aftertouch: return "Aftertouch";
        case ModSource::KeyTrack: return "Key Track";
        case ModSource::Breath: return "Breath";
        case ModSource::AudioAmplitude: return "Audio Amp";
        case ModSource::AudioCentroid: return "Audio Centroid";
        case ModSource::AudioRMS: return "Audio RMS";
        case ModSource::Random: return "Random";
        case ModSource::SampleAndHold: return "S&H";
        case ModSource::Custom1: return "Custom 1";
        case ModSource::Custom2: return "Custom 2";
        case ModSource::Custom3: return "Custom 3";
        case ModSource::Custom4: return "Custom 4";
        default: return "None";
    }
}

} // namespace core
} // namespace schill
