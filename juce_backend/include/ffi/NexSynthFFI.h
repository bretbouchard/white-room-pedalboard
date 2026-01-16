/*
  ==============================================================================

    NexSynthFFI.h
    Created: 15 Jan 2025
    Author:  Bret Bouchard

    C bridge interface for NexSynthDSP - FFI layer for Swift/tvOS

    This file provides a C API wrapper around the C++ NexSynthDSP class,
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
 * @brief Opaque handle to NexSynthDSP instance
 *
 * This type is used to pass C++ object pointers through C API boundary.
 * Actual definition is in the .cpp file.
 */
typedef struct NexSynthDSPInstance NexSynthDSPInstance;

//==============================================================================
// Lifecycle Functions
//==============================================================================

/**
 * @brief Create a new NexSynthDSP instance
 * @return Handle to the new instance, or NULL on failure
 */
NexSynthDSPInstance* nexsynth_create(void);

/**
 * @brief Destroy a NexSynthDSP instance
 * @param instance Handle to the instance to destroy
 */
void nexsynth_destroy(NexSynthDSPInstance* instance);

/**
 * @brief Initialize the synth for playback
 * @param instance Handle to the synth instance
 * @param sampleRate Sample rate in Hz
 * @param samplesPerBlock Maximum samples per block
 * @return true on success, false on failure
 */
bool nexsynth_initialize(NexSynthDSPInstance* instance, double sampleRate, int samplesPerBlock);

//==============================================================================
// Audio Processing Functions
//==============================================================================

/**
 * @brief Process a block of audio
 * @param instance Handle to the synth instance
 * @param output Output audio buffer (interleaved stereo)
 * @param numSamples Number of samples to process
 * @param midiData MIDI message data
 * @param midiSize Size of MIDI data in bytes
 */
void nexsynth_process(NexSynthDSPInstance* instance,
                      float* output,
                      int numSamples,
                      const uint8_t* midiData,
                      int midiSize);

/**
 * @brief Process a block of audio with MIDI buffer
 * @param instance Handle to the synth instance
 * @param output Output audio buffer (interleaved stereo)
 * @param numSamples Number of samples to process
 * @param midiMessages Array of MIDI messages
 * @param numMessages Number of MIDI messages
 */
void nexsynth_process_midi_buffer(NexSynthDSPInstance* instance,
                                    float* output,
                                    int numSamples,
                                    const uint8_t* midiMessages,
                                    int* midiSizes,
                                    int numMessages);

//==============================================================================
// Parameter Control Functions
//==============================================================================

/**
 * @brief Get the number of parameters
 * @param instance Handle to the synth instance
 * @return Number of parameters
 */
int nexsynth_get_parameter_count(NexSynthDSPInstance* instance);

/**
 * @brief Get parameter ID by index
 * @param instance Handle to the synth instance
 * @param index Parameter index (0-based)
 * @param idBuffer Buffer to receive parameter ID
 * @param idBufferSize Size of ID buffer
 * @return true on success, false on failure
 */
bool nexsynth_get_parameter_id(NexSynthDSPInstance* instance,
                                int index,
                                char* idBuffer,
                                int idBufferSize);

/**
 * @brief Get parameter value
 * @param instance Handle to the synth instance
 * @param parameterId Parameter ID (null-terminated string)
 * @return Current parameter value (0.0 to 1.0)
 */
float nexsynth_get_parameter_value(NexSynthDSPInstance* instance, const char* parameterId);

/**
 * @brief Set parameter value
 * @param instance Handle to the synth instance
 * @param parameterId Parameter ID (null-terminated string)
 * @param value New parameter value (0.0 to 1.0)
 * @return true on success, false on failure
 */
bool nexsynth_set_parameter_value(NexSynthDSPInstance* instance,
                                  const char* parameterId,
                                  float value);

/**
 * @brief Get parameter name
 * @param instance Handle to the synth instance
 * @param parameterId Parameter ID (null-terminated string)
 * @param nameBuffer Buffer to receive parameter name
 * @param nameBufferSize Size of name buffer
 * @return true on success, false on failure
 */
bool nexsynth_get_parameter_name(NexSynthDSPInstance* instance,
                                  const char* parameterId,
                                  char* nameBuffer,
                                  int nameBufferSize);

//==============================================================================
// Preset Functions
//==============================================================================

/**
 * @brief Save current state to JSON
 * @param instance Handle to the synth instance
 * @param jsonBuffer Buffer to receive JSON string
 * @param jsonBufferSize Size of JSON buffer
 * @return Number of bytes written, or -1 on failure
 */
int nexsynth_save_preset(NexSynthDSPInstance* instance,
                          char* jsonBuffer,
                          int jsonBufferSize);

/**
 * @brief Load state from JSON
 * @param instance Handle to the synth instance
 * @param jsonData JSON preset data (null-terminated string)
 * @return true on success, false on failure
 */
bool nexsynth_load_preset(NexSynthDSPInstance* instance, const char* jsonData);

/**
 * @brief Validate preset JSON
 * @param instance Handle to the synth instance
 * @param jsonData JSON preset data (null-terminated string)
 * @return true if valid, false otherwise
 */
bool nexsynth_validate_preset(NexSynthDSPInstance* instance, const char* jsonData);

/**
 * @brief Get preset metadata
 * @param instance Handle to the synth instance
 * @param jsonData JSON preset data (null-terminated string)
 * @param nameBuffer Buffer to receive preset name
 * @param nameBufferSize Size of name buffer
 * @param categoryBuffer Buffer to receive preset category
 * @param categoryBufferSize Size of category buffer
 * @param descriptionBuffer Buffer to receive preset description
 * @param descriptionBufferSize Size of description buffer
 * @return true on success, false on failure
 */
bool nexsynth_get_preset_info(NexSynthDSPInstance* instance,
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
 * @param instance Handle to the synth instance
 * @return Number of factory presets
 */
int nexsynth_get_factory_preset_count(NexSynthDSPInstance* instance);

/**
 * @brief Get factory preset name by index
 * @param instance Handle to the synth instance
 * @param index Preset index (0-based)
 * @param nameBuffer Buffer to receive preset name
 * @param nameBufferSize Size of name buffer
 * @return true on success, false on failure
 */
bool nexsynth_get_factory_preset_name(NexSynthDSPInstance* instance,
                                       int index,
                                       char* nameBuffer,
                                       int nameBufferSize);

/**
 * @brief Load factory preset by index
 * @param instance Handle to the synth instance
 * @param index Preset index (0-based)
 * @return true on success, false on failure
 */
bool nexsynth_load_factory_preset(NexSynthDSPInstance* instance, int index);

//==============================================================================
// Utility Functions
//==============================================================================

/**
 * @brief Get synth version string
 * @return Version string (e.g., "1.0.0")
 */
const char* nexsynth_get_version(void);

/**
 * @brief Get last error message
 * @param instance Handle to the synth instance
 * @return Error message string, or NULL if no error
 */
const char* nexsynth_get_last_error(NexSynthDSPInstance* instance);

/**
 * @brief Clear last error message
 * @param instance Handle to the synth instance
 */
void nexsynth_clear_last_error(NexSynthDSPInstance* instance);

#ifdef __cplusplus
}
#endif
