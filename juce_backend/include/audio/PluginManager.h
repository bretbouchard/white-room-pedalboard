#pragma once

#include "JuceHeader.h"
#include <memory>
#include <atomic>
#include <mutex>
#include <vector>
#include <unordered_map>
#include <chrono>
#include <filesystem>
#include <fstream>

// OpenSSL is not available on iOS - use CommonCrypto for iOS
#if defined(__IPHONE_OS__) || defined(__IOS__)
    #include <CommonCrypto/CommonDigest.h>
    #include <Security/Security.h>
#else
    #include <openssl/evp.h>
    #include <openssl/sha.h>
    #include <openssl/pem.h>
    #include <openssl/x509.h>
#endif

namespace SchillingerEcosystem {
namespace Audio {

/**
 * SECURE PLUGIN MANAGER
 *
 * Critical security implementation for safe plugin loading and execution.
 * This class provides comprehensive security measures to prevent arbitrary
 * code execution, privilege escalation, and system compromise through plugins.
 *
 * SECURITY FEATURES IMPLEMENTED:
 * 1. Strict path validation and whitelist enforcement
 * 2. Cryptographic signature verification with X.509 certificates
 * 3. Plugin integrity validation using SHA-256 hashing
 * 4. Comprehensive sandboxing with resource limits
 * 5. Permission system with granular access controls
 * 6. Detailed security logging and monitoring
 * 7. Plugin quarantine system for unverified plugins
 * 8. Runtime behavior monitoring and anomaly detection
 */

class PluginManager
{
public:
    //==============================================================================
    // Plugin security levels
    enum class SecurityLevel
    {
        Untrusted,       // No privileges, full sandbox
        Minimal,         // Basic audio processing only
        Standard,        // Normal plugin privileges
        Privileged,      // Extended privileges (signed by trusted CA)
        System           // System-level plugins (maximum security validation)
    };

    // Plugin verification status
    enum class VerificationStatus
    {
        NotVerified,     // Not yet verified
        Verified,        // Successfully verified
        VerificationFailed,  // Verification failed
        Quarantined,     // Plugin quarantined for security reasons
        Blacklisted      // Plugin explicitly blacklisted
    };

    // Plugin execution context
    enum class ExecutionContext
    {
        Sandbox,         // Full sandbox isolation
        Restricted,      // Restricted access
        Monitored,       // Monitored execution
        Unrestricted     // No restrictions (system plugins only)
    };

    // Security event types
    enum class SecurityEventType
    {
        PluginLoad,      // Plugin loaded
        VerificationFailed,   // Verification failed
        SecurityViolation,    // Security rule violation
        ResourceExhaustion,   // Resource limit exceeded
        AnomalousBehavior,    // Suspicious behavior detected
        QuarantineAction,     // Plugin quarantined
        BlacklistAction       // Plugin blacklisted
    };

    //==============================================================================
    // Plugin security policy
    struct SecurityPolicy
    {
        // Path validation settings
        std::vector<std::filesystem::path> allowedPaths;
        std::vector<std::filesystem::path> blockedPaths;
        bool enforcePathValidation = true;
        bool allowNetworkPaths = false;
        bool allowRelativePaths = false;

        // Signature verification settings
        bool requireSignatureVerification = true;
        bool allowSelfSigned = false;
        bool checkCertificateRevocation = true;
        bool validateCertificateChain = true;
        std::vector<std::string> trustedCertificateAuthorities;

        // Integrity validation settings
        bool requireIntegrityCheck = true;
        std::string hashAlgorithm = "SHA256";
        bool maintainWhitelist = true;

        // Sandboxing settings
        ExecutionContext defaultContext = ExecutionContext::Sandbox;
        bool enableSandboxing = true;
        bool enableResourceLimits = true;
        bool enableNetworkIsolation = true;
        bool enableFilesystemIsolation = true;

        // Resource limits
        size_t maxMemoryUsage = 100 * 1024 * 1024;  // 100MB
        size_t maxCpuUsage = 50;                    // 50% CPU
        size_t maxFileDescriptors = 10;
        std::chrono::seconds maxExecutionTime{30};  // 30 seconds
        size_t maxNetworkConnections = 0;           // No network access

        // Logging and monitoring
        bool enableSecurityLogging = true;
        bool enableBehaviorMonitoring = true;
        bool enableAuditLogging = true;
        std::filesystem::path logFilePath;

        // Quarantine settings
        bool enableQuarantine = true;
        std::filesystem::path quarantinePath;
        std::chrono::hours quarantineRetentionTime{24};  // 24 hours
    };

    // Plugin metadata
    struct PluginMetadata
    {
        juce::String pluginId;
        juce::String pluginName;
        juce::String pluginVersion;
        juce::String pluginAuthor;
        juce::String signatureAlgorithm;
        juce::String certificateSubject;
        juce::String certificateIssuer;
        std::chrono::system_clock::time_point signatureTimestamp;
        std::chrono::system_clock::time_point certificateExpiry;
        VerificationStatus verificationStatus = VerificationStatus::NotVerified;
        SecurityLevel securityLevel = SecurityLevel::Untrusted;
        ExecutionContext executionContext = ExecutionContext::Sandbox;
        juce::String fileHash;
        std::filesystem::path filePath;
        size_t fileSize = 0;
        std::chrono::system_clock::time_point lastLoaded;
        int loadCount = 0;
    };

    // Security event log entry
    struct SecurityEvent
    {
        SecurityEventType eventType;
        juce::String pluginId;
        std::chrono::system_clock::time_point timestamp;
        juce::String description;
        juce::String details;
        std::string sourceLocation;
        SecurityLevel securityLevel = SecurityLevel::Untrusted;
        bool requiresAttention = true;
    };

    // Plugin execution statistics
    struct ExecutionStats
    {
        size_t memoryUsage = 0;
        double cpuUsage = 0.0;
        size_t fileDescriptorsUsed = 0;
        size_t networkConnections = 0;
        std::chrono::milliseconds executionTime{0};
        size_t systemCallsMade = 0;
        std::chrono::system_clock::time_point lastActivity;
        bool resourceLimitsExceeded = false;
    };

    //==============================================================================
    // Security listener interface
    class SecurityListener
    {
    public:
        virtual ~SecurityListener() = default;
        virtual void securityEventOccurred(const SecurityEvent& event) = 0;
        virtual void pluginQuarantined(const juce::String& pluginId, const juce::String& reason) = 0;
        virtual void securityViolationDetected(const juce::String& pluginId, const juce::String& violation) = 0;
        virtual void verificationFailed(const juce::String& pluginId, const juce::String& reason) = 0;
    };

    //==============================================================================
    PluginManager();
    explicit PluginManager(const SecurityPolicy& policy);
    ~PluginManager();

    //==============================================================================
    // Initialization and configuration
    bool initialize();
    bool initialize(const SecurityPolicy& policy);
    void shutdown();
    bool isInitialized() const;

    // Security policy management
    void setSecurityPolicy(const SecurityPolicy& policy);
    const SecurityPolicy& getSecurityPolicy() const;

    //==============================================================================
    // CRITICAL: Secure plugin loading with comprehensive security checks
    bool loadPlugin(const std::filesystem::path& pluginPath);
    bool loadPluginWithMetadata(const std::filesystem::path& pluginPath, PluginMetadata& metadata);
    void unloadPlugin(const juce::String& pluginId);
    void unloadAllPlugins();

    // Plugin status and information
    bool isPluginLoaded(const juce::String& pluginId) const;
    std::vector<juce::String> getLoadedPlugins() const;
    PluginMetadata getPluginMetadata(const juce::String& pluginId) const;
    std::vector<PluginMetadata> getAllPluginMetadata() const;

    // Plugin execution with security monitoring
    bool executePlugin(const juce::String& pluginId);
    bool executePluginWithTimeout(const juce::String& pluginId, std::chrono::milliseconds timeout);
    void stopPluginExecution(const juce::String& pluginId);
    bool isPluginExecuting(const juce::String& pluginId) const;
    ExecutionStats getPluginExecutionStats(const juce::String& pluginId) const;

    //==============================================================================
    // SECURITY VERIFICATION METHODS

    // 1. Path validation and whitelist enforcement
    bool validatePluginPath(const std::filesystem::path& path) const;
    bool isPathAllowed(const std::filesystem::path& path) const;
    bool isPathBlocked(const std::filesystem::path& path) const;

    // 2. Cryptographic signature verification
    bool verifyPluginSignature(const std::filesystem::path& pluginPath) const;
    bool verifyCertificateChain(const std::string& certificateData) const;
    bool checkCertificateRevocation(const std::string& certificateData) const;
    bool extractSignatureMetadata(const std::filesystem::path& pluginPath, PluginMetadata& metadata) const;

    // 3. Integrity validation using cryptographic hashing
    bool verifyPluginIntegrity(const std::filesystem::path& pluginPath) const;
    juce::String calculateFileHash(const std::filesystem::path& filePath) const;
    bool isHashInWhitelist(const juce::String& fileHash) const;
    bool updateHashWhitelist(const juce::String& fileHash, const juce::String& pluginId) const;

    // 4. Sandboxing and isolation
    bool createPluginSandbox(const juce::String& pluginId);
    bool enforceResourceLimits(const juce::String& pluginId);
    bool monitorPluginExecution(const juce::String& pluginId);
    void terminatePluginSandbox(const juce::String& pluginId);

    // 5. Permission system and access control
    bool checkPluginPermissions(const juce::String& pluginId, const std::string& operation) const;
    bool grantPluginPermission(const juce::String& pluginId, const std::string& permission);
    bool revokePluginPermission(const juce::String& pluginId, const std::string& permission);
    std::vector<std::string> getPluginPermissions(const juce::String& pluginId) const;

    //==============================================================================
    // SECURITY LOGGING AND MONITORING

    // Security event logging
    void logSecurityEvent(const SecurityEvent& event);
    void logPluginOperation(const juce::String& operation, const juce::String& pluginId, const juce::String& details = {});
    std::vector<SecurityEvent> getSecurityEvents(std::chrono::system_clock::time_point since = {}) const;
    std::vector<SecurityEvent> getSecurityEventsForPlugin(const juce::String& pluginId) const;

    // Security monitoring
    void enableSecurityMonitoring(bool enable);
    bool isSecurityMonitoringEnabled() const;
    void startBehaviorMonitoring(const juce::String& pluginId);
    void stopBehaviorMonitoring(const juce::String& pluginId);

    // Security analytics
    std::vector<SecurityEvent> detectAnomalousBehavior() const;
    bool isPluginBehaviorAnomalous(const juce::String& pluginId) const;
    double calculateSecurityScore() const;

    //==============================================================================
    // QUARANTINE SYSTEM

    // Plugin quarantine operations
    bool quarantinePlugin(const juce::String& pluginId, const juce::String& reason);
    bool releasePluginFromQuarantine(const juce::String& pluginId);
    bool deleteQuarantinedPlugin(const juce::String& pluginId);
    bool isPluginQuarantined(const juce::String& pluginId) const;

    // Quarantine management
    std::vector<juce::String> getQuarantinedPlugins() const;
    std::chrono::system_clock::time_point getQuarantineTime(const juce::String& pluginId) const;
    juce::String getQuarantineReason(const juce::String& pluginId) const;
    void cleanupExpiredQuarantinedPlugins();

    //==============================================================================
    // BLACKLIST MANAGEMENT

    // Plugin blacklist operations
    bool blacklistPlugin(const juce::String& pluginId, const juce::String& reason);
    bool unblacklistPlugin(const juce::String& pluginId);
    bool isPluginBlacklisted(const juce::String& pluginId) const;
    std::vector<juce::String> getBlacklistedPlugins() const;

    //==============================================================================
    // LISTENER MANAGEMENT
    void addSecurityListener(SecurityListener* listener);
    void removeSecurityListener(SecurityListener* listener);
    void clearSecurityListeners();

    //==============================================================================
    // AUDIT AND COMPLIANCE

    // Security audit
    juce::String generateSecurityReport() const;
    juce::String generateComplianceReport() const;
    bool performSecurityAudit() const;
    std::vector<std::string> getSecurityRecommendations() const;

    // Compliance checks
    bool isCompliantWithStandard(const std::string& standard) const;
    std::map<std::string, bool> checkComplianceStandards() const;

    //==============================================================================
    // UTILITY METHODS

    // Security diagnostics
    bool validateSecurityConfiguration() const;
    std::vector<std::string> getSecurityConfigurationIssues() const;
    bool testSecurityControls() const;

    // Plugin verification utilities
    static bool isPluginFormatSupported(const std::filesystem::path& pluginPath);
    static std::string getPluginFormat(const std::filesystem::path& pluginPath);
    static bool isFileSizeValid(const std::filesystem::path& pluginPath, size_t maxSize = 100 * 1024 * 1024);

private:
    //==============================================================================
    // Internal security verification methods
    bool performComprehensiveSecurityCheck(const std::filesystem::path& pluginPath) const;
    bool validatePluginFormat(const std::filesystem::path& pluginPath) const;
    bool scanForMaliciousPatterns(const std::filesystem::path& pluginPath) const;

    // Cryptographic utilities
    bool initializeCryptographyContext() const;
    void cleanupCryptographyContext() const;
    EVP_PKEY* loadPublicKey(const std::string& certificateData) const;
    X509* loadCertificate(const std::string& certificateData) const;

    // Sandbox implementation
    struct SandboxEnvironment;
    std::unique_ptr<SandboxEnvironment> createSandboxForPlugin(const juce::String& pluginId);
    bool configureSandboxLimits(const SandboxEnvironment& sandbox, const SecurityPolicy& policy);

    // Resource monitoring
    struct ResourceMonitor;
    std::unique_ptr<ResourceMonitor> createResourceMonitor(const juce::String& pluginId);
    void updateResourceUsage(const juce::String& pluginId);

    // Internal state management
    void updatePluginMetadata(const juce::String& pluginId, const PluginMetadata& metadata);
    void removePluginMetadata(const juce::String& pluginId);

    //==============================================================================
    // Member variables
    std::atomic<bool> initialized_{false};
    mutable std::mutex securityMutex_;
    mutable std::mutex pluginMutex_;
    mutable std::mutex loggingMutex_;

    SecurityPolicy securityPolicy_;
    std::unordered_map<juce::String, PluginMetadata> loadedPlugins_;
    std::unordered_map<juce::String, std::unique_ptr<SandboxEnvironment>> pluginSandboxes_;
    std::unordered_map<juce::String, std::unique_ptr<ResourceMonitor>> resourceMonitors_;

    std::vector<SecurityEvent> securityEvents_;
    std::unordered_map<juce::String, juce::String> quarantinedPlugins_;
    std::unordered_map<juce::String, juce::String> blacklistedPlugins_;
    std::unordered_set<juce::String> hashWhitelist_;

    juce::ListenerList<SecurityListener> securityListeners_;
    std::atomic<bool> securityMonitoringEnabled_{true};

    // Cryptographic context
    mutable EVP_MD_CTX* hashContext_ = nullptr;
    mutable std::atomic<bool> cryptoInitialized_{false};

    // Security logging
    std::unique_ptr<std::ofstream> securityLogStream_;
    std::filesystem::path securityLogPath_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginManager)
};

//==============================================================================
// Plugin Security Factory
namespace PluginSecurityFactory
{
    std::unique_ptr<PluginManager> createSecurePluginManager();
    std::unique_ptr<PluginManager> createSecurePluginManager(const PluginManager::SecurityPolicy& policy);
    PluginManager::SecurityPolicy createDefaultSecurityPolicy();
    PluginManager::SecurityPolicy createHighSecurityPolicy();
    PluginManager::SecurityPolicy createDevelopmentSecurityPolicy();
}

//==============================================================================
// Utility functions for plugin security
namespace PluginSecurityUtils
{
    bool isValidPluginPath(const std::filesystem::path& path);
    bool isSecureCertificate(const std::string& certificateData);
    juce::String generateSecurePluginId(const std::filesystem::path& pluginPath);
    std::string createSecurityDigest(const std::string& data);
    bool sanitizePluginName(juce::String& name);
    std::filesystem::path getSecurePluginDirectory();
}

} // namespace Audio
} // namespace SchillingerEcosystem