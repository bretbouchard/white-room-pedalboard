#pragma once
#include <utility>
#include <vector>
#include <complex>
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>

/**
 * Enhanced Pitch Detection for Complex Musical Notes
 *
 * This advanced pitch detector handles real musical instruments including:
 * - Harmonic-rich content (piano, guitar, brass, strings)
 * - Polyphonic detection (multiple simultaneous pitches)
 * - Spectral analysis for fundamental frequency extraction
 * - Instrument-specific optimization
 * - Attack/transient handling
 * - Noise and imperfection robustness
 */
struct ComplexPitchResult {
    std::vector<double> frequencies;      // Detected fundamental frequencies (Hz)
    std::vector<double> confidences;     // Confidence scores (0.0-1.0)
    std::vector<int> midiNotes;          // MIDI note numbers
    std::vector<double> centsErrors;     // Deviation from nearest MIDI notes
    std::vector<juce::String> pitchNames; // Musical note names
    std::vector<double> harmonicStrengths; // Harmonic content strength
    double fundamentalFrequency = 0.0;   // Primary fundamental frequency
    double primaryConfidence = 0.0;      // Primary confidence
    int primaryMidiNote = -1;            // Primary MIDI note
    bool isPolyphonic = false;           // Whether multiple pitches detected
    double spectralCentroid = 0.0;       // Timbre brightness measure
    double harmonicComplexity = 0.0;     // Number of significant harmonics
    juce::String instrumentType = "unknown"; // Detected instrument type
    bool isPitched = false;              // Whether any clear pitch was detected
};

enum class InstrumentCategory {
    Piano,          // Strong attack, rich harmonics
    Guitar,         // Plucked string, decaying harmonics
    Voice,          // Vocal formants, vibrato
    Brass,          // Bright, strong harmonics
    Strings,        // Bowed, sustained harmonics
    Percussion,     // Noise-based, pitch drums
    Synthesizer,    // Variable harmonics
    Unknown
};

class ComplexPitchDetector {
public:
    ComplexPitchDetector();
    ~ComplexPitchDetector() = default;

    // Core functionality
    bool initialize(double sampleRate, int bufferSize);
    void processBlock(juce::AudioBuffer<float>& buffer);
    ComplexPitchResult getLatestResult() const;
    juce::String getResultsAsJson() const;
    bool isReady() const;
    void reset();

    // Configuration
    void setMinFrequency(double minFreq);
    void setMaxFrequency(double maxFreq);
    void setConfidenceThreshold(double threshold);
    void setMaxPolyphony(int maxVoices);
    void setInstrumentCategory(InstrumentCategory category);
    void enableHarmonicAnalysis(bool enable);
    void enablePolyphonicDetection(bool enable);

    // Advanced features
    InstrumentCategory detectInstrumentCategory(const juce::AudioBuffer<float>& buffer) const;
    std::vector<double> extractHarmonics(double fundamental, const std::vector<double>& spectrum) const;
    double calculateSpectralCentroid(const std::vector<double>& spectrum) const;
    double calculateHarmonicComplexity(const std::vector<double>& harmonics) const;

private:
    // Core detection methods
    ComplexPitchResult detectComplexPitch(const juce::AudioBuffer<float>& buffer);
    std::vector<double> detectPolyphonicPitches(const juce::AudioBuffer<float>& buffer);
    double detectFundamentalWithSpectralAnalysis(const juce::AudioBuffer<float>& buffer);
    double detectFundamentalWithTemporalAnalysis(const juce::AudioBuffer<float>& buffer);

    // Spectral analysis
    std::vector<std::complex<double>> computeFFT(const float* audioData, int size) const;
    std::vector<double> computePowerSpectrum(const std::vector<std::complex<double>>& fft) const;
    std::vector<double> computeCepstrum(const std::vector<double>& powerSpectrum) const;

    // Harmonic analysis
    std::vector<double> extractFundamentalCandidates(const std::vector<double>& spectrum) const;
    double validateFundamentalWithHarmonics(double candidate, const std::vector<double>& spectrum) const;
    double getExpectedHarmonicAmplitude(int harmonic, InstrumentCategory category) const;
    std::vector<double> extractFormants(const std::vector<double>& spectrum) const;

    // Time-domain methods (enhanced from original)
    double enhancedAutocorrelation(const juce::AudioBuffer<float>& buffer);
    double multiResolutionAnalysis(const juce::AudioBuffer<float>& buffer);
    double yinAlgorithm(const juce::AudioBuffer<float>& buffer);

    // Instrument-specific processing
    void applyInstrumentOptimizations(InstrumentCategory category);
    std::vector<double> getPianoHarmonicProfile(double fundamental) const;
    std::vector<double> getGuitarHarmonicProfile(double fundamental) const;
    std::vector<double> getVocalHarmonicProfile(double fundamental) const;

    // Noise and transient handling
    void applyNoiseRobustness(juce::HeapBlock<float>& buffer);
    bool detectAttackTransient(const juce::HeapBlock<float>& buffer);
    void applyTransientHandling(juce::HeapBlock<float>& buffer, bool hasTransient);
    void setupHarmonicTemplates();

    // Utility methods
    double frequencyToMidiNote(double frequency) const;
    juce::String midiNoteToPitchName(int midiNote, double cents = 0.0) const;
    double calculateCentsError(double frequency, int midiNote) const;
    bool validatePitch(double frequency, double confidence) const;

    // Configuration parameters
    double sampleRate = 44100.0;
    int bufferSize = 4096;
    double minFrequency = 80.0;
    double maxFrequency = 4000.0;
    double confidenceThreshold = 0.3;
    int maxPolyphony = 4;
    InstrumentCategory instrumentCategory = InstrumentCategory::Unknown;
    bool harmonicAnalysisEnabled = true;
    bool polyphonicDetectionEnabled = true;

    // Processing state
    bool initialized = false;
    ComplexPitchResult latestResult;

    // FFT buffers
    std::vector<std::complex<double>> fftBuffer;
    std::vector<double> powerSpectrum;
    std::vector<double> windowBuffer;
    juce::HeapBlock<float> monoBuffer;

    // Advanced features
    std::vector<std::vector<double>> harmonicTemplates; // Instrument-specific harmonic profiles
    std::vector<double> spectralHistory; // For temporal consistency
    int frameCount = 0;
};