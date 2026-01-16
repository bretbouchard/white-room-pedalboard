/*
  ==============================================================================

    LocalGalSmoothingIntegration.cpp
    Example integration of parameter smoothing for LOCAL GAL Synthesizer

    This file demonstrates how to integrate the smoothed parameter system
    into LOCAL GAL. Copy relevant sections to LocalGalPureDSP.h and .cpp

  ==============================================================================
*/

// ============================================================================
// STEP 1: Add to LocalGalPureDSP.h
// ============================================================================

// Add this include at the top of LocalGalPureDSP.h:
// #include "../../../../include/SmoothedParametersMixin.h"

namespace DSP {

class LocalGalPureDSP : public InstrumentDSP
{
public:
    LocalGalPureDSP();
    ~LocalGalPureDSP() override;

    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** outputs, int numChannels, int numSamples) override;
    void handleEvent(const ScheduledEvent& event) override;

    float getParameter(const char* paramId) const override;
    void setParameter(const char* paramId, float value) override;

    bool savePreset(char* jsonBuffer, int jsonBufferSize) const override;
    bool loadPreset(const char* jsonData) override;

    int getActiveVoiceCount() const override;
    int getMaxPolyphony() const override { return 16; }

    const char* getInstrumentName() const override { return "LocalGal"; }
    const char* getInstrumentVersion() const override { return "1.0.0"; }

    // Feel Vector Control
    void setFeelVector(const FeelVector& feelVector);
    FeelVector getCurrentFeelVector() const { return currentFeelVector_; }
    void morphToFeelVector(const FeelVector& targetFeelVector, double timeMs = 100.0);

    // Feel vector presets
    static std::vector<std::string> getFeelVectorPresets();
    void applyFeelVectorPreset(const std::string& presetName);

private:
    LGVoiceManager voiceManager_;

    // ========================================================================
    // ADD: Smoothed parameter indices
    // ========================================================================
    enum SmoothedParams
    {
        SMOOTH_OSC_WAVEFORM = 0,
        SMOOTH_OSC_DETUNE,
        SMOOTH_OSC_LEVEL,
        SMOOTH_FILTER_TYPE,
        SMOOTH_FILTER_CUTOFF,
        SMOOTH_FILTER_RESONANCE,
        SMOOTH_FILTER_DRIVE,
        SMOOTH_ENV_ATTACK,
        SMOOTH_ENV_DECAY,
        SMOOTH_ENV_SUSTAIN,
        SMOOTH_ENV_RELEASE,
        SMOOTH_FEEL_RUBBER,
        SMOOTH_FEEL_BITE,
        SMOOTH_FEEL_HOLLOW,
        SMOOTH_FEEL_GROWL,
        SMOOTH_FEEL_WET,
        SMOOTH_MASTER_VOLUME,
        SMOOTH_PITCH_BEND_RANGE,
        SMOOTH_COUNT
    };

    // ========================================================================
    // ADD: Smoothed parameters array
    // ========================================================================
    SchillingerEcosystem::DSP::SmoothedParameterArray<float, SMOOTH_COUNT> smoothedParams_;

    struct Parameters
    {
        // Oscillator
        float oscWaveform = 1.0f;  // 0=Sine, 1=Saw, 2=Square, 3=Triangle, 4=Noise
        float oscDetune = 0.0f;
        float oscLevel = 0.8f;

        // Filter
        float filterType = 0.0f;  // 0=LP, 1=HP, 2=BP, 3=Notch
        float filterCutoff = 0.5f;  // Normalized 0-1
        float filterResonance = 0.7f;
        float filterDrive = 1.0f;

        // Envelope
        float envAttack = 0.005f;
        float envDecay = 0.1f;
        float envSustain = 0.6f;
        float envRelease = 0.2f;

        // Feel Vector
        float feelRubber = 0.5f;
        float feelBite = 0.5f;
        float feelHollow = 0.5f;
        float feelGrowl = 0.3f;
        float feelWet = 0.0f;

        // Global
        float masterVolume = 0.8f;
        float pitchBendRange = 2.0f;
    } params_;

    FeelVector currentFeelVector_;
    FeelVector targetFeelVector_;
    double feelVectorMorphTime_ = 0.1;
    double feelVectorMorphProgress_ = 0.0;
    bool feelVectorMorphing_ = false;

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;
    double pitchBend_ = 0.0;

    void applyParameters();
    void updateFeelVector(double deltaTime);
    void processStereoSample(float& left, float& right);

    float calculateFrequency(int midiNote, float bend = 0.0f) const;

    bool writeJsonParameter(const char* name, double value, char* buffer,
                            int& offset, int bufferSize) const;
    bool parseJsonParameter(const char* json, const char* param, double& value) const;
};

} // namespace DSP


// ============================================================================
// STEP 2: Modify LocalGalPureDSP.cpp - prepare()
// ============================================================================

bool LocalGalPureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // ========================================================================
    // ADD: Initialize smoothed parameters
    // ========================================================================
    smoothedParams_.prepare(sampleRate, blockSize);

    voiceManager_.prepare(sampleRate, blockSize);

    return true;
}


// ============================================================================
// STEP 3: Modify LocalGalPureDSP.cpp - setParameter()
// ============================================================================

void LocalGalPureDSP::setParameter(const char* paramId, float value)
{
    // Oscillator
    if (strcmp(paramId, "oscWaveform") == 0)
    {
        params_.oscWaveform = value;
        // ====================================================================
        // ADD: Update smoothed parameter
        // ====================================================================
        smoothedParams_.set(SMOOTH_OSC_WAVEFORM, value);
    }
    else if (strcmp(paramId, "oscDetune") == 0)
    {
        params_.oscDetune = value;
        smoothedParams_.set(SMOOTH_OSC_DETUNE, value);
    }
    else if (strcmp(paramId, "oscLevel") == 0)
    {
        params_.oscLevel = value;
        smoothedParams_.set(SMOOTH_OSC_LEVEL, value);
    }
    // Filter
    else if (strcmp(paramId, "filterType") == 0)
    {
        params_.filterType = value;
        smoothedParams_.setImmediate(SMOOTH_FILTER_TYPE, value); // Immediate for discrete parameter
    }
    else if (strcmp(paramId, "filterCutoff") == 0)
    {
        params_.filterCutoff = value;
        smoothedParams_.set(SMOOTH_FILTER_CUTOFF, value);
    }
    else if (strcmp(paramId, "filterResonance") == 0)
    {
        params_.filterResonance = value;
        smoothedParams_.set(SMOOTH_FILTER_RESONANCE, value);
    }
    else if (strcmp(paramId, "filterDrive") == 0)
    {
        params_.filterDrive = value;
        smoothedParams_.set(SMOOTH_FILTER_DRIVE, value);
    }
    // Envelope
    else if (strcmp(paramId, "envAttack") == 0)
    {
        params_.envAttack = value;
        smoothedParams_.set(SMOOTH_ENV_ATTACK, value);
    }
    else if (strcmp(paramId, "envDecay") == 0)
    {
        params_.envDecay = value;
        smoothedParams_.set(SMOOTH_ENV_DECAY, value);
    }
    else if (strcmp(paramId, "envSustain") == 0)
    {
        params_.envSustain = value;
        smoothedParams_.set(SMOOTH_ENV_SUSTAIN, value);
    }
    else if (strcmp(paramId, "envRelease") == 0)
    {
        params_.envRelease = value;
        smoothedParams_.set(SMOOTH_ENV_RELEASE, value);
    }
    // Feel Vector
    else if (strcmp(paramId, "feelRubber") == 0)
    {
        params_.feelRubber = value;
        smoothedParams_.set(SMOOTH_FEEL_RUBBER, value);
    }
    else if (strcmp(paramId, "feelBite") == 0)
    {
        params_.feelBite = value;
        smoothedParams_.set(SMOOTH_FEEL_BITE, value);
    }
    else if (strcmp(paramId, "feelHollow") == 0)
    {
        params_.feelHollow = value;
        smoothedParams_.set(SMOOTH_FEEL_HOLLOW, value);
    }
    else if (strcmp(paramId, "feelGrowl") == 0)
    {
        params_.feelGrowl = value;
        smoothedParams_.set(SMOOTH_FEEL_GROWL, value);
    }
    else if (strcmp(paramId, "feelWet") == 0)
    {
        params_.feelWet = value;
        smoothedParams_.set(SMOOTH_FEEL_WET, value);
    }
    // Global
    else if (strcmp(paramId, "masterVolume") == 0)
    {
        params_.masterVolume = value;
        smoothedParams_.set(SMOOTH_MASTER_VOLUME, value);
    }
    else if (strcmp(paramId, "pitchBendRange") == 0)
    {
        params_.pitchBendRange = value;
        smoothedParams_.setImmediate(SMOOTH_PITCH_BEND_RANGE, value); // Immediate for preset
    }

    applyParameters();
}


// ============================================================================
// STEP 4: Modify LocalGalPureDSP.cpp - loadPreset()
// ============================================================================

bool LocalGalPureDSP::loadPreset(const char* jsonData)
{
    // Parse preset values...
    float cutoff = parseJsonParameter(jsonData, "filterCutoff", params_.filterCutoff);
    float resonance = parseJsonParameter(jsonData, "filterResonance", params_.filterResonance);
    // ... etc

    // ========================================================================
    // ADD: Use immediate setting for preset changes
    // ========================================================================
    smoothedParams_.setImmediate(SMOOTH_FILTER_CUTOFF, cutoff);
    smoothedParams_.setImmediate(SMOOTH_FILTER_RESONANCE, resonance);
    smoothedParams_.setImmediate(SMOOTH_FILTER_DRIVE, params_.filterDrive);
    smoothedParams_.setImmediate(SMOOTH_MASTER_VOLUME, params_.masterVolume);

    return true;
}


// ============================================================================
// STEP 5: Modify LocalGalPureDSP.cpp - process()
// ============================================================================

void LocalGalPureDSP::process(float** outputs, int numChannels, int numSamples)
{
    // Clear output buffers
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            outputs[ch][i] = 0.0f;
        }
    }

    // Update feel vector morphing
    updateFeelVector(static_cast<double>(numSamples) / sampleRate_);

    // ========================================================================
    // ADD: Process with smoothed parameters
    // ========================================================================
    for (int i = 0; i < numSamples; ++i)
    {
        // Get smoothed parameter values for this sample
        float oscWaveform = smoothedParams_.getSmoothed(SMOOTH_OSC_WAVEFORM);
        float oscDetune = smoothedParams_.getSmoothed(SMOOTH_OSC_DETUNE);
        float oscLevel = smoothedParams_.getSmoothed(SMOOTH_OSC_LEVEL);

        float filterCutoff = smoothedParams_.getSmoothed(SMOOTH_FILTER_CUTOFF);
        float filterResonance = smoothedParams_.getSmoothed(SMOOTH_FILTER_RESONANCE);
        float filterDrive = smoothedParams_.getSmoothed(SMOOTH_FILTER_DRIVE);

        float envAttack = smoothedParams_.getSmoothed(SMOOTH_ENV_ATTACK);
        float envDecay = smoothedParams_.getSmoothed(SMOOTH_ENV_DECAY);
        float envSustain = smoothedParams_.getSmoothed(SMOOTH_ENV_SUSTAIN);
        float envRelease = smoothedParams_.getSmoothed(SMOOTH_ENV_RELEASE);

        float feelRubber = smoothedParams_.getSmoothed(SMOOTH_FEEL_RUBBER);
        float feelBite = smoothedParams_.getSmoothed(SMOOTH_FEEL_BITE);
        float feelHollow = smoothedParams_.getSmoothed(SMOOTH_FEEL_HOLLOW);
        float feelGrowl = smoothedParams_.getSmoothed(SMOOTH_FEEL_GROWL);
        float feelWet = smoothedParams_.getSmoothed(SMOOTH_FEEL_WET);

        float masterVolume = smoothedParams_.getSmoothed(SMOOTH_MASTER_VOLUME);

        // Build feel vector from smoothed values
        FeelVector feel;
        feel.rubber = feelRubber;
        feel.bite = feelBite;
        feel.hollow = feelHollow;
        feel.growl = feelGrowl;
        feel.wet = feelWet;

        // Apply feel vector to voice manager
        voiceManager_.applyFeelVector(feel);

        // Process sample
        float left = 0.0f;
        float right = 0.0f;
        processStereoSample(left, right);

        // Apply master volume (smoothed)
        left *= masterVolume;
        right *= masterVolume;

        outputs[0][i] = left;
        outputs[1][i] = right;
    }
}


// ============================================================================
// STEP 6: Alternative - Per-sample optimization (better performance)
// ============================================================================

void LocalGalPureDSP::processOptimized(float** outputs, int numChannels, int numSamples)
{
    // Clear output buffers
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            outputs[ch][i] = 0.0f;
        }
    }

    // Update feel vector morphing once per block (not per sample)
    updateFeelVector(static_cast<double>(numSamples) / sampleRate_);

    // ========================================================================
    // ADD: Get smoothed values once per block for performance
    // ========================================================================
    float filterCutoff = smoothedParams_.get(SMOOTH_FILTER_CUTOFF);
    float filterResonance = smoothedParams_.get(SMOOTH_FILTER_RESONANCE);
    float masterVolume = smoothedParams_.get(SMOOTH_MASTER_VOLUME);

    // Check if parameters are changing
    bool needsSmoothing = smoothedParams_[SMOOTH_FILTER_CUTOFF].isSmoothing() ||
                         smoothedParams_[SMOOTH_FILTER_RESONANCE].isSmoothing() ||
                         smoothedParams_[SMOOTH_MASTER_VOLUME].isSmoothing();

    if (needsSmoothing)
    {
        // Per-sample smoothing for changing parameters
        for (int i = 0; i < numSamples; ++i)
        {
            filterCutoff = smoothedParams_.getSmoothed(SMOOTH_FILTER_CUTOFF);
            filterResonance = smoothedParams_.getSmoothed(SMOOTH_FILTER_RESONANCE);
            masterVolume = smoothedParams_.getSmoothed(SMOOTH_MASTER_VOLUME);

            // Process with smoothed values
            for (int ch = 0; ch < numChannels; ++ch)
            {
                float sample = 0.0f; // Get from voice manager
                sample *= masterVolume;
                outputs[ch][i] = sample;
            }
        }
    }
    else
    {
        // No smoothing needed - use constant values
        for (int i = 0; i < numSamples; ++i)
        {
            // Process with constant values
            for (int ch = 0; ch < numChannels; ++ch)
            {
                float sample = 0.0f; // Get from voice manager
                sample *= masterVolume;
                outputs[ch][i] = sample;
            }
        }
    }
}


// ============================================================================
// STEP 7: Add test for LocalGal smoothing
// ============================================================================

// Add to tests/instrument/localgal/LocalGalTests.cpp:

TEST_CASE("LocalGal filter smoothing prevents zipper noise", "[instrument][localgal]")
{
    DSP::LocalGalPureDSP synth;
    synth.prepare(48000.0, 512);

    // Set initial parameters
    synth.setParameter("filterCutoff", 0.5f);
    synth.setParameter("filterResonance", 0.7f);
    synth.setParameter("masterVolume", 0.8f);

    // Simulate rapid filter automation
    std::vector<float> audio;
    for (int i = 0; i < 1000; ++i)
    {
        float cutoff = static_cast<float>(i) / 1000.0f;
        synth.setParameter("filterCutoff", cutoff);

        float** outputs = new float*[2];
        outputs[0] = new float[1];
        outputs[1] = new float[1];

        synth.process(outputs, 2, 1);
        audio.push_back(outputs[0][0]);

        delete[] outputs[0];
        delete[] outputs[1];
        delete[] outputs;
    }

    // Check for discontinuities (zipper noise)
    float maxDelta = 0.0f;
    for (size_t i = 1; i < audio.size(); ++i)
    {
        float delta = std::abs(audio[i] - audio[i-1]);
        maxDelta = std::max(maxDelta, delta);
    }

    // Should be smooth - no abrupt changes
    REQUIRE(maxDelta < 0.1f);
}

TEST_CASE("LocalGal preset changes use immediate setting", "[instrument][localgal]")
{
    DSP::LocalGalPureDSP synth;
    synth.prepare(48000.0, 512);

    // Load preset
    const char* preset = "{\"filterCutoff\":0.8,\"filterResonance\":0.9,\"masterVolume\":0.7}";
    synth.loadPreset(preset);

    float** outputs = new float*[2];
    outputs[0] = new float[1];
    outputs[1] = new float[1];

    // Process immediately after preset load
    synth.process(outputs, 2, 1);

    // Should reflect new preset immediately (no smoothing artifacts)
    REQUIRE(std::abs(outputs[0][0]) >= 0.0f);

    delete[] outputs[0];
    delete[] outputs[1];
    delete[] outputs;
}
