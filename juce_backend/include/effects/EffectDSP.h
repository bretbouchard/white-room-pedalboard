/*
  ==============================================================================

    EffectDSP.h
    Created: December 30, 2025
    Author: Bret Bouchard

    Base interface for audio effect processors

  ==============================================================================
*/

#ifndef EFFECT_DSP_H_INCLUDED
#define EFFECT_DSP_H_INCLUDED

#include <cstdint>
#include <string>

namespace Effects {

/**
 * @brief Audio effect processor base interface
 *
 * All audio effects (reverb, delay, EQ, compression, etc.) inherit
 * from this interface.
 *
 * Design constraints:
 * - Real-time safe: No allocations during process()
 * - Deterministic: Same input = same output
 * - Bypassable: Can be disabled without affecting audio
 * - Pure DSP: No UI coupling
 */
class EffectDSP {
public:
    virtual ~EffectDSP() = default;

    //==========================================================================
    // Initialization
    //==========================================================================

    /**
     * @brief Prepare effect for processing
     *
     * Called once before processing begins.
     *
     * @param sampleRate Sample rate in Hz
     * @param blockSize Block size in samples
     */
    virtual void prepare(double sampleRate, int blockSize) = 0;

    /**
     * @brief Reset effect state
     *
     * Clears all filters, delay lines, and internal state.
     * Called when playback stops or parameters change significantly.
     */
    virtual void reset() = 0;

    //==========================================================================
    // Audio Processing
    //==========================================================================

    /**
     * @brief Process audio through effect
     *
     * If bypassed, input is copied to output unchanged.
     *
     * @param inputs Input buffers [numChannels][numSamples]
     * @param outputs Output buffers [numChannels][numSamples]
     * @param numChannels Number of channels (1 = mono, 2 = stereo)
     * @param numSamples Number of samples to process
     *
     * Thread safety: Called from audio thread only.
     * Must not allocate memory.
     */
    virtual void process(float** inputs, float** outputs,
                        int numChannels, int numSamples) = 0;

    //==========================================================================
    // Bypass
    //==========================================================================

    /**
     * @brief Set bypass state
     *
     * When bypassed, effect passes input through unchanged.
     * Transition should be smooth (no clicks/pops).
     *
     * @param bypass true to bypass effect
     */
    virtual void setBypass(bool bypass) = 0;

    /**
     * @brief Get bypass state
     *
     * @return true if effect is bypassed
     */
    virtual bool isBypassed() const = 0;

    //==========================================================================
    // Mix (Wet/Dry)
    //==========================================================================

    /**
     * @brief Set wet/dry mix
     *
     * 0.0 = fully dry (input only)
     * 0.5 = equal wet/dry
     * 1.0 = fully wet (effect only)
     *
     * @param wetLevel Wet amount (0.0 to 1.0)
     */
    virtual void setMix(double wetLevel) = 0;

    /**
     * @brief Get wet/dry mix
     *
     * @return Wet level (0.0 to 1.0)
     */
    virtual double getMix() const = 0;

    //==========================================================================
    // Parameters
    //==========================================================================

    /**
     * @brief Set parameter value
     *
     * Parameters are effect-specific. Common parameters:
     * - 0-3: Frequency, resonance, amount, etc.
     *
     * @param paramId Parameter ID
     * @param value Parameter value (effect-specific range)
     * @return true if parameter set, false if ID invalid
     */
    virtual bool setParameter(int paramId, double value) = 0;

    /**
     * @brief Get parameter value
     *
     * @param paramId Parameter ID
     * @return Parameter value, or 0.0 if ID invalid
     */
    virtual double getParameter(int paramId) const = 0;

    /**
     * @brief Get parameter name
     *
     * @param paramId Parameter ID
     * @return Parameter name, or "Unknown" if ID invalid
     */
    virtual std::string getParameterName(int paramId) const = 0;

    /**
     * @brief Get number of parameters
     */
    virtual int getParameterCount() const = 0;

    //==========================================================================
    // Presets
    //==========================================================================

    /**
     * @brief Save current settings as preset
     *
     * Saves all parameter values to file.
     *
     * @param path File path to save preset
     * @return true if saved successfully
     */
    virtual bool savePreset(const char* path) = 0;

    /**
     * @brief Load preset from file
     *
     * Loads all parameter values from file.
     *
     * @param path File path to load preset from
     * @return true if loaded successfully
     */
    virtual bool loadPreset(const char* path) = 0;

    //==========================================================================
    // Information
    //==========================================================================

    /**
     * @brief Get effect name
     *
     * @return Effect name (e.g., "Reverb", "Delay")
     */
    virtual std::string getEffectName() const = 0;

    /**
     * @brief Get effect type
     *
     * @return Effect type (e.g., "Reverb", "Delay", "EQ", "Compressor")
     */
    virtual std::string getEffectType() const = 0;

    /**
     * @brief Get effect version
     *
     * @return Version string (e.g., "1.0.0")
     */
    virtual std::string getVersion() const = 0;
};

} // namespace Effects

#endif // EFFECT_DSP_H_INCLUDED
