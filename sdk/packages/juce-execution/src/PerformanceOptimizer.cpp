#include "PerformanceOptimizer.h"
#include <algorithm>
#include <fstream>
#include <sstream>

namespace schillinger {
namespace performance {

// ============================================================================
// CrossModuleManager Implementation
// ============================================================================

CrossModuleManager::CrossModuleManager() {
    // Initialize core components
    wizard = std::make_unique<wizard::SchillingerWizard>();
    harmony = std::make_unique<harmony::AdvancedHarmonyAPI>();
    orchestration = std::make_unique<orchestration::OrchestrationAPI>();
}

CrossModuleManager::~CrossModuleManager() {
    stopBackgroundOptimization();
    clearAllCaches();
}

void CrossModuleManager::initialize(OptimizationLevel level) {
    currentOptimizationLevel = level;

    // Configure based on optimization level
    switch (level) {
        case OptimizationLevel::Minimal:
            maxCacheSize = 16 * 1024 * 1024; // 16MB
            break;
        case OptimizationLevel::Standard:
            maxCacheSize = 64 * 1024 * 1024; // 64MB
            break;
        case OptimizationLevel::High:
            maxCacheSize = 256 * 1024 * 1024; // 256MB
            break;
        case OptimizationLevel::Custom:
            // User will set custom values
            break;
    }

    // Initialize core components
    wizard->initialize();
    harmony->initialize();
    orchestration->initialize();

    // Start background optimization
    startBackgroundOptimization();

    // Preload commonly used data
    preloadWizardContent(wizard::SkillLevel::Beginner);
    preloadHarmonyData(harmony::MusicalContext{});
    preloadOrchestrationData(orchestration::Ensemble{});
}

void CrossModuleManager::setOptimizationLevel(OptimizationLevel level) {
    if (level != currentOptimizationLevel) {
        currentOptimizationLevel = level;
        optimizeMemoryUsage();
    }
}

std::string CrossModuleManager::createIntegratedSession(const std::string& userId) {
    std::lock_guard<std::mutex> lock(sessionsMutex);

    // Generate unique session ID
    std::string sessionId = "session_" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count());

    auto session = std::make_unique<IntegratedSession>(sessionId, userId);

    // Initialize session with user-appropriate settings
    if (wizard) {
        auto [userProgress, result] = wizard->getUserProgress(userId);
        if (result.wasOk()) {
            session->wizardProgress = userProgress;
        }
    }

    sessions[sessionId] = std::move(session);
    return sessionId;
}

bool CrossModuleManager::hasIntegratedSession(const std::string& sessionId) const {
    std::lock_guard<std::mutex> lock(sessionsMutex);
    return sessions.find(sessionId) != sessions.end();
}

IntegratedSession* CrossModuleManager::getIntegratedSession(const std::string& sessionId) {
    std::lock_guard<std::mutex> lock(sessionsMutex);
    auto it = sessions.find(sessionId);
    if (it != sessions.end()) {
        it->second->lastAccess = std::chrono::steady_clock::now();
        it->second->accessCount++;
        return it->second.get();
    }
    return nullptr;
}

void CrossModuleManager::cleanupExpiredSessions(std::chrono::minutes maxAge) {
    std::lock_guard<std::mutex> lock(sessionsMutex);

    auto now = std::chrono::steady_clock::now();
    auto it = sessions.begin();

    while (it != sessions.end()) {
        if (now - it->second->lastAccess > maxAge) {
            it = sessions.erase(it);
        } else {
            ++it;
        }
    }
}

void CrossModuleManager::preloadWizardContent(wizard::SkillLevel level) {
    if (!wizard) return;

    // Preload modules for the specified skill level
    auto modules = wizard->getModulesForSkillLevel(level);
    for (const auto& module : modules) {
        cacheWizardModule(module);
    }
}

juce::Result CrossModuleManager::cacheWizardModule(const wizard::LearningModule& module) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    std::string key = "wizard_module_" + std::to_string(module.id);
    auto result = serializeAndCache(module, key, wizardCache);

    if (result.wasOk()) {
        currentCacheSize += wizardCache[key].size;
        updateMemoryStats();
    }

    return result;
}

wizard::LearningModule CrossModuleManager::getCachedWizardModule(int moduleId) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    std::string key = "wizard_module_" + std::to_string(moduleId);
    auto it = wizardCache.find(key);

    if (it != wizardCache.end()) {
        it->second.lastAccess = std::chrono::steady_clock::now();
        it->second.accessCount++;
        cacheHits++;
        return deserializeFromCache<wizard::LearningModule>(key, wizardCache);
    }

    cacheMisses++;
    return wizard::LearningModule{}; // Return empty module if not found
}

void CrossModuleManager::preloadHarmonyData(const harmony::MusicalContext& context) {
    if (!harmony) return;

    // Preload common chord progressions
    auto progressions = harmony->getCommonProgressions(context.key, context.scaleType);
    for (const auto& progression : progressions) {
        std::string key = "harmony_progression_" + progression.name;
        cacheHarmonyData(key, progression);
    }
}

juce::Result CrossModuleManager::cacheHarmonyData(const std::string& key, const harmony::ChordProgression& progression) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    std::string fullKey = "harmony_" + key;
    auto result = serializeAndCache(progression, fullKey, harmonyCache);

    if (result.wasOk()) {
        currentCacheSize += harmonyCache[fullKey].size;
        updateMemoryStats();
    }

    return result;
}

harmony::ChordProgression CrossModuleManager::getCachedHarmonyData(const std::string& key) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    std::string fullKey = "harmony_" + key;
    auto it = harmonyCache.find(fullKey);

    if (it != harmonyCache.end()) {
        it->second.lastAccess = std::chrono::steady_clock::now();
        it->second.accessCount++;
        cacheHits++;
        return deserializeFromCache<harmony::ChordProgression>(fullKey, harmonyCache);
    }

    cacheMisses++;
    return harmony::ChordProgression{}; // Return empty progression if not found
}

void CrossModuleManager::preloadOrchestrationData(const orchestration::Ensemble& ensemble) {
    if (!orchestration) return;

    // Preload common instrumentation templates
    auto templates = orchestration->getInstrumentationTemplates(ensemble.style, ensemble.size);
    for (const auto& template_ : templates) {
        std::string key = "orch_template_" + template_.name;
        cacheOrchestrationData(key, template_);
    }
}

juce::Result CrossModuleManager::cacheOrchestrationData(const std::string& key, const orchestration::Instrumentation& instrumentation) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    std::string fullKey = "orchestration_" + key;
    auto result = serializeAndCache(instrumentation, fullKey, orchestrationCache);

    if (result.wasOk()) {
        currentCacheSize += orchestrationCache[fullKey].size;
        updateMemoryStats();
    }

    return result;
}

orchestration::Instrumentation CrossModuleManager::getCachedOrchestrationData(const std::string& key) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    std::string fullKey = "orchestration_" + key;
    auto it = orchestrationCache.find(fullKey);

    if (it != orchestrationCache.end()) {
        it->second.lastAccess = std::chrono::steady_clock::now();
        it->second.accessCount++;
        cacheHits++;
        return deserializeFromCache<orchestration::Instrumentation>(fullKey, orchestrationCache);
    }

    cacheMisses++;
    return orchestration::Instrumentation{}; // Return empty instrumentation if not found
}

juce::Array<CrossModuleManager::Suggestion> CrossModuleManager::generateSuggestions(const SuggestionContext& context) {
    juce::Array<Suggestion> suggestions;

    generateWizardSuggestions(context, suggestions);
    generateHarmonySuggestions(context, suggestions);
    generateOrchestrationSuggestions(context, suggestions);

    // Sort by relevance
    suggestions.sort([](const Suggestion& a, const Suggestion& b) {
        return a.relevance > b.relevance;
    });

    // Limit to top 10 suggestions
    while (suggestions.size() > 10) {
        suggestions.removeLast();
    }

    return suggestions;
}

MemoryStats CrossModuleManager::getMemoryStats() const {
    MemoryStats stats;

    stats.totalAllocated = totalMemoryAllocated.load();
    stats.peakUsage = peakMemoryUsage.load();
    stats.totalCached = currentCacheSize;

    {
        std::lock_guard<std::mutex> lock(cacheMutex);
        stats.wizardCacheSize = wizardCache.size();
        stats.harmonyCacheSize = harmonyCache.size();
        stats.orchestrationCacheSize = orchestrationCache.size();
    }

    {
        std::lock_guard<std::mutex> lock(sessionsMutex);
        stats.activeModules = sessions.size();
    }

    uint64_t hits = cacheHits.load();
    uint64_t misses = cacheMisses.load();
    stats.cacheHitRatio = (hits + misses > 0) ? static_cast<double>(hits) / (hits + misses) : 0.0;

    return stats;
}

void CrossModuleManager::resetMemoryStats() {
    totalMemoryAllocated = 0;
    peakMemoryUsage = 0;
    cacheHits = 0;
    cacheMisses = 0;
}

double CrossModuleManager::getCacheHitRatio() const {
    uint64_t hits = cacheHits.load();
    uint64_t misses = cacheMisses.load();
    return (hits + misses > 0) ? static_cast<double>(hits) / (hits + misses) : 0.0;
}

void CrossModuleManager::clearAllCaches() {
    std::lock_guard<std::mutex> lock(cacheMutex);

    wizardCache.clear();
    harmonyCache.clear();
    orchestrationCache.clear();
    currentCacheSize = 0;

    updateMemoryStats();
}

void CrossModuleManager::optimizeMemoryUsage() {
    std::lock_guard<std::mutex> lock(cacheMutex);

    if (currentCacheSize > maxCacheSize) {
        evictLeastRecentlyUsed();
    }

    cleanupExpiredCacheEntries();
    optimizeCacheDistribution();
}

void CrossModuleManager::setMaxCacheSize(size_t maxSize) {
    maxCacheSize = maxSize;
    optimizeMemoryUsage();
}

void CrossModuleManager::startBackgroundOptimization() {
    if (!backgroundOptimizationRunning.exchange(true)) {
        optimizationThread = std::thread(&CrossModuleManager::backgroundOptimizationLoop, this);
    }
}

void CrossModuleManager::stopBackgroundOptimization() {
    backgroundOptimizationRunning = false;
    if (optimizationThread.joinable()) {
        optimizationThread.join();
    }
}

juce::Result CrossModuleManager::exportSession(const std::string& sessionId, juce::File& targetFile) {
    auto session = getIntegratedSession(sessionId);
    if (!session) {
        return juce::Result::fail("Session not found: " + sessionId);
    }

    // Serialize session data to JSON
    juce::DynamicObject::Ptr sessionData = new juce::DynamicObject();
    sessionData->setProperty("sessionId", session->sessionId);
    sessionData->setProperty("userId", session->userId);
    sessionData->setProperty("wizardProgress", session->wizardProgress.toJSON());
    sessionData->setProperty("harmonyContext", session->harmonyContext.toJSON());
    sessionData->setProperty("orchestration", session->orchestration.toJSON());
    sessionData->setProperty("accessCount", (int64)session->accessCount);
    sessionData->setProperty("memoryFootprint", (int64)session->memoryFootprint);

    auto jsonString = juce::JSON::toString(sessionData);

    // Write to file
    juce::FileOutputStream stream(targetFile);
    if (!stream.openedOk()) {
        return juce::Result::fail("Failed to open target file for writing");
    }

    stream.writeText(jsonString, false, false, nullptr);
    stream.flush();

    return juce::Result::ok();
}

juce::Result CrossModuleManager::importSession(const std::string& sessionId, const juce::File& sourceFile) {
    if (!sourceFile.existsAsFile()) {
        return juce::Result::fail("Source file does not exist");
    }

    juce::FileInputStream stream(sourceFile);
    if (!stream.openedOk()) {
        return juce::Result::fail("Failed to open source file for reading");
    }

    auto content = stream.readEntireFileAsString();
    auto sessionData = juce::JSON::parse(content);

    if (!sessionData.isObject()) {
        return juce::Result::fail("Invalid session file format");
    }

    auto session = std::make_unique<IntegratedSession>(sessionId, sessionData.getProperty("userId", "").toString().toStdString());

    // Restore session data
    auto wizardData = sessionData.getProperty("wizardProgress", juce::var());
    if (wizardData.isObject()) {
        session->wizardProgress = wizard::UserProgress::fromJSON(wizardData);
    }

    auto harmonyData = sessionData.getProperty("harmonyContext", juce::var());
    if (harmonyData.isObject()) {
        session->harmonyContext = harmony::MusicalContext::fromJSON(harmonyData);
    }

    auto orchestraData = sessionData.getProperty("orchestration", juce::var());
    if (orchestraData.isObject()) {
        session->orchestration = orchestration::Ensemble::fromJSON(orchestraData);
    }

    session->accessCount = static_cast<size_t>(sessionData.getProperty("accessCount", 0));
    session->memoryFootprint = static_cast<size_t>(sessionData.getProperty("memoryFootprint", 0));

    // Store the session
    std::lock_guard<std::mutex> lock(sessionsMutex);
    sessions[sessionId] = std::move(session);

    return juce::Result::ok();
}

// Private implementation methods

void CrossModuleManager::updateMemoryStats() const {
    size_t currentUsage = currentCacheSize;

    // Update peak usage if necessary
    size_t expected = currentUsage;
    size_t desired = peakMemoryUsage.load(std::memory_order_relaxed);
    while (expected > desired &&
           !peakMemoryUsage.compare_exchange_weak(desired, expected, std::memory_order_release, std::memory_order_relaxed)) {
        expected = currentUsage;
    }

    totalMemoryAllocated = currentUsage;
}

void CrossModuleManager::cleanupExpiredCacheEntries() {
    auto now = std::chrono::steady_clock::now();
    auto maxAge = std::chrono::hours(1); // Cache entries expire after 1 hour

    auto cleanCache = [&](auto& cache) {
        auto it = cache.begin();
        while (it != cache.end()) {
            if (now - it->second.lastAccess > maxAge) {
                currentCacheSize -= it->second.size;
                it = cache.erase(it);
            } else {
                ++it;
            }
        }
    };

    cleanCache(wizardCache);
    cleanCache(harmonyCache);
    cleanCache(orchestrationCache);
}

void CrossModuleManager::evictLeastRecentlyUsed() {
    // Collect all cache entries with their access times
    struct CacheInfo {
        std::string key;
        std::chrono::steady_clock::time_point lastAccess;
        size_t size;
        enum class Type { Wizard, Harmony, Orchestration } type;
    };

    std::vector<CacheInfo> entries;

    {
        std::lock_guard<std::mutex> lock(cacheMutex);

        for (const auto& [key, entry] : wizardCache) {
            entries.push_back({key, entry.lastAccess, entry.size, CacheInfo::Type::Wizard});
        }
        for (const auto& [key, entry] : harmonyCache) {
            entries.push_back({key, entry.lastAccess, entry.size, CacheInfo::Type::Harmony});
        }
        for (const auto& [key, entry] : orchestrationCache) {
            entries.push_back({key, entry.lastAccess, entry.size, CacheInfo::Type::Orchestration});
        }
    }

    // Sort by last access time (oldest first)
    std::sort(entries.begin(), entries.end(),
              [](const CacheInfo& a, const CacheInfo& b) {
                  return a.lastAccess < b.lastAccess;
              });

    // Evict entries until we're under the cache size limit
    for (const auto& entry : entries) {
        if (currentCacheSize <= maxCacheSize * 0.8) { // Leave 20% headroom
            break;
        }

        std::lock_guard<std::mutex> lock(cacheMutex);

        switch (entry.type) {
            case CacheInfo::Type::Wizard:
                if (auto it = wizardCache.find(entry.key); it != wizardCache.end()) {
                    currentCacheSize -= it->second.size;
                    wizardCache.erase(it);
                }
                break;
            case CacheInfo::Type::Harmony:
                if (auto it = harmonyCache.find(entry.key); it != harmonyCache.end()) {
                    currentCacheSize -= it->second.size;
                    harmonyCache.erase(it);
                }
                break;
            case CacheInfo::Type::Orchestration:
                if (auto it = orchestrationCache.find(entry.key); it != orchestrationCache.end()) {
                    currentCacheSize -= it->second.size;
                    orchestrationCache.erase(it);
                }
                break;
        }
    }
}

void CrossModuleManager::backgroundOptimizationLoop() {
    while (backgroundOptimizationRunning) {
        std::this_thread::sleep_for(std::chrono::minutes(5));

        if (!backgroundOptimizationRunning) break;

        try {
            // Cleanup expired sessions
            cleanupExpiredSessions();

            // Optimize memory usage
            optimizeMemoryUsage();

            // Optimize cache distribution
            optimizeCacheDistribution();
        } catch (const std::exception& e) {
            // Log error but continue running
            juce::Logger::writeToLog("Background optimization error: " + juce::String(e.what()));
        }
    }
}

void CrossModuleManager::optimizeCacheDistribution() {
    auto stats = getMemoryStats();

    // Simple heuristic: if one cache is using more than 60% of total cache space, rebalance
    const double maxCacheShare = 0.6;
    size_t targetShare = maxCacheSize / 3; // Equal distribution among three caches

    auto rebalanceCache = [&](auto& cache, size_t currentSize) {
        if (currentSize > targetShare * maxCacheShare) {
            // This cache is too large, evict some entries
            size_t toEvict = currentSize - targetShare;

            std::vector<std::pair<std::string, std::chrono::steady_clock::time_point>> entries;
            for (const auto& [key, entry] : cache) {
                entries.emplace_back(key, entry.lastAccess);
            }

            std::sort(entries.begin(), entries.end(),
                      [](const auto& a, const auto& b) { return a.second < b.second; });

            size_t evicted = 0;
            for (const auto& [key, _] : entries) {
                if (evicted >= toEvict) break;

                if (auto it = cache.find(key); it != cache.end()) {
                    evicted += it->second.size;
                    currentCacheSize -= it->second.size;
                    cache.erase(it);
                }
            }
        }
    };

    {
        std::lock_guard<std::mutex> lock(cacheMutex);

        size_t wizardSize = 0, harmonySize = 0, orchestrationSize = 0;
        for (const auto& [_, entry] : wizardCache) wizardSize += entry.size;
        for (const auto& [_, entry] : harmonyCache) harmonySize += entry.size;
        for (const auto& [_, entry] : orchestrationCache) orchestrationSize += entry.size;

        rebalanceCache(wizardCache, wizardSize);
        rebalanceCache(harmonyCache, harmonySize);
        rebalanceCache(orchestrationCache, orchestrationSize);
    }
}

void CrossModuleManager::generateWizardSuggestions(const SuggestionContext& context, juce::Array<Suggestion>& suggestions) {
    if (!wizard || !context.suggestTheoryExercises) return;

    // Get user's current progress
    auto [progress, result] = wizard->getUserProgress("");
    if (!result.wasOk()) return;

    // Find next appropriate module
    auto nextModule = wizard->getNextRecommendedModule(progress.currentLevel, progress.completedModules);
    if (nextModule.id > 0) {
        Suggestion suggestion;
        suggestion.type = "wizard_module";
        suggestion.title = nextModule.title;
        suggestion.description = nextModule.description;
        suggestion.action = "load_wizard_module";
        suggestion.parameters = nextModule.toJSON();
        suggestion.relevance = 1.0;

        suggestions.add(suggestion);
    }

    // Add skill assessment suggestion if needed
    if (wizard->shouldAssessSkills(progress)) {
        Suggestion suggestion;
        suggestion.type = "wizard_assessment";
        suggestion.title = "Skill Assessment Recommended";
        suggestion.description = "Take a quick assessment to update your learning path";
        suggestion.action = "conduct_skill_assessment";
        suggestion.relevance = 0.8;

        suggestions.add(suggestion);
    }
}

void CrossModuleManager::generateHarmonySuggestions(const SuggestionContext& context, juce::Array<Suggestion>& suggestions) {
    if (!harmony || !context.suggestPracticalApplications) return;

    // Analyze current harmony context
    if (context.currentHarmony.key.empty()) return;

    // Suggest chord progressions based on user skill level
    auto progressions = harmony->getCommonProgressions(context.currentHarmony.key, context.currentHarmony.scaleType);

    for (const auto& progression : progressions) {
        if (progression.difficulty <= static_cast<int>(context.userLevel) + 1) {
            Suggestion suggestion;
            suggestion.type = "harmony_exercise";
            suggestion.title = "Try this progression: " + progression.name;
            suggestion.description = progression.description;
            suggestion.action = "load_harmony_progression";
            suggestion.parameters = progression.toJSON();
            suggestion.relevance = 1.0 - (progression.difficulty * 0.1);

            suggestions.add(suggestion);
            break; // Add only one suggestion to avoid overwhelming
        }
    }

    // Suggest interference pattern exercises for advanced users
    if (context.userLevel >= wizard::SkillLevel::Advanced) {
        Suggestion suggestion;
        suggestion.type = "harmony_exercise";
        suggestion.title = "Explore Interference Patterns";
        suggestion.description = "Create complex harmonies using rhythmic interference";
        suggestion.action = "explore_interference_patterns";
        suggestion.relevance = 0.7;

        suggestions.add(suggestion);
    }
}

void CrossModuleManager::generateOrchestrationSuggestions(const SuggestionContext& context, juce::Array<Suggestion>& suggestions) {
    if (!orchestration || !context.suggestPracticalApplications) return;

    // Suggest instrumentation based on ensemble size and user skill
    auto templates = orchestration->getInstrumentationTemplates(
        context.currentEnsemble.style,
        context.currentEnsemble.size
    );

    for (const auto& template_ : templates) {
        if (template_.difficulty <= static_cast<int>(context.userLevel) + 1) {
            Suggestion suggestion;
            suggestion.type = "orchestration_tip";
            suggestion.title = "Try this instrumentation: " + template_.name;
            suggestion.description = template_.description;
            suggestion.action = "load_instrumentation_template";
            suggestion.parameters = template_.toJSON();
            suggestion.relevance = 0.9;

            suggestions.add(suggestion);
            break; // Add only one suggestion
        }
    }

    // Suggest texture analysis for current ensemble
    if (context.currentEnsemble.instruments.size() > 0) {
        auto analysis = orchestration->analyzeTexture(context.currentEnsemble);

        Suggestion suggestion;
        suggestion.type = "orchestration_tip";
        suggestion.title = "Improve Orchestral Balance";
        suggestion.description = "Current balance: " + juce::String(analysis.balanceScore, 2);
        suggestion.action = "optimize_orchestral_balance";
        suggestion.relevance = 0.8;

        suggestions.add(suggestion);
    }
}

// Template specializations for serialization
template<typename T>
juce::Result CrossModuleManager::serializeAndCache(const T& object, const std::string& key,
                                                   std::unordered_map<std::string, CacheEntry>& cache) {
    try {
        // Convert object to JSON
        juce::var jsonData;
        if constexpr (std::is_same_v<T, wizard::LearningModule>) {
            jsonData = object.toJSON();
        } else if constexpr (std::is_same_v<T, harmony::ChordProgression>) {
            jsonData = object.toJSON();
        } else if constexpr (std::is_same_v<T, orchestration::Instrumentation>) {
            jsonData = object.toJSON();
        }

        // Serialize JSON to binary
        auto jsonString = juce::JSON::toString(jsonData);
        std::vector<uint8_t> data(jsonString.begin(), jsonString.end());

        // Store in cache
        CacheEntry entry;
        entry.data = data;
        entry.size = data.size();
        cache[key] = entry;

        return juce::Result::ok();
    } catch (const std::exception& e) {
        return juce::Result::fail("Serialization failed: " + juce::String(e.what()));
    }
}

template<typename T>
T CrossModuleManager::deserializeFromCache(const std::string& key,
                                           const std::unordered_map<std::string, CacheEntry>& cache) const {
    auto it = cache.find(key);
    if (it == cache.end()) {
        return T{}; // Return empty object
    }

    try {
        // Convert binary data back to JSON
        std::string jsonString(it->second.data.begin(), it->second.data.end());
        auto jsonData = juce::JSON::parse(juce::String(jsonString));

        // Convert JSON back to object
        if constexpr (std::is_same_v<T, wizard::LearningModule>) {
            return wizard::LearningModule::fromJSON(jsonData);
        } else if constexpr (std::is_same_v<T, harmony::ChordProgression>) {
            return harmony::ChordProgression::fromJSON(jsonData);
        } else if constexpr (std::is_same_v<T, orchestration::Instrumentation>) {
            return orchestration::Instrumentation::fromJSON(jsonData);
        }
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Deserialization failed: " + juce::String(e.what()));
    }

    return T{}; // Return empty object on failure
}

// ============================================================================
// PerformanceProfiler Implementation
// ============================================================================

void PerformanceProfiler::startProfile(const std::string& operation) {
    std::lock_guard<std::mutex> lock(profilesMutex);
    activeProfiles[operation] = ProfileData(operation);
}

void PerformanceProfiler::endProfile(const std::string& operation) {
    auto now = std::chrono::steady_clock::now();

    std::lock_guard<std::mutex> lock(profilesMutex);
    auto it = activeProfiles.find(operation);
    if (it != activeProfiles.end()) {
        auto& profile = it->second;
        profile.duration = std::chrono::duration_cast<std::chrono::microseconds>(now - profile.timestamp);

        completedProfiles.add(profile);
        activeProfiles.erase(it);

        // Keep only recent profiles
        if (completedProfiles.size() > 1000) {
            completedProfiles.removeRange(0, completedProfiles.size() - 1000);
        }
    }
}

juce::Array<PerformanceProfiler::ProfileData> PerformanceProfiler::getRecentProfiles(size_t maxCount) const {
    std::lock_guard<std::mutex> lock(profilesMutex);

    juce::Array<ProfileData> recent;
    size_t start = completedProfiles.size() > maxCount ? completedProfiles.size() - maxCount : 0;

    for (size_t i = start; i < completedProfiles.size(); ++i) {
        recent.add(completedProfiles.getReference(static_cast<int>(i)));
    }

    return recent;
}

juce::var PerformanceProfiler::getPerformanceReport() const {
    std::lock_guard<std::mutex> lock(profilesMutex);

    juce::DynamicObject::Ptr report = new juce::DynamicObject();

    // Calculate statistics
    std::unordered_map<std::string, std::vector<ProfileData>> operationProfiles;
    for (const auto& profile : completedProfiles) {
        operationProfiles[profile.operation].push_back(profile);
    }

    juce::DynamicObject::Ptr operationStats = new juce::DynamicObject();

    for (const auto& [operation, profiles] : operationProfiles) {
        if (profiles.empty()) continue;

        // Calculate statistics for this operation
        auto totalDuration = std::accumulate(profiles.begin(), profiles.end(), 0LL,
            [](int64 sum, const ProfileData& p) { return sum + p.duration.count(); });

        auto avgDuration = totalDuration / profiles.size();
        auto minDuration = std::min_element(profiles.begin(), profiles.end(),
            [](const ProfileData& a, const ProfileData& b) { return a.duration < b.duration; })->duration.count();

        auto maxDuration = std::max_element(profiles.begin(), profiles.end(),
            [](const ProfileData& a, const ProfileData& b) { return a.duration < b.duration; })->duration.count();

        juce::DynamicObject::Ptr stats = new juce::DynamicObject();
        stats->setProperty("count", static_cast<int64>(profiles.size()));
        stats->setProperty("avgDurationMicros", static_cast<int64>(avgDuration));
        stats->setProperty("minDurationMicros", static_cast<int64>(minDuration));
        stats->setProperty("maxDurationMicros", static_cast<int64>(maxDuration));

        operationStats->setProperty(operation, stats.get());
    }

    report->setProperty("operationStats", operationStats.get());
    report->setProperty("totalProfiles", static_cast<int64>(completedProfiles.size()));

    return report.get();
}

void PerformanceProfiler::clearProfiles() {
    std::lock_guard<std::mutex> lock(profilesMutex);
    activeProfiles.clear();
    completedProfiles.clear();
}

} // namespace performance
} // namespace schillinger