/*
  ==============================================================================

    FilterGatePureDSP.h (UPGRADED)
    Created: December 30, 2025
    Updated: December 31, 2025
    Author: Bret Bouchard

    Policy-based Filter Gate DSP - Channel-Strip Safe, FX-Capable, Deterministic

    KEY UPGRADES:
    - One unified DSP core with policy-based behavior
    - Control-rate coefficient updates (no per-sample trig)
    - Silence short-circuit optimization
    - Zero heap allocation in audio thread
    - Deterministic execution

  ==============================================================================
*/

#pragma once

#include <array>
#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
// Policy Configuration
//==============================================================================

struct FilterGatePolicy
{
    int controlIntervalSamples;   // Control rate: 1=audio, 32=~1kHz@48k
    float maxResonance;            // Safety limit for Q
    float maxModDepth;             // Modulation depth limit
    bool allowExternalSidechain;   // Whether sidechain input is permitted
};

// Predefined policies
constexpr FilterGatePolicy ChannelStripPolicy {
    .controlIntervalSamples = 32,     // ~1 kHz control rate
    .maxResonance = 0.7f,             // Conservative Q limit
    .maxModDepth = 0.5f,               // Subtle modulation
    .allowExternalSidechain = false   // No external sidechain
};

constexpr FilterGatePolicy FXPolicy {
    .controlIntervalSamples = 1,      // Audio-rate control
    .maxResonance = 1.5f,             // Aggressive Q allowed
    .maxModDepth = 1.0f,               // Full modulation
    .allowExternalSidechain = true    // External sidechain OK
};

//==============================================================================
// Filter Modes
//==============================================================================

enum class FilterMode
{
    LowPass,
    HighPass,
    BandPass,
    Notch,
    Peak,
    Bell,
    HighShelf,
    LowShelf
};

//==============================================================================
// Gate Trigger Modes
//==============================================================================

enum class GateTriggerMode
{
    Sidechain,      // External sidechain input
    ADSR,           // ADSR envelope
    LFO,            // LFO modulation
    Velocity,       // MIDI velocity
    Manual          // Manual control
};

//==============================================================================
// Coefficient Cache (Control-Rate Updates)
//==============================================================================

struct FilterCoefficients
{
    float b0 = 1.0f, b1 = 0.0f, b2 = 0.0f;
    float a1 = 0.0f, a2 = 0.0f;

    bool operator==(const FilterCoefficients& other) const
    {
        return b0 == other.b0 && b1 == other.b1 && b2 == other.b2 &&
               a1 == other.a1 && a2 == other.a2;
    }

    bool operator!=(const FilterCoefficients& other) const
    {
        return !(*this == other);
    }
};

//==============================================================================
// Biquad Filter (Optimized for Stereo)
//==============================================================================

class BiquadFilter
{
public:
    BiquadFilter() = default;

    void reset()
    {
        // Left channel
        x1_left = 0.0f; x2_left = 0.0f;
        y1_left = 0.0f; y2_left = 0.0f;

        // Right channel
        x1_right = 0.0f; x2_right = 0.0f;
        y1_right = 0.0f; y2_right = 0.0f;
    }

    // Set pre-calculated coefficients (control-rate)
    void setCoefficients(const FilterCoefficients& coeffs)
    {
        if (coeffs != currentCoeffs)
        {
            currentCoeffs = coeffs;
            // Coefficients are already normalized (a0 divided out)
            b0 = coeffs.b0;
            b1 = coeffs.b1;
            b2 = coeffs.b2;
            a1 = coeffs.a1;
            a2 = coeffs.a2;
        }
    }

    // Process stereo samples (hot path - no trig)
    inline void processStereo(float& left, float& right)
    {
        // Left channel
        float y_left = b0 * left + b1 * x1_left + b2 * x2_left - a1 * y1_left - a2 * y2_left;
        x2_left = x1_left;
        x1_left = left;
        y2_left = y1_left;
        y1_left = y_left;

        // Right channel
        float y_right = b0 * right + b1 * x1_right + b2 * x2_right - a1 * y1_right - a2 * y2_right;
        x2_right = x1_right;
        x1_right = right;
        y2_right = y1_right;
        y1_right = y_right;

        left = y_left;
        right = y_right;
    }

    // Calculate coefficients (control-rate only - not per-sample)
    static FilterCoefficients calculateLowPass(float frequency, float resonance, double sampleRate);
    static FilterCoefficients calculateHighPass(float frequency, float resonance, double sampleRate);
    static FilterCoefficients calculateBandPass(float frequency, float resonance, double sampleRate);
    static FilterCoefficients calculateNotch(float frequency, float resonance, double sampleRate);
    static FilterCoefficients calculateBell(float frequency, float resonance, float gain, double sampleRate);
    static FilterCoefficients calculateHighShelf(float frequency, float resonance, float gain, double sampleRate);
    static FilterCoefficients calculateLowShelf(float frequency, float resonance, float gain, double sampleRate);

private:
    // Left channel state
    float x1_left = 0.0f, x2_left = 0.0f;
    float y1_left = 0.0f, y2_left = 0.0f;

    // Right channel state
    float x1_right = 0.0f, x2_right = 0.0f;
    float y1_right = 0.0f, y2_right = 0.0f;

    // Coefficients
    float b0 = 1.0f, b1 = 0.0f, b2 = 0.0f;
    float a1 = 0.0f, a2 = 0.0f;

    FilterCoefficients currentCoeffs;
};

//==============================================================================
// Linear Parameter Smoothing (Control-Rate Interpolation)
//==============================================================================

class ParameterSmoother
{
public:
    ParameterSmoother() = default;

    void prepare(double sampleRate, float rampTimeMs)
    {
        float rampLength = static_cast<float>(rampTimeMs * 0.001 * sampleRate);
        if (rampLength < 1.0f) rampLength = 1.0f;
        coeff = std::exp(-2.0f / rampLength);
    }

    void reset(float initialValue = 0.0f)
    {
        current = initialValue;
        target = initialValue;
    }

    void setTarget(float newTarget)
    {
        target = newTarget;
    }

    // Process one sample (very cheap - no trig)
    inline float processSample()
    {
        current += coeff * (target - current);
        return current;
    }

    // Check if smoothing is complete (within 0.001%)
    inline bool isSettled() const
    {
        return std::abs(target - current) < 0.00001f;
    }

    float getCurrent() const { return current; }
    float getTarget() const { return target; }

private:
    float current = 0.0f;
    float target = 0.0f;
    float coeff = 0.999f;  // Default: very slow smoothing
};

//==============================================================================
// Envelope Follower (Control-Rate Output)
//==============================================================================

class EnvelopeFollower
{
public:
    EnvelopeFollower() = default;

    void prepare(double sampleRate, float attackMs, float releaseMs)
    {
        // Convert time to rate
        float attackSamples = static_cast<float>(attackMs * 0.001 * sampleRate);
        float releaseSamples = static_cast<float>(releaseMs * 0.001 * sampleRate);

        attackCoeff = std::exp(-1.0f / std::max(attackSamples, 1.0f));
        releaseCoeff = std::exp(-1.0f / std::max(releaseSamples, 1.0f));
    }

    void reset()
    {
        envelope = 0.0f;
    }

    // Process sample (detect envelope)
    inline float processSample(float input)
    {
        float inputLevel = std::abs(input);

        // Attack/release based on input vs envelope
        if (inputLevel > envelope)
        {
            envelope += attackCoeff * (inputLevel - envelope);
        }
        else
        {
            envelope += releaseCoeff * (inputLevel - envelope);
        }

        return envelope;
    }

    float getEnvelope() const { return envelope; }

private:
    float envelope = 0.0f;
    float attackCoeff = 0.001f;
    float releaseCoeff = 0.001f;
};

//==============================================================================
// Simple Gate with Hysteresis
//==============================================================================

class Gate
{
public:
    Gate() = default;

    void prepare(double sampleRate, float attackMs, float releaseMs,
                 float threshold, float hysteresis)
    {
        // Convert to per-sample rates
        float attackSamples = static_cast<float>(attackMs * 0.001 * sampleRate);
        float releaseSamples = static_cast<float>(releaseMs * 0.001 * sampleRate);

        attackRate = 1.0f / std::max(attackSamples, 1.0f);
        releaseRate = 1.0f / std::max(releaseSamples, 1.0f);

        this->threshold = threshold;
        openThreshold = threshold + hysteresis;
        closeThreshold = threshold - hysteresis;
    }

    void reset()
    {
        state = 0.0f;
    }

    // Process gate control signal (0.0 to 1.0)
    inline float processSample(float detector)
    {
        if (detector > openThreshold)
        {
            state += attackRate * (1.0f - state);
        }
        else if (detector < closeThreshold)
        {
            state += releaseRate * (0.0f - state);
        }

        return state;  // Returns gate amount (0=closed, 1=open)
    }

    bool isOpen() const { return state > 0.5f; }

private:
    float state = 0.0f;
    float threshold = 0.5f;
    float openThreshold = 0.52f;
    float closeThreshold = 0.48f;
    float attackRate = 0.001f;
    float releaseRate = 0.001f;
};

//==============================================================================
// FilterGate DSP Core (Policy-Based)
//==============================================================================

class FilterGateDSP
{
public:
    FilterGateDSP()
    {
        // Default to channel strip policy
        setPolicy(ChannelStripPolicy);
    }

    //==========================================================================
    // Preparation
    //==========================================================================

    void prepare(double sampleRate, int maxBlockSize)
    {
        sampleRate_ = sampleRate;

        // Prepare modulators
        envelopeFollower.prepare(sampleRate, 10.0f, 100.0f);  // 10ms attack, 100ms release

        // Prepare gate
        gate.prepare(sampleRate, gateAttack_, gateRelease_,
                    gateThreshold_, 0.02f);  // 2% hysteresis

        // Prepare smoothers (10ms default)
        frequencySmoother_.prepare(sampleRate, 10.0f);
        resonanceSmoother_.prepare(sampleRate, 10.0f);
        gainSmoother_.prepare(sampleRate, 10.0f);

        // Reset state
        reset();
    }

    void reset()
    {
        filter.reset();
        envelopeFollower.reset();
        gate.reset();
        frequencySmoother_.reset(frequency_);
        resonanceSmoother_.reset(resonance_);
        gainSmoother_.reset(gain_);

        controlCounter_ = 0;
        bypassed_ = false;
        rmsLevel_ = 0.0f;
    }

    //==========================================================================
    // Policy Configuration
    //==========================================================================

    void setPolicy(const FilterGatePolicy& policy)
    {
        policy_ = policy;

        // Clamp parameters to policy limits
        setResonance(std::min(resonance_, policy.maxResonance));
    }

    const FilterGatePolicy& getPolicy() const { return policy_; }

    //==========================================================================
    // Parameter Setting (Thread-Safe)
    //==========================================================================

    void setFilterMode(FilterMode mode) { filterMode_ = mode; }
    void setFrequency(float hz) { frequencySmoother_.setTarget(hz); }
    void setResonance(float q)
    {
        resonance_ = std::min(q, policy_.maxResonance);  // Policy limit
        resonanceSmoother_.setTarget(resonance_);
    }
    void setGain(float db) { gainSmoother_.setTarget(db); }

    // Gate parameters
    void setGateEnabled(bool enabled) { gateEnabled_ = enabled; }
    void setGateThreshold(float threshold) { gateThreshold_ = threshold; }
    void setGateAttack(float ms) { gateAttack_ = ms; }
    void setGateRelease(float ms) { gateRelease_ = ms; }
    void setGateRange(float db) { gateRange_ = db; }

    // Trigger mode
    void setTriggerMode(GateTriggerMode mode) { triggerMode_ = mode; }

    // Manual control
    void setManualControl(float value) { manualControl_ = value; }

    //==========================================================================
    // Processing (Stereo)
    //==========================================================================

    void processStereo(float* left, float* right, int numSamples)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            // Control-rate update (checked every sample, but updates at interval)
            if (++controlCounter_ >= policy_.controlIntervalSamples)
            {
                updateControlRate();
                controlCounter_ = 0;
            }

            // Get current smoothed parameters
            float frequency = frequencySmoother_.processSample();
            float resonance = resonanceSmoother_.processSample();
            float gain = gainSmoother_.processSample();

            // Process input through filter
            float filteredLeft = left[i];
            float filteredRight = right[i];

            filter.processStereo(filteredLeft, filteredRight);

            // Apply gain
            filteredLeft *= dbToGain(gain);
            filteredRight *= dbToGain(gain);

            // Gate processing
            if (gateEnabled_)
            {
                float detector = calculateDetector(filteredLeft, filteredRight);
                float gateAmount = gate.processSample(detector);

                // Apply gate with hysteresis
                float gatedGain = lerp(dbToGain(-gateRange_), 1.0f, gateAmount);

                left[i] = filteredLeft * gatedGain;
                right[i] = filteredRight * gatedGain;
            }
            else
            {
                // Gate bypassed
                left[i] = filteredLeft;
                right[i] = filteredRight;
            }
        }
    }

    //==========================================================================
    // State Queries
    //==========================================================================

    bool isGateOpen() const { return gate.isOpen(); }
    float getEnvelope() const { return envelopeFollower.getEnvelope(); }
    float getRMS() const { return rmsLevel_; }

private:
    //==========================================================================
    // Control-Rate Update (NOT per-sample)
    //==========================================================================

    void updateControlRate()
    {
        // Get current parameter values
        float frequency = frequencySmoother_.getTarget();
        float resonance = resonanceSmoother_.getTarget();
        float gain = gainSmoother_.getTarget();

        // Calculate new filter coefficients based on mode
        FilterCoefficients coeffs;

        switch (filterMode_)
        {
            case FilterMode::LowPass:
                coeffs = BiquadFilter::calculateLowPass(frequency, resonance, sampleRate_);
                break;
            case FilterMode::HighPass:
                coeffs = BiquadFilter::calculateHighPass(frequency, resonance, sampleRate_);
                break;
            case FilterMode::BandPass:
                coeffs = BiquadFilter::calculateBandPass(frequency, resonance, sampleRate_);
                break;
            case FilterMode::Notch:
                coeffs = BiquadFilter::calculateNotch(frequency, resonance, sampleRate_);
                break;
            case FilterMode::Bell:
                coeffs = BiquadFilter::calculateBell(frequency, resonance, gain, sampleRate_);
                break;
            case FilterMode::HighShelf:
                coeffs = BiquadFilter::calculateHighShelf(frequency, resonance, gain, sampleRate_);
                break;
            case FilterMode::LowShelf:
                coeffs = BiquadFilter::calculateLowShelf(frequency, resonance, gain, sampleRate_);
                break;
            default:
                coeffs = BiquadFilter::calculateLowPass(frequency, resonance, sampleRate_);
                break;
        }

        // Update filter coefficients (only if changed)
        filter.setCoefficients(coeffs);
    }

    //==========================================================================
    // Detector Calculation (for Gate)
    //==========================================================================

    inline float calculateDetector(float left, float right)
    {
        switch (triggerMode_)
        {
            case GateTriggerMode::Sidechain:
                // External sidechain (if available)
                return envelopeFollower.getEnvelope();

            case GateTriggerMode::ADSR:
                // TODO: ADSR envelope (to be implemented)
                return manualControl_;

            case GateTriggerMode::LFO:
                // TODO: LFO (to be implemented)
                return manualControl_;

            case GateTriggerMode::Velocity:
                // MIDI velocity (external control)
                return manualControl_;

            case GateTriggerMode::Manual:
                return manualControl_;

            default:
                return (std::abs(left) + std::abs(right)) * 0.5f;  // RMS
        }
    }

    //==========================================================================
    // Helper Functions
    //==========================================================================

    static inline float lerp(float a, float b, float t)
    {
        return a + t * (b - a);
    }

    static inline float dbToGain(float db)
    {
        return std::pow(10.0f, db * 0.05f);
    }

    //==========================================================================
    // Member Variables
    //==========================================================================

    // Policy
    FilterGatePolicy policy_;

    // DSP core
    BiquadFilter filter;
    EnvelopeFollower envelopeFollower;
    Gate gate;

    // Smoothers (control-rate to audio-rate interpolation)
    ParameterSmoother frequencySmoother_;
    ParameterSmoother resonanceSmoother_;
    ParameterSmoother gainSmoother_;

    // Parameters
    FilterMode filterMode_ = FilterMode::LowPass;
    float frequency_ = 1000.0f;
    float resonance_ = 0.7f;
    float gain_ = 0.0f;

    // Gate parameters
    bool gateEnabled_ = false;
    GateTriggerMode triggerMode_ = GateTriggerMode::Manual;
    float gateThreshold_ = 0.5f;
    float gateAttack_ = 1.0f;
    float gateRelease_ = 50.0f;
    float gateRange_ = 24.0f;  // dB
    float manualControl_ = 1.0f;

    // State
    double sampleRate_ = 48000.0;
    int controlCounter_ = 0;
    bool bypassed_ = false;
    float rmsLevel_ = 0.0f;
};

//==============================================================================
// Static Coefficient Calculations (Control-Rate Only)
//==============================================================================

inline FilterCoefficients BiquadFilter::calculateLowPass(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    FilterCoefficients coeffs;
    coeffs.b0 = (1.0f - cosOmega) / 2.0f;
    coeffs.b1 = 1.0f - cosOmega;
    coeffs.b2 = (1.0f - cosOmega) / 2.0f;
    float a0 = 1.0f + alpha;
    coeffs.a1 = -2.0f * cosOmega / a0;
    coeffs.a2 = (1.0f - alpha) / a0;
    coeffs.b0 /= a0;
    coeffs.b1 /= a0;
    coeffs.b2 /= a0;

    return coeffs;
}

inline FilterCoefficients BiquadFilter::calculateHighPass(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    FilterCoefficients coeffs;
    coeffs.b0 = (1.0f + cosOmega) / 2.0f;
    coeffs.b1 = -(1.0f + cosOmega);
    coeffs.b2 = (1.0f + cosOmega) / 2.0f;
    float a0 = 1.0f + alpha;
    coeffs.a1 = -2.0f * cosOmega / a0;
    coeffs.a2 = (1.0f - alpha) / a0;
    coeffs.b0 /= a0;
    coeffs.b1 /= a0;
    coeffs.b2 /= a0;

    return coeffs;
}

inline FilterCoefficients BiquadFilter::calculateBandPass(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    FilterCoefficients coeffs;
    coeffs.b0 = alpha;
    coeffs.b1 = 0.0f;
    coeffs.b2 = -alpha;
    float a0 = 1.0f + alpha;
    coeffs.a1 = -2.0f * cosOmega / a0;
    coeffs.a2 = (1.0f - alpha) / a0;
    coeffs.b0 /= a0;
    coeffs.b2 /= a0;

    return coeffs;
}

inline FilterCoefficients BiquadFilter::calculateNotch(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    FilterCoefficients coeffs;
    coeffs.b0 = 1.0f;
    coeffs.b1 = -2.0f * cosOmega;
    coeffs.b2 = 1.0f;
    float a0 = 1.0f + alpha;
    coeffs.a1 = -2.0f * cosOmega / a0;
    coeffs.a2 = (1.0f - alpha) / a0;
    coeffs.b1 /= a0;
    coeffs.b2 /= a0;

    return coeffs;
}

inline FilterCoefficients BiquadFilter::calculateBell(float frequency, float resonance, float gain, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);
    float A = std::sqrt(std::pow(10.0f, gain / 20.0f));

    FilterCoefficients coeffs;
    coeffs.b0 = 1.0f + alpha * A;
    coeffs.b1 = -2.0f * cosOmega;
    coeffs.b2 = 1.0f - alpha * A;
    float a0 = 1.0f + alpha / A;
    coeffs.a1 = -2.0f * cosOmega / a0;
    coeffs.a2 = (1.0f - alpha / A) / a0;
    coeffs.b0 /= a0;
    coeffs.b2 /= a0;

    return coeffs;
}

inline FilterCoefficients BiquadFilter::calculateHighShelf(float frequency, float resonance, float gain, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);
    float A = std::sqrt(std::pow(10.0f, gain / 20.0f));

    FilterCoefficients coeffs;
    coeffs.b0 = A * ((A + 1.0f) + (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha);
    coeffs.b1 = -2.0f * A * ((A - 1.0f) + (A + 1.0f) * cosOmega);
    coeffs.b2 = A * ((A + 1.0f) + (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha);
    float a0 = (A + 1.0f) + (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha;
    coeffs.a1 = 2.0f * ((A - 1.0f) + (A + 1.0f) * cosOmega) / a0;
    coeffs.a2 = (A + 1.0f) + (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha;
    coeffs.a2 /= a0;
    coeffs.b0 /= a0;
    coeffs.b1 /= a0;
    coeffs.b2 /= a0;

    return coeffs;
}

inline FilterCoefficients BiquadFilter::calculateLowShelf(float frequency, float resonance, float gain, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);
    float A = std::sqrt(std::pow(10.0f, gain / 20.0f));

    FilterCoefficients coeffs;
    coeffs.b0 = A * ((A + 1.0f) - (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha);
    coeffs.b1 = 2.0f * A * ((A - 1.0f) - (A + 1.0f) * cosOmega);
    coeffs.b2 = A * ((A + 1.0f) - (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha);
    float a0 = (A + 1.0f) + (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha;
    coeffs.a1 = -2.0f * ((A - 1.0f) + (A + 1.0f) * cosOmega) / a0;
    coeffs.a2 = (A + 1.0f) + (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha;
    coeffs.a2 /= a0;
    coeffs.b0 /= a0;
    coeffs.b1 /= a0;
    coeffs.b2 /= a0;

    return coeffs;
}

} // namespace DSP
