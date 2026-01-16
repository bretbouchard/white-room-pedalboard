/*
  ==============================================================================

    BiPhasePedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Bi-Phase phaser pedal wrapper
    - Wraps existing BiPhasePureDSP_v2 implementation
    - Follows GuitarPedalPureDSP base class pattern
    - Simplified parameter interface for pedal use

  ==============================================================================
*/

#pragma once

#include "dsp/GuitarPedalPureDSP.h"
#include "../../../biPhase/include/dsp/BiPhasePureDSP_v2.h"

namespace DSP {

//==============================================================================
// Bi-Phase Phaser Pedal
//==============================================================================

class BiPhasePedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    // Parameters (Simplified for pedal use)
    //==============================================================================

    enum Parameters
    {
        RateA = 0,         // Phasor A rate (0.1-18 Hz)
        DepthA,           // Phasor A depth (0-1)
        FeedbackA,        // Phasor A feedback (0-0.98)
        RateB,            // Phasor B rate (0.1-18 Hz)
        DepthB,           // Phasor B depth (0-1)
        FeedbackB,        // Phasor B feedback (0-0.98)
        Mix,              // Dry/wet mix (0-100%)
        Level,            // Output level (0-1)
        Routing,          // Routing mode (0-2: Parallel/Series/Independent)
        NUM_PARAMETERS
    };

    //==============================================================================
    // Presets
    //==============================================================================

    enum Presets
    {
        ClassicBiPhase = 0,  // Classic Mu-Tron Bi-Phase
        StereoPhaser,        // Stereo phaser
        DeepPhase,           // Deep phase shift
        SubtlePhase,         // Subtle modulation
        Rotary,              // Rotary speaker effect
        JetPhaser,           // Jet phaser
        Vibrato,             // Vibrato
        NUM_PRESETS
    };

    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    BiPhasePedalPureDSP();
    virtual ~BiPhasePedalPureDSP() = default;

    //==============================================================================
    // DSP Lifecycle
    //==============================================================================

    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** inputs, float** outputs,
                int numChannels, int numSamples) override;

    //==============================================================================
    // Pedal Information
    //==============================================================================

    const char* getName() const override { return "Bi-Phase"; }
    PedalCategory getCategory() const override { return PedalCategory::Modulation; }

    //==============================================================================
    // Parameters
    //==============================================================================

    int getNumParameters() const override { return NUM_PARAMETERS; }
    const Parameter* getParameter(int index) const override;
    float getParameterValue(int index) const override;
    void setParameterValue(int index, float value) override;

    //==============================================================================
    // Presets
    //==============================================================================

    int getNumPresets() const override { return NUM_PRESETS; }
    const Preset* getPreset(int index) const override;

private:
    //==============================================================================
    // Wrapped BiPhase DSP
    //==============================================================================

    BiPhaseDSP biPhaseDSP_;

    //==============================================================================
    // Parameter State (Simplified)
    //==============================================================================

    struct Params
    {
        float rateA;         // 0.1-18 Hz
        float depthA;        // 0-1
        float feedbackA;     // 0-0.98
        float rateB;         // 0.1-18 Hz
        float depthB;        // 0-1
        float feedbackB;     // 0-0.98
        float mix;           // 0-1
        float level;         // 0-1
        int routing;         // 0-2
    };

    Params params_;

    //==============================================================================
    // Factory Presets
    //==============================================================================

    static const Preset BIPHASE_PRESETS[NUM_PRESETS];
};

//==============================================================================
// Factory Presets Definitions
//==============================================================================

inline const GuitarPedalPureDSP::Preset BiPhasePedalPureDSP::BIPHASE_PRESETS[NUM_PRESETS] =
{
    {
        "Classic Bi-Phase",
        new float[9]{0.5f, 0.5f, 0.5f, 0.7f, 0.5f, 0.5f, 0.6f, 0.7f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Stereo Phaser",
        new float[9]{0.5f, 0.6f, 0.4f, 0.5f, 0.6f, 0.4f, 0.7f, 0.7f, 0.0f},
        NUM_PARAMETERS
    },
    {
        "Deep Phase",
        new float[9]{0.3f, 0.7f, 0.6f, 0.3f, 0.7f, 0.6f, 0.8f, 0.6f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Subtle Phase",
        new float[9]{0.8f, 0.3f, 0.2f, 0.8f, 0.3f, 0.2f, 0.4f, 0.8f, 0.0f},
        NUM_PARAMETERS
    },
    {
        "Rotary",
        new float[9]{0.6f, 0.5f, 0.3f, 0.6f, 0.5f, 0.3f, 0.7f, 0.7f, 0.0f},
        NUM_PARAMETERS
    },
    {
        "Jet Phaser",
        new float[9]{2.0f, 0.8f, 0.7f, 2.0f, 0.8f, 0.7f, 0.9f, 0.6f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Vibrato",
        new float[9]{5.0f, 0.6f, 0.0f, 5.0f, 0.6f, 0.0f, 0.5f, 0.8f, 0.0f},
        NUM_PARAMETERS
    }
};

} // namespace DSP
