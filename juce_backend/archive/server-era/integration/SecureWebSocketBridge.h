#pragma once

#include <JuceHeader.h>
#include "AudioEngine.h"
#include <nlohmann/json.hpp>
#include <chrono>
#include <unordered_set>
#include <regex>
#include <mutex>

using json = nlohmann::json;

// ============================================================================
// SECURE WEBSOCKET BRIDGE - GREEN PHASE IMPLEMENTATION
// This implementation fixes all identified security vulnerabilities
// ============================================================================

// Security configuration constants
namespace WebSocketSecurityConfig {
    constexpr size_t MAX_MESSAGE_SIZE = 64 * 1024; // 64KB message size limit
    constexpr int MAX_MESSAGES_PER_MINUTE = 60; // Rate limiting: 60 messages/minute
    constexpr int MAX_MESSAGES_PER_SECOND = 5; // Burst limiting: 5 messages/second
    constexpr int AUTH_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour token expiry
    constexpr int MAX_FAILED_ATTEMPTS = 5; // Max failed attempts before temporary ban
    constexpr int BAN_DURATION_SECONDS = 300; // 5 minute temporary ban
}

// Authentication token structure
struct AuthToken {
    std::string token;
    std::chrono::steady_clock::time_point expiry;
    std::string userId;
    std::vector<std::string> permissions;

    bool isValid() const {
        auto now = std::chrono::steady_clock::now();
        return now < expiry;
    }
};

// Rate limiting tracker
struct RateLimitTracker {
    std::chrono::steady_clock::time_point windowStart;
    std::chrono::steady_clock::time_point burstStart;
    int messagesInWindow = 0;
    int messagesInBurst = 0;

    bool canSendMessage() const;
    void recordMessage();
};

// Security event types for monitoring
enum class SecurityEventType {
    AUTHENTICATION_FAILED,
    RATE_LIMIT_EXCEEDED,
    MESSAGE_SIZE_EXCEEDED,
    INVALID_COMMAND_TYPE,
    PARAMETER_VALIDATION_FAILED,
    PATH_TRAVERSAL_ATTEMPT,
    INJECTION_ATTACK_DETECTED,
    SUSPICIOUS_PATTERN_DETECTED
};

// Security event structure
struct SecurityEvent {
    SecurityEventType type;
    std::chrono::steady_clock::time_point timestamp;
    std::string details;
    std::string sourceIP; // Future enhancement

    std::string toString() const;
};

class SecureWebSocketBridge : public juce::ChangeListener,
                              public juce::Thread
{
public:
    SecureWebSocketBridge(AudioEngine& engine);
    ~SecureWebSocketBridge() override;

    // Server management
    bool startServer(int port = 8080);
    void stopServer();
    bool isRunning() const;

    // Change listener for audio engine updates
    void changeListenerCallback(juce::ChangeBroadcaster* source) override;

    // Security management
    std::string generateAuthToken(const std::string& userId, const std::vector<std::string>& permissions);
    bool validateAuthToken(const std::string& token);
    void revokeToken(const std::string& token);

    // Security monitoring
    std::vector<SecurityEvent> getSecurityEvents(int maxEvents = 100) const;
    void clearSecurityEvents();

    // Configuration
    void setMaxMessageSize(size_t maxSize);
    void setRateLimitParams(int messagesPerMinute, int messagesPerSecond);

protected:
    void run() override;

private:
    AudioEngine& audioEngine;
    std::unique_ptr<juce::WebSocketServer> server;
    std::unique_ptr<juce::WebSocket> clientConnection;
    bool serverRunning = false;

    // ============================================================================
    // SECURITY COMPONENTS - GREEN PHASE IMPLEMENTATION
    // ============================================================================

    // Authentication & Authorization
    std::map<std::string, AuthToken> activeTokens;
    std::string currentConnectionToken;
    mutable std::mutex authMutex;

    // Rate Limiting
    RateLimitTracker rateLimiter;
    mutable std::mutex rateLimitMutex;

    // Security Monitoring
    std::vector<SecurityEvent> securityEvents;
    mutable std::mutex eventsMutex;

    // Connection Security
    std::string connectionId;
    std::chrono::steady_clock::time_point connectionTime;
    int failedAuthAttempts = 0;
    std::chrono::steady_clock::time_point lastFailedAttempt;

    // Message validation
    std::unordered_set<std::string> allowedCommandTypes;
    std::regex safeParameterNameRegex;
    std::regex safePathRegex;

    // Configuration
    size_t maxMessageSize = WebSocketSecurityConfig::MAX_MESSAGE_SIZE;
    int maxMessagesPerMinute = WebSocketSecurityConfig::MAX_MESSAGES_PER_MINUTE;
    int maxMessagesPerSecond = WebSocketSecurityConfig::MAX_MESSAGES_PER_SECOND;

    // ============================================================================
    // CORE SECURITY METHODS
    // ============================================================================

    // Message processing pipeline with security
    bool processIncomingMessage(const std::string& rawMessage);
    bool authenticateConnection(const json& message);
    bool validateMessageSize(const std::string& message);
    bool checkRateLimit();
    bool validateAndSanitizeMessage(const json& message);

    // Input validation and sanitization
    bool isValidCommandType(const std::string& type) const;
    bool sanitizeAndValidateParameters(json& message);
    bool validatePluginPath(const std::string& path) const;
    bool validateParameterName(const std::string& name) const;
    bool validateParameterValue(const json& value) const;

    // Command whitelist enforcement
    std::string sanitizeString(const std::string& input) const;
    bool containsInjectionPatterns(const std::string& input) const;

    // Message handling (secure versions)
    bool handleMessageSecure(const json& message);
    bool handleTransportCommandSecure(const json& message);
    bool handleParameterUpdateSecure(const json& message);
    bool handlePluginLoadSecure(const json& message);
    bool handlePluginUnloadSecure(const json& message);
    bool handleGetAudioDevicesSecure(const json& message);
    bool handleGetLoadedPluginsSecure(const json& message);
    bool handleGetAudioLevelsSecure(const json& message);

    // Security monitoring and logging
    void logSecurityEvent(SecurityEventType type, const std::string& details);
    bool detectSuspiciousPattern() const;

    // Original message handling (for comparison)
    void handleMessage(const json& message);
    void sendResponse(const json& response);

    // Command handlers (original implementations)
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
    json createErrorResponse(const std::string& error) const;
    json createSuccessResponse(const std::string& message = "") const;
    json createAuthRequiredResponse() const;
    json createSecurityErrorResponse(const std::string& securityError) const;

    // Utility methods
    void sendResponse(const json& response, bool isAuthenticated = false);
    void broadcastAudioLevels();
    std::string generateSecureToken() const;
    bool isBanned() const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SecureWebSocketBridge)
};