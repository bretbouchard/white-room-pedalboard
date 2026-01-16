/*
  ==============================================================================

    SynthTestPure.cpp
    Pure C++ Synth Tests (No JUCE dependencies)

    Platform-agnostic synth testing for tvOS, iOS, macOS, Linux.
    Tests pure DSP synths without any JUCE framework dependencies.

  ==============================================================================
*/

#include <cmath>
#include <cstring>
#include <cstdio>
#include <cstdint>

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

//==============================================================================
// Pure C++ WAV File Writer
//==============================================================================

class PureWavWriter
{
public:
    static bool write(const char* filename, const float* data, int numSamples,
                     int numChannels, double sampleRate, int bitDepth)
    {
        FILE* f = fopen(filename, "wb");
        if (!f) return false;

        // Calculate sizes
        int bytesPerSample = bitDepth / 8;
        int dataRate = sampleRate * numChannels * bytesPerSample;
        int dataSize = numSamples * numChannels * bytesPerSample;
        int fileSize = 36 + dataSize;

        // Write RIFF header
        fwrite("RIFF", 1, 4, f);
        write32LE(fileSize, f);
        fwrite("WAVE", 1, 4, f);

        // Write fmt chunk
        fwrite("fmt ", 1, 4, f);
        write32LE(16, f);  // chunk size
        write16LE(1, f);   // PCM format
        write16LE(numChannels, f);
        write32LE((int)sampleRate, f);
        write32LE(dataRate, f);
        write16LE(numChannels * bytesPerSample, f);  // block align
        write16LE(bitDepth, f);

        // Write data chunk
        fwrite("data", 1, 4, f);
        write32LE(dataSize, f);

        // Convert and write audio data
        if (bitDepth == 16)
        {
            for (int i = 0; i < numSamples * numChannels; ++i)
            {
                float sample = data[i];
                // Clamp
                if (sample > 1.0f) sample = 1.0f;
                if (sample < -1.0f) sample = -1.0f;
                // Convert to 16-bit
                int16_t pcm = (int16_t)(sample * 32767.0f);
                write16LE(pcm, f);
            }
        }

        fclose(f);
        return true;
    }

private:
    static void write16LE(uint16_t value, FILE* f)
    {
        fputc(value & 0xFF, f);
        fputc((value >> 8) & 0xFF, f);
    }

    static void write32LE(uint32_t value, FILE* f)
    {
        fputc(value & 0xFF, f);
        fputc((value >> 8) & 0xFF, f);
        fputc((value >> 16) & 0xFF, f);
        fputc((value >> 24) & 0xFF, f);
    }
};

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
// Main Test
//==============================================================================

int main(int argc, char* argv[])
{
    (void)argc;
    (void)argv;

    printf("\n");
    printf("╔════════════════════════════════════════════════════════════╗\n");
    printf("║  %s Audio Output Test                              ║\n", SYNTH_NAME);
    printf("╚════════════════════════════════════════════════════════════╝\n");
    printf("\n");

    // Create synth
    TestSynth synth;

    // Prepare synth
    if (!synth.prepare(TestConfig::SAMPLE_RATE, TestConfig::BLOCK_SIZE))
    {
        printf("[TEST] ✗ FAILED: synth.prepare() returned false\n");
        return 1;
    }

    printf("[TEST] Sample rate: %.0f Hz\n", TestConfig::SAMPLE_RATE);
    printf("[TEST] Channels: %d\n", TestConfig::NUM_CHANNELS);
    printf("[TEST] Duration: %.1f seconds\n", TestConfig::DURATION_SECONDS);
    printf("[TEST] Notes: %d\n", 4);
    printf("\n");

    // Calculate total samples
    const int totalSamples = (int)(TestConfig::DURATION_SECONDS * TestConfig::SAMPLE_RATE);

    // Create audio buffer
    float* leftChannel = new float[totalSamples];
    float* rightChannel = new float[totalSamples];
    std::memset(leftChannel, 0, totalSamples * sizeof(float));
    std::memset(rightChannel, 0, totalSamples * sizeof(float));

    printf("[TEST] Processing %d samples...\n", totalSamples);

    // Process in blocks
    int sampleOffset = 0;
    int eventsScheduled = 0;

    while (sampleOffset < totalSamples)
    {
        const int samplesToProcess = (std::min)(TestConfig::BLOCK_SIZE, totalSamples - sampleOffset);
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
                noteOnEvent.sampleOffset = (uint32_t)((noteTime - currentTime) * TestConfig::SAMPLE_RATE);
                noteOnEvent.data.note.midiNote = TestConfig::TEST_NOTES[i];
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
                noteOffEvent.sampleOffset = (uint32_t)((noteOffTime - currentTime) * TestConfig::SAMPLE_RATE);
                noteOffEvent.data.note.midiNote = TestConfig::TEST_NOTES[i];
                noteOffEvent.data.note.velocity = 0.0f;

                synth.handleEvent(noteOffEvent);
                eventsScheduled++;
            }
        }

        // Prepare channel pointers
        float* channels[2];
        channels[0] = leftChannel + sampleOffset;
        channels[1] = rightChannel + sampleOffset;

        // Process audio
        synth.process(channels, TestConfig::NUM_CHANNELS, samplesToProcess);

        sampleOffset += samplesToProcess;
    }

    printf("[TEST] Processed %d samples\n", sampleOffset);
    printf("[TEST] Scheduled %d events\n", eventsScheduled);

    // Interleave for WAV output
    float* interleaved = new float[totalSamples * TestConfig::NUM_CHANNELS];
    for (int i = 0; i < totalSamples; ++i)
    {
        interleaved[i * 2] = leftChannel[i];
        interleaved[i * 2 + 1] = rightChannel[i];
    }

    // Write to WAV file
    char filename[256];
    std::snprintf(filename, sizeof(filename), "%s_pure_test_output.wav", SYNTH_NAME);

    if (!PureWavWriter::write(filename, interleaved, totalSamples,
                             TestConfig::NUM_CHANNELS, TestConfig::SAMPLE_RATE,
                             TestConfig::OUTPUT_BIT_DEPTH))
    {
        printf("[TEST] ✗ FAILED: Could not write WAV file\n");
        delete[] leftChannel;
        delete[] rightChannel;
        delete[] interleaved;
        return 1;
    }

    printf("\n");
    printf("╔════════════════════════════════════════════════════════════╗\n");
    printf("║  TEST COMPLETE: ✓ PASS                                     ║\n");
    printf("║                                                            ║\n");
    printf("║  Output: %-53s ║\n", filename);
    printf("║  Format: 48kHz stereo 16-bit WAV                            ║\n");
    printf("║  Duration: 3 seconds                                         ║\n");
    printf("╚════════════════════════════════════════════════════════════╝\n");
    printf("\n");

    // Cleanup
    delete[] leftChannel;
    delete[] rightChannel;
    delete[] interleaved;

    return 0;
}
