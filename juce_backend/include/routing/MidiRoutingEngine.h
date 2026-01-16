#pragma once

#include <JuceHeader.h>
#include <unordered_map>
#include <unordered_set>
#include <memory>
#include <vector>
#include <functional>

namespace schill {
namespace midi {

//==============================================================================
// MIDI Routing Types
//==============================================================================

using RouteID = uint32_t;
static constexpr RouteID INVALID_ROUTE_ID = 0;
static constexpr RouteID BROADCAST_ROUTE_ID = 0xFFFFFFFF;

enum class MidiFilterType {
    None = 0,
    Channel = 1,
    NoteRange = 2,
    VelocityRange = 4,
    MessageType = 8,
    Controller = 16,
    Custom = 32
};

enum class MidiTransformType {
    None = 0,
    Transpose = 1,
    VelocityScale = 2,
    ChannelMap = 4,
    ControllerMap = 8,
    NoteMap = 16,
    Custom = 32
};

//==============================================================================
// MIDI Route Configuration
//==============================================================================

struct MidiRouteConfig {
    std::string name;
    std::string sourceDevice;
    std::string targetInstrument;

    // Filtering
    uint32_t filterMask = 0;
    std::unordered_set<int> allowedChannels;
    std::unordered_set<int> allowedNotes;
    std::pair<int, int> velocityRange = {0, 127};
    std::unordered_set<int> allowedMessageTypes;
    std::unordered_set<int> allowedControllers;
    std::function<bool(const juce::MidiMessage&)> customFilter;

    // Transformation
    uint32_t transformMask = 0;
    int transposeSemi = 0;
    float velocityScale = 1.0f;
    std::unordered_map<int, int> channelMap;
    std::unordered_map<int, int> controllerMap;
    std::unordered_map<int, int> noteMap;
    std::function<juce::MidiMessage(const juce::MidiMessage&)> customTransform;

    // Additional options
    bool allowMidiLearn = true;
    bool recordMidiLearn = false;
    float velocityCurve = 1.0f; // 1.0 = linear, >1.0 = exponential, <1.0 = logarithmic

    MidiRouteConfig() = default;
    MidiRouteConfig(const std::string& routeName, const std::string& source, const std::string& target)
        : name(routeName), sourceDevice(source), targetInstrument(target) {}
};

//==============================================================================
// MIDI Learn Configuration
//==============================================================================

struct MidiLearnConfig {
    std::string parameterName;
    std::string instrumentName;
    int midiCC = -1;
    int midiChannel = -1;
    float minValue = 0.0f;
    float maxValue = 1.0f;
    float currentValue = 0.0f;
    bool isLearning = false;

    // Curve type for mapping
    enum class CurveType {
        Linear,
        Exponential,
        Logarithmic,
        Stepped
    } curveType = CurveType::Linear;

    std::function<float(float)> customMapping;

    MidiLearnConfig() = default;
    MidiLearnConfig(const std::string& param, const std::string& instrument)
        : parameterName(param), instrumentName(instrument) {}
};

//==============================================================================
// MIDI Device Info
//==============================================================================

struct MidiDeviceInfo {
    std::string name;
    std::string identifier;
    bool isInput = true;
    bool isOutput = false;
    bool isActive = false;
    juce::MidiDeviceInfo juceDeviceInfo;

    // Device capabilities
    bool supportsMidi1 = true;
    bool supportsMidi2 = false;
    bool supportsUMP = false;
    int maxChannelCount = 16;

    // Statistics
    uint64_t messagesReceived = 0;
    uint64_t messagesSent = 0;
    uint64_t bytesReceived = 0;
    uint64_t bytesSent = 0;
    juce::Time lastActivity;
};

//==============================================================================
// MIDI Routing Statistics
//==============================================================================

struct MidiRoutingStats {
    uint64_t totalMessagesRouted = 0;
    uint64_t messagesFiltered = 0;
    uint64_t messagesTransformed = 0;
    uint64_t midiLearnEvents = 0;
    uint64_t routesActive = 0;
    double averageLatencyMs = 0.0;
    juce::Time lastUpdate;

    // Per-route statistics
    std::unordered_map<RouteID, uint64_t> routeMessageCounts;
    std::unordered_map<RouteID, double> routeLatencies;

    void reset() {
        totalMessagesRouted = 0;
        messagesFiltered = 0;
        messagesTransformed = 0;
        midiLearnEvents = 0;
        routesActive = 0;
        averageLatencyMs = 0.0;
        lastUpdate = juce::Time::getCurrentTime();
        routeMessageCounts.clear();
        routeLatencies.clear();
    }
};

//==============================================================================
// Forward Declarations
//==============================================================================

class InstrumentManager;
class InstrumentInstance;

//==============================================================================
// Core MIDI Routing Engine
//==============================================================================

class MidiRoutingEngine {
public:
    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    explicit MidiRoutingEngine(InstrumentManager* instrumentManager);
    ~MidiRoutingEngine();

    //==============================================================================
    // Initialization
    //==============================================================================

    bool initialize();
    void shutdown();
    bool isInitialized() const { return initialized_; }

    //==============================================================================
    // MIDI Device Management
    //==============================================================================

    // Device discovery
    std::vector<MidiDeviceInfo> getAvailableInputDevices() const;
    std::vector<MidiDeviceInfo> getAvailableOutputDevices() const;
    std::vector<MidiDeviceInfo> getActiveDevices() const;

    // Device connection
    bool connectToInputDevice(const std::string& deviceIdentifier);
    bool disconnectFromInputDevice(const std::string& deviceIdentifier);
    bool connectToOutputDevice(const std::string& deviceIdentifier);
    bool disconnectFromOutputDevice(const std::string& deviceIdentifier);

    // Device status
    bool isDeviceConnected(const std::string& deviceIdentifier) const;
    MidiDeviceInfo getDeviceInfo(const std::string& deviceIdentifier) const;

    //==============================================================================
    // MIDI Route Management
    //==============================================================================

    // Route creation and management
    RouteID createRoute(const MidiRouteConfig& config);
    bool removeRoute(RouteID routeId);
    bool updateRouteConfig(RouteID routeId, const MidiRouteConfig& config);

    // Route lookup
    std::vector<RouteID> getAllRoutes() const;
    std::vector<RouteID> getRoutesForSource(const std::string& sourceDevice) const;
    std::vector<RouteID> getRoutesForTarget(const std::string& targetInstrument) const;
    MidiRouteConfig getRouteConfig(RouteID routeId) const;

    // Route activation
    bool enableRoute(RouteID routeId);
    bool disableRoute(RouteID routeId);
    bool isRouteEnabled(RouteID routeId) const;

    // Special routes
    RouteID createBroadcastRoute(const std::string& sourceDevice);
    RouteID createAllInstrumentsRoute(const std::string& sourceDevice);

    //==============================================================================
    // MIDI Processing
    //==============================================================================

    // Main processing function
    void processMidiBlock(const std::string& sourceDevice, juce::MidiBuffer& midiBuffer, int numSamples);

    // Individual message processing
    void processMidiMessage(const std::string& sourceDevice, const juce::MidiMessage& message);

    // Direct MIDI sending to instruments
    void sendMidiToInstrument(const std::string& instrumentName, const juce::MidiMessage& message);
    void sendMidiToInstrument(const std::string& instrumentName, const juce::MidiBuffer& midiBuffer);

    // System exclusive handling
    void processSysEx(const std::string& sourceDevice, const std::vector<uint8_t>& sysExData);

    //==============================================================================
    // MIDI Learn System
    //==============================================================================

    // MIDI learn configuration
    bool startMidiLearn(const std::string& parameterName, const std::string& instrumentName);
    bool stopMidiLearn(const std::string& parameterName, const std::string& instrumentName);
    bool isMidiLearning(const std::string& parameterName, const std::string& instrumentName) const;

    // MIDI learn mappings
    bool addMidiLearnMapping(const MidiLearnConfig& config);
    bool removeMidiLearnMapping(const std::string& parameterName, const std::string& instrumentName);
    std::vector<MidiLearnConfig> getMidiLearnMappings() const;
    std::vector<MidiLearnConfig> getMidiLearnMappingsForInstrument(const std::string& instrumentName) const;

    // MIDI learn processing
    void processMidiLearn(const juce::MidiMessage& message);
    void clearAllMidiLearnMappings();

    //==============================================================================
    // MIDI Filtering and Transformation
    //==============================================================================

    // Filtering
    bool shouldFilterMessage(const MidiRouteConfig& config, const juce::MidiMessage& message) const;
    void applyMessageFilter(juce::MidiBuffer& buffer, const MidiRouteConfig& config) const;

    // Transformation
    juce::MidiMessage transformMessage(const MidiRouteConfig& config, const juce::MidiMessage& message) const;
    void applyMessageTransform(juce::MidiBuffer& buffer, const MidiRouteConfig& config) const;

    // Custom filters and transforms
    void registerCustomFilter(const std::string& name, std::function<bool(const juce::MidiMessage&)> filter);
    void registerCustomTransform(const std::string& name, std::function<juce::MidiMessage(const juce::MidiMessage&)> transform);

    //==============================================================================
    // Velocity Processing
    //==============================================================================

    // Velocity curves
    float applyVelocityCurve(float velocity, float curve) const;
    void setGlobalVelocityCurve(float curve) { globalVelocityCurve_ = curve; }
    float getGlobalVelocityCurve() const { return globalVelocityCurve_; }

    // Velocity scaling
    float scaleVelocity(float velocity, float scale) const;
    void setGlobalVelocityScale(float scale) { globalVelocityScale_ = scale; }
    float getGlobalVelocityScale() const { return globalVelocityScale_; }

    //==============================================================================
    // Channel Management
    //==============================================================================

    // Channel mapping
    void setChannelMap(int inputChannel, int outputChannel);
    int getChannelMap(int inputChannel) const;
    void clearChannelMap();

    // Channel filtering
    void setAllowedChannels(const std::unordered_set<int>& channels);
    std::unordered_set<int> getAllowedChannels() const;

    // Omni mode support
    void setOmniMode(bool enabled) { omniMode_ = enabled; }
    bool isOmniMode() const { return omniMode_; }

    //==============================================================================
    // Monitoring and Statistics
    //==============================================================================

    // Statistics
    MidiRoutingStats getStatistics() const;
    void resetStatistics();

    // Monitoring
    void setMonitoringEnabled(bool enabled) { monitoringEnabled_ = enabled; }
    bool isMonitoringEnabled() const { return monitoringEnabled_; }

    // Activity callbacks
    void setMidiActivityCallback(std::function<void(const std::string&, const juce::MidiMessage&)> callback) {
        midiActivityCallback_ = std::move(callback);
    }

    // Route activity
    std::vector<std::string> getActiveRoutes() const;
    uint64_t getMessageCountForRoute(RouteID routeId) const;

    //==============================================================================
    // Preset Management
    //==============================================================================

    // Route presets
    bool saveRoutePreset(const std::string& presetName, const std::vector<RouteID>& routeIds);
    bool loadRoutePreset(const std::string& presetName);
    bool deleteRoutePreset(const std::string& presetName);
    std::vector<std::string> getAvailableRoutePresets() const;

    // MIDI learn presets
    bool saveMidiLearnPreset(const std::string& presetName);
    bool loadMidiLearnPreset(const std::string& presetName);
    bool deleteMidiLearnPreset(const std::string& presetName);
    std::vector<std::string> getAvailableMidiLearnPresets() const;

    //==============================================================================
    // Configuration and Persistence
    //==============================================================================

    // Configuration
    void setConfiguration(const juce::var& config);
    juce::var getConfiguration() const;

    // Persistence
    bool saveState(const juce::File& file) const;
    bool loadState(const juce::File& file);

    // Auto-save
    void setAutoSaveEnabled(bool enabled) { autoSaveEnabled_ = enabled; }
    bool isAutoSaveEnabled() const { return autoSaveEnabled_; }
    void setAutoSaveInterval(int intervalSeconds) { autoSaveIntervalSeconds_ = intervalSeconds; }

    //==============================================================================
    // Advanced Features
    //==============================================================================

    // MIDI clock and sync
    void enableMidiClock(const std::string& deviceIdentifier, bool enabled);
    bool isMidiClockEnabled(const std::string& deviceIdentifier) const;
    void processMidiClock(const std::string& sourceDevice, const juce::MidiMessage& message);

    // MIDI Machine Control (MMC)
    void enableMMC(bool enabled) { mmcEnabled_ = enabled; }
    bool isMMCEnabled() const { return mmcEnabled_; }
    void processMMC(const juce::MidiMessage& message);

    // Parameter automation
    void enableParameterAutomation(bool enabled) { parameterAutomationEnabled_ = enabled; }
    bool isParameterAutomationEnabled() const { return parameterAutomationEnabled_; }

    // Debugging
    void setDebugMode(bool enabled) { debugMode_ = enabled; }
    bool isDebugMode() const { return debugMode_; }
    void dumpRouteConfiguration(RouteID routeId) const;
    void dumpAllRoutes() const;

private:
    //==============================================================================
    // Internal Data Structures
    //==============================================================================

    struct MidiRoute {
        RouteID id;
        MidiRouteConfig config;
        bool enabled = true;
        uint64_t messageCount = 0;
        juce::Time lastActivity;

        MidiRoute(RouteID routeId, const MidiRouteConfig& routeConfig)
            : id(routeId), config(routeConfig) {}
    };

    struct MidiConnection {
        std::string deviceIdentifier;
        std::unique_ptr<juce::MidiInput> midiInput;
        std::unique_ptr<juce::MidiOutput> midiOutput;
        MidiDeviceInfo deviceInfo;
        bool clockEnabled = false;
    };

    //==============================================================================
    // Internal Methods
    //==============================================================================

    // Device management
    void updateDeviceList();
    void handleIncomingMidi(juce::MidiInput* source, const juce::MidiMessage& message);
    void handleDeviceConnectionChange(const std::string& deviceIdentifier, bool connected);

    // Route processing
    void processRoute(MidiRoute& route, const juce::MidiMessage& message);
    void processRoute(MidiRoute& route, juce::MidiBuffer& buffer);

    // Parameter updates
    void updateParameterFromMidi(const MidiLearnConfig& config, float midiValue);
    float midiValueToParameter(float midiValue, const MidiLearnConfig& config) const;

    // Auto-save
    void startAutoSaveTimer();
    void stopAutoSaveTimer();
    void performAutoSave();

    // Validation
    bool validateRouteConfig(const MidiRouteConfig& config) const;
    bool validateMidiLearnConfig(const MidiLearnConfig& config) const;

    // Utilities
    RouteID generateRouteId() const;
    std::string getRouteName(RouteID routeId) const;
    double calculateLatency(const juce::Time& startTime) const;

    //==============================================================================
    // Member Variables
    //==============================================================================

    // Core state
    InstrumentManager* instrumentManager_;
    bool initialized_ = false;

    // Device management
    std::unordered_map<std::string, std::unique_ptr<MidiConnection>> connections_;
    std::vector<MidiDeviceInfo> availableInputDevices_;
    std::vector<MidiDeviceInfo> availableOutputDevices_;

    // Routing
    std::unordered_map<RouteID, std::unique_ptr<MidiRoute>> routes_;
    std::unordered_map<std::string, std::vector<RouteID>> deviceRoutes_;
    std::unordered_map<std::string, std::vector<RouteID>> instrumentRoutes_;
    RouteID nextRouteId_ = 1;

    // MIDI learn
    std::unordered_map<std::string, MidiLearnConfig> midiLearnMappings_;
    std::unordered_set<std::string> activeMidiLearnSessions_;

    // Custom filters and transforms
    std::unordered_map<std::string, std::function<bool(const juce::MidiMessage&)>> customFilters_;
    std::unordered_map<std::string, std::function<juce::MidiMessage(const juce::MidiMessage&)>> customTransforms_;

    // Channel management
    std::unordered_map<int, int> channelMap_;
    std::unordered_set<int> allowedChannels_;
    bool omniMode_ = false;

    // Global processing
    float globalVelocityCurve_ = 1.0f;
    float globalVelocityScale_ = 1.0f;

    // Features
    bool monitoringEnabled_ = false;
    bool autoSaveEnabled_ = false;
    int autoSaveIntervalSeconds_ = 300; // 5 minutes
    bool mmcEnabled_ = false;
    bool parameterAutomationEnabled_ = true;
    bool debugMode_ = false;

    // Presets
    std::unordered_map<std::string, std::vector<RouteID>> routePresets_;
    std::unordered_map<std::string, std::vector<MidiLearnConfig>> midiLearnPresets_;

    // Statistics and monitoring
    MidiRoutingStats stats_;
    std::function<void(const std::string&, const juce::MidiMessage&)> midiActivityCallback_;

    // Threading and synchronization
    juce::CriticalSection routesMutex_;
    juce::CriticalSection devicesMutex_;
    juce::CriticalSection midiLearnMutex_;
    juce::CriticalSection statsMutex_;

    // Timers
    std::unique_ptr<juce::Timer> autoSaveTimer_;
    std::unique_ptr<juce::Timer> statsUpdateTimer_;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MidiRoutingEngine)
};

} // namespace midi
} // namespace schill