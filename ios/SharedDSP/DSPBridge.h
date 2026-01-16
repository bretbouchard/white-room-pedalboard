/*
  DSPBridge.h - iOS AUv3 Bridge for LocalGal DSP

  This header provides a C interface for Swift to interact with the C++ DSP.
  Designed for iOS AUv3 extension sandbox constraints.
*/

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct LocalGalDSPInstance LocalGalDSPInstance;

// Lifecycle
LocalGalDSPInstance* localgal_create(void);
void localgal_destroy(LocalGalDSPInstance* instance);

bool localgal_initialize(LocalGalDSPInstance* instance, double sampleRate, int samplesPerBlock);

// Audio Processing
void localgal_process(LocalGalDSPInstance* instance,
                      float* outputLeft,
                      float* outputRight,
                      int numSamples);

// MIDI
void localgal_note_on(LocalGalDSPInstance* instance, int note, float velocity);
void localgal_note_off(LocalGalDSPInstance* instance, int note);
void localgal_all_notes_off(LocalGalDSPInstance* instance);

// Parameters
int localgal_get_parameter_count(LocalGalDSPInstance* instance);
const char* localgal_get_parameter_id(LocalGalDSPInstance* instance, int index);
const char* localgal_get_parameter_name(LocalGalDSPInstance* instance, int index);
float localgal_get_parameter_value(LocalGalDSPInstance* instance, const char* parameterId);
void localgal_set_parameter_value(LocalGalDSPInstance* instance, const char* parameterId, float value);
float localgal_get_parameter_min(LocalGalDSPInstance* instance, const char* parameterId);
float localgal_get_parameter_max(LocalGalDSPInstance* instance, const char* parameterId);
float localgal_get_parameter_default(LocalGalDSPInstance* instance, const char* parameterId);

// Feel Vector (5D control system)
void localgal_set_feel_vector(LocalGalDSPInstance* instance,
                              float rubber,
                              float bite,
                              float hollow,
                              float growl,
                              float wet);

void localgal_get_feel_vector(LocalGalDSPInstance* instance,
                              float* rubber,
                              float* bite,
                              float* hollow,
                              float* growl,
                              float* wet);

// Presets
int localgal_save_preset(LocalGalDSPInstance* instance, char* jsonBuffer, int jsonBufferSize);
bool localgal_load_preset(LocalGalDSPInstance* instance, const char* jsonData);
int localgal_get_factory_preset_count(LocalGalDSPInstance* instance);
bool localgal_get_factory_preset_name(LocalGalDSPInstance* instance, int index, char* nameBuffer, int nameBufferSize);
bool localgal_load_factory_preset(LocalGalDSPInstance* instance, int index);

// State
void localgal_reset(LocalGalDSPInstance* instance);
int localgal_get_active_voices(LocalGalDSPInstance* instance);

#ifdef __cplusplus
}
#endif
