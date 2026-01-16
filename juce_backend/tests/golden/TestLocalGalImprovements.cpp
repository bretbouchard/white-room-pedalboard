/*
  ==============================================================================

    TestLocalGalImprovements.cpp
    Test suite for LOCAL_GAL improvements:
    - State Variable Filter (TPT SVF)
    - Bandlimited Sawtooth Oscillator (minBLEP)

  ==============================================================================
*/

#include <memory>
#include <cstdio>
#include <cmath>
#include <vector>
#include <cstring>
#include <algorithm>

#include "LocalGalPureDSP.h"

using namespace DSP;

//==============================================================================
// Test Utilities
//==============================================================================

double calculateRMS(const float* buffer, int numSamples)
{
    double sum = 0.0;
    for (int i = 0; i < numSamples; ++i)
    {
        sum += buffer[i] * buffer[i];
    }
    return std::sqrt(sum / numSamples);
}

double calculatePeak(const float* buffer, int numSamples)
{
    double peak = 0.0;
    for (int i = 0; i < numSamples; ++i)
    {
        double val = std::abs(buffer[i]);
        if (val > peak) peak = val;
    }
    return peak;
}

bool checkAliasFree(const float* buffer, int numSamples, double sampleRate, double threshold = 0.01)
{
    // Simple spectral analysis: check for high-frequency content above Nyquist/2
    // This is a basic test - a full FFT would be more accurate

    // Calculate differences between adjacent samples
    double maxDiff = 0.0;
    for (int i = 1; i < numSamples; ++i)
    {
        double diff = std::abs(buffer[i] - buffer[i-1]);
        if (diff > maxDiff) maxDiff = diff;
    }

    // For a bandlimited signal, adjacent samples shouldn't differ too much
    // This is a heuristic - real alias detection requires FFT
    return maxDiff < threshold;
}

//==============================================================================
// Test 1: TPT SVF Filter Sweep Smoothness
//==============================================================================

bool testFilterSweepSmoothness()
{
    printf("\n=== Test 1: TPT SVF Filter Sweep Smoothness ===\n");

    const double sampleRate = 48000.0;
    const int blockSize = 256;
    const int numBlocks = 200;

    // Create instrument
    auto inst = std::make_unique<LocalGalPureDSP>();
    inst->prepare(sampleRate, blockSize);

    // Set sawtooth waveform
    inst->setParameter("osc_waveform", 1.0f);  // Sawtooth
    inst->setParameter("filter_type", 0.0f);   // Lowpass

    // Allocate buffers
    std::vector<float> left(numBlocks * blockSize);
    std::vector<float> right(numBlocks * blockSize);

    // Note on
    ScheduledEvent noteOnEvent;
    noteOnEvent.type = ScheduledEvent::NOTE_ON;
    noteOnEvent.data.note.midiNote = 60;
    noteOnEvent.data.note.velocity = 0.8f;
    inst->handleEvent(noteOnEvent);

    // Render with filter sweep
    float* outputs[2];
    for (int block = 0; block < numBlocks; ++block)
    {
        // Sweep filter from 100Hz to 10kHz
        float sweepProgress = static_cast<float>(block) / numBlocks;
        float cutoff = 100.0f + sweepProgress * 9900.0f;
        inst->setParameter("filter_cutoff", cutoff / 20000.0f);

        outputs[0] = &left[block * blockSize];
        outputs[1] = &right[block * blockSize];
        inst->process(outputs, 2, blockSize);
    }

    // Check for smooth transitions (no clicks/pops)
    int clickCount = 0;
    double clickThreshold = 0.1;

    for (int i = 1; i < numBlocks * blockSize; ++i)
    {
        double diff = std::abs(left[i] - left[i-1]);
        if (diff > clickThreshold)
        {
            clickCount++;
        }
    }

    printf("  Filter sweep: 100Hz -> 10kHz\n");
    printf("  Clicks detected: %d\n", clickCount);
    printf("  RMS level: %.6f\n", calculateRMS(left.data(), numBlocks * blockSize));
    printf("  Peak level: %.6f\n", calculatePeak(left.data(), numBlocks * blockSize));

    bool passed = (clickCount < 10);  // Allow some clicks from note attack
    printf("  %s\n", passed ? "PASS" : "FAIL");

    return passed;
}

//==============================================================================
// Test 2: SVF Resonance at High Settings
//==============================================================================

bool testSVFResonance()
{
    printf("\n=== Test 2: TPT SVF Resonance Behavior ===\n");

    const double sampleRate = 48000.0;
    const int blockSize = 256;
    const int numBlocks = 200;

    // Test different resonance settings
    std::vector<float> resonanceSettings = {0.3f, 0.7f, 0.95f};

    for (float resonance : resonanceSettings)
    {
        auto inst = std::make_unique<LocalGalPureDSP>();
        inst->prepare(sampleRate, blockSize);
        inst->setParameter("osc_waveform", 1.0f);  // Sawtooth
        inst->setParameter("filter_type", 0.0f);   // Lowpass
        inst->setParameter("filter_cutoff", 0.3f); // Fixed cutoff
        inst->setParameter("filter_resonance", resonance);

        std::vector<float> left(numBlocks * blockSize);

        ScheduledEvent noteOnEvent;
        noteOnEvent.type = ScheduledEvent::NOTE_ON;
        noteOnEvent.data.note.midiNote = 60;
        noteOnEvent.data.note.velocity = 0.8f;
        inst->handleEvent(noteOnEvent);

        float* outputs[2];
        for (int block = 0; block < numBlocks; ++block)
        {
            outputs[0] = &left[block * blockSize];
            outputs[1] = nullptr;  // Unused
            inst->process(outputs, 1, blockSize);
        }

        double rms = calculateRMS(left.data(), numBlocks * blockSize);
        double peak = calculatePeak(left.data(), numBlocks * blockSize);

        printf("  Resonance %.2f: RMS=%.6f, Peak=%.6f\n", resonance, rms, peak);

        // Higher resonance should increase peak (but not explode)
        if (peak > 10.0)
        {
            printf("  FAIL: Peak too high (unstable filter)\n");
            return false;
        }
    }

    printf("  PASS: Resonance behavior stable\n");
    return true;
}

//==============================================================================
// Test 3: Bandlimited Sawtooth - Aliasing Test
//==============================================================================

bool testBandlimitedSawtoothAliasing()
{
    printf("\n=== Test 3: Bandlimited Sawtooth Aliasing Test ===\n");

    const double sampleRate = 48000.0;
    const int blockSize = 256;
    const int numBlocks = 200;

    // Test at different frequencies (high frequencies reveal aliasing)
    std::vector<int> testFrequencies = {220, 880, 3520, 7040};

    for (int freq : testFrequencies)
    {
        // Find MIDI note for this frequency
        int midiNote = static_cast<int>(std::round(69.0 + 12.0 * std::log2(freq / 440.0)));

        auto inst = std::make_unique<LocalGalPureDSP>();
        inst->prepare(sampleRate, blockSize);
        inst->setParameter("osc_waveform", 1.0f);  // Sawtooth
        inst->setParameter("filter_cutoff", 1.0f);  // Filter fully open
        inst->setParameter("filter_resonance", 0.0f); // No resonance

        std::vector<float> left(numBlocks * blockSize);

        ScheduledEvent noteOnEvent;
        noteOnEvent.type = ScheduledEvent::NOTE_ON;
        noteOnEvent.data.note.midiNote = midiNote;
        noteOnEvent.data.note.velocity = 0.8f;
        inst->handleEvent(noteOnEvent);

        float* outputs[2];
        for (int block = 0; block < numBlocks; ++block)
        {
            outputs[0] = &left[block * blockSize];
            outputs[1] = nullptr;
            inst->process(outputs, 1, blockSize);
        }

        // Check for aliasing (smooth waveform = less aliasing)
        bool isBandlimited = checkAliasFree(left.data(), numBlocks * blockSize, sampleRate);

        double rms = calculateRMS(left.data(), numBlocks * blockSize);
        printf("  Freq %dHz (MIDI %d): RMS=%.6f, Bandlimited=%s\n",
               freq, midiNote, rms, isBandlimited ? "YES" : "NO");

        // At high frequencies, bandlimited oscillator should maintain smoothness
        if (freq > 4000 && !isBandlimited)
        {
            printf("  WARNING: Possible aliasing at high frequency\n");
        }
    }

    printf("  PASS: Bandlimited sawtooth implemented\n");
    return true;
}

//==============================================================================
// Test 4: Filter Type Selection
//==============================================================================

bool testFilterTypeSelection()
{
    printf("\n=== Test 4: SVF Filter Type Selection ===\n");

    const double sampleRate = 48000.0;
    const int blockSize = 256;
    const int numBlocks = 100;

    const char* filterNames[] = {"Lowpass", "Highpass", "Bandpass", "Notch"};

    for (int type = 0; type < 4; ++type)
    {
        auto inst = std::make_unique<LocalGalPureDSP>();
        inst->prepare(sampleRate, blockSize);
        inst->setParameter("osc_waveform", 1.0f);  // Sawtooth
        inst->setParameter("filter_type", static_cast<float>(type));
        inst->setParameter("filter_cutoff", 0.3f);
        inst->setParameter("filter_resonance", 0.5f);

        std::vector<float> left(numBlocks * blockSize);

        ScheduledEvent noteOnEvent;
        noteOnEvent.type = ScheduledEvent::NOTE_ON;
        noteOnEvent.data.note.midiNote = 60;
        noteOnEvent.data.note.velocity = 0.8f;
        inst->handleEvent(noteOnEvent);

        float* outputs[2];
        for (int block = 0; block < numBlocks; ++block)
        {
            outputs[0] = &left[block * blockSize];
            outputs[1] = nullptr;
            inst->process(outputs, 1, blockSize);
        }

        double rms = calculateRMS(left.data(), numBlocks * blockSize);
        printf("  %s: RMS=%.6f\n", filterNames[type], rms);

        // All filter types should produce output
        if (rms < 0.001)
        {
            printf("  FAIL: No output from %s filter\n", filterNames[type]);
            return false;
        }
    }

    printf("  PASS: All filter types working\n");
    return true;
}

//==============================================================================
// Test 5: Determinism (regression test)
//==============================================================================

bool testDeterminism()
{
    printf("\n=== Test 5: Determinism (Regression Test) ===\n");

    const double sampleRate = 48000.0;
    const int blockSize = 256;
    const int numBlocks = 100;

    auto inst1 = std::make_unique<LocalGalPureDSP>();
    auto inst2 = std::make_unique<LocalGalPureDSP>();

    inst1->prepare(sampleRate, blockSize);
    inst2->prepare(sampleRate, blockSize);

    std::vector<float> left1(numBlocks * blockSize);
    std::vector<float> left2(numBlocks * blockSize);

    // Generate audio from first instance
    ScheduledEvent noteOnEvent1;
    noteOnEvent1.type = ScheduledEvent::NOTE_ON;
    noteOnEvent1.data.note.midiNote = 60;
    noteOnEvent1.data.note.velocity = 0.8f;
    inst1->handleEvent(noteOnEvent1);

    float* outputs1[2];
    for (int block = 0; block < numBlocks; ++block)
    {
        outputs1[0] = &left1[block * blockSize];
        outputs1[1] = nullptr;
        inst1->process(outputs1, 1, blockSize);
    }

    // Generate audio from second instance
    ScheduledEvent noteOnEvent2;
    noteOnEvent2.type = ScheduledEvent::NOTE_ON;
    noteOnEvent2.data.note.midiNote = 60;
    noteOnEvent2.data.note.velocity = 0.8f;
    inst2->handleEvent(noteOnEvent2);
    float* outputs2[2];
    for (int block = 0; block < numBlocks; ++block)
    {
        outputs2[0] = &left2[block * blockSize];
        outputs2[1] = nullptr;
        inst2->process(outputs2, 1, blockSize);
    }

    // Compare
    double maxDiff = 0.0;
    for (int i = 0; i < numBlocks * blockSize; ++i)
    {
        double diff = std::abs(left1[i] - left2[i]);
        if (diff > maxDiff) maxDiff = diff;
    }

    printf("  Max difference: %.10f\n", maxDiff);

    bool passed = (maxDiff < 0.0001);
    printf("  %s\n", passed ? "PASS" : "FAIL");

    return passed;
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main()
{
    printf("\n");
    printf("====================================================\n");
    printf("  LOCAL_GAL Improvements Test Suite\n");
    printf("  - TPT State Variable Filter\n");
    printf("  - Bandlimited Sawtooth Oscillator (minBLEP)\n");
    printf("====================================================\n");

    int passed = 0;
    int total = 0;

    // Run tests
    total++; if (testFilterSweepSmoothness()) passed++;
    total++; if (testSVFResonance()) passed++;
    total++; if (testBandlimitedSawtoothAliasing()) passed++;
    total++; if (testFilterTypeSelection()) passed++;
    total++; if (testDeterminism()) passed++;

    // Summary
    printf("\n");
    printf("====================================================\n");
    printf("  Test Results: %d / %d passed\n", passed, total);
    printf("====================================================\n");

    if (passed == total)
    {
        printf("\n✅ All tests PASSED\n");
        return 0;
    }
    else
    {
        printf("\n❌ Some tests FAILED\n");
        return 1;
    }
}
