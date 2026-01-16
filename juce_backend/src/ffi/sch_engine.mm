//
//  sch_engine.mm
//  White Room JUCE FFI
//
//  Function implementations for Schillinger FFI layer
//  Agent 5: Core FFI engine operations implementation
//

// Platform-specific includes
#if defined(__IPHONE_OS__) || defined(__IOS__)
    #import <UIKit/UIKit.h>
#else
    #import <AppKit/AppKit.h>
#endif

// JUCE module includes (use direct includes to avoid custom JuceHeader.h conflicts)
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_data_structures/juce_data_structures.h>
#include <juce_events/juce_events.h>
#include <juce_dsp/juce_dsp.h>


#include "sch_engine.hpp"
#include <cstring>
#include <cstdlib>

// JUCE module initialization
namespace {
    struct JUCEInitializer {
        JUCEInitializer() {
            // Initialize JUCE required modules
            juce::MessageManager::getInstance();
        }

        ~JUCEInitializer() {
            juce::MessageManager::deleteInstance();
        }
    };

    static JUCEInitializer juceInit;
}

// ============================================================================
// Internal Engine Implementation
// ============================================================================

namespace schillinger {

// Simple sine wave generator for testing
struct SineWaveGenerator : public juce::AudioSource {
    double phase = 0.0;
    double frequency = 440.0;
    double amplitude = 0.1;
    double sampleRate = 48000.0;
    bool shouldPlay = false;

    SineWaveGenerator() = default;

    void setFrequency(double freq) {
        frequency = freq;
    }

    void setAmplitude(double amp) {
        amplitude = juce::jlimit(0.0, 1.0, amp);
    }

    void prepareToPlay(int samplesPerBlock, double newSampleRate) override {
        sampleRate = newSampleRate;
    }

    void releaseResources() override {}

    void getNextAudioBlock(const juce::AudioSourceChannelInfo& buffer) override {
        if (!shouldPlay) {
            buffer.clearActiveBufferRegion();
            return;
        }

        for (int sample = 0; sample < buffer.numSamples; ++sample) {
            float sampleValue = static_cast<float>(std::sin(phase) * amplitude);

            for (int channel = 0; channel < buffer.buffer->getNumChannels(); ++channel) {
                buffer.buffer->setSample(channel, buffer.startSample + sample, sampleValue);
            }

            phase += 2.0 * juce::MathConstants<double>::pi * frequency / sampleRate;

            if (phase >= 2.0 * juce::MathConstants<double>::pi) {
                phase -= 2.0 * juce::MathConstants<double>::pi;
            }
        }
    }

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SineWaveGenerator)
};

// Internal engine structure
struct Engine {
    juce::AudioDeviceManager deviceManager;
    juce::AudioSourcePlayer audioSourcePlayer;
    std::unique_ptr<SineWaveGenerator> toneGenerator;

    // Transport state (using legacy structure)
    sch_transport_state_info_t transportState;

    // Track playing state separately
    bool isPlaying = false;

    // Audio status
    sch_audio_status_t audioStatus;

    // Parameters (simple map for now)
    juce::StringPairArray parameters;

    Engine() {
        // Initialize transport state
        transportState.state = SCH_TRANSPORT_STOPPED;
        transportState.position = 0.0;
        transportState.tempo = 120.0;
        transportState.time_signature_numerator = 4;
        transportState.time_signature_denominator = 4;
        transportState.is_recording = false;

        // Initialize audio status
        audioStatus.is_initialized = false;
        audioStatus.cpu_usage = 0.0;
        audioStatus.xrun_count = 0;
        audioStatus.config.sample_rate = 48000.0;
        audioStatus.config.buffer_size = 512;
        audioStatus.config.input_channels = 0;
        audioStatus.config.output_channels = 2;

        // Initialize some default parameters
        parameters.set("master_volume", "0.8");
        parameters.set("master_pitch", "0.0");
        parameters.set("filter_cutoff", "1000.0");
    }

    ~Engine() {
        audioSourcePlayer.setSource(nullptr);
        toneGenerator.reset();
        deviceManager.closeAudioDevice();
    }

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(Engine)
};

} // namespace schillinger

// ============================================================================
// C++ Engine Wrapper
// ============================================================================

namespace {
    sch_engine_internal_t* get_engine_impl(sch_engine_handle engine) {
        return reinterpret_cast<sch_engine_internal_t*>(engine);
    }

    schillinger::Engine* get_engine_internal(sch_engine_handle engine) {
        auto* impl = get_engine_impl(engine);
        return impl ? impl->engine : nullptr;
    }

    void invoke_error_callback(sch_engine_internal_t* impl, const char* message) {
        if (impl && impl->error_cb) {
            impl->error_cb(message, impl->user_data);
        }
    }

    void invoke_transport_callback(sch_engine_internal_t* impl, sch_transport_state_info_t state) {
        if (impl && impl->transport_cb) {
            impl->transport_cb(state, impl->user_data);
        }
    }

    void invoke_parameter_callback(sch_engine_internal_t* impl, const char* param_id, double value) {
        if (impl && impl->parameter_cb) {
            impl->parameter_cb(param_id, value, impl->user_data);
        }
    }
}

// ============================================================================
// C API Implementation
// ============================================================================

extern "C" {

// ============================================================================
// Engine Lifecycle
// ============================================================================

sch_result_t sch_engine_create(sch_engine_handle* out_engine) {
    if (!out_engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        // Create C++ engine
        auto* engine = new schillinger::Engine();

        // Create wrapper
        auto* impl = new sch_engine_internal_t();
        impl->engine = engine;
        impl->user_data = nullptr;
        impl->error_cb = nullptr;
        impl->transport_cb = nullptr;
        impl->parameter_cb = nullptr;

        *out_engine = reinterpret_cast<sch_engine_handle>(impl);

        DBG("SchillingerEngine: Engine created successfully");
        return SCH_OK;
    } catch (const std::exception& e) {
        std::cerr << "SchillingerEngine: Failed to create engine: " << e.what() << std::endl;
        return SCH_ERR_ENGINE_FAILED;
    }
}

sch_result_t sch_engine_destroy(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);

    try {
        // Delete C++ engine
        delete impl->engine;

        // Delete wrapper
        delete impl;

        DBG("SchillingerEngine: Engine destroyed successfully");
        return SCH_OK;
    } catch (const std::exception& e) {
        std::cerr << "SchillingerEngine: Failed to destroy engine: " << e.what() << std::endl;
        return SCH_ERR_ENGINE_FAILED;
    }
}

// ============================================================================
// Song Operations
// ============================================================================

sch_result_t sch_engine_create_default_song(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Create actual default song structure
    DBG("SchillingerEngine: Default song created (stub)");
    return SCH_OK;
}

sch_result_t sch_engine_load_song(sch_engine_handle engine, const char* json) {
    if (!engine || !json) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Parse JSON and load song
    // For now, just validate JSON syntax
    juce::var jsonVar;
    auto error = juce::JSON::parse(json, jsonVar);

    if (error.failed()) {
        invoke_error_callback(impl, "Failed to parse song JSON");
        return SCH_ERR_PARSE_FAILED;
    }

    DBG("SchillingerEngine: Song loaded from JSON (stub)");
    return SCH_OK;
}

sch_result_t sch_engine_get_song(sch_engine_handle engine, sch_string_t* out_json) {
    if (!engine || !out_json) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Get actual song data
    juce::DynamicObject::Ptr songObj = new juce::DynamicObject();
    songObj->setProperty("title", "Default Song");
    songObj->setProperty("tempo", 120.0);

    juce::var songVar(songObj);
    juce::String jsonString = juce::JSON::toString(songVar);

    // Allocate and copy string
    out_json->length = jsonString.length();
    out_json->data = static_cast<char*>(std::malloc(out_json->length + 1));
    std::strcpy(out_json->data, jsonString.toUTF8());

    return SCH_OK;
}

sch_result_t sch_engine_get_song_metadata(
    sch_engine_handle engine,
    sch_song_metadata_t* out_metadata
) {
    if (!engine || !out_metadata) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Get actual metadata
    static const char* default_title = "Default Song";
    static const char* default_artist = "Unknown Artist";

    out_metadata->title = default_title;
    out_metadata->artist = default_artist;
    out_metadata->tempo = impl->engine->transportState.tempo;
    out_metadata->time_signature_numerator = impl->engine->transportState.time_signature_numerator;
    out_metadata->time_signature_denominator = impl->engine->transportState.time_signature_denominator;

    return SCH_OK;
}

// ============================================================================
// Parameter Operations
// ============================================================================

sch_result_t sch_engine_get_parameter_value(
    sch_engine_handle engine,
    const char* parameter_id,
    sch_parameter_value_t* out_value
) {
    if (!engine || !parameter_id || !out_value) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Check if parameter exists
    if (!impl->engine->parameters.containsKey(parameter_id)) {
        return SCH_ERR_NOT_FOUND;
    }

    // Get parameter value
    juce::String valueStr = impl->engine->parameters.getValue(parameter_id, "0.0");
    double value = valueStr.getDoubleValue();

    out_value->value = value;
    out_value->is_valid = true;

    return SCH_OK;
}

sch_result_t sch_engine_set_parameter_value(
    sch_engine_handle engine,
    const char* parameter_id,
    double value
) {
    if (!engine || !parameter_id) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Set parameter value
    impl->engine->parameters.set(parameter_id, juce::String(value));

    // Invoke callback
    invoke_parameter_callback(impl, parameter_id, value);

    DBG("SchillingerEngine: Parameter " << parameter_id << " set to " << value);
    return SCH_OK;
}

sch_result_t sch_engine_set_parameter_batch(
    sch_engine_handle engine,
    const sch_parameter_batch_t* batch
) {
    if (!engine || !batch || !batch->parameter_ids || !batch->values) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Set each parameter
    for (size_t i = 0; i < batch->count; ++i) {
        const char* param_id = batch->parameter_ids[i];
        double value = batch->values[i];

        impl->engine->parameters.set(param_id, juce::String(value));
        invoke_parameter_callback(impl, param_id, value);
    }

    DBG("SchillingerEngine: Batch set " << batch->count << " parameters");
    return SCH_OK;
}

sch_result_t sch_engine_list_parameters(
    sch_engine_handle engine,
    char*** out_ids,
    size_t* out_count
) {
    if (!engine || !out_ids || !out_count) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Get parameter count
    size_t count = impl->engine->parameters.size();
    *out_count = count;

    if (count == 0) {
        *out_ids = nullptr;
        return SCH_OK;
    }

    // Allocate array
    char** ids = static_cast<char**>(std::malloc(count * sizeof(char*)));
    if (!ids) {
        return SCH_ERR_OUT_OF_MEMORY;
    }

    // Copy parameter IDs
    for (size_t i = 0; i < count; ++i) {
        juce::String key = impl->engine->parameters.getAllKeys()[static_cast<int>(i)];
        ids[i] = strdup(key.toUTF8());
    }

    *out_ids = ids;
    return SCH_OK;
}

// ============================================================================
// Transport Operations
// ============================================================================

sch_result_t sch_engine_get_transport_state(
    sch_engine_handle engine,
    sch_transport_state_info_t* out_state
) {
    if (!engine || !out_state) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Copy current state
    *out_state = impl->engine->transportState;
    return SCH_OK;
}

sch_result_t sch_engine_transport(
    sch_engine_handle engine,
    sch_transport_state_enum_t state
) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    auto& e = *impl->engine;

#if defined(__IOS__) || defined(TARGET_OS_IPHONE)
    // iOS: Direct transport control without device manager
    // TODO: Implement proper iOS audio playback
    switch (state) {
        case SCH_TRANSPORT_PLAYING:
            if (!e.toneGenerator) {
                return SCH_ERR_ENGINE_FAILED;
            }
            if (!e.isPlaying) {
                e.toneGenerator->shouldPlay = true;
                e.transportState.state = SCH_TRANSPORT_PLAYING;
                e.isPlaying = true;
                DBG("SchillingerEngine: iOS transport started (audio output not yet implemented)");
            }
            break;

        case SCH_TRANSPORT_STOPPED:
            if (e.isPlaying) {
                e.toneGenerator->shouldPlay = false;
                e.transportState.state = SCH_TRANSPORT_STOPPED;
                e.isPlaying = false;
                e.transportState.position = 0.0;
                DBG("SchillingerEngine: iOS transport stopped");
            }
            break;

        case SCH_TRANSPORT_PAUSED:
            if (e.isPlaying) {
                e.toneGenerator->shouldPlay = false;
                e.transportState.state = SCH_TRANSPORT_PAUSED;
                e.isPlaying = false;
                DBG("SchillingerEngine: iOS transport paused");
            }
            break;

        case SCH_TRANSPORT_RECORDING:
            // TODO: Implement recording
            return SCH_ERR_NOT_IMPLEMENTED;
    }
#else
    // Desktop/macOS: Use device manager for audio callbacks
    switch (state) {
        case SCH_TRANSPORT_PLAYING:
            if (!e.toneGenerator) {
                return SCH_ERR_ENGINE_FAILED;
            }
            if (!e.isPlaying) {
                e.deviceManager.addAudioCallback(&e.audioSourcePlayer);
                e.toneGenerator->shouldPlay = true;
                e.transportState.state = SCH_TRANSPORT_PLAYING;
                e.isPlaying = true;
                DBG("SchillingerEngine: Transport started");
            }
            break;

        case SCH_TRANSPORT_STOPPED:
            if (e.isPlaying) {
                e.toneGenerator->shouldPlay = false;
                e.deviceManager.removeAudioCallback(&e.audioSourcePlayer);
                e.transportState.state = SCH_TRANSPORT_STOPPED;
                e.isPlaying = false;
                e.transportState.position = 0.0;
                DBG("SchillingerEngine: Transport stopped");
            }
            break;

        case SCH_TRANSPORT_PAUSED:
            if (e.isPlaying) {
                e.toneGenerator->shouldPlay = false;
                e.deviceManager.removeAudioCallback(&e.audioSourcePlayer);
                e.transportState.state = SCH_TRANSPORT_PAUSED;
                e.isPlaying = false;
                DBG("SchillingerEngine: Transport paused");
            }
            break;

        case SCH_TRANSPORT_RECORDING:
            // TODO: Implement recording
            return SCH_ERR_NOT_IMPLEMENTED;
    }
#endif

    // Invoke callback
    invoke_transport_callback(impl, e.transportState);

    return SCH_OK;
}

sch_result_t sch_engine_set_position(
    sch_engine_handle engine,
    double position
) {
    if (!engine || position < 0.0) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    impl->engine->transportState.position = position;
    return SCH_OK;
}

sch_result_t sch_engine_set_tempo(
    sch_engine_handle engine,
    double tempo
) {
    if (!engine || tempo <= 0.0) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    impl->engine->transportState.tempo = tempo;

    // Update tone generator frequency based on tempo
    if (impl->engine->toneGenerator) {
        // TODO: Map tempo to actual frequency
        impl->engine->toneGenerator->setFrequency(440.0 * (tempo / 120.0));
    }

    return SCH_OK;
}

sch_result_t sch_engine_set_recording(
    sch_engine_handle engine,
    bool is_recording
) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    impl->engine->transportState.is_recording = is_recording;
    return SCH_OK;
}

// ============================================================================
// Edit Operations
// ============================================================================

sch_result_t sch_engine_submit_edit(
    sch_engine_handle engine,
    sch_edit_op_t operation,
    const char* json_payload,
    sch_edit_result_t* out_result
) {
    if (!engine || !json_payload || !out_result) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Implement actual edit operations
    out_result->result = SCH_OK;
    out_result->operation_id = static_cast<uint64_t>(juce::Time::currentTimeMillis());
    out_result->status = SCH_EDIT_APPLIED;
    out_result->applied_value = 0.0;
    std::strncpy(out_result->error_message, "Edit applied", sizeof(out_result->error_message) - 1);

    DBG("SchillingerEngine: Edit submitted (stub)");
    return SCH_OK;
}

sch_result_t sch_engine_undo(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Implement undo
    DBG("SchillingerEngine: Undo (stub)");
    return SCH_OK;
}

sch_result_t sch_engine_redo(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Implement redo
    DBG("SchillingerEngine: Redo (stub)");
    return SCH_OK;
}

sch_result_t sch_engine_get_undo_count(
    sch_engine_handle engine,
    size_t* out_count
) {
    if (!engine || !out_count) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // TODO: Implement undo history
    *out_count = 0;
    return SCH_OK;
}

// ============================================================================
// Audio Configuration
// ============================================================================

sch_result_t sch_engine_audio_init(
    sch_engine_handle engine,
    const sch_audio_config_t* config
) {
    if (!engine || !config) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl || !impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    auto& e = *impl->engine;

#if defined(__IOS__) || defined(TARGET_OS_IPHONE)
    // iOS: AudioDeviceManager requires complex AVAudioSession setup
    // For now, bypass device manager and set up audio directly
    // TODO: Implement proper iOS audio using AVAudioEngine or AudioUnit
    DBG("SchillingerEngine: iOS audio init - bypassing AudioDeviceManager");

    // Create and prepare tone generator directly
    try {
        e.toneGenerator.reset(new schillinger::SineWaveGenerator());
        e.toneGenerator->prepareToPlay(config->buffer_size, config->sample_rate);
        // Note: Not setting audioSourcePlayer as it requires device manager
    } catch (const std::exception& ex) {
        DBG("SchillingerEngine: Failed to create audio source: " << ex.what());
        return SCH_ERR_AUDIO_FAILED;
    }

    // Update audio status
    e.audioStatus.is_initialized = true;
    e.audioStatus.config = *config;
    e.audioStatus.cpu_usage = 0.0;
    e.audioStatus.xrun_count = 0;

    DBG("SchillingerEngine: iOS audio initialized (direct mode) at " << config->sample_rate << " Hz");
    return SCH_OK;

#else
    // Desktop/macOS: Use AudioDeviceManager normally
    auto error = e.deviceManager.initialise(
        config->input_channels,
        config->output_channels,
        nullptr,
        true
    );

    if (error.isNotEmpty()) {
        DBG("SchillingerEngine: AudioDeviceManager initialise failed: " << error);
        invoke_error_callback(impl, error.toUTF8());
        return SCH_ERR_AUDIO_FAILED;
    }

    // Create and attach tone generator
    try {
        e.toneGenerator.reset(new schillinger::SineWaveGenerator());
        e.toneGenerator->prepareToPlay(config->buffer_size, config->sample_rate);
        e.audioSourcePlayer.setSource(e.toneGenerator.get());
    } catch (const std::exception& ex) {
        DBG("SchillingerEngine: Failed to create audio source: " << ex.what());
        return SCH_ERR_AUDIO_FAILED;
    }

    // Update audio status
    e.audioStatus.is_initialized = true;
    e.audioStatus.config = *config;

    DBG("SchillingerEngine: Audio initialized at " << config->sample_rate << " Hz");
    return SCH_OK;
#endif
}

sch_result_t sch_engine_get_audio_status(
    sch_engine_handle engine,
    sch_audio_status_t* out_status
) {
    if (!engine || !out_status) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    *out_status = impl->engine->audioStatus;
    return SCH_OK;
}

sch_result_t sch_engine_audio_start(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Start via transport
    return sch_engine_transport(engine, SCH_TRANSPORT_PLAYING);
}

sch_result_t sch_engine_audio_stop(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Stop via transport
    return sch_engine_transport(engine, SCH_TRANSPORT_STOPPED);
}

// ============================================================================
// Performance Blend (Swift Frontend Integration)
// ============================================================================

sch_result_t sch_engine_set_performance_blend(
    sch_engine_handle engine,
    const char* performance_a_id,
    const char* performance_b_id,
    double blend_value
) {
    if (!engine || !performance_a_id || !performance_b_id) {
        return SCH_ERR_INVALID_ARG;
    }

    // Validate blend value range
    if (blend_value < 0.0 || blend_value > 1.0) {
        DBG("SchillingerEngine: Invalid blend value: " << blend_value << " (must be 0.0-1.0)");
        invoke_error_callback(get_engine_impl(engine), "Invalid blend value - must be between 0.0 and 1.0");
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Store blend parameters in engine
    impl->engine->parameters.set("performance_a_id", performance_a_id);
    impl->engine->parameters.set("performance_b_id", performance_b_id);
    impl->engine->parameters.set("blend_value", juce::String(blend_value));

    // Update tone generator to demonstrate blend is working
    // TODO: Map blend to actual audio crossfade
    if (impl->engine->toneGenerator) {
        // Map blend value (0.0-1.0) to frequency (220Hz-880Hz) for demo
        double frequency = 220.0 + (blend_value * 660.0);
        impl->engine->toneGenerator->setFrequency(frequency);

        // Map blend value to amplitude (0.1-0.3) for demo
        double amplitude = 0.1 + (blend_value * 0.2);
        impl->engine->toneGenerator->setAmplitude(amplitude);
    }

    // Invoke parameter callback with blend value
    invoke_parameter_callback(impl, "blend_value", blend_value);

    DBG("SchillingerEngine: Performance blend set - "
        << performance_a_id << " (" << (1.0 - blend_value) * 100 << "%) ↔ "
        << performance_b_id << " (" << blend_value * 100 << "%)");

    return SCH_OK;
}

sch_result_t sch_engine_send_command(
    sch_engine_handle engine,
    const char* json_command
) {
    if (!engine || !json_command) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    // Parse JSON command
    juce::var jsonVar;
    auto error = juce::JSON::parse(json_command, jsonVar);

    if (error.failed()) {
        juce::String errMsg = "Failed to parse command JSON";
        DBG("SchillingerEngine: " << errMsg);
        invoke_error_callback(impl, errMsg.toUTF8());
        return SCH_ERR_PARSE_FAILED;
    }

    // Extract command type
    if (!jsonVar.isObject()) {
        invoke_error_callback(impl, "JSON command must be an object");
        return SCH_ERR_INVALID_ARG;
    }

    auto* obj = jsonVar.getDynamicObject();
    if (!obj->hasProperty("type")) {
        invoke_error_callback(impl, "JSON command missing 'type' property");
        return SCH_ERR_INVALID_ARG;
    }

    juce::String type = obj->getProperty("type").toString();

    // Handle different command types
    if (type == "setPerformanceBlend") {
        // Extract performance blend parameters
        if (!obj->hasProperty("performanceA") || !obj->hasProperty("performanceB") || !obj->hasProperty("blendValue")) {
            invoke_error_callback(impl, "setPerformanceBlend missing required parameters");
            return SCH_ERR_INVALID_ARG;
        }

        auto* perfA = obj->getProperty("performanceA").getDynamicObject();
        auto* perfB = obj->getProperty("performanceB").getDynamicObject();
        double blend = obj->getProperty("blendValue");

        if (!perfA || !perfB || !perfA->hasProperty("id") || !perfB->hasProperty("id")) {
            invoke_error_callback(impl, "Invalid performance objects in blend command");
            return SCH_ERR_INVALID_ARG;
        }

        juce::String perfAId = perfA->getProperty("id").toString();
        juce::String perfBId = perfB->getProperty("id").toString();

        return sch_engine_set_performance_blend(engine, perfAId.toUTF8(), perfBId.toUTF8(), blend);
    } else {
        DBG("SchillingerEngine: Unknown command type: " << type);
        return SCH_ERR_NOT_IMPLEMENTED;
    }

    return SCH_OK;
}

// ============================================================================
// Callbacks
// ============================================================================

sch_result_t sch_engine_set_error_cb(
    sch_engine_handle engine,
    sch_error_callback_t callback,
    void* user_data
) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    impl->error_cb = callback;
    impl->user_data = user_data;
    return SCH_OK;
}

sch_result_t sch_engine_set_transport_cb(
    sch_engine_handle engine,
    sch_transport_callback_t callback,
    void* user_data
) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    impl->transport_cb = callback;
    impl->user_data = user_data;
    return SCH_OK;
}

sch_result_t sch_engine_set_parameter_cb(
    sch_engine_handle engine,
    sch_parameter_callback_t callback,
    void* user_data
) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    impl->parameter_cb = callback;
    impl->user_data = user_data;
    return SCH_OK;
}

// ============================================================================
// Panic / Emergency Stop
// ============================================================================

sch_result_t sch_engine_panic(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    auto* impl = get_engine_impl(engine);
    if (!impl->engine) {
        return SCH_ERR_ENGINE_FAILED;
    }

    auto& e = *impl->engine;

    // Stop all audio immediately
    if (e.toneGenerator) {
        e.toneGenerator->shouldPlay = false;
    }
    e.deviceManager.removeAudioCallback(&e.audioSourcePlayer);
    e.transportState.state = SCH_TRANSPORT_STOPPED;
    e.isPlaying = false;

    DBG("SchillingerEngine: PANIC - all audio stopped");
    return SCH_OK;
}

// ============================================================================
// Version Info
// ============================================================================

sch_result_t sch_get_engine_version(char* buffer, size_t buffer_size) {
    if (!buffer || buffer_size == 0) {
        return SCH_ERR_INVALID_ARG;
    }

    const char* version = "White Room JUCE FFI 1.0.0";
    std::strncpy(buffer, version, buffer_size - 1);
    buffer[buffer_size - 1] = '\0';

    return SCH_OK;
}

sch_result_t sch_get_engine_version_info(sch_engine_version_t* out_version) {
    if (!out_version) {
        return SCH_ERR_INVALID_ARG;
    }

    out_version->api.major = 1;
    out_version->api.minor = 0;
    out_version->api.patch = 0;
    out_version->schema.major = 1;
    out_version->schema.minor = 0;
    out_version->schema.patch = 0;
    out_version->build_info = "Development Build";

    return SCH_OK;
}

sch_result_t sch_get_engine_schema_version(sch_schema_version_t* out_version) {
    if (!out_version) {
        return SCH_ERR_INVALID_ARG;
    }

    out_version->major = 1;
    out_version->minor = 0;
    out_version->patch = 0;

    return SCH_OK;
}

// ============================================================================
// Utility Functions
// ============================================================================

const char* sch_result_to_string(sch_result_t result) {
    switch (result) {
        case SCH_OK: return "OK";
        case SCH_ERR_INVALID_ARG: return "Invalid argument";
        case SCH_ERR_NOT_FOUND: return "Not found";
        case SCH_ERR_REJECTED: return "Operation rejected";
        case SCH_ERR_DEFERRED: return "Operation deferred";
        case SCH_ERR_NOT_IMPLEMENTED: return "Not implemented";
        case SCH_ERR_ENGINE_NULL: return "Engine null";
        case SCH_ERR_INVALID_STATE: return "Invalid state";
        case SCH_ERR_INTERNAL: return "Internal error";
        default: return "Unknown error";
    }
}

void sch_free_string(sch_string_t* str) {
    if (str && str->data) {
        std::free(str->data);
        str->data = nullptr;
        str->length = 0;
    }
}

void sch_free_string_array(char** array, size_t count) {
    if (array) {
        for (size_t i = 0; i < count; ++i) {
            if (array[i]) {
                std::free(array[i]);
            }
        }
        std::free(array);
    }
}

} // extern "C"
