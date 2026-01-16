#include "../include/audio/CoreDSPAnalyzer.h"
#include <juce_dsp/juce_dsp.h>

CoreDSPAnalyzer::CoreDSPAnalyzer() {
    // Initialize window function (Hann window for good frequency resolution)
    generateWindowFunction();
}

CoreDSPAnalyzer::~CoreDSPAnalyzer() = default;

bool CoreDSPAnalyzer::initialize(double sampleRate, int bufferSize) {
    this->sampleRate = sampleRate;
    this->bufferSize = bufferSize;

    // Validate buffer size is power of 2 for FFT
    if (!juce::isPowerOfTwo(bufferSize)) {
        return false;
    }

    // Initialize FFT
    fftOrder = juce::roundToInt(std::log2(bufferSize));
    fft = std::make_unique<juce::dsp::FFT>(fftOrder);

    // Prepare working buffers
    fftData.resize(bufferSize * 2, 0.0f);
    magnitudeSpectrum.resize(bufferSize / 2 + 1, 0.0f);
    windowFunction.resize(bufferSize, 0.0f);

    // Generate Hann window
    for (int i = 0; i < bufferSize; ++i) {
        windowFunction[i] = 0.5f * (1.0f - std::cos(2.0f * juce::MathConstants<float>::pi * i / (bufferSize - 1)));
    }

    // Initialize frequency bins
    frequencyBins.resize(bufferSize / 2 + 1);
    for (int i = 0; i <= bufferSize / 2; ++i) {
        frequencyBins[i] = i * sampleRate / bufferSize;
    }

    initialized = true;
    return true;
}

void CoreDSPAnalyzer::processBlock(juce::AudioBuffer<float>& buffer) {
    if (!initialized || buffer.getNumSamples() == 0) {
        return;
    }

    // Convert to mono by averaging all channels
    int numChannels = buffer.getNumChannels();
    int numSamples = std::min(buffer.getNumSamples(), bufferSize);

    // Clear FFT data
    std::fill(fftData.begin(), fftData.end(), 0.0f);

    // Mix channels and apply window
    for (int sample = 0; sample < numSamples; ++sample) {
        float monoSample = 0.0f;
        for (int channel = 0; channel < numChannels; ++channel) {
            monoSample += buffer.getSample(channel, sample);
        }
        monoSample /= numChannels; // Average channels
        fftData[sample] = monoSample * windowFunction[sample];
    }

    // Zero-pad if necessary
    for (int i = numSamples; i < bufferSize; ++i) {
        fftData[i] = 0.0f;
    }

    // Perform FFT
    fft->performRealOnlyForwardTransform(fftData.data());

    // Calculate magnitude spectrum
    for (int i = 0; i <= bufferSize / 2; ++i) {
        float real = fftData[i];
        float imag = (i == 0 || i == bufferSize / 2) ? 0.0f : fftData[bufferSize - i];
        magnitudeSpectrum[i] = std::sqrt(real * real + imag * imag);
    }

    // Calculate spectral descriptors
    calculateSpectralDescriptors();
}

void CoreDSPAnalyzer::calculateSpectralDescriptors() {
    float weightedSum = 0.0f;
    float magnitudeSum = 0.0f;
    float fluxSum = 0.0f;
    float flatnessProduct = 1.0f;
    float rolloffSum = 0.0f;

    const float nyquist = sampleRate / 2.0f;
    const float rolloffThreshold = 0.85f; // 85% of spectral energy below this frequency

    for (int i = 0; i < magnitudeSpectrum.size(); ++i) {
        float frequency = frequencyBins[i];
        float magnitude = magnitudeSpectrum[i];

        // Spectral centroid
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;

        // Spectral flux (change from previous frame)
        if (!previousMagnitudeSpectrum.empty() && i < previousMagnitudeSpectrum.size()) {
            float diff = magnitude - previousMagnitudeSpectrum[i];
            fluxSum += diff * diff;
        }

        // Spectral flatness (for geometric mean calculation)
        if (magnitude > 0.0f) {
            flatnessProduct *= magnitude;
        }

        // Spectral rolloff
        rolloffSum += magnitude;
    }

    // Calculate final descriptors
    lastResults.spectralCentroid = (magnitudeSum > 0.0f) ? (weightedSum / magnitudeSum) : 0.0f;
    lastResults.spectralFlux = fluxSum;

    // Spectral flatness (geometric mean / arithmetic mean)
    if (magnitudeSum > 0.0f && flatnessProduct > 0.0f) {
        float geometricMean = std::pow(flatnessProduct, 1.0f / magnitudeSpectrum.size());
        float arithmeticMean = magnitudeSum / magnitudeSpectrum.size();
        lastResults.spectralFlatness = geometricMean / arithmeticMean;
    } else {
        lastResults.spectralFlatness = 0.0f;
    }

    // Spectral rolloff (frequency below which 85% of energy is contained)
    float cumulativeEnergy = 0.0f;
    lastResults.spectralRolloff = 0.0f;
    for (int i = 0; i < magnitudeSpectrum.size(); ++i) {
        cumulativeEnergy += magnitudeSpectrum[i] * magnitudeSpectrum[i];
        if (cumulativeEnergy >= rolloffThreshold * rolloffSum && lastResults.spectralRolloff == 0.0f) {
            lastResults.spectralRolloff = frequencyBins[i];
        }
    }

    // Frequency band energies
    lastResults.bandEnergies.resize(10); // 10 frequency bands
    int samplesPerBand = magnitudeSpectrum.size() / 10;

    for (int band = 0; band < 10; ++band) {
        float bandEnergy = 0.0f;
        int startSample = band * samplesPerBand;
        int endSample = std::min((band + 1) * samplesPerBand, (int)magnitudeSpectrum.size());

        for (int i = startSample; i < endSample; ++i) {
            bandEnergy += magnitudeSpectrum[i] * magnitudeSpectrum[i];
        }

        lastResults.bandEnergies[band] = std::sqrt(bandEnergy);
    }

    // Store current magnitude spectrum for next flux calculation
    previousMagnitudeSpectrum = magnitudeSpectrum;
}

juce::String CoreDSPAnalyzer::getResultsAsJson() const {
    juce::DynamicObject::Ptr json = new juce::DynamicObject();

    json->setProperty("type", "core_analysis");
    json->setProperty("timestamp", juce::Time::getCurrentTime().toISO8601(true));

    // Add spectral descriptors
    juce::DynamicObject::Ptr spectralData = new juce::DynamicObject();
    spectralData->setProperty("spectralCentroid", lastResults.spectralCentroid);
    spectralData->setProperty("spectralFlux", lastResults.spectralFlux);
    spectralData->setProperty("spectralFlatness", lastResults.spectralFlatness);
    spectralData->setProperty("spectralRolloff", lastResults.spectralRolloff);

    // Add frequency band energies
    juce::Array<juce::var> bandEnergies;
    for (float energy : lastResults.bandEnergies) {
        bandEnergies.add(energy);
    }
    spectralData->setProperty("bandEnergies", bandEnergies);

    json->setProperty("spectralData", spectralData.get());

    return juce::JSON::toString(json);
}

bool CoreDSPAnalyzer::isReady() const {
    return initialized;
}

void CoreDSPAnalyzer::reset() {
    if (initialized) {
        std::fill(fftData.begin(), fftData.end(), 0.0f);
        std::fill(magnitudeSpectrum.begin(), magnitudeSpectrum.end(), 0.0f);
        previousMagnitudeSpectrum.clear();
        lastResults = SpectralResults{};
    }
}

juce::String CoreDSPAnalyzer::getAnalysisType() const {
    return "core_dsp_analysis";
}

void CoreDSPAnalyzer::generateWindowFunction() {
    // Window function is generated in initialize() based on buffer size
}