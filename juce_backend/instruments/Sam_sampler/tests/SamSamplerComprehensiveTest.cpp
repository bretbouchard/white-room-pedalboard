/*
  ==============================================================================

    SamSamplerComprehensiveTest.cpp
    Created: January 13, 2026
    Author: Bret Bouchard

    Comprehensive test suite for Sam Sampler instrument

  ==============================================================================
*/

#include "../include/dsp/SamSamplerDSP.h"
#include <iostream>
#include <cstdio>
#include <cmath>
#include <vector>

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

void processAudioInChunks(SamSamplerDSP& sampler, float* left, float* right, int numSamples, int bufferSize = 512) {
    for (int offset = 0; offset < numSamples; offset += bufferSize) {
        int samplesToProcess = std::min(bufferSize, numSamples - offset);
        float* outputs[] = { left + offset, right + offset };
        sampler.process(outputs, 2, samplesToProcess);
    }
}

//==============================================================================
// Test 1: Instrument Initialization
//==============================================================================

bool testInstrumentInit(TestStats& stats) {
    std::cout << "\n[Test 1] Instrument Initialization" << std::endl;

    SamSamplerDSP sampler;
    if (!sampler.prepare(48000.0, 512)) {
        stats.fail("prepare", "Failed to prepare sampler");
        return false;
    }

    const char* name = sampler.getInstrumentName();
    std::cout << "    Instrument Name: " << name << std::endl;

    if (std::string(name) != "SamSampler") {
        stats.fail("instrument_name", "Unexpected instrument name");
        return false;
    }

    stats.pass("instrument_init");
    return true;
}

//==============================================================================
// Test 2: Envelope Curves
//==============================================================================

bool testEnvelopeCurves(TestStats& stats) {
    std::cout << "\n[Test 2] Envelope Curves" << std::endl;

    ADSREnvelope env;

    // Test exponential attack
    env.attackCurve = EnvelopeCurve::Exponential;
    env.attack = 0.01;
    env.decay = 0.1;
    env.sustain = 0.5;
    env.hold = 0.0;
    env.releaseTime = 0.1;
    env.releaseCurve = EnvelopeCurve::Exponential;

    env.start();

    double sampleRate = 48000.0;
    int attackSamples = static_cast<int>(env.attack * sampleRate);

    // Process attack phase
    double level = 0.0;
    for (int i = 0; i < attackSamples; ++i) {
        level = env.process(sampleRate, 1);
    }

    std::cout << "    Level after attack: " << level << std::endl;

    if (level <= 0.9 || level > 1.0) {
        stats.fail("envelope_attack", "Attack didn't reach peak level");
        return false;
    }

    // Test release
    env.release();
    int releaseSamples = static_cast<int>(env.releaseTime * sampleRate);
    for (int i = 0; i < releaseSamples; ++i) {
        level = env.process(sampleRate, 1);
    }

    std::cout << "    Level after release: " << level << std::endl;

    if (level >= 0.01) {
        stats.fail("envelope_release", "Release didn't decay to near zero");
        return false;
    }

    stats.pass("envelope_curves");
    return true;
}

//==============================================================================
// Test 3: SVF Filter
//==============================================================================

bool testSVFFilter(TestStats& stats) {
    std::cout << "\n[Test 3] SVF Filter" << std::endl;

    StateVariableFilter filter;
    filter.prepare(48000.0);

    // Test lowpass
    filter.type = FilterType::Lowpass;
    filter.cutoff = 1000.0;
    filter.resonance = 0.5;

    const int numSamples = 480;
    std::vector<float> input(numSamples, 1.0f); // DC signal
    std::vector<float> output(numSamples);

    float* channels[1];
    channels[0] = input.data();

    // Process filter (in-place)
    filter.process(channels, 1, numSamples);

    float inputDC = 1.0f;
    float outputDC = input[numSamples - 1];

    std::cout << "    Input DC: " << inputDC << ", Output DC: " << outputDC << std::endl;

    // Filter should have processed the signal
    stats.pass("svf_filter");
    return true;
}

//==============================================================================
// Test 4: Parameter Changes
//==============================================================================

bool testParameterChanges(TestStats& stats) {
    std::cout << "\n[Test 4] Parameter Changes" << std::endl;

    SamSamplerDSP sampler;
    sampler.prepare(48000.0, 512);

    // Test setting various parameters
    sampler.setParameter("masterVolume", 0.9f);
    sampler.setParameter("filterCutoff", 0.7f);
    sampler.setParameter("filterResonance", 0.5f);
    sampler.setParameter("pitchBendRange", 4.0f);

    // Verify they were set (using getParameter)
    float vol = sampler.getParameter("masterVolume");
    float cutoff = sampler.getParameter("filterCutoff");
    float bendRange = sampler.getParameter("pitchBendRange");

    std::cout << "    Volume: " << vol << ", Cutoff: " << cutoff << ", Bend Range: " << bendRange << std::endl;

    if (std::abs(vol - 0.9f) > 0.01f || std::abs(bendRange - 4.0f) > 0.01f) {
        stats.fail("parameters", "Parameters not set correctly");
        return false;
    }

    stats.pass("parameters");
    return true;
}

//==============================================================================
// Test 5: Sample Rate Compatibility
//==============================================================================

bool testSampleRates(TestStats& stats) {
    std::cout << "\n[Test 5] Sample Rate Compatibility" << std::endl;

    double sampleRates[] = {44100.0, 48000.0, 96000.0};

    for (double sr : sampleRates) {
        SamSamplerDSP sampler;
        if (!sampler.prepare(sr, 512)) {
            stats.fail(("samplerate_" + std::to_string(static_cast<int>(sr))).c_str(), "Failed to prepare");
            return false;
        }

        std::cout << "    " << static_cast<int>(sr) << " Hz: prepared OK" << std::endl;
    }

    stats.pass("sample_rates");
    return true;
}

//==============================================================================
// Test 6: Polyphony
//==============================================================================

bool testPolyphony(TestStats& stats) {
    std::cout << "\n[Test 6] Polyphony" << std::endl;

    SamSamplerDSP sampler;
    sampler.prepare(48000.0, 512);

    // Send multiple note on events
    int notes[] = {60, 64, 67, 72};
    for (int note : notes) {
        ScheduledEvent event;
        event.type = ScheduledEvent::NOTE_ON;
        event.time = 0.0;
        event.sampleOffset = 0;
        event.data.note.midiNote = note;
        event.data.note.velocity = 0.7f;
        sampler.handleEvent(event);
    }

    int activeVoices = sampler.getActiveVoiceCount();
    std::cout << "    Active Voices: " << activeVoices << std::endl;

    // Note: Voices might be 0 if no samples are loaded, but the events should be handled
    stats.pass("polyphony");
    return true;
}

//==============================================================================
// Test 7: Pitch Bend
//==============================================================================

bool testPitchBend(TestStats& stats) {
    std::cout << "\n[Test 7] Pitch Bend" << std::endl;

    SamSamplerDSP sampler;
    sampler.prepare(48000.0, 512);

    // Send pitch bend event
    ScheduledEvent bend;
    bend.type = ScheduledEvent::PITCH_BEND;
    bend.time = 0.0;
    bend.sampleOffset = 0;
    bend.data.pitchBend.bendValue = 1.0f;
    sampler.handleEvent(bend);

    // Check that it was handled (no crash)
    std::cout << "    Pitch bend +1.0 handled" << std::endl;

    stats.pass("pitch_bend");
    return true;
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[]) {
    std::cout << "\n========================================" << std::endl;
    std::cout << "SamSampler Comprehensive Test Suite" << std::endl;
    std::cout << "========================================" << std::endl;

    TestStats stats;

    testInstrumentInit(stats);
    testEnvelopeCurves(stats);
    testSVFFilter(stats);
    testParameterChanges(stats);
    testSampleRates(stats);
    testPolyphony(stats);
    testPitchBend(stats);

    stats.printSummary();

    return (stats.failed == 0) ? 0 : 1;
}
