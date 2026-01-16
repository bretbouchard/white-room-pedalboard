/**
 * transport_control.cpp
 *
 * FFI transport control implementation for White Room
 * Provides transport controls (play/pause/stop, position, tempo, loop) to Swift frontend
 *
 * Design Principles:
 * - All functions are extern "C" (C ABI compatibility)
 * - Thread-safe atomic operations for transport state
 * - Lock-free command queue for real-time control
 * - Error handling with result codes
 */

// JUCE module includes
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>

#include "sch_engine_ffi.h"
#include <cmath>
#include <algorithm>

// ============================================================================
// Transport Control Implementation
// ============================================================================

extern "C" {

/**
 * Start playback
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_play(sch_engine_handle engine) {
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

        // Notify listeners
        invokeEventCallback(state, SCH_EVT_TRANSPORT_STARTED,
                          "Playback started");

        DBG("Schillinger FFI: Transport play");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Pause playback
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_pause(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Set paused state (maintains position)
        state->isPlaying.store(false, std::memory_order_release);

        DBG("Schillinger FFI: Transport pause");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Stop playback and reset position
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_stop(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Set stopped state and reset position
        state->isPlaying.store(false, std::memory_order_release);
        state->position.store(0.0, std::memory_order_release);

        // Notify listeners
        invokeEventCallback(state, SCH_EVT_TRANSPORT_STOPPED,
                          "Playback stopped");

        DBG("Schillinger FFI: Transport stop");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Toggle play/pause
 *
 * @param engine Engine handle
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_toggle_play(sch_engine_handle engine) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Toggle playing state
        bool wasPlaying = state->isPlaying.load(std::memory_order_acquire);
        if (wasPlaying) {
            return sch_transport_pause(engine);
        } else {
            return sch_transport_play(engine);
        }
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// Position Control
// ============================================================================

/**
 * Set playback position
 *
 * @param engine Engine handle
 * @param position Position in beats
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_set_position(sch_engine_handle engine, double position) {
    if (!engine || position < 0.0) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Clamp position to valid range
        double clampedPosition = std::max(0.0, position);
        state->position.store(clampedPosition, std::memory_order_release);

        DBG("Schillinger FFI: Transport position set to " << clampedPosition);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Get current playback position
 *
 * @param engine Engine handle
 * @param out_position Pointer to receive position
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_get_position(sch_engine_handle engine, double* out_position) {
    if (!engine || !out_position) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Atomic read of current position
        *out_position = state->position.load(std::memory_order_acquire);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Move position by delta
 *
 * @param engine Engine handle
 * @param delta Beats to move (positive = forward, negative = backward)
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_move_by(sch_engine_handle engine, double delta) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Get current position and apply delta
        double currentPosition = state->position.load(std::memory_order_acquire);
        double newPosition = std::max(0.0, currentPosition + delta);
        state->position.store(newPosition, std::memory_order_release);

        DBG("Schillinger FFI: Transport moved by " << delta << " to " << newPosition);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// Tempo Control
// ============================================================================

/**
 * Set tempo
 *
 * @param engine Engine handle
 * @param tempo Tempo in BPM (must be > 0 and < 1000)
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_set_tempo(sch_engine_handle engine, double tempo) {
    if (!engine || tempo <= 0.0 || tempo >= 1000.0) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Clamp tempo to valid range
        double clampedTempo = std::max(1.0, std::min(999.0, tempo));
        state->tempo.store(clampedTempo, std::memory_order_release);

        DBG("Schillinger FFI: Tempo set to " << clampedTempo << " BPM");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Get current tempo
 *
 * @param engine Engine handle
 * @param out_tempo Pointer to receive tempo
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_get_tempo(sch_engine_handle engine, double* out_tempo) {
    if (!engine || !out_tempo) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Atomic read of current tempo
        *out_tempo = state->tempo.load(std::memory_order_acquire);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Adjust tempo by delta
 *
 * @param engine Engine handle
 * @param delta BPM to adjust (positive = faster, negative = slower)
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_adjust_tempo(sch_engine_handle engine, double delta) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Get current tempo and apply delta
        double currentTempo = state->tempo.load(std::memory_order_acquire);
        double newTempo = std::max(1.0, std::min(999.0, currentTempo + delta));
        state->tempo.store(newTempo, std::memory_order_release);

        DBG("Schillinger FFI: Tempo adjusted by " << delta << " to " << newTempo << " BPM");
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// Loop Control
// ============================================================================

/**
 * Set loop enabled state
 *
 * @param engine Engine handle
 * @param enabled Whether loop is enabled
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_set_loop_enabled(sch_engine_handle engine, bool enabled) {
    if (!engine) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // TODO: Store loop state in engine state
        // For now, just log
        DBG("Schillinger FFI: Loop " << (enabled ? "enabled" : "disabled"));

        // Store in current song JSON for persistence
        if (state->currentSong) {
            state->currentSong->setProperty("loop_enabled", enabled);
        }

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Set loop range
 *
 * @param engine Engine handle
 * @param start Loop start position in beats
 * @param end Loop end position in beats
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_set_loop_range(
    sch_engine_handle engine,
    double start,
    double end
) {
    if (!engine || start < 0.0 || end < 0.0 || start >= end) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // TODO: Store loop range in engine state
        DBG("Schillinger FFI: Loop range set to " << start << " - " << end);

        // Store in current song JSON for persistence
        if (state->currentSong) {
            state->currentSong->setProperty("loop_start", start);
            state->currentSong->setProperty("loop_end", end);
        }

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Toggle loop enabled state
 *
 * @param engine Engine handle
 * @param out_enabled Pointer to receive new loop state
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_toggle_loop(sch_engine_handle engine, bool* out_enabled) {
    if (!engine || !out_enabled) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Get current loop state and toggle
        bool currentlyEnabled = false;
        if (state->currentSong && state->currentSong->hasProperty("loop_enabled")) {
            currentlyEnabled = state->currentSong->getProperty("loop_enabled");
        }

        bool newState = !currentlyEnabled;

        // Store new state
        if (state->currentSong) {
            state->currentSong->setProperty("loop_enabled", newState);
        }

        *out_enabled = newState;

        DBG("Schillinger FFI: Loop toggled to " << (newState ? "enabled" : "disabled"));
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// Time Signature
// ============================================================================

/**
 * Set time signature
 *
 * @param engine Engine handle
 * @param numerator Beats per measure (e.g., 4, 3, 6)
 * @param denominator Beat unit (e.g., 4 = quarter note, 8 = eighth note)
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_set_time_signature(
    sch_engine_handle engine,
    int numerator,
    int denominator
) {
    if (!engine || numerator < 1 || numerator > 32) {
        return SCH_ERR_INVALID_ARG;
    }

    // Validate denominator (must be power of 2: 1, 2, 4, 8, 16, 32)
    if (denominator != 1 && denominator != 2 && denominator != 4 &&
        denominator != 8 && denominator != 16 && denominator != 32) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Store in current song JSON for persistence
        if (state->currentSong) {
            // Get or create globals object
            juce::DynamicObject::Ptr globals;
            if (state->currentSong->hasProperty("globals")) {
                globals = state->currentSong->getProperty("globals").getDynamicObject();
            } else {
                globals = new juce::DynamicObject();
            }

            if (globals) {
                globals->setProperty("time_signature_numerator", numerator);
                globals->setProperty("time_signature_denominator", denominator);
                state->currentSong->setProperty("globals", juce::var(globals));
            }
        }

        DBG("Schillinger FFI: Time signature set to " << numerator << "/" << denominator);
        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

/**
 * Get time signature
 *
 * @param engine Engine handle
 * @param out_numerator Pointer to receive numerator
 * @param out_denominator Pointer to receive denominator
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_get_time_signature(
    sch_engine_handle engine,
    int* out_numerator,
    int* out_denominator
) {
    if (!engine || !out_numerator || !out_denominator) {
        return SCH_ERR_INVALID_ARG;
    }

    try {
        auto* state = getEngineState(engine);
        if (!state) {
            return SCH_ERR_ENGINE_NULL;
        }

        // Default time signature
        int numerator = 4;
        int denominator = 4;

        // Try to get from song globals
        if (state->currentSong && state->currentSong->hasProperty("globals")) {
            auto* globals = state->currentSong->getProperty("globals").getDynamicObject();
            if (globals) {
                if (globals->hasProperty("time_signature_numerator")) {
                    numerator = globals->getProperty("time_signature_numerator");
                }
                if (globals->hasProperty("time_signature_denominator")) {
                    denominator = globals->getProperty("time_signature_denominator");
                }
            }
        }

        *out_numerator = numerator;
        *out_denominator = denominator;

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

// ============================================================================
// Transport State Query
// ============================================================================

/**
 * Get complete transport state
 *
 * @param engine Engine handle
 * @param out_state Pointer to receive transport state
 * @return SCH_OK on success, error code on failure
 */
sch_result_t sch_transport_get_state(
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

        // Atomic reads of all transport state
        out_state->is_playing = state->isPlaying.load(std::memory_order_acquire);
        out_state->position = state->position.load(std::memory_order_acquire);
        out_state->tempo = state->tempo.load(std::memory_order_acquire);
        out_state->active_voice_count = state->activeVoiceCount.load(
            std::memory_order_acquire);

        return SCH_OK;
    } catch (const std::exception& e) {
        return exceptionToResult(e);
    }
}

} // extern "C"
