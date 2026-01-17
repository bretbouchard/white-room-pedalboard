/*
  ==============================================================================

    OverdrivePedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Enhanced overdrive pedal with circuit modes and advanced controls

  ==============================================================================
*/

#pragma once

#include "GuitarPedalPureDSP.h"

namespace DSP {

//==============================================================================
/**
 * Enhanced Overdrive Pedal
 *
 * Emulates classic tube overdrive pedals with advanced circuit modeling:
 * - Circuit selector (8 different clipping modes)
 * - Presence control (3-5kHz boost)
 * - Bite control (4-8kHz harmonics)
 * - Tight/Loose switch (dynamic response)
 * - Bright Cap toggle (high-pass before clipping)
 * - Midrange Focus control (800Hz-2kHz peaking EQ)
 *
 * Circuit Types:
 * - Standard: Asymmetric soft clipping (default)
 * - Symmetrical: Symmetrical soft clipping
 * - HardClip: Adds hard clipping stage
 * - DiodeClipping: Silicon vs Germanium diodes
 * - LEDClipping: LED clipping (brighter)
 * - TubeScreamer: Classic TS style
 * - BluesBreaker: Transparent overdrive
 * - FullBodiedFat: Thick, mid-focused
 */
class OverdrivePedalPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    OverdrivePedalPureDSP();
    ~OverdrivePedalPureDSP() override = default;

    //==============================================================================
    // GuitarPedalPureDSP implementation
    //==============================================================================

    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** inputs, float** outputs, int numChannels, int numSamples) override;

    const char* getName() const override { return "Enhanced Overdrive"; }
    PedalCategory getCategory() const override { return PedalCategory::Distortion; }

    //==============================================================================
    // Circuit Types
    //==============================================================================

    enum class CircuitType
    {
        Standard,           // Current asymmetric clipping
        Symmetrical,        // Symmetrical soft clipping
        HardClip,          // Add hard clipping stage
        DiodeClipping,     // Silicon vs Germanium diodes
        LEDClipping,       // LED clipping (brighter)
        TubeScreamer,      // Classic TS style
        BluesBreaker,      // Transparent overdrive
        FullBodiedFat      // Thick, mid-focused
    };

    //==============================================================================
    // Parameters
    //==============================================================================

    static constexpr int NUM_PARAMETERS = 12;

    enum ParameterIndex
    {
        // Core controls
        Drive = 0,
        Tone,
        Bass,
        Mid,
        Treble,
        Level,

        // Advanced controls
        Circuit,           // Circuit type selector
        Presence,          // 3-5kHz high-mid boost
        Bite,              // 4-8kHz high-frequency grit
        TightLoose,        // Dynamic response (0=Tight, 1=Loose)
        BrightCap,         // High-pass before clipping
        MidFocus           // 800Hz-2kHz peaking EQ
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
    // DSP Circuits
    //==============================================================================

    /**
     * Soft clipping circuit using asymmetric clipping
     * Creates warm tube-like saturation
     */
    float processSoftClip(float input);

    /**
     * Circuit-specific clipping based on selected circuit type
     */
    float processCircuitClipping(float input);

    /**
     * Tone stack based on classic pedal EQ circuits
     * Three-band EQ with interactive mid control
     */
    float processToneStack(float input);

    /**
     * Presence control (3-5kHz high-mid boost)
     * Adds "cut-through" quality - Marshall-style presence
     */
    float processPresence(float input);

    /**
     * Bite control (4-8kHz high-frequency grit)
     * Adds harmonics for aggressive overdrive
     */
    float processBite(float input);

    /**
     * Bright cap high-pass filter
     * Creates "bright" vs "dark" clipping
     */
    float processBrightCap(float input);

    /**
     * Midrange focus peaking EQ
     * Creates "pushed mids" (Marshall style)
     */
    float processMidFocus(float input);

    /**
     * Dynamic response control
     * Tight: Faster response, more controlled
     * Loose: More sag, bloom, compression
     */
    float processDynamicResponse(float input);

    //==============================================================================
    // Parameter Structure
    //==============================================================================

    struct Parameters
    {
        // Core controls
        float drive = 0.5f;      // 0-1, drive amount
        float tone = 0.5f;       // 0-1, overall tone tilt
        float bass = 0.5f;       // 0-1, bass boost/cut
        float mid = 0.5f;        // 0-1, mid boost/cut
        float treble = 0.5f;     // 0-1, treble boost/cut
        float level = 0.7f;      // 0-1, output level

        // Advanced controls
        int circuit = static_cast<int>(CircuitType::Standard);  // Circuit type
        float presence = 0.0f;    // 0-1, 3-5kHz boost
        float bite = 0.0f;        // 0-1, 4-8kHz grit
        float tightLoose = 0.0f;  // 0-1, 0=Tight, 1=Loose
        float brightCap = 0.0f;   // 0-1, high-pass before clipping
        float midFocus = 0.5f;    // 0-1, 800Hz-2kHz peaking EQ
    } params_;

    //==============================================================================
    // DSP State
    //==============================================================================

    // Tone state variables
    float bassState_ = 0.0f;
    float midState_ = 0.0f;
    float trebleState_ = 0.0f;
    float presenceState_ = 0.0f;
    float biteState_ = 0.0f;
    float brightCapState_ = 0.0f;
    float midFocusState_ = 0.0f;

    // Clipper state
    float clipperState_ = 0.0f;

    // Dynamic response state
    float envelopeState_ = 0.0f;
    float compressionState_ = 0.0f;
};

//==============================================================================
// Factory Presets
//==============================================================================

static constexpr OverdrivePedalPureDSP::Preset OVERDRIVE_PRESETS[OverdrivePedalPureDSP::NUM_PRESETS] =
{
    {
        "Clean Boost",
        (float[]){0.2f, 0.6f, 0.5f, 0.5f, 0.6f, 0.7f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.5f},
        12
    },
    {
        "Crunch",
        (float[]){0.5f, 0.5f, 0.6f, 0.5f, 0.5f, 0.7f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.5f},
        12
    },
    {
        "Tube Screamer",
        (float[]){0.8f, 0.5f, 0.5f, 0.6f, 0.5f, 0.7f, 5.0f, 0.3f, 0.0f, 0.0f, 0.0f, 0.5f},
        12
    },
    {
        "Blues Breaker",
        (float[]){0.6f, 0.6f, 0.7f, 0.5f, 0.6f, 0.6f, 6.0f, 0.2f, 0.0f, 0.0f, 0.0f, 0.6f},
        12
    },
    {
        "Modern High Gain",
        (float[]){0.9f, 0.4f, 0.8f, 0.5f, 0.7f, 0.6f, 3.0f, 0.6f, 0.5f, 0.0f, 0.8f, 0.5f},
        12
    },
    {
        "Saggy Bloom",
        (float[]){0.7f, 0.5f, 0.6f, 0.5f, 0.5f, 0.7f, 0.0f, 0.3f, 0.2f, 1.0f, 0.0f, 0.6f},
        12
    },
    {
        "Mid Push",
        (float[]){0.7f, 0.4f, 0.5f, 0.7f, 0.5f, 0.7f, 5.0f, 0.4f, 0.3f, 0.0f, 0.0f, 0.8f},
        12
    },
    {
        "Full Bodied Fat",
        (float[]){0.8f, 0.5f, 0.8f, 0.8f, 0.6f, 0.7f, 7.0f, 0.5f, 0.3f, 0.3f, 0.0f, 0.7f},
        12
    }
};

} // namespace DSP
