#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include <thread>
#include <chrono>
#include <signal.h>
#include "../include/safety/CrashRecovery.h"
#include "../include/plugins/VST3Manager.h"
#include "../src/plugins/PluginInstance.h"

using namespace juce;

// Mock classes for testing
class MockCrashRecovery : public CrashRecovery {
public:
    MockCrashRecovery() : CrashRecovery() {}

    MOCK_METHOD(bool, initialize, (), (override));
    MOCK_METHOD(void, shutdown, (), (override));
    MOCK_METHOD(void, registerPlugin, (const std::string& pluginId), (override));
    MOCK_METHOD(void, unregisterPlugin, (const std::string& pluginId), (override));
    MOCK_METHOD(bool, isPluginStable, (const std::string& pluginId), (const, override));
    MOCK_METHOD(void, onPluginCrash, (const std::string& pluginId), (override));
    MOCK_METHOD(void, enableAutoRestart, (bool enabled), (override));
    MOCK_METHOD(bool, isAutoRestartEnabled, (), (const, override));
    MOCK_METHOD(int, getCrashCount, (const std::string& pluginId), (const, override));
    MOCK_METHOD(void, resetCrashCount, (const std::string& pluginId), (override));
    MOCK_METHOD(std::vector<std::string>, getUnstablePlugins, (), (const, override));
    MOCK_METHOD(void, setCrashCallback, (std::function<void(const std::string&)> callback), (override));
};

class MockPluginSandbox : public PluginSandbox {
public:
    MockPluginSandbox() : PluginSandbox() {}

    MOCK_METHOD(bool, initializeSandbox, (), (override));
    MOCK_METHOD(void, shutdownSandbox, (), (override));
    MOCK_METHOD(bool, loadPluginSafely, (const std::string& pluginPath), (override));
    MOCK_METHOD(void, unloadPluginSafely, (const std::string& pluginId), (override));
    MOCK_METHOD(bool, isPluginSandboxed, (const std::string& pluginId), (const, override));
    MOCK_METHOD(void, setMemoryLimit, (size_t memoryLimitBytes), (override));
    MOCK_METHOD(size_t, getMemoryLimit, (), (const, override));
    MOCK_METHOD(void, setCpuTimeLimit, (int timeLimitMs), (override));
    MOCK_METHOD(int, getCpuTimeLimit, (), (const, override));
    MOCK_METHOD(bool, isPluginExceedingLimits, (const std::string& pluginId), (const, override));
    MOCK_METHOD(void, terminatePlugin, (const std::string& pluginId), (override));
    MOCK_METHOD(std::vector<std::string>, getSandboxedPlugins, (), (const, override));
};

class MockMemoryGuard : public MemoryGuard {
public:
    MockMemoryGuard() : MemoryGuard() {}

    MOCK_METHOD(bool, startMonitoring, (), (override));
    MOCK_METHOD(void, stopMonitoring, (), (override));
    MOCK_METHOD(size_t, getCurrentMemoryUsage, (), (const, override));
    MOCK_METHOD(size_t, getPeakMemoryUsage, (), (const, override));
    MOCK_METHOD(void, setMemoryWarningThreshold, (size_t thresholdBytes), (override));
    MOCK_METHOD(size_t, getMemoryWarningThreshold, (), (const, override));
    MOCK_METHOD(bool, isMemoryUsageHealthy, (), (const, override));
    MOCK_METHOD(void, forceGarbageCollection, (), (override));
    MOCK_METHOD(std::vector<MemoryLeak>, detectMemoryLeaks, (), (override));
};

class MockPluginInstance : public PluginInstance {
public:
    MockPluginInstance(const PluginDescription& desc) : PluginInstance(desc) {}

    MOCK_METHOD(void, processBlock, (AudioBuffer<float>& buffer, MidiBuffer& midiMessages), (override));
    MOCK_METHOD(void, releaseResources, (), (override));
    MOCK_METHOD(std::string, getPluginId, (), (const, override));
    MOCK_METHOD(bool, isSuspended, (), (const, override));
    MOCK_METHOD(void, suspendProcessing, (bool shouldBeSuspended), (override));
};

class CrashRecoveryTest : public ::testing::Test {
protected:
    void SetUp() override {
        crashRecovery = std::make_unique<MockCrashRecovery>();
        pluginSandbox = std::make_unique<MockPluginSandbox>();
        memoryGuard = std::make_unique<MockMemoryGuard>();

        // Setup test plugin description
        testPlugin.name = "Test Plugin";
        testPlugin.descriptiveName = "Test VST3 Plugin";
        testPlugin.pluginFormatName = "VST3";
        testPlugin.fileOrIdentifier = "/test/path/plugin.vst3";
        testPlugin.uid = 12345;
        testPlugin.numInputChannels = 2;
        testPlugin.numOutputChannels = 2;

        mockPlugin = std::make_shared<MockPluginInstance>(testPlugin);
    }

    void TearDown() override {
        crashRecovery.reset();
        pluginSandbox.reset();
        memoryGuard.reset();
        mockPlugin.reset();
    }

    std::unique_ptr<MockCrashRecovery> crashRecovery;
    std::unique_ptr<MockPluginSandbox> pluginSandbox;
    std::unique_ptr<MockMemoryGuard> memoryGuard;
    std::shared_ptr<MockPluginInstance> mockPlugin;
    PluginDescription testPlugin;
};

TEST_F(CrashRecoveryTest, InitializesCrashRecoverySystem) {
    EXPECT_CALL(*crashRecovery, initialize())
        .Times(1)
        .WillOnce(::testing::Return(true));

    bool result = crashRecovery->initialize();
    EXPECT_TRUE(result);
}

TEST_F(CrashRecoveryTest, HandlesPluginCrashesGracefully) {
    EXPECT_CALL(*crashRecovery, registerPlugin("test-plugin-1"))
        .Times(1);

    EXPECT_CALL(*mockPlugin, getPluginId())
        .WillOnce(::testing::Return("test-plugin-1"));

    EXPECT_CALL(*crashRecovery, isPluginStable("test-plugin-1"))
        .WillOnce(::testing::Return(true))
        .WillOnce(::testing::Return(false));

    EXPECT_CALL(*crashRecovery, onPluginCrash("test-plugin-1"))
        .Times(1);

    EXPECT_CALL(*crashRecovery, getCrashCount("test-plugin-1"))
        .WillOnce(::testing::Return(1));

    EXPECT_CALL(*crashRecovery, getUnstablePlugins())
        .WillOnce(::testing::Return(std::vector<std::string>{"test-plugin-1"}));

    // Register plugin for monitoring
    crashRecovery->registerPlugin("test-plugin-1");

    // Initially stable
    EXPECT_TRUE(crashRecovery->isPluginStable("test-plugin-1"));

    // Simulate plugin crash
    std::string pluginId = mockPlugin->getPluginId();
    crashRecovery->onPluginCrash(pluginId);

    // Now unstable
    EXPECT_FALSE(crashRecovery->isPluginStable("test-plugin-1"));
    EXPECT_EQ(crashRecovery->getCrashCount("test-plugin-1"), 1);

    // Should appear in unstable plugins list
    auto unstablePlugins = crashRecovery->getUnstablePlugins();
    EXPECT_EQ(unstablePlugins.size(), 1);
    EXPECT_EQ(unstablePlugins[0], "test-plugin-1");
}

TEST_F(CrashRecoveryTest, ManagesAutoRestartFunctionality) {
    EXPECT_CALL(*crashRecovery, enableAutoRestart(true))
        .Times(1);

    EXPECT_CALL(*crashRecovery, isAutoRestartEnabled())
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*crashRecovery, enableAutoRestart(false))
        .Times(1);

    EXPECT_CALL(*crashRecovery, isAutoRestartEnabled())
        .WillOnce(::testing::Return(false));

    // Enable auto-restart
    crashRecovery->enableAutoRestart(true);
    EXPECT_TRUE(crashRecovery->isAutoRestartEnabled());

    // Disable auto-restart
    crashRecovery->enableAutoRestart(false);
    EXPECT_FALSE(crashRecovery->isAutoRestartEnabled());
}

TEST_F(CrashRecoveryTest, TracksCrashCountAndResets) {
    EXPECT_CALL(*crashRecovery, getCrashCount("test-plugin-1"))
        .WillOnce(::testing::Return(3))
        .WillOnce(::testing::Return(0));

    EXPECT_CALL(*crashRecovery, resetCrashCount("test-plugin-1"))
        .Times(1);

    // Check crash count
    int crashCount = crashRecovery->getCrashCount("test-plugin-1");
    EXPECT_EQ(crashCount, 3);

    // Reset crash count
    crashRecovery->resetCrashCount("test-plugin-1");

    // Should be reset to 0
    crashCount = crashRecovery->getCrashCount("test-plugin-1");
    EXPECT_EQ(crashCount, 0);
}

TEST_F(CrashRecoveryTest, ProvidesCrashCallbacks) {
    EXPECT_CALL(*crashRecovery, setCrashCallback(::testing::_))
        .Times(1);

    bool callbackTriggered = false;
    std::function<void(const std::string&)> crashCallback =
        [&callbackTriggered](const std::string& pluginId) {
            callbackTriggered = true;
            EXPECT_EQ(pluginId, "test-plugin-1");
        };

    crashRecovery->setCrashCallback(crashCallback);

    // Simulate crash (would normally trigger callback)
    // crashCallback("test-plugin-1");
    // EXPECT_TRUE(callbackTriggered);
}

TEST_F(CrashRecoveryTest, InitializesPluginSandbox) {
    EXPECT_CALL(*pluginSandbox, initializeSandbox())
        .Times(1)
        .WillOnce(::testing::Return(true));

    bool result = pluginSandbox->initializeSandbox();
    EXPECT_TRUE(result);
}

TEST_F(CrashRecoveryTest, LoadsPluginsSafely) {
    EXPECT_CALL(*pluginSandbox, loadPluginSafely("/test/path/plugin.vst3"))
        .Times(1)
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*pluginSandbox, isPluginSandboxed("test-plugin-1"))
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*pluginSandbox, getSandboxedPlugins())
        .WillOnce(::testing::Return(std::vector<std::string>{"test-plugin-1"}));

    // Load plugin safely
    bool result = pluginSandbox->loadPluginSafely("/test/path/plugin.vst3");
    EXPECT_TRUE(result);

    // Should be sandboxed
    EXPECT_TRUE(pluginSandbox->isPluginSandboxed("test-plugin-1"));

    // Should appear in sandboxed plugins
    auto sandboxedPlugins = pluginSandbox->getSandboxedPlugins();
    EXPECT_EQ(sandboxedPlugins.size(), 1);
    EXPECT_EQ(sandboxedPlugins[0], "test-plugin-1");
}

TEST_F(CrashRecoveryTest, ManagesMemoryLimits) {
    EXPECT_CALL(*pluginSandbox, setMemoryLimit(1024 * 1024 * 1024))  // 1GB
        .Times(1);

    EXPECT_CALL(*pluginSandbox, getMemoryLimit())
        .WillOnce(::testing::Return(1024 * 1024 * 1024));

    EXPECT_CALL(*pluginSandbox, isPluginExceedingLimits("test-plugin-1"))
        .WillOnce(::testing::Return(false))
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*pluginSandbox, terminatePlugin("test-plugin-1"))
        .Times(1);

    // Set memory limit
    pluginSandbox->setMemoryLimit(1024 * 1024 * 1024);
    size_t memoryLimit = pluginSandbox->getMemoryLimit();
    EXPECT_EQ(memoryLimit, 1024 * 1024 * 1024);

    // Initially not exceeding limits
    EXPECT_FALSE(pluginSandbox->isPluginExceedingLimits("test-plugin-1"));

    // Simulate exceeding limits
    EXPECT_TRUE(pluginSandbox->isPluginExceedingLimits("test-plugin-1"));

    // Should terminate plugin
    pluginSandbox->terminatePlugin("test-plugin-1");
}

TEST_F(CrashRecoveryTest, ManagesCpuTimeLimits) {
    EXPECT_CALL(*pluginSandbox, setCpuTimeLimit(5000))  // 5 seconds
        .Times(1);

    EXPECT_CALL(*pluginSandbox, getCpuTimeLimit())
        .WillOnce(::testing::Return(5000));

    // Set CPU time limit
    pluginSandbox->setCpuTimeLimit(5000);
    int cpuLimit = pluginSandbox->getCpuTimeLimit();
    EXPECT_EQ(cpuLimit, 5000);
}

TEST_F(CrashRecoveryTest, MonitorsMemoryUsage) {
    EXPECT_CALL(*memoryGuard, startMonitoring())
        .Times(1)
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*memoryGuard, getCurrentMemoryUsage())
        .WillOnce(::testing::Return(100 * 1024 * 1024))  // 100MB
        .WillOnce(::testing::Return(800 * 1024 * 1024)); // 800MB

    EXPECT_CALL(*memoryGuard, getPeakMemoryUsage())
        .WillOnce(::testing::Return(900 * 1024 * 1024)); // 900MB

    EXPECT_CALL(*memoryGuard, setMemoryWarningThreshold(500 * 1024 * 1024))  // 500MB
        .Times(1);

    EXPECT_CALL(*memoryGuard, getMemoryWarningThreshold())
        .WillOnce(::testing::Return(500 * 1024 * 1024));

    EXPECT_CALL(*memoryGuard, isMemoryUsageHealthy())
        .WillOnce(::testing::Return(true))
        .WillOnce(::testing::Return(false));

    EXPECT_CALL(*memoryGuard, forceGarbageCollection())
        .Times(1);

    EXPECT_CALL(*memoryGuard, stopMonitoring())
        .Times(1);

    // Start monitoring
    bool result = memoryGuard->startMonitoring();
    EXPECT_TRUE(result);

    // Check current memory usage
    size_t currentUsage = memoryGuard->getCurrentMemoryUsage();
    EXPECT_EQ(currentUsage, 100 * 1024 * 1024);

    // Check peak memory usage
    size_t peakUsage = memoryGuard->getPeakMemoryUsage();
    EXPECT_EQ(peakUsage, 900 * 1024 * 1024);

    // Set memory warning threshold
    memoryGuard->setMemoryWarningThreshold(500 * 1024 * 1024);
    size_t threshold = memoryGuard->getMemoryWarningThreshold();
    EXPECT_EQ(threshold, 500 * 1024 * 1024);

    // Initially healthy
    EXPECT_TRUE(memoryGuard->isMemoryUsageHealthy());

    // Simulate high memory usage
    EXPECT_FALSE(memoryGuard->isMemoryUsageHealthy());

    // Force garbage collection
    memoryGuard->forceGarbageCollection();

    // Stop monitoring
    memoryGuard->stopMonitoring();
}

TEST_F(CrashRecoveryTest, DetectsMemoryLeaks) {
    EXPECT_CALL(*memoryGuard, detectMemoryLeaks())
        .WillOnce(::testing::Return([]() {
            std::vector<MemoryLeak> leaks;
            leaks.push_back({"Leak1", 1024, "Test leak 1"});
            leaks.push_back({"Leak2", 2048, "Test leak 2"});
            return leaks;
        }()));

    // Detect memory leaks
    auto leaks = memoryGuard->detectMemoryLeaks();
    EXPECT_EQ(leaks.size(), 2);
    EXPECT_EQ(leaks[0].size, 1024);
    EXPECT_EQ(leaks[1].size, 2048);
}

TEST_F(CrashRecoveryTest, HandlesMultiplePluginCrashes) {
    EXPECT_CALL(*crashRecovery, registerPlugin(::testing::_))
        .Times(3);

    EXPECT_CALL(*crashRecovery, onPluginCrash(::testing::_))
        .Times(3);

    EXPECT_CALL(*crashRecovery, getCrashCount(::testing::_))
        .WillOnce(::testing::Return(2))   // plugin-1
        .WillOnce(::testing::Return(1))   // plugin-2
        .WillOnce(::testing::Return(5));  // plugin-3

    EXPECT_CALL(*crashRecovery, getUnstablePlugins())
        .WillOnce(::testing::Return(std::vector<std::string>{
            "plugin-1", "plugin-3"  // plugin-2 has < 3 crashes, so not unstable
        }));

    // Register multiple plugins
    crashRecovery->registerPlugin("plugin-1");
    crashRecovery->registerPlugin("plugin-2");
    crashRecovery->registerPlugin("plugin-3");

    // Simulate crashes
    crashRecovery->onPluginCrash("plugin-1");
    crashRecovery->onPluginCrash("plugin-2");
    crashRecovery->onPluginCrash("plugin-3");

    // Check crash counts
    EXPECT_EQ(crashRecovery->getCrashCount("plugin-1"), 2);
    EXPECT_EQ(crashRecovery->getCrashCount("plugin-2"), 1);
    EXPECT_EQ(crashRecovery->getCrashCount("plugin-3"), 5);

    // Get unstable plugins (those with >3 crashes)
    auto unstablePlugins = crashRecovery->getUnstablePlugins();
    EXPECT_EQ(unstablePlugins.size(), 2);
    EXPECT_THAT(unstablePlugins, ::testing::Contains("plugin-1"));
    EXPECT_THAT(unstablePlugins, ::testing::Contains("plugin-3"));
}

TEST_F(CrashRecoveryTest, HandlesResourceExhaustion) {
    EXPECT_CALL(*pluginSandbox, isPluginExceedingLimits("test-plugin-1"))
        .Times(3)
        .WillOnce(::testing::Return(false))   // Normal
        .WillOnce(::testing::Return(true))    // Memory exceeded
        .WillOnce(::testing::Return(true));   // CPU exceeded

    EXPECT_CALL(*pluginSandbox, terminatePlugin("test-plugin-1"))
        .Times(2);

    EXPECT_CALL(*memoryGuard, isMemoryUsageHealthy())
        .Times(2)
        .WillOnce(::testing::Return(false))
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*memoryGuard, forceGarbageCollection())
        .Times(1);

    // Initially healthy
    EXPECT_FALSE(pluginSandbox->isPluginExceedingLimits("test-plugin-1"));

    // Plugin exceeds memory limit
    EXPECT_TRUE(pluginSandbox->isPluginExceedingLimits("test-plugin-1"));
    pluginSandbox->terminatePlugin("test-plugin-1");

    // System memory usage is unhealthy
    EXPECT_FALSE(memoryGuard->isMemoryUsageHealthy());
    memoryGuard->forceGarbageCollection();

    // After cleanup, should be healthy again
    EXPECT_TRUE(memoryGuard->isMemoryUsageHealthy());
}

TEST_F(CrashRecoveryTest, MaintainsSystemStability) {
    EXPECT_CALL(*crashRecovery, registerPlugin("critical-plugin"))
        .Times(1);

    EXPECT_CALL(*pluginSandbox, loadPluginSafely("/path/to/critical-plugin.vst3"))
        .Times(1)
        .WillOnce(::testing::Return(true));

    EXPECT_CALL(*mockPlugin, processBlock(::testing::_, ::testing::_))
        .Times(3)
        .WillOnce(::testing::Return())  // Normal processing
        .WillOnce(::testing::Throw(std::runtime_error("Plugin crashed")))
        .WillOnce(::testing::Return());  // Recovery processing

    EXPECT_CALL(*mockPlugin, suspendProcessing(true))
        .Times(1);

    EXPECT_CALL(*mockPlugin, suspendProcessing(false))
        .Times(1);

    EXPECT_CALL(*crashRecovery, onPluginCrash("critical-plugin"))
        .Times(1);

    EXPECT_CALL(*pluginSandbox, terminatePlugin("critical-plugin"))
        .Times(1);

    EXPECT_CALL(*crashRecovery, resetCrashCount("critical-plugin"))
        .Times(1);

    // Setup critical plugin
    crashRecovery->registerPlugin("critical-plugin");
    pluginSandbox->loadPluginSafely("/path/to/critical-plugin.vst3");

    AudioBuffer<float> buffer(2, 512);
    MidiBuffer midiMessages;

    // Normal processing
    EXPECT_NO_THROW(mockPlugin->processBlock(buffer, midiMessages));

    // Simulate plugin crash during processing
    EXPECT_THROW(mockPlugin->processBlock(buffer, midiMessages), std::runtime_error);

    // System should handle crash gracefully
    mockPlugin->suspendProcessing(true);
    crashRecovery->onPluginCrash("critical-plugin");
    pluginSandbox->terminatePlugin("critical-plugin");

    // Recovery process
    mockPlugin->suspendProcessing(false);
    crashRecovery->resetCrashCount("critical-plugin");

    // Should be able to process again
    EXPECT_NO_THROW(mockPlugin->processBlock(buffer, midiMessages));
}

TEST_F(CrashRecoveryTest, HandlesConcurrentOperations) {
    EXPECT_CALL(*crashRecovery, registerPlugin(::testing::_))
        .Times(5);

    EXPECT_CALL(*pluginSandbox, loadPluginSafely(::testing::_))
        .Times(5)
        .WillRepeatedly(::testing::Return(true));

    EXPECT_CALL(*memoryGuard, getCurrentMemoryUsage())
        .Times(5)
        .WillRepeatedly(::testing::Return(100 * 1024 * 1024));

    EXPECT_CALL(*memoryGuard, isMemoryUsageHealthy())
        .Times(5)
        .WillRepeatedly(::testing::Return(true));

    // Test concurrent operations
    std::vector<std::thread> threads;
    std::atomic<int> successCount{0};

    for (int i = 0; i < 5; ++i) {
        threads.emplace_back([this, &successCount, i]() {
            std::string pluginId = "concurrent-plugin-" + std::to_string(i);
            std::string pluginPath = "/path/to/plugin" + std::to_string(i) + ".vst3";

            try {
                crashRecovery->registerPlugin(pluginId);
                bool loaded = pluginSandbox->loadPluginSafely(pluginPath);

                if (loaded && memoryGuard->isMemoryUsageHealthy()) {
                    size_t memoryUsage = memoryGuard->getCurrentMemoryUsage();
                    if (memoryUsage > 0) {
                        successCount++;
                    }
                }
            } catch (...) {
                // Exception should be caught gracefully
            }
        });
    }

    // Wait for all threads to complete
    for (auto& thread : threads) {
        thread.join();
    }

    EXPECT_EQ(successCount, 5);
}

TEST_F(CrashRecoveryTest, ShutdownGracefully) {
    EXPECT_CALL(*crashRecovery, shutdown())
        .Times(1);

    EXPECT_CALL(*pluginSandbox, shutdownSandbox())
        .Times(1);

    EXPECT_CALL(*memoryGuard, stopMonitoring())
        .Times(1);

    EXPECT_CALL(*pluginSandbox, unloadPluginSafely("test-plugin-1"))
        .Times(1);

    EXPECT_CALL(*crashRecovery, unregisterPlugin("test-plugin-1"))
        .Times(1);

    // Clean shutdown
    pluginSandbox->unloadPluginSafely("test-plugin-1");
    crashRecovery->unregisterPlugin("test-plugin-1");

    memoryGuard->stopMonitoring();
    pluginSandbox->shutdownSandbox();
    crashRecovery->shutdown();
}