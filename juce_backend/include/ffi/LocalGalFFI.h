/*
  ==============================================================================

    LocalGalFFI.h
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    C bridge interface for LocalGalDSP - FFI layer for Swift/tvOS

    This file provides a C API wrapper around the C++ LocalGalDSP class,
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
 * @brief Opaque handle to LocalGalDSP instance
 *
 * This type is used to pass C++ object pointers through C API boundary.
 * Actual definition is in the .cpp file.
 */
typedef struct LocalGalDSPInstance LocalGalDSPInstance;

//==============================================================================
// Lifecycle Functions
//==============================================================================

/**
 * @brief Create a new LocalGalDSP instance
 * @return Handle to the new instance, or NULL on failure
 */
LocalGalDSPInstance* localgal_create(void);

/**
 * @brief Destroy a LocalGalDSP instance
 * @param instance Handle to the instance to destroy
 */
void localgal_destroy(LocalGalDSPInstance* instance);

/**
 * @brief Initialize the synth for playback
 * @param instance Handle to the synth instance
 * @param sampleRate Sample rate in Hz
 * @param samplesPerBlock Maximum samples per block
 * @return true on success, false on failure
 */
bool localgal_initialize(LocalGalDSPInstance* instance, double sampleRate, int samplesPerBlock);

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
void localgal_process(LocalGalDSPInstance* instance,
                      float* output,
                      int numSamples,
                      const uint8_t* midiData,
                      int midiSize);

//==============================================================================
// Parameter Control Functions
//==============================================================================

/**
 * @brief Get the number of parameters
 * @param instance Handle to the synth instance
 * @return Number of parameters
 */
int localgal_get_parameter_count(LocalGalDSPInstance* instance);

/**
 * @brief Get parameter value
 * @param instance Handle to the synth instance
 * @param parameterId Parameter ID (null-terminated string)
 * @return Current parameter value (0.0 to 1.0)
 */
float localgal_get_parameter_value(LocalGalDSPInstance* instance, const char* parameterId);

/**
 * @brief Set parameter value
 * @param instance Handle to the synth instance
 * @param parameterId Parameter ID (null-terminated string)
 * @param value New parameter value (0.0 to 1.0)
 * @return true on success, false on failure
 */
bool localgal_set_parameter_value(LocalGalDSPInstance* instance,
                                  const char* parameterId,
                                  float value);

//==============================================================================
// Feel Vector Functions
//==============================================================================

/**
 * @brief Set feel vector for all voices
 * @param instance Handle to the synth instance
 * @param rubber Rubber value (0.0 to 1.0) - glide & timing
 * @param bite Bite value (0.0 to 1.0) - filter resonance & brightness
 * @param hollow Hollow value (0.0 to 1.0) - filter cutoff & warmth
 * @param growl Growl value (0.0 to 1.0) - drive & saturation
 * @param wet Wet value (0.0 to 1.0) - effects mix (reserved)
 * @return true on success, false on failure
 */
bool localgal_set_feel_vector(LocalGalDSPInstance* instance,
                              float rubber,
                              float bite,
                              float hollow,
                              float growl,
                              float wet);

/**
 * @brief Get current feel vector
 * @param instance Handle to the synth instance
 * @param rubber Pointer to receive rubber value
 * @param bite Pointer to receive bite value
 * @param hollow Pointer to receive hollow value
 * @param growl Pointer to receive growl value
 * @param wet Pointer to receive wet value
 * @return true on success, false on failure
 */
bool localgal_get_feel_vector(LocalGalDSPInstance* instance,
                              float* rubber,
                              float* bite,
                              float* hollow,
                              float* growl,
                              float* wet);

/**
 * @brief Get the number of feel vector presets
 * @param instance Handle to the synth instance
 * @return Number of feel vector presets
 */
int localgal_get_feel_preset_count(LocalGalDSPInstance* instance);

/**
 * @brief Get feel vector preset name by index
 * @param instance Handle to the synth instance
 * @param index Preset index (0-based)
 * @param nameBuffer Buffer to receive preset name
 * @param nameBufferSize Size of name buffer
 * @return true on success, false on failure
 */
bool localgal_get_feel_preset_name(LocalGalDSPInstance* instance,
                                  int index,
                                  char* nameBuffer,
                                  int nameBufferSize);

/**
 * @brief Load feel vector preset by name
 * @param instance Handle to the synth instance
 * @param presetName Preset name (null-terminated string)
 * @return true on success, false on failure
 */
bool localgal_load_feel_preset(LocalGalDSPInstance* instance, const char* presetName);

//==============================================================================
// Pattern Sequencer Functions
//==============================================================================

/**
 * @brief Set pattern length in steps
 * @param instance Handle to the synth instance
 * @param length Pattern length (1-64 steps)
 * @return true on success, false on failure
 */
bool localgal_set_pattern_length(LocalGalDSPInstance* instance, int length);

/**
 * @brief Set pattern step data
 * @param instance Handle to the synth instance
 * @param stepIndex Step index (0-based)
 * @param midiNote MIDI note number (0-127)
 * @param gate Gate enabled (true/false)
 * @param velocity Note velocity (0.0 to 1.0)
 * @param probability Note probability (0.0 to 1.0)
 * @return true on success, false on failure
 */
bool localgal_set_pattern_step(LocalGalDSPInstance* instance,
                               int stepIndex,
                               int midiNote,
                               bool gate,
                               float velocity,
                               double probability);

/**
 * @brief Enable or disable pattern playback
 * @param instance Handle to the synth instance
 * @param enable Enable pattern (true/false)
 * @return true on success, false on failure
 */
bool localgal_enable_pattern(LocalGalDSPInstance* instance, bool enable);

/**
 * @brief Set pattern tempo
 * @param instance Handle to the synth instance
 * @param bpm Tempo in beats per minute (20-300)
 * @return true on success, false on failure
 */
bool localgal_set_pattern_tempo(LocalGalDSPInstance* instance, double bpm);

/**
 * @brief Set pattern swing amount
 * @param instance Handle to the synth instance
 * @param swing Swing amount (0.0 to 1.0)
 * @return true on success, false on failure
 */
bool localgal_set_pattern_swing(LocalGalDSPInstance* instance, double swing);

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
int localgal_save_preset(LocalGalDSPInstance* instance,
                        char* jsonBuffer,
                        int jsonBufferSize);

/**
 * @brief Load state from JSON
 * @param instance Handle to the synth instance
 * @param jsonData JSON preset data (null-terminated string)
 * @return true on success, false on failure
 */
bool localgal_load_preset(LocalGalDSPInstance* instance, const char* jsonData);

/**
 * @brief Validate preset JSON
 * @param instance Handle to the synth instance
 * @param jsonData JSON preset data (null-terminated string)
 * @return true if valid, false otherwise
 */
bool localgal_validate_preset(LocalGalDSPInstance* instance, const char* jsonData);

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
bool localgal_get_preset_info(LocalGalDSPInstance* instance,
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
int localgal_get_factory_preset_count(LocalGalDSPInstance* instance);

/**
 * @brief Get factory preset name by index
 * @param instance Handle to the synth instance
 * @param index Preset index (0-based)
 * @param nameBuffer Buffer to receive preset name
 * @param nameBufferSize Size of name buffer
 * @return true on success, false on failure
 */
bool localgal_get_factory_preset_name(LocalGalDSPInstance* instance,
                                     int index,
                                     char* nameBuffer,
                                     int nameBufferSize);

/**
 * @brief Load factory preset by index
 * @param instance Handle to the synth instance
 * @param index Preset index (0-based)
 * @return true on success, false on failure
 */
bool localgal_load_factory_preset(LocalGalDSPInstance* instance, int index);

//==============================================================================
// Parameter Morphing Functions
//==============================================================================

/**
 * @brief Set morph position between two parameter sets
 * @param instance Handle to the synth instance
 * @param position Morph position (0.0 = preset A, 1.0 = preset B)
 * @return true on success, false on failure
 */
bool localgal_set_morph_position(LocalGalDSPInstance* instance, float position);

/**
 * @brief Get current morph position
 * @param instance Handle to the synth instance
 * @return Current morph position (0.0 to 1.0)
 */
float localgal_get_morph_position(LocalGalDSPInstance* instance);

//==============================================================================
// Utility Functions
//==============================================================================

/**
 * @brief Get synth version string
 * @return Version string (e.g., "1.0.0")
 */
const char* localgal_get_version(void);

/**
 * @brief Get last error message
 * @param instance Handle to the synth instance
 * @return Error message string, or NULL if no error
 */
const char* localgal_get_last_error(LocalGalDSPInstance* instance);

/**
 * @brief Clear last error message
 * @param instance Handle to the synth instance
 */
void localgal_clear_last_error(LocalGalDSPInstance* instance);

#ifdef __cplusplus
}
#endif
