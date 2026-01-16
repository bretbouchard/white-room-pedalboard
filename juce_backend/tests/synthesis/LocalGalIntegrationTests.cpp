#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include "../../src/synthesis/LocalGalIntegration.h"

using namespace SchillingerEcosystem::Synthesis;

class LocalGalIntegrationTests : public ::testing::Test
{
protected:
    void SetUp() override
    {
        synth = std::make_unique<LocalGalIntegration>();

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

    std::unique_ptr<LocalGalIntegration> synth;
};

// Feel Vector Tests
TEST_F(LocalGalIntegrationTests, FeelVectorConfiguration)
{
    // Create test feel vector
    LocalGalIntegration::FeelVector testVector;
    testVector.brightness = 0.8f;
    testVector.warmth = 0.6f;
    testVector.rhythm = 0.4f;
    testVector.harmony = 0.7f;
    testVector.texture = 0.5f;
    testVector.movement = 0.3f;

    // Set feel vector
    synth->setFeelVector(testVector);

    // Retrieve and verify (if getter is available)
    // Note: This test assumes the implementation allows feel vector retrieval
    // If not, this test verifies that setting doesn't cause crashes
    EXPECT_NO_THROW(synth->setFeelVector(testVector));
}

TEST_F(LocalGalIntegrationTests, FeelVectorValidation)
{
    // Test feel vector boundary conditions
    LocalGalIntegration::FeelVector extremeVector;
    extremeVector.brightness = -100.0f;  // Should be clamped
    extremeVector.warmth = 1000.0f;     // Should be clamped
    extremeVector.rhythm = 0.0f;        // Valid
    extremeVector.harmony = 0.5f;       // Valid
    extremeVector.texture = 1.0f;       // Valid
    extremeVector.movement = 0.25f;      // Valid

    // Should handle extreme values gracefully
    EXPECT_NO_THROW(synth->setFeelVector(extremeVector));
}

TEST_F(LocalGalIntegrationTests, FeelVectorInterpolation)
{
    // Create start and end feel vectors
    LocalGalIntegration::FeelVector startVector;
    startVector.brightness = 0.0f;
    startVector.warmth = 0.0f;
    startVector.rhythm = 0.0f;
    startVector.harmony = 0.0f;
    startVector.texture = 0.0f;
    startVector.movement = 0.0f;

    LocalGalIntegration::FeelVector endVector;
    endVector.brightness = 1.0f;
    endVector.warmth = 1.0f;
    endVector.rhythm = 1.0f;
    endVector.harmony = 1.0f;
    endVector.texture = 1.0f;
    endVector.movement = 1.0f;

    // Set initial vector
    synth->setFeelVector(startVector);

    // Test morphing (if implemented)
    EXPECT_NO_THROW(synth->setFeelVector(endVector));
}

// Pattern Sequencer Tests
TEST_F(LocalGalIntegrationTests, PatternCreationAndConfiguration)
{
    // Create test pattern
    LocalGalIntegration::Pattern pattern;
    pattern.name = "TestPattern";
    pattern.length = 16; // 16 steps
    pattern.tempo = 120.0f;

    // Create pattern steps
    for (int i = 0; i < 16; ++i)
    {
        LocalGalIntegration::Pattern::Step step;
        step.enabled = (i % 4 == 0); // Every 4th step
        step.velocity = 0.8f;
        step.feelVector = {0.5f, 0.5f, 0.5f, 0.5f, 0.5f, 0.5f};
        pattern.steps.push_back(step);
    }

    // Set pattern
    synth->setPattern(pattern);

    // Verify pattern was set (no crashes)
    EXPECT_NO_THROW(synth->setPattern(pattern));
}

TEST_F(LocalGalIntegrationTests, PatternPlayback)
{
    // Create simple pattern
    LocalGalIntegration::Pattern pattern;
    pattern.length = 8;
    pattern.tempo = 120.0f;

    LocalGalIntegration::Pattern::Step step;
    step.enabled = true;
    step.velocity = 0.8f;
    step.feelVector = {0.6f, 0.4f, 0.7f, 0.5f, 0.3f, 0.8f};

    for (int i = 0; i < 8; ++i)
    {
        pattern.steps.push_back(step);
    }

    synth->setPattern(pattern);

    // Test playback controls
    EXPECT_NO_THROW(synth->startPatternPlayback());
    EXPECT_NO_THROW(synth->stopPatternPlayback());
    EXPECT_NO_THROW(synth->setPatternLoop(true));
    EXPECT_NO_THROW(synth->setPatternTempo(140.0f));
}

TEST_F(LocalGalIntegrationTests, PatternMorphing)
{
    // Create two patterns for morphing
    LocalGalIntegration::Pattern pattern1;
    LocalGalIntegration::Pattern pattern2;

    LocalGalIntegration::Pattern::Step step1;
    step1.feelVector = {0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f};

    LocalGalIntegration::Pattern::Step step2;
    step2.feelVector = {1.0f, 1.0f, 1.0f, 1.0f, 1.0f, 1.0f};

    for (int i = 0; i < 4; ++i)
    {
        pattern1.steps.push_back(step1);
        pattern2.steps.push_back(step2);
    }

    synth->setPattern(pattern1);

    // Test morphing between patterns
    EXPECT_NO_THROW(synth->morphPattern(pattern2, 2.0f)); // 2 second morph
}

// AI Agent Integration Tests
TEST_F(LocalGalIntegrationTests, AgentConnection)
{
    // Test agent connection configuration
    synth->connectToAgent("ws://localhost:8080/agent");

    // Should handle connection gracefully
    EXPECT_NO_THROW(synth->connectToAgent("ws://localhost:8080/agent"));
    EXPECT_NO_THROW(synth->disconnectFromAgent());
    EXPECT_NO_THROW(synth->setAgentEnabled(true));

    // Test with invalid URL
    EXPECT_NO_THROW(synth->connectToAgent("invalid_url"));
}

TEST_F(LocalGalIntegrationTests, AgentParameters)
{
    // Set agent parameters
    synth->setAgentParameter("creativity", 0.8f);
    synth->setAgentParameter("responsiveness", 0.6f);
    synth->setAgentParameter("exploration", 0.4f);
    synth->setAgentParameter("learning_rate", 0.1f);

    // Test parameter retrieval (if available)
    float creativity = synth->getAgentParameter("creativity");
    EXPECT_FLOAT_EQ(creativity, 0.8f);

    // Test invalid parameter
    float invalidParam = synth->getAgentParameter("invalid_parameter");
    EXPECT_FLOAT_EQ(invalidParam, 0.0f); // Should return 0 for invalid
}

TEST_F(LocalGalIntegrationTests, AgentLearning)
{
    // Enable agent
    synth->setAgentEnabled(true);
    synth->connectToAgent("ws://localhost:8080/agent");

    // Test learning operations
    EXPECT_NO_THROW(synth->startAgentLearning());
    EXPECT_NO_THROW(synth->stopAgentLearning());
    EXPECT_NO_THROW(synth->resetAgentLearning());

    // Test feel vector learning
    LocalGalIntegration::FeelVector teachVector;
    teachVector.brightness = 0.9f;
    teachVector.warmth = 0.7f;

    EXPECT_NO_THROW(synth->teachAgentFeelVector(teachVector, "Bright and warm"));
}

// Oscillator Configuration Tests
TEST_F(LocalGalIntegrationTests, OscillatorSetup)
{
    // Configure oscillators
    int numOscillators = 4;
    synth->setNumOscillators(numOscillators);

    // Configure each oscillator
    for (int i = 0; i < numOscillators; ++i)
    {
        LocalGalIntegration::OscillatorConfig config;
        config.enabled = true;
        config.level = 0.5f + (i * 0.1f);
        config.waveform = static_cast<LocalGalIntegration::WaveformType>(i % 4);

        synth->setOscillatorConfig(i, config);
    }

    // Test configuration retrieval
    for (int i = 0; i < numOscillators; ++i)
    {
        auto config = synth->getOscillatorConfig(i);
        EXPECT_TRUE(config.enabled);
        EXPECT_GT(config.level, 0.0f);
    }
}

TEST_F(LocalGalIntegrationTests, FeelVectorInfluence)
{
    // Set up oscillators with feel vector influence
    synth->setNumOscillators(2);

    LocalGalIntegration::OscillatorConfig config1;
    config1.enabled = true;
    config1.brightnessInfluence = 0.8f;
    config1.warmthInfluence = 0.6f;
    config1.rhythmInfluence = 0.4f;
    config1.harmonyInfluence = 0.7f;

    LocalGalIntegration::OscillatorConfig config2;
    config2.enabled = true;
    config2.brightnessInfluence = 0.2f;
    config2.warmthInfluence = 0.9f;
    config2.rhythmInfluence = 0.1f;
    config2.harmonyInfluence = 0.5f;

    synth->setOscillatorConfig(0, config1);
    synth->setOscillatorConfig(1, config2);

    // Set feel vector
    LocalGalIntegration::FeelVector feelVector;
    feelVector.brightness = 0.8f;
    feelVector.warmth = 0.4f;
    feelVector.rhythm = 0.6f;
    feelVector.harmony = 0.7f;

    synth->setFeelVector(feelVector);

    // Test audio processing with feel vector influence
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.7f), 0);

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should produce output influenced by feel vector
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_GT(maxLevel, 0.001f);
}

// Audio Processing Tests
TEST_F(LocalGalIntegrationTests, BasicAudioProcessing)
{
    // Set up basic configuration
    synth->setNumOscillators(2);

    LocalGalIntegration::OscillatorConfig config;
    config.enabled = true;
    config.level = 0.5f;
    synth->setOscillatorConfig(0, config);
    synth->setOscillatorConfig(1, config);

    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    buffer.clear();

    // Process without MIDI (should be silent)
    synth->processBlock(buffer, midiBuffer);
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_LT(maxLevel, 0.001f);
}

TEST_F(LocalGalIntegrationTests, MidiProcessing)
{
    // Set up oscillators
    synth->setNumOscillators(1);

    LocalGalIntegration::OscillatorConfig config;
    config.enabled = true;
    config.level = 0.7f;
    synth->setOscillatorConfig(0, config);

    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add MIDI events
    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);
    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 64, 0.6f), 128);

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should produce output
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_GT(maxLevel, 0.001f);
}

TEST_F(LocalGalIntegrationTests, FeelVectorModulation)
{
    // Set up for feel vector modulation test
    synth->setNumOscillators(1);

    LocalGalIntegration::OscillatorConfig config;
    config.enabled = true;
    config.level = 0.5f;
    config.brightnessInfluence = 1.0f; // Full brightness influence
    synth->setOscillatorConfig(0, config);

    // Start with low brightness
    LocalGalIntegration::FeelVector lowBright;
    lowBright.brightness = 0.1f;
    synth->setFeelVector(lowBright);

    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);

    // Process with low brightness
    buffer.clear();
    synth->processBlock(buffer, midiBuffer);
    float lowBrightLevel = buffer.getMagnitude(0, 0, numSamples);

    // Change to high brightness
    LocalGalIntegration::FeelVector highBright;
    highBright.brightness = 0.9f;
    synth->setFeelVector(highBright);

    // Process with high brightness
    buffer.clear();
    synth->processBlock(buffer, midiBuffer);
    float highBrightLevel = buffer.getMagnitude(0, 0, numSamples);

    // Both should produce output
    EXPECT_GT(lowBrightLevel, 0.001f);
    EXPECT_GT(highBrightLevel, 0.001f);
}

// Effects System Tests
TEST_F(LocalGalIntegrationTests, EffectsConfiguration)
{
    // Configure effects
    LocalGalIntegration::EffectsConfig effects;
    effects.reverbEnabled = true;
    effects.reverbSize = 0.7f;
    effects.reverbWet = 0.3f;

    effects.delayEnabled = true;
    effects.delayTime = 0.25f; // 1/4 second
    effects.delayFeedback = 0.4f;

    effects.filterEnabled = true;
    effects.filterCutoff = 1000.0f;
    effects.filterResonance = 0.5f;

    synth->setEffectsConfig(effects);

    // Test audio with effects
    synth->setNumOscillators(1);

    LocalGalIntegration::OscillatorConfig config;
    config.enabled = true;
    config.level = 0.6f;
    synth->setOscillatorConfig(0, config);

    const int numSamples = 1024;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should produce processed audio
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_GT(maxLevel, 0.001f);
    EXPECT_LT(maxLevel, 5.0f); // Effects shouldn't make it extremely loud
}

// Parameter System Tests
TEST_F(LocalGalIntegrationTests, ParameterManagement)
{
    auto allParams = synth->getAllParameters();
    EXPECT_GT(allParams.size(), 0);

    // Check for expected parameters
    bool foundFeelVectorBrightness = false;
    bool foundNumOscillators = false;

    for (const auto& param : allParams)
    {
        if (param.address == "feel_vector_brightness")
        {
            foundFeelVectorBrightness = true;
            EXPECT_GE(param.defaultValue, 0.0f);
            EXPECT_LE(param.defaultValue, 1.0f);
        }
        if (param.address == "num_oscillators")
        {
            foundNumOscillators = true;
            EXPECT_GT(param.defaultValue, 0);
        }
    }

    EXPECT_TRUE(foundFeelVectorBrightness);
    EXPECT_TRUE(foundNumOscillators);
}

TEST_F(LocalGalIntegrationTests, ParameterGetSet)
{
    // Test feel vector parameter
    synth->setParameterValue("feel_vector_brightness", 0.8f);
    float brightness = synth->getParameterValue("feel_vector_brightness");
    EXPECT_FLOAT_EQ(brightness, 0.8f);

    // Test oscillator parameter
    synth->setParameterValue("oscillator_0_level", 0.6f);
    float level = synth->getParameterValue("oscillator_0_level");
    EXPECT_FLOAT_EQ(level, 0.6f);

    // Test effects parameter
    synth->setParameterValue("reverb_size", 0.7f);
    float reverbSize = synth->getParameterValue("reverb_size");
    EXPECT_FLOAT_EQ(reverbSize, 0.7f);

    // Test invalid parameter
    float invalidValue = synth->getParameterValue("invalid_parameter");
    EXPECT_FLOAT_EQ(invalidValue, 0.0f);
}

// State Management Tests
TEST_F(LocalGalIntegrationTests, StateSerialization)
{
    // Set up some state
    synth->setParameterValue("feel_vector_brightness", 0.9f);
    synth->setParameterValue("feel_vector_warmth", 0.7f);
    synth->setNumOscillators(3);

    // Save state
    auto state = synth->getStateInformation();
    EXPECT_GT(state.getSize(), 0);

    // Reset state
    synth->setParameterValue("feel_vector_brightness", 0.5f);
    synth->setParameterValue("feel_vector_warmth", 0.5f);
    synth->setNumOscillators(1);

    // Restore state
    synth->setStateInformation(state.getData(), static_cast<int>(state.getSize()));

    // Verify state restoration
    EXPECT_FLOAT_EQ(synth->getParameterValue("feel_vector_brightness"), 0.9f);
    EXPECT_FLOAT_EQ(synth->getParameterValue("feel_vector_warmth"), 0.7f);
}

TEST_F(LocalGalIntegrationTests, PresetManagement)
{
    // Create preset
    synth->setParameterValue("master_volume", 0.8f);
    synth->setNumOscillators(2);

    auto presetData = synth->savePreset("TestPreset");
    EXPECT_GT(presetData.getSize(), 0);

    // Reset
    synth->setParameterValue("master_volume", 0.5f);
    synth->setNumOscillators(1);

    // Load preset
    bool loaded = synth->loadPreset(presetData);
    EXPECT_TRUE(loaded);

    // Verify preset loaded
    EXPECT_FLOAT_EQ(synth->getParameterValue("master_volume"), 0.8f);
}

// Performance Tests
TEST_F(LocalGalIntegrationTests, PolyphonicPerformance)
{
    // Set up multiple oscillators
    synth->setNumOscillators(4);
    synth->setMaxVoices(16);

    for (int i = 0; i < 4; ++i)
    {
        LocalGalIntegration::OscillatorConfig config;
        config.enabled = true;
        config.level = 0.4f;
        synth->setOscillatorConfig(i, config);
    }

    // Test with many notes
    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add many notes
    for (int note = 48; note < 72; ++note)
    {
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, 0.6f), 0);
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    buffer.clear();
    synth->processBlock(buffer, midiBuffer);
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should complete in reasonable time
    EXPECT_LT(duration.count(), 15000); // Less than 15ms

    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_GT(maxLevel, 0.001f);
    EXPECT_LT(maxLevel, 10.0f);
}

TEST_F(LocalGalIntegrationTests, ContinuousProcessingStress)
{
    // Set up synth
    synth->setNumOscillators(2);
    synth->setMaxVoices(8);

    for (int i = 0; i < 2; ++i)
    {
        LocalGalIntegration::OscillatorConfig config;
        config.enabled = true;
        config.level = 0.5f;
        synth->setOscillatorConfig(i, config);
    }

    const int numSamples = 256;

    // Process many blocks
    for (int block = 0; block < 1000; ++block)
    {
        juce::AudioBuffer<float> buffer(2, numSamples);
        juce::MidiBuffer midiBuffer;

        // Add random MIDI
        if (block % 30 == 0)
        {
            int note = 60 + (rand() % 24);
            float velocity = 0.4f + (rand() % 60) / 100.0f;
            midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, velocity), 0);
        }

        // Occasionally change feel vector
        if (block % 100 == 0)
        {
            LocalGalIntegration::FeelVector fv;
            fv.brightness = (rand() % 100) / 100.0f;
            fv.warmth = (rand() % 100) / 100.0f;
            synth->setFeelVector(fv);
        }

        EXPECT_NO_THROW(synth->processBlock(buffer, midiBuffer));

        float maxLevel = buffer.getMagnitude(0, 0, numSamples);
        EXPECT_LT(maxLevel, 20.0f); // Shouldn't be extremely loud
    }
}

// Error Handling Tests
TEST_F(LocalGalIntegrationTests, InvalidOscillatorIndex)
{
    // Test invalid oscillator operations
    LocalGalIntegration::OscillatorConfig config;

    EXPECT_NO_THROW(synth->setOscillatorConfig(-1, config));
    EXPECT_NO_THROW(synth->setOscillatorConfig(100, config));
    EXPECT_NO_THROW(auto retrieved = synth->getOscillatorConfig(-1));
    EXPECT_NO_THROW(auto retrieved = synth->getOscillatorConfig(100));
}

TEST_F(LocalGalIntegrationTests, InvalidFeelVectorValues)
{
    // Test with invalid feel vector values
    LocalGalIntegration::FeelVector invalidVector;
    invalidVector.brightness = std::numeric_limits<float>::quiet_NaN();
    invalidVector.warmth = std::numeric_limits<float>::infinity();

    // Should handle gracefully
    EXPECT_NO_THROW(synth->setFeelVector(invalidVector));
}

TEST_F(LocalGalIntegrationTests, EmptyPatternHandling)
{
    // Test with empty pattern
    LocalGalIntegration::Pattern emptyPattern;
    emptyPattern.length = 0;

    EXPECT_NO_THROW(synth->setPattern(emptyPattern));
    EXPECT_NO_THROW(synth->startPatternPlayback());
    EXPECT_NO_THROW(synth->stopPatternPlayback());
}

TEST_F(LocalGalIntegrationTests, AgentConnectionFailure)
{
    // Test behavior when agent connection fails
    synth->connectToAgent("ws://nonexistent:9999/agent");

    // Should still be functional
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.7f), 0);

    EXPECT_NO_THROW(synth->processBlock(buffer, midiBuffer));
}