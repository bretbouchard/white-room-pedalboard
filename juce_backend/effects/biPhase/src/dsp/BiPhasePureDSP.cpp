/*
  ==============================================================================

    BiPhasePureDSP.cpp
    Created: January 14, 2026
    Author: Bret Bouchard

    Implementation file for Bi-Phase Phaser DSP - Dual Phaser Engine

    This file implements the Mu-Tron Bi-Phase emulation with full dual-phaser
    support. The architecture provides:

    Phase 1 (Legacy Single Phaser):
    - 6-stage all-pass filter cascade per channel
    - Stereo LFO with phase offset
    - Feedback with regenerative resonance

    Phase 2 (Dual Phaser):
    - Two independent 6-stage phasors (12 stages total in series)
    - Three routing modes: Parallel (InA), Series (OutA), Independent (InB)
    - Two LFO generators with selectable sweep sources
    - Normal/Reverse sweep synchronization

    Design Philosophy:
    - Zero heap allocation in audio thread
    - Deterministic execution time
    - Control-rate parameter updates for efficiency
    - Policy-based safety limits

  ==============================================================================
*/

#include "dsp/BiPhasePureDSP_v2.h"
#include <cmath>

namespace DSP {

//==============================================================================
// BiPhaseDSP - Dual Phaser Architecture Documentation
//==============================================================================

/*
DUAL PHASER SIGNAL FLOW
========================

The Mu-Tron Bi-Phase consists of two independent 6-stage phasor sections
that can be configured in three routing modes:

1. PARALLEL MODE (RoutingMode::InA)
   Input A ─┬──> Phaser A ──> Output A (Left)
            │
            └──> Phaser B ──> Output B (Right)

   Application: Stereo widening, dual instrument processing

2. SERIES MODE (RoutingMode::OutA) - DEFAULT
   Input A ──> Phaser A ──> Phaser B ──> Output (Both channels)

   Application: Classic 12-stage Bi-Phase sound, deep phasing

3. INDEPENDENT MODE (RoutingMode::InB)
   Input A ──> Phaser A ──> Output A (Left)
   Input B ──> Phaser B ──> Output B (Right)

   Application: Dual instrument processing, separate effects chains

LFO ARCHITECTURE
================

The dual phaser provides two LFO generators per phasor:

- LFO 1A/1B: Shared frequency, independent phase
- LFO 2A/2B: Independent frequency, independent phase

Each phasor can select its sweep source:
- SweepSource::Generator1: Use LFO 1
- SweepSource::Generator2: Use LFO 2 (independent)

Sweep synchronization controls relative phase:
- SweepSync::Normal: Both phasors sweep in same direction
- SweepSync::Reverse: Phasor B sweeps opposite (stereo effect)

CONTROL RATE PROCESSING
========================

Parameters are updated at control rate (default: ~1 kHz) rather than
audio rate for efficiency:

1. Parameter changes set smoother targets
2. Smoothers interpolate at audio rate (glide-free transitions)
3. Control-rate update applies smoother targets to LFOs

This provides:
- Smooth parameter changes without zippering
- Reduced CPU usage vs per-sample LFO updates
- Musically responsive modulation

FREQUENCY RESPONSE
==================

Each phaser stage sweeps from:
- Minimum: 200 Hz (deep notch)
- Maximum: 5000 Hz (bright resonance)

The exponential mapping provides the characteristic phaser "swoosh"
by maintaining constant Q across the sweep range.

FEEDBACK ARCHITECTURE
=====================

Each phasor has independent feedback:

output[n] = input[n] + feedbackState[n-1] * feedbackAmount
feedbackState[n] = output[n]

Positive feedback (0.0 to 0.98) creates regenerative resonance:
- Low feedback: Subtle sweeping
- Medium feedback: Classic phaser sound
- High feedback: Aggressive, resonant sweeps

SAFETY LIMITS
=============

Policy system prevents unstable configurations:
- ChannelStripPolicy: Conservative limits (feedback ≤ 0.7)
- FXPolicy: Maximum Mu-Tron spec (feedback ≤ 0.98)
- Stereo phase: Disabled in channel strip mode
*/

//==============================================================================
// Dual Phaser Routing Mode Implementations
//==============================================================================

/*
 These routing mode implementations are moved out-of-line to keep the
 header clean and improve maintainability. While they are called in the
 audio processing loop, the routing logic is not performance-critical
 compared to the all-pass filter processing itself.

 The routing modes define how the two phasors interact:
 - Parallel: Both process same input (stereo output)
 - Series: Cascaded processing (12-stage phaser)
 - Independent: Separate processing paths
*/

std::pair<float, float> BiPhaseDSP::processParallel(float inA, float inB, int sample)
{
    // Get LFO values for each phasor
    float lfoA = getLFOA(sample);
    float lfoB = getLFOB(sample);

    // Get current depth values from smoothers
    float depthA = depthSmoother_.getCurrent();
    float depthB = depthSmootherB_.getCurrent();

    //==========================================================================
    // FEATURE 5: Envelope Follower - Apply envelope modulation to depth
    //==========================================================================
    if (parameters_.envelopeA.enabled)
    {
        float envA = envelopeFollowerA_.processSample(inA);
        if (parameters_.envelopeA.toDepth)
        {
            depthA = depthA * (1.0f - parameters_.envelopeA.amount) + envA * parameters_.envelopeA.amount;
        }
    }
    if (parameters_.envelopeB.enabled)
    {
        float envB = envelopeFollowerB_.processSample(inB);
        if (parameters_.envelopeB.toDepth)
        {
            depthB = depthB * (1.0f - parameters_.envelopeB.amount) + envB * parameters_.envelopeB.amount;
        }
    }

    //==========================================================================
    // FEATURE 6: Center Frequency Bias - Calculate biased frequency range
    //==========================================================================
    auto getBiasedFreqRange = [](const SweepBiasParams& bias, float minFreq, float maxFreq) {
        float biasedMin = minFreq * std::pow(maxFreq / minFreq, bias.center - bias.width * 0.5f);
        float biasedMax = minFreq * std::pow(maxFreq / minFreq, bias.center + bias.width * 0.5f);
        return std::make_pair(std::max(biasedMin, minFreq), std::min(biasedMax, maxFreq));
    };

    auto [minFreqA, maxFreqA] = getBiasedFreqRange(parameters_.sweepBiasA, 200.0f, 5000.0f);
    auto [minFreqB, maxFreqB] = getBiasedFreqRange(parameters_.sweepBiasB, 200.0f, 5000.0f);

    // Process both phasors with same input
    // In parallel mode, both phasors receive identical input
    auto [outA, outB] = dualPhaser_.process(inA, inB,
                                            lfoA * depthA,
                                            lfoB * depthB,
                                            minFreqA, maxFreqA, sampleRate_);

    //==========================================================================
    // FEATURE 3: Feedback Polarity - Apply polarity multiplier
    //==========================================================================
    float polarityA = (parameters_.feedbackPolarityA == FeedbackPolarity::Positive) ? 1.0f : -1.0f;
    float polarityB = (parameters_.feedbackPolarityB == FeedbackPolarity::Positive) ? 1.0f : -1.0f;

    // Apply independent feedback to each phasor
    float fbA = feedbackSmoother_.getCurrent();
    float fbB = feedbackSmootherB_.getCurrent();

    // Feedback: add feedback to phaser output
    // outA is the phaser output, we add feedback to it
    outA = outA + feedbackStateA_ * fbA * polarityA;
    feedbackStateA_ = outA;

    outB = outB + feedbackStateB_ * fbB * polarityB;
    feedbackStateB_ = outB;

    // Return both phasor outputs (stereo)
    return {outA, outB};
}

std::pair<float, float> BiPhaseDSP::processSeries(float inA, float inB, int sample)
{
    // Get LFO values for each phasor
    float lfoA = getLFOA(sample);
    float lfoB = getLFOB(sample);

    float depthA = depthSmoother_.getCurrent();
    float depthB = depthSmootherB_.getCurrent();

    //==========================================================================
    // FEATURE 5: Envelope Follower
    //==========================================================================
    if (parameters_.envelopeA.enabled)
    {
        float envA = envelopeFollowerA_.processSample(inA);
        if (parameters_.envelopeA.toDepth)
        {
            depthA = depthA * (1.0f - parameters_.envelopeA.amount) + envA * parameters_.envelopeA.amount;
        }
    }
    if (parameters_.envelopeB.enabled)
    {
        float envB = envelopeFollowerB_.processSample(inA);
        if (parameters_.envelopeB.toDepth)
        {
            depthB = depthB * (1.0f - parameters_.envelopeB.amount) + envB * parameters_.envelopeB.amount;
        }
    }

    //==========================================================================
    // FEATURE 6: Center Frequency Bias
    //==========================================================================
    auto getBiasedFreqRange = [](const SweepBiasParams& bias, float minFreq, float maxFreq) {
        float biasedMin = minFreq * std::pow(maxFreq / minFreq, bias.center - bias.width * 0.5f);
        float biasedMax = minFreq * std::pow(maxFreq / minFreq, bias.center + bias.width * 0.5f);
        return std::make_pair(std::max(biasedMin, minFreq), std::min(biasedMax, maxFreq));
    };

    auto [minFreqA, maxFreqA] = getBiasedFreqRange(parameters_.sweepBiasA, 200.0f, 5000.0f);
    auto [minFreqB, maxFreqB] = getBiasedFreqRange(parameters_.sweepBiasB, 200.0f, 5000.0f);

    //==========================================================================
    // FEATURE 3: Feedback Polarity
    //==========================================================================
    float polarityA = (parameters_.feedbackPolarityA == FeedbackPolarity::Positive) ? 1.0f : -1.0f;
    float polarityB = (parameters_.feedbackPolarityB == FeedbackPolarity::Positive) ? 1.0f : -1.0f;

    // Process Phasor A first
    float outA = dualPhaser_.processA(inA, lfoA * depthA, minFreqA, maxFreqA, sampleRate_);

    // Apply feedback A
    float fbA = feedbackSmoother_.getCurrent();
    outA = outA + feedbackStateA_ * fbA * polarityA;
    feedbackStateA_ = outA;

    // Process Phasor B (gets Phasor A output as input)
    // This creates the classic 12-stage Bi-Phase cascade
    float outB = dualPhaser_.processB(outA, lfoB * depthB, minFreqB, maxFreqB, sampleRate_);

    // Apply feedback B
    float fbB = feedbackSmootherB_.getCurrent();
    outB = outB + feedbackStateB_ * fbB * polarityB;
    feedbackStateB_ = outB;

    // In series mode, both channels get the cascaded output
    // This preserves the mono-compatible 12-stage phaser sound
    return {outA, outB};
}

std::pair<float, float> BiPhaseDSP::processIndependent(float inA, float inB, int sample)
{
    // Get LFO values for each phasor
    float lfoA = getLFOA(sample);
    float lfoB = getLFOB(sample);

    float depthA = depthSmoother_.getCurrent();
    float depthB = depthSmootherB_.getCurrent();

    //==========================================================================
    // FEATURE 5: Envelope Follower
    //==========================================================================
    if (parameters_.envelopeA.enabled)
    {
        float envA = envelopeFollowerA_.processSample(inA);
        if (parameters_.envelopeA.toDepth)
        {
            depthA = depthA * (1.0f - parameters_.envelopeA.amount) + envA * parameters_.envelopeA.amount;
        }
    }
    if (parameters_.envelopeB.enabled)
    {
        float envB = envelopeFollowerB_.processSample(inB);
        if (parameters_.envelopeB.toDepth)
        {
            depthB = depthB * (1.0f - parameters_.envelopeB.amount) + envB * parameters_.envelopeB.amount;
        }
    }

    //==========================================================================
    // FEATURE 6: Center Frequency Bias
    //==========================================================================
    auto getBiasedFreqRange = [](const SweepBiasParams& bias, float minFreq, float maxFreq) {
        float biasedMin = minFreq * std::pow(maxFreq / minFreq, bias.center - bias.width * 0.5f);
        float biasedMax = minFreq * std::pow(maxFreq / minFreq, bias.center + bias.width * 0.5f);
        return std::make_pair(std::max(biasedMin, minFreq), std::min(biasedMax, maxFreq));
    };

    auto [minFreqA, maxFreqA] = getBiasedFreqRange(parameters_.sweepBiasA, 200.0f, 5000.0f);
    auto [minFreqB, maxFreqB] = getBiasedFreqRange(parameters_.sweepBiasB, 200.0f, 5000.0f);

    //==========================================================================
    // FEATURE 3: Feedback Polarity
    //==========================================================================
    float polarityA = (parameters_.feedbackPolarityA == FeedbackPolarity::Positive) ? 1.0f : -1.0f;
    float polarityB = (parameters_.feedbackPolarityB == FeedbackPolarity::Positive) ? 1.0f : -1.0f;

    // Process each phasor with its own input
    // In independent mode, inputs can be different sources
    auto [outA, outB] = dualPhaser_.process(inA, inB,
                                            lfoA * depthA,
                                            lfoB * depthB,
                                            minFreqA, maxFreqA, sampleRate_);

    // Apply independent feedback to each phasor
    float fbA = feedbackSmoother_.getCurrent();
    float fbB = feedbackSmootherB_.getCurrent();

    outA = outA + feedbackStateA_ * fbA * polarityA;
    feedbackStateA_ = outA;

    outB = outB + feedbackStateB_ * fbB * polarityB;
    feedbackStateB_ = outB;

    // Return independent outputs
    return {outA, outB};
}

//==============================================================================
// LFO Source Selection Helpers
//==============================================================================

/*
 These helper methods select the appropriate LFO generator for each phasor
 based on the user-configured sweep source. This allows flexible modulation
 routing:

 - Generator1: Both phasors share LFO 1 (with phase sync)
 - Generator2: Both phasors share LFO 2 (independent frequency)
 - Pedal: Reserved for future external pedal control

 The sweep sync mode (Normal/Reverse) affects Phasor B's LFO phase
 relative to Phasor A, creating stereo width effects.

 NEW: Feature 1 - Manual Phase Offset is applied to each phasor independently.
 NEW: Feature 8 - Analog Drift modulates LFO rate when enabled.
*/

float BiPhaseDSP::getLFOA(int sample)
{
    // Phasor A uses its selected LFO source
    float lfo = (parameters_.sourceA == SweepSource::Generator1)
        ? lfo1A.processSample()
        : lfo2A.processSample();

    //==========================================================================
    // FEATURE 1: Manual Phase Offset
    // Note: Phase offset is applied in control-rate update (setPhase)
    // Here we just return the LFO value as-is, but the phase was pre-offset
    //==========================================================================

    return lfo;
}

float BiPhaseDSP::getLFOB(int sample)
{
    float lfo;

    // Phasor B uses its selected LFO source
    if (parameters_.sourceB == SweepSource::Generator1)
        lfo = lfo1B.processSample();
    else
        lfo = lfo2B.processSample();

    // Apply sweep sync (inverts LFO for reverse mode)
    // This creates opposite modulation directions for stereo effect
    if (parameters_.sweepSync == SweepSync::Reverse)
        lfo = -lfo;

    return lfo;
}

//==============================================================================
// Control-Rate Update Implementation
//==============================================================================

/*
 Control-rate updates are performed at a lower rate than audio processing
 (default: ~1 kHz vs 48 kHz audio rate). This significantly reduces CPU
 usage while maintaining smooth parameter transitions via the smoothers.

 This update handles:
 - LFO frequency changes
 - LFO shape changes
 - LFO phase synchronization for stereo effects

 The smoothers handle audio-rate interpolation, so control-rate updates
 only need to update the target values.

 NEW: Feature 1 - Manual Phase Offset applied to each phasor
 NEW: Feature 4 - LFO Link Mode with Free/Locked/Offset/Quadrature options
 NEW: Feature 8 - Analog Drift modulates LFO rates
*/

void BiPhaseDSP::updateControlRateDual()
{
    //==========================================================================
    // FEATURE 8: Analog Drift - Apply drift to LFO rates
    //==========================================================================
    float rate1 = rateSmoother_.getTarget();
    float rate2 = rateSmootherB_.getTarget();

    if (parameters_.analogDrift.enabled)
    {
        rate1 *= driftGenerator_.getRateDrift();
        rate2 *= driftGenerator_.getRateDrift();
    }

    // Update LFO 1 (shared frequency, potentially different phases)
    lfo1A.setFrequency(rate1);
    lfo1B.setFrequency(rate1);
    lfo1A.setShape(parameters_.shapeA);
    lfo1B.setShape(parameters_.shapeA);

    // Update LFO 2 (independent frequency)
    lfo2A.setFrequency(rate2);
    lfo2B.setFrequency(rate2);
    lfo2A.setShape(parameters_.shapeB);
    lfo2B.setShape(parameters_.shapeB);

    //==========================================================================
    // FEATURE 1: Manual Phase Offset - Apply offset to each LFO
    //==========================================================================
    // Phase offset for Phasor A
    {
        float phaseOffsetRadA = parameters_.phaseOffsetA * static_cast<float>(M_PI / 180.0);
        float currentPhaseA = (parameters_.sourceA == SweepSource::Generator1) ? lfo1A.getPhase() : lfo2A.getPhase();
        float targetPhaseA = currentPhaseA + phaseOffsetRadA;

        // Wrap to 0-2PI
        while (targetPhaseA >= 2.0f * M_PI) targetPhaseA -= 2.0f * static_cast<float>(M_PI);
        while (targetPhaseA < 0.0f) targetPhaseA += 2.0f * static_cast<float>(M_PI);

        if (parameters_.sourceA == SweepSource::Generator1)
            lfo1A.setPhase(targetPhaseA);
        else
            lfo2A.setPhase(targetPhaseA);
    }

    //==========================================================================
    // FEATURE 4: LFO Link Mode - Control phase relationship between phasors
    //==========================================================================
    if (parameters_.sourceA == parameters_.sourceB)
    {
        LFOGenerator& sourceLFO = (parameters_.sourceA == SweepSource::Generator1)
                                   ? lfo1A : lfo2A;
        LFOGenerator& destLFO = (parameters_.sourceA == SweepSource::Generator1)
                                 ? lfo1B : lfo2B;

        float targetPhase;

        switch (parameters_.lfoLinkMode)
        {
            case LFOLinkMode::Free:
                // Independent operation with manual phase offset
                // Apply offset relative to source LFO phase (like Locked, but no continuous sync)
                targetPhase = sourceLFO.getPhase();

                // Apply Phasor B's manual phase offset
                targetPhase += parameters_.phaseOffsetB * static_cast<float>(M_PI / 180.0);

                // Wrap to 0-2PI
                while (targetPhase >= 2.0f * M_PI) targetPhase -= 2.0f * static_cast<float>(M_PI);
                while (targetPhase < 0.0f) targetPhase += 2.0f * static_cast<float>(M_PI);

                destLFO.setPhase(targetPhase);
                break;

            case LFOLinkMode::Locked:
                // 0° offset (same phase) - then apply manual offsets
                targetPhase = sourceLFO.getPhase();

                // Apply Phasor B's manual phase offset
                targetPhase += parameters_.phaseOffsetB * static_cast<float>(M_PI / 180.0);

                // Wrap to 0-2PI
                while (targetPhase >= 2.0f * M_PI) targetPhase -= 2.0f * static_cast<float>(M_PI);
                while (targetPhase < 0.0f) targetPhase += 2.0f * static_cast<float>(M_PI);

                destLFO.setPhase(targetPhase);
                break;

            case LFOLinkMode::Offset:
            {
                // User-defined offset
                targetPhase = sourceLFO.getPhase();

                // Add user-defined offset + manual phase offset
                float offsetRad = (parameters_.lfoLinkOffset + parameters_.phaseOffsetB) * static_cast<float>(M_PI / 180.0);
                targetPhase += offsetRad;

                // Wrap to 0-2PI
                while (targetPhase >= 2.0f * M_PI) targetPhase -= 2.0f * static_cast<float>(M_PI);
                while (targetPhase < 0.0f) targetPhase += 2.0f * static_cast<float>(M_PI);

                destLFO.setPhase(targetPhase);
                break;
            }

            case LFOLinkMode::Quadrature:
            {
                // 90° offset (PI/2) + manual phase offset
                targetPhase = sourceLFO.getPhase();

                float quadratureRad = (static_cast<float>(M_PI_2) + parameters_.phaseOffsetB * static_cast<float>(M_PI / 180.0));
                targetPhase += quadratureRad;

                // Wrap to 0-2PI
                while (targetPhase >= 2.0f * M_PI) targetPhase -= 2.0f * static_cast<float>(M_PI);
                while (targetPhase < 0.0f) targetPhase += 2.0f * static_cast<float>(M_PI);

                destLFO.setPhase(targetPhase);
                break;
            }
        }

        //==========================================================================
        // Apply SweepSync on top of Link Mode (if using Reverse)
        //==========================================================================
        // This additional offset is applied AFTER the link mode calculation
        if (parameters_.sweepSync == SweepSync::Reverse)
        {
            float currentPhase = destLFO.getPhase();
            float phase = currentPhase + static_cast<float>(M_PI);
            if (phase >= 2.0f * M_PI) phase -= 2.0f * static_cast<float>(M_PI);
            destLFO.setPhase(phase);
        }
    }
    else
    {
        //==========================================================================
        // Different sources: Just apply Phasor B's manual phase offset
        //==========================================================================
        {
            float phaseOffsetRadB = parameters_.phaseOffsetB * static_cast<float>(M_PI / 180.0);
            float currentPhaseB = (parameters_.sourceB == SweepSource::Generator1) ? lfo1B.getPhase() : lfo2B.getPhase();
            float targetPhase = currentPhaseB + phaseOffsetRadB;

            // Wrap to 0-2PI
            while (targetPhase >= 2.0f * M_PI) targetPhase -= 2.0f * static_cast<float>(M_PI);
            while (targetPhase < 0.0f) targetPhase += 2.0f * static_cast<float>(M_PI);

            if (parameters_.sourceB == SweepSource::Generator1)
                lfo1B.setPhase(targetPhase);
            else
                lfo2B.setPhase(targetPhase);
        }

        // Apply SweepSync if needed
        if (parameters_.sweepSync == SweepSync::Reverse)
        {
            LFOGenerator& destLFO = (parameters_.sourceB == SweepSource::Generator1) ? lfo1B : lfo2B;
            float currentPhase = destLFO.getPhase();
            float phase = currentPhase + static_cast<float>(M_PI);
            if (phase >= 2.0f * M_PI) phase -= 2.0f * static_cast<float>(M_PI);
            destLFO.setPhase(phase);
        }
    }
}

//==============================================================================
// Performance Notes
//==============================================================================

/*
 Methods intentionally kept inline in header for performance:

 - AllPassStage::processStereo()
   Called 12 times per sample (6 stages × 2 phasors)
   Critical path: must be as fast as possible

 - LFOGenerator::processSample()
   Called 4 times per sample (2 LFOs × 2 sources)
   Trigonometric operations: needs to be tight

 - PhaserStage::processStereo()
   Called 2 times per sample (2 phasors)
   Contains the all-pass cascade loop

 - ParameterSmoother::processSample()
   Called 6 times per sample (3 smoothers × 2 phasors)
   Simple arithmetic: inline for zero overhead

 - DualPhaserCore::process methods
   Called every sample, tight loops

 Methods moved to this .cpp file:

 - Routing mode implementations (processParallel, processSeries, processIndependent)
   Called per-sample but complex logic: readability > marginal performance gain

 - LFO source selection (getLFOA, getLFOB)
   Called per-sample but simple branching: negligible overhead

 - updateControlRateDual()
   Called at control rate (~1 kHz): not performance-critical

 This balance maintains performance while improving code maintainability.
*/

} // namespace DSP
