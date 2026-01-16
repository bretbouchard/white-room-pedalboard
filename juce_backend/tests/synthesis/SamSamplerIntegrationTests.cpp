#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>
#include "../../src/synthesis/SamSamplerIntegration.h"

using namespace SchillingerEcosystem::Synthesis;

class SamSamplerIntegrationTests : public ::testing::Test
{
protected:
    void SetUp() override
    {
        synth = std::make_unique<SamSamplerIntegration>();

        const double sampleRate = 44100.0;
        const int bufferSize = 512;

        ASSERT_TRUE(synth->initialize(sampleRate, bufferSize));
        synth->prepareToPlay(sampleRate, bufferSize);

        // Create a test sample file
        createTestSampleFile();
    }

    void TearDown() override
    {
        if (synth)
        {
            synth->releaseResources();
            synth.reset();
        }

        // Clean up test files
        cleanupTestFiles();
    }

    void createTestSampleFile()
    {
        // Create a simple sine wave test sample
        const double sampleRate = 44100.0;
        const int numSamples = static_cast<int>(sampleRate * 1.0); // 1 second
        const float frequency = 440.0f; // A4

        testSampleFile = juce::File::getSpecialLocation(juce::File::tempDirectory)
                            .getChildFile("test_sample.wav");

        juce::WavAudioFormat format;
        std::unique_ptr<juce::AudioFormatWriter> writer;

        writer.reset(format.createWriterFor(
            new juce::FileOutputStream(testSampleFile),
            sampleRate, 1, 16, {}, 0));

        if (writer != nullptr)
        {
            juce::AudioBuffer<float> buffer(1, numSamples);

            for (int i = 0; i < numSamples; ++i)
            {
                float sample = std::sin(2.0 * juce::MathConstants<double>::pi * frequency * i / sampleRate) * 0.7f;
                buffer.setSample(0, i, sample);
            }

            writer->writeFromAudioBuffer(buffer, 0, numSamples);
        }
    }

    void cleanupTestFiles()
    {
        if (testSampleFile.exists())
        {
            testSampleFile.deleteFile();
        }
    }

    std::unique_ptr<SamSamplerIntegration> synth;
    juce::File testSampleFile;
};

// Sample Management Tests
TEST_F(SamSamplerIntegrationTests, SampleLoading)
{
    // Test loading a sample
    bool loaded = synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    EXPECT_TRUE(loaded);

    // Verify sample is in library
    auto samples = synth->getLoadedSamples();
    EXPECT_GT(samples.size(), 0);

    // Find our sample
    auto testSample = synth->findSample("TestSample");
    ASSERT_NE(testSample, nullptr);
    EXPECT_TRUE(testSample->isValid());
    EXPECT_GT(testSample->numSamples, 0);
    EXPECT_GT(testSample->sampleRate, 0);
    EXPECT_EQ(testSample->name, "TestSample");
}

TEST_F(SamSamplerIntegrationTests, SampleUnloading)
{
    // Load a sample first
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    EXPECT_NE(synth->findSample("TestSample"), nullptr);

    // Unload the sample
    bool unloaded = synth->unloadSample("TestSample");
    EXPECT_TRUE(unloaded);

    // Verify sample is gone
    EXPECT_EQ(synth->findSample("TestSample"), nullptr);

    // Test unloading non-existent sample
    bool unloadFailed = synth->unloadSample("NonExistentSample");
    EXPECT_FALSE(unloadFailed);
}

TEST_F(SamSamplerIntegrationTests, SampleMetadata)
{
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    auto sample = synth->findSample("TestSample");
    ASSERT_NE(sample, nullptr);

    // Check basic metadata
    EXPECT_GT(sample->sampleRate, 0);
    EXPECT_GT(sample->numSamples, 0);
    EXPECT_GT(sample->length, 0.0);
    EXPECT_GT(sample->rmsLevel, 0.0f);
    EXPECT_GT(sample->peakLevel, 0.0f);

    // Check format detection
    EXPECT_NE(sample->format, SamSample::Format::Unknown);
    EXPECT_EQ(sample->format, SamSample::Format::WAV);
}

TEST_F(SamSamplerIntegrationTests, MultipleSampleLoading)
{
    // Create additional test samples
    auto testFile2 = juce::File::getSpecialLocation(juce::File::tempDirectory)
                        .getChildFile("test_sample2.wav");

    // Copy the test file to create a second one
    testSampleFile.copyFileTo(testFile2);

    // Load both samples
    bool loaded1 = synth->loadSample(testSampleFile.getFullPathName(), "Sample1");
    bool loaded2 = synth->loadSample(testFile2.getFullPathName(), "Sample2");

    EXPECT_TRUE(loaded1);
    EXPECT_TRUE(loaded2);

    // Verify both are loaded
    auto samples = synth->getLoadedSamples();
    EXPECT_GE(samples.size(), 2);

    // Clean up
    synth->unloadSample("Sample1");
    synth->unloadSample("Sample2");
    testFile2.deleteFile();
}

// Layer Management Tests
TEST_F(SamSamplerIntegrationTests, LayerCreationAndConfiguration)
{
    // Create a layer
    auto layer = synth->createLayer("TestLayer");
    ASSERT_NE(layer, nullptr);

    // Configure the layer
    SamLayer::LayerConfig config;
    config.name = "TestLayer";
    config.minVelocity = 20;
    config.maxVelocity = 80;
    config.volume = -3.0f;
    config.pan = 0.2f;
    config.enabled = true;

    bool configured = synth->configureLayer(0, config);
    EXPECT_TRUE(configured);

    // Verify configuration
    auto retrievedConfig = layer->getConfig();
    EXPECT_EQ(retrievedConfig.minVelocity, 20);
    EXPECT_EQ(retrievedConfig.maxVelocity, 80);
    EXPECT_FLOAT_EQ(retrievedConfig.volume, -3.0f);
    EXPECT_FLOAT_EQ(retrievedConfig.pan, 0.2f);
    EXPECT_TRUE(retrievedConfig.enabled);
}

TEST_F(SamSamplerIntegrationTests, LayerSampleAssignment)
{
    // Load sample and create layer
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    auto sample = synth->findSample("TestSample");
    ASSERT_NE(sample, nullptr);

    auto layer = synth->createLayer("TestLayer");
    ASSERT_NE(layer, nullptr);

    // Assign sample to layer
    bool assigned = synth->addSampleToLayer(0, sample);
    EXPECT_TRUE(assigned);

    // Verify assignment
    auto layerSample = layer->getSample();
    EXPECT_EQ(layerSample, sample);
}

TEST_F(SamSamplerIntegrationTests, MultipleLayers)
{
    // Create multiple layers
    int numLayers = 4;
    for (int i = 0; i < numLayers; ++i)
    {
        auto layer = synth->createLayer("Layer" + juce::String(i + 1));
        ASSERT_NE(layer, nullptr);

        // Configure different velocity ranges
        SamLayer::LayerConfig config;
        config.minVelocity = i * 32;
        config.maxVelocity = (i + 1) * 32 - 1;
        config.enabled = true;

        synth->configureLayer(i, config);
    }

    // Verify all layers exist
    auto layers = synth->getAllLayers();
    EXPECT_EQ(layers.size(), numLayers);

    // Test velocity activation
    for (int i = 0; i < numLayers; ++i)
    {
        int testVelocity = i * 32 + 16; // Middle of range
        EXPECT_TRUE(layers[i]->isActiveForVelocity(testVelocity));
        EXPECT_FALSE(layers[i]->isActiveForVelocity(testVelocity + 32)); // Next range
    }
}

TEST_F(SamSamplerIntegrationTests, LayerRemoval)
{
    // Create and configure layers
    synth->createLayer("Layer1");
    synth->createLayer("Layer2");

    auto layers = synth->getAllLayers();
    EXPECT_EQ(layers.size(), 2);

    // Remove a layer
    bool removed = synth->removeLayer(0);
    EXPECT_TRUE(removed);

    // Verify removal
    layers = synth->getAllLayers();
    EXPECT_EQ(layers.size(), 1);

    // Test removing non-existent layer
    bool removeFailed = synth->removeLayer(10);
    EXPECT_FALSE(removeFailed);
}

// Voice Management Tests
TEST_F(SamSamplerIntegrationTests, VoiceAllocation)
{
    // Load sample and set up layers
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    auto sample = synth->findSample("TestSample");
    ASSERT_NE(sample, nullptr);

    auto layer = synth->createLayer("TestLayer");
    synth->addSampleToLayer(0, sample);

    // Set polyphony
    synth->setMaxVoices(8);

    // Test voice allocation through MIDI
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add notes
    for (int note = 60; note <= 68; ++note)
    {
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, 0.7f), 0);
    }

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should produce output
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_GT(maxLevel, 0.001f);
}

TEST_F(SamSamplerIntegrationTests, PolyphonyLimits)
{
    // Set low polyphony to test voice stealing
    synth->setMaxVoices(2);

    // Load sample
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    auto sample = synth->findSample("TestSample");
    ASSERT_NE(sample, nullptr);

    auto layer = synth->createLayer("TestLayer");
    synth->addSampleToLayer(0, sample);

    // Test with more notes than voices
    const int numSamples = 512;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add more notes than polyphony
    for (int note = 60; note < 70; ++note)
    {
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, 0.7f), note * 10);
        midiBuffer.addEvent(juce::MidiMessage::noteOff(1, note, 0.7f), note * 10 + 50);
    }

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should handle gracefully (not crash)
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_LT(maxLevel, 100.0f); // Shouldn't be extremely loud due to voice stealing
}

// Advanced Processing Tests
TEST_F(SamSamplerIntegrationTests, GranularProcessing)
{
    // Enable granular processing
    GranularProcessor::GranularSettings settings;
    settings.grainSize = 0.05f;  // 50ms grains
    settings.grainDensity = 100.0f; // 100 grains per second
    settings.freezeMode = false;

    synth->setGranularEnabled(true, settings);

    // Verify granular processor is available
    auto granular = synth->getGranularProcessor();
    ASSERT_NE(granular, nullptr);

    auto retrievedSettings = granular->getSettings();
    EXPECT_FLOAT_EQ(retrievedSettings.grainSize, 0.05f);
    EXPECT_FLOAT_EQ(retrievedSettings.grainDensity, 100.0f);
    EXPECT_FALSE(retrievedSettings.freezeMode);
}

TEST_F(SamSamplerIntegrationTests, TimeStretchProcessing)
{
    // Enable time stretching
    TimeStretchProcessor::StretchSettings settings;
    settings.algorithm = TimeStretchProcessor::Algorithm::WSOLA;
    settings.timeRatio = 2.0f; // 2x slower
    settings.pitchRatio = 1.0f; // No pitch change

    synth->setTimeStretchEnabled(true, settings);

    // Verify time stretch processor is available
    auto timeStretch = synth->getTimeStretchProcessor();
    ASSERT_NE(timeStretch, nullptr);

    auto retrievedSettings = timeStretch->getSettings();
    EXPECT_EQ(retrievedSettings.algorithm, TimeStretchProcessor::Algorithm::WSOLA);
    EXPECT_FLOAT_EQ(retrievedSettings.timeRatio, 2.0f);
    EXPECT_FLOAT_EQ(retrievedSettings.pitchRatio, 1.0f);
}

TEST_F(SamSamplerIntegrationTests, AdvancedProcessingWithAudio)
{
    // Set up sample and enable both processors
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    auto sample = synth->findSample("TestSample");
    ASSERT_NE(sample, nullptr);

    auto layer = synth->createLayer("TestLayer");
    synth->addSampleToLayer(0, sample);

    // Enable granular processing
    GranularProcessor::GranularSettings grainSettings;
    grainSettings.grainSize = 0.1f;
    grainSettings.grainDensity = 50.0f;
    synth->setGranularEnabled(true, grainSettings);

    // Enable time stretching
    TimeStretchProcessor::StretchSettings stretchSettings;
    stretchSettings.timeRatio = 1.5f;
    synth->setTimeStretchEnabled(true, stretchSettings);

    // Process audio with advanced processing
    const int numSamples = 1024;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should produce processed audio
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_GT(maxLevel, 0.001f);
}

// Sample Slicing Tests
TEST_F(SamSamplerIntegrationTests, SampleSlicing)
{
    // Load sample
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    auto sample = synth->findSample("TestSample");
    ASSERT_NE(sample, nullptr);

    // Analyze for slices
    auto slices = synth->analyzeSlices(sample);
    EXPECT_GE(slices.size(), 1); // Should find at least one slice (the start)

    // Check slice properties
    for (const auto& slice : slices)
    {
        EXPECT_GE(slice.position, 0.0);
        EXPECT_LE(slice.position, sample->length);
        EXPECT_GE(slice.velocity, 0.0f);
        EXPECT_FALSE(slice.type.isEmpty());
    }
}

TEST_F(SamSamplerIntegrationTests, DrumKitCreation)
{
    // Create multiple test sample files (simplified for test)
    std::vector<juce::String> sampleFiles;
    for (int i = 0; i < 3; ++i)
    {
        auto file = juce::File::getSpecialLocation(juce::File::tempDirectory)
                       .getChildFile("drum" + juce::String(i) + ".wav");
        testSampleFile.copyFileTo(file);
        sampleFiles.push_back(file.getFullPathName());
    }

    // Create drum kit
    bool created = synth->createDrumKit(sampleFiles);
    EXPECT_TRUE(created);

    // Test slice mapping
    synth->mapNoteToSlice(36, 0); // Kick to C2
    synth->mapNoteToSlice(38, 1); // Snare to D2
    synth->mapNoteToSlice(42, 2); // Hi-hat to F#2

    auto mapping = synth->getSliceMapping();
    EXPECT_EQ(mapping[36], 0);
    EXPECT_EQ(mapping[38], 1);
    EXPECT_EQ(mapping[42], 2);

    // Clean up
    for (const auto& filePath : sampleFiles)
    {
        juce::File(filePath).deleteFile();
    }
}

// Parameter System Tests
TEST_F(SamSamplerIntegrationTests, ParameterRetrieval)
{
    auto allParams = synth->getAllParameters();
    EXPECT_GT(allParams.size(), 0);

    // Check for expected parameters
    bool foundMasterVolume = false;
    bool foundPolyphony = false;

    for (const auto& param : allParams)
    {
        if (param.address == "master_volume")
        {
            foundMasterVolume = true;
            EXPECT_GT(param.defaultValue, 0.0f);
        }
        if (param.address == "polyphony")
        {
            foundPolyphony = true;
            EXPECT_GT(param.defaultValue, 0);
        }
    }

    EXPECT_TRUE(foundMasterVolume);
    EXPECT_TRUE(foundPolyphony);
}

TEST_F(SamSamplerIntegrationTests, GranularParameterControl)
{
    // Enable granular processing first
    GranularProcessor::GranularSettings settings;
    synth->setGranularEnabled(true, settings);

    // Test granular parameter control
    synth->setParameterValue("granular_grain_size", 0.1f);
    synth->setParameterValue("granular_density", 75.0f);
    synth->setParameterValue("granular_freeze_mode", 1.0f);

    auto granular = synth->getGranularProcessor();
    ASSERT_NE(granular, nullptr);

    auto retrievedSettings = granular->getSettings();
    EXPECT_FLOAT_EQ(retrievedSettings.grainSize, 0.1f);
    EXPECT_FLOAT_EQ(retrievedSettings.grainDensity, 75.0f);
    EXPECT_TRUE(retrievedSettings.freezeMode);
}

// State Management Tests
TEST_F(SamSamplerIntegrationTests, StateSerialization)
{
    // Set up some state
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    synth->setParameterValue("master_volume", 0.8f);
    synth->setMaxVoices(16);

    // Save state
    auto state = synth->getStateInformation();
    EXPECT_GT(state.getSize(), 0);

    // Reset state
    synth->setParameterValue("master_volume", 0.5f);
    synth->unloadSample("TestSample");

    // Restore state
    synth->setStateInformation(state.getData(), static_cast<int>(state.getSize()));

    // Verify state restoration
    EXPECT_FLOAT_EQ(synth->getParameterValue("master_volume"), 0.8f);
    EXPECT_NE(synth->findSample("TestSample"), nullptr);
}

TEST_F(SamSamplerIntegrationTests, PresetManagement)
{
    // Create preset data
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    synth->setParameterValue("master_volume", 0.9f);

    auto presetData = synth->savePreset("TestPreset");
    EXPECT_GT(presetData.getSize(), 0);

    // Reset
    synth->setParameterValue("master_volume", 0.5f);
    synth->unloadSample("TestSample");

    // Load preset
    bool loaded = synth->loadPreset(presetData);
    EXPECT_TRUE(loaded);

    // Verify preset loaded
    EXPECT_FLOAT_EQ(synth->getParameterValue("master_volume"), 0.9f);
    EXPECT_NE(synth->findSample("TestSample"), nullptr);
}

// Performance Tests
TEST_F(SamSamplerIntegrationTests, StreamingPerformance)
{
    // Enable streaming for large files
    synth->setStreamingEnabled(true);
    synth->setStreamingBufferSize(1.0); // 1 second buffer

    // Test with multiple layers and samples
    for (int i = 0; i < 4; ++i)
    {
        synth->loadSample(testSampleFile.getFullPathName(), "Sample" + juce::String(i));
        auto layer = synth->createLayer("Layer" + juce::String(i));
        auto sample = synth->findSample("Sample" + juce::String(i));
        synth->addSampleToLayer(i, sample);
    }

    const int numSamples = 1024;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    // Add notes for different layers
    for (int note = 60; note < 64; ++note)
    {
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, 0.7f), note * 10);
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    buffer.clear();
    synth->processBlock(buffer, midiBuffer);
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should complete in reasonable time
    EXPECT_LT(duration.count(), 20000); // Less than 20ms

    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_GT(maxLevel, 0.001f);
}

TEST_F(SamSamplerIntegrationTests, ContinuousProcessingStress)
{
    // Set up sampler
    synth->loadSample(testSampleFile.getFullPathName(), "TestSample");
    auto sample = synth->findSample("TestSample");
    auto layer = synth->createLayer("TestLayer");
    synth->addSampleToLayer(0, sample);

    const int numSamples = 512;

    // Process many blocks with various MIDI events
    for (int block = 0; block < 500; ++block)
    {
        juce::AudioBuffer<float> buffer(2, numSamples);
        juce::MidiBuffer midiBuffer;

        // Add random MIDI events
        if (block % 25 == 0)
        {
            int note = 60 + (rand() % 24);
            float velocity = 0.3f + (rand() % 70) / 100.0f;
            midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, velocity), 0);

            if (block % 50 == 0)
            {
                midiBuffer.addEvent(juce::MidiMessage::noteOff(1, note, velocity), 100);
            }
        }

        EXPECT_NO_THROW(synth->processBlock(buffer, midiBuffer));

        float maxLevel = buffer.getMagnitude(0, 0, numSamples);
        EXPECT_LT(maxLevel, 10.0f); // Shouldn't be extremely loud
    }
}

// Error Handling Tests
TEST_F(SamSamplerIntegrationTests, InvalidSampleFile)
{
    // Try to load invalid file
    bool loaded = synth->loadSample("/nonexistent/file.wav", "InvalidSample");
    EXPECT_FALSE(loaded);

    // Verify no sample was created
    EXPECT_EQ(synth->findSample("InvalidSample"), nullptr);
}

TEST_F(SamSamplerIntegrationTests, InvalidLayerOperations)
{
    // Test operations on non-existent layers
    SamLayer::LayerConfig config;
    bool configured = synth->configureLayer(100, config);
    EXPECT_FALSE(configured);

    bool removed = synth->removeLayer(100);
    EXPECT_FALSE(removed);

    auto layer = synth->getLayer(100);
    EXPECT_EQ(layer, nullptr);
}

TEST_F(SamSamplerIntegrationTests, EmptySampleHandling)
{
    // Test processing without loaded samples
    const int numSamples = 256;
    juce::AudioBuffer<float> buffer(2, numSamples);
    juce::MidiBuffer midiBuffer;

    midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.8f), 0);

    buffer.clear();
    synth->processBlock(buffer, midiBuffer);

    // Should produce silence (no samples loaded)
    float maxLevel = buffer.getMagnitude(0, 0, numSamples);
    EXPECT_LT(maxLevel, 0.001f);
}