#pragma once

#include "UnifiedEffectInterface.h"
#include "dynamics/DynamicsEffectsChain.h"
#include "../instrument/PluginManager.h"
#include <JuceHeader.h>
#include <vector>
#include <memory>
#include <map>

namespace schill {
namespace effects {

//==============================================================================
// Interchangeable Effect Slot (Internal or External)
//==============================================================================
class InterchangeableEffectSlot {
public:
    enum class PreferredType {
        Auto,           // Try internal first, fall back to external
        InternalOnly,   // Only internal effects
        ExternalOnly,   // Only external plugins
        Hybrid          // Prefer hybrid implementations
    };

    struct SlotConfig {
        std::string effectName;        // "Airwindows Everglade", "FabFilter Pro-Q 3", etc.
        std::string preferredType;     // "auto", "internal", "external"
        bool enabled = true;
        float wetDryMix = 100.0f;
        float outputGain = 0.0f;
        bool bypassed = false;
        std::string presetName;
        std::map<std::string, float> parameters;
        bool supportsAutomation = true;
        bool supportsSidechain = false;
    };

    InterchangeableEffectSlot(int slotIndex, const SlotConfig& config,
                             juce::AudioPluginFormatManager& formatManager);
    ~InterchangeableEffectSlot() = default;

    // Initialization
    bool initialize(double sampleRate, int blockSize);
    bool loadEffect(const std::string& effectName, PreferredType preference = PreferredType::Auto);
    bool loadInternalEffect(const std::string& effectName, const std::string& effectType = "auto");
    bool loadExternalPlugin(const juce::File& pluginFile);
    bool loadExternalByName(const std::string& pluginName);

    // Processing interface
    void processBlock(juce::AudioBuffer<float>& buffer);
    void processStereo(juce::AudioBuffer<float>& leftBuffer, juce::AudioBuffer<float>& rightBuffer);
    void processSidechainInput(const juce::AudioBuffer<float>& sidechainBuffer);

    // Parameter interface
    float getParameter(const std::string& parameterName) const;
    void setParameter(const std::string& parameterName, float value);
    float getParameterNormalized(const std::string& parameterName) const;
    void setParameterNormalized(const std::string& parameterName, float normalizedValue);

    // State management
    void reset();
    void setBypassed(bool bypassed);
    bool isBypassed() const;
    bool isEnabled() const;

    // Configuration
    void setConfig(const SlotConfig& config);
    SlotConfig getConfig() const;

    // Effect information
    std::string getEffectName() const;
    std::string getManufacturer() const;
    UnifiedEffect::Type getEffectType() const;
    UnifiedEffect::EffectCategory getCategory() const;
    bool isInternal() const;
    bool isExternal() const;
    bool isHybrid() const;

    // Capabilities
    bool supportsAutomation() const;
    bool supportsSidechain() const;
    bool supportsTimelineIntegration() const;
    bool supportsAIControl() const;
    bool supportsRealTimeParameterAccess() const;

    // Unique internal effect capabilities
    void enableAutomation(bool enabled);
    void automateParameter(const std::string& parameter, float targetValue, float timeMs);
    void setTransportState(bool isPlaying, double ppqPosition);
    void setSongPosition(double ppqPosition);
    void setTempo(double bpm);

    // MIDI interface
    void processMidiMessage(const juce::MidiMessage& message);
    void setMidiController(int ccNumber, float normalizedValue);

    // Preset management
    bool loadPreset(const std::string& presetName);
    bool savePreset(const std::string& presetName, const std::string& description);
    std::vector<std::string> getAvailablePresets() const;

    // Performance monitoring
    struct SlotStats {
        bool isActive = false;
        bool isProcessing = false;
        float inputLevel = -100.0f;
        float outputLevel = -100.0f;
        float cpuUsage = 0.0f;
        double latency = 0.0;
        UnifiedEffect::EffectInfo effectInfo;
        juce::Time lastUpdate;
        int samplesProcessed = 0;
    };

    SlotStats getStats() const;
    void resetStats();

private:
    int slotIndex;
    SlotConfig currentConfig;
    juce::AudioPluginFormatManager& formatManager;

    std::unique_ptr<UnifiedEffect> currentEffect;
    PreferredType preferredType;

    double sampleRate = 44100.0;
    int samplesPerBlock = 512;
    bool bypassed = false;
    bool enabled = true;

    // Sidechain buffer
    juce::AudioBuffer<float> sidechainBuffer;

    // Parameter smoothing for external plugins
    std::map<std::string, std::unique_ptr<juce::SmoothedValue<float>>> parameterSmoothers;
    bool parameterSmoothingEnabled = true;
    float smoothingTimeMs = 10.0f;

    // Statistics
    SlotStats stats;
    mutable juce::CriticalSection statsMutex;
    int totalSamplesProcessed = 0;
    juce::Time statsResetTime;

    // Effect loading helpers
    bool tryLoadInternal(const std::string& effectName);
    bool tryLoadExternal(const std::string& effectName);
    bool tryLoadHybrid(const std::string& effectName);

    // Parameter smoothing
    void updateParameterSmoothing(const std::string& parameterName, float targetValue);
    void initializeParameterSmoothers();
    void applyParameterSmoothing();

    // Statistics
    void updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);
    float calculateRMSLevel(const juce::AudioBuffer<float>& buffer) const;
};

//==============================================================================
// Interchangeable Effects Chain
//==============================================================================
class InterchangeableEffectsChain {
public:
    enum class ChainMode {
        Series,         // Process effects one after another
        Parallel,       // Process all effects independently and mix
        Hybrid,         // Some effects in series, some in parallel
        MidSide,        // Separate Mid/Side processing chains
        Multichannel    // Different effects per channel
    };

    enum class RoutingMode {
        Linear,         // Linear signal flow
        SendsReturns,   // Send/return routing
        Feedback,       // Feedback loops
        Advanced        // Custom routing matrix
    };

    struct ChainConfig {
        std::string name;
        std::string description;
        ChainMode mode = ChainMode::Series;
        RoutingMode routingMode = RoutingMode::Linear;
        bool enableLatencyCompensation = true;
        bool enableAutoGainCompensation = true;
        float masterOutputGain = 0.0f;
        bool enableSidechainRouting = true;
        bool enableMIDILearn = true;
        bool enableTimelineSync = true;
        std::vector<InterchangeableEffectSlot::SlotConfig> slots;
    };

    InterchangeableEffectsChain();
    ~InterchangeableEffectsChain() = default;

    // Initialization
    bool initialize(const ChainConfig& config, juce::AudioPluginFormatManager& formatManager);
    bool initialize(double sampleRate, int blockSize, juce::AudioPluginFormatManager& formatManager);
    void reset();
    void prepareToPlay(double sampleRate, int blockSize);

    // Processing interface
    void processBlock(juce::AudioBuffer<float>& buffer);
    void processStereo(juce::AudioBuffer<float>& leftBuffer, juce::AudioBuffer<float>& rightBuffer);
    void processMultichannel(juce::AudioBuffer<float>& buffer, int numChannels);
    void processSidechainInput(const std::string& sourceName, const juce::AudioBuffer<float>& sidechainBuffer);

    // Configuration management
    void setConfig(const ChainConfig& config);
    ChainConfig getConfig() const;

    // Slot management
    int addSlot(const InterchangeableEffectSlot::SlotConfig& config);
    bool insertSlot(int slotIndex, const InterchangeableEffectSlot::SlotConfig& config);
    bool removeSlot(int slotIndex);
    bool swapSlots(int slotIndex1, int slotIndex2);
    void clearAllSlots();
    void reorganizeSlots();

    // Slot access
    InterchangeableEffectSlot* getSlot(int slotIndex);
    const InterchangeableEffectSlot* getSlot(int slotIndex) const;
    std::vector<InterchangeableEffectSlot*> getEnabledSlots();
    std::vector<InterchangeableEffectSlot*> getAllSlots();

    // Effect loading by name (interchangeable)
    bool loadEffectInSlot(int slotIndex, const std::string& effectName,
                         InterchangeableEffectSlot::PreferredType preference =
                         InterchangeableEffectSlot::PreferredType::Auto);
    bool loadInternalEffectInSlot(int slotIndex, const std::string& effectName,
                                  const std::string& effectType = "auto");
    bool loadExternalEffectInSlot(int slotIndex, const juce::File& pluginFile);
    bool loadExternalEffectInSlot(int slotIndex, const std::string& pluginName);

    // Chain-wide operations
    void setChainMode(ChainMode mode);
    void setRoutingMode(RoutingMode mode);
    void setMasterOutputGain(float gainDb);
    float getMasterOutputGain() const;

    // Solo/Mute operations
    void setSlotSolo(int slotIndex, bool solo);
    void setSlotMute(int slotIndex, bool mute);
    void clearAllSoloMute();
    bool anySlotSoloed() const;
    std::vector<int> getSoloedSlots() const;
    std::vector<int> getMutedSlots() const;

    // Sidechain routing
    void registerSidechainSource(const std::string& name, std::function<void(juce::AudioBuffer<float>&)> callback);
    void unregisterSidechainSource(const std::string& name);
    std::vector<std::string> getAvailableSidechainSources() const;
    void routeSidechainToSlot(int slotIndex, const std::string& sourceName);

    // Timeline integration (for internal effects)
    void setTransportState(bool isPlaying, double ppqPosition);
    void setSongPosition(double ppqPosition);
    void setTempo(double bpm);

    // MIDI control
    void processMidiMessage(const juce::MidiMessage& message);
    void enableMIDILearn(bool enabled);
    void setGlobalMidiController(int ccNumber, const std::string& parameter, int slotIndex = -1);

    // Preset management
    struct ChainPreset {
        std::string name;
        std::string description;
        std::string category;
        std::vector<InterchangeableEffectSlot::SlotConfig> slotConfigs;
        ChainConfig chainConfig;
        juce::Time creationTime;
        juce::Time lastModified;
        std::string version;
    };

    bool loadChainPreset(const ChainPreset& preset);
    bool saveChainPreset(const std::string& name, const std::string& description);
    std::vector<ChainPreset> getAvailablePresets() const;
    std::vector<ChainPreset> getRecentPresets(int maxCount = 10) const;
    bool deleteChainPreset(const std::string& name);

    // Chain templates
    struct ChainTemplate {
        std::string name;
        std::string description;
        std::vector<InterchangeableEffectSlot::SlotConfig> slotTemplate;
        ChainConfig chainTemplate;
        std::string category;
    };

    std::vector<ChainTemplate> getAvailableTemplates() const;
    bool loadTemplate(const std::string& templateName);
    bool saveTemplate(const std::string& templateName,
                     const std::vector<InterchangeableEffectSlot::SlotConfig>& slotConfigs,
                     const std::string& category);

    // Performance monitoring
    struct ChainStats {
        float inputLevel = -100.0f;
        float outputLevel = -100.0f;
        float totalGainReduction = 0.0f;
        int totalLatency = 0;
        int activeEffects = 0;
        int bypassedEffects = 0;
        int totalEffects = 0;
        int totalCPUUsage = 0;
        long totalSamplesProcessed = 0;
        juce::Time lastUpdate;
        bool isProcessing = false;
        std::vector<InterchangeableEffectSlot::SlotStats> slotStats;
        ChainMode mode;
        RoutingMode routingMode;
        int internalEffectsCount = 0;
        int externalEffectsCount = 0;
        int hybridEffectsCount = 0;
    };

    ChainStats getStats() const;
    void resetStats();

    // Automation and control
    void enableChainAutomation(bool enabled);
    void automateSlotParameter(int slotIndex, const std::string& parameter, float targetValue, float timeMs);
    void automateChainParameter(const std::string& parameter, float targetValue, float timeMs);

    // Latency management
    void setMaximumLatency(int maxLatencyMs);
    int getMaximumLatency() const;
    void enableLatencyCompensation(bool enabled);
    bool isLatencyCompensated() const;
    int calculateTotalLatency() const;

    // Configuration validation
    struct ValidationResult {
        bool isValid = true;
        std::vector<std::string> errors;
        std::vector<std::string> warnings;
    };

    ValidationResult validateConfiguration() const;
    std::vector<std::string> getConfigurationWarnings() const;

    // Undo/Redo support
    struct EditState {
        std::vector<InterchangeableEffectSlot::SlotConfig> slotConfigs;
        ChainConfig chainConfig;
        std::string description;
        juce::Time timestamp;
    };

    void beginEdit(const std::string& description = "");
    void endEdit();
    bool canUndo() const;
    bool canRedo() const;
    void undo();
    void redo();
    std::vector<std::string> getUndoHistory() const;
    std::vector<std::string> getRedoHistory() const;

    // Import/Export
    bool exportChain(const juce::File& file) const;
    bool importChain(const juce::File& file);
    std::string exportChainAsJSON() const;
    bool importChainFromJSON(const std::string& jsonString);

    // UI state management
    struct UIState {
        std::vector<std::string> openSlots;        // Slot UIs that are open
        std::vector<std::string> expandedGroups;   // Expanded parameter groups
        std::string selectedSlot;                  // Currently selected slot
        std::string activeTab;                     // Active UI tab
        std::map<std::string, std::string> slotUICustomizations;
    };

    UIState getUIState() const;
    void setUIState(const UIState& state);

private:
    std::vector<std::unique_ptr<InterchangeableEffectSlot>> slots;
    ChainConfig currentConfig;
    ChainMode chainMode = ChainMode::Series;
    RoutingMode routingMode = RoutingMode::Linear;
    juce::AudioPluginFormatManager* formatManager = nullptr;

    // Processing parameters
    double sampleRate = 44100.0;
    int samplesPerBlock = 512;
    float masterOutputGain = 0.0f;
    bool latencyCompensationEnabled = true;
    bool autoGainCompensationEnabled = true;
    bool sidechainRoutingEnabled = true;
    bool midiLearnEnabled = true;
    bool timelineSyncEnabled = true;

    // Processing buffers
    juce::AudioBuffer<float> parallelBuffer;
    juce::AudioBuffer<float> dryBuffer;
    std::unique_ptr<juce::dsp::MidSideEncoder<float>> msEncoder;
    std::unique_ptr<juce::dsp::MidSideDecoder<float>> msDecoder;

    // Sidechain management
    std::map<std::string, std::function<void(juce::AudioBuffer<float>&)>> sidechainSources;
    std::map<std::string, juce::AudioBuffer<float>> sidechainBuffers;

    // Master gain smoothing
    std::unique_ptr<juce::SmoothedValue<float>> smoothedMasterGain;

    // Statistics
    mutable ChainStats stats;
    mutable juce::CriticalSection statsMutex;
    long totalSamplesProcessed = 0;
    juce::Time statsResetTime;

    // Undo/Redo system
    std::vector<EditState> undoStack;
    std::vector<EditState> redoStack;
    bool isEditing = false;
    static constexpr int maxUndoLevels = 50;

    // Processing methods
    void processSeriesMode(juce::AudioBuffer<float>& buffer);
    void processParallelMode(juce::AudioBuffer<float>& buffer);
    void processHybridMode(juce::AudioBuffer<float>& buffer);
    void processMidSideMode(juce::AudioBuffer<float>& buffer);
    void processMultichannelMode(juce::AudioBuffer<float>& buffer, int numChannels);

    // Sidechain processing
    void processSidechainRouting(juce::AudioBuffer<float>& buffer);
    void updateSidechainBuffers();
    void routeSidechainToSlot(int slotIndex, const std::string& sourceName);

    // Solo/Mute handling
    void updateSoloMuteStates();
    void applySoloMuteToBuffer(juce::AudioBuffer<float>& buffer);

    // Utility methods
    int findNextAvailableSlot() const;
    bool isValidSlotIndex(int slotIndex) const;
    float calculateRMSLevel(const juce::AudioBuffer<float>& buffer) const;
    float calculateCompensationGain(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);
    float calculateLoudness(const juce::AudioBuffer<float>& buffer);
    void applyLoudnessNormalization(juce::AudioBuffer<float>& buffer);
    void updateAutoGain(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);

    // Undo/Redo management
    void saveEditState(const std::string& description);
    void restoreEditState(const EditState& state);
    void clearRedoStack();

    // Import/Export helpers
    bool savePresetToFile(const std::string& filename, const ChainPreset& preset) const;
    bool loadPresetFromFile(const std::string& filename, ChainPreset& preset);
    bool exportToFile(const juce::File& file, const std::string& jsonData) const;
    bool importFromFile(const juce::File& file, std::string& jsonData);
    bool validateJSON(const std::string& jsonString) const;
};

//==============================================================================
// Effect Registry and Discovery
//==============================================================================
class EffectRegistry {
public:
    struct RegisteredEffect {
        std::string name;
        std::string manufacturer;
        UnifiedEffect::Type type;
        UnifiedEffect::EffectCategory category;
        bool isAvailable;
        juce::File pluginFile;        // For external plugins
        std::string internalType;     // For internal effects
        std::string description;
        std::vector<std::string> tags;
    };

    // Registration
    static void registerInternalEffect(const std::string& name,
                                      const std::string& type,
                                      UnifiedEffect::EffectCategory category,
                                      const std::string& description = "");

    static void registerExternalPlugin(const juce::File& pluginFile,
                                     const juce::PluginDescription& description);

    // Discovery
    static std::vector<RegisteredEffect> getAllEffects();
    static std::vector<RegisteredEffect> getEffectsByCategory(UnifiedEffect::EffectCategory category);
    static std::vector<RegisteredEffect> searchEffects(const std::string& query);
    static std::vector<RegisteredEffect> getInternalEffects();
    static std::vector<RegisteredEffect> getExternalEffects();

    // Lookup
    static RegisteredEffect* findEffect(const std::string& name);
    static bool isEffectAvailable(const std::string& name);

    // Scanning
    static void scanExternalPlugins(const std::vector<juce::File>& searchPaths);
    static void scanPluginDirectory(const juce::File& directory);

private:
    static std::map<std::string, RegisteredEffect> registeredEffects;
    static juce::CriticalSection registryMutex;
};

} // namespace effects
} // namespace schill