/*
  ==============================================================================

   SympatheticStringBank.h
   Sympathetic string resonance for Aether String v2

   Simulates a bank of lightly-damped strings that resonate sympathetically
   when energy is transferred from the bridge or body.

   Use Cases:
   - "Giant halo" effect for giant instruments
   - Ethereal resonance layers
   - Harmonic cloud textures
   - Drone string ensembles

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <vector>
#include <memory>

// Forward declaration
class WaveguideString;

//==============================================================================
/**
 * Configuration for sympathetic string bank
 */
struct SympatheticStringConfig
{
    bool enabled = false;           // Enable/disable sympathetic strings
    int count = 6;                  // Number of sympathetic strings (1-16)

    //==============================================================================
    /** Tuning modes for sympathetic strings */
    enum class TuningMode
    {
        Harmonic,    // Harmonics of fundamental (octaves, fifths, thirds)
        Drone,       // Fixed drone notes (user-defined)
        Custom       // User-defined tuning
    };

    TuningMode tuning = TuningMode::Harmonic;

    //==============================================================================
    /** Drone note frequencies (used when tuning = Drone) */
    std::vector<float> droneNotes;

    /** Custom tuning (used when tuning = Custom) */
    std::vector<float> customTuning;

    //==============================================================================
    float couplingGain = 0.3f;      // Bridge → sympathetic coupling strength
    float dampingMultiplier = 1.0f; // Damping multiplier (1.0 = normal, 2.0 = half decay)
};

//==============================================================================
/**
 * Bank of sympathetic strings for resonant halo effects
 *
 * Characteristics:
 * - Not directly excited by MIDI (no note-on events)
 * - Only responds to bridge/body energy
 * - Very light damping (long sustain)
 * - Creates "giant instrument" spatial effect
 *
 * Tuning Modes:
 * - Harmonic: Octaves, fifths, thirds of played notes
 * - Drone: Fixed drone notes always resonating
 * - Custom: User-defined tuning
 */
class SympatheticStringBank
{
public:
    //==============================================================================
    SympatheticStringBank();
    ~SympatheticStringBank();

    //==============================================================================
    /** Initialize sympathetic string bank

        @param sampleRate  Audio sample rate
        @param config      Configuration (count, tuning, etc.)
    */
    void prepare(double sampleRate, const SympatheticStringConfig& config);

    /** Reset all sympathetic strings to silence */
    void reset();

    //==============================================================================
    /** Excite sympathetic strings from bridge energy

        This is the ONLY way sympathetic strings are excited (no direct MIDI)

        @param bridgeEnergy    Energy from shared bridge
    */
    void exciteFromBridge(float bridgeEnergy);

    /** Process all sympathetic strings and sum output

        @returns    Summed output from all sympathetic strings
    */
    float processSample();

    //==============================================================================
    /** Update tuning configuration

        @param config    New configuration (can change tuning mode, notes, etc.)
    */
    void setTuningMode(SympatheticStringConfig::TuningMode mode);

    /** Set coupling gain (bridge → sympathetic transfer)

        Range: 0.0 (no coupling) to 1.0 (strong coupling)
        Default: 0.3
    */
    void setCouplingGain(float gain);

    /** Set damping multiplier for all sympathetic strings

        Higher values = longer decay
        1.0 = normal damping
        2.0 = half damping rate (2x decay time)

        Range: 0.5 to 4.0
    */
    void setDampingMultiplier(float multiplier);

    //==============================================================================
    /** Get number of sympathetic strings */
    int getNumStrings() const { return static_cast<int>(sympatheticStrings.size()); }

    /** Get current configuration */
    const SympatheticStringConfig& getConfig() const { return config; }

private:
    //==============================================================================
    void initializeHarmonicTuning();
    void initializeDroneTuning();
    void initializeCustomTuning();

    //==============================================================================
    std::vector<std::unique_ptr<WaveguideString>> sympatheticStrings;
    SympatheticStringConfig config;

    double sr = 48000.0;
    float lastBridgeEnergy = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SympatheticStringBank)
};
