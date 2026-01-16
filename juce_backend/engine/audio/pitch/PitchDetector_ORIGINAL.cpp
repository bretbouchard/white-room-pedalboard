// GREEN PHASE FINAL IMPLEMENTATION
// This file contains the working GREEN phase implementation

#include "../../include/audio/PitchDetector.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <algorithm>
#include <cmath>
#include <chrono>

PitchDetector::PitchDetector() = default;

bool PitchDetector::initialize(double newSampleRate, int newBufferSize) {
    // GREEN PHASE: Real implementation with proper validation

    // Validate input parameters
    if (newSampleRate <= 0.0 || newBufferSize <= 0) {
        return false;
    }

    // Check if buffer size is power of 2 (common for audio processing)
    if ((newBufferSize & (newBufferSize - 1)) != 0) {
        return false; // Not power of 2
    }

    sampleRate = newSampleRate;
    bufferSize = newBufferSize;

    // Calculate max lag based on minimum frequency we want to detect
    maxLag = static_cast<int>(sampleRate / minFrequency);
    if (maxLag > bufferSize) {
        maxLag = bufferSize;
    }

    // Allocate buffers for YIN algorithm
    differenceBuffer.realloc(maxLag);
    windowBuffer.realloc(bufferSize);

    // Generate Hann window for smooth analysis
    for (int i = 0; i < bufferSize; ++i) {
        windowBuffer[i] = static_cast<float>(0.5 * (1.0 - std::cos(2.0 * juce::MathConstants<double>::pi * i / (bufferSize - 1))));
    }

    initialized = true;
    return true;
}

void PitchDetector::processBlock(juce::AudioBuffer<float>& buffer) {
    auto startTime = std::chrono::high_resolution_clock::now();

    // Reset latest result
    latestResult = PitchResult{};

    if (!initialized || buffer.getNumSamples() == 0) {
        lastProcessingTime = 0.0;
        return;
    }

    // Get working buffer (first channel or mix down to mono)
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Create a mono buffer for analysis
    juce::HeapBlock<float> monoBuffer;
    monoBuffer.realloc(numSamples);

    if (numChannels == 1) {
        // Single channel - copy directly
        juce::FloatVectorOperations::copy(monoBuffer, buffer.getReadPointer(0), numSamples);
    } else {
        // Multi-channel - mix down to mono
        monoBuffer.clear(numSamples);
        for (int ch = 0; ch < numChannels; ++ch) {
            juce::FloatVectorOperations::add(monoBuffer, buffer.getReadPointer(ch), numSamples);
        }
        juce::FloatVectorOperations::multiply(monoBuffer, 1.0f / static_cast<float>(numChannels), numSamples);
    }

    // Apply window function to reduce spectral leakage
    applyWindow(monoBuffer, numSamples);

    // GREEN PHASE: Simplified but robust pitch detection using autocorrelation
    double detectedFrequency = 0.0;
    double confidence = 0.0;

    // Calculate autocorrelation
    juce::HeapBlock<double> autocorr;
    autocorr.realloc(maxLag);

    for (int lag = 0; lag < maxLag; ++lag) {
        double sum = 0.0;
        const int maxIndex = numSamples - lag;

        for (int i = 0; i < maxIndex; ++i) {
            sum += static_cast<double>(monoBuffer[i]) * static_cast<double>(monoBuffer[i + lag]);
        }

        autocorr[lag] = sum;
    }

    // Normalize autocorrelation
    double maxValue = autocorr[0];
    if (maxValue > 0.0) {
        for (int i = 1; i < maxLag; ++i) {
            autocorr[i] /= maxValue;
        }
    }

    // Find peak in autocorrelation (excluding lag 0)
    int bestLag = 1;
    double peakValue = 0.0;

    int minPeriod = static_cast<int>(sampleRate / maxFrequency);
    if (minPeriod < 1) minPeriod = 1;

    for (int lag = minPeriod; lag < maxLag; ++lag) {
        if (autocorr[lag] > peakValue) {
            peakValue = autocorr[lag];
            bestLag = lag;
        }
    }

    // Validate the found peak
    if (peakValue > 0.2 && bestLag > 0) { // More lenient threshold for GREEN phase
        detectedFrequency = sampleRate / static_cast<double>(bestLag);

        // Calculate confidence based on peak strength
        confidence = std::clamp(peakValue, 0.0, 1.0);

        // Additional quality check
        double signalQuality = calculateSignalQuality(monoBuffer, numSamples);
        confidence *= signalQuality;
        confidence = std::clamp(confidence, 0.0, 1.0);
    }

    // Validate frequency range and apply confidence threshold
    if (detectedFrequency > 0.0 && validateFrequency(detectedFrequency) && confidence >= confidenceThreshold) {
        // Convert to musical note
        double midiNote = frequencyToMidiNote(detectedFrequency);
        double exactFreq = 440.0 * std::pow(2.0, (midiNote - 69.0) / 12.0);
        double centsError = 1200.0 * std::log2(detectedFrequency / exactFreq);

        // Update result
        latestResult.frequency = detectedFrequency;
        latestResult.confidence = confidence;
        latestResult.isPitched = true;
        latestResult.midiNote = static_cast<int>(std::round(midiNote));
        latestResult.centsError = centsError;
        latestResult.pitchName = midiNoteToPitchName(latestResult.midiNote, centsError);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    lastProcessingTime = static_cast<double>(duration.count()) / 1000.0; // Convert to milliseconds
}

juce::String PitchDetector::getResultsAsJson() const {
    juce::DynamicObject::Ptr json = new juce::DynamicObject();

    // Basic analysis info
    json->setProperty("analysisType", getAnalysisType());
    json->setProperty("timestamp", juce::Time::getCurrentTime().toISO8601(false));
    json->setProperty("sampleRate", sampleRate);
    json->setProperty("bufferSize", bufferSize);
    json->setProperty("processingTimeMs", lastProcessingTime);

    // Pitch detection results
    juce::DynamicObject::Ptr pitchResult = new juce::DynamicObject();
    pitchResult->setProperty("frequency", latestResult.frequency);
    pitchResult->setProperty("confidence", latestResult.confidence);
    pitchResult->setProperty("isPitched", latestResult.isPitched);
    pitchResult->setProperty("midiNote", latestResult.midiNote);
    pitchResult->setProperty("centsError", latestResult.centsError);
    pitchResult->setProperty("pitchName", latestResult.pitchName);

    json->setProperty("pitchResult", juce::var(pitchResult.get()));

    // Configuration info
    juce::DynamicObject::Ptr config = new juce::DynamicObject();
    config->setProperty("minFrequency", minFrequency);
    config->setProperty("maxFrequency", maxFrequency);
    config->setProperty("confidenceThreshold", confidenceThreshold);
    config->setProperty("yinThreshold", yinThreshold);

    json->setProperty("configuration", juce::var(config.get()));

    return juce::JSON::toString(juce::var(json.get()), true);
}

bool PitchDetector::isReady() const {
    return initialized;
}

void PitchDetector::reset() {
    if (initialized) {
        latestResult = PitchResult{};
        lastProcessingTime = 0.0;
        // Clear buffers for clean state
        if (differenceBuffer.getData() != nullptr) {
            juce::FloatVectorOperations::fill(differenceBuffer, 0.0, maxLag);
        }
    }
}

juce::String PitchDetector::getAnalysisType() const {
    return "PitchDetector";
}

PitchResult PitchDetector::getLatestPitchResult() const {
    return latestResult;
}

double PitchDetector::getCurrentFrequency() const {
    return latestResult.frequency;
}

double PitchDetector::getConfidence() const {
    return latestResult.confidence;
}

bool PitchDetector::hasPitch() const {
    return latestResult.isPitched;
}

juce::String PitchDetector::getPitchName() const {
    return latestResult.pitchName;
}

void PitchDetector::setMinFrequency(double minFreq) {
    minFrequency = minFreq;
}

void PitchDetector::setMaxFrequency(double maxFreq) {
    maxFrequency = maxFreq;
}

void PitchDetector::setConfidenceThreshold(double threshold) {
    confidenceThreshold = threshold;
}

void PitchDetector::setYINThreshold(double threshold) {
    yinThreshold = threshold;
}

double PitchDetector::calculateDifferenceFunction(const float* buffer, int bufferSize, int lag) const {
    if (lag >= bufferSize) return 0.0;

    double sum = 0.0;
    const int maxIndex = bufferSize - lag;

    for (int i = 0; i < maxIndex; ++i) {
        double diff = static_cast<double>(buffer[i]) - static_cast<double>(buffer[i + lag]);
        sum += diff * diff;
    }

    return sum;
}

double PitchDetector::findPeriodFromDifference(const double* cmnd, int bufferSize) const {
    // Simplified period finding for GREEN phase
    int period = -1;

    int minPeriod = static_cast<int>(sampleRate / maxFrequency);
    if (minPeriod < 1) minPeriod = 1;

    // Find absolute minimum
    double minValue = 1.0;
    for (int tau = minPeriod; tau < maxLag; ++tau) {
        if (cmnd[tau] < minValue) {
            minValue = cmnd[tau];
            period = tau;
        }
    }

    return static_cast<double>(period);
}

double PitchDetector::refinePitchEstimate(double period, const float* buffer, int bufferSize) const {
    // Simple refinement - return period as-is for GREEN phase
    return period;
}

double PitchDetector::parabolicInterpolation(double y1, double y2, double y3) const {
    // Parabolic interpolation for sub-sample accuracy
    double a = (y3 - 2.0 * y2 + y1) / 2.0;

    if (std::abs(a) < 1e-10) {
        return 0.0; // Linear case
    }

    double b = (y3 - y1) / 2.0;
    return -b / (2.0 * a);
}

void PitchDetector::applyWindow(float* buffer, int size) const {
    if (windowBuffer.getData() != nullptr && size <= bufferSize) {
        // Apply Hann window function
        for (int i = 0; i < size; ++i) {
            buffer[i] *= windowBuffer[i];
        }
    }
}

double PitchDetector::calculateSignalQuality(const float* buffer, int size) const {
    if (size == 0) return 0.0;

    // Calculate signal strength and zero-crossing rate for quality assessment
    double rms = 0.0;
    int zeroCrossings = 0;

    for (int i = 0; i < size; ++i) {
        double sample = static_cast<double>(buffer[i]);
        rms += sample * sample;

        if (i > 0) {
            double prevSample = static_cast<double>(buffer[i - 1]);
            if ((sample >= 0.0 && prevSample < 0.0) || (sample < 0.0 && prevSample >= 0.0)) {
                zeroCrossings++;
            }
        }
    }

    rms = std::sqrt(rms / static_cast<double>(size));
    double zcr = static_cast<double>(zeroCrossings) / static_cast<double>(size - 1);

    // Normalize and combine metrics
    double signalStrength = std::clamp(rms * 10.0, 0.0, 1.0); // Scale and clamp RMS
    double stability = std::clamp(1.0 - zcr * 100.0, 0.0, 1.0); // Inverse of zero-crossing rate

    return (signalStrength + stability) / 2.0;
}

bool PitchDetector::validateFrequency(double frequency) const {
    return frequency >= minFrequency && frequency <= maxFrequency;
}

double PitchDetector::frequencyToMidiNote(double frequency) const {
    if (frequency <= 0.0) return -1.0;
    return 69.0 + 12.0 * std::log2(frequency / 440.0);
}

juce::String PitchDetector::midiNoteToPitchName(int midiNote, double cents) const {
    if (midiNote < 0 || midiNote > 127) return "";

    const char* noteNames[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
    int octave = (midiNote / 12) - 1;
    int noteIndex = midiNote % 12;

    return juce::String(noteNames[noteIndex]) + juce::String(octave);
}