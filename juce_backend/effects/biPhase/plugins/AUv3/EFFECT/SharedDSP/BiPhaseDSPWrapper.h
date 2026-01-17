/*
  BiPhaseDSPWrapper.h
  iOS AUv3 DSP Wrapper for BiPhase Phaser Effect

  This wrapper bridges iOS AUv3 extension to the C++ BiPhase DSP implementation.
  Handles parameter conversion and audio processing for effect plugin.
*/

#pragma once

#include <AudioUnit/AudioUnit.h>
#include <AVFoundation/AVFoundation.h>
#include "../include/dsp/BiPhasePureDSP_v2.h"

#ifdef __cplusplus
extern "C" {
#endif

//==============================================================================
// DSP Context Structure
//==============================================================================

typedef struct BiPhaseDSPContext {
    DSP::BiPhaseDSP* dsp;
    double sampleRate;
    bool isInitialized;

    // Parameter cache (for smoothing)
    float rateA;
    float depthA;
    float feedbackA;
    float rateB;
    float depthB;
    float feedbackB;
    int routingMode;
    int sweepSync;
    int shapeA;
    int shapeB;
    int sourceA;
    int sourceB;
    float mix;  // Wet/dry mix

} BiPhaseDSPContext;

//==============================================================================
// Lifecycle Functions
//==============================================================================

/**
 * Create DSP context
 * @return New context or NULL on failure
 */
BiPhaseDSPContext* BiPhaseDSP_Create(double sampleRate);

/**
 * Destroy DSP context
 * @param context Context to destroy
 */
void BiPhaseDSP_Destroy(BiPhaseDSPContext* context);

/**
 * Reset DSP state
 * @param context DSP context
 */
void BiPhaseDSP_Reset(BiPhaseDSPContext* context);

//==============================================================================
// Parameter Functions
//==============================================================================

/**
 * Set Phasor A rate (0.1 - 18.0 Hz)
 * @param context DSP context
 * @param rate LFO rate in Hz
 */
void BiPhaseDSP_SetRateA(BiPhaseDSPContext* context, float rate);

/**
 * Set Phasor A depth (0.0 - 1.0)
 * @param context DSP context
 * @param depth Modulation depth
 */
void BiPhaseDSP_SetDepthA(BiPhaseDSPContext* context, float depth);

/**
 * Set Phasor A feedback (0.0 - 0.98)
 * @param context DSP context
 * @param feedback Feedback amount
 */
void BiPhaseDSP_SetFeedbackA(BiPhaseDSPContext* context, float feedback);

/**
 * Set Phasor B rate (0.1 - 18.0 Hz)
 * @param context DSP context
 * @param rate LFO rate in Hz
 */
void BiPhaseDSP_SetRateB(BiPhaseDSPContext* context, float rate);

/**
 * Set Phasor B depth (0.0 - 1.0)
 * @param context DSP context
 * @param depth Modulation depth
 */
void BiPhaseDSP_SetDepthB(BiPhaseDSPContext* context, float depth);

/**
 * Set Phasor B feedback (0.0 - 0.98)
 * @param context DSP context
 * @param feedback Feedback amount
 */
void BiPhaseDSP_SetFeedbackB(BiPhaseDSPContext* context, float feedback);

/**
 * Set routing mode (0=Parallel, 1=Series, 2=Independent)
 * @param context DSP context
 * @param mode Routing mode
 */
void BiPhaseDSP_SetRoutingMode(BiPhaseDSPContext* context, int mode);

/**
 * Set sweep sync (0=Normal, 1=Reverse)
 * @param context DSP context
 * @param sync Sweep sync mode
 */
void BiPhaseDSP_SetSweepSync(BiPhaseDSPContext* context, int sync);

/**
 * Set LFO shape A (0=Sine, 1=Square)
 * @param context DSP context
 * @param shape LFO shape
 */
void BiPhaseDSP_SetShapeA(BiPhaseDSPContext* context, int shape);

/**
 * Set LFO shape B (0=Sine, 1=Square)
 * @param context DSP context
 * @param shape LFO shape
 */
void BiPhaseDSP_SetShapeB(BiPhaseDSPContext* context, int shape);

/**
 * Set LFO source A (0=Generator1, 1=Generator2)
 * @param context DSP context
 * @param source LFO source
 */
void BiPhaseDSP_SetSourceA(BiPhaseDSPContext* context, int source);

/**
 * Set LFO source B (0=Generator1, 1=Generator2)
 * @param context DSP context
 * @param source LFO source
 */
void BiPhaseDSP_SetSourceB(BiPhaseDSPContext* context, int source);

/**
 * Set wet/dry mix (0.0 = dry, 1.0 = wet)
 * @param context DSP context
 * @param mix Mix amount
 */
void BiPhaseDSP_SetMix(BiPhaseDSPContext* context, float mix);

//==============================================================================
// Processing Functions
//==============================================================================

/**
 * Process stereo audio buffer
 * @param context DSP context
 * @param left Left channel buffer
 * @param right Right channel buffer
 * @param numSamples Number of samples to process
 */
void BiPhaseDSP_ProcessStereo(BiPhaseDSPContext* context,
                               float* left,
                               float* right,
                               int numSamples);

#ifdef __cplusplus
}
#endif
