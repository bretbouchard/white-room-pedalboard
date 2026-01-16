/*
 * mixing_console.h
 * White Room Audio Engine - Mixing Console
 *
 * Professional mixing console with channel strips, effects, and automation
 */

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <vector>
#include <memory>
#include <map>

namespace white_room {
namespace audio {

/**
 * Channel strip state
 */
struct ChannelStrip {
    int id;
    juce::String name;
    juce::String type; // "audio", "midi", "bus", "master"

    // Level controls
    float volume; // 0-1 (linear)
    float pan; // -1 to 1

    // Mute/Solo
    bool isMuted;
    bool isSolo;

    // Metering
    float levelL; // Current level in dB
    float levelR;
    float peakL;
    float peakR;

    // Routing
    juce::String outputBus;

    ChannelStrip()
        : id(0)
        , name("Unnamed")
        , type("audio")
        , volume(0.8f)
        , pan(0.0f)
        , isMuted(false)
        , isSolo(false)
        , levelL(-60.0f)
        , levelR(-60.0f)
        , peakL(-60.0f)
        , peakR(-60.0f)
        , outputBus("master")
    {}
};

/**
 * Mixing console processor
 * Handles audio mixing, routing, and effects processing
 */
class MixingConsoleProcessor {
public:
    MixingConsoleProcessor();
    ~MixingConsoleProcessor();

    // ========== Channel Management ==========

    /**
     * Add a new channel to the console
     */
    void addChannel(std::unique_ptr<ChannelStrip> channel);

    /**
     * Remove a channel by ID
     */
    void removeChannel(int id);

    /**
     * Get channel by ID
     */
    ChannelStrip* getChannel(int id);

    /**
     * Get all channels
     */
    std::vector<ChannelStrip*> getAllChannels();

    /**
     * Get master bus
     */
    ChannelStrip* getMasterBus();

    // ========== Audio Processing ==========

    /**
     * Process audio buffer through mixing console
     */
    void processBlock(juce::AudioBuffer<float>& buffer);

    /**
     * Prepare for playback
     */
    void prepareToPlay(double sampleRate, int samplesPerBlock);

    /**
     * Reset all state
     */
    void reset();

    // ========== Level Controls ==========

    /**
     * Set channel volume (0-1)
     */
    void setVolume(int channelId, float volume);

    /**
     * Set channel pan (-1 to 1)
     */
    void setPan(int channelId, float pan);

    /**
     * Set channel mute state
     */
    void setMute(int channelId, bool muted);

    /**
     * Set channel solo state
     */
    void setSolo(int channelId, bool solo);

    // ========== Metering ==========

    /**
     * Get current level for channel (dB)
     */
    float getLevelL(int channelId) const;
    float getLevelR(int channelId) const;

    /**
     * Get peak level for channel (dB)
     */
    float getPeakL(int channelId) const;
    float getPeakR(int channelId) const;

    /**
     * Get all meter data
     */
    std::map<int, std::pair<float, float>> getAllMeterData() const;

    // ========== Routing ==========

    /**
     * Set channel output bus
     */
    void setOutputBus(int channelId, const juce::String& bus);

private:
    std::vector<std::unique_ptr<ChannelStrip>> channels;
    std::unique_ptr<ChannelStrip> masterBus;

    double currentSampleRate = 44100.0;
    int peekIndex = 0;

    // Temporary buffers for processing
    juce::AudioBuffer<float> mixBuffer;
    juce::AudioBuffer<float> channelBuffer;

    // ========== Internal Processing ==========

    /**
     * Apply volume and pan to channel buffer
     */
    void applyVolumePan(ChannelStrip& channel, juce::AudioBuffer<float>& buffer);

    /**
     * Apply mute and solo logic
     */
    bool shouldPlayChannel(const ChannelStrip& channel) const;

    /**
     * Update metering for channel
     */
    void updateMetering(ChannelStrip& channel, const juce::AudioBuffer<float>& buffer);

    /**
     * Convert linear to decibels
     */
    static float linearToDecibels(float linear);

    /**
     * Convert decibels to linear
     */
    static float decibelsToLinear(float db);

    /**
     * Check if any channel is soloed
     */
    bool hasSoloedChannels() const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MixingConsoleProcessor)
};

} // namespace audio
} // namespace white_room
