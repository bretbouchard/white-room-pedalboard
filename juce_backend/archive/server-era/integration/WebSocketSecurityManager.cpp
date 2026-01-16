#include "WebSocketSecurityManager.h"
#include <random>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <cctype>
#include <ctime>
#include <iomanip>
#include <filesystem>

// ============================================================================
// ADVANCED SECURITY EVENT IMPLEMENTATIONS
// ============================================================================

std::string AdvancedSecurityEvent::toString() const {
    std::stringstream ss;
    ss << "[EVENT-" << std::setfill('0') << std::setw(6) << eventId << "] ";
    ss << "[" << std::chrono::duration_cast<std::chrono::milliseconds>(timestamp.time_since_epoch()).count() << "] ";

    // Event type
    switch (type) {
        case AdvancedSecurityEventType::AUTHENTICATION_FAILED:
            ss << "AUTH_FAILED"; break;
        case AdvancedSecurityEventType::RATE_LIMIT_EXCEEDED:
            ss << "RATE_LIMIT_EXCEEDED"; break;
        case AdvancedSecurityEventType::MESSAGE_SIZE_EXCEEDED:
            ss << "MESSAGE_SIZE_EXCEEDED"; break;
        case AdvancedSecurityEventType::INVALID_COMMAND_TYPE:
            ss << "INVALID_COMMAND"; break;
        case AdvancedSecurityEventType::PARAMETER_VALIDATION_FAILED:
            ss << "PARAM_VALIDATION_FAILED"; break;
        case AdvancedSecurityEventType::PATH_TRAVERSAL_ATTEMPT:
            ss << "PATH_TRAVERSAL"; break;
        case AdvancedSecurityEventType::INJECTION_ATTACK_DETECTED:
            ss << "INJECTION_ATTACK"; break;
        case AdvancedSecurityEventType::SUSPICIOUS_PATTERN_DETECTED:
            ss << "SUSPICIOUS_PATTERN"; break;
        case AdvancedSecurityEventType::BRUTE_FORCE_ATTACK_DETECTED:
            ss << "BRUTE_FORCE"; break;
        case AdvancedSecurityEventType::ANOMALOUS_CONNECTION_PATTERN:
            ss << "ANOMALOUS_CONNECTION"; break;
        case AdvancedSecurityEventType::REPEATED_SECURITY_VIOLATIONS:
            ss << "REPEATED_VIOLATIONS"; break;
        case AdvancedSecurityEventType::CONNECTION_FLOOD_DETECTED:
            ss << "CONNECTION_FLOOD"; break;
        case AdvancedSecurityEventType::MALFORMED_MESSAGE_BURST:
            ss << "MALFORMED_BURST"; break;
        case AdvancedSecurityEventType::BANNED_IP_CONNECTION_ATTEMPT:
            ss << "BANNED_IP_ATTEMPT"; break;
        case AdvancedSecurityEventType::PRIVILEGE_ESCALATION_ATTEMPT:
            ss << "PRIVILEGE_ESCALATION"; break;
        case AdvancedSecurityEventType::DATA_EXFILTRATION_ATTEMPT:
            ss << "DATA_EXFILTRATION"; break;
        case AdvancedSecurityEventType::ZERO_DAY_EXPLOIT_ATTEMPT:
            ss << "ZERO_DAY_EXPLOIT"; break;
        case AdvancedSecurityEventType::UNAUTHORIZED_API_ACCESS:
            ss << "UNAUTHORIZED_API_ACCESS"; break;
        case AdvancedSecurityEventType::CRYPTOGRAPHIC_VIOLATION:
            ss << "CRYPTO_VIOLATION"; break;
        case AdvancedSecurityEventType::SESSION_HIJACK_ATTEMPT:
            ss << "SESSION_HIJACK"; break;
        case AdvancedSecurityEventType::MEMORY_CORRUPTION_ATTEMPT:
            ss << "MEMORY_CORRUPTION"; break;
        case AdvancedSecurityEventType::RESOURCE_EXHAUSTION_ATTACK:
            ss << "RESOURCE_EXHAUSTION"; break;
        case AdvancedSecurityEventType::TIMING_ATTACK_DETECTED:
            ss << "TIMING_ATTACK"; break;
    }

    // Threat level
    ss << " [";
    switch (threatLevel) {
        case ThreatLevel::LOW: ss << "LOW"; break;
        case ThreatLevel::MEDIUM: ss << "MEDIUM"; break;
        case ThreatLevel::HIGH: ss << "HIGH"; break;
        case ThreatLevel::CRITICAL: ss << "CRITICAL"; break;
        case ThreatLevel::EMERGENCY: ss << "EMERGENCY"; break;
    }
    ss << "] ";

    // Connection and details
    ss << "Connection: " << connectionId << " - " << details;
    if (sourceIP != "") {
        ss << " (IP: " << sourceIP << ")";
    }

    return ss.str();
}

json AdvancedSecurityEvent::toJson() const {
    json event;
    event["eventId"] = eventId;
    event["type"] = static_cast<int>(type);
    event["threatLevel"] = static_cast<int>(threatLevel);
    event["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(timestamp.time_since_epoch()).count();
    event["connectionId"] = connectionId;
    event["sourceIP"] = sourceIP;
    event["userAgent"] = userAgent;
    event["details"] = details;
    event["rawMessage"] = rawMessage;
    event["blocked"] = blocked;
    event["metadata"] = metadata;

    // Add string representations
    switch (type) {
        case AdvancedSecurityEventType::AUTHENTICATION_FAILED:
            event["typeString"] = "AUTHENTICATION_FAILED"; break;
        case AdvancedSecurityEventType::RATE_LIMIT_EXCEEDED:
            event["typeString"] = "RATE_LIMIT_EXCEEDED"; break;
        // ... add all other cases
        default:
            event["typeString"] = "UNKNOWN"; break;
    }

    switch (threatLevel) {
        case ThreatLevel::LOW: event["threatLevelString"] = "LOW"; break;
        case ThreatLevel::MEDIUM: event["threatLevelString"] = "MEDIUM"; break;
        case ThreatLevel::HIGH: event["threatLevelString"] = "HIGH"; break;
        case ThreatLevel::CRITICAL: event["threatLevelString"] = "CRITICAL"; break;
        case ThreatLevel::EMERGENCY: event["threatLevelString"] = "EMERGENCY"; break;
    }

    return event;
}

// ============================================================================
// SECURITY METRICS IMPLEMENTATION
// ============================================================================

double SecurityMetrics::getAuthSuccessRate() const {
    int total = totalConnections.load();
    if (total == 0) return 0.0;
    return (static_cast<double>(authenticatedConnections.load()) / total) * 100.0;
}

double SecurityMetrics::getMessageBlockRate() const {
    int total = totalMessages.load();
    if (total == 0) return 0.0;
    return (static_cast<double>(blockedMessages.load()) / total) * 100.0;
}

double SecurityMetrics::getSecurityEventRate() const {
    auto now = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::seconds>(now - startTime).count();
    if (duration == 0) return 0.0;
    return static_cast<double>(securityEvents.load()) / duration;
}

json SecurityMetrics::toJson() const {
    json metrics;
    metrics["totalConnections"] = totalConnections.load();
    metrics["authenticatedConnections"] = authenticatedConnections.load();
    metrics["blockedConnections"] = blockedConnections.load();
    metrics["totalMessages"] = totalMessages.load();
    metrics["blockedMessages"] = blockedMessages.load();
    metrics["securityEvents"] = securityEvents.load();
    metrics["criticalEvents"] = criticalEvents.load();
    metrics["authSuccessRate"] = getAuthSuccessRate();
    metrics["messageBlockRate"] = getMessageBlockRate();
    metrics["securityEventRate"] = getSecurityEventRate();
    metrics["startTime"] = std::chrono::duration_cast<std::chrono::milliseconds>(startTime.time_since_epoch()).count();

    return metrics;
}

// ============================================================================
// CONNECTION PROFILE IMPLEMENTATION
// ============================================================================

void ConnectionProfile::updateActivity() {
    lastActivity = std::chrono::steady_clock::now();
    messageCount++;
}

double ConnectionProfile::calculateAnomalyScore() const {
    double score = 0.0;

    // High message frequency
    if (messageFrequency > 10.0) score += 0.3;
    if (messageFrequency > 50.0) score += 0.4;

    // Many security violations
    if (securityViolations > 5) score += 0.5;
    if (securityViolations > 20) score += 0.5;

    // High threat level events
    if (maxThreatLevel >= ThreatLevel::HIGH) score += 0.3;
    if (maxThreatLevel >= ThreatLevel::CRITICAL) score += 0.4;

    // Unusual command patterns
    if (attemptedCommands.size() > 10) score += 0.2;

    return std::min(score, 1.0);
}

json ConnectionProfile::toJson() const {
    json profile;
    profile["connectionId"] = connectionId;
    profile["firstConnection"] = std::chrono::duration_cast<std::chrono::milliseconds>(firstConnection.time_since_epoch()).count();
    profile["lastActivity"] = std::chrono::duration_cast<std::chrono::milliseconds>(lastActivity.time_since_epoch()).count();
    profile["messageCount"] = messageCount;
    profile["securityViolations"] = securityViolations;
    profile["attemptedCommands"] = attemptedCommands;
    profile["averageMessageSize"] = averageMessageSize;
    profile["messageFrequency"] = messageFrequency;
    profile["isAnomalous"] = isAnomalous;
    profile["anomalyScore"] = calculateAnomalyScore();
    profile["maxThreatLevel"] = static_cast<int>(maxThreatLevel);

    return profile;
}

// ============================================================================
// THREAT INTELLIGENCE IMPLEMENTATION
// ============================================================================

std::vector<ThreatIntelligence::ThreatSignature> ThreatIntelligence::loadThreatSignatures(const std::string& databasePath) {
    std::vector<ThreatSignature> signatures;

    // Load predefined threat signatures
    signatures.push_back({
        R"((\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b.*\b(FROM|INTO|TABLE)\b))",
        ThreatLevel::HIGH,
        "SQL_INJECTION",
        "SQL injection attack pattern detected",
        {"SELECT", "INSERT", "UPDATE", "DELETE", "DROP"}
    });

    signatures.push_back({
        R"((<script|javascript:|vbscript:|onload=|onerror=))",
        ThreatLevel::MEDIUM,
        "XSS_ATTACK",
        "Cross-site scripting attack pattern",
        {"<script", "javascript:", "vbscript:"}
    });

    signatures.push_back({
        R"((\.\.[\\/]))",
        ThreatLevel::HIGH,
        "PATH_TRAVERSAL",
        "Directory traversal attack pattern",
        {"../", "..\\"}
    });

    signatures.push_back({
        R"((\b(exec|eval|system|shell_exec|passthru)\b\s*\())",
        ThreatLevel::CRITICAL,
        "CODE_INJECTION",
        "Code execution injection attack",
        {"exec", "eval", "system", "shell_exec"}
    });

    signatures.push_back({
        R"((\b(union|select|insert|update|delete|drop|create|alter)\s+[a-z0-9_*]+))",
        ThreatLevel::HIGH,
        "SQL_INJECTION_ADVANCED",
        "Advanced SQL injection pattern",
        {"union", "select", "insert", "update"}
    });

    std::lock_guard<std::mutex> lock(signaturesMutex);
    threatSignatures = signatures;

    return signatures;
}

bool ThreatIntelligence::matchesThreatSignature(const std::string& input, ThreatSignature& matchedSignature) const {
    std::lock_guard<std::mutex> lock(signaturesMutex);

    for (const auto& signature : threatSignatures) {
        if (std::regex_search(input, signature.pattern)) {
            matchedSignature = signature;
            return true;
        }
    }

    return false;
}

void ThreatIntelligence::updateThreatDatabase(const std::vector<ThreatSignature>& newSignatures) {
    std::lock_guard<std::mutex> lock(signaturesMutex);
    threatSignatures.insert(threatSignatures.end(), newSignatures.begin(), newSignatures.end());
}

// ============================================================================
// WEBSOCKET SECURITY MANAGER IMPLEMENTATION
// ============================================================================

WebSocketSecurityManager::WebSocketSecurityManager() {
    initializeIntrusionPatterns();
    threatIntel.loadThreatSignatures(""); // Load default signatures

    // Set default security policy
    policy.strictMode = true;
    policy.enableLogging = true;
    policy.enableIntrusionDetection = true;
    policy.enableBehaviorAnalysis = true;
    policy.enableAdvancedThreatDetection = true;
}

WebSocketSecurityManager::~WebSocketSecurityManager() {
    // Generate final security report
    generateSecurityReport("security_report_final.json");
}

bool WebSocketSecurityManager::processConnection(const std::string& connectionId, const std::string& sourceIP) {
    std::lock_guard<std::mutex> lock(profilesMutex);

    // Check if connection is banned
    if (isConnectionBanned(connectionId) || (!sourceIP.empty() && !isIPAllowed(sourceIP))) {
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::BANNED_IP_CONNECTION_ATTEMPT,
            ThreatLevel::HIGH,
            std::chrono::steady_clock::now(),
            connectionId,
            sourceIP,
            "",
            "Banned connection attempted",
            "",
            nextEventId++,
            true
        };

        logSecurityEvent(event);
        return false;
    }

    // Create connection profile
    ConnectionProfile& profile = getOrCreateProfile(connectionId);
    profile.firstConnection = std::chrono::steady_clock::now();
    profile.connectionId = connectionId;

    // Update metrics
    {
        std::lock_guard<std::mutex> metricsLock(metricsMutex);
        metrics.totalConnections++;
    }

    // Map IP to connection for tracking
    if (!sourceIP.empty()) {
        ipToConnectionId[sourceIP] = connectionId;
    }

    return true;
}

bool WebSocketSecurityManager::processMessage(const std::string& connectionId, const std::string& rawMessage) {
    std::lock_guard<std::mutex> lock(profilesMutex);

    // Update metrics
    {
        std::lock_guard<std::mutex> metricsLock(metricsMutex);
        metrics.totalMessages++;
    }

    ConnectionProfile& profile = getOrCreateProfile(connectionId);
    profile.updateActivity();

    // Check rate limiting
    if (profile.messageFrequency > policy.maxMessagesPerConnection) {
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::RATE_LIMIT_EXCEEDED,
            ThreatLevel::MEDIUM,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            "Connection rate limit exceeded: " + std::to_string(profile.messageFrequency) + " msgs/min",
            rawMessage.substr(0, 100), // Limit stored message size
            nextEventId++,
            true
        };

        logSecurityEvent(event);
        updateMetrics(event);
        return false;
    }

    // Validate message size
    if (rawMessage.length() > policy.maxMessageSize) {
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::MESSAGE_SIZE_EXCEEDED,
            ThreatLevel::MEDIUM,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            "Message size exceeded limit: " + std::to_string(rawMessage.length()),
            rawMessage.substr(0, 100),
            nextEventId++,
            true
        };

        logSecurityEvent(event);
        updateMetrics(event);
        return false;
    }

    try {
        json message = json::parse(rawMessage);

        // Validate message structure
        if (!validateMessageStructure(message)) {
            AdvancedSecurityEvent event{
                AdvancedSecurityEventType::PARAMETER_VALIDATION_FAILED,
                ThreatLevel::MEDIUM,
                std::chrono::steady_clock::now(),
                connectionId,
                extractIPAddress(connectionId),
                "",
                "Invalid message structure",
                rawMessage.substr(0, 100),
                nextEventId++,
                true
            };

            logSecurityEvent(event);
            updateMetrics(event);
            return false;
        }

        // Check for intrusion patterns
        if (detectIntrusion(connectionId, rawMessage)) {
            return false;
        }

        // Check for advanced threats
        if (detectAdvancedThreats(connectionId, rawMessage)) {
            return false;
        }

        // Update connection behavior
        updateConnectionBehavior(connectionId, rawMessage, false);

        return true;

    } catch (const json::parse_error& e) {
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::MALFORMED_MESSAGE_BURST,
            ThreatLevel::MEDIUM,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            "JSON parse error: " + std::string(e.what()),
            rawMessage.substr(0, 100),
            nextEventId++,
            true
        };

        logSecurityEvent(event);
        updateMetrics(event);
        return false;
    }
}

void WebSocketSecurityManager::processDisconnection(const std::string& connectionId) {
    std::lock_guard<std::mutex> lock(profilesMutex);

    auto it = connectionProfiles.find(connectionId);
    if (it != connectionProfiles.end()) {
        ConnectionProfile& profile = it->second;

        // Log disconnection with final stats
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::SUSPICIOUS_PATTERN_DETECTED,
            ThreatLevel::LOW,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            "Connection closed. Messages: " + std::to_string(profile.messageCount) +
            ", Violations: " + std::to_string(profile.securityViolations),
            "",
            nextEventId++,
            false
        };

        logSecurityEvent(event);

        // Remove from active connections
        connectionProfiles.erase(it);
    }

    // Clean up IP mapping
    for (auto it = ipToConnectionId.begin(); it != ipToConnectionId.end();) {
        if (it->second == connectionId) {
            it = ipToConnectionId.erase(it);
        } else {
            ++it;
        }
    }
}

std::string WebSocketSecurityManager::generateSecureToken(const std::vector<std::string>& permissions, int ttlSeconds) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);

    std::stringstream ss;
    ss << std::hex;

    for (int i = 0; i < 64; ++i) {
        ss << dis(gen);
    }

    std::string token = ss.str();

    // Store token with metadata
    {
        std::lock_guard<std::mutex> lock(tokensMutex);
        // In a real implementation, this would store token with expiry and permissions
        // For now, we just store it in a simple map
    }

    return token;
}

bool WebSocketSecurityManager::validateToken(const std::string& connectionId, const std::string& token) {
    std::lock_guard<std::mutex> lock(tokensMutex);

    auto it = connectionTokens.find(connectionId);
    if (it != connectionTokens.end() && it->second == token) {
        // Update metrics
        {
            std::lock_guard<std::mutex> metricsLock(metricsMutex);
            metrics.authenticatedConnections++;
        }

        return true;
    }

    // Log failed authentication
    AdvancedSecurityEvent event{
        AdvancedSecurityEventType::AUTHENTICATION_FAILED,
        ThreatLevel::MEDIUM,
        std::chrono::steady_clock::now(),
        connectionId,
        extractIPAddress(connectionId),
        "",
        "Authentication failed for connection",
        "",
        nextEventId++,
        false
    };

    logSecurityEvent(event);
    updateMetrics(event);

    return false;
}

void WebSocketSecurityManager::setSecurityPolicy(const SecurityPolicy& newPolicy) {
    policy = newPolicy;
}

SecurityPolicy WebSocketSecurityManager::getSecurityPolicy() const {
    return policy;
}

bool WebSocketSecurityManager::detectIntrusion(const std::string& connectionId, const std::string& message) {
    if (!policy.enableIntrusionDetection) {
        return false;
    }

    ThreatIntelligence::ThreatSignature matchedSignature;
    if (threatIntel.matchesThreatSignature(message, matchedSignature)) {
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::INJECTION_ATTACK_DETECTED,
            matchedSignature.threatLevel,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            matchedSignature.description + ": " + matchedSignature.category,
            message.substr(0, 100),
            nextEventId++,
            true
        };

        logSecurityEvent(event);
        updateMetrics(event);

        // Consider banning for high-threat attacks
        if (matchedSignature.threatLevel >= ThreatLevel::HIGH) {
            banConnection(connectionId, policy.banDurationMinutes);
        }

        return true;
    }

    return false;
}

bool WebSocketSecurityManager::isConnectionBanned(const std::string& connectionId) const {
    std::lock_guard<std::mutex> lock(bannedMutex);

    auto it = bannedConnections.find(connectionId);
    if (it == bannedConnections.end()) {
        return false;
    }

    auto now = std::chrono::steady_clock::now();
    auto banExpiry = it->second;

    if (now < banExpiry) {
        return true; // Still banned
    } else {
        // Ban expired, remove it
        bannedConnections.erase(it);
        return false;
    }
}

void WebSocketSecurityManager::banConnection(const std::string& connectionId, int durationMinutes) {
    std::lock_guard<std::mutex> lock(bannedMutex);

    auto banExpiry = std::chrono::steady_clock::now() + std::chrono::minutes(durationMinutes);
    bannedConnections[connectionId] = banExpiry;

    AdvancedSecurityEvent event{
        AdvancedSecurityEventType::BRUTE_FORCE_ATTACK_DETECTED,
        ThreatLevel::HIGH,
        std::chrono::steady_clock::now(),
        connectionId,
        extractIPAddress(connectionId),
        "",
        "Connection banned for " + std::to_string(durationMinutes) + " minutes",
        "",
        nextEventId++,
        true
    };

    logSecurityEvent(event);
}

SecurityMetrics WebSocketSecurityManager::getMetrics() const {
    std::lock_guard<std::mutex> lock(metricsMutex);
    return metrics;
}

std::vector<AdvancedSecurityEvent> WebSocketSecurityManager::getSecurityEvents(int maxEvents) const {
    std::lock_guard<std::mutex> lock(eventsMutex);

    std::vector<AdvancedSecurityEvent> result;
    int startIndex = std::max(0, (int)securityEvents.size() - maxEvents);

    for (int i = startIndex; i < (int)securityEvents.size(); i++) {
        result.push_back(securityEvents[i]);
    }

    return result;
}

std::vector<AdvancedSecurityEvent> WebSocketSecurityManager::getSecurityEventsForConnection(const std::string& connectionId, int maxEvents) const {
    std::lock_guard<std::mutex> lock(eventsMutex);

    std::vector<AdvancedSecurityEvent> result;
    int count = 0;

    // Iterate backwards to get most recent events first
    for (auto it = securityEvents.rbegin(); it != securityEvents.rend() && count < maxEvents; ++it) {
        if (it->connectionId == connectionId) {
            result.push_back(*it);
            count++;
        }
    }

    return result;
}

ConnectionProfile WebSocketSecurityManager::getConnectionProfile(const std::string& connectionId) const {
    std::lock_guard<std::mutex> lock(profilesMutex);

    auto it = connectionProfiles.find(connectionId);
    if (it != connectionProfiles.end()) {
        return it->second;
    }

    return ConnectionProfile{}; // Return empty profile if not found
}

bool WebSocketSecurityManager::detectAnomalousPattern(const std::string& connectionId) {
    if (!policy.enableAnomalyDetection) {
        return false;
    }

    ConnectionProfile profile = getConnectionProfile(connectionId);
    double anomalyScore = profile.calculateAnomalyScore();

    if (anomalyScore > 0.7) { // High anomaly threshold
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::ANOMALOUS_CONNECTION_PATTERN,
            ThreatLevel::MEDIUM,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            "Anomalous connection pattern detected (score: " + std::to_string(anomalyScore) + ")",
            "",
            nextEventId++,
            false
        };

        logSecurityEvent(event);
        return true;
    }

    return false;
}

bool WebSocketSecurityManager::detectAdvancedThreats(const std::string& connectionId, const std::string& message) {
    if (!policy.enableAdvancedThreatDetection) {
        return false;
    }

    ConnectionProfile& profile = getOrCreateProfile(connectionId);

    // Detect repeated security violations
    if (profile.securityViolations > 10) {
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::REPEATED_SECURITY_VIOLATIONS,
            ThreatLevel::HIGH,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            "Repeated security violations detected: " + std::to_string(profile.securityViolations),
            message.substr(0, 100),
            nextEventId++,
            true
        };

        logSecurityEvent(event);
        updateMetrics(event);

        return true;
    }

    // Detect connection flooding
    if (profile.messageFrequency > 100.0) { // Very high frequency
        AdvancedSecurityEvent event{
            AdvancedSecurityEventType::CONNECTION_FLOOD_DETECTED,
            ThreatLevel::HIGH,
            std::chrono::steady_clock::now(),
            connectionId,
            extractIPAddress(connectionId),
            "",
            "Connection flooding detected: " + std::to_string(profile.messageFrequency) + " msgs/min",
            message.substr(0, 100),
            nextEventId++,
            true
        };

        logSecurityEvent(event);
        updateMetrics(event);

        return true;
    }

    return false;
}

ThreatIntelligence& WebSocketSecurityManager::getThreatIntelligence() {
    return threatIntel;
}

bool WebSocketSecurityManager::generateSecurityReport(const std::string& filePath) const {
    try {
        json report;
        report["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();
        report["securityPolicy"] = json{
            {"strictMode", policy.strictMode},
            {"enableLogging", policy.enableLogging},
            {"enableIntrusionDetection", policy.enableIntrusionDetection},
            {"enableBehaviorAnalysis", policy.enableBehaviorAnalysis},
            {"maxMessageSize", policy.maxMessageSize},
            {"maxMessagesPerConnection", policy.maxMessagesPerConnection}
        };

        report["metrics"] = getMetrics().toJson();

        // Add recent security events
        auto recentEvents = getSecurityEvents(100);
        report["recentEvents"] = json::array();
        for (const auto& event : recentEvents) {
            report["recentEvents"].push_back(event.toJson());
        }

        // Add connection profiles
        std::lock_guard<std::mutex> lock(profilesMutex);
        report["connectionProfiles"] = json::array();
        for (const auto& [connectionId, profile] : connectionProfiles) {
            report["connectionProfiles"].push_back(profile.toJson());
        }

        // Write to file
        std::ofstream file(filePath);
        file << report.dump(2);
        file.close();

        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to generate security report: " + std::string(e.what()));
        return false;
    }
}

// ============================================================================
// PRIVATE METHODS IMPLEMENTATION
// ============================================================================

void WebSocketSecurityManager::initializeIntrusionPatterns() {
    // Initialize default intrusion detection patterns
    intrusionPatterns.push_back({
        "SQL_INJECTION",
        std::regex(R"((\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b.*\b(FROM|INTO|TABLE)\b))", std::regex_constants::icase),
        ThreatLevel::HIGH,
        "SQL injection attack pattern",
        10
    });

    intrusionPatterns.push_back({
        "XSS_ATTACK",
        std::regex(R"((<script|javascript:|vbscript:|onload=|onerror=))", std::regex_constants::icase),
        ThreatLevel::MEDIUM,
        "Cross-site scripting attack pattern",
        7
    });

    intrusionPatterns.push_back({
        "PATH_TRAVERSAL",
        std::regex(R"((\.\.[\\/]))"),
        ThreatLevel::HIGH,
        "Directory traversal attack pattern",
        9
    });
}

void WebSocketSecurityManager::logSecurityEvent(const AdvancedSecurityEvent& event) {
    if (!policy.enableLogging) {
        return;
    }

    {
        std::lock_guard<std::mutex> lock(eventsMutex);
        securityEvents.push_back(event);

        // Keep only last 10000 events to prevent memory bloat
        if (securityEvents.size() > 10000) {
            securityEvents.erase(securityEvents.begin());
        }
    }

    // Log to JUCE logger
    juce::Logger::writeToLog("[SECURITY] " + event.toString());

    // Write forensic log if enabled
    if (policy.enableForensicLogging) {
        writeForensicLog(event);
    }
}

void WebSocketSecurityManager::updateMetrics(const AdvancedSecurityEvent& event) {
    std::lock_guard<std::mutex> lock(metricsMutex);

    metrics.securityEvents++;
    if (event.blocked) {
        metrics.blockedMessages++;
    }

    if (event.threatLevel >= ThreatLevel::HIGH) {
        metrics.criticalEvents++;
    }
}

void WebSocketSecurityManager::writeForensicLog(const AdvancedSecurityEvent& event) const {
    try {
        std::string filename = "security_forensic_" + std::to_string(std::time(nullptr)) + ".log";
        std::ofstream file(filename, std::ios::app);
        file << event.toString() << std::endl;
        file.close();
    } catch (const std::exception& e) {
        // Don't log errors from forensic logging to prevent infinite loops
    }
}

ConnectionProfile& WebSocketSecurityManager::getOrCreateProfile(const std::string& connectionId) {
    auto it = connectionProfiles.find(connectionId);
    if (it == connectionProfiles.end()) {
        ConnectionProfile profile;
        profile.connectionId = connectionId;
        profile.firstConnection = std::chrono::steady_clock::now();
        profile.lastActivity = profile.firstConnection;
        connectionProfiles[connectionId] = profile;
    }

    return connectionProfiles[connectionId];
}

std::string WebSocketSecurityManager::extractIPAddress(const std::string& connectionId) const {
    // In a real implementation, this would extract the IP from connection metadata
    // For now, return a placeholder
    return "unknown";
}

bool WebSocketSecurityManager::isIPAllowed(const std::string& ip) const {
    // Check if IP is banned
    for (const auto& bannedPattern : bannedIPs) {
        if (std::regex_match(ip, bannedPattern)) {
            return false;
        }
    }

    // Check if IP is whitelisted (if whitelist is enabled)
    if (policy.enableIPWhitelisting && !whitelistedIPs.empty()) {
        for (const auto& whitelistPattern : whitelistedIPs) {
            if (std::regex_match(ip, whitelistPattern)) {
                return true;
            }
        }
        return false; // Not in whitelist
    }

    return true; // Allowed
}

bool WebSocketSecurityManager::validateMessageStructure(const json& message) const {
    // Basic structure validation
    if (!message.is_object()) {
        return false;
    }

    if (!message.contains("type")) {
        return false;
    }

    std::string type = message["type"];
    if (type.empty()) {
        return false;
    }

    // Command type validation (whitelist)
    std::vector<std::string> allowedTypes = {
        "authenticate", "transport_command", "parameter_update",
        "plugin_load", "plugin_unload", "get_audio_devices",
        "get_loaded_plugins", "get_audio_levels"
    };

    return std::find(allowedTypes.begin(), allowedTypes.end(), type) != allowedTypes.end();
}

void WebSocketSecurityManager::updateConnectionBehavior(const std::string& connectionId, const std::string& message, bool wasBlocked) {
    ConnectionProfile& profile = getOrCreateProfile(connectionId);

    // Update message statistics
    profile.averageMessageSize = (profile.averageMessageSize * (profile.messageCount - 1) + message.length()) / profile.messageCount;

    // Calculate message frequency (messages per minute)
    auto now = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::minutes>(now - profile.firstConnection).count();
    if (duration > 0) {
        profile.messageFrequency = static_cast<double>(profile.messageCount) / duration;
    }

    // Track security violations
    if (wasBlocked) {
        profile.securityViolations++;
    }

    // Check for anomalous behavior
    profile.isAnomalous = detectAnomalousPattern(connectionId);
}

// ============================================================================
// GLOBAL SECURITY MANAGER IMPLEMENTATION
// ============================================================================

std::unique_ptr<WebSocketSecurityManager> GlobalSecurityManager::instance;
std::once_flag GlobalSecurityManager::initialized;

WebSocketSecurityManager& GlobalSecurityManager::getInstance() {
    std::call_once(initialized, []() {
        instance = std::make_unique<WebSocketSecurityManager>();
    });
    return *instance;
}

void GlobalSecurityManager::initialize() {
    getInstance(); // This will trigger the once_flag initialization
}