//
//  sch_engine_ffi.h
//  White Room JUCE FFI Bridge
//
//  C ABI interface for Swift ↔ JUCE C++ communication
//  All functions are extern "C" to ensure C ABI compatibility
//
//  Memory Management Rules:
//  - Input strings: Borrowed (caller retains ownership)
//  - Output strings: Allocated with malloc (caller must free with sch_free_string)
//  - Output arrays: Allocated with malloc (caller must free with sch_free_string_array)
//
//  Thread Safety:
//  - All functions are thread-safe (use internal locking)
//  - Audio thread updates atomic state (poll with sch_engine_get_performance_state)
//  - Commands queued via sch_engine_push_command (lock-free SPSC queue)
//

#pragma once

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// ============================================================================
// TYPES
// ============================================================================

// Opaque engine handle (pointer to internal C++ engine)
typedef struct sch_engine_t sch_engine_t;
typedef sch_engine_t* sch_engine_handle;

// Result codes
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
    // Legacy codes
    SCH_ERR_ENGINE_FAILED = 3,
    SCH_ERR_AUDIO_FAILED = 4,
    SCH_ERR_OUT_OF_MEMORY = 6,
    SCH_ERR_NOT_SUPPORTED = 8,
    SCH_ERR_PARSE_FAILED = 9,
    SCH_ERR_VALIDATION_FAILED = 10
} sch_result_t;

// UUID (36 chars + null terminator)
typedef char sch_uuid_t[37];

// String with ownership transfer
typedef struct {
    char* data;
    size_t length;
} sch_string_t;

// String array
typedef struct {
    char** items;
    size_t count;
} sch_string_array_t;

// Audio configuration
typedef struct {
    double sample_rate;
    uint32_t buffer_size;
    uint32_t input_channels;
    uint32_t output_channels;
} sch_audio_config_t;

// Transport state
typedef enum {
    SCH_TRANSPORT_STOPPED = 0,
    SCH_TRANSPORT_PLAYING = 1,
    SCH_TRANSPORT_RECORDING = 2,
    SCH_TRANSPORT_PAUSED = 3
} sch_transport_state_t;

// Performance state (atomic, poll from Swift)
typedef struct {
    sch_uuid_t performance_a_id;
    sch_uuid_t performance_b_id;
    double blend_value;
    double tempo;
    double position;
    bool is_playing;
    uint32_t active_voice_count;
} sch_performance_state_t;

// Command types for lock-free queue
typedef enum {
    SCH_CMD_SET_PERFORMANCE_BLEND = 0,
    SCH_CMD_SET_TEMPO = 1,
    SCH_CMD_SET_POSITION = 2,
    SCH_CMD_TRANSPORT = 3,
    SCH_CMD_NOTE_ON = 4,
    SCH_CMD_NOTE_OFF = 5,
    SCH_CMD_ALL_NOTES_OFF = 6,
    SCH_CMD_PANIC = 7
} sch_command_type_t;

// Command (push to queue)
typedef struct {
    sch_command_type_t type;
    union {
        struct {
            sch_uuid_t perf_a_id;
            sch_uuid_t perf_b_id;
            double blend_value;
        } set_performance_blend;
        struct {
            double tempo;
        } set_tempo;
        struct {
            double position;
        } set_position;
        struct {
            sch_transport_state_t state;
        } transport;
        struct {
            int channel;
            int note;
            float velocity;
        } note_on;
        struct {
            int channel;
            int note;
            float velocity;
        } note_off;
    } data;
} sch_command_t;

// Event types (callbacks from audio thread)
typedef enum {
    SCH_EVT_ERROR = 0,
    SCH_EVT_TRANSPORT_STARTED = 1,
    SCH_EVT_TRANSPORT_STOPPED = 2,
    SCH_EVT_SECTION_BOUNDARY = 3,
    SCH_EVT_VALIDATION_ERROR = 4
} sch_event_type_t;

// Event callback
typedef void (*sch_event_callback_t)(
    sch_event_type_t event_type,
    const char* message,
    void* user_data
);

// ============================================================================
// ENGINE LIFECYCLE
// ============================================================================

/**
 * Create a new Schillinger engine instance
 *
 * @param out_engine Pointer to receive engine handle
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

/**
 * Get engine version info
 *
 * @param out_version Pointer to receive version string (caller must free)
 * @return SCH_OK on success
 */
sch_result_t sch_engine_get_version(sch_string_t* out_version);

// ============================================================================
// SONG OPERATIONS
// ============================================================================

/**
 * Load a SchillingerSong from JSON string
 *
 * @param engine Engine handle
 * @param json JSON string (borrowed, caller retains ownership)
 * @return SCH_OK on success, SCH_ERR_PARSE_FAILED if JSON is invalid
 */
sch_result_t sch_engine_load_song(
    sch_engine_handle engine,
    const char* json
);

/**
 * Get current song as JSON string
 *
 * @param engine Engine handle
 * @param out_json Pointer to receive JSON string (caller must free with sch_free_string)
 * @return SCH_OK on success
 */
sch_result_t sch_engine_get_song(
    sch_engine_handle engine,
    sch_string_t* out_json
);

/**
 * Create a default minimal song
 *
 * @param engine Engine handle
 * @return SCH_OK on success
 */
sch_result_t sch_engine_create_default_song(sch_engine_handle engine);

// ============================================================================
// AUDIO CONTROL
// ============================================================================

/**
 * Initialize audio subsystem
 *
 * @param engine Engine handle
 * @param config Audio configuration
 * @return SCH_OK on success
 */
sch_result_t sch_engine_audio_init(
    sch_engine_handle engine,
    const sch_audio_config_t* config
);

/**
 * Start audio processing
 *
 * @param engine Engine handle
 * @return SCH_OK on success
 */
sch_result_t sch_engine_audio_start(sch_engine_handle engine);

/**
 * Stop audio processing
 *
 * @param engine Engine handle
 * @return SCH_OK on success
 */
sch_result_t sch_engine_audio_stop(sch_engine_handle engine);

/**
 * Get audio status
 *
 * @param engine Engine handle
 * @param out_json Pointer to receive status JSON (caller must free)
 * @return SCH_OK on success
 */
sch_result_t sch_engine_get_audio_status(
    sch_engine_handle engine,
    sch_string_t* out_json
);

// ============================================================================
// TRANSPORT CONTROL
// ============================================================================

/**
 * Set transport state
 *
 * @param engine Engine handle
 * @param state New transport state
 * @return SCH_OK on success
 */
sch_result_t sch_engine_set_transport(
    sch_engine_handle engine,
    sch_transport_state_t state
);

/**
 * Set tempo
 *
 * @param engine Engine handle
 * @param tempo Tempo in BPM
 * @return SCH_OK on success
 */
sch_result_t sch_engine_set_tempo(
    sch_engine_handle engine,
    double tempo
);

/**
 * Set playback position
 *
 * @param engine Engine handle
 * @param position Position in seconds
 * @return SCH_OK on success
 */
sch_result_t sch_engine_set_position(
    sch_engine_handle engine,
    double position
);

// ============================================================================
// MIDI EVENTS
// ============================================================================

/**
 * Send note-on event
 *
 * @param engine Engine handle
 * @param channel MIDI channel (0-15)
 * @param note Note number (0-127)
 * @param velocity Velocity (0.0-1.0)
 * @return SCH_OK on success
 */
sch_result_t sch_engine_send_note_on(
    sch_engine_handle engine,
    int channel,
    int note,
    float velocity
);

/**
 * Send note-off event
 *
 * @param engine Engine handle
 * @param channel MIDI channel (0-15)
 * @param note Note number (0-127)
 * @param velocity Release velocity (0.0-1.0)
 * @return SCH_OK on success
 */
sch_result_t sch_engine_send_note_off(
    sch_engine_handle engine,
    int channel,
    int note,
    float velocity
);

/**
 * Send all-notes-off (panic)
 *
 * @param engine Engine handle
 * @return SCH_OK on success
 */
sch_result_t sch_engine_all_notes_off(sch_engine_handle engine);

// ============================================================================
// PERFORMANCE BLEND (REAL-TIME)
// ============================================================================

/**
 * Set performance blend (real-time control)
 *
 * This function pushes a command to the lock-free queue for processing
 * on the audio thread. Returns immediately.
 *
 * @param engine Engine handle
 * @param performance_a_id Performance A ID (t = 0.0)
 * @param performance_b_id Performance B ID (t = 1.0)
 * @param blend_value Blend value (0.0-1.0)
 * @return SCH_OK on success, SCH_ERR_INVALID_ARG if blend_value out of range
 */
sch_result_t sch_engine_set_performance_blend(
    sch_engine_handle engine,
    const char* performance_a_id,
    const char* performance_b_id,
    double blend_value
);

/**
 * Push command to lock-free queue
 *
 * Thread-safe: Can be called from any thread
 *
 * @param engine Engine handle
 * @param command Command to push
 * @return SCH_OK on success, SCH_ERR_REJECTED if queue is full
 */
sch_result_t sch_engine_push_command(
    sch_engine_handle engine,
    const sch_command_t* command
);

/**
 * Get current performance state (atomic read)
 *
 * Thread-safe: Can be called from any thread without blocking
 *
 * @param engine Engine handle
 * @param out_state Pointer to receive state
 * @return SCH_OK on success
 */
sch_result_t sch_engine_get_performance_state(
    sch_engine_handle engine,
    sch_performance_state_t* out_state
);

// ============================================================================
// CALLBACKS
// ============================================================================

/**
 * Set event callback
 *
 * Callbacks are invoked from the audio thread, so must be fast and non-blocking.
 * Use dispatch_async to delegate to main thread if needed.
 *
 * @param engine Engine handle
 * @param callback Callback function pointer
 * @param user_data User data passed to callback
 * @return SCH_OK on success
 */
sch_result_t sch_engine_set_event_callback(
    sch_engine_handle engine,
    sch_event_callback_t callback,
    void* user_data
);

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

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
 */
void sch_free_string_array(sch_string_array_t* array);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert result code to string
 *
 * @param result Result code
 * @return String representation (static, do not free)
 */
const char* sch_result_to_string(sch_result_t result);

/**
 * Validate UUID string
 *
 * @param uuid UUID string to validate
 * @return true if valid UUID format
 */
bool sch_uuid_validate(const char* uuid);

#ifdef __cplusplus
}
#endif
