#include <gtest/gtest.h>
#include "../src/instrument/InstrumentManager.h"
#include "../src/instrument/InstrumentInstance.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>

using namespace SchillingerEcosystem::Instrument;

// Test fixture for InstrumentManager tests
class InstrumentManagerTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        juce::MessageManager::getInstance();
        manager = std::make_unique<InstrumentManager>();
        manager->setAudioConfiguration(44100.0, 512);
    }

    void TearDown() override
    {
        manager.reset();
        juce::MessageManager::deleteInstance();
    }

    std::unique_ptr<InstrumentManager> manager;

    // Helper function to create a simple test synth
    std::unique_ptr<InstrumentInstance> createNexSynthesizer()
    {
        auto synth = std::make_unique<CustomInstrumentBase>("nex_test", "NEX Test Synth");
        EXPECT_TRUE(synth->initialize(44100.0, 512));
        return synth;
    }

    std::unique_ptr<InstrumentInstance> createSamSampler()
    {
        auto sampler = std::make_unique<CustomInstrumentBase>("sam_test", "Sam Test Sampler");
        EXPECT_TRUE(sampler->initialize(44100.0, 512));
        return sampler;
    }

    std::unique_ptr<InstrumentInstance> createLocalGalSynth()
    {
        auto synth = std::make_unique<CustomInstrumentBase>("gal_test", "LOCAL GAL Test Synth");
        EXPECT_TRUE(synth->initialize(44100.0, 512));
        return synth;
    }
};

// Test: Instrument Registration
TEST_F(InstrumentManagerTest, RegisterBuiltinInstruments)
{
    // Register our three synths
    InstrumentInfo nexInfo;
    nexInfo.identifier = "nex_test";
    nexInfo.name = "NEX FM Synthesizer";
    nexInfo.category = "Synthesizer";
    nexInfo.type = InstrumentType::BuiltInSynthesizer;
    nexInfo.isInstrument = true;
    nexInfo.hasCustomUI = true;
    nexInfo.supportsMIDI = true;
    nexInfo.maxVoices = 32;

    EXPECT_TRUE(manager->registerBuiltInSynth("nex_test", [this]() { return createNexSynthesizer(); }, nexInfo));

    // Verify registration
    auto instruments = manager->getAvailableInstruments();
    EXPECT_EQ(instruments.size(), 1);
    EXPECT_EQ(instruments[0].identifier, "nex_test");
    EXPECT_EQ(instruments[0].name, "NEX FM Synthesizer");

    // Test availability
    EXPECT_TRUE(manager->isInstrumentAvailable("nex_test"));
    EXPECT_FALSE(manager->isInstrumentAvailable("nonexistent"));
}

// Test: Multiple Instrument Registration
TEST_F(InstrumentManagerTest, RegisterMultipleInstruments)
{
    // Register all three synths
    std::vector<std::pair<juce::String, std::function<std::unique_ptr<InstrumentInstance>()>>> synths = {
        {"nex_fm", [this]() { return createNexSynthesizer(); }},
        {"sampler", [this]() { return createSamSampler(); }},
        {"local_gal", [this]() { return createLocalGalSynth(); }}
    };

    for (const auto& [identifier, factory] : synths)
    {
        InstrumentInfo info;
        info.identifier = identifier;
        info.name = "Test " + identifier;
        info.category = "Synthesizer";
        info.type = InstrumentType::BuiltInSynthesizer;
        info.isInstrument = true;
        info.hasCustomUI = true;
        info.supportsMIDI = true;

        EXPECT_TRUE(manager->registerBuiltInSynth(identifier, factory, info));
    }

    // Verify all registered
    auto instruments = manager->getAvailableInstruments();
    EXPECT_EQ(instruments.size(), 3);

    auto synthInstruments = manager->getInstrumentsByType(InstrumentType::BuiltInSynthesizer);
    EXPECT_EQ(synthInstruments.size(), 3);

    // Test search functionality
    auto nexResults = manager->searchInstruments("nex");
    EXPECT_EQ(nexResults.size(), 1);
    EXPECT_EQ(nexResults[0].identifier, "nex_fm");
}

// Test: Instrument Instantiation
TEST_F(InstrumentManagerTest, InstrumentInstantiation)
{
    // Register a test synth
    InstrumentInfo info;
    info.identifier = "test_synth";
    info.name = "Test Synthesizer";
    info.category = "Synthesizer";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;
    info.supportsMIDI = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("test_synth", [this]() { return createNexSynthesizer(); }, info));

    // Create instance
    auto instance = manager->createInstance("test_synth");
    EXPECT_NE(instance, nullptr);
    EXPECT_TRUE(instance->isInitialized());
    EXPECT_EQ(instance->getIdentifier(), "test_synth");
    EXPECT_EQ(instance->getName(), "Test Synthesizer");

    // Test multiple instances
    auto instance2 = manager->createInstance("test_synth");
    EXPECT_NE(instance2, nullptr);
    EXPECT_NE(instance.get(), instance2.get());

    // Check instance count
    EXPECT_EQ(manager->getInstanceCount("test_synth"), 2);
    auto activeInstances = manager->getActiveInstances();
    EXPECT_EQ(activeInstances.size(), 2);
}

// Test: Audio Processing with Instrument Instance
TEST_F(InstrumentManagerTest, InstrumentAudioProcessing)
{
    // Register and create synth
    InstrumentInfo info;
    info.identifier = "audio_test";
    info.name = "Audio Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;
    info.supportsMIDI = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("audio_test", [this]() { return createNexSynthesizer(); }, info));

    auto instance = manager->createInstance("audio_test");
    EXPECT_NE(instance, nullptr);

    // Prepare audio processing
    instance->prepareToPlay(44100.0, 512);

    // Process audio block
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midiBuffer;

    // Add a note on message
    juce::MidiBuffer::Iterator iterator(midiBuffer);
    iterator.addEvent(juce::MidiMessage::noteOn(1, 60, 1.0f), 0);

    // Process the block
    instance->processBlock(buffer, midiBuffer);

    // Buffer should not be silent (synth should produce audio)
    bool hasAudio = false;
    for (int channel = 0; channel < buffer.getNumChannels(); ++channel)
    {
        auto channelData = buffer.getReadPointer(channel);
        for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
        {
            if (std::abs(channelData[sample]) > 0.0001f)
            {
                hasAudio = true;
                break;
            }
        }
        if (hasAudio) break;
    }

    EXPECT_TRUE(hasAudio) << "Instrument should produce audio output";
}

// Test: Parameter Control
TEST_F(InstrumentManagerTest, ParameterControl)
{
    // Register synth
    InstrumentInfo info;
    info.identifier = "param_test";
    info.name = "Parameter Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;
    info.supportsMIDI = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("param_test", [this]() { return createNexSynthesizer(); }, info));

    auto instance = manager->createInstance("param_test");
    EXPECT_NE(instance, nullptr);

    // Test parameter access
    auto parameters = instance->getAllParameters();
    EXPECT_FALSE(parameters.empty());

    // Test parameter modification
    if (!parameters.empty())
    {
        auto firstParam = parameters[0];
        float originalValue = instance->getParameterValue(firstParam.address);

        // Set new value
        float newValue = juce::jlimit(firstParam.minValue, firstParam.maxValue, 0.75f);
        instance->setParameterValue(firstParam.address, newValue);

        // Verify change
        float updatedValue = instance->getParameterValue(firstParam.address);
        EXPECT_FLOAT_EQ(updatedValue, newValue);
        EXPECT_NE(originalValue, updatedValue);
    }

    // Test bulk parameter setting
    std::unordered_map<juce::String, float> paramMap;
    for (const auto& param : parameters)
    {
        paramMap[param.address] = juce::jlimit(param.minValue, param.maxValue, 0.5f);
    }

    instance->setParameters(paramMap);

    // Verify bulk changes
    for (const auto& [address, expectedValue] : paramMap)
    {
        float actualValue = instance->getParameterValue(address);
        EXPECT_FLOAT_EQ(actualValue, expectedValue) << "Parameter " << address << " not set correctly";
    }
}

// Test: MIDI Control
TEST_F(InstrumentManagerTest, MIDIControl)
{
    // Register synth
    InstrumentInfo info;
    info.identifier = "midi_test";
    info.name = "MIDI Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;
    info.supportsMIDI = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("midi_test", [this]() { return createNexSynthesizer(); }, info));

    auto instance = manager->createInstance("midi_test");
    EXPECT_NE(instance, nullptr);

    // Test MIDI capabilities
    EXPECT_TRUE(instance->acceptsMidi());
    EXPECT_FALSE(instance->producesMidi());

    // Test MIDI note on/off
    instance->noteOn(60, 0.8f, 1);  // Note on, velocity 0.8, channel 1
    instance->noteOff(60, 0.5f, 1); // Note off, velocity 0.5, channel 1

    // Test pitch bend
    instance->pitchBend(0.5f, 1);  // Center pitch bend
    instance->pitchBend(1.0f, 1);  // Max pitch bend up

    // Test control change
    instance->controlChange(1, 0.7f, 1);  // Modulation wheel, value 0.7
    instance->controlChange(7, 0.8f, 1);  // Volume, value 0.8

    // Test all notes off
    instance->noteOn(60, 0.8f, 1);
    instance->noteOn(64, 0.7f, 1);
    instance->noteOn(67, 0.9f, 1);
    instance->allNotesOff(1);  // All notes off on channel 1
}

// Test: State Management
TEST_F(InstrumentManagerTest, StateManagement)
{
    // Register synth
    InstrumentInfo info;
    info.identifier = "state_test";
    info.name = "State Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("state_test", [this]() { return createNexSynthesizer(); }, info));

    auto instance = manager->createInstance("state_test");
    EXPECT_NE(instance, nullptr);

    // Modify some parameters
    auto parameters = instance->getAllParameters();
    if (!parameters.empty())
    {
        // Change first parameter
        instance->setParameterValue(parameters[0].address, 0.75f);
    }

    // Save state
    auto savedState = instance->getStateInformation();
    EXPECT_FALSE(savedState.isEmpty());

    // Reset parameters
    if (!parameters.empty())
    {
        instance->setParameterValue(parameters[0].address, 0.0f);
    }

    // Restore state
    instance->setStateInformation(savedState.getData(), static_cast<int>(savedState.getSize()));

    // Verify state was restored (parameter should be back to 0.75f)
    if (!parameters.empty())
    {
        float restoredValue = instance->getParameterValue(parameters[0].address);
        EXPECT_FLOAT_EQ(restoredValue, 0.75f);
    }
}

// Test: Preset Management
TEST_F(InstrumentManagerTest, PresetManagement)
{
    // Register synth
    InstrumentInfo info;
    info.identifier = "preset_test";
    info.name = "Preset Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("preset_test", [this]() { return createNexSynthesizer(); }, info));

    auto instance = manager->createInstance("preset_test");
    EXPECT_NE(instance, nullptr);

    // Modify parameters for test preset
    auto parameters = instance->getAllParameters();
    std::unordered_map<juce::String, float> presetValues;
    for (size_t i = 0; i < std::min(size_t(5), parameters.size()); ++i)
    {
        float value = static_cast<float>(i) * 0.2f;  // 0.0, 0.2, 0.4, 0.6, 0.8
        instance->setParameterValue(parameters[i].address, value);
        presetValues[parameters[i].address] = value;
    }

    // Save preset
    auto presetData = instance->savePreset("Test Preset");
    EXPECT_FALSE(presetData.isEmpty());

    // Reset parameters
    for (const auto& [address, _] : presetValues)
    {
        instance->setParameterValue(address, 0.0f);
    }

    // Verify reset
    for (const auto& [address, expectedValue] : presetValues)
    {
        float currentValue = instance->getParameterValue(address);
        EXPECT_FLOAT_EQ(currentValue, 0.0f);
    }

    // Load preset
    EXPECT_TRUE(instance->loadPreset(presetData));

    // Verify preset loaded
    for (const auto& [address, expectedValue] : presetValues)
    {
        float loadedValue = instance->getParameterValue(address);
        EXPECT_FLOAT_EQ(loadedValue, expectedValue) << "Preset parameter " << address << " not loaded correctly";
    }
}

// Test: Performance Monitoring
TEST_F(InstrumentManagerTest, PerformanceMonitoring)
{
    // Register synth
    InstrumentInfo info;
    info.identifier = "perf_test";
    info.name = "Performance Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("perf_test", [this]() { return createNexSynthesizer(); }, info));

    auto instance = manager->createInstance("perf_test");
    EXPECT_NE(instance, nullptr);

    instance->prepareToPlay(44100.0, 512);

    // Get initial stats
    auto initialStats = instance->getPerformanceStats();
    EXPECT_EQ(initialStats.activeVoices, 0);
    EXPECT_EQ(initialStats.bufferUnderruns, 0);

    // Simulate some activity
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midiBuffer;

    // Add multiple notes
    for (int note : {60, 64, 67, 72})
    {
        juce::MidiBuffer::Iterator iterator(midiBuffer);
        iterator.addEvent(juce::MidiMessage::noteOn(1, note, 0.8f), 0);
    }

    instance->processBlock(buffer, midiBuffer);

    // Check stats after processing
    auto statsAfterProcessing = instance->getPerformanceStats();
    EXPECT_GE(statsAfterProcessing.activeVoices, 0);
    EXPECT_GE(statsAfterProcessing.midiMessagesProcessed, 0);
    EXPECT_GE(statsAfterProcessing.cpuUsagePercent, 0.0);

    // Reset stats
    instance->resetPerformanceStats();
    auto resetStats = instance->getPerformanceStats();
    EXPECT_EQ(resetStats.activeVoices, 0);
    EXPECT_EQ(resetStats.bufferUnderruns, 0);
}

// Test: Manager Statistics
TEST_F(InstrumentManagerTest, ManagerStatistics)
{
    // Register multiple instruments
    std::vector<juce::String> identifiers = {"stat_test_1", "stat_test_2", "stat_test_3"};

    for (const auto& identifier : identifiers)
    {
        InstrumentInfo info;
        info.identifier = identifier;
        info.name = "Statistics Test " + juce::String(identifier.getLastCharacters());
        info.type = InstrumentType::BuiltInSynthesizer;
        info.isInstrument = true;

        EXPECT_TRUE(manager->registerBuiltInSynth(identifier, [this]() { return createNexSynthesizer(); }, info));
    }

    // Create instances
    std::vector<std::unique_ptr<InstrumentInstance>> instances;
    for (const auto& identifier : identifiers)
    {
        instances.push_back(manager->createInstance(identifier));
    }

    // Get manager statistics
    auto stats = manager->getStatistics();
    EXPECT_EQ(stats.totalInstruments, 3);
    EXPECT_EQ(stats.builtinSynths, 3);
    EXPECT_EQ(stats.externalPlugins, 0);
    EXPECT_EQ(stats.activeInstances, 3);
    EXPECT_GT(stats.memoryUsage, 0);

    // Test diagnostic info
    juce::String diagnosticInfo = manager->getDiagnosticInfo();
    EXPECT_FALSE(diagnosticInfo.isEmpty());
    EXPECT_TRUE(diagnosticInfo.contains("totalInstruments"));
    EXPECT_TRUE(diagnosticInfo.contains("activeInstances"));

    // Test validation
    auto validationResult = manager->validateAllInstruments();
    EXPECT_TRUE(validationResult.isValid);
    EXPECT_TRUE(validationResult.errors.isEmpty());
}

// Test: AI Agent Integration
TEST_F(InstrumentManagerTest, AIAgentIntegration)
{
    // Register synth
    InstrumentInfo info;
    info.identifier = "ai_test";
    info.name = "AI Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("ai_test", [this]() { return createNexSynthesizer(); }, info));

    // Register with AI agent
    EXPECT_TRUE(manager->registerWithAIAgent("ai_test", "ai_controller"));

    // Get AI interface
    auto aiInterface = manager->getAIAgentInterface("ai_test");
    EXPECT_NE(aiInterface, nullptr);

    // Test AI parameter control
    auto parameters = aiInterface->getAllParameters();
    if (!parameters.empty())
    {
        // Test parameter access
        float originalValue = aiInterface->getParameter(parameters[0].address);
        EXPECT_GE(originalValue, parameters[0].minValue);
        EXPECT_LE(originalValue, parameters[0].maxValue);

        // Test parameter setting
        float newValue = juce::jlimit(parameters[0].minValue, parameters[0].maxValue, 0.75f);
        aiInterface->setParameter(parameters[0].address, newValue);
        float updatedValue = aiInterface->getParameter(parameters[0].address);
        EXPECT_FLOAT_EQ(updatedValue, newValue);

        // Test smooth parameter setting
        aiInterface->setParameterSmooth(parameters[0].address, 0.5f, 100.0); // 100ms smoothing
    }

    // Test AI musical control
    aiInterface->noteOn(60, 0.8f, 1);
    aiInterface->pitchBend(0.5f, 1);
    aiInterface->controlChange(1, 0.7f, 1);

    aiInterface->allNotesOff(1);

    // Test preset control
    EXPECT_TRUE(aiInterface->savePreset("ai_test_preset", "Test Category"));
    auto presets = aiInterface->getPresets();
    EXPECT_TRUE(presets.contains("ai_test_preset"));

    // Test state control
    auto state = aiInterface->getCurrentState();
    EXPECT_FALSE(state.isEmpty());
    EXPECT_TRUE(aiInterface->setState(state));
}

// Test: Error Handling
TEST_F(InstrumentManagerTest, ErrorHandling)
{
    // Test registering with invalid identifier
    InstrumentInfo info;
    info.identifier = "";  // Invalid empty identifier
    info.name = "Invalid Test";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;

    EXPECT_FALSE(manager->registerBuiltInSynth("", [this]() { return createNexSynthesizer(); }, info));

    // Test creating nonexistent instance
    auto invalidInstance = manager->createInstance("nonexistent");
    EXPECT_EQ(invalidInstance, nullptr);

    // Test accessing nonexistent info
    auto nonexistentInfo = manager->getInstrumentInfo("nonexistent");
    EXPECT_EQ(nonexistentInfo, nullptr);

    // Test accessing nonexistent AI interface
    auto nonexistentAI = manager->getAIAgentInterface("nonexistent");
    EXPECT_EQ(nonexistentAI, nullptr);
}

// Test: Memory Management
TEST_F(InstrumentManagerTest, MemoryManagement)
{
    // Register synth
    InstrumentInfo info;
    info.identifier = "memory_test";
    info.name = "Memory Test Synth";
    info.type = InstrumentType::BuiltInSynthesizer;
    info.isInstrument = true;

    EXPECT_TRUE(manager->registerBuiltInSynth("memory_test", [this]() { return createNexSynthesizer(); }, info));

    // Create and destroy many instances
    const int numInstances = 10;
    std::vector<std::unique_ptr<InstrumentInstance>> instances;

    for (int i = 0; i < numInstances; ++i)
    {
        instances.push_back(manager->createInstance("memory_test"));
        EXPECT_NE(instances.back(), nullptr);
    }

    EXPECT_EQ(manager->getInstanceCount("memory_test"), numInstances);

    // Destroy half of the instances
    for (int i = 0; i < numInstances / 2; ++i)
    {
        instances[i].reset();
    }

    // Instance count should decrease
    auto currentInstances = manager->getActiveInstances();
    EXPECT_EQ(currentInstances.size(), numInstances / 2);

    // Clear remaining instances
    instances.clear();

    // Should have no active instances
    auto finalInstances = manager->getActiveInstances();
    EXPECT_TRUE(finalInstances.empty());
}

// Test: Thread Safety (Basic)
TEST_F(InstrumentManagerTest, BasicThreadSafety)
{
    // Register synths
    for (int i = 0; i < 3; ++i)
    {
        juce::String identifier = "thread_test_" + juce::String(i);
        InstrumentInfo info;
        info.identifier = identifier;
        info.name = "Thread Test " + juce::String(i);
        info.type = InstrumentType::BuiltInSynthesizer;
        info.isInstrument = true;

        EXPECT_TRUE(manager->registerBuiltInSynth(identifier, [this]() { return createNexSynthesizer(); }, info));
    }

    // Multiple threads accessing manager concurrently
    std::vector<std::thread> threads;
    std::atomic<int> successCount{0};

    // Thread 1: Create instances
    threads.emplace_back([this, &successCount]() {
        for (int i = 0; i < 5; ++i)
        {
            auto instance = manager->createInstance("thread_test_0");
            if (instance != nullptr) successCount++;
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    });

    // Thread 2: Get statistics
    threads.emplace_back([this, &successCount]() {
        for (int i = 0; i < 5; ++i)
        {
            auto stats = manager->getStatistics();
            if (stats.totalInstruments >= 3) successCount++;
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    });

    // Thread 3: Search instruments
    threads.emplace_back([this, &successCount]() {
        for (int i = 0; i < 5; ++i)
        {
            auto instruments = manager->getAvailableInstruments();
            if (instruments.size() >= 3) successCount++;
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    });

    // Wait for all threads
    for (auto& thread : threads)
    {
        thread.join();
    }

    // All operations should succeed
    EXPECT_EQ(successCount.load(), 15);
}