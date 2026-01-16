#include "../../include/audio/DynamicsAnalyzer.h"
#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <cmath>
#include <algorithm>
#include <numeric>

DynamicsAnalyzer::DynamicsAnalyzer() {
    // GREEN PHASE: Initialize internal state
    resetInternalState();
}

bool DynamicsAnalyzer::initialize(double sampleRate, int bufferSize) {
    if (sampleRate <= 0.0 || bufferSize <= 0) {
        return false;
    }

    currentSampleRate = sampleRate;
    currentBufferSize = bufferSize;

    // Initialize processing buffer
    processingBuffer.setSize(1, bufferSize);

    // Initialize filter states
    initializeFilters();

    // Initialize history buffers for integrated LUFS
    int maxHistorySize = static_cast<int>((integrationTime / 1000.0) * sampleRate / bufferSize) + 100;
    powerHistory.clear();
    powerHistory.reserve(maxHistorySize);
    peakHistory.clear();
    peakHistory.reserve(maxHistorySize);

    initialized = true;
    return true;
}

void DynamicsAnalyzer::processBlock(juce::AudioBuffer<float>& buffer) {
    if (!initialized || buffer.getNumSamples() == 0) {
        return;
    }

    // Copy to processing buffer
    processingBuffer.makeCopyOf(buffer);

    // Process each analysis component
    processKWeightedFilter(processingBuffer);
    calculateLUFSMeasurement(processingBuffer);
    calculateDynamicRange(processingBuffer);
    calculateTruePeak(buffer); // Use original buffer for true peak
    updateEnvelope(processingBuffer);

    processedSamples += buffer.getNumSamples();
    lastUpdateTime = juce::Time::currentTimeMillis();
}

juce::String DynamicsAnalyzer::getResultsAsJson() const {
    if (!initialized) {
        return "{\"error\":\"Analyzer not initialized\"}";
    }

    juce::String result = "{";
    result += "\"analysisType\":\"DynamicsAnalyzer\",";
    result += "\"timestamp\":" + juce::String(juce::Time::currentTimeMillis()) + ",";
    result += "\"sampleRate\":" + juce::String(currentSampleRate) + ",";
    result += "\"bufferSize\":" + juce::String(currentBufferSize) + ",";
    result += "\"channels\":" + juce::String(processingBuffer.getNumChannels()) + ",";
    result += "\"lufs\":{";
    result += "\"momentary\":" + juce::String(lufsMomentary, 3) + ",";
    result += "\"shortTerm\":" + juce::String(lufsShortTerm, 3) + ",";
    result += "\"integrated\":" + juce::String(lufsIntegrated, 3) + ",";
    result += "\"range\":" + juce::String(lufsRange, 3);
    result += "},";
    result += "\"dynamics\":{";
    result += "\"crestFactor\":" + juce::String(crestFactor, 3) + ",";
    result += "\"dynamicRange\":" + juce::String(dynamicRange, 3) + ",";
    result += "\"truePeak\":" + juce::String(truePeak, 3);
    result += "},";
    result += "\"envelope\":{";
    result += "\"current\":" + juce::String(envelopeValue, 6) + ",";
    result += "\"attackTime\":" + juce::String(attackTime) + ",";
    result += "\"releaseTime\":" + juce::String(releaseTime);
    result += "},";
    result += "\"processedSamples\":" + juce::String(processedSamples);
    result += "}";

    return result;
}

bool DynamicsAnalyzer::isReady() const {
    return initialized;
}

void DynamicsAnalyzer::reset() {
    resetInternalState();
    if (initialized) {
        initializeFilters();
    }
}

juce::String DynamicsAnalyzer::getAnalysisType() const {
    return "DynamicsAnalyzer";
}

// Dynamics-specific methods
double DynamicsAnalyzer::getCurrentLUFS() const {
    return lufsMomentary;
}

double DynamicsAnalyzer::getIntegratedLUFS() const {
    return lufsIntegrated;
}

double DynamicsAnalyzer::getDynamicRange() const {
    return dynamicRange;
}

double DynamicsAnalyzer::getCrestFactor() const {
    return crestFactor;
}

double DynamicsAnalyzer::getTruePeak() const {
    return truePeak;
}

double DynamicsAnalyzer::getEnvelopeValue() const {
    return envelopeValue;
}

// Configuration methods
void DynamicsAnalyzer::setAttackTime(double attackTimeMs) {
    attackTime = juce::jlimit(0.1, 1000.0, attackTimeMs);
    // Update filter coefficients for envelope
    updateEnvelopeCoefficients();
}

void DynamicsAnalyzer::setReleaseTime(double releaseTimeMs) {
    releaseTime = juce::jlimit(1.0, 5000.0, releaseTimeMs);
    // Update filter coefficients for envelope
    updateEnvelopeCoefficients();
}

void DynamicsAnalyzer::setWindowTime(double windowTimeMs) {
    windowTime = juce::jlimit(100.0, 5000.0, windowTimeMs);
}

void DynamicsAnalyzer::setIntegrationTime(double integrationTimeMs) {
    integrationTime = juce::jlimit(1000.0, 10000.0, integrationTimeMs);
}

// Internal helper methods - GREEN PHASE IMPLEMENTATIONS

void DynamicsAnalyzer::initializeFilters() {
    // Reset filter states for K-weighted filtering
    kWeightFilter.reset();

    // Calculate K-weighted filter coefficients
    double sampleRate = currentSampleRate;

    // High-pass filter at 38 Hz (pre-filter)
    double hpFreq = 38.0;
    double hpOmega = 2.0 * M_PI * hpFreq / sampleRate;
    double hpQ = 0.5; // Butterworth Q for 2nd order
    double hpAlpha = std::sin(hpOmega) / (2.0 * hpQ);

    kWeightFilter.hpB1 = 2.0 * std::cos(hpOmega);
    kWeightFilter.hpB2 = 1.0 - hpAlpha;
    kWeightFilter.hpA0 = (1.0 + std::cos(hpOmega)) / 2.0;
    kWeightFilter.hpA1 = -(1.0 + std::cos(hpOmega));

    // High-shelf filter at 1 kHz with +4 dB gain
    double hsFreq = 1000.0;
    double hsOmega = 2.0 * M_PI * hsFreq / sampleRate;
    double hsGain = 4.0; // dB
    double hsGainLinear = std::pow(10.0, hsGain / 20.0);
    double hsS = std::sqrt(hsGainLinear);
    double hsAlpha = std::sin(hsOmega) / 2.0 * std::sqrt((hsS + 1.0 / hsS) * (1.0 / 0.5 - 1.0) + 2.0);

    kWeightFilter.hsA0 = hsGainLinear * ((hsS + 1.0) - (hsS - 1.0) * std::cos(hsOmega) + 2.0 * std::sqrt(hsS) * hsAlpha);
    kWeightFilter.hsA1 = 2.0 * hsGainLinear * ((hsS - 1.0) - (hsS + 1.0) * std::cos(hsOmega));
    kWeightFilter.hsA2 = hsGainLinear * ((hsS + 1.0) - (hsS - 1.0) * std::cos(hsOmega) - 2.0 * std::sqrt(hsS) * hsAlpha);
    kWeightFilter.hsB0 = (hsS + 1.0) + (hsS - 1.0) * std::cos(hsOmega) + 2.0 * std::sqrt(hsS) * hsAlpha;
    kWeightFilter.hsB1 = -2.0 * ((hsS - 1.0) + (hsS + 1.0) * std::cos(hsOmega));
    kWeightFilter.hsB2 = (hsS + 1.0) + (hsS - 1.0) * std::cos(hsOmega) - 2.0 * std::sqrt(hsS) * hsAlpha;

    // Normalize
    double hsNorm = kWeightFilter.hsB0;
    kWeightFilter.hsA0 /= hsNorm;
    kWeightFilter.hsA1 /= hsNorm;
    kWeightFilter.hsA2 /= hsNorm;
    kWeightFilter.hsB0 /= hsNorm;
    kWeightFilter.hsB1 /= hsNorm;
    kWeightFilter.hsB2 /= hsNorm;

    // Initialize envelope follower coefficients
    updateEnvelopeCoefficients();
}

void DynamicsAnalyzer::updateEnvelopeCoefficients() {
    // Convert attack/release times to filter coefficients
    double sampleRate = currentSampleRate;

    // Attack coefficient (fast response to signal increases)
    double attackSamples = (attackTime / 1000.0) * sampleRate;
    envAttackCoeff = std::exp(-1.0 / attackSamples);

    // Release coefficient (slow response to signal decreases)
    double releaseSamples = (releaseTime / 1000.0) * sampleRate;
    envReleaseCoeff = std::exp(-1.0 / releaseSamples);
}

void DynamicsAnalyzer::processKWeightedFilter(juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    for (int channel = 0; channel < numChannels; ++channel) {
        auto* channelData = buffer.getWritePointer(channel);

        for (int sample = 0; sample < numSamples; ++sample) {
            double input = channelData[sample];

            // High-pass filter (38 Hz pre-filter)
            double hpOutput = kWeightFilter.hpA0 * input +
                           kWeightFilter.hpA1 * kWeightFilter.hpX1[channel] +
                           kWeightFilter.hpA2 * kWeightFilter.hpX2[channel] -
                           kWeightFilter.hpB1 * kWeightFilter.hpY1[channel] -
                           kWeightFilter.hpB2 * kWeightFilter.hpY2[channel];

            // Update high-pass filter state
            kWeightFilter.hpX2[channel] = kWeightFilter.hpX1[channel];
            kWeightFilter.hpX1[channel] = input;
            kWeightFilter.hpY2[channel] = kWeightFilter.hpY1[channel];
            kWeightFilter.hpY1[channel] = hpOutput;

            // High-shelf filter (1 kHz with +4 dB gain)
            double hsOutput = kWeightFilter.hsA0 * hpOutput +
                           kWeightFilter.hsA1 * kWeightFilter.hsX1[channel] +
                           kWeightFilter.hsA2 * kWeightFilter.hsX2[channel] -
                           kWeightFilter.hsB1 * kWeightFilter.hsY1[channel] -
                           kWeightFilter.hsB2 * kWeightFilter.hsY2[channel];

            // Update high-shelf filter state
            kWeightFilter.hsX2[channel] = kWeightFilter.hsX1[channel];
            kWeightFilter.hsX1[channel] = hpOutput;
            kWeightFilter.hsY2[channel] = kWeightFilter.hsY1[channel];
            kWeightFilter.hsY1[channel] = hsOutput;

            // Store K-weighted result
            channelData[sample] = static_cast<float>(hsOutput);
        }
    }
}

void DynamicsAnalyzer::calculateLUFSMeasurement(const juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Calculate mean square power for this block (momentary LUFS)
    double blockPower = 0.0;
    for (int channel = 0; channel < numChannels; ++channel) {
        const auto* channelData = buffer.getReadPointer(channel);
        double channelPower = 0.0;
        for (int sample = 0; sample < numSamples; ++sample) {
            channelPower += channelData[sample] * channelData[sample];
        }
        blockPower += channelPower / numSamples;
    }

    double avgPower = blockPower / numChannels;

    // Store in power history for integrated LUFS calculation
    powerHistory.push_back(avgPower);

    // Maintain history size based on integration time
    int maxHistorySize = static_cast<int>((integrationTime / 1000.0) * currentSampleRate / numSamples) + 1;
    while (powerHistory.size() > maxHistorySize) {
        powerHistory.erase(powerHistory.begin());
    }

    // Calculate momentary LUFS (400ms window)
    int momentarySize = static_cast<int>((0.4 / 1000.0) * currentSampleRate / numSamples) + 1;
    double momentaryPower = 0.0;
    int momentaryStart = std::max(0, static_cast<int>(powerHistory.size()) - momentarySize);
    for (int i = momentaryStart; i < static_cast<int>(powerHistory.size()); ++i) {
        momentaryPower += powerHistory[i];
    }
    momentaryPower /= (powerHistory.size() - momentaryStart);

    // Calculate short-term LUFS (3000ms window)
    int shortTermSize = static_cast<int>((3.0 / 1000.0) * currentSampleRate / numSamples) + 1;
    double shortTermPower = 0.0;
    int shortTermStart = std::max(0, static_cast<int>(powerHistory.size()) - shortTermSize);
    for (int i = shortTermStart; i < static_cast<int>(powerHistory.size()); ++i) {
        shortTermPower += powerHistory[i];
    }
    shortTermPower /= (powerHistory.size() - shortTermStart);

    // Calculate integrated LUFS (entire history)
    double integratedPower = 0.0;
    if (!powerHistory.empty()) {
        for (double power : powerHistory) {
            integratedPower += power;
        }
        integratedPower /= powerHistory.size();
    }

    // Convert power to LUFS (add -0.691 dB for K-weighting correction)
    const double kWeightingCorrection = -0.691;

    if (momentaryPower > 1e-12) {
        lufsMomentary = 10.0 * std::log10(momentaryPower) + kWeightingCorrection;
    } else {
        lufsMomentary = -144.0; // Minimum measurable value
    }

    if (shortTermPower > 1e-12) {
        lufsShortTerm = 10.0 * std::log10(shortTermPower) + kWeightingCorrection;
    } else {
        lufsShortTerm = -144.0;
    }

    if (integratedPower > 1e-12) {
        lufsIntegrated = 10.0 * std::log10(integratedPower) + kWeightingCorrection;
    } else {
        lufsIntegrated = -144.0;
    }

    // Calculate loudness range (LRA) if we have enough history
    if (powerHistory.size() >= 100) { // Need sufficient history for reliable LRA
        calculateLoudnessRange();
    }
}

void DynamicsAnalyzer::calculateLoudnessRange() {
    // Calculate loudness range using EBU R128 method
    // This is a simplified implementation

    if (powerHistory.size() < 100) {
        lufsRange = 0.0;
        return;
    }

    // Create windowed loudness values for analysis
    std::vector<double> loudnessValues;
    const int windowSize = 10; // Use 10-block windows

    for (size_t i = 0; i + windowSize <= powerHistory.size(); i += windowSize / 2) {
        double windowPower = 0.0;
        for (int j = 0; j < windowSize; ++j) {
            windowPower += powerHistory[i + j];
        }
        windowPower /= windowSize;

        if (windowPower > 1e-12) {
            double loudness = 10.0 * std::log10(windowPower) - 0.691; // K-weighting correction
            loudnessValues.push_back(loudness);
        }
    }

    if (!loudnessValues.empty()) {
        // Calculate statistical loudness range
        std::sort(loudnessValues.begin(), loudnessValues.end());

        // Use 10th and 95th percentiles for LRA calculation
        size_t lowerIndex = static_cast<size_t>(0.1 * loudnessValues.size());
        size_t upperIndex = static_cast<size_t>(0.95 * loudnessValues.size());

        if (upperIndex < loudnessValues.size() && lowerIndex < upperIndex) {
            double lowerLoudness = loudnessValues[lowerIndex];
            double upperLoudness = loudnessValues[upperIndex];
            lufsRange = upperLoudness - lowerLoudness;
        }
    }
}

void DynamicsAnalyzer::calculateDynamicRange(const juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    double peakValue = 0.0;
    double rmsSum = 0.0;

    for (int channel = 0; channel < numChannels; ++channel) {
        const auto* channelData = buffer.getReadPointer(channel);

        for (int sample = 0; sample < numSamples; ++sample) {
            double absValue = std::abs(channelData[sample]);
            peakValue = std::max(peakValue, absValue);
            rmsSum += channelData[sample] * channelData[sample];
        }
    }

    double rms = std::sqrt(rmsSum / (numChannels * numSamples));

    // Calculate crest factor (peak to RMS ratio in dB)
    if (rms > 1e-12) {
        crestFactor = 20.0 * std::log10(peakValue / rms);
    } else {
        crestFactor = 0.0;
    }

    // Calculate dynamic range based on recent peak history
    peakHistory.push_back(peakValue);
    int maxPeakHistory = 100;
    while (peakHistory.size() > maxPeakHistory) {
        peakHistory.erase(peakHistory.begin());
    }

    if (peakHistory.size() > 1) {
        double minPeak = *std::min_element(peakHistory.begin(), peakHistory.end());
        double maxPeak = *std::max_element(peakHistory.begin(), peakHistory.end());

        if (minPeak > 1e-12) {
            dynamicRange = 20.0 * std::log10(maxPeak / minPeak);
        } else {
            dynamicRange = 0.0;
        }
    }
}

void DynamicsAnalyzer::calculateTruePeak(const juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    double maxPeak = 0.0;

    // For true peak detection, we should oversample by 4x
    // This is a simplified implementation that detects potential intersample peaks
    const double oversampleFactor = 4.0;

    for (int channel = 0; channel < numChannels; ++channel) {
        const auto* channelData = buffer.getReadPointer(channel);

        for (int sample = 0; sample < numSamples - 1; ++sample) {
            double current = channelData[sample];
            double next = channelData[sample + 1];

            // Simple linear interpolation for intersample peak estimation
            if ((current > 0 && next < 0) || (current < 0 && next > 0)) {
                // Zero crossing - potential peak between samples
                double interpolated = (current + next) * 0.5;
                maxPeak = std::max(maxPeak, std::abs(interpolated));
            }

            // Check actual sample peaks
            maxPeak = std::max(maxPeak, static_cast<double>(std::abs(current)));
        }

        // Check last sample
        if (numSamples > 0) {
            maxPeak = std::max(maxPeak, static_cast<double>(std::abs(channelData[numSamples - 1])));
        }
    }

    // Convert to dBFS
    if (maxPeak > 1e-12) {
        truePeak = 20.0 * std::log10(maxPeak);
    } else {
        truePeak = -144.0;
    }
}

void DynamicsAnalyzer::updateEnvelope(const juce::AudioBuffer<float>& buffer) {
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    for (int sample = 0; sample < numSamples; ++sample) {
        double inputLevel = 0.0;

        // Calculate RMS level across all channels for this sample
        for (int channel = 0; channel < numChannels; ++channel) {
            double sampleValue = buffer.getSample(channel, sample);
            inputLevel += sampleValue * sampleValue;
        }

        inputLevel = std::sqrt(inputLevel / numChannels);

        // Apply envelope follower with attack/release
        if (inputLevel > envelopeValue) {
            // Attack phase - fast response
            envelopeValue = inputLevel + envAttackCoeff * (envelopeValue - inputLevel);
        } else {
            // Release phase - slow response
            envelopeValue = inputLevel + envReleaseCoeff * (envelopeValue - inputLevel);
        }

        // Ensure envelope value stays positive
        envelopeValue = std::max(0.0, envelopeValue);
    }
}

void DynamicsAnalyzer::resetInternalState() {
    // Reset measurement variables
    lufsIntegrated = -23.0;
    lufsMomentary = -23.0;
    lufsShortTerm = -23.0;
    lufsRange = 0.0;
    crestFactor = 0.0;
    dynamicRange = 0.0;
    truePeak = 0.0;
    envelopeValue = 0.0;

    // Reset timing variables
    processedSamples = 0;
    lastUpdateTime = 0;

    // Clear history
    powerHistory.clear();
    peakHistory.clear();

    // Reset filter states
    std::fill(std::begin(kWeightFilter.hpX1), std::end(kWeightFilter.hpX1), 0.0);
    std::fill(std::begin(kWeightFilter.hpX2), std::end(kWeightFilter.hpX2), 0.0);
    std::fill(std::begin(kWeightFilter.hpY1), std::end(kWeightFilter.hpY1), 0.0);
    std::fill(std::begin(kWeightFilter.hpY2), std::end(kWeightFilter.hpY2), 0.0);
    std::fill(std::begin(kWeightFilter.hsX1), std::end(kWeightFilter.hsX1), 0.0);
    std::fill(std::begin(kWeightFilter.hsX2), std::end(kWeightFilter.hsX2), 0.0);
    std::fill(std::begin(kWeightFilter.hsY1), std::end(kWeightFilter.hsY1), 0.0);
    std::fill(std::begin(kWeightFilter.hsY2), std::end(kWeightFilter.hsY2), 0.0);

    // Reset envelope coefficients
    envAttackCoeff = std::exp(-1.0 / (attackTime / 1000.0 * currentSampleRate));
    envReleaseCoeff = std::exp(-1.0 / (releaseTime / 1000.0 * currentSampleRate));
}