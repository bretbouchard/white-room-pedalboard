/*
  ==============================================================================

    SamSamplerDSP.h
    Created: December 30, 2025
    Author:  Bret Bouchard

    Pure DSP implementation of Sam Sampler for tvOS
    - Inherits from DSP::InstrumentDSP (no JUCE dependencies)
    - Headless operation (no GUI)
    - SF2 SoundFont file loading
    - JSON preset save/load system
    - Factory-creatable for dynamic instantiation

  ==============================================================================
*/

#pragma once

#include "dsp/InstrumentDSP.h"
#include <vector>
#include <array>
#include <memory>
#include <cmath>
#include <functional>

namespace DSP {

//==============================================================================
// Sample Data Structure
//==============================================================================

/**
 * @brief Audio sample data
 */
struct Sample
{
    std::vector<float> audioData;
    int numChannels = 1;
    int sampleRate = 44100;
    int numSamples = 0;
    double rootNote = 60.0;      // MIDI note number (60 = C4)
    double pitchCorrection = 0.0; // cents

    bool isValid() const { return !audioData.empty() && numSamples > 0; }
};

//==============================================================================
// Envelope Stage Types
//==============================================================================

/**
 * @brief Envelope curve types for each stage
 */
enum class EnvelopeCurve
{
    Linear,         // Straight line
    Exponential,    // Natural decay/growth curve
    Logarithmic,    // Inverted exponential
    SCurve          // Smooth S-curve (ease-in-ease-out)
};

/**
 * @brief Enhanced multi-stage envelope generator
 *
 * Supports 5 stages: Attack -> Hold -> Decay -> Sustain -> Release
 * Each stage can have different curve types for natural envelope shaping
 */
struct ADSREnvelope
{
    // Stage durations (seconds)
    double attack = 0.01;
    double hold = 0.0;       // NEW: Hold at peak before decay
    double decay = 0.1;
    double sustain = 0.7;    // Level (0-1)
    double releaseTime = 0.2;

    // Envelope curves
    EnvelopeCurve attackCurve = EnvelopeCurve::Exponential;
    EnvelopeCurve decayCurve = EnvelopeCurve::Exponential;
    EnvelopeCurve releaseCurve = EnvelopeCurve::Exponential;

    // Runtime state
    double currentLevel = 0.0;
    double envelopeTime = 0.0;
    bool isReleased = false;
    bool isActive = false;

    void reset();
    void start();
    void release();
    double process(double sampleRate, int numSamples);

private:
    // Apply curve to normalized position (0-1)
    double applyCurve(double t, EnvelopeCurve curve) const;
};

//==============================================================================
// SVF Filter Types
//==============================================================================

/**
 * @brief State Variable Filter types
 */
enum class FilterType
{
    Lowpass,
    Bandpass,
    Highpass,
    Notch
};

/**
 * @brief State Variable Filter implementation
 *
 * Transistor ladder-style filter using TPT topology
 * Provides smooth parameter changes and excellent stability
 */
struct StateVariableFilter
{
    FilterType type = FilterType::Lowpass;
    double cutoff = 20000.0;      // Hz
    double resonance = 0.0;       // 0-1 (Q = 0.5 to 16)
    double sampleRate = 48000.0;

    // Filter state (stereo)
    double s1[2] = {0.0, 0.0};    // State 1
    double s2[2] = {0.0, 0.0};    // State 2

    // Smoothed parameters
    double cutoffSmooth = 20000.0;
    double resonanceSmooth = 0.0;
    double smoothingCoeff = 0.999; // Smoothing coefficient

    // Coefficient caching
    bool coefficientsDirty = true;
    double cachedG = 0.0;
    double cachedR = 0.0;
    double cachedH = 0.0;

    void reset();
    void prepare(double sampleRate);
    void setParameters(double cutoff, double resonance);
    void process(float** samples, int numChannels, int numSamples);
};

//==============================================================================
// Sampler Voice
//==============================================================================

/**
 * @brief Single polyphonic voice for sample playback
 *
 * Enhanced with per-voice SVF filtering and improved sample interpolation
 */
class SamSamplerVoice
{
public:
    SamSamplerVoice();
    ~SamSamplerVoice() = default;

    // Voice management
    void startNote(int midiNote, float velocity, std::shared_ptr<Sample> sample);
    void stopNote(float velocity);
    bool isActive() const { return isActive_; }
    void reset();

    // Audio processing
    void process(float** outputs, int numChannels, int numSamples, double sampleRate);

    // Get/set
    int getMidiNote() const { return midiNote_; }
    double getFrequency() const { return frequency_; }

    // Filter control
    void setFilterParameters(double cutoff, double resonance, FilterType type);

    // Envelope control
    void setEnvelopeParameters(double attack, double hold, double decay, double sustain, double release,
                               EnvelopeCurve attackCurve, EnvelopeCurve decayCurve, EnvelopeCurve releaseCurve);

    // Sample interpolation
    void setInterpolationQuality(int quality); // 0=linear, 1=cubic

private:
    // Voice state
    int midiNote_ = 0;
    double frequency_ = 440.0;
    float velocity_ = 0.0f;
    bool isActive_ = false;

    // Sample playback
    std::shared_ptr<Sample> sample_;
    double playPosition_ = 0.0;
    double playbackRate_ = 1.0;

    // Envelope
    ADSREnvelope envelope_;

    // Per-voice filter
    StateVariableFilter filter_;
    bool filterEnabled_ = false;

    // Interpolation quality
    int interpolationQuality_ = 1; // 0=linear, 1=cubic

    // Loop handling
    bool isLooping_ = false;
    double loopStart_ = 0.0;
    double loopEnd_ = 0.0;
    double loopCrossfade_ = 0.0; // seconds

    // Calculate frequency from MIDI note
    double midiToFrequency(int midiNote) const;

    // Interpolation methods
    double interpolateLinear(double position) const;
    double interpolateCubic(double position) const;

    // Loop handling with crossfade
    double processLoopCrossfade(double position, int channel);
};

//==============================================================================
// SoundFont 2 (SF2) Reader
//==============================================================================

/**
 * @brief SF2 file parser (simplified for Phase 0)
 */
class SF2Reader
{
public:
    /**
     * @brief SF2 instrument zone
     */
    struct Zone
    {
        int keyRangeLow = 0;
        int keyRangeHigh = 127;
        int velocityRangeLow = 0;
        int velocityRangeHigh = 127;
        int sampleIndex = -1;
        int rootKey = 60;
        double tuning = 0.0; // cents
    };

    /**
     * @brief SF2 instrument
     */
    struct Instrument
    {
        std::string name;
        int presetNumber = 0;
        int bank = 0;
        std::vector<Zone> zones;
    };

    /**
     * @brief Load SF2 file from path
     */
    bool loadFile(const char* filePath);

    /**
     * @brief Get number of instruments
     */
    int getInstrumentCount() const { return static_cast<int>(instruments_.size()); }

    /**
     * @brief Get instrument by index
     */
    const Instrument* getInstrument(int index) const;

    /**
     * @brief Get sample by index
     */
    const Sample* getSample(int index) const;

    /**
     * @brief Find sample for MIDI note and velocity
     */
    const Sample* findSample(int instrumentIndex, int midiNote, float velocity) const;

    /**
     * @brief Check if SF2 is loaded
     */
    bool isLoaded() const { return !instruments_.empty(); }

    /**
     * @brief Get SF2 metadata
     */
    const char* getRomName() const { return romName_.c_str(); }
    const char* getRomVersion() const { return romVersion_.c_str(); }

private:
    std::string romName_;
    std::string romVersion_;
    std::vector<std::unique_ptr<Sample>> samples_;
    std::vector<Instrument> instruments_;

    bool parseRIFF(const char* filePath);
    bool parseChunk(const std::vector<uint8_t>& data, int& offset);
};

//==============================================================================
// SamSamplerDSP - Main Instrument
//==============================================================================

/**
 * @brief Pure DSP Sam Sampler for tvOS
 *
 * Professional sampler with SF2 SoundFont support and sample playback.
 *
 * Architecture:
 * - No external plugin dependencies
 * - Headless operation (no GUI)
 * - Factory-creatable
 * - JSON preset system
 * - Real-time safe (no allocations in process())
 */
class SamSamplerDSP : public InstrumentDSP
{
public:
    //==============================================================================
    // Construction/Destruction
    //==============================================================================

    SamSamplerDSP();
    ~SamSamplerDSP() override;

    //==============================================================================
    // InstrumentDSP Interface Implementation
    //==============================================================================

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

    const char* getInstrumentName() const override { return "SamSampler"; }
    const char* getInstrumentVersion() const override { return "1.0.0"; }

    //==============================================================================
    // SF2 SoundFont Management
    //==============================================================================

    /**
     * Load SF2 file from path
     */
    bool loadSoundFont(const char* filePath);

    /**
     * Get number of SF2 instruments
     */
    int getSoundFontInstrumentCount() const;

    /**
     * Get SF2 instrument name
     */
    const char* getSoundFontInstrumentName(int index) const;

    /**
     * Select SF2 instrument by index
     */
    bool selectSoundFontInstrument(int index);

    /**
     * Check if SF2 is loaded
     */
    bool isSoundFontLoaded() const { return sf2Reader_ != nullptr && sf2Reader_->isLoaded(); }

    //==============================================================================
    // Internal Methods
    //==============================================================================

private:
    //==============================================================================
    // Voice Management
    //==============================================================================

    static constexpr int maxVoices_ = 16;
    std::array<std::unique_ptr<SamSamplerVoice>, maxVoices_> voices_;

    // Find free voice or steal oldest
    SamSamplerVoice* findFreeVoice();

    // Find active voice by MIDI note
    SamSamplerVoice* findVoiceForNote(int midiNote);

    //==============================================================================
    // Parameters
    //==============================================================================

    struct Parameters
    {
        // Global
        double masterVolume = 1.1;  // Reduced to prevent clipping (was 1.3)
        double pitchBendRange = 2.0;  // Semitones

        // Sample playback
        double basePitch = 1.0;       // Playback rate multiplier
        double sampleStart = 0.0;     // Sample start position (0-1)
        double sampleEnd = 1.0;       // Sample end position (0-1)
        bool loopEnabled = false;
        double loopStart = 0.0;
        double loopEnd = 1.0;
        double crossfade = 0.01;      // Loop crossfade (seconds)

        // Amplitude envelope (global, affects all voices)
        double envAttack = 0.01;
        double envHold = 0.0;         // NEW: Hold time
        double envDecay = 0.1;
        double envSustain = 0.7;
        double envRelease = 0.2;

        // Envelope curves (0=linear, 1=exp, 2=log, 3=scurve)
        int envAttackCurve = 1;       // Default exponential
        int envDecayCurve = 1;
        int envReleaseCurve = 1;

        // Filter (per-voice)
        double filterCutoff = 20000.0; // Hz
        double filterResonance = 0.0;  // 0-1
        bool filterEnabled = false;
        int filterType = 0;           // 0=LP, 1=BP, 2=HP, 3=Notch

        // Effects
        double reverbMix = 0.0;        // 0-1
        double delayMix = 0.0;         // 0-1
        double drive = 0.0;            // 0-1 (distortion)

        // Structure (Mutable Instruments-style harmonic complexity)
        // 0.0 = simple, pure playback (clean sample, minimal processing)
        // 0.5 = balanced (default)
        // 1.0 = complex, rich (sample variation, filter modulation, envelope shaping)
        double structure = 0.5;

        // Stereo Enhancement
        double stereoWidth = 0.5f;     // 0=mono, 1=full stereo
        double stereoPositionOffset = 0.0; // Sample position offset between channels (0-1)
        double stereoFilterSpread = 0.1f;  // Filter cutoff spread between channels

    } params_;

    //==============================================================================
    // State
    //==============================================================================

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;
    double pitchBend_ = 0.0;

    // SF2 reader
    std::unique_ptr<SF2Reader> sf2Reader_;
    int currentSoundFontInstrument_ = 0;

    // Sample cache (for shared ownership with voices)
    std::vector<std::shared_ptr<Sample>> sampleCache_;

    //==============================================================================
    // Helper Methods
    //==============================================================================

    // Apply parameters to voice
    void applyParameters(SamSamplerVoice& voice);

    // Audio processing helpers
    void processStereoSample(float& left, float& right, double phase);
    void applyFilter(float** samples, int numChannels, int numSamples);
    void applyEffects(float** samples, int numChannels, int numSamples);

    // Soft clipping
    inline float softClip(float x) const;

    // JSON helpers
    bool writeJsonParameter(const char* name, double value, char* buffer, int& offset, int bufferSize) const;
    bool parseJsonParameter(const char* json, const char* param, double& value) const;

    //==============================================================================
    // Friend declarations for testing
    //==============================================================================

    friend class SamSamplerDSPTest;
};

//==============================================================================
// Utility Function Declarations (defined in NexSynthDSP.h)
//==============================================================================
// Note: midiToFrequency, lerp, and clamp are defined in NexSynthDSP.h
// to avoid ODR violations across multiple instrument headers

} // namespace DSP
