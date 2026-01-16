/*
  ==============================================================================

    DSPTestFramework.h
    Created: 15 Jan 2025
    Author:  Bret Bouchard

    Test utilities for TDD development of pure DSP instruments

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <vector>
#include <cstdint>  // For uint8_t

namespace DSPTestFramework {

/**
 * @brief Test utility class for DSP audio processing tests
 *
 * Provides helper methods to create test buffers, analyze output,
 * and verify DSP behavior in unit tests.
 */
class Framework
{
public:
    //==============================================================================
    // Buffer Creation Helpers
    //==============================================================================

    /**
     * Create a buffer filled with silence
     */
    static juce::AudioBuffer<float> createSilentBuffer(int numChannels, int numSamples)
    {
        juce::AudioBuffer<float> buffer(numChannels, numSamples);
        buffer.clear();
        return buffer;
    }

    /**
     * Create a sine wave test buffer
     * @param frequency Frequency in Hz
     * @param duration Duration in seconds
     * @param sampleRate Sample rate in Hz
     * @param amplitude Peak amplitude (0.0 to 1.0)
     */
    static juce::AudioBuffer<float> createSineBuffer(float frequency, float duration,
                                                      float sampleRate, float amplitude = 1.0f)
    {
        const int numSamples = static_cast<int>(duration * sampleRate);
        juce::AudioBuffer<float> buffer(1, numSamples); // Mono

        for (int i = 0; i < numSamples; ++i)
        {
            float t = static_cast<float>(i) / sampleRate;
            buffer.setSample(0, i, amplitude * std::sin(2.0f * juce::MathConstants<float>::pi * frequency * t));
        }

        return buffer;
    }

    /**
     * Create a sawtooth wave test buffer
     */
    static juce::AudioBuffer<float> createSawtoothBuffer(float frequency, float duration,
                                                          float sampleRate, float amplitude = 1.0f)
    {
        const int numSamples = static_cast<int>(duration * sampleRate);
        juce::AudioBuffer<float> buffer(1, numSamples);

        for (int i = 0; i < numSamples; ++i)
        {
            float t = static_cast<float>(i) / sampleRate;
            float phase = std::fmod(t * frequency, 1.0f);
            buffer.setSample(0, i, amplitude * (2.0f * phase - 1.0f));
        }

        return buffer;
    }

    //==============================================================================
    // Audio Analysis Helpers
    //==============================================================================

    /**
     * Calculate RMS level of a buffer
     */
    static float calculateRMS(const juce::AudioBuffer<float>& buffer)
    {
        float sumSquares = 0.0f;
        const int numChannels = buffer.getNumChannels();
        const int numSamples = buffer.getNumSamples();

        for (int channel = 0; channel < numChannels; ++channel)
        {
            for (int sample = 0; sample < numSamples; ++sample)
            {
                float value = buffer.getSample(channel, sample);
                sumSquares += value * value;
            }
        }

        return std::sqrt(sumSquares / (numChannels * numSamples));
    }

    /**
     * Find peak absolute value in buffer
     */
    static float findPeak(const juce::AudioBuffer<float>& buffer)
    {
        float peak = 0.0f;
        const int numChannels = buffer.getNumChannels();
        const int numSamples = buffer.getNumSamples();

        for (int channel = 0; channel < numChannels; ++channel)
        {
            for (int sample = 0; sample < numSamples; ++sample)
            {
                float value = std::abs(buffer.getSample(channel, sample));
                peak = std::max(peak, value);
            }
        }

        return peak;
    }

    /**
     * Check if two buffers are approximately equal
     * @param tolerance Maximum allowed difference
     */
    static bool buffersAreEqual(const juce::AudioBuffer<float>& a,
                                const juce::AudioBuffer<float>& b,
                                float tolerance = 0.0001f)
    {
        if (a.getNumChannels() != b.getNumChannels() ||
            a.getNumSamples() != b.getNumSamples())
            return false;

        const int numChannels = a.getNumChannels();
        const int numSamples = a.getNumSamples();

        for (int channel = 0; channel < numChannels; ++channel)
        {
            for (int sample = 0; sample < numSamples; ++sample)
            {
                float diff = std::abs(a.getSample(channel, sample) - b.getSample(channel, sample));
                if (diff > tolerance)
                    return false;
            }
        }

        return true;
    }

    /**
     * Verify buffer is silent (all zeros)
     */
    static bool isSilent(const juce::AudioBuffer<float>& buffer, float tolerance = 0.0001f)
    {
        return findPeak(buffer) < tolerance;
    }

    /**
     * Check if buffer has any signal (above noise floor)
     */
    static bool hasSignal(const juce::AudioBuffer<float>& buffer, float threshold = 0.001f)
    {
        return findPeak(buffer) > threshold;
    }

    /**
     * Check if buffer has stereo content (L != R)
     */
    static bool hasStereoContent(const juce::AudioBuffer<float>& buffer, float threshold = 0.01f)
    {
        if (buffer.getNumChannels() < 2) return false;

        const int numSamples = buffer.getNumSamples();
        float maxDifference = 0.0f;

        for (int sample = 0; sample < numSamples; ++sample)
        {
            float diff = std::abs(buffer.getSample(0, sample) - buffer.getSample(1, sample));
            maxDifference = std::max(maxDifference, diff);
        }

        return maxDifference > threshold;
    }

    //==============================================================================
    // MIDI Test Helpers
    //==============================================================================

    /**
     * Create a MIDI note-on message buffer
     */
    static juce::MidiBuffer createNoteOn(int noteNumber, float velocity, int samplePosition = 0)
    {
        juce::MidiBuffer midi;
        midi.addEvent(juce::MidiMessage::noteOn(1, noteNumber, static_cast<uint8_t>(velocity * 127)),
                      samplePosition);
        return midi;
    }

    /**
     * Create a MIDI note-off message buffer
     */
    static juce::MidiBuffer createNoteOff(int noteNumber, float velocity, int samplePosition = 0)
    {
        juce::MidiBuffer midi;
        midi.addEvent(juce::MidiMessage::noteOff(1, noteNumber, static_cast<uint8_t>(velocity * 127)),
                      samplePosition);
        return midi;
    }

    /**
     * Create a MIDI control change message
     */
    static juce::MidiBuffer createControlChange(int controllerNumber, float value, int samplePosition = 0)
    {
        juce::MidiBuffer midi;
        midi.addEvent(juce::MidiMessage::controllerEvent(1, controllerNumber,
                                                          static_cast<int>(value * 127)),
                      samplePosition);
        return midi;
    }

    //==============================================================================
    // Performance Measurement
    //==============================================================================

    /**
     * Measure CPU usage of processing function
     * @param processor Function to measure
     * @param iterations Number of times to run
     * @return Average processing time in milliseconds
     */
    static double measureProcessingTime(std::function<void()> processor, int iterations = 100)
    {
        // Warm-up
        for (int i = 0; i < 10; ++i)
            processor();

        // Measure
        auto start = std::chrono::high_resolution_clock::now();
        for (int i = 0; i < iterations; ++i)
            processor();
        auto end = std::chrono::high_resolution_clock::now();

        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
        return (duration.count() / 1000.0) / iterations; // Average in ms
    }

    /**
     * Calculate CPU percentage based on processing time vs buffer duration
     */
    static double calculateCPUPercent(double processingTimeMs, int numSamples, double sampleRate)
    {
        double bufferTimeMs = (static_cast<double>(numSamples) / sampleRate) * 1000.0;
        return (processingTimeMs / bufferTimeMs) * 100.0;
    }

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(Framework)
};

//==============================================================================
// Parameter Info Structure for Preset System
//==============================================================================

/**
 * @brief Parameter information for FFI bridge and preset system
 */
struct PresetParameterInfo
{
    std::string id;
    std::string name;
    float minValue;
    float maxValue;
    float defaultValue;
    float currentValue;
    std::string unit;
    std::string type;  // "float", "bool", "choice"
    std::vector<std::string> choices;  // For choice parameters
};

} // namespace DSPTestFramework
