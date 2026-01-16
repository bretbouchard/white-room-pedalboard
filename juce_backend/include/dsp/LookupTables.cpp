/*
  ==============================================================================

    LookupTables.cpp
    Created: January 9, 2026
    Author: Bret Bouchard

    Implementation of universal lookup tables for Schillinger instruments

  ==============================================================================
*/

#include "dsp/LookupTables.h"
#include <cmath>
#include <algorithm>

namespace SchillingerEcosystem {
namespace DSP {

//==============================================================================
// Singleton implementation
//==============================================================================

LookupTables& LookupTables::getInstance()
{
    static LookupTables instance;
    return instance;
}

//==============================================================================
// Constructor - initialize all tables
//==============================================================================

LookupTables::LookupTables()
    : sineTable_(TABLE_SIZE)
    , expDecayTable_(TABLE_SIZE)
    , rcDecayTable_(TABLE_SIZE)
    , linearDecayTable_(TABLE_SIZE)
    , midiToFreqTable_(MIDI_TABLE_SIZE)
    , resonQTable_(RESON_DAMPING_STEPS, std::vector<float>(TABLE_SIZE))
    , logSweepTable_(TABLE_SIZE)
{
    initSineTable();
    initExpDecayTable();
    initRCDecayTable();
    initLinearDecayTable();
    initMidiToFreqTable();
    initResonQTable();
    initLogSweepTable();
}

//==============================================================================
// Table initialization
//==============================================================================

void LookupTables::initSineTable()
{
    for (int i = 0; i < TABLE_SIZE; ++i)
    {
        float phase = static_cast<float>(i) / static_cast<float>(TABLE_SIZE);
        sineTable_[i] = std::sin(phase * TWO_PI);
    }

    // Ensure wrap-around for interpolation
    // sineTable_[TABLE_SIZE] = sineTable_[0];  // Not needed with proper wrapping
}

void LookupTables::initExpDecayTable()
{
    for (int i = 0; i < TABLE_SIZE; ++i)
    {
        float x = static_cast<float>(i) / static_cast<float>(TABLE_SIZE - 1);
        // Exponential decay: e^(-5x) gives smooth 1.0 -> ~0.0 curve
        expDecayTable_[i] = std::exp(-5.0f * x);
    }
}

void LookupTables::initRCDecayTable()
{
    for (int i = 0; i < TABLE_SIZE; ++i)
    {
        float x = static_cast<float>(i) / static_cast<float>(TABLE_SIZE - 1);
        // RC circuit response: 1 / (1 + x)
        // This simulates natural material damping
        rcDecayTable_[i] = 1.0f / (1.0f + 10.0f * x);
    }
}

void LookupTables::initLinearDecayTable()
{
    for (int i = 0; i < TABLE_SIZE; ++i)
    {
        float x = static_cast<float>(i) / static_cast<float>(TABLE_SIZE - 1);
        linearDecayTable_[i] = 1.0f - x;
    }
}

void LookupTables::initMidiToFreqTable()
{
    // Standard MIDI to frequency conversion
    // freq = 440 * 2^((midi - 69) / 12)
    for (int i = 0; i < MIDI_TABLE_SIZE; ++i)
    {
        midiToFreqTable_[i] = 440.0f * std::pow(2.0f, static_cast<float>(i - 69) / 12.0f);
    }
}

void LookupTables::initResonQTable()
{
    // Create 2D table for frequency-dependent damping
    // Rows: damping values (0 = low damping, 1 = high damping)
    // Cols: normalized frequency (0 = low freq, 1 = high freq)

    for (int d = 0; d < RESON_DAMPING_STEPS; ++d)
    {
        float damping = static_cast<float>(d) / static_cast<float>(RESON_DAMPING_STEPS - 1);

        for (int i = 0; i < TABLE_SIZE; ++i)
        {
            float normalizedFreq = static_cast<float>(i) / static_cast<float>(TABLE_SIZE - 1);

            // Q factor calculation for physical modeling
            // Higher frequencies get lower Q (more damping)
            // Higher damping parameter reduces Q across all frequencies

            float baseQ = 50.0f;  // Base resonance Q
            float freqDependence = 1.0f + 10.0f * normalizedFreq;  // Frequency increases damping
            float dampingFactor = 1.0f + 100.0f * damping;  // Damping parameter reduces Q

            resonQTable_[d][i] = baseQ / (freqDependence * dampingFactor);
        }
    }
}

void LookupTables::initLogSweepTable()
{
    // Logarithmic frequency sweep from 20Hz to 20kHz
    const float minFreq = 20.0f;
    const float maxFreq = 20000.0f;
    const float logMin = std::log(minFreq);
    const float logMax = std::log(maxFreq);

    for (int i = 0; i < TABLE_SIZE; ++i)
    {
        float x = static_cast<float>(i) / static_cast<float>(TABLE_SIZE - 1);
        // Logarithmic interpolation
        float logValue = logMin + x * (logMax - logMin);
        logSweepTable_[i] = std::exp(logValue);
    }
}

//==============================================================================
// Public interface implementations
//==============================================================================

float LookupTables::sine(float phase) const
{
    // Wrap phase to [0, 2π]
    phase = wrapPhase(phase);

    // Convert to table index
    float floatIndex = phase / TWO_PI * static_cast<float>(TABLE_SIZE);
    int index = static_cast<int>(floatIndex);
    float fraction = floatIndex - static_cast<float>(index);

    // Clamp index
    index = std::clamp(index, 0, TABLE_SIZE - 1);
    int nextIndex = (index + 1) % TABLE_SIZE;

    // Linear interpolation
    return lerp(sineTable_[index], sineTable_[nextIndex], fraction);
}

float LookupTables::cosine(float phase) const
{
    // Cosine is just sine with π/2 phase shift
    return sine(phase + static_cast<float>(M_PI) * 0.5f);
}

float LookupTables::expDecay(float index) const
{
    // Clamp index to [0, 1]
    index = std::clamp(index, 0.0f, 1.0f);

    float floatIndex = index * static_cast<float>(TABLE_SIZE - 1);
    int idx = static_cast<int>(floatIndex);
    float fraction = floatIndex - static_cast<float>(idx);

    idx = std::clamp(idx, 0, TABLE_SIZE - 2);
    int nextIdx = idx + 1;

    return lerp(expDecayTable_[idx], expDecayTable_[nextIdx], fraction);
}

float LookupTables::rcDecay(float index) const
{
    // Clamp index to [0, 1]
    index = std::clamp(index, 0.0f, 1.0f);

    float floatIndex = index * static_cast<float>(TABLE_SIZE - 1);
    int idx = static_cast<int>(floatIndex);
    float fraction = floatIndex - static_cast<float>(idx);

    idx = std::clamp(idx, 0, TABLE_SIZE - 2);
    int nextIdx = idx + 1;

    return lerp(rcDecayTable_[idx], rcDecayTable_[nextIdx], fraction);
}

float LookupTables::linearDecay(float index) const
{
    // Clamp index to [0, 1]
    index = std::clamp(index, 0.0f, 1.0f);

    float floatIndex = index * static_cast<float>(TABLE_SIZE - 1);
    int idx = static_cast<int>(floatIndex);
    float fraction = floatIndex - static_cast<float>(idx);

    idx = std::clamp(idx, 0, TABLE_SIZE - 2);
    int nextIdx = idx + 1;

    return lerp(linearDecayTable_[idx], linearDecayTable_[nextIdx], fraction);
}

float LookupTables::midiToFreq(float midiNote) const
{
    // Clamp to MIDI range
    midiNote = std::clamp(midiNote, 0.0f, static_cast<float>(MIDI_TABLE_SIZE - 1));

    int note = static_cast<int>(midiNote);
    float fraction = midiNote - static_cast<float>(note);

    note = std::clamp(note, 0, MIDI_TABLE_SIZE - 2);
    int nextNote = note + 1;

    return lerp(midiToFreqTable_[note], midiToFreqTable_[nextNote], fraction);
}

float LookupTables::midiToFreqWithBend(float midiNote, float pitchBendSemitones) const
{
    float baseFreq = midiToFreq(midiNote);

    // Apply pitch bend using power of 2
    // freq *= 2^(semitones / 12)
    if (pitchBendSemitones != 0.0f)
    {
        float bendRatio = std::pow(2.0f, pitchBendSemitones / 12.0f);
        baseFreq *= bendRatio;
    }

    return baseFreq;
}

float LookupTables::detuneToRatio(float detuneCents) const
{
    // Convert cents to frequency ratio
    // ratio = 2^(cents / 1200)
    return std::pow(2.0f, detuneCents / 1200.0f);
}

float LookupTables::resonQ(float normalizedFreq, float damping) const
{
    // Clamp parameters
    normalizedFreq = std::clamp(normalizedFreq, 0.0f, 1.0f);
    damping = std::clamp(damping, 0.0f, 1.0f);

    // Convert to table indices
    float freqIndex = normalizedFreq * static_cast<float>(TABLE_SIZE - 1);
    int freqIdx = static_cast<int>(freqIndex);
    float freqFraction = freqIndex - static_cast<float>(freqIdx);

    float dampIndex = damping * static_cast<float>(RESON_DAMPING_STEPS - 1);
    int dampIdx = static_cast<int>(dampIndex);
    float dampFraction = dampIndex - static_cast<float>(dampIdx);

    // Clamp indices
    freqIdx = std::clamp(freqIdx, 0, TABLE_SIZE - 2);
    dampIdx = std::clamp(dampIdx, 0, RESON_DAMPING_STEPS - 2);

    // Bilinear interpolation
    float q00 = resonQTable_[dampIdx][freqIdx];
    float q01 = resonQTable_[dampIdx][freqIdx + 1];
    float q10 = resonQTable_[dampIdx + 1][freqIdx];
    float q11 = resonQTable_[dampIdx + 1][freqIdx + 1];

    float q0 = lerp(q00, q01, freqFraction);
    float q1 = lerp(q10, q11, freqFraction);

    return lerp(q0, q1, dampFraction);
}

float LookupTables::logSweep(float index) const
{
    return logSweepRange(index, 20.0f, 20000.0f);
}

float LookupTables::logSweepRange(float index, float minFreq, float maxFreq) const
{
    // Clamp index
    index = std::clamp(index, 0.0f, 1.0f);

    float floatIndex = index * static_cast<float>(TABLE_SIZE - 1);
    int idx = static_cast<int>(floatIndex);
    float fraction = floatIndex - static_cast<float>(idx);

    idx = std::clamp(idx, 0, TABLE_SIZE - 2);
    int nextIdx = idx + 1;

    // Get interpolated value from table
    float tableValue = lerp(logSweepTable_[idx], logSweepTable_[nextIdx], fraction);

    // Scale to desired range
    const float tableMin = 20.0f;
    const float tableMax = 20000.0f;

    // Map from table range to desired range
    float logTableMin = std::log(tableMin);
    float logTableMax = std::log(tableMax);
    float logMin = std::log(minFreq);
    float logMax = std::log(maxFreq);

    float logValue = std::log(tableValue);
    float normalizedLog = (logValue - logTableMin) / (logTableMax - logTableMin);
    float resultLog = logMin + normalizedLog * (logMax - logMin);

    return std::exp(resultLog);
}

//==============================================================================
// Utility functions
//==============================================================================

float LookupTables::lerp(float a, float b, float t)
{
    return a + t * (b - a);
}

float LookupTables::wrapPhase(float phase)
{
    constexpr float TWO_PI = 2.0f * M_PI;

    // Wrap to [0, 2π]
    phase = fmodf(phase, TWO_PI);
    if (phase < 0.0f)
        phase += TWO_PI;

    return phase;
}

float LookupTables::wrapPhase01(float phase)
{
    // Wrap to [0, 1]
    phase = fmodf(phase, 1.0f);
    if (phase < 0.0f)
        phase += 1.0f;

    return phase;
}

} // namespace DSP
} // namespace SchillingerEcosystem
