//
//  sch_types.hpp
//  White Room JUCE FFI
//
//  Complete FFI type definitions for Schillinger Engine
//  Bridges C++ JUCE backend to Swift frontend
//

#pragma once

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// ========== VERSION ==========
#define SCH_FFI_SCHEMA_VERSION 1

// ========== OPAQUE HANDLE ==========
typedef struct sch_engine sch_engine_t;
typedef sch_engine_t* sch_engine_handle;

// ========== RESULT CODES ==========
typedef enum sch_result_t {
    SCH_OK = 0,
    SCH_ERR_INVALID_ARG = 1,
    SCH_ERR_NOT_FOUND = 2,
    SCH_ERR_REJECTED = 3,
    SCH_ERR_DEFERRED = 4,
    SCH_ERR_NOT_IMPLEMENTED = 5,
    SCH_ERR_ENGINE_NULL = 6,
    SCH_ERR_INVALID_STATE = 7,
    SCH_ERR_INTERNAL = 100,
    // Legacy codes for compatibility
    SCH_ERR_ENGINE_FAILED = 3,
    SCH_ERR_AUDIO_FAILED = 4,
    SCH_ERR_OUT_OF_MEMORY = 6,
    SCH_ERR_NOT_SUPPORTED = 8,
    SCH_ERR_PARSE_FAILED = 9,
    SCH_ERR_VALIDATION_FAILED = 10
} sch_result_t;

// ========== MUSICAL TIME ==========
typedef struct {
    int64_t tick;
} sch_time_t;

typedef struct {
    int32_t numerator;
    int32_t denominator;
} sch_timesig_t;

// ========== IDENTITY ==========
typedef uint64_t sch_param_hash_t;

typedef struct {
    const char* canonical;
    sch_param_hash_t hash;
} sch_param_id_t;

// ========== ENUMS ==========
typedef enum {
    SCH_SCOPE_SONG = 0,
    SCH_SCOPE_SECTION = 1,
    SCH_SCOPE_ROLE = 2,
    SCH_SCOPE_GLOBAL = 3
} sch_scope_t;

typedef enum {
    SCH_RISK_SAFE = 0,
    SCH_RISK_DESTRUCTIVE = 1,
    SCH_RISK_SYSTEM_LOCKED = 2
} sch_risk_t;

typedef enum {
    SCH_STYLE_TOGGLE = 0,
    SCH_STYLE_STEPPER = 1,
    SCH_STYLE_SLIDER = 2,
    SCH_STYLE_PICKER = 3,
    SCH_STYLE_MINICURVE = 4,
    SCH_STYLE_NETGRID = 5,
    SCH_STYLE_GLYPHROW = 6,
    SCH_STYLE_READOUT = 7
} sch_style_t;

typedef enum {
    SCH_EDIT_APPLIED = 0,
    SCH_EDIT_DEFERRED = 1,
    SCH_EDIT_REJECTED = 2
} sch_edit_status_t;

// ========== TRANSPORT STATE ==========
typedef enum sch_transport_state_enum_t {
    SCH_TRANSPORT_STOPPED = 0,
    SCH_TRANSPORT_PLAYING = 1,
    SCH_TRANSPORT_RECORDING = 2,
    SCH_TRANSPORT_PAUSED = 3
} sch_transport_state_enum_t;

// ========== TRANSPORT ACTIONS ==========
typedef enum {
    SCH_TRANSPORT_PLAY = 0,
    SCH_TRANSPORT_PAUSE = 1,
    SCH_TRANSPORT_STOP = 2,
    SCH_TRANSPORT_SEEK = 3,
    SCH_TRANSPORT_SET_TEMPO = 4,
    SCH_TRANSPORT_SET_TIMESIG = 5,
    SCH_TRANSPORT_SET_LOOP = 6
} sch_transport_action_t;

// ========== PARAMETER DEFINITION ==========
typedef struct {
    sch_param_id_t id;
    const char* display_name;
    const char* unit_label;
    double min_value;
    double max_value;
    double default_value;
    double step;
    int32_t quantized;
    sch_risk_t risk;
    sch_style_t style;
} sch_param_def_t;

// ========== PARAMETER VALUE ==========
typedef struct {
    double value;
    bool is_valid;
} sch_parameter_value_t;

// Legacy transport state structure for compatibility
typedef struct {
    sch_transport_state_enum_t state;
    double position;
    double tempo;
    int time_signature_numerator;
    int time_signature_denominator;
    bool is_recording;
} sch_transport_state_info_t;

// ========== EDIT OPERATION TYPES ==========
typedef enum sch_edit_op_type_t {
    SCH_EDIT_REALIZE = 0,
    SCH_EDIT_RECONCILE = 1,
    SCH_EDIT_LOAD_SONG = 2,
    SCH_EDIT_TRANSPORT = 3,
    SCH_EDIT_SET_PARAM = 4,
    // Legacy types for compatibility
    SCH_EDIT_CREATE_NOTE = 100,
    SCH_EDIT_UPDATE_NOTE = 101,
    SCH_EDIT_DELETE_NOTE = 102,
    SCH_EDIT_CREATE_TRACK = 103,
    SCH_EDIT_DELETE_TRACK = 104,
    SCH_EDIT_UPDATE_TRACK = 105,
    SCH_EDIT_BATCH = 106
} sch_edit_op_type_t;

// ========== EDIT OPERATION ==========
typedef struct {
    sch_param_id_t parameter;
    double value;

    sch_scope_t scope;
    uint64_t song_id;
    uint64_t section_id;
    uint64_t role_id;

    int32_t prefer_defer_to_boundary;
    sch_time_t requested_at;
} sch_edit_op_t;

// ========== EDIT RESULT ==========
typedef struct {
    sch_result_t result;
    char error_message[512];
    uint64_t operation_id;
    sch_edit_status_t status;
    double applied_value;
    sch_time_t will_apply_at;
    const char* rejection_reason;
} sch_edit_result_t;

// ========== TRANSPORT INTENT ==========
typedef struct {
    sch_transport_action_t action;
    double tempo;
    sch_timesig_t timesig;
    sch_time_t seek_to;
    sch_time_t loop_start;
    sch_time_t loop_end;
    int32_t loop_enabled;
} sch_transport_intent_t;

// ========== TRANSPORT STATE STRUCT ==========
typedef struct {
    int32_t is_playing;
    int32_t is_recording;
    int32_t is_looping;

    double tempo;
    sch_timesig_t timesig;

    sch_time_t position;
    sch_time_t loop_start;
    sch_time_t loop_end;
} sch_transport_state_struct_t;

// ========== EVENT TYPES ==========
typedef enum {
    SCH_EVT_NOTE_ON = 0,
    SCH_EVT_NOTE_OFF = 1,
    SCH_EVT_CC = 2,
    SCH_EVT_PITCH_BEND = 3,
    SCH_EVT_PROGRAM = 4,
    SCH_EVT_PARAM_AUTOMATION = 5
} sch_event_type_t;

// ========== EVENT ==========
typedef struct {
    sch_time_t time;
    sch_event_type_t type;

    uint64_t song_id;
    uint64_t section_id;
    uint64_t role_id;
    uint8_t midi_channel;

    uint8_t note;
    uint8_t velocity;
    int32_t cc_number;
    double value;
} sch_event_t;

// ========== EVENT BATCH ==========
typedef struct {
    sch_time_t from;
    sch_time_t to;
    sch_event_t* events;
    int32_t count;
} sch_event_batch_t;

// ========== INTENT EVENT ==========
typedef struct {
    char scope[32];
    char title[256];
    char reason[512];
    char entity_id[128];
    char previous_value[128];
    char new_value[128];
} schillinger_intent_event_t;

// ========== CALLBACK TYPES ==========
typedef void (*sch_transport_cb)(const sch_transport_state_struct_t* state, void* user);
typedef void (*sch_param_change_cb)(const sch_param_id_t* id, double prev, double next, int32_t deferred, void* user);
typedef void (*sch_intent_cb)(const char* title, const char* reason, sch_scope_t scope,
                               uint64_t song, uint64_t section, uint64_t role, sch_time_t at, void* user);
typedef void (*sch_intent_event_cb)(const schillinger_intent_event_t* event, void* user);
typedef void (*sch_panic_cb)(const char* message, void* user);
typedef void (*sch_error_cb)(int32_t code, const char* message, void* user);

// Legacy callback types for compatibility
typedef void (*sch_error_callback_t)(const char* error_message, void* user_data);
typedef void (*sch_transport_callback_t)(sch_transport_state_info_t state, void* user_data);
typedef void (*sch_parameter_callback_t)(const char* parameter_id, double value, void* user_data);

// ========== ROLE KINDS ==========
typedef enum sch_role_kind_t {
    SCH_ROLE_KIND_PULSE = 0,
    SCH_ROLE_KIND_FOUNDATION = 1,
    SCH_ROLE_KIND_MOTION = 2,
    SCH_ROLE_KIND_TEXTURE = 3,
    SCH_ROLE_KIND_ORNAMENT = 4,
    SCH_ROLE_KIND_ACCENT = 5,
    SCH_ROLE_KIND_NOISE = 6,
    SCH_ROLE_KIND_VOICE = 7,
    SCH_ROLE_KIND_DRONE = 8,
    SCH_ROLE_KIND_COUNTERLINE = 9,
    SCH_ROLE_KIND_CUSTOM = 99
} sch_role_kind_t;

typedef enum sch_generator_kind_t {
    SCH_GEN_NONE = 0,
    SCH_GEN_RHYTHM = 1,
    SCH_GEN_BASS = 2,
    SCH_GEN_CHORD_TEXTURE = 3,
    SCH_GEN_MELODY = 4,
    SCH_GEN_ORNAMENT = 5,
    SCH_GEN_NOISE = 6
} sch_generator_kind_t;

typedef enum sch_instrument_engine_t {
    SCH_INST_SAMPLER = 0,
    SCH_INST_DSP_SYNTH = 1
} sch_instrument_engine_t;

// ========== ROLE STRUCT ==========
typedef struct {
    char id[64];
    char name[64];
    sch_role_kind_t kind;
    sch_generator_kind_t generator;
    sch_instrument_engine_t instrument_engine;
    char preset_id[128];
    int32_t channel;
    double gain;
    double pan;
    int32_t mute;
    int32_t solo;
    int32_t baseNote;  // MIDI base note (0-127) - added for iOS speaker optimization
} sch_role_t;

// ========== RESULTANT SYSTEM (Phase R3) ==========
typedef struct {
    double position;
    float accent;
} sch_attack_t;

typedef struct {
    double pattern_length;
    sch_attack_t* attacks;
    int32_t attack_count;

    float density;
    float syncopation;

    int32_t is_invariants_valid;
    const char** validation_errors;
    int32_t validation_error_count;
} sch_resultant_t;

typedef enum {
    SCH_TRANSFORM_ROTATION = 0,
    SCH_TRANSFORM_RETROGRADE = 1,
    SCH_TRANSFORM_INVERSION = 2,
    SCH_TRANSFORM_SCRAMBLE = 3
} sch_transform_type_t;

typedef struct {
    sch_transform_type_t type;
    double degrees;
} sch_transformation_t;

typedef struct {
    sch_resultant_t resultant;
    sch_transformation_t transformation;
    int32_t has_transformation;
} sch_family_variant_t;

typedef struct {
    char name[256];
    sch_resultant_t base_resultant;
    sch_family_variant_t* variants;
    int32_t variant_count;

    int32_t is_valid;
    const char** all_validation_errors;
    int32_t validation_error_count;
} sch_pattern_family_t;

typedef struct {
    char id[64];
    sch_pattern_family_t family;
    int32_t variant_index;
    char role_id[64];
    char section_id[64];
    int32_t has_section_id;
} sch_pattern_t;

// ========== REGION TYPES ==========
typedef enum {
    SCH_REGION_TYPE_SONG = 0,
    SCH_REGION_TYPE_SECTION = 1,
    SCH_REGION_TYPE_TRANSITION = 2,
    SCH_REGION_TYPE_INTERSTITIAL = 3
} sch_region_type_t;

typedef struct {
    char id[64];
    sch_region_type_t type;
    int64_t start_ticks;
    int64_t end_ticks;
    char song_id[128];
    char section_id[128];
    int32_t tag_count;
    char** tags;
    int32_t metadata_count;
    char* metadata_keys;
    char* metadata_values;
} sch_region_t;

// ========== SONG TYPES (Legacy) ==========
typedef struct {
    const char* title;
    const char* artist;
    double tempo;
    int time_signature_numerator;
    int time_signature_denominator;
} sch_song_metadata_t;

typedef void* sch_song_handle;

typedef struct {
    sch_song_handle handle;
    sch_song_metadata_t metadata;
} sch_song_t;

// ========== VERSION INFO ==========
typedef struct {
    uint32_t major;
    uint32_t minor;
    uint32_t patch;
} sch_schema_version_t;

typedef struct {
    sch_schema_version_t api;
    sch_schema_version_t schema;
    const char* build_info;
} sch_engine_version_t;

// ========== AUDIO CONFIGURATION ==========
typedef struct {
    double sample_rate;
    uint32_t buffer_size;
    uint32_t input_channels;
    uint32_t output_channels;
} sch_audio_config_t;

typedef struct {
    bool is_initialized;
    double cpu_usage;
    uint32_t xrun_count;
    sch_audio_config_t config;
} sch_audio_status_t;

// ========== UTILITY TYPES ==========
typedef struct {
    char* data;
    size_t length;
} sch_string_t;

// ========== PARAMETER BATCH (Legacy) ==========
typedef struct {
    const char** parameter_ids;
    double* values;
    size_t count;
} sch_parameter_batch_t;

// ============================================================================
// Internal Engine Type (for C++ implementation)
// ============================================================================

#ifdef __cplusplus

/// Internal engine structure (C++ only)
namespace schillinger {
    struct Engine;
}

/// C-compatible engine wrapper
typedef struct {
    schillinger::Engine* engine;
    void* user_data;
    sch_error_callback_t error_cb;
    sch_transport_callback_t transport_cb;
    sch_parameter_callback_t parameter_cb;
} sch_engine_internal_t;

#endif // __cplusplus

#ifdef __cplusplus
}
#endif

