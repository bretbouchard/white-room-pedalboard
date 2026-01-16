#include "SecureWebSocketBridge.h"
#include <random>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <cctype>

using namespace std::chrono;

// ============================================================================
// RATE LIMIT TRACKER IMPLEMENTATION
// ============================================================================

bool RateLimitTracker::canSendMessage() const {
    auto now = steady_clock::now();

    // Check burst limit (5 messages per second)
    auto burstElapsed = duration_cast<seconds>(now - burstStart).count();
    if (burstElapsed >= 1) {
        return true; // Reset burst window
    }

    if (messagesInBurst >= WebSocketSecurityConfig::MAX_MESSAGES_PER_SECOND) {
        return false; // Burst limit exceeded
    }

    // Check minute limit (60 messages per minute)
    auto windowElapsed = duration_cast<seconds>(now - windowStart).count();
    if (windowElapsed >= 60) {
        return true; // Reset minute window
    }

    return messagesInWindow < WebSocketSecurityConfig::MAX_MESSAGES_PER_MINUTE;
}

void RateLimitTracker::recordMessage() {
    auto now = steady_clock::now();

    // Reset burst window if needed
    auto burstElapsed = duration_cast<seconds>(now - burstStart).count();
    if (burstElapsed >= 1) {
        burstStart = now;
        messagesInBurst = 0;
    }
    messagesInBurst++;

    // Reset minute window if needed
    auto windowElapsed = duration_cast<seconds>(now - windowStart).count();
    if (windowElapsed >= 60) {
        windowStart = now;
        messagesInWindow = 0;
    }
    messagesInWindow++;
}

// ============================================================================
// SECURITY EVENT IMPLEMENTATION
// ============================================================================

std::string SecurityEvent::toString() const {
    std::stringstream ss;
    ss << "[" << std::chrono::duration_cast<std::chrono::milliseconds>(timestamp.time_since_epoch()).count() << "] ";

    switch (type) {
        case SecurityEventType::AUTHENTICATION_FAILED:
            ss << "AUTH_FAILED";
            break;
        case SecurityEventType::RATE_LIMIT_EXCEEDED:
            ss << "RATE_LIMIT_EXCEEDED";
            break;
        case SecurityEventType::MESSAGE_SIZE_EXCEEDED:
            ss << "MESSAGE_SIZE_EXCEEDED";
            break;
        case SecurityEventType::INVALID_COMMAND_TYPE:
            ss << "INVALID_COMMAND";
            break;
        case SecurityEventType::PARAMETER_VALIDATION_FAILED:
            ss << "PARAM_VALIDATION_FAILED";
            break;
        case SecurityEventType::PATH_TRAVERSAL_ATTEMPT:
            ss << "PATH_TRAVERSAL";
            break;
        case SecurityEventType::INJECTION_ATTACK_DETECTED:
            ss << "INJECTION_ATTACK";
            break;
        case SecurityEventType::SUSPICIOUS_PATTERN_DETECTED:
            ss << "SUSPICIOUS_PATTERN";
            break;
    }

    ss << ": " << details;
    return ss.str();
}

// ============================================================================
// SECURE WEBSOCKET BRIDGE IMPLEMENTATION
// ============================================================================

SecureWebSocketBridge::SecureWebSocketBridge(AudioEngine& engine)
    : juce::Thread("SecureWebSocketBridge"), audioEngine(engine)
{
    // Initialize security components
    connectionTime = steady_clock::now();
    connectionId = generateSecureToken().substr(0, 16);

    // Initialize allowed command types (WHITELIST)
    allowedCommandTypes = {
        "transport_command",
        "parameter_update",
        "plugin_load",
        "plugin_unload",
        "get_audio_devices",
        "get_loaded_plugins",
        "get_audio_levels",
        "authenticate"
    };

    // Initialize validation regex patterns
    safeParameterNameRegex = std::regex(R"(^[a-zA-Z][a-zA-Z0-9_]{0,63}$)");
    safePathRegex = std::regex(R"(^[a-zA-Z0-9._/-]+$)");

    // Listen to audio engine changes
    audioEngine.addChangeListener(this);

    // Initialize rate limiter
    rateLimiter.windowStart = steady_clock::now();
    rateLimiter.burstStart = steady_clock::now();

    // Log initialization
    logSecurityEvent(SecurityEventType::SUSPICIOUS_PATTERN_DETECTED,
                    "Secure WebSocket Bridge initialized for connection: " + connectionId);
}

SecureWebSocketBridge::~SecureWebSocketBridge()
{
    stopServer();
    audioEngine.removeChangeListener(this);

    // Log cleanup
    logSecurityEvent(SecurityEventType::SUSPICIOUS_PATTERN_DETECTED,
                    "Secure WebSocket Bridge destroyed for connection: " + connectionId);
}

bool SecureWebSocketBridge::startServer(int port)
{
    server = std::make_unique<juce::WebSocketServer>();

    if (server->startServer(port))
    {
        serverRunning = true;
        startThread();
        juce::Logger::writeToLog("Secure WebSocket server started on port " + juce::String(port));
        return true;
    }

    juce::Logger::writeToLog("Failed to start Secure WebSocket server on port " + juce::String(port));
    return false;
}

void SecureWebSocketBridge::stopServer()
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
        currentConnectionToken.clear();
        serverRunning = false;
        juce::Logger::writeToLog("Secure WebSocket server stopped");
    }
}

bool SecureWebSocketBridge::isRunning() const
{
    return serverRunning;
}

void SecureWebSocketBridge::run()
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
                juce::Logger::writeToLog("Secure WebSocket client connected: " + connectionId);

                // Send authentication challenge
                json authChallenge = createAuthRequiredResponse();
                sendResponse(authChallenge, false);
            }

            // Handle incoming messages with security pipeline
            if (clientConnection && clientConnection->isConnected())
            {
                auto message = clientConnection->receiveMessage(100);
                if (message.isNotEmpty())
                {
                    // SECURITY: Process through security pipeline
                    processIncomingMessage(message.toStdString());
                }
            }

            // Broadcast audio levels periodically (only for authenticated connections)
            if (clientConnection && clientConnection->isConnected() && !currentConnectionToken.empty())
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

void SecureWebSocketBridge::changeListenerCallback(juce::ChangeBroadcaster* source)
{
    if (source == &audioEngine)
    {
        // Send update only to authenticated connections
        if (clientConnection && clientConnection->isConnected() && !currentConnectionToken.empty())
        {
            sendResponse(createStatusResponse(), true);
        }
    }
}

// ============================================================================
// SECURITY PIPELINE - GREEN PHASE IMPLEMENTATION
// ============================================================================

bool SecureWebSocketBridge::processIncomingMessage(const std::string& rawMessage)
{
    try
    {
        // STEP 1: Message size validation
        if (!validateMessageSize(rawMessage)) {
            logSecurityEvent(SecurityEventType::MESSAGE_SIZE_EXCEEDED,
                           "Message size exceeded limit: " + std::to_string(rawMessage.length()));
            sendResponse(createSecurityErrorResponse("Message size exceeded"), false);
            return false;
        }

        // STEP 2: Rate limiting check
        if (!checkRateLimit()) {
            logSecurityEvent(SecurityEventType::RATE_LIMIT_EXCEEDED,
                           "Rate limit exceeded for connection: " + connectionId);
            sendResponse(createSecurityErrorResponse("Rate limit exceeded"), false);
            return false;
        }

        // STEP 3: JSON parsing with validation
        json jsonMessage = json::parse(rawMessage);

        // STEP 4: Authentication check (except for authenticate messages)
        if (jsonMessage.contains("type") && jsonMessage["type"] != "authenticate") {
            if (!authenticateConnection(jsonMessage)) {
                logSecurityEvent(SecurityEventType::AUTHENTICATION_FAILED,
                               "Authentication failed for connection: " + connectionId);
                sendResponse(createAuthRequiredResponse(), false);
                return false;
            }
        }

        // STEP 5: Command validation and sanitization
        if (!validateAndSanitizeMessage(jsonMessage)) {
            logSecurityEvent(SecurityEventType::PARAMETER_VALIDATION_FAILED,
                           "Message validation failed");
            sendResponse(createSecurityErrorResponse("Message validation failed"), true);
            return false;
        }

        // STEP 6: Process message securely
        bool result = handleMessageSecure(jsonMessage);

        if (result) {
            // Update rate limiter on successful processing
            std::lock_guard<std::mutex> lock(rateLimitMutex);
            rateLimiter.recordMessage();
        }

        return result;

    }
    catch (const json::parse_error& e)
    {
        logSecurityEvent(SecurityEventType::PARAMETER_VALIDATION_FAILED,
                       "JSON parse error: " + std::string(e.what()));
        sendResponse(createErrorResponse("Invalid JSON: " + std::string(e.what())), false);
        return false;
    }
    catch (const std::exception& e)
    {
        logSecurityEvent(SecurityEventType::PARAMETER_VALIDATION_FAILED,
                       "Message processing error: " + std::string(e.what()));
        sendResponse(createSecurityErrorResponse("Message processing error"), false);
        return false;
    }
}

bool SecureWebSocketBridge::validateMessageSize(const std::string& message)
{
    return message.length() <= maxMessageSize;
}

bool SecureWebSocketBridge::checkRateLimit()
{
    std::lock_guard<std::mutex> lock(rateLimitMutex);
    return rateLimiter.canSendMessage();
}

bool SecureWebSocketBridge::authenticateConnection(const json& message)
{
    // If already authenticated, check token validity
    if (!currentConnectionToken.empty()) {
        return validateAuthToken(currentConnectionToken);
    }

    // Check if this is an authentication message
    if (message.contains("type") && message["type"] == "authenticate") {
        if (message.contains("token")) {
            std::string token = message["token"];
            if (validateAuthToken(token)) {
                currentConnectionToken = token;
                failedAuthAttempts = 0; // Reset failed attempts
                logSecurityEvent(SecurityEventType::SUSPICIOUS_PATTERN_DETECTED,
                               "Authentication successful for connection: " + connectionId);
                return true;
            }
        }
        failedAuthAttempts++;
        lastFailedAttempt = steady_clock::now();
        return false;
    }

    return false; // Not authenticated
}

bool SecureWebSocketBridge::validateAndSanitizeMessage(const json& message)
{
    // Validate command type (WHITELIST ENFORCEMENT)
    if (!message.contains("type")) {
        logSecurityEvent(SecurityEventType::INVALID_COMMAND_TYPE,
                       "Message missing 'type' field");
        return false;
    }

    std::string type = message["type"];
    if (!isValidCommandType(type)) {
        logSecurityEvent(SecurityEventType::INVALID_COMMAND_TYPE,
                       "Invalid command type: " + type);
        return false;
    }

    // Additional validation based on command type
    json sanitizedMessage = message; // Make a copy for sanitization

    if (type == "transport_command") {
        return sanitizeAndValidateParameters(sanitizedMessage);
    } else if (type == "parameter_update") {
        return sanitizeAndValidateParameters(sanitizedMessage);
    } else if (type == "plugin_load") {
        if (!message.contains("plugin_path")) {
            logSecurityEvent(SecurityEventType::PARAMETER_VALIDATION_FAILED,
                           "Plugin load missing 'plugin_path' field");
            return false;
        }
        std::string pluginPath = message["plugin_path"];
        if (!validatePluginPath(pluginPath)) {
            logSecurityEvent(SecurityEventType::PATH_TRAVERSAL_ATTEMPT,
                           "Invalid plugin path: " + pluginPath);
            return false;
        }
    }

    return true;
}

bool SecureWebSocketBridge::isValidCommandType(const std::string& type) const
{
    return allowedCommandTypes.find(type) != allowedCommandTypes.end();
}

bool SecureWebSocketBridge::sanitizeAndValidateParameters(json& message)
{
    // Validate and sanitize all string fields
    for (auto& [key, value] : message.items()) {
        if (value.is_string()) {
            std::string strValue = value.get<std::string>();

            // Check for injection patterns
            if (containsInjectionPatterns(strValue)) {
                logSecurityEvent(SecurityEventType::INJECTION_ATTACK_DETECTED,
                               "Injection pattern detected in field: " + key);
                return false;
            }

            // Sanitize the string
            std::string sanitized = sanitizeString(strValue);
            value = sanitized;
        }
    }

    return true;
}

bool SecureWebSocketBridge::validatePluginPath(const std::string& path) const
{
    // Check for path traversal attempts
    if (path.find("..") != std::string::npos) {
        return false;
    }

    // Check for dangerous characters
    if (path.find(";") != std::string::npos ||
        path.find("|") != std::string::npos ||
        path.find("&") != std::string::npos) {
        return false;
    }

    // Validate against safe path regex
    return std::regex_match(path, safePathRegex);
}

bool SecureWebSocketBridge::validateParameterName(const std::string& name) const
{
    return std::regex_match(name, safeParameterNameRegex);
}

bool SecureWebSocketBridge::validateParameterValue(const json& value) const
{
    // Validate numeric ranges
    if (value.is_number()) {
        double numValue = value.get<double>();
        if (std::isnan(numValue) || std::isinf(numValue)) {
            return false;
        }
        if (numValue < -1000000.0 || numValue > 1000000.0) {
            return false; // Reasonable range limits
        }
    }

    return true;
}

std::string SecureWebSocketBridge::sanitizeString(const std::string& input) const
{
    std::string sanitized;
    sanitized.reserve(input.length());

    for (char c : input) {
        // Allow only safe characters
        if (std::isalnum(c) || std::isspace(c) || c == '_' || c == '-' || c == '.' || c == '/') {
            sanitized += c;
        }
    }

    return sanitized;
}

bool SecureWebSocketBridge::containsInjectionPatterns(const std::string& input) const
{
    // Check for common injection patterns
    std::vector<std::string> injectionPatterns = {
        "<script", "</script>", "javascript:", "vbscript:",
        "onload=", "onerror=", "onclick=",
        "SELECT ", "INSERT ", "UPDATE ", "DELETE ", "DROP ",
        "UNION ", "EXEC ", "xp_", "sp_",
        "${", "{{", "%{", "<%=",
        ";", "|", "&", "`", "$", "<", ">"
    };

    std::string upperInput = input;
    std::transform(upperInput.begin(), upperInput.end(), upperInput.begin(), ::toupper);

    for (const auto& pattern : injectionPatterns) {
        if (upperInput.find(pattern) != std::string::npos) {
            return true;
        }
    }

    return false;
}

// ============================================================================
// SECURE MESSAGE HANDLING
// ============================================================================

bool SecureWebSocketBridge::handleMessageSecure(const json& message)
{
    if (!message.contains("type")) {
        sendResponse(createSecurityErrorResponse("Message missing 'type' field"), true);
        return false;
    }

    std::string type = message["type"];

    if (type == "authenticate") {
        // Already handled in authentication step
        sendResponse(createSuccessResponse("Authentication successful"), true);
        return true;
    } else if (type == "transport_command") {
        return handleTransportCommandSecure(message);
    } else if (type == "parameter_update") {
        return handleParameterUpdateSecure(message);
    } else if (type == "plugin_load") {
        return handlePluginLoadSecure(message);
    } else if (type == "plugin_unload") {
        return handlePluginUnloadSecure(message);
    } else if (type == "get_audio_devices") {
        return handleGetAudioDevicesSecure(message);
    } else if (type == "get_loaded_plugins") {
        return handleGetLoadedPluginsSecure(message);
    } else if (type == "get_audio_levels") {
        return handleGetAudioLevelsSecure(message);
    } else {
        logSecurityEvent(SecurityEventType::INVALID_COMMAND_TYPE,
                       "Unknown message type: " + type);
        sendResponse(createSecurityErrorResponse("Unknown message type: " + type), true);
        return false;
    }
}

bool SecureWebSocketBridge::handleTransportCommandSecure(const json& message)
{
    if (!message.contains("action")) {
        sendResponse(createSecurityErrorResponse("Transport command missing 'action' field"), true);
        return false;
    }

    std::string action = sanitizeString(message["action"]);

    // Validate action against whitelist
    std::unordered_set<std::string> allowedActions = {
        "play", "stop", "pause", "seek", "set_tempo"
    };

    if (allowedActions.find(action) == allowedActions.end()) {
        logSecurityEvent(SecurityEventType::INVALID_COMMAND_TYPE,
                       "Invalid transport action: " + action);
        sendResponse(createSecurityErrorResponse("Invalid transport action: " + action), true);
        return false;
    }

    // Execute validated action
    if (action == "play") {
        audioEngine.startPlayback();
        sendResponse(createSuccessResponse("Playback started"), true);
    } else if (action == "stop") {
        audioEngine.stopPlayback();
        sendResponse(createSuccessResponse("Playback stopped"), true);
    } else if (action == "pause") {
        audioEngine.stopPlayback();
        sendResponse(createSuccessResponse("Playback paused"), true);
    } else if (action == "seek") {
        if (message.contains("position")) {
            double position = message["position"];
            if (std::isnan(position) || position < 0.0 || position > 3600.0) { // Max 1 hour
                sendResponse(createSecurityErrorResponse("Invalid position value"), true);
                return false;
            }
            audioEngine.setPlaybackPosition(position);
            sendResponse(createSuccessResponse("Position set to " + std::to_string(position)), true);
        } else {
            sendResponse(createSecurityErrorResponse("Seek command missing 'position' field"), true);
            return false;
        }
    } else if (action == "set_tempo") {
        if (message.contains("tempo")) {
            double tempo = message["tempo"];
            if (std::isnan(tempo) || tempo < 20.0 || tempo > 400.0) { // Reasonable tempo range
                sendResponse(createSecurityErrorResponse("Invalid tempo value"), true);
                return false;
            }
            audioEngine.setTempo(tempo);
            sendResponse(createSuccessResponse("Tempo set to " + std::to_string(tempo)), true);
        } else {
            sendResponse(createSecurityErrorResponse("Tempo command missing 'tempo' field"), true);
            return false;
        }
    }

    return true;
}

bool SecureWebSocketBridge::handleParameterUpdateSecure(const json& message)
{
    if (!message.contains("plugin_id") || !message.contains("parameter_name") || !message.contains("value")) {
        sendResponse(createSecurityErrorResponse("Parameter update missing required fields"), true);
        return false;
    }

    // Validate plugin ID
    int pluginId = message["plugin_id"];
    if (pluginId < 0 || pluginId > 10000) { // Reasonable plugin ID range
        sendResponse(createSecurityErrorResponse("Invalid plugin ID"), true);
        return false;
    }

    // Validate parameter name
    std::string parameterName = sanitizeString(message["parameter_name"]);
    if (!validateParameterName(parameterName)) {
        logSecurityEvent(SecurityEventType::PARAMETER_VALIDATION_FAILED,
                       "Invalid parameter name: " + parameterName);
        sendResponse(createSecurityErrorResponse("Invalid parameter name"), true);
        return false;
    }

    // Validate parameter value
    json value = message["value"];
    if (!validateParameterValue(value)) {
        sendResponse(createSecurityErrorResponse("Invalid parameter value"), true);
        return false;
    }

    // Execute validated parameter update
    bool success = audioEngine.setPluginParameter(pluginId, parameterName, value.get<float>());
    if (success) {
        sendResponse(createSuccessResponse("Parameter updated"), true);
    } else {
        sendResponse(createErrorResponse("Failed to update parameter"), true);
    }

    return success;
}

bool SecureWebSocketBridge::handlePluginLoadSecure(const json& message)
{
    if (!message.contains("plugin_path")) {
        sendResponse(createSecurityErrorResponse("Plugin load missing 'plugin_path' field"), true);
        return false;
    }

    std::string pluginPath = sanitizeString(message["plugin_path"]);

    // Path validation already done in validateAndSanitizeMessage
    int pluginId = audioEngine.loadPlugin(pluginPath);

    if (pluginId >= 0) {
        json response = createSuccessResponse("Plugin loaded");
        response["plugin_id"] = pluginId;
        sendResponse(response, true);
    } else {
        sendResponse(createErrorResponse("Failed to load plugin: " + pluginPath), true);
    }

    return pluginId >= 0;
}

bool SecureWebSocketBridge::handlePluginUnloadSecure(const json& message)
{
    if (!message.contains("plugin_id")) {
        sendResponse(createSecurityErrorResponse("Plugin unload missing 'plugin_id' field"), true);
        return false;
    }

    int pluginId = message["plugin_id"];
    if (pluginId < 0 || pluginId > 10000) {
        sendResponse(createSecurityErrorResponse("Invalid plugin ID"), true);
        return false;
    }

    audioEngine.unloadPlugin(pluginId);
    sendResponse(createSuccessResponse("Plugin unloaded"), true);
    return true;
}

bool SecureWebSocketBridge::handleGetAudioDevicesSecure(const json& message)
{
    sendResponse(createDeviceListResponse(), true);
    return true;
}

bool SecureWebSocketBridge::handleGetLoadedPluginsSecure(const json& message)
{
    sendResponse(createPluginListResponse(), true);
    return true;
}

bool SecureWebSocketBridge::handleGetAudioLevelsSecure(const json& message)
{
    sendResponse(createAudioLevelsResponse(), true);
    return true;
}

// ============================================================================
// AUTHENTICATION AND TOKEN MANAGEMENT
// ============================================================================

std::string SecureWebSocketBridge::generateAuthToken(const std::string& userId, const std::vector<std::string>& permissions)
{
    std::string token = generateSecureToken();

    AuthToken authToken;
    authToken.token = token;
    authToken.userId = userId;
    authToken.permissions = permissions;
    authToken.expiry = steady_clock::now() + seconds(WebSocketSecurityConfig::AUTH_TOKEN_EXPIRY_SECONDS);

    std::lock_guard<std::mutex> lock(authMutex);
    activeTokens[token] = authToken;

    return token;
}

bool SecureWebSocketBridge::validateAuthToken(const std::string& token)
{
    std::lock_guard<std::mutex> lock(authMutex);

    auto it = activeTokens.find(token);
    if (it == activeTokens.end()) {
        return false;
    }

    if (!it->second.isValid()) {
        activeTokens.erase(it);
        return false;
    }

    return true;
}

void SecureWebSocketBridge::revokeToken(const std::string& token)
{
    std::lock_guard<std::mutex> lock(authMutex);
    activeTokens.erase(token);
}

// ============================================================================
// SECURITY MONITORING
// ============================================================================

void SecureWebSocketBridge::logSecurityEvent(SecurityEventType type, const std::string& details)
{
    SecurityEvent event;
    event.type = type;
    event.timestamp = steady_clock::now();
    event.details = details;

    std::lock_guard<std::mutex> lock(eventsMutex);
    securityEvents.push_back(event);

    // Keep only last 1000 events to prevent memory bloat
    if (securityEvents.size() > 1000) {
        securityEvents.erase(securityEvents.begin());
    }

    // Also log to JUCE logger
    juce::Logger::writeToLog("[SECURITY] " + event.toString());
}

std::vector<SecurityEvent> SecureWebSocketBridge::getSecurityEvents(int maxEvents) const
{
    std::lock_guard<std::mutex> lock(eventsMutex);

    std::vector<SecurityEvent> result;
    int startIndex = std::max(0, (int)securityEvents.size() - maxEvents);

    for (int i = startIndex; i < (int)securityEvents.size(); i++) {
        result.push_back(securityEvents[i]);
    }

    return result;
}

void SecureWebSocketBridge::clearSecurityEvents()
{
    std::lock_guard<std::mutex> lock(eventsMutex);
    securityEvents.clear();
}

bool SecureWebSocketBridge::detectSuspiciousPattern() const
{
    // Check for too many failed authentication attempts
    if (failedAuthAttempts >= WebSocketSecurityConfig::MAX_FAILED_ATTEMPTS) {
        return true;
    }

    // Check for too many security events in short time
    auto events = getSecurityEvents(20);
    if (events.size() >= 10) {
        auto timeDiff = duration_cast<seconds>(events.back().timestamp - events[0].timestamp).count();
        if (timeDiff < 60) { // 10+ security events in 1 minute
            return true;
        }
    }

    return false;
}

// ============================================================================
// RESPONSE GENERATORS
// ============================================================================

json SecureWebSocketBridge::createAuthRequiredResponse() const
{
    json response;
    response["type"] = "auth_required";
    response["error"] = "Authentication required";
    response["timestamp"] = juce::Time::currentTimeMillis();
    return response;
}

json SecureWebSocketBridge::createSecurityErrorResponse(const std::string& securityError) const
{
    json response;
    response["type"] = "security_error";
    response["error"] = securityError;
    response["timestamp"] = juce::Time::currentTimeMillis();
    return response;
}

// Include original response generators for compatibility
json SecureWebSocketBridge::createAudioLevelsResponse() const
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

json SecureWebSocketBridge::createPluginListResponse() const
{
    auto plugins = audioEngine.getLoadedPlugins();
    json response = createSuccessResponse();
    response["type"] = "plugin_list";
    response["plugins"] = json::array();

    for (const auto& pluginName : plugins) {
        response["plugins"].push_back(pluginName.toStdString());
    }

    return response;
}

json SecureWebSocketBridge::createDeviceListResponse() const
{
    auto devices = audioEngine.getAvailableAudioDevices();
    json response = createSuccessResponse();
    response["type"] = "audio_device_list";
    response["devices"] = json::array();

    for (const auto& deviceName : devices) {
        response["devices"].push_back(deviceName.toStdString());
    }

    return response;
}

json SecureWebSocketBridge::createStatusResponse() const
{
    json response = createSuccessResponse();
    response["type"] = "status";
    response["is_playing"] = audioEngine.isPlaying();
    response["position"] = audioEngine.getPlaybackPosition();
    response["tempo"] = audioEngine.getTempo();
    response["server_running"] = serverRunning;
    response["authenticated"] = !currentConnectionToken.empty();
    response["connection_id"] = connectionId;
    return response;
}

json SecureWebSocketBridge::createErrorResponse(const std::string& error) const
{
    json response;
    response["type"] = "error";
    response["error"] = error;
    response["timestamp"] = juce::Time::currentTimeMillis();
    return response;
}

json SecureWebSocketBridge::createSuccessResponse(const std::string& message) const
{
    json response;
    response["type"] = "success";
    response["timestamp"] = juce::Time::currentTimeMillis();
    if (!message.empty()) {
        response["message"] = message;
    }
    return response;
}

// ============================================================================
// UTILITY METHODS
// ============================================================================

void SecureWebSocketBridge::sendResponse(const json& response, bool isAuthenticated)
{
    if (clientConnection && clientConnection->isConnected()) {
        if (isAuthenticated || response["type"] == "auth_required" || response["type"] == "security_error") {
            std::string message = response.dump();
            clientConnection->sendMessage(message);
        }
    }
}

void SecureWebSocketBridge::broadcastAudioLevels()
{
    sendResponse(createAudioLevelsResponse(), true);
}

std::string SecureWebSocketBridge::generateSecureToken() const
{
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);

    std::stringstream ss;
    ss << std::hex;

    for (int i = 0; i < 32; ++i) {
        ss << dis(gen);
    }

    return ss.str();
}

bool SecureWebSocketBridge::isBanned() const
{
    if (failedAuthAttempts >= WebSocketSecurityConfig::MAX_FAILED_ATTEMPTS) {
        auto timeSinceLastFail = duration_cast<seconds>(steady_clock::now() - lastFailedAttempt).count();
        return timeSinceLastFail < WebSocketSecurityConfig::BAN_DURATION_SECONDS;
    }
    return false;
}

// Include original message handling for comparison (marked as deprecated)
void SecureWebSocketBridge::handleMessage(const json& message)
{
    // DEPRECATED: Use handleMessageSecure instead
    handleMessageSecure(message);
}

void SecureWebSocketBridge::sendResponse(const json& response)
{
    // Default to authenticated for backward compatibility
    sendResponse(response, true);
}