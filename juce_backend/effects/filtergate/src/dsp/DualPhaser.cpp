#include "dsp/DualPhaser.h"
#include <cstring>

namespace FilterGate {

DualPhaser::DualPhaser() = default;

DualPhaser::~DualPhaser() = default;

void DualPhaser::prepare(double sampleRate, int samplesPerBlock)
{
    phaserA.prepare(sampleRate, samplesPerBlock);
    phaserB.prepare(sampleRate, samplesPerBlock);
}

void DualPhaser::reset()
{
    phaserA.reset();
    phaserB.reset();
    crossFeedbackState = 0.0f;
}

void DualPhaser::setParams(const DualPhaserParams& params)
{
    currentParams = params;

    // Apply LFO phase offset to phaser B
    PhaserParams paramsB = params.phaserB;

    // Note: To properly implement phase offset, we'd need to expose
    // LFO phase control in PhaserEngine. For now, we'll set the params
    // and the phase offset effect will be implemented in process()

    phaserA.setParams(params.phaserA);
    phaserB.setParams(paramsB);
}

void DualPhaser::process(float* input, float* output, int numSamples)
{
    jassert(input != nullptr);
    jassert(output != nullptr);
    jassert(numSamples >= 0);

    switch (currentParams.routing)
    {
        case SERIAL:
            processSerial(input, output, numSamples);
            break;

        case PARALLEL:
            processParallel(input, output, numSamples);
            break;

        case STEREO:
            // For mono input with STEREO routing, copy to both channels
            // and process in stereo mode
            processStereoMode(input, output, numSamples);
            break;

        default:
            // Default to serial
            processSerial(input, output, numSamples);
            break;
    }
}

void DualPhaser::processStereo(float* left, float* right, int numSamples)
{
    jassert(left != nullptr);
    jassert(right != nullptr);
    jassert(numSamples >= 0);

    switch (currentParams.routing)
    {
        case SERIAL:
        {
            // Serial: process left through A→B, right through A→B
            float tempLeft[1024];
            float tempRight[1024];

            // Process through phaser A
            std::memcpy(tempLeft, left, sizeof(float) * numSamples);
            std::memcpy(tempRight, right, sizeof(float) * numSamples);

            phaserA.processStereo(tempLeft, tempRight, numSamples);

            // Process through phaser B
            phaserB.processStereo(tempLeft, tempRight, numSamples);

            std::memcpy(left, tempLeft, sizeof(float) * numSamples);
            std::memcpy(right, tempRight, sizeof(float) * numSamples);
            break;
        }

        case PARALLEL:
        {
            // Parallel: process A and B independently, then sum
            float tempLeftA[1024];
            float tempRightA[1024];
            float tempLeftB[1024];
            float tempRightB[1024];

            std::memcpy(tempLeftA, left, sizeof(float) * numSamples);
            std::memcpy(tempRightA, right, sizeof(float) * numSamples);
            std::memcpy(tempLeftB, left, sizeof(float) * numSamples);
            std::memcpy(tempRightB, right, sizeof(float) * numSamples);

            phaserA.processStereo(tempLeftA, tempRightA, numSamples);
            phaserB.processStereo(tempLeftB, tempRightB, numSamples);

            // Sum outputs (at -6dB to maintain level)
            for (int i = 0; i < numSamples; ++i)
            {
                left[i] = (tempLeftA[i] + tempLeftB[i]) * 0.5f;
                right[i] = (tempRightA[i] + tempRightB[i]) * 0.5f;
            }
            break;
        }

        case STEREO:
        {
            // Stereo: left through A, right through B (true stereo)
            processStereoMode(left, right, numSamples);
            break;
        }

        default:
            break;
    }
}

void DualPhaser::processSerial(float* input, float* output, int numSamples)
{
    jassert(numSamples < 1024); // Safety check for stack buffer

    float temp[1024];
    std::memcpy(temp, input, sizeof(float) * numSamples);

    // Apply cross-feedback if enabled
    if (currentParams.crossFeedback > 0.0f)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            temp[i] += crossFeedbackState * currentParams.crossFeedback;
        }
    }

    // Process through phaser A
    phaserA.process(temp, temp, numSamples);

    // Update cross-feedback from output of A (will be used next block)
    crossFeedbackState = temp[numSamples - 1];
    if (std::abs(crossFeedbackState) < 1e-10f)
        crossFeedbackState = 0.0f;

    // Process through phaser B
    phaserB.process(temp, output, numSamples);
}

void DualPhaser::processParallel(float* input, float* output, int numSamples)
{
    jassert(numSamples < 1024); // Safety check for stack buffer

    float tempA[1024];
    float tempB[1024];

    std::memcpy(tempA, input, sizeof(float) * numSamples);
    std::memcpy(tempB, input, sizeof(float) * numSamples);

    // Process through both phasers independently
    phaserA.process(tempA, tempA, numSamples);
    phaserB.process(tempB, tempB, numSamples);

    // Sum outputs (at -6dB to maintain level)
    for (int i = 0; i < numSamples; ++i)
    {
        output[i] = (tempA[i] + tempB[i]) * 0.5f;
    }
}

void DualPhaser::processStereoMode(float* left, float* right, int numSamples)
{
    // Left channel through phaser A
    phaserA.process(left, left, numSamples);

    // Right channel through phaser B
    phaserB.process(right, right, numSamples);
}

float DualPhaser::processSample(float input)
{
    float temp = input;

    // Apply cross-feedback if enabled
    if (currentParams.crossFeedback > 0.0f) {
        temp += crossFeedbackState * currentParams.crossFeedback;
    }

    switch (currentParams.routing) {
        case SERIAL: {
            // Process through phaser A then B
            float outA = phaserA.processSample(temp);
            lastOutputA = outA;

            float outB = phaserB.processSample(outA);
            lastOutputB = outB;

            crossFeedbackState = outA;
            if (std::abs(crossFeedbackState) < 1e-10f) {
                crossFeedbackState = 0.0f;
            }

            return outB;
        }

        case PARALLEL: {
            // Process through both phasers independently
            float outA = phaserA.processSample(temp);
            float outB = phaserB.processSample(temp);

            lastOutputA = outA;
            lastOutputB = outB;

            // Sum outputs at -6dB
            return (outA + outB) * 0.5f;
        }

        case STEREO: {
            // For mono input in STEREO mode, just return phaser A output
            float outA = phaserA.processSample(temp);
            lastOutputA = outA;
            lastOutputB = 0.0f;
            return outA;
        }

        default:
            return temp;
    }
}

float DualPhaser::getCurrentOutputA() const {
    return lastOutputA;
}

float DualPhaser::getCurrentOutputB() const {
    return lastOutputB;
}

} // namespace FilterGate
