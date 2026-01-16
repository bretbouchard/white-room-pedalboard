//
//  sch_engine_ffi.cpp
//  White Room JUCE FFI Bridge
//
//  C++ implementation of FFI bridge for Swift ↔ JUCE communication
//  Implements functions declared in sch_engine_ffi.h
//
//  Design Principles:
//  - All functions are extern "C" (C ABI compatibility)
//  - Error handling: C++ exceptions caught and translated to sch_result_t
//  - Memory management: Output strings allocated with malloc (caller frees)
//  - Thread safety: Lock-free queues for audio commands
//
//  Phase 1: Core Bridge
//  - Engine lifecycle (create/destroy/version)
//  - Memory management helpers
//  - Error translation utilities
//


// JUCE module includes (use direct includes to avoid custom JuceHeader.h conflicts)
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_data_structures/juce_data_structures.h>
#include <juce_events/juce_events.h>
#include <juce_dsp/juce_dsp.h>

#include "sch_engine_ffi.h"
#include "sch_song_structs.hpp"
#include <cstring>
#include <cstdlib>
#include <stdexcept>
#include <string>
#include <atomic>
#include <algorithm>
#include <array>

// ============================================================================
// Internal Engine Implementation
// ============================================================================

namespace schillinger {
namespace ffi {

// Lock-free SPSC command queue (template implementation)
template <typename T, size_t Capacity>
class LockFreeSPSCQueue {
    std::array<T, Capacity> buffer_;
    std::atomic<size_t> writeIndex_{0};
    std::atomic<size_t> readIndex_{0};

public:
    bool tryPush(const T& item) {
        const size_t write = writeIndex_.load(std::memory_order_relaxed);
        const size_t next = (write + 1) % Capacity;

        if (next == readIndex_.load(std::memory_order_acquire)) {
            return false;  // Queue full
        }

        buffer_[write] = item;
        writeIndex_.store(next, std::memory_order_release);
        return true;
    }

    bool tryPop(T& item) {
        const size_t read = readIndex_.load(std::memory_order_relaxed);
        if (read == writeIndex_.load(std::memory_order_acquire)) {
            return false;  // Queue empty
        }

        item = buffer_[read];
        readIndex_.store((read + 1) % Capacity, std::memory_order_release);
        return true;
    }

    bool isEmpty() const {
        return readIndex_.load(std::memory_order_relaxed) ==
               writeIndex_.load(std::memory_order_acquire);
    }
};

// Command queue wrapper
using CommandQueue = LockFreeSPSCQueue<sch_command_t, 256>;
static_assert(std::is_trivially_copyable<sch_command_t>::value,
              "sch_command_t must be trivially copyable for lock-free queue");

// Internal engine state
struct EngineState {
    // Audio device management
    juce::AudioDeviceManager deviceManager;
    juce::AudioSourcePlayer audioSourcePlayer;
    std::unique_ptr<juce::AudioSource> audioSource;

    // Transport state (atomic for thread-safe reads)
    std::atomic<double> tempo{120.0};
    std::atomic<double> position{0.0};
    std::atomic<bool> isPlaying{false};
    std::atomic<uint32_t> activeVoiceCount{0};

    // Performance blend state (atomic for real-time updates)
    std::atomic<double> blendValue{0.5};
    sch_uuid_t performanceAId{};
    sch_uuid_t performanceBId{};

    // Command queue (lock-free SPSC)
    std::unique_ptr<CommandQueue> commandQueue;

    // Event callback
    sch_event_callback_t eventCallback{nullptr};
    void* eventCallbackUserData{nullptr};

    // Song storage (JSON for now, binary in Phase 5)
    juce::DynamicObject::Ptr currentSong;

    EngineState() {
        // Initialize empty song
        currentSong = new juce::DynamicObject();
        currentSong->setProperty("schema_version", "1.0");
        currentSong->setProperty("title", "Default Song");
        currentSong->setProperty("tempo", 120.0);

        // Clear UUIDs
        std::memset(performanceAId, 0, sizeof(sch_uuid_t));
        std::memset(performanceBId, 0, sizeof(sch_uuid_t));
    }

    ~EngineState() {
        audioSourcePlayer.setSource(nullptr);
        audioSource.reset();
        deviceManager.closeAudioDevice();
    }

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(EngineState)
};

} // namespace ffi
} // namespace schillinger

// ============================================================================
// Helper Functions
// ============================================================================

namespace {

// Convert C++ exception to result code
sch_result_t exceptionToResult(const std::exception& e) {
    DBG("FFI Exception: " << e.what());
    return SCH_ERR_INTERNAL;
}

// Validate UUID string format
bool validateUUIDString(const char* uuid) {
    if (!uuid) return false;

    // Basic format check: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    size_t len = std::strlen(uuid);
    if (len != 36) return false;

    for (size_t i = 0; i < len; ++i) {
        char c = uuid[i];
        if (i == 8 || i == 13 || i == 18 || i == 23) {
            if (c != '-') return false;
        } else {
            if (!((c >= '0' && c <= '9') ||
                  (c >= 'a' && c <= 'f') ||
                  (c >= 'A' && c <= 'F'))) {
                return false;
            }
        }
    }

    return true;
}

// Copy UUID string to sch_uuid_t
void copyUUID(sch_uuid_t dest, const char* src) {
    if (src) {
        std::strncpy(dest, src, 36);
        dest[36] = '\0';
    } else {
        std::memset(dest, 0, sizeof(sch_uuid_t));
    }
}

// Get engine state from handle
schillinger::ffi::EngineState* getEngineState(sch_engine_handle engine) {
    if (!engine) return nullptr;
    return reinterpret_cast<schillinger::ffi::EngineState*>(engine);
}

// Invoke event callback (thread-safe)
void invokeEventCallback(
    schillinger::ffi::EngineState* engine,
    sch_event_type_t eventType,
    const char* message
) {
    if (engine && engine->eventCallback) {
        engine->eventCallback(eventType, message, engine->eventCallbackUserData);
    }
}

// Allocate string and copy content (caller must free)
sch_string_t allocateString(const juce::String& str) {
    sch_string_t result;
    result.length = str.length();
    result.data = static_cast<char*>(std::malloc(result.length + 1));

    if (result.data) {
        std::strcpy(result.data, str.toUTF8());
    } else {
        result.length = 0;
    }

    return result;
}

} // anonymous namespace

// ============================================================================
// C API Implementation - Engine Lifecycle
// ============================================================================

extern "C" {

sch_result_t sch_engine_create(sch_engine_handle* out_engine) {
    if (!out_engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        // Create engine state
        auto* engine = new schillinger::ffi::EngineState();

        // Create command queue
        engine->commandQueue = std::make_unique<schillinger::ffi::CommandQueue>();

        *out_engine = reinterpret_cast<sch_engine_handle>(engine);

        DBG("Schillinger FFI: Engine created successfully");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_destroy(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        delete state;

        DBG("Schillinger FFI: Engine destroyed successfully");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_get_version(sch_string_t* out_version) {
    if (!out_version) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        juce::String version = "White Room JUCE FFI 1.0.0";
        *out_version = allocateString(version);

        if (!out_version->data) {
            return SCH_ERR_OUT_OF_MEMORY;
        }

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// C API Implementation - Song Operations
// ============================================================================

sch_result_t sch_engine_load_song(
    sch_engine_handle engine,
    const char* json
) {
    if (!engine || !json) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Parse JSON using JUCE parser
        juce::var jsonVar;
        auto error = juce::JSON::parse(json, jsonVar);

        if (error.failed()) {
            DBG("Schillinger FFI: Failed to parse song JSON");
            invokeEventCallback(state, SCH_EVT_VALIDATION_ERROR,
                             "Failed to parse song JSON");
            return SCH_ERR_PARSE_FAILED;
        }

        // Validate JSON structure
        if (!jsonVar.isObject()) {
            DBG("Schillinger FFI: Song JSON is not an object");
            return SCH_ERR_PARSE_FAILED;
        }

        // Store song in engine state
        auto* songObj = jsonVar.getDynamicObject();
        state->currentSong = juce::DynamicObject::Ptr(songObj);

        // Extract tempo from song if present
        if (songObj->hasProperty("globals")) {
            auto* globals = songObj->getProperty("globals").getDynamicObject();
            if (globals && globals->hasProperty("tempo")) {
                double tempo = globals->getProperty("tempo");
                state->tempo.store(tempo, std::memory_order_release);
            }
        }

        DBG("Schillinger FFI: Song loaded successfully");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_get_song(
    sch_engine_handle engine,
    sch_string_t* out_json
) {
    if (!engine || !out_json) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Serialize current song to JSON
        juce::var songVar(state->currentSong.get());
        juce::String jsonString = juce::JSON::toString(songVar);

        *out_json = allocateString(jsonString);

        if (!out_json->data) {
            return SCH_ERR_OUT_OF_MEMORY;
        }

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_create_default_song(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Create minimal song structure
        state->currentSong = new juce::DynamicObject();
        state->currentSong->setProperty("schema_version", "1.0");
        state->currentSong->setProperty("song_id", juce::Uuid().toString());
        state->currentSong->setProperty("title", "Default Song");

        // Add globals
        juce::DynamicObject::Ptr globals = new juce::DynamicObject();
        globals->setProperty("tempo", 120.0);
        globals->setProperty("time_signature_numerator", 4);
        globals->setProperty("time_signature_nenominator", 4);
        globals->setProperty("key", 0);
        state->currentSong->setProperty("globals", juce::var(globals));

        // Initialize arrays
        state->currentSong->setProperty("rhythm_system_ids", juce::Array<juce::var>());
        state->currentSong->setProperty("melody_system_ids", juce::Array<juce::var>());
        state->currentSong->setProperty("harmony_system_ids", juce::Array<juce::var>());

        DBG("Schillinger FFI: Default song created");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// C API Implementation - Audio Control
// ============================================================================

sch_result_t sch_engine_audio_init(
    sch_engine_handle engine,
    const sch_audio_config_t* config
) {
    if (!engine || !config) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

#if defined(__IOS__) || defined(TARGET_OS_IPHONE)
        // iOS: Bypass AudioDeviceManager for now
        DBG("Schillinger FFI: iOS audio init at " << config->sample_rate << " Hz");
        // TODO: Integrate with audio_only_bridge.mm for proper iOS audio
        return SCH_OK;
#else
        // Desktop/macOS: Initialize AudioDeviceManager
        auto error = state->deviceManager.initialise(
            config->input_channels,
            config->output_channels,
            nullptr,
            true
        );

        if (error.isNotEmpty()) {
            DBG("Schillinger FFI: AudioDeviceManager init failed: " << error);
            invokeEventCallback(state, SCH_EVT_ERROR, error.toUTF8());
            return SCH_ERR_AUDIO_FAILED;
        }

        DBG("Schillinger FFI: Audio initialized at " << config->sample_rate << " Hz");
        return SCH_OK;
#endif
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_audio_start(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Set playing state
        state->isPlaying.store(true, std::memory_order_release);

        // TODO: Start audio processing
        // For now, just update transport state
        invokeEventCallback(state, SCH_EVT_TRANSPORT_STARTED,
                          "Audio playback started");

        DBG("Schillinger FFI: Audio started");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_audio_stop(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Set stopped state
        state->isPlaying.store(false, std::memory_order_release);
        state->position.store(0.0, std::memory_order_release);

        // TODO: Stop audio processing
        invokeEventCallback(state, SCH_EVT_TRANSPORT_STOPPED,
                          "Audio playback stopped");

        DBG("Schillinger FFI: Audio stopped");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_get_audio_status(
    sch_engine_handle engine,
    sch_string_t* out_json
) {
    if (!engine || !out_json) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Build audio status JSON
        juce::DynamicObject::Ptr statusObj = new juce::DynamicObject();
        statusObj->setProperty("is_initialized", true);
        statusObj->setProperty("is_playing", state->isPlaying.load(std::memory_order_acquire));
        statusObj->setProperty("tempo", state->tempo.load(std::memory_order_acquire));
        statusObj->setProperty("position", state->position.load(std::memory_order_acquire));
        statusObj->setProperty("active_voices",
            static_cast<int>(state->activeVoiceCount.load(std::memory_order_acquire)));

        juce::var statusVar(statusObj);
        juce::String jsonString = juce::JSON::toString(statusVar);

        *out_json = allocateString(jsonString);

        if (!out_json->data) {
            return SCH_ERR_OUT_OF_MEMORY;
        }

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// C API Implementation - Transport Control
// ============================================================================

sch_result_t sch_engine_set_transport(
    sch_engine_handle engine,
    sch_transport_state_t state
) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* engineState = getEngineState(engine);
        if (!engineState) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Update transport state
        switch (state) {
            case SCH_TRANSPORT_PLAYING:
                engineState->isPlaying.store(true, std::memory_order_release);
                invokeEventCallback(engineState, SCH_EVT_TRANSPORT_STARTED,
                                  "Transport started");
                break;

            case SCH_TRANSPORT_STOPPED:
                engineState->isPlaying.store(false, std::memory_order_release);
                engineState->position.store(0.0, std::memory_order_release);
                invokeEventCallback(engineState, SCH_EVT_TRANSPORT_STOPPED,
                                  "Transport stopped");
                break;

            case SCH_TRANSPORT_PAUSED:
                engineState->isPlaying.store(false, std::memory_order_release);
                break;

            case SCH_TRANSPORT_RECORDING:
                // TODO: Implement recording
                return SCH_ERR_NOT_IMPLEMENTED;
        }

        DBG("Schillinger FFI: Transport state set to " << state);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_set_tempo(
    sch_engine_handle engine,
    double tempo
) {
    if (!engine || tempo <= 0.0) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        state->tempo.store(tempo, std::memory_order_release);
        DBG("Schillinger FFI: Tempo set to " << tempo);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_set_position(
    sch_engine_handle engine,
    double position
) {
    if (!engine || position < 0.0) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        state->position.store(position, std::memory_order_release);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// C API Implementation - MIDI Events
// ============================================================================

sch_result_t sch_engine_send_note_on(
    sch_engine_handle engine,
    int channel,
    int note,
    float velocity
) {
    if (!engine || channel < 0 || channel > 15 || note < 0 || note > 127) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // TODO: Send MIDI note to audio engine
        DBG("Schillinger FFI: Note ON - ch:" << channel << " note:" << note
            << " vel:" << velocity);

        // Update active voice count
        state->activeVoiceCount.fetch_add(1, std::memory_order_relaxed);

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_send_note_off(
    sch_engine_handle engine,
    int channel,
    int note,
    float velocity
) {
    if (!engine || channel < 0 || channel > 15 || note < 0 || note > 127) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // TODO: Send MIDI note to audio engine
        DBG("Schillinger FFI: Note OFF - ch:" << channel << " note:" << note
            << " vel:" << velocity);

        // Update active voice count
        state->activeVoiceCount.fetch_sub(1, std::memory_order_relaxed);

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_all_notes_off(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // TODO: Send all notes off to audio engine
        state->activeVoiceCount.store(0, std::memory_order_release);

        DBG("Schillinger FFI: All notes off");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// C API Implementation - Performance Blend
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
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Validate UUIDs
        if (!validateUUIDString(performance_a_id) ||
            !validateUUIDString(performance_b_id)) {
            return SCH_ERR_INVALID_ARG;
        }

        // Update performance state
        copyUUID(state->performanceAId, performance_a_id);
        copyUUID(state->performanceBId, performance_b_id);
        state->blendValue.store(blend_value, std::memory_order_release);

        DBG("Schillinger FFI: Performance blend - "
            << performance_a_id << " (" << (1.0 - blend_value) * 100 << "%) ↔ "
            << performance_b_id << " (" << blend_value * 100 << "%)");

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_push_command(
    sch_engine_handle engine,
    const sch_command_t* command
) {
    if (!engine || !command) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state || !state->commandQueue) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Try to push to lock-free queue
        if (!state->commandQueue->tryPush(*command)) {
            // Queue full
            DBG("Schillinger FFI: Command queue full");
            return SCH_ERR_REJECTED;
        }

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

sch_result_t sch_engine_get_performance_state(
    sch_engine_handle engine,
    sch_performance_state_t* out_state
) {
    if (!engine || !out_state) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Copy performance IDs
        std::memcpy(out_state->performance_a_id, state->performanceAId,
                   sizeof(sch_uuid_t));
        std::memcpy(out_state->performance_b_id, state->performanceBId,
                   sizeof(sch_uuid_t));

        // Read atomic values
        out_state->blend_value = state->blendValue.load(std::memory_order_acquire);
        out_state->tempo = state->tempo.load(std::memory_order_acquire);
        out_state->position = state->position.load(std::memory_order_acquire);
        out_state->is_playing = state->isPlaying.load(std::memory_order_acquire);
        out_state->active_voice_count = state->activeVoiceCount.load(
            std::memory_order_acquire);

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// C API Implementation - Callbacks
// ============================================================================

sch_result_t sch_engine_set_event_callback(
    sch_engine_handle engine,
    sch_event_callback_t callback,
    void* user_data
) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        state->eventCallback = callback;
        state->eventCallbackUserData = user_data;

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// C API Implementation - Memory Management
// ============================================================================

void sch_free_string(sch_string_t* str) {
    if (str && str->data) {
        std::free(str->data);
        str->data = nullptr;
        str->length = 0;
    }
}

void sch_free_string_array(sch_string_array_t* array) {
    if (array && array->items) {
        for (size_t i = 0; i < array->count; ++i) {
            if (array->items[i]) {
                std::free(array->items[i]);
            }
        }
        std::free(array->items);
        array->items = nullptr;
        array->count = 0;
    }
}

// ============================================================================
// C API Implementation - Utility Functions
// ============================================================================

const char* sch_result_to_string(sch_result_t result) {
    // Use numeric values to avoid duplicate case issues
    switch (static_cast<int>(result)) {
        case 0: return "OK";
        case 1: return "Invalid argument";
        case 2: return "Not found";
        case 3: return "Operation rejected";
        case 4: return "Operation deferred";
        case 5: return "Not implemented";
        case 6: return "Engine null";
        case 7: return "Invalid state";
        case 8: return "Not supported";
        case 9: return "Parse failed";
        case 10: return "Validation failed";
        case 100: return "Internal error";
        default: return "Unknown error";
    }
}

bool sch_uuid_validate(const char* uuid) {
    return validateUUIDString(uuid);
}

} // extern "C"
