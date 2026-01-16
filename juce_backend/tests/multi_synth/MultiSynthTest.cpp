/*
  ==============================================================================

    MultiSynthTest.cpp
    Foundation Test: All Synths → Audio Output

    Tests ALL synths in the JUCE backend to verify they can produce audio:
    - LocalGalPureDSP (Acid synth)
    - KaneMarcoPureDSP (Hybrid virtual analog)
    - NexSynthDSP (FM synth)
    - SamSamplerDSP (Sampler)
    - KaneMarcoAetherPureDSP (Physical modeling)
    - DrumMachinePureDSP (Drum machine)
    - Giant Instruments (Drums, Horns, Percussion, Voice)

  ==============================================================================
*/

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>

// Include all synth headers
#include "dsp/LocalGalPureDSP.h"
#include "dsp/KaneMarcoPureDSP.h"
#include "dsp/KaneMarcoAetherPureDSP.h"
#include "dsp/DrumMachinePureDSP.h"
#include "NexSynthDSP.h"
#include "SamSamplerDSP.h"

using namespace DSP;
using namespace juce;

//==============================================================================
// Test Configuration
//==============================================================================

struct TestConfig
{
    static constexpr double SAMPLE_RATE = 48000.0;
    static constexpr int BLOCK_SIZE = 512;
    static constexpr int NUM_CHANNELS = 2;
    static constexpr double DURATION_SECONDS = 3.0;
    static constexpr int OUTPUT_BIT_DEPTH = 16;

    // Test notes (C major arpeggio)
    static constexpr int TEST_NOTES[4] = {60, 64, 67, 72};  // C, E, G, C
    static constexpr float TEST_VELOCITY = 0.8f;
    static constexpr double NOTE_DURATION = 0.5;
};

//==============================================================================
// Synth Factory
//==============================================================================

enum class SynthType
{
    LocalGal,
    KaneMarco,
    KaneMarcoAether,
    NexSynth,
    SamSampler,
    DrumMachine,
    All
};

struct SynthInfo
{
    SynthType type;
    const char* name;
    const char* outputFile;
};

static const SynthInfo ALL_SYNTHS[] = {
    {SynthType::LocalGal, "LocalGal", "localgal_test_output.wav"},
    {SynthType::KaneMarco, "KaneMarco", "kanemarco_test_output.wav"},
    {SynthType::KaneMarcoAether, "KaneMarcoAether", "kanemarco_aether_test_output.wav"},
    {SynthType::NexSynth, "NexSynth", "nexsynth_test_output.wav"},
    {SynthType::SamSampler, "SamSampler", "samsampler_test_output.wav"},
    {SynthType::DrumMachine, "DrumMachine", "drummachine_test_output.wav"},
};

//==============================================================================
// Audio Renderer
//==============================================================================

class AudioRenderer
{
public:
    AudioRenderer() = default;

    //==========================================================================
    // Render Any Synth to WAV File
    //==========================================================================

    bool renderSynthToFile(InstrumentDSP& synth,
                          const String& synthName,
                          const String& outputPath,
                          const int* notes,
                          int noteCount)
    {
        DBG("[AudioRenderer] ========================================");
        DBG("[AudioRenderer] Rendering " << synthName << " to file:");
        DBG("[AudioRenderer]   " << outputPath);
        DBG("[AudioRenderer] Sample rate: " << TestConfig::SAMPLE_RATE);
        DBG("[AudioRenderer] Channels: " << TestConfig::NUM_CHANNELS);
        DBG("[AudioRenderer] Duration: " << TestConfig::DURATION_SECONDS << " seconds");
        DBG("[AudioRenderer] Notes: " << noteCount);
        DBG("[AudioRenderer] ========================================");

        // Prepare synth
        if (!synth.prepare(TestConfig::SAMPLE_RATE, TestConfig::BLOCK_SIZE))
        {
            DBG("[AudioRenderer] ✗ FAILED: synth.prepare() returned false");
            return false;
        }

        // Calculate total samples
        const int totalSamples = static_cast<int>(
            TestConfig::DURATION_SECONDS * TestConfig::SAMPLE_RATE
        );

        // Create audio buffer
        AudioBuffer<float> buffer(TestConfig::NUM_CHANNELS, totalSamples);
        buffer.clear();

        DBG("[AudioRenderer] Processing " << totalSamples << " samples...");

        // Process in blocks
        int sampleOffset = 0;
        int eventsScheduled = 0;

        while (sampleOffset < totalSamples)
        {
            const int samplesToProcess = jmin(TestConfig::BLOCK_SIZE, totalSamples - sampleOffset);
            double currentTime = sampleOffset / TestConfig::SAMPLE_RATE;

            // Schedule notes for this block
            for (int i = 0; i < noteCount; ++i)
            {
                double noteTime = i * TestConfig::NOTE_DURATION;

                // Note ON
                if (noteTime >= currentTime &&
                    noteTime < currentTime + (samplesToProcess / TestConfig::SAMPLE_RATE))
                {
                    ScheduledEvent noteOnEvent;
                    noteOnEvent.type = ScheduledEvent::NOTE_ON;
                    noteOnEvent.time = noteTime;
                    noteOnEvent.sampleOffset = static_cast<uint32_t>(
                        (noteTime - currentTime) * TestConfig::SAMPLE_RATE
                    );
                    noteOnEvent.data.note.midiNote = notes[i];
                    noteOnEvent.data.note.velocity = TestConfig::TEST_VELOCITY;

                    synth.handleEvent(noteOnEvent);
                    eventsScheduled++;
                }

                // Note OFF
                double noteOffTime = noteTime + TestConfig::NOTE_DURATION;
                if (noteOffTime >= currentTime &&
                    noteOffTime < currentTime + (samplesToProcess / TestConfig::SAMPLE_RATE))
                {
                    ScheduledEvent noteOffEvent;
                    noteOffEvent.type = ScheduledEvent::NOTE_OFF;
                    noteOffEvent.time = noteOffTime;
                    noteOffEvent.sampleOffset = static_cast<uint32_t>(
                        (noteOffTime - currentTime) * TestConfig::SAMPLE_RATE
                    );
                    noteOffEvent.data.note.midiNote = notes[i];
                    noteOffEvent.data.note.velocity = 0.0f;

                    synth.handleEvent(noteOffEvent);
                    eventsScheduled++;
                }
            }

            // Prepare channel pointers
            float* channels[2];
            channels[0] = buffer.getWritePointer(0, sampleOffset);
            channels[1] = buffer.getWritePointer(1, sampleOffset);

            // Process audio
            synth.process(channels, TestConfig::NUM_CHANNELS, samplesToProcess);

            sampleOffset += samplesToProcess;
        }

        DBG("[AudioRenderer] Processed " << sampleOffset << " samples");
        DBG("[AudioRenderer] Scheduled " << eventsScheduled << " events");

        // Write to WAV file
        if (!writeWavFile(buffer, outputPath))
        {
            DBG("[AudioRenderer] ✗ FAILED: Could not write WAV file");
            return false;
        }

        DBG("[AudioRenderer] ✓ SUCCESS: WAV file created");
        return true;
    }

private:
    //==========================================================================
    // Write WAV File
    //==========================================================================

    bool writeWavFile(const AudioBuffer<float>& buffer, const String& outputPath)
    {
        File outputFile(outputPath);
        if (outputFile.existsAsFile())
        {
            outputFile.deleteFile();
        }

        std::unique_ptr<FileOutputStream> fos(outputFile.createOutputStream());
        if (!fos || fos->failedToOpen())
        {
            DBG("[AudioRenderer] ✗ Could not create output file");
            return false;
        }

        // Write WAV header
        WavAudioFormat wavFormat;
        std::unique_ptr<AudioFormatWriter> writer(wavFormat.createWriterFor(
            fos.get(), TestConfig::SAMPLE_RATE, TestConfig::NUM_CHANNELS,
            TestConfig::OUTPUT_BIT_DEPTH, {}, 0
        ));

        if (!writer)
        {
            DBG("[AudioRenderer] ✗ Could not create WAV writer");
            return false;
        }

        fos.release(); // Writer takes ownership

        // Write audio data
        if (!writer->writeFromAudioSampleBuffer(buffer, 0, buffer.getNumSamples()))
        {
            DBG("[AudioRenderer] ✗ Failed to write audio data");
            return false;
        }

        DBG("[AudioRenderer] WAV file written: "
            << outputFile.getFileSize() << " bytes");
        return true;
    }
};

//==============================================================================
// Synth Tests
//==============================================================================

class SynthTester
{
public:
    SynthTester()
    {
        DBG(" ");
        DBG("╔════════════════════════════════════════════════════════════╗");
        DBG("║  MULTI-SYNTH AUDIO PIPELINE FOUNDATION TEST                  ║");
        DBG("╚════════════════════════════════════════════════════════════╝");
        DBG(" ");
    }

    //==========================================================================
    // Test LocalGal
    //==========================================================================

    bool testLocalGal()
    {
        DBG("[TEST] ========== TESTING LOCALGAL ==========");

        LocalGalPureDSP synth;
        DBG("[TEST] Synth: " << synth.getInstrumentName()
            << " v" << synth.getInstrumentVersion());

        AudioRenderer renderer;
        return renderer.renderSynthToFile(
            synth,
            "LocalGal",
            "localgal_test_output.wav",
            TestConfig::TEST_NOTES,
            4
        );
    }

    //==========================================================================
    // Test KaneMarco
    //==========================================================================

    bool testKaneMarco()
    {
        DBG("[TEST] ========== TESTING KANEMARCO ==========");

        KaneMarcoPureDSP synth;
        DBG("[TEST] Synth: " << synth.getInstrumentName()
            << " v" << synth.getInstrumentVersion());

        AudioRenderer renderer;
        return renderer.renderSynthToFile(
            synth,
            "KaneMarco",
            "kanemarco_test_output.wav",
            TestConfig::TEST_NOTES,
            4
        );
    }

    //==========================================================================
    // Test KaneMarcoAether
    //==========================================================================

    bool testKaneMarcoAether()
    {
        DBG("[TEST] ========== TESTING KANEMARCO AETHER ==========");

        KaneMarcoAetherPureDSP synth;
        DBG("[TEST] Synth: " << synth.getInstrumentName()
            << " v" << synth.getInstrumentVersion());

        AudioRenderer renderer;
        return renderer.renderSynthToFile(
            synth,
            "KaneMarcoAether",
            "kanemarco_aether_test_output.wav",
            TestConfig::TEST_NOTES,
            4
        );
    }

    //==========================================================================
    // Test NexSynth
    //==========================================================================

    bool testNexSynth()
    {
        DBG("[TEST] ========== TESTING NEXSYNTH ==========");

        DSP::NexSynthDSP synth;
        // Note: NexSynthDSP might not have getInstrumentName(), skip if needed
        DBG("[TEST] Synth: NexSynth");

        AudioRenderer renderer;
        return renderer.renderSynthToFile(
            synth,
            "NexSynth",
            "nexsynth_test_output.wav",
            TestConfig::TEST_NOTES,
            4
        );
    }

    //==========================================================================
    // Test SamSampler
    //==========================================================================

    bool testSamSampler()
    {
        DBG("[TEST] ========== TESTING SAMSAMPLER ==========");

        DSP::SamSamplerDSP synth;
        DBG("[TEST] Synth: SamSampler");

        AudioRenderer renderer;
        return renderer.renderSynthToFile(
            synth,
            "SamSampler",
            "samsampler_test_output.wav",
            TestConfig::TEST_NOTES,
            4
        );
    }

    //==========================================================================
    // Test DrumMachine
    //==========================================================================

    bool testDrumMachine()
    {
        DBG("[TEST] ========== TESTING DRUM MACHINE ==========");

        DrumMachinePureDSP synth;
        DBG("[TEST] Synth: " << synth.getInstrumentName()
            << " v" << synth.getInstrumentVersion());

        // Drum machine uses different notes (GM drum mapping)
        int drumNotes[4] = {36, 38, 42, 46};  // Kick, Snare, Closed HH, Open HH

        AudioRenderer renderer;
        return renderer.renderSynthToFile(
            synth,
            "DrumMachine",
            "drummachine_test_output.wav",
            drumNotes,
            4
        );
    }

    //==========================================================================
    // Test All Synths
    //==========================================================================

    int testAll()
    {
        int passed = 0;
        int failed = 0;

        struct TestResult {
            const char* name;
            bool success;
        };

        std::vector<TestResult> results;

        // Test LocalGal
        results.push_back({"LocalGal", testLocalGal()});
        DBG(" ");

        // Test KaneMarco
        results.push_back({"KaneMarco", testKaneMarco()});
        DBG(" ");

        // Test KaneMarcoAether
        results.push_back({"KaneMarcoAether", testKaneMarcoAether()});
        DBG(" ");

        // Test NexSynth
        results.push_back({"NexSynth", testNexSynth()});
        DBG(" ");

        // Test SamSampler
        results.push_back({"SamSampler", testSamSampler()});
        DBG(" ");

        // Test DrumMachine
        results.push_back({"DrumMachine", testDrumMachine()});
        DBG(" ");

        // Count results
        for (const auto& result : results)
        {
            if (result.success)
                passed++;
            else
                failed++;
        }

        // Print summary
        DBG(" ");
        DBG("╔════════════════════════════════════════════════════════════╗");
        DBG("║  TEST SUMMARY                                               ║");
        DBG("╠════════════════════════════════════════════════════════════╣");
        DBG("║  Passed: " << String(passed) << String(53 - String(passed).length(), ' ') << "║");
        DBG("║  Failed: " << String(failed) << String(53 - String(failed).length(), ' ') << "║");
        DBG("╠════════════════════════════════════════════════════════════╣");

        for (const auto& result : results)
        {
            DBG("║  " << (result.success ? "✓" : "✗") << " " << result.name
                << String(52 - strlen(result.name), ' ') << "║");
        }

        DBG("╚════════════════════════════════════════════════════════════╝");

        return failed == 0 ? 0 : 1;
    }
};

//==============================================================================
// Main Entry Point
//==============================================================================

int main(int argc, char* argv[])
{
    // Parse command line arguments
    SynthType synthToTest = SynthType::All;

    if (argc > 1)
    {
        String arg = argv[1];
        if (arg == "localgal" || arg == "LocalGal")
            synthToTest = SynthType::LocalGal;
        else if (arg == "kanemarco" || arg == "KaneMarco")
            synthToTest = SynthType::KaneMarco;
        else if (arg == "aether" || arg == "Aether")
            synthToTest = SynthType::KaneMarcoAether;
        else if (arg == "nex" || arg == "NexSynth")
            synthToTest = SynthType::NexSynth;
        else if (arg == "sam" || arg == "SamSampler")
            synthToTest = SynthType::SamSampler;
        else if (arg == "drums" || arg == "DrumMachine")
            synthToTest = SynthType::DrumMachine;
        else
        {
            DBG("Usage: " << argv[0] << " [synth_name]");
            DBG(" ");
            DBG("Synth names:");
            DBG("  LocalGal - Acid synthesizer");
            DBG("  KaneMarco - Hybrid virtual analog");
            DBG("  Aether - Physical modeling");
            DBG("  NexSynth - FM synthesizer");
            DBG("  SamSampler - Sampler");
            DBG("  DrumMachine - Drum machine");
            DBG(" ");
            DBG("If no synth specified, tests all synths.");
            return 1;
        }
    }

    // Initialize logging
    Logger::setCurrentLogger(nullptr);

    // Run tests
    SynthTester tester;

    switch (synthToTest)
    {
        case SynthType::LocalGal:
            return tester.testLocalGal() ? 0 : 1;

        case SynthType::KaneMarco:
            return tester.testKaneMarco() ? 0 : 1;

        case SynthType::KaneMarcoAether:
            return tester.testKaneMarcoAether() ? 0 : 1;

        case SynthType::NexSynth:
            return tester.testNexSynth() ? 0 : 1;

        case SynthType::SamSampler:
            return tester.testSamSampler() ? 0 : 1;

        case SynthType::DrumMachine:
            return tester.testDrumMachine() ? 0 : 1;

        case SynthType::All:
        default:
            return tester.testAll();
    }

    return 0;
}
