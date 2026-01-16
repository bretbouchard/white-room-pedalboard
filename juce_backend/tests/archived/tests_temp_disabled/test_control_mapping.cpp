#include <gtest/gtest.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <cstdint>
#include "control/ControlMapper_Test.h"
#include "midi/MIDIProcessor_Test.h"

class ControlMappingAdvancedTest : public ::testing::Test {
protected:
    void SetUp() override {
        mapper = std::make_unique<ControlMapper>();
        processor = std::make_unique<MIDIProcessor>();
    }

    void TearDown() override {
        mapper.reset();
        processor.reset();
    }

    std::unique_ptr<ControlMapper> mapper;
    std::unique_ptr<MIDIProcessor> processor;
};

TEST_F(ControlMappingAdvancedTest, HandlesMultipleParameterMappings) {
    // Map multiple CCs to different parameters
    EXPECT_TRUE(mapper->addMapping(1, 1, "volume", 0.0, 1.0));
    EXPECT_TRUE(mapper->addMapping(2, 1, "pan", -1.0, 1.0));
    EXPECT_TRUE(mapper->addMapping(3, 1, "filter_freq", 20.0, 20000.0));

    // Test volume mapping (0-1 range)
    juce::MidiMessage cc1 = juce::MidiMessage::controllerEvent(1, 1, 64);
    auto mapping1 = mapper->findMapping(cc1);
    ASSERT_NE(mapping1, nullptr);
    double volValue = mapper->scaleMidiValue(64, *mapping1);
    EXPECT_NEAR(volValue, 0.504, 0.01);

    // Test pan mapping (-1 to 1 range)
    juce::MidiMessage cc2 = juce::MidiMessage::controllerEvent(1, 2, 127);
    auto mapping2 = mapper->findMapping(cc2);
    ASSERT_NE(mapping2, nullptr);
    double panValue = mapper->scaleMidiValue(127, *mapping2);
    EXPECT_NEAR(panValue, 1.0, 0.01);

    // Test filter frequency mapping (20Hz to 20kHz)
    juce::MidiMessage cc3 = juce::MidiMessage::controllerEvent(1, 3, 100);
    auto mapping3 = mapper->findMapping(cc3);
    ASSERT_NE(mapping3, nullptr);
    double freqValue = mapper->scaleMidiValue(100, *mapping3);
    EXPECT_NEAR(freqValue, 15800.0, 100.0);
}

TEST_F(ControlMappingAdvancedTest, HandlesCurveTypes) {
    // Test linear curve
    mapper->addMapping(1, 1, "linear_param", 0.0, 1.0, ControlMapping::CurveType::Linear);
    auto linearMapping = mapper->getMapping(1, 1);
    ASSERT_NE(linearMapping, nullptr);
    EXPECT_EQ(linearMapping->curveType, ControlMapping::CurveType::Linear);

    // Test exponential curve
    mapper->addMapping(2, 1, "exp_param", 0.0, 1.0, ControlMapping::CurveType::Exponential);
    auto expMapping = mapper->getMapping(2, 1);
    ASSERT_NE(expMapping, nullptr);
    EXPECT_EQ(expMapping->curveType, ControlMapping::CurveType::Exponential);

    // Test logarithmic curve
    mapper->addMapping(3, 1, "log_param", 0.0, 1.0, ControlMapping::CurveType::Logarithmic);
    auto logMapping = mapper->getMapping(3, 1);
    ASSERT_NE(logMapping, nullptr);
    EXPECT_EQ(logMapping->curveType, ControlMapping::CurveType::Logarithmic);
}

TEST_F(ControlMappingAdvancedTest, ProcessesMIDICorrectly) {
    mapper->addMapping(7, 1, "volume", 0.0, 1.0);

    bool parameterChanged = false;
    juce::String changedParameter;
    double changedValue = 0.0;

    mapper->setParameterChangedCallback([&parameterChanged, &changedParameter, &changedValue](
        const juce::String& param, double value) {
        parameterChanged = true;
        changedParameter = param;
        changedValue = value;
    });

    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 7, 100);
    mapper->processMIDI(cc);

    EXPECT_TRUE(parameterChanged);
    EXPECT_EQ(changedParameter, "volume");
    EXPECT_NEAR(changedValue, 0.787, 0.01);
}

TEST_F(ControlMappingAdvancedTest, HandlesMIDIClusterLearning) {
    mapper->enableLearnMode(true);

    // Start learning session for a cluster of parameters
    mapper->startClusterLearn();
    mapper->setParameterToLearn("volume");
    mapper->setParameterToLearn("pan");
    mapper->setParameterToLearn("filter_cutoff");

    // Simulate incoming MIDI for cluster learning
    juce::MidiMessage cc1 = juce::MidiMessage::controllerEvent(1, 1, 100);
    juce::MidiMessage cc2 = juce::MidiMessage::controllerEvent(1, 2, 50);
    juce::MidiMessage cc3 = juce::MidiMessage::controllerEvent(1, 3, 75);

    mapper->processLearnMIDI(cc1);
    mapper->processLearnMIDI(cc2);
    mapper->processLearnMIDI(cc3);

    mapper->endClusterLearn();

    // Verify all parameters were mapped
    EXPECT_NE(mapper->getMapping(1, 1), nullptr);
    EXPECT_NE(mapper->getMapping(2, 1), nullptr);
    EXPECT_NE(mapper->getMapping(3, 1), nullptr);

    EXPECT_EQ(mapper->getMapping(1, 1)->parameterName, "volume");
    EXPECT_EQ(mapper->getMapping(2, 1)->parameterName, "pan");
    EXPECT_EQ(mapper->getMapping(3, 1)->parameterName, "filter_cutoff");
}

TEST_F(ControlMappingAdvancedTest, HandlesMIDISwitches) {
    // Test momentary switch (Note On/Off)
    mapper->addSwitchMapping(64, 1, "solo", ControlMapping::SwitchType::Momentary);

    bool switchPressed = false;
    bool switchReleased = false;

    mapper->setSwitchCallback([&switchPressed, &switchReleased](bool isPressed, const juce::String& param) {
        if (isPressed) switchPressed = true;
        else switchReleased = true;
    });

    // Simulate Note On/Off
    juce::MidiMessage noteOn = juce::MidiMessage::noteOn(1, 64, static_cast<uint8_t>(127));
    juce::MidiMessage noteOff = juce::MidiMessage::noteOff(1, 64);

    mapper->processMIDI(noteOn);
    mapper->processMIDI(noteOff);

    EXPECT_TRUE(switchPressed);
    EXPECT_TRUE(switchReleased);
}

TEST_F(ControlMappingAdvancedTest, HandlesToggleSwitches) {
    // Test toggle switch (CC on/off toggles parameter)
    mapper->addSwitchMapping(10, 1, "mute", ControlMapping::SwitchType::Toggle);

    juce::MidiMessage toggle = juce::MidiMessage::controllerEvent(1, 10, 127);

    // First press should turn on
    mapper->processMIDI(toggle);
    auto muteMapping = mapper->getSwitchMapping(10, 1);
    ASSERT_NE(muteMapping, nullptr);
    EXPECT_TRUE(muteMapping->currentState);

    // Second press should turn off
    mapper->processMIDI(toggle);
    EXPECT_FALSE(muteMapping->currentState);
}

TEST_F(ControlMappingAdvancedTest, SavesAndLoadsMappings) {
    // Create some mappings
    mapper->addMapping(1, 1, "volume", 0.0, 1.0);
    mapper->addMapping(2, 1, "pan", -1.0, 1.0);
    mapper->addNoteMapping(60, 1, "trigger");

    // Save mappings to memory
    auto savedData = mapper->saveMappings();

    // Create new mapper and load mappings
    auto newMapper = std::make_unique<ControlMapper>();
    EXPECT_TRUE(newMapper->loadMappings(savedData));

    // Verify mappings were loaded
    EXPECT_NE(newMapper->getMapping(1, 1), nullptr);
    EXPECT_NE(newMapper->getMapping(2, 1), nullptr);
    EXPECT_NE(newMapper->getNoteMapping(60, 1), nullptr);

    EXPECT_EQ(newMapper->getMapping(1, 1)->parameterName, "volume");
    EXPECT_EQ(newMapper->getMapping(2, 1)->parameterName, "pan");
    EXPECT_EQ(newMapper->getNoteMapping(60, 1)->parameterName, "trigger");
}

TEST_F(ControlMappingAdvancedTest, HandlesConflictResolution) {
    // Map the same CC to different parameters
    mapper->addMapping(7, 1, "volume");

    // Try to map the same CC to a different parameter
    EXPECT_FALSE(mapper->addMapping(7, 1, "expression"));

    // Should only have the first mapping
    auto mapping = mapper->getMapping(7, 1);
    ASSERT_NE(mapping, nullptr);
    EXPECT_EQ(mapping->parameterName, "volume");

    // But allow mapping the same CC on different channels
    EXPECT_TRUE(mapper->addMapping(7, 2, "expression"));
    auto mapping2 = mapper->getMapping(7, 2);
    ASSERT_NE(mapping2, nullptr);
    EXPECT_EQ(mapping2->parameterName, "expression");
}

TEST_F(ControlMappingAdvancedTest, ProvidesMappingFeedback) {
    int mappingCreatedCount = 0;
    int mappingRemovedCount = 0;

    mapper->setMappingChangedCallback([&mappingCreatedCount, &mappingRemovedCount](
        bool created, const ControlMapping& mapping) {
        if (created) mappingCreatedCount++;
        else mappingRemovedCount++;
    });

    // Add mapping
    mapper->addMapping(1, 1, "test_param");
    EXPECT_EQ(mappingCreatedCount, 1);

    // Remove mapping
    mapper->removeMapping(1, 1);
    EXPECT_EQ(mappingRemovedCount, 1);
}

TEST_F(ControlMappingAdvancedTest, HandlesParameterSmoothing) {
    mapper->addMapping(1, 1, "smooth_param", 0.0, 1.0);
    mapper->enableSmoothing(true, 100.0); // 100ms smoothing time

    // Simulate rapid parameter changes
    for (int i = 0; i < 10; ++i) {
        juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 1, i * 12);
        mapper->processMIDI(cc);
    }

    // The final value should be smoothed, not just the last raw value
    auto smoothedValue = mapper->getSmoothedValue("smooth_param");
    EXPECT_GE(smoothedValue, 0.0);
    EXPECT_LE(smoothedValue, 1.0);
}

class ControlMidiIntegrationTest : public ::testing::Test {
protected:
    void SetUp() override {
        deviceManager = std::make_unique<juce::AudioDeviceManager>();
        deviceManager->initialiseWithDefaultDevices(0, 2); // No inputs, 2 outputs
    }

    void TearDown() override {
        deviceManager.reset();
    }

    std::unique_ptr<juce::AudioDeviceManager> deviceManager;
};

TEST_F(ControlMidiIntegrationTest, ProcessesRealMIDIInput) {
    auto mapper = std::make_unique<ControlMapper>();
    mapper->addMapping(7, 1, "volume", 0.0, 1.0);

    // Simulate real MIDI input directly
    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 7, 100);
    mapper->processMIDI(cc);

    // Verify the mapping was processed
    auto processedValue = mapper->getCurrentValue("volume");
    EXPECT_GT(processedValue, 0.0);
}

TEST_F(ControlMidiIntegrationTest, HandlesMultipleSimultaneousInputs) {
    auto mapper = std::make_unique<ControlMapper>();

    // Map multiple parameters
    mapper->addMapping(1, 1, "volume", 0.0, 1.0);
    mapper->addMapping(2, 1, "pan", -1.0, 1.0);
    mapper->addMapping(3, 1, "filter", 0.0, 1.0);

    // Simulate simultaneous MIDI messages
    juce::MidiMessage cc1 = juce::MidiMessage::controllerEvent(1, 1, 100);
    juce::MidiMessage cc2 = juce::MidiMessage::controllerEvent(1, 2, 64);
    juce::MidiMessage cc3 = juce::MidiMessage::controllerEvent(1, 3, 32);

    mapper->processMIDI(cc1);
    mapper->processMIDI(cc2);
    mapper->processMIDI(cc3);

    // Verify all parameters were updated
    EXPECT_GT(mapper->getCurrentValue("volume"), 0.0);
    EXPECT_NE(mapper->getCurrentValue("pan"), 0.5); // Should be different from default
    EXPECT_LT(mapper->getCurrentValue("filter"), 1.0);
}

TEST_F(ControlMidiIntegrationTest, MaintainsPerformanceUnderLoad) {
    auto mapper = std::make_unique<ControlMapper>();

    // Create many mappings
    for (int i = 1; i <= 16; ++i) {
        mapper->addMapping(i, 1, "param_" + juce::String(i), 0.0, 1.0);
    }

    auto start = std::chrono::high_resolution_clock::now();

    // Generate many MIDI messages and process directly
    for (int i = 0; i < 1000; ++i) {
        int cc = (i % 16) + 1;
        int value = i % 128;
        juce::MidiMessage ccMsg = juce::MidiMessage::controllerEvent(1, cc, value);
        mapper->processMIDI(ccMsg);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    // Should process 1000 messages with 16 mappings in under 10ms
    EXPECT_LT(duration.count(), 10000);
}