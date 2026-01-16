#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <unordered_map>
#include <vector>
#include <functional>
#include <mutex>
#include <atomic>

/**
 * @brief Core Instrument Management System
 *
 * Manages loading, instantiation, and lifecycle of all instruments:
 * - Built-in synthesizers (NEX FM, Sam Sampler, LOCAL GAL)
 * - External plugins (VST3, AU, LV2, AAX)
 * - Instance management and state tracking
 * - AI agent integration bridge
 */

namespace SchillingerEcosystem::Instrument {

// Forward declarations
class InstrumentInstance;
class PluginManager;
class InstrumentFactory;

enum class InstrumentType
{
    BuiltInSynthesizer,  // NEX, Sam, LOCAL GAL
    ExternalPlugin,      // VST3, AU, LV2, AAX
    AudioUnit           // macOS Audio Units specifically
};

struct InstrumentInfo
{
    juce::String identifier;        // Unique identifier
    juce::String name;             // Display name
    juce::String category;         // Category (Synth, Sampler, Effects)
    juce::String manufacturer;     // Manufacturer/Developer
    juce::String version;          // Version string
    InstrumentType type;          // Type of instrument
    juce::StringArray formats;     // Supported formats
    juce::String description;      // Description
    bool isInstrument;             // true = instrument, false = effect
    bool hasCustomUI;              // Has specialized UI
    bool supportsMIDI;             // Accepts MIDI input
    int maxVoices;                 // Maximum polyphony (0 = unlimited)
    std::vector<juce::String> tags; // Search/filter tags

    // Audio format info
    int numInputs;                 // Audio input channels
    int numOutputs;                // Audio output channels
    double sampleRate;             // Preferred sample rate
    int blockSize;                 // Preferred buffer size
};

class InstrumentManager
{
public:
    InstrumentManager();
    ~InstrumentManager();

    //==============================================================================
    // INSTRUMENT REGISTRATION
    //==============================================================================

    /**
     * Register a built-in synthesizer
     * @param identifier Unique identifier for the instrument
     * @param factory Function to create instrument instances
     * @param info Instrument metadata
     * @return true if registration successful
     */
    bool registerBuiltInSynth(const juce::String& identifier,
                              std::function<std::unique_ptr<InstrumentInstance>()> factory,
                              const InstrumentInfo& info);

    /**
     * Scan and register external plugins from directories
     * @param directories List of directories to scan
     * @return Scan results with counts
     */
    struct ScanResults
    {
        int pluginsFound = 0;
        int pluginsLoaded = 0;
        int pluginsFailed = 0;
        juce::StringArray errors;
    };

    ScanResults scanExternalPlugins(const juce::StringArray& directories);

    /**
     * Load a specific external plugin
     * @param filePath Path to plugin file
     * @return true if loaded successfully
     */
    bool loadExternalPlugin(const juce::String& filePath);

    //==============================================================================
    // INSTRUMENT DISCOVERY
    //==============================================================================

    /**
     * Get all available instruments
     * @return Vector of instrument information
     */
    std::vector<InstrumentInfo> getAvailableInstruments() const;

    /**
     * Get instruments by category
     * @param category Category filter
     * @return Instruments in category
     */
    std::vector<InstrumentInfo> getInstrumentsByCategory(const juce::String& category) const;

    /**
     * Get instruments by type
     * @param type Instrument type filter
     * @return Instruments of type
     */
    std::vector<InstrumentInfo> getInstrumentsByType(InstrumentType type) const;

    /**
     * Search instruments by name/description
     * @param query Search query
     * @return Matching instruments
     */
    std::vector<InstrumentInfo> searchInstruments(const juce::String& query) const;

    /**
     * Get instrument info by identifier
     * @param identifier Instrument identifier
     * @return Instrument info or nullptr if not found
     */
    std::shared_ptr<InstrumentInfo> getInstrumentInfo(const juce::String& identifier) const;

    //==============================================================================
    // INSTANCE MANAGEMENT
    //==============================================================================

    /**
     * Create an instrument instance
     * @param identifier Instrument identifier
     * @return Instrument instance or nullptr on failure
     */
    std::unique_ptr<InstrumentInstance> createInstance(const juce::String& identifier);

    /**
     * Get all active instances
     * @return Vector of active instances
     */
    std::vector<InstrumentInstance*> getActiveInstances() const;

    /**
     * Get instance count by instrument type
     * @param identifier Instrument identifier
     * @return Number of active instances
     */
    int getInstanceCount(const juce::String& identifier) const;

    /**
     * Check if instrument is loaded and available
     * @param identifier Instrument identifier
     * @return true if available
     */
    bool isInstrumentAvailable(const juce::String& identifier) const;

    //==============================================================================
    // PRESET MANAGEMENT
    //==============================================================================

    /**
     * Save instrument preset
     * @param instance Instrument instance
     * @param name Preset name
     * @param category Preset category
     * @return true if saved successfully
     */
    bool savePreset(InstrumentInstance* instance,
                    const juce::String& name,
                    const juce::String& category = "");

    /**
     * Load instrument preset
     * @param identifier Instrument identifier
     * @param presetName Preset name
     * @return Preset data or empty if not found
     */
    juce::MemoryBlock loadPreset(const juce::String& identifier,
                                const juce::String& presetName);

    /**
     * Get available presets for instrument
     * @param identifier Instrument identifier
     * @return List of preset names
     */
    juce::StringArray getAvailablePresets(const juce::String& identifier) const;

    //==============================================================================
    // AI AGENT INTEGRATION
    //==============================================================================

    /**
     * Register instrument with AI agent system
     * @param identifier Instrument identifier
     * @param agentName Agent name for control
     * @return true if registered successfully
     */
    bool registerWithAIAgent(const juce::String& identifier, const juce::String& agentName);

    /**
     * Get AI agent control interface for instrument
     * @param identifier Instrument identifier
     * @return AI control interface or nullptr
     */
    class AIAgentInterface* getAIAgentInterface(const juce::String& identifier);

    //==============================================================================
    // CONFIGURATION AND SETTINGS
    //==============================================================================

    /**
     * Set global audio configuration
     * @param sampleRate Sample rate
     * @param blockSize Buffer size
     */
    void setAudioConfiguration(double sampleRate, int blockSize);

    /**
     * Get current audio configuration
     * @return Sample rate and block size
     */
    std::pair<double, int> getAudioConfiguration() const;

    /**
     * Set maximum instances per instrument
     * @param identifier Instrument identifier
     * @param maxInstances Maximum instances (0 = unlimited)
     */
    void setMaxInstances(const juce::String& identifier, int maxInstances);

    /**
     * Enable/disable instrument pooling
     * @param enabled Enable pooling
     */
    void setInstrumentPoolingEnabled(bool enabled);

    //==============================================================================
    // MONITORING AND DIAGNOSTICS
    //==============================================================================

    /**
     * Get manager statistics
     */
    struct ManagerStats
    {
        int totalInstruments = 0;
        int builtinSynths = 0;
        int externalPlugins = 0;
        int activeInstances = 0;
        int pooledInstances = 0;
        double cpuUsage = 0.0;
        size_t memoryUsage = 0;
        int loadedPresets = 0;
    };

    ManagerStats getStatistics() const;

    /**
     * Get detailed diagnostic information
     * @return Diagnostic report as JSON
     */
    juce::String getDiagnosticInfo() const;

    /**
     * Validate all registered instruments
     * @return Validation results
     */
    struct ValidationResult
    {
        bool isValid = true;
        juce::StringArray warnings;
        juce::StringArray errors;
        std::vector<juce::String> failedInstruments;
    };

    ValidationResult validateAllInstruments();

private:
    //==============================================================================
    // INTERNAL DATA STRUCTURES
    //==============================================================================

    struct InstrumentEntry
    {
        InstrumentInfo info;
        std::function<std::unique_ptr<InstrumentInstance>()> factory;
        std::unique_ptr<juce::AudioPluginInstance> pluginInstance;
        bool isLoaded = false;
        int maxInstances = 0;
        std::vector<std::weak_ptr<InstrumentInstance>> activeInstances;
    };

    struct PresetEntry
    {
        juce::String instrumentIdentifier;
        juce::String name;
        juce::String category;
        juce::MemoryBlock data;
        juce::Time createdTime;
    };

    //==============================================================================
    // INTERNAL METHODS
    //==============================================================================

    void initializeBuiltInSynths();
    void initializePluginManager();
    void loadPresetsDatabase();
    void savePresetsDatabase();

    bool createPluginInstance(const juce::String& identifier,
                            std::unique_ptr<juce::AudioPluginInstance>& instance);

    void cleanupStaleInstances();
    void updateStatistics() const;

    std::shared_ptr<InstrumentEntry> findInstrumentEntry(const juce::String& identifier) const;
    bool validateInstrumentInfo(const InstrumentInfo& info) const;

    //==============================================================================
    // MEMBER VARIABLES
    //==============================================================================

    mutable std::mutex instrumentMutex;

    // Registered instruments
    std::unordered_map<juce::String, std::shared_ptr<InstrumentEntry>> instruments;

    // Active instances
    std::vector<std::weak_ptr<InstrumentInstance>> activeInstances;

    // Preset management
    std::vector<PresetEntry> presets;
    juce::File presetDirectory;

    // Plugin management
    std::unique_ptr<PluginManager> pluginManager;

    // AI agent integration
    std::unordered_map<juce::String, std::unique_ptr<AIAgentInterface>> aiInterfaces;

    // Configuration
    double currentSampleRate = 44100.0;
    int currentBlockSize = 512;
    bool poolingEnabled = true;

    // Statistics and monitoring
    mutable std::atomic<int> totalInstanceCount{0};
    mutable ManagerStats cachedStats;
    mutable juce::Time lastStatsUpdate;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(InstrumentManager)
};

/**
 * @brief AI Agent Interface for Instrument Control
 *
 * Provides AI agents with high-level control over instruments
 */
class AIAgentInterface
{
public:
    AIAgentInterface(const juce::String& instrumentId, InstrumentManager& manager);
    ~AIAgentInterface();

    struct ParameterInfo
    {
        juce::String address;        // Parameter address
        juce::String name;           // Display name
        float minValue;              // Minimum value
        float maxValue;              // Maximum value
        float defaultValue;          // Default value
        bool isAutomatable;          // Can be automated
        juce::String unit;           // Unit (Hz, %, etc.)
    };

    // Parameter control
    std::vector<ParameterInfo> getAllParameters() const;
    float getParameter(const juce::String& address) const;
    bool setParameter(const juce::String& address, float value);
    bool setParameterSmooth(const juce::String& address, float value, double timeMs);

    // Musical control
    void noteOn(int midiNote, float velocity, int channel = 0);
    void noteOff(int midiNote, float velocity, int channel = 0);
    void allNotesOff(int channel = -1);
    void pitchBend(float value, int channel = 0);
    void controlChange(int controller, float value, int channel = 0);

    // Preset control
    bool loadPreset(const juce::String& presetName);
    bool savePreset(const juce::String& presetName, const juce::String& category = "");
    juce::StringArray getPresets() const;

    // State management
    juce::MemoryBlock getCurrentState() const;
    bool setState(const juce::MemoryBlock& state);

    // Analysis and feedback
    struct AudioAnalysis
    {
        float rmsLevel = 0.0f;
        float peakLevel = 0.0f;
        float spectralCentroid = 0.0f;
        float harmonicContent = 0.0f;
        bool hasActivity = false;
    };

    AudioAnalysis analyzeAudio() const;

    // Performance monitoring
    struct PerformanceInfo
    {
        double cpuUsage = 0.0;
        int activeVoices = 0;
        int voiceCount = 0;
        double averageProcessingTime = 0.0;
    };

    PerformanceInfo getPerformanceInfo() const;

private:
    juce::String instrumentIdentifier;
    InstrumentManager& manager;
    mutable std::mutex controlMutex;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AIAgentInterface)
};

} // namespace SchillingerEcosystem::Instrument