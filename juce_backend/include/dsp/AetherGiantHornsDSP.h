/*
  ==============================================================================

   AetherGiantHornsDSP.h
   Giant Horn Synthesizer (Air Columns / Brass)

   Physical modeling of giant-scale brass instruments:
   - Bore waveguide (air column with reflection)
   - Lip reed exciter (nonlinear oscillation)
   - Bell radiation filter (directional output)
   - Formant/body shaping (horn identity)
   - Pressure-driven dynamics

   Preset archetypes:
   - Leviathan Horn (slow attack, massive fundamental)
   - Titan Tuba Lead (surprisingly melodic)
   - Cathedral Brass Pad (formant-smoothed, wide)
   - Mythic Reedhorn (edgy, growl-capable)
   - Colossus Fog Siren (semi-stable, cinematic)

  ==============================================================================
*/

#pragma once

#include "dsp/AetherGiantBase.h"
#include "dsp/InstrumentDSP.h"
#include <juce_dsp/juce_dsp.h>
#include <vector>
#include <array>
#include <memory>
#include <random>
#include <cmath>

namespace DSP {

//==============================================================================
/**
 * Lip reed exciter (brass-style)
 *
 * Models:
 * - Nonlinear oscillation based on pressure
 * - Tension/stiffness affects frequency
 * - Chaos at high pressure (growl, distortion)
 * - Pressure-dependent amplitude
 */
class LipReedExciter
{
public:
    struct Parameters
    {
        float lipTension = 0.5f;         // Lip tension (affects pitch)
        float mouthPressure = 0.5f;      // Input pressure (excitation)
        float nonlinearity = 0.3f;       // Nonlinear transfer function
        float chaosThreshold = 0.7f;     // Pressure level for chaos onset
        float growlAmount = 0.2f;        // Growl/turbulence amount

        // ENHANCED: Advanced lip parameters
        float lipMass = 0.5f;            // Lip mass (affects dynamics)
        float lipStiffness = 0.5f;       // Lip stiffness (affects restoring force)
    };

    LipReedExciter();
    ~LipReedExciter() = default;

    void prepare(double sampleRate);
    void reset();

    /** Process lip reed exciter
        @param pressure    Mouth pressure input
        @param frequency   Target frequency (Hz)
        @returns          Excitation signal */
    float processSample(float pressure, float frequency);

    void setParameters(const Parameters& p);
    Parameters getParameters() const { return params; }

    float getPressure() const { return currentPressure; }

private:
    Parameters params;

    // Reed state
    float reedPosition = 0.0f;      // Reed opening
    float reedVelocity = 0.0f;      // Reed velocity
    float currentPressure = 0.0f;   // Current mouth pressure
    float phase = 0.0f;             // Oscillator phase

    // ENHANCED: Advanced lip state
    float lipMass = 1.0f;           // Effective lip mass
    float lipStiffness = 1.0f;      // Effective lip stiffness
    bool oscillationStarted = false; // Track oscillation state
    float attackTransient = 0.0f;   // Attack transient envelope

    // Random for chaos
    std::mt19937 rng;
    std::normal_distribution<float> dist;

    double sr = 48000.0;

    float calculateReedFrequency(float targetFreq) const;
    float calculateOscillationThreshold(float frequency) const;
    float nonlinearTransfer(float x) const;
};

//==============================================================================
/**
 * Bore waveguide (air column)
 *
 * Models:
 * - Cylindrical/conical bore propagation
 * - Reflection at bell end
 * - Loss during propagation
 * - Length determines pitch
 */
class BoreWaveguide
{
public:
    enum class BoreShape
    {
        Cylindrical,  // Straight tube (trombone-style)
        Conical,      // Flaring tube (flugelhorn-style)
        Flared,       // Exponential flare (tuba-style)
        Hybrid        // Combination (most realistic)
    };

    struct Parameters
    {
        float lengthMeters = 3.0f;        // Bore length (0.5m to 20m+)
        BoreShape boreShape = BoreShape::Hybrid;
        float reflectionCoeff = 0.9f;     // Bell reflection (0.0 - 1.0)
        float lossPerMeter = 0.05f;       // Propagation loss
        float flareFactor = 0.5f;         // Bell flare amount
    };

    BoreWaveguide();
    ~BoreWaveguide() = default;

    void prepare(double sampleRate);
    void reset();

    /** Process waveguide
        @param input    Excitation from lip reed
        @returns       Output at bell end */
    float processSample(float input);

    /** Set bore length (affects pitch) */
    void setLengthMeters(float length);

    /** Set bore shape */
    void setBoreShape(BoreShape shape);

    void setParameters(const Parameters& p);
    Parameters getParameters() const { return params; }

    /** Get effective frequency (based on bore length) */
    float getFundamentalFrequency() const;

private:
    Parameters params;

    // Delay line for wave propagation (optimized circular buffers)
    std::vector<float> forwardDelay;
    std::vector<float> backwardDelay;
    int writeIndex = 0;
    int delayLength = 0;
    int maxDelaySize = 0;  // Track buffer size for circular wrap

    // ENHANCED: Mouthpiece cavity resonance (optimized size)
    std::vector<float> mouthpieceCavity;
    int cavityWriteIndex = 0;
    int maxCavitySize = 0;  // Track cavity buffer size for circular wrap

    // Bell radiation filter
    float bellState = 0.0f;

    // ENHANCED: Filter state variables (moved from static to instance for thread-safety)
    float cavityState = 0.0f;       // Mouthpiece cavity filter state
    float cylState = 0.0f;          // Cylindrical bore filter state
    float conState = 0.0f;          // Conical bore filter state
    float flareState = 0.0f;        // Flared bore filter state
    float hybridLF = 0.0f;          // Hybrid bore low-freq filter state
    float hybridHF = 0.0f;          // Hybrid bore high-freq filter state
    float stage1State = 0.0f;       // Bell radiation stage 1 filter state
    float stage2State = 0.0f;       // Bell radiation stage 2 filter state
    float stage3State = 0.0f;       // Bell radiation stage 3 filter state
    float lfState = 0.0f;           // Frequency-dependent loss low-freq state
    float hfState = 0.0f;           // Frequency-dependent loss high-freq state

    // Coefficient caching for bore filters
    bool boreCoefficientsDirty = true;
    BoreShape cachedBoreShape = BoreShape::Hybrid;

    // Cylindrical bore cached coefficients
    float cylCoeff = 0.0f;

    // Conical bore cached coefficients
    float conCoeff = 0.0f;

    // Flared bore cached coefficients
    float flareCoeff = 0.0f;

    // Hybrid bore cached coefficients
    float hybridLFCoeff = 0.0f;
    float hybridHFCoeff = 0.0f;

    // Bell radiation cached coefficients
    bool bellCoefficientsDirty = true;
    float cachedBellSize = 0.0f;
    float stage1Coeff = 0.0f;
    float stage2Coeff = 0.0f;
    float stage3Coeff = 0.0f;

    // Frequency-dependent loss cached coefficients
    bool lossCoefficientsDirty = true;
    float lfLossCoeff = 0.0f;
    float hfLossCoeff = 0.0f;

    double sr = 48000.0;

    void updateDelayLength();
    float processBellRadiation(float input);

    // ENHANCED: Advanced bore modeling
    float processMouthpieceCavity(float input);
    float applyBoreShape(float input);
    float applyCylindricalBore(float input);
    float applyConicalBore(float input);
    float applyFlaredBore(float input);
    float applyHybridBore(float input);
    float calculateFrequencyDependentReflection() const;
    float calculateBellRadiation(float frequency) const;
    float calculateRadiationImpedance(float frequency, float bellSize) const;
    float bellRadiationStage1(float input, float bellSize);
    float bellRadiationStage2(float input, float bellSize);
    float bellRadiationStage3(float input, float bellSize);
    float applyFrequencyDependentLoss(float input, float lfLoss, float hfLoss);
};

//==============================================================================
/**
 * Bell radiation filter
 *
 * Models:
 * - Directional high-frequency radiation
 * - Low-frequency absorption by bell
 * - Cutoff frequency based on bell size
 */
class BellRadiationFilter
{
public:
    BellRadiationFilter();
    ~BellRadiationFilter() = default;

    void prepare(double sampleRate);
    void reset();

    /** Process bell radiation
        @param input        Input from bore
        @param bellSize     Bell size multiplier (0.5 = small, 2.0 = huge)
        @returns            Filtered output */
    float processSample(float input, float bellSize);

    void setCutoffFrequency(float freq);

private:
    float cutoffFrequency = 1000.0f;
    float shaperState = 0.0f;
    double sr = 48000.0;

    // Radiation filter (simple lowpass for HF emphasis)
    float radiationFilter(float input, float cutoff);
};

//==============================================================================
/**
 * Formant/body shaping
 *
 * Models:
 * - Instrument-specific formants
 * - Material resonance (brass vs wood)
 * - Horn "identity"
 */
class HornFormantShaper
{
public:
    enum class HornType
    {
        Trumpet,     // Bright, focused
        Trombone,    // Warm, broad
        Tuba,        // Dark, massive
        FrenchHorn,  // Mellow, complex
        Saxophone,   // Reed character
        Custom       // User-defined
    };

    struct Parameters
    {
        HornType hornType = HornType::Tuba;
        float brightness = 0.5f;         // High-frequency emphasis
        float warmth = 0.5f;             // Low-frequency emphasis
        float metalness = 0.7f;          // Brass character
        float formantShift = 0.0f;       // Formant frequency shift
    };

    HornFormantShaper();
    ~HornFormantShaper() = default;

    void prepare(double sampleRate);
    void reset();

    /** Process formant shaping
        @param input    Input signal
        @returns       Shaped output */
    float processSample(float input);

    void setParameters(const Parameters& p);
    void setHornType(HornType type);
    Parameters getParameters() const { return params; }

private:
    Parameters params;

    // Formant filters (parallel bandpass)
    struct FormantFilter
    {
        float frequency = 1000.0f;
        float amplitude = 1.0f;
        float bandwidth = 1.0f;
        float phase = 0.0f;

        void prepare(double sampleRate);
        float processSample(float input);
        void reset();

    private:
        float state = 0.0f;
        double sr = 48000.0;
    };

    std::vector<FormantFilter> formants;

    // ENHANCED: Filter state variables (moved from static to instance for thread-safety)
    float brightnessState = 0.0f;    // Brightness filter state
    float warmthState = 0.0f;        // Warmth filter state

    // Tonal shaper
    float brightnessFilter(float input, float amount);
    float warmthFilter(float input, float amount);

    double sr = 48000.0;

    void initializeHornType(HornType type);
};

//==============================================================================
/**
 * Single giant horn voice
 */
struct GiantHornVoice
{
    int midiNote = -1;
    float velocity = 0.0f;
    bool active = false;

    // DSP components
    LipReedExciter lipReed;
    BoreWaveguide bore;
    BellRadiationFilter bell;
    HornFormantShaper formants;

    // Giant parameters
    GiantScaleParameters scale;
    GiantGestureParameters gesture;

    // Pressure envelope
    float currentPressure = 0.0f;
    float targetPressure = 0.0f;
    float envelopePhase = 0.0f;  // 0 = attack, 1 = sustain, 2 = release

    void prepare(double sampleRate);
    void reset();
    void trigger(int note, float vel, const GiantGestureParameters& gestureParam,
                 const GiantScaleParameters& scaleParam);
    void release(bool damping = false);
    float processSample();
    bool isActive() const;

private:
    double sr = 48000.0;

    float calculateTargetPressure(float velocity, float force) const;
    float processPressureEnvelope();
};

//==============================================================================
/**
 * Giant Horn voice manager
 *
 * Manages polyphonic horn voices (typically 8-16 voices).
 */
class GiantHornVoiceManager
{
public:
    GiantHornVoiceManager();
    ~GiantHornVoiceManager() = default;

    void prepare(double sampleRate, int maxVoices = 12);
    void reset();

    GiantHornVoice* findFreeVoice();
    GiantHornVoice* findVoiceForNote(int note);

    void handleNoteOn(int note, float velocity, const GiantGestureParameters& gesture,
                      const GiantScaleParameters& scale);
    void handleNoteOff(int note, bool damping = false);
    void allNotesOff();

    float processSample();
    int getActiveVoiceCount() const;

    void setLipReedParameters(const LipReedExciter::Parameters& params);
    void setBoreParameters(const BoreWaveguide::Parameters& params);
    void setFormantParameters(const HornFormantShaper::Parameters& params);

private:
    std::vector<std::unique_ptr<GiantHornVoice>> voices;
    double currentSampleRate = 48000.0;
};

//==============================================================================
/**
 * Main Aether Giant Horns Pure DSP Instrument
 */
class AetherGiantHornsPureDSP : public InstrumentDSP
{
public:
    AetherGiantHornsPureDSP();
    ~AetherGiantHornsPureDSP() override;

    //==============================================================================
    // InstrumentDSP interface
    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** outputs, int numChannels, int numSamples) override;
    void handleEvent(const ScheduledEvent& event) override;

    float getParameter(const char* paramId) const override;
    void setParameter(const char* paramId, float value) override;

    bool savePreset(char* jsonBuffer, int jsonBufferSize) const override;
    bool loadPreset(const char* jsonData) override;

    int getActiveVoiceCount() const override;
    int getMaxPolyphony() const override { return maxVoices_; }

    const char* getInstrumentName() const override { return "AetherGiantHorns"; }
    const char* getInstrumentVersion() const override { return "1.0.0"; }

private:
    //==============================================================================
    GiantHornVoiceManager voiceManager_;

    struct Parameters
    {
        // Lip reed
        float lipTension = 0.5f;
        float mouthPressure = 0.5f;
        float nonlinearity = 0.3f;
        float chaosThreshold = 0.7f;
        float growlAmount = 0.2f;
        float lipMass = 0.5f;           // ENHANCED: Lip mass parameter
        float lipStiffness = 0.5f;      // ENHANCED: Lip stiffness parameter

        // Bore
        float boreLength = 5.0f;
        float reflectionCoeff = 0.9f;
        float boreShape = 1.0f;      // 0 = cylindrical, 1 = flared
        float flareFactor = 0.5f;

        // Bell
        float bellSize = 1.5f;

        // Formants
        float hornType = 2.0f;       // 0 = trumpet, 2 = tuba
        float brightness = 0.4f;
        float warmth = 0.7f;
        float metalness = 0.8f;

        // Giant
        float scaleMeters = 5.0f;
        float massBias = 0.6f;
        float airLoss = 0.4f;
        float transientSlowing = 0.6f;

        // Gesture
        float force = 0.6f;
        float speed = 0.3f;
        float contactArea = 0.5f;
        float roughness = 0.3f;

        // Global
        float masterVolume = 0.8f;

    } params_;

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;
    int maxVoices_ = 12;

    // Current giant state
    GiantScaleParameters currentScale_;
    GiantGestureParameters currentGesture_;

    void applyParameters();
    void processStereoSample(float& left, float& right);
    float calculateFrequency(int midiNote) const;

    // Preset serialization
    bool writeJsonParameter(const char* name, double value, char* buffer,
                            int& offset, int bufferSize) const;
    bool parseJsonParameter(const char* json, const char* param, double& value) const;
};

}  // namespace DSP
