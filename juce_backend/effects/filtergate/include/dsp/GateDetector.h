#pragma once
#include <juce_core/juce_core.h>

namespace FilterGate {

/**
 * Gate Detector Parameters
 *
 * Controls the behavior of the audio gate detection system.
 * Gate opens when input exceeds threshold and closes when input falls below.
 */
struct GateParams {
    float threshold = 0.5f;    // 0-1, Level at which gate opens
    float attackMs = 10.0f;    // 0-1000, Attack time in milliseconds
    float holdMs = 100.0f;     // 0-5000, Hold time in milliseconds
    float releaseMs = 200.0f;  // 0-5000, Release time in milliseconds
    float hysteresis = 0.05f;  // 0-0.5, Hysteresis amount to prevent chatter
};

/**
 * Gate Detector
 *
 * Detects when audio signal exceeds threshold and opens gate.
 * Features hysteresis to prevent rapid on/off cycling, attack/hold/release smoothing.
 *
 * Algorithm:
 * 1. Track input envelope (rectified + smoothed)
 * 2. Compare to openThreshold (threshold + hysteresis) and closeThreshold (threshold - hysteresis)
 * 3. Apply attack/hold/release timing
 * 4. Output gate state (0.0 = closed, 1.0 = open)
 *
 * Realtime-safe: No allocations in process()
 * Sample-accurate: Processes single samples or blocks
 */
class GateDetector {
public:
    GateDetector();
    ~GateDetector();

    /**
     * Prepare for processing
     * @param sampleRate Sample rate in Hz
     * @param samplesPerBlock Expected block size (for internal prep)
     */
    void prepare(double sampleRate, int samplesPerBlock);

    /**
     * Reset all state to initial values
     */
    void reset();

    /**
     * Set gate parameters
     * Thread-safe from UI thread (parameters applied atomically)
     */
    void setParams(const GateParams& newParams);

    /**
     * Process single sample
     * @param inputSample Input audio sample (-1 to 1)
     * @return true if gate is open (state > 0.5)
     */
    bool process(float inputSample);

    /**
     * Process block of samples
     * @param input Input audio buffer
     * @param numSamples Number of samples to process
     */
    void process(float* input, int numSamples);

    /**
     * Get current gate state
     * @return Gate state 0.0 (closed) to 1.0 (open)
     */
    float getGateState() const { return gateState; }

    /**
     * Check if gate is currently open
     * @return true if gate is in open state (regardless of smoothing)
     */
    bool isOpen() const { return isOpenState; }

    /**
     * Check if gate just opened this sample (for triggering envelopes)
     * @return true if gate transitioned from closed to open
     */
    bool justOpened() const { return justOpenedFlag; }

    /**
     * Process single sample (alias for process())
     * @param inputSample Input audio sample (-1 to 1)
     * @return true if gate is open
     */
    bool processSample(float inputSample) { return process(inputSample); }

private:
    GateParams params;
    double sampleRate = 48000.0;

    // State
    float gateState = 0.0f;     // 0.0 = closed, 1.0 = open (with smoothing)
    bool isOpenState = false;   // Internal open/close flag
    bool justOpenedFlag = false; // Edge detection for envelope triggering

    // Hysteresis thresholds
    float openThreshold = 0.5f;   // threshold + hysteresis
    float closeThreshold = 0.5f;  // threshold - hysteresis

    // Timing state
    int holdCounter = 0;          // Samples remaining in hold period
    bool wasOpen = false;         // Previous state for hold timer

    /**
     * Calculate envelope increment for given time
     * @param timeMs Time in milliseconds
     * @return Increment per sample
     */
    float calculateIncrement(float timeMs);

    /**
     * Update hysteresis thresholds based on params
     */
    void updateThresholds();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GateDetector)
};

} // namespace FilterGate
