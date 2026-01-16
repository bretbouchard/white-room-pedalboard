#include "airwindows/DynamicAlgorithmSystem.h"
#include "airwindows/AirwindowsAlgorithms.h"
#include <filesystem>
#include <fstream>
#include <sstream>
#include <algorithm>

namespace schill {
namespace airwindows {

//==============================================================================
// Dynamic Algorithm Registry Implementation
//==============================================================================

DynamicAlgorithmRegistry& DynamicAlgorithmRegistry::getInstance() {
    static DynamicAlgorithmRegistry instance;
    return instance;
}

bool DynamicAlgorithmRegistry::scanDirectory(const std::string& directoryPath) {
    std::lock_guard<std::mutex> lock(registryMutex);

    try {
        std::filesystem::path dir(directoryPath);
        if (!std::filesystem::exists(dir)) {
            handleError("", "DirectoryNotFound", "Directory not found: " + directoryPath);
            return false;
        }

        bool success = true;

        // Scan for YAML specification files
        for (const auto& entry : std::filesystem::directory_iterator(dir)) {
            if (entry.path().extension() == ".yaml" || entry.path().extension() == ".yml") {
                if (loadAlgorithmFromSpec(entry.path().string())) {
                    std::cout << "Loaded algorithm spec: " << entry.path().filename().string() << std::endl;
                } else {
                    success = false;
                }
            }
        }

        // Scan for JSON specification files
        for (const auto& entry : std::filesystem::directory_iterator(dir)) {
            if (entry.path().extension() == ".json") {
                if (loadAlgorithmFromSpec(entry.path().string())) {
                    std::cout << "Loaded algorithm spec: " << entry.path().filename().string() << std::endl;
                } else {
                    success = false;
                }
            }
        }

        return success;

    } catch (const std::exception& e) {
        handleError("", "FileSystemError", std::string("Error scanning directory: ") + e.what());
        return false;
    }
}

bool DynamicAlgorithmRegistry::scanDirectories(const std::vector<std::string>& directoryPaths) {
    bool overallSuccess = true;

    for (const auto& path : directoryPaths) {
        if (!scanDirectory(path)) {
            overallSuccess = false;
        }
    }

    return overallSuccess;
}

bool DynamicAlgorithmRegistry::loadAlgorithm(const std::string& algorithmName, const std::string& path) {
    std::lock_guard<std::mutex> lock(registryMutex);

    // Unload if already loaded
    unloadAlgorithm(algorithmName);

    // Create loader based on file type
    auto loader = createLoaderForFile(path);
    if (!loader) {
        handleError(algorithmName, "UnsupportedFileType", "Cannot create loader for file: " + path);
        return false;
    }

    // Load the algorithm
    if (!loader->load(path)) {
        handleError(algorithmName, "LoadFailed", "Failed to load algorithm from: " + path);
        return false;
    }

    // Store the loader
    algorithmLoaders[algorithmName] = std::move(loader);

    // Cache algorithm info
    auto info = algorithmLoaders[algorithmName]->getAlgorithmInfo();
    algorithmInfoCache[algorithmName] = info;

    // Notify listeners
    notifyAlgorithmEvent(algorithmName, "loaded");

    std::cout << "Successfully loaded algorithm: " << algorithmName << std::endl;
    return true;
}

bool DynamicAlgorithmRegistry::unloadAlgorithm(const std::string& algorithmName) {
    std::lock_guard<std::mutex> lock(registryMutex);

    auto it = algorithmLoaders.find(algorithmName);
    if (it == algorithmLoaders.end()) {
        return false; // Not loaded
    }

    // Unload the loader
    if (!it->second->unload()) {
        handleError(algorithmName, "UnloadFailed", "Failed to unload algorithm");
        return false;
    }

    // Remove from registry
    algorithmLoaders.erase(it);
    algorithmInfoCache.erase(algorithmName);

    // Notify listeners
    notifyAlgorithmEvent(algorithmName, "unloaded");

    std::cout << "Successfully unloaded algorithm: " << algorithmName << std::endl;
    return true;
}

bool DynamicAlgorithmRegistry::reloadAlgorithm(const std::string& algorithmName) {
    if (!hotReloadingEnabled) {
        return false;
    }

    // Get current file path
    auto it = algorithmInfoCache.find(algorithmName);
    if (it == algorithmInfoCache.end()) {
        return false; // Algorithm not found
    }

    std::string filePath = it->second.specFile;

    // Reload
    if (unloadAlgorithm(algorithmName)) {
        return loadAlgorithm(algorithmName, filePath);
    }

    return false;
}

std::unique_ptr<AirwindowsAlgorithm> DynamicAlgorithmRegistry::createAlgorithm(const std::string& algorithmName) {
    std::lock_guard<std::mutex> lock(registryMutex);

    auto it = algorithmLoaders.find(algorithmName);
    if (it == algorithmLoaders.end()) {
        return nullptr;
    }

    return it->second->createInstance();
}

AlgorithmInfo DynamicAlgorithmRegistry::getAlgorithmInfo(const std::string& algorithmName) const {
    std::lock_guard<std::mutex> lock(registryMutex);

    auto it = algorithmInfoCache.find(algorithmName);
    if (it == algorithmInfoCache.end()) {
        return AlgorithmInfo{}; // Return empty info if not found
    }

    return it->second;
}

std::vector<AlgorithmInfo> DynamicAlgorithmRegistry::getAvailableAlgorithms() const {
    std::lock_guard<std::mutex> lock(registryMutex);

    std::vector<AlgorithmInfo> result;
    result.reserve(algorithmInfoCache.size());

    for (const auto& pair : algorithmInfoCache) {
        result.push_back(pair.second);
    }

    return result;
}

std::vector<AlgorithmInfo> DynamicAlgorithmRegistry::getLoadedAlgorithms() const {
    std::lock_guard<std::mutex> lock(registryMutex);

    std::vector<AlgorithmInfo> result;
    result.reserve(algorithmLoaders.size());

    for (const auto& pair : algorithmLoaders) {
        auto it = algorithmInfoCache.find(pair.first);
        if (it != algorithmInfoCache.end()) {
            result.push_back(it->second);
        }
    }

    return result;
}

std::vector<AlgorithmInfo> DynamicAlgorithmRegistry::searchAlgorithms(const std::string& query) const {
    auto allAlgorithms = getAvailableAlgorithms();
    auto searchResults = AlgorithmSearcher::search(allAlgorithms, query);

    // Convert SearchResult to AlgorithmInfo
    std::vector<AlgorithmInfo> results;
    for (const auto& result : searchResults) {
        auto it = algorithmInfoCache.find(result.algorithmName);
        if (it != algorithmInfoCache.end()) {
            results.push_back(it->second);
        }
    }
    return results;
}

std::vector<AlgorithmInfo> DynamicAlgorithmRegistry::getAlgorithmsByCategory(const std::string& category) const {
    auto allAlgorithms = getAvailableAlgorithms();
    auto searchResults = AlgorithmSearcher::searchByCategory(allAlgorithms, category);

    // Convert SearchResult to AlgorithmInfo
    std::vector<AlgorithmInfo> results;
    for (const auto& result : searchResults) {
        auto it = algorithmInfoCache.find(result.algorithmName);
        if (it != algorithmInfoCache.end()) {
            results.push_back(it->second);
        }
    }
    return results;
}

bool DynamicAlgorithmRegistry::isAlgorithmAvailable(const std::string& algorithmName) const {
    std::lock_guard<std::mutex> lock(registryMutex);

    return algorithmLoaders.find(algorithmName) != algorithmLoaders.end();
}

DynamicAlgorithmRegistry::RegistryStats DynamicAlgorithmRegistry::getStatistics() const {
    std::lock_guard<std::mutex> lock(registryMutex);

    RegistryStats stats;
    stats.totalAlgorithms = static_cast<int>(algorithmInfoCache.size());
    stats.loadedAlgorithms = static_cast<int>(algorithmLoaders.size());

    // Calculate category counts
    std::set<std::string> categories;
    for (const auto& pair : algorithmInfoCache) {
        categories.insert(pair.second.category);
        stats.algorithmCountByCategory[pair.second.category]++;
    }

    stats.categories = static_cast<int>(categories.size());

    // Calculate total CPU usage
    stats.totalCpuUsage = 0.0;
    for (const auto& pair : algorithmInfoCache) {
        stats.totalCpuUsage += pair.second.cpuUsage;
    }

    // Create loaded status map
    for (const auto& pair : algorithmLoaders) {
        stats.loadedStatusByAlgorithm[pair.first] = true;
    }
    for (const auto& pair : algorithmInfoCache) {
        if (stats.loadedStatusByAlgorithm.find(pair.first) == stats.loadedStatusByAlgorithm.end()) {
            stats.loadedStatusByAlgorithm[pair.first] = false;
        }
    }

    return stats;
}

void DynamicAlgorithmRegistry::addAlgorithmEventListener(const std::string& eventType, AlgorithmEventCallback callback) {
    std::lock_guard<std::mutex> lock(registryMutex);
    eventListeners[eventType].push_back(callback);
}

void DynamicAlgorithmRegistry::removeAlgorithmEventListener(const std::string& eventType, AlgorithmEventCallback callback) {
    std::lock_guard<std::mutex> lock(registryMutex);

    // NOTE: std::function cannot be compared directly, so we clear all listeners for this event type
    // In a production system, we'd use a unique ID token system for managing listeners
    eventListeners.erase(eventType);
}

void DynamicAlgorithmRegistry::enableHotReloading(bool enabled) {
    hotReloadingEnabled = enabled;
}

bool DynamicAlgorithmRegistry::isHotReloadingEnabled() const {
    return hotReloadingEnabled;
}

void DynamicAlgorithmRegistry::setErrorCallback(ErrorCallback callback) {
    errorCallback = callback;
}

void DynamicAlgorithmRegistry::clear() {
    std::lock_guard<std::mutex> lock(registryMutex);
    algorithmLoaders.clear();
    algorithmInfoCache.clear();
    eventListeners.clear();
}

// Private methods
bool DynamicAlgorithmRegistry::loadAlgorithmFromSpec(const std::string& specFile) {
    if (!validateAlgorithmFile(specFile)) {
        return false;
    }

    std::optional<AlgorithmInfo> spec = SpecificationParser::parseYAML(specFile);
    if (!spec) {
        spec = SpecificationParser::parseJSON(specFile);
    }

    if (!spec) {
        return false;
    }

    // Validate specification
    if (!TemplateBasedFactory::validateSpecification(*spec)) {
        return false;
    }

    // Create algorithm loader
    std::string algorithmName = spec->name;
    // TODO: Implement YAMLAlgorithmLoader and JSONAlgorithmLoader classes
    // For now, we need to create a generic loader
    auto loader = createLoaderForFile(specFile);

    if (!loader || !loader->load(specFile)) {
        return false;
    }

    // Store algorithm info
    algorithmInfoCache[algorithmName] = *spec;
    algorithmLoaders[algorithmName] = std::move(loader);

    // Add specification file path
    algorithmInfoCache[algorithmName].specFile = specFile;

    return true;
}

bool DynamicAlgorithmRegistry::validateAlgorithmFile(const std::string& filePath) {
    std::filesystem::path path(filePath);

    if (!std::filesystem::exists(path)) {
        return false;
    }

    // Check file extension
    std::string extension = path.extension().string();
    return extension == ".yaml" || extension == ".yml" || extension == ".json";
}

std::unique_ptr<AlgorithmLoader> DynamicAlgorithmRegistry::createLoaderForFile(const std::string& filePath) {
    // TODO: Implement YAMLAlgorithmLoader and JSONAlgorithmLoader classes
    // For now, return nullptr to disable algorithm loading
    std::filesystem::path path(filePath);
    std::string extension = path.extension().string();

    if (extension == ".yaml" || extension == ".yml") {
        // return std::make_unique<YAMLAlgorithmLoader>();
        std::cerr << "YAMLAlgorithmLoader not yet implemented" << std::endl;
        return nullptr;
    } else if (extension == ".json") {
        // return std::make_unique<JSONAlgorithmLoader>();
        std::cerr << "JSONAlgorithmLoader not yet implemented" << std::endl;
        return nullptr;
    }

    return nullptr;
}

void DynamicAlgorithmRegistry::notifyAlgorithmEvent(const std::string& algorithmName, const std::string& eventType) {
    auto it = eventListeners.find(eventType);
    if (it != eventListeners.end()) {
        for (const auto& callback : it->second) {
            try {
                callback(algorithmName, eventType);
            } catch (const std::exception& e) {
                // Log error but don't crash
                std::cerr << "Error in algorithm event callback: " << e.what() << std::endl;
            }
        }
    }
}

void DynamicAlgorithmRegistry::handleError(const std::string& algorithmName, const std::string& errorType, const std::string& message) {
    if (errorCallback) {
        ErrorInfo error;
        error.algorithmName = algorithmName;
        error.errorType = errorType;
        error.errorMessage = message;
        error.timestamp = juce::Time::getCurrentTime();
        errorCallback(error);
    }
}

//==============================================================================
// Template-Based Algorithm Factory Implementation
//==============================================================================

std::unique_ptr<AirwindowsAlgorithm> TemplateBasedFactory::create(const AlgorithmInfo& spec) {
    TemplateType type = getTemplateType(spec.category);

    switch (type) {
        case TemplateType::Reverb:
            return createFromTemplate<TemplateType::Reverb>(spec);
        case TemplateType::Dynamics:
            return createFromTemplate<TemplateType::Dynamics>(spec);
        case TemplateType::Distortion:
            return createFromTemplate<TemplateType::Distortion>(spec);
        case TemplateType::EQ:
            return createFromTemplate<TemplateType::EQ>(spec);
        case TemplateType::Modulation:
            return createFromTemplate<TemplateType::Modulation>(spec);
        case TemplateType::Delay:
            return createFromTemplate<TemplateType::Delay>(spec);
        case TemplateType::Utility:
            return createFromTemplate<TemplateType::Utility>(spec);
        case TemplateType::Specialized:
            return createFromTemplate<TemplateType::Specialized>(spec);
        default:
            return nullptr;
    }
}

TemplateBasedFactory::TemplateType TemplateBasedFactory::getTemplateType(const std::string& category) {
    if (category == "Reverb") return TemplateType::Reverb;
    if (category == "Dynamics") return TemplateType::Dynamics;
    if (category == "Distortion") return TemplateType::Distortion;
    if (category == "EQ" || category == "Equalizer") return TemplateType::EQ;
    if (category == "Modulation") return TemplateType::Modulation;
    if (category == "Delay") return TemplateType::Delay;
    if (category == "Utility") return TemplateType::Utility;
    if (category == "Specialized") return TemplateType::Specialized;

    return TemplateType::Utility; // Default
}

bool TemplateBasedFactory::validateSpecification(const AlgorithmInfo& spec) {
    // Validate required fields
    if (spec.name.empty() || spec.category.empty() || spec.displayName.empty()) {
        return false;
    }

    // Validate parameters
    for (const auto& param : spec.parameters) {
        if (param.name.empty() || param.type.empty()) {
            return false;
        }

        // Validate parameter type
        if (param.type != "float" && param.type != "int" && param.type != "bool" && param.type != "enum") {
            return false;
        }

        // Validate range
        if (param.type == "float" || param.type == "int") {
            if (param.minValue > param.maxValue) {
                return false;
            }
            if (param.defaultValue < param.minValue || param.defaultValue > param.maxValue) {
                return false;
            }
        }
    }

    return true;
}

//==============================================================================
// Performance Monitor Implementation
//==============================================================================

void PerformanceMonitor::monitorAlgorithm(const std::string& algorithmName) {
    if (!enabled) {
        return;
    }

    std::lock_guard<std::mutex> lock(metricsMutex);

    auto& metrics = algorithmMetrics[algorithmName];
    metrics.instanceCount++;

    // Update last update time
    metrics.lastUpdate = juce::Time::getCurrentTime();

    // Update system metrics periodically
    if ((juce::Time::getCurrentTime() - lastUpdateTime) >= updateInterval) {
        updateMetrics();
        lastUpdateTime = juce::Time::getCurrentTime();
    }
}

PerformanceMonitor::PerformanceMetrics PerformanceMonitor::getMetrics(const std::string& algorithmName) const {
    std::lock_guard<std::mutex> lock(metricsMutex);

    auto it = algorithmMetrics.find(algorithmName);
    if (it != algorithmMetrics.end()) {
        return it->second;
    }

    return PerformanceMetrics{};
}

PerformanceMonitor::PerformanceMetrics PerformanceMonitor::getSystemMetrics() const {
    std::lock_guard<std::mutex> lock(metricsMutex);
    return systemMetrics;
}

void PerformanceMonitor::setEnabled(bool enabled) {
    this->enabled = enabled;
}

bool PerformanceMonitor::isEnabled() const {
    return enabled;
}

void PerformanceMonitor::setUpdateInterval(juce::RelativeTime interval) {
    updateInterval = interval;
}

void PerformanceMonitor::resetMetrics(const std::string& algorithmName) {
    std::lock_guard<std::mutex> lock(metricsMutex);
    algorithmMetrics[algorithmName] = PerformanceMetrics{};
}

void PerformanceMonitor::resetAllMetrics() {
    std::lock_guard<std::mutex> lock(metricsMutex);
    algorithmMetrics.clear();
    systemMetrics = PerformanceMetrics{};
}

void PerformanceMonitor::updateMetrics() {
    // This is a simplified implementation
    // In a real implementation, this would measure actual CPU and memory usage

    // Update system metrics based on algorithm metrics
    systemMetrics.instanceCount = 0;
    systemMetrics.totalCpuUsage = 0.0;
    systemMetrics.memoryUsage = 0.0;

    for (const auto& pair : algorithmMetrics) {
        systemMetrics.instanceCount += pair.second.instanceCount;
        systemMetrics.totalCpuUsage += pair.second.cpuUsage;
        systemMetrics.memoryUsage += pair.second.memoryUsage;
    }

    systemMetrics.lastUpdate = juce::Time::getCurrentTime();
}

//==============================================================================
// Algorithm Cache Implementation
//==============================================================================

void AlgorithmCache::cacheAlgorithm(const std::string& algorithmName, std::unique_ptr<AirwindowsAlgorithm> algorithm) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    // Check if we need to evict
    if (cache.size() >= maxSizeLimit) {
        evictOldest();
    }

    cache[algorithmName] = std::move(algorithm);
}

std::unique_ptr<AirwindowsAlgorithm> AlgorithmCache::getCachedAlgorithm(const std::string& algorithmName) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    auto it = cache.find(algorithmName);
    if (it != cache.end()) {
        stats.hitCount++;
        return std::move(it->second);
    }

    stats.missCount++;
    return nullptr;
}

bool AlgorithmCache::isCached(const std::string& algorithmName) const {
    std::lock_guard<std::mutex> lock(cacheMutex);
    return cache.find(algorithmName) != cache.end();
}

void AlgorithmCache::clearCache() {
    std::lock_guard<std::mutex> lock(cacheMutex);
    cache.clear();
    stats = CacheStats{};
}

void AlgorithmCache::setCacheSizeLimit(size_t maxSize) {
    std::lock_guard<std::mutex> lock(cacheMutex);
    maxSizeLimit = maxSize;

    // Evict if necessary
    while (cache.size() > maxSizeLimit) {
        evictOldest();
    }
}

AlgorithmCache::CacheStats AlgorithmCache::getStatistics() const {
    std::lock_guard<std::mutex> lock(cacheMutex);

    CacheStats currentStats;
    currentStats.size = cache.size();
    currentStats.maxSize = maxSizeLimit;
    currentStats.hitCount = stats.hitCount;
    currentStats.missCount = stats.missCount;

    int totalRequests = currentStats.hitCount + currentStats.missCount;
    if (totalRequests > 0) {
        currentStats.hitRatio = static_cast<double>(currentStats.hitCount) / totalRequests;
    }

    return currentStats;
}

void AlgorithmCache::evictOldest() {
    if (cache.empty()) return;

    // For simplicity, evict the first item (LRU would be more complex to implement)
    cache.erase(cache.begin());
}

//==============================================================================
// Dynamic Algorithm Manager Implementation
//==============================================================================

DynamicAlgorithmManager::DynamicAlgorithmManager() : hotReloader(registry) {
    setupDefaultPaths();
}

DynamicAlgorithmManager::~DynamicAlgorithmManager() {
    shutdown();
}

bool DynamicAlgorithmManager::initialize(const std::vector<std::string>& algorithmPaths) {
    if (initialized) {
        return true;
    }

    config.algorithmPaths = algorithmPaths;

    // Initialize registry
    bool success = registry.scanDirectories(algorithmPaths);

    // Initialize other components
    performanceMonitor.setEnabled(config.enablePerformanceMonitoring);
    performanceMonitor.setUpdateInterval(config.monitoringInterval);
    cache.setCacheSizeLimit(config.cacheSize);

    // Configure hot reloading
    if (config.enableHotReloading) {
        hotReloader.enableFileWatching(config.algorithmPaths);
        registry.enableHotReloading(true);
    } else {
        registry.enableHotReloading(false);
    }

    initialized = true;
    updateSystemStatus();

    return success;
}

void DynamicAlgorithmManager::shutdown() {
    if (!initialized) {
        return;
    }

    // Unload all algorithms
    registry.clear();

    // Clear cache
    cache.clearCache();

    // Reset metrics
    performanceMonitor.resetAllMetrics();

    initialized = false;
    updateSystemStatus();
}

DynamicAlgorithmRegistry& DynamicAlgorithmManager::getRegistry() {
    return registry;
}

PerformanceMonitor& DynamicAlgorithmManager::getPerformanceMonitor() {
    return performanceMonitor;
}

AlgorithmCache& DynamicAlgorithmManager::getCache() {
    return cache;
}

std::unique_ptr<AirwindowsAlgorithm> DynamicAlgorithmManager::createAlgorithm(const std::string& algorithmName) {
    // First try cache
    auto cached = cache.getCachedAlgorithm(algorithmName);
    if (cached) {
        return cached;
    }

    // Create from registry
    auto algorithm = registry.createAlgorithm(algorithmName);
    if (algorithm) {
        // Cache for future use
        cache.cacheAlgorithm(algorithmName, std::move(algorithm));
        return cache.getCachedAlgorithm(algorithmName);
    }

    return nullptr;
}

bool DynamicAlgorithmManager::loadMultipleAlgorithms(const std::vector<std::string>& algorithmNames) {
    bool allSuccess = true;

    for (const auto& name : algorithmNames) {
        if (!registry.isAlgorithmAvailable(name)) {
            // Try to load from default paths
            bool loaded = false;
            for (const auto& path : config.algorithmPaths) {
                if (registry.loadAlgorithm(name, path + "/" + name + ".yaml")) {
                    loaded = true;
                    break;
                }
            }
            if (!loaded) {
                allSuccess = false;
            }
        }
    }

    updateSystemStatus();
    return allSuccess;
}

void DynamicAlgorithmManager::unloadMultipleAlgorithms(const std::vector<std::string>& algorithmNames) {
    for (const auto& name : algorithmNames) {
        registry.unloadAlgorithm(name);
    }

    updateSystemStatus();
}

DynamicAlgorithmManager::SystemStatus DynamicAlgorithmManager::getSystemStatus() const {
    return status;
}

void DynamicAlgorithmManager::configure(const Configuration& newConfig) {
    config = newConfig;

    // Apply configuration changes
    performanceMonitor.setEnabled(config.enablePerformanceMonitoring);
    performanceMonitor.setUpdateInterval(config.monitoringInterval);
    cache.setCacheSizeLimit(config.cacheSize);

    // Configure hot reloading
    if (config.enableHotReloading) {
        hotReloader.enableFileWatching(config.algorithmPaths);
        registry.enableHotReloading(true);
    } else {
        hotReloader.disableFileWatching();
        registry.enableHotReloading(false);
    }

    updateSystemStatus();
}

DynamicAlgorithmManager::Configuration DynamicAlgorithmManager::getConfiguration() const {
    return config;
}

void DynamicAlgorithmManager::emergencyUnload(const std::string& algorithmName) {
    registry.unloadAlgorithm(algorithmName);
    cache.clearCache();
    updateSystemStatus();
}

void DynamicAlgorithmManager::emergencyUnloadAll() {
    registry.clear();
    cache.clearCache();
    performanceMonitor.resetAllMetrics();
    updateSystemStatus();
}

bool DynamicAlgorithmManager::emergencyReload(const std::string& algorithmName) {
    cache.clearCache(); // Clear cache to force reload

    bool success = registry.reloadAlgorithm(algorithmName);
    updateSystemStatus();
    return success;
}

void DynamicAlgorithmManager::setupDefaultPaths() {
    config.algorithmPaths.push_back("./algorithms");
    config.algorithmPaths.push_back("./user_algorithms");
    config.enableHotReloading = true;
    config.enablePerformanceMonitoring = true;
    config.enableCaching = true;
    config.cacheSize = 50;
    config.monitoringInterval = juce::RelativeTime::seconds(1.0);
}

void DynamicAlgorithmManager::updateSystemStatus() {
    status.initialized = initialized;

    auto registryStats = registry.getStatistics();
    status.loadedAlgorithms = registryStats.loadedAlgorithms;
    status.totalAlgorithms = registryStats.totalAlgorithms;
    status.hotReloadingEnabled = registry.isHotReloadingEnabled();

    auto systemMetrics = performanceMonitor.getSystemMetrics();
    status.systemCpuUsage = systemMetrics.totalCpuUsage;
    status.lastUpdate = juce::Time::getCurrentTime();
}

//==============================================================================
// Algorithm Searcher Implementation
//==============================================================================

std::vector<AlgorithmSearcher::SearchResult> AlgorithmSearcher::search(
    const std::vector<AlgorithmInfo>& algorithms,
    const std::string& query) {

    std::vector<SearchResult> results;
    std::string lowerQuery = query;
    std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);

    for (const auto& algorithm : algorithms) {
        SearchResult result;
        result.algorithmName = algorithm.name;
        result.displayName = algorithm.displayName;
        result.relevanceScore = 0.0f;

        std::vector<std::string> matchedFields;

        // Search in name
        std::string lowerName = algorithm.name;
        std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
        if (lowerName.find(lowerQuery) != std::string::npos) {
            result.relevanceScore += 0.5f;
            matchedFields.push_back("name");
        }

        // Search in display name
        std::string lowerDisplayName = algorithm.displayName;
        std::transform(lowerDisplayName.begin(), lowerDisplayName.end(), lowerDisplayName.begin(), ::tolower);
        if (lowerDisplayName.find(lowerQuery) != std::string::npos) {
            result.relevanceScore += 0.4f;
            matchedFields.push_back("displayName");
        }

        // Search in description
        std::string lowerDescription = algorithm.description;
        std::transform(lowerDescription.begin(), lowerDescription.end(), lowerDescription.begin(), ::tolower);
        if (lowerDescription.find(lowerQuery) != std::string::npos) {
            result.relevanceScore += 0.3f;
            matchedFields.push_back("description");
        }

        // Search in tags
        for (const auto& tag : algorithm.tags) {
            std::string lowerTag = tag;
            std::transform(lowerTag.begin(), lowerTag.end(), lowerTag.begin(), ::tolower);
            if (lowerTag.find(lowerQuery) != std::string::npos) {
                result.relevanceScore += 0.2f;
                matchedFields.push_back("tag");
            }
        }

        // Add to results if any match found
        if (result.relevanceScore > 0.0f) {
            result.matchedFields = matchedFields;
            results.push_back(result);
        }
    }

    // Sort by relevance score (descending)
    std::sort(results.begin(), results.end(),
              [](const SearchResult& a, const SearchResult& b) {
                  return a.relevanceScore > b.relevanceScore;
              });

    return results;
}

std::vector<AlgorithmSearcher::SearchResult> AlgorithmSearcher::searchByCategory(
    const std::vector<AlgorithmInfo>& algorithms,
    const std::string& category) {

    std::vector<SearchResult> results;
    std::string lowerCategory = category;
    std::transform(lowerCategory.begin(), lowerCategory.end(), lowerCategory.begin(), ::tolower);

    for (const auto& algorithm : algorithms) {
        std::string lowerAlgorithmCategory = algorithm.category;
        std::transform(lowerAlgorithmCategory.begin(), lowerAlgorithmCategory.end(), lowerAlgorithmCategory.begin(), ::tolower);

        if (lowerAlgorithmCategory == lowerCategory) {
            SearchResult result;
            result.algorithmName = algorithm.name;
            result.displayName = algorithm.displayName;
            result.relevanceScore = 1.0f;
            result.matchedFields.push_back("category");
            results.push_back(result);
        }
    }

    return results;
}

std::vector<AlgorithmSearcher::SearchResult> AlgorithmSearcher::searchByTags(
    const std::vector<AlgorithmInfo>& algorithms,
    const std::vector<std::string>& tags) {

    std::vector<SearchResult> results;

    for (const auto& algorithm : algorithms) {
        float relevanceScore = 0.0f;
        std::vector<std::string> matchedTags;

        for (const auto& searchTag : tags) {
            std::string lowerSearchTag = searchTag;
            std::transform(lowerSearchTag.begin(), lowerSearchTag.end(), lowerSearchTag.begin(), ::tolower);

            for (const auto& algorithmTag : algorithm.tags) {
                std::string lowerAlgorithmTag = algorithmTag;
                std::transform(lowerAlgorithmTag.begin(), lowerAlgorithmTag.end(), lowerAlgorithmTag.begin(), ::tolower);

                if (lowerAlgorithmTag == lowerSearchTag) {
                    relevanceScore += 1.0f;
                    matchedTags.push_back(algorithmTag);
                    break;
                }
            }
        }

        if (relevanceScore > 0.0f) {
            SearchResult result;
            result.algorithmName = algorithm.name;
            result.displayName = algorithm.displayName;
            result.relevanceScore = relevanceScore;
            result.matchedFields = matchedTags;
            results.push_back(result);
        }
    }

    return results;
}

} // namespace airwindows
} // namespace schill