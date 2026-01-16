/*
  ==============================================================================

    BiPhasePureDSP_v2.h
    Created: January 14, 2026
    Author: Bret Bouchard

    Policy-based Bi-Phase Phaser DSP - Mu-Tron Bi-Phase Emulation

    Based on the Mu-Tron Bi-Phase specification:
    - 6 all-pass filter stages per phaser
    - Rate: 0.1 Hz to 18 Hz (LFO frequency)
    - Depth: 0.0 to 1.0 (sweep width control)
    - Feedback: 0.0 to 0.98 (regenerative resonance)
    - Shape: Sine or Square LFO wave
    - Control-rate updates for efficiency
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

struct BiPhasePolicy
{
    int controlIntervalSamples;   // Control rate: 1=audio, 32=~1kHz@48k
    float maxFeedback;            // Safety limit for feedback (stability)
    float maxModDepth;            // Modulation depth limit
    bool allowStereoPhase;        // Whether stereo phase offset is permitted
};

// Predefined policies
constexpr BiPhasePolicy ChannelStripPolicy {
    .controlIntervalSamples = 32,     // ~1 kHz control rate
    .maxFeedback = 0.7f,              // Conservative feedback limit
    .maxModDepth = 0.5f,              // Subtle modulation
    .allowStereoPhase = false         // No stereo phase offset
};

constexpr BiPhasePolicy FXPolicy {
    .controlIntervalSamples = 1,      // Audio-rate control
    .maxFeedback = 0.98f,             // Maximum feedback (Mu-Tron spec)
    .maxModDepth = 1.0f,              // Full modulation
    .allowStereoPhase = true          // Stereo phase offset OK
};

//==============================================================================
// LFO Shape Types (Extended for Feature 7)
//==============================================================================

enum class LFOShape
{
    Sine,            // Classic sine wave
    Square,          // Hard square wave
    SampleAndHold,   // Stepped random (Feature 7)
    RandomWalk       // Smooth random (Feature 7)
};

//==============================================================================
// Routing Modes
//==============================================================================

enum class RoutingMode
{
    InA,      // Parallel: Both phasors get same input (stereo output)
    OutA,     // Series: Phasor B gets Phasor A output (12-stage cascade)
    InB       // Independent: Phasor B gets separate input (dual instrument)
};

//==============================================================================
// Sweep Sync Mode
//==============================================================================

enum class SweepSync
{
    Normal,   // Both phasors sweep in same direction
    Reverse   // Phasor B sweeps opposite to Phasor A (for stereo)
};

//==============================================================================
// LFO Sweep Source
//==============================================================================

enum class SweepSource
{
    Generator1,  // Use LFO 1
    Generator2,  // Use LFO 2 (independent)
    Pedal        // External pedal control (reserved for future)
};

//==============================================================================
// Stage Count (Feature 2)
//==============================================================================

enum class StageCount
{
    Four,   // Chewy, subtle (4 stages)
    Six,    // Classic Bi-Phase (6 stages)
    Eight   // Vocal, dramatic (8 stages)
};

//==============================================================================
// Feedback Polarity (Feature 3)
//==============================================================================

enum class FeedbackPolarity
{
    Positive,  // Resonant peaks
    Negative   // Hollow notches
};

//==============================================================================
// LFO Link Mode (Feature 4)
//==============================================================================

enum class LFOLinkMode
{
    Free,       // Independent phase
    Locked,     // 0° offset (same phase)
    Offset,     // User-defined offset 0-180°
    Quadrature  // 90° offset (classic stereo)
};

//==============================================================================
// Envelope Follower Parameters (Feature 5)
//==============================================================================

struct EnvelopeFollowerParams
{
    bool enabled = false;
    float attack = 10.0f;       // 1.0 to 100.0 ms
    float release = 100.0f;     // 10.0 to 1000.0 ms
    float amount = 0.5f;        // 0.0 to 1.0 (modulation amount)
    bool toDepth = true;        // Modulate sweep depth
    bool toCenter = false;      // Modulate center frequency
    bool toFeedback = false;    // Modulate feedback

    bool operator==(const EnvelopeFollowerParams& other) const
    {
        return enabled == other.enabled &&
               attack == other.attack &&
               release == other.release &&
               amount == other.amount &&
               toDepth == other.toDepth &&
               toCenter == other.toCenter &&
               toFeedback == other.toFeedback;
    }
};

//==============================================================================
// Sweep Bias Parameters (Feature 6)
//==============================================================================

struct SweepBiasParams
{
    float center = 0.5f;    // 0.0 to 1.0 (sweep center position)
    float width = 1.0f;     // 0.0 to 1.0 (sweep width)

    bool operator==(const SweepBiasParams& other) const
    {
        return center == other.center && width == other.width;
    }
};

//==============================================================================
// Analog Drift Parameters (Feature 8)
//==============================================================================

struct AnalogDriftParams
{
    bool enabled = false;
    float amount = 0.02f;    // 0.0 to 0.05 (2% max for subtlety)
    uint32_t seed = 12345;   // For reproducible drift

    bool operator==(const AnalogDriftParams& other) const
    {
        return enabled == other.enabled &&
               amount == other.amount &&
               seed == other.seed;
    }
};

//==============================================================================
// Bi-Phase Parameters
//==============================================================================

struct BiPhaseParameters
{
    //==========================================================================
    // EXISTING PARAMETERS
    //==========================================================================

    // Phasor A controls
    float rateA = 0.5f;
    float depthA = 0.5f;
    float feedbackA = 0.5f;
    LFOShape shapeA = LFOShape::Sine;
    SweepSource sourceA = SweepSource::Generator1;

    // Phasor B controls
    float rateB = 0.5f;
    float depthB = 0.5f;
    float feedbackB = 0.5f;
    LFOShape shapeB = LFOShape::Sine;
    SweepSource sourceB = SweepSource::Generator1;

    // Routing
    RoutingMode routingMode = RoutingMode::OutA;  // Default: series (12-stage)
    SweepSync sweepSync = SweepSync::Normal;      // Default: same direction

    //==========================================================================
    // NEW FEATURE 1: Manual Phase Offset
    //==========================================================================
    float phaseOffsetA = 0.0f;      // -180.0 to +180.0 degrees
    float phaseOffsetB = 0.0f;      // -180.0 to +180.0 degrees

    //==========================================================================
    // NEW FEATURE 2: Stage Count
    //==========================================================================
    StageCount stageCountA = StageCount::Six;
    StageCount stageCountB = StageCount::Six;

    //==========================================================================
    // NEW FEATURE 3: Feedback Polarity
    //==========================================================================
    FeedbackPolarity feedbackPolarityA = FeedbackPolarity::Positive;
    FeedbackPolarity feedbackPolarityB = FeedbackPolarity::Positive;

    //==========================================================================
    // NEW FEATURE 4: LFO Phase Relationship
    //==========================================================================
    LFOLinkMode lfoLinkMode = LFOLinkMode::Free;
    float lfoLinkOffset = 90.0f;     // 0.0 to 180.0 degrees

    //==========================================================================
    // NEW FEATURE 5: Envelope Follower
    //==========================================================================
    EnvelopeFollowerParams envelopeA;
    EnvelopeFollowerParams envelopeB;

    //==========================================================================
    // NEW FEATURE 6: Center Frequency Bias
    //==========================================================================
    SweepBiasParams sweepBiasA;
    SweepBiasParams sweepBiasB;

    //==========================================================================
    // NEW FEATURE 8: Analog Drift
    //==========================================================================
    AnalogDriftParams analogDrift;

    //==========================================================================
    // LEGACY (for backward compatibility)
    //==========================================================================
    float rate = 0.5f;         // Alias for rateA
    float depth = 0.5f;        // Alias for depthA
    float feedback = 0.5f;     // Alias for feedbackA
    float stereoPhase = 0.0f;  // Stereo phase offset
    LFOShape shape = LFOShape::Sine;

    bool operator==(const BiPhaseParameters& other) const
    {
        return rateA == other.rateA &&
               depthA == other.depthA &&
               feedbackA == other.feedbackA &&
               shapeA == other.shapeA &&
               sourceA == other.sourceA &&
               rateB == other.rateB &&
               depthB == other.depthB &&
               feedbackB == other.feedbackB &&
               shapeB == other.shapeB &&
               sourceB == other.sourceB &&
               routingMode == other.routingMode &&
               sweepSync == other.sweepSync &&
               phaseOffsetA == other.phaseOffsetA &&
               phaseOffsetB == other.phaseOffsetB &&
               stageCountA == other.stageCountA &&
               stageCountB == other.stageCountB &&
               feedbackPolarityA == other.feedbackPolarityA &&
               feedbackPolarityB == other.feedbackPolarityB &&
               lfoLinkMode == other.lfoLinkMode &&
               lfoLinkOffset == other.lfoLinkOffset &&
               envelopeA == other.envelopeA &&
               envelopeB == other.envelopeB &&
               sweepBiasA == other.sweepBiasA &&
               sweepBiasB == other.sweepBiasB &&
               analogDrift == other.analogDrift;
    }

    bool operator!=(const BiPhaseParameters& other) const
    {
        return !(*this == other);
    }
};

//==============================================================================
// Feature 5: Envelope Follower Implementation
//==============================================================================

/**
 * Envelope follower for dynamic modulation control
 *
 * Tracks input signal envelope with configurable attack/release times.
 * Output range: 0.0 to 1.0
 */
class EnvelopeFollower
{
public:
    EnvelopeFollower() = default;

    void prepare(double sampleRate)
    {
        sampleRate_ = sampleRate;
        updateCoefficients();
    }

    void setAttackTime(float ms)
    {
        attack_ = std::clamp(ms, 1.0f, 100.0f);
        updateCoefficients();
    }

    void setReleaseTime(float ms)
    {
        release_ = std::clamp(ms, 10.0f, 1000.0f);
        updateCoefficients();
    }

    void reset()
    {
        envelope_ = 0.0f;
    }

    /**
     * Process one sample
     * @param input Audio input sample
     * @return Envelope value 0.0 to 1.0
     */
    inline float processSample(float input)
    {
        float rectified = std::abs(input);

        if (rectified > envelope_)
        {
            // Attack phase (fast)
            envelope_ = rectified + attackCoeff_ * (envelope_ - rectified);
        }
        else
        {
            // Release phase (slow)
            envelope_ = rectified + releaseCoeff_ * (envelope_ - rectified);
        }

        return envelope_;
    }

    float getCurrent() const { return envelope_; }

private:
    void updateCoefficients()
    {
        float attackTime = attack_ * 0.001f;
        float releaseTime = release_ * 0.001f;
        attackCoeff_ = std::exp(-1.0f / (attackTime * static_cast<float>(sampleRate_)));
        releaseCoeff_ = std::exp(-1.0f / (releaseTime * static_cast<float>(sampleRate_)));
    }

    float envelope_ = 0.0f;
    float attackCoeff_ = 0.999f;
    float releaseCoeff_ = 0.999f;
    float attack_ = 10.0f;
    float release_ = 100.0f;
    double sampleRate_ = 48000.0;
};

//==============================================================================
// Feature 7: Sample-and-Hold LFO Implementation
//==============================================================================

/**
 * Sample-and-hold LFO for stepped random modulation
 *
 * Generates random values that change at a specified rate.
 * Creates stepped, discontinuous modulation.
 */
class SampleAndHoldLFO
{
public:
    SampleAndHoldLFO() = default;

    void prepare(double sampleRate)
    {
        sampleRate_ = sampleRate;
        reset();
    }

    void setRate(float hz)
    {
        frequency_ = std::clamp(hz, 0.1f, 18.0f);
        updateRate_ = frequency_ / static_cast<float>(sampleRate_);
    }

    void reset()
    {
        currentValue_ = 0.0f;
        phase_ = 0.0f;
        // Initialize with first random value
        generateNewValue();
    }

    void setSeed(uint32_t seed)
    {
        rngState_ = seed;
    }

    /**
     * Process one sample
     * @return Random value -1.0 to 1.0
     */
    inline float processSample()
    {
        phase_ += updateRate_;

        if (phase_ >= 1.0f)
        {
            phase_ -= 1.0f;
            generateNewValue();
        }

        return currentValue_;
    }

private:
    void generateNewValue()
    {
        // XORShift32 PRNG for fast, decent randomness
        rngState_ ^= rngState_ << 13;
        rngState_ ^= rngState_ >> 17;
        rngState_ ^= rngState_ << 5;
        currentValue_ = ((rngState_ >> 16) & 0xFFFF) / 32768.0f * 2.0f - 1.0f;
    }

    float currentValue_ = 0.0f;
    float phase_ = 0.0f;
    float updateRate_ = 0.0f;
    float frequency_ = 1.0f;
    uint32_t rngState_ = 123456789;
    double sampleRate_ = 48000.0;
};

//==============================================================================
// Feature 7: Random Walk LFO Implementation
//==============================================================================

/**
 * Random walk LFO for smooth random modulation
 *
 * Generates smooth, evolving random modulation that never repeats.
 */
class RandomWalkLFO
{
public:
    RandomWalkLFO() = default;

    void prepare(double sampleRate)
    {
        sampleRate_ = sampleRate;
        reset();
    }

    void setRate(float hz)
    {
        frequency_ = std::clamp(hz, 0.1f, 18.0f);
        updateRate_ = frequency_ / static_cast<float>(sampleRate_);
    }

    void setSmoothing(float smooth)
    {
        // smooth: 0.0 (no smoothing) to 1.0 (heavy smoothing)
        smoothing_ = std::clamp(smooth, 0.0f, 0.999f);
    }

    void reset()
    {
        currentValue_ = 0.0f;
        targetValue_ = 0.0f;
        phase_ = 0.0f;
        generateNewTarget();
    }

    void setSeed(uint32_t seed)
    {
        rngState_ = seed;
    }

    /**
     * Process one sample
     * @return Smooth random value -1.0 to 1.0
     */
    inline float processSample()
    {
        phase_ += updateRate_;

        if (phase_ >= 1.0f)
        {
            phase_ -= 1.0f;
            generateNewTarget();
        }

        // Smooth interpolation toward target
        currentValue_ += (targetValue_ - currentValue_) * (1.0f - smoothing_);

        return currentValue_;
    }

private:
    void generateNewTarget()
    {
        // XORShift32 PRNG
        rngState_ ^= rngState_ << 13;
        rngState_ ^= rngState_ >> 17;
        rngState_ ^= rngState_ << 5;
        targetValue_ = ((rngState_ >> 16) & 0xFFFF) / 32768.0f * 2.0f - 1.0f;
    }

    float currentValue_ = 0.0f;
    float targetValue_ = 0.0f;
    float phase_ = 0.0f;
    float updateRate_ = 0.0f;
    float smoothing_ = 0.9f;
    float frequency_ = 1.0f;
    uint32_t rngState_ = 987654321;
    double sampleRate_ = 48000.0;
};

//==============================================================================
// Feature 8: Analog Drift Generator Implementation
//==============================================================================

/**
 * Analog drift generator for subtle random modulation
 *
 * Adds very subtle random modulation to prevent "too perfect" DSP sound.
 * Particularly important for slow sweeps.
 */
class AnalogDriftGenerator
{
public:
    AnalogDriftGenerator() = default;

    void prepare(double sampleRate)
    {
        sampleRate_ = sampleRate;
        reset();
    }

    void setAmount(float amount)
    {
        amount_ = std::clamp(amount, 0.0f, 0.05f);
    }

    void setSeed(uint32_t seed)
    {
        rngState_ = seed;
    }

    void reset()
    {
        phase_ = 0.0f;
    }

    /**
     * Get drift modulation for LFO rate
     * @return Multiplier 0.95 to 1.05 (approximately)
     */
    inline float getRateDrift()
    {
        return 1.0f + (randomFloat() * 2.0f - 1.0f) * amount_;
    }

    /**
     * Get drift modulation for phase
     * @return Small offset in radians
     */
    inline float getPhaseDrift()
    {
        return (randomFloat() * 2.0f - 1.0f) * amount_ * 0.1f;
    }

    /**
     * Get drift for all-pass coefficient
     * @return Multiplier 0.975 to 1.025 (approximately)
     */
    inline float getCoefficientDrift()
    {
        return 1.0f + (randomFloat() * 2.0f - 1.0f) * amount_ * 0.5f;
    }

private:
    float randomFloat()
    {
        // XORShift32 PRNG
        rngState_ ^= rngState_ << 13;
        rngState_ ^= rngState_ >> 17;
        rngState_ ^= rngState_ << 5;
        return ((rngState_ >> 16) & 0xFFFF) / 65536.0f;
    }

    float amount_ = 0.02f;
    float phase_ = 0.0f;
    uint32_t rngState_ = 12345;
    double sampleRate_ = 48000.0;
};

//==============================================================================
// First-Order All-Pass Filter Stage
//==============================================================================

class AllPassStage
{
public:
    AllPassStage() = default;

    void reset()
    {
        // Left channel state
        z1_left = 0.0f;

        // Right channel state
        z1_right = 0.0f;
    }

    // Process stereo samples
    // All-pass coefficient 'a' determines the filter's frequency response
    // a = -tan(PI * fc / fs) where fc is the center frequency
    inline void processStereo(float& left, float& right, float a)
    {
        // Left channel: y[n] = -a * x[n] + x[n-1] + a * y[n-1]
        float y_left = -a * left + z1_left + a * y1_left;
        z1_left = left;
        y1_left = y_left;

        // Right channel
        float y_right = -a * right + z1_right + a * y1_right;
        z1_right = right;
        y1_right = y_right;

        left = y_left;
        right = y_right;
    }

private:
    // Left channel state
    float z1_left = 0.0f;   // Input delay
    float y1_left = 0.0f;   // Output delay

    // Right channel state
    float z1_right = 0.0f;  // Input delay
    float y1_right = 0.0f;  // Output delay
};

//==============================================================================
// LFO Generator (Sine/Square/SampleAndHold/RandomWalk)
//==============================================================================

class LFOGenerator
{
public:
    LFOGenerator() = default;

    void prepare(double sampleRate)
    {
        sampleRate_ = sampleRate;
        phase = 0.0f;

        // Prepare Feature 7 LFOs
        s_hLFO.prepare(sampleRate);
        randomWalkLFO.prepare(sampleRate);
    }

    void reset()
    {
        phase = 0.0f;
        s_hLFO.reset();
        randomWalkLFO.reset();
    }

    // Set LFO frequency in Hz (0.1 to 18.0 Hz per Mu-Tron spec)
    void setFrequency(float hz)
    {
        frequency_ = std::clamp(hz, 0.1f, 18.0f);
        // Also update Feature 7 LFOs
        s_hLFO.setRate(hz);
        randomWalkLFO.setRate(hz);
    }

    // Set LFO shape
    void setShape(LFOShape shape)
    {
        shape_ = shape;
    }

    // Process one sample, output -1.0 to 1.0
    inline float processSample()
    {
        float output = 0.0f;

        switch (shape_)
        {
            case LFOShape::Sine:
                // Sine wave LFO (smooth modulation)
                output = std::sin(phase);
                break;

            case LFOShape::Square:
                // Square wave LFO (sharp, aggressive modulation)
                output = (phase < M_PI) ? 1.0f : -1.0f;
                break;

            case LFOShape::SampleAndHold:
                // Feature 7: Sample-and-hold (stepped random)
                output = s_hLFO.processSample();
                // Don't update phase (S/H has its own timing)
                return output;

            case LFOShape::RandomWalk:
                // Feature 7: Random walk (smooth random)
                output = randomWalkLFO.processSample();
                // Don't update phase (Random Walk has its own timing)
                return output;
        }

        // Advance phase (for sine/square only)
        float phaseIncrement = static_cast<float>(2.0 * M_PI * frequency_ / sampleRate_);
        phase += phaseIncrement;

        // Wrap phase to 0-2PI
        if (phase >= static_cast<float>(2.0 * M_PI))
        {
            phase -= static_cast<float>(2.0 * M_PI);
        }

        return output;
    }

    // Get current phase (for stereo offset)
    float getPhase() const { return phase; }

    // Set phase directly (for stereo offset)
    void setPhase(float p) { phase = p; }

private:
    float frequency_ = 0.5f;
    LFOShape shape_ = LFOShape::Sine;
    float phase = 0.0f;
    double sampleRate_ = 48000.0;

    // Feature 7: Sample-and-Hold and Random Walk LFOs
    SampleAndHoldLFO s_hLFO;
    RandomWalkLFO randomWalkLFO;
};

//==============================================================================
// Phaser Stage (6-Stage All-Pass Cascade)
//==============================================================================

class PhaserStage
{
public:
    PhaserStage() = default;

    //==========================================================================
    // FEATURE 2: Stage Count Control
    //==========================================================================

    void setStageCount(StageCount count)
    {
        activeStages_ = [count]() {
            switch (count) {
                case StageCount::Four: return 4;
                case StageCount::Six: return 6;
                case StageCount::Eight: return 8;
                default: return 6;
            }
        }();
    }

    void reset()
    {
        for (auto& stage : allPassStages)
        {
            stage.reset();
        }
    }

    // Process stereo through variable all-pass stages (4, 6, or 8)
    // modSignal: -1.0 to 1.0 (from LFO)
    // minFreq, maxFreq: frequency sweep range in Hz
    inline void processStereo(float& left, float& right, float modSignal,
                             float minFreq, float maxFreq, double sampleRate)
    {
        // Map modSignal to frequency range (exponential sweep)
        // This gives the characteristic phaser "swoosh"
        float t = (modSignal + 1.0f) * 0.5f;  // Map -1..1 to 0..1
        float freq = minFreq * std::pow(maxFreq / minFreq, t);

        // Calculate all-pass coefficient for this frequency
        // a = -tan(PI * fc / fs)
        float a = -std::tan(static_cast<float>(M_PI * freq / sampleRate));

        //==========================================================================
        // FEATURE 2: Process only active number of stages
        //==========================================================================
        // Process through active stages only (4, 6, or 8)
        for (int i = 0; i < activeStages_; ++i)
        {
            allPassStages[i].processStereo(left, right, a);
        }
    }

private:
    // FEATURE 2: Maximum stages = 8 (largest supported count)
    std::array<AllPassStage, 8> allPassStages;  // Up to 8 stages for modern phaser sounds
    int activeStages_ = 6;  // Default: 6 stages (classic Bi-Phase)
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
// Dual Phaser Core (Two Independent 6-Stage Phasers)
//==============================================================================

class DualPhaserCore
{
public:
    DualPhaserCore() = default;

    void reset()
    {
        phaserA.reset();
        phaserB.reset();
    }

    //==========================================================================
    // FEATURE 2: Stage Count Control - Set stage count for each phasor
    //==========================================================================
    void setStageCountA(StageCount count) { phaserA.setStageCount(count); }
    void setStageCountB(StageCount count) { phaserB.setStageCount(count); }

    // Process both phasers with independent modulation
    // Returns: {outputA, outputB}
    inline std::pair<float, float> process(float inputA, float inputB,
                                          float modA, float modB,
                                          float minFreq, float maxFreq,
                                          double sampleRate)
    {
        float outA = inputA;
        float outB = inputB;

        phaserA.processStereo(outA, outA, modA, minFreq, maxFreq, sampleRate);
        phaserB.processStereo(outB, outB, modB, minFreq, maxFreq, sampleRate);

        return {outA, outB};
    }

    // Process phaser A only
    inline float processA(float input, float mod, float minFreq, float maxFreq, double sampleRate)
    {
        float out = input;
        phaserA.processStereo(out, out, mod, minFreq, maxFreq, sampleRate);
        return out;
    }

    // Process phaser B only (takes phaser A output as input for series mode)
    inline float processB(float input, float mod, float minFreq, float maxFreq, double sampleRate)
    {
        float out = input;
        phaserB.processStereo(out, out, mod, minFreq, maxFreq, sampleRate);
        return out;
    }

private:
    PhaserStage phaserA;
    PhaserStage phaserB;
};

//==============================================================================
// Bi-Phase DSP Core (Policy-Based)
//==============================================================================

class BiPhaseDSP
{
public:
    BiPhaseDSP()
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

        // Prepare LFOs (independent for stereo)
        lfoLeft.prepare(sampleRate);
        lfoRight.prepare(sampleRate);

        // Prepare smoothers (10ms default)
        rateSmoother_.prepare(sampleRate, 10.0f);
        depthSmoother_.prepare(sampleRate, 10.0f);
        feedbackSmoother_.prepare(sampleRate, 10.0f);

        // Phase 2: Prepare additional LFOs
        lfo1A.prepare(sampleRate);
        lfo1B.prepare(sampleRate);
        lfo2A.prepare(sampleRate);
        lfo2B.prepare(sampleRate);

        // Phase 2: Prepare B smoothers
        rateSmootherB_.prepare(sampleRate, 10.0f);
        depthSmootherB_.prepare(sampleRate, 10.0f);
        feedbackSmootherB_.prepare(sampleRate, 10.0f);

        //==========================================================================
        // NEW FEATURES: Prepare helper classes
        //==========================================================================

        // Feature 5: Prepare envelope followers
        envelopeFollowerA_.prepare(sampleRate);
        envelopeFollowerB_.prepare(sampleRate);

        // Feature 7: Prepare S/H and Random Walk LFOs
        s_hLFOA_.prepare(sampleRate);
        s_hLFOB_.prepare(sampleRate);
        randomWalkLFOA_.prepare(sampleRate);
        randomWalkLFOB_.prepare(sampleRate);

        // Feature 8: Prepare analog drift generator
        driftGenerator_.prepare(sampleRate);

        // Reset state
        reset();
    }

    void reset()
    {
        phaserStageLeft.reset();
        phaserStageRight.reset();

        lfoLeft.reset();
        lfoRight.reset();

        rateSmoother_.reset(parameters_.rate);
        depthSmoother_.reset(parameters_.depth);
        feedbackSmoother_.reset(parameters_.feedback);

        feedbackStateLeft = 0.0f;
        feedbackStateRight = 0.0f;

        // Phase 2: Reset dual phaser
        dualPhaser_.reset();
        lfo1A.reset();
        lfo1B.reset();
        lfo2A.reset();
        lfo2B.reset();

        rateSmootherB_.reset(parameters_.rateB);
        depthSmootherB_.reset(parameters_.depthB);
        feedbackSmootherB_.reset(parameters_.feedbackB);

        feedbackStateA_ = 0.0f;
        feedbackStateB_ = 0.0f;

        //==========================================================================
        // NEW FEATURES: Reset helper classes
        //==========================================================================

        // Feature 2: Apply stage count settings
        dualPhaser_.setStageCountA(parameters_.stageCountA);
        dualPhaser_.setStageCountB(parameters_.stageCountB);

        // Feature 5: Reset envelope followers
        envelopeFollowerA_.reset();
        envelopeFollowerB_.reset();

        // Feature 7: Reset S/H and Random Walk LFOs
        s_hLFOA_.reset();
        s_hLFOB_.reset();
        randomWalkLFOA_.reset();
        randomWalkLFOB_.reset();

        // Feature 8: Reset analog drift generator
        driftGenerator_.reset();

        controlCounter_ = 0;
    }

    //==========================================================================
    // Policy Configuration
    //==========================================================================

    void setPolicy(const BiPhasePolicy& policy)
    {
        policy_ = policy;

        // Clamp parameters to policy limits
        setFeedback(std::min(parameters_.feedback, policy.maxFeedback));
    }

    const BiPhasePolicy& getPolicy() const { return policy_; }

    //==========================================================================
    // Parameter Setting (Thread-Safe)
    //==========================================================================

    void setRate(float hz)
    {
        parameters_.rate = std::clamp(hz, 0.1f, 18.0f);
        rateSmoother_.setTarget(parameters_.rate);
    }

    void setDepth(float depth)
    {
        parameters_.depth = std::clamp(depth, 0.0f, 1.0f);
        depthSmoother_.setTarget(parameters_.depth);
    }

    void setFeedback(float feedback)
    {
        parameters_.feedback = std::clamp(feedback, 0.0f, policy_.maxFeedback);
        feedbackSmoother_.setTarget(parameters_.feedback);
    }

    void setStereoPhase(float degrees)
    {
        if (policy_.allowStereoPhase)
        {
            parameters_.stereoPhase = std::clamp(degrees, 0.0f, 360.0f);
        }
    }

    void setShape(LFOShape shape)
    {
        parameters_.shape = shape;
        lfoLeft.setShape(shape);
        lfoRight.setShape(shape);
    }

    //==========================================================================
    // Phase 2: Phasor A Controls
    //==========================================================================

    void setRateA(float hz) { parameters_.rateA = std::clamp(hz, 0.1f, 18.0f); }
    void setDepthA(float depth) { parameters_.depthA = std::clamp(depth, 0.0f, 1.0f); }
    void setFeedbackA(float feedback) { parameters_.feedbackA = std::clamp(feedback, 0.0f, policy_.maxFeedback); }
    void setShapeA(LFOShape shape) { parameters_.shapeA = shape; }

    //==========================================================================
    // Phase 2: Phasor B Controls
    //==========================================================================

    void setRateB(float hz) { parameters_.rateB = std::clamp(hz, 0.1f, 18.0f); }
    void setDepthB(float depth) { parameters_.depthB = std::clamp(depth, 0.0f, 1.0f); }
    void setFeedbackB(float feedback) { parameters_.feedbackB = std::clamp(feedback, 0.0f, policy_.maxFeedback); }
    void setShapeB(LFOShape shape) { parameters_.shapeB = shape; }

    //==========================================================================
    // Phase 2: Routing
    //==========================================================================

    void setRoutingMode(RoutingMode mode) { parameters_.routingMode = mode; }
    void setSweepSync(SweepSync sync) { parameters_.sweepSync = sync; }

    //==========================================================================
    // Phase 2: Sweep Source Selection
    //==========================================================================

    void setSweepSourceA(SweepSource source) { parameters_.sourceA = source; }
    void setSweepSourceB(SweepSource source) { parameters_.sourceB = source; }

    //==========================================================================
    // NEW FEATURES: Parameter Setters
    //==========================================================================

    // Feature 1: Manual Phase Offset
    void setPhaseOffsetA(float degrees) { parameters_.phaseOffsetA = std::clamp(degrees, -180.0f, 180.0f); }
    void setPhaseOffsetB(float degrees) { parameters_.phaseOffsetB = std::clamp(degrees, -180.0f, 180.0f); }

    // Feature 2: Stage Count
    void setStageCountA(StageCount count) { parameters_.stageCountA = count; }
    void setStageCountB(StageCount count) { parameters_.stageCountB = count; }

    // Feature 3: Feedback Polarity
    void setFeedbackPolarityA(FeedbackPolarity polarity) { parameters_.feedbackPolarityA = polarity; }
    void setFeedbackPolarityB(FeedbackPolarity polarity) { parameters_.feedbackPolarityB = polarity; }

    // Feature 4: LFO Link Mode
    void setLFOLinkMode(LFOLinkMode mode) { parameters_.lfoLinkMode = mode; }
    void setLFOLinkOffset(float degrees) { parameters_.lfoLinkOffset = std::clamp(degrees, 0.0f, 180.0f); }

    // Feature 5: Envelope Follower
    void setEnvelopeFollowerA(const EnvelopeFollowerParams& params) { parameters_.envelopeA = params; }
    void setEnvelopeFollowerB(const EnvelopeFollowerParams& params) { parameters_.envelopeB = params; }
    void setEnvelopeAttackA(float ms) { parameters_.envelopeA.attack = std::clamp(ms, 1.0f, 100.0f); envelopeFollowerA_.setAttackTime(ms); }
    void setEnvelopeAttackB(float ms) { parameters_.envelopeB.attack = std::clamp(ms, 1.0f, 100.0f); envelopeFollowerB_.setAttackTime(ms); }
    void setEnvelopeReleaseA(float ms) { parameters_.envelopeA.release = std::clamp(ms, 10.0f, 1000.0f); envelopeFollowerA_.setReleaseTime(ms); }
    void setEnvelopeReleaseB(float ms) { parameters_.envelopeB.release = std::clamp(ms, 10.0f, 1000.0f); envelopeFollowerB_.setReleaseTime(ms); }

    // Feature 6: Sweep Bias (Center Frequency)
    void setSweepBiasA(const SweepBiasParams& params) { parameters_.sweepBiasA = params; }
    void setSweepBiasB(const SweepBiasParams& params) { parameters_.sweepBiasB = params; }
    void setSweepCenterA(float center) { parameters_.sweepBiasA.center = std::clamp(center, 0.0f, 1.0f); }
    void setSweepCenterB(float center) { parameters_.sweepBiasB.center = std::clamp(center, 0.0f, 1.0f); }
    void setSweepWidthA(float width) { parameters_.sweepBiasA.width = std::clamp(width, 0.0f, 1.0f); }
    void setSweepWidthB(float width) { parameters_.sweepBiasB.width = std::clamp(width, 0.0f, 1.0f); }

    // Feature 7: S/H and Random Walk LFO rate setters
    void setSHRateA(float hz) { parameters_.rateA = std::clamp(hz, 0.1f, 18.0f); s_hLFOA_.setRate(hz); }
    void setSHRateB(float hz) { parameters_.rateB = std::clamp(hz, 0.1f, 18.0f); s_hLFOB_.setRate(hz); }
    void setRandomWalkRateA(float hz) { parameters_.rateA = std::clamp(hz, 0.1f, 18.0f); randomWalkLFOA_.setRate(hz); }
    void setRandomWalkRateB(float hz) { parameters_.rateB = std::clamp(hz, 0.1f, 18.0f); randomWalkLFOB_.setRate(hz); }
    void setRandomWalkSmoothingA(float smooth) { randomWalkLFOA_.setSmoothing(smooth); }
    void setRandomWalkSmoothingB(float smooth) { randomWalkLFOB_.setSmoothing(smooth); }

    // Feature 8: Analog Drift
    void setAnalogDrift(const AnalogDriftParams& params) { parameters_.analogDrift = params; driftGenerator_.setAmount(params.amount); driftGenerator_.setSeed(params.seed); }
    void setAnalogDriftEnabled(bool enabled) { parameters_.analogDrift.enabled = enabled; }
    void setAnalogDriftAmount(float amount) { parameters_.analogDrift.amount = std::clamp(amount, 0.0f, 0.05f); driftGenerator_.setAmount(amount); }

    //==========================================================================
    // Legacy Parameter Setting (Thread-Safe)
    //==========================================================================

    void setParameters(const BiPhaseParameters& params)
    {
        setRate(params.rate);
        setDepth(params.depth);
        setFeedback(params.feedback);
        setStereoPhase(params.stereoPhase);
        setShape(params.shape);
    }

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
                updateControlRateDual();  // Use dual-phasor version with all new features
                controlCounter_ = 0;
            }

            // Get input samples
            float inA = left[i];
            float inB = right[i];

            // Process based on routing mode
            auto [outA, outB] = (parameters_.routingMode == RoutingMode::InA) ? processParallel(inA, inB, i) :
                              (parameters_.routingMode == RoutingMode::OutA) ? processSeries(inA, inB, i) :
                              processIndependent(inA, inB, i);

            // Output
            left[i] = outA;
            right[i] = outB;
        }
    }

private:
    //==========================================================================
    // Control-Rate Update (NOT per-sample)
    //==========================================================================

    void updateControlRate()
    {
        // Get current parameter values
        float rate = rateSmoother_.getTarget();

        // Update LFO frequencies
        lfoLeft.setFrequency(rate);
        lfoRight.setFrequency(rate);

        // Calculate stereo phase offset in radians
        float phaseOffsetRad = parameters_.stereoPhase * static_cast<float>(M_PI / 180.0);

        // Sync right channel LFO phase with offset
        float currentPhase = lfoLeft.getPhase();
        lfoRight.setPhase(currentPhase + phaseOffsetRad);
    }

    //==========================================================================
    // Phase 2: Control-Rate Update for Dual Phaser
    //==========================================================================

    void updateControlRateDual();

    //==========================================================================
    // Phase 2: Routing Mode Processors
    //==========================================================================

    // Parallel mode: Both phasors process same input
    std::pair<float, float> processParallel(float inA, float inB, int sample);

    // Series mode: A -> B (12-stage cascade)
    std::pair<float, float> processSeries(float inA, float inB, int sample);

    // Independent mode: Separate inputs
    std::pair<float, float> processIndependent(float inA, float inB, int sample);

    // Get LFO value for Phasor A (based on source selection)
    float getLFOA(int sample);

    // Get LFO value for Phasor B (based on source selection + sync)
    float getLFOB(int sample);

    //==========================================================================
    // Member Variables
    //==========================================================================

    // Policy
    BiPhasePolicy policy_;

    // DSP core
    PhaserStage phaserStageLeft;
    PhaserStage phaserStageRight;
    LFOGenerator lfoLeft;
    LFOGenerator lfoRight;

    // Smoothers (control-rate to audio-rate interpolation)
    ParameterSmoother rateSmoother_;
    ParameterSmoother depthSmoother_;
    ParameterSmoother feedbackSmoother_;

    // Phase 2: Dual Phaser
    DualPhaserCore dualPhaser_;
    LFOGenerator lfo1A;      // LFO 1 for Phasor A
    LFOGenerator lfo1B;      // LFO 1 for Phasor B (can share)
    LFOGenerator lfo2A;      // LFO 2 for Phasor A
    LFOGenerator lfo2B;      // LFO 2 for Phasor B (independent)

    // Phase 2: B smoothers
    ParameterSmoother rateSmootherB_;
    ParameterSmoother depthSmootherB_;
    ParameterSmoother feedbackSmootherB_;

    // Parameters
    BiPhaseParameters parameters_;

    // State
    double sampleRate_ = 48000.0;
    int controlCounter_ = 0;
    float feedbackStateLeft = 0.0f;
    float feedbackStateRight = 0.0f;

    // Phase 2: Feedback states for dual phaser
    float feedbackStateA_ = 0.0f;
    float feedbackStateB_ = 0.0f;

    //==========================================================================
    // NEW FEATURES: Helper class members
    //==========================================================================

    // Feature 5: Envelope Followers (one per phasor)
    EnvelopeFollower envelopeFollowerA_;
    EnvelopeFollower envelopeFollowerB_;

    // Feature 7: Sample-and-Hold LFOs (one per phasor)
    SampleAndHoldLFO s_hLFOA_;
    SampleAndHoldLFO s_hLFOB_;

    // Feature 7: Random Walk LFOs (one per phasor)
    RandomWalkLFO randomWalkLFOA_;
    RandomWalkLFO randomWalkLFOB_;

    // Feature 8: Analog Drift Generator (shared)
    AnalogDriftGenerator driftGenerator_;
};

} // namespace DSP
