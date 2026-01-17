/*
  ==============================================================================

    demo_advanced_fm.cpp
    Created: January 9, 2026
    Author:  Bret Bouchard

    Demonstration of NexSynth advanced FM features:
    - Batch processing performance
    - Multiple FM algorithms
    - Feedback FM
    - Real-time sound generation

  ==============================================================================
*/

#include "dsp/InstrumentFactory.h"
#include <iostream>
#include <cmath>
#include <vector>
#include <chrono>

using namespace DSP;

//==============================================================================
// Utility Functions
//==============================================================================

void writeWavHeader(FILE* file, int sampleRate, int numSamples, int numChannels)
{
    // RIFF header
    fwrite("RIFF", 1, 4, file);
    int fileSize = 36 + numSamples * numChannels * 2;
    fwrite(&fileSize, 4, 1, file);
    fwrite("WAVE", 1, 4, file);

    // fmt chunk
    fwrite("fmt ", 1, 4, file);
    int fmtSize = 16;
    fwrite(&fmtSize, 4, 1, file);
    short audioFormat = 1;  // PCM
    fwrite(&audioFormat, 2, 1, file);
    short numChannelsShort = static_cast<short>(numChannels);
    fwrite(&numChannelsShort, 2, 1, file);
    fwrite(&sampleRate, 4, 1, file);
    int byteRate = sampleRate * numChannels * 2;
    fwrite(&byteRate, 4, 1, file);
    short blockAlign = numChannels * 2;
    fwrite(&blockAlign, 2, 1, file);
    short bitsPerSample = 16;
    fwrite(&bitsPerSample, 2, 1, file);

    // data chunk
    fwrite("data", 1, 4, file);
    int dataSize = numSamples * numChannels * 2;
    fwrite(&dataSize, 4, 1, file);
}

float sampleToFloat16(double sample)
{
    // Clamp to [-1.0, 1.0]
    if (sample > 1.0) sample = 1.0;
    if (sample < -1.0) sample = -1.0;

    // Convert to 16-bit integer
    return static_cast<float>(sample);
}

//==============================================================================
// Demo Functions
//==============================================================================

void demoAlgorithm(int algorithmNum, const char* name, const char* filename)
{
    std::cout << "\n=== Demo: Algorithm " << algorithmNum << " - " << name << " ===\n";

    auto synth = InstrumentFactory::createInstrument("NexSynth");
    if (!synth)
    {
        std::cerr << "Failed to create synth\n";
        return;
    }

    constexpr double sampleRate = 48000.0;
    constexpr int durationSeconds = 3;
    constexpr int numSamples = sampleRate * durationSeconds;
    constexpr int numChannels = 2;

    synth->prepare(sampleRate, 512);

    // Set algorithm
    synth->setParameter("algorithm", static_cast<float>(algorithmNum));

    // Configure for demo sound
    switch (algorithmNum)
    {
        case 1:  // Series - Evolving pad
            synth->setParameter("op1_ratio", 1.0f);
            synth->setParameter("op1_modIndex", 0.3f);
            synth->setParameter("op2_ratio", 1.5f);
            synth->setParameter("op3_ratio", 2.0f);
            synth->setParameter("op4_ratio", 3.0f);
            synth->setParameter("op5_ratio", 4.0f);
            synth->setParameter("op1_attack", 0.5f);
            synth->setParameter("op1_release", 1.0f);
            break;

        case 2:  // Parallel - Metallic bells
            synth->setParameter("op1_ratio", 1.0f);
            synth->setParameter("op1_modIndex", 2.0f);
            synth->setParameter("op3_ratio", 1.0f);
            synth->setParameter("op3_modIndex", 2.5f);
            synth->setParameter("op5_ratio", 7.0f);
            break;

        case 16:  // Classic DX7 piano
            synth->setParameter("op1_ratio", 1.0f);
            synth->setParameter("op1_modIndex", 0.5f);
            synth->setParameter("op1_feedback", 0.1f);
            synth->setParameter("op2_ratio", 2.0f);
            synth->setParameter("op3_ratio", 3.0f);
            synth->setParameter("op4_ratio", 4.0f);
            synth->setParameter("op5_ratio", 5.0f);
            break;

        case 32:  // Additive
            synth->setParameter("op1_ratio", 1.0f);
            synth->setParameter("op2_ratio", 2.0f);
            synth->setParameter("op3_ratio", 3.0f);
            synth->setParameter("op4_ratio", 4.0f);
            synth->setParameter("op5_ratio", 5.0f);
            break;
    }

    synth->setParameter("masterVolume", 0.6f);

    // Allocate output buffers
    float** outputs = new float*[numChannels];
    for (int ch = 0; ch < numChannels; ++ch)
    {
        outputs[ch] = new float[numSamples]();
    }

    // Play a chord
    int notes[] = {60, 64, 67};  // C major chord
    for (int note : notes)
    {
        ScheduledEvent noteOn;
        noteOn.type = ScheduledEvent::NOTE_ON;
        noteOn.data.note.midiNote = note;
        noteOn.data.note.velocity = 0.8f;
        synth->handleEvent(noteOn);
    }

    // Process audio
    auto startTime = std::chrono::high_resolution_clock::now();
    synth->process(outputs, numChannels, numSamples);
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
    std::cout << "  Processing time: " << duration.count() << "ms\n";
    std::cout << "  Real-time factor: " << (numSamples / sampleRate) / (duration.count() / 1000.0) << "x\n";

    // Write to WAV file
    FILE* file = fopen(filename, "wb");
    if (file)
    {
        writeWavHeader(file, static_cast<int>(sampleRate), numSamples, numChannels);

        for (int i = 0; i < numSamples; ++i)
        {
            for (int ch = 0; ch < numChannels; ++ch)
            {
                float sample = outputs[ch][i];
                short sample16 = static_cast<short>(sample * 32767.0f);
                fwrite(&sample16, 2, 1, file);
            }
        }

        fclose(file);
        std::cout << "  Saved to: " << filename << "\n";
    }

    // Cleanup
    for (int ch = 0; ch < numChannels; ++ch)
    {
        delete[] outputs[ch];
    }
    delete[] outputs;
}

void demoFeedbackFM()
{
    std::cout << "\n=== Demo: Feedback FM ===\n";

    auto synth = InstrumentFactory::createInstrument("NexSynth");
    if (!synth)
    {
        std::cerr << "Failed to create synth\n";
        return;
    }

    constexpr double sampleRate = 48000.0;
    constexpr int durationSeconds = 2;
    constexpr int numSamples = sampleRate * durationSeconds;
    constexpr int numChannels = 2;

    synth->prepare(sampleRate, 512);

    // Set up feedback FM patch
    synth->setParameter("algorithm", 16.0f);
    synth->setParameter("op1_ratio", 1.0f);
    synth->setParameter("op1_modIndex", 3.0f);
    synth->setParameter("op1_feedback", 0.7f);  // High feedback
    synth->setParameter("op2_ratio", 2.0f);
    synth->setParameter("masterVolume", 0.5f);

    float** outputs = new float*[numChannels];
    for (int ch = 0; ch < numChannels; ++ch)
    {
        outputs[ch] = new float[numSamples]();
    }

    // Play a note
    ScheduledEvent noteOn;
    noteOn.type = ScheduledEvent::NOTE_ON;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;
    synth->handleEvent(noteOn);

    synth->process(outputs, numChannels, numSamples);

    // Write to WAV
    FILE* file = fopen("demo_feedback_fm.wav", "wb");
    if (file)
    {
        writeWavHeader(file, static_cast<int>(sampleRate), numSamples, numChannels);

        for (int i = 0; i < numSamples; ++i)
        {
            for (int ch = 0; ch < numChannels; ++ch)
            {
                float sample = outputs[ch][i];
                short sample16 = static_cast<short>(sample * 32767.0f);
                fwrite(&sample16, 2, 1, file);
            }
        }

        fclose(file);
        std::cout << "  Saved to: demo_feedback_fm.wav\n";
    }

    for (int ch = 0; ch < numChannels; ++ch)
    {
        delete[] outputs[ch];
    }
    delete[] outputs;
}

void demoPerformanceBenchmark()
{
    std::cout << "\n=== Demo: Performance Benchmark ===\n";

    auto synth = InstrumentFactory::createInstrument("NexSynth");
    if (!synth)
    {
        std::cerr << "Failed to create synth\n";
        return;
    }

    constexpr double sampleRate = 48000.0;
    constexpr int blockSize = 512;
    constexpr int durationSeconds = 10;
    constexpr int totalBlocks = (sampleRate * durationSeconds) / blockSize;

    synth->prepare(sampleRate, blockSize);

    // Start 8 voices for polyphony test
    for (int i = 0; i < 8; ++i)
    {
        ScheduledEvent noteOn;
        noteOn.type = ScheduledEvent::NOTE_ON;
        noteOn.data.note.midiNote = 60 + i;
        noteOn.data.note.velocity = 0.7f;
        synth->handleEvent(noteOn);
    }

    float** outputs = new float*[2];
    outputs[0] = new float[blockSize]();
    outputs[1] = new float[blockSize]();

    // Benchmark
    auto startTime = std::chrono::high_resolution_clock::now();

    for (int block = 0; block < totalBlocks; ++block)
    {
        synth->process(outputs, 2, blockSize);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

    double realTime = durationSeconds;
    double processingTime = duration.count() / 1000.0;
    double realTimeFactor = realTime / processingTime;

    std::cout << "  Duration: " << realTime << " seconds\n";
    std::cout << "  Processing time: " << processingTime << " seconds\n";
    std::cout << "  Real-time factor: " << realTimeFactor << "x\n";
    std::cout << "  Voices: 8\n";
    std::cout << "  Status: " << (realTimeFactor > 1.0 ? "PASS" : "FAIL") << "\n";

    for (int ch = 0; ch < 2; ++ch)
    {
        delete[] outputs[ch];
    }
    delete[] outputs;
}

//==============================================================================
// Main
//==============================================================================

int main(int argc, char* argv[])
{
    std::cout << "\n";
    std::cout << "========================================\n";
    std::cout << "NexSynth Advanced FM Demo\n";
    std::cout << "========================================\n";

    try
    {
        // Demo different algorithms
        demoAlgorithm(1, "Series (Evolving Pad)", "demo_algorithm1_series.wav");
        demoAlgorithm(2, "Parallel (Metallic Bells)", "demo_algorithm2_parallel.wav");
        demoAlgorithm(16, "Classic DX7 Piano", "demo_algorithm16_piano.wav");
        demoAlgorithm(32, "Additive Synthesis", "demo_algorithm32_additive.wav");

        // Demo feedback FM
        demoFeedbackFM();

        // Performance benchmark
        demoPerformanceBenchmark();

        std::cout << "\n========================================\n";
        std::cout << "Demo Complete!\n";
        std::cout << "========================================\n\n";

        std::cout << "Generated WAV files:\n";
        std::cout << "  - demo_algorithm1_series.wav\n";
        std::cout << "  - demo_algorithm2_parallel.wav\n";
        std::cout << "  - demo_algorithm16_piano.wav\n";
        std::cout << "  - demo_algorithm32_additive.wav\n";
        std::cout << "  - demo_feedback_fm.wav\n\n";

        std::cout << "Play these files to hear the different FM algorithms and feedback effects.\n\n";
    }
    catch (const std::exception& e)
    {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }

    return 0;
}
