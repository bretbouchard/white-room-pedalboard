/*
  ==============================================================================

   AetherGiantDrumsDSP.h
   Giant Drum Synthesizer (Seismic Membranes)

   Physical modeling of giant-scale drums:
   - SVF-based membrane resonator (2-6 primary modes with tension/diameter scaling)
   - Bidirectional shell/cavity coupling (Helmholtz resonator model)
   - Nonlinear loss/saturation (prevents sterile modal ringing)
   - Distance/air absorption (giant perception)
   - Room coupling (early reflections, "huge room" feel)

   Version 2.0 - Advanced Membrane Physics:
   - State Variable Filter membrane model for realistic 2D vibration patterns
   - Coupled shell/cavity system with natural pitch envelope
   - Better decay characteristics and transient response

   Preset archetypes:
   - Colossus Kick (sub-heavy, slow bloom)
   - Titan Tom Array (tuned set, cinematic)
   - Cathedral Snare (giant shell, long tail)
   - Thunder Frame Drum (wide transient, slow fundamental)
   - Mythic Taiko (huge strike, air push)

  ==============================================================================
*/

#pragma once

#include "dsp/AetherGiantBase.h"
#include "dsp/InstrumentDSP.h"
#include <juce_dsp/juce_dsp.h>
#include <vector>
#include <array>
#include <memory>
#include <cmath>

namespace DSP {

//==============================================================================
/**
 * SVF-based membrane mode for drum resonator
 *
 * Uses State Variable Filter (TPT structure) for realistic 2D membrane vibration.
 * Each mode represents a circular membrane vibrational pattern (m,n) with:
 * - Accurate frequency response and resonance
 * - Better decay characteristics
 * - Realistic transient response
 */
struct SVFMembraneMode
{
    float frequency = 100.0f;      // Mode frequency (Hz)
    float qFactor = 50.0f;         // Quality factor (resonance)
    float amplitude = 1.0f;        // Mode amplitude
    float decay = 0.995f;          // Decay coefficient (per sample)
    float energy = 0.0f;           // Current energy level

    // SVF state variables
    float z1 = 0.0f;               // First integrator state
    float z2 = 0.0f;               // Second integrator state
    float frequencyFactor = 0.0f;  // Pre-calculated g parameter
    float resonance = 0.5f;        // Filter resonance

    // Coefficient caching
    bool coefficientsDirty = true;
    float cachedFrequency = 0.0f;
    float cachedQFactor = 0.0f;

    double sampleRate = 48000.0;

    void prepare(double sr);
    float processSample(float excitation);
    void reset();
    void calculateCoefficients();
};

//==============================================================================
/**
 * Membrane resonator for giant drums (SVF-based)
 *
 * Models a circular membrane with multiple vibrational modes using State Variable Filters.
 * Giant drums have:
 * - Lower fundamental frequency (larger diameter)
 * - Slower attack (more mass)
 * - Longer sustain (larger air cavity)
 * - More harmonic complexity (larger surface area)
 *
 * Version 2.0: Uses SVF for realistic 2D membrane vibration patterns
 */
class MembraneResonator
{
public:
    struct Parameters
    {
        float fundamentalFrequency = 80.0f;  // Primary mode (Hz)
        float tension = 0.5f;                // Head tension (0.0 = slack, 1.0 = tight)
        float diameterMeters = 1.0f;         // Drum diameter (0.3m to 5.0m+)
        float damping = 0.995f;              // Energy loss coefficient
        float inharmonicity = 0.1f;          // Mode frequency spread
        int numModes = 4;                    // Number of active modes (2-6)
    };

    MembraneResonator();
    ~MembraneResonator() = default;

    void prepare(double sampleRate);
    void reset();

    /** Excite membrane with strike
        @param velocity    Strike velocity (0.0 - 1.0)
        @param force       Strike force (affects initial energy)
        @param contactArea Size of striking surface */
    void strike(float velocity, float force, float contactArea);

    /** Process membrane resonator
        @returns    Membrane displacement */
    float processSample();

    /** Set parameters */
    void setParameters(const Parameters& p);
    Parameters getParameters() const { return params; }

    /** Get current energy (for shell coupling) */
    float getEnergy() const;

private:
    void updateModeFrequencies();
    void updateModeDecays();

    Parameters params;
    std::vector<SVFMembraneMode> svfModes;  // SVF-based modes

    double sr = 48000.0;
    float totalEnergy = 0.0f;

    // Strike excitation
    float strikeEnergy = 0.0f;
};

//==============================================================================
/**
 * Coupled shell/cavity resonator (bidirectional)
 *
 * Models the physical coupling between shell and air cavity using:
 * - Helmholtz resonator for cavity air resonance
 * - Mass-spring-damper for shell vibration
 * - Bidirectional coupling for realistic pitch envelope
 *
 * This creates the characteristic "pitch bend" during drum decay
 * as energy transfers between membrane, shell, and cavity.
 */
class CoupledResonator
{
public:
    struct Parameters
    {
        float cavityFrequency = 120.0f;  // Air cavity resonance (Hz)
        float shellFormant = 300.0f;     // Shell formant (Hz)
        float cavityQ = 2.0f;            // Cavity resonance Q factor
        float shellQ = 1.5f;             // Shell resonance Q factor
        float coupling = 0.3f;           // Membrane ↔ shell coupling

        // Internal physical parameters (calculated)
        float cavityMass = 1.0f;
        float cavityStiffness = 1.0f;
        float cavityDamping = 0.01f;
        float shellMass = 1.0f;
        float shellStiffness = 1.0f;
        float shellDamping = 0.01f;
        float cavityToShellCoupling = 0.1f;
        float shellToCavityCoupling = 0.1f;
        float shellMix = 0.4f;
        float cavityMix = 0.6f;
    };

    CoupledResonator() = default;
    ~CoupledResonator() = default;

    void prepare(double sampleRate);
    void reset();

    /** Process coupled resonator with membrane input
        @param membraneInput    Energy from membrane
        @returns                Shell/cavity output */
    float processSample(float membraneInput);

    void setParameters(const Parameters& p);
    Parameters getParameters() const { return params; }

private:
    void calculateCouplingCoefficients();

    Parameters params;

    // State variables
    float cavityPressure = 0.0f;     // Cavity air pressure
    float cavityVelocity = 0.0f;     // Cavity air velocity
    float shellDisplacement = 0.0f;  // Shell displacement
    float shellVelocity = 0.0f;      // Shell velocity

    double sr = 48000.0;
};

//==============================================================================
/**
 * Shell/cavity resonator for drum body (wrapper for CoupledResonator)
 *
 * Models the air cavity and wooden shell resonance with bidirectional coupling.
 * Giant drums have:
 * - Larger cavity (lower resonance)
 * - Thicker shell (more formant-like resonance)
 * - Strong coupling to membrane (bidirectional)
 *
 * Version 2.0: Uses CoupledResonator for realistic pitch envelope
 */
class ShellResonator
{
public:
    struct Parameters
    {
        float cavityFrequency = 120.0f;  // Air cavity resonance (Hz)
        float shellFormant = 300.0f;     // Shell formant (Hz)
        float cavityQ = 2.0f;            // Cavity resonance Q factor
        float shellQ = 1.5f;             // Shell resonance Q factor
        float coupling = 0.3f;           // Membrane ↔ shell coupling
    };

    ShellResonator();
    ~ShellResonator() = default;

    void prepare(double sampleRate);
    void reset();

    /** Feed membrane energy to shell
        @param membraneEnergy    Energy from membrane */
    void processMembraneEnergy(float membraneEnergy);

    /** Process shell resonator
        @returns    Shell output */
    float processSample();

    void setParameters(const Parameters& p);
    Parameters getParameters() const { return params; }

private:
    Parameters params;
    CoupledResonator coupledResonator;
    float lastMembraneEnergy = 0.0f;
    double sr = 48000.0;
};

//==============================================================================
/**
 * Nonlinear loss/saturation for giant drums
 *
 * Prevents sterile modal ringing by adding:
 * - Saturation (prevents infinite buildup)
 * - Nonlinear damping (high-energy notes decay differently)
 * - Mass simulation (velocity-dependent loss)
 */
class DrumNonlinearLoss
{
public:
    DrumNonlinearLoss();
    ~DrumNonlinearLoss() = default;

    void prepare(double sampleRate);
    void reset();

    /** Process with nonlinear loss
        @param input    Linear signal
        @returns        Signal with nonlinear effects applied */
    float processSample(float input, float velocity);

    void setSaturationAmount(float amount);
    void setMassEffect(float mass);

private:
    float saturationAmount = 0.1f;
    float massEffect = 0.5f;

    double sr = 48000.0;

    float softClip(float x) const;
    float calculateDynamicDamping(float level, float velocity) const;
};

//==============================================================================
/**
 * Room coupling for giant drums
 *
 * Giant drums are perceived in large spaces.
 * This models:
 * - Early reflections emphasis
 * - Very short pre-delay
 * - "Huge room" feel
 */
class DrumRoomCoupling
{
public:
    struct Parameters
    {
        float roomSize = 0.7f;          // Room size (0.0 = small, 1.0 = cathedral)
        float reflectionGain = 0.3f;    // Early reflection level
        float reverbTime = 2.0f;        // Reverb tail (seconds)
        float preDelayMs = 5.0f;        // Pre-delay (milliseconds)
    };

    DrumRoomCoupling();
    ~DrumRoomCoupling() = default;

    void prepare(double sampleRate);
    void reset();

    /** Process with room coupling
        @param input    Dry signal
        @returns        Signal with room effects */
    float processSample(float input);

    void setParameters(const Parameters& p);

private:
    Parameters params;

    // Simple delay line for early reflections
    std::vector<float> earlyReflectionDelay;
    int writeIndex = 0;

    // Reverb tail (simple parallel feedback delay)
    struct ReverbTap
    {
        std::vector<float> delay;
        int writeIndex = 0;
        float feedback = 0.5f;
        float gain = 0.3f;

        void prepare(double sampleRate, float delayTime, float feedbackGain, float tapGain);
        float processSample(float input);
        void reset();
    };

    std::vector<ReverbTap> reverbTaps;

    double sr = 48000.0;
};

//==============================================================================
/**
 * Single drum voice
 *
 * Combines all drum components for one drum sound.
 */
struct GiantDrumVoice
{
    int midiNote = -1;
    float velocity = 0.0f;
    bool active = false;

    // DSP components
    MembraneResonator membrane;
    ShellResonator shell;
    DrumNonlinearLoss nonlinear;
    DrumRoomCoupling room;

    // Giant parameters
    GiantScaleParameters scale;
    GiantGestureParameters gesture;

    void prepare(double sampleRate);
    void reset();
    void trigger(int note, float vel, const GiantGestureParameters& gestureParam,
                 const GiantScaleParameters& scale);
    float processSample();
    bool isActive() const;
};

//==============================================================================
/**
 * Giant Drum voice manager
 *
 * Manages polyphonic drum voices (typically 8-16 voices for drums).
 */
class GiantDrumVoiceManager
{
public:
    GiantDrumVoiceManager();
    ~GiantDrumVoiceManager() = default;

    void prepare(double sampleRate, int maxVoices = 16);
    void reset();

    GiantDrumVoice* findFreeVoice();
    GiantDrumVoice* findVoiceForNote(int note);

    void handleNoteOn(int note, float velocity, const GiantGestureParameters& gesture,
                      const GiantScaleParameters& scale);
    void handleNoteOff(int note);
    void allNotesOff();

    float processSample();
    int getActiveVoiceCount() const;

    void setMembraneParameters(const MembraneResonator::Parameters& params);
    void setShellParameters(const ShellResonator::Parameters& params);
    void setRoomParameters(const DrumRoomCoupling::Parameters& params);

private:
    std::vector<std::unique_ptr<GiantDrumVoice>> voices;
    double currentSampleRate = 48000.0;
};

//==============================================================================
/**
 * Main Aether Giant Drums Pure DSP Instrument
 *
 * Entry point for giant drum synthesis.
 */
class AetherGiantDrumsPureDSP : public InstrumentDSP
{
public:
    AetherGiantDrumsPureDSP();
    ~AetherGiantDrumsPureDSP() override;

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

    const char* getInstrumentName() const override { return "AetherGiantDrums"; }
    const char* getInstrumentVersion() const override { return "1.0.0"; }

private:
    //==============================================================================
    GiantDrumVoiceManager voiceManager_;

    struct Parameters
    {
        // Membrane
        float membraneTension = 0.5f;
        float membraneDiameter = 1.0f;
        float membraneDamping = 0.995f;
        float membraneInharmonicity = 0.1f;
        int membraneNumModes = 4;

        // Shell
        float shellCavityFreq = 120.0f;
        float shellFormant = 300.0f;
        float shellCoupling = 0.3f;

        // Nonlinear
        float saturationAmount = 0.1f;
        float massEffect = 0.5f;

        // Room
        float roomSize = 0.7f;
        float reflectionGain = 0.3f;
        float reverbTime = 2.0f;

        // Giant
        float scaleMeters = 1.0f;
        float massBias = 0.5f;
        float airLoss = 0.3f;
        float transientSlowing = 0.5f;

        // Gesture defaults
        float force = 0.7f;
        float speed = 0.5f;
        float contactArea = 0.6f;
        float roughness = 0.3f;

        // Global
        float masterVolume = 0.8f;

    } params_;

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;
    int maxVoices_ = 16;

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
