#pragma once

#include <JuceHeader.h>
#include "FilterGate.h"

namespace schill {
namespace dynamics {

//==============================================================================
// Dynamics Processor Types
//==============================================================================

enum class DynamicsProcessorType {
    Compressor,
    Limiter,
    Gate,
    Expander,
    DeEsser,
    MultibandCompressor,
    TransientShaper,
    CharacterProcessor
};

enum class CompressorMode {
    Peak,
    RMS,
    TruePeak,
    LUFS,
    RMS_VU,
    Custom
};

enum class LimiterType {
    Brickwall,
    SoftClip,
    Loudness,
    TruePeak,
    K14,
    Custom
};

//==============================================================================
// Advanced Compressor Configuration
//==============================================================================

struct CompressorConfig {
    // Basic parameters
    float threshold = -20.0f;         // dB
    float ratio = 4.0f;                // 1:1 to ∞:1
    float attackTime = 2.0f;           // ms
    float releaseTime = 100.0f;         // ms
    float makeupGain = 0.0f;            // dB

    // Advanced parameters
    float kneeWidth = 2.0f;             // dB for soft knee
    float range = 60.0f;                // Maximum gain reduction
    CompressorMode mode = CompressorMode::RMS;
    bool autoMakeup = true;              // Automatic makeup gain
    bool autoRelease = false;            // Auto release based on input
    bool lookaheadEnabled = true;        // Lookahead processing
    float lookaheadTime = 2.0f;          // ms

    // Stereo linking
    bool stereoLink = true;              // Link stereo channels
    float stereoLinkRatio = 1.0f;        // 0-1, how much linking

    // Sidechain options
    bool externalSidechain = false;
    float sidechainFrequency = 1000.0f;  // Hz for frequency-dependent sidechain
    float sidechainQ = 1.0f;             // Q factor for sidechain filter
    bool sidechainListen = false;         // Monitor sidechain input

    // Character options
    float warmth = 0.0f;                 // 0-1, adds analog saturation
    float tubeDrive = 0.0f;              // 0-1, tube saturation
    float colorAmount = 0.0f;            // 0-1, frequency-dependent saturation

    // Detection
    float attackShape = 0.5f;            // 0-1, attack curve shape
    float releaseShape = 0.5f;           // 0-1, release curve shape
    bool adaptiveRelease = false;        // Adaptive release based on program material

    // UI feedback
    bool showGainReduction = true;
    bool showInputLevel = true;
    bool showOutputLevel = true;
    bool showGRMeter = true;

    // Advanced features
    bool parallelProcessing = false;    // Mix wet/dry signals
    float mixAmount = 0.0f;             // 0-1, wet/dry mix
    bool midSideProcessing = false;      // Mid/Side processing
    float midSideAmount = 0.0f;         // 0-1, amount of M/S processing

    // Automation
    bool automationEnabled = true;
    float automationSmoothTime = 50.0f;  // ms
};

//==============================================================================
// Limiter Configuration
//==============================================================================

struct LimiterConfig {
    // Basic parameters
    float ceiling = -0.1f;              // dBFS
    float releaseTime = 10.0f;           // ms
    LimiterType type = LimiterType::Brickwall;

    // Advanced parameters
    float threshold = 0.0f;             // dB (below ceiling)
    float kneeWidth = 1.0f;             // dB for soft limiting
    float lookaheadTime = 0.5f;          // ms
    bool overshootProtection = true;     // Prevent overshoots

    // True peak limiting
    bool truePeakMode = false;           // ITU-1770 compliant true peak
    float oversamplingFactor = 4.0f;     // For accurate true peak detection
    float interChannelCrest = 0.5f;      // Allow inter-sample peaks

    // Loudness limiting (K-system)
    bool kSystemMode = false;             // K-14 loudness normalization
    float targetLUFS = -14.0f;           // Target loudness
    float allowedOvershoot = 0.5f;       // Allowed overshoot in LU

    // Character options
    float saturationAmount = 0.0f;       // 0-1, saturation before limiting
    LimiterType clipType = LimiterType::SoftClip; // Pre-limiting saturation
    float clipThreshold = -0.5f;         // dB, saturation threshold

    // Stereo/Mono
    bool monoMode = false;                // Convert to mono before limiting
    bool midSideMode = false;             // Mid/Side limiting
    float sideLimitingAmount = 0.0f;     // Amount of side limiting

    // UI and monitoring
    bool showPeakLevels = true;
    bool showLoudness = false;
    bool showTruePeak = true;
    bool showLimitingCurve = false;

    // Adaptive features
    bool adaptiveRelease = false;        // Adaptive release based on content
    float adaptiveRatio = 2.0f;          // Ratio for adaptive release
};

//==============================================================================
// Envelope Follower for Sidechain Detection
//==============================================================================

class EnvelopeFollower {
public:
    enum class DetectionMode {
        Peak,
        RMS,
        TruePeak,
        LUFS,
        Custom
    };

    struct EnvelopeConfig {
        DetectionMode mode = DetectionMode::RMS;
        float attackTime = 5.0f;          // ms
        float releaseTime = 50.0f;         // ms
        float smoothingTime = 10.0f;      // ms
        float holdTime = 0.0f;            // ms
        float preGain = 0.0f;             // dB
        float postGain = 0.0f;            // dB
        bool logDetection = false;         // Logarithmic detection
    };

    EnvelopeFollower();
    ~EnvelopeFollower() = default;

    void configure(const EnvelopeConfig& config);
    void reset();
    void prepareToPlay(double sampleRate, int samplesPerBlock);

    float processSample(float input) noexcept;
    void processBlock(const float* input, float* output, int numSamples) noexcept;
    void processStereo(const float* leftInput, const float* rightInput,
                       float* leftOutput, float* rightOutput,
                       int numSamples) noexcept;

    void setAttackTime(float attackMs);
    void setReleaseTime(float releaseMs);
    void setHoldTime(float holdMs);
    void setPreGain(float gainDb) { preGain = juce::Decibels::decibelsToGain(gainDb); }
    void setPostGain(float gainDb) { postGain = juce::Decibels::decibelsToGain(gainDb); }

    float getCurrentValue() const noexcept { return currentEnvelope; }
    float getPeakValue() const noexcept { return currentPeak; }
    float getRMSValue() const noexcept { return currentRMS; }
    bool isHolding() const noexcept { return holdTimer > 0.0; }

private:
    EnvelopeConfig config;
    double sampleRate = 44100.0;

    float currentEnvelope = 0.0f;
    float targetEnvelope = 0.0f;
    float currentPeak = 0.0f;
    float currentRMS = 0.0f;

    float attackRate = 0.001f;
    float releaseRate = 0.01f;
    float holdTimer = 0.0f;
    float smoothingFactor = 0.1f;

    float preGain = 1.0f;
    float postGain = 1.0f;

    juce::LinearSmoothedValue<float> smoothedEnvelope;
    std::queue<float> historyBuffer;
    static constexpr int historySize = 1024;

    void updateRates();
    void updatePeakAndRMS(const float* samples, int numSamples);
    float detectLevel(const float* samples, int numSamples);
};

//==============================================================================
// Main Dynamics Processor Class
//==============================================================================

class DynamicsProcessor {
public:
    DynamicsProcessor();
    ~DynamicsProcessor();

    // Initialization
    bool initialize(DynamicsProcessorType type);
    void reset();
    void prepareToPlay(double sampleRate, int samplesPerBlock);

    // Main processing
    void processBlock(juce::AudioBuffer<float>& buffer);
    void processStereo(juce::AudioBuffer<float>& buffer);
    void processMono(juce::AudioBuffer<float>& buffer);

    // Type-specific initialization
    bool initializeCompressor(const CompressorConfig& config);
    bool initializeLimiter(const LimiterConfig& config);
    bool initializeGate(const CompressorConfig& config);
    bool initializeExpander(const CompressorConfig& config);
    bool initializeDeEsser(const CompressorConfig& config);

    // Configuration
    void setCompressorConfig(const CompressorConfig& config);
    void setLimiterConfig(const LimiterConfig& config);
    CompressorConfig getCompressorConfig() const { return compressorConfig; }
    LimiterConfig getLimiterConfig() const { return limiterConfig; }

    // Real-time parameter control
    void setThreshold(float thresholdDb);
    void setRatio(float ratio);
    void setAttackTime(float attackMs);
    void setReleaseTime(float releaseMs);
    void setMakeupGain(float makeupDb);
    void setKneeWidth(float kneeDb);
    void setCeiling(float ceilingDb);

    // Sidechain input
    void processSidechainInput(const juce::AudioBuffer<float>& sidechainBuffer);
    void processSidechainInput(const float* sidechainData, int numSamples);

    // Multiband support
    void enableMultiband(bool enabled);
    void setCrossoverFrequencies(const std::vector<float>& frequencies);
    void setBandConfig(int bandIndex, const CompressorConfig& config);

    // Character processing
    void setSaturationAmount(float amount, float drive = 0.0f);
    void setWarmthAmount(float amount);

    // Analysis and metering
    struct DynamicsStats {
        float inputLevel;               // dB
        float outputLevel;              // dB
        float gainReduction;            // dB
        float compressionRatio;
        float threshold;
        float ceiling;
        bool currentlyLimiting;
        float sidechainLevel;
        float rmsLevel;
        float peakLevel;
        float crestFactor;
        double cpuUsage;
        uint64_t samplesProcessed;
        juce::Time lastUpdate;
    };

    DynamicsStats getStats() const;
    void resetStats();

    // Automation support
    struct AutomationData {
        float targetValue;
        float currentValue;
        bool isAutomated;
        float smoothingTime;
    };

    void enableAutomation(bool enabled);
    void automateParameter(const juce::String& parameter, float targetValue, float time = 0.0f);

    // Preset management
    struct Preset {
        juce::String name;
        juce::String description;
        DynamicsProcessorType type;
        juce::var compressorData;
        juce::var limiterData;
        juce::Time created;
        juce::Time lastModified;
    };

    std::vector<Preset> getAvailablePresets() const;
    bool loadPreset(const juce::String& presetName);
    bool savePreset(const juce::String& presetName, const juce::String& description = "");

    // Bypass and wet/dry mixing
    void setBypassed(bool bypassed);
    bool isBypassed() const noexcept { return bypassed; }
    void setWetDryMix(float wetAmount); // 0-1

    // Advanced features
    void enableParallelProcessing(bool enabled);
    void enableMidSideProcessing(bool enabled);
    void setMidSideAmount(float amount);

    // Real-time mode switching
    void switchToCompressor(const CompressorConfig& config, float crossfadeTimeMs = 50.0f);
    void switchToLimiter(const LimiterConfig& config, float crossfadeTimeMs = 50.0f);

private:
    DynamicsProcessorType currentType;
    bool bypassed = false;
    bool initialized = false;

    // Configuration
    CompressorConfig compressorConfig;
    LimiterConfig limiterConfig;

    // Processing components
    std::unique_ptr<EnvelopeFollower> envelopeFollower;
    std::vector<std::unique_ptr<juce::dsp::ProcessorDuplicator<float>> duplicators;
    std::vector<std::unique_ptr<juce::dsp::ProcessorChain<float, juce::dsp::ProcessorBase>>> processingChains;
    std::vector<std::unique_ptr<juce::dsp::Gain<float>>> gainStages;

    // Multiband processing
    bool multibandEnabled = false;
    std::vector<float> crossoverFrequencies;
    std::vector<std::unique_ptr<juce::dsp::LinkwitzRileyFilter<float>>> crossoverFilters;
    std::vector<float> bandOutputs;

    // Sidechain processing
    juce::AudioBuffer<float> sidechainBuffer;
    std::unique_ptr<juce::dsp::IIR::Filter<float>> sidechainFilter;
    bool sidechainEnabled = false;
    bool sidechainListen = false;

    // Character processing
    float saturationAmount = 0.0f;
    float tubeDriveAmount = 0.0f;
    std::unique_ptr<juce::dsp::WaveShaper<float>> saturator;
    std::unique_ptr<juce::dsp::ProcessorChain<float, juce::dsp::ProcessorBase>> characterChain;

    // Parallel and M/S processing
    bool parallelMode = false;
    bool midSideMode = false;
    float midSideAmount = 0.0f;
    std::unique_ptr<juce::dsp::MidSideEncoder<float>> msEncoder;
    std::unique_ptr<juce::dsp::MidSideDecoder<float>> msDecoder;

    // Wet/dry mixing
    juce::LinearSmoothedValue<float> wetDryMix;

    // Real-time processing state
    struct ProcessingState {
        float currentThreshold = -20.0f;
        float currentRatio = 4.0f;
        float currentMakeup = 0.0f;
        float currentGainReduction = 0.0f;
        bool currentlyProcessing = false;
    } processingState;

    // Statistics
    DynamicsStats stats;
    uint64_t totalSamplesProcessed = 0;
    juce::Time statsResetTime;

    // Audio analysis
    std::unique_ptr<juce::dsp::FFT> fft;
    std::vector<float> fftBuffer;
    std::vector<float> magnitudeBuffer;

    // Internal processing
    void processCompressor(juce::AudioBuffer<float>& buffer);
    void processLimiter(juce::AudioBuffer<float>& buffer);
    void processGate(juce::AudioBuffer<float>& buffer);
    void processExpander(juce::AudioBuffer<float>& buffer);
    void processDeEsser(juce::AudioBuffer<float>& buffer);

    void processMultiband(juce::AudioBuffer<float>& buffer);
    void processParallel(juce::AudioBuffer<float>& buffer, juce::AudioBuffer<float>& dryBuffer);
    void processMidSide(juce::AudioBuffer<float>& buffer);

    void applyCharacter(juce::AudioBuffer<float>& buffer);
    void applySaturation(juce::AudioBuffer<float>& buffer);

    // Filter crossover for multiband
    void setupMultibandFilters();
    void updateCrossoverFrequencies(const std::vector<float>& frequencies);

    // Sidechain processing
    void processSidechainFilter(juce::AudioBuffer<float>& buffer);
    void updateSidechainLevel();

    // Gain computation
    float computeGainReduction(float inputLevel, float threshold, float ratio, float kneeWidth);
    float applySoftKnee(float gain, float threshold, float kneeWidth);
    float limitOutput(float input, float ceiling, float ratio);

    // Statistics and monitoring
    void updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);
    void analyzeFrequencyContent(const juce::AudioBuffer<float>& buffer);
    float computeRMSLevel(const juce::AudioBuffer<float>& buffer);
    float computePeakLevel(const juce::AudioBuffer<float>& buffer);
    float computeCrestFactor(float rms, float peak);

    // Utility methods
    double sampleRate = 44100.0;
    int samplesPerBlock = 512;
    void updateSampleRate(double newSampleRate);
    void updateBlockSize(int newBlockSize);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DynamicsProcessor)
};

//==============================================================================
// Dynamics Processor Factory
//==============================================================================

class DynamicsProcessorFactory {
public:
    static std::unique_ptr<DynamicsProcessor> create(DynamicsProcessorType type);

    // Preset configurations
    static CompressorConfig createVocalCompressorPreset();
    static CompressorConfig createDrumCompressorPreset();
    static CompressorConfig createMasterCompressorPreset();
    static CompressorConfig createBusCompressorPreset();
    static CompressorConfig createExpanderPreset();
    static CompressorConfig createGatePreset();
    static CompressorConfig createDeEsserPreset();

    static LimiterConfig createLimiterPreset();
    static LimiterConfig createBrickwallLimiterPreset();
    static LimiterConfig createLoudnessLimiterPreset();
    static LimiterConfig createTruePeakLimiterPreset();

    static std::vector<DynamicsProcessor::Preset> getCompressorPresets();
    static std::vector<DynamicsProcessor::Preset> getLimiterPresets();
    static std::vector<DynamicsProcessor::Preset> getAllPresets();

    // Helper methods
    static CompressorConfig createConfigFromPreset(const DynamicsProcessor::Preset& preset);
    static LimiterConfig createLimiterConfigFromPreset(const DynamicsProcessor::Preset& preset);
    static juce::String getPresetCategory(const DynamicsProcessor::Preset& preset);
};

} // namespace dynamics
} // namespace schill