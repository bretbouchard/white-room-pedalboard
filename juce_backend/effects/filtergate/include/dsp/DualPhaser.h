#pragma once
#include "dsp/PhaserEngine.h"

namespace FilterGate {

/**
 * Routing modes for dual phaser.
 */
enum PhaserRouting {
    SERIAL,     // Phaser A → Phaser B (cascaded)
    PARALLEL,   // Phaser A || Phaser B (summed)
    STEREO      // Left = Phaser A, Right = Phaser B (independent)
};

/**
 * Parameters for dual phaser effect.
 */
struct DualPhaserParams {
    PhaserParams phaserA;              // Parameters for phaser A
    PhaserParams phaserB;              // Parameters for phaser B
    PhaserRouting routing = SERIAL;    // How to combine the two phasers
    float lfoPhaseOffset = 0.0f;       // LFO phase offset in degrees (0-180)
    float crossFeedback = 0.0f;        // Cross-feedback from B to A (0-1)
};

/**
 * Dual phaser engine with flexible routing and modulation options.
 *
 * This class combines two independent phaser engines with multiple routing modes:
 * - SERIAL: Signal flows through A then B (cascaded filtering)
 * - PARALLEL: Signal flows through A and B independently, then summed
 * - STEREO: Left channel uses A, right channel uses B (true stereo)
 *
 * The LFO phase offset allows the two phasers to sweep at different times,
 * creating wider stereo imaging or more complex modulation patterns.
 *
 * Cross-feedback routes the output of phaser B back into phaser A's input,
 * creating complex interaction between the two phaser stages.
 */
class DualPhaser {
public:
    DualPhaser();
    ~DualPhaser();

    /**
     * Prepare the dual phaser for processing.
     * @param sampleRate Sample rate in Hz
     * @param samplesPerBlock Maximum block size
     */
    void prepare(double sampleRate, int samplesPerBlock);

    /**
     * Reset both phaser engines.
     */
    void reset();

    /**
     * Set dual phaser parameters.
     * @param params New parameter values
     */
    void setParams(const DualPhaserParams& params);

    /**
     * Process mono audio (routing mode determines how phasers are combined).
     * @param input Input buffer
     * @param output Output buffer
     * @param numSamples Number of samples to process
     */
    void process(float* input, float* output, int numSamples);

    /**
     * Process stereo audio (behavior depends on routing mode).
     * @param left Left channel buffer (modified in-place)
     * @param right Right channel buffer (modified in-place)
     * @param numSamples Number of samples to process
     */
    void processStereo(float* left, float* right, int numSamples);

    /**
     * Process single sample (mono).
     * @param input Input sample
     * @return Processed output sample
     */
    float processSample(float input);

    /**
     * Get last output from phaser A (for modulation or monitoring).
     * @return Last output sample from phaser A
     */
    float getCurrentOutputA() const;

    /**
     * Get last output from phaser B (for modulation or monitoring).
     * @return Last output sample from phaser B
     */
    float getCurrentOutputB() const;

private:
    PhaserEngine phaserA;
    PhaserEngine phaserB;
    DualPhaserParams currentParams;

    // Cross-feedback state
    float crossFeedbackState = 0.0f;

    // Last outputs (for modulation access)
    float lastOutputA = 0.0f;
    float lastOutputB = 0.0f;

    // Processing methods for different routing modes
    void processSerial(float* input, float* output, int numSamples);
    void processParallel(float* input, float* output, int numSamples);
    void processStereoMode(float* left, float* right, int numSamples);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DualPhaser)
};

} // namespace FilterGate
