/*
  ==============================================================================

    NexSynthDSP.h
    Created: December 30, 2025
    Author:  Bret Bouchard

    Pure DSP implementation of NEX FM Synthesizer for tvOS
    - Inherits from DSP::InstrumentDSP (no JUCE dependencies)
    - Headless operation (no GUI)
    - JSON preset save/load system
    - Factory-creatable for dynamic instantiation

  ==============================================================================
*/

#pragma once

#include "dsp/InstrumentDSP.h"
#include "dsp/FastMath.h"
#include <vector>
#include <array>
#include <memory>
#include <cmath>

namespace DSP {

//==============================================================================
// FM Operator
//==============================================================================

/**
 * @brief Single FM operator with oscillator and envelope
 */
struct FMOperator
{
    // Oscillator state
    double phase = 0.0;
    double phaseIncrement = 0.0;
    double previousOutput = 0.0;  // For feedback

    // Envelope state
    struct Envelope {
        double attack = 0.01;
        double decay = 0.1;
        double sustain = 0.7;
        double releaseTime = 0.2;

        double currentLevel = 0.0;
        double envelopeTime = 0.0;
        bool isReleased = false;
        bool isActive = false;

        void reset();
        void start();
        void release();
        double process(double sampleRate, int numSamples);
    } envelope;

    // Modulation
    double modulationIndex = 1.0;
    double feedbackAmount = 0.0;
    double fixedFrequency = 0.0; // Hz, 0 = ratio mode

    // Frequency
    double frequencyRatio = 1.0;  // Ratio to fundamental
    double detune = 0.0;          // Cents
    double detuneFactor = 1.0;    // Cached: 2^(detune/1200) - computed when detune changes

    // Output level
    double outputLevel = 1.0;

    // Reset operator state
    void reset();

    // Process single sample (with feedback support)
    double process(double modulation, double sampleRate, double feedback = 0.0);
};

//==============================================================================
// FM Algorithms (Yamaha DX7 inspired)
//==============================================================================

/**
 * @brief FM Algorithm definitions
 *
 * Defines how operators connect to each other in the FM synthesis matrix.
 * Each algorithm is a 5x5 matrix where matrix[i][j] represents
 * the amount operator j modulates operator i.
 *
 * Based on classic DX7 algorithms with 5 operators (DX7 has 6).
 */
struct FMAlgorithms
{
    static constexpr int NUM_ALGORITHMS = 32;
    static constexpr int NUM_OPERATORS = 5;

    // Algorithm 1: All operators in series (complex evolution)
    static constexpr double algorithm1[NUM_OPERATORS][NUM_OPERATORS] = {
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 1: carrier
        {1.0, 0.0, 0.0, 0.0, 0.0},  // Op 2: modulated by Op 1
        {0.0, 1.0, 0.0, 0.0, 0.0},  // Op 3: modulated by Op 2
        {0.0, 0.0, 1.0, 0.0, 0.0},  // Op 4: modulated by Op 3
        {0.0, 0.0, 0.0, 1.0, 0.0}   // Op 5: modulated by Op 4
    };

    // Algorithm 2: 2 parallel chains of 2 + 1 (rich harmonics)
    static constexpr double algorithm2[NUM_OPERATORS][NUM_OPERATORS] = {
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 1: carrier
        {1.0, 0.0, 0.0, 0.0, 0.0},  // Op 2: modulates Op 1
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 3: carrier
        {0.0, 0.0, 1.0, 0.0, 0.0},  // Op 4: modulates Op 3
        {0.0, 0.0, 0.0, 0.0, 0.0}   // Op 5: carrier
    };

    // Algorithm 3: 3 parallel chains (bright bells)
    static constexpr double algorithm3[NUM_OPERATORS][NUM_OPERATORS] = {
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 1: carrier
        {1.0, 0.0, 0.0, 0.0, 0.0},  // Op 2: modulates Op 1
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 3: carrier
        {0.0, 0.0, 1.0, 0.0, 0.0},  // Op 4: modulates Op 3
        {0.0, 0.0, 0.0, 0.0, 0.0}   // Op 5: carrier
    };

    // Algorithm 16: 1 modulator → 4 carriers (classic DX7 piano)
    static constexpr double algorithm16[NUM_OPERATORS][NUM_OPERATORS] = {
        {1.0, 0.0, 0.0, 0.0, 0.0},  // Op 1: modulated by Op 1
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 2: carrier
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 3: carrier
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 4: carrier
        {0.0, 0.0, 0.0, 0.0, 0.0}   // Op 5: carrier
    };

    // Algorithm 32: 5 carriers (additive synthesis)
    static constexpr double algorithm32[NUM_OPERATORS][NUM_OPERATORS] = {
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 1: carrier
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 2: carrier
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 3: carrier
        {0.0, 0.0, 0.0, 0.0, 0.0},  // Op 4: carrier
        {0.0, 0.0, 0.0, 0.0, 0.0}   // Op 5: carrier
    };

    /**
     * @brief Get algorithm matrix by index
     * @param algorithmIndex Algorithm number (1-32)
     * @return Pointer to 5x5 modulation matrix
     */
    static const double (*getAlgorithm(int algorithmIndex))[NUM_OPERATORS];
};

//==============================================================================
// Synth Voice
//==============================================================================

/**
 * @brief Single polyphonic voice with FM operators
 *
 * Implements batch processing of all operators for better CPU cache utilization
 * and modern CPU pipeline optimization.
 */
class NexSynthVoice
{
public:
    NexSynthVoice();
    ~NexSynthVoice() = default;

    // Voice management
    void startNote(int midiNote, float velocity);
    void stopNote(float velocity);
    bool isActive() const { return isActive_; }
    void reset();  // Reset voice to inactive state

    // Audio processing
    void process(float** outputs, int numChannels, int numSamples, double sampleRate);

    // Get/set
    int getMidiNote() const { return midiNote_; }

    // FM operators (5 operators for classic FM synthesis)
    // Made public for parameter updates from NexSynthDSP::setParameter
    std::array<FMOperator, 5> operators_;
    double getFrequency() const { return frequency_; }

    // Algorithm selection
    void setAlgorithm(int algorithmIndex);
    int getAlgorithm() const { return currentAlgorithm_; }

private:
    // Voice state
    int midiNote_ = 0;
    double frequency_ = 440.0;
    float velocity_ = 0.0f;
    bool isActive_ = false;

    // FM algorithm
    int currentAlgorithm_ = 1;
    const double (*currentAlgorithmMatrix_)[5] = FMAlgorithms::algorithm1;

    // Feedback state for self-modulation
    std::array<double, 5> feedbackOutputs_{0.0, 0.0, 0.0, 0.0, 0.0};

    // Calculate frequency from MIDI note
    double midiToFrequency(int midiNote) const;

    // Batch process all operators (vectorized approach)
    void processAllOperatorsBatch(double sampleRate);

    // Output buffer for batch processing
    std::array<double, 5> operatorOutputs_{0.0, 0.0, 0.0, 0.0, 0.0};
};

//==============================================================================
// NexSynthDSP - Main Instrument
//==============================================================================

/**
 * @brief Pure DSP NEX FM Synthesizer for tvOS
 *
 * 5-operator FM synthesizer with advanced modulation,
 * designed specifically for tvOS deployment.
 *
 * Architecture:
 * - No external plugin dependencies
 * - Headless operation (no GUI)
 * - Factory-creatable
 * - JSON preset system
 * - Real-time safe (no allocations in process())
 */
class NexSynthDSP : public InstrumentDSP
{
public:
    //==============================================================================
    // Construction/Destruction
    //==============================================================================

    NexSynthDSP();
    ~NexSynthDSP() override;

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

    const char* getInstrumentName() const override { return "NexSynth"; }
    const char* getInstrumentVersion() const override { return "1.0.0"; }

    //==============================================================================
    // Internal Methods
    //==============================================================================

private:
    //==============================================================================
    // Voice Management
    //==============================================================================

    static constexpr int maxVoices_ = 16;
    std::array<std::unique_ptr<NexSynthVoice>, maxVoices_> voices_;

    // Find free voice or steal oldest
    NexSynthVoice* findFreeVoice();

    // Find active voice by MIDI note
    NexSynthVoice* findVoiceForNote(int midiNote);

    //==============================================================================
    // Parameters
    //==============================================================================

    struct Parameters
    {
        // Global
        double masterVolume = 1.2;  // Normalized to -6 dB mean (was -9.7 dB at 0.7)
        double pitchBendRange = 2.0;  // Semitones
        int algorithm = 1;  // FM algorithm (1-32)

        // Structure (Mutable Instruments-style harmonic complexity)
        // 0.0 = simple, harmonic FM (clean ratios, minimal feedback)
        // 0.5 = balanced (default)
        // 1.0 = complex, inharmonic FM (exotic ratios, heavy feedback, evolving)
        double structure = 0.5;

        // Stereo Enhancement (Mutable Instruments-style odd/even operator separation)
        double stereoWidth = 0.5f;     // 0=mono, 1=full stereo
        double stereoOperatorDetune = 0.02f; // Operator frequency detune between channels
        bool stereoOddEvenSeparation = true; // Odd operators to left, even to right

        // FM Operators (5 operators)
        struct OperatorParams
        {
            double ratio[5] = {1.0, 2.0, 3.0, 4.0, 5.0};
            double detune[5] = {0.0, 0.0, 0.0, 0.0, 0.0};
            double modulationIndex[5] = {1.0, 1.0, 1.0, 1.0, 1.0};
            double outputLevel[5] = {1.0, 0.5, 0.5, 0.3, 0.2};
            double feedback[5] = {0.0, 0.0, 0.0, 0.0, 0.0};
            double attack[5] = {0.01, 0.01, 0.01, 0.01, 0.01};
            double decay[5] = {0.1, 0.1, 0.1, 0.1, 0.1};
            double sustain[5] = {0.7, 0.7, 0.7, 0.7, 0.7};
            double release[5] = {0.2, 0.2, 0.2, 0.2, 0.2};
        } operatorParams;

    } params_;

    //==============================================================================
    // State
    //==============================================================================

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;

    double pitchBend_ = 0.0;

    // Atomic for thread-safe parameter access
    mutable std::atomic<bool> parametersChanged_{false};

    //==============================================================================
    // Helper Methods
    //==============================================================================

    // Apply parameters to voice
    void applyParameters(NexSynthVoice& voice);

    // MIDI helpers
    double midiToFrequency(int midiNote, double pitchBend = 0.0) const;
    float uint7ToFloat(uint8_t value) const { return static_cast<float>(value) / 127.0f; }

    // JSON helpers
    bool writeJsonParameter(const char* name, double value, char* buffer, int& offset, int bufferSize) const;
    bool parseJsonParameter(const char* json, const char* param, double& value) const;

    //==============================================================================
    // Friend declarations for testing
    //==============================================================================

    friend class NexSynthDSPTest;
};

//==============================================================================
// Inline Helper Functions
//==============================================================================

static inline double midiToFrequency(int midiNote, double pitchBendSemitones = 0.0)
{
    double freq = 440.0 * FastMath::fastPow2((midiNote - 69) / 12.0);
    if (pitchBendSemitones != 0.0)
    {
        freq *= FastMath::fastPow2(pitchBendSemitones / 12.0);
    }
    return freq;
}

static inline double lerp(double a, double b, double t)
{
    return a + t * (b - a);
}

static inline double clamp(double x, double min, double max)
{
    return (x < min) ? min : (x > max) ? max : x;
}

} // namespace DSP
