/*
  ==============================================================================

    AllInstrumentsTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Comprehensive test suite for all Phase 2 Pure DSP instruments
    Tests factory registration, creation, and basic functionality

  ==============================================================================
*/

#include "dsp/InstrumentDSP.h"
#include <iostream>
#include <vector>
#include <memory>

struct TestResult {
    std::string instrumentName;
    bool factoryCreation;
    bool prepare;
    bool reset;
    bool noteOnOff;
    bool process;
    bool parameters;
    bool presetSaveLoad;
    bool polyphony;
    bool determinism;

    int passedCount() const {
        int count = 0;
        if (factoryCreation) count++;
        if (prepare) count++;
        if (reset) count++;
        if (noteOnOff) count++;
        if (process) count++;
        if (parameters) count++;
        if (presetSaveLoad) count++;
        if (polyphony) count++;
        if (determinism) count++;
        return count;
    }

    int totalCount() const { return 9; }
};

TestResult testInstrument(const std::string& instrumentName)
{
    TestResult result;
    result.instrumentName = instrumentName;

    std::cout << "\nTesting " << instrumentName << "...\n";

    try {
        // Test 1: Factory Creation
        DSP::InstrumentDSP* synth = DSP::createInstrument(instrumentName.c_str());
        result.factoryCreation = (synth != nullptr);
        if (!result.factoryCreation) {
            std::cout << "  FAILED: Factory creation\n";
            delete synth;
            return result;
        }
        std::cout << "  ✓ Factory creation\n";

        // Test 2: Prepare
        bool prepared = synth->prepare(48000.0, 512);
        result.prepare = prepared;
        if (!result.prepare) {
            std::cout << "  FAILED: Prepare\n";
            delete synth;
            return result;
        }
        std::cout << "  ✓ Prepare\n";

        // Test 3: Reset
        DSP::ScheduledEvent noteOn;
        noteOn.type = DSP::ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = 60;
        noteOn.data.note.velocity = 0.8f;
        synth->handleEvent(noteOn);

        float* outputs[2];
        float outputBuffer[2][512];
        outputs[0] = outputBuffer[0];
        outputs[1] = outputBuffer[1];
        std::memset(outputBuffer, 0, sizeof(outputBuffer));

        synth->process(outputs, 2, 512);
        synth->reset();

        int activeVoices = synth->getActiveVoiceCount();
        result.reset = (activeVoices == 0);
        if (!result.reset) {
            std::cout << "  FAILED: Reset (active voices: " << activeVoices << ")\n";
            delete synth;
            return result;
        }
        std::cout << "  ✓ Reset\n";

        // Test 4: Note On/Off
        synth->handleEvent(noteOn);
        activeVoices = synth->getActiveVoiceCount();
        result.noteOnOff = (activeVoices > 0);
        if (!result.noteOnOff) {
            std::cout << "  FAILED: Note On/Off (no active voices)\n";
            delete synth;
            return result;
        }
        std::cout << "  ✓ Note On/Off\n";

        // Test 5: Process
        std::memset(outputBuffer, 0, sizeof(outputBuffer));
        synth->process(outputs, 2, 512);

        bool hasAudio = false;
        for (int ch = 0; ch < 2; ++ch) {
            for (int i = 0; i < 512; ++i) {
                if (std::abs(outputs[ch][i]) > 0.0001f) {
                    hasAudio = true;
                    break;
                }
            }
        }
        result.process = hasAudio;
        if (!result.process) {
            std::cout << "  FAILED: Process (no audio output)\n";
            delete synth;
            return result;
        }
        std::cout << "  ✓ Process\n";

        // Test 6: Parameters
        float originalValue = synth->getParameter("master_volume");
        synth->setParameter("master_volume", 0.5f);
        float newValue = synth->getParameter("master_volume");
        result.parameters = (std::abs(newValue - 0.5f) < 0.01f);
        if (!result.parameters) {
            std::cout << "  FAILED: Parameters (expected 0.5, got " << newValue << ")\n";
            delete synth;
            return result;
        }
        std::cout << "  ✓ Parameters\n";

        // Test 7: Preset Save/Load
        char jsonBuffer[4096];
        bool saved = synth->savePreset(jsonBuffer, sizeof(jsonBuffer));
        if (!saved) {
            std::cout << "  FAILED: Preset save\n";
            delete synth;
            return result;
        }

        DSP::InstrumentDSP* synth2 = DSP::createInstrument(instrumentName.c_str());
        synth2->prepare(48000.0, 512);

        bool loaded = synth2->loadPreset(jsonBuffer);
        result.presetSaveLoad = loaded;
        if (!result.presetSaveLoad) {
            std::cout << "  FAILED: Preset load\n";
            delete synth;
            delete synth2;
            return result;
        }
        std::cout << "  ✓ Preset Save/Load\n";

        delete synth;
        delete synth2;

        // Test 8: Polyphony
        DSP::InstrumentDSP* synth3 = DSP::createInstrument(instrumentName.c_str());
        synth3->prepare(48000.0, 512);

        int maxPolyphony = synth3->getMaxPolyphony();
        for (int i = 0; i < maxPolyphony + 5; ++i) {
            DSP::ScheduledEvent note;
            note.type = DSP::ScheduledEvent::NOTE_ON;
            note.time = 0.0;
            note.sampleOffset = 0;
            note.data.note.midiNote = 60 + i;
            note.data.note.velocity = 0.8f;
            synth3->handleEvent(note);
        }

        activeVoices = synth3->getActiveVoiceCount();
        result.polyphony = (activeVoices <= maxPolyphony);
        if (!result.polyphony) {
            std::cout << "  FAILED: Polyphony (too many voices: " << activeVoices << ")\n";
            delete synth3;
            return result;
        }
        std::cout << "  ✓ Polyphony\n";

        delete synth3;

        // Test 9: Determinism
        DSP::InstrumentDSP* synth4 = DSP::createInstrument(instrumentName.c_str());
        DSP::InstrumentDSP* synth5 = DSP::createInstrument(instrumentName.c_str());

        synth4->prepare(48000.0, 512);
        synth5->prepare(48000.0, 512);

        synth4->handleEvent(noteOn);
        synth5->handleEvent(noteOn);

        float buffer1[2][512];
        float buffer2[2][512];
        float* out1[2] = {buffer1[0], buffer1[1]};
        float* out2[2] = {buffer2[0], buffer2[1]};

        std::memset(buffer1, 0, sizeof(buffer1));
        std::memset(buffer2, 0, sizeof(buffer2));

        synth4->process(out1, 2, 512);
        synth5->process(out2, 2, 512);

        bool outputsMatch = true;
        for (int ch = 0; ch < 2; ++ch) {
            for (int i = 0; i < 512; ++i) {
                if (std::abs(buffer1[ch][i] - buffer2[ch][i]) > 0.0001f) {
                    outputsMatch = false;
                    break;
                }
            }
        }
        result.determinism = outputsMatch;
        if (!result.determinism) {
            std::cout << "  FAILED: Determinism (outputs don't match)\n";
            delete synth4;
            delete synth5;
            return result;
        }
        std::cout << "  ✓ Determinism\n";

        delete synth4;
        delete synth5;

    } catch (const std::exception& e) {
        std::cout << "  EXCEPTION: " << e.what() << "\n";
    }

    return result;
}

int main()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "All Instruments Test Suite\n";
    std::cout << "Phase 2 Pure DSP Implementation\n";
    std::cout << "===========================================\n";

    std::vector<std::string> instruments = {
        "NexSynth",
        "SamSampler",
        "KaneMarcoAether",
        "KaneMarco",
        "LocalGal"
    };

    std::vector<TestResult> results;

    for (const auto& instrument : instruments) {
        results.push_back(testInstrument(instrument));
    }

    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "SUMMARY\n";
    std::cout << "===========================================\n\n";

    int totalPassed = 0;
    int totalTests = 0;

    for (const auto& result : results) {
        int passed = result.passedCount();
        int total = result.totalCount();
        totalPassed += passed;
        totalTests += total;

        std::cout << result.instrumentName << ": ";
        std::cout << passed << "/" << total << " tests passed";

        if (passed == total) {
            std::cout << " ✅\n";
        } else {
            std::cout << " ❌\n";
        }
    }

    std::cout << "\n";
    std::cout << "Total: " << totalPassed << "/" << totalTests << " tests passed\n";

    if (totalPassed == totalTests) {
        std::cout << "\n🎉 ALL TESTS PASSED! Phase 2 complete!\n";
    } else {
        std::cout << "\n⚠️  Some tests failed. Please review.\n";
    }

    std::cout << "===========================================\n";
    std::cout << "\n";

    return (totalPassed == totalTests) ? 0 : 1;
}
