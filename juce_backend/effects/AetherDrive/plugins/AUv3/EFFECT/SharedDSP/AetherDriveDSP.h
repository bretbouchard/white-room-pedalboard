//
//  AetherDriveDSP.h
//  SharedDSP
//
//  C++ wrapper for AetherDrive effect DSP
//  Provides interface for AUv3 extension to access DSP functionality
//

#ifndef AetherDriveDSP_h
#define AetherDriveDSP_h

#include <AudioToolbox/AudioToolbox.h>
#include <memory>

class AetherDriveDSP {
public:
    AetherDriveDSP();
    ~AetherDriveDSP();

    // Initialization
    void initialize(double sampleRate, int maximumFramesToRender);

    // DSP Processing (EFFECT - processes input to output)
    void process(AUAudioFrameCount frameCount,
                AudioBufferList *outputBufferList,
                AudioBufferList *inputBufferList,
                const AUEventSampleTime *timestamp);

    // Parameters (9 parameters for AetherDrive effect)
    void setParameter(AUParameterAddress address, float value);
    float getParameter(AUParameterAddress address) const;

    // Presets
    void setState(const char *stateData);
    const char *getState() const;

    // Factory presets
    void loadFactoryPreset(int index);
    static const char* getFactoryPresetName(int index);
    static constexpr int NUM_FACTORY_PRESETS = 8;

private:
    class Impl;
    std::unique_ptr<Impl> impl;
};

#endif /* AetherDriveDSP_h */
