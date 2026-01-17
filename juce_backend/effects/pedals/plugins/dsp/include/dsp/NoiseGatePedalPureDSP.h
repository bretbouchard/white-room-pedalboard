/*
  ==============================================================================

    NoiseGatePedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Simple noise gate pedal for guitar
    - 6 parameters (Threshold, Attack, Hold, Release, Hysteresis, Mix)
    - Envelope follower for smooth gating
    - Stereo processing

  ==============================================================================
*/

#pragma once

#include "dsp/GuitarPedalPureDSP.h"

namespace DSP {

//==============================================================================
// Noise Gate Pedal
//==============================================================================

class NoiseGatePedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    // Parameters
    //==============================================================================

    enum Parameters
    {
        Threshold = 0,    // Gate threshold (-60dB to 0dB)
        Attack,           // Attack time (0.1ms to 100ms)
        Hold,             // Hold time (0ms to 1000ms)
        Release,          // Release time (0.1ms to 1000ms)
        Hysteresis,       // Hysteresis to prevent chatter (0dB to 6dB)
        Mix,              // Dry/wet mix (0% to 100%)
        NUM_PARAMETERS
    };

    //==============================================================================
    // Presets
    //==============================================================================

    enum Presets
    {
        Silent = 0,       // Tight gate for high gain
        Medium,           // Medium gating
        Open,             // Light gating
        Studio,           // Studio noise gate
        Fast,             // Fast attack/release
        Slow,             // Slow attack/release
        Tracking,         // Tracking gate
        Transparent,      // Transparent gating
        NUM_PRESETS
    };

    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    NoiseGatePedalPureDSP();
    virtual ~NoiseGatePedalPureDSP() = default;

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

    const char* getName() const override { return "Noise Gate"; }
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

private:
    //==============================================================================
    // DSP Methods
    //==============================================================================

    /**
     * Convert dB to linear amplitude
     */
    float dbToLinear(float db) const
    {
        return std::pow(10.0f, db / 20.0f);
    }

    /**
     * Convert linear amplitude to dB
     */
    float linearToDb(float linear) const
    {
        return 20.0f * std::log10(std::max(linear, 1e-10f));
    }

    /**
     * Process envelope follower (attack/release)
     */
    float processEnvelope(float input, int channel);

    /**
     * Process gate with hysteresis
     */
    float processGate(float input, float envelope, int channel);

    //==============================================================================
    // Parameter State
    //==============================================================================

    struct Params
    {
        float threshold;    // -60dB to 0dB
        float attack;       // 0.1ms to 100ms
        float hold;         // 0ms to 1000ms
        float release;      // 0.1ms to 1000ms
        float hysteresis;   // 0dB to 6dB
        float mix;          // 0% to 100%
    };

    Params params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    // Envelope follower state
    float envelope_[2] = {0.0f, 0.0f};

    // Attack/release coefficients
    float attackCoeff_ = 0.0f;
    float releaseCoeff_ = 0.0f;

    // Gate state (open/closed)
    bool gateOpen_[2] = {false, false};

    // Hold timer (samples)
    int holdTimer_[2] = {0, 0};

    //==============================================================================
    // Factory Presets
    //==============================================================================

    static const Preset NOISE_GATE_PRESETS[NUM_PRESETS];
};

//==============================================================================
// Factory Presets Definitions
//==============================================================================

inline const GuitarPedalPureDSP::Preset NoiseGatePedalPureDSP::NOISE_GATE_PRESETS[NUM_PRESETS] =
{
    {
        "Silent",
        (float[]){-40.0f, 1.0f, 10.0f, 50.0f, 2.0f, 100.0f},
        NUM_PARAMETERS
    },
    {
        "Medium",
        (float[]){-50.0f, 5.0f, 50.0f, 100.0f, 3.0f, 100.0f},
        NUM_PARAMETERS
    },
    {
        "Open",
        (float[]){-60.0f, 10.0f, 100.0f, 200.0f, 4.0f, 100.0f},
        NUM_PARAMETERS
    },
    {
        "Studio",
        (float[]){-45.0f, 2.0f, 20.0f, 80.0f, 2.5f, 100.0f},
        NUM_PARAMETERS
    },
    {
        "Fast",
        (float[]){-35.0f, 0.5f, 5.0f, 20.0f, 1.5f, 100.0f},
        NUM_PARAMETERS
    },
    {
        "Slow",
        (float[]){-55.0f, 20.0f, 200.0f, 500.0f, 5.0f, 100.0f},
        NUM_PARAMETERS
    },
    {
        "Tracking",
        (float[]){-48.0f, 3.0f, 30.0f, 150.0f, 3.5f, 100.0f},
        NUM_PARAMETERS
    },
    {
        "Transparent",
        (float[]){-52.0f, 8.0f, 80.0f, 180.0f, 4.0f, 100.0f},
        NUM_PARAMETERS
    }
};

} // namespace DSP
