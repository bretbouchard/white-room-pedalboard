/*******************************************************************************
 * FilterGate - Drive Stage Implementation
 ******************************************************************************/

#include "dsp/DriveStage.h"
#include <algorithm>
#include <cmath>

namespace FilterGate {

DriveStage::DriveStage() {
    // Prepare tone filter
    toneFilter.reset();
    sampleRate = 48000.0;
}

DriveStage::~DriveStage() {
    // Nothing to do
}

void DriveStage::setParams(const DriveParams& newParams) {
    params = newParams;

    // Update tone filter frequency
    // Map tone 0-1 to frequency 200Hz-10kHz
    float frequency = 200.0f * std::pow(50.0f, params.tone);
    toneFilter.setCutoffFrequency(frequency);
}

void DriveStage::prepare(double newSampleRate) {
    sampleRate = newSampleRate;

    // Prepare tone filter
    toneFilter.prepare({sampleRate, static_cast<juce::uint32>(sampleRate / 64), 1});
}

void DriveStage::reset() {
    toneFilter.reset();
    toneFilter.setCutoffFrequency(1000.0f);
}

float DriveStage::softClip(float x) {
    // Tanh soft clipping
    return std::tanh(x);
}

float DriveStage::hardClip(float x) {
    // Brutal hard clipping at ±1
    return std::max(-1.0f, std::min(1.0f, x));
}

float DriveStage::asymmetricClip(float x) {
    // Asymmetric tube-style clipping
    // More headroom on positive side
    if (x > 0.0f) {
        return std::tanh(x * 1.5f);
    } else {
        return std::tanh(x * 0.8f);
    }
}

float DriveStage::fuzzClip(float x) {
    // Heavy fuzz saturation
    // Gain -> tanh -> gain
    float gain = 10.0f;
    float y = x * gain;
    y = std::tanh(y);
    return y / std::tanh(gain);
}

float DriveStage::applyDrive(float input) {
    // Input gain based on drive amount (0-1 maps to 0-60dB)
    float driveGain = juce::Decibels::decibelsToGain(params.drive * 60.0f);
    float driven = input * driveGain;

    // Apply clipping curve
    float clipped = 0.0f;

    switch (params.type) {
        case DriveType::SOFT_CLIP:
            clipped = softClip(driven);
            break;

        case DriveType::HARD_CLIP:
            clipped = hardClip(driven);
            break;

        case DriveType::ASYMMETRIC:
            clipped = asymmetricClip(driven);
            break;

        case DriveType::FUZZ:
            clipped = fuzzClip(driven);
            break;

        default:
            clipped = softClip(driven);
            break;
    }

    // Apply output gain (makeup gain)
    // As drive increases, reduce output to prevent clipping
    float makeupGain = params.outputGain * (1.0f / (1.0f + params.drive * 0.5f));
    return clipped * makeupGain;
}

float DriveStage::processSample(float input) {
    // Apply drive
    float driven = applyDrive(input);

    // Note: Tone filter requires AudioBlock, so we skip it for single sample processing
    // For full implementation, use block processing methods

    return driven;
}

void DriveStage::processStereo(float* left, float* right, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        left[i] = processSample(left[i]);
        right[i] = processSample(right[i]);
    }
}

void DriveStage::process(float* inputOutput, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        inputOutput[i] = processSample(inputOutput[i]);
    }
}

void DriveStage::process(float* left, float* right, int numSamples) {
    processStereo(left, right, numSamples);
}

} // namespace FilterGate
