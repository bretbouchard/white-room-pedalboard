/*
  ==============================================================================

    LookupTables.h
    Created: January 9, 2026
    Author: Bret Bouchard

    Universal lookup tables for all Schillinger instruments
    Inspired by Mutable Instruments' performance optimization strategies
    - Pre-computes expensive mathematical operations
    - Thread-safe singleton pattern (C++11 static local initialization)
    - Lock-free read access for maximum performance
    - Linear interpolation for smooth values between table entries
    - <0.1% error with 2-10x performance improvement

  ==============================================================================
*/

#ifndef LOOKUPTABLES_H_INCLUDED
#define LOOKUPTABLES_H_INCLUDED

#include <vector>
#include <cmath>
#include <algorithm>

namespace SchillingerEcosystem {
namespace DSP {

/**
 * @brief Universal lookup tables for DSP operations
 *
 * Singleton pattern ensures one copy shared across all instruments.
 * Thread-safe initialization via C++11 static local initialization.
 * Lock-free read access: tables are read-only after construction.
 *
 * Table sizes:
 * - Sine: 1024 entries (one full cycle)
 * - Exponential decay: 1024 entries (1.0 -> 0.0)
 * - MIDI to frequency: 128 entries (standard MIDI range)
 * - Resonance Q: 1024 entries (frequency-dependent damping)
 * - Logarithmic sweep: 1024 entries (20Hz -> 20kHz)
 */
class LookupTables {
public:
    //==============================================================================
    // Singleton access
    //==============================================================================

    /**
     * @brief Get the singleton instance
     * @return Reference to the singleton LookupTables instance
     */
    static LookupTables& getInstance();

    // Delete copy and move operations
    LookupTables(const LookupTables&) = delete;
    LookupTables& operator=(const LookupTables&) = delete;
    LookupTables(LookupTables&&) = delete;
    LookupTables& operator=(LookupTables&&) = delete;

    //==============================================================================
    // Sine table
    //==============================================================================

    /**
     * @brief Get sine value with linear interpolation
     * @param phase Phase in radians [0, 2π]
     * @return sin(phase) approximation
     */
    float sine(float phase) const;

    /**
     * @brief Get cosine value (sine with phase offset)
     * @param phase Phase in radians [0, 2π]
     * @return cos(phase) approximation
     */
    float cosine(float phase) const;

    //==============================================================================
    // Exponential decay tables
    //==============================================================================

    /**
     * @brief Get exponential decay value
     * @param index Normalized index [0, 1]
     * @return Exponential decay value (1.0 -> 0.0)
     */
    float expDecay(float index) const;

    /**
     * @brief Get RC-curve decay value (natural material damping)
     * @param index Normalized index [0, 1]
     * @return RC decay value (1.0 -> 0.0)
     */
    float rcDecay(float index) const;

    /**
     * @brief Get linear decay value
     * @param index Normalized index [0, 1]
     * @return Linear decay value (1.0 -> 0.0)
     */
    float linearDecay(float index) const;

    //==============================================================================
    // Frequency conversion
    //==============================================================================

    /**
     * @brief Convert MIDI note to frequency
     * @param midiNote MIDI note number (0-127)
     * @return Frequency in Hz
     */
    float midiToFreq(float midiNote) const;

    /**
     * @brief Convert MIDI note with pitch bend to frequency
     * @param midiNote MIDI note number (0-127)
     * @param pitchBendSemitones Pitch bend in semitones
     * @return Frequency in Hz
     */
    float midiToFreqWithBend(float midiNote, float pitchBendSemitones) const;

    /**
     * @brief Convert detune in cents to frequency ratio
     * @param detuneCents Detune in cents
     * @return Frequency ratio multiplier
     */
    float detuneToRatio(float detuneCents) const;

    //==============================================================================
    // Resonance Q (for Giant instruments)
    //==============================================================================

    /**
     * @brief Get resonance Q factor for physical modeling
     * @param normalizedFreq Normalized frequency [0, 1]
     * @param damping Damping coefficient [0, 1]
     * @return Q factor for resonance
     */
    float resonQ(float normalizedFreq, float damping) const;

    //==============================================================================
    // Logarithmic sweep
    //==============================================================================

    /**
     * @brief Get value from logarithmic frequency sweep
     * @param index Normalized index [0, 1]
     * @return Frequency in Hz (20Hz -> 20kHz)
     */
    float logSweep(float index) const;

    /**
     * @brief Get value from logarithmic frequency sweep with custom range
     * @param index Normalized index [0, 1]
     * @param minFreq Minimum frequency in Hz
     * @param maxFreq Maximum frequency in Hz
     * @return Frequency in Hz
     */
    float logSweepRange(float index, float minFreq, float maxFreq) const;

    //==============================================================================
    // Utility functions
    //==============================================================================

    /**
     * @brief Linear interpolation between two values
     * @param a Lower value
     * @param b Upper value
     * @param t Interpolation factor [0, 1]
     * @return Interpolated value
     */
    static float lerp(float a, float b, float t);

    /**
     * @brief Wrap phase to [0, 2π]
     * @param phase Input phase in radians
     * @return Wrapped phase in [0, 2π]
     */
    static float wrapPhase(float phase);

    /**
     * @brief Wrap phase to [0, 1]
     * @param phase Input phase normalized
     * @return Wrapped phase in [0, 1]
     */
    static float wrapPhase01(float phase);

private:
    //==============================================================================
    // Constructor - initializes all tables
    //==============================================================================
    LookupTables();

    //==============================================================================
    // Table initialization helpers
    //==============================================================================
    void initSineTable();
    void initExpDecayTable();
    void initRCDecayTable();
    void initLinearDecayTable();
    void initMidiToFreqTable();
    void initResonQTable();
    void initLogSweepTable();

    //==============================================================================
    // Table storage
    //==============================================================================
    std::vector<float> sineTable_;
    std::vector<float> expDecayTable_;
    std::vector<float> rcDecayTable_;
    std::vector<float> linearDecayTable_;
    std::vector<float> midiToFreqTable_;
    std::vector<std::vector<float>> resonQTable_;  // 2D table: [damping][freq]
    std::vector<float> logSweepTable_;

    //==============================================================================
    // Constants
    //==============================================================================
    static constexpr int TABLE_SIZE = 1024;
    static constexpr int MIDI_TABLE_SIZE = 128;
    static constexpr int RESON_DAMPING_STEPS = 32;
    static constexpr float TWO_PI = 2.0f * M_PI;
};

//==============================================================================
// Convenience functions for direct access
//==============================================================================

/**
 * @brief Quick sine lookup (passes to singleton)
 */
inline float fastSineLookup(float phase)
{
    return LookupTables::getInstance().sine(phase);
}

/**
 * @brief Quick cosine lookup (passes to singleton)
 */
inline float fastCosineLookup(float phase)
{
    return LookupTables::getInstance().cosine(phase);
}

/**
 * @brief Quick MIDI to frequency conversion
 */
inline float fastMidiToFreq(float midiNote)
{
    return LookupTables::getInstance().midiToFreq(midiNote);
}

/**
 * @brief Quick exponential decay lookup
 */
inline float fastExpDecay(float index)
{
    return LookupTables::getInstance().expDecay(index);
}

} // namespace DSP
} // namespace SchillingerEcosystem

#endif // LOOKUPTABLES_H_INCLUDED
