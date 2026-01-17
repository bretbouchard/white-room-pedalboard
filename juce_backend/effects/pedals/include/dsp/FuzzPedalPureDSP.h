/*
  ==============================================================================

    FuzzPedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Classic fuzz pedal using hard clipping

  ==============================================================================
*/

#pragma once

#include "GuitarPedalPureDSP.h"

namespace DSP {

//==============================================================================
/**
 * Classic Fuzz Pedal
 *
 * Emulates classic fuzz pedals like:
 * - Dallas Arbiter Fuzz Face
 * - Big Muff Pi
 * - Fuzz Factory style circuits
 *
 * Features:
 * - Hard clipping for aggressive, saturated fuzz tone
 * - Gate for noise reduction
 * - Tone control for EQ
 * - Contour for midrange scoop
 * - Volume control
 */
class FuzzPedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    FuzzPedalPureDSP();
    ~FuzzPedalPureDSP() override = default;

    //==============================================================================
    // GuitarPedalPureDSP implementation
    //==============================================================================

    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** inputs, float** outputs, int numChannels, int numSamples) override;

    const char* getName() const override { return "Classic Fuzz"; }
    PedalCategory getCategory() const override { return PedalCategory::Distortion; }

    //==============================================================================
    // Parameters
    //==============================================================================

    static constexpr int NUM_PARAMETERS = 12;

    enum ParameterIndex
    {
        Fuzz = 0,
        Tone,
        Contour,
        Gate,
        Volume,
        Stab,        // Stability control (Fuzz Factory style)
        Circuit,     // Circuit selector (8 modes)
        Bias,        // Bias knob (voltage starvation)
        InputTrim,   // Input trim (impedance matching)
        GateMode,    // Gate modes (Off/Soft/Hard)
        OctaveUp,    // Octave up mode (Octavia)
        MidScoop     // Mid scoop switch
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
    // Fuzz Circuit Types
    //==============================================================================

    enum class FuzzCircuit
    {
        FuzzFace,       // Silicon/Ge transistor fuzz
        BigMuff,        // Op-amp + diode clipping
        ToneBender,     // 3-transistor fuzz
        FuzzFactory,    // Voltage starvation
        Octavia,        // Octave-up fuzz
        VelcroFuzz,     // Gated, splatty fuzz
        SuperFuzz,      // Thick, wall of sound
        ToneMachine     // Vintage Japanese fuzz
    };

    //==============================================================================
    // DSP Circuits
    //==============================================================================

    /**
     * Circuit selector - processes fuzz based on selected circuit type
     * Each circuit has unique clipping characteristics
     */
    float processCircuitClipping(float input);

    /**
     * Bias knob - voltage starvation effect
     * Creates "dying battery" sputter and oscillation
     */
    float processBias(float input);

    /**
     * Input trim - adjusts input impedance
     * High = bright/aggressive, Low = dark/smooth
     */
    float processInputTrim(float input);

    /**
     * Octave up - Octavia style octave multiplication
     * Adds octave-up harmonic for ring modulator effect
     */
    float processOctaveUp(float input);

    /**
     * Noise gate with modes
     * Off/Soft/Hard gate modes for different noise reduction
     */
    float processGate(float input);

    /**
     * Tone control with contour scoop
     * Mid-scooped EQ for classic fuzz tone
     */
    float processTone(float input);

    //==============================================================================
    // Parameter Structure
    //==============================================================================

    struct Parameters
    {
        float fuzz = 0.8f;         // 0-1, fuzz amount
        float tone = 0.6f;         // 0-1, tone control
        float contour = 0.5f;      // 0-1, midrange scoop
        float gate = 0.3f;         // 0-1, gate threshold
        float volume = 0.6f;       // 0-1, output volume
        float stab = 0.5f;         // 0-1, stability/oscillation
        int circuit = 0;           // 0-7, circuit type (FuzzCircuit enum)
        float bias = 0.0f;         // 0-1, voltage starvation
        float inputTrim = 0.5f;    // 0-1, input impedance
        int gateMode = 1;          // 0=Off, 1=Soft, 2=Hard
        float octaveUp = 0.0f;     // 0-1, octave up intensity
        float midScoop = 0.5f;     // 0-1, mid scoop amount
    } params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    // Gate state
    float gateEnvelope_ = 0.0f;

    // Tone state
    float toneState_ = 0.0f;

    // Fuzz state (for oscillation)
    float fuzzState_ = 0.0f;
    float phase_ = 0.0f;

    // Octave up state
    float previousInput_ = 0.0f;
    float octavePhase_ = 0.0f;

    // Bias state (voltage starvation)
    float biasPhase_ = 0.0f;
    float biasEnvelope_ = 0.0f;
};

//==============================================================================
// Factory Presets
//==============================================================================

static constexpr FuzzPedalPureDSP::Preset FUZZ_PRESETS[FuzzPedalPureDSP::NUM_PRESETS] =
{
    {
        "Mild Fuzz",
        (float[]){0.4f, 0.6f, 0.5f, 0.3f, 0.6f, 0.5f, 0.0f, 0.0f, 0.5f, 1.0f, 0.0f, 0.5f},
        12
    },
    {
        "Fuzz Face",
        (float[]){0.8f, 0.5f, 0.6f, 0.2f, 0.6f, 0.5f, 0.0f, 0.0f, 0.7f, 1.0f, 0.0f, 0.6f},
        12
    },
    {
        "Big Muff",
        (float[]){0.9f, 0.6f, 0.7f, 0.1f, 0.5f, 0.5f, 1.0f, 0.0f, 0.5f, 1.0f, 0.0f, 0.7f},
        12
    },
    {
        "Fuzz Factory",
        (float[]){1.0f, 0.7f, 0.5f, 0.4f, 0.5f, 0.3f, 3.0f, 0.6f, 0.5f, 2.0f, 0.0f, 0.5f},
        12
    },
    {
        "Velcro Fuzz",
        (float[]){1.0f, 0.4f, 0.8f, 0.6f, 0.4f, 0.2f, 5.0f, 0.0f, 0.3f, 2.0f, 0.0f, 0.8f},
        12
    },
    {
        "Octavia",
        (float[]){0.9f, 0.5f, 0.6f, 0.3f, 0.6f, 0.7f, 4.0f, 0.0f, 0.6f, 1.0f, 0.8f, 0.6f},
        12
    },
    {
        "Dying Battery",
        (float[]){0.7f, 0.3f, 0.8f, 0.5f, 0.4f, 0.2f, 0.0f, 0.9f, 0.4f, 2.0f, 0.0f, 0.8f},
        12
    },
    {
        "Super Fuzz",
        (float[]){1.0f, 0.6f, 0.9f, 0.2f, 0.7f, 0.5f, 6.0f, 0.0f, 0.6f, 2.0f, 0.0f, 0.9f},
        12
    }
};

} // namespace DSP
