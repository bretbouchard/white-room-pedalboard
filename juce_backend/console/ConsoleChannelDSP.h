/*
 * ConsoleChannelDSP.h
 *
 * Console channel strip DSP for every track and bus
 *
 * Purpose: First-class channel strip processing that exists on every track
 *          Always instantiated per track (not optional)
 *
 * Design Constraints:
 *  - No dynamic allocation in process()
 *  - Parameter-driven only (no UI touches DSP directly)
 *  - Apple TV safe (no plugins, no threads, no allocations)
 *  - Real-time safe (all operations are deterministic)
 *
 * ============================================================================
 * CONSOLE PRIMITIVE vs EFFECT PLUGIN BOUNDARIES
 * ============================================================================
 *
 * ConsoleChannelDSP is a CONSOLE PRIMITIVE, not an effect plugin.
 *
 * Fixed Processing Order (NEVER reorder):
 *   1. Silence short-circuit (idle optimization)
 *   2. Input trim
 *   3. Density/Drive (optional saturation)
 *   4. Console DSP (always-on saturation)
 *   5. EQ (3-band fixed)
 *   6. Compressor (control-rate)
 *   7. Limiter (safety)
 *   8. Pan
 *   9. Output trim
 * 10. Metering
 *
 * What THIS means:
 *   - Signal flow is FIXED by design (not user-reorderable)
 *   - All DSP must be control-rate safe
 *   - All DSP must be idle-channel safe
 *   - No per-sample coefficient recalculation
 *   - No heap allocation in audio thread
 *
 * What this is NOT:
 *   - Not a plugin wrapper
 *   - Not user-reorderable
 *   - Not optional (always exists per track)
 *   - Not bypassed (even in "clean" mode)
 *
 * Integration Rules:
 *   - Effects added here must obey control-rate and idle-safe rules
 *   - FilterGate lives here as console primitive (ChannelStripPolicy)
 *   - User effects chain is SEPARATE (reorderable plugins)
 *   - Channel view ≠ Plugin view in UI
 *
 * Created: December 30, 2025
 * Updated: December 31, 2025 (Boundary hardening)
 * Source: JUCE Backend Handoff Directive + Console X DSP Handoff
 */

#ifndef CONSOLE_CHANNEL_DSP_H_INCLUDED
#define CONSOLE_CHANNEL_DSP_H_INCLUDED

#include <cstdint>
#include <cmath>

// Forward declaration (avoid pulling in full header in DSP code)
namespace SchillingerEcosystem::Audio {
    class ChannelCPUMonitor;
}

namespace Console {

/**
 * @brief Console channel strip DSP processor
 *
 * This implements the always-on channel strip processing for every track.
 * Based on Airwindows Console X DSP (Tier 0: Core Console Foundation).
 *
 * Signal Flow:
 *   Input Trim → Density (optional) → Drive (optional) → Console DSP → Output Trim
 *
 * Per-Channel Processing:
 *   - Gain staging (input/output trim)
 *   - Console saturation (nonlinear summing)
 *   - Pan (stereo positioning)
 *   - EQ (3-band: low, mid, high)
 *   - Dynamics (compressor, limiter)
 *   - Metering (level detection)
 *
 * Architecture:
 *   - Always instantiated per track (not optional)
 *   - Never bypassed entirely (even in "clean" mode)
 *   - Mode-selectable (Pure / Classic / Color)
 *
 * CRITICAL: Console DSP order is FIXED by design.
 * Effects added here must obey control-rate and idle-safe rules.
 */
class ConsoleChannelDSP {
public:
    ConsoleChannelDSP();

    /**
     * @brief Set channel ID for CPU monitoring
     *
     * @param channelId Unique channel identifier
     */
    void setChannelId(int channelId);
    ~ConsoleChannelDSP();

    /**
     * @brief Prepare console for audio processing
     *
     * Allocate all buffers and initialize DSP here.
     * Must NOT be called from audio thread.
     *
     * @param sampleRate Sample rate in Hz
     * @param blockSize Maximum samples per process call
     * @return true if preparation succeeded
     */
    bool prepare(double sampleRate, int blockSize);

    /**
     * @brief Reset all console state
     *
     * Reset gain, filters, compressors, limiters to initial state.
     * Must be real-time safe (no allocations).
     */
    void reset();

    /**
     * @brief Process audio through console channel strip
     *
     * Apply console DSP to input buffers and write to output.
     * Processes in-place (input == output) is supported.
     *
     * @param inputs Input buffers [numChannels][numSamples]
     * @param outputs Output buffers [numChannels][numSamples]
     * @param numChannels Number of channels (typically 2 for stereo)
     * @param numSamples Number of samples in this buffer
     *
     * Thread safety: Called from audio thread only.
     */
    void process(float** inputs, float** outputs, int numChannels, int numSamples);

    /**
     * @brief Set console mode
     *
     * Modes:
     *   0 = Pure (Clean digital desk, no coloration)
     *   1 = Classic (Console6-style saturation)
     *   2 = Color (Enhanced saturation, more harmonics)
     *
     * @param mode Console mode (0-2)
     */
    void setConsoleMode(int mode);

    /**
     * @brief Get parameter value by ID
     *
     * Supported parameter IDs:
     *   - "inputTrim"     : Input gain in dB (-24.0 to +24.0)
     *   - "outputTrim"    : Output gain in dB (-24.0 to +24.0)
     *   - "pan"           : Stereo pan (-1.0 to +1.0, center = 0.0)
     *   - "eqLow"         : Low EQ gain in dB (-12.0 to +12.0)
     *   - "eqMid"         : Mid EQ gain in dB (-12.0 to +12.0)
     *   - "eqHigh"        : High EQ gain in dB (-12.0 to +12.0)
     *   - "eqLowFreq"     : Low EQ frequency in Hz (20 to 500)
     *   - "eqMidFreq"     : Mid EQ frequency in Hz (200 to 5000)
     *   - "eqHighFreq"    : High EQ frequency in Hz (2000 to 20000)
     *   - "compThreshold": Compressor threshold in dB (-60.0 to 0.0)
     *   - "compRatio"     : Compressor ratio (1.0 to 20.0)
     *   - "compAttack"    : Compressor attack in ms (0.1 to 100)
     *   - "compRelease"   : Compressor release in ms (10 to 1000)
     *   - "limiterThreshold": Limiter threshold in dB (-6.0 to 0.0)
     *   - "densityAmount": Density (saturation) amount (0.0 to 1.0)
     *   - "driveAmount"   : Drive (saturation) amount (0.0 to 1.0)
     *   - "mute"          : Mute toggle (0.0 = off, 1.0 = on)
     *   - "solo"          : Solo toggle (0.0 = off, 1.0 = on)
     *
     * @param paramId Null-terminated parameter identifier
     * @return Current parameter value
     */
    float getParameter(const char* paramId) const;

    /**
     * @brief Set parameter value by ID
     *
     * All parameter changes are smoothed to avoid clicks.
     * Takes effect in the next process() call.
     *
     * @param paramId Null-terminated parameter identifier
     * @param value New parameter value
     */
    void setParameter(const char* paramId, float value);

    /**
     * @brief Save console state as JSON preset
     *
     * @param jsonBuffer Output buffer for JSON (caller-allocated)
     * @param jsonBufferSize Size of jsonBuffer in bytes
     * @return true if save succeeded
     */
    bool savePreset(char* jsonBuffer, int jsonBufferSize) const;

    /**
     * @brief Load console state from JSON preset
     *
     * @param jsonData Null-terminated JSON string
     * @return true if load succeeded
     */
    bool loadPreset(const char* jsonData);

    /**
     * @brief Get current output level (for metering)
     *
     * Returns peak level in dBFS (after output trim).
     *
     * @param channel Channel index (0 = left, 1 = right)
     * @return Peak level in dBFS (negative values)
     */
    float getOutputLevel(int channel) const;

    /**
     * @brief Get gain reduction in dB (for metering)
     *
     * Returns current compressor/limiter gain reduction.
     *
     * @return Gain reduction in dB (positive values)
     */
    float getGainReduction() const;

private:
    //==============================================================================
    // Silence / Idle Detection (Task 1: Channel Short-Circuit)
    struct ChannelState {
        bool automationActive = false;
        bool modulationActive = false;
        bool forceActive = false;  // solo, preview, etc.
        bool isIdle = true;
    };

    struct EnergyMeter {
        float rmsLevel = 0.0f;
        float peakLevel = 0.0f;
        float envelope = 0.0f;

        void processSample(float sample);
        void reset();
        float getLeveldB() const;
    };

    //==============================================================================
    // Sample rate and block size
    double sampleRate_;
    int maxBlockSize_;

    // Console mode (0 = Pure, 1 = Classic, 2 = Color)
    int consoleMode_;

    // Silence detection
    float silenceThreshold_ = -80.0f;  // dBFS (conservative)
    EnergyMeter inputMeter_;

    // Channel state
    ChannelState channelState_;

    // Pre-allocated buffers (no heap alloc in process())
    float* tempBufferLeft_ = nullptr;
    float* tempBufferRight_ = nullptr;
    int tempBufferSize_ = 0;

    // Parameters (smoothed)
    float inputTrim_;       // Input gain (linear scale)
    float outputTrim_;      // Output gain (linear scale)
    float pan_;             // Stereo pan (-1 to +1)

    // EQ parameters
    float eqLowGain_;       // Low EQ gain (linear scale)
    float eqMidGain_;       // Mid EQ gain (linear scale)
    float eqHighGain_;      // High EQ gain (linear scale)
    float eqLowFreq_;       // Low EQ frequency (Hz)
    float eqMidFreq_;       // Mid EQ frequency (Hz)
    float eqHighFreq_;      // High EQ frequency (Hz)

    // Compressor parameters
    float compThreshold_;   // Threshold (linear scale)
    float compRatio_;       // Ratio (1.0 to inf)
    float compAttack_;      // Attack time (seconds)
    float compRelease_;     // Release time (seconds)

    // Limiter parameters
    float limiterThreshold_; // Threshold (linear scale)

    // Saturation parameters
    float densityAmount_;    // Density (0.0 to 1.0)
    float driveAmount_;      // Drive (0.0 to 1.0)

    // Mute/solo
    bool mute_;
    bool solo_;

    // DSP state (not smoothed, real-time variables)
    float compEnvelope_;     // Compressor envelope follower
    float limiterEnvelope_;  // Limiter envelope follower
    float outputLevelL_;     // Left channel peak meter
    float outputLevelR_;     // Right channel peak meter
    float gainReduction_;    // Current GR in dB

    // Task 3: Control-rate compressor optimization
    float compGainSmoother_;  // Smoothed compressor gain
    int compControlCounter_;  // Control-rate counter
    static constexpr int compControlInterval = 32;  // Update every 32 samples (~1.5kHz @ 48k)

    // Smoothing coefficients
    float paramSmoothing_;
    float meterDecay_;

    // Task 5: CPU Monitoring
    int channelId_ = 0;  // For CPU tracking
    SchillingerEcosystem::Audio::ChannelCPUMonitor* cpuMonitor_ = nullptr;

    // Helper methods
    float dbToLinear(float db) const;
    float linearToDb(float linear) const;
    void processConsole(float* left, float* right, int numSamples);
    void processEQ(float* left, float* right, int numSamples);
    void processCompressor(float* left, float* right, int numSamples);
    void processLimiter(float* left, float* right, int numSamples);
    void processPan(float* left, float* right, int numSamples);
    void updateMeters(float* left, float* right, int numSamples);

    // Silence / Idle detection (Task 1)
    bool isChannelIdle(float** inputs, int numChannels, int numSamples);
    void updateChannelState();
    float measureInputEnergy(float** inputs, int numChannels, int numSamples);

    // Airwindows Console X DSP (Tier 0)
    // These will be extracted from Airwindows Console4/5/6
    void applyConsoleSaturation(float& sample);
    void applyDensity(float& sample);
    void applyDrive(float& sample);
};

} // namespace Console

#endif // CONSOLE_CHANNEL_DSP_H_INCLUDED
