/*
  ==============================================================================

    ProcessingStabilityTest.cpp
    Created: January 13, 2026
    Author: Bret Bouchard

    Processing Stability Tests for Plugin Validation
    Tests different buffer sizes, sample rates, and processing conditions

  ==============================================================================
*/

#include "../../../instruments/kane_marco/include/dsp/KaneMarcoPureDSP.h"
#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
#include <iomanip>

using namespace DSP;

//==============================================================================
// Test Result Tracking
//==============================================================================

struct TestResults
{
    int total = 0;
    int passed = 0;
    int failed = 0;
    std::vector<std::string> failures;

    void pass(const std::string& testName)
    {
        total++;
        passed++;
        std::cout << "  [PASS] " << testName << std::endl;
    }

    void fail(const std::string& testName, const std::string& reason)
    {
        total++;
        failed++;
        failures.push_back(testName + ": " + reason);
        std::cout << "  [FAIL] " << testName << ": " << reason << std::endl;
    }

    void printSummary() const
    {
        std::cout << "\n========================================" << std::endl;
        std::cout << "Test Summary: " << passed << "/" << total << " passed";
        if (failed > 0)
        {
            std::cout << " (" << failed << " failed)";
        }
        std::cout << "\n========================================" << std::endl;
    }

    bool allPassed() const { return failed == 0; }
};

//==============================================================================
// Audio Analysis Utilities
//==============================================================================

namespace AudioUtils
{
    float getPeakLevel(const float* buffer, int numSamples)
    {
        float peak = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            peak = std::max(peak, std::abs(buffer[i]));
        }
        return peak;
    }

    bool hasSignal(const float* buffer, int numSamples, float threshold = 0.001f)
    {
        return getPeakLevel(buffer, numSamples) > threshold;
    }

    bool hasNaN(const float* buffer, int numSamples)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            if (std::isnan(buffer[i]) || std::isinf(buffer[i]))
                return true;
        }
        return false;
    }

    float getRMSLevel(const float* buffer, int numSamples)
    {
        float sum = 0.0f;
        for (int i = 0; i < numSamples; ++i)
        {
            sum += buffer[i] * buffer[i];
        }
        return std::sqrt(sum / numSamples);
    }

    bool allZero(const float* buffer, int numSamples)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            if (buffer[i] != 0.0f)
                return false;
        }
        return true;
    }
}

//==============================================================================
// Processing Stability Test Suite
//==============================================================================

class ProcessingStabilityTestSuite
{
public:
    ProcessingStabilityTestSuite() : synth_(nullptr)
    {
    }

    ~ProcessingStabilityTestSuite()
    {
        delete synth_;
    }

    bool initialize(double sampleRate = 48000, int blockSize = 512)
    {
        sampleRate_ = sampleRate;
        blockSize_ = blockSize;

        synth_ = new KaneMarcoPureDSP();
        if (!synth_->prepare(sampleRate, blockSize))
        {
            std::cerr << "Failed to prepare synth" << std::endl;
            return false;
        }
        return true;
    }

    void runAllTests(TestResults& results)
    {
        std::cout << "\n=== PROCESSING STABILITY TESTS ===" << std::endl;

        testDifferentBufferSizes(results);
        testDifferentSampleRates(results);
        testNoteOnOffStability(results);
        testPolyphonyStability(results);
        testLongProcessingRun(results);
        testSilenceProcessing(results);
        testDenormalHandling(results);
    }

private:
    KaneMarcoPureDSP* synth_;
    double sampleRate_;
    int blockSize_;

    // Trigger a note and process audio
    std::vector<float> processNote(int midiNote = 60, float velocity = 0.8f, int durationMs = 100)
    {
        // Trigger note
        ScheduledEvent noteOn;
        noteOn.type = ScheduledEvent::NOTE_ON;
        noteOn.time = 0.0;
        noteOn.sampleOffset = 0;
        noteOn.data.note.midiNote = midiNote;
        noteOn.data.note.velocity = velocity;
        synth_->handleEvent(noteOn);

        // Process audio
        int numSamples = (durationMs * static_cast<int>(sampleRate_)) / 1000;
        std::vector<float> output(numSamples * 2); // Stereo

        float* outputs[] = { output.data(), output.data() + numSamples };

        int offset = 0;
        while (offset < numSamples)
        {
            int chunkSize = std::min(blockSize_, numSamples - offset);
            synth_->process(outputs + (offset * 2), 2, chunkSize);
            offset += chunkSize;
        }

        // Note off
        ScheduledEvent noteOff;
        noteOff.type = ScheduledEvent::NOTE_OFF;
        noteOff.time = 0.0;
        noteOff.sampleOffset = 0;
        noteOff.data.note.midiNote = midiNote;
        noteOff.data.note.velocity = 0.0f;
        synth_->handleEvent(noteOff);

        // Process release
        int releaseSamples = (200 * static_cast<int>(sampleRate_)) / 1000; // 200ms release
        std::vector<float> releaseOutput(releaseSamples * 2);
        float* releaseOutputs[] = { releaseOutput.data(), releaseOutput.data() + releaseSamples };

        offset = 0;
        while (offset < releaseSamples)
        {
            int chunkSize = std::min(blockSize_, releaseSamples - offset);
            synth_->process(releaseOutputs + (offset * 2), 2, chunkSize);
            offset += chunkSize;
        }

        return output;
    }

    // Test 1: Different buffer sizes
    void testDifferentBufferSizes(TestResults& results)
    {
        std::cout << "\n--- Test 1: Different Buffer Sizes ---" << std::endl;

        const int bufferSizes[] = {16, 32, 64, 128, 256, 512, 1024, 2048};

        for (int bufferSize : bufferSizes)
        {
            // Reinitialize with new buffer size
            delete synth_;
            if (!initialize(48000.0, bufferSize))
            {
                results.fail("Buffer size " + std::to_string(bufferSize), "Failed to initialize");
                continue;
            }

            auto output = processNote();

            if (AudioUtils::hasSignal(output.data(), output.size()))
            {
                if (!AudioUtils::hasNaN(output.data(), output.size()))
                {
                    results.pass("Buffer size " + std::to_string(bufferSize));
                }
                else
                {
                    results.fail("Buffer size " + std::to_string(bufferSize), "NaN detected");
                }
            }
            else
            {
                results.fail("Buffer size " + std::to_string(bufferSize), "No signal output");
            }
        }
    }

    // Test 2: Different sample rates
    void testDifferentSampleRates(TestResults& results)
    {
        std::cout << "\n--- Test 2: Different Sample Rates ---" << std::endl;

        const double sampleRates[] = {44100.0, 48000.0, 96000.0, 192000.0};

        for (double sampleRate : sampleRates)
        {
            // Reinitialize with new sample rate
            delete synth_;
            if (!initialize(sampleRate, 512))
            {
                results.fail("Sample rate " + std::to_string(static_cast<int>(sampleRate)), "Failed to initialize");
                continue;
            }

            auto output = processNote();

            if (AudioUtils::hasSignal(output.data(), output.size()))
            {
                if (!AudioUtils::hasNaN(output.data(), output.size()))
                {
                    results.pass("Sample rate " + std::to_string(static_cast<int>(sampleRate)));
                }
                else
                {
                    results.fail("Sample rate " + std::to_string(static_cast<int>(sampleRate)), "NaN detected");
                }
            }
            else
            {
                results.fail("Sample rate " + std::to_string(static_cast<int>(sampleRate)), "No signal output");
            }
        }
    }

    // Test 3: Note on/off stability
    void testNoteOnOffStability(TestResults& results)
    {
        std::cout << "\n--- Test 3: Note On/Off Stability ---" << std::endl;

        // Reset to standard config
        delete synth_;
        initialize(48000.0, 512);

        // Test rapid note on/off
        for (int i = 0; i < 100; ++i)
        {
            int midiNote = 60 + (i % 24); // Different notes

            auto output = processNote(midiNote, 0.7f, 50); // Short notes

            if (AudioUtils::hasNaN(output.data(), output.size()))
            {
                results.fail("Note on/off stability", "NaN detected at note " + std::to_string(i));
                return;
            }
        }

        results.pass("Note on/off stability (100 rapid notes)");
    }

    // Test 4: Polyphony stability
    void testPolyphonyStability(TestResults& results)
    {
        std::cout << "\n--- Test 4: Polyphony Stability ---" << std::endl;

        // Reset to standard config
        delete synth_;
        initialize(48000.0, 512);

        // Test max polyphony
        const int maxVoices = 16;
        for (int i = 0; i < maxVoices; ++i)
        {
            ScheduledEvent noteOn;
            noteOn.type = ScheduledEvent::NOTE_ON;
            noteOn.data.note.midiNote = 60 + i;
            noteOn.data.note.velocity = 0.7f;
            synth_->handleEvent(noteOn);
        }

        // Process with all voices active
        int numSamples = blockSize_ * 10; // Process multiple blocks
        std::vector<float> output(numSamples * 2);

        int offset = 0;
        while (offset < numSamples)
        {
            int chunkSize = std::min(blockSize_, numSamples - offset);
            float* outputs[] = { output.data() + (offset * 2), output.data() + numSamples + (offset * 2) };
            synth_->process(outputs, 2, chunkSize);
            offset += chunkSize;
        }

        if (AudioUtils::hasSignal(output.data(), output.size()))
        {
            if (!AudioUtils::hasNaN(output.data(), output.size()))
            {
                int activeVoices = synth_->getActiveVoiceCount();
                if (activeVoices == maxVoices)
                {
                    results.pass("Polyphony stability (" + std::to_string(maxVoices) + " voices)");
                }
                else
                {
                    results.fail("Polyphony stability", "Expected " + std::to_string(maxVoices) +
                                " voices, got " + std::to_string(activeVoices));
                }
            }
            else
            {
                results.fail("Polyphony stability", "NaN detected with max polyphony");
            }
        }
        else
        {
            results.fail("Polyphony stability", "No signal output with max polyphony");
        }

        // Turn off all notes
        for (int i = 0; i < maxVoices; ++i)
        {
            ScheduledEvent noteOff;
            noteOff.type = ScheduledEvent::NOTE_OFF;
            noteOff.data.note.midiNote = 60 + i;
            noteOff.data.note.velocity = 0.0f;
            synth_->handleEvent(noteOff);
        }
    }

    // Test 5: Long processing run
    void testLongProcessingRun(TestResults& results)
    {
        std::cout << "\n--- Test 5: Long Processing Run ---" << std::endl;

        // Reset to standard config
        delete synth_;
        initialize(48000.0, 512);

        const int numBlocks = 10000;
        std::atomic<bool> nanDetected{false};

        for (int block = 0; block < numBlocks; ++block)
        {
            std::vector<float> output(blockSize_ * 2);
            float* outputs[] = { output.data(), output.data() + blockSize_ };

            synth_->process(outputs, 2, blockSize_);

            if (AudioUtils::hasNaN(output.data(), output.size()))
            {
                nanDetected = true;
                break;
            }
        }

        if (!nanDetected)
        {
            results.pass("Long processing run (" + std::to_string(numBlocks) + " blocks)");
        }
        else
        {
            results.fail("Long processing run", "NaN detected during long run");
        }
    }

    // Test 6: Silence processing
    void testSilenceProcessing(TestResults& results)
    {
        std::cout << "\n--- Test 6: Silence Processing ---" << std::endl;

        // Reset to standard config
        delete synth_;
        initialize(48000.0, 512);

        // Process with no notes (silence)
        const int numBlocks = 1000;
        for (int block = 0; block < numBlocks; ++block)
        {
            std::vector<float> output(blockSize_ * 2);
            float* outputs[] = { output.data(), output.data() + blockSize_ };

            synth_->process(outputs, 2, blockSize_);

            // Check for NaN or unexpected signal
            if (AudioUtils::hasNaN(output.data(), output.size()))
            {
                results.fail("Silence processing", "NaN detected");
                return;
            }

            // Check if silence is maintained (no unwanted signal)
            if (block > 10) // Allow some startup transient
            {
                float rms = AudioUtils::getRMSLevel(output.data(), output.size());
                if (rms > 0.001f)
                {
                    results.fail("Silence processing", "Unexpected signal detected (RMS: " +
                                    std::to_string(rms) + ")");
                    return;
                }
            }
        }

        results.pass("Silence processing (" + std::to_string(numBlocks) + " blocks)");
    }

    // Test 7: Denormal handling
    void testDenormalHandling(TestResults& results)
    {
        std::cout << "\n--- Test 7: Denormal Handling ---" << std::endl;

        // Reset to standard config
        delete synth_;
        initialize(48000.0, 512);

        // Set parameters to values that might cause denormals
        synth_->setParameter("filterCutoff", 0.0001f); // Very low frequency
        synth_->setParameter("filterResonance", 0.9999f); // Very high resonance

        // Process audio and check for performance issues or NaNs
        const int numBlocks = 1000;
        auto startTime = std::chrono::high_resolution_clock::now();

        for (int block = 0; block < numBlocks; ++block)
        {
            std::vector<float> output(blockSize_ * 2);
            float* outputs[] = { output.data(), output.data() + blockSize_ };

            synth_->process(outputs, 2, blockSize_);

            if (AudioUtils::hasNaN(output.data(), output.size()))
            {
                results.fail("Denormal handling", "NaN detected with denormal-prone settings");
                return;
            }
        }

        auto endTime = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

        // Processing should complete in reasonable time (< 1 second for 1000 blocks)
        if (duration.count() < 1000)
        {
            results.pass("Denormal handling (processed " + std::to_string(numBlocks) +
                        " blocks in " + std::to_string(duration.count()) + "ms)");
        }
        else
        {
            results.fail("Denormal handling", "Processing too slow: " + std::to_string(duration.count()) + "ms");
        }
    }
};

//==============================================================================
// Main Entry Point
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "========================================" << std::endl;
    std::cout << "Processing Stability Tests" << std::endl;
    std::cout << "Kane Marco Hybrid VA Synthesizer" << std::endl;
    std::cout << "========================================" << std::endl;

    TestResults results;
    ProcessingStabilityTestSuite suite;

    if (!suite.initialize())
    {
        std::cerr << "Failed to initialize test suite" << std::endl;
        return 1;
    }

    suite.runAllTests(results);
    results.printSummary();

    return results.allPassed() ? 0 : 1;
}
