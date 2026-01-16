#include "MockAudioEngine.h"
#include <JuceHeader.h>

MockAudioEngine::MockAudioEngine()
    : playbackPosition(0.0), tempo(120.0), playing(false)
{
}

MockAudioEngine::~MockAudioEngine()
{
}

void MockAudioEngine::startPlayback()
{
    playing = true;
    // Broadcast change notification
    sendChangeMessage();
}

void MockAudioEngine::stopPlayback()
{
    playing = false;
    // Broadcast change notification
    sendChangeMessage();
}

bool MockAudioEngine::setPluginParameter(int pluginId, const juce::String& parameterName, float value)
{
    // In a real implementation, this would validate plugin ID and parameter name
    // For testing, we just store the parameter value
    pluginParameters[pluginId][parameterName.toStdString()] = value;
    return true;
}

int MockAudioEngine::loadPlugin(const juce::String& pluginPath)
{
    // In a real implementation, this would validate plugin path and load plugin
    // For testing, we just assign a fake plugin ID
    int newPluginId = nextPluginId++;
    loadedPlugins[newPluginId] = pluginPath.toStdString();
    return newPluginId;
}

void MockAudioEngine::unloadPlugin(int pluginId)
{
    auto it = loadedPlugins.find(pluginId);
    if (it != loadedPlugins.end())
    {
        loadedPlugins.erase(it);
        pluginParameters.erase(pluginId);
    }
}

bool MockAudioEngine::isPlaying() const
{
    return playing;
}

double MockAudioEngine::getPlaybackPosition() const
{
    return playbackPosition;
}

double MockAudioEngine::getTempo() const
{
    return tempo;
}

void MockAudioEngine::setPlaybackPosition(double position)
{
    playbackPosition = position;
}

void MockAudioEngine::setTempo(double newTempo)
{
    tempo = newTempo;
}

AudioEngine::AudioLevels MockAudioEngine::getCurrentAudioLevels() const
{
    // Return fake audio levels for testing
    return AudioLevels{0.5f, 0.5f, 0.7f, 0.7f};
}

juce::StringArray MockAudioEngine::getLoadedPlugins() const
{
    juce::StringArray pluginNames;
    for (const auto& plugin : loadedPlugins)
    {
        pluginNames.add(plugin.second);
    }
    return pluginNames;
}

std::vector<juce::String> MockAudioEngine::getAvailableAudioDevices() const
{
    // Return fake device list for testing
    std::vector<juce::String> devices;
    devices.push_back("Default Audio Device");
    devices.push_back("Test Output Device");
    devices.push_back("Test Input Device");
    return devices;
}