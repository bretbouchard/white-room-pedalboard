/*
  ==============================================================================

    GenerateGoldenReferences.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Phase 4C: Golden reference generation tool
    Generates deterministic audio reference files for all instruments

  ==============================================================================
*/

#include <memory>
#include <cstring>
#include <cmath>
#include <cstdio>
#include <ctime>

// Pure DSP instrument headers
#include "NexSynthDSP.h"
#include "SamSamplerDSP.h"
#include "LocalGalPureDSP.h"
#include "KaneMarcoPureDSP.h"
#include "KaneMarcoAetherPureDSP.h"
#include "KaneMarcoAetherStringPureDSP.h"

// Simple WAV file writer
struct WAVHeader {
    uint8_t riff[4] = {'R', 'I', 'F', 'F'};
    uint32_t fileSize;
    uint8_t wave[4] = {'W', 'A', 'V', 'E'};
    uint8_t fmt[4] = {'f', 'm', 't', ' '};
    uint32_t fmtSize = 16;
    uint16_t audioFormat = 1;  // PCM
    uint16_t numChannels = 2;
    uint32_t sampleRate = 48000;
    uint32_t byteRate = 48000 * 2 * 2;
    uint16_t blockAlign = 4;
    uint16_t bitsPerSample = 16;
    uint8_t data[4] = {'d', 'a', 't', 'a'};
    uint32_t dataSize;
};

/**
 * @brief WAV file writer
 */
class WAVWriter {
public:
    static bool write(const char* filename, float* leftChannel, float* rightChannel, int numSamples, int sampleRate = 48000) {
        FILE* file = fopen(filename, "wb");
        if (!file) {
            fprintf(stderr, "ERROR: Failed to open %s for writing\n", filename);
            return false;
        }

        // Write WAV header
        WAVHeader header;
        header.sampleRate = sampleRate;
        header.dataSize = numSamples * 2 * 2;  // 2 channels, 16-bit
        header.fileSize = 36 + header.dataSize;

        fwrite(&header, sizeof(WAVHeader), 1, file);

        // Convert and write audio data (16-bit PCM)
        for (int i = 0; i < numSamples; ++i) {
            // Clamp and convert to 16-bit integer
            float leftSample = std::max(-1.0f, std::min(1.0f, leftChannel[i]));
            float rightSample = std::max(-1.0f, std::min(1.0f, rightChannel[i]));

            int16_t leftInt = static_cast<int16_t>(leftSample * 32767.0f);
            int16_t rightInt = static_cast<int16_t>(rightSample * 32767.0f);

            fwrite(&leftInt, sizeof(int16_t), 1, file);
            fwrite(&rightInt, sizeof(int16_t), 1, file);
        }

        fclose(file);
        return true;
    }
};

/**
 * @brief Instrument factory
 */
std::unique_ptr<DSP::InstrumentDSP> createInstrument(const char* name) {
    if (strcmp(name, "NexSynth") == 0) return std::make_unique<DSP::NexSynthDSP>();
    if (strcmp(name, "SamSampler") == 0) return std::make_unique<DSP::SamSamplerDSP>();
    if (strcmp(name, "LocalGal") == 0) return std::make_unique<DSP::LocalGalPureDSP>();
    if (strcmp(name, "KaneMarco") == 0) return std::make_unique<DSP::KaneMarcoPureDSP>();
    if (strcmp(name, "KaneMarcoAether") == 0) return std::make_unique<DSP::KaneMarcoAetherPureDSP>();
    if (strcmp(name, "KaneMarcoAetherString") == 0) return std::make_unique<DSP::KaneMarcoAetherStringPureDSP>();
    return nullptr;
}

/**
 * @brief Generate golden reference for an instrument
 */
bool generateGoldenReference(const char* instrumentName, int midiNote, float velocity, int durationBlocks, const char* outputFilename) {
    printf("Generating golden reference: %s\n", outputFilename);

    auto instrument = createInstrument(instrumentName);
    if (!instrument) {
        fprintf(stderr, "ERROR: Failed to create instrument: %s\n", instrumentName);
        return false;
    }

    // Prepare instrument
    const double sampleRate = 48000.0;
    const int blockSize = 512;
    const int numChannels = 2;
    const int totalSamples = durationBlocks * blockSize;

    instrument->prepare(sampleRate, blockSize);

    // Allocate buffers
    std::vector<float> leftChannel(totalSamples);
    std::vector<float> rightChannel(totalSamples);

    // Trigger note
    instrument->noteOn(midiNote, velocity);

    // Process audio
    float* outputs[2];
    for (int block = 0; block < durationBlocks; ++block) {
        outputs[0] = &leftChannel[block * blockSize];
        outputs[1] = &rightChannel[block * blockSize];

        instrument->process(outputs, numChannels, blockSize);
    }

    // Write to WAV file
    bool success = WAVWriter::write(outputFilename, leftChannel.data(), rightChannel.data(), totalSamples, sampleRate);

    if (success) {
        printf("  ✅ Generated: %s\n", outputFilename);

        // Calculate RMS for verification
        double sumLeft = 0.0, sumRight = 0.0;
        for (int i = 0; i < totalSamples; ++i) {
            sumLeft += leftChannel[i] * leftChannel[i];
            sumRight += rightChannel[i] * rightChannel[i];
        }
        double rmsLeft = std::sqrt(sumLeft / totalSamples);
        double rmsRight = std::sqrt(sumRight / totalSamples);

        printf("  RMS: Left=%.6f, Right=%.6f\n", rmsLeft, rmsRight);
    } else {
        fprintf(stderr, "  ❌ Failed to write: %s\n", outputFilename);
    }

    return success;
}

/**
 * @brief Main entry point
 */
int main(int argc, char* argv[]) {
    printf("\n==============================================\n");
    printf("  Golden Reference Generator\n");
    printf("  Phase 4C: Deterministic Audio Validation\n");
    printf("==============================================\n\n");

    // Print timestamp
    time_t now = time(0);
    printf("Generation Time: %s", ctime(&now));

    // Create output directory
    system("mkdir -p tests/golden/reference");

    int successCount = 0;
    int totalCount = 0;

    // Define golden reference specifications
    struct GoldenSpec {
        const char* instrumentName;
        int midiNote;
        float velocity;
        int durationBlocks;
        const char* filename;
    };

    GoldenSpec specs[] = {
        // NexSynth
        {"NexSynth", 60, 1.0f, 100, "tests/golden/reference/NexSynth_C4_127.wav"},
        {"NexSynth", 60, 0.5f, 100, "tests/golden/reference/NexSynth_C4_064.wav"},

        // SamSampler
        {"SamSampler", 60, 1.0f, 100, "tests/golden/reference/SamSampler_C4_127.wav"},
        {"SamSampler", 60, 0.5f, 100, "tests/golden/reference/SamSampler_C4_064.wav"},

        // LocalGal
        {"LocalGal", 60, 1.0f, 100, "tests/golden/reference/LocalGal_C4_127.wav"},
        {"LocalGal", 60, 0.5f, 100, "tests/golden/reference/LocalGal_C4_064.wav"},

        // KaneMarco
        {"KaneMarco", 60, 1.0f, 100, "tests/golden/reference/KaneMarco_C4_127.wav"},
        {"KaneMarco", 60, 0.5f, 100, "tests/golden/reference/KaneMarco_C4_064.wav"},

        // KaneMarcoAether
        {"KaneMarcoAether", 60, 1.0f, 100, "tests/golden/reference/KaneMarcoAether_C4_127.wav"},
        {"KaneMarcoAether", 60, 0.5f, 100, "tests/golden/reference/KaneMarcoAether_C4_064.wav"},

        // KaneMarcoAetherString
        {"KaneMarcoAetherString", 60, 1.0f, 100, "tests/golden/reference/KaneMarcoAetherString_C4_127.wav"},
        {"KaneMarcoAetherString", 60, 0.5f, 100, "tests/golden/reference/KaneMarcoAetherString_C4_064.wav"},
    };

    const int numSpecs = sizeof(specs) / sizeof(specs[0]);

    // Generate all references
    for (int i = 0; i < numSpecs; ++i) {
        totalCount++;
        if (generateGoldenReference(specs[i].instrumentName, specs[i].midiNote, specs[i].velocity,
                                   specs[i].durationBlocks, specs[i].filename)) {
            successCount++;
        }
        printf("\n");
    }

    // Print summary
    printf("==============================================\n");
    printf("Generation Summary\n");
    printf("==============================================\n");
    printf("Total References: %d\n", totalCount);
    printf("Successfully Generated: %d\n", successCount);
    printf("Failed: %d\n", totalCount - successCount);
    printf("Success Rate: %.1f%%\n", (100.0 * successCount) / totalCount);
    printf("==============================================\n\n");

    if (successCount == totalCount) {
        printf("✅ All golden references generated successfully!\n");
        printf("\nNext steps:\n");
        printf("  1. Review generated WAV files in tests/golden/reference/\n");
        printf("  2. Commit reference files to repository\n");
        printf("  3. Run golden tests: ./GoldenTest\n");
        return 0;
    } else {
        printf("⚠️  Some golden references failed to generate\n");
        return 1;
    }
}
