/*
  ==============================================================================

    pedal_test_host.cpp
    Command-line test host for guitar pedal DSP offline rendering

    Usage:
        ./pedal_test_host --pedal <name> --test <type> --output <path>

  ==============================================================================
*/

#include "dsp_test/DspOfflineHost.h"
#include <iostream>
#include <fstream>
#include <cstring>
#include <memory>

// Include pedal headers
#include "../../effects/pedals/include/dsp/NoiseGatePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/CompressorPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/EQPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/ReverbPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/VolumePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/BiPhasePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/OverdrivePedalPureDSP.h"
#include "../../effects/pedals/include/dsp/FuzzPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/ChorusPedalPureDSP.h"
#include "../../effects/pedals/include/dsp/DelayPedalPureDSP.h"

//==============================================================================
// Test Registry
//==============================================================================

struct TestPedal
{
    const char* name;
    std::unique_ptr<DSP::GuitarPedalPureDSP> (*create)();
};

std::unique_ptr<DSP::GuitarPedalPureDSP> createNoiseGate()
{
    return std::make_unique<DSP::NoiseGatePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createCompressor()
{
    return std::make_unique<DSP::CompressorPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createEQ()
{
    return std::make_unique<DSP::EQPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createReverb()
{
    return std::make_unique<DSP::ReverbPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createVolume()
{
    return std::make_unique<DSP::VolumePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createBiPhase()
{
    return std::make_unique<DSP::BiPhasePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createOverdrive()
{
    return std::make_unique<DSP::OverdrivePedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createFuzz()
{
    return std::make_unique<DSP::FuzzPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createChorus()
{
    return std::make_unique<DSP::ChorusPedalPureDSP>();
}

std::unique_ptr<DSP::GuitarPedalPureDSP> createDelay()
{
    return std::make_unique<DSP::DelayPedalPureDSP>();
}

TestPedal pedals[] =
{
    {"NoiseGate", createNoiseGate},
    {"Compressor", createCompressor},
    {"EQ", createEQ},
    {"Reverb", createReverb},
    {"Volume", createVolume},
    {"BiPhase", createBiPhase},
    {"Overdrive", createOverdrive},
    {"Fuzz", createFuzz},
    {"Chorus", createChorus},
    {"Delay", createDelay},
    {nullptr, nullptr}
};

//==============================================================================
// Main
//==============================================================================

int main(int argc, char* argv[])
{
    // Default values
    const char* pedalName = nullptr;
    const char* testType = "silence";
    const char* outputPath = nullptr;
    bool listPedals = false;

    // Parse command line
    for (int i = 1; i < argc; i++)
    {
        if (strcmp(argv[i], "--pedal") == 0 && i + 1 < argc)
        {
            pedalName = argv[++i];
        }
        else if (strcmp(argv[i], "--test") == 0 && i + 1 < argc)
        {
            testType = argv[++i];
        }
        else if (strcmp(argv[i], "--output") == 0 && i + 1 < argc)
        {
            outputPath = argv[++i];
        }
        else if (strcmp(argv[i], "--list-pedals") == 0)
        {
            listPedals = true;
        }
        else if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0)
        {
            std::cout << "Usage: " << argv[0] << " --pedal <name> --test <type> --output <path>\n\n";
            std::cout << "Options:\n";
            std::cout << "  --pedal <name>      Pedal to test (required)\n";
            std::cout << "  --test <type>       Test type: silence, impulse, tone_220hz (default: silence)\n";
            std::cout << "  --output <path>     Output WAV file path\n";
            std::cout << "  --list-pedals       List available pedals\n";
            std::cout << "  --help              Show this help\n\n";
            std::cout << "Available pedals:\n";
            for (int i = 0; pedals[i].name != nullptr; i++)
            {
                std::cout << "  " << pedals[i].name << "\n";
            }
            return 0;
        }
    }

    // List pedals if requested
    if (listPedals)
    {
        std::cout << "Available pedals:\n";
        for (int i = 0; pedals[i].name != nullptr; i++)
        {
            std::cout << "  " << pedals[i].name << "\n";
        }
        return 0;
    }

    // Check required arguments
    if (!pedalName)
    {
        std::cerr << "Error: --pedal is required\n";
        std::cerr << "Use --help for usage information\n";
        return 1;
    }

    // Find pedal
    DSP::GuitarPedalPureDSP* pedal = nullptr;
    for (int i = 0; pedals[i].name != nullptr; i++)
    {
        if (strcmp(pedals[i].name, pedalName) == 0)
        {
            pedal = pedals[i].create().release();
            break;
        }
    }

    if (!pedal)
    {
        std::cerr << "Error: Unknown pedal '" << pedalName << "'\n";
        std::cerr << "Use --list-pedals to see available pedals\n";
        return 1;
    }

    // Prepare pedal
    const double sampleRate = 48000.0;
    const int blockSize = 256;
    const int numChannels = 2;

    if (!pedal->prepare(sampleRate, blockSize))
    {
        std::cerr << "Error: Failed to prepare pedal\n";
        delete pedal;
        return 1;
    }

    // Generate test signal
    const int durationSeconds = 2;
    const int numSamples = durationSeconds * static_cast<int>(sampleRate);
    const int numBlocks = (numSamples + blockSize - 1) / blockSize;

    // Allocate buffers
    std::vector<float*> inputs(numChannels);
    std::vector<float*> outputs(numChannels);
    for (int ch = 0; ch < numChannels; ch++)
    {
        inputs[ch] = new float[numSamples];
        outputs[ch] = new float[numSamples];
        std::fill(inputs[ch], inputs[ch] + numSamples, 0.0f);
        std::fill(outputs[ch], outputs[ch] + numSamples, 0.0f);
    }

    // Generate input signal based on test type
    if (strcmp(testType, "silence") == 0)
    {
        // Silence - already zeroed
    }
    else if (strcmp(testType, "impulse") == 0)
    {
        // Single sample impulse
        inputs[0][0] = 1.0f;
        inputs[1][0] = 1.0f;
    }
    else if (strcmp(testType, "tone_220hz") == 0)
    {
        // 220 Hz tone
        const float frequency = 220.0f;
        const float amplitude = 0.5f;
        for (int i = 0; i < numSamples; i++)
        {
            float t = static_cast<float>(i) / static_cast<float>(sampleRate);
            float sample = amplitude * std::sin(2.0f * M_PI * frequency * t);
            inputs[0][i] = sample;
            inputs[1][i] = sample;
        }
    }
    else
    {
        std::cerr << "Error: Unknown test type '" << testType << "'\n";
        for (int ch = 0; ch < numChannels; ch++)
        {
            delete[] inputs[ch];
            delete[] outputs[ch];
        }
        delete pedal;
        return 1;
    }

    // Process audio
    pedal->reset();

    for (int block = 0; block < numBlocks; block++)
    {
        int startSample = block * blockSize;
        int samplesInBlock = std::min(blockSize, numSamples - startSample);

        // Create channel pointers for this block
        std::vector<float*> inputBlock(numChannels);
        std::vector<float*> outputBlock(numChannels);
        for (int ch = 0; ch < numChannels; ch++)
        {
            inputBlock[ch] = inputs[ch] + startSample;
            outputBlock[ch] = outputs[ch] + startSample;
        }

        pedal->process(inputBlock.data(), outputBlock.data(), numChannels, samplesInBlock);
    }

    // Write output file
    if (outputPath)
    {
        // Write WAV file
        std::ofstream outFile(outputPath, std::ios::binary);
        if (!outFile)
        {
            std::cerr << "Error: Failed to open output file '" << outputPath << "'\n";
            for (int ch = 0; ch < numChannels; ch++)
            {
                delete[] inputs[ch];
                delete[] outputs[ch];
            }
            delete pedal;
            return 1;
        }

        // Write WAV header
        const int bitsPerSample = 32;
        const int byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const int blockAlign = numChannels * bitsPerSample / 8;
        const int dataSize = numSamples * numChannels * bitsPerSample / 8;
        const int fileSize = 36 + dataSize;

        outFile.write("RIFF", 4);
        outFile.write(reinterpret_cast<const char*>(&fileSize), 4);
        outFile.write("WAVE", 4);
        outFile.write("fmt ", 4);
        int fmtSize = 16;
        outFile.write(reinterpret_cast<const char*>(&fmtSize), 4);
        int audioFormat = 3; // IEEE float
        outFile.write(reinterpret_cast<const char*>(&audioFormat), 2);
        outFile.write(reinterpret_cast<const char*>(&numChannels), 2);
        outFile.write(reinterpret_cast<const char*>(&sampleRate), 4);
        outFile.write(reinterpret_cast<const char*>(&byteRate), 4);
        outFile.write(reinterpret_cast<const char*>(&blockAlign), 2);
        outFile.write(reinterpret_cast<const char*>(&bitsPerSample), 2);
        outFile.write("data", 4);
        outFile.write(reinterpret_cast<const char*>(&dataSize), 4);

        // Write audio data
        for (int i = 0; i < numSamples; i++)
        {
            for (int ch = 0; ch < numChannels; ch++)
            {
                outFile.write(reinterpret_cast<const char*>(&outputs[ch][i]), 4);
            }
        }

        outFile.close();
        std::cout << "Output written to: " << outputPath << "\n";
    }

    // Calculate and print metrics
    float rms = 0.0f;
    float peak = 0.0f;
    float dcOffset = 0.0f;
    int nanCount = 0;
    int infCount = 0;
    int clippedCount = 0;

    for (int ch = 0; ch < numChannels; ch++)
    {
        for (int i = 0; i < numSamples; i++)
        {
            float sample = outputs[ch][i];
            rms += sample * sample;
            peak = std::max(peak, std::abs(sample));
            dcOffset += sample;

            if (std::isnan(sample)) nanCount++;
            if (std::isinf(sample)) infCount++;
            if (std::abs(sample) >= 1.0f) clippedCount++;
        }
    }

    rms /= (numSamples * numChannels);
    rms = std::sqrt(rms);
    dcOffset /= (numSamples * numChannels);

    std::cout << "\n=== Test Results ===\n";
    std::cout << "Pedal: " << pedalName << "\n";
    std::cout << "Test: " << testType << "\n";
    std::cout << "Duration: " << durationSeconds << " seconds\n";
    std::cout << "Sample Rate: " << sampleRate << " Hz\n";
    std::cout << "\nMetrics:\n";
    std::cout << "  RMS: " << rms << " (" << 20.0f * std::log10(rms + 1e-10f) << " dB)\n";
    std::cout << "  Peak: " << peak << " (" << 20.0f * std::log10(peak + 1e-10f) << " dB)\n";
    std::cout << "  DC Offset: " << dcOffset << "\n";
    std::cout << "  NaN Count: " << nanCount << "\n";
    std::cout << "  Inf Count: " << infCount << "\n";
    std::cout << "  Clipped Samples: " << clippedCount << "\n";

    // Test assertions
    bool passed = true;

    if (nanCount > 0)
    {
        std::cout << "\n❌ FAIL: NaN detected in output\n";
        passed = false;
    }

    if (infCount > 0)
    {
        std::cout << "\n❌ FAIL: Inf detected in output\n";
        passed = false;
    }

    if (strcmp(testType, "silence") == 0)
    {
        if (peak > 1e-4f)
        {
            std::cout << "\n❌ FAIL: Silence test has output (peak = " << peak << ")\n";
            passed = false;
        }
        if (std::abs(dcOffset) > 1e-4f)
        {
            std::cout << "\n❌ FAIL: DC offset detected (dcOffset = " << dcOffset << ")\n";
            passed = false;
        }
    }
    else if (strcmp(testType, "tone_220hz") == 0)
    {
        if (rms < 0.001f)
        {
            std::cout << "\n❌ FAIL: Tone test has no output (rms = " << rms << ")\n";
            passed = false;
        }
    }

    if (passed)
    {
        std::cout << "\n✅ PASS\n";
    }

    // Cleanup
    for (int ch = 0; ch < numChannels; ch++)
    {
        delete[] inputs[ch];
        delete[] outputs[ch];
    }
    delete pedal;

    return passed ? 0 : 1;
}
