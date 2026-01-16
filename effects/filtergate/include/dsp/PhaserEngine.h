#pragma once
#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <vector>
#include <memory>
#include "dsp/AllPassFilter.h"

namespace FilterGate {

/**
 * Parameters for the phaser effect.
 */
struct PhaserParams {
    int stages = 4;          // Number of all-pass stages (4, 6, or 8)
    float rateHz = 0.5f;     // LFO rate in Hz
    float depth = 0.7f;      // Modulation depth (0..1)
    float feedback = 0.5f;   // Feedback amount (0..0.95)
    float centerHz = 1000.0f; // Center frequency for sweep
    float spread = 2000.0f;   // Frequency spread (sweep range)
    float mix = 0.5f;        // Dry/wet mix (0=dry, 1=wet)
};

/**
 * Mono phaser engine using all-pass filters and LFO modulation.
 *
 * The phaser creates sweeping notches in the frequency response by
 * modulating the coefficients of all-pass filter stages. The feedback
 * path creates resonance at the notch frequencies.
 *
 * Architecture:
 *   Input → AllPassStages → Wet → Mix → Output
 *            ↑            ↓
 *            └── Feedback ←┘
 *
 * Reference: DAFX - Digital Audio Effects (Udo Zölzer), Chapter 4
 */
class PhaserEngine {
public:
    PhaserEngine();
    ~PhaserEngine();

    /**
     * Prepare the phaser for processing.
     * @param sampleRate Sample rate in Hz
     * @param samplesPerBlock Maximum block size
     */
    void prepare(double sampleRate, int samplesPerBlock);

    /**
     * Reset all filter states and LFO phase.
     */
    void reset();

    /**
     * Set phaser parameters.
     * @param params New parameter values
     */
    void setParams(const PhaserParams& params);

    /**
     * Process mono audio.
     * @param input Input buffer
     * @param output Output buffer
     * @param numSamples Number of samples to process
     */
    void process(float* input, float* output, int numSamples);

    /**
     * Process stereo audio (processes both channels with the same modulation).
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

private:
    std::vector<std::unique_ptr<AllPassFilter>> stages;
    PhaserParams currentParams;
    PhaserParams targetParams;

    // LFO state
    float lfoPhase = 0.0f;
    double sampleRate = 48000.0;
    float lfoIncrement = 0.0f;

    // Feedback state
    float feedbackState_L = 0.0f;
    float feedbackState_R = 0.0f;

    // Parameter smoothing (prevents zipper noise)
    juce::SmoothedValue<float> smoothedMix;
    juce::SmoothedValue<float> smoothedFeedback;

    // Internal processing
    void updateLFO();
    float calculateModulation(float phase);
    void rebuildStages(int numStages);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PhaserEngine)
};

} // namespace FilterGate
