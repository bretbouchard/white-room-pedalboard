#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include "../../src/synthesis/NexSynthEngine_Simple.h"

using namespace JuceBackend::NexSynth;

class NexZetaTests : public ::testing::Test {
protected:
    void SetUp() override {
        engine = std::make_unique<NexSynthEngine>();

        // Initialize for advanced voice architecture testing
        engine->prepareToPlay(44100.0, 512);

        // Create test audio buffer
        testBuffer.setSize(2, 512);
        testBuffer.clear();

        // Setup test configuration
        engine->setMaxVoices(32); // Extended polyphony for advanced architecture
    }

    void TearDown() override {
        engine.reset();
    }

    // Helper method to create a basic MIDI note on
    juce::MidiBuffer createNoteOn(int channel, int note, float velocity) {
        juce::MidiBuffer buffer;
        buffer.addEvent(juce::MidiMessage::noteOn(channel, note, static_cast<uint8_t>(velocity * 127.0f)), 0);
        return buffer;
    }

    std::unique_ptr<NexSynthEngine> engine;
    juce::AudioBuffer<float> testBuffer;
    juce::MidiBuffer midiBuffer;
};

// =============================================================================
// ADVANCED OPERATOR ROUTING TESTS
// =============================================================================

TEST_F(NexZetaTests, BasicOperatorRouting) {
    // Test basic operator routing functionality
    engine->setOperatorRouting(0, 1, 0.5f);  // Op 0 -> Op 1
    engine->setOperatorRouting(0, 2, 0.3f);  // Op 0 -> Op 2
    engine->setOperatorRouting(1, 3, 0.7f);  // Op 1 -> Op 3

    auto routingMatrix = engine->getOperatorRoutingMatrix();

    EXPECT_GT(routingMatrix[0][1], 0.0f) << "Op 0 should route to Op 1";
    EXPECT_GT(routingMatrix[0][2], 0.0f) << "Op 0 should route to Op 2";
    EXPECT_GT(routingMatrix[1][3], 0.0f) << "Op 1 should route to Op 3";
}

TEST_F(NexZetaTests, ComplexModulationMatrix) {
    // Test complex modulation matrix with multiple paths
    engine->setOperatorRouting(0, 1, 0.5f);  // Op 0 -> Op 1
    engine->setOperatorRouting(0, 2, 0.3f);  // Op 0 -> Op 2
    engine->setOperatorRouting(1, 3, 0.7f);  // Op 1 -> Op 3
    engine->setOperatorRouting(4, 6, 0.8f);  // Op 4 -> Op 6
    engine->setOperatorRouting(5, 7, 0.9f);  // Op 5 -> Op 7
    engine->setOperatorRouting(6, 8, 0.3f);  // Op 6 -> Op 8

    auto routingMatrix = engine->getOperatorRoutingMatrix();

    // Verify complex routing paths
    EXPECT_GT(routingMatrix[4][6], 0.7f) << "Op 4 should strongly route to Op 6";
    EXPECT_GT(routingMatrix[5][7], 0.8f) << "Op 5 should strongly route to Op 7";
    EXPECT_GT(routingMatrix[6][8], 0.2f) << "Op 6 should route to Op 8";

    // Test modulation depth scaling
    float totalModulation = 0.0f;
    for (int i = 0; i < 12; ++i) {
        totalModulation += routingMatrix[0][i];
    }
    EXPECT_LE(totalModulation, 2.0f) << "Total modulation should be limited to prevent instability";
}

TEST_F(NexZetaTests, OperatorRoutingPerformance) {
    // Test performance of complex operator routing
    engine->setOperatorRouting(0, 1, 0.5f);  // Op 0 -> Op 1
    engine->setOperatorRouting(0, 2, 0.3f);  // Op 0 -> Op 2

    // Create performance test
    auto startTime = juce::Time::getHighResolutionTicks();

    // Process multiple voices with complex routing
    for (int voice = 0; voice < 16; ++voice) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60 + voice, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
    }

    auto endTime = juce::Time::getHighResolutionTicks();
    auto processingTime = (endTime - startTime) / juce::Time::getHighResolutionTicksPerSecond();

    EXPECT_LT(processingTime, 0.010) << "Complex routing should process quickly (under 10ms)";
}

// =============================================================================
// MULTI-LAYER VOICE ARCHITECTURE TESTS
// =============================================================================

TEST_F(NexZetaTests, MultiLayerVoiceCreation) {
    // Test creation of multiple voice layers
    engine->createVoiceLayer("Bass", 0, 8);
    engine->createVoiceLayer("Mid", 8, 16);
    engine->createVoiceLayer("Treble", 16, 24);

    auto layerInfo = engine->getVoiceLayerInfo();
    EXPECT_EQ(layerInfo.size(), 3) << "Should have 3 voice layers";

    EXPECT_TRUE(layerInfo.find("Bass") != layerInfo.end()) << "Should have Bass layer";
    EXPECT_TRUE(layerInfo.find("Mid") != layerInfo.end()) << "Should have Mid layer";
    EXPECT_TRUE(layerInfo.find("Treble") != layerInfo.end()) << "Should have Treble layer";
}

TEST_F(NexZetaTests, VoiceLayerInteractions) {
    // Test interactions between voice layers
    engine->createVoiceLayer("Layer1", 0, 8);
    engine->createVoiceLayer("Layer2", 8, 16);

    // Setup cross-layer modulation
    engine->setCrossLayerModulation(0, 1, 0.3f);  // Layer 0 -> Layer 1
    engine->setCrossLayerModulation(1, 2, 0.2f);  // Layer 1 -> Layer 2

    auto crossLayerMatrix = engine->getCrossLayerModulationMatrix();
    EXPECT_GT(crossLayerMatrix[0][1], 0.25f) << "Layer 0 should modulate Layer 1";
    EXPECT_GT(crossLayerMatrix[1][2], 0.15f) << "Layer 1 should modulate Layer 2";
}

TEST_F(NexZetaTests, LayerSpecificProcessing) {
    // Test layer-specific processing chains
    engine->createVoiceLayer("Harmonic", 0, 8);
    engine->createVoiceLayer("Percussive", 8, 16);

    // Setup layer-specific processing
    engine->setLayerProcessingType("Harmonic", NexSynthEngine::VoiceProcessingType::Harmonic);
    engine->setLayerProcessingType("Percussive", NexSynthEngine::VoiceProcessingType::Percussive);

    auto layerTypes = engine->getVoiceLayerProcessingTypes();
    EXPECT_EQ(layerTypes["Harmonic"], NexSynthEngine::VoiceProcessingType::Harmonic) << "Harmonic layer should be configured correctly";
    EXPECT_EQ(layerTypes["Percussive"], NexSynthEngine::VoiceProcessingType::Percussive) << "Percussive layer should be configured correctly";
}

// =============================================================================
// VOICE GROUPING AND PROCESSING CHAINS TESTS
// =============================================================================

TEST_F(NexZetaTests, VoiceGroupCreation) {
    // Test voice group creation
    engine->createVoiceGroup("Bass", 0, 8);
    engine->createVoiceGroup("Mid", 8, 16);
    engine->createVoiceGroup("Treble", 16, 24);
    engine->createVoiceGroup("Effects", 24, 32);

    auto groups = engine->getVoiceGroups();
    EXPECT_EQ(groups.size(), 4) << "Should have 4 voice groups";

    EXPECT_TRUE(groups.find("Bass") != groups.end()) << "Should have Bass group";
    EXPECT_TRUE(groups.find("Mid") != groups.end()) << "Should have Mid group";
    EXPECT_TRUE(groups.find("Treble") != groups.end()) << "Should have Treble group";
    EXPECT_TRUE(groups.find("Effects") != groups.end()) << "Should have Effects group";
}

TEST_F(NexZetaTests, GroupSpecificProcessing) {
    // Test group-specific processing chains
    engine->createVoiceGroup("Bass", 0, 8);
    engine->createVoiceGroup("Mid", 8, 16);
    engine->createVoiceGroup("Treble", 16, 24);

    // Configure group-specific effects
    engine->setGroupEffectChain("Bass", {NexSynthEngine::EffectType::SubBass, NexSynthEngine::EffectType::Compression});
    engine->setGroupEffectChain("Mid", {NexSynthEngine::EffectType::HarmonicEnhancer, NexSynthEngine::EffectType::EQ});
    engine->setGroupEffectChain("Treble", {NexSynthEngine::EffectType::BrightEnhancer, NexSynthEngine::EffectType::Reverb});

    auto effectChains = engine->getGroupEffectChains();
    EXPECT_GT(effectChains["Bass"].size(), 0) << "Bass group should have effects";
    EXPECT_GT(effectChains["Mid"].size(), 0) << "Mid group should have effects";
    EXPECT_GT(effectChains["Treble"].size(), 0) << "Treble group should have effects";
}

// =============================================================================
// DYNAMIC VOICE ALLOCATION TESTS
// =============================================================================

TEST_F(NexZetaTests, DynamicVoiceAllocation) {
    // Test dynamic voice allocation strategies
    engine->setVoiceAllocationStrategy(NexSynthEngine::VoiceAllocationStrategy::Dynamic);

    // Create notes that would benefit from different allocation strategies
    std::vector<int> testNotes = {24, 36, 48, 60, 72, 84, 96};  // Multi-octave test

    for (int note : testNotes) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
    }

    auto allocationStats = engine->getVoiceAllocationStats();
    EXPECT_GT(allocationStats.allocatedVoices, 0) << "Should allocate voices for all notes";
    EXPECT_GT(allocationStats.efficiency, 0.8f) << "Should have efficient allocation";
}

TEST_F(NexZetaTests, PriorityVoiceAllocation) {
    // Test priority-based voice allocation
    engine->setVoiceAllocationStrategy(NexSynthEngine::VoiceAllocationStrategy::Priority);

    // Set voice priorities
    engine->setVoicePriority(60, NexSynthEngine::VoicePriority::High);     // C4 - High priority
    engine->setVoicePriority(72, NexSynthEngine::VoicePriority::Critical); // C5 - Critical priority

    // Create voices including priority notes
    juce::MidiBuffer criticalMidi;
    criticalMidi.addEvent(juce::MidiMessage::noteOn(1, 72, static_cast<uint8_t>(0.9f * 127.0f)), 0);  // Critical note
    juce::MidiBuffer highMidi;
    highMidi.addEvent(juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(0.8f * 127.0f)), 0);    // High priority note
    juce::MidiBuffer normalMidi;
    normalMidi.addEvent(juce::MidiMessage::noteOn(1, 48, static_cast<uint8_t>(0.7f * 127.0f)), 0);   // Normal note

    engine->processBlock(testBuffer, criticalMidi);
    engine->processBlock(testBuffer, highMidi);
    engine->processBlock(testBuffer, normalMidi);

    auto priorityStats = engine->getVoicePriorityStats();
    EXPECT_GT(priorityStats.criticalVoices, 0) << "Critical voices should be allocated";
    EXPECT_GT(priorityStats.highPriorityVoices, 0) << "High priority voices should be allocated";
}

// =============================================================================
// ADVANCED VOICE PROCESSING TESTS
// =============================================================================

TEST_F(NexZetaTests, AdvancedVoiceProcessing) {
    // Test advanced voice processing features
    engine->enableAdvancedVoiceProcessing(true);

    // Enable advanced features
    engine->setVoiceProcessingFeature(NexSynthEngine::VoiceProcessingFeature::AdaptiveFiltering, true);
    engine->setVoiceProcessingFeature(NexSynthEngine::VoiceProcessingFeature::DynamicModulation, true);
    engine->setVoiceProcessingFeature(NexSynthEngine::VoiceProcessingFeature::IntelligentBlending, true);

    auto processingStats = engine->getAdvancedProcessingStats();
    EXPECT_TRUE(processingStats.adaptiveFiltering) << "Adaptive filtering should be enabled";
    EXPECT_TRUE(processingStats.dynamicModulation) << "Dynamic modulation should be enabled";
    EXPECT_TRUE(processingStats.intelligentBlending) << "Intelligent blending should be enabled";
}

TEST_F(NexZetaTests, VoiceMemoryManagement) {
    // Test efficient memory management for voice data
    auto initialMemory = engine->getVoiceMemoryUsage();

    // Create and destroy many voices
    for (int i = 0; i < 100; ++i) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 60 + (i % 24), static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);

        // Simulate note off for cleanup
        juce::MidiBuffer noteOffBuffer;
        noteOffBuffer.addEvent(juce::MidiMessage::noteOff(1, 60 + (i % 24), 0.0f), 0);
        engine->processBlock(testBuffer, noteOffBuffer);
    }

    auto finalMemory = engine->getVoiceMemoryUsage();
    EXPECT_LE(finalMemory.allocatedMemory, initialMemory.allocatedMemory * 1.1) << "Memory usage should not grow significantly";
    EXPECT_EQ(finalMemory.leakedVoices, 0) << "Should have no voice memory leaks";
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

TEST_F(NexZetaTests, FullAdvancedArchitectureIntegration) {
    // Test complete integration of advanced voice architecture
    engine->setOperatorRouting(0, 1, 0.5f);  // Op 0 -> Op 1
    engine->setOperatorRouting(0, 2, 0.3f);  // Op 0 -> Op 2
    engine->setOperatorRouting(1, 3, 0.7f);  // Op 1 -> Op 3
    engine->setOperatorRouting(2, 4, 0.4f);  // Op 2 -> Op 4
    engine->setOperatorRouting(3, 5, 0.6f);  // Op 3 -> Op 5

    engine->createVoiceLayer("Bass", 0, 8);
    engine->createVoiceLayer("Mid", 8, 16);
    engine->createVoiceLayer("Treble", 16, 24);

    engine->createVoiceGroup("Bass", 0, 8);
    engine->createVoiceGroup("Mid", 8, 16);
    engine->createVoiceGroup("Treble", 16, 24);
    engine->createVoiceGroup("Effects", 24, 32);

    // Enable all advanced features
    engine->enableAdvancedVoiceProcessing(true);
    engine->setVoiceAllocationStrategy(NexSynthEngine::VoiceAllocationStrategy::Dynamic);
    engine->setVoiceStealingStrategy(NexSynthEngine::VoiceStealingStrategy::Adaptive);

    // Create complex musical scenario
    std::vector<int> chord = {48, 52, 55, 60};  // C Major 7
    for (int note : chord) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
    }

    auto integrationStats = engine->getIntegrationStats();
    EXPECT_GT(integrationStats.activeVoices, 0) << "Should have active voices";
    EXPECT_GT(integrationStats.operatorConnections, 5) << "Should have multiple operator connections";
    EXPECT_GT(integrationStats.voiceLayers, 0) << "Should have active voice layers";
    EXPECT_GT(integrationStats.processingEfficiency, 0.8f) << "Should maintain high processing efficiency";
}

TEST_F(NexZetaTests, AdvancedArchitectureStressTest) {
    // Stress test advanced voice architecture
    engine->setMaxVoices(64);  // Maximum polyphony

    // Create extreme load scenario
    for (int i = 0; i < 50; ++i) {  // High voice count
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, 21 + (i % 84), static_cast<uint8_t>(0.9f * 127.0f)), 0);  // 7 octave range
        engine->processBlock(testBuffer, midiBuffer);
    }

    auto stressStats = engine->getStressTestStats();
    EXPECT_LT(stressStats.averageProcessingTime, 0.002) << "Should maintain real-time processing under stress";
    EXPECT_GT(stressStats.voicesProcessed, 0) << "Should have processed voices under stress";
    EXPECT_LT(stressStats.xruns, 5) << "Should have minimal audio dropouts under stress";
}

TEST_F(NexZetaTests, AdvancedArchitectureQuality) {
    // Test quality of advanced voice architecture output
    engine->setOperatorRouting(0, 1, 0.5f);  // Op 0 -> Op 1
    engine->setOperatorRouting(0, 2, 0.3f);  // Op 0 -> Op 2

    // Create a sustained chord for quality analysis
    std::vector<int> testChord = {48, 55, 60, 64};  // C Major 7
    for (int note : testChord) {
        juce::MidiBuffer midiBuffer;
        midiBuffer.addEvent(juce::MidiMessage::noteOn(1, note, static_cast<uint8_t>(0.8f * 127.0f)), 0);
        engine->processBlock(testBuffer, midiBuffer);
    }

    // Process for sustained period
    for (int i = 0; i < 10; ++i) {  // Reduced iterations for test speed
        engine->processBlock(testBuffer, midiBuffer);
    }

    auto qualityStats = engine->getOutputQualityStats();
    EXPECT_GT(qualityStats.signalToNoiseRatio, 60.0f) << "Should have good signal-to-noise ratio";
    EXPECT_LT(qualityStats.thd, 0.01f) << "Should have low total harmonic distortion";
    EXPECT_GT(qualityStats.frequencyResponse_flatness, 0.9f) << "Should have flat frequency response";
}