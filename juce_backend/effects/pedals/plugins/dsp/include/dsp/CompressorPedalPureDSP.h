/*
  ==============================================================================

    CompressorPedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Pedal-style compressor for guitar
    - 10 parameters (Threshold, Ratio, Attack, Release, Level, Blend, Sustain, Knee, Tone, Circuit)
    - 8 compressor circuit types (pedal-style)
    - Envelope follower with knee control

  ==============================================================================
*/

#pragma once

#include "dsp/GuitarPedalPureDSP.h"

namespace DSP {

//==============================================================================
// Compressor Circuit Types
//==============================================================================

enum class CompressorCircuit
{
    Dynacomp,       // MXR Dynacomp style
    Ross,           // Ross Compressor style
    BossCS2,        // Boss CS-2 style
    Diamond,        // Diamond Compressor style
    Keeley,         // Keeley Compressor style
    Wampler,        // Wampler Ego Compressor
    Empress,        // Empress Compressor
    Origin          // Origin Effects Cali76
};

//==============================================================================
// Compressor Pedal
//==============================================================================

class CompressorPedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    // Parameters
    //==============================================================================

    enum Parameters
    {
        Threshold = 0,    // Compression threshold (-40dB to 0dB)
        Ratio,           // Compression ratio (1:1 to 20:1)
        Attack,          // Attack time (0.1ms to 100ms)
        Release,         // Release time (10ms to 1000ms)
        Level,           // Makeup gain (0-30dB)
        Blend,           // Dry/wet blend (0-100%)
        Sustain,         // Auto attack/release (on/off)
        Knee,            // Soft knee (0-6dB)
        Tone,            // Tone control (dark to bright)
        Circuit,         // Compressor circuit (0-7)
        NUM_PARAMETERS
    };

    //==============================================================================
    // Presets
    //==============================================================================

    enum Presets
    {
        Country = 0,     // Light compression for country
        Funk,            // Medium compression for funk
        Rock,            // Classic rock compression
        Jazz,            // Smooth jazz compression
        ChickenPicking,  // Tight chicken picking
        MaxSustain,      // Maximum sustain
        Transparent,     // Transparent compression
        Squash,          // Heavy squash
        NUM_PRESETS
    };

    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    CompressorPedalPureDSP();
    virtual ~CompressorPedalPureDSP() = default;

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

    const char* getName() const override { return "Compressor"; }
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
     * Process envelope follower with program-dependent attack/release
     */
    float processEnvelope(float input, int channel);

    /**
     * Calculate gain reduction with soft knee
     */
    float calculateGainReduction(float inputLevel, float envelope);

    /**
     * Apply circuit-specific compression
     */
    float processCircuit(float input, float gainReduction);

    /**
     * Apply tone control (simple high shelf)
     */
    float processTone(float input);

    //==============================================================================
    // Parameter State
    //==============================================================================

    struct Params
    {
        float threshold;    // -40dB to 0dB
        float ratio;        // 1:1 to 20:1
        float attack;       // 0.1ms to 100ms
        float release;      // 10ms to 1000ms
        float level;        // 0-30dB
        float blend;        // 0-100%
        float sustain;      // 0-1 (auto mode)
        float knee;         // 0-6dB
        float tone;         // 0-1 (dark to bright)
        int circuit;        // 0-7
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

    // Tone filter state
    float toneZ1_[2] = {0.0f, 0.0f};

    //==============================================================================
    // Factory Presets
    //==============================================================================

    static const Preset COMPRESSOR_PRESETS[NUM_PRESETS];
};

//==============================================================================
// Factory Presets Definitions
//==============================================================================

inline const GuitarPedalPureDSP::Preset CompressorPedalPureDSP::COMPRESSOR_PRESETS[NUM_PRESETS] =
{
    {
        "Country",
        (float[]){-20.0f, 4.0f, 5.0f, 100.0f, 6.0f, 0.3f, 0.0f, 2.0f, 0.5f, 0.0f},
        NUM_PARAMETERS
    },
    {
        "Funk",
        (float[]){-15.0f, 6.0f, 3.0f, 80.0f, 8.0f, 0.5f, 0.0f, 3.0f, 0.6f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Rock",
        (float[]){-18.0f, 5.0f, 4.0f, 90.0f, 7.0f, 0.4f, 0.0f, 2.5f, 0.5f, 2.0f},
        NUM_PARAMETERS
    },
    {
        "Jazz",
        (float[]){-12.0f, 3.0f, 8.0f, 150.0f, 5.0f, 0.2f, 0.0f, 1.5f, 0.4f, 3.0f},
        NUM_PARAMETERS
    },
    {
        "Chicken Picking",
        (float[]){-25.0f, 8.0f, 2.0f, 50.0f, 10.0f, 0.6f, 0.0f, 4.0f, 0.7f, 4.0f},
        NUM_PARAMETERS
    },
    {
        "Max Sustain",
        (float[]){-30.0f, 10.0f, 1.0f, 200.0f, 12.0f, 0.7f, 1.0f, 5.0f, 0.5f, 5.0f},
        NUM_PARAMETERS
    },
    {
        "Transparent",
        (float[]){-10.0f, 2.0f, 10.0f, 200.0f, 3.0f, 0.15f, 1.0f, 1.0f, 0.5f, 6.0f},
        NUM_PARAMETERS
    },
    {
        "Squash",
        (float[]){-35.0f, 15.0f, 0.5f, 30.0f, 15.0f, 0.8f, 0.0f, 6.0f, 0.6f, 7.0f},
        NUM_PARAMETERS
    }
};

} // namespace DSP
