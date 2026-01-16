//
//  sch_engine.hpp
//  White Room JUCE FFI
//
//  Function declarations for Schillinger FFI layer
//  Agent 4: Function declarations
//  Agent 5: Function implementations (in sch_engine.cpp)
//

#pragma once

#include "sch_types.hpp"

#ifdef __cplusplus
extern "C" {
#endif

// ============================================================================
// Engine Lifecycle
// ============================================================================

/**
 * Create a new Schillinger engine instance
 *
 * @param out_engine Pointer to receive the engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_create(sch_engine_handle* out_engine);

/**
 * Destroy an engine instance
 *
 * @param engine Engine handle to destroy
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_destroy(sch_engine_handle engine);

// ============================================================================
// Song Operations
// ============================================================================

/**
 * Create a default song in the engine
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_create_default_song(sch_engine_handle engine);

/**
 * Load a song from JSON string
 *
 * @param engine Engine handle
 * @param json JSON string representation of the song
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_load_song(sch_engine_handle engine, const char* json);

/**
 * Get current song as JSON string
 *
 * @param engine Engine handle
 * @param out_json Pointer to receive JSON string (caller must free)
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_get_song(sch_engine_handle engine, sch_string_t* out_json);

/**
 * Get song metadata
 *
 * @param engine Engine handle
 * @param out_metadata Pointer to receive metadata
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_get_song_metadata(
    sch_engine_handle engine,
    sch_song_metadata_t* out_metadata
);

// ============================================================================
// Parameter Operations
// ============================================================================

/**
 * Get a parameter value
 *
 * @param engine Engine handle
 * @param parameter_id Parameter identifier string
 * @param out_value Pointer to receive parameter value
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_get_parameter_value(
    sch_engine_handle engine,
    const char* parameter_id,
    sch_parameter_value_t* out_value
);

/**
 * Set a parameter value
 *
 * @param engine Engine handle
 * @param parameter_id Parameter identifier string
 * @param value New parameter value
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_parameter_value(
    sch_engine_handle engine,
    const char* parameter_id,
    double value
);

/**
 * Batch set multiple parameters
 *
 * @param engine Engine handle
 * @param batch Pointer to parameter batch structure
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_parameter_batch(
    sch_engine_handle engine,
    const sch_parameter_batch_t* batch
);

/**
 * Get all available parameter IDs
 *
 * @param engine Engine handle
 * @param out_ids Pointer to receive array of parameter IDs (caller must free)
 * @param out_count Pointer to receive count of parameters
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_list_parameters(
    sch_engine_handle engine,
    char*** out_ids,
    size_t* out_count
);

// ============================================================================
// Transport Operations
// ============================================================================

/**
 * Get current transport state
 *
 * @param engine Engine handle
 * @param out_state Pointer to receive transport state
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_get_transport_state(
    sch_engine_handle engine,
    sch_transport_state_info_t* out_state
);

/**
 * Set transport state (play/pause/stop)
 *
 * @param engine Engine handle
 * @param state New transport state
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_transport(
    sch_engine_handle engine,
    sch_transport_state_enum_t state
);

/**
 * Set transport position
 *
 * @param engine Engine handle
 * @param position New position in seconds
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_position(
    sch_engine_handle engine,
    double position
);

/**
 * Set tempo
 *
 * @param engine Engine handle
 * @param tempo New tempo in BPM
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_tempo(
    sch_engine_handle engine,
    double tempo
);

/**
 * Toggle recording state
 *
 * @param engine Engine handle
 * @param is_recording New recording state
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_recording(
    sch_engine_handle engine,
    bool is_recording
);

// ============================================================================
// Edit Operations
// ============================================================================

/**
 * Submit an edit operation
 *
 * @param engine Engine handle
 * @param operation Edit operation type
 * @param json_payload JSON payload for the edit operation
 * @param out_result Pointer to receive edit result
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_submit_edit(
    sch_engine_handle engine,
    sch_edit_op_t operation,
    const char* json_payload,
    sch_edit_result_t* out_result
);

/**
 * Undo last edit
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_undo(sch_engine_handle engine);

/**
 * Redo last undone edit
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_redo(sch_engine_handle engine);

/**
 * Get undo history size
 *
 * @param engine Engine handle
 * @param out_count Pointer to receive count of undoable edits
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_get_undo_count(
    sch_engine_handle engine,
    size_t* out_count
);

// ============================================================================
// Audio Configuration
// ============================================================================

/**
 * Initialize audio subsystem
 *
 * @param engine Engine handle
 * @param config Audio configuration
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_audio_init(
    sch_engine_handle engine,
    const sch_audio_config_t* config
);

/**
 * Get audio status
 *
 * @param engine Engine handle
 * @param out_status Pointer to receive audio status
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_get_audio_status(
    sch_engine_handle engine,
    sch_audio_status_t* out_status
);

/**
 * Start audio processing
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_audio_start(sch_engine_handle engine);

/**
 * Stop audio processing
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_audio_stop(sch_engine_handle engine);

// ============================================================================
// Performance Blend (Swift Frontend Integration)
// ============================================================================

/**
 * Set performance blend between two performances
 * This is the main function called by Swift frontend's SweepControl
 *
 * @param engine Engine handle
 * @param performance_a_id Performance A identifier (t = 0.0)
 * @param performance_b_id Performance B identifier (t = 1.0)
 * @param blend_value Blend value between 0.0 (100% A) and 1.0 (100% B)
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_performance_blend(
    sch_engine_handle engine,
    const char* performance_a_id,
    const char* performance_b_id,
    double blend_value
);

/**
 * Send JSON command to engine
 * Generic command interface for advanced operations
 *
 * @param engine Engine handle
 * @param json_command JSON string containing command
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_send_command(
    sch_engine_handle engine,
    const char* json_command
);

// ============================================================================
// Callbacks
// ============================================================================

/**
 * Set error callback
 *
 * @param engine Engine handle
 * @param callback Callback function pointer
 * @param user_data User data to pass to callback
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_error_cb(
    sch_engine_handle engine,
    sch_error_callback_t callback,
    void* user_data
);

/**
 * Set transport state callback
 *
 * @param engine Engine handle
 * @param callback Callback function pointer
 * @param user_data User data to pass to callback
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_transport_cb(
    sch_engine_handle engine,
    sch_transport_callback_t callback,
    void* user_data
);

/**
 * Set parameter change callback
 *
 * @param engine Engine handle
 * @param callback Callback function pointer
 * @param user_data User data to pass to callback
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_set_parameter_cb(
    sch_engine_handle engine,
    sch_parameter_callback_t callback,
    void* user_data
);

// ============================================================================
// Panic / Emergency Stop
// ============================================================================

/**
 * Emergency panic stop - stop all audio immediately
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_engine_panic(sch_engine_handle engine);

// ============================================================================
// Version Info
// ============================================================================

/**
 * Get engine version string
 *
 * @param buffer Buffer to receive version string
 * @param buffer_size Size of buffer
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_get_engine_version(char* buffer, size_t buffer_size);

/**
 * Get engine version structure
 *
 * @param out_version Pointer to receive version structure
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_get_engine_version_info(sch_engine_version_t* out_version);

/**
 * Get schema version
 *
 * @param out_version Pointer to receive schema version
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_get_engine_schema_version(sch_schema_version_t* out_version);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert result code to string
 *
 * @param result Result code
 * @return String representation of result code
 */
const char* sch_result_to_string(sch_result_t result);

/**
 * Free string allocated by FFI functions
 *
 * @param str String to free
 */
void sch_free_string(sch_string_t* str);

/**
 * Free string array allocated by FFI functions
 *
 * @param array String array to free
 * @param count Number of strings in array
 */
void sch_free_string_array(char** array, size_t count);

#ifdef __cplusplus
}
#endif
