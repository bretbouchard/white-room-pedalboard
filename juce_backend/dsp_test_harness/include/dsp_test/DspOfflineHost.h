/*
  ==============================================================================

    DspOfflineHost.h
    Created: January 13, 2026
    Author:  Bret Bouchard

    Offline rendering test harness for InstrumentDSP implementations.
    Provides deterministic, headless audio rendering with comprehensive metrics.

    Features:
    - No audio device required
    - Deterministic output (same inputs = same outputs)
    - Comprehensive metrics (RMS, peak, DC offset, FFT, etc.)
    - Golden file comparison for regression testing
    - CI/CD friendly

  ==============================================================================
*/

#pragma once

#include <vector>
#include <iostream>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <algorithm>
#include <memory>
#include <string>

// Include the InstrumentDSP base interface
#include "../../../include/dsp/InstrumentDSP.h"

namespace DspTest {

//==============================================================================
// Configuration Structures
//==============================================================================

/**
 * @brief Rendering configuration for offline test
 */
struct RenderConfig
{
    double durationSec = 2.0;       // Duration to render (seconds)
    int sampleRate = 48000;          // Sample rate in Hz
    int blockSize = 512;             // Block size for process() calls
    int channels = 2;                // Number of output channels
    uint32_t seed = 12345;           // Random seed for determinism
};

/**
 * @brief Input signal source type
 */
enum class InputSource
{
    Silence,    // All zeros (tests for DC offset, denormals)
    Impulse,    // Single sample at t=0 (tests for impulse response)
    Sine,       // Continuous sine wave (tests for sustained output)
    Noise,      // White noise (tests for frequency response)
    DC          // Constant 1.0 (tests for DC blocking)
};

/**
 * @brief Input signal configuration
 */
struct InputConfig
{
    InputSource source = InputSource::Silence;
    double sineHz = 220.0;           // Sine wave frequency
    float amplitude = 0.2f;          // Signal amplitude
    double impulseAtSec = 0.0;       // Impulse timing
    uint32_t seed = 12345;           // Noise PRNG seed
};

/**
 * @brief Audio metrics computed from rendered output
 */
struct Metrics
{
    // Basic statistics
    double rms = 0.0;                // Root mean square level
    double peak = 0.0;               // Peak amplitude
    double dcOffset = 0.0;           // DC bias

    // Error detection
    int nanCount = 0;                // Number of NaN samples
    int infCount = 0;                // Number of infinite samples
    int clippedSamples = 0;          // Number of samples at clipping

    // Time-domain analysis
    double zcrPerSec = 0.0;          // Zero-crossing rate (channel 0)
    double blockEdgeMaxJump = 0.0;   // Max discontinuity at block boundaries

    // Frequency-domain analysis
    double fftPeakHz = 0.0;          // Frequency of FFT peak
    double fftPeakDb = -150.0;       // Level of FFT peak (dB)

    // Energy tracking
    double energy = 0.0;             // Total signal energy
    double signalToNoiseDb = 0.0;    // SNR (if reference available)
};

//==============================================================================
// InstrumentDSP Adapter
//==============================================================================

/**
 * @brief Adapts InstrumentDSP to test-friendly interface
 *
 * Wraps existing InstrumentDSP implementations for offline testing.
 * Provides deterministic rendering with event scheduling and metrics.
 */
class InstrumentAdapter
{
public:
    InstrumentAdapter(DSP::InstrumentDSP* dsp);
    ~InstrumentAdapter() = default;

    // Lifecycle
    void prepare(double sampleRate, int blockSize, int channels);
    void reset();

    // Parameter control
    void setParam(const char* name, double value);
    void noteOn(int note, float vel);
    void noteOff(int note);
    void panic();

    // Audio processing
    void processBlock(float** audio, int channels, int numSamples);

    // Info
    const char* getName() const;
    const char* getVersion() const;
    int getActiveVoices() const;

private:
    DSP::InstrumentDSP* dsp_;
    double sampleRate_ = 48000.0;
    int blockSize_ = 512;
    int channels_ = 2;

    // Buffer management (non-interleaved)
    std::vector<std::vector<float>> buffers_;
    std::vector<float*> bufferPtrs_;
};

//==============================================================================
// Effect DSP Adapter (for Stereo Effects)
//==============================================================================

/**
 * @brief Adapts stereo effect DSP to test-friendly interface
 *
 * Wraps stereo effect processors (like phasers, chorus, etc.) for offline testing.
 * Effects process stereo input and produce stereo output without MIDI/note events.
 */
class EffectAdapter
{
public:
    /**
     * @brief Interface for stereo effect DSP
     */
    struct EffectInterface
    {
        virtual ~EffectInterface() = default;
        virtual void prepare(double sampleRate, int blockSize) = 0;
        virtual void reset() = 0;
        virtual void processStereo(float* left, float* right, int numSamples) = 0;
        virtual const char* getName() const = 0;
        virtual const char* getVersion() const = 0;

        // Parameter control (optional override)
        virtual void setParam(const char* name, double value)
        {
            // Default: no-op for effects that don't support parameter control
            (void)name; (void)value;
        }
    };

    /**
     * @brief Wrapper for BiPhaseDSP effect
     */
    template<typename EffectType>
    class BiPhaseWrapper : public EffectInterface
    {
    public:
        BiPhaseWrapper() = default;

        void prepare(double sampleRate, int blockSize) override
        {
            effect_.prepare(sampleRate, blockSize);
        }

        void reset() override
        {
            effect_.reset();
        }

        void processStereo(float* left, float* right, int numSamples) override
        {
            effect_.processStereo(left, right, numSamples);
        }

        const char* getName() const override
        {
            return "Mu-Tron Bi-Phase";
        }

        const char* getVersion() const override
        {
            return "1.0.0";
        }

        // Access to underlying effect for parameter control
        EffectType& getEffect() { return effect_; }
        const EffectType& getEffect() const { return effect_; }

    private:
        EffectType effect_;
    };

    EffectAdapter(std::unique_ptr<EffectInterface> effect)
        : effect_(std::move(effect))
    {
    }

    ~EffectAdapter() = default;

    // Lifecycle
    void prepare(double sampleRate, int blockSize, int channels)
    {
        if (channels != 2)
        {
            std::cerr << "Warning: Effects require stereo (2 channels), got " << channels << "\n";
        }
        effect_->prepare(sampleRate, blockSize);
        sampleRate_ = sampleRate;
        blockSize_ = blockSize;
        channels_ = channels;
    }

    void reset()
    {
        effect_->reset();
    }

    // Parameter control - forwards to effect
    void setParam(const char* name, double value)
    {
        effect_->setParam(name, value);
    }

    // Note events (no-op for effects)
    void noteOn(int note, float vel) { /* Effects don't use MIDI */ }
    void noteOff(int note) { /* Effects don't use MIDI */ }
    void panic() { /* Effects don't have voices */ }

    // Audio processing
    void processBlock(float** audio, int channels, int numSamples)
    {
        if (channels != 2)
        {
            std::cerr << "Error: Effects require stereo input\n";
            return;
        }

        // Process stereo through effect
        effect_->processStereo(audio[0], audio[1], numSamples);
    }

    // Info
    const char* getName() const { return effect_->getName(); }
    const char* getVersion() const { return effect_->getVersion(); }
    int getActiveVoices() const { return 0; } // Effects don't have voices

private:
    std::unique_ptr<EffectInterface> effect_;
    double sampleRate_ = 48000.0;
    int blockSize_ = 512;
    int channels_ = 2;
};

//==============================================================================
// Offline Renderer
//==============================================================================

/**
 * @brief Offline rendering result
 */
struct RenderResult
{
    std::vector<float> interleaved;  // Interleaved audio output
    int frames = 0;                  // Number of frames
    int channels = 0;                // Number of channels
    int sampleRate = 0;              // Sample rate
    Metrics metrics;                 // Computed metrics
    bool success = true;             // Render success flag
    std::string errorMessage;        // Error message if failed
};

/**
 * @brief Event for test sequencing
 */
struct TestEvent
{
    double timeSec;                  // Event time (seconds)
    enum Type { NoteOn, NoteOff, ParamSet, Gate } type;
    union {
        struct { int note; float vel; } noteOn;
        struct { int note; } noteOff;
        struct { const char* name; double value; } param;
        struct { bool on; } gate;
    };
};

/**
 * @brief Offline rendering host
 *
 * Renders DSP offline with comprehensive metrics collection.
 * Supports input generation, event scheduling, and automatic analysis.
 */
class DspOfflineHost
{
public:
    /**
     * @brief Render audio from DSP with input and events (InstrumentAdapter)
     *
     * @param adapter        DSP to render
     * @param renderConfig   Rendering parameters
     * @param inputConfig    Input signal configuration
     * @param events         Timed events (empty for basic tests)
     * @return RenderResult  Rendered audio + metrics
     */
    static RenderResult render(
        InstrumentAdapter& adapter,
        const RenderConfig& renderConfig,
        const InputConfig& inputConfig,
        const std::vector<TestEvent>& events = {}
    );

    /**
     * @brief Render audio from stereo effect DSP with input (EffectAdapter)
     *
     * @param adapter        Effect DSP to render
     * @param renderConfig   Rendering parameters
     * @param inputConfig    Input signal configuration
     * @param events         Timed parameter events (optional)
     * @return RenderResult  Rendered audio + metrics
     */
    static RenderResult render(
        EffectAdapter& adapter,
        const RenderConfig& renderConfig,
        const InputConfig& inputConfig,
        const std::vector<TestEvent>& events = {}
    );

    /**
     * @brief Compute metrics from audio buffer
     */
    static Metrics computeMetrics(
        const float* audio,
        int frames,
        int channels,
        int sampleRate
    );

    /**
     * @brief Write WAV file
     */
    static bool writeWav(
        const char* path,
        const float* interleaved,
        int frames,
        int channels,
        int sampleRate
    );

private:
    // PRNG for deterministic noise generation
    static uint32_t xorshift32(uint32_t& state);
    static float randFloat(uint32_t& state);

    // Helper for metric computation
    static double computeFftPeak(
        const float* audio,
        int frames,
        int sampleRate,
        double& outFreqHz,
        double& outLevelDb
    );
};

//==============================================================================
// Golden File Comparison
//==============================================================================

/**
 * @brief Comparison result between candidate and golden reference
 */
struct ComparisonResult
{
    bool pass = false;               // Overall pass/fail
    double maxAbsDiff = 0.0;         // Maximum absolute difference
    double rmsDiff = 0.0;            // RMS difference
    double snrDb = 0.0;              // Signal-to-noise ratio
    int lagSamples = 0;              // Detected alignment offset
    std::string details;             // Detailed breakdown
};

/**
 * @brief Compare rendered audio to golden reference
 */
class GoldenComparator
{
public:
    /**
     * @brief Compare candidate to golden with alignment
     *
     * @param candidate    Candidate audio (interleaved)
     * @param golden       Golden reference (interleaved)
     * @param frames       Number of frames (must match)
     * @param channels     Number of channels
     * @param maxLag       Maximum alignment offset (samples)
     * @param maxAbsTol    Maximum absolute difference tolerance
     * @param rmsTol       RMS difference tolerance
     * @param snrMin       Minimum SNR (dB)
     * @return ComparisonResult
     */
    static ComparisonResult compare(
        const float* candidate,
        const float* golden,
        int frames,
        int channels,
        int maxLag = 2048,
        double maxAbsTol = 1e-3,
        double rmsTol = 1e-4,
        double snrMin = 50.0
    );

private:
    // Cross-correlation for alignment
    static int findLag(
        const float* a,
        const float* b,
        int frames,
        int maxLag
    );
};

//==============================================================================
// Test Case Definitions
//==============================================================================

/**
 * @brief Predefined test cases
 */
namespace TestCases {
    // Silence test - catch DC offset, denormals
    inline RenderConfig silenceConfig()
    {
        RenderConfig cfg;
        cfg.durationSec = 2.0;
        cfg.sampleRate = 48000;
        cfg.blockSize = 512;
        return cfg;
    }

    inline InputConfig silenceInput()
    {
        InputConfig cfg;
        cfg.source = InputSource::Silence;
        return cfg;
    }

    // Impulse test - check impulse response
    inline RenderConfig impulseConfig()
    {
        RenderConfig cfg;
        cfg.durationSec = 2.0;
        cfg.sampleRate = 48000;
        cfg.blockSize = 512;
        return cfg;
    }

    inline InputConfig impulseInput()
    {
        InputConfig cfg;
        cfg.source = InputSource::Impulse;
        cfg.amplitude = 0.5f;
        cfg.impulseAtSec = 0.001;  // 1ms in
        return cfg;
    }

    // Constant tone test - verify sustained output
    inline RenderConfig toneConfig()
    {
        RenderConfig cfg;
        cfg.durationSec = 2.0;
        cfg.sampleRate = 48000;
        cfg.blockSize = 512;
        return cfg;
    }

    inline InputConfig toneInput(double freqHz = 220.0)
    {
        InputConfig cfg;
        cfg.source = InputSource::Sine;
        cfg.sineHz = freqHz;
        cfg.amplitude = 0.2f;
        return cfg;
    }

    // Envelope test - gate on/off
    inline std::pair<RenderConfig, InputConfig> envelopeTest()
    {
        auto cfg = toneConfig();
        cfg.durationSec = 3.0;
        InputConfig input = toneInput(440.0);

        // Add gate events: on at 0.5s, off at 1.5s
        return {cfg, input};
    }
}

} // namespace DspTest
