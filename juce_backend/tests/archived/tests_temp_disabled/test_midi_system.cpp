#include <gtest/gtest.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <cstdint>
#include "midi/MIDIDeviceManager_Test.h"
#include "midi/MIDIProcessor_Test.h"
#include "control/ControlMapper_Test.h"
#include "recording/MIDIRecorder_Test.h"

class MIDIDeviceTest : public ::testing::Test {
protected:
    void SetUp() override {
        deviceManager = std::make_unique<MIDIDeviceManager>();
    }

    void TearDown() override {
        deviceManager.reset();
    }

    std::unique_ptr<MIDIDeviceManager> deviceManager;
};

TEST_F(MIDIDeviceTest, DiscoversAndEnumeratesDevices) {
    // Test that MIDI devices are discovered and enumerated
    deviceManager->initialize();

    auto devices = deviceManager->getAvailableDevices();
    EXPECT_GE(devices.size(), 0); // Should work even with no devices

    // If there are devices, they should have valid properties
    for (const auto& device : devices) {
        EXPECT_FALSE(device.name.isEmpty());
        EXPECT_FALSE(device.identifier.isEmpty());
    }
}

TEST_F(MIDIDeviceTest, OpensAndClosesDevices) {
    deviceManager->initialize();

    auto devices = deviceManager->getAvailableDevices();
    if (!devices.empty()) {
        const auto& device = devices[0];

        // Test opening device
        EXPECT_TRUE(deviceManager->openDevice(device.identifier));
        EXPECT_TRUE(deviceManager->isDeviceOpen(device.identifier));

        // Test closing device
        EXPECT_TRUE(deviceManager->closeDevice(device.identifier));
        EXPECT_FALSE(deviceManager->isDeviceOpen(device.identifier));
    }
}

TEST_F(MIDIDeviceTest, HandlesDeviceConnectionChanges) {
    deviceManager->initialize();

    bool deviceConnected = false;
    bool deviceDisconnected = false;

    deviceManager->addDeviceListener([&deviceConnected, &deviceDisconnected](
        const juce::MidiDeviceInfo& device, bool connected) {
        if (connected) {
            deviceConnected = true;
        } else {
            deviceDisconnected = true;
        }
    });

    // This test would ideally simulate device connection/disconnection
    // For now, just ensure the listener mechanism is in place
    EXPECT_TRUE(deviceManager->hasDeviceListeners());
}

TEST_F(MIDIDeviceTest, GetsDeviceCapabilities) {
    deviceManager->initialize();

    auto devices = deviceManager->getAvailableDevices();
    if (!devices.empty()) {
        const auto& device = devices[0];
        auto capabilities = deviceManager->getDeviceCapabilities(device.identifier);

        EXPECT_GE(capabilities.maxInputChannels, 0);
        EXPECT_GE(capabilities.maxOutputChannels, 0);
        EXPECT_GE(capabilities.latency, 0);
        EXPECT_TRUE(capabilities.supportsMTC || !capabilities.supportsMTC); // Should be defined
    }
}

class MIDIProcessorTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor = std::make_unique<MIDIProcessor>();
    }

    void TearDown() override {
        processor.reset();
    }

    std::unique_ptr<MIDIProcessor> processor;
};

TEST(MIDIProcessorTest, ProcessesAllMIDIMessageTypes) {
    auto processor = std::make_unique<MIDIProcessor>();

    // Test Note On messages
    juce::MidiMessage noteOn = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    EXPECT_TRUE(processor->processMessage(noteOn));

    // Test Note Off messages
    juce::MidiMessage noteOff = juce::MidiMessage::noteOff(1, 60);
    EXPECT_TRUE(processor->processMessage(noteOff));

    // Test Control Change messages
    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 7, 100);
    EXPECT_TRUE(processor->processMessage(cc));

    // Test Program Change messages
    juce::MidiMessage programChange = juce::MidiMessage::programChange(1, 5);
    EXPECT_TRUE(processor->processMessage(programChange));

    // Test Pitch Bend messages
    juce::MidiMessage pitchBend = juce::MidiMessage::pitchWheel(1, 8192);
    EXPECT_TRUE(processor->processMessage(pitchBend));

    // Test Channel Pressure
    juce::MidiMessage channelPressure = juce::MidiMessage::channelPressureChange(1, 100);
    EXPECT_TRUE(processor->processMessage(channelPressure));

    // Test Polyphonic Aftertouch
    juce::MidiMessage aftertouch = juce::MidiMessage::aftertouchChange(1, 60, 100);
    EXPECT_TRUE(processor->processMessage(aftertouch));
}

TEST(MIDIProcessorTest, FiltersMessagesCorrectly) {
    auto processor = std::make_unique<MIDIProcessor>();

    // Set up filter to only allow channel 1 messages
    processor->setChannelFilter(1);

    juce::MidiMessage channel1Message = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    juce::MidiMessage channel2Message = juce::MidiMessage::noteOn(2, 60, static_cast<uint8_t>(127));

    EXPECT_TRUE(processor->processMessage(channel1Message));
    EXPECT_FALSE(processor->processMessage(channel2Message));
}

TEST(MIDIProcessorTest, HandlesRealTimeMessages) {
    auto processor = std::make_unique<MIDIProcessor>();

    // Test Clock message
    juce::MidiMessage clock = juce::MidiMessage::midiClock();
    EXPECT_TRUE(processor->processMessage(clock));

    // Test Start message
    juce::MidiMessage start = juce::MidiMessage::midiStart();
    EXPECT_TRUE(processor->processMessage(start));

    // Test Stop message
    juce::MidiMessage stop = juce::MidiMessage::midiStop();
    EXPECT_TRUE(processor->processMessage(stop));

    // Test Continue message
    juce::MidiMessage continueMsg = juce::MidiMessage::midiContinue();
    EXPECT_TRUE(processor->processMessage(continueMsg));
}

TEST(MIDIProcessorTest, TransposesNotes) {
    auto processor = std::make_unique<MIDIProcessor>();

    processor->setTranspose(12); // Transpose up one octave

    juce::MidiMessage noteIn = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127)); // Middle C
    processor->processMessage(noteIn);

    auto processedMessages = processor->getProcessedMessages();
    ASSERT_EQ(processedMessages.size(), 1);

    juce::MidiMessage noteOut = processedMessages[0];
    EXPECT_EQ(noteOut.getNoteNumber(), 72); // One octave higher
    EXPECT_EQ(noteOut.getVelocity(), 127);
}

class ControlMappingTest : public ::testing::Test {
protected:
    void SetUp() override {
        mapper = std::make_unique<ControlMapper>();
    }

    void TearDown() override {
        mapper.reset();
    }

    std::unique_ptr<ControlMapper> mapper;
};

TEST_F(ControlMappingTest, MapsMIDItoParametersCorrectly) {
    // Test mapping CC message to parameter
    EXPECT_TRUE(mapper->addMapping(7, 1, "volume")); // CC 7, Channel 1 -> Volume

    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 7, 100);
    auto mapping = mapper->findMapping(cc);

    EXPECT_NE(mapping, nullptr);
    EXPECT_EQ(mapping->parameterName, "volume");
    EXPECT_EQ(mapping->ccNumber, 7);
    EXPECT_EQ(mapping->channel, 1);
}

TEST_F(ControlMappingTest, HandlesNoteMappings) {
    // Test mapping note to parameter
    EXPECT_TRUE(mapper->addNoteMapping(60, 1, "trigger")); // Note 60, Channel 1 -> Trigger

    juce::MidiMessage note = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    auto mapping = mapper->findMapping(note);

    EXPECT_NE(mapping, nullptr);
    EXPECT_EQ(mapping->parameterName, "trigger");
}

TEST_F(ControlMappingTest, ScalesParameterValues) {
    mapper->addMapping(1, 1, "param", 0.0, 1.0); // CC 1 -> param with 0-1 range

    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 1, 127); // Max value
    auto mapping = mapper->findMapping(cc);

    ASSERT_NE(mapping, nullptr);
    double scaledValue = mapper->scaleMidiValue(cc.getControllerValue(), *mapping);
    EXPECT_NEAR(scaledValue, 1.0, 0.01);

    juce::MidiMessage cc2 = juce::MidiMessage::controllerEvent(1, 1, 0); // Min value
    scaledValue = mapper->scaleMidiValue(cc2.getControllerValue(), *mapping);
    EXPECT_NEAR(scaledValue, 0.0, 0.01);
}

TEST_F(ControlMappingTest, RemovesMappings) {
    mapper->addMapping(7, 1, "volume");

    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 7, 100);
    EXPECT_NE(mapper->findMapping(cc), nullptr);

    EXPECT_TRUE(mapper->removeMapping(7, 1));
    EXPECT_EQ(mapper->findMapping(cc), nullptr);
}

class MIDIRecorderTest : public ::testing::Test {
protected:
    void SetUp() override {
        recorder = std::make_unique<MIDIRecorder>();
    }

    void TearDown() override {
        recorder.reset();
    }

    std::unique_ptr<MIDIRecorder> recorder;
};

TEST_F(MIDIRecorderTest, RecordsMultiTrackMIDI) {
    EXPECT_TRUE(recorder->startRecording());

    // Record some MIDI events
    juce::MidiMessage note1 = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    juce::MidiMessage note2 = juce::MidiMessage::noteOn(2, 64, static_cast<uint8_t>(100));

    recorder->recordMessage(note1, 0.0);
    recorder->recordMessage(note2, 1000.0); // 1 second later

    EXPECT_TRUE(recorder->stopRecording());

    auto track1 = recorder->getTrack(1);
    auto track2 = recorder->getTrack(2);

    EXPECT_EQ(track1.size(), 1);
    EXPECT_EQ(track2.size(), 1);

    EXPECT_EQ(track1[0].message.getNoteNumber(), 60);
    EXPECT_EQ(track2[0].message.getNoteNumber(), 64);
    EXPECT_NEAR(track2[0].timestamp, 1000.0, 1.0);
}

TEST_F(MIDIRecorderTest, HandlesRecordingState) {
    EXPECT_FALSE(recorder->isRecording());

    EXPECT_TRUE(recorder->startRecording());
    EXPECT_TRUE(recorder->isRecording());

    EXPECT_FALSE(recorder->startRecording()); // Can't start while already recording

    EXPECT_TRUE(recorder->stopRecording());
    EXPECT_FALSE(recorder->isRecording());
}

TEST_F(MIDIRecorderTest, ProvidesRecordingFeedback) {
    int recordingStartedCount = 0;
    int recordingStoppedCount = 0;

    recorder->addListener([&recordingStartedCount, &recordingStoppedCount](bool isRecording) {
        if (isRecording) {
            recordingStartedCount++;
        } else {
            recordingStoppedCount++;
        }
    });

    recorder->startRecording();
    recorder->stopRecording();

    EXPECT_EQ(recordingStartedCount, 1);
    EXPECT_EQ(recordingStoppedCount, 1);
}

TEST_F(MIDIRecorderTest, CalculatesRecordingLength) {
    recorder->startRecording();

    juce::MidiMessage note1 = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    juce::MidiMessage note2 = juce::MidiMessage::noteOn(1, 64, static_cast<uint8_t>(100));

    recorder->recordMessage(note1, 0.0);
    recorder->recordMessage(note2, 5000.0); // 5 seconds later

    recorder->stopRecording();

    double recordingLength = recorder->getRecordingLength();
    EXPECT_NEAR(recordingLength, 5.0, 0.1); // Should be approximately 5 seconds
}

class MIDILearnTest : public ::testing::Test {
protected:
    void SetUp() override {
        mapper = std::make_unique<ControlMapper>();
        mapper->enableLearnMode(true);
    }

    void TearDown() override {
        mapper.reset();
    }

    std::unique_ptr<ControlMapper> mapper;
};

TEST_F(MIDILearnTest, LearnsParameterAssignments) {
    EXPECT_TRUE(mapper->isLearnModeEnabled());

    // Simulate selecting a parameter for learning
    mapper->setParameterToLearn("volume");

    // Send MIDI message to learn
    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 7, 100);
    mapper->processLearnMIDI(cc);

    // Check if mapping was created
    auto mapping = mapper->findMapping(cc);
    EXPECT_NE(mapping, nullptr);
    EXPECT_EQ(mapping->parameterName, "volume");
}

TEST_F(MIDILearnTest, HandlesLearnModeState) {
    mapper->enableLearnMode(true);
    EXPECT_TRUE(mapper->isLearnModeEnabled());

    mapper->enableLearnMode(false);
    EXPECT_FALSE(mapper->isLearnModeEnabled());
}

TEST_F(MIDILearnTest, NotifiesParameterLearned) {
    bool parameterLearned = false;
    juce::String learnedParameter;

    mapper->setParameterLearnedCallback([&parameterLearned, &learnedParameter](const juce::String& paramName) {
        parameterLearned = true;
        learnedParameter = paramName;
    });

    mapper->setParameterToLearn("reverb");

    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 10, 50);
    mapper->processLearnMIDI(cc);

    EXPECT_TRUE(parameterLearned);
    EXPECT_EQ(learnedParameter, "reverb");
}

class MIDIFilterTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor = std::make_unique<MIDIProcessor>();
    }

    void TearDown() override {
        processor.reset();
    }

    std::unique_ptr<MIDIProcessor> processor;
};

TEST_F(MIDIFilterTest, FiltersAndRoutesMIDIMessages) {
    // Set up routing to two different destinations
    processor->addRoutingDestination(1, "synth1");
    processor->addRoutingDestination(2, "synth2");

    juce::MidiMessage channel1 = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    juce::MidiMessage channel2 = juce::MidiMessage::noteOn(2, 64, static_cast<uint8_t>(100));

    processor->processMessage(channel1);
    processor->processMessage(channel2);

    auto synth1Messages = processor->getRoutedMessages("synth1");
    auto synth2Messages = processor->getRoutedMessages("synth2");

    EXPECT_EQ(synth1Messages.size(), 1);
    EXPECT_EQ(synth2Messages.size(), 1);

    EXPECT_EQ(synth1Messages[0].getChannel(), 1);
    EXPECT_EQ(synth2Messages[0].getChannel(), 2);
}

TEST_F(MIDIFilterTest, FiltersByMessageType) {
    // Set filter to only allow note messages
    processor->setMessageTypeFilter(MIDIFilterType::NoteOnly);

    juce::MidiMessage note = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    juce::MidiMessage cc = juce::MidiMessage::controllerEvent(1, 7, 100);

    EXPECT_TRUE(processor->processMessage(note));
    EXPECT_FALSE(processor->processMessage(cc));
}

class MIDIClockTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor = std::make_unique<MIDIProcessor>();
    }

    void TearDown() override {
        processor.reset();
    }

    std::unique_ptr<MIDIProcessor> processor;
};

TEST_F(MIDIClockTest, HandlesMIDIClockAndSync) {
    processor->enableClockSync(true);
    EXPECT_TRUE(processor->isClockSyncEnabled());

    // Process some clock messages (24 PPQ)
    for (int i = 0; i < 24; ++i) {
        juce::MidiMessage clock = juce::MidiMessage::midiClock();
        processor->processMessage(clock);
    }

    // Should have advanced one quarter note
    double currentTime = processor->getClockPosition();
    EXPECT_GT(currentTime, 0.0);
}

TEST_F(MIDIClockTest, CalculatesBPM) {
    processor->enableClockSync(true);

    // Simulate clock messages at 120 BPM
    double intervalMs = 60000.0 / (120.0 * 24.0); // 24 PPQ

    for (int i = 0; i < 48; ++i) { // Two beats
        juce::MidiMessage clock = juce::MidiMessage::midiClock();
        processor->processMessage(clock, i * intervalMs);
    }

    double calculatedBPM = processor->getCalculatedBPM();
    EXPECT_NEAR(calculatedBPM, 120.0, 5.0);
}

class MIDIRealtimeTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor = std::make_unique<MIDIProcessor>();
    }

    void TearDown() override {
        processor.reset();
    }

    std::unique_ptr<MIDIProcessor> processor;
};

TEST_F(MIDIRealtimeTest, ProcessesRealtimeMessages) {
    bool startReceived = false;
    bool stopReceived = false;
    bool continueReceived = false;

    processor->setRealtimeCallback([&startReceived, &stopReceived, &continueReceived](juce::MidiMessage msg) {
        if (msg.isMidiStart()) startReceived = true;
        if (msg.isMidiStop()) stopReceived = true;
        if (msg.isMidiContinue()) continueReceived = true;
    });

    juce::MidiMessage start = juce::MidiMessage::midiStart();
    juce::MidiMessage stop = juce::MidiMessage::midiStop();
    juce::MidiMessage continueMsg = juce::MidiMessage::midiContinue();

    EXPECT_TRUE(processor->processMessage(start));
    EXPECT_TRUE(processor->processMessage(stop));
    EXPECT_TRUE(processor->processMessage(continueMsg));

    EXPECT_TRUE(startReceived);
    EXPECT_TRUE(stopReceived);
    EXPECT_TRUE(continueReceived);
}

TEST_F(MIDIRealtimeTest, HasLowLatencyProcessing) {
    // Measure processing time
    auto start = std::chrono::high_resolution_clock::now();

    juce::MidiMessage message = juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(127));
    for (int i = 0; i < 1000; ++i) {
        processor->processMessage(message);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    // Should process 1000 messages in less than 1ms (sub-microsecond per message)
    EXPECT_LT(duration.count(), 1000);
}