#pragma once

#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>

namespace FilterGate {

//==============================================================================
enum class FilterType
{
    LOWPASS,
    HIGHPASS,
    BANDPASS,
    NOTCH
};

//==============================================================================
struct SVFParams
{
    FilterType type = FilterType::LOWPASS;
    float cutoffHz = 1000.0f;
    float resonance = 0.5f;  // 0-1
    float sampleRate = 48000.0f;
};

//==============================================================================
class StateVariableFilter
{
public:
    StateVariableFilter();
    ~StateVariableFilter();

    void setParams (const SVFParams& newParams);
    void reset();
    float process (float input);

    // Stereo processing
    void processStereo (float* left, float* right, int numSamples);

private:
    SVFParams params;

    // State variables
    float low = 0.0f;
    float high = 0.0f;
    float band = 0.0f;
    float notch = 0.0f;

    float coeff = 0.0f;  // Frequency coefficient
    float q = 0.0f;       // Resonance/Q

    void updateCoefficients();
};

} // namespace FilterGate
