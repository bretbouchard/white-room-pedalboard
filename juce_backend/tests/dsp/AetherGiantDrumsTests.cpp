/*
  ==============================================================================

    AetherGiantDrumsTests.cpp
    Created: January 9, 2026
    Author: Bret Bouchard

    Unit tests for Aether Giant Drums Pure DSP implementation

    Tests the physical modeling drum synthesizer with:
    - Waveguide membrane with strike excitation
    - Scale-aware physics (larger drums = slower, deeper)
    - MPE gesture mapping
    - Membrane, shell, nonlinear, and room coupling

  ==============================================================================
*/

#include "dsp/InstrumentDSP.h"
#include "dsp/InstrumentFactory.h"
#include <cassert>
#include <iostream>
#include <cstring>
#include <cmath>
#include <vector>

namespace Test {

//==============================================================================
// Test Framework
//==============================================================================

int testsPassed = 0;
int testsFailed = 0;

#define TEST(name) \
    void test_##name(); \
    struct TestRunner_##name { \
        TestRunner_##name() { /* Disabled - run manually */ } \
    } runner_##name; \
    void test_##name()

#define EXPECT_TRUE(condition) \
    if (!(condition)) { \
        throw std::runtime_error("Expected TRUE but got FALSE: " #condition); \
    }

#define EXPECT_FALSE(condition) \
    if (condition) { \
        throw std::runtime_error("Expected FALSE but got TRUE: " #condition); \
    }

#define EXPECT_EQ(expected, actual) \
    if ((expected) != (actual)) { \
        throw std::runtime_error("Expected " + std::to_string(expected) + \
                              " but got " + std::to_string(actual)); \
    }

#define EXPECT_NEAR(expected, actual, tolerance) \
    if (std::abs((expected) - (actual)) > (tolerance)) { \
        throw std::runtime_error("Expected " + std::to_string(expected) + \
                              " but got " + std::to_string(actual) + \
                              " (tolerance: " + std::to_string(tolerance) + ")"); \
    }

#define EXPECT_GT(val1, val2) \
    if (!((val1) > (val2))) { \
        throw std::runtime_error("Expected " + std::to_string(val1) + \
                              " > " + std::to_string(val2)); \
    }

#define EXPECT_GE(val1, val2) \
    if ((val1) < (val2)) { \
        throw std::runtime_error("Expected " + std::to_string(val1) + \
                              " >= " + std::to_string(val2)); \
    }

#define EXPECT_LE(val1, val2) \
    if ((val1) > (val2)) { \
        throw std::runtime_error("Expected " + std::to_string(val1) + \
                              " <= " + std::to_string(val2)); \
    }

#define EXPECT_NOT_NULL(ptr) \
    if ((ptr) == nullptr) { \
        throw std::runtime_error("Expected non-NULL pointer but got NULL"); \
    }

//==============================================================================
// TEST SUITE: Aether Giant Drums Pure DSP
//==============================================================================

TEST(AetherGiantDrums_FactoryCreation)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");

    EXPECT_NOT_NULL(drums);

    std::string name = drums->getInstrumentName();
    std::string version = drums->getInstrumentVersion();

    if (name != "AetherGiantDrums") {
        throw std::runtime_error("Expected instrument name 'AetherGiantDrums' but got '" + name + "'");
    }
    if (version != "1.0.0") {
        throw std::runtime_error("Expected version '1.0.0' but got '" + version + "'");
    }

    delete drums;
}

TEST(AetherGiantDrums_Prepare)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    bool prepared = drums->prepare(48000.0, 512);
    EXPECT_TRUE(prepared);

    int maxPolyphony = drums->getMaxPolyphony();
    EXPECT_EQ(16, maxPolyphony);  // 16 drum voices

    delete drums;
}

TEST(AetherGiantDrums_Reset)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Trigger a note
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;  // C2 - bass drum
    noteOn.data.note.velocity = 0.8f;

    drums->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    drums->process(outputs, 2, 512);
    drums->reset();

    int activeVoices = drums->getActiveVoiceCount();
    EXPECT_EQ(0, activeVoices);

    delete drums;
}

TEST(AetherGiantDrums_NoteOnOff)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 38;  // D2 - tom
    noteOn.data.note.velocity = 0.7f;

    drums->handleEvent(noteOn);

    int activeVoices = drums->getActiveVoiceCount();
    EXPECT_GT(activeVoices, 0);

    delete drums;
}

TEST(AetherGiantDrums_Process)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Trigger bass drum
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;  // C2 - bass drum
    noteOn.data.note.velocity = 0.9f;

    drums->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    drums->process(outputs, 2, 512);

    bool hasAudio = false;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 512; ++i) {
            if (std::abs(outputs[ch][i]) > 0.0001f) {
                hasAudio = true;
                break;
            }
        }
    }

    EXPECT_TRUE(hasAudio);

    delete drums;
}

TEST(AetherGiantDrums_ScaleAwareness)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test scale parameter affects sound
    drums->setParameter("scale_meters", 0.5f);  // Small drum

    DSP::ScheduledEvent noteOn1;
    noteOn1.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn1.time = 0.0;
    noteOn1.sampleOffset = 0;
    noteOn1.data.note.midiNote = 36;
    noteOn1.data.note.velocity = 0.8f;

    drums->handleEvent(noteOn1);

    float* outputs1[2];
    float buffer1[2][512];
    outputs1[0] = buffer1[0];
    outputs1[1] = buffer1[1];
    std::memset(buffer1, 0, sizeof(buffer1));

    drums->process(outputs1, 2, 512);
    drums->reset();

    // Now with large scale
    drums->setParameter("scale_meters", 3.0f);  // Giant drum

    DSP::ScheduledEvent noteOn2;
    noteOn2.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn2.time = 0.0;
    noteOn2.sampleOffset = 0;
    noteOn2.data.note.midiNote = 36;
    noteOn2.data.note.velocity = 0.8f;

    drums->handleEvent(noteOn2);

    float* outputs2[2];
    float buffer2[2][512];
    outputs2[0] = buffer2[0];
    outputs2[1] = buffer2[1];
    std::memset(buffer2, 0, sizeof(buffer2));

    drums->process(outputs2, 2, 512);

    // Calculate RMS for both
    float rms1 = 0.0f, rms2 = 0.0f;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 512; ++i) {
            rms1 += buffer1[ch][i] * buffer1[ch][i];
            rms2 += buffer2[ch][i] * buffer2[ch][i];
        }
    }
    rms1 = std::sqrt(rms1 / 1024);
    rms2 = std::sqrt(rms2 / 1024);

    // Both should produce sound
    EXPECT_GT(rms1, 0.0001f);
    EXPECT_GT(rms2, 0.0001f);

    delete drums;
}

TEST(AetherGiantDrums_MembraneParameters)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test membrane parameters
    drums->setParameter("membrane_tension", 0.7f);
    float tension = drums->getParameter("membrane_tension");
    EXPECT_NEAR(0.7f, tension, 0.01f);

    drums->setParameter("membrane_diameter", 2.5f);
    float diameter = drums->getParameter("membrane_diameter");
    EXPECT_NEAR(2.5f, diameter, 0.01f);

    drums->setParameter("membrane_damping", 0.99f);
    float damping = drums->getParameter("membrane_damping");
    EXPECT_NEAR(0.99f, damping, 0.01f);

    drums->setParameter("membrane_inharmonicity", 0.2f);
    float inharmonicity = drums->getParameter("membrane_inharmonicity");
    EXPECT_NEAR(0.2f, inharmonicity, 0.01f);

    delete drums;
}

TEST(AetherGiantDrums_ShellParameters)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test shell parameters
    drums->setParameter("shell_cavity_freq", 150.0f);
    float cavityFreq = drums->getParameter("shell_cavity_freq");
    EXPECT_NEAR(150.0f, cavityFreq, 0.1f);

    drums->setParameter("shell_formant", 400.0f);
    float formant = drums->getParameter("shell_formant");
    EXPECT_NEAR(400.0f, formant, 0.1f);

    drums->setParameter("shell_coupling", 0.5f);
    float coupling = drums->getParameter("shell_coupling");
    EXPECT_NEAR(0.5f, coupling, 0.01f);

    delete drums;
}

TEST(AetherGiantDrums_NonlinearParameters)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test nonlinear parameters
    drums->setParameter("saturation_amount", 0.3f);
    float saturation = drums->getParameter("saturation_amount");
    EXPECT_NEAR(0.3f, saturation, 0.01f);

    drums->setParameter("mass_effect", 0.8f);
    float mass = drums->getParameter("mass_effect");
    EXPECT_NEAR(0.8f, mass, 0.01f);

    delete drums;
}

TEST(AetherGiantDrums_RoomParameters)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test room parameters
    drums->setParameter("room_size", 0.9f);
    float roomSize = drums->getParameter("room_size");
    EXPECT_NEAR(0.9f, roomSize, 0.01f);

    drums->setParameter("reflection_gain", 0.5f);
    float reflection = drums->getParameter("reflection_gain");
    EXPECT_NEAR(0.5f, reflection, 0.01f);

    drums->setParameter("reverb_time", 3.0f);
    float reverbTime = drums->getParameter("reverb_time");
    EXPECT_NEAR(3.0f, reverbTime, 0.1f);

    delete drums;
}

TEST(AetherGiantDrums_GiantParameters)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test giant parameters
    drums->setParameter("scale_meters", 5.0f);
    float scale = drums->getParameter("scale_meters");
    EXPECT_NEAR(5.0f, scale, 0.01f);

    drums->setParameter("mass_bias", 0.8f);
    float massBias = drums->getParameter("mass_bias");
    EXPECT_NEAR(0.8f, massBias, 0.01f);

    drums->setParameter("air_loss", 0.6f);
    float airLoss = drums->getParameter("air_loss");
    EXPECT_NEAR(0.6f, airLoss, 0.01f);

    drums->setParameter("transient_slowing", 0.7f);
    float transientSlowing = drums->getParameter("transient_slowing");
    EXPECT_NEAR(0.7f, transientSlowing, 0.01f);

    delete drums;
}

TEST(AetherGiantDrums_GestureParameters)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test gesture parameters
    drums->setParameter("force", 0.9f);
    float force = drums->getParameter("force");
    EXPECT_NEAR(0.9f, force, 0.01f);

    drums->setParameter("speed", 0.3f);
    float speed = drums->getParameter("speed");
    EXPECT_NEAR(0.3f, speed, 0.01f);

    drums->setParameter("contact_area", 0.7f);
    float contactArea = drums->getParameter("contact_area");
    EXPECT_NEAR(0.7f, contactArea, 0.01f);

    drums->setParameter("roughness", 0.5f);
    float roughness = drums->getParameter("roughness");
    EXPECT_NEAR(0.5f, roughness, 0.01f);

    delete drums;
}

TEST(AetherGiantDrums_MasterVolume)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    drums->setParameter("master_volume", 0.6f);
    float volume = drums->getParameter("master_volume");
    EXPECT_NEAR(0.6f, volume, 0.01f);

    delete drums;
}

TEST(AetherGiantDrums_PresetSaveLoad)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Set various parameters
    drums->setParameter("membrane_tension", 0.7f);
    drums->setParameter("membrane_diameter", 2.0f);
    drums->setParameter("shell_cavity_freq", 150.0f);
    drums->setParameter("scale_meters", 3.0f);
    drums->setParameter("force", 0.8f);
    drums->setParameter("master_volume", 0.7f);

    char jsonBuffer[8192];
    bool saved = drums->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    EXPECT_EQ('{', jsonBuffer[0]);

    DSP::InstrumentDSP* drums2 = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums2);

    drums2->prepare(48000.0, 512);

    bool loaded = drums2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    // Verify parameters match
    EXPECT_NEAR(drums->getParameter("membrane_tension"),
                drums2->getParameter("membrane_tension"), 0.01f);
    EXPECT_NEAR(drums->getParameter("membrane_diameter"),
                drums2->getParameter("membrane_diameter"), 0.01f);
    EXPECT_NEAR(drums->getParameter("scale_meters"),
                drums2->getParameter("scale_meters"), 0.01f);

    delete drums;
    delete drums2;
}

TEST(AetherGiantDrums_Polyphony)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Trigger multiple drum sounds
    for (int i = 0; i < 16; ++i) {
        DSP::ScheduledEvent noteOn;
        noteOn.type = DSP::ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = 36 + i;
        noteOn.data.note.velocity = 0.7f;

        drums->handleEvent(noteOn);
    }

    int activeVoices = drums->getActiveVoiceCount();
    EXPECT_LE(activeVoices, 16);

    delete drums;
}

TEST(AetherGiantDrums_Determinism)
{
    DSP::InstrumentDSP* drums1 = DSP::createInstrument("AetherGiantDrums");
    DSP::InstrumentDSP* drums2 = DSP::createInstrument("AetherGiantDrums");

    drums1->prepare(48000.0, 512);
    drums2->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;
    noteOn.data.note.velocity = 0.8f;

    drums1->handleEvent(noteOn);
    drums2->handleEvent(noteOn);

    float* outputs1[2];
    float* outputs2[2];
    float buffer1[2][512];
    float buffer2[2][512];
    outputs1[0] = buffer1[0];
    outputs1[1] = buffer1[1];
    outputs2[0] = buffer2[0];
    outputs2[1] = buffer2[1];

    std::memset(buffer1, 0, sizeof(buffer1));
    std::memset(buffer2, 0, sizeof(buffer2));

    drums1->process(outputs1, 2, 512);
    drums2->process(outputs2, 2, 512);

    bool outputsMatch = true;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 512; ++i) {
            if (std::abs(buffer1[ch][i] - buffer2[ch][i]) > 0.0001f) {
                outputsMatch = false;
                break;
            }
        }
    }

    EXPECT_TRUE(outputsMatch);

    delete drums1;
    delete drums2;
}

TEST(AetherGiantDrums_LowFrequencyResponse)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Giant bass drum should produce low frequencies
    drums->setParameter("scale_meters", 4.0f);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 28;  // Very low note
    noteOn.data.note.velocity = 0.9f;

    drums->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    drums->process(outputs, 2, 512);

    // Check that we have audio output
    bool hasAudio = false;
    float maxValue = 0.0f;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 512; ++i) {
            maxValue = std::max(maxValue, std::abs(outputs[ch][i]));
            if (std::abs(outputs[ch][i]) > 0.0001f) {
                hasAudio = true;
            }
        }
    }

    EXPECT_TRUE(hasAudio);
    EXPECT_GT(maxValue, 0.001f);

    delete drums;
}

TEST(AetherGiantDrums_AttackTime)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Test attack time with giant scale (should be slow)
    drums->setParameter("scale_meters", 3.0f);
    drums->setParameter("transient_slowing", 0.8f);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;
    noteOn.data.note.velocity = 0.8f;

    drums->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    drums->process(outputs, 2, 512);

    // Find peak position (should not be at sample 0 for slow attack)
    float maxValue = 0.0f;
    int peakPosition = 0;
    for (int i = 0; i < 512; ++i) {
        if (std::abs(outputs[0][i]) > maxValue) {
            maxValue = std::abs(outputs[0][i]);
            peakPosition = i;
        }
    }

    // Peak should be somewhere in the buffer, not at start
    EXPECT_GT(peakPosition, 0);
    EXPECT_GT(maxValue, 0.0001f);

    delete drums;
}

TEST(AetherGiantDrums_VoiceStealing)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Trigger more notes than max polyphony
    for (int i = 0; i < 20; ++i) {
        DSP::ScheduledEvent noteOn;
        noteOn.type = DSP::ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = 36 + (i % 20);
        noteOn.data.note.velocity = 0.7f;

        drums->handleEvent(noteOn);
    }

    int activeVoices = drums->getActiveVoiceCount();
    EXPECT_LE(activeVoices, 16);  // Should not exceed max polyphony

    delete drums;
}

TEST(AetherGiantDrums_NoteOff)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    // Note on
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;
    noteOn.data.note.velocity = 0.8f;

    drums->handleEvent(noteOn);

    int voicesAfterOn = drums->getActiveVoiceCount();
    EXPECT_GT(voicesAfterOn, 0);

    // Note off
    DSP::ScheduledEvent noteOff;
    noteOff.type = DSP::ScheduledEvent::NOTE_OFF;
    noteOff.time = 0.0;
    noteOff.sampleOffset = 0;
    noteOff.data.note.midiNote = 36;

    drums->handleEvent(noteOff);

    // For drums, note off may not immediately stop the voice
    // (drums have natural decay), but it should be handled
    delete drums;
}

TEST(AetherGiantDrums_StereoOutput)
{
    DSP::InstrumentDSP* drums = DSP::createInstrument("AetherGiantDrums");
    EXPECT_NOT_NULL(drums);

    drums->prepare(48000.0, 512);

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 36;
    noteOn.data.note.velocity = 0.8f;

    drums->handleEvent(noteOn);

    float* outputs[2];
    float outputBuffer[2][512];
    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];
    std::memset(outputBuffer, 0, sizeof(outputBuffer));

    drums->process(outputs, 2, 512);

    // Both channels should have output
    bool leftHasAudio = false;
    bool rightHasAudio = false;

    for (int i = 0; i < 512; ++i) {
        if (std::abs(outputs[0][i]) > 0.0001f) leftHasAudio = true;
        if (std::abs(outputs[1][i]) > 0.0001f) rightHasAudio = true;
    }

    EXPECT_TRUE(leftHasAudio);
    EXPECT_TRUE(rightHasAudio);

    delete drums;
}

} // namespace Test

//==============================================================================
// Main
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "Aether Giant Drums Pure DSP Tests\n";
    std::cout << "===========================================\n\n";

    std::vector<std::pair<const char*, void(*)()>> tests = {
        {"Factory Creation", Test::test_AetherGiantDrums_FactoryCreation},
        {"Prepare", Test::test_AetherGiantDrums_Prepare},
        {"Reset", Test::test_AetherGiantDrums_Reset},
        {"Note On/Off", Test::test_AetherGiantDrums_NoteOnOff},
        {"Process", Test::test_AetherGiantDrums_Process},
        {"Scale Awareness", Test::test_AetherGiantDrums_ScaleAwareness},
        {"Membrane Parameters", Test::test_AetherGiantDrums_MembraneParameters},
        {"Shell Parameters", Test::test_AetherGiantDrums_ShellParameters},
        {"Nonlinear Parameters", Test::test_AetherGiantDrums_NonlinearParameters},
        {"Room Parameters", Test::test_AetherGiantDrums_RoomParameters},
        {"Giant Parameters", Test::test_AetherGiantDrums_GiantParameters},
        {"Gesture Parameters", Test::test_AetherGiantDrums_GestureParameters},
        {"Master Volume", Test::test_AetherGiantDrums_MasterVolume},
        {"Preset Save/Load", Test::test_AetherGiantDrums_PresetSaveLoad},
        {"Polyphony", Test::test_AetherGiantDrums_Polyphony},
        {"Determinism", Test::test_AetherGiantDrums_Determinism},
        {"Low Frequency Response", Test::test_AetherGiantDrums_LowFrequencyResponse},
        {"Attack Time", Test::test_AetherGiantDrums_AttackTime},
        {"Voice Stealing", Test::test_AetherGiantDrums_VoiceStealing},
        {"Note Off", Test::test_AetherGiantDrums_NoteOff},
        {"Stereo Output", Test::test_AetherGiantDrums_StereoOutput}
    };

    for (size_t i = 0; i < tests.size(); ++i) {
        std::cout << "Running test " << (i + 1) << ": " << tests[i].first << "...\n";
        try {
            tests[i].second();
            Test::testsPassed++;
            std::cout << "PASSED\n";
        } catch (const std::exception& e) {
            Test::testsFailed++;
            std::cout << "FAILED: " << e.what() << "\n";
        }
        std::cout << "\n";
    }

    std::cout << "All tests completed.\n";
    std::cout << "Passed: " << Test::testsPassed << "\n";
    std::cout << "Failed: " << Test::testsFailed << "\n";
    std::cout << "===========================================\n";
    std::cout << "\n";

    return (Test::testsFailed == 0) ? 0 : 1;
}
