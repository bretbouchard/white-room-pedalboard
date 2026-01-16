/*
  ==============================================================================

    StereoProcessor.h
    Created: January 9, 2026
    Author: Bret Bouchard

    Stereo processing utilities for enhanced spatial imaging
    - Mutable Instruments-style odd/even mode separation
    - Width control for stereo image
    - Mono compatibility

  ==============================================================================
*/

#pragma once

#include <cmath>
#include <algorithm>

namespace DSP {

//==============================================================================
/**
 * Stereo width processor with mono compatibility
 *
 * Provides stereo width control while maintaining mono compatibility.
 * Uses mid-side processing for clean stereo imaging.
 */
struct StereoWidth
{
    /**
     * Process stereo sample with width control
     * @param left     Left channel sample (in/out)
     * @param right    Right channel sample (in/out)
     * @param width    Width amount (0.0=mono, 1.0=full stereo)
     */
    static inline void processWidth(float& left, float& right, float width)
    {
        // Convert to mid-side
        float mid = (left + right) * 0.5f;
        float side = (left - right) * 0.5f;

        // Apply width to side signal
        side *= width;

        // Convert back to left-right
        left = mid + side;
        right = mid - side;
    }

    /**
     * Process stereo sample with width control and preserve mono
     * @param left     Left channel sample (in/out)
     * @param right    Right channel sample (in/out)
     * @param width    Width amount (0.0=mono, 1.0=full stereo)
     */
    static inline void processWidthPreserveMono(float& left, float& right, float width)
    {
        // Calculate stereo difference
        float difference = left - right;

        // Apply width to difference only
        float adjusted = difference * width;

        // Preserve mono (sum) while adjusting stereo width
        float mono = (left + right) * 0.5f;
        left = mono + adjusted * 0.5f;
        right = mono - adjusted * 0.5f;
    }
};

//==============================================================================
/**
 * Odd/Even mode separation (Mutable Instruments style)
 *
 * Splits harmonic series into odd and even partials for stereo imaging.
 * Used in Rings, Elements, and other MI instruments.
 */
struct OddEvenSeparation
{
    /**
     * Check if mode index should go to left channel
     * @param modeIndex    Mode/partial index (0-based)
     * @param enabled      Whether odd/even separation is enabled
     * @returns            true if mode should be in left channel
     */
    static inline bool isLeftChannel(size_t modeIndex, bool enabled)
    {
        if (!enabled) return true;  // All modes to both channels when disabled

        // Even indices (0, 2, 4...) → Left
        // Odd indices (1, 3, 5...) → Right
        return (modeIndex % 2) == 0;
    }

    /**
     * Check if mode index should go to right channel
     * @param modeIndex    Mode/partial index (0-based)
     * @param enabled      Whether odd/even separation is enabled
     * @returns            true if mode should be in right channel
     */
    static inline bool isRightChannel(size_t modeIndex, bool enabled)
    {
        if (!enabled) return true;  // All modes to both channels when disabled

        // Odd indices (1, 3, 5...) → Right
        // Even indices (0, 2, 4...) → Left
        return (modeIndex % 2) == 1;
    }

    /**
     * Calculate stereo gain for mode
     * @param modeIndex    Mode/partial index (0-based)
     * @param enabled      Whether odd/even separation is enabled
     * @param channel      Channel index (0=left, 1=right)
     * @returns            Gain multiplier (0.0 or 1.0)
     */
    static inline float getModeGain(size_t modeIndex, bool enabled, int channel)
    {
        if (!enabled) return 1.0f;

        bool isLeft = (modeIndex % 2) == 0;
        if (channel == 0) return isLeft ? 1.0f : 0.0f;  // Left channel
        else return isLeft ? 0.0f : 1.0f;                // Right channel
    }

    /**
     * Apply odd/even separation to mode output
     * @param modeIndex    Mode/partial index (0-based)
     * @param enabled      Whether odd/even separation is enabled
     * @param modeOutput   Mode output sample
     * @param left         Left channel output (accumulated)
     * @param right        Right channel output (accumulated)
     * @param width        Stereo width (0.0-1.0)
     */
    static inline void applySeparation(size_t modeIndex, bool enabled,
                                       float modeOutput,
                                       float& left, float& right,
                                       float width = 1.0f)
    {
        float modeGain = 0.0f;

        if (enabled)
        {
            // Odd/even separation
            if ((modeIndex % 2) == 0)
            {
                // Even mode → Left (with some bleed to right based on width)
                modeGain = 1.0f;
                left += modeOutput * modeGain;
                right += modeOutput * (1.0f - width) * 0.5f;
            }
            else
            {
                // Odd mode → Right (with some bleed to left based on width)
                modeGain = 1.0f;
                right += modeOutput * modeGain;
                left += modeOutput * (1.0f - width) * 0.5f;
            }
        }
        else
        {
            // No separation - equal to both channels
            left += modeOutput;
            right += modeOutput;
        }
    }
};

//==============================================================================
/**
 * Stereo detune processor
 *
 * Applies frequency detuning between stereo channels for wider imaging.
 */
struct StereoDetune
{
    /**
     * Calculate frequency multiplier for stereo detune
     * @param baseFreq     Base frequency in Hz
     * @param detuneSemitones Detune amount in semitones
     * @param channel      Channel index (0=left, 1=right)
     * @returns            Frequency multiplier
     */
    static inline double calculateDetuneMultiplier(double baseFreq,
                                                   float detuneSemitones,
                                                   int channel)
    {
        // Left channel: detune down
        // Right channel: detune up
        float direction = (channel == 0) ? -0.5f : 0.5f;
        float detuneAmount = detuneSemitones * direction;

        // Convert semitones to frequency multiplier
        return std::pow(2.0, detuneAmount / 12.0);
    }

    /**
     * Apply stereo detune to frequency
     * @param baseFreq        Base frequency in Hz
     * @param detuneSemitones Detune amount in semitones
     * @param channel         Channel index (0=left, 1=right)
     * @returns               Detuned frequency
     */
    static inline double applyDetune(double baseFreq, float detuneSemitones, int channel)
    {
        return baseFreq * calculateDetuneMultiplier(baseFreq, detuneSemitones, channel);
    }
};

//==============================================================================
/**
 * Stereo filter offset processor
 *
 * Applies filter cutoff offset between stereo channels.
 */
struct StereoFilterOffset
{
    /**
     * Calculate filter cutoff for stereo channel
     * @param baseCutoff     Base cutoff frequency in Hz
     * @param offsetAmount   Offset amount (normalized 0-1)
     * @param channel        Channel index (0=left, 1=right)
     * @param sampleRate     Sample rate for clamping
     * @returns              Filter cutoff for channel
     */
    static inline double calculateCutoff(double baseCutoff,
                                        float offsetAmount,
                                        int channel,
                                        double sampleRate = 48000.0)
    {
        // Left channel: lower cutoff
        // Right channel: higher cutoff
        float direction = (channel == 0) ? -1.0f : 1.0f;

        // Calculate offset in octaves
        float octaveOffset = offsetAmount * direction * 0.5f;  // +/- 0.5 octave max

        // Apply offset
        double cutoff = baseCutoff * std::pow(2.0, octaveOffset);

        // Clamp to valid range
        return std::clamp(cutoff, 20.0, sampleRate * 0.49);
    }

    /**
     * Calculate normalized cutoff parameter for stereo channel
     * @param baseNorm       Base normalized cutoff (0-1)
     * @param offsetAmount   Offset amount (normalized 0-1)
     * @param channel        Channel index (0=left, 1=right)
     * @returns              Normalized cutoff for channel
     */
    static inline float calculateNormalizedCutoff(float baseNorm,
                                                  float offsetAmount,
                                                  int channel)
    {
        // Left channel: lower cutoff
        // Right channel: higher cutoff
        float direction = (channel == 0) ? -1.0f : 1.0f;

        // Apply offset to normalized value
        float offset = offsetAmount * direction * 0.2f;  // +/- 0.2 offset
        return std::clamp(baseNorm + offset, 0.0f, 1.0f);
    }
};

//==============================================================================
/**
 * Stereo ping-pong delay
 *
 * Creates bouncing delay effect between channels.
 */
struct PingPongDelay
{
    float leftDelayTime = 0.25f;    // Seconds
    float rightDelayTime = 0.375f;  // Seconds (slightly longer)
    float feedback = 0.5f;          // Feedback amount
    float mix = 0.3f;               // Wet/dry mix
    int maxDelaySamples = 48000;    // 1 second at 48kHz

    std::vector<float> leftDelayLine;
    std::vector<float> rightDelayLine;
    int leftWriteIndex = 0;
    int rightWriteIndex = 0;
    double sampleRate = 48000.0;

    void prepare(double sr)
    {
        sampleRate = sr;
        maxDelaySamples = static_cast<int>(sr);  // 1 second
        leftDelayLine.resize(maxDelaySamples, 0.0f);
        rightDelayLine.resize(maxDelaySamples, 0.0f);
        leftWriteIndex = 0;
        rightWriteIndex = 0;
    }

    void reset()
    {
        std::fill(leftDelayLine.begin(), leftDelayLine.end(), 0.0f);
        std::fill(rightDelayLine.begin(), rightDelayLine.end(), 0.0f);
        leftWriteIndex = 0;
        rightWriteIndex = 0;
    }

    void process(float& left, float& right)
    {
        // Calculate read indices
        int leftDelaySamples = static_cast<int>(leftDelayTime * sampleRate);
        int rightDelaySamples = static_cast<int>(rightDelayTime * sampleRate);

        int leftReadIndex = (leftWriteIndex - leftDelaySamples + maxDelaySamples) % maxDelaySamples;
        int rightReadIndex = (rightWriteIndex - rightDelaySamples + maxDelaySamples) % maxDelaySamples;

        // Read delayed samples (ping-pong: left → right, right → left)
        float leftDelayed = rightDelayLine[leftReadIndex];  // Left gets right's delayed
        float rightDelayed = leftDelayLine[rightReadIndex]; // Right gets left's delayed

        // Write to delay lines with feedback
        leftDelayLine[leftWriteIndex] = left + leftDelayed * feedback;
        rightDelayLine[rightWriteIndex] = right + rightDelayed * feedback;

        // Mix wet/dry
        float leftOut = left * (1.0f - mix) + leftDelayed * mix;
        float rightOut = right * (1.0f - mix) + rightDelayed * mix;

        left = leftOut;
        right = rightOut;

        // Advance write indices
        leftWriteIndex = (leftWriteIndex + 1) % maxDelaySamples;
        rightWriteIndex = (rightWriteIndex + 1) % maxDelaySamples;
    }
};

//==============================================================================
/**
 * Comprehensive stereo processor
 *
 * Combines all stereo processing techniques.
 */
struct StereoProcessor
{
    float width = 0.5f;              // Stereo width (0-1)
    float detune = 0.02f;            // Stereo detune (semitones)
    float filterOffset = 0.1f;       // Filter offset (normalized)
    bool oddEvenSeparation = false;  // Odd/even mode separation
    bool pingPongEnabled = false;    // Ping-pong delay

    PingPongDelay pingPongDelay;

    void prepare(double sampleRate)
    {
        pingPongDelay.prepare(sampleRate);
    }

    void reset()
    {
        pingPongDelay.reset();
    }

    /**
     * Process stereo sample with all enhancements
     * @param left    Left channel sample (in/out)
     * @param right   Right channel sample (in/out)
     */
    void process(float& left, float& right)
    {
        // Apply stereo width
        StereoWidth::processWidth(left, right, width);

        // Apply ping-pong delay if enabled
        if (pingPongEnabled)
        {
            pingPongDelay.process(left, right);
        }
    }

    /**
     * Get detuned frequency for channel
     */
    double getDetunedFrequency(double baseFreq, int channel) const
    {
        return StereoDetune::applyDetune(baseFreq, detune, channel);
    }

    /**
     * Get filter cutoff for channel
     */
    double getFilterCutoff(double baseCutoff, int channel, double sampleRate) const
    {
        return StereoFilterOffset::calculateCutoff(baseCutoff, filterOffset, channel, sampleRate);
    }

    /**
     * Check if mode should be in channel
     */
    bool isModeInChannel(size_t modeIndex, int channel) const
    {
        if (!oddEvenSeparation) return true;

        if (channel == 0)  // Left
            return (modeIndex % 2) == 0;
        else                // Right
            return (modeIndex % 2) == 1;
    }
};

} // namespace DSP
