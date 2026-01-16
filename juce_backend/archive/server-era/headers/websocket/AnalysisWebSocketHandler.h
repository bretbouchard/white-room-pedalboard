#pragma once

#include <JuceHeader.h>
#include <nlohmann/json.hpp>
#include <unordered_map>
#include <functional>
#include <memory>
#include <atomic>
#include <vector>
#include <string>
#include "audio/BaseAnalyzer.h"
#include "websocket/InstrumentWebSocketAPI.h"

namespace schill {
namespace websocket {

using json = nlohmann::json;

//==============================================================================
// Analysis WebSocket Handler Configuration
//==============================================================================

struct AnalysisWebSocketConfig {
    int port = 18080;
    std::string bindAddress = "0.0.0.0";
    bool enableRealTimeUpdates = true;
    int updateBroadcastIntervalMs = 50;
    int maxMessageSize = 64 * 1024; // 64KB
    int maxConnections = 50;
    int heartbeatIntervalMs = 30000;

    // Analysis-specific settings
    bool enableCoreAnalysis = true;
    bool enablePitchDetection = true;
    bool enableDynamicsAnalysis = true;
    bool enableSpatialAnalysis = true;
    bool enableQualityDetection = true;

    // Performance settings
    int maxMessagesPerSecond = 1000;
    int maxMessagesPerClient = 100;
    size_t messageQueueSize = 10000;
};

//==============================================================================
// Analysis Client Connection
//==============================================================================

struct AnalysisClient {
    std::string connectionId;
    std::unique_ptr<juce::WebSocket> websocket;
    std::string clientAddress;
    juce::Time connectionTime;
    juce::Time lastActivity;

    // Subscription management
    std::vector<std::string> subscriptions;
    std::unordered_set<std::string> subscriptionSet;

    // Rate limiting
    int messagesPerSecond = 0;
    int totalMessages = 0;
    juce::Time lastSecondReset;
    juce::Time lastMinuteReset;

    // Message queue
    std::queue<std::string> messageQueue;
    juce::CriticalSection queueMutex;

    AnalysisClient(const std::string& id, std::unique_ptr<juce::WebSocket> ws)
        : connectionId(id), websocket(std::move(ws)),
          connectionTime(juce::Time::getCurrentTime()),
          lastActivity(juce::Time::getCurrentTime()),
          lastSecondReset(juce::Time::getCurrentTime()),
          lastMinuteReset(juce::Time::getCurrentTime()) {}

    void subscribe(const std::string& analysisType);
    void unsubscribe(const std::string& analysisType);
    bool isSubscribed(const std::string& analysisType) const;
    bool checkRateLimit(int maxPerSecond, int maxPerMinute);
    void resetRateCounters();
};

//==============================================================================
// Analysis Message Structure
//==============================================================================

struct AnalysisMessage {
    std::string type;
    json data;
    std::string timestamp;
    std::string analyzerId;
    uint64_t messageId;

    AnalysisMessage(const std::string& msgType, const json& msgData, const std::string& analyzer)
        : type(msgType), data(msgData), analyzerId(analyzer),
          timestamp(juce::Time::getCurrentTime().formatted("%Y-%m-%dT%H:%M:%S.%3fZ").toStdString()),
          messageId(generateMessageId()) {}

    json toJson() const {
        json msg;
        msg["type"] = type;
        msg["data"] = data;
        msg["timestamp"] = timestamp;
        msg["analyzerId"] = analyzerId;
        msg["messageId"] = messageId;
        return msg;
    }

    std::string toString() const {
        return toJson().dump();
    }

private:
    static uint64_t generateMessageId() {
        static std::atomic<uint64_t> counter{0};
        return ++counter;
    }
};

//==============================================================================
// Analysis WebSocket Handler
//==============================================================================

/**
 * WebSocket handler for real-time audio analysis results broadcasting
 *
 * This class manages WebSocket connections and broadcasts analysis results
 * from various audio analyzers (Core DSP, Pitch Detection, Dynamics, etc.)
 * to connected clients in real-time with low latency.
 *
 * Features:
 * - Real-time broadcasting of all analyzer results
 * - Client subscription management for specific analysis types
 * - Rate limiting and performance optimization
 * - JSON serialization of all analysis data
 * - Multi-client connection handling
 * - WebSocket protocol compliance
 * - Performance monitoring and statistics
 */
class AnalysisWebSocketHandler : public juce::Thread,
                                 public juce::Timer,
                                 public juce::ChangeListener
{
public:
    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    AnalysisWebSocketHandler();
    ~AnalysisWebSocketHandler() override;

    //==============================================================================
    // Server Management
    //==============================================================================

    bool startServer(const AnalysisWebSocketConfig& config = {});
    void stopServer();
    bool isRunning() const;
    AnalysisWebSocketConfig getConfig() const { return config_; }

    //==============================================================================
    // Analyzer Registration
    //==============================================================================

    void registerAnalyzer(const std::string& analyzerId, BaseAnalyzer* analyzer);
    void unregisterAnalyzer(const std::string& analyzerId);
    std::vector<std::string> getRegisteredAnalyzers() const;
    BaseAnalyzer* getAnalyzer(const std::string& analyzerId) const;

    //==============================================================================
    // Client Management
    //==============================================================================

    std::vector<std::string> getConnectedClients() const;
    int getClientCount() const;
    bool isClientConnected(const std::string& connectionId) const;

    // Mock client creation for testing
    std::string createMockClient();
    void removeMockClient(const std::string& connectionId);

    // Message callbacks for testing
    void setMessageCallback(const std::string& clientId,
                           std::function<void(const std::string&)> callback);

    //==============================================================================
    // Subscription Management
    //==============================================================================

    void subscribeToAnalysis(const std::string& clientId, const std::string& analysisType);
    void unsubscribeFromAnalysis(const std::string& clientId, const std::string& analysisType);
    std::vector<std::string> getClientSubscriptions(const std::string& clientId) const;
    std::vector<std::string> getAnalysisSubscribers(const std::string& analysisType) const;

    //==============================================================================
    // Broadcasting
    //==============================================================================

    void broadcastAnalysisResults();
    void broadcastAnalysisResult(const std::string& analyzerId);
    void broadcastToSubscribers(const std::string& analysisType, const AnalysisMessage& message);
    void broadcastToClient(const std::string& clientId, const AnalysisMessage& message);

    //==============================================================================
    // Message Processing
    //==============================================================================

    void handleMessage(const std::string& clientId, const std::string& message);
    void handleWebSocketFrame(const std::string& clientId, const std::string& frame);

    //==============================================================================
    // Performance Monitoring
    //==============================================================================

    struct PerformanceStats {
        uint64_t totalMessagesBroadcast = 0;
        uint64_t totalMessagesReceived = 0;
        uint64_t currentConnections = 0;
        uint64_t peakConnections = 0;
        double averageLatencyMs = 0.0;
        double messagesPerSecond = 0.0;
        std::unordered_map<std::string, uint64_t> analyzerMessageCounts;
        juce::Time lastUpdate;

        // Memory usage
        size_t currentMemoryUsage = 0;
        size_t peakMemoryUsage = 0;
        size_t messageQueueSize = 0;
    };

    PerformanceStats getPerformanceStats() const;
    void resetPerformanceStats();
    size_t getMemoryUsage() const;

    //==============================================================================
    // Rate Limiting
    //==============================================================================

    void setRateLimitEnabled(bool enabled);
    bool isRateLimitEnabled() const;
    void setMaxMessagesPerSecond(int maxMessages);
    void setMaxMessagesPerClient(int maxMessages);

    //==============================================================================
    // ChangeListener callback
    //==============================================================================

    void changeListenerCallback(juce::ChangeBroadcaster* source) override;

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
    // Server Setup
    //==============================================================================

    bool setupWebSocketServer();
    void handleNewConnection(std::unique_ptr<juce::WebSocket> websocket);
    void handleDisconnection(const std::string& connectionId);

    //==============================================================================
    // Client Management
    //==============================================================================

    std::string generateConnectionId() const;
    void addClient(const std::string& connectionId, std::unique_ptr<juce::WebSocket> websocket);
    void removeClient(const std::string& connectionId);
    AnalysisClient* getClient(const std::string& connectionId);
    void cleanupInactiveClients();

    //==============================================================================
    // Message Broadcasting
    //==============================================================================

    void broadcastToSubscribersInternal(const std::string& analysisType, const std::string& message);
    void sendToClient(const std::string& clientId, const std::string& message);
    void queueMessageForClient(const std::string& clientId, const std::string& message);
    void processMessageQueues();

    //==============================================================================
    // Analysis Processing
    //==============================================================================

    AnalysisMessage createAnalysisMessage(const std::string& analyzerId) const;
    void processAnalyzerResults();
    json serializeAnalyzerResults(const std::string& analyzerId, const juce::String& results) const;

    //==============================================================================
    // Utility Methods
    //==============================================================================

    bool validateMessage(const std::string& message) const;
    bool validateWebSocketFrame(const std::string& frame) const;
    std::string getCurrentTimestamp() const;
    void updatePerformanceStats(const std::string& operation, double latencyMs = 0.0);

    //==============================================================================
    // Member Variables
    //==============================================================================

    // Configuration
    AnalysisWebSocketConfig config_;
    bool serverRunning_ = false;

    // Server infrastructure
    std::unique_ptr<juce::WebSocketServer> webSocketServer_;

    // Analyzer registry
    std::unordered_map<std::string, BaseAnalyzer*> analyzers_;
    mutable juce::CriticalSection analyzersMutex_;

    // Client management
    std::unordered_map<std::string, std::unique_ptr<AnalysisClient>> clients_;
    mutable juce::CriticalSection clientsMutex_;
    std::unordered_map<std::string, std::function<void(const std::string&)>> messageCallbacks_;

    // Subscription management
    std::unordered_map<std::string, std::vector<std::string>> analysisTypeToClients_;
    std::unordered_map<std::string, std::vector<std::string>> clientToAnalysisTypes_;
    mutable juce::CriticalSection subscriptionsMutex_;

    // Performance monitoring
    PerformanceStats performanceStats_;
    mutable juce::CriticalSection statsMutex_;

    // Rate limiting
    bool rateLimitEnabled_ = true;
    int maxMessagesPerSecond_ = 1000;
    int maxMessagesPerClient_ = 100;

    // Broadcast control
    bool realtimeBroadcastEnabled_ = true;
    std::atomic<uint64_t> messageCounter_{0};

    // Connection ID generation
    std::atomic<uint64_t> connectionIdCounter_{0};

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AnalysisWebSocketHandler)
};

} // namespace websocket
} // namespace schill