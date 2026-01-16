/*
  ==============================================================================

    DelayPedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Classic delay pedal with tap tempo

  ==============================================================================
*/

#pragma once

#include "GuitarPedalPureDSP.h"
#include <vector>

namespace DSP {

//==============================================================================
/**
 * Classic Delay Pedal
 *
 * Emulates classic delay pedals like:
 * - Boss DM-2/DM-3
 * - MXR Carbon Copy
 * - Digital delays with analog emulation
 *
 * Features:
 * - Delay time with modulation
 * - Feedback control
 * - Mix control for blending
 * - Tone control for dark repeats
 */
class DelayPedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    DelayPedalPureDSP();
    ~DelayPedalPureDSP() override = default;

    //==============================================================================
    // GuitarPedalPureDSP implementation
    //==============================================================================

    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** inputs, float** outputs, int numChannels, int numSamples) override;

    const char* getName() const override { return "Classic Delay"; }
    PedalCategory getCategory() const override { return PedalCategory::TimeBased; }

    //==============================================================================
    // Parameters
    //==============================================================================

    static constexpr int NUM_PARAMETERS = 14;

    enum ParameterIndex
    {
        Time = 0,
        Feedback,
        Mix,
        Tone,
        Modulation, // Mod amount for delay time
        Level,
        Circuit,        // Circuit selector (8 modes)
        TapTempo,       // Tap tempo with subdivisions
        Wow,            // Wow (slow pitch modulation)
        Flutter,        // Flutter (fast pitch modulation)
        FilterModeParam,     // Filter modes (4 types)
        MultiTap,       // Multi-tap enable
        ReverseMode,    // Reverse delay
        Ducking         // Ducking (sidechain compression)
    };

    int getNumParameters() const override { return NUM_PARAMETERS; }

    const Parameter* getParameter(int index) const override;
    float getParameterValue(int index) const override;
    void setParameterValue(int index, float value) override;

    //==============================================================================
    // Presets
    //==============================================================================

    static constexpr int NUM_PRESETS = 8;
    int getNumPresets() const override { return NUM_PRESETS; }
    const Preset* getPreset(int index) const override;

private:
    //==============================================================================
    // Delay Circuit Types
    //==============================================================================

    enum class DelayCircuit
    {
        AnalogDelay,    // BBD delay, dark repeats
        DigitalDelay,   // Clean digital delay
        TapeDelay,      // Tape echo with wow/flutter
        PingPongDelay,  // Stereo ping-pong
        SlapbackDelay,  // Short slapback
        MultiTapDelay,  // Complex tap patterns
        ReverseDelay,   // Reverse playback
        EchorecDelay    // Echoplex style
    };

    //==============================================================================
    // Filter Modes
    //==============================================================================

    enum class FilterMode
    {
        Low,       // Dark repeats (analog)
        Flat,      // Clean (digital)
        High,      // Bright repeats
        Sweep      // Filter sweeps
    };

    //==============================================================================
    // Tap Subdivisions
    //==============================================================================

    enum class TapSubdivision
    {
        Quarter,      // Quarter note
        DottedEighth, // Dotted eighth
        Triplet,      // Eighth note triplet
        Eighth        // Eighth note
    };

    //==============================================================================
    // DSP Circuits
    //==============================================================================

    /**
     * Circuit-specific delay processing
     */
    float processCircuit(float input);

    /**
     * Multi-tap delay processing
     */
    float processMultiTap(float input);

    /**
     * Reverse delay processing
     */
    float processReverse(float input);

    /**
     * Ducking (sidechain compression)
     */
    float processDucking(float input, float wetSignal);

    /**
     * Read from delay line with modulation
     */
    float readDelayLine(float modulation, int tapIndex = 0);

    /**
     * Tone control (lowpass for analog warmth)
     */
    float processTone(float input);

    //==============================================================================
    // Parameter Structure
    //==============================================================================

    struct Parameters
    {
        float time = 0.5f;         // 0-1, delay time
        float feedback = 0.4f;      // 0-1, feedback amount
        float mix = 0.5f;           // 0-1, wet/dry mix
        float tone = 0.7f;          // 0-1, tone control (darkness)
        float modulation = 0.1f;    // 0-1, modulation amount
        float level = 0.7f;         // 0-1, output level
        int circuit = 0;            // 0-7, circuit type (DelayCircuit enum)
        int tapTempo = 0;           // 0-3, tap subdivision (TapSubdivision enum)
        float wow = 0.0f;           // 0-1, wow amount
        float flutter = 0.0f;       // 0-1, flutter amount
        int filterMode = 0;         // 0-3, filter mode (FilterMode enum)
        int multiTap = 0;           // 0=Off, 1=On
        int reverseMode = 0;        // 0=Off, 1=On
        float ducking = 0.0f;       // 0-1, ducking amount
    } params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    // Delay lines (multi-tap support)
    static constexpr int MAX_TAPS = 3;
    std::vector<float> delayLines_[MAX_TAPS];
    int writeIndex_[MAX_TAPS] = {0};
    int maxDelaySamples_[MAX_TAPS] = {0};

    // Tone filter state
    float toneState_ = 0.0f;

    // LFOs for modulation (wow/flutter)
    float wowPhase_ = 0.0f;
    float flutterPhase_ = 0.0f;

    // Ducking envelope follower
    float duckEnvelope_ = 0.0f;

    // Reverse delay buffer
    std::vector<float> reverseBuffer_;
    int reverseWriteIndex_ = 0;
    int reverseReadIndex_ = 0;
    bool reverseFilling_ = false;
};

//==============================================================================
// Factory Presets
//==============================================================================

static constexpr DelayPedalPureDSP::Preset DELAY_PRESETS[DelayPedalPureDSP::NUM_PRESETS] =
{
    {
        "Slapback",
        (float[]){0.15f, 0.2f, 0.3f, 0.8f, 0.0f, 0.7f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f},
        14
    },
    {
        "Rockabilly",
        (float[]){0.25f, 0.3f, 0.4f, 0.7f, 0.1f, 0.7f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f},
        14
    },
    {
        "Analog Delay",
        (float[]){0.5f, 0.5f, 0.5f, 0.7f, 0.2f, 0.7f, 0.0f, 0.0f, 0.3f, 0.2f, 0.0f, 0.0f, 0.0f, 0.0f},
        14
    },
    {
        "Digital Delay",
        (float[]){0.6f, 0.6f, 0.5f, 0.5f, 0.0f, 0.7f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f},
        14
    },
    {
        "Tape Echo",
        (float[]){0.5f, 0.6f, 0.6f, 0.8f, 0.3f, 0.7f, 2.0f, 0.0f, 0.5f, 0.4f, 0.0f, 0.0f, 0.0f, 0.0f},
        14
    },
    {
        "Multi-Tap",
        (float[]){0.6f, 0.5f, 0.7f, 0.6f, 0.1f, 0.7f, 5.0f, 0.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.0f, 0.0f},
        14
    },
    {
        "Reverse",
        (float[]){0.7f, 0.6f, 0.8f, 0.5f, 0.2f, 0.6f, 6.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 1.0f, 0.0f},
        14
    },
    {
        "Ambient Duck",
        (float[]){0.8f, 0.7f, 0.7f, 0.6f, 0.3f, 0.6f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.7f},
        14
    }
};

} // namespace DSP
