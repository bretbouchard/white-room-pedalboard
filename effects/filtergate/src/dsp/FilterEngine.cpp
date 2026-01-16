#include "dsp/FilterEngine.h"
#include <cmath>

namespace FilterGate {

//==============================================================================
FilterEngine::FilterEngine()
{
    // Create filter instances
    svf = std::make_unique<StateVariableFilter>();
    ladder = std::make_unique<LadderFilter>();
}

FilterEngine::~FilterEngine() = default;

//==============================================================================
void FilterEngine::prepare (double newSampleRate, int samplesPerBlock)
{
    sampleRate = juce::jmax (newSampleRate, 44100.0);

    // Configure smoothing time constant (approx 10ms at 48kHz)
    smoothingAlpha = 10.0f / static_cast<float> (sampleRate);

    // Prepare all filters
    if (svf)
    {
        SVFParams svfParams;
        svfParams.sampleRate = static_cast<float> (sampleRate);
        svf->setParams (svfParams);
    }

    if (ladder)
    {
        ladder->setSampleRate (sampleRate);
    }
}

//==============================================================================
void FilterEngine::reset()
{
    if (svf)
        svf->reset();

    if (ladder)
        ladder->reset();

    smoothedCutoff = params.cutoffHz;
    smoothedResonance = params.resonance;
    smoothedDrive = params.drive;
}

//==============================================================================
void FilterEngine::setParams (const FilterEngineParams& newParams)
{
    params = newParams;

    // Update smoothing targets
    updateSmoothing();
}

//==============================================================================
void FilterEngine::updateSmoothing()
{
    // Smooth parameter changes to prevent zipper noise
    // Simple 1-pole lowpass smoothing
    float alpha = juce::jmin (smoothingAlpha, 1.0f);

    smoothedCutoff = smoothedCutoff + alpha * (params.cutoffHz - smoothedCutoff);
    smoothedResonance = smoothedResonance + alpha * (params.resonance - smoothedResonance);
    smoothedDrive = smoothedDrive + alpha * (params.drive - smoothedDrive);

    // Apply key tracking to cutoff
    float effectiveCutoff = smoothedCutoff;
    if (params.keyTrack > 0.0f)
    {
        // Key tracking: 1.0 = full tracking (cutoff doubles per octave)
        // MIDI pitch 69 = A4 = 440Hz
        float semitones = params.pitch - 69.0f;
        float keyTrackFactor = std::pow (2.0f, semitones / 12.0f);
        float keyTrackAmount = params.keyTrack * (keyTrackFactor - 1.0f) + 1.0f;
        effectiveCutoff *= keyTrackAmount;
    }

    // Update selected filter model
    switch (params.model)
    {
        case FilterModel::SVF:
        {
            if (svf)
            {
                SVFParams svfParams;
                svfParams.type = FilterType::LOWPASS;  // Default to lowpass
                svfParams.cutoffHz = effectiveCutoff;
                svfParams.resonance = smoothedResonance;
                svfParams.sampleRate = static_cast<float> (sampleRate);
                svf->setParams (svfParams);
            }
            break;
        }

        case FilterModel::LADDER:
        {
            if (ladder)
            {
                LadderParams ladderParams;
                ladderParams.cutoffHz = effectiveCutoff;
                ladderParams.resonance = smoothedResonance;
                ladderParams.drive = smoothedDrive;
                ladder->setParams (ladderParams);
            }
            break;
        }

        case FilterModel::OTA:
        case FilterModel::MS20:
        case FilterModel::COMB:
        case FilterModel::MORPH:
            // Not implemented yet - use SVF as fallback
            if (svf)
            {
                SVFParams svfParams;
                svfParams.type = FilterType::LOWPASS;
                svfParams.cutoffHz = effectiveCutoff;
                svfParams.resonance = smoothedResonance;
                svfParams.sampleRate = static_cast<float> (sampleRate);
                svf->setParams (svfParams);
            }
            break;
    }
}

//==============================================================================
float FilterEngine::process (float input)
{
    return processModel (input);
}

//==============================================================================
float FilterEngine::processModel (float input)
{
    // Route to selected filter model
    switch (params.model)
    {
        case FilterModel::SVF:
            if (svf)
                return svf->process (input);
            break;

        case FilterModel::LADDER:
            if (ladder)
                return ladder->process (input);
            break;

        case FilterModel::OTA:
        case FilterModel::MS20:
        case FilterModel::COMB:
        case FilterModel::MORPH:
            // Fallback to SVF for unimplemented models
            if (svf)
                return svf->process (input);
            break;
    }

    return input;  // Pass through if no filter available
}

//==============================================================================
void FilterEngine::processStereo (float* left, float* right, int numSamples)
{
    // Process samples with parameter smoothing per-sample
    for (int i = 0; i < numSamples; ++i)
    {
        // Update smoothing for each sample
        updateSmoothing();

        // Process each channel
        left[i] = processModel (left[i]);
        right[i] = processModel (right[i]);
    }
}

} // namespace FilterGate
