/*
  ==============================================================================

    TestLocalGal.cpp
    Quick test to check LocalGal determinism

  ==============================================================================
*/

#include <memory>
#include <cstdio>
#include <cmath>
#include <vector>
#include <cstring>

#include "LocalGalPureDSP.h"

using namespace DSP;

int main() {
    printf("Testing LocalGal Determinism\n");
    printf("==============================\n\n");

    const double sampleRate = 48000.0;
    const int blockSize = 512;
    const int numBlocks = 100;
    const int totalSamples = numBlocks * blockSize;

    // Create two instruments
    auto inst1 = std::make_unique<LocalGalPureDSP>();
    auto inst2 = std::make_unique<LocalGalPureDSP>();

    inst1->prepare(sampleRate, blockSize);
    inst2->prepare(sampleRate, blockSize);

    // Allocate buffers
    std::vector<float> left1(totalSamples);
    std::vector<float> right1(totalSamples);
    std::vector<float> left2(totalSamples);
    std::vector<float> right2(totalSamples);

    // Generate audio from first instance
    inst1->noteOn(60, 1.0f);
    float* outputs1[2];
    for (int block = 0; block < numBlocks; ++block) {
        outputs1[0] = &left1[block * blockSize];
        outputs1[1] = &right1[block * blockSize];
        inst1->process(outputs1, 2, blockSize);
    }

    // Generate audio from second instance
    inst2->noteOn(60, 1.0f);
    float* outputs2[2];
    for (int block = 0; block < numBlocks; ++block) {
        outputs2[0] = &left2[block * blockSize];
        outputs2[1] = &right2[block * blockSize];
        inst2->process(outputs2, 2, blockSize);
    }

    // Compare
    double maxDiff = 0.0;
    int diffCount = 0;
    for (int i = 0; i < totalSamples; ++i) {
        double diff = std::abs(left1[i] - left2[i]);
        if (diff > maxDiff) maxDiff = diff;
        if (diff > 0.001) diffCount++;
    }

    printf("Results:\n");
    printf("  Max Difference: %.6f\n", maxDiff);
    printf("  Differing Samples: %d / %d\n", diffCount, totalSamples);

    if (maxDiff < 0.001) {
        printf("\n✅ LocalGal IS deterministic\n");
    } else {
        printf("\n❌ LocalGal NOT deterministic\n");
    }

    // Check statistics
    double sum1 = 0.0, sum2 = 0.0;
    double max1 = 0.0, min1 = 0.0;
    for (int i = 0; i < totalSamples; ++i) {
        sum1 += left1[i];
        sum2 += left2[i];
        if (left1[i] > max1) max1 = left1[i];
        if (left1[i] < min1) min1 = left1[i];
    }

    printf("\nInstance 1 Statistics:\n");
    printf("  Mean: %.6f\n", sum1 / totalSamples);
    printf("  Max: %.6f\n", max1);
    printf("  Min: %.6f\n", min1);

    printf("\nInstance 2 Statistics:\n");
    printf("  Mean: %.6f\n", sum2 / totalSamples);

    return 0;
}
