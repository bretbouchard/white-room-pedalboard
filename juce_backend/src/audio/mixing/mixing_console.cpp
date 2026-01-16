/*
 * mixing_console.cpp
 * White Room Audio Engine - Mixing Console Implementation
 */

#include "mixing_console.h"
#include <algorithm>
#include <cmath>

namespace white_room {
namespace audio {

MixingConsoleProcessor::MixingConsoleProcessor() {
    // Create master bus
    masterBus = std::make_unique<ChannelStrip>();
    masterBus->id = 0;
    masterBus->name = "Master";
    masterBus->type = "master";
    masterBus->volume = 0.8f;
    masterBus->pan = 0.0f;
}

MixingConsoleProcessor::~MixingConsoleProcessor() {
    channels.clear();
    masterBus.reset();
}

// ========== Channel Management ==========

void MixingConsoleProcessor::addChannel(std::unique_ptr<ChannelStrip> channel) {
    channels.push_back(std::move(channel));
}

void MixingConsoleProcessor::removeChannel(int id) {
    auto it = std::remove_if(channels.begin(), channels.end(),
        [id](const auto& ch) { return ch->id == id; });
    channels.erase(it, channels.end());
}

ChannelStrip* MixingConsoleProcessor::getChannel(int id) {
    if (id == 0) return masterBus.get();

    auto it = std::find_if(channels.begin(), channels.end(),
        [id](const auto& ch) { return ch->id == id; });
    return (it != channels.end()) ? it->get() : nullptr;
}

std::vector<ChannelStrip*> MixingConsoleProcessor::getAllChannels() {
    std::vector<ChannelStrip*> allChannels;
    for (auto& channel : channels) {
        allChannels.push_back(channel.get());
    }
    allChannels.push_back(masterBus.get());
    return allChannels;
}

ChannelStrip* MixingConsoleProcessor::getMasterBus() {
    return masterBus.get();
}

// ========== Audio Processing ==========

void MixingConsoleProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    currentSampleRate = sampleRate;

    // Prepare mix buffer (stereo)
    mixBuffer.setSize(2, samplesPerBlock);
    channelBuffer.setSize(2, samplesPerBlock);
}

void MixingConsoleProcessor::reset() {
    mixBuffer.clear();
    channelBuffer.clear();

    for (auto& channel : channels) {
        channel->levelL = -60.0f;
        channel->levelR = -60.0f;
        channel->peakL = -60.0f;
        channel->peakR = -60.0f;
    }

    masterBus->levelL = -60.0f;
    masterBus->levelR = -60.0f;
    masterBus->peakL = -60.0f;
    masterBus->peakR = -60.0f;
}

void MixingConsoleProcessor::processBlock(juce::AudioBuffer<float>& buffer) {
    const int numSamples = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();

    // Clear mix buffer
    mixBuffer.clear();

    // Process each channel
    for (auto& channel : channels) {
        if (!shouldPlayChannel(*channel)) {
            // Muted channel - clear levels
            channel->levelL = -60.0f;
            channel->levelR = -60.0f;
            continue;
        }

        // Copy channel data to temp buffer
        channelBuffer.setSize(buffer.getNumChannels(), numSamples, false, false, true);
        channelBuffer.copyFrom(0, 0, buffer, 0, 0, numSamples);

        if (buffer.getNumChannels() >= 2) {
            channelBuffer.copyFrom(1, 0, buffer, 1, 0, numSamples);
        }

        // Apply volume and pan
        applyVolumePan(*channel, channelBuffer);

        // Add to mix buffer
        mixBuffer.addFrom(0, 0, channelBuffer, 0, 0, numSamples);
        mixBuffer.addFrom(1, 0, channelBuffer, 1, 0, numSamples);

        // Update metering
        updateMetering(*channel, channelBuffer);
    }

    // Apply master bus processing
    applyVolumePan(*masterBus, mixBuffer);

    // Copy mix buffer to output
    buffer.copyFrom(0, 0, mixBuffer, 0, 0, numSamples);
    if (numChannels >= 2) {
        buffer.copyFrom(1, 0, mixBuffer, 1, 0, numSamples);
    }

    // Update master metering
    updateMetering(*masterBus, mixBuffer);
}

// ========== Level Controls ==========

void MixingConsoleProcessor::setVolume(int channelId, float volume) {
    ChannelStrip* channel = getChannel(channelId);
    if (channel) {
        channel->volume = juce::jlimit(0.0f, 1.0f, volume);
    }
}

void MixingConsoleProcessor::setPan(int channelId, float pan) {
    ChannelStrip* channel = getChannel(channelId);
    if (channel) {
        channel->pan = juce::jlimit(-1.0f, 1.0f, pan);
    }
}

void MixingConsoleProcessor::setMute(int channelId, bool muted) {
    ChannelStrip* channel = getChannel(channelId);
    if (channel) {
        channel->isMuted = muted;
    }
}

void MixingConsoleProcessor::setSolo(int channelId, bool solo) {
    ChannelStrip* channel = getChannel(channelId);
    if (channel && channel->type != "master") {
        channel->isSolo = solo;

        // Mute all non-soloed channels if any are soloed
        bool hasSolo = hasSoloedChannels();
        for (auto& ch : channels) {
            if (ch->id != channelId && ch->type != "master") {
                ch->isMuted = hasSolo && !ch->isSolo;
            }
        }
    }
}

// ========== Metering ==========

float MixingConsoleProcessor::getLevelL(int channelId) const {
    const ChannelStrip* channel = const_cast<MixingConsoleProcessor*>(this)->getChannel(channelId);
    return channel ? channel->levelL : -60.0f;
}

float MixingConsoleProcessor::getLevelR(int channelId) const {
    const ChannelStrip* channel = const_cast<MixingConsoleProcessor*>(this)->getChannel(channelId);
    return channel ? channel->levelR : -60.0f;
}

float MixingConsoleProcessor::getPeakL(int channelId) const {
    const ChannelStrip* channel = const_cast<MixingConsoleProcessor*>(this)->getChannel(channelId);
    return channel ? channel->peakL : -60.0f;
}

float MixingConsoleProcessor::getPeakR(int channelId) const {
    const ChannelStrip* channel = const_cast<MixingConsoleProcessor*>(this)->getChannel(channelId);
    return channel ? channel->peakR : -60.0f;
}

std::map<int, std::pair<float, float>> MixingConsoleProcessor::getAllMeterData() const {
    std::map<int, std::pair<float, float>> meterData;

    for (const auto& channel : channels) {
        meterData[channel->id] = {channel->levelL, channel->levelR};
    }

    meterData[0] = {masterBus->levelL, masterBus->levelR};

    return meterData;
}

// ========== Routing ==========

void MixingConsoleProcessor::setOutputBus(int channelId, const juce::String& bus) {
    ChannelStrip* channel = getChannel(channelId);
    if (channel && channel->type != "master") {
        channel->outputBus = bus;
    }
}

// ========== Internal Processing ==========

void MixingConsoleProcessor::applyVolumePan(ChannelStrip& channel, juce::AudioBuffer<float>& buffer) {
    const int numSamples = buffer.getNumSamples();

    // Apply pan law (-3dB at center)
    float panL = 1.0f;
    float panR = 1.0f;

    if (channel.pan < 0.0f) {
        // Pan left
        panL = 1.0f;
        panR = juce::jmin(1.0f, 1.0f + channel.pan);
    } else if (channel.pan > 0.0f) {
        // Pan right
        panL = juce::jmin(1.0f, 1.0f - channel.pan);
        panR = 1.0f;
    }

    // Apply volume and pan
    float volL = channel.volume * panL;
    float volR = channel.volume * panR;

    buffer.applyGain(0, 0, numSamples, volL);
    if (buffer.getNumChannels() >= 2) {
        buffer.applyGain(1, 0, numSamples, volR);
    }
}

bool MixingConsoleProcessor::shouldPlayChannel(const ChannelStrip& channel) const {
    if (channel.isMuted) return false;

    // If any channel is soloed, only play soloed channels
    if (hasSoloedChannels()) {
        return channel.isSolo;
    }

    return true;
}

void MixingConsoleProcessor::updateMetering(ChannelStrip& channel, const juce::AudioBuffer<float>& buffer) {
    const int numSamples = buffer.getNumSamples();

    // Find RMS and peak levels
    float rmsL = 0.0f;
    float rmsR = 0.0f;
    float peakL = 0.0f;
    float peakR = 0.0f;

    for (int i = 0; i < numSamples; ++i) {
        float sampleL = std::abs(buffer.getSample(0, i));
        peakL = juce::jmax(peakL, sampleL);
        rmsL += sampleL * sampleL;

        if (buffer.getNumChannels() >= 2) {
            float sampleR = std::abs(buffer.getSample(1, i));
            peakR = juce::jmax(peakR, sampleR);
            rmsR += sampleR * sampleR;
        }
    }

    rmsL = std::sqrt(rmsL / numSamples);
    rmsR = std::sqrt(rmsR / numSamples);

    // Convert to dB
    float levelL_new = linearToDecibels(rmsL);
    float levelR_new = linearToDecibels(rmsR);
    float peakL_new = linearToDecibels(peakL);
    float peakR_new = linearToDecibels(peakR);

    // Smooth metering
    float smoothing = 0.2f;
    channel.levelL = channel.levelL * (1.0f - smoothing) + levelL_new * smoothing;
    channel.levelR = channel.levelR * (1.0f - smoothing) + levelR_new * smoothing;

    // Peak hold (instant attack, slow decay)
    channel.peakL = juce::jmax(channel.peakL - 0.5f, peakL_new);
    channel.peakR = juce::jmax(channel.peakR - 0.5f, peakR_new);
}

float MixingConsoleProcessor::linearToDecibels(float linear) {
    if (linear < 1e-6f) return -60.0f;
    return 20.0f * std::log10(linear);
}

float MixingConsoleProcessor::decibelsToLinear(float db) {
    if (db <= -60.0f) return 0.0f;
    return std::pow(10.0f, db / 20.0f);
}

bool MixingConsoleProcessor::hasSoloedChannels() const {
    return std::any_of(channels.begin(), channels.end(),
        [](const auto& ch) { return ch->isSolo; });
}

} // namespace audio
} // namespace white_room
