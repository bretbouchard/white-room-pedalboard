/*
  ==============================================================================

    FilterGatePureDSP.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Pure DSP implementation of Filter Gate

  ==============================================================================
*/

#include "dsp/FilterGatePureDSP.h"
#include <cstring>
#include <cstdlib>
#include <cmath>

namespace DSP {

//==============================================================================
// Biquad Filter Implementation
//==============================================================================

void BiquadFilter::prepare(double sampleRate)
{
    reset();
}

void BiquadFilter::reset()
{
    x1_left = 0.0f; x2_left = 0.0f; y1_left = 0.0f; y2_left = 0.0f;
    x1_right = 0.0f; x2_right = 0.0f; y1_right = 0.0f; y2_right = 0.0f;
    b0 = 1.0f; b1 = 0.0f; b2 = 0.0f;
    a1 = 0.0f; a2 = 0.0f;
}

void BiquadFilter::setCoefficients(float b0, float b1, float b2, float a1, float a2)
{
    this->b0 = b0;
    this->b1 = b1;
    this->b2 = b2;
    this->a1 = a1;
    this->a2 = a2;
}

void BiquadFilter::setLowPass(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    float b0 = (1.0f - cosOmega) / 2.0f;
    float b1 = 1.0f - cosOmega;
    float b2 = (1.0f - cosOmega) / 2.0f;
    float a0 = 1.0f + alpha;
    float a1 = -2.0f * cosOmega;
    float a2 = 1.0f - alpha;

    setCoefficients(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

void BiquadFilter::setHighPass(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    float b0 = (1.0f + cosOmega) / 2.0f;
    float b1 = -(1.0f + cosOmega);
    float b2 = (1.0f + cosOmega) / 2.0f;
    float a0 = 1.0f + alpha;
    float a1 = -2.0f * cosOmega;
    float a2 = 1.0f - alpha;

    setCoefficients(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

void BiquadFilter::setBandPass(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    float b0 = alpha;
    float b1 = 0.0f;
    float b2 = -alpha;
    float a0 = 1.0f + alpha;
    float a1 = -2.0f * cosOmega;
    float a2 = 1.0f - alpha;

    setCoefficients(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

void BiquadFilter::setNotch(float frequency, float resonance, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);

    float b0 = 1.0f;
    float b1 = -2.0f * cosOmega;
    float b2 = 1.0f;
    float a0 = 1.0f + alpha;
    float a1 = -2.0f * cosOmega;
    float a2 = 1.0f - alpha;

    setCoefficients(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

void BiquadFilter::setPeak(float frequency, float resonance, float gain, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);
    float A = std::sqrt(std::pow(10.0f, gain / 20.0f));

    float b0 = 1.0f + alpha * A;
    float b1 = -2.0f * cosOmega;
    float b2 = 1.0f - alpha * A;
    float a0 = 1.0f + alpha / A;
    float a1 = -2.0f * cosOmega;
    float a2 = 1.0f - alpha / A;

    setCoefficients(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

void BiquadFilter::setBell(float frequency, float resonance, float gain, double sampleRate)
{
    setPeak(frequency, resonance, gain, sampleRate);
}

void BiquadFilter::setHighShelf(float frequency, float resonance, float gain, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);
    float A = std::sqrt(std::pow(10.0f, gain / 20.0f));

    float b0 = A * ((A + 1.0f) + (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha);
    float b1 = -2.0f * A * ((A - 1.0f) + (A + 1.0f) * cosOmega);
    float b2 = A * ((A + 1.0f) + (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha);
    float a0 = (A + 1.0f) + (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha;
    float a1 = 2.0f * ((A - 1.0f) + (A + 1.0f) * cosOmega);
    float a2 = (A + 1.0f) + (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha;

    setCoefficients(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

void BiquadFilter::setLowShelf(float frequency, float resonance, float gain, double sampleRate)
{
    float omega = 2.0f * M_PI * frequency / static_cast<float>(sampleRate);
    float sinOmega = std::sin(omega);
    float cosOmega = std::cos(omega);
    float alpha = sinOmega / (2.0f * resonance);
    float A = std::sqrt(std::pow(10.0f, gain / 20.0f));

    float b0 = A * ((A + 1.0f) - (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha);
    float b1 = 2.0f * A * ((A - 1.0f) - (A + 1.0f) * cosOmega);
    float b2 = A * ((A + 1.0f) - (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha);
    float a0 = (A + 1.0f) + (A - 1.0f) * cosOmega + 2.0f * std::sqrt(A) * alpha;
    float a1 = -2.0f * ((A - 1.0f) + (A + 1.0f) * cosOmega);
    float a2 = (A + 1.0f) + (A - 1.0f) * cosOmega - 2.0f * std::sqrt(A) * alpha;

    setCoefficients(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

float BiquadFilter::processSampleLeft(float input)
{
    float output = b0 * input + b1 * x1_left + b2 * x2_left - a1 * y1_left - a2 * y2_left;
    x2_left = x1_left;
    x1_left = input;
    y2_left = y1_left;
    y1_left = output;
    return output;
}

float BiquadFilter::processSampleRight(float input)
{
    float output = b0 * input + b1 * x1_right + b2 * x2_right - a1 * y1_right - a2 * y2_right;
    x2_right = x1_right;
    x1_right = input;
    y2_right = y1_right;
    y1_right = output;
    return output;
}

void BiquadFilter::processStereo(float* left, float* right, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        left[i] = processSampleLeft(left[i]);
        right[i] = processSampleRight(right[i]);
    }
}

//==============================================================================
// ADSR Envelope Implementation
//==============================================================================

void ADSREnvelope::prepare(double sampleRate)
{
    sampleRate = sampleRate;
    reset();
}

void ADSREnvelope::reset()
{
    stage = Stage::Idle;
    amplitude = 0.0f;
}

void ADSREnvelope::trigger(float velocity)
{
    stage = Stage::Attack;
    amplitude = velocity * 0.01f;  // Start from near zero
}

void ADSREnvelope::release()
{
    stage = Stage::Release;
}

float ADSREnvelope::processSample()
{
    switch (stage)
    {
        case Stage::Attack:
            amplitude += attackRate;
            if (amplitude >= 1.0f)
            {
                amplitude = 1.0f;
                stage = Stage::Decay;
            }
            break;

        case Stage::Decay:
            amplitude -= decayRate;
            if (amplitude <= sustainLevel)
            {
                amplitude = sustainLevel;
                stage = Stage::Sustain;
            }
            break;

        case Stage::Sustain:
            amplitude = sustainLevel;
            break;

        case Stage::Release:
            amplitude -= releaseRate;
            if (amplitude <= 0.0001f)
            {
                amplitude = 0.0f;
                stage = Stage::Idle;
            }
            break;

        case Stage::Idle:
            amplitude = 0.0f;
            break;
    }

    return amplitude;
}

void ADSREnvelope::setAttack(float seconds)
{
    attackRate = 1.0f / static_cast<float>(sampleRate * seconds);
}

void ADSREnvelope::setDecay(float seconds)
{
    decayRate = (1.0f - sustainLevel) / static_cast<float>(sampleRate * seconds);
}

void ADSREnvelope::setSustain(float level)
{
    sustainLevel = level;
}

void ADSREnvelope::setRelease(float seconds)
{
    releaseRate = sustainLevel / static_cast<float>(sampleRate * seconds);
}

//==============================================================================
// LFO Implementation
//==============================================================================

void LFO::prepare(double sampleRate)
{
    sampleRate = sampleRate;
    reset();
}

void LFO::reset()
{
    phase = 0.0f;
    lastOutput = 0.0f;
}

void LFO::setFrequency(float hz)
{
    frequency = hz;
}

void LFO::setDepth(float depth)
{
    this->depth = depth;
}

void LFO::setWaveform(Waveform waveform)
{
    this->waveform = waveform;
}

void LFO::setBipolar(bool bipolar)
{
    this->bipolar = bipolar;
}

float LFO::processSample()
{
    // Advance phase
    phase += static_cast<float>(frequency / sampleRate);
    if (phase > 1.0f) phase -= 1.0f;

    // Generate waveform
    float output = 0.0f;
    switch (waveform)
    {
        case Waveform::Sine:
            output = std::sin(phase * 2.0f * M_PI);
            break;

        case Waveform::Triangle:
            output = (phase < 0.5f) ? (phase * 4.0f - 1.0f) : (3.0f - phase * 4.0f);
            break;

        case Waveform::Sawtooth:
            output = phase * 2.0f - 1.0f;
            break;

        case Waveform::Square:
            output = (phase < 0.5f) ? 1.0f : -1.0f;
            break;

        case Waveform::SampleAndHold:
            if (phase < 1.0f / sampleRate)  // New value each cycle
            {
                static unsigned seed = 99;
                seed = seed * 1103515245 + 12345;
                lastOutput = static_cast<float>((seed & 0x7fffffff)) / static_cast<float>(0x7fffffff) * 2.0f - 1.0f;
            }
            output = lastOutput;
            break;
    }

    // Apply depth and convert to unipolar if needed
    output *= depth;
    if (!bipolar)
    {
        output = (output + 1.0f) * 0.5f;  // Map -1..1 to 0..1
    }

    return output;
}

void LFO::processBlock(float* output, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        output[i] = processSample();
    }
}

//==============================================================================
// Sidechain Follower Implementation
//==============================================================================

void SidechainFollower::prepare(double sampleRate)
{
    sampleRate = sampleRate;
    reset();
}

void SidechainFollower::reset()
{
    envelope = 0.0f;
}

void SidechainFollower::processSample(float input)
{
    float absInput = std::abs(input) * sensitivity;

    if (absInput > envelope)
    {
        envelope += attackRate * (absInput - envelope);
    }
    else
    {
        envelope += releaseRate * (absInput - envelope);
    }

    if (envelope < 0.0001f) envelope = 0.0f;
}

void SidechainFollower::setAttack(float seconds)
{
    attackRate = 1.0f / static_cast<float>(sampleRate * seconds);
}

void SidechainFollower::setRelease(float seconds)
{
    releaseRate = 1.0f / static_cast<float>(sampleRate * seconds);
}

void SidechainFollower::setSensitivity(float sensitivity)
{
    this->sensitivity = sensitivity;
}

//==============================================================================
// Gate Implementation
//==============================================================================

void Gate::prepare(double sampleRate)
{
    sampleRate = sampleRate;
    reset();
}

void Gate::reset()
{
    current = 0.0f;
    target = 0.0f;
}

void Gate::processBlock(float* output, int numSamples, bool targetOpen)
{
    float targetValue = targetOpen ? 1.0f : 0.0f;
    float rate = targetOpen ? attackRate : releaseRate;

    for (int i = 0; i < numSamples; ++i)
    {
        current += rate * (targetValue - current);
        output[i] = current;
    }
}

void Gate::setAttack(float seconds)
{
    attackRate = 1.0f / static_cast<float>(sampleRate * seconds);
}

void Gate::setRelease(float seconds)
{
    releaseRate = 1.0f / static_cast<float>(sampleRate * seconds);
}

void Gate::setThreshold(float threshold)
{
    this->threshold = threshold;
}

void Gate::setHysteresis(float hysteresis)
{
    this->hysteresis = hysteresis;
}

//==============================================================================
// Parameter Smoother Implementation
//==============================================================================

void FilterGatePureDSP::Smoother::prepare(double sampleRate, float timeMs)
{
    float timeSeconds = timeMs / 1000.0f;
    rate = 1.0f / static_cast<float>(sampleRate * timeSeconds);
}

void FilterGatePureDSP::Smoother::reset()
{
    current = 0.0f;
    target = 0.0f;
}

float FilterGatePureDSP::Smoother::processSample()
{
    current += rate * (target - current);
    return current;
}

//==============================================================================
// Main Filter Gate Implementation
//==============================================================================

FilterGatePureDSP::FilterGatePureDSP()
{
}

FilterGatePureDSP::~FilterGatePureDSP()
{
}

bool FilterGatePureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // Prepare components
    filter_.prepare(sampleRate);
    adsr_.prepare(sampleRate);
    lfo_.prepare(sampleRate);
    sidechain_.prepare(sampleRate);
    gate_.prepare(sampleRate);

    // Prepare smoothers
    frequencySmoother_.prepare(sampleRate, 10.0f);  // 10ms smoothing
    gainSmoother_.prepare(sampleRate, 10.0f);

    // Set initial filter state
    updateFilter();

    return true;
}

void FilterGatePureDSP::reset()
{
    filter_.reset();
    adsr_.reset();
    lfo_.reset();
    sidechain_.reset();
    gate_.reset();
    frequencySmoother_.reset();
    gainSmoother_.reset();
}

void FilterGatePureDSP::process(float** inputs, float** outputs, int numChannels, int numSamples)
{
    if (numChannels < 2) return;  // Require stereo

    // Create modulation signal buffer
    float* modBuffer = new float[numSamples];
    float* gateBuffer = new float[numSamples];

    // Generate modulation
    for (int i = 0; i < numSamples; ++i)
    {
        modBuffer[i] = getModulationValue();
    }

    // Process gate
    bool gateShouldOpen = false;
    switch (params_.triggerMode)
    {
        case GateTriggerMode::ADSR:
            gateShouldOpen = adsr_.isActive();
            break;

        case GateTriggerMode::Sidechain:
            gateShouldOpen = sidechain_.getEnvelope() > params_.gateThreshold;
            break;

        case GateTriggerMode::LFO:
            gateShouldOpen = lfo_.processSample() > params_.gateThreshold;
            break;

        case GateTriggerMode::Manual:
            gateShouldOpen = params_.manualControl > params_.gateThreshold;
            break;

        case GateTriggerMode::Velocity:
            // Triggered by noteOn, check ADSR state
            gateShouldOpen = adsr_.isActive();
            break;
    }

    gate_.processBlock(gateBuffer, numSamples, gateShouldOpen);

    // Process with modulation and gating
    for (int i = 0; i < numSamples; ++i)
    {
        // Combine modulation with gate
        float mod = modBuffer[i] * gateBuffer[i];

        // Calculate modulated frequency (with range)
        float freqMod = params_.gateRange * mod;  // ±range in semitones
        float modFreq = params_.frequency * std::pow(2.0f, freqMod / 12.0f);

        frequencySmoother_.target = modFreq;
        float smoothedFreq = frequencySmoother_.processSample();

        gainSmoother_.target = params_.gain;
        float smoothedGain = gainSmoother_.processSample();

        // Update filter coefficients for this sample
        switch (params_.filterMode)
        {
            case FilterMode::LowPass:
                filter_.setLowPass(smoothedFreq, params_.resonance, sampleRate_);
                break;

            case FilterMode::HighPass:
                filter_.setHighPass(smoothedFreq, params_.resonance, sampleRate_);
                break;

            case FilterMode::BandPass:
                filter_.setBandPass(smoothedFreq, params_.resonance, sampleRate_);
                break;

            case FilterMode::Notch:
                filter_.setNotch(smoothedFreq, params_.resonance, sampleRate_);
                break;

            case FilterMode::Peak:
                filter_.setPeak(smoothedFreq, params_.resonance, smoothedGain, sampleRate_);
                break;

            case FilterMode::Bell:
                filter_.setBell(smoothedFreq, params_.resonance, smoothedGain, sampleRate_);
                break;

            case FilterMode::HighShelf:
                filter_.setHighShelf(smoothedFreq, params_.resonance, smoothedGain, sampleRate_);
                break;

            case FilterMode::LowShelf:
                filter_.setLowShelf(smoothedFreq, params_.resonance, smoothedGain, sampleRate_);
                break;
        }

        // Process one sample through filter
        outputs[0][i] = filter_.processSampleLeft(inputs[0][i]);
        outputs[1][i] = filter_.processSampleRight(inputs[1][i]);
    }

    delete[] modBuffer;
    delete[] gateBuffer;
}

void FilterGatePureDSP::setFilterMode(FilterMode mode)
{
    params_.filterMode = mode;
    updateFilter();
}

void FilterGatePureDSP::setFrequency(float frequency)
{
#ifdef DEBUG
    float oldValue = params_.frequency;
    LOG_PARAMETER_CHANGE("FilterGate", "frequency", oldValue, frequency);
#endif
    params_.frequency = frequency;
    frequencySmoother_.target = frequency;
}

void FilterGatePureDSP::setResonance(float resonance)
{
#ifdef DEBUG
    float oldValue = params_.resonance;
    LOG_PARAMETER_CHANGE("FilterGate", "resonance", oldValue, resonance);
#endif
    params_.resonance = resonance;
    updateFilter();
}

void FilterGatePureDSP::setGain(float gain)
{
#ifdef DEBUG
    float oldValue = params_.gain;
    LOG_PARAMETER_CHANGE("FilterGate", "gain", oldValue, gain);
#endif
    params_.gain = gain;
    gainSmoother_.target = gain;
}

void FilterGatePureDSP::setGateTriggerMode(GateTriggerMode mode)
{
    params_.triggerMode = mode;
}

void FilterGatePureDSP::setGateThreshold(float threshold)
{
#ifdef DEBUG
    float oldValue = params_.gateThreshold;
    LOG_PARAMETER_CHANGE("FilterGate", "gateThreshold", oldValue, threshold);
#endif
    params_.gateThreshold = threshold;
}

void FilterGatePureDSP::setGateAttack(float attackMs)
{
#ifdef DEBUG
    float oldValue = params_.gateAttack;
    LOG_PARAMETER_CHANGE("FilterGate", "gateAttack", oldValue, attackMs);
#endif
    params_.gateAttack = attackMs;
    gate_.setAttack(attackMs / 1000.0f);
}

void FilterGatePureDSP::setGateRelease(float releaseMs)
{
#ifdef DEBUG
    float oldValue = params_.gateRelease;
    LOG_PARAMETER_CHANGE("FilterGate", "gateRelease", oldValue, releaseMs);
#endif
    params_.gateRelease = releaseMs;
    gate_.setRelease(releaseMs / 1000.0f);
}

void FilterGatePureDSP::setGateRange(float rangeDb)
{
#ifdef DEBUG
    float oldValue = params_.gateRange;
    LOG_PARAMETER_CHANGE("FilterGate", "gateRange", oldValue, rangeDb);
#endif
    params_.gateRange = rangeDb;
}

void FilterGatePureDSP::processSidechain(const float* sidechain, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        sidechain_.processSample(sidechain[i]);
    }
}

void FilterGatePureDSP::noteOn(float velocity)
{
    adsr_.trigger(velocity);
}

void FilterGatePureDSP::noteOff()
{
    adsr_.release();
}

void FilterGatePureDSP::setLFOFrequency(float hz)
{
#ifdef DEBUG
    float oldValue = params_.lfoFrequency;
    LOG_PARAMETER_CHANGE("FilterGate", "lfoFrequency", oldValue, hz);
#endif
    params_.lfoFrequency = hz;
    lfo_.setFrequency(hz);
}

void FilterGatePureDSP::setLFODepth(float depth)
{
#ifdef DEBUG
    float oldValue = params_.lfoDepth;
    LOG_PARAMETER_CHANGE("FilterGate", "lfoDepth", oldValue, depth);
#endif
    params_.lfoDepth = depth;
    lfo_.setDepth(depth);
}

void FilterGatePureDSP::setLFOWaveform(LFO::Waveform waveform)
{
    params_.lfoWaveform = waveform;
    lfo_.setWaveform(waveform);
}

void FilterGatePureDSP::setManualControl(float value)
{
    params_.manualControl = value;
}

void FilterGatePureDSP::updateFilter()
{
    // Filter is updated per-sample in process() for smooth modulation
}

float FilterGatePureDSP::getModulationValue()
{
    switch (params_.triggerMode)
    {
        case GateTriggerMode::ADSR:
        case GateTriggerMode::Velocity:
            return adsr_.processSample();

        case GateTriggerMode::LFO:
            return lfo_.processSample();

        case GateTriggerMode::Manual:
            return params_.manualControl;

        case GateTriggerMode::Sidechain:
            return sidechain_.getEnvelope();

        default:
            return 0.0f;
    }
}

bool FilterGatePureDSP::savePreset(char* jsonBuffer, int jsonBufferSize) const
{
    int offset = 0;

    // Write opening brace
    std::snprintf(jsonBuffer + offset, jsonBufferSize - offset, "{");
    offset = 1;

    // Write parameters
    writeJsonParameter("filter_mode", static_cast<int>(params_.filterMode), jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("frequency", params_.frequency, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("resonance", params_.resonance, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("gain", params_.gain, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("trigger_mode", static_cast<int>(params_.triggerMode), jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("gate_threshold", params_.gateThreshold, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("gate_attack", params_.gateAttack, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("gate_release", params_.gateRelease, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("gate_range", params_.gateRange, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("lfo_frequency", params_.lfoFrequency, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("lfo_depth", params_.lfoDepth, jsonBuffer, offset, jsonBufferSize);

    // Remove trailing comma and add closing brace
    if (offset > 1 && jsonBuffer[offset - 1] == ',')
    {
        offset--;
    }
    std::snprintf(jsonBuffer + offset, jsonBufferSize - offset, "}");

    return true;
}

bool FilterGatePureDSP::loadPreset(const char* jsonData)
{
    double value;

    if (parseJsonParameter(jsonData, "filter_mode", value))
        params_.filterMode = static_cast<FilterMode>(static_cast<int>(value));
    if (parseJsonParameter(jsonData, "frequency", value))
        params_.frequency = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "resonance", value))
        params_.resonance = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "gain", value))
        params_.gain = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "trigger_mode", value))
        params_.triggerMode = static_cast<GateTriggerMode>(static_cast<int>(value));
    if (parseJsonParameter(jsonData, "gate_threshold", value))
        params_.gateThreshold = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "gate_attack", value))
        params_.gateAttack = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "gate_release", value))
        params_.gateRelease = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "gate_range", value))
        params_.gateRange = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "lfo_frequency", value))
        params_.lfoFrequency = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "lfo_depth", value))
        params_.lfoDepth = static_cast<float>(value);

    return true;
}

bool FilterGatePureDSP::writeJsonParameter(const char* name, double value,
                                            char* buffer, int& offset,
                                            int bufferSize) const
{
    int remaining = bufferSize - offset;
    if (remaining < 50) return false;

    int written = std::snprintf(buffer + offset, remaining,
                               "\"%s\":%.6f,",
                               name, value);

    if (written < 0 || written >= remaining) return false;

    offset += written;
    return true;
}

bool FilterGatePureDSP::parseJsonParameter(const char* json, const char* param,
                                            double& value) const
{
    const char* search = json;
    char pattern[100];
    std::snprintf(pattern, sizeof(pattern), "\"%s\":", param);

    const char* found = std::strstr(search, pattern);
    if (!found) return false;

    found += std::strlen(pattern);
    value = std::atof(found);

    return true;
}

} // namespace DSP
