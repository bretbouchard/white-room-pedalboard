/*
  ==============================================================================

    SamSamplerFFI.h
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    C bridge interface for SamSamplerDSP - FFI layer for Swift/tvOS

    This file provides a C API wrapper around the C++ SamSamplerDSP class,
    enabling integration with Swift on tvOS and other platforms.

  ==============================================================================
*/

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

//==============================================================================
// Opaque Types (C-compatible handles)
//==============================================================================

/**
 * @brief Opaque handle to SamSamplerDSP instance
 *
 * This type is used to pass C++ object pointers through C API boundary.
 * Actual definition is in the .cpp file.
 */
typedef struct SamSamplerDSPInstance SamSamplerDSPInstance;

//==============================================================================
// Lifecycle Functions
//==============================================================================

/**
 * @brief Create a new SamSamplerDSP instance
 * @return Handle to the new instance, or NULL on failure
 */
SamSamplerDSPInstance* samsampler_create(void);

/**
 * @brief Destroy a SamSamplerDSP instance
 * @param instance Handle to the instance to destroy
 */
void samsampler_destroy(SamSamplerDSPInstance* instance);

/**
 * @brief Initialize the sampler for playback
 * @param instance Handle to the sampler instance
 * @param sampleRate Sample rate in Hz
 * @param samplesPerBlock Maximum samples per block
 * @return true on success, false on failure
 */
bool samsampler_initialize(SamSamplerDSPInstance* instance, double sampleRate, int samplesPerBlock);

//==============================================================================
// Audio Processing Functions
//==============================================================================

/**
 * @brief Process a block of audio
 * @param instance Handle to the sampler instance
 * @param output Output audio buffer (interleaved stereo)
 * @param numSamples Number of samples to process
 * @param midiData MIDI message data
 * @param midiSize Size of MIDI data in bytes
 */
void samsampler_process(SamSamplerDSPInstance* instance,
                       float* output,
                       int numSamples,
                       const uint8_t* midiData,
                       int midiSize);

//==============================================================================
// Parameter Control Functions
//==============================================================================

/**
 * @brief Get the number of parameters
 * @param instance Handle to the sampler instance
 * @return Number of parameters
 */
int samsampler_get_parameter_count(SamSamplerDSPInstance* instance);

/**
 * @brief Get parameter value
 * @param instance Handle to the sampler instance
 * @param parameterId Parameter ID (null-terminated string)
 * @return Current parameter value (0.0 to 1.0)
 */
float samsampler_get_parameter_value(SamSamplerDSPInstance* instance, const char* parameterId);

/**
 * @brief Set parameter value
 * @param instance Handle to the sampler instance
 * @param parameterId Parameter ID (null-terminated string)
 * @param value New parameter value (0.0 to 1.0)
 * @return true on success, false on failure
 */
bool samsampler_set_parameter_value(SamSamplerDSPInstance* instance,
                                   const char* parameterId,
                                   float value);

//==============================================================================
// Sample Layer Functions
//==============================================================================

/**
 * @brief Get the number of sample layers
 * @param instance Handle to the sampler instance
 * @return Number of layers
 */
int samsampler_get_layer_count(SamSamplerDSPInstance* instance);

/**
 * @brief Load a sample layer
 * @param instance Handle to the sampler instance
 * @param layerIndex Layer index (0-based)
 * @param samplePath Path to sample file (null-terminated string)
 * @param rootNote Root MIDI note number (e.g., 60 = C4)
 * @return true on success, false on failure
 */
bool samsampler_load_layer(SamSamplerDSPInstance* instance,
                          int layerIndex,
                          const char* samplePath,
                          double rootNote);

/**
 * @brief Set velocity range for a layer
 * @param instance Handle to the sampler instance
 * @param layerIndex Layer index (0-based)
 * @param minVel Minimum velocity (0-127)
 * @param maxVel Maximum velocity (0-127)
 * @return true on success, false on failure
 */
bool samsampler_set_layer_velocity_range(SamSamplerDSPInstance* instance,
                                        int layerIndex,
                                        int minVel,
                                        int maxVel);

/**
 * @brief Enable or disable a layer
 * @param instance Handle to the sampler instance
 * @param layerIndex Layer index (0-based)
 * @param enable true to enable, false to disable
 * @return true on success, false on failure
 */
bool samsampler_enable_layer(SamSamplerDSPInstance* instance, int layerIndex, bool enable);

//==============================================================================
// Granular Functions
//==============================================================================

/**
 * @brief Enable or disable granular mode
 * @param instance Handle to the sampler instance
 * @param enable true to enable granular, false to disable
 * @return true on success, false on failure
 */
bool samsampler_enable_granular(SamSamplerDSPInstance* instance, bool enable);

/**
 * @brief Set grain size in milliseconds
 * @param instance Handle to the sampler instance
 * @param sizeMs Grain size in milliseconds (1.0 to 500.0)
 * @return true on success, false on failure
 */
bool samsampler_set_grain_size(SamSamplerDSPInstance* instance, float sizeMs);

/**
 * @brief Set grain density (grains per second)
 * @param instance Handle to the sampler instance
 * @param density Grain density (1.0 to 100.0)
 * @return true on success, false on failure
 */
bool samsampler_set_grain_density(SamSamplerDSPInstance* instance, float density);

/**
 * @brief Set grain pitch shift
 * @param instance Handle to the sampler instance
 * @param pitch Pitch multiplier (0.5 to 2.0)
 * @return true on success, false on failure
 */
bool samsampler_set_grain_pitch(SamSamplerDSPInstance* instance, float pitch);

//==============================================================================
// Preset Functions
//==============================================================================

/**
 * @brief Save current state to JSON
 * @param instance Handle to the sampler instance
 * @param jsonBuffer Buffer to receive JSON string
 * @param jsonBufferSize Size of JSON buffer
 * @return Number of bytes written, or -1 on failure
 */
int samsampler_save_preset(SamSamplerDSPInstance* instance,
                          char* jsonBuffer,
                          int jsonBufferSize);

/**
 * @brief Load state from JSON
 * @param instance Handle to the sampler instance
 * @param jsonData JSON preset data (null-terminated string)
 * @return true on success, false on failure
 */
bool samsampler_load_preset(SamSamplerDSPInstance* instance, const char* jsonData);

/**
 * @brief Validate preset JSON
 * @param instance Handle to the sampler instance
 * @param jsonData JSON preset data (null-terminated string)
 * @return true if valid, false otherwise
 */
bool samsampler_validate_preset(SamSamplerDSPInstance* instance, const char* jsonData);

/**
 * @brief Get preset metadata
 * @param instance Handle to the sampler instance
 * @param jsonData JSON preset data (null-terminated string)
 * @param nameBuffer Buffer to receive preset name
 * @param nameBufferSize Size of name buffer
 * @param categoryBuffer Buffer to receive preset category
 * @param categoryBufferSize Size of category buffer
 * @param descriptionBuffer Buffer to receive preset description
 * @param descriptionBufferSize Size of description buffer
 * @return true on success, false on failure
 */
bool samsampler_get_preset_info(SamSamplerDSPInstance* instance,
                               const char* jsonData,
                               char* nameBuffer,
                               int nameBufferSize,
                               char* categoryBuffer,
                               int categoryBufferSize,
                               char* descriptionBuffer,
                               int descriptionBufferSize);

//==============================================================================
// Factory Presets Functions
//==============================================================================

/**
 * @brief Get the number of factory presets
 * @param instance Handle to the sampler instance
 * @return Number of factory presets
 */
int samsampler_get_factory_preset_count(SamSamplerDSPInstance* instance);

/**
 * @brief Get factory preset name by index
 * @param instance Handle to the sampler instance
 * @param index Preset index (0-based)
 * @param nameBuffer Buffer to receive preset name
 * @param nameBufferSize Size of name buffer
 * @return true on success, false on failure
 */
bool samsampler_get_factory_preset_name(SamSamplerDSPInstance* instance,
                                       int index,
                                       char* nameBuffer,
                                       int nameBufferSize);

/**
 * @brief Load factory preset by index
 * @param instance Handle to the sampler instance
 * @param index Preset index (0-based)
 * @return true on success, false on failure
 */
bool samsampler_load_factory_preset(SamSamplerDSPInstance* instance, int index);

//==============================================================================
// Utility Functions
//==============================================================================

/**
 * @brief Get sampler version string
 * @return Version string (e.g., "3.0")
 */
const char* samsampler_get_version(void);

/**
 * @brief Get last error message
 * @param instance Handle to the sampler instance
 * @return Error message string, or NULL if no error
 */
const char* samsampler_get_last_error(SamSamplerDSPInstance* instance);

/**
 * @brief Clear last error message
 * @param instance Handle to the sampler instance
 */
void samsampler_clear_last_error(SamSamplerDSPInstance* instance);

#ifdef __cplusplus
}
#endif
