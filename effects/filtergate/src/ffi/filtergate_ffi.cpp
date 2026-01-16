/*******************************************************************************
 * FilterGate - C ABI / FFI Implementation
 *
 * Swift-safe C interface implementation for FilterGate DSP processor.
 *
 * @author FilterGate Autonomous Agent 6
 * @date  2025-12-30
 ******************************************************************************/

#include "ffi/filtergate_ffi.h"
#include "FilterGateProcessor.h"
#include <cstring>
#include <new>

using namespace FilterGate;

//==============================================================================
// Error Handling
//==============================================================================

static thread_local const char* lastError = nullptr;
static thread_local char errorBuffer[256];

static void setError(const char* message) {
    std::strncpy(errorBuffer, message, sizeof(errorBuffer) - 1);
    errorBuffer[sizeof(errorBuffer) - 1] = '\0';
    lastError = errorBuffer;
}

//==============================================================================
// Lifecycle Management
//==============================================================================

FilterGateHandle filtergate_create(double sampleRate) {
    if (sampleRate <= 0.0 || sampleRate > 192000.0) {
        setError("Invalid sample rate");
        return nullptr;
    }

    try {
        auto* processor = new FilterGateProcessor();
        processor->setPlayConfigDetails(2, 2, sampleRate, sampleRate / 60.0);
        processor->prepareToPlay(sampleRate, static_cast<int>(sampleRate / 60.0));

        return static_cast<FilterGateHandle>(processor);
    }
    catch (const std::exception& e) {
        setError(e.what());
        return nullptr;
    }
    catch (...) {
        setError("Unknown error creating FilterGate instance");
        return nullptr;
    }
}

void filtergate_destroy(FilterGateHandle handle) {
    if (handle == nullptr) {
        return;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        delete processor;
    }
    catch (...) {
        // Silently ignore errors during destruction
    }
}

void filtergate_reset(FilterGateHandle handle) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        processor->releaseResources();
        processor->reset();
    }
    catch (const std::exception& e) {
        setError(e.what());
    }
}

//==============================================================================
// Audio Processing
//==============================================================================

void filtergate_process_mono(FilterGateHandle handle,
                              const float* input,
                              float* output,
                              int numSamples) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return;
    }

    if (input == nullptr || output == nullptr) {
        setError("Invalid buffer pointers");
        return;
    }

    if (numSamples <= 0) {
        return; // Nothing to process
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);

        // Create stereo buffer (copy mono to both channels)
        juce::AudioBuffer<float> buffer(2, numSamples);

        // Copy mono input to both channels
        juce::FloatVectorOperations::copy(buffer.getWritePointer(0), input, numSamples);
        juce::FloatVectorOperations::copy(buffer.getWritePointer(1), input, numSamples);

        // Process
        juce::MidiBuffer midi;
        processor->processBlock(buffer, midi);

        // Copy left channel to output (mono output)
        juce::FloatVectorOperations::copy(output, buffer.getReadPointer(0), numSamples);
    }
    catch (const std::exception& e) {
        setError(e.what());
    }
}

void filtergate_process_stereo(FilterGateHandle handle,
                                float* left,
                                float* right,
                                int numSamples) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return;
    }

    if (left == nullptr || right == nullptr) {
        setError("Invalid buffer pointers");
        return;
    }

    if (numSamples <= 0) {
        return; // Nothing to process
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);

        // Create stereo buffer
        float* channels[2] = {left, right};
        juce::AudioBuffer<float> buffer(channels, 2, numSamples);

        // Process
        juce::MidiBuffer midi;
        processor->processBlock(buffer, midi);

        // Output is already in-place in left/right buffers
    }
    catch (const std::exception& e) {
        setError(e.what());
    }
}

//==============================================================================
// Parameter Control
//==============================================================================

int filtergate_set_param(FilterGateHandle handle, int paramID, float value) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0;
    }

    if (paramID < 0 || paramID >= FILTERGATE_PARAM_COUNT) {
        setError("Invalid parameter ID");
        return 0;
    }

    // Clamp value to 0-1 range
    value = juce::jlimit(0.0f, 1.0f, value);

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        auto& mixer = processor->getMixer();
        auto& modMatrix = processor->getModMatrix();
        auto& gate = processor->getGateDetector();
        auto& env1 = processor->getEnvelope1();
        auto& env2 = processor->getEnvelope2();
        auto& envFollow = processor->getEnvelopeFollower();

        (void)mixer;     // Suppress unused warning (will be used when param routing is implemented)
        (void)modMatrix; // Suppress unused warning
        (void)gate;      // Suppress unused warning
        (void)env1;      // Suppress unused warning
        (void)env2;      // Suppress unused warning
        (void)envFollow; // Suppress unused warning

        // TODO: Implement parameter routing to actual DSP modules
        // For now, just return success
        return 1;
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0;
    }
}

float filtergate_get_param(FilterGateHandle handle, int paramID) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0.0f;
    }

    if (paramID < 0 || paramID >= FILTERGATE_PARAM_COUNT) {
        setError("Invalid parameter ID");
        return 0.0f;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        (void)processor; // Suppress unused warning (will be used when param routing is implemented)

        // TODO: Implement parameter getting from actual DSP modules
        // For now, return default value
        return 0.5f;
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0.0f;
    }
}

//==============================================================================
// Envelope Triggering
//==============================================================================

void filtergate_trigger_envelope(FilterGateHandle handle, int envIndex, float velocity) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return;
    }

    if (envIndex != 0 && envIndex != 1) {
        setError("Invalid envelope index (must be 0 or 1)");
        return;
    }

    velocity = juce::jlimit(0.0f, 1.0f, velocity);

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);

        if (envIndex == 0) {
            processor->getEnvelope1().trigger(velocity);
        } else {
            processor->getEnvelope2().trigger(velocity);
        }
    }
    catch (const std::exception& e) {
        setError(e.what());
    }
}

void filtergate_release_envelope(FilterGateHandle handle, int envIndex) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return;
    }

    if (envIndex != 0 && envIndex != 1) {
        setError("Invalid envelope index (must be 0 or 1)");
        return;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);

        if (envIndex == 0) {
            processor->getEnvelope1().release();
        } else {
            processor->getEnvelope2().release();
        }
    }
    catch (const std::exception& e) {
        setError(e.what());
    }
}

//==============================================================================
// Modulation Matrix
//==============================================================================

int filtergate_add_mod_route(FilterGateHandle handle,
                             int source,
                             int destination,
                             float amount,
                             float slewMs) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return -1;
    }

    if (source < 0 || source >= static_cast<int>(ModSource::MOD_SOURCE_COUNT)) {
        setError("Invalid modulation source");
        return -1;
    }

    if (destination < 0 || destination >= static_cast<int>(ModDestination::MOD_DESTINATION_COUNT)) {
        setError("Invalid modulation destination");
        return -1;
    }

    amount = juce::jlimit(-1.0f, 1.0f, amount);
    slewMs = juce::jmax(0.0f, slewMs);

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        auto& modMatrix = processor->getModMatrix();

        ModRoute route;
        route.source = static_cast<ModSource>(source);
        route.destination = static_cast<ModDestination>(destination);
        route.amount = amount;
        route.slewMs = slewMs;

        return modMatrix.addRoute(route);
    }
    catch (const std::exception& e) {
        setError(e.what());
        return -1;
    }
}

int filtergate_remove_mod_route(FilterGateHandle handle, int routeIndex) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        auto& modMatrix = processor->getModMatrix();

        return modMatrix.removeRoute(routeIndex) ? 1 : 0;
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0;
    }
}

void filtergate_clear_mod_routes(FilterGateHandle handle) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        processor->getModMatrix().clearRoutes();
    }
    catch (const std::exception& e) {
        setError(e.what());
    }
}

float filtergate_get_modulation(FilterGateHandle handle, int destination) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0.0f;
    }

    if (destination < 0 || destination >= static_cast<int>(ModDestination::MOD_DESTINATION_COUNT)) {
        setError("Invalid modulation destination");
        return 0.0f;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        return processor->getModMatrix().getModulation(static_cast<ModDestination>(destination));
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0.0f;
    }
}

//==============================================================================
// State Query
//==============================================================================

float filtergate_get_envelope_level(FilterGateHandle handle, int envIndex) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0.0f;
    }

    if (envIndex != 0 && envIndex != 1) {
        setError("Invalid envelope index (must be 0 or 1)");
        return 0.0f;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);

        if (envIndex == 0) {
            return processor->getEnvelope1().getCurrentLevel();
        } else {
            return processor->getEnvelope2().getCurrentLevel();
        }
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0.0f;
    }
}

float filtergate_get_gate_state(FilterGateHandle handle) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0.0f;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        return processor->getGateDetector().getGateState();
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0.0f;
    }
}

float filtergate_get_envelope_follower_level(FilterGateHandle handle) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0.0f;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        return processor->getEnvelopeFollower().getCurrentLevel();
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0.0f;
    }
}

int filtergate_gate_just_opened(FilterGateHandle handle) {
    if (handle == nullptr) {
        setError("Invalid handle");
        return 0;
    }

    try {
        auto* processor = static_cast<FilterGateProcessor*>(handle);
        return processor->getGateDetector().justOpened() ? 1 : 0;
    }
    catch (const std::exception& e) {
        setError(e.what());
        return 0;
    }
}

//==============================================================================
// Error Handling
//==============================================================================

const char* filtergate_get_last_error(FilterGateHandle handle) {
    (void)handle; // Unused
    return lastError;
}

void filtergate_clear_error(FilterGateHandle handle) {
    (void)handle; // Unused
    lastError = nullptr;
    errorBuffer[0] = '\0';
}

//==============================================================================
// String Utilities
//==============================================================================

void filtergate_free_string(char* str) {
    if (str != nullptr) {
        delete[] str;
    }
}
