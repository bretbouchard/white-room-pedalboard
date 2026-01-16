#pragma once

#include <JuceHeader.h>
#include "AudioEngine.h"
#include <nlohmann/json.hpp>

using json = nlohmann::json;

class WebSocketBridge : public juce::ChangeListener,
                       public juce::Thread
{
public:
    WebSocketBridge(AudioEngine& engine);
    ~WebSocketBridge() override;

    // Server management
    bool startServer(int port = 8080);
    void stopServer();
    bool isRunning() const;

    // Change listener for audio engine updates
    void changeListenerCallback(juce::ChangeBroadcaster* source) override;

protected:
    void run() override;

private:
    AudioEngine& audioEngine;
    std::unique_ptr<juce::WebSocketServer> server;
    std::unique_ptr<juce::WebSocket> clientConnection;
    bool serverRunning = false;

    // Message handling
    void handleMessage(const json& message);
    void sendResponse(const json& response);

    // Command handlers
    void handleTransportCommand(const json& message);
    void handleParameterUpdate(const json& message);
    void handlePluginLoad(const json& message);
    void handlePluginUnload(const json& message);
    void handleGetAudioDevices(const json& message);
    void handleGetLoadedPlugins(const json& message);
    void handleGetAudioLevels(const json& message);

    // Response generators
    json createAudioLevelsResponse() const;
    json createPluginListResponse() const;
    json createDeviceListResponse() const;
    json createStatusResponse() const;

    // Helper methods
    json createErrorResponse(const std::string& error) const;
    json createSuccessResponse(const std::string& message = "") const;
    void broadcastAudioLevels();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(WebSocketBridge)
};