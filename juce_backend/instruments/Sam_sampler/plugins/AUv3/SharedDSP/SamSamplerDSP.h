//
//  SamSamplerDSP.h
//  SharedDSP
//
//  C++ wrapper for Sam Sampler instrument DSP
//  Provides interface for AUv3 extension to access DSP functionality
//

#ifndef SamSamplerDSP_h
#define SamSamplerDSP_h

#include <AudioToolbox/AudioToolbox.h>
#include <memory>
#include <string>

// Forward declaration to avoid including full DSP header
class SamSamplerImpl;

class SamSamplerDSP {
public:
    SamSamplerDSP();
    ~SamSamplerDSP();

    // Initialization
    void initialize(double sampleRate, int maximumFramesToRender);

    // DSP Processing
    void process(AUAudioFrameCount frameCount,
                AudioBufferList *outputBufferList,
                const AUEventSampleTime *timestamp,
                AUAudioFrameCount inputBusNumber = 0);

    // Parameters
    void setParameter(AUParameterAddress address, float value);
    float getParameter(AUParameterAddress address) const;

    // MIDI
    void handleMIDIEvent(const uint8_t *message, uint8_t messageSize);

    // SF2 SoundFont Management
    bool loadSoundFont(const char *filePath);
    int getSoundFontInstrumentCount() const;
    const char *getSoundFontInstrumentName(int index) const;
    bool selectSoundFontInstrument(int index);

    // Presets
    void setState(const char *stateData);
    const char *getState() const;

    // Parameter addresses (must match AudioUnit.swift)
    enum ParameterAddress: AUParameterAddress {
        masterVolume = 0,
        pitchBendRange,
        basePitch,
        envAttack,
        envHold,
        envDecay,
        envSustain,
        envRelease,
        envAttackCurve,
        envDecayCurve,
        envReleaseCurve,
        filterCutoff,
        filterResonance,
        filterEnabled,
        filterType,
        reverbMix,
        delayMix,
        drive,
        structure,
        stereoWidth
    };

private:
    std::unique_ptr<SamSamplerImpl> impl;
    std::string stateBuffer_;
};

#endif /* SamSamplerDSP_h */
