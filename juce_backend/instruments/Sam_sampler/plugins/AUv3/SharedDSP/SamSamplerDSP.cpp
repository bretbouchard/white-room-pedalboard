//
//  SamSamplerDSP.cpp
//  SharedDSP
//
//  C++ implementation of Sam Sampler DSP wrapper
//  Bridges AUv3 extension to Sam Sampler DSP code
//

#include "SamSamplerDSP.h"
#include "../../../../plugins/dsp/include/dsp/SamSamplerDSP.h"
#include <cstring>
#include <cmath>

// Implementation class using PIMPL idiom
class SamSamplerImpl {
public:
    DSP::SamSamplerDSP dsp;
    double sampleRate = 48000.0;
};

SamSamplerDSP::SamSamplerDSP()
    : impl(std::make_unique<SamSamplerImpl>())
{
}

SamSamplerDSP::~SamSamplerDSP() = default;

void SamSamplerDSP::initialize(double sampleRate, int maximumFramesToRender)
{
    impl->sampleRate = sampleRate;
    impl->dsp.prepare(sampleRate, maximumFramesToRender);
}

void SamSamplerDSP::process(AUAudioFrameCount frameCount,
                           AudioBufferList *outputBufferList,
                           const AUEventSampleTime *timestamp,
                           AUAudioFrameCount inputBusNumber)
{
    if (!outputBufferList) return;

    // Convert AudioBufferList to float** for DSP
    float* outputs[2];
    outputs[0] = static_cast<float*>(outputBufferList->mBuffers[0].mData);
    outputs[1] = (outputBufferList->mNumberBuffers > 1) ?
                 static_cast<float*>(outputBufferList->mBuffers[1].mData) : outputs[0];

    int numChannels = outputBufferList->mNumberBuffers;
    impl->dsp.process(outputs, numChannels, static_cast<int>(frameCount));
}

void SamSamplerDSP::setParameter(AUParameterAddress address, float value)
{
    const char* paramId = nullptr;

    switch (address) {
        case masterVolume:
            paramId = "masterVolume";
            break;
        case pitchBendRange:
            paramId = "pitchBendRange";
            break;
        case basePitch:
            paramId = "basePitch";
            break;
        case envAttack:
            paramId = "envAttack";
            break;
        case envHold:
            paramId = "envHold";
            break;
        case envDecay:
            paramId = "envDecay";
            break;
        case envSustain:
            paramId = "envSustain";
            break;
        case envRelease:
            paramId = "envRelease";
            break;
        case envAttackCurve:
            paramId = "envAttackCurve";
            break;
        case envDecayCurve:
            paramId = "envDecayCurve";
            break;
        case envReleaseCurve:
            paramId = "envReleaseCurve";
            break;
        case filterCutoff:
            paramId = "filterCutoff";
            break;
        case filterResonance:
            paramId = "filterResonance";
            break;
        case filterEnabled:
            paramId = "filterEnabled";
            break;
        case filterType:
            paramId = "filterType";
            break;
        case reverbMix:
            paramId = "reverbMix";
            break;
        case delayMix:
            paramId = "delayMix";
            break;
        case drive:
            paramId = "drive";
            break;
        case structure:
            paramId = "structure";
            break;
        case stereoWidth:
            paramId = "stereoWidth";
            break;
        default:
            return;
    }

    impl->dsp.setParameter(paramId, value);
}

float SamSamplerDSP::getParameter(AUParameterAddress address) const
{
    const char* paramId = nullptr;

    switch (address) {
        case masterVolume:
            paramId = "masterVolume";
            break;
        case pitchBendRange:
            paramId = "pitchBendRange";
            break;
        case basePitch:
            paramId = "basePitch";
            break;
        case envAttack:
            paramId = "envAttack";
            break;
        case envHold:
            paramId = "envHold";
            break;
        case envDecay:
            paramId = "envDecay";
            break;
        case envSustain:
            paramId = "envSustain";
            break;
        case envRelease:
            paramId = "envRelease";
            break;
        case envAttackCurve:
            paramId = "envAttackCurve";
            break;
        case envDecayCurve:
            paramId = "envDecayCurve";
            break;
        case envReleaseCurve:
            paramId = "envReleaseCurve";
            break;
        case filterCutoff:
            paramId = "filterCutoff";
            break;
        case filterResonance:
            paramId = "filterResonance";
            break;
        case filterEnabled:
            paramId = "filterEnabled";
            break;
        case filterType:
            paramId = "filterType";
            break;
        case reverbMix:
            paramId = "reverbMix";
            break;
        case delayMix:
            paramId = "delayMix";
            break;
        case drive:
            paramId = "drive";
            break;
        case structure:
            paramId = "structure";
            break;
        case stereoWidth:
            paramId = "stereoWidth";
            break;
        default:
            return 0.0f;
    }

    return impl->dsp.getParameter(paramId);
}

void SamSamplerDSP::handleMIDIEvent(const uint8_t *message, uint8_t messageSize)
{
    if (!message || messageSize < 1) return;

    uint8_t status = message[0];

    // Note On
    if ((status & 0xF0) == 0x90 && messageSize >= 3) {
        uint8_t note = message[1];
        uint8_t velocity = message[2];
        DSP::ScheduledEvent event;
        event.type = DSP::ScheduledEvent::NOTE_ON;
        event.data.note.midiNote = note;
        event.data.note.velocity = velocity / 127.0f;
        impl->dsp.handleEvent(event);
    }
    // Note Off
    else if ((status & 0xF0) == 0x80 && messageSize >= 3) {
        uint8_t note = message[1];
        DSP::ScheduledEvent event;
        event.type = DSP::ScheduledEvent::NOTE_OFF;
        event.data.note.midiNote = note;
        event.data.note.velocity = 0.0f;
        impl->dsp.handleEvent(event);
    }
    // Pitch Bend
    else if ((status & 0xF0) == 0xE0 && messageSize >= 3) {
        int bendValue = (message[2] << 7) | message[1];
        float normalizedBend = (bendValue - 8192) / 8192.0f; // -1 to 1
        DSP::ScheduledEvent event;
        event.type = DSP::ScheduledEvent::PITCH_BEND;
        event.data.pitchBend.bendValue = normalizedBend;
        impl->dsp.handleEvent(event);
    }
}

bool SamSamplerDSP::loadSoundFont(const char *filePath)
{
    return impl->dsp.loadSoundFont(filePath);
}

int SamSamplerDSP::getSoundFontInstrumentCount() const
{
    return impl->dsp.getSoundFontInstrumentCount();
}

const char *SamSamplerDSP::getSoundFontInstrumentName(int index) const
{
    return impl->dsp.getSoundFontInstrumentName(index);
}

bool SamSamplerDSP::selectSoundFontInstrument(int index)
{
    return impl->dsp.selectSoundFontInstrument(index);
}

void SamSamplerDSP::setState(const char *stateData)
{
    if (stateData) {
        impl->dsp.loadPreset(stateData);
    }
}

const char *SamSamplerDSP::getState() const
{
    stateBuffer_.resize(4096);
    if (impl->dsp.savePreset(stateBuffer_.data(), static_cast<int>(stateBuffer_.size()))) {
        return stateBuffer_.c_str();
    }
    return "{}";
}
