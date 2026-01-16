#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include "../../src/plugins/PluginInstance.h"
#include "../../src/plugins/PluginUIManager.h"
#include "../../src/plugins/ParameterBridge.h"
#include "../../src/plugins/MidiBridge.h"
#include "../../src/plugins/PluginBrowser.h"

using namespace SchillingerEcosystem::Plugins;

class ExternalPluginTests : public ::testing::Test
{
protected:
    void SetUp() override
    {
        // Initialize JUCE message manager for UI tests
        juce::MessageManager::getInstance();

        // Create a mock plugin for testing
        createMockPlugin();
    }

    void TearDown() override
    {
        // Clean up JUCE message manager
        juce::MessageManager::deleteInstance();
    }

    void createMockPlugin()
    {
        // Create a mock audio processor for testing
        mockPlugin = std::make_unique<MockAudioProcessor>();

        // Create plugin instance
        pluginInstance = std::make_unique<PluginInstance>(mockPlugin.get(), "MockPlugin");
        pluginInstance->initialize(44100.0, 512);
    }

    std::unique_ptr<MockAudioProcessor> mockPlugin;
    std::unique_ptr<PluginInstance> pluginInstance;
};

// Mock Audio Processor for testing
class MockAudioProcessor : public juce::AudioProcessor
{
public:
    MockAudioProcessor()
    {
        // Add mock parameters
        addParameter(gainParam = new juce::AudioParameterFloat("gain", "Gain", 0.0f, 1.0f, 0.5f));
        addParameter(frequencyParam = new juce::AudioParameterFloat("frequency", "Frequency", 20.0f, 20000.0f, 440.0f));
        addParameter(enableParam = new juce::AudioParameterBool("enable", "Enable", true));
    }

    const juce::String getName() const override { return "MockPlugin"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    void prepareToPlay(double sampleRate, int samplesPerBlock) override {}
    void releaseResources() override {}

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override
    {
        // Simple gain processing
        float gain = gainParam->get();
        buffer.applyGain(gain);
    }

    const juce::String getInputChannelName(int channelIndex) const override { return "Input " + juce::String(channelIndex + 1); }
    const juce::String getOutputChannelName(int channelIndex) const override { return "Output " + juce::String(channelIndex + 1); }
    bool isInputChannelStereoPair(int index) const override { return true; }
    bool isOutputChannelStereoPair(int index) const override { return true; }

    bool acceptsAudio() const override { return true; }
    bool producesAudio() const override { return true; }
    bool silenceInProducesSilenceOut() const override { return true; }

    juce::AudioProcessorEditor* createEditor() override { return nullptr; }
    bool hasEditor() const override { return false; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int index) override {}
    const juce::String getProgramName(int index) override { return "Default"; }
    void changeProgramName(int index, const juce::String& newName) override {}
    void getStateInformation(juce::MemoryBlock& destData) override {}
    void setStateInformation(const void* data, int sizeInBytes) override {}

private:
    juce::AudioParameterFloat* gainParam;
    juce::AudioParameterFloat* frequencyParam;
    juce::AudioParameterBool* enableParam;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MockAudioProcessor)
};

// PluginInstance Tests
TEST_F(ExternalPluginTests, PluginInstanceCreation)
{
    EXPECT_NE(pluginInstance, nullptr);
    EXPECT_TRUE(pluginInstance->isPluginValid());
    EXPECT_EQ(pluginInstance->getFormat(), PluginFormat::Unknown);  // Mock plugin
    EXPECT_GT(pluginInstance->getNumParameters(), 0);
}

TEST_F(ExternalPluginTests, PluginInstanceBasicFunctionality)
{
    // Test parameter access
    EXPECT_GT(pluginInstance->getAllParameters().size(), 0);

    // Test parameter setting and getting
    pluginInstance->setParameterValue("gain", 0.8f);
    EXPECT_FLOAT_EQ(pluginInstance->getParameterValue("gain"), 0.8f);

    // Test audio processing
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Fill buffer with test signal
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            buffer.setSample(ch, i, 0.5f);
        }
    }

    float inputLevel = buffer.getRMSLevel(0, 0, numSamples);

    pluginInstance->processBlock(buffer, midiBuffer);

    float outputLevel = buffer.getRMSLevel(0, 0, numSamples);
    EXPECT_FLOAT_EQ(outputLevel, inputLevel * 0.8f); // Applied gain
}

TEST_F(ExternalPluginTests, PluginInstanceMIDIHandling)
{
    EXPECT_TRUE(pluginInstance->acceptsMidi());
    EXPECT_FALSE(pluginInstance->producesMidi());

    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add MIDI note
    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);

    EXPECT_NO_THROW(pluginInstance->processBlock(buffer, midiBuffer));
}

TEST_F(ExternalPluginTests, PluginInstanceStateManagement)
{
    // Set some parameters
    pluginInstance->setParameterValue("gain", 0.7f);
    pluginInstance->setParameterValue("frequency", 880.0f);

    // Save state
    auto state = pluginInstance->getState();
    EXPECT_GT(state.getSize(), 0);

    // Reset parameters
    pluginInstance->setParameterValue("gain", 0.5f);
    pluginInstance->setParameterValue("frequency", 440.0f);

    // Restore state
    pluginInstance->setState(state);

    // Verify restoration
    EXPECT_FLOAT_EQ(pluginInstance->getParameterValue("gain"), 0.7f);
    EXPECT_FLOAT_EQ(pluginInstance->getParameterValue("frequency"), 880.0f);
}

// PluginUIManager Tests
TEST_F(ExternalPluginTests, PluginUIManagerCreation)
{
    auto uiManager = std::make_unique<PluginUIManager>(pluginInstance.get());
    EXPECT_NE(uiManager, nullptr);

    // Test UI capabilities
    auto uiCaps = pluginInstance->getUICapabilities();
    EXPECT_TRUE(uiCaps.isValid());
    EXPECT_FALSE(uiCaps.hasNativeEditor);  // Mock plugin has no editor
    EXPECT_TRUE(uiCaps.supportsEmbedded);
}

TEST_F(ExternalPluginTests, PluginUICustomControls)
{
    auto uiManager = std::make_unique<PluginUIManager>(pluginInstance.get());

    // Test custom controls creation
    uiManager->createCustomControls();
    uiManager->showCustomControls(true);
    EXPECT_TRUE(uiManager->areCustomControlsVisible());

    // Test UI mode switching
    EXPECT_TRUE(uiManager->isUIModeAvailable(PluginUIMode::None));
    EXPECT_TRUE(uiManager->isUIModeAvailable(PluginUIMode::Custom));

    uiManager->setUIMode(PluginUIMode::Custom);
    EXPECT_EQ(uiManager->getUIMode(), PluginUIMode::Custom);
}

// ParameterBridge Tests
TEST_F(ExternalPluginTests, ParameterBridgeCreation)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<ParameterBridge>(pluginInstance.get(), instrument.get());

    EXPECT_NE(bridge, nullptr);
    EXPECT_TRUE(bridge->getAllMappings().empty());
}

TEST_F(ExternalPluginTests, ParameterBridgeMapping)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<ParameterBridge>(pluginInstance.get(), instrument.get());

    // Add direct mapping
    bridge->addDirectMapping("gain", "host_gain");

    // Verify mapping was added
    auto mappings = bridge->getAllMappings();
    EXPECT_EQ(mappings.size(), 1);
    EXPECT_EQ(mappings[0].sourceParameter, "gain");
    EXPECT_EQ(mappings[0].targetParameter, "host_gain");

    // Test mapping lookup
    EXPECT_TRUE(bridge->hasMapping("gain", "host_gain"));
    auto mapping = bridge->findMapping("gain", "host_gain");
    EXPECT_NE(mapping, nullptr);
    EXPECT_EQ(mapping->mappingType, MappingType::Direct);
}

TEST_F(ExternalPluginTests, ParameterBridgeValueConversion)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<ParameterBridge>(pluginInstance.get(), instrument.get());

    // Add scaled mapping
    bridge->addScaledMapping("gain", "host_gain", 0.0f, 1.0f, -20.0f, 20.0f);  // 0-1 -> -20 to +20 dB

    auto mapping = bridge->findMapping("gain", "host_gain");
    ASSERT_NE(mapping, nullptr);

    // Test value conversion
    float pluginValue = 0.5f;  // Middle of 0-1 range
    float hostValue = bridge->convertToPlugin(pluginValue, *mapping);

    // Should be 0.0 (middle of -20 to +20 range)
    EXPECT_FLOAT_EQ(hostValue, 0.0f);
}

TEST_F(ExternalPluginTests, ParameterBridgeMidiMapping)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<ParameterBridge>(pluginInstance.get(), instrument.get());

    // Add MIDI mapping
    bridge->addMidiMapping("gain", 1);  // CC 1 mod wheel

    // Start MIDI learn
    bridge->startMidiLearn();
    EXPECT_TRUE(bridge->isMidiLearning());

    // Simulate MIDI CC message
    juce::MidiBuffer midiBuffer;
    midiBuffer.addEvent(juce::MidiMessage::controllerEvent(1, 1, 64), 0);

    bridge->processMidiLearn(midiBuffer.getFirstEvent());

    bridge->stopMidiLearn();
    EXPECT_FALSE(bridge->isMidiLearning());
}

// MidiBridge Tests
TEST_F(ExternalPluginTests, MidiBridgeCreation)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<MidiBridge>(pluginInstance.get(), instrument.get());

    EXPECT_NE(bridge, nullptr);
    EXPECT_TRUE(bridge->isHostToPluginEnabled());
    EXPECT_TRUE(bridge->isPluginToHostEnabled());
}

TEST_F(ExternalPluginTests, MidiBridgeRouting)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<MidiBridge>(pluginInstance.get(), instrument.get());

    // Add routing
    MidiRouting routing;
    routing.sourceChannel = 1;
    routing.targetChannel = -1;  // Keep original
    routing.velocityScale = 1.5f;
    routing.transpose = 2;
    routing.description = "Test Routing";

    bridge->addRouting(routing);

    // Verify routing was added
    auto routings = bridge->getAllRoutings();
    EXPECT_EQ(routings.size(), 1);
    EXPECT_EQ(routings[0].sourceChannel, 1);
    EXPECT_EQ(routings[0].transpose, 2);

    // Test MIDI processing
    const int numSamples = 256;
    juce::AudioBuffer<float> audioBuffer(2, numSamples);
    juce::MidiBuffer hostMidi, pluginMidi;

    // Add MIDI note
    hostMidi.addEvent(juce::MidiMessage::noteOn(1, 60, 0.5f), 0);

    bridge->processHostMidi(hostMidi, pluginMidi, numSamples);

    // Should have processed MIDI
    EXPECT_GT(pluginMidi.getNumEvents(), 0);
}

TEST_F(ExternalPluginTests, MidiBridgeMidiLearning)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<MidiBridge>(pluginInstance.get(), instrument.get());

    // Start MIDI learn for parameter
    bridge->startMidiLearn("gain");
    EXPECT_TRUE(bridge->isMidiLearning());

    // Add MIDI mapping
    MidiMapping mapping;
    mapping.ccNumber = 7;
    mapping.midiChannel = 1;
    mapping.parameterAddress = "gain";

    bridge->addMidiMapping(mapping);

    // Verify mapping
    auto foundMapping = bridge->findMidiMapping("gain");
    EXPECT_NE(foundMapping, nullptr);
    EXPECT_EQ(foundMapping->ccNumber, 7);
    EXPECT_EQ(foundMapping->parameterAddress, "gain");
}

// Performance Tests
TEST_F(ExternalPluginTests, PerformanceMultiplePlugins)
{
    const int numPlugins = 10;
    std::vector<std::unique_ptr<PluginInstance>> plugins;

    // Create multiple plugin instances
    for (int i = 0; i < numPlugins; ++i)
    {
        auto mockProc = std::make_unique<MockAudioProcessor>();
        auto plugin = std::make_unique<PluginInstance>(mockProc.get(), "MockPlugin" + juce::String(i));
        plugin->initialize(44100.0, 512);
        plugins.push_back(std::move(plugin));
    }

    // Test processing performance
    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    auto startTime = std::chrono::high_resolution_clock::now();

    // Process all plugins
    for (auto& plugin : plugins)
    {
        buffer.clear();
        plugin->processBlock(buffer, midiBuffer);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should complete in reasonable time
    EXPECT_LT(duration.count(), 50000);  // Less than 50ms for 10 plugins
}

TEST_F(ExternalPluginTests, PerformanceParameterUpdates)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<ParameterBridge>(pluginInstance.get(), instrument.get());

    // Add many mappings
    for (int i = 0; i < 100; ++i)
    {
        bridge->addDirectMapping("gain", "param_" + juce::String(i));
    }

    // Test parameter update performance
    auto startTime = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 1000; ++i)
    {
        float value = (i % 100) / 100.0f;
        pluginInstance->setParameterValue("gain", value);
        bridge->updateHostParameters();
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should complete quickly
    EXPECT_LT(duration.count(), 10000);  // Less than 10ms for 1000 updates
}

TEST_F(ExternalPluginTests, PerformanceMidiProcessing)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<MidiBridge>(pluginInstance.get(), instrument.get());

    // Add complex routing
    MidiRouting routing;
    routing.velocityScale = 1.2f;
    routing.transpose = 5;
    bridge->addRouting(routing);

    // Create MIDI with many messages
    const int numSamples = 512;
    juce::AudioBuffer<float> audioBuffer(2, numSamples);
    juce::MidiBuffer hostMidi, pluginMidi;

    // Add many MIDI messages
    for (int i = 0; i < 100; ++i)
    {
        int note = 60 + (i % 24);
        float velocity = 0.5f + (i % 50) / 100.0f;
        hostMidi.addEvent(juce::MidiMessage::noteOn(1, note, velocity), i * 5);
        hostMidi.addEvent(juce::MidiMessage::noteOff(1, note, velocity), i * 5 + 100);
    }

    auto startTime = std::chrono::high_resolution_clock::now();

    bridge->processHostMidi(hostMidi, pluginMidi, numSamples);

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should process quickly
    EXPECT_LT(duration.count(), 5000);   // Less than 5ms for 200 MIDI messages
}

// Error Handling Tests
TEST_F(ExternalPluginTests, InvalidParameterHandling)
{
    // Test accessing invalid parameters
    EXPECT_EQ(pluginInstance->getParameterValue("invalid_param"), 0.0f);

    // Test setting invalid parameters
    EXPECT_NO_THROW(pluginInstance->setParameterValue("invalid_param", 0.5f));

    // Test invalid parameter info
    EXPECT_EQ(pluginInstance->getParameterInfo("invalid_param"), nullptr);
}

TEST_F(ExternalPluginTests, InvalidBridgeMappings)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<ParameterBridge>(pluginInstance.get(), instrument.get());

    // Test mapping to invalid parameters
    bridge->addDirectMapping("invalid_source", "invalid_target");

    // Should not crash during processing
    EXPECT_NO_THROW(bridge->updatePluginParameters());
    EXPECT_NO_THROW(bridge->updateHostParameters());
}

TEST_F(ExternalPluginTests, InvalidMidiMessages)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<MidiBridge>(pluginInstance.get(), instrument.get());

    // Process with invalid MIDI
    const int numSamples = 256;
    juce::AudioBuffer<float> audioBuffer(2, numSamples);
    juce::MidiBuffer emptyMidi, pluginMidi;

    EXPECT_NO_THROW(bridge->processHostMidi(emptyMidi, pluginMidi, numSamples));
    EXPECT_NO_THROW(bridge->processBidirectional(emptyMidi, pluginMidi, numSamples));
}

// Stress Tests
TEST_F(ExternalPluginTests, StressTestRapidParameterChanges)
{
    // Test rapid parameter changes
    for (int i = 0; i < 10000; ++i)
    {
        float value = (i % 1000) / 1000.0f;
        pluginInstance->setParameterValue("gain", value);

        if (i % 100 == 0)
        {
            // Test audio processing occasionally
            const int numSamples = 64;
            juce::AudioBuffer<float> buffer(2, numSamples);
            juce::MidiBuffer midiBuffer;

            EXPECT_NO_THROW(pluginInstance->processBlock(buffer, midiBuffer));
        }
    }

    // Plugin should still be functional
    EXPECT_FLOAT_EQ(pluginInstance->getParameterValue("gain"), (9999 % 1000) / 1000.0f);
}

TEST_F(ExternalPluginTests, StressTestHeavyMidiLoad)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto bridge = std::make_unique<MidiBridge>(pluginInstance.get(), instrument.get());

    // Test with very heavy MIDI load
    const int numSamples = 1024;
    juce::AudioBuffer<float> audioBuffer(2, numSamples);
    juce::MidiBuffer hostMidi, pluginMidi;

    // Add thousands of MIDI messages
    for (int i = 0; i < 1000; ++i)
    {
        int note = 21 + (i % 87);  // Full MIDI range
        int velocity = 1 + (i % 127);
        int timestamp = i % numSamples;

        hostMidi.addEvent(juce::MidiMessage::noteOn(1, note, velocity), timestamp);
        hostMidi.addEvent(juce::MidiMessage::noteOff(1, note, velocity), timestamp + 10);

        // Add CC messages
        hostMidi.addEvent(juce::MidiMessage::controllerEvent(1, i % 128, i % 128), timestamp);
    }

    EXPECT_NO_THROW(bridge->processHostMidi(hostMidi, pluginMidi, numSamples));

    // Should handle gracefully without crashing
    EXPECT_GT(pluginMidi.getNumEvents(), 0);
    EXPECT_LT(pluginMidi.getNumEvents(), hostMidi.getNumEvents());  // Some may be filtered
}

TEST_F(ExternalPluginTests, StressTestMemoryUsage)
{
    // Create and destroy many plugin instances
    for (int cycle = 0; cycle < 10; ++cycle)
    {
        std::vector<std::unique_ptr<PluginInstance>> plugins;

        // Create many instances
        for (int i = 0; i < 20; ++i)
        {
            auto mockProc = std::make_unique<MockAudioProcessor>();
            auto plugin = std::make_unique<PluginInstance>(mockProc.get(), "StressTest" + juce::String(i));
            plugin->initialize(44100.0, 512);
            plugins.push_back(std::move(plugin));
        }

        // Use them briefly
        const int numSamples = 128;
        juce::AudioBuffer<float> buffer(2, numSamples);
        juce::MidiBuffer midiBuffer;

        for (auto& plugin : plugins)
        {
            plugin->setParameterValue("gain", 0.8f);
            plugin->processBlock(buffer, midiBuffer);
        }

        // Instances will be destroyed automatically
    }

    // If we reach here without crashing, the test passed
    EXPECT_TRUE(true);
}

// Integration Tests
TEST_F(ExternalPluginTests, IntegrationFullWorkflow)
{
    auto instrument = std::make_unique<SchillingerEcosystem::Instrument::InstrumentInstance>();
    auto paramBridge = std::make_unique<ParameterBridge>(pluginInstance.get(), instrument.get());
    auto midiBridge = std::make_unique<MidiBridge>(pluginInstance.get(), instrument.get());
    auto uiManager = std::make_unique<PluginUIManager>(pluginInstance.get());

    // Full workflow: parameter mapping + MIDI + UI + audio processing

    // Setup parameter mapping
    paramBridge->addScaledMapping("gain", "master_volume", 0.0f, 1.0f, 0.0f, 100.0f);

    // Setup MIDI routing
    MidiRouting routing;
    routing.sourceChannel = 1;
    routing.velocityScale = 1.0f;
    midiBridge->addRouting(routing);

    // Setup UI
    uiManager->setUIMode(PluginUIMode::Custom);
    uiManager->createCustomControls();

    // Process audio with MIDI
    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer hostMidi, pluginMidi;

    // Add MIDI note
    hostMidi.addEvent(juce::MidiMessage::noteOn(1, 60, 0.7f), 0);
    hostMidi.addEvent(juce::MidiMessage::noteOff(1, 60, 0.0f), 256);

    // Process audio
    pluginInstance->setParameterValue("gain", 0.5f);
    midiBridge->processHostMidi(hostMidi, pluginMidi, numSamples);
    pluginInstance->processBlock(buffer, pluginMidi);

    // Update parameters
    paramBridge->updateBothDirections();

    // Should have processed successfully
    EXPECT_GT(buffer.getRMSLevel(0, 0, numSamples), 0.0f);
}

// Plugin Browser Tests (simplified due to complexity)
TEST_F(ExternalPluginTests, PluginBrowserBasicFunctionality)
{
    // Test with minimal browser functionality
    auto pluginManager = std::make_unique<PluginManager>();
    auto browser = std::make_unique<PluginBrowser>(pluginManager.get());

    EXPECT_NE(browser, nullptr);

    // Test search functionality
    browser->setSearchText("Mock");

    // Test filtering
    BrowserFilter filter;
    filter.categories.add("Synth");
    browser->setFilter(filter);

    // Test sorting
    SortOption sort;
    sort.criteria = SortCriteria::Name;
    sort.direction = SortDirection::Ascending;
    browser->setSortOption(sort);
}