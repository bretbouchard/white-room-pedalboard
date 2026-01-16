/*
  ==============================================================================

    DiagnoseWAV.cpp
    Quick diagnostic tool to check WAV file integrity

  ==============================================================================
*/

#include <cstdio>
#include <cmath>
#include <cstring>
#include <vector>

struct WAVHeader {
    uint8_t riff[4];
    uint32_t fileSize;
    uint8_t wave[4];
    uint8_t fmt[4];
    uint32_t fmtSize;
    uint16_t audioFormat;
    uint16_t numChannels;
    uint32_t sampleRate;
    uint32_t byteRate;
    uint16_t blockAlign;
    uint16_t bitsPerSample;
    uint8_t data[4];
    uint32_t dataSize;
};

bool checkWAVFile(const char* filename) {
    FILE* file = fopen(filename, "rb");
    if (!file) {
        printf("ERROR: Cannot open %s\n", filename);
        return false;
    }

    WAVHeader header;
    fread(&header, sizeof(WAVHeader), 1, file);

    printf("File: %s\n", filename);
    printf("  Format: %d channels, %d Hz, %d bit\n",
           header.numChannels, header.sampleRate, header.bitsPerSample);
    printf("  Data size: %u bytes\n", header.dataSize);

    int numSamples = header.dataSize / (header.numChannels * header.bitsPerSample / 8);
    printf("  Samples: %d (%.2f seconds)\n", numSamples, numSamples / (double)header.sampleRate);

    std::vector<int16_t> data(numSamples * header.numChannels);
    fread(data.data(), sizeof(int16_t), numSamples * header.numChannels, file);
    fclose(file);

    // Check for invalid values
    int zeroCount = 0;
    int maxPositive = 0;
    int maxNegative = 0;
    double sum = 0.0;
    double sumSquares = 0.0;

    for (int i = 0; i < numSamples * header.numChannels; i++) {
        if (data[i] == 0) zeroCount++;
        if (data[i] > maxPositive) maxPositive = data[i];
        if (data[i] < maxNegative) maxNegative = data[i];

        double sample = data[i] / 32768.0;
        sum += sample;
        sumSquares += sample * sample;
    }

    double mean = sum / (numSamples * header.numChannels);
    double rms = sqrt(sumSquares / (numSamples * header.numChannels));

    printf("  Statistics:\n");
    printf("    Zero samples: %d (%.1f%%)\n", zeroCount, 100.0 * zeroCount / (numSamples * header.numChannels));
    printf("    Max positive: %d\n", maxPositive);
    printf("    Max negative: %d\n", maxNegative);
    printf("    Mean: %.6f\n", mean);
    printf("    RMS: %.6f (%.2f dB)\n", rms, 20.0 * log10(rms + 1e-10));

    if (rms == 0.0) {
        printf("  ⚠️  WARNING: File is silent!\n");
    } else if (rms < 0.001) {
        printf("  ⚠️  WARNING: Very low level!\n");
    } else {
        printf("  ✅ File appears valid\n");
    }

    printf("\n");
    return true;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printf("Usage: %s <wav_file1> [wav_file2] ...\n", argv[0]);
        return 1;
    }

    for (int i = 1; i < argc; i++) {
        checkWAVFile(argv[i]);
    }

    return 0;
}
