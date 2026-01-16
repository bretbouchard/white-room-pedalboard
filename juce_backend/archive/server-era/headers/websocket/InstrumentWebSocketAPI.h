#pragma once

#include <JuceHeader.h>
#include "instrument/InstrumentManager.h"
#include "routing/AudioRoutingEngine.h"
#include "routing/MidiRoutingEngine.h"
#include <nlohmann/json.hpp>
#include <unordered_map>
#include <functional>
#include <memory>

namespace schill {
namespace websocket {

using json = nlohmann::json;

//==============================================================================
// WebSocket Message Types
//==============================================================================

enum class WSMessageType {
    // Instrument Management
    GET_INSTRUMENT_LIST = 1001,
    CREATE_INSTRUMENT_INSTANCE = 1002,
    DELETE_INSTRUMENT_INSTANCE = 1003,
    GET_INSTRUMENT_INFO = 1004,
    GET_INSTRUMENT_PARAMETERS = 1005,
    SET_INSTRUMENT_PARAMETER = 1006,

    // Plugin Management
    SCAN_PLUGINS = 1010,
    GET_PLUGIN_LIST = 1011,
    LOAD_PLUGIN = 1012,
    UNLOAD_PLUGIN = 1013,
    GET_PLUGIN_INFO = 1014,

    // Audio Routing
    CREATE_AUDIO_ROUTE = 1020,
    DELETE_AUDIO_ROUTE = 1021,
    UPDATE_AUDIO_ROUTE = 1022,
    GET_AUDIO_ROUTES = 1023,
    GET_AUDIO_LEVELS = 1024,

    // MIDI Routing
    CREATE_MIDI_ROUTE = 1030,
    DELETE_MIDI_ROUTE = 1031,
    UPDATE_MIDI_ROUTE = 1032,
    GET_MIDI_ROUTES = 1033,
    GET_MIDI_DEVICES = 1034,

    // MIDI Learn
    START_MIDI_LEARN = 1040,
    STOP_MIDI_LEARN = 1041,
    GET_MIDI_LEARN_MAPPINGS = 1042,
    SET_MIDI_LEARN_MAPPING = 1043,
    DELETE_MIDI_LEARN_MAPPING = 1044,

    // Preset Management
    GET_PRESET_LIST = 1050,
    LOAD_PRESET = 1051,
    SAVE_PRESET = 1052,
    DELETE_PRESET = 1053,

    // Performance Monitoring
    GET_PERFORMANCE_STATS = 1060,
    GET_SYSTEM_STATUS = 1061,

    // AI Agent Integration
    AI_AGENT_COMMAND = 1070,
    AI_AGENT_RESPONSE = 1071,

    // Real-time Updates
    PARAMETER_UPDATE = 1080,
    AUDIO_LEVEL_UPDATE = 1081,
    MIDI_ACTIVITY = 1082,
    SYSTEM_NOTIFICATION = 1083,

    // Responses
    SUCCESS_RESPONSE = 2000,
    ERROR_RESPONSE = 2001,
    AUTH_REQUIRED = 2002
};

//==============================================================================
// WebSocket API Configuration
//==============================================================================

struct WebSocketAPIConfig {
    int port = 8080;
    std::string bindAddress = "0.0.0.0";
    bool enableRealTimeUpdates = true;
    bool enableMidiActivityBroadcast = true;
    bool enableAudioLevelBroadcast = true;
    int maxMessageSize = 64 * 1024; // 64KB
    int maxConnections = 10;
    int heartbeatIntervalMs = 30000; // 30 seconds
    int updateBroadcastIntervalMs = 50; // 50ms for real-time updates

    // Authentication
    bool requireAuthentication = false;
    std::string authToken = "";
    std::vector<std::string> allowedOrigins = {"*"};
};

//==============================================================================
// WebSocket Client Connection
//==============================================================================

struct ClientConnection {
    std::string connectionId;
    std::unique_ptr<juce::WebSocket> websocket;
    std::string clientAddress;
    juce::Time connectionTime;
    juce::Time lastActivity;
    bool isAuthenticated = false;
    std::vector<std::string> subscriptions;

    // Rate limiting
    int messagesPerSecond = 0;
    juce::Time lastSecondReset;
    int messagesPerMinute = 0;
    juce::Time lastMinuteReset;

    ClientConnection(const std::string& id, std::unique_ptr<juce::WebSocket> ws)
        : connectionId(id), websocket(std::move(ws)), connectionTime(juce::Time::getCurrentTime()),
          lastActivity(juce::Time::getCurrentTime()) {}
};

//==============================================================================
// API Message Structure
//==============================================================================

struct APIMessage {
    WSMessageType type;
    json payload;
    std::string requestId;
    std::string timestamp;

    APIMessage(WSMessageType msgType, const json& msgPayload, const std::string& reqId = "")
        : type(msgType), payload(msgPayload), requestId(reqId),
          timestamp(juce::Time::getCurrentTime().formatted("%Y-%m-%d %H:%M:%S").toStdString()) {}

    json toJson() const {
        json msg;
        msg["type"] = static_cast<int>(type);
        msg["payload"] = payload;
        msg["requestId"] = requestId;
        msg["timestamp"] = timestamp;
        return msg;
    }

    static APIMessage fromJson(const json& jsonMsg) {
        WSMessageType type = static_cast<WSMessageType>(jsonMsg["type"].get<int>());
        json payload = jsonMsg.value("payload", json::object());
        std::string requestId = jsonMsg.value("requestId", "");
        return APIMessage(type, payload, requestId);
    }
};

//==============================================================================
// Instrument WebSocket API
//==============================================================================

class InstrumentWebSocketAPI : public juce::Thread,
                                public juce::ChangeListener,
                                public juce::Timer
{
public:
    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    InstrumentWebSocketAPI(InstrumentManager* instrumentManager,
                          AudioRoutingEngine* audioRoutingEngine,
                          MidiRoutingEngine* midiRoutingEngine);
    ~InstrumentWebSocketAPI() override;

    //==============================================================================
    // Server Management
    //==============================================================================

    bool startServer(const WebSocketAPIConfig& config = {});
    void stopServer();
    bool isRunning() const;
    WebSocketAPIConfig getConfig() const { return config_; }

    //==============================================================================
    // Client Management
    //==============================================================================

    std::vector<std::string> getConnectedClients() const;
    bool isClientConnected(const std::string& connectionId) const;
    void disconnectClient(const std::string& connectionId);
    int getClientCount() const;

    //==============================================================================
    // Message Broadcasting
    //==============================================================================

    void broadcastToAll(const APIMessage& message);
    void broadcastToClient(const std::string& connectionId, const APIMessage& message);
    void broadcastToSubscribers(const std::string& subscription, const APIMessage& message);

    //==============================================================================
    // Real-time Updates
    //==============================================================================

    void enableRealtimeUpdates(bool enabled);
    bool areRealtimeUpdatesEnabled() const;

    void setUpdateBroadcastInterval(int intervalMs);
    int getUpdateBroadcastInterval() const;

    //==============================================================================
    // Event Callbacks (for integration with other components)
    //==============================================================================

    void setInstrumentCreatedCallback(std::function<void(const std::string&)> callback);
    void setInstrumentDeletedCallback(std::function<void(const std::string&)> callback);
    void setParameterChangedCallback(std::function<void(const std::string&, const std::string&, float)> callback);
    void setAudioLevelCallback(std::function<void(const std::vector<float>&)> callback);
    void setMidiActivityCallback(std::function<void(const std::string&, const juce::MidiMessage&)> callback);

    //==============================================================================
    // ChangeListener callbacks
    //==============================================================================

    void changeListenerCallback(juce::ChangeBroadcaster* source) override;

    //==============================================================================
    // Statistics and Monitoring
    //==============================================================================

    struct APStatistics {
        uint64_t totalMessagesReceived = 0;
        uint64_t totalMessagesSent = 0;
        uint64_t currentConnections = 0;
        uint64_t totalConnections = 0;
        double averageMessageProcessingTimeMs = 0.0;
        std::map<WSMessageType, uint64_t> messageTypeCounts;
        juce::Time lastUpdate;
    };

    APStatistics getStatistics() const;
    void resetStatistics();

    //==============================================================================
    // Security and Rate Limiting
    //==============================================================================

    void setRateLimitEnabled(bool enabled);
    bool isRateLimitEnabled() const;

    void setMaxMessagesPerSecond(int maxMessages);
    int getMaxMessagesPerSecond() const;

    void setMaxMessagesPerMinute(int maxMessages);
    int getMaxMessagesPerMinute() const;

private:
    //==============================================================================
    // Thread Implementation
    //==============================================================================

    void run() override;

    //==============================================================================
    // Timer Implementation
    //==============================================================================

    void timerCallback() override;

    //==============================================================================
    // Core Server Methods
    //==============================================================================

    bool setupWebSocketServer();
    void handleNewConnection(std::unique_ptr<juce::WebSocket> websocket);
    void handleDisconnection(const std::string& connectionId);
    void handleMessage(const std::string& connectionId, const std::string& message);

    //==============================================================================
    // Message Processing
    //==============================================================================

    bool processMessage(const std::string& connectionId, const APIMessage& message);
    bool validateMessage(const APIMessage& message);
    bool checkRateLimit(const std::string& connectionId);

    //==============================================================================
    // Command Handlers
    //==============================================================================

    // Instrument Management
    bool handleGetInstrumentList(const std::string& connectionId, const APIMessage& message);
    bool handleCreateInstrumentInstance(const std::string& connectionId, const APIMessage& message);
    bool handleDeleteInstrumentInstance(const std::string& connectionId, const APIMessage& message);
    bool handleGetInstrumentInfo(const std::string& connectionId, const APIMessage& message);
    bool handleGetInstrumentParameters(const std::string& connectionId, const APIMessage& message);
    bool handleSetInstrumentParameter(const std::string& connectionId, const APIMessage& message);

    // Plugin Management
    bool handleScanPlugins(const std::string& connectionId, const APIMessage& message);
    bool handleGetPluginList(const std::string& connectionId, const APIMessage& message);
    bool handleLoadPlugin(const std::string& connectionId, const APIMessage& message);
    bool handleUnloadPlugin(const std::string& connectionId, const APIMessage& message);
    bool handleGetPluginInfo(const std::string& connectionId, const APIMessage& message);

    // Audio Routing
    bool handleCreateAudioRoute(const std::string& connectionId, const APIMessage& message);
    bool handleDeleteAudioRoute(const std::string& connectionId, const APIMessage& message);
    bool handleUpdateAudioRoute(const std::string& connectionId, const APIMessage& message);
    bool handleGetAudioRoutes(const std::string& connectionId, const APIMessage& message);
    bool handleGetAudioLevels(const std::string& connectionId, const APIMessage& message);

    // MIDI Routing
    bool handleCreateMidiRoute(const std::string& connectionId, const APIMessage& message);
    bool handleDeleteMidiRoute(const std::string& connectionId, const APIMessage& message);
    bool handleUpdateMidiRoute(const std::string& connectionId, const APIMessage& message);
    bool handleGetMidiRoutes(const std::string& connectionId, const APIMessage& message);
    bool handleGetMidiDevices(const std::string& connectionId, const APIMessage& message);

    // MIDI Learn
    bool handleStartMidiLearn(const std::string& connectionId, const APIMessage& message);
    bool handleStopMidiLearn(const std::string& connectionId, const APIMessage& message);
    bool handleGetMidiLearnMappings(const std::string& connectionId, const APIMessage& message);
    bool handleSetMidiLearnMapping(const std::string& connectionId, const APIMessage& message);
    bool handleDeleteMidiLearnMapping(const std::string& connectionId, const APIMessage& message);

    // Preset Management
    bool handleGetPresetList(const std::string& connectionId, const APIMessage& message);
    bool handleLoadPreset(const std::string& connectionId, const APIMessage& message);
    bool handleSavePreset(const std::string& connectionId, const APIMessage& message);
    bool handleDeletePreset(const std::string& connectionId, const APIMessage& message);

    // Performance Monitoring
    bool handleGetPerformanceStats(const std::string& connectionId, const APIMessage& message);
    bool handleGetSystemStatus(const std::string& connectionId, const APIMessage& message);

    // AI Agent Integration
    bool handleAIAgentCommand(const std::string& connectionId, const APIMessage& message);

    //==============================================================================
    // Response Generation
    //==============================================================================

    APIMessage createSuccessResponse(const std::string& requestId, const json& data = {}) const;
    APIMessage createErrorResponse(const std::string& requestId, const std::string& error, int code = 400) const;
    APIMessage createAuthRequiredResponse(const std::string& requestId) const;

    // Specific response builders
    json buildInstrumentListResponse() const;
    json buildInstrumentInfoResponse(const std::string& instrumentName) const;
    json buildPluginListResponse() const;
    json buildAudioRoutesResponse() const;
    json buildMidiRoutesResponse() const;
    json buildMidiDevicesResponse() const;
    json buildPerformanceStatsResponse() const;

    //==============================================================================
    // Real-time Update Broadcasting
    //==============================================================================

    void broadcastParameterUpdates();
    void broadcastAudioLevelUpdates();
    void broadcastMidiActivity();
    void broadcastSystemNotifications();

    void startBroadcastTimer();
    void stopBroadcastTimer();

    //==============================================================================
    // Client Management
    //==============================================================================

    std::string generateConnectionId() const;
    void addClient(const std::string& connectionId, std::unique_ptr<juce::WebSocket> websocket);
    void removeClient(const std::string& connectionId);
    ClientConnection* getClient(const std::string& connectionId);
    void cleanupInactiveClients();

    //==============================================================================
    // Utility Methods
    //==============================================================================

    WSMessageType getMessageTypeFromString(const std::string& type) const;
    std::string getMessageTypeString(WSMessageType type) const;
    bool isValidJson(const std::string& jsonStr) const;
    std::string getCurrentTimestamp() const;

    //==============================================================================
    // Member Variables
    //==============================================================================

    // Core components
    InstrumentManager* instrumentManager_;
    AudioRoutingEngine* audioRoutingEngine_;
    MidiRoutingEngine* midiRoutingEngine_;

    // Server infrastructure
    std::unique_ptr<juce::WebSocketServer> webSocketServer_;
    WebSocketAPIConfig config_;
    bool serverRunning_ = false;

    // Client management
    std::unordered_map<std::string, std::unique_ptr<ClientConnection>> clients_;
    mutable juce::CriticalSection clientsMutex_;

    // Real-time updates
    bool realtimeUpdatesEnabled_ = true;
    bool parameterUpdateEnabled_ = true;
    bool audioLevelUpdateEnabled_ = true;
    bool midiActivityEnabled_ = true;

    // Event callbacks
    std::function<void(const std::string&)> instrumentCreatedCallback_;
    std::function<void(const std::string&)> instrumentDeletedCallback_;
    std::function<void(const std::string&, const std::string&, float)> parameterChangedCallback_;
    std::function<void(const std::vector<float>&)> audioLevelCallback_;
    std::function<void(const std::string&, const juce::MidiMessage&)> midiActivityCallback_;

    // Statistics
    APStatistics statistics_;
    mutable juce::CriticalSection statsMutex_;

    // Rate limiting
    bool rateLimitEnabled_ = true;
    int maxMessagesPerSecond_ = 10;
    int maxMessagesPerMinute_ = 300;

    // Command handler map
    std::unordered_map<WSMessageType, std::function<bool(const std::string&, const APIMessage&)>> commandHandlers_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(InstrumentWebSocketAPI)
};

} // namespace websocket
} // namespace schill