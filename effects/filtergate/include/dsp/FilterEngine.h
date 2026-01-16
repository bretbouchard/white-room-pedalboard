#pragma once

#include "dsp/filters/StateVariableFilter.h"
#include "dsp/filters/LadderFilter.h"
#include <memory>

namespace FilterGate {

//==============================================================================
enum class FilterModel
{
    SVF,      // State Variable Filter
    LADDER,   // Moog-style ladder
    OTA,      // Roland-style OTA (future)
    MS20,     // Korg MS-20 (future)
    COMB,     // Comb filter (future)
    MORPH     // Morphing filter (future)
};

//==============================================================================
struct FilterEngineParams
{
    FilterModel model = FilterModel::SVF;
    float cutoffHz = 1000.0f;
    float resonance = 0.5f;
    float drive = 0.0f;       // Pre-resonance saturation
    float postDrive = 0.0f;   // Post-resonance saturation (future)
    float keyTrack = 0.0f;    // 0-1, keyboard tracking amount
    float pitch = 0.0f;       // MIDI pitch note for key tracking (69 = A4 = 440Hz)
    int oversampling = 1;     // 1, 2, 4, 8 (future implementation)
};

//==============================================================================
class FilterEngine
{
public:
    FilterEngine();
    ~FilterEngine();

    void prepare (double sampleRate, int samplesPerBlock);
    void reset();
    void setParams (const FilterEngineParams& newParams);

    float process (float input);
    void processStereo (float* left, float* right, int numSamples);

    // Single sample processing (alias for process())
    float processSample(float input) { return process(input); }

    // Get current filter model
    FilterModel getCurrentModel() const { return params.model; }

private:
    FilterEngineParams params;
    double sampleRate = 48000.0;

    // Model-specific filters
    std::unique_ptr<StateVariableFilter> svf;
    std::unique_ptr<LadderFilter> ladder;

    // Parameter smoothing (prevent zipper noise)
    float smoothedCutoff = 1000.0f;
    float smoothedResonance = 0.5f;
    float smoothedDrive = 0.0f;

    float processModel (float input);
    void updateSmoothing();
    void applyKeyTracking();

    // Smoothing coefficient
    float smoothingAlpha = 0.001f;  // Smoothing time constant
};

} // namespace FilterGate
