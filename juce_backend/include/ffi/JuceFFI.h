//
//  JuceFFI.h
//  SchillingerEngine
//
//  C FFI API for Swift/tvOS integration
//  Phase 9.5A - Minimal Transport → Audio
//

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// ============================================================================
// Type Definitions
// ============================================================================

/// Opaque engine handle
typedef void* schillinger_engine_t;

/// Error codes
typedef enum {
    SCHILLINGER_ERROR_NONE = 0,
    SCHILLINGER_ERROR_INVALID_ARGUMENT = 1,
    SCHILLINGER_ERROR_NOT_SUPPORTED = 2,
    SCHILLINGER_ERROR_ENGINE_FAILED = 3,
    SCHILLINGER_ERROR_AUDIO_FAILED = 4
} schillinger_error_t;

/// Transport commands
typedef enum {
    SCHILLINGER_TRANSPORT_PLAY = 1,
    SCHILLINGER_TRANSPORT_STOP = 2,
    SCHILLINGER_TRANSPORT_PAUSE = 3
} schillinger_transport_command_t;

/// Transport intent
typedef struct {
    schillinger_transport_command_t command;
    double position;  // Position in ticks
    double tempo;     // Tempo in BPM
} schillinger_transport_intent_t;

/// Transport state (polling-based, Phase 9.5A)
typedef struct {
    bool is_playing;
    double position;      // Current position in ticks
    double tempo;         // Current tempo in BPM
    bool is_recording;
} schillinger_transport_state_t;

/// Version info
typedef struct {
    uint32_t major;
    uint32_t minor;
    uint32_t patch;
} schillinger_version_t;

// Placeholder types for future expansion
typedef struct { void* _placeholder; } schillinger_song_diff_t;
typedef struct { void* _placeholder; } schillinger_edit_response_t;
typedef struct { void* _placeholder; } schillinger_parameter_batch_t;
typedef struct { void* _placeholder; } schillinger_audio_status_t;
typedef struct { void* _placeholder; } schillinger_intent_event_t;
typedef struct { void* _placeholder; } schillinger_panic_event_t;

// ============================================================================
// Core API (Phase 9.5A - Frozen Surface)
// ============================================================================

/// Create a new Schillinger engine instance
schillinger_engine_t schillinger_engine_create(void);

/// Destroy an engine instance
void schillinger_engine_destroy(schillinger_engine_t engine);

/// Audio start (direct control, Phase 9.5A)
schillinger_error_t schillinger_audio_start(
    schillinger_engine_t engine,
    double sample_rate,
    uint32_t frames_per_buffer
);

/// Audio stop (direct control, Phase 9.5A)
schillinger_error_t schillinger_audio_stop(schillinger_engine_t engine);

/// Execute transport command (play/stop/pause)
schillinger_error_t schillinger_transport_command(
    schillinger_engine_t engine,
    const schillinger_transport_intent_t* intent
);

/// Get transport state (polling, no callbacks)
schillinger_error_t schillinger_transport_get_state(
    schillinger_engine_t engine,
    schillinger_transport_state_t* out_state
);

/// Emergency panic stop
schillinger_error_t schillinger_panic(schillinger_engine_t engine);

/// Get engine version
void schillinger_get_version(schillinger_version_t* version);

// Placeholder declarations for future expansion
schillinger_error_t schillinger_submit_edit(
    schillinger_engine_t engine,
    const schillinger_song_diff_t* edit,
    schillinger_edit_response_t* response
);

#ifdef __cplusplus
}
#endif
