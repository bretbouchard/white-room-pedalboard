// COMPLEX PITCH DETECTOR - Advanced Detection for Real Musical Instruments
// Handles harmonics, polyphony, instrument-specific characteristics, and spectral analysis

// Minimal JUCE includes
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include "ComplexPitchDetector.h"
#include <algorithm>
#include <cmath>
#include <numeric>
#include <chrono>

ComplexPitchDetector::ComplexPitchDetector() {
    // Initialize instrument harmonic templates
    setupHarmonicTemplates();
}

bool ComplexPitchDetector::initialize(double newSampleRate, int newBufferSize) {
    if (newSampleRate <= 0.0 || newBufferSize <= 0) {
        return false;
    }

    sampleRate = newSampleRate;
    bufferSize = newBufferSize;

    // Ensure adequate buffer size for low frequencies and FFT
    int minRequiredBufferSize = std::max(
        static_cast<int>(4.0 * sampleRate / minFrequency),
        2048 // Minimum for decent spectral resolution
    );

    if (bufferSize < minRequiredBufferSize) {
        bufferSize = minRequiredBufferSize;
    }

    // Initialize FFT buffers (power of 2 for FFT efficiency)
    int fftSize = 1;
    while (fftSize < bufferSize) {
        fftSize *= 2;
    }

    fftBuffer.resize(fftSize);
    powerSpectrum.resize(fftSize / 2 + 1);

    // Initialize window buffer (Blackman-Harris for spectral analysis)
    windowBuffer.resize(bufferSize);
    for (int i = 0; i < bufferSize; ++i) {
        double n = static_cast<double>(i) / (bufferSize - 1);
        windowBuffer[i] = 0.35875 - 0.48829 * std::cos(2.0 * M_PI * n) +
                         0.14128 * std::cos(4.0 * M_PI * n) - 0.01168 * std::cos(6.0 * M_PI * n);
    }

    // Initialize audio processing buffer
    monoBuffer.realloc(bufferSize);

    // Initialize spectral history for temporal consistency
    spectralHistory.resize(100, 0.0); // Keep last 100 frames

    initialized = true;
    return true;
}

void ComplexPitchDetector::processBlock(juce::AudioBuffer<float>& buffer) {
    latestResult = ComplexPitchResult{};

    if (!initialized || buffer.getNumSamples() == 0) {
        return;
    }

    // Detect instrument category if unknown
    if (instrumentCategory == InstrumentCategory::Unknown) {
        instrumentCategory = detectInstrumentCategory(buffer);
    }

    // Apply instrument-specific optimizations
    applyInstrumentOptimizations(instrumentCategory);

    // Mix down to mono for analysis
    const int numChannels = buffer.getNumChannels();
    const int numSamples = buffer.getNumSamples();

    if (numChannels == 1) {
        juce::FloatVectorOperations::copy(monoBuffer, buffer.getReadPointer(0), numSamples);
    } else {
        monoBuffer.clear(numSamples);
        for (int ch = 0; ch < numChannels; ++ch) {
            juce::FloatVectorOperations::add(monoBuffer, buffer.getReadPointer(ch), numSamples);
        }
        juce::FloatVectorOperations::multiply(monoBuffer, 1.0f / numChannels, numSamples);
    }

    // Create working copy
    juce::HeapBlock<float> workingBuffer;
    workingBuffer.realloc(bufferSize);
    juce::FloatVectorOperations::copy(workingBuffer, monoBuffer, numSamples);

    // Pad with zeros if needed
    if (numSamples < bufferSize) {
        juce::FloatVectorOperations::fill(workingBuffer + numSamples, 0.0f, bufferSize - numSamples);
    }

    // Apply noise robustness
    applyNoiseRobustness(workingBuffer);

    // Detect and handle transients
    bool hasTransient = detectAttackTransient(workingBuffer);
    applyTransientHandling(workingBuffer, hasTransient);

    // Apply window function
    for (int i = 0; i < bufferSize; ++i) {
        workingBuffer[i] *= static_cast<float>(windowBuffer[i]);
    }

    juce::AudioBuffer<float> monoJuceBuffer(1, bufferSize);
    monoJuceBuffer.copyFrom(0, 0, workingBuffer, bufferSize);

    // Perform complex pitch detection
    latestResult = detectComplexPitch(monoJuceBuffer);

    // Update spectral history for temporal consistency
    if (latestResult.fundamentalFrequency > 0) {
        spectralHistory[frameCount % spectralHistory.size()] = latestResult.fundamentalFrequency;
    }

    frameCount++;
}

ComplexPitchResult ComplexPitchDetector::detectComplexPitch(const juce::AudioBuffer<float>& buffer) {
    ComplexPitchResult result;

    // Method 1: Spectral analysis for fundamental detection
    double spectralFundamental = detectFundamentalWithSpectralAnalysis(buffer);

    // Method 2: Enhanced temporal analysis
    double temporalFundamental = detectFundamentalWithTemporalAnalysis(buffer);

    // Method 3: Polyphonic detection if enabled
    std::vector<double> polyphonicPitches;
    if (polyphonicDetectionEnabled) {
        polyphonicPitches = detectPolyphonicPitches(buffer);
    }

    // Merge results with confidence weighting
    std::vector<std::pair<double, double>> candidates;

    if (spectralFundamental > 0) {
        double confidence = validateFundamentalWithHarmonics(spectralFundamental, computePowerSpectrum(computeFFT(buffer.getReadPointer(0), bufferSize)));
        candidates.push_back({spectralFundamental, confidence * 0.6}); // Spectral gets 60% weight
    }

    if (temporalFundamental > 0) {
        // Get confidence from temporal method
        double confidence = 0.8; // Enhanced autocorrelation typically has good confidence
        candidates.push_back({temporalFundamental, confidence * 0.4}); // Temporal gets 40% weight
    }

    // Add polyphonic candidates
    for (double pitch : polyphonicPitches) {
        candidates.push_back({pitch, 0.5}); // Polyphonic candidates get moderate confidence
    }

    if (candidates.empty()) {
        return result;
    }

    // Sort by confidence
    std::sort(candidates.begin(), candidates.end(),
             [](const auto& a, const auto& b) { return a.second > b.second; });

    // Primary pitch is highest confidence candidate
    result.fundamentalFrequency = candidates[0].first;
    result.primaryConfidence = candidates[0].second;
    result.isPitched = result.fundamentalFrequency > 0 && result.primaryConfidence >= confidenceThreshold;

    if (result.isPitched) {
        // Convert to musical notation
        result.primaryMidiNote = static_cast<int>(std::round(frequencyToMidiNote(result.fundamentalFrequency)));
        result.centsErrors.push_back(calculateCentsError(result.fundamentalFrequency, result.primaryMidiNote));
        result.pitchNames.push_back(midiNoteToPitchName(result.primaryMidiNote, result.centsErrors[0]));

        // Add other pitches if polyphonic
        result.isPolyphonic = candidates.size() > 1 && candidates[1].second >= confidenceThreshold * 0.5;

        if (result.isPolyphonic) {
            for (size_t i = 1; i < std::min(candidates.size(), static_cast<size_t>(maxPolyphony)); ++i) {
                if (candidates[i].second >= confidenceThreshold * 0.5) {
                    result.frequencies.push_back(candidates[i].first);
                    result.confidences.push_back(candidates[i].second);

                    int midiNote = static_cast<int>(std::round(frequencyToMidiNote(candidates[i].first)));
                    result.midiNotes.push_back(midiNote);
                    result.centsErrors.push_back(calculateCentsError(candidates[i].first, midiNote));
                    result.pitchNames.push_back(midiNoteToPitchName(midiNote, result.centsErrors.back()));
                }
            }
        }

        // Add primary pitch to the vectors for consistency
        result.frequencies.insert(result.frequencies.begin(), result.fundamentalFrequency);
        result.confidences.insert(result.confidences.begin(), result.primaryConfidence);
        result.midiNotes.insert(result.midiNotes.begin(), result.primaryMidiNote);

        // Calculate spectral features
        auto spectrum = computePowerSpectrum(computeFFT(buffer.getReadPointer(0), bufferSize));
        result.spectralCentroid = calculateSpectralCentroid(spectrum);

        auto harmonics = extractHarmonics(result.fundamentalFrequency, spectrum);
        result.harmonicStrengths = harmonics;
        result.harmonicComplexity = calculateHarmonicComplexity(harmonics);
    }

    return result;
}

double ComplexPitchDetector::detectFundamentalWithSpectralAnalysis(const juce::AudioBuffer<float>& buffer) {
    // Compute FFT
    auto fft = computeFFT(buffer.getReadPointer(0), bufferSize);
    auto spectrum = computePowerSpectrum(fft);

    // Find spectral peaks
    std::vector<std::pair<int, double>> peaks;
    for (size_t i = 1; i < spectrum.size() - 1; ++i) {
        if (spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i+1]) {
            double freq = static_cast<double>(i) * sampleRate / bufferSize;
            if (freq >= minFrequency && freq <= maxFrequency) {
                peaks.emplace_back(i, spectrum[i]);
            }
        }
    }

    if (peaks.empty()) return 0.0;

    // Sort peaks by magnitude
    std::sort(peaks.begin(), peaks.end(),
             [](const auto& a, const auto& b) { return a.second > b.second; });

    // Try to find fundamental by checking harmonic relationships
    for (const auto& peak : peaks) {
        double candidateFreq = static_cast<double>(peak.first) * sampleRate / bufferSize;

        // Validate with harmonic analysis
        double harmonicScore = validateFundamentalWithHarmonics(candidateFreq, spectrum);

        if (harmonicScore > 0.3) {
            return candidateFreq;
        }
    }

    // Fallback: use highest peak
    return static_cast<double>(peaks[0].first) * sampleRate / bufferSize;
}

std::vector<double> ComplexPitchDetector::detectPolyphonicPitches(const juce::AudioBuffer<float>& buffer) {
    std::vector<double> pitches;

    // Compute FFT
    auto fft = computeFFT(buffer.getReadPointer(0), bufferSize);
    auto spectrum = computePowerSpectrum(fft);

    // Use spectral peak picking for multiple fundamental candidates
    std::vector<std::pair<int, double>> peaks;
    for (size_t i = 1; i < spectrum.size() - 1; ++i) {
        if (spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i+1]) {
            double freq = static_cast<double>(i) * sampleRate / bufferSize;
            if (freq >= minFrequency && freq <= maxFrequency) {
                // Check if this could be a fundamental (not just a harmonic)
                if (validateFundamentalWithHarmonics(freq, spectrum) > 0.2) {
                    peaks.emplace_back(i, spectrum[i]);
                }
            }
        }
    }

    // Sort and take top candidates
    std::sort(peaks.begin(), peaks.end(),
             [](const auto& a, const auto& b) { return a.second > b.second; });

    for (int i = 0; i < std::min(static_cast<int>(peaks.size()), maxPolyphony); ++i) {
        double freq = static_cast<double>(peaks[i].first) * sampleRate / bufferSize;

        // Check if this frequency is sufficiently different from already found pitches
        bool isDistinct = true;
        for (double existing : pitches) {
            double ratio = std::max(freq, existing) / std::min(freq, existing);
            if (ratio < 1.1) { // Within 10% - likely same note or harmonic
                isDistinct = false;
                break;
            }
        }

        if (isDistinct) {
            pitches.push_back(freq);
        }
    }

    return pitches;
}

double ComplexPitchDetector::detectFundamentalWithTemporalAnalysis(const juce::AudioBuffer<float>& buffer) {
    // Enhanced autocorrelation with noise robustness
    return enhancedAutocorrelation(buffer);
}

double ComplexPitchDetector::enhancedAutocorrelation(const juce::AudioBuffer<float>& buffer) {
    const auto* channelData = buffer.getReadPointer(0);
    int numSamples = buffer.getNumSamples();

    int maxLag = static_cast<int>(sampleRate / minFrequency * 1.5);
    if (maxLag > numSamples / 2) {
        maxLag = numSamples / 2;
    }

    std::vector<double> autocorr(maxLag, 0.0);

    // Calculate autocorrelation
    for (int lag = 0; lag < maxLag; ++lag) {
        double sum = 0.0;
        for (int i = 0; i < numSamples - lag; ++i) {
            sum += static_cast<double>(channelData[i]) * static_cast<double>(channelData[i + lag]);
        }
        autocorr[lag] = sum;
    }

    // Normalize
    double maxValue = autocorr[0];
    if (maxValue <= 0.0) return 0.0;

    for (int i = 1; i < maxLag; ++i) {
        autocorr[i] /= maxValue;
    }

    // Find peaks with harmonic consideration
    int minPeriod = static_cast<int>(sampleRate / maxFrequency);
    if (minPeriod < 1) minPeriod = 1;

    double bestScore = 0.0;
    int bestLag = minPeriod;

    for (int lag = minPeriod; lag < maxLag; ++lag) {
        double score = autocorr[lag];

        // Penalize unlikely fundamental frequencies
        double freq = sampleRate / lag;
        if (freq < minFrequency || freq > maxFrequency) {
            continue;
        }

        // Boost scores for frequencies with strong harmonic support
        for (int harmonic = 2; harmonic <= 6; ++harmonic) {
            int harmonicLag = lag / harmonic;
            if (harmonicLag >= minPeriod && harmonicLag < maxLag) {
                score += autocorr[harmonicLag] * 0.5 / harmonic;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestLag = lag;
        }
    }

    return sampleRate / bestLag;
}

std::vector<std::complex<double>> ComplexPitchDetector::computeFFT(const float* audioData, int size) const {
    std::vector<std::complex<double>> result(size);

    // Simple FFT implementation using the Cooley-Tukey algorithm
    // In production, you'd use JUCE's FFT class or FFTW for better performance
    std::vector<std::complex<double>> temp(size);
    for (int i = 0; i < size; ++i) {
        temp[i] = std::complex<double>(audioData[i], 0.0);
    }

    // Bit-reversal permutation
    int j = 0;
    for (int i = 1; i < size; ++i) {
        int bit = size >> 1;
        while (j & bit) {
            j ^= bit;
            bit >>= 1;
        }
        j ^= bit;
        if (i < j) {
            std::swap(temp[i], temp[j]);
        }
    }

    // Cooley-Tukey FFT
    for (int len = 2; len <= size; len <<= 1) {
        double angle = -2.0 * M_PI / len;
        std::complex<double> wlen(std::cos(angle), std::sin(angle));

        for (int i = 0; i < size; i += len) {
            std::complex<double> w(1.0, 0.0);
            for (int j = 0; j < len / 2; ++j) {
                std::complex<double> u = temp[i + j];
                std::complex<double> v = temp[i + j + len / 2] * w;
                temp[i + j] = u + v;
                temp[i + j + len / 2] = u - v;
                w *= wlen;
            }
        }
    }

    result = temp;
    return result;
}

std::vector<double> ComplexPitchDetector::computePowerSpectrum(const std::vector<std::complex<double>>& fft) const {
    std::vector<double> spectrum(fft.size() / 2 + 1);

    for (size_t i = 0; i < spectrum.size(); ++i) {
        spectrum[i] = std::norm(fft[i]);
    }

    return spectrum;
}

double ComplexPitchDetector::validateFundamentalWithHarmonics(double candidate, const std::vector<double>& spectrum) const {
    double score = 0.0;
    int harmonicCount = 0;

    // Check for harmonic series
    for (int harmonic = 1; harmonic <= 8; ++harmonic) {
        double harmonicFreq = candidate * harmonic;

        if (harmonicFreq > maxFrequency) break;

        int bin = static_cast<int>(harmonicFreq * bufferSize / sampleRate);

        if (bin < static_cast<int>(spectrum.size())) {
            // Expected harmonic amplitude based on instrument type
            double expectedAmplitude = getExpectedHarmonicAmplitude(harmonic, instrumentCategory);
            score += spectrum[bin] * expectedAmplitude;
            harmonicCount++;
        }
    }

    return harmonicCount > 0 ? score / harmonicCount : 0.0;
}

std::vector<double> ComplexPitchDetector::extractHarmonics(double fundamental, const std::vector<double>& spectrum) const {
    std::vector<double> harmonics;

    for (int harmonic = 1; harmonic <= 10; ++harmonic) {
        double harmonicFreq = fundamental * harmonic;

        if (harmonicFreq > maxFrequency) break;

        int bin = static_cast<int>(harmonicFreq * bufferSize / sampleRate);

        if (bin < static_cast<int>(spectrum.size())) {
            harmonics.push_back(spectrum[bin]);
        } else {
            harmonics.push_back(0.0);
        }
    }

    return harmonics;
}

double ComplexPitchDetector::calculateSpectralCentroid(const std::vector<double>& spectrum) const {
    double numerator = 0.0;
    double denominator = 0.0;

    for (size_t i = 0; i < spectrum.size(); ++i) {
        double freq = static_cast<double>(i) * sampleRate / (2.0 * spectrum.size());
        numerator += freq * spectrum[i];
        denominator += spectrum[i];
    }

    return denominator > 0 ? numerator / denominator : 0.0;
}

double ComplexPitchDetector::calculateHarmonicComplexity(const std::vector<double>& harmonics) const {
    int significantHarmonics = 0;
    double totalPower = 0.0;

    for (double harmonic : harmonics) {
        totalPower += harmonic;
        if (harmonic > harmonics[0] * 0.1) { // More than 10% of fundamental
            significantHarmonics++;
        }
    }

    return significantHarmonics > 0 ? static_cast<double>(significantHarmonics) : 0.0;
}

InstrumentCategory ComplexPitchDetector::detectInstrumentCategory(const juce::AudioBuffer<float>& buffer) const {
    // Analyze spectral characteristics to infer instrument type
    auto fft = computeFFT(buffer.getReadPointer(0), bufferSize);
    auto spectrum = computePowerSpectrum(fft);

    double centroid = calculateSpectralCentroid(spectrum);
    auto harmonics = extractHarmonics(220.0, spectrum); // Assume A3 as reference
    double complexity = calculateHarmonicComplexity(harmonics);

    // Simple heuristics for instrument detection
    if (centroid > 3000 && complexity > 6) {
        return InstrumentCategory::Brass; // Bright, harmonically rich
    } else if (centroid < 1500 && complexity > 4) {
        return InstrumentCategory::Piano; // Lower centroid, rich harmonics
    } else if (complexity < 3) {
        return InstrumentCategory::Voice; // Fewer prominent harmonics
    } else if (centroid > 2000 && complexity < 5) {
        return InstrumentCategory::Guitar; // Plucked string characteristics
    } else {
        return InstrumentCategory::Strings; // General string instruments
    }
}

void ComplexPitchDetector::applyInstrumentOptimizations(InstrumentCategory category) {
    switch (category) {
        case InstrumentCategory::Piano:
            // Piano has strong initial attack, rich harmonics
            confidenceThreshold *= 0.8; // Lower threshold for piano
            break;

        case InstrumentCategory::Guitar:
            // Guitar has characteristic decay patterns
            confidenceThreshold *= 0.9;
            break;

        case InstrumentCategory::Voice:
            // Voice has formants, vibrato
            confidenceThreshold *= 0.85;
            break;

        case InstrumentCategory::Brass:
            // Bright harmonics
            confidenceThreshold *= 0.75;
            break;

        default:
            break;
    }
}

double ComplexPitchDetector::getExpectedHarmonicAmplitude(int harmonic, InstrumentCategory category) const {
    // Return expected relative amplitude for each harmonic based on instrument type
    switch (category) {
        case InstrumentCategory::Piano:
            // Piano harmonics decay approximately as 1/n
            return 1.0 / harmonic;

        case InstrumentCategory::Guitar:
            // Guitar has stronger even harmonics
            return harmonic % 2 == 0 ? 1.0 / (harmonic * 0.7) : 1.0 / harmonic;

        case InstrumentCategory::Voice:
            // Voice has formant characteristics
            return harmonic == 1 ? 1.0 : harmonic <= 4 ? 0.5 / harmonic : 0.1 / harmonic;

        case InstrumentCategory::Brass:
            // Brass instruments have bright harmonics
            return harmonic <= 6 ? 0.8 / (harmonic * 0.8) : 0.2 / harmonic;

        default:
            return 1.0 / harmonic; // Default harmonic decay
    }
}

void ComplexPitchDetector::applyNoiseRobustness(juce::HeapBlock<float>& buffer) {
    // Simple high-pass filter to remove DC and very low frequency noise
    static double prevInput = 0.0;
    static double prevOutput = 0.0;

    double cutoff = 30.0; // 30 Hz cutoff
    double rc = 1.0 / (2.0 * M_PI * cutoff);
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

bool ComplexPitchDetector::detectAttackTransient(const juce::HeapBlock<float>& buffer) {
    if (frameCount == 0) return true; // First frame is always an attack

    // Simple attack detection based on energy change
    double currentEnergy = 0.0;
    for (int i = 0; i < bufferSize; ++i) {
        currentEnergy += buffer[i] * buffer[i];
    }
    currentEnergy = std::sqrt(currentEnergy / bufferSize);

    // Compare with previous frame (simplified - in practice you'd maintain a history)
    return currentEnergy > 0.1; // Simple threshold
}

void ComplexPitchDetector::applyTransientHandling(juce::HeapBlock<float>& buffer, bool hasTransient) {
    if (hasTransient) {
        // For transients, use shorter analysis windows or special handling
        // This is a simplified implementation
    }
}

// Utility methods
double ComplexPitchDetector::frequencyToMidiNote(double frequency) const {
    if (frequency <= 0.0) return -1.0;
    return 69.0 + 12.0 * std::log2(frequency / 440.0);
}

juce::String ComplexPitchDetector::midiNoteToPitchName(int midiNote, double cents) const {
    if (midiNote < 0 || midiNote > 127) return "";

    const char* noteNames[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
    int octave = (midiNote / 12) - 1;
    int noteIndex = midiNote % 12;

    juce::String result = noteNames[noteIndex] + juce::String(octave);
    if (std::abs(cents) > 1.0) {
        result += juce::String::formatted(" (%+.1f cents)", cents);
    }
    return result;
}

double ComplexPitchDetector::calculateCentsError(double frequency, int midiNote) const {
    double exactFreq = 440.0 * std::pow(2.0, (midiNote - 69.0) / 12.0);
    return 1200.0 * std::log2(frequency / exactFreq);
}

bool ComplexPitchDetector::validatePitch(double frequency, double confidence) const {
    return frequency >= minFrequency && frequency <= maxFrequency && confidence >= confidenceThreshold;
}

// Configuration methods
void ComplexPitchDetector::setMinFrequency(double minFreq) { minFrequency = minFreq; }
void ComplexPitchDetector::setMaxFrequency(double maxFreq) { maxFrequency = maxFreq; }
void ComplexPitchDetector::setConfidenceThreshold(double threshold) { confidenceThreshold = threshold; }
void ComplexPitchDetector::setMaxPolyphony(int maxVoices) { maxPolyphony = maxVoices; }
void ComplexPitchDetector::setInstrumentCategory(InstrumentCategory category) { instrumentCategory = category; }
void ComplexPitchDetector::enableHarmonicAnalysis(bool enable) { harmonicAnalysisEnabled = enable; }
void ComplexPitchDetector::enablePolyphonicDetection(bool enable) { polyphonicDetectionEnabled = enable; }

ComplexPitchResult ComplexPitchDetector::getLatestResult() const { return latestResult; }

juce::String ComplexPitchDetector::getResultsAsJson() const {
    juce::DynamicObject::Ptr json = new juce::DynamicObject();

    json->setProperty("analysisType", "ComplexPitchDetector");
    json->setProperty("timestamp", juce::Time::getCurrentTime().toISO8601(false));
    json->setProperty("sampleRate", sampleRate);
    json->setProperty("isPolyphonic", latestResult.isPolyphonic);
    json->setProperty("isPitched", latestResult.isPitched);

    if (latestResult.isPitched) {
        json->setProperty("fundamentalFrequency", latestResult.fundamentalFrequency);
        json->setProperty("primaryConfidence", latestResult.primaryConfidence);
        json->setProperty("primaryMidiNote", latestResult.primaryMidiNote);
        json->setProperty("spectralCentroid", latestResult.spectralCentroid);
        json->setProperty("harmonicComplexity", latestResult.harmonicComplexity);

        // Add polyphonic results if available
        if (latestResult.isPolyphonic && !latestResult.frequencies.empty()) {
            juce::Array<juce::var> frequenciesArray;
            for (double freq : latestResult.frequencies) {
                frequenciesArray.add(freq);
            }
            json->setProperty("frequencies", frequenciesArray);

            juce::Array<juce::var> confidencesArray;
            for (double conf : latestResult.confidences) {
                confidencesArray.add(conf);
            }
            json->setProperty("confidences", confidencesArray);
        }
    }

    return juce::JSON::toString(juce::var(json.get()), true);
}

bool ComplexPitchDetector::isReady() const { return initialized; }

void ComplexPitchDetector::reset() {
    latestResult = ComplexPitchResult{};
    frameCount = 0;
    std::fill(spectralHistory.begin(), spectralHistory.end(), 0.0);
}

void ComplexPitchDetector::setupHarmonicTemplates() {
    // Pre-calculate instrument-specific harmonic profiles
    // This would be expanded in a production implementation
    harmonicTemplates.resize(8); // One for each instrument category
}