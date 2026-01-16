/*
  ==============================================================================

    ParameterModel.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    Parameter state management system.

    Handles parameter storage, smoothing, and serialization.
    Works with ParameterSpec.json for parameter definitions.

  ==============================================================================
*/

#pragma once

#include <vector>
#include <string>
#include <functional>
#include <cstring>
#include <algorithm>

namespace schill {
namespace core {

//==============================================================================
// Parameter Definition
//==============================================================================

struct ParameterDefinition {
    int id = -1;
    const char* name = nullptr;
    const char* shortName = nullptr;
    const char* label = nullptr;

    float minValue = 0.0f;
    float maxValue = 1.0f;
    float defaultValue = 0.0f;

    enum class Rate {
        Audio,      // Updated at sample rate
        Control,    // Updated at control rate
        Startup     // Set once at initialization
    };

    enum class Mapping {
        Linear,
        Log,
        Sqrt,
        Exp
    };

    Rate rate = Rate::Control;
    Mapping mapping = Mapping::Linear;
    bool polyphonic = false;

    // Callback when value changes
    std::function<void(float)> onChange;
};

//==============================================================================
// Parameter State
//==============================================================================

struct ParameterState {
    float rawValue = 0.0f;       // Actual parameter value
    float normalizedValue = 0.0f; // 0-1 normalized
    float smoothedValue = 0.0f;   // Smoothed for audio rate

    bool changed = false;
};

//==============================================================================
// Parameter Model
//==============================================================================

class ParameterModel {
public:
    ParameterModel() {
        // Reserve space for parameters
        parameters_.reserve(64);
        states_.reserve(64);
    }

    //==========================================================================
    // Parameter Definition
    //==========================================================================

    int addParameter(const ParameterDefinition& def) {
        int id = static_cast<int>(parameters_.size());
        parameters_.push_back(def);

        // Initialize state
        ParameterState state;
        state.rawValue = def.defaultValue;
        state.normalizedValue = rawToNormalized(def.defaultValue, def);
        state.smoothedValue = state.rawValue;
        state.changed = false;
        states_.push_back(state);

        return id;
    }

    const ParameterDefinition* getParameterDefinition(int parameterId) const {
        if (parameterId >= 0 && parameterId < static_cast<int>(parameters_.size())) {
            return &parameters_[parameterId];
        }
        return nullptr;
    }

    //==========================================================================
    // Parameter Access
    //==========================================================================

    void setParameterValue(int parameterId, float value) {
        if (parameterId < 0 || parameterId >= static_cast<int>(states_.size())) {
            return;
        }

        auto& def = parameters_[parameterId];
        auto& state = states_[parameterId];

        // Clamp to range
        value = std::max(def.minValue, std::min(def.maxValue, value));

        // Update state
        state.rawValue = value;
        state.normalizedValue = rawToNormalized(value, def);
        state.changed = true;

        // Trigger callback
        if (def.onChange) {
            def.onChange(value);
        }
    }

    float getParameterValue(int parameterId) const {
        if (parameterId >= 0 && parameterId < static_cast<int>(states_.size())) {
            return states_[parameterId].rawValue;
        }
        return 0.0f;
    }

    float getParameterNormalized(int parameterId) const {
        if (parameterId >= 0 && parameterId < static_cast<int>(states_.size())) {
            return states_[parameterId].normalizedValue;
        }
        return 0.0f;
    }

    void setParameterNormalized(int parameterId, float normalized) {
        if (parameterId < 0 || parameterId >= static_cast<int>(parameters_.size())) {
            return;
        }

        auto& def = parameters_[parameterId];
        float rawValue = normalizedToRaw(normalized, def);
        setParameterValue(parameterId, rawValue);
    }

    //==========================================================================
    // Parameter Smoothing
    //==========================================================================

    void prepareSmoothing(double sampleRate, float smoothingTimeMs = 50.0f) {
        float smoothingTimeSec = smoothingTimeMs / 1000.0f;
        smoothingCoefficient_ = 1.0f - std::exp(-1.0f / (smoothingTimeSec * static_cast<float>(sampleRate)));
    }

    void processSmoothing(int parameterId) {
        if (parameterId < 0 || parameterId >= static_cast<int>(states_.size())) {
            return;
        }

        auto& state = states_[parameterId];
        auto& def = parameters_[parameterId];

        // Only smooth audio-rate parameters
        if (def.rate == ParameterDefinition::Rate::Audio) {
            float delta = state.rawValue - state.smoothedValue;
            state.smoothedValue += delta * smoothingCoefficient_;
        } else {
            // Control-rate parameters update instantly
            state.smoothedValue = state.rawValue;
        }
    }

    void processAllSmoothing() {
        for (size_t i = 0; i < states_.size(); ++i) {
            processSmoothing(static_cast<int>(i));
        }
    }

    float getSmoothedValue(int parameterId) const {
        if (parameterId >= 0 && parameterId < static_cast<int>(states_.size())) {
            return states_[parameterId].smoothedValue;
        }
        return 0.0f;
    }

    //==========================================================================
    // State Serialization
    //==========================================================================

    void getState(std::vector<float>& state) const {
        state.clear();
        state.reserve(states_.size());

        for (const auto& s : states_) {
            state.push_back(s.rawValue);
        }
    }

    void setState(const float* state, int numParameters) {
        int numToSet = std::min(numParameters, static_cast<int>(states_.size()));

        for (int i = 0; i < numToSet; ++i) {
            setParameterValue(i, state[i]);
        }
    }

    //==========================================================================
    // Reset
    //==========================================================================

    void reset() {
        for (size_t i = 0; i < parameters_.size(); ++i) {
            auto& def = parameters_[i];
            auto& state = states_[i];

            state.rawValue = def.defaultValue;
            state.normalizedValue = rawToNormalized(def.defaultValue, def);
            state.smoothedValue = state.rawValue;
            state.changed = false;
        }
    }

    //==========================================================================
    // Utility
    //==========================================================================

    int getNumParameters() const {
        return static_cast<int>(parameters_.size());
    }

    bool hasChanged(int parameterId) const {
        if (parameterId >= 0 && parameterId < static_cast<int>(states_.size())) {
            return states_[parameterId].changed;
        }
        return false;
    }

    void clearChangeFlag(int parameterId) {
        if (parameterId >= 0 && parameterId < static_cast<int>(states_.size())) {
            states_[parameterId].changed = false;
        }
    }

private:
    //==========================================================================
    // Value Conversion
    //==========================================================================

    float rawToNormalized(float raw, const ParameterDefinition& def) const {
        float range = def.maxValue - def.minValue;
        float normalized = (raw - def.minValue) / range;

        switch (def.mapping) {
            case ParameterDefinition::Mapping::Linear:
                return normalized;

            case ParameterDefinition::Mapping::Log:
                // Log mapping: 0-1 maps to min-max logarithmically
                if (normalized <= 0.0f) return 0.0f;
                return std::log(normalized) / std::log(range);

            case ParameterDefinition::Mapping::Sqrt:
                return std::sqrt(normalized);

            case ParameterDefinition::Mapping::Exp:
                return normalized * normalized;

            default:
                return normalized;
        }
    }

    float normalizedToRaw(float normalized, const ParameterDefinition& def) const {
        float raw;

        switch (def.mapping) {
            case ParameterDefinition::Mapping::Linear:
                raw = normalized;
                break;

            case ParameterDefinition::Mapping::Log:
                // Inverse log mapping
                raw = std::pow(def.maxValue - def.minValue, normalized);
                break;

            case ParameterDefinition::Mapping::Sqrt:
                raw = normalized * normalized;
                break;

            case ParameterDefinition::Mapping::Exp:
                raw = std::sqrt(normalized);
                break;

            default:
                raw = normalized;
                break;
        }

        // Scale to range
        return def.minValue + raw * (def.maxValue - def.minValue);
    }

    //==========================================================================
    // Member Variables
    //==========================================================================

    std::vector<ParameterDefinition> parameters_;
    std::vector<ParameterState> states_;
    float smoothingCoefficient_ = 0.0f;
};

//==============================================================================
// Parameter Hash (for deterministic parameter handling)
//==============================================================================

class ParameterHash {
public:
    // Generate deterministic hash from parameter ID string
    static uint32_t generate(const char* parameterId) {
        uint32_t hash = 5381;

        for (const char* p = parameterId; *p != '\0'; ++p) {
            hash = ((hash << 5) + hash) + static_cast<uint32_t>(*p);  // hash * 33 + c
        }

        return hash;
    }

    // Generate index from hash (for array indexing)
    static int hashToIndex(uint32_t hash, int tableSize) {
        return static_cast<int>(hash % static_cast<uint32_t>(tableSize));
    }

    // Combine two hashes
    static uint32_t combine(uint32_t hash1, uint32_t hash2) {
        return hash1 ^ (hash2 + 0x9e3779b9 + (hash1 << 6) + (hash1 >> 2));
    }
};

} // namespace core
} // namespace schill
