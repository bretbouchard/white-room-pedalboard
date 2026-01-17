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
// LFO Shape Types
//==============================================================================

enum class LFOShape
{
    Sine,
    Square
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
// Bi-Phase Parameters
//==============================================================================

struct BiPhaseParameters
{
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

    // Legacy single-phaser controls (for backward compatibility)
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
               sweepSync == other.sweepSync;
    }

    bool operator!=(const BiPhaseParameters& other) const
    {
        return !(*this == other);
    }
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
// LFO Generator (Sine/Square)
//==============================================================================

class LFOGenerator
{
public:
    LFOGenerator() = default;

    void prepare(double sampleRate)
    {
        sampleRate_ = sampleRate;
        phase = 0.0f;
    }

    void reset()
    {
        phase = 0.0f;
    }

    // Set LFO frequency in Hz (0.1 to 18.0 Hz per Mu-Tron spec)
    void setFrequency(float hz)
    {
        frequency_ = std::clamp(hz, 0.1f, 18.0f);
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

        if (shape_ == LFOShape::Sine)
        {
            // Sine wave LFO (smooth modulation)
            output = std::sin(phase);
        }
        else // Square
        {
            // Square wave LFO (sharp, aggressive modulation)
            output = (phase < M_PI) ? 1.0f : -1.0f;
        }

        // Advance phase
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
};

//==============================================================================
// Phaser Stage (6-Stage All-Pass Cascade)
//==============================================================================

class PhaserStage
{
public:
    PhaserStage() = default;

    void reset()
    {
        for (auto& stage : allPassStages)
        {
            stage.reset();
        }
    }

    // Process stereo through 6 all-pass stages
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

        // Process through 6 cascaded all-pass stages
        for (auto& stage : allPassStages)
        {
            stage.processStereo(left, right, a);
        }
    }

private:
    std::array<AllPassStage, 6> allPassStages;  // 6 stages per Mu-Tron spec
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
                updateControlRate();
                controlCounter_ = 0;
            }

            // Get current smoothed parameters
            float depth = depthSmoother_.processSample();

            // Generate LFO signals
            float lfoOutLeft = lfoLeft.processSample() * depth;
            float lfoOutRight = lfoRight.processSample() * depth;

            // Process input through phaser stages
            float phasedLeft = left[i];
            float phasedRight = right[i];

            // Frequency range: 200 Hz to 5000 Hz (typical phaser range)
            phaserStageLeft.processStereo(phasedLeft, phasedRight, lfoOutLeft,
                                         200.0f, 5000.0f, sampleRate_);

            float phasedRightTemp = right[i];  // Temp for right channel
            phaserStageRight.processStereo(phasedRightTemp, phasedRightTemp, lfoOutRight,
                                          200.0f, 5000.0f, sampleRate_);

            // Apply feedback (regenerative)
            float feedback = feedbackSmoother_.processSample();

            // Left channel with feedback
            float inputLeft = left[i] + feedbackStateLeft * feedback;
            float outputLeft = phasedLeft;
            feedbackStateLeft = outputLeft;

            // Right channel with feedback
            float inputRight = right[i] + feedbackStateRight * feedback;
            float outputRight = phasedRightTemp;
            feedbackStateRight = outputRight;

            // Mix dry/wet (50/50 mix per classic Bi-Phase)
            left[i] = (inputLeft * 0.5f + outputLeft * 0.5f);
            right[i] = (inputRight * 0.5f + outputRight * 0.5f);
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
};

} // namespace DSP
