/*******************************************************************************
 * FilterGate - Drive Stage
 *
 * Soft-clipping saturation stage for pre- and post-drive.
 *
 * @author FilterGate Autonomous Agent 5
 * @date  2025-12-30
 ******************************************************************************/

#pragma once

#include <juce_dsp/juce_dsp.h>

namespace FilterGate {

/**
 * Drive curve types
 */
enum class DriveType {
    SOFT_CLIP,      // Smooth tanh saturation
    HARD_CLIP,      // Brutal clipping
    ASYMMETRIC,     // Asymmetric clipping (tube-like)
    FUZZ,           // Heavy fuzz saturation
    DRIVE_TYPE_COUNT
};

/**
 * Drive parameters
 */
struct DriveParams {
    float drive = 0.0f;         // 0.0 - 1.0 (amount of saturation)
    float outputGain = 1.0f;    // Makeup gain
    DriveType type = DriveType::SOFT_CLIP;
    float tone = 0.5f;          // 0.0 - 1.0 (tone control, optional)
};

/**
 * Drive Stage
 *
 * Applies soft/hard clipping saturation with optional tone control.
 * Uses tanh-based soft clipping for smooth distortion.
 */
class DriveStage {
public:
    DriveStage();
    ~DriveStage();

    // Parameters
    void setParams(const DriveParams& newParams);
    DriveParams getParams() const { return params; }

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

private:
    DriveParams params;

    juce::dsp::StateVariableTPTFilter<float> toneFilter;

    float softClip(float x);
    float hardClip(float x);
    float asymmetricClip(float x);
    float fuzzClip(float x);

    float applyDrive(float input);

    double sampleRate = 48000.0;
};

} // namespace FilterGate
