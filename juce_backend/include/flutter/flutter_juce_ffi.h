#ifndef FLUTTER_JUCE_FFI_H
#define FLUTTER_JUCE_FFI_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// Audio Engine Management
typedef void* JuceAudioEngineHandle;

JuceAudioEngineHandle juce_audio_engine_create();
bool juce_audio_engine_initialize(JuceAudioEngineHandle engine,
                                 double sample_rate,
                                 int buffer_size,
                                 int input_channels,
                                 int output_channels);
void juce_audio_engine_destroy(JuceAudioEngineHandle engine);
bool juce_audio_engine_start(JuceAudioEngineHandle engine);
void juce_audio_engine_stop(JuceAudioEngineHandle engine);
bool juce_audio_engine_is_running(JuceAudioEngineHandle engine);

// Audio Processing Callback
typedef void (*AudioProcessCallback)(const float* input,
                                   float* output,
                                   int num_samples,
                                   int num_channels,
                                   void* user_data);

bool juce_audio_engine_set_process_callback(JuceAudioEngineHandle engine,
                                          AudioProcessCallback callback,
                                          void* user_data);

// Channel Strip Management
typedef void* ChannelStripHandle;

ChannelStripHandle juce_channel_strip_create(JuceAudioEngineHandle engine,
                                           int channel_index);
void juce_channel_strip_destroy(ChannelStripHandle strip);
void juce_channel_strip_set_gain(ChannelStripHandle strip, double gain_db);
double juce_channel_strip_get_gain(ChannelStripHandle strip);
void juce_channel_strip_set_mute(ChannelStripHandle strip, bool muted);
bool juce_channel_strip_is_muted(ChannelStripHandle strip);

// EQ Parameters
void juce_channel_strip_set_eq_gain(ChannelStripHandle strip,
                                   int band,
                                   double gain_db);
void juce_channel_strip_set_eq_frequency(ChannelStripHandle strip,
                                       int band,
                                       double frequency_hz);
void juce_channel_strip_set_eq_q(ChannelStripHandle strip,
                                int band,
                                double q_factor);
void juce_channel_strip_set_eq_enabled(ChannelStripHandle strip,
                                     int band,
                                     bool enabled);

// Dynamics Processing
void juce_channel_strip_set_compressor_threshold(ChannelStripHandle strip,
                                                double threshold_db);
void juce_channel_strip_set_compressor_ratio(ChannelStripHandle strip,
                                            double ratio);
void juce_channel_strip_set_compressor_attack(ChannelStripHandle strip,
                                            double attack_ms);
void juce_channel_strip_set_compressor_release(ChannelStripHandle strip,
                                             double release_ms);
void juce_channel_strip_set_compressor_enabled(ChannelStripHandle strip,
                                              bool enabled);

// Metering
double juce_channel_strip_get_peak_level(ChannelStripHandle strip);
double juce_channel_strip_get_rms_level(ChannelStripHandle strip);
bool juce_channel_strip_is_clipping(ChannelStripHandle strip);

// Plugin Management
typedef void* PluginInstanceHandle;

PluginInstanceHandle juce_plugin_load(const char* plugin_path);
void juce_plugin_unload(PluginInstanceHandle plugin);
void juce_plugin_set_parameter(PluginInstanceHandle plugin,
                               int parameter_index,
                               double value);
double juce_plugin_get_parameter(PluginInstanceHandle plugin,
                                int parameter_index);
bool juce_plugin_process(PluginInstanceHandle plugin,
                         const float* input,
                         float* output,
                         int num_samples,
                         int num_channels);

// Shared Memory Ring Buffer
typedef void* RingBufferHandle;

RingBufferHandle juce_ring_buffer_create(int size_samples, int num_channels);
void juce_ring_buffer_destroy(RingBufferHandle buffer);
int juce_ring_buffer_write(RingBufferHandle buffer, const float* data, int num_samples);
int juce_ring_buffer_read(RingBufferHandle buffer, float* data, int num_samples);
int juce_ring_buffer_available_to_read(RingBufferHandle buffer);
int juce_ring_buffer_available_to_write(RingBufferHandle buffer);

// Performance Monitoring
typedef struct {
    double cpu_usage;
    double audio_latency_ms;
    int xrun_count;
    double avg_processing_time_ms;
    double max_processing_time_ms;
    bool is_running;
} JuceAudioStats;

JuceAudioStats juce_audio_engine_get_stats(JuceAudioEngineHandle engine);

#ifdef __cplusplus
}
#endif

#endif // FLUTTER_JUCE_FFI_H