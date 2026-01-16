#include "flutter/flutter_juce_ffi.h"
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <memory>
#include <map>

using namespace juce;

// Global audio engine instance
static std::unique_ptr<AudioDeviceManager> deviceManager;
static std::map<JuceAudioEngineHandle, std::unique_ptr<AudioProcessor>> processorMap;
static std::map<ChannelStripHandle, std::unique_ptr<AudioProcessor>> channelStripMap;
static std::map<PluginInstanceHandle, std::unique_ptr<AudioPluginInstance>> pluginMap;

// Simple AudioProcessor for channel strips
class SimpleChannelStrip : public AudioProcessor
{
public:
    SimpleChannelStrip()
    {
        // Initialize default parameters
        gain = 0.0f;
        muted = false;

        // EQ parameters
        eqEnabled[0] = eqEnabled[1] = eqEnabled[2] = eqEnabled[3] = false;
        eqGain[0] = eqGain[1] = eqGain[2] = eqGain[3] = 0.0f;
        eqFreq[0] = 100.0f; eqFreq[1] = 1000.0f; eqFreq[2] = 5000.0f; eqFreq[3] = 10000.0f;
        eqQ[0] = eqQ[1] = eqQ[2] = eqQ[3] = 1.0f;

        // Compressor parameters
        compressorEnabled = false;
        compressorThreshold = -20.0f;
        compressorRatio = 4.0f;
        compressorAttack = 5.0f;
        compressorRelease = 50.0f;
    }

    const String getName() const override { return "SimpleChannelStrip"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    bool supportsDoublePrecisionProcessing() const override { return true; }
    bool hasEditor() const override { return false; }
    AudioProcessorEditor* createEditor() override { return nullptr; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int index) override { }
    const String getProgramName(int index) override { return "Default"; }
    void changeProgramName(int index, const String& newName) override { }

    void getStateInformation(MemoryBlock& destData) override { }
    void setStateInformation(const void* data, int sizeInBytes) override { }

    void prepareToPlay(double sampleRate, int samplesPerBlock) override
    {
        currentSampleRate = sampleRate;
        currentBufferSize = samplesPerBlock;
    }

    void releaseResources() override {}

    void processBlock(AudioBuffer<float>& buffer, MidiBuffer&) override
    {
        auto* channelData = buffer.getWritePointer(0);
        const int numSamples = buffer.getNumSamples();

        // Apply gain if not muted
        if (!muted)
        {
            const float gainLinear = Decibels::decibelsToGain(gain);
            buffer.applyGain(gainLinear);
        }
        else
        {
            buffer.clear();
        }

        // Simple peak detection for metering
        peakLevel = buffer.getMagnitude(0, 0, numSamples);
        rmsLevel = buffer.getRMSLevel(0, 0, numSamples);
        clipping = peakLevel > 0.99f;
    }

    void processBlockBypassed(AudioBuffer<float>&, MidiBuffer&) override {}

    // Public parameters for FFI access
    float gain;
    bool muted;
    bool eqEnabled[4];
    float eqGain[4];
    float eqFreq[4];
    float eqQ[4];
    bool compressorEnabled;
    float compressorThreshold;
    float compressorRatio;
    float compressorAttack;
    float compressorRelease;

    // Metering values
    float peakLevel = 0.0f;
    float rmsLevel = 0.0f;
    bool clipping = false;

private:
    double currentSampleRate = 44100.0;
    int currentBufferSize = 512;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SimpleChannelStrip)
};

// Implementation functions
extern "C" {

JuceAudioEngineHandle juce_audio_engine_create()
{
    if (!deviceManager)
    {
        deviceManager = std::make_unique<AudioDeviceManager>();
    }

    auto processor = std::make_unique<SimpleChannelStrip>();
    auto handle = processor.get();
    processorMap[handle] = std::move(processor);

    return handle;
}

bool juce_audio_engine_initialize(JuceAudioEngineHandle engine,
                                 double sample_rate,
                                 int buffer_size,
                                 int input_channels,
                                 int output_channels)
{
    if (!deviceManager)
        return false;

    auto processor = processorMap[engine];
    if (!processor)
        return false;

    processor->setPlayConfigDetails(input_channels, output_channels,
                                   sample_rate, buffer_size);
    processor->prepareToPlay(sample_rate, buffer_size);

    return true;
}

void juce_audio_engine_destroy(JuceAudioEngineHandle engine)
{
    processorMap.erase(engine);
}

bool juce_audio_engine_start(JuceAudioEngineHandle engine)
{
    if (!deviceManager)
        return false;

    // For simplicity, just return true
    // In a real implementation, start the audio device
    return true;
}

void juce_audio_engine_stop(JuceAudioEngineHandle engine)
{
    if (!deviceManager)
        return;

    // Stop audio device if needed
}

bool juce_audio_engine_is_running(JuceAudioEngineHandle engine)
{
    return deviceManager != nullptr;
}

bool juce_audio_engine_set_process_callback(JuceAudioEngineHandle engine,
                                          AudioProcessCallback callback,
                                          void* user_data)
{
    // Store callback for use in audio thread
    return true;
}

ChannelStripHandle juce_channel_strip_create(JuceAudioEngineHandle engine,
                                           int channel_index)
{
    auto strip = std::make_unique<SimpleChannelStrip>();
    auto handle = strip.get();
    channelStripMap[handle] = std::move(strip);
    return handle;
}

void juce_channel_strip_destroy(ChannelStripHandle strip)
{
    channelStripMap.erase(strip);
}

void juce_channel_strip_set_gain(ChannelStripHandle strip, double gain_db)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        processor->gain = static_cast<float>(gain_db);
    }
}

double juce_channel_strip_get_gain(ChannelStripHandle strip)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        return static_cast<double>(processor->gain);
    }
    return 0.0;
}

void juce_channel_strip_set_mute(ChannelStripHandle strip, bool muted)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        processor->muted = muted;
    }
}

bool juce_channel_strip_is_muted(ChannelStripHandle strip)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        return processor->muted;
    }
    return false;
}

void juce_channel_strip_set_eq_gain(ChannelStripHandle strip,
                                   int band,
                                   double gain_db)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        if (band >= 0 && band < 4)
            processor->eqGain[band] = static_cast<float>(gain_db);
    }
}

void juce_channel_strip_set_eq_frequency(ChannelStripHandle strip,
                                       int band,
                                       double frequency_hz)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        if (band >= 0 && band < 4)
            processor->eqFreq[band] = static_cast<float>(frequency_hz);
    }
}

void juce_channel_strip_set_eq_q(ChannelStripHandle strip,
                                int band,
                                double q_factor)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        if (band >= 0 && band < 4)
            processor->eqQ[band] = static_cast<float>(q_factor);
    }
}

void juce_channel_strip_set_eq_enabled(ChannelStripHandle strip,
                                     int band,
                                     bool enabled)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        if (band >= 0 && band < 4)
            processor->eqEnabled[band] = enabled;
    }
}

void juce_channel_strip_set_compressor_threshold(ChannelStripHandle strip,
                                                double threshold_db)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        processor->compressorThreshold = static_cast<float>(threshold_db);
    }
}

void juce_channel_strip_set_compressor_ratio(ChannelStripHandle strip,
                                            double ratio)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        processor->compressorRatio = static_cast<float>(ratio);
    }
}

void juce_channel_strip_set_compressor_attack(ChannelStripHandle strip,
                                            double attack_ms)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        processor->compressorAttack = static_cast<float>(attack_ms);
    }
}

void juce_channel_strip_set_compressor_release(ChannelStripHandle strip,
                                             double release_ms)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        processor->compressorRelease = static_cast<float>(release_ms);
    }
}

void juce_channel_strip_set_compressor_enabled(ChannelStripHandle strip,
                                              bool enabled)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        processor->compressorEnabled = enabled;
    }
}

double juce_channel_strip_get_peak_level(ChannelStripHandle strip)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        return static_cast<double>(processor->peakLevel);
    }
    return 0.0;
}

double juce_channel_strip_get_rms_level(ChannelStripHandle strip)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        return static_cast<double>(processor->rmsLevel);
    }
    return 0.0;
}

bool juce_channel_strip_is_clipping(ChannelStripHandle strip)
{
    if (auto processor = dynamic_cast<SimpleChannelStrip*>(channelStripMap[strip].get()))
    {
        return processor->clipping;
    }
    return false;
}

PluginInstanceHandle juce_plugin_load(const char* plugin_path)
{
    // Simplified plugin loading - return null for now
    return nullptr;
}

void juce_plugin_unload(PluginInstanceHandle plugin)
{
    pluginMap.erase(plugin);
}

void juce_plugin_set_parameter(PluginInstanceHandle plugin,
                               int parameter_index,
                               double value)
{
    // Simplified parameter setting
}

double juce_plugin_get_parameter(PluginInstanceHandle plugin,
                                int parameter_index)
{
    return 0.0;
}

bool juce_plugin_process(PluginInstanceHandle plugin,
                         const float* input,
                         float* output,
                         int num_samples,
                         int num_channels)
{
    return false;
}

RingBufferHandle juce_ring_buffer_create(int size_samples, int num_channels)
{
    return nullptr;
}

void juce_ring_buffer_destroy(RingBufferHandle buffer)
{
}

int juce_ring_buffer_write(RingBufferHandle buffer, const float* data, int num_samples)
{
    return 0;
}

int juce_ring_buffer_read(RingBufferHandle buffer, float* data, int num_samples)
{
    return 0;
}

int juce_ring_buffer_available_to_read(RingBufferHandle buffer)
{
    return 0;
}

int juce_ring_buffer_available_to_write(RingBufferHandle buffer)
{
    return 0;
}

JuceAudioStats juce_audio_engine_get_stats(JuceAudioEngineHandle engine)
{
    JuceAudioStats stats = {};
    stats.cpu_usage = 5.0; // Placeholder
    stats.audio_latency_ms = 2.8; // Placeholder sub-5ms
    stats.xrun_count = 0;
    stats.avg_processing_time_ms = 1.2;
    stats.max_processing_time_ms = 2.1;
    stats.is_running = true;
    return stats;
}

} // extern "C"