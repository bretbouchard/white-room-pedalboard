#pragma once

#include <JuceHeader.h>
#include "SchillingerWizard.h"
#include "AdvancedHarmonyAPI.h"
#include "OrchestrationAPI.h"
#include <atomic>
#include <mutex>
#include <memory>
#include <unordered_map>

namespace schillinger {
namespace performance {

/**
 * Performance optimization levels for resource management
 */
enum class OptimizationLevel : uint8_t {
    Minimal = 0,        // Basic functionality, minimal memory usage
    Standard = 1,       // Balanced performance and memory usage
    High = 2,          // Maximum performance, higher memory usage
    Custom = 3         // User-defined optimization settings
};

/**
 * Memory usage statistics for monitoring
 */
struct MemoryStats {
    size_t totalAllocated{0};
    size_t totalCached{0};
    size_t peakUsage{0};
    size_t wizardCacheSize{0};
    size_t harmonyCacheSize{0};
    size_t orchestrationCacheSize{0};
    double cacheHitRatio{0.0};
    int activeModules{0};

    juce::var toJSON() const {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("totalAllocated", (int64)totalAllocated);
        obj->setProperty("totalCached", (int64)totalCached);
        obj->setProperty("peakUsage", (int64)peakUsage);
        obj->setProperty("wizardCacheSize", (int64)wizardCacheSize);
        obj->setProperty("harmonyCacheSize", (int64)harmonyCacheSize);
        obj->setProperty("orchestrationCacheSize", (int64)orchestrationCacheSize);
        obj->setProperty("cacheHitRatio", cacheHitRatio);
        obj->setProperty("activeModules", activeModules);
        return obj.get();
    }
};

/**
 * Integrated session data combining wizard progress, harmony context, and orchestration
 */
struct IntegratedSession {
    std::string sessionId;
    std::string userId;
    wizard::UserProgress wizardProgress;
    harmony::MusicalContext harmonyContext;
    orchestration::Ensemble orchestration;

    // Performance tracking
    std::chrono::steady_clock::time_point lastAccess;
    size_t accessCount{0};
    size_t memoryFootprint{0};

    IntegratedSession() = default;
    IntegratedSession(const std::string& id, const std::string& user)
        : sessionId(id), userId(user), lastAccess(std::chrono::steady_clock::now()) {}
};

/**
 * Cross-module resource manager for optimized memory usage and caching
 */
class CrossModuleManager {
public:
    CrossModuleManager();
    ~CrossModuleManager();

    // Initialization and configuration
    void initialize(OptimizationLevel level = OptimizationLevel::Standard);
    void setOptimizationLevel(OptimizationLevel level);

    // Session management
    std::string createIntegratedSession(const std::string& userId);
    bool hasIntegratedSession(const std::string& sessionId) const;
    IntegratedSession* getIntegratedSession(const std::string& sessionId);
    void cleanupExpiredSessions(std::chrono::minutes maxAge = std::chrono::minutes(30));

    // Wizard integration
    void preloadWizardContent(wizard::SkillLevel level);
    juce::Result cacheWizardModule(const wizard::LearningModule& module);
    wizard::LearningModule getCachedWizardModule(int moduleId);

    // Harmony integration
    void preloadHarmonyData(const harmony::MusicalContext& context);
    juce::Result cacheHarmonyData(const std::string& key, const harmony::ChordProgression& progression);
    harmony::ChordProgression getCachedHarmonyData(const std::string& key);

    // Orchestration integration
    void preloadOrchestrationData(const orchestration::Ensemble& ensemble);
    juce::Result cacheOrchestrationData(const std::string& key, const orchestration::Instrumentation& instrumentation);
    orchestration::Instrumentation getCachedOrchestrationData(const std::string& key);

    // Cross-module intelligent suggestions
    struct SuggestionContext {
        wizard::SkillLevel userLevel{wizard::SkillLevel::Beginner};
        harmony::MusicalContext currentHarmony;
        orchestration::Ensemble currentEnsemble;
        std::string learningGoal;
        bool suggestTheoryExercises{true};
        bool suggestPracticalApplications{true};
    };

    struct Suggestion {
        std::string type; // "wizard_module", "harmony_exercise", "orchestration_tip"
        std::string title;
        std::string description;
        std::string action;
        juce::var parameters;
        double relevance{1.0};

        juce::var toJSON() const {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("type", type);
            obj->setProperty("title", title);
            obj->setProperty("description", description);
            obj->setProperty("action", action);
            obj->setProperty("parameters", parameters);
            obj->setProperty("relevance", relevance);
            return obj.get();
        }
    };

    juce::Array<Suggestion> generateSuggestions(const SuggestionContext& context);

    // Performance monitoring
    MemoryStats getMemoryStats() const;
    void resetMemoryStats();
    double getCacheHitRatio() const;

    // Memory management
    void clearAllCaches();
    void optimizeMemoryUsage();
    void setMaxCacheSize(size_t maxSize);

    // Background optimization
    void startBackgroundOptimization();
    void stopBackgroundOptimization();

    // Export/import for session persistence
    juce::Result exportSession(const std::string& sessionId, juce::File& targetFile);
    juce::Result importSession(const std::string& sessionId, const juce::File& sourceFile);

private:
    // Core components
    std::unique_ptr<wizard::SchillingerWizard> wizard;
    std::unique_ptr<harmony::AdvancedHarmonyAPI> harmony;
    std::unique_ptr<orchestration::OrchestrationAPI> orchestration;

    // Session management
    std::unordered_map<std::string, std::unique_ptr<IntegratedSession>> sessions;
    mutable std::mutex sessionsMutex;

    // Caching systems
    struct CacheEntry {
        std::vector<uint8_t> data;
        std::chrono::steady_clock::time_point lastAccess;
        size_t accessCount{0};
        size_t size{0};

        CacheEntry() : lastAccess(std::chrono::steady_clock::now()) {}
    };

    std::unordered_map<std::string, CacheEntry> wizardCache;
    std::unordered_map<std::string, CacheEntry> harmonyCache;
    std::unordered_map<std::string, CacheEntry> orchestrationCache;
    mutable std::mutex cacheMutex;

    // Performance configuration
    OptimizationLevel currentOptimizationLevel{OptimizationLevel::Standard};
    size_t maxCacheSize{64 * 1024 * 1024}; // 64MB default
    size_t currentCacheSize{0};

    // Performance monitoring
    mutable std::atomic<size_t> totalMemoryAllocated{0};
    mutable std::atomic<size_t> peakMemoryUsage{0};
    mutable std::atomic<uint64_t> cacheHits{0};
    mutable std::atomic<uint64_t> cacheMisses{0};

    // Background optimization
    std::atomic<bool> backgroundOptimizationRunning{false};
    std::thread optimizationThread;

    // Internal methods
    void updateMemoryStats() const;
    void cleanupExpiredCacheEntries();
    void evictLeastRecentlyUsed();

    template<typename T>
    juce::Result serializeAndCache(const T& object, const std::string& key,
                                   std::unordered_map<std::string, CacheEntry>& cache);

    template<typename T>
    T deserializeFromCache(const std::string& key,
                          const std::unordered_map<std::string, CacheEntry>& cache) const;

    // Background optimization thread
    void backgroundOptimizationLoop();
    void optimizeCacheDistribution();

    // Suggestion generation helpers
    void generateWizardSuggestions(const SuggestionContext& context, juce::Array<Suggestion>& suggestions);
    void generateHarmonySuggestions(const SuggestionContext& context, juce::Array<Suggestion>& suggestions);
    void generateOrchestrationSuggestions(const SuggestionContext& context, juce::Array<Suggestion>& suggestions);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CrossModuleManager)
};

/**
 * Performance profiler for detailed analysis
 */
class PerformanceProfiler {
public:
    struct ProfileData {
        std::string operation;
        std::chrono::microseconds duration{0};
        size_t memoryUsage{0};
        std::chrono::steady_clock::time_point timestamp;

        ProfileData(std::string op) : operation(std::move(op)),
                                     timestamp(std::chrono::steady_clock::now()) {}
    };

    PerformanceProfiler() = default;
    ~PerformanceProfiler() = default;

    void startProfile(const std::string& operation);
    void endProfile(const std::string& operation);

    juce::Array<ProfileData> getRecentProfiles(size_t maxCount = 100) const;
    juce::var getPerformanceReport() const;
    void clearProfiles();

    // RAII helper for automatic profiling
    class ScopedProfile {
    public:
        ScopedProfile(PerformanceProfiler& profiler, const std::string& operation)
            : profiler(profiler), operation(operation) {
            profiler.startProfile(operation);
        }

        ~ScopedProfile() {
            profiler.endProfile(operation);
        }

    private:
        PerformanceProfiler& profiler;
        std::string operation;
    };

private:
    std::unordered_map<std::string, ProfileData> activeProfiles;
    juce::Array<ProfileData> completedProfiles;
    mutable std::mutex profilesMutex;
};

} // namespace performance
} // namespace schillinger