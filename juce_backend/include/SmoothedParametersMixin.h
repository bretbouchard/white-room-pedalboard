/*
  ==============================================================================

    SmoothedParametersMixin.h
    Created: January 9, 2026
    Author: Bret Bouchard

    Universal parameter smoothing system for Schillinger instruments
    - Prevents zipper noise on parameter changes
    - Template-based design for any numeric type
    - Dual smoothing modes: standard (50ms) and fast (0.1ms)
    - Thread-safe parameter updates
    - Zero-allocation in process() method

    Inspired by Mutable Instruments' eurorack module design philosophy.

  ==============================================================================
*/

#pragma once

#include <juce_dsp/juce_dsp.h>
#include <atomic>
#include <array>
#include <memory>

namespace SchillingerEcosystem::DSP {

//==============================================================================
/**
 * @brief Smoothed parameter wrapper using JUCE's SmoothedValue
 *
 * Provides smooth parameter transitions to prevent zipper noise.
 * Two smoothing modes:
 * - Standard: 50ms for user-facing parameter changes
 * - Fast: 0.1ms for internal modulation signals
 *
 * @tparam ParameterType Numeric type (float, double, int)
 */
template<typename ParameterType>
class SmoothedParameter
{
public:
    //==============================================================================
    SmoothedParameter() = default;

    //==============================================================================
    /** Initialize smoothed value with sample rate
        @param sampleRate       Audio sample rate
        @param samplesPerBlock  Typical block size for optimization
    */
    void prepare(double sampleRate, int samplesPerBlock)
    {
        smoothed.reset(sampleRate, 0.05);      // 50ms smooth time
        fastSmoothed.reset(sampleRate, 0.0001); // 0.1ms for modulation
        smoothed.skip(numSamplesToSkip_);
    }

    //==============================================================================
    /** Set target value (smoothed transition)
        @param value New target value
    */
    void set(ParameterType value)
    {
        target.store(value, std::memory_order_relaxed);
        smoothed.setTargetValue(value);
        fastSmoothed.setTargetValue(value);
    }

    /** Set target value immediately (no smoothing, for preset changes)
        @param value New value to apply immediately
    */
    void setImmediate(ParameterType value)
    {
        target.store(value, std::memory_order_relaxed);
        smoothed.setCurrentAndTargetValue(value);
        fastSmoothed.setCurrentAndTargetValue(value);
    }

    //==============================================================================
    /** Get next smoothed value (standard smoothing)
        @return Next interpolated value
    */
    ParameterType getSmoothed()
    {
        return smoothed.getNextValue();
    }

    /** Get next smoothed value (fast smoothing for modulation)
        @return Next interpolated value
    */
    ParameterType getFast()
    {
        return fastSmoothed.getNextValue();
    }

    /** Get current target value (not smoothed)
        @return Current target value
    */
    ParameterType get() const
    {
        return target.load(std::memory_order_relaxed);
    }

    /** Check if smoothing is active
        @return true if still smoothing toward target
    */
    bool isSmoothing() const
    {
        return smoothed.isSmoothing();
    }

    //==============================================================================
    /** Reset to specific value
        @param value Reset value
    */
    void reset(ParameterType value = ParameterType())
    {
        target.store(value, std::memory_order_relaxed);
        smoothed.reset(value);
        fastSmoothed.reset(value);
    }

private:
    //==============================================================================
    std::atomic<ParameterType> target{ParameterType()};
    juce::SmoothedValue<ParameterType> smoothed;
    juce::SmoothedValue<ParameterType> fastSmoothed;
    int numSamplesToSkip_ = 0;  // Optimization for block processing
};

//==============================================================================
/**
 * @brief Container for multiple smoothed parameters
 *
 * Manages a collection of smoothed parameters with indexed access.
 * Useful for instruments with many parameters.
 *
 * @tparam ParameterType Numeric type (float, double, int)
 * @tparam MaxParameters Maximum number of parameters
 */
template<typename ParameterType, size_t MaxParameters>
class SmoothedParameterArray
{
public:
    //==============================================================================
    SmoothedParameterArray()
    {
        parameters_.fill(SmoothedParameter<ParameterType>());
    }

    //==============================================================================
    /** Initialize all smoothed parameters
        @param sampleRate       Audio sample rate
        @param samplesPerBlock  Typical block size
    */
    void prepare(double sampleRate, int samplesPerBlock)
    {
        for (auto& param : parameters_)
        {
            param.prepare(sampleRate, samplesPerBlock);
        }
    }

    //==============================================================================
    /** Set parameter by index
        @param index Parameter index
        @param value New value
    */
    void set(size_t index, ParameterType value)
    {
        jassert(index < MaxParameters);
        parameters_[index].set(value);
    }

    /** Set parameter immediately by index
        @param index Parameter index
        @param value New value
    */
    void setImmediate(size_t index, ParameterType value)
    {
        jassert(index < MaxParameters);
        parameters_[index].setImmediate(value);
    }

    //==============================================================================
    /** Get next smoothed value by index
        @param index Parameter index
        @return Next smoothed value
    */
    ParameterType getSmoothed(size_t index)
    {
        jassert(index < MaxParameters);
        return parameters_[index].getSmoothed();
    }

    /** Get next fast-smoothed value by index
        @param index Parameter index
        @return Next fast-smoothed value
    */
    ParameterType getFast(size_t index)
    {
        jassert(index < MaxParameters);
        return parameters_[index].getFast();
    }

    /** Get current target value by index
        @param index Parameter index
        @return Current target value
    */
    ParameterType get(size_t index) const
    {
        jassert(index < MaxParameters);
        return parameters_[index].get();
    }

    //==============================================================================
    /** Access parameter directly by index
        @param index Parameter index
        @return Reference to parameter
    */
    SmoothedParameter<ParameterType>& operator[](size_t index)
    {
        jassert(index < MaxParameters);
        return parameters_[index];
    }

    const SmoothedParameter<ParameterType>& operator[](size_t index) const
    {
        jassert(index < MaxParameters);
        return parameters_[index];
    }

    //==============================================================================
    /** Get maximum number of parameters
        @return Maximum capacity
    */
    static constexpr size_t size() { return MaxParameters; }

private:
    //==============================================================================
    std::array<SmoothedParameter<ParameterType>, MaxParameters> parameters_;
};

//==============================================================================
/**
 * @brief Mixin class for instruments to add smoothed parameter support
 *
 * Provides common smoothed parameter management for instruments.
 * Inherit from this class to add parameter smoothing capabilities.
 *
 * Example usage:
 * @code
 * class MyInstrument : public SmoothedParametersMixin<MyInstrument, 32>
 * {
 * public:
 *     void prepare(double sampleRate, int samplesPerBlock)
 *     {
 *         SmoothedParametersMixin::prepare(sampleRate, samplesPerBlock);
 *         // ... other preparation
 *     }
 *
 *     void process(float** output, int numSamples)
 *     {
 *         float cutoff = getSmoothed(PARAM_CUTOFF);
 *         float resonance = getSmoothed(PARAM_RESONANCE);
 *         // ... use smoothed values
 *     }
 *
 *     enum Parameters { PARAM_CUTOFF, PARAM_RESONANCE, ... };
 * };
 * @endcode
 *
 * @tparam DerivedType CRTP derived class
 * @tparam MaxParameters Maximum number of parameters
 */
template<typename DerivedType, size_t MaxParameters>
class SmoothedParametersMixin
{
public:
    //==============================================================================
    SmoothedParametersMixin() = default;
    virtual ~SmoothedParametersMixin() = default;

    //==============================================================================
    /** Initialize smoothed parameters
        @param sampleRate       Audio sample rate
        @param samplesPerBlock  Typical block size
    */
    void prepareSmoothedParameters(double sampleRate, int samplesPerBlock)
    {
        smoothedParams_.prepare(sampleRate, samplesPerBlock);
    }

    //==============================================================================
    /** Set smoothed parameter by index
        @param index Parameter index
        @param value New value
    */
    void setSmoothedParameter(size_t index, float value)
    {
        smoothedParams_.set(index, value);
    }

    /** Set parameter immediately (no smoothing)
        @param index Parameter index
        @param value New value
    */
    void setParameterImmediate(size_t index, float value)
    {
        smoothedParams_.setImmediate(index, value);
    }

    //==============================================================================
    /** Get next smoothed value
        @param index Parameter index
        @return Next smoothed value
    */
    float getSmoothed(size_t index)
    {
        return smoothedParams_.getSmoothed(index);
    }

    /** Get next fast-smoothed value
        @param index Parameter index
        @return Next fast-smoothed value
    */
    float getFast(size_t index)
    {
        return smoothedParams_.getFast(index);
    }

    /** Get current target value
        @param index Parameter index
        @return Current target value
    */
    float getParameterTarget(size_t index) const
    {
        return smoothedParams_.get(index);
    }

protected:
    //==============================================================================
    SmoothedParameterArray<float, MaxParameters> smoothedParams_;
};

//==============================================================================
/**
 * @brief Common parameter indices for Schillinger instruments
 *
 * Standardized parameter IDs to ensure consistency across instruments.
 * Instruments can extend these with their own parameters.
 */
struct StandardParameters
{
    // Core synthesis
    static constexpr size_t OSC_FREQUENCY = 0;
    static constexpr size_t OSC_DETUNE = 1;
    static constexpr size_t OSC_LEVEL = 2;

    // Filter
    static constexpr size_t FILTER_CUTOFF = 10;
    static constexpr size_t FILTER_RESONANCE = 11;
    static constexpr size_t FILTER_DRIVE = 12;

    // Envelope
    static constexpr size_t ENV_ATTACK = 20;
    static constexpr size_t ENV_DECAY = 21;
    static constexpr size_t ENV_SUSTAIN = 22;
    static constexpr size_t ENV_RELEASE = 23;

    // Effects
    static constexpr size_t EFFECTS_REVERB_MIX = 30;
    static constexpr size_t EFFECTS_DELAY_MIX = 31;
    static constexpr size_t EFFECTS_DRIVE = 32;

    // Global
    static constexpr size_t MASTER_VOLUME = 40;
    static constexpr size_t PITCH_BEND_RANGE = 41;
};

//==============================================================================
// Utility functions for parameter smoothing
//==============================================================================

namespace SmoothedParameterUtils
{
    /** Convert linear parameter to logarithmic frequency
        @param linear Linear value 0-1
        @param minFreq Minimum frequency in Hz
        @param maxFreq Maximum frequency in Hz
        @return Logarithmic frequency
    */
    inline float linearToLogFrequency(float linear, float minFreq = 20.0f, float maxFreq = 20000.0f)
    {
        return minFreq * std::pow(maxFreq / minFreq, linear);
    }

    /** Convert logarithmic frequency to linear parameter
        @param freq Frequency in Hz
        @param minFreq Minimum frequency in Hz
        @param maxFreq Maximum frequency in Hz
        @return Linear value 0-1
    */
    inline float logFrequencyToLinear(float freq, float minFreq = 20.0f, float maxFreq = 20000.0f)
    {
        return std::log(freq / minFreq) / std::log(maxFreq / minFreq);
    }

    /** Clamp value to range
        @param value Value to clamp
        @param min Minimum value
        @param max Maximum value
        @return Clamped value
    */
    inline float clamp(float value, float min, float max)
    {
        return (value < min) ? min : (value > max) ? max : value;
    }
}

} // namespace SchillingerEcosystem::DSP
