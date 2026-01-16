// IMPROVED PitchDetector - Enhanced Low-Frequency Accuracy
// Addresses buffer size, frequency resolution, and sensitivity issues

#include "../../include/audio/PitchDetector.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <algorithm>
#include <cmath>
#include <chrono>

PitchDetector::PitchDetector() = default;

bool PitchDetector::initialize(double newSampleRate, int newBufferSize) {
    // IMPROVED: Enhanced validation and buffer size requirements for low frequencies

    if (newSampleRate <= 0.0 || newBufferSize <= 0) {
        return false;
    }

    // IMPROVED: Ensure buffer size is adequate for lowest frequency (80 Hz)
    int minRequiredBufferSize = static_cast<int>(4.0 * newSampleRate / minFrequency); // 4 periods minimum
    if (newBufferSize < minRequiredBufferSize) {
        bufferSize = minRequiredBufferSize;
    } else {
        bufferSize = newBufferSize;
    }

    sampleRate = newSampleRate;

    // IMPROVED: Extended max lag calculation with safety margin
    maxLag = static_cast<int>(sampleRate / minFrequency * 1.5); // 1.5x safety margin
    if (maxLag > bufferSize) {
        maxLag = bufferSize - 64; // Leave some margin for windowing
    }

    // Allocate buffers
    differenceBuffer.realloc(maxLag);
    windowBuffer.realloc(bufferSize);

    // IMPROVED: Use Blackman-Harris window for better low-frequency resolution
    for (int i = 0; i < bufferSize; ++i) {
        double n = static_cast<double>(i) / (bufferSize - 1);
        // Blackman-Harris window: -0.088, +0.5, -0.088 coefficients
        windowBuffer[i] = static_cast<float>(
            0.35875 - 0.48829 * std::cos(2.0 * M_PI * n) +
            0.14128 * std::cos(4.0 * M_PI * n) - 0.01168 * std::cos(6.0 * M_PI * n)
        );
    }

    initialized = true;
    return true;
}

void PitchDetector::processBlock(juce::AudioBuffer<float>& buffer) {
    auto startTime = std::chrono::high_resolution_clock::now();

    latestResult = PitchResult{};

    if (!initialized || buffer.getNumSamples() == 0) {
        lastProcessingTime = 0.0;
        return;
    }

    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    // Create mono buffer for analysis
    juce::HeapBlock<float> monoBuffer;
    monoBuffer.realloc(numSamples);

    if (numChannels == 1) {
        juce::FloatVectorOperations::copy(monoBuffer, buffer.getReadPointer(0), numSamples);
    } else {
        monoBuffer.clear(numSamples);
        for (int ch = 0; ch < numChannels; ++ch) {
            juce::FloatVectorOperations::add(monoBuffer, buffer.getReadPointer(ch), numSamples);
        }
        juce::FloatVectorOperations::multiply(monoBuffer, 1.0f / static_cast<float>(numChannels), numSamples);
    }

    // IMPROVED: Apply high-pass filter to remove DC offset that affects low frequencies
    applyHighPassFilter(monoBuffer, numSamples, 20.0); // 20 Hz cutoff

    // Apply window function
    applyWindow(monoBuffer, numSamples);

    // IMPROVED: Enhanced pitch detection with multiple methods
    double detectedFrequency = 0.0;
    double confidence = 0.0;

    // Method 1: Enhanced Autocorrelation
    auto result1 = enhancedAutocorrelation(monoBuffer, numSamples);

    // Method 2: Zero-crossing rate for low frequencies (fallback)
    auto result2 = zeroCrossingPitchDetection(monoBuffer, numSamples);

    // Method 3: AMDF (Average Magnitude Difference Function) for low frequencies
    auto result3 = amdfPitchDetection(monoBuffer, numSamples);

    // IMPROVED: Multi-method fusion with confidence weighting
    std::vector<std::pair<double, double>> candidates;

    if (result1.first > 0.0 && result1.second > 0.05) candidates.push_back(result1);
    if (result2.first > 0.0 && result2.second > 0.02) candidates.push_back(result2);
    if (result3.first > 0.0 && result3.second > 0.05) candidates.push_back(result3);

    if (!candidates.empty()) {
        // Sort by confidence
        std::sort(candidates.begin(), candidates.end(),
                 [](const auto& a, const auto& b) { return a.second > b.second; });

        // Use highest confidence candidate
        detectedFrequency = candidates[0].first;
        confidence = candidates[0].second;

        // IMPROVED: Harmonic validation for low frequencies
        if (detectedFrequency < 200.0) {
            confidence = validateLowFrequencyResult(monoBuffer, numSamples, detectedFrequency, confidence);
        }

        // Additional quality check
        double signalQuality = calculateSignalQuality(monoBuffer, numSamples);
        confidence *= signalQuality;
        confidence = std::clamp(confidence, 0.0, 1.0);
    }

    // Validate frequency range and apply adaptive confidence threshold
    double adaptiveThreshold = confidenceThreshold;
    if (detectedFrequency < 150.0) {
        adaptiveThreshold = 0.05; // Even lower threshold for low frequencies
    }

    if (detectedFrequency > 0.0 && validateFrequency(detectedFrequency) && confidence >= adaptiveThreshold) {
        double midiNote = frequencyToMidiNote(detectedFrequency);
        double exactFreq = 440.0 * std::pow(2.0, (midiNote - 69.0) / 12.0);
        double centsError = 1200.0 * std::log2(detectedFrequency / exactFreq);

        latestResult.frequency = detectedFrequency;
        latestResult.confidence = confidence;
        latestResult.isPitched = true;
        latestResult.midiNote = static_cast<int>(std::round(midiNote));
        latestResult.centsError = centsError;
        latestResult.pitchName = midiNoteToPitchName(latestResult.midiNote, centsError);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    lastProcessingTime = static_cast<double>(duration.count()) / 1000.0;
}

// IMPROVED: Enhanced autocorrelation with better peak detection
std::pair<double, double> PitchDetector::enhancedAutocorrelation(const float* buffer, int bufferSize) const {
    juce::HeapBlock<double> autocorr;
    autocorr.realloc(maxLag);

    // Calculate autocorrelation
    for (int lag = 0; lag < maxLag; ++lag) {
        double sum = 0.0;
        const int maxIndex = bufferSize - lag;

        for (int i = 0; i < maxIndex; ++i) {
            sum += static_cast<double>(buffer[i]) * static_cast<double>(buffer[i + lag]);
        }

        autocorr[lag] = sum;
    }

    // Normalize and enhance peak detection
    double maxValue = autocorr[0];
    if (maxValue <= 0.0) return {0.0, 0.0};

    for (int i = 1; i < maxLag; ++i) {
        autocorr[i] /= maxValue;
    }

    // IMPROVED: Multi-stage peak finding for better accuracy
    int minPeriod = static_cast<int>(sampleRate / maxFrequency);
    if (minPeriod < 1) minPeriod = 1;

    // Stage 1: Find primary peak
    int bestLag = minPeriod;
    double peakValue = 0.0;

    for (int lag = minPeriod; lag < maxLag; ++lag) {
        if (autocorr[lag] > peakValue) {
            peakValue = autocorr[lag];
            bestLag = lag;
        }
    }

    // Stage 2: Refine with parabolic interpolation
    if (bestLag > minPeriod && bestLag < maxLag - 1) {
        double y1 = autocorr[bestLag - 1];
        double y2 = autocorr[bestLag];
        double y3 = autocorr[bestLag + 1];

        double offset = parabolicInterpolation(y1, y2, y3);
        bestLag = static_cast<int>(std::round(bestLag + offset));
    }

    // Stage 3: Harmonic validation (check for octave errors)
    double frequency = sampleRate / static_cast<double>(bestLag);

    // Look for harmonic relationships
    for (int harmonic = 2; harmonic <= 4; ++harmonic) {
        int harmonicLag = bestLag / harmonic;
        if (harmonicLag >= minPeriod && harmonicLag < maxLag) {
            if (autocorr[harmonicLag] > peakValue * 0.8) {
                // Found strong harmonic - might be octave error
                frequency = sampleRate / static_cast<double>(harmonicLag);
                peakValue *= 0.9; // Slightly reduce confidence for harmonics
                break;
            }
        }
    }

    return {frequency, std::clamp(peakValue, 0.0, 1.0)};
}

// IMPROVED: Zero-crossing based pitch detection for low frequencies
std::pair<double, double> PitchDetector::zeroCrossingPitchDetection(const float* buffer, int bufferSize) const {
    std::vector<double> zeroCrossings;

    // Find zero crossings
    for (int i = 1; i < bufferSize; ++i) {
        double prev = static_cast<double>(buffer[i-1]);
        double curr = static_cast<double>(buffer[i]);

        if ((prev >= 0.0 && curr < 0.0) || (prev < 0.0 && curr >= 0.0)) {
            // Linear interpolation for more accurate zero crossing position
            if (std::abs(curr - prev) > 1e-10) {
                double t = prev / (prev - curr);
                zeroCrossings.push_back(i - 1 + t);
            }
        }
    }

    if (zeroCrossings.size() < 3) return {0.0, 0.0};

    // Calculate periods from zero crossings
    std::vector<double> periods;
    for (size_t i = 1; i < zeroCrossings.size(); ++i) {
        double period = (zeroCrossings[i] - zeroCrossings[i-1]) * 2.0; // Full period = 2 zero crossings
        periods.push_back(period);
    }

    // Filter out unreasonable periods
    double minPeriod = sampleRate / maxFrequency;
    double maxPeriod = sampleRate / minFrequency;

    std::vector<double> validPeriods;
    for (double period : periods) {
        if (period >= minPeriod && period <= maxPeriod) {
            validPeriods.push_back(period);
        }
    }

    if (validPeriods.empty()) return {0.0, 0.0};

    // Calculate median period to reduce noise
    std::sort(validPeriods.begin(), validPeriods.end());
    double medianPeriod = validPeriods[validPeriods.size() / 2];

    double frequency = sampleRate / medianPeriod;

    // Calculate confidence based on consistency
    double variance = 0.0;
    for (double period : validPeriods) {
        variance += (period - medianPeriod) * (period - medianPeriod);
    }
    variance /= validPeriods.size();

    double confidence = std::exp(-variance / (medianPeriod * medianPeriod * 0.1));

    return {frequency, std::clamp(confidence, 0.0, 1.0)};
}

// IMPROVED: AMDF (Average Magnitude Difference Function) for low frequencies
std::pair<double, double> PitchDetector::amdfPitchDetection(const float* buffer, int bufferSize) const {
    int maxLagAMDF = std::min(maxLag, bufferSize / 2);
    juce::HeapBlock<double> amdf;
    amdf.realloc(maxLagAMDF);

    // Calculate AMDF
    for (int lag = 0; lag < maxLagAMDF; ++lag) {
        double sum = 0.0;
        const int maxIndex = bufferSize - lag;

        for (int i = 0; i < maxIndex; ++i) {
            double diff = std::abs(static_cast<double>(buffer[i]) - static_cast<double>(buffer[i + lag]));
            sum += diff;
        }

        amdf[lag] = sum / maxIndex;
    }

    // Find minimum (corresponds to pitch period)
    int minPeriod = static_cast<int>(sampleRate / maxFrequency);
    if (minPeriod < 1) minPeriod = 1;

    int bestLag = minPeriod;
    double minValue = amdf[minPeriod];

    for (int lag = minPeriod + 1; lag < maxLagAMDF; ++lag) {
        if (amdf[lag] < minValue) {
            minValue = amdf[lag];
            bestLag = lag;
        }
    }

    // Calculate confidence based on depth of minimum
    double maxValue = amdf[minPeriod];
    double confidence = (maxValue - minValue) / maxValue;

    double frequency = sampleRate / static_cast<double>(bestLag);

    return {frequency, std::clamp(confidence, 0.0, 1.0)};
}

// IMPROVED: High-pass filter to remove DC offset
void PitchDetector::applyHighPassFilter(float* buffer, int bufferSize, double cutoffFreq) const {
    static double prevInput = 0.0;
    static double prevOutput = 0.0;

    double rc = 1.0 / (2.0 * M_PI * cutoffFreq);
    double dt = 1.0 / sampleRate;
    double alpha = rc / (rc + dt);

    for (int i = 0; i < bufferSize; ++i) {
        double input = static_cast<double>(buffer[i]);
        double output = alpha * (prevOutput + input - prevInput);

        buffer[i] = static_cast<float>(output);
        prevInput = input;
        prevOutput = output;
    }
}

// IMPROVED: Enhanced validation for low frequencies
double PitchDetector::validateLowFrequencyResult(const float* buffer, int bufferSize, double frequency, double confidence) const {
    if (frequency < 100.0) {
        // For very low frequencies, check if the result makes sense
        int expectedPeriod = static_cast<int>(sampleRate / frequency);

        // Verify the detected period exists in the signal
        double correlation = 0.0;
        int samples = std::min(bufferSize - expectedPeriod, bufferSize);

        for (int i = 0; i < samples; ++i) {
            correlation += buffer[i] * buffer[i + expectedPeriod];
        }

        correlation /= samples;

        if (correlation > 0.1) {
            confidence *= 1.2; // Boost confidence for verified low frequencies
        } else {
            confidence *= 0.5; // Reduce confidence for unverified results
        }
    }

    return std::clamp(confidence, 0.0, 1.0);
}

// Keep all other existing methods unchanged...
juce::String PitchDetector::getResultsAsJson() const {
    juce::DynamicObject::Ptr json = new juce::DynamicObject();

    json->setProperty("analysisType", getAnalysisType());
    json->setProperty("timestamp", juce::Time::getCurrentTime().toISO8601(false));
    json->setProperty("sampleRate", sampleRate);
    json->setProperty("bufferSize", bufferSize);
    json->setProperty("processingTimeMs", lastProcessingTime);

    juce::DynamicObject::Ptr pitchResult = new juce::DynamicObject();
    pitchResult->setProperty("frequency", latestResult.frequency);
    pitchResult->setProperty("confidence", latestResult.confidence);
    pitchResult->setProperty("isPitched", latestResult.isPitched);
    pitchResult->setProperty("midiNote", latestResult.midiNote);
    pitchResult->setProperty("centsError", latestResult.centsError);
    pitchResult->setProperty("pitchName", latestResult.pitchName);

    json->setProperty("pitchResult", juce::var(pitchResult.get()));

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

// Keep existing helper methods
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
    int period = -1;
    int minPeriod = static_cast<int>(sampleRate / maxFrequency);
    if (minPeriod < 1) minPeriod = 1;

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
    return period; // Simplified for now
}

double PitchDetector::parabolicInterpolation(double y1, double y2, double y3) const {
    double a = (y3 - 2.0 * y2 + y1) / 2.0;

    if (std::abs(a) < 1e-10) {
        return 0.0; // Linear case
    }

    double b = (y3 - y1) / 2.0;
    return -b / (2.0 * a);
}

void PitchDetector::applyWindow(float* buffer, int size) const {
    if (windowBuffer.getData() != nullptr && size <= bufferSize) {
        for (int i = 0; i < size; ++i) {
            buffer[i] *= windowBuffer[i];
        }
    }
}

double PitchDetector::calculateSignalQuality(const float* buffer, int size) const {
    if (size == 0) return 0.0;

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

    double signalStrength = std::clamp(rms * 10.0, 0.0, 1.0);
    double stability = std::clamp(1.0 - zcr * 100.0, 0.0, 1.0);

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