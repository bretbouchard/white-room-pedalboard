/*
  DSPBridge.cpp - iOS AUv3 Bridge Implementation

  This file provides a minimal C wrapper around LocalGalPureDSP for iOS AUv3.
  In production, this would include the full DSP implementation.
*/

#include "DSPBridge.h"
#include <cstdlib>
#include <cstring>
#include <cmath>

// Minimal implementation structure
struct LocalGalDSPInstance {
    double sampleRate;
    float* tempBuffer;
    int bufferSize;

    // Feel vector state
    struct {
        float rubber;
        float bite;
        float hollow;
        float growl;
        float wet;
    } feelVector;

    // Basic parameters
    float masterVolume;
    float oscWaveform;
    float filterCutoff;
    float filterResonance;
};

LocalGalDSPInstance* localgal_create(void) {
    auto* instance = new LocalGalDSPInstance();
    instance->sampleRate = 48000.0;
    instance->bufferSize = 512;
    instance->tempBuffer = (float*)malloc(instance->bufferSize * sizeof(float));

    // Initialize defaults
    instance->feelVector.rubber = 0.5f;
    instance->feelVector.bite = 0.5f;
    instance->feelVector.hollow = 0.5f;
    instance->feelVector.growl = 0.3f;
    instance->feelVector.wet = 0.0f;
    instance->masterVolume = 0.8f;
    instance->oscWaveform = 1.0f;
    instance->filterCutoff = 0.5f;
    instance->filterResonance = 0.7f;

    return instance;
}

void localgal_destroy(LocalGalDSPInstance* instance) {
    if (instance) {
        if (instance->tempBuffer) {
            free(instance->tempBuffer);
        }
        delete instance;
    }
}

bool localgal_initialize(LocalGalDSPInstance* instance, double sampleRate, int samplesPerBlock) {
    if (!instance) return false;

    instance->sampleRate = sampleRate;

    if (instance->tempBuffer) {
        free(instance->tempBuffer);
    }
    instance->bufferSize = samplesPerBlock;
    instance->tempBuffer = (float*)malloc(samplesPerBlock * sizeof(float));

    return instance->tempBuffer != nullptr;
}

void localgal_process(LocalGalDSPInstance* instance,
                      float* outputLeft,
                      float* outputRight,
                      int numSamples) {
    if (!instance || !outputLeft || !outputRight) return;

    // Silence for now - in production, actual DSP would run here
    memset(outputLeft, 0, numSamples * sizeof(float));
    memset(outputRight, 0, numSamples * sizeof(float));
}

void localgal_note_on(LocalGalDSPInstance* instance, int note, float velocity) {
    // TODO: Implement actual note triggering
}

void localgal_note_off(LocalGalDSPInstance* instance, int note) {
    // TODO: Implement actual note release
}

void localgal_all_notes_off(LocalGalDSPInstance* instance) {
    // TODO: Implement panic
}

// Parameters (simplified for demo)
struct ParameterInfo {
    const char* id;
    const char* name;
    float min;
    float max;
    float def;
};

static const ParameterInfo parameters[] = {
    {"master_volume", "Master Volume", 0.0f, 1.0f, 0.8f},
    {"osc_waveform", "Oscillator Waveform", 0.0f, 4.0f, 1.0f},
    {"filter_cutoff", "Filter Cutoff", 0.0f, 1.0f, 0.5f},
    {"filter_resonance", "Filter Resonance", 0.0f, 1.0f, 0.7f},
    {"feel_rubber", "Feel Rubber", 0.0f, 1.0f, 0.5f},
    {"feel_bite", "Feel Bite", 0.0f, 1.0f, 0.5f},
    {"feel_hollow", "Feel Hollow", 0.0f, 1.0f, 0.5f},
    {"feel_growl", "Feel Growl", 0.0f, 1.0f, 0.3f},
};

int localgal_get_parameter_count(LocalGalDSPInstance* instance) {
    return sizeof(parameters) / sizeof(parameters[0]);
}

const char* localgal_get_parameter_id(LocalGalDSPInstance* instance, int index) {
    if (index >= 0 && index < (int)(sizeof(parameters) / sizeof(parameters[0]))) {
        return parameters[index].id;
    }
    return "";
}

const char* localgal_get_parameter_name(LocalGalDSPInstance* instance, int index) {
    if (index >= 0 && index < (int)(sizeof(parameters) / sizeof(parameters[0]))) {
        return parameters[index].name;
    }
    return "";
}

float localgal_get_parameter_value(LocalGalDSPInstance* instance, const char* parameterId) {
    if (!instance || !parameterId) return 0.0f;

    if (strcmp(parameterId, "master_volume") == 0) return instance->masterVolume;
    if (strcmp(parameterId, "osc_waveform") == 0) return instance->oscWaveform;
    if (strcmp(parameterId, "filter_cutoff") == 0) return instance->filterCutoff;
    if (strcmp(parameterId, "filter_resonance") == 0) return instance->filterResonance;
    if (strcmp(parameterId, "feel_rubber") == 0) return instance->feelVector.rubber;
    if (strcmp(parameterId, "feel_bite") == 0) return instance->feelVector.bite;
    if (strcmp(parameterId, "feel_hollow") == 0) return instance->feelVector.hollow;
    if (strcmp(parameterId, "feel_growl") == 0) return instance->feelVector.growl;

    return 0.0f;
}

void localgal_set_parameter_value(LocalGalDSPInstance* instance, const char* parameterId, float value) {
    if (!instance || !parameterId) return;

    if (strcmp(parameterId, "master_volume") == 0) instance->masterVolume = value;
    else if (strcmp(parameterId, "osc_waveform") == 0) instance->oscWaveform = value;
    else if (strcmp(parameterId, "filter_cutoff") == 0) instance->filterCutoff = value;
    else if (strcmp(parameterId, "filter_resonance") == 0) instance->filterResonance = value;
    else if (strcmp(parameterId, "feel_rubber") == 0) instance->feelVector.rubber = value;
    else if (strcmp(parameterId, "feel_bite") == 0) instance->feelVector.bite = value;
    else if (strcmp(parameterId, "feel_hollow") == 0) instance->feelVector.hollow = value;
    else if (strcmp(parameterId, "feel_growl") == 0) instance->feelVector.growl = value;
}

float localgal_get_parameter_min(LocalGalDSPInstance* instance, const char* parameterId) {
    for (const auto& param : parameters) {
        if (strcmp(param.id, parameterId) == 0) return param.min;
    }
    return 0.0f;
}

float localgal_get_parameter_max(LocalGalDSPInstance* instance, const char* parameterId) {
    for (const auto& param : parameters) {
        if (strcmp(param.id, parameterId) == 0) return param.max;
    }
    return 1.0f;
}

float localgal_get_parameter_default(LocalGalDSPInstance* instance, const char* parameterId) {
    for (const auto& param : parameters) {
        if (strcmp(param.id, parameterId) == 0) return param.def;
    }
    return 0.0f;
}

void localgal_set_feel_vector(LocalGalDSPInstance* instance,
                              float rubber, float bite, float hollow,
                              float growl, float wet) {
    if (!instance) return;
    instance->feelVector.rubber = rubber;
    instance->feelVector.bite = bite;
    instance->feelVector.hollow = hollow;
    instance->feelVector.growl = growl;
    instance->feelVector.wet = wet;
}

void localgal_get_feel_vector(LocalGalDSPInstance* instance,
                              float* rubber, float* bite, float* hollow,
                              float* growl, float* wet) {
    if (!instance) return;
    if (rubber) *rubber = instance->feelVector.rubber;
    if (bite) *bite = instance->feelVector.bite;
    if (hollow) *hollow = instance->feelVector.hollow;
    if (growl) *growl = instance->feelVector.growl;
    if (wet) *wet = instance->feelVector.wet;
}

// Presets (simplified for demo)
static const char* factoryPresets[] = {
    "Init",
    "Soft",
    "Bright",
    "Warm",
    "Aggressive"
};

int localgal_save_preset(LocalGalDSPInstance* instance, char* jsonBuffer, int jsonBufferSize) {
    if (!instance || !jsonBuffer) return -1;

    // Minimal JSON preset
    const char* presetTemplate = "{\"name\":\"Custom\",\"feel\":[%.2f,%.2f,%.2f,%.2f,%.2f]}";
    int written = snprintf(jsonBuffer, jsonBufferSize, presetTemplate,
                          instance->feelVector.rubber,
                          instance->feelVector.bite,
                          instance->feelVector.hollow,
                          instance->feelVector.growl,
                          instance->feelVector.wet);
    return (written < jsonBufferSize) ? written : -1;
}

bool localgal_load_preset(LocalGalDSPInstance* instance, const char* jsonData) {
    // TODO: Parse JSON and load preset
    return false;
}

int localgal_get_factory_preset_count(LocalGalDSPInstance* instance) {
    return sizeof(factoryPresets) / sizeof(factoryPresets[0]);
}

bool localgal_get_factory_preset_name(LocalGalDSPInstance* instance, int index, char* nameBuffer, int nameBufferSize) {
    if (index < 0 || index >= (int)(sizeof(factoryPresets) / sizeof(factoryPresets[0]))) {
        return false;
    }
    if (nameBuffer && nameBufferSize > 0) {
        strncpy(nameBuffer, factoryPresets[index], nameBufferSize - 1);
        nameBuffer[nameBufferSize - 1] = '\0';
        return true;
    }
    return false;
}

bool localgal_load_factory_preset(LocalGalDSPInstance* instance, int index) {
    // TODO: Load factory preset
    return false;
}

void localgal_reset(LocalGalDSPInstance* instance) {
    if (!instance) return;
    // Reset all voices
}

int localgal_get_active_voices(LocalGalDSPInstance* instance) {
    // TODO: Return actual active voice count
    return 0;
}
