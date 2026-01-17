//
//  NexSynthDSP.h
//  SharedDSP
//
//  C++ wrapper for NexSynth FM synthesizer
//  Bridges iOS AUv3 extension to NexSynth DSP code
//

#ifndef NexSynthDSP_h
#define NexSynthDSP_h

#include <AudioToolbox/AudioToolbox.h>
#include <cstdint>
#include <cstring>

#ifdef __cplusplus
extern "C" {
#endif

// DSP instance handle
typedef void* NexSynthDSPHandle;

// Parameter addresses (must match AudioUnit.swift)
typedef enum {
    // Global parameters
    PARAM_MASTER_VOLUME = 0,
    PARAM_PITCH_BEND_RANGE,
    PARAM_ALGORITHM,
    PARAM_STRUCTURE,
    PARAM_STEREO_WIDTH,
    PARAM_STEREO_OPERATOR_DETUNE,

    // Operator 1 parameters (10-19)
    PARAM_OP1_RATIO = 10,
    PARAM_OP1_DETUNE,
    PARAM_OP1_MOD_INDEX,
    PARAM_OP1_OUTPUT_LEVEL,
    PARAM_OP1_FEEDBACK,
    PARAM_OP1_ATTACK,
    PARAM_OP1_DECAY,
    PARAM_OP1_SUSTAIN,
    PARAM_OP1_RELEASE,

    // Operator 2 parameters (20-29)
    PARAM_OP2_RATIO = 20,
    PARAM_OP2_DETUNE,
    PARAM_OP2_MOD_INDEX,
    PARAM_OP2_OUTPUT_LEVEL,
    PARAM_OP2_FEEDBACK,
    PARAM_OP2_ATTACK,
    PARAM_OP2_DECAY,
    PARAM_OP2_SUSTAIN,
    PARAM_OP2_RELEASE,

    // Operator 3 parameters (30-39)
    PARAM_OP3_RATIO = 30,
    PARAM_OP3_DETUNE,
    PARAM_OP3_MOD_INDEX,
    PARAM_OP3_OUTPUT_LEVEL,
    PARAM_OP3_FEEDBACK,
    PARAM_OP3_ATTACK,
    PARAM_OP3_DECAY,
    PARAM_OP3_SUSTAIN,
    PARAM_OP3_RELEASE,

    // Operator 4 parameters (40-49)
    PARAM_OP4_RATIO = 40,
    PARAM_OP4_DETUNE,
    PARAM_OP4_MOD_INDEX,
    PARAM_OP4_OUTPUT_LEVEL,
    PARAM_OP4_FEEDBACK,
    PARAM_OP4_ATTACK,
    PARAM_OP4_DECAY,
    PARAM_OP4_SUSTAIN,
    PARAM_OP4_RELEASE,

    // Operator 5 parameters (50-59)
    PARAM_OP5_RATIO = 50,
    PARAM_OP5_DETUNE,
    PARAM_OP5_MOD_INDEX,
    PARAM_OP5_OUTPUT_LEVEL,
    PARAM_OP5_FEEDBACK,
    PARAM_OP5_ATTACK,
    PARAM_OP5_DECAY,
    PARAM_OP5_SUSTAIN,
    PARAM_OP5_RELEASE,

    PARAM_COUNT
} NexSynthParameter;

// C interface for Swift integration
NexSynthDSPHandle NexSynthDSP_Create();
void NexSynthDSP_Destroy(NexSynthDSPHandle handle);

void NexSynthDSP_Initialize(NexSynthDSPHandle handle,
                            double sampleRate,
                            int32_t maximumFramesToRender);

void NexSynthDSP_Process(NexSynthDSPHandle handle,
                         uint32_t frameCount,
                         AudioBufferList* outputBufferList,
                         const AUEventSampleTime* timestamp);

void NexSynthDSP_SetParameter(NexSynthDSPHandle handle,
                              AUParameterAddress address,
                              float value);

float NexSynthDSP_GetParameter(NexSynthDSPHandle handle,
                               AUParameterAddress address);

void NexSynthDSP_HandleMIDI(NexSynthDSPHandle handle,
                            const uint8_t* message,
                            uint8_t messageSize);

void NexSynthDSP_SetState(NexSynthDSPHandle handle, const char* jsonState);
const char* NexSynthDSP_GetState(NexSynthDSPHandle handle);

#ifdef __cplusplus
}
#endif

#endif /* NexSynthDSP_h */
