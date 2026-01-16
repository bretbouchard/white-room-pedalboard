#include "dsp/EnvelopeGenerator.h"

namespace FilterGate {

EnvelopeGenerator::EnvelopeGenerator()
{
}

EnvelopeGenerator::~EnvelopeGenerator()
{
}

void EnvelopeGenerator::prepare(double sampleRate, int samplesPerBlock)
{
    this->sampleRate = sampleRate;
}

void EnvelopeGenerator::reset()
{
    currentStage = EnvStage::IDLE;
    currentLevel = 0.0f;
    targetLevel = 0.0f;
    increment = 0.0f;
    velocityAmount = 1.0f;
}

void EnvelopeGenerator::setParams(const EnvelopeParams& newParams)
{
    params = newParams;
}

void EnvelopeGenerator::trigger(float velocity)
{
    velocityAmount = params.velocitySensitive ? velocity : 1.0f;
    currentStage = EnvStage::ATTACK;
    currentLevel = 0.0f;
    targetLevel = 1.0f * velocityAmount;

    // Calculate attack increment
    increment = calculateIncrement(params.attackMs, 0.0f, 1.0f * velocityAmount);

    // Instant attack?
    if (params.attackMs <= 0.0f)
    {
        currentLevel = targetLevel;
        currentStage = EnvStage::DECAY;
        increment = calculateIncrement(params.decayMs, currentLevel, params.sustain * velocityAmount);
        targetLevel = params.sustain * velocityAmount;
    }
    else
    {
        // Advance one step so trigger() has immediate effect
        currentLevel += increment;
        if (currentLevel >= targetLevel)
        {
            currentLevel = targetLevel;
            currentStage = EnvStage::DECAY;
            if (params.mode == EnvMode::ADSR)
            {
                targetLevel = params.sustain * velocityAmount;
                increment = calculateIncrement(params.decayMs, currentLevel, targetLevel);
            }
            else
            {
                targetLevel = 0.0f;
                increment = calculateIncrement(params.decayMs, currentLevel, 0.0f);
            }
        }
    }
}

void EnvelopeGenerator::release()
{
    // Only meaningful if in SUSTAIN or DECAY stage
    if (currentStage == EnvStage::IDLE || currentStage == EnvStage::RELEASE)
        return;

    currentStage = EnvStage::RELEASE;
    targetLevel = 0.0f;
    increment = calculateIncrement(params.releaseMs, currentLevel, 0.0f);

    // Instant release?
    if (params.releaseMs <= 0.0f)
    {
        currentLevel = 0.0f;
        currentStage = EnvStage::IDLE;
    }
}

float EnvelopeGenerator::process()
{
    advance();
    return currentLevel;
}

void EnvelopeGenerator::process(float* output, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        output[i] = process();
    }
}

bool EnvelopeGenerator::isIdle() const
{
    return currentStage == EnvStage::IDLE && currentLevel <= 0.001f;
}

juce::String EnvelopeGenerator::getStageName() const
{
    switch (currentStage)
    {
        case EnvStage::IDLE:    return "IDLE";
        case EnvStage::ATTACK:  return "ATTACK";
        case EnvStage::DECAY:   return "DECAY";
        case EnvStage::SUSTAIN: return "SUSTAIN";
        case EnvStage::RELEASE: return "RELEASE";
        default:                return "UNKNOWN";
    }
}

float EnvelopeGenerator::calculateIncrement(float timeMs, float startLevel, float endLevel)
{
    if (timeMs <= 0.0f)
        return 0.0f;  // Instant change

    float timeSeconds = timeMs / 1000.0f;
    float samples = static_cast<float>(timeSeconds * sampleRate);

    if (samples > 0.0f)
        return (endLevel - startLevel) / samples;
    else
        return 0.0f;
}

void EnvelopeGenerator::advance()
{
    switch (currentStage)
    {
        case EnvStage::IDLE:
            currentLevel = 0.0f;
            break;

        case EnvStage::ATTACK:
            currentLevel += increment;

            // Check if attack complete
            if (currentLevel >= targetLevel)
            {
                currentLevel = targetLevel;

                // Move to decay
                currentStage = EnvStage::DECAY;

                if (params.mode == EnvMode::ADSR)
                {
                    // Decay to sustain
                    targetLevel = params.sustain * velocityAmount;
                    increment = calculateIncrement(params.decayMs, currentLevel, targetLevel);
                }
                else
                {
                    // ADR mode: decay to 0
                    targetLevel = 0.0f;
                    increment = calculateIncrement(params.decayMs, currentLevel, 0.0f);
                }
            }
            break;

        case EnvStage::DECAY:
            currentLevel += increment;

            // Check if decay complete
            if (params.mode == EnvMode::ADSR)
            {
                // ADSR: decay to sustain
                if (increment < 0.0f && currentLevel <= targetLevel)
                {
                    currentLevel = targetLevel;
                    currentStage = EnvStage::SUSTAIN;
                    increment = 0.0f;  // Hold steady
                }
            }
            else
            {
                // ADR: decay to 0
                if (currentLevel <= 0.001f)
                {
                    currentLevel = 0.0f;

                    if (params.loop)
                    {
                        // Retrigger
                        trigger(velocityAmount);
                    }
                    else
                    {
                        currentStage = EnvStage::IDLE;
                    }
                }
            }
            break;

        case EnvStage::SUSTAIN:
            // Hold at sustain level
            currentLevel = targetLevel;
            break;

        case EnvStage::RELEASE:
            currentLevel += increment;

            // Check if release complete
            if (currentLevel <= 0.001f)
            {
                currentLevel = 0.0f;

                // Check for loop in ADR mode
                if (params.mode == EnvMode::ADR && params.loop)
                {
                    trigger(velocityAmount);
                }
                else
                {
                    currentStage = EnvStage::IDLE;
                }
            }
            break;
    }
}

} // namespace FilterGate
