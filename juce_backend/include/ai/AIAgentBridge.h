#pragma once

#include <JuceHeader.h>
#include "instrument/InstrumentManager.h"
#include "routing/AudioRoutingEngine.h"
#include "routing/MidiRoutingEngine.h"
#include <nlohmann/json.hpp>
#include <unordered_map>
#include <functional>
#include <memory>
#include <thread>
#include <queue>

namespace schill {
namespace ai {

using json = nlohmann::json;

//==============================================================================
// AI Agent Types and Capabilities
//==============================================================================

enum class AgentType {
    CREATIVE = 0,        // Creative assistance, sound design
    ANALYTICAL = 1,      // Analysis, optimization
    PERFORMER = 2,       // Real-time performance assistance
    EDUCATOR = 3,        // Teaching and guidance
    PRODUCER = 4,        // Production assistance
    COMPOSER = 5         // Composition assistance
};

enum class AgentCapability {
    INSTRUMENT_CONTROL = 1,
    PARAMETER_AUTOMATION = 2,
    PRESET_GENERATION = 4,
    SOUND_DESIGN = 8,
    PERFORMANCE_ASSISTANCE = 16,
    ANALYSIS = 32,
    EDUCATION = 64,
    COMPOSITION = 128,
    MIXING = 256,
    ARRANGEMENT = 512
};

//==============================================================================
// AI Agent Configuration
//==============================================================================

struct AgentConfig {
    std::string name;
    AgentType type;
    std::vector<AgentCapability> capabilities;
    json parameters;

    // Communication settings
    bool enableRealtimeControl = true;
    float responseTimeoutSeconds = 5.0f;
    bool enableLearning = false;
    bool enablePersistence = true;

    // Creative constraints
    bool respectUserIntent = true;
    float creativityLevel = 0.5f; // 0.0 = conservative, 1.0 = experimental
    std::vector<std::string> allowedInstrumentTypes;
    std::vector<std::string> restrictedParameters;

    AgentConfig() = default;
    AgentConfig(const std::string& agentName, AgentType agentType)
        : name(agentName), type(agentType) {}
};

//==============================================================================
// AI Command Structure
//==============================================================================

struct AICommand {
    std::string id;
    std::string agentName;
    std::string command;
    json parameters;
    json context; // Current project state, user preferences, etc.
    float priority = 0.5f;
    std::chrono::steady_clock::time_point timestamp;
    std::string requestId;

    AICommand(const std::string& cmd, const std::string& agent, const json& params = {})
        : id(generateCommandId()), agentName(agent), command(cmd), parameters(params),
          timestamp(std::chrono::steady_clock::now()) {}

    std::string toString() const;

private:
    static std::string generateCommandId();
};

//==============================================================================
// AI Response Structure
//==============================================================================

struct AIResponse {
    std::string commandId;
    std::string agentName;
    bool success = false;
    json result;
    std::string message;
    json reasoning; // AI's reasoning process
    float confidence = 0.0f;
    std::vector<std::string> suggestions;
    std::chrono::steady_clock::time_point timestamp;
    std::string requestId;

    AIResponse(const std::string& cmdId, const std::string& agent)
        : commandId(cmdId), agentName(agent), timestamp(std::chrono::steady_clock::now()) {}

    json toJson() const;
    static AIResponse fromJson(const json& jsonResp);
};

//==============================================================================
// AI Agent State
//==============================================================================

enum class AgentState {
    IDLE,
    THINKING,
    EXECUTING,
    WAITING,
    ERROR
};

struct AgentInfo {
    std::string name;
    AgentType type;
    AgentState state = AgentState::IDLE;
    std::vector<AgentCapability> capabilities;
    json currentContext;
    std::chrono::steady_clock::time_point lastActivity;
    uint64_t commandsProcessed = 0;
    uint64_t errorsEncountered = 0;
    float averageResponseTime = 0.0f;

    AgentInfo(const std::string& agentName, AgentType agentType)
        : name(agentName), type(agentType), lastActivity(std::chrono::steady_clock::now()) {}
};

//==============================================================================
// Learning and Adaptation
//==============================================================================

struct LearningData {
    std::string scenario;
    json input;
    json output;
    float userRating = -1.0f; // -1 = unrated, 0-5 = rating
    std::vector<std::string> userFeedback;
    std::chrono::steady_clock::time_point timestamp;
};

struct UserPreferences {
    std::unordered_map<std::string, float> parameterWeights;
    std::vector<std::string> favoritePresets;
    std::vector<std::string> avoidedTechniques;
    float complexityPreference = 0.5f; // 0 = simple, 1 = complex
    float experimentationLevel = 0.5f; // 0 = conservative, 1 = experimental
    std::unordered_map<std::string, json> instrumentPreferences;
};

//==============================================================================
// Performance and Analytics
//==============================================================================

struct AgentPerformance {
    uint64_t totalCommands = 0;
    uint64_t successfulCommands = 0;
    uint64_t failedCommands = 0;
    double averageResponseTime = 0.0;
    double averageConfidence = 0.0;
    std::unordered_map<std::string, uint64_t> commandCounts;
    std::unordered_map<AgentCapability, uint64_t> capabilityUsage;
    std::chrono::steady_clock::time_point lastUpdate;
};

//==============================================================================
// AI Agent Bridge
//==============================================================================

class AIAgentBridge : public juce::Thread,
                     public juce::ChangeListener,
                     public juce::Timer
{
public:
    //==============================================================================
    // Constructor/Destructor
    //==============================================================================

    AIAgentBridge(InstrumentManager* instrumentManager,
                 AudioRoutingEngine* audioRoutingEngine,
                 MidiRoutingEngine* midiRoutingEngine);
    ~AIAgentBridge() override;

    //==============================================================================
    // Initialization and Management
    //==============================================================================

    bool initialize();
    void shutdown();
    bool isInitialized() const { return initialized_; }

    //==============================================================================
    // Agent Management
    //==============================================================================

    bool registerAgent(const AgentConfig& config);
    bool unregisterAgent(const std::string& agentName);
    bool isAgentRegistered(const std::string& agentName) const;
    std::vector<std::string> getRegisteredAgents() const;
    AgentInfo getAgentInfo(const std::string& agentName) const;

    // Agent configuration
    bool updateAgentConfig(const std::string& agentName, const AgentConfig& config);
    AgentConfig getAgentConfig(const std::string& agentName) const;

    // Agent state management
    bool setAgentState(const std::string& agentName, AgentState state);
    AgentState getAgentState(const std::string& agentName) const;

    //==============================================================================
    // Command Processing
    //==============================================================================

    std::string executeCommand(const AICommand& command);
    std::string executeCommandAsync(const AICommand& command);
    bool cancelCommand(const std::string& commandId);

    // Command status
    bool isCommandComplete(const std::string& commandId) const;
    AIResponse getCommandResult(const std::string& commandId) const;
    std::vector<std::string> getPendingCommands() const;

    //==============================================================================
    // High-Level Commands
    //==============================================================================

    // Instrument control
    std::string createInstrumentSound(const std::string& agentName, const std::string& description);
    std::string modifyInstrumentParameter(const std::string& agentName, const std::string& instrumentName,
                                         const std::string& parameter, const std::string& direction);
    std::string generatePreset(const std::string& agentName, const std::string& instrumentName,
                               const std::string& style);

    // Performance assistance
    std::string suggestAccompaniment(const std::string& agentName, const std::vector<std::string>& currentInstruments);
    std::string adaptPerformance(const std::string& agentName, const std::string& targetMood);

    // Analysis
    std::string analyzeMix(const std::string& agentName);
    std::string suggestImprovements(const std::string& agentName, const std::string& aspect);

    // Education
    std::string explainTechnique(const std::string& agentName, const std::string& technique);
    std::string generateTutorial(const std::string& agentName, const std::string& topic);

    //==============================================================================
    // Learning and Adaptation
    //==============================================================================

    // User feedback
    bool provideFeedback(const std::string& commandId, float rating, const std::vector<std::string>& feedback = {});
    bool updatePreferences(const UserPreferences& preferences);
    UserPreferences getUserPreferences() const;

    // Learning data
    std::vector<LearningData> getLearningHistory(const std::string& agentName, int maxEntries = 100) const;
    bool exportLearningData(const std::string& filename) const;
    bool importLearningData(const std::string& filename);

    // Adaptation
    void enableAdaptation(bool enabled);
    bool isAdaptationEnabled() const;
    void resetLearning(const std::string& agentName = "");

    //==============================================================================
    // Real-time Control
    //==============================================================================

    // Real-time parameter control
    bool enableRealtimeControl(const std::string& agentName, bool enabled);
    bool isRealtimeControlEnabled(const std::string& agentName) const;

    // Continuous operation
    bool startContinuousOperation(const std::string& agentName, const std::string& operation);
    bool stopContinuousOperation(const std::string& agentName);
    std::vector<std::string> getActiveContinuousOperations() const;

    //==============================================================================
    // Integration with External AI Services
    //==============================================================================

    // External service configuration
    void setExternalServiceConfig(const json& config);
    json getExternalServiceConfig() const;

    // Service connectivity
    bool testExternalServiceConnection() const;
    bool isExternalServiceAvailable() const;

    //==============================================================================
    // Monitoring and Analytics
    //==============================================================================

    // Performance metrics
    AgentPerformance getAgentPerformance(const std::string& agentName) const;
    std::unordered_map<std::string, AgentPerformance> getAllAgentPerformance() const;

    // Activity monitoring
    std::vector<AICommand> getRecentCommands(int maxEntries = 50) const;
    std::vector<AIResponse> getRecentResponses(int maxEntries = 50) const;

    // System status
    json getSystemStatus() const;

    //==============================================================================
    // Event Callbacks
    //==============================================================================

    void setCommandStartedCallback(std::function<void(const AICommand&)> callback);
    void setCommandCompletedCallback(std::function<void(const AICommand&, const AIResponse&)> callback);
    void setAgentStateChangedCallback(std::function<void(const std::string&, AgentState)> callback);
    void setRealtimeUpdateCallback(std::function<void(const std::string&, const json&)> callback);

    //==============================================================================
    // ChangeListener callbacks
    //==============================================================================

    void changeListenerCallback(juce::ChangeBroadcaster* source) override;

private:
    //==============================================================================
    // Thread Implementation
    //==============================================================================

    void run() override;

    //==============================================================================
    // Timer Implementation
    //==============================================================================

    void timerCallback() override;

    //==============================================================================
    // Core Processing
    //==============================================================================

    void processCommandQueue();
    void processContinuousOperations();
    void updateAgentStates();

    //==============================================================================
    // Command Execution
    //==============================================================================

    AIResponse executeCommandInternal(const AICommand& command);
    AIResponse executeInstrumentCommand(const AICommand& command);
    AIResponse executePerformanceCommand(const AICommand& command);
    AIResponse executeAnalysisCommand(const AICommand& command);
    AIResponse executeEducationCommand(const AICommand& command);
    AIResponse executeCreativeCommand(const AICommand& command);

    //==============================================================================
    // Instrument Control Integration
    //==============================================================================

    bool setInstrumentParameter(const std::string& instrumentName, const std::string& parameter, float value);
    float getInstrumentParameter(const std::string& instrumentName, const std::string& parameter);
    std::vector<std::string> getInstrumentParameters(const std::string& instrumentName);

    bool createInstrumentInstance(const std::string& instrumentType, const std::string& instanceName);
    bool removeInstrumentInstance(const std::string& instanceName);

    // Preset management
    bool savePreset(const std::string& instanceName, const std::string& presetName);
    bool loadPreset(const std::string& instanceName, const std::string& presetName);
    std::vector<std::string> getAvailablePresets(const std::string& instrumentName);

    //==============================================================================
    // AI Reasoning and Decision Making
    //==============================================================================

    json analyzeCurrentContext() const;
    std::vector<std::string> generateActionPlan(const std::string& agentName, const std::string& goal) const;
    float evaluateActionConfidence(const std::string& action, const json& context) const;
    std::string adaptCommandToUser(const std::string& agentName, const AICommand& command) const;

    //==============================================================================
    // Learning System
    //==============================================================================

    void recordLearningData(const std::string& agentName, const AICommand& command, const AIResponse& response);
    void updateAgentLearning(const std::string& agentName);
    void applyUserPreferences(const std::string& agentName, AIResponse& response) const;

    // Pattern recognition
    std::vector<std::string> recognizeUserPatterns() const;
    void updateUserModel(const LearningData& data);

    //==============================================================================
    // External AI Service Integration
    //==============================================================================

    json callExternalAIService(const std::string& endpoint, const json& payload) const;
    bool validateExternalServiceResponse(const json& response) const;
    void handleExternalServiceError(const std::string& error) const;

    //==============================================================================
    // Persistence and State Management
    //==============================================================================

    bool saveAgentState(const std::string& agentName) const;
    bool loadAgentState(const std::string& agentName);
    bool saveLearningData() const;
    bool loadLearningData();

    // State serialization
    json serializeAgentState(const std::string& agentName) const;
    void deserializeAgentState(const std::string& agentName, const json& state);

    //==============================================================================
    // Utility Methods
    //==============================================================================

    std::string generateCommandId() const;
    std::string generateRequestId() const;
    std::chrono::steady_clock::time_point getCurrentTime() const;

    std::string agentTypeToString(AgentType type) const;
    std::string capabilityToString(AgentCapability capability) const;
    AgentType stringToAgentType(const std::string& typeStr) const;
    AgentCapability stringToCapability(const std::string& capStr) const;

    bool validateAgentConfig(const AgentConfig& config) const;
    bool validateCommand(const AICommand& command) const;

    // Helper methods for instrument parameter manipulation
    float mapParameterRange(float input, float inMin, float inMax, float outMin, float outMax) const;
    float applyParameterCurve(float value, const std::string& curveType) const;
    std::vector<float> generateParameterValues(const std::string& parameter, const std::string& style) const;

    //==============================================================================
    // Member Variables
    //==============================================================================

    // Core components
    InstrumentManager* instrumentManager_;
    AudioRoutingEngine* audioRoutingEngine_;
    MidiRoutingEngine* midiRoutingEngine_;

    // System state
    bool initialized_ = false;

    // Agent management
    std::unordered_map<std::string, AgentInfo> agents_;
    std::unordered_map<std::string, AgentConfig> agentConfigs_;
    mutable juce::CriticalSection agentsMutex_;

    // Command processing
    std::queue<AICommand> commandQueue_;
    std::unordered_map<std::string, AIResponse> commandResults_;
    std::unordered_map<std::string, std::string> continuousOperations_;
    mutable juce::CriticalSection commandMutex_;
    mutable juce::CriticalSection resultsMutex_;

    // Learning system
    std::unordered_map<std::string, std::vector<LearningData>> learningData_;
    UserPreferences userPreferences_;
    bool adaptationEnabled_ = true;
    mutable juce::CriticalSection learningMutex_;

    // Performance tracking
    std::unordered_map<std::string, AgentPerformance> agentPerformance_;
    std::vector<AICommand> commandHistory_;
    std::vector<AIResponse> responseHistory_;
    mutable juce::CriticalSection performanceMutex_;

    // External service integration
    json externalServiceConfig_;
    bool externalServiceAvailable_ = false;

    // Real-time control
    std::unordered_map<std::string, bool> realtimeControlEnabled_;

    // Event callbacks
    std::function<void(const AICommand&)> commandStartedCallback_;
    std::function<void(const AICommand&, const AIResponse&)> commandCompletedCallback_;
    std::function<void(const std::string&, AgentState)> agentStateChangedCallback_;
    std::function<void(const std::string&, const json&)> realtimeUpdateCallback_;

    // Threading and synchronization
    std::unique_ptr<std::thread> processingThread_;
    std::atomic<bool> shouldStop_{false};

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AIAgentBridge)
};

} // namespace ai
} // namespace schill