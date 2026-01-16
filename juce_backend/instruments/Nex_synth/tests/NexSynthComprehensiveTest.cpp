/*
  ==============================================================================

    NexSynthComprehensiveTest.cpp
    Created: January 13, 2026
    Author: Bret Bouchard

    Comprehensive test suite for NexSynth FM synthesizer

  ==============================================================================
*/

#include "../include/dsp/NexSynthDSP.h"
#include <iostream>
#include <cstdio>
#include <cmath>
#include <vector>
#include <algorithm>

using namespace DSP;

//==============================================================================
// Test Result Tracking
//==============================================================================

struct TestStats {
    int passed = 0;
    int failed = 0;
    int total = 0;

    void pass(const char* testName) {
        total++;
        passed++;
        std::cout << "  [PASS] " << testName << std::endl;
    }

    void fail(const char* testName, const std::string& reason) {
        total++;
        failed++;
        std::cout << "  [FAIL] " << testName << ": " << reason << std::endl;
    }

    void printSummary() {
        std::cout << "\n========================================" << std::endl;
        std::cout << "Test Summary: " << passed << "/" << total << " passed";
        if (failed > 0) {
            std::cout << " (" << failed << " failed)";
        }
        std::cout << "\n========================================" << std::endl;
    }
};

//==============================================================================
// Audio Analysis Utilities
//==============================================================================

float getPeakLevel(const float* buffer, int numSamples) {
    float peak = 0.0f;
    for (int i = 0; i < numSamples; ++i) {
        float abs = std::abs(buffer[i]);
        if (abs > peak) peak = abs;
    }
    return peak;
}

void processAudioInChunks(NexSynthDSP& synth, float* left, float* right, int numSamples, int bufferSize = 512) {
    for (int offset = 0; offset < numSamples; offset += bufferSize) {
        int samplesToProcess = std::min(bufferSize, numSamples - offset);
        float* outputs[] = { left + offset, right + offset };
        synth.process(outputs, 2, samplesToProcess);
    }
}

//==============================================================================
// Test 1: Basic Note On Produces Sound
//==============================================================================

bool testBasicNoteOn(TestStats& stats) {
    std::cout << "\n[Test 1] Basic Note On" << std::endl;

    NexSynthDSP synth;
    if (!synth.prepare(48000.0, 512)) {
        stats.fail("prepare", "Failed to prepare synth");
        return false;
    }

    const int numSamples = 12000;
    std::vector<float> left(numSamples);
    std::vector<float> right(numSamples);

    ScheduledEvent event;
    event.type = ScheduledEvent::NOTE_ON;
    event.time = 0.0;
    event.sampleOffset = 0;
    event.data.note.midiNote = 60;
    event.data.note.velocity = 0.8f;
    synth.handleEvent(event);

    processAudioInChunks(synth, left.data(), right.data(), numSamples);

    float peak = getPeakLevel(left.data(), numSamples);
    std::cout << "    Peak: " << peak << std::endl;

    if (peak < 0.001f) {
        stats.fail("note_on_audio", "No audio produced");
        return false;
    }

    stats.pass("basic_note_on");
    return true;
}

//==============================================================================
// Test 2: FM Algorithms
//==============================================================================

bool testFMAlgorithms(TestStats& stats) {
    std::cout << "\n[Test 2] FM Algorithms" << std::endl;

    // Test a few different algorithms
    int algorithms[] = {1, 5, 10, 20};

    for (int algo : algorithms) {
        NexSynthDSP synth;
        synth.prepare(48000.0, 512);
        synth.setParameter("algorithm", static_cast<float>(algo));

        const int numSamples = 12000;
        std::vector<float> left(numSamples);
        std::vector<float> right(numSamples);

        ScheduledEvent event;
        event.type = ScheduledEvent::NOTE_ON;
        event.time = 0.0;
        event.sampleOffset = 0;
        event.data.note.midiNote = 60;
        event.data.note.velocity = 0.7f;
        synth.handleEvent(event);

        processAudioInChunks(synth, left.data(), right.data(), numSamples);

        float peak = getPeakLevel(left.data(), numSamples);
        std::cout << "    Algorithm " << algo << ": peak = " << peak << std::endl;

        if (peak < 0.001f) {
            stats.fail(("algorithm_" + std::to_string(algo)).c_str(), "No audio produced");
            return false;
        }
    }

    stats.pass("fm_algorithms");
    return true;
}

//==============================================================================
// Test 3: Pitch Bend
//==============================================================================

bool testPitchBend(TestStats& stats) {
    std::cout << "\n[Test 3] Pitch Bend" << std::endl;

    // Test positive pitch bend
    {
        NexSynthDSP synth;
        synth.prepare(48000.0, 512);

        const int numSamples = 12000;
        std::vector<float> buffer(numSamples);
        std::vector<float> temp(numSamples);

        ScheduledEvent note;
        note.type = ScheduledEvent::NOTE_ON;
        note.time = 0.0;
        note.sampleOffset = 0;
        note.data.note.midiNote = 60;
        note.data.note.velocity = 0.7f;
        synth.handleEvent(note);

        ScheduledEvent bend;
        bend.type = ScheduledEvent::PITCH_BEND;
        bend.time = 0.0;
        bend.sampleOffset = 0;
        bend.data.pitchBend.bendValue = 1.0f;
        synth.handleEvent(bend);

        processAudioInChunks(synth, buffer.data(), temp.data(), numSamples);

        float peak = getPeakLevel(buffer.data(), numSamples);
        std::cout << "    Pitch bend +1.0: peak = " << peak << std::endl;

        if (peak < 0.001f) {
            stats.fail("pitch_bend_positive", "No audio with pitch bend");
            return false;
        }
    }

    stats.pass("pitch_bend");
    return true;
}

//==============================================================================
// Test 4: Polyphony
//==============================================================================

bool testPolyphony(TestStats& stats) {
    std::cout << "\n[Test 4] Polyphony" << std::endl;

    NexSynthDSP synth;
    synth.prepare(48000.0, 512);

    const int numSamples = 12000;
    std::vector<float> left(numSamples);
    std::vector<float> right(numSamples);

    // Play a chord
    int notes[] = {60, 64, 67};
    for (int note : notes) {
        ScheduledEvent event;
        event.type = ScheduledEvent::NOTE_ON;
        event.time = 0.0;
        event.sampleOffset = 0;
        event.data.note.midiNote = note;
        event.data.note.velocity = 0.7f;
        synth.handleEvent(event);
    }

    processAudioInChunks(synth, left.data(), right.data(), numSamples);

    int activeVoices = synth.getActiveVoiceCount();
    std::cout << "    Active Voices: " << activeVoices << std::endl;

    if (activeVoices != 3) {
        stats.fail("polyphony_count", "Expected 3 voices");
        return false;
    }

    float peak = getPeakLevel(left.data(), numSamples);
    if (peak < 0.001f) {
        stats.fail("polyphony_audio", "No audio for chord");
        return false;
    }

    stats.pass("polyphony");
    return true;
}

//==============================================================================
// Test 5: Modulation Index
//==============================================================================

bool testModulationIndex(TestStats& stats) {
    std::cout << "\n[Test 5] Modulation Index" << std::endl;

    // Test different modulation indices
    float indices[] = {0.5f, 2.0f, 5.0f};

    for (float index : indices) {
        NexSynthDSP synth;
        synth.prepare(48000.0, 512);
        synth.setParameter("modulationIndex", index);

        const int numSamples = 12000;
        std::vector<float> left(numSamples);
        std::vector<float> right(numSamples);

        ScheduledEvent event;
        event.type = ScheduledEvent::NOTE_ON;
        event.time = 0.0;
        event.sampleOffset = 0;
        event.data.note.midiNote = 60;
        event.data.note.velocity = 0.7f;
        synth.handleEvent(event);

        processAudioInChunks(synth, left.data(), right.data(), numSamples);

        float peak = getPeakLevel(left.data(), numSamples);
        std::cout << "    Mod index " << index << ": peak = " << peak << std::endl;

        if (peak < 0.001f) {
            stats.fail(("mod_index_" + std::to_string(static_cast<int>(index * 10))).c_str(), "No audio");
            return false;
        }
    }

    stats.pass("modulation_index");
    return true;
}

//==============================================================================
// Test 6: Sample Rate Compatibility
//==============================================================================

bool testSampleRates(TestStats& stats) {
    std::cout << "\n[Test 6] Sample Rate Compatibility" << std::endl;

    double sampleRates[] = {44100.0, 48000.0, 96000.0};

    for (double sr : sampleRates) {
        NexSynthDSP synth;
        if (!synth.prepare(sr, 512)) {
            stats.fail(("samplerate_" + std::to_string(static_cast<int>(sr))).c_str(), "Failed to prepare");
            return false;
        }

        const int numSamples = (int)(sr * 0.25);
        std::vector<float> left(numSamples);
        std::vector<float> right(numSamples);

        ScheduledEvent event;
        event.type = ScheduledEvent::NOTE_ON;
        event.time = 0.0;
        event.sampleOffset = 0;
        event.data.note.midiNote = 60;
        event.data.note.velocity = 0.7f;
        synth.handleEvent(event);

        processAudioInChunks(synth, left.data(), right.data(), numSamples);

        float peak = getPeakLevel(left.data(), numSamples);
        std::cout << "    " << static_cast<int>(sr) << " Hz: peak = " << peak << std::endl;

        if (peak < 0.001f) {
            stats.fail(("samplerate_" + std::to_string(static_cast<int>(sr))).c_str(), "No audio");
            return false;
        }
    }

    stats.pass("sample_rates");
    return true;
}

//==============================================================================
// Test 7: Stereo Width
//==============================================================================

bool testStereoWidth(TestStats& stats) {
    std::cout << "\n[Test 7] Stereo Width" << std::endl;

    NexSynthDSP synth;
    synth.prepare(48000.0, 512);
    synth.setParameter("stereoWidth", 1.0f); // Full stereo

    const int numSamples = 12000;
    std::vector<float> left(numSamples);
    std::vector<float> right(numSamples);

    ScheduledEvent event;
    event.type = ScheduledEvent::NOTE_ON;
    event.time = 0.0;
    event.sampleOffset = 0;
    event.data.note.midiNote = 60;
    event.data.note.velocity = 0.7f;
    synth.handleEvent(event);

    processAudioInChunks(synth, left.data(), right.data(), numSamples);

    float leftPeak = getPeakLevel(left.data(), numSamples);
    float rightPeak = getPeakLevel(right.data(), numSamples);

    std::cout << "    Left: " << leftPeak << ", Right: " << rightPeak << std::endl;

    if (leftPeak < 0.001f || rightPeak < 0.001f) {
        stats.fail("stereo_width", "No audio in one or both channels");
        return false;
    }

    stats.pass("stereo_width");
    return true;
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[]) {
    std::cout << "\n========================================" << std::endl;
    std::cout << "NexSynth Comprehensive Test Suite" << std::endl;
    std::cout << "========================================" << std::endl;

    TestStats stats;

    testBasicNoteOn(stats);
    testFMAlgorithms(stats);
    testPitchBend(stats);
    testPolyphony(stats);
    testModulationIndex(stats);
    testSampleRates(stats);
    testStereoWidth(stats);

    stats.printSummary();

    return (stats.failed == 0) ? 0 : 1;
}
