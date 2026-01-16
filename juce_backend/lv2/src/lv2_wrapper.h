/*
  ==============================================================================

    LV2 Wrapper Template
    Generic LV2 wrapper for pure DSP effects

    This template wraps any DSP class that implements:
    - prepare(double sampleRate, int blockSize)
    - process(float** inputs, float** outputs, int numChannels, int numSamples)
    - setParameter(uint32_t id, float value)
    - reset()

  ==============================================================================
*/

#pragma once

#include "lv2_api.h"
#include <cstring>
#include <cstdlib>
#include <vector>

//==============================================================================
// LV2 Plugin Instance Wrapper
//==============================================================================

template <typename DSPType>
class LV2PluginWrapper {
public:
    //==========================================================================
    // LV2 Required Callbacks
    //==========================================================================

    static LV2_Handle instantiate(const LV2_Descriptor* descriptor,
                                 double sample_rate,
                                 const char* bundle_path,
                                 const LV2_Feature* const* features) {
        auto* plugin = new LV2PluginWrapper<DSPType>(sample_rate);
        return static_cast<LV2_Handle>(plugin);
    }

    static void cleanup(LV2_Handle instance) {
        delete static_cast<LV2PluginWrapper<DSPType>*>(instance);
    }

    static void connect_port(LV2_Handle instance,
                           uint32_t port,
                           void* data_location) {
        auto* plugin = static_cast<LV2PluginWrapper<DSPType>*>(instance);
        plugin->connectPort(port, data_location);
    }

    static void activate(LV2_Handle instance) {
        auto* plugin = static_cast<LV2PluginWrapper<DSPType>*>(instance);
        plugin->activate();
    }

    static void run(LV2_Handle instance, uint32_t sample_count) {
        auto* plugin = static_cast<LV2PluginWrapper<DSPType>*>(instance);
        plugin->run(sample_count);
    }

    static void deactivate(LV2_Handle instance) {
        auto* plugin = static_cast<LV2PluginWrapper<DSPType>*>(instance);
        plugin->deactivate();
    }

    static const void* extension_data(const char* uri) {
        return nullptr; // No extensions by default
    }

    //==========================================================================
    // Plugin Instance
    //==========================================================================

    LV2PluginWrapper(double sample_rate)
        : sampleRate_(sample_rate)
        , isActive_(false)
        , dsp_(new DSPType()) {

        // Prepare DSP
        dsp_->prepare(sample_rate_, 4096);
    }

    ~LV2PluginWrapper() {
        delete dsp_;
    }

    //==========================================================================
    // Port Management
    //==========================================================================

    void connectPort(uint32_t port, void* data_location) {
        if (port < portBuffers_.size()) {
            portBuffers_[port] = static_cast<float*>(data_location);
        }
    }

    //==========================================================================
    // Activation/Deactivation
    //==========================================================================

    void activate() {
        if (!isActive_) {
            dsp_->reset();
            isActive_ = true;
        }
    }

    void deactivate() {
        isActive_ = false;
    }

    //==========================================================================
    // Processing
    //==========================================================================

    void run(uint32_t sample_count) {
        if (!isActive_ || sample_count == 0) {
            return;
        }

        // Update parameters from control ports
        updateParameters();

        // Prepare audio buffers
        float* inputs[2];
        float* outputs[2];

        inputs[0] = portBuffers_[0];   // Audio In L
        inputs[1] = portBuffers_[1];   // Audio In R
        outputs[0] = portBuffers_[2];  // Audio Out L
        outputs[1] = portBuffers_[3];  // Audio Out R

        // Process
        dsp_->process(inputs, outputs, 2, static_cast<int>(sample_count));
    }

    //==========================================================================
    // Parameter Management
    //==========================================================================

    void updateParameters() {
        // Map LV2 control ports to DSP parameters
        // Control ports start after audio ports (index >= 4)
        for (uint32_t i = 0; i < getParameterCount(); ++i) {
            uint32_t port_index = 4 + i;  // Skip 4 audio ports
            if (port_index < portBuffers_.size() && portBuffers_[port_index] != nullptr) {
                float value = *portBuffers_[port_index];
                dsp_->setParameter(i, value);
            }
        }
    }

    static uint32_t getParameterCount() {
        return DSPType::getParameterCount();
    }

    static const char* getParameterName(uint32_t index) {
        return DSPType::getParameterName(index);
    }

    static float getParameterDefault(uint32_t index) {
        return DSPType::getParameterDefault(index);
    }

    static float getParameterMin(uint32_t index) {
        return DSPType::getParameterMin(index);
    }

    static float getParameterMax(uint32_t index) {
        return DSPType::getParameterMax(index);
    }

private:
    //==========================================================================
    // Member Variables
    //==========================================================================

    double sampleRate_;
    bool isActive_;
    DSPType* dsp_;

    // Port buffers (audio + control)
    std::vector<float*> portBuffers_;

    //==========================================================================
    // Static Port Configuration
    //==========================================================================

public:
    // Port layout:
    // 0: Audio In L
    // 1: Audio In R
    // 2: Audio Out L
    // 3: Audio Out R
    // 4+: Control ports
    enum {
        PORT_AUDIO_IN_L = 0,
        PORT_AUDIO_IN_R = 1,
        PORT_AUDIO_OUT_L = 2,
        PORT_AUDIO_OUT_R = 3,
        PORT_CONTROL_BASE = 4
    }

    static uint32_t getPortCount() {
        return 4 + getParameterCount();  // 4 audio + N control
    }

    static bool isAudioPort(uint32_t port) {
        return port < 4;
    }

    static bool isInputPort(uint32_t port) {
        return port < 2;  // Only audio inputs
    }

    static const char* getPortSymbol(uint32_t port) {
        switch (port) {
            case 0: return "in_l";
            case 1: return "in_r";
            case 2: return "out_l";
            case 3: return "out_r";
            default: return getParameterSymbol(port - 4);
        }
    }

    static const char* getPortName(uint32_t port) {
        switch (port) {
            case 0: return "Input L";
            case 1: return "Input R";
            case 2: return "Output L";
            case 3: return "Output R";
            default: return getParameterName(port - 4);
        }
    }

    static const char* getParameterSymbol(uint32_t index) {
        return DSPType::getParameterSymbol(index);
    }
};

//==============================================================================
// LV2 Descriptor Generator
//==============================================================================

template <typename DSPType, const char* URI>
struct LV2DescriptorBuilder {
    static const LV2_Descriptor descriptor;

    static const LV2_Descriptor* get(uint32_t index) {
        return (index == 0) ? &descriptor : nullptr;
    }
};

// Initialize static descriptor
template <typename DSPType, const char* URI>
const LV2_Descriptor LV2DescriptorBuilder<DSPType, URI>::descriptor = {
    URI,
    &LV2PluginWrapper<DSPType>::instantiate,
    &LV2PluginWrapper<DSPType>::cleanup,
    &LV2PluginWrapper<DSPType>::connect_port,
    &LV2PluginWrapper<DSPType>::activate,
    &LV2PluginWrapper<DSPType>::run,
    &LV2PluginWrapper<DSPType>::deactivate,
    &LV2PluginWrapper<DSPType>::extension_data
};
