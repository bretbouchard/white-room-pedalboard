/*
 ==============================================================================
    MonumentReverbPureDSP.h
    Exterior/Open-Air Reverb System - Pure DSP Implementation

    Monument Reverb simulates the acoustics of large open-air spaces like
    monuments, plazas, and courtyards with reflective surfaces and
    atmospheric absorption.

    Features:
    - Ground surface material simulation (8 types: grass, soil, wood, concrete, marble, stone, snow, ice)
    - Vegetation density affecting absorption and diffusion
    - Horizon echo with delay time
    - Tail decay with atmospheric simulation
    - Source height affecting early reflection patterns
    - Air absorption modeling

    Algorithm:
    - Early reflections based on ground material and source height
    - Diffuse tail network with vegetation absorption
    - Horizon echo for large-space simulation
    - Air EQ for high-frequency absorption

 ==============================================================================
*/

#pragma once

#include <algorithm>
#include <cmath>
#include <vector>

namespace schill {
namespace monument {

//==============================================================================
// Parameter Ranges and Constants
//==============================================================================

namespace Parameters {
    // Master
    constexpr float wetMin = 0.0f, wetMax = 1.0f, wetDefault = 0.5f;
    constexpr float dryMin = 0.0f, dryMax = 1.0f, dryDefault = 1.0f;
    constexpr float scaleMin = 0.5f, scaleMax = 2.0f, scaleDefault = 1.0f;
    constexpr float airMin = 0.0f, airMax = 1.0f, airDefault = 0.3f;

    // Ground
    constexpr int surfaceMin = 0, surfaceMax = 7, surfaceDefault = 0; // 0=Grass, 7=Ice
    constexpr float hardnessMin = 0.0f, hardnessMax = 1.0f, hardnessDefault = 0.5f;
    constexpr float roughnessMin = 0.0f, roughnessMax = 1.0f, roughnessDefault = 0.3f;
    constexpr float groundWetnessMin = 0.0f, groundWetnessMax = 1.0f, groundWetnessDefault = 0.0f;
    constexpr float heightMin = 0.1f, heightMax = 5.0f, heightDefault = 0.6f; // meters

    // Vegetation
    constexpr float densityMin = 0.0f, densityMax = 1.0f, densityDefault = 0.2f;
    constexpr float vegWetnessMin = 0.0f, vegWetnessMax = 1.0f, vegWetnessDefault = 0.0f;
    constexpr float jitterMin = 0.0f, jitterMax = 1.0f, jitterDefault = 0.1f;

    // Horizon Echo
    constexpr float horizonEnabledMin = 0.0f, horizonEnabledMax = 1.0f, horizonEnabledDefault = 1.0f;
    constexpr float horizonDelayMin = 0.05f, horizonDelayMax = 0.5f, horizonDelayDefault = 0.2f; // seconds

    // Tail
    constexpr float tailEnabledMin = 0.0f, tailEnabledMax = 1.0f, tailEnabledDefault = 1.0f;
    constexpr float tailDecayMin = 0.1f, tailDecayMax = 5.0f, tailDecayDefault = 2.0f; // seconds
}

//==============================================================================
// Surface Material Types
//==============================================================================

enum class SurfaceType : int {
    Grass = 0,
    Soil,
    Wood,
    Concrete,
    Marble,
    Stone,
    Snow,
    Ice
};

//==============================================================================
// Parameter Structure
//==============================================================================

struct MonumentReverbParams {
    // Master
    float wet = Parameters::wetDefault;
    float dry = Parameters::dryDefault;
    float scale = Parameters::scaleDefault;
    float air = Parameters::airDefault;

    // Ground
    int surface = static_cast<int>(SurfaceType::Grass);
    float hardness = Parameters::hardnessDefault;
    float roughness = Parameters::roughnessDefault;
    float groundWetness = Parameters::groundWetnessDefault;
    float height = Parameters::heightDefault;

    // Vegetation
    float density = Parameters::densityDefault;
    float vegWetness = Parameters::vegWetnessDefault;
    float jitter = Parameters::jitterDefault;

    // Horizon Echo
    float horizonEnabled = Parameters::horizonEnabledDefault;
    float horizonDelay = Parameters::horizonDelayDefault;

    // Tail
    float tailEnabled = Parameters::tailEnabledDefault;
    float tailDecay = Parameters::tailDecayDefault;
};

//==============================================================================
// Pure DSP Class
//==============================================================================

class MonumentReverbPureDSP {
public:
    //==========================================================================
    // Constructor/Destructor
    //==========================================================================

    MonumentReverbPureDSP();
    ~MonumentReverbPureDSP();

    //==========================================================================
    // Initialization
    //==========================================================================

    void prepare(double sampleRate, int maxSamplesPerBlock);
    void reset();

    //==========================================================================
    // Processing
    //==========================================================================

    void processBlock(const float* const* inputChannels,
                     float* const* outputChannels,
                     int numInputChannels,
                     int numOutputChannels,
                     int numSamples,
                     const MonumentReverbParams& params);

    //==========================================================================
    // Parameter Accessors
    //==========================================================================

    void setParameters(const MonumentReverbParams& params);
    MonumentReverbParams getParameters() const { return currentParams_; }

private:
    //==========================================================================
    // DSP Components
    //==========================================================================

    // Early reflections based on ground surface and source height
    void processEarlyReflections(const float* input, float* output, int numSamples);

    // Diffuse tail with vegetation absorption
    void processDiffuseTail(const float* input, float* output, int numSamples);

    // Horizon echo for large-space simulation
    void processHorizonEcho(const float* input, float* output, int numSamples);

    // Air absorption EQ
    void processAirAbsorption(float* samples, int numSamples);

    // Ground reflection characteristics
    struct GroundCharacteristics {
        float reflectivity;     // How reflective the surface is
        float absorption;       // High-frequency absorption
        float diffusion;        // Diffusion factor
        float roughnessFactor;  // Surface roughness
    };

    GroundCharacteristics getGroundCharacteristics(SurfaceType surface) const;

    //==========================================================================
    // Member Variables
    //==========================================================================

    double sampleRate_ = 44100.0;
    MonumentReverbParams currentParams_;
    MonumentReverbParams smoothedParams_;

    // Early reflection delay lines
    std::vector<float> earlyDelayLine_;
    int earlyDelaySize_ = 0;
    int earlyWriteIndex_ = 0;

    // Diffuse tail network
    struct DelayNetwork {
        std::vector<float> delayLine;
        int writeIndex = 0;
        float feedbackGain = 0.0f;
        float damping = 0.0f;
    };

    static constexpr int numDiffuseDelays = 4;
    DelayNetwork diffuseDelays_[numDiffuseDelays];

    // Horizon echo
    std::vector<float> horizonDelayLine_;
    int horizonDelaySize_ = 0;
    int horizonWriteIndex_ = 0;

    // Air absorption filter (simple first-order lowpass)
    float airFilterState_ = 0.0f;

    // Temporary buffers
    std::vector<float> tempBuffer_;
    std::vector<float> earlyBuffer_;
    std::vector<float> diffuseBuffer_;
    std::vector<float> horizonBuffer_;

    // Smoothing coefficients
    float smoothingCoefficient_ = 0.0f;

    //==========================================================================
    // Utility Functions
    //==========================================================================

    float linearInterpolate(const float* buffer, int bufferSize, float position) const;
    void processDelayLine(std::vector<float>& delayLine, int& writeIndex,
                         int delaySize, const float* input, float* output,
                         int numSamples, float feedbackGain, float damping);
};

//==============================================================================
// Inline Implementation
//==============================================================================

inline MonumentReverbPureDSP::MonumentReverbPureDSP() {
    // Initialize with default parameters
    currentParams_ = MonumentReverbParams();
    smoothedParams_ = currentParams_;
}

inline MonumentReverbPureDSP::~MonumentReverbPureDSP() {
    // Vector cleanup is automatic
}

inline void MonumentReverbPureDSP::prepare(double sampleRate, int maxSamplesPerBlock) {
    sampleRate_ = sampleRate;

    // Calculate smoothing coefficient (50ms smoothing time)
    float smoothingTime = 0.05f;
    smoothingCoefficient_ = 1.0f - std::exp(-1.0f / (smoothingTime * sampleRate_));

    // Allocate early reflection delay line (up to 100ms)
    int maxEarlyDelay = static_cast<int>(0.1f * sampleRate_);
    earlyDelaySize_ = maxEarlyDelay + maxSamplesPerBlock;
    earlyDelayLine_.resize(earlyDelaySize_, 0.0f);
    earlyWriteIndex_ = 0;

    // Allocate diffuse delay lines (varying lengths for diffusion)
    float baseDelay = 0.05f; // 50ms base
    for (int i = 0; i < numDiffuseDelays; ++i) {
        float delayTime = baseDelay * (1.0f + i * 0.25f); // 50ms, 62.5ms, 75ms, 87.5ms
        int delaySize = static_cast<int>(delayTime * sampleRate_) + maxSamplesPerBlock;
        diffuseDelays_[i].delayLine.resize(delaySize, 0.0f);
        diffuseDelays_[i].writeIndex = 0;
    }

    // Allocate horizon echo delay line (up to 500ms)
    int maxHorizonDelay = static_cast<int>(0.5f * sampleRate_);
    horizonDelaySize_ = maxHorizonDelay + maxSamplesPerBlock;
    horizonDelayLine_.resize(horizonDelaySize_, 0.0f);
    horizonWriteIndex_ = 0;

    // Allocate temporary buffers
    tempBuffer_.resize(maxSamplesPerBlock, 0.0f);
    earlyBuffer_.resize(maxSamplesPerBlock, 0.0f);
    diffuseBuffer_.resize(maxSamplesPerBlock, 0.0f);
    horizonBuffer_.resize(maxSamplesPerBlock, 0.0f);
}

inline void MonumentReverbPureDSP::reset() {
    std::fill(earlyDelayLine_.begin(), earlyDelayLine_.end(), 0.0f);
    for (int i = 0; i < numDiffuseDelays; ++i) {
        std::fill(diffuseDelays_[i].delayLine.begin(), diffuseDelays_[i].delayLine.end(), 0.0f);
    }
    std::fill(horizonDelayLine_.begin(), horizonDelayLine_.end(), 0.0f);
    airFilterState_ = 0.0f;
    earlyWriteIndex_ = 0;
    horizonWriteIndex_ = 0;
}

inline float MonumentReverbPureDSP::linearInterpolate(const float* buffer, int bufferSize, float position) const {
    int index1 = static_cast<int>(position);
    int index2 = (index1 + 1) % bufferSize;
    float frac = position - index1;
    return buffer[index1] * (1.0f - frac) + buffer[index2] * frac;
}

} // namespace monument
} // namespace schill
