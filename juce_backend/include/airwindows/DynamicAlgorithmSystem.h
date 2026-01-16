#pragma once

#include <JuceHeader.h>
#include <memory>
#include <map>
#include <string>
#include <vector>
#include <functional>
#include <mutex>

namespace schill {
namespace airwindows {

//==============================================================================
// Algorithm Specification Structure
//==============================================================================

struct AlgorithmParameter {
    std::string name;
    std::string displayName;
    std::string type;        // "float", "int", "bool", "enum"
    float minValue = 0.0f;
    float maxValue = 1.0f;
    float defaultValue = 0.0f;
    std::string description;
    std::string unit;
    bool automatable = true;
    bool smoothed = true;
};

struct AlgorithmInfo {
    std::string name;
    std::string displayName;
    std::string category;
    std::string description;
    std::string version;
    std::string author;
    std::vector<AlgorithmParameter> parameters;
    int complexity = 1;        // 1=Simple, 2=Medium, 3=Complex
    int popularity = 1;         // 1-10 usage frequency
    bool isImplemented = false;
    std::string specFile;
    std::string implementationFile;
    std::vector<std::string> tags;
    std::string license;
    double cpuUsage = 0.0;     // Estimated CPU usage percentage
    double latency = 0.0;       // Estimated latency in ms
};

//==============================================================================
// Dynamic Algorithm Loader Interface
//==============================================================================

class AlgorithmLoader {
public:
    virtual ~AlgorithmLoader() = default;

    // Load algorithm from disk
    virtual bool load(const std::string& algorithmPath) = 0;

    // Create algorithm instance
    virtual std::unique_ptr<class AirwindowsAlgorithm> createInstance() = 0;

    // Get algorithm information
    virtual AlgorithmInfo getAlgorithmInfo() const = 0;

    // Unload algorithm
    virtual bool unload() = 0;

    // Check if algorithm is loaded
    virtual bool isLoaded() const = 0;

    // Get loader capabilities
    virtual std::vector<std::string> getSupportedFormats() const = 0;

    // Hot reload support
    virtual bool supportsHotReload() const { return false; }
    virtual bool reload() = 0;
};

//==============================================================================
// Template-Based Algorithm Factory
//==============================================================================

class TemplateBasedFactory {
public:
    enum class TemplateType {
        Reverb,
        Dynamics,
        Distortion,
        EQ,
        Modulation,
        Delay,
        Utility,
        Specialized
    };

    // Create algorithm from specification
    static std::unique_ptr<class AirwindowsAlgorithm> create(const AlgorithmInfo& spec);

    // Get template type for category
    static TemplateType getTemplateType(const std::string& category);

    // Validate specification
    static bool validateSpecification(const AlgorithmInfo& spec);

private:
    template<TemplateType Type>
    static std::unique_ptr<class AirwindowsAlgorithm> createFromTemplate(const AlgorithmInfo& spec);
};

//==============================================================================
// Dynamic Algorithm Registry
//==============================================================================

class DynamicAlgorithmRegistry {
public:
    static DynamicAlgorithmRegistry& getInstance();

    // Scan directories for algorithm files
    bool scanDirectory(const std::string& directoryPath);

    // Scan multiple directories
    bool scanDirectories(const std::vector<std::string>& directoryPaths);

    // Load algorithm loader
    bool loadAlgorithm(const std::string& algorithmName, const std::string& path);

    // Unload algorithm
    bool unloadAlgorithm(const std::string& algorithmName);

    // Reload algorithm (hot reload)
    bool reloadAlgorithm(const std::string& algorithmName);

    // Create algorithm instance
    std::unique_ptr<class AirwindowsAlgorithm> createAlgorithm(const std::string& algorithmName);

    // Get algorithm information
    AlgorithmInfo getAlgorithmInfo(const std::string& algorithmName) const;

    // Get all available algorithms
    std::vector<AlgorithmInfo> getAvailableAlgorithms() const;

    // Get loaded algorithms
    std::vector<AlgorithmInfo> getLoadedAlgorithms() const;

    // Search algorithms
    std::vector<AlgorithmInfo> searchAlgorithms(const std::string& query) const;

    // Get algorithms by category
    std::vector<AlgorithmInfo> getAlgorithmsByCategory(const std::string& category) const;

    // Check if algorithm is available
    bool isAlgorithmAvailable(const std::string& algorithmName) const;

    // Get statistics
    struct RegistryStats {
        int totalAlgorithms = 0;
        int loadedAlgorithms = 0;
        int categories = 0;
        double totalCpuUsage = 0.0;
        std::map<std::string, int> algorithmCountByCategory;
        std::map<std::string, bool> loadedStatusByAlgorithm;
    };

    RegistryStats getStatistics() const;

    // Event system for algorithm changes
    using AlgorithmEventCallback = std::function<void(const std::string&, const std::string&)>;
    void addAlgorithmEventListener(const std::string& eventType, AlgorithmEventCallback callback);
    void removeAlgorithmEventListener(const std::string& eventType, AlgorithmEventCallback callback);

    // Hot reloading support
    void enableHotReloading(bool enabled);
    bool isHotReloadingEnabled() const;

    // Error handling
    struct ErrorInfo {
        std::string algorithmName;
        std::string errorType;
        std::string errorMessage;
        juce::Time timestamp;
    };

    using ErrorCallback = std::function<void(const ErrorInfo&)>;
    void setErrorCallback(ErrorCallback callback);

public:
    DynamicAlgorithmRegistry() = default;
    ~DynamicAlgorithmRegistry() = default;

    // Clear all algorithms from registry
    void clear();

private:
    // Internal methods
    bool loadAlgorithmFromSpec(const std::string& specFile);
    bool validateAlgorithmFile(const std::string& filePath);
    std::unique_ptr<AlgorithmLoader> createLoaderForFile(const std::string& filePath);

    // Thread safety
    mutable std::mutex registryMutex;

    // Algorithm storage
    std::map<std::string, std::unique_ptr<AlgorithmLoader>> algorithmLoaders;
    std::map<std::string, AlgorithmInfo> algorithmInfoCache;

    // Event listeners
    std::map<std::string, std::vector<AlgorithmEventCallback>> eventListeners;

    // Configuration
    bool hotReloadingEnabled = false;
    ErrorCallback errorCallback;

    // File system monitoring for hot reloading
    // NOTE: JUCE doesn't provide FileWatcher - would need custom implementation
    // Options: Use platform APIs (FSEvents/ReadDirectoryChangesW/inotify) or third-party library (efsw)
    // std::unique_ptr<juce::FileWatcher> fileWatcher;

    void notifyAlgorithmEvent(const std::string& algorithmName, const std::string& eventType);
    void handleError(const std::string& algorithmName, const std::string& errorType, const std::string& message);
};

//==============================================================================
// Algorithm Specification Parser
//==============================================================================

class SpecificationParser {
public:
    // Parse YAML specification
    static std::optional<AlgorithmInfo> parseYAML(const std::string& filePath);

    // Parse JSON specification
    static std::optional<AlgorithmInfo> parseJSON(const std::string& filePath);

    // Validate specification format
    static bool validateFormat(const AlgorithmInfo& spec);

    // Export specification
    static bool exportToYAML(const AlgorithmInfo& spec, const std::string& filePath);
    static bool exportToJSON(const AlgorithmInfo& spec, const std::string& filePath);

private:
    static bool validateParameters(const std::vector<AlgorithmParameter>& parameters);
    static bool validateCategory(const std::string& category);
};

//==============================================================================
// Hot Reloading Manager
//==============================================================================

class HotReloadingManager {
public:
    HotReloadingManager(DynamicAlgorithmRegistry& registry);

    // Enable file watching for hot reloading
    void enableFileWatching(const std::vector<std::string>& watchPaths);

    // Disable file watching
    void disableFileWatching();

    // Check if hot reloading is enabled
    bool isEnabled() const;

    // Force reload of specific algorithm
    bool forceReload(const std::string& algorithmName);

    // Get reloading statistics
    struct ReloadingStats {
        int successfulReloads = 0;
        int failedReloads = 0;
        double totalReloadTime = 0.0;
        std::vector<std::string> recentlyReloaded;
    };

    ReloadingStats getStatistics() const;

private:
    void onFileChanged(const juce::File& file, const juce::String& path);

    DynamicAlgorithmRegistry& registry;
    bool enabled = false;
    // NOTE: FileWatcher not available in JUCE - see note above
    // std::unique_ptr<juce::FileWatcher> fileWatcher;
    ReloadingStats stats;
    std::mutex statsMutex;
};

//==============================================================================
// Performance Monitor
//==============================================================================

class PerformanceMonitor {
public:
    struct PerformanceMetrics {
        double cpuUsage = 0.0;        // CPU percentage
        double totalCpuUsage = 0.0;   // Total CPU usage (for system metrics)
        double memoryUsage = 0.0;      // Memory usage in MB
        double processingTime = 0.0;    // Average processing time per sample
        int instanceCount = 0;
        juce::Time lastUpdate;
    };

    // Monitor algorithm performance
    void monitorAlgorithm(const std::string& algorithmName);

    // Get performance metrics for algorithm
    PerformanceMetrics getMetrics(const std::string& algorithmName) const;

    // Get system-wide metrics
    PerformanceMetrics getSystemMetrics() const;

    // Enable/disable monitoring
    void setEnabled(bool enabled);
    bool isEnabled() const;

    // Set update interval
    void setUpdateInterval(juce::RelativeTime interval);

    // Reset metrics
    void resetMetrics(const std::string& algorithmName);
    void resetAllMetrics();

private:
    void updateMetrics();

    std::map<std::string, PerformanceMetrics> algorithmMetrics;
    PerformanceMetrics systemMetrics;
    bool enabled = false;
    juce::RelativeTime updateInterval = juce::RelativeTime::seconds(1.0);
    juce::Time lastUpdateTime;
    mutable std::mutex metricsMutex;
};

//==============================================================================
// Algorithm Cache
//==============================================================================

class AlgorithmCache {
public:
    // Cache algorithm instances for faster loading
    void cacheAlgorithm(const std::string& algorithmName, std::unique_ptr<AirwindowsAlgorithm> algorithm);

    // Get cached algorithm
    std::unique_ptr<AirwindowsAlgorithm> getCachedAlgorithm(const std::string& algorithmName);

    // Check if algorithm is cached
    bool isCached(const std::string& algorithmName) const;

    // Clear cache
    void clearCache();

    // Set cache size limit
    void setCacheSizeLimit(size_t maxSize);

    // Get cache statistics
    struct CacheStats {
        size_t size = 0;
        size_t maxSize = 0;
        int hitCount = 0;
        int missCount = 0;
        double hitRatio = 0.0;
    };

    CacheStats getStatistics() const;

private:
    void evictOldest();

    std::map<std::string, std::unique_ptr<AirwindowsAlgorithm>> cache;
    size_t maxSizeLimit = 50;
    CacheStats stats;
    mutable std::mutex cacheMutex;
};

//==============================================================================
// Dynamic Algorithm Manager (Main Interface)
//==============================================================================

class DynamicAlgorithmManager {
public:
    DynamicAlgorithmManager();
    ~DynamicAlgorithmManager();

    // Initialize the system
    bool initialize(const std::vector<std::string>& algorithmPaths);

    // Shutdown the system
    void shutdown();

    // Get algorithm registry
    DynamicAlgorithmRegistry& getRegistry();

    // Get performance monitor
    PerformanceMonitor& getPerformanceMonitor();

    // Get cache
    AlgorithmCache& getCache();

    // Create algorithm instance (with caching)
    std::unique_ptr<AirwindowsAlgorithm> createAlgorithm(const std::string& algorithmName);

    // Batch operations
    bool loadMultipleAlgorithms(const std::vector<std::string>& algorithmNames);
    void unloadMultipleAlgorithms(const std::vector<std::string>& algorithmNames);

    // System status
    struct SystemStatus {
        bool initialized = false;
        int loadedAlgorithms = 0;
        int totalAlgorithms = 0;
        double systemCpuUsage = 0.0;
        bool hotReloadingEnabled = false;
        juce::Time lastUpdate;
    };

    SystemStatus getSystemStatus() const;

    // Configuration
    struct Configuration {
        std::vector<std::string> algorithmPaths;
        bool enableHotReloading = true;
        bool enablePerformanceMonitoring = true;
        bool enableCaching = true;
        size_t cacheSize = 50;
        juce::RelativeTime monitoringInterval = juce::RelativeTime::seconds(1.0);
    };

    void configure(const Configuration& config);
    Configuration getConfiguration() const;

    // Emergency operations
    void emergencyUnload(const std::string& algorithmName);
    void emergencyUnloadAll();
    bool emergencyReload(const std::string& algorithmName);

private:
    void setupDefaultPaths();
    void updateSystemStatus();  // Update internal status tracking

    DynamicAlgorithmRegistry registry;
    PerformanceMonitor performanceMonitor;
    AlgorithmCache cache;
    HotReloadingManager hotReloader;
    Configuration config;
    SystemStatus status;
    bool initialized = false;
    std::mutex managerMutex;
};

//==============================================================================
// Utility Classes
//==============================================================================

// Algorithm search utilities
class AlgorithmSearcher {
public:
    struct SearchResult {
        std::string algorithmName;
        std::string displayName;
        float relevanceScore;
        std::vector<std::string> matchedFields;
    };

    static std::vector<SearchResult> search(
        const std::vector<AlgorithmInfo>& algorithms,
        const std::string& query
    );

    static std::vector<SearchResult> searchByCategory(
        const std::vector<AlgorithmInfo>& algorithms,
        const std::string& category
    );

    static std::vector<SearchResult> searchByTags(
        const std::vector<AlgorithmInfo>& algorithms,
        const std::vector<std::string>& tags
    );
};

// Algorithm validator
class AlgorithmValidator {
public:
    struct ValidationReport {
        bool isValid = false;
        std::vector<std::string> errors;
        std::vector<std::string> warnings;
        double qualityScore = 0.0;
        std::vector<std::string> recommendations;
    };

    static ValidationReport validateAlgorithm(const AlgorithmInfo& spec);
    static ValidationReport validateImplementation(const std::string& algorithmName);
    static ValidationReport validatePerformance(const std::string& algorithmName);
};

} // namespace airwindows
} // namespace schill