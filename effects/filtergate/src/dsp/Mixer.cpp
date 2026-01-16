/*******************************************************************************
 * FilterGate - Mixer / Router Implementation
 ******************************************************************************/

#include "dsp/Mixer.h"
#include <algorithm>
#include <cmath>

namespace FilterGate {

Mixer::Mixer() {
    sampleRate = 48000.0;
}

Mixer::~Mixer() {
    // Smart pointers handle cleanup
}

void Mixer::setParams(const MixerParams& newParams) {
    params = newParams;

    // Update phaser A parameters
    DualPhaserParams phaserAParams;
    phaserAParams.phaserA.mix = params.phaserAMix;
    phaserA.setParams(phaserAParams);

    // Update phaser B parameters
    DualPhaserParams phaserBParams;
    phaserBParams.phaserB.mix = params.phaserBMix;
    phaserB.setParams(phaserBParams);
}

void Mixer::prepare(double newSampleRate) {
    sampleRate = newSampleRate;

    // Prepare all DSP modules with default block size
    // (FilterGateProcessor prepares with actual block size, but this is a reasonable default)
    int defaultBlockSize = 512;
    phaserA.prepare(sampleRate, defaultBlockSize);
    phaserB.prepare(sampleRate, defaultBlockSize);
    filter.prepare(sampleRate, defaultBlockSize);
}

void Mixer::reset() {
    phaserA.reset();
    phaserB.reset();
    filter.reset();

    phaserAOutput = 0.0f;
    phaserBOutput = 0.0f;
    filterOutput = 0.0f;
    dryOutput = 0.0f;
}

float Mixer::processSeries(float input) {
    // Series routing: Phaser A → Phaser B → Filter
    float temp = input;

    temp = phaserA.processSample(temp);
    phaserAOutput = temp;

    temp = phaserB.processSample(temp);
    phaserBOutput = temp;

    temp = filter.processSample(temp);
    filterOutput = temp;

    dryOutput = input;

    // Mix dry and wet
    float output = (dryOutput * params.dryLevel) + (filterOutput * params.wetLevel);

    return output * params.outputLevel;
}

float Mixer::processParallel(float input) {
    // Parallel routing: All effects in parallel, then summed
    float outPhaserA = phaserA.processSample(input);
    phaserAOutput = outPhaserA;

    float outPhaserB = phaserB.processSample(input);
    phaserBOutput = outPhaserB;

    float outFilter = filter.processSample(input);
    filterOutput = outFilter;

    dryOutput = input;

    // Mix all paths
    float wet = (outPhaserA * params.phaserAMix) +
                (outPhaserB * params.phaserBMix) +
                (outFilter * params.filterMix);

    // Normalize to prevent clipping (divide by number of active paths)
    int activePaths = (params.phaserAMix > 0.0f ? 1 : 0) +
                     (params.phaserBMix > 0.0f ? 1 : 0) +
                     (params.filterMix > 0.0f ? 1 : 0);

    if (activePaths > 1) {
        wet /= static_cast<float>(activePaths);
    }

    float output = (dryOutput * params.dryLevel) + (wet * params.wetLevel);

    return output * params.outputLevel;
}

float Mixer::processPhaserFilter(float input) {
    // Phaser || Phaser → Filter
    float phaserMix = (phaserA.processSample(input) * params.phaserAMix) +
                      (phaserB.processSample(input) * params.phaserBMix);

    phaserAOutput = phaserA.getCurrentOutputA();
    phaserBOutput = phaserB.getCurrentOutputB();

    // Normalize phaser mix
    int activePhasers = (params.phaserAMix > 0.0f ? 1 : 0) +
                       (params.phaserBMix > 0.0f ? 1 : 0);
    if (activePhasers > 1) {
        phaserMix /= static_cast<float>(activePhasers);
    }

    float filtered = filter.processSample(phaserMix);
    filterOutput = filtered;

    dryOutput = input;

    float output = (dryOutput * params.dryLevel) + (filtered * params.wetLevel);

    return output * params.outputLevel;
}

float Mixer::processFilterPhaser(float input) {
    // Filter → (Phaser || Phaser)
    float filtered = filter.processSample(input);
    filterOutput = filtered;

    float phaserMix = (phaserA.processSample(filtered) * params.phaserAMix) +
                      (phaserB.processSample(filtered) * params.phaserBMix);

    phaserAOutput = phaserA.getCurrentOutputA();
    phaserBOutput = phaserB.getCurrentOutputB();

    // Normalize phaser mix
    int activePhasers = (params.phaserAMix > 0.0f ? 1 : 0) +
                       (params.phaserBMix > 0.0f ? 1 : 0);
    if (activePhasers > 1) {
        phaserMix /= static_cast<float>(activePhasers);
    }

    dryOutput = input;

    float output = (dryOutput * params.dryLevel) + (phaserMix * params.wetLevel);

    return output * params.outputLevel;
}

float Mixer::processStereoSplit(float left, float right, float& outLeft, float& outRight) {
    // Stereo split: Left channel gets Phaser A, Right gets Phaser B
    // Both get Filter processing
    float outLeftPhaser = phaserA.processSample(left);
    phaserAOutput = outLeftPhaser;

    float outRightPhaser = phaserB.processSample(right);
    phaserBOutput = outRightPhaser;

    // Apply filter to both channels
    float leftFiltered = filter.processSample(outLeftPhaser);
    float rightFiltered = filter.processSample(outRightPhaser);
    filterOutput = (leftFiltered + rightFiltered) * 0.5f;

    dryOutput = (left + right) * 0.5f;

    // Mix dry/wet
    outLeft = (left * params.dryLevel) + (leftFiltered * params.wetLevel);
    outRight = (right * params.dryLevel) + (rightFiltered * params.wetLevel);

    // Apply output level
    outLeft *= params.outputLevel;
    outRight *= params.outputLevel;

    return (outLeft + outRight) * 0.5f; // Return mono sum
}

float Mixer::processSample(float input) {
    switch (params.routing) {
        case RoutingMode::SERIES:
            return processSeries(input);

        case RoutingMode::PARALLEL:
            return processParallel(input);

        case RoutingMode::PHASER_FILTER:
            return processPhaserFilter(input);

        case RoutingMode::FILTER_PHASER:
            return processFilterPhaser(input);

        case RoutingMode::STEREO_SPLIT:
            // For mono input, duplicate to stereo then process
            float left, right;
            return processStereoSplit(input, input, left, right);

        default:
            return processSeries(input);
    }
}

void Mixer::processStereo(float* left, float* right, int numSamples) {
    if (params.routing == RoutingMode::STEREO_SPLIT) {
        // True stereo processing
        for (int i = 0; i < numSamples; ++i) {
            processStereoSplit(left[i], right[i], left[i], right[i]);
        }
    } else {
        // Mono processing applied to both channels
        for (int i = 0; i < numSamples; ++i) {
            float mono = (left[i] + right[i]) * 0.5f;
            float output = processSample(mono);
            left[i] = output;
            right[i] = output;
        }
    }
}

void Mixer::process(float* inputOutput, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        inputOutput[i] = processSample(inputOutput[i]);
    }
}

void Mixer::process(float* left, float* right, int numSamples) {
    processStereo(left, right, numSamples);
}

} // namespace FilterGate
