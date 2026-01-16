/*
  ==============================================================================

    ReverbPedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Regular reverb pedal for guitar
    - 10 parameters (Decay, Mix, Tone, PreDelay, Size, Diffusion, Modulation, Damping, Level, Type)
    - 8 reverb types (Room, Hall, Plate, Spring, Shimmer, Modulated, Reverse, Gated)
    - Stereo processing

  ==============================================================================
*/

#pragma once

#include "dsp/GuitarPedalPureDSP.h"
#include <vector>
#include <array>

namespace DSP {

//==============================================================================
// Reverb Types
//==============================================================================

enum class ReverbType
{
    Room,           // Small room ambience
    Hall,           // Large concert hall
    Plate,          // Classic plate reverb
    Spring,         // Spring reverb (Fender style)
    Shimmer,        // Shimmer reverb (octave up)
    Modulated,      // Modulated reverb
    Reverse,        // Reverse reverb
    Gated           // Gated reverb (80s style)
};

//==============================================================================
// Reverb Pedal
//==============================================================================

class ReverbPedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    // Parameters
    //==============================================================================

    enum Parameters
    {
        Decay = 0,        // Reverb tail length (0.1-10 seconds)
        Mix,             // Dry/wet mix (0-100%)
        Tone,            // Reverb tone (dark to bright)
        PreDelay,        // Pre-delay (0-200ms)
        Size,            // Room size (small to large)
        Diffusion,       // Reverb density (0-1)
        Modulation,      // Chorus modulation on reverb (0-1)
        Damping,         // High-frequency damping (0-1)
        Level,           // Output level (0-1)
        Type,            // Reverb type (0-7)
        NUM_PARAMETERS
    };

    //==============================================================================
    // Presets
    //==============================================================================

    enum Presets
    {
        SmallRoom = 0,   // Small room
        LargeHall,       // Large hall
        VintagePlate,    // Vintage plate
        FenderSpring,    // Fender spring
        ShimmerVerb,     // Shimmer reverb
        ModulatedVerb,   // Modulated reverb
        ReverseVerb,     // Reverse reverb
        GatedVerb,       // Gated reverb
        NUM_PRESETS
    };

    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    ReverbPedalPureDSP();
    virtual ~ReverbPedalPureDSP() = default;

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

    const char* getName() const override { return "Reverb"; }
    PedalCategory getCategory() const override { return PedalCategory::TimeBased; }

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
     * Process room reverb (small room simulation)
     */
    float processRoom(float input, int channel);

    /**
     * Process hall reverb (large hall simulation)
     */
    float processHall(float input, int channel);

    /**
     * Process plate reverb (classic plate)
     */
    float processPlate(float input, int channel);

    /**
     * Process spring reverb (Fender style)
     */
    float processSpring(float input, int channel);

    /**
     * Process shimmer reverb (octave up)
     */
    float processShimmer(float input, int channel);

    /**
     * Process modulated reverb
     */
    float processModulated(float input, int channel);

    /**
     * Process reverse reverb
     */
    float processReverse(float input, int channel);

    /**
     * Process gated reverb (80s style)
     */
    float processGated(float input, int channel);

    /**
     * Read from delay line with modulation
     */
    float readDelayLine(float* buffer, int& writeIndex, int bufferSize, float delaySamples, int channel);

    /**
     * Apply tone control to reverb tail
     */
    float processTone(float input, int channel);

    /**
     * Apply LFO modulation
     */
    float processModulation(float input, float phase);

    //==============================================================================
    // Parameter State
    //==============================================================================

    struct Params
    {
        float decay;        // 0.1-10 seconds
        float mix;          // 0-100%
        float tone;         // 0-1 (dark to bright)
        float preDelay;     // 0-200ms
        float size;         // 0-1 (small to large)
        float diffusion;    // 0-1
        float modulation;   // 0-1
        float damping;      // 0-1
        float level;        // 0-1
        int type;           // 0-7
    };

    Params params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    // Delay lines for reverb network
    static constexpr int MAX_DELAY_SAMPLES = 96000;  // 2 seconds at 48kHz
    std::vector<float> delayLines_[2];               // Stereo delay lines
    int writeIndex_[2] = {0, 0};

    // Early reflection delays
    int earlyDelay1_[2] = {0, 0};
    int earlyDelay2_[2] = {0, 0};
    int earlyDelay3_[2] = {0, 0};

    // LFO for modulation
    float lfoPhase_[2] = {0.0f, 0.0f};
    float lfoRate_ = 0.5f;  // Hz

    // Tone filter state
    float toneZ1_[2] = {0.0f, 0.0f};

    // Reverse buffer
    std::vector<float> reverseBuffer_[2];
    int reverseWriteIndex_[2] = {0, 0};
    bool reverseFilling_[2] = {true, true};

    // Gate state
    float gateEnvelope_[2] = {0.0f, 0.0f};

    //==============================================================================
    // Helper Methods
    //==============================================================================

    /**
     * Convert seconds to samples
     */
    int timeToSamples(float time) const
    {
        return static_cast<int>(time * static_cast<float>(sampleRate_));
    }

    /**
     * Linear interpolation for delay reading
     */
    float lerp(float a, float b, float t) const
    {
        return a + t * (b - a);
    }

    //==============================================================================
    // Factory Presets
    //==============================================================================

    static const Preset REVERB_PRESETS[NUM_PRESETS];
};

//==============================================================================
// Factory Presets Definitions
//==============================================================================

inline const GuitarPedalPureDSP::Preset ReverbPedalPureDSP::REVERB_PRESETS[NUM_PRESETS] =
{
    {
        "Small Room",
        (float[]){1.5f, 0.3f, 0.5f, 0.0f, 0.3f, 0.5f, 0.0f, 0.3f, 0.7f, 0.0f},
        NUM_PARAMETERS
    },
    {
        "Large Hall",
        (float[]){4.0f, 0.5f, 0.6f, 20.0f, 0.8f, 0.7f, 0.1f, 0.4f, 0.7f, 1.0f},
        NUM_PARAMETERS
    },
    {
        "Vintage Plate",
        (float[]){2.5f, 0.4f, 0.5f, 10.0f, 0.6f, 0.6f, 0.0f, 0.3f, 0.75f, 2.0f},
        NUM_PARAMETERS
    },
    {
        "Fender Spring",
        (float[]){2.0f, 0.5f, 0.4f, 5.0f, 0.4f, 0.4f, 0.2f, 0.5f, 0.7f, 3.0f},
        NUM_PARAMETERS
    },
    {
        "Shimmer",
        (float[]){5.0f, 0.6f, 0.7f, 15.0f, 0.7f, 0.8f, 0.3f, 0.2f, 0.6f, 4.0f},
        NUM_PARAMETERS
    },
    {
        "Modulated",
        (float[]){3.0f, 0.5f, 0.5f, 10.0f, 0.6f, 0.7f, 0.5f, 0.3f, 0.7f, 5.0f},
        NUM_PARAMETERS
    },
    {
        "Reverse",
        (float[]){4.0f, 0.7f, 0.6f, 20.0f, 0.7f, 0.6f, 0.0f, 0.3f, 0.6f, 6.0f},
        NUM_PARAMETERS
    },
    {
        "Gated",
        (float[]){2.0f, 0.6f, 0.5f, 5.0f, 0.5f, 0.9f, 0.0f, 0.2f, 0.8f, 7.0f},
        NUM_PARAMETERS
    }
};

} // namespace DSP
