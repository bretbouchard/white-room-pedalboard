/*
  ==============================================================================

    ConsoleChannelDSP.h
    Created: December 30, 2025
    Author: Bret Bouchard

    Base interface for mixer channel strip processing

  ==============================================================================
*/

#ifndef CONSOLE_CHANNEL_DSP_H_INCLUDED
#define CONSOLE_CHANNEL_DSP_H_INCLUDED

#include <cstdint>
#include <vector>

// Forward declarations
namespace Effects {
    class EffectDSP;
}

namespace Console {

/**
 * @brief Mixer channel strip DSP
 *
 * Processes audio through a mixer channel with inserts, sends,
 * volume, pan, mute, and solo.
 *
 * Processing order:
 * 1. Insert effects (pre-fader)
 * 2. Sends (pre or post fader)
 * 3. Volume/gain
 * 4. Pan
 * 5. Mute/solo
 * 6. Output
 */
class ConsoleChannelDSP {
public:
    virtual ~ConsoleChannelDSP() = default;

    //==========================================================================
    // Initialization
    //==========================================================================

    /**
     * @brief Prepare channel for processing
     *
     * @param sampleRate Sample rate in Hz
     * @param blockSize Block size in samples
     */
    virtual void prepare(double sampleRate, int blockSize) = 0;

    /**
     * @brief Reset channel state
     *
     * Clears all filters, ramps, and state.
     */
    virtual void reset() = 0;

    //==========================================================================
    // Audio Processing
    //==========================================================================

    /**
     * @brief Process audio through channel strip
     *
     * Processes audio in this order:
     * 1. Insert effects (pre-fader)
     * 2. Sends (pre or post fader)
     * 3. Volume/gain
     * 4. Pan
     * 5. Mute/solo
     *
     * @param inputs Input buffers [numChannels][numSamples]
     * @param outputs Output buffers [numChannels][numSamples]
     * @param numChannels Number of channels (2 = stereo)
     * @param numSamples Number of samples to process
     *
     * Thread safety: Called from audio thread only.
     * Must not allocate memory.
     */
    virtual void process(float** inputs, float** outputs,
                        int numChannels, int numSamples) = 0;

    //==========================================================================
    // Mix Parameters
    //==========================================================================

    /**
     * @brief Set volume in dB
     *
     * @param dB Volume in decibels (-inf to +10)
     */
    virtual void setVolume(double dB) = 0;

    /**
     * @brief Set pan position
     *
     * @param position Pan position (-1.0 = left, 0.0 = center, +1.0 = right)
     */
    virtual void setPan(double position) = 0;

    /**
     * @brief Set mute state
     *
     * @param muted True to mute (silence output)
     */
    virtual void setMuted(bool muted) = 0;

    /**
     * @brief Set solo state
     *
     * When soloed, this channel plays and all others are muted.
     * When not soloed but another is, this channel is muted.
     *
     * @param soloed True to solo
     */
    virtual void setSoloed(bool soloed) = 0;

    //==========================================================================
    // Insert Effects (Pre-Fader)
    //==========================================================================

    /**
     * @brief Add insert effect
     *
     * Insert effects are processed pre-fader in series.
     * Typical inserts: EQ, compression, etc.
     *
     * @param effect Effect to insert (ownership transferred)
     */
    virtual void addInsertEffect(Effects::EffectDSP* effect) = 0;

    /**
     * @brief Remove insert effect
     *
     * @param index Index of effect to remove
     * @return true if removed, false if index invalid
     */
    virtual bool removeInsertEffect(int index) = 0;

    /**
     * @brief Get number of insert effects
     */
    virtual int getInsertEffectCount() const = 0;

    //==========================================================================
    // Sends (Pre/Post Fader)
    //==========================================================================

    /**
     * @brief Send structure
     */
    struct Send {
        int busIndex;      // Destination bus index
        double amount;     // Send amount (0.0 to 1.0)
        bool preFader;     // true = pre-fader, false = post-fader
        bool muted;        // Send enabled/disabled

        Send()
            : busIndex(-1), amount(0.0), preFader(false), muted(true)
        {}
    };

    /**
     * @brief Add send to bus
     *
     * @param busIndex Destination bus index
     * @param amount Send amount (0.0 to 1.0)
     * @param preFader true = pre-fader send, false = post-fader
     * @return true if added, false if bus invalid
     */
    virtual bool addSend(int busIndex, double amount, bool preFader) = 0;

    /**
     * @brief Remove send to bus
     *
     * @param busIndex Bus index to remove send to
     * @return true if removed, false if no such send
     */
    virtual bool removeSend(int busIndex) = 0;

    /**
     * @brief Set send amount
     *
     * @param busIndex Bus index
     * @param amount New amount (0.0 to 1.0)
     * @return true if updated, false if no such send
     */
    virtual bool setSendAmount(int busIndex, double amount) = 0;

    /**
     * @brief Set send mute state
     *
     * @param busIndex Bus index
     * @param muted true to mute send
     * @return true if updated, false if no such send
     */
    virtual bool setSendMuted(int busIndex, bool muted) = 0;

    /**
     * @brief Get number of sends
     */
    virtual int getSendCount() const = 0;

    //==========================================================================
    // Queries
    //==========================================================================

    /**
     * @brief Get current volume in dB
     */
    virtual double getVolume() const = 0;

    /**
     * @brief Get current pan position
     */
    virtual double getPan() const = 0;

    /**
     * @brief Get mute state
     */
    virtual bool isMuted() const = 0;

    /**
     * @brief Get solo state
     */
    virtual bool isSoloed() const = 0;
};

} // namespace Console

#endif // CONSOLE_CHANNEL_DSP_H_INCLUDED
