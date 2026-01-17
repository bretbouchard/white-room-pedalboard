/*
  ==============================================================================

    GuitarPedalPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Base class for all guitar effects pedals

  ==============================================================================
*/

#pragma once

#include <vector>
#include <string>
#include <cstring>

namespace DSP {

//==============================================================================
/**
 * Base class for all guitar effects pedals
 *
 * This provides a common interface for all pedal types:
 * - Distortion/Overdrive (Soft clipping, hard clipping, fuzz)
 * - Modulation (Chorus, phaser, flanger, tremolo)
 * - Time-based (Delay, reverb)
 * - Dynamics (Compressor, limiter, boost)
 * - Filter (Wah, EQ, filter effects)
 */
class GuitarPedalPureDSP
{
public:
    //==============================================================================
    // Pedal Categories
    //==============================================================================

    enum class PedalCategory
    {
        Distortion,     // Overdrive, distortion, fuzz
        Modulation,     // Chorus, phaser, flanger, tremolo
        TimeBased,      // Delay, echo, reverb
        Dynamics,       // Compressor, limiter, boost
        Filter,         // Wah, EQ, filter effects
        Pitch           // Pitch shifter, harmonizer
    };

    //==============================================================================
    // Parameter Structure
    //==============================================================================

    /**
     * Parameter definition for pedal controls
     */
    struct Parameter
    {
        const char* id;           // Parameter ID (e.g., "drive", "tone")
        const char* name;         // Display name
        const char* label;        // Unit label (e.g., "dB", "%")
        float minValue;           // Minimum value
        float maxValue;           // Maximum value
        float defaultValue;       // Default value
        bool isAutomatable;       // Can be automated
        float smoothTime;         // Smoothing time in seconds

        // Helper to get normalized value (0-1)
        float getNormalized(float value) const
        {
            if (maxValue > minValue)
                return (value - minValue) / (maxValue - minValue);
            return 0.0f;
        }

        // Helper to get raw value from normalized (0-1)
        float getRawValue(float normalized) const
        {
            return minValue + normalized * (maxValue - minValue);
        }
    };

    //==============================================================================
    // Preset Structure
    //==============================================================================

    /**
     * Factory preset definition
     */
    struct Preset
    {
        const char* name;
        const float* values;      // Array of parameter values
        int numValues;
    };

    //==============================================================================
    // Constructors
    //==============================================================================

    GuitarPedalPureDSP();
    virtual ~GuitarPedalPureDSP();

    //==============================================================================
    // DSP Lifecycle (Must be implemented by subclasses)
    //==============================================================================

    /**
     * Prepare the pedal for processing
     * @param sampleRate Sample rate in Hz
     * @param blockSize Maximum block size
     * @return true if successful
     */
    virtual bool prepare(double sampleRate, int blockSize) = 0;

    /**
     * Reset all DSP state
     */
    virtual void reset() = 0;

    /**
     * Process a block of audio samples
     * @param inputs Input buffers [numChannels][numSamples]
     * @param outputs Output buffers [numChannels][numSamples]
     * @param numChannels Number of channels (1=mono, 2=stereo)
     * @param numSamples Number of samples to process
     */
    virtual void process(float** inputs, float** outputs,
                        int numChannels, int numSamples) = 0;

    //==============================================================================
    // Pedal Information (Must be implemented by subclasses)
    //==============================================================================

    /**
     * Get the pedal's display name
     */
    virtual const char* getName() const = 0;

    /**
     * Get the pedal's category
     */
    virtual PedalCategory getCategory() const = 0;

    /**
     * Get the pedal's manufacturer/brand
     */
    virtual const char* getManufacturer() const { return "White Room"; }

    /**
     * Get the pedal's version
     */
    virtual const char* getVersion() const { return "1.0.0"; }

    //==============================================================================
    // Parameters (Must be implemented by subclasses)
    //==============================================================================

    /**
     * Get number of parameters
     */
    virtual int getNumParameters() const = 0;

    /**
     * Get parameter definition by index
     */
    virtual const Parameter* getParameter(int index) const = 0;

    /**
     * Get parameter value by index
     */
    virtual float getParameterValue(int index) const = 0;

    /**
     * Set parameter value by index
     */
    virtual void setParameterValue(int index, float value) = 0;

    /**
     * Get parameter value by ID
     */
    virtual float getParameter(const char* paramId) const;

    /**
     * Set parameter value by ID
     */
    virtual void setParameter(const char* paramId, float value);

    //==============================================================================
    // Presets (Optional implementation)
    //==============================================================================

    /**
     * Get number of factory presets
     */
    virtual int getNumPresets() const { return 0; }

    /**
     * Get factory preset by index
     */
    virtual const Preset* getPreset(int index) const { return nullptr; }

    /**
     * Load factory preset by index
     * @return true if successful
     */
    virtual bool loadPreset(int index);

    /**
     * Save current parameters to JSON buffer
     */
    virtual bool savePreset(char* jsonBuffer, int jsonBufferSize) const;

    /**
     * Load parameters from JSON buffer
     */
    virtual bool loadPreset(const char* jsonData);

    //==============================================================================
    // State Management
    //==============================================================================

    /**
     * Get pedal state as binary data
     */
    virtual bool getState(void* data, int& dataSize) const;

    /**
     * Set pedal state from binary data
     */
    virtual bool setState(const void* data, int dataSize);

    //==============================================================================
    // Utility Functions
    //==============================================================================

    /**
     * Get sample rate
     */
    double getSampleRate() const { return sampleRate_; }

    /**
     * Check if pedal is prepared
     */
    bool isPrepared() const { return prepared_; }

protected:
    //==============================================================================
    // Helper Functions for Subclasses
    //==============================================================================

    /**
     * Helper to write JSON parameter
     */
    bool writeJsonParameter(const char* name, double value,
                           char* buffer, int& offset, int bufferSize) const;

    /**
     * Helper to parse JSON parameter
     */
    bool parseJsonParameter(const char* json, const char* param, double& value) const;

    /**
     * Linear interpolation (smooth parameter changes)
     */
    static float lerp(float a, float b, float t)
    {
        return a + t * (b - a);
    }

    /**
     * Clamp value to range
     */
    static float clamp(float value, float min, float max)
    {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    /**
     * Soft clip using tanh
     */
    static float softClip(float x)
    {
        return std::tanh(x);
    }

    /**
     * Hard clip
     */
    static float hardClip(float x, float threshold = 1.0f)
    {
        if (x > threshold) return threshold;
        if (x < -threshold) return -threshold;
        return x;
    }

    //==============================================================================
    // Member Variables
    //==============================================================================

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;
    bool prepared_ = false;
};

//==============================================================================
// Macro to help define pedal parameters
//==============================================================================

#define DECLARE_PEDAL_PARAMETER(id, name, label, min, max, def, automatable, smooth) \
    {id, name, label, min, max, def, automatable, smooth}

//==============================================================================
// Common parameter definitions for reuse
//==============================================================================

// NOTE: Common parameter definitions commented out due to scope issues
// Each pedal defines its own parameters locally
// namespace CommonParameters {
//     // Drive/gain, Tone/EQ, Level/mix, Time-based, Modulation parameters...
// }

} // namespace DSP
