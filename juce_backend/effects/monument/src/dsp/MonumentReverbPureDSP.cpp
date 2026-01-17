/*
 ==============================================================================
    MonumentReverbPureDSP.cpp
    Exterior/Open-Air Reverb System - Pure DSP Implementation

 ==============================================================================
*/

#include "MonumentReverbPureDSP.h"
#include <cstring>

namespace schill {
namespace monument {

//==============================================================================
// Ground Characteristics
//==============================================================================

MonumentReverbPureDSP::GroundCharacteristics
MonumentReverbPureDSP::getGroundCharacteristics(SurfaceType surface) const {
    GroundCharacteristics chars;

    switch (surface) {
        case SurfaceType::Grass:
            chars.reflectivity = 0.3f;
            chars.absorption = 0.7f;
            chars.diffusion = 0.8f;
            chars.roughnessFactor = 0.9f;
            break;

        case SurfaceType::Soil:
            chars.reflectivity = 0.25f;
            chars.absorption = 0.75f;
            chars.diffusion = 0.7f;
            chars.roughnessFactor = 0.95f;
            break;

        case SurfaceType::Wood:
            chars.reflectivity = 0.5f;
            chars.absorption = 0.4f;
            chars.diffusion = 0.6f;
            chars.roughnessFactor = 0.4f;
            break;

        case SurfaceType::Concrete:
            chars.reflectivity = 0.7f;
            chars.absorption = 0.2f;
            chars.diffusion = 0.3f;
            chars.roughnessFactor = 0.3f;
            break;

        case SurfaceType::Marble:
            chars.reflectivity = 0.85f;
            chars.absorption = 0.1f;
            chars.diffusion = 0.2f;
            chars.roughnessFactor = 0.1f;
            break;

        case SurfaceType::Stone:
            chars.reflectivity = 0.75f;
            chars.absorption = 0.15f;
            chars.diffusion = 0.4f;
            chars.roughnessFactor = 0.5f;
            break;

        case SurfaceType::Snow:
            chars.reflectivity = 0.9f;
            chars.absorption = 0.05f;
            chars.diffusion = 0.95f;
            chars.roughnessFactor = 0.7f;
            break;

        case SurfaceType::Ice:
            chars.reflectivity = 0.95f;
            chars.absorption = 0.02f;
            chars.diffusion = 0.3f;
            chars.roughnessFactor = 0.05f;
            break;
    }

    return chars;
}

//==============================================================================
// Parameter Smoothing
//==============================================================================

inline float smoothParameter(float current, float target, float coeff) {
    return current + coeff * (target - current);
}

//==============================================================================
// Processing Functions
//==============================================================================

void MonumentReverbPureDSP::processEarlyReflections(
    const float* input, float* output, int numSamples) {

    // Get ground characteristics
    auto ground = getGroundCharacteristics(static_cast<SurfaceType>(currentParams_.surface));

    // Calculate delay based on source height (higher = longer delay)
    float heightDelay = currentParams_.height * 0.001f; // 1ms per meter
    int delaySamples = static_cast<int>(heightDelay * sampleRate_);

    // Combine with roughness for spread
    float spread = ground.roughnessFactor * currentParams_.roughness;
    float reflectionGain = ground.reflectivity * currentParams_.hardness;

    for (int i = 0; i < numSamples; ++i) {
        // Write input to delay line
        earlyDelayLine_[earlyWriteIndex_] = input[i];

        // Read with delay
        int readIndex = (earlyWriteIndex_ - delaySamples + earlyDelaySize_) % earlyDelaySize_;
        float delayed = earlyDelayLine_[readIndex];

        // Add spread using interpolation
        float readPos = readIndex + spread * 10.0f;
        if (readPos >= earlyDelaySize_) readPos -= earlyDelaySize_;
        float spreadSample = linearInterpolate(earlyDelayLine_.data(), earlyDelaySize_, readPos);

        // Combine direct and reflected
        output[i] = input[i] * (1.0f - reflectionGain) + spreadSample * reflectionGain;

        // Advance write index
        earlyWriteIndex_ = (earlyWriteIndex_ + 1) % earlyDelaySize_;
    }
}

void MonumentReverbPureDSP::processDiffuseTail(
    const float* input, float* output, int numSamples) {

    // Vegetation affects absorption and diffusion
    float vegetationAbsorption = currentParams_.density * 0.5f;
    float vegetationDiffusion = currentParams_.density * 0.3f;

    // Tail decay based on ground wetness and vegetation
    float decay = currentParams_.tailDecay * currentParams_.scale;
    float feedback = std::exp(-1.0f / (decay * sampleRate_));
    feedback *= (1.0f - vegetationAbsorption);

    // Ground wetness affects damping
    float damping = 0.3f + currentParams_.groundWetness * 0.4f;

    // Process through delay network
    std::fill(output, output + numSamples, 0.0f);

    for (int i = 0; i < numDiffuseDelays; ++i) {
        auto& delayNet = diffuseDelays_[i];

        // Vary feedback slightly for each delay
        float delayFeedback = feedback * (1.0f + i * 0.05f);

        for (int j = 0; j < numSamples; ++j) {
            // Write input + feedback
            float inputSample = input[j];
            float delayed = delayNet.delayLine[delayNet.writeIndex];
            float feedbackSample = delayed * delayFeedback;

            // Apply damping
            float dampState = delayNet.delayLine[delayNet.writeIndex];
            dampState = dampState * damping + inputSample * (1.0f - damping);
            delayNet.delayLine[delayNet.writeIndex] = dampState + feedbackSample;

            // Read with offset for diffusion
            int readIndex = (delayNet.writeIndex -
                static_cast<int>(sampleRate_ * 0.01f * (i + 1)) +
                static_cast<int>(delayNet.delayLine.size())) %
                static_cast<int>(delayNet.delayLine.size());

            float outSample = delayNet.delayLine[readIndex];

            // Add to output
            output[j] += outSample / numDiffuseDelays;

            // Advance write index
            delayNet.writeIndex = (delayNet.writeIndex + 1) %
                static_cast<int>(delayNet.delayLine.size());
        }
    }
}

void MonumentReverbPureDSP::processHorizonEcho(
    const float* input, float* output, int numSamples) {

    if (currentParams_.horizonEnabled < 0.5f) {
        std::copy(input, input + numSamples, output);
        return;
    }

    // Calculate delay time
    float delayTime = currentParams_.horizonDelay * currentParams_.scale;
    int delaySamples = static_cast<int>(delayTime * sampleRate_);

    // Echo gain based on distance (simulated by scale)
    float echoGain = 0.3f * (2.0f - currentParams_.scale);

    for (int i = 0; i < numSamples; ++i) {
        // Write input to delay line
        horizonDelayLine_[horizonWriteIndex_] = input[i];

        // Read delayed sample
        int readIndex = (horizonWriteIndex_ - delaySamples + horizonDelaySize_) % horizonDelaySize_;
        float delayed = horizonDelayLine_[readIndex];

        // Mix input and echo
        output[i] = input[i] + delayed * echoGain;

        // Advance write index
        horizonWriteIndex_ = (horizonWriteIndex_ + 1) % horizonDelaySize_;
    }
}

void MonumentReverbPureDSP::processAirAbsorption(float* samples, int numSamples) {
    // Simple first-order lowpass to simulate air absorption
    float cutoff = 1000.0f + currentParams_.air * 9000.0f; // 1kHz to 10kHz
    float rc = 1.0f / (2.0f * 3.14159f * cutoff);
    float dt = 1.0f / sampleRate_;
    float alpha = dt / (rc + dt);

    for (int i = 0; i < numSamples; ++i) {
        airFilterState_ = airFilterState_ + alpha * (samples[i] - airFilterState_);
        samples[i] = airFilterState_;
    }
}

//==============================================================================
// Main Processing
//==============================================================================

void MonumentReverbPureDSP::processBlock(
    const float* const* inputChannels,
    float* const* outputChannels,
    int numInputChannels,
    int numOutputChannels,
    int numSamples,
    const MonumentReverbParams& params) {

    // Smooth parameters
    smoothedParams_.wet = smoothParameter(smoothedParams_.wet, params.wet, smoothingCoefficient_);
    smoothedParams_.dry = smoothParameter(smoothedParams_.dry, params.dry, smoothingCoefficient_);
    smoothedParams_.scale = smoothParameter(smoothedParams_.scale, params.scale, smoothingCoefficient_);
    smoothedParams_.air = smoothParameter(smoothedParams_.air, params.air, smoothingCoefficient_);
    smoothedParams_.hardness = smoothParameter(smoothedParams_.hardness, params.hardness, smoothingCoefficient_);
    smoothedParams_.roughness = smoothParameter(smoothedParams_.roughness, params.roughness, smoothingCoefficient_);
    smoothedParams_.groundWetness = smoothParameter(smoothedParams_.groundWetness, params.groundWetness, smoothingCoefficient_);
    smoothedParams_.height = smoothParameter(smoothedParams_.height, params.height, smoothingCoefficient_);
    smoothedParams_.density = smoothParameter(smoothedParams_.density, params.density, smoothingCoefficient_);
    smoothedParams_.jitter = smoothParameter(smoothedParams_.jitter, params.jitter, smoothingCoefficient_);
    smoothedParams_.horizonDelay = smoothParameter(smoothedParams_.horizonDelay, params.horizonDelay, smoothingCoefficient_);
    smoothedParams_.tailDecay = smoothParameter(smoothedParams_.tailDecay, params.tailDecay, smoothingCoefficient_);

    // Update integer parameters
    smoothedParams_.surface = params.surface;
    smoothedParams_.horizonEnabled = params.horizonEnabled;
    smoothedParams_.tailEnabled = params.tailEnabled;

    currentParams_ = smoothedParams_;

    // Process stereo (use left channel for mono processing)
    int numChannelsToProcess = std::min(numInputChannels, 2);
    int outputChannelsToProcess = std::min(numOutputChannels, 2);

    for (int ch = 0; ch < outputChannelsToProcess; ++ch) {
        const float* input = (ch < numInputChannels) ? inputChannels[ch] : inputChannels[0];
        float* output = outputChannels[ch];

        // Copy dry signal
        std::copy(input, input + numSamples, tempBuffer_.data());

        // Process through reverb stages
        if (currentParams_.tailEnabled > 0.5f) {
            processEarlyReflections(tempBuffer_.data(), earlyBuffer_.data(), numSamples);
            processDiffuseTail(earlyBuffer_.data(), diffuseBuffer_.data(), numSamples);

            // Apply air absorption
            if (currentParams_.air > 0.01f) {
                processAirAbsorption(diffuseBuffer_.data(), numSamples);
            }
        } else {
            std::fill(diffuseBuffer_.begin(), diffuseBuffer_.begin() + numSamples, 0.0f);
        }

        // Process horizon echo
        if (currentParams_.horizonEnabled > 0.5f) {
            processHorizonEcho(diffuseBuffer_.data(), horizonBuffer_.data(), numSamples);
        } else {
            std::copy(diffuseBuffer_.data(), diffuseBuffer_.data() + numSamples, horizonBuffer_.data());
        }

        // Mix wet and dry
        for (int i = 0; i < numSamples; ++i) {
            output[i] = input[i] * currentParams_.dry + horizonBuffer_[i] * currentParams_.wet;
        }
    }
}

void MonumentReverbPureDSP::setParameters(const MonumentReverbParams& params) {
    // Parameters will be smoothed during processing
}

} // namespace monument
} // namespace schill
