/*
  ==============================================================================

    NexSynthAdvancedTests.cpp
    Created: January 9, 2026
    Author:  Bret Bouchard

    Advanced tests for NexSynth improvements:
    - Batch processing validation
    - FM algorithm correctness
    - Feedback FM
    - Performance benchmarks

  ==============================================================================
*/

#include "dsp/InstrumentDSP.h"
#include <cassert>
#include <iostream>
#include <cstring>
#include <cmath>
#include <chrono>

namespace Test {

//==============================================================================
// Test Framework
//==============================================================================

int testsPassed = 0;
int testsFailed = 0;

#define TEST(name) \
    void test_##name(); \
    struct TestRunner_##name { \
        TestRunner_##name() { \
            std::cout << "Running test: " << #name << "..."; \
            try { \
                test_##name(); \
                testsPassed++; \
                std::cout << " PASSED" << std::endl; \
            } catch (const std::exception& e) { \
                testsFailed++; \
                std::cout << " FAILED: " << e.what() << std::endl; \
            } \
        } \
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

//==============================================================================
// TEST SUITE: NexSynth Advanced Features
//==============================================================================

TEST(BatchProcessingBasicOperation)
{
    // Test that batch processing produces output
    auto synth = DSP::InstrumentFactory::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth.get());

    constexpr double sampleRate = 48000.0;
    constexpr int numSamples = 256;
    constexpr int numChannels = 2;

    float** outputs = new float*[numChannels];
    for (int ch = 0; ch < numChannels; ++ch)
    {
        outputs[ch] = new float[numSamples]();
    }

    // Prepare synth
    bool prepared = synth->prepare(sampleRate, numSamples);
    EXPECT_TRUE(prepared);

    // Start a note
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.data.note.midiNote = 60;  // Middle C
    noteOn.data.note.velocity = 0.8f;
    synth->handleEvent(noteOn);

    // Process audio
    synth->process(outputs, numChannels, numSamples);

    // Check that output was generated
    bool hasOutput = false;
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            if (std::abs(outputs[ch][i]) > 0.0001f)
            {
                hasOutput = true;
                break;
            }
        }
    }
    EXPECT_TRUE(hasOutput);

    // Cleanup
    for (int ch = 0; ch < numChannels; ++ch)
    {
        delete[] outputs[ch];
    }
    delete[] outputs;
}

TEST(AlgorithmSelection)
{
    // Test algorithm switching
    auto synth = DSP::InstrumentFactory::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth.get());

    constexpr double sampleRate = 48000.0;
    constexpr int numSamples = 256;

    synth->prepare(sampleRate, numSamples);

    // Test algorithm parameter exists and can be set
    synth->setParameter("algorithm", 1.0f);
    float alg1 = synth->getParameter("algorithm");
    EXPECT_NEAR(1.0f, alg1, 0.01f);

    synth->setParameter("algorithm", 16.0f);
    float alg16 = synth->getParameter("algorithm");
    EXPECT_NEAR(16.0f, alg16, 0.01f);

    synth->setParameter("algorithm", 32.0f);
    float alg32 = synth->getParameter("algorithm");
    EXPECT_NEAR(32.0f, alg32, 0.01f);
}

TEST(FeedbackFM)
{
    // Test feedback parameter
    auto synth = DSP::InstrumentFactory::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth.get());

    constexpr double sampleRate = 48000.0;
    constexpr int numSamples = 256;

    synth->prepare(sampleRate, numSamples);

    // Set feedback on operator 1
    synth->setParameter("op1_feedback", 0.5f);
    float feedback = synth->getParameter("op1_feedback");
    EXPECT_NEAR(0.5f, feedback, 0.01f);

    // Start note and process
    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;
    synth->handleEvent(noteOn);

    float** outputs = new float*[1];
    outputs[0] = new float[numSamples]();

    synth->process(outputs, 1, numSamples);

    // Check output with feedback
    bool hasOutput = false;
    for (int i = 0; i < numSamples; ++i)
    {
        if (std::abs(outputs[0][i]) > 0.0001f)
        {
            hasOutput = true;
            break;
        }
    }
    EXPECT_TRUE(hasOutput);

    delete[] outputs[0];
    delete[] outputs;
}

TEST(PerformanceBenchmark)
{
    // Benchmark batch processing vs sequential
    auto synth = DSP::InstrumentFactory::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth.get());

    constexpr double sampleRate = 48000.0;
    constexpr int numSamples = 512;
    constexpr int numChannels = 2;

    synth->prepare(sampleRate, numSamples);

    // Start multiple notes for polyphony
    for (int midiNote = 60; midiNote < 68; ++midiNote)
    {
        DSP::ScheduledEvent noteOn;
        noteOn.type = DSP::ScheduledEvent::NOTE_ON;
        noteOn.data.note.midiNote = midiNote;
        noteOn.data.note.velocity = 0.7f;
        synth->handleEvent(noteOn);
    }

    float** outputs = new float*[numChannels];
    for (int ch = 0; ch < numChannels; ++ch)
    {
        outputs[ch] = new float[numSamples]();
    }

    // Benchmark
    constexpr int iterations = 100;
    auto startTime = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < iterations; ++i)
    {
        synth->process(outputs, numChannels, numSamples);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    double samplesPerSecond = (iterations * numSamples) / (duration.count() / 1000000.0);
    std::cout << "\n  Performance: " << samplesPerSecond << " samples/second" << std::endl;
    std::cout << "  Real-time factor: " << (samplesPerSecond / sampleRate) << "x" << std::endl;

    // Should be able to process at least 10x real-time
    EXPECT_GT(samplesPerSecond / sampleRate, 10.0);

    for (int ch = 0; ch < numChannels; ++ch)
    {
        delete[] outputs[ch];
    }
    delete[] outputs;
}

TEST(PresetSaveLoadWithAlgorithm)
{
    // Test preset save/load with algorithm parameter
    auto synth1 = DSP::InstrumentFactory::createInstrument("NexSynth");
    auto synth2 = DSP::InstrumentFactory::createInstrument("NexSynth");

    EXPECT_NOT_NULL(synth1.get());
    EXPECT_NOT_NULL(synth2.get());

    constexpr double sampleRate = 48000.0;
    constexpr int numSamples = 256;

    synth1->prepare(sampleRate, numSamples);
    synth2->prepare(sampleRate, numSamples);

    // Set parameters on synth1
    synth1->setParameter("masterVolume", 0.8f);
    synth1->setParameter("algorithm", 16.0f);
    synth1->setParameter("op1_feedback", 0.3f);
    synth1->setParameter("op2_ratio", 2.0f);

    // Save preset
    char jsonBuffer[4096];
    bool saved = synth1->savePreset(jsonBuffer, sizeof(jsonBuffer));
    EXPECT_TRUE(saved);

    std::cout << "\n  Saved preset: " << jsonBuffer << std::endl;

    // Load preset into synth2
    bool loaded = synth2->loadPreset(jsonBuffer);
    EXPECT_TRUE(loaded);

    // Verify parameters match
    EXPECT_NEAR(0.8f, synth2->getParameter("masterVolume"), 0.01f);
    EXPECT_NEAR(16.0f, synth2->getParameter("algorithm"), 0.01f);
    EXPECT_NEAR(0.3f, synth2->getParameter("op1_feedback"), 0.01f);
    EXPECT_NEAR(2.0f, synth2->getParameter("op2_ratio"), 0.01f);
}

TEST(AlgorithmOutputDifferences)
{
    // Test that different algorithms produce different outputs
    auto synth = DSP::InstrumentFactory::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth.get());

    constexpr double sampleRate = 48000.0;
    constexpr int numSamples = 256;

    synth->prepare(sampleRate, numSamples);

    float** outputs1 = new float*[1];
    float** outputs2 = new float*[1];
    outputs1[0] = new float[numSamples]();
    outputs2[0] = new float[numSamples]();

    // Test algorithm 1
    synth->setParameter("algorithm", 1.0f);
    synth->reset();

    DSP::ScheduledEvent noteOn;
    noteOn.type = DSP::ScheduledEvent::NOTE_ON;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;
    synth->handleEvent(noteOn);

    synth->process(outputs1, 1, numSamples);

    // Test algorithm 16
    synth->setParameter("algorithm", 16.0f);
    synth->reset();
    synth->handleEvent(noteOn);
    synth->process(outputs2, 1, numSamples);

    // Compare outputs - they should be different
    double sumDiff = 0.0;
    for (int i = 0; i < numSamples; ++i)
    {
        sumDiff += std::abs(outputs1[0][i] - outputs2[0][i]);
    }

    // Outputs should be significantly different
    EXPECT_GT(sumDiff / numSamples, 0.001);

    delete[] outputs1[0];
    delete[] outputs2[0];
    delete[] outputs1;
    delete[] outputs2;
}

TEST(OperatorFeedbackRange)
{
    // Test feedback parameter clamping
    auto synth = DSP::InstrumentFactory::createInstrument("NexSynth");
    EXPECT_NOT_NULL(synth.get());

    synth->prepare(48000.0, 256);

    // Test lower bound
    synth->setParameter("op1_feedback", -0.5f);
    float feedback1 = synth->getParameter("op1_feedback");
    EXPECT_GE(feedback1, 0.0f);

    // Test upper bound
    synth->setParameter("op1_feedback", 1.5f);
    float feedback2 = synth->getParameter("op1_feedback");
    EXPECT_LE(feedback2, 1.0f);

    // Test valid range
    synth->setParameter("op1_feedback", 0.7f);
    float feedback3 = synth->getParameter("op1_feedback");
    EXPECT_NEAR(0.7f, feedback3, 0.01f);
}

//==============================================================================
// Main Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n";
    std::cout << "========================================\n";
    std::cout << "NexSynth Advanced Tests\n";
    std::cout << "========================================\n\n";

    // Run all tests (they're self-registering)
    // The test runner objects will execute when constructed

    std::cout << "\n";
    std::cout << "========================================\n";
    std::cout << "Test Results:\n";
    std::cout << "  Passed: " << testsPassed << "\n";
    std::cout << "  Failed: " << testsFailed << "\n";
    std::cout << "========================================\n\n";

    return (testsFailed == 0) ? 0 : 1;
}

} // namespace Test

int main(int argc, char* argv[])
{
    return Test::main(argc, argv);
}
