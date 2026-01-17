/*
  ==============================================================================

    NexSynthStereo.cpp
    Stereo processing implementation for NEX FM Synthesizer
    Demonstrates Mutable Instruments-style odd/even operator separation

  ==============================================================================
*/

#include "dsp/NexSynthDSP.h"
#include "../../../../include/dsp/StereoProcessor.h"

namespace DSP {

//==============================================================================
// NexSynthVoice Stereo Processing
//==============================================================================

void NexSynthVoice::processStereo(float** outputs, int numChannels, int numSamples,
                                  double sampleRate, bool oddEvenSeparation,
                                  double operatorDetune)
{
    // Process all operators for each channel
    std::array<double, 5> leftOperatorOutputs{0.0, 0.0, 0.0, 0.0, 0.0};
    std::array<double, 5> rightOperatorOutputs{0.0, 0.0, 0.0, 0.0, 0.0};

    // Batch process operators for left channel
    for (size_t op = 0; op < 5; ++op)
    {
        double frequency = frequency_;

        // Apply stereo detune if enabled
        if (operatorDetune > 0.0 && oddEvenSeparation)
        {
            // Left channel detune
            double detuneMult = std::pow(2.0, (-operatorDetune * 0.5) / 12.0);
            frequency *= detuneMult;
        }

        // Update operator frequency
        operators_[op].phaseIncrement = (frequency * operators_[op].frequencyRatio *
                                        operators_[op].detuneFactor) / sampleRate;

        // Process operator with modulation
        double modulation = 0.0;
        for (size_t modOp = 0; modOp < 5; ++modOp)
        {
            if (currentAlgorithmMatrix_[op][modOp] > 0.0)
            {
                modulation += leftOperatorOutputs[modOp] *
                             currentAlgorithmMatrix_[op][modOp] *
                             operators_[modOp].modulationIndex;
            }
        }

        leftOperatorOutputs[op] = operators_[op].process(modulation, sampleRate,
                                                         feedbackOutputs_[op]);
    }

    // Batch process operators for right channel
    for (size_t op = 0; op < 5; ++op)
    {
        double frequency = frequency_;

        // Apply stereo detune if enabled
        if (operatorDetune > 0.0 && oddEvenSeparation)
        {
            // Right channel detune
            double detuneMult = std::pow(2.0, (operatorDetune * 0.5) / 12.0);
            frequency *= detuneMult;
        }

        // Update operator frequency
        operators_[op].phaseIncrement = (frequency * operators_[op].frequencyRatio *
                                        operators_[op].detuneFactor) / sampleRate;

        // Process operator with modulation
        double modulation = 0.0;
        for (size_t modOp = 0; modOp < 5; ++modOp)
        {
            if (currentAlgorithmMatrix_[op][modOp] > 0.0)
            {
                modulation += rightOperatorOutputs[modOp] *
                             currentAlgorithmMatrix_[op][modOp] *
                             operators_[modOp].modulationIndex;
            }
        }

        rightOperatorOutputs[op] = operators_[op].process(modulation, sampleRate,
                                                          feedbackOutputs_[op]);
    }

    // Mix operator outputs with odd/even separation
    double leftOutput = 0.0;
    double rightOutput = 0.0;

    for (size_t op = 0; op < 5; ++op)
    {
        using namespace StereoProcessor;

        double opOutput = leftOperatorOutputs[op] * operators_[op].outputLevel *
                         operators_[op].envelope.currentLevel;

        if (oddEvenSeparation)
        {
            // Odd/even separation: Even operators → Left, Odd → Right
            OddEvenSeparation::applySeparation(op, true, static_cast<float>(opOutput),
                                               reinterpret_cast<float&>(leftOutput),
                                               reinterpret_cast<float&>(rightOutput),
                                               1.0f);
        }
        else
        {
            // No separation - equal to both channels
            leftOutput += opOutput;
            rightOutput += opOutput;
        }
    }

    // Apply velocity
    leftOutput *= velocity_;
    rightOutput *= velocity_;

    // Output to channels
    for (int i = 0; i < numSamples; ++i)
    {
        if (numChannels >= 2)
        {
            outputs[0][i] += static_cast<float>(leftOutput);
            outputs[1][i] += static_cast<float>(rightOutput);
        }
        else if (numChannels == 1)
        {
            outputs[0][i] += static_cast<float>((leftOutput + rightOutput) * 0.5);
        }
    }
}

//==============================================================================
// NexSynthDSP Stereo Processing
//==============================================================================

void NexSynthDSP::processStereo(float** outputs, int numChannels, int numSamples)
{
    using namespace StereoProcessor;

    // Get stereo parameters
    float width = static_cast<float>(params_.stereoWidth);
    bool oddEvenSeparation = params_.stereoOddEvenSeparation;
    double operatorDetune = params_.stereoOperatorDetune;

    // Process all voices
    std::vector<float> leftBuffer(numSamples, 0.0f);
    std::vector<float> rightBuffer(numSamples, 0.0f);

    float* leftPtr = leftBuffer.data();
    float* rightPtr = rightBuffer.data();
    float* voiceOutputs[2] = {leftPtr, rightPtr};

    for (auto& voice : voices_)
    {
        if (voice && voice->isActive())
        {
            voice->processStereo(voiceOutputs, 2, numSamples, sampleRate_,
                                oddEvenSeparation, operatorDetune);
        }
    }

    // Apply stereo width per sample
    for (int i = 0; i < numSamples; ++i)
    {
        float left = leftBuffer[i];
        float right = rightBuffer[i];

        // Apply width
        StereoWidth::processWidth(left, right, width);

        // Apply master volume
        left *= static_cast<float>(params_.masterVolume);
        right *= static_cast<float>(params_.masterVolume);

        // Output
        if (numChannels >= 2)
        {
            outputs[0][i] = left;
            outputs[1][i] = right;
        }
        else if (numChannels == 1)
        {
            outputs[0][i] = (left + right) * 0.5f;
        }
    }
}

//==============================================================================
// Implementation Examples: Advanced FM Stereo Techniques
//==============================================================================

/*
 * Technique 1: Algorithm-based stereo separation
 * Different FM algorithms can have different stereo imaging:
 */

void NexSynthDSP::processAlgorithmStereo(float** outputs, int numChannels, int numSamples)
{
    using namespace StereoProcessor;

    float width = static_cast<float>(params_.stereoWidth);
    int algorithm = params_.algorithm;

    // Different stereo strategies based on algorithm
    bool useOddEven = (algorithm % 2 == 0);  // Even algorithms use odd/even
    float channelDetune = useOddEven ? static_cast<float>(params_.stereoOperatorDetune) : 0.02f;

    // Process voices with algorithm-specific stereo
    for (int i = 0; i < numSamples; ++i)
    {
        float left = 0.0f;
        float right = 0.0f;

        for (auto& voice : voices_)
        {
            if (voice && voice->isActive())
            {
                // Process with algorithm-specific stereo
                // (implementation similar to processStereo above)
                left += voice->operators_[0].previousOutput;
                right += voice->operators_[1].previousOutput;
            }
        }

        // Apply width
        StereoWidth::processWidth(left, right, width);

        outputs[0][i] = left * static_cast<float>(params_.masterVolume);
        outputs[1][i] = right * static_cast<float>(params_.masterVolume);
    }
}

/*
 * Technique 2: Operator panning
 * Pan individual operators to different stereo positions:
 */

void NexSynthDSP::processOperatorPanning(float** outputs, int numChannels, int numSamples)
{
    // Pan positions for each operator (0=left, 0.5=center, 1=right)
    float operatorPans[5] = {0.2f, 0.8f, 0.3f, 0.7f, 0.5f};

    for (int i = 0; i < numSamples; ++i)
    {
        float left = 0.0f;
        float right = 0.0f;

        for (auto& voice : voices_)
        {
            if (voice && voice->isActive())
            {
                for (size_t op = 0; op < 5; ++op)
                {
                    float opOutput = static_cast<float>(
                        voice->operators_[op].previousOutput *
                        voice->operators_[op].outputLevel *
                        voice->operators_[op].envelope.currentLevel
                    );

                    // Calculate pan gains
                    float pan = operatorPans[op];
                    float leftGain = std::cos(pan * 0.5f * M_PI);
                    float rightGain = std::cos((1.0f - pan) * 0.5f * M_PI);

                    left += opOutput * leftGain;
                    right += opOutput * rightGain;
                }
            }
        }

        // Apply master volume
        left *= static_cast<float>(params_.masterVolume);
        right *= static_cast<float>(params_.masterVolume);

        outputs[0][i] = left;
        outputs[1][i] = right;
    }
}

/*
 * Technique 3: Stereo feedback paths
 * Different feedback amounts for left/right channels:
 */

void NexSynthDSP::processStereoFeedback(float** outputs, int numChannels, int numSamples)
{
    double leftFeedbackMult = 1.0;
    double rightFeedbackMult = 1.0 + (params_.stereoOperatorDetune * 0.5);

    // Process with asymmetric feedback
    // (implementation would modify operator processing to use channel-specific feedback)

    for (int i = 0; i < numSamples; ++i)
    {
        // Standard processing with channel-specific feedback
        // ...
    }
}

} // namespace DSP
