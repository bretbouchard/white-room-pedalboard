#pragma once

#include <juce_core/juce_core.h>

namespace FilterGate {

//==============================================================================
struct LadderParams
{
    float cutoffHz = 1000.0f;
    float resonance = 0.5f;  // 0-1
    float drive = 0.3f;      // 0-1, saturation amount
};

//==============================================================================
class LadderFilter
{
public:
    LadderFilter();
    ~LadderFilter();

    void setParams (const LadderParams& newParams);
    void reset();
    float process (float input);

    void setSampleRate (double newSampleRate);

private:
    LadderParams params;
    double sampleRate = 48000.0;

    // 4 ladder stages
    float stage1 = 0.0f;
    float stage2 = 0.0f;
    float stage3 = 0.0f;
    float stage4 = 0.0f;

    float feedback = 0.0f;

    // Soft clipper using tanh
    float tanhX (float x);

    void updateCoefficients();
    float coeff = 0.0f;
};

} // namespace FilterGate
