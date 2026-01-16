/*
  ==============================================================================

    EngineCore.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    Base class for all plugin DSP engines.

    This class defines the common interface that all DSP engines must implement.
    It provides platform-agnostic, format-independent DSP processing.

    CRITICAL RULES:
    - NO platform conditionals inside DSP
    - DSP must be 100% independent of plugin format
    - All plugins share same DSP core and parameter model

  ==============================================================================
*/

#pragma once

#include <cmath>
#include <algorithm>
#include <cstdint>
#include <vector>

namespace schill {
namespace core {

//==============================================================================
// DSP Engine Base Interface
//==============================================================================

class EngineCore {
public:
    virtual ~EngineCore() = default;

    //==========================================================================
    // Initialization
    //==========================================================================

    virtual void prepare(double sampleRate, int maxSamplesPerBlock) = 0;
    virtual void reset() = 0;

    //==========================================================================
    // Processing
    //==========================================================================

    virtual void processBlock(const float* const* inputChannels,
                             float* const* outputChannels,
                             int numInputChannels,
                             int numOutputChannels,
                             int numSamples) = 0;

    //==========================================================================
    // State Management
    //==========================================================================

    virtual void setParameter(const char* parameterId, float value) = 0;
    virtual float getParameter(const char* parameterId) const = 0;

    //==========================================================================
    // State Serialization
    //==========================================================================

    virtual void getState(std::vector<float>& state) const = 0;
    virtual void setState(const float* state, int numSamples) = 0;

protected:
    double sampleRate = 44100.0;
    int maxSamplesPerBlock = 512;
};

//==============================================================================
// Parameter Smoothing Helper
//==============================================================================

class ParameterSmoother {
public:
    ParameterSmoother() = default;

    void prepare(double sampleRate, float smoothingTimeMs = 50.0f) {
        float smoothingTimeSec = smoothingTimeMs / 1000.0f;
        coefficient = 1.0f - std::exp(-1.0f / (smoothingTimeSec * static_cast<float>(sampleRate)));
    }

    float process(float target) {
        current += coefficient * (target - current);
        return current;
    }

    void reset(float initialValue = 0.0f) {
        current = initialValue;
    }

    float getCurrent() const { return current; }

private:
    float current = 0.0f;
    float coefficient = 0.0f;
};

//==============================================================================
// Linear Interpolation Helper
//==============================================================================

inline float linearInterpolate(const float* buffer, int bufferSize, float position) {
    int index1 = static_cast<int>(position);
    int index2 = (index1 + 1) % bufferSize;
    float frac = position - index1;
    return buffer[index1] * (1.0f - frac) + buffer[index2] * frac;
}

//==============================================================================
// DB Conversion Helpers
//==============================================================================

inline float gainToDecibels(float gain) {
    return 20.0f * std::log10(std::max(1e-10f, gain));
}

inline float decibelsToGain(float db) {
    return std::pow(10.0f, db / 20.0f);
}

//==============================================================================
// Clamping Helper
//==============================================================================

template<typename T>
inline T clamp(T value, T min, T max) {
    return std::min(std::max(value, min), max);
}

//==============================================================================
// Soft Clipping (for saturation)
//==============================================================================

inline float softClip(float x) {
    // tanh-based soft clipping
    return std::tanh(x);
}

inline float cubicSoftClip(float x) {
    // Cubic soft clipping (smoother)
    if (x > 1.0f) return 1.0f;
    if (x < -1.0f) return -1.0f;
    return x - (x * x * x) / 3.0f;
}

} // namespace core
} // namespace schill
