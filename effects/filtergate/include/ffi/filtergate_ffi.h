/*******************************************************************************
 * FilterGate - C ABI / FFI Interface
 *
 * Swift-safe C interface for FilterGate DSP processor.
 * All functions are thread-safe and use handle-based memory management.
 *
 * @author FilterGate Autonomous Agent 6
 * @date  2025-12-30
 ******************************************************************************/

#ifndef FILTERGATE_FFI_H_INCLUDED
#define FILTERGATE_FFI_H_INCLUDED

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

//==============================================================================
// Handle-based opaque pointer
//==============================================================================

/**
 * Opaque handle to FilterGate processor instance
 * All C API functions use this handle for instance management
 */
typedef void* FilterGateHandle;

//==============================================================================
// Lifecycle Management
//==============================================================================

/**
 * Create new FilterGate processor instance
 *
 * @param sampleRate Sample rate in Hz (44100, 48000, 96000, etc.)
 * @return Handle to processor instance, or NULL on failure
 */
FilterGateHandle filtergate_create(double sampleRate);

/**
 * Destroy FilterGate processor instance and free all resources
 *
 * @param handle Handle to processor instance (must be valid)
 */
void filtergate_destroy(FilterGateHandle handle);

/**
 * Reset processor state (clears all filters, envelopes, LFOs)
 *
 * @param handle Handle to processor instance
 */
void filtergate_reset(FilterGateHandle handle);

//==============================================================================
// Audio Processing
//==============================================================================

/**
 * Process audio block (mono)
 *
 * @param handle Handle to processor instance
 * @param input Input audio buffer (mono)
 * @param output Output audio buffer (mono)
 * @param numSamples Number of samples to process
 */
void filtergate_process_mono(FilterGateHandle handle,
                              const float* input,
                              float* output,
                              int numSamples);

/**
 * Process audio block (stereo)
 *
 * @param handle Handle to processor instance
 * @param left Left channel input buffer
 * @param right Right channel input buffer
 * @param numSamples Number of samples to process
 */
void filtergate_process_stereo(FilterGateHandle handle,
                                float* left,
                                float* right,
                                int numSamples);

//==============================================================================
// Parameter IDs (Stable ABI - must never change)
//==============================================================================

typedef enum {
    // Filter parameters
    FILTERGATE_PARAM_FILTER_CUTOFF = 0,
    FILTERGATE_PARAM_FILTER_RESONANCE,
    FILTERGATE_PARAM_FILTER_DRIVE,
    FILTERGATE_PARAM_FILTER_MODEL,

    // Gate parameters
    FILTERGATE_PARAM_GATE_THRESHOLD,
    FILTERGATE_PARAM_GATE_ATTACK,
    FILTERGATE_PARAM_GATE_HOLD,
    FILTERGATE_PARAM_GATE_RELEASE,
    FILTERGATE_PARAM_GATE_HYSTERESIS,

    // Envelope 1 parameters
    FILTERGATE_PARAM_ENV1_MODE,
    FILTERGATE_PARAM_ENV1_ATTACK,
    FILTERGATE_PARAM_ENV1_DECAY,
    FILTERGATE_PARAM_ENV1_SUSTAIN,
    FILTERGATE_PARAM_ENV1_RELEASE,
    FILTERGATE_PARAM_ENV1_LOOP,
    FILTERGATE_PARAM_ENV1_VELOCITY_SENSITIVE,

    // Envelope 2 parameters
    FILTERGATE_PARAM_ENV2_MODE,
    FILTERGATE_PARAM_ENV2_ATTACK,
    FILTERGATE_PARAM_ENV2_DECAY,
    FILTERGATE_PARAM_ENV2_SUSTAIN,
    FILTERGATE_PARAM_ENV2_RELEASE,
    FILTERGATE_PARAM_ENV2_LOOP,
    FILTERGATE_PARAM_ENV2_VELOCITY_SENSITIVE,

    // Phaser A parameters
    FILTERGATE_PARAM_PHASER_A_STAGES,
    FILTERGATE_PARAM_PHASER_A_RATE,
    FILTERGATE_PARAM_PHASER_A_DEPTH,
    FILTERGATE_PARAM_PHASER_A_FEEDBACK,
    FILTERGATE_PARAM_PHASER_A_CENTER,
    FILTERGATE_PARAM_PHASER_A_SPREAD,
    FILTERGATE_PARAM_PHASER_A_MIX,

    // Phaser B parameters
    FILTERGATE_PARAM_PHASER_B_STAGES,
    FILTERGATE_PARAM_PHASER_B_RATE,
    FILTERGATE_PARAM_PHASER_B_DEPTH,
    FILTERGATE_PARAM_PHASER_B_FEEDBACK,
    FILTERGATE_PARAM_PHASER_B_CENTER,
    FILTERGATE_PARAM_PHASER_B_SPREAD,
    FILTERGATE_PARAM_PHASER_B_MIX,

    // Dual phaser parameters
    FILTERGATE_PARAM_DUAL_PHASER_ROUTING,
    FILTERGATE_PARAM_DUAL_PHASER_LFO_PHASE_OFFSET,
    FILTERGATE_PARAM_DUAL_PHASER_CROSS_FEEDBACK,

    // Mixer parameters
    FILTERGATE_PARAM_MIXER_DRY_LEVEL,
    FILTERGATE_PARAM_MIXER_WET_LEVEL,
    FILTERGATE_PARAM_MIXER_PHASER_A_MIX,
    FILTERGATE_PARAM_MIXER_PHASER_B_MIX,
    FILTERGATE_PARAM_MIXER_FILTER_MIX,
    FILTERGATE_PARAM_MIXER_ROUTING_MODE,
    FILTERGATE_PARAM_MIXER_OUTPUT_LEVEL,

    // Drive parameters
    FILTERGATE_PARAM_PRE_DRIVE_TYPE,
    FILTERGATE_PARAM_PRE_DRIVE_DRIVE,
    FILTERGATE_PARAM_PRE_DRIVE_OUTPUT,
    FILTERGATE_PARAM_PRE_DRIVE_TONE,

    FILTERGATE_PARAM_POST_DRIVE_TYPE,
    FILTERGATE_PARAM_POST_DRIVE_DRIVE,
    FILTERGATE_PARAM_POST_DRIVE_OUTPUT,
    FILTERGATE_PARAM_POST_DRIVE_TONE,

    // Envelope follower parameters
    FILTERGATE_PARAM_ENV_FOLLOWER_ATTACK,
    FILTERGATE_PARAM_ENV_FOLLOWER_RELEASE,

    // Modulation matrix
    FILTERGATE_PARAM_MOD_MATRIX_ENABLED,

    // Total count
    FILTERGATE_PARAM_COUNT
} FilterGateParamID;

//==============================================================================
// Parameter Control
//==============================================================================

/**
 * Set parameter value by ID
 *
 * @param handle Handle to processor instance
 * @param paramID Parameter ID (see FilterGateParamID enum)
 * @param value Parameter value (0-1 for normalized parameters)
 * @return true if parameter was set successfully, false on invalid ID
 */
int filtergate_set_param(FilterGateHandle handle, int paramID, float value);

/**
 * Get parameter value by ID
 *
 * @param handle Handle to processor instance
 * @param paramID Parameter ID (see FilterGateParamID enum)
 * @return Current parameter value, or 0.0 on invalid ID
 */
float filtergate_get_param(FilterGateHandle handle, int paramID);

//==============================================================================
// Envelope Triggering
//==============================================================================

/**
 * Trigger envelope (starts attack phase)
 *
 * @param handle Handle to processor instance
 * @param envIndex Envelope index (0 or 1)
 * @param velocity Velocity amount (0-1), only used if velocitySensitive is enabled
 */
void filtergate_trigger_envelope(FilterGateHandle handle, int envIndex, float velocity);

/**
 * Start envelope release phase
 *
 * @param handle Handle to processor instance
 * @param envIndex Envelope index (0 or 1)
 */
void filtergate_release_envelope(FilterGateHandle handle, int envIndex);

//==============================================================================
// Modulation Matrix
//==============================================================================

/**
 * Add modulation route
 *
 * @param handle Handle to processor instance
 * @param source Modulation source (0-11)
 * @param destination Modulation destination (0-11)
 * @param amount Modulation depth (-1.0 to 1.0)
 * @param slewMs Smoothing time in milliseconds (0 = instant)
 * @return Route index (>= 0 on success), or -1 on failure
 */
int filtergate_add_mod_route(FilterGateHandle handle,
                             int source,
                             int destination,
                             float amount,
                             float slewMs);

/**
 * Remove modulation route by index
 *
 * @param handle Handle to processor instance
 * @param routeIndex Route index (returned by filtergate_add_mod_route)
 * @return true if route was removed, false on invalid index
 */
int filtergate_remove_mod_route(FilterGateHandle handle, int routeIndex);

/**
 * Clear all modulation routes
 *
 * @param handle Handle to processor instance
 */
void filtergate_clear_mod_routes(FilterGateHandle handle);

/**
 * Get current modulation value for destination
 *
 * @param handle Handle to processor instance
 * @param destination Modulation destination (0-11)
 * @return Current modulation value, or 0.0 on invalid destination
 */
float filtergate_get_modulation(FilterGateHandle handle, int destination);

//==============================================================================
// State Query
//==============================================================================

/**
 * Get current envelope level
 *
 * @param handle Handle to processor instance
 * @param envIndex Envelope index (0 or 1)
 * @return Current envelope level (0-1)
 */
float filtergate_get_envelope_level(FilterGateHandle handle, int envIndex);

/**
 * Get current gate state
 *
 * @param handle Handle to processor instance
 * @return Gate state (0.0 = closed, 1.0 = open)
 */
float filtergate_get_gate_state(FilterGateHandle handle);

/**
 * Get envelope follower level
 *
 * @param handle Handle to processor instance
 * @return Current envelope follower level (0-1)
 */
float filtergate_get_envelope_follower_level(FilterGateHandle handle);

/**
 * Check if gate just opened (for UI feedback)
 *
 * @param handle Handle to processor instance
 * @return true if gate opened this sample, false otherwise
 */
int filtergate_gate_just_opened(FilterGateHandle handle);

//==============================================================================
// Error Handling
//==============================================================================

/**
 * Get last error message
 * Returns a human-readable error message for the last error that occurred.
 * The returned string is owned by the system and valid until the next
 * FilterGate function call.
 *
 * @param handle Handle to processor instance
 * @return Error message string, or NULL if no error
 */
const char* filtergate_get_last_error(FilterGateHandle handle);

/**
 * Clear last error message
 *
 * @param handle Handle to processor instance
 */
void filtergate_clear_error(FilterGateHandle handle);

//==============================================================================
// String Utilities
//==============================================================================

/**
 * Free string returned by FilterGate functions
 * Use this to free any strings returned by the C API
 *
 * @param str String to free (safe to pass NULL)
 */
void filtergate_free_string(char* str);

//==============================================================================
// Enum Value Constants
//==============================================================================

// Filter model values
typedef enum {
    FILTERGATE_FILTER_MODEL_SVF = 0,
    FILTERGATE_FILTER_MODEL_LADDER,
    FILTERGATE_FILTER_MODEL_OTA,
    FILTERGATE_FILTER_MODEL_MS20,
    FILTERGATE_FILTER_MODEL_COMB,
    FILTERGATE_FILTER_MODEL_MORPH
} FilterGateFilterModel;

// Envelope mode values
typedef enum {
    FILTERGATE_ENVELOPE_MODE_ADR = 0,
    FILTERGATE_ENVELOPE_MODE_ADSR
} FilterGateEnvelopeMode;

// Phaser routing mode values
typedef enum {
    FILTERGATE_PHASER_ROUTING_SERIAL = 0,
    FILTERGATE_PHASER_ROUTING_PARALLEL,
    FILTERGATE_PHASER_ROUTING_STEREO
} FilterGatePhaserRouting;

// Mixer routing mode values
typedef enum {
    FILTERGATE_MIXER_ROUTING_SERIES = 0,
    FILTERGATE_MIXER_ROUTING_PARALLEL,
    FILTERGATE_MIXER_ROUTING_PHASER_FILTER,
    FILTERGATE_MIXER_ROUTING_FILTER_PHASER,
    FILTERGATE_MIXER_ROUTING_STEREO_SPLIT
} FilterGateMixerRouting;

// Drive type values
typedef enum {
    FILTERGATE_DRIVE_TYPE_SOFT_CLIP = 0,
    FILTERGATE_DRIVE_TYPE_HARD_CLIP,
    FILTERGATE_DRIVE_TYPE_ASYMMETRIC,
    FILTERGATE_DRIVE_TYPE_FUZZ
} FilterGateDriveType;

#ifdef __cplusplus
}
#endif

#endif // FILTERGATE_FFI_H_INCLUDED
