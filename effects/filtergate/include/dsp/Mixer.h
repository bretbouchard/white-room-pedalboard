/*******************************************************************************
 * FilterGate - Mixer / Router
 *
 * Mixes and routes signals from Phaser A, Phaser B, Filter, and Dry paths.
 * Handles wet/dry mixing and VCA output level.
 *
 * @author FilterGate Autonomous Agent 5
 * @date  2025-12-30
 ******************************************************************************/

#pragma once

#include <memory>
#include "dsp/DualPhaser.h"
#include "dsp/FilterEngine.h"

namespace FilterGate {

/**
 * Routing modes for effect chain
 */
enum class RoutingMode {
    SERIES,         // Phaser A → Phaser B → Filter
    PARALLEL,       // Phaser A || Phaser B || Filter (all summed)
    PHASER_FILTER,  // (Phaser A || Phaser B) → Filter
    FILTER_PHASER,  // Filter → (Phaser A || Phaser B)
    STEREO_SPLIT    // Left = Phaser A, Right = Phaser B (both get Filter)
};

/**
 * Mixer parameters
 */
struct MixerParams {
    float dryLevel = 0.0f;          // Dry signal level (0-1)
    float wetLevel = 1.0f;          // Wet signal level (0-1)
    float phaserAMix = 1.0f;        // Phaser A mix (0-1)
    float phaserBMix = 1.0f;        // Phaser B mix (0-1)
    float filterMix = 1.0f;         // Filter mix (0-1)
    RoutingMode routing = RoutingMode::SERIES;
    float outputLevel = 1.0f;       // Master output (VCA)
};

/**
 * Mixer / Router
 *
 * Routes audio through various paths and mixes them together.
 *
 * Signal flow (configurable):
 * - Input → Pre Drive → Router → Phaser A, Phaser B, Filter, Dry
 * - Router output → Mixer → Post Drive → Output
 */
class Mixer {
public:
    Mixer();
    ~Mixer();

    // Parameters
    void setParams(const MixerParams& newParams);
    MixerParams getParams() const { return params; }

    // Access to DSP modules
    DualPhaser& getPhaserA() { return phaserA; }
    DualPhaser& getPhaserB() { return phaserB; }
    FilterEngine& getFilter() { return filter; }

    // Sample rate
    void prepare(double sampleRate);
    void reset();

    // Mono processing
    float processSample(float input);

    // Stereo processing
    void processStereo(float* left, float* right, int numSamples);

    // Block processing (mono)
    void process(float* inputOutput, int numSamples);

    // Block processing (stereo)
    void process(float* left, float* right, int numSamples);

    // Direct output access (for modulation)
    float getPhaserAOutput() const { return phaserAOutput; }
    float getPhaserBOutput() const { return phaserBOutput; }
    float getFilterOutput() const { return filterOutput; }

private:
    MixerParams params;

    // DSP modules
    DualPhaser phaserA;
    DualPhaser phaserB;
    FilterEngine filter;

    // Last outputs (for modulation or sidechain)
    float phaserAOutput = 0.0f;
    float phaserBOutput = 0.0f;
    float filterOutput = 0.0f;
    float dryOutput = 0.0f;

    double sampleRate = 48000.0;

    // Routing methods
    float processSeries(float input);
    float processParallel(float input);
    float processPhaserFilter(float input);
    float processFilterPhaser(float input);
    float processStereoSplit(float left, float right, float& outLeft, float& outRight);
};

} // namespace FilterGate
