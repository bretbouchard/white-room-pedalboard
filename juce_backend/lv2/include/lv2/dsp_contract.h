/*
  ==============================================================================

    LV2 DSP Contract
    Required interface for DSP effects to be wrapped in LV2 plugins

    This contract defines the minimal interface required for any DSP class
    to be wrapped by the LV2 wrapper template.

  ==============================================================================
*/

#pragma once

#include <cstdint>

//==============================================================================
// LV2 DSP Contract Interface
//==============================================================================

namespace LV2Contract {

//==============================================================================
// Parameter Metadata
//==============================================================================

struct ParameterInfo {
    const char* name;      // Human-readable parameter name
    const char* symbol;    // LV2 port symbol (must be valid C identifier)
    float default_value;   // Default value
    float min_value;       // Minimum value
    float max_value;       // Maximum value
    bool is_integer;       // True if parameter is integer/enum
    bool is_logarithmic;   // True if scale is logarithmic
};

//==============================================================================
// DSP Contract Interface
//==============================================================================

class DSPInstance {
public:
    virtual ~DSPInstance() = default;

    //==========================================================================
    // Lifecycle
    //==========================================================================

    /**
     * Prepare DSP for processing at given sample rate and block size.
     * Called once before processing begins.
     *
     * @param sampleRate Sample rate in Hz
     * @param blockSize Maximum block size in samples
     * @return true if preparation successful, false otherwise
     */
    virtual bool prepare(double sampleRate, int blockSize) = 0;

    /**
     * Reset DSP state to initial conditions.
     * Called when playback stops or seeking occurs.
     */
    virtual void reset() = 0;

    //==========================================================================
    // Processing
    //==========================================================================

    /**
     * Process a block of audio samples.
     * Must be real-time safe (no dynamic memory allocation, no blocking calls).
     *
     * @param inputs Array of input channel buffers (float**)
     * @param outputs Array of output channel buffers (float**)
     * @param numChannels Number of audio channels (typically 2 for stereo)
     * @param numSamples Number of samples in this block
     */
    virtual void process(float** inputs,
                        float** outputs,
                        int numChannels,
                        int numSamples) = 0;

    //==========================================================================
    // Parameters
    //==========================================================================

    /**
     * Set a parameter value by ID.
     * Must be real-time safe (no allocation, no blocking).
     *
     * @param id Parameter ID (0-based index)
     * @param value New parameter value
     */
    virtual void setParameter(uint32_t id, float value) = 0;

    /**
     * Get current parameter value by ID.
     * Optional but recommended for UI/state serialization.
     *
     * @param id Parameter ID (0-based index)
     * @return Current parameter value
     */
    virtual float getParameter(uint32_t id) const = 0;

    //==========================================================================
    // Metadata
    //==========================================================================

    /**
     * Get total number of parameters.
     * Must be constant for plugin lifetime.
     *
     * @return Number of parameters
     */
    virtual uint32_t getParameterCount() const = 0;

    /**
     * Get parameter name by ID.
     * Must return valid string for all valid IDs.
     *
     * @param id Parameter ID
     * @return Human-readable parameter name
     */
    virtual const char* getParameterName(uint32_t id) const = 0;

    /**
     * Get parameter symbol by ID.
     * Must be valid C identifier (used for LV2 port symbol).
     *
     * @param id Parameter ID
     * @return Parameter symbol (e.g., "frequency", "resonance")
     */
    virtual const char* getParameterSymbol(uint32_t id) const = 0;

    /**
     * Get parameter default value.
     *
     * @param id Parameter ID
     * @return Default value
     */
    virtual float getParameterDefault(uint32_t id) const = 0;

    /**
     * Get parameter minimum value.
     *
     * @param id Parameter ID
     * @return Minimum value
     */
    virtual float getParameterMin(uint32_t id) const = 0;

    /**
     * Get parameter maximum value.
     *
     * @param id Parameter ID
     * @return Maximum value
     */
    virtual float getParameterMax(uint32_t id) const = 0;

    //==========================================================================
    // Plugin Metadata
    //==========================================================================

    /**
     * Get plugin name.
     *
     * @return Plugin name (e.g., "FilterGate")
     */
    virtual const char* getName() const = 0;

    /**
     * Get plugin creator/manufacturer.
     *
     * @return Creator name (e.g., "Schillinger Ecosystem")
     */
    virtual const char* getCreator() const = 0;

    /**
     * Get plugin version.
     *
     * @return Version string (e.g., "1.0.0")
     */
    virtual const char* getVersion() const = 0;
};

//==============================================================================
// Static Metadata Interface (for compile-time registration)
//==============================================================================

template <typename DSPType>
class DSPMetadata {
public:
    static uint32_t getParameterCount() {
        return DSPType::getParameterCount();
    }

    static const char* getParameterName(uint32_t id) {
        return DSPType::getParameterName(id);
    }

    static const char* getParameterSymbol(uint32_t id) {
        return DSPType::getParameterSymbol(id);
    }

    static float getParameterDefault(uint32_t id) {
        return DSPType::getParameterDefault(id);
    }

    static float getParameterMin(uint32_t id) {
        return DSPType::getParameterMin(id);
    }

    static float getParameterMax(uint32_t id) {
        return DSPType::getParameterMax(id);
    }

    static const char* getName() {
        return DSPType::getName();
    }

    static const char* getCreator() {
        return DSPType::getCreator();
    }

    static const char* getVersion() {
        return DSPType::getVersion();
    }
};

//==============================================================================
// Adapter Helper for Existing DSP Classes
//==============================================================================

/**
 * Use this adapter to make existing DSP classes conform to LV2 contract.
 *
 * Example:
 * ```cpp
 * // Existing DSP class (doesn't implement full contract)
 * class MyDSP {
 * public:
 *     void prepare(double sr, int bs);
 *     void process(float** in, float** out, int ch, int samples);
 *     void setFrequency(float freq);
 *     // ... but no parameter metadata methods
 * };
 *
 * // Create adapter
 * using MyDSP_LV2 = LV2Adapter<MyDSP,
 *     MyDSPParams,  // Parameter definitions
 *     5>;           // Number of parameters
 * ```
 */

template <typename DSPType, typename ParamDefs, int NumParams>
class LV2Adapter : public DSPInstance {
public:
    LV2Adapter() : dsp_(new DSPType()) {
        // Initialize parameter defaults
        for (uint32_t i = 0; i < NumParams; ++i) {
            setParameter(i, ParamDefs::getDefault(i));
        }
    }

    ~LV2Adapter() override {
        delete dsp_;
    }

    // DSPInstance interface
    bool prepare(double sampleRate, int blockSize) override {
        dsp_->prepare(sampleRate, blockSize);
        return true;
    }

    void reset() override {
        dsp_->reset();
    }

    void process(float** inputs, float** outputs,
                int numChannels, int numSamples) override {
        dsp_->process(inputs, outputs, numChannels, numSamples);
    }

    void setParameter(uint32_t id, float value) override {
        if (id < NumParams) {
            ParamDefs::apply(dsp_, id, value);
        }
    }

    float getParameter(uint32_t id) const override {
        if (id < NumParams) {
            return ParamDefs::get(dsp_, id);
        }
        return 0.0f;
    }

    uint32_t getParameterCount() const override {
        return NumParams;
    }

    const char* getParameterName(uint32_t id) const override {
        return ParamDefs::getName(id);
    }

    const char* getParameterSymbol(uint32_t id) const override {
        return ParamDefs::getSymbol(id);
    }

    float getParameterDefault(uint32_t id) const override {
        return ParamDefs::getDefault(id);
    }

    float getParameterMin(uint32_t id) const override {
        return ParamDefs::getMin(id);
    }

    float getParameterMax(uint32_t id) const override {
        return ParamDefs::getMax(id);
    }

    const char* getName() const override {
        return ParamDefs::getPluginName();
    }

    const char* getCreator() const override {
        return "Schillinger Ecosystem";
    }

    const char* getVersion() const override {
        return "1.0.0";
    }

private:
    DSPType* dsp_;
};

} // namespace LV2Contract
