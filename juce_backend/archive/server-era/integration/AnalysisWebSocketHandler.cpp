#include "websocket/AnalysisWebSocketHandler.h"
#include <algorithm>
#include <chrono>

namespace schill {
namespace websocket {

//==============================================================================
// AnalysisClient Implementation
//==============================================================================

void AnalysisClient::subscribe(const std::string& analysisType) {
    if (subscriptionSet.find(analysisType) == subscriptionSet.end()) {
        subscriptions.push_back(analysisType);
        subscriptionSet.insert(analysisType);
    }
}

void AnalysisClient::unsubscribe(const std::string& analysisType) {
    auto it = std::find(subscriptions.begin(), subscriptions.end(), analysisType);
    if (it != subscriptions.end()) {
        subscriptions.erase(it);
        subscriptionSet.erase(analysisType);
    }
}

bool AnalysisClient::isSubscribed(const std::string& analysisType) const {
    return subscriptionSet.find(analysisType) != subscriptionSet.end();
}

bool AnalysisClient::checkRateLimit(int maxPerSecond, int maxPerMinute) {
    auto now = juce::Time::getCurrentTime();

    // Reset second counter
    if (now.toMilliseconds() - lastSecondReset.toMilliseconds() >= 1000) {
        messagesPerSecond = 0;
        lastSecondReset = now;
    }

    // Check limits
    if (messagesPerSecond >= maxPerSecond) {
        return false;
    }

    messagesPerSecond++;
    totalMessages++;
    lastActivity = now;
    return true;
}

void AnalysisClient::resetRateCounters() {
    messagesPerSecond = 0;
    totalMessages = 0;
    lastSecondReset = juce::Time::getCurrentTime();
    lastMinuteReset = juce::Time::getCurrentTime();
}

//==============================================================================
// AnalysisWebSocketHandler Implementation
//==============================================================================

AnalysisWebSocketHandler::AnalysisWebSocketHandler()
    : juce::Thread("AnalysisWebSocketHandler"), juce::Timer() {
    // Initialize with minimal setup for RED phase
    performanceStats_.lastUpdate = juce::Time::getCurrentTime();
}

AnalysisWebSocketHandler::~AnalysisWebSocketHandler() {
    stopServer();
}

bool AnalysisWebSocketHandler::startServer(const AnalysisWebSocketConfig& config) {
    config_ = config;

    // RED PHASE: Minimal implementation - will be expanded in GREEN phase
    serverRunning_ = true;

    // Start thread for processing
    startThread();

    // Start timer for periodic tasks
    startTimer(config_.heartbeatIntervalMs);

    return true;
}

void AnalysisWebSocketHandler::stopServer() {
    serverRunning_ = false;

    stopTimer();
    stopThread(1000);

    // Clear clients
    {
        juce::ScopedLock lock(clientsMutex_);
        clients_.clear();
        messageCallbacks_.clear();
    }
}

bool AnalysisWebSocketHandler::isRunning() const {
    return serverRunning_;
}

void AnalysisWebSocketHandler::registerAnalyzer(const std::string& analyzerId, BaseAnalyzer* analyzer) {
    juce::ScopedLock lock(analyzersMutex_);
    analyzers_[analyzerId] = analyzer;
}

void AnalysisWebSocketHandler::unregisterAnalyzer(const std::string& analyzerId) {
    juce::ScopedLock lock(analyzersMutex_);
    analyzers_.erase(analyzerId);
}

std::vector<std::string> AnalysisWebSocketHandler::getRegisteredAnalyzers() const {
    juce::ScopedLock lock(analyzersMutex_);
    std::vector<std::string> analyzerIds;
    for (const auto& pair : analyzers_) {
        analyzerIds.push_back(pair.first);
    }
    return analyzerIds;
}

BaseAnalyzer* AnalysisWebSocketHandler::getAnalyzer(const std::string& analyzerId) const {
    juce::ScopedLock lock(analyzersMutex_);
    auto it = analyzers_.find(analyzerId);
    return (it != analyzers_.end()) ? it->second : nullptr;
}

std::vector<std::string> AnalysisWebSocketHandler::getConnectedClients() const {
    juce::ScopedLock lock(clientsMutex_);
    std::vector<std::string> clientIds;
    for (const auto& pair : clients_) {
        clientIds.push_back(pair.first);
    }
    return clientIds;
}

int AnalysisWebSocketHandler::getClientCount() const {
    juce::ScopedLock lock(clientsMutex_);
    return static_cast<int>(clients_.size());
}

bool AnalysisWebSocketHandler::isClientConnected(const std::string& connectionId) const {
    juce::ScopedLock lock(clientsMutex_);
    return clients_.find(connectionId) != clients_.end();
}

std::string AnalysisWebSocketHandler::createMockClient() {
    // RED PHASE: Mock client creation for testing
    auto clientId = generateConnectionId();

    // Create mock WebSocket (nullptr for RED phase)
    std::unique_ptr<juce::WebSocket> mockWebSocket(nullptr);

    auto client = std::make_unique<AnalysisClient>(clientId, std::move(mockWebSocket));

    {
        juce::ScopedLock lock(clientsMutex_);
        clients_[clientId] = std::move(client);

        // Update stats
        juce::ScopedLock statsLock(statsMutex_);
        performanceStats_.currentConnections = clients_.size();
        performanceStats_.peakConnections = std::max(performanceStats_.peakConnections,
                                                     performanceStats_.currentConnections);
    }

    return clientId;
}

void AnalysisWebSocketHandler::removeMockClient(const std::string& connectionId) {
    juce::ScopedLock lock(clientsMutex_);

    auto it = clients_.find(connectionId);
    if (it != clients_.end()) {
        clients_.erase(it);

        // Clean up subscriptions
        juce::ScopedLock subLock(subscriptionsMutex_);
        auto subIt = clientToAnalysisTypes_.find(connectionId);
        if (subIt != clientToAnalysisTypes_.end()) {
            for (const auto& analysisType : subIt->second) {
                auto& subscribers = analysisTypeToClients_[analysisType];
                subscribers.erase(std::remove(subscribers.begin(), subscribers.end(), connectionId),
                                 subscribers.end());
            }
            clientToAnalysisTypes_.erase(subIt);
        }

        // Update stats
        juce::ScopedLock statsLock(statsMutex_);
        performanceStats_.currentConnections = clients_.size();
    }

    // Remove message callback
    auto callbackIt = messageCallbacks_.find(connectionId);
    if (callbackIt != messageCallbacks_.end()) {
        messageCallbacks_.erase(callbackIt);
    }
}

void AnalysisWebSocketHandler::setMessageCallback(const std::string& clientId,
                                                 std::function<void(const std::string&)> callback) {
    messageCallbacks_[clientId] = callback;
}

void AnalysisWebSocketHandler::subscribeToAnalysis(const std::string& clientId, const std::string& analysisType) {
    juce::ScopedLock lock(clientsMutex_);
    auto clientIt = clients_.find(clientId);
    if (clientIt != clients_.end()) {
        clientIt->second->subscribe(analysisType);

        // Update subscription mappings
        juce::ScopedLock subLock(subscriptionsMutex_);
        analysisTypeToClients_[analysisType].push_back(clientId);
        clientToAnalysisTypes_[clientId].push_back(analysisType);
    }
}

void AnalysisWebSocketHandler::unsubscribeFromAnalysis(const std::string& clientId, const std::string& analysisType) {
    juce::ScopedLock lock(clientsMutex_);
    auto clientIt = clients_.find(clientId);
    if (clientIt != clients_.end()) {
        clientIt->second->unsubscribe(analysisType);

        // Update subscription mappings
        juce::ScopedLock subLock(subscriptionsMutex_);

        auto& subscribers = analysisTypeToClients_[analysisType];
        subscribers.erase(std::remove(subscribers.begin(), subscribers.end(), clientId),
                         subscribers.end());

        auto clientTypesIt = clientToAnalysisTypes_.find(clientId);
        if (clientTypesIt != clientToAnalysisTypes_.end()) {
            auto& types = clientTypesIt->second;
            types.erase(std::remove(types.begin(), types.end(), analysisType), types.end());
        }
    }
}

std::vector<std::string> AnalysisWebSocketHandler::getClientSubscriptions(const std::string& clientId) const {
    juce::ScopedLock lock(clientsMutex_);
    auto clientIt = clients_.find(clientId);
    if (clientIt != clients_.end()) {
        return clientIt->second->subscriptions;
    }
    return {};
}

std::vector<std::string> AnalysisWebSocketHandler::getAnalysisSubscribers(const std::string& analysisType) const {
    juce::ScopedLock lock(subscriptionsMutex_);
    auto it = analysisTypeToClients_.find(analysisType);
    if (it != analysisTypeToClients_.end()) {
        return it->second;
    }
    return {};
}

void AnalysisWebSocketHandler::broadcastAnalysisResults() {
    if (!serverRunning_) return;

    juce::ScopedLock lock(analyzersMutex_);

    for (const auto& pair : analyzers_) {
        broadcastAnalysisResult(pair.first);
    }
}

void AnalysisWebSocketHandler::broadcastAnalysisResult(const std::string& analyzerId) {
    if (!serverRunning_) return;

    auto analyzer = getAnalyzer(analyzerId);
    if (!analyzer || !analyzer->isReady()) return;

    try {
        auto message = createAnalysisMessage(analyzerId);
        broadcastToSubscribers(analyzerId, message);

        // Update stats
        juce::ScopedLock statsLock(statsMutex_);
        performanceStats_.totalMessagesBroadcast++;
        performanceStats_.analyzerMessageCounts[analyzerId]++;
    } catch (const std::exception& e) {
        // RED PHASE: Basic error logging
        juce::Logger::writeToLog("Error broadcasting analysis result: " + juce::String(e.what()));
    }
}

void AnalysisWebSocketHandler::broadcastToSubscribers(const std::string& analysisType, const AnalysisMessage& message) {
    broadcastToSubscribersInternal(analysisType, message.toString());
}

void AnalysisWebSocketHandler::broadcastToClient(const std::string& clientId, const AnalysisMessage& message) {
    sendToClient(clientId, message.toString());
}

void AnalysisWebSocketHandler::handleMessage(const std::string& clientId, const std::string& message) {
    if (!validateMessage(message)) {
        return;
    }

    // Update stats
    {
        juce::ScopedLock statsLock(statsMutex_);
        performanceStats_.totalMessagesReceived++;
    }

    // RED PHASE: Basic message parsing
    try {
        auto jsonMsg = json::parse(message);
        std::string type = jsonMsg.value("type", "");

        if (type == "subscribe" && jsonMsg.contains("analysis")) {
            std::string analysisType = jsonMsg["analysis"];
            subscribeToAnalysis(clientId, analysisType);
        } else if (type == "unsubscribe" && jsonMsg.contains("analysis")) {
            std::string analysisType = jsonMsg["analysis"];
            unsubscribeFromAnalysis(clientId, analysisType);
        }
    } catch (const std::exception& e) {
        // Invalid JSON - ignore for RED phase
    }
}

void AnalysisWebSocketHandler::handleWebSocketFrame(const std::string& clientId, const std::string& frame) {
    if (!validateWebSocketFrame(frame)) {
        throw std::invalid_argument("Invalid WebSocket frame");
    }

    handleMessage(clientId, frame);
}

AnalysisWebSocketHandler::PerformanceStats AnalysisWebSocketHandler::getPerformanceStats() const {
    juce::ScopedLock lock(statsMutex_);
    return performanceStats_;
}

void AnalysisWebSocketHandler::resetPerformanceStats() {
    juce::ScopedLock lock(statsMutex_);
    performanceStats_.totalMessagesBroadcast = 0;
    performanceStats_.totalMessagesReceived = 0;
    performanceStats_.currentConnections = clients_.size();
    performanceStats_.peakConnections = 0;
    performanceStats_.averageLatencyMs = 0.0;
    performanceStats_.messagesPerSecond = 0.0;
    performanceStats_.analyzerMessageCounts.clear();
    performanceStats_.lastUpdate = juce::Time::getCurrentTime();
}

size_t AnalysisWebSocketHandler::getMemoryUsage() const {
    // RED PHASE: Basic memory estimation
    juce::ScopedLock lock(statsMutex_);
    size_t usage = sizeof(*this);

    // Add client memory usage
    juce::ScopedLock clientLock(clientsMutex_);
    usage += clients_.size() * sizeof(AnalysisClient);

    // Add analyzer memory usage
    juce::ScopedLock analyzerLock(analyzersMutex_);
    usage += analyzers_.size() * sizeof(void*);  // Pointer size

    performanceStats_.currentMemoryUsage = usage;
    return usage;
}

void AnalysisWebSocketHandler::setRateLimitEnabled(bool enabled) {
    rateLimitEnabled_ = enabled;
}

bool AnalysisWebSocketHandler::isRateLimitEnabled() const {
    return rateLimitEnabled_;
}

void AnalysisWebSocketHandler::setMaxMessagesPerSecond(int maxMessages) {
    maxMessagesPerSecond_ = maxMessages;
}

void AnalysisWebSocketHandler::setMaxMessagesPerClient(int maxMessages) {
    maxMessagesPerClient_ = maxMessages;
}

void AnalysisWebSocketHandler::changeListenerCallback(juce::ChangeBroadcaster* source) {
    // RED PHASE: Empty implementation
    juce::ignoreUnused(source);
}

void AnalysisWebSocketHandler::run() {
    // RED PHASE: Basic thread loop
    while (!threadShouldExit() && serverRunning_) {
        processAnalyzerResults();
        processMessageQueues();
        cleanupInactiveClients();

        wait(10);  // 10ms interval
    }
}

void AnalysisWebSocketHandler::timerCallback() {
    if (!serverRunning_) return;

    // RED PHASE: Basic timer tasks
    cleanupInactiveClients();
    updatePerformanceStats("timer_callback");
}

bool AnalysisWebSocketHandler::setupWebSocketServer() {
    // RED PHASE: Placeholder implementation
    return true;
}

void AnalysisWebSocketHandler::handleNewConnection(std::unique_ptr<juce::WebSocket> websocket) {
    // RED PHASE: Placeholder implementation
    juce::ignoreUnused(websocket);
}

void AnalysisWebSocketHandler::handleDisconnection(const std::string& connectionId) {
    removeMockClient(connectionId);
}

std::string AnalysisWebSocketHandler::generateConnectionId() const {
    auto id = connectionIdCounter_.fetch_add(1);
    return "client_" + std::to_string(id);
}

void AnalysisWebSocketHandler::addClient(const std::string& connectionId, std::unique_ptr<juce::WebSocket> websocket) {
    auto client = std::make_unique<AnalysisClient>(connectionId, std::move(websocket));

    juce::ScopedLock lock(clientsMutex_);
    clients_[connectionId] = std::move(client);

    // Update stats
    juce::ScopedLock statsLock(statsMutex_);
    performanceStats_.currentConnections = clients_.size();
    performanceStats_.peakConnections = std::max(performanceStats_.peakConnections,
                                                 performanceStats_.currentConnections);
}

void AnalysisWebSocketHandler::removeClient(const std::string& connectionId) {
    removeMockClient(connectionId);
}

AnalysisClient* AnalysisWebSocketHandler::getClient(const std::string& connectionId) {
    juce::ScopedLock lock(clientsMutex_);
    auto it = clients_.find(connectionId);
    return (it != clients_.end()) ? it->second.get() : nullptr;
}

void AnalysisWebSocketHandler::cleanupInactiveClients() {
    // RED PHASE: Basic cleanup implementation
    juce::ScopedLock lock(clientsMutex_);

    auto now = juce::Time::getCurrentTime();
    auto it = clients_.begin();

    while (it != clients_.end()) {
        // Remove clients inactive for more than 5 minutes
        if (now.toMilliseconds() - it->second->lastActivity.toMilliseconds() > 300000) {
            it = clients_.erase(it);
        } else {
            ++it;
        }
    }

    // Update stats
    juce::ScopedLock statsLock(statsMutex_);
    performanceStats_.currentConnections = clients_.size();
}

void AnalysisWebSocketHandler::broadcastToSubscribersInternal(const std::string& analysisType, const std::string& message) {
    auto subscribers = getAnalysisSubscribers(analysisType);

    for (const auto& clientId : subscribers) {
        if (isClientConnected(clientId)) {
            queueMessageForClient(clientId, message);
        }
    }
}

void AnalysisWebSocketHandler::sendToClient(const std::string& clientId, const std::string& message) {
    auto client = getClient(clientId);
    if (!client) return;

    if (rateLimitEnabled_ && !client->checkRateLimit(maxMessagesPerClient_, maxMessagesPerSecond_)) {
        return;  // Rate limited
    }

    // RED PHASE: For mock clients, use callback
    auto callbackIt = messageCallbacks_.find(clientId);
    if (callbackIt != messageCallbacks_.end()) {
        callbackIt->second(message);
    }
}

void AnalysisWebSocketHandler::queueMessageForClient(const std::string& clientId, const std::string& message) {
    auto client = getClient(clientId);
    if (!client) return;

    juce::ScopedLock lock(client->queueMutex);
    client->messageQueue.push(message);

    // Limit queue size
    while (client->messageQueue.size() > 1000) {
        client->messageQueue.pop();
    }
}

void AnalysisWebSocketHandler::processMessageQueues() {
    // RED PHASE: Basic queue processing
    juce::ScopedLock lock(clientsMutex_);

    for (auto& pair : clients_) {
        auto& client = pair.second;
        juce::ScopedLock queueLock(client->queueMutex);

        while (!client->messageQueue.empty()) {
            auto message = client->messageQueue.front();
            client->messageQueue.pop();

            sendToClient(pair.first, message);
        }
    }
}

AnalysisMessage AnalysisWebSocketHandler::createAnalysisMessage(const std::string& analyzerId) const {
    auto analyzer = getAnalyzer(analyzerId);
    if (!analyzer) {
        throw std::runtime_error("Analyzer not found: " + analyzerId);
    }

    auto results = analyzer->getResultsAsJson();
    auto data = serializeAnalyzerResults(analyzerId, results);

    return AnalysisMessage(analyzerId + "_analysis", data, analyzerId);
}

void AnalysisWebSocketHandler::processAnalyzerResults() {
    if (!realtimeBroadcastEnabled_) return;

    // RED PHASE: Basic processing
    broadcastAnalysisResults();
}

json AnalysisWebSocketHandler::serializeAnalyzerResults(const std::string& analyzerId, const juce::String& results) const {
    try {
        return json::parse(results.toStdString());
    } catch (const std::exception&) {
        // Fallback for invalid JSON
        json fallback;
        fallback["type"] = analyzerId + "_analysis";
        fallback["data"] = results.toStdString();
        fallback["timestamp"] = getCurrentTimestamp();
        return fallback;
    }
}

bool AnalysisWebSocketHandler::validateMessage(const std::string& message) const {
    // RED PHASE: Basic validation
    if (message.empty() || message.size() > config_.maxMessageSize) {
        return false;
    }

    try {
        json::parse(message);
        return true;
    } catch (const std::exception&) {
        return false;
    }
}

bool AnalysisWebSocketHandler::validateWebSocketFrame(const std::string& frame) const {
    // RED PHASE: Basic frame validation
    return validateMessage(frame) && frame.size() <= config_.maxMessageSize;
}

std::string AnalysisWebSocketHandler::getCurrentTimestamp() const {
    return juce::Time::getCurrentTime().formatted("%Y-%m-%dT%H:%M:%S.%3fZ").toStdString();
}

void AnalysisWebSocketHandler::updatePerformanceStats(const std::string& operation, double latencyMs) {
    juce::ScopedLock lock(statsMutex_);
    performanceStats_.lastUpdate = juce::Time::getCurrentTime();

    // RED PHASE: Basic stat updates
    if (operation == "broadcast") {
        performanceStats_.totalMessagesBroadcast++;
    } else if (operation == "message_received") {
        performanceStats_.totalMessagesReceived++;
    }
}

} // namespace websocket
} // namespace schill