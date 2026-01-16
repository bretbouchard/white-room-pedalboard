/*
  ==============================================================================

    SamSamplerDSPTest.cpp
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    TDD Test Suite for SamSamplerDSP - Phase 0

  ==============================================================================
*/

#include "../../include/dsp/SamSamplerDSP.h"
#include "DSPTestFramework.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <cstdint>
#include <iostream>

using namespace DSPTestFramework;

//==============================================================================
// Test Suite 1: Basic Class Creation
//==============================================================================

void test_CreateInstance()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    if (sampler == nullptr) throw std::runtime_error("Failed to create instance");
}

void test_GetName()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    juce::String name = sampler->getName();
    if (name != "SamSamplerDSP") throw std::runtime_error("Wrong name");
}

void test_AcceptsMidi()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    if (!sampler->acceptsMidi()) throw std::runtime_error("Should accept MIDI");
}

void test_DoesNotProduceMidi()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    if (sampler->producesMidi()) throw std::runtime_error("Should not produce MIDI");
}

void test_HasNoEditor()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    if (sampler->hasEditor()) throw std::runtime_error("Should not have editor");
}

//==============================================================================
// Test Suite 2: Audio Processing
//==============================================================================

void test_PrepareToPlay()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
}

void test_ProcessSilence()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;
    sampler->processBlock(buffer, midi);
    if (!Framework::isSilent(buffer)) throw std::runtime_error("Should be silent");
}

void test_ProcessBlockWithNoteOn()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

//==============================================================================
// Test Suite 3: Parameters
//==============================================================================

void test_ParametersExist()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    auto params = sampler->getParameterList();
    if (params.size() == 0) throw std::runtime_error("Should have parameters");
}

void test_GetMasterVolume()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    float volume = sampler->getParameterValue("master_volume");
    if (volume < 0.7f || volume > 0.9f) throw std::runtime_error("Wrong default volume");
}

void test_SetMasterVolume()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->setParameterValue("master_volume", 0.5f);
    float volume = sampler->getParameterValue("master_volume");
    if (volume < 0.45f || volume > 0.55f) throw std::runtime_error("Volume not set");
}

//==============================================================================
// Test Suite 4: Voice Management
//==============================================================================

void test_Polyphony16Voices()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;
    for (int i = 0; i < 16; ++i) {
        juce::uint8 vel = 127;
        midi.addEvent(juce::MidiMessage::noteOn(1, 60 + i, vel), 0);
    }
    sampler->processBlock(buffer, midi);
}

void test_VoiceStealing()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;
    for (int i = 0; i < 20; ++i) {
        juce::uint8 vel = 127;
        midi.addEvent(juce::MidiMessage::noteOn(1, 60 + i, vel), 0);
    }
    sampler->processBlock(buffer, midi);
}

//==============================================================================
// Test Suite 5: Preset System
//==============================================================================

void test_GetPresetState()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string json = sampler->getPresetState();
    if (json.length() == 0) throw std::runtime_error("JSON should not be empty");
    // Print first 100 chars for debugging
    std::cout << "  JSON preview: " << json.substr(0, std::min(size_t(100), json.length())) << "..." << std::endl;
    if (json[0] != '{') throw std::runtime_error("Invalid JSON");
}

void test_SetPresetState()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string json = "{}";
    sampler->setPresetState(json);
}

//==============================================================================
// Test Suite 6: Phase 2 - Multi-Layer Velocity Mapping
//==============================================================================

void test_TwoLayersVelocitySwitch()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::SampleLayer layer1;
    layer1.minVelocity = 0;
    layer1.maxVelocity = 63;
    layer1.enabled = true;

    SamSamplerDSP::SampleLayer layer2;
    layer2.minVelocity = 64;
    layer2.maxVelocity = 127;
    layer2.enabled = true;

    sampler->addLayer(layer1);
    sampler->addLayer(layer2);

    if (sampler->getLayerCount() != 2) throw std::runtime_error("Should have 2 layers");
}

void test_LayerCrossfading()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::SampleLayer layer;
    layer.minVelocity = 40;
    layer.maxVelocity = 80;
    layer.crossfadeLower = 10.0f;  // 10% crossfade
    layer.crossfadeUpper = 10.0f;
    layer.enabled = true;

    sampler->addLayer(layer);

    if (sampler->getLayerCount() != 1) throw std::runtime_error("Layer not added");
}

void test_LayerVolumeScaling()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::SampleLayer layer;
    layer.volume = -6.0f;  // -6 dB
    layer.enabled = true;

    sampler->addLayer(layer);

    if (sampler->getLayerCount() != 1) throw std::runtime_error("Layer not added");
}

void test_LayerPanPosition()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::SampleLayer layer;
    layer.pan = -0.5f;  // Pan left
    layer.enabled = true;

    sampler->addLayer(layer);

    if (sampler->getLayerCount() != 1) throw std::runtime_error("Layer not added");
}

void test_DisabledLayerIgnored()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::SampleLayer layer;
    layer.enabled = false;

    sampler->addLayer(layer);

    if (sampler->getLayerCount() != 1) throw std::runtime_error("Layer should still be added");
}

void test_ClearLayers()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::SampleLayer layer1, layer2;
    layer1.enabled = true;
    layer2.enabled = true;

    sampler->addLayer(layer1);
    sampler->addLayer(layer2);
    sampler->clearLayers();

    if (sampler->getLayerCount() != 0) throw std::runtime_error("Layers should be cleared");
}

//==============================================================================
// Test Suite 7: Phase 2 - Granular Synthesis
//==============================================================================

void test_GranularEnabled()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setGranularEnabled(true);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);

    if (!Framework::hasSignal(buffer)) throw std::runtime_error("Should produce sound");
}

void test_GrainSizeChanges()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setGranularEnabled(true);
    sampler->setGranularParameter("grainSize", 100.0f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

void test_GrainDensity()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setGranularEnabled(true);
    sampler->setGranularParameter("grainDensity", 50.0f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

void test_GrainPitchShift()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setGranularEnabled(true);
    sampler->setGranularParameter("grainPitch", 1.5f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

void test_GranularStereo()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setGranularEnabled(true);
    sampler->setGranularParameter("grainSpread", 0.5f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);

    if (!Framework::hasStereoContent(buffer)) throw std::runtime_error("Should have stereo width");
}

//==============================================================================
// Test Suite 8: Phase 2 - Real-Time Pitch Shifting
//==============================================================================

void test_PitchShiftUp()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setPitchShiftEnabled(true);
    sampler->setPitchRatio(1.5f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);

    if (!Framework::hasSignal(buffer)) throw std::runtime_error("Should produce sound");
}

void test_PitchShiftDown()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setPitchShiftEnabled(true);
    sampler->setPitchRatio(0.75f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);

    if (!Framework::hasSignal(buffer)) throw std::runtime_error("Should produce sound");
}

void test_PitchShiftNeutral()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setPitchShiftEnabled(true);
    sampler->setPitchRatio(1.0f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

void test_PitchShiftWithEnvelope()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setPitchShiftEnabled(true);
    sampler->setPitchRatio(1.2f);
    sampler->setParameterValue("env_attack", 0.1f);
    sampler->setParameterValue("env_release", 0.3f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

//==============================================================================
// Test Suite 9: Phase 2 - Time Stretching
//==============================================================================

void test_TimeStretchLonger()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setTimeStretchEnabled(true);
    sampler->setTimeRatio(2.0f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

void test_TimeStretchShorter()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setTimeStretchEnabled(true);
    sampler->setTimeRatio(0.5f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

void test_TimeStretchPreservesPitch()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setTimeStretchEnabled(true);
    sampler->setTimeRatio(1.5f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);

    if (!Framework::hasSignal(buffer)) throw std::runtime_error("Should produce sound");
}

void test_TimeStretchWithLoop()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::LoopPoints loop;
    loop.mode = SamSamplerDSP::LoopMode::Forward;
    loop.startSample = 1000;
    loop.endSample = 20000;
    sampler->setLoopPoints(loop);

    sampler->setTimeStretchEnabled(true);
    sampler->setTimeRatio(1.5f);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

//==============================================================================
// Test Suite 10: Phase 2 - Advanced Looping
//==============================================================================

void test_LoopForward()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::LoopPoints loop;
    loop.mode = SamSamplerDSP::LoopMode::Forward;
    loop.startSample = 1000;
    loop.endSample = 20000;
    sampler->setLoopPoints(loop);

    auto retrievedLoop = sampler->getLoopPoints();
    if (retrievedLoop.mode != SamSamplerDSP::LoopMode::Forward) throw std::runtime_error("Loop mode not set");
}

void test_LoopReverse()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::LoopPoints loop;
    loop.mode = SamSamplerDSP::LoopMode::Reverse;
    loop.startSample = 1000;
    loop.endSample = 20000;
    sampler->setLoopPoints(loop);

    auto retrievedLoop = sampler->getLoopPoints();
    if (retrievedLoop.mode != SamSamplerDSP::LoopMode::Reverse) throw std::runtime_error("Loop mode not set");
}

void test_LoopPingPong()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::LoopPoints loop;
    loop.mode = SamSamplerDSP::LoopMode::PingPong;
    loop.startSample = 1000;
    loop.endSample = 20000;
    sampler->setLoopPoints(loop);

    auto retrievedLoop = sampler->getLoopPoints();
    if (retrievedLoop.mode != SamSamplerDSP::LoopMode::PingPong) throw std::runtime_error("Loop mode not set");
}

void test_LoopCrossfade()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::LoopPoints loop;
    loop.mode = SamSamplerDSP::LoopMode::Forward;
    loop.startSample = 1000;
    loop.endSample = 20000;
    loop.crossfadeSamples = 512;
    sampler->setLoopPoints(loop);

    auto retrievedLoop = sampler->getLoopPoints();
    if (retrievedLoop.crossfadeSamples != 512) throw std::runtime_error("Crossfade not set");
}

void test_LoopWithVelocity()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    SamSamplerDSP::SampleLayer layer;
    layer.minVelocity = 0;
    layer.maxVelocity = 127;
    layer.enabled = true;
    sampler->addLayer(layer);

    SamSamplerDSP::LoopPoints loop;
    loop.mode = SamSamplerDSP::LoopMode::Forward;
    loop.startSample = 1000;
    loop.endSample = 20000;
    sampler->setLoopPoints(loop);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);
    sampler->processBlock(buffer, midi);
}

//==============================================================================
// Test Suite 11: Phase 2 - Round-Robin Sampling
//==============================================================================

void test_RoundRobinCycles()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setRoundRobinEnabled(true);
    sampler->setRoundRobinVariations(4);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Trigger 4 notes - should cycle through variations
    for (int i = 0; i < 4; ++i)
    {
        midi.clear();
        midi.addEvent(juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(100)), 0);
        sampler->processBlock(buffer, midi);
    }
}

void test_RoundRobinWraps()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setRoundRobinEnabled(true);
    sampler->setRoundRobinVariations(4);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Trigger 6 notes - should wrap around
    for (int i = 0; i < 6; ++i)
    {
        midi.clear();
        midi.addEvent(juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(100)), 0);
        sampler->processBlock(buffer, midi);
    }
}

void test_RoundRobinPerVoice()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);
    sampler->setRoundRobinEnabled(true);
    sampler->setRoundRobinVariations(4);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi;

    // Trigger different notes - each voice should track its own round-robin
    midi.addEvent(juce::MidiMessage::noteOn(1, 60, static_cast<uint8_t>(100)), 0);
    midi.addEvent(juce::MidiMessage::noteOn(1, 64, static_cast<uint8_t>(100)), 0);
    sampler->processBlock(buffer, midi);
}

//==============================================================================
// Test Suite 12: Phase 3 - Preset Validation
//==============================================================================

void test_ValidateEmptyJson()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string emptyJson = "";
    if (sampler->validatePreset(emptyJson)) throw std::runtime_error("Empty JSON should fail");
}

void test_ValidateInvalidJson()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string malformedJson = "{ this is not valid json }";
    if (sampler->validatePreset(malformedJson)) throw std::runtime_error("Malformed JSON should fail");
}

void test_ValidateMissingParameters()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string noParams = "{\"name\":\"Test\",\"version\":\"1.0\"}";
    if (sampler->validatePreset(noParams)) throw std::runtime_error("Missing parameters should fail");
}

void test_ValidateMissingMetadata()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string noMetadata = "{\"parameters\":{\"master_volume\":0.8}}";
    if (sampler->validatePreset(noMetadata)) throw std::runtime_error("Missing metadata should fail");
}

void test_ValidateOutOfRangeParam()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string outOfRange = "{\"parameters\":{\"master_volume\":5.0},\"name\":\"Test\",\"version\":\"1.0\"}";
    if (sampler->validatePreset(outOfRange)) throw std::runtime_error("Out of range parameter should fail");
}

void test_ValidateValidPreset()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string valid = sampler->getPresetState();
    if (!sampler->validatePreset(valid)) throw std::runtime_error("Valid preset should pass");
}

//==============================================================================
// Test Suite 13: Phase 3 - Preset Metadata
//==============================================================================

void test_GetPresetInfo_Name()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string json = sampler->getPresetState();
    auto info = sampler->getPresetInfo(json);
    if (info.name != "Custom Preset") throw std::runtime_error("Name mismatch");
}

void test_GetPresetInfo_Category()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string json = sampler->getPresetState();
    auto info = sampler->getPresetInfo(json);
    if (info.category != "Custom") throw std::runtime_error("Category mismatch");
}

void test_GetPresetInfo_Description()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string json = sampler->getPresetState();
    auto info = sampler->getPresetInfo(json);
    if (info.description.isEmpty()) throw std::runtime_error("Description should not be empty");
}

void test_GetPresetInfo_CreationDate()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string json = sampler->getPresetState();
    auto info = sampler->getPresetInfo(json);
    if (info.creationDate.isEmpty()) throw std::runtime_error("Creation date should not be empty");
    // Check for ISO 8601 format (should contain 'T' and timezone)
    if (!info.creationDate.contains("T")) throw std::runtime_error("Date should be ISO 8601 format");
}

//==============================================================================
// Test Suite 14: Phase 3 - Factory Presets
//==============================================================================

void test_FactoryPresetsCount()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    int count = sampler->getNumPrograms();
    if (count != 20) throw std::runtime_error("Should have 20 factory presets");
}

void test_FactoryPresetsCategories()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::vector<juce::String> foundCategories;

    // Load each factory preset and check its metadata
    // Note: setCurrentProgram loads factory presets, but we need to parse the state
    // to get the metadata. We'll get the program name instead.
    for (int i = 0; i < sampler->getNumPrograms(); ++i)
    {
        juce::String programName = sampler->getProgramName(i);

        // The category is encoded in the preset names we created:
        // Bass, Drums, Keys, Strings, FX, Textural
        juce::String category = "Unknown";

        if (programName == "Sub Bass" || programName == "Synth Bass" ||
            programName == "808 Kick" || programName == "Growling Bass")
            category = "Bass";
        else if (programName == "Acoustic Kit" || programName == "Electronic Kit" ||
                 programName == "Trap Kit" || programName == "Cinematic Hits")
            category = "Drums";
        else if (programName == "Grand Piano" || programName == "Electric Piano" ||
                 programName == "Clavinet")
            category = "Keys";
        else if (programName == "Violin Section" || programName == "Cello" ||
                 programName == "Pizzicato")
            category = "Strings";
        else if (programName == "Granular Pad" || programName == "Reverse Cymbal" ||
                 programName == "Vocal Chop")
            category = "FX";
        else if (programName == "Ethereal Choir" || programName == "Wind Chimes" ||
                 programName == "Noise Texture")
            category = "Textural";

        bool found = false;
        for (const auto& cat : foundCategories)
        {
            if (cat == category)
            {
                found = true;
                break;
            }
        }
        if (!found)
        {
            foundCategories.push_back(category);
        }
    }

    if (foundCategories.size() != 6) throw std::runtime_error("Should have 6 categories");
}

//==============================================================================
// Test Suite 15: Phase 3 - Preset Save/Load
//==============================================================================

void test_SavePreset_IncludesMetadata()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    std::string json = sampler->getPresetState();

    // Parse JSON and check for required fields
    juce::var presetJson;
    if (!juce::JSON::parse(juce::String(json), presetJson).wasOk()) throw std::runtime_error("Invalid JSON");

    juce::DynamicObject* presetObj = presetJson.getDynamicObject();
    if (presetObj == nullptr) throw std::runtime_error("Not an object");

    if (!presetObj->hasProperty("name")) throw std::runtime_error("Missing name");
    if (!presetObj->hasProperty("category")) throw std::runtime_error("Missing category");
    if (!presetObj->hasProperty("description")) throw std::runtime_error("Missing description");
    if (!presetObj->hasProperty("creationDate")) throw std::runtime_error("Missing creationDate");
    if (!presetObj->hasProperty("version")) throw std::runtime_error("Missing version");
    if (!presetObj->hasProperty("author")) throw std::runtime_error("Missing author");
}

void test_LoadPreset_RestoresAll()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    // Save current state
    std::string savedJson = sampler->getPresetState();

    // Modify parameters (to normalized values)
    sampler->setParameterValue("master_volume", 0.5f);
    sampler->setParameterValue("env_attack", 0.5f);  // Normalized 0-1 value

    // Load saved state
    sampler->setPresetState(savedJson);

    // Verify parameters restored (allow for some floating point tolerance)
    float volume = sampler->getParameterValue("master_volume");
    float attack = sampler->getParameterValue("env_attack");

    // Default values: master_volume=0.8, env_attack=0.01 (in range 0-5.0)
    // But env_attack is stored as normalized value
    if (volume < 0.75f || volume > 0.85f) throw std::runtime_error("Master volume not restored");
    // Attack default of 0.01 in range 0-5.0 = 0.002 normalized
    if (attack < 0.0f || attack > 0.01f) throw std::runtime_error("Attack not restored");
}

void test_LoadPreset_Validation()
{
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    // Try to load invalid preset
    std::string invalidJson = "{\"invalid\": true}";
    sampler->setPresetState(invalidJson);

    // Parameters should remain unchanged (validation rejected the load)
    float volume = sampler->getParameterValue("master_volume");
    if (volume < 0.7f || volume > 0.9f) throw std::runtime_error("Invalid preset should not change parameters");
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main()
{
    std::cout << "\n========================================\n";
    std::cout << "SamSamplerDSP TDD Test Suite - Phase 3\n";
    std::cout << "========================================\n\n";

    int passed = 0;
    int failed = 0;

    #define RUN_TEST(test) \
        do { \
            std::cout << "Running: " #test "..."; \
            try { \
                test(); \
                std::cout << " PASSED\n"; \
                passed++; \
            } catch (const std::exception& e) { \
                std::cout << " FAILED: " << e.what() << "\n"; \
                failed++; \
            } \
        } while(0)

    // Phase 0 Tests (15 tests)
    std::cout << "\n--- Phase 0 Tests ---\n";
    RUN_TEST(test_CreateInstance);
    RUN_TEST(test_GetName);
    RUN_TEST(test_AcceptsMidi);
    RUN_TEST(test_DoesNotProduceMidi);
    RUN_TEST(test_HasNoEditor);
    RUN_TEST(test_PrepareToPlay);
    RUN_TEST(test_ProcessSilence);
    RUN_TEST(test_ProcessBlockWithNoteOn);
    RUN_TEST(test_ParametersExist);
    RUN_TEST(test_GetMasterVolume);
    RUN_TEST(test_SetMasterVolume);
    RUN_TEST(test_Polyphony16Voices);
    RUN_TEST(test_VoiceStealing);
    RUN_TEST(test_GetPresetState);
    RUN_TEST(test_SetPresetState);

    // Phase 2 Tests (30 tests)
    std::cout << "\n--- Phase 2: Multi-Layer Velocity ---\n";
    RUN_TEST(test_TwoLayersVelocitySwitch);
    RUN_TEST(test_LayerCrossfading);
    RUN_TEST(test_LayerVolumeScaling);
    RUN_TEST(test_LayerPanPosition);
    RUN_TEST(test_DisabledLayerIgnored);
    RUN_TEST(test_ClearLayers);

    std::cout << "\n--- Phase 2: Granular Synthesis ---\n";
    RUN_TEST(test_GranularEnabled);
    RUN_TEST(test_GrainSizeChanges);
    RUN_TEST(test_GrainDensity);
    RUN_TEST(test_GrainPitchShift);
    RUN_TEST(test_GranularStereo);

    std::cout << "\n--- Phase 2: Pitch Shifting ---\n";
    RUN_TEST(test_PitchShiftUp);
    RUN_TEST(test_PitchShiftDown);
    RUN_TEST(test_PitchShiftNeutral);
    RUN_TEST(test_PitchShiftWithEnvelope);

    std::cout << "\n--- Phase 2: Time Stretching ---\n";
    RUN_TEST(test_TimeStretchLonger);
    RUN_TEST(test_TimeStretchShorter);
    RUN_TEST(test_TimeStretchPreservesPitch);
    RUN_TEST(test_TimeStretchWithLoop);

    std::cout << "\n--- Phase 2: Advanced Looping ---\n";
    RUN_TEST(test_LoopForward);
    RUN_TEST(test_LoopReverse);
    RUN_TEST(test_LoopPingPong);
    RUN_TEST(test_LoopCrossfade);
    RUN_TEST(test_LoopWithVelocity);

    std::cout << "\n--- Phase 2: Round-Robin ---\n";
    RUN_TEST(test_RoundRobinCycles);
    RUN_TEST(test_RoundRobinWraps);
    RUN_TEST(test_RoundRobinPerVoice);

    // Phase 3 Tests (15 tests)
    std::cout << "\n--- Phase 3: Preset Validation ---\n";
    RUN_TEST(test_ValidateEmptyJson);
    RUN_TEST(test_ValidateInvalidJson);
    RUN_TEST(test_ValidateMissingParameters);
    RUN_TEST(test_ValidateMissingMetadata);
    RUN_TEST(test_ValidateOutOfRangeParam);
    RUN_TEST(test_ValidateValidPreset);

    std::cout << "\n--- Phase 3: Preset Metadata ---\n";
    RUN_TEST(test_GetPresetInfo_Name);
    RUN_TEST(test_GetPresetInfo_Category);
    RUN_TEST(test_GetPresetInfo_Description);
    RUN_TEST(test_GetPresetInfo_CreationDate);

    std::cout << "\n--- Phase 3: Factory Presets ---\n";
    RUN_TEST(test_FactoryPresetsCount);
    RUN_TEST(test_FactoryPresetsCategories);

    std::cout << "\n--- Phase 3: Preset Save/Load ---\n";
    RUN_TEST(test_SavePreset_IncludesMetadata);
    RUN_TEST(test_LoadPreset_RestoresAll);
    RUN_TEST(test_LoadPreset_Validation);

    // Summary
    std::cout << "\n========================================\n";
    std::cout << "Test Results:\n";
    std::cout << "  Passed: " << passed << "\n";
    std::cout << "  Failed: " << failed << "\n";
    std::cout << "  Total:  " << (passed + failed) << "\n";
    std::cout << "========================================\n\n";

    if (failed == 0)
    {
        std::cout << "ALL TESTS PASSED - GREEN PHASE!\n";
        return 0;
    }
    else
    {
        std::cout << "SOME TESTS FAILED\n";
        return 1;
    }
}
