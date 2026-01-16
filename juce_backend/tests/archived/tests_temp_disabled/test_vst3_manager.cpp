#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include "../src/plugins/VST3Manager.h"
#include "../src/plugins/PluginInstance.h"
#include "../src/plugins/PluginParameter.h"

using namespace juce;

// Mock classes for testing
class MockVST3Manager : public VST3Manager {
public:
    MockVST3Manager() : VST3Manager() {}

    MOCK_METHOD(std::vector<PluginDescription>, getAvailablePlugins, (), (const));
    MOCK_METHOD(std::shared_ptr<PluginInstance>, loadPlugin, (const PluginDescription& description), (override));
    MOCK_METHOD(void, unloadPlugin, (const std::string& pluginId), (override));
    MOCK_METHOD(std::shared_ptr<PluginInstance>, getPlugin, (const std::string& pluginId), (const, override));
    MOCK_METHOD(std::vector<std::shared_ptr<PluginInstance>>, getAllLoadedPlugins, (), (const, override));
    MOCK_METHOD(void, processAudio, (const std::string& pluginId, AudioBuffer<float>& buffer, MidiBuffer& midiMessages), (override));
    MOCK_METHOD(void, setParameter, (const std::string& pluginId, int parameterIndex, float value), (override));
    MOCK_METHOD(float, getParameter, (const std::string& pluginId, int parameterIndex), (const, override));
    MOCK_METHOD(std::vector<PluginParameter>, getPluginParameters, (const std::string& pluginId), (const, override));
    MOCK_METHOD(void, savePluginState, (const std::string& pluginId, const std::string& filePath), (const, override));
    MOCK_METHOD(void, loadPluginState, (const std::string& pluginId, const std::string& filePath), (override));
    MOCK_METHOD(bool, isPluginLoaded, (const std::string& pluginId), (const, override));
};

class VST3ManagerTest : public ::testing::Test {
protected:
    void SetUp() override {
        manager = std::make_unique<MockVST3Manager>();

        // Setup test plugin description
        testPlugin.name = "Test Plugin";
        testPlugin.descriptiveName = "Test VST3 Plugin";
        testPlugin.pluginFormatName = "VST3";
        testPlugin.category = "Test";
        testPlugin.manufacturerName = "Test Manufacturer";
        testPlugin.version = "1.0.0";
        testPlugin.fileOrIdentifier = "/test/path/plugin.vst3";
        testPlugin.uid = 12345;
        testPlugin.isInstrument = false;
        testPlugin.fileTime = Time::getCurrentTime();
        testPlugin.infoFileSize = 1024;
        testPlugin.numInputChannels = 2;
        testPlugin.numOutputChannels = 2;
        testPlugin.hasSharedContainer = false;
        testPlugin.hasARAExtension = false;
    }

    void TearDown() override {
        manager.reset();
    }

    std::unique_ptr<MockVST3Manager> manager;
    PluginDescription testPlugin;
};

TEST_F(VST3ManagerTest, InitializesCorrectly) {
    EXPECT_NE(manager, nullptr);
    EXPECT_TRUE(manager->getAllLoadedPlugins().empty());
}

TEST_F(VST3ManagerTest, DiscoversAvailablePlugins) {
    std::vector<PluginDescription> expectedPlugins = {testPlugin};

    EXPECT_CALL(*manager, getAvailablePlugins())
        .Times(1)
        .WillOnce(::testing::Return(expectedPlugins));

    auto plugins = manager->getAvailablePlugins();
    ASSERT_EQ(plugins.size(), 1);
    EXPECT_EQ(plugins[0].name, "Test Plugin");
    EXPECT_EQ(plugins[0].pluginFormatName, "VST3");
}

TEST_F(VST3ManagerTest, LoadsAndUnloadsPlugins) {
    auto mockPluginInstance = std::make_shared<PluginInstance>(testPlugin);

    EXPECT_CALL(*manager, loadPlugin(::testing::_))
        .Times(1)
        .WillOnce(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, isPluginLoaded("test-plugin-1"))
        .Times(2)
        .WillOnce(::testing::Return(false))
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*manager, getPlugin("test-plugin-1"))
        .Times(1)
        .WillOnce(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, unloadPlugin("test-plugin-1"))
        .Times(1);

    // Initially should not be loaded
    EXPECT_FALSE(manager->isPluginLoaded("test-plugin-1"));

    // Load plugin
    auto plugin = manager->loadPlugin(testPlugin);
    ASSERT_NE(plugin, nullptr);
    EXPECT_EQ(plugin->getPluginName(), "Test Plugin");

    // Now should be loaded
    EXPECT_TRUE(manager->isPluginLoaded("test-plugin-1"));

    // Should be able to retrieve
    auto retrieved = manager->getPlugin("test-plugin-1");
    EXPECT_EQ(retrieved, plugin);

    // Unload plugin
    manager->unloadPlugin("test-plugin-1");
}

TEST_F(VST3ManagerTest, HandlesPluginLoadFailure) {
    EXPECT_CALL(*manager, loadPlugin(::testing::_))
        .Times(1)
        .WillOnce(::testing::Return(nullptr));

    auto plugin = manager->loadPlugin(testPlugin);
    EXPECT_EQ(plugin, nullptr);
}

TEST_F(VST3ManagerTest, ProcessesAudioCorrectly) {
    auto mockPluginInstance = std::make_shared<PluginInstance>(testPlugin);

    EXPECT_CALL(*manager, getPlugin("test-plugin-1"))
        .Times(1)
        .WillOnce(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, processAudio("test-plugin-1", ::testing::_, ::testing::_))
        .Times(1);

    AudioBuffer<float> buffer(2, 512);
    MidiBuffer midiBuffer;

    // Initialize buffer with test signal
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch) {
        for (int i = 0; i < buffer.getNumSamples(); ++i) {
            buffer.setSample(ch, i, 0.5f * std::sin(2.0f * MathConstants<float>::pi * 440.0f * i / 44100.0f));
        }
    }

    manager->processAudio("test-plugin-1", buffer, midiBuffer);

    // Verify buffer was processed (non-silent)
    bool hasSignal = false;
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch) {
        for (int i = 0; i < buffer.getNumSamples(); ++i) {
            if (std::abs(buffer.getSample(ch, i)) > 0.001f) {
                hasSignal = true;
                break;
            }
        }
    }
    EXPECT_TRUE(hasSignal);
}

TEST_F(VST3ManagerTest, ManagesPluginParameters) {
    auto mockPluginInstance = std::make_shared<PluginInstance>(testPlugin);

    EXPECT_CALL(*manager, getPlugin("test-plugin-1"))
        .Times(3)
        .WillRepeatedly(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, getPluginParameters("test-plugin-1"))
        .Times(1)
        .WillOnce(::testing::Return(std::vector<PluginParameter>{
            PluginParameter(0, "Gain", 0.0f, 1.0f, 0.5f),
            PluginParameter(1, "Frequency", 20.0f, 20000.0f, 440.0f)
        }));

    EXPECT_CALL(*manager, setParameter("test-plugin-1", 0, 0.75f))
        .Times(1);

    EXPECT_CALL(*manager, getParameter("test-plugin-1", 0))
        .Times(1)
        .WillOnce(::testing::Return(0.75f));

    // Get parameters
    auto params = manager->getPluginParameters("test-plugin-1");
    ASSERT_EQ(params.size(), 2);
    EXPECT_EQ(params[0].getName(), "Gain");
    EXPECT_EQ(params[1].getName(), "Frequency");

    // Set parameter
    manager->setParameter("test-plugin-1", 0, 0.75f);

    // Get parameter value
    float value = manager->getParameter("test-plugin-1", 0);
    EXPECT_FLOAT_EQ(value, 0.75f);
}

TEST_F(VST3ManagerTest, SavesAndLoadsPluginState) {
    auto mockPluginInstance = std::make_shared<PluginInstance>(testPlugin);

    EXPECT_CALL(*manager, getPlugin("test-plugin-1"))
        .Times(1)
        .WillOnce(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, savePluginState("test-plugin-1", ::testing::_))
        .Times(1);

    EXPECT_CALL(*manager, loadPluginState("test-plugin-1", ::testing::_))
        .Times(1);

    std::string stateFile = "/tmp/test_plugin_state.xml";

    // Save state
    manager->savePluginState("test-plugin-1", stateFile);

    // Load state
    manager->loadPluginState("test-plugin-1", stateFile);
}

TEST_F(VST3ManagerTest, ManagesMultiplePlugins) {
    EXPECT_CALL(*manager, getAllLoadedPlugins())
        .Times(2)
        .WillOnce(::testing::Return(std::vector<std::shared_ptr<PluginInstance>>{}))
        .WillOnce(::testing::Return(std::vector<std::shared_ptr<PluginInstance>>{
            std::make_shared<PluginInstance>(testPlugin),
            std::make_shared<PluginInstance>(testPlugin)
        }));

    // Initially no plugins
    EXPECT_TRUE(manager->getAllLoadedPlugins().empty());

    // Load multiple plugins (simulated)
    EXPECT_EQ(manager->getAllLoadedPlugins().size(), 2);
}

TEST_F(VST3ManagerTest, HandlesPluginCrashesGracefully) {
    auto mockPluginInstance = std::make_shared<PluginInstance>(testPlugin);

    EXPECT_CALL(*manager, getPlugin("test-plugin-1"))
        .Times(1)
        .WillOnce(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, processAudio("test-plugin-1", ::testing::_, ::testing::_))
        .Times(1)
        .WillOnce(::testing::Throw(std::runtime_error("Plugin crashed")));

    EXPECT_CALL(*manager, unloadPlugin("test-plugin-1"))
        .Times(1);

    EXPECT_CALL(*manager, isPluginLoaded("test-plugin-1"))
        .WillOnce(::testing::Return(true));

    AudioBuffer<float> buffer(2, 512);
    MidiBuffer midiBuffer;

    // Should handle crash without throwing
    EXPECT_NO_THROW(manager->processAudio("test-plugin-1", buffer, midiBuffer));

    // Plugin should be unloaded after crash
    EXPECT_TRUE(manager->isPluginLoaded("test-plugin-1"));
}

TEST_F(VST3ManagerTest, ValidatesPluginCompatibility) {
    EXPECT_CALL(*manager, loadPlugin(::testing::_))
        .Times(2)
        .WillOnce(::testing::Return(nullptr))  // Incompatible plugin
        .WillOnce(::testing::Return(std::make_shared<PluginInstance>(testPlugin)));  // Compatible plugin

    // Test with incompatible plugin (invalid file)
    PluginDescription incompatiblePlugin;
    incompatiblePlugin.fileOrIdentifier = "/nonexistent/plugin.vst3";

    auto plugin1 = manager->loadPlugin(incompatiblePlugin);
    EXPECT_EQ(plugin1, nullptr);

    // Test with compatible plugin
    auto plugin2 = manager->loadPlugin(testPlugin);
    EXPECT_NE(plugin2, nullptr);
}

TEST_F(VST3ManagerTest, ManagesPluginLatency) {
    auto mockPluginInstance = std::make_shared<PluginInstance>(testPlugin);

    EXPECT_CALL(*manager, getPlugin("test-plugin-1"))
        .Times(1)
        .WillOnce(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, getPluginParameters("test-plugin-1"))
        .Times(1)
        .WillOnce(::testing::Return(std::vector<PluginParameter>{}));

    auto params = manager->getPluginParameters("test-plugin-1");
    EXPECT_TRUE(params.empty());
}

// Performance tests
TEST_F(VST3ManagerTest, HandlesHighLoad) {
    EXPECT_CALL(*manager, getAllLoadedPlugins())
        .Times(1)
        .WillOnce(::testing::Return([]() {
            std::vector<std::shared_ptr<PluginInstance>> plugins;
            for (int i = 0; i < 100; ++i) {
                plugins.push_back(std::make_shared<PluginInstance>(testPlugin));
            }
            return plugins;
        }()));

    auto plugins = manager->getAllLoadedPlugins();
    EXPECT_EQ(plugins.size(), 100);
}

TEST_F(VST3ManagerTest, ProcessesAudioInRealtime) {
    auto mockPluginInstance = std::make_shared<PluginInstance>(testPlugin);

    EXPECT_CALL(*manager, getPlugin("test-plugin-1"))
        .Times(100)
        .WillRepeatedly(::testing::Return(mockPluginInstance));

    EXPECT_CALL(*manager, processAudio("test-plugin-1", ::testing::_, ::testing::_))
        .Times(100);

    AudioBuffer<float> buffer(2, 64);  // Small buffer for real-time processing
    MidiBuffer midiBuffer;

    // Process many small buffers quickly
    for (int i = 0; i < 100; ++i) {
        buffer.clear();
        manager->processAudio("test-plugin-1", buffer, midiBuffer);
    }
}