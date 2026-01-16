#pragma once

#include <JuceHeader.h>
#include "FilterGate.h"
#include "DynamicsProcessor.h"
#include "core/ColorTypes.h"

namespace schill {
namespace dynamics {

//==============================================================================
// Effects Chain Slot Configuration
//==============================================================================

struct EffectsSlot {
    enum class SlotType {
        FilterGate,
        Compressor,
        Limiter,
        Gate,
        Expander,
        DeEsser,
        CharacterProcessor,
        Analyzer,
        Utility
    };

    enum class BypassMode {
        Normal,      // Signal passes through normally
        Bypassed,    // Signal bypasses the effect
        Muted,       // Signal is muted
        Solo         // Only this effect is audible
    };

    struct SlotConfig {
        SlotType type = SlotType::Compressor;
        BypassMode bypassMode = BypassMode::Normal;
        std::string name;
        std::string preset;
        bool enabled = true;
        bool automationEnabled = false;
        float wetDryMix = 100.0f;  // Percentage
        float outputGain = 0.0f;     // dB

        // Color and UI
        DSP::ColorARGB color = DSP::Colors::Blue;
        bool showGUI = true;
        bool showAnalysis = false;

        // Solo/Mute groups
        int soloGroup = -1;           // -1 = no group
        int muteGroup = -1;           // -1 = no group

        // Metadata
        std::string description;
        std::string author;
        juce::Time created;
        juce::Time lastModified;
    };

    SlotConfig() = default;
};

//==============================================================================
// Effects Chain Configuration
//==============================================================================

struct EffectsChainConfig {
    std::vector<SlotConfig> slots;
    std::string name = "Default Chain";
    std::string description;

    // Chain settings
    bool enableSidechain = false;
    bool enableParallel = false;
    bool enableMidSide = false;
    float masterOutputGain = 0.0f;     // dB
    bool enableAutoGain = false;         // Automatic gain compensation
    bool enableLoudnessNormalization = false;

    // Sidechain routing
    std::string sidechainInput;           // Name of sidechain source
    std::vector<int> sidechainRouting;    // Slot indices that use sidechain

    // Automation
    bool automationEnabled = true;
    float automationSmoothing = 50.0f;  // ms

    // Analysis and monitoring
    bool enableAnalysis = false;
    bool enableRealTimeDisplay = true;
    bool enableHistograms = false;

    // Performance
    int maxLatencyMs = 10;              // Maximum allowed latency
    int blockSize = 512;                 // Audio block size
    double sampleRate = 44100.0;         // Sample rate

    // Preset management
    std::string presetDirectory;
    bool autoSavePresets = false;
    int maxAutoSaveHistory = 10;
};

//==============================================================================
// Chain Slot Implementation
//==============================================================================

class ChainSlot {
public:
    ChainSlot(int slotIndex, const SlotConfig& config);
    ~ChainSlot() = default;

    // Initialization
    bool initialize();
    void reset();
    void prepareToPlay(double sampleRate, int samplesPerBlock);

    // Processing
    void processBlock(juce::AudioBuffer<float>& buffer);
    void processSidechain(const juce::AudioBuffer<float>& sidechainBuffer);
    void processStereo(juce::AudioBuffer<float>& leftBuffer, juce::AudioBuffer<float>& rightBuffer);

    // Configuration
    void setConfig(const SlotConfig& config);
    SlotConfig getConfig() const { return currentConfig; }
    void setBypassMode(BypassMode mode);
    BypassMode getBypassMode() const { return currentBypassMode; }
    void setWetDryMix(float mixPercent);
    void setOutputGain(float gainDb);

    // Type-specific configuration
    void setFilterGateConfig(const FilterGateConfig& config);
    FilterGateConfig getFilterGateConfig() const;
    void setCompressorConfig(const CompressorConfig& config);
    CompressorConfig getCompressorConfig() const;
    void setLimiterConfig(const LimiterConfig& config);
    LimiterConfig getLimiterConfig() const;

    // State queries
    bool isEnabled() const { return currentConfig.enabled; }
    bool isBypassed() const { return currentBypassMode != BypassMode::Normal; }
    bool isMuted() const { return currentBypassMode == BypassMode::Muted; }
    bool isSolo() const { return soloActive; }

    // Analysis and monitoring
    struct SlotStats {
        float inputLevel;
        float outputLevel;
        float wetDryMix;
        float outputGain;
        float cpuUsage;
        float latency;
        bool isActive;
        bool hasSidechainInput;
    };

    SlotStats getStats() const;
    void resetStats();

    // Solo/Mute control
    void setSoloGroup(int group);
    int getSoloGroup() const { return currentConfig.soloGroup; }
    void setMuteGroup(int group);
    int getMuteGroup() const { return currentConfig.muteGroup; }

    // Preset management
    bool loadPreset(const std::string& presetName);
    bool savePreset(const std::string& presetName, const std::string& description = "");
    std::vector<std::string> getAvailablePresets() const;

    // MIDI control
    void processMidiMessage(const juce::MidiMessage& message);
    void setMidiController(int ccNumber, float normalizedValue);

    // Automation
    void enableAutomation(bool enabled);
    void automateParameter(const std::string& parameter, float targetValue, float time = 0.0f);

    // Real-time parameter access
    float getParameterValue(const std::string& parameter) const;
    void setParameterValue(const std::string& parameter, float value);

private:
    int slotIndex;
    SlotConfig currentConfig;
    SlotConfig targetConfig;
    BypassMode currentBypassMode = BypassMode::Normal;
    bool soloActive = false;
    bool muteActive = false;
    bool configurationChanged = false;

    // Effect implementations
    std::unique_ptr<FilterGate> filterGate;
    std::unique_ptr<DynamicsProcessor> dynamicsProcessor;

    // Wet/dry mixing
    juce::AudioBuffer<float> dryBuffer;
    juce::AudioBuffer<float> wetBuffer;
    juce::LinearSmoothedValue<float> smoothedWetDryMix;
    juce::LinearSmoothedValue<float> smoothedOutputGain;

    // Crossfading for smooth changes
    bool isCrossfading = false;
    float crossfadeProgress = 0.0f;
    std::unique_ptr<SlotConfig> previousConfig;
    juce::LinearSmoothedValue<float> crossfadeGain;

    // Analysis and monitoring
    SlotStats stats;
    uint64_t samplesProcessed = 0;
    juce::Time statsResetTime;

    // Audio analysis
    std::unique_ptr<juce::dsp::FFT> fft;
    std::vector<float> analysisBuffer;

    // Processing state
    double sampleRate = 44100.0;
    int samplesPerBlock = 512;

    // Internal processing
    void processEffect(juce::AudioBuffer<float>& buffer);
    void processWetDryMix(juce::AudioBuffer<float>& buffer);
    void applyBypassMode(juce::AudioBuffer<float>& buffer);
    void startCrossfade(const SlotConfig& newConfig, float crossfadeTimeMs);
    void updateCrossfade();

    void updateEffectForType();
    void reinitializeEffect();
    void processSidechainForEffect(juce::AudioBuffer<float>& buffer);

    // Analysis
    void updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);
    void analyzeAudio(const juce::AudioBuffer<float>& buffer);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ChainSlot)
};

//==============================================================================
// Main Effects Chain Class
//==============================================================================

class DynamicsEffectsChain {
public:
    DynamicsEffectsChain();
    ~DynamicsEffectsChain();

    // Initialization
    bool initialize(const EffectsChainConfig& config);
    void reset();
    void prepareToPlay(double sampleRate, int samplesPerBlock);

    // Main processing
    void processBlock(juce::AudioBuffer<float>& buffer);
    void processStereo(juce::AudioBuffer<float>& leftBuffer, juce::AudioBuffer<float>& rightBuffer);
    void processMultichannel(juce::AudioBuffer<float>& buffer, int numChannels);

    // Sidechain routing
    void processSidechainInput(const std::string& sourceName, const juce::AudioBuffer<float>& sidechainBuffer);
    void processSidechainInput(const juce::String& sourceName, const float* sidechainData, int numSamples);

    // Chain configuration
    void setConfig(const EffectsChainConfig& config);
    EffectsChainConfig getConfig() const { return currentConfig; }

    // Slot management
    int addSlot(const SlotConfig& config);
    bool removeSlot(int slotIndex);
    bool insertSlot(int slotIndex, const SlotConfig& config);
    bool swapSlots(int slotIndex1, int slotIndex2);
    void clearAllSlots();

    // Slot access
    ChainSlot* getSlot(int slotIndex);
    const ChainSlot* getSlot(int slotIndex) const;
    std::vector<ChainSlot*> getEnabledSlots();
    std::vector<ChainSlot*> getAllSlots();

    // Chain processing modes
    void setProcessingMode(const std::string& mode);
    void enableParallelProcessing(bool enabled);
    void enableMidSideProcessing(bool enabled);

    // Sidechain source management
    void registerSidechainSource(const std::string& name, std::function<void(juce::AudioBuffer<float>&)> callback);
    void unregisterSidechainSource(const std::string& name);
    std::vector<std::string> getAvailableSidechainSources() const;

    // Solo/Mute groups
    void setSoloGroupSolo(int group);
    void setMuteGroupMute(int group);
    void clearAllSoloMuteGroups();
    bool anySlotSoloed() const;

    // Master output
    void setMasterOutputGain(float gainDb);
    float getMasterOutputGain() const;
    void enableAutoGainCompensation(bool enabled);
    void enableLoudnessNormalization(bool enabled);

    // Analysis and monitoring
    struct ChainStats {
        float inputLevel;
        float outputLevel;
        float totalGainReduction;
        float totalLatency;
        int totalCPUUsage;
        int activeEffects;
        int bypassedEffects;
        int totalEffects;
        std::vector<ChainSlot::SlotStats> slotStats;
        double totalSamplesProcessed;
        juce::Time lastUpdate;
        bool isProcessing;
    };

    ChainStats getStats() const;
    void resetStats();
    void updateStats();

    // Preset management
    struct ChainPreset {
        std::string name;
        std::string description;
        std::string author;
        std::vector<SlotConfig> slotConfigs;
        EffectsChainConfig chainConfig;
        juce::Time created;
        juce::Time lastModified;
        std::string version;
    };

    bool loadChainPreset(const std::string& presetName);
    bool saveChainPreset(const std::string& presetName, const std::string& description = "");
    bool deleteChainPreset(const std::string& presetName);
    std::vector<ChainPreset> getAvailablePresets() const;
    std::vector<ChainPreset> getRecentPresets(int maxCount = 10) const;

    // Template management
    struct ChainTemplate {
        std::string name;
        std::string description;
        std::vector<SlotConfig> slotTemplate;
        EffectsChainConfig chainTemplate;
        std::string category;
    };

    std::vector<ChainTemplate> getAvailableTemplates() const;
    bool loadTemplate(const std::string& templateName);
    bool saveTemplate(const std::string& templateName, const std::vector<SlotConfig>& slots, const std::string& category = "");

    // Real-time control
    void processMidiMessage(const juce::MidiMessage& message);
    void setMidiController(const std::string& slotName, const std::string& parameter, int ccNumber);
    void setGlobalMidiController(int ccNumber, const std::string& parameter);

    // Automation
    void enableChainAutomation(bool enabled);
    void automateSlotParameter(int slotIndex, const std::string& parameter, float targetValue, float time = 0.0f);
    void automateChainParameter(const std::string& parameter, float targetValue, float time = 0.0f);

    // Performance optimization
    void setMaximumLatency(int maxLatencyMs);
    int getMaximumLatency() const { return maxLatencyMs; }
    void enableLatencyCompensation(bool enabled);
    bool isLatencyCompensated() const;

    // Error handling and validation
    struct ValidationResult {
        bool isValid = true;
        std::vector<std::string> errors;
        std::vector<std::string> warnings;
    };

    ValidationResult validateConfiguration() const;
    std::vector<std::string> getConfigurationWarnings() const;

    // Copy/paste operations
    bool copySlot(int slotIndex);
    bool pasteSlot(int targetSlotIndex);
    bool canPaste() const;
    void clearClipboard();

    // Undo/redo support
    void beginEdit(const std::string& description);
    void endEdit();
    void undo();
    void redo();
    bool canUndo() const;
    bool canRedo() const;
    std::vector<std::string> getUndoHistory() const;
    std::vector<std::string> getRedoHistory() const;

    // Export/Import
    bool exportChain(const juce::File& file);
    bool importChain(const juce::File& file);
    std::string exportChainAsJSON() const;
    bool importChainFromJSON(const std::string& jsonString);

    // User interface support
    struct UIState {
        std::vector<std::string> openSlots;
        std::vector<std::string> selectedSlots;
        std::string activeAnalysis;
        bool showAdvancedControls = false;
        bool showAnalysis = false;
        juce::Rectangle viewingArea;
    };

    UIState getUIState() const;
    void setUIState(const UIState& state);

private:
    EffectsChainConfig currentConfig;
    std::vector<std::unique_ptr<ChainSlot>> slots;
    std::map<std::string, std::function<void(juce::AudioBuffer<float>&)>> sidechainSources;

    // Processing state
    bool parallelMode = false;
    bool midSideMode = false;
    bool sidechainEnabled = false;
    bool autoGainEnabled = false;
    bool loudnessNormalization = false;
    bool latencyCompensation = false;
    int maxLatencyMs = 10;

    // Master processing
    float masterOutputGain = 0.0f;
    juce::LinearSmoothedValue<float> smoothedMasterGain;

    // Sidechain processing
    std::map<std::string, std::vector<int>> sidechainRouting;
    std::map<std::string, juce::AudioBuffer<float>> sidechainBuffers;

    // Parallel processing
    juce::AudioBuffer<float> parallelBuffer;
    juce::AudioBuffer<float> dryBuffer;

    // Mid/Side processing
    std::unique_ptr<juce::dsp::MidSideEncoder<float>> msEncoder;
    std::unique_ptr<juce::Dsp::MidSideDecoder<float>> msDecoder;

    // Statistics and monitoring
    ChainStats stats;
    uint64_t totalSamplesProcessed = 0;
    juce::Time statsResetTime;

    // Audio analysis
    std::unique_ptr<juce::dsp::FFT> fft;
    std::vector<float> spectrumBuffer;
    std::vector<float> analysisBuffer;

    // Processing state
    double sampleRate = 44100.0;
    int samplesPerBlock = 512;

    // Clipboard operations
    SlotConfig clipboardSlot;
    bool clipboardValid = false;

    // Undo/redo support
    struct EditState {
        std::vector<SlotConfig> slotConfigs;
        EffectsChainConfig chainConfig;
        std::string description;
        juce::Time timestamp;
    };

    std::vector<EditState> undoStack;
    std::vector<EditState> redoStack;
    static constexpr int maxUndoLevels = 50;
    bool isEditing = false;

    // Preset management
    std::string presetDirectory;
    bool autoSavePresets = false;
    int maxAutoSaveHistory = 10;

    // Internal processing
    void processSeriesMode(juce::AudioBuffer<float>& buffer);
    void processParallelMode(juce::AudioBuffer<float>& buffer);
    void processMidSideMode(juce::AudioBuffer<float>& buffer);
    void processSidechainRouting(juce::AudioBuffer<float>& buffer);

    void updateSidechainBuffers();
    void routeSidechainToSlots();
    void applyMasterOutput(juce::AudioBuffer<float>& buffer);

    // Solo/Mute group processing
    void updateSoloMuteStates();
    void applySoloMuteToBuffer(juce::AudioBuffer<float>& buffer);

    // Analysis and monitoring
    void updateStats(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);
    void analyzeFrequencyContent(const juce::AudioBuffer<float>& buffer);
    void calculateChainStatistics();

    // Auto gain compensation
    void updateAutoGain(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);
    float calculateCompensationGain(const juce::AudioBuffer<float>& input, const juce::AudioBuffer<float>& output);

    // Loudness normalization
    float calculateLoudness(const juce::AudioBuffer<float>& buffer);
    void applyLoudnessNormalization(juce::AudioBuffer<float>& buffer);

    // Undo/redo management
    void saveEditState(const std::string& description);
    void restoreEditState(const EditState& state);
    void clearRedoStack();

    // File I/O
    bool savePresetToFile(const std::string& filename, const ChainPreset& preset);
    bool loadPresetFromFile(const std::string& filename, ChainPreset& preset);
    bool exportToFile(const juce::File& file, const std::string& jsonData);
    bool importFromFile(const juce::File& file, std::string& jsonData);

    // Utility methods
    void updateSampleRate(double newSampleRate);
    void updateBlockSize(int newBlockSize);
    int findNextAvailableSlot() const;
    bool isValidSlotIndex(int slotIndex) const;
    void reorganizeSlots();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(DynamicsEffectsChain)
};

//==============================================================================
// Effects Chain Factory
//==============================================================================

class DynamicsEffectsChainFactory {
public:
    static std::unique_ptr<DynamicsEffectsChain> create();

    // Template configurations
    static EffectsChainConfig createVocalChainPreset();
    static EffectsChainConfig createDrumBusPreset();
    static EffectsChainConfig createMasterBusPreset();
    static EffectsChainConfig createMixBusPreset();
    static EffectsChainConfig createBroadcastPreset();
    static EffectsChainConfig createLivePerformancePreset();
    static EffectsChainConfig createStudioPreset();
    static EffectsChainConfig createMinimalPreset();

    // Individual slot presets
    static SlotConfig createVocalCompressorSlot();
    static SlotConfig createDrumCompressorSlot();
    static SlotConfig createBassCompressorSlot();
    static SlotConfig createMasterLimiterSlot();
    static SlotConfig createFilterGateSlot();
    static SlotConfig createExpanderSlot();
    static ChainSlot createSlot(const SlotConfig& config, int index);

    // Template categories
    std::vector<DynamicsEffectsChain::ChainTemplate> getTemplatesByCategory(const std::string& category);
    std::vector<std::string> getAvailableCategories() const;

    // Validation and testing
    static bool validateConfig(const EffectsChainConfig& config);
    static bool testConfiguration(const EffectsChainConfig& config);

    // Import/Export utilities
    static std::string exportConfigAsJSON(const EffectsChainConfig& config);
    static EffectsChainConfig importConfigFromJSON(const std::string& jsonString);
    static bool validateJSON(const std::string& jsonString);
};

} // namespace dynamics
} // namespace schill