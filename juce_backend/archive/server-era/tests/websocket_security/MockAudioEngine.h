#pragma once

#include <JuceHeader.h>
#include <string>
#include <map>

// Mock implementation of AudioEngine for testing WebSocket security vulnerabilities
class MockAudioEngine : public juce::AudioProcessorPlayer::Listener,
                       public juce::ChangeBroadcaster
{
public:
    struct AudioLevels {
        float leftChannel;
        float rightChannel;
        float peakLeft;
        float peakRight;
    };

    MockAudioEngine();
    ~MockAudioEngine() override;

    // AudioEngine interface methods (simplified for testing)
    void startPlayback();
    void stopPlayback();
    bool setPluginParameter(int pluginId, const juce::String& parameterName, float value);
    int loadPlugin(const juce::String& pluginPath);
    void unloadPlugin(int pluginId);
    bool isPlaying() const;
    double getPlaybackPosition() const;
    double getTempo() const;
    void setPlaybackPosition(double position);
    void setTempo(double newTempo);

    // Audio processor callback (required by interface)
    void audioProcessorParameterChanged(juce::AudioProcessor* processor, int parameterIndex, float newValue) override {}
    void audioProcessorChanged(juce::AudioProcessor* processor, const juce::MemoryBlock& changeDetails) override {}

    // Audio device management
    std::vector<juce::String> getAvailableAudioDevices() const;

    // Additional methods for testing
    AudioLevels getCurrentAudioLevels() const;
    juce::StringArray getLoadedPlugins() const;
    juce::StringArray getAvailableAudioDevices() const;

private:
    double playbackPosition;
    double tempo;
    bool playing;

    int nextPluginId = 1;
    std::map<int, std::string> loadedPlugins;
    std::map<int, std::map<std::string, float>> pluginParameters;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MockAudioEngine)
};