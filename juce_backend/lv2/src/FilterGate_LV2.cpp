/*
  ==============================================================================

    FilterGate LV2 Plugin
    LV2 wrapper for FilterGatePureDSP

  ==============================================================================
*/

#include "lv2_wrapper.h"
#include "../../../effects/filtergate/include/dsp/FilterGatePureDSP.h"
#include <cstring>

//==============================================================================
// LV2 Plugin URI
//==============================================================================

#define FILTERGATE_URI "http://schillinger ecosystem/plugins/filtergate"

//==============================================================================
// FilterGate LV2 Adapter
//==============================================================================

class FilterGateLV2Adapter {
public:
    //==========================================================================
    // DSP Interface Implementation
    //==========================================================================

    FilterGateLV2Adapter() {
        dsp_ = new DSP::FilterGatePureDSP();
    }

    ~FilterGateLV2Adapter() {
        delete dsp_;
    }

    void prepare(double sampleRate, int blockSize) {
        dsp_->prepare(sampleRate, blockSize);
    }

    void reset() {
        dsp_->reset();
    }

    void process(float** inputs, float** outputs, int numChannels, int numSamples) {
        dsp_->process(inputs, outputs, numChannels, numSamples);
    }

    void setParameter(uint32_t id, float value) {
        switch (id) {
            case 0:  // Frequency
                dsp_->setFrequency(value);
                break;
            case 1:  // Resonance
                dsp_->setResonance(value);
                break;
            case 2:  // Gain
                dsp_->setGain(value);
                break;
            case 3:  // Filter Mode
                dsp_->setFilterMode(static_cast<DSP::FilterMode>(static_cast<int>(value)));
                break;
            case 4:  // Gate Threshold
                dsp_->setGateThreshold(value);
                break;
            case 5:  // Gate Attack
                dsp_->setGateAttack(value);
                break;
            case 6:  // Gate Release
                dsp_->setGateRelease(value);
                break;
            case 7:  // Gate Range
                dsp_->setGateRange(value);
                break;
            case 8:  // Gate Trigger Mode
                dsp_->setGateTriggerMode(static_cast<DSP::GateTriggerMode>(static_cast<int>(value)));
                break;
            case 9:  // LFO Frequency
                dsp_->setLFOFrequency(value);
                break;
            case 10:  // LFO Depth
                dsp_->setLFODepth(value);
                break;
            case 11:  // LFO Waveform
                dsp_->setLFOWaveform(static_cast<DSP::LFO::Waveform>(static_cast<int>(value)));
                break;
        }
    }

    //==========================================================================
    // Parameter Metadata (Static)
    //==========================================================================

    static uint32_t getParameterCount() {
        return 12;  // Total number of parameters
    }

    static const char* getParameterName(uint32_t index) {
        switch (index) {
            case 0:  return "Frequency";
            case 1:  return "Resonance";
            case 2:  return "Gain";
            case 3:  return "Filter Mode";
            case 4:  return "Gate Threshold";
            case 5:  return "Gate Attack";
            case 6:  return "Gate Release";
            case 7:  return "Gate Range";
            case 8:  return "Gate Trigger Mode";
            case 9:  return "LFO Frequency";
            case 10: return "LFO Depth";
            case 11: return "LFO Waveform";
            default: return "Unknown";
        }
    }

    static const char* getParameterSymbol(uint32_t index) {
        switch (index) {
            case 0:  return "frequency";
            case 1:  return "resonance";
            case 2:  return "gain";
            case 3:  return "filter_mode";
            case 4:  return "gate_threshold";
            case 5:  return "gate_attack";
            case 6:  return "gate_release";
            case 7:  return "gate_range";
            case 8:  return "gate_trigger_mode";
            case 9:  return "lfo_frequency";
            case 10: return "lfo_depth";
            case 11: return "lfo_waveform";
            default: return "unknown";
        }
    }

    static float getParameterDefault(uint32_t index) {
        switch (index) {
            case 0:  return 1000.0f;     // Frequency
            case 1:  return 1.0f;        // Resonance
            case 2:  return 0.0f;        // Gain
            case 3:  return 0.0f;        // Filter Mode (LowPass)
            case 4:  return 0.5f;        // Gate Threshold
            case 5:  return 1.0f;        // Gate Attack
            case 6:  return 50.0f;       // Gate Release
            case 7:  return 24.0f;       // Gate Range
            case 8:  return 1.0f;        // Gate Trigger Mode (ADSR)
            case 9:  return 1.0f;        // LFO Frequency
            case 10: return 0.0f;        // LFO Depth
            case 11: return 0.0f;        // LFO Waveform (Sine)
            default: return 0.0f;
        }
    }

    static float getParameterMin(uint32_t index) {
        switch (index) {
            case 0:  return 20.0f;       // Frequency
            case 1:  return 0.1f;        // Resonance
            case 2:  return -24.0f;      // Gain
            case 3:  return 0.0f;        // Filter Mode
            case 4:  return 0.0f;        // Gate Threshold
            case 5:  return 0.1f;        // Gate Attack
            case 6:  return 1.0f;        // Gate Release
            case 7:  return 0.0f;        // Gate Range
            case 8:  return 0.0f;        // Gate Trigger Mode
            case 9:  return 0.01f;       // LFO Frequency
            case 10: return 0.0f;        // LFO Depth
            case 11: return 0.0f;        // LFO Waveform
            default: return 0.0f;
        }
    }

    static float getParameterMax(uint32_t index) {
        switch (index) {
            case 0:  return 20000.0f;    // Frequency
            case 1:  return 20.0f;       // Resonance
            case 2:  return 24.0f;       // Gain
            case 3:  return 7.0f;        // Filter Mode (8 modes)
            case 4:  return 1.0f;        // Gate Threshold
            case 5:  return 100.0f;      // Gate Attack
            case 6:  return 500.0f;      // Gate Release
            case 7:  return 96.0f;       // Gate Range
            case 8:  return 4.0f;        // Gate Trigger Mode (5 modes)
            case 9:  return 20.0f;       // LFO Frequency
            case 10: return 1.0f;        // LFO Depth
            case 11: return 4.0f;        // LFO Waveform (5 waveforms)
            default: return 1.0f;
        }
    }

private:
    DSP::FilterGatePureDSP* dsp_;
};

//==============================================================================
// LV2 Descriptor
//==============================================================================

static const char filtergate_uri[] = FILTERGATE_URI;

LV2_DESCRIPTOR_DECL(LV2PluginWrapper<FilterGateLV2Adapter>) {
    return (index == 0) ? &LV2DescriptorBuilder<FilterGateLV2Adapter, filtergate_uri>::descriptor : nullptr;
}
