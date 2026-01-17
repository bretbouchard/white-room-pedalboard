/*
  ==============================================================================

    SamSamplerStereo.cpp
    Stereo processing implementation for Sam Sampler
    Demonstrates sample position offset and stereo filtering

  ==============================================================================
*/

#include "dsp/SamSamplerDSP.h"
#include "../../../../include/dsp/StereoProcessor.h"

namespace DSP {

//==============================================================================
// SamSamplerVoice Stereo Processing
//==============================================================================

void SamSamplerVoice::processStereo(float** outputs, int numChannels,
                                    int numSamples, double sampleRate,
                                    double positionOffset, double filterSpread)
{
    // Calculate playback position for each channel
    double leftPosition = playPosition_;
    double rightPosition = playPosition_;

    if (positionOffset > 0.0)
    {
        // Offset positions between channels for stereo effect
        leftPosition = playPosition_ - positionOffset * 0.5;
        rightPosition = playPosition_ + positionOffset * 0.5;

        // Clamp to sample bounds
        leftPosition = std::max(0.0, leftPosition);
        rightPosition = std::max(0.0, rightPosition);
    }

    // Process envelope once (shared)
    double envLevel = envelope_.process(sampleRate, numSamples);

    // Process each sample
    for (int i = 0; i < numSamples; ++i)
    {
        float leftSample = 0.0f;
        float rightSample = 0.0f;

        // Get sample for left channel
        if (sample_ && leftPosition < sample_->numSamples)
        {
            leftSample = interpolateLinear(leftPosition);
            leftPosition += playbackRate_;
        }

        // Get sample for right channel
        if (sample_ && rightPosition < sample_->numSamples)
        {
            rightSample = interpolateLinear(rightPosition);
            rightPosition += playbackRate_;
        }

        // Apply envelope
        leftSample *= static_cast<float>(envLevel);
        rightSample *= static_cast<float>(envLevel);

        // Apply per-channel filter if enabled
        if (filterEnabled_)
        {
            // Left channel filter
            {
                double leftCutoff = filter_.cutoff;
                if (filterSpread > 0.0)
                {
                    // Lower cutoff for left channel
                    leftCutoff *= (1.0 - filterSpread * 0.5);
                }
                filter_.setParameters(leftCutoff, filter_.resonance);
            }

            // Right channel filter
            {
                double rightCutoff = filter_.cutoff;
                if (filterSpread > 0.0)
                {
                    // Higher cutoff for right channel
                    rightCutoff *= (1.0 + filterSpread * 0.5);
                }
                filter_.setParameters(rightCutoff, filter_.resonance);
            }

            // Process through stereo filter
            float tempSamples[2] = {leftSample, rightSample};
            float* tempPtr[2] = {&tempSamples[0], &tempSamples[1]};
            filter_.process(tempPtr, 2, 1);

            leftSample = tempSamples[0];
            rightSample = tempSamples[1];
        }

        // Output to channels
        if (numChannels >= 2)
        {
            outputs[0][i] += leftSample;
            outputs[1][i] += rightSample;
        }
        else if (numChannels == 1)
        {
            outputs[0][i] += (leftSample + rightSample) * 0.5f;
        }
    }

    // Update play position
    playPosition_ += playbackRate_ * numSamples;
}

//==============================================================================
// SamSamplerDSP Stereo Processing
//==============================================================================

void SamSamplerDSP::processStereoSample(float& left, float& right, double phase)
{
    using namespace StereoProcessor;

    // Get stereo parameters
    double width = params_.stereoWidth;
    double positionOffset = params_.stereoPositionOffset;
    double filterSpread = params_.stereoFilterSpread;

    // Process all voices with stereo enhancement
    float leftSum = 0.0f;
    float rightSum = 0.0f;

    for (auto& voice : voices_)
    {
        if (voice && voice->isActive())
        {
            // Create temporary output buffers for this voice
            float voiceBuffer[2];

            // Process with stereo offset
            float tempLeft = 0.0f;
            float tempRight = 0.0f;
            float* tempPtr[2] = {&tempLeft, &tempRight};

            // Process voice with stereo parameters
            voice->processStereo(tempPtr, 2, 1, sampleRate_, positionOffset, filterSpread);

            leftSum += tempLeft;
            rightSum += tempRight;
        }
    }

    // Apply stereo width
    left = leftSum;
    right = rightSum;

    StereoWidth::processWidth(left, right, static_cast<float>(width));

    // Apply master volume
    left *= static_cast<float>(params_.masterVolume);
    right *= static_cast<float>(params_.masterVolume);
}

//==============================================================================
// Implementation Example: Multi-Sample Stereo Layering
//==============================================================================

/*
 * Advanced stereo technique using multiple sample layers:
 */

void SamSamplerDSP::processMultiLayerStereo(float& left, float& right)
{
    using namespace StereoProcessor;

    float width = static_cast<float>(params_.stereoWidth);

    // Layer 1: Main sample (center)
    float mainLeft = 0.0f;
    float mainRight = 0.0f;

    // Layer 2: Stereo layer (offset)
    float stereoLeft = 0.0f;
    float stereoRight = 0.0f;

    // Process voices
    for (auto& voice : voices_)
    {
        if (voice && voice->isActive())
        {
            // Main layer (center)
            float tempLeft = 0.0f;
            float tempRight = 0.0f;
            float* tempPtr[2] = {&tempLeft, &tempRight};
            voice->process(tempPtr, 2, 1, sampleRate_);

            mainLeft += tempLeft;
            mainRight += tempRight;

            // Stereo layer (offset position)
            voice->processStereo(tempPtr, 2, 1, sampleRate_,
                               params_.stereoPositionOffset,
                               params_.stereoFilterSpread);

            stereoLeft += tempLeft;
            stereoRight += tempRight;
        }
    }

    // Mix layers
    left = mainLeft * 0.7f + stereoLeft * 0.3f;
    right = mainRight * 0.7f + stereoRight * 0.3f;

    // Apply width
    StereoWidth::processWidth(left, right, width);

    // Apply master volume
    left *= static_cast<float>(params_.masterVolume);
    right *= static_cast<float>(params_.masterVolume);
}

} // namespace DSP
