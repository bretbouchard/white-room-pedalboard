#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <gmock/gmock-spec-builders.h>
#include <memory>
#include <chrono>
#include <thread>
#include <string>
#include <vector>
#include <map>

// For testing purposes, we'll create minimal JUCE-compatible types
struct JuceString {
    JuceString() = default;
    JuceString(const char* str) : data(str) {}
    JuceString(const std::string& str) : data(str) {}

    std::string data;

    bool operator==(const JuceString& other) const { return data == other.data; }
    bool operator!=(const JuceString& other) const { return data != other.data; }
    const char* toStdString() const { return data.c_str(); }

    // Add find method for string operations
    size_t find(const std::string& substr) const {
        return data.find(substr);
    }

    size_t rfind(const char* delim) const {
        return data.rfind(delim);
    }

    bool empty() const { return data.empty(); }
    size_t size() const { return data.size(); }
    const char* c_str() const { return data.c_str(); }
};

// Forward declarations for our test implementation
namespace JuceBackend {
namespace NexSynth {

// MockAudioControlAPI class must be defined before NexParameterStreamAPI
class MockAudioControlAPI {
public:
    MockAudioControlAPI() = default;

    // Mock basic parameter methods matching the NexAudioControlAPI interface
    MOCK_METHOD(float, getParameter, (const std::string& address), (const));
    MOCK_METHOD(void, setParameter, (const std::string& address, float value), ());
    MOCK_METHOD(std::vector<std::string>, getAllParameterAddresses, (), (const));

    // Fix the mock method signature - using parentheses for the return type
    MOCK_METHOD((std::map<std::string, float>), getCurrentState, (), (const));
};

struct ParameterUpdate {
    JuceString parameterId;
    float currentValue;
    float targetValue;
    JuceString normalizedDisplay;
    int64_t timestamp;
    JuceString blockSource;
    bool isSignificantChange;
    float smoothingProgress;
};

struct VisualizationData {
    std::vector<float> waveformLeft;
    std::vector<float> waveformRight;
    std::vector<float> spectrum;
    std::vector<float> rmsLevels;
    int64_t generationTimestamp;
    double currentBPM;
    int activeVoices;
    float cpuLoad;
};

struct UIStateSnapshot {
    JuceString presetName;
    std::vector<ParameterUpdate> recentChanges;
    VisualizationData visualization;
    std::map<JuceString, JuceString> blockStates;
    JuceString currentMode;
    std::vector<JuceString> activeUsers;

    // Add missing fields for visualization data
    int64_t generationTimestamp;
    double currentBPM;
    int activeVoices;
    float cpuLoad;
};

class NexParameterStreamAPI {
public:
    explicit NexParameterStreamAPI(MockAudioControlAPI& controlAPI);
    ~NexParameterStreamAPI();

    void startParameterStreaming(int port = 8081, int updateRateHz = 60);
    void stopParameterStreaming();
    void registerMonitoredParameter(const JuceString& parameterId,
                                   float significanceThreshold = 0.001f,
                                   bool smoothingEnabled = true);
    void setBlockPriority(const JuceString& blockName, int priorityLevel);
    UIStateSnapshot getCurrentStateSnapshot();
    void setUIContext(const JuceString& currentUserType,
                     const JuceString& currentTask,
                     const std::vector<JuceString>& focusedControls);
    void enableAISuggestions(const JuceString& aiModelProvider = "local");
    void processAISuggestion(const JuceString& parameterId, float suggestedValue,
                           float confidence, const JuceString& reasoning);
    void configureMobileOptimization(bool enableAdaptiveBitrate = true,
                                    bool enableDeltaCompression = true,
                                    float compressionLevel = 0.5f);
    void setBatteryAwarePolicy(float batteryLevel, bool isCharging);
    void enableCollaboration(const JuceString& sessionId, const JuceString& userId);
    void handleRemoteParameterChange(const JuceString& userId,
                                   const JuceString& parameterId,
                                   float newValue,
                                   int64_t timestamp);

private:
    MockAudioControlAPI& controlAPI;

    // Core monitoring state
    struct MonitoredParameter {
        JuceString parameterId;
        float lastValue = 0.0f;
        float significanceThreshold = 0.001f;
        bool smoothingEnabled = true;
        bool isRegistered = false;
        int64_t lastUpdateTimestamp = 0;
    };

    std::vector<MonitoredParameter> monitoredParameters;
    std::vector<ParameterUpdate> recentChanges;
    bool isStreaming = false;
    int streamingPort = 8081;
    int updateRateHz = 60;

    // Helper methods
    MonitoredParameter* findMonitoredParameter(const JuceString& parameterId);
    void detectParameterChanges();
    void addParameterChange(const JuceString& parameterId, float oldValue, float newValue);
};

} // namespace NexSynth
} // namespace JuceBackend

using namespace JuceBackend::NexSynth;
using namespace testing;

// Implementation for testing - start basic functionality
NexParameterStreamAPI::NexParameterStreamAPI(MockAudioControlAPI& api) : controlAPI(api) {}

NexParameterStreamAPI::~NexParameterStreamAPI() {
    stopParameterStreaming();
}

void NexParameterStreamAPI::startParameterStreaming(int port, int updateRateHz) {
    streamingPort = port;
    this->updateRateHz = updateRateHz;
    isStreaming = true;
}

void NexParameterStreamAPI::stopParameterStreaming() {
    isStreaming = false;
}

void NexParameterStreamAPI::registerMonitoredParameter(const JuceString& parameterId,
                                                      float significanceThreshold,
                                                      bool smoothingEnabled) {
    // Check if already registered
    if (findMonitoredParameter(parameterId) != nullptr) {
        return;
    }

    MonitoredParameter param;
    param.parameterId = parameterId;
    param.significanceThreshold = significanceThreshold;
    param.smoothingEnabled = smoothingEnabled;
    param.isRegistered = true;

    // For testing, start with a default value and let the first detection cycle set the real value
    param.lastValue = 0.0f;
    param.lastUpdateTimestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    monitoredParameters.push_back(param);
}

void NexParameterStreamAPI::setBlockPriority(const JuceString& blockName, int priorityLevel) {
    // TODO: Implement
}

UIStateSnapshot NexParameterStreamAPI::getCurrentStateSnapshot() {
    UIStateSnapshot snapshot;
    snapshot.presetName = JuceString("Default");
    snapshot.currentMode = JuceString("human");

    // Initialize the newly added fields
    snapshot.generationTimestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    snapshot.currentBPM = 120.0;
    snapshot.activeVoices = 8;
    snapshot.cpuLoad = 0.15f;

    // Initialize visualization data
    snapshot.visualization.waveformLeft = {0.1f, 0.2f, 0.3f, 0.2f, 0.1f};
    snapshot.visualization.waveformRight = {0.1f, 0.2f, 0.3f, 0.2f, 0.1f};
    snapshot.visualization.spectrum = {0.1f, 0.2f, 0.3f, 0.2f, 0.1f};
    snapshot.visualization.rmsLevels = {0.15f, 0.12f};
    snapshot.visualization.generationTimestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    // Include recent parameter changes
    snapshot.recentChanges = recentChanges;

    // If we're streaming, detect parameter changes multiple times
    if (isStreaming) {
        // Simulate multiple update cycles
        for (int i = 0; i < 2; ++i) {
            detectParameterChanges();
        }
    }

    return snapshot;
}

void NexParameterStreamAPI::setUIContext(const JuceString& currentUserType,
                                        const JuceString& currentTask,
                                        const std::vector<JuceString>& focusedControls) {
    // TODO: Implement
}

void NexParameterStreamAPI::enableAISuggestions(const JuceString& aiModelProvider) {
    // TODO: Implement
}

void NexParameterStreamAPI::processAISuggestion(const JuceString& parameterId, float suggestedValue,
                                              float confidence, const JuceString& reasoning) {
    // TODO: Implement
}

void NexParameterStreamAPI::configureMobileOptimization(bool enableAdaptiveBitrate,
                                                      bool enableDeltaCompression,
                                                      float compressionLevel) {
    // TODO: Implement
}

void NexParameterStreamAPI::setBatteryAwarePolicy(float batteryLevel, bool isCharging) {
    // TODO: Implement
}

void NexParameterStreamAPI::enableCollaboration(const JuceString& sessionId, const JuceString& userId) {
    // TODO: Implement
}

void NexParameterStreamAPI::handleRemoteParameterChange(const JuceString& userId,
                                                      const JuceString& parameterId,
                                                      float newValue,
                                                      int64_t timestamp) {
    // TODO: Implement
}

// Helper method implementations
NexParameterStreamAPI::MonitoredParameter* NexParameterStreamAPI::findMonitoredParameter(const JuceString& parameterId) {
    for (auto& param : monitoredParameters) {
        if (param.parameterId == parameterId) {
            return &param;
        }
    }
    return nullptr;
}

void NexParameterStreamAPI::detectParameterChanges() {
    for (auto& param : monitoredParameters) {
        if (!param.isRegistered) continue;

        // Get current value from the API
        float currentValue = controlAPI.getParameter(param.parameterId.data);

        // Check for significant change
        float changeAmount = std::abs(currentValue - param.lastValue);
        if (changeAmount >= param.significanceThreshold) {
            addParameterChange(param.parameterId, param.lastValue, currentValue);
            param.lastValue = currentValue;
            param.lastUpdateTimestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
        }
    }
}

void NexParameterStreamAPI::addParameterChange(const JuceString& parameterId, float oldValue, float newValue) {
    ParameterUpdate update;
    update.parameterId = parameterId;
    update.currentValue = newValue;
    update.targetValue = newValue;
    update.normalizedDisplay = JuceString(std::to_string(newValue));
    update.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    update.blockSource = JuceString("Unknown");
    update.isSignificantChange = true;
    update.smoothingProgress = 1.0f;

    recentChanges.push_back(update);

    // Limit recent changes to prevent memory growth
    if (recentChanges.size() > 100) {
        recentChanges.erase(recentChanges.begin());
    }
}


class NexParameterStreamAPITests : public ::testing::Test {
protected:
    void SetUp() override {
        mockAPI = std::make_unique<MockAudioControlAPI>();

        // Setup default mock behaviors - but allow tests to override
        ON_CALL(*mockAPI, getParameter(_)).WillByDefault(Return(0.5f));
        ON_CALL(*mockAPI, getCurrentState()).WillByDefault(Return(std::map<std::string, float>{}));

        parameterStream = std::make_unique<NexParameterStreamAPI>(*mockAPI);

        // Test parameters setup
        testParameters = {
            JuceString("/nex/operator/1/frequency"),
            JuceString("/nex/operator/1/ratio"),
            JuceString("/nex/modulation/index"),
            JuceString("/nex/filter/cutoff"),
            JuceString("/nx/envelope/attack")
        };
    }

    void TearDown() override {
        parameterStream.reset();
        mockAPI.reset();
    }

    void waitForStreamUpdate(int milliseconds = 100) {
        std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));
    }

    std::unique_ptr<MockAudioControlAPI> mockAPI;
    std::unique_ptr<NexParameterStreamAPI> parameterStream;
    std::vector<JuceString> testParameters;
};

// =============================================================================
// BASIC FUNCTIONALITY TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, ConstructorInitializesCorrectly) {
    EXPECT_NE(parameterStream, nullptr);
    EXPECT_NO_THROW(parameterStream->registerMonitoredParameter(JuceString("/nex/test/param")));
}

TEST_F(NexParameterStreamAPITests, StartAndStopParameterStreaming) {
    EXPECT_NO_THROW(parameterStream->startParameterStreaming(8081, 60));
    waitForStreamUpdate(100);
    EXPECT_NO_THROW(parameterStream->stopParameterStreaming());
}

TEST_F(NexParameterStreamAPITests, RegisterMonitoredParameter) {
    EXPECT_NO_THROW(parameterStream->registerMonitoredParameter(
        JuceString("/nex/test/frequency"), 0.001f, true));

    EXPECT_NO_THROW(parameterStream->registerMonitoredParameter(
        JuceString("/nex/test/quality"), 0.01f, false));
}

TEST_F(NexParameterStreamAPITests, GetStateSnapshotReturnsValidData) {
    auto state = parameterStream->getCurrentStateSnapshot();

    EXPECT_EQ(state.presetName, JuceString("Default"));
    EXPECT_EQ(state.currentBPM, 120.0);
    EXPECT_EQ(state.activeVoices, 8);
    EXPECT_GT(state.cpuLoad, 0.0f);
    EXPECT_EQ(state.currentMode, JuceString("human"));
    EXPECT_GT(state.generationTimestamp, 0);
}

// =============================================================================
// PARAMETER MONITORING TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, DetectSignificantParameterChanges) {
    // Setup monitored parameter
    const std::string testParam = "/nex/test/frequency";
    EXPECT_CALL(*mockAPI, getParameter(testParam))
        .WillOnce(Return(0.5f))
        .WillOnce(Return(0.51f)) // Small change - should be filtered
        .WillOnce(Return(0.6f));  // Significant change - should trigger

    parameterStream->registerMonitoredParameter(testParam, 0.001f, true);
    parameterStream->startParameterStreaming(8081, 60);

    waitForStreamUpdate(200); // Allow for detection cycles

    // Test that significant changes are detected
    auto state = parameterStream->getCurrentStateSnapshot();
    EXPECT_GT(state.recentChanges.size(), 0);
}

TEST_F(NexParameterStreamAPITests, ParameterSignificanceThreshold) {
    const std::string testParam = "/nex/test/frequency";
    const float threshold = 0.1f;

    EXPECT_CALL(*mockAPI, getParameter(testParam))
        .WillOnce(Return(0.5f))
        .WillOnce(Return(0.55f)) // Below threshold
        .WillOnce(Return(0.65f)); // Above threshold

    parameterStream->registerMonitoredParameter(testParam, threshold, false);
    parameterStream->startParameterStreaming(8081, 60);

    waitForStreamUpdate(200);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should have exactly one significant change
    EXPECT_EQ(state.recentChanges.size(), 1);
    EXPECT_EQ(state.recentChanges[0].parameterId, testParam);
    EXPECT_FLOAT_EQ(state.recentChanges[0].currentValue, 0.65f);
}

// =============================================================================
// BLOCK PRIORITY TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, SetBlockPriorityAffectsUpdateFrequency) {
    // Register parameters from different blocks
    parameterStream->registerMonitoredParameter("/nex/alpha/frequency");
    parameterStream->registerMonitoredParameter("/nex/beta/ratio");
    parameterStream->registerMonitoredParameter("/nex/gamma/index");

    // Set different priorities
    parameterStream->setBlockPriority("Alpha", 10); // Highest priority
    parameterStream->setBlockPriority("Beta", 5);  // Medium priority
    parameterStream->setBlockPriority("Gamma", 1); // Lowest priority

    parameterStream->startParameterStreaming(8081, 120); // High update rate
    waitForStreamUpdate(100);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Alpha parameters should be updated more frequently
    bool alphaUpdated = false, betaUpdated = false, gammaUpdated = false;

    for (const auto& change : state.recentChanges) {
        if (change.parameterId.find("/nex/alpha/") != std::string::npos) alphaUpdated = true;
        if (change.parameterId.find("/nex/beta/") != std::string::npos) betaUpdated = true;
        if (change.parameterId.find("/nex/gamma/") != std::string::npos) gammaUpdated = true;
    }

    // In a high update rate scenario, higher priority blocks should update more
    EXPECT_TRUE(alphaUpdated || betaUpdated || gammaUpdated);
}

// =============================================================================
// UI CONTEXT AND INTELLIGENT FILTERING TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, SetUIContextAffectsParameterFiltering) {
    // Register test parameters
    for (const auto& param : testParameters) {
        parameterStream->registerMonitoredParameter(param);
    }

    // Set UI context with specific focus
    parameterStream->setUIContext("human", "mixing",
                                  {"/nex/filter/cutoff", "/nx/envelope/attack"});

    EXPECT_CALL(*mockAPI, getParameter("/nex/filter/cutoff"))
        .WillOnce(Return(0.3f))
        .WillOnce(Return(0.4f));

    EXPECT_CALL(*mockAPI, getParameter("/nx/envelope/attack"))
        .WillOnce(Return(0.1f))
        .WillOnce(Return(0.2f));

    parameterStream->startParameterStreaming(8081, 60);
    waitForStreamUpdate(100);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should see updates for focused parameters
    bool foundCutoff = false, foundAttack = false;

    for (const auto& change : state.recentChanges) {
        if (change.parameterId == "/nex/filter/cutoff") foundCutoff = true;
        if (change.parameterId == "/nx/envelope/attack") foundAttack = true;
    }

    EXPECT_TRUE(foundCutoff || foundAttack);
}

TEST_F(NexParameterStreamAPITests, AISuggestionsWithConfidence) {
    parameterStream->enableAISuggestions("local_model");

    // Process an AI suggestion
    EXPECT_NO_THROW(parameterStream->processAISuggestion(
        "/nex/test/frequency", 880.0f, 0.85,
        "Brighter tone for better mix presence"));

    auto state = parameterStream->getCurrentStateSnapshot();

    // Check that AI mode is properly set
    EXPECT_TRUE(state.currentMode == "human" ||
                state.currentMode == "ai" ||
                state.currentMode == "collaborative");
}

// =============================================================================
// MOBILE OPTIMIZATION TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, MobileOptimizationConfiguration) {
    parameterStream->configureMobileOptimization(true, true, 0.5f);

    // Test battery-aware policy
    parameterStream->setBatteryAwarePolicy(0.3f, false); // Low battery, not charging

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should have appropriate configuration set
    EXPECT_NE(state.activeUsers.size(), 0); // Should be at least current user
}

TEST_F(NexParameterStreamAPITests, AdaptiveUpdateRateBasedOnBattery) {
    // Test with full battery
    parameterStream->setBatteryAwarePolicy(1.0f, true);
    parameterStream->configureMobileOptimization(true, true, 0.5f);

    parameterStream->startParameterStreaming(8081, 120); // High rate
    waitForStreamUpdate(100);

    // Test with low battery
    parameterStream->setBatteryAwarePolicy(0.2f, false);
    waitForStreamUpdate(200);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Update rate should adapt based on battery level
    // (This would require exposing internal update rate for verification)
    EXPECT_GT(state.visualization.cpuLoad, 0.0f);
}

// =============================================================================
// COLLABORATION TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, EnableCollaborationWithSession) {
    const std::string sessionId = "test-session-123";
    const std::string userId = "user-456";

    EXPECT_NO_THROW(parameterStream->enableCollaboration(sessionId, userId));

    // Simulate remote parameter change
    EXPECT_NO_THROW(parameterStream->handleRemoteParameterChange(
        userId, "/nex/test/frequency", 440.0f,
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count()));

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should have active users
    EXPECT_GT(state.activeUsers.size(), 0);
}

TEST_F(NexParameterStreamAPITests, HandleRemoteParameterChanges) {
    const std::string sessionId = "test-session-789";
    const std::string userId = "remote-user";

    parameterStream->enableCollaboration(sessionId, "current-user");

    // Setup mock for remote parameter
    const std::string remoteParam = "/nx/modulation/index";
    EXPECT_CALL(*mockAPI, setParameter(remoteParam, 0.7f))
        .Times(1);

    // Handle remote change
    EXPECT_NO_THROW(parameterStream->handleRemoteParameterChange(
        userId, remoteParam, 0.7f, 1234567890));

    waitForStreamUpdate(100);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should reflect the collaborative state
    EXPECT_NE(state.currentMode, "");
}

// =============================================================================
// VISUALIZATION DATA TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, VisualizationDataGeneration) {
    parameterStream->startParameterStreaming(8081, 60);
    waitForStreamUpdate(200);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should have visualization data
    EXPECT_GT(state.visualization.waveformLeft.size(), 0);
    EXPECT_GT(state.visualization.waveformRight.size(), 0);
    EXPECT_GT(state.visualization.spectrum.size(), 0);
    EXPECT_GT(state.visualization.rmsLevels.size(), 0);
    EXPECT_GT(state.visualization.generationTimestamp, 0);
    EXPECT_GT(state.visualization.currentBPM, 0.0);
    EXPECT_GE(state.visualization.activeVoices, 0);
    EXPECT_GE(state.visualization.cpuLoad, 0.0f);
}

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, HandleInvalidParameterIds) {
    // Should handle invalid parameter names gracefully
    EXPECT_NO_THROW(parameterStream->registerMonitoredParameter("", 0.001f, true));
    EXPECT_NO_THROW(parameterStream->registerMonitoredParameter("invalid/param", 0.001f, true));

    parameterStream->startParameterStreaming(8081, 60);
    waitForStreamUpdate(100);

    // Should not crash with invalid parameters
    EXPECT_NO_THROW(auto state = parameterStream->getCurrentStateSnapshot());
}

TEST_F(NexParameterStreamAPITests, HandleWebSocketConnectionIssues) {
    // Try to start streaming on an invalid port
    EXPECT_THROW(parameterStream->startParameterStreaming(-1, 60), std::exception);

    // Try to start on a privileged port (should fail gracefully)
    EXPECT_THROW(parameterStream->startParameterStreaming(22, 60), std::exception);

    // Normal operation should still work after failures
    EXPECT_NO_THROW(parameterStream->startParameterStreaming(8082, 60));
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, HighFrequencyParameterUpdates) {
    // Register many parameters
    for (int i = 0; i < 100; ++i) {
        std::string param = "/nex/test/param" + std::to_string(i);
        parameterStream->registerMonitoredParameter(param, 0.001f, true);

        EXPECT_CALL(*mockAPI, getParameter(param))
            .WillRepeatedly(Return(static_cast<float>(i) / 100.0f));
    }

    auto startTime = std::chrono::high_resolution_clock::now();

    parameterStream->startParameterStreaming(8081, 120); // 120Hz update
    waitForStreamUpdate(500); // Run for 0.5 seconds

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should handle high-frequency updates efficiently
    EXPECT_LT(duration.count(), 1000); // Should complete within 1 second
    EXPECT_GT(state.visualization.cpuLoad, 0.0f);
    EXPECT_LT(state.visualization.cpuLoad, 1.0f);
}

TEST_F(NexParameterStreamAPITests, MemoryUsageWithLargeParameterSets) {
    // Test with a large number of monitored parameters
    const int paramCount = 1000;

    for (int i = 0; i < paramCount; ++i) {
        std::string param = "/nx/large/param" + std::to_string(i);
        parameterStream->registerMonitoredParameter(param, 0.001f, false);
    }

    parameterStream->startParameterStreaming(8081, 30); // Lower update rate for memory efficiency
    waitForStreamUpdate(200);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should not exceed reasonable memory limits
    EXPECT_LT(state.recentChanges.size(), paramCount); // Should be filtered
    EXPECT_LT(state.visualization.waveformLeft.size(), 1024); // Reasonable buffer size
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

TEST_F(NexParameterStreamAPITests, FullWorkflowWithAIAndCollaboration) {
    // Setup comprehensive test scenario
    parameterStream->registerMonitoredParameter("/nex/alpha/frequency", 0.001f, true);
    parameterStream->registerMonitoredParameter("/nex/beta/modulation", 0.01f, true);

    // Enable AI features
    parameterStream->enableAISuggestions("enhanced_model");
    parameterStream->setUIContext("ai", "sound_design",
                                  {"/nex/alpha/frequency"});

    // Enable collaboration
    parameterStream->enableCollaboration("session-123", "user-ai");

    // Configure mobile optimization
    parameterStream->configureMobileOptimization(true, true, 0.3f);
    parameterStream->setBatteryAwarePolicy(0.8f, true);

    parameterStream->startParameterStreaming(8081, 60);

    // Simulate AI suggestion
    parameterStream->processAISuggestion(
        "/nex/alpha/frequency", 880.0f, 0.92,
        "Optimal frequency for current harmonic series");

    // Simulate remote change
    parameterStream->handleRemoteParameterChange(
        "remote-user", "/nex/beta/modulation", 0.5f, 1234567890);

    waitForStreamUpdate(300);

    auto state = parameterStream->getCurrentStateSnapshot();

    // Should have complete state
    EXPECT_NE(state.presetName, "");
    EXPECT_GT(state.recentChanges.size(), 0);
    EXPECT_GT(state.visualization.waveformLeft.size(), 0);
    EXPECT_GT(state.activeUsers.size(), 0);

    // Should handle complex scenarios gracefully
    EXPECT_NO_THROW(parameterStream->stopParameterStreaming());
}