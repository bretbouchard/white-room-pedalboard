/*
  ==============================================================================

    VolumePedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Volume/Expression pedal for guitar
    - 6 parameters (Volume, Minimum, Expression Mode, Reverse, Curve, Range, Level)
    - Volume and Expression modes
    - Smooth parameter changes

  ==============================================================================
*/

#pragma once

#include "dsp/GuitarPedalPureDSP.h"

namespace DSP {

//==============================================================================
// Volume Pedal Modes
//==============================================================================

enum class VolumeMode
{
    Volume,        // Standard volume pedal
    Expression     // Expression pedal for controlling other parameters
};

//==============================================================================
// Volume Pedal
//==============================================================================

class VolumePedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    // Parameters
    //==============================================================================

    enum Parameters
    {
        Volume = 0,       // Main volume control (0-100%)
        Minimum,          // Minimum volume (0-100%)
        ExpressionMode,   // Expression mode (on/off)
        Reverse,          // Reverse pedal direction (on/off)
        Curve,            // Linear/Log curve (0-1)
        Range,            // Sweep range (0-100%)
        Level,            // Output level (0-1)
        NUM_PARAMETERS
    };

    //==============================================================================
    // Presets
    //==============================================================================

    enum Presets
    {
        Standard = 0,     // Standard volume pedal
        Expression,       // Expression pedal mode
        ReverseDir,       // Reverse direction
        LogCurve,         // Logarithmic curve
        Linear,           // Linear curve
        LimitedRange,     // Limited sweep range
        FullRange,        // Full sweep range
        NUM_PRESETS
    };

    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    VolumePedalPureDSP();
    virtual ~VolumePedalPureDSP() = default;

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

    const char* getName() const override { return "Volume"; }
    PedalCategory getCategory() const override { return PedalCategory::Dynamics; }

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

    //==============================================================================
    // Expression Control
    //==============================================================================

    /**
     * Get current expression value (0-1) for controlling other parameters
     */
    float getExpressionValue() const;

private:
    //==============================================================================
    // DSP Methods
    //==============================================================================

    /**
     * Apply curve to volume value
     */
    float applyCurve(float input);

    /**
     * Smooth volume changes
     */
    float smoothVolume(float target, int channel);

    //==============================================================================
    // Parameter State
    //==============================================================================

    struct Params
    {
        float volume;          // 0-100%
        float minimum;         // 0-100%
        float expressionMode;  // 0-1 (off/on)
        float reverse;         // 0-1 (off/on)
        float curve;           // 0-1 (linear to log)
        float range;           // 0-100%
        float level;           // 0-1
    };

    Params params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    // Smoothing state
    float currentVolume_[2] = {1.0f, 1.0f};
    float smoothingCoeff_ = 0.999f;

    //==============================================================================
    // Factory Presets
    //==============================================================================

    static const Preset VOLUME_PRESETS[NUM_PRESETS];
};

//==============================================================================
// Factory Presets Definitions
//==============================================================================

inline const GuitarPedalPureDSP::Preset VolumePedalPureDSP::VOLUME_PRESETS[NUM_PRESETS] =
{
    {
        "Standard",
        (float[]){1.0f, 0.0f, 0.0f, 0.0f, 0.5f, 1.0f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Expression",
        (float[]){1.0f, 0.0f, 1.0f, 0.0f, 0.5f, 1.0f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Reverse Dir",
        (float[]){1.0f, 0.0f, 0.0f, 1.0f, 0.5f, 1.0f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Log Curve",
        (float[]){1.0f, 0.0f, 0.0f, 0.0f, 0.2f, 1.0f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Linear",
        (float[]){1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 1.0f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Limited Range",
        new float[7]{0.7f, 0.3f, 0.0f, 0.0f, 0.5f, 0.4f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Full Range",
        (float[]){1.0f, 0.0f, 0.0f, 0.0f, 0.5f, 1.0f, 1.0f},
        NUM_PARAMETERS
    }
};

} // namespace DSP
