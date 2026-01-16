/*
  ==============================================================================

    SynthTest.cpp
    Individual Synth Tests

    Tests each synth separately to avoid namespace conflicts.
    Synth selection is done via compile-time definitions:
    - SYNTH_UNDER_TEST=1: LocalGal
    - SYNTH_UNDER_TEST=2: KaneMarco
    - SYNTH_UNDER_TEST=3: KaneMarcoAether
    - SYNTH_UNDER_TEST=4: DrumMachine
    - SYNTH_UNDER_TEST=5: NexSynth

  ==============================================================================
*/

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>

// Include synth headers based on SYNTH_UNDER_TEST
#if SYNTH_UNDER_TEST == 1
    #include "dsp/LocalGalPureDSP.h"
    using TestSynth = DSP::LocalGalPureDSP;
#elif SYNTH_UNDER_TEST == 2
    #include "dsp/KaneMarcoPureDSP.h"
    using TestSynth = DSP::KaneMarcoPureDSP;
#elif SYNTH_UNDER_TEST == 3
    #include "dsp/KaneMarcoAetherPureDSP.h"
    using TestSynth = DSP::KaneMarcoAetherPureDSP;
#elif SYNTH_UNDER_TEST == 4
    #include "dsp/DrumMachinePureDSP.h"
    using TestSynth = DSP::DrumMachinePureDSP;
#elif SYNTH_UNDER_TEST == 5
    #include "NexSynthDSP.h"
    using TestSynth = DSP::NexSynthDSP;
#elif SYNTH_UNDER_TEST == 6
    #include "SamSamplerDSP.h"
    using TestSynth = DSP::SamSamplerDSP;
#else
    #error "SYNTH_UNDER_TEST must be defined (1-6)"
#endif

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

    // Output filename
    static const char* getOutputFilename()
    {
        static char filename[256];
        snprintf(filename, sizeof(filename), "%s_test_output.wav", SYNTH_NAME);
        return filename;
    }
};

//==============================================================================
// Audio Renderer
//==============================================================================

class AudioRenderer
{
public:
    AudioRenderer() = default;

    bool renderSynthToFile(InstrumentDSP& synth, const String& outputPath)
    {
        DBG(" ");
        DBG("╔════════════════════════════════════════════════════════════╗");
        DBG("║  " << SYNTH_NAME << " Audio Output Test                              ║");
        DBG("╚════════════════════════════════════════════════════════════╝");
        DBG(" ");
        DBG("[TEST] Rendering to: " << outputPath);
        DBG("[TEST] Sample rate: " << TestConfig::SAMPLE_RATE);
        DBG("[TEST] Channels: " << TestConfig::NUM_CHANNELS);
        DBG("[TEST] Duration: " << TestConfig::DURATION_SECONDS << " seconds");
        DBG(" ");

        // Prepare synth
        if (!synth.prepare(TestConfig::SAMPLE_RATE, TestConfig::BLOCK_SIZE))
        {
            DBG("[TEST] ✗ FAILED: synth.prepare() returned false");
            return false;
        }

        DBG("[TEST] ✓ Synth prepared successfully");

        // Calculate total samples
        const int totalSamples = static_cast<int>(
            TestConfig::DURATION_SECONDS * TestConfig::SAMPLE_RATE
        );

        // Create audio buffer
        AudioBuffer<float> buffer(TestConfig::NUM_CHANNELS, totalSamples);
        buffer.clear();

        DBG("[TEST] Processing " << totalSamples << " samples...");

        // Process in blocks
        int sampleOffset = 0;

        while (sampleOffset < totalSamples)
        {
            const int samplesToProcess = jmin(TestConfig::BLOCK_SIZE, totalSamples - sampleOffset);
            double currentTime = sampleOffset / TestConfig::SAMPLE_RATE;

            // Schedule notes for this block
            for (int i = 0; i < 4; ++i)
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
                    noteOnEvent.data.note.midiNote = TestConfig::TEST_NOTES[i];
                    noteOnEvent.data.note.velocity = TestConfig::TEST_VELOCITY;

                    synth.handleEvent(noteOnEvent);
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
                    noteOffEvent.data.note.midiNote = TestConfig::TEST_NOTES[i];
                    noteOffEvent.data.note.velocity = 0.0f;

                    synth.handleEvent(noteOffEvent);
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

        DBG("[TEST] ✓ Processed " << sampleOffset << " samples");

        // Write to WAV file
        if (!writeWavFile(buffer, outputPath))
        {
            DBG("[TEST] ✗ FAILED: Could not write WAV file");
            return false;
        }

        DBG(" ");
        DBG("╔════════════════════════════════════════════════════════════╗");
        DBG("║  TEST COMPLETE: ✓ PASS                                     ║");
        DBG("║                                                            ║");
        DBG("║  Output: " << outputPath << String(46 - strlen(outputPath), ' ') << "║");
        DBG("║  Format: 48kHz stereo 16-bit WAV                            ║");
        DBG("║  Duration: 3 seconds                                         ║");
        DBG("╚════════════════════════════════════════════════════════════╝");
        DBG(" ");

        return true;
    }

private:
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
            DBG("[TEST] ✗ Could not create output file");
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
            DBG("[TEST] ✗ Could not create WAV writer");
            return false;
        }

        fos.release(); // Writer takes ownership

        // Write audio data
        if (!writer->writeFromAudioSampleBuffer(buffer, 0, buffer.getNumSamples()))
        {
            DBG("[TEST] ✗ Failed to write audio data");
            return false;
        }

        DBG("[TEST] ✓ WAV file written: "
            << outputFile.getFileSize() << " bytes");
        return true;
    }
};

//==============================================================================
// Main Entry Point
//==============================================================================

int main(int argc, char* argv[])
{
    // Ignore unused parameters
    (void) argc;
    (void) argv;

    // Initialize logging
    Logger::setCurrentLogger(nullptr);

    // Create synth
    TestSynth synth;

    // Run test
    AudioRenderer renderer;
    String outputPath = TestConfig::getOutputFilename();

    return renderer.renderSynthToFile(synth, outputPath) ? 0 : 1;
}
