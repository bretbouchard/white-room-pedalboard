#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include "../../src/synthesis/NexSynthIntegration.h"

using namespace SchillingerEcosystem::Synthesis;

class NexSynthIntegrationTests : public ::testing::Test
{
protected:
    void SetUp() override
    {
        synth = std::make_unique<NexSynthIntegration>();

        // Initialize with standard audio parameters
        const double sampleRate = 44100.0;
        const int bufferSize = 512;

        ASSERT_TRUE(synth->initialize(sampleRate, bufferSize));
        synth->prepareToPlay(sampleRate, bufferSize);
    }

    void TearDown() override
    {
        if (synth)
        {
            synth->releaseResources();
            synth.reset();
        }
    }

    std::unique_ptr<NexSynthIntegration> synth;
};

// Engine Configuration Tests
TEST_F(NexSynthIntegrationTests, EngineModeConfiguration)
{
    // Test engine mode changes
    synth->setEngineMode(NexSynthIntegration::EngineMode::ClassicDX);
    EXPECT_EQ(synth->getEngineMode(), NexSynthIntegration::EngineMode::ClassicDX);

    synth->setEngineMode(NexSynthIntegration::EngineMode::ExtendedDX);
    EXPECT_EQ(synth->getEngineMode(), NexSynthIntegration::EngineMode::ExtendedDX);

    synth->setEngineMode(NexSynthIntegration::EngineMode::FullNex);
    EXPECT_EQ(synth->getEngineMode(), NexSynthIntegration::EngineMode::FullNex);
}

TEST_F(NexSynthIntegrationTests, PolyphonyConfiguration)
{
    // Test voice count changes
    synth->setMaxVoices(16);
    // Note: We can't directly access voice count, but we can test that it doesn't crash
    EXPECT_NO_FATAL_FAILURE(synth->setMaxVoices(32));
    EXPECT_NO_FATAL_FAILURE(synth->setMaxVoices(64));
}

// Operator Management Tests
TEST_F(NexSynthIntegrationTests, OperatorStateManagement)
{
    // Create a test operator
    NexOperator testOp;
    testOp.ratio = 2.0f;
    testOp.level = 0.5f;
    testOp.waveform = NexOperator::Waveform::Sine;
    testOp.enabled = true;

    // Set operator state
    synth->setOperatorState(0, testOp);

    // Get operator state and verify
    const NexOperator& retrievedOp = synth->getOperatorState(0);
    EXPECT_FLOAT_EQ(retrievedOp.ratio, 2.0f);
    EXPECT_FLOAT_EQ(retrievedOp.level, 0.5f);
    EXPECT_EQ(retrievedOp.waveform, NexOperator::Waveform::Sine);
    EXPECT_TRUE(retrievedOp.enabled);
}

TEST_F(NexSynthIntegrationTests, OperatorRoutingMatrix)
{
    // Set up operator routing
    synth->setOperatorRouting(0, 1, 0.5f);  // Operator 0 modulates Operator 1 at 50%
    synth->setOperatorRouting(1, 2, 0.25f); // Operator 1 modulates Operator 2 at 25%

    // Get routing matrix
    auto routingMatrix = synth->getOperatorRoutingMatrix();

    // Verify routing was set (exact implementation depends on internal representation)
    EXPECT_GT(routingMatrix.size(), 0);
    EXPECT_GT(routingMatrix[0].size(), 0);
}

TEST_F(NexSynthIntegrationTests, AllOperatorStates)
{
    // Get all operator states
    auto allOperators = synth->getAllOperatorStates();

    // Should have 12 operators in FullNex mode
    EXPECT_EQ(allOperators.size(), 12);

    // Verify each operator has default values
    for (int i = 0; i < 12; ++i)
    {
        EXPECT_GE(allOperators[i].ratio, 0.0f);
        EXPECT_LE(allOperators[i].ratio, 100.0f);
        EXPECT_GE(allOperators[i].level, 0.0f);
        EXPECT_LE(allOperators[i].level, 1.0f);
    }
}

// Modulation System Tests
TEST_F(NexSynthIntegrationTests, AdvancedLFOConfiguration)
{
    // Configure an LFO
    NexSynthIntegration::AdvancedLFO lfo;
    lfo.waveform = NexSynthIntegration::AdvancedLFO::Waveform::Sine;
    lfo.rate = 2.0f;  // 2 Hz
    lfo.depth = 0.75f;
    lfo.smoothing = 5.0f;

    synth->setAdvancedLFO(0, lfo);

    // Retrieve and verify
    auto retrievedLfo = synth->getAdvancedLFO(0);
    EXPECT_EQ(retrievedLfo.waveform, NexSynthIntegration::AdvancedLFO::Waveform::Sine);
    EXPECT_FLOAT_EQ(retrievedLfo.rate, 2.0f);
    EXPECT_FLOAT_EQ(retrievedLfo.depth, 0.75f);
    EXPECT_FLOAT_EQ(retrievedLfo.smoothing, 5.0f);
}

TEST_F(NexSynthIntegrationTests, ModulationMatrixOperations)
{
    // Create a modulation connection
    NexSynthIntegration::ModulationConnection connection;
    connection.source = NexSynthIntegration::ModulationConnection::Source::LFO1;
    connection.targetParameter = "operator_0_ratio";
    connection.amount = 0.5f;
    connection.enabled = true;

    // Add connection
    synth->addModulationConnection(connection);

    // Get all connections
    auto connections = synth->getModulationConnections();
    EXPECT_GE(connections.size(), 1);

    // Find our connection
    bool found = false;
    for (const auto& conn : connections)
    {
        if (conn.targetParameter == "operator_0_ratio")
        {
            found = true;
            EXPECT_EQ(conn.source, NexSynthIntegration::ModulationConnection::Source::LFO1);
            EXPECT_FLOAT_EQ(conn.amount, 0.5f);
            break;
        }
    }
    EXPECT_TRUE(found);

    // Test clearing matrix
    synth->clearModulationMatrix();
    auto clearedConnections = synth->getModulationConnections();
    EXPECT_EQ(clearedConnections.size(), 0);
}

// Audio Processing Tests
TEST_F(NexSynthIntegrationTests, BasicAudioProcessing)
{
    // Create audio buffer
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Fill buffer with silence
    buffer.clear();

    // Process audio (should produce silence without MIDI input)
    synth->processBlock(buffer, midiBuffer);

    // Verify output is not loud (should be silence or very quiet)
    float maxLevel = 0.0f;
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
    {
        maxLevel = juce::jmax(maxLevel, buffer.getMagnitude(ch, 0, numSamples));
    }
    EXPECT_LT(maxLevel, 0.001f); // Very quiet or silent
}

TEST_F(NexSynthIntegrationTests, NoteOnProcessing)
{
    // Create audio buffer
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    buffer.clear();

    // Add note on
    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);

    // Process audio
    synth->processBlock(buffer, midiBuffer);

    // Should produce some output
    float maxLevel = 0.0f;
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
    {
        maxLevel = juce::jmax(maxLevel, buffer.getMagnitude(ch, 0, numSamples));
    }
    EXPECT_GT(maxLevel, 0.001f); // Should have some output
}

TEST_F(NexSynthIntegrationTests, NoteOnOffSequence)
{
    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Test note on/off sequence
    auto noteOn = juce::MidiMessage::noteOn(1, 60, 0.8f);
    auto noteOff = juce::MidiMessage::noteOff(1, 60, 0.8f);

    midiBuffer.addEvent(noteOn, 0);
    midiBuffer.addEvent(noteOff, 128);

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should have output during the note's duration
    float maxLevel = 0.0f;
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
    {
        maxLevel = juce::jmax(maxLevel, buffer.getMagnitude(ch, 0, numSamples));
    }
    EXPECT_GT(maxLevel, 0.001f);
}

// Parameter System Tests
TEST_F(NexSynthIntegrationTests, ParameterRetrieval)
{
    auto allParams = synth->getAllParameters();
    EXPECT_GT(allParams.size(), 0);

    // Check for expected parameters
    bool foundOp1Ratio = false;
    bool foundMasterVolume = false;

    for (const auto& param : allParams)
    {
        if (param.address == "operator_1_ratio")
        {
            foundOp1Ratio = true;
            EXPECT_GT(param.defaultValue, 0.0f);
        }
        if (param.address == "master_volume")
        {
            foundMasterVolume = true;
            EXPECT_GT(param.defaultValue, 0.0f);
        }
    }

    EXPECT_TRUE(foundOp1Ratio);
    EXPECT_TRUE(foundMasterVolume);
}

TEST_F(NexSynthIntegrationTests, ParameterGetSet)
{
    // Test getting and setting parameters
    const auto* paramInfo = synth->getParameterInfo("master_volume");
    ASSERT_NE(paramInfo, nullptr);

    float originalValue = synth->getParameterValue("master_volume");

    // Set to a new value
    float newValue = 0.75f;
    synth->setParameterValue("master_volume", newValue);

    // Verify the change
    float retrievedValue = synth->getParameterValue("master_volume");
    EXPECT_FLOAT_EQ(retrievedValue, newValue);

    // Test invalid parameter
    float invalidValue = synth->getParameterValue("invalid_parameter");
    EXPECT_EQ(invalidValue, 0.0f); // Should return 0 for invalid parameters
}

// State Management Tests
TEST_F(NexSynthIntegrationTests, StateSerialization)
{
    // Set some parameters
    synth->setParameterValue("master_volume", 0.8f);
    synth->setParameterValue("operator_0_ratio", 2.0f);

    // Save state
    auto state = synth->getStateInformation();
    EXPECT_GT(state.getSize(), 0);

    // Change parameters
    synth->setParameterValue("master_volume", 0.3f);
    synth->setParameterValue("operator_0_ratio", 1.5f);

    // Restore state
    synth->setStateInformation(state.getData(), static_cast<int>(state.getSize()));

    // Verify parameters were restored
    EXPECT_FLOAT_EQ(synth->getParameterValue("master_volume"), 0.8f);
    EXPECT_FLOAT_EQ(synth->getParameterValue("operator_0_ratio"), 2.0f);
}

TEST_F(NexSynthIntegrationTests, PresetManagement)
{
    // Create preset data
    synth->setParameterValue("master_volume", 0.9f);
    synth->setParameterValue("operator_0_level", 0.7f);

    auto presetData = synth->savePreset("TestPreset");
    EXPECT_GT(presetData.getSize(), 0);

    // Reset to defaults
    synth->setParameterValue("master_volume", 0.5f);
    synth->setParameterValue("operator_0_level", 0.5f);

    // Load preset
    bool loaded = synth->loadPreset(presetData);
    EXPECT_TRUE(loaded);

    // Verify preset was loaded
    EXPECT_FLOAT_EQ(synth->getParameterValue("master_volume"), 0.9f);
    EXPECT_FLOAT_EQ(synth->getParameterValue("operator_0_level"), 0.7f);
}

// Multi-band Processing Tests
TEST_F(NexSynthIntegrationTests, MultiBandProcessorConfiguration)
{
    // Configure multi-band processor
    NexSynthIntegration::MultiBandProcessor mbProcessor;
    mbProcessor.crossoverFrequencies = {200.0f, 800.0f, 3200.0f};
    mbProcessor.bandGains = {1.2f, 0.8f, 1.0f, 1.1f};
    mbProcessor.enabled = true;

    synth->setMultiBandProcessor(mbProcessor);

    // Retrieve and verify
    auto retrievedMb = synth->getMultiBandProcessor();
    EXPECT_EQ(retrievedMb.crossoverFrequencies[0], 200.0f);
    EXPECT_EQ(retrievedMb.crossoverFrequencies[1], 800.0f);
    EXPECT_EQ(retrievedMb.crossoverFrequencies[2], 3200.0f);
    EXPECT_FLOAT_EQ(retrievedMb.bandGains[0], 1.2f);
    EXPECT_FLOAT_EQ(retrievedMb.bandGains[1], 0.8f);
    EXPECT_TRUE(retrievedMb.enabled);
}

TEST_F(NexSynthIntegrationTests, MasterProcessorConfiguration)
{
    // Configure master processor
    NexSynthIntegration::MasterProcessor masterProcessor;
    masterProcessor.limiter.enabled = true;
    masterProcessor.limiter.threshold = -3.0f;
    masterProcessor.outputGain.gain = 2.0f;
    masterProcessor.enabled = true;

    synth->setMasterProcessor(masterProcessor);

    // Retrieve and verify
    auto retrievedMaster = synth->getMasterProcessor();
    EXPECT_TRUE(retrievedMaster.limiter.enabled);
    EXPECT_FLOAT_EQ(retrievedMaster.limiter.threshold, -3.0f);
    EXPECT_FLOAT_EQ(retrievedMaster.outputGain.gain, 2.0f);
    EXPECT_TRUE(retrievedMaster.enabled);
}

// Performance Tests
TEST_F(NexSynthIntegrationTests, PolyphonicPerformance)
{
    // Test multiple simultaneous notes
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add multiple notes
    for (int note = 60; note < 72; ++note)
    {
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, 0.7f), 0);
    }

    buffer.clear();

    // Time the processing
    auto startTime = std::chrono::high_resolution_clock::now();
    synth->processBlock(buffer, midiBuffer);
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should complete in reasonable time (less than 10ms for 12 notes)
    EXPECT_LT(duration.count(), 10000);

    // Should produce output
    float maxLevel = 0.0f;
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
    {
        maxLevel = juce::jmax(maxLevel, buffer.getMagnitude(ch, 0, numSamples));
    }
    EXPECT_GT(maxLevel, 0.001f);
}

TEST_F(NexSynthIntegrationTests, ContinuousProcessingStress)
{
    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add some MIDI events
    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);
    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 64, 0.6f), 100);
    midiBuffer.addEvent(juce::MidiMessage::noteOff(1, 60, 0.8f), 300);

    // Process many blocks continuously
    for (int block = 0; block < 1000; ++block)
    {
        buffer.clear();
        midiBuffer.clear();

        // Add some random MIDI
        if (block % 50 == 0)
        {
            int note = 60 + (rand() % 24);
            float velocity = 0.3f + (rand() % 70) / 100.0f;
            midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, velocity), 0);
        }

        EXPECT_NO_THROW(synth->processBlock(buffer, midiBuffer));

        // Verify output levels are reasonable
        float maxLevel = buffer.getMagnitude(0, 0, numSamples);
        EXPECT_LT(maxLevel, 10.0f); // Shouldn't be extremely loud
    }
}

// Edge Cases and Error Handling Tests
TEST_F(NexSynthIntegrationTests, InvalidOperatorIndex)
{
    // Test accessing invalid operator indices
    NexOperator testOp;

    // Should handle gracefully (not crash)
    EXPECT_NO_THROW(synth->setOperatorState(-1, testOp));
    EXPECT_NO_THROW(synth->setOperatorState(20, testOp));
    EXPECT_NO_THROW(auto op = synth->getOperatorState(-1));
    EXPECT_NO_THROW(auto op = synth->getOperatorState(20));
}

TEST_F(NexSynthIntegrationTests, InvalidLFOIndex)
{
    // Test accessing invalid LFO indices
    NexSynthIntegration::AdvancedLFO lfo;

    // Should handle gracefully
    EXPECT_NO_THROW(synth->setAdvancedLFO(-1, lfo));
    EXPECT_NO_THROW(synth->setAdvancedLFO(10, lfo));
    EXPECT_NO_THROW(auto retrievedLfo = synth->getAdvancedLFO(-1));
    EXPECT_NO_THROW(auto retrievedLfo = synth->getAdvancedLFO(10));
}

TEST_F(NexSynthIntegrationTests, ParameterValidation)
{
    // Test setting parameters to extreme values
    synth->setParameterValue("master_volume", -100.0f); // Should be clamped
    synth->setParameterValue("master_volume", 1000.0f);  // Should be clamped

    // Values should be clamped to reasonable ranges
    float value = synth->getParameterValue("master_volume");
    EXPECT_GE(value, 0.0f);
    EXPECT_LE(value, 1.0f);
}

TEST_F(NexSynthIntegrationTests, EmptyStateHandling)
{
    // Test loading empty or invalid state
    synth->setStateInformation(nullptr, 0);

    // Should still be functional
    juce::AudioBuffer<float> buffer(2, 256);
    juce::MidiBuffer midiBuffer;
    buffer.clear();

    EXPECT_NO_THROW(synth->processBlock(buffer, midiBuffer));
}

TEST_F(NexSynthIntegrationTests, LargeParameterCount)
{
    // Test system with many modulation connections
    for (int i = 0; i < 50; ++i)
    {
        NexSynthIntegration::ModulationConnection connection;
        connection.source = static_cast<NexSynthIntegration::ModulationConnection::Source>(i % 6);
        connection.targetParameter = "operator_" + juce::String(i % 12) + "_ratio";
        connection.amount = 0.1f * (i % 10);
        connection.enabled = (i % 2) == 0;

        synth->addModulationConnection(connection);
    }

    // Should handle many connections
    auto connections = synth->getModulationConnections();
    EXPECT_EQ(connections.size(), 50);

    // Processing should still work
    juce::AudioBuffer<float> buffer(2, 256);
    juce::MidiBuffer midiBuffer;
    buffer.clear();

    EXPECT_NO_THROW(synth->processBlock(buffer, midiBuffer));
}