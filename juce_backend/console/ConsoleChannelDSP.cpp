/*
 * ConsoleChannelDSP.cpp
 *
 * Implementation of console channel strip DSP
 *
 * Based on Airwindows Console X DSP (Tier 0: Core Console Foundation)
 * See: console/CONSOLE_X_DSP_HANDOFF.md
 */

#include "ConsoleChannelDSP.h"
#include "audio/ChannelCPUMonitor.h"
#include <cstring>
#include <algorithm>

namespace Console {

//==============================================================================
// Constructor
ConsoleChannelDSP::ConsoleChannelDSP()
    : sampleRate_(48000.0)
    , maxBlockSize_(512)
    , consoleMode_(1)  // Classic mode by default
    , inputTrim_(1.0f)
    , outputTrim_(1.0f)
    , pan_(0.0f)
    , eqLowGain_(1.0f)
    , eqMidGain_(1.0f)
    , eqHighGain_(1.0f)
    , eqLowFreq_(100.0f)
    , eqMidFreq_(1000.0f)
    , eqHighFreq_(5000.0f)
    , compThreshold_(1.0f)
    , compRatio_(1.0f)
    , compAttack_(0.005f)
    , compRelease_(0.1f)
    , limiterThreshold_(1.0f)
    , densityAmount_(0.0f)
    , driveAmount_(0.0f)
    , mute_(false)
    , solo_(false)
    , compEnvelope_(1.0f)
    , limiterEnvelope_(1.0f)
    , outputLevelL_(0.0f)
    , outputLevelR_(0.0f)
    , gainReduction_(0.0f)
    , paramSmoothing_(0.999f)
    , meterDecay_(0.999f)
    , silenceThreshold_(-80.0f)  // Conservative threshold
    , compGainSmoother_(1.0f)
    , compControlCounter_(0)
{
    // Initialize channel state
    channelState_.forceActive = solo_;  // Solo forces channel active
}

//==============================================================================
void ConsoleChannelDSP::setChannelId(int channelId) {
    channelId_ = channelId;
}

//==============================================================================
// Destructor
ConsoleChannelDSP::~ConsoleChannelDSP() {
    // Clean up pre-allocated buffers
    delete[] tempBufferLeft_;
    delete[] tempBufferRight_;
    tempBufferLeft_ = nullptr;
    tempBufferRight_ = nullptr;
}

//==============================================================================
bool ConsoleChannelDSP::prepare(double sampleRate, int blockSize) {
    if (sampleRate <= 0.0 || blockSize <= 0) {
        return false;
    }

    sampleRate_ = sampleRate;
    maxBlockSize_ = blockSize;

    // Allocate or reallocate temp buffers if needed (no heap alloc in process!)
    if (tempBufferSize_ < blockSize) {
        delete[] tempBufferLeft_;
        delete[] tempBufferRight_;
        tempBufferLeft_ = new float[blockSize];
        tempBufferRight_ = new float[blockSize];
        tempBufferSize_ = blockSize;
    }

    // Calculate smoothing coefficients based on sample rate
    // 50Hz smoothing for parameters (~20ms time constant)
    paramSmoothing_ = std::exp(-2.0f * 3.14159f * 50.0f / static_cast<float>(sampleRate_));

    // Meter decay: 30dB/sec
    meterDecay_ = std::exp(-2.0f * 3.14159f * 5.0f / static_cast<float>(sampleRate_));

    reset();
    return true;
}

//==============================================================================
void ConsoleChannelDSP::reset() {
    // Reset all state to defaults
    compEnvelope_ = 1.0f;
    limiterEnvelope_ = 1.0f;
    outputLevelL_ = 0.0f;
    outputLevelR_ = 0.0f;
    gainReduction_ = 0.0f;

    // Reset silence detection
    inputMeter_.reset();
    channelState_.isIdle = true;

    // Reset compressor state
    compGainSmoother_ = 1.0f;
    compControlCounter_ = 0;
}

//==============================================================================
void ConsoleChannelDSP::process(float** inputs, float** outputs,
                                 int numChannels, int numSamples) {
    if (numSamples <= 0 || numChannels < 2) {
        return;
    }

    //==========================================================================
    // TASK 5: CPU Monitoring (begin)
    //==========================================================================
#ifndef JUCE_RELEASE
    if (cpuMonitor_) {
        cpuMonitor_->beginChannelProcessing(channelId_);
    }
#endif

    //==========================================================================
    // TASK 1: Channel-Level Silence Short-Circuit
    // Check if channel is idle before any processing
    //==========================================================================

    // Update channel state (control-rate, once per block)
    updateChannelState();

    // Measure input energy (cheap RMS detection)
    float inputEnergy = measureInputEnergy(inputs, numChannels, numSamples);

    // Check all idle conditions
    bool channelIdle =
        (inputEnergy < silenceThreshold_) &&  // Below silence threshold
        !channelState_.automationActive &&     // No automation
        !channelState_.modulationActive &&     // No modulation
        !channelState_.forceActive;            // Not solo/preview

    // Early exit if channel is idle (entire channel bypass)
    if (channelIdle) {
        // Clear outputs
        std::memset(outputs[0], 0, numSamples * sizeof(float));
        std::memset(outputs[1], 0, numSamples * sizeof(float));

        // Reset meters to indicate silence
        outputLevelL_ = silenceThreshold_;
        outputLevelR_ = silenceThreshold_;

        //==========================================================================
        // TASK 5: CPU Monitoring (idle case - still process samples)
        //==========================================================================
#ifndef JUCE_RELEASE
        if (cpuMonitor_) {
            // Track idle bypass for debugging
            cpuMonitor_->incrementIdleBypass(channelId_);

            // Report processing even though idle (still takes some CPU)
            cpuMonitor_->endChannelProcessing(channelId_, numSamples);
        }
#endif

        return;  // <--- MASSIVE CPU WIN: Skip all processing
    }

    //==========================================================================
    // Normal Channel Processing (active channel)
    //==========================================================================

    // Get channel pointers
    float* leftIn = inputs[0];
    float* rightIn = inputs[1];
    float* leftOut = outputs[0];
    float* rightOut = outputs[1];

    // Process in-place if input == output
    bool isInPlace = (leftIn == leftOut) && (rightIn == rightOut);

    // Use pre-allocated buffers (no heap alloc in audio thread!)
    float* processLeft = isInPlace ? leftOut : tempBufferLeft_;
    float* processRight = isInPlace ? rightOut : tempBufferRight_;

    // Copy input if not in-place
    if (!isInPlace) {
        std::memcpy(processLeft, leftIn, numSamples * sizeof(float));
        std::memcpy(processRight, rightIn, numSamples * sizeof(float));
    }

    // Mute handling
    if (mute_) {
        std::memset(processLeft, 0, numSamples * sizeof(float));
        std::memset(processRight, 0, numSamples * sizeof(float));
    }

    // Signal flow:
    // 1. Input trim
    // 2. Density (optional saturation)
    // 3. Drive (optional saturation)
    // 4. Console DSP (mode-dependent)
    // 5. EQ
    // 6. Compressor
    // 7. Limiter
    // 8. Pan
    // 9. Output trim
    // 10. Metering

    for (int i = 0; i < numSamples; ++i) {
        // Input trim
        float sampleL = processLeft[i] * inputTrim_;
        float sampleR = processRight[i] * inputTrim_;

        // Density (Tier 1 optional saturation)
        if (densityAmount_ > 0.0f) {
            applyDensity(sampleL);
            applyDensity(sampleR);
        }

        // Drive (Tier 1 optional saturation)
        if (driveAmount_ > 0.0f) {
            applyDrive(sampleL);
            applyDrive(sampleR);
        }

        // Console DSP (Tier 0 - always on)
        applyConsoleSaturation(sampleL);
        applyConsoleSaturation(sampleR);

        processLeft[i] = sampleL;
        processRight[i] = sampleR;
    }

    // EQ (per-sample not implemented here, would need filter state)
    processEQ(processLeft, processRight, numSamples);

    // Compressor
    processCompressor(processLeft, processRight, numSamples);

    // Limiter
    processLimiter(processLeft, processRight, numSamples);

    // Pan
    processPan(processLeft, processRight, numSamples);

    // Output trim
    for (int i = 0; i < numSamples; ++i) {
        processLeft[i] *= outputTrim_;
        processRight[i] *= outputTrim_;
    }

    // Update meters
    updateMeters(processLeft, processRight, numSamples);

    // Copy to output if not in-place
    if (!isInPlace) {
        std::memcpy(leftOut, processLeft, numSamples * sizeof(float));
        std::memcpy(rightOut, processRight, numSamples * sizeof(float));
    }

    //==========================================================================
    // TASK 5: CPU Monitoring (end)
    //==========================================================================
#ifndef JUCE_RELEASE
    if (cpuMonitor_) {
        cpuMonitor_->endChannelProcessing(channelId_, numSamples);
    }
#endif
}

//==============================================================================
void ConsoleChannelDSP::setConsoleMode(int mode) {
    if (mode >= 0 && mode <= 2) {
        consoleMode_ = mode;
    }
}

//==============================================================================
float ConsoleChannelDSP::getParameter(const char* paramId) const {
    if (std::strcmp(paramId, "inputTrim") == 0) {
        return linearToDb(inputTrim_);
    } else if (std::strcmp(paramId, "outputTrim") == 0) {
        return linearToDb(outputTrim_);
    } else if (std::strcmp(paramId, "pan") == 0) {
        return pan_;
    } else if (std::strcmp(paramId, "eqLow") == 0) {
        return linearToDb(eqLowGain_);
    } else if (std::strcmp(paramId, "eqMid") == 0) {
        return linearToDb(eqMidGain_);
    } else if (std::strcmp(paramId, "eqHigh") == 0) {
        return linearToDb(eqHighGain_);
    } else if (std::strcmp(paramId, "eqLowFreq") == 0) {
        return eqLowFreq_;
    } else if (std::strcmp(paramId, "eqMidFreq") == 0) {
        return eqMidFreq_;
    } else if (std::strcmp(paramId, "eqHighFreq") == 0) {
        return eqHighFreq_;
    } else if (std::strcmp(paramId, "compThreshold") == 0) {
        return linearToDb(compThreshold_);
    } else if (std::strcmp(paramId, "compRatio") == 0) {
        return compRatio_;
    } else if (std::strcmp(paramId, "compAttack") == 0) {
        return compAttack_ * 1000.0f;  // Convert to ms
    } else if (std::strcmp(paramId, "compRelease") == 0) {
        return compRelease_ * 1000.0f;  // Convert to ms
    } else if (std::strcmp(paramId, "limiterThreshold") == 0) {
        return linearToDb(limiterThreshold_);
    } else if (std::strcmp(paramId, "densityAmount") == 0) {
        return densityAmount_;
    } else if (std::strcmp(paramId, "driveAmount") == 0) {
        return driveAmount_;
    } else if (std::strcmp(paramId, "mute") == 0) {
        return mute_ ? 1.0f : 0.0f;
    } else if (std::strcmp(paramId, "solo") == 0) {
        return solo_ ? 1.0f : 0.0f;
    }
    return 0.0f;
}

//==============================================================================
void ConsoleChannelDSP::setParameter(const char* paramId, float value) {
    if (std::strcmp(paramId, "inputTrim") == 0) {
        inputTrim_ = dbToLinear(value);
    } else if (std::strcmp(paramId, "outputTrim") == 0) {
        outputTrim_ = dbToLinear(value);
    } else if (std::strcmp(paramId, "pan") == 0) {
        pan_ = std::clamp(value, -1.0f, 1.0f);
    } else if (std::strcmp(paramId, "eqLow") == 0) {
        eqLowGain_ = dbToLinear(value);
    } else if (std::strcmp(paramId, "eqMid") == 0) {
        eqMidGain_ = dbToLinear(value);
    } else if (std::strcmp(paramId, "eqHigh") == 0) {
        eqHighGain_ = dbToLinear(value);
    } else if (std::strcmp(paramId, "eqLowFreq") == 0) {
        eqLowFreq_ = std::clamp(value, 20.0f, 500.0f);
    } else if (std::strcmp(paramId, "eqMidFreq") == 0) {
        eqMidFreq_ = std::clamp(value, 200.0f, 5000.0f);
    } else if (std::strcmp(paramId, "eqHighFreq") == 0) {
        eqHighFreq_ = std::clamp(value, 2000.0f, 20000.0f);
    } else if (std::strcmp(paramId, "compThreshold") == 0) {
        compThreshold_ = dbToLinear(value);
    } else if (std::strcmp(paramId, "compRatio") == 0) {
        compRatio_ = std::clamp(value, 1.0f, 20.0f);
    } else if (std::strcmp(paramId, "compAttack") == 0) {
        compAttack_ = std::clamp(value, 0.1f, 100.0f) / 1000.0f;  // Convert to seconds
    } else if (std::strcmp(paramId, "compRelease") == 0) {
        compRelease_ = std::clamp(value, 10.0f, 1000.0f) / 1000.0f;  // Convert to seconds
    } else if (std::strcmp(paramId, "limiterThreshold") == 0) {
        limiterThreshold_ = dbToLinear(value);
    } else if (std::strcmp(paramId, "densityAmount") == 0) {
        densityAmount_ = std::clamp(value, 0.0f, 1.0f);
    } else if (std::strcmp(paramId, "driveAmount") == 0) {
        driveAmount_ = std::clamp(value, 0.0f, 1.0f);
    } else if (std::strcmp(paramId, "mute") == 0) {
        mute_ = (value >= 0.5f);
    } else if (std::strcmp(paramId, "solo") == 0) {
        solo_ = (value >= 0.5f);
        channelState_.forceActive = solo_;  // Solo forces channel active
    }
}

//==============================================================================
bool ConsoleChannelDSP::savePreset(char* jsonBuffer, int jsonBufferSize) const {
    // Basic JSON serialization
    const char* format =
        "{\n"
        "  \"inputTrim\": %.2f,\n"
        "  \"outputTrim\": %.2f,\n"
        "  \"pan\": %.3f,\n"
        "  \"eqLow\": %.2f,\n"
        "  \"eqMid\": %.2f,\n"
        "  \"eqHigh\": %.2f,\n"
        "  \"compThreshold\": %.2f,\n"
        "  \"compRatio\": %.2f,\n"
        "  \"densityAmount\": %.3f,\n"
        "  \"driveAmount\": %.3f,\n"
        "  \"consoleMode\": %d\n"
        "}";

    int required = std::snprintf(nullptr, 0, format,
        linearToDb(inputTrim_),
        linearToDb(outputTrim_),
        pan_,
        linearToDb(eqLowGain_),
        linearToDb(eqMidGain_),
        linearToDb(eqHighGain_),
        linearToDb(compThreshold_),
        compRatio_,
        densityAmount_,
        driveAmount_,
        consoleMode_
    );

    if (required >= jsonBufferSize) {
        return false;  // Buffer too small
    }

    std::snprintf(jsonBuffer, jsonBufferSize, format,
        linearToDb(inputTrim_),
        linearToDb(outputTrim_),
        pan_,
        linearToDb(eqLowGain_),
        linearToDb(eqMidGain_),
        linearToDb(eqHighGain_),
        linearToDb(compThreshold_),
        compRatio_,
        densityAmount_,
        driveAmount_,
        consoleMode_
    );

    return true;
}

//==============================================================================
bool ConsoleChannelDSP::loadPreset(const char* jsonData) {
    // For now, just return true (full JSON parsing would be implemented later)
    // In production, use a proper JSON parser
    return true;
}

//==============================================================================
float ConsoleChannelDSP::getOutputLevel(int channel) const {
    return (channel == 0) ? outputLevelL_ : outputLevelR_;
}

//==============================================================================
float ConsoleChannelDSP::getGainReduction() const {
    return gainReduction_;
}

//==============================================================================
// Private helper methods

float ConsoleChannelDSP::dbToLinear(float db) const {
    return std::pow(10.0f, db / 20.0f);
}

float ConsoleChannelDSP::linearToDb(float linear) const {
    if (linear <= 0.0f) return -100.0f;
    return 20.0f * std::log10(linear);
}

void ConsoleChannelDSP::applyConsoleSaturation(float& sample) {
    // Airwindows Console X DSP (simplified)
    // Full implementation would extract from Airwindows source

    switch (consoleMode_) {
        case 0:  // Pure mode (clean)
            // No coloration, just subtle head bump
            sample = sample * (1.0f + 0.0001f * sample * sample);
            break;

        case 1:  // Classic mode (Console6-style)
            // Soft saturation curve
            if (sample > 0.0f) {
                sample = sample / (1.0f + sample * 0.5f);
            } else {
                sample = sample / (1.0f - sample * 0.5f);
            }
            break;

        case 2:  // Color mode (enhanced harmonics)
            // More aggressive saturation
            if (sample > 0.0f) {
                sample = std::tanh(sample * 1.5f) / 1.5f;
            } else {
                sample = std::tanh(sample * 1.5f) / 1.5f;
            }
            break;
    }
}

void ConsoleChannelDSP::applyDensity(float& sample) {
    // Airwindows Density (Tier 1 optional)
    // Program-dependent saturation adds weight without fuzz
    float drive = densityAmount_ * 0.5f;
    if (std::abs(sample) > 0.0f) {
        sample = sample + drive * std::sin(sample * 3.14159f);
        sample = sample / (1.0f + drive * std::abs(sample));
    }
}

void ConsoleChannelDSP::applyDrive(float& sample) {
    // Airwindows Drive (Tier 1 optional)
    // Harmonic edge, controlled aggression
    float amount = driveAmount_ * 0.3f;
    if (sample > 0.0f) {
        sample = sample * (1.0f + amount) / (1.0f + amount * sample);
    } else {
        sample = sample * (1.0f + amount) / (1.0f - amount * sample);
    }
}

void ConsoleChannelDSP::processEQ(float* left, float* right, int numSamples) {
    // Simplified EQ (bypass for now - full implementation would need filter state)
    // In production, implement biquad filters for low/mid/high bands
    // For now, just apply gain
    for (int i = 0; i < numSamples; ++i) {
        left[i] *= eqLowGain_ * eqMidGain_ * eqHighGain_;
        right[i] *= eqLowGain_ * eqMidGain_ * eqHighGain_;
    }
}

void ConsoleChannelDSP::processCompressor(float* left, float* right, int numSamples) {
    //==========================================================================
    // TASK 3: Control-Rate Compressor Optimization
    // Update gain reduction at control rate, not per sample
    //==========================================================================

    float slope = 1.0f / compRatio_;
    float targetGain = 1.0f;

    for (int i = 0; i < numSamples; ++i) {
        //======================================================================
        // Control-rate envelope detection (every 32 samples)
        //======================================================================
        if (++compControlCounter_ >= compControlInterval) {
            // Measure input level (peak detection)
            float inputL = std::abs(left[i]);
            float inputR = std::abs(right[i]);
            float inputLevel = std::max(inputL, inputR);

            // Calculate target gain reduction
            if (inputLevel > compThreshold_) {
                float excess = inputLevel - compThreshold_;
                float reduction = std::pow(excess / compThreshold_, slope);
                targetGain = 1.0f / reduction;
                gainReduction_ = linearToDb(targetGain);
            } else {
                targetGain = 1.0f;
                gainReduction_ = 0.0f;
            }

            // Reset control counter
            compControlCounter_ = 0;
        }

        //======================================================================
        // Smooth gain application (per-sample, but no expensive calculations)
        //======================================================================
        // Smooth towards target gain (simple linear interpolation)
        float alpha = 0.1f;  // Smoothing coefficient
        compGainSmoother_ = compGainSmoother_ * (1.0f - alpha) + targetGain * alpha;

        // Apply smoothed gain
        left[i] *= compGainSmoother_;
        right[i] *= compGainSmoother_;
    }

    //==========================================================================
    // PERFORMANCE COMPARISON:
    //
    // Before (per-sample):
    //   - 512 samples × envelope detection (max, abs) = 512 operations
    //   - 512 samples × pow() calls = 512 expensive operations
    //   - Total: ~1000+ operations per block
    //
    // After (control-rate):
    //   - 16 control updates × envelope detection = 16 operations
    //   - 16 control updates × pow() calls = 16 expensive operations
    //   - 512 samples × simple multiply = 512 operations
    //   - Total: ~544 operations per block
    //
    // Speedup: ~2x faster in compressor
    // Quality: Smoothed gain = no zipper noise
    //==========================================================================
}

void ConsoleChannelDSP::processLimiter(float* left, float* right, int numSamples) {
    // Brickwall limiter
    for (int i = 0; i < numSamples; ++i) {
        left[i] = std::clamp(left[i], -limiterThreshold_, limiterThreshold_);
        right[i] = std::clamp(right[i], -limiterThreshold_, limiterThreshold_);
    }
}

void ConsoleChannelDSP::processPan(float* left, float* right, int numSamples) {
    // Constant-power panning
    float angle = (pan_ + 1.0f) * 0.25f * 3.14159f;  // -1..1 maps to 0..pi/2
    float gainL = std::cos(angle);
    float gainR = std::sin(angle);

    for (int i = 0; i < numSamples; ++i) {
        float mid = (left[i] + right[i]) * 0.5f;
        float side = (left[i] - right[i]) * 0.5f;

        left[i] = mid * gainL + side * gainL;
        right[i] = mid * gainR - side * gainR;
    }
}

void ConsoleChannelDSP::updateMeters(float* left, float* right, int numSamples) {
    float peakL = 0.0f;
    float peakR = 0.0f;

    for (int i = 0; i < numSamples; ++i) {
        peakL = std::max(peakL, std::abs(left[i]));
        peakR = std::max(peakR, std::abs(right[i]));
    }

    // Convert to dBFS
    peakL = linearToDb(peakL);
    peakR = linearToDb(peakR);

    // Decay
    outputLevelL_ = outputLevelL_ * meterDecay_ + peakL * (1.0f - meterDecay_);
    outputLevelR_ = outputLevelR_ * meterDecay_ + peakR * (1.0f - meterDecay_);
}

//==============================================================================
// Task 1: Silence / Idle Detection Implementation

void ConsoleChannelDSP::EnergyMeter::processSample(float sample) {
    float absSample = std::abs(sample);

    // Update peak
    peakLevel = std::max(peakLevel, absSample);

    // Update RMS envelope (control-rate, not per-sample accurate)
    float alpha = 0.99f;  // Slow envelope for energy measurement
    envelope = envelope * alpha + absSample * (1.0f - alpha);

    // RMS calculation (simplified, assumes stationary signal)
    rmsLevel = envelope * 0.707f;  // RMS ≈ peak * 0.707 for sine
}

void ConsoleChannelDSP::EnergyMeter::reset() {
    rmsLevel = 0.0f;
    peakLevel = 0.0f;
    envelope = 0.0f;
}

float ConsoleChannelDSP::EnergyMeter::getLeveldB() const {
    if (rmsLevel <= 0.0f) return -100.0f;
    return 20.0f * std::log10(rmsLevel);
}

void ConsoleChannelDSP::updateChannelState() {
    // For now, automation and modulation are not implemented
    // These would be set by external automation systems
    //
    // Future: Connect to Schillinger intention processor
    // Future: Connect to automation lane state
    channelState_.automationActive = false;
    channelState_.modulationActive = false;

    // Force active is set by solo, preview, etc.
    // Already updated in setParameter()
}

float ConsoleChannelDSP::measureInputEnergy(float** inputs, int numChannels, int numSamples) {
    if (numSamples == 0) return -100.0f;

    // Reset meter
    inputMeter_.reset();

    // Measure energy across all channels (stereo for now)
    float* left = inputs[0];
    float* right = inputs[1];

    // Sample the buffer (don't need every sample for energy measurement)
    int stride = std::max(1, numSamples / 32);  // Control-rate sampling

    for (int i = 0; i < numSamples; i += stride) {
        float sampleL = left[i];
        float sampleR = right[i];

        // Process both channels
        inputMeter_.processSample(sampleL);
        inputMeter_.processSample(sampleR);
    }

    return inputMeter_.getLeveldB();
}

bool ConsoleChannelDSP::isChannelIdle(float** inputs, int numChannels, int numSamples) {
    // This method is kept for API compatibility but the actual logic
    // is inline in process() for performance
    return channelState_.isIdle;
}

} // namespace Console

