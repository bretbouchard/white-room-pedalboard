#include "WebSocketBridge.h"

WebSocketBridge::WebSocketBridge(AudioEngine& engine)
    : juce::Thread("WebSocketBridge"), audioEngine(engine)
{
    // Listen to audio engine changes
    audioEngine.addChangeListener(this);
}

WebSocketBridge::~WebSocketBridge()
{
    stopServer();
    audioEngine.removeChangeListener(this);
}

bool WebSocketBridge::startServer(int port)
{
    server = std::make_unique<juce::WebSocketServer>();

    if (server->startServer(port))
    {
        serverRunning = true;
        startThread();
        juce::Logger::writeToLog("WebSocket server started on port " + juce::String(port));
        return true;
    }

    juce::Logger::writeToLog("Failed to start WebSocket server on port " + juce::String(port));
    return false;
}

void WebSocketBridge::stopServer()
{
    if (serverRunning)
    {
        signalThreadShouldExit();
        waitForThreadToStop(5000);

        if (server)
        {
            server->stopServer();
            server.reset();
        }

        clientConnection.reset();
        serverRunning = false;
        juce::Logger::writeToLog("WebSocket server stopped");
    }
}

bool WebSocketBridge::isRunning() const
{
    return serverRunning;
}

void WebSocketBridge::run()
{
    while (!threadShouldExit())
    {
        if (server && serverRunning)
        {
            // Accept new connections
            auto connection = server->waitForConnection(100);
            if (connection != nullptr)
            {
                clientConnection = std::move(connection);
                juce::Logger::writeToLog("WebSocket client connected");

                // Send initial status
                sendResponse(createStatusResponse());
            }

            // Handle incoming messages
            if (clientConnection && clientConnection->isConnected())
            {
                auto message = clientConnection->receiveMessage(100);
                if (message.isNotEmpty())
                {
                    try
                    {
                        json jsonMessage = json::parse(message.toStdString());
                        handleMessage(jsonMessage);
                    }
                    catch (const json::parse_error& e)
                    {
                        sendResponse(createErrorResponse("Invalid JSON: " + std::string(e.what())));
                    }
                }
            }

            // Broadcast audio levels periodically
            if (clientConnection && clientConnection->isConnected())
            {
                static int levelCounter = 0;
                if (++levelCounter % 10 == 0) // Every ~100ms
                {
                    broadcastAudioLevels();
                }
            }
        }

        wait(10); // 10ms interval
    }
}

void WebSocketBridge::changeListenerCallback(juce::ChangeBroadcaster* source)
{
    if (source == &audioEngine)
    {
        // Audio engine state changed, send update
        if (clientConnection && clientConnection->isConnected())
        {
            sendResponse(createStatusResponse());
        }
    }
}

void WebSocketBridge::handleMessage(const json& message)
{
    if (!message.contains("type"))
    {
        sendResponse(createErrorResponse("Message missing 'type' field"));
        return;
    }

    std::string type = message["type"];

    if (type == "transport_command")
    {
        handleTransportCommand(message);
    }
    else if (type == "parameter_update")
    {
        handleParameterUpdate(message);
    }
    else if (type == "plugin_load")
    {
        handlePluginLoad(message);
    }
    else if (type == "plugin_unload")
    {
        handlePluginUnload(message);
    }
    else if (type == "get_audio_devices")
    {
        handleGetAudioDevices(message);
    }
    else if (type == "get_loaded_plugins")
    {
        handleGetLoadedPlugins(message);
    }
    else if (type == "get_audio_levels")
    {
        handleGetAudioLevels(message);
    }
    else
    {
        sendResponse(createErrorResponse("Unknown message type: " + type));
    }
}

void WebSocketBridge::handleTransportCommand(const json& message)
{
    if (!message.contains("action"))
    {
        sendResponse(createErrorResponse("Transport command missing 'action' field"));
        return;
    }

    std::string action = message["action"];

    if (action == "play")
    {
        audioEngine.startPlayback();
        sendResponse(createSuccessResponse("Playback started"));
    }
    else if (action == "stop")
    {
        audioEngine.stopPlayback();
        sendResponse(createSuccessResponse("Playback stopped"));
    }
    else if (action == "pause")
    {
        // For pause, we can implement as stop for now
        audioEngine.stopPlayback();
        sendResponse(createSuccessResponse("Playback paused"));
    }
    else if (action == "seek")
    {
        if (message.contains("position"))
        {
            double position = message["position"];
            audioEngine.setPlaybackPosition(position);
            sendResponse(createSuccessResponse("Position set to " + std::to_string(position)));
        }
        else
        {
            sendResponse(createErrorResponse("Seek command missing 'position' field"));
        }
    }
    else if (action == "set_tempo")
    {
        if (message.contains("tempo"))
        {
            double tempo = message["tempo"];
            audioEngine.setTempo(tempo);
            sendResponse(createSuccessResponse("Tempo set to " + std::to_string(tempo)));
        }
        else
        {
            sendResponse(createErrorResponse("Tempo command missing 'tempo' field"));
        }
    }
    else
    {
        sendResponse(createErrorResponse("Unknown transport action: " + action));
    }
}

void WebSocketBridge::handleParameterUpdate(const json& message)
{
    if (!message.contains("plugin_id") || !message.contains("parameter_name") || !message.contains("value"))
    {
        sendResponse(createErrorResponse("Parameter update missing required fields"));
        return;
    }

    int pluginId = message["plugin_id"];
    std::string parameterName = message["parameter_name"];
    float value = message["value"];

    bool success = audioEngine.setPluginParameter(pluginId, parameterName, value);
    if (success)
    {
        sendResponse(createSuccessResponse("Parameter updated"));
    }
    else
    {
        sendResponse(createErrorResponse("Failed to update parameter"));
    }
}

void WebSocketBridge::handlePluginLoad(const json& message)
{
    if (!message.contains("plugin_path"))
    {
        sendResponse(createErrorResponse("Plugin load missing 'plugin_path' field"));
        return;
    }

    std::string pluginPath = message["plugin_path"];
    int pluginId = audioEngine.loadPlugin(pluginPath);

    if (pluginId >= 0)
    {
        json response = createSuccessResponse("Plugin loaded");
        response["plugin_id"] = pluginId;
        sendResponse(response);
    }
    else
    {
        sendResponse(createErrorResponse("Failed to load plugin: " + pluginPath));
    }
}

void WebSocketBridge::handlePluginUnload(const json& message)
{
    if (!message.contains("plugin_id"))
    {
        sendResponse(createErrorResponse("Plugin unload missing 'plugin_id' field"));
        return;
    }

    int pluginId = message["plugin_id"];
    audioEngine.unloadPlugin(pluginId);
    sendResponse(createSuccessResponse("Plugin unloaded"));
}

void WebSocketBridge::handleGetAudioDevices(const json& message)
{
    sendResponse(createDeviceListResponse());
}

void WebSocketBridge::handleGetLoadedPlugins(const json& message)
{
    sendResponse(createPluginListResponse());
}

void WebSocketBridge::handleGetAudioLevels(const json& message)
{
    sendResponse(createAudioLevelsResponse());
}

json WebSocketBridge::createAudioLevelsResponse() const
{
    auto levels = audioEngine.getCurrentAudioLevels();
    json response = createSuccessResponse();
    response["type"] = "audio_levels";
    response["left_rms"] = levels.leftChannel;
    response["right_rms"] = levels.rightChannel;
    response["left_peak"] = levels.peakLeft;
    response["right_peak"] = levels.peakRight;
    response["timestamp"] = juce::Time::currentTimeMillis();
    return response;
}

json WebSocketBridge::createPluginListResponse() const
{
    auto plugins = audioEngine.getLoadedPlugins();
    json response = createSuccessResponse();
    response["type"] = "plugin_list";
    response["plugins"] = json::array();

    for (const auto& pluginName : plugins)
    {
        response["plugins"].push_back(pluginName.toStdString());
    }

    return response;
}

json WebSocketBridge::createDeviceListResponse() const
{
    auto devices = audioEngine.getAvailableAudioDevices();
    json response = createSuccessResponse();
    response["type"] = "audio_device_list";
    response["devices"] = json::array();

    for (const auto& deviceName : devices)
    {
        response["devices"].push_back(deviceName.toStdString());
    }

    return response;
}

json WebSocketBridge::createStatusResponse() const
{
    json response = createSuccessResponse();
    response["type"] = "status";
    response["is_playing"] = audioEngine.isPlaying();
    response["position"] = audioEngine.getPlaybackPosition();
    response["tempo"] = audioEngine.getTempo();
    response["server_running"] = serverRunning;
    return response;
}

json WebSocketBridge::createErrorResponse(const std::string& error) const
{
    json response;
    response["type"] = "error";
    response["error"] = error;
    response["timestamp"] = juce::Time::currentTimeMillis();
    return response;
}

json WebSocketBridge::createSuccessResponse(const std::string& message) const
{
    json response;
    response["type"] = "success";
    response["timestamp"] = juce::Time::currentTimeMillis();
    if (!message.empty())
    {
        response["message"] = message;
    }
    return response;
}

void WebSocketBridge::sendResponse(const json& response)
{
    if (clientConnection && clientConnection->isConnected())
    {
        std::string message = response.dump();
        clientConnection->sendMessage(message);
    }
}

void WebSocketBridge::broadcastAudioLevels()
{
    sendResponse(createAudioLevelsResponse());
}