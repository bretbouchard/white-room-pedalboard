/*
  ==============================================================================

    LV2 API Wrapper
    Minimal LV2 API definitions for JUCE DSP effects
    Based on LV2 Specification v1.18.0

  ==============================================================================
*/

#pragma once

// LV2 Feature URIs
#define LV2_URI_MAP_URI       "http://lv2plug.in/ns/ext/uri-map"
#define LV2_URID_URI          "http://lv2plug.in/ns/ext/urid"
#define LV2_OPTIONS_URI       "http://lv2plug.in/ns/ext/options"
#define LV2_WORKER_URI        "http://lv2plug.in/ns/ext/worker#schedule"
#define LV2_LOG_LOG_URI       "http://lv2plug.in/ns/ext/log#log"
#define LV2_STATE_URI         "http://lv2plug.in/ns/ext/state"

// LV2 Port Properties
#define LV2_CORE__Port         "http://lv2plug.in/ns/lv2core#Port"
#define LV2_CORE__InputPort    "http://lv2plug.in/ns/lv2core#InputPort"
#define LV2_CORE__OutputPort   "http://lv2plug.in/ns/lv2core#OutputPort"
#define LV2_CORE__ControlPort  "http://lv2plug.in/ns/lv2core#ControlPort"
#define LV2_CORE__AudioPort    "http://lv2plug.in/ns/lv2core#AudioPort"

#ifdef __cplusplus
extern "C" {
#endif

//==============================================================================
// LV2 Handle
//==============================================================================

typedef void* LV2_Handle;

//==============================================================================
// LV2 Feature
//==============================================================================

typedef struct _LV2_Feature {
    const char* URI;
    void* data;
} LV2_Feature;

//==============================================================================
// LV2 Port Descriptor
//==============================================================================

typedef struct _LV2_Port {
    uint32_t index;
    const char* symbol;
    const char* name;
    const char* designation;
    const LV2_Feature** features;

    // Port properties
    int is_input;
    int is_audio;
    int is_control;
    int is_output;

    // Control port ranges
    float default_value;
    float minimum;
    float maximum;
} LV2_Port;

//==============================================================================
// LV2 Descriptor
//==============================================================================

typedef struct _LV2_Descriptor {
    const char* URI;

    LV2_Handle (*instantiate)(const struct _LV2_Descriptor* descriptor,
                             double sample_rate,
                             const char* bundle_path,
                             const LV2_Feature* const* features);

    void (*cleanup)(LV2_Handle instance);

    void (*connect_port)(LV2_Handle instance,
                        uint32_t port,
                        void* data_location);

    void (*activate)(LV2_Handle instance);

    void (*run)(LV2_Handle instance, uint32_t sample_count);

    void (*deactivate)(LV2_Handle instance);

    const void* (*extension_data)(const char* uri);
} LV2_Descriptor;

//==============================================================================
// LV2 Plugin State
//==============================================================================

typedef struct _LV2_State_Status {
    uint32_t success;
    uint32_t err_unknown;
    uint32_t err_bad_type;
    uint32_t err_bad_arg;
    uint32_t err_failed;
} LV2_State_Status;

//==============================================================================
// LV2 DSP Interface (Our abstraction layer)
//==============================================================================

typedef struct _LV2DSP_Interface {
    // Required: Clean up instance
    void (*destroy)(void* instance);

    // Required: Process audio
    void (*process)(void* instance,
                   float** inputs,
                   float** outputs,
                   int num_channels,
                   int num_samples);

    // Required: Set parameter by index
    void (*set_parameter)(void* instance, uint32_t index, float value);

    // Optional: Get parameter by index
    float (*get_parameter)(void* instance, uint32_t index);

    // Optional: Get plugin info
    const char* (*get_name)(void* instance);
    const char* (*get_version)(void* instance);

    // Optional: Prepare for processing
    void (*prepare)(void* instance, double sample_rate, int block_size);

    // Optional: Reset state
    void (*reset)(void* instance);
} LV2DSP_Interface;

//==============================================================================
// LV2 Utility Functions
//==============================================================================

// Map URIs to integers (for performance)
typedef struct _LV2_URID {
    uint32_t (*map)(const char* uri);
    const char* (*unmap)(uint32_t urid);
} LV2_URID;

// Get URID map feature
static inline const LV2_URID* get_urid_map(const LV2_Feature* const* features) {
    if (features) {
        for (uint32_t i = 0; features[i]; ++i) {
            if (features[i]->data &&
                strcmp(features[i]->URI, LV2_URID_URI) == 0) {
                return (const LV2_URID*)features[i]->data;
            }
        }
    }
    return nullptr;
}

// Get worker schedule feature (for non-realtime work)
typedef void* (*LV2_Worker_Schedule_Handle)(LV2_Handle handle,
                                           uint32_t size,
                                           uint32_t protocol,
                                           const void* data);

static inline LV2_Worker_Schedule_Handle get_worker_schedule(
    const LV2_Feature* const* features) {
    if (features) {
        for (uint32_t i = 0; features[i]; ++i) {
            if (features[i]->data &&
                strcmp(features[i]->URI, LV2_WORKER_URI) == 0) {
                return (LV2_Worker_Schedule_Handle)features[i]->data;
            }
        }
    }
    return nullptr;
}

#ifdef __cplusplus
}
#endif

//==============================================================================
// LV2 Plugin Macros
//==============================================================================

#ifdef __cplusplus

#define LV2_SYMBOL_EXPORT extern "C" __attribute__((visibility("default")))

#else

#define LV2_SYMBOL_EXPORT __attribute__((visibility("default")))

#endif

// Standard LV2 entry point
#define LV2_DESCRIPTOR_URI(URI) \
    LV2_SYMBOL_EXPORT const LV2_Descriptor* lv2_descriptor(uint32_t index)

// Helper to define descriptor function
#define LV2_DESCRIPTOR_DECL(PluginClass) \
    LV2_SYMBOL_EXPORT const LV2_Descriptor* lv2_descriptor(uint32_t index) { \
        static const LV2_Descriptor descriptor = { \
            URI, \
            PluginClass::instantiate, \
            PluginClass::cleanup, \
            PluginClass::connect_port, \
            PluginClass::activate, \
            PluginClass::run, \
            PluginClass::deactivate, \
            PluginClass::extension_data \
        }; \
        return (index == 0) ? &descriptor : nullptr; \
    }

//==============================================================================
// LV2 Parameter Ranges
//==============================================================================

namespace LV2Utils {

struct ParameterRange {
    float min;
    float max;
    float default_value;

    ParameterRange(float minVal = 0.0f, float maxVal = 1.0f, float def = 0.5f)
        : min(minVal), max(maxVal), default_value(def) {}

    float clamp(float value) const {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
};

// Convert LV2 port index to parameter ID
inline uint32_t port_to_param(uint32_t port_index, uint32_t audio_port_count) {
    return port_index - audio_port_count;
}

// Check if port is audio
inline bool is_audio_port(uint32_t port_index, uint32_t audio_port_count) {
    return port_index < audio_port_count;
}

// Check if port is control
inline bool is_control_port(uint32_t port_index, uint32_t audio_port_count) {
    return port_index >= audio_port_count;
}

} // namespace LV2Utils
