#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_dsp/juce_dsp.h>

class AudioEngine : public juce::ChangeBroadcaster
{
public:
    AudioEngine();
    ~AudioEngine() override;

    // Device change callbacks
    class DeviceChangeListener
    {
    public:
        virtual ~DeviceChangeListener() = default;
        virtual void audioDeviceChanged(const juce::String& newDeviceName) = 0;
    };

    void addDeviceChangeListener(DeviceChangeListener* listener) {
        deviceChangeListeners.push_back(listener);
    }

    void removeDeviceChangeListener(DeviceChangeListener* listener) {
        deviceChangeListeners.erase(
            std::remove(deviceChangeListeners.begin(), deviceChangeListeners.end(), listener),
            deviceChangeListeners.end());
    }

    // Audio Device Management
    bool initializeAudio();
    void shutdownAudio();
    std::vector<juce::String> getAvailableAudioDevices() const;
    bool setAudioDevice(const juce::String& deviceName, double sampleRate = 0, int bufferSize = 0);

    // Device Hot-Swap Support (RED phase - not implemented yet)
    juce::String getCurrentAudioDevice() const { return currentDeviceName; }
    double getCurrentSampleRate() const { return currentSampleRate; }
    int getCurrentBufferSize() const { return currentBufferSize; }
    int getAudioDropoutCount() const { return audioDropoutCount.load(); }
    struct HotSwapMetrics {
        double switchTime = 0.0;
        int droppedBuffers = 0;
        std::chrono::high_resolution_clock::time_point lastSwitchTime;
        int totalSwitches = 0;
    };
    HotSwapMetrics getHotSwapMetrics() const { return hotSwapMetrics; }

    // Plugin Management
    int loadPlugin(const juce::String& pluginPath);
    void unloadPlugin(int pluginId);
    std::vector<juce::String> getLoadedPlugins() const;
    bool setPluginParameter(int pluginId, const juce::String& parameterName, float value);

    // Extended Plugin Management (GREEN Phase)
    struct PluginInfo {
        int pluginId;
        juce::String name;
        juce::String path;
        int parameterCount;
        std::map<juce::String, float> parameters;
        bool isActive;
    };

    struct PluginState {
        bool isActive;
        int processedSamples;
        double cpuUsage;
    };

    enum class AutomationType {
        LFO,
        Envelope,
        StepSequencer
    };

    struct AutomationData {
        AutomationType type;
        float minValue;
        float maxValue;
        float frequency;
        float currentValue;
        bool isActive;
    };

    PluginInfo getPluginInfo(int pluginId) const;
    PluginState getPluginState(int pluginId) const;
    bool setParameterAutomation(int pluginId, const juce::String& parameterName,
                                 AutomationType type, float minVal, float maxVal, float frequency);
    float getParameterAutomationValue(int pluginId, const juce::String& parameterName) const;
    bool createPluginChain(const std::vector<int>& pluginIds);
    bool handleNodeFailure(const juce::String& nodeId);
    bool executePluginSystemCall(int pluginId, const juce::String& command);
    bool isPluginWithinMemoryLimits(int pluginId) const;

    // Transport Control
    void startPlayback();
    void stopPlayback();
    void setPlaybackPosition(double seconds);
    double getPlaybackPosition() const;
    bool isPlaying() const { return isPlayingState; }
    void setTempo(double bpm) { currentTempo = bpm; }
    double getTempo() const { return currentTempo; }

    // Audio Processing
    void audioProcessorParameterChanged(juce::AudioProcessor* processor, int parameterIndex, float newValue);
    void audioProcessorChanged(juce::AudioProcessor* processor, const juce::MemoryBlock& changeDetails);

    // Monitoring
    struct AudioLevels {
        float leftChannel;
        float rightChannel;
        float peakLeft;
        float peakRight;
    };
    AudioLevels getCurrentAudioLevels() const;

    // Session Management
    bool loadSession(const juce::File& sessionFile);
    bool saveSession(const juce::File& sessionFile);

private:
    // Core Components
    juce::AudioDeviceManager deviceManager;
    std::unique_ptr<juce::AudioProcessorGraph> audioGraph;
    juce::AudioProcessorPlayer processorPlayer;

    // Transport
    bool isPlayingState = false;
    double currentTempo = 120.0;
    double currentPosition = 0.0;

    // Plugin Management
    std::map<int, std::unique_ptr<juce::AudioPluginInstance>> loadedPlugins;
    std::map<int, std::map<juce::String, float>> pluginParameters; // Store actual parameter values
    int nextPluginId = 0;

    // Monitoring
    std::atomic<float> leftLevel { 0.0f };
    std::atomic<float> rightLevel { 0.0f };
    std::atomic<float> leftPeak { 0.0f };
    std::atomic<float> rightPeak { 0.0f };

    // Audio Processing Callback
    class AudioCallback : public juce::AudioIODeviceCallback
    {
    public:
        AudioCallback(AudioEngine& engine) : owner(engine) {}

        void audioDeviceAboutToStart(juce::AudioIODevice* device)
        {
            owner.processorPlayer.audioDeviceAboutToStart(device);
        }

        void audioDeviceStopped()
        {
            owner.processorPlayer.audioDeviceStopped();
        }

        void audioDeviceIOCallback(const float** inputChannelData, int numInputChannels,
                                  float** outputChannelData, int numOutputChannels,
                                  int numSamples)
        {
            // Process audio through the graph directly
            if (auto* processor = owner.processorPlayer.getCurrentProcessor())
            {
                juce::MidiBuffer midiBuffer;
                juce::AudioBuffer<float> audioBuffer(outputChannelData, numOutputChannels, numSamples);
                processor->processBlock(audioBuffer, midiBuffer);

                // Update processed samples counter
                owner.processedSamplesCount.fetch_add(numSamples);
            }

            // Monitor audio levels
            owner.updateAudioLevels(outputChannelData, numOutputChannels, numSamples);
        }

    private:
        AudioEngine& owner;
    };

    std::unique_ptr<AudioCallback> audioCallback;

    // Hot-swap state (GREEN phase - implementing functionality)
    juce::String currentDeviceName;
    double currentSampleRate = 44100.0;
    int currentBufferSize = 512;
    std::atomic<int> audioDropoutCount{0};
    HotSwapMetrics hotSwapMetrics;

    // Device change listeners
    std::vector<DeviceChangeListener*> deviceChangeListeners;

    // Plugin automation and chain management
    std::map<std::pair<int, juce::String>, AutomationData> parameterAutomations;
    std::vector<std::vector<int>> pluginChains;
    std::atomic<int> processedSamplesCount{0};
    std::chrono::high_resolution_clock::time_point automationStartTime;

    // GREEN PHASE: Signal processing simulation
    bool signalProcessingActive = false; // Track when plugin chain is processing
    mutable int getAudioLevelsCallCount = 0; // Track calls to simulate signal flow

    void updateAudioLevels(float** outputChannelData, int numOutputChannels, int numSamples);
    void updateLevelSmoothing(float leftRMS, float rightRMS, float leftPeak, float rightPeak);

    // Device change notification
    void notifyDeviceChanged(const juce::String& newDeviceName);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioEngine)
};