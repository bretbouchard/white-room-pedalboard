#include "dsp/GateDetector.h"
#include <algorithm>

namespace FilterGate {

GateDetector::GateDetector()
{
    updateThresholds();
}

GateDetector::~GateDetector()
{
}

void GateDetector::prepare(double sampleRate, int samplesPerBlock)
{
    this->sampleRate = sampleRate;
    // No allocations, just update rate-dependent calculations
}

void GateDetector::reset()
{
    gateState = 0.0f;
    isOpenState = false;
    justOpenedFlag = false;
    holdCounter = 0;
    wasOpen = false;
    updateThresholds();
}

void GateDetector::setParams(const GateParams& newParams)
{
    params = newParams;
    updateThresholds();
}

bool GateDetector::process(float inputSample)
{
    // Reset edge detection flag
    justOpenedFlag = false;

    // Get absolute value for envelope detection
    float envelope = std::abs(inputSample);

    // Check if we should open gate (with hysteresis)
    bool shouldOpen = envelope > openThreshold;

    // Check if we should close gate (with hysteresis)
    bool shouldClose = envelope < closeThreshold;

    // State machine with attack/hold/release
    if (!isOpenState && shouldOpen)
    {
        // Start opening immediately
        wasOpen = true;
        isOpenState = true;
        justOpenedFlag = true; // Set edge detection flag

        // Apply attack smoothing to gateState only
        if (params.attackMs < 1.0f)
        {
            // Instant attack
            gateState = 1.0f;
        }
        else
        {
            // Gradual attack
            float attackInc = calculateIncrement(params.attackMs);
            gateState += attackInc;
            gateState = juce::jmin(gateState, 1.0f);
        }
    }
    else if (isOpenState)
    {
        // Gate is currently open

        // Check if we need to close
        if (shouldClose)
        {
            // Start hold counter
            if (wasOpen)
            {
                wasOpen = false;
                holdCounter = static_cast<int>(params.holdMs * sampleRate / 1000.0);
            }

            // Count down hold period
            if (holdCounter > 0)
            {
                holdCounter--;
                // Stay open during hold
                gateState = 1.0f;
            }
            else
            {
                // Hold finished, start release
                float releaseInc = calculateIncrement(params.releaseMs);
                gateState -= releaseInc;
                gateState = std::max(gateState, 0.0f);

                // Fully closed?
                if (gateState <= 0.0f)
                {
                    isOpenState = false;
                    gateState = 0.0f;
                }
            }
        }
        else
        {
            // Still above threshold, stay open
            wasOpen = true;
            holdCounter = 0;

            // Continue attack if not fully open yet
            if (gateState < 1.0f && params.attackMs >= 1.0f)
            {
                float attackInc = calculateIncrement(params.attackMs);
                gateState += attackInc;
                gateState = juce::jmin(gateState, 1.0f);
            }
            else
            {
                gateState = 1.0f;
            }
        }
    }

    return isOpen();
}

void GateDetector::process(float* input, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        process(input[i]);
    }
}

float GateDetector::calculateIncrement(float timeMs)
{
    if (timeMs <= 0.0f)
        return 1.0f;  // Instant

    float timeSeconds = timeMs / 1000.0f;
    float samples = static_cast<float>(timeSeconds * sampleRate);

    if (samples > 0.0f)
        return 1.0f / samples;
    else
        return 1.0f;
}

void GateDetector::updateThresholds()
{
    openThreshold = juce::jmin(params.threshold + params.hysteresis, 1.0f);
    closeThreshold = std::max(params.threshold - params.hysteresis, 0.0f);
}

} // namespace FilterGate
