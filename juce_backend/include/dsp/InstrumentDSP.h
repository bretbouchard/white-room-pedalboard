/*
 * InstrumentDSP.h
 *
 * Base interface for all JUCE backend instruments
 *
 * Purpose: Define common interface that all instruments must implement
 *          for tvOS-compatible audio processing
 *
 * Design Constraints (Non-Negotiable):
 *  - Pure C++ DSP
 *  - No runtime allocation in process()
 *  - No plugin hosting
 *  - No UI coupling
 *  - tvOS-safe (no file I/O, no threads)
 *  - Deterministic output (same input = same output)
 *
 * Created: December 30, 2025
 * Source: JUCE Backend Handoff Directive
 */

#ifndef INSTRUMENT_DSP_H_INCLUDED
#define INSTRUMENT_DSP_H_INCLUDED

#include <cstdint>
#include <cstring>

namespace DSP {

/**
 * @brief Scheduled event for instrument processing
 *
 * Events are scheduled at sample-accurate timing
 * and processed during the next process() call
 */
struct ScheduledEvent {
    double time;              // Absolute time in seconds
    uint32_t sampleOffset;    // Sample offset within buffer (0 to numSamples-1)

    enum Type : uint32_t {
        NOTE_ON,              // Start a note (midiNote, velocity)
        NOTE_OFF,             // Stop a note (midiNote)
        PARAM_CHANGE,         // Change parameter (paramId, value)
        PITCH_BEND,           // Pitch bend (bendValue)
        CHANNEL_PRESSURE,     // Channel aftertouch (pressure)
        CONTROL_CHANGE,       // MIDI CC (controllerNumber, value)
        PROGRAM_CHANGE,       // Program/patch change (programNumber)
        RESET                 // Reset all voices/state
    } type;

    union {
        struct {              // For NOTE_ON, NOTE_OFF
            int midiNote;
            float velocity;
        } note;

        struct {              // For PARAM_CHANGE
            const char* paramId;
            float value;
        } param;

        struct {              // For PITCH_BEND
            float bendValue;  // -1.0 to +1.0 (center = 0.0)
        } pitchBend;

        struct {              // For CHANNEL_PRESSURE
            float pressure;   // 0.0 to 1.0
        } channelPressure;

        struct {              // For CONTROL_CHANGE
            int controllerNumber;
            float value;
        } controlChange;

        struct {              // For PROGRAM_CHANGE
            int programNumber;
        } programChange;
    } data;
};

/**
 * @brief Base interface for all instrument DSP implementations
 *
 * All instruments (NexSynth, SamSampler, LocalGal, KaneMarco, etc.)
 * must inherit from this interface and implement these methods.
 *
 * Lifecycle:
 *  1. prepare(sampleRate, blockSize) - Called once before processing
 *  2. process(outputs, numChannels, numSamples) - Called every audio buffer
 *  3. handleEvent(event) - Called for each scheduled event
 *  4. reset() - Called to reset all state
 *  5. ~InstrumentDSP() - Cleanup (must not allocate in audio thread)
 */
class InstrumentDSP {
public:
    virtual ~InstrumentDSP() = default;

    /**
     * @brief Prepare instrument for audio processing
     *
     * Called once before processing begins. Allocate all memory here.
     * Must NOT be called from audio thread.
     *
     * @param sampleRate Sample rate in Hz (e.g., 48000.0)
     * @param blockSize Maximum samples per process() call (power of 2)
     *
     * @return true if preparation succeeded, false on error
     */
    virtual bool prepare(double sampleRate, int blockSize) = 0;

    /**
     * @brief Reset all internal state
     *
     * Called when playback stops or seeks. Reset all voices,
     * envelopes, oscillators, filters to initial state.
     *
     * Must not allocate memory.
     * Must be real-time safe (callable from audio thread).
     */
    virtual void reset() = 0;

    /**
     * @brief Process audio and generate output
     *
     * Called every audio buffer. Generate output by adding to
     * the provided buffers (do not overwrite, mix instead).
     *
     * Must not allocate memory.
     * Must be real-time safe (callable from audio thread).
     * Must be deterministic (same input = same output).
     *
     * @param outputs Output buffers [numChannels][numSamples]
     *               Caller guarantees non-null and valid.
     * @param numChannels Number of output channels (typically 2 for stereo)
     * @param numSamples Number of samples in this buffer (typically 128-512)
     *
     * Thread safety: Called from audio thread only.
     */
    virtual void process(float** outputs, int numChannels, int numSamples) = 0;

    /**
     * @brief Handle a scheduled event
     *
     * Called for each event scheduled for the current time range.
     * Events are processed before process() is called.
     *
     * Must not allocate memory.
     * Must be real-time safe (callable from audio thread).
     *
     * @param event The event to handle (copied, safe to store)
     *
     * Thread safety: Called from audio thread only.
     */
    virtual void handleEvent(const ScheduledEvent& event) = 0;

    /**
     * @brief Get parameter value by ID
     *
     * Thread-safe parameter access.
     *
     * @param paramId Null-terminated parameter identifier string
     * @return Current parameter value (normalized 0.0 to 1.0, or raw value)
     *
     * Thread safety: Callable from any thread.
     */
    virtual float getParameter(const char* paramId) const = 0;

    /**
     * @brief Set parameter value by ID
     *
     * Thread-safe parameter update. Parameter changes take effect
     * in the next process() call (smoothing applied if needed).
     *
     * @param paramId Null-terminated parameter identifier string
     * @param value New parameter value (normalized 0.0 to 1.0, or raw value)
     *
     * Thread safety: Callable from any thread.
     */
    virtual void setParameter(const char* paramId, float value) = 0;

    /**
     * @brief Save current state as JSON preset
     *
     * Serializes all parameters to JSON format for persistence.
     * Must not allocate memory (use provided buffer).
     *
     * @param jsonBuffer Output buffer for JSON string (caller-allocated)
     * @param jsonBufferSize Size of jsonBuffer in bytes
     * @return true if save succeeded, false if buffer too small
     *
     * Thread safety: Do not call from audio thread.
     */
    virtual bool savePreset(char* jsonBuffer, int jsonBufferSize) const = 0;

    /**
     * @brief Load state from JSON preset
     *
     * Deserializes JSON and updates all parameters.
     * Must not allocate memory (parses in-place).
     *
     * @param jsonData Null-terminated JSON string
     * @return true if load succeeded, false on parse error
     *
     * Thread safety: Do not call from audio thread.
     */
    virtual bool loadPreset(const char* jsonData) = 0;

    /**
     * @brief Get number of active voices
     *
     * Useful for monitoring CPU usage and voice management.
     *
     * @return Number of currently active voices
     *
     * Thread safety: Callable from any thread (atomic read).
     */
    virtual int getActiveVoiceCount() const = 0;

    /**
     * @brief Get maximum polyphony
     *
     * Returns the maximum number of simultaneous voices this
     * instrument can produce (voice stealing threshold).
     *
     * @return Maximum polyphony (e.g., 16, 32, 64, 128)
     *
     * Thread safety: Callable from any thread.
     */
    virtual int getMaxPolyphony() const = 0;

    /**
     * @brief Get instrument name
     *
     * Returns human-readable instrument identifier.
     *
     * @return Instrument name (e.g., "NexSynth", "SamSampler")
     *
     * Thread safety: Callable from any thread.
     */
    virtual const char* getInstrumentName() const = 0;

    /**
     * @brief Get instrument version
     *
     * Returns version string for compatibility checking.
     *
     * @return Version string (e.g., "1.0.0")
     *
     * Thread safety: Callable from any thread.
     */
    virtual const char* getInstrumentVersion() const = 0;

protected:
    // Protected constructor (interface class)
    InstrumentDSP() = default;

    // Helper: Linear interpolate parameter smoothing
    static float smoothParameter(float current, float target, float coefficient) {
        return current + coefficient * (target - current);
    }

    // Helper: Denormal prevention (flush subnormals to zero)
    static float denormalize(float x) {
        union { float f; uint32_t i; } u;
        u.f = x;
        if ((u.i & 0x7f800000) == 0) {
            u.i = 0;  // Flush subnormals to zero
        }
        return u.f;
    }

    // Helper: Fast clamping
    static float clamp(float x, float min, float max) {
        return (x < min) ? min : (x > max) ? max : x;
    }

public:
    //==============================================================================
    // Convenience Methods (optional, for testing)
    //==============================================================================

    /**
     * @brief Start a note (convenience wrapper for handleEvent)
     *
     * Default implementation creates NOTE_ON event and calls handleEvent().
     * Subclasses may override for more efficient implementation.
     *
     * @param midiNote MIDI note number (0-127)
     * @param velocity Note velocity (0.0-1.0)
     */
    virtual void noteOn(int midiNote, float velocity) {
        ScheduledEvent event;
        event.type = ScheduledEvent::NOTE_ON;
        event.time = 0.0;
        event.sampleOffset = 0;
        event.data.note.midiNote = midiNote;
        event.data.note.velocity = velocity;
        handleEvent(event);
    }

    /**
     * @brief Stop a note (convenience wrapper for handleEvent)
     *
     * Default implementation creates NOTE_OFF event and calls handleEvent().
     * Subclasses may override for more efficient implementation.
     *
     * @param midiNote MIDI note number (0-127)
     */
    virtual void noteOff(int midiNote) {
        ScheduledEvent event;
        event.type = ScheduledEvent::NOTE_OFF;
        event.time = 0.0;
        event.sampleOffset = 0;
        event.data.note.midiNote = midiNote;
        event.data.note.velocity = 0.0f;
        handleEvent(event);
    }

    /**
     * @brief Immediately silence all voices (panic/stop button)
     *
     * Called when user presses stop or panic. Must immediately kill
     * all active voices without release envelope. For emergency silence.
     *
     * Must be real-time safe (callable from audio thread).
     *
     * Default implementation does nothing. Subclasses should override.
     */
    virtual void panic() {
        // Default: do nothing (base class implementation)
    }
};

/**
 * @brief Instrument interface base class
 *
 * All Pure DSP instruments inherit from this interface.
 */
} // namespace DSP

#endif // INSTRUMENT_DSP_H_INCLUDED
