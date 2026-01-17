/*
  ==============================================================================

    EQPedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Pedal-style EQ for guitar
    - 10 parameters (Bass, Mid, Treble, Mid Freq, Level, Q, Circuit)
    - 8 EQ circuit types (pedal-style)
    - 3-band EQ with sweepable mid

  ==============================================================================
*/

#pragma once

#include "dsp/GuitarPedalPureDSP.h"

namespace DSP {

//==============================================================================
// EQ Circuit Types
//==============================================================================

enum class EQCircuit
{
    BossGE7,        // Boss GE-7 graphic EQ style
    MXR10Band,      // MXR 10-band EQ style
    EQDTheEQ,       // EarthQuaker Devices The EQ
    Wampler,        // Wampler Equator
    Tech21,         // Tech21 SansAmp EQ
    Mooer,          // Mooer Graphic EQ
    Empress,        // Empress ParaEQ
    Freqout         // DOD Freqout style
};

//==============================================================================
// EQ Pedal
//==============================================================================

class EQPedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    // Parameters
    //==============================================================================

    enum Parameters
    {
        Bass = 0,         // Low frequency control (-12dB to +12dB)
        Mid,             // Mid frequency control (-12dB to +12dB)
        Treble,          // High frequency control (-12dB to +12dB)
        MidFreq,         // Mid frequency (250Hz to 4kHz)
        Level,           // Overall level (-12dB to +12dB)
        Q,               // Mid bandwidth (0.5 to 3.0)
        Circuit,         // EQ circuit (0-7)
        NUM_PARAMETERS
    };

    //==============================================================================
    // Presets
    //==============================================================================

    enum Presets
    {
        Flat = 0,        // Flat response
        BassBoost,       // Bass boost
        TrebleBoost,     // Treble boost
        MidScoop,        // Mid scoop
        VShape,          // V-shape EQ
        Country,         // Country tone
        Blues,           // Blues tone
        Jazz,            // Jazz tone
        NUM_PRESETS
    };

    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    EQPedalPureDSP();
    virtual ~EQPedalPureDSP() = default;

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

    const char* getName() const override { return "EQ"; }
    PedalCategory getCategory() const override { return PedalCategory::Filter; }

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
    // DSP Methods
    //==============================================================================

    /**
     * Process bass shelf filter
     */
    float processBass(float input, int channel);

    /**
     * Process mid peaking filter
     */
    float processMid(float input, int channel);

    /**
     * Process treble shelf filter
     */
    float processTreble(float input, int channel);

    /**
     * Apply circuit-specific coloration
     */
    float processCircuit(float input);

    //==============================================================================
    // Parameter State
    //==============================================================================

    struct Params
    {
        float bass;         // -12dB to +12dB
        float mid;          // -12dB to +12dB
        float treble;       // -12dB to +12dB
        float midFreq;      // 250Hz to 4kHz
        float level;        // -12dB to +12dB
        float q;            // 0.5 to 3.0
        int circuit;        // 0-7
    };

    Params params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    // Filter states (biquad coefficients)
    float bassZ1_[2] = {0.0f, 0.0f};
    float bassZ2_[2] = {0.0f, 0.0f};
    float midZ1_[2] = {0.0f, 0.0f};
    float midZ2_[2] = {0.0f, 0.0f};
    float trebleZ1_[2] = {0.0f, 0.0f};
    float trebleZ2_[2] = {0.0f, 0.0f};

    // Filter coefficients
    float bassB0_, bassB1_, bassB2_, bassA1_, bassA2_;
    float midB0_, midB1_, midB2_, midA1_, midA2_;
    float trebleB0_, trebleB1_, trebleB2_, trebleA1_, trebleA2_;

    //==============================================================================
    // Helper Methods
    //==============================================================================

    /**
     * Soft clipping function for tube-like distortion
     */
    float softClip(float x) const;

    /**
     * Calculate low shelf filter coefficients
     */
    void calcLowShelf(float gain, float freq, float& b0, float& b1, float& b2, float& a1, float& a2);

    /**
     * Calculate peaking filter coefficients
     */
    void calcPeaking(float gain, float freq, float q, float& b0, float& b1, float& b2, float& a1, float& a2);

    /**
     * Calculate high shelf filter coefficients
     */
    void calcHighShelf(float gain, float freq, float& b0, float& b1, float& b2, float& a1, float& a2);

    /**
     * Convert dB to linear
     */
    float dbToLinear(float db) const
    {
        return std::pow(10.0f, db / 20.0f);
    }

    //==============================================================================
    // Factory Presets
    //==============================================================================

    static const Preset EQ_PRESETS[NUM_PRESETS];
};

//==============================================================================
// Factory Presets Definitions
//==============================================================================

inline const GuitarPedalPureDSP::Preset EQPedalPureDSP::EQ_PRESETS[NUM_PRESETS] =
{
    {
        "Flat",
        // Bass, Mid, Treble (0.5 = flat), MidFreq (1000Hz), Level (0.5), Q (1.0), Circuit (0)
        new float[7]{0.5f, 0.5f, 0.5f, (1000.0f - 250.0f) / (4000.0f - 250.0f), 0.5f, (1.0f - 0.5f) / (3.0f - 0.5f), 0.0f / 7.0f},
        NUM_PARAMETERS
    },
    {
        "Bass Boost",
        // Bass: +9dB, Mid: 0dB, Treble: +3dB, MidFreq: 800Hz, Level: +3dB, Q: 1.0, Circuit: 1
        new float[7]{(9.0f + 12.0f) / 24.0f, 0.5f, (3.0f + 12.0f) / 24.0f, (800.0f - 250.0f) / (4000.0f - 250.0f), (3.0f + 12.0f) / 24.0f, (1.0f - 0.5f) / (3.0f - 0.5f), 1.0f / 7.0f},
        NUM_PARAMETERS
    },
    {
        "Treble Boost",
        // Bass: +3dB, Mid: 0dB, Treble: +9dB, MidFreq: 1200Hz, Level: 0dB (reduced from +3dB), Q: 1.0, Circuit: 2
        new float[7]{(3.0f + 12.0f) / 24.0f, 0.5f, (9.0f + 12.0f) / 24.0f, (1200.0f - 250.0f) / (4000.0f - 250.0f), 0.5f, (1.0f - 0.5f) / (3.0f - 0.5f), 2.0f / 7.0f},
        NUM_PARAMETERS
    },
    {
        "Mid Scoop",
        // Bass: +6dB, Mid: -8dB, Treble: +6dB, MidFreq: 800Hz, Level: 0dB (reduced from +2dB), Q: 1.5, Circuit: 3
        new float[7]{(6.0f + 12.0f) / 24.0f, (-8.0f + 12.0f) / 24.0f, (6.0f + 12.0f) / 24.0f, (800.0f - 250.0f) / (4000.0f - 250.0f), 0.5f, (1.5f - 0.5f) / (3.0f - 0.5f), 3.0f / 7.0f},
        NUM_PARAMETERS
    },
    {
        "V Shape",
        // Bass: +8dB, Mid: -6dB, Treble: +8dB, MidFreq: 1000Hz, Level: 0dB (reduced from +3dB), Q: 1.2, Circuit: 4
        new float[7]{(8.0f + 12.0f) / 24.0f, (-6.0f + 12.0f) / 24.0f, (8.0f + 12.0f) / 24.0f, (1000.0f - 250.0f) / (4000.0f - 250.0f), 0.5f, (1.2f - 0.5f) / (3.0f - 0.5f), 4.0f / 7.0f},
        NUM_PARAMETERS
    },
    {
        "Country",
        // Bass: +4dB, Mid: +2dB, Treble: +5dB, MidFreq: 1200Hz, Level: 0dB (reduced from +2dB), Q: 1.0, Circuit: 5
        new float[7]{(4.0f + 12.0f) / 24.0f, (2.0f + 12.0f) / 24.0f, (5.0f + 12.0f) / 24.0f, (1200.0f - 250.0f) / (4000.0f - 250.0f), 0.5f, (1.0f - 0.5f) / (3.0f - 0.5f), 5.0f / 7.0f},
        NUM_PARAMETERS
    },
    {
        "Blues",
        // Bass: +5dB, Mid: +3dB, Treble: +4dB, MidFreq: 700Hz, Level: +2dB, Q: 1.1, Circuit: 6
        new float[7]{(5.0f + 12.0f) / 24.0f, (3.0f + 12.0f) / 24.0f, (4.0f + 12.0f) / 24.0f, (700.0f - 250.0f) / (4000.0f - 250.0f), (2.0f + 12.0f) / 24.0f, (1.1f - 0.5f) / (3.0f - 0.5f), 6.0f / 7.0f},
        NUM_PARAMETERS
    },
    {
        "Jazz",
        // Bass: +3dB, Mid: +4dB, Treble: +3dB, MidFreq: 600Hz, Level: +1dB, Q: 0.9, Circuit: 7
        new float[7]{(3.0f + 12.0f) / 24.0f, (4.0f + 12.0f) / 24.0f, (3.0f + 12.0f) / 24.0f, (600.0f - 250.0f) / (4000.0f - 250.0f), (1.0f + 12.0f) / 24.0f, (0.9f - 0.5f) / (3.0f - 0.5f), 7.0f / 7.0f},
        NUM_PARAMETERS
    }
};

} // namespace DSP
