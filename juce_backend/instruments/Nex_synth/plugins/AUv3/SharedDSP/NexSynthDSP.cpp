//
//  NexSynthDSP.cpp
//  SharedDSP
//
//  C++ wrapper implementation for NexSynth FM synthesizer
//

#include "NexSynthDSP.h"
#include "dsp/NexSynthDSP.h"
#include <memory>
#include <cmath>

//==============================================================================
// DSP Instance Wrapper
//==============================================================================

struct NexSynthDSPInstance {
    std::unique_ptr<DSP::NexSynthDSP> dsp;
    double sampleRate;
    int maximumFramesToRender;

    NexSynthDSPInstance() : sampleRate(48000.0), maximumFramesToRender(512) {
        dsp = std::make_unique<DSP::NexSynthDSP>();
    }
};

//==============================================================================
// C Interface Implementation
//==============================================================================

extern "C" {

NexSynthDSPHandle NexSynthDSP_Create() {
    try {
        auto instance = new NexSynthDSPInstance();
        return static_cast<NexSynthDSPHandle>(instance);
    } catch (...) {
        return nullptr;
    }
}

void NexSynthDSP_Destroy(NexSynthDSPHandle handle) {
    if (handle) {
        delete static_cast<NexSynthDSPInstance*>(handle);
    }
}

void NexSynthDSP_Initialize(NexSynthDSPHandle handle,
                            double sampleRate,
                            int32_t maximumFramesToRender) {
    if (!handle) return;

    auto instance = static_cast<NexSynthDSPInstance*>(handle);
    instance->sampleRate = sampleRate;
    instance->maximumFramesToRender = static_cast<int>(maximumFramesToRender);

    instance->dsp->prepare(sampleRate, static_cast<int>(maximumFramesToRender));
    instance->dsp->reset();
}

void NexSynthDSP_Process(NexSynthDSPHandle handle,
                         uint32_t frameCount,
                         AudioBufferList* outputBufferList,
                         const AUEventSampleTime* timestamp) {
    if (!handle || !outputBufferList) return;

    auto instance = static_cast<NexSynthDSPInstance*>(handle);

    // Prepare output buffers
    float* outputs[2];
    outputs[0] = static_cast<float*>(outputBufferList->mBuffers[0].mData);
    outputs[1] = (outputBufferList->mNumberBuffers > 1)
        ? static_cast<float*>(outputBufferList->mBuffers[1].mData)
        : outputs[0];

    // Process audio
    instance->dsp->process(outputs, 2, static_cast<int>(frameCount));
}

void NexSynthDSP_SetParameter(NexSynthDSPHandle handle,
                              AUParameterAddress address,
                              float value) {
    if (!handle) return;

    auto instance = static_cast<NexSynthDSPInstance*>(handle);

    // Map parameter address to DSP parameter
    const char* paramId = nullptr;

    switch (address) {
        // Global parameters
        case PARAM_MASTER_VOLUME:
            paramId = "masterVolume";
            break;
        case PARAM_PITCH_BEND_RANGE:
            paramId = "pitchBendRange";
            break;
        case PARAM_ALGORITHM:
            paramId = "algorithm";
            break;
        case PARAM_STRUCTURE:
            paramId = "structure";
            break;
        case PARAM_STEREO_WIDTH:
            paramId = "stereoWidth";
            break;
        case PARAM_STEREO_OPERATOR_DETUNE:
            paramId = "stereoOperatorDetune";
            break;

        // Operator 1
        case PARAM_OP1_RATIO:
            paramId = "op1_ratio";
            break;
        case PARAM_OP1_DETUNE:
            paramId = "op1_detune";
            break;
        case PARAM_OP1_MOD_INDEX:
            paramId = "op1_modIndex";
            break;
        case PARAM_OP1_OUTPUT_LEVEL:
            paramId = "op1_level";
            break;
        case PARAM_OP1_FEEDBACK:
            paramId = "op1_feedback";
            break;
        case PARAM_OP1_ATTACK:
            paramId = "op1_attack";
            break;
        case PARAM_OP1_DECAY:
            paramId = "op1_decay";
            break;
        case PARAM_OP1_SUSTAIN:
            paramId = "op1_sustain";
            break;
        case PARAM_OP1_RELEASE:
            paramId = "op1_release";
            break;

        // Operator 2
        case PARAM_OP2_RATIO:
            paramId = "op2_ratio";
            break;
        case PARAM_OP2_DETUNE:
            paramId = "op2_detune";
            break;
        case PARAM_OP2_MOD_INDEX:
            paramId = "op2_modIndex";
            break;
        case PARAM_OP2_OUTPUT_LEVEL:
            paramId = "op2_level";
            break;
        case PARAM_OP2_FEEDBACK:
            paramId = "op2_feedback";
            break;
        case PARAM_OP2_ATTACK:
            paramId = "op2_attack";
            break;
        case PARAM_OP2_DECAY:
            paramId = "op2_decay";
            break;
        case PARAM_OP2_SUSTAIN:
            paramId = "op2_sustain";
            break;
        case PARAM_OP2_RELEASE:
            paramId = "op2_release";
            break;

        // Operator 3
        case PARAM_OP3_RATIO:
            paramId = "op3_ratio";
            break;
        case PARAM_OP3_DETUNE:
            paramId = "op3_detune";
            break;
        case PARAM_OP3_MOD_INDEX:
            paramId = "op3_modIndex";
            break;
        case PARAM_OP3_OUTPUT_LEVEL:
            paramId = "op3_level";
            break;
        case PARAM_OP3_FEEDBACK:
            paramId = "op3_feedback";
            break;
        case PARAM_OP3_ATTACK:
            paramId = "op3_attack";
            break;
        case PARAM_OP3_DECAY:
            paramId = "op3_decay";
            break;
        case PARAM_OP3_SUSTAIN:
            paramId = "op3_sustain";
            break;
        case PARAM_OP3_RELEASE:
            paramId = "op3_release";
            break;

        // Operator 4
        case PARAM_OP4_RATIO:
            paramId = "op4_ratio";
            break;
        case PARAM_OP4_DETUNE:
            paramId = "op4_detune";
            break;
        case PARAM_OP4_MOD_INDEX:
            paramId = "op4_modIndex";
            break;
        case PARAM_OP4_OUTPUT_LEVEL:
            paramId = "op4_level";
            break;
        case PARAM_OP4_FEEDBACK:
            paramId = "op4_feedback";
            break;
        case PARAM_OP4_ATTACK:
            paramId = "op4_attack";
            break;
        case PARAM_OP4_DECAY:
            paramId = "op4_decay";
            break;
        case PARAM_OP4_SUSTAIN:
            paramId = "op4_sustain";
            break;
        case PARAM_OP4_RELEASE:
            paramId = "op4_release";
            break;

        // Operator 5
        case PARAM_OP5_RATIO:
            paramId = "op5_ratio";
            break;
        case PARAM_OP5_DETUNE:
            paramId = "op5_detune";
            break;
        case PARAM_OP5_MOD_INDEX:
            paramId = "op5_modIndex";
            break;
        case PARAM_OP5_OUTPUT_LEVEL:
            paramId = "op5_level";
            break;
        case PARAM_OP5_FEEDBACK:
            paramId = "op5_feedback";
            break;
        case PARAM_OP5_ATTACK:
            paramId = "op5_attack";
            break;
        case PARAM_OP5_DECAY:
            paramId = "op5_decay";
            break;
        case PARAM_OP5_SUSTAIN:
            paramId = "op5_sustain";
            break;
        case PARAM_OP5_RELEASE:
            paramId = "op5_release";
            break;

        default:
            return; // Unknown parameter
    }

    if (paramId) {
        instance->dsp->setParameter(paramId, static_cast<double>(value));
    }
}

float NexSynthDSP_GetParameter(NexSynthDSPHandle handle,
                               AUParameterAddress address) {
    if (!handle) return 0.0f;

    auto instance = static_cast<NexSynthDSPInstance*>(handle);

    // Map parameter address to DSP parameter
    const char* paramId = nullptr;

    switch (address) {
        case PARAM_MASTER_VOLUME:
            paramId = "masterVolume";
            break;
        case PARAM_PITCH_BEND_RANGE:
            paramId = "pitchBendRange";
            break;
        case PARAM_ALGORITHM:
            paramId = "algorithm";
            break;
        // Add more mappings as needed...
        default:
            return 0.0f;
    }

    if (paramId) {
        return static_cast<float>(instance->dsp->getParameter(paramId));
    }

    return 0.0f;
}

void NexSynthDSP_HandleMIDI(NexSynthDSPHandle handle,
                            const uint8_t* message,
                            uint8_t messageSize) {
    if (!handle || !message || messageSize < 3) return;

    auto instance = static_cast<NexSynthDSPInstance*>(handle);

    uint8_t status = message[0];
    uint8_t data1 = message[1];
    uint8_t data2 = message[2];

    DSP::ScheduledEvent event;
    event.type = DSP::ScheduledEvent::EventType::INVALID;

    switch (status & 0xF0) {
        case 0x80: // Note Off
            event.type = DSP::ScheduledEvent::NOTE_OFF;
            event.data.note.midiNote = data1;
            event.data.note.velocity = static_cast<float>(data2) / 127.0f;
            break;

        case 0x90: // Note On
            event.type = DSP::ScheduledEvent::NOTE_ON;
            event.data.note.midiNote = data1;
            event.data.note.velocity = static_cast<float>(data2) / 127.0f;
            break;

        case 0xE0: // Pitch Bend
            {
                int bendValue = (data2 << 7) | data1;
                float bendNormalized = static_cast<float>(bendValue - 8192) / 8192.0f;
                // Store pitch bend - this would need to be applied to notes
                // For now, we'll handle it as a parameter
                instance->dsp->setParameter("pitchBend", bendNormalized);
            }
            break;

        case 0xB0: // Control Change
            if (data1 == 1) { // Mod wheel
                float modValue = static_cast<float>(data2) / 127.0f;
                instance->dsp->setParameter("modWheel", modValue);
            }
            break;

        default:
            return;
    }

    if (event.type != DSP::ScheduledEvent::EventType::INVALID) {
        instance->dsp->handleEvent(event);
    }
}

void NexSynthDSP_SetState(NexSynthDSPHandle handle, const char* jsonState) {
    if (!handle || !jsonState) return;

    auto instance = static_cast<NexSynthDSPInstance*>(handle);

    // Create a mutable copy for the DSP
    char* jsonCopy = const_cast<char*>(jsonState);
    instance->dsp->loadPreset(jsonCopy);
}

const char* NexSynthDSP_GetState(NexSynthDSPHandle handle) {
    if (!handle) return nullptr;

    auto instance = static_cast<NexSynthDSPInstance*>(handle);

    // Static buffer for preset data
    static char jsonBuffer[8192];
    if (instance->dsp->savePreset(jsonBuffer, sizeof(jsonBuffer))) {
        return jsonBuffer;
    }

    return nullptr;
}

} // extern "C"
