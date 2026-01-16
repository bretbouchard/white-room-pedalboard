/*
  ==============================================================================

    FilterGatePureDSP.h
    Created: December 30, 2025
    Author: Bret Bouchard

    Pure DSP implementation of Filter Gate
    - 8 filter modes (LP, HP, BP, Notch, Peak, Bell, HS, LS)
    - 5 gate trigger modes (Sidechain, ADSR, LFO, Velocity, Manual)
    - Stereo processing with parameter smoothing
    - Factory-creatable for dynamic instantiation
    - Zero JUCE dependencies

  ==============================================================================
*/

#pragma once

#include <vector>
#include <array>
#include <memory>
#include <cmath>
#include <functional>
#include <algorithm>
#include <string>

namespace DSP {

//==============================================================================
// Filter Modes
//==============================================================================

enum class FilterMode
{
    LowPass,
    HighPass,
    BandPass,
    Notch,
    Peak,
    Bell,
    HighShelf,
    LowShelf
};

//==============================================================================
// Gate Trigger Modes
//==============================================================================

enum class GateTriggerMode
{
    Sidechain,      // Triggered by external sidechain input
    ADSR,           // Triggered by ADSR envelope
    LFO,            // Triggered by LFO modulation
    Velocity,       // Triggered by MIDI velocity
    Manual          // Manual control
};

//==============================================================================
// Biquad Filter (Stereo)
//==============================================================================

struct BiquadFilter
{
    void prepare(double sampleRate);
    void reset();

    void setCoefficients(float b0, float b1, float b2, float a1, float a2);
    void setLowPass(float frequency, float resonance, double sampleRate);
    void setHighPass(float frequency, float resonance, double sampleRate);
    void setBandPass(float frequency, float resonance, double sampleRate);
    void setNotch(float frequency, float resonance, double sampleRate);
    void setPeak(float frequency, float resonance, float gain, double sampleRate);
    void setBell(float frequency, float resonance, float gain, double sampleRate);
    void setHighShelf(float frequency, float resonance, float gain, double sampleRate);
    void setLowShelf(float frequency, float resonance, float gain, double sampleRate);

    float processSampleLeft(float input);
    float processSampleRight(float input);
    void processStereo(float* left, float* right, int numSamples);

private:
    // Left channel state
    float x1_left = 0.0f;
    float x2_left = 0.0f;
    float y1_left = 0.0f;
    float y2_left = 0.0f;

    // Right channel state
    float x1_right = 0.0f;
    float x2_right = 0.0f;
    float y1_right = 0.0f;
    float y2_right = 0.0f;

    // Coefficients
    float b0 = 1.0f, b1 = 0.0f, b2 = 0.0f;
    float a1 = 0.0f, a2 = 0.0f;
};

//==============================================================================
// ADSR Envelope
//==============================================================================

struct ADSREnvelope
{
    void prepare(double sampleRate);
    void reset();
    void trigger(float velocity = 1.0f);
    void release();
    float processSample();

    void setAttack(float seconds);
    void setDecay(float seconds);
    void setSustain(float level);
    void setRelease(float seconds);

    bool isActive() const { return amplitude > 0.0001f; }

private:
    double sampleRate = 48000.0;

    enum class Stage { Attack, Decay, Sustain, Release, Idle };
    Stage stage = Stage::Idle;

    float amplitude = 0.0f;
    float sustainLevel = 0.7f;

    float attackRate = 0.001f;
    float decayRate = 0.001f;
    float releaseRate = 0.001f;
};

//==============================================================================
// LFO (Multiple Waveforms)
//==============================================================================

struct LFO
{
    enum class Waveform { Sine, Triangle, Sawtooth, Square, SampleAndHold };

    void prepare(double sampleRate);
    void reset();
    void setFrequency(float hz);
    void setDepth(float depth);
    void setWaveform(Waveform waveform);
    void setBipolar(bool bipolar);

    float processSample();
    void processBlock(float* output, int numSamples);

private:
    double sampleRate = 48000.0;
    float phase = 0.0f;
    float frequency = 1.0f;
    float depth = 1.0f;
    float lastOutput = 0.0f;
    Waveform waveform = Waveform::Sine;
    bool bipolar = true;
};

//==============================================================================
// Sidechain Envelope Follower
//==============================================================================

struct SidechainFollower
{
    void prepare(double sampleRate);
    void reset();
    void processSample(float input);
    float getEnvelope() const { return envelope; }

    void setAttack(float seconds);
    void setRelease(float seconds);
    void setSensitivity(float sensitivity);

private:
    double sampleRate = 48000.0;
    float envelope = 0.0f;
    float attackRate = 0.001f;
    float releaseRate = 0.001f;
    float sensitivity = 1.0f;
};

//==============================================================================
// Gate (with Attack/Release Smoothing)
//==============================================================================

struct Gate
{
    void prepare(double sampleRate);
    void reset();
    void processBlock(float* output, int numSamples, bool targetOpen);

    void setAttack(float seconds);
    void setRelease(float seconds);
    void setThreshold(float threshold);
    void setHysteresis(float hysteresis);

    bool isOpen() const { return current > 0.5f; }

private:
    double sampleRate = 48000.0;
    float current = 0.0f;
    float target = 0.0f;
    float attackRate = 0.001f;
    float releaseRate = 0.001f;
    float threshold = 0.5f;
    float hysteresis = 0.02f;
};

//==============================================================================
// Main Filter Gate Effect
//==============================================================================

class FilterGatePureDSP
{
public:
    FilterGatePureDSP();
    ~FilterGatePureDSP();

    bool prepare(double sampleRate, int blockSize);
    void reset();
    void process(float** inputs, float** outputs, int numChannels, int numSamples);

    // Filter parameters
    void setFilterMode(FilterMode mode);
    void setFrequency(float frequency);
    void setResonance(float resonance);
    void setGain(float gain);

    // Gate parameters
    void setGateTriggerMode(GateTriggerMode mode);
    void setGateThreshold(float threshold);
    void setGateAttack(float attackMs);
    void setGateRelease(float releaseMs);
    void setGateRange(float rangeDb);

    // Sidechain
    void processSidechain(const float* sidechain, int numSamples);

    // ADSR
    void noteOn(float velocity = 1.0f);
    void noteOff();

    // LFO
    void setLFOFrequency(float hz);
    void setLFODepth(float depth);
    void setLFOWaveform(LFO::Waveform waveform);

    // Manual control
    void setManualControl(float value);

    // Preset management
    bool savePreset(char* jsonBuffer, int jsonBufferSize) const;
    bool loadPreset(const char* jsonData);

    const char* getEffectName() const { return "FilterGate"; }
    const char* getEffectVersion() const { return "1.0.0"; }

private:
    // Filter
    BiquadFilter filter_;

    // Modulation sources
    ADSREnvelope adsr_;
    LFO lfo_;
    SidechainFollower sidechain_;

    // Gate
    Gate gate_;

    // Parameters
    struct Parameters
    {
        FilterMode filterMode = FilterMode::LowPass;
        float frequency = 1000.0f;
        float resonance = 1.0f;
        float gain = 0.0f;

        GateTriggerMode triggerMode = GateTriggerMode::ADSR;
        float gateThreshold = 0.5f;
        float gateAttack = 1.0f;
        float gateRelease = 50.0f;
        float gateRange = 24.0f;

        float lfoFrequency = 1.0f;
        float lfoDepth = 0.0f;
        LFO::Waveform lfoWaveform = LFO::Waveform::Sine;

        float manualControl = 0.0f;
        float sidechainSensitivity = 1.0f;
    } params_;

    // Smoothing
    struct Smoother
    {
        float current = 0.0f;
        float target = 0.0f;
        float rate = 0.001f;

        void prepare(double sampleRate, float timeMs);
        void reset();
        float processSample();
    };

    Smoother frequencySmoother_;
    Smoother gainSmoother_;

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;

    // Helper methods
    void updateFilter();
    float getModulationValue();

    // JSON helpers
    bool writeJsonParameter(const char* name, double value, char* buffer,
                            int& offset, int bufferSize) const;
    bool parseJsonParameter(const char* json, const char* param, double& value) const;
};

//==============================================================================
// Inline Helper Functions
//==============================================================================

inline float lerp(float a, float b, float t) { return a + t * (b - a); }
inline float clamp(float x, float min, float max) { return (x < min) ? min : (x > max) ? max : x; }
inline float dbToGain(float db) { return std::pow(10.0f, db * 0.05f); }
inline float gainToDb(float gain) { return 20.0f * std::log10(gain); }

} // namespace DSP
