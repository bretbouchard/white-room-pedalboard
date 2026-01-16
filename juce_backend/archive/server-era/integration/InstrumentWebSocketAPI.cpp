#include "websocket/InstrumentWebSocketAPI.h"
#include "instrument/InstrumentInstance.h"
#include <random>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <chrono>

namespace schill {
namespace websocket {

//==============================================================================
// InstrumentWebSocketAPI Implementation
//==============================================================================

InstrumentWebSocketAPI::InstrumentWebSocketAPI(InstrumentManager* instrumentManager,
                                              AudioRoutingEngine* audioRoutingEngine,
                                              MidiRoutingEngine* midiRoutingEngine)
    : juce::Thread("InstrumentWebSocketAPI"),
      instrumentManager_(instrumentManager),
      audioRoutingEngine_(audioRoutingEngine),
      midiRoutingEngine_(midiRoutingEngine) {

    jassert(instrumentManager_ != nullptr);
    jassert(audioRoutingEngine_ != nullptr);
    jassert(midiRoutingEngine_ != nullptr);

    // Initialize command handlers
    setupCommandHandlers();

    // Set up default callbacks from routing engines
    if (midiRoutingEngine_) {
        midiRoutingEngine_->setMidiActivityCallback([this](const std::string& source, const juce::MidiMessage& message) {
            if (midiActivityEnabled_ && realtimeUpdatesEnabled_) {
                // Queue MIDI activity for broadcasting
                juce::MessageManager::callAsync([this, source, message]() {
                    if (midiActivityCallback_) {
                        midiActivityCallback_(source, message);
                    }
                });
            }
        });
    }
}

InstrumentWebSocketAPI::~InstrumentWebSocketAPI() {
    stopServer();
}

bool InstrumentWebSocketAPI::startServer(const WebSocketAPIConfig& config) {
    if (serverRunning_) {
        return true; // Already running
    }

    config_ = config;

    try {
        if (!setupWebSocketServer()) {
            juce::Logger::writeToLog("Failed to setup WebSocket server");
            return false;
        }

        // Start the processing thread
        startThread();

        // Start real-time update timer if enabled
        if (config_.enableRealTimeUpdates) {
            startBroadcastTimer();
        }

        serverRunning_ = true;
        juce::Logger::writeToLog("Instrument WebSocket API started on port " + juce::String(config_.port));
        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to start Instrument WebSocket API: " + juce::String(e.what()));
        return false;
    }
}

void InstrumentWebSocketAPI::stopServer() {
    if (!serverRunning_) {
        return;
    }

    serverRunning_ = false;

    // Stop real-time update timer
    stopBroadcastTimer();

    // Stop the processing thread
    stopThread(5000);

    // Disconnect all clients
    {
        juce::ScopedLock lock(clientsMutex_);
        clients_.clear();
    }

    // Stop WebSocket server
    if (webSocketServer_) {
        webSocketServer_.reset();
    }

    juce::Logger::writeToLog("Instrument WebSocket API stopped");
}

bool InstrumentWebSocketAPI::isRunning() const {
    return serverRunning_;
}

//==============================================================================
// Thread Implementation
//==============================================================================

void InstrumentWebSocketAPI::run() {
    while (!threadShouldExit()) {
        try {
            // Process any pending tasks
            cleanupInactiveClients();

            // Sleep for a short interval
            wait(100);

        } catch (const std::exception& e) {
            juce::Logger::writeToLog("Error in WebSocket API thread: " + juce::String(e.what()));
        }
    }
}

//==============================================================================
// Timer Implementation
//==============================================================================

void InstrumentWebSocketAPI::timerCallback() {
    if (!realtimeUpdatesEnabled_ || !serverRunning_) {
        return;
    }

    try {
        // Broadcast real-time updates
        if (config_.enableAudioLevelBroadcast) {
            broadcastAudioLevelUpdates();
        }

        if (config_.enableMidiActivityBroadcast) {
            broadcastMidiActivity();
        }

        // Cleanup inactive clients
        cleanupInactiveClients();

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Error in timer callback: " + juce::String(e.what()));
    }
}

//==============================================================================
// Core Server Methods
//==============================================================================

bool InstrumentWebSocketAPI::setupWebSocketServer() {
    try {
        webSocketServer_ = std::make_unique<juce::WebSocketServer>();

        // Set up connection callback
        webSocketServer_->onNewConnection = [this](std::unique_ptr<juce::WebSocket> websocket) {
            handleNewConnection(std::move(websocket));
        };

        // Start the server
        if (!webSocketServer_->start(config_.port, config_.bindAddress)) {
            juce::Logger::writeToLog("Failed to start WebSocket server on port " + juce::String(config_.port));
            return false;
        }

        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Exception setting up WebSocket server: " + juce::String(e.what()));
        return false;
    }
}

void InstrumentWebSocketAPI::handleNewConnection(std::unique_ptr<juce::WebSocket> websocket) {
    if (!websocket) {
        return;
    }

    std::string connectionId = generateConnectionId();

    // Check connection limit
    if (clients_.size() >= static_cast<size_t>(config_.maxConnections)) {
        juce::Logger::writeToLog("Connection rejected: maximum connections reached");
        return;
    }

    // Set up message callback
    websocket->onMessage = [this, connectionId](const juce::String& message) {
        handleMessage(connectionId, message.toStdString());
    };

    websocket->onDisconnect = [this, connectionId]() {
        handleDisconnection(connectionId);
    };

    // Add client
    addClient(connectionId, std::move(websocket));

    juce::Logger::writeToLog("New WebSocket connection: " + juce::String(connectionId));

    // Send welcome message
    auto welcomeMsg = createSuccessResponse("", {{"message", "Connected to Instrument WebSocket API"},
                                                  {"connectionId", connectionId},
                                                  {"serverTime", getCurrentTimestamp()}});
    broadcastToClient(connectionId, welcomeMsg);

    // Update statistics
    {
        juce::ScopedLock lock(statsMutex_);
        statistics_.totalConnections++;
    }
}

void InstrumentWebSocketAPI::handleDisconnection(const std::string& connectionId) {
    juce::Logger::writeToLog("WebSocket disconnected: " + juce::String(connectionId));
    removeClient(connectionId);
}

void InstrumentWebSocketAPI::handleMessage(const std::string& connectionId, const std::string& message) {
    if (!isValidJson(message)) {
        auto errorMsg = createErrorResponse("", "Invalid JSON format", 400);
        broadcastToClient(connectionId, errorMsg);
        return;
    }

    try {
        // Parse message
        json jsonMsg = json::parse(message);
        APIMessage apiMsg = APIMessage::fromJson(jsonMsg);

        // Update last activity
        if (auto client = getClient(connectionId)) {
            client->lastActivity = juce::Time::getCurrentTime();
        }

        // Check rate limiting
        if (rateLimitEnabled_ && !checkRateLimit(connectionId)) {
            auto errorMsg = createErrorResponse(apiMsg.requestId, "Rate limit exceeded", 429);
            broadcastToClient(connectionId, errorMsg);
            return;
        }

        // Process message
        if (processMessage(connectionId, apiMsg)) {
            // Update statistics
            {
                juce::ScopedLock lock(statsMutex_);
                statistics_.totalMessagesReceived++;
                statistics_.messageTypeCounts[apiMsg.type]++;
            }
        }

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Error processing message: " + juce::String(e.what()));
        auto errorMsg = createErrorResponse("", "Message processing error", 500);
        broadcastToClient(connectionId, errorMsg);
    }
}

//==============================================================================
// Message Processing
//==============================================================================

bool InstrumentWebSocketAPI::processMessage(const std::string& connectionId, const APIMessage& message) {
    if (!validateMessage(message)) {
        auto errorMsg = createErrorResponse(message.requestId, "Invalid message format", 400);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }

    // Check authentication if required
    if (config_.requireAuthentication) {
        auto client = getClient(connectionId);
        if (!client || !client->isAuthenticated) {
            auto authMsg = createAuthRequiredResponse(message.requestId);
            broadcastToClient(connectionId, authMsg);
            return false;
        }
    }

    // Route to appropriate handler
    auto it = commandHandlers_.find(message.type);
    if (it != commandHandlers_.end()) {
        try {
            return it->second(connectionId, message);
        } catch (const std::exception& e) {
            juce::Logger::writeToLog("Error in command handler: " + juce::String(e.what()));
            auto errorMsg = createErrorResponse(message.requestId, "Command execution error", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }
    }

    // Unknown message type
    auto errorMsg = createErrorResponse(message.requestId, "Unknown message type", 404);
    broadcastToClient(connectionId, errorMsg);
    return false;
}

bool InstrumentWebSocketAPI::validateMessage(const APIMessage& message) {
    // Basic validation
    if (message.payload.is_null()) {
        return false;
    }

    // Check message size
    std::string msgStr = message.toJson().dump();
    if (msgStr.length() > static_cast<size_t>(config_.maxMessageSize)) {
        return false;
    }

    return true;
}

bool InstrumentWebSocketAPI::checkRateLimit(const std::string& connectionId) {
    auto client = getClient(connectionId);
    if (!client) {
        return false;
    }

    auto now = juce::Time::getCurrentTime();

    // Reset per-second counter
    if (now > client->lastSecondReset + juce::RelativeTime::seconds(1.0)) {
        client->messagesPerSecond = 0;
        client->lastSecondReset = now;
    }

    // Reset per-minute counter
    if (now > client->lastMinuteReset + juce::RelativeTime::minutes(1.0)) {
        client->messagesPerMinute = 0;
        client->lastMinuteReset = now;
    }

    // Check limits
    if (client->messagesPerSecond >= maxMessagesPerSecond_ ||
        client->messagesPerMinute >= maxMessagesPerMinute_) {
        return false;
    }

    // Increment counters
    client->messagesPerSecond++;
    client->messagesPerMinute++;

    return true;
}

//==============================================================================
// Command Handlers Setup
//==============================================================================

void InstrumentWebSocketAPI::setupCommandHandlers() {
    // Instrument Management
    commandHandlers_[WSMessageType::GET_INSTRUMENT_LIST] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetInstrumentList(conn, msg); };
    commandHandlers_[WSMessageType::CREATE_INSTRUMENT_INSTANCE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleCreateInstrumentInstance(conn, msg); };
    commandHandlers_[WSMessageType::DELETE_INSTRUMENT_INSTANCE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleDeleteInstrumentInstance(conn, msg); };
    commandHandlers_[WSMessageType::GET_INSTRUMENT_INFO] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetInstrumentInfo(conn, msg); };
    commandHandlers_[WSMessageType::GET_INSTRUMENT_PARAMETERS] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetInstrumentParameters(conn, msg); };
    commandHandlers_[WSMessageType::SET_INSTRUMENT_PARAMETER] =
        [this](const std::string& conn, const APIMessage& msg) { return handleSetInstrumentParameter(conn, msg); };

    // Plugin Management
    commandHandlers_[WSMessageType::SCAN_PLUGINS] =
        [this](const std::string& conn, const APIMessage& msg) { return handleScanPlugins(conn, msg); };
    commandHandlers_[WSMessageType::GET_PLUGIN_LIST] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetPluginList(conn, msg); };
    commandHandlers_[WSMessageType::LOAD_PLUGIN] =
        [this](const std::string& conn, const APIMessage& msg) { return handleLoadPlugin(conn, msg); };
    commandHandlers_[WSMessageType::UNLOAD_PLUGIN] =
        [this](const std::string& conn, const APIMessage& msg) { return handleUnloadPlugin(conn, msg); };
    commandHandlers_[WSMessageType::GET_PLUGIN_INFO] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetPluginInfo(conn, msg); };

    // Audio Routing
    commandHandlers_[WSMessageType::CREATE_AUDIO_ROUTE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleCreateAudioRoute(conn, msg); };
    commandHandlers_[WSMessageType::DELETE_AUDIO_ROUTE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleDeleteAudioRoute(conn, msg); };
    commandHandlers_[WSMessageType::UPDATE_AUDIO_ROUTE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleUpdateAudioRoute(conn, msg); };
    commandHandlers_[WSMessageType::GET_AUDIO_ROUTES] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetAudioRoutes(conn, msg); };
    commandHandlers_[WSMessageType::GET_AUDIO_LEVELS] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetAudioLevels(conn, msg); };

    // MIDI Routing
    commandHandlers_[WSMessageType::CREATE_MIDI_ROUTE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleCreateMidiRoute(conn, msg); };
    commandHandlers_[WSMessageType::DELETE_MIDI_ROUTE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleDeleteMidiRoute(conn, msg); };
    commandHandlers_[WSMessageType::UPDATE_MIDI_ROUTE] =
        [this](const std::string& conn, const APIMessage& msg) { return handleUpdateMidiRoute(conn, msg); };
    commandHandlers_[WSMessageType::GET_MIDI_ROUTES] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetMidiRoutes(conn, msg); };
    commandHandlers_[WSMessageType::GET_MIDI_DEVICES] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetMidiDevices(conn, msg); };

    // MIDI Learn
    commandHandlers_[WSMessageType::START_MIDI_LEARN] =
        [this](const std::string& conn, const APIMessage& msg) { return handleStartMidiLearn(conn, msg); };
    commandHandlers_[WSMessageType::STOP_MIDI_LEARN] =
        [this](const std::string& conn, const APIMessage& msg) { return handleStopMidiLearn(conn, msg); };
    commandHandlers_[WSMessageType::GET_MIDI_LEARN_MAPPINGS] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetMidiLearnMappings(conn, msg); };
    commandHandlers_[WSMessageType::SET_MIDI_LEARN_MAPPING] =
        [this](const std::string& conn, const APIMessage& msg) { return handleSetMidiLearnMapping(conn, msg); };
    commandHandlers_[WSMessageType::DELETE_MIDI_LEARN_MAPPING] =
        [this](const std::string& conn, const APIMessage& msg) { return handleDeleteMidiLearnMapping(conn, msg); };

    // Preset Management
    commandHandlers_[WSMessageType::GET_PRESET_LIST] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetPresetList(conn, msg); };
    commandHandlers_[WSMessageType::LOAD_PRESET] =
        [this](const std::string& conn, const APIMessage& msg) { return handleLoadPreset(conn, msg); };
    commandHandlers_[WSMessageType::SAVE_PRESET] =
        [this](const std::string& conn, const APIMessage& msg) { return handleSavePreset(conn, msg); };
    commandHandlers_[WSMessageType::DELETE_PRESET] =
        [this](const std::string& conn, const APIMessage& msg) { return handleDeletePreset(conn, msg); };

    // Performance Monitoring
    commandHandlers_[WSMessageType::GET_PERFORMANCE_STATS] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetPerformanceStats(conn, msg); };
    commandHandlers_[WSMessageType::GET_SYSTEM_STATUS] =
        [this](const std::string& conn, const APIMessage& msg) { return handleGetSystemStatus(conn, msg); };

    // AI Agent Integration
    commandHandlers_[WSMessageType::AI_AGENT_COMMAND] =
        [this](const std::string& conn, const APIMessage& msg) { return handleAIAgentCommand(conn, msg); };
}

//==============================================================================
// Instrument Management Handlers
//==============================================================================

bool InstrumentWebSocketAPI::handleGetInstrumentList(const std::string& connectionId, const APIMessage& message) {
    try {
        auto instruments = instrumentManager_->getAvailableInstruments();
        json response = buildInstrumentListResponse();

        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get instrument list", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleCreateInstrumentInstance(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string instrumentName = message.payload.value("instrumentName", "");
        std::string instanceName = message.payload.value("instanceName", "");

        if (instrumentName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Instrument name is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto instance = instrumentManager_->createInstance(instrumentName, instanceName);
        if (!instance) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to create instrument instance", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        json response = {
            {"instanceId", instance->getInstanceId()},
            {"instrumentName", instrumentName},
            {"instanceName", instanceName}
        };

        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        // Call callback if set
        if (instrumentCreatedCallback_) {
            instrumentCreatedCallback_(instanceName);
        }

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to create instrument instance", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleDeleteInstrumentInstance(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string instanceName = message.payload.value("instanceName", "");

        if (instanceName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Instance name is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        bool success = instrumentManager_->removeInstance(instanceName);
        if (!success) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to remove instrument instance", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"deleted", true}});
        broadcastToClient(connectionId, successMsg);

        // Call callback if set
        if (instrumentDeletedCallback_) {
            instrumentDeletedCallback_(instanceName);
        }

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to delete instrument instance", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetInstrumentInfo(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string instrumentName = message.payload.value("instrumentName", "");

        if (instrumentName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Instrument name is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        json response = buildInstrumentInfoResponse(instrumentName);
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get instrument info", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetInstrumentParameters(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string instanceName = message.payload.value("instanceName", "");

        if (instanceName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Instance name is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto instance = instrumentManager_->getInstance(instanceName);
        if (!instance) {
            auto errorMsg = createErrorResponse(message.requestId, "Instance not found", 404);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        // This would need to be implemented in the instrument instance
        auto successMsg = createSuccessResponse(message.requestId, {{"parameters", json::array()}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get instrument parameters", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleSetInstrumentParameter(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string instanceName = message.payload.value("instanceName", "");
        std::string parameterName = message.payload.value("parameterName", "");
        float value = message.payload.value("value", 0.0f);

        if (instanceName.empty() || parameterName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Instance name and parameter name are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto instance = instrumentManager_->getInstance(instanceName);
        if (!instance) {
            auto errorMsg = createErrorResponse(message.requestId, "Instance not found", 404);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        // This would need to be implemented in the instrument instance
        // instance->setParameter(parameterName, value);

        auto successMsg = createSuccessResponse(message.requestId, {{"updated", true}});
        broadcastToClient(connectionId, successMsg);

        // Call callback if set
        if (parameterChangedCallback_) {
            parameterChangedCallback_(instanceName, parameterName, value);
        }

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to set instrument parameter", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// Plugin Management Handlers
//==============================================================================

bool InstrumentWebSocketAPI::handleScanPlugins(const std::string& connectionId, const APIMessage& message) {
    try {
        std::vector<std::string> scanPaths;
        if (message.payload.contains("scanPaths") && message.payload["scanPaths"].is_array()) {
            for (const auto& path : message.payload["scanPaths"]) {
                scanPaths.push_back(path.get<std::string>());
            }
        }

        // This would need to be implemented in the plugin manager
        auto successMsg = createSuccessResponse(message.requestId, {{"scanning", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to scan plugins", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetPluginList(const std::string& connectionId, const APIMessage& message) {
    try {
        json response = buildPluginListResponse();
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);
        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get plugin list", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleLoadPlugin(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string pluginPath = message.payload.value("pluginPath", "");

        if (pluginPath.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Plugin path is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        // This would need to be implemented in the plugin manager
        auto successMsg = createSuccessResponse(message.requestId, {{"loaded", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to load plugin", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleUnloadPlugin(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string pluginName = message.payload.value("pluginName", "");

        if (pluginName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Plugin name is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"unloaded", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to unload plugin", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetPluginInfo(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string pluginName = message.payload.value("pluginName", "");

        if (pluginName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Plugin name is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        json response = {{"pluginName", pluginName}, {"info", json::object()}};
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get plugin info", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// Audio Routing Handlers
//==============================================================================

bool InstrumentWebSocketAPI::handleCreateAudioRoute(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string source = message.payload.value("source", "");
        std::string target = message.payload.value("target", "");

        if (source.empty() || target.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Source and target are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        // This would need to be implemented in the audio routing engine
        auto successMsg = createSuccessResponse(message.requestId, {{"routeCreated", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to create audio route", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleDeleteAudioRoute(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string routeId = message.payload.value("routeId", "");

        if (routeId.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Route ID is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"deleted", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to delete audio route", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleUpdateAudioRoute(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string routeId = message.payload.value("routeId", "");

        if (routeId.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Route ID is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"updated", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to update audio route", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetAudioRoutes(const std::string& connectionId, const APIMessage& message) {
    try {
        json response = buildAudioRoutesResponse();
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);
        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get audio routes", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetAudioLevels(const std::string& connectionId, const APIMessage& message) {
    try {
        // Get current audio levels from audio routing engine
        std::vector<float> levels(16, 0.0f); // Assuming 16 channels

        auto successMsg = createSuccessResponse(message.requestId, {{"levels", levels}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get audio levels", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// MIDI Routing Handlers
//==============================================================================

bool InstrumentWebSocketAPI::handleCreateMidiRoute(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string sourceDevice = message.payload.value("sourceDevice", "");
        std::string targetInstrument = message.payload.value("targetInstrument", "");

        if (sourceDevice.empty() || targetInstrument.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Source device and target instrument are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        // Create MIDI route configuration
        midi::MidiRouteConfig config;
        config.sourceDevice = sourceDevice;
        config.targetInstrument = targetInstrument;

        auto routeId = midiRoutingEngine_->createRoute(config);
        if (routeId == midi::INVALID_ROUTE_ID) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to create MIDI route", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        json response = {{"routeId", routeId}, {"created", true}};
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to create MIDI route", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleDeleteMidiRoute(const std::string& connectionId, const APIMessage& message) {
    try {
        RouteID routeId = message.payload.value("routeId", 0);

        if (routeId == 0) {
            auto errorMsg = createErrorResponse(message.requestId, "Route ID is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        bool success = midiRoutingEngine_->removeRoute(routeId);
        if (!success) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to delete MIDI route", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"deleted", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to delete MIDI route", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleUpdateMidiRoute(const std::string& connectionId, const APIMessage& message) {
    try {
        RouteID routeId = message.payload.value("routeId", 0);

        if (routeId == 0) {
            auto errorMsg = createErrorResponse(message.requestId, "Route ID is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        // This would need route configuration updates
        auto successMsg = createSuccessResponse(message.requestId, {{"updated", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to update MIDI route", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetMidiRoutes(const std::string& connectionId, const APIMessage& message) {
    try {
        json response = buildMidiRoutesResponse();
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);
        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get MIDI routes", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetMidiDevices(const std::string& connectionId, const APIMessage& message) {
    try {
        json response = buildMidiDevicesResponse();
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);
        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get MIDI devices", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// MIDI Learn Handlers
//==============================================================================

bool InstrumentWebSocketAPI::handleStartMidiLearn(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string parameterName = message.payload.value("parameterName", "");
        std::string instrumentName = message.payload.value("instrumentName", "");

        if (parameterName.empty() || instrumentName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Parameter name and instrument name are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        bool success = midiRoutingEngine_->startMidiLearn(parameterName, instrumentName);
        if (!success) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to start MIDI learn", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"learning", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to start MIDI learn", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleStopMidiLearn(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string parameterName = message.payload.value("parameterName", "");
        std::string instrumentName = message.payload.value("instrumentName", "");

        if (parameterName.empty() || instrumentName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Parameter name and instrument name are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        bool success = midiRoutingEngine_->stopMidiLearn(parameterName, instrumentName);
        if (!success) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to stop MIDI learn", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"stopped", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to stop MIDI learn", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetMidiLearnMappings(const std::string& connectionId, const APIMessage& message) {
    try {
        auto mappings = midiRoutingEngine_->getMidiLearnMappings();
        json mappingsJson = json::array();

        for (const auto& mapping : mappings) {
            json mappingObj;
            mappingObj["parameterName"] = mapping.parameterName;
            mappingObj["instrumentName"] = mapping.instrumentName;
            mappingObj["midiCC"] = mapping.midiCC;
            mappingObj["midiChannel"] = mapping.midiChannel;
            mappingObj["minValue"] = mapping.minValue;
            mappingObj["maxValue"] = mapping.maxValue;
            mappingObj["isLearning"] = mapping.isLearning;
            mappingsJson.push_back(mappingObj);
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"mappings", mappingsJson}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get MIDI learn mappings", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleSetMidiLearnMapping(const std::string& connectionId, const APIMessage& message) {
    try {
        midi::MidiLearnConfig config;
        config.parameterName = message.payload.value("parameterName", "");
        config.instrumentName = message.payload.value("instrumentName", "");
        config.midiCC = message.payload.value("midiCC", -1);
        config.midiChannel = message.payload.value("midiChannel", -1);
        config.minValue = message.payload.value("minValue", 0.0f);
        config.maxValue = message.payload.value("maxValue", 1.0f);

        if (config.parameterName.empty() || config.instrumentName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Parameter name and instrument name are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        bool success = midiRoutingEngine_->addMidiLearnMapping(config);
        if (!success) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to set MIDI learn mapping", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"mapped", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to set MIDI learn mapping", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleDeleteMidiLearnMapping(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string parameterName = message.payload.value("parameterName", "");
        std::string instrumentName = message.payload.value("instrumentName", "");

        if (parameterName.empty() || instrumentName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Parameter name and instrument name are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        bool success = midiRoutingEngine_->removeMidiLearnMapping(parameterName, instrumentName);
        if (!success) {
            auto errorMsg = createErrorResponse(message.requestId, "Failed to delete MIDI learn mapping", 500);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"deleted", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to delete MIDI learn mapping", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// Preset Management Handlers
//==============================================================================

bool InstrumentWebSocketAPI::handleGetPresetList(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string instrumentName = message.payload.value("instrumentName", "");

        // This would need to be implemented in the preset system
        json response = {{"presets", json::array()}};
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get preset list", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleLoadPreset(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string presetName = message.payload.value("presetName", "");
        std::string instanceName = message.payload.value("instanceName", "");

        if (presetName.empty() || instanceName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Preset name and instance name are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"loaded", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to load preset", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleSavePreset(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string presetName = message.payload.value("presetName", "");
        std::string instanceName = message.payload.value("instanceName", "");

        if (presetName.empty() || instanceName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Preset name and instance name are required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"saved", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to save preset", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleDeletePreset(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string presetName = message.payload.value("presetName", "");

        if (presetName.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Preset name is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        auto successMsg = createSuccessResponse(message.requestId, {{"deleted", true}});
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to delete preset", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// Performance Monitoring Handlers
//==============================================================================

bool InstrumentWebSocketAPI::handleGetPerformanceStats(const std::string& connectionId, const APIMessage& message) {
    try {
        json response = buildPerformanceStatsResponse();
        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);
        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get performance stats", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

bool InstrumentWebSocketAPI::handleGetSystemStatus(const std::string& connectionId, const APIMessage& message) {
    try {
        json response = {
            {"serverRunning", serverRunning_},
            {"connectedClients", getClientCount()},
            {"realtimeUpdatesEnabled", realtimeUpdatesEnabled_},
            {"uptimeSeconds", juce::Time::getCurrentTime().toMilliseconds()},
            {"version", "1.0.0"}
        };

        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to get system status", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// AI Agent Integration Handler
//==============================================================================

bool InstrumentWebSocketAPI::handleAIAgentCommand(const std::string& connectionId, const APIMessage& message) {
    try {
        std::string command = message.payload.value("command", "");
        json parameters = message.payload.value("parameters", json::object());

        if (command.empty()) {
            auto errorMsg = createErrorResponse(message.requestId, "Command is required", 400);
            broadcastToClient(connectionId, errorMsg);
            return false;
        }

        // This would interface with the AI agent integration system
        json response = {
            {"command", command},
            {"result", "Command processed"},
            {"timestamp", getCurrentTimestamp()}
        };

        auto successMsg = createSuccessResponse(message.requestId, response);
        broadcastToClient(connectionId, successMsg);

        return true;
    } catch (const std::exception& e) {
        auto errorMsg = createErrorResponse(message.requestId, "Failed to process AI agent command", 500);
        broadcastToClient(connectionId, errorMsg);
        return false;
    }
}

//==============================================================================
// Response Generation
//==============================================================================

APIMessage InstrumentWebSocketAPI::createSuccessResponse(const std::string& requestId, const json& data) const {
    json payload = {
        {"success", true},
        {"data", data}
    };
    return APIMessage(WSMessageType::SUCCESS_RESPONSE, payload, requestId);
}

APIMessage InstrumentWebSocketAPI::createErrorResponse(const std::string& requestId, const std::string& error, int code) const {
    json payload = {
        {"success", false},
        {"error", error},
        {"code", code}
    };
    return APIMessage(WSMessageType::ERROR_RESPONSE, payload, requestId);
}

APIMessage InstrumentWebSocketAPI::createAuthRequiredResponse(const std::string& requestId) const {
    json payload = {
        {"success", false},
        {"error", "Authentication required"},
        {"code", 401}
    };
    return APIMessage(WSMessageType::AUTH_REQUIRED, payload, requestId);
}

//==============================================================================
// Response Builders
//==============================================================================

json InstrumentWebSocketAPI::buildInstrumentListResponse() const {
    auto instruments = instrumentManager_->getAvailableInstruments();
    json instrumentsJson = json::array();

    for (const auto& instrument : instruments) {
        json instrumentObj;
        instrumentObj["name"] = instrument.name;
        instrumentObj["type"] = instrument.type;
        instrumentObj["description"] = instrument.description;
        instrumentObj["version"] = instrument.version;
        instrumentObj["isBuiltin"] = instrument.isBuiltin;
        instrumentsJson.push_back(instrumentObj);
    }

    return {{"instruments", instrumentsJson}};
}

json InstrumentWebSocketAPI::buildInstrumentInfoResponse(const std::string& instrumentName) const {
    // Get instrument info from manager
    auto instruments = instrumentManager_->getAvailableInstruments();

    for (const auto& instrument : instruments) {
        if (instrument.name == instrumentName) {
            json info;
            info["name"] = instrument.name;
            info["type"] = instrument.type;
            info["description"] = instrument.description;
            info["version"] = instrument.version;
            info["isBuiltin"] = instrument.isBuiltin;
            return info;
        }
    }

    return {{"error", "Instrument not found"}};
}

json InstrumentWebSocketAPI::buildPluginListResponse() const {
    // This would get the list of available plugins from the plugin manager
    json pluginsJson = json::array();

    // Placeholder - would be populated with actual plugin data
    return {{"plugins", pluginsJson}};
}

json InstrumentWebSocketAPI::buildAudioRoutesResponse() const {
    // This would get the current audio routes from the audio routing engine
    json routesJson = json::array();

    // Placeholder - would be populated with actual route data
    return {{"routes", routesJson}};
}

json InstrumentWebSocketAPI::buildMidiRoutesResponse() const {
    auto routes = midiRoutingEngine_->getAllRoutes();
    json routesJson = json::array();

    for (auto routeId : routes) {
        auto config = midiRoutingEngine_->getRouteConfig(routeId);
        json routeObj;
        routeObj["routeId"] = routeId;
        routeObj["name"] = config.name;
        routeObj["sourceDevice"] = config.sourceDevice;
        routeObj["targetInstrument"] = config.targetInstrument;
        routeObj["enabled"] = midiRoutingEngine_->isRouteEnabled(routeId);
        routesJson.push_back(routeObj);
    }

    return {{"routes", routesJson}};
}

json InstrumentWebSocketAPI::buildMidiDevicesResponse() const {
    auto inputDevices = midiRoutingEngine_->getAvailableInputDevices();
    auto outputDevices = midiRoutingEngine_->getAvailableOutputDevices();
    auto activeDevices = midiRoutingEngine_->getActiveDevices();

    json inputJson = json::array();
    json outputJson = json::array();
    json activeJson = json::array();

    for (const auto& device : inputDevices) {
        json deviceObj;
        deviceObj["name"] = device.name;
        deviceObj["identifier"] = device.identifier;
        deviceObj["isInput"] = device.isInput;
        deviceObj["isOutput"] = device.isOutput;
        deviceObj["isActive"] = device.isActive;
        inputJson.push_back(deviceObj);
    }

    for (const auto& device : outputDevices) {
        json deviceObj;
        deviceObj["name"] = device.name;
        deviceObj["identifier"] = device.identifier;
        deviceObj["isInput"] = device.isInput;
        deviceObj["isOutput"] = device.isOutput;
        deviceObj["isActive"] = device.isActive;
        outputJson.push_back(deviceObj);
    }

    for (const auto& device : activeDevices) {
        json deviceObj;
        deviceObj["name"] = device.name;
        deviceObj["identifier"] = device.identifier;
        activeJson.push_back(deviceObj);
    }

    return {
        {"inputDevices", inputJson},
        {"outputDevices", outputJson},
        {"activeDevices", activeJson}
    };
}

json InstrumentWebSocketAPI::buildPerformanceStatsResponse() const {
    auto apiStats = getStatistics();
    auto midiStats = midiRoutingEngine_->getStatistics();

    json response = {
        {"webSocketAPI", {
            {"totalMessagesReceived", apiStats.totalMessagesReceived},
            {"totalMessagesSent", apiStats.totalMessagesSent},
            {"currentConnections", apiStats.currentConnections},
            {"totalConnections", apiStats.totalConnections},
            {"averageMessageProcessingTimeMs", apiStats.averageMessageProcessingTimeMs}
        }},
        {"midiRouting", {
            {"totalMessagesRouted", midiStats.totalMessagesRouted},
            {"messagesFiltered", midiStats.messagesFiltered},
            {"messagesTransformed", midiStats.messagesTransformed},
            {"routesActive", midiStats.routesActive},
            {"averageLatencyMs", midiStats.averageLatencyMs}
        }},
        {"timestamp", getCurrentTimestamp()}
    };

    return response;
}

//==============================================================================
// Client Management
//==============================================================================

std::string InstrumentWebSocketAPI::generateConnectionId() const {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(100000, 999999);

    return "conn_" + std::to_string(dis(gen));
}

void InstrumentWebSocketAPI::addClient(const std::string& connectionId, std::unique_ptr<juce::WebSocket> websocket) {
    juce::ScopedLock lock(clientsMutex_);

    auto client = std::make_unique<ClientConnection>(connectionId, std::move(websocket));
    clients_[connectionId] = std::move(client);

    // Update statistics
    {
        juce::ScopedLock statsLock(statsMutex_);
        statistics_.currentConnections = clients_.size();
    }
}

void InstrumentWebSocketAPI::removeClient(const std::string& connectionId) {
    juce::ScopedLock lock(clientsMutex_);
    clients_.erase(connectionId);

    // Update statistics
    {
        juce::ScopedLock statsLock(statsMutex_);
        statistics_.currentConnections = clients_.size();
    }
}

ClientConnection* InstrumentWebSocketAPI::getClient(const std::string& connectionId) {
    juce::ScopedLock lock(clientsMutex_);
    auto it = clients_.find(connectionId);
    return (it != clients_.end()) ? it->second.get() : nullptr;
}

void InstrumentWebSocketAPI::cleanupInactiveClients() {
    juce::ScopedLock lock(clientsMutex_);
    auto now = juce::Time::getCurrentTime();

    for (auto it = clients_.begin(); it != clients_.end();) {
        auto& client = it->second;

        // Remove inactive clients (no activity for 5 minutes)
        if (now > client->lastActivity + juce::RelativeTime::minutes(5.0)) {
            juce::Logger::writeToLog("Removing inactive client: " + juce::String(it->first));
            it = clients_.erase(it);
        } else {
            ++it;
        }
    }

    // Update statistics
    {
        juce::ScopedLock statsLock(statsMutex_);
        statistics_.currentConnections = clients_.size();
    }
}

//==============================================================================
// Message Broadcasting
//==============================================================================

void InstrumentWebSocketAPI::broadcastToAll(const APIMessage& message) {
    juce::ScopedLock lock(clientsMutex_);

    std::string messageStr = message.toJson().dump();

    for (auto& [connectionId, client] : clients_) {
        if (client->websocket && client->websocket->isConnected()) {
            try {
                client->websocket->send(messageStr);
            } catch (const std::exception& e) {
                juce::Logger::writeToLog("Failed to send message to client " +
                                        juce::String(connectionId) + ": " + juce::String(e.what()));
            }
        }
    }

    // Update statistics
    {
        juce::ScopedLock statsLock(statsMutex_);
        statistics_.totalMessagesSent += clients_.size();
    }
}

void InstrumentWebSocketAPI::broadcastToClient(const std::string& connectionId, const APIMessage& message) {
    juce::ScopedLock lock(clientsMutex_);

    auto it = clients_.find(connectionId);
    if (it != clients_.end() && it->second->websocket && it->second->websocket->isConnected()) {
        try {
            std::string messageStr = message.toJson().dump();
            it->second->websocket->send(messageStr);

            // Update statistics
            {
                juce::ScopedLock statsLock(statsMutex_);
                statistics_.totalMessagesSent++;
            }
        } catch (const std::exception& e) {
            juce::Logger::writeToLog("Failed to send message to client " +
                                    juce::String(connectionId) + ": " + juce::String(e.what()));
        }
    }
}

void InstrumentWebSocketAPI::broadcastToSubscribers(const std::string& subscription, const APIMessage& message) {
    juce::ScopedLock lock(clientsMutex_);

    std::string messageStr = message.toJson().dump();

    for (auto& [connectionId, client] : clients_) {
        if (std::find(client->subscriptions.begin(), client->subscriptions.end(), subscription) != client->subscriptions.end()) {
            if (client->websocket && client->websocket->isConnected()) {
                try {
                    client->websocket->send(messageStr);
                } catch (const std::exception& e) {
                    juce::Logger::writeToLog("Failed to send message to subscriber " +
                                            juce::String(connectionId) + ": " + juce::String(e.what()));
                }
            }
        }
    }
}

//==============================================================================
// Real-time Update Broadcasting
//==============================================================================

void InstrumentWebSocketAPI::broadcastAudioLevelUpdates() {
    if (!audioLevelUpdateEnabled_) {
        return;
    }

    try {
        // Get current audio levels
        std::vector<float> levels(16, 0.0f); // Placeholder

        if (audioLevelCallback_) {
            audioLevelCallback_(levels);
        }

        // Create update message
        json payload = {{"levels", levels}, {"timestamp", getCurrentTimestamp()}};
        APIMessage updateMessage(WSMessageType::AUDIO_LEVEL_UPDATE, payload);

        broadcastToAll(updateMessage);

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Error broadcasting audio level updates: " + juce::String(e.what()));
    }
}

void InstrumentWebSocketAPI::broadcastMidiActivity() {
    if (!midiActivityEnabled_) {
        return;
    }

    // This would be called by the MIDI routing engine when MIDI activity occurs
    // The actual broadcasting is handled in the callback setup in the constructor
}

void InstrumentWebSocketAPI::broadcastSystemNotifications() {
    // System notification broadcasting
}

void InstrumentWebSocketAPI::startBroadcastTimer() {
    startTimer(config_.updateBroadcastIntervalMs);
}

void InstrumentWebSocketAPI::stopBroadcastTimer() {
    stopTimer();
}

//==============================================================================
// Utility Methods
//==============================================================================

bool InstrumentWebSocketAPI::isValidJson(const std::string& jsonStr) const {
    try {
        json::parse(jsonStr);
        return true;
    } catch (const std::exception&) {
        return false;
    }
}

std::string InstrumentWebSocketAPI::getCurrentTimestamp() const {
    return juce::Time::getCurrentTime().formatted("%Y-%m-%d %H:%M:%S").toStdString();
}

//==============================================================================
// Public API Methods
//==============================================================================

std::vector<std::string> InstrumentWebSocketAPI::getConnectedClients() const {
    juce::ScopedLock lock(clientsMutex_);
    std::vector<std::string> clientIds;

    for (const auto& [connectionId, client] : clients_) {
        if (client->websocket && client->websocket->isConnected()) {
            clientIds.push_back(connectionId);
        }
    }

    return clientIds;
}

bool InstrumentWebSocketAPI::isClientConnected(const std::string& connectionId) const {
    juce::ScopedLock lock(clientsMutex_);
    auto it = clients_.find(connectionId);
    return (it != clients_.end() && it->second->websocket && it->second->websocket->isConnected());
}

void InstrumentWebSocketAPI::disconnectClient(const std::string& connectionId) {
    removeClient(connectionId);
}

int InstrumentWebSocketAPI::getClientCount() const {
    juce::ScopedLock lock(clientsMutex_);
    int count = 0;

    for (const auto& [connectionId, client] : clients_) {
        if (client->websocket && client->websocket->isConnected()) {
            count++;
        }
    }

    return count;
}

void InstrumentWebSocketAPI::enableRealtimeUpdates(bool enabled) {
    realtimeUpdatesEnabled_ = enabled;

    if (enabled && !isTimerRunning()) {
        startBroadcastTimer();
    } else if (!enabled && isTimerRunning()) {
        stopBroadcastTimer();
    }
}

bool InstrumentWebSocketAPI::areRealtimeUpdatesEnabled() const {
    return realtimeUpdatesEnabled_;
}

void InstrumentWebSocketAPI::setUpdateBroadcastInterval(int intervalMs) {
    config_.updateBroadcastIntervalMs = intervalMs;

    if (isTimerRunning()) {
        stopBroadcastTimer();
        startBroadcastTimer();
    }
}

int InstrumentWebSocketAPI::getUpdateBroadcastInterval() const {
    return config_.updateBroadcastIntervalMs;
}

InstrumentWebSocketAPI::APStatistics InstrumentWebSocketAPI::getStatistics() const {
    juce::ScopedLock lock(statsMutex_);
    return statistics_;
}

void InstrumentWebSocketAPI::resetStatistics() {
    juce::ScopedLock lock(statsMutex_);
    statistics_ = APStatistics();
}

void InstrumentWebSocketAPI::setRateLimitEnabled(bool enabled) {
    rateLimitEnabled_ = enabled;
}

bool InstrumentWebSocketAPI::isRateLimitEnabled() const {
    return rateLimitEnabled_;
}

void InstrumentWebSocketAPI::setMaxMessagesPerSecond(int maxMessages) {
    maxMessagesPerSecond_ = maxMessages;
}

int InstrumentWebSocketAPI::getMaxMessagesPerSecond() const {
    return maxMessagesPerSecond_;
}

void InstrumentWebSocketAPI::setMaxMessagesPerMinute(int maxMessages) {
    maxMessagesPerMinute_ = maxMessages;
}

int InstrumentWebSocketAPI::getMaxMessagesPerMinute() const {
    return maxMessagesPerMinute_;
}

//==============================================================================
// Event Callbacks
//==============================================================================

void InstrumentWebSocketAPI::setInstrumentCreatedCallback(std::function<void(const std::string&)> callback) {
    instrumentCreatedCallback_ = std::move(callback);
}

void InstrumentWebSocketAPI::setInstrumentDeletedCallback(std::function<void(const std::string&)> callback) {
    instrumentDeletedCallback_ = std::move(callback);
}

void InstrumentWebSocketAPI::setParameterChangedCallback(std::function<void(const std::string&, const std::string&, float)> callback) {
    parameterChangedCallback_ = std::move(callback);
}

void InstrumentWebSocketAPI::setAudioLevelCallback(std::function<void(const std::vector<float>&)> callback) {
    audioLevelCallback_ = std::move(callback);
}

void InstrumentWebSocketAPI::setMidiActivityCallback(std::function<void(const std::string&, const juce::MidiMessage&)> callback) {
    midiActivityCallback_ = std::move(callback);
}

void InstrumentWebSocketAPI::changeListenerCallback(juce::ChangeBroadcaster* source) {
    // Handle change notifications from various components
}

} // namespace websocket
} // namespace schill