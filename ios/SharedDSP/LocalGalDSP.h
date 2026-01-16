/*
  ==============================================================================

    LocalGalPureDSP.h
    Created: December 30, 2025
    Author: Bret Bouchard

    Pure DSP implementation of LOCAL GAL Synthesizer
    - Inherits from DSP::InstrumentDSP (no JUCE dependencies)
    - Headless operation (no GUI)
    - Feel Vector control system (5D: rubber, bite, hollow, growl, wet)
    - Multi-oscillator architecture
    - Multi-mode filter (LP, HP, BP, Notch)
    - ADSR envelope with velocity sensitivity
    - 16-voice polyphony
    - JSON preset save/load system
    - Factory-creatable for dynamic instantiation

  ==============================================================================
*/

#pragma once

#include "dsp/InstrumentDSP.h"
#include "dsp/FastRNG.h"
#include <vector>
#include <array>
#include <memory>
#include <cmath>
#include <functional>
#include <algorithm>
#include <string>

namespace DSP {

//==============================================================================
// Forward Declarations
//==============================================================================

class VoiceManager;

//==============================================================================
// Feel Vector for Intuitive Sound Control
//==============================================================================

struct FeelVector
{
    float rubber = 0.5f;  // Glide & oscillator offset, timing variation
    float bite = 0.5f;    // Filter resonance & envelope amount, brightness
    float hollow = 0.5f;  // Base filter cutoff, warm character, fundamental
    float growl = 0.3f;   // Drive & distortion, character harshness, saturation
    float wet = 0.0f;     // Effects mix, space control, reverb (reserved)

    // Feel vector presets
    static FeelVector getPreset(const std::string& name);
    static void applyPreset(FeelVector& feelVector, const std::string& presetName);

    // Feel vector interpolation
    static FeelVector interpolate(const FeelVector& a, const FeelVector& b, float position);
    static float interpolate(const FeelVector& feelVector, int index);
    static FeelVector interpolateWithSmoothing(const FeelVector& target,
                                               const FeelVector& current,
                                               double smoothingTime);
};

//==============================================================================
// Bandlimited Sawtooth Oscillator (minBLEP technique)
//==============================================================================

class BandlimitedSawtooth
{
public:
    BandlimitedSawtooth();
    ~BandlimitedSawtooth() = default;

    void prepare(double sampleRate);
    void reset();

    void setFrequency(float freqHz);
    float processSample();

private:
    double phase = 0.0;
    double phaseIncrement = 0.0;
    double sampleRate_ = 48000.0;

    // minBLEP tables
    static constexpr int BLEP_SIZE = 16;
    static constexpr int ZERO_CROSSINGS = 8;
    std::vector<float> blepTable_;

    // Discontinuity detection and correction
    int lastOutputSign = 0;
    float accumulatedBlep = 0.0f;
    int blepOffset = 0;

    void generateBlepTable();
    float blep(float x);
};

//==============================================================================
// Oscillator
//==============================================================================

enum class LGWaveform { Sine, Sawtooth, Square, Triangle, Noise };

class LGOscillator
{
public:
    LGOscillator();
    ~LGOscillator() = default;

    void prepare(double sampleRate);
    void reset();

    void setFrequency(float freqHz, double sampleRate);
    void setWaveform(LGWaveform waveform);
    void setDetune(float detune);  // Semitone detune
    void setLevel(float level);
    void setEnabled(bool enabled);

    float processSample();

    LGWaveform waveform = LGWaveform::Sawtooth;
    float detune = 0.0f;
    float level = 0.8f;
    bool enabled = true;
    double phase = 0.0;

private:
    double phaseIncrement = 0.0;
    double sampleRate_ = 48000.0;
    FastRNG rng_;

    // Bandlimited sawtooth for improved sound quality
    BandlimitedSawtooth bandlimitedSaw;
};

//==============================================================================
// State Variable Filter (TPT - Topology Preserving Transform)
//==============================================================================

enum class LGFilterType { LowPass, HighPass, BandPass, Notch };

class LGFilter
{
public:
    LGFilter();
    ~LGFilter() = default;

    void prepare(double sampleRate);
    void reset();

    void setType(LGFilterType type);
    void setCutoff(double cutoff);
    void setResonance(float resonance);
    void setDrive(float drive);

    float processSample(float input);

    LGFilterType type = LGFilterType::LowPass;
    double cutoff = 8000.0;  // Higher cutoff for brighter sound (was 1000.0 - too muffled)
    float resonance = 0.7f;
    float drive = 1.0f;

private:
    double sampleRate_ = 48000.0;

    // TPT SVF state variables
    float s1 = 0.0f;  // Lowpass state
    float s2 = 0.0f;  // Bandpass state

    // Cached coefficients
    float g = 0.0f;   // Frequency parameter
    float k = 0.0f;   // Resonance parameter
    float a1 = 0.0f;  // Coefficient a1
    float a2 = 0.0f;  // Coefficient a2
    float a3 = 0.0f;  // Coefficient a3

    bool coefficientsDirty = true;
    void updateCoefficients();
};

//==============================================================================
// ADSR Envelope
//==============================================================================

class LGEnvelope
{
public:
    LGEnvelope();
    ~LGEnvelope() = default;

    void prepare(double sampleRate);
    void reset();

    void setParameters(float attack, float decay, float sustain, float release);
    void noteOn();
    void noteOff();

    float processSample();
    bool isActive() const;

private:
    enum class State { IDLE, ATTACK, DECAY, SUSTAIN, RELEASE };
    State state = State::IDLE;
    float currentLevel = 0.0f;
    double sampleRate_ = 48000.0;

    float attack = 0.005f;
    float decay = 0.2f;
    float sustain = 0.8f;
    float release = 0.2f;  // 200ms - matches KaneMarco/NexSynth for normalization
};

//==============================================================================
// Voice for Polyphonic Playback
//==============================================================================

struct LGVoice
{
    int midiNote = -1;
    float velocity = 0.0f;
    bool active = false;
    double startTime = 0.0;

    // Synth components
    LGOscillator oscillator;
    LGFilter filter;
    LGEnvelope envelope;

    void prepare(double sampleRate);
    void reset();
    void noteOn(int note, float vel, double currentSampleRate);
    void noteOff(float vel);
    bool isActive() const;
    float renderSample();
    float renderSampleStereo(int channel, float stereoDetune, float stereoFilterOffset);
};

//==============================================================================
// Voice Manager
//==============================================================================

class LGVoiceManager
{
public:
    LGVoiceManager();
    ~LGVoiceManager() = default;

    void prepare(double sampleRate, int samplesPerBlock);
    void reset();

    LGVoice* findFreeVoice();
    LGVoice* findVoiceForNote(int note);

    void handleNoteOn(int note, float velocity);
    void handleNoteOff(int note);
    void allNotesOff();

    void processBlock(float* output, int numSamples);
    int getActiveVoiceCount() const;

    void applyFeelVector(const FeelVector& feelVector);

private:
    std::array<LGVoice, 16> voices_;
    double currentSampleRate_ = 48000.0;
    FeelVector currentFeelVector_;
};

//==============================================================================
// Main LocalGal Pure DSP Instrument
//==============================================================================

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

    // Panic: Immediately kill all voices (for stop button)
    void panic() override;

private:
    LGVoiceManager voiceManager_;

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

        // Structure (Mutable Instruments-style harmonic complexity)
        // 0.0 = simple, pure, harmonic (clean sine-like tones)
        // 0.5 = balanced (default)
        // 1.0 = complex, rich, inharmonic (wavefolding, distortion)
        float structure = 0.5f;

        // Stereo Enhancement
        float stereoWidth = 0.5f;      // 0=mono, 1=full stereo
        float stereoDetune = 0.02f;    // Oscillator detune between channels (semitones)
        float stereoFilterOffset = 0.1f; // Filter cutoff offset between channels (normalized)
        bool pingPongDelay = false;    // Stereo ping-pong delay

        // Global
        float masterVolume = 0.25f;  // Further reduced to prevent clipping (was 0.5)
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

    // DC blocking filter state (per channel)
    float dcBlockState[2] = {0.0f, 0.0f};
    float dcBlockCoefficient = 0.9995f;  // ~20Hz cutoff at 48kHz

    void applyParameters();
    void updateFeelVector(double deltaTime);
    void processStereoSample(float& left, float& right);

    float calculateFrequency(int midiNote, float bend = 0.0f) const;

    bool writeJsonParameter(const char* name, double value, char* buffer,
                            int& offset, int bufferSize) const;
    bool parseJsonParameter(const char* json, const char* param, double& value) const;
};

//==============================================================================
// Utility Function Declarations (defined in NexSynthDSP.h)
//==============================================================================
// Note: midiToFrequency, lerp, and clamp are defined in NexSynthDSP.h
// to avoid ODR violations across multiple instrument headers

} // namespace DSP
