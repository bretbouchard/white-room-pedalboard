#pragma once

#include <JuceHeader.h>
#include <nlohmann/json.hpp>
#include <chrono>
#include <vector>
#include <map>
#include <mutex>
#include <regex>
#include <atomic>
#include <fstream>

using json = nlohmann::json;

// ============================================================================
// ADVANCED WEBSOCKET SECURITY MANAGER - REFACTOR PHASE
// Enhanced security architecture with comprehensive monitoring and logging
// ============================================================================

// Enhanced security event types
enum class AdvancedSecurityEventType {
    // Original events
    AUTHENTICATION_FAILED,
    RATE_LIMIT_EXCEEDED,
    MESSAGE_SIZE_EXCEEDED,
    INVALID_COMMAND_TYPE,
    PARAMETER_VALIDATION_FAILED,
    PATH_TRAVERSAL_ATTEMPT,
    INJECTION_ATTACK_DETECTED,
    SUSPICIOUS_PATTERN_DETECTED,

    // New advanced events
    BRUTE_FORCE_ATTACK_DETECTED,
    ANOMALOUS_CONNECTION_PATTERN,
    REPEATED_SECURITY_VIOLATIONS,
    CONNECTION_FLOOD_DETECTED,
    MALFORMED_MESSAGE_BURST,
    BANNED_IP_CONNECTION_ATTEMPT,
    PRIVILEGE_ESCALATION_ATTEMPT,
    DATA_EXFILTRATION_ATTEMPT,
    ZERO_DAY_EXPLOIT_ATTEMPT,
    UNAUTHORIZED_API_ACCESS,
    CRYPTOGRAPHIC_VIOLATION,
    SESSION_HIJACK_ATTEMPT,
    MEMORY_CORRUPTION_ATTEMPT,
    RESOURCE_EXHAUSTION_ATTACK,
    TIMING_ATTACK_DETECTED
};

// Security threat levels
enum class ThreatLevel {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4,
    EMERGENCY = 5
};

// Enhanced security event with advanced metadata
struct AdvancedSecurityEvent {
    AdvancedSecurityEventType type;
    ThreatLevel threatLevel;
    std::chrono::steady_clock::time_point timestamp;
    std::string connectionId;
    std::string sourceIP;
    std::string userAgent;
    std::string details;
    std::string rawMessage; // Sanitized message for forensic analysis
    int eventId;
    bool blocked;
    std::map<std::string, std::string> metadata;

    std::string toString() const;
    json toJson() const;
};

// Security metrics and analytics
struct SecurityMetrics {
    std::atomic<int> totalConnections{0};
    std::atomic<int> authenticatedConnections{0};
    std::atomic<int> blockedConnections{0};
    std::atomic<int> totalMessages{0};
    std::atomic<int> blockedMessages{0};
    std::atomic<int> securityEvents{0};
    std::atomic<int> criticalEvents{0};
    std::chrono::steady_clock::time_point startTime;

    SecurityMetrics() : startTime(std::chrono::steady_clock::now()) {}

    double getAuthSuccessRate() const;
    double getMessageBlockRate() const;
    double getSecurityEventRate() const;
    json toJson() const;
};

// Intrusion detection patterns
struct IntrusionPattern {
    std::string name;
    std::regex pattern;
    ThreatLevel threatLevel;
    std::string description;
    int weight;
};

// Security policy configuration
struct SecurityPolicy {
    bool strictMode = true;
    bool enableLogging = true;
    bool enableIntrusionDetection = true;
    bool enableBehaviorAnalysis = true;
    bool enableGeoBlocking = false;
    bool enableIPWhitelisting = false;
    bool enableAdvancedThreatDetection = true;

    // Rate limiting
    int maxConnectionsPerMinute = 10;
    int maxMessagesPerConnection = 100;
    int maxFailedAuthAttempts = 3;
    int banDurationMinutes = 30;

    // Message validation
    size_t maxMessageSize = 64 * 1024; // 64KB
    int maxMessageComplexity = 1000;
    bool enableDeepInspection = true;

    // Advanced features
    bool enableMachineLearningDetection = false;
    bool enableAnomalyDetection = true;
    bool enableForensicLogging = true;
};

// Connection profile for behavioral analysis
struct ConnectionProfile {
    std::string connectionId;
    std::chrono::steady_clock::time_point firstConnection;
    std::chrono::steady_clock::time_point lastActivity;
    int messageCount = 0;
    int securityViolations = 0;
    std::vector<std::string> attemptedCommands;
    std::vector<AdvancedSecurityEventType> securityEvents;
    double averageMessageSize = 0.0;
    double messageFrequency = 0.0;
    bool isAnomalous = false;
    ThreatLevel maxThreatLevel = ThreatLevel::LOW;

    void updateActivity();
    double calculateAnomalyScore() const;
    json toJson() const;
};

// Advanced threat intelligence
class ThreatIntelligence {
public:
    struct ThreatSignature {
        std::string signature;
        ThreatLevel threatLevel;
        std::string category;
        std::string description;
        std::vector<std::string> indicators;
    };

    std::vector<ThreatSignature> loadThreatSignatures(const std::string& databasePath);
    bool matchesThreatSignature(const std::string& input, ThreatSignature& matchedSignature) const;
    void updateThreatDatabase(const std::vector<ThreatSignature>& newSignatures);

private:
    std::vector<ThreatSignature> threatSignatures;
    std::mutex signaturesMutex;
};

// WebSocket Security Manager
class WebSocketSecurityManager {
public:
    WebSocketSecurityManager();
    ~WebSocketSecurityManager();

    // Core security processing
    bool processConnection(const std::string& connectionId, const std::string& sourceIP = "");
    bool processMessage(const std::string& connectionId, const std::string& rawMessage);
    void processDisconnection(const std::string& connectionId);

    // Authentication and authorization
    std::string generateSecureToken(const std::vector<std::string>& permissions, int ttlSeconds = 3600);
    bool validateToken(const std::string& connectionId, const std::string& token);
    void revokeToken(const std::string& token);

    // Security policy management
    void setSecurityPolicy(const SecurityPolicy& policy);
    SecurityPolicy getSecurityPolicy() const;

    // Intrusion detection
    bool detectIntrusion(const std::string& connectionId, const std::string& message);
    bool isConnectionBanned(const std::string& connectionId) const;
    void banConnection(const std::string& connectionId, int durationMinutes = 30);

    // Security monitoring and analytics
    SecurityMetrics getMetrics() const;
    std::vector<AdvancedSecurityEvent> getSecurityEvents(int maxEvents = 1000) const;
    std::vector<AdvancedSecurityEvent> getSecurityEventsForConnection(const std::string& connectionId, int maxEvents = 100) const;
    ConnectionProfile getConnectionProfile(const std::string& connectionId) const;

    // Advanced threat detection
    bool detectAnomalousPattern(const std::string& connectionId);
    bool detectAdvancedThreats(const std::string& connectionId, const std::string& message);
    ThreatIntelligence& getThreatIntelligence();

    // Forensic and compliance
    void exportSecurityLogs(const std::string& filePath, const std::chrono::steady_clock::time_point& start, const std::chrono::steady_clock::time_point& end) const;
    bool generateSecurityReport(const std::string& filePath) const;
    void clearSecurityLogs();

    // Configuration and management
    void addWhitelistedIP(const std::string& ip);
    void addBannedIP(const std::string& ip);
    void removeWhitelistedIP(const std::string& ip);
    void removeBannedIP(const std::string& ip);
    std::vector<std::string> getWhitelistedIPs() const;
    std::vector<std::string> getBannedIPs() const;

private:
    // Core components
    SecurityPolicy policy;
    SecurityMetrics metrics;
    ThreatIntelligence threatIntel;

    // Connection management
    std::map<std::string, ConnectionProfile> connectionProfiles;
    std::map<std::string, std::string> connectionTokens; // connectionId -> token
    std::map<std::string, std::chrono::steady_clock::time_point> bannedConnections;
    std::map<std::string, std::string> ipToConnectionId;

    // Security events and logging
    std::vector<AdvancedSecurityEvent> securityEvents;
    std::vector<IntrusionPattern> intrusionPatterns;
    int nextEventId = 1;

    // IP management
    std::vector<std::regex> whitelistedIPs;
    std::vector<std::regex> bannedIPs;

    // Synchronization
    mutable std::mutex profilesMutex;
    mutable std::mutex eventsMutex;
    mutable std::mutex tokensMutex;
    mutable std::mutex bannedMutex;
    mutable std::mutex metricsMutex;

    // Internal methods
    void initializeIntrusionPatterns();
    void logSecurityEvent(const AdvancedSecurityEvent& event);
    void updateMetrics(const AdvancedSecurityEvent& event);
    void cleanupExpiredData();

    // Advanced analysis
    ConnectionProfile& getOrCreateProfile(const std::string& connectionId);
    ThreatLevel assessThreatLevel(const std::string& connectionId, AdvancedSecurityEventType eventType, const std::string& details) const;
    bool isIPAllowed(const std::string& ip) const;
    std::string extractIPAddress(const std::string& connectionId) const;

    // Message validation
    bool validateMessageStructure(const json& message) const;
    bool validateMessageContent(const json& message) const;
    bool sanitizeMessage(json& message) const;
    std::string calculateMessageHash(const std::string& message) const;

    // Behavioral analysis
    double calculateConnectionRiskScore(const std::string& connectionId) const;
    bool detectBehavioralAnomalies(const std::string& connectionId) const;
    void updateConnectionBehavior(const std::string& connectionId, const std::string& message, bool wasBlocked);

    // Compliance and reporting
    void writeForensicLog(const AdvancedSecurityEvent& event) const;
    json generateComplianceReport() const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(WebSocketSecurityManager)
};

// Global security manager instance
class GlobalSecurityManager {
public:
    static WebSocketSecurityManager& getInstance();
    static void initialize();

private:
    static std::unique_ptr<WebSocketSecurityManager> instance;
    static std::once_flag initialized;
};