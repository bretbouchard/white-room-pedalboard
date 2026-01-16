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

    // Process both phasors with same input
    // In parallel mode, both phasors receive identical input
    auto [outA, outB] = dualPhaser_.process(inA, inB,
                                            lfoA * depthA,
                                            lfoB * depthB,
                                            200.0f, 5000.0f, sampleRate_);

    // Apply independent feedback to each phasor
    float fbA = feedbackSmoother_.getCurrent();
    float fbB = feedbackSmootherB_.getCurrent();

    // Feedback: output = input + previous_output * feedback_amount
    outA = inA + feedbackStateA_ * fbA;
    feedbackStateA_ = outA;

    outB = inB + feedbackStateB_ * fbB;
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

    // Process Phasor A first
    float outA = dualPhaser_.processA(inA, lfoA * depthA, 200.0f, 5000.0f, sampleRate_);

    // Apply feedback A
    float fbA = feedbackSmoother_.getCurrent();
    outA = inA + feedbackStateA_ * fbA;
    feedbackStateA_ = outA;

    // Process Phasor B (gets Phasor A output as input)
    // This creates the classic 12-stage Bi-Phase cascade
    float outB = dualPhaser_.processB(outA, lfoB * depthB, 200.0f, 5000.0f, sampleRate_);

    // Apply feedback B
    float fbB = feedbackSmootherB_.getCurrent();
    outB = outA + feedbackStateB_ * fbB;
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

    // Process each phasor with its own input
    // In independent mode, inputs can be different sources
    auto [outA, outB] = dualPhaser_.process(inA, inB,
                                            lfoA * depthA,
                                            lfoB * depthB,
                                            200.0f, 5000.0f, sampleRate_);

    // Apply independent feedback to each phasor
    float fbA = feedbackSmoother_.getCurrent();
    float fbB = feedbackSmootherB_.getCurrent();

    outA = inA + feedbackStateA_ * fbA;
    feedbackStateA_ = outA;

    outB = inB + feedbackStateB_ * fbB;
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
*/

float BiPhaseDSP::getLFOA(int sample)
{
    // Phasor A uses its selected LFO source
    if (parameters_.sourceA == SweepSource::Generator1)
        return lfo1A.processSample();
    else
        return lfo2A.processSample();
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
*/

void BiPhaseDSP::updateControlRateDual()
{
    // Update LFO 1 (shared frequency, potentially different phases)
    float rate1 = rateSmoother_.getTarget();
    lfo1A.setFrequency(rate1);
    lfo1B.setFrequency(rate1);
    lfo1A.setShape(parameters_.shapeA);
    lfo1B.setShape(parameters_.shapeA);

    // Update LFO 2 (independent frequency)
    float rate2 = rateSmootherB_.getTarget();
    lfo2A.setFrequency(rate2);
    lfo2B.setFrequency(rate2);
    lfo2A.setShape(parameters_.shapeB);
    lfo2B.setShape(parameters_.shapeB);

    // Synchronize LFO phases when both phasors use same source
    // This creates consistent stereo imaging
    if (parameters_.sourceA == parameters_.sourceB)
    {
        LFOGenerator& sourceLFO = (parameters_.sourceA == SweepSource::Generator1)
                                   ? lfo1A : lfo2A;
        LFOGenerator& destLFO = (parameters_.sourceA == SweepSource::Generator1)
                                 ? lfo1B : lfo2B;

        if (parameters_.sweepSync == SweepSync::Normal)
        {
            // Normal sync: Same phase (mono-compatible)
            destLFO.setPhase(sourceLFO.getPhase());
        }
        else
        {
            // Reverse sync: 180-degree phase offset (stereo width)
            float phase = sourceLFO.getPhase() + static_cast<float>(M_PI);
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
