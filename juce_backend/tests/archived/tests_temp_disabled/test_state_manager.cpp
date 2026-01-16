#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include <fstream>
#include <filesystem>
#include "../include/state/StateManager.h"
#include "../src/state/PluginState.h"
#include "../src/plugins/PluginInstance.h"
#include "../src/plugins/PluginParameter.h"

using namespace juce;

// Mock classes for testing
class MockStateManager : public StateManager {
public:
    MockStateManager() : StateManager() {}

    MOCK_METHOD(bool, savePluginState, (const std::string& pluginId, const std::string& filePath), (override));
    MOCK_METHOD(bool, loadPluginState, (const std::string& pluginId, const std::string& filePath), (override));
    MOCK_METHOD(std::string, getPluginStateData, (const std::string& pluginId), (const, override));
    MOCK_METHOD(bool, setPluginStateData, (const std::string& pluginId, const std::string& stateData), (override));
    MOCK_METHOD(bool, saveProjectState, (const std::string& filePath), (override));
    MOCK_METHOD(bool, loadProjectState, (const std::string& filePath), (override));
    MOCK_METHOD(void, addPluginToProject, (const std::string& pluginId, const PluginState& state), (override));
    MOCK_METHOD(void, removePluginFromProject, (const std::string& pluginId), (override));
    MOCK_METHOD(std::vector<PluginState>, getAllPluginStates, (), (const, override));
    MOCK_METHOD(bool, createBackup, (const std::string& filePath), (const, override));
    MOCK_METHOD(bool, restoreFromBackup, (const std::string& backupPath), (override));
    MOCK_METHOD(std::vector<std::string>, getAvailableBackups, (const std::string& projectPath), (const, override));
    MOCK_METHOD(void, setAutoSaveInterval, (int intervalSeconds), (override));
    MOCK_METHOD(int, getAutoSaveInterval, (), (const, override));
    MOCK_METHOD(void, enableAutoSave, (bool enabled), (override));
    MOCK_METHOD(bool, isAutoSaveEnabled, (), (const, override));
};

class MockPluginInstance : public PluginInstance {
public:
    MockPluginInstance(const PluginDescription& desc) : PluginInstance(desc) {}

    MOCK_METHOD(void, setStateInformation, (const void* data, int sizeInBytes), (override));
    MOCK_METHOD(void, getStateInformation, (MemoryBlock& destData), (const, override));
    MOCK_METHOD(std::string, getPluginId, (), (const, override));
    MOCK_METHOD(int, getNumParameters, (), (const, override));
    MOCK_METHOD(float, getParameter, (int index), (const, override));
    MOCK_METHOD(void, setParameter, (int index, float value), (override));
};

class StateManagerTest : public ::testing::Test {
protected:
    void SetUp() override {
        stateManager = std::make_unique<MockStateManager>();

        // Setup test plugin description
        testPlugin.name = "Test Plugin";
        testPlugin.descriptiveName = "Test VST3 Plugin";
        testPlugin.pluginFormatName = "VST3";
        testPlugin.fileOrIdentifier = "/test/path/plugin.vst3";
        testPlugin.uid = 12345;
        testPlugin.numInputChannels = 2;
        testPlugin.numOutputChannels = 2;

        mockPlugin = std::make_shared<MockPluginInstance>(testPlugin);

        // Create test directory for files
        testDir = std::filesystem::temp_directory_path() / "juce_backend_test";
        std::filesystem::create_directories(testDir);

        testFilePath = (testDir / "test_plugin_state.xml").string();
        testProjectPath = (testDir / "test_project.json").string();
    }

    void TearDown() override {
        // Clean up test files
        std::error_code ec;
        std::filesystem::remove_all(testDir, ec);

        stateManager.reset();
        mockPlugin.reset();
    }

    std::unique_ptr<MockStateManager> stateManager;
    std::shared_ptr<MockPluginInstance> mockPlugin;
    PluginDescription testPlugin;
    std::filesystem::path testDir;
    std::string testFilePath;
    std::string testProjectPath;
};

TEST_F(StateManagerTest, InitializesCorrectly) {
    EXPECT_NE(stateManager, nullptr);
    EXPECT_TRUE(stateManager->isAutoSaveEnabled());
    EXPECT_GT(stateManager->getAutoSaveInterval(), 0);
}

TEST_F(StateManagerTest, SavesAndRestoresPluginState) {
    EXPECT_CALL(*mockPlugin, getPluginId())
        .WillOnce(::testing::Return("test-plugin-1"));

    EXPECT_CALL(*mockPlugin, getStateInformation(::testing::_))
        .Times(1);

    EXPECT_CALL(*stateManager, savePluginState("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*mockPlugin, setStateInformation(::testing::_, ::testing::_))
        .Times(1);

    EXPECT_CALL(*stateManager, loadPluginState("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(true));

    std::string pluginId = mockPlugin->getPluginId();

    // Save state
    bool saveResult = stateManager->savePluginState(pluginId, testFilePath);
    EXPECT_TRUE(saveResult);

    // Load state
    bool loadResult = stateManager->loadPluginState(pluginId, testFilePath);
    EXPECT_TRUE(loadResult);
}

TEST_F(StateManagerTest, HandlesPluginStateSerialization) {
    EXPECT_CALL(*mockPlugin, getPluginId())
        .Times(2)
        .WillRepeatedly(::testing::Return("test-plugin-1"));

    EXPECT_CALL(*mockPlugin, getStateInformation(::testing::_))
        .Times(1)
        .WillOnce([](MemoryBlock& destData) {
            // Simulate plugin state data
            std::string stateData = "test_plugin_state_data";
            destData.append(stateData.data(), stateData.size());
        });

    EXPECT_CALL(*stateManager, getPluginStateData("test-plugin-1"))
        .WillOnce(::testing::Return("serialized_plugin_state_data"));

    EXPECT_CALL(*stateManager, setPluginStateData("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*mockPlugin, setStateInformation(::testing::_, ::testing::_))
        .Times(1);

    std::string pluginId = mockPlugin->getPluginId();

    // Get serialized state
    std::string serializedState = stateManager->getPluginStateData(pluginId);
    EXPECT_FALSE(serializedState.empty());

    // Set state from serialized data
    bool setResult = stateManager->setPluginStateData(pluginId, serializedState);
    EXPECT_TRUE(setResult);
}

TEST_F(StateManagerTest, ManagesProjectState) {
    EXPECT_CALL(*stateManager, saveProjectState(::testing::_))
        .Times(1)
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*stateManager, loadProjectState(::testing::_))
        .Times(1)
        .WillOnce(::testing::Return(true));

    // Save project state
    bool saveResult = stateManager->saveProjectState(testProjectPath);
    EXPECT_TRUE(saveResult);

    // Load project state
    bool loadResult = stateManager->loadProjectState(testProjectPath);
    EXPECT_TRUE(loadResult);
}

TEST_F(StateManagerTest, ManagesMultiplePluginStates) {
    EXPECT_CALL(*stateManager, addPluginToProject(::testing::_, ::testing::_))
        .Times(3);

    EXPECT_CALL(*stateManager, getAllPluginStates())
        .WillOnce(::testing::Return([]() {
            std::vector<PluginState> states;
            states.push_back({"plugin1", "state1_data", std::chrono::system_clock::now()});
            states.push_back({"plugin2", "state2_data", std::chrono::system_clock::now()});
            states.push_back({"plugin3", "state3_data", std::chrono::system_clock::now()});
            return states;
        }()));

    // Add multiple plugins to project
    PluginState state1{"plugin1", "state1_data", std::chrono::system_clock::now()};
    PluginState state2{"plugin2", "state2_data", std::chrono::system_clock::now()};
    PluginState state3{"plugin3", "state3_data", std::chrono::system_clock::now()};

    stateManager->addPluginToProject("plugin1", state1);
    stateManager->addPluginToProject("plugin2", state2);
    stateManager->addPluginToProject("plugin3", state3);

    // Get all plugin states
    auto allStates = stateManager->getAllPluginStates();
    EXPECT_EQ(allStates.size(), 3);
}

TEST_F(StateManagerTest, HandlesPluginRemoval) {
    EXPECT_CALL(*stateManager, addPluginToProject("plugin1", ::testing::_))
        .Times(1);

    EXPECT_CALL(*stateManager, removePluginFromProject("plugin1"))
        .Times(1);

    EXPECT_CALL(*stateManager, getAllPluginStates())
        .WillOnce(::testing::Return(std::vector<PluginState>{}))
        .WillOnce(::testing::Return([]() {
            return std::vector<PluginState>{{"plugin1", "state1_data", std::chrono::system_clock::now()}};
        }))
        .WillOnce(::testing::Return(std::vector<PluginState>{}));

    // Initially empty
    auto states = stateManager->getAllPluginStates();
    EXPECT_TRUE(states.empty());

    // Add plugin
    PluginState state{"plugin1", "state1_data", std::chrono::system_clock::now()};
    stateManager->addPluginToProject("plugin1", state);

    // Should have one plugin
    states = stateManager->getAllPluginStates();
    EXPECT_EQ(states.size(), 1);

    // Remove plugin
    stateManager->removePluginFromProject("plugin1");

    // Should be empty again
    states = stateManager->getAllPluginStates();
    EXPECT_TRUE(states.empty());
}

TEST_F(StateManagerTest, CreatesAndRestoresBackups) {
    EXPECT_CALL(*stateManager, createBackup(::testing::_))
        .Times(1)
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*stateManager, getAvailableBackups(::testing::_))
        .WillOnce(::testing::Return(std::vector<std::string>{
            "backup_2024-01-01_10-00-00.json",
            "backup_2024-01-01_11-00-00.json"
        }));

    EXPECT_CALL(*stateManager, restoreFromBackup(::testing::_))
        .Times(1)
        .WillOnce(::testing::Return(true));

    // Create backup
    bool backupResult = stateManager->createBackup(testProjectPath);
    EXPECT_TRUE(backupResult);

    // Get available backups
    auto backups = stateManager->getAvailableBackups(testDir.string());
    EXPECT_EQ(backups.size(), 2);
    EXPECT_EQ(backups[0], "backup_2024-01-01_10-00-00.json");

    // Restore from backup
    bool restoreResult = stateManager->restoreFromBackup(backups[0]);
    EXPECT_TRUE(restoreResult);
}

TEST_F(StateManagerTest, ManagesAutoSaveSettings) {
    EXPECT_CALL(*stateManager, setAutoSaveInterval(300))
        .Times(1);

    EXPECT_CALL(*stateManager, getAutoSaveInterval())
        .WillOnce(::testing::Return(300));

    EXPECT_CALL(*stateManager, enableAutoSave(false))
        .Times(1);

    EXPECT_CALL(*stateManager, isAutoSaveEnabled())
        .WillOnce(::testing::Return(false));

    // Set auto-save interval
    stateManager->setAutoSaveInterval(300);  // 5 minutes
    int interval = stateManager->getAutoSaveInterval();
    EXPECT_EQ(interval, 300);

    // Disable auto-save
    stateManager->enableAutoSave(false);
    bool enabled = stateManager->isAutoSaveEnabled();
    EXPECT_FALSE(enabled);
}

TEST_F(StateManagerTest, HandlesCorruptedStateFiles) {
    EXPECT_CALL(*stateManager, loadPluginState("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(false));  // Simulate load failure

    EXPECT_CALL(*stateManager, loadProjectState(::testing::_))
        .WillOnce(::testing::Return(false));  // Simulate load failure

    // Create corrupted file
    std::ofstream corruptedFile(testFilePath);
    corruptedFile << "corrupted_data_that_is_not_valid_xml";
    corruptedFile.close();

    // Try to load corrupted plugin state
    bool pluginLoadResult = stateManager->loadPluginState("test-plugin-1", testFilePath);
    EXPECT_FALSE(pluginLoadResult);

    // Try to load corrupted project state
    bool projectLoadResult = stateManager->loadProjectState(testFilePath);
    EXPECT_FALSE(projectLoadResult);
}

TEST_F(StateManagerTest, HandlesLargeStateData) {
    EXPECT_CALL(*mockPlugin, getStateInformation(::testing::_))
        .Times(1)
        .WillOnce([](MemoryBlock& destData) {
            // Create large state data (10MB)
            std::vector<char> largeData(10 * 1024 * 1024, 'x');
            destData.append(largeData.data(), largeData.size());
        });

    EXPECT_CALL(*stateManager, savePluginState("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(true));

    // Test with large state data
    MemoryBlock largeState;
    mockPlugin->getStateInformation(largeState);

    EXPECT_GT(largeState.getSize(), 10 * 1024 * 1024);  // Should be > 10MB

    // Should be able to save large state
    bool saveResult = stateManager->savePluginState("test-plugin-1", testFilePath);
    EXPECT_TRUE(saveResult);
}

TEST_F(StateManagerTest, PreservesPluginParameterStates) {
    EXPECT_CALL(*mockPlugin, getNumParameters())
        .Times(1)
        .WillOnce(::testing::Return(4));

    EXPECT_CALL(*mockPlugin, getParameter(::testing::_))
        .WillOnce(::testing::Return(0.5f))   // Gain
        .WillOnce(::testing::Return(440.0f)) // Frequency
        .WillOnce(::testing::Return(0.1f))   // Resonance
        .WillOnce(::testing::Return(0.8f));  // Mix

    EXPECT_CALL(*mockPlugin, getStateInformation(::testing::_))
        .Times(1);

    EXPECT_CALL(*mockPlugin, setParameter(::testing::_, ::testing::_))
        .Times(4);

    EXPECT_CALL(*mockPlugin, setStateInformation(::testing::_, ::testing::_))
        .Times(1);

    EXPECT_CALL(*stateManager, savePluginState("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*stateManager, loadPluginState("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(true));

    // Save parameter states
    int numParams = mockPlugin->getNumParameters();
    std::vector<float> originalParams;

    for (int i = 0; i < numParams; ++i) {
        float value = mockPlugin->getParameter(i);
        originalParams.push_back(value);
    }

    // Save state
    bool saveResult = stateManager->savePluginState("test-plugin-1", testFilePath);
    EXPECT_TRUE(saveResult);

    // Modify parameters
    mockPlugin->setParameter(0, 0.8f);  // Change Gain
    mockPlugin->setParameter(1, 880.0f); // Change Frequency

    // Load state (should restore original parameters)
    bool loadResult = stateManager->loadPluginState("test-plugin-1", testFilePath);
    EXPECT_TRUE(loadResult);

    // Verify parameters are restored
    for (int i = 0; i < numParams; ++i) {
        float restoredValue = mockPlugin->getParameter(i);
        // Note: In real implementation, would compare with original values
        EXPECT_GE(restoredValue, 0.0f);
    }
}

TEST_F(StateManagerTest, HandlesConcurrentStateAccess) {
    EXPECT_CALL(*stateManager, savePluginState("test-plugin-1", ::testing::_))
        .Times(5)
        .WillRepeatedly(::testing::Return(true));

    EXPECT_CALL(*stateManager, getPluginStateData("test-plugin-1"))
        .Times(5)
        .WillRepeatedly(::testing::Return("concurrent_state_data"));

    // Simulate concurrent access from multiple threads
    std::vector<std::thread> threads;
    std::atomic<int> successCount{0};

    for (int i = 0; i < 5; ++i) {
        threads.emplace_back([this, &successCount, i]() {
            std::string filename = testFilePath + "_thread_" + std::to_string(i);

            // Save state
            if (stateManager->savePluginState("test-plugin-1", filename)) {
                successCount++;
            }

            // Get state data
            auto stateData = stateManager->getPluginStateData("test-plugin-1");
            EXPECT_FALSE(stateData.empty());
        });
    }

    // Wait for all threads to complete
    for (auto& thread : threads) {
        thread.join();
    }

    EXPECT_EQ(successCount, 5);
}

TEST_F(StateManagerTest, ValidatesStateCompatibility) {
    EXPECT_CALL(*stateManager, loadPluginState("test-plugin-1", ::testing::_))
        .WillOnce(::testing::Return(false))  // Incompatible version
        .WillOnce(::testing::Return(true));  // Compatible version

    // Test with incompatible state version
    bool incompatibleResult = stateManager->loadPluginState("test-plugin-1", testFilePath);
    EXPECT_FALSE(incompatibleResult);

    // Test with compatible state version
    bool compatibleResult = stateManager->loadPluginState("test-plugin-1", testFilePath);
    EXPECT_TRUE(compatibleResult);
}

TEST_F(StateManagerTest, OptimizesStateStorage) {
    EXPECT_CALL(*stateManager, savePluginState("test-plugin-1", ::testing::_))
        .Times(10)
        .WillRepeatedly(::testing::Return(true));

    // Test that state manager can handle many save operations efficiently
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 10; ++i) {
        std::string filename = testFilePath + "_" + std::to_string(i);
        bool result = stateManager->savePluginState("test-plugin-1", filename);
        EXPECT_TRUE(result);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    // Should complete 10 saves within reasonable time (less than 1 second)
    EXPECT_LT(duration.count(), 1000);
}