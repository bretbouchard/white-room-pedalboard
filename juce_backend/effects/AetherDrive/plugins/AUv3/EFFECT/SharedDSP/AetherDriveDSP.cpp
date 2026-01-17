//
//  AetherDriveDSP.cpp
//  SharedDSP
//
//  C++ wrapper implementation for AetherDrive effect DSP
//

#include "AetherDriveDSP.h"
#include "dsp/AetherDrivePureDSP.h"
#include <cstring>
#include <cmath>

// Parameter addresses (must match AUv3 extension)
namespace ParamAddresses {
    constexpr AUParameterAddress Drive = 0;
    constexpr AUParameterAddress Bass = 1;
    constexpr AUParameterAddress Mid = 2;
    constexpr AUParameterAddress Treble = 3;
    constexpr AUParameterAddress BodyResonance = 4;
    constexpr AUParameterAddress ResonanceDecay = 5;
    constexpr AUParameterAddress Mix = 6;
    constexpr AUParameterAddress OutputLevel = 7;
    constexpr AUParameterAddress CabinetSimulation = 8;
}

class AetherDriveDSP::Impl {
public:
    DSP::AetherDrivePureDSP dspEngine;
    double sampleRate = 48000.0;
    int maxFrames = 512;
    char stateBuffer[4096];
    bool stateDirty = false;

    void updateState() {
        if (stateDirty) {
            dspEngine.savePreset(stateBuffer, sizeof(stateBuffer));
            stateDirty = false;
        }
    }
};

AetherDriveDSP::AetherDriveDSP()
    : impl(std::make_unique<Impl>()) {
    // Default initialization
    impl->dspEngine.prepare(48000.0, 512);
}

AetherDriveDSP::~AetherDriveDSP() = default;

void AetherDriveDSP::initialize(double sampleRate, int maximumFramesToRender) {
    impl->sampleRate = sampleRate;
    impl->maxFrames = maximumFramesToRender;
    impl->dspEngine.prepare(sampleRate, maximumFramesToRender);
}

void AetherDriveDSP::process(AUAudioFrameCount frameCount,
                            AudioBufferList *outputBufferList,
                            AudioBufferList *inputBufferList,
                            const AUEventSampleTime *timestamp) {
    (void)timestamp; // Unused for effects

    if (!inputBufferList || !outputBufferList) {
        return;
    }

    // Get input/output buffers
    float* inputs[2] = {nullptr, nullptr};
    float* outputs[2] = {nullptr, nullptr};

    if (inputBufferList->mNumberBuffers > 0) {
        inputs[0] = static_cast<float*>(inputBufferList->mBuffers[0].mData);
        if (inputBufferList->mNumberBuffers > 1) {
            inputs[1] = static_cast<float*>(inputBufferList->mBuffers[1].mData);
        }
    }

    if (outputBufferList->mNumberBuffers > 0) {
        outputs[0] = static_cast<float*>(outputBufferList->mBuffers[0].mData);
        if (outputBufferList->mNumberBuffers > 1) {
            outputs[1] = static_cast<float*>(outputBufferList->mBuffers[1].mData);
        }
    }

    // Process through DSP engine (EFFECT type)
    int numChannels = std::max(inputBufferList->mNumberBuffers,
                              outputBufferList->mNumberBuffers);

    impl->dspEngine.process(inputs, outputs, numChannels, static_cast<int>(frameCount));
}

void AetherDriveDSP::setParameter(AUParameterAddress address, float value) {
    // Clamp value to [0, 1]
    value = std::max(0.0f, std::min(1.0f, value));

    const char* paramId = nullptr;

    switch (address) {
        case ParamAddresses::Drive:
            paramId = "drive";
            break;
        case ParamAddresses::Bass:
            paramId = "bass";
            break;
        case ParamAddresses::Mid:
            paramId = "mid";
            break;
        case ParamAddresses::Treble:
            paramId = "treble";
            break;
        case ParamAddresses::BodyResonance:
            paramId = "body_resonance";
            break;
        case ParamAddresses::ResonanceDecay:
            paramId = "resonance_decay";
            break;
        case ParamAddresses::Mix:
            paramId = "mix";
            break;
        case ParamAddresses::OutputLevel:
            paramId = "output_level";
            break;
        case ParamAddresses::CabinetSimulation:
            paramId = "cabinet_simulation";
            break;
        default:
            return;
    }

    if (paramId) {
        impl->dspEngine.setParameter(paramId, value);
        impl->stateDirty = true;
    }
}

float AetherDriveDSP::getParameter(AUParameterAddress address) const {
    const char* paramId = nullptr;

    switch (address) {
        case ParamAddresses::Drive:
            paramId = "drive";
            break;
        case ParamAddresses::Bass:
            paramId = "bass";
            break;
        case ParamAddresses::Mid:
            paramId = "mid";
            break;
        case ParamAddresses::Treble:
            paramId = "treble";
            break;
        case ParamAddresses::BodyResonance:
            paramId = "body_resonance";
            break;
        case ParamAddresses::ResonanceDecay:
            paramId = "resonance_decay";
            break;
        case ParamAddresses::Mix:
            paramId = "mix";
            break;
        case ParamAddresses::OutputLevel:
            paramId = "output_level";
            break;
        case ParamAddresses::CabinetSimulation:
            paramId = "cabinet_simulation";
            break;
        default:
            return 0.0f;
    }

    if (paramId) {
        return impl->dspEngine.getParameter(paramId);
    }

    return 0.0f;
}

void AetherDriveDSP::setState(const char *stateData) {
    if (stateData) {
        impl->dspEngine.loadPreset(stateData);
        impl->stateDirty = false;
    }
}

const char *AetherDriveDSP::getState() const {
    const_cast<AetherDriveDSP*>(this)->impl->updateState();
    return impl->stateBuffer;
}

void AetherDriveDSP::loadFactoryPreset(int index) {
    impl->dspEngine.loadFactoryPreset(index);
    impl->stateDirty = true;
}

const char* AetherDriveDSP::getFactoryPresetName(int index) {
    return DSP::AetherDrivePureDSP::getFactoryPresetName(index);
}
