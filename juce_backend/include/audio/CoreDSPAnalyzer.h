#pragma once
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <vector>
#include <memory>
#include "BaseAnalyzer.h"

/**
 * Core DSP Analysis component for real-time spectral analysis
 * Provides FFT-based spectral analysis with comprehensive descriptors
 * Optimized for real-time audio processing applications
 */
class CoreDSPAnalyzer : public BaseAnalyzer {
public:
    CoreDSPAnalyzer();
    ~CoreDSPAnalyzer() override;

    // BaseAnalyzer interface implementation
    bool initialize(double sampleRate, int bufferSize) override;
    void processBlock(juce::AudioBuffer<float>& buffer) override;
    juce::String getResultsAsJson() const override;
    bool isReady() const override;
    void reset() override;
    juce::String getAnalysisType() const override;

private:
    // Spectral analysis results structure
    struct SpectralResults {
        float spectralCentroid = 0.0f;
        float spectralFlux = 0.0f;
        float spectralFlatness = 0.0f;
        float spectralRolloff = 0.0f;
        std::vector<float> bandEnergies;
    };

    // Core processing methods
    void calculateSpectralDescriptors();
    void generateWindowFunction();

    // JUCE DSP components
    std::unique_ptr<juce::dsp::FFT> fft;

    // Processing buffers and state
    double sampleRate = 44100.0;
    int bufferSize = 512;
    int fftOrder = 10; // For 512 samples
    bool initialized = false;

    std::vector<float> fftData;
    std::vector<float> magnitudeSpectrum;
    std::vector<float> windowFunction;
    std::vector<float> frequencyBins;
    std::vector<float> previousMagnitudeSpectrum;

    // Latest analysis results
    SpectralResults lastResults;
};