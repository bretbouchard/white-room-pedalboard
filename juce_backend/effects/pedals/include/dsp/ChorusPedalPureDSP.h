/*
  ==============================================================================

    ChorusPedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Classic chorus pedal using LFO modulation

  ==============================================================================
*/

#pragma once

#include "GuitarPedalPureDSP.h"

namespace DSP {

//==============================================================================
/**
 * Classic Chorus Pedal
 *
 * Emulates classic chorus pedals like:
 * - Boss CE-1 Chorus Ensemble
 * - Small Clone style circuits
 * - Tri-chorus with multiple LFOs
 *
 * Features:
 * - LFO-modulated delay for chorus effect
 * - Rate and depth controls
 * - Mix for blending chorus and dry
 * - Tone control for EQ
 */
class ChorusPedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    ChorusPedalPureDSP();
    ~ChorusPedalPureDSP() override = default;

    //==============================================================================
    // GuitarPedalPureDSP implementation
    //==============================================================================

    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** inputs, float** outputs, int numChannels, int numSamples) override;

    const char* getName() const override { return "Classic Chorus"; }
    PedalCategory getCategory() const override { return PedalCategory::Modulation; }

    //==============================================================================
    // Parameters
    //==============================================================================

    static constexpr int NUM_PARAMETERS = 11;

    enum ParameterIndex
    {
        Rate = 0,
        Depth,
        Mix,
        Tone,
        VoiceCount,        // 1, 2, or 3 voices
        Circuit,           // Circuit selector (8 modes)
        VibratoMode,       // 100% wet vibrato mode
        SpeedSwitch,       // Slow/fast LFO switch
        Waveform,          // LFO waveform (4 shapes)
        StereoModeParam,   // Mono/stereo/ping-pong
        Detune             // Voice separation/detune
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
    // Chorus Circuit Types
    //==============================================================================

    enum class ChorusCircuit
    {
        AnalogChorus,    // Bucket brigade delay (BBD) emulation
        DigitalChorus,   // Clean digital delay
        TriChorus,       // 3 detuned LFOs
        QuadChorus,      // 4 voices, rich chorus
        DimensionD,      // DOD Dimension D style
        SmallClone,      // Electro-Harmonix style
        CE1,             // Boss CE-1 chorus
        JazzChorus       // Roland Jazz Chorus
    };

    //==============================================================================
    // LFO Waveforms
    //==============================================================================

    enum class LFOWaveform
    {
        Triangle,     // Standard triangle wave
        Sine,         // Smooth sine wave
        Square,       // Chopper effect
        Random        // Random modulation
    };

    //==============================================================================
    // Stereo Modes
    //==============================================================================

    enum class StereoMode
    {
        Mono,         // Single output
        Stereo,       // Ping-pong delay
        Cross         // Opposing phases
    };

    //==============================================================================
    // DSP Circuits
    //==============================================================================

    /**
     * Chorus voice with LFO-modulated delay
     */
    struct ChorusVoice
    {
        float phase = 0.0f;
        float lfoFrequency = 1.0f;

        void prepare(double sampleRate);
        void reset();
        float process(float input, float rate, float depth, float& delayState);
    };

    /**
     * Circuit-specific chorus processing
     */
    float processCircuit(float input, int channel);

    /**
     * Generate LFO waveform
     */
    float generateLFO(float phase, LFOWaveform waveform);

    /**
     * Vibrato mode (100% wet, pitch modulation only)
     */
    float processVibrato(float input);

    /**
     * Tone control (simple lowpass)
     */
    float processTone(float input);

    /**
     * Get LFO rate based on speed switch
     */
    float getLFORate();

    //==============================================================================
    // Parameter Structure
    //==============================================================================

    struct Parameters
    {
        float rate = 0.5f;         // 0-1, LFO rate
        float depth = 0.5f;        // 0-1, modulation depth
        float mix = 0.5f;          // 0-1, wet/dry mix
        float tone = 0.6f;         // 0-1, tone control
        int voiceCount = 3;        // 1-3, number of chorus voices
        int circuit = 0;           // 0-7, circuit type (ChorusCircuit enum)
        int vibratoMode = 0;       // 0=Chorus, 1=Vibrato (100% wet)
        int speedSwitch = 0;       // 0=Slow, 1=Fast LFO range
        int waveform = 0;          // 0-3, LFO waveform (LFOWaveform enum)
        int stereoMode = 0;        // 0-2, stereo mode (StereoMode enum)
        float detune = 0.3f;       // 0-1, voice separation/detune
    } params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    static constexpr int MAX_VOICES = 3;
    ChorusVoice voices_[MAX_VOICES];

    float delayStates_[MAX_VOICES] = {0};
    float toneState_ = 0.0f;

    // Delay line for chorus
    std::vector<float> delayLine_;
    int writeIndex_ = 0;
    int maxDelaySamples_ = 0;
};

//==============================================================================
// Factory Presets
//==============================================================================

static constexpr ChorusPedalPureDSP::Preset CHORUS_PRESETS[ChorusPedalPureDSP::NUM_PRESETS] =
{
    {
        "Subtle Chorus",
        (float[]){0.3f, 0.3f, 0.4f, 0.7f, 2.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.3f},
        11
    },
    {
        "Classic Chorus",
        (float[]){0.5f, 0.5f, 0.5f, 0.6f, 3.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.3f},
        11
    },
    {
        "Lush Chorus",
        (float[]){0.4f, 0.7f, 0.6f, 0.5f, 3.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.4f},
        11
    },
    {
        "Vibrato",
        (float[]){0.7f, 0.8f, 1.0f, 0.6f, 1.0f, 0.0f, 1.0f, 0.0f, 1.0f, 0.0f, 0.2f},
        11
    },
    {
        "Tri-Chorus",
        (float[]){0.5f, 0.6f, 0.7f, 0.6f, 3.0f, 2.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.5f},
        11
    },
    {
        "Dimension D",
        (float[]){0.4f, 0.5f, 0.6f, 0.6f, 3.0f, 4.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.4f},
        11
    },
    {
        "Jazz Chorus",
        (float[]){0.3f, 0.4f, 0.5f, 0.7f, 3.0f, 7.0f, 0.0f, 0.0f, 1.0f, 1.0f, 0.3f},
        11
    },
    {
        "Leslie Warble",
        (float[]){0.6f, 0.7f, 1.0f, 0.5f, 2.0f, 0.0f, 1.0f, 1.0f, 2.0f, 0.0f, 0.6f},
        11
    }
};

} // namespace DSP
